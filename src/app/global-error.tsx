"use client";

import "./globals.css";

export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-6 text-white">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#96adff]">LevelUp</p>
            <h1 className="mt-4 text-3xl font-semibold">We could not open this workspace.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Please try again. If the issue continues, contact your center administrator.
            </p>
            <button
              className="mt-7 h-11 rounded-lg bg-[#96adff] px-5 text-sm font-semibold text-[#080a0f] transition hover:bg-[#adc0ff]"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
