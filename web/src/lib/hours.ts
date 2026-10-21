import type { WeeklyHours, Weekday } from "@/api/types";

export type OpenStatus = "open" | "closingSoon" | "closed" | "unknown";

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const CLOSING_SOON_MINUTES = 45;

const minutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Wall-clock weekday and minute in Addis, wherever the phone thinks it is. */
function addisNow(now: Date): { day: Weekday; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: get("weekday").toLowerCase() as Weekday,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Whether a shop is open now by its published schedule. A schedule that has
 * nothing at all is "unknown", not closed: most shops' hours aren't mapped yet.
 * Intervals that close past midnight carry into the next morning.
 */
export function openStatus(schedule: WeeklyHours | undefined, now = new Date()): OpenStatus {
  if (!schedule || Object.keys(schedule).length === 0) return "unknown";
  const { day, minute } = addisNow(now);
  const yesterday = WEEKDAYS[(WEEKDAYS.indexOf(day) + 6) % 7];

  const windows: [number, number][] = [];
  for (const { opens, closes } of schedule[day] ?? []) {
    const start = minutes(opens);
    const end = minutes(closes);
    windows.push([start, end > start ? end : end + 24 * 60]);
  }
  for (const { opens, closes } of schedule[yesterday] ?? []) {
    const start = minutes(opens);
    const end = minutes(closes);
    if (end <= start) windows.push([0, end]);
  }

  const current = windows.find(([start, end]) => minute >= start && minute < end);
  if (!current) return "closed";
  return current[1] - minute <= CLOSING_SOON_MINUTES ? "closingSoon" : "open";
}
