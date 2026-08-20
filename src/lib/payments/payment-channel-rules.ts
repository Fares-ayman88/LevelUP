export const paymentChannelKinds = ["instapay", "vodafone_cash", "bank_transfer", "cash"] as const;

export type PaymentChannelKind = (typeof paymentChannelKinds)[number];

export const paymentChannelKindLabels: Record<PaymentChannelKind, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash at the center",
  instapay: "InstaPay",
  vodafone_cash: "Vodafone Cash",
};

export function isPaymentChannelKind(value: string): value is PaymentChannelKind {
  return paymentChannelKinds.some((kind) => kind === value);
}

export function isTransferPaymentChannel(kind: PaymentChannelKind): boolean {
  return kind !== "cash";
}
