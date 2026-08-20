"use client";

import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signInWithEmailAction } from "@/app/actions/auth";
import { initialEmailSignInState } from "@/lib/auth/form-state";

type EmailSignInFormProps = {
  googleEnabled: boolean;
  googleError?: string;
};

export function EmailSignInForm({ googleEnabled, googleError }: EmailSignInFormProps) {
  const [state, action, pending] = useActionState(signInWithEmailAction, initialEmailSignInState);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">تسجيل الدخول (Sign In)</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">مرحباً بك في منصة LevelUp</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-400">سجّل الدخول لمتابعة جدولك، حصصك، وتحديثات السنتر.</p>
      </div>

      {/* Google Sign In Button */}
      {googleEnabled ? (
        <a
          className="flex h-13 w-full items-center justify-center gap-3 border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:border-[#9db2ff]/60 hover:bg-white/[0.08]"
          href="/api/auth/google"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          الدخول السريع عبر Google
        </a>
      ) : (
        <button
          className="flex h-13 w-full cursor-not-allowed items-center justify-center gap-3 border border-white/10 bg-white/[0.02] px-5 text-sm font-semibold text-slate-500"
          disabled
          title="Google sign-in is being configured."
          type="button"
        >
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center text-base font-bold">G</span>
          الدخول عبر Google (قيد التفعيل)
        </button>
      )}

      {googleError && (
        <p aria-live="polite" className="text-center text-xs leading-5 text-rose-300" role="alert">
          {googleError}
        </p>
      )}

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">أو بالبريد الإلكتروني</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200" htmlFor="email">
            البريد الإلكتروني (Email address)
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
            كلمة المرور (Password)
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
              placeholder="••••••••"
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
          {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          {!pending && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        ليس لديك حساب بعد؟{" "}
        <Link className="font-semibold text-[#b6c5ff] transition hover:text-white" href="/sign-up">
          إنشاء حساب جديد (Sign up)
        </Link>
      </p>
    </div>
  );
}
