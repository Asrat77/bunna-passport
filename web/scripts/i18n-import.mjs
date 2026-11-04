#!/usr/bin/env node
/**
 * Reads a reviewed CSV made by i18n-export.mjs and writes its
 * amharic_reviewed column back into the Amharic catalogues in
 * src/i18n/strings.ts and src/i18n/miniapp.ts.
 *
 *   npm run i18n:import -- path/to/reviewed.csv
 *
 * Rows with an empty amharic_reviewed cell are skipped. A key that is in both
 * catalogues gets the reviewed text in both, so the two never drift apart.
 * The script refuses to write anything if a reviewed string drops or invents
 * a {placeholder} compared with the English, or names a key the app lacks.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npm run i18n:import -- path/to/reviewed.csv");
  process.exit(1);
}

/** RFC 4180 parser: quoted cells, doubled quotes, newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

const [header, ...body] = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const col = (name) => {
  const index = header.indexOf(name);
  if (index === -1) throw new Error(`CSV has no "${name}" column`);
  return index;
};
const [keyCol, enCol, reviewedCol] = [col("key"), col("english"), col("amharic_reviewed")];
const reviewed = new Map(
  body.filter((r) => r[reviewedCol]?.trim()).map((r) => [r[keyCol], { en: r[enCol], am: r[reviewedCol].trim() }]),
);

const here = dirname(fileURLToPath(import.meta.url));
const catalogs = [
  { file: "strings.ts", en: "const en = ", am: "const am:" },
  { file: "miniapp.ts", en: "export const miniappEn", am: "export const miniappAm" },
].map((c) => ({ ...c, path: join(here, "../src/i18n", c.file), source: readFileSync(join(here, "../src/i18n", c.file), "utf8") }));

/** Locates one object literal's body; same rule as i18n-export.mjs. */
function bounds(source, declaration) {
  const start = source.indexOf(declaration);
  if (start === -1) throw new Error(`Could not find ${declaration}`);
  return [source.indexOf("{", start) + 1, source.indexOf("\n}", start)];
}
const pair = /("([^"]+)":\s*\n?\s*)"((?:[^"\\]|\\.)*)"/g;

const englishKeys = new Set(
  catalogs.flatMap((c) => {
    const [from, to] = bounds(c.source, c.en);
    return [...c.source.slice(from, to).matchAll(pair)].map((m) => m[2]);
  }),
);

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const problems = [];
for (const [key, { en, am }] of reviewed) {
  if (!englishKeys.has(key)) problems.push(`${key}: not a key in either catalogue`);
  else if (placeholders(en) !== placeholders(am))
    problems.push(`${key}: placeholders {${placeholders(en)}} in English but {${placeholders(am)}} in Amharic`);
}
if (problems.length) {
  console.error(`Nothing written. Fix these rows first:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

let changed = 0;
const touched = new Set();
for (const catalog of catalogs) {
  const [from, to] = bounds(catalog.source, catalog.am);
  const updated = catalog.source.slice(from, to).replace(pair, (whole, lead, key, value) => {
    const next = reviewed.get(key)?.am;
    if (next === undefined) return whole;
    touched.add(key);
    if (JSON.parse(`"${value}"`) === next) return whole;
    changed++;
    return `${lead}${JSON.stringify(next)}`;
  });
  writeFileSync(catalog.path, catalog.source.slice(0, from) + updated + catalog.source.slice(to));
}

const missing = [...reviewed.keys()].filter((key) => !touched.has(key));
console.log(`Updated ${changed} Amharic strings from ${reviewed.size} reviewed rows.`);
if (missing.length) console.log(`No Amharic entry to replace for: ${missing.join(", ")}`);
