import Image from "next/image";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";

import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { isGoogleSignInConfigured } from "@/lib/auth/google";

export const metadata = {
  title: "Sign in | LevelUp",
};

type SignInPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

function googleErrorMessage(error: string | string[] | undefined): string | undefined {
  const code = Array.isArray(error) ? error[0] : error;
  if (code === "google_access_denied") return "Google sign-in was cancelled. Try again when you are ready.";
  if (code === "google_not_configured") return "Google sign-in is not configured for this workspace yet.";
  if (code === "google_unavailable") return "This Google account is not linked to an active LevelUp account yet.";
  if (code === "google_failed") return "Google sign-in could not be completed. Please try again.";
  return undefined;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const googleEnabled = isGoogleSignInConfigured();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#07090d] px-5 py-5 text-white sm:px-8 sm:py-8">
      <Image
        alt=""
        className="object-cover object-[68%_center] opacity-45"
        fill
        priority
        sizes="100vw"
        src="/images/levelup-login-desk-v1.png"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/[0.7]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl sm:px-5">
          <Link className="flex items-center gap-3 font-semibold text-white" href="/sign-in">
            <span className="grid h-10 w-10 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span>LevelUp</span>
          </Link>
          <span className="hidden items-center gap-2 text-sm text-slate-400 sm:inline-flex">
            <ShieldCheck aria-hidden="true" size={16} />
            Account-protected access
          </span>
        </header>

        <div className="my-auto grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20">
          <section className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9db2ff]">LevelUp workspace</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.06] text-white sm:text-6xl">
              A clearer start to every study day.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Your schedule, learning progress, and center updates live in one calm place.
            </p>
          </section>

          <section className="border border-white/10 bg-[#10131b]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
            <EmailSignInForm googleEnabled={googleEnabled} googleError={googleErrorMessage(error)} />
          </section>
        </div>
      </div>
    </main>
  );
}
