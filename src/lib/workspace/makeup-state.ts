export type MakeupActionState = {
  message?: string;
  status: "idle" | "submitted" | "approved" | "rejected" | "error";
};

export const initialMakeupActionState: MakeupActionState = { status: "idle" };
