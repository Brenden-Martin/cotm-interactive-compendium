import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_URL = "https://cotm-interactive-compendium.nednerdnitram.chatgpt.site/api/deq-presets";
const DEFAULT_OUTPUT = resolve(import.meta.dirname, "data", "shared-presets.json");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function validateConfig(config, id) {
  const finiteArray = (value, length) => Array.isArray(value)
    && value.length === length
    && value.every(Number.isFinite);
  if (!config || !finiteArray(config.k, 45) || !finiteArray(config.exponent, 3)) {
    throw new Error(`Preset ${id} has an invalid tensor or exponent vector.`);
  }
  for (const key of ["dt", "decay", "noise"]) {
    if (!Number.isFinite(config[key])) throw new Error(`Preset ${id} has invalid ${key}.`);
  }
}

async function fetchCompleteBank(baseUrl) {
  const presets = [];
  const seen = new Set();
  let cursor = 0;
  let expectedTotal;
  let pages = 0;

  while (true) {
    const url = new URL(baseUrl);
    url.searchParams.set("after", String(cursor));
    url.searchParams.set("limit", "200");
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Preset API returned ${response.status} ${response.statusText}.`);
    const page = await response.json();
    pages += 1;
    if (!Number.isInteger(page.total) || page.total < 0 || !Array.isArray(page.presets)) {
      throw new Error(`Page ${pages} did not match the preset API contract.`);
    }
    expectedTotal ??= page.total;
    if (page.total !== expectedTotal) {
      throw new Error(`Preset total changed during download (${expectedTotal} to ${page.total}). Run again.`);
    }
    for (const preset of page.presets) {
      if (!Number.isInteger(preset.id) || preset.id <= cursor || seen.has(preset.id)) {
        throw new Error(`Preset IDs stopped being strictly increasing at ${preset.id}.`);
      }
      validateConfig(preset.config, preset.id);
      seen.add(preset.id);
      presets.push(preset);
      cursor = preset.id;
    }
    if (page.nextCursor == null) break;
    if (!Number.isInteger(page.nextCursor) || page.nextCursor !== cursor) {
      throw new Error(`Page ${pages} returned a non-advancing cursor.`);
    }
    if (pages > 100) throw new Error("Pagination safety limit exceeded.");
  }

  if (presets.length !== expectedTotal) {
    throw new Error(`Downloaded ${presets.length} presets, but the API reports ${expectedTotal}.`);
  }
  return { presets, pages, total: expectedTotal };
}

const sourceUrl = argument("--url", DEFAULT_URL);
const outputPath = resolve(argument("--output", DEFAULT_OUTPUT));
const bank = await fetchCompleteBank(sourceUrl);
const snapshot = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  sourceUrl,
  reportedTotal: bank.total,
  pages: bank.pages,
  presets: bank.presets,
};

await mkdir(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await rename(temporaryPath, outputPath);
console.log(`Saved ${bank.total} presets from ${bank.pages} pages to ${outputPath}`);
