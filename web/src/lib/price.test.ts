import { describe, expect, it } from "vitest";
import { miniappAm, miniappEn } from "@/i18n/miniapp";
import { PRICE_LABEL_KEYS } from "./price";

describe("price band labels", () => {
  const keys = Object.values(PRICE_LABEL_KEYS);

  it("has a distinct word for each band in both languages", () => {
    for (const table of [miniappEn, miniappAm]) {
      const labels = keys.map((key) => table[key]);
      labels.forEach((label, i) => expect(label, keys[i]).toBeTruthy());
      expect(new Set(labels).size).toBe(keys.length);
    }
  });

  it("never spells a band as repeated birr signs", () => {
    for (const table of [miniappEn, miniappAm]) {
      for (const key of keys) expect(table[key]).not.toMatch(/(ብር){2,}|birr\s*birr/i);
    }
  });
});
