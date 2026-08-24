import Link from "next/link";
import { BarChart3, CalendarClock, CalendarDays, CreditCard, GraduationCap, Home, LogOut, UsersRound } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import type { Role } from "@/lib/authorization/permissions";

type FamilyNavProps = {
  orgName: string;
  roles: Role[];
  userName: string;
};

export function FamilyNav({ orgName, roles, userName }: FamilyNavProps) {
  const isStudent = roles.includes("student");
  const links = isStudent
    ? [
        { href: "/app/student", icon: Home, label: "Discover" },
        { href: "/app/student/schedule", icon: CalendarDays, label: "My week" },
        { href: "/app/student/progress", icon: BarChart3, label: "Progress" },
        { href: "/app/student/payments", icon: CreditCard, label: "Payments" },
        { href: "/app/student/makeup", icon: CalendarClock, label: "Change class" },
      ]
    : [
        { href: "/app/guardian", icon: UsersRound, label: "My family" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07090d]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <Link className="flex shrink-0 items-center gap-2.5" href={links[0]?.href ?? "/app"}>
          <span className="grid h-9 w-9 place-items-center border border-[#9db2ff]/35 bg-[#9db2ff]/10 text-[#aebdff]">
            <GraduationCap aria-hidden="true" size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">LevelUp</span>
            <span className="block max-w-32 truncate text-[11px] text-slate-500 sm:max-w-48">{orgName}</span>
          </span>
        </Link>

        <nav aria-label="Family navigation" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link className="inline-flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white" href={link.href} key={link.href}>
                <Icon aria-hidden="true" size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-36 truncate text-xs text-slate-400 lg:block">{userName}</span>
          <form action={signOutAction}>
            <button aria-label="Sign out" className="grid h-9 w-9 place-items-center border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white" title="Sign out" type="submit">
              <LogOut aria-hidden="true" size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
