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
  onAccent: string;
  positive: string;
  caution: string;
  negative: string;
  border: string;
  borderStrong: string;
  scrim: string;
  mapLand: string;
  mapWater: string;
};

/** Warm paper. Never pure white. */
const light: Palette = {
  surface: "#FAF6F0",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#F0E9DF",
  ink: "#2B1B12", // 13.6:1 on surface
  inkMuted: "#6B5647", // 5.4:1 on surface
  inkFaint: "#8C7767", // 3.4:1 — decorative and large text only
  primary: "#7B3F1D", // 7.4:1 on surface
  onPrimary: "#FFF8EF",
  primarySoft: "#F2E3D6",
  accent: "#E8A33D",
  onAccent: "#2B1B12",
  positive: "#2F6B41",
  caution: "#8A5510",
  negative: "#9B3232",
  border: "#E4D9CC",
  borderStrong: "#CBB9A6",
  scrim: "rgba(43, 27, 18, 0.48)",
  mapLand: "#F3EDE4",
  mapWater: "#DCE4E2",
};

/** Dark Roast. Never pure black — see AMOLED note in DESIGN.md §9. */
const dark: Palette = {
  surface: "#1A120D",
  surfaceRaised: "#241A13",
  surfaceSunken: "#120C08",
  ink: "#F3EAE0", // 14.1:1 on surface
  inkMuted: "#BCA895", // 7.3:1 on surface
  inkFaint: "#8E7A69", // 3.7:1 — decorative and large text only
  primary: "#D98E4A", // 7.8:1 on surface
  onPrimary: "#241108",
  primarySoft: "#3A281C",
  accent: "#E8A33D",
  onAccent: "#241108",
  positive: "#6FBE86",
  caution: "#D9A05B",
  negative: "#E08585",
  border: "#38291E",
  borderStrong: "#4E3B2C",
  scrim: "rgba(0, 0, 0, 0.62)",
  mapLand: "#241A13",
  mapWater: "#1B2422",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
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
