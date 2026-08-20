import { KeyRound } from "lucide-react";
import { notFound } from "next/navigation";

import { RegistrationCodeManagement } from "@/components/admin/registration-code-management";
import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";
import { getRegistrationCodes } from "@/lib/workspace/registration-codes";

export const metadata = {
  title: "Access codes | LevelUp",
};

export default async function AccessCodesPage() {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) notFound();

  const codes = await getRegistrationCodes(context);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="py-10">
        <div className="flex items-center gap-2 text-[#9db2ff]"><KeyRound aria-hidden="true" size={17} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Account access</span></div>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Give families a clear way in.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Students and parents create their own account, then use a center-controlled code to join the right workspace.</p>
      </section>

      <RegistrationCodeManagement codes={codes} />
    </div>
  );
}
