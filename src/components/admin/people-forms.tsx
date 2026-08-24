"use client";

import { Check, Copy, LoaderCircle, Plus, RotateCcw, UserPlus, UsersRound } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createGuardianAction,
  createStaffAccountAction,
  createStudentAction,
  resetStudentAccessCodeAction,
} from "@/app/actions/center-people";
import { initialCenterPeopleActionState } from "@/lib/workspace/center-people-state";

type StudentOption = {
  fullName: string;
  id: string;
  studentCode: string;
};

function FormMessage({ message, status }: { message?: string; status: "error" | "idle" | "success" }) {
  if (status === "idle" || !message) return null;

  return (
    <p className={status === "error" ? "text-xs leading-5 text-rose-300" : "text-xs leading-5 text-emerald-300"} role={status === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

function StudentAccessCodePanel({ code, studentName }: { code: string; studentName?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border border-[#9db2ff]/35 bg-[#9db2ff]/[0.08] p-3" role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9c6ff]">Private student access code</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{studentName ? `Give this only to ${studentName}.` : "Give this only to the student."} It will not be shown again after this page is closed.</p>
        </div>
        <button aria-label="Copy student access code" className="grid h-8 w-8 shrink-0 place-items-center border border-[#9db2ff]/35 text-[#c7d2ff] transition hover:bg-[#9db2ff]/15" onClick={copyCode} title="Copy access code" type="button">
          {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
        </button>
      </div>
      <code className="mt-3 block break-all border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold tracking-[0.1em] text-white">{code}</code>
    </div>
  );
}

export function CreateStudentForm() {
  const [state, action, pending] = useActionState(createStudentAction, initialCenterPeopleActionState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Student</p>
        <h2 className="mt-2 text-xl font-semibold">Add a student</h2>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="student-full-name">Full name</label>
        <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="student-full-name" maxLength={160} name="fullName" required type="text" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="student-code">Student code</label>
          <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm uppercase text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="student-code" maxLength={48} name="studentCode" placeholder="ST-2048" required type="text" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="student-grade">Grade</label>
          <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" defaultValue="3rd Secondary" disabled={pending} id="student-grade" maxLength={80} name="gradeLevel" required type="text" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="student-email">Student email (optional)</label>
          <input autoComplete="email" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="student-email" maxLength={320} name="email" placeholder="student@example.com" type="email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="student-password">Initial password (optional)</label>
          <input autoComplete="new-password" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="student-password" minLength={8} name="password" placeholder="At least 8 characters" type="password" />
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">Leave both fields empty for a student without a phone or email. LevelUp will create a private access code for them.</p>
      {state.studentAccessCode && <StudentAccessCodePanel code={state.studentAccessCode} studentName={state.studentName} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <FormMessage message={state.message} status={state.status} />
        <button className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : state.status === "success" ? <Check aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
          {pending ? "Adding" : "Add student"}
        </button>
      </div>
    </form>
  );
}

export function ResetStudentAccessCodeButton({ studentProfileId, studentName }: { studentProfileId: string; studentName: string }) {
  const [state, action, pending] = useActionState(resetStudentAccessCodeAction, initialCenterPeopleActionState);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input name="studentProfileId" type="hidden" value={studentProfileId} />
        <button className="inline-flex h-9 items-center gap-2 border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:border-[#9db2ff]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <RotateCcw aria-hidden="true" size={14} />}
          {pending ? "Resetting" : "Reset access code"}
        </button>
      </form>
      {state.status === "error" && <FormMessage message={state.message} status={state.status} />}
      {state.studentAccessCode && <StudentAccessCodePanel code={state.studentAccessCode} studentName={studentName} />}
    </div>
  );
}

export function CreateGuardianForm({ students }: { students: StudentOption[] }) {
  const [state, action, pending] = useActionState(createGuardianAction, initialCenterPeopleActionState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Guardian</p>
        <h2 className="mt-2 text-xl font-semibold">Link a parent or guardian</h2>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="guardian-student">Student</label>
        <select className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" disabled={pending || !students.length} id="guardian-student" name="studentProfileId" required>
          <option value="">Choose student</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} ({student.studentCode})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="guardian-full-name">Full name</label>
        <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending || !students.length} id="guardian-full-name" maxLength={160} name="fullName" required type="text" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="guardian-email">Email</label>
          <input autoComplete="email" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending || !students.length} id="guardian-email" maxLength={320} name="email" placeholder="parent@example.com" required type="email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="guardian-password">Initial password</label>
          <input autoComplete="new-password" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending || !students.length} id="guardian-password" minLength={8} name="password" placeholder="At least 8 characters" required type="password" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="guardian-relationship">Relationship</label>
        <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" defaultValue="Parent" disabled={pending || !students.length} id="guardian-relationship" maxLength={40} name="relationship" required type="text" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <FormMessage message={state.message} status={state.status} />
        <button className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || !students.length} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : state.status === "success" ? <Check aria-hidden="true" size={16} /> : <UsersRound aria-hidden="true" size={16} />}
          {pending ? "Linking" : "Link guardian"}
        </button>
      </div>
    </form>
  );
}

export function CreateStaffAccountForm() {
  const [state, action, pending] = useActionState(createStaffAccountAction, initialCenterPeopleActionState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Team</p>
        <h2 className="mt-2 text-xl font-semibold">Create a staff account</h2>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="staff-full-name">Full name</label>
        <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="staff-full-name" maxLength={160} name="fullName" required type="text" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="staff-email">Email</label>
          <input autoComplete="email" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="staff-email" maxLength={320} name="email" placeholder="team@example.com" required type="email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400" htmlFor="staff-password">Initial password</label>
          <input autoComplete="new-password" className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="staff-password" minLength={8} name="password" placeholder="At least 8 characters" required type="password" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="staff-role">Role</label>
        <select className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue="assistant" disabled={pending} id="staff-role" name="role">
          <option value="teacher">Teacher</option>
          <option value="assistant">Assistant</option>
          <option value="center_admin">Center admin</option>
        </select>
      </div>
      <p className="text-xs leading-5 text-slate-500">Teachers receive a private profile first and can publish it when their discovery details are ready.</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <FormMessage message={state.message} status={state.status} />
        <button className="inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : state.status === "success" ? <Check aria-hidden="true" size={16} /> : <UserPlus aria-hidden="true" size={16} />}
          {pending ? "Creating" : "Create account"}
        </button>
      </div>
    </form>
  );
}
