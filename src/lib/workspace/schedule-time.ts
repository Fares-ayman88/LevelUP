export type CalendarDate = {
  day: number;
  month: number;
  year: number;
};

function zonedParts(value: Date, timeZone: string): CalendarDate & { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));

  return {
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    month: values.month ?? 1,
    second: values.second ?? 0,
    year: values.year ?? 1970,
  };
}

function offsetAt(value: Date, timeZone: string): number {
  const parts = zonedParts(value, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - value.getTime();
}

export function dateForScheduleWeekday(now: Date, weekday: number, weeksAhead: number, timeZone: string): CalendarDate {
  const today = zonedParts(now, timeZone);
  const currentDate = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const targetDay = (weekday + 6) % 7;
  const daysUntilTarget = (targetDay - currentDate.getUTCDay() + 7) % 7;
  currentDate.setUTCDate(currentDate.getUTCDate() + daysUntilTarget + (weeksAhead * 7));

  return {
    day: currentDate.getUTCDate(),
    month: currentDate.getUTCMonth() + 1,
    year: currentDate.getUTCFullYear(),
  };
}

export function zonedDateTimeToUtc(date: CalendarDate, clock: string, timeZone: string): Date {
  const [hoursText = "0", minutesText = "0", secondsText = "0"] = clock.slice(0, 8).split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day, hours, minutes, seconds);
  const initialOffset = offsetAt(new Date(utcGuess), timeZone);
  let timestamp = utcGuess - initialOffset;
  const correctedOffset = offsetAt(new Date(timestamp), timeZone);

  if (correctedOffset !== initialOffset) timestamp = utcGuess - correctedOffset;
  return new Date(timestamp);
}
