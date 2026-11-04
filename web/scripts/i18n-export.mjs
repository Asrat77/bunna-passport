#!/usr/bin/env node
/**
 * Writes every string the Mini App shows to i18n-review.csv (key, catalog,
 * English, drafted Amharic, reviewed Amharic) for the native-speaker pass
 * that docs/DESIGN.md §11.5 makes a launch blocker.
 *
 * The app merges two catalogues: src/i18n/strings.ts (ported from mobile)
 * and src/i18n/miniapp.ts (new with the Mini App), with miniapp.ts winning
 * when a key is in both. The CSV follows the same rule, so each row is the
 * text a person actually sees.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(here, "../src/i18n", file), "utf8");

/** Pulls `"key": "value"` pairs out of one object literal, values possibly wrapped. */
function entries(source, declaration) {
  const start = source.indexOf(declaration);
  if (start === -1) throw new Error(`Could not find ${declaration}`);
  const body = source.slice(source.indexOf("{", start) + 1, source.indexOf("\n}", start));
  const pairs = new Map();
  for (const match of body.matchAll(/"([^"]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    pairs.set(match[1], JSON.parse(`"${match[2]}"`));
  }
  return pairs;
}

const ported = read("strings.ts");
const miniapp = read("miniapp.ts");
const catalogs = [
  { name: "strings.ts", en: entries(ported, "const en = "), am: entries(ported, "const am:") },
  { name: "miniapp.ts", en: entries(miniapp, "export const miniappEn"), am: entries(miniapp, "export const miniappAm") },
];

// Later catalogues override earlier ones, like the spread in context.tsx.
const merged = new Map();
for (const catalog of catalogs) {
  for (const [key, english] of catalog.en) {
    merged.set(key, { catalog: catalog.name, english, amharic: catalog.am.get(key) });
  }
}

// Flag keys no screen asks for, so the reviewer can skip them. A key counts
// as used when it appears as a literal, or matches a template like
// t(`level.${x}`) whose fixed prefix it starts with.
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "i18n" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const code = sourceFiles(join(here, "../src")).map((file) => readFileSync(file, "utf8")).join("\n");
const literals = new Set([...code.matchAll(/["'`]([a-zA-Z]+(?:\.[\w]+)+)["'`]/g)].map((m) => m[1]));
const prefixes = [...code.matchAll(/`([a-zA-Z]+(?:\.[\w]+)*\.)\$\{/g)].map((m) => m[1]);
const used = (key) => literals.has(key) || prefixes.some((prefix) => key.startsWith(prefix));

const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows = [["key", "shown_in_app", "catalog", "english", "amharic_draft", "amharic_reviewed"].map(cell).join(",")];
// Strings people see come first; likely-unused ones go at the end.
const ordered = [...merged].sort(([a], [b]) => Number(used(b)) - Number(used(a)));
for (const [key, row] of ordered) {
  rows.push([key, used(key) ? "yes" : "probably not", row.catalog, row.english, row.amharic, ""].map(cell).join(","));
}

const out = join(here, "../i18n-review.csv");
writeFileSync(out, `﻿${rows.join("\n")}\n`);
const counts = catalogs.map((c) => `${[...merged.values()].filter((r) => r.catalog === c.name).length} from ${c.name}`);
const unused = [...merged.keys()].filter((key) => !used(key)).length;
console.log(`Wrote ${merged.size} strings (${counts.join(", ")}; ${unused} look unused) to ${out}`);
