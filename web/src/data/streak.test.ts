import { describe, expect, it } from "vitest";
import { coffeeWeeks } from "./streak";

const accepted = (iso: string) => ({ status: "accepted" as const, occurred_at: iso });
// Wednesday 21 October 2026, Addis.
const now = new Date("2026-10-21T09:00:00Z");

describe("coffeeWeeks", () => {
  it("counts back through consecutive weeks", () => {
    expect(coffeeWeeks([accepted("2026-10-20T08:00:00Z"), accepted("2026-10-14T08:00:00Z"), accepted("2026-10-06T08:00:00Z")], now)).toBe(3);
  });

  it("doesn't break the streak before this week is over", () => {
    expect(coffeeWeeks([accepted("2026-10-14T08:00:00Z"), accepted("2026-10-07T08:00:00Z")], now)).toBe(2);
  });

  it("stops at a missed week and ignores rejected visits", () => {
    expect(
      coffeeWeeks([accepted("2026-10-20T08:00:00Z"), { status: "rejected", occurred_at: "2026-10-13T08:00:00Z" }, accepted("2026-10-06T08:00:00Z")], now),
    ).toBe(1);
  });
});
