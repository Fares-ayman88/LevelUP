import { z } from "zod";

export const emailPasswordSignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320, "Keep the email under 320 characters."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(256, "Keep the password under 256 characters."),
});

export const emailPasswordSignUpSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password.").max(256, "Keep the password under 256 characters."),
    email: z.string().trim().email("Enter a valid email address.").max(320, "Keep the email under 320 characters."),
    fullName: z.string().trim().min(2, "Enter your full name.").max(160, "Keep the name under 160 characters."),
    password: z.string().min(8, "Use at least 8 characters for your password.").max(256, "Keep the password under 256 characters."),
    phone: z.string().trim().min(1, "Enter your mobile number.").max(32, "Keep the mobile number under 32 characters."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: "custom", message: "Passwords do not match.", path: ["confirmPassword"] });
    }
  });

export const emailSignUpVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code."),
  email: z.string().trim().email("Enter a valid email address.").max(320, "Keep the email under 320 characters."),
});

function optionalFormText(defaultValue: string, maxLength: number, message: string) {
  return z.preprocess(
    (value) => value === null ? undefined : value,
    z.string().trim().max(maxLength, message).optional().default(defaultValue),
  );
}

function requiredFormText(maxLength: number, requiredMessage: string, tooLongMessage: string) {
  return z.preprocess(
    (value) => value === null ? "" : value,
    z.string().trim().min(3, requiredMessage).max(maxLength, tooLongMessage),
  );
}

export const onboardingSchema = z
  .object({
    gradeLevel: z.string().trim().max(80, "Keep the grade under 80 characters.").optional().default("1st Secondary"),
    registrationCode: requiredFormText(48, "Enter the invitation code from your center.", "Keep the center invitation code under 48 characters."),
    relationship: z.string().trim().max(40, "Keep the relationship under 40 characters.").optional().default("Parent"),
    role: z.enum(["student", "guardian"]),
    studentCode: optionalFormText("", 48, "Keep the student code under 48 characters."),
  })
  .superRefine((value, context) => {
    if (value.role === "student") {
      if (!value.gradeLevel || value.gradeLevel.length < 2) {
        context.addIssue({ code: "custom", message: "Select the student grade.", path: ["gradeLevel"] });
      }
      return;
    }

    if (!value.relationship || value.relationship.length < 2) {
      context.addIssue({ code: "custom", message: "Enter your relationship to the student.", path: ["relationship"] });
    }

    if (!value.studentCode) {
      context.addIssue({ code: "custom", message: "Enter the student ID supplied by the center.", path: ["studentCode"] });
    }
  });

export const studentAccessCodeSignInSchema = z.object({
  code: z.string().trim().min(8, "Enter the student access code.").max(64, "Keep the access code under 64 characters."),
});

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(1).max(32),
});

export const otpVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  phone: z.string().trim().min(1).max(32),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code."),
});

export const organizationSelectionSchema = z.object({
  organizationId: z.string().uuid(),
});
