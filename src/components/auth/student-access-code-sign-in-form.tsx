"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { signInWithStudentAccessCodeAction } from "@/app/actions/auth";
import { initialStudentAccessCodeSignInState } from "@/lib/auth/form-state";

export function StudentAccessCodeSignInForm() {
  const [state, action, pending] = useActionState(signInWithStudentAccessCodeAction, initialStudentAccessCodeSignInState);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Student access</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Use your private access code.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">This is for a student whose center created an account without a phone or email.</p>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200" htmlFor="student-access-code">Student access code</label>
          <div className="relative mt-2">
            <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input autoCapitalize="characters" autoComplete="off" autoCorrect="off" className="h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 text-base uppercase tracking-[0.08em] text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]" disabled={pending} id="student-access-code" name="code" placeholder="STU-ABCD-EFGH-IJKL-MNPQ" required spellCheck={false} type="text" />
          </div>
        </div>

        {state.status === "error" && <p aria-live="polite" className="text-sm text-rose-300" role="alert">{state.message}</p>}

        <button className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65" disabled={pending} type="submit">
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <KeyRound aria-hidden="true" size={18} />}
          {pending ? "Signing in..." : "Open my study space"}
          {!pending && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Have email or Google access? <Link className="font-semibold text-[#b6c5ff] transition hover:text-white" href="/sign-in">Use regular sign in</Link>
      </p>
    </div>
  );
}
