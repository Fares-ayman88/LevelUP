"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import { savePaymentChannelAction } from "@/app/actions/payment-channels";
import {
  paymentChannelKindLabels,
  type PaymentChannelKind,
} from "@/lib/payments/payment-channel-rules";
import { initialPaymentChannelActionState } from "@/lib/workspace/payment-channel-state";

type PaymentChannelSettings = {
  accountHolder: string | null;
  accountIdentifier: string | null;
  instructions: string | null;
  isActive: boolean;
  kind: PaymentChannelKind;
  label: string;
};

export function PaymentChannelSettingsForm({
  channel,
  kind,
}: {
  channel?: PaymentChannelSettings;
  kind: PaymentChannelKind;
}) {
  const [state, action, pending] = useActionState(savePaymentChannelAction, initialPaymentChannelActionState);
  const prefix = `payment-channel-${kind}`;
  const isCash = kind === "cash";

  return (
    <form action={action} className="space-y-4">
      <input name="kind" type="hidden" value={kind} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{paymentChannelKindLabels[kind]}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {isCash ? "Tell families exactly where they can pay at the center." : "Show this route to families when they renew online."}
          </p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-300" htmlFor={`${prefix}-active`}>
          <input
            className="h-4 w-4 accent-[#9db2ff]"
            defaultChecked={channel?.isActive ?? false}
            disabled={pending}
            id={`${prefix}-active`}
            name="isActive"
            type="checkbox"
          />
          Active
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor={`${prefix}-label`}>Display name</label>
          <input
            className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
            defaultValue={channel?.label ?? paymentChannelKindLabels[kind]}
            disabled={pending}
            id={`${prefix}-label`}
            maxLength={100}
            name="label"
            required
            type="text"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor={`${prefix}-identifier`}>
            {isCash ? "Cash desk or location" : "Wallet, account, or bank detail"}
          </label>
          <input
            className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
            defaultValue={channel?.accountIdentifier ?? ""}
            disabled={pending}
            id={`${prefix}-identifier`}
            maxLength={160}
            name="accountIdentifier"
            placeholder={isCash ? "For example: Main reception" : "For example: 0100 000 0000"}
            type="text"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor={`${prefix}-holder`}>Account holder</label>
        <input
          className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
          defaultValue={channel?.accountHolder ?? ""}
          disabled={pending}
          id={`${prefix}-holder`}
          maxLength={160}
          name="accountHolder"
          placeholder={isCash ? "Optional" : "For example: Wael Barakat"}
          type="text"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor={`${prefix}-instructions`}>Instructions for families</label>
        <textarea
          className="mt-2 min-h-24 w-full resize-y border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60"
          defaultValue={channel?.instructions ?? ""}
          disabled={pending}
          id={`${prefix}-instructions`}
          maxLength={400}
          name="instructions"
          placeholder={isCash ? "For example: Ask reception for a stamped receipt." : "For example: Use the student's full name in the transfer note."}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <p className={state.status === "error" ? "text-xs text-rose-300" : "text-xs text-emerald-300"} role={state.status === "error" ? "alert" : "status"}>
          {state.status !== "idle" ? state.message : ""}
        </p>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : state.status === "success" ? <Check aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {pending ? "Saving" : "Save method"}
        </button>
      </div>
    </form>
  );
}
