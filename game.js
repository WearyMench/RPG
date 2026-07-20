"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
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
  sheep: A + "Decorations/Sheep/Sheep_Idle.png", fire: A + "Effects/Fire/Fire.png",
  tilemap1: A + "Terrain/Tilemap_color1.png", tilemap2: A + "Terrain/Tilemap_color2.png", tilemap3: A + "Terrain/Tilemap_color3.png",
  water1: A + "Terrain/Water_FlatGround_1_(12frames).png", water2: A + "Terrain/Water_FlatGround_2_(12frames).png", water3: A + "Terrain/Water_FlatGround_3_(12frames).png", water4: A + "Terrain/Water_FlatGround_4_(12frames).png",
};
const classes = {
  warrior: { name: "Warrior", description: "Balanced melee fighter", hp: 9, speed: 220, range: 112, cooldown: .5, damage: 2, idle: 8, run: 6, attack: 4, size: 112, foot: 32 },
  archer: { name: "Archer", description: "Fast ranged attacker", hp: 6, speed: 235, range: 520, cooldown: .72, damage: 1, idle: 6, run: 4, attack: 8, size: 108, foot: 32 },
  lancer: { name: "Lancer", description: "Durable with extra reach", hp: 11, speed: 195, range: 158, cooldown: .7, damage: 2, idle: 12, run: 6, attack: 3, size: 122, foot: 47 },
  monk: { name: "Monk", description: "Healing area pulse", hp: 8, speed: 210, range: 175, cooldown: 1.15, damage: 1, idle: 6, run: 4, attack: 11, size: 108, foot: 33 },
};
const images = {}, terrainPatterns = {}, WORLD = { w: 2600, h: 1800 }, keys = new Set();
let state, selectionRects = [], upgradeRects = [], last = performance.now();
const upgradePool = [
  { id: "power", name: "Tempered Weapon", description: "+1 damage", apply: () => state.hero.damageBonus++ },
  { id: "vitality", name: "Heart of the Valley", description: "+2 maximum health and heal", apply: () => { state.hero.maxHp += 2; state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 3); } },
  { id: "agility", name: "Windstep", description: "+25 movement speed", apply: () => state.hero.speed += 25 },
  { id: "reach", name: "Long Reach", description: "+20 attack range", apply: () => state.hero.rangeBonus += 20 },
];

const seeded = n => { const x = Math.sin(n * 999.31) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const loadImage = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });

function buildTerrainPatterns() {
  for (let i = 1; i <= 3; i++) {
    const tile = document.createElement("canvas"); tile.width = tile.height = 64;
    const tileCtx = tile.getContext("2d"); tileCtx.imageSmoothingEnabled = false;
    tileCtx.drawImage(images[`tilemap${i}`], 128, 128, 64, 64, 0, 0, 64, 64);
    terrainPatterns[i] = ctx.createPattern(tile, "repeat");
  }
  const road = document.createElement("canvas"); road.width = road.height = 128;
  const roadCtx = road.getContext("2d"); roadCtx.imageSmoothingEnabled = false;
  for (let y = 0; y < 128; y += 64) for (let x = 0; x < 128; x += 64) roadCtx.drawImage(images.tilemap1, 128, 128, 64, 64, x, y, 64, 64);
  roadCtx.fillStyle = "rgba(137, 101, 57, .34)"; roadCtx.fillRect(0, 0, 128, 128);
  const roadColors = ["rgba(105,78,45,.32)", "rgba(231,205,129,.28)", "rgba(122,93,52,.22)"];
  for (let i = 0; i < 38; i++) { const x = Math.floor(seeded(i + 410) * 64) * 2, y = Math.floor(seeded(i + 510) * 64) * 2; roadCtx.fillStyle = roadColors[i % roadColors.length]; roadCtx.fillRect(x, y, i % 4 ? 4 : 8, 2); }
  terrainPatterns.road = ctx.createPattern(road, "repeat");
}

function traceMainRoad(padding = 0) {
  const controls = [[0,915,110],[500,845,96],[980,970,108],[1450,905,100],[1930,945,102],[2600,865,130]], top = [], bottom = [];
  for (let segment = 0; segment < controls.length - 1; segment++) {
    const a = controls[segment], b = controls[segment + 1], steps = Math.ceil((b[0] - a[0]) / 48);
    for (let step = 0; step < steps; step++) {
      const t = step / steps, x = Math.round((a[0] + (b[0] - a[0]) * t) / 4) * 4, center = a[1] + (b[1] - a[1]) * t, width = a[2] + (b[2] - a[2]) * t;
      const upperNoise = (seeded(segment * 100 + step + 710) - .5) * 34, lowerNoise = (seeded(segment * 100 + step + 910) - .5) * 34;
      top.push([x, Math.round((center - width - padding + upperNoise) / 4) * 4]); bottom.push([x, Math.round((center + width + padding + lowerNoise) / 4) * 4]);
    }
  }
  const last = controls.at(-1); top.push([last[0], last[1] - last[2] - padding]); bottom.push([last[0], last[1] + last[2] + padding]);
  ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top.slice(1)) ctx.lineTo(p[0], p[1]); for (const p of bottom.reverse()) ctx.lineTo(p[0], p[1]); ctx.closePath();
}

function traceRoadBranch(x, y, w, h, padding = 0) {
  const left = [], right = [], steps = Math.ceil(h / 28), seed = x * 3 + y;
  for (let i = 0; i <= steps; i++) { const py = Math.round((y + h * i / steps) / 4) * 4, n1 = (seeded(seed + i) - .5) * 16, n2 = (seeded(seed + i + 50) - .5) * 16; left.push([Math.round((x - padding + n1) / 4) * 4, py]); right.push([Math.round((x + w + padding + n2) / 4) * 4, py]); }
  ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1] - padding); for (const p of left.slice(1)) ctx.lineTo(p[0], p[1]); for (const p of right.reverse()) ctx.lineTo(p[0], p[1]); ctx.closePath();
}

function drawRoadBranch(x, y, w, h) { ctx.fillStyle = "#69834d"; traceRoadBranch(x, y, w, h, 7); ctx.fill(); ctx.fillStyle = terrainPatterns.road || "#a79b60"; traceRoadBranch(x, y, w, h); ctx.fill(); }

function traceClearing(cx, cy, rx, ry, seed, padding = 0) {
  const points = 40; ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = i / points * Math.PI * 2, broad = Math.sin(angle * 3 + seed) * 18, noise = (seeded(seed * 100 + i) - .5) * 54;
    const px = Math.round((cx + Math.cos(angle) * (rx + padding + broad + noise)) / 4) * 4;
    const py = Math.round((cy + Math.sin(angle) * (ry + padding + broad * .6 + noise * .7)) / 4) * 4;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function buildScenery() {
  const items = [], obstacles = [];
  const building = (key, x, y, w, h, radius) => { items.push({ type: "building", key, x, y, w, h, sortY: y }); obstacles.push({ x, y: y - 36, r: radius }); };
  const tree = (x, y, variant, frame) => { items.push({ type: "tree", variant, frame, x, y, sortY: y }); obstacles.push({ x, y: y - 18, r: 34 }); };
  const rock = (x, y, variant) => { items.push({ type: "rock", variant, x, y, sortY: y + 58 }); obstacles.push({ x: x + 30, y: y + 38, r: 20 }); };

  // Blue village and red stronghold leave the central road open for combat.
  building("castle", 390, 735, 320, 256, 112); building("blueTower", 145, 720, 128, 256, 52);
  building("blueHouse1", 620, 610, 128, 192, 48); building("blueHouse2", 765, 690, 128, 192, 48); building("blueHouse3", 560, 1220, 128, 192, 48);
  building("redCastle", 2310, 720, 320, 256, 112); building("redTower", 2500, 1050, 128, 256, 52);
  building("redHouse1", 2070, 600, 128, 192, 48); building("redHouse2", 2180, 1220, 128, 192, 48);

  // Designed forest belts frame the battlefield without blocking the main path.
  for (let i = 0; i < 16; i++) tree(90 + i * 155 + seeded(i) * 45, 250 + seeded(i + 40) * 220, i % 4, i % 8);
  for (let i = 0; i < 14; i++) tree(100 + i * 175 + seeded(i + 80) * 55, 1390 + seeded(i + 120) * 260, (i + 2) % 4, (i + 3) % 8);
  [[880,560],[1040,440],[1260,620],[1540,470],[1770,590],[930,1310],[1200,1460],[1510,1320],[1810,1450],[1990,1330]].forEach((p,i)=>tree(p[0],p[1],i%4,(i*2)%8));
  [[75,990],[210,1120],[430,1490],[860,1180],[1110,330],[1350,1560],[1660,360],[1880,1210],[2040,410],[2390,1430],[2500,420],[2290,1550]].forEach((p,i)=>rock(p[0],p[1],i%4));

  [[490,780],[690,820],[820,740],[430,1160],[650,1130],[1960,720],[2150,820],[2410,1180]].forEach((p,i)=>items.push({type:"bush",variant:i%4,frame:i%8,x:p[0],y:p[1],sortY:p[1]}));
  [[330,1080],[720,1050],[870,1120]].forEach((p,i)=>items.push({type:"sheep",frame:i%6,x:p[0],y:p[1],sortY:p[1]}));
  [[2020,940],[2240,1040],[2420,880]].forEach((p,i)=>items.push({type:"fire",frame:i%7,x:p[0],y:p[1],sortY:p[1]}));
  items.sort((a, b) => a.sortY - b.sortY);
  return { items, obstacles };
}

function reset(mode = "select") {
  const map = buildScenery();
  state = { mode, selected: null, hero: null, enemies: [], camera: { x: 0, y: 0 }, time: 0, kills: 0, totalEnemies: 19, wave: 0, maxWaves: 4, waveDelay: 0, banner: 0, over: false, won: false, particles: [], projectiles: [], scenery: map.items, obstacles: map.obstacles, upgradeChoices: [] };
}

function chooseClass(id) {
  const c = classes[id]; state.selected = id; state.mode = "playing";
  state.hero = { x: 600, y: 900, hp: c.hp, maxHp: c.hp, speed: c.speed, damageBonus: 0, rangeBonus: 0, level: 1, xp: 0, xpNext: 4, facing: 1, action: 0, actionDuration: 0, hitDone: false, attackCd: 0, inv: 0, hurt: 0, anim: 0, moving: false }; state.hudHint = 5;
  startWave(1);
}

function makeEnemy(i, wave, boss = false) {
  const hp = boss ? 32 : 3 + wave;
  const spawnPoints = [[1840,780],[1940,940],[2070,1060],[2210,880],[2320,1030],[1730,1010],[1990,820],[2390,780]];
  const point = spawnPoints[i % spawnPoints.length];
  return { x: boss ? 2180 : point[0], y: boss ? 920 : point[1], hp, maxHp: hp, speed: boss ? 65 : 70 + wave * 8 + seeded(i) * 16, attackCd: .5 + seeded(i), attack: 0, hitDone: false, hurt: 0, dead: false, death: 0, facing: -1, anim: seeded(i) * 4, boss };
}

function startWave(number) {
  state.wave = number; state.banner = 2.1; state.waveDelay = 0;
  if (number === state.maxWaves) state.enemies = [makeEnemy(0, number, true)];
  else { const count = 2 + number * 2; state.enemies = Array.from({ length: count }, (_, i) => makeEnemy(i, number)); }
}

function gainXP(amount) {
  const h = state.hero; h.xp += amount;
  if (h.xp >= h.xpNext && state.wave < state.maxWaves) {
    h.xp -= h.xpNext; h.level++; h.xpNext += 3;
    const offset = state.kills % upgradePool.length;
    state.upgradeChoices = [0, 1, 2].map(i => upgradePool[(i + offset) % upgradePool.length]);
    state.mode = "upgrade";
  }
}

function chooseUpgrade(index) {
  const upgrade = state.upgradeChoices[index]; if (!upgrade) return;
  upgrade.apply(); state.mode = "playing"; state.banner = 1.2;
}

function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; }
function burst(x, y, color, count = 8) { for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: (seeded(i + state.time) - .5) * 150, vy: -30 - seeded(i + 8 + state.time) * 90, life: .55, color }); }

function moveWithCollisions(actor, dx, dy) {
  const tryAxis = (axis, amount) => {
    actor[axis] += amount;
    actor.x = clamp(actor.x, 45, WORLD.w - 45); actor.y = clamp(actor.y, 135, WORLD.h - 45);
    if (actor.y < 137) actor.y = 137;
    for (const o of state.obstacles) {
      const vx = actor.x - o.x, vy = actor.y - o.y, d = Math.hypot(vx, vy), min = o.r + 25;
      if (d < min) { actor.x = o.x + vx / (d || 1) * min; actor.y = o.y + vy / (d || 1) * min; }
    }
  };
  tryAxis("x", dx); tryAxis("y", dy);
}

function damageEnemy(e, damage, pushX = 0, pushY = 0) {
  if (e.dead || e.hurt > 0) return; e.hp -= damage; e.hurt = .2; e.x += pushX; e.y += pushY; burst(e.x, e.y - 35, "#ffd166");
  if (e.hp <= 0) { e.dead = true; e.death = .65; state.kills++; gainXP(e.boss ? 5 : 1); burst(e.x, e.y, "#d1495b", e.boss ? 28 : 13); }
}

function performHeroHit() {
  const h = state.hero, c = classes[state.selected];
  if (state.selected === "archer") { state.projectiles.push({ x: h.x + h.facing * 35, y: h.y - 48, vx: h.facing * 570, life: 1.1, damage: c.damage + h.damageBonus, facing: h.facing }); return; }
  let hits = 0;
  for (const e of state.enemies) {
    const d = distance(h, e), front = Math.sign(e.x - h.x || h.facing) === h.facing;
    if (!e.dead && d < c.range + h.rangeBonus && (state.selected === "monk" || front)) { const dx = (e.x - h.x) / (d || 1), dy = (e.y - h.y) / (d || 1); damageEnemy(e, c.damage + h.damageBonus, dx * (e.boss ? 10 : 32), dy * (e.boss ? 8 : 22)); hits++; }
  }
  if (state.selected === "monk") { h.hp = Math.min(h.maxHp, h.hp + 1); burst(h.x, h.y - 40, "#86efac", 12); }
}

function attack() {
  if (!state || state.mode !== "playing" || state.over) return;
  const h = state.hero, c = classes[state.selected]; if (h.attackCd > 0 || h.hurt > 0) return;
  h.actionDuration = state.selected === "monk" ? .72 : state.selected === "archer" ? .55 : .42; h.action = h.actionDuration; h.attackCd = c.cooldown; h.hitDone = false;
}

function update(dt) {
  if (!state) return; state.time += dt; if (state.mode !== "playing" || state.over) return;
  state.hudHint = Math.max(0, (state.hudHint || 0) - dt);
  state.banner = Math.max(0, state.banner - dt);
  const h = state.hero, c = classes[state.selected]; h.action = Math.max(0, h.action - dt); h.attackCd = Math.max(0, h.attackCd - dt); h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt);
  if (h.action > 0 && !h.hitDone && h.action < h.actionDuration * .56) { h.hitDone = true; performHeroHit(); }
  let dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0), dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len; h.moving = !!(dx || dy) && !h.action && !h.hurt;
  if (dx) h.facing = Math.sign(dx); if (h.moving) moveWithCollisions(h, dx * h.speed * dt, dy * h.speed * dt); h.anim += dt * (h.moving ? 10 : 6);

  for (const fire of state.scenery) {
    if (fire.type === "fire" && Math.hypot(h.x - fire.x, h.y - fire.y) < 42 && h.inv <= 0) {
      h.hp--; h.inv = .85; h.hurt = .2; burst(h.x, h.y - 28, "#fb923c", 14);
    }
  }

  for (const p of state.projectiles) {
    p.x += p.vx * dt; p.life -= dt;
    for (const e of state.enemies) if (!e.dead && p.life > 0 && Math.hypot(e.x - p.x, e.y - 35 - p.y) < 42) { damageEnemy(e, p.damage, p.facing * 28, 0); p.life = 0; break; }
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);

  for (const e of state.enemies) {
    if (e.dead) { e.death -= dt; continue; } e.attackCd -= dt; e.hurt = Math.max(0, e.hurt - dt); e.attack = Math.max(0, e.attack - dt);
    const d = distance(e, h), vx = h.x - e.x, vy = h.y - e.y, attackRange = e.boss ? 132 : 88;
    if (e.attack > 0) {
      if (!e.hitDone && e.attack < .3) { e.hitDone = true; if (distance(e, h) < attackRange + 12 && h.inv <= 0) { h.hp -= e.boss ? 2 : 1; h.inv = .75; h.hurt = .18; moveWithCollisions(h, vx / (d || 1) * (e.boss ? 55 : 30), vy / (d || 1) * (e.boss ? 55 : 30)); burst(h.x, h.y - 35, e.boss ? "#fb923c" : "#8ecae6", e.boss ? 15 : 8); } }
    } else if (d < attackRange && e.attackCd <= 0) { e.attack = e.boss ? .72 : .58; e.attackCd = e.boss ? 1.35 : 1.12; e.hitDone = false; e.facing = Math.sign(vx) || e.facing; }
    else if (d < 520 && d > 75 && !e.hurt) { moveWithCollisions(e, vx / d * e.speed * dt, vy / d * e.speed * dt); e.facing = Math.sign(vx) || e.facing; e.anim += dt * 8; }
    else e.anim += dt * 5;
  }
  for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; } state.particles = state.particles.filter(p => p.life > 0);
  if (h.hp <= 0) { state.over = true; state.won = false; }
  const waveCleared = state.enemies.length && state.enemies.every(e => e.dead);
  if (waveCleared && !state.waveDelay) { if (state.wave === state.maxWaves) { state.over = true; state.won = true; } else state.waveDelay = 2.2; }
  if (state.waveDelay > 0) { state.waveDelay -= dt; if (state.waveDelay <= 0) startWave(state.wave + 1); }
  state.camera.x += (clamp(h.x - innerWidth / 2, 0, Math.max(0, WORLD.w - innerWidth)) - state.camera.x) * Math.min(1, dt * 6); state.camera.y += (clamp(h.y - innerHeight / 2, 0, Math.max(0, WORLD.h - innerHeight)) - state.camera.y) * Math.min(1, dt * 6);
}

function sprite(img, x, y, frame, frames, facing = 1, size = 96, alpha = 1) { const fw = img.width / frames, fh = img.height, scale = size / fh; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1); ctx.drawImage(img, Math.floor(frame % frames) * fw, 0, fw, fh, -fw * scale / 2, -fh * scale, fw * scale, fh * scale); ctx.restore(); }
function gridSprite(img, x, y, frame, row, facing = 1, size = 150, alpha = 1) { const fw = img.width / 7, fh = img.height / 5, scale = size / fh; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1); ctx.drawImage(img, Math.floor(frame % 7) * fw, row * fh, fw, fh, -fw * scale / 2, -fh * scale, fw * scale, fh * scale); ctx.restore(); }
function ellipse(x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function bar(x, y, value, max, width = 58) { ctx.fillStyle = "#391f28"; ctx.fillRect(x - width / 2, y, width, 7); ctx.fillStyle = value / max > .3 ? "#73c66b" : "#ef4444"; ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * Math.max(0, value) / max, 5); }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

function drawGround() {
  ctx.fillStyle = terrainPatterns[3] || "#77a95c"; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  // Distinct clearings make the two settlements feel like separate regions.
  ctx.fillStyle = "#6f9354"; traceClearing(490, 880, 520, 500, 11, 12); ctx.fill();
  ctx.fillStyle = terrainPatterns[1] || "#82b765"; traceClearing(490, 880, 520, 500, 11); ctx.fill();
  ctx.fillStyle = "#607a4c"; traceClearing(2230, 900, 430, 460, 23, 12); ctx.fill();
  ctx.fillStyle = terrainPatterns[2] || "#6f9654"; traceClearing(2230, 900, 430, 460, 23); ctx.fill();
  // Textured branches connect settlement doors before the main road is layered over them.
  drawRoadBranch(350, 680, 82, 190); drawRoadBranch(585, 580, 70, 255); drawRoadBranch(735, 650, 68, 210); drawRoadBranch(530, 1000, 70, 235);
  drawRoadBranch(2270, 680, 82, 180); drawRoadBranch(2035, 570, 70, 270); drawRoadBranch(2145, 1000, 70, 230); drawRoadBranch(2465, 950, 70, 115);
  // A bordered, angular road keeps the pixel-art silhouette and combat lane readable.
  ctx.fillStyle = "#69834d"; traceMainRoad(10); ctx.fill(); ctx.fillStyle = terrainPatterns.road || "#a79b60"; traceMainRoad(); ctx.fill();
  ctx.fillStyle = "rgba(91,70,42,.18)"; for (let x = 60; x < WORLD.w; x += 180) ctx.fillRect(x, 875 + (seeded(x) - .5) * 100, 42, 4);
  // Animated northern shoreline using the provided twelve-frame water assets.
  ctx.fillStyle = "#4e8da9"; ctx.fillRect(0, 0, WORLD.w, 105); ctx.fillStyle = "rgba(255,255,255,.16)"; for (let x = 20; x < WORLD.w; x += 110) ctx.fillRect(x + Math.sin(state.time + x) * 12, 43, 58, 4);
  const waterFrame = Math.floor(state.time * 8) % 12;
  const shorelineTiles = Math.ceil(WORLD.w / 64);
  for (let tile = 0; tile < shorelineTiles; tile++) {
    const piece = tile === 0 ? 1 : tile === shorelineTiles - 1 ? 3 : 2;
    // The source faces water below the land. Flip it for our north-facing coast
    // and anchor its first opaque row directly on the water/ground boundary.
    ctx.save(); ctx.translate(tile * 64, 105); ctx.scale(1, -1);
    ctx.drawImage(images[`water${piece}`], waterFrame * 64, 0, 64, 64, 0, 0, 64, 64);
    ctx.restore();
  }
}

function drawScenery(item) {
  if (item.type === "building") ctx.drawImage(images[item.key], item.x - item.w / 2, item.y - item.h, item.w, item.h);
  else if (item.type === "tree") { const img = images[`tree${item.variant + 1}`], fw = img.width / 8, height = item.variant < 2 ? 144 : 124, width = fw / img.height * height; ctx.drawImage(img, item.frame * fw, 0, fw, img.height, item.x - width / 2, item.y - height, width, height); }
  else if (item.type === "rock") ctx.drawImage(images[`rock${item.variant + 1}`], item.x, item.y, 64, 64);
  else if (item.type === "bush") { const img = images[`bush${item.variant + 1}`]; ctx.drawImage(img, (Math.floor(state.time * 3 + item.frame) % 8) * 128, 0, 128, 128, item.x - 42, item.y - 62, 84, 84); }
  else if (item.type === "sheep") { const frame = Math.floor(state.time * 4 + item.frame) % 6; ctx.drawImage(images.sheep, frame * 128, 0, 128, 128, item.x - 45, item.y - 72, 90, 90); }
  else if (item.type === "fire") { const frame = Math.floor(state.time * 9 + item.frame) % 7; ellipse(item.x, item.y - 13, 40 + Math.sin(state.time * 7) * 3, 18, "rgba(251,146,60,.16)"); ctx.drawImage(images.fire, frame * 128, 0, 128, 128, item.x - 48, item.y - 82, 96, 96); }
}

function drawActor(a) {
    const o = a.o; ellipse(o.x, o.y - 4, 30, 11, "rgba(25,35,28,.28)");
    if (a.type === "hero") {
      const cl = classes[state.selected], action = o.action > 0, key = state.selected + (action ? "Attack" : o.moving ? "Run" : "Idle"), frames = action ? cl.attack : o.moving ? cl.run : cl.idle, frame = action ? (1 - o.action / o.actionDuration) * frames : o.anim;
      if (!(o.inv > 0 && Math.floor(o.inv * 12) % 2)) sprite(images[key], o.x, o.y + cl.foot, frame, frames, o.facing, cl.size); bar(o.x, o.y - 118, o.hp, o.maxHp, 74);
      if (state.selected === "monk" && action) sprite(images.monkEffect, o.x, o.y + 15, frame, 11, 1, 150, .65);
    } else {
      const attacking = o.attack > 0, near = distance(o, state.hero) < 520, img = attacking ? images.enemyAttack : near ? images.enemyRun : images.enemyIdle, frames = attacking ? 4 : near ? 6 : 8, frame = attacking ? (1 - o.attack / .58) * frames : o.anim;
      const alpha = o.dead ? clamp(o.death / .65, 0, 1) : o.hurt > 0 ? .55 : 1;
      if (o.boss) gridSprite(images.boss, o.x, o.y + 54, attacking ? (1 - o.attack / .72) * 7 : o.anim, attacking ? 2 : near ? 1 : 0, o.facing, 175, alpha);
      else sprite(img, o.x, o.y + 30, frame, frames, o.facing, 104, alpha);
      if (!o.dead) bar(o.x, o.y - (o.boss ? 145 : 105), o.hp, o.maxHp, o.boss ? 130 : 58);
    }
}

function drawWorld() {
  const c = state.camera; ctx.save(); ctx.translate(-Math.round(c.x), -Math.round(c.y)); drawGround();
  const layers = [
    ...state.scenery.map(item => ({ kind: "scenery", sortY: item.sortY, item })),
    ...state.enemies.filter(e => !e.dead || e.death > 0).map(o => ({ kind: "actor", sortY: o.y, actor: { type: "enemy", o } })),
    ...(state.hero ? [{ kind: "actor", sortY: state.hero.y, actor: { type: "hero", o: state.hero } }] : []),
  ].sort((a, b) => a.sortY - b.sortY);
  for (const layer of layers) { if (layer.kind === "scenery") drawScenery(layer.item); else drawActor(layer.actor); }
  for (const p of state.projectiles) sprite(images.arrow, p.x, p.y + 28, 0, 1, p.facing, 48);
  for (const p of state.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); } ctx.globalAlpha = 1; ctx.restore();
}

function pixelPanel(x, y, w, h, accent = "#b58a4b", fill = "rgba(31,42,40,.96)") {
  ctx.fillStyle = "rgba(10,15,15,.48)"; ctx.fillRect(x + 6, y + 7, w, h);
  ctx.fillStyle = "#33281f"; ctx.fillRect(x, y, w, h); ctx.fillStyle = accent; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = "#665039"; ctx.fillRect(x + 7, y + 7, w - 14, h - 14); ctx.fillStyle = fill; ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.fillStyle = "#e0bf76"; for (const [px, py] of [[x+5,y+5],[x+w-9,y+5],[x+5,y+h-9],[x+w-9,y+h-9]]) ctx.fillRect(px, py, 4, 4);
}

function pixelButton(x, y, w, h, label) { ctx.fillStyle = "#2c392e"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#76935b"; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.fillStyle = "#a8bd74"; ctx.fillRect(x + 6, y + 6, w - 12, 3); ctx.fillStyle = "#fff0bd"; ctx.font = "bold 13px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(label, x + w / 2, y + h / 2 + 5); }
function pixelMeter(x, y, w, h, value, color, segments = 0) { ctx.fillStyle = "#171d1c"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#504637"; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); ctx.fillStyle = color; ctx.fillRect(x + 4, y + 4, Math.max(0, (w - 8) * clamp(value, 0, 1)), h - 8); if (segments) { ctx.fillStyle = "rgba(20,25,23,.55)"; for (let i = 1; i < segments; i++) ctx.fillRect(x + i * w / segments, y + 2, 2, h - 4); } }
function hudPanel(x, y, w, h, accent = "#8ea267") { ctx.fillStyle = "rgba(8,12,12,.28)"; ctx.fillRect(x + 3, y + 4, w, h); ctx.fillStyle = "rgba(38,31,24,.78)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = accent; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); ctx.fillStyle = "rgba(23,32,30,.76)"; ctx.fillRect(x + 5, y + 5, w - 10, h - 10); }
const uiLayout = () => ({ compact: innerWidth < 980 || innerHeight < 680, mobile: innerWidth < 700, short: innerHeight < 580 });

function drawCompactSelection() {
  const layout = uiLayout(), ids = Object.keys(classes), gap = 10, cardW = Math.min(250, (innerWidth - 30) / 2), startY = layout.short ? 76 : 105, cardH = Math.min(layout.short ? 192 : 220, (innerHeight - startY - gap - 8) / 2), totalW = cardW * 2 + gap, startX = innerWidth / 2 - totalW / 2;
  pixelPanel(12, 10, innerWidth - 24, layout.short ? 60 : 76); ctx.textAlign = "center"; ctx.fillStyle = "#ffe2a0"; ctx.font = `bold ${layout.short ? 22 : 26}px Georgia, serif`; ctx.fillText("CHOOSE YOUR HERO", innerWidth / 2, layout.short ? 47 : 48); if (!layout.short) { ctx.fillStyle = "#cbd8c2"; ctx.font = "13px Georgia, serif"; ctx.fillText("Select a champion", innerWidth / 2, 69); }
  selectionRects = [];
  ids.forEach((id, i) => { const cl = classes[id], col = i % 2, row = Math.floor(i / 2), x = startX + col * (cardW + gap), y = startY + row * (cardH + gap), infoX = x + cardW * .5; selectionRects.push({ id, x, y, w: cardW, h: cardH }); pixelPanel(x, y, cardW, cardH, "#829b5d"); if (cardH > 165) sprite(images[id + "Idle"], x + cardW * .27, y + Math.min(112, cardH - 70), state.time * 6, cl.idle, 1, id === "lancer" ? 92 : 82); ctx.textAlign = "left"; ctx.fillStyle = "#ffe7ad"; ctx.font = `bold ${cardW < 175 ? 14 : 17}px Georgia, serif`; ctx.fillText(`${i + 1}. ${cl.name}`, infoX, y + 40); ctx.fillStyle = "#e0c98d"; ctx.font = `${cardW < 175 ? 10 : 12}px Georgia, serif`; ctx.fillText(`HP ${cl.hp} · DMG ${cl.damage}`, infoX, y + 66); if (cardW >= 175) ctx.fillText(`SPD ${cl.speed}`, infoX, y + 87); if (!layout.short && cardH > 205) { ctx.fillStyle = "#cbd8c2"; ctx.fillText(cl.description, x + 18, y + 148); } pixelButton(x + 18, y + cardH - 43, cardW - 36, 28, "SELECT"); }); ctx.textAlign = "left";
}

function drawSelection() {
  drawGround(); ctx.fillStyle = "rgba(12,19,20,.76)"; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.textAlign = "center"; if (innerWidth < 850 || innerHeight < 620) { drawCompactSelection(); return; }
  pixelPanel(innerWidth / 2 - 260, 30, 520, 105); ctx.fillStyle = "#ffe2a0"; ctx.font = "bold 34px Georgia, serif"; ctx.fillText("CHOOSE YOUR HERO", innerWidth / 2, 79); ctx.fillStyle = "#cbd8c2"; ctx.font = "15px Georgia, serif"; ctx.fillText("Select a champion to defend the valley", innerWidth / 2, 108);
  const ids = Object.keys(classes), cardW = Math.min(220, (innerWidth - 60) / 4), gap = 14, total = cardW * 4 + gap * 3, start = innerWidth / 2 - total / 2, y = Math.max(160, innerHeight / 2 - 170); selectionRects = [];
  ids.forEach((id, i) => { const cl = classes[id], x = start + i * (cardW + gap), h = 350; selectionRects.push({ id, x, y, w: cardW, h }); pixelPanel(x, y, cardW, h, "#829b5d"); ctx.fillStyle = "rgba(139,167,99,.12)"; ctx.fillRect(x + 15, y + 18, cardW - 30, 142); sprite(images[id + "Idle"], x + cardW / 2, y + 164, state.time * 6, cl.idle, 1, id === "lancer" ? 140 : 128); ctx.fillStyle = "#ffe7ad"; ctx.font = "bold 21px Georgia, serif"; ctx.fillText(`${i + 1}. ${cl.name}`, x + cardW / 2, y + 205); ctx.fillStyle = "#cbd8c2"; ctx.font = "13px Georgia, serif"; ctx.fillText(cl.description, x + cardW / 2, y + 233); ctx.fillStyle = "#e0c98d"; ctx.fillText(`HP ${cl.hp}  ·  DMG ${cl.damage}`, x + cardW / 2, y + 266); ctx.fillText(`SPD ${cl.speed}  ·  RNG ${cl.range}`, x + cardW / 2, y + 289); pixelButton(x + 20, y + 308, cardW - 40, 34, "SELECT"); }); ctx.textAlign = "left";
}

function drawUpgrade() {
  drawWorld(); ctx.fillStyle = "rgba(9,15,17,.8)"; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.textAlign = "center";
  if (innerWidth < 720 || innerHeight < 540) { pixelPanel(12, 12, innerWidth - 24, 74, "#d3a84f"); ctx.fillStyle = "#ffe08a"; ctx.font = `bold ${innerWidth < 420 ? 18 : 24}px Georgia, serif`; ctx.fillText(`LEVEL ${state.hero.level} · CHOOSE A BLESSING`, innerWidth / 2, 56); const w = Math.min(480, innerWidth - 28), x = innerWidth / 2 - w / 2, h = Math.min(122, (innerHeight - 112) / 3), gap = 7; upgradeRects = []; state.upgradeChoices.forEach((u, i) => { const y = 98 + i * (h + gap); upgradeRects.push({ x, y, w, h, index: i }); pixelPanel(x, y, w, h, "#d3a84f"); ctx.textAlign = "left"; ctx.fillStyle = "#fff2c2"; ctx.font = "bold 20px Georgia, serif"; ctx.fillText(`${i + 1}`, x + 25, y + h / 2 + 7); ctx.fillStyle = "#ffe7ad"; ctx.font = `bold ${w < 390 ? 14 : 16}px Georgia, serif`; ctx.fillText(u.name, x + 58, y + 40); ctx.fillStyle = "#d5dfcf"; ctx.font = "12px Georgia, serif"; ctx.fillText(u.description, x + 58, y + 66); if (w >= 400) pixelButton(x + w - 105, y + h / 2 - 17, 88, 34, "CHOOSE"); }); ctx.textAlign = "left"; return; }
  pixelPanel(innerWidth / 2 - 225, 32, 450, 104, "#d3a84f"); ctx.fillStyle = "#ffe08a"; ctx.font = "bold 32px Georgia, serif"; ctx.fillText(`LEVEL ${state.hero.level}`, innerWidth / 2, 78); ctx.fillStyle = "#d9e5cf"; ctx.font = "15px Georgia, serif"; ctx.fillText("Choose a blessing for the battle ahead", innerWidth / 2, 108);
  const cardW = Math.min(250, (innerWidth - 80) / 3), gap = 18, total = cardW * 3 + gap * 2, start = innerWidth / 2 - total / 2, y = Math.max(175, innerHeight / 2 - 120); upgradeRects = [];
  state.upgradeChoices.forEach((u, i) => { const x = start + i * (cardW + gap); upgradeRects.push({ x, y, w: cardW, h: 250, index: i }); pixelPanel(x, y, cardW, 250, "#d3a84f"); ctx.fillStyle = "#6f8d58"; ctx.fillRect(x + cardW / 2 - 27, y + 30, 54, 54); ctx.fillStyle = "#fff2c2"; ctx.font = "bold 25px Georgia, serif"; ctx.fillText(String(i + 1), x + cardW / 2, y + 66); ctx.fillStyle = "#ffe7ad"; ctx.font = "bold 18px Georgia, serif"; ctx.fillText(u.name, x + cardW / 2, y + 123); ctx.fillStyle = "#d5dfcf"; ctx.font = "14px Georgia, serif"; ctx.fillText(u.description, x + cardW / 2, y + 157); pixelButton(x + 28, y + 193, cardW - 56, 36, "CHOOSE"); }); ctx.textAlign = "left";
}

function drawUI() {
  const cl = classes[state.selected], h = state.hero, layout = uiLayout(), margin = layout.mobile ? 7 : 16;
  const playerW = layout.mobile ? Math.floor(innerWidth * .62) - margin * 1.5 : layout.compact ? 240 : 280, panelH = 86;
  hudPanel(margin, margin, playerW, panelH); ctx.fillStyle = "#ffe2a0"; ctx.font = `bold ${layout.mobile ? 11 : 13}px Georgia, serif`; ctx.fillText(`${cl.name.toUpperCase()} · LV ${h.level}     HP ${Math.max(0,h.hp)}/${h.maxHp}`, margin + 10, margin + 19); pixelMeter(margin + 10, margin + 27, playerW - 20, 13, h.hp / h.maxHp, "#b84c4c", h.maxHp); ctx.fillStyle = "#d7cba8"; ctx.font = "9px Georgia, serif"; ctx.fillText("XP", margin + 10, margin + 53); pixelMeter(margin + 30, margin + 45, playerW - 40, 9, h.xp / h.xpNext, "#d4aa4f"); ctx.fillText("SKILL", margin + 10, margin + 72); pixelMeter(margin + 42, margin + 64, playerW - 52, 9, 1 - h.attackCd / cl.cooldown, "#78a9bc");
  const battleW = layout.mobile ? innerWidth - playerW - margin * 3 : layout.compact ? 150 : 180, bx = innerWidth - battleW - margin; hudPanel(bx, margin, battleW, 64); ctx.fillStyle = "#ffe2a0"; ctx.font = `bold ${layout.mobile ? 10 : 12}px Georgia, serif`; ctx.fillText(`WAVE ${state.wave}/${state.maxWaves}`, bx + 10, margin + 20); ctx.fillStyle = "#cbd8c2"; ctx.font = "9px Georgia, serif"; ctx.fillText(`${state.kills}/${state.totalEnemies} DEFEATED`, bx + 10, margin + 37); pixelMeter(bx + 10, margin + 43, battleW - 20, 10, state.kills / state.totalEnemies, "#79995d", state.maxWaves);
  const boss = state.enemies.find(e => e.boss && !e.dead); if (boss) { const w = Math.min(layout.mobile ? innerWidth - 14 : 460, innerWidth - 40), x = innerWidth / 2 - w / 2, y = layout.compact || innerWidth < 1150 ? 102 : margin; hudPanel(x, y, w, 43, "#b64d3f"); ctx.textAlign = "center"; ctx.fillStyle = "#ffcf8c"; ctx.font = "bold 11px Georgia, serif"; ctx.fillText("THE FLAME WARDEN", innerWidth / 2, y + 16); pixelMeter(x + 10, y + 23, w - 20, 10, boss.hp / boss.maxHp, "#d45b43", 8); ctx.textAlign = "left"; }
  if (state.hudHint > 0 && !layout.mobile) { const text = "WASD / ARROWS · MOVE     SPACE / CLICK · ABILITY", alpha = clamp(state.hudHint, 0, 1); ctx.globalAlpha = alpha; ctx.font = "bold 11px Georgia, serif"; const tw = ctx.measureText(text).width; hudPanel(innerWidth / 2 - tw / 2 - 12, innerHeight - 40, tw + 24, 28, "#756044"); ctx.fillStyle = "#fff0bd"; ctx.fillText(text, innerWidth / 2 - tw / 2, innerHeight - 21); ctx.globalAlpha = 1; }
  if (state.over) { ctx.fillStyle = "rgba(8,13,15,.72)"; ctx.fillRect(0, 0, innerWidth, innerHeight); const w = Math.min(620, innerWidth - 24), boxH = layout.mobile ? 155 : 210, x = innerWidth / 2 - w / 2, y = innerHeight / 2 - boxH / 2; pixelPanel(x, y, w, boxH, state.won ? "#d3a84f" : "#a84d45"); ctx.textAlign = "center"; ctx.fillStyle = state.won ? "#ffe08a" : "#ff9b91"; ctx.font = `bold ${layout.mobile ? 25 : 38}px Georgia, serif`; ctx.fillText(state.won ? "THE VALLEY IS SAFE" : "YOU FELL IN BATTLE", innerWidth / 2, y + (layout.mobile ? 62 : 82)); ctx.fillStyle = "#e5ddc8"; ctx.font = `${layout.mobile ? 13 : 16}px Georgia, serif`; ctx.fillText("Press R to return to the Hall of Heroes", innerWidth / 2, y + (layout.mobile ? 103 : 130)); ctx.textAlign = "left"; }
  else if (state.banner > 0 || state.waveDelay > 0) { const label = state.waveDelay > 0 ? "WAVE CLEARED" : state.wave === state.maxWaves ? "FINAL WAVE · THE FLAME WARDEN" : `WAVE ${state.wave}`; ctx.font = `bold ${layout.mobile ? 13 : 17}px Georgia, serif`; const w = Math.min(innerWidth - 20, Math.max(210, ctx.measureText(label).width + 42)), y = boss || layout.compact ? 152 : 92; hudPanel(innerWidth / 2 - w / 2, y, w, 40, "#d3a84f"); ctx.textAlign = "center"; ctx.fillStyle = "#ffe2a0"; ctx.fillText(label, innerWidth / 2, y + 26); ctx.textAlign = "left"; }
}

function loop(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); ctx.clearRect(0, 0, innerWidth, innerHeight); if (state.mode === "select") drawSelection(); else if (state.mode === "upgrade") drawUpgrade(); else { drawWorld(); drawUI(); } requestAnimationFrame(loop); }
addEventListener("resize", resize);
addEventListener("keydown", e => { keys.add(e.code); if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); if (state.mode === "select" && /^Digit[1-4]$/.test(e.code)) chooseClass(Object.keys(classes)[Number(e.code.at(-1)) - 1]); else if (state.mode === "upgrade" && /^Digit[1-3]$/.test(e.code)) chooseUpgrade(Number(e.code.at(-1)) - 1); else if (e.code === "Space") attack(); if (e.code === "KeyR" && state.over) reset(); });
addEventListener("keyup", e => keys.delete(e.code));
canvas.addEventListener("pointerdown", e => { if (state.mode === "select") { const r = selectionRects.find(r => e.offsetX >= r.x && e.offsetX <= r.x + r.w && e.offsetY >= r.y && e.offsetY <= r.y + r.h); if (r) chooseClass(r.id); } else if (state.mode === "upgrade") { const r = upgradeRects.find(r => e.offsetX >= r.x && e.offsetX <= r.x + r.w && e.offsetY >= r.y && e.offsetY <= r.y + r.h); if (r) chooseUpgrade(r.index); } else attack(); });

(async function start() { try { await Promise.all(Object.entries(paths).map(async ([key, path]) => images[key] = await loadImage(path))); resize(); buildTerrainPatterns(); reset(); document.querySelector("#loading").classList.add("hidden"); requestAnimationFrame(loop); } catch (err) { document.querySelector("#loading").textContent = "The assets could not be loaded. Run the game through a local server."; console.error(err); } })();
