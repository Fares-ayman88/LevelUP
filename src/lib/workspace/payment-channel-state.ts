export type PaymentChannelActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialPaymentChannelActionState: PaymentChannelActionState = { status: "idle" };
