import { describe, expect, it } from "vitest";
import { addisCoffeeDay, shiftDay } from "./coffeeDay";

describe("addisCoffeeDay", () => {
  it("rolls over at 04:00 Addis time", () => {
    expect(addisCoffeeDay(new Date("2026-10-23T00:59:00Z"))).toBe("2026-10-22"); // 03:59 in Addis
    expect(addisCoffeeDay(new Date("2026-10-23T01:00:00Z"))).toBe("2026-10-23"); // 04:00 in Addis
    expect(addisCoffeeDay(new Date("2026-10-23T20:30:00Z"))).toBe("2026-10-23"); // 23:30 in Addis
  });

  it("shifts across month ends", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
  });
});
