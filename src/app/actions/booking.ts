"use server";

import { revalidatePath } from "next/cache";

import { initialBookingActionState, type BookingActionState } from "@/lib/workspace/booking-state";
import { acceptCurrentStudentWaitlistOffer, BookingError, bookCurrentStudentIntoGroup } from "@/lib/workspace/booking";
import { z } from "zod";

const groupIdSchema = z.object({ groupId: z.string().uuid() });
const waitlistEntryIdSchema = z.object({ waitlistEntryId: z.string().uuid() });

export async function bookGroupAction(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = groupIdSchema.safeParse({ groupId: formData.get("groupId") });
  if (!parsed.success) return { ...initialBookingActionState, status: "error", message: "That group is no longer available." };

  let result;
  try {
    result = await bookCurrentStudentIntoGroup(parsed.data.groupId);
  } catch (error) {
    if (error instanceof BookingError) {
      return { ...initialBookingActionState, status: "error", message: error.message };
    }

    throw error;
  }

  revalidatePath("/app/student");

  if (result.kind === "reserved") {
    return {
      status: "reserved",
      message: `Seat held until ${result.expiresAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Complete payment to keep it.`,
    };
  }

  if (result.kind === "waitlisted") {
    return { status: "waitlisted", message: `You joined the waiting list at position ${result.position}.` };
  }

  if (result.kind === "already_enrolled") {
    return { status: "already", message: "You already have a seat in this group." };
  }

  if (result.kind === "already_waitlisted") {
    return { status: "already", message: "You are already on this waiting list." };
  }

  return { ...initialBookingActionState, status: "error", message: "That group is no longer available." };
}

export async function acceptWaitlistOfferAction(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = waitlistEntryIdSchema.safeParse({ waitlistEntryId: formData.get("waitlistEntryId") });
  if (!parsed.success) return { ...initialBookingActionState, status: "error", message: "That offer is no longer available." };

  let result;
  try {
    result = await acceptCurrentStudentWaitlistOffer(parsed.data.waitlistEntryId);
  } catch (error) {
    if (error instanceof BookingError) {
      return { ...initialBookingActionState, status: "error", message: error.message };
    }

    throw error;
  }

  revalidatePath("/app/student");
  revalidatePath("/app/student/payments");

  if (result.kind === "reserved") {
    return {
      status: "reserved",
      message: `Seat held until ${result.expiresAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Complete payment to keep it.`,
    };
  }
  if (result.kind === "already_enrolled") {
    return { status: "already", message: "You already have a seat in this group." };
  }
  if (result.kind === "expired") {
    return { ...initialBookingActionState, status: "error", message: "This offer has expired." };
  }

  return { ...initialBookingActionState, status: "error", message: "The offered seat is no longer available." };
}
