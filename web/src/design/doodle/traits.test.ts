import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateDoodle, type Mood } from "./generate";
import { cleanTraits, TRAIT_KEYS, TRAIT_OPTIONS, type AvatarTraits } from "./traits";

const FIXTURE = fileURLToPath(new URL("./__fixtures__/editor-doodles.json", import.meta.url));

/**
 * Faces with every option in the catalogue at least once, across seeds that
 * drew different originals. The share card's Ruby port is checked against
 * the same file (test/models/share_card/doodle_test.rb), so a face edited on
 * the phone is the face on the card. Regenerate with UPDATE_FIXTURES=1 after a
 * deliberate drawing change, and port the change to Ruby.
 */
function cases(): Array<[string, Mood, Partial<AvatarTraits>]> {
  const seeds = ["meklit", "abebe", "tigist", "dawit", "42-3"];
  const list: Array<[string, Mood, Partial<AvatarTraits>]> = [];
  let n = 0;
  for (const key of TRAIT_KEYS) {
    for (const value of TRAIT_OPTIONS[key]) {
      const seed = seeds[n % seeds.length];
      // A hat hides most hair, so hair styles are drawn bare.
      const traits: Partial<AvatarTraits> = key === "hair" ? { hair: value, hat: "none" } : { [key]: value };
      // Pair each option with a different colourway so colours get drawn too.
      traits.skin ??= TRAIT_OPTIONS.skin[n % TRAIT_OPTIONS.skin.length];
      traits.hair_color ??= TRAIT_OPTIONS.hair_color[(n + 2) % TRAIT_OPTIONS.hair_color.length];
      traits.eye_color ??= TRAIT_OPTIONS.eye_color[(n + 1) % TRAIT_OPTIONS.eye_color.length];
      for (const mood of ["awake", "sleepy"] as const) list.push([seed, mood, traits]);
      n++;
    }
  }
  list.push(["abebe", "awake", { hat: "cap", hair: "long", headphones: "headphones", facial_hair: "beard", glasses: "shades", earrings: "hoops" }]);
  list.push(["tigist", "sleepy", { hat: "wrap", hair: "locs", headphones: "headphones", freckles: "freckles", facial_hair: "stubble" }]);
  return list;
}

function draw() {
  return Object.fromEntries(
    cases().map(([seed, mood, traits]) => {
      const { hash: _hash, ...paths } = generateDoodle(seed, mood, traits);
      return [`${seed}|${mood}|${JSON.stringify(traits)}`, paths];
    }),
  );
}

describe("editor faces", () => {
  if (process.env.UPDATE_FIXTURES) writeFileSync(FIXTURE, `${JSON.stringify(draw(), null, 1)}\n`);

  it("draw exactly as the committed fixture", () => {
    expect(existsSync(FIXTURE)).toBe(true);
    expect(draw()).toEqual(JSON.parse(readFileSync(FIXTURE, "utf8")));
  });

  it("change only the part that was edited", () => {
    const before = generateDoodle("meklit", "awake");
    const after = generateDoodle("meklit", "awake", { glasses: "square" });
    expect(after.glasses).not.toBe(before.glasses);
    for (const part of ["head", "hairFill", "hairLine", "nose", "mouth", "dots", "eyes"] as const) {
      expect(after[part]).toBe(before[part]);
    }
  });

  it("keep freckles where they were when stubble is added", () => {
    const freckled = generateDoodle("meklit", "awake", { freckles: "freckles", facial_hair: "none" });
    const stubbled = generateDoodle("meklit", "awake", { freckles: "freckles", facial_hair: "stubble" });
    expect(stubbled.dots.endsWith(freckled.dots)).toBe(true);
  });

  it("fill in the seed's own traits when nothing is chosen", () => {
    const { traits } = generateDoodle("meklit", "awake");
    for (const key of TRAIT_KEYS) expect(TRAIT_OPTIONS[key]).toContain(traits[key]);
    expect(traits.skin).toBe("paper");
    expect(traits.hair_color).toBe("graphite");
  });
});

describe("cleanTraits", () => {
  it("keeps known traits and drops anything else", () => {
    expect(cleanTraits({ hair: "afro", skin: "plaid", wings: "yes", glasses: 3 })).toEqual({ hair: "afro" });
    expect(cleanTraits(null)).toEqual({});
  });
});

describe("catalog", () => {
  it("matches the server's copy in app/models/avatar.rb", () => {
    const ruby = readFileSync(fileURLToPath(new URL("../../../../app/models/avatar.rb", import.meta.url)), "utf8");
    for (const key of TRAIT_KEYS) {
      expect(ruby, key).toContain(`"${key}" => %w[${TRAIT_OPTIONS[key].join(" ")}]`);
    }
  });
});
