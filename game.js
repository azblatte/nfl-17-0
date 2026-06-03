/* 17-0 — spin a team+era, pick a player from that offense+coach into an open slot. */

// Six roster slots to fill. WR appears twice. `pos` maps to the data position key.
const SLOT_DEFS = [
  { key: "QB", label: "Quarterback", pos: "QB" },
  { key: "RB", label: "Running Back", pos: "RB" },
  { key: "WR1", label: "Wide Receiver", pos: "WR" },
  { key: "WR2", label: "Wide Receiver", pos: "WR" },
  { key: "TE", label: "Tight End", pos: "TE" },
  { key: "HC", label: "Head Coach", pos: "HC" },
];

const POS_ORDER = ["QB", "RB", "WR", "TE", "HC"];
const POS_LABEL = { QB: "Quarterbacks", RB: "Running Backs", WR: "Wide Receivers", TE: "Tight Ends", HC: "Head Coach" };

// Column header + format type per position (index matches the STATS value arrays).
const STAT_COLS = {
  QB: [["YDS", "comma"], ["TD", "int"], ["RTG", "dec"]],
  RB: [["YDS", "comma"], ["TD", "int"], ["YPC", "dec"]],
  WR: [["REC", "int"], ["YDS", "comma"], ["TD", "int"]],
  TE: [["REC", "int"], ["YDS", "comma"], ["TD", "int"]],
  HC: [["WINS", "int"], ["TITLES", "int"]],
};
function fmtStat(val, type) {
  if (val == null) return "—";
  if (type === "comma") return val.toLocaleString("en-US");
  if (type === "dec") return val.toFixed(1);
  return String(val);
}

// Every (team, decade) that has at least one player, for fast random rolls.
const ALL_CELLS = [];
for (const t of Object.keys(CELLS)) {
  for (const d of Object.keys(CELLS[t])) ALL_CELLS.push({ t, d });
}

let state = null;

function freshState(mode) {
  return {
    mode,
    slots: SLOT_DEFS.map((s) => ({ ...s, pick: null })),
    teamSkips: 1,
    decadeSkips: 1,
    current: null, // { team, decade }
    spinning: false,
  };
}

/* ---------- slot helpers ---------- */

const $ = (id) => document.getElementById(id);
function teamLabel(k) { return `${TEAMS[k].city} ${TEAMS[k].name}`; }

// Positions that still have an open slot (deduped).
function openPositions() {
  const open = new Set();
  state.slots.forEach((s) => { if (!s.pick) open.add(s.pos); });
  return open;
}

function cellAt(team, decade) {
  return (CELLS[team] && CELLS[team][decade]) || { QB: [], RB: [], WR: [], TE: [], HC: [] };
}

// Does this cell let you fill at least one currently-open slot?
function cellIsUseful(team, decade) {
  const open = openPositions();
  const cell = cellAt(team, decade);
  return [...open].some((pos) => (cell[pos] || []).length > 0);
}

function rosterComplete() { return state.slots.every((s) => s.pick); }

/* ---------- spinning ---------- */

function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]; }

function rollCell(filter) {
  // Prefer cells that can fill an open slot; fall back to any.
  let pool = ALL_CELLS.filter((c) => cellIsUseful(c.t, c.d) && (!filter || filter(c)));
  if (!pool.length) pool = ALL_CELLS.filter((c) => cellIsUseful(c.t, c.d));
  if (!pool.length) pool = ALL_CELLS;
  return pickRandom(pool);
}

function spinTo(cell) {
  state.spinning = true;
  renderControls();
  const teamReel = $("team-reel"), decReel = $("decade-reel");
  let ticks = 0;
  const total = 15;
  const iv = setInterval(() => {
    teamReel.textContent = teamLabel(pickRandom(Object.keys(TEAMS)));
    decReel.textContent = pickRandom(DECADES);
    if (++ticks >= total) {
      clearInterval(iv);
      state.current = { team: cell.t, decade: cell.d };
      state.spinning = false;
      renderAll();
    }
  }, 55);
}

function spinFresh() { spinTo(rollCell(null)); }
function teamSkip() {
  if (state.teamSkips <= 0 || !state.current || state.spinning) return;
  state.teamSkips--;
  const cur = state.current;
  spinTo(rollCell((c) => c.t !== cur.team));
}
function decadeSkip() {
  if (state.decadeSkips <= 0 || !state.current || state.spinning) return;
  state.decadeSkips--;
  const cur = state.current;
  spinTo(rollCell((c) => c.d !== cur.decade));
}

/* ---------- picking ---------- */

function pickPlayer(player) {
  if (state.spinning || rosterComplete()) return;
  // Fill the first open slot matching the player's position.
  const slot = state.slots.find((s) => s.pos === player.pos && !s.pick);
  if (!slot) return; // position already full — chip should be disabled
  slot.pick = player;
  state.current = null;
  if (rosterComplete()) return finish();
  renderRoster();
  spinFresh();
}

/* ---------- rendering ---------- */

function renderRoster() {
  const wrap = $("roster");
  wrap.innerHTML = "";
  const hide = state.mode === "gridiq" && !rosterComplete();
  state.slots.forEach((s) => {
    const div = document.createElement("div");
    div.className = "slot-chip" + (s.pick ? " filled" : "");
    let detail = "—";
    if (s.pick) detail = hide ? s.pick.n : `${s.pick.n} · ${s.pick.s}`;
    div.innerHTML = `<span class="slot-pos">${s.key === "WR1" || s.key === "WR2" ? "WR" : s.key}</span>
      <span class="slot-name">${detail}</span>`;
    wrap.appendChild(div);
  });
}

function renderCard() {
  const card = $("card");
  if (!state.current) { card.className = "card empty"; card.innerHTML = "<p>Spinning…</p>"; return; }
  const { team, decade } = state.current;
  const cell = cellAt(team, decade);
  const open = openPositions();
  const hide = state.mode === "gridiq";
  const t = TEAMS[team];
  card.className = "card";
  card.style.setProperty("--team", t.color);
  card.style.setProperty("--team-alt", t.alt);

  let blocks = "";
  for (const pos of POS_ORDER) {
    const players = (cell[pos] || []).slice().sort((a, b) => b.s - a.s);
    if (!players.length) continue;
    const posOpen = open.has(pos);
    const cols = STAT_COLS[pos];
    const headStats = cols.map((c) => `<th class="c-num">${c[0]}</th>`).join("");
    const rows = players.map((p) => {
      const v = (STATS[pos] && STATS[pos][p.n]) || null;
      const statCells = cols.map((c, i) => {
        const val = hide ? "—" : (v ? fmtStat(v[i], c[1]) : "—");
        return `<td class="c-num">${val}</td>`;
      }).join("");
      const ovr = hide ? "—" : p.s;
      return `<tr class="prow${posOpen ? "" : " disabled"}"${posOpen ? ` data-name="${encodeURIComponent(p.n)}" data-pos="${p.pos}"` : ""}>
        <td class="c-name">${p.n}</td>${statCells}<td class="c-num c-ovr">${ovr}</td></tr>`;
    }).join("");
    blocks += `<div class="pos-block${posOpen ? "" : " filledpos"}">
      <div class="pos-title">${POS_LABEL[pos]}${posOpen ? "" : ' <span class="locktag">slot filled</span>'}</div>
      <table class="ptable">
        <thead><tr><th class="c-name">Player</th>${headStats}<th class="c-num c-ovr">OVR</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  card.innerHTML = `<div class="card-bar"></div>
    <div class="card-head"><span class="card-team">${teamLabel(team)}</span><span class="card-era">${decade}</span></div>
    <div class="card-body">${blocks}</div>`;

  card.querySelectorAll(".prow:not(.disabled)").forEach((tr) => {
    tr.addEventListener("click", () => {
      const name = decodeURIComponent(tr.dataset.name);
      const pos = tr.dataset.pos;
      const player = (cell[pos] || []).find((p) => p.n === name);
      if (player) pickPlayer(player);
    });
  });
}

function renderControls() {
  const open = [...openPositions()];
  $("slot-title").textContent = rosterComplete()
    ? "Roster complete"
    : `Still need: ${open.map((p) => (p === "HC" ? "HC" : p)).join(", ")}`;
  $("team-skip").textContent = `Team Skip (${state.teamSkips})`;
  $("decade-skip").textContent = `Decade Skip (${state.decadeSkips})`;
  const busy = state.spinning || !state.current;
  $("team-skip").disabled = state.teamSkips <= 0 || busy;
  $("decade-skip").disabled = state.decadeSkips <= 0 || busy;
}

function renderAll() {
  if (state.current) { $("team-reel").textContent = teamLabel(state.current.team); $("decade-reel").textContent = state.current.decade; }
  renderRoster();
  renderCard();
  renderControls();
}

/* ---------- win projection ---------- */

function projectRecord(scores) {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const balanced = 0.7 * avg + 0.3 * min;
  const norm = Math.max(0, Math.min(1, (balanced - 72) / 20));
  const wins = Math.min(17, Math.round(17 * Math.pow(norm, 1.25)));
  return { wins, losses: 17 - wins, strength: Math.round(balanced) };
}

/* ---------- playoffs ("win it all" sim) ---------- */

function simulatePlayoffs(regularWins, strength) {
  if (regularWins < 10) {
    return { madePlayoffs: false, result: "Missed the playoffs", rounds: [], bye: false,
      totalWins: regularWins, totalLosses: 17 - regularWins, ring: false, perfect20: false };
  }
  const bye = regularWins >= 15; // #1 seed
  const base = Math.max(0.05, Math.min(0.97, (strength - 60) / 40));
  const ROUNDS = [
    { name: "Wild Card", factor: 1.0 },
    { name: "Divisional", factor: 0.92 },
    { name: "Conference", factor: 0.85 },
    { name: "Super Bowl", factor: 0.80 },
  ];
  const start = bye ? 1 : 0; // bye skips Wild Card
  const rounds = [];
  let w = regularWins, l = 17 - regularWins, ring = false, lostAt = null;
  for (let i = start; i < ROUNDS.length; i++) {
    const won = Math.random() < base * ROUNDS[i].factor;
    rounds.push({ name: ROUNDS[i].name, won });
    if (won) { w++; if (ROUNDS[i].name === "Super Bowl") ring = true; }
    else { l++; lostAt = ROUNDS[i].name; break; }
  }
  let result;
  if (ring) result = "Super Bowl Champion";
  else if (lostAt === "Super Bowl") result = "Super Bowl Runner-Up";
  else if (lostAt === "Conference") result = "Lost the Conference Championship";
  else if (lostAt === "Divisional") result = "Lost in the Divisional Round";
  else result = "Lost in the Wild Card";
  return { madePlayoffs: true, bye, result, rounds, totalWins: w, totalLosses: l,
    ring, perfect20: ring && regularWins === 17 };
}

/* ---------- finish / result ---------- */

function finish() {
  const scores = state.slots.map((s) => s.pick.s);
  const r = projectRecord(scores);
  const po = simulatePlayoffs(r.wins, r.strength);

  $("game").classList.add("hidden");
  $("result").classList.remove("hidden");

  $("record").textContent = `${r.wins}-${r.losses}`;
  $("record").className = r.wins === 17 ? "record perfect" : (r.wins >= 13 ? "record great" : (r.wins >= 9 ? "record ok" : "record rough"));
  $("strength").textContent = `Regular season · Strength Rating ${r.strength}`;

  // Playoff epilogue
  const ep = $("epilogue");
  if (!po.madePlayoffs) {
    ep.innerHTML = `<div class="po-result missed">Missed the playoffs</div>
      <div class="po-total">Final record: ${po.totalWins}-${po.totalLosses}</div>`;
  } else {
    const ALLR = ["Wild Card", "Divisional", "Conference", "Super Bowl"];
    const byName = {};
    po.rounds.forEach((rd) => { byName[rd.name] = rd.won; });
    const badges = ALLR.map((name) => {
      let cls = "po-badge", tag = "";
      if (po.bye && name === "Wild Card") { cls += " bye"; tag = "BYE"; }
      else if (byName[name] === true) { cls += " won"; tag = "W"; }
      else if (byName[name] === false) { cls += " lost"; tag = "L"; }
      else { cls += " dim"; tag = "—"; }
      return `<div class="${cls}"><span class="po-name">${name}</span><span class="po-tag">${tag}</span></div>`;
    }).join("");
    ep.innerHTML = `<div class="po-badges">${badges}</div>
      <div class="po-result ${po.ring ? "champ" : ""}">${po.result}</div>
      <div class="po-total">${po.totalWins}-${po.totalLosses} overall</div>`;
  }

  // Verdict
  let verdict;
  if (po.perfect20) verdict = "🏆 20-0. PERFECT SEASON + A RING. You are immortal.";
  else if (po.ring) verdict = "🏆 Super Bowl Champions! A ring for the ages.";
  else if (po.result === "Super Bowl Runner-Up") verdict = "So close — a conference crown but no ring.";
  else if (po.madePlayoffs) verdict = "A playoff team, but the run ended early.";
  else if (r.wins >= 7) verdict = "A middling season. Too many holes to contend.";
  else verdict = "Rough year. Back to the drawing board.";
  $("verdict").textContent = verdict;

  // Final roster
  const list = $("final-roster");
  list.innerHTML = "";
  state.slots.forEach((s) => {
    const p = s.pick, t = TEAMS[p.t];
    const row = document.createElement("div");
    row.className = "final-row";
    row.style.setProperty("--team", t.color);
    row.innerHTML = `<span class="fr-pos">${s.key === "WR1" || s.key === "WR2" ? "WR" : s.key}</span>
      <span class="fr-name">${p.n}</span>
      <span class="fr-team">${teamLabel(p.t)} · ${p.d}</span>
      <span class="fr-score">${p.s}</span>`;
    list.appendChild(row);
  });
}

/* ---------- start / wire-up ---------- */

function startGame(mode) {
  state = freshState(mode);
  $("start").classList.add("hidden");
  $("result").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("mode-tag").textContent = mode === "gridiq" ? "GridIQ Mode" : "Classic Mode";
  renderRoster();
  renderControls();
  spinFresh();
}

function init() {
  $("play-classic").addEventListener("click", () => startGame("classic"));
  $("play-gridiq").addEventListener("click", () => startGame("gridiq"));
  $("team-skip").addEventListener("click", teamSkip);
  $("decade-skip").addEventListener("click", decadeSkip);
  $("again").addEventListener("click", () => {
    $("result").classList.add("hidden");
    $("start").classList.remove("hidden");
  });
}

document.addEventListener("DOMContentLoaded", init);
