import { describe, expect, it } from "vitest";
import canvas from "./__fixtures__/canvas-doodles.json";
import { generateDoodle, shuffleSeeds, type Mood } from "./generate";

/**
 * The fixture was produced by running the design canvas's own generator
 * (Doodle.dc.html) over these seeds, so a mismatch means the port drifted.
 */
describe("generateDoodle", () => {
  for (const [key, expected] of Object.entries(canvas)) {
    const [seed, mood] = key.split("|") as [string, Mood];
    it(`draws ${seed} ${mood} exactly as the canvas does`, () => {
      const { hash: _hash, ...paths } = generateDoodle(seed, mood);
      expect(paths).toEqual(expected);
    });
  }

  it("draws the same face for the same seed every time", () => {
    expect(generateDoodle("abebe", "awake")).toEqual(generateDoodle("abebe", "awake"));
  });

  it("keeps the face when only the mood changes", () => {
    const sleepy = generateDoodle("abebe", "sleepy");
    const awake = generateDoodle("abebe", "awake");
    for (const part of ["head", "headStroke", "hairFill", "hairLine", "nose", "glasses", "neck"] as const) {
      expect(awake[part]).toBe(sleepy[part]);
    }
    expect(awake.eyes + awake.pupils).not.toBe(sleepy.eyes + sleepy.pupils);
  });

  it("draws different faces for different seeds", () => {
    expect(generateDoodle("a", "awake").head).not.toBe(generateDoodle("b", "awake").head);
  });
});

describe("shuffleSeeds", () => {
  it("leads with your own face, then numbers candidates from the base seed", () => {
    expect(shuffleSeeds("42", 0)).toEqual(["42", "42-1", "42-2", "42-3", "42-4", "42-5", "42-6", "42-7"]);
    expect(shuffleSeeds("42", 1)).toEqual(["42-8", "42-9", "42-10", "42-11", "42-12", "42-13", "42-14", "42-15"]);
  });
});
