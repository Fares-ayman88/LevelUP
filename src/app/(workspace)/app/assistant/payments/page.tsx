import { Building2, CalendarClock, CircleAlert, CreditCard, Settings2, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentFollowUpActions } from "@/components/assistant/payment-follow-up-actions";
import { getCurrentPaymentOperationsContext, getPaymentFollowUpQueue } from "@/lib/workspace/payment-operations";

export const metadata = {
  title: "Payment follow-up | LevelUp",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

export default async function PaymentFollowUpPage() {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) notFound();

  const items = await getPaymentFollowUpQueue(context);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Payment follow-up</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Keep every seat decision clear.</h1>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-slate-400"><CircleAlert aria-hidden="true" size={17} />{items.length} decision{items.length === 1 ? "" : "s"} waiting</span>
      </section>

      {items.length ? (
        <section className="border-y border-white/10">
          {items.map((item) => (
            <article className="grid gap-6 border-b border-white/8 py-6 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start" key={item.id}>
              <div className="min-w-0">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{item.studentName}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.subjectName} - {item.groupName}</p>
                  </div>
                  <span className={item.taskStatus === "in_progress" ? "text-xs font-semibold text-[#b9c6ff]" : "text-xs font-semibold text-amber-200"}>
                    {item.taskStatus === "in_progress" ? "Held by staff" : "Needs a decision"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="border-l-2 border-[#9db2ff]/40 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Amount</p>
                    <p className="mt-1 text-lg font-semibold">{new Intl.NumberFormat("en-EG").format(item.amountMinor / 100)} {item.currencyCode}</p>
                  </div>
                  <div className="border-l-2 border-white/10 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Due</p>
                    <p className="mt-1 text-sm font-medium text-slate-300">{formatDateTime(item.dueAt)}</p>
                  </div>
                  <div className="border-l-2 border-white/10 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Seat status</p>
                    <p className="mt-1 text-sm font-medium text-slate-300">{item.enrollmentStatus === "payment_follow_up" ? "Held for review" : "Active"}</p>
                  </div>
                </div>

                {item.seatHoldUntil && (
                  <p className="mt-5 flex items-center gap-2 text-sm text-[#b9c6ff]"><UserRoundCheck aria-hidden="true" size={16} />Seat hold ends {formatDateTime(item.seatHoldUntil)}</p>
                )}
                {item.holdNote && <p className="mt-2 text-sm leading-6 text-slate-400">{item.holdNote}</p>}
              </div>
              <PaymentFollowUpActions
                obligationId={item.id}
                pendingTransferChannelLabel={item.pendingTransferChannelLabel}
                pendingTransferReference={item.pendingTransferReference}
              />
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-16 text-center">
          <CreditCard aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No unpaid seats need a decision.</h2>
          <p className="mt-2 text-sm text-slate-400">Cash confirmations, holds, and releases will appear here when they need review.</p>
        </section>
      )}
    </div>
  );
}
