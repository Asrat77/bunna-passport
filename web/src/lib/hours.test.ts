import { describe, expect, it } from "vitest";
import { openStatus } from "./hours";

// 09:00 and 22:30 on Wednesday 21 October 2026 in Addis (UTC+3).
const morning = new Date("2026-10-21T06:00:00Z");
const lateNight = new Date("2026-10-21T19:30:00Z");

describe("openStatus", () => {
  it("is unknown without a schedule", () => {
    expect(openStatus(undefined, morning)).toBe("unknown");
    expect(openStatus({}, morning)).toBe("unknown");
  });

  it("reads the schedule in Addis time", () => {
    const schedule = { wednesday: [{ opens: "07:00", closes: "20:00" }] };
    expect(openStatus(schedule, morning)).toBe("open");
    expect(openStatus(schedule, lateNight)).toBe("closed");
  });

  it("warns when closing within the hour", () => {
    expect(openStatus({ wednesday: [{ opens: "07:00", closes: "09:30" }] }, morning)).toBe("closingSoon");
  });

  it("carries a late close into the next morning", () => {
    const schedule = { tuesday: [{ opens: "18:00", closes: "02:00" }] };
    expect(openStatus(schedule, new Date("2026-10-20T22:00:00Z"))).toBe("open");
  });
});
