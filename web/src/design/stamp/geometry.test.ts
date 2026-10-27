import { describe, expect, it } from "vitest";
import shared from "./__fixtures__/stamp-geometry.json";
import { amharicFontSize, inkNoiseSeed, nameBaselines, nameLayout, ringGlyphs, stampDate, stampRotation } from "./geometry";

describe("ink stamp geometry", () => {
  it("prints short names large on one line", () => {
    expect(nameLayout("TOMOCA")).toEqual({ lines: ["TOMOCA"], size: 25 });
  });

  it("breaks longer names over two balanced lines instead of shrinking them", () => {
    expect(nameLayout("KALDI'S COFFEE")).toEqual({ lines: ["KALDI'S", "COFFEE"], size: 20 });
    expect(nameLayout("GARDEN OF COFFEE BOLE ATLAS BRANCH").lines[1]).toMatch(/…$/);
    expect(nameLayout("GARDEN OF COFFEE BOLE ATLAS BRANCH").size).toBe(10);
  });

  it("keeps the ring band's glyphs on their arcs", () => {
    for (const glyph of ringGlyphs()) {
      const r = Math.hypot(glyph.x - 116, glyph.y - 116);
      expect([86, 95].some((arc) => Math.abs(arc - r) < 0.05)).toBe(true);
    }
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
    for (const [name, { lines, size, baselines }] of Object.entries(shared.nameLayout)) {
      const layout = nameLayout(name.toUpperCase());
      expect(layout).toEqual({ lines, size });
      expect(nameBaselines(layout)).toEqual(baselines);
    }
    for (const [text, size] of Object.entries(shared.amharicFontSize)) {
      expect(amharicFontSize(text)).toBe(size);
    }
    expect(ringGlyphs()).toEqual(shared.ringGlyphs);
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
