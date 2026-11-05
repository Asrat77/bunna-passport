import { describe, expect, it } from "vitest";
import { drinkLabel, isDrink, reviewDate } from "./reviews";

const t = (key: string, values?: Record<string, string | number>) => (values ? `${key}:${JSON.stringify(values)}` : key);

describe("reviews", () => {
  it("translates drink codes and leaves older free text alone", () => {
    expect(drinkLabel("macchiato", t as never)).toBe("drink.macchiato");
    expect(drinkLabel("ማኪያቶ በወተት", t as never)).toBe("ማኪያቶ በወተት");
    expect(isDrink("latte")).toBe(true);
    expect(isDrink("tea")).toBe(false);
  });

  it("dates a review as today, yesterday, days ago, then a date", () => {
    const now = new Date(2026, 10, 5, 12);
    expect(reviewDate(new Date(2026, 10, 5, 8).toISOString(), t as never, "en", now)).toBe("review.today");
    expect(reviewDate(new Date(2026, 10, 4, 22).toISOString(), t as never, "en", now)).toBe("review.yesterday");
    expect(reviewDate(new Date(2026, 10, 1, 9).toISOString(), t as never, "en", now)).toBe('review.daysAgo:{"count":4}');
    expect(reviewDate(new Date(2026, 8, 1, 9).toISOString(), t as never, "en", now)).toContain("2026");
  });
});
