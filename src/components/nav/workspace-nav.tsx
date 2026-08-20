"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings2,
  UsersRound,
} from "lucide-react";
import { type Role } from "@/lib/authorization/permissions";
import { signOutAction } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Only show when path matches (exact or prefix) */
  matchPrefix?: boolean;
};

function studentNav(): NavItem[] {
  return [
    { href: "/app/student", label: "Explore", icon: GraduationCap },
    { href: "/app/student/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/app/student/progress", label: "Progress", icon: BarChart3 },
    { href: "/app/student/payments", label: "Payments", icon: CreditCard },
    { href: "/app/student/makeup", label: "Alt. class", icon: CalendarClock, matchPrefix: true },
  ];
}

function teacherNav(): NavItem[] {
  return [
    { href: "/app/teacher/classes", label: "Classes", icon: BookOpenCheck },
    { href: "/app/teacher/profile", label: "Profile", icon: UsersRound },
  ];
}

function assistantNav(): NavItem[] {
  return [
    { href: "/app/assistant/payments", label: "Payments", icon: CreditCard },
    { href: "/app/assistant/makeup", label: "Alt. classes", icon: CalendarClock },
  ];
}

function guardianNav(): NavItem[] {
  return [
    { href: "/app/guardian", label: "Children", icon: GraduationCap },
  ];
}

function adminNav(): NavItem[] {
  return [
    { href: "/app/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/app/admin/groups", label: "Groups", icon: BookOpenCheck },
    { href: "/app/admin/people", label: "People", icon: UsersRound },
    { href: "/app/admin/communications", label: "Messaging", icon: MessageSquare },
    { href: "/app/admin/access-codes", label: "Codes", icon: KeyRound },
    { href: "/app/assistant/payments", label: "Payments", icon: CreditCard },
    { href: "/app/assistant/makeup", label: "Alt. classes", icon: CalendarClock },
  ];
}

function getNavItems(roles: Role[]): NavItem[] {
  if (roles.includes("student")) return studentNav();
  if (roles.includes("center_admin")) return adminNav();
  if (roles.includes("assistant")) return assistantNav();
  if (roles.includes("teacher")) return teacherNav();
  if (roles.includes("guardian")) return guardianNav();
  return [];
}

function useIsActive(href: string, matchPrefix?: boolean): boolean {
  const pathname = usePathname();
  if (matchPrefix) return pathname.startsWith(href);
  // Exact match for root nav items, prefix for sub-routes
  return pathname === href || (href !== "/app/student" && pathname.startsWith(href + "/"));
}

function NavLink({ item }: { item: NavItem }) {
  const active = useIsActive(item.href, item.matchPrefix);
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[#9db2ff]/15 text-[#9db2ff]"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
      ].join(" ")}
      href={item.href}
    >
      <Icon aria-hidden="true" className="shrink-0" size={18} />
      <span className="hidden xl:block">{item.label}</span>
      {/* Tooltip for icon-only mode */}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1117] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 xl:hidden">
        {item.label}
      </span>
    </Link>
  );
}

type WorkspaceNavProps = {
  orgName: string;
  userName: string;
  roles: Role[];
};

/** Desktop sidebar navigation */
export function WorkspaceSidebar({ orgName, userName, roles }: WorkspaceNavProps) {
  const navItems = getNavItems(roles);

  return (
    <aside className="hidden lg:flex lg:w-[64px] xl:w-[220px] lg:shrink-0 lg:flex-col">
      <div className="sticky top-0 flex h-screen flex-col border-r border-white/8 bg-[#07090d] pb-4">
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 px-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
            <GraduationCap aria-hidden="true" size={16} />
          </span>
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-semibold text-white">LevelUp</p>
            <p className="truncate text-xs text-slate-500">{orgName}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
          {navItems.map((item) => (
            <NavLink item={item} key={item.href} />
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-white/8 px-2 pt-3">
          <div className="mb-2 hidden px-3 xl:block">
            <p className="truncate text-xs text-slate-500">{userName}</p>
          </div>
          <Link
            className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.04] hover:text-slate-200"
            href="/select-organization"
          >
            <Building2 aria-hidden="true" className="shrink-0" size={18} />
            <span className="hidden xl:block">Switch center</span>
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1117] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 xl:hidden">
              Switch center
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              aria-label="Sign out"
              className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.04] hover:text-slate-200"
              type="submit"
            >
              <LogOut aria-hidden="true" className="shrink-0" size={18} />
              <span className="hidden xl:block">Sign out</span>
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1117] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 xl:hidden">
                Sign out
              </span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Mobile bottom navigation */
export function WorkspaceMobileNav({ roles }: { roles: Role[] }) {
  const navItems = getNavItems(roles);
  const primaryItems = navItems.slice(0, 5);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/8 bg-[#07090d]/95 backdrop-blur-xl lg:hidden"
    >
      {primaryItems.map((item) => (
        <MobileNavLink item={item} key={item.href} />
      ))}
    </nav>
  );
}

function MobileNavLink({ item }: { item: NavItem }) {
  const active = useIsActive(item.href, item.matchPrefix);
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
        active ? "text-[#9db2ff]" : "text-slate-500",
      ].join(" ")}
      href={item.href}
    >
      <Icon aria-hidden="true" size={20} />
      <span>{item.label}</span>
    </Link>
  );
}

/** Compact top bar for workspace pages (name + quick actions) */
export function WorkspaceTopBar({
  orgName,
  userName,
  roles,
  extra,
}: WorkspaceNavProps & { extra?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-[#07090d]/95 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile: brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <span className="grid h-8 w-8 place-items-center border border-[#9db2ff]/30 bg-[#9db2ff]/10 text-[#9db2ff]">
          <GraduationCap aria-hidden="true" size={15} />
        </span>
        <p className="text-sm font-semibold text-white">LevelUp</p>
      </div>

      {/* Desktop: org + user info */}
      <div className="hidden items-center gap-2 lg:flex">
        <span className="text-sm font-medium text-slate-300">{orgName}</span>
        <span className="text-slate-600">·</span>
        <span className="text-xs text-slate-500">{userName}</span>
      </div>

      {/* Extra actions (page-specific) */}
      {extra && <div className="flex items-center gap-2">{extra}</div>}

      {/* Right: quick links only shown on desktop (sidebar has sign-out) */}
      <div className="flex items-center gap-2 lg:hidden">
        <Link
          aria-label="Switch center"
          className="grid h-9 w-9 place-items-center border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white"
          href="/select-organization"
        >
          <Building2 aria-hidden="true" size={16} />
        </Link>
        <form action={signOutAction}>
          <button
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white"
            type="submit"
          >
            <LogOut aria-hidden="true" size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
