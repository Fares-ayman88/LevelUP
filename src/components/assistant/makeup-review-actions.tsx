"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useActionState } from "react";

import { reviewMakeupRequestAction } from "@/app/actions/makeup-operations";
import { initialMakeupActionState } from "@/lib/workspace/makeup-state";

export function MakeupReviewActions({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(reviewMakeupRequestAction, initialMakeupActionState);

  if (state.status === "approved" || state.status === "rejected") {
    return <p className="text-sm text-slate-300" role="status">{state.message}</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input name="requestId" type="hidden" value={requestId} />
      <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        Decision note
        <input className="h-10 border border-white/10 bg-black/20 px-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" maxLength={500} name="reviewNote" placeholder="Required only when declining" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} name="intent" type="submit" value="approve">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Check aria-hidden="true" size={16} />}
          Approve
        </button>
        <button className="inline-flex h-10 items-center gap-2 border border-rose-300/30 px-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300/60 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} name="intent" type="submit" value="reject">
          <X aria-hidden="true" size={16} />
          Decline
        </button>
      </div>
      {state.message && <p className="text-xs leading-5 text-rose-300" role="alert">{state.message}</p>}
    </form>
  );
}
