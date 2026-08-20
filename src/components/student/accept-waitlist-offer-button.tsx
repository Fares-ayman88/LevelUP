"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, TicketCheck } from "lucide-react";
import { useActionState } from "react";

import { acceptWaitlistOfferAction } from "@/app/actions/booking";
import { initialBookingActionState } from "@/lib/workspace/booking-state";

export function AcceptWaitlistOfferButton({ waitlistEntryId }: { waitlistEntryId: string }) {
  const [state, action, pending] = useActionState(acceptWaitlistOfferAction, initialBookingActionState);

  if (state.status === "reserved") {
    return (
      <div className="space-y-2">
        <Link className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff]" href="/app/student/payments">
          Complete payment
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <p className="text-xs leading-5 text-slate-300" role="status">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form action={action}>
        <input name="waitlistEntryId" type="hidden" value={waitlistEntryId} />
        <button
          className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <TicketCheck aria-hidden="true" size={16} />}
          {pending ? "Reserving" : "Accept seat"}
        </button>
      </form>
      {state.message && (
        <p className={state.status === "error" ? "text-xs leading-5 text-rose-300" : "text-xs leading-5 text-slate-300"} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
