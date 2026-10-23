import { describe, expect, it } from "vitest";
import shared from "./__fixtures__/stamp-geometry.json";
import { inkNoiseSeed, nameFontSize, stampDate, stampRotation } from "./geometry";

describe("ink stamp geometry", () => {
  it("shrinks long names to fit the inner ring", () => {
    expect(nameFontSize("TOMOCA")).toBe(25);
    expect(nameFontSize("ALEM BUNNA HOUSE")).toBeCloseTo(138 / (16 * 0.7 + 0.2));
  });

  it("seeds the ink texture from the shop name, as the canvas does", () => {
    // The canvas seeds TOMOCA's ink with (fnv1a("TOMOCA") % 89) + 2.
    expect(inkNoiseSeed("TOMOCA")).toBe(inkNoiseSeed("TOMOCA"));
    expect(inkNoiseSeed("TOMOCA")).toBeGreaterThanOrEqual(2);
    expect(inkNoiseSeed("TOMOCA")).toBeLessThanOrEqual(90);
  });

  it("tilts each stamp the same way every time, within ±12°", () => {
    const keys = Array.from({ length: 200 }, (_, i) => `stamp-${i}`);
    for (const key of keys) {
      const rotation = stampRotation(key);
      expect(rotation).toBe(stampRotation(key));
      expect(Math.abs(rotation)).toBeLessThanOrEqual(12);
    }
    expect(new Set(keys.map(stampRotation)).size).toBeGreaterThan(50);
  });

  // The server-rendered share card (app/models/share_card/ink_stamp.rb) checks
  // the same fixture, so the card prints the stamp the ceremony showed.
  it("matches the fixture the share card renderer is tested against", () => {
    for (const [name, size] of Object.entries(shared.nameFontSize)) {
      expect(nameFontSize(name.toUpperCase())).toBe(size);
    }
    for (const [name, seed] of Object.entries(shared.inkNoiseSeed)) {
      expect(inkNoiseSeed(name)).toBe(seed);
    }
    for (const [key, rotation] of Object.entries(shared.stampRotation)) {
      expect(stampRotation(key)).toBe(rotation);
    }
  });

  it("prints dates like a rubber stamp", () => {
    expect(stampDate("2026-10-21T09:30:00+03:00")).toMatch(/^2[01] OCT 2026$/);
  });
});
