import { describe, expect, it } from "vitest";
import { miniappAm, miniappEn } from "./miniapp";

describe("Mini App strings", () => {
  it("has an Amharic entry for every English one, with the same placeholders", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const [key, english] of Object.entries(miniappEn)) {
      const amharic = miniappAm[key as keyof typeof miniappEn];
      expect(amharic, key).toBeTruthy();
      expect(placeholders(amharic), key).toEqual(placeholders(english));
    }
  });
});
