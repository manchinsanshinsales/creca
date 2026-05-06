/**
 * Google Sheets → creca data sync script
 *
 * Usage:
 *   pnpm sync-data              # Full sync: fetch sheet and write JSON files
 *   pnpm sync-data --inspect    # Show sheet headers and sample rows only
 *
 * Prerequisites:
 *   1. Make the Google Sheet publicly viewable (Share → Anyone with link → Viewer)
 *   2. Set SHEETS_CSV_URL in .env.local or pass as env var
 *
 * Default sheet: https://docs.google.com/spreadsheets/d/1k6BYi28-Z-sp_h95SI8jLxdPqWZ81u4ZV2UwJTESrRU/export?format=csv&gid=0
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

const SHEET_ID = "1k6BYi28-Z-sp_h95SI8jLxdPqWZ81u4ZV2UwJTESrRU";
const GID = "0";
const CSV_URL =
  process.env.SHEETS_CSV_URL ??
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const DATA_DIR = resolve(import.meta.dirname, "../src/data/v1");
const INSPECT = process.argv.includes("--inspect");

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      // Normalize to lowercase so "ID", "Id", "id" all resolve to the same key.
      row[h.trim().toLowerCase()] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inQuotes) {
      inQuotes = true;
    } else if (ch === '"' && inQuotes && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (ch === '"' && inQuotes) {
      inQuotes = false;
    } else if (ch === "," && !inQuotes) {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

// ─── Column mapping ───────────────────────────────────────────────────────────
// Headers are normalized to lowercase by parseCsv, so all lookups use lowercase.
// Expected English column names: id, chain, category, aliases, acceptedmethodids, notes
// Japanese fallbacks:            店舗id, 店舗名/チェーン名, カテゴリ, 別名, 対応決済, 備考

type StoreRow = {
  id: string;
  chain: string;
  category: string;
  aliases: string; // comma-separated
  acceptedMethodIds: string; // comma-separated
  notes?: string;
};

function mapStoreRow(row: Record<string, string>): StoreRow | null {
  const id = row["id"] ?? row["店舗id"];
  const chain = row["chain"] ?? row["店舗名"] ?? row["チェーン名"];
  const category = row["category"] ?? row["カテゴリ"];
  if (!id || !chain || !category) return null;
  return {
    id: id.replace(/\s+/g, "_").toLowerCase(),
    chain,
    category,
    aliases: row["aliases"] ?? row["別名"] ?? "",
    acceptedMethodIds: row["acceptedmethodids"] ?? row["対応決済"] ?? "",
    notes: row["notes"] ?? row["備考"] ?? undefined,
  };
}

function buildStoreJson(rows: Record<string, string>[]) {
  const seen = new Set<string>();
  return rows
    .map(mapStoreRow)
    .filter((r): r is StoreRow => r !== null)
    .filter((r) => {
      if (seen.has(r.id)) {
        console.warn(`Duplicate store id skipped: ${r.id}`);
        return false;
      }
      seen.add(r.id);
      return true;
    })
    .map((r) => ({
      id: r.id,
      chain: r.chain,
      category: r.category,
      aliases: r.aliases ? r.aliases.split(",").map((s) => s.trim()).filter(Boolean) : [],
      acceptedMethodIds: r.acceptedMethodIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(r.notes ? { notes: r.notes } : {}),
    }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching: ${CSV_URL}`);
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error(`HTTP ${res.status} — Check that the sheet is publicly viewable.`);
    console.error("Share → Anyone with the link → Viewer");
    process.exit(1);
  }
  const text = await res.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    console.error("No rows found. Is the sheet empty?");
    process.exit(1);
  }

  if (INSPECT) {
    const headers = Object.keys(rows[0]);
    console.log("\n=== Headers ===");
    headers.forEach((h, i) => console.log(`  [${i}] ${h}`));
    console.log("\n=== Sample rows (first 3) ===");
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      Object.entries(row).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    });
    console.log(`\nTotal rows: ${rows.length}`);
    console.log("\nUpdate scripts/sync-from-sheets.ts mapStoreRow() to match these column names.");
    return;
  }

  // Build and write stores.json
  const stores = buildStoreJson(rows);
  if (stores.length === 0) {
    console.error("No stores could be mapped. Run --inspect to check column names.");
    process.exit(1);
  }

  const outPath = resolve(DATA_DIR, "stores.json");
  writeFileSync(outPath, JSON.stringify(stores, null, 2) + "\n");
  console.log(`✓ Wrote ${stores.length} stores to ${outPath}`);

  // Update manifest generatedAt
  const manifestPath = resolve(DATA_DIR, "manifest.json");
  const manifest = JSON.parse(
    await import("fs").then((fs) => fs.readFileSync(manifestPath, "utf-8"))
  );
  manifest.generatedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ Updated manifest.generatedAt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
