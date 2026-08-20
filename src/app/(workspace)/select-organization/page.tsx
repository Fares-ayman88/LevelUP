import Link from "next/link";
import { Building2, Check, ChevronRight, GraduationCap, LogOut, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { selectOrganizationAction, signOutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth/dal";
import { getOrganizationChoicesForUser, type OrganizationChoice } from "@/lib/auth/service";

export const metadata = {
  title: "Choose a center | LevelUp",
};

function roleSummary(organization: OrganizationChoice): string {
  return organization.roles
    .map((role) => {
      if (role === "center_admin") return "Center admin";
      return role[0].toUpperCase() + role.slice(1);
    })
    .join(" · ");
}

export default async function SelectOrganizationPage() {
  const session = await requireSession();
  const organizations = await getOrganizationChoicesForUser(session.userId);
  if (!organizations.length) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-5 text-white sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-4 py-3 sm:px-5">
          <Link className="flex items-center gap-3 font-semibold" href="/">
            <span className="grid h-10 w-10 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            LevelUp
          </Link>
          <form action={signOutAction}>
            <button className="inline-flex h-10 items-center gap-2 border border-white/10 px-3 text-sm font-medium text-slate-300 transition hover:border-white/25 hover:text-white" type="submit">
              <LogOut aria-hidden="true" size={16} />
              Sign out
            </button>
          </form>
        </header>

        <section className="my-auto py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Welcome, {session.userName}</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Choose the center you want to open.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Your access is kept separate for every independent center.
          </p>

          {organizations.length ? (
            <div className="mt-8 space-y-3">
              {organizations.map((organization) => {
                const isCurrent = organization.id === session.organizationId;

                return (
                  <form action={selectOrganizationAction} key={organization.id}>
                    <input name="organizationId" type="hidden" value={organization.id} />
                    <button
                      className="group flex w-full items-center gap-4 border border-white/10 bg-white/[0.025] p-4 text-left transition hover:border-[#9db2ff]/50 hover:bg-[#9db2ff]/[0.07] sm:p-5"
                      type="submit"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-black/20 text-[#9db2ff]">
                        {organization.roles.includes("student") || organization.roles.includes("guardian") ? (
                          <Users aria-hidden="true" size={20} />
                        ) : (
                          <Building2 aria-hidden="true" size={20} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-white">{organization.name}</span>
                        <span className="mt-1 block text-sm text-slate-400">{roleSummary(organization)}</span>
                      </span>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                          <Check aria-hidden="true" size={16} />
                          Current
                        </span>
                      ) : (
                        <ChevronRight aria-hidden="true" className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" size={20} />
                      )}
                    </button>
                  </form>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
