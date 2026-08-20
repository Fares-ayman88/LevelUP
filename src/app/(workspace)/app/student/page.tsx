import Link from "next/link";
import { BarChart3, CalendarDays, Clock3, CreditCard, GraduationCap, LogOut, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { AcceptWaitlistOfferButton } from "@/components/student/accept-waitlist-offer-button";
import { BookGroupButton } from "@/components/student/book-group-button";
import { TeacherAvatar } from "@/components/teacher/teacher-avatar";
import { getCurrentStudentWorkspace, getStudentDiscovery, getStudentWaitlistOffers, type DiscoverySchedule } from "@/lib/workspace/student";

export const metadata = {
  title: "Find a group | LevelUp",
};

const weekdayLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatTime(value: string): string {
  const [hoursText, minutes = "00"] = value.slice(0, 5).split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${minutes} ${suffix}`;
}

function formatSchedule(schedules: DiscoverySchedule[]): string {
  if (!schedules.length) return "Schedule to be confirmed";

  return schedules
    .map((schedule) => `${weekdayLabels[schedule.weekday] ?? "Day"} ${formatTime(schedule.startsAt)}${schedule.roomLabel ? ` · ${schedule.roomLabel}` : ""}`)
    .join(" / ");
}

function formatOfferExpiry(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

export default async function StudentDiscoveryPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ availability?: string | string[]; q?: string | string[]; subject?: string | string[] }> }>) {
  const context = await getCurrentStudentWorkspace();
  if (!context) notFound();

  const params = await searchParams;
  const filters = {
    availability: firstValue(params.availability) === "open" ? ("open" as const) : ("all" as const),
    query: firstValue(params.q),
    subject: firstValue(params.subject),
  };
  const [{ groups, subjects }, waitlistOffers] = await Promise.all([
    getStudentDiscovery(context, filters),
    getStudentWaitlistOffers(context),
  ]);

  return (
    <main className="min-h-screen bg-[#07090d] px-4 py-4 text-white sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="flex flex-col gap-3 border border-white/10 bg-white/[0.025] p-3 backdrop-blur-xl xl:flex-row xl:items-center">
          <div className="flex shrink-0 items-center gap-3 px-1">
            <span className="grid h-10 w-10 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">LevelUp</p>
              <p className="truncate text-xs text-slate-500">{context.organization.name}</p>
            </div>
          </div>

          <form action="/app/student" className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_145px_auto]">
            <label className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9db2ff]" size={17} />
              <span className="sr-only">Search teacher or subject</span>
              <input className="h-10 w-full border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" defaultValue={filters.query} name="q" placeholder="Search teacher or subject" />
            </label>
            <label className="relative block">
              <span className="sr-only">Subject</span>
              <select className="h-10 w-full appearance-none border border-white/10 bg-black/20 px-3 pr-9 text-sm text-slate-200 outline-none focus:border-[#9db2ff]/60" defaultValue={filters.subject} name="subject">
                <option value="">All subjects</option>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            </label>
            <label className="block">
              <span className="sr-only">Availability</span>
              <select className="h-10 w-full appearance-none border border-white/10 bg-black/20 px-3 text-sm text-slate-200 outline-none focus:border-[#9db2ff]/60" defaultValue={filters.availability} name="availability">
                <option value="all">Any availability</option>
                <option value="open">Seats available</option>
              </select>
            </label>
            <button className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff]" type="submit">
              <Search aria-hidden="true" size={16} />
              Search
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 px-1 xl:justify-end">
            <span className="text-xs text-slate-500">{context.student.fullName}</span>
            <Link aria-label="Open schedule" className="grid h-10 w-10 place-items-center border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white" href="/app/student/schedule">
              <CalendarDays aria-hidden="true" size={17} />
            </Link>
            <Link aria-label="Open progress" className="grid h-10 w-10 place-items-center border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white" href="/app/student/progress">
              <BarChart3 aria-hidden="true" size={17} />
            </Link>
            <Link aria-label="Open payments" className="grid h-10 w-10 place-items-center border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white" href="/app/student/payments">
              <CreditCard aria-hidden="true" size={17} />
            </Link>
            <form action={signOutAction}>
              <button aria-label="Sign out" className="grid h-10 w-10 place-items-center border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white" type="submit">
                <LogOut aria-hidden="true" size={17} />
              </button>
            </form>
          </div>
        </header>

        {waitlistOffers.length > 0 && (
          <section aria-labelledby="waitlist-offers-heading" className="mt-6 border border-[#9db2ff]/30 bg-[#9db2ff]/[0.07]">
            <div className="flex flex-col gap-2 border-b border-[#9db2ff]/20 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b9c6ff]">Waiting list</p>
                <h2 className="mt-1 text-lg font-semibold" id="waitlist-offers-heading">A seat is ready for you.</h2>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300"><Clock3 aria-hidden="true" size={15} />Accept before the offer expires</span>
            </div>
            <div className="divide-y divide-[#9db2ff]/15">
              {waitlistOffers.map((offer) => (
                <article className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between" key={offer.id}>
                  <div>
                    <p className="text-sm font-semibold text-[#b9c6ff]">{offer.subjectName}</p>
                    <p className="mt-1 text-lg font-semibold">{offer.groupName}</p>
                    <p className="mt-1 text-sm text-slate-400">{offer.teacherName} - expires {formatOfferExpiry(offer.expiresAt)}</p>
                  </div>
                  <AcceptWaitlistOfferButton waitlistEntryId={offer.id} />
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col justify-between gap-5 py-10 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">{context.student.gradeLevel}</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Choose the group that fits your week.</h1>
          </div>
          <p className="text-sm text-slate-400">{groups.length} matching group{groups.length === 1 ? "" : "s"}</p>
        </section>

        {groups.length ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <article className="flex min-h-[300px] flex-col border border-white/10 bg-white/[0.025] p-5" key={group.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <TeacherAvatar displayName={group.teacher.displayName} profilePhotoKey={group.teacher.profilePhotoKey} teacherProfileId={group.teacher.id} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{group.teacher.displayName}</p>
                      <p className="mt-1 truncate text-sm text-slate-400">{group.subjectName}</p>
                    </div>
                  </div>
                  <span className={group.seatsLeft > 0 ? "shrink-0 text-xs font-semibold text-emerald-300" : "shrink-0 text-xs font-semibold text-amber-200"}>
                    {group.seatsLeft > 0 ? `${group.seatsLeft} seats left` : "Full"}
                  </span>
                </div>

                <div className="mt-6 border-y border-white/8 py-4">
                  <p className="text-lg font-semibold">{group.name}</p>
                  <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-400"><CalendarDays aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={16} />{formatSchedule(group.schedules)}</p>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Monthly fee</p>
                    <p className="mt-1 text-xl font-semibold">{new Intl.NumberFormat("en-EG").format(group.monthlyFeeMinor / 100)} {group.currencyCode}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><UsersRound aria-hidden="true" size={15} />{group.capacity} capacity</span>
                </div>

                <div className="mt-auto pt-5">
                  <BookGroupButton groupId={group.id} isEnrolled={group.isEnrolled} seatsLeft={group.seatsLeft} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="border-y border-white/10 py-14 text-center">
            <h2 className="text-xl font-semibold">No groups match these filters.</h2>
            <p className="mt-2 text-sm text-slate-400">Try another subject or include groups without open seats.</p>
            <Link className="mt-5 inline-flex h-10 items-center border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" href="/app/student">
              Clear filters
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
