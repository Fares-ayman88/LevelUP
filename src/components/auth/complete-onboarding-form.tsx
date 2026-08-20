"use client";

import { ArrowRight, ChevronDown, GraduationCap, KeyRound, LoaderCircle, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useActionState, useState } from "react";

import { completeOnboardingAction } from "@/app/actions/auth";
import { initialOnboardingState } from "@/lib/auth/form-state";

type OnboardingRole = "guardian" | "student";

const SECONDARY_GRADES = [
  { description: "أولى ثانوي", id: "1st Secondary", label: "1st Secondary" },
  { description: "تانية ثانوي", id: "2nd Secondary", label: "2nd Secondary" },
  { description: "تالتة ثانوي", id: "3rd Secondary", label: "3rd Secondary" },
];

export function CompleteOnboardingForm() {
  const [role, setRole] = useState<OnboardingRole>("student");
  const [gradeLevel, setGradeLevel] = useState("1st Secondary");
  const [showAdvancedCodes, setShowAdvancedCodes] = useState(false);
  const [state, action, pending] = useActionState(completeOnboardingAction, initialOnboardingState);

  return (
    <form action={action} className="space-y-5">
      <input name="role" type="hidden" value={role} />
      <input name="gradeLevel" type="hidden" value={gradeLevel} />

      {/* Account Type Toggle */}
      <div aria-label="Account type" className="grid grid-cols-2 gap-2" role="group">
        <button
          aria-pressed={role === "student"}
          className={`flex min-h-18 items-center gap-3 border p-3 text-left transition ${role === "student" ? "border-[#9db2ff]/65 bg-[#9db2ff]/10 text-white" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25"}`}
          disabled={pending}
          onClick={() => setRole("student")}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center border border-current/20 bg-black/15">
            <UserRound aria-hidden="true" size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold">طالب (Student)</span>
            <span className="block text-xs text-slate-500">حسابي الخاص</span>
          </span>
        </button>
        <button
          aria-pressed={role === "guardian"}
          className={`flex min-h-18 items-center gap-3 border p-3 text-left transition ${role === "guardian" ? "border-[#9db2ff]/65 bg-[#9db2ff]/10 text-white" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25"}`}
          disabled={pending}
          onClick={() => setRole("guardian")}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center border border-current/20 bg-black/15">
            <UsersRound aria-hidden="true" size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold">ولي أمر (Guardian)</span>
            <span className="block text-xs text-slate-500">حساب متابعة الأبناء</span>
          </span>
        </button>
      </div>

      {/* Grade Selection for Students */}
      {role === "student" ? (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
            السنة الدراسية (Select Grade Level)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SECONDARY_GRADES.map((grade) => (
              <button
                className={[
                  "flex flex-col items-center justify-center p-3 border text-center transition",
                  gradeLevel === grade.id
                    ? "border-[#9db2ff] bg-[#9db2ff]/15 text-white ring-1 ring-[#9db2ff]/50"
                    : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-white",
                ].join(" ")}
                key={grade.id}
                onClick={() => setGradeLevel(grade.id)}
                type="button"
              >
                <GraduationCap className={gradeLevel === grade.id ? "text-[#9db2ff]" : "text-slate-500"} size={18} />
                <span className="mt-1.5 text-xs font-semibold">{grade.label}</span>
                <span className="text-[11px] text-slate-400">{grade.description}</span>
              </button>
            ))}
          </div>
          <input name="relationship" type="hidden" value="" />
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1" htmlFor="onboarding-relationship">
            صلة القرابة (Relationship)
          </label>
          <input
            className="mt-1 h-11 w-full border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none focus:border-[#9db2ff]/70"
            defaultValue="Parent"
            disabled={pending}
            id="onboarding-relationship"
            name="relationship"
            required
            type="text"
          />
        </div>
      )}

      {/* Optional Codes Collapsible */}
      <div className="pt-1">
        <button
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          onClick={() => setShowAdvancedCodes((prev) => !prev)}
          type="button"
        >
          <ChevronDown className={`transition-transform duration-200 ${showAdvancedCodes ? "rotate-180" : ""}`} size={14} />
          لديك كود سنتر أو كود طالب خاص؟ (اختياري - Optional)
        </button>

        {showAdvancedCodes && (
          <div className="mt-3 space-y-3 rounded-lg border border-white/8 bg-black/20 p-3.5">
            <div>
              <label className="block text-xs text-slate-300" htmlFor="registration-code">
                كود السنتر (Center Access Code) — اختياري
              </label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  autoCapitalize="characters"
                  className="h-10 w-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs uppercase text-white outline-none focus:border-[#9db2ff]/70"
                  disabled={pending}
                  id="registration-code"
                  name="registrationCode"
                  placeholder="LU-ABCD-EFGH-IJKL"
                  type="text"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300" htmlFor="onboarding-student-code">
                كود الطالب (Student Code) — اختياري
              </label>
              <input
                autoCapitalize="characters"
                className="mt-1 h-10 w-full border border-white/10 bg-white/[0.04] px-3 text-xs uppercase text-white outline-none focus:border-[#9db2ff]/70"
                disabled={pending}
                id="onboarding-student-code"
                name="studentCode"
                placeholder="ST-2048"
                type="text"
              />
            </div>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <p aria-live="polite" className="text-sm text-rose-300" role="alert">{state.message}</p>
      )}

      <button
        className="flex h-12 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
        {pending ? "Connecting your workspace..." : "الدخول إلى مساحة العمل (Open workspace)"}
        {!pending && <ArrowRight aria-hidden="true" size={17} />}
      </button>
    </form>
  );
}
