export type CenterPeopleActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialCenterPeopleActionState: CenterPeopleActionState = { status: "idle" };
