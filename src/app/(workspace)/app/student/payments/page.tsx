import { CreditCard } from "lucide-react";
import { notFound } from "next/navigation";

import { SubmitManualTransferForm } from "@/components/payments/submit-manual-transfer-form";
import {
  getAvailablePayerPaymentChannels,
  getCurrentPayerWorkspace,
  getPayableObligations,
} from "@/lib/workspace/payer-payments";
import { getCurrentStudentWorkspace } from "@/lib/workspace/student";

export const metadata = {
  title: "Payments | LevelUp",
};

function formatDueDate(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function paymentStatusLabel(status: string): string {
  if (status === "awaiting_review") return "Under review";
  if (status === "overdue") return "Overdue";
  return "Due";
}

export default async function StudentPaymentsPage() {
  const studentContext = await getCurrentStudentWorkspace();
  const payerContext = await getCurrentPayerWorkspace();
  if (!studentContext || !payerContext) notFound();

  const [payments, paymentChannels] = await Promise.all([
    getPayableObligations(payerContext, [studentContext.student.id]),
    getAvailablePayerPaymentChannels(payerContext),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Monthly renewal</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Keep your seat active.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Submit the transfer reference after paying. Your center confirms the payment before the status changes.</p>
      </section>

      {payments.length ? (
        <section className="space-y-3">
          {payments.map((payment) => (
            <article className="border border-white/10 bg-white/[0.025] p-5" key={payment.id}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-[#b9c6ff]">{payment.subjectName}</p>
                  <h2 className="mt-1 text-xl font-semibold">{payment.groupName}</h2>
                </div>
                <span className={payment.status === "overdue" ? "text-sm font-semibold text-rose-300" : payment.status === "awaiting_review" ? "text-sm font-semibold text-[#b9c6ff]" : "text-sm font-semibold text-amber-200"}>{paymentStatusLabel(payment.status)}</span>
              </div>
              <div className="mt-6 grid gap-4 border-y border-white/8 py-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Amount</p>
                  <p className="mt-1 text-xl font-semibold">{new Intl.NumberFormat("en-EG").format(payment.amountMinor / 100)} {payment.currencyCode}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Due date</p>
                  <p className="mt-1 text-base font-semibold text-slate-300">{formatDueDate(payment.dueAt)}</p>
                </div>
              </div>
              <SubmitManualTransferForm obligationId={payment.id} paymentChannels={paymentChannels} paymentStatus={payment.status} />
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-16 text-center">
          <CreditCard aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">You have no payment waiting right now.</h2>
          <p className="mt-2 text-sm text-slate-400">Confirmed payments and future renewal windows stay out of your action list.</p>
        </section>
      )}
    </div>
  );
}
