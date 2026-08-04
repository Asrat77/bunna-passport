import type { StandardStyleConfig } from "@rnmapbox/maps";
import type { ColorScheme } from "@/design/tokens";
import { palettes } from "@/design/tokens";

export const ADDIS_CENTER: [number, number] = [38.7869, 9.0107];
/** Bole: highest café density, where the map should open. */
export const BOLE_CENTER: [number, number] = [38.7997, 8.9935];

/** Mapbox Standard keeps the basemap quiet and warm behind collectible pins. */
export const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/standard";

export function mapStyleConfig(scheme: ColorScheme): StandardStyleConfig {
  const colors = palettes[scheme];

  return {
    lightPreset: scheme === "dark" ? "night" : "dawn",
    theme: "faded",
    show3dObjects: false,
    show3dBuildings: false,
    showPointOfInterestLabels: true,
    showTransitLabels: false,
    showPlaceLabels: true,
    showRoadLabels: true,
    colorLand: colors.mapLand,
    colorWater: colors.mapWater,
    colorRoads: scheme === "dark" ? "#49372B" : "#FFF9F1",
    colorGreenspaces: scheme === "dark" ? "#23332A" : "#DDE5D6",
    colorCommercial: scheme === "dark" ? "#2A201A" : "#EFE1D5",
  };
}
