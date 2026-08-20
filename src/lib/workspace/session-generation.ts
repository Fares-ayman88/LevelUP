import "server-only";

import { and, eq } from "drizzle-orm";

import { academicGroups, groupSchedules, groupSessions, organizations } from "@/db/schema";
import { getDatabase } from "@/db/client";

import { dateForScheduleWeekday, zonedDateTimeToUtc } from "./schedule-time";

const SESSION_HORIZON_DAYS = 28;

function sessionEndAt(date: ReturnType<typeof dateForScheduleWeekday>, startsAt: string, endsAt: string, timeZone: string): Date {
  const start = zonedDateTimeToUtc(date, startsAt, timeZone);
  let end = zonedDateTimeToUtc(date, endsAt, timeZone);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return end;
}

export async function generateUpcomingGroupSessions(now = new Date()): Promise<number> {
  const db = getDatabase();
  const horizon = new Date(now.getTime() + (SESSION_HORIZON_DAYS * 24 * 60 * 60 * 1000));
  const schedules = await db
    .select({
      endsAt: groupSchedules.endsAt,
      groupId: groupSchedules.groupId,
      organizationId: groupSchedules.organizationId,
      scheduleId: groupSchedules.id,
      startsAt: groupSchedules.startsAt,
      timeZone: organizations.timezone,
      weekday: groupSchedules.weekday,
    })
    .from(groupSchedules)
    .innerJoin(
      academicGroups,
      and(
        eq(groupSchedules.groupId, academicGroups.id),
        eq(groupSchedules.organizationId, academicGroups.organizationId),
        eq(academicGroups.status, "active"),
      ),
    )
    .innerJoin(organizations, eq(groupSchedules.organizationId, organizations.id));

  const sessions = schedules.flatMap((schedule) => {
    const values = [];
    for (let week = 0; week <= Math.ceil(SESSION_HORIZON_DAYS / 7); week += 1) {
      const date = dateForScheduleWeekday(now, schedule.weekday, week, schedule.timeZone);
      const startsAt = zonedDateTimeToUtc(date, schedule.startsAt, schedule.timeZone);
      if (startsAt < now || startsAt > horizon) continue;

      values.push({
        endsAt: sessionEndAt(date, schedule.startsAt, schedule.endsAt, schedule.timeZone),
        groupId: schedule.groupId,
        groupScheduleId: schedule.scheduleId,
        organizationId: schedule.organizationId,
        startsAt,
        status: "scheduled" as const,
      });
    }
    return values;
  });

  if (!sessions.length) return 0;
  const inserted = await db.insert(groupSessions).values(sessions).onConflictDoNothing().returning({ id: groupSessions.id });
  return inserted.length;
}
