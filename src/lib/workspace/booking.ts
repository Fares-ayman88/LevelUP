import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";

import { academicGroups, auditLogs, groupEnrollments, paymentObligations, waitlistEntries } from "@/db/schema";
import { getDatabase } from "@/db/client";

import { getCurrentStudentWorkspace, liveEnrollmentStatuses } from "./student";
import { getAvailableSeatsForLockedGroup, promoteWaitingStudentsForLockedGroup } from "./waitlist-operations";

const SEAT_HOLD_MS = 30 * 60 * 1000;
const activeWaitlistStatuses = ["waiting", "offered"] as const;

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

export type BookingResult =
  | { expiresAt: Date; kind: "reserved" }
  | { kind: "waitlisted"; position: number }
  | { kind: "already_enrolled" }
  | { kind: "already_waitlisted" }
  | { kind: "not_found" };

export type WaitlistOfferAcceptanceResult =
  | { expiresAt: Date; kind: "reserved" }
  | { kind: "already_enrolled" }
  | { kind: "expired" }
  | { kind: "unavailable" };

function currentBillingPeriod(now: Date) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startsAt = new Date(Date.UTC(year, month, 1));
  const endsAt = new Date(Date.UTC(year, month + 1, 0));

  return {
    endsAt: endsAt.toISOString().slice(0, 10),
    startsAt: startsAt.toISOString().slice(0, 10),
  };
}

export async function bookCurrentStudentIntoGroup(groupId: string): Promise<BookingResult> {
  const context = await getCurrentStudentWorkspace();
  if (!context) throw new BookingError("Only an active student account can reserve this seat.");

  const db = getDatabase();
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + SEAT_HOLD_MS);

  return db.transaction(async (tx) => {
    const [group] = await tx
      .select({
        capacity: academicGroups.capacity,
        currencyCode: academicGroups.currencyCode,
        id: academicGroups.id,
        monthlyFeeMinor: academicGroups.monthlyFeeMinor,
      })
      .from(academicGroups)
      .where(
        and(
          eq(academicGroups.id, groupId),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.status, "active"),
        ),
      )
      .for("update")
      .limit(1);

    if (!group) return { kind: "not_found" };

    const [existingEnrollment] = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.groupId, group.id),
          eq(groupEnrollments.studentProfileId, context.student.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .limit(1);

    if (existingEnrollment) return { kind: "already_enrolled" };

    const seatsAvailable = await getAvailableSeatsForLockedGroup(
      tx,
      { actorMembershipId: context.actorMembershipId, now, organizationId: context.organization.id },
      group,
    );

    if (seatsAvailable > 0) {
      const [enrollment] = await tx
        .insert(groupEnrollments)
        .values({
          organizationId: context.organization.id,
          groupId: group.id,
          studentProfileId: context.student.id,
          status: "pending_payment",
          reservedUntil,
        })
        .returning({ id: groupEnrollments.id });

      if (!enrollment) throw new BookingError("We could not reserve the seat. Please try again.");

      const billingPeriod = currentBillingPeriod(now);
      await tx
        .insert(paymentObligations)
        .values({
          organizationId: context.organization.id,
          enrollmentId: enrollment.id,
          billingPeriodStart: billingPeriod.startsAt,
          billingPeriodEnd: billingPeriod.endsAt,
          dueAt: reservedUntil,
          amountMinor: group.monthlyFeeMinor,
          currencyCode: group.currencyCode,
          status: "due",
          seatHoldUntil: reservedUntil,
        })
        .onConflictDoNothing();

      await tx
        .update(waitlistEntries)
        .set({ offeredUntil: null, status: "accepted" })
        .where(
          and(
            eq(waitlistEntries.organizationId, context.organization.id),
            eq(waitlistEntries.groupId, group.id),
            eq(waitlistEntries.studentProfileId, context.student.id),
            inArray(waitlistEntries.status, activeWaitlistStatuses),
          ),
        );

      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "booking.reserved",
        entityType: "group_enrollment",
        entityId: enrollment.id,
        metadata: { reservedUntil: reservedUntil.toISOString() },
      });

      return { kind: "reserved", expiresAt: reservedUntil };
    }

    const [existingWaitlistEntry] = await tx
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.organizationId, context.organization.id),
          eq(waitlistEntries.groupId, group.id),
          eq(waitlistEntries.studentProfileId, context.student.id),
          inArray(waitlistEntries.status, activeWaitlistStatuses),
        ),
      )
      .limit(1);

    if (existingWaitlistEntry) return { kind: "already_waitlisted" };

    const [entry] = await tx
      .insert(waitlistEntries)
      .values({
        organizationId: context.organization.id,
        groupId: group.id,
        studentProfileId: context.student.id,
        status: "waiting",
      })
      .onConflictDoNothing()
      .returning({ id: waitlistEntries.id });

    if (!entry) return { kind: "already_waitlisted" };

    const [{ position }] = await tx
      .select({ position: count() })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.organizationId, context.organization.id),
          eq(waitlistEntries.groupId, group.id),
          eq(waitlistEntries.status, "waiting"),
        ),
      );

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "waitlist.joined",
      entityType: "waitlist_entry",
      entityId: entry.id,
      metadata: {},
    });

    return { kind: "waitlisted", position: Number(position) };
  });
}

export async function acceptCurrentStudentWaitlistOffer(
  waitlistEntryId: string,
): Promise<WaitlistOfferAcceptanceResult> {
  const context = await getCurrentStudentWorkspace();
  if (!context) throw new BookingError("Only an active student account can accept this offer.");

  const db = getDatabase();
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + SEAT_HOLD_MS);

  return db.transaction(async (tx) => {
    const [offerReference] = await tx
      .select({ groupId: waitlistEntries.groupId, id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.id, waitlistEntryId),
          eq(waitlistEntries.organizationId, context.organization.id),
          eq(waitlistEntries.studentProfileId, context.student.id),
        ),
      )
      .limit(1);

    if (!offerReference) return { kind: "expired" };

    const [group] = await tx
      .select({
        capacity: academicGroups.capacity,
        currencyCode: academicGroups.currencyCode,
        id: academicGroups.id,
        monthlyFeeMinor: academicGroups.monthlyFeeMinor,
      })
      .from(academicGroups)
      .where(
        and(
          eq(academicGroups.id, offerReference.groupId),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.status, "active"),
        ),
      )
      .for("update")
      .limit(1);

    if (!group) return { kind: "unavailable" };

    const [offer] = await tx
      .select({ id: waitlistEntries.id, offeredUntil: waitlistEntries.offeredUntil })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.id, waitlistEntryId),
          eq(waitlistEntries.organizationId, context.organization.id),
          eq(waitlistEntries.studentProfileId, context.student.id),
          eq(waitlistEntries.status, "offered"),
        ),
      )
      .for("update")
      .limit(1);

    if (!offer || !offer.offeredUntil) return { kind: "expired" };

    if (offer.offeredUntil <= now) {
      await tx
        .update(waitlistEntries)
        .set({ offeredUntil: null, status: "expired" })
        .where(eq(waitlistEntries.id, offer.id));
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "waitlist.offer_expired",
        entityType: "waitlist_entry",
        entityId: offer.id,
        metadata: { source: "student_acceptance" },
      });
      await promoteWaitingStudentsForLockedGroup(
        tx,
        { actorMembershipId: context.actorMembershipId, now, organizationId: context.organization.id },
        group,
      );
      return { kind: "expired" };
    }

    const [existingEnrollment] = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.groupId, group.id),
          eq(groupEnrollments.studentProfileId, context.student.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .limit(1);

    if (existingEnrollment) {
      await tx
        .update(waitlistEntries)
        .set({ offeredUntil: null, status: "accepted" })
        .where(eq(waitlistEntries.id, offer.id));
      return { kind: "already_enrolled" };
    }

    const seatsAvailable = await getAvailableSeatsForLockedGroup(
      tx,
      { actorMembershipId: context.actorMembershipId, now, organizationId: context.organization.id },
      group,
      offer.id,
    );

    if (!seatsAvailable) {
      await tx
        .update(waitlistEntries)
        .set({ offeredUntil: null, status: "waiting" })
        .where(eq(waitlistEntries.id, offer.id));
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "waitlist.offer_released",
        entityType: "waitlist_entry",
        entityId: offer.id,
        metadata: { reason: "capacity_no_longer_available" },
      });
      return { kind: "unavailable" };
    }

    const [enrollment] = await tx
      .insert(groupEnrollments)
      .values({
        organizationId: context.organization.id,
        groupId: group.id,
        studentProfileId: context.student.id,
        status: "pending_payment",
        reservedUntil,
      })
      .returning({ id: groupEnrollments.id });

    if (!enrollment) throw new BookingError("We could not reserve the offered seat. Please try again.");

    const billingPeriod = currentBillingPeriod(now);
    await tx
      .insert(paymentObligations)
      .values({
        organizationId: context.organization.id,
        enrollmentId: enrollment.id,
        billingPeriodStart: billingPeriod.startsAt,
        billingPeriodEnd: billingPeriod.endsAt,
        dueAt: reservedUntil,
        amountMinor: group.monthlyFeeMinor,
        currencyCode: group.currencyCode,
        status: "due",
        seatHoldUntil: reservedUntil,
      })
      .onConflictDoNothing();
    await tx
      .update(waitlistEntries)
      .set({ offeredUntil: null, status: "accepted" })
      .where(eq(waitlistEntries.id, offer.id));
    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "waitlist.offer_accepted",
      entityType: "waitlist_entry",
      entityId: offer.id,
      metadata: { reservedUntil: reservedUntil.toISOString() },
    });

    return { expiresAt: reservedUntil, kind: "reserved" };
  });
}
