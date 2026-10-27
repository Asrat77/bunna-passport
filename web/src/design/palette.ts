/**
 * The few token values JavaScript needs as literals: Telegram's chrome and
 * buttons take hex colours, not CSS variables. Keep in step with
 * styles/tokens.css, which mirrors mobile/src/design/tokens.ts.
 */
export type ColorScheme = "light" | "dark";

type Hex = `#${string}`;

type Chrome = { surface: Hex; action: Hex; onAction: Hex };

/** Dark is Mocha's neutrals, so it matches the Mocha screens below. */
export const palette: Record<ColorScheme, Chrome> = {
  light: { surface: "#F6F0E6", action: "#872F1D", onAction: "#FFF8ED" },
  dark: { surface: "#0B0A09", action: "#F7F3EF", onAction: "#0B0A09" },
};

/** Mocha screens (Explore, the ceremony) in either phone theme. */
export const mochaPalette: Chrome = palette.dark;

/** Telegram chrome on Mocha screens: white over the dither header, Mocha below. */
export const mochaChrome = { header: "#FFFFFF", background: mochaPalette.surface } as const satisfies Record<string, Hex>;
