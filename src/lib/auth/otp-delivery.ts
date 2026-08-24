export const signUpOtpDeliveryChannels = ["email", "whatsapp"] as const;

export type SignUpOtpDeliveryChannel = (typeof signUpOtpDeliveryChannels)[number];
