import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { auditLogs, mediaAssets, organizationMemberships, teacherProfiles } from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";
import {
  hasExpectedImageSignature,
  isProfilePhotoContentType,
  isValidProfilePhotoMetadata,
  profilePhotoExtension,
} from "@/lib/media/profile-photo-rules";
import {
  createProfilePhotoDownloadUrl,
  createProfilePhotoUploadUrl,
  deleteStoredObject,
  getProfilePhotoObjectMetadata,
  getProfilePhotoSignatureBytes,
  ObjectStorageError,
} from "@/lib/storage/object-storage";

export class TeacherProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeacherProfileError";
  }
}

export type TeacherProfileWorkspace = {
  membershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  teacher: {
    displayName: string;
    id: string;
    profilePhotoKey: string | null;
  };
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

export async function getCurrentTeacherProfileWorkspace(): Promise<TeacherProfileWorkspace | null> {
  const activeOrganization = await requireActiveOrganization();
  if (!hasPermission(toPrincipal(activeOrganization), "teacher.manage_own_profile")) return null;

  const db = getDatabase();
  const [profile] = await db
    .select({
      displayName: teacherProfiles.displayName,
      id: teacherProfiles.id,
      membershipId: organizationMemberships.id,
      profilePhotoKey: teacherProfiles.profilePhotoKey,
    })
    .from(teacherProfiles)
    .innerJoin(
      organizationMemberships,
      and(
        eq(teacherProfiles.membershipId, organizationMemberships.id),
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
      ),
    )
    .where(
      and(
        eq(teacherProfiles.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        eq(organizationMemberships.role, "teacher"),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!profile) return null;

  return {
    membershipId: profile.membershipId,
    organization: activeOrganization.organization,
    teacher: {
      displayName: profile.displayName,
      id: profile.id,
      profilePhotoKey: profile.profilePhotoKey,
    },
  };
}

function profilePhotoStorageKey(context: TeacherProfileWorkspace, contentType: Parameters<typeof profilePhotoExtension>[0]): string {
  return `organizations/${context.organization.id}/teachers/${context.teacher.id}/profile/${randomUUID()}.${profilePhotoExtension(contentType)}`;
}

export async function initiateTeacherProfilePhotoUpload(input: {
  byteSize: number;
  contentType: string;
}): Promise<{ assetId: string; uploadHeaders: Record<string, string>; uploadUrl: string }> {
  const context = await getCurrentTeacherProfileWorkspace();
  if (!context) throw new TeacherProfileError("You do not have permission to update this profile.");
  if (!isProfilePhotoContentType(input.contentType) || !isValidProfilePhotoMetadata(input.contentType, input.byteSize)) {
    throw new TeacherProfileError("Choose a JPG, PNG, WebP, or AVIF image under 5 MB.");
  }

  const storageKey = profilePhotoStorageKey(context, input.contentType);
  const db = getDatabase();
  const asset = await db.transaction(async (tx) => {
    await tx
      .update(mediaAssets)
      .set({ rejectionReason: "Superseded by a newer upload", status: "rejected" })
      .where(
        and(
          eq(mediaAssets.organizationId, context.organization.id),
          eq(mediaAssets.createdByMembershipId, context.membershipId),
          eq(mediaAssets.kind, "teacher_profile_photo"),
          eq(mediaAssets.status, "pending_upload"),
        ),
      );

    const [createdAsset] = await tx
      .insert(mediaAssets)
      .values({
        byteSize: input.byteSize,
        contentType: input.contentType,
        createdByMembershipId: context.membershipId,
        kind: "teacher_profile_photo",
        organizationId: context.organization.id,
        storageKey,
        status: "pending_upload",
      })
      .returning({ id: mediaAssets.id });

    return createdAsset;
  });

  if (!asset) throw new TeacherProfileError("We could not prepare that upload. Please try again.");

  try {
    const uploadUrl = await createProfilePhotoUploadUrl(storageKey, input.contentType);
    return { assetId: asset.id, uploadHeaders: { "Content-Type": input.contentType }, uploadUrl };
  } catch (error) {
    await db
      .update(mediaAssets)
      .set({ rejectionReason: "Could not create upload URL", status: "rejected" })
      .where(eq(mediaAssets.id, asset.id));

    if (error instanceof ObjectStorageError) throw new TeacherProfileError("Photo storage is not ready yet.");
    throw error;
  }
}

async function rejectTeacherProfilePhotoAsset(assetId: string, organizationId: string, reason: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(mediaAssets)
    .set({ rejectionReason: reason, status: "rejected" })
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.organizationId, organizationId),
        eq(mediaAssets.status, "pending_upload"),
      ),
    );
}

export async function completeTeacherProfilePhotoUpload(assetId: string): Promise<void> {
  const context = await getCurrentTeacherProfileWorkspace();
  if (!context) throw new TeacherProfileError("You do not have permission to update this profile.");

  const db = getDatabase();
  const [asset] = await db
    .select({
      byteSize: mediaAssets.byteSize,
      contentType: mediaAssets.contentType,
      id: mediaAssets.id,
      storageKey: mediaAssets.storageKey,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.organizationId, context.organization.id),
        eq(mediaAssets.createdByMembershipId, context.membershipId),
        eq(mediaAssets.kind, "teacher_profile_photo"),
        eq(mediaAssets.status, "pending_upload"),
      ),
    )
    .limit(1);

  if (!asset || !isProfilePhotoContentType(asset.contentType)) {
    throw new TeacherProfileError("This upload is no longer available.");
  }

  try {
    const [metadata, signature] = await Promise.all([
      getProfilePhotoObjectMetadata(asset.storageKey),
      getProfilePhotoSignatureBytes(asset.storageKey),
    ]);

    if (metadata.byteSize !== asset.byteSize || metadata.contentType !== asset.contentType) {
      throw new TeacherProfileError("The uploaded file does not match the approved image details.");
    }
    if (!hasExpectedImageSignature(asset.contentType, signature)) {
      throw new TeacherProfileError("The uploaded file is not a valid image.");
    }
  } catch (error) {
    const reason = error instanceof TeacherProfileError ? error.message : "Could not verify uploaded image";
    await rejectTeacherProfilePhotoAsset(asset.id, context.organization.id, reason);

    if (error instanceof TeacherProfileError) throw error;
    throw new TeacherProfileError("We could not verify that image. Please try another file.");
  }

  const now = new Date();
  const previousStorageKey = await db.transaction(async (tx) => {
    const [pendingAsset] = await tx
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, asset.id),
          eq(mediaAssets.organizationId, context.organization.id),
          eq(mediaAssets.status, "pending_upload"),
        ),
      )
      .for("update")
      .limit(1);
    if (!pendingAsset) throw new TeacherProfileError("This upload has already been completed or rejected.");

    const [teacher] = await tx
      .select({ profilePhotoKey: teacherProfiles.profilePhotoKey })
      .from(teacherProfiles)
      .where(
        and(
          eq(teacherProfiles.id, context.teacher.id),
          eq(teacherProfiles.organizationId, context.organization.id),
          eq(teacherProfiles.membershipId, context.membershipId),
        ),
      )
      .for("update")
      .limit(1);
    if (!teacher) throw new TeacherProfileError("Your teacher profile could not be found.");

    await tx
      .update(mediaAssets)
      .set({ rejectionReason: null, status: "ready", verifiedAt: now })
      .where(eq(mediaAssets.id, asset.id));
    await tx
      .update(teacherProfiles)
      .set({ profilePhotoKey: asset.storageKey })
      .where(eq(teacherProfiles.id, context.teacher.id));

    if (teacher.profilePhotoKey && teacher.profilePhotoKey !== asset.storageKey) {
      await tx
        .update(mediaAssets)
        .set({ status: "deleted" })
        .where(
          and(
            eq(mediaAssets.organizationId, context.organization.id),
            eq(mediaAssets.storageKey, teacher.profilePhotoKey),
            eq(mediaAssets.status, "ready"),
          ),
        );
    }

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.membershipId,
      action: "teacher.profile_photo_updated",
      entityType: "teacher_profile",
      entityId: context.teacher.id,
      metadata: { mediaAssetId: asset.id },
    });

    return teacher.profilePhotoKey;
  });

  if (previousStorageKey && previousStorageKey !== asset.storageKey) {
    try {
      await deleteStoredObject(previousStorageKey);
    } catch {
      // The database no longer references the old photo; a storage cleanup job can retry it later.
    }
  }
}

export async function getTeacherProfilePhotoDownloadUrl(teacherProfileId: string): Promise<string | null> {
  const activeOrganization = await requireActiveOrganization();
  const db = getDatabase();
  const [asset] = await db
    .select({ storageKey: mediaAssets.storageKey })
    .from(teacherProfiles)
    .innerJoin(
      mediaAssets,
      and(
        eq(teacherProfiles.profilePhotoKey, mediaAssets.storageKey),
        eq(mediaAssets.organizationId, activeOrganization.organization.id),
        eq(mediaAssets.kind, "teacher_profile_photo"),
        eq(mediaAssets.status, "ready"),
      ),
    )
    .where(
      and(
        eq(teacherProfiles.id, teacherProfileId),
        eq(teacherProfiles.organizationId, activeOrganization.organization.id),
        eq(teacherProfiles.isPublished, true),
      ),
    )
    .limit(1);

  return asset ? createProfilePhotoDownloadUrl(asset.storageKey) : null;
}
