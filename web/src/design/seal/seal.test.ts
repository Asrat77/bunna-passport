import { describe, expect, it } from "vitest";
import { nextLevel, visitsToNextLevel } from "./levels";

describe("levels", () => {
  it("counts visits to the next level", () => {
    expect(visitsToNextLevel(1)).toBe(4);
    expect(nextLevel(1)).toBe("silver");
    expect(visitsToNextLevel(30)).toBeNull();
  });
});
