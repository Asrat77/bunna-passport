#!/usr/bin/env node
/**
 * Writes the Addis map's MapLibre styles for script/publish_addis_map to
 * upload next to the tiles: style-light.json and style-dark.json for English,
 * style-light-am.json and style-dark-am.json for Amharic. They start from the
 * Protomaps light and dark flavours, recoloured to the app palette
 * (styles/tokens.css), with OSM landmarks but not OSM's cafés, so the only
 * café pins are ours. Fonts and sprites are expected beside the styles on the
 * same bucket, so the map never calls anyone else's server.
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

// Modern Ceremony: warm paper with green parks, blue water and roads that
// read as roads, so the city looks lived in rather than a blank sheet.
const light = {
  ...namedFlavor("light"),
  background: "#ede2d3",
  earth: "#f6f0e6",
  water: "#9fc6d3",
  buildings: "#e2d3c1",
  park_a: "#d5e3bd",
  park_b: "#b9d39a",
  wood_a: "#cfe0b6",
  wood_b: "#a9c98a",
  scrub_a: "#dfe6c6",
  scrub_b: "#c8d9a8",
  hospital: "#f1d9d3",
  school: "#efe1c9",
  industrial: "#e6ddd2",
  pedestrian: "#efe4d4",
  minor_a: "#fffbf5",
  minor_b: "#fffbf5",
  minor_service: "#fbf5ec",
  other: "#fbf5ec",
  link: "#fdeec8",
  major: "#fde3a7",
  highway: "#f6c370",
  minor_casing: "#dccbb6",
  minor_service_casing: "#e4d6c4",
  link_casing: "#d9b98a",
  major_casing_early: "#d9b98a",
  major_casing_late: "#d9b98a",
  highway_casing_early: "#c9965a",
  highway_casing_late: "#c9965a",
  railway: "#a48f80",
  roads_label_minor: "#665047",
  roads_label_minor_halo: "#fffbf5",
  roads_label_major: "#4a362d",
  roads_label_major_halo: "#fffbf5",
  subplace_label: "#872f1d",
  subplace_label_halo: "#f6f0e6",
  city_label: "#22140f",
  city_label_halo: "#f6f0e6",
};

// Dark Roast: coffee-dark ground, roads lit like embers, parks and water
// still distinguishable at night.
const dark = {
  ...namedFlavor("dark"),
  background: "#120c09",
  earth: "#1b1310",
  water: "#1f3b46",
  buildings: "#2b201a",
  park_a: "#1f2a19",
  park_b: "#283820",
  wood_a: "#1f2a19",
  wood_b: "#283820",
  scrub_a: "#22281a",
  scrub_b: "#2b3420",
  hospital: "#2e1c1a",
  school: "#2a2118",
  industrial: "#221b17",
  pedestrian: "#241a14",
  minor_a: "#3a2b21",
  minor_b: "#3a2b21",
  minor_service: "#30241c",
  other: "#30241c",
  link: "#5a3f2c",
  major: "#6e4a30",
  highway: "#a3653a",
  minor_casing: "#1b1310",
  minor_service_casing: "#1b1310",
  link_casing: "#1b1310",
  major_casing_early: "#1b1310",
  major_casing_late: "#1b1310",
  highway_casing_early: "#1b1310",
  highway_casing_late: "#1b1310",
  railway: "#5e4a3e",
  roads_label_minor: "#cbb5a2",
  roads_label_minor_halo: "#1b1310",
  roads_label_major: "#f7ebdd",
  roads_label_major_halo: "#1b1310",
  subplace_label: "#f0a05d",
  subplace_label_halo: "#1b1310",
  city_label: "#f7ebdd",
  city_label_halo: "#1b1310",
};

/**
 * Landmarks stay (people in Addis give directions by them), but OSM's own
 * cafés go: the catalog's pins are the only cafés on the map.
 */
function withoutOsmCafes(layer) {
  if (layer.id !== "pois") return layer;
  return { ...layer, filter: ["all", layer.filter, ["!=", ["get", "kind"], "cafe"]] };
}

/**
 * The Amharic label: OSM's name:am, or the plain name when it is already
 * written in fidel (most Addis names are), with the English name underneath
 * when there is one that differs, the mirror of the English styles, which
 * Protomaps already gives a fidel second line. Names with no Amharic at all
 * stay English rather than vanish.
 */
const amharicName = [
  "let",
  "am",
  ["coalesce", ["get", "name:am"], ["case", ["==", ["get", "script"], "Ethiopic"], ["get", "name"], null]],
  "en",
  ["coalesce", ["get", "name:en"], ["get", "name"]],
  [
    "case",
    ["==", ["var", "am"], null],
    ["format", ["var", "en"], {}],
    ["any", ["==", ["var", "en"], null], ["==", ["var", "am"], ["var", "en"]]],
    ["format", ["var", "am"], {}],
    ["format", ["var", "am"], {}, "\n", {}, ["var", "en"], { "font-scale": 0.8 }],
  ],
];

/** Swaps every name label (not house numbers or road shields) to Amharic. */
function inAmharic(layer) {
  const field = layer.layout?.["text-field"];
  if (layer.type !== "symbol" || !JSON.stringify(field ?? null).includes('"name:en"')) return layer;
  return { ...layer, layout: { ...layer.layout, "text-field": amharicName } };
}

function style(name, flavor, language) {
  let mapLayers = layers("protomaps", flavor, { lang: "en" }).map(withoutOsmCafes);
  if (language === "am") mapLayers = mapLayers.map(inAmharic);
  return {
    version: 8,
    name: `Bunna Addis ${name}${language === "am" ? " Amharic" : ""}`,
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
    layers: mapLayers,
  };
}

mkdirSync(outDir, { recursive: true });
for (const [name, flavor] of [["light", light], ["dark", dark]]) {
  for (const language of ["en", "am"]) {
    const path = join(outDir, `style-${name}${language === "am" ? "-am" : ""}.json`);
    writeFileSync(path, `${JSON.stringify(style(name, flavor, language))}\n`);
    console.log(`Wrote ${path}`);
  }
}
