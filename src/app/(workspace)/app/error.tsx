"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Workspace Error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="grid h-14 w-14 place-items-center border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <AlertTriangle aria-hidden="true" size={28} />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        We encountered an error loading this workspace section. Please try again.
      </p>
      <button
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 bg-[#9db2ff] px-5 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff]"
        onClick={reset}
        type="button"
      >
        <RefreshCw aria-hidden="true" size={16} />
        Try again
      </button>
    </div>
  );
}
