export type BookingActionState = {
  message?: string;
  status: "idle" | "reserved" | "waitlisted" | "error" | "already";
};

export const initialBookingActionState: BookingActionState = { status: "idle" };
