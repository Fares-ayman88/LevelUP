import { describe, expect, it } from "vitest";

import {
  isPaymentChannelKind,
  isTransferPaymentChannel,
  paymentChannelKindLabels,
  paymentChannelKinds,
} from "./payment-channel-rules";

describe("payment channel rules", () => {
  it("keeps the configured payment channel vocabulary explicit", () => {
    expect(paymentChannelKinds).toEqual(["instapay", "vodafone_cash", "bank_transfer", "cash"]);
    expect(isPaymentChannelKind("instapay")).toBe(true);
    expect(isPaymentChannelKind("wallet")).toBe(false);
    expect(paymentChannelKindLabels.cash).toBe("Cash at the center");
  });

  it("requires a reference only for transfer channels", () => {
    expect(isTransferPaymentChannel("instapay")).toBe(true);
    expect(isTransferPaymentChannel("vodafone_cash")).toBe(true);
    expect(isTransferPaymentChannel("bank_transfer")).toBe(true);
    expect(isTransferPaymentChannel("cash")).toBe(false);
  });
});
