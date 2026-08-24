"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getPublicAuthenticationMessage,
} from "@/lib/auth/errors";
import {
  initialEmailSignInState,
  initialEmailSignUpRequestState,
  initialEmailSignUpVerificationState,
  initialOnboardingState,
  initialOtpRequestState,
  initialOtpVerificationState,
  initialStudentAccessCodeSignInState,
  type EmailSignInState,
  type EmailSignUpRequestState,
  type EmailSignUpVerificationState,
  type OnboardingState,
  type OtpRequestState,
  type OtpVerificationState,
  type StudentAccessCodeSignInState,
} from "@/lib/auth/form-state";
import {
  revokeCurrentSession,
  requestEmailSignUpOtp,
  requestSignInOtp,
  selectOrganizationForCurrentSession,
  signInWithEmailPassword,
  signInWithStudentAccessCode,
  verifyEmailSignUpOtp,
  verifySignInOtp,
} from "@/lib/auth/service";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import {
  emailPasswordSignInSchema,
  emailPasswordSignUpSchema,
  emailSignUpVerificationSchema,
  onboardingSchema,
  organizationSelectionSchema,
  otpRequestSchema,
  otpVerificationSchema,
  studentAccessCodeSignInSchema,
} from "@/lib/auth/validation";
import { completeOnboardingWithRegistrationCode } from "@/lib/workspace/registration-codes";

function redirectAfterAuthentication(result: {
  organizationId: string | null;
  requiresOnboarding: boolean;
}): never {
  if (result.requiresOnboarding) redirect("/onboarding");
  redirect(result.organizationId ? "/app" : "/select-organization");
}

export async function signInWithEmailAction(
  _previousState: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = emailPasswordSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ...initialEmailSignInState,
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your email and password.",
    };
  }

  let result;
  try {
    result = await signInWithEmailPassword(parsed.data.email, parsed.data.password);
  } catch (error) {
    return {
      ...initialEmailSignInState,
      status: "error",
      message: getPublicAuthenticationMessage(error),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions);
  redirectAfterAuthentication(result);
}

export async function signInWithStudentAccessCodeAction(
  _previousState: StudentAccessCodeSignInState,
  formData: FormData,
): Promise<StudentAccessCodeSignInState> {
  const parsed = studentAccessCodeSignInSchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return {
      ...initialStudentAccessCodeSignInState,
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter the student access code.",
    };
  }

  let result;
  try {
    result = await signInWithStudentAccessCode(parsed.data.code);
  } catch (error) {
    return {
      ...initialStudentAccessCodeSignInState,
      status: "error",
      message: getPublicAuthenticationMessage(error),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions);
  redirectAfterAuthentication(result);
}

export async function requestEmailSignUpOtpAction(
  _previousState: EmailSignUpRequestState,
  formData: FormData,
): Promise<EmailSignUpRequestState> {
  const parsed = emailPasswordSignUpSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ...initialEmailSignUpRequestState,
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your account details.",
    };
  }

  try {
    const result = await requestEmailSignUpOtp(parsed.data);
    return {
      status: "code_sent",
      challengeId: result.challengeId,
      developmentCode: result.developmentCode,
      email: result.email,
      expiresAt: result.expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      ...initialEmailSignUpRequestState,
      status: "error",
      message: getPublicAuthenticationMessage(error, "We could not start your sign-up. Please try again shortly."),
    };
  }
}

export async function verifyEmailSignUpOtpAction(
  _previousState: EmailSignUpVerificationState,
  formData: FormData,
): Promise<EmailSignUpVerificationState> {
  const parsed = emailSignUpVerificationSchema.safeParse({
    challengeId: formData.get("challengeId"),
    code: formData.get("code"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ...initialEmailSignUpVerificationState,
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter the six-digit code.",
    };
  }

  let result;
  try {
    result = await verifyEmailSignUpOtp(parsed.data.email, parsed.data.challengeId, parsed.data.code);
  } catch (error) {
    return {
      ...initialEmailSignUpVerificationState,
      status: "error",
      message: getPublicAuthenticationMessage(error, "We could not verify your email. Please try again shortly."),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions);
  redirectAfterAuthentication(result);
}

export async function requestSignInOtpAction(
  _previousState: OtpRequestState,
  formData: FormData,
): Promise<OtpRequestState> {
  const parsed = otpRequestSchema.safeParse({ phone: formData.get("phone") });

  if (!parsed.success) {
    return { ...initialOtpRequestState, status: "error", message: "Enter a valid Egyptian mobile number." };
  }

  try {
    const result = await requestSignInOtp(parsed.data.phone);

    return {
      status: "code_sent",
      challengeId: result.challengeId,
      developmentCode: result.developmentCode,
      expiresAt: result.expiresAt.toISOString(),
      phoneE164: result.phoneE164,
    };
  } catch (error) {
    return {
      ...initialOtpRequestState,
      status: "error",
      message: getPublicAuthenticationMessage(error),
    };
  }
}

export async function verifySignInOtpAction(
  _previousState: OtpVerificationState,
  formData: FormData,
): Promise<OtpVerificationState> {
  const parsed = otpVerificationSchema.safeParse({
    challengeId: formData.get("challengeId"),
    code: formData.get("code"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { ...initialOtpVerificationState, status: "error", message: "Enter the six-digit code." };
  }

  let result;
  try {
    result = await verifySignInOtp(parsed.data.phone, parsed.data.challengeId, parsed.data.code);
  } catch (error) {
    return {
      ...initialOtpVerificationState,
      status: "error",
      message: getPublicAuthenticationMessage(error),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions);
  redirectAfterAuthentication(result);
}

export async function completeOnboardingAction(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    gradeLevel: formData.get("gradeLevel"),
    registrationCode: formData.get("registrationCode"),
    relationship: formData.get("relationship"),
    role: formData.get("role"),
    studentCode: formData.get("studentCode"),
  });

  if (!parsed.success) {
    return {
      ...initialOnboardingState,
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the center access details.",
    };
  }

  try {
    await completeOnboardingWithRegistrationCode(parsed.data);
  } catch (error) {
    return {
      ...initialOnboardingState,
      status: "error",
      message: getPublicAuthenticationMessage(error),
    };
  }

  redirect("/app");
}

export async function selectOrganizationAction(formData: FormData): Promise<void> {
  const parsed = organizationSelectionSchema.safeParse({ organizationId: formData.get("organizationId") });
  if (!parsed.success) redirect("/select-organization");

  try {
    await selectOrganizationForCurrentSession(parsed.data.organizationId);
  } catch {
    redirect("/sign-in");
  }

  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  await revokeCurrentSession();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  redirect("/sign-in");
}
