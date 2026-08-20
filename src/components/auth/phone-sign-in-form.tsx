"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { requestSignInOtpAction, verifySignInOtpAction } from "@/app/actions/auth";
import { initialOtpRequestState, initialOtpVerificationState } from "@/lib/auth/form-state";

export function PhoneSignInForm() {
  const [requestState, requestAction, requesting] = useActionState(requestSignInOtpAction, initialOtpRequestState);
  const [verificationState, verificationAction, verifying] = useActionState(
    verifySignInOtpAction,
    initialOtpVerificationState,
  );
  const [showPhoneStep, setShowPhoneStep] = useState(false);
  const [code, setCode] = useState("");

  const isVerificationStep = requestState.status === "code_sent" && !showPhoneStep;

  if (isVerificationStep && requestState.challengeId && requestState.phoneE164) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Verify your number</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Enter the six-digit code.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">We sent a code to {requestState.phoneE164}.</p>
        </div>

        {requestState.developmentCode && (
          <div className="border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Development code: <span className="font-mono font-bold tracking-[0.18em]">{requestState.developmentCode}</span>
          </div>
        )}

        <form action={verificationAction} className="space-y-4">
          <input name="challengeId" type="hidden" value={requestState.challengeId} />
          <input name="phone" type="hidden" value={requestState.phoneE164} />
          <label className="block text-sm font-medium text-slate-200" htmlFor="otp-code">
            Verification code
          </label>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              autoComplete="one-time-code"
              className="h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 font-mono text-lg tracking-[0.3em] text-white outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]"
              id="otp-code"
              inputMode="numeric"
              maxLength={6}
              name="code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              value={code}
            />
          </div>
          {verificationState.status === "error" && (
            <p aria-live="polite" className="text-sm text-rose-300" role="alert">
              {verificationState.message}
            </p>
          )}
          <button
            className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={verifying || code.length !== 6}
            type="submit"
          >
            {verifying ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
            {verifying ? "Checking your code" : "Continue securely"}
            {!verifying && <ArrowRight aria-hidden="true" size={17} />}
          </button>
        </form>

        <button
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          onClick={() => {
            setCode("");
            setShowPhoneStep(true);
          }}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Secure sign in</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Your learning space, ready when you are.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Enter the Egyptian mobile number connected to your LevelUp account.</p>
      </div>

      <form
        action={requestAction}
        className="space-y-4"
        onSubmit={() => {
          setShowPhoneStep(false);
          setCode("");
        }}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="phone">
          Mobile number
        </label>
        <div className="relative">
          <Phone aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            autoComplete="tel"
            className="h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]"
            id="phone"
            inputMode="tel"
            name="phone"
            placeholder="010 1234 5678"
            required
            type="tel"
          />
        </div>
        {requestState.status === "error" && (
          <p aria-live="polite" className="text-sm text-rose-300" role="alert">
            {requestState.message}
          </p>
        )}
        <button
          className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={requesting}
          type="submit"
        >
          {requesting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <CheckCircle2 aria-hidden="true" size={18} />}
          {requesting ? "Sending code" : "Send verification code"}
          {!requesting && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
        Your code expires in five minutes. Never share it with anyone, including center staff.
      </p>
    </div>
  );
}
