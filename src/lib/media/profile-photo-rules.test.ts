import { describe, expect, it } from "vitest";

import {
  hasExpectedImageSignature,
  isValidProfilePhotoMetadata,
  MAX_PROFILE_PHOTO_BYTES,
} from "./profile-photo-rules";

describe("profile photo rules", () => {
  it("accepts only safe image metadata within the size limit", () => {
    expect(isValidProfilePhotoMetadata("image/jpeg", 1024)).toBe(true);
    expect(isValidProfilePhotoMetadata("image/svg+xml", 1024)).toBe(false);
    expect(isValidProfilePhotoMetadata("image/png", MAX_PROFILE_PHOTO_BYTES + 1)).toBe(false);
  });

  it("matches the declared image type to its file signature", () => {
    expect(hasExpectedImageSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasExpectedImageSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasExpectedImageSignature("image/webp", new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });
});
