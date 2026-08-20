"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  classroomAttendanceStatuses,
  createTeacherExam,
  createTeacherHomeworkAssignment,
  saveTeacherAttendance,
  saveTeacherExamScores,
  saveTeacherHomeworkScores,
  TeacherClassroomError,
} from "@/lib/workspace/teacher-classroom";
import {
  initialTeacherClassroomActionState,
  type TeacherClassroomActionState,
} from "@/lib/workspace/teacher-classroom-state";

const uuidSchema = z.string().uuid();
const scoreSchema = z.number().int().min(0).max(10_000).nullable();
const homeworkSchema = z.object({
  groupId: uuidSchema,
  instructions: z.string().trim().max(2_000),
  maxScore: z.coerce.number().int().min(1).max(10_000),
  title: z.string().trim().min(3).max(200),
});
const examSchema = homeworkSchema.pick({ groupId: true, maxScore: true, title: true });

function actionError(message: string): TeacherClassroomActionState {
  return { ...initialTeacherClassroomActionState, message, status: "error" };
}

function revalidateTeacherAcademicPaths(): void {
  revalidatePath("/app/teacher/classes");
  revalidatePath("/app/student/progress");
}

function parseAttendanceRecords(formData: FormData): Array<{ enrollmentId: string; status: (typeof classroomAttendanceStatuses)[number] }> | null {
  const records = Array.from(formData.entries()).flatMap(([key, value]) => {
    if (!key.startsWith("attendance:")) return [];
    const enrollmentId = key.slice("attendance:".length);
    const parsed = z.object({
      enrollmentId: uuidSchema,
      status: z.enum(classroomAttendanceStatuses),
    }).safeParse({ enrollmentId, status: value });
    return parsed.success ? [parsed.data] : [];
  });

  const hasInvalidRecord = Array.from(formData.keys()).some((key) => key.startsWith("attendance:") && !records.some((record) => key === `attendance:${record.enrollmentId}`));
  return hasInvalidRecord || !records.length || records.length > 300 ? null : records;
}

function parseScoreRecords(formData: FormData, prefix: "homework:" | "exam:"): Array<{ enrollmentId: string; score: number | null }> | null {
  const rawEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith(prefix));
  if (!rawEntries.length || rawEntries.length > 300) return null;

  const records: Array<{ enrollmentId: string; score: number | null }> = [];
  for (const [key, value] of rawEntries) {
    const enrollmentId = key.slice(prefix.length);
    const rawScore = typeof value === "string" ? value.trim() : "";
    const candidate = rawScore === "" ? null : Number(rawScore);
    const parsed = z.object({ enrollmentId: uuidSchema, score: scoreSchema }).safeParse({ enrollmentId, score: candidate });
    if (!parsed.success) return null;
    records.push(parsed.data);
  }
  return records;
}

export async function saveTeacherAttendanceAction(
  _previousState: TeacherClassroomActionState,
  formData: FormData,
): Promise<TeacherClassroomActionState> {
  const sessionId = uuidSchema.safeParse(formData.get("sessionId"));
  const records = parseAttendanceRecords(formData);
  if (!sessionId.success || !records) return actionError("Check the class and every attendance status, then try again.");

  try {
    await saveTeacherAttendance({ records, sessionId: sessionId.data });
  } catch (error) {
    if (error instanceof TeacherClassroomError) return actionError(error.message);
    throw error;
  }

  revalidateTeacherAcademicPaths();
  return { message: "Attendance saved.", status: "success" };
}

export async function createTeacherHomeworkAction(
  _previousState: TeacherClassroomActionState,
  formData: FormData,
): Promise<TeacherClassroomActionState> {
  const parsed = homeworkSchema.safeParse({
    groupId: formData.get("groupId"),
    instructions: formData.get("instructions") ?? "",
    maxScore: formData.get("maxScore"),
    title: formData.get("title"),
  });
  if (!parsed.success) return actionError("Add a title and a whole-number maximum score.");

  try {
    await createTeacherHomeworkAssignment({
      ...parsed.data,
      instructions: parsed.data.instructions || null,
    });
  } catch (error) {
    if (error instanceof TeacherClassroomError) return actionError(error.message);
    throw error;
  }

  revalidateTeacherAcademicPaths();
  return { message: "Homework created.", status: "success" };
}

export async function createTeacherExamAction(
  _previousState: TeacherClassroomActionState,
  formData: FormData,
): Promise<TeacherClassroomActionState> {
  const parsed = examSchema.safeParse({
    groupId: formData.get("groupId"),
    maxScore: formData.get("maxScore"),
    title: formData.get("title"),
  });
  if (!parsed.success) return actionError("Add an exam title and a whole-number maximum score.");

  try {
    await createTeacherExam(parsed.data);
  } catch (error) {
    if (error instanceof TeacherClassroomError) return actionError(error.message);
    throw error;
  }

  revalidateTeacherAcademicPaths();
  return { message: "Exam created.", status: "success" };
}

export async function saveTeacherHomeworkScoresAction(
  _previousState: TeacherClassroomActionState,
  formData: FormData,
): Promise<TeacherClassroomActionState> {
  const assignmentId = uuidSchema.safeParse(formData.get("assignmentId"));
  const scores = parseScoreRecords(formData, "homework:");
  if (!assignmentId.success || !scores) return actionError("Check each homework score, then try again.");

  try {
    await saveTeacherHomeworkScores({ assignmentId: assignmentId.data, scores });
  } catch (error) {
    if (error instanceof TeacherClassroomError) return actionError(error.message);
    throw error;
  }

  revalidateTeacherAcademicPaths();
  return { message: "Homework scores saved.", status: "success" };
}

export async function saveTeacherExamScoresAction(
  _previousState: TeacherClassroomActionState,
  formData: FormData,
): Promise<TeacherClassroomActionState> {
  const examId = uuidSchema.safeParse(formData.get("examId"));
  const scores = parseScoreRecords(formData, "exam:");
  if (!examId.success || !scores) return actionError("Check each exam score, then try again.");

  try {
    await saveTeacherExamScores({ examId: examId.data, scores });
  } catch (error) {
    if (error instanceof TeacherClassroomError) return actionError(error.message);
    throw error;
  }

  revalidateTeacherAcademicPaths();
  return { message: "Exam scores saved.", status: "success" };
}
