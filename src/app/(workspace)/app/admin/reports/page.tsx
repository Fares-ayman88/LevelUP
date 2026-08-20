import { BarChart3, CheckCircle2, Clock3, CreditCard, PieChart, TrendingUp, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";
import { getCenterReportsData } from "@/lib/reports/reporting-service";

export const metadata = {
  title: "Reports & Analytics | LevelUp",
};

export default async function AdminReportsPage() {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) notFound();

  const reports = await getCenterReportsData(context);

  const formatMoney = (minor: number) =>
    `${new Intl.NumberFormat("en-EG").format(minor / 100)} ${reports.financials.currencyCode}`;

  const att = reports.attendanceStats;
  const presentPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
  const latePct = att.total > 0 ? Math.round((att.late / att.total) * 100) : 0;
  const absentPct = att.total > 0 ? Math.round((att.absent / att.total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Page Header */}
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Executive Insights</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Reports & Center Analytics</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Real-time financial status, attendance compliance, and group utilization rates across all classes.
          </p>
        </div>
      </section>

      {/* Financials Section */}
      <section className="mb-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CreditCard className="text-[#9db2ff]" size={18} />
          Financial Breakdown
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Collected Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatMoney(reports.financials.collectedMinor)}</p>
            <p className="mt-1 text-xs text-slate-400">Confirmed transfer & cash payments</p>
          </div>
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unpaid / Due Obligations</p>
            <p className="mt-2 text-2xl font-semibold text-amber-200">{formatMoney(reports.financials.unpaidMinor)}</p>
            <p className="mt-1 text-xs text-slate-400">{reports.financials.overdueCount} overdue, {reports.financials.pendingReviewCount} under review</p>
          </div>
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Decisions Pending</p>
            <p className="mt-2 text-2xl font-semibold text-[#b9c6ff]">{reports.financials.pendingReviewCount}</p>
            <p className="mt-1 text-xs text-slate-400">Transfers waiting staff review</p>
          </div>
        </div>
      </section>

      {/* Attendance & Groups Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Breakdown */}
        <section className="border border-white/10 bg-white/[0.025] p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <PieChart className="text-[#9db2ff]" size={18} />
            Attendance Compliance
          </h2>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-300">Present ({att.present})</span>
                <span className="text-slate-400">{presentPct}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${presentPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-300">Late ({att.late})</span>
                <span className="text-slate-400">{latePct}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 overflow-hidden">
                <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${latePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-300">Absent ({att.absent})</span>
                <span className="text-slate-400">{absentPct}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 overflow-hidden">
                <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${absentPct}%` }} />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-3 border-t border-white/8">
            Total recorded attendance instances: <span className="font-semibold text-slate-300">{att.total}</span>
          </p>
        </section>

        {/* Group Capacity Utilization */}
        <section className="border border-white/10 bg-white/[0.025] p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingUp className="text-[#9db2ff]" size={18} />
            Group Utilization
          </h2>

          <div className="divide-y divide-white/8 max-h-[320px] overflow-y-auto pr-1">
            {reports.groupPerformance.map((gp) => (
              <div className="py-3 flex items-center justify-between gap-4" key={gp.groupId}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{gp.groupName}</p>
                  <p className="truncate text-xs text-slate-400">{gp.subjectName}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-[#b9c6ff]">{gp.utilizationPercent}%</span>
                  <p className="text-xs text-slate-500">{gp.enrolledCount} / {gp.capacity} seats</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
