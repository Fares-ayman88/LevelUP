import Link from "next/link";
import {
  CircleAlert,
  CreditCard,
  GraduationCap,
  KeyRound,
  Settings2,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import { PaymentChannelSettingsForm } from "@/components/admin/payment-channel-settings-form";
import { paymentChannelKinds, type PaymentChannelKind } from "@/lib/payments/payment-channel-rules";
import {
  getCenterAdminDashboard,
  getCurrentCenterAdminWorkspace,
  getPaymentChannelSettings,
} from "@/lib/workspace/payment-channels";

export const metadata = {
  title: "Center administration | LevelUp",
};

export default async function CenterAdminPage() {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) notFound();

  const [dashboard, channels] = await Promise.all([
    getCenterAdminDashboard(context),
    getPaymentChannelSettings(context),
  ]);
  const channelsByKind = new Map(channels.map((channel) => [channel.kind, channel]));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-5 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Center administration</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Keep the center easy to run.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Configure the payment details families see, then move directly into the decisions that need staff attention.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 border border-[#9db2ff]/35 px-3 text-sm font-semibold text-[#b9c6ff] transition hover:border-[#9db2ff]/70 hover:bg-[#9db2ff]/10" href="/app/assistant/payments">
          <CircleAlert aria-hidden="true" size={16} />
          Review payment decisions
        </Link>
      </section>

      <section aria-label="Center summary" className="grid border-y border-white/10 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-b border-white/8 p-5 sm:border-r sm:border-b xl:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active groups</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard.activeGroups}</p>
        </div>
        <div className="border-b border-white/8 p-5 xl:border-r xl:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live enrollments</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard.activeStudents}</p>
        </div>
        <div className="border-b border-white/8 p-5 sm:border-r sm:border-b-0 xl:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payment decisions</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard.paymentDecisions}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Waiting list</p>
          <p className="mt-2 text-2xl font-semibold">{dashboard.waitlistEntries}</p>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-b border-white/10 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#9db2ff]"><Settings2 aria-hidden="true" size={17} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Payment setup</span></div>
          <h2 className="mt-3 text-2xl font-semibold">Where families can pay.</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-400">Only active methods appear during renewal. A cash payment remains staff-confirmed so a student never marks cash as paid by themselves.</p>
      </section>

      <section className="grid gap-px border-b border-white/10 bg-white/10 lg:grid-cols-2">
        {paymentChannelKinds.map((kind) => (
          <article className="bg-[#07090d] p-5 sm:p-6" key={kind}>
            <PaymentChannelSettingsForm channel={channelsByKind.get(kind as PaymentChannelKind)} kind={kind} />
          </article>
        ))}
      </section>

      <section className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#9db2ff]/45 hover:bg-white/[0.04]" href="/app/admin/groups">
          <GraduationCap aria-hidden="true" className="text-[#9db2ff]" size={20} />
          <h2 className="mt-5 text-lg font-semibold">Academic groups</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Manage class schedules, capacities, teacher assignments, and live group enrollment levels.</p>
        </Link>
        <Link className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#9db2ff]/45 hover:bg-white/[0.04]" href="/app/admin/access-codes">
          <KeyRound aria-hidden="true" className="text-[#9db2ff]" size={20} />
          <h2 className="mt-5 text-lg font-semibold">Family access codes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Create and disable time-limited student or guardian codes without exposing another center&apos;s access.</p>
        </Link>
        <Link className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#9db2ff]/45 hover:bg-white/[0.04]" href="/app/admin/people">
          <UsersRound aria-hidden="true" className="text-[#9db2ff]" size={20} />
          <h2 className="mt-5 text-lg font-semibold">People and access</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Create student, guardian, teacher, assistant, and center-admin accounts from the correct center context.</p>
        </Link>
        <Link className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#9db2ff]/45 hover:bg-white/[0.04]" href="/app/assistant/payments">
          <CreditCard aria-hidden="true" className="text-[#9db2ff]" size={20} />
          <h2 className="mt-5 text-lg font-semibold">Payment follow-up</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Confirm transfer references, record cash payments, or decide how long an unpaid seat stays reserved.</p>
        </Link>
        <Link className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#9db2ff]/45 hover:bg-white/[0.04]" href="/app/assistant/makeup">
          <UsersRound aria-hidden="true" className="text-[#9db2ff]" size={20} />
          <h2 className="mt-5 text-lg font-semibold">Alternative class requests</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Review a student&apos;s requested make-up class without losing sight of capacity and the original class schedule.</p>
        </Link>
      </section>
    </div>
  );
}
