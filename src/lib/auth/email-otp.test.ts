import { afterEach, describe, expect, it, vi } from "vitest";

import { createResendEmailOtpSender } from "./email-otp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Resend email OTP sender", () => {
  it("sends a branded, idempotent verification message to the requested email", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const delivery = await createResendEmailOtpSender({
      apiKey: "re_test_key",
      from: "LevelUp <verify@levelup.test>",
    }).send({
      code: "123456",
      destination: "student@example.com",
      idempotencyKey: "challenge-123",
      purpose: "sign_up",
    });

    expect(delivery.providerMessageId).toBe("email-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Idempotency-Key": "levelup-email-otp:challenge-123",
        }),
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual(
      expect.objectContaining({
        from: "LevelUp <verify@levelup.test>",
        subject: "Your LevelUp verification code",
        text: expect.stringContaining("123456"),
        to: ["student@example.com"],
      }),
    );
  });

  it("fails closed when Resend does not accept the email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })));

    await expect(
      createResendEmailOtpSender({
        apiKey: "re_test_key",
        from: "LevelUp <verify@levelup.test>",
      }).send({
        code: "123456",
        destination: "student@example.com",
        idempotencyKey: "challenge-123",
        purpose: "sign_up",
      }),
    ).rejects.toThrow("Resend email OTP delivery failed.");
  });
});
