import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MINIMUM_PASSWORD_LENGTH = 12;
const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;

type PasswordHashParts = {
  derivedKey: Buffer;
  salt: string;
};

function parseHash(value: string): PasswordHashParts | null {
  const [algorithm, n, r, p, salt, encodedKey, ...rest] = value.split("$");
  if (
    algorithm !== "scrypt"
    || n !== String(SCRYPT_N)
    || r !== String(SCRYPT_R)
    || p !== String(SCRYPT_P)
    || !salt
    || !encodedKey
    || rest.length
  ) {
    return null;
  }

  try {
    const derivedKey = Buffer.from(encodedKey, "base64url");
    return derivedKey.length === KEY_LENGTH ? { derivedKey, salt } : null;
  } catch {
    return null;
  }
}

async function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_N,
        maxmem: SCRYPT_MAX_MEMORY,
        p: SCRYPT_P,
        r: SCRYPT_R,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(Buffer.from(derivedKey));
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, salt);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, derivedKey.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) return false;

  const parsed = parseHash(storedHash);
  if (!parsed) return false;

  const derivedKey = await deriveKey(password, parsed.salt);
  return timingSafeEqual(derivedKey, parsed.derivedKey);
}
