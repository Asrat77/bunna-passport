import type { CheckIn } from "@/api/types";

/** Monday 00:00 in Addis of the week containing `at`, as a UTC millisecond key. */
function weekKey(at: Date): number {
  const addis = new Date(at.getTime() + 3 * 3600_000);
  const day = (addis.getUTCDay() + 6) % 7;
  return Date.UTC(addis.getUTCFullYear(), addis.getUTCMonth(), addis.getUTCDate() - day);
}

const WEEK = 7 * 24 * 3600_000;

/**
 * Consecutive weeks with at least one accepted check-in (DESIGN.md §6.4).
 * Forgiving: a week that hasn't had its cup yet doesn't break the streak
 * until it's over, so the count runs back from last week when this one is
 * still empty.
 */
export function coffeeWeeks(checkIns: Pick<CheckIn, "status" | "occurred_at">[], now = new Date()): number {
  const weeks = new Set(
    checkIns.filter((c) => c.status === "accepted").map((c) => weekKey(new Date(c.occurred_at))),
  );
  let cursor = weekKey(now);
  if (!weeks.has(cursor)) cursor -= WEEK;
  let count = 0;
  while (weeks.has(cursor)) {
    count++;
    cursor -= WEEK;
  }
  return count;
}
