import { ChartNoAxesCombined, Trophy } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentStudentWorkspace } from "@/lib/workspace/student";
import { getStudentProgress, type StudentProgressGroup } from "@/lib/workspace/student-progress";

export const metadata = {
  title: "My progress | LevelUp",
};

function componentLabel(component: "attendance" | "homework" | "exams"): string {
  if (component === "attendance") return "Attendance";
  if (component === "homework") return "Homework";
  return "Exams";
}

function ProgressComponent({
  label,
  progress,
}: {
  label: string;
  progress: StudentProgressGroup["attendance"];
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="shrink-0 text-slate-400">{progress.score === null ? "Waiting" : `${progress.score}%`}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden bg-white/8" role="progressbar" aria-label={`${label} progress`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress.score ?? 0}>
        <div className="h-full bg-[#9db2ff] transition-[width] duration-500" style={{ width: `${progress.score ?? 0}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{progress.possible ? `${progress.value} of ${progress.possible}` : "No graded work yet"}</p>
    </div>
  );
}

export default async function StudentProgressPage() {
  const context = await getCurrentStudentWorkspace();
  if (!context) notFound();

  const groups = await getStudentProgress(context);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">Your progress</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">See what is moving you forward.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Your score uses attendance, marked homework, and scored exams. Components without results are reweighted instead of counting against you.</p>
      </section>

      {groups.length ? (
        <section className="space-y-5">
          {groups.map((group) => (
            <article className="border border-white/10 bg-white/[0.025] p-5 sm:p-6" key={group.groupId}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-[#b9c6ff]">{group.subjectName}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{group.groupName}</h2>
                </div>
                {group.overallScore === null ? (
                  <span className="text-sm font-semibold text-slate-400">Waiting for results</span>
                ) : (
                  <div className="sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current score</p>
                    <p className="mt-1 text-3xl font-semibold">{group.overallScore}%</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-5 border-y border-white/8 py-5 sm:grid-cols-3">
                <ProgressComponent label={componentLabel("attendance")} progress={group.attendance} />
                <ProgressComponent label={componentLabel("homework")} progress={group.homework} />
                <ProgressComponent label={componentLabel("exams")} progress={group.exams} />
              </div>

              <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                {group.rank !== null ? (
                  <p className="inline-flex items-center gap-2 font-medium text-slate-200"><Trophy aria-hidden="true" className="text-[#9db2ff]" size={16} />Rank #{group.rank} of {group.comparableStudents} scored students{group.percentile !== null ? ` - ahead of ${group.percentile}%` : ""}</p>
                ) : (
                  <p className="inline-flex items-center gap-2 text-slate-400"><ChartNoAxesCombined aria-hidden="true" size={16} />Your group rank will appear after results are recorded.</p>
                )}
                {group.nextFocus && <p className="text-slate-400">Next focus: <span className="font-semibold text-slate-200">{group.nextFocus}</span></p>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="border-y border-white/10 py-16 text-center">
          <ChartNoAxesCombined aria-hidden="true" className="mx-auto text-[#9db2ff]" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No active group progress yet.</h2>
          <p className="mt-2 text-sm text-slate-400">Progress appears after you join an active group and your center records results.</p>
        </section>
      )}
    </div>
  );
}
