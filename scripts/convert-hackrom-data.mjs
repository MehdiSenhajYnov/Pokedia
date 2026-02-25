#!/usr/bin/env node
/**
 * convert-hackrom-data.mjs
 *
 * Parses hackrom documentation files (txt, xlsx) and generates
 * standardized JSON files for import into Pokedia's game selector.
 *
 * Usage: node scripts/convert-hackrom-data.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HACKROM_DIR = path.join(ROOT, "HackRomInfo");
const OUTPUT_DIR = path.join(ROOT, "src-tauri", "data", "games");

// ── Utility: convert display name to PokeAPI name_key slug ──────────
function toNameKey(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[.,:!?()]/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/é/g, "e")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toMoveKey(name) {
  return toNameKey(name);
}

// ── Parse RunBun learnset txt ───────────────────────────────────────
function parseRunBunLearnsets(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const blocks = content.split(/\n\n+/);
  const pokemonOverrides = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) continue;

    const pokemonName = lines[0].trim();
    const nameKey = toNameKey(pokemonName);

    const learnset = [];
    const abilities = [];
    let evolutionMethod = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      const lvMatch = line.match(/^Lv\.\s*(\d+)\s+(.+)$/);
      if (lvMatch) {
        learnset.push({
          move_name_key: toMoveKey(lvMatch[2]),
          learn_method: "level-up",
          level: parseInt(lvMatch[1], 10),
        });
        continue;
      }

      const abilityMatch = line.match(/^(Ability \d|Hidden Ability):\s*(.+)$/);
      if (abilityMatch) {
        const abilityValue = abilityMatch[2].trim();
        if (abilityValue === "None") continue;

        const isHidden = abilityMatch[1] === "Hidden Ability";
        const slotStr = abilityMatch[1].match(/\d/);
        const slot = isHidden ? 3 : slotStr ? parseInt(slotStr[0], 10) : 1;

        abilities.push({
          ability_key: toNameKey(abilityValue),
          slot,
          is_hidden: isHidden,
        });
        continue;
      }

      const evoMatch = line.match(/^Evolves?\s+(.+)$/i);
      if (evoMatch) {
        evolutionMethod = evoMatch[1].trim();
        continue;
      }
    }

    if (learnset.length > 0 || abilities.length > 0) {
      const entry = { name_key: nameKey, learnset, abilities };
      if (evolutionMethod) entry.evolution_method = evolutionMethod;
      pokemonOverrides.push(entry);
    }
  }

  return pokemonOverrides;
}

// ── Parse encounter table xlsx (RunBun/EI format) ───────────────────
// These spreadsheets have routes as column headers (row 0) and pokemon
// names in cells under each route. Format: columns alternate Level, Pokemon.
function parseEncounterTableXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const locationMap = new Map(); // nameKey → Set<location>

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 3) continue;

    // Row 0 has route/area names in header cells
    const headerRow = rows[0].map((c) => String(c).trim());
    // Row 1 usually has "Level", "Pokémon"/"Pokemon" alternating
    // Row 2+ has the actual data

    // Build column→route mapping from header row
    // Routes appear every N columns (usually 2: Level + Pokemon, or 3: Level + Pokemon + Caught)
    const colToRoute = {};
    let currentRoute = "";
    for (let c = 0; c < headerRow.length; c++) {
      if (headerRow[c] && headerRow[c].length > 1) {
        currentRoute = headerRow[c].replace(/\t/g, "").replace(/\r/g, "").trim();
      }
      colToRoute[c] = currentRoute;
    }

    // Detect which columns contain Pokemon names (look at row 1 for "Pokémon" or "Pokemon")
    const pokemonCols = new Set();
    if (rows.length > 1) {
      const labelRow = rows[1].map((c) => String(c).trim());
      for (let c = 0; c < labelRow.length; c++) {
        if (/pok[eé]mon/i.test(labelRow[c])) {
          pokemonCols.add(c);
        }
      }
    }

    // If no "Pokemon" label found, try to detect from data:
    // assume every other column starting from col 3 (after encounter type + rate)
    if (pokemonCols.size === 0) {
      // Fallback: scan data rows for strings that look like pokemon names
      for (let c = 1; c < (rows[0]?.length || 0); c++) {
        for (let r = 2; r < Math.min(rows.length, 10); r++) {
          const val = String(rows[r]?.[c] || "").trim();
          if (val && /^[A-Z][a-z]/.test(val) && !/^\d/.test(val) && val.length > 2) {
            pokemonCols.add(c);
            break;
          }
        }
      }
    }

    // Parse data rows
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r];
      for (const col of pokemonCols) {
        const val = String(row[col] || "").trim();
        if (!val || val === "#N/A" || val === "N/A" || /^\d+$/.test(val)) continue;

        // Could be a pokemon name - might include form suffix like "Goodra-H"
        const route = colToRoute[col] || sheetName;
        if (!route) continue;

        const nameKey = toNameKey(val);
        if (!nameKey || nameKey.length < 2) continue;

        if (!locationMap.has(nameKey)) {
          locationMap.set(nameKey, new Set());
        }
        locationMap.get(nameKey).add(`${route} [${sheetName}]`);
      }
    }
  }

  // Convert Sets to arrays
  const result = new Map();
  for (const [key, locs] of locationMap) {
    result.set(key, [...locs]);
  }
  return result;
}

// ── Parse Radical Red encounter table xlsx ──────────────────────────
// Similar but routes are in row 2 instead of row 0, and has different column spacing
function parseRadicalRedEncounters(filePath) {
  const workbook = XLSX.readFile(filePath);
  const locationMap = new Map();

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "Main" || sheetName === "Source" || sheetName === "Dex") continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 4) continue;

    // For RR sheets, route names are often in row 2 or row 0
    // Find the row that has route names (cells with uppercase text > 5 chars)
    let routeRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      let routeCount = 0;
      for (const cell of row) {
        const s = String(cell).trim();
        if (s.length > 3 && /ROUTE|CITY|CAVE|FOREST|TOWER|ISLAND|TUNNEL|MOUNTAIN|MT\.|SAFARI|MANSION|PLANT|ROAD/i.test(s)) {
          routeCount++;
        }
      }
      if (routeCount >= 3) { routeRowIdx = r; break; }
    }
    if (routeRowIdx === -1) continue;

    const routeRow = rows[routeRowIdx].map((c) => String(c).trim());

    // Build column→route mapping
    const colToRoute = {};
    let currentRoute = "";
    for (let c = 0; c < routeRow.length; c++) {
      if (routeRow[c] && routeRow[c].length > 2 && !/^(level|pok|caught|rod|surf)/i.test(routeRow[c])) {
        currentRoute = routeRow[c].replace(/\t/g, "").replace(/\r/g, "").trim();
      }
      colToRoute[c] = currentRoute;
    }

    // Find pokemon columns
    const pokemonCols = new Set();
    for (let r = 0; r < Math.min(rows.length, routeRowIdx + 3); r++) {
      const row = rows[r];
      for (let c = 0; c < (row?.length || 0); c++) {
        const s = String(row[c]).trim();
        if (/^pok[eé]mon$/i.test(s)) {
          pokemonCols.add(c);
        }
      }
    }

    // Parse data rows (start after headers)
    const dataStart = routeRowIdx + 2;
    for (let r = dataStart; r < rows.length; r++) {
      const row = rows[r];
      for (const col of pokemonCols) {
        const val = String(row[col] || "").trim();
        if (!val || val.length < 2 || /^\d+$/.test(val)) continue;

        const route = colToRoute[col] || "";
        if (!route) continue;

        const nameKey = toNameKey(val);
        if (!nameKey || nameKey.length < 2) continue;

        if (!locationMap.has(nameKey)) {
          locationMap.set(nameKey, new Set());
        }
        locationMap.get(nameKey).add(`${route} [${sheetName}]`);
      }
    }
  }

  const result = new Map();
  for (const [key, locs] of locationMap) {
    result.set(key, [...locs]);
  }
  return result;
}

// ── Parse TM/Item locations from Radical Red xlsx ───────────────────
function parseRadicalRedItems(filePath) {
  const workbook = XLSX.readFile(filePath);
  const itemLocations = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "Main" || sheetName === "Source") continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Find header row with "LOCATION" or "Location"
    let headerIdx = -1;
    let nameCol = -1;
    let locationCol = -1;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      for (let c = 0; c < (row?.length || 0); c++) {
        const s = String(row[c]).trim().toUpperCase();
        if (s === "LOCATION") locationCol = c;
        if (s === "TM" || s === "MOVE" || s === "ITEM" || s === "MEGA STONE" || s === "TM ## - NAME" || s.includes("NAME")) {
          nameCol = c;
        }
      }
      if (locationCol >= 0) { headerIdx = r; break; }
    }

    if (headerIdx < 0 || locationCol < 0) continue;

    // If no name col found, use col before location
    if (nameCol < 0) nameCol = Math.max(0, locationCol - 1);

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const itemStr = String(row[nameCol] || "").trim();
      const locStr = String(row[locationCol] || "").trim();

      if (!itemStr || !locStr || locStr.length < 3) continue;

      // Extract item name: "TM001 - Close Combat" → "close-combat", or just "Venusaurite"
      let itemName = itemStr;
      const tmMatch = itemStr.match(/^(?:TM|HM)\d+\s*[-–]\s*(.+)/i);
      if (tmMatch) itemName = tmMatch[1];

      const nameKey = toNameKey(itemName);
      if (!nameKey || nameKey.length < 2) continue;

      const existing = itemLocations.find((il) => il.name_key === nameKey);
      if (existing) {
        if (!existing.locations.includes(locStr)) {
          existing.locations.push(locStr);
        }
      } else {
        itemLocations.push({ name_key: nameKey, locations: [locStr] });
      }
    }
  }

  return itemLocations;
}

// ── Parse Emerald Imperium item locations xlsx ──────────────────────
function parseEmeraldImperiumItems(filePath) {
  const workbook = XLSX.readFile(filePath);
  const itemLocations = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Find header row
    let headerIdx = -1;
    let nameCol = -1;
    let locationCol = -1;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      for (let c = 0; c < (row?.length || 0); c++) {
        const s = String(row[c]).trim().toUpperCase();
        if (s === "LOCATION" || s.includes("LOCATION")) locationCol = c;
        if (s.includes("TM") || s.includes("NAME") || s.includes("MOVE") || s.includes("ITEM") || s.includes("MEGA")) {
          nameCol = c;
        }
      }
      if (locationCol >= 0 && nameCol >= 0) { headerIdx = r; break; }
    }

    if (headerIdx < 0) continue;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const itemStr = String(row[nameCol] || "").trim();
      const locStr = String(row[locationCol] || "").trim();

      if (!itemStr || !locStr || locStr.length < 3) continue;

      let itemName = itemStr;
      const tmMatch = itemStr.match(/^(?:TM|HM)\d+\s*[-–]\s*(.+)/i);
      if (tmMatch) itemName = tmMatch[1];

      const nameKey = toNameKey(itemName);
      if (!nameKey || nameKey.length < 2) continue;

      const existing = itemLocations.find((il) => il.name_key === nameKey);
      if (existing) {
        if (!existing.locations.includes(locStr)) {
          existing.locations.push(locStr);
        }
      } else {
        itemLocations.push({ name_key: nameKey, locations: [locStr] });
      }
    }
  }

  return itemLocations;
}

// ── Build RunBun JSON ───────────────────────────────────────────────
function buildRunBun() {
  console.log("Building RunBun data...");

  const learnsetPath = path.join(HACKROM_DIR, "RunBunDoc", "Learnset, Evolution Methods and Abilities.txt");
  const locationsPath = path.join(HACKROM_DIR, "RunBunDoc", "Pokémon Locations.xlsx");

  const pokemonOverrides = parseRunBunLearnsets(learnsetPath);
  console.log(`  ${pokemonOverrides.length} pokemon from learnset file`);

  // Parse locations and merge
  if (fs.existsSync(locationsPath)) {
    const locationMap = parseEncounterTableXlsx(locationsPath);
    console.log(`  ${locationMap.size} pokemon with location data`);

    for (const override of pokemonOverrides) {
      const locs = locationMap.get(override.name_key);
      if (locs && locs.length > 0) {
        override.locations = locs;
        locationMap.delete(override.name_key);
      }
    }

    // Add pokemon that have locations but weren't in the learnset file
    for (const [nameKey, locs] of locationMap) {
      pokemonOverrides.push({
        name_key: nameKey,
        learnset: [],
        abilities: [],
        locations: locs,
      });
    }
  }

  const output = {
    game: {
      id: "runbun",
      name_en: "RunBun",
      name_fr: "RunBun",
      base_rom: "emerald",
      version: "1.0",
      author: "RunBun Team",
      is_hackrom: true,
      sort_order: 0,
      coverage: "full",
    },
    pokemon_overrides: pokemonOverrides,
    move_overrides: [],
    item_locations: [],
  };

  console.log(`  Total: ${pokemonOverrides.length} pokemon overrides`);
  return output;
}

// ── Build Radical Red JSON ──────────────────────────────────────────
function buildRadicalRed() {
  console.log("Building Radical Red data...");

  const locationsPath = path.join(HACKROM_DIR, "RadicalRedDoc", "Pokémon Locations & Raid Dens v4.1 - Radical Red.xlsx");
  const itemLocationsPath = path.join(HACKROM_DIR, "RadicalRedDoc", "Item, TM, and Move Tutor Locations v4.1 - Radical Red.xlsx");

  let pokemonOverrides = [];
  let itemLocations = [];

  if (fs.existsSync(locationsPath)) {
    const locationMap = parseRadicalRedEncounters(locationsPath);
    console.log(`  ${locationMap.size} pokemon with location data`);

    for (const [nameKey, locs] of locationMap) {
      pokemonOverrides.push({
        name_key: nameKey,
        learnset: [],
        abilities: [],
        locations: locs,
      });
    }
  }

  if (fs.existsSync(itemLocationsPath)) {
    itemLocations = parseRadicalRedItems(itemLocationsPath);
    console.log(`  ${itemLocations.length} item location entries`);
  }

  const output = {
    game: {
      id: "radical-red",
      name_en: "Radical Red",
      name_fr: "Radical Red",
      base_rom: "firered",
      version: "4.1",
      author: "sPokemon",
      is_hackrom: true,
      sort_order: 1,
      coverage: "changes_only",
    },
    pokemon_overrides: pokemonOverrides,
    move_overrides: [],
    item_locations: itemLocations,
  };

  console.log(`  Total: ${pokemonOverrides.length} pokemon, ${itemLocations.length} items`);
  return output;
}

// ── Build Emerald Imperium JSON ─────────────────────────────────────
function buildEmeraldImperium() {
  console.log("Building Emerald Imperium data...");

  const encounterPath = path.join(HACKROM_DIR, "EmeraldImperiumDoc", "Emerald Imperium 1.3 Encounter Tracker.xlsx");
  const itemLocationsPath = path.join(HACKROM_DIR, "EmeraldImperiumDoc", "Item (TMs, Mega Stones, etc) and Useful NPC Locations_.xlsx");

  let pokemonOverrides = [];
  let itemLocations = [];

  if (fs.existsSync(encounterPath)) {
    const locationMap = parseEncounterTableXlsx(encounterPath);
    console.log(`  ${locationMap.size} pokemon with location data`);

    for (const [nameKey, locs] of locationMap) {
      pokemonOverrides.push({
        name_key: nameKey,
        learnset: [],
        abilities: [],
        locations: locs,
      });
    }
  }

  if (fs.existsSync(itemLocationsPath)) {
    itemLocations = parseEmeraldImperiumItems(itemLocationsPath);
    console.log(`  ${itemLocations.length} item location entries`);
  }

  const output = {
    game: {
      id: "emerald-imperium",
      name_en: "Emerald Imperium",
      name_fr: "Emerald Imperium",
      base_rom: "emerald",
      version: "1.3",
      author: "Emerald Imperium Team",
      is_hackrom: true,
      sort_order: 2,
      coverage: "changes_only",
    },
    pokemon_overrides: pokemonOverrides,
    move_overrides: [],
    item_locations: itemLocations,
  };

  console.log(`  Total: ${pokemonOverrides.length} pokemon, ${itemLocations.length} items`);
  return output;
}

// ── Main ────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const runbun = buildRunBun();
  fs.writeFileSync(path.join(OUTPUT_DIR, "runbun.json"), JSON.stringify(runbun, null, 2));
  console.log(`  -> runbun.json written\n`);

  const radicalRed = buildRadicalRed();
  fs.writeFileSync(path.join(OUTPUT_DIR, "radical-red.json"), JSON.stringify(radicalRed, null, 2));
  console.log(`  -> radical-red.json written\n`);

  const emeraldImperium = buildEmeraldImperium();
  fs.writeFileSync(path.join(OUTPUT_DIR, "emerald-imperium.json"), JSON.stringify(emeraldImperium, null, 2));
  console.log(`  -> emerald-imperium.json written\n`);

  console.log("Done! All hackrom JSON files generated.");
}

main();
