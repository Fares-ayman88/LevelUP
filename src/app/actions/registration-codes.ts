"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createOrganizationRegistrationCode,
  deactivateOrganizationRegistrationCode,
  RegistrationCodeManagementError,
} from "@/lib/workspace/registration-codes";
import {
  initialRegistrationCodeActionState,
  type RegistrationCodeActionState,
} from "@/lib/workspace/registration-code-state";

const createCodeSchema = z.object({
  label: z.string().trim().max(120, "Keep the label under 120 characters."),
  maxUses: z.coerce.number().int("Enter a whole number.").min(1, "Allow at least one use.").max(500, "Allow at most 500 uses."),
  role: z.enum(["student", "guardian"]),
  validForDays: z.coerce.number().int("Enter a whole number.").min(1, "Keep the code valid for at least one day.").max(365, "Keep the code valid for at most 365 days."),
});

const deactivateCodeSchema = z.object({ codeId: z.string().uuid() });

function errorState(message: string): RegistrationCodeActionState {
  return { ...initialRegistrationCodeActionState, message, status: "error" };
}

export async function createRegistrationCodeAction(
  _previousState: RegistrationCodeActionState,
  formData: FormData,
): Promise<RegistrationCodeActionState> {
  const parsed = createCodeSchema.safeParse({
    label: formData.get("label"),
    maxUses: formData.get("maxUses"),
    role: formData.get("role"),
    validForDays: formData.get("validForDays"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Check the access code settings.");

  try {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + parsed.data.validForDays);
    const result = await createOrganizationRegistrationCode({
      expiresAt,
      label: parsed.data.label || null,
      maxUses: parsed.data.maxUses,
      role: parsed.data.role,
    });

    revalidatePath("/app/admin/access-codes");
    return {
      generatedCode: result.code,
      message: "Access code created. Share it securely before leaving this page.",
      status: "success",
    };
  } catch (error) {
    if (error instanceof RegistrationCodeManagementError) return errorState(error.message);
    return errorState("The access code could not be created. Try again.");
  }
}

export async function deactivateRegistrationCodeAction(formData: FormData): Promise<void> {
  const parsed = deactivateCodeSchema.safeParse({ codeId: formData.get("codeId") });
  if (!parsed.success) return;

  try {
    await deactivateOrganizationRegistrationCode(parsed.data.codeId);
    revalidatePath("/app/admin/access-codes");
  } catch {
    // The route remains safe even if a stale code has already been deactivated.
  }
}
