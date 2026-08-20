export type PaymentActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialPaymentActionState: PaymentActionState = { status: "idle" };
