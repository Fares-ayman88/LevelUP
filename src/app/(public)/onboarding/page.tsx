import Image from "next/image";
import Link from "next/link";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { CompleteOnboardingForm } from "@/components/auth/complete-onboarding-form";
import { requireSession } from "@/lib/auth/dal";
import { getOrganizationChoicesForUser } from "@/lib/auth/service";

export const metadata = {
  title: "Connect your center | LevelUp",
};

export default async function OnboardingPage() {
  const session = await requireSession();
  const organizations = await getOrganizationChoicesForUser(session.userId);

  if (organizations.length) {
    redirect(session.organizationId ? "/app" : "/select-organization");
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#07090d] px-5 py-5 text-white sm:px-8 sm:py-8">
      <Image alt="" className="object-cover object-[68%_center] opacity-35" fill priority sizes="100vw" src="/images/levelup-login-desk-v1.png" />
      <div aria-hidden="true" className="absolute inset-0 bg-black/[0.76]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl sm:px-5">
          <Link className="flex items-center gap-3 font-semibold text-white" href="/onboarding">
            <span className="grid h-10 w-10 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span>LevelUp</span>
          </Link>
          <form action={signOutAction}>
            <button className="inline-flex h-10 items-center gap-2 border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:border-white/25 hover:text-white" type="submit">
              <LogOut aria-hidden="true" size={16} />
              Sign out
            </button>
          </form>
        </header>

        <div className="my-auto grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-20">
          <section className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9db2ff]">One last step</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] text-white sm:text-5xl">Connect {session.userName.split(" ")[0]} to the right center.</h1>
            <p className="mt-6 text-base leading-7 text-slate-300">Enter the center invitation code supplied by the center team. It connects this account to the correct center and is never used as your password.</p>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400"><ShieldCheck aria-hidden="true" className="text-[#9db2ff]" size={17} /> Center-scoped access</div>
          </section>

          <section className="border border-white/10 bg-[#10131b]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Center connection</p>
              <h2 className="mt-2 text-2xl font-semibold">Connect to your center.</h2>
            </div>
            <CompleteOnboardingForm />
          </section>
        </div>
      </div>
    </main>
  );
}
