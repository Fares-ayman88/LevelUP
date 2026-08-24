import { InvalidEmailAddressError } from "./email";
import { InvalidPhoneNumberError } from "./phone";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class OtpRateLimitError extends AuthenticationError {
  constructor() {
    super("Please wait a few minutes before requesting another code.");
    this.name = "OtpRateLimitError";
  }
}

export class OtpDeliveryError extends AuthenticationError {
  constructor() {
    super("We could not send a code right now. Please try again shortly.");
    this.name = "OtpDeliveryError";
  }
}

export class OtpVerificationError extends AuthenticationError {
  constructor() {
    super("That code is invalid or has expired.");
    this.name = "OtpVerificationError";
  }
}

export class AccountUnavailableError extends AuthenticationError {
  constructor() {
    super("This account is not linked to an active LevelUp account yet.");
    this.name = "AccountUnavailableError";
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

export class StudentAccessCodeError extends AuthenticationError {
  constructor() {
    super("That student access code is invalid or is no longer active. Ask the center to reset it.");
    this.name = "StudentAccessCodeError";
  }
}

export class AccountAlreadyExistsError extends AuthenticationError {
  constructor(message = "An account with this email already exists. Sign in instead.") {
    super(message);
    this.name = "AccountAlreadyExistsError";
  }
}

export class RegistrationCodeError extends AuthenticationError {
  constructor(message = "That center access code is invalid, expired, or has already been used.") {
    super(message);
    this.name = "RegistrationCodeError";
  }
}

export function getPublicAuthenticationMessage(
  error: unknown,
  unavailableMessage = "Sign-in is temporarily unavailable. Please try again shortly.",
): string {
  if (error instanceof InvalidEmailAddressError || error instanceof InvalidPhoneNumberError || error instanceof AuthenticationError) {
    return error.message;
  }

  return unavailableMessage;
}
