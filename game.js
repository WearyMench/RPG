"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false }); // opaque canvas: the compositor never blends it with the page
const A = "assets/Tiny Swords/";
const paths = {
  warriorIdle: A + "Units/Blue Units/Warrior/Warrior_Idle.png", warriorRun: A + "Units/Blue Units/Warrior/Warrior_Run.png", warriorAttack: A + "Units/Blue Units/Warrior/Warrior_Attack1.png",
  archerIdle: A + "Units/Blue Units/Archer/Archer_Idle.png", archerRun: A + "Units/Blue Units/Archer/Archer_Run.png", archerAttack: A + "Units/Blue Units/Archer/Archer_Shoot.png", arrow: A + "Units/Blue Units/Archer/Arrow.png",
  lancerIdle: A + "Units/Blue Units/Lancer/Lancer_Idle.png", lancerRun: A + "Units/Blue Units/Lancer/Lancer_Run.png", lancerAttack: A + "Units/Blue Units/Lancer/Lancer_Right_Attack.png",
  monkIdle: A + "Units/Blue Units/Monk/Idle.png", monkRun: A + "Units/Blue Units/Monk/Run.png", monkAttack: A + "Units/Blue Units/Monk/Heal.png", monkEffect: A + "Units/Blue Units/Monk/Heal_Effect.png",
  enemyIdle: A + "Units/Red Units/Warrior/Warrior_Idle.png", enemyRun: A + "Units/Red Units/Warrior/Warrior_Run.png", enemyAttack: A + "Units/Red Units/Warrior/Warrior_Attack1.png",
  boss: A + "Factions/Goblins/Troops/Torch/Red/Torch_Red.png",
  castle: A + "Buildings/Blue Buildings/Castle.png", redCastle: A + "Buildings/Red Buildings/Castle.png",
  blueHouse1: A + "Buildings/Blue Buildings/House1.png", blueHouse2: A + "Buildings/Blue Buildings/House2.png", blueHouse3: A + "Buildings/Blue Buildings/House3.png", blueTower: A + "Buildings/Blue Buildings/Tower.png",
  redHouse1: A + "Buildings/Red Buildings/House1.png", redHouse2: A + "Buildings/Red Buildings/House2.png", redTower: A + "Buildings/Red Buildings/Tower.png",
  tree1: A + "Decorations/Trees/Tree1.png", tree2: A + "Decorations/Trees/Tree2.png", tree3: A + "Decorations/Trees/Tree3.png", tree4: A + "Decorations/Trees/Tree4.png",
  rock1: A + "Decorations/Rocks/Rock1.png", rock2: A + "Decorations/Rocks/Rock2.png", rock3: A + "Decorations/Rocks/Rock3.png", rock4: A + "Decorations/Rocks/Rock4.png",
  bush1: A + "Decorations/Bushes/Bushe1.png", bush2: A + "Decorations/Bushes/Bushe2.png", bush3: A + "Decorations/Bushes/Bushe3.png", bush4: A + "Decorations/Bushes/Bushe4.png",
  sheep: A + "Decorations/Sheep/Sheep_Idle.png", sheepMove: A + "Decorations/Sheep/Sheep_Move.png", sheepGrass: A + "Decorations/Sheep/Sheep_Grass.png",
  pawn: A + "Factions/Knights/Troops/Pawn/Blue/Pawn_Blue.png", goblinTower: A + "Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png", goblinHouse: A + "Factions/Goblins/Buildings/Wood_House/Goblin_House.png",
  ruinHouse: A + "Factions/Knights/Buildings/House/House_Destroyed.png", ruinTower: A + "Factions/Knights/Buildings/Tower/Tower_Destroyed.png", construction: A + "Factions/Knights/Buildings/House/House_Construction.png", fire: A + "Effects/Fire/Fire.png", dead: A + "Factions/Knights/Troops/Dead/Dead.png",
  tilemap1: A + "Terrain/Tilemap_color1.png", tilemap2: A + "Terrain/Tilemap_color2.png", tilemap3: A + "Terrain/Tilemap_color3.png",
  water1: A + "Terrain/Water_FlatGround_1_(12frames).png", water2: A + "Terrain/Water_FlatGround_2_(12frames).png", water3: A + "Terrain/Water_FlatGround_3_(12frames).png", water4: A + "Terrain/Water_FlatGround_4_(12frames).png", waterBg: A + "Terrain/Water Background color.png",
};
const classes = {
  warrior: { name: "Warrior", description: "Balanced melee fighter", hp: 9, speed: 220, range: 112, cooldown: .5, damage: 2, idle: 8, run: 6, attack: 4, size: 112, foot: 32 },
  archer: { name: "Archer", description: "Fast ranged attacker", hp: 6, speed: 235, range: 520, cooldown: .72, damage: 1, idle: 6, run: 4, attack: 8, size: 108, foot: 32 },
  lancer: { name: "Lancer", description: "Durable with extra reach", hp: 11, speed: 195, range: 158, cooldown: .7, damage: 2, idle: 12, run: 6, attack: 3, size: 122, foot: 47 },
  monk: { name: "Monk", description: "Healing area pulse", hp: 8, speed: 210, range: 175, cooldown: 1.15, damage: 1, idle: 6, run: 4, attack: 11, size: 108, foot: 33 },
};
const images = {}, WORLD = { w: 41 * 64, h: 28 * 64 }, keys = new Set(), ARROW_SPEED = 570;
let state, last = performance.now(), groundCache = null, groundChunks = [], waterRuns = [], touchUsed = false;
const CHUNK = 512;
const upgradePool = [
  { id: "power", name: "Tempered Weapon", description: "+1 damage", apply: () => state.hero.damageBonus++ },
  { id: "vitality", name: "Heart of the Valley", description: "+2 maximum health and heal", apply: () => { state.hero.maxHp += 2; state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 3); } },
  { id: "agility", name: "Windstep", description: "+25 movement speed", apply: () => state.hero.speed += 25 },
  { id: "reach", name: "Long Reach", description: "+20 attack range", apply: () => state.hero.rangeBonus += 20 },
  { id: "haste", name: "Quick Hands", description: "Ability recharges 12% faster", apply: () => state.hero.cooldownScale *= .88 },
];

const seeded = n => { const x = Math.sin(n * 999.31) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Images are fully decoded up front (as ImageBitmaps when supported) so the first time a sprite appears doesn't hitch.
const loadImage = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; })
  .then(img => window.createImageBitmap ? createImageBitmap(img).catch(() => img) : img);
const formatTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const storage = {
  get(key, fallback) { try { const v = localStorage.getItem("cotv." + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem("cotv." + key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
};

// Tiny synthesized sound effects; no audio files needed.
const audio = {
  ctx: null, muted: storage.get("muted", false),
  unlock() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } if (this.ctx?.state === "suspended") this.ctx.resume(); },
  tone(freq, dur, type = "square", vol = .06, slide = 0, delay = 0) {
    if (this.muted || !this.ctx) return; const t = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(.0001, t + dur); osc.connect(gain).connect(this.ctx.destination); osc.start(t); osc.stop(t + dur + .02);
  },
  noise(dur, vol = .08, delay = 0) {
    if (this.muted || !this.ctx) return; const t = this.ctx.currentTime + delay, len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len); const src = this.ctx.createBufferSource(), gain = this.ctx.createGain(); gain.gain.value = vol; src.buffer = buf; src.connect(gain).connect(this.ctx.destination); src.start(t);
  },
  play(name) {
    switch (name) {
      case "swing": this.noise(.09, .05); this.tone(420, .08, "triangle", .03, -220); break;
      case "shoot": this.tone(900, .1, "triangle", .04, -500); break;
      case "pulse": this.tone(330, .35, "sine", .06, 330); this.tone(495, .35, "sine", .04, 250, .05); break;
      case "hit": this.noise(.07, .09); this.tone(180, .08, "square", .04, -80); break;
      case "kill": this.tone(260, .2, "square", .05, -180); this.noise(.15, .06); break;
      case "hurt": this.tone(140, .22, "sawtooth", .07, -70); break;
      case "level": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .16, "square", .04, 0, i * .08)); break;
      case "wave": this.tone(392, .18, "square", .045); this.tone(523, .3, "square", .045, 0, .16); break;
      case "win": [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, .22, "square", .045, 0, i * .13)); break;
      case "lose": [392, 330, 262, 196].forEach((f, i) => this.tone(f, .3, "triangle", .06, 0, i * .2)); break;
      case "select": this.tone(660, .07, "square", .04); this.tone(990, .1, "square", .035, 0, .06); break;
      case "ignite": this.noise(.25, .07); this.tone(220, .25, "sawtooth", .025, 160); break;
      case "heal": this.tone(660, .12, "sine", .05, 220); this.tone(990, .16, "sine", .035, 0, .08); break;
      case "roar": this.tone(110, .7, "sawtooth", .07, -50); this.noise(.6, .08); this.tone(82, .8, "square", .04, -30, .1); break;
      case "baa": this.tone(560, .1, "sawtooth", .025, -40); this.tone(520, .22, "sawtooth", .025, -90, .1); break;
    }
  },
  toggle() { this.muted = !this.muted; storage.set("muted", this.muted); if (!this.muted) { this.unlock(); this.play("select"); } },
};

/* ---------- Terrain: a tile-built island on animated water, using the Tiny Swords tilemaps ---------- */
const TILE = 64, COLS = WORLD.w / TILE, ROWS = WORLD.h / TILE;
// Raised terraces built from the "Elevation On Land" tiles; a cliff row is drawn under the last grass row.
const PLATEAUS = [
  { c0: 2, c1: 8, r0: 4, r1: 8, tiles: 1 },     // blue village terrace (castle)
  { c0: 32, c1: 38, r0: 4, r1: 8, tiles: 2 },   // red stronghold terrace (castle)
  { c0: 11, c1: 14, r0: 4, r1: 6, tiles: 3 },   // northern hill
  { c0: 24, c1: 26, r0: 3, r1: 4, tiles: 1 },   // hill beside the bay
  { c0: 14, c1: 18, r0: 22, r1: 24, tiles: 2 }, // southern hill
];
let terrain = null, waterPattern = null;

function isLandCell(c, r) {
  const settlementRows = r >= 3 && r <= 11; // keep a full shoreline behind the two terraces
  // Coast offsets change in runs of several tiles so the shoreline reads as bays and headlands, not jagged teeth.
  const top = 2 + (seeded(Math.floor((c + 1) / 4) * 1.7 + 3) > .55 ? 1 : 0), bottom = ROWS - 2 - (seeded(Math.floor((c + 2) / 4) + 51) > .5 ? 1 : 0);
  const left = 1 + (!settlementRows && seeded(Math.floor(r / 3) + 91) > .5 ? 1 : 0), right = COLS - 2 - (!settlementRows && seeded(Math.floor((r + 1) / 3) + 131) > .5 ? 1 : 0);
  if (r < top || r > bottom || c < left || c > right) return false;
  if (c >= 17 && c <= 21 && r <= 4) return false;      // northern bay
  if (c >= 18 && c <= 20 && r === 5) return false;
  if (c >= 24 && c <= 27 && r >= ROWS - 3) return false; // southern cove
  if (c >= 19 && c <= 22 && r >= 17 && r <= 19) return false; // inland lake
  if (c >= 20 && c <= 21 && r === 16) return false;
  return true;
}

const cellIndex = (c, r) => r * COLS + c;
const inGrid = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const landAt = (c, r) => inGrid(c, r) && terrain.land[cellIndex(c, r)] === 1;
function isSolidAt(x, y) { const c = Math.floor(x / TILE), r = Math.floor(y / TILE); return !inGrid(c, r) || terrain.solid[cellIndex(c, r)] === 1; }
function plateauAt(x, y) { const c = Math.floor(x / TILE), r = Math.floor(y / TILE); return inGrid(c, r) && terrain.plateau[cellIndex(c, r)] >= 0; }

function buildTerrain() {
  const land = new Uint8Array(COLS * ROWS), plateau = new Int8Array(COLS * ROWS).fill(-1), solid = new Uint8Array(COLS * ROWS), shores = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) land[cellIndex(c, r)] = isLandCell(c, r) ? 1 : 0;
  PLATEAUS.forEach((p, k) => { for (let r = p.r0; r <= p.r1 + 1; r++) for (let c = p.c0; c <= p.c1; c++) { plateau[cellIndex(c, r)] = k; land[cellIndex(c, r)] = 1; } });
  for (let i = 0; i < solid.length; i++) solid[i] = !land[i] || plateau[i] >= 0 ? 1 : 0;
  terrain = { land, plateau, solid, shores };
  // Animated foam sits in every water cell that touches land, turned to face the shore.
  const southShore = (c, r) => landAt(c, r) && !landAt(c, r + 1);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!landAt(c, r)) continue; const offset = Math.floor(seeded(c * 31 + r * 7) * 12), mid = (c + r) % 2 ? 2 : 3;
    if (!landAt(c, r + 1)) { const leftEnd = !southShore(c - 1, r), rightEnd = !southShore(c + 1, r); shores.push({ c, r: r + 1, rot: 0, piece: leftEnd && rightEnd ? 4 : leftEnd || rightEnd ? 1 : mid, flip: rightEnd && !leftEnd, offset }); }
    if (!landAt(c, r - 1)) shores.push({ c, r: r - 1, rot: Math.PI, piece: mid, flip: false, offset });
    if (!landAt(c - 1, r)) shores.push({ c: c - 1, r, rot: Math.PI / 2, piece: mid, flip: false, offset });
    if (!landAt(c + 1, r)) shores.push({ c: c + 1, r, rot: -Math.PI / 2, piece: mid, flip: false, offset });
  }
}

// 9-slice autotiling: picks the edge, strip, or single piece from a block's 4×5 layout.
function autotile(has, c, r) {
  const n = has(c, r - 1), s = has(c, r + 1), w = has(c - 1, r), e = has(c + 1, r);
  return [w && e ? 1 : !w && e ? 0 : w && !e ? 2 : 3, n && s ? 1 : !n && s ? 0 : n && !s ? 2 : 4];
}

// The static land (flat island plus raised terraces) is painted once; water and foam animate per frame.
function buildGroundCache() {
  buildTerrain();
  waterPattern = ctx.createPattern(images.waterBg, "repeat");
  groundCache = document.createElement("canvas"); groundCache.width = WORLD.w; groundCache.height = WORLD.h;
  const g = groundCache.getContext("2d"); g.imageSmoothingEnabled = false;
  // Flat ground block: columns 1–4, rows 1–3 plus the horizontal strip on row 5. Bottom pieces carry a shore lip into the next row.
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!landAt(c, r)) continue; const [col, row] = autotile(landAt, c, r), bottom = row === 2 || row === 4;
    g.drawImage(images.tilemap3, 64 + col * 64, 64 + row * 64, 64, bottom ? 128 : 64, c * TILE, r * TILE, TILE, bottom ? 128 : 64);
  }
  // Elevation On Land block starts at column 11; each bottom grass row is followed by its cliff face.
  for (const p of PLATEAUS) {
    const img = images[`tilemap${p.tiles}`], has = (c, r) => c >= p.c0 && c <= p.c1 && r >= p.r0 && r <= p.r1;
    for (let r = p.r0; r <= p.r1; r++) for (let c = p.c0; c <= p.c1; c++) {
      const [col, row] = autotile(has, c, r), sx = 704 + col * 64, sy = 64 + row * 64;
      g.drawImage(img, sx, sy, 64, 64, c * TILE, r * TILE, TILE, TILE);
      if (row === 2 || row === 4) g.drawImage(img, sx, sy + 64, 64, 64, c * TILE, (r + 1) * TILE, TILE, TILE);
    }
  }
  // A world-sized canvas is too big for browsers to keep on the GPU, so drawing from it re-uploads it every frame.
  // Splitting it into 512px chunks keeps each piece GPU-resident; each one is drawn once now so the upload happens while loading.
  groundChunks = [];
  for (let y = 0; y < WORLD.h; y += CHUNK) for (let x = 0; x < WORLD.w; x += CHUNK) {
    const c = document.createElement("canvas"); c.width = Math.min(CHUNK, WORLD.w - x); c.height = Math.min(CHUNK, WORLD.h - y);
    c.getContext("2d").drawImage(groundCache, -x, -y); groundChunks.push({ x, y, c }); ctx.drawImage(c, 0, 0, 1, 1);
  }
  ctx.clearRect(0, 0, 2, 2); groundCache = null;
  // Interior land tiles are opaque, so water is only painted on water cells and along the coast (row runs, merged).
  const needsWater = (c, r) => { if (!landAt(c, r)) return true; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!landAt(c + dc, r + dr)) return true; return false; };
  waterRuns = [];
  for (let r = 0; r < ROWS; r++) { const runs = []; let start = -1; for (let c = 0; c <= COLS; c++) { const w = c < COLS && needsWater(c, r); if (w && start < 0) start = c; else if (!w && start >= 0) { runs.push([start, c]); start = -1; } } waterRuns.push(runs); }
}

function drawGround() {
  // Only the visible slice is drawn (with a margin for screen shake).
  const cam = state.camera, sx = clamp(Math.floor(cam.x) - 16, 0, WORLD.w), sy = clamp(Math.floor(cam.y) - 16, 0, WORLD.h), sw = Math.min(WORLD.w - sx, Math.ceil(innerWidth) + 32), sh = Math.min(WORLD.h - sy, Math.ceil(innerHeight) + 32);
  if (sw <= 0 || sh <= 0) return;
  ctx.fillStyle = waterPattern || "#47aba9";
  for (let r = Math.floor(sy / TILE), r1 = Math.min(ROWS - 1, Math.floor((sy + sh) / TILE)); r <= r1; r++) for (const [c0, c1] of waterRuns[r]) {
    const x0 = Math.max(c0 * TILE, sx), x1 = Math.min(c1 * TILE, sx + sw); if (x1 > x0) ctx.fillRect(x0, r * TILE, x1 - x0, TILE);
  }
  const t = state.time * 8;
  for (const s of terrain.shores) {
    const x = s.c * TILE, y = s.r * TILE; if (x + TILE < sx || x > sx + sw || y + TILE < sy || y > sy + sh) continue;
    ctx.save(); ctx.translate(x + 32, y + 32); ctx.rotate(s.rot); if (s.flip) ctx.scale(-1, 1);
    ctx.drawImage(images[`water${s.piece}`], (Math.floor(t + s.offset) % 12) * 64, 0, 64, 64, -32, -32, 64, 64); ctx.restore();
  }
  for (const k of groundChunks) if (k.x + k.c.width > sx && k.x < sx + sw && k.y + k.c.height > sy && k.y < sy + sh) ctx.drawImage(k.c, k.x, k.y);
}

function buildScenery() {
  const items = [], obstacles = [];
  const segDist = (x, y, [ax, ay], [bx, by]) => { const vx = bx - ax, vy = by - ay, t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(x - ax - vx * t, y - ay - vy * t); };
  const nearTrail = (x, y, d) => segDist(x, y, [WORKSITE.pickup.x, WORKSITE.pickup.y], [WORKSITE.drop.x, WORKSITE.drop.y]) < d; // keep the porter's route clear
  const reserved = [WORKSITE.cutter, WORKSITE.builder, WORKSITE.build, { x: 1300, y: 780 }];
  const open = (x, y, pad = 24) => !isSolidAt(x - pad, y) && !isSolidAt(x + pad, y) && !isSolidAt(x, y - pad / 2) && !isSolidAt(x, y + 10) && !obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + pad) && !reserved.some(p => Math.hypot(x - p.x, y - p.y) < 60);
  const building = (key, x, y, w, h, radius) => { items.push({ type: "building", key, x, y, w, h, sortY: y }); if (radius) obstacles.push({ x, y: y - 36, r: radius }); };
  const tree = (x, y, variant, frame, onTerrace = false, keep = false) => { if (!onTerrace && !keep && (!open(x, y, 30) || nearTrail(x, y, 46))) return; items.push({ type: "tree", variant, frame, x, y, sortY: y }); if (!onTerrace) obstacles.push({ x, y: y - 18, r: 34 }); };
  const rock = (x, y, variant) => { if (!open(x + 32, y + 50) || nearTrail(x + 32, y + 50, 40)) return; items.push({ type: "rock", variant, x, y, sortY: y + 58 }); obstacles.push({ x: x + 30, y: y + 38, r: 20 }); };
  const decor = (type, x, y, extra) => { if (open(x, y, 18) && !nearTrail(x, y, 24)) items.push({ type, x, y, sortY: y, ...extra }); };
  const anim = (key, x, y, w, h, frames, radius) => { items.push({ type: "anim", key, x, y, w, h, frames, sortY: y }); obstacles.push({ x, y: y - 30, r: radius }); };

  // Castles crown their terraces; houses and towers gather at the foot of the cliffs.
  building("castle", 352, 548, 320, 256, 0); building("redCastle", 2272, 548, 320, 256, 0);
  building("blueTower", 165, 830, 128, 256, 52);
  building("blueHouse1", 720, 650, 128, 192, 48); building("blueHouse2", 870, 730, 128, 192, 48); building("blueHouse3", 560, 1220, 128, 192, 48);
  building("redTower", 2385, 1165, 128, 256, 52);
  building("redHouse1", 1950, 650, 128, 192, 48); building("redHouse2", 2180, 1250, 128, 192, 48);
  // Village work site: a house going up and the woodcutter's tree.
  building("construction", WORKSITE.build.x, WORKSITE.build.y, 128, 192, 46); tree(WORKSITE.tree.x, WORKSITE.tree.y, 0, 2, false, true);
  // The ruined watch in the middle of the valley, and goblin outposts guarding the red frontier.
  building("ruinHouse", 1240, 780, 128, 192, 44); building("ruinTower", 1395, 730, 128, 256, 50);
  // Goblin camp: two watchtowers and a hut around a bonfire, plus a lookout near the red houses.
  anim("goblinTower", 1660, 700, 205, 154, 4, 46); anim("goblinTower", 1700, 1250, 205, 154, 4, 46); anim("goblinTower", 2000, 1255, 205, 154, 4, 46); building("goblinHouse", 1850, 1185, 128, 192, 46);
  items.push({ type: "fire", x: 1850, y: 1290, frame: 0, sortY: 1290, hazard: true, camp: true }); // the Flame Warden rises from here
  // The ruins still smoulder.
  // Drawn on top of the rubble: placed on it, but sorted just in front of the ruined building.
  items.push({ type: "fire", x: 1228, y: 738, frame: 3, sortY: 781, scale: .62, smoke: true }); items.push({ type: "fire", x: 1398, y: 688, frame: 5, sortY: 731, scale: .7, smoke: true });
  // The village hearth: resting beside it heals the hero while no invaders are near.
  items.push({ type: "fire", x: 600, y: 815, frame: 2, sortY: 815, scale: .8, hearth: true }); obstacles.push({ x: 600, y: 808, r: 14 });

  // Trees on the terraces and hills (decorative, the terraces themselves block movement).
  [[178, 318], [530, 318], [2098, 318], [2450, 318], [760, 330], [880, 300], [925, 420], [1590, 262], [1690, 300], [960, 1480], [1090, 1450], [1170, 1570], [1010, 1585]]
    .forEach((p, i) => tree(p[0], p[1], i % 4, (i * 3) % 8, true));
  // Forest belts frame the battlefield; anything that would land in water or on a cliff is skipped.
  for (let i = 0; i < 16; i++) tree(90 + i * 155 + seeded(i) * 45, 250 + seeded(i + 40) * 220, i % 4, i % 8);
  for (let i = 0; i < 14; i++) tree(100 + i * 175 + seeded(i + 80) * 55, 1390 + seeded(i + 120) * 260, (i + 2) % 4, (i + 3) % 8);
  [[1040, 560], [1260, 620], [1540, 520], [1770, 590], [930, 1310], [1260, 1330], [1510, 1320], [1810, 1450], [1990, 1330]].forEach((p, i) => tree(p[0], p[1], i % 4, (i * 2) % 8));
  [[75, 990], [210, 1120], [430, 1490], [860, 1180], [1450, 560], [1350, 1560], [1660, 420], [1880, 1210], [2040, 430], [2390, 1430], [2550, 700], [2290, 1550]].forEach((p, i) => rock(p[0], p[1], i % 4));

  // Bushes, sheep and campfires add life to the open grass.
  [[490, 780], [690, 820], [820, 830], [430, 1160], [650, 1130], [1960, 760], [2150, 820], [2410, 1180], [1180, 760], [1420, 1180], [1620, 700], [1110, 1080], [300, 1330], [2560, 1300], [1720, 1180], [990, 880]]
    .forEach((p, i) => decor("bush", p[0], p[1], { variant: i % 4, frame: i % 8 }));
  // Stones scattered among the ruins.
  [[1170, 800], [1460, 790], [1300, 690]].forEach((p, i) => rock(p[0], p[1], (i + 1) % 4));
  items.sort((a, b) => a.sortY - b.sortY);
  return { items, obstacles };
}

/* ---------- Living world: sheep, villagers and ambient details ---------- */
// Village work site: a woodcutter's tree, a house under construction, and the porter's route between them.
const WORKSITE = { tree: { x: 700, y: 1420 }, cutter: { x: 652, y: 1430 }, build: { x: 400, y: 1200 }, builder: { x: 476, y: 1186 }, pickup: { x: 640, y: 1395 }, drop: { x: 470, y: 1225 } };
const PAWN_ROW = { idle: 0, run: 1, hammer: 2, axe: 3, carryIdle: 4, carryRun: 5 };
let ambient = null, lastBaa = 0;

function buildCritters() {
  const critters = [];
  // A flock grazing the meadow south of the village, plus a pair near the southern hill.
  [[330, 1080, 0], [420, 1010, 1], [520, 1090, 2], [760, 1060, 3], [860, 1130, 4], [260, 960, 5], [1280, 1720, 6], [1360, 1700, 7]].forEach(([x, y, i]) => {
    if (!isSolidAt(x, y)) critters.push({ kind: "sheep", x, y, home: { x, y }, origin: { x, y }, mode: "graze", t: 1 + seeded(i) * 3, anim: seeded(i + 9) * 4, facing: i % 2 ? 1 : -1, vx: 0, vy: 0 });
  });
  // Villagers shelter by the blue tower when invaders come close.
  critters.push({ kind: "pawn", role: "axe", state: "work", x: WORKSITE.cutter.x, y: WORKSITE.cutter.y, post: WORKSITE.cutter, facing: 1, workFacing: 1, anim: 0, chopped: -1, shelter: { x: 250, y: 720 } });
  critters.push({ kind: "pawn", role: "hammer", state: "work", x: WORKSITE.builder.x, y: WORKSITE.builder.y, post: WORKSITE.builder, facing: -1, workFacing: -1, anim: .4, shelter: { x: 300, y: 690 } });
  critters.push({ kind: "pawn", role: "porter", state: "work", x: WORKSITE.pickup.x, y: WORKSITE.pickup.y, post: WORKSITE.pickup, facing: -1, workFacing: -1, anim: 0, phase: "load", t: 1, shelter: { x: 200, y: 700 } });
  return critters;
}

// Scores 16 headings: prefers going away from the threat and toward open ground, avoids passing close to the threat, rejects dead ends.
function chooseEscape(s, threat) {
  const away = Math.atan2(s.y - threat.y, s.x - threat.x); let best = [Math.cos(away), Math.sin(away)], bestScore = -Infinity;
  const clear = (x, y) => !isSolidAt(x - 14, y) && !isSolidAt(x + 14, y) && !isSolidAt(x, y + 6) && !isSolidAt(x, y - 8) && !state.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + 22);
  for (let i = 0; i < 16; i++) {
    const a = away + i / 16 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let free = 0;
    for (let step = 20; step <= 140; step += 20) { if (!clear(s.x + dx * step, s.y + dy * step)) break; free = step; }
    const tx = threat.x - s.x, ty = threat.y - s.y, along = clamp(tx * dx + ty * dy, 0, Math.max(free, 1)), pass = Math.hypot(tx - dx * along, ty - dy * along);
    const score = Math.cos(a - away) + free / 140 * 2.2 - (pass < 56 ? 3 : 0) - (free < 40 ? 4 : 0) + Math.random() * .15;
    if (score > bestScore) { bestScore = score; best = [dx, dy]; }
  }
  return best;
}

function updateSheep(s, dt) {
  const threats = [state.hero, ...state.enemies.filter(e => !e.dead)].filter(Boolean);
  let near = null, nd = Infinity; for (const a of threats) { const d = distance(a, s); if (d < nd) { nd = d; near = a; } }
  s.t -= dt; s.anim += dt; s.think = (s.think || 0) - dt;
  if (near && nd < 130) {
    if (s.mode !== "flee") { s.mode = "flee"; s.think = 0; const cam = state.camera; if (state.time - lastBaa > 1.2 && s.x > cam.x && s.x < cam.x + innerWidth && s.y > cam.y && s.y < cam.y + innerHeight) { lastBaa = state.time; audio.play("baa"); } }
    s.t = .9; if (s.think <= 0) { [s.vx, s.vy] = chooseEscape(s, near); s.think = .25; }
  }
  if (s.mode === "flee") {
    const px = s.x, py = s.y, speed = 165; moveWithCollisions(s, s.vx * speed * dt, s.vy * speed * dt);
    if (Math.abs(s.vx) > .2) s.facing = Math.sign(s.vx);
    if (Math.hypot(s.x - px, s.y - py) < speed * dt * .35) s.think = 0; // stuck: rethink next frame
    if (s.t <= 0) { s.mode = "idle"; s.t = 1 + Math.random() * 2; s.home = { x: s.x * .5 + s.home.x * .5, y: s.y * .5 + s.home.y * .5 }; }
  } else if (s.mode === "walk") {
    if (steerTo(s, { x: s.tx, y: s.ty }, 34, dt) || s.t <= 0) { s.mode = Math.random() < .6 ? "graze" : "idle"; s.t = 2 + Math.random() * 3; s.anim = 0; }
  } else if (s.t <= 0) {
    // Wander to a reachable spot near the flock's home (drifting back toward the original meadow).
    for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 100, x = s.home.x + Math.cos(a) * r, y = s.home.y + Math.sin(a) * r * .6; if (!isSolidAt(x, y) && !state.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + 30)) { s.mode = "walk"; s.tx = x; s.ty = y; s.t = 5; break; } }
    s.home.x += (s.origin.x - s.home.x) * .2; s.home.y += (s.origin.y - s.home.y) * .2; if (s.mode !== "walk") s.t = 1;
  }
}

// Navigation grid (32px cells) for villagers: water, cliffs and scenery obstacles are not walkable.
const NAV = 32, NAV_W = Math.ceil(WORLD.w / NAV), NAV_H = Math.ceil(WORLD.h / NAV), DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
let navGrid = null;
function buildNav() {
  navGrid = new Uint8Array(NAV_W * NAV_H);
  for (let r = 0; r < NAV_H; r++) for (let c = 0; c < NAV_W; c++) {
    const x = c * NAV + NAV / 2, y = r * NAV + NAV / 2;
    navGrid[r * NAV_W + c] = !isSolidAt(x - 14, y) && !isSolidAt(x + 14, y) && !isSolidAt(x, y + 6) && !isSolidAt(x, y - 8) && !state.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + 20) ? 1 : 0;
  }
}
// Breadth-first search over the grid; returns waypoints ending exactly at the goal.
function findPath(from, to, avoid = []) {
  const cell = p => clamp(Math.floor(p.y / NAV), 0, NAV_H - 1) * NAV_W + clamp(Math.floor(p.x / NAV), 0, NAV_W - 1), start = cell(from), goal = cell(to), prev = new Int32Array(NAV_W * NAV_H).fill(-1), queue = [start];
  // Cells around blocking bodies (hero, invaders, other critters) count as closed for this plan.
  for (const b of avoid) for (let r = Math.floor((b.y - 40) / NAV); r <= Math.floor((b.y + 40) / NAV); r++) for (let c = Math.floor((b.x - 40) / NAV); c <= Math.floor((b.x + 40) / NAV); c++) { const i = r * NAV_W + c; if (c >= 0 && r >= 0 && c < NAV_W && r < NAV_H && i !== start && i !== goal && Math.hypot(c * NAV + NAV / 2 - b.x, r * NAV + NAV / 2 - b.y) < 40) prev[i] = -2; }
  prev[start] = start;
  for (let head = 0; head < queue.length && prev[goal] === -1; head++) {
    const cur = queue[head], c = cur % NAV_W, r = (cur - c) / NAV_W;
    for (const [dc, dr] of DIRS8) {
      const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= NAV_W || nr >= NAV_H) continue; const ni = nr * NAV_W + nc;
      if (prev[ni] !== -1 || (!navGrid[ni] && ni !== goal)) continue; // -2 marks avoided cells
      if (dc && dr && (!navGrid[r * NAV_W + nc] || !navGrid[nr * NAV_W + c])) continue; // no corner cutting
      prev[ni] = cur; queue.push(ni);
    }
  }
  if (prev[goal] < 0) return [{ x: to.x, y: to.y }];
  const cells = []; for (let cur = goal; cur !== start; cur = prev[cur]) cells.push(cur); cells.reverse();
  const points = cells.filter((_, i) => i % 2 === 1).map(ci => ({ x: (ci % NAV_W) * NAV + NAV / 2, y: Math.floor(ci / NAV_W) * NAV + NAV / 2 }));
  points.push({ x: to.x, y: to.y }); return points;
}
// Follows a planned route, re-planning if blocked for too long. Returns true on arrival.
function followPath(c, goal, speed, dt) {
  if (!c.path || c.pathGoal !== goal) { c.path = findPath(c, goal); c.pathGoal = goal; c.stuckT = 0; c.bestD = Infinity; }
  const wp = c.path[0];
  if (steerTo(c, wp, speed, dt, c.path.length > 1 ? 12 : 4)) { c.path.shift(); c.bestD = Infinity; if (!c.path.length) { c.path = null; c.pathGoal = null; return true; } return false; }
  // Progress is measured toward the waypoint, so sidestepping back and forth still counts as stuck.
  const d = distance(c, wp); if (d < (c.bestD ?? Infinity) - 3) { c.bestD = d; c.stuckT = 0; } else c.stuckT += dt;
  if (c.stuckT > .7 && c.path.length === 1 && d < 60) { c.path = null; c.pathGoal = null; return true; } // goal occupied: close enough
  if (c.stuckT > .7) { c.bestD = Infinity; c.path = findPath(c, goal, [state.hero, ...state.enemies.filter(e => !e.dead), ...state.critters].filter(b => b && b !== c && distance(b, c) < 160)); c.stuckT = 0; }
  return false;
}

// Walks toward a target, taking a short sidestep whenever something blocks the way. Returns true on arrival.
function steerTo(c, target, speed, dt, arrive = 4) {
  const dx = target.x - c.x, dy = target.y - c.y, d = Math.hypot(dx, dy); if (d < arrive) return true;
  let ux = dx / d, uy = dy / d;
  if (c.detour > 0) { c.detour -= dt; const a = c.detourSide * 1.15, cos = Math.cos(a), sin = Math.sin(a); [ux, uy] = [ux * cos - uy * sin, ux * sin + uy * cos]; }
  const px = c.x, py = c.y, step = Math.min(d, speed * dt); moveWithCollisions(c, ux * step, uy * step);
  if (Math.abs(ux) > .15) c.facing = Math.sign(ux);
  if (Math.hypot(c.x - px, c.y - py) < step * .35 && !(c.detour > 0)) { c.detour = .55; c.detourSide = c.detourSide === 1 ? -1 : 1; }
  return false;
}

function updatePawn(p, dt) {
  p.anim += dt;
  const danger = state.enemies.some(e => !e.dead && distance(e, p) < 280), clear = !state.enemies.some(e => !e.dead && distance(e, p) < 420);
  if (danger && p.state !== "hide") { p.state = "hide"; p.anim = 0; p.path = null; }
  if (p.state === "hide") {
    p.moving = !followPath(p, p.shelter, 115, dt);
    if (!p.moving) { p.facing = 1; if (clear) { p.calm = (p.calm || 0) + dt; if (p.calm > 1.5) { p.state = "return"; p.calm = 0; } } else p.calm = 0; }
    return;
  }
  if (p.state === "return") { p.moving = !followPath(p, p.role === "porter" ? WORKSITE.pickup : p.post, 95, dt); if (!p.moving) { p.state = "work"; p.anim = 0; p.facing = p.workFacing; if (p.role === "porter") { p.phase = "load"; p.t = 1; } } return; }
  p.moving = false;
  if (p.role === "axe") {
    // Wood chips fly on the impact frame of each swing.
    const cycle = Math.floor(p.anim * 9 / 6); if (Math.floor(p.anim * 9) % 6 === 3 && cycle !== p.chopped) { p.chopped = cycle; burst(WORKSITE.tree.x - 18, WORKSITE.tree.y - 30, "#c48a52", 4); }
  } else if (p.role === "porter") {
    p.t -= dt; const target = p.phase === "toDrop" ? WORKSITE.drop : p.phase === "toPickup" ? WORKSITE.pickup : null;
    if (target) { p.moving = true; if (followPath(p, target, 70, dt)) { p.phase = p.phase === "toDrop" ? "unload" : "load"; p.t = p.phase === "load" ? 1.6 : .8; } }
    else if (p.t <= 0) p.phase = p.phase === "load" ? "toDrop" : "toPickup";
  }
}

function updateLife(dt) {
  for (const c of state.critters) { if (c.kind === "sheep") updateSheep(c, dt); else updatePawn(c, dt); }
  // Sheep keep a little personal space from each other.
  const sheep = state.critters.filter(c => c.kind === "sheep");
  for (const a of sheep) for (const b of sheep) { if (a === b) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d < 40) moveWithCollisions(a, dx / (d || 1) * (40 - d) * .3, dy / (d || 1) * (40 - d) * .3); }
  if (state.mode === "select") updateEffects(dt);
}

function drawCritter(c) {
  if (c.kind === "sheep") {
    const moving = c.mode === "walk" || c.mode === "flee", img = c.mode === "graze" ? images.sheepGrass : moving ? images.sheepMove : images.sheep, frames = img.width / 128, fps = c.mode === "flee" ? 14 : moving ? 8 : c.mode === "graze" ? 9 : 5;
    sprite(img, c.x, c.y + 18, c.anim * fps, frames, c.facing, 90); return;
  }
  const working = c.state === "work", row = !working ? (c.moving ? PAWN_ROW.run : PAWN_ROW.idle) : c.role === "axe" ? PAWN_ROW.axe : c.role === "hammer" ? PAWN_ROW.hammer : c.phase === "toDrop" ? PAWN_ROW.carryRun : c.phase === "toPickup" ? PAWN_ROW.run : c.phase === "load" ? PAWN_ROW.idle : PAWN_ROW.carryIdle;
  const fps = c.moving ? 11 : 9, size = 120, col = Math.floor(c.anim * fps) % 6;
  ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.scale(c.facing, 1); ctx.drawImage(images.pawn, col * 192, row * 192, 192, 192, -size / 2, -size * .62, size, size); ctx.restore();
}

/* Ambient details drawn in the pack's style: grass tufts, butterflies, birds, cloud shadows and water glints. */
function pixelCanvas(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw((x, y, color, pw = 1, ph = 1) => { g.fillStyle = color; g.fillRect(x, y, pw, ph); }); return c; }

function buildAmbient() {
  const tufts = [], butterflies = [], tuftFrames = [];
  // Grass tufts: three sway frames, 2px blades with a dark outline like the tile grass.
  for (let f = 0; f < 3; f++) tuftFrames.push(pixelCanvas(16, 12, px => {
    [[2, 6], [5, 9], [8, 7], [11, 5]].forEach(([bx, h], k) => { for (let i = 0; i < h; i++) { const off = Math.round((f - 1) * (k % 2 ? 1 : .6) * i / h); px(bx + off - 1, 11 - i, "#2f5c37"); px(bx + off, 11 - i, i > h - 3 ? "#9fd36a" : "#5a9a40", 2); px(bx + off + 2, 11 - i, "#2f5c37"); } });
  }));
  const free = (x, y) => !isSolidAt(x - 10, y) && !isSolidAt(x + 10, y) && !isSolidAt(x, y - 6) && !isSolidAt(x, y + 6) && !state.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + 22) && !state.scenery.some(s => s.type === "building" && Math.abs(x - s.x) < s.w / 2 && y < s.y + 8 && y > s.y - s.h);
  for (let i = 0; tufts.length < 170 && i < 900; i++) { const x = 70 + seeded(i * 2 + 1) * (WORLD.w - 140), y = 140 + seeded(i * 2 + 2) * (WORLD.h - 260); if (free(x, y)) tufts.push({ x: R(x), y: R(y), phase: seeded(i + 300) * 6 }); }
  const clusters = []; // sunny meadow spots the butterflies circle
  for (let i = 0; clusters.length < 34 && i < 600; i++) {
    const cx = 90 + seeded(i * 3 + 700) * (WORLD.w - 180), cy = 160 + seeded(i * 3 + 701) * (WORLD.h - 300); if (!free(cx, cy)) continue;
    clusters.push({ x: cx, y: cy });
  }
  for (let i = 0; i < 9 && clusters.length; i++) { const home = clusters[(i * 5) % clusters.length]; butterflies.push({ home, color: ["#ffffff", "#ffd36b", "#f6a5c0", "#9ec9ff"][i % 4], a: .5 + seeded(i + 80) * .6, b: .7 + seeded(i + 90) * .6, phase: seeded(i + 100) * 10, r: 30 + seeded(i + 110) * 40 }); }
  const clouds = [0, 1, 2, 3].map(i => ({ x: seeded(i + 200) * WORLD.w, y: 200 + seeded(i + 210) * (WORLD.h - 400), s: .8 + seeded(i + 220) * .7, v: 9 + seeded(i + 230) * 8 }));
  ambient = { tufts, butterflies, clouds, tuftFrames };
}

// Ground-level details, drawn just above the terrain and below everything that sorts by depth.
function drawGroundDetails(view) {
  if (perf.lite) return; // lite mode: no grass tufts or water glints
  const t = state.time, vis = (x, y) => x > view.x - 20 && x < view.x + view.w + 20 && y > view.y - 20 && y < view.y + view.h + 20;
  for (const g of ambient.tufts) if (vis(g.x, g.y)) { const f = Math.floor((Math.sin(t * 1.6 + g.phase) + 1) * 1.49); ctx.drawImage(ambient.tuftFrames[f], g.x - 8, g.y - 11); }
  // Glints twinkle on random patches of open water.
  ctx.fillStyle = "#e8fbff";
  for (let k = 0; k < 18; k++) {
    const cycle = t * .9 + k * .37, slot = Math.floor(cycle), phase = cycle - slot, x = R(view.x + seeded(k * 131 + slot * 7) * view.w), y = R(view.y + seeded(k * 173 + slot * 11) * view.h);
    if (landAt(Math.floor(x / TILE), Math.floor(y / TILE)) || landAt(Math.floor(x / TILE), Math.floor((y - 40) / TILE))) continue;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * .8; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); if (phase > .3 && phase < .7) { ctx.fillRect(x - 3, y, 1, 1); ctx.fillRect(x + 3, y, 1, 1); }
  }
  ctx.globalAlpha = 1;
}

// Sky layer: butterflies, a passing flock with ground shadows, and drifting cloud shadows.
function drawSkyDetails(view) {
  const t = state.time;
  for (const b of ambient.butterflies) {
    const x = R(b.home.x + Math.sin(t * b.a + b.phase) * b.r + Math.sin(t * 2.3 + b.phase) * 8), y = R(b.home.y - 26 + Math.cos(t * b.b + b.phase) * b.r * .45 + Math.sin(t * 5 + b.phase) * 4);
    if (x < view.x - 10 || x > view.x + view.w + 10 || y < view.y - 10 || y > view.y + view.h + 10) continue;
    ellipse(x, y + 24, 3, 1.5, "rgba(20,40,25,.18)");
    if (Math.floor(t * 14 + b.phase) % 2) { rect(x - 3, y - 1, 2, 2, b.color); rect(x + 2, y - 1, 2, 2, b.color); rect(x - 2, y + 1, 1, 1, b.color); rect(x + 2, y + 1, 1, 1, b.color); } else { rect(x - 1, y - 2, 1, 2, b.color); rect(x + 1, y - 2, 1, 2, b.color); }
    rect(x, y - 1, 1, 3, "#2a2f3a");
  }
  // A small flock crosses the island every 28 seconds.
  const period = 28, p = ((t + 6) % period) / period, fx = -300 + p * (WORLD.w + 600), fy = 380 + Math.sin(Math.floor((t + 6) / period) * 2.1) * 260 + p * 300;
  for (let i = 0; i < 5; i++) {
    const x = R(fx - [0, 26, 26, 52, 52][i]), y = R(fy + [0, -14, 14, -28, 28][i] + Math.sin(t * 3 + i) * 3), up = Math.floor(t * 6 + i) % 2;
    ellipse(x + 40, y + 120, 5, 2, "rgba(15,30,30,.16)");
    if (x < view.x - 20 || x > view.x + view.w + 20 || y < view.y - 20 || y > view.y + view.h + 20) continue;
    ctx.fillStyle = "#2a2f3a"; if (up) { ctx.fillRect(x - 5, y - 2, 2, 1); ctx.fillRect(x - 3, y - 1, 2, 1); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x + 2, y - 1, 2, 1); ctx.fillRect(x + 4, y - 2, 2, 1); }
    else { ctx.fillRect(x - 5, y + 1, 2, 1); ctx.fillRect(x - 3, y, 2, 1); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x + 2, y, 2, 1); ctx.fillRect(x + 4, y + 1, 2, 1); }
  }
  if (perf.lite) return; // lite mode: no cloud shadows (large translucent fills)
  ctx.fillStyle = "rgba(14,36,40,.07)";
  for (const c of ambient.clouds) {
    const x = ((c.x + t * c.v) % (WORLD.w + 600)) - 300; if (x + 260 * c.s < view.x || x - 260 * c.s > view.x + view.w) continue;
    for (const [dx, dy, rx, ry] of [[0, 0, 180, 70], [-130, 20, 110, 50], [140, 15, 120, 55], [40, -40, 120, 50]]) { ctx.beginPath(); ctx.ellipse(x + dx * c.s, c.y + dy * c.s, rx * c.s, ry * c.s, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}



/* ---------- Fire: a healing hearth, a bonfire that burns everyone, and the Flame Warden's flames ---------- */
function drawSmoke(x, y, strength = 1) {
  for (let k = 0; k < 4; k++) { const p = (state.time * .45 + k / 4) % 1; ellipse(x + Math.sin(state.time * 1.3 + k * 2) * 7 * p, y - 10 - p * 80, (6 + p * 12) * strength, (5 + p * 9) * strength, `rgba(70,72,78,${.32 * (1 - p) * strength})`); }
}
function drawFire(item) {
  const t = state.time, flare = item.camp && state.enemies.some(e => e.boss && !e.dead) ? 1.4 : 1, k = (item.scale || 1) * flare, size = 96 * k;
  if (item.out) { ellipse(item.x, item.y - 4, 26, 10, "rgba(35,25,20,.55)"); ellipse(item.x - 6, item.y - 6, 4, 2, `rgba(255,120,40,${.5 + Math.sin(t * 6) * .3})`); ellipse(item.x + 7, item.y - 3, 3, 2, `rgba(255,150,60,${.4 + Math.sin(t * 5 + 1) * .3})`); drawSmoke(item.x, item.y - 6, .9); return; }
  if (item.hearth) {
    // A warm circle marks where resting works; it brightens while the hero is resting.
    ctx.strokeStyle = `rgba(255,205,120,${item.resting ? .45 + Math.sin(t * 4) * .15 : .16})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(item.x, item.y - 4, 100, 42, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ellipse(item.x, item.y - 8, 60, 26, `rgba(255,170,80,${.14 + Math.sin(t * 3) * .03})`);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ellipse(item.x + Math.cos(a) * 18, item.y - 3 + Math.sin(a) * 7, 6, 4, "#6b7480"); ellipse(item.x + Math.cos(a) * 18 - 1, item.y - 4 + Math.sin(a) * 7, 4, 2, "#a3adb6"); }
  }
  ellipse(item.x, item.y - 13 * k, (40 + Math.sin(t * 7 + item.frame) * 3) * k, 18 * k, `rgba(251,146,60,${flare > 1 ? .28 : .16})`);
  ctx.drawImage(images.fire, (Math.floor(t * 9 + item.frame) % 7) * 128, 0, 128, 128, Math.round(item.x - size / 2), Math.round(item.y - size * .85), size, size);
  if (item.smoke) drawSmoke(item.x, item.y - size * .6, .8);
}

function ignite(a, seconds) { if (!(a.burn > 0)) audio.play("ignite"); a.burn = Math.max(a.burn || 0, seconds); a.burnTick = a.burnTick > 0 ? a.burnTick : .5; }
// Fire ignores the brief hit-invulnerability and has no knockback.
function fireDamage(e, damage) { if (e.dead) return; e.hp -= damage; e.hurt = Math.max(e.hurt, .12); burst(e.x, e.y - 40, "#fb923c", 6); floatText(e.x, e.y - 110, `-${damage}`, "#ffb36b"); if (e.hp <= 0) killEnemy(e); }

function tendHearth(fire, dt) {
  const h = state.hero, safe = !state.enemies.some(e => !e.dead && distance(e, h) < 450);
  fire.resting = Math.hypot(h.x - fire.x, h.y - fire.y) < 100 && safe && h.hp < h.maxHp;
  if (!fire.resting) { fire.restT = 0; return; }
  if (!state.hearthTip) { state.hearthTip = true; state.bannerText = "THE HEARTH MENDS YOUR WOUNDS"; state.banner = 2.4; }
  fire.restT = (fire.restT || 0) + dt;
  if (fire.restT >= 1.1) { fire.restT = 0; h.hp = Math.min(h.maxHp, h.hp + 1); floatText(h.x, h.y - 125, "+1", "#86efac"); burst(h.x, h.y - 50, "#86efac", 6); audio.play("heal"); }
}

function updateFire(dt) {
  const h = state.hero, boss = state.enemies.find(e => e.boss && !e.dead);
  for (const fire of state.scenery) {
    if (fire.type !== "fire" || fire.out) continue;
    if (fire.hearth) { tendHearth(fire, dt); continue; }
    if (!fire.hazard) continue;
    const reach = 42 * (fire.camp && boss ? 1.3 : 1);
    if (Math.hypot(h.x - fire.x, h.y - fire.y) < reach && h.inv <= 0) { damageHero(1, "#fb923c"); h.inv = .85; h.hurt = .2; ignite(h, .9); }
    // Invaders lured or knocked into the bonfire take heavy damage and keep burning.
    for (const e of state.enemies) if (!e.dead && !e.boss && !(e.burn > 0) && Math.hypot(e.x - fire.x, e.y - fire.y) < reach + 6) { fireDamage(e, 2); ignite(e, 1.6); }
  }
  for (const e of state.enemies) if (e.burn > 0 && !e.dead) { e.burn -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = .5; fireDamage(e, 1); } }
  if (h.burn > 0) h.burn -= dt;
  // The Flame Warden's flames: a warning ring, then a burning patch.
  for (const f of state.flames) {
    if (f.warn > 0) { f.warn -= dt; if (f.warn <= 0) { burst(f.x, f.y - 20, "#fb923c", 12); audio.play("ignite"); shake(3); } continue; }
    f.life -= dt;
    if (f.life > .3 && Math.hypot(h.x - f.x, h.y - f.y) < 34 && h.inv <= 0) { damageHero(1, "#fb923c"); h.inv = .85; h.hurt = .15; ignite(h, .9); }
  }
  state.flames = state.flames.filter(f => f.warn > 0 || f.life > 0);
}

function addFlame(x, y, warn = 0) {
  if (isSolidAt(x, y)) return; state.flames.push({ x, y, warn, life: 3.6, frame: Math.floor(Math.random() * 7) });
  if (state.flames.length > 12) state.flames.shift();
}

function drawFlame(f) {
  if (f.warn > 0) {
    const p = 1 - f.warn / .9; ctx.strokeStyle = `rgba(255,90,40,${.4 + Math.sin(state.time * 20) * .2})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 4, 34, 14, 0, 0, Math.PI * 2); ctx.stroke(); ellipse(f.x, f.y - 4, 34 * p, 14 * p, "rgba(255,90,40,.25)"); return;
  }
  const fade = clamp(f.life / .4, 0, 1), grow = clamp((3.6 - f.life) * 6, .3, 1), size = 70 * grow;
  ctx.globalAlpha = fade; ellipse(f.x, f.y - 6, 30 * grow, 11 * grow, "rgba(60,30,20,.45)");
  ctx.drawImage(images.fire, (Math.floor(state.time * 10 + f.frame) % 7) * 128, 0, 128, 128, Math.round(f.x - size / 2), Math.round(f.y - size * .85), size, size); ctx.globalAlpha = 1;
}

function reset(mode = "select") {
  const map = buildScenery();
  state = { mode, selected: null, hero: null, enemies: [], camera: { x: 0, y: 0 }, time: 0, kills: 0, totalEnemies: 19, wave: 0, maxWaves: 4, waveDelay: 0, banner: 0, bannerText: "", over: false, overTime: 0, won: false, paused: false, shake: 0, battleTime: 0, damageTaken: 0, record: null, particles: [], projectiles: [], texts: [], scenery: map.items, obstacles: map.obstacles, upgradeChoices: [], pendingLevels: 0, joystick: null, critters: buildCritters(), flames: [], hearthTip: false };
  buildNav();
}

function chooseClass(id) {
  const c = classes[id]; state.selected = id; state.mode = "playing"; audio.play("select");
  state.hero = { x: 600, y: 900, hp: c.hp, maxHp: c.hp, speed: c.speed, damageBonus: 0, rangeBonus: 0, cooldownScale: 1, level: 1, xp: 0, xpNext: 4, facing: 1, action: 0, actionDuration: 0, hitDone: false, attackCd: 0, inv: 0, hurt: 0, anim: 0, moving: false, death: 0 }; state.hudHint = 6;
  // Start the camera on the hero instead of sweeping in from the world origin.
  state.camera.x = clamp(state.hero.x - innerWidth / 2, 0, Math.max(0, WORLD.w - innerWidth)); state.camera.y = clamp(state.hero.y - innerHeight / 2, 0, Math.max(0, WORLD.h - innerHeight));
  startWave(1);
}

function makeEnemy(i, wave, boss = false) {
  const hp = boss ? 32 : 3 + wave;
  const spawnPoints = [[1840,780],[1940,940],[2070,1060],[2210,880],[2320,1030],[1730,1010],[1990,820],[2390,780]];
  const point = spawnPoints[i % spawnPoints.length];
  return { x: boss ? 1850 : point[0], y: boss ? 1232 : point[1], castCd: 3, hp, maxHp: hp, speed: boss ? 65 : 70 + wave * 8 + seeded(i + wave * 13) * 16, attackCd: .5 + seeded(i), attack: 0, hitDone: false, hurt: 0, dead: false, death: 0, facing: -1, anim: seeded(i) * 4, boss };
}

function startWave(number) {
  state.wave = number; state.banner = 2.1; state.bannerText = number === state.maxWaves ? "FINAL WAVE · THE FLAME WARDEN" : `WAVE ${number}`; state.waveDelay = 0; audio.play("wave");
  if (number === state.maxWaves) { state.enemies = [makeEnemy(0, number, true)]; const b = state.enemies[0]; burst(b.x, b.y - 40, "#fb923c", 30); burst(b.x, b.y - 20, "#ffd166", 16); shake(8); audio.play("roar"); }
  else { const count = 2 + number * 2; state.enemies = Array.from({ length: count }, (_, i) => makeEnemy(i, number)); }
}

function rollUpgrades() {
  const pool = [...upgradePool];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  state.upgradeChoices = pool.slice(0, 3);
}

function gainXP(amount) {
  const h = state.hero; h.xp += amount;
  // Bank every level earned (a single kill can cross more than one threshold).
  while (h.xp >= h.xpNext) { h.xp -= h.xpNext; h.level++; h.xpNext += 3; state.pendingLevels++; }
}

function openPendingUpgrade() {
  if (!state.pendingLevels || state.over || state.mode !== "playing") return;
  rollUpgrades(); state.mode = "upgrade"; keys.clear(); state.joystick = null; audio.play("level");
}

function chooseUpgrade(index) {
  const upgrade = state.upgradeChoices[index]; if (!upgrade) return;
  upgrade.apply(); state.pendingLevels--; audio.play("select");
  if (state.pendingLevels > 0) rollUpgrades(); else { state.mode = "playing"; state.banner = Math.max(state.banner, 1.2); }
}

let renderScale = 1, maxScale = 2; const params = new URLSearchParams(location.search);
// F3 or ?fps shows the diagnostics panel; ?lite forces lite mode (otherwise it turns on by itself on slow machines).
const perf = { sum: 0, upd: 0, draw: 0, n: 0, slow: 0, stats: null, gpu: null, show: params.has("fps"), lite: params.has("lite") };
// Diagnostics panel in a plain monospace font so the numbers are easy to read on any screen.
function drawPerf() {
  if (perf.gpu === null) { try { const gl = document.createElement("canvas").getContext("webgl"), ext = gl && gl.getExtension("WEBGL_debug_renderer_info"); perf.gpu = gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : "no WebGL"; } catch { perf.gpu = "unknown"; } perf.gpu = String(perf.gpu).replace(/^ANGLE \((.*)\)$/, "$1").replace(/ Direct3D.*$/, "").slice(0, 46); }
  const s = perf.stats, f = v => s ? v.toFixed(1) : "--";
  const lines = [`FPS ${s ? Math.round(s.fps) : "--"}   frame ${f(s?.frame)} ms`, `update ${f(s?.upd)} ms   draw ${f(s?.draw)} ms`, `canvas ${canvas.width}x${canvas.height}  scale ${renderScale}x  dpr ${devicePixelRatio}${perf.lite ? "  LITE" : ""}`, `GPU ${perf.gpu}`];
  ctx.font = "14px Consolas, Menlo, monospace"; ctx.textBaseline = "top"; const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * 18 + 10, x = innerWidth - w - 8, y = innerHeight - h - 8;
  ctx.fillStyle = "rgba(10,12,16,.82)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#e9f5d0"; lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 6 + i * 18)); ctx.textBaseline = "alphabetic";
}
function resize() { const dpr = renderScale = Math.min(devicePixelRatio || 1, maxScale); textCache.clear(); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; }
function burst(x, y, color, count = 8) { for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: (Math.random() - .5) * 150, vy: -30 - Math.random() * 90, life: .55, color }); }
function floatText(x, y, text, color) { state.texts.push({ x: x + (Math.random() - .5) * 16, y, text, color, life: .9 }); }
function shake(amount) { state.shake = Math.max(state.shake, amount); }

const BODY_RADIUS = { sheep: 19, pawn: 16 };
function moveWithCollisions(actor, dx, dy) {
  // Water and terraces are solid: a step that would put the feet on one is undone.
  const blocked = (x, y) => isSolidAt(x - 14, y) || isSolidAt(x + 14, y) || isSolidAt(x, y - 8) || isSolidAt(x, y + 6);
  // Critters collide with everything that moves; heroes and invaders collide with critters (but not with each other, so melee stays fluid).
  const critters = state.critters || [], bodies = actor.kind ? [state.hero, ...state.enemies.filter(e => !e.dead), ...critters] : critters;
  const myRadius = BODY_RADIUS[actor.kind] || 20;
  const tryAxis = (axis, amount) => {
    const px = actor.x, py = actor.y, wasBlocked = blocked(px, py);
    actor[axis] += amount;
    actor.x = clamp(actor.x, 45, WORLD.w - 45); actor.y = clamp(actor.y, 45, WORLD.h - 45);
    for (const o of state.obstacles) {
      const vx = actor.x - o.x, vy = actor.y - o.y, d = Math.hypot(vx, vy), min = o.r + 25;
      if (d < min) { actor.x = o.x + vx / (d || 1) * min; actor.y = o.y + vy / (d || 1) * min; }
    }
    for (const b of bodies) {
      if (!b || b === actor) continue; const vx = actor.x - b.x, vy = actor.y - b.y, d = Math.hypot(vx, vy), min = myRadius + (BODY_RADIUS[b.kind] || 20);
      if (d < min) { const nx = d ? vx / d : (axis === "x" ? Math.sign(amount) || 1 : 0), ny = d ? vy / d : (axis === "y" ? Math.sign(amount) || 1 : 0); actor.x = b.x + nx * min; actor.y = b.y + ny * min; }
    }
    if (!wasBlocked && blocked(actor.x, actor.y)) { actor.x = px; actor.y = py; }
  };
  tryAxis("x", dx); tryAxis("y", dy);
}

function damageEnemy(e, damage, pushX = 0, pushY = 0) {
  if (e.dead || e.hurt > 0) return; e.hp -= damage; e.hurt = .2; moveWithCollisions(e, pushX, pushY); burst(e.x, e.y - 35, "#ffd166"); floatText(e.x, e.y - (e.boss ? 150 : 110), `-${damage}`, "#ffe08a"); shake(e.boss ? 4 : 2.5);
  if (e.hp <= 0) killEnemy(e);
  else audio.play("hit");
}

function killEnemy(e) {
  e.dead = true; e.death = .65; e.burn = 0; state.kills++; gainXP(e.boss ? 5 : 1); burst(e.x, e.y, "#d1495b", e.boss ? 28 : 13); audio.play("kill"); shake(e.boss ? 10 : 4);
  if (e.boss) {
    // The Warden's fire dies with him: his flames gutter out and the camp bonfire goes cold.
    for (const f of state.flames) { f.warn = 0; f.life = Math.min(f.life, .4); }
    const camp = state.scenery.find(i => i.camp); if (camp) { camp.out = true; burst(camp.x, camp.y - 30, "#8a8d94", 18); }
  }
}

function damageHero(amount, color) {
  const h = state.hero; h.hp -= amount; state.damageTaken += amount; burst(h.x, h.y - 35, color, 10); floatText(h.x, h.y - 125, `-${amount}`, "#ff8f80"); shake(6); audio.play("hurt");
}

function performHeroHit() {
  const h = state.hero, c = classes[state.selected], damage = c.damage + h.damageBonus;
  // Arrow lifetime follows the class range, so Long Reach also helps the archer.
  if (state.selected === "archer") { state.projectiles.push({ x: h.x + h.facing * 35, y: h.y - 48, vx: h.facing * ARROW_SPEED, life: (c.range + h.rangeBonus) / ARROW_SPEED, damage, facing: h.facing }); audio.play("shoot"); return; }
  for (const e of state.enemies) {
    const d = distance(h, e), front = Math.sign(e.x - h.x || h.facing) === h.facing;
    if (!e.dead && d < c.range + h.rangeBonus && (state.selected === "monk" || front)) { const dx = (e.x - h.x) / (d || 1), dy = (e.y - h.y) / (d || 1); damageEnemy(e, damage, dx * (e.boss ? 10 : 32), dy * (e.boss ? 8 : 22)); }
  }
  if (state.selected === "monk") { if (h.hp < h.maxHp) floatText(h.x, h.y - 125, "+1", "#86efac"); h.hp = Math.min(h.maxHp, h.hp + 1); burst(h.x, h.y - 40, "#86efac", 12); audio.play("pulse"); }
  else audio.play("swing");
}

function attack(aimX) {
  if (!state || state.mode !== "playing" || state.over || state.paused) return;
  const h = state.hero, c = classes[state.selected]; if (h.attackCd > 0 || h.hurt > 0) return;
  if (aimX !== undefined && Math.abs(aimX - h.x) > 6) h.facing = Math.sign(aimX - h.x);
  h.actionDuration = state.selected === "monk" ? .72 : state.selected === "archer" ? .55 : .42; h.action = h.actionDuration; h.attackCd = c.cooldown * h.cooldownScale; h.hitDone = false;
}

function setPaused(paused) {
  if (!state || state.mode !== "playing" || state.over) return;
  state.paused = paused; keys.clear(); state.joystick = null;
}

function finishBattle(won) {
  state.over = true; state.won = won; state.overTime = 0; state.joystick = null; audio.play(won ? "win" : "lose");
  if (won) { const key = "best." + state.selected, best = storage.get(key, null); state.record = { best, isNew: best === null || state.battleTime < best }; if (state.record.isNew) storage.set(key, state.battleTime); }
}

function heroInput() {
  let dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0), dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const j = state.joystick;
  if (j) { const jx = j.x - j.ox, jy = j.y - j.oy, len = Math.hypot(jx, jy); if (len > 10) { const strength = Math.min(1, len / 55); dx = jx / len * strength; dy = jy / len * strength; } }
  const len = Math.hypot(dx, dy); return len > 1 ? [dx / len, dy / len] : [dx, dy];
}

function updateEffects(dt) {
  for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; } state.particles = state.particles.filter(p => p.life > 0);
  for (const t of state.texts) { t.y -= 42 * dt; t.life -= dt; } state.texts = state.texts.filter(t => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}

function update(dt) {
  if (!state) return; state.time += dt;
  if (state.mode === "select" || (state.mode === "playing" && !state.paused)) updateLife(dt);
  if (state.mode !== "playing" || state.paused) return;
  const h = state.hero;
  if (state.over) { state.overTime += dt; updateEffects(dt); h.death += dt; for (const f of state.flames) { f.warn = 0; f.life = Math.min(f.life, .5) - dt; } state.flames = state.flames.filter(f => f.life > 0); for (const e of state.enemies) if (e.dead) e.death -= dt; return; }
  state.battleTime += dt;
  state.hudHint = Math.max(0, (state.hudHint || 0) - dt);
  state.banner = Math.max(0, state.banner - dt);
  h.action = Math.max(0, h.action - dt); h.attackCd = Math.max(0, h.attackCd - dt); h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt);
  if (h.action > 0 && !h.hitDone && h.action < h.actionDuration * .56) { h.hitDone = true; performHeroHit(); }
  if (keys.has("Space")) attack();
  const [dx, dy] = heroInput(); h.moving = !!(dx || dy) && !h.action && !h.hurt;
  if (Math.abs(dx) > .15 && !h.action) h.facing = Math.sign(dx); if (h.moving) moveWithCollisions(h, dx * h.speed * dt, dy * h.speed * dt); h.anim += dt * (h.moving ? 10 : 6);

  updateFire(dt);

  for (const p of state.projectiles) {
    p.x += p.vx * dt; p.life -= dt;
    for (const e of state.enemies) if (!e.dead && p.life > 0 && Math.hypot(e.x - p.x, e.y - 35 - p.y) < 42) { damageEnemy(e, p.damage, p.facing * 28, 0); p.life = 0; break; }
    // Arrows stop at buildings, trees, and rocks instead of passing through them.
    if (p.life > 0 && (plateauAt(p.x, p.y + 48) || state.obstacles.some(o => Math.hypot(p.x - o.x, p.y + 48 - o.y) < o.r))) { p.life = 0; burst(p.x, p.y, "#c9a56a", 5); }
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);

  const alive = state.enemies.filter(e => !e.dead);
  for (const e of state.enemies) {
    if (e.dead) { e.death -= dt; continue; } e.attackCd -= dt; e.hurt = Math.max(0, e.hurt - dt); e.attack = Math.max(0, e.attack - dt);
    const d = distance(e, h), vx = h.x - e.x, vy = h.y - e.y, attackRange = e.boss ? 132 : 88;
    if (e.boss) { e.castCd -= dt; if (e.castCd <= 0 && d < 560 && d > 150) { e.castCd = 3.6; addFlame(h.x, h.y, .9); addFlame(h.x + (Math.random() - .5) * 120, h.y + (Math.random() - .5) * 70, 1.1); } }
    e.chasing = false;
    if (e.attack > 0) {
      if (!e.hitDone && e.attack < .3) { e.hitDone = true; if (e.boss) { const fx = e.x + e.facing * 85; addFlame(fx, e.y); addFlame(fx - e.facing * 10, e.y - 42); addFlame(fx - e.facing * 10, e.y + 42); } if (distance(e, h) < attackRange + 12 && h.inv <= 0) { damageHero(e.boss ? 2 : 1, e.boss ? "#fb923c" : "#8ecae6"); h.inv = .75; h.hurt = .18; moveWithCollisions(h, vx / (d || 1) * (e.boss ? 55 : 30), vy / (d || 1) * (e.boss ? 55 : 30)); } }
    } else if (d < attackRange && e.attackCd <= 0) { e.attack = e.boss ? .72 : .58; e.attackCd = e.boss ? 1.35 : 1.12; e.hitDone = false; e.facing = Math.sign(vx) || e.facing; }
    else if (d < 520 && d > 75 && !e.hurt) { moveWithCollisions(e, vx / d * e.speed * dt, vy / d * e.speed * dt); e.facing = Math.sign(vx) || e.facing; e.anim += dt * 8; e.chasing = true; }
    else e.anim += dt * 5;
    // Keep enemies from stacking into a single sprite.
    for (const o of alive) {
      if (o === e) continue; const sx = e.x - o.x, sy = e.y - o.y, sd = Math.hypot(sx, sy), min = e.boss || o.boss ? 80 : 46;
      if (sd < min) moveWithCollisions(e, sx / (sd || 1) * (min - sd) * .5, sy / (sd || 1) * (min - sd) * .5);
    }
  }
  updateEffects(dt);
  if (h.hp <= 0) { finishBattle(false); return; }
  const waveCleared = state.enemies.length && state.enemies.every(e => e.dead);
  if (waveCleared && !state.waveDelay) {
    if (state.wave === state.maxWaves) finishBattle(true);
    else { state.waveDelay = 2.2; const heal = Math.min(2, h.maxHp - h.hp); if (heal > 0) { h.hp += heal; floatText(h.x, h.y - 125, `+${heal}`, "#86efac"); } state.bannerText = heal > 0 ? `WAVE CLEARED · +${heal} HP` : "WAVE CLEARED"; }
  }
  if (state.waveDelay > 0) { state.waveDelay -= dt; if (state.waveDelay <= 0) { state.waveDelay = 0; startWave(state.wave + 1); } }
  openPendingUpgrade();
  const follow = 1 - Math.exp(-dt * 6); // frame-rate independent smoothing
  state.camera.x += (clamp(h.x - innerWidth / 2, 0, Math.max(0, WORLD.w - innerWidth)) - state.camera.x) * follow; state.camera.y += (clamp(h.y - innerHeight / 2, 0, Math.max(0, WORLD.h - innerHeight)) - state.camera.y) * follow;
}

function sprite(img, x, y, frame, frames, facing = 1, size = 96, alpha = 1) { const fw = img.width / frames, fh = img.height, scale = size / fh; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1); ctx.drawImage(img, Math.floor(frame % frames) * fw, 0, fw, fh, -fw * scale / 2, -fh * scale, fw * scale, fh * scale); ctx.restore(); }
function gridSprite(img, x, y, frame, row, facing = 1, size = 150, alpha = 1) { const fw = img.width / 7, fh = img.height / 5, scale = size / fh; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1); ctx.drawImage(img, Math.floor(frame % 7) * fw, row * fh, fw, fh, -fw * scale / 2, -fh * scale, fw * scale, fh * scale); ctx.restore(); }
function ellipse(x, y, rx, ry, color) { if (rx <= 0 || ry <= 0) return; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function bar(x, y, value, max, width = 58, enemy = false) { x = Math.round(x - width / 2); y = Math.round(y); const f = Math.round(width * clamp(value / max, 0, 1)), low = enemy || value / max <= .3; ctx.fillStyle = "#24150c"; ctx.fillRect(x - 1, y - 1, width + 2, 9); ctx.fillStyle = "#2a1a14"; ctx.fillRect(x, y, width, 7); ctx.fillStyle = low ? "#d8433b" : "#6cc04a"; ctx.fillRect(x, y, f, 7); ctx.fillStyle = low ? "#ff8a7a" : "#a8e57e"; ctx.fillRect(x, y, f, 2); ctx.fillStyle = low ? "#8e2522" : "#3f7f2c"; ctx.fillRect(x, y + 5, f, 2); }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

function drawScenery(item) {
  if (item.type === "building") ctx.drawImage(images[item.key], item.x - item.w / 2, item.y - item.h, item.w, item.h);
  else if (item.type === "anim") { const img = images[item.key], fw = img.width / item.frames; ctx.drawImage(img, (Math.floor(state.time * 7 + item.x) % item.frames) * fw, 0, fw, img.height, Math.round(item.x - item.w / 2), Math.round(item.y - item.h), item.w, item.h); }
  else if (item.type === "tree") { const img = images[`tree${item.variant + 1}`], fw = img.width / 8, height = item.variant < 2 ? 144 : 124, width = fw / img.height * height; ctx.drawImage(img, item.frame * fw, 0, fw, img.height, item.x - width / 2, item.y - height, width, height); }
  else if (item.type === "rock") ctx.drawImage(images[`rock${item.variant + 1}`], item.x, item.y, 64, 64);
  else if (item.type === "bush") { const img = images[`bush${item.variant + 1}`]; ctx.drawImage(img, (Math.floor(state.time * 3 + item.frame) % 8) * 128, 0, 128, 128, item.x - 42, item.y - 62, 84, 84); }
  else if (item.type === "sheep") { const frame = Math.floor(state.time * 4 + item.frame) % 6; ctx.drawImage(images.sheep, frame * 128, 0, 128, 128, item.x - 45, item.y - 72, 90, 90); }
  else if (item.type === "fire") drawFire(item);
}

function drawActor(a) {
    const o = a.o; ellipse(o.x, o.y - 4, 30, 11, "rgba(25,35,28,.28)");
    if (a.type === "hero") {
      const cl = classes[state.selected], action = o.action > 0, key = state.selected + (action ? "Attack" : o.moving ? "Run" : "Idle"), frames = action ? cl.attack : o.moving ? cl.run : cl.idle, frame = action ? (1 - o.action / o.actionDuration) * frames : o.anim;
      if (o.hp <= 0) { const img = images.dead, fw = img.width / 7, fh = img.height / 2, f = Math.min(6, Math.floor(o.death * 10)); /* hold on the finished skull (end of the first row) */ ctx.drawImage(img, (f % 7) * fw, Math.floor(f / 7) * fh, fw, fh, Math.round(o.x - 56), Math.round(o.y - 96), 112, 112); return; }
      if (!(o.inv > 0 && Math.floor(o.inv * 12) % 2)) sprite(images[key], o.x, o.y + cl.foot, frame, frames, o.facing, cl.size); bar(o.x, o.y - 118, o.hp, o.maxHp, 74);
      if (state.selected === "monk" && action) sprite(images.monkEffect, o.x, o.y + 15, frame, 11, 1, 150, .65);
    } else {
      const attacking = o.attack > 0, near = !!o.chasing, img = attacking ? images.enemyAttack : near ? images.enemyRun : images.enemyIdle, frames = attacking ? 4 : near ? 6 : 8, frame = attacking ? (1 - o.attack / .58) * frames : o.anim;
      const alpha = o.dead ? clamp(o.death / .65, 0, 1) : o.hurt > 0 ? .55 : 1;
      if (o.boss) gridSprite(images.boss, o.x, o.y + 54, attacking ? (1 - o.attack / .72) * 7 : o.anim, attacking ? 2 : near ? 1 : 0, o.facing, 175, alpha);
      else sprite(img, o.x, o.y + 30, frame, frames, o.facing, 104, alpha);
      if (!o.dead) bar(o.x, o.y - (o.boss ? 145 : 105), o.hp, o.maxHp, o.boss ? 130 : 58, true);
    }
    if (o.burn > 0 && !o.dead && o.hp > 0) { const size = 44; ctx.globalAlpha = clamp(o.burn * 2, 0, .9); ctx.drawImage(images.fire, (Math.floor(state.time * 12) % 7) * 128, 0, 128, 128, Math.round(o.x - size / 2 + 6), Math.round(o.y - 70), size, size); ctx.globalAlpha = 1; }
}

function drawWorld() {
  const c = state.camera, sx = state.shake ? (Math.random() - .5) * state.shake : 0, sy = state.shake ? (Math.random() - .5) * state.shake : 0;
  // Snap the camera relative to the hero so the hero never jitters by a pixel against the scrolling world.
  const h = state.hero, rx = h ? Math.round(h.x) - Math.round(h.x - c.x) : Math.round(c.x), ry = h ? Math.round(h.y) - Math.round(h.y - c.y) : Math.round(c.y);
  ctx.save(); ctx.translate(-(rx + Math.round(sx)), -(ry + Math.round(sy))); drawGround();
  const view = { x: c.x, y: c.y, w: innerWidth, h: innerHeight }; drawGroundDetails(view);
  // Off-screen scenery and critters are skipped (sprites reach up to ~260px above and ~130px beside their anchor).
  const seen = (x, y) => x > view.x - 140 && x < view.x + view.w + 140 && y > view.y - 40 && y < view.y + view.h + 280;
  const layers = [
    ...state.scenery.filter(item => seen(item.x + (item.type === "rock" ? 32 : 0), item.y + (item.type === "rock" ? 64 : 0))).map(item => ({ kind: "scenery", sortY: item.sortY, item })),
    ...state.critters.filter(o => seen(o.x, o.y)).map(o => ({ kind: "critter", sortY: o.y, o })),
    ...state.flames.map(f => ({ kind: "flame", sortY: f.warn > 0 ? -1 : f.y, f })),
    ...state.enemies.filter(e => !e.dead || e.death > 0).map(o => ({ kind: "actor", sortY: o.y, actor: { type: "enemy", o } })),
    ...(state.hero ? [{ kind: "actor", sortY: state.hero.y, actor: { type: "hero", o: state.hero } }] : []),
  ].sort((a, b) => a.sortY - b.sortY);
  for (const layer of layers) { if (layer.kind === "scenery") drawScenery(layer.item); else if (layer.kind === "critter") drawCritter(layer.o); else if (layer.kind === "flame") drawFlame(layer.f); else drawActor(layer.actor); }
  for (const p of state.projectiles) sprite(images.arrow, p.x, p.y + 28, 0, 1, p.facing, 48);
  for (const p of state.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
  ctx.globalAlpha = 1; drawSkyDetails(view);
  for (const t of state.texts) { ctx.globalAlpha = clamp(t.life * 2, 0, 1); text(t.text, t.x, t.y, { size: 18, color: t.color, align: "center" }); }
  ctx.globalAlpha = 1; ctx.restore();
}

/* ---------- Game UI kit: pixel-art wood, iron, gold, cloth and parchment, all drawn in code ---------- */
const FONT = '"Pixelify Sans", Georgia, serif';
const C = {
  ink: "#24150c", woodDark: "#4e2e19", wood: "#7a4a2a", woodLight: "#a2683a", woodHi: "#c48a52",
  parch: "#f0dcae", parchShade: "#dcc08a", parchEdge: "#b8925a", inkText: "#4a2b16",
  slate: "#262a33", slateHi: "#363c4a", gold: "#e8b04a", goldHi: "#ffe08a", goldDark: "#8f5f1c",
  iron: "#7d8590", ironHi: "#c3cad3", ironDark: "#3f444c", cream: "#fff3d0",
};
const BAR = { hp: ["#d34a3f", "#f58a72", "#8f2a25"], xp: ["#e2ac3c", "#ffd877", "#9a6a1c"], skill: ["#4fa3c7", "#a8e6f8", "#2b6a88"], boss: ["#d4532f", "#ff9a5c", "#8a2a1a"], progress: ["#6aa84f", "#a3d980", "#3d6a2c"] };
const BTN = { green: ["#5c9a3e", "#7fbf57", "#33602a"], red: ["#b8432f", "#da6a4f", "#702317"], blue: ["#3a74b4", "#5d98d8", "#1f4573"], gold: ["#cf942e", "#f2c25a", "#85571a"], gray: ["#77746a", "#8d897d", "#47443d"] };
const RIBBON = { red: ["#c33b2e", "#e2644d", "#86251c"], blue: ["#2f6db0", "#5596d8", "#1d4677"], gold: ["#c98a2b", "#f0bf58", "#87591a"], green: ["#4f8a3a", "#76b456", "#2f5a22"] };
const ICONS = {
  heart: { pal: { o: C.ink, r: "#d63c3c", d: "#9c2430", w: "#ffd0c8" }, rows: [".oo.oo.", "owrorro", "orrrrdo", "orrrrdo", ".orrdo.", "..odo..", "...o..."] },
  gem: { pal: { o: C.ink, y: "#f2c14e", l: "#fff2a8", d: "#b07a1e" }, rows: ["..ooo..", ".olyyo.", "olyyydo", "oyyyydo", ".oyydo.", "..odo..", "...o..."] },
  bolt: { pal: { o: C.ink, y: "#7fd3f0", l: "#d9f6ff", d: "#3b8fb5" }, rows: ["...ooo.", "..olyo.", ".olyo..", "olyyyoo", "ooyyyyo", "..oyyo.", ".oydo..", ".odo...", ".oo...."] },
  sword: { pal: { o: C.ink, w: "#e9eef3", s: "#9aa6b2", g: "#e8b04a", b: "#7a4a2a" }, rows: [".......oo", "......owo", ".....owso", "....owso.", "o..owso..", "ogowso...", ".ogso....", "obogo....", "oo.oo...."] },
  boot: { pal: { o: C.ink, b: "#8a5a33", l: "#b67d4c", w: "#e8f3ff" }, rows: [".oooo...", ".olbo.ww", ".olbo.w.", ".olbo...", ".olbooo.", "olbbbbbo", "obbbbbbo", "oooooooo"] },
  arrow: { pal: { o: C.ink, f: "#d63c3c", s: "#b67d4c", m: "#c3cad3" }, rows: ["f.....oo.", "ff....omo", "fffsssmmo", "ff....omo", "f.....oo."] },
  hourglass: { pal: { o: C.ink, w: "#8a5a33", y: "#f2c14e", g: "#cfe6f0" }, rows: ["owwwwwo", ".oyyyo.", ".ogyyo.", "..oyo..", "...o...", "..ogo..", ".oggyo.", ".oyyyo.", "owwwwwo"] },
  skull: { pal: { o: C.ink, w: "#efe6d2", d: "#b9ad94" }, rows: ["..ooooo..", ".owwwwwo.", "owwwwwwdo", "owoowoowo", "owoowoowo", ".owwowwo.", "..owdwo..", "..ododo.."] },
};
const UPGRADE_ICONS = { power: "sword", vitality: "heart", agility: "boot", reach: "arrow", haste: "hourglass" };
let hitAreas = [], pointer = { x: -1, y: -1 }, uiHot = false;

const R = Math.round;
function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(R(x), R(y), R(w), R(h)); }
function textWidth(str, size, weight = 700) { ctx.font = `${weight} ${size}px ${FONT}`; return ctx.measureText(str).width; }
function fitSize(str, size, maxW, min = 9) { while (size > min && textWidth(str, size) > maxW) size--; return size; }
// Outlined, drop-shadowed text in the pixel font.
// Each label is rendered once (outline needs ~10 fillText calls) into a small canvas and reused while it stays the same.
const textCache = new Map();
function text(str, x, y, { size = 14, color = C.cream, align = "left", outline = C.ink, weight = 700, shadow = true } = {}) {
  str = String(str); const key = `${str}|${size}|${color}|${outline}|${weight}|${shadow}`; let e = textCache.get(key);
  if (!e) {
    if (textCache.size > 500) textCache.clear();
    const font = `${weight} ${size}px ${FONT}`, o = size >= 26 ? 2 : 1, pad = o + 2, asc = Math.ceil(size * 1.05), desc = Math.ceil(size * .4);
    ctx.font = font; const w = ctx.measureText(str).width, cw = Math.ceil(w) + pad * 2, ch = asc + desc + pad * 2, s = renderScale;
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(cw * s)); c.height = Math.ceil(ch * s);
    const g = c.getContext("2d"); g.scale(s, s); g.font = font; g.textBaseline = "alphabetic"; const bx = pad, by = pad + asc;
    if (shadow) { g.fillStyle = "rgba(0,0,0,.4)"; g.fillText(str, bx + o, by + o + 1); }
    if (outline) { g.fillStyle = outline; for (let dx = -o; dx <= o; dx++) for (let dy = -o; dy <= o; dy++) if (dx || dy) g.fillText(str, bx + dx, by + dy); }
    g.fillStyle = color; g.fillText(str, bx, by);
    e = { c, w, pad, asc, cw, ch }; textCache.set(key, e);
  }
  const left = align === "center" ? x - e.w / 2 : align === "right" ? x - e.w : x;
  ctx.drawImage(e.c, R(left) - e.pad, R(y) - e.pad - e.asc, e.cw, e.ch);
}
// Dark ink lettering for parchment surfaces.
function inkText(str, x, y, size = 13, align = "left", weight = 700) { text(str, x, y, { size, align, weight, color: C.inkText, outline: null, shadow: false }); }
function wrapText(str, size, maxW, weight = 400) { const words = str.split(" "), lines = []; let line = ""; for (const w of words) { const test = line ? line + " " + w : w; if (line && textWidth(test, size, weight) > maxW) { lines.push(line); line = w; } else line = test; } if (line) lines.push(line); return lines; }

function iconSize(name, s) { const i = ICONS[name]; return [i.rows[0].length * s, i.rows.length * s]; }
function drawIcon(name, x, y, s = 2) { const icon = ICONS[name]; x = R(x); y = R(y); icon.rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const color = icon.pal[row[c]]; if (color) { ctx.fillStyle = color; ctx.fillRect(x + c * s, y + r * s, s, s); } } }); }

function cornerPlate(x, y, s, kind) {
  const [dark, mid, hi] = kind === "gold" ? [C.goldDark, C.gold, C.goldHi] : [C.ironDark, C.iron, C.ironHi];
  rect(x, y, s, s, C.ink); rect(x + 1, y + 1, s - 2, s - 2, mid); rect(x + 1, y + 1, s - 2, 1, hi); rect(x + 1, y + 1, 1, s - 2, hi); rect(x + 1, y + s - 2, s - 2, 1, dark); rect(x + s - 2, y + 1, 1, s - 2, dark);
  const c = Math.floor(s / 2) - 1; rect(x + c, y + c, 3, 3, dark); rect(x + c, y + c, 2, 2, hi);
}

// Wooden frame with chamfered ink outline, grain, metal corner plates and a parchment or slate interior.
function woodFrame(x, y, w, h, { inner = "parchment", corners = "iron", glow = 0, thick } = {}) {
  x = R(x); y = R(y); w = R(w); h = R(h); const b = thick ?? (Math.min(w, h) < 90 ? 6 : 9);
  if (glow > 0) { ctx.globalAlpha *= glow; rect(x - 6, y - 6, w + 12, h + 12, "rgba(255,210,100,.25)"); rect(x - 3, y - 3, w + 6, h + 6, "rgba(255,226,140,.7)"); ctx.globalAlpha /= glow; }
  rect(x + 4, y + 6, w, h, "rgba(0,0,0,.35)");
  rect(x + 2, y, w - 4, h, C.ink); rect(x, y + 2, w, h - 4, C.ink);
  rect(x + 2, y + 2, w - 4, h - 4, C.wood);
  rect(x + 2, y + 2, w - 4, 2, C.woodHi); rect(x + 2, y + 2, 2, h - 4, C.woodLight);
  rect(x + 2, y + h - 4, w - 4, 2, C.woodDark); rect(x + w - 4, y + 2, 2, h - 4, C.woodDark);
  if (b >= 7) {
    for (let i = 0, n = Math.floor(w / 26); i < n; i++) { const gx = x + 10 + i * 26 + seeded(i + 3) * 8; rect(gx, y + 4 + (i % 2) * 2, 8 + seeded(i) * 8, 1, C.woodDark); rect(gx + 5, y + h - b + 1 + (i % 2) * 2, 9, 1, C.woodDark); }
    for (let i = 0, n = Math.floor(h / 30); i < n; i++) { const gy = y + 12 + i * 30 + seeded(i + 7) * 8; rect(x + 4 + (i % 2) * 2, gy, 1, 10, C.woodDark); rect(x + w - 6 - (i % 2) * 2, gy + 6, 1, 9, C.woodDark); }
  }
  rect(x + b - 2, y + b - 2, w - 2 * b + 4, h - 2 * b + 4, C.ink);
  const ix = x + b, iy = y + b, iw = w - 2 * b, ih = h - 2 * b;
  if (inner === "parchment") {
    rect(ix, iy, iw, ih, C.parch);
    rect(ix, iy, iw, 3, C.parchEdge); rect(ix, iy, 2, ih, C.parchShade); rect(ix, iy + ih - 3, iw, 3, C.parchShade); rect(ix + iw - 2, iy, 2, ih, C.parchShade);
    ctx.fillStyle = C.parchShade; for (let i = 0, n = (iw * ih) / 700; i < n; i++) ctx.fillRect(R(ix + 4 + seeded(i * 3 + 1) * (iw - 10)), R(iy + 5 + seeded(i * 7 + 2) * (ih - 10)), i % 3 ? 2 : 4, 1);
  } else {
    rect(ix, iy, iw, ih, C.slate); rect(ix, iy, iw, 2, "#191c23"); rect(ix, iy + ih - 1, iw, 1, C.slateHi);
  }
  if (corners) { const s = Math.max(10, b + 5); for (const [cx, cy] of [[x - 1, y - 1], [x + w - s + 1, y - 1], [x - 1, y + h - s + 1], [x + w - s + 1, y + h - s + 1]]) cornerPlate(cx, cy, s, corners); }
  return { x: ix, y: iy, w: iw, h: ih };
}

function poly(points, fill) { ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (const p of points.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
// Cloth banner with notched tails, used for every title.
function ribbon(cx, y, w, label, color = "red", size = 18) {
  const [mid, hi, dark] = RIBBON[color], h = R(size * 1.9), t = R(h * 1.05), d = R(h * .32), fold = 10; w = R(w); y = R(y); const x = R(cx - w / 2);
  poly([[x - t, y + d], [x + fold, y + d], [x + fold, y + h + d], [x - t, y + h + d], [x - t + R(t * .45), y + d + h / 2]], dark);
  poly([[x + w + t, y + d], [x + w - fold, y + d], [x + w - fold, y + h + d], [x + w + t, y + h + d], [x + w + t - R(t * .45), y + d + h / 2]], dark);
  poly([[x, y + h], [x + fold, y + h + d], [x + fold, y + h]], "#2a1209"); poly([[x + w, y + h], [x + w - fold, y + h + d], [x + w - fold, y + h]], "#2a1209");
  rect(x - 1, y - 1, w + 2, h + 2, C.ink); rect(x + 1, y + 1, w - 2, h - 2, mid);
  rect(x + 1, y + 1, w - 2, 3, hi); rect(x + 1, y + h - 4, w - 2, 3, dark);
  ctx.globalAlpha *= .55; for (let i = x + 8; i < x + w - 10; i += 9) { rect(i, y + 6, 5, 1, hi); rect(i, y + h - 7, 5, 1, dark); } ctx.globalAlpha /= .55;
  text(label, cx, y + h / 2 + size * .36, { size: fitSize(label, size, w - 24), align: "center" });
  return h + d;
}

// Chunky bevelled button; `hot` forces the highlighted look (e.g. when its card is hovered).
function button(x, y, w, h, label, action, { color = "green", enabled = true, hot = false } = {}) {
  x = R(x); y = R(y); w = R(w); h = R(h);
  const hover = enabled && (hot || (action && inside({ x, y, w, h }, pointer.x, pointer.y)));
  if (action && enabled) { hitAreas.push({ x, y, w, h, action }); if (hover) uiHot = true; }
  const [mid, hi, dark] = BTN[enabled ? color : "gray"], lip = 4, lift = hover ? 1 : 0, fy = y + 2 - lift, fh = h - 4 - lip;
  rect(x + 2, y + 4, w, h, "rgba(0,0,0,.3)");
  rect(x + 2, y, w - 4, h, C.ink); rect(x, y + 2, w, h - 4, C.ink);
  rect(x + 2, y + 2, w - 4, h - 4, dark);
  rect(x + 2, fy, w - 4, fh, hover ? hi : mid);
  rect(x + 4, fy + 2, w - 8, 2, hover ? "#fff6d0" : hi); rect(x + 2, fy + fh - 2, w - 4, 2, dark);
  const size = fitSize(label, h >= 36 ? 15 : 13, w - 14);
  ctx.globalAlpha *= enabled ? 1 : .6; text(label, x + w / 2, fy + fh / 2 + size * .36, { size, align: "center" }); ctx.globalAlpha /= enabled ? 1 : .6;
}

function meter(x, y, w, h, value, colors, { segments = 0, label, flash = 0 } = {}) {
  x = R(x); y = R(y); w = R(w); h = R(h); const [mid, hi, dark] = colors, fw = R((w - 2) * clamp(value, 0, 1)), top = Math.max(1, R((h - 2) * .3)), bottom = Math.max(1, R((h - 2) * .25));
  rect(x, y, w, h, C.ink); rect(x + 1, y + 1, w - 2, h - 2, "#1a1310");
  if (fw > 0) { rect(x + 1, y + 1, fw, h - 2, mid); rect(x + 1, y + 1, fw, top, hi); rect(x + 1, y + h - 1 - bottom, fw, bottom, dark); }
  if (flash > 0) { ctx.globalAlpha *= flash; rect(x + 1, y + 1, w - 2, h - 2, "#fff"); ctx.globalAlpha /= flash; }
  if (segments > 1) for (let i = 1; i < segments; i++) rect(x + R(i * w / segments), y + 1, 1, h - 2, "rgba(14,10,8,.65)");
  if (label) text(label, x + w / 2, y + h / 2 + 4, { size: 11, align: "center" });
}

function badge(cx, cy, r, label) {
  ellipse(cx + 1, cy + 2, r + 2, r + 2, "rgba(0,0,0,.35)"); ellipse(cx, cy, r + 2, r + 2, C.ink); ellipse(cx, cy, r, r, C.goldDark); ellipse(cx, cy - 1, r - 1, r - 1, C.gold); ellipse(cx - 1, cy - 2, r - 4, r - 4, C.goldHi); ellipse(cx, cy, r - 4, r - 4, C.gold);
  text(label, cx, cy + r * .42, { size: R(r * 1.15), align: "center" });
}
function medallion(cx, cy, r, icon) {
  ellipse(cx + 1, cy + 3, r + 2, r + 2, "rgba(0,0,0,.3)"); ellipse(cx, cy, r + 2, r + 2, C.ink); ellipse(cx, cy, r, r, C.gold); ellipse(cx, cy - 1, r - 2, r - 2, C.goldHi); ellipse(cx, cy, r - 3, r - 3, C.gold);
  ellipse(cx, cy, r - 6, r - 6, C.ink); ellipse(cx, cy, r - 7, r - 7, "#3b2c22"); ellipse(cx, cy - 2, r - 10, r - 10, "#4a382b");
  const s = r >= 26 ? 3 : 2, [iw, ih] = iconSize(icon, s); drawIcon(icon, cx - iw / 2, cy - ih / 2, s);
}
function keycap(x, y, label) { const w = R(Math.max(18, textWidth(label, 10) + 10)), h = 18; rect(x, y, w, h, C.ink); rect(x + 1, y + 1, w - 2, h - 2, "#bfb193"); rect(x + 1, y + 1, w - 2, h - 5, "#f4ead2"); text(label, x + w / 2, y + 12, { size: 10, color: C.inkText, outline: null, shadow: false, align: "center" }); return w; }
// The vignette gradient is rendered once per screen size into a small canvas (it is smooth, so a quarter-size copy
// stretched with smoothing looks the same) and blitted with globalAlpha, instead of computing a gradient every frame.
let vignetteCache = null;
function vignette(alpha = .75) {
  const w = Math.max(1, Math.ceil(innerWidth / 4)), h = Math.max(1, Math.ceil(innerHeight / 4));
  if (!vignetteCache || vignetteCache.width !== w || vignetteCache.height !== h) {
    vignetteCache = document.createElement("canvas"); vignetteCache.width = w; vignetteCache.height = h; const g = vignetteCache.getContext("2d");
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .15, w / 2, h / 2, Math.max(w, h) * .75); grad.addColorStop(0, "rgba(10,14,16,.45)"); grad.addColorStop(1, "rgba(5,7,9,1)"); g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1); ctx.imageSmoothingEnabled = true; ctx.drawImage(vignetteCache, 0, 0, innerWidth, innerHeight); ctx.restore();
}
function logo(cx, y, size) {
  const label = "CHRONICLES OF THE VALLEY"; size = fitSize(label, size, innerWidth - 40, 14);
  const g = ctx.createLinearGradient(0, y - size, 0, y); g.addColorStop(0, "#fff4b8"); g.addColorStop(.55, "#f2c14e"); g.addColorStop(1, "#c77d22");
  text(label, cx, y, { size, align: "center", color: g });
}
const uiLayout = () => ({ compact: innerWidth < 980 || innerHeight < 680, mobile: innerWidth < 700, short: innerHeight < 580 });

/* ---------- Hall of Heroes ---------- */
const statPips = cl => [["heart", "HP", R(cl.hp / 2.2)], ["sword", "DMG", cl.damage * 2], ["boot", "SPD", R(clamp((cl.speed - 170) / 14, 1, 5))], ["arrow", "RNG", cl.range > 300 ? 5 : R(cl.range / 50)]];
function pips(x, y, n, size = 7) { for (let i = 0; i < 5; i++) { const px = x + i * (size + 2); rect(px, y, size, size, C.ink); rect(px + 1, y + 1, size - 2, size - 2, i < n ? "#d9822b" : "#c2a571"); if (i < n) rect(px + 1, y + 1, size - 2, 2, "#ffc25a"); else rect(px + 1, y + 1, size - 2, 1, "#a88b5a"); } }

function heroCard(id, i, x, y, w, h) {
  const cl = classes[id], area = { x, y, w, h }, hover = inside(area, pointer.x, pointer.y);
  if (hover) uiHot = true; hitAreas.push({ ...area, action: () => chooseClass(id) });
  y -= hover ? 4 : 0;
  const inner = woodFrame(x, y, w, h, { glow: hover ? 1 : 0, corners: hover ? "gold" : "iron" }), pad = 7, sw = inner.w - pad * 2, sx = inner.x + pad, sy = inner.y + pad;
  const btnH = h > 280 ? 34 : 28, nameSize = fitSize(cl.name.toUpperCase(), w < 190 ? 16 : 20, sw), btnY = inner.y + inner.h - btnH - pad;
  const sceneH = R(clamp(Math.min(h * .36, inner.h - pad * 3 - btnH - nameSize - 12), 34, 140));
  rect(sx - 2, sy - 2, sw + 4, sceneH + 4, C.ink);
  const sky = ctx.createLinearGradient(0, sy, 0, sy + sceneH); sky.addColorStop(0, "#86bccf"); sky.addColorStop(.6, "#d4e8c6"); sky.addColorStop(.61, "#80ad5b"); sky.addColorStop(1, "#5a8840"); ctx.fillStyle = sky; ctx.fillRect(R(sx), R(sy), R(sw), sceneH);
  ctx.save(); ctx.beginPath(); ctx.rect(R(sx), R(sy), R(sw), sceneH); ctx.clip();
  const ground = sy + sceneH * .9, size = R(sceneH * 1.55 * (id === "lancer" ? 1.08 : 1));
  ellipse(sx + sw / 2, ground, Math.min(sw * .26, size * .28), Math.max(3, sceneH * .06), "rgba(30,50,25,.45)");
  sprite(images[id + (hover ? "Run" : "Idle")], sx + sw / 2, ground + size * cl.foot / cl.size, state.time * (hover ? 10 : 6), hover ? cl.run : cl.idle, 1, size);
  ctx.restore();
  badge(sx + 11, sy + 11, 10, String(i + 1));
  let ty = sy + sceneH + 6 + nameSize; text(cl.name.toUpperCase(), x + w / 2, ty, { size: nameSize, align: "center" }); ty += 7;
  const space = btnY - ty - 4, stats = statPips(cl);
  if (space >= 16 + stats.length * 19) {
    inkText(cl.description, x + w / 2, ty + 11, fitSize(cl.description, 12, sw, 9), "center", 400); ty += 18;
    for (const [icon, label, n] of stats) { const [iw, ih] = iconSize(icon, 2); drawIcon(icon, sx + 2 + (18 - iw) / 2, ty + (16 - ih) / 2, 2); inkText(label, sx + 24, ty + 12, 11); pips(sx + sw - 45, ty + 4, n); ty += 19; }
  } else if (space >= 38 && sw >= 120) {
    stats.forEach(([icon, , n], k) => { const cx = sx + (k % 2) * (sw / 2), cy = ty + Math.floor(k / 2) * 19, [iw, ih] = iconSize(icon, 2); drawIcon(icon, cx + (18 - iw) / 2, cy + (16 - ih) / 2, 2); pips(cx + 21, cy + 4, n, 6); });
  } else if (space >= 12) inkText(`HP ${cl.hp} · DMG ${cl.damage} · SPD ${cl.speed}`, x + w / 2, ty + 10, fitSize(`HP ${cl.hp} · DMG ${cl.damage} · SPD ${cl.speed}`, 11, sw, 8), "center");
  button(inner.x + pad, btnY, inner.w - pad * 2, btnH, hover ? "CHOOSE" : "SELECT", null, { color: hover ? "gold" : "green", hot: hover });
}

function drawSelection() {
  state.camera.x = clamp(150 + Math.sin(state.time * .06) * 150, 0, Math.max(0, WORLD.w - innerWidth)); state.camera.y = clamp(470 + Math.cos(state.time * .05) * 60, 0, Math.max(0, WORLD.h - innerHeight));
  drawWorld(); vignette(.82);
  const ids = Object.keys(classes), compact = innerWidth < 850 || innerHeight < 620;
  if (!compact) {
    logo(innerWidth / 2, 66, 46); ribbon(innerWidth / 2, 86, 300, "CHOOSE YOUR HERO", "blue", 17);
    const cardW = Math.min(220, (innerWidth - 80) / 4), gap = 18, total = cardW * 4 + gap * 3, sx = innerWidth / 2 - total / 2, h = Math.min(360, innerHeight - 200), y = Math.max(160, Math.min(innerHeight / 2 - h / 2 + 50, innerHeight - h - 44));
    ids.forEach((id, i) => heroCard(id, i, sx + i * (cardW + gap), y, cardW, h));
    if (y + h + 30 < innerHeight) text(touchUsed ? "Tap a hero to begin" : "Press 1–4 or click a hero  ·  M toggles sound", innerWidth / 2, y + h + 30, { size: 13, align: "center", color: "#e8dcc0" });
  } else {
    let top = 8; if (innerHeight >= 560) { logo(innerWidth / 2, 34, 28); top = 44; }
    top += ribbon(innerWidth / 2, top, Math.min(260, innerWidth - 100), "CHOOSE YOUR HERO", "blue", 14) + 8;
    const gap = 10, cardW = Math.min(250, (innerWidth - 30) / 2), cardH = Math.min(270, (innerHeight - top - gap - 12) / 2), sx = innerWidth / 2 - (cardW * 2 + gap) / 2;
    ids.forEach((id, i) => heroCard(id, i, sx + (i % 2) * (cardW + gap), top + Math.floor(i / 2) * (cardH + gap), cardW, cardH));
  }
}

/* ---------- Level up ---------- */
function upgradeCard(u, i, x, y, w, h, row) {
  const area = { x, y, w, h }, hover = inside(area, pointer.x, pointer.y); if (hover) uiHot = true; hitAreas.push({ ...area, action: () => chooseUpgrade(i) });
  y -= hover ? 4 : 0; const inner = woodFrame(x, y, w, h, { glow: hover ? 1 : 0, corners: hover ? "gold" : "iron" }), icon = UPGRADE_ICONS[u.id] || "gem";
  if (row) {
    const r = R(clamp(inner.h / 2 - 8, 14, 28)), mx = inner.x + 14 + r, showBtn = w >= 400, tx = mx + r + 16, tw = inner.x + inner.w - tx - (showBtn ? 104 : 10);
    medallion(mx, inner.y + inner.h / 2, r, icon); badge(inner.x + 8, inner.y + 8, 9, String(i + 1));
    const ns = fitSize(u.name.toUpperCase(), 16, tw); text(u.name.toUpperCase(), tx, inner.y + inner.h / 2 - 3, { size: ns });
    inkText(u.description, tx, inner.y + inner.h / 2 + 15, fitSize(u.description, 13, tw, 9), "left", 400);
    if (showBtn) button(inner.x + inner.w - 96, inner.y + inner.h / 2 - 17, 86, 34, "CHOOSE", null, { color: hover ? "gold" : "green", hot: hover });
    return;
  }
  const cx = x + w / 2; medallion(cx, inner.y + 48, 30, icon); badge(inner.x + 12, inner.y + 12, 11, String(i + 1));
  const ns = fitSize(u.name.toUpperCase(), 18, inner.w - 16); text(u.name.toUpperCase(), cx, inner.y + 108, { size: ns, align: "center" });
  wrapText(u.description, 14, inner.w - 24).slice(0, 2).forEach((line, k) => inkText(line, cx, inner.y + 134 + k * 18, 14, "center", 400));
  button(inner.x + 14, inner.y + inner.h - 48, inner.w - 28, 36, "CHOOSE", null, { color: hover ? "gold" : "green", hot: hover });
}

function drawUpgrade() {
  drawWorld(); vignette(.88);
  const h = state.hero, row = innerWidth < 720 || innerHeight < 540, titleY = row ? 12 : 30;
  const rh = ribbon(innerWidth / 2, titleY, row ? Math.min(240, innerWidth - 100) : 300, "LEVEL UP!", "gold", row ? 18 : 26);
  const sub = `Level ${h.level - state.pendingLevels + 1}  ·  Choose a blessing${state.pendingLevels > 1 ? `  (${state.pendingLevels - 1} more)` : ""}`;
  text(sub, innerWidth / 2, titleY + rh + 22, { size: row ? 13 : 16, align: "center", color: "#f3e6c4" });
  if (row) {
    const top = titleY + rh + 36, gap = 8, w = Math.min(480, innerWidth - 24), x = innerWidth / 2 - w / 2, ch = Math.min(112, (innerHeight - top - 10) / 3 - gap);
    state.upgradeChoices.forEach((u, i) => upgradeCard(u, i, x, top + i * (ch + gap), w, ch, true));
  } else {
    const cardW = Math.min(240, (innerWidth - 80) / 3), gap = 20, total = cardW * 3 + gap * 2, sx = innerWidth / 2 - total / 2, y = Math.max(titleY + rh + 52, innerHeight / 2 - 120);
    state.upgradeChoices.forEach((u, i) => upgradeCard(u, i, sx + i * (cardW + gap), y, cardW, 260, false));
    if (y + 290 < innerHeight) text(touchUsed ? "Tap a blessing" : "Press 1–3 or click a blessing", innerWidth / 2, y + 290, { size: 13, align: "center", color: "#e8dcc0" });
  }
}

/* ---------- In-battle HUD ---------- */
function drawUI() {
  const cl = classes[state.selected], h = state.hero, layout = uiLayout(), m = layout.mobile ? 6 : 14;
  const pw = layout.mobile ? Math.floor(innerWidth * .62) - m : layout.compact ? 270 : 310, ph = layout.mobile ? 80 : 92;
  const p = woodFrame(m, m, pw, ph, { inner: "slate", thick: 6 }), side = p.h - 8, px = p.x + 4, py = p.y + 4;
  // Portrait window with the hero's idle animation.
  rect(px - 1, py - 1, side + 2, side + 2, C.ink); const bg = ctx.createLinearGradient(0, py, 0, py + side); bg.addColorStop(0, "#86bccf"); bg.addColorStop(1, "#5a8840"); ctx.fillStyle = bg; ctx.fillRect(px, py, side, side);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, side, side); ctx.clip(); const ps = side * 2.3; sprite(images[state.selected + "Idle"], px + side / 2, py + side * .62 + ps * .5, h.anim, cl.idle, 1, ps); ctx.restore();
  badge(px + side - 3, py + side - 3, 10, String(h.level));
  const bx = px + side + 10, bw = p.x + p.w - bx - 6, lowHp = h.hp / h.maxHp <= .3;
  text(cl.name.toUpperCase(), bx, p.y + 15, { size: 13 });
  drawIcon("heart", bx, p.y + 22, 2); meter(bx + 18, p.y + 21, bw - 18, 16, h.hp / h.maxHp, BAR.hp, { segments: h.maxHp <= 20 ? h.maxHp : 0, label: `${Math.max(0, h.hp)}/${h.maxHp}`, flash: h.hurt > 0 ? .6 : lowHp ? (Math.sin(state.time * 8) + 1) * .12 : 0 });
  drawIcon("gem", bx + 2, p.y + 41, 2); meter(bx + 18, p.y + 42, bw - 18, 10, h.xp / h.xpNext, BAR.xp);
  const ready = 1 - h.attackCd / (cl.cooldown * h.cooldownScale); drawIcon("bolt", bx + 2, p.y + 55, 2); meter(bx + 18, p.y + 58, bw - 18, 10, ready, BAR.skill, { flash: ready >= 1 ? (Math.sin(state.time * 5) + 1) * .1 : 0 });
  // Battle progress.
  const qw = layout.mobile ? innerWidth - pw - m * 3 : layout.compact ? 170 : 200, qx = innerWidth - qw - m, q = woodFrame(qx, m, qw, 72, { inner: "slate", thick: 6 });
  drawIcon("sword", q.x + 5, q.y + 4, 2); text(`WAVE ${state.wave}/${state.maxWaves}`, q.x + 28, q.y + 18, { size: layout.mobile ? 12 : 14 });
  drawIcon("skull", q.x + 5, q.y + 25, 2); text(`${state.kills}/${state.totalEnemies}`, q.x + 28, q.y + 38, { size: 12, color: "#e8dcc0" });
  meter(q.x + 5, q.y + q.h - 15, q.w - 10, 10, state.kills / state.totalEnemies, BAR.progress, { segments: state.maxWaves });
  const boss = state.enemies.find(e => e.boss && !e.dead); let bossBottom = 0;
  if (boss) {
    const w = Math.min(layout.mobile ? innerWidth - 12 : 480, innerWidth - 24), x = innerWidth / 2 - w / 2, y = layout.compact || innerWidth < 1150 ? m + ph + 10 : m, b = woodFrame(x, y, w, 52, { inner: "slate", thick: 6, corners: "gold" });
    drawIcon("skull", b.x + 6, b.y + 15, 2); drawIcon("skull", b.x + b.w - 24, b.y + 15, 2);
    text("THE FLAME WARDEN", innerWidth / 2, b.y + 15, { size: 13, align: "center", color: "#ffcf8c" }); meter(b.x + 30, b.y + 21, b.w - 60, 15, boss.hp / boss.maxHp, BAR.boss, { segments: 8, flash: boss.hurt > 0 ? .5 : 0 });
    bossBottom = y + 52;
  }
  drawEnemyPointer();
  if (touchUsed && !state.over) drawTouchControls();
  if (state.hudHint > 0 && !state.over && !state.paused && (!layout.mobile || touchUsed)) drawHint();
  if (state.over) drawResults(layout);
  else if (state.paused) drawPause(layout);
  else if (state.banner > 0 || state.waveDelay > 0) {
    const label = state.bannerText, size = layout.mobile ? 15 : 20, w = Math.min(innerWidth - 90, textWidth(label, size) + 56), y = boss ? bossBottom + 14 : layout.compact ? m + ph + 14 : 108;
    const t = state.waveDelay > 0 ? 2.2 - state.waveDelay : 2.1 - state.banner, appear = clamp(t * 5, 0, 1), out = clamp((state.waveDelay > 0 ? state.waveDelay : state.banner) * 3, 0, 1), s = .5 + .5 * (1 - Math.pow(1 - appear, 3));
    const color = state.waveDelay > 0 ? "green" : state.wave === state.maxWaves ? "red" : "blue";
    ctx.save(); ctx.globalAlpha = Math.min(appear, out); ctx.translate(innerWidth / 2, y + size); ctx.scale(s, s); ctx.translate(-innerWidth / 2, -(y + size)); ribbon(innerWidth / 2, y, w, label, color, size); ctx.restore();
  }
}

function drawHint() {
  ctx.globalAlpha = clamp(state.hudHint, 0, 1);
  if (touchUsed) {
    const label = "LEFT SIDE · MOVE     RIGHT SIDE · ATTACK", size = fitSize("LEFT SIDE · MOVE     RIGHT SIDE · ATTACK", 12, innerWidth - 50), w = textWidth(label, size) + 32, y = innerHeight - 250;
    woodFrame(innerWidth / 2 - w / 2, y, w, 34, { inner: "slate", thick: 5, corners: null }); text(label, innerWidth / 2, y + 22, { size, align: "center" });
  } else {
    const groups = [[["W", "A", "S", "D"], "MOVE"], [["SPACE"], "ATTACK"], [["P"], "PAUSE"], [["M"], "SOUND"]]; let w = 16;
    for (const [ks, label] of groups) { for (const k of ks) w += R(Math.max(18, textWidth(k, 10) + 10)) + 3; w += textWidth(label, 11) + 20; }
    const y = innerHeight - 50; let cx = R(innerWidth / 2 - w / 2); woodFrame(cx, y, w, 36, { inner: "slate", thick: 5, corners: null }); cx += 12;
    for (const [ks, label] of groups) { for (const k of ks) cx += keycap(cx, y + 9, k) + 3; text(label, cx + 3, y + 22, { size: 11 }); cx += textWidth(label, 11) + 20; }
  }
  ctx.globalAlpha = 1;
}

// Points toward the nearest invader whenever none are on screen.
function drawEnemyPointer() {
  if (state.over) return; const cam = state.camera, h = state.hero, alive = state.enemies.filter(e => !e.dead); if (!alive.length) return;
  const onScreen = e => e.x > cam.x && e.x < cam.x + innerWidth && e.y - 50 > cam.y && e.y - 50 < cam.y + innerHeight;
  if (alive.some(onScreen)) return;
  const target = alive.reduce((a, b) => distance(a, h) < distance(b, h) ? a : b), hx = h.x - cam.x, hy = h.y - 50 - cam.y, angle = Math.atan2(target.y - 50 - cam.y - hy, target.x - cam.x - hx);
  const pad = 46, cx = innerWidth / 2, cy = innerHeight / 2, cos = Math.cos(angle), sin = Math.sin(angle), t = Math.min(Math.abs((cx - pad) / (cos || 1e-6)), Math.abs((cy - pad) / (sin || 1e-6)));
  const px = cx + cos * t, py = cy + sin * t, pulse = 1 + Math.sin(state.time * 6) * .12;
  ctx.save(); ctx.translate(px, py); ctx.rotate(angle); ctx.scale(pulse, pulse);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(-12, -16); ctx.lineTo(-6, 0); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = target.boss ? "#ff8a5c" : C.gold; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = target.boss ? "#ffc29a" : C.goldHi; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -10); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill(); ctx.restore();
}

const touchLayout = () => ({ attack: { x: innerWidth - 74, y: innerHeight - 84, r: 46 }, pause: { x: innerWidth - 40, y: innerHeight - 168, r: 22 } });
function roundButton(x, y, r, face) { ellipse(x + 1, y + 4, r + 2, r + 2, "rgba(0,0,0,.35)"); ellipse(x, y, r + 2, r + 2, C.ink); ellipse(x, y, r, r, C.wood); ellipse(x, y - 1, r - 2, r - 2, C.woodLight); ellipse(x, y, r - 3, r - 3, C.wood); ellipse(x, y, r - 6, r - 6, C.ink); ellipse(x, y, r - 8, r - 8, face); }
function drawTouchControls() {
  const t = touchLayout(), h = state.hero, cl = classes[state.selected], ready = clamp(1 - h.attackCd / (cl.cooldown * h.cooldownScale), 0, 1), a = t.attack;
  ctx.globalAlpha = .9; roundButton(a.x, a.y, a.r, ready >= 1 ? "#5c9a3e" : "#3a3f48");
  if (ready < 1) { ctx.fillStyle = "rgba(79,163,199,.75)"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.arc(a.x, a.y, a.r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready); ctx.closePath(); ctx.fill(); }
  drawIcon("sword", a.x - 13, a.y - 14, 3);
  const pz = t.pause; roundButton(pz.x, pz.y, pz.r, C.slateHi); rect(pz.x - 6, pz.y - 7, 4, 14, C.cream); rect(pz.x + 2, pz.y - 7, 4, 14, C.cream);
  const j = state.joystick; if (j) { ctx.globalAlpha = .55; ellipse(j.ox, j.oy, 60, 60, C.ink); ellipse(j.ox, j.oy, 56, 56, "#2b2f38"); ctx.globalAlpha = .95; const dx = j.x - j.ox, dy = j.y - j.oy, len = Math.hypot(dx, dy), k = len > 55 ? 55 / len : 1; roundButton(j.ox + dx * k, j.oy + dy * k, 24, C.gold); }
  ctx.globalAlpha = 1;
}

function drawPause(layout) {
  vignette(.72);
  const w = Math.min(400, innerWidth - 24), h = 214, x = innerWidth / 2 - w / 2, y = innerHeight / 2 - h / 2 + 10, inner = woodFrame(x, y, w, h);
  ribbon(innerWidth / 2, y - 22, Math.min(230, w - 90), "PAUSED", "blue", layout.mobile ? 18 : 22);
  inkText(touchUsed ? "Take a breath, hero." : "Take a breath, hero.  (P / Esc to resume)", innerWidth / 2, inner.y + 46, fitSize("Take a breath, hero.  (P / Esc to resume)", 13, inner.w - 20), "center", 400);
  const bx = inner.x + 16, bw = inner.w - 32, half = (bw - 10) / 2;
  button(bx, inner.y + 62, bw, 42, "RESUME", () => setPaused(false), { color: "green" });
  button(bx, inner.y + 114, half, 38, audio.muted ? "SOUND: OFF" : "SOUND: ON", () => audio.toggle(), { color: "blue" });
  button(bx + half + 10, inner.y + 114, half, 38, "QUIT", () => reset(), { color: "red" });
}

function drawResults(layout) {
  const fade = state.won ? clamp(state.overTime * 2.5, 0, 1) : clamp((state.overTime - .7) * 2.5, 0, 1); if (fade <= 0) return;
  ctx.globalAlpha = fade; vignette(.86);
  const h = state.hero, w = Math.min(580, innerWidth - 24), statRows = w - 18 >= 480 ? 1 : 2, ph = 18 + 66 + statRows * 44 + 34 + 62, x = innerWidth / 2 - w / 2, y = innerHeight / 2 - ph / 2 + 12, inner = woodFrame(x, y, w, ph, { corners: state.won ? "gold" : "iron" }), cx = innerWidth / 2;
  ribbon(cx, y - 24, Math.min(300, w - 100), state.won ? "VICTORY!" : "DEFEAT", state.won ? "gold" : "red", layout.mobile ? 20 : 26);
  inkText(state.won ? "The valley is safe" : "You fell in battle", cx, inner.y + 50, layout.mobile ? 17 : 20, "center");
  const stats = [["hourglass", "TIME", formatTime(state.battleTime)], ["gem", "LEVEL", String(h.level)], ["skull", "DEFEATED", `${state.kills}/${state.totalEnemies}`], ["heart", "DAMAGE TAKEN", String(state.damageTaken)]];
  const cols = inner.w >= 480 ? 4 : 2, cw = (inner.w - 20) / cols, top = inner.y + 66;
  stats.forEach(([icon, label, value], k) => {
    const sx = inner.x + 10 + (k % cols) * cw, sy = top + Math.floor(k / cols) * 44; rect(sx + 3, sy, cw - 6, 40, C.parchShade); rect(sx + 3, sy, cw - 6, 2, C.parchEdge);
    const [iw, ih] = iconSize(icon, 2); drawIcon(icon, sx + 10, sy + 20 - ih / 2, 2); inkText(label, sx + 16 + iw, sy + 15, fitSize(label, 10, cw - iw - 26, 8), "left", 400); inkText(value, sx + 16 + iw, sy + 33, 16);
  });
  const recordY = top + Math.ceil(stats.length / cols) * 44 + 18;
  if (state.won && state.record) text(state.record.isNew ? `NEW BEST TIME FOR THE ${classes[state.selected].name.toUpperCase()}!` : `BEST TIME  ${formatTime(state.record.best)}`, cx, recordY, { size: fitSize(`NEW BEST TIME FOR THE ${classes[state.selected].name.toUpperCase()}!`, 15, inner.w - 20), align: "center", color: state.record.isNew ? "#2f7d26" : C.inkText, outline: null, shadow: false });
  else if (!state.won) inkText(`Reached wave ${state.wave} of ${state.maxWaves}`, cx, recordY, 14, "center");
  const ready = state.overTime > 1, bw = (inner.w - 42) / 2, by = inner.y + inner.h - 54;
  button(inner.x + 16, by, bw, 42, "FIGHT AGAIN", retry, { color: "green", enabled: ready });
  button(inner.x + 26 + bw, by, bw, 42, "HALL OF HEROES", () => reset(), { color: "blue", enabled: ready });
  if (!touchUsed && ready && y + ph + 28 < innerHeight) text("ENTER · Fight again     R · Hall of Heroes", cx, y + ph + 28, { size: 12, align: "center", color: "#e8dcc0" });
  ctx.globalAlpha = 1;
}

function loop(now) {
  const raw = now - last, dt = Math.min(.033, raw / 1000); last = now;
  const t0 = performance.now(); update(dt); const t1 = performance.now();
  // The ground covers the whole screen, so the full-screen clear is only needed when the window is wider/taller than the world.
  hitAreas = []; uiHot = false; if (innerWidth > WORLD.w || innerHeight > WORLD.h) ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (state.mode === "select") drawSelection(); else if (state.mode === "upgrade") drawUpgrade(); else { drawWorld(); drawUI(); }
  const t2 = performance.now();
  // Adaptive quality: if a high-DPI screen keeps the game under ~45 fps, render at 1x (pixel art stays crisp).
  if (raw < 250 && !document.hidden) {
    perf.sum += raw; perf.upd += t1 - t0; perf.draw += t2 - t1;
    if (++perf.n >= 60) {
      const avg = perf.sum / perf.n; perf.stats = { fps: 1000 / avg, frame: avg, upd: perf.upd / perf.n, draw: perf.draw / perf.n };
      // Still slow at 1x for two windows in a row (~4 s): switch to lite mode for the rest of the session.
      if (avg > 22 && renderScale > 1) { maxScale = 1; resize(); } else if (avg > 22 && !perf.lite) { if (++perf.slow >= 2) perf.lite = true; } else perf.slow = 0;
      perf.sum = perf.upd = perf.draw = perf.n = 0;
    }
  }
  if (perf.show) drawPerf();
  const cursor = uiHot ? "pointer" : state.mode === "playing" && !state.paused && !state.over ? "crosshair" : "default"; if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  requestAnimationFrame(loop);
}

const pointerPos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const inCircle = (c, x, y) => Math.hypot(x - c.x, y - c.y) <= c.r + 8;
function retry() { const id = state.selected; reset(); chooseClass(id); }

addEventListener("resize", resize);
addEventListener("keydown", e => {
  audio.unlock(); keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === "KeyM") audio.toggle();
  else if (e.code === "F3") { e.preventDefault(); perf.show = !perf.show; }
  else if (state.mode === "select" && /^Digit[1-4]$/.test(e.code)) chooseClass(Object.keys(classes)[Number(e.code.at(-1)) - 1]);
  else if (state.mode === "upgrade" && /^Digit[1-3]$/.test(e.code)) chooseUpgrade(Number(e.code.at(-1)) - 1);
  else if (state.over && state.overTime > 1) { if (e.code === "KeyR") reset(); else if (e.code === "Enter") retry(); }
  else if (e.code === "KeyP" || e.code === "Escape") setPaused(!state.paused);
  else if (e.code === "Space") attack();
});
addEventListener("keyup", e => keys.delete(e.code));
// Release held keys and pause if the window loses focus, so the hero doesn't keep running.
addEventListener("blur", () => { keys.clear(); setPaused(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { keys.clear(); setPaused(true); } });

canvas.addEventListener("pointerdown", e => {
  audio.unlock(); const [x, y] = pointerPos(e), touch = e.pointerType === "touch"; pointer.x = x; pointer.y = y;
  if (touch && !touchUsed) { touchUsed = true; if (state.hero) state.hudHint = 6; }
  if (state.mode !== "playing" || state.paused || state.over) {
    // Topmost (last drawn) hit area wins.
    const hit = [...hitAreas].reverse().find(r => inside(r, x, y));
    if (hit) hit.action(); else if (state.paused && !touch) setPaused(false);
    return;
  }
  if (touch) {
    const t = touchLayout();
    if (inCircle(t.pause, x, y)) setPaused(true);
    else if (inCircle(t.attack, x, y) || x > innerWidth / 2) attack();
    else if (!state.joystick) { state.joystick = { id: e.pointerId, ox: x, oy: y, x, y }; try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } }
    return;
  }
  attack(x + state.camera.x);
});
canvas.addEventListener("pointermove", e => { const [x, y] = pointerPos(e); if (e.pointerType !== "touch") { pointer.x = x; pointer.y = y; } const j = state?.joystick; if (j && j.id === e.pointerId) { j.x = x; j.y = y; } });
const releasePointer = e => { if (e.pointerType === "touch") { pointer.x = pointer.y = -1; } if (state?.joystick?.id === e.pointerId) state.joystick = null; };
canvas.addEventListener("pointerup", releasePointer); canvas.addEventListener("pointercancel", releasePointer);
canvas.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") pointer.x = pointer.y = -1; });
canvas.addEventListener("contextmenu", e => e.preventDefault());

(async function start() {
  try {
    // Wait briefly for the pixel font; fall back to Georgia if it can't load (e.g. offline).
    const font = document.fonts ? Promise.race([Promise.all([document.fonts.load(`700 16px "Pixelify Sans"`), document.fonts.load(`400 16px "Pixelify Sans"`)]), new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : null;
    await Promise.all([font, ...Object.entries(paths).map(async ([key, path]) => images[key] = await loadImage(path))]);
    resize(); buildGroundCache(); reset(); buildAmbient();
    // Upload every sprite sheet to the GPU now (one tiny draw each) instead of mid-battle.
    for (const img of Object.values(images)) ctx.drawImage(img, 0, 0, 1, 1); ctx.clearRect(0, 0, 2, 2); const loading = document.querySelector("#loading"); loading.classList.add("hidden"); setTimeout(() => loading.remove(), 400); requestAnimationFrame(loop);
  } catch (err) { document.querySelector("#loading").textContent = "The assets could not be loaded. Run the game through a local server."; console.error(err); }
})();
