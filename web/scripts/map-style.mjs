#!/usr/bin/env node
/**
 * Writes the Addis map's two MapLibre styles, style-light.json and
 * style-dark.json, for script/publish_addis_map to upload next to the tiles.
 * They start from the Protomaps light and dark flavours, recoloured to the
 * app palette (styles/tokens.css), with English labels and no OSM POIs so the
 * only café pins are ours. Fonts and sprites are expected beside the styles
 * on the same bucket, so the map never calls anyone else's server.
 *
 * Usage: node scripts/map-style.mjs <public base URL> <tiles file name> <out dir>
 *   e.g. node scripts/map-style.mjs https://pub-abc.r2.dev addis-20261023.pmtiles dist-map
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { layers, namedFlavor } from "@protomaps/basemaps";

const [baseUrl, tiles, outDir] = process.argv.slice(2);
if (!baseUrl || !tiles || !outDir) {
  console.error("Usage: node scripts/map-style.mjs <public base URL> <tiles file name> <out dir>");
  process.exit(1);
}
const base = baseUrl.replace(/\/+$/, "");

// Modern Ceremony: paper, warm greys and coffee ink.
const light = {
  ...namedFlavor("light"),
  background: "#ede2d3",
  earth: "#f6f0e6",
  water: "#b9cfd0",
  buildings: "#e6dacb",
  park_a: "#dfe3cf",
  park_b: "#cdd8b8",
  wood_a: "#dfe3cf",
  wood_b: "#cdd8b8",
  pedestrian: "#efe6d9",
  minor_a: "#fffbf5",
  minor_b: "#fffbf5",
  minor_service: "#fbf5ec",
  other: "#fbf5ec",
  link: "#fffbf5",
  major: "#fffbf5",
  highway: "#f7e8bf",
  minor_casing: "#ded0bf",
  major_casing_early: "#ded0bf",
  major_casing_late: "#ded0bf",
  highway_casing_early: "#bca995",
  highway_casing_late: "#bca995",
  roads_label_minor: "#806c61",
  roads_label_minor_halo: "#fffbf5",
  roads_label_major: "#665047",
  roads_label_major_halo: "#fffbf5",
  subplace_label: "#806c61",
  subplace_label_halo: "#f6f0e6",
  city_label: "#22140f",
  city_label_halo: "#f6f0e6",
};

// Dark Roast: near-black coffee with ember roads.
const dark = {
  ...namedFlavor("dark"),
  background: "#100b08",
  earth: "#17100c",
  water: "#1d2a2c",
  buildings: "#211812",
  park_a: "#1c1e14",
  park_b: "#22271a",
  wood_a: "#1c1e14",
  wood_b: "#22271a",
  pedestrian: "#1e1611",
  minor_a: "#2a1f18",
  minor_b: "#2a1f18",
  minor_service: "#241a14",
  other: "#241a14",
  link: "#3c2c22",
  major: "#3c2c22",
  highway: "#604638",
  minor_casing: "#17100c",
  major_casing_early: "#17100c",
  major_casing_late: "#17100c",
  highway_casing_early: "#17100c",
  highway_casing_late: "#17100c",
  roads_label_minor: "#9e8875",
  roads_label_minor_halo: "#17100c",
  roads_label_major: "#cbb5a2",
  roads_label_major_halo: "#17100c",
  subplace_label: "#9e8875",
  subplace_label_halo: "#17100c",
  city_label: "#f7ebdd",
  city_label_halo: "#17100c",
};

function style(name, flavor) {
  return {
    version: 8,
    name: `Bunna Addis ${name}`,
    glyphs: `${base}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${base}/sprites/v4/${name}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${base}/${tiles}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: layers("protomaps", flavor, { lang: "en" }).filter((layer) => layer.id !== "pois"),
  };
}

mkdirSync(outDir, { recursive: true });
for (const [name, flavor] of [["light", light], ["dark", dark]]) {
  const path = join(outDir, `style-${name}.json`);
  writeFileSync(path, `${JSON.stringify(style(name, flavor))}\n`);
  console.log(`Wrote ${path}`);
}
