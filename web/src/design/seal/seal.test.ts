import { describe, expect, it } from "vitest";
import { initialsFor } from "./initials";
import { nextLevel, visitsToNextLevel } from "./levels";

describe("initialsFor", () => {
  it("takes two Latin letters", () => {
    expect(initialsFor("Tomoca")).toBe("TO");
    expect(initialsFor("Alem Bunna")).toBe("AB");
  });

  it("takes one fidel per word for Amharic", () => {
    expect(initialsFor("ቶሞካ")).toBe("ቶሞ");
    expect(initialsFor("ዓለም ቡና")).toBe("ዓቡ");
  });
});

describe("levels", () => {
  it("counts visits to the next level", () => {
    expect(visitsToNextLevel(1)).toBe(4);
    expect(nextLevel(1)).toBe("silver");
    expect(visitsToNextLevel(30)).toBeNull();
  });
});
