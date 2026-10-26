/**
 * Design tokens for Bunna Passport. Mirrors docs/DESIGN.md §2.
 * Every text/background pairing here is checked against WCAG AA (4.5:1).
 */

export type ColorScheme = "light" | "dark";

export type Palette = {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  positive: string;
  caution: string;
  negative: string;
  border: string;
  borderStrong: string;
  shadow: string;
  scrim: string;
  mapLand: string;
  mapWater: string;
};

/** Warm paper. Never pure white. */
const light: Palette = {
  surface: "#F6F0E6",
  surfaceRaised: "#FFFBF5",
  surfaceSunken: "#EDE2D3",
  ink: "#22140F",
  inkMuted: "#665047",
  inkFaint: "#806C61",
  primary: "#872F1D",
  onPrimary: "#FFF8ED",
  primarySoft: "#F3DCCF",
  accent: "#D99A24",
  accentSoft: "#F7E8BF",
  onAccent: "#24150F",
  positive: "#2F684F",
  caution: "#8D520B",
  negative: "#A22C2C",
  border: "#DED0BF",
  borderStrong: "#BCA995",
  shadow: "rgba(52, 27, 17, 0.16)",
  scrim: "rgba(34, 20, 15, 0.58)",
  mapLand: "#EFE7DA",
  mapWater: "#D8E2DF",
};

/** Dark Roast. Never pure black — see AMOLED note in DESIGN.md §9. */
const dark: Palette = {
  surface: "#17100C",
  surfaceRaised: "#211812",
  surfaceSunken: "#100B08",
  ink: "#F7EBDD",
  inkMuted: "#CBB5A2",
  inkFaint: "#9E8875",
  primary: "#F0A05D",
  onPrimary: "#25130A",
  primarySoft: "#3C2419",
  accent: "#F3B542",
  accentSoft: "#3E2F18",
  onAccent: "#24150F",
  positive: "#78C69A",
  caution: "#E6AC62",
  negative: "#F0928D",
  border: "#3C2C22",
  borderStrong: "#604638",
  shadow: "rgba(0, 0, 0, 0.46)",
  scrim: "rgba(0, 0, 0, 0.62)",
  mapLand: "#201913",
  mapWater: "#172221",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/**
 * "Mocha dither" (DESIGN.md §2.2.1). Explore and the tab dock wear it in both
 * OS modes: the dithered header is a fixed illustration, so the screen under
 * it cannot flip to paper. The Palette keys map Mocha onto the shared roles so
 * themed components (Text, Chip, EmptyState, sheets) follow it unchanged.
 */
export const mochaTokens = {
  bg: "#0B0A09",
  surface: "#171413",
  surfaceActive: "#2A2421",
  divider: "#221E1C",
  text: "#F7F3EF",
  text2: "#A8A09A",
  text3: "#8E8781",
  /** Bronze stamps. */
  mocha: "#A9503A",
  /** Red text on dark — passes 4.5:1 on bg and surface. */
  mochaLight: "#D4917A",
  silver: "#CFC9C4",
  /** The dither header's white, extended under the status bar. */
  headerPaper: "#FFFFFF",
  /** Greeting text on the white part of the dither header. */
  headerInk: "#0B0A09",
  headerInkMuted: "#5A524D",
  avatarInk: "#ECD3C8",
  stampEmptyRing: "#3A3431",
  stampEmptyIcon: "#5E5753",
  bronzeFill: "rgba(169, 80, 58, 0.18)",
  silverFill: "rgba(255, 255, 255, 0.06)",
  /** Dock background; sits over a blur. */
  barBg: "rgba(11, 10, 9, 0.82)",
} as const;

export const mocha: Palette = {
  ...dark,
  surface: mochaTokens.bg,
  surfaceRaised: mochaTokens.surface,
  surfaceSunken: mochaTokens.surfaceActive,
  ink: mochaTokens.text,
  inkMuted: mochaTokens.text2,
  inkFaint: mochaTokens.text3,
  primary: mochaTokens.mochaLight,
  onPrimary: mochaTokens.bg,
  primarySoft: mochaTokens.surfaceActive,
  border: mochaTokens.divider,
  borderStrong: mochaTokens.stampEmptyRing,
  shadow: "rgba(0, 0, 0, 0.5)",
  scrim: "rgba(0, 0, 0, 0.66)",
};

/** 4dp grid. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 30,
  full: 999,
} as const;

/**
 * Minimum interactive size. Material's 48dp, not the web's 44px —
 * this is an Android-first app (DESIGN.md §9).
 */
export const touchTarget = 48;

/**
 * Motion tiers (DESIGN.md §8). Ceremony durations are replaced with
 * instant reveals when the OS reports reduced motion.
 */
export const motion = {
  micro: 160,
  transition: 300,
  ceremony: 800,
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  nav: 20,
  sheet: 30,
  toast: 40,
  ceremony: 50,
} as const;
