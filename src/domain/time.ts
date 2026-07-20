import type { DailyWindow, DateTime } from "./models";

export const MINUTE = 60_000;

export function addMinutes(value: DateTime, minutes: number): DateTime {
  return new Date(new Date(value).getTime() + minutes * MINUTE).toISOString();
}

export function dayAndMinuteInChicago(value: DateTime): {
  dayOfWeek: number;
  minuteOfDay: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { dayOfWeek: days[weekday ?? "Sun"], minuteOfDay: hour * 60 + minute };
}

export function overlapsDailyWindow(
  start: DateTime,
  durationMinutes: number,
  windows: DailyWindow[],
): boolean {
  const local = dayAndMinuteInChicago(start);
  const endMinute = local.minuteOfDay + durationMinutes;
  return windows.some(
    (window) =>
      window.dayOfWeek === local.dayOfWeek &&
      local.minuteOfDay < window.endMinute &&
      endMinute > window.startMinute,
  );
}

export function containedInDailyWindow(
  start: DateTime,
  durationMinutes: number,
  windows: DailyWindow[],
): boolean {
  const local = dayAndMinuteInChicago(start);
  const endMinute = local.minuteOfDay + durationMinutes;
  return windows.some(
    (window) =>
      window.dayOfWeek === local.dayOfWeek &&
      local.minuteOfDay >= window.startMinute &&
      endMinute <= window.endMinute,
  );
}
