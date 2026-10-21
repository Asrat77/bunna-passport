import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT, PAGE_WIDTH, paginate, placeOnPage } from "./layout";

describe("passport page layout", () => {
  it("places a stamp in the same spot every visit", () => {
    expect(placeOnPage(2, 41)).toEqual(placeOnPage(2, 41));
  });

  it("keeps every stamp on the page and tilted within ±12°", () => {
    for (let id = 1; id < 300; id++) {
      for (let slot = 0; slot < 5; slot++) {
        const p = placeOnPage(slot, id);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(20);
        expect(p.x + p.size).toBeLessThanOrEqual(PAGE_WIDTH + 6);
        expect(p.y + p.size).toBeLessThanOrEqual(PAGE_HEIGHT + 6);
        expect(Math.abs(p.rotation)).toBeLessThanOrEqual(12);
      }
    }
  });

  it("fills pages of five and always has at least one", () => {
    expect(paginate([1, 2, 3, 4, 5, 6]).map((page) => page.length)).toEqual([5, 1]);
    expect(paginate([])).toEqual([[]]);
  });
});
