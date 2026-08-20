import Link from "next/link";
import { BookOpenCheck, CalendarDays, Clock3, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { getCenterAdminGroupsOverview } from "@/lib/workspace/admin-groups";
import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";

export const metadata = {
  title: "Group Management | LevelUp",
};

const weekdayLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function formatTime(value: string): string {
  const [hoursText, minutes = "00"] = value.slice(0, 5).split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

export default async function AdminGroupsPage() {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) notFound();

  const overview = await getCenterAdminGroupsOverview(context);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Page Header */}
      <section className="flex flex-col justify-between gap-5 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Academic Management</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Center Groups & Schedules</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Monitor capacity, live student enrollments, teacher assignments, and weekly class times.
          </p>
        </div>
      </section>

      {/* Summary KPI Bar */}
      <section aria-label="Groups summary" className="grid border-y border-white/10 sm:grid-cols-3">
        <div className="border-b border-white/8 p-5 sm:border-r sm:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active Groups</p>
          <p className="mt-2 text-2xl font-semibold text-white">{overview.activeGroupsCount}</p>
        </div>
        <div className="border-b border-white/8 p-5 sm:border-r sm:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Enrolled Students</p>
          <p className="mt-2 text-2xl font-semibold text-white">{overview.totalEnrolled}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Capacity</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {overview.totalEnrolled} / {overview.totalCapacity}{" "}
            <span className="text-xs font-medium text-slate-400">
              ({overview.totalCapacity > 0 ? Math.round((overview.totalEnrolled / overview.totalCapacity) * 100) : 0}% utilization)
            </span>
          </p>
        </div>
      </section>

      {/* Groups Grid */}
      {overview.groups.length ? (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.groups.map((group) => (
            <article className="flex flex-col border border-white/10 bg-white/[0.025] p-5" key={group.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9c6ff]">{group.subjectName}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{group.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">Teacher: {group.teacherDisplayName}</p>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold border",
                    group.status === "active"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : group.status === "paused"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-slate-500/15 text-slate-400 border-slate-500/30",
                  ].join(" ")}
                >
                  {group.status}
                </span>
              </div>

              {/* Schedules */}
              <div className="mt-5 border-y border-white/8 py-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Weekly Schedule</p>
                {group.schedules.length ? (
                  group.schedules.map((sch) => (
                    <p className="flex items-center gap-2 text-sm text-slate-300" key={sch.id}>
                      <CalendarDays aria-hidden="true" className="text-[#9db2ff]" size={15} />
                      {weekdayLabels[sch.weekday] ?? "Day"} {formatTime(sch.startsAt)} - {formatTime(sch.endsAt)}
                      {sch.roomLabel && <span className="text-xs text-slate-500">({sch.roomLabel})</span>}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No recurring schedules configured.</p>
                )}
              </div>

              {/* Foot Stats */}
              <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                  <UsersRound aria-hidden="true" size={15} />
                  {group.enrolledCount} / {group.capacity} enrolled
                </span>
                <span className="font-semibold text-[#b9c6ff]">
                  {new Intl.NumberFormat("en-EG").format(group.monthlyFeeMinor / 100)} {group.currencyCode}/mo
                </span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-16 text-center">
          <BookOpenCheck aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No academic groups created yet.</h2>
          <p className="mt-2 text-sm text-slate-400">Create your first group to start enrolling students.</p>
        </section>
      )}
    </div>
  );
}
