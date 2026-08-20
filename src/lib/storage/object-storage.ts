import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getServerEnvironment } from "@/lib/env/server";
import type { ProfilePhotoContentType } from "@/lib/media/profile-photo-rules";

export class ObjectStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageError";
  }
}

type ObjectStorageConfiguration = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
};

function getObjectStorageConfiguration(): ObjectStorageConfiguration | null {
  const environment = getServerEnvironment();
  const values = [
    environment.OBJECT_STORAGE_ENDPOINT,
    environment.OBJECT_STORAGE_BUCKET,
    environment.OBJECT_STORAGE_REGION,
    environment.OBJECT_STORAGE_ACCESS_KEY_ID,
    environment.OBJECT_STORAGE_SECRET_ACCESS_KEY,
  ];

  if (values.every((value) => !value)) return null;
  if (values.some((value) => !value)) {
    throw new ObjectStorageError("Object storage configuration is incomplete.");
  }

  return {
    accessKeyId: environment.OBJECT_STORAGE_ACCESS_KEY_ID!,
    bucket: environment.OBJECT_STORAGE_BUCKET!,
    endpoint: environment.OBJECT_STORAGE_ENDPOINT!,
    region: environment.OBJECT_STORAGE_REGION!,
    secretAccessKey: environment.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
  };
}

function getObjectStorage(): { client: S3Client; configuration: ObjectStorageConfiguration } {
  const configuration = getObjectStorageConfiguration();
  if (!configuration) throw new ObjectStorageError("Object storage is not configured.");

  return {
    client: new S3Client({
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      },
      endpoint: configuration.endpoint,
      forcePathStyle: true,
      region: configuration.region,
    }),
    configuration,
  };
}

export function isObjectStorageConfigured(): boolean {
  return getObjectStorageConfiguration() !== null;
}

export async function createProfilePhotoUploadUrl(
  storageKey: string,
  contentType: ProfilePhotoContentType,
): Promise<string> {
  const { client, configuration } = getObjectStorage();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: configuration.bucket,
      CacheControl: "private, max-age=300",
      ContentType: contentType,
      Key: storageKey,
    }),
    { expiresIn: 5 * 60 },
  );
}

export async function getProfilePhotoObjectMetadata(storageKey: string): Promise<{ byteSize: number; contentType: string }> {
  const { client, configuration } = getObjectStorage();
  const result = await client.send(new HeadObjectCommand({ Bucket: configuration.bucket, Key: storageKey }));

  return {
    byteSize: result.ContentLength ?? 0,
    contentType: result.ContentType?.toLowerCase() ?? "",
  };
}

export async function getProfilePhotoSignatureBytes(storageKey: string): Promise<Uint8Array> {
  const { client, configuration } = getObjectStorage();
  const result = await client.send(
    new GetObjectCommand({ Bucket: configuration.bucket, Key: storageKey, Range: "bytes=0-4095" }),
  );

  if (!result.Body) throw new ObjectStorageError("The uploaded file could not be read.");
  return result.Body.transformToByteArray();
}

export async function createProfilePhotoDownloadUrl(storageKey: string): Promise<string> {
  const { client, configuration } = getObjectStorage();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: configuration.bucket,
      Key: storageKey,
      ResponseCacheControl: "private, max-age=300",
    }),
    { expiresIn: 5 * 60 },
  );
}

export async function deleteStoredObject(storageKey: string): Promise<void> {
  const { client, configuration } = getObjectStorage();
  await client.send(new DeleteObjectCommand({ Bucket: configuration.bucket, Key: storageKey }));
}
