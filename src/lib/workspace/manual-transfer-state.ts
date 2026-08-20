export type ManualTransferActionState = {
  message?: string;
  status: "error" | "idle" | "submitted";
};

export const initialManualTransferActionState: ManualTransferActionState = { status: "idle" };
