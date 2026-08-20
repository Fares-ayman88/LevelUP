import { Camera } from "lucide-react";
import { notFound } from "next/navigation";

import { TeacherAvatar } from "@/components/teacher/teacher-avatar";
import { TeacherProfilePhotoUploader } from "@/components/teacher/teacher-profile-photo-uploader";
import { isObjectStorageConfigured } from "@/lib/storage/object-storage";
import { getCurrentTeacherProfileWorkspace } from "@/lib/workspace/teacher-profile";

export const metadata = {
  title: "Teacher profile | LevelUp",
};

export default async function TeacherProfilePage() {
  const context = await getCurrentTeacherProfileWorkspace();
  if (!context) notFound();

  const storageConfigured = isObjectStorageConfigured();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">

        <section className="py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Teacher profile</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Present your class with confidence.</h1>
        </section>

        <section className="grid gap-6 border-y border-white/10 py-6 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center">
          <div className="flex min-w-0 items-center gap-5">
            <TeacherAvatar className="h-24 w-24 text-2xl" displayName={context.teacher.displayName} profilePhotoKey={context.teacher.profilePhotoKey} teacherProfileId={context.teacher.id} />
            <div className="min-w-0">
              <p className="text-2xl font-semibold">{context.teacher.displayName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Published profile image.</p>
            </div>
          </div>
          <div className="border-l-2 border-[#9db2ff]/40 pl-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Camera aria-hidden="true" className="text-[#9db2ff]" size={16} />Profile photo</p>
            <div className="mt-4"><TeacherProfilePhotoUploader storageConfigured={storageConfigured} /></div>
          </div>
        </section>
    </div>
  );
}
