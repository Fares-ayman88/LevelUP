export const PROFILE_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export type ProfilePhotoContentType = (typeof PROFILE_PHOTO_CONTENT_TYPES)[number];

export function isProfilePhotoContentType(value: string): value is ProfilePhotoContentType {
  return PROFILE_PHOTO_CONTENT_TYPES.some((contentType) => contentType === value);
}

export function isValidProfilePhotoMetadata(contentType: string, byteSize: number): boolean {
  return isProfilePhotoContentType(contentType)
    && Number.isInteger(byteSize)
    && byteSize > 0
    && byteSize <= MAX_PROFILE_PHOTO_BYTES;
}

export function profilePhotoExtension(contentType: ProfilePhotoContentType): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "avif";
}

export function hasExpectedImageSignature(contentType: ProfilePhotoContentType, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a;
  }

  if (contentType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }

  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
    && ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)));
}
