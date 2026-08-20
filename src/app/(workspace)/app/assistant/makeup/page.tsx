import { CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";

import { MakeupReviewActions } from "@/components/assistant/makeup-review-actions";
import { getCurrentMakeupOperationsContext, getMakeupReviewQueue } from "@/lib/workspace/makeup";

export const metadata = {
  title: "Alternative class requests | LevelUp",
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

export default async function MakeupReviewPage() {
  const context = await getCurrentMakeupOperationsContext();
  if (!context) notFound();

  const items = await getMakeupReviewQueue(context);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Roster decisions</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Protect the class plan without blocking a student.</h1>
        </div>
        <p className="text-sm text-slate-400">{items.length} request{items.length === 1 ? "" : "s"} waiting</p>
      </section>

      {items.length ? (
        <section className="border-y border-white/10">
          {items.map((item) => (
            <article className="grid gap-6 border-b border-white/8 py-6 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_280px]" key={item.id}>
              <div>
                <p className="text-lg font-semibold">{item.studentName}</p>
                <p className="mt-1 text-sm font-medium text-[#b9c6ff]">{item.subjectName}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="border-l-2 border-white/10 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Original</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">{item.sourceGroupName}</p>
                    <p className="mt-1 text-sm text-slate-400">{formatDateTime(item.sourceStartsAt)}</p>
                  </div>
                  <div className="border-l-2 border-[#9db2ff]/40 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Alternative</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">{item.targetGroupName}</p>
                    <p className="mt-1 text-sm text-slate-400">{formatDateTime(item.targetStartsAt)}</p>
                  </div>
                </div>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">{item.reason}</p>
              </div>
              <MakeupReviewActions requestId={item.id} />
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-16 text-center">
          <CalendarClock aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No alternative class requests need a decision.</h2>
        </section>
      )}
    </div>
  );
}
