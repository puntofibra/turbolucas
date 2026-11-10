/* TURBOLUCAS - un juego de FuturMovil. Motor de plataformas + nivel 1-1 (Estación orbital). */
(() => {
'use strict';
const VERSION = '0.3';
const T = 48, VH = 540;
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
let VW = 960, VHv = 540, SC = 1;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const TIER = Math.min(screen.width, screen.height) * DPR > 1250 ? 'hd' : 'sd';
const KS = TIER === 'hd' ? 1 : 2;          // factor para pasar de pixeles de imagen a "pixeles HD"
const LUCAS_K = 92 / 480;                   // unidades de mundo por pixel HD de Lucas
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
$('ver').textContent = 'v' + VERSION;

function resize() {
  cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
  SC = Math.min(cv.height / VH, cv.width / 720);
  VW = cv.width / SC; VHv = cv.height / SC;
  checkRot();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));

/* ---------- imagenes ---------- */
const NAMES = ['lucas-quieto', 'lucas-avanzando', 'lucas-saltando', 'lucas-cayendo', 'lucas-golpeado', 'lucas-celebrando', 'lucas-agachado',
  'enemigo-patrulla', 'enemigo-dron', 'enemigo-erizo', 'enemigo-torreta', 'enemigo-alien',
  'obj-chip', 'obj-engranaje', 'obj-caja', 'obj-checkpoint', 'obj-antena5g', 'portal',
  'poder-laser', 'poder-escudo', 'poder-turbo', 'poder-iman', 'poder-mini', 'poder-estrella5g'];
const IMG = {};
let loaded = 0;
function loadImages(done) {
  NAMES.forEach(n => {
    const im = new Image();
    im.onload = im.onerror = () => { if (++loaded === NAMES.length) done(); };
    im.src = 'img/' + TIER + '/' + n + '.webp';
    IMG[n] = im;
  });
}
$('logoImg').src = 'img/' + TIER + '/logo.webp';
$('heroImg').src = 'img/' + TIER + '/lucas-celebrando.webp';
// dibuja una imagen con altura h (unidades de mundo), anclada en (ax, ay) de la imagen
function spr(im, x, y, h, ax = 0.5, ay = 1, flip = false, rot = 0, sx = 1, sy = 1) {
  if (!im || !im.naturalWidth) return;
  const w = im.naturalWidth / im.naturalHeight * h;
  ctx.save(); ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(im, -w * ax, -h * ay, w, h);
  ctx.restore();
}

/* ---------- sonido (sintetizado, sin archivos) ---------- */
let AC = null, master = null, sndOn = true, musicT = null, mStep = 0, mNext = 0;
try { sndOn = localStorage.getItem('tl_snd') !== '0'; } catch (e) {}
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  master.gain.value = sndOn ? 0.55 : 0;
  return AC;
}
function tone(f0, f1, d, type = 'square', v = 0.12, delay = 0) {
  if (!AC || !sndOn) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
let noiseBuf = null;
function noise(d, v = 0.2, fc = 900, delay = 0) {
  if (!AC || !sndOn) return;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime + delay, s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = fc;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.02);
}
const SFX = {
  jump() { tone(220, 520, 0.16, 'square', 0.07); noise(0.14, 0.09, 1400); },
  chip() { tone(1319, 1319, 0.06, 'square', 0.07); tone(1760, 1760, 0.12, 'square', 0.07, 0.06); },
  gear() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.13, i * 0.07)); },
  stomp() { tone(300, 80, 0.14, 'square', 0.1); noise(0.1, 0.14, 700); },
  hurt() { tone(420, 90, 0.35, 'sawtooth', 0.12); },
  die() { [440, 392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.94, 0.16, 'square', 0.1, i * 0.13)); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.1, 'square', 0.08, i * 0.06)); },
  appear() { tone(300, 900, 0.25, 'triangle', 0.1); },
  bump() { tone(160, 110, 0.08, 'square', 0.1); },
  brk() { noise(0.22, 0.22, 1800); tone(180, 60, 0.15, 'square', 0.08); },
  laser() { tone(1500, 300, 0.13, 'sawtooth', 0.07); },
  shot() { tone(500, 200, 0.12, 'square', 0.05); },
  portal() { tone(200, 1400, 0.45, 'sine', 0.14); tone(1400, 300, 0.4, 'sine', 0.1, 0.4); },
  check() { tone(660, 660, 0.1, 'triangle', 0.12); tone(990, 990, 0.2, 'triangle', 0.12, 0.1); },
  life() { [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => tone(f, f, 0.1, 'square', 0.08, i * 0.08)); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, i === 6 ? 0.5 : 0.13, 'square', 0.1, i * 0.13)); },
  over() { [392, 370, 349, 262].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.13, i * 0.28)); }
};
// musica: bajo + arpegio en bucle
const BASS = [110, 110, 131, 131, 98, 98, 123, 123], ARP = [0, 3, 7, 12, 7, 3, 7, 12];
function musicTick() {
  if (!AC || !sndOn || state !== 'play' || paused) { mNext = 0; return; }
  if (!mNext || mNext < AC.currentTime) mNext = AC.currentTime + 0.05;
  const stepDur = 0.17 * (P && P.tStar > 0 ? 0.72 : 1);
  while (mNext < AC.currentTime + 0.25) {
    const bar = Math.floor(mStep / 8) % 8, root = BASS[bar], dl = mNext - AC.currentTime;
    if (mStep % 4 === 0) tone(root / 2, root / 2, stepDur * 3.2, 'triangle', 0.11, dl);
    tone(root * 2 * Math.pow(2, ARP[mStep % 8] / 12), root * 2 * Math.pow(2, ARP[mStep % 8] / 12), stepDur * 0.9, 'square', 0.022, dl);
    if (mStep % 2 === 1) noise(0.03, 0.03, 6000, dl);
    mStep++; mNext += stepDur;
  }
}
function startMusic() { if (!musicT) musicT = setInterval(musicTick, 80); }
function setSnd(on) {
  sndOn = on; try { localStorage.setItem('tl_snd', on ? '1' : '0'); } catch (e) {}
  if (master) master.gain.value = on ? 0.55 : 0;
  $('btnSnd').textContent = 'SONIDO: ' + (on ? 'SÍ' : 'NO'); $('btnMute').style.opacity = on ? 1 : 0.45;
}

/* ---------- entrada ---------- */
const K = { left: false, right: false, down: false, jump: false, act: false };
let jumpPressed = false, actPressed = false;
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyX: 'act', KeyK: 'act', ShiftLeft: 'act', ShiftRight: 'act', ControlLeft: 'act' };
function press(k, v) { if (v && !K[k]) { if (k === 'jump') jumpPressed = true; if (k === 'act') actPressed = true; } K[k] = v; }
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k) { press(k, true); e.preventDefault(); }
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'play') togglePause();
  if (e.code === 'Enter') { if (state === 'title') startGame(); else if ($('panel').classList.contains('on')) { const b = $('card').querySelector('button'); if (b) b.click(); } }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { press(k, false); e.preventDefault(); } });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
[['bL', 'left'], ['bR', 'right'], ['bD', 'down'], ['bA', 'jump'], ['bB', 'act']].forEach(([id, k]) => {
  const el = $(id);
  const on = e => { e.preventDefault(); press(k, true); el.classList.add('dn'); try { el.setPointerCapture(e.pointerId); } catch (x) {} };
  const off = e => { e.preventDefault(); press(k, false); el.classList.remove('dn'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
});
document.addEventListener('contextmenu', e => e.preventDefault());
const padPrev = { jump: false, act: false, left: false, right: false, down: false }; let padUsed = false;
function pollPad() {
  const gp = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).find(g => g);
  if (!gp) return;
  const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const now = { left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), down: ay > 0.55 || b(13), jump: b(0) || b(3), act: b(2) || b(1) || b(5) };
  for (const k in now) { if (now[k] !== padPrev[k]) { padUsed = true; press(k, now[k]); padPrev[k] = now[k]; } }
  if (b(9) && !padPrev.start && state === 'play') togglePause();
  if (b(0) && state === 'title') startGame();
  padPrev.start = b(9);
}

/* ---------- nivel 1-1: Estación orbital ---------- */
let L = null;
function buildLevel() {
  const W = 152, H = 16, g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(' '));
  const set = (x, y, c) => { g[y][x] = c; };
  const block = (x0, x1, y0, y1, c = '#') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const ground = (a, b) => block(a, b, 14, 15);
  const boxes = {}, chips = [], gears = [], ents = [], portals = [];
  const box = (x, y, what) => { set(x, y, '?'); boxes[x + ',' + y] = what; };
  const chip = (x, y) => chips.push({ x: x * T + T / 2, y: y * T + T / 2, t: Math.random() * 6 });
  const chipRow = (a, b, y) => { for (let x = a; x <= b; x++) chip(x, y); };
  const gear = (x, y) => gears.push({ x: x * T + T / 2, y: y * T + T / 2 });
  const en = (type, x, y, o = {}) => ents.push(Object.assign({ type, tx: x, ty: y }, o));

  // tramo 1: aprender a moverse
  ground(0, 24); chipRow(6, 9, 12);
  set(11, 10, 'B'); box(12, 10, 'chip'); set(13, 10, 'B'); box(14, 10, 'escudo'); set(15, 10, 'B');
  en('patrulla', 20, 13);
  // tramo 2: plataformas y primer engranaje
  ground(27, 45);
  block(30, 32, 12, 12, '='); chipRow(30, 32, 11);
  block(34, 36, 10, 10, '='); chipRow(34, 36, 9);
  block(31, 33, 8, 8, '='); gear(32, 7);
  en('alien', 40, 13);
  block(43, 43, 13, 13); block(44, 44, 12, 13); block(45, 45, 11, 13); chipRow(46, 48, 8);
  // tramo 3: dron, erizo y punto de control
  ground(49, 70);
  box(52, 10, 'mini');
  en('dron', 56, 11, { x0: 53, x1: 60 });
  set(58, 10, 'B'); box(59, 10, 'laser'); set(60, 10, 'B');
  en('erizo', 65, 13);
  const checkpoint = { x: 68 * T + T / 2, y: 14 * T, on: false };
  chipRow(71, 73, 10);
  // tramo 4: torreta, túnel secreto y portal
  ground(74, 125);
  box(76, 10, 'turbo'); en('alien', 78, 13);
  block(80, 85, 12, 13); en('torreta', 84, 11); chipRow(80, 82, 10);
  block(86, 87, 12, 12, '=');
  block(89, 96, 11, 12); chipRow(90, 92, 13); gear(93, 13); chipRow(94, 95, 13);
  chipRow(90, 95, 9); en('patrulla', 93, 10);
  portals.push({ x: 99 * T + T / 2, y: 14 * T - 46, tox: 104 * T + T / 2, toy: 5 * T - 90 });
  // zona secreta en el cielo
  block(103, 121, 5, 5);
  chipRow(106, 118, 4); chipRow(108, 116, 3); chipRow(110, 114, 2); gear(112, 1);
  portals.push({ x: 120 * T + T / 2, y: 5 * T - 46, tox: 124 * T, toy: 14 * T - 90 });
  // por abajo
  en('patrulla', 104, 13);
  set(107, 10, 'B'); box(108, 10, 'estrella'); set(109, 10, 'B');
  en('alien', 113, 13); en('dron', 117, 11, { x0: 114, x1: 121 });
  box(119, 10, 'iman');
  // tramo final
  chipRow(126, 128, 10);
  ground(129, 151);
  en('erizo', 134, 13);
  for (let i = 1; i <= 4; i++) block(139 + i, 139 + i, 14 - i, 13);
  chipRow(140, 143, 8);
  const goal = { x: 148 * T + T / 2, y: 14 * T };
  return { W, H, g, boxes, chips, gears, ents, portals, checkpoint, goal, spawn: { x: 3 * T, y: 14 * T } };
}
const tileAt = (tx, ty) => (tx < 0 || tx >= L.W) ? '#' : (ty < 0 || ty >= L.H) ? ' ' : L.g[ty][tx];
const isSolid = c => c === '#' || c === '?' || c === 'U' || c === 'B';
function collide(o) {
  const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(tx, ty))) return true;
  return false;
}
function moveEnt(o, dt) {
  o.hitL = o.hitR = o.hitHead = false;
  o.x += o.vx * dt;
  if (collide(o)) {
    if (o.vx > 0) { o.x = Math.floor((o.x + o.w) / T) * T - o.w - 0.01; o.hitR = true; }
    else { o.x = (Math.floor(o.x / T) + 1) * T + 0.01; o.hitL = true; }
  }
  const prevBottom = o.y + o.h;
  o.y += o.vy * dt; o.onGround = false;
  if (collide(o)) {
    if (o.vy > 0) { o.y = Math.floor((o.y + o.h) / T) * T - o.h - 0.01; o.onGround = true; }
    else { o.headTy = Math.floor(o.y / T); o.y = (o.headTy + 1) * T + 0.01; o.hitHead = true; }
    o.vy = 0;
  } else if (o.vy >= 0 && !o.drop) {
    const ty = Math.floor((o.y + o.h) / T), top = ty * T;
    if (prevBottom <= top + 0.5) {
      const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T);
      for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === '=') { o.y = top - o.h - 0.01; o.vy = 0; o.onGround = true; break; }
    }
  }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------- estado del juego ---------- */
let state = 'load', paused = false, P = null, cam = { x: 0, y: 0 }, time = 0, shake = 0;
let enemies = [], items = [], shots = [], parts = [], pops = [], bumps = [];
let G = { lives: 3, chips: 0, score: 0, gears: 0, deaths: 0, clock: 0 };
const ENEMY = {
  patrulla: { img: 'enemigo-patrulla', h: 66, w: 40, bh: 58, speed: 62, stomp: true, pts: 100 },
  alien: { img: 'enemigo-alien', h: 58, w: 48, bh: 46, speed: 30, stomp: true, pts: 100 },
  erizo: { img: 'enemigo-erizo', h: 56, w: 50, bh: 44, speed: 48, stomp: false, pts: 300 },
  dron: { img: 'enemigo-dron', h: 60, w: 46, bh: 40, speed: 80, stomp: true, pts: 200, fly: true },
  torreta: { img: 'enemigo-torreta', h: 64, w: 54, bh: 56, speed: 0, stomp: true, pts: 300 }
};
function newPlayer(x, y) {
  return { x: x - 20, y: y - 78, w: 40, h: 78, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jbuf: 0, crouch: false,
    power: null, shield: false, tTurbo: 0, tMagnet: 0, tStar: 0, inv: 0, dead: false, deadT: 0, win: false, winT: 0, idle: 0, sq: 0, tele: 0, drop: false, cool: 0 };
}
function spawnEnemies() {
  enemies = L.ents.map(e => {
    const d = ENEMY[e.type];
    const o = { type: e.type, d, w: d.w, h: d.bh, x: e.tx * T + (T - d.w) / 2, y: (e.ty + 1) * T - d.bh - 0.01, vx: -d.speed, vy: 0, dir: -1, dead: 0, t: Math.random() * 5, timer: 1.5 };
    if (d.fly) { o.x0 = e.x0 * T; o.x1 = e.x1 * T; o.by = e.ty * T; }
    return o;
  });
}
function resetLevel(full) {
  L = buildLevel();
  spawnEnemies(); items = []; shots = []; parts = []; pops = []; bumps = [];
  if (full) G = { lives: 3, chips: 0, score: 0, gears: 0, deaths: 0, clock: 0 };
  P = newPlayer(L.spawn.x, L.spawn.y);
  cam.x = 0; cam.y = L.H * T - VHv;
}
function setSize(p) {
  const bottom = p.y + p.h, cx = p.x + p.w / 2, mini = p.power === 'mini';
  const w = mini ? 24 : 40, h = mini ? 42 : (p.crouch ? 44 : 78);
  p.w = w; p.h = h; p.x = cx - w / 2; p.y = bottom - h;
}
function canStand(p) { const t = { x: p.x, y: p.y + p.h - 78, w: p.w, h: 78 }; return !collide(t); }

/* ---------- efectos ---------- */
function burst(x, y, n, col, sp = 160, life = 0.5, grav = 500, size = 3) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (0.3 + Math.random() * 0.7);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life, max: life, col, size: size * (0.6 + Math.random() * 0.8), grav }); }
}
function pop(x, y, txt, col = '#fff') { pops.push({ x, y, txt, col, t: 0 }); }
function addScore(n, x, y) { G.score += n; if (x !== undefined) pop(x, y, '+' + n, '#ffe27a'); }
function addChip(x, y) {
  G.chips++; G.score += 10; SFX.chip(); burst(x, y, 5, '#ffd23c', 90, 0.35, 0, 2.5);
  if (G.chips % 100 === 0) { G.lives++; SFX.life(); pop(x, y - 20, '+1 VIDA', '#35ff8a'); }
}

/* ---------- bloques ---------- */
function hitBlock(tx, ty) {
  const c = tileAt(tx, ty), cx = tx * T + T / 2, cy = ty * T;
  if (c === '?') {
    L.g[ty][tx] = 'U'; bumps.push({ tx, ty, t: 0 });
    const what = L.boxes[tx + ',' + ty] || 'chip';
    if (what === 'chip') { addChip(cx, cy - 20); parts.push({ x: cx, y: cy - 10, vx: 0, vy: -420, life: 0.45, max: 0.45, coin: true, grav: 1200, size: 1 }); }
    else { items.push({ kind: what, x: cx - 20, y: cy, w: 40, h: 40, rise: 0, t: 0 }); SFX.appear(); }
    knockAbove(tx, ty);
  } else if (c === 'B') {
    if (P.power === 'mini') { bumps.push({ tx, ty, t: 0 }); SFX.bump(); }
    else { L.g[ty][tx] = ' '; SFX.brk(); addScore(10); shake = 0.12;
      for (let i = 0; i < 8; i++) parts.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + 24 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 320, vy: -200 - Math.random() * 260, life: 0.9, max: 0.9, col: i % 2 ? '#5a6aa0' : '#8090c8', size: 7, grav: 1500, sqr: true }); }
    knockAbove(tx, ty);
  } else if (c === 'U' || c === '#') SFX.bump();
}
function knockAbove(tx, ty) {
  enemies.forEach(e => { if (!e.dead && e.x + e.w > tx * T && e.x < (tx + 1) * T && Math.abs(e.y + e.h - ty * T) < 6) killEnemy(e, 'fly'); });
}

/* ---------- jugador ---------- */
function hurt() {
  if (P.inv > 0 || P.dead || P.win || P.tStar > 0) return;
  if (P.shield) { P.shield = false; P.inv = 1.6; SFX.hurt(); burst(P.x + P.w / 2, P.y + P.h / 2, 16, '#29a8ff', 220); shake = 0.15; return; }
  if (P.power) { P.power = null; setSize(P); if (!canStand(P)) { P.crouch = true; setSize(P); } P.inv = 1.8; SFX.hurt(); burst(P.x + P.w / 2, P.y + P.h / 2, 16, '#c63cff', 220); shake = 0.15; return; }
  die();
}
function die() {
  if (P.dead) return;
  P.dead = true; P.deadT = 0; P.vy = -620; P.vx = 0; P.tTurbo = P.tMagnet = P.tStar = 0; P.shield = false; P.power = null;
  G.lives--; G.deaths++; SFX.die(); shake = 0.25;
}
function respawn() {
  const cp = L.checkpoint.on ? { x: L.checkpoint.x, y: L.checkpoint.y } : L.spawn;
  const keep = L.checkpoint.on;
  P = newPlayer(cp.x, cp.y); P.inv = 1.5;
  spawnEnemies(); shots = []; L.checkpoint.on = keep;
}
function updatePlayer(dt) {
  const p = P;
  if (p.dead) {
    p.deadT += dt; p.vy += 1800 * dt; p.y += p.vy * dt;
    if (p.deadT > 1.6) { if (G.lives <= 0) gameOver(); else respawn(); }
    return;
  }
  if (p.win) { p.winT += dt; p.vx = 0; p.vy += 2000 * dt; moveEnt(p, dt); if (p.winT > 2.2 && state === 'play') levelDone(); return; }
  p.inv = Math.max(0, p.inv - dt); p.tTurbo = Math.max(0, p.tTurbo - dt); p.tMagnet = Math.max(0, p.tMagnet - dt); p.tStar = Math.max(0, p.tStar - dt);
  p.tele = Math.max(0, p.tele - dt); p.cool = Math.max(0, p.cool - dt); p.sq = Math.max(0, p.sq - dt * 4);
  // agacharse
  const wantCrouch = K.down && p.onGround && p.power !== 'mini';
  if (wantCrouch && !p.crouch) { p.crouch = true; setSize(p); }
  else if (!wantCrouch && p.crouch && canStand(p)) { p.crouch = false; setSize(p); }
  // horizontal
  const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
  const max = (p.crouch ? 110 : 270) * (p.tStar > 0 ? 1.2 : 1) * (p.tTurbo > 0 ? 1.15 : 1);
  const acc = p.onGround ? 2200 : 1500;
  if (dir) { p.vx += dir * acc * dt; if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - 3000 * dt); p.face = dir; p.idle = 0; }
  else { const f = (p.onGround ? 2400 : 600) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; p.idle += dt; }
  // derrape
  if (p.onGround && dir && Math.sign(p.vx) !== dir && Math.abs(p.vx) > 120 && Math.random() < 0.5) parts.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: -dir * 60, vy: -40 - Math.random() * 60, life: 0.3, max: 0.3, col: '#9fb4ff', size: 3, grav: 0 });
  // salto
  p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt);
  p.jbuf = jumpPressed ? 0.12 : Math.max(0, p.jbuf - dt);
  p.drop = false;
  if (p.jbuf > 0 && p.coyote > 0) {
    if (K.down && onOneWay(p)) { p.drop = true; p.y += 4; p.jbuf = 0; p.coyote = 0; }
    else if (!p.crouch || canStand(p)) {
      if (p.crouch) { p.crouch = false; setSize(p); }
      p.vy = p.power === 'mini' ? -700 : -780; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.sq = 1; SFX.jump();
      burst(p.x + p.w / 2, p.y + p.h, 8, '#ffb347', 120, 0.3, 0, 3);
    }
  }
  if (!K.jump && p.vy < -260) p.vy = -260;               // salto corto si sueltas
  if (p.tTurbo > 0 && K.jump) p.vy = Math.max(p.vy - 3600 * dt, -330);   // turbo: volar
  p.vy = Math.min(p.vy + 2000 * dt, 900);
  const wasAir = !p.onGround, vyBefore = p.vy;
  moveEnt(p, dt);
  if (p.hitL || p.hitR) p.vx = 0;
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.onGround && wasAir && vyBefore > 250) { p.sq = -1; burst(p.x + p.w / 2, p.y + p.h, 6, '#9fb4ff', 90, 0.25, 0, 3); }
  if (p.hitHead) {
    const ty = p.headTy, c = Math.floor((p.x + p.w / 2) / T);
    const cand = [c, Math.floor(p.x / T), Math.floor((p.x + p.w - 0.01) / T)].find(tx => isSolid(tileAt(tx, ty)));
    if (cand !== undefined) hitBlock(cand, ty);
  }
  if (p.y > L.H * T + 120) die();
  // láser
  if (actPressed && p.power === 'laser' && p.cool <= 0 && shots.filter(s => s.mine).length < 3) {
    shots.push({ mine: true, x: p.x + p.w / 2 + p.face * 18, y: p.y + p.h * 0.45, vx: p.face * 720, vy: 0, w: 22, h: 6, life: 0.9 }); p.cool = 0.18; SFX.laser();
  }
  // chips, engranajes, objetos
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  for (const c of L.chips) {
    if (c.got) continue;
    if (p.tMagnet > 0) { const dx = cx - c.x, dy = cy - c.y, d = Math.hypot(dx, dy); if (d < 210 && d > 1) { c.x += dx / d * 520 * dt; c.y += dy / d * 520 * dt; } }
    if (Math.abs(c.x - cx) < p.w / 2 + 14 && Math.abs(c.y - cy) < p.h / 2 + 14) { c.got = true; addChip(c.x, c.y); }
  }
  for (const g of L.gears) if (!g.got && Math.abs(g.x - cx) < p.w / 2 + 20 && Math.abs(g.y - cy) < p.h / 2 + 20) { g.got = true; G.gears++; addScore(500, g.x, g.y - 20); SFX.gear(); burst(g.x, g.y, 24, '#3db8ff', 240, 0.7, 200, 4); }
  for (const it of items) if (!it.got && it.rise >= 1 && overlap(p, it)) { it.got = true; givePower(it.kind); }
  items = items.filter(i => !i.got);
  // punto de control, portal, meta
  const cp = L.checkpoint;
  if (!cp.on && Math.abs(cx - cp.x) < 30 && p.y + p.h > cp.y - 120) { cp.on = true; SFX.check(); pop(cp.x, cp.y - 90, 'PUNTO DE CONTROL', '#35ff8a'); burst(cp.x, cp.y - 60, 20, '#35ff8a', 200, 0.6, 0, 3); }
  if (p.tele <= 0) for (const po of L.portals) if (Math.abs(cx - po.x) < 26 && Math.abs(cy - po.y) < 44) {
    burst(po.x, po.y, 26, '#c63cff', 260, 0.6, 0, 4); SFX.portal();
    p.x = po.tox - p.w / 2; p.y = po.toy - p.h; p.vx = 0; p.vy = 0; p.tele = 1.2; p.inv = Math.max(p.inv, 0.8);
    burst(po.tox, po.toy - 30, 26, '#29e6ff', 260, 0.6, 0, 4); break;
  }
  if (cx > L.goal.x - 20) { p.win = true; p.winT = 0; p.vx = 0; p.crouch = false; setSize(p); SFX.win(); for (let i = 0; i < 5; i++) burst(L.goal.x, L.goal.y - 60 - i * 40, 16, ['#29e6ff', '#35ff8a', '#ffd23c', '#c63cff'][i % 4], 300, 1, 300, 4); }
}
function onOneWay(p) {
  const ty = Math.floor((p.y + p.h + 2) / T);
  for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (isSolid(tileAt(tx, ty))) return false;
  for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (tileAt(tx, ty) === '=') return true;
  return false;
}
const POWER_NAME = { laser: 'LÁSER', escudo: 'ESCUDO', turbo: 'TURBO', iman: 'IMÁN', mini: 'MINI LUCAS', estrella: 'ESTRELLA 5G' };
function givePower(k) {
  const p = P; SFX.power(); addScore(200); pop(p.x + p.w / 2, p.y - 16, POWER_NAME[k], '#29e6ff');
  burst(p.x + p.w / 2, p.y + p.h / 2, 20, '#29e6ff', 240, 0.6, 0, 3);
  if (k === 'escudo') p.shield = true;
  else if (k === 'turbo') p.tTurbo = 7;
  else if (k === 'iman') p.tMagnet = 14;
  else if (k === 'estrella') p.tStar = 9;
  else { if (p.power === 'mini' && k !== 'mini') { p.power = k; setSize(p); if (collide(p)) { p.crouch = true; setSize(p); } } else { p.power = k; p.crouch = false; setSize(p); } }
}

/* ---------- enemigos y disparos ---------- */
function killEnemy(e, how) {
  if (e.dead) return;
  e.dead = 0.001; e.how = how; e.vy = how === 'fly' ? -420 : 0; e.vx = how === 'fly' ? (Math.random() - 0.5) * 200 : 0;
  addScore(e.d.pts, e.x + e.w / 2, e.y - 6); SFX.stomp();
  burst(e.x + e.w / 2, e.y + e.h / 2, 14, e.type === 'alien' ? '#35ff8a' : '#ff5a4a', 220, 0.5, 400, 3.5);
}
function updateEnemies(dt) {
  const p = P;
  for (const e of enemies) {
    if (e.dead) { e.dead += dt; if (e.how === 'fly') { e.vy += 1600 * dt; e.y += e.vy * dt; e.x += e.vx * dt; } continue; }
    if (Math.abs(e.x - p.x) > VW * 1.1 + 200) continue;       // dormido si está lejos
    e.t += dt;
    if (e.d.fly) {
      e.x += e.dir * e.d.speed * dt; if (e.x < e.x0) e.dir = 1; if (e.x > e.x1) e.dir = -1;
      e.y = e.by + Math.sin(e.t * 2.2) * 26;
    } else if (e.type === 'torreta') {
      e.dir = p.x < e.x ? -1 : 1; e.timer -= dt;
      if (e.timer <= 0 && Math.abs(p.x - e.x) < 620 && Math.abs(p.y - e.y) < 260) {
        e.timer = 2.3; shots.push({ mine: false, x: e.x + e.w / 2 + e.dir * 34, y: e.y + 14, vx: e.dir * 250, vy: 0, w: 14, h: 14, life: 3.2 }); SFX.shot();
        burst(e.x + e.w / 2 + e.dir * 34, e.y + 18, 6, '#ff9a3c', 100, 0.25, 0, 3);
      }
    } else {
      e.vx = e.dir * e.d.speed; e.vy = Math.min(e.vy + 2000 * dt, 900);
      moveEnt(e, dt);
      if (e.hitL) e.dir = 1; if (e.hitR) e.dir = -1;
      if (e.onGround) { const ax = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, c = tileAt(Math.floor(ax / T), Math.floor((e.y + e.h + 4) / T)); if (!isSolid(c) && c !== '=') e.dir = -e.dir; }
      if (e.y > L.H * T + 100) e.dead = 9;
    }
    if (!p.dead && !p.win && overlap(p, e)) {
      if (p.tStar > 0) killEnemy(e, 'fly');
      else if (e.d.stomp && p.vy > 60 && p.y + p.h - p.vy * dt * 1.5 <= e.y + e.h * 0.6) {
        killEnemy(e, 'squish'); p.vy = K.jump ? -700 : -430; p.y = e.y - p.h - 1; p.sq = 1;
      } else hurt();
    }
  }
  enemies = enemies.filter(e => !e.dead || e.dead < (e.how === 'fly' ? 2 : 0.45));
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (isSolid(tileAt(Math.floor(s.x / T), Math.floor(s.y / T)))) { s.life = 0; burst(s.x, s.y, 5, s.mine ? '#ff4a6a' : '#ff9a3c', 100, 0.2, 0, 2.5); continue; }
    const r = { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
    if (s.mine) { for (const e of enemies) if (!e.dead && overlap(r, e)) { killEnemy(e, 'fly'); s.life = 0; break; } }
    else if (!p.dead && overlap(r, p)) { s.life = 0; if (p.tStar <= 0) hurt(); }
  }
  shots = shots.filter(s => s.life > 0);
}

/* ---------- bucle ---------- */
function update(dt) {
  time += dt;
  if (state === 'title') { cam.x = (Math.sin(time * 0.07) * 0.5 + 0.5) * Math.max(0, L.W * T - VW); cam.y = L.H * T - VHv; }
  if (state === 'play') {
    G.clock += dt;
    updatePlayer(dt);
    if (state !== 'play') return;
    updateEnemies(dt);
    for (const it of items) { it.t += dt; if (it.rise < 1) { it.rise = Math.min(1, it.rise + dt * 2.5); it.y -= 46 * dt * 2.5; }
      else if (it.t > 0.8 && !P.dead) { const dx = P.x + P.w / 2 - (it.x + 20), dy = P.y + P.h / 2 - (it.y + 20), d = Math.hypot(dx, dy) || 1, v = Math.min(760, 220 + (it.t - 0.8) * 1100); it.x += dx / d * v * dt; it.y += dy / d * v * dt; } }
    const p = P;
    const tx = p.x + p.w / 2 - VW * 0.4 + p.face * 50, ty = p.y + p.h - VHv * 0.7;
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    cam.x = Math.max(0, Math.min(L.W * T - VW, cam.x)); cam.y = Math.max(Math.min(0, L.H * T - VHv), Math.min(L.H * T - VHv, cam.y));
  }
  for (const q of parts) { q.life -= dt; q.vy += (q.grav || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  parts = parts.filter(q => q.life > 0);
  for (const q of pops) q.t += dt; pops = pops.filter(q => q.t < 1);
  for (const b of bumps) b.t += dt; bumps = bumps.filter(b => b.t < 0.2);
  shake = Math.max(0, shake - dt);
  jumpPressed = false; actPressed = false;
}

/* ---------- dibujo ---------- */
const STARS = []; for (let i = 0; i < 160; i++) STARS.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, l: 1 + (i % 3), tw: Math.random() * 6 });
const TOWERS = []; { let x = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) { const w = 60 + rnd() * 120, h = 80 + rnd() * 260; TOWERS.push({ x, w, h, l: i % 2, win: Math.floor(rnd() * 1e6) }); x += w + 40 + rnd() * 160; } }
// la luna se comparte con Leo con Lucas (mismo dominio); se reduce una vez y se le hornea el brillo
let MOON = null;
(() => {
  const im = new Image();
  im.onload = () => { try {
    const q = im.naturalWidth / 256, bx = 46 * q, by = 32 * q, bw = 163 * q, bh = 183 * q;
    const S = TIER === 'hd' ? 560 : 340, w = Math.round(S * bw / bh), pad = Math.round(S * 0.42), f = S / 156;
    const mk = (b, a) => { const c = document.createElement('canvas'); c.width = w + pad * 2; c.height = S + pad * 2; const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      [[b[2], 'rgba(200,225,255,' + a[2] + ')'], [b[1], 'rgba(255,255,255,' + a[1] + ')'], [b[0], 'rgba(255,255,255,' + a[0] + ')']].forEach(([bl, col]) => { x.shadowColor = col; x.shadowBlur = bl * f; x.drawImage(im, bx, by, bw, bh, pad, pad, w, S); });
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.drawImage(im, bx, by, bw, bh, pad, pad, w, S); return c; };
    MOON = { lo: mk([6, 18, 38], [0.95, 0.75, 0.55]), hi: mk([9, 26, 54], [1, 0.9, 0.7]), w, h: S, pad };
  } catch (e) {} };
  im.src = '/leoconlucas/img/luna.png';
})();
const NEB = [{ x: 150, y: 0.25, r: 260, c: '198,60,255' }, { x: 700, y: 0.55, r: 320, c: '41,120,255' }, { x: 1250, y: 0.2, r: 240, c: '53,255,190' }, { x: 1700, y: 0.5, r: 300, c: '255,70,160' }];
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, VHv);
  g.addColorStop(0, '#05071a'); g.addColorStop(0.6, '#0d1036'); g.addColorStop(1, '#241046');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
  for (const s of STARS) {
    const px = ((s.x * 1400 - cam.x * 0.04 * s.l) % 1400 + 1400) % 1400; if (px > VW) continue;
    ctx.globalAlpha = 0.45 + 0.45 * Math.sin(time * 1.5 + s.tw); ctx.fillStyle = s.l === 3 ? '#bfe8ff' : '#fff';
    ctx.fillRect(px, s.y * VHv * 0.9, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  for (const n of NEB) {
    const nx = ((n.x - cam.x * 0.03) % 2200 + 2200) % 2200 - 320, ny = n.y * VHv; if (nx - n.r > VW) continue;
    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r); ng.addColorStop(0, 'rgba(' + n.c + ',.17)'); ng.addColorStop(1, 'rgba(' + n.c + ',0)');
    ctx.fillStyle = ng; ctx.fillRect(nx - n.r, ny - n.r, n.r * 2, n.r * 2);
  }
  // luna (la de Leo con Lucas, con su brillo blanco que late) o, si no carga, el planeta
  const px = VW * 0.78 - cam.x * 0.02, py = VHv * 0.25;
  if (MOON) {
    const pu = 0.5 - 0.5 * Math.cos(time * 6.283 / 3), fl = 0.5 - 0.5 * Math.cos(time * 6.283 / 4), hm = 172, u = hm / MOON.h;
    ctx.globalCompositeOperation = 'lighter';
    const hr = hm * 0.5 * (1.5 + 0.22 * pu) * 1.25, hg = ctx.createRadialGradient(px, py, 0, px, py, hr);
    hg.addColorStop(0, 'rgba(255,255,255,' + (0.42 - 0.08 * pu) + ')'); hg.addColorStop(0.45, 'rgba(220,235,255,.2)'); hg.addColorStop(0.75, 'rgba(200,225,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(px, py, hr, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(px, py - 8 * fl); ctx.rotate(0.07 * fl);
    const dw = (MOON.w + MOON.pad * 2) * u, dh = (MOON.h + MOON.pad * 2) * u;
    ctx.drawImage(MOON.lo, -dw / 2, -dh / 2, dw, dh);
    ctx.globalAlpha = pu; ctx.drawImage(MOON.hi, -dw / 2, -dh / 2, dw, dh); ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    const r = 74, pg = ctx.createRadialGradient(px - 24, py - 26, 8, px, py, r);
    pg.addColorStop(0, '#7fe9ff'); pg.addColorStop(0.5, '#3d6bff'); pg.addColorStop(1, '#2a1670');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(198,60,255,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, py, r * 1.55, r * 0.34, -0.35, 0, 6.283); ctx.stroke();
  }
  // estructuras lejanas de la estación
  for (let l = 0; l < 2; l++) {
    const par = l ? 0.38 : 0.2, base = VHv - (l ? 0 : 40) + (L.H * T - VHv - cam.y) * par * 0.4;
    ctx.fillStyle = l ? '#161d44' : '#10153a';
    for (const t of TOWERS) { if (t.l !== l) continue;
      const x = t.x - cam.x * par; if (x > VW || x + t.w < 0) continue;
      ctx.fillRect(x, base - t.h, t.w, t.h + 60);
      ctx.fillRect(x + t.w * 0.2, base - t.h - 14, t.w * 0.6, 14);
      if (t.win & 1) { ctx.fillRect(x + t.w / 2 - 1.5, base - t.h - 60, 3, 50); ctx.fillStyle = (Math.sin(time * 3 + t.x) > 0) ? '#ff4a5a' : '#5a1a2a'; ctx.fillRect(x + t.w / 2 - 3, base - t.h - 64, 6, 6); }
      ctx.fillStyle = l ? 'rgba(90,110,200,.35)' : 'rgba(70,80,170,.3)';
      for (let yy = base - t.h + 8; yy < base; yy += 46) ctx.fillRect(x, yy, t.w, 2);
      ctx.fillStyle = l ? 'rgba(41,230,255,.5)' : 'rgba(198,60,255,.4)';
      for (let k = 0; k < 6; k++) if ((t.win >> k) & 1) ctx.fillRect(x + 10 + (k % 3) * (t.w - 26) / 2, base - t.h + 16 + Math.floor(k / 3) * 34 + ((t.win >> (k + 6)) % 3) * 20, 6, 10);
      ctx.fillStyle = l ? '#161d44' : '#10153a';
    }
  }
  const fg = ctx.createLinearGradient(0, VHv * 0.55, 0, VHv); fg.addColorStop(0, 'rgba(60,30,120,0)'); fg.addColorStop(1, 'rgba(70,40,150,.38)');
  ctx.fillStyle = fg; ctx.fillRect(0, VHv * 0.55, VW, VHv * 0.45);
}
function drawTiles() {
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T));
  const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(L.H - 1, Math.floor((cam.y + VHv) / T));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = L.g[ty][tx]; if (c === ' ') continue;
    const x = tx * T; let y = ty * T;
    const b = bumps.find(q => q.tx === tx && q.ty === ty); if (b) y -= Math.sin(b.t / 0.2 * Math.PI) * 10;
    if (c === '#') {
      const top = tileAt(tx, ty - 1) !== '#';
      ctx.fillStyle = top ? '#1c2448' : '#141a38'; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.fillStyle = top ? '#2a3568' : '#1e264e'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
      if ((tx * 5 + ty * 11) % 7 === 0) { ctx.fillStyle = 'rgba(41,230,255,.55)'; ctx.fillRect(x + 14, y + 20, 12, 3); }
      if ((tx * 3 + ty * 7) % 11 === 0) { ctx.fillStyle = (Math.sin(time * 4 + tx) > 0) ? '#35ff8a' : '#1a5a3a'; ctx.fillRect(x + 32, y + 32, 5, 5); }
      ctx.fillStyle = '#1c2448'; ctx.fillRect(x + ((tx * 7 + ty * 3) % 2 ? 22 : 30), y + 3, 2, T - 6);
      ctx.fillStyle = '#4a5898'; ctx.fillRect(x + 7, y + 7, 3, 3); ctx.fillRect(x + T - 10, y + T - 10, 3, 3);
      if (top) { ctx.fillStyle = '#3c4a8c'; ctx.fillRect(x, y, T + 0.5, 9); ctx.fillStyle = 'rgba(41,230,255,.28)'; ctx.fillRect(x, y - 2, T + 0.5, 6); ctx.fillStyle = '#29e6ff'; ctx.fillRect(x, y, T + 0.5, 2.5); }
    } else if (c === '=') {
      ctx.fillStyle = '#2c386e'; ctx.fillRect(x, y, T + 0.5, 14); ctx.fillStyle = '#1c2448'; ctx.fillRect(x + 4, y + 14, 6, 6); ctx.fillRect(x + T - 10, y + 14, 6, 6);
      ctx.fillStyle = 'rgba(53,255,138,.28)'; ctx.fillRect(x, y - 2, T + 0.5, 6); ctx.fillStyle = '#35ff8a'; ctx.fillRect(x, y, T + 0.5, 2.5);
    } else if (c === 'B') {
      ctx.fillStyle = '#3a4880'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#5868a8'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
      ctx.strokeStyle = '#3a4880'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + T - 6, y + T - 6); ctx.moveTo(x + T - 6, y + 6); ctx.lineTo(x + 6, y + T - 6); ctx.stroke();
      ctx.fillStyle = '#9fb0e6'; ctx.fillRect(x + 5, y + 5, 3, 3); ctx.fillRect(x + T - 8, y + 5, 3, 3); ctx.fillRect(x + 5, y + T - 8, 3, 3); ctx.fillRect(x + T - 8, y + T - 8, 3, 3);
    } else if (c === 'U') {
      ctx.fillStyle = '#20253c'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#343b58'; ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      ctx.fillStyle = '#20253c'; ctx.fillRect(x + 12, y + 12, T - 24, T - 24);
    } else if (c === '?') {
      const pu = 1 + Math.sin(time * 4 + tx) * 0.03;
      ctx.fillStyle = 'rgba(255,210,60,.16)'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 34, 0, 6.283); ctx.fill();
      spr(IMG['obj-caja'], x + T / 2, y + T / 2, 56 * pu, 0.5, 0.5);
    }
  }
}
// posición de las 3 bocas de los cañones en cada pose (píxeles HD desde el ancla y desde abajo)
const CAN = { 'lucas-quieto': [[-61, 14], [-7.5, 0], [45.5, 15]], 'lucas-avanzando': [[-61.7, 14], [-7.7, 0], [45.3, 15]], 'lucas-saltando': [[-60, 14], [-6, 0], [46.5, 14]],
  'lucas-cayendo': [[-70, 14], [-16, 0], [37, 15]], 'lucas-golpeado': [[-70, 14], [-16, 0], [37, 15]], 'lucas-celebrando': [[-60, 14], [-6.5, 0], [46.5, 14]], 'lucas-agachado': [[-61, 5], [-7.5, 0], [45.5, 5]] };
function flame(x, y, len, w, seed) {
  const fl = 0.8 + 0.2 * Math.sin(time * 47 + seed * 3.1) + 0.12 * Math.sin(time * 83 + seed * 7.7);
  const ll = len * fl, sway = Math.sin(time * 31 + seed * 5) * w * 0.25, gr = ll * 0.8 + w;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y + ll * 0.35, 0, x, y + ll * 0.35, gr);
  g.addColorStop(0, 'rgba(255,140,40,.42)'); g.addColorStop(1, 'rgba(255,70,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + ll * 0.35, gr, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const layer = (ww, l2, col, sw) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ww / 2, y);
    ctx.bezierCurveTo(x - ww * 0.72, y + l2 * 0.38, x - ww * 0.18 + sw, y + l2 * 0.78, x + sw, y + l2);
    ctx.bezierCurveTo(x + ww * 0.18 + sw, y + l2 * 0.78, x + ww * 0.72, y + l2 * 0.38, x + ww / 2, y); ctx.closePath(); ctx.fill(); };
  layer(w * 1.1, ll, 'rgba(255,74,24,.82)', sway); layer(w * 0.82, ll * 0.76, 'rgba(255,176,44,.95)', sway * 0.7); layer(w * 0.48, ll * 0.5, 'rgba(255,248,214,.98)', sway * 0.4);
}
const ANCH = { 'lucas-quieto': 0.5, 'lucas-avanzando': 0.47, 'lucas-saltando': 0.44, 'lucas-cayendo': 0.5, 'lucas-golpeado': 0.5, 'lucas-celebrando': 0.5, 'lucas-agachado': 0.5 };
function drawPlayer() {
  const p = P; if (!p) return;
  if (p.inv > 0 && !p.dead && Math.floor(time * 18) % 2) return;
  let pose = 'lucas-quieto';
  if (p.dead) pose = 'lucas-golpeado'; else if (p.win) pose = 'lucas-celebrando'; else if (p.inv > 1.2) pose = 'lucas-golpeado';
  else if (p.crouch) pose = 'lucas-agachado'; else if (!p.onGround) pose = p.vy < 0 ? 'lucas-saltando' : 'lucas-cayendo';
  else if (Math.abs(p.vx) > 40) pose = 'lucas-avanzando';
  const im = IMG[pose], mini = p.power === 'mini' ? 0.55 : 1;
  const k = LUCAS_K * KS * mini, h = (im.naturalHeight || 240) * k;
  const cx = p.x + p.w / 2, hover = p.dead ? 0 : (p.onGround ? 3 + Math.sin(time * 6) * 1.6 : 0), by = p.y + p.h - hover;
  const lean = p.dead ? p.deadT * 5 : (pose === 'lucas-avanzando' ? 0.06 * p.face : 0);
  const sx = (1 - p.sq * 0.12) * (p.crouch ? 0.9 : 1), sy = (1 + p.sq * 0.14) * (p.crouch ? 0.72 : 1);
  // llamas de los 3 propulsores
  if (!p.dead) {
    const fl = p.win ? 14 : p.tTurbo > 0 && K.jump ? 64 : !p.onGround ? (p.vy < 0 ? 48 : 20) : (Math.abs(p.vx) > 40 ? 17 : 12);
    const fs = p.face < 0 ? -1 : 1, hk = LUCAS_K * mini, mouths = CAN[pose].map(o => [cx + fs * o[0] * hk * sx, by - o[1] * hk * sy - 2.5 * mini]);
    if (p.onGround) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,130,40,' + (0.2 + 0.08 * Math.sin(time * 40)) + ')'; ctx.beginPath(); ctx.ellipse(mouths[1][0], p.y + p.h + 1, 30 * mini, 5 * mini, 0, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    mouths.forEach((m, i) => flame(m[0], m[1], fl * mini * (i === 1 ? 1.1 : 1), 9 * mini, i + 1));
    if (p.onGround && Math.abs(p.vx) > 150 && Math.random() < 0.35) parts.push({ x: cx - p.face * 14, y: p.y + p.h, vx: -p.face * (40 + Math.random() * 80), vy: -20 - Math.random() * 70, life: 0.28, max: 0.28, col: Math.random() < 0.5 ? '#ffb347' : '#fff2c0', size: 2.2, grav: 300 });
    if (!p.onGround && p.vy < -100 && Math.random() < 0.7) { const m = mouths[Math.floor(Math.random() * 3)]; parts.push({ x: m[0] + (Math.random() - 0.5) * 6, y: m[1] + 20 + Math.random() * 20, vx: (Math.random() - 0.5) * 50, vy: 140 + Math.random() * 140, life: 0.32, max: 0.32, col: Math.random() < 0.6 ? '#ff9a3c' : '#ffe08a', size: 2.6, grav: 0 }); }
  }
  if (p.tStar > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = 'hsl(' + (time * 400 % 360) + ',100%,60%)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h / 2, p.w * 1.05, p.h * 0.72, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    if (Math.random() < 0.6) parts.push({ x: cx + (Math.random() - 0.5) * 40, y: p.y + Math.random() * p.h, vx: 0, vy: -30, life: 0.5, max: 0.5, col: 'hsl(' + Math.random() * 360 + ',100%,65%)', size: 3.5, grav: 0 }); }
  spr(im, cx, by, h, ANCH[pose], 1, p.face < 0, lean, sx, sy);
  if (p.shield) { ctx.strokeStyle = 'rgba(60,180,255,' + (0.6 + Math.sin(time * 8) * 0.2) + ')'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(60,160,255,.14)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h / 2 - 4, p.w * 1.15, p.h * 0.7, 0, 0, 6.283); ctx.fill(); ctx.stroke(); }
  if (p.tMagnet > 0) { ctx.strokeStyle = 'rgba(198,60,255,' + (0.25 + 0.2 * Math.sin(time * 10)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, p.y + p.h / 2, 60 + (time * 80 % 40), 0, 6.283); ctx.stroke(); }
}
function drawWorld() {
  ctx.save();
  const shx = shake > 0 ? (Math.random() - 0.5) * 10 * shake * 4 : 0, shy = shake > 0 ? (Math.random() - 0.5) * 10 * shake * 4 : 0;
  ctx.translate(-Math.round(cam.x * SC) / SC + shx, -Math.round(cam.y * SC) / SC + shy);
  const vis = x => x > cam.x - 150 && x < cam.x + VW + 150;
  // portales
  for (const po of L.portals) if (vis(po.x)) {
    const pu = 0.5 + 0.5 * Math.sin(time * 5);
    const g = ctx.createRadialGradient(po.x, po.y, 6, po.x, po.y, 70); g.addColorStop(0, 'rgba(198,60,255,' + (0.5 + pu * 0.3) + ')'); g.addColorStop(1, 'rgba(198,60,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(po.x, po.y, 70, 0, 6.283); ctx.fill();
    spr(IMG.portal, po.x, po.y, 92, 0.5, 0.5);
    if (Math.random() < 0.3) parts.push({ x: po.x + (Math.random() - 0.5) * 60, y: po.y + (Math.random() - 0.5) * 60, vx: 0, vy: -40, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#c63cff' : '#29e6ff', size: 2.5, grav: 0 });
  }
  // punto de control y meta
  const cp = L.checkpoint;
  if (vis(cp.x)) { if (cp.on) { ctx.fillStyle = 'rgba(53,255,138,' + (0.25 + 0.15 * Math.sin(time * 6)) + ')'; ctx.beginPath(); ctx.arc(cp.x, cp.y - 78, 26, 0, 6.283); ctx.fill(); } ctx.globalAlpha = cp.on ? 1 : 0.7; spr(IMG['obj-checkpoint'], cp.x, cp.y, 84); ctx.globalAlpha = 1; }
  if (vis(L.goal.x)) { const g = ctx.createRadialGradient(L.goal.x, L.goal.y - 150, 4, L.goal.x, L.goal.y - 150, 90); g.addColorStop(0, 'rgba(41,230,255,.45)'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.goal.x, L.goal.y - 150, 90, 0, 6.283); ctx.fill(); spr(IMG['obj-antena5g'], L.goal.x, L.goal.y, 250); }
  drawTiles();
  // chips y engranajes
  for (const c of L.chips) if (!c.got && vis(c.x)) { const s = Math.cos(time * 4 + c.t); spr(IMG['obj-chip'], c.x, c.y + Math.sin(time * 3 + c.t) * 3, 26, 0.5, 0.5, false, 0, Math.abs(s) * 0.85 + 0.15, 1); }
  for (const g of L.gears) if (!g.got && vis(g.x)) { ctx.fillStyle = 'rgba(61,184,255,.22)'; ctx.beginPath(); ctx.arc(g.x, g.y, 30, 0, 6.283); ctx.fill(); spr(IMG['obj-engranaje'], g.x, g.y + Math.sin(time * 2.5) * 4, 40, 0.5, 0.5, false, time * 1.2); }
  const PIMG = { laser: 'poder-laser', escudo: 'poder-escudo', turbo: 'poder-turbo', iman: 'poder-iman', mini: 'poder-mini', estrella: 'poder-estrella5g' };
  for (const it of items) { ctx.fillStyle = 'rgba(41,230,255,.2)'; ctx.beginPath(); ctx.arc(it.x + 20, it.y + 20, 30, 0, 6.283); ctx.fill(); spr(IMG[PIMG[it.kind]], it.x + 20, it.y + 20 + Math.sin(it.t * 4) * 3, 44, 0.5, 0.5); }
  // enemigos
  for (const e of enemies) {
    if (!vis(e.x)) continue;
    const cx = e.x + e.w / 2, by = e.y + e.h;
    if (e.dead) { if (e.how === 'squish') spr(IMG[e.d.img], cx, by, e.d.h, 0.5, 1, e.dir > 0, 0, 1.25, 0.25); else spr(IMG[e.d.img], cx, by - e.d.h / 2, e.d.h, 0.5, 0.5, e.dir > 0, e.dead * 9); continue; }
    const wob = e.d.fly || e.type === 'torreta' ? 0 : Math.sin(e.t * 9) * 0.04;
    spr(IMG[e.d.img], cx, by + (e.type === 'alien' ? 4 : 2), e.d.h, 0.5, 1, e.dir > 0, wob, 1, e.type === 'alien' ? 1 + Math.sin(e.t * 5) * 0.05 : 1);
  }
  drawPlayer();
  // disparos
  ctx.globalCompositeOperation = 'lighter';
  for (const s of shots) {
    if (s.mine) { ctx.fillStyle = 'rgba(255,60,90,.4)'; ctx.fillRect(s.x - 18, s.y - 6, 36, 12); ctx.fillStyle = '#ff6a8a'; ctx.fillRect(s.x - 12, s.y - 3, 24, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 9, s.y - 1, 18, 2); }
    else { ctx.fillStyle = 'rgba(255,140,40,.4)'; ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffb24a'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 6.283); ctx.fill(); }
  }
  for (const q of parts) {
    if (q.coin) continue; if (q.sqr) continue;
    ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.283); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for (const q of parts) {
    if (q.coin) spr(IMG['obj-chip'], q.x, q.y, 28, 0.5, 0.5, false, 0, Math.abs(Math.cos(q.life * 20)), 1);
    else if (q.sqr) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size, q.y - q.size, q.size * 2, q.size * 2); ctx.globalAlpha = 1; }
  }
  ctx.font = '800 15px system-ui,sans-serif'; ctx.textAlign = 'center';
  for (const q of pops) { ctx.globalAlpha = 1 - q.t; ctx.fillStyle = '#05071a'; ctx.fillText(q.txt, q.x + 1.5, q.y - q.t * 44 + 1.5); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y - q.t * 44); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawHUD() {
  const pad = 14, s = Math.max(1, Math.min(1.25, VW / 900));
  ctx.save(); ctx.scale(s, s);
  const w = VW / s;
  ctx.font = '800 20px system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const txt = (t, x, y, col = '#fff') => { ctx.fillStyle = 'rgba(5,7,26,.85)'; ctx.fillText(t, x + 1.5, y + 1.5); ctx.fillStyle = col; ctx.fillText(t, x, y); };
  spr(IMG['lucas-quieto'], pad + 14, 44, 38, 0.5, 1); txt('× ' + Math.max(0, G.lives), pad + 34, 26);
  spr(IMG['obj-chip'], pad + 112, 26, 24, 0.5, 0.5); txt(String(G.chips), pad + 130, 26, '#ffe27a');
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < G.gears ? 1 : 0.28; spr(IMG['obj-engranaje'], pad + 196 + i * 28, 26, 24, 0.5, 0.5); } ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; txt(String(G.score).padStart(6, '0'), w / 2, 26);
  ctx.font = '700 12px system-ui,sans-serif'; txt('MUNDO 1-1', w / 2, 46, '#9fb4ff');
  // poderes activos
  const p = P, act = [];
  if (p.power === 'laser') act.push(['poder-laser', 0]); if (p.power === 'mini') act.push(['poder-mini', 0]); if (p.shield) act.push(['poder-escudo', 0]);
  if (p.tTurbo > 0) act.push(['poder-turbo', p.tTurbo / 7]); if (p.tMagnet > 0) act.push(['poder-iman', p.tMagnet / 14]); if (p.tStar > 0) act.push(['poder-estrella5g', p.tStar / 9]);
  act.forEach(([n, f], i) => { const x = pad + 18 + i * 44, y = 76; spr(IMG[n], x, y, 36, 0.5, 0.5);
    if (f > 0) { ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20, -1.5708, -1.5708 + 6.283 * f); ctx.stroke(); } });
  ctx.restore();
}
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (!L) { ctx.fillStyle = '#070a1e'; ctx.fillRect(0, 0, VW, VHv); return; }
  drawBackground(); drawWorld();
  if (state === 'play' || state === 'done' || state === 'over') drawHUD();
  const vg = ctx.createRadialGradient(VW / 2, VHv / 2, VHv * 0.45, VW / 2, VHv / 2, Math.max(VW, VHv) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VHv);
  if (state === 'load') { ctx.fillStyle = '#9fb4ff'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Cargando… ' + Math.round(loaded / NAMES.length * 100) + '%', VW / 2, VHv / 2); }
}
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  pollPad();
  if (L && !paused && !rotBlock) { acc += dt; let n = 0; while (acc >= 1 / 120 && n++ < 8) { update(1 / 120); acc -= 1 / 120; } }
  render();
}

/* ---------- pantallas ---------- */
let rotBlock = false;
function checkRot() { rotBlock = state === 'play' && TOUCH && innerHeight > innerWidth; $('rot').classList.toggle('on', rotBlock); }
function show(id, on) { $(id).classList.toggle('on', on); }
function startGame() {
  audio(); startMusic();
  if (TOUCH) { try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {} }
  resetLevel(true); state = 'play'; paused = false;
  show('title', false); show('panel', false); show('top', true); show('touch', TOUCH); checkRot();
}
function togglePause() {
  if (state !== 'play') return;
  paused = !paused;
  if (paused) { $('card').innerHTML = '<h2>PAUSA</h2><div class="row"><button class="btn" id="pc">SEGUIR</button><button class="btn" id="pm">MENÚ</button></div>'; show('panel', true); $('pc').onclick = togglePause; $('pm').onclick = toMenu; }
  else show('panel', false);
}
function toMenu() { paused = false; state = 'title'; resetLevel(true); show('panel', false); show('top', false); show('touch', false); show('title', true); checkRot(); }
function levelDone() {
  state = 'done'; show('touch', false);
  const stars = 1 + (G.gears === 3 ? 1 : 0) + (G.deaths === 0 ? 1 : 0);
  const secs = Math.floor(G.clock), bonus = Math.max(0, 300 - secs) * 10; G.score += bonus;
  let best = 0, bestStars = 0;
  try { best = +localStorage.getItem('tl_best_1_1') || 0; bestStars = +localStorage.getItem('tl_stars_1_1') || 0;
    if (G.score > best) localStorage.setItem('tl_best_1_1', G.score); if (stars > bestStars) localStorage.setItem('tl_stars_1_1', stars); } catch (e) {}
  $('card').innerHTML = '<h2>¡NIVEL SUPERADO!</h2><div class="stars">' + [0, 1, 2].map(i => '<span id="st' + i + '">★</span>').join('') + '</div>' +
    '<div class="stat"><span>Chips</span><b>' + G.chips + '</b></div><div class="stat"><span>Engranajes</span><b>' + G.gears + ' / 3</b></div>' +
    '<div class="stat"><span>Tiempo</span><b>' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + '</b></div>' +
    '<div class="stat"><span>Puntos</span><b>' + G.score + (G.score > best ? ' · ¡RÉCORD!' : '') + '</b></div>' +
    '<div class="small">★ terminar · ★ los 3 engranajes · ★ sin perder vidas</div>' +
    '<div class="row"><button class="btn" id="pr">REPETIR</button><button class="btn" id="pm">MENÚ</button></div><div class="small">Próximamente: más niveles y el mapa de mundos</div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = toMenu;
  for (let i = 0; i < stars; i++) setTimeout(() => { const e = $('st' + i); if (e) { e.classList.add('on'); tone(784 + i * 196, 784 + i * 196, 0.2, 'triangle', 0.14); } }, 400 + i * 380);
}
function gameOver() {
  state = 'over'; show('touch', false); SFX.over();
  $('card').innerHTML = '<h2>FIN DE LA PARTIDA</h2><div class="stat"><span>Puntos</span><b>' + G.score + '</b></div><div class="row"><button class="btn" id="pr">REINTENTAR</button><button class="btn" id="pm">MENÚ</button></div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = toMenu;
}
$('btnPlay').onclick = startGame;
$('btnPause').onclick = togglePause;
$('btnMute').onclick = () => { audio(); setSnd(!sndOn); };
$('btnSnd').onclick = () => { audio(); setSnd(!sndOn); if (sndOn) SFX.chip(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !paused) togglePause(); });
// instalar
let deferred = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
if (standalone) $('btnInstall').style.display = 'none';
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
addEventListener('appinstalled', () => { $('btnInstall').style.display = 'none'; });
$('btnInstall').onclick = () => {
  if (deferred) { deferred.prompt(); deferred = null; }
  else if (isIOS) show('ios', true);
  else alert('Para instalar TURBOLUCAS abre el menú del navegador (⋮) y elige "Instalar aplicación" o "Añadir a pantalla de inicio".');
};
$('iosOk').onclick = () => show('ios', false);
// compartir: solo texto + enlace, para que WhatsApp muestre la tarjeta con imagen
$('btnShare').onclick = () => {
  const url = 'https://puntofibra.github.io/turbolucas/', text = '¡Juega a TURBOLUCAS! Ayuda a Lucas a cruzar la estación orbital 🚀';
  if (navigator.share) navigator.share({ title: 'TURBOLUCAS', text, url }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
};

/* ---------- arranque ---------- */
setSnd(sndOn); resize();
L = buildLevel(); P = newPlayer(L.spawn.x, L.spawn.y); spawnEnemies(); cam.y = L.H * T - VHv;
requestAnimationFrame(frame);
loadImages(() => { state = 'title'; });
window.__TL = { get P() { return P; }, get G() { return G; }, get state() { return state; }, get L() { return L; }, K, press };
})();
