"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { InvalidEmailAddressError } from "@/lib/auth/email";
import {
  CenterPeopleError,
  createGuardianAndLinkStudent,
  createStaffAccount,
  createStudent,
  resetStudentAccessCode,
} from "@/lib/workspace/center-people";
import {
  initialCenterPeopleActionState,
  type CenterPeopleActionState,
} from "@/lib/workspace/center-people-state";

const nameSchema = z.string().trim().min(2, "Enter a full name.").max(160, "Keep the name under 160 characters.");
const emailSchema = z.string().trim().email("Enter a valid email address.").max(320, "Keep the email under 320 characters.");
const optionalEmailSchema = z
  .string()
  .trim()
  .max(320, "Keep the email under 320 characters.")
  .refine((value) => !value || emailSchema.safeParse(value).success, "Enter a valid email address.");
const passwordSchema = z.string().min(8, "Use at least 8 characters for the initial password.").max(256, "Keep the password under 256 characters.");

const studentSchema = z
  .object({
    email: optionalEmailSchema,
    fullName: nameSchema,
    gradeLevel: z.string().trim().min(2, "Enter the student grade.").max(80, "Keep the grade under 80 characters."),
    password: z.string().max(256, "Keep the password under 256 characters."),
    studentCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,48}$/, "Use 3-48 letters, numbers, or hyphens for the student code."),
  })
  .superRefine((value, context) => {
    if (Boolean(value.email) !== Boolean(value.password)) {
      context.addIssue({ code: "custom", message: "Add both an email and an initial password to create a student account.", path: ["email"] });
    }

    if (value.password && value.password.length < 8) {
      context.addIssue({ code: "custom", message: "Use at least 8 characters for the initial password.", path: ["password"] });
    }
  });

const guardianSchema = z.object({
  email: emailSchema,
  fullName: nameSchema,
  password: passwordSchema,
  relationship: z.string().trim().min(2, "Add the relationship.").max(40, "Keep the relationship under 40 characters."),
  studentProfileId: z.string().uuid(),
});

const staffSchema = z.object({
  email: emailSchema,
  fullName: nameSchema,
  password: passwordSchema,
  role: z.enum(["teacher", "assistant", "center_admin"]),
});

const studentAccessCodeResetSchema = z.object({
  studentProfileId: z.string().uuid(),
});

function errorState(message: string): CenterPeopleActionState {
  return { ...initialCenterPeopleActionState, message, status: "error" };
}

function personErrorState(error: unknown): CenterPeopleActionState {
  if (error instanceof InvalidEmailAddressError) return errorState(error.message);
  if (error instanceof CenterPeopleError) return errorState(error.message);
  throw error;
}

function revalidatePeoplePages(): void {
  revalidatePath("/app/admin");
  revalidatePath("/app/admin/people");
  revalidatePath("/select-organization");
}

export async function createStudentAction(
  _previousState: CenterPeopleActionState,
  formData: FormData,
): Promise<CenterPeopleActionState> {
  const parsed = studentSchema.safeParse({
    fullName: formData.get("fullName"),
    gradeLevel: formData.get("gradeLevel"),
    email: formData.get("email"),
    password: formData.get("password"),
    studentCode: formData.get("studentCode"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Check the student details.");

  try {
    const result = await createStudent({ ...parsed.data, email: parsed.data.email || null, password: parsed.data.password || null });
    revalidatePeoplePages();
    return {
      message: result.studentAccessCode
        ? "Student added. Share the access code privately now."
        : "Student account created.",
      status: "success",
      studentAccessCode: result.studentAccessCode ?? undefined,
      studentName: parsed.data.fullName,
    };
  } catch (error) {
    return personErrorState(error);
  }
}

export async function resetStudentAccessCodeAction(
  _previousState: CenterPeopleActionState,
  formData: FormData,
): Promise<CenterPeopleActionState> {
  const parsed = studentAccessCodeResetSchema.safeParse({ studentProfileId: formData.get("studentProfileId") });
  if (!parsed.success) return errorState("Choose a student from this center.");

  try {
    const studentAccessCode = await resetStudentAccessCode(parsed.data.studentProfileId);
    revalidatePeoplePages();
    return {
      message: "A new private access code is ready. The previous code no longer works.",
      status: "success",
      studentAccessCode,
    };
  } catch (error) {
    return personErrorState(error);
  }
}

export async function createGuardianAction(
  _previousState: CenterPeopleActionState,
  formData: FormData,
): Promise<CenterPeopleActionState> {
  const parsed = guardianSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    relationship: formData.get("relationship"),
    studentProfileId: formData.get("studentProfileId"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Check the guardian details.");

  try {
    await createGuardianAndLinkStudent(parsed.data);
  } catch (error) {
    return personErrorState(error);
  }

  revalidatePeoplePages();
  return { message: "Guardian account linked to the student.", status: "success" };
}

export async function createStaffAccountAction(
  _previousState: CenterPeopleActionState,
  formData: FormData,
): Promise<CenterPeopleActionState> {
  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Check the staff account details.");

  try {
    await createStaffAccount(parsed.data);
  } catch (error) {
    return personErrorState(error);
  }

  revalidatePeoplePages();
  return { message: "Staff account created.", status: "success" };
}
