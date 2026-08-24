"use client";

import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { requestEmailSignUpOtpAction, verifyEmailSignUpOtpAction } from "@/app/actions/auth";
import {
  initialEmailSignUpRequestState,
  initialEmailSignUpVerificationState,
} from "@/lib/auth/form-state";
import type { SignUpOtpDeliveryChannel } from "@/lib/auth/otp-delivery";

type EmailSignUpFormProps = {
  emailOtpEnabled: boolean;
  googleEnabled: boolean;
  googleError?: string;
  whatsAppEnabled: boolean;
};

type AccountDraft = {
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
};

type SignUpVerificationStepProps = {
  challengeId: string;
  deliveryChannel: SignUpOtpDeliveryChannel;
  destination: string;
  developmentCode?: string;
};

const inputClassName =
  "h-13 w-full border border-white/10 bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#9db2ff]/70 focus:bg-white/[0.075]";

function SignUpVerificationStep({
  challengeId,
  deliveryChannel,
  destination,
  developmentCode,
}: SignUpVerificationStepProps) {
  const [state, action, pending] = useActionState(verifyEmailSignUpOtpAction, initialEmailSignUpVerificationState);
  const [code, setCode] = useState("");
  const isWhatsApp = deliveryChannel === "whatsapp";
  const DeliveryIcon = isWhatsApp ? MessageCircle : Mail;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">
          {isWhatsApp ? "Verify WhatsApp" : "Verify your email"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">One last secure step.</h2>
        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-400">
          <DeliveryIcon aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={16} />
          <span>
            We sent a six-digit code {isWhatsApp ? "via WhatsApp" : "by email"} to{" "}
            <span className="font-medium text-slate-200">{destination}</span>.
          </span>
        </p>
      </div>

      {developmentCode && (
        <div className="border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          Development code: <span className="font-mono font-bold tracking-[0.18em]">{developmentCode}</span>
        </div>
      )}

      <form action={action} className="space-y-4">
        <input name="challengeId" type="hidden" value={challengeId} />
        <label className="block text-sm font-medium text-slate-200" htmlFor="sign-up-verification-code">
          Verification code
        </label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            autoComplete="one-time-code"
            className={`${inputClassName} font-mono text-lg tracking-[0.3em] placeholder:font-sans placeholder:tracking-normal`}
            id="sign-up-verification-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            required
            value={code}
          />
        </div>
        {state.status === "error" && (
          <p aria-live="polite" className="text-sm text-rose-300" role="alert">
            {state.message}
          </p>
        )}
        <button
          className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={pending || code.length !== 6}
          type="submit"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
          {pending ? "Verifying your code" : "Verify and create account"}
          {!pending && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <RefreshCw aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
        Your code expires in five minutes. Never share it with anyone, including center staff.
      </p>
    </div>
  );
}

export function EmailSignUpForm({
  emailOtpEnabled,
  googleEnabled,
  googleError,
  whatsAppEnabled,
}: EmailSignUpFormProps) {
  const [requestState, requestAction, requesting] = useActionState(
    requestEmailSignUpOtpAction,
    initialEmailSignUpRequestState,
  );
  const [draft, setDraft] = useState<AccountDraft>({
    confirmPassword: "",
    email: "",
    fullName: "",
    password: "",
    phone: "",
  });
  const [deliveryChannel, setDeliveryChannel] = useState<SignUpOtpDeliveryChannel>(
    whatsAppEnabled ? "whatsapp" : "email",
  );
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  const isVerificationStep = requestState.status === "code_sent" && !showAccountDetails;
  const canChooseDelivery = whatsAppEnabled && emailOtpEnabled;
  const isWhatsApp = deliveryChannel === "whatsapp";
  const DeliveryIcon = isWhatsApp ? MessageCircle : Mail;

  function selectDeliveryChannel(channel: SignUpOtpDeliveryChannel) {
    setDeliveryChannel(channel);
    if (channel === "whatsapp") {
      setDraft((current) => ({ ...current, confirmPassword: "", email: "", password: "" }));
    }
  }

  if (isVerificationStep && requestState.challengeId && requestState.deliveryChannel && requestState.destination) {
    return (
      <div className="space-y-6">
        <SignUpVerificationStep
          key={requestState.challengeId}
          challengeId={requestState.challengeId}
          deliveryChannel={requestState.deliveryChannel}
          destination={requestState.destination}
          developmentCode={requestState.developmentCode}
        />

        <form
          action={requestAction}
          className="flex flex-wrap items-center gap-x-5 gap-y-3"
          onSubmit={() => setShowAccountDetails(false)}
        >
          <input name="deliveryChannel" type="hidden" value={deliveryChannel} />
          <input name="fullName" type="hidden" value={draft.fullName} />
          <input name="phone" type="hidden" value={draft.phone} />
          {deliveryChannel === "email" && (
            <>
              <input name="email" type="hidden" value={draft.email} />
              <input name="password" type="hidden" value={draft.password} />
              <input name="confirmPassword" type="hidden" value={draft.confirmPassword} />
            </>
          )}
          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={requesting}
            type="submit"
          >
            {requesting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <RefreshCw aria-hidden="true" size={16} />}
            {requesting ? "Sending another code" : "Resend code"}
          </button>
          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            onClick={() => setShowAccountDetails(true)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Change account details
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Create account</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Start with one secure account.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {whatsAppEnabled
            ? "Use WhatsApp for the quickest start, or email when you want a password-based account."
            : "Verify your email, then connect to your center in the next step."}
        </p>
      </div>

      <form action={requestAction} className="space-y-4" onSubmit={() => setShowAccountDetails(false)}>
        <input name="deliveryChannel" type="hidden" value={deliveryChannel} />

        {canChooseDelivery && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Choose how to create your account</p>
            <div aria-label="Account verification method" className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              <button
                aria-checked={isWhatsApp}
                className={`flex min-h-18 items-start gap-3 border p-3 text-left transition ${
                  isWhatsApp
                    ? "border-[#9db2ff]/75 bg-[#9db2ff]/10 text-white"
                    : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25 hover:bg-white/[0.05]"
                }`}
                onClick={() => selectDeliveryChannel("whatsapp")}
                role="radio"
                type="button"
              >
                <MessageCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={18} />
                <span>
                  <span className="block text-sm font-semibold">WhatsApp</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-400">Phone number and a one-time code</span>
                </span>
              </button>
              <button
                aria-checked={!isWhatsApp}
                className={`flex min-h-18 items-start gap-3 border p-3 text-left transition ${
                  !isWhatsApp
                    ? "border-[#9db2ff]/75 bg-[#9db2ff]/10 text-white"
                    : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25 hover:bg-white/[0.05]"
                }`}
                onClick={() => selectDeliveryChannel("email")}
                role="radio"
                type="button"
              >
                <Mail aria-hidden="true" className="mt-0.5 shrink-0 text-[#9db2ff]" size={18} />
                <span>
                  <span className="block text-sm font-semibold">Email and password</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-400">Verify your email before signing in</span>
                </span>
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-200" htmlFor="full-name">
            Full name
          </label>
          <div className="relative mt-2">
            <UserRoundPlus aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              autoComplete="name"
              className={inputClassName}
              disabled={requesting}
              id="full-name"
              maxLength={160}
              name="fullName"
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
              placeholder="Your full name"
              required
              type="text"
              value={draft.fullName}
            />
          </div>
        </div>

        {isWhatsApp ? (
          <div>
            <label className="block text-sm font-medium text-slate-200" htmlFor="sign-up-phone">
              WhatsApp number
            </label>
            <div className="relative mt-2">
              <Phone aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                autoComplete="tel"
                className={inputClassName}
                disabled={requesting}
                id="sign-up-phone"
                inputMode="tel"
                maxLength={32}
                name="phone"
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                placeholder="010 1234 5678"
                required
                type="tel"
                value={draft.phone}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200" htmlFor="sign-up-email">
                  Email address
                </label>
                <div className="relative mt-2">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    autoComplete="email"
                    className={inputClassName}
                    disabled={requesting}
                    id="sign-up-email"
                    maxLength={320}
                    name="email"
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                    placeholder="name@example.com"
                    required
                    type="email"
                    value={draft.email}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200" htmlFor="sign-up-phone">
                  Mobile number
                </label>
                <div className="relative mt-2">
                  <Phone aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    autoComplete="tel"
                    className={inputClassName}
                    disabled={requesting}
                    id="sign-up-phone"
                    inputMode="tel"
                    maxLength={32}
                    name="phone"
                    onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                    placeholder="010 1234 5678"
                    required
                    type="tel"
                    value={draft.phone}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200" htmlFor="sign-up-password">
                  Password
                </label>
                <div className="relative mt-2">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    autoComplete="new-password"
                    className={inputClassName}
                    disabled={requesting}
                    id="sign-up-password"
                    maxLength={256}
                    minLength={8}
                    name="password"
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                    placeholder="8+ characters"
                    required
                    type="password"
                    value={draft.password}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200" htmlFor="confirm-password">
                  Confirm password
                </label>
                <div className="relative mt-2">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    autoComplete="new-password"
                    className={inputClassName}
                    disabled={requesting}
                    id="confirm-password"
                    maxLength={256}
                    minLength={8}
                    name="confirmPassword"
                    onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })}
                    placeholder="Repeat password"
                    required
                    type="password"
                    value={draft.confirmPassword}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {requestState.status === "error" && (
          <p aria-live="polite" className="text-sm text-rose-300" role="alert">
            {requestState.message}
          </p>
        )}

        <button
          className="flex h-13 w-full items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={requesting || (!isWhatsApp && !emailOtpEnabled) || (isWhatsApp && !whatsAppEnabled)}
          type="submit"
        >
          {requesting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <DeliveryIcon aria-hidden="true" size={18} />}
          {requesting ? "Sending your code" : isWhatsApp ? "Send code on WhatsApp" : "Send verification email"}
          {!requesting && <ArrowRight aria-hidden="true" size={17} />}
        </button>
      </form>

      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {googleEnabled ? (
        <a
          className="flex h-13 w-full items-center justify-center gap-3 border border-white/14 bg-white/[0.035] px-5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.075]"
          href="/api/auth/google?intent=sign_up"
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
        Already have an account?{" "}
        <Link className="font-semibold text-[#b6c5ff] transition hover:text-white" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
