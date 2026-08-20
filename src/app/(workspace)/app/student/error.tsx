"use client";

import { RefreshCw } from "lucide-react";

export default function StudentDiscoveryError({ retry }: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-6 text-white">
      <section className="w-full max-w-md border border-white/10 bg-white/[0.025] p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Group discovery</p>
        <h1 className="mt-4 text-2xl font-semibold">We could not load your groups.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your saved information is safe. Check your connection and try again.
        </p>
        <button
          className="mt-6 inline-flex h-11 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff]"
          onClick={retry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Try again
        </button>
      </section>
    </main>
  );
}
