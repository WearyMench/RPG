"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const A = "assets/Tiny Swords/";
const paths = {
  heroIdle: A + "Units/Blue Units/Warrior/Warrior_Idle.png",
  heroRun: A + "Units/Blue Units/Warrior/Warrior_Run.png",
  heroAttack: A + "Units/Blue Units/Warrior/Warrior_Attack1.png",
  enemyIdle: A + "Units/Red Units/Warrior/Warrior_Idle.png",
  enemyRun: A + "Units/Red Units/Warrior/Warrior_Run.png",
  enemyAttack: A + "Units/Red Units/Warrior/Warrior_Attack1.png",
  castle: A + "Buildings/Blue Buildings/Castle.png",
  redCastle: A + "Buildings/Red Buildings/Castle.png",
  tree1: A + "Decorations/Trees/Tree1.png",
  tree2: A + "Decorations/Trees/Tree2.png",
  rock1: A + "Decorations/Rocks/Rock1.png",
  rock2: A + "Decorations/Rocks/Rock2.png",
};

const images = {};
const WORLD = { w: 2600, h: 1800 };
const keys = new Set();
let state;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
}

function seeded(n) { const x = Math.sin(n * 999.31) * 43758.5453; return x - Math.floor(x); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function reset() {
  const enemies = Array.from({ length: 9 }, (_, i) => ({
    x: 1450 + seeded(i + 31) * 820, y: 260 + seeded(i + 91) * 1260,
    hp: 3, maxHp: 3, speed: 72 + seeded(i) * 18, attackCd: seeded(i) * .8,
    hurt: 0, dead: false, facing: -1, anim: seeded(i) * 4,
  }));
  state = {
    hero: { x: 430, y: 900, hp: 8, maxHp: 8, speed: 220, facing: 1, attack: 0, attackCd: 0, inv: 0, anim: 0 },
    enemies, camera: { x: 0, y: 0 }, time: 0, kills: 0, over: false, won: false,
    particles: [], message: "Derrota a los invasores del castillo rojo",
  };
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
}

function burst(x, y, color) {
  for (let i = 0; i < 8; i++) state.particles.push({ x, y, vx: (seeded(i + state.time) - .5) * 140, vy: -30 - seeded(i + 8 + state.time) * 90, life: .55, color });
}

function attack() {
  const h = state.hero;
  if (state.over || h.attackCd > 0) return;
  h.attack = .34; h.attackCd = .48;
  for (const e of state.enemies) {
    if (!e.dead && distance(h, e) < 118 && Math.sign(e.x - h.x || h.facing) === h.facing) {
      e.hp--; e.hurt = .18; e.x += h.facing * 35; burst(e.x, e.y - 30, "#ffd166");
      if (e.hp <= 0) { e.dead = true; state.kills++; burst(e.x, e.y, "#d1495b"); }
    }
  }
}

function update(dt) {
  const s = state, h = s.hero; s.time += dt;
  if (s.over) return;
  h.attack = Math.max(0, h.attack - dt); h.attackCd = Math.max(0, h.attackCd - dt); h.inv = Math.max(0, h.inv - dt);
  let dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  let dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  if (dx) h.facing = Math.sign(dx);
  if (h.attack <= 0) { h.x = clamp(h.x + dx * h.speed * dt, 90, WORLD.w - 90); h.y = clamp(h.y + dy * h.speed * dt, 120, WORLD.h - 80); }
  h.anim += dt * (dx || dy ? 10 : 6);

  for (const e of s.enemies) {
    if (e.dead) continue; e.attackCd -= dt; e.hurt = Math.max(0, e.hurt - dt);
    const d = distance(e, h), vx = h.x - e.x, vy = h.y - e.y;
    if (d < 510 && d > 78 && !e.hurt) { e.x += vx / d * e.speed * dt; e.y += vy / d * e.speed * dt; e.facing = Math.sign(vx) || e.facing; e.anim += dt * 8; }
    else e.anim += dt * 5;
    if (d < 86 && e.attackCd <= 0) {
      e.attackCd = 1.05;
      if (h.inv <= 0) { h.hp--; h.inv = .8; h.x -= (vx / (d || 1)) * 28; h.y -= (vy / (d || 1)) * 28; burst(h.x, h.y - 25, "#8ecae6"); }
    }
  }
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);
  if (h.hp <= 0) { s.over = true; s.won = false; }
  if (s.kills === s.enemies.length) { s.over = true; s.won = true; }
  s.camera.x += (clamp(h.x - innerWidth / 2, 0, Math.max(0, WORLD.w - innerWidth)) - s.camera.x) * Math.min(1, dt * 6);
  s.camera.y += (clamp(h.y - innerHeight / 2, 0, Math.max(0, WORLD.h - innerHeight)) - s.camera.y) * Math.min(1, dt * 6);
}

function sprite(img, x, y, frame, frames, facing = 1, size = 96) {
  const fw = img.width / frames, fh = img.height, scale = size / fh;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(facing, 1);
  ctx.drawImage(img, Math.floor(frame % frames) * fw, 0, fw, fh, -fw * scale / 2, -fh * scale, fw * scale, fh * scale);
  ctx.restore();
}

function ellipse(x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function bar(x, y, value, max, width = 58) { ctx.fillStyle = "#391f28"; ctx.fillRect(x - width / 2, y, width, 7); ctx.fillStyle = "#73c66b"; ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * value / max, 5); }

function drawWorld() {
  const c = state.camera; ctx.save(); ctx.translate(-Math.round(c.x), -Math.round(c.y));
  ctx.fillStyle = "#77a95c"; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  for (let y = 0; y < WORLD.h; y += 64) for (let x = 0; x < WORLD.w; x += 64) {
    const r = seeded(x * 2 + y * 7); ctx.fillStyle = r > .5 ? "#79ad5e" : "#74a657"; ctx.fillRect(x, y, 64, 64);
    if (r > .87) { ctx.fillStyle = "#9bc66f"; ctx.fillRect(x + 13, y + 18, 3, 7); ctx.fillRect(x + 18, y + 15, 3, 10); }
  }
  ctx.fillStyle = "#d6bd74"; ctx.beginPath(); ctx.moveTo(0, 820); ctx.bezierCurveTo(620, 700, 1070, 1050, 1540, 870); ctx.bezierCurveTo(1980, 700, 2260, 920, WORLD.w, 750); ctx.lineTo(WORLD.w, 990); ctx.bezierCurveTo(2200, 1060, 1900, 870, 1510, 1040); ctx.bezierCurveTo(1050, 1220, 600, 870, 0, 1030); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5089a6"; ctx.fillRect(0, 0, WORLD.w, 105); ctx.fillStyle = "rgba(255,255,255,.18)";
  for (let x = 20; x < WORLD.w; x += 110) ctx.fillRect(x + Math.sin(state.time + x) * 12, 48, 58, 4);

  // scenery sorted approximately by depth
  ctx.drawImage(images.castle, 235, 585, 320, 256); ctx.drawImage(images.redCastle, 2150, 555, 320, 256);
  for (let i = 0; i < 19; i++) {
    const x = 100 + seeded(i + 2) * 2380, y = 160 + seeded(i + 44) * 1420;
    if (Math.abs(y - 900) < 170 || (x > 2100 && y < 900)) continue;
    const img = i % 2 ? images.tree1 : images.tree2; const fw = img.width / 6;
    ctx.drawImage(img, (i % 6) * fw, 0, fw, img.height, x - 64, y - 128, 128, 128);
  }
  for (let i = 0; i < 16; i++) { const x = 90 + seeded(i + 101) * 2420, y = 180 + seeded(i + 201) * 1450; ctx.drawImage(i % 2 ? images.rock1 : images.rock2, x, y, 44, 44); }

  const actors = [...state.enemies.filter(e => !e.dead).map(e => ({ type: "enemy", o: e })), { type: "hero", o: state.hero }].sort((a, b) => a.o.y - b.o.y);
  for (const a of actors) {
    const o = a.o; ellipse(o.x, o.y - 4, 30, 11, "rgba(25,35,28,.28)");
    if (a.type === "hero") {
      if (o.inv > 0 && Math.floor(o.inv * 12) % 2) continue;
      const moving = keys.has("KeyW") || keys.has("KeyA") || keys.has("KeyS") || keys.has("KeyD") || keys.has("ArrowUp") || keys.has("ArrowDown") || keys.has("ArrowLeft") || keys.has("ArrowRight");
      const img = o.attack > 0 ? images.heroAttack : moving ? images.heroRun : images.heroIdle;
      sprite(img, o.x, o.y + 10, o.attack > 0 ? (1 - o.attack / .34) * 4 : o.anim, o.attack > 0 ? 4 : moving ? 6 : 8, o.facing, 112); bar(o.x, o.y - 116, o.hp, o.maxHp, 70);
    } else {
      const near = distance(o, state.hero) < 510; sprite(near ? images.enemyRun : images.enemyIdle, o.x, o.y + 8, o.anim, near ? 6 : 8, o.facing, 104); bar(o.x, o.y - 105, o.hp, o.maxHp);
    }
  }
  for (const p of state.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); } ctx.globalAlpha = 1;
  ctx.restore();
}

function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function drawUI() {
  ctx.fillStyle = "rgba(20,28,31,.82)"; roundRect(18, 18, 310, 94, 14);
  ctx.fillStyle = "#f7e7b2"; ctx.font = "800 20px system-ui"; ctx.fillText("CRÓNICAS DEL VALLE", 36, 48);
  ctx.font = "600 14px system-ui"; ctx.fillStyle = "#d9e5cf"; ctx.fillText(`Enemigos: ${state.kills} / ${state.enemies.length}`, 36, 75);
  ctx.fillText(`Vida: ${"♥".repeat(Math.max(0, state.hero.hp))}`, 36, 98);
  const text = innerWidth < 700 ? "Mover: WASD · Atacar: ESPACIO" : "WASD / Flechas para moverte   ·   ESPACIO o clic para atacar";
  ctx.font = "600 14px system-ui"; const tw = ctx.measureText(text).width; ctx.fillStyle = "rgba(20,28,31,.76)"; roundRect(innerWidth / 2 - tw / 2 - 18, innerHeight - 54, tw + 36, 36, 10); ctx.fillStyle = "#fff4cf"; ctx.fillText(text, innerWidth / 2 - tw / 2, innerHeight - 30);
  if (state.over) {
    ctx.fillStyle = "rgba(12,18,21,.68)"; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.textAlign = "center"; ctx.fillStyle = state.won ? "#ffe08a" : "#ff9b91"; ctx.font = "900 48px system-ui"; ctx.fillText(state.won ? "¡EL VALLE ESTÁ A SALVO!" : "HAS CAÍDO EN BATALLA", innerWidth / 2, innerHeight / 2 - 18);
    ctx.fillStyle = "white"; ctx.font = "600 18px system-ui"; ctx.fillText("Presiona R para volver a jugar", innerWidth / 2, innerHeight / 2 + 30); ctx.textAlign = "left";
  }
}

let last = performance.now();
function loop(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); ctx.clearRect(0, 0, innerWidth, innerHeight); drawWorld(); drawUI(); requestAnimationFrame(loop); }

addEventListener("resize", resize);
addEventListener("keydown", e => { keys.add(e.code); if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); if (e.code === "Space") attack(); if (e.code === "KeyR" && state.over) reset(); });
addEventListener("keyup", e => keys.delete(e.code));
canvas.addEventListener("pointerdown", attack);

(async function start() {
  try {
    await Promise.all(Object.entries(paths).map(async ([key, path]) => images[key] = await loadImage(path)));
    resize(); reset(); document.querySelector("#loading").classList.add("hidden"); requestAnimationFrame(loop);
  } catch (err) { document.querySelector("#loading").textContent = "No se pudieron cargar los assets. Ejecuta el juego con un servidor local."; console.error(err); }
})();
