"use client";

import { Check, CheckCheck, LoaderCircle, Save, Search } from "lucide-react";
import { useActionState, useState } from "react";

import { saveTeacherAttendanceAction } from "@/app/actions/teacher-classroom";
import type { TeacherAttendanceWorkspace } from "@/lib/workspace/teacher-classroom";
import {
  initialTeacherClassroomActionState,
} from "@/lib/workspace/teacher-classroom-state";

const attendanceOptions = [
  { label: "Present", value: "present" },
  { label: "Late", value: "late" },
  { label: "Absent", value: "absent" },
  { label: "Excused", value: "excused" },
] as const;

export function TeacherAttendanceEditor({ workspace }: { workspace: TeacherAttendanceWorkspace }) {
  const [state, action, pending] = useActionState(saveTeacherAttendanceAction, initialTeacherClassroomActionState);
  const [query, setQuery] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of workspace.roster) {
      initial[student.enrollmentId] = student.attendanceStatus ?? "present";
    }
    return initial;
  });

  if (!workspace.session) return null;

  const markAllPresent = () => {
    const updated: Record<string, string> = {};
    for (const student of workspace.roster) {
      updated[student.enrollmentId] = "present";
    }
    setFormValues(updated);
  };

  const handleChange = (enrollmentId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [enrollmentId]: value }));
  };

  const counts = {
    absent: Object.values(formValues).filter((v) => v === "absent").length,
    excused: Object.values(formValues).filter((v) => v === "excused").length,
    late: Object.values(formValues).filter((v) => v === "late").length,
    present: Object.values(formValues).filter((v) => v === "present").length,
  };

  const filteredRoster = workspace.roster.filter((student) =>
    student.studentName.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <form action={action} className="border border-white/10 bg-white/[0.025] p-4 sm:p-5 space-y-4">
      <input name="sessionId" type="hidden" value={workspace.session.id} />

      {/* Summary stats & quick controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300 border border-emerald-500/30">
            {counts.present} Present
          </span>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300 border border-amber-500/30">
            {counts.late} Late
          </span>
          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-300 border border-rose-500/30">
            {counts.absent} Absent
          </span>
          <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-blue-300 border border-blue-500/30">
            {counts.excused} Excused
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-1.5 border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 hover:border-white/25 hover:text-white"
            onClick={markAllPresent}
            type="button"
          >
            <CheckCheck aria-hidden="true" size={14} />
            Mark all present
          </button>
        </div>
      </div>

      {/* Roster search */}
      {workspace.roster.length > 5 && (
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            className="h-9 w-full border border-white/10 bg-black/20 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#9db2ff]/60"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student in roster..."
            value={query}
          />
        </div>
      )}

      {/* Student list */}
      <div className="divide-y divide-white/8 max-h-[420px] overflow-y-auto pr-1">
        {filteredRoster.map((student) => (
          <label className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center" key={student.enrollmentId}>
            <span className="truncate text-sm font-medium text-slate-200">{student.studentName}</span>
            <select
              className="h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60"
              name={`attendance:${student.enrollmentId}`}
              onChange={(e) => handleChange(student.enrollmentId, e.target.value)}
              value={formValues[student.enrollmentId] ?? "present"}
            >
              {attendanceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Save action */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
        <button
          className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || !workspace.roster.length}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
          {pending ? "Saving" : "Save attendance"}
        </button>
        {state.message && (
          <p className={state.status === "error" ? "text-sm text-rose-300" : "inline-flex items-center gap-2 text-sm text-emerald-200"} role={state.status === "error" ? "alert" : "status"}>
            {state.status === "success" && <Check aria-hidden="true" size={16} />}
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
