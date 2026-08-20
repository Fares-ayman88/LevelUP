import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(authorizationHeader: string | null, expectedSecret: string | undefined): boolean {
  if (!expectedSecret || !authorizationHeader?.startsWith("Bearer ")) return false;

  const token = authorizationHeader.slice("Bearer ".length);
  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(token);

  return expected.length === received.length && timingSafeEqual(expected, received);
}
