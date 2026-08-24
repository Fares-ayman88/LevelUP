import dotenv from "dotenv";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({ token: "" }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => sessionState.token ? { value: sessionState.token } : undefined,
  }),
}));

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST;

function databaseTarget(connectionString: string) {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

if (databaseUrl && process.env.DATABASE_URL && databaseTarget(databaseUrl) === databaseTarget(process.env.DATABASE_URL)) {
  throw new Error("DATABASE_URL_TEST must point to a separate test database or Supabase project, never the production database.");
}

if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
process.env.SESSION_SECRET ??= "a-session-secret-that-is-longer-than-thirty-two-characters";
process.env.EMAIL_OTP_PROVIDER = "development";
process.env.OTP_PROVIDER = "development";

const databaseDescribe = databaseUrl ? describe : describe.skip;

databaseDescribe("self-service account onboarding", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  beforeEach(async () => {
    sessionState.token = "";
    await client.query("TRUNCATE TABLE users CASCADE");
  });

  afterAll(async () => {
    await client.end();
  });

  it("creates an unassigned account, then securely joins it to a student center", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
    const organization = await client.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [`Onboarding ${suffix}`, `onboarding-${suffix}`],
    );
    const organizationId = organization.rows[0]?.id;
    if (!organizationId) throw new Error("Expected an organization from the test setup.");

    const { hashRegistrationCode } = await import("@/lib/auth/crypto");
    const { completeOnboardingWithRegistrationCode } = await import("@/lib/workspace/registration-codes");
    const { signUpWithEmailPassword } = await import("@/lib/auth/service");
    const registrationCode = "LU-SELF-TEST-2026";
    await client.query(
      `
        INSERT INTO organization_registration_codes (organization_id, code_hash, role, max_uses)
        VALUES ($1, $2, 'student', 1)
      `,
      [organizationId, hashRegistrationCode(registrationCode)],
    );

    const email = `student-${suffix}@example.com`;
    const signUp = await signUpWithEmailPassword({
      email,
      fullName: "Onboarding Student",
      password: "A strong test password 2026",
    });

    expect(signUp.organizationId).toBeNull();
    expect(signUp.requiresOnboarding).toBe(true);
    sessionState.token = signUp.sessionToken;

    await completeOnboardingWithRegistrationCode({
      gradeLevel: "3rd Secondary",
      registrationCode,
      relationship: "",
      role: "student",
      studentCode: `ST-${suffix}`,
    });

    const membership = await client.query<{ organization_id: string; role: string }>(
      `
        SELECT organization_id, role
        FROM organization_memberships membership
        INNER JOIN users account ON account.id = membership.user_id
        WHERE account.email = $1
      `,
      [email],
    );
    expect(membership.rows).toEqual([{ organization_id: organizationId, role: "student" }]);

    const profile = await client.query<{ grade_level: string; student_code: string }>(
      `
        SELECT profile.grade_level, profile.student_code
        FROM student_profiles profile
        INNER JOIN users account ON account.id = profile.user_id
        WHERE account.email = $1
      `,
      [email],
    );
    expect(profile.rows).toEqual([{ grade_level: "3rd Secondary", student_code: `ST-${suffix}` }]);

    const session = await client.query<{ organization_id: string }>(
      "SELECT organization_id FROM auth_sessions WHERE token_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1",
    );
    expect(session.rows[0]?.organization_id).toBe(organizationId);
  });

  it("creates an email account only after its one-time code is verified", async () => {
    const suffix = Date.now() + "-" + Math.floor(Math.random() * 100_000);
    const email = "verified-" + suffix + "@example.com";
    const phone = "010" + String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const { requestEmailSignUpOtp, verifyEmailSignUpOtp } = await import("@/lib/auth/service");

    const request = await requestEmailSignUpOtp({
      email,
      fullName: "Verified Student",
      password: "A strong test password 2026",
      phone,
    });

    expect(request.developmentCode).toMatch(/^\d{6}$/);

    const beforeVerification = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM users WHERE email = $1",
      [email],
    );
    expect(beforeVerification.rows[0]?.count).toBe(0);

    const wrongCode = request.developmentCode === "000000" ? "000001" : "000000";
    await expect(verifyEmailSignUpOtp(request.challengeId, wrongCode)).rejects.toThrow("invalid or has expired");

    const verified = await verifyEmailSignUpOtp(request.challengeId, request.developmentCode!);
    expect(verified.requiresOnboarding).toBe(true);

    const account = await client.query<{
      email: string;
      email_verified_at: Date | null;
      phone_e164: string;
    }>(
      "SELECT email, email_verified_at, phone_e164 FROM users WHERE email = $1",
      [email],
    );
    expect(account.rows).toHaveLength(1);
    expect(account.rows[0]).toMatchObject({
      email,
      phone_e164: "+20" + phone.slice(1),
    });
    expect(account.rows[0]?.email_verified_at).toBeInstanceOf(Date);
  });

  it("creates a phone-first account only after its WhatsApp OTP is verified", async () => {
    const phone = "010" + String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const { requestEmailSignUpOtp, verifyEmailSignUpOtp } = await import("@/lib/auth/service");

    const request = await requestEmailSignUpOtp({
      deliveryChannel: "whatsapp",
      fullName: "WhatsApp Student",
      phone,
    });

    expect(request.deliveryChannel).toBe("whatsapp");
    expect(request.developmentCode).toMatch(/^\d{6}$/);

    const verified = await verifyEmailSignUpOtp(request.challengeId, request.developmentCode!);
    expect(verified.requiresOnboarding).toBe(true);

    const account = await client.query<{
      email: string | null;
      email_verified_at: Date | null;
      phone_e164: string;
      phone_verified_at: Date | null;
    }>(
      "SELECT email, email_verified_at, phone_e164, phone_verified_at FROM users WHERE phone_e164 = $1",
      ["+20" + phone.slice(1)],
    );

    expect(account.rows).toHaveLength(1);
    expect(account.rows[0]).toMatchObject({
      email: null,
      phone_e164: "+20" + phone.slice(1),
    });
    expect(account.rows[0]?.email_verified_at).toBeNull();
    expect(account.rows[0]?.phone_verified_at).toBeInstanceOf(Date);
  });
});
