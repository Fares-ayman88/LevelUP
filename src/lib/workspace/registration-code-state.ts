export type RegistrationCodeActionState = {
  generatedCode?: string;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialRegistrationCodeActionState: RegistrationCodeActionState = { status: "idle" };
