export type EmailSignInState = {
  message?: string;
  status: "idle" | "error";
};

export type EmailSignUpRequestState = {
  challengeId?: string;
  developmentCode?: string;
  email?: string;
  expiresAt?: string;
  message?: string;
  status: "idle" | "code_sent" | "error";
};

export type EmailSignUpVerificationState = {
  message?: string;
  status: "idle" | "error";
};

export type StudentAccessCodeSignInState = {
  message?: string;
  status: "idle" | "error";
};

export type OnboardingState = {
  message?: string;
  status: "idle" | "error";
};

export type OtpRequestState = {
  status: "idle" | "code_sent" | "error";
  challengeId?: string;
  developmentCode?: string;
  expiresAt?: string;
  message?: string;
  phoneE164?: string;
};

export type OtpVerificationState = {
  message?: string;
  status: "idle" | "error";
};

export const initialEmailSignInState: EmailSignInState = { status: "idle" };
export const initialEmailSignUpRequestState: EmailSignUpRequestState = { status: "idle" };
export const initialEmailSignUpVerificationState: EmailSignUpVerificationState = { status: "idle" };
export const initialStudentAccessCodeSignInState: StudentAccessCodeSignInState = { status: "idle" };
export const initialOnboardingState: OnboardingState = { status: "idle" };
export const initialOtpRequestState: OtpRequestState = { status: "idle" };
export const initialOtpVerificationState: OtpVerificationState = { status: "idle" };
