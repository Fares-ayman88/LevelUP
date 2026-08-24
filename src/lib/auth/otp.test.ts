import { afterEach, describe, expect, it, vi } from "vitest";

import { createMetaWhatsAppOtpSender } from "./meta-whatsapp";
import { createInfobipOtpSender } from "./otp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Meta WhatsApp OTP sender", () => {
  it("sends an approved authentication template to the normalized WhatsApp number", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.otp-123" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const delivery = await createMetaWhatsAppOtpSender({
      accessToken: "system-user-token",
      graphApiVersion: "v25.0",
      phoneNumberId: "1234567890",
      templateLanguage: "ar",
      templateName: "levelup_verification",
    }).send({ code: "123456", destination: "+201012345678", purpose: "sign_in" });

    expect(delivery.providerMessageId).toBe("wamid.otp-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/1234567890/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer system-user-token" }),
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "201012345678",
      type: "template",
      template: {
        name: "levelup_verification",
        language: { code: "ar" },
        components: [
          { type: "body", parameters: [{ type: "text", text: "123456" }] },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: "123456" }],
          },
        ],
      },
    });
  });

  it("fails closed when Meta does not return a message id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));

    await expect(
      createMetaWhatsAppOtpSender({
        accessToken: "system-user-token",
        graphApiVersion: "v25.0",
        phoneNumberId: "1234567890",
        templateLanguage: "ar",
        templateName: "levelup_verification",
      }).send({ code: "123456", destination: "+201012345678", purpose: "sign_up" }),
    ).rejects.toThrow("Meta WhatsApp OTP delivery failed.");
  });
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
