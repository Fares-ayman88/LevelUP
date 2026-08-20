"use client";

import { CheckCircle2, Clock3, LoaderCircle, UsersRound } from "lucide-react";
import { useActionState } from "react";

import { bookGroupAction } from "@/app/actions/booking";
import { initialBookingActionState } from "@/lib/workspace/booking-state";

export function BookGroupButton({ groupId, isEnrolled, seatsLeft }: { groupId: string; isEnrolled: boolean; seatsLeft: number }) {
  const [state, action, pending] = useActionState(bookGroupAction, initialBookingActionState);

  if (isEnrolled || state.status === "already") {
    return (
      <div className="space-y-2">
        <span className="inline-flex h-11 items-center gap-2 border border-emerald-300/25 bg-emerald-300/10 px-4 text-sm font-semibold text-emerald-200">
          <CheckCircle2 aria-hidden="true" size={17} />
          In your schedule
        </span>
        {state.message && <p className="text-xs leading-5 text-slate-400">{state.message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form action={action}>
        <input name="groupId" type="hidden" value={groupId} />
        <button
          className="inline-flex h-11 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || state.status === "reserved" || state.status === "waitlisted"}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : seatsLeft > 0 ? <Clock3 aria-hidden="true" size={17} /> : <UsersRound aria-hidden="true" size={17} />}
          {pending ? "Saving" : seatsLeft > 0 ? "Hold seat" : "Join waiting list"}
        </button>
      </form>
      {state.message && (
        <p className={state.status === "error" ? "text-xs leading-5 text-rose-300" : "text-xs leading-5 text-slate-400"} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
