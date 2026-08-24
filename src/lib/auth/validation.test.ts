import { describe, expect, it } from "vitest";

import {
  emailPasswordSignInSchema,
  emailPasswordSignUpSchema,
  emailSignUpVerificationSchema,
  onboardingSchema,
  organizationSelectionSchema,
  otpRequestSchema,
  otpVerificationSchema,
  studentAccessCodeSignInSchema,
} from "./validation";

describe("authentication form validation", () => {
  it("requires a valid email and a sufficiently long password", () => {
    expect(emailPasswordSignInSchema.safeParse({ email: "student@levelup.demo", password: "LevelUpDemo!2026" }).success).toBe(true);
    expect(emailPasswordSignInSchema.safeParse({ email: "student@levelup.demo", password: "password" }).success).toBe(true);
    expect(emailPasswordSignInSchema.safeParse({ email: "not-an-email", password: "short" }).success).toBe(false);
  });

  it("requires account details before an email sign-up code is sent", () => {
    expect(
      emailPasswordSignUpSchema.safeParse({
        confirmPassword: "password",
        email: "student@levelup.demo",
        fullName: "Student One",
        password: "password",
        phone: "010 1234 5678",
      }).success,
    ).toBe(true);
    expect(
      emailPasswordSignUpSchema.safeParse({
        confirmPassword: "different",
        email: "not-an-email",
        fullName: "S",
        password: "short",
        phone: "",
      }).success,
    ).toBe(false);
  });

  it("requires an email-bound six-digit sign-up verification code", () => {
    expect(
      emailSignUpVerificationSchema.safeParse({
        challengeId: "c9b41138-8db5-4e37-b72a-65f3de912f3f",
        code: "123456",
        email: "student@levelup.demo",
      }).success,
    ).toBe(true);
    expect(
      emailSignUpVerificationSchema.safeParse({
        challengeId: "not-a-uuid",
        code: "1234ab",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("accepts a phone request before server-side normalization", () => {
    expect(otpRequestSchema.safeParse({ phone: "010 1234 5678" }).success).toBe(true);
  });

  it("requires a UUID challenge and six numeric OTP digits", () => {
    expect(
      otpVerificationSchema.safeParse({
        challengeId: "c9b41138-8db5-4e37-b72a-65f3de912f3f",
        code: "123456",
        phone: "+201012345678",
      }).success,
    ).toBe(true);
    expect(otpVerificationSchema.safeParse({ challengeId: "not-a-uuid", code: "12a456", phone: "010" }).success).toBe(false);
  });

  it("requires a center invitation and a student ID only for guardians", () => {
    const studentResult = onboardingSchema.safeParse({
      gradeLevel: "3rd Secondary",
      registrationCode: "LU-ABCD-EFGH-IJKL",
      relationship: "",
      role: "student",
      studentCode: null,
    });

    expect(studentResult.success).toBe(true);
    if (studentResult.success) {
      expect(studentResult.data.studentCode).toBe("");
    }

    expect(onboardingSchema.safeParse({
      gradeLevel: "3rd Secondary",
      registrationCode: null,
      relationship: "",
      role: "student",
      studentCode: null,
    }).success).toBe(false);

    expect(onboardingSchema.safeParse({
      gradeLevel: "",
      registrationCode: "LU-ABCD-EFGH-IJKL",
      relationship: "Parent",
      role: "guardian",
      studentCode: null,
    }).success).toBe(false);
  });

  it("accepts a student access code with its own form schema", () => {
    expect(studentAccessCodeSignInSchema.safeParse({ code: "STU-ABCD-EFGH-IJKL-MNPQ" }).success).toBe(true);
    expect(studentAccessCodeSignInSchema.safeParse({ code: "short" }).success).toBe(false);
  });

  it("rejects a malformed organization choice", () => {
    expect(organizationSelectionSchema.safeParse({ organizationId: "center-a" }).success).toBe(false);
  });
});
