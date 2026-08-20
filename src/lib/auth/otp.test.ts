import { afterEach, describe, expect, it, vi } from "vitest";

import { createInfobipOtpSender } from "./otp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Infobip OTP sender", () => {
  it("sends a correctly scoped SMS request without changing the destination identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ messageId: "message-123" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const delivery = await createInfobipOtpSender({
      apiKey: "api-key",
      baseUrl: "https://api.infobip.com/",
      senderId: "LevelUp",
    }).send({ code: "123456", destination: "+201012345678", purpose: "sign_in" });

    expect(delivery.providerMessageId).toBe("message-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.infobip.com/sms/3/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "App api-key" }),
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({
      messages: [
        {
          content: { text: expect.stringContaining("123456") },
          destinations: [{ to: "201012345678" }],
          sender: "LevelUp",
        },
      ],
    });
  });

  it("fails closed when the provider does not accept the message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })));

    await expect(
      createInfobipOtpSender({
        apiKey: "api-key",
        baseUrl: "https://api.infobip.com",
        senderId: "LevelUp",
      }).send({ code: "123456", destination: "+201012345678", purpose: "sign_in" }),
    ).rejects.toThrow("Infobip OTP delivery failed.");
  });
});
