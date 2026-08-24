import { UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import {
  CreateGuardianForm,
  CreateStaffAccountForm,
  CreateStudentForm,
  ResetStudentAccessCodeButton,
} from "@/components/admin/people-forms";
import { getCenterStudentDirectory, getCurrentCenterPeopleWorkspace } from "@/lib/workspace/center-people";
import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";

export const metadata = {
  title: "People | LevelUp",
};

export default async function CenterPeoplePage() {
  const adminContext = await getCurrentCenterAdminWorkspace();
  const context = adminContext ?? await getCurrentCenterPeopleWorkspace();
  if (!context) notFound();

  const students = await getCenterStudentDirectory();
  const studentOptions = students.map((student) => ({
    fullName: student.fullName,
    id: student.id,
    studentCode: student.studentCode,
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">

        <section className="py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Center access</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Give each person the right start.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Students can be added before they need a sign-in. Parents receive separate email accounts and can be linked to one or more children.</p>
        </section>

        <section className={`grid gap-px bg-white/10 ${adminContext ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          <article className="bg-[#07090d] p-5 sm:p-6"><CreateStudentForm /></article>
          <article className="bg-[#07090d] p-5 sm:p-6"><CreateGuardianForm students={studentOptions} /></article>
          {adminContext && <article className="bg-[#07090d] p-5 sm:p-6"><CreateStaffAccountForm /></article>}
        </section>

        <section className="flex items-center justify-between gap-4 border-b border-white/10 pt-12 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#9db2ff]"><UsersRound aria-hidden="true" size={17} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Student directory</span></div>
            <h2 className="mt-3 text-2xl font-semibold">{students.length} student{students.length === 1 ? "" : "s"} in this center</h2>
          </div>
        </section>

        {students.length ? (
          <section className="border-b border-white/10">
            {students.map((student) => (
              <article className="grid gap-3 border-t border-white/8 py-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(180px,0.55fr)_minmax(130px,0.45fr)] sm:items-center" key={student.id}>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{student.fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{student.gradeLevel}</p>
                </div>
                <div className="min-w-0 text-sm text-slate-300">
                  <p className="font-medium">{student.studentCode}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{student.email ?? "No email or phone sign-in"}</p>
                </div>
                <div>
                  <p className={student.hasEmailSignIn ? "text-sm font-medium text-emerald-300" : student.hasStudentAccessCode ? "text-sm font-medium text-[#b9c6ff]" : "text-sm font-medium text-amber-200"}>
                    {student.hasEmailSignIn ? "Email sign-in" : student.hasStudentAccessCode ? "Access code active" : "No sign-in yet"}
                  </p>
                  {!student.hasEmailSignIn && <div className="mt-3"><ResetStudentAccessCodeButton studentName={student.fullName} studentProfileId={student.id} /></div>}
                </div>
                <p className="text-sm text-slate-400">{student.linkedGuardianCount} guardian{student.linkedGuardianCount === 1 ? "" : "s"}</p>
              </article>
            ))}
          </section>
        ) : (
          <section className="border-b border-white/10 py-14 text-center text-sm text-slate-400">Add the first student to begin building the center directory.</section>
        )}
    </div>
  );
}
