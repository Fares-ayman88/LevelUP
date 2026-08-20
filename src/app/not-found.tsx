import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#96adff]">LevelUp</p>
        <h1 className="mt-4 text-3xl font-semibold">This page is not available.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The link may be outdated, or you may not have permission to open this workspace.
        </p>
        <Link
          className="mt-7 inline-flex h-11 items-center rounded-lg bg-[#96adff] px-5 text-sm font-semibold text-[#080a0f] transition hover:bg-[#adc0ff]"
          href="/"
        >
          Return to LevelUp
        </Link>
      </div>
    </main>
  );
}
