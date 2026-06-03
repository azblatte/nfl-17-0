#!/usr/bin/env node
// Refresh career stats from nflverse (CC-BY) and upgrade modern entries in ../stats.js.
//
//   node tools/refresh_stats.mjs
//
// Pulls regular-season player stats for 1999-CURRENT, aggregates career totals, and overwrites
// the stats for any player whose ROOKIE SEASON is 1999+ (so nflverse captures their full career).
// Pre-1999 legends and head coaches keep their curated full-career figures untouched.
// Data: https://github.com/nflverse/nflverse-data  (Lee Sharpe / nflverse, CC-BY 4.0)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, "..", "stats.js");
const FIRST = 1999;
const LAST = new Date().getFullYear();
const BASE = "https://github.com/nflverse/nflverse-data/releases/download";

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

const num = (r, i) => { const v = parseFloat(r[i]); return Number.isFinite(v) ? v : 0; };
function passerRating(a) {
  if (!a.att) return 0;
  const cl = (x) => Math.max(0, Math.min(2.375, x));
  const c1 = cl((a.comp / a.att - 0.3) * 5), c2 = cl((a.pyd / a.att - 3) * 0.25);
  const c3 = cl((a.ptd / a.att) * 20), c4 = cl(2.375 - (a.intc / a.att) * 25);
  return ((c1 + c2 + c3 + c4) / 6) * 100;
}

// rookie season per player name
console.log("• fetching player index…");
const pl = parseCSV(await getText(`${BASE}/players/players.csv`));
const ph = pl[0], pName = ph.indexOf("display_name"), pRook = ph.indexOf("rookie_season");
const rookie = {};
for (let i = 1; i < pl.length; i++) {
  const n = pl[i][pName], r = parseInt(pl[i][pRook], 10);
  if (n && Number.isFinite(r) && (rookie[n] == null || r < rookie[n])) rookie[n] = r;
}

// aggregate career totals across all regular seasons
const C = {};
for (let y = FIRST; y <= LAST; y++) {
  let text;
  try { text = await getText(`${BASE}/stats_player/stats_player_reg_${y}.csv`); }
  catch { console.log(`  (skip ${y})`); continue; }
  const rows = parseCSV(text), h = rows[0], ix = (k) => h.indexOf(k);
  const f = { name: ix("player_display_name"), comp: ix("completions"), att: ix("attempts"),
    pyd: ix("passing_yards"), ptd: ix("passing_tds"), intc: ix("passing_interceptions"),
    car: ix("carries"), ryd: ix("rushing_yards"), rtd: ix("rushing_tds"),
    rec: ix("receptions"), recyd: ix("receiving_yards"), rectd: ix("receiving_tds") };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], n = r[f.name]; if (!n) continue;
    const a = (C[n] ||= { comp: 0, att: 0, pyd: 0, ptd: 0, intc: 0, car: 0, ryd: 0, rtd: 0, rec: 0, recyd: 0, rectd: 0 });
    a.comp += num(r, f.comp); a.att += num(r, f.att); a.pyd += num(r, f.pyd); a.ptd += num(r, f.ptd); a.intc += num(r, f.intc);
    a.car += num(r, f.car); a.ryd += num(r, f.ryd); a.rtd += num(r, f.rtd);
    a.rec += num(r, f.rec); a.recyd += num(r, f.recyd); a.rectd += num(r, f.rectd);
  }
  process.stdout.write(`\r• aggregated through ${y}`);
}
console.log();

const { STATS } = (new Function(fs.readFileSync(STATS_FILE, "utf8") + ";return {STATS};"))();
let up = 0;
for (const pos of ["QB", "RB", "WR", "TE"]) {
  for (const name of Object.keys(STATS[pos])) {
    const a = C[name]; if (!a || !(rookie[name] >= FIRST)) continue;
    if (pos === "QB" && a.att >= 50) STATS[pos][name] = [Math.round(a.pyd), Math.round(a.ptd), +passerRating(a).toFixed(1)];
    else if (pos === "RB" && a.car >= 20) STATS[pos][name] = [Math.round(a.ryd), Math.round(a.rtd), +(a.ryd / a.car).toFixed(1)];
    else if ((pos === "WR" || pos === "TE") && a.rec >= 10) STATS[pos][name] = [Math.round(a.rec), Math.round(a.recyd), Math.round(a.rectd)];
    else continue;
    up++;
  }
}

const emit = (o) => Object.keys(o).map((k) => `    ${JSON.stringify(k)}: [${o[k].join(", ")}]`).join(",\n");
fs.writeFileSync(STATS_FILE, `// Career stat lines per unique player, keyed by position then name.
// QB: [passYds, passTD, rating] · RB: [rushYds, rushTD, ypc]
// WR/TE: [rec, recYds, recTD] · HC: [wins, titles]
// Modern players (rookie 1999+) are real career totals aggregated from nflverse (CC-BY).
// Pre-1999 players and head coaches are curated full-career figures.
// Regenerate with:  node tools/refresh_stats.mjs
const STATS = {
  QB: {
${emit(STATS.QB)}
  },
  RB: {
${emit(STATS.RB)}
  },
  WR: {
${emit(STATS.WR)}
  },
  TE: {
${emit(STATS.TE)}
  },
  HC: {
${emit(STATS.HC)}
  }
};
`);
console.log(`✓ upgraded ${up} modern players from nflverse → stats.js`);
