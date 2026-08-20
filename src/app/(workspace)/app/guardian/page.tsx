import { Building2, CalendarDays, CreditCard, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitManualTransferForm } from "@/components/payments/submit-manual-transfer-form";
import {
  getCurrentGuardianWorkspace,
  getGuardianStudentSummaries,
  type GuardianGroupSummary,
} from "@/lib/workspace/guardian";
import { getAvailablePayerPaymentChannels, getCurrentPayerWorkspace } from "@/lib/workspace/payer-payments";
import type { DiscoverySchedule } from "@/lib/workspace/student";

export const metadata = {
  title: "Family overview | LevelUp",
};

const weekdayLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function formatTime(value: string): string {
  const [hoursText, minutes = "00"] = value.slice(0, 5).split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

function formatSchedule(schedules: DiscoverySchedule[]): string {
  if (!schedules.length) return "Schedule to be confirmed";

  return schedules
    .map((schedule) => `${weekdayLabels[schedule.weekday] ?? "Day"} ${formatTime(schedule.startsAt)}${schedule.roomLabel ? ` - ${schedule.roomLabel}` : ""}`)
    .join(" / ");
}

function paymentLabel(group: GuardianGroupSummary): string {
  if (!group.payment) return "No payment due";
  if (group.payment.status === "overdue") return "Payment overdue";
  if (group.payment.status === "due") return "Payment due";
  if (group.payment.status === "awaiting_review") return "Payment under review";
  if (group.payment.status === "paid") return "Payment confirmed";
  if (group.payment.status === "waived") return "Payment waived";
  return "No payment due";
}

function paymentTone(group: GuardianGroupSummary): string {
  if (!group.payment || group.payment.status === "paid" || group.payment.status === "waived") return "text-emerald-300";
  if (group.payment.status === "overdue") return "text-rose-300";
  if (group.payment.status === "awaiting_review") return "text-[#b9c6ff]";
  return "text-amber-200";
}

export default async function GuardianWorkspacePage() {
  const context = await getCurrentGuardianWorkspace();
  const payerContext = await getCurrentPayerWorkspace();
  if (!context || !payerContext) notFound();

  const [students, paymentChannels] = await Promise.all([
    getGuardianStudentSummaries(context),
    getAvailablePayerPaymentChannels(payerContext),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Family overview</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Your children, clearly in view.</h1>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-slate-400"><UsersRound aria-hidden="true" size={17} />{students.length} linked student{students.length === 1 ? "" : "s"}</span>
      </section>

      {students.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {students.map((student) => (
            <article className="border border-white/10 bg-white/[0.025] p-5" key={student.id}>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
                <div>
                  <p className="text-lg font-semibold">{student.fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{student.gradeLevel}</p>
                </div>
                <span className="text-xs font-semibold text-[#b9c6ff]">{student.groups.length} active group{student.groups.length === 1 ? "" : "s"}</span>
              </div>

              {student.groups.length ? (
                <div className="divide-y divide-white/8">
                  {student.groups.map((group) => (
                    <section className="py-5 first:pt-5 last:pb-0" key={group.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#b9c6ff]">{group.subjectName}</p>
                          <p className="mt-1 text-base font-semibold">{group.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{group.teacherName}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold ${paymentTone(group)}`}>{paymentLabel(group)}</span>
                      </div>

                      <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-400">
                        <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={16} />
                        {formatSchedule(group.schedules)}
                      </p>

                      {group.payment && group.payment.status !== "void" && (
                        <>
                          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                            <CreditCard aria-hidden="true" className="text-[#9db2ff]" size={16} />
                            {new Intl.NumberFormat("en-EG").format(group.payment.amountMinor / 100)} {group.payment.currencyCode}
                            {group.payment.status === "due" || group.payment.status === "overdue"
                              ? ` due ${new Intl.DateTimeFormat("en-EG", { day: "numeric", month: "short" }).format(group.payment.dueAt)}`
                              : ""}
                          </p>
                          <SubmitManualTransferForm obligationId={group.payment.id} paymentChannels={paymentChannels} paymentStatus={group.payment.status} />
                        </>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-sm leading-6 text-slate-400">There is no active group for this student yet.</p>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-14 text-center">
          <h2 className="text-xl font-semibold">No students are linked to this account yet.</h2>
          <p className="mt-2 text-sm text-slate-400">Ask the center team to verify the parent relationship.</p>
        </section>
      )}
    </div>
  );
}
