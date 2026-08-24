export type CenterPeopleActionState = {
  message?: string;
  status: "error" | "idle" | "success";
  studentAccessCode?: string;
  studentName?: string;
};

export const initialCenterPeopleActionState: CenterPeopleActionState = { status: "idle" };
