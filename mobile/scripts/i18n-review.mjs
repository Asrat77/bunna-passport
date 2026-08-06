#!/usr/bin/env node
/**
 * Round-trips the Amharic column through a spreadsheet.
 *
 * docs/DESIGN.md §11.5 makes a native-speaker pass a launch blocker, but the
 * strings live inside a TypeScript file and nobody can tell which ones have
 * been checked. Export gives a reviewer a CSV they can open anywhere; import
 * writes their answers back and records which keys are now human-approved, so
 * the blocker becomes a number that can reach zero.
 *
 *   node scripts/i18n-review.mjs export    > writes i18n-review.csv
 *   node scripts/i18n-review.mjs import    < reads i18n-review.csv
 *   node scripts/i18n-review.mjs status    > prints coverage
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const STRINGS = join(here, "../src/i18n/strings.ts");
const REVIEWED = join(here, "../src/i18n/reviewed.json");
const CSV = join(here, "../i18n-review.csv");

/** Pulls one object literal out of the file by its declaration prefix. */
function block(source, declaration) {
  const start = source.indexOf(declaration);
  if (start === -1) throw new Error(`Could not find ${declaration}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return { open, close: index, body: source.slice(open + 1, index) };
    }
  }
  throw new Error(`Unterminated ${declaration}`);
}

/** Entries look like `"key": "value",` with the value optionally wrapped. */
function entries(body) {
  const found = new Map();
  const pattern = /"([\w.]+)":\s*("(?:[^"\\]|\\.)*")/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    found.set(match[1], JSON.parse(match[2]));
  }
  return found;
}

const source = readFileSync(STRINGS, "utf8");
const en = entries(block(source, "const en = ").body);
const am = entries(block(source, "const am:").body);
const reviewed = new Set(existsSync(REVIEWED) ? JSON.parse(readFileSync(REVIEWED, "utf8")) : []);

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const command = process.argv[2] ?? "status";

if (command === "export") {
  const lines = ["key,english,amharic_current,amharic_reviewed,status"];
  for (const [key, english] of en) {
    lines.push(
      [key, english, am.get(key) ?? "", "", reviewed.has(key) ? "approved" : "machine-drafted"]
        .map(csvCell)
        .join(","),
    );
  }
  writeFileSync(CSV, lines.join("\n") + "\n");
  console.log(`Wrote ${CSV} — ${en.size} strings, ${en.size - reviewed.size} awaiting review.`);
  console.log("Fill the amharic_reviewed column, leave blank to keep the current text.");
} else if (command === "import") {
  if (!existsSync(CSV)) throw new Error(`Missing ${CSV}. Run export first.`);
  const rows = parseCsv(readFileSync(CSV, "utf8")).slice(1).filter((row) => row.length >= 4);

  let changed = 0;
  let approved = 0;
  let updated = source;
  const amBlock = block(updated, "const am:");
  let body = amBlock.body;

  for (const [key, , , reviewedText] of rows) {
    const answer = (reviewedText ?? "").trim();
    if (!answer) continue;
    approved++;
    reviewed.add(key);
    if (answer === am.get(key)) continue;
    const pattern = new RegExp(`("${key.replaceAll(".", "\\.")}":\\s*)"(?:[^"\\\\]|\\\\.)*"`);
    if (!pattern.test(body)) {
      console.warn(`  skipped ${key}: not found in the Amharic block`);
      continue;
    }
    body = body.replace(pattern, `$1${JSON.stringify(answer)}`);
    changed++;
  }

  updated = updated.slice(0, amBlock.open + 1) + body + updated.slice(amBlock.close);
  writeFileSync(STRINGS, updated);
  writeFileSync(REVIEWED, JSON.stringify([...reviewed].sort(), null, 2) + "\n");
  console.log(`Rewrote ${changed} strings, marked ${approved} approved.`);
} else {
  const missing = [...en.keys()].filter((key) => !am.has(key));
  const pending = [...en.keys()].filter((key) => !reviewed.has(key));
  console.log(`strings:        ${en.size}`);
  console.log(`untranslated:   ${missing.length}${missing.length ? ` (${missing.join(", ")})` : ""}`);
  console.log(`approved:       ${reviewed.size}`);
  console.log(`awaiting review:${pending.length}`);
  if (pending.length) {
    console.log("\nThe Amharic column is machine-drafted until these are approved.");
    console.log("docs/DESIGN.md §11.5 treats that as a launch blocker.");
  }
}
