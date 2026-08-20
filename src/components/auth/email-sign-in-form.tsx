"use client";

import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { signInWithEmailAction } from "@/app/actions/auth";
import { initialEmailSignInState } from "@/lib/auth/form-state";
import { PhoneSignInForm } from "./phone-sign-in-form";

type EmailSignInFormProps = {
  googleEnabled: boolean;
  googleError?: string;
};

export function EmailSignInForm({ googleEnabled, googleError }: EmailSignInFormProps) {
  const [signInMode, setSignInMode] = useState<"email" | "phone">("email");
  const [state, action, pending] = useActionState(signInWithEmailAction, initialEmailSignInState);

  if (signInMode === "phone") {
    return (
      <div className="space-y-6">
        <div className="flex border-b border-white/10 pb-3">
          <button
            className="flex flex-1 items-center justify-center gap-2 pb-2 text-sm font-medium text-slate-400 transition hover:text-white"
            onClick={() => setSignInMode("email")}
            type="button"
          >
            <Mail aria-hidden="true" size={16} />
            Email
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 border-b-2 border-[#9db2ff] pb-2 text-sm font-semibold text-[#9db2ff]"
            type="button"
          >
            <Phone aria-hidden="true" size={16} />
            Phone OTP
          </button>
        </div>
        <PhoneSignInForm />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex border-b border-white/10 pb-3">
        <button
          className="flex flex-1 items-center justify-center gap-2 border-b-2 border-[#9db2ff] pb-2 text-sm font-semibold text-[#9db2ff]"
          type="button"
        >
          <Mail aria-hidden="true" size={16} />
          Email
        </button>
        <button
          className="flex flex-1 items-center justify-center gap-2 pb-2 text-sm font-medium text-slate-400 transition hover:text-white"
          onClick={() => setSignInMode("phone")}
          type="button"
        >
          <Phone aria-hidden="true" size={16} />
          Phone OTP
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Secure sign in</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Welcome to your learning space.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use the email and password created for your LevelUp account.</p>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200" htmlFor="email">
            Email address
          </label>
          <div className="relative mt-2">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              autoComplete="email"
              className="h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]"
              disabled={pending}
              id="email"
              name="email"
              placeholder="name@example.com"
              required
              type="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200" htmlFor="password">
            Password
          </label>
          <div className="relative mt-2">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              autoComplete="current-password"
              className="h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]"
              disabled={pending}
              id="password"
              minLength={8}
              name="password"
              placeholder="Your password"
              required
              type="password"
            />
          </div>
        </div>

        {state.status === "error" && (
          <p aria-live="polite" className="text-sm text-rose-300" role="alert">
            {state.message}
          </p>
        )}

        <button
          className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={pending}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <KeyRound aria-hidden="true" size={18} />}
          {pending ? "Signing you in" : "Sign in"}
          {!pending && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {googleEnabled ? (
        <a
          className="flex h-13 w-full items-center justify-center gap-3 border border-white/14 bg-white/[0.035] px-5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.075]"
          href="/api/auth/google"
        >
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center text-base font-bold text-[#9db2ff]">G</span>
          Continue with Google
        </a>
      ) : (
        <button
          className="flex h-13 w-full cursor-not-allowed items-center justify-center gap-3 border border-white/10 bg-white/[0.02] px-5 text-sm font-semibold text-slate-500"
          disabled
          title="Google sign-in is being configured."
          type="button"
        >
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center text-base font-bold">G</span>
          Google sign-in needs setup
        </button>
      )}

      {(googleError || !googleEnabled) && (
        <p aria-live="polite" className="text-center text-xs leading-5 text-slate-500" role={googleError ? "alert" : undefined}>
          {googleError ?? "Google sign-in becomes available after Google OAuth is configured for this workspace."}
        </p>
      )}

      <p className="text-center text-sm text-slate-400">
        New to LevelUp?{" "}
        <Link className="font-semibold text-[#b6c5ff] transition hover:text-white" href="/sign-up">
          Create an account
        </Link>
      </p>
    </div>
  );
}
