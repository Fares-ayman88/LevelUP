import Link from "next/link";
import { BookOpenCheck, CalendarClock, ClipboardCheck, FilePenLine } from "lucide-react";
import { notFound } from "next/navigation";

import { TeacherAssessmentCreateForms, TeacherScoreEditor } from "@/components/teacher/teacher-assessment-forms";
import { TeacherAttendanceEditor } from "@/components/teacher/teacher-attendance-editor";
import {
  getCurrentTeacherClassroomContext,
  getTeacherAttendanceWorkspace,
  getTeacherClassroomOverview,
  getTeacherExamScorebook,
  getTeacherHomeworkScorebook,
} from "@/lib/workspace/teacher-classroom";

export const metadata = {
  title: "My classes | LevelUp",
};

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "Africa/Cairo",
    weekday: "short",
  }).format(value);
}

export default async function TeacherClassesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ exam?: string | string[]; group?: string | string[]; homework?: string | string[]; session?: string | string[] }> }>) {
  const context = await getCurrentTeacherClassroomContext();
  if (!context) notFound();

  const [groups, params] = await Promise.all([getTeacherClassroomOverview(context), searchParams]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">

        <section className="flex flex-col justify-between gap-5 py-10 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Classroom</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Keep every class record in one clear place.</h1>
          </div>
          {groups.length > 0 && (
            <form action="/app/teacher/classes" className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_auto]">
              <label className="sr-only" htmlFor="teacher-group">Class</label>
              <select className="h-10 min-w-0 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={firstValue(params.group) || groups[0]?.id} id="teacher-group" name="group">
                {groups.map((group) => <option key={group.id} value={group.id}>{group.subjectName} - {group.name}</option>)}
              </select>
              <button className="h-10 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff]" type="submit">Open class</button>
            </form>
          )}
        </section>

        {!groups.length ? (
          <section className="border-y border-white/10 py-16 text-center">
            <BookOpenCheck aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
            <h2 className="mt-4 text-xl font-semibold">No active classes are assigned to you.</h2>
          </section>
        ) : (
          <TeacherClassroomContent groups={groups} params={params} />
        )}
    </div>
  );
}

async function TeacherClassroomContent({
  groups,
  params,
}: {
  groups: Awaited<ReturnType<typeof getTeacherClassroomOverview>>;
  params: { exam?: string | string[]; group?: string | string[]; homework?: string | string[]; session?: string | string[] };
}) {
  const requestedGroupId = firstValue(params.group);
  const group = groups.find((candidate) => candidate.id === requestedGroupId) ?? groups[0];
  if (!group) return null;

  const now = new Date();
  const completedSessions = group.sessions.filter((session) => session.endsAt <= now);
  const requestedSessionId = firstValue(params.session);
  const selectedSessionId = completedSessions.some((session) => session.id === requestedSessionId)
    ? requestedSessionId
    : completedSessions[0]?.id;
  const requestedHomeworkId = firstValue(params.homework);
  const selectedHomeworkId = group.assignments.some((item) => item.id === requestedHomeworkId)
    ? requestedHomeworkId
    : group.assignments[0]?.id;
  const requestedExamId = firstValue(params.exam);
  const selectedExamId = group.exams.some((item) => item.id === requestedExamId)
    ? requestedExamId
    : group.exams[0]?.id;

  const context = await getCurrentTeacherClassroomContext();
  if (!context) notFound();
  const [attendance, homeworkScorebook, examScorebook] = await Promise.all([
    getTeacherAttendanceWorkspace(context, group.id, selectedSessionId),
    selectedHomeworkId ? getTeacherHomeworkScorebook(context, group.id, selectedHomeworkId) : Promise.resolve(null),
    selectedExamId ? getTeacherExamScorebook(context, group.id, selectedExamId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-4 border-y border-white/10 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#b9c6ff]">{group.subjectName}</p>
          <h2 className="mt-1 text-2xl font-semibold">{group.name}</h2>
        </div>
        <p className="text-sm text-slate-400">{attendance.roster.length} active student{attendance.roster.length === 1 ? "" : "s"}</p>
      </section>

      <section aria-labelledby="attendance-heading" className="border-y border-white/10 py-6">
        <div className="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Attendance</p>
            <h2 className="mt-2 text-xl font-semibold" id="attendance-heading">Record the class that just happened.</h2>
          </div>
          {completedSessions.length > 0 && (
            <form action="/app/teacher/classes" className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
              <input name="group" type="hidden" value={group.id} />
              {selectedHomeworkId && <input name="homework" type="hidden" value={selectedHomeworkId} />}
              {selectedExamId && <input name="exam" type="hidden" value={selectedExamId} />}
              <select className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={attendance.session?.id ?? ""} name="session">
                {completedSessions.map((session) => <option key={session.id} value={session.id}>{formatDateTime(session.startsAt)}</option>)}
              </select>
              <button className="h-10 border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" type="submit">Choose class</button>
            </form>
          )}
        </div>
        {attendance.session ? (
          <TeacherAttendanceEditor workspace={attendance} />
        ) : (
          <div className="py-10 text-center text-sm text-slate-400"><CalendarClock aria-hidden="true" className="mx-auto mb-3 text-[#9db2ff]" size={22} />There is no finished class ready for attendance yet.</div>
        )}
      </section>

      <section aria-labelledby="create-assessment-heading" className="border-y border-white/10 py-6">
        <div className="pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Assessments</p>
          <h2 className="mt-2 text-xl font-semibold" id="create-assessment-heading">Add the work students should be measured on.</h2>
        </div>
        <TeacherAssessmentCreateForms groupId={group.id} />
      </section>

      <section aria-labelledby="homework-heading" className="border-y border-white/10 py-6">
        <div className="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Homework</p>
            <h2 className="mt-2 text-xl font-semibold" id="homework-heading">Enter marked homework scores.</h2>
          </div>
          {group.assignments.length > 0 && (
            <form action="/app/teacher/classes" className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
              <input name="group" type="hidden" value={group.id} />
              {selectedSessionId && <input name="session" type="hidden" value={selectedSessionId} />}
              {selectedExamId && <input name="exam" type="hidden" value={selectedExamId} />}
              <select className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={selectedHomeworkId ?? ""} name="homework">
                {group.assignments.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.maxScore} points</option>)}
              </select>
              <button className="h-10 border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" type="submit">Open homework</button>
            </form>
          )}
        </div>
        {homeworkScorebook ? <TeacherScoreEditor kind="homework" scorebook={homeworkScorebook} /> : <p className="py-10 text-center text-sm text-slate-400"><ClipboardCheck aria-hidden="true" className="mx-auto mb-3 text-[#9db2ff]" size={22} />Create homework before entering scores.</p>}
      </section>

      <section aria-labelledby="exam-heading" className="border-y border-white/10 py-6">
        <div className="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9db2ff]">Exams</p>
            <h2 className="mt-2 text-xl font-semibold" id="exam-heading">Enter exam results when they are ready.</h2>
          </div>
          {group.exams.length > 0 && (
            <form action="/app/teacher/classes" className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
              <input name="group" type="hidden" value={group.id} />
              {selectedSessionId && <input name="session" type="hidden" value={selectedSessionId} />}
              {selectedHomeworkId && <input name="homework" type="hidden" value={selectedHomeworkId} />}
              <select className="h-10 border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#9db2ff]/60" defaultValue={selectedExamId ?? ""} name="exam">
                {group.exams.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.maxScore} points</option>)}
              </select>
              <button className="h-10 border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white" type="submit">Open exam</button>
            </form>
          )}
        </div>
        {examScorebook ? <TeacherScoreEditor kind="exam" scorebook={examScorebook} /> : <p className="py-10 text-center text-sm text-slate-400"><FilePenLine aria-hidden="true" className="mx-auto mb-3 text-[#9db2ff]" size={22} />Create an exam before entering results.</p>}
      </section>
    </div>
  );
}
