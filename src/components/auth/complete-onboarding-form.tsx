"use client";

import { ArrowRight, GraduationCap, KeyRound, LoaderCircle, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useActionState, useState } from "react";

import { completeOnboardingAction } from "@/app/actions/auth";
import { initialOnboardingState } from "@/lib/auth/form-state";

type OnboardingRole = "guardian" | "student";

const SECONDARY_GRADES = [
  { id: "1st Secondary", label: "1st Secondary" },
  { id: "2nd Secondary", label: "2nd Secondary" },
  { id: "3rd Secondary", label: "3rd Secondary" },
];

export function CompleteOnboardingForm() {
  const [role, setRole] = useState<OnboardingRole>("student");
  const [gradeLevel, setGradeLevel] = useState("1st Secondary");
  const [state, action, pending] = useActionState(completeOnboardingAction, initialOnboardingState);

  return (
    <form action={action} className="space-y-5">
      <input name="role" type="hidden" value={role} />
      <input name="gradeLevel" type="hidden" value={gradeLevel} />

      <div aria-label="Account type" className="grid grid-cols-2 gap-2" role="group">
        <button aria-pressed={role === "student"} className={`flex min-h-18 items-center gap-3 border p-3 text-left transition ${role === "student" ? "border-[#9db2ff]/65 bg-[#9db2ff]/10 text-white" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25"}`} disabled={pending} onClick={() => setRole("student")} type="button">
          <span className="grid h-8 w-8 place-items-center border border-current/20 bg-black/15"><UserRound aria-hidden="true" size={16} /></span>
          <span><span className="block text-sm font-semibold">Student</span><span className="block text-xs text-slate-500">My learning account</span></span>
        </button>
        <button aria-pressed={role === "guardian"} className={`flex min-h-18 items-center gap-3 border p-3 text-left transition ${role === "guardian" ? "border-[#9db2ff]/65 bg-[#9db2ff]/10 text-white" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25"}`} disabled={pending} onClick={() => setRole("guardian")} type="button">
          <span className="grid h-8 w-8 place-items-center border border-current/20 bg-black/15"><UsersRound aria-hidden="true" size={16} /></span>
          <span><span className="block text-sm font-semibold">Parent or guardian</span><span className="block text-xs text-slate-500">Follow my child</span></span>
        </button>
      </div>

      {role === "student" ? (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Grade level</label>
          <div className="grid grid-cols-3 gap-2">
            {SECONDARY_GRADES.map((grade) => (
              <button className={["flex flex-col items-center justify-center border p-3 text-center transition", gradeLevel === grade.id ? "border-[#9db2ff] bg-[#9db2ff]/15 text-white ring-1 ring-[#9db2ff]/50" : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-white"].join(" ")} key={grade.id} onClick={() => setGradeLevel(grade.id)} type="button">
                <GraduationCap className={gradeLevel === grade.id ? "text-[#9db2ff]" : "text-slate-500"} size={18} />
                <span className="mt-1.5 text-xs font-semibold">{grade.label}</span>
              </button>
            ))}
          </div>
          <input name="relationship" type="hidden" value="" />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="onboarding-relationship">Relationship</label>
          <input className="mt-1 h-11 w-full border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none focus:border-[#9db2ff]/70" defaultValue="Parent" disabled={pending} id="onboarding-relationship" name="relationship" required type="text" />
        </div>
      )}

      <div className="space-y-4 border-t border-white/8 pt-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300" htmlFor="registration-code">Center invitation code</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">This connects your account to one center. It is not a password.</p>
          <div className="relative mt-2">
            <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input autoCapitalize="characters" className="h-10 w-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs uppercase text-white outline-none focus:border-[#9db2ff]/70" disabled={pending} id="registration-code" name="registrationCode" placeholder="LU-ABCD-EFGH-IJKL" required type="text" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300" htmlFor="onboarding-student-code">Student ID {role === "guardian" ? "" : "(optional)"}</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">{role === "guardian" ? "Use the student ID supplied by the center to link your child." : "Enter this only when the center already created your student profile."}</p>
          <input autoCapitalize="characters" className="mt-2 h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-xs uppercase text-white outline-none focus:border-[#9db2ff]/70" disabled={pending} id="onboarding-student-code" name="studentCode" placeholder="ST-2048" required={role === "guardian"} type="text" />
        </div>
      </div>

      {state.status === "error" && <p aria-live="polite" className="text-sm text-rose-300" role="alert">{state.message}</p>}

      <button className="flex h-12 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65" disabled={pending} type="submit">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
        {pending ? "Connecting your center..." : "Connect to my center"}
        {!pending && <ArrowRight aria-hidden="true" size={17} />}
      </button>
    </form>
  );
}
