import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Protocol } from "pmtiles";
import type { Feature, FeatureCollection } from "geojson";
import { CHECK_IN_RANGE_METERS } from "@/data/checkin";
import type { Fix } from "@/location/locate";
import { drawPin, PIN_OPEN, PIN_STAMPED, type PinColours } from "./pins";

/** The check-in circle's source; its layers are `you-range-*`. */
export const RANGE = "you-range";
/** Close enough that the whole check-in circle fits on a phone. */
export const LOCATE_ZOOM = 15.5;
let prepared = false;

/**
 * MapLibre finds its worker next to its own module, which Vite moves when it
 * bundles it (and pre-bundles it in dev), so point it at the emitted copy.
 * Without a worker no tile is ever parsed and only the background shows.
 * The Addis tiles come through the pmtiles:// protocol.
 */
export function prepareMapLibre() {
  if (prepared) return;
  maplibregl.setWorkerUrl(workerUrl);
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  prepared = true;
}

export function pixelRatio() {
  return Math.max(2, Math.ceil(window.devicePixelRatio || 1));
}

/** The two café pins, redrawn per style so they follow light and dark. */
export function addPinImages(instance: maplibregl.Map, colours: PinColours) {
  const ratio = pixelRatio();
  for (const [id, stamped] of [[PIN_STAMPED, true], [PIN_OPEN, false]] as const) {
    if (instance.hasImage(id)) instance.removeImage(id);
    instance.addImage(id, drawPin(colours, stamped, ratio), { pixelRatio: ratio });
  }
}

/** The map's colours for this theme, read from the CSS tokens. */
export function pinColours(): PinColours {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  return {
    mocha: token("--mocha"),
    onMocha: token("--mocha-text"),
    raised: token("--raised"),
    ink: token("--ink"),
    border: token("--border-strong"),
    badge: token("--ink"),
    surface: token("--surface"),
    shadow: token("--shadow"),
  };
}

/** The check-in range round a fix, as a 64-sided circle and a point at its top for the label. */
export function rangeFeatures(fix: Fix): FeatureCollection {
  const metresPerDegree = 111_320;
  const dLat = CHECK_IN_RANGE_METERS / metresPerDegree;
  const dLng = dLat / Math.cos((fix.latitude * Math.PI) / 180);
  const ring = Array.from({ length: 65 }, (_, i) => {
    const angle = (i / 64) * Math.PI * 2;
    return [fix.longitude + Math.sin(angle) * dLng, fix.latitude + Math.cos(angle) * dLat];
  });
  const circle: Feature = { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} };
  const top: Feature = { type: "Feature", geometry: { type: "Point", coordinates: [fix.longitude, fix.latitude + dLat] }, properties: {} };
  return { type: "FeatureCollection", features: [circle, top] };
}


/** The corners of the check-in circle, for fitting a map to it. */
export function rangeBounds(fix: Fix): maplibregl.LngLatBoundsLike {
  const dLat = CHECK_IN_RANGE_METERS / 111_320;
  const dLng = dLat / Math.cos((fix.latitude * Math.PI) / 180);
  return [
    [fix.longitude - dLng, fix.latitude - dLat],
    [fix.longitude + dLng, fix.latitude + dLat],
  ];
}

/** The check-in circle: a faint Mocha wash, a dashed rim and its name on top. Drawn under the cafés. */
export function showRange(instance: maplibregl.Map, data: FeatureCollection, label: string) {
  const colours = pinColours();
  instance.addSource(RANGE, { type: "geojson", data });
  instance.addLayer({
    id: `${RANGE}-fill`,
    type: "fill",
    source: RANGE,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": colours.mocha, "fill-opacity": 0.08 },
  });
  instance.addLayer({
    id: `${RANGE}-rim`,
    type: "line",
    source: RANGE,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "line-color": colours.mocha, "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [3, 2] },
  });
  instance.addLayer({
    id: `${RANGE}-label`,
    type: "symbol",
    source: RANGE,
    filter: ["==", ["geometry-type"], "Point"],
    minzoom: 14,
    layout: {
      "text-field": label,
      "text-font": ["Noto Sans Medium"],
      "text-size": 11,
      "text-anchor": "bottom",
      "text-offset": [0, -0.3],
      "text-allow-overlap": true,
    },
    paint: { "text-color": colours.mocha, "text-halo-color": colours.surface, "text-halo-width": 1.5 },
  });
}

