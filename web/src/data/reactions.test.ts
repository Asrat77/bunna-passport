import { describe, expect, it } from "vitest";
import { guessReactions } from "./reactions";

describe("guessReactions", () => {
  it("adds a first reaction", () => {
    expect(guessReactions({ counts: [], mine: null }, "fire")).toEqual({ counts: [{ kind: "fire", count: 1 }], mine: "fire" });
  });

  it("moves yours to another kind without touching others'", () => {
    const before = { counts: [{ kind: "coffee" as const, count: 2 }], mine: "coffee" as const };
    expect(guessReactions(before, "heart")).toEqual({
      counts: [
        { kind: "coffee", count: 1 },
        { kind: "heart", count: 1 },
      ],
      mine: "heart",
    });
  });

  it("takes yours back and drops empty kinds", () => {
    expect(guessReactions({ counts: [{ kind: "clap", count: 1 }], mine: "clap" }, null)).toEqual({ counts: [], mine: null });
  });
});
