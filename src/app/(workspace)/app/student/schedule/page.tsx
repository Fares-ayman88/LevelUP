import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentStudentWorkspace } from "@/lib/workspace/student";
import { getStudentSchedule } from "@/lib/workspace/student-schedule";

export const metadata = {
  title: "My schedule | LevelUp",
};

const weekdayLabels = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "Africa/Cairo",
    weekday: "short",
  }).format(value);
}

function formatTime(value: string): string {
  const [hoursText, minutes = "00"] = value.slice(0, 5).split(":");
  const hours = Number(hoursText);
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
}

export default async function StudentSchedulePage() {
  const context = await getCurrentStudentWorkspace();
  if (!context) notFound();

  const schedule = await getStudentSchedule(context);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Your schedule</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Know exactly where you need to be.</h1>
        </div>
        <Link className="inline-flex h-10 items-center justify-center border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" href="/app/student/makeup">
          Request alternative class
        </Link>
      </section>

      <section aria-labelledby="upcoming-heading" className="border-y border-white/10">
        <div className="flex items-center gap-2 py-4">
          <CalendarDays aria-hidden="true" className="text-[#9db2ff]" size={17} />
          <h2 className="text-lg font-semibold" id="upcoming-heading">Coming up</h2>
        </div>
        {schedule.upcoming.length ? (
          <div className="divide-y divide-white/8">
            {schedule.upcoming.map((item) => (
              <article className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between" key={`${item.groupId}-${item.startsAt.toISOString()}`}>
                <div>
                  <p className="text-sm font-semibold text-[#b9c6ff]">{item.subjectName}</p>
                  <p className="mt-1 text-lg font-semibold">{item.groupName}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.teacherName}</p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold text-slate-200">{formatDateTime(item.startsAt)}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-slate-500"><MapPin aria-hidden="true" size={14} />{item.roomLabel ?? "Room to be confirmed"}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-white/8 py-10 text-sm text-slate-400">Your center has not published upcoming dated sessions yet. Your recurring plan is below.</p>
        )}
      </section>

      <section aria-labelledby="weekly-heading" className="mt-10 border-y border-white/10">
        <div className="py-4">
          <h2 className="text-lg font-semibold" id="weekly-heading">Every week</h2>
        </div>
        {schedule.weekly.length ? (
          <div className="divide-y divide-white/8">
            {schedule.weekly.map((item) => (
              <article className="grid gap-2 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center" key={`${item.groupId}-${item.weekday}-${item.startsAt}`}>
                <p className="text-sm font-semibold text-[#b9c6ff]">{weekdayLabels[item.weekday] ?? "Weekly"}</p>
                <div>
                  <p className="text-sm font-semibold">{item.subjectName} - {item.groupName}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.teacherName}{item.roomLabel ? ` - ${item.roomLabel}` : ""}</p>
                </div>
                <p className="text-sm font-semibold text-slate-300">{formatTime(item.startsAt)} - {formatTime(item.endsAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-white/8 py-10 text-sm text-slate-400">There are no recurring classes on your active enrollments.</p>
        )}
      </section>
    </div>
  );
}
