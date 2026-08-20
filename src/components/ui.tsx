import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckCircle2, CircleAlert, Clock3, XCircle } from "lucide-react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type StatusTone = "success" | "warning" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("liquid-glass surface-card relative p-5 sm:p-6", className)}>
      <div className="liquid-sheen" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function Button({ children, variant = "primary", className = "", type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={clsx("button-base", `button-${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  variant = "ghost",
  className = "",
  type,
  ...props
}: ButtonProps & { label: string }) {
  return (
    <button
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={clsx("icon-button", `icon-button-${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}

function inferStatusTone(status: string): StatusTone {
  const value = status.toLocaleLowerCase();
  const success = [
    "paid",
    "present",
    "confirmed",
    "available",
    "verified",
    "stable",
    "submitted",
    "مدفوع",
    "حاضر",
    "مؤكد",
    "متاح",
    "موثّق",
    "تم",
  ];
  const warning = [
    "pending",
    "due",
    "late",
    "demand",
    "waiting",
    "upcoming",
    "قيد",
    "مستحق",
    "متأخر",
    "انتظار",
    "قاد",
  ];

  if (success.some((term) => value.includes(term))) return "success";
  if (warning.some((term) => value.includes(term))) return "warning";
  return "danger";
}

export function StatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? inferStatusTone(status);
  const Icon = resolvedTone === "success" ? CheckCircle2 : resolvedTone === "warning" ? Clock3 : XCircle;

  return (
    <span className={clsx("status-badge", `status-badge-${resolvedTone}`)}>
      <Icon size={14} aria-hidden="true" />
      {status}
    </span>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <section className="stat-card surface-stat min-h-[122px] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p> : null}
    </section>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="empty-state p-8 text-center">
      <CircleAlert className="mx-auto text-slate-400" size={32} aria-hidden="true" />
      <p className="mt-4 text-base font-black text-slate-700">{title}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
