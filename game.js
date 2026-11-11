/* TURBOLUCAS - un juego de FuturMovil. Motor de plataformas + nivel 1-1 (Estación orbital). */
(() => {
'use strict';
const VERSION = '0.13';
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
  'enemigo-patrulla-anim', 'enemigo-dron-anim', 'enemigo-erizo-anim', 'enemigo-torreta-anim', 'enemigo-alien-anim',
  'suelo', 'plataforma', 'caja-x', 'caja-usada', 'fondo-cerca', 'fondo-lejos', 'jefe1', 'mapa1', 'ico-candado', 'ico-estrella', 'ico-estrella-off', 'ico-bandera', 'obj-chip', 'obj-engranaje', 'obj-caja', 'obj-checkpoint', 'obj-antena5g', 'portal',
  'poder-laser', 'poder-escudo', 'poder-turbo', 'poder-iman', 'poder-mini', 'poder-estrella5g'];
const IMG = {};
const FRAMES = { 'enemigo-dron-anim': 4, 'enemigo-patrulla-anim': 4, 'enemigo-alien-anim': 4, 'enemigo-erizo-anim': 4, 'enemigo-torreta-anim': 3 };      // imágenes que son una tira de fotogramas de animación
let loaded = 0;
function loadImages(done) {
  NAMES.forEach(n => {
    const im = new Image();
    im.onload = im.onerror = () => { if (++loaded === NAMES.length) done(); };
    im.src = 'img/' + TIER + '/' + n + '.webp';
    if (FRAMES[n]) im._n = FRAMES[n];
    IMG[n] = im;
  });
}
$('logoImg').src = 'img/' + TIER + '/logo.webp';
$('heroImg').src = 'img/' + TIER + '/lucas-celebrando.webp';
$('rotImg').src = 'img/' + TIER + '/lucas-golpeado.webp';
// dibuja una imagen con altura h (unidades de mundo), anclada en (ax, ay) de la imagen
function spr(im, x, y, h, ax = 0.5, ay = 1, flip = false, rot = 0, sx = 1, sy = 1) {
  if (!im || !im.naturalWidth) return;
  const n = im._n || 1, fw = im.naturalWidth / n, w = fw / im.naturalHeight * h;
  ctx.save(); ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -sx : sx, sy);
  if (n > 1) ctx.drawImage(im, fw * ((im._f | 0) % n), 0, fw, im.naturalHeight, -w * ax, -h * ay, w, h);
  else ctx.drawImage(im, -w * ax, -h * ay, w, h);
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
  const stepDur = 0.17 * (P && P.tStar > 0 ? 0.72 : 1) * (G.tleft <= 10 ? 0.6 : G.tleft <= 30 ? 0.74 : 1);
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
  if (state === 'map') { if (e.code === 'ArrowRight' || e.code === 'KeyD') mapMove(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') mapMove(-1); else if (e.code === 'ArrowUp' || e.code === 'KeyW') mapMove(2); else if (e.code === 'ArrowDown' || e.code === 'KeyS') mapMove(-2); else if (e.code === 'Enter' || e.code === 'Space') mapPlay(); else if (e.code === 'Escape') toMenu(); return; }
  if (e.code === 'Enter') { if (state === 'title') openMap(); else if ($('panel').classList.contains('on')) { const b = $('card').querySelector('button'); if (b) b.click(); } }
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
// nada de ampliar la pantalla: ni pellizco, ni doble toque, ni Ctrl+rueda
const noZoom = e => { if (e.touches && e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) e.preventDefault(); };
document.addEventListener('touchstart', noZoom, { passive: false }); document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
let lastTap = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTap < 320) e.preventDefault(); lastTap = n; }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
const padPrev = { jump: false, act: false, left: false, right: false, down: false }; let padUsed = false;
function pollPad() {
  const gp = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).find(g => g);
  if (!gp) return;
  const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const now = { left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), down: ay > 0.55 || b(13), jump: b(0) || b(3), act: b(2) || b(1) || b(5) };
  for (const k in now) { if (now[k] !== padPrev[k]) { padUsed = true; press(k, now[k]); padPrev[k] = now[k]; } }
  if (b(9) && !padPrev.start && state === 'play') togglePause();
  if (b(0) && !padPrev.a) { if (state === 'title') openMap(); else if (state === 'map') mapPlay(); }
  if (state === 'map') { if (now.right && !padPrev.mr) mapMove(1); if (now.left && !padPrev.ml) mapMove(-1); }
  padPrev.a = b(0); padPrev.mr = now.right; padPrev.ml = now.left;
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
  const plats = [];
  for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (g[y][x] === '=') { let x1 = x; while (x1 + 1 < W && g[y][x1 + 1] === '=') x1++; plats.push({ x0: x, x1, ty: y }); x = x1 + 1; } else x++; } }
  return { W, H, g, plats, boxes, chips, gears, ents, portals, checkpoint, goal, spawn: { x: 3 * T, y: 14 * T } };
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
const LEVEL_TIME = 180;          // segundos por fase
let state = 'load', paused = false, P = null, cam = { x: 0, y: 0 }, time = 0, shake = 0;
let enemies = [], items = [], shots = [], parts = [], pops = [], bumps = [];
let G = { lives: 3, chips: 0, score: 0, gears: 0, deaths: 0, clock: 0, tleft: LEVEL_TIME };
const ENEMY = {
  patrulla: { img: 'enemigo-patrulla-anim', h: 69.8, ax: 0.5228, fps: 9, faceR: true, w: 40, bh: 58, speed: 62, stomp: true, pts: 100 },
  alien: { img: 'enemigo-alien-anim', h: 59.8, ax: 0.5141, fps: 4.5, w: 48, bh: 46, speed: 30, stomp: true, pts: 100 },
  erizo: { img: 'enemigo-erizo-anim', h: 52.6, fps: 7, w: 50, bh: 44, speed: 48, stomp: false, pts: 300 },
  dron: { img: 'enemigo-dron-anim', h: 61.8, ax: 0.5216, w: 46, bh: 40, speed: 80, stomp: true, pts: 200, fly: true },
  torreta: { img: 'enemigo-torreta-anim', h: 71, w: 54, bh: 56, speed: 0, stomp: true, pts: 300 }
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
  if (full) G = { lives: 3, chips: 0, score: 0, gears: 0, deaths: 0, clock: 0, tleft: LEVEL_TIME };
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
      for (let i = 0; i < 8; i++) parts.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + 24 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 320, vy: -200 - Math.random() * 260, life: 0.9, max: 0.9, col: i % 2 ? '#5b7f9c' : '#aab4c4', size: 7, grav: 1500, sqr: true }); }
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
  P = newPlayer(cp.x, cp.y); P.inv = 1.5; G.tleft = LEVEL_TIME;
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
      e.dir = p.x < e.x ? -1 : 1; e.timer -= dt; e.shotT = Math.max(0, (e.shotT || 0) - dt);
      e.near = Math.abs(p.x - e.x) < 620 && Math.abs(p.y - e.y) < 260;
      if (e.timer <= 0 && Math.abs(p.x - e.x) < 620 && Math.abs(p.y - e.y) < 260) {
        e.timer = 2.3; e.shotT = 0.28; shots.push({ mine: false, x: e.x + e.w / 2 + e.dir * 34, y: e.y + 14, vx: e.dir * 250, vy: 0, w: 14, h: 14, life: 3.2 }); SFX.shot();
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
  if (state === 'map') mapUpdate(dt);
  if (state === 'title' || state === 'map') { cam.x = (Math.sin(time * 0.07) * 0.5 + 0.5) * Math.max(0, L.W * T - VW); cam.y = L.H * T - VHv; }
  if (state === 'play') {
    G.clock += dt;
    if (!P.dead && !P.win) {
      const before = G.tleft; G.tleft = Math.max(0, G.tleft - dt);
      if (before > 30 && G.tleft <= 30) { pop(P.x + P.w / 2, P.y - 30, '¡DATE PRISA!', '#ff5a6a'); [880, 660, 880, 660, 880].forEach((f, i) => tone(f, f, 0.12, 'square', 0.1, i * 0.13)); }
      if (G.tleft <= 10 && G.tleft > 0 && Math.ceil(before) !== Math.ceil(G.tleft)) tone(1245, 1245, 0.08, 'square', 0.1);
      if (G.tleft <= 0) { pop(P.x + P.w / 2, P.y - 30, '¡SE ACABÓ EL TIEMPO!', '#ff5a6a'); die(); }
    }
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
function bgLayer(im, h, bottom, par) {
  if (!im || !im.naturalWidth) return;
  const w = im.naturalWidth / im.naturalHeight * h, off = cam.x * par;
  let i = Math.floor(off / w), x = i * w - off;
  for (; x < VW; x += w, i++) {
    if (i % 2) { ctx.save(); ctx.translate(x + w, bottom - h); ctx.scale(-1, 1); ctx.drawImage(im, -0.5, 0, w + 1, h); ctx.restore(); }
    else ctx.drawImage(im, x - 0.5, bottom - h, w + 1, h);
  }
}
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
  // ciudad espacial: dos capas dibujadas, repetidas en espejo para que no se note la unión
  const up = (L.H * T - VHv - cam.y) * 0.12;
  bgLayer(IMG['fondo-lejos'], 250, VHv - 78 + up, 0.12);
  ctx.fillStyle = 'rgba(40,24,96,.28)'; ctx.fillRect(0, 0, VW, VHv);
  bgLayer(IMG['fondo-cerca'], 330, VHv + 26 + up * 2, 0.3);
  const fg = ctx.createLinearGradient(0, VHv * 0.55, 0, VHv); fg.addColorStop(0, 'rgba(60,30,120,0)'); fg.addColorStop(1, 'rgba(70,40,150,.38)');
  ctx.fillStyle = fg; ctx.fillRect(0, VHv * 0.55, VW, VHv * 0.45);
}
function drawTiles() {
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(L.H - 1, Math.floor((cam.y + VHv) / T));
  const G = IMG.suelo, gOk = G && G.naturalWidth, gw = gOk ? G.naturalWidth / 8 : 0, gh = gOk ? G.naturalHeight / 2 : 0;
  // plataformas flotantes (una imagen por tramo)
  const PI = IMG.plataforma;
  for (const pl of L.plats) {
    if (pl.x1 < x0 - 1 || pl.x0 > x1 + 1) continue;
    const w = (pl.x1 - pl.x0 + 1) * T + 10, x = pl.x0 * T - 5, y = pl.ty * T - 2 + Math.sin(time * 2 + pl.x0) * 1.2;
    if (PI && PI.naturalWidth) {
      const h = w * PI.naturalHeight / PI.naturalWidth, a = 0.3 + 0.14 * Math.sin(time * 7 + pl.x0);
      ctx.globalCompositeOperation = 'lighter';
      for (const fx of [0.165, 0.835]) { const g2 = ctx.createRadialGradient(x + w * fx, y + h, 0, x + w * fx, y + h, w * 0.13); g2.addColorStop(0, 'rgba(60,230,255,' + a + ')'); g2.addColorStop(1, 'rgba(60,230,255,0)'); ctx.fillStyle = g2; ctx.fillRect(x + w * fx - w * 0.13, y + h - 4, w * 0.26, w * 0.14); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(PI, x, y, w, h);
    } else { ctx.fillStyle = '#2c386e'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#35ff8a'; ctx.fillRect(x, y, w, 2.5); }
  }
  // suelo y bloques macizos
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (L.g[ty][tx] !== '#') continue;
    const x = tx * T, y = ty * T;
    let d = 0; while (d < 9 && ty - 1 - d >= 0 && L.g[ty - 1 - d][tx] === '#') d++;
    if (gOk) {
      const sx = (tx % 8) * gw;
      if (d === 0) ctx.drawImage(G, sx, 0, gw, gh, x, y, T + 0.5, T + 0.5);
      else if (d % 2) ctx.drawImage(G, sx, gh, gw, gh, x, y, T + 0.5, T + 0.5);
      else { ctx.save(); ctx.translate(x, y + T); ctx.scale(1, -1); ctx.drawImage(G, sx, gh, gw, gh, 0, -0.5, T + 0.5, T + 0.5); ctx.restore(); }
    } else { ctx.fillStyle = '#263060'; ctx.fillRect(x, y, T + 0.5, T + 0.5); if (d === 0) { ctx.fillStyle = '#29e6ff'; ctx.fillRect(x, y, T + 0.5, 2.5); } }
    ctx.fillStyle = '#080b1c';
    if (tx > 0 && L.g[ty][tx - 1] !== '#') ctx.fillRect(x, y, 2.5, T + 0.5);
    if (tx < L.W - 1 && L.g[ty][tx + 1] !== '#') ctx.fillRect(x + T - 2.5, y, 2.5, T + 0.5);
    if (ty < L.H - 1 && L.g[ty + 1][tx] !== '#') ctx.fillRect(x, y + T - 2.5, T + 0.5, 2.5);
  }
  // cajas (de izquierda a derecha, para que cada una tape el lateral de la anterior)
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = L.g[ty][tx]; if (c !== '?' && c !== 'B' && c !== 'U') continue;
    const cx = tx * T + T / 2; let cy = ty * T + T / 2;
    const b = bumps.find(q => q.tx === tx && q.ty === ty); if (b) cy -= Math.sin(b.t / 0.2 * Math.PI) * 10;
    if (c === '?') {
      const pu = 0.5 + 0.5 * Math.sin(time * 4 + tx);
      ctx.globalCompositeOperation = 'lighter';
      const g2 = ctx.createRadialGradient(cx, cy, 14, cx, cy, 46); g2.addColorStop(0, 'rgba(255,190,60,' + (0.2 + 0.14 * pu) + ')'); g2.addColorStop(1, 'rgba(255,190,60,0)');
      ctx.fillStyle = g2; ctx.fillRect(cx - 46, cy - 46, 92, 92);
      ctx.globalCompositeOperation = 'source-over';
      spr(IMG['obj-caja'], cx, cy, 57 * (1 + pu * 0.03), 0.5, 0.5);
    } else spr(IMG[c === 'B' ? 'caja-x' : 'caja-usada'], cx, cy, c === 'B' ? 53 : 54, 0.5, 0.5);
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
    const cx = e.x + e.w / 2, by = e.y + e.h, eim = IMG[e.d.img], eax = e.d.ax || 0.5, efl = e.d.faceR ? e.dir < 0 : e.dir > 0;
    if (eim._n) eim._f = e.dead ? 0 : e.type === 'torreta' ? (e.shotT > 0 ? 2 : e.near && e.timer < 0.6 ? 1 : 0) : Math.floor(e.t * (e.d.fps || 22));
    if (e.dead) { if (e.how === 'squish') spr(IMG[e.d.img], cx, by, e.d.h, eax, 1, efl, 0, 1.25, 0.25); else spr(IMG[e.d.img], cx, by - e.d.h / 2, e.d.h, 0.5, 0.5, efl, e.dead * 9); continue; }
    const wob = e.d.fly || e.type === 'torreta' ? 0 : Math.sin(e.t * 9) * 0.04;
    spr(IMG[e.d.img], cx, by + (e.type === 'alien' ? 4 : 2), e.d.h, eax, 1, efl, wob, 1, e.type === 'alien' ? 1 + Math.sin(e.t * 5) * 0.05 : 1);
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
  ctx.font = '700 12px system-ui,sans-serif'; txt('MUNDO ' + curId, w / 2, 46, '#9fb4ff');
  { // reloj: se pone rojo y late cuando quedan 30 s
    const tl = Math.ceil(G.tleft), low = tl <= 30, vlow = tl <= 10, tx = Math.min(w - 190, w / 2 + 200), pu = low ? 1 + (vlow ? 0.16 : 0.08) * Math.abs(Math.sin(time * (vlow ? 10 : 5))) : 1, col = low ? '#ff4a5a' : '#fff';
    ctx.save(); ctx.translate(tx, 30); ctx.scale(pu, pu);
    if (low) { ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 16; }
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.fillStyle = 'rgba(5,7,26,.7)'; ctx.beginPath(); ctx.arc(-44, 0, 12, 0, 6.283); ctx.fill(); ctx.stroke();
    const an = -1.5708 + 6.283 * (1 - G.tleft / LEVEL_TIME); ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(-44 + Math.cos(an) * 8, Math.sin(an) * 8); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(-46.5, -17, 5, 4);
    ctx.font = '800 22px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(5,7,26,.85)'; ctx.shadowBlur = 0; ctx.fillText(Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), -24.5, 2.5);
    if (low) { ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 14; } ctx.fillStyle = col; ctx.fillText(Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), -26, 1);
    ctx.restore(); ctx.textAlign = 'center';
  }
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
  if (state === 'map') drawMap(); else { drawBackground(); drawWorld(); }
  if (state === 'play' || state === 'done' || state === 'over') drawHUD();
  const vg = ctx.createRadialGradient(VW / 2, VHv / 2, VHv * 0.45, VW / 2, VHv / 2, Math.max(VW, VHv) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VHv);
  if (state === 'play' && G.tleft <= 30 && !P.win) { const a = (G.tleft <= 10 ? 0.34 : 0.16) * (0.5 + 0.5 * Math.sin(time * (G.tleft <= 10 ? 10 : 5))); const rg = ctx.createRadialGradient(VW / 2, VHv / 2, VHv * 0.42, VW / 2, VHv / 2, Math.max(VW, VHv) * 0.72); rg.addColorStop(0, 'rgba(255,30,50,0)'); rg.addColorStop(1, 'rgba(255,30,50,' + a + ')'); ctx.fillStyle = rg; ctx.fillRect(0, 0, VW, VHv); }
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
function checkRot() { const was = rotBlock; rotBlock = TOUCH && innerHeight > innerWidth; $('rot').classList.toggle('on', rotBlock); if (rotBlock && !was) for (const k in K) K[k] = false; }
// --- aviso de giro automático bloqueado ---
// Si el móvil está físicamente tumbado pero la pantalla sigue en vertical, es que tiene el giro bloqueado: se lo decimos.
let rotSince = 0, tiltSince = 0, hintOn = false, motionAsked = false;
const IOS_DEV = /iphone|ipad|ipod/i.test(navigator.userAgent);
const canForce = !IOS_DEV && screen.orientation && screen.orientation.lock && document.documentElement.requestFullscreen;
addEventListener('devicemotion', e => {
  const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
  const lying = Math.abs(g.x) > 6.5 && Math.abs(g.y) < 5;
  if (lying) { if (!tiltSince) tiltSince = Date.now(); } else tiltSince = 0;
});
function rotHint(kind) {
  if (hintOn === kind) return; hintOn = kind;
  $('rotHintT').textContent = kind === 'sensor' ? '¡TIENES EL GIRO BLOQUEADO!' : '¿LO HAS GIRADO Y SIGUE IGUAL?';
  const pre = kind === 'sensor' ? 'Ya has girado el móvil, pero la pantalla no gira. ' : 'Seguro que tienes el giro de pantalla bloqueado. ';
  $('rotHintP').innerHTML = pre + (IOS_DEV
    ? 'Desliza hacia abajo desde la <b>esquina de arriba a la derecha</b> y toca el <b>candado con la flecha</b> para quitarlo.'
    : (canForce ? 'Pulsa <b>GIRAR LA PANTALLA</b>, o desliza' : 'Desliza') + ' hacia abajo desde arriba del todo y activa <b>Giro automático</b>.');
  $('rotHint').classList.add('on'); $('rot').classList.add('hint');
  if (kind === 'sensor') { try { navigator.vibrate && navigator.vibrate([60, 60, 60]); } catch (e) {} }
}
setInterval(() => {
  if (!rotBlock) { if (rotSince) { rotSince = 0; tiltSince = 0; hintOn = false; $('rotHint').classList.remove('on'); $('rot').classList.remove('hint'); } return; }
  if (!rotSince) { rotSince = Date.now(); $('rotBtn').classList.toggle('on', !!canForce); }
  if (tiltSince && Date.now() - tiltSince > 900) rotHint('sensor');
  else if (!hintOn && Date.now() - rotSince > 8000) rotHint('time');
}, 300);
// en iPhone hay que pedir permiso para leer el sensor: se pide al primer toque sobre el cartel
$('rot').addEventListener('touchend', () => {
  if (motionAsked) return; motionAsked = true;
  try { if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {}); } catch (e) {}
});
// en Android se puede girar la pantalla aunque el giro automático esté bloqueado
$('rotBtn').onclick = () => {
  try { document.documentElement.requestFullscreen().then(() => screen.orientation.lock('landscape')).catch(() => rotHint('time')); } catch (e) { rotHint('time'); }
};
function show(id, on) { $(id).classList.toggle('on', on); }
function goFull() {
  if (!TOUCH) return;
  try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
}
function startGame() {
  audio(); startMusic();
  resetLevel(true); state = 'play'; paused = false;
  show('title', false); show('panel', false); show('mapUI', false); show('top', true); show('touch', TOUCH); checkRot();
}
function togglePause() {
  if (state !== 'play') return;
  paused = !paused;
  if (paused) { $('card').innerHTML = '<h2>PAUSA</h2><div class="row"><button class="btn" id="pc">SEGUIR</button><button class="btn" id="pm">MAPA</button></div>'; show('panel', true); $('pc').onclick = togglePause; $('pm').onclick = () => toMap(false); }
  else show('panel', false);
}
function toMenu() { setTimeout(updApply, 300); paused = false; state = 'title'; show('panel', false); show('mapUI', false); show('top', false); show('touch', false); show('title', true); checkRot(); }
function levelDone() {
  state = 'done'; show('touch', false);
  const stars = 1 + (G.gears === 3 ? 1 : 0) + (G.deaths === 0 ? 1 : 0);
  const secs = Math.floor(G.clock), bonus = Math.ceil(G.tleft) * 10; G.score += bonus;
  const old = PROG[curId] || { stars: 0, best: 0 }, first = !PROG[curId];
  PROG[curId] = { stars: Math.max(old.stars, stars), best: Math.max(old.best, G.score) }; saveProg();
  { const ci = MAP.findIndex(n => n.id === curId); justOpened = first ? MAP.findIndex((n, k) => k > 0 && !n.bonus && mapPrev(k) === ci) : -1; }
  $('card').innerHTML = '<h2>¡FASE SUPERADA!</h2><div class="stars">' + [0, 1, 2].map(i => '<span id="st' + i + '">★</span>').join('') + '</div>' +
    '<div class="stat"><span>Chips</span><b>' + G.chips + '</b></div><div class="stat"><span>Engranajes</span><b>' + G.gears + ' / 3</b></div>' +
    '<div class="stat"><span>Tiempo</span><b>' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + '</b></div><div class="stat"><span>Bonus por tiempo sobrante</span><b>+' + bonus + '</b></div>' +
    '<div class="stat"><span>Puntos</span><b>' + G.score + (G.score > old.best ? ' · ¡RÉCORD!' : '') + '</b></div>' +
    '<div class="small">★ terminar · ★ los 3 engranajes · ★ sin perder vidas</div>' +
    '<div class="row"><button class="btn" id="pm">CONTINUAR</button><button class="btn" id="pr">REPETIR</button></div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = () => toMap(true);
  for (let i = 0; i < stars; i++) setTimeout(() => { const e = $('st' + i); if (e) { e.classList.add('on'); tone(784 + i * 196, 784 + i * 196, 0.2, 'triangle', 0.14); } }, 400 + i * 380);
}
function gameOver() {
  state = 'over'; show('touch', false); SFX.over();
  $('card').innerHTML = '<h2>FIN DE LA PARTIDA</h2><div class="stat"><span>Puntos</span><b>' + G.score + '</b></div><div class="row"><button class="btn" id="pr">REINTENTAR</button><button class="btn" id="pm">MAPA</button></div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = () => toMap(false);
}

/* ---------- mapa del mundo 1 (ilustración + camino de energía) ---------- */
// x, y y rx van en fracciones del dibujo del mapa; way = puntos del tubo desde la fase anterior
const MAP = [
  { id: '1-1', n: '1', name: 'MUELLE DE CARGA', x: 0.1041, y: 0.498, rx: 0.033, built: true },
  { id: '1-2', n: '2', name: 'PASILLOS DE SERVICIO', x: 0.3479, y: 0.659, rx: 0.033, way: [[0.16, 0.47], [0.20, 0.477], [0.23, 0.52], [0.26, 0.60], [0.29, 0.655]] },
  { id: '1-3', n: '3', name: 'SALA DE MÁQUINAS', x: 0.4996, y: 0.499, rx: 0.033, way: [[0.39, 0.675], [0.42, 0.635], [0.45, 0.60], [0.47, 0.57]] },
  { id: '1-4', n: '4', name: 'TORRE DE ANTENAS', x: 0.6515, y: 0.357, rx: 0.03, gold: true, way: [[0.53, 0.46], [0.56, 0.42], [0.59, 0.385], [0.62, 0.37]] },
  { id: '1-J', n: '', name: 'JEFE · EL GUARDIÁN', x: 0.871, y: 0.393, rx: 0.05, boss: true, way: [[0.685, 0.335], [0.71, 0.305], [0.74, 0.295], [0.78, 0.31], [0.81, 0.335], [0.84, 0.37]] },
  { id: '1-B', n: '★', name: 'FASE SECRETA', x: 0.6177, y: 0.186, rx: 0.021, bonus: true, prev: 3, way: [[0.625, 0.33], [0.603, 0.29], [0.598, 0.24], [0.595, 0.21]] }
];
let PROG = {}, curId = '1-1', mapSel = 0, mapAt = 0, mapL = { x: MAP[0].x, y: MAP[0].y }, mapRoute = [], mapFace = 1, mapShake = { i: -1, t: 0 }, mapMsg = { txt: '', t: 0 }, mapUnl = null, mapParts = [], justOpened = -1;
try { PROG = JSON.parse(localStorage.getItem('tl_prog') || '{}') || {}; const os = +localStorage.getItem('tl_stars_1_1') || 0; if (os && !PROG['1-1']) PROG['1-1'] = { stars: os, best: +localStorage.getItem('tl_best_1_1') || 0 }; } catch (e) { PROG = {}; }
function saveProg() { try { localStorage.setItem('tl_prog', JSON.stringify(PROG)); } catch (e) {} }
const mapPrev = i => MAP[i].prev !== undefined ? MAP[i].prev : i - 1;
const mapOpen = i => i === 0 || !!PROG[MAP[mapPrev(i)].id];
function mapT() { const im = IMG.mapa1, iw = im && im.naturalWidth || 16, ih = im && im.naturalHeight || 9, sc = Math.max(VW / iw, VHv / ih); return { sc, w: iw * sc, h: ih * sc, ox: (VW - iw * sc) / 2, oy: (VHv - ih * sc) * 0.4 }; }
const mapPt = (t, fx, fy) => [t.ox + fx * t.w, t.oy + fy * t.h];
function mapPath(a, b) {            // puntos (en fracciones) para ir de la fase a a la fase b siguiendo el tubo
  const up = i => { const l = [i]; while (i > 0) { i = mapPrev(i); l.push(i); } return l; };
  const ua = up(a), ub = up(b), lca = ua.find(x => ub.includes(x)), pts = [];
  for (const c of ua) { if (c === lca) break; pts.push(...MAP[c].way.slice().reverse()); const q = MAP[mapPrev(c)]; pts.push([q.x, q.y]); }
  for (const d of ub.slice(0, ub.indexOf(lca)).reverse()) { pts.push(...MAP[d].way); pts.push([MAP[d].x, MAP[d].y]); }
  return pts;
}
function mapGo(i) { mapRoute = mapPath(mapAt, i); mapSel = i; mapInfo(); }
function openMap() {
  audio(); startMusic(); goFull();
  state = 'map'; paused = false; mapRoute = []; mapAt = mapSel; mapL = { x: MAP[mapSel].x, y: MAP[mapSel].y };
  show('title', false); show('panel', false); show('top', false); show('touch', false); show('mapUI', true); mapInfo(); checkRot();
}
function toMap(advance) {
  paused = false; state = 'map';
  show('panel', false); show('top', false); show('touch', false); show('mapUI', true);
  const i = MAP.findIndex(n => n.id === curId);
  if (advance && justOpened >= 0) { mapUnl = { i: justOpened, t: 0, snd: false }; }
  else if (advance && i >= 0 && i < 4 && mapOpen(i + 1)) mapGo(i + 1);
  justOpened = -1;
  mapInfo(); checkRot(); setTimeout(updApply, 4000);
}
function mapInfo() {
  const n = MAP[mapSel], pr = PROG[n.id];
  $('mTitle').textContent = (n.boss || n.bonus ? '' : 'FASE 1-' + n.n + ' · ') + n.name;
  $('mSub').innerHTML = !n.built ? 'PRÓXIMAMENTE' : pr ? 'Mejor: ' + pr.best + ' puntos · <span class="mst">' + '★'.repeat(pr.stars) + '</span><span class="mso">' + '★'.repeat(3 - pr.stars) + '</span>' : '¡Fase nueva! Consigue las 3 estrellas';
  $('mPlay').disabled = !n.built;
}
function mapDeny(i) { mapShake = { i, t: 0.45 }; mapMsg = { txt: 'BLOQUEADA · supera antes la fase anterior', t: 2.2 }; SFX.bump(); }
function mapSelect(i) {
  if (i < 0 || i >= MAP.length || mapUnl) return;
  if (!mapOpen(i)) return mapDeny(i);
  if (i === mapSel) { if (!mapRoute.length) mapPlay(); return; }
  SFX.chip(); mapGo(i);
}
function mapMove(d) {
  if (mapUnl) return;
  let i = mapSel;
  if (d === 2) { if (mapSel !== 3) return; i = 5; } else if (d === -2) { if (mapSel !== 5) return; i = 3; }
  else { i = mapSel === 5 ? 3 : mapSel + d; if (i > 4 || i < 0) return; }
  if (!mapOpen(i)) return mapDeny(i);
  SFX.chip(); mapGo(i);
}
function mapPlay() { if (mapUnl || mapRoute.length) return; const n = MAP[mapSel]; if (!n.built) { mapMsg = { txt: 'PRÓXIMAMENTE', t: 1.6 }; SFX.bump(); return; } curId = n.id; startGame(); }
function mapUpdate(dt) {
  const t = mapT();
  if (mapUnl) {
    if (!mapUnl.snd) { mapUnl.snd = true; tone(220, 1320, 1.5, 'sawtooth', 0.05); tone(330, 1980, 1.5, 'sine', 0.08); }
    mapUnl.t += dt / 1.6;
    if (mapUnl.t >= 1) { const i = mapUnl.i; mapUnl = null; SFX.life(); const [x, y] = mapPt(t, MAP[i].x, MAP[i].y); for (let k = 0; k < 34; k++) { const a = Math.random() * 6.283, v = 60 + Math.random() * 200; mapParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 60, life: 0.9, max: 0.9, col: k % 2 ? '#7fe9ff' : '#fff', size: 2 + Math.random() * 2.5 }); } if (!MAP[i].bonus) mapGo(i); }
  }
  let step = 330 * dt;
  while (mapRoute.length && step > 0) {
    const [tx, ty] = mapPt(t, mapRoute[0][0], mapRoute[0][1]), [lx, ly] = mapPt(t, mapL.x, mapL.y), dx = tx - lx, dy = ty - ly, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) mapFace = dx > 0 ? 1 : -1;
    if (d <= step) { mapL = { x: mapRoute[0][0], y: mapRoute[0][1] }; mapRoute.shift(); step -= d; if (!mapRoute.length) { mapAt = mapSel; SFX.stomp(); } }
    else { mapL = { x: mapL.x + dx / d * step / t.w, y: mapL.y + dy / d * step / t.h }; step = 0; }
  }
  if (mapRoute.length) { const [lx, ly] = mapPt(t, mapL.x, mapL.y); for (let k = 0; k < 2; k++) mapParts.push({ x: lx + (Math.random() - 0.5) * 14, y: ly + (Math.random() - 0.5) * 8, vx: -mapFace * (20 + Math.random() * 50), vy: 10 + Math.random() * 40, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#7fe9ff' : '#ffd08a', size: 1.5 + Math.random() * 2.2 }); }
  for (const q of mapParts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; }
  mapParts = mapParts.filter(q => q.life > 0);
  mapShake.t = Math.max(0, mapShake.t - dt); mapMsg.t = Math.max(0, mapMsg.t - dt);
}
function polyAt(pts, f) {            // punto a la fracción f (0..1) de una línea quebrada
  let tot = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
  let d = f * tot; for (let i = 0; i < ls.length; i++) { if (d <= ls[i] || i === ls.length - 1) { const k = ls[i] ? Math.min(1, d / ls[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, i]; } d -= ls[i]; }
  return [pts[0][0], pts[0][1], 0];
}
function drawMap() {
  const t = mapT(), u = t.w, im = IMG.mapa1;
  if (im && im.naturalWidth) ctx.drawImage(im, t.ox, t.oy, t.w, t.h); else drawBackground();
  // tramos del tubo: apagados si la fase está bloqueada, con pulsos de energía si está abierta
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 1; i < MAP.length; i++) {
    const n = MAP[i], open = mapOpen(i), unl = mapUnl && mapUnl.i === i ? mapUnl.t : (open ? 1 : 0);
    const way = n.way.map(p => mapPt(t, p[0], p[1])), a = mapPt(t, MAP[mapPrev(i)].x, MAP[mapPrev(i)].y), b = mapPt(t, n.x, n.y), full = [a, ...way, b];
    if (unl < 1) {
      const [sx, sy, si] = polyAt(way, unl);
      if (unl > 0) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 0.05 * u); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.3, 'rgba(120,235,255,.7)'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 0.05 * u, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.8) mapParts.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, max: 0.5, col: '#bff6ff', size: 2 + Math.random() * 2 }); }
    }
    if (unl >= 1) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const [x, y] = polyAt(full, (time * 0.22 + k / 3 + i * 0.13) % 1), r = (n.bonus ? 0.012 : 0.02) * u, g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, n.bonus ? 'rgba(255,215,90,.6)' : 'rgba(140,240,255,.6)'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // plataformas de cada fase
  for (let i = 0; i < MAP.length; i++) {
    const n = MAP[i], open = mapOpen(i) && !(mapUnl && mapUnl.i === i), dn = PROG[n.id], sel = i === mapSel, pu = 0.5 + 0.5 * Math.sin(time * 4 + i), rx = n.rx * u, ry = rx * 0.4;
    let [x, y] = mapPt(t, n.x, n.y); if (mapShake.i === i && mapShake.t > 0) x += Math.sin(mapShake.t * 60) * 5;
    const col = dn ? '53,255,138' : n.boss ? '255,70,80' : n.gold || n.bonus ? '255,205,70' : '41,230,255';
    if (!open) {
      const fade = mapUnl && mapUnl.i === i ? 1 - Math.max(0, mapUnl.t - 0.75) * 4 : 1;
      ctx.globalAlpha = fade; spr(IMG['ico-candado'], x, y + ry * 0.75 + Math.sin(time * 2 + i) * 1.5, rx * 1.55, 0.5, 1); ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 3 + pu * 2; ctx.strokeStyle = 'rgba(' + col + ',' + (0.55 + 0.35 * pu) + ')'; ctx.shadowColor = 'rgb(' + col + ')'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.9, ry * 0.9, 0, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    if (sel) { ctx.setLineDash([rx * 0.26, rx * 0.2]); ctx.lineDashOffset = -time * 40; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 + 0.3 * pu) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.68, ry * 0.68, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
    if (n.boss) spr(IMG.jefe1, x, y + ry * 0.4, rx * 1.4, 0.5, 1);
    else { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); ctx.font = '900 ' + Math.round(rx * 1.05) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = rx * 0.1; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.strokeText(n.n, 0, rx * 0.04); ctx.fillStyle = n.gold || n.bonus ? '#6a3d00' : '#0d1a55'; ctx.fillText(n.n, 0, rx * 0.04); ctx.restore(); }
    if (dn) {
      spr(IMG['ico-bandera'], x + rx * 1.02, y + ry * 0.05, rx * 1.2, 0.12, 1, false, Math.sin(time * 3 + i) * 0.05);
      for (let k = 0; k < 3; k++) spr(IMG[k < dn.stars ? 'ico-estrella' : 'ico-estrella-off'], x + (k - 1) * rx * 0.66, y + rx * 1.22 + (k === 1 ? rx * 0.08 : 0), rx * 0.6, 0.5, 0.5);
    } else if (!n.built) { ctx.font = '800 ' + Math.max(9, Math.round(rx * 0.38)) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#05071a'; ctx.fillText('PRONTO', x + 1, y + rx * 1.25 + 1); ctx.fillStyle = '#cfe0ff'; ctx.fillText('PRONTO', x, y + rx * 1.25); }
  }
  // chispas y Lucas recorriendo el tubo
  ctx.globalCompositeOperation = 'lighter';
  for (const q of mapParts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.283); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const moving = mapRoute.length > 0, pose = moving ? 'lucas-avanzando' : 'lucas-quieto', lim = IMG[pose], [lx, ly0] = mapPt(t, mapL.x, mapL.y);
  const hL = Math.max(58, 0.074 * u), k = hL / 480, by = ly0 + 0.004 * u - (moving ? 6 : 3) + Math.sin(time * 3) * 2.5, fs = mapFace;
  ctx.fillStyle = 'rgba(0,0,10,.3)'; ctx.beginPath(); ctx.ellipse(lx, ly0 + 0.004 * u, hL * 0.26, hL * 0.07, 0, 0, 6.283); ctx.fill();
  CAN[pose].forEach((o, i) => flame(lx + fs * o[0] * k, by - o[1] * k - 2, (moving ? 0.34 : 0.15) * hL * (i === 1 ? 1.1 : 1), hL * 0.09, i + 1));
  spr(lim, lx, by, (lim.naturalHeight || 240) * KS * k, ANCH[pose], 1, fs < 0, moving ? 0.07 * fs : 0);
  // cabecera y zona de botones
  const hg = ctx.createLinearGradient(0, 0, 0, 110); hg.addColorStop(0, 'rgba(4,6,22,.7)'); hg.addColorStop(1, 'rgba(4,6,22,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, 110);
  const bg = ctx.createRadialGradient(VW - 150, VHv + 20, 30, VW - 150, VHv + 20, 420); bg.addColorStop(0, 'rgba(4,6,22,.92)'); bg.addColorStop(0.5, 'rgba(4,6,22,.7)'); bg.addColorStop(1, 'rgba(4,6,22,0)'); ctx.fillStyle = bg; ctx.fillRect(VW - 570, VHv - 400, 570, 400);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '800 14px system-ui,sans-serif'; ctx.fillStyle = '#7fe9ff'; ctx.fillText('MUNDO 1', 22, 32);
  ctx.font = '800 26px system-ui,sans-serif'; ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff'; ctx.fillText('ESTACIÓN ORBITAL', 22, 60); ctx.shadowBlur = 0;
  const done = MAP.filter(n => PROG[n.id]).length, stars = MAP.reduce((a, n) => a + (PROG[n.id] ? PROG[n.id].stars : 0), 0);
  ctx.font = '700 13px system-ui,sans-serif'; ctx.fillStyle = '#cfe0ff'; ctx.fillText(done + ' / ' + MAP.length + ' fases', 22, 82);
  spr(IMG['ico-estrella'], 112, 77, 16, 0.5, 0.5); ctx.fillStyle = '#ffd23c'; ctx.fillText(stars + ' / ' + MAP.length * 3, 124, 82);
  if (mapMsg.t > 0) { ctx.globalAlpha = Math.min(1, mapMsg.t * 2); ctx.font = '800 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(mapMsg.txt).width + 28, my = VHv * 0.16; ctx.fillStyle = 'rgba(40,10,20,.9)'; ctx.fillRect(VW / 2 - w / 2, my - 16, w, 32); ctx.strokeStyle = '#ff5a6a'; ctx.lineWidth = 2; ctx.strokeRect(VW / 2 - w / 2, my - 16, w, 32); ctx.fillStyle = '#ffd0d6'; ctx.fillText(mapMsg.txt, VW / 2, my); ctx.globalAlpha = 1; }
  ctx.textBaseline = 'alphabetic';
}
cv.addEventListener('pointerdown', e => {
  if (state !== 'map') return;
  const x = e.clientX * DPR / SC, y = e.clientY * DPR / SC, t = mapT();
  for (let i = MAP.length - 1; i >= 0; i--) { const [nx, ny] = mapPt(t, MAP[i].x, MAP[i].y), rx = MAP[i].rx * t.w; if (((x - nx) / (rx * 1.75)) ** 2 + ((y - ny - rx * 0.2) / (rx * 1.2)) ** 2 < 1) { mapSelect(i); return; } }
});
$('mPlay').onclick = mapPlay; $('mBack').onclick = toMenu;
$('btnPlay').onclick = openMap;
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

/* ---------- actualización automática ---------- */
// Mira cada minuto si hay versión nueva. Nunca recarga en mitad de una partida: espera a que el jugador vuelva al menú.
let updPending = null;
function updCheck() {
  if (document.hidden) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.v && j.v !== VERSION) { updPending = j.v; updApply(); } }).catch(() => {});
}
function updApply() {
  if (!updPending || (state !== 'title' && state !== 'map')) return;
  try { const k = 'tl_upd_' + updPending, last = +sessionStorage.getItem(k) || 0; if (Date.now() - last < 300000) return; sessionStorage.setItem(k, Date.now()); } catch (e) {}
  location.replace(location.pathname + '?u=' + encodeURIComponent(updPending));
}
setInterval(updCheck, 60000); setTimeout(updCheck, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updCheck(); });

/* ---------- arranque ---------- */
setSnd(sndOn); resize();
L = buildLevel(); P = newPlayer(L.spawn.x, L.spawn.y); spawnEnemies(); cam.y = L.H * T - VHv;
requestAnimationFrame(frame);
loadImages(() => { state = 'title'; });
window.__TL = { get P() { return P; }, get G() { return G; }, get state() { return state; }, get L() { return L; }, K, press, MAP, get PROG() { return PROG; } };
})();
