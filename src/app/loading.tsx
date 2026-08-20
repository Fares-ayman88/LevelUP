export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-6 text-white">
      <div aria-busy="true" className="flex items-center gap-3 text-sm text-slate-300">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#96adff]" />
        Loading your workspace
      </div>
    </main>
  );
}
