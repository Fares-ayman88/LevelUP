import { CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";

import { MakeupRequestForm } from "@/components/student/makeup-request-form";
import { getCurrentStudentWorkspace } from "@/lib/workspace/student";
import { getStudentMakeupWorkspace } from "@/lib/workspace/makeup";

export const metadata = {
  title: "Alternative class request | LevelUp",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "Africa/Cairo",
  }).format(value);
}

function statusLabel(status: string): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Declined";
  if (status === "cancelled") return "Cancelled";
  return "Waiting for review";
}

export default async function StudentMakeupPage() {
  const context = await getCurrentStudentWorkspace();
  if (!context) notFound();

  const makeup = await getStudentMakeupWorkspace(context);
  const canRequest = makeup.sourceSessions.length > 0 && makeup.targetSessions.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Alternative class</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Keep your learning moving when plans change.</h1>
      </section>

      {canRequest ? (
        <MakeupRequestForm sourceSessions={makeup.sourceSessions} targetSessions={makeup.targetSessions} />
      ) : (
        <section className="border-y border-white/10 py-12 text-center">
          <CalendarClock aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No matching alternative class is available yet.</h2>
          <p className="mt-2 text-sm text-slate-400">The center needs upcoming sessions in another group of the same subject before a request can be sent.</p>
        </section>
      )}

      <section aria-labelledby="requests-heading" className="mt-10 border-y border-white/10">
        <div className="py-4">
          <h2 className="text-lg font-semibold" id="requests-heading">Your requests</h2>
        </div>
        {makeup.requests.length ? (
          <div className="divide-y divide-white/8">
            {makeup.requests.map((request) => (
              <article className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between" key={request.id}>
                <div>
                  <p className="text-sm font-semibold">{request.targetGroupName}</p>
                  <p className="mt-1 text-sm text-slate-400">From {formatDateTime(request.sourceStartsAt)} to {formatDateTime(request.targetStartsAt)}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{request.reason}</p>
                  {request.reviewNote && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Center note: {request.reviewNote}</p>}
                </div>
                <span className={request.status === "approved" ? "text-sm font-semibold text-emerald-200" : request.status === "rejected" ? "text-sm font-semibold text-rose-300" : "text-sm font-semibold text-amber-200"}>{statusLabel(request.status)}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-white/8 py-10 text-sm text-slate-400">No alternative class requests yet.</p>
        )}
      </section>
    </div>
  );
}
