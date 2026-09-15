#!/usr/bin/env node
/**
 * Refresh public/data/fallback-events.json from the live AIHOT API.
 * Non-commercial fan use; attribute AIHOT in the UI.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://aihot.news/api/v1/codex-resets";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "fallback-events.json");

const res = await fetch(API, {
  headers: { Accept: "application/json" },
});
if (!res.ok) {
  console.error(`Failed: HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${out}`);
console.log(`count=${data.count} checkedAt=${data.checkedAt}`);
