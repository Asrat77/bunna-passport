/**
 * The few token values JavaScript needs as literals: Telegram's chrome and
 * buttons take hex colours, not CSS variables. Keep in step with
 * styles/tokens.css, which mirrors mobile/src/design/tokens.ts.
 */
export type ColorScheme = "light" | "dark";

type Hex = `#${string}`;

export const palette: Record<ColorScheme, { surface: Hex; primary: Hex; onPrimary: Hex }> = {
  light: { surface: "#F6F0E6", primary: "#872F1D", onPrimary: "#FFF8ED" },
  dark: { surface: "#17100C", primary: "#F0A05D", onPrimary: "#25130A" },
};

/** Telegram chrome on Explore: white over the dither header, Mocha below. */
export const mochaChrome = { header: "#FFFFFF", background: "#0B0A09" } as const satisfies Record<string, Hex>;
