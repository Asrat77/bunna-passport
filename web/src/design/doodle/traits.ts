/**
 * What a person can choose about their profile picture. The seed still draws
 * the face's proportions; traits pick the parts and colours on top of it.
 *
 * A face nobody has edited takes every trait from its seed (seedTraits), and
 * the defaults here ("paper" skin, "graphite" eyes) draw it as the original
 * pencil doodle did, with black hair: hair and hats always have a colour. app/models/avatar.rb keeps the same
 * catalogue for the server; a test checks the two match.
 */
import catalog from "./catalog.json";

export type AvatarTraits = {
  skin: string;
  hair: string;
  hair_color: string;
  eyes: string;
  eye_color: string;
  nose: string;
  facial_hair: string;
  freckles: string;
  glasses: string;
  hat: string;
  headphones: string;
  earrings: string;
};

export type TraitKey = keyof AvatarTraits;

/** Options for every trait, in the order the editor shows them. */
export const TRAIT_OPTIONS = catalog.options as Record<TraitKey, string[]>;

export const TRAIT_KEYS = Object.keys(TRAIT_OPTIONS) as TraitKey[];

/** Fill colours for the coloured traits. "paper" skin and "graphite" eyes are the pencil originals. */
export const SKIN_COLORS = catalog.colors.skin as Record<string, string>;
export const HAIR_COLORS = catalog.colors.hair_color as Record<string, string>;
export const EYE_COLORS = catalog.colors.eye_color as Record<string, string>;

/** The draws the original generator made for its part choices, before anything was editable. */
export type SeedChoices = {
  hairStyle: number;
  eyeStyle: number;
  noseStyle: number;
  hasGlasses: boolean;
  hasStubble: boolean;
  hasFreckles: boolean;
};

// The original six hair styles, by index. A cap or beanie hid the hair, so
// those faces get a buzz cut under the hat if the hat comes off.
const SEED_HAIR: Array<Pick<AvatarTraits, "hair" | "hat">> = [
  { hair: "buzz", hat: "cap" },
  { hair: "afro", hat: "none" },
  { hair: "buzz", hat: "none" },
  { hair: "bald", hat: "none" },
  { hair: "buzz", hat: "beanie" },
  { hair: "side", hat: "none" },
];
const SEED_EYES = ["dot", "round", "almond"];
const SEED_NOSE = ["point", "round", "curve"];

export function traitsFromChoices(choices: SeedChoices): AvatarTraits {
  return {
    skin: "paper",
    ...SEED_HAIR[choices.hairStyle],
    hair_color: "black",
    eyes: SEED_EYES[choices.eyeStyle],
    eye_color: "graphite",
    nose: SEED_NOSE[choices.noseStyle],
    facial_hair: choices.hasStubble ? "stubble" : "none",
    freckles: choices.hasFreckles ? "freckles" : "none",
    glasses: choices.hasGlasses ? "round" : "none",
    headphones: "none",
    earrings: "none",
  };
}

/**
 * Values that were once options, and what they draw as now. "graphite" hair
 * was uncoloured pencil hatching; it reads as black hair. app/models/avatar.rb
 * keeps the same list.
 */
const RENAMED: Partial<Record<TraitKey, Record<string, string>>> = { hair_color: { graphite: "black" } };

/**
 * Keeps only known traits with known values, so a stale or hand-made value
 * from the API falls back to the seed instead of breaking the drawing.
 */
export function cleanTraits(traits: Partial<Record<string, unknown>> | null | undefined): Partial<AvatarTraits> {
  const clean: Partial<AvatarTraits> = {};
  if (!traits || typeof traits !== "object") return clean;
  for (const key of TRAIT_KEYS) {
    const raw = traits[key];
    const value = typeof raw === "string" ? (RENAMED[key]?.[raw] ?? raw) : raw;
    if (typeof value === "string" && TRAIT_OPTIONS[key].includes(value)) clean[key] = value;
  }
  return clean;
}
export const HAT_COLORS = catalog.colors.hat as Record<string, string>;
/** Pencil lines darken on deeper skin so the features still read. */
export const INK_COLORS = catalog.colors.ink as Record<string, string>;
export const HEADPHONES_COLOR = catalog.colors.headphones;
export const EARRINGS_COLOR = catalog.colors.earrings;
export const EYE_WHITE = catalog.colors.eye_white;
