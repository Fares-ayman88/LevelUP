export type TeacherClassroomActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialTeacherClassroomActionState: TeacherClassroomActionState = { status: "idle" };
