#!/usr/bin/env node
/**
 * Writes the Mini App's new strings to i18n-review.csv (key, English,
 * drafted Amharic, reviewed Amharic) for the native-speaker pass that
 * docs/DESIGN.md §11.5 makes a launch blocker. The ported catalogue in
 * src/i18n/strings.ts goes through mobile/scripts/i18n-review.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/i18n/miniapp.ts"), "utf8");

/** Pulls `"key": "value"` pairs out of one object literal, values possibly wrapped. */
function entries(declaration) {
  const start = source.indexOf(declaration);
  const body = source.slice(source.indexOf("{", start) + 1, source.indexOf("\n}", start));
  const pairs = new Map();
  for (const match of body.matchAll(/"([^"]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    pairs.set(match[1], JSON.parse(`"${match[2]}"`));
  }
  return pairs;
}

const en = entries("export const miniappEn");
const am = entries("export const miniappAm");
const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows = [["key", "english", "amharic_draft", "amharic_reviewed"].map(cell).join(",")];
for (const [key, english] of en) rows.push([key, english, am.get(key), ""].map(cell).join(","));

const out = join(here, "../i18n-review.csv");
writeFileSync(out, `${rows.join("\n")}\n`);
console.log(`Wrote ${en.size} strings to ${out}`);
