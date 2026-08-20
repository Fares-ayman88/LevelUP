const EGYPTIAN_MOBILE = /^\+20(?:10|11|12|15)\d{8}$/;

export class InvalidPhoneNumberError extends Error {
  constructor() {
    super("Enter a valid Egyptian mobile number.");
    this.name = "InvalidPhoneNumberError";
  }
}

/** Converts common local and international formats to E.164 before persistence. */
export function normalizeEgyptianMobile(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/^\+/, "");

  if (!/^\d+$/.test(digits)) {
    throw new InvalidPhoneNumberError();
  }

  let normalized: string;

  if (compact.startsWith("+")) {
    normalized = `+${digits}`;
  } else if (digits.startsWith("00")) {
    normalized = `+${digits.slice(2)}`;
  } else if (digits.startsWith("0")) {
    normalized = `+20${digits.slice(1)}`;
  } else if (digits.startsWith("20")) {
    normalized = `+${digits}`;
  } else {
    normalized = `+${digits}`;
  }

  if (!EGYPTIAN_MOBILE.test(normalized)) {
    throw new InvalidPhoneNumberError();
  }

  return normalized;
}
