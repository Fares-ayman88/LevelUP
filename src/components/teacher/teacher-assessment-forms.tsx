"use client";

import { Check, ClipboardList, FilePenLine, LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import {
  createTeacherExamAction,
  createTeacherHomeworkAction,
  saveTeacherExamScoresAction,
  saveTeacherHomeworkScoresAction,
} from "@/app/actions/teacher-classroom";
import type { TeacherScorebook } from "@/lib/workspace/teacher-classroom";
import { initialTeacherClassroomActionState } from "@/lib/workspace/teacher-classroom-state";

function ActionMessage({ message, status }: { message?: string; status: "error" | "idle" | "success" }) {
  if (!message) return null;
  return <p className={status === "error" ? "text-sm text-rose-300" : "inline-flex items-center gap-2 text-sm text-emerald-200"} role={status === "error" ? "alert" : "status"}>{status === "success" && <Check aria-hidden="true" size={16} />}{message}</p>;
}

export function TeacherAssessmentCreateForms({ groupId }: { groupId: string }) {
  const [homeworkState, homeworkAction, homeworkPending] = useActionState(createTeacherHomeworkAction, initialTeacherClassroomActionState);
  const [examState, examAction, examPending] = useActionState(createTeacherExamAction, initialTeacherClassroomActionState);

  return (
    <div className="grid divide-y divide-white/8 border border-white/10 bg-white/[0.025] md:grid-cols-2 md:divide-x md:divide-y-0">
      <form action={homeworkAction} className="grid gap-4 p-5">
        <input name="groupId" type="hidden" value={groupId} />
        <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList aria-hidden="true" className="text-[#9db2ff]" size={17} />New homework</div>
        <label className="grid gap-2 text-sm text-slate-300">Title
          <input className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" maxLength={200} minLength={3} name="title" placeholder="For example: Unit 3 practice" required />
        </label>
        <label className="grid gap-2 text-sm text-slate-300">Maximum score
          <input className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" max={10000} min={1} name="maxScore" required step={1} type="number" />
        </label>
        <label className="grid gap-2 text-sm text-slate-300">Notes
          <textarea className="min-h-20 resize-y border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" maxLength={2000} name="instructions" placeholder="Optional" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={homeworkPending} type="submit">
            {homeworkPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <FilePenLine aria-hidden="true" size={16} />}
            {homeworkPending ? "Creating" : "Create homework"}
          </button>
          <ActionMessage message={homeworkState.message} status={homeworkState.status} />
        </div>
      </form>

      <form action={examAction} className="grid gap-4 p-5">
        <input name="groupId" type="hidden" value={groupId} />
        <div className="flex items-center gap-2 text-sm font-semibold"><FilePenLine aria-hidden="true" className="text-[#9db2ff]" size={17} />New exam</div>
        <label className="grid gap-2 text-sm text-slate-300">Title
          <input className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" maxLength={200} minLength={3} name="title" placeholder="For example: Mechanics checkpoint" required />
        </label>
        <label className="grid gap-2 text-sm text-slate-300">Maximum score
          <input className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" max={10000} min={1} name="maxScore" required step={1} type="number" />
        </label>
        <div className="flex flex-wrap items-center gap-3 self-end">
          <button className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={examPending} type="submit">
            {examPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <FilePenLine aria-hidden="true" size={16} />}
            {examPending ? "Creating" : "Create exam"}
          </button>
          <ActionMessage message={examState.message} status={examState.status} />
        </div>
      </form>
    </div>
  );
}

export function TeacherScoreEditor({ kind, scorebook }: { kind: "exam" | "homework"; scorebook: TeacherScorebook }) {
  const actionFunction = kind === "homework" ? saveTeacherHomeworkScoresAction : saveTeacherExamScoresAction;
  const [state, action, pending] = useActionState(actionFunction, initialTeacherClassroomActionState);
  const singularLabel = kind === "homework" ? "homework" : "exam";

  return (
    <form action={action} className="border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <input name={kind === "homework" ? "assignmentId" : "examId"} type="hidden" value={scorebook.assessment.id} />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/8 pb-4">
        <p className="text-sm font-semibold text-white">{scorebook.assessment.title}</p>
        <p className="text-sm text-slate-400">Out of {scorebook.assessment.maxScore}</p>
      </div>
      <div className="divide-y divide-white/8">
        {scorebook.roster.map((student) => (
          <label className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center" key={student.enrollmentId}>
            <span className="truncate text-sm font-medium text-slate-200">{student.studentName}</span>
            <input className="h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" defaultValue={student.score ?? ""} max={scorebook.assessment.maxScore} min={0} name={`${kind}:${student.enrollmentId}`} placeholder="Not graded" step={1} type="number" />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
        <button className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || !scorebook.roster.length} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
          {pending ? "Saving" : `Save ${singularLabel} scores`}
        </button>
        <ActionMessage message={state.message} status={state.status} />
      </div>
    </form>
  );
}
