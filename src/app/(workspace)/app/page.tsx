import Link from "next/link";
import { Building2, GraduationCap, LogOut, UserRoundCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { requireActiveOrganization } from "@/lib/auth/dal";

export const metadata = {
  title: "Workspace | LevelUp",
};

function roleLabel(role: string): string {
  if (role === "center_admin") return "Center Admin";
  return role[0].toUpperCase() + role.slice(1);
}

export default async function WorkspacePage() {
  const { organization, session } = await requireActiveOrganization();

  if (organization.roles.includes("student")) {
    redirect("/app/student");
  }

  if (organization.roles.includes("guardian")) {
    redirect("/app/guardian");
  }

  if (organization.roles.includes("teacher")) {
    redirect("/app/teacher/classes");
  }

  if (organization.roles.includes("center_admin")) {
    redirect("/app/admin");
  }

  if (organization.roles.includes("assistant")) {
    redirect("/app/assistant/payments");
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-5 text-white sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 border border-white/10 bg-white/[0.025] px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{organization.name}</p>
              <p className="truncate text-xs text-slate-500">{session.userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="inline-flex h-10 items-center gap-2 border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:border-white/25 hover:text-white" href="/select-organization">
              <Building2 aria-hidden="true" size={16} />
              Switch center
            </Link>
            <form action={signOutAction}>
              <button aria-label="Sign out" className="grid h-10 w-10 place-items-center border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white" type="submit">
                <LogOut aria-hidden="true" size={17} />
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Authenticated workspace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl">Welcome back, {session.userName}.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              You are working inside {organization.name}. Choose a different center whenever you need to switch context.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3 text-slate-300">
              <span className="grid h-10 w-10 place-items-center border border-white/10 bg-black/20 text-[#9db2ff]"><UserRoundCheck aria-hidden="true" size={19} /></span>
              <div>
                <p className="text-sm font-semibold text-white">Account active</p>
                <p className="text-xs text-slate-500">{organization.name}</p>
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Roles</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {organization.roles.map((role) => (
                <span className="border border-[#9db2ff]/25 bg-[#9db2ff]/10 px-3 py-1.5 text-sm font-medium text-[#c6d0ff]" key={role}>
                  {roleLabel(role)}
                </span>
              ))}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
