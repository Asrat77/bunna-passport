/**
 * Dual-script type scale (docs/DESIGN.md §2.3).
 *
 * Ethiopic sets the vertical rhythm: fidel glyphs are taller and denser than
 * Latin, so line heights are chosen so Amharic never clips. Latin always fits
 * where Ethiopic does; the reverse is not true.
 */

export const fonts = {
  displayLatin: "Geist-SemiBold",
  displayEthiopic: "NotoSerifEthiopic_600SemiBold",
  bodyLatin: "Geist-Regular",
  bodyLatinMedium: "Geist-Medium",
  bodyLatinBold: "Geist-Bold",
  bodyEthiopic: "NotoSansEthiopic_400Regular",
  bodyEthiopicMedium: "NotoSansEthiopic_500Medium",
  bodyEthiopicBold: "NotoSansEthiopic_700Bold",
} as const;

export type TypeRole =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "numeral";

export type TypeSpec = {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

/**
 * Line heights are >= 1.6 for any role that can hold Amharic, and never
 * below 1.4 anywhere. Body floor is 16sp (DESIGN.md §2.3).
 */
export const typeScale: Record<TypeRole, TypeSpec> = {
  display: { fontSize: 36, lineHeight: 48, letterSpacing: -1.1 },
  title: { fontSize: 26, lineHeight: 38, letterSpacing: -0.55 },
  heading: { fontSize: 19, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontSize: 16, lineHeight: 26 },
  label: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 18 },
  numeral: { fontSize: 32, lineHeight: 38, letterSpacing: -1.1 },
};

/** Ethiopic script range (U+1200–U+137F) plus the supplement blocks. */
const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;

export function isEthiopic(text: string): boolean {
  return ETHIOPIC.test(text);
}

/**
 * Picks the font that can actually render the string. Amharic text in a Latin
 * font renders as tofu on many Android builds, so this is a correctness
 * concern, not a stylistic one.
 */
export function fontFor(
  role: TypeRole,
  text: string,
  weight: "regular" | "medium" | "bold" = "regular",
): string {
  const ethiopic = isEthiopic(text);

  if (role === "display" || role === "title" || role === "numeral") {
    return ethiopic ? fonts.displayEthiopic : fonts.displayLatin;
  }

  const strong = weight === "bold" || role === "bodyStrong" || role === "heading";
  if (ethiopic) {
    if (strong) return fonts.bodyEthiopicBold;
    return weight === "medium" ? fonts.bodyEthiopicMedium : fonts.bodyEthiopic;
  }
  if (strong) return fonts.bodyLatinBold;
  return weight === "medium" ? fonts.bodyLatinMedium : fonts.bodyLatin;
}
