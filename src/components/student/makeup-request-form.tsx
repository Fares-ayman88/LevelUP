"use client";

import { CalendarClock, LoaderCircle, Send } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { createMakeupRequestAction } from "@/app/actions/makeup";
import { isWithinMakeupWindow } from "@/lib/workspace/makeup-rules";
import { initialMakeupActionState } from "@/lib/workspace/makeup-state";
import type { MakeupSessionOption } from "@/lib/workspace/makeup";

function optionLabel(session: MakeupSessionOption): string {
  return `${session.subjectName} - ${session.groupName} - ${new Intl.DateTimeFormat("en-EG", { day: "numeric", hour: "numeric", minute: "2-digit", month: "short", timeZone: "Africa/Cairo" }).format(session.startsAt)}`;
}

export function MakeupRequestForm({
  sourceSessions,
  targetSessions,
}: {
  sourceSessions: MakeupSessionOption[];
  targetSessions: MakeupSessionOption[];
}) {
  const [state, action, pending] = useActionState(createMakeupRequestAction, initialMakeupActionState);
  const [sourceSessionId, setSourceSessionId] = useState(sourceSessions[0]?.id ?? "");
  const selectedSource = useMemo(
    () => sourceSessions.find((session) => session.id === sourceSessionId),
    [sourceSessionId, sourceSessions],
  );
  const matchingTargets = useMemo(
    () => targetSessions.filter(
      (session) => selectedSource
        && session.subjectId === selectedSource.subjectId
        && isWithinMakeupWindow(selectedSource.startsAt, session.startsAt),
    ),
    [selectedSource, targetSessions],
  );
  const [targetSessionId, setTargetSessionId] = useState(matchingTargets[0]?.id ?? "");

  function updateSource(nextSourceSessionId: string) {
    setSourceSessionId(nextSourceSessionId);
    const nextSource = sourceSessions.find((session) => session.id === nextSourceSessionId);
    setTargetSessionId(
      targetSessions.find(
        (session) => nextSource
          && session.subjectId === nextSource.subjectId
          && isWithinMakeupWindow(nextSource.startsAt, session.startsAt),
      )?.id ?? "",
    );
  }

  return (
    <form action={action} className="grid gap-5 border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <input name="sourceEnrollmentId" type="hidden" value={selectedSource?.sourceEnrollmentId ?? ""} />
      <label className="grid gap-2 text-sm font-medium text-slate-300">
        Original class
        <select className="h-11 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" name="sourceGroupSessionId" onChange={(event) => updateSource(event.target.value)} value={sourceSessionId}>
          {sourceSessions.map((session) => <option key={session.id} value={session.id}>{optionLabel(session)}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-300">
        Alternative class
        <select className="h-11 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" disabled={!matchingTargets.length} name="targetGroupSessionId" onChange={(event) => setTargetSessionId(event.target.value)} value={targetSessionId}>
          {matchingTargets.map((session) => <option key={session.id} value={session.id}>{optionLabel(session)} - {session.seatsLeft} seats left</option>)}
          {!matchingTargets.length && <option value="">No alternative class is available</option>}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-300">
        Reason
        <textarea className="min-h-28 resize-y border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" maxLength={500} minLength={10} name="reason" placeholder="Tell the center what changed" required />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="inline-flex h-11 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || !selectedSource || !targetSessionId || state.status === "submitted"} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Send aria-hidden="true" size={17} />}
          {pending ? "Sending" : "Send request"}
        </button>
        {state.message && <p className={state.status === "error" ? "text-sm text-rose-300" : "inline-flex items-center gap-2 text-sm text-slate-300"} role={state.status === "error" ? "alert" : "status"}>{state.status === "submitted" && <CalendarClock aria-hidden="true" size={16} />}{state.message}</p>}
      </div>
    </form>
  );
}
