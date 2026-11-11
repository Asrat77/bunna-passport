import { describe, expect, it } from "vitest";
import { availableSteps, placeCard, TOUR_STEPS } from "./tourSteps";

describe("availableSteps", () => {
  it("keeps every stop when everything is on screen", () => {
    expect(availableSteps(() => true)).toEqual(TOUR_STEPS);
  });

  it("drops the first-stamp stop once that card is gone", () => {
    const ids = availableSteps((id) => id !== "firstStamp").map((step) => step.id);
    expect(ids).not.toContain("firstStamp");
    expect(ids[ids.length - 1]).toBe("stats");
  });

  it("ends on the first-stamp guide for a new person", () => {
    const ids = availableSteps(() => true).map((step) => step.id);
    expect(ids[ids.length - 1]).toBe("firstStamp");
  });
});

describe("placeCard", () => {
  it("puts the card under something near the top", () => {
    expect(placeCard({ top: 40, left: 0, width: 50, height: 50 }, 800, 200)).toEqual({ top: 108 });
  });

  it("puts the card over something near the bottom, like the dock", () => {
    expect(placeCard({ top: 730, left: 0, width: 48, height: 48 }, 800, 200)).toEqual({ bottom: 88 });
  });

  it("flips to the other side when the preferred one has no room", () => {
    // Middle sits low, but there's no room above a highlight that starts at 150.
    expect(placeCard({ top: 150, left: 0, width: 300, height: 400 }, 1000, 200)).toEqual({ top: 568 });
  });

  it("pins to an edge when a tall highlight leaves no room either side", () => {
    expect(placeCard({ top: 200, left: 0, width: 300, height: 400 }, 800, 220)).toEqual({ top: 12 });
    expect(placeCard({ top: 100, left: 0, width: 300, height: 500 }, 800, 220)).toEqual({ bottom: 12 });
  });
});
