const ADDIS_OFFSET_HOURS = 3;
const DAY_STARTS_AT = 4;

/**
 * The coffee day it is in Addis, as YYYY-MM-DD. Like the server's, it starts
 * at 04:00, so a late night still counts toward the evening before. Addis
 * keeps UTC+3 all year.
 */
export function addisCoffeeDay(now: Date): string {
  return new Date(now.getTime() + (ADDIS_OFFSET_HOURS - DAY_STARTS_AT) * 3_600_000).toISOString().slice(0, 10);
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
