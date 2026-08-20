"use client";

import { Banknote, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { submitManualTransferAction } from "@/app/actions/manual-transfer";
import {
  isTransferPaymentChannel,
  paymentChannelKindLabels,
  type PaymentChannelKind,
} from "@/lib/payments/payment-channel-rules";
import { initialManualTransferActionState } from "@/lib/workspace/manual-transfer-state";

type PayerPaymentChannel = {
  accountHolder: string | null;
  accountIdentifier: string | null;
  id: string;
  instructions: string | null;
  kind: PaymentChannelKind;
  label: string;
};

export function SubmitManualTransferForm({
  obligationId,
  paymentChannels,
  paymentStatus,
}: {
  obligationId: string;
  paymentChannels: PayerPaymentChannel[];
  paymentStatus: string;
}) {
  const [state, action, pending] = useActionState(submitManualTransferAction, initialManualTransferActionState);
  const transferChannels = useMemo(
    () => paymentChannels.filter((channel) => isTransferPaymentChannel(channel.kind)),
    [paymentChannels],
  );
  const cashChannel = useMemo(
    () => paymentChannels.find((channel) => channel.kind === "cash"),
    [paymentChannels],
  );
  const [selectedChannelId, setSelectedChannelId] = useState(transferChannels[0]?.id ?? "");
  const selectedChannel = transferChannels.find((channel) => channel.id === selectedChannelId) ?? transferChannels[0];

  if (paymentStatus !== "due" && paymentStatus !== "overdue" && paymentStatus !== "awaiting_review") {
    return null;
  }

  if (paymentStatus === "awaiting_review" || state.status === "submitted") {
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#b9c6ff]" role="status">
        <CheckCircle2 aria-hidden="true" size={16} />
        {state.message ?? "Transfer submitted. Waiting for staff review."}
      </p>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="mt-5 border-t border-white/8 pt-4 text-sm leading-6 text-slate-400">
        <p>Online payment details have not been set by this center yet.</p>
        {cashChannel && (
          <p className="mt-2 inline-flex items-start gap-2 text-slate-300">
            <Banknote aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={16} />
            Cash is accepted at {cashChannel.accountIdentifier ?? cashChannel.label}. The center will confirm it after receiving payment.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="mt-5 border-t border-white/8 pt-4">
      <input name="obligationId" type="hidden" value={obligationId} />
      <input name="paymentChannelId" type="hidden" value={selectedChannel.id} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor={`payment-channel-${obligationId}`}>Pay with</label>
          <select
            className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60"
            disabled={pending}
            id={`payment-channel-${obligationId}`}
            onChange={(event) => setSelectedChannelId(event.target.value)}
            value={selectedChannel.id}
          >
            {transferChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>{channel.label || paymentChannelKindLabels[channel.kind]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor={`transfer-reference-${obligationId}`}>Transfer reference</label>
          <input
            autoComplete="off"
            className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
            disabled={pending}
            id={`transfer-reference-${obligationId}`}
            maxLength={160}
            minLength={3}
            name="transferReference"
            placeholder="For example: 61347289"
            required
            type="text"
          />
        </div>
      </div>

      <div className="mt-4 border-l-2 border-[#9db2ff]/45 pl-3 text-sm leading-6 text-slate-300">
        <p className="font-medium text-white">{selectedChannel.accountIdentifier}</p>
        {selectedChannel.accountHolder && <p>{selectedChannel.accountHolder}</p>}
        {selectedChannel.instructions && <p className="mt-1 text-slate-400">{selectedChannel.instructions}</p>}
      </div>

      {cashChannel && (
        <p className="mt-4 inline-flex items-start gap-2 text-xs leading-5 text-slate-400">
          <Banknote aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={15} />
          Or pay cash at {cashChannel.accountIdentifier ?? cashChannel.label}; staff will confirm it for you.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Send aria-hidden="true" size={16} />}
          {pending ? "Sending" : "Submit transfer"}
        </button>
        {state.status === "error" && <p className="text-xs text-rose-300" role="alert">{state.message}</p>}
      </div>
    </form>
  );
}
