import { LoaderCircle } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <LoaderCircle aria-hidden="true" className="animate-spin text-[#9db2ff]" size={32} />
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">Loading workspace...</span>
      </div>
    </div>
  );
}
