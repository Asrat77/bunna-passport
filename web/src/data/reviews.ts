import type { ReviewTag } from "@/api/types";
import type { Key } from "@/i18n/context";

/** The quick tags the apps offer, in the order they show. Mirrors CheckIn::TAGS. */
export const REVIEW_TAGS: readonly ReviewTag[] = [
  "great_coffee",
  "cozy",
  "friendly_staff",
  "quick_service",
  "good_for_work",
  "good_value",
  "quiet",
  "lively",
];

/** At most this many tags on one visit. Mirrors CheckIn::MAX_TAGS. */
export const MAX_TAGS = 4;

/** Drinks offered as chips, saved as these codes. Mirrors CheckIn::DRINKS. */
export const DRINKS = ["macchiato", "buna", "spris", "espresso", "latte"] as const;
export type Drink = (typeof DRINKS)[number];

/** The price input accepts what the server does. */
export const PRICE_MAX_BIRR = 5000;

type T = (key: Key, values?: Record<string, string | number>) => string;

export function isDrink(value: string | null | undefined): value is Drink {
  return !!value && (DRINKS as readonly string[]).includes(value);
}

/** A drink code in the reader's language; free text from older visits as written. */
export function drinkLabel(drink: string, t: T): string {
  return isDrink(drink) ? t(`drink.${drink}`) : drink;
}

/** "Today", "Yesterday", "3 days ago", or the date for anything older than a month. */
export function reviewDate(iso: string, t: T, language: string, now = new Date()): string {
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return t("review.today");
  if (days === 1) return t("review.yesterday");
  if (days < 30) return t("review.daysAgo", { count: days });
  return then.toLocaleDateString(language === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}
