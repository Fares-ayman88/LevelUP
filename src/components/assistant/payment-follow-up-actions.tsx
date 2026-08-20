"use client";

import { BadgeCheck, Banknote, Clock3, LoaderCircle, LockKeyhole, Trash2, XCircle } from "lucide-react";
import { useActionState } from "react";

import {
  confirmManualTransferAction,
  extendPaymentSeatHoldAction,
  recordCashPaymentAction,
  rejectManualTransferAction,
  releaseUnpaidSeatAction,
} from "@/app/actions/payment-operations";
import { initialPaymentActionState } from "@/lib/workspace/payment-action-state";

function defaultHoldUntil(): string {
  const target = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return new Date(target.getTime() - target.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function PaymentFollowUpActions({
  obligationId,
  pendingTransferChannelLabel,
  pendingTransferReference,
}: {
  obligationId: string;
  pendingTransferChannelLabel: string | null;
  pendingTransferReference: string | null;
}) {
  const [cashState, cashAction, cashPending] = useActionState(recordCashPaymentAction, initialPaymentActionState);
  const [holdState, holdAction, holdPending] = useActionState(extendPaymentSeatHoldAction, initialPaymentActionState);
  const [releaseState, releaseAction, releasePending] = useActionState(releaseUnpaidSeatAction, initialPaymentActionState);
  const [transferState, transferAction, transferPending] = useActionState(confirmManualTransferAction, initialPaymentActionState);
  const [rejectionState, rejectionAction, rejectionPending] = useActionState(rejectManualTransferAction, initialPaymentActionState);
  const latestState = rejectionState.status !== "idle"
    ? rejectionState
    : transferState.status !== "idle"
      ? transferState
      : releaseState.status !== "idle"
        ? releaseState
        : holdState.status !== "idle"
          ? holdState
          : cashState;

  if (pendingTransferReference) {
    return (
      <div className="w-full space-y-3 lg:w-auto lg:min-w-[260px]">
        <form action={transferAction}>
          <input name="obligationId" type="hidden" value={obligationId} />
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={transferPending || rejectionPending}
            type="submit"
          >
            {transferPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <BadgeCheck aria-hidden="true" size={16} />}
            {transferPending ? "Saving" : "Confirm transfer"}
          </button>
        </form>
        <details className="border border-rose-300/15 bg-rose-300/[0.035]">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-rose-200 marker:hidden">
            <XCircle aria-hidden="true" size={16} />
            Reject transfer
          </summary>
          <form action={rejectionAction} className="space-y-3 border-t border-rose-300/10 p-3">
            <input name="obligationId" type="hidden" value={obligationId} />
            <label className="block text-xs font-medium text-slate-400" htmlFor={`reject-reason-${obligationId}`}>
              Rejection reason
            </label>
            <input
              className="h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-300/60"
              id={`reject-reason-${obligationId}`}
              maxLength={240}
              minLength={3}
              name="reason"
              placeholder="For example: reference could not be matched"
              required
              type="text"
            />
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 border border-rose-300/30 px-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300/70 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={transferPending || rejectionPending}
              type="submit"
            >
              {rejectionPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <XCircle aria-hidden="true" size={16} />}
              {rejectionPending ? "Saving" : "Reject transfer"}
            </button>
          </form>
        </details>
        <p className="text-xs leading-5 text-slate-400">
          {pendingTransferChannelLabel ? `${pendingTransferChannelLabel} - ` : ""}Reference: {pendingTransferReference}
        </p>
        {latestState.message && (
          <p className={latestState.status === "error" ? "text-xs leading-5 text-rose-300" : "text-xs leading-5 text-emerald-300"} role={latestState.status === "error" ? "alert" : "status"}>
            {latestState.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 lg:w-auto lg:min-w-[260px]">
      <form action={cashAction}>
        <input name="obligationId" type="hidden" value={obligationId} />
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={cashPending || holdPending || releasePending}
          type="submit"
        >
          {cashPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Banknote aria-hidden="true" size={16} />}
          {cashPending ? "Saving" : "Confirm cash"}
        </button>
      </form>

      <details className="border border-white/10 bg-black/20">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-slate-200 marker:hidden">
          <LockKeyhole aria-hidden="true" className="text-[#9db2ff]" size={16} />
          Keep seat reserved
        </summary>
        <form action={holdAction} className="space-y-3 border-t border-white/8 p-3">
          <input name="obligationId" type="hidden" value={obligationId} />
          <label className="block text-xs font-medium text-slate-400" htmlFor={`hold-until-${obligationId}`}>
            Hold until
          </label>
          <input
            className="h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60"
            defaultValue={defaultHoldUntil()}
            id={`hold-until-${obligationId}`}
            name="expiresAt"
            required
            type="datetime-local"
          />
          <label className="block text-xs font-medium text-slate-400" htmlFor={`hold-reason-${obligationId}`}>
            Reason
          </label>
          <input
            className="h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
            id={`hold-reason-${obligationId}`}
            maxLength={240}
            minLength={3}
            name="reason"
            placeholder="For example: parent will pay on Thursday"
            required
            type="text"
          />
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 border border-[#9db2ff]/35 px-3 text-sm font-semibold text-[#b9c6ff] transition hover:border-[#9db2ff]/70 hover:bg-[#9db2ff]/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cashPending || holdPending || releasePending}
            type="submit"
          >
            {holdPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Clock3 aria-hidden="true" size={16} />}
            {holdPending ? "Saving" : "Extend hold"}
          </button>
        </form>
      </details>

      <details className="border border-rose-300/15 bg-rose-300/[0.035]">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-rose-200 marker:hidden">
          <Trash2 aria-hidden="true" size={16} />
          Release seat
        </summary>
        <form
          action={releaseAction}
          className="space-y-3 border-t border-rose-300/10 p-3"
          onSubmit={(event) => {
            if (!window.confirm("Release this seat and void the unpaid payment?")) event.preventDefault();
          }}
        >
          <input name="obligationId" type="hidden" value={obligationId} />
          <label className="block text-xs font-medium text-slate-400" htmlFor={`release-reason-${obligationId}`}>
            Reason
          </label>
          <input
            className="h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-300/60"
            id={`release-reason-${obligationId}`}
            maxLength={240}
            minLength={3}
            name="reason"
            placeholder="For example: payment deadline passed"
            required
            type="text"
          />
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 border border-rose-300/30 px-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300/70 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cashPending || holdPending || releasePending}
            type="submit"
          >
            {releasePending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
            {releasePending ? "Saving" : "Release seat"}
          </button>
        </form>
      </details>

      {latestState.message && (
        <p className={latestState.status === "error" ? "text-xs leading-5 text-rose-300" : "text-xs leading-5 text-emerald-300"} role={latestState.status === "error" ? "alert" : "status"}>
          {latestState.message}
        </p>
      )}
    </div>
  );
}
