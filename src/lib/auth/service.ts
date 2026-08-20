import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";

import {
  auditLogs,
  authSessions,
  emailSignupVerificationChallenges,
  oauthAccounts,
  organizationMemberships,
  organizations,
  otpChallenges,
  users,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { roles, type Role } from "@/lib/authorization/permissions";
import { getServerEnvironment } from "@/lib/env/server";

import {
  createOtpCode,
  createSessionToken,
  hashEmailSignUpOtpCode,
  hashOtpCode,
  hashSessionToken,
  safelyMatchesHash,
} from "./crypto";
import { normalizeEmailAddress } from "./email";
import { createResendEmailOtpSender, developmentEmailOtpSender } from "./email-otp";
import {
  AccountAlreadyExistsError,
  AccountUnavailableError,
  AuthenticationError,
  InvalidCredentialsError,
  OtpDeliveryError,
  OtpRateLimitError,
  OtpVerificationError,
} from "./errors";
import { createInfobipOtpSender, developmentOtpSender } from "./otp";
import { hashPassword, verifyPassword } from "./password";
import { normalizeEgyptianMobile } from "./phone";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./session";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const OTP_REQUEST_LIMIT = 3;

type MembershipRow = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
};

export type OrganizationChoice = {
  id: string;
  name: string;
  roles: Role[];
  slug: string;
};

export type AuthenticatedSession = {
  id: string;
  organizationId: string | null;
  userId: string;
  userName: string;
};

export type ActiveOrganizationContext = {
  organization: OrganizationChoice;
  session: AuthenticatedSession;
};

export type OtpRequestResult = {
  challengeId: string;
  developmentCode?: string;
  expiresAt: Date;
  phoneE164: string;
};

export type EmailSignUpOtpRequestResult = {
  challengeId: string;
  developmentCode?: string;
  email: string;
  expiresAt: Date;
};

export type VerifiedSignIn = {
  organizationId: string | null;
  requiresOnboarding: boolean;
  sessionToken: string;
};

type SignInMethod = "email_password" | "google" | "phone_otp";

type SessionCreationInput = {
  emailVerified?: boolean;
  method: SignInMethod;
  phoneVerified?: boolean;
  userId: string;
};

let missingPasswordHash: Promise<string> | undefined;

function getMissingPasswordHash(): Promise<string> {
  missingPasswordHash ??= hashPassword("not-a-levelup-account-password");
  return missingPasswordHash;
}

function normalizeFullName(fullNameInput: string): string {
  const fullName = fullNameInput.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 160) {
    throw new AuthenticationError("Enter your full name.");
  }

  return fullName;
}

function asRole(value: string): Role {
  if (!roles.includes(value as Role)) {
    throw new AuthenticationError("This account has an unsupported membership role.");
  }

  return value as Role;
}

async function getActiveMembershipRows(userId: string): Promise<MembershipRow[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      membershipId: organizationMemberships.id,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.status, "active")))
    .orderBy(organizations.name);

  return rows.map((row) => ({ ...row, role: asRole(row.role) }));
}

async function createAuthenticatedSession(input: SessionCreationInput): Promise<VerifiedSignIn> {
  const db = getDatabase();
  const now = new Date();
  const sessionToken = createSessionToken();

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, input.userId))
      .for("update")
      .limit(1);

    if (!user || user.status !== "active") return null;

    const memberships = await tx
      .select({
        membershipId: organizationMemberships.id,
        organizationId: organizationMemberships.organizationId,
      })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, user.id), eq(organizationMemberships.status, "active")));

    const organizationIds = [...new Set(memberships.map((membership) => membership.organizationId))];
    const organizationId = organizationIds.length === 1 ? organizationIds[0] : null;
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

    await tx.insert(authSessions).values({
      userId: user.id,
      organizationId,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt,
    });

    await tx
      .update(users)
      .set({
        lastSignedInAt: now,
        ...(input.emailVerified ? { emailVerifiedAt: now } : {}),
        ...(input.phoneVerified ? { phoneVerifiedAt: now } : {}),
      })
      .where(eq(users.id, user.id));

    const firstMembershipByOrganization = new Map<string, string>();
    for (const membership of memberships) {
      if (!firstMembershipByOrganization.has(membership.organizationId)) {
        firstMembershipByOrganization.set(membership.organizationId, membership.membershipId);
      }
    }

    const auditEntries = [...firstMembershipByOrganization].map(([auditOrganizationId, actorMembershipId]) => ({
        organizationId: auditOrganizationId,
        actorMembershipId,
        action: "auth.signed_in",
        entityType: "user",
        entityId: user.id,
        metadata: { method: input.method },
      }));

    if (auditEntries.length) await tx.insert(auditLogs).values(auditEntries);

    return { organizationId, requiresOnboarding: memberships.length === 0 };
  });

  if (!result) throw new AccountUnavailableError();

  return {
    organizationId: result.organizationId,
    requiresOnboarding: result.requiresOnboarding,
    sessionToken,
  };
}

function groupMembershipsByOrganization(rows: MembershipRow[]): OrganizationChoice[] {
  const organizationsById = new Map<string, OrganizationChoice>();

  for (const row of rows) {
    const current = organizationsById.get(row.organizationId);

    if (current) {
      if (!current.roles.includes(row.role)) current.roles.push(row.role);
      continue;
    }

    organizationsById.set(row.organizationId, {
      id: row.organizationId,
      name: row.organizationName,
      roles: [row.role],
      slug: row.organizationSlug,
    });
  }

  return [...organizationsById.values()];
}

async function sendOtp(destination: string, code: string) {
  const environment = getServerEnvironment();

  try {
    if (environment.OTP_PROVIDER === "development") {
      return await developmentOtpSender.send({ destination, code, purpose: "sign_in" });
    }

    return await createInfobipOtpSender({
      apiKey: environment.INFOBIP_API_KEY!,
      baseUrl: environment.INFOBIP_BASE_URL!,
      senderId: environment.OTP_SENDER_ID!,
    }).send({ destination, code, purpose: "sign_in" });
  } catch {
    throw new OtpDeliveryError();
  }
}

async function sendEmailSignUpOtp(destination: string, code: string, challengeId: string): Promise<void> {
  const environment = getServerEnvironment();

  try {
    if (environment.EMAIL_OTP_PROVIDER === "development") {
      await developmentEmailOtpSender.send({
        code,
        destination,
        idempotencyKey: challengeId,
        purpose: "sign_up",
      });
      return;
    }

    await createResendEmailOtpSender({
      apiKey: environment.RESEND_API_KEY!,
      from: environment.RESEND_FROM!,
    }).send({
      code,
      destination,
      idempotencyKey: challengeId,
      purpose: "sign_up",
    });
  } catch {
    throw new OtpDeliveryError();
  }
}

export async function requestSignInOtp(phoneInput: string): Promise<OtpRequestResult> {
  const phoneE164 = normalizeEgyptianMobile(phoneInput);
  const db = getDatabase();
  const now = new Date();
  const requestWindowStart = new Date(now.getTime() - OTP_REQUEST_WINDOW_MS);
  const [{ requestCount }] = await db
    .select({ requestCount: count() })
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phoneE164, phoneE164),
        eq(otpChallenges.purpose, "sign_in"),
        gt(otpChallenges.createdAt, requestWindowStart),
      ),
    );

  if (Number(requestCount) >= OTP_REQUEST_LIMIT) {
    throw new OtpRateLimitError();
  }

  const challengeId = randomUUID();
  const code = createOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(otpChallenges.phoneE164, phoneE164),
          eq(otpChallenges.purpose, "sign_in"),
          isNull(otpChallenges.consumedAt),
        ),
      );

    await tx.insert(otpChallenges).values({
      id: challengeId,
      phoneE164,
      purpose: "sign_in",
      codeHash: hashOtpCode(challengeId, phoneE164, code),
      expiresAt,
    });
  });

  try {
    await sendOtp(phoneE164, code);
  } catch (error) {
    await db.delete(otpChallenges).where(eq(otpChallenges.id, challengeId));
    throw error instanceof AuthenticationError ? error : new OtpDeliveryError();
  }

  const environment = getServerEnvironment();

  return {
    challengeId,
    developmentCode: environment.OTP_PROVIDER === "development" ? code : undefined,
    expiresAt,
    phoneE164,
  };
}

export async function verifySignInOtp(
  phoneInput: string,
  challengeId: string,
  code: string,
): Promise<VerifiedSignIn> {
  const phoneE164 = normalizeEgyptianMobile(phoneInput);
  const db = getDatabase();
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select({
        attemptCount: otpChallenges.attemptCount,
        codeHash: otpChallenges.codeHash,
        id: otpChallenges.id,
      })
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.id, challengeId),
          eq(otpChallenges.phoneE164, phoneE164),
          eq(otpChallenges.purpose, "sign_in"),
          isNull(otpChallenges.consumedAt),
          gt(otpChallenges.expiresAt, now),
        ),
      )
      .for("update")
      .limit(1);

    if (!challenge) return { kind: "invalid" as const };

    const expectedHash = hashOtpCode(challenge.id, phoneE164, code);

    if (!safelyMatchesHash(challenge.codeHash, expectedHash)) {
      const nextAttemptCount = challenge.attemptCount + 1;
      await tx
        .update(otpChallenges)
        .set({
          attemptCount: nextAttemptCount,
          ...(nextAttemptCount >= OTP_MAX_ATTEMPTS ? { consumedAt: now } : {}),
        })
        .where(eq(otpChallenges.id, challenge.id));

      return { kind: "invalid" as const };
    }

    await tx.update(otpChallenges).set({ consumedAt: now }).where(eq(otpChallenges.id, challenge.id));

    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phoneE164, phoneE164), eq(users.status, "active")))
      .limit(1);

    if (!user) return { kind: "unavailable" as const };

    return { kind: "verified" as const, userId: user.id };
  });

  if (result.kind === "invalid") throw new OtpVerificationError();
  if (result.kind === "unavailable") throw new AccountUnavailableError();

  return createAuthenticatedSession({ method: "phone_otp", phoneVerified: true, userId: result.userId });
}

export async function requestEmailSignUpOtp(input: {
  email: string;
  fullName: string;
  password: string;
  phone: string;
}): Promise<EmailSignUpOtpRequestResult> {
  const email = normalizeEmailAddress(input.email);
  const fullName = normalizeFullName(input.fullName);
  const phoneE164 = normalizeEgyptianMobile(input.phone);
  const db = getDatabase();
  const now = new Date();
  const requestWindowStart = new Date(now.getTime() - OTP_REQUEST_WINDOW_MS);

  const [existingAccount] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.phoneE164, phoneE164)))
    .limit(1);

  if (existingAccount) {
    throw new AccountAlreadyExistsError("An account with this email or mobile number already exists. Sign in instead.");
  }

  const [{ requestCount }] = await db
    .select({ requestCount: count() })
    .from(emailSignupVerificationChallenges)
    .where(
      and(
        or(
          eq(emailSignupVerificationChallenges.email, email),
          eq(emailSignupVerificationChallenges.phoneE164, phoneE164),
        ),
        gt(emailSignupVerificationChallenges.createdAt, requestWindowStart),
      ),
    );

  if (Number(requestCount) >= OTP_REQUEST_LIMIT) {
    throw new OtpRateLimitError();
  }

  const challengeId = randomUUID();
  const code = createOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
  const passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx
      .update(emailSignupVerificationChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          or(
            eq(emailSignupVerificationChallenges.email, email),
            eq(emailSignupVerificationChallenges.phoneE164, phoneE164),
          ),
          isNull(emailSignupVerificationChallenges.consumedAt),
        ),
      );

    await tx.insert(emailSignupVerificationChallenges).values({
      id: challengeId,
      email,
      phoneE164,
      fullName,
      passwordHash,
      codeHash: hashEmailSignUpOtpCode(challengeId, email, code),
      expiresAt,
    });
  });

  try {
    await sendEmailSignUpOtp(email, code, challengeId);
  } catch (error) {
    await db.delete(emailSignupVerificationChallenges).where(eq(emailSignupVerificationChallenges.id, challengeId));
    throw error instanceof AuthenticationError ? error : new OtpDeliveryError();
  }

  const environment = getServerEnvironment();

  return {
    challengeId,
    developmentCode: environment.EMAIL_OTP_PROVIDER === "development" ? code : undefined,
    email,
    expiresAt,
  };
}

export async function verifyEmailSignUpOtp(
  emailInput: string,
  challengeId: string,
  code: string,
): Promise<VerifiedSignIn> {
  const email = normalizeEmailAddress(emailInput);
  const db = getDatabase();
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select({
        attemptCount: emailSignupVerificationChallenges.attemptCount,
        codeHash: emailSignupVerificationChallenges.codeHash,
        fullName: emailSignupVerificationChallenges.fullName,
        id: emailSignupVerificationChallenges.id,
        passwordHash: emailSignupVerificationChallenges.passwordHash,
        phoneE164: emailSignupVerificationChallenges.phoneE164,
      })
      .from(emailSignupVerificationChallenges)
      .where(
        and(
          eq(emailSignupVerificationChallenges.id, challengeId),
          eq(emailSignupVerificationChallenges.email, email),
          isNull(emailSignupVerificationChallenges.consumedAt),
          gt(emailSignupVerificationChallenges.expiresAt, now),
        ),
      )
      .for("update")
      .limit(1);

    if (!challenge) return { kind: "invalid" as const };

    const expectedHash = hashEmailSignUpOtpCode(challenge.id, email, code);

    if (!safelyMatchesHash(challenge.codeHash, expectedHash)) {
      const nextAttemptCount = challenge.attemptCount + 1;
      await tx
        .update(emailSignupVerificationChallenges)
        .set({
          attemptCount: nextAttemptCount,
          ...(nextAttemptCount >= OTP_MAX_ATTEMPTS ? { consumedAt: now } : {}),
        })
        .where(eq(emailSignupVerificationChallenges.id, challenge.id));

      return { kind: "invalid" as const };
    }

    const [user] = await tx
      .insert(users)
      .values({
        email,
        emailVerifiedAt: now,
        fullName: challenge.fullName,
        passwordHash: challenge.passwordHash,
        phoneE164: challenge.phoneE164,
        status: "active",
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    await tx
      .update(emailSignupVerificationChallenges)
      .set({ consumedAt: now })
      .where(eq(emailSignupVerificationChallenges.id, challenge.id));

    if (!user) return { kind: "already_exists" as const };

    return { kind: "verified" as const, userId: user.id };
  });

  if (result.kind === "invalid") throw new OtpVerificationError();
  if (result.kind === "already_exists") {
    throw new AccountAlreadyExistsError("An account with this email or mobile number already exists. Sign in instead.");
  }

  return createAuthenticatedSession({ emailVerified: true, method: "email_password", userId: result.userId });
}

export async function signInWithEmailPassword(emailInput: string, password: string): Promise<VerifiedSignIn> {
  const email = normalizeEmailAddress(emailInput);
  const db = getDatabase();
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, "active")))
    .limit(1);

  const passwordHash = user?.passwordHash ?? await getMissingPasswordHash();
  const isPasswordValid = await verifyPassword(password, passwordHash);
  if (!user || !isPasswordValid) throw new InvalidCredentialsError();

  return createAuthenticatedSession({ method: "email_password", userId: user.id });
}

export async function signUpWithEmailPassword(input: {
  email: string;
  fullName: string;
  password: string;
}): Promise<VerifiedSignIn> {
  const email = normalizeEmailAddress(input.email);
  const fullName = normalizeFullName(input.fullName);
  const passwordHash = await hashPassword(input.password);
  const db = getDatabase();

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash,
        status: "active",
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    return user?.id ?? null;
  });

  if (!userId) throw new AccountAlreadyExistsError();

  return createAuthenticatedSession({ method: "email_password", userId });
}

export async function signInWithGoogleIdentity(input: {
  email: string;
  name?: string;
  subject: string;
}): Promise<VerifiedSignIn> {
  const userId = await resolveGoogleUserId(input, false);
  return createAuthenticatedSession({ emailVerified: true, method: "google", userId });
}

export async function signUpWithGoogleIdentity(input: {
  email: string;
  name?: string;
  subject: string;
}): Promise<VerifiedSignIn> {
  const userId = await resolveGoogleUserId(input, true);
  return createAuthenticatedSession({ emailVerified: true, method: "google", userId });
}

async function resolveGoogleUserId(
  input: { email: string; name?: string; subject: string },
  allowAccountCreation: boolean,
): Promise<string> {
  const email = normalizeEmailAddress(input.email);
  const subject = input.subject.trim();
  if (!subject) throw new AccountUnavailableError();
  const fullName = normalizeFullName(input.name ?? email);

  const db = getDatabase();
  const userId = await db.transaction(async (tx) => {
    const [linkedAccount] = await tx
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, subject)))
      .for("update")
      .limit(1);

    if (linkedAccount) {
      const [linkedUser] = await tx
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(eq(users.id, linkedAccount.userId))
        .limit(1);

      return linkedUser?.status === "active" ? linkedUser.id : null;
    }

    const [emailAccount] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.email, email))
      .for("update")
      .limit(1);

    if (emailAccount?.status === "suspended") return null;

    if (!emailAccount && !allowAccountCreation) return null;

    const accountUserId = emailAccount?.id ?? (
      await tx
        .insert(users)
        .values({
          email,
          emailVerifiedAt: new Date(),
          fullName,
          status: "active",
        })
        .onConflictDoNothing()
        .returning({ id: users.id })
    )[0]?.id;

    if (!accountUserId) {
      const [racingEmailAccount] = await tx
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!racingEmailAccount || racingEmailAccount.status !== "active") return null;

      await tx
        .insert(oauthAccounts)
        .values({
          email,
          provider: "google",
          providerAccountId: subject,
          userId: racingEmailAccount.id,
        })
        .onConflictDoNothing();

      const [storedAccount] = await tx
        .select({ userId: oauthAccounts.userId })
        .from(oauthAccounts)
        .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, subject)))
        .limit(1);

      return storedAccount?.userId === racingEmailAccount.id ? racingEmailAccount.id : null;
    }

    await tx
      .insert(oauthAccounts)
      .values({
        email,
        provider: "google",
        providerAccountId: subject,
        userId: accountUserId,
      })
      .onConflictDoNothing();

    const [storedAccount] = await tx
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, subject)))
      .limit(1);

    return storedAccount?.userId === accountUserId ? accountUserId : null;
  });

  if (!userId) throw new AccountUnavailableError();
  return userId;
}

export async function getCurrentSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function findSessionByToken(token: string): Promise<AuthenticatedSession | null> {
  const db = getDatabase();
  const [session] = await db
    .select({
      id: authSessions.id,
      organizationId: authSessions.organizationId,
      userId: users.id,
      userName: users.fullName,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        gt(authSessions.expiresAt, new Date()),
        isNull(authSessions.revokedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function getCurrentSession(): Promise<AuthenticatedSession | null> {
  const token = await getCurrentSessionToken();
  return token ? findSessionByToken(token) : null;
}

export async function getOrganizationChoicesForUser(userId: string): Promise<OrganizationChoice[]> {
  return groupMembershipsByOrganization(await getActiveMembershipRows(userId));
}

export async function getActiveOrganizationContext(
  session: AuthenticatedSession,
): Promise<ActiveOrganizationContext | null> {
  if (!session.organizationId) return null;

  const choices = await getOrganizationChoicesForUser(session.userId);
  const organization = choices.find((choice) => choice.id === session.organizationId);

  return organization ? { organization, session } : null;
}

export async function selectOrganizationForCurrentSession(organizationId: string): Promise<void> {
  const token = await getCurrentSessionToken();
  if (!token) throw new AuthenticationError("Your session has expired. Sign in again.");

  const session = await findSessionByToken(token);
  if (!session) throw new AuthenticationError("Your session has expired. Sign in again.");

  const memberships = await getActiveMembershipRows(session.userId);
  const membership = memberships.find((item) => item.organizationId === organizationId);
  if (!membership) throw new AuthenticationError("You do not have access to this organization.");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.update(authSessions).set({ organizationId }).where(eq(authSessions.id, session.id));
    await tx.insert(auditLogs).values({
      organizationId,
      actorMembershipId: membership.membershipId,
      action: "organization.selected",
      entityType: "auth_session",
      entityId: session.id,
      metadata: {},
    });
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const token = await getCurrentSessionToken();
  if (!token) return;

  const db = getDatabase();
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.tokenHash, hashSessionToken(token)), isNull(authSessions.revokedAt)));
}
