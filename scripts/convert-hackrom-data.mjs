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
import { PDFParse } from "pdf-parse";

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

// ── Helper: add an item location to the accumulator ─────────────────
function addItemLocation(itemLocations, nameKey, location) {
  if (!nameKey || nameKey.length < 2 || !location || location.length < 3) return;
  // Normalize newlines
  const loc = location.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const existing = itemLocations.find((il) => il.name_key === nameKey);
  if (existing) {
    if (!existing.locations.includes(loc)) {
      existing.locations.push(loc);
    }
  } else {
    itemLocations.push({ name_key: nameKey, locations: [loc] });
  }
}

// ── Extract item name_key from a display string ─────────────────────
function itemNameKey(itemStr) {
  let name = itemStr.trim();
  // "TM 120 - Ice Spinner" or "TM001 - Close Combat" or "HM01 - Cut" → move name
  const tmMatch = name.match(/^(?:TM|HM)\s*\d+\s*[-–]\s*(.+)/i);
  if (tmMatch) name = tmMatch[1];
  // "Potion [x1]" → "Potion"
  name = name.replace(/\s*\[x?\d+\]\s*/gi, "");
  return toNameKey(name);
}

// ── Parse TM/Item locations from Radical Red xlsx ───────────────────
function parseRadicalRedItems(filePath) {
  const workbook = XLSX.readFile(filePath);
  const itemLocations = [];

  // ── TMs & HMs: col 0=TM#, col 2=Move name, col 4=Location ──
  {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["TMs & HMs"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      const moveName = String(rows[r][2] || "").trim();
      const location = String(rows[r][4] || "").trim();
      if (!moveName || !location) continue;
      const tmNum = String(rows[r][0] || "").trim();
      const prefix = parseInt(tmNum, 10) > 100 ? "" : `TM${tmNum.padStart(3, "0")} - `;
      addItemLocation(itemLocations, toMoveKey(moveName), `${prefix}${moveName}: ${location}`);
    }
  }

  // ── Overworld Items: col 3=Item name, col 5=Location ──
  {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Overworld Items"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      const itemStr = String(rows[r][3] || "").trim();
      const location = String(rows[r][5] || "").trim();
      if (!itemStr || !location) continue;
      const nameKey = itemNameKey(itemStr);
      addItemLocation(itemLocations, nameKey, location);
    }
  }

  // ── Mega Stones: name at col 4 row N, location at col 3 row N+1 ──
  {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Mega Stones"], { header: 1, defval: "" });
    for (let r = 0; r < rows.length - 1; r++) {
      const row = (rows[r] || []).map((c) => String(c).trim());
      const name = row[4];
      if (!name || name.length < 3) continue;
      // Next row has location in col 3
      const nextRow = (rows[r + 1] || []).map((c) => String(c).trim());
      const location = nextRow[3];
      if (!location) continue;
      addItemLocation(itemLocations, toNameKey(name), location);
    }
  }

  // ── Z-Crystals: col 3=Crystal name, col 5=Location ──
  if (workbook.Sheets["Z-Crystals"]) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Z-Crystals"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      const name = String(rows[r][3] || "").trim();
      const location = String(rows[r][5] || "").trim();
      if (!name || !location) continue;
      // Z-crystal names: "Bugium" → "buginium-z" (PokeAPI format)
      let nameKey = toNameKey(name);
      // Append "-z" if not already there and it looks like a Z-crystal
      if (!nameKey.endsWith("-z") && /ium$/.test(nameKey)) {
        nameKey += "-z";
      }
      addItemLocation(itemLocations, nameKey, location);
    }
  }

  return itemLocations;
}

// ── Parse Emerald Imperium item locations xlsx ──────────────────────
function parseEmeraldImperiumItems(filePath) {
  const workbook = XLSX.readFile(filePath);
  const itemLocations = [];

  // ── TM & HM Locations: col 0/1 for TMs, col 5/6 for HMs ──
  {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["TM & HM Locations"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      // Left side: TMs (col 0 = "TM001 - Focus Punch", col 1 = location)
      const tmStr = String(rows[r][0] || "").trim();
      const tmLoc = String(rows[r][1] || "").trim();
      if (tmStr && tmLoc) {
        const nameKey = itemNameKey(tmStr);
        // Include the TM label in the location text for context
        addItemLocation(itemLocations, nameKey, `${tmStr}: ${tmLoc}`);
      }
      // Right side: HMs (col 5 = "HM01 - Cut", col 6 = location)
      const hmStr = String(rows[r][5] || "").trim();
      const hmLoc = String(rows[r][6] || "").trim();
      if (hmStr && hmLoc) {
        const nameKey = itemNameKey(hmStr);
        addItemLocation(itemLocations, nameKey, `${hmStr}: ${hmLoc}`);
      }
    }
  }

  // ── Mega Stones: dual columns (col 0/1 left, col 4/5 right) ──
  {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Mega Stones"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      // Left side
      const leftName = String(rows[r][0] || "").trim();
      const leftLoc = String(rows[r][1] || "").trim();
      if (leftName && leftLoc) {
        addItemLocation(itemLocations, toNameKey(leftName), leftLoc);
      }
      // Right side
      const rightName = String(rows[r][4] || "").trim();
      const rightLoc = String(rows[r][5] || "").trim();
      if (rightName && rightLoc) {
        addItemLocation(itemLocations, toNameKey(rightName), rightLoc);
      }
    }
  }

  // ── Battle Item Rewards: col 0=Item, col 1=Battle ──
  if (workbook.Sheets["Battle Item Rewards"]) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Battle Item Rewards"], { header: 1, defval: "" });
    for (let r = 1; r < rows.length; r++) {
      const itemStr = String(rows[r][0] || "").trim();
      const battle = String(rows[r][1] || "").trim();
      if (!itemStr || !battle) continue;
      const nameKey = toNameKey(itemStr);
      addItemLocation(itemLocations, nameKey, battle);
    }
  }

  return itemLocations;
}

// ── Parse RunBun item locations from PDF ─────────────────────────────
async function parseRunBunItemsPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(buf);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();

  const itemLocations = [];

  // Collect all lines across pages
  const allLines = [];
  for (const page of result.pages) {
    const lines = page.text.split("\n").map((l) => l.trim()).filter(Boolean);
    allLines.push(...lines);
  }

  // Track current section item key for "Xxx Location" headers (pages 1-3)
  let currentSectionKey = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // Skip header/notice lines (e.g. "Item \tLocation" or "Item \tLocation \tBerry \tLocation \tBerry Yield")
    if (/^Item\s*\t/i.test(line) && /Location/i.test(line)) { currentSectionKey = null; continue; }
    if (/^All items except/i.test(line)) { currentSectionKey = null; continue; }

    // Section header: "Heart Scale Location", "Rare Candy Location"
    if (/^[A-Z][\w\s]+ Location$/i.test(line) && !line.includes("\t")) {
      const itemName = line.replace(/\s+Location$/i, "").trim();
      currentSectionKey = toNameKey(itemName);
      continue;
    }

    // Lines without tabs: not data, end current section
    if (!line.includes("\t")) {
      currentSectionKey = null;
      continue;
    }

    const parts = line.split("\t").map((p) => p.trim());

    // If we're in a named section (Heart Scale / Rare Candy): Route\tDescription
    if (currentSectionKey && parts.length >= 2) {
      const route = parts[0];
      const desc = parts[1];
      addItemLocation(itemLocations, currentSectionKey, `${route}: ${desc}`);
      continue;
    }

    // TM/HM line: "TM01 Struggle Bug\tLocation" or "HM01 Cut\tLocation"
    const tmMatch = parts[0].match(/^(TM|HM)\s*(\d+)\s+(.+)/i);
    if (tmMatch) {
      const moveName = tmMatch[3];
      const nameKey = toMoveKey(moveName);
      const location = parts[1] || "";
      addItemLocation(itemLocations, nameKey, location);
      // Right-side columns: Move Tutors (col 2=Move, col 3=Location)
      if (parts.length >= 4 && parts[2] && parts[3]) {
        addItemLocation(itemLocations, toMoveKey(parts[2]), parts[3]);
      }
      continue;
    }

    // Regular Item\tLocation (possibly with Berry\tLocation\tYield on the right)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const nameKey = toNameKey(parts[0]);
      if (nameKey && nameKey.length >= 2) {
        addItemLocation(itemLocations, nameKey, parts[1]);
      }
      // Berry column (col 2=Berry, col 3=Location)
      if (parts.length >= 4 && parts[2] && parts[3]) {
        const berryKey = toNameKey(parts[2]);
        if (berryKey && berryKey.length >= 2) {
          addItemLocation(itemLocations, berryKey, parts[3]);
        }
      }
    }
  }

  return itemLocations;
}

// ── Build RunBun JSON ───────────────────────────────────────────────
async function buildRunBun() {
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

  // Parse item locations from PDF
  let itemLocations = [];
  const itemPdfPath = path.join(HACKROM_DIR, "RunBunDoc", "Item Locations.pdf");
  if (fs.existsSync(itemPdfPath)) {
    itemLocations = await parseRunBunItemsPdf(itemPdfPath);
    console.log(`  ${itemLocations.length} item location entries from PDF`);
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
    item_locations: itemLocations,
  };

  console.log(`  Total: ${pokemonOverrides.length} pokemon, ${itemLocations.length} items`);
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
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const runbun = await buildRunBun();
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
