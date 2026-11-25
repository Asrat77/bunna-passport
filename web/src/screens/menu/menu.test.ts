import { describe, expect, it } from "vitest";
import { menuNames } from "./Menu";

describe("menuNames", () => {
  it("puts the reader's language first", () => {
    const item = { name: "Macchiato", name_am: "ማኪያቶ" };
    expect(menuNames(item, "am")).toEqual([{ text: "ማኪያቶ", lang: "am" }, { text: "Macchiato", lang: "en" }]);
    expect(menuNames(item, "en")).toEqual([{ text: "Macchiato", lang: "en" }, { text: "ማኪያቶ", lang: "am" }]);
  });

  it("falls back to English when there's no Amharic name", () => {
    expect(menuNames({ name: "Croissant", name_am: null }, "am")).toEqual([{ text: "Croissant", lang: "en" }, null]);
  });
});
