/** Dark is Mocha's neutrals, so it matches the Mocha screens below. */
export const palette = {
    light: { surface: "#F6F0E6", action: "#872F1D", onAction: "#FFF8ED" },
    dark: { surface: "#0B0A09", action: "#F7F3EF", onAction: "#0B0A09" },
};
/** Mocha screens (Explore, the ceremony) in either phone theme. */
export const mochaPalette = palette.dark;
/** Telegram chrome on Mocha screens: white over the dither header, Mocha below. */
export const mochaChrome = { header: "#FFFFFF", background: mochaPalette.surface };
