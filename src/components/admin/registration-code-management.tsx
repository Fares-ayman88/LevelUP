"use client";

import { Ban, Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createRegistrationCodeAction,
  deactivateRegistrationCodeAction,
} from "@/app/actions/registration-codes";
import { initialRegistrationCodeActionState } from "@/lib/workspace/registration-code-state";
import type { RegistrationCodeSummary } from "@/lib/workspace/registration-codes";

function formatDate(date: Date | null): string {
  if (!date) return "No expiry";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusForCode(code: RegistrationCodeSummary): { label: string; className: string } {
  if (!code.isActive && code.usedCount >= code.maxUses) return { className: "text-slate-500", label: "Used" };
  if (!code.isActive) return { className: "text-rose-300", label: "Disabled" };
  if (code.expiresAt && code.expiresAt <= new Date()) return { className: "text-amber-300", label: "Expired" };
  return { className: "text-emerald-300", label: "Active" };
}

export function RegistrationCodeManagement({ codes }: { codes: RegistrationCodeSummary[] }) {
  const [state, action, pending] = useActionState(createRegistrationCodeAction, initialRegistrationCodeActionState);
  const [copied, setCopied] = useState(false);

  async function copyGeneratedCode(): Promise<void> {
    if (!state.generatedCode || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(state.generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">New code</p>
          <h2 className="mt-2 text-xl font-semibold">Invite a student or parent.</h2>
        </div>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400" htmlFor="registration-role">Account type</label>
            <select className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue="student" disabled={pending} id="registration-role" name="role">
              <option value="student">Student</option>
              <option value="guardian">Parent or guardian</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400" htmlFor="registration-label">Label (optional)</label>
            <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#9db2ff]/60" disabled={pending} id="registration-label" maxLength={120} name="label" placeholder="September students" type="text" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400" htmlFor="registration-uses">Uses</label>
              <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={1} disabled={pending} id="registration-uses" max={500} min={1} name="maxUses" required type="number" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400" htmlFor="registration-validity">Valid days</label>
              <input className="mt-2 h-10 w-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={30} disabled={pending} id="registration-validity" max={365} min={1} name="validForDays" required type="number" />
            </div>
          </div>
          {state.status === "error" && <p aria-live="polite" className="text-xs leading-5 text-rose-300" role="alert">{state.message}</p>}
          <button className="inline-flex h-10 w-full items-center justify-center gap-2 bg-[#9db2ff] px-3 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <KeyRound aria-hidden="true" size={16} />}
            {pending ? "Creating" : "Create access code"}
          </button>
        </form>

        {state.status === "success" && state.generatedCode && (
          <div className="mt-5 border border-emerald-300/25 bg-emerald-300/[0.07] p-4">
            <p className="text-xs leading-5 text-emerald-100">{state.message}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold tracking-[0.1em] text-white">{state.generatedCode}</code>
              <button aria-label="Copy access code" className="grid h-10 w-10 place-items-center border border-white/10 text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-100/10" onClick={copyGeneratedCode} title="Copy access code" type="button">
                {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0">
        <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Issued codes</p>
            <h2 className="mt-2 text-xl font-semibold">Access is scoped to this center.</h2>
          </div>
          <span className="shrink-0 text-sm text-slate-500">{codes.length} total</span>
        </div>

        {codes.length ? (
          <div className="divide-y divide-white/8">
            {codes.map((code) => {
              const status = statusForCode(code);
              return (
                <article className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between" key={code.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold text-white">{code.label || `${code.role === "student" ? "Student" : "Guardian"} access`}</p>
                      <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{code.role === "student" ? "Student" : "Parent or guardian"} - {code.usedCount}/{code.maxUses} used - Expires {formatDate(code.expiresAt)}</p>
                  </div>
                  {code.isActive && code.usedCount < code.maxUses ? (
                    <form action={deactivateRegistrationCodeAction}>
                      <input name="codeId" type="hidden" value={code.id} />
                      <button className="inline-flex h-9 items-center gap-2 border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:border-rose-300/40 hover:bg-rose-300/10 hover:text-rose-200" type="submit">
                        <Ban aria-hidden="true" size={15} />
                        Disable
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-sm leading-6 text-slate-500">No access codes have been created for this center yet.</div>
        )}
      </section>
    </div>
  );
}
