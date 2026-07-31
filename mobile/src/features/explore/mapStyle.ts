import type { ColorScheme } from "@/design/tokens";
import { palettes } from "@/design/tokens";

/**
 * Development map style.
 *
 * OpenStreetMap's public raster tiles cover Addis well enough to build
 * against, but their usage policy forbids shipping an app on them. The
 * production tile source is still an open decision (docs/DESIGN.md §11.3);
 * until it lands, the warm recessive styling from §2.2 can only be
 * approximated by tinting the raster layer.
 */
const OSM_TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

export const ADDIS_CENTER: [number, number] = [38.7869, 9.0107];
/** Bole: highest café density, where the map should open (docs/SPEC.md §13). */
export const BOLE_CENTER: [number, number] = [38.7997, 8.9935];

export function mapStyle(scheme: ColorScheme): string {
  const colors = palettes[scheme];

  return JSON.stringify({
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: OSM_TILES,
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": colors.mapLand } },
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          // Pull saturation and contrast down so seal pins stay dominant.
          "raster-saturation": scheme === "dark" ? -0.75 : -0.45,
          "raster-contrast": scheme === "dark" ? -0.2 : -0.08,
          "raster-brightness-max": scheme === "dark" ? 0.6 : 1,
          "raster-opacity": 0.9,
        },
      },
    ],
  });
}
