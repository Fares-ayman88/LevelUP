import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address.").max(320, "Keep the email under 320 characters.");

export class InvalidEmailAddressError extends Error {
  constructor() {
    super("Enter a valid email address.");
    this.name = "InvalidEmailAddressError";
  }
}

export function normalizeEmailAddress(value: string): string {
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) throw new InvalidEmailAddressError();

  return parsed.data.toLowerCase();
}
