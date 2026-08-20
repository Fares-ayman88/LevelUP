import { notFound } from "next/navigation";

import { CommunicationCenter } from "@/components/admin/communication-center";
import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";

export const metadata = {
  title: "Communications | LevelUp",
};

export default async function AdminCommunicationsPage() {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) notFound();

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Direct Messaging</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">WhatsApp & SMS Communications</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Send customized reminders, exam score updates, and schedule announcements directly to parents and students.
          </p>
        </div>
      </section>

      <CommunicationCenter />
    </div>
  );
}
