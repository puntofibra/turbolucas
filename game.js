/* COSMOLUCAS - un juego de FuturMovil. Motor de plataformas + nivel 1-1 (Estación orbital). */
(() => {
'use strict';
const VERSION = '0.83';
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
// imágenes del planeta de cristal (se cargan solo cuando hacen falta)
const okI = im => !!(im && im.naturalWidth);
function xi(n, fr) { if (!IMG[n]) { const im = new Image(); if (fr) im._n = fr; im.src = 'img/' + TIER + '/' + n + '.webp?v=' + VERSION; IMG[n] = im; } return IMG[n]; }
const ICEN = { patrulla: ['enemigo-patrulla-hielo', 4, 1.12], dron: ['enemigo-dron-hielo', 4, 1.1], erizo: ['enemigo-erizo-hielo', 4, 1.25], alien: ['enemigo-alien-hielo', 4, 1.08], torreta: ['enemigo-torreta-hielo', 3, 1.05] };
const ICE_SET = ['suelo-hielo', 'plataforma-hielo', 'caja-hielo', 'carambano', 'cristal-salto', 'cristal-0', 'cristal-1', 'cristal-2', 'cometa-hielo', 'fondo-lejos-hielo', 'fondo-cerca-hielo', 'jefe2', 'jefe2-roto'];
function preIce() { ICE_SET.forEach(n => xi(n)); for (const k in ICEN) xi(ICEN[k][0], ICEN[k][1]); }
const iceI = n => L && L.theme === 'ice' && okI(IMG[n]) ? IMG[n] : null;
// imágenes del planeta volcánico
const LAVN = { patrulla: ['enemigo-patrulla-lava', 4, 1.3], dron: ['enemigo-dron-lava', 4, 1.2], erizo: ['enemigo-erizo-lava', 4, 1.3], alien: ['enemigo-alien-lava', 4, 1.25], torreta: ['enemigo-torreta-lava', 3, 1.12] };
const LAVA_SET = ['suelo-lava', 'plataforma-lava', 'caja-lava', 'cristal-lava-0', 'cristal-lava-1', 'cristal-lava-2', 'fondo-lejos-lava', 'fondo-cerca-lava', 'jefe3', 'jefe3-roto'];
function preLava() { LAVA_SET.forEach(n => xi(n)); for (const k in LAVN) xi(LAVN[k][0], LAVN[k][1]); }
const lavaI = n => L && L.theme === 'lava' && okI(IMG[n]) ? IMG[n] : null;
// imágenes de la selva
const SELN = { patrulla: ['enemigo-patrulla-selva', 4, 1.3], dron: ['enemigo-dron-selva', 4, 1.3], erizo: ['enemigo-erizo-selva', 4, 1.3], alien: ['enemigo-alien-selva', 4, 1.9], torreta: ['enemigo-torreta-selva', 3, 1.3] };
const SEL_SET = ['suelo-selva', 'plataforma-selva', 'caja-selva', 'seta-0', 'seta-1', 'seta-2', 'fondo-lejos-selva', 'fondo-cerca-selva', 'jefe4', 'jefe4-roto'];
function preSel() { SEL_SET.forEach(n => xi(n)); for (const k in SELN) xi(SELN[k][0], SELN[k][1]); }
const selI = n => L && L.theme === 'jungle' && okI(IMG[n]) ? IMG[n] : null;
const preTheme = t => { if (t === 'ice') preIce(); else if (t === 'lava') preLava(); else if (t === 'jungle') preSel(); };
function loadImages(done) {
  NAMES.forEach(n => {
    const im = new Image();
    im.onload = im.onerror = () => { if (++loaded === NAMES.length) done(); };
    im.src = 'img/' + TIER + '/' + n + '.webp?v=' + VERSION;
    if (FRAMES[n]) im._n = FRAMES[n];
    IMG[n] = im;
  });
}
$('logoImg').src = 'img/' + TIER + '/logo.webp';
$('heroImg').src = 'img/' + TIER + '/lucas-celebrando.webp';
$('rotImg').src = 'img/' + TIER + '/lucas-golpeado.webp';
// llamas de los propulsores de Lucas en la portada (por detrás del botón JUGAR)
(() => {
  const c = document.createElement('canvas'); c.id = 'heroFx'; $('title').prepend(c); const g = c.getContext('2d'), hero = $('heroImg'), sp = [];
  const NZ = [[-60, 14, 0.85], [-6.5, 0, 1.12], [46.5, 14, 0.85]];       // bocas de los cañones de "lucas-celebrando" (px HD desde el centro y desde abajo)
  let last = performance.now();
  function plume(x, y, len, w, t, sd) {
    const fl = 0.86 + 0.1 * Math.sin(t * 41 + sd * 3) + 0.07 * Math.sin(t * 77 + sd * 7), L = len * fl, sw = Math.sin(t * 23 + sd * 5) * w * 0.18;
    g.globalCompositeOperation = 'lighter';
    let gr = g.createRadialGradient(x, y + L * 0.3, 0, x, y + L * 0.3, L * 0.75 + w); gr.addColorStop(0, 'rgba(60,170,255,.35)'); gr.addColorStop(0.5, 'rgba(255,120,40,.14)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y + L * 0.3, L * 0.75 + w, 0, 6.283); g.fill();
    const lay = (ww, l2, c0, c1, s2) => { const lg = g.createLinearGradient(x, y, x, y + l2); lg.addColorStop(0, c0); lg.addColorStop(1, c1); g.fillStyle = lg; g.beginPath(); g.moveTo(x - ww / 2, y);
      g.bezierCurveTo(x - ww * 0.75, y + l2 * 0.35, x - ww * 0.2 + s2, y + l2 * 0.8, x + s2, y + l2); g.bezierCurveTo(x + ww * 0.2 + s2, y + l2 * 0.8, x + ww * 0.75, y + l2 * 0.35, x + ww / 2, y); g.closePath(); g.fill(); };
    lay(w * 1.25, L, 'rgba(255,90,30,.9)', 'rgba(255,40,10,0)', sw);
    lay(w * 0.95, L * 0.78, 'rgba(255,190,60,.95)', 'rgba(255,120,30,0)', sw * 0.7);
    lay(w * 0.62, L * 0.55, 'rgba(120,220,255,1)', 'rgba(60,140,255,0)', sw * 0.45);
    lay(w * 0.32, L * 0.36, 'rgba(255,255,255,1)', 'rgba(200,240,255,0)', sw * 0.3);
    // anillos de choque del escape
    for (let k = 0; k < 2; k++) { const p = (t * 3.2 + k * 0.5 + sd * 0.3) % 1, yy = y + L * (0.15 + p * 0.5); g.fillStyle = 'rgba(255,240,200,' + 0.35 * (1 - p) + ')'; g.beginPath(); g.ellipse(x + sw * p, yy, w * 0.32 * (1 - p * 0.5), w * 0.1, 0, 0, 6.283); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const on = $('title').classList.contains('on'); if (!on || !hero.naturalWidth) { if (c.width) { c.width = 0; c.height = 0; } return; }
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
    const W = innerWidth, H = innerHeight; if (c.width !== Math.round(W * DPR) || c.height !== Math.round(H * DPR)) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const r = hero.getBoundingClientRect(), k = r.height / 480, cx = r.left + r.width / 2, by = r.bottom;
    NZ.forEach(([ox, oy, m], i) => { const x = cx + ox * k, y = by - oy * k - 3 * k; plume(x, y, r.height * 0.8 * m, 52 * k * m, t, i);
      if (Math.random() < dt * 40) sp.push({ x: x + (Math.random() - 0.5) * 10 * k, y: y + 20 * k, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 200, life: 0.5 + Math.random() * 0.4, max: 0.9, s: 1 + Math.random() * 2.2, c: Math.random() < 0.5 ? '#ffd27a' : '#9fe6ff' }); });
    g.globalCompositeOperation = 'lighter';
    for (const q of sp) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.98; g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.s, 0, 6.283); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (let i = sp.length - 1; i >= 0; i--) if (sp[i].life <= 0) sp.splice(i, 1);
  }
  requestAnimationFrame(frame);
})();
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
// música: cada mundo tiene la suya (bajo, melodía, instrumento y ritmo propios)
const SONGS = {
  base: { bass: [110, 110, 131, 131, 98, 98, 123, 123], arp: [0, 3, 7, 12, 7, 3, 7, 12], step: 0.17, lead: 'square', bw: 'triangle', lv: 0.022, drum: 2 },
  ice: { bass: [147, 147, 117, 117, 131, 131, 98, 110], arp: [12, 7, 3, 0, 15, 12, 7, 3], step: 0.21, lead: 'sine', bw: 'sine', lv: 0.05, drum: 0, bell: true },
  lava: { bass: [82, 82, 87, 82, 98, 87, 82, 73], arp: [0, 1, 0, 7, 0, 1, 10, 7], step: 0.135, lead: 'sawtooth', bw: 'sawtooth', lv: 0.016, drum: 1, heavy: true },
  jungle: { bass: [98, 98, 110, 131, 98, 98, 147, 131], arp: [0, 7, 12, 14, 7, 12, 19, 14], step: 0.155, lead: 'triangle', bw: 'triangle', lv: 0.055, drum: 3, bell: false },
  menu: { bass: [131, 131, 175, 175, 147, 147, 196, 196], arp: [0, 4, 7, 12, 16, 12, 7, 4], step: 0.19, lead: 'triangle', bw: 'triangle', lv: 0.045, drum: 2, bell: true },     // portada: épica y alegre
  map: { bass: [110, 110, 147, 147, 165, 165, 131, 131], arp: [12, 7, 4, 0, 7, 12, 16, 12], step: 0.24, lead: 'sine', bw: 'sine', lv: 0.05, drum: 0, bell: true },           // mapas: tranquila, de aventura
  boss: { bass: [98, 104, 98, 92, 98, 104, 117, 110], arp: [0, 6, 12, 6, 0, 6, 13, 6], step: 0.14, lead: 'square', bw: 'sawtooth', lv: 0.02, drum: 1, heavy: true }
};
function musicTick() {
  const menuS = state === 'title' && $('title').classList.contains('on') ? SONGS.menu : state === 'map' && !warp ? SONGS.map : null;
  if (!AC || !sndOn || (!menuS && (state !== 'play' || paused)) || AC.state !== 'running') { mNext = 0; return; }
  if (mSong !== (menuS || 'juego')) { mSong = menuS || 'juego'; mStep = 0; mNext = 0; }
  if (!mNext || mNext < AC.currentTime) mNext = AC.currentTime + 0.05;
  const S = menuS ? menuS : L && L.boss && L.boss.fight && !L.boss.gone ? SONGS.boss : SONGS[L && L.theme] || SONGS.base;
  const stepDur = menuS ? S.step : S.step * (P && P.tStar > 0 ? 0.72 : 1) * (G.tleft <= 10 ? 0.6 : G.tleft <= 30 ? 0.74 : 1);
  while (mNext < AC.currentTime + 0.25) {
    const bar = Math.floor(mStep / 8) % 8, root = S.bass[bar], dl = mNext - AC.currentTime, nf = root * 2 * Math.pow(2, S.arp[mStep % 8] / 12);
    if (mStep % 4 === 0) tone(root / 2, root / 2, stepDur * 3.2, S.bw, S.heavy ? 0.07 : 0.11, dl);
    if (S.heavy && mStep % 2 === 0) tone(root / 2, root / 2, stepDur * 0.8, 'square', 0.05, dl);
    tone(nf, nf, stepDur * (S.bell ? 1.8 : 0.9), S.lead, S.lv, dl);
    if (S.bell && mStep % 8 === 0) tone(nf * 2, nf * 2, stepDur * 4, 'triangle', 0.025, dl);
    if (S.drum === 2 && mStep % 2 === 1) noise(0.03, 0.03, 6000, dl);
    if (S.drum === 3) { if (mStep % 4 === 0) tone(200, 120, 0.1, 'sine', 0.12, dl); if (mStep % 8 === 3 || mStep % 8 === 6) tone(320, 260, 0.06, 'sine', 0.08, dl); if (mStep % 2 === 1) noise(0.02, 0.02, 5000, dl); }
    if (S.drum === 1) { if (mStep % 4 === 0) { tone(120, 40, 0.12, 'sine', 0.16, dl); } if (mStep % 4 === 2) noise(0.06, 0.06, 2500, dl); if (mStep % 2 === 1) noise(0.02, 0.025, 8000, dl); }
    if (S.bell && mStep % 16 === 12) noise(0.3, 0.015, 9000, dl);
    mStep++; mNext += stepDur;
  }
}
let mSong = null;
function startMusic() { if (!musicT) musicT = setInterval(musicTick, 80); }
startMusic(); addEventListener('pointerdown', () => { try { audio(); } catch (e) {} }, { once: true }); addEventListener('keydown', () => { try { audio(); } catch (e) {} }, { once: true });
function setSnd(on) {
  sndOn = on; try { localStorage.setItem('tl_snd', on ? '1' : '0'); } catch (e) {}
  if (master) master.gain.value = on ? 0.55 : 0;
  $('btnSnd').textContent = 'SONIDO: ' + (on ? 'SÍ' : 'NO'); $('btnMute').style.opacity = on ? 1 : 0.45;
}

/* ---------- entrada ---------- */
const K = { left: false, right: false, down: false, jump: false, act: false };
let jumpPressed = false, actPressed = false;
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
  ArrowUp: 'jump', Space: 'jump', KeyZ: 'jump', KeyX: 'act', KeyK: 'act', ControlLeft: 'act', ControlRight: 'act' };      // sin Shift (Windows saca el aviso de teclas especiales) y sin W (Ctrl+W cerraría la pestaña)
function press(k, v) { if (v && !K[k]) { if (k === 'jump') jumpPressed = true; if (k === 'act') actPressed = true; } K[k] = v; }
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (CON.on) { if (e.code === 'Escape') closeConsole(); return; }
  if ($('adm').classList.contains('on')) return;
  const k = KEYMAP[e.code];
  if (k) { press(k, true); e.preventDefault(); }
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'play') togglePause();
  if (state === 'map') { if (e.code === 'ArrowRight' || e.code === 'KeyD') mapMove(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') mapMove(-1); else if (e.code === 'ArrowUp' || e.code === 'KeyW') mapMove(2); else if (e.code === 'ArrowDown' || e.code === 'KeyS') mapMove(-2); else if (e.code === 'Enter' || e.code === 'Space') mapPlay(); else if (e.code === 'Escape') toMenu(); return; }
  if (e.code === 'Enter') { if (state === 'title') openMap(); else if ($('panel').classList.contains('on')) { const b = $('card').querySelector('button'); if (b) b.click(); } }
});
addEventListener('keyup', e => { if ((e.target && e.target.tagName === 'INPUT') || CON.on || $('adm').classList.contains('on')) return; const k = KEYMAP[e.code]; if (k) { press(k, false); e.preventDefault(); } });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
let touchCrouchT = 0;          // en pantalla táctil, Lucas sigue agachado 1 s después de soltar ▼ (da tiempo a pulsar ▶ y meterse por un hueco bajo)
[['bL', 'left'], ['bR', 'right'], ['bD', 'down'], ['bA', 'jump'], ['bB', 'act']].forEach(([id, k]) => {
  const el = $(id);
  const on = e => { e.preventDefault(); if (k === 'jump') touchCrouchT = 0; press(k, true); el.classList.add('dn'); try { el.setPointerCapture(e.pointerId); } catch (x) {} };
  const off = e => { e.preventDefault(); if (k === 'down' && K.down) touchCrouchT = performance.now() + 1000; if (k === 'jump') touchCrouchT = 0; press(k, false); el.classList.remove('dn'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
});
document.addEventListener('contextmenu', e => e.preventDefault());
// nada de ampliar la pantalla: ni pellizco, ni doble toque, ni Ctrl+rueda
const noZoom = e => { if (e.touches && e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) e.preventDefault(); };
document.addEventListener('touchstart', noZoom, { passive: false }); document.addEventListener('touchmove', e => { if (!(e.touches.length === 1 && e.target.closest && e.target.closest('#conOut,.abody,.tbody,.pal,#uidlg .ucard'))) e.preventDefault(); }, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
let lastTap = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTap < 320) e.preventDefault(); lastTap = n; }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
const padPrev = { jump: false, act: false, left: false, right: false, down: false }; let padUsed = false;
let navI = 0, navPrev = null;
function navButtons() {            // botones que el mando puede recorrer en la pantalla que esté a la vista
  const vis = el => el && el.offsetParent !== null && !el.disabled;
  if ($('adm').classList.contains('on')) return [...$('adm').querySelectorAll('button')].filter(vis);
  if ($('ios').classList.contains('on')) return [...$('ios').querySelectorAll('button')].filter(vis);
  if ($('panel').classList.contains('on')) return [...$('card').querySelectorAll('button')].filter(vis);
  if (state === 'title' && $('title').classList.contains('on')) return [...$('title').querySelectorAll('button')].filter(vis);
  return [];
}
(() => { const st = document.createElement('style'); st.textContent = '.btn.pf{outline:3px solid #fff;outline-offset:4px;transform:scale(1.08);box-shadow:0 0 26px rgba(255,255,255,.75),0 0 14px rgba(41,230,255,.9),inset 0 0 14px rgba(41,230,255,.3)!important}'; document.head.appendChild(st); })();
function pollPad() {
  const gp = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).find(g => g);
  if (!gp) return;
  const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  padNames(gp); if (state === 'edit') { edPadPoll(gp); return; }
  if (CON.on) { padConsole(gp, b, ax, ay); return; }
  if (b(3) && !padPrev.tri && paused && $('pauseT')) pauseTapOn(true);
  padPrev.tri = b(3);
  const now = { left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), down: ay > 0.55 || b(13), jump: b(0) || b(3), act: b(2) || b(1) || b(5) };
  const up = ay < -0.55 || b(12);
  for (const k in now) { if (now[k] !== padPrev[k]) { padUsed = true; press(k, now[k]); padPrev[k] = now[k]; } }
  if (padUsed && $('touch').classList.contains('on')) show('touch', false);      // con mando fuera los botones de la pantalla
  if (b(9) && !padPrev.start && state === 'play') togglePause();
  // menús con el mando: cruceta/joystick para elegir botón, X para pulsar, Círculo para volver
  const nav = navButtons();
  if (nav.length) {
    if (nav !== navPrev) { if (!navPrev || nav.length !== navPrev.length || nav[0].textContent !== navPrev[0].textContent) navI = 0; navPrev = nav; }
    navI = Math.min(navI, nav.length - 1);
    // en ventanas con texto largo (consejos, panel): arriba/abajo o el joystick derecho desplazan el texto
    const scr = $('panel').classList.contains('on') ? $('card').querySelector('.tbody') : $('adm').classList.contains('on') ? $('abody') : null;
    const sy = scr ? (Math.abs(gp.axes[3] || 0) > 0.3 ? gp.axes[3] : ay < -0.4 || b(12) ? -1 : ay > 0.4 || b(13) ? 1 : 0) : 0;
    if (scr && sy) scr.scrollTop += sy * 14;
    const fwd = (now.right && !padPrev.mr) || (!scr && now.down && !padPrev.md), back = (now.left && !padPrev.ml) || (!scr && up && !padPrev.mu);
    if (fwd || back) { navI = (navI + (fwd ? 1 : -1) + nav.length) % nav.length; tone(900, 900, 0.04, 'square', 0.05); }
    document.querySelectorAll('.pf').forEach(el => { if (!nav.includes(el)) el.classList.remove('pf'); });
    nav.forEach((el, k) => el.classList.toggle('pf', k === navI));
    const click = el => { press('jump', false); jumpPressed = false; padPrev.jump = true; el.click(); };
    if (b(0) && !padPrev.a) click(nav[navI]);
    else if (b(1) && !padPrev.o) { const bk = nav.find(e => /^(VOLVER|MAPA|SEGUIR|ENTENDIDO|CONTINUAR|SALIR|CERRAR)/.test(e.textContent.trim())); if (bk) click(bk); }
  } else {
    if (navPrev) { navPrev.forEach(e => e.classList.remove('pf')); navPrev = null; }
    if (b(0) && !padPrev.a && state === 'map') mapPlay();
    if (b(1) && !padPrev.o && state === 'map') toMenu();
  }
  if (state === 'map' && !nav.length && mapCam) {        // L1/L2 izquierda, R1/R2 derecha y joystick derecho: mirar el mapa sin mover a Lucas
    const rx = Math.abs(gp.axes[2] || 0) > 0.25 ? gp.axes[2] : 0, ry = Math.abs(gp.axes[3] || 0) > 0.25 ? gp.axes[3] : 0, px = (b(5) || b(7) ? 1 : 0) - (b(4) || b(6) ? 1 : 0) + rx;
    if (px || ry) mapPanBy(-px * 18, -ry * 18);
  }
  if (state === 'map' && !nav.length) { if (now.right && !padPrev.mr) mapMove(1); if (now.left && !padPrev.ml) mapMove(-1); if (up && !padPrev.mu) mapMove(2); if (now.down && !padPrev.md) mapMove(-2); }
  padPrev.a = b(0); padPrev.o = b(1); padPrev.mr = now.right; padPrev.ml = now.left; padPrev.mu = up; padPrev.md = now.down;
  padPrev.start = b(9);
}


/* ---------- consola secreta de trucos (10 toques rápidos sobre PAUSA) ---------- */
const CHEAT = { test: false, full: false, ghost: false, live: false, floor: false, stop: false, kill: false, unlock: false, laser: false, fly: false, time: false, floorT: 0 };
// los trucos se guardan en el dispositivo: siguen activos al cambiar de fase, al actualizarse el juego o al volver otro día
try { const sv = JSON.parse(localStorage.getItem('tl_ch') || '{}'); for (const k in sv) if (k in CHEAT && k !== 'floorT') CHEAT[k] = !!sv[k]; } catch (e) {}
let CHT = {}; try { CHT = JSON.parse(localStorage.getItem('tl_cht') || '{}') || {}; } catch (e) {}          // cuándo se activó cada truco (duran 1 hora como máximo)
function saveCheats() { try { const o = {}, now = Date.now(); for (const k in CHEAT) { if (k === 'floorT') continue; if (CHEAT[k]) { o[k] = 1; if (!CHT[k]) CHT[k] = now; } else delete CHT[k]; }
  localStorage.setItem('tl_ch', JSON.stringify(o)); localStorage.setItem('tl_cht', JSON.stringify(CHT)); } catch (e) {} }
function cheatExpire() { const now = Date.now(); let ch = false; for (const k in CHEAT) { if (k === 'floorT' || !CHEAT[k]) continue; if (!CHT[k]) { CHT[k] = now; ch = true; } else if (now - CHT[k] > 3600e3) { CHEAT[k] = false; delete CHT[k]; ch = true; } } if (ch) saveCheats(); }
cheatExpire(); setInterval(cheatExpire, 20000);
const CON = { on: false, q: [], typing: false, busy: false, pend: [] };
const CODES = [
  ['GHOST', 'MODO FANTASMA', 'Lucas se vuelve espectral, con aura de neón. Los bichos, sus disparos y los láseres le atraviesan.'],
  ['LIVE', 'VIDAS INFINITAS', 'El contador de vidas pasa a ∞. Caer ya no cuesta nada.'],
  ['FLOOR', 'PUENTE LÁSER', 'Sobre cada hueco del suelo se tiende un puente de luz recto. Imposible caerse.'],
  ['STOP', 'FRENO DE PERSECUCIÓN', 'El muro de energía, el plasma y todo lo que te persigue se frena a tu espalda: te sigue, pero nunca te alcanza.'],
  ['KILL', 'TOQUE MORTAL', 'Cualquier bicho que toque Lucas queda fulminado al instante, también en modo fantasma. Ni el jefe se libra.'],
  ['UNLOCK', 'LLAVE MAESTRA', 'Fuera candados: todas las fases, mundos y universos abiertos.'],
  ['LASER', 'LÁSER INFINITO', 'Lucas lleva el láser siempre montado y nunca lo pierde.'],
  ['FLY', 'VUELO INFINITO', 'Mantén saltar y los propulsores te llevan volando sin límite.'],
  ['TIME', 'TIEMPO CONGELADO', 'El reloj se detiene: juega cada fase sin prisas.']
];
(() => {
  const st = document.createElement('style');
  st.textContent = `
#con{position:fixed;inset:0;z-index:55;display:none;background:#010309;font-family:"Lucida Console","Courier New",ui-monospace,monospace;color:#29e6ff;overflow:hidden}
#con.on{display:block}
#con .scr{position:absolute;inset:0;padding:calc(18px + env(safe-area-inset-top)) calc(22px + env(safe-area-inset-right)) 18px calc(22px + env(safe-area-inset-left));background:radial-gradient(ellipse at 50% 45%,#06163a 0%,#020818 60%,#000 100%);transform-origin:50% 50%}
#con.boot .scr{animation:crt .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes crt{0%{transform:scale(1,.003);filter:brightness(6)}35%{transform:scale(1,.003);filter:brightness(6)}60%{transform:scale(1.02,1.06);filter:brightness(2)}100%{transform:scale(1,1);filter:brightness(1)}}
#con.off .scr{animation:crtoff .45s ease-in both}
@keyframes crtoff{0%{transform:scale(1,1)}50%{transform:scale(1,.004);filter:brightness(5)}100%{transform:scale(0,.004);filter:brightness(8)}}
#con .scr::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,rgba(0,0,0,0) 2px 4px);z-index:2}
#con .scr::after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px rgba(0,0,0,.95),inset 0 0 30px rgba(41,230,255,.18);animation:flick 3.2s infinite;z-index:3}
@keyframes flick{0%,100%{opacity:1}47%{opacity:1}48%{opacity:.75}49%{opacity:1}82%{opacity:.92}}
#conOut{position:relative;z-index:1;height:100%;overflow-y:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;font-size:clamp(12px,2.7vh,17px);line-height:1.45;text-shadow:0 0 6px rgba(41,230,255,.85),0 0 16px rgba(41,230,255,.35);white-space:pre-wrap;word-break:break-word;padding-bottom:30px;scrollbar-width:none}
#conOut::-webkit-scrollbar{display:none}
#conOut *,.abody *,.tbody *{touch-action:pan-y}
#conOut .g{color:#35ff8a;text-shadow:0 0 6px rgba(53,255,138,.9),0 0 18px rgba(53,255,138,.4)}
#conOut .r{color:#ff4a6a;text-shadow:0 0 6px rgba(255,74,106,.9)}
#conOut .y{color:#ffd23c;text-shadow:0 0 6px rgba(255,210,60,.9)}
#conOut .d{color:#3e7fa8;text-shadow:none}
#conOut .w{color:#fff;text-shadow:0 0 8px #29e6ff,0 0 20px #29e6ff}
#conOut .big{font-size:1.5em;font-weight:900;letter-spacing:.12em}
.cur{display:inline-block;width:.62em;margin-left:1px;color:#29e6ff;font-weight:900;text-shadow:0 0 6px #29e6ff,0 0 14px #29e6ff,0 0 26px #29e6ff;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
#conIn{position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;-webkit-user-select:text!important;user-select:text!important;touch-action:manipulation}
#conX{position:absolute;z-index:4;top:calc(10px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));font:inherit;font-size:13px;color:#29e6ff;background:rgba(2,10,30,.8);border:1px solid #29e6ff;border-radius:6px;padding:6px 10px;box-shadow:0 0 12px rgba(41,230,255,.5);cursor:pointer;letter-spacing:.1em}
#conBar{position:absolute;z-index:4;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,transparent,#29e6ff,transparent);opacity:.5;animation:sweep 2.6s linear infinite}
@keyframes sweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'con';
  d.innerHTML = '<div class="scr"><div id="conOut"></div></div><button id="conX">[ X ] SALIR</button><div id="conBar"></div><input id="conIn" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="send">';
  document.body.appendChild(d);
})();
const conOut = $('conOut'), conIn = $('conIn');
/* ---------- teclado virtual de la consola (para jugar con mando): ○/□ lo muestra u oculta, △ sale, ✕ escribe, OPTIONS acepta, L1/R1 lo suben o bajan ---------- */
const VKB_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM⌫', ['ESPACIO', 'ACEPTAR']];
let vkbOn = false, vkbR = 1, vkbC = 0, vkbTop = false;
(() => {
  const st = document.createElement('style'); st.textContent = `
#vkb{position:absolute;z-index:6;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom));display:none;flex-direction:column;gap:5px;padding:9px 10px 7px;background:rgba(2,10,30,.92);border:1px solid #29e6ff;border-radius:12px;box-shadow:0 0 22px rgba(41,230,255,.45),inset 0 0 18px rgba(41,230,255,.12);width:min(96vw,560px)}
#vkb.on{display:flex}#vkb.top{bottom:auto;top:calc(48px + env(safe-area-inset-top))}
#vkb .r{display:flex;gap:5px;justify-content:center}
#vkb .k{flex:1;max-width:46px;height:clamp(26px,6.4vh,38px);display:flex;align-items:center;justify-content:center;border:1px solid rgba(41,230,255,.55);border-radius:7px;color:#cfe0ff;font:800 clamp(12px,2.8vh,16px) "Lucida Console","Courier New",monospace;background:rgba(41,230,255,.07);cursor:pointer;touch-action:manipulation}
#vkb .k.w{max-width:none;flex:3;font-size:clamp(11px,2.4vh,14px);letter-spacing:.12em}
#vkb .k.sel{background:#29e6ff;color:#010309;box-shadow:0 0 14px #29e6ff,0 0 4px #fff;transform:scale(1.08)}
#vkb .k.ok{border-color:#35ff8a;color:#35ff8a}#vkb .k.ok.sel{background:#35ff8a;color:#010309;box-shadow:0 0 14px #35ff8a}
#vkb .h{font:700 10px "Lucida Console",monospace;color:#5f86b0;text-align:center;letter-spacing:.06em}`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'vkb'; $('con').appendChild(d);
  d.innerHTML = VKB_ROWS.map((r, i) => '<div class="r">' + [...(typeof r === 'string' ? r : r)].map((k, j) => { const kk = typeof r === 'string' ? k : r[j]; return '<div class="k' + (kk.length > 1 ? ' w' : '') + (kk === 'ACEPTAR' ? ' ok' : '') + '" data-r="' + i + '" data-c="' + j + '">' + kk + '</div>'; }).join('') + '</div>').join('') + '<div class="h">✕ ESCRIBIR · ○/□ OCULTAR · △ SALIR · OPTIONS ACEPTAR · L1/R1 MOVER</div>';
  d.addEventListener('pointerdown', e => { const k = e.target.closest('.k'); if (!k) return; e.preventDefault(); e.stopPropagation(); vkbR = +k.dataset.r; vkbC = +k.dataset.c; vkbPaint(); vkbPress(); });
})();
const vkbRow = r => typeof VKB_ROWS[r] === 'string' ? [...VKB_ROWS[r]] : VKB_ROWS[r];
function vkbPaint() { $('vkb').querySelectorAll('.k').forEach(el => el.classList.toggle('sel', +el.dataset.r === vkbR && +el.dataset.c === vkbC)); }
function vkbShow(on) { vkbOn = on; const v = $('vkb'); v.classList.toggle('on', on); v.classList.toggle('top', vkbTop); if (on) { try { conIn.blur(); } catch (e) {} vkbPaint(); }
  const hgt = on ? v.offsetHeight + 24 : 0; conOut.style.paddingBottom = (on && !vkbTop ? hgt : 30) + 'px'; conOut.style.paddingTop = (on && vkbTop ? hgt : 0) + 'px'; conScroll(true); }      // el texto nunca queda tapado por el teclado
function vkbType(txt) { conIn.value = (conIn.value + txt).toUpperCase().slice(0, 30); const tx = $('conTx'); if (tx && !CON.busy) tx.textContent = conIn.value; tone(2200, 2200, 0.012, 'square', 0.03); }
function vkbEnter() { if (!conIn.value.trim()) return; if (!CON.busy) conRun(conIn.value); else { CON.pend.push(conIn.value); conIn.value = ''; } }
function vkbPress() {
  const k = vkbRow(vkbR)[vkbC];
  if (k === '⌫') { conIn.value = conIn.value.slice(0, -1); const tx = $('conTx'); if (tx && !CON.busy) tx.textContent = conIn.value; tone(900, 600, 0.04, 'square', 0.04); }
  else if (k === 'ESPACIO') vkbType(' ');
  else if (k === 'ACEPTAR') vkbEnter();
  else vkbType(k);
}
const padRep = {};
function padHeld(name, on) {         // pulsación con repetición si se mantiene
  const t = performance.now(), st = padRep[name];
  if (!on) { padRep[name] = null; return false; }
  if (!st) { padRep[name] = { next: t + 340 }; return true; }
  if (t >= st.next) { st.next = t + 110; return true; }
  return false;
}
function padConsole(gp, b, ax, ay) {
  const P0 = padPrev, edge = (i, k) => { const v = b(i), r = v && !P0[k]; P0[k] = v; return r; };
  if (edge(3, 'ctri')) { closeConsole(); return; }
  if (edge(1, 'ccir') | edge(2, 'csq')) { vkbShow(!vkbOn); tone(700, 1000, 0.06, 'square', 0.05); }
  if (edge(9, 'cst')) vkbEnter();
  const sy = gp.axes[3] || 0; if (Math.abs(sy) > 0.3) { conOut.scrollTop += sy * 14; conHold = performance.now() + 4000; }
  const L = padHeld('l', ax < -0.5 || b(14)), R = padHeld('r', ax > 0.5 || b(15)), U = padHeld('u', ay < -0.5 || b(12)), D = padHeld('d', ay > 0.5 || b(13));
  const xEdge = edge(0, 'cx'); if (xEdge && conTapSkip()) return;
  if (!vkbOn) { if (U || D) { conOut.scrollTop += U ? -60 : 60; conHold = performance.now() + 4000; } if (xEdge && !CON.typing) vkbEnter(); return; }
  if (edge(4, 'cl1') | edge(5, 'cr1')) { vkbTop = !vkbTop; vkbShow(true); }
  if (L || R || U || D) {
    const old = vkbRow(vkbR).length;
    if (L) vkbC = (vkbC - 1 + old) % old; if (R) vkbC = (vkbC + 1) % old;
    if (U || D) { const nr = (vkbR + (U ? -1 : 1) + VKB_ROWS.length) % VKB_ROWS.length, nl = vkbRow(nr).length; vkbC = Math.min(nl - 1, Math.round(vkbC * (nl - 1) / Math.max(1, old - 1))); vkbR = nr; }
    vkbPaint(); tone(1300, 1300, 0.02, 'square', 0.03);
  }
  if (xEdge && !CON.typing) { vkbPress(); const el = $('vkb').querySelector('.k.sel'); if (el) { el.style.transform = 'scale(.9)'; setTimeout(() => el.style.transform = '', 90); } }
}

let conLine = null, conTimer = null;
let conHold = 0;      // si el jugador sube a leer, no le bajamos de golpe
function conScroll(force) { if (force) conHold = 0; if (!force && conHold > performance.now()) return; conOut.scrollTop = conOut.scrollHeight; }
conOut.addEventListener('wheel', () => { conHold = performance.now() + 4000; }, { passive: true }); conOut.addEventListener('touchmove', () => { conHold = performance.now() + 4000; }, { passive: true });
function conPrompt() {        // línea de escritura con el cursor _ parpadeando
  conLine = document.createElement('div'); conLine.innerHTML = '<span class="g">C:\\LUCAS&gt;</span> <span class="w" id="conTx"></span><span class="cur">_</span>';
  conOut.appendChild(conLine); CON.busy = false; $('conTx').textContent = conIn.value; conScroll();
  if (CON.pend.length) conRun(CON.pend.shift());
}
// cola de salida: cada línea se escribe letra a letra (o de golpe si fast)
function say(txt, cls = '', speed = 18, fast = false) { CON.q.push({ txt, cls, speed, fast }); if (!CON.typing) conPump(); }
function conPump() {
  const it = CON.q.shift();
  if (!it) { CON.typing = false; CON.skip = false; if (CON.on && CON.busy) conPrompt(); return; }
  CON.typing = true;
  const el = document.createElement('div'); if (it.cls) el.className = it.cls; conOut.appendChild(el);
  if (it.fast || !it.txt || CON.skip) { el.textContent = it.txt || ' '; conScroll(); if (CON.skip) conPump(); else conTimer = setTimeout(conPump, it.fast ? 28 : 60); return; }
  let i = 0; const cur = document.createElement('span'); cur.className = 'cur'; cur.textContent = '_';
  const step = () => { if (!CON.on) return; if (CON.skip) { el.textContent = it.txt; conScroll(); conPump(); return; } el.textContent = it.txt.slice(0, ++i); el.appendChild(cur);
    if (i % 2 === 0) tone(1800 + Math.random() * 400, 1800, 0.012, 'square', 0.025); conScroll();
    if (i < it.txt.length) conTimer = setTimeout(step, it.speed); else { cur.remove(); conTimer = setTimeout(conPump, 90); } };
  step();
}
// 3 pulsaciones rápidas (espacio, ✕ del mando o clic) mientras escribe: saca todo el texto de golpe
let conTaps = [];
function conTapSkip() {
  if (!CON.typing) return false; const t = performance.now(); conTaps = conTaps.filter(x => t - x < 700); conTaps.push(t);
  if (conTaps.length >= 3) { conTaps = []; CON.skip = true; clearTimeout(conTimer); conPump(); return true; }
  return false;
}
let pauseTap = { n: 0, t: 0 };
function pauseTapOn(pad) {
  const now = performance.now(); pauseTap = now - pauseTap.t < 600 ? { n: pauseTap.n + 1, t: now } : { n: 1, t: now };
  if (pauseTap.n >= 10) { pauseTap = { n: 0, t: 0 }; openConsole(pad === true); }
}
function openConsole(fromPad) {
  audio(); CON.on = true; CON.q = []; CON.typing = false; CON.busy = true; CON.pend = []; conIn.value = ''; clearTimeout(conTimer); conOut.innerHTML = '';
  for (const k in K) K[k] = false;
  const c = $('con'); c.classList.remove('off'); c.classList.add('on', 'boot'); setTimeout(() => c.classList.remove('boot'), 800);
  padPrev.ctri = true; padPrev.cx = true;
  if (fromPad) setTimeout(() => vkbShow(true), 900); else { try { conIn.focus({ preventScroll: true }); } catch (e) {} }
  tone(60, 900, 0.5, 'sawtooth', 0.06); tone(3000, 3000, 0.25, 'sine', 0.03, 0.3);
  setTimeout(() => {
    say('TURBO-OS 5G  ·  (C) FUTURMOVIL SYSTEMS', 'w big', 22);
    say('------------------------------------------', 'd', 0, true);
    say('MEMORIA ............. 640K  OK', '', 0, true);
    say('NÚCLEO LUCAS ........ ONLINE', '', 0, true);
    say('PROPULSORES x3 ...... CALIBRADOS', '', 0, true);
    say('ENLACE 5G ........... CONECTADO', 'g', 0, true);
    say('', '', 0, true);
    say(activeTxt(), 'y', 0, true);
  }, 650);
}
function closeConsole() {
  if (!CON.on) return; CON.on = false; CON.q = []; clearTimeout(conTimer); try { conIn.blur(); } catch (e) {}
  vkbShow(false); { const qb = $('conQr'); if (qb) qb.remove(); } const c = $('con'); c.classList.add('off'); tone(900, 50, 0.35, 'sawtooth', 0.06);
  setTimeout(() => { c.classList.remove('on', 'off'); }, 460);
}
const activeTxt = () => { const a = CODES.filter(c => CHEAT[c[0].toLowerCase()]).map(c => c[0]); return 'TRUCOS ACTIVOS: ' + (a.length ? a.join(' · ') : 'NINGUNO'); };
const HEX = '0123456789ABCDEF', rh = n => { let o = ''; for (let i = 0; i < n; i++) o += HEX[Math.random() * 16 | 0]; return o; };
function conRun(raw) {
  const cmd = raw.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  if (conLine) { const cu = conLine.querySelector('.cur'); if (cu) cu.remove(); const tx = conLine.querySelector('#conTx'); if (tx) { tx.textContent = raw.toUpperCase(); tx.removeAttribute('id'); } }
  conIn.value = ''; CON.busy = true;
  conScroll(true);
  if (!cmd) { say('', '', 0, true); return; }
  if (cmd === 'HACK') {
    const fake = ['> conectando con el núcleo de la estación…', 'mov eax, 0x' + rh(8) + '   ; propulsor_izq', 'jmp 0x' + rh(4) + ':LUCAS_CORE', 'call bypass_firewall(' + rh(6) + ')',
      'xor ebx, ebx ; borrando rastro', 'push 0x5G00' + rh(4), 'decrypt(sector_' + rh(2) + ') .......... OK', 'inject turbo.dll → 0x' + rh(8), 'while(lucas.alive) { energy++; }', 'sudo override --robot=LUCAS --mode=GOD'];
    fake.forEach(l => say(l, 'd', 0, true));
    [12, 31, 58, 77, 94, 100].forEach(pc => say('[' + '█'.repeat(Math.round(pc / 5)) + ' '.repeat(20 - Math.round(pc / 5)) + '] ' + pc + '%', pc === 100 ? 'g' : '', 0, true));
    say('*** ACCESO CONCEDIDO ***', 'g big', 30);
    say('CÓDIGOS SECRETOS DISPONIBLES:', 'w', 16);
    CODES.forEach(c => { say(c[0] + '  -  ' + c[1], 'y', 26); say('   ' + c[2], '', 9); });
    say('OPEN  -  ACTIVA TODOS LOS TRUCOS A LA VEZ', 'y', 20); say('CLOSE  -  DESACTIVA TODOS LOS TRUCOS', 'y', 20); say('LOCK  -  BLOQUEA TODOS LOS CANDADOS (EMPIEZA DE CERO)', 'y', 20); say('TEST  -  MODO PRUEBAS: LOS TRUCOS COMO BOTONES EN LA PAUSA', 'y', 20);
    say('Escribe un código para activarlo o desactivarlo.', 'd', 10);
    SFX.power(); return;
  }
  const code = CODES.find(c => c[0] === cmd || (cmd === 'LIVES' && c[0] === 'LIVE'));
  if (code) {
    const k = code[0].toLowerCase(); CHEAT[k] = !CHEAT[k]; if (k === 'floor') CHEAT.floorT = 0; saveCheats();
    if (CHEAT[k]) { say('>> ' + code[1] + ' ACTIVADO ✔', 'g big', 26); say('   ' + code[2], '', 10); SFX.power(); }
    else { say('>> ' + code[1] + ' DESACTIVADO', 'r', 22); tone(500, 120, 0.3, 'square', 0.06); }
    say(activeTxt(), 'y', 0, true); return;
  }
  if (cmd === 'OPEN') { CODES.forEach(c => CHEAT[c[0].toLowerCase()] = true); CHEAT.floorT = 0; saveCheats(); say('>> TODOS LOS TRUCOS ACTIVADOS ✔', 'g big', 24); CODES.forEach(c => say('   ✔ ' + c[0] + ' · ' + c[1], 'g', 0, true)); SFX.power(); return; }
  if (cmd === 'CLOSE') { CODES.forEach(c => CHEAT[c[0].toLowerCase()] = false); saveCheats(); say('>> TODOS LOS TRUCOS DESACTIVADOS', 'r big', 22); tone(500, 120, 0.3, 'square', 0.06); say(activeTxt(), 'y', 0, true); return; }
  if (cmd === 'TEST') { CHEAT.test = !CHEAT.test; if (CHEAT.test) CODES.forEach(c => CHEAT[c[0].toLowerCase()] = false); saveCheats();
    if (CHEAT.test) { say('>> MODO PRUEBAS ACTIVADO 🧪', 'g big', 24); say('   Pulsa PAUSA en cualquier fase: saldrán todos los trucos como botones para activarlos o quitarlos al momento. Empiezan todos apagados.', '', 10); SFX.power(); }
    else { say('>> MODO PRUEBAS DESACTIVADO', 'r', 22); tone(500, 120, 0.3, 'square', 0.06); } return; }
  if (cmd === 'FULLACCESS' || cmd === 'FULL ACCESS') { CHEAT.full = !CHEAT.full; saveCheats();
    if (CHEAT.full) { say('>> FULL ACCESS ACTIVADO ✔', 'g big', 26); say('   Licencia gratis en este dispositivo: todo el juego desbloqueado, sin cartel de pago.', '', 10); SFX.power(); }
    else { say('>> FULL ACCESS DESACTIVADO', 'r', 22); say('   Vuelve a hacer falta la licencia desde la fase 3-2.', '', 10); tone(500, 120, 0.3, 'square', 0.06); } return; }
  if (cmd === 'LOCK') { PROG = {}; DEV = {}; GOT = {}; PRV = Date.now(); try { localStorage.setItem('tl_rv', String(PRV)); } catch (e) {} CHEAT.unlock = false; saveCheats(); try { localStorage.setItem('tl_prog', '{}'); localStorage.setItem('tl_dev', '{}'); localStorage.setItem('tl_got', '{}'); } catch (e) {} setWorld(0); mapSel = mapAt = 0; mapL = { x: MAP[0].x, y: MAP[0].y }; cloudSave(true);
    say('>> TODOS LOS CANDADOS BLOQUEADOS 🔒', 'r big', 24); say('   El juego vuelve a empezar desde la fase 1-1, como si nunca hubieras jugado.', '', 10); tone(400, 90, 0.5, 'sawtooth', 0.06); return; }
  if (cmd === 'ADMIN') { conAdmin(); return; }
  if (cmd === 'CLS' || cmd === 'LIMPIAR') { conOut.innerHTML = ''; say('', '', 0, true); return; }
  if (cmd === 'SALIR' || cmd === 'EXIT') { closeConsole(); return; }
  say('ERROR 0x' + rh(4) + ' · CÓDIGO "' + cmd.slice(0, 20) + '" NO RECONOCIDO', 'r', 12); tone(140, 90, 0.3, 'square', 0.08);
}
conIn.addEventListener('input', () => { conIn.value = conIn.value.toUpperCase().slice(0, 30); const tx = $('conTx'); if (tx && !CON.busy) tx.textContent = conIn.value; tone(2200, 2200, 0.01, 'square', 0.03); conScroll(); });
conIn.addEventListener('keydown', e => { e.stopPropagation();
  if (e.key === ' ' && CON.typing) { e.preventDefault(); conTapSkip(); return; }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); const st = /Page/.test(e.key) ? conOut.clientHeight * 0.8 : 60; conOut.scrollTop += /Up/.test(e.key) ? -st : st; conHold = conOut.scrollHeight - conOut.scrollTop - conOut.clientHeight > 20 ? performance.now() + 4000 : 0; return; }
  if (e.key === 'Enter') { e.preventDefault(); if (!CON.busy) conRun(conIn.value); else if (conIn.value.trim()) { CON.pend.push(conIn.value); conIn.value = ''; } } else if (e.key === 'Escape') closeConsole(); });
const conKb = e => { if (e.target.id === 'conX' || (e.target.closest && e.target.closest('#vkb'))) return; try { conIn.blur(); conIn.focus({ preventScroll: true }); conIn.click(); } catch (x) {} };      // tocar la pantalla vuelve a sacar el teclado
let conTy = 0, conMoved = false;
$('con').addEventListener('touchstart', e => { conTy = e.touches[0].clientY; conMoved = false; }, { passive: true });
$('con').addEventListener('touchmove', e => { if (Math.abs(e.touches[0].clientY - conTy) > 10) conMoved = true; }, { passive: true });
$('con').addEventListener('pointerdown', e => { if (e.target.id !== 'conX' && !(e.target.closest && e.target.closest('#vkb'))) conTapSkip(); });
$('con').addEventListener('pointerup', e => { if (!conMoved) conKb(e); }); $('con').addEventListener('touchend', e => { if (!conMoved) conKb(e); });
$('conX').addEventListener('click', closeConsole);

/* ---------- nivel 1-1: Estación orbital ---------- */
let L = null;
const LEVELS = {};
LEVELS['1-1'] = function () {
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
  set(5, 10, 'I'); boxes['5,10'] = 'vida';
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
};
function calcPlats(g, W, H) { const plats = []; for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (g[y][x] === '=') { let x1 = x; while (x1 + 1 < W && g[y][x1 + 1] === '=') x1++; plats.push({ x0: x, x1, ty: y }); x = x1 + 1; } else x++; } } return plats; }
// ayudante para construir fases: todo en casillas (48 px); la fila H-2 es el suelo
function LB(W, H) {
  const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(' '));
  const B = { W, H, g, boxes: {}, chips: [], gears: [], ents: [], portals: [], cps: [], pads: [], lasers: [], movers: [], strips: [], lifts: [] };
  B.set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  B.block = (x0, x1, y0, y1, c = '#') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) B.set(x, y, c); };
  B.ground = (a, b) => B.block(a, b, H - 2, H - 1);
  B.box = (x, y, what) => { B.set(x, y, '?'); B.boxes[x + ',' + y] = what; };
  B.hid = (x, y, what) => { B.set(x, y, 'I'); B.boxes[x + ',' + y] = what; };      // bloque invisible: solo aparece al darle con la cabeza
  B.chip = (x, y) => B.chips.push({ x: x * T + T / 2, y: y * T + T / 2, t: Math.random() * 6 });
  B.row = (a, b, y) => { for (let x = a; x <= b; x++) B.chip(x, y); };
  B.arc = (a, b, y, hgt) => { for (let x = a; x <= b; x++) { const k = (x - a) / Math.max(1, b - a); B.chip(x, y - Math.sin(k * Math.PI) * hgt); } };
  B.gear = (x, y) => B.gears.push({ x: x * T + T / 2, y: y * T + T / 2 });
  B.en = (type, x, y, o = {}) => B.ents.push(Object.assign({ type, tx: x, ty: y }, o));
  B.cp = (x, ty) => B.cps.push({ x: x * T + T / 2, y: ty * T, on: false });
  B.pad = (x, ty) => B.pads.push({ x: x * T, y: ty * T, w: T, t: 9 });
  B.laser = (tx, r0, r1, ph = 0, on = 1.3, off = 1.6) => B.lasers.push({ x: tx * T + T / 2, y0: r0 * T, y1: (r1 + 1) * T, ph, on, off });
  B.mover = (x, ty, wt, ax, ay, sp, ph = 0) => B.movers.push({ bx: x * T, by: ty * T, w: wt * T, ax, ay, sp, ph, x: x * T, y: ty * T, dx: 0, dy: 0 });
  B.portal = (x, ty, tox, toty) => B.portals.push({ x: x * T + T / 2, y: ty * T - 46, tox: tox * T + T / 2, toy: toty * T });
  B.strip = (a, b, ty = H - 2) => B.strips.push({ x0: a * T, x1: (b + 1) * T, y: ty * T });
  B.lift = (a, b, r0, r1) => B.lifts.push({ x0: a * T, x1: (b + 1) * T, y0: r0 * T, y1: (r1 + 1) * T, ph: Math.random() });
  B.icicle = (x, ty, big) => (B.icicles = B.icicles || []).push({ x0: x * T + T / 2, y0: ty * T, big: !!big });              // carámbano colgando del techo (borde inferior de la fila ty-1)
  B.spring = (x, ty) => B.pads.push({ x: x * T, y: ty * T, w: T, t: 9, crystal: true });                                    // cristal saltarín
  B.wind = (a, b, r0, r1, f, ph = 0) => (B.winds = B.winds || []).push({ x0: a * T, x1: (b + 1) * T, y0: r0 * T, y1: (r1 + 1) * T, f, ph });   // ráfagas
  B.fake = (x0, x1, y0, y1) => B.block(x0, x1, y0, y1, 'F');                                                                   // pared falsa: se atraviesa
  B.pitWarp = (a, b, tox, toty) => (B.warps = B.warps || []).push({ x0: a * T, x1: (b + 1) * T, tox: tox * T + T / 2, toy: toty * T });  // agujero que lleva a una zona secreta
  B.crystal = (x, ty, c, h) => (B.crys = B.crys || []).push({ x: x * T + T / 2, y: ty * T, c: c || 0, h: h || 1 });
  B.key = (x, y) => (B.keys = B.keys || []).push({ x: x * T + T / 2, y: y * T + T / 2, got: false });          // llave: hacen falta todas para abrir la puerta 'D'
  B.door = (x, y0, y1) => B.block(x, x, y0, y1, 'D');
  B.pipe = (x, ty, tox, toty, hid) => (B.pipes = B.pipes || []).push({ x: x * T, y: ty * T, tox: tox * T + T / 2, toy: toty * T, hid: !!hid });   // tubería: agáchate encima para viajar (las ocultas no se ven)
  B.jumper = (x, ty, h, ph = 0, per = 2.6) => (B.jumpers = B.jumpers || []).push({ x: x * T + T / 2, by: ty * T, h: h * T, ph, per, y: ty * T });   // bola de magma que salta de la lava
  B.lavafall = (tx, r0, r1, ph = 0, on = 1.6, off = 1.8) => B.lasers.push({ x: tx * T + T / 2, y0: r0 * T, y1: (r1 + 1) * T, ph, on, off, lava: true });  // cortina de lava que se abre y se cierra
  B.snowgun = (x, ty, dir, per = 3, ph = 0) => (B.guns = B.guns || []).push({ x: x * T + T / 2, y: ty * T, dir, per, ph, t: ph });     // cañón de bolas de nieve
  B.mush = (x, ty, c = 0) => { B.block(x, x + 1, ty - 1, ty - 1, '='); B.pads.push({ x: x * T, y: (ty - 1) * T, w: 2 * T, t: 9, mush: true, c }); };     // seta trampolín (2 casillas, sombrero en la fila ty-1)
  B.vine = (x, r0, r1) => (B.vines = B.vines || []).push({ x: x * T + T / 2, y0: r0 * T, y1: (r1 + 1) * T });          // liana para trepar
  B.spore = (x, ty, h = 6, ph = 0, per = 3) => (B.spores = B.spores || []).push({ x: x * T + T / 2, y: ty * T, h: h * T, ph, per });   // chorro de esporas: te lanza hacia arriba
  B.fly = (x, y) => (B.flyb = B.flyb || []).push({ x: x * T + T / 2, y: y * T + T / 2, got: false });          // luciérnaga: te sigue y te alumbra
  B.raft = (x, ty, w, v) => B.movers.push({ bx: x * T, by: ty * T, w: w * T, ax: 0, ay: 0, sp: 0, ph: 0, x: x * T, y: ty * T, dx: 0, dy: 0, raft: true, v });   // balsa que baja por el río
  B.kitp = (x, ty, kind) => (B.kitP = B.kitP || []).push({ x: x * T + T / 2, y: ty * T, kind, st: 0, t: 0 });          // poder para el jefe (cristal de hielo o forja)
  B.cog = (x, ty, r) => (B.cogs = B.cogs || []).push({ x: x * T + T / 2, y: ty * T + T / 2, r: r * T });                    // engranaje gigante de fondo
  B.geyser = (x, ty, h, ph = 0, per = 3.2) => (B.geysers = B.geysers || []).push({ x: x * T + T / 2, y: ty * T, h: h * T, ph, per });   // géiser de fuego que sale del suelo
  B.fall = (x, ty, wt) => B.movers.push({ bx: x * T, by: ty * T, w: wt * T, ax: 0, ay: 0, sp: 0, ph: 0, x: x * T, y: ty * T, dx: 0, dy: 0, fall: true, st: 0, ft: 0, vy: 0 });   // roca que se hunde al pisarla
  B.done = o => { B.plats = calcPlats(g, W, H); return Object.assign(B, o); };
  return B;
}

/* ---------- fase 1-2: PASILLOS DE SERVICIO (a oscuras, láseres, laberinto de tres pisos y lluvia de chips) ---------- */
LEVELS['1-2'] = function () {
  const B = LB(338, 16);
  // A · entrada
  B.ground(0, 80); B.row(6, 10, 12); B.box(13, 10, 'escudo'); B.en('patrulla', 22, 13); B.hid(20, 10, 'vida');
  // B · pasillo con láseres abajo, ruta alta por encima
  B.block(28, 29, 12, 12, '='); B.block(31, 32, 10, 10, '=');
  B.block(34, 78, 9, 10);
  B.laser(42, 11, 13, 0); B.row(44, 47, 13); B.laser(50, 11, 13, 1.0); B.row(52, 55, 13); B.laser(58, 11, 13, 2.0); B.en('alien', 63, 13); B.laser(68, 11, 13, 0.5); B.row(70, 76, 13);
  B.row(36, 44, 8); B.en('erizo', 52, 8); B.row(56, 62, 8); B.en('patrulla', 68, 8); B.gear(77, 7);
  // C · laberinto de tres pisos (se sube con las plataformas de salto)
  B.ground(84, 150);
  B.block(90, 127, 10, 10); B.block(122, 124, 10, 10, '=');
  B.block(90, 127, 6, 6); B.block(92, 94, 6, 6, '=');
  B.block(89, 90, 6, 10); B.block(127, 128, 6, 13);
  B.row(92, 96, 13); B.en('alien', 100, 13); B.laser(106, 11, 13, 0.3); B.row(108, 112, 13); B.en('patrulla', 116, 13); B.pad(123, 14); B.gear(126, 13);
  B.row(118, 121, 9); B.laser(115, 7, 9, 1.2); B.en('erizo', 110, 9); B.box(108, 7, 'laser'); B.laser(103, 7, 9, 0.2); B.row(96, 101, 9); B.pad(93, 10);
  B.row(96, 104, 5); B.en('dron', 108, 3, { x0: 104, x1: 114 }); B.row(110, 120, 5); B.en('torreta', 124, 5); B.arc(129, 132, 6, 2);
  // D · portal a la sala secreta y plataformas móviles sobre el vacío
  B.cp(134, 14); B.block(139, 141, 11, 11, '='); B.portal(140, 11, 306, 14); B.row(144, 148, 12);
  B.mover(152, 13, 3, 60, 0, 1.3, 0); B.mover(158, 12, 3, 0, 60, 1.5, 1); B.mover(164, 13, 3, 60, 0, 1.4, 2); B.row(153, 167, 9);
  // E · galería de láseres
  B.ground(170, 230);
  B.box(174, 10, 'estrella'); B.en('alien', 176, 13); B.laser(181, 6, 13, 0); B.row(183, 185, 12); B.pad(186, 14); B.block(186, 188, 8, 8, '='); B.gear(187, 6); B.laser(191, 6, 13, 1.4); B.row(193, 196, 12);
  B.laser(198, 6, 13, 0.7); B.box(202, 10, 'iman'); B.en('dron', 206, 10, { x0: 201, x1: 212 }); B.block(214, 217, 12, 13); B.en('torreta', 216, 11); B.row(220, 224, 11);
  // F · recta final con fosos, túnel bajo y escalera
  B.cp(227, 14); B.ground(234, 240); B.arc(230, 234, 11, 2); B.en('erizo', 237, 13); B.ground(244, 299); B.arc(240, 244, 11, 2);
  B.en('patrulla', 248, 13); B.block(252, 260, 10, 12); B.block(262, 262, 13, 13); B.row(252, 260, 13); B.box(264, 10, 'chip'); B.en('patrulla', 268, 13); B.en('patrulla', 273, 13); B.en('erizo', 278, 13);
  for (let i = 1; i <= 4; i++) B.block(281 + i, 281 + i, 14 - i, 13);
  B.row(282, 285, 8); B.block(296, 301, 0, 15);
  // sala secreta: lluvia de chips
  B.ground(302, 337); B.block(334, 337, 0, 15); B.portal(331, 14, 146, 14); B.hid(302, 10, 'iman');
  return B.done({ name: 'PASILLOS DE SERVICIO', time: 270, dark: true, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 291 * T + T / 2, y: 14 * T }, rain: { x0: 304 * T, x1: 330 * T, dur: 13, t: 0, st: 0, acc: 0 } });
};
/* ---------- fase 1-3: SALA DE MÁQUINAS (persecución: un muro de energía te sigue; cintas turbo y saltos largos) ---------- */
LEVELS['1-3'] = function () {
  const B = LB(340, 16);
  // A · arranque y primeros fosos
  B.ground(0, 23); B.row(5, 9, 12); B.box(11, 10, 'escudo');
  B.ground(27, 33); B.arc(23, 27, 11, 2); B.en('patrulla', 30, 13); B.ground(37, 78); B.arc(33, 37, 11, 2);
  B.en('erizo', 43, 13); B.hid(45, 10, 'vida'); B.block(50, 52, 11, 13); B.block(49, 49, 13, 13); B.gear(51, 8); B.row(54, 58, 12); B.en('alien', 59, 13);
  // B · cintas turbo con saltos largos
  B.strip(63, 78); B.row(64, 77, 12); B.arc(79, 85, 10, 3); B.ground(86, 101); B.strip(87, 101); B.row(88, 100, 12); B.arc(102, 108, 10, 3); B.ground(109, 118);
  B.cp(112, 14); B.box(115, 10, 'iman');
  // C · plataformas flotantes sobre el vacío
  B.mover(120, 13, 3, 0, 36, 2.0, 0); B.mover(125, 12, 3, 0, 36, 2.0, 1.5); B.mover(130, 12, 3, 0, 36, 2.0, 3); B.mover(135, 13, 3, 0, 36, 2.0, 4.5); B.row(120, 137, 9);
  B.ground(140, 232); B.en('alien', 146, 13); B.block(152, 155, 12, 13); B.en('torreta', 154, 11); B.row(157, 161, 12); B.en('patrulla', 163, 13);
  // D · dos rutas: por arriba con el saltador (chips y drones) o por abajo (láseres y engranaje)
  B.pad(168, 14); B.block(170, 200, 8, 9); B.row(172, 180, 7); B.en('dron', 184, 5, { x0: 180, x1: 190 }); B.row(186, 198, 7); B.en('erizo', 194, 7);
  B.laser(176, 10, 13, 0, 0.9, 1.3); B.laser(183, 10, 13, 0.7, 0.9, 1.3); B.gear(187, 13); B.laser(191, 10, 13, 1.4, 0.9, 1.3); B.row(193, 198, 13);
  B.cp(205, 14); B.box(208, 10, 'estrella');
  // E · sprint final con cintas turbo
  B.strip(211, 232); B.row(212, 220, 12); B.en('patrulla', 222, 13); B.en('patrulla', 227, 13); B.arc(233, 239, 10, 3); B.gear(236, 9);
  B.ground(240, 258); B.strip(241, 258); B.row(242, 257, 12); B.arc(259, 265, 10, 3); B.ground(266, 339);
  // F · remate
  B.en('alien', 272, 13); B.block(278, 280, 12, 13); B.block(283, 285, 10, 13); B.block(288, 290, 12, 13); B.row(278, 290, 7); B.en('dron', 296, 10, { x0: 293, x1: 302 }); B.en('erizo', 306, 13);
  for (let i = 1; i <= 4; i++) B.block(311 + i, 311 + i, 14 - i, 13);
  B.row(312, 315, 8); B.block(332, 339, 0, 15);
  return B.done({ name: 'SALA DE MÁQUINAS', time: 200, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 324 * T + T / 2, y: 14 * T }, chase: { x: -9999, speed: 192, startX: 15 * T, on: false } });
};
/* ---------- fase 1-4: TORRE DE ANTENAS (escalada vertical: el plasma sube, ascensores antigravedad, plataformas que suben y bajan, techo de cajas) ---------- */
LEVELS['1-4'] = function () {
  const H = 112, B = LB(34, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 10, H - 1); B.block(31, 33, 10, H - 1);           // paredes de la torre
  // A · base de la torre
  B.block(3, 30, H - 2, H - 1); B.row(6, 10, 108); B.box(16, 106, 'escudo'); B.hid(12, 106, 'vida'); B.en('patrulla', 22, 109);
  P(24, 28, 107); B.row(24, 28, 106); P(18, 22, 104); P(10, 14, 101); B.en('alien', 12, 100); P(4, 8, 98); B.arc(4, 8, 96, 1);
  // B · láser y saltador
  P(9, 13, 95); P(15, 19, 92); B.en('patrulla', 16, 91); B.laser(18, 87, 91, 0, 1.1, 1.5); P(23, 28, 89); B.row(23, 28, 88); B.cp(27, 89);      // láser anclado del techo (repisa) al suelo de la plataforma
  B.block(14, 22, 86, 86); B.pad(15, 86); B.row(17, 21, 85); B.box(19, 82, 'chip'); B.box(20, 82, 'chip');
  B.block(3, 5, 84, 84); B.gear(4, 82); B.arc(6, 12, 84, 2);                  // engranaje 1: a la izquierda del saltador
  // C · ascensor antigravedad entre drones
  P(12, 17, 79); B.en('alien', 14, 78); B.box(15, 75, 'estrella'); P(19, 23, 81);
  B.lift(20, 22, 62, 78); for (let r = 64; r <= 76; r += 2) B.chip(21, r);
  B.en('dron', 21, 72, { x0: 14, x1: 27 }); B.en('dron', 21, 66, { x0: 15, x1: 28 });
  P(23, 28, 63); B.cp(26, 63); P(13, 18, 63); B.gear(14, 61); B.row(15, 18, 62);   // engranaje 2: al salir del ascensor por la izquierda
  // D · plataformas que suben y bajan bajo el fuego de la torreta
  B.mover(18, 61, 3, 0, 36, 1.3, 0); B.mover(12, 58, 3, 0, 36, 1.3, 3.14); B.mover(6, 55, 3, 0, 36, 1.3, 0); B.mover(12, 52, 3, 0, 36, 1.3, 3.14); B.mover(18, 49, 3, 0, 36, 1.3, 0);
  P(12, 16, 46); B.arc(12, 15, 55, 1); B.arc(6, 9, 52, 1); B.arc(12, 15, 49, 1); B.row(12, 16, 45); B.block(25, 30, 49, 49); B.en('torreta', 28, 48); B.row(25, 27, 48);
  P(4, 9, 43); B.box(5, 39, 'turbo');
  // E · techo de cajas rompibles
  P(11, 15, 40); P(16, 20, 37); B.block(3, 15, 34, 34); B.block(21, 30, 34, 34); B.block(16, 20, 34, 34, 'B');
  B.en('erizo', 9, 33); B.en('patrulla', 26, 33); B.pad(23, 34); B.block(26, 30, 28, 28); B.gear(29, 26); B.row(26, 28, 27);   // engranaje 3: saltador hasta la repisa
  P(4, 8, 31); P(10, 14, 28); B.box(12, 24, 'laser'); P(16, 20, 25); B.en('dron', 18, 21, { x0: 8, x1: 26 }); P(10, 14, 22); P(4, 8, 19); B.cp(6, 19);
  P(8, 12, 16); B.row(8, 12, 15); P(4, 8, 13);
  // F · la cima: antena 5G
  P(3, 7, 11); B.block(9, 30, 10, 11); B.en('patrulla', 14, 9); B.en('patrulla', 19, 9); B.arc(9, 22, 7, 3); B.box(17, 5, 'chip');
  return B.done({ name: 'TORRE DE ANTENAS', time: 210, vert: true, spawn: { x: 5 * T, y: (H - 2) * T }, goal: { x: 26 * T + T / 2, y: 10 * T }, rise: { y: H * T + 400, speed: 26, startY: 103 * T, on: false } });
};
/* ---------- fase secreta 1-B: PASEO ESPACIAL (gravedad lunar, lluvia de meteoritos, islas flotantes y lluvia de chips final) ---------- */
LEVELS['1-B'] = function () {
  const H = 22, B = LB(166, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  const shape = (x, y, rows) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') B.chip(x + i, y + j); }));
  // A · el "5G" de chips en el cielo
  B.ground(0, 16); B.row(4, 7, 18); P(8, 13, 15); B.hid(15, 16, 'vida'); shape(8, 8, ['###.###', '#...#..', '###.#.#', '..#.#.#', '###.###']);
  // B · primeros saltos lunares
  B.arc(16, 22, 16, 3); B.ground(22, 30); B.en('alien', 27, 19); B.box(25, 16, 'escudo');
  P(32, 35, 15); P(37, 40, 11); B.gear(38, 8); B.arc(32, 40, 13, 3);                       // engranaje 1: en lo alto
  // C · empieza la lluvia de meteoritos
  B.ground(32, 52); B.en('patrulla', 44, 19); B.box(46, 16, 'laser'); B.en('erizo', 49, 19);
  B.arc(52, 60, 15, 3); B.mover(54, 18, 3, 110, 0, 0.9, 0); B.ground(60, 78); B.cp(62, 20);
  B.box(61, 16, 'estrella'); B.en('dron', 68, 15, { x0: 62, x1: 76 }); B.en('patrulla', 74, 19);
  P(64, 67, 14); P(70, 73, 9); P(76, 79, 5); B.row(70, 73, 8); B.gear(78, 3);              // engranaje 2: escalera al cielo
  // D · el gran vacío
  B.mover(80, 17, 2, 0, 60, 1.2, 0); B.mover(84, 15, 2, 0, 60, 1.2, 1.5); B.arc(80, 87, 12, 3);
  B.ground(87, 110); B.box(90, 16, 'iman'); B.en('alien', 95, 19); B.en('dron', 100, 14, { x0: 92, x1: 108 });
  B.block(102, 104, 17, 19); B.en('torreta', 103, 16); P(106, 109, 15); B.row(106, 109, 14);
  // E · saltador a la isla del cielo (o por abajo con la plataforma)
  B.pad(108, 20); P(112, 117, 7); B.gear(116, 5); B.arc(111, 118, 5, 2);                   // engranaje 3: isla del cielo
  B.mover(112, 18, 3, 80, 0, 1.1, 0); B.ground(118, 165); B.cp(120, 20);
  // F · lluvia de chips y meta
  B.box(124, 16, 'iman'); B.en('erizo', 150, 19);
  for (let i = 1; i <= 4; i++) B.block(151 + i, 151 + i, 20 - i, 19);
  B.row(152, 155, 14); B.block(162, 165, 0, 21);
  return B.done({ name: 'PASEO ESPACIAL', time: 170, space: true, gk: 0.5, intro: '¡GRAVEDAD LUNAR!', spawn: { x: 3 * T, y: 20 * T }, goal: { x: 158 * T + T / 2, y: 20 * T },
    meteors: { zones: [[34 * T, 118 * T]], every: 1.15, acc: 0 }, rain: { x0: 122 * T, x1: 148 * T, dur: 9, t: 0, st: 0, acc: 0 } });
};
/* ---------- jefe 1-J: EL GUARDIÁN (arena cerrada: dispara ráfagas, aplasta el suelo con ondas, y queda aturdido: ¡salta sobre él o dispárale al núcleo!) ---------- */
LEVELS['1-J'] = function () {
  const B = LB(80, 16);
  B.ground(0, 79); B.row(5, 8, 12);
  B.set(10, 10, 'B'); B.box(11, 10, 'escudo'); B.set(12, 10, 'B'); B.box(15, 10, 'laser');
  B.pad(16, 14); B.block(18, 20, 9, 9, '='); B.gear(19, 7); B.en('patrulla', 23, 13); B.en('dron', 28, 10, { x0: 25, x1: 33 }); B.row(25, 31, 12);
  B.cp(35, 14); B.box(38, 10, 'chip'); B.hid(33, 10, 'vida');
  B.block(42, 43, 0, 10); B.block(78, 79, 0, 15);                                  // puerta de la arena y pared del fondo
  B.gear(46, 12); B.gear(76, 12); B.row(55, 67, 13);
  return B.done({ name: 'EL GUARDIÁN', time: 240, spawn: { x: 3 * T, y: 14 * T }, goal: { x: -99999, y: 14 * T }, arena: { x0: 44 * T, x1: 78 * T }, bossLvl: true });
};
/* ---------- jefes: cada mundo tiene su propio jefe, con su forma de luchar ---------- */
// regla para todos: si lo tocas cuando NO está atacando (no brilla en rojo) le quitas vida; si lo tocas mientras ataca, te hace daño a ti
function bossInit(l) { const hp = l.bossHp || 6; l.boss = { style: l.bossStyle || 'guard', x: (l.arena.x0 + l.arena.x1) / 2, y: 9.8 * T, hover0: 9.8 * T, hp, max: hp, st: 'wait', t: 0, fight: false, flash: 0, inv: 0, shotT: 1, vy: 0, vx: 0, dieT: 0, boomT: 0, gone: false, cyc: 0, fireT: 0, side: 1 }; if (l.boss.style !== 'guard') l.boss.y = 14 * T; if (l.boss.style === 'magma') { l.boss.y = 9.2 * T; l.boss.hover0 = 9.2 * T; } l.waves = []; }
function bossGate(close) { for (let y = 11; y <= 13; y++) for (let x = 42; x <= 43; x++) L.g[y][x] = close ? '#' : ' '; }
function bossReset() { const b = L.boss; if (!b || b.gone) return; bossGate(false); Object.assign(b, { x: (L.arena.x0 + L.arena.x1) / 2, y: b.style === 'ice' || b.style === 'jungle' ? 14 * T : b.hover0, hp: b.max, st: 'wait', t: 0, fight: false, flash: 0, inv: 0, vy: 0, vx: 0, cyc: 0, fireT: 0 }); L.waves = []; if (L.kitP) L.kitP.forEach(k => { k.st = 0; k.t = 0; }); }
const BOSS_H = 200, bossRect = b => ({ x: b.x - 64, y: b.y - 168, w: 128, h: 160 });
const bossDanger = b => b.fireT > 0 || ['aim', 'slam', 'wind', 'charge', 'erupt', 'leap'].includes(b.st);
function bossHit() {
  const b = L.boss; if (b.inv > 0) return;
  b.hp--; b.flash = 0.3; b.inv = 1.0; shake = 0.4; addScore(1000, b.x, b.y - 210);
  [880, 660, 440, 220].forEach((f, i) => tone(f, f * 0.7, 0.12, 'sawtooth', 0.12, i * 0.06)); noise(0.4, 0.2, 1200);
  burst(b.x, b.y - 110, 30, '#ffd23c', 320, 0.7, 400, 4); burst(b.x, b.y - 110, 16, '#fff', 260, 0.4, 0, 3);
  if (b.hp <= 0) { b.st = 'die'; b.dieT = 0; L.waves = []; enemies.forEach(e => killEnemy(e, 'fly')); shots = shots.filter(s2 => s2.mine); return; }
  if (b.hp === Math.ceil(b.max / 2)) { pop(b.x, b.y - 230, '¡SE HA ENFADADO!', '#ff4a5a'); tone(80, 40, 1.2, 'sawtooth', 0.12); }
  if (b.style === 'guard') { b.st = 'rise'; b.t = 0; }
  else if (b.style === 'ice') { b.st = 'walk'; b.t = 0; b.vx = 0; }
  else { b.st = 'rise'; b.t = 0; }
}
function bossUpdate(dt) {
  const b = L.boss, p = P; if (!b || b.gone) return;
  b.t += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt); b.fireT = Math.max(0, b.fireT - dt);
  const a = L.arena, mid = (a.x0 + a.x1) / 2, ph2 = b.hp <= b.max / 2, gy = 14 * T, px = p.x + p.w / 2;
  if (b.st === 'wait') { if (b.style === 'guard' || b.style === 'magma') b.y = b.hover0 + Math.sin(time * 2) * 10;
    if (!p.dead && p.x > a.x0 + 3 * T) { bossGate(true); b.fight = true; b.st = 'intro'; b.t = 0; shake = 0.6; pop(mid, b.y - 260, '¡' + (L.bossName || 'EL GUARDIÁN') + '!', b.style === 'ice' ? '#9ff0ff' : b.style === 'magma' ? '#ffb040' : '#ff4a5a'); tone(90, 45, 1.4, 'sawtooth', 0.14); noise(0.8, 0.2, 400);
      if (b.style === 'ice') for (let k = 0; k < 40; k++) parts.push({ x: a.x0 + Math.random() * (a.x1 - a.x0), y: cam.y + Math.random() * 60, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, life: 2, max: 2, col: '#ffffff', size: 2 + Math.random() * 2, grav: 0 });
      if (b.style === 'magma') for (let k = 0; k < 8; k++) L.waves.push({ x: a.x0 + (k + 0.5) * (a.x1 - a.x0) / 8, dir: 0, sp: 0, life: 0.6 + k * 0.08, lava: true }); }
    return; }
  if (b.st === 'intro') { if (b.style !== 'ice' && b.style !== 'jungle') b.y = b.hover0 + Math.sin(time * 9) * 4; if (b.t > 1.7) { b.st = b.style === 'ice' || b.style === 'jungle' ? 'walk' : 'hover'; b.t = 0; b.shotT = 1.2; } }
  else if (b.st === 'die') {
    b.dieT += dt; b.boomT -= dt; shake = Math.max(shake, 0.2);
    if (b.boomT <= 0) { b.boomT = 0.11; const ex = b.x + (Math.random() - 0.5) * 180, ey = b.y - 20 - Math.random() * 200; burst(ex, ey, 16, b.style === 'ice' ? (Math.random() < 0.5 ? '#bff4ff' : '#ffffff') : Math.random() < 0.5 ? '#ff9a3c' : '#ffd23c', 240, 0.5, 200, 4); noise(0.25, 0.18, 900); }
    if (b.y < gy) b.y = Math.min(gy, b.y + 120 * dt);
    if (b.dieT > 2.8) { b.gone = true; shake = 1; for (let k = 0; k < 6; k++) burst(b.x, b.y - 110, 30, ['#fff', '#ffd23c', '#ff9a3c', '#29e6ff', '#35ff8a', '#c63cff'][k], 420, 1.2, 250, 5);
      SFX.win(); L.goal = { x: mid, y: gy }; pop(mid, b.y - 260, '¡' + (L.bossName || 'GUARDIÁN') + ' DERROTADO!', '#35ff8a'); bossGate(false); }
    return;
  }
  else if (b.style === 'guard') bossGuard(dt, b, p, a, mid, ph2, gy, px);
  else if (b.style === 'ice') bossIce(dt, b, p, a, mid, ph2, gy, px);
  else if (b.style === 'jungle') bossJungle(dt, b, p, a, mid, ph2, gy, px);
  else bossMagma(dt, b, p, a, mid, ph2, gy, px);
  // golpes: tocarlo cuando no ataca le quita vida; si está atacando, te la quita a ti
  const r = bossRect(b), dang = bossDanger(b);
  if (!p.dead && !p.win && overlap(p, r)) {
    if (CHEAT.kill || p.tStar > 0) { if (b.inv <= 0) bossHit(); }
    else if (!dang && b.inv <= 0) { bossHit(); const dir = px < b.x ? -1 : 1; p.vy = -720; p.vx = dir * 420; p.inv = Math.max(p.inv, 0.9); p.sq = 1; }
    else if (dang) hurt();
  }
  for (const s2 of shots) if (s2.mine && s2.life > 0 && overlap({ x: s2.x - s2.w / 2, y: s2.y - s2.h / 2, w: s2.w, h: s2.h }, r)) {
    s2.life = 0; b.lz = (b.lz || 0) + (b.st === 'stun' || b.st === 'cool' ? 3 : 1); b.flash = Math.max(b.flash, 0.08);
    if (b.lz >= 3) { b.lz = 0; bossHit(); } else { burst(s2.x, s2.y, 8, '#ffd23c', 140, 0.25, 0, 2.5); tone(2400, 1800, 0.05, 'square', 0.05); } }
  for (const w of L.waves) { if (w.lava) { w.life -= dt; if (w.life <= 0) w.dead = true; else if (w.life < 0.5 && !p.dead && !p.win && Math.abs(px - w.x) < 34 && p.y + p.h > gy - 170) hurt(); continue; }
    w.x += w.dir * w.sp * dt; if (w.x < a.x0 - 20 || w.x > a.x1 + 20) w.dead = true;
    if (!p.dead && !p.win && p.y + p.h > gy - 38 && Math.abs(px - w.x) < 30) hurt(); }
  L.waves = L.waves.filter(w => !w.dead);
}
// mundo 1 · EL GUARDIÁN: flota, dispara ráfagas y cae en picado sobre ti
function bossGuard(dt, b, p, a, mid, ph2, gy, px) {
  if (b.st === 'hover') {
    const tx = mid + Math.sin(b.t * (ph2 ? 1.0 : 0.75)) * ((a.x1 - a.x0) / 2 - 190);
    b.x += (tx - b.x) * Math.min(1, dt * 1.4); b.y = b.hover0 + Math.sin(time * 2.5) * 14;
    b.shotT -= dt;
    if (b.shotT < 0.55 && b.shotT + dt >= 0.55) b.fireT = 1.0;          // avisa medio segundo antes de disparar
    if (b.shotT <= 0 && !p.dead) { const n = ph2 ? 4 : 3, sp = ph2 ? 230 : 190, cx0 = b.x, cy0 = b.y - 130, an = Math.atan2(p.y + p.h / 2 - cy0, px - cx0);
      for (let k = 0; k < n; k++) { const aa = an + (k - (n - 1) / 2) * 0.3; shots.push({ mine: false, x: cx0, y: cy0, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, w: 14, h: 14, life: 4.5 }); }
      b.shotT = ph2 ? 2.2 : 2.8; tone(300, 120, 0.25, 'sawtooth', 0.09); burst(cx0, cy0, 12, '#ff9a3c', 160, 0.35, 0, 3); }
    if (b.t > (ph2 ? 6 : 7.5)) { b.st = 'aim'; b.t = 0; tone(200, 1400, 0.8, 'square', 0.05); }
  } else if (b.st === 'aim') {
    b.x += (Math.max(a.x0 + 110, Math.min(a.x1 - 110, px)) - b.x) * Math.min(1, dt * 3); b.y = b.hover0 - 30 * Math.min(1, b.t * 2);
    if (b.t > (ph2 ? 1.0 : 1.3)) { b.st = 'slam'; b.vy = 200; b.t = 0; }
  } else if (b.st === 'slam') {
    b.vy += 3200 * dt; b.y += b.vy * dt;
    if (b.y >= gy) { b.y = gy; b.st = 'stun'; b.t = 0; shake = 0.7; noise(0.6, 0.3, 500); tone(70, 35, 0.6, 'sawtooth', 0.15);
      const ws = ph2 ? 380 : 320; L.waves.push({ x: b.x - 70, dir: -1, sp: ws }, { x: b.x + 70, dir: 1, sp: ws });
      burst(b.x - 60, gy, 18, '#9fb4ff', 260, 0.6, 600, 4); burst(b.x + 60, gy, 18, '#9fb4ff', 260, 0.6, 600, 4); }
  } else if (b.st === 'stun') { if (b.t > 3.4) { b.st = 'rise'; b.t = 0; } }
  else if (b.st === 'rise') { b.y -= 360 * dt; if (b.y <= b.hover0) { b.y = b.hover0; b.st = 'hover'; b.t = 0; b.shotT = 1.6; } }
}
// mundo 2 · GUARDIÁN DE HIELO: anda por el suelo helado, lanza bolas de nieve rodando y embiste hasta chocar con la pared
function bossIce(dt, b, p, a, mid, ph2, gy, px) {
  b.y = gy;
  if (b.st === 'walk') { const d = Math.sign(px - b.x) || 1; b.side = d; b.x += d * (ph2 ? 70 : 55) * dt; b.x = Math.max(a.x0 + 100, Math.min(a.x1 - 100, b.x));
    if (b.t > (ph2 ? 2.2 : 2.8)) { b.cyc++; b.t = 0; b.st = b.cyc % 2 ? 'throw' : 'wind'; if (b.st === 'wind') tone(150, 600, 0.9, 'sawtooth', 0.05); } }
  else if (b.st === 'throw') { if (b.t < 0.05) b.fireT = 0.9;
    if (b.t > 0.6 && !b.thrown) { b.thrown = true; const n = ph2 ? 2 : 1; for (let k = 0; k < n; k++) shots.push({ mine: false, x: b.x + b.side * 80, y: gy - 22 - k * 70, vx: b.side * (190 + k * 40), vy: 0, w: 34, h: 34, life: 6, ball: true, ice: true });
      tone(220, 110, 0.3, 'triangle', 0.1); burst(b.x + b.side * 80, gy - 40, 14, '#ffffff', 180, 0.4, 300, 3); }
    if (b.t > 1.4) { b.st = 'walk'; b.t = 0; b.thrown = false; } }
  else if (b.st === 'wind') { b.side = Math.sign(px - b.x) || 1; if (Math.random() < 0.6) parts.push({ x: b.x - b.side * 60, y: gy - 6, vx: -b.side * 200, vy: -60 - Math.random() * 80, life: 0.4, max: 0.4, col: '#dff8ff', size: 3, grav: 600 });
    if (b.t > (ph2 ? 0.8 : 1.1)) { b.st = 'charge'; b.t = 0; b.vx = b.side * (ph2 ? 520 : 440); } }
  else if (b.st === 'charge') { b.x += b.vx * dt; if (Math.random() < 0.7) parts.push({ x: b.x - Math.sign(b.vx) * 50, y: gy - 4, vx: -b.vx * 0.3, vy: -80, life: 0.4, max: 0.4, col: '#ffffff', size: 3, grav: 500 });
    if (b.x < a.x0 + 90 || b.x > a.x1 - 90) { b.x = Math.max(a.x0 + 90, Math.min(a.x1 - 90, b.x)); b.st = 'stun'; b.t = 0; shake = 0.8; noise(0.6, 0.3, 500); tone(70, 35, 0.6, 'sawtooth', 0.15);
      for (let k = 0; k < (ph2 ? 5 : 3); k++) L.icicles.push({ x0: 0, y0: 0, x: a.x0 + 80 + Math.random() * (a.x1 - a.x0 - 160), y: cam.y - 60 - Math.random() * 200, st: 2, vy: 0, big: Math.random() < 0.5 });
      pop(b.x, b.y - 260, '¡SE HA CHOCADO!', '#9ff0ff'); } }
  else if (b.st === 'stun') { if (b.t > 3.4) { b.st = 'walk'; b.t = 0; } }
}
// mundo 3 · SEÑOR DEL MAGMA: vuela de un lado a otro lanzando bolas de magma en parábola; luego cae, hace estallar géiseres en el suelo y se queda enfriándose
function bossMagma(dt, b, p, a, mid, ph2, gy, px) {
  const sx = b.side > 0 ? a.x1 - 170 : a.x0 + 170;
  if (b.st === 'hover') { b.x += (sx - b.x) * Math.min(1, dt * 1.6); b.y = b.hover0 + Math.sin(time * 2.2) * 16; b.shotT -= dt;
    if (b.shotT < 0.6 && b.shotT + dt >= 0.6) b.fireT = 1.1;
    if (b.shotT <= 0 && !p.dead) { const n = ph2 ? 3 : 2; for (let k = 0; k < n; k++) { const tx = px + (k - (n - 1) / 2) * 140, ft = 1.5, vx = (tx - b.x) / ft, vy = (gy - 20 - (b.y - 120) - 0.5 * 900 * ft * ft) / ft;
        shots.push({ mine: false, x: b.x, y: b.y - 120, vx, vy, g: 900, w: 22, h: 22, life: 3, magma: true }); }
      tone(160, 80, 0.4, 'sawtooth', 0.1); burst(b.x, b.y - 120, 14, '#ff8a20', 200, 0.4, 0, 3); b.shotT = ph2 ? 2.0 : 2.6; b.cyc++;
      if (b.cyc % 2 === 0) { b.side = -b.side; } if (b.cyc % (ph2 ? 3 : 4) === 0) { b.st = 'aim'; b.t = 0; tone(200, 900, 0.8, 'square', 0.05); } } }
  else if (b.st === 'aim') { b.x += (Math.max(a.x0 + 120, Math.min(a.x1 - 120, px)) - b.x) * Math.min(1, dt * 2.5); b.y = b.hover0 - 40 * Math.min(1, b.t * 2); if (b.t > 1.2) { b.st = 'slam'; b.vy = 200; b.t = 0; } }
  else if (b.st === 'slam') { b.vy += 3000 * dt; b.y += b.vy * dt;
    if (b.y >= gy) { b.y = gy; b.st = 'erupt'; b.t = 0; shake = 0.8; noise(0.7, 0.3, 400); tone(60, 30, 0.8, 'sawtooth', 0.15);
      const n = ph2 ? 6 : 4; for (let k = 1; k <= n; k++) for (const d of [-1, 1]) { const x = b.x + d * k * 110; if (x > a.x0 + 20 && x < a.x1 - 20) L.waves.push({ x, dir: 0, sp: 0, life: 0.5 + k * 0.22, lava: true }); } } }
  else if (b.st === 'erupt') { if (b.t > 0.9) { b.st = 'cool'; b.t = 0; pop(b.x, b.y - 250, '¡SE ESTÁ ENFRIANDO!', '#9fb4ff'); } }
  else if (b.st === 'cool') { if (b.t > 3.6) { b.st = 'rise'; b.t = 0; } }
  else if (b.st === 'rise') { b.y -= 380 * dt; if (b.y <= b.hover0) { b.y = b.hover0; b.st = 'hover'; b.t = 0; b.shotT = 1.5; b.side = px < mid ? 1 : -1; } }
}
const TINT = {};
function tintOf(im, col) { const k = col + '|' + im.src; if (TINT[k] || !im.naturalWidth) return TINT[k]; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (TINT[k] = c); }
function tintCv(im, col) { const c = tintOf(im, col); if (c && !c.naturalWidth) { c.naturalWidth = c.width; c.naturalHeight = c.height; c._n = im._n; } return c; }
function drawBoss() {
  const b = L.boss; if (!b || b.gone) return;
  const j4 = selI('jefe4'), j3 = lavaI('jefe3') || j4, j2 = iceI('jefe2') || j3, im = j4 ? (b.hp <= b.max / 2 && selI('jefe4-roto')) || j4 : j3 ? (b.hp <= b.max / 2 && lavaI('jefe3-roto')) || j3 : j2 ? (b.hp <= b.max / 2 && iceI('jefe2-roto')) || j2 : IMG.jefe1; if (!im || !im.naturalWidth) return;
  const h = BOSS_H, w = h * im.naturalWidth / im.naturalHeight, flip = P.x + P.w / 2 > b.x, fs = flip ? -1 : 1, ph2 = b.hp <= b.max / 2, gy = 14 * T;
  let x = b.x, y = b.y; if (b.st === 'aim' || b.st === 'die' || b.st === 'intro') { x += (Math.random() - 0.5) * 8; y += (Math.random() - 0.5) * 6; }
  const air = Math.max(0, gy - y);
  ctx.fillStyle = 'rgba(0,0,10,' + Math.max(0.12, 0.45 - air / 900) + ')'; ctx.beginPath(); ctx.ellipse(b.x, gy + 2, 110 - Math.min(60, air / 8), 14, 0, 0, 6.283); ctx.fill();
  if (b.st === 'cool') { const t6 = tintOf(im, 'rgba(110,120,160,1)'); if (t6) { /* se pinta tras la imagen */ } }
  if (b.st === 'aim') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,60,' + (0.25 + 0.25 * Math.sin(time * 30)) + ')'; ctx.fillRect(b.x - 90, gy - 6, 180, 8); ctx.globalCompositeOperation = 'source-over'; }
  const BP = j4 ? { fx: 0.5, fy: 1, cx: 0.5, cy: 0.41, ex: 0.46, ey: 0.15 } : j3 ? { fx: 0.515, fy: 0.925, cx: 0.5, cy: 0.467, ex: 0.5, ey: 0.216 } : j2 ? { fx: 0.478, fy: 0.985, cx: 0.43, cy: 0.42, ex: 0.425, ey: 0.14 } : { fx: 0.455, fy: 0.885, cx: 0.457, cy: 0.453, ex: 0.495, ey: 0.19 }, dang = bossDanger(b), cool = b.st === 'stun' || b.st === 'cool';
  if (dang && b.st !== 'die') { ctx.globalCompositeOperation = 'lighter'; const ag = ctx.createRadialGradient(x, y - h * 0.5, h * 0.2, x, y - h * 0.5, h * 0.75); ag.addColorStop(0, 'rgba(255,40,40,0)'); ag.addColorStop(0.7, 'rgba(255,40,40,' + (0.22 + 0.12 * Math.sin(time * 20)) + ')'); ag.addColorStop(1, 'rgba(255,40,40,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y - h * 0.5, h * 0.75, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  const onFloor = b.style === 'ice' && b.st !== 'die';
  if (j4 && b.st === 'leap') { ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(b.x, gy, 4, b.x, gy, 90); lg.addColorStop(0, 'rgba(120,255,90,.4)'); lg.addColorStop(1, 'rgba(120,255,90,0)'); ctx.fillStyle = lg; ctx.fillRect(b.x - 90, gy - 40, 180, 60); ctx.globalCompositeOperation = 'source-over'; }
  if (!cool && b.st !== 'die' && !j4) flame(x + fs * (BP.fx - 0.5) * w, y - h * (1 - BP.fy) - 2, onFloor ? (b.st === 'charge' ? 22 : 12) : b.st === 'slam' ? 26 : 70 + (ph2 ? 18 : 0), j3 ? 52 : 44, 9);
  const rot = b.st === 'stun' ? 0.1 * Math.sin(time * 3) : b.st === 'die' ? (Math.random() - 0.5) * 0.12 : Math.sin(time * 2) * 0.03;
  const draw = (src, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(fs, 1); ctx.drawImage(src, -w / 2, -h, w, h); ctx.restore(); };
  draw(im, 1);
  if (L.theme === 'lava' && !j3) { const t5 = tintOf(im, 'rgba(255,90,30,1)'); if (t5) draw(t5, 0.3 + 0.08 * Math.sin(time * 4)); }
  if (L.theme === 'ice' && !j2) { const t4 = tintOf(im, 'rgba(120,225,255,1)'); if (t4) draw(t4, 0.32 + 0.06 * Math.sin(time * 3)); }
  if (ph2 || b.st === 'die') { const t2 = tintOf(im, 'rgba(255,30,30,1)'); if (t2) draw(t2, 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(time * 8))); if (Math.random() < 0.3) parts.push({ x: x + (Math.random() - 0.5) * 140, y: y - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 60, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#ffd23c' : '#8a8fa8', size: 2.5, grav: 0 }); }
  if (b.st === 'cool') { const t6 = tintOf(im, 'rgba(100,110,150,1)'); if (t6) draw(t6, 0.45); }
  if (b.flash > 0) { const t3 = tintOf(im, '#fff'); if (t3) draw(t3, Math.min(1, b.flash / 0.15)); }
  // núcleo (el punto débil) y ojo
  const cx = x + fs * (BP.cx - 0.5) * w, cy = y - h * (1 - BP.cy), stun = cool;
  ctx.globalCompositeOperation = 'lighter';
  const R = stun ? 60 + 14 * Math.sin(time * 14) : 26, cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, R); cg.addColorStop(0, stun ? 'rgba(255,255,200,1)' : 'rgba(255,120,60,.6)'); cg.addColorStop(0.35, stun ? 'rgba(255,200,60,.8)' : 'rgba(255,60,40,.35)'); cg.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
  const ex = x + fs * (BP.ex - 0.5) * w, ey = y - h * (1 - BP.ey), eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, stun ? 10 : 22); eg.addColorStop(0, 'rgba(255,80,80,.9)'); eg.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 22, 0, 6.283); ctx.fill();
  if (b.st === 'aim') { ctx.strokeStyle = 'rgba(255,40,60,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(b.x, gy); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  if (stun) { ctx.font = '900 26px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const aa = time * 4 + k * 2.094; ctx.fillStyle = '#ffd23c'; ctx.fillText('★', b.x + Math.cos(aa) * 60, y - h - 6 + Math.sin(aa) * 12); }
    ctx.font = '800 13px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(time * 10)) + ')'; ctx.fillText('¡AHORA! ¡GOLPÉALE!', b.x, y - h - 34); ctx.textBaseline = 'alphabetic'; }
}
function drawWaves() {
  if (!L.waves) return; const gy = 14 * T; ctx.globalCompositeOperation = 'lighter';
  for (const w of L.waves) { if (w.root) { if (w.life > 0.5) { ctx.fillStyle = 'rgba(120,255,90,' + (0.3 + 0.3 * Math.sin(time * 30)) + ')'; ctx.beginPath(); ctx.ellipse(w.x, gy, 28, 6, 0, 0, 6.283); ctx.fill(); if (Math.random() < 0.4) parts.push({ x: w.x + (Math.random() - 0.5) * 30, y: gy - 2, vx: (Math.random() - 0.5) * 60, vy: -120, life: 0.3, max: 0.3, col: '#6a4a2a', size: 3, grav: 600, sqr: true }); }
      else { const hh = 160 * Math.min(1, (0.5 - w.life) * 8); ctx.globalCompositeOperation = 'source-over'; for (const dx of [-14, 0, 14]) { ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.moveTo(w.x + dx - 9, gy); ctx.quadraticCurveTo(w.x + dx - 12 + Math.sin(time * 9 + dx) * 4, gy - hh * 0.6, w.x + dx, gy - hh * (dx ? 0.8 : 1)); ctx.quadraticCurveTo(w.x + dx + 10, gy - hh * 0.5, w.x + dx + 9, gy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#5ae05a'; ctx.beginPath(); ctx.ellipse(w.x + dx + 6, gy - hh * 0.55, 7, 3, 0.5, 0, 6.283); ctx.fill(); } ctx.globalCompositeOperation = 'lighter'; } continue; }
    if (w.lava) { if (w.life > 0.5) { const a = 0.3 + 0.3 * Math.sin(time * 30); ctx.fillStyle = 'rgba(255,140,40,' + a + ')'; ctx.beginPath(); ctx.ellipse(w.x, gy, 26, 6, 0, 0, 6.283); ctx.fill(); if (Math.random() < 0.4) parts.push({ x: w.x + (Math.random() - 0.5) * 30, y: gy - 2, vx: 0, vy: -100 - Math.random() * 100, life: 0.3, max: 0.3, col: '#ffb040', size: 2, grav: 600 }); }
      else { const hh = 170 * Math.min(1, (0.5 - w.life) * 8), g3 = ctx.createLinearGradient(0, gy - hh, 0, gy); g3.addColorStop(0, 'rgba(255,90,20,0)'); g3.addColorStop(0.3, 'rgba(255,140,40,.8)'); g3.addColorStop(1, 'rgba(255,240,180,.95)'); ctx.fillStyle = g3; ctx.beginPath(); ctx.moveTo(w.x - 22, gy); ctx.quadraticCurveTo(w.x - 26, gy - hh * 0.6, w.x, gy - hh); ctx.quadraticCurveTo(w.x + 26, gy - hh * 0.6, w.x + 22, gy); ctx.closePath(); ctx.fill();
        if (Math.random() < 0.8) parts.push({ x: w.x + (Math.random() - 0.5) * 20, y: gy - hh * Math.random(), vx: (Math.random() - 0.5) * 140, vy: -100 - Math.random() * 100, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#ffd060' : '#ff6a1a', size: 2.5, grav: 500 }); } continue; }
    const g2 = ctx.createRadialGradient(w.x, gy, 2, w.x, gy, 46); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(0.4, 'rgba(255,120,60,.7)'); g2.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(w.x, gy, 30, 42, 0, Math.PI, 0); ctx.fill();
    if (Math.random() < 0.8) parts.push({ x: w.x, y: gy - Math.random() * 20, vx: -w.dir * 60, vy: -80 - Math.random() * 120, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#ff9a3c' : '#fff', size: 2.5, grav: 600 }); }
  ctx.globalCompositeOperation = 'source-over';
}
/* ======================= MUNDO 2 · PLANETA DE CRISTAL ======================= */
/* ---------- fase 2-1: LLANURA HELADA (suelo que resbala, carámbanos que caen, cristales saltarines, una pared que no es lo que parece y un agujero con sorpresa) ---------- */

/* ---------- fase 2-2: CUEVAS DE CRISTAL (a oscuras: solo brillan los cristales; carámbanos en el techo, un abismo con cristales saltarines y una cámara secreta dentro de la roca) ---------- */
/* ---------- fase 2-3: BAJO EL HIELO (¡a nado! cada salto es una brazada: corrientes, anguilas eléctricas, géiseres de burbujas y una cámara de hielo sellada) ---------- */
/* ---------- fase 2-4: TORMENTA DE NIEVE (ráfagas de ventisca que te frenan o te lanzan contra los bichos, plataformas en pleno vendaval y un agujero que esconde una gruta) ---------- */
/* ---------- fase 2-5: AVALANCHA (¡una avalancha te persigue! sobre hielo que resbala, con cintas turbo, cristales saltarines y carámbanos) ---------- */
/* ---------- fase 2-6: POZO DE LA MINA (escalada por un pozo helado mientras sube el agua congelada; géiser de vapor, plataformas que bailan, techo de hielo… y un agujero en el suelo que esconde un portal) ---------- */
/* ======================= PLANETA 2 · CRISTAL (cada fase con su propia idea) ======================= */
// 2-1 · colinas nevadas con cañones de bolas de nieve; la antena está en lo alto de una torre de hielo
LEVELS['2-1'] = function () {
  const B = LB(214, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 34); B.crystal(2, 14, 0, 1.2); B.row(5, 9, 12); B.hid(10, 10, 'vida'); B.set(13, 10, 'B'); B.box(14, 10, 'escudo'); B.set(15, 10, 'B'); B.en('patrulla', 24, 13);
  B.block(28, 34, 12, 13); B.snowgun(33, 12, -1, 3.4); B.arc(27, 35, 9, 2);                          // colina 1 con cañón
  B.arc(35, 39, 11, 2); B.ground(39, 78); B.block(44, 50, 11, 13); B.en('alien', 47, 10); B.crystal(52, 14, 1);
  B.block(56, 58, 10, 13); B.block(59, 66, 12, 13); B.snowgun(65, 12, -1, 3, 1); B.gear(57, 7); B.row(59, 66, 10);   // pico con engranaje
  B.hid(70, 10, 'chip'); B.en('erizo', 72, 13); B.pipe(75, 14, 200, 14, true);                       // escotilla oculta → iglú secreto
  B.arc(78, 83, 11, 2); B.ground(83, 120); B.cp(85, 14); B.snowgun(118, 14, -1, 2.6); B.block(92, 93, 12, 13); B.block(100, 101, 12, 13); B.block(108, 109, 12, 13); B.row(94, 99, 11); B.row(102, 107, 11);
  P(112, 116, 10); B.box(114, 7, 'turbo'); B.en('dron', 105, 8, { x0: 95, x1: 115 });
  B.mover(121, 13, 3, 72, 0, 1.0, 0); B.arc(121, 128, 9, 2); B.ground(129, 176); B.block(132, 140, 11, 13); B.fake(132, 138, 12, 13); B.gear(136, 13); B.row(133, 139, 10);     // colina hueca
  B.en('patrulla', 146, 13); B.snowgun(172, 14, -1, 2.4, 0.5); B.crystal(150, 14, 2, 1.3); B.en('alien', 158, 13); B.cp(164, 14);
  // la torre de hielo: se sube con cristales saltarines
  B.spring(168, 14); P(170, 173, 9); B.row(170, 173, 8); B.spring(172, 9); P(175, 177, 5); B.block(178, 186, 4, 15); B.ground(176, 196); B.crystal(185, 4, 0, 1.4); B.crystal(179, 4, 1, 0.8);
  B.block(196, 197, 0, 15);
  // iglú secreto
  B.ground(198, 213); B.block(198, 213, 0, 7); B.block(213, 213, 0, 15); B.row(201, 211, 12); B.row(202, 210, 10); B.hid(205, 10, 'vida'); B.crystal(209, 14, 1); B.portal(211, 14, 141, 14);
  return B.done({ name: 'LLANURA HELADA', time: 220, theme: 'ice', ice: true, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 182 * T + T / 2, y: 4 * T } });
};
// 2-2 · cueva a oscuras: los cristales se encienden al tocarlos; hay que encontrar 3 llaves para abrir la puerta de hielo
LEVELS['2-2'] = function () {
  const H = 26, B = LB(150, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 149, 0, 1); B.block(0, 1, 0, H - 1); B.block(148, 149, 0, H - 1); B.ground(0, 149);
  // planta baja
  B.crystal(4, 24, 0); B.row(6, 12, 22); B.hid(9, 20, 'vida'); B.en('patrulla', 18, 23); B.crystal(22, 24, 1); B.block(26, 27, 21, 23); B.en('alien', 34, 23); B.crystal(38, 24, 2);
  B.block(44, 60, 17, 18); B.icicle(47, 19); B.icicle(52, 19, 1); B.icicle(57, 19); B.row(45, 59, 23); B.crystal(62, 24, 0); B.cp(66, 24);
  B.block(70, 72, 21, 23); B.en('erizo', 78, 23); B.crystal(84, 24, 1); B.block(88, 98, 21, 21); B.fake(88, 88, 22, 23); B.block(98, 98, 22, 23, 'C'); B.key(93, 23);          // llave 1: escondida dentro de una roca que se rompe con láser… o por el túnel de la derecha
  B.box(80, 20, 'laser');
  // pisos superiores (se suben por los cristales saltarines)
  B.spring(102, 24); P(100, 112, 18); B.crystal(104, 18, 2); B.en('patrulla', 108, 17); P(90, 98, 15); B.row(90, 98, 14); B.en('dron', 85, 10, { x0: 76, x1: 96 }); P(74, 86, 13); B.crystal(78, 13, 0); B.gear(80, 11);
  P(60, 70, 10); B.key(62, 8); B.crystal(68, 10, 1); B.icicle(64, 3); B.icicle(67, 3); P(46, 56, 13); B.en('alien', 50, 12); P(30, 42, 10); B.crystal(34, 10, 2); B.gear(36, 8); P(16, 26, 13); B.spring(17, 13); P(6, 13, 8); B.key(9, 6); B.crystal(11, 8, 0, 0.8);
  B.spring(115, 24); P(116, 124, 19); B.crystal(120, 19, 1); B.en('dron', 128, 13, { x0: 118, x1: 138 }); P(128, 134, 15); B.gear(131, 13); B.row(128, 134, 14);
  // salida: puerta de hielo que se abre con las 3 llaves
  B.cp(118, 24); B.en('erizo', 126, 23); B.crystal(130, 24, 2); B.door(136, 20, 23); B.block(136, 147, 15, 19); B.crystal(146, 24, 0, 1.3);
  return B.done({ name: 'CUEVAS DE CRISTAL', time: 300, theme: 'ice', cave: true, dark: true, crystalLight: true, intro: '¡TOCA LOS CRISTALES Y BUSCA 3 LLAVES!', spawn: { x: 4 * T, y: 24 * T }, goal: { x: 142 * T + T / 2, y: 24 * T } });
};
// 2-3 · bajo el hielo: corrientes que te arrastran, cámaras de hielo y salida nadando hacia la superficie
LEVELS['2-3'] = function () {
  const H = 30, B = LB(170, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 169, 0, 3); B.block(0, 1, 0, H - 1); B.ground(0, 169);
  B.row(5, 12, 26); B.hid(9, 24, 'vida'); B.crystal(3, 28, 0); B.en('patrulla', 18, 27);
  B.wind(20, 50, 18, 27, 380, 0); for (let x = 22; x < 50; x += 4) B.chip(x, 22); B.block(30, 32, 12, 20); B.block(40, 42, 22, 27); B.crystal(36, 28, 1, 1.2);       // corriente que empuja hacia delante
  B.block(52, 70, 18, 19); B.row(53, 69, 16); B.gear(61, 21); B.block(52, 52, 20, 27); B.block(70, 70, 20, 25); B.fake(52, 52, 24, 27); B.crystal(56, 28, 2);   // cámara sellada (pared falsa a la izquierda)
  B.cp(74, 28); B.wind(76, 110, 4, 16, -360, 1.4); B.block(80, 82, 4, 14); B.block(92, 94, 10, 27); B.block(104, 106, 4, 16); for (let y = 8; y < 26; y += 4) B.chip(87, y), B.chip(99, y);   // laberinto contra corriente
  B.en('dron', 99, 20, { x0: 96, x1: 102 }); B.box(87, 24, 'escudo'); B.gear(99, 6);
  B.block(110, 140, 12, 13); B.block(110, 140, 12, 12, 'B'); B.row(112, 138, 20); B.en('erizo', 125, 27); B.en('alien', 132, 27); B.cp(140, 28);
  // la salida: un agujero en el hielo del techo, se sube nadando hasta un iceberg
  B.block(142, 168, 0, 3, ' '); B.block(156, 168, 6, 13); for (let y = 8; y < 26; y += 3) B.chip(150, y);
  B.block(169, 169, 0, H - 1); B.crystal(166, 6, 0, 1.2);
  return B.done({ name: 'BAJO EL HIELO', time: 260, theme: 'ice', cave: true, water: { y: 4 * T }, spawn: { x: 3 * T, y: 28 * T }, goal: { x: 161 * T + T / 2, y: 6 * T } });
};
// 2-4 · tormenta en las alturas: islas de hielo sueltas, ráfagas que cambian de lado y la última isla se alcanza en plataforma móvil
LEVELS['2-4'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 18); B.hid(6, 10, 'vida'); B.box(10, 10, 'chip'); B.row(12, 16, 12);
  B.block(21, 25, 11, 15); B.wind(18, 60, 2, 13, 330, 0); B.block(29, 31, 9, 15); B.block(35, 39, 12, 15); B.block(43, 44, 9, 15); B.gear(43, 6); B.block(48, 53, 11, 15); B.en('patrulla', 50, 10); B.row(26, 47, 6);
  B.block(57, 66, 13, 15); B.cp(60, 13); B.icicle(63, 6); P(62, 66, 7); B.box(64, 4, 'iman'); B.spring(58, 13);
  B.wind(66, 110, 2, 13, -330, 1.5); B.mover(69, 12, 3, 0, 60, 1.1, 0); B.block(76, 78, 10, 15); B.en('alien', 77, 9); B.mover(82, 9, 3, 72, 0, 1.0, 1); B.block(91, 95, 12, 15); B.en('erizo', 93, 11); B.block(99, 100, 9, 15); B.row(98, 101, 7);
  B.block(104, 112, 12, 15); B.fake(106, 110, 13, 14); B.fake(108, 108, 12, 12); B.gear(108, 13); B.cp(111, 12); B.spring(105, 12);           // isla hueca
  P(114, 117, 8); B.en('dron', 122, 6, { x0: 114, x1: 132 }); P(122, 125, 10); P(129, 133, 7); B.block(137, 143, 11, 15); B.en('patrulla', 140, 10); B.wind(130, 170, 2, 13, 360, 0.7);
  B.block(146, 147, 9, 15); B.block(151, 152, 11, 15); B.block(156, 157, 8, 15); B.row(145, 158, 5); B.box(156, 4, 'estrella');
  // la isla final: solo se llega montado en la plataforma que cruza el abismo
  B.block(160, 164, 11, 15); B.mover(168, 11, 3, 4 * T, 0, 0.6, 0); B.mover(180, 11, 3, 3 * T, 0, 0.6, 1.5); B.row(167, 184, 8); B.block(187, 199, 11, 15); B.crystal(196, 11, 0, 1.4);
  return B.done({ name: 'TORMENTA DE NIEVE', time: 220, theme: 'ice', ice: true, meteors: { zones: [[112 * T, 160 * T]], every: 1.25, acc: 0, style: 'comet' }, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 192 * T + T / 2, y: 11 * T } });
};
// 2-5 · la avalancha empuja la pantalla: ladera abajo sin parar
LEVELS['2-5'] = function () {
  const B = LB(300, 26), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  let y = 9; const step = (a, b) => { B.block(a, b, y, 25); };
  step(0, 20); B.row(6, 12, y - 2); B.hid(14, y - 4, 'vida');
  y = 11; step(21, 38); B.en('patrulla', 30, y - 1); B.snowgun(37, y, -1, 2.6); y = 13; step(39, 52); B.icicle(45, 0); B.box(46, y - 4, 'escudo');
  B.arc(53, 57, 11, 2); y = 15; step(58, 74); B.en('alien', 66, y - 1); y = 17; step(75, 90); B.cp(77, 17); B.block(82, 83, 15, 16); B.row(84, 89, 15);
  B.mover(92, 17, 3, 0, 48, 1.4, 0); y = 18; step(97, 114); B.en('erizo', 104, 17); B.gear(110, 13); P(108, 112, 14);
  y = 19; step(115, 136); B.snowgun(135, 19, -1, 2.2); B.block(120, 121, 17, 18); B.block(127, 128, 17, 18); B.row(122, 126, 15);
  B.arc(137, 142, 17, 3); y = 21; step(143, 166); B.pipe(150, 21, 280, 22, true); B.en('patrulla', 158, 20); B.cp(162, 21);         // escotilla secreta → refugio
  y = 22; step(167, 190); B.spring(176, 22); P(178, 182, 15); B.gear(180, 13); B.row(178, 182, 14); B.en('alien', 186, 21);
  B.mover(192, 21, 3, 60, 0, 1.2, 0); y = 23; step(198, 230); B.snowgun(229, 23, -1, 2); B.en('erizo', 212, 22); B.box(218, 19, 'turbo');
  // la cabaña del fondo del valle
  y = 24; step(231, 270); B.crystal(262, 24, 0, 1.3); B.block(270, 271, 0, 25);
  B.block(272, 299, 23, 25); B.block(272, 299, 0, 15); B.row(275, 296, 21); B.row(276, 295, 19); B.gear(288, 21); B.portal(296, 23, 236, 24); B.block(299, 299, 0, 25);
  return B.done({ name: 'AVALANCHA', time: 160, theme: 'ice', ice: true, intro: '¡LA AVALANCHA EMPUJA!', spawn: { x: 3 * T, y: 9 * T }, goal: { x: 258 * T + T / 2, y: 24 * T }, auto: { speed: 150, x: 0 }, chase: { x: -9999, speed: 0, startX: 2 * T, on: false, style: 'snow' } });
};
// 2-B · fase secreta: corrientes de aire que suben entre nubes, sin gravedad casi
LEVELS['2-B'] = function () {
  const H = 30, B = LB(150, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 12); B.hid(5, 24, 'vida'); B.crystal(2, 28, 1, 1.3); B.row(4, 10, 26);
  B.lift(14, 16, 12, 28); for (let y = 14; y < 27; y += 3) B.chip(15, y); P(18, 24, 12); B.gear(21, 10); B.row(18, 24, 11);
  P(28, 32, 16); B.spring(30, 16); P(34, 40, 6); B.row(34, 40, 5); B.en('alien', 37, 5); P(43, 46, 12); P(48, 52, 20); B.cp(50, 20);
  B.mover(54, 20, 3, 0, 96, 0.8, 0); P(60, 66, 22); B.crystal(64, 22, 2); B.box(62, 18, 'iman'); B.lift(68, 70, 7, 24); P(72, 80, 7); B.en('erizo', 76, 6); B.row(72, 80, 5);
  for (let i = 0; i < 6; i++) { const x = 84 + i * 6, yy = 9 + i * 3; P(x, x + 2, yy); B.chip(x + 1, yy - 1); } P(121, 127, 25); B.gear(124, 23);
  B.lift(129, 131, 8, 26); P(133, 149, 8); B.cp(135, 8); B.crystal(146, 8, 0, 1.4);
  return B.done({ name: 'AURORA', time: 170, theme: 'ice', sky: true, gk: 0.55, intro: '¡CORRIENTES DE AIRE!', spawn: { x: 3 * T, y: 28 * T }, goal: { x: 143 * T + T / 2, y: 8 * T }, rain: { x0: 134 * T, x1: 148 * T, dur: 6, t: 0, st: 0, acc: 0 } });
};
// 2-J · el Guardián de Hielo: los poderes están congelados en cristales a la entrada
LEVELS['2-J'] = function () {
  const B = LB(80, 16);
  B.ground(0, 79); B.crystal(3, 14, 0, 1.3); B.block(0, 41, 0, 3); B.icicle(12, 4); B.icicle(26, 4, 1);
  B.kitp(10, 14, 'escudo'); B.kitp(18, 14, 'laser'); B.kitp(26, 14, 'vuelo'); B.row(8, 30, 11); B.hid(33, 10, 'vida'); B.cp(36, 14);
  B.block(42, 43, 0, 10); B.block(78, 79, 0, 15); B.block(44, 77, 0, 1); B.crystal(46, 14, 2, 1.2); B.crystal(75, 14, 1, 1.2); B.gear(60, 6);
  return B.done({ name: 'GUARDIÁN DE HIELO', bossName: 'GUARDIÁN DE HIELO', bossHp: 6, bossStyle: 'ice', time: 300, theme: 'ice', ice: true, intro: '¡ROMPE LOS CRISTALES!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: -99999, y: 14 * T }, arena: { x0: 44 * T, x1: 78 * T }, bossLvl: true });
};
LEVELS['2-6'] = function () {
  const H = 118, B = LB(34, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 8, H - 1); B.block(31, 33, 8, H - 1);
  // suelo de la mina… con un agujero que lleva a una galería oculta
  B.block(3, 25, 110, 111); B.block(28, 30, 110, 111); B.ground(3, 30); B.row(4, 24, 114); B.gear(6, 114); B.crystal(15, 116, 1, 1.2); B.portal(29, 116, 5, 55); B.fake(3, 30, 112, 115);      // la galería queda oculta tras una pared falsa: desde fuera parece suelo macizo
  B.row(6, 10, 108); B.hid(12, 106, 'vida'); B.crystal(4, 110, 0); B.en('patrulla', 18, 109);
  // A · primeros saltos
  P(6, 10, 107); P(13, 17, 104); P(20, 24, 101); B.box(22, 97, 'escudo'); P(25, 29, 98); B.row(25, 29, 97); P(12, 21, 95); B.en('patrulla', 19, 94);
  // B · géiser de vapor entre drones
  B.lift(9, 11, 78, 94); for (let r = 80; r <= 92; r += 3) B.chip(10, r); B.en('dron', 10, 86, { x0: 4, x1: 16 }); P(12, 16, 79); B.cp(14, 79); P(3, 7, 79); B.row(3, 7, 78);
  // C · cristales saltarines y torreta
  P(19, 23, 76); B.spring(22, 76); P(24, 29, 71); B.en('torreta', 27, 70); P(16, 20, 68); B.icicle(18, 62); B.block(15, 21, 61, 61); P(8, 12, 65); P(3, 7, 62); B.row(8, 12, 64);
  // cámara secreta (se llega por el portal del agujero… o atravesando su pared)
  B.block(3, 9, 49, 49); B.block(3, 8, 56, 56); B.block(9, 9, 50, 56); B.fake(9, 9, 53, 55); B.gear(5, 52); B.row(3, 8, 51); B.row(4, 7, 54); B.crystal(7, 56, 2, 0.8);
  // D · plataformas que suben y bajan
  P(10, 14, 59); P(17, 21, 56); B.mover(23, 53, 3, 0, 36, 1.3, 0); B.mover(17, 50, 3, 0, 36, 1.3, 3.14); B.mover(11, 47, 3, 0, 36, 1.3, 0); B.arc(18, 25, 50, 1); P(4, 8, 44); B.box(6, 40, 'laser');
  // E · techo de hielo
  P(4, 8, 41); B.block(3, 30, 38, 38); B.block(4, 8, 38, 38, 'B'); B.en('patrulla', 20, 37);
  P(10, 14, 35); P(17, 21, 32); B.en('dron', 15, 28, { x0: 6, x1: 26 }); P(24, 28, 29); B.spring(26, 29); P(24, 29, 24); B.row(24, 29, 23); P(16, 20, 21); P(8, 12, 18); P(3, 6, 15); B.gear(4, 13); P(14, 18, 15); B.icicle(16, 9);
  // la boca del pozo
  P(8, 12, 12); P(3, 7, 9); B.block(9, 30, 8, 9); B.en('patrulla', 16, 7); B.arc(10, 24, 6, 3); B.crystal(29, 8, 1, 1.3); B.box(20, 4, 'chip');
  return B.done({ name: 'POZO DE LA MINA', time: 230, theme: 'ice', vert: true, spawn: { x: 5 * T, y: 110 * T }, goal: { x: 26 * T + T / 2, y: 8 * T }, rise: { y: H * T + 400, speed: 36, startY: 104 * T, on: false, style: 'water' } });
};
/* ---------- fase secreta 2-B: AURORA (sobre las nubes del planeta, con gravedad lunar: escaleras de luz, estrellas fugaces de hielo y una lluvia de chips) ---------- */
/* ---------- jefe 2-J: GUARDIÁN DE HIELO (el mismo coloso, ahora congelado: arena que resbala, ráfagas de esquirlas de hielo, y al aplastar el suelo hace caer carámbanos del cielo; 8 golpes) ---------- */
/* ======================= PLANETA 3 · VOLCÁNICO (cada fase con su propia idea) ======================= */
const LV = o => Object.assign({ theme: 'lava', time: 220 }, o);
// 3-1 · llanura de ceniza: charcos de lava y géiseres; la antena está en lo alto de un acantilado al que se sube por rocas que se hunden
LEVELS['3-1'] = function () {
  const B = LB(176, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 26); B.crystal(3, 14, 3, 1.2); B.row(5, 9, 12); B.hid(11, 10, 'vida'); B.set(14, 10, 'B'); B.box(15, 10, 'escudo'); B.set(16, 10, 'B'); B.en('patrulla', 22, 13);
  B.arc(26, 30, 11, 2); B.ground(30, 52); B.geyser(36, 14, 4, 0); B.row(38, 42, 12); B.geyser(46, 14, 4, 1.6); B.en('alien', 50, 13);
  B.arc(52, 56, 11, 2); B.ground(56, 60); B.arc(60, 64, 11, 2); B.ground(64, 90); B.cp(66, 14); B.block(72, 78, 11, 11); B.row(72, 78, 10); B.box(75, 8, 'laser'); B.en('erizo', 82, 13); B.geyser(87, 14, 5, 0.8);
  B.arc(90, 96, 11, 2); B.pitWarp(91, 95, 162, 13); B.ground(96, 128); B.en('patrulla', 102, 13);
  B.block(110, 116, 11, 13); B.fake(110, 110, 12, 13); B.row(111, 115, 12); B.gear(114, 13); B.en('alien', 122, 13); B.cp(126, 14);
  // el acantilado: rocas que se hunden, cada vez más altas
  B.fall(130, 12, 2); B.fall(134, 10, 2); B.fall(138, 8, 2); B.gear(139, 6); B.block(142, 156, 7, 15); B.crystal(152, 7, 3, 1.4); B.block(157, 158, 0, 15);
  // cueva secreta (se cae por el agujero sin lava)
  B.ground(159, 175); B.block(159, 175, 0, 8); B.block(175, 175, 0, 15); B.row(161, 172, 12); B.row(162, 171, 10); B.gear(168, 12); B.crystal(161, 14, 3, 1.2); B.portal(173, 14, 100, 14);
  return B.done(LV({ name: 'LLANURA DE CENIZA', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 148 * T + T / 2, y: 7 * T } }));
};
// 3-2 · campo de géiseres bajo las bombas del volcán; la antena está al fondo de un cráter al que hay que dejarse caer
LEVELS['3-2'] = function () {
  const B = LB(190, 22), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 40, 14, 21); B.hid(7, 10, 'vida'); B.box(10, 10, 'turbo'); B.row(12, 18, 12); B.en('patrulla', 20, 13);
  for (let i = 0; i < 4; i++) B.geyser(25 + i * 4, 14, 5, i * 0.5, 3.4); B.row(24, 38, 11);
  B.block(41, 60, 12, 21); B.en('alien', 48, 11); P(52, 55, 8); B.gear(53, 6); B.geyser(58, 12, 6, 0.3);
  B.block(61, 100, 14, 21); B.cp(63, 14); B.block(70, 72, 12, 13); B.en('torreta', 71, 11); B.geyser(78, 14, 5, 1); B.box(82, 10, 'escudo'); B.geyser(86, 14, 5, 2); B.en('erizo', 94, 13);
  B.block(101, 108, 11, 21); B.fake(101, 101, 12, 13); B.gear(104, 13); B.block(102, 107, 12, 13, ' '); B.row(102, 107, 10);
  B.block(109, 140, 14, 21); B.cp(111, 14); B.geyser(118, 14, 6, 0.6); B.en('patrulla', 124, 13); B.geyser(130, 14, 6, 1.8); B.pipe(136, 14, 52, 12, false);
  // el cráter: un agujero grande; abajo espera la antena
  B.block(141, 145, 14, 21); B.block(158, 189, 14, 21); B.block(146, 157, 20, 21); B.row(147, 156, 16); B.crystal(149, 20, 3, 1.2); B.crystal(155, 20, 3);
  B.block(188, 189, 0, 21); B.en('alien', 170, 13); B.crystal(178, 14, 3, 1.3);
  return B.done(LV({ name: 'GÉISERES DE FUEGO', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 152 * T + T / 2, y: 20 * T }, bombs: { zones: [[60 * T, 140 * T]], every: 2.2 }, noLava: true }));
};
// 3-3 · descenso al cráter: fase vertical hacia ABAJO, entre bolas de magma que saltan
LEVELS['3-3'] = function () {
  const H = 100, B = LB(34, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 0, H - 1); B.block(31, 33, 0, H - 1); B.block(3, 30, 6, 6); B.block(14, 18, 6, 6, ' ');
  B.row(5, 12, 4); B.hid(24, 2, 'vida');
  const rows = [[3, 10], [20, 30], [8, 16], [18, 26], [3, 9], [22, 30], [10, 18], [3, 8], [24, 30], [12, 20]]; let k = 0;
  for (let y = 12; y < H - 8; y += 7, k++) { const [a, b] = rows[k % rows.length]; B.block(a, b, y, y); B.chip(a + 1, y - 1); B.chip(b - 1, y - 1);
    if (k % 3 === 1) B.jumper(a > 12 ? a - 3 : b + 3, y + 6, 4, k * 0.4); if (k % 4 === 2) B.en('patrulla', a + 2, y - 1); if (k === 5) B.cp(a + 2, y); if (k === 3) B.box(a + 2, y - 4, 'escudo'); if (k === 7) B.gear(a + 3, y - 2); if (k === 10) B.cp(a + 2, y); }
  B.block(3, 6, 40, 46); B.fake(3, 6, 42, 45); B.gear(4, 44);              // hueco en la pared
  B.block(26, 30, 62, 62); B.gear(28, 60); B.block(3, 30, H - 2, H - 1); B.crystal(8, H - 2, 3, 1.3); B.crystal(26, H - 2, 3, 1.3);
  return B.done(LV({ name: 'CRÁTER DEL VOLCÁN', time: 200, vert: true, intro: '¡BAJA HASTA EL FONDO!', spawn: { x: 8 * T, y: 6 * T }, goal: { x: 17 * T + T / 2, y: (H - 2) * T } }));
};
// 3-4 · el río de magma: rocas a la deriva y bolas de magma; la antena está en una isla en mitad del río
LEVELS['3-4'] = function () {
  const B = LB(220, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 18); B.hid(5, 10, 'vida'); B.box(9, 10, 'chip'); B.row(11, 16, 12); B.crystal(2, 14, 3, 1.2);
  B.mover(21, 13, 3, 72, 0, 1.0, 0); B.jumper(27, 16, 6, 0); B.mover(31, 12, 3, 0, 48, 1.3, 1); B.jumper(36, 16, 6, 1.2); B.arc(20, 38, 9, 2);
  B.ground(39, 54); B.en('patrulla', 46, 13); B.box(50, 10, 'escudo');
  B.fall(57, 13, 2); B.jumper(61, 16, 7, 0.5); B.fall(64, 12, 2); B.jumper(68, 16, 7, 1.6); B.fall(71, 11, 2); B.gear(72, 8); B.fall(75, 12, 2); B.row(57, 76, 9);
  B.ground(79, 104); B.cp(81, 14); B.en('alien', 88, 13); B.en('erizo', 98, 13);
  B.arc(104, 108, 11, 2); B.pitWarp(105, 107, 205, 13); B.ground(108, 128); B.en('patrulla', 118, 13); B.crystal(126, 14, 3);
  B.mover(138, 12, 3, 6 * T, 0, 0.55, 0); B.jumper(137, 16, 7, 0.3); B.jumper(143, 16, 7, 1.5); B.fall(150, 11, 2); B.gear(151, 8); B.mover(155, 12, 3, 0, 72, 1.2, 0.7); B.row(131, 158, 9);
  B.ground(161, 170); B.cp(163, 14);
  // la isla: se llega en una roca que cruza el río
  B.mover(173, 12, 3, 3 * T, 0, 0.7, 0); B.jumper(178, 16, 6, 0.9); B.block(183, 190, 13, 15); B.crystal(189, 13, 3, 1.3); B.block(198, 199, 0, 15);
  B.ground(200, 219); B.block(200, 219, 0, 8); B.block(219, 219, 0, 15); B.row(202, 216, 12); B.row(204, 214, 10); B.gear(212, 12); B.crystal(202, 14, 3, 1.3); B.portal(217, 14, 112, 14);
  return B.done(LV({ name: 'RÍO DE MAGMA', time: 230, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 186 * T + T / 2, y: 13 * T } }));
};
// 3-5 · lluvia de bombas del volcán: hay que ir de refugio en refugio mirando dónde caen; la antena está bajo un arco de piedra
LEVELS['3-5'] = function () {
  const B = LB(210, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 209); B.hid(6, 10, 'vida'); B.box(10, 10, 'escudo'); B.row(13, 20, 12);
  const roof = (a, b) => { B.block(a, a, 10, 11); B.block(b, b, 10, 11); B.block(a, b, 9, 9); B.row(a + 1, b - 1, 13); };          // refugio: se entra por debajo de los pilares
  roof(26, 32); B.en('patrulla', 38, 13); B.arc(42, 46, 11, 2); B.block(44, 44, 14, 15, ' '); B.block(43, 45, 14, 15, ' ');
  roof(52, 57); B.en('alien', 62, 13); B.geyser(68, 14, 4, 0.5); roof(73, 79); B.box(76, 6, 'estrella'); B.cp(82, 14);
  B.block(90, 92, 12, 13); B.en('torreta', 91, 11); B.block(96, 101, 10, 13); B.fake(96, 100, 11, 13); B.gear(99, 12); B.row(96, 101, 9);
  roof(108, 113); B.en('erizo', 118, 13); B.arc(122, 128, 11, 2); B.block(123, 127, 14, 15, ' '); roof(133, 139); B.cp(142, 14); B.gear(146, 10); P(144, 148, 11);
  B.en('patrulla', 154, 13); roof(160, 166); B.geyser(171, 14, 4, 1.2); B.en('alien', 176, 13);
  B.block(184, 185, 8, 11); B.block(196, 197, 8, 11); B.block(184, 197, 6, 7);          // arco: se entra por debajo B.crystal(187, 14, 3, 1.2); B.crystal(194, 14, 3, 1.2); B.block(205, 209, 0, 15);
  return B.done(LV({ name: 'LLUVIA DE FUEGO', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 190 * T + T / 2, y: 14 * T }, bombs: { zones: [[22 * T, 183 * T]], every: 0.9 }, intro: '¡MIRA DÓNDE CAEN!' }));
};
// 3-6 · la vagoneta: la pantalla avanza sola por los túneles de la mina, con techos bajos y cintas turbo
LEVELS['3-6'] = function () {
  const B = LB(250, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 249, 0, 2); B.ground(0, 249); B.hid(8, 10, 'vida'); B.row(10, 16, 12);
  B.block(24, 34, 3, 10); B.row(25, 33, 13); B.arc(38, 43, 11, 2); B.block(39, 42, 14, 15, ' '); B.en('patrulla', 48, 13); B.block(54, 70, 3, 9); B.strip(55, 69); B.row(56, 68, 12);
  B.block(76, 77, 12, 13); B.block(84, 85, 11, 13); B.block(92, 93, 12, 13); B.row(78, 91, 9); B.box(88, 6, 'escudo'); B.cp(98, 14);
  B.arc(102, 108, 11, 2); B.block(103, 107, 14, 15, ' '); B.block(112, 130, 3, 10); B.strip(113, 129); B.en('alien', 122, 13); B.gear(127, 12);
  B.block(136, 137, 7, 13); B.block(136, 137, 7, 9, 'C'); B.block(136, 137, 10, 13, ' '); B.block(136, 137, 3, 6); B.row(132, 140, 12);      // pasa por debajo… o rompe la roca con láser
  B.box(132, 8, 'laser'); B.arc(144, 150, 11, 2); B.block(145, 149, 14, 15, ' '); B.en('erizo', 156, 13); B.cp(162, 14);
  B.block(168, 190, 3, 9); B.strip(169, 189); B.row(170, 188, 12); B.block(194, 195, 12, 13); B.block(200, 204, 11, 13); B.fake(200, 203, 12, 13); B.gear(202, 12); B.pipe(212, 14, 236, 14, true);
  B.arc(216, 222, 11, 2); B.block(217, 221, 14, 15, ' '); B.block(226, 249, 0, 9); B.crystal(240, 14, 3, 1.4); B.row(230, 238, 12);
  return B.done(LV({ name: 'TÚNELES DE LAVA', time: 160, cave: true, intro: '¡LA VAGONETA NO PARA!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 245 * T + T / 2, y: 14 * T }, auto: { speed: 165, x: 0 } }));
};
// 3-7 · el gran puente: cortinas de lava que se abren y se cierran, tramos que se derrumban y la antena en la puerta del castillo
LEVELS['3-7'] = function () {
  const B = LB(220, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 20); B.hid(5, 10, 'vida'); B.box(9, 10, 'escudo'); B.row(12, 18, 12); B.crystal(2, 14, 3, 1.2);
  P(21, 60, 12); B.block(30, 50, 3, 3); B.lavafall(33, 4, 11, 0); B.lavafall(40, 4, 11, 1.1); B.lavafall(47, 4, 11, 2.2); B.en('patrulla', 55, 11); B.row(22, 59, 10);
  B.ground(61, 78); B.cp(63, 14); B.box(68, 10, 'laser'); B.en('alien', 74, 13);
  P(79, 88, 12); B.fall(89, 12, 2); P(91, 102, 12); B.fall(103, 12, 2); P(105, 116, 12); B.en('erizo', 96, 11); B.block(84, 112, 3, 3); B.lavafall(86, 4, 11, 0.5); B.lavafall(100, 4, 11, 1.4); B.lavafall(110, 4, 11, 0.2); B.row(80, 115, 10); B.gear(98, 9);
  P(117, 122, 12); P(127, 140, 12); B.pitWarp(123, 126, 207, 13); B.en('dron', 132, 8, { x0: 126, x1: 140 });
  B.ground(141, 200); B.cp(143, 14); B.block(150, 152, 12, 13); B.en('torreta', 151, 11); B.block(156, 190, 3, 3); B.lavafall(160, 4, 13, 0); B.lavafall(170, 4, 13, 0.9); B.lavafall(180, 4, 13, 1.8);
  B.block(186, 199, 4, 6); B.block(186, 187, 7, 9); B.block(198, 199, 7, 13); B.crystal(195, 14, 3, 1.2); B.block(200, 202, 0, 15);
  B.ground(203, 219); B.block(203, 219, 0, 8); B.block(219, 219, 0, 15); B.row(205, 216, 12); B.gear(212, 12); B.crystal(205, 14, 3, 1.2); B.portal(217, 14, 145, 14);
  return B.done(LV({ name: 'EL GRAN PUENTE', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 192 * T + T / 2, y: 14 * T } }));
};
// 3-8 · la fundición: interruptores que cambian los bloques rojos y azules; la antena está en el tejado del horno
LEVELS['3-8'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 199); B.hid(6, 10, 'vida'); B.box(10, 10, 'chip'); B.row(12, 18, 12);
  B.set(22, 10, '!'); B.block(28, 29, 9, 13, 'X'); B.row(31, 36, 12); B.block(38, 39, 9, 13, 'Y'); B.en('patrulla', 34, 13);
  B.strip(42, 56); B.block(46, 52, 8, 8); B.laser(49, 9, 13, 0); B.row(43, 55, 12); B.set(60, 10, '!');
  B.block(64, 72, 10, 10, 'X'); B.block(64, 72, 6, 6, 'Y'); B.row(64, 72, 5); B.gear(68, 4); B.block(74, 75, 6, 13); B.en('alien', 70, 13); B.cp(80, 14);
  B.block(86, 88, 12, 13); B.en('torreta', 87, 11); B.set(92, 10, '!'); B.block(96, 106, 12, 13, 'Y'); B.block(96, 106, 12, 12, 'X'); B.lift(108, 110, 5, 13); P(111, 116, 5); B.row(111, 116, 4); B.box(114, 1, 'escudo');
  B.block(118, 124, 9, 13); B.block(119, 123, 11, 13, ' '); B.fake(118, 118, 11, 13); B.row(119, 122, 12); B.gear(122, 12); B.en('erizo', 130, 13); B.cp(136, 14);
  // el horno: se sube alternando bloques
  B.set(140, 10, '!'); B.block(144, 147, 11, 11, 'X'); B.block(148, 151, 8, 8, 'Y'); B.block(152, 155, 5, 5, 'X'); B.set(150, 2, '!'); B.block(158, 176, 4, 13); B.laser(166, 0, 3, 0.4); B.crystal(174, 4, 3, 1.3); B.block(196, 199, 0, 15);
  return B.done(LV({ name: 'LA FUNDICIÓN', time: 240, intro: '¡GOLPEA LOS INTERRUPTORES!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 170 * T + T / 2, y: 4 * T } }));
};
// 3-9 · altos hornos: subida vertical con corrientes de calor y bloques que cambian con interruptores
LEVELS['3-9'] = function () {
  const H = 96, B = LB(30, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 0, H - 1); B.block(27, 29, 0, H - 1); B.ground(3, 26); B.row(6, 12, H - 4); B.hid(16, H - 6, 'vida'); B.crystal(24, H - 2, 3, 1.2);
  B.lift(22, 24, H - 20, H - 3); B.chip(23, H - 10); P(17, 21, H - 20); B.en('patrulla', 19, H - 21); P(8, 13, H - 24); B.set(10, H - 28, '!'); B.block(3, 7, H - 26, H - 26, 'X'); B.block(3, 7, H - 32, H - 32, 'Y'); B.gear(4, H - 34);
  P(14, 19, H - 30); B.box(16, H - 34, 'escudo'); B.lift(3, 5, H - 50, H - 34); P(6, 11, H - 50); B.cp(8, H - 50); B.en('dron', 15, H - 54, { x0: 6, x1: 24 });
  P(13, 22, H - 54); B.set(20, H - 58, '!'); B.block(23, 26, H - 58, H - 58, 'Y'); B.block(23, 26, H - 64, H - 64, 'X'); B.gear(24, H - 66); P(11, 19, H - 61); B.lift(6, 8, H - 80, H - 63); P(9, 14, H - 80);
  B.block(18, 26, H - 74, H - 74); B.fake(18, 18, H - 73, H - 70); B.block(18, 26, H - 69, H - 69); B.row(19, 25, H - 71); B.gear(25, H - 71);              // cámara en la pared
  P(16, 21, H - 84); B.en('patrulla', 18, H - 85); P(22, 26, H - 86); B.cp(24, H - 86); B.lift(3, 5, 6, H - 84); B.block(6, 26, 6, 7); B.crystal(24, 6, 3, 1.3); B.row(8, 20, 4);
  return B.done(LV({ name: 'LAS CHIMENEAS', time: 240, vert: true, spawn: { x: 5 * T, y: (H - 2) * T }, goal: { x: 15 * T + T / 2, y: 6 * T } }));
};
// 3-10 · engranajes gigantes: plataformas de la maquinaria y una red de escotillas; la última lleva a la sala de la antena
LEVELS['3-10'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 22); B.cog(8, 7, 3); B.hid(12, 10, 'vida'); B.box(16, 10, 'escudo'); B.row(5, 10, 12);
  B.mover(24, 12, 3, 0, 72, 1.2, 0); B.mover(30, 10, 3, 0, 72, 1.2, 1.5); B.mover(36, 12, 3, 60, 0, 1.0, 0); B.row(24, 40, 8);
  B.ground(42, 70); B.cog(56, 8, 4); B.en('patrulla', 50, 13); B.geyser(60, 14, 5, 0); B.box(64, 10, 'laser'); B.pipe(67, 14, 150, 14, true);
  B.mover(72, 12, 3, 48, -48, 1.1, 0); B.mover(80, 10, 3, 48, 48, 1.1, 1.6); P(87, 90, 9); B.gear(89, 7); B.row(72, 86, 8);
  B.ground(92, 130); B.cp(94, 14); B.en('alien', 100, 13); B.cog(110, 6, 5); B.en('erizo', 116, 13); B.pipe(126, 14, 172, 14, false); B.block(130, 131, 0, 15);
  B.ground(132, 160); B.block(132, 160, 0, 6); B.row(134, 158, 12); B.gear(146, 9); P(144, 148, 10); B.en('patrulla', 140, 13); B.pipe(157, 14, 98, 14, false); B.block(160, 161, 0, 15);
  B.ground(162, 199); B.block(162, 199, 0, 4); B.cog(186, 9, 4); B.crystal(196, 14, 3, 1.3); B.cp(168, 14); B.block(199, 199, 0, 15);
  return B.done(LV({ name: 'ENGRANAJES GIGANTES', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 190 * T + T / 2, y: 14 * T }, intro: '¡AGÁCHATE EN LAS ESCOTILLAS!' }));
};
// 3-11 · rocas flotantes con gravedad baja y corrientes de calor que suben
LEVELS['3-11'] = function () {
  const H = 26, B = LB(160, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 12); B.hid(4, 20, 'vida'); B.box(8, 20, 'escudo'); B.row(5, 11, 22); B.crystal(2, 24, 3, 1.3);
  B.fall(15, 22, 2); B.fall(20, 19, 2); B.lift(24, 26, 8, 24); P(28, 34, 8); B.gear(31, 6); B.row(28, 34, 7); B.fall(37, 11, 2); B.fall(42, 14, 2); B.fall(47, 17, 2); B.ground(50, 62); B.cp(52, 24); B.en('alien', 58, 23);
  B.lift(64, 66, 10, 24); for (let y = 12; y < 23; y += 3) B.chip(65, y); P(68, 72, 10); B.en('dron', 76, 8, { x0: 68, x1: 86 }); P(80, 84, 12); B.fall(88, 14, 2); B.fall(93, 12, 2); B.fall(98, 10, 2); B.gear(99, 7);
  B.block(103, 110, 12, 15); B.fake(103, 103, 13, 14); B.gear(106, 14); B.block(104, 109, 13, 14, ' '); B.cp(108, 12); B.row(103, 110, 11);
  B.fall(114, 15, 2); B.lift(118, 120, 6, 22); B.fall(124, 8, 2); B.fall(130, 7, 2); B.fall(136, 6, 2); B.row(124, 138, 4);
  B.block(142, 159, 6, 9); B.crystal(156, 6, 3, 1.4); B.block(158, 159, 0, 5);
  return B.done(LV({ name: 'ROCAS FLOTANTES', time: 190, sky: true, gk: 0.55, intro: '¡GRAVEDAD BAJA!', meteors: { zones: [[36 * T, 140 * T]], every: 1.3, acc: 0 }, spawn: { x: 3 * T, y: 24 * T }, goal: { x: 150 * T + T / 2, y: 6 * T } }));
};
// 3-12 · murallas de la fortaleza: tres llaves repartidas por las torres abren la puerta del castillo
LEVELS['3-12'] = function () {
  const H = 20, B = LB(170, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 169); B.hid(5, 14, 'vida'); B.box(9, 14, 'escudo'); B.row(11, 17, 16); B.en('patrulla', 20, 17);
  // torre 1: llave arriba
  B.block(26, 32, 6, 17); B.block(27, 31, 7, 16, ' '); B.block(26, 26, 16, 17, ' '); B.block(32, 32, 16, 17, ' ');          // puertas abajo a los dos lados B.block(28, 31, 13, 13); B.block(27, 30, 10, 10); B.pad(31, 17); B.key(29, 8); B.en('alien', 30, 12);
  B.geyser(38, 18, 5, 0); B.en('erizo', 44, 17); B.block(48, 50, 16, 17); B.en('torreta', 49, 15); B.cp(54, 18); B.box(58, 14, 'laser');
  // torre 2: llave detrás de una pared agrietada
  B.block(62, 70, 8, 17); B.block(63, 69, 9, 17, ' '); B.block(62, 62, 15, 17, 'C'); B.key(66, 16); B.gear(68, 16); B.block(70, 70, 15, 17, 'F'); B.row(62, 70, 6);
  B.lavafall(76, 2, 17, 0); B.lavafall(82, 2, 17, 1.2); B.block(74, 84, 1, 1); B.en('patrulla', 90, 17); B.cp(96, 18);
  // torre 3: llave en lo alto, se sube con géiseres y plataformas
  B.pad(100, 18); P(102, 106, 13); B.en('dron', 108, 9, { x0: 102, x1: 116 }); P(108, 112, 9); P(114, 118, 5); B.key(116, 3); B.block(104, 120, 0, 0); B.gear(110, 7);
  B.geyser(124, 18, 6, 0.5); B.geyser(130, 18, 6, 1.4); B.en('alien', 136, 17); B.cp(140, 18);
  // la puerta del castillo
  B.block(146, 169, 0, 13); B.door(146, 14, 17); B.crystal(162, 18, 3, 1.3); B.block(168, 169, 0, 19);
  return B.done(LV({ name: 'MURALLAS DE LA FORTALEZA', time: 280, intro: '¡BUSCA LAS 3 LLAVES!', spawn: { x: 3 * T, y: 18 * T }, goal: { x: 156 * T + T / 2, y: 18 * T }, noLava: true }));
};
// 3-13 · isla flotante: corrientes de calor que soplan de lado entre islas; la antena está en la isla más alta
LEVELS['3-13'] = function () {
  const H = 22, B = LB(170, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 14); B.hid(5, 16, 'vida'); B.box(9, 16, 'turbo'); B.row(4, 12, 18); B.crystal(2, 20, 3, 1.3);
  B.wind(16, 44, 4, 19, 380, 0); B.fall(18, 18, 2); B.fall(25, 16, 2); B.fall(32, 17, 2); B.fall(39, 15, 2); B.row(18, 40, 12); B.block(46, 56, 17, 21); B.en('alien', 51, 16); P(48, 51, 12); B.gear(50, 10);
  B.mover(59, 17, 3, 0, 96, 1.0, 0); B.block(65, 78, 15, 21); B.cp(67, 15); B.block(72, 76, 11, 14); B.fake(72, 72, 12, 14); B.block(73, 76, 12, 14, ' '); B.gear(75, 14); B.row(72, 76, 10);
  B.wind(80, 112, 4, 19, -320, 1.2); B.fall(81, 16, 2); B.fall(87, 14, 2); B.mover(92, 13, 3, 72, 0, 1.0, 0); B.fall(102, 13, 2); B.fall(108, 15, 2); B.row(82, 110, 10); B.pipe(70, 15, 148, 7, true);
  B.block(113, 124, 16, 21); B.cp(115, 16); B.en('dron', 120, 11, { x0: 113, x1: 128 }); B.pad(122, 16); P(126, 130, 10); B.gear(128, 8); B.wind(130, 150, 2, 14, 300, 0.5); B.fall(134, 10, 2); B.fall(140, 8, 2);
  B.block(145, 169, 7, 10); B.crystal(165, 7, 3, 1.4); B.block(168, 169, 0, 6);
  return B.done(LV({ name: 'ISLA FLOTANTE', time: 200, sky: true, gk: 0.65, intro: '¡CORRIENTES DE CALOR!', spawn: { x: 3 * T, y: 20 * T }, goal: { x: 158 * T + T / 2, y: 7 * T } }));
};
// 3-14 · mina de cristal rojo: el láser abre el camino rompiendo paredes agrietadas (y descubre cosas escondidas)
LEVELS['3-14'] = function () {
  const B = LB(190, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 189, 0, 2); B.ground(0, 189); B.crystal(4, 14, 3, 1.3); B.box(9, 10, 'laser'); B.hid(14, 10, 'vida'); B.row(16, 22, 12);
  B.block(26, 27, 3, 13, 'C'); B.en('patrulla', 32, 13); B.crystal(36, 14, 3); B.block(40, 50, 3, 9); B.block(46, 46, 10, 13, 'C'); B.row(41, 45, 12); B.box(48, 11, 'chip');
  B.block(54, 70, 9, 9); B.block(54, 54, 10, 13, 'C'); B.block(70, 70, 10, 11); B.row(55, 69, 12); B.gear(66, 12); B.jumper(60, 16, 5, 0); B.block(58, 62, 14, 15, ' ');
  B.cp(74, 14); B.en('alien', 80, 13); B.block(86, 87, 3, 13, 'C'); B.block(90, 104, 3, 8); B.en('erizo', 96, 13); B.crystal(100, 14, 3, 1.2);
  B.block(108, 116, 10, 13); B.block(108, 108, 10, 13, 'C'); B.block(109, 115, 11, 12, ' '); B.gear(113, 12); B.row(108, 116, 9);
  B.block(120, 121, 3, 13, 'C'); B.cp(126, 14); B.jumper(132, 16, 5, 0.6); B.block(131, 133, 14, 15, ' '); B.en('patrulla', 138, 13); B.box(142, 10, 'laser');
  B.block(150, 151, 3, 13, 'C'); B.block(156, 157, 3, 13, 'C'); B.crystal(164, 14, 3, 1.2); B.crystal(178, 14, 3, 1.3); B.block(184, 189, 0, 15);
  return B.done(LV({ name: 'MINA DE CRISTAL ROJO', time: 230, cave: true, intro: '¡ROMPE LAS PAREDES CON EL LÁSER!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 172 * T + T / 2, y: 14 * T } }));
};
// 3-B · el tesoro del volcán: cámaras llenas de chips tras interruptores, bolas de magma y una puerta de 3 llaves
LEVELS['3-B'] = function () {
  const H = 20, B = LB(140, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 139, 0, 1); B.ground(0, 139); B.block(0, 1, 0, H - 1); B.hid(6, 14, 'vida'); B.crystal(4, 18, 3, 1.3); for (let x = 8; x < 20; x++) B.chip(x, 16);
  B.set(22, 14, '!'); B.block(26, 36, 12, 17, 'X'); B.block(27, 35, 13, 16, ' '); for (let x = 27; x < 36; x++) { B.chip(x, 14); B.chip(x, 16); } B.key(31, 15);
  B.jumper(40, 20, 6, 0); B.block(39, 41, 18, 19, ' '); B.jumper(46, 20, 6, 1.2); B.block(45, 47, 18, 19, ' '); B.row(38, 48, 12);
  B.block(52, 64, 5, 5, 'Y'); for (let x = 52; x <= 64; x++) B.chip(x, 4); B.pad(54, 18); P(56, 60, 10); B.key(62, 3); B.set(58, 6, '!');
  B.cp(68, 18); for (let i = 0; i < 4; i++) B.geyser(72 + i * 4, 18, 4, i * 0.6); B.row(71, 87, 13);
  B.block(90, 104, 10, 17); B.block(91, 103, 11, 16, ' '); B.block(90, 90, 15, 17, 'C'); B.box(86, 14, 'laser'); for (let x = 91; x < 104; x++) { B.chip(x, 13); B.chip(x, 15); } B.key(100, 16);
  B.block(110, 139, 0, 13); B.door(110, 14, 17); for (let x = 113; x < 136; x++) { B.chip(x, 16); B.chip(x, 14); } B.block(138, 139, 0, 19);
  return B.done(LV({ name: 'TESORO DEL VOLCÁN', time: 200, cave: true, intro: '¡3 LLAVES ABREN EL TESORO!', spawn: { x: 4 * T, y: 18 * T }, goal: { x: 133 * T + T / 2, y: 18 * T }, noLava: true }));
};
// 3-J · Señor del Magma: los poderes esperan en tres forjas antes de la arena
LEVELS['3-J'] = function () {
  const B = LB(80, 16);
  B.ground(0, 79); B.crystal(3, 14, 3, 1.3); B.kitp(12, 14, 'escudo'); B.kitp(20, 14, 'laser'); B.kitp(28, 14, 'vuelo'); B.row(10, 30, 10); B.hid(33, 10, 'vida'); B.cp(36, 14);
  B.block(42, 43, 0, 10); B.block(78, 79, 0, 15); B.crystal(46, 14, 3, 1.2); B.crystal(75, 14, 3, 1.2); B.gear(60, 7);
  return B.done(LV({ name: 'SEÑOR DEL MAGMA', bossName: 'SEÑOR DEL MAGMA', bossHp: 7, bossStyle: 'magma', time: 300, intro: '¡COGE LOS PODERES DE LAS FORJAS!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: -99999, y: 14 * T }, arena: { x0: 44 * T, x1: 78 * T }, bossLvl: true }));
};
/* ======================= PLANETA 4 · SELVA LUMINOSA (cada fase con su propia idea) ======================= */
const LJ = o => Object.assign({ theme: 'jungle', time: 220 }, o);
// 4-1 · sendero luminoso: setas trampolín, charcos tóxicos y la antena sobre un tocón gigante
LEVELS['4-1'] = function () {
  const B = LB(172, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 24); B.crystal(2, 14, 4, 1.3); B.crystal(16, 14, 5); B.row(5, 9, 12); B.hid(10, 10, 'vida'); B.set(13, 10, 'B'); B.box(14, 10, 'escudo'); B.set(15, 10, 'B'); B.en('patrulla', 20, 13);
  B.arc(25, 28, 11, 2); B.ground(29, 60); B.mush(33, 14, 0); P(35, 40, 8); B.row(35, 40, 7); B.gear(38, 5); B.en('erizo', 45, 13); B.crystal(49, 14, 6); B.mush(53, 14, 1); B.fly(54, 8); B.en('alien', 57, 13);
  B.fall(62, 13, 2); B.fall(65, 12, 2); B.arc(61, 67, 9, 2); B.ground(68, 112); B.cp(70, 14); B.box(74, 10, 'laser'); B.en('patrulla', 78, 13);
  B.pipe(82, 14, 160, 14, true);                                             // tronco hueco invisible: escotilla al escondite
  B.vine(90, 5, 13); P(91, 96, 5); B.row(91, 96, 4); B.gear(94, 3); B.en('dron', 100, 9, { x0: 92, x1: 108 }); B.crystal(104, 14, 4, 1.2);
  B.arc(113, 116, 11, 2); B.ground(117, 152); B.mush(121, 14, 2); B.en('erizo', 126, 13); B.cp(122, 14);
  B.block(130, 141, 8, 15); B.crystal(139, 8, 5, 1.3); B.mush(127, 14, 0); B.row(130, 138, 7); B.block(152, 153, 0, 15);
  B.ground(154, 171); B.block(154, 171, 0, 7); B.block(171, 171, 0, 15); B.row(156, 168, 12); B.row(157, 167, 10); B.gear(165, 12); B.crystal(157, 14, 6, 1.2); B.portal(169, 14, 118, 14);
  return B.done(LJ({ name: 'SENDERO LUMINOSO', intro: '¡SALTA SOBRE LAS SETAS!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 135 * T + T / 2, y: 8 * T } }));
};
// 4-2 · lianas gigantes: troncos enormes, lianas para trepar y la antena en la rama más alta
LEVELS['4-2'] = function () {
  const H = 24, B = LB(176, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.ground(0, 16); B.hid(6, g - 4, 'vida'); B.row(4, 10, g - 2); B.crystal(2, g, 5, 1.3);
  const trunk = (x0, x1, top) => B.block(x0, x1, top, H - 1);
  trunk(18, 21, 14); B.vine(17, 8, g - 1); P(22, 28, 8); B.row(22, 28, 7); B.en('patrulla', 25, 7); B.vine(30, 8, 19); B.fall(31, g - 3, 2);
  trunk(34, 37, 12); B.box(36, 8, 'escudo'); P(38, 45, 12); B.vine(47, 4, 15); B.gear(47, 2); P(48, 54, 9); B.en('alien', 52, 8); B.cp(36, 12);
  trunk(56, 60, 16); B.vine(55, 10, g - 1); B.ground(61, 75); B.en('erizo', 68, g - 1); B.mush(72, g, 1); P(74, 80, 12); B.vine(82, 6, 19); B.row(74, 80, 11);
  trunk(84, 88, 10); B.cp(86, 10); P(89, 96, 10); B.en('dron', 96, 6, { x0: 89, x1: 104 }); B.vine(99, 5, 17); B.fly(99, 4);
  trunk(101, 104, 12); B.fake(102, 103, 12, 12); B.block(102, 103, 13, 14, ' '); B.gear(102, 14);           // tronco hueco: su corteza de arriba es falsa
  P(105, 112, 8); B.vine(114, 2, 15); P(115, 121, 4); B.row(115, 121, 3); B.gear(118, 1); B.en('patrulla', 119, 3);
  trunk(124, 128, 14); B.vine(123, 9, g - 1); P(129, 136, 9); B.mush(138, 9, 2); B.block(138, 139, 9, 9); P(142, 148, 4); B.vine(150, 4, 14);
  trunk(152, 175, 6); B.crystal(170, 6, 4, 1.4); B.row(156, 166, 4);
  return B.done(LJ({ name: 'LIANAS GIGANTES', intro: '¡MANTÉN SALTO PARA TREPAR!', spawn: { x: 3 * T, y: g * T }, goal: { x: 164 * T + T / 2, y: 6 * T } }));
};
// 4-3 · ciénaga tóxica: nenúfares que se hunden, plantas carnívoras que saltan del agua y la antena en una isla
LEVELS['4-3'] = function () {
  const B = LB(196, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 18); B.hid(6, 10, 'vida'); B.box(10, 10, 'escudo'); B.row(12, 16, 12); B.crystal(2, 14, 6, 1.2);
  B.fall(20, 13, 2); B.jumper(24, 15, 5, 0); B.fall(26, 12, 2); B.fall(30, 13, 2); B.jumper(33, 15, 5, 1.3); B.fall(35, 12, 2); B.row(20, 36, 9);
  B.ground(39, 54); B.en('alien', 46, 13); B.crystal(52, 14, 5);
  B.fall(56, 13, 2); B.fall(59, 11, 2); B.fall(62, 9, 2); B.gear(63, 7); B.fall(65, 11, 2); B.jumper(61, 15, 6, 0.6); B.fall(68, 13, 2);
  B.ground(71, 100); B.cp(73, 14); B.en('torreta', 80, 13); B.block(79, 81, 14, 14); B.box(86, 10, 'laser'); B.en('alien', 92, 13);
  B.pitWarp(96, 97, 182, 13); B.block(96, 97, 14, 15, ' ');            // un hoyo oscuro sin ciénaga: lleva a la cueva de la rana dorada
  B.fall(102, 13, 2); B.jumper(105, 15, 5, 0.2); B.fall(107, 12, 2); B.jumper(110, 15, 5, 1.4); B.fall(112, 13, 2); B.fall(116, 12, 2); B.jumper(119, 15, 5, 0.8); B.fall(121, 13, 2); B.row(102, 122, 9);
  B.ground(124, 145); B.cp(126, 14); B.en('erizo', 132, 13); B.mush(138, 14, 0); P(140, 145, 8); B.gear(143, 6);
  B.fall(147, 13, 2); B.fall(151, 13, 2); B.jumper(154, 15, 6, 0); B.fall(156, 12, 2); B.fall(160, 13, 2);
  B.ground(163, 176); B.crystal(174, 14, 4, 1.4); B.block(177, 178, 0, 15);
  B.ground(179, 195); B.block(179, 195, 0, 7); B.block(195, 195, 0, 15); B.row(181, 193, 12); B.row(183, 191, 10); B.hid(187, 10, 'chip'); B.crystal(181, 14, 5, 1.2); B.portal(193, 14, 128, 14);
  return B.done(LJ({ name: 'CIÉNAGA TÓXICA', intro: '¡LOS NENÚFARES SE HUNDEN!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 170 * T + T / 2, y: 14 * T } }));
};
// 4-4 · tormenta tropical: lluvia, relámpagos que caen donde avisan y la antena bajo una hoja gigante
LEVELS['4-4'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 199); B.hid(6, 10, 'vida'); B.row(4, 10, 12); B.box(12, 10, 'escudo');
  const leaf = (a, b, ty) => { B.block(a, b, ty, ty, '='); for (let x = a; x <= b; x++) B.chip(x, 13); };
  leaf(22, 28, 9); B.en('patrulla', 34, 13); leaf(40, 46, 10); B.vine(51, 4, 13); P(52, 57, 4); B.gear(55, 2); B.row(52, 57, 3); B.en('alien', 60, 13);
  B.arc(64, 68, 11, 2); B.block(65, 67, 14, 15, ' '); leaf(72, 79, 9); B.cp(76, 14); B.box(84, 10, 'laser'); B.en('erizo', 90, 13); B.mush(96, 14, 1); P(98, 103, 8); B.gear(101, 6);
  B.block(106, 112, 11, 13); B.fake(106, 106, 12, 13); B.block(107, 111, 12, 13, ' '); B.row(107, 111, 12); B.fly(110, 12);    // roca hueca
  leaf(116, 122, 10); B.en('patrulla', 126, 13); B.arc(130, 134, 11, 2); B.block(131, 133, 14, 15, ' '); leaf(138, 145, 9); B.cp(141, 14); B.en('dron', 150, 9, { x0: 144, x1: 160 }); B.vine(157, 5, 13); P(158, 162, 5); B.gear(160, 3);
  leaf(166, 172, 10); B.en('alien', 176, 13); B.block(182, 183, 8, 11); B.block(196, 197, 8, 11); B.block(182, 197, 7, 7, '='); B.crystal(194, 14, 6, 1.3); B.block(198, 199, 0, 15);
  return B.done(LJ({ name: 'TORMENTA TROPICAL', storm: true, intro: '¡CUIDADO CON LOS RAYOS!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 189 * T + T / 2, y: 14 * T }, bombs: { zones: [[18 * T, 181 * T]], every: 1.5, style: 'bolt' } }));
};
// 4-5 · chorros de esporas: subida vertical por dentro de un hongo gigante, lanzado por las esporas
LEVELS['4-5'] = function () {
  const H = 96, B = LB(30, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 0, H - 1); B.block(27, 29, 0, H - 1); B.ground(3, 26); B.row(6, 12, H - 4); B.hid(16, H - 6, 'vida'); B.crystal(24, H - 2, 6, 1.3);
  let y = H - 2, pa = 3, pb = 26; const steps = [[4, 10], [8, 15], [13, 20], [18, 24], [13, 20], [8, 15]];          // cada chorro está sobre la plataforma de abajo y lanza a la de arriba
  for (let k = 0; k < 12; k++) { const [a, b] = steps[k % 6], ny = y - 7, sx = ((Math.max(a, pa) + Math.min(b, pb)) / 2) | 0; B.spore(sx, y, 7, k * 0.4, 2.6); P(a, b, ny); pa = a; pb = b; if (k % 3 === 1) B.row(a, b, ny - 1); if (k % 4 === 2) B.en('alien', a + 1, ny - 1); if (k === 4) B.cp(a + 2, ny); if (k === 8) B.cp(a + 2, ny); if (k === 3) B.box(a + 2, ny - 4, 'escudo'); y = ny; }
  B.spore(13, y, 7, 0.3, 2.6);          // el último chorro sube por el hueco del techo hasta la antena
  B.gear(25, 70); B.vine(25, 66, 80); B.gear(4, 40); B.block(3, 6, 36, 36); B.block(3, 6, 42, 42); B.block(6, 6, 37, 41); B.fake(6, 6, 38, 41); B.row(3, 5, 39);      // nicho escondido en la pared
  B.gear(10, 8); B.block(3, 26, 6, 7); B.block(12, 15, 6, 7, ' '); B.crystal(22, 6, 4, 1.3); B.row(8, 20, 4);
  return B.done(LJ({ name: 'CHORROS DE ESPORAS', time: 230, vert: true, intro: '¡LAS ESPORAS TE LANZAN!', spawn: { x: 5 * T, y: (H - 2) * T }, goal: { x: 20 * T + T / 2, y: 6 * T } }));
};
// 4-6 · dentro del árbol: a oscuras, las luciérnagas que encuentras te siguen y te alumbran; dos llaves abren la salida
LEVELS['4-6'] = function () {
  const H = 20, B = LB(170, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.block(0, 169, 0, 1); B.block(0, 1, 0, H - 1); B.block(168, 169, 0, H - 1); B.ground(0, 169);
  B.fly(4, 16); B.fly(9, 15); B.hid(12, 14, 'vida'); B.row(6, 12, 16); B.en('patrulla', 20, g - 1); B.block(26, 40, 10, 11); B.row(27, 39, 16); B.fly(33, 14); B.en('erizo', 36, g - 1);
  B.block(44, 46, 14, 17); B.vine(48, 6, 17); P(49, 58, 6); B.key(56, 4); B.fly(52, 4); B.en('alien', 54, 5); B.block(60, 62, 2, 9);
  B.cp(66, g); B.block(70, 90, 12, 13); B.block(70, 70, 14, 17); B.fake(70, 70, 15, 17); B.row(72, 88, 16); B.gear(86, 16); B.fly(80, 15);   // cámara bajo la rama, entrada falsa
  B.mush(93, g, 0); P(95, 104, 9); B.fly(100, 7); B.en('dron', 108, 9, { x0: 98, x1: 118 }); B.gear(104, 7); P(108, 114, 12); B.pipe(116, g, 150, g, true);
  B.cp(120, g); B.block(124, 128, 8, 17); B.block(125, 127, 9, 16, ' '); B.block(124, 124, 14, 16, 'C'); B.box(118, 14, 'laser'); B.key(126, 15); B.fly(126, 11);   // la segunda llave, tras corteza agrietada (láser)
  B.en('patrulla', 134, g - 1); B.vine(140, 8, 17); P(141, 147, 8); B.gear(144, 6); B.door(152, g - 4, g - 1); B.block(152, 167, 2, g - 5); B.crystal(162, g, 5, 1.3); B.fly(158, 14);
  return B.done(LJ({ name: 'DENTRO DEL ÁRBOL', time: 280, cave: true, dark: true, intro: '¡LAS LUCIÉRNAGAS TE ALUMBRAN!', spawn: { x: 4 * T, y: g * T }, goal: { x: 160 * T + T / 2, y: g * T } }));
};
// 4-7 · las copas: sin suelo, de rama en rama, troncos voladores y setas en las ramas
LEVELS['4-7'] = function () {
  const H = 22, B = LB(186, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 10, 16, 17); B.hid(5, 12, 'vida'); B.row(2, 8, 14); B.crystal(2, 16, 4, 1.2);
  B.mover(13, 16, 3, 0, 72, 1.0, 0); P(19, 25, 13); B.en('patrulla', 22, 12); B.mush(27, 14, 1); B.block(27, 28, 14, 14); P(31, 36, 7); B.gear(34, 5); P(38, 44, 12); B.vine(46, 3, 15); P(47, 52, 3); B.row(47, 52, 2);
  B.mover(48, 14, 3, 96, 0, 0.9, 0); P(56, 63, 12); B.cp(59, 12); B.en('alien', 62, 11); B.icicle(57, 3); B.block(55, 64, 2, 2); B.icicle(61, 3, 1);
  B.mover(66, 11, 3, 0, 96, 1.1, 0.6); P(72, 77, 9); B.box(75, 5, 'escudo'); B.mover(80, 12, 3, 96, 0, 1.0, 1.4); P(88, 95, 13); B.gear(94, 11); B.en('erizo', 91, 12);
  B.block(98, 106, 9, 11); B.block(99, 105, 10, 10, ' '); B.fake(99, 105, 11, 11); B.row(99, 105, 10); B.fly(102, 10); B.row(99, 105, 8);            // rama gruesa hueca: por debajo es falsa
  P(98, 104, 14); B.mush(108, 15, 2); B.block(108, 109, 15, 15); P(111, 118, 8); B.en('dron', 116, 4, { x0: 110, x1: 126 }); B.cp(114, 8); B.vine(120, 9, 17); P(121, 127, 17); B.gear(124, 15);
  B.mover(130, 14, 3, 0, 96, 1.2, 0); B.mover(137, 11, 3, 96, 0, 1.0, 1); P(146, 152, 10); B.en('patrulla', 149, 9); B.mover(155, 12, 3, 0, 72, 1.1, 0.3);
  B.block(162, 185, 10, 11); B.crystal(180, 10, 6, 1.3); B.row(164, 172, 8);
  return B.done(LJ({ name: 'LAS COPAS', time: 220, intro: '¡NO HAY SUELO!', spawn: { x: 3 * T, y: 16 * T }, goal: { x: 174 * T + T / 2, y: 10 * T } }));
};
// 4-8 · nido de plantas carnívoras: torretas-planta, plantas que muerden desde los hoyos e interruptores que abren paso
LEVELS['4-8'] = function () {
  const B = LB(196, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 195); B.hid(6, 10, 'vida'); B.box(10, 10, 'laser'); B.row(4, 9, 12);
  const pit = (a, b, ph) => { B.block(a, b, 14, 15, ' '); B.jumper(((a + b) / 2) | 0, 15, 5, ph); };
  pit(18, 20, 0); B.en('torreta', 26, 13); B.block(25, 27, 14, 14); pit(32, 34, 0.9); B.set(38, 10, '!'); B.block(42, 43, 9, 13, 'X'); B.row(44, 49, 12); B.block(50, 51, 9, 13, 'Y'); B.en('alien', 47, 13);
  pit(54, 56, 0.4); B.en('torreta', 61, 13); B.block(60, 62, 14, 14); B.mush(64, 14, 0); P(66, 72, 8); B.gear(70, 6); B.cp(76, 14);
  pit(80, 83, 0.2); B.set(86, 10, '!'); B.block(90, 100, 10, 10, 'X'); B.block(90, 100, 6, 6, 'Y'); B.row(90, 100, 5); B.gear(95, 4); B.en('torreta', 103, 13); B.block(102, 104, 14, 14);
  pit(108, 110, 1.1); B.en('erizo', 114, 13); B.block(118, 124, 11, 13); B.fake(124, 124, 12, 13); B.block(119, 123, 12, 13, ' '); B.gear(120, 13); B.row(118, 124, 10);     // tocón con la cara derecha falsa
  pit(128, 130, 0.5); B.cp(134, 14); B.en('torreta', 140, 13); B.block(139, 141, 14, 14); pit(146, 148, 0); B.vine(152, 5, 13); P(153, 158, 5); B.box(156, 2, 'escudo'); pit(160, 163, 0.7); B.en('alien', 168, 13);
  B.block(174, 176, 9, 11); B.block(188, 190, 9, 11); B.block(174, 190, 8, 8, '='); B.crystal(185, 14, 5, 1.3); B.block(194, 195, 0, 15);
  return B.done(LJ({ name: 'NIDO DE PLANTAS CARNÍVORAS', time: 240, noLava: true, spawn: { x: 3 * T, y: 14 * T }, goal: { x: 182 * T + T / 2, y: 14 * T } }));
};
// 4-9 · el puente colgante: tablones que se descuelgan y un enjambre furioso que te persigue
LEVELS['4-9'] = function () {
  const B = LB(220, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 16); B.hid(6, 10, 'vida'); B.box(10, 10, 'turbo'); B.row(4, 9, 12);
  let x = 17; const span = (n) => { P(x, x + n - 1, 12); B.row(x, x + n - 1, 10); x += n; }, drop = () => { B.fall(x, 12, 2); x += 2; }, gap = n => { x += n; };
  span(10); drop(); span(6); gap(2); span(8); drop(); drop(); span(6); B.gear(x - 3, 7); B.en('patrulla', x - 12, 11);
  B.ground(x, x + 8); B.cp(x + 3, 14); x += 9;
  span(5); drop(); span(4); gap(3); span(6); B.en('alien', x - 3, 11); drop(); span(5); B.vine(x, 4, 11); B.block(x - 1, x + 5, 3, 3, '='); B.gear(x + 3, 1); span(7); drop(); drop(); span(6);
  B.ground(x, x + 8); B.cp(x + 3, 14); B.box(x + 5, 10, 'escudo'); x += 9;
  const xs = x; span(8); drop(); gap(2); span(5); drop(); span(6); B.en('patrulla', x - 4, 11); drop(); span(8); B.gear(x - 4, 7); gap(3); span(6); drop(); span(5);
  B.pitWarp(xs + 9, xs + 11, 206, 13);
  B.ground(x, 199); B.crystal(x + 12, 14, 6, 1.3); B.block(200, 201, 0, 15); const gx = x + 8;
  B.ground(202, 219); B.block(202, 219, 0, 7); B.block(219, 219, 0, 15); B.row(204, 216, 12); B.row(205, 215, 10); B.fly(210, 9); B.portal(217, 14, gx - 6, 14);
  return B.done(LJ({ name: 'EL PUENTE COLGANTE', time: 200, planks: true, spawn: { x: 3 * T, y: 14 * T }, goal: { x: gx * T + T / 2, y: 14 * T }, chase: { x: -9999, speed: 150, startX: 15 * T, on: false, style: 'swarm' } }));
};
// 4-10 · la gran cascada: bajada vertical junto al agua, vainas que caen y setas para frenar
LEVELS['4-10'] = function () {
  const H = 100, B = LB(32, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 2, 0, H - 1); B.block(29, 31, 0, H - 1); B.block(3, 28, 7, 7); B.block(12, 18, 7, 7, ' '); B.row(4, 10, 5); B.hid(22, 3, 'vida');
  const L0 = [[3, 10], [20, 28], [8, 15], [17, 25], [3, 9], [21, 28]]; let k = 0;
  for (let y = 13; y < H - 6; y += 6, k++) { const [a, b] = L0[k % 6]; P(a, b, y); B.chip(a + 1, y - 1); B.chip(b - 1, y - 1); B.icicle(((a + b) / 2) | 0, y - 5, k % 2);
    if (k % 3 === 2) B.en('alien', a + 2, y - 1); if (k === 4 || k === 9) B.cp(a + 2, y); if (k === 6) B.mush(a + 3, y, 1); if (k === 3) B.box(a + 3, y - 4, 'escudo'); if (k === 8) B.gear(b - 2, y - 2); if (k === 11) B.fly(a + 3, y - 2); }
  B.block(25, 28, 38, 44); B.fake(25, 25, 40, 43); B.block(26, 28, 40, 43, ' '); B.gear(27, 43); B.row(26, 28, 41);           // cueva tras el agua
  B.gear(4, 60); B.block(3, 28, H - 2, H - 1); B.crystal(6, H - 2, 4, 1.3); B.crystal(25, H - 2, 6, 1.3);
  return B.done(LJ({ name: 'LA GRAN CASCADA', time: 200, vert: true, cascade: [11, 19], intro: '¡BAJA POR LA CASCADA!', spawn: { x: 6 * T, y: 7 * T }, goal: { x: 16 * T + T / 2, y: (H - 2) * T } }));
};
// 4-11 · río abajo: monta en la balsa, la pantalla avanza sola, salta los troncos y esquiva las plantas
LEVELS['4-11'] = function () {
  const B = LB(262, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 6); B.hid(3, 10, 'vida'); B.raft(7, 13, 4, 150); B.row(9, 40, 11);
  const log = (x, h) => B.block(x, x, 13 - h + 1, 13);
  log(24, 1); log(38, 2); B.jumper(46, 15, 5, 0); log(56, 1); B.icicle(62, 9); B.block(60, 64, 8, 8); B.en('dron', 70, 8, { x0: 64, x1: 78 }); log(80, 2); B.box(88, 9, 'escudo'); B.jumper(94, 15, 5, 0.7); log(104, 1); B.gear(110, 9); log(118, 2);
  B.ground(127, 135); B.cp(131, 14); B.raft(136, 13, 4, 150);
  log(150, 1); B.jumper(158, 15, 5, 0.2); log(166, 2); B.block(172, 178, 8, 8); B.icicle(174, 9, 1); B.icicle(177, 9); log(186, 1); B.gear(192, 9); B.jumper(198, 15, 5, 1); log(206, 2); B.en('dron', 214, 8, { x0: 208, x1: 222 }); log(226, 1); B.jumper(234, 15, 5, 0.4); B.gear(238, 8); B.row(140, 240, 11);
  B.ground(246, 261); B.crystal(258, 14, 5, 1.3);
  return B.done(LJ({ name: 'RÍO ABAJO', time: 160, intro: '¡SUBE A LA BALSA!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 254 * T + T / 2, y: 14 * T }, auto: { speed: 150, x: 0, wait: true } }));
};
// 4-12 · el lago de los nenúfares: arriba nenúfares, abajo túneles bajo el agua con tres llaves
LEVELS['4-12'] = function () {
  const H = 22, B = LB(170, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.ground(0, 169); B.block(0, 12, 8, g - 1); B.hid(6, 4, 'vida'); B.row(3, 9, 6); B.crystal(2, 8, 4, 1.2);
  for (let x = 15; x < 150; x += 7) B.fall(x, 8, 2);
  B.block(24, 34, 13, 14); B.key(29, 17); B.en('patrulla', 30, g - 1); B.block(44, 46, 10, g - 1); B.row(36, 43, 17);
  B.block(52, 64, 11, 12); B.block(52, 52, 13, 16); B.fake(52, 52, 14, 16); B.gear(58, 15); B.row(54, 62, 16);         // cámara sumergida con entrada falsa
  B.cp(70, g); B.block(74, 76, 12, g - 1); B.key(84, 13); B.en('dron', 86, 15, { x0: 78, x1: 96 }); B.block(98, 110, 15, 16); B.row(99, 109, 18); B.gear(104, 13);
  B.block(114, 116, 9, g - 1); B.key(124, 18); B.block(120, 130, 15, 15); B.cp(134, g); B.en('alien', 140, g - 1); B.gear(146, 10);
  B.block(152, 169, 8, g - 1); B.door(152, 4, 7); B.block(152, 152, 0, 3); B.crystal(163, 8, 6, 1.3);
  return B.done(LJ({ name: 'EL LAGO DE LOS NENÚFARES', time: 300, water: { y: 9 * T }, noLava: true, intro: '¡BUSCA 3 LLAVES BAJO EL AGUA!', spawn: { x: 4 * T, y: 8 * T }, goal: { x: 160 * T + T / 2, y: 8 * T } }));
};
// 4-13 · lluvia de semillas: un campo de setas mientras caen semillas gigantes del cielo
LEVELS['4-13'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.ground(0, 22); B.hid(6, 10, 'vida'); B.box(10, 10, 'escudo'); B.row(13, 19, 12);
  B.arc(23, 27, 11, 2); B.ground(28, 70); for (let x = 30; x < 68; x += 9) B.mush(x, 14, Math.floor(x / 9) % 3); P(36, 40, 7); B.gear(38, 5); P(54, 58, 7); B.fly(56, 5); B.en('alien', 49, 13); B.en('erizo', 63, 13);
  B.fall(72, 13, 2); B.fall(76, 12, 2); B.ground(80, 120); B.cp(82, 14); B.spore(90, 14, 7, 0); P(87, 93, 6); B.row(87, 93, 5); B.spore(100, 14, 7, 1.2); P(97, 103, 6); B.gear(100, 4); B.en('patrulla', 110, 13);
  B.block(113, 118, 11, 13); B.fake(113, 113, 12, 13); B.block(114, 117, 12, 13, ' '); B.row(114, 117, 12); B.fly(116, 13);
  B.arc(121, 125, 11, 2); B.ground(126, 199); B.mush(130, 14, 2); B.mush(140, 14, 0); B.mush(150, 14, 1); P(132, 137, 8); P(142, 147, 7); B.gear(145, 5); P(152, 157, 8); B.cp(160, 14); B.en('alien', 166, 13); B.en('erizo', 172, 13);
  B.block(180, 181, 9, 11); B.block(192, 193, 9, 11); B.block(180, 193, 8, 8, '='); B.crystal(189, 14, 4, 1.3); B.block(198, 199, 0, 15);
  return B.done(LJ({ name: 'LLUVIA DE SEMILLAS', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 186 * T + T / 2, y: 14 * T }, meteors: { zones: [[26 * T, 178 * T]], every: 1.0, acc: 0, style: 'seed' } }));
};
// 4-14 · la cueva de las setas: a oscuras, las setas se iluminan al pasar y los interruptores cambian el camino
LEVELS['4-14'] = function () {
  const B = LB(200, 16), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 199, 0, 1); B.ground(0, 199); B.crystal(3, 14, 4, 1.3); B.hid(8, 10, 'vida'); B.row(5, 11, 12);
  for (let x = 14; x < 190; x += 11) B.crystal(x, 14, 4 + (x % 3), 0.9 + (x % 4) * 0.15);
  B.set(22, 10, '!'); B.block(28, 29, 2, 13, 'X'); B.row(30, 36, 12); B.en('alien', 34, 13); B.block(38, 39, 2, 13, 'Y'); B.set(42, 10, '!');
  B.block(46, 60, 2, 8); B.row(47, 59, 13); B.mush(62, 14, 1); P(64, 70, 7); B.gear(68, 5); B.cp(74, 14); B.fly(76, 10);
  B.set(80, 10, '!'); B.block(84, 96, 11, 11, 'X'); B.block(84, 96, 7, 7, 'Y'); B.row(84, 96, 6); B.gear(90, 5); B.en('erizo', 92, 13);
  B.jumper(102, 15, 5, 0); B.block(101, 103, 14, 15, ' '); B.en('patrulla', 110, 13); B.block(116, 124, 11, 13); B.block(117, 123, 12, 13, ' '); B.fake(124, 124, 12, 13); B.gear(119, 13); B.row(117, 123, 10);          // cámara baja: se salta por encima; se entra por la derecha
  B.cp(130, 14); B.set(136, 10, '!'); B.block(140, 141, 2, 13, 'Y'); B.block(150, 151, 2, 13, 'X'); B.row(142, 149, 12); B.en('alien', 146, 13); B.set(154, 10, '!');
  B.pipe(160, 14, 186, 14, true); B.jumper(166, 15, 5, 0.5); B.block(165, 167, 14, 15, ' '); B.en('erizo', 174, 13); B.block(196, 199, 0, 15);
  return B.done(LJ({ name: 'LA CUEVA DE LAS SETAS', time: 260, cave: true, dark: true, crystalLight: true, noLava: true, intro: '¡LAS SETAS SE ENCIENDEN AL PASAR!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: 190 * T + T / 2, y: 14 * T } }));
};
// 4-15 · la escalinata: terrazas de piedra con estatuas que escupen rocas rodantes; arriba espera la antena
LEVELS['4-15'] = function () {
  const H = 26, B = LB(150, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.ground(0, 149); B.hid(5, g - 4, 'vida'); B.row(3, 9, g - 2); B.crystal(2, g, 5, 1.2);
  let x = 12, y = g; const ter = (len, hasStatue, ph) => { y -= 3; B.block(x, 149, y, H - 1); if (hasStatue) B.snowgun(x + len - 1, y, -1, 2.6, ph); B.row(x + 1, x + len - 3, y - 2); x += len; };
  ter(14, true, 0); B.en('patrulla', 18, y - 1); ter(16, true, 0.8); B.gear(x - 8, y - 4); ter(14, false); B.cp(x - 10, y); B.box(x - 6, y - 4, 'escudo'); ter(16, true, 0.3); B.vine(x - 2, y - 9, y - 1); P(x - 6, x - 1, y - 9); B.gear(x - 4, y - 11);
  ter(14, true, 1.2); B.en('alien', x - 7, y - 1); ter(16, true, 0.5); B.cp(x - 14, y);
  B.block(x - 10, x - 6, y - 3, y - 1); B.fake(x - 10, x - 10, y - 2, y - 1); B.block(x - 9, x - 7, y - 2, y - 1, ' '); B.gear(x - 8, y - 1);     // ofrenda escondida en un altar
  B.crystal(x + 6, y, 4, 1.4); B.row(x, x + 10, y - 2);
  return B.done(LJ({ name: 'LA ESCALINATA', time: 220, noLava: true, intro: '¡ROCAS RODANDO!', spawn: { x: 3 * T, y: g * T }, goal: { x: (x + 12) * T + T / 2, y: y * T } }));
};
// 4-16 · ruinas del templo: trampas de energía, paredes agrietadas y tres llaves para la gran puerta
LEVELS['4-16'] = function () {
  const H = 20, B = LB(180, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.ground(0, 179); B.hid(5, g - 4, 'vida'); B.box(9, g - 4, 'laser'); B.row(3, 8, g - 2);
  B.block(16, 30, 12, 12); B.laser(20, 13, g - 1, 0); B.laser(26, 13, g - 1, 1.1); B.row(17, 29, g - 1); B.block(32, 33, 8, g - 1, 'C'); B.key(38, g - 1); B.block(40, 41, 8, g - 1); B.fake(40, 41, 14, g - 1); B.block(32, 41, 7, 7); B.en('alien', 37, g - 1);
  B.vine(44, 6, g - 1); P(45, 52, 6); B.gear(49, 4); B.cp(56, g); B.snowgun(70, g, -1, 2.8); B.row(58, 68, g - 2); B.mush(72, g, 0); P(74, 80, 11); B.key(77, 9); B.en('dron', 84, 9, { x0: 74, x1: 92 });
  B.block(88, 100, 12, 12); B.laser(91, 13, g - 1, 0.4); B.laser(95, 13, g - 1, 1.5); B.laser(99, 13, g - 1, 0.9); B.gear(95, g - 1); B.cp(104, g);
  B.block(110, 122, 8, g - 1); B.block(111, 121, 9, g - 2, ' '); B.block(110, 110, 14, g - 1, 'C'); B.fake(122, 122, 14, g - 1); B.key(116, g - 1); B.en('patrulla', 118, g - 1); B.row(111, 121, 7);
  B.pipe(126, g, 172, g, true); B.snowgun(140, g, -1, 2.4, 0.5); B.en('alien', 134, g - 1); B.spore(146, g, 7, 0); P(143, 150, 10); B.gear(147, 8);
  B.door(156, g - 4, g - 1); B.block(156, 179, 0, g - 5); B.crystal(168, g, 6, 1.3); B.block(178, 179, 0, g);
  return B.done(LJ({ name: 'RUINAS DEL TEMPLO', time: 300, noLava: true, intro: '¡3 LLAVES ABREN EL TEMPLO!', spawn: { x: 3 * T, y: g * T }, goal: { x: 164 * T + T / 2, y: g * T } }));
};
// 4-J · el Coloso de la Selva: los poderes cuelgan de las lianas en vainas brillantes
LEVELS['4-J'] = function () {
  const B = LB(80, 16);
  B.ground(0, 79); B.crystal(3, 14, 4, 1.3); B.kitp(12, 14, 'escudo'); B.kitp(20, 14, 'laser'); B.kitp(28, 14, 'vuelo'); B.row(10, 30, 11); B.hid(33, 10, 'vida'); B.cp(36, 14);
  B.block(42, 43, 0, 10); B.block(78, 79, 0, 15); B.crystal(46, 14, 5, 1.2); B.crystal(75, 14, 6, 1.2); B.gear(60, 6);
  return B.done(LJ({ name: 'COLOSO DE LA SELVA', bossName: 'COLOSO DE LA SELVA', bossHp: 7, bossStyle: 'jungle', time: 300, intro: '¡COGE LAS VAINAS DE PODER!', spawn: { x: 3 * T, y: 14 * T }, goal: { x: -99999, y: 14 * T }, arena: { x0: 44 * T, x1: 78 * T }, bossLvl: true, noLava: true }));
};
// 4-B · nido de luciérnagas (secreta): de noche entre las copas, recoge todas las luciérnagas
LEVELS['4-B'] = function () {
  const H = 22, B = LB(150, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  B.block(0, 10, 18, 19); B.hid(5, 14, 'vida'); B.fly(6, 15);
  for (let i = 0; i < 12; i++) { const x = 13 + i * 10, y = 16 - Math.round(Math.sin(i * 0.8) * 5); P(x, x + 4, y); B.fly(x + 2, y - 3); B.chip(x + 1, y - 1); B.chip(x + 3, y - 1); if (i % 4 === 1) B.mush(x + 1, y, i % 3); if (i === 5) B.cp(x + 2, y); }
  B.gear(40, 6); B.gear(80, 5); B.gear(118, 6); B.block(136, 149, 14, 15); B.crystal(146, 14, 6, 1.4);
  return B.done(LJ({ name: 'NIDO DE LUCIÉRNAGAS', time: 170, dark: true, gk: 0.6, intro: '¡RECOGE LAS LUCIÉRNAGAS!', spawn: { x: 3 * T, y: 18 * T }, goal: { x: 142 * T + T / 2, y: 14 * T }, rain: { x0: 136 * T, x1: 149 * T, dur: 6, t: 0, st: 0, acc: 0 } }));
};
// 4-C · jardín flotante (secreta): islas de flores con esporas y gravedad baja
LEVELS['4-C'] = function () {
  const H = 24, B = LB(160, H), P = (a, b, ty) => B.block(a, b, ty, ty, '=');
  const shape = (x, y, rows) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') B.chip(x + i, y + j); }));
  B.block(0, 12, 20, 21); shape(5, 12, ['#.#', '#.#', '###', '..#', '..#']); B.hid(3, 16, 'vida');
  const isl = (a, b, y) => B.block(a, b, y, y + 1);
  isl(16, 22, 18); B.spore(19, 18, 8, 0); isl(26, 32, 11); B.gear(29, 9); isl(36, 42, 17); B.mush(38, 17, 1); isl(46, 52, 9); B.en('alien', 49, 8);
  isl(56, 64, 16); B.cp(60, 16); B.spore(62, 16, 9, 0.8); isl(66, 72, 7); B.gear(69, 5); isl(76, 82, 14); B.en('erizo', 79, 13); isl(86, 92, 18); B.mush(88, 18, 2); isl(96, 102, 10);
  B.spore(99, 10, 6, 1.5); isl(106, 112, 5); B.gear(109, 3); isl(114, 120, 13); B.cp(117, 13); isl(124, 130, 17); B.spore(127, 17, 8, 0.3); isl(134, 159, 10); B.crystal(155, 10, 4, 1.4);
  return B.done(LJ({ name: 'JARDÍN FLOTANTE', time: 170, sky: true, gk: 0.5, intro: '¡GRAVEDAD LUNAR!', spawn: { x: 3 * T, y: 20 * T }, goal: { x: 148 * T + T / 2, y: 10 * T }, rain: { x0: 134 * T, x1: 158 * T, dur: 7, t: 0, st: 0, acc: 0 } }));
};
// 4-D · tras la cascada (secreta): una cueva de tesoros con interruptores, plantas que muerden y tres llaves
LEVELS['4-D'] = function () {
  const H = 20, B = LB(140, H), P = (a, b, ty) => B.block(a, b, ty, ty, '='), g = H - 2;
  B.block(0, 139, 0, 1); B.ground(0, 139); B.block(0, 1, 0, H - 1); B.hid(6, g - 4, 'vida'); B.crystal(4, g, 4, 1.3); for (let x = 8; x < 20; x++) B.chip(x, g - 2);
  B.set(22, g - 4, '!'); B.block(26, 36, 12, g - 1, 'X'); B.block(27, 35, 13, g - 1, ' '); for (let x = 27; x < 36; x++) { B.chip(x, 14); B.chip(x, 16); } B.key(31, 15);
  B.jumper(40, H, 6, 0); B.block(39, 41, g, H - 1, ' '); B.jumper(46, H, 6, 1.2); B.block(45, 47, g, H - 1, ' '); B.row(38, 48, 12);
  B.block(52, 64, 5, 5, 'Y'); for (let x = 52; x <= 64; x++) B.chip(x, 4); B.mush(54, g, 0); P(56, 60, 10); B.key(62, 3); B.set(58, 6, '!');
  B.cp(68, g); B.vine(74, 4, g - 1); P(75, 82, 4); B.key(80, 2); for (let x = 75; x < 83; x++) B.chip(x, 3);
  B.block(90, 104, 10, g - 1); B.block(91, 103, 11, g - 2, ' '); B.block(90, 90, 14, g - 1, 'C'); B.box(86, 14, 'laser'); for (let x = 91; x < 104; x++) { B.chip(x, 13); B.chip(x, 15); }
  B.block(110, 139, 0, 13); B.door(110, 14, g - 1); for (let x = 113; x < 136; x++) { B.chip(x, 16); B.chip(x, 14); } B.block(138, 139, 0, g);
  return B.done(LJ({ name: 'TRAS LA CASCADA', time: 220, cave: true, noLava: true, intro: '¡3 LLAVES ABREN EL TESORO!', spawn: { x: 4 * T, y: g * T }, goal: { x: 133 * T + T / 2, y: g * T } }));
};
/* lo ya cogido en cada fase se recuerda: al repetir no vuelven los chips, las vidas ocultas, las cajas de chips ni la lluvia de chips */
let GOT = {}; try { GOT = JSON.parse(localStorage.getItem('tl_got') || '{}') || {}; } catch (e) { GOT = {}; }
const gotOf = id => (GOT[id] = GOT[id] || { c: [], b: [], g: [], r: 0 });
let gotT = 0; function gotSave() { clearTimeout(gotT); gotT = setTimeout(() => { try { localStorage.setItem('tl_got', JSON.stringify(GOT)); } catch (e) {} cloudSave(); }, 400); }
function gotMark(kind, v) { if (L && L.custom) return; const o = gotOf(curId); if (kind === 'r') o.r = 1; else if (!o[kind].includes(v)) o[kind].push(v); gotSave(); }
/* ---------- retoques de las pantallas reales (editor del modo pruebas): se guardan en el servidor y les salen a todos ---------- */
let PATCH = {}, EDRAFT = {}, EDO = null; try { PATCH = JSON.parse(localStorage.getItem('tl_pt') || '{}') || {}; } catch (e) {}
function patchLoad() { api({ a: 'parches' }).then(r => { if (r.ok && r.p) { PATCH = r.p; try { localStorage.setItem('tl_pt', JSON.stringify(PATCH)); } catch (e) {} } }); }
setTimeout(patchLoad, 400);
const PT_CENTER = new Set(['chips', 'gears', 'keys', 'flyb', 'cogs']);
function ptCells(o, k) {          // casillas que ocupa una pieza (para poder borrarla tocando encima)
  if (o.tx != null && o.ty != null) return [o.tx, o.tx, o.ty, o.ty];
  const xa = o.x0 != null ? o.x0 : o.bx != null ? o.bx : o.x; if (typeof xa !== 'number') return null;
  const xb = o.x1 != null ? o.x1 - 1 : o.w ? xa + o.w - 1 : xa;
  if (typeof o.y0 === 'number') return [Math.floor(xa / T), Math.floor(xb / T), Math.floor(o.y0 / T), Math.floor(((o.y1 != null ? o.y1 : o.y0 + 1) - 1) / T)];
  const y = o.by != null ? o.by : o.y; if (typeof y !== 'number') return null;
  return PT_CENTER.has(k) ? [Math.floor(xa / T), Math.floor(xb / T), Math.floor(y / T), Math.floor(y / T)] : [Math.floor(xa / T), Math.floor(xb / T), Math.floor((y - 1) / T), Math.floor(y / T)];
}
function applyPatch(l, p) {
  const del = new Set(p.d || []), bx = p.bx || {};
  for (const k in (p.t || {})) { const [x, y] = k.split(',').map(Number); if (!l.g[y] || x < 0 || x >= l.W) continue; const c = p.t[k]; l.g[y][x] = c; if (c === '?' || c === 'I') l.boxes[k] = bx[k] || (c === 'I' ? 'vida' : 'chip'); else delete l.boxes[k]; }
  if (del.size) for (const k in l) { if (k === 'g' || k === 'plats') continue; const a = l[k]; if (!Array.isArray(a) || !a.length || !a[0] || typeof a[0] !== 'object' || Array.isArray(a[0])) continue;
    l[k] = a.filter(o => { const c = ptCells(o, k); if (!c) return true; for (let x = c[0]; x <= c[1]; x++) for (let y = c[2]; y <= c[3]; y++) if (del.has(x + ',' + y)) return false; return true; }); }
  const add = p.a || [];
  if (add.length) { const B = LB(l.W, l.H); add.forEach(o => { if (o.k !== 'portal') tlObj(B, o, l.theme); });
    const pts = add.filter(o => o.k === 'portal'); for (let i = 0; i + 1 < pts.length; i += 2) { const a = pts[i], b = pts[i + 1]; B.portal(a.x, a.y + 1, b.x + 1, b.y + 1); B.portal(b.x, b.y + 1, a.x + 1, a.y + 1); }
    for (let y = 0; y < l.H; y++) for (let x = 0; x < l.W; x++) if (B.g[y][x] !== ' ') l.g[y][x] = B.g[y][x];
    for (const k in B) if (k !== 'g' && Array.isArray(B[k]) && B[k].length) l[k] = (l[k] || []).concat(B[k]);
    Object.assign(l.boxes, B.boxes); }
  if (p.s) l.spawn = { x: p.s[0] * T + T / 2, y: (p.s[1] + 1) * T }; if (p.e) l.goal = { x: p.e[0] * T + T / 2, y: (p.e[1] + 1) * T };
  l.plats = calcPlats(l.g, l.W, l.H);
}
function buildLevel() {
  const l = (LEVELS[curId] || LEVELS['1-1'])();
  { const pp = EDRAFT[curId] || PATCH[curId]; if (pp && !l.custom) try { applyPatch(l, pp); } catch (e) { console.warn('parche', e); } }
  if (!l.custom) { const o = gotOf(curId), cs = new Set(o.c), gs = new Set(o.g);
    l.chips.forEach((c, i) => { c.i = i; if (cs.has(i)) c.got = true; });
    l.gears.forEach((g, i) => { g.i = i; g.old = gs.has(i); });
    o.b.forEach(k => { const [x, y] = k.split(',').map(Number); if (l.g[y] && (l.g[y][x] === '?' || l.g[y][x] === 'I')) l.g[y][x] = l.g[y][x] === 'I' ? ' ' : 'U'; });
    if (o.r && l.rain) l.rain.st = 2; }
  l.time = l.time || 180; l.cps = l.cps || [l.checkpoint]; l.pads = l.pads || []; l.lasers = l.lasers || []; l.movers = l.movers || []; l.strips = l.strips || []; l.lifts = l.lifts || []; l.gk = l.gk || 1; l.mets = []; l.icicles = (l.icicles || []).map(c => Object.assign({ x: c.x0, y: c.y0, st: 0, t: 0, vy: 0 }, c)); l.winds = l.winds || []; l.warps = l.warps || []; l.crys = l.crys || []; l.geysers = l.geysers || []; l.cogs = l.cogs || []; l.vines = l.vines || []; l.spores = l.spores || []; l.flyb = l.flyb || []; jungleInit(l); l.keys = l.keys || []; l.pipes = l.pipes || []; l.jumpers = l.jumpers || []; l.guns = l.guns || []; l.sw = 0; if (l.bombs) l.bombs.acc = 0; l.bl = []; if (l.auto) l.auto.x = 0; l.lastCp = null; if (l.bossLvl) bossInit(l);
  return l;
}
const tileAt = (tx, ty) => (tx < 0 || tx >= L.W) ? '#' : (ty < 0 || ty >= L.H) ? ' ' : L.g[ty][tx];
const isSolid = c => c === '#' || c === '?' || c === 'U' || c === 'B' || c === '!' || c === 'C' || c === 'D' || (c === 'X' && !L.sw) || (c === 'Y' && !!L.sw);
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
function newPlayer(x, y) {          // en las fases de jefe empiezas (y reapareces) con escudo, láser y vuelo sin límite: solo sirven para esa fase
  const kit = !!(L && L.bossLvl && (L.bossStyle || 'guard') === 'guard');
  return { kit, kitMsg: kit, fly: kit, x: x - 20, y: y - 78, w: 40, h: 78, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jbuf: 0, crouch: false,
    power: kit ? 'laser' : null, shield: kit, tTurbo: 0, tMagnet: 0, tStar: 0, inv: 0, dead: false, deadT: 0, win: false, winT: 0, idle: 0, sq: 0, tele: 0, drop: false, cool: 0 };
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
  if (full) tmpOff();
  L = buildLevel(); preTheme(L.theme); if (L.meteors && L.meteors.style !== 'comet') xi('meteoro');
  spawnEnemies(); items = []; shots = []; parts = []; pops = []; bumps = [];
  if (full) G = { lives: 3, chips: 0, score: 0, gears: 0, deaths: 0, clock: 0, tleft: L.time };
  G.tleft = L.time;
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
  if (c === '!') { if ((L.swT || 0) > time) return; L.swT = time + 0.4; L.sw = L.sw ? 0 : 1; bumps.push({ tx, ty, t: 0 }); tone(L.sw ? 880 : 440, L.sw ? 1320 : 660, 0.18, 'square', 0.1); shake = 0.1;
    if (collide(P)) { L.sw = L.sw ? 0 : 1; SFX.bump(); } return; }
  if (c === '?') {
    L.g[ty][tx] = 'U'; bumps.push({ tx, ty, t: 0 });
    const what = L.boxes[tx + ',' + ty] || 'chip';
    if (what === 'chip' || what === 'vida') gotMark('b', tx + ',' + ty);
    if (what === 'chip') { addChip(cx, cy - 20); parts.push({ x: cx, y: cy - 10, vx: 0, vy: -420, life: 0.45, max: 0.45, coin: true, grav: 1200, size: 1 }); }
    else { items.push({ kind: what, x: cx - 20, y: cy, w: 40, h: 40, rise: 0, t: 0 }); SFX.appear(); }
    knockAbove(tx, ty);
  } else if (c === 'B') {
    if (P.power === 'mini') { bumps.push({ tx, ty, t: 0 }); SFX.bump(); }
    else { L.g[ty][tx] = ' '; SFX.brk(); addScore(10); shake = 0.12;
      for (let i = 0; i < 8; i++) parts.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + 24 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 320, vy: -200 - Math.random() * 260, life: 0.9, max: 0.9, col: L.theme === 'ice' ? (i % 2 ? '#bff0ff' : '#ffffff') : (i % 2 ? '#5b7f9c' : '#aab4c4'), size: 7, grav: 1500, sqr: true }); }
    knockAbove(tx, ty);
  } else if (c === 'U' || c === '#') SFX.bump();
}
function knockAbove(tx, ty) {
  enemies.forEach(e => { if (!e.dead && e.x + e.w > tx * T && e.x < (tx + 1) * T && Math.abs(e.y + e.h - ty * T) < 6) killEnemy(e, 'fly'); });
}

/* ---------- jugador ---------- */
function hurt() {
  if (P.inv > 0 || P.dead || P.win || P.tStar > 0 || CHEAT.ghost) return;
  if (P.shield) { P.shield = false; P.inv = 1.6; SFX.hurt(); burst(P.x + P.w / 2, P.y + P.h / 2, 16, '#29a8ff', 220); shake = 0.15;
    if (L.bossLvl && L.arena) { const a = L.arena, far = P.x + P.w / 2 < (a.x0 + a.x1) / 2 ? a.x1 - 3 * T : a.x0 + 3 * T, sx = P.x > a.x0 ? far : Math.max(4 * T, P.x - 8 * T); items.push({ kind: 'escudo', x: sx - 20, y: 10.5 * T, w: 40, h: 40, rise: 1, t: 0, stay: true, mat: 1.4 }); pop(sx, 9 * T, '¡TU ESCUDO!', '#7fe9ff'); }
    return; }
  if (P.power) { P.power = null; setSize(P); if (!canStand(P)) { P.crouch = true; setSize(P); } P.inv = 1.8; SFX.hurt(); burst(P.x + P.w / 2, P.y + P.h / 2, 16, '#c63cff', 220); shake = 0.15; return; }
  die();
}
function die() {
  if (P.dead) return;
  P.dead = true; P.deadT = 0; P.vy = -620; P.vx = 0; P.tTurbo = P.tMagnet = P.tStar = 0; P.shield = false; P.power = null;
  if (!CHEAT.live) G.lives--; G.deaths++; SFX.die(); shake = 0.25;
}
function respawn() {
  const cp = L.lastCp || L.spawn;
  P = newPlayer(cp.x, cp.y); P.inv = 1.5; if (L.hadLaser && L.g.some(r => r.includes('C'))) P.power = 'laser';
  { // tiempo al reaparecer: lo que queda de recorrido desde ese punto de control (con margen), nunca menos de lo que tenías
    const d = o => L.vert ? Math.abs(o.y - L.goal.y) : Math.abs(L.goal.x - o.x), tot = Math.max(1, d(L.spawn)), fr = Math.min(1, d(cp) / tot);
    G.tleft = cp === L.spawn ? L.time : Math.max(G.tleft || 0, Math.min(L.time, Math.round(L.time * fr * 1.3 + 25))); } for (const m of L.movers) if (m.raft) { m.x = Math.max(m.bx, cp.x - m.w / 2); m.go = false; } if (L.auto) L.auto.x = Math.max(0, cp.x - 3 * T); L.bl = []; if (L.kitP) L.kitP.forEach(k => { k.st = 0; k.t = 0; });
  spawnEnemies(); shots = [];
  if (L.chase && L.chase.on) L.chase.x = P.x - 560;
  if (L.rise && L.rise.on) L.rise.y = P.y + P.h + 460;
  if (L.boss) bossReset();
  for (const ic of L.icicles) { ic.st = 0; ic.x = ic.x0; ic.y = ic.y0; }
}
function updatePlayer(dt) {
  if (!G.tr && cheatOn()) G.tr = true;
  if (P.kitMsg) { P.kitMsg = false; pop(P.x + P.w / 2, P.y - 50, '¡ESCUDO, LÁSER Y VUELO PARA EL JEFE!', '#7fe9ff'); SFX.life(); }
  const p = P;
  if (p.dead) {
    p.deadT += dt; p.vy += 1800 * (L.gk < 1 ? 0.6 : 1) * dt; p.y += p.vy * dt;
    if (p.deadT > 1.6) { if (G.lives <= 0) gameOver(); else respawn(); }
    return;
  }
  if (p.win) { p.winT += dt; p.vx = 0; p.vy += 2000 * dt; moveEnt(p, dt); if (p.winT > 2.2 && state === 'play') levelDone(); return; }
  p.inv = Math.max(0, p.inv - dt); p.tTurbo = Math.max(0, p.tTurbo - dt); p.tMagnet = Math.max(0, p.tMagnet - dt); p.tStar = Math.max(0, p.tStar - dt);
  p.tele = Math.max(0, p.tele - dt); p.cool = Math.max(0, p.cool - dt); p.sq = Math.max(0, p.sq - dt * 4);
  // agacharse
  const wantCrouch = (K.down || performance.now() < touchCrouchT) && p.onGround && p.power !== 'mini';
  if (p.crouch && p.onGround && onOneWay(p)) { p.dropT = (p.dropT || 0) + dt;          // agachado 2 s encima de un suelo atravesable: lo atraviesas hacia abajo
    if (p.dropT >= 2) { p.dropT = 0; p.crouch = false; setSize(p); p.drop = true; p.y += 6; p.onGround = false; p.vy = 60; p.dropHold = 0.25; } } else p.dropT = 0;
  if (wantCrouch && !p.crouch) { p.crouch = true; setSize(p); }
  else if (!wantCrouch && p.crouch && canStand(p)) { p.crouch = false; setSize(p); }
  // horizontal
  const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
  const icy = L.ice && p.onGround && !p.inLift;
  const max = (L.water && p.wet ? 0.72 : 1) * (icy ? 1.12 : 1) * (p.crouch ? 110 : 270) * (p.tStar > 0 ? 1.2 : 1) * (p.tTurbo > 0 ? 1.15 : 1) * (p.fast > 0 ? 1.75 : 1);
  const acc = (icy ? 760 : p.onGround ? 2200 : 1500) * (p.fast > 0 ? 1.7 : 1);
  if (dir) { p.vx += dir * acc * dt; if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - 3000 * dt); p.face = dir; p.idle = 0; }
  else { const f = (icy ? 240 : p.onGround ? 2400 : 600) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; p.idle += dt; }
  // derrape
  if (icy && Math.abs(p.vx) > 120 && Math.random() < 0.4) parts.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: -p.vx * 0.2, vy: -30 - Math.random() * 50, life: 0.35, max: 0.35, col: '#eaffff', size: 2.4, grav: 300 });
  if (p.onGround && dir && Math.sign(p.vx) !== dir && Math.abs(p.vx) > 120 && Math.random() < 0.5) parts.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: -dir * 60, vy: -40 - Math.random() * 60, life: 0.3, max: 0.3, col: '#9fb4ff', size: 3, grav: 0 });
  // salto
  p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt);
  if (p.onGround || p.climb) { p.dj = true; p.jy0 = p.y + p.h; } p.flip = Math.max(0, (p.flip || 0) - dt);
  p.jbuf = jumpPressed ? 0.12 : Math.max(0, p.jbuf - dt);
  p.dropHold = Math.max(0, (p.dropHold || 0) - dt); p.drop = p.dropHold > 0;
  const wet = !!(L.water && p.y + p.h * 0.4 > L.water.y); if (wet !== !!p.wet) { if (Math.abs(p.vy) > 60) { burst(p.x + p.w / 2, L.water.y, 14, '#dff8ff', 200, 0.5, 600, 3); noise(0.25, 0.12, 1200); } p.wet = wet; }
  if (wet && jumpPressed) {             // nadar: cada pulsación es una brazada (cerca de la superficie, salta fuera)
    p.vy = p.y < L.water.y + 30 ? -680 : Math.min(p.vy, 0) - 380; if (p.vy < -420 && p.y >= L.water.y + 30) p.vy = -420; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.sq = 0.6;
    tone(260, 420, 0.14, 'sine', 0.07); for (let i = 0; i < 6; i++) parts.push({ x: p.x + p.w / 2 + (Math.random() - 0.5) * 30, y: p.y + p.h, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 60, life: 0.6, max: 0.6, col: 'rgba(220,250,255,.9)', size: 2 + Math.random() * 3, grav: -260 }); }
  else if (p.jbuf > 0 && p.coyote > 0) {
    if (K.down && onOneWay(p)) { p.drop = true; p.y += 4; p.jbuf = 0; p.coyote = 0; }
    else if (!p.crouch || canStand(p)) {
      if (p.crouch) { p.crouch = false; setSize(p); }
      p.vy = p.power === 'mini' ? -700 : -780; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.sq = 1; SFX.jump();
      burst(p.x + p.w / 2, p.y + p.h, 8, '#ffb347', 120, 0.3, 0, 3);
    }
  }
  else if (jumpPressed && p.dj && !p.onGround && !p.climb && !p.dead && !(p.tTurbo > 0 || CHEAT.fly || p.fly)) {   // doble salto en el aire
    p.dj = false; { const H = (p.power === 'mini' ? 3.6 : 4.25) * T, h = Math.max(0, (p.jy0 || p.y + p.h) - (p.y + p.h)), rem = Math.max(T * 0.9, H - h); p.vy = -Math.sqrt(2 * 2000 * L.gk * rem); } p.boost = 1;   // siempre llega a la misma altura (unos 4 bloques), le des cuando le des p.jbuf = 0; p.sq = 1; p.flip = 0.42;
    const fx = p.x + p.w / 2, fy = p.y + p.h; (L.djr = L.djr || []).push({ x: fx, y: fy, t0: time });
    tone(520, 1560, 0.18, 'triangle', 0.08); tone(780, 2340, 0.16, 'sine', 0.05, 0.04);
    for (let i = 0; i < 26; i++) { const a = Math.PI * (0.15 + 0.7 * Math.random()), v = 160 + Math.random() * 260; parts.push({ x: fx + (Math.random() - 0.5) * 20, y: fy, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * v * 0.6, life: 0.45, max: 0.45, col: ['#7ff6ff', '#ffffff', '#35ff8a', '#bff9ff'][i % 4], size: 2 + Math.random() * 2.5, grav: 200 }); }
  }
  if (!wet && !K.jump && p.vy < -260 && !p.boost) p.vy = -260;               // salto corto si sueltas
  if ((p.tTurbo > 0 || CHEAT.fly || p.fly) && K.jump) p.vy = Math.max(p.vy - 3600 * dt, -330);   // turbo: volar
  if (wet) p.vy = Math.min(p.vy + 640 * dt, 170); else p.vy = Math.min(p.vy + 2000 * L.gk * dt, L.gk < 1 ? 560 : 900);
  const wasAir = !p.onGround, vyBefore = p.vy, feet0 = p.y + p.h;
  moveEnt(p, dt);
  if (p.vy < 0 && !p.dead) { const ty = Math.floor(p.y / T);           // bloque invisible: aparece al golpearlo desde abajo
    for (const tx of [Math.floor((p.x + p.w / 2) / T), Math.floor((p.x + 4) / T), Math.floor((p.x + p.w - 4) / T)]) if (tileAt(tx, ty) === 'I') {
      L.g[ty][tx] = '?'; p.y = (ty + 1) * T + 0.01; p.vy = 0; hitBlock(tx, ty); burst(tx * T + T / 2, ty * T + T / 2, 22, '#fff', 220, 0.5, 0, 3); tone(1568, 2093, 0.18, 'triangle', 0.1); break; } }
  if (p.vy >= 0) p.boost = 0;
  if (p.vy >= 0 && !p.drop) for (const m of L.movers) {        // plataformas móviles: te llevan encima
    if (m.st === 3) continue; if (p.x + p.w > m.x + 4 && p.x < m.x + m.w - 4 && feet0 <= m.y - m.dy + 10 && p.y + p.h >= m.y - 2) { if (m.fall && !m.st) { m.st = 1; m.ft = 0; } if (m.raft) m.go = true; p.y = m.y - p.h - 0.01; p.vy = 0; p.onGround = true; p.x += m.dx; if (collide(p)) p.x -= m.dx; break; }
  }
  if (p.onGround) for (const pd of L.pads) {                    // plataformas de salto
    const c = p.x + p.w / 2; if (c > pd.x - 4 && c < pd.x + pd.w + 4 && Math.abs(p.y + p.h - pd.y) < 5) { p.vy = pd.mush ? -1120 : pd.crystal ? -1040 : -1180; if (pd.mush) { tone(220, 880, 0.25, 'sine', 0.1); tone(330, 1320, 0.2, 'triangle', 0.05, 0.04); } if (pd.crystal) { tone(1200, 2400, 0.2, 'triangle', 0.08); tone(1800, 3600, 0.15, 'sine', 0.05, 0.05); } p.onGround = false; p.boost = 1; p.coyote = 0; p.sq = 1; pd.t = 0; if (p.crouch) { p.crouch = false; setSize(p); } tone(180, 900, 0.28, 'sawtooth', 0.09); tone(360, 1500, 0.24, 'square', 0.05); burst(c, pd.y, 16, pd.crystal ? '#e6a0ff' : '#35ff8a', 260, 0.45, 0, 3); break; }
  }
  if (CHEAT.floor && p.vy >= 0 && !p.drop) { const gy = (L.H - 2) * T; if (feet0 <= gy + 1 && p.y + p.h >= gy - 0.5) { p.y = gy - p.h - 0.01; p.vy = 0; if (!p.onGround && wasAir) burst(p.x + p.w / 2, gy, 8, '#7fe9ff', 120, 0.3, 0, 2.5); p.onGround = true; } }
  if (p.hitL || p.hitR) p.vx = 0;
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.onGround && wasAir && vyBefore > 250) { p.sq = -1; burst(p.x + p.w / 2, p.y + p.h, 6, '#9fb4ff', 90, 0.25, 0, 3); }
  if (p.hitHead) {
    const ty = p.headTy, c = Math.floor((p.x + p.w / 2) / T);
    const cand = [c, Math.floor(p.x / T), Math.floor((p.x + p.w - 0.01) / T)].find(tx => isSolid(tileAt(tx, ty)));
    if (cand !== undefined) hitBlock(cand, ty);
  }
  if (p.y > L.H * T - 10) { const wp = L.warps.find(w => p.x + p.w / 2 > w.x0 && p.x + p.w / 2 < w.x1); if (wp) { burst(p.x + p.w / 2, L.H * T - 40, 26, '#9ff0ff', 260, 0.6, 0, 4); SFX.portal(); p.x = wp.tox - p.w / 2; p.y = wp.toy - p.h - 200; p.vy = 120; p.vx = 0; p.inv = Math.max(p.inv, 1); pop(wp.tox, wp.toy - 140, '¡ZONA SECRETA!', '#9ff0ff'); } }
  if (p.y > L.H * T + 120) die();
  // láser
  if (actPressed && (p.power === 'laser' || CHEAT.laser) && p.cool <= 0 && shots.filter(s => s.mine).length < 3) {
    shots.push({ mine: true, x: p.x + p.w / 2 + p.face * 18, y: p.y + p.h * 0.45, vx: p.face * 720, vy: 0, w: 22, h: 6, life: 0.9 }); p.cool = 0.18; SFX.laser();
  }
  // chips, engranajes, objetos
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  for (const c of L.chips) {
    if (c.got) continue;
    if (p.tMagnet > 0) { const dx = cx - c.x, dy = cy - c.y, d = Math.hypot(dx, dy); if (d < 210 && d > 1) { c.x += dx / d * 520 * dt; c.y += dy / d * 520 * dt; } }
    if (Math.abs(c.x - cx) < p.w / 2 + 14 && Math.abs(c.y - cy) < p.h / 2 + 14) { c.got = true; addChip(c.x, c.y); if (c.i !== undefined && !c.fall) gotMark('c', c.i); }
  }
  for (const g of L.gears) if (!g.got && Math.abs(g.x - cx) < p.w / 2 + 20 && Math.abs(g.y - cy) < p.h / 2 + 20) { g.got = true; G.gears++; if (!g.old) { addScore(500, g.x, g.y - 20); gotMark('g', g.i); } SFX.gear(); burst(g.x, g.y, 24, '#3db8ff', 240, 0.7, 200, 4); }
  for (const it of items) if (!it.got && it.rise >= 1 && !(it.mat > 0) && overlap(p, it)) { it.got = true; givePower(it.kind); }
  if (L.kitP) for (const k of L.kitP) { k.t += dt; if (!k.st && !p.dead && overlap(p, { x: k.x - 30, y: k.y - 110, w: 60, h: 110 })) { k.st = 1; k.t = 0; givePower(k.kind);
      if (L.theme === 'jungle') { for (let i = 0; i < 26; i++) parts.push({ x: k.x + (Math.random() - 0.5) * 40, y: k.y - 70 + (Math.random() - 0.5) * 50, vx: (Math.random() - 0.5) * 360, vy: -100 - Math.random() * 260, life: 1, max: 1, col: i % 2 ? '#6ae04a' : '#c8ff6a', size: 4, grav: 600, sqr: true }); noise(0.25, 0.12, 1500); }
      else if (L.theme === 'ice') { for (let i = 0; i < 26; i++) parts.push({ x: k.x + (Math.random() - 0.5) * 40, y: k.y - 45 + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 420, vy: -100 - Math.random() * 300, life: 0.8, max: 0.8, col: i % 2 ? '#dff8ff' : '#7fd8ff', size: 4, grav: 1300, sqr: true }); noise(0.25, 0.2, 2000); }
      else { burst(k.x, k.y - 45, 30, '#ff9a3c', 300, 0.7, -100, 4); burst(k.x, k.y - 45, 16, '#ffd060', 200, 0.5, 0, 3); noise(0.4, 0.15, 300); } } }
  items = items.filter(i => !i.got);
  // punto de control, portal, meta
  // punto de control: se activa al pasarlo (aunque vayas saltando por encima o por debajo); siempre cuenta el más avanzado
  const feet = p.y + p.h, cpPass = cp => L.vert ? feet <= cp.y + 40 && Math.abs(cx - cp.x) < 7 * T : cx >= cp.x - 24 && Math.abs(feet - cp.y) < 7 * T;
  const cpAhead = cp => !L.lastCp || (L.vert ? cp.y < L.lastCp.y : cp.x > L.lastCp.x);
  for (const cp of L.cps) if (!cp.on && !p.dead && cpPass(cp)) { cp.on = true; if (cpAhead(cp)) L.lastCp = cp; SFX.check(); pop(cp.x, cp.y - 90, 'PUNTO DE CONTROL', '#35ff8a'); burst(cp.x, cp.y - 60, 20, '#35ff8a', 200, 0.6, 0, 3); }
  if (p.tele <= 0) for (const po of L.portals) if (Math.abs(cx - po.x) < 26 && Math.abs(cy - po.y) < 44) {
    burst(po.x, po.y, 26, '#c63cff', 260, 0.6, 0, 4); SFX.portal();
    p.x = po.tox - p.w / 2; p.y = po.toy - p.h; p.vx = 0; p.vy = 0; p.tele = 1.2; p.inv = Math.max(p.inv, 0.8);
    burst(po.tox, po.toy - 30, 26, '#29e6ff', 260, 0.6, 0, 4); break;
  }
  if (cx > L.goal.x - 20 && cx < L.goal.x + 240 && (!L.vert || Math.abs(p.y + p.h - L.goal.y) < 160)) { p.win = true; p.winT = 0; p.vx = 0; p.crouch = false; setSize(p); SFX.win(); for (let i = 0; i < 5; i++) burst(L.goal.x, L.goal.y - 60 - i * 40, 16, ['#29e6ff', '#35ff8a', '#ffd23c', '#c63cff'][i % 4], 300, 1, 300, 4); }
}
function onOneWay(p) {
  const ty = Math.floor((p.y + p.h + 2) / T);
  for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (isSolid(tileAt(tx, ty))) return false;
  for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) if (tileAt(tx, ty) === '=') return true;
  return false;
}
const POWER_NAME = { vuelo: '¡VUELO SIN LÍMITE!', vida: '+1 VIDA', laser: 'LÁSER', escudo: 'ESCUDO', turbo: 'TURBO', iman: 'IMÁN', mini: 'MINI LUCAS', estrella: 'ESTRELLA 5G' };
function givePower(k) {
  const p = P; SFX.power(); addScore(200); pop(p.x + p.w / 2, p.y - 16, POWER_NAME[k], '#29e6ff');
  burst(p.x + p.w / 2, p.y + p.h / 2, 20, '#29e6ff', 240, 0.6, 0, 3);
  if (k === 'vida') { G.lives++; SFX.life(); }
  else if (k === 'escudo') p.shield = true;
  else if (k === 'vuelo') p.fly = true;
  else if (k === 'turbo') p.tTurbo = 7;
  else if (k === 'iman') p.tMagnet = 14;
  else if (k === 'estrella') p.tStar = 9;
  else { if (k === 'laser') L.hadLaser = true;          // si muere, al reaparecer vuelve a tener el láser (para no quedarse atascado ante una pared agrietada)
    if (p.power === 'mini' && k !== 'mini') { p.power = k; setSize(p); if (collide(p)) { p.crouch = true; setSize(p); } } else { p.power = k; p.crouch = false; setSize(p); } }
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
      e.vx = e.dir * e.d.speed; e.vy = Math.min(e.vy + 2000 * L.gk * dt, 900);
      moveEnt(e, dt);
      if (e.hitL) e.dir = 1; if (e.hitR) e.dir = -1;
      if (e.onGround) { const ax = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, c = tileAt(Math.floor(ax / T), Math.floor((e.y + e.h + 4) / T)); if (!isSolid(c) && c !== '=') e.dir = -e.dir; }
      if (e.y > L.H * T + 100) e.dead = 9;
    }
    if (CHEAT.kill && !p.dead && !p.win && overlap(p, e)) { killEnemy(e, 'fly'); continue; }
    if (!p.dead && !p.win && !CHEAT.ghost && overlap(p, e)) {
      if (p.tStar > 0) killEnemy(e, 'fly');
      else if (e.d.stomp && p.vy > 60 && p.y + p.h - p.vy * dt * 1.5 <= e.y + e.h * 0.6) {
        killEnemy(e, 'squish'); p.vy = K.jump ? -700 : -430; p.y = e.y - p.h - 1; p.sq = 1;
      } else hurt();
    }
  }
  enemies = enemies.filter(e => !e.dead || e.dead < (e.how === 'fly' ? 2 : 0.45));
  for (const s of shots) {
    if (s.g) s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.ball) s.rot = (s.rot || 0) + s.vx * dt / 17;
    if (s.mine && tileAt(Math.floor(s.x / T), Math.floor(s.y / T)) === 'C') { const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T); L.g[ty][tx] = ' '; s.life = 0; SFX.brk(); shake = 0.15; for (let i = 0; i < 10; i++) parts.push({ x: tx * T + T / 2 + (Math.random() - 0.5) * 30, y: ty * T + T / 2 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 320, vy: -200 - Math.random() * 260, life: 0.9, max: 0.9, col: i % 2 ? '#6a5a70' : '#aab4c4', size: 7, grav: 1500, sqr: true }); continue; }
    if (isSolid(tileAt(Math.floor(s.x / T), Math.floor(s.y / T)))) { s.life = 0; burst(s.x, s.y, 5, s.mine ? '#ff4a6a' : '#ff9a3c', 100, 0.2, 0, 2.5); continue; }
    const r = { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
    if (s.mine) { for (const e of enemies) if (!e.dead && overlap(r, e)) { killEnemy(e, 'fly'); s.life = 0; break; } }
    else if (!p.dead && !CHEAT.ghost && overlap(r, p)) { s.life = 0; if (p.tStar <= 0) hurt(); }
  }
  shots = shots.filter(s => s.life > 0);
}

/* ---------- mecánicas de fase: láseres, lluvia de chips, muro perseguidor, plasma que sube ---------- */
const laserPh = l => (time + l.ph) % (l.on + l.off);
const laserOn = l => laserPh(l) < l.on;
function updateStage(dt) {
  const p = P;
  for (const pd of L.pads) pd.t += dt;
  p.fast = Math.max(0, (p.fast || 0) - dt);
  if (p.onGround && !p.dead) { const c = p.x + p.w / 2; for (const st of L.strips) if (c > st.x0 && c < st.x1 && Math.abs(p.y + p.h - st.y) < 6) { if (p.fast <= 0) { tone(300, 1200, 0.3, 'sawtooth', 0.06); } p.fast = 0.75; break; } }
  if (p.fast > 0 && Math.abs(p.vx) > 300 && Math.random() < 0.8) parts.push({ x: p.x + p.w / 2 - p.face * 16, y: p.y + 10 + Math.random() * (p.h - 14), vx: -p.face * (120 + Math.random() * 160), vy: 0, life: 0.3, max: 0.3, col: Math.random() < 0.5 ? '#7fe9ff' : '#fff', size: 2.2, grav: 0 });
  for (const ic of L.icicles) {          // carámbanos: tiemblan cuando pasas debajo y caen
    if (ic.st === 0) { if (Math.abs(p.x + p.w / 2 - ic.x) < (ic.big ? 90 : 64) && p.y > ic.y && p.y - ic.y < 9 * T && !p.dead) { ic.st = 1; ic.t = 0; tone(2400, 1800, 0.12, 'triangle', 0.05); } }
    else if (ic.st === 1) { ic.t += dt; if (ic.t > 0.45) { ic.st = 2; ic.vy = 0; } }
    else if (ic.st === 2) { ic.vy = Math.min(ic.vy + 2200 * dt, 1100); ic.y += ic.vy * dt; const L2 = ic.big ? 66 : 44;
      if (!p.dead && !p.win && Math.abs(p.x + p.w / 2 - ic.x) < p.w / 2 + 8 && ic.y + L2 > p.y && ic.y < p.y + p.h) { if (CHEAT.kill || p.tStar > 0) addScore(50, ic.x, ic.y); else hurt(); ic.st = 3; }
      if (ic.st === 2 && (isSolid(tileAt(Math.floor(ic.x / T), Math.floor((ic.y + L2) / T))) || ic.y > L.H * T)) ic.st = 3;
      if (ic.st === 3) { for (let i = 0; i < 12; i++) parts.push({ x: ic.x + (Math.random() - 0.5) * 16, y: ic.y + L2 - 6, vx: (Math.random() - 0.5) * 260, vy: -100 - Math.random() * 220, life: 0.6, max: 0.6, col: i % 2 ? '#dff8ff' : '#7fd8ff', size: 4, grav: 1300, sqr: true }); noise(0.18, 0.12, 4000); } }
  }
  for (const w of L.winds) {              // ráfagas de ventisca: empujan a Lucas (y van y vienen)
    const k = 0.5 + 0.5 * Math.sin(time * 0.9 + w.ph), on = k > 0.35, was = w.k > 0; w.k = on ? (k - 0.35) / 0.65 : 0;
    if (on && !was && p.x + p.w > w.x0 - 200 && p.x < w.x1 + 200) { noise(1.6, 0.12, 900); tone(180, 120, 1.2, 'sine', 0.04); }
    if (on && !p.dead && p.x + p.w > w.x0 && p.x < w.x1 && p.y + p.h > w.y0 && p.y < w.y1) { p.vx += w.f * w.k * dt; const cap = 420; if (Math.abs(p.vx) > cap) p.vx = Math.sign(p.vx) * cap; }
  }
  p.inLift = false;
  if (!p.dead && !p.win) for (const lf of L.lifts) { const c = p.x + p.w / 2;
    if (c > lf.x0 && c < lf.x1 && p.y + p.h > lf.y0 && p.y < lf.y1) { if (!p.wasLift) tone(200, 700, 0.4, 'sine', 0.08); p.inLift = true; p.vy = Math.max(p.vy - 4400 * dt, -400); p.onGround = false; if (Math.random() < 0.5) parts.push({ x: c + (Math.random() - 0.5) * 30, y: p.y + p.h, vx: 0, vy: 120, life: 0.35, max: 0.35, col: '#7fe9ff', size: 2.4, grav: 0 }); break; } }
  p.wasLift = p.inLift;
  if (!p.dead && !p.win) for (const l of L.lasers) if (laserOn(l) && p.x < l.x + 6 && p.x + p.w > l.x - 6 && p.y < l.y1 && p.y + p.h > l.y0) { if (p.tStar <= 0) hurt(); break; }
  for (const c of L.chips) if (c.fall && !c.got) { c.y += c.vy * dt; if (c.y > (L.H - 2) * T - 6) c.got = true; }
  const r = L.rain;
  if (r) {
    if (r.st === 0 && p.x > r.x0 && p.x < r.x1) { r.st = 1; gotMark('r'); pop(p.x + p.w / 2, p.y - 40, '¡LLUVIA DE CHIPS!', '#ffd23c'); SFX.life(); }
    if (r.st === 1) { r.t += dt; r.acc += dt; while (r.acc > 0.065) { r.acc -= 0.065; L.chips.push({ x: r.x0 + 30 + Math.random() * (r.x1 - r.x0 - 60), y: cam.y - 20, t: Math.random() * 6, vy: 230 + Math.random() * 260, fall: true }); } if (r.t > r.dur) r.st = 2; }
    if (L.chips.length > 600) L.chips = L.chips.filter(c => !c.got);
  }
  const ch = L.chase;
  if (ch) {
    if (!ch.on && p.x > ch.startX) { ch.on = true; ch.x = p.x - 620; pop(p.x + p.w / 2, p.y - 40, ch.style === 'snow' ? '¡AVALANCHA!' : ch.style === 'swarm' ? '¡EL ENJAMBRE!' : ch.style === 'lava' ? '¡OLA DE LAVA!' : '¡CORRE!', ch.style === 'snow' ? '#ffffff' : ch.style === 'lava' ? '#ffb040' : '#ff5a6a'); if (ch.style === 'snow') noise(2.5, 0.25, 500); [330, 440, 330, 440, 330, 440].forEach((f, i) => tone(f, f, 0.14, 'sawtooth', 0.1, i * 0.15)); shake = 0.3; }
    if (ch.on && !p.win && !p.dead) { ch.x += ch.speed * dt; ch.x = Math.max(ch.x, p.x - VW * 0.8); if (CHEAT.stop) ch.x = Math.min(ch.x, p.x - 230); if (p.x < ch.x + 4) die(); }
  }
  const mt = L.meteors;
  if (mt) {
    const cxp = p.x + p.w / 2, inZone = mt.zones.some(z => cxp > z[0] && cxp < z[1]);
    if (inZone && !p.dead && !p.win) { mt.acc += dt; if (mt.acc > mt.every) { mt.acc = Math.random() * 0.3; L.mets.push({ x: cxp - 150 + Math.random() * 800, y: cam.y - 50, vx: -50 - Math.random() * 70, vy: 230 + Math.random() * 110, r: 13 + Math.random() * 9, rot: Math.random() * 6, sp: (Math.random() - 0.5) * 6 }); if (!mt.warned) { mt.warned = 1; pop(cxp, p.y - 40, mt.style === 'comet' ? '¡ESTRELLAS FUGACES!' : '¡METEORITOS!', mt.style === 'comet' ? '#9ff0ff' : '#ff9a3c'); [600, 450, 600, 450].forEach((f, i) => tone(f, f, 0.12, 'sawtooth', 0.08, i * 0.14)); } } }
    for (const m of L.mets) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.sp * dt;
      if (Math.random() < 0.9) parts.push({ x: m.x + (Math.random() - 0.5) * m.r, y: m.y + (Math.random() - 0.5) * m.r, vx: -m.vx * 0.3 + (Math.random() - 0.5) * 40, vy: -m.vy * 0.3, life: 0.4, max: 0.4, col: mt.style === 'comet' ? (Math.random() < 0.5 ? '#9ff0ff' : '#ffffff') : Math.random() < 0.5 ? '#ff9a3c' : '#ffe08a', size: 2.5 + Math.random() * 2, grav: 0 });
      let boom = isSolid(tileAt(Math.floor(m.x / T), Math.floor((m.y + m.r * 0.6) / T))) || m.y > L.H * T + 40;
      if (!boom && !p.dead && !p.win && Math.abs(m.x - (p.x + p.w / 2)) < m.r * 0.8 + p.w / 2 && Math.abs(m.y - (p.y + p.h / 2)) < m.r * 0.8 + p.h / 2) { if (CHEAT.kill || p.tStar > 0) { boom = true; addScore(50, m.x, m.y); } else if (!CHEAT.ghost) { hurt(); boom = true; } }
      if (!boom) for (const s2 of shots) if (s2.mine && Math.hypot(s2.x - m.x, s2.y - m.y) < m.r + 12) { s2.life = 0; boom = true; addScore(50, m.x, m.y - 10); break; }
      if (boom) { m.dead = true; if (m.y < L.H * T) { burst(m.x, m.y, 18, '#ff9a3c', 220, 0.5, 300, 3.5); burst(m.x, m.y, 8, '#6b4a3a', 160, 0.6, 600, 4); if (m.x > cam.x - 50 && m.x < cam.x + VW + 50) { noise(0.3, 0.16, 800); shake = Math.max(shake, 0.1); } } }
    }
    L.mets = L.mets.filter(m => !m.dead);
  }
  updExtras(dt, p); updJungle(dt, p);
  for (const gz of L.geysers) {          // géiseres de fuego: avisan burbujeando y luego escupen
    const k = ((time + gz.ph) % gz.per), on = k > 0.9 && k < 2.0; gz.warn = k > 0.15 && k <= 0.9; if (on && !gz.on && Math.abs(gz.x - (p.x + p.w / 2)) < VW) { noise(0.9, 0.1, 300); tone(90, 60, 0.6, 'sawtooth', 0.04); } gz.on = on;
    if (on && !p.dead && !p.win && !CHEAT.ghost && Math.abs(p.x + p.w / 2 - gz.x) < 16 + p.w / 2 && p.y + p.h > gz.y - gz.h && p.y < gz.y) { if (p.tStar > 0) {} else hurt(); }
  }
  const rs = L.rise;
  if (rs) {
    if (!rs.on && p.y + p.h < rs.startY) { rs.on = true; pop(p.x + p.w / 2, p.y - 40, rs.style === 'water' ? '¡EL AGUA HELADA SUBE!' : rs.style === 'river' ? '¡EL RÍO SE DESBORDA!' : rs.style === 'lava' ? '¡EL MAGMA SUBE!' : '¡EL PLASMA SUBE!', rs.style === 'water' ? '#9ff0ff' : rs.style === 'lava' ? '#ffb040' : '#35ff8a'); [220, 262, 330, 392].forEach((f, i) => tone(f, f * 1.5, 0.2, 'sawtooth', 0.08, i * 0.14)); shake = 0.3; }
    if (rs.on && !p.win && !p.dead) { rs.y -= rs.speed * dt; rs.y = Math.min(rs.y, p.y + p.h + VHv * 0.62); if (CHEAT.stop) rs.y = Math.max(rs.y, p.y + p.h + 170); if (p.y + p.h > rs.y + 10) die(); }
  }
}
function lavaBand(x0, ww, y, dep) {          // superficie de lava: ondas, costras oscuras y burbujas
  const g2 = ctx.createLinearGradient(0, y - 6, 0, y + Math.min(dep, 240)); g2.addColorStop(0, '#fff2a0'); g2.addColorStop(0.06, '#ffb030'); g2.addColorStop(0.3, '#f05a12'); g2.addColorStop(1, '#7a1606'); ctx.fillStyle = g2;
  ctx.beginPath(); ctx.moveTo(x0, y + dep); for (let x = x0; x <= x0 + ww + 12; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + time * 2.6) * 4 + Math.sin(x * 0.011 - time * 1.4) * 3); ctx.lineTo(x0 + ww + 12, y + dep); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(70,12,6,.45)'; for (let i = 0; i < Math.ceil(ww / 70); i++) { const xx = x0 + ((Math.floor(x0 / 70) + i) * 70) - x0 % 70 + ((time * 14 + i * 37) % 50), yy = y + 18 + ((i * 29) % 40); ctx.beginPath(); ctx.ellipse(xx, yy, 16 + (i % 3) * 6, 4, 0, 0, 6.283); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,220,120,.5)'; for (let i = 0; i < Math.ceil(ww / 90); i++) { const ph = (time * 0.8 + i * 0.37) % 1, xx = x0 + ((i * 131 + Math.floor(x0)) % Math.max(1, ww)); ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(xx, y - ph * 10, 2 + ph * 5, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawLavaPits() {
  if ((L.theme !== 'lava' && L.theme !== 'jungle') || L.vert || L.noLava) return; const sw = L.theme === 'jungle'; const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1), y = (L.H - 0.72) * T;
  const hole = x => !isWallT(L.g[L.H - 1][x]) && !L.warps.some(w => (x + 0.5) * T > w.x0 && (x + 0.5) * T < w.x1);
  for (let x = x0; x <= x1; x++) { if (!hole(x)) continue; let e = x; while (e + 1 <= x1 && hole(e + 1)) e++;
    ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createLinearGradient(0, y - 120, 0, y); gl.addColorStop(0, sw ? 'rgba(80,255,120,0)' : 'rgba(255,90,20,0)'); gl.addColorStop(1, sw ? 'rgba(80,255,140,.3)' : 'rgba(255,110,30,.45)'); ctx.fillStyle = gl; ctx.fillRect(x * T, y - 120, (e + 1 - x) * T, 120); ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(x * T, y - 60, (e + 1 - x) * T, VHv + 60); ctx.clip(); (sw ? swampBand : lavaBand)(x * T - 1, (e + 1 - x) * T + 2, y, VHv); ctx.restore(); if (Math.random() < 0.05 * (e - x + 1)) parts.push({ x: (x + Math.random() * (e + 1 - x)) * T, y: y, vx: (Math.random() - 0.5) * 60, vy: -200 - Math.random() * 200, life: 0.8, max: 0.8, col: sw ? (Math.random() < 0.5 ? '#c8ff8a' : '#5ae06a') : Math.random() < 0.5 ? '#ffb040' : '#ff5a1a', size: 2.5, grav: 900 }); x = e; }
}
function drawGeysers() {
  for (const gz of L.geysers) { if (gz.x < cam.x - 80 || gz.x > cam.x + VW + 80) continue; const x = gz.x, y = gz.y;
    ctx.fillStyle = '#2a1018'; ctx.beginPath(); ctx.ellipse(x, y + 2, 22, 7, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ff7a20'; ctx.beginPath(); ctx.ellipse(x, y + 1, 13, 4, 0, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    if (gz.warn) { const a = 0.3 + 0.3 * Math.sin(time * 30); const g2 = ctx.createRadialGradient(x, y, 2, x, y, 40); g2.addColorStop(0, 'rgba(255,160,40,' + a + ')'); g2.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g2; ctx.fillRect(x - 40, y - 40, 80, 50);
      if (Math.random() < 0.5) parts.push({ x: x + (Math.random() - 0.5) * 20, y: y - 2, vx: (Math.random() - 0.5) * 40, vy: -120 - Math.random() * 120, life: 0.4, max: 0.4, col: '#ffb040', size: 2, grav: 600 }); }
    if (gz.on) { const k = ((time + gz.ph) % gz.per) - 0.9, hh = gz.h * Math.min(1, k * 6) * (0.92 + 0.08 * Math.sin(time * 40)), top = y - hh;
      const g2 = ctx.createLinearGradient(0, top, 0, y); g2.addColorStop(0, 'rgba(255,90,20,0)'); g2.addColorStop(0.15, 'rgba(255,120,30,.75)'); g2.addColorStop(0.6, 'rgba(255,200,80,.9)'); g2.addColorStop(1, 'rgba(255,250,200,.95)'); ctx.fillStyle = g2;
      ctx.beginPath(); ctx.moveTo(x - 14, y); for (let yy = y; yy > top; yy -= 14) ctx.lineTo(x - 14 - Math.sin(yy * 0.1 + time * 25) * 5 - (y - yy) / gz.h * 6, yy); ctx.lineTo(x, top - 12); for (let yy = top; yy < y; yy += 14) ctx.lineTo(x + 14 + Math.sin(yy * 0.1 - time * 25) * 5 + (y - yy) / gz.h * 6, yy); ctx.closePath(); ctx.fill();
      const g3 = ctx.createRadialGradient(x, y - hh / 2, 4, x, y - hh / 2, Math.max(40, hh * 0.7)); g3.addColorStop(0, 'rgba(255,140,40,.35)'); g3.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g3; ctx.fillRect(x - hh, top - 20, hh * 2, hh + 40);
      if (Math.random() < 0.9) parts.push({ x: x + (Math.random() - 0.5) * 16, y: top + Math.random() * 20, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 100, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#ffd060' : '#ff6a1a', size: 2.5, grav: 500 }); }
    ctx.globalCompositeOperation = 'source-over'; }
}
function drawRock(m, x, y, w) {        // roca volcánica flotante (las que se hunden tiemblan antes)
  if (m.st === 3) return; const jx = m.st === 1 ? Math.sin(time * 60) * 2.5 : 0, h = 30; x += jx;
  { const LP = lavaI('plataforma-lava'); if (LP) { const h2 = w * LP.naturalHeight / LP.naturalWidth; if (m.st === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,120,40,.25)'; ctx.fillRect(x, y, w, h2 * 0.5); ctx.globalCompositeOperation = 'source-over'; } ctx.drawImage(LP, x, y - h2 * 0.06, w, h2); return; } }
  ctx.globalCompositeOperation = 'lighter'; const g0 = ctx.createRadialGradient(x + w / 2, y + h, 2, x + w / 2, y + h, w * 0.6); g0.addColorStop(0, 'rgba(255,100,30,' + (m.fall ? 0.35 : 0.22) + ')'); g0.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g0; ctx.fillRect(x - w * 0.1, y, w * 1.2, h * 2.4); ctx.globalCompositeOperation = 'source-over';
  const g2 = ctx.createLinearGradient(0, y, 0, y + h + 16); g2.addColorStop(0, '#5a2a3a'); g2.addColorStop(0.35, '#3a1428'); g2.addColorStop(1, '#1a0812'); ctx.fillStyle = g2;
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + w - 6, y - 1); ctx.lineTo(x + w, y + 5); ctx.lineTo(x + w - 10, y + h * 0.7); ctx.lineTo(x + w * 0.62, y + h + 12); ctx.lineTo(x + w * 0.38, y + h + 6); ctx.lineTo(x + 12, y + h * 0.65); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#120408'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = m.fall ? 'rgba(255,140,40,' + (m.st === 1 ? 1 : 0.75) + ')' : 'rgba(255,120,40,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 8); ctx.lineTo(x + w * 0.35, y + 16); ctx.lineTo(x + w * 0.5, y + 12); ctx.moveTo(x + w * 0.6, y + 10); ctx.lineTo(x + w * 0.72, y + 20); ctx.lineTo(x + w * 0.55, y + h); ctx.stroke();
  ctx.fillStyle = '#ff8a30'; ctx.fillRect(x + 6, y - 1, w - 12, 2.5);
}
// ---------- mecánicas nuevas: llaves y puerta, escotillas secretas, bolas de magma, cañones de nieve, bombas del volcán, cristales que se encienden, scroll automático
function updExtras(dt, p) {
  const pc = p.x + p.w / 2;
  for (const k of L.keys) if (!k.got && !p.dead && Math.abs(pc - k.x) < 34 && Math.abs(p.y + p.h / 2 - k.y) < 50) { k.got = true; const n = L.keys.filter(q => q.got).length;
    burst(k.x, k.y, 24, '#ffd23c', 260, 0.6, 0, 3); [784, 1047, 1319].forEach((f, i) => tone(f, f, 0.1, 'triangle', 0.12, i * 0.07)); pop(k.x, k.y - 30, 'LLAVE ' + n + ' / ' + L.keys.length, '#ffd23c');
    if (n === L.keys.length) { for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (L.g[y][x] === 'D') { L.g[y][x] = ' '; burst(x * T + T / 2, y * T + T / 2, 10, '#ffd23c', 200, 0.6, 300, 3); }
      pop(pc, p.y - 60, '¡PUERTA ABIERTA!', '#ffd23c'); SFX.life(); shake = 0.3; } }
  if (p.onGround && K.down && !p.dead && !(p.pipeT > 0)) for (const pp of L.pipes) if (pc > pp.x + 6 && pc < pp.x + 2 * T - 6 && Math.abs(p.y + p.h - pp.y) < 6) {
    p.pipeT = 0.6; SFX.portal(); burst(pc, pp.y - 20, 26, pp.hid ? '#c63cff' : '#7fe9ff', 260, 0.6, 0, 4); p.x = pp.tox - p.w / 2; p.y = pp.toy - p.h - 0.01; p.vx = p.vy = 0; cam.x = p.x - VW * 0.4; cam.y = p.y - VHv * 0.6; burst(p.x + p.w / 2, p.y + p.h / 2, 26, '#ffffff', 260, 0.6, 0, 4); if (pp.hid) pop(pc, p.y - 40, '¡PASADIZO SECRETO!', '#e0b0ff'); break; }
  p.pipeT = Math.max(0, (p.pipeT || 0) - dt);
  for (const j of L.jumpers) { const k = ((time + j.ph) % j.per) / j.per; j.up = k < 0.55; j.y = j.up ? j.by - j.h * Math.sin(k / 0.55 * Math.PI) : j.by + 60; j.vy = j.up ? Math.cos(k / 0.55 * Math.PI) : 0;
    if (j.up && !p.dead && !p.win && !CHEAT.ghost && Math.abs(pc - j.x) < 22 + p.w / 2 && Math.abs(p.y + p.h / 2 - j.y) < 20 + p.h / 2) { if (p.tStar <= 0) hurt(); }
    if (j.up && k < 0.04 && Math.abs(j.x - pc) < VW) burst(j.x, j.by, 10, '#ffb040', 200, 0.4, 600, 3); }
  for (const gg of L.guns) { if (Math.abs(gg.x - pc) > VW * 1.2) continue; gg.t -= dt; if (gg.t <= 0) { gg.t = gg.per; shots.push({ mine: false, x: gg.x + gg.dir * 40, y: gg.y - 24, vx: gg.dir * 210, vy: 0, w: 34, h: 34, life: 8, ball: true, ice: true }); tone(200, 120, 0.2, 'triangle', 0.06); burst(gg.x + gg.dir * 40, gg.y - 24, 8, '#ffffff', 120, 0.3, 0, 3); } }
  const bm = L.bombs;
  if (bm && !p.dead && !p.win && bm.zones.some(z => pc > z[0] && pc < z[1])) { bm.acc += dt; if (bm.acc > bm.every) { bm.acc = Math.random() * 0.4; const tx = Math.floor((pc - 160 + Math.random() * 640) / T);
      let gy = -1; for (let y = Math.max(0, Math.floor(cam.y / T)); y < L.H; y++) if (isSolid(tileAt(tx, y)) || tileAt(tx, y) === '=') { gy = y * T; break; }
      if (gy > 0) L.bl.push({ x: tx * T + T / 2, gy, t: 0, y: cam.y - 100, bolt: bm.style === 'bolt' }); } }
  for (const q of L.bl) { q.t += dt; if (q.t > 1.3) { q.y += (q.bolt ? 9000 : 1500) * dt; if (q.y >= q.gy) { q.dead = true; if (q.bolt) { L.flash = 0.7; noise(0.8, 0.25, 500); tone(80, 40, 0.5, 'sawtooth', 0.1); } burst(q.x, q.gy, 26, '#ff9a3c', 300, 0.6, 500, 4); burst(q.x, q.gy, 10, '#3a2020', 200, 0.7, 700, 5); noise(0.35, 0.18, 700); if (Math.abs(q.x - pc) < VW) shake = Math.max(shake, 0.15);
        if (!p.dead && !CHEAT.ghost && Math.abs(q.x - pc) < 56 && Math.abs(q.gy - (p.y + p.h)) < 90) { if (p.tStar <= 0) hurt(); } } } }
  L.bl = L.bl.filter(q => !q.dead);
  if (L.crystalLight) for (const c of L.crys) if (!c.lit && Math.abs(pc - c.x) < 70 && Math.abs(p.y + p.h - c.y) < 90) { c.lit = true; [1319, 1760, 2093].forEach((f, i) => tone(f, f, 0.2, 'sine', 0.07, i * 0.05)); burst(c.x, c.y - 30, 18, '#bff4ff', 200, 0.6, 0, 3); }
  if (L.auto && L.chase) L.chase.x = L.auto.x - 2;
  if (L.auto && !p.win) { const A = L.auto; if (!p.dead && (!A.wait || L.movers.some(m => m.raft && m.go))) A.x = Math.min(L.W * T - VW, A.x + A.speed * dt);
    if (!p.dead) { if (p.x < A.x + 6) { p.x = A.x + 6; if (collide(p)) die(); } if (p.x + p.w > A.x + VW - 30) p.x = A.x + VW - 30 - p.w; } }
}
function drawExtras() {
  const vis = x => x > cam.x - 150 && x < cam.x + VW + 150;
  for (const k of L.keys) if (!k.got && vis(k.x)) { const y = k.y + Math.sin(time * 3 + k.x) * 5;
    ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(k.x, y, 2, k.x, y, 40); g2.addColorStop(0, 'rgba(255,210,60,.5)'); g2.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g2; ctx.fillRect(k.x - 40, y - 40, 80, 80); ctx.globalCompositeOperation = 'source-over';
    if (okI(xi('obj-llave'))) { spr(IMG['obj-llave'], k.x, y, 56, 0.5, 0.5, false, Math.sin(time * 2) * 0.25); continue; }
    ctx.save(); ctx.translate(k.x, y); ctx.rotate(Math.sin(time * 2) * 0.25); ctx.strokeStyle = '#6a3d00'; ctx.lineWidth = 3; ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.arc(0, -10, 10, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6a3d00'; ctx.beginPath(); ctx.arc(0, -10, 4, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffd23c';
    ctx.fillRect(-3, -1, 6, 22); ctx.strokeRect(-3, -1, 6, 22); ctx.fillRect(3, 12, 7, 4); ctx.fillRect(3, 17, 5, 4); ctx.restore(); }
  for (const pp of L.pipes) { if (!vis(pp.x)) continue; const cx = pp.x + T;
    if (pp.hid) { if (Math.floor(time * 1.3 + pp.x) % 5 === 0 && Math.random() < 0.15) parts.push({ x: cx + (Math.random() - 0.5) * 50, y: pp.y - 4, vx: 0, vy: -40, life: 0.8, max: 0.8, col: '#e0b0ff', size: 1.6, grav: 0 }); continue; }
    if (okI(xi('obj-tubo'))) { const tw = T * 2.1, th = tw * IMG['obj-tubo'].naturalHeight / IMG['obj-tubo'].naturalWidth; ctx.drawImage(IMG['obj-tubo'], cx - tw / 2, pp.y - th * 0.62, tw, th);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '900 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼', cx, pp.y - th * 0.62 - 8 + Math.sin(time * 5) * 3); continue; }
    ctx.fillStyle = '#10141c'; ctx.beginPath(); ctx.ellipse(cx, pp.y + 2, T * 0.85, 9, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = L.theme === 'lava' ? '#ff8a30' : L.theme === 'ice' ? '#bff4ff' : '#7fe9ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(127,233,255,' + (0.15 + 0.1 * Math.sin(time * 4)) + ')'; ctx.beginPath(); ctx.ellipse(cx, pp.y, T * 0.6, 5, 0, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '900 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼', cx, pp.y - 10 + Math.sin(time * 5) * 3); }
  for (const j of L.jumpers) { if (!j.up || !vis(j.x)) continue; if (L.theme === 'jungle') { drawChomp(j); continue; } const y = j.y;
    ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(j.x, y, 4, j.x, y, 40); g2.addColorStop(0, 'rgba(255,190,60,.7)'); g2.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g2; ctx.fillRect(j.x - 40, y - 40, 80, 80); ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(j.x, y); ctx.rotate(j.vy < 0 ? Math.PI : 0); const bg = ctx.createRadialGradient(-5, -6, 2, 0, 0, 20); bg.addColorStop(0, '#fff2a0'); bg.addColorStop(0.5, '#ff8a20'); bg.addColorStop(1, '#a01e08'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#3a0a04'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, 2, 5, 0, 6.283); ctx.arc(6, 2, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = '#200'; ctx.beginPath(); ctx.arc(-6, 4, 2.4, 0, 6.283); ctx.arc(6, 4, 2.4, 0, 6.283); ctx.fill(); ctx.restore();
    if (Math.random() < 0.6) parts.push({ x: j.x + (Math.random() - 0.5) * 16, y: y + (j.vy > 0 ? 16 : -16), vx: 0, vy: j.vy > 0 ? 60 : -60, life: 0.4, max: 0.4, col: '#ff8a20', size: 3, grav: 0 }); }
  for (const gg of L.guns) { if (!vis(gg.x)) continue; if (L.theme === 'jungle') { ctx.save(); ctx.translate(gg.x, gg.y); ctx.scale(gg.dir, 1); ctx.fillStyle = '#5a6a5a'; ctx.fillRect(-24, -60, 44, 60); ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 2.5; ctx.strokeRect(-24, -60, 44, 60); ctx.fillStyle = '#2a3a2a'; ctx.fillRect(4, -30, 18, 14); ctx.fillStyle = '#5aff6a'; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(-6, -44, 5, 0, 6.283); ctx.arc(10, -44, 5, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3a8a3a'; ctx.fillRect(-26, -64, 48, 6); ctx.restore(); continue; } ctx.save(); ctx.translate(gg.x, gg.y); ctx.scale(gg.dir, 1); ctx.fillStyle = '#3a5a7a'; ctx.fillRect(-22, -22, 30, 22); ctx.fillStyle = '#5a86ac'; ctx.beginPath(); ctx.arc(-6, -30, 20, 0, 6.283); ctx.fill(); ctx.fillStyle = '#2a3e56'; ctx.fillRect(4, -40, 32, 20); ctx.fillStyle = '#10182a'; ctx.beginPath(); ctx.ellipse(36, -30, 5, 10, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#f4fcff'; ctx.beginPath(); ctx.ellipse(-6, -48, 22, 7, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
  for (const q of L.bl) { const a = Math.min(1, q.t / 1.3); if (q.bolt) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(180,230,255,' + (0.4 + 0.5 * Math.abs(Math.sin(time * 14))) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, q.gy, 50 * (1.3 - a * 0.3), 11, 0, 0, 6.283); ctx.stroke(); if (q.t > 1.2) { ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 5; ctx.beginPath(); let yy = cam.y - 20, xx = q.x + 40; ctx.moveTo(xx, yy); while (yy < q.gy) { yy += 40; xx = q.x + (Math.random() - 0.5) * 40 * (1 - yy / q.gy); ctx.lineTo(xx, Math.min(yy, q.gy)); } ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; continue; }
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,90,40,' + (0.4 + 0.5 * Math.abs(Math.sin(time * 14))) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, q.gy, 56 * (1.3 - a * 0.3), 12, 0, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,60,30,' + 0.25 * a + ')'; ctx.beginPath(); ctx.ellipse(q.x, q.gy, 56 * a, 12 * a, 0, 0, 6.283); ctx.fill();
    if (q.t > 1.3) { const tg = ctx.createLinearGradient(q.x, q.y - 160, q.x, q.y); tg.addColorStop(0, 'rgba(255,90,20,0)'); tg.addColorStop(1, 'rgba(255,200,80,.9)'); ctx.fillStyle = tg; ctx.fillRect(q.x - 12, q.y - 160, 24, 160); }
    ctx.globalCompositeOperation = 'source-over';
    if (q.t > 1.3) { ctx.fillStyle = '#3a1a14'; ctx.beginPath(); ctx.arc(q.x, q.y, 20, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#ff8a30'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#ff6a1a'; ctx.fillRect(q.x - 8, q.y - 3, 12, 3); ctx.fillRect(q.x + 2, q.y + 5, 8, 3); } }
}
// tiles especiales: interruptor, bloques rojo/azul, pared agrietada (se rompe con el láser) y puerta de llaves
function drawSpecial(c, tx, ty) {
  const x = tx * T, y = ty * T;
  if (c === 'X' || c === 'Y') { const on0 = c === 'X' ? !L.sw : !!L.sw, bi = xi((c === 'X' ? 'bloque-rojo' : 'bloque-azul') + (on0 ? '' : '-off'));
    if (okI(bi)) { if (!on0) ctx.globalAlpha = 0.75; ctx.drawImage(bi, x - 1, y - 1, T + 2, T + 2); ctx.globalAlpha = 1; return; } }
  if (c === 'X' || c === 'Y') { const on = c === 'X' ? !L.sw : !!L.sw, col = c === 'X' ? ['#ff3a5a', '#7a1428', '255,58,90'] : ['#3a8aff', '#14347a', '58,138,255'];
    if (on) { ctx.fillStyle = col[1]; ctx.fillRect(x + 1, y + 1, T - 2, T - 2); ctx.fillStyle = col[0]; ctx.fillRect(x + 4, y + 4, T - 8, T - 8); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 4, y + 4, T - 8, 5); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, T - 2, T - 2); }
    else { ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(' + col[2] + ',.6)'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, T - 8, T - 8); ctx.setLineDash([]); } }
  else if (c === '!') { const b = bumps.find(q => q.tx === tx && q.ty === ty), oy = b ? -Math.sin(b.t / 0.2 * Math.PI) * 8 : 0; ctx.fillStyle = '#20242e'; ctx.fillRect(x + 2, y + 2 + oy, T - 4, T - 4); ctx.fillStyle = L.sw ? '#3a8aff' : '#ff3a5a'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 + oy, 13, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 18px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x + T / 2, y + T / 2 + 1 + oy); ctx.textBaseline = 'alphabetic'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2 + oy, T - 4, T - 4); }
  else if (c === 'D' && okI(xi('obj-puerta'))) { if (tileAt(tx, ty - 1) === 'D') return; let n = 1; while (tileAt(tx, ty + n) === 'D') n++;
    const dw = T * 1.5; ctx.drawImage(IMG['obj-puerta'], x + T / 2 - dw / 2, y - 4, dw, n * T + 4); }
  else if (c === 'D') { const g2 = ctx.createLinearGradient(x, 0, x + T, 0); g2.addColorStop(0, '#5a3a10'); g2.addColorStop(0.5, '#c8902a'); g2.addColorStop(1, '#5a3a10'); ctx.fillStyle = g2; ctx.fillRect(x + 2, y, T - 4, T); ctx.strokeStyle = '#2a1804'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y, T - 4, T);
    if (!isWallT(tileAt(tx, ty - 1)) || tileAt(tx, ty - 1) === 'D' && tileAt(tx, ty + 1) !== 'D') { ctx.fillStyle = '#2a1804'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 - 4, 6, 0, 6.283); ctx.fill(); ctx.fillRect(x + T / 2 - 2.5, y + T / 2, 5, 12); } }
}
/* ======================= PLANETA 4 · SELVA BIOLUMINISCENTE: efectos y mecánicas propias ======================= */
// setas trampolín, lianas para trepar, chorros de esporas, luciérnagas que te siguen y alumbran, balsa por el río, tormenta tropical
function jungleInit(l) {
  l.amb = []; if (l.theme !== 'jungle') return;
  const n = Math.round(l.W * (l.cave ? 0.45 : 0.3)); for (let i = 0; i < n; i++) l.amb.push({ x: Math.random() * l.W * T, y: Math.random() * l.H * T, ph: Math.random() * 6.3, s: 0.6 + Math.random() * 0.8, c: Math.random() < 0.75 ? '200,255,90' : Math.random() < 0.5 ? '90,240,255' : '255,120,220' });
}
function updJungle(dt, p) {
  const pc = p.x + p.w / 2, pm = p.y + p.h / 2;
  for (const f of L.flyb) { if (!f.got) { if (Math.hypot(pc - f.x, pm - f.y) < 46 && !p.dead) { f.got = true; p.flies = (p.flies || 0) + 1; f.k = p.flies; tone(1760, 2600, 0.12, 'sine', 0.06); tone(2600, 3400, 0.1, 'sine', 0.04, 0.06); burst(f.x, f.y, 10, '#d8ff6a', 120, 0.4, 0, 2.5); if (L.dark) pop(f.x, f.y - 20, '+LUZ', '#d8ff6a'); } }
    else { const a = time * 2.2 + f.k * 1.9, r = 34 + (f.k % 3) * 12, tx = pc + Math.cos(a) * r, ty = pm - 20 + Math.sin(a * 1.3) * r * 0.6; f.x += (tx - f.x) * Math.min(1, dt * 4); f.y += (ty - f.y) * Math.min(1, dt * 4); } }
  if (!p.dead && !p.win) for (const v of L.vines) if (pc > v.x - 22 && pc < v.x + 22 && p.y + p.h > v.y0 + 10 && p.y < v.y1) {          // lianas: mantén salto para trepar
    if (!p.climb) tone(500, 700, 0.08, 'triangle', 0.05); p.climb = true; p.onGround = false; p.vy = K.jump ? -250 : K.down ? 280 : Math.min(p.vy, 40); p.x += (v.x - pc) * Math.min(1, dt * 6) * (K.left || K.right ? 0 : 1); p.coyote = 0.12; break; }
  p.climb = p.climb && L.vines.some(v => pc > v.x - 22 && pc < v.x + 22 && p.y + p.h > v.y0 + 10 && p.y < v.y1);
  for (const s of L.spores) { const k = ((time + s.ph) % s.per), on = k > 0.8 && k < 2.0; s.warn = k > 0.2 && k <= 0.8;
    if (on && !s.on && Math.abs(s.x - pc) < VW) { noise(0.6, 0.06, 2600); tone(300, 900, 0.5, 'sine', 0.05); } s.on = on;
    if (on && !p.dead && Math.abs(pc - s.x) < 22 + p.w / 2 && p.y + p.h > s.y - s.h && p.y + p.h <= s.y + 6) { p.vy = Math.min(p.vy, -820); p.onGround = false; p.boost = 1; if (Math.random() < 0.3) burst(pc, p.y + p.h, 4, '#ff9ae0', 80, 0.3, 0, 2); } }
}
function drawJungleBg() {
  const g = ctx.createLinearGradient(0, 0, 0, VHv);
  if (L.cave) { g.addColorStop(0, '#02060c'); g.addColorStop(0.6, '#06222a'); g.addColorStop(1, '#0a3a3a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
    for (const [par, col, sz] of [[0.1, '#08303a', 1], [0.25, '#052028', 1.4]]) { const off = cam.x * par; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = -((off) % 90) - 90; x < VW + 90; x += 45) { const i = Math.floor((x + off) / 45), h = (30 + ((i * 53) % 70)) * sz; ctx.lineTo(x, 0); ctx.lineTo(x + 22, h); ctx.lineTo(x + 45, 0); } ctx.lineTo(VW, 0); ctx.closePath(); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 9; i++) { const x = ((i * 233 - cam.x * 0.2) % (VW + 300) + VW + 300) % (VW + 300) - 150, y = VHv * (0.55 + (i % 3) * 0.12), c = ['60,200,255', '255,90,220', '120,255,140'][i % 3], a = 0.1 + 0.06 * Math.sin(time * 1.5 + i); const rg = ctx.createRadialGradient(x, y, 4, x, y, 120); rg.addColorStop(0, 'rgba(' + c + ',' + a + ')'); rg.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = rg; ctx.fillRect(x - 120, y - 120, 240, 240); }
    ctx.globalCompositeOperation = 'source-over'; return; }
  g.addColorStop(0, '#0a0624'); g.addColorStop(0.45, '#1a1a4a'); g.addColorStop(0.75, '#0f4a4a'); g.addColorStop(1, '#0a3a2a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
  for (const s2 of STARS) { const px = ((s2.x * 1400 - cam.x * 0.03 * s2.l) % 1400 + 1400) % 1400; if (px > VW || s2.y > 0.5) continue; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + s2.tw); ctx.fillStyle = '#e8fff0'; ctx.fillRect(px, s2.y * VHv, s2.s, s2.s); } ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';          // nebulosa morada y verde
  for (let b = 0; b < 2; b++) { const nx = VW * (0.3 + b * 0.4) - cam.x * 0.01, ny = VHv * (0.18 + b * 0.06), r = VHv * 0.5; const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r); ng.addColorStop(0, b ? 'rgba(80,255,170,.13)' : 'rgba(180,90,255,.16)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ng; ctx.fillRect(nx - r, ny - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = 'source-over';
  { const m1 = VW * 0.22 - cam.x * 0.01, m2 = VW * 0.74 - cam.x * 0.014; const mg = ctx.createRadialGradient(m1 - 8, VHv * 0.14 - 8, 3, m1, VHv * 0.14, 34); mg.addColorStop(0, '#f2e6ff'); mg.addColorStop(1, '#8a6ab8'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m1, VHv * 0.14, 34, 0, 6.283); ctx.fill();
    const mg2 = ctx.createRadialGradient(m2 - 6, VHv * 0.09 - 6, 2, m2, VHv * 0.09, 22); mg2.addColorStop(0, '#eaffd8'); mg2.addColorStop(1, '#5aa86a'); ctx.fillStyle = mg2; ctx.beginPath(); ctx.arc(m2, VHv * 0.09, 22, 0, 6.283); ctx.fill(); }
  const up = (L.H * T - VHv - cam.y) * 0.1, FA = selI('fondo-lejos-selva'), FB = selI('fondo-cerca-selva');
  if (FA) bgLayer(FA, Math.max(220, VHv * 0.5), VHv * 0.86 + up, 0.06);
  ctx.fillStyle = 'rgba(10,30,50,.25)'; ctx.fillRect(0, 0, VW, VHv);
  ctx.globalCompositeOperation = 'lighter';          // rayos de luna entre los árboles
  for (let i = 0; i < 4; i++) { const x = ((i * 380 - cam.x * 0.08) % (VW + 500) + VW + 500) % (VW + 500) - 250, a = 0.05 + 0.03 * Math.sin(time * 0.6 + i * 2); const rg = ctx.createLinearGradient(0, 0, 0, VHv); rg.addColorStop(0, 'rgba(200,255,230,' + a + ')'); rg.addColorStop(1, 'rgba(200,255,230,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 230, VHv); ctx.lineTo(x + 120, VHv); ctx.closePath(); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  if (FB && !L.sky) bgLayer(FB, Math.max(260, VHv * 0.56), VHv - T * 1.3 + up * 2, 0.2);
  const fg = ctx.createLinearGradient(0, VHv * 0.62, 0, VHv); fg.addColorStop(0, 'rgba(120,255,200,0)'); fg.addColorStop(1, 'rgba(120,255,200,.16)'); ctx.fillStyle = fg; ctx.fillRect(0, VHv * 0.62, VW, VHv * 0.38);
}
function drawJungleWorld() {          // dentro del mundo (con la cámara): luciérnagas, lianas, chorros de esporas
  const vis = x => x > cam.x - 150 && x < cam.x + VW + 150;
  if (L.cascade) { const x0 = L.cascade[0] * T, x1 = (L.cascade[1] + 1) * T, y0 = Math.max(0, cam.y - 20), y1 = cam.y + VHv + 20; const cg = ctx.createLinearGradient(x0, 0, x1, 0); cg.addColorStop(0, 'rgba(120,230,255,.15)'); cg.addColorStop(0.5, 'rgba(190,250,255,.35)'); cg.addColorStop(1, 'rgba(120,230,255,.15)'); ctx.fillStyle = cg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(230,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 14; k++) { const xx = x0 + (k + 0.5) * (x1 - x0) / 14, off = (time * 600 + k * 97) % 160; for (let yy = y0 - 160 + off; yy < y1; yy += 160) { ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 70); } } ctx.stroke();
    if (Math.random() < 0.6) parts.push({ x: x0 + Math.random() * (x1 - x0), y: cam.y + Math.random() * VHv, vx: (Math.random() - 0.5) * 40, vy: 200, life: 0.5, max: 0.5, col: '#e8ffff', size: 2, grav: 0 }); }
  for (const v of L.vines) { if (!vis(v.x)) continue; ctx.strokeStyle = '#2a6a2a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); for (let y = v.y0; y <= v.y1; y += 12) { const x = v.x + Math.sin(y * 0.05 + time * 1.5) * 4; y === v.y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#6ad86a'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#4ac84a'; for (let y = v.y0 + 20; y < v.y1; y += 34) { const x = v.x + Math.sin(y * 0.05 + time * 1.5) * 4, s = (y / 34) % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + s * 9, y, 9, 4, s * 0.5, 0, 6.283); ctx.fill(); } ctx.lineCap = 'butt'; }
  for (const s of L.spores) { if (!vis(s.x)) continue; const x = s.x, y = s.y;
    ctx.fillStyle = '#3a1a3a'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 8, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ff7ad8'; ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    if (s.warn && Math.random() < 0.5) parts.push({ x: x + (Math.random() - 0.5) * 24, y: y - 2, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, life: 0.5, max: 0.5, col: '#ffb0f0', size: 2, grav: 0 });
    if (s.on) { const hh = s.h * (0.9 + 0.1 * Math.sin(time * 30)); const g2 = ctx.createLinearGradient(0, y - hh, 0, y); g2.addColorStop(0, 'rgba(255,120,220,0)'); g2.addColorStop(0.5, 'rgba(255,150,230,.35)'); g2.addColorStop(1, 'rgba(255,220,250,.7)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 30, y - hh); ctx.lineTo(x + 30, y - hh); ctx.lineTo(x + 18, y); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 3; i++) parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 20, vx: (Math.random() - 0.5) * 60, vy: -300 - Math.random() * 250, life: 0.7, max: 0.7, col: Math.random() < 0.5 ? '#ff9ae0' : '#e0b0ff', size: 2 + Math.random() * 2, grav: 0 }); }
    ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalCompositeOperation = 'lighter';
  for (const f of L.amb) { if (!vis(f.x)) continue; const x = f.x + Math.sin(time * 0.7 * f.s + f.ph) * 40, y = f.y + Math.sin(time * 1.1 * f.s + f.ph * 2) * 26, a = Math.max(0, Math.sin(time * 2.4 * f.s + f.ph)); if (a < 0.05) continue;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, 16); g2.addColorStop(0, 'rgba(' + f.c + ',' + 0.9 * a + ')'); g2.addColorStop(1, 'rgba(' + f.c + ',0)'); ctx.fillStyle = g2; ctx.fillRect(x - 16, y - 16, 32, 32); }
  for (const f of L.flyb) { const x = f.x, y = f.y + (f.got ? 0 : Math.sin(time * 3 + f.x) * 6), a = 0.7 + 0.3 * Math.sin(time * 8 + f.x);
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, f.got ? 30 : 40); g2.addColorStop(0, 'rgba(230,255,120,' + a + ')'); g2.addColorStop(0.3, 'rgba(180,255,80,' + 0.4 * a + ')'); g2.addColorStop(1, 'rgba(120,255,60,0)'); ctx.fillStyle = g2; ctx.fillRect(x - 40, y - 40, 80, 80); ctx.fillStyle = '#ffffe0'; ctx.fillRect(x - 2, y - 2, 4, 4); }
  ctx.globalCompositeOperation = 'source-over';
}
let RAIN = []; for (let i = 0; i < 140; i++) RAIN.push({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.6 });
function drawJungleFx() {          // por delante: lluvia tropical con relámpagos
  if (L.theme !== 'jungle' || !L.storm) return;
  ctx.strokeStyle = 'rgba(190,230,255,.45)'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (const r of RAIN) { r.y += r.v * 0.022; r.x -= 0.004; if (r.y > 1) { r.y = 0; r.x = Math.random() * 1.2; } const x = r.x * VW, y = r.y * VHv; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); } ctx.stroke();
  const fl = L.flash || 0; if (fl > 0) { ctx.fillStyle = 'rgba(230,245,255,' + Math.min(0.7, fl) + ')'; ctx.fillRect(0, 0, VW, VHv); L.flash = fl - 0.04; }
}
function swampBand(x0, ww, y, dep) {          // ciénaga tóxica: agua verde con burbujas
  const g2 = ctx.createLinearGradient(0, y - 6, 0, y + Math.min(dep, 240)); g2.addColorStop(0, '#d0ff9a'); g2.addColorStop(0.06, '#6ae06a'); g2.addColorStop(0.35, '#1a8a5a'); g2.addColorStop(1, '#063a2a'); ctx.fillStyle = g2;
  ctx.beginPath(); ctx.moveTo(x0, y + dep); for (let x = x0; x <= x0 + ww + 12; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + time * 1.6) * 3 + Math.sin(x * 0.011 - time) * 2); ctx.lineTo(x0 + ww + 12, y + dep); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,255,140,.55)';
  for (let i = 0; i < Math.ceil(ww / 60); i++) { const ph = (time * 0.6 + i * 0.41) % 1, xx = x0 + ((i * 97 + Math.floor(x0)) % Math.max(1, ww)); ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(xx, y + 8 - ph * 14, 2 + ph * 6, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawLily(m, x, y, w) {          // nenúfar que se hunde en la ciénaga
  if (m.st === 3) return; const jx = m.st === 1 ? Math.sin(time * 50) * 2 : 0, cx = x + w / 2 + jx, cy = y + 6;
  ctx.fillStyle = 'rgba(0,30,20,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, w * 0.52, 9, 0, 0, 6.283); ctx.fill();
  const g2 = ctx.createRadialGradient(cx - 10, cy - 4, 4, cx, cy, w * 0.55); g2.addColorStop(0, m.st === 1 ? '#c8ff6a' : '#8aea5a'); g2.addColorStop(1, '#2a8a3a'); ctx.fillStyle = g2;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.52, 11, 0, 0.25, 6.03); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#0a3a1a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(20,90,40,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = 0.6 + k * 0.9; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w * 0.45, cy + Math.sin(a) * 9); } ctx.stroke();
  if ((m.bx / T | 0) % 3 === 0) { ctx.fillStyle = '#ff7ad8'; for (let k = 0; k < 5; k++) { const a = k * 1.256 + time * 0.3; ctx.beginPath(); ctx.ellipse(cx + 14 + Math.cos(a) * 5, cy - 6 + Math.sin(a) * 3, 6, 3, a, 0, 6.283); ctx.fill(); } ctx.fillStyle = '#ffe060'; ctx.beginPath(); ctx.arc(cx + 14, cy - 6, 3, 0, 6.283); ctx.fill(); }
}
function drawChomp(j) {          // planta carnívora que sale de la ciénaga a morder
  const x = j.x, y = j.y, open = 0.35 + 0.35 * Math.sin(time * 12);
  ctx.strokeStyle = '#2a6a2a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, j.by + 30); ctx.quadraticCurveTo(x + 14, (y + j.by) / 2, x, y + 14); ctx.stroke(); ctx.strokeStyle = '#5ac85a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.translate(x, y); const top = ctx.createRadialGradient(-6, -10, 3, 0, 0, 26); top.addColorStop(0, '#ff8ae0'); top.addColorStop(1, '#8a1a8a'); ctx.fillStyle = top;
  ctx.beginPath(); ctx.ellipse(0, -4 - open * 10, 24, 15, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 4 + open * 10, 24, 13, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#fff6d0'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 8 - 4, -4 - open * 10); ctx.lineTo(k * 8, 4 - open * 10); ctx.lineTo(k * 8 + 4, -4 - open * 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(k * 8 - 4, 4 + open * 10); ctx.lineTo(k * 8, -4 + open * 10); ctx.lineTo(k * 8 + 4, 4 + open * 10); ctx.fill(); }
  ctx.fillStyle = '#d8ff3a'; ctx.beginPath(); ctx.arc(-8, -14 - open * 10, 4, 0, 6.283); ctx.fill(); ctx.restore();
}
function drawPod(ic, x, y, L2) {          // vaina de semillas colgando (en vez de carámbano)
  ctx.strokeStyle = '#3a7a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
  const g2 = ctx.createLinearGradient(x - 12, 0, x + 12, 0); g2.addColorStop(0, '#5a3a1a'); g2.addColorStop(0.5, '#a8743a'); g2.addColorStop(1, '#5a3a1a'); ctx.fillStyle = g2;
  ctx.beginPath(); ctx.ellipse(x, y + 6 + L2 * 0.42, L2 * 0.22, L2 * 0.42, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#7ad84a'; ctx.beginPath(); ctx.ellipse(x - 8, y + 6, 9, 4, -0.5, 0, 6.283); ctx.ellipse(x + 8, y + 6, 9, 4, 0.5, 0, 6.283); ctx.fill();
}
function drawMush(pd) {          // seta trampolín gigante
  const k = Math.max(0, 1 - pd.t * 5), cx = pd.x + pd.w / 2, top = pd.y, base = pd.y + T, c = pd.c || 0, col = [['#3a8aff', '90,170,255'], ['#ff4ac8', '255,90,210'], ['#4ae84a', '120,255,120']][c % 3], sq = 1 - k * 0.35, ww = pd.w * 0.62 * (1 + k * 0.25);
  ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(cx, top + 10, 4, cx, top + 10, 70); gg.addColorStop(0, 'rgba(' + col[1] + ',' + (0.3 + 0.12 * Math.sin(time * 3 + pd.x) + k * 0.4) + ')'); gg.addColorStop(1, 'rgba(' + col[1] + ',0)'); ctx.fillStyle = gg; ctx.fillRect(cx - 70, top - 60, 140, 140); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#e8f0e0'; ctx.fillRect(cx - 9, top + 10, 18, base - top - 10); ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 2; ctx.strokeRect(cx - 9, top + 10, 18, base - top - 10);
  ctx.save(); ctx.translate(cx, top + 14); ctx.scale(1, sq); const cg = ctx.createRadialGradient(-10, -16, 4, 0, -6, ww); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, col[0]); cg.addColorStop(1, '#101a3a'); ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(0, 0, ww, 22, 0, Math.PI, 0); ctx.quadraticCurveTo(ww * 0.6, 8, 0, 6); ctx.quadraticCurveTo(-ww * 0.6, 8, -ww, 0); ctx.fill(); ctx.strokeStyle = '#0a0a20'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; for (const [dx, dy, r] of [[-ww * 0.45, -10, 5], [ww * 0.1, -16, 4], [ww * 0.5, -8, 3.5]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.283); ctx.fill(); } ctx.restore();
}
// --- jefe del planeta 4 · COLOSO DE LA SELVA: camina pesado, hace brotar raíces bajo tus pies, salta y se queda clavado en el suelo, escupe semillas
function bossJungle(dt, b, p, a, mid, ph2, gy, px) {
  if (b.st === 'walk' || b.st === 'hover') { b.st = 'walk'; b.y = gy; const d = Math.sign(px - b.x) || 1; b.side = d; b.x += d * (ph2 ? 55 : 40) * dt; b.x = Math.max(a.x0 + 100, Math.min(a.x1 - 100, b.x)); if (Math.floor(b.t * 2.2) !== Math.floor((b.t - dt) * 2.2)) { shake = Math.max(shake, 0.12); noise(0.15, 0.1, 200); }
    if (b.t > (ph2 ? 2.3 : 3)) { b.cyc++; b.t = 0; b.st = ['roots', 'leap', 'seed'][b.cyc % (ph2 ? 3 : 2)]; tone(120, 70, 0.6, 'sawtooth', 0.08); } }
  else if (b.st === 'roots') { if (b.t < 0.05) { b.fireT = 1.2; const n = ph2 ? 5 : 3; for (let k = 0; k < n; k++) { const x = Math.max(a.x0 + 40, Math.min(a.x1 - 40, px + (k - (n - 1) / 2) * 120)); L.waves.push({ x, dir: 0, sp: 0, life: 1.0 + k * 0.12, lava: true, root: true }); } pop(b.x, b.y - 250, '¡RAÍCES!', '#9aff6a'); }
    if (b.t > 1.8) { b.st = 'walk'; b.t = 0; } }
  else if (b.st === 'leap') { if (b.t < 0.05) { b.vy = -1250; b.vx = (Math.max(a.x0 + 120, Math.min(a.x1 - 120, px)) - b.x) / 1.1; tone(80, 300, 0.6, 'sawtooth', 0.08); }
    b.vy += 2300 * dt; b.y += b.vy * dt; b.x += b.vx * dt;
    if (b.y >= gy && b.vy > 0) { b.y = gy; b.st = 'stun'; b.t = 0; shake = 0.9; noise(0.7, 0.3, 300); tone(60, 30, 0.8, 'sawtooth', 0.15); const ws = ph2 ? 360 : 300; L.waves.push({ x: b.x - 70, dir: -1, sp: ws }, { x: b.x + 70, dir: 1, sp: ws });
      for (let k = 0; k < (ph2 ? 5 : 3); k++) L.icicles.push({ x0: 0, y0: 0, x: a.x0 + 80 + Math.random() * (a.x1 - a.x0 - 160), y: cam.y - 60 - Math.random() * 200, st: 2, vy: 0, big: Math.random() < 0.5 });
      burst(b.x, gy, 30, '#8a7a5a', 300, 0.8, 700, 5); pop(b.x, b.y - 250, '¡SE HA CLAVADO!', '#9aff6a'); } }
  else if (b.st === 'seed') { if (b.t < 0.05) b.fireT = 1.0;
    if (b.t > 0.6 && !b.thrown) { b.thrown = true; for (let k = 0; k < 3; k++) { const tx = px + (k - 1) * 150, ft = 1.3, vx = (tx - b.x) / ft, vy = (gy - 20 - (b.y - 170) - 0.5 * 900 * ft * ft) / ft; shots.push({ mine: false, x: b.x + b.side * 40, y: b.y - 170, vx, vy, g: 900, w: 20, h: 20, life: 3, seed: true }); } tone(400, 200, 0.3, 'square', 0.08); burst(b.x + b.side * 40, b.y - 170, 12, '#9aff6a', 160, 0.4, 0, 3); }
    if (b.t > 1.5) { b.st = 'walk'; b.t = 0; b.thrown = false; } }
  else if (b.st === 'stun') { if (b.t > 3.4) { b.st = 'walk'; b.t = 0; } }
  else if (b.st === 'rise') { b.st = 'walk'; b.t = 0; b.y = gy; }
}
function drawCogs() {
  for (const c of L.cogs) { if (c.x + c.r < cam.x || c.x - c.r > cam.x + VW) continue; const n = Math.max(8, Math.round(c.r / 14)), a0 = time * 0.4 * (c.r > 3 * T ? 0.6 : 1) * ((c.x / T | 0) % 2 ? 1 : -1);
    const gi = xi('engranaje-lava');
    if (okI(gi)) { ctx.save(); ctx.translate(c.x, c.y);
      ctx.globalCompositeOperation = 'lighter'; const pu = 0.6 + 0.4 * Math.sin(time * 2 + c.x * 0.01), gg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r * 0.7); gg.addColorStop(0, 'rgba(255,120,30,' + 0.28 * pu + ')'); gg.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, c.r * 0.7, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(a0); ctx.drawImage(gi, -c.r, -c.r, c.r * 2, c.r * 2); ctx.restore(); continue; }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a0); ctx.fillStyle = '#2a1424'; ctx.strokeStyle = 'rgba(255,120,40,.5)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 6.283, rr = i % 2 ? c.r : c.r * 0.86, a2 = (i + 1) / (n * 2) * 6.283; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#160812'; ctx.beginPath(); ctx.arc(0, 0, c.r * 0.55, 0, 6.283); ctx.fill(); ctx.fillStyle = '#3a1c2c';
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * 1.5708); ctx.fillRect(-c.r * 0.08, 0, c.r * 0.16, c.r * 0.6); ctx.restore(); } ctx.beginPath(); ctx.arc(0, 0, c.r * 0.16, 0, 6.283); ctx.fillStyle = '#ff7a24'; ctx.fill(); ctx.restore(); }
}
function drawStageBack() {          // por detrás de los personajes
  drawLavaPits(); drawGeysers(); drawExtras(); if (L.theme === 'jungle') drawJungleWorld();
  if (CHEAT.floor) {                 // puentes láser sobre los huecos
    CHEAT.floorT += 1 / 60; const gy = (L.H - 2) * T, x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1);
    const hole = x => !isSolid(L.g[L.H - 2][x]) && L.g[L.H - 2][x] !== '=' && !isSolid(L.g[L.H - 1][x]);
    for (let x = x0; x <= x1; x++) { if (!hole(x)) continue; let e = x; while (e + 1 <= x1 && hole(e + 1)) e++;
      const a = x * T, b = (e + 1) * T, k = Math.min(1, CHEAT.floorT * 2.5), bb = a + (b - a) * k;
      ctx.globalCompositeOperation = 'lighter';
      const g2 = ctx.createLinearGradient(0, gy - 26, 0, gy + 14); g2.addColorStop(0, 'rgba(41,230,255,0)'); g2.addColorStop(0.65, 'rgba(41,230,255,' + (0.3 + 0.1 * Math.sin(time * 9)) + ')'); g2.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g2; ctx.fillRect(a, gy - 26, bb - a, 40);
      ctx.fillStyle = 'rgba(41,200,255,.55)'; ctx.fillRect(a, gy - 1, bb - a, 7); ctx.fillStyle = '#e8fdff'; ctx.fillRect(a, gy + 1, bb - a, 2);
      ctx.strokeStyle = 'rgba(160,245,255,.7)'; ctx.lineWidth = 1.5; const off = (time * 90) % 24; ctx.beginPath(); for (let xx = a - 24 + off; xx < bb; xx += 24) { if (xx < a) continue; ctx.moveTo(xx, gy + 6); ctx.lineTo(xx + 6, gy - 1); } ctx.stroke();
      for (const ex of [a, bb]) { const g3 = ctx.createRadialGradient(ex, gy + 2, 0, ex, gy + 2, 18); g3.addColorStop(0, 'rgba(255,255,255,.9)'); g3.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g3; ctx.fillRect(ex - 18, gy - 16, 36, 36); }
      ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.25) parts.push({ x: a + Math.random() * (bb - a), y: gy, vx: 0, vy: -30 - Math.random() * 40, life: 0.5, max: 0.5, col: '#bff6ff', size: 1.6, grav: 0 });
      x = e; }
  }
  for (const st of L.strips) { if (st.x1 < cam.x - 20 || st.x0 > cam.x + VW + 20) continue;      // cintas turbo
    ctx.fillStyle = '#0b1230'; ctx.fillRect(st.x0, st.y - 1, st.x1 - st.x0, 9);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(41,230,255,.28)'; ctx.fillRect(st.x0, st.y - 14, st.x1 - st.x0, 14);
    ctx.strokeStyle = '#7ff3ff'; ctx.lineWidth = 3; const off = (time * 150) % 28;
    for (let x = st.x0 + off - 28; x < st.x1 - 10; x += 28) { if (x < st.x0 + 2) continue; ctx.beginPath(); ctx.moveTo(x, st.y); ctx.lineTo(x + 7, st.y + 4); ctx.lineTo(x, st.y + 8); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; }
  for (const lf of L.lifts) { if (lf.x1 < cam.x - 20 || lf.x0 > cam.x + VW + 20 || lf.y1 < cam.y - 20 || lf.y0 > cam.y + VHv + 20) continue;     // ascensores antigravedad
    const w = lf.x1 - lf.x0, h = lf.y1 - lf.y0, LC = L.theme === 'lava' ? ['255,140,40', '#ffb060'] : L.theme === 'ice' ? ['200,245,255', '#e8fbff'] : ['41,230,255', '#bff8ff']; ctx.globalCompositeOperation = 'lighter';
    const g2 = ctx.createLinearGradient(lf.x0, 0, lf.x1, 0); g2.addColorStop(0, 'rgba(' + LC[0] + ',0)'); g2.addColorStop(0.5, 'rgba(' + LC[0] + ',' + (0.16 + 0.05 * Math.sin(time * 5)) + ')'); g2.addColorStop(1, 'rgba(' + LC[0] + ',0)'); ctx.fillStyle = g2; ctx.fillRect(lf.x0, lf.y0, w, h);
    ctx.strokeStyle = 'rgba(' + LC[0] + ',.55)'; ctx.lineWidth = 3; const off = (time * 140) % 44;
    for (let y = lf.y1 - off; y > lf.y0 + 6; y -= 44) { ctx.globalAlpha = Math.min(1, (y - lf.y0) / 120) * 0.8; ctx.beginPath(); ctx.moveTo(lf.x0 + w * 0.3, y); ctx.lineTo(lf.x0 + w / 2, y - 12); ctx.lineTo(lf.x0 + w * 0.7, y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = LC[1]; ctx.fillRect(lf.x0 + 4, lf.y1 - 4, w - 8, 4); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.4) parts.push({ x: lf.x0 + Math.random() * w, y: lf.y1 - Math.random() * h, vx: 0, vy: -90 - Math.random() * 90, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? LC[1] : '#fff', size: 1.8, grav: 0 }); }
  const PI = iceI('plataforma-hielo') || selI('plataforma-selva') || IMG.plataforma, PFX = PI === IMG.plataforma ? [0.165, 0.835] : [0.31, 0.69];
  for (const m of L.movers) { const w = m.w + 10, x = m.x - 5, y = m.y - 2, h = PI && PI.naturalWidth ? w * PI.naturalHeight / PI.naturalWidth : 14;
    ctx.globalCompositeOperation = 'lighter'; for (const fx of PFX) { const g2 = ctx.createRadialGradient(x + w * fx, y + h, 0, x + w * fx, y + h, w * 0.16); g2.addColorStop(0, 'rgba(255,190,60,.5)'); g2.addColorStop(1, 'rgba(255,190,60,0)'); ctx.fillStyle = g2; ctx.fillRect(x + w * fx - w * 0.16, y + h - 4, w * 0.32, w * 0.18); } ctx.globalCompositeOperation = 'source-over';
    if ((L.theme === 'jungle' && m.fall && L.planks) || m.plank) { if (m.st === 3) continue; const jx = m.st === 1 ? Math.sin(time * 50) * 2 : 0; for (let xx = x + 4; xx < x + w - 4; xx += 16) { ctx.fillStyle = m.st === 1 ? '#a86a32' : '#7a4a22'; ctx.fillRect(xx + jx, y + 2, 14, 12); ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.5; ctx.strokeRect(xx + jx, y + 2, 14, 12); } continue; }
    if (L.theme === 'jungle' && m.fall) { drawLily(m, x, y, w); continue; }
    if (m.raft) { ctx.fillStyle = '#6a4220'; for (let k = 0; k < Math.round(w / 18); k++) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + k * 18, y, 17, 20, 8) : ctx.rect(x + k * 18, y, 17, 20); ctx.fill(); ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + w, y + 6); ctx.moveTo(x, y + 14); ctx.lineTo(x + w, y + 14); ctx.stroke(); for (let k = 0; k < 2; k++) parts.push({ x: x + Math.random() * w, y: y + 22, vx: -40 - Math.random() * 40, vy: -20, life: 0.4, max: 0.4, col: '#c8fff0', size: 2, grav: 200 }); continue; }
    if (L.theme === 'lava' || m.fall) { drawRock(m, x, y, w); continue; }
    if (PI && PI.naturalWidth) ctx.drawImage(PI, x, y, w, h); else { ctx.fillStyle = '#2c386e'; ctx.fillRect(x, y, w, 14); } }
  for (const pd of L.pads) if (pd.crystal) { const k = Math.max(0, 1 - pd.t * 5), cx = pd.x + pd.w / 2, y = pd.y, sq = 1 - k * 0.3;      // cristal saltarín
    ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(cx, y - 18, 2, cx, y - 18, 44); gg.addColorStop(0, 'rgba(230,120,255,' + (0.35 + 0.15 * Math.sin(time * 6) + k * 0.4) + ')'); gg.addColorStop(1, 'rgba(198,60,255,0)'); ctx.fillStyle = gg; ctx.fillRect(cx - 44, y - 62, 88, 70); ctx.globalCompositeOperation = 'source-over';
    { const ci = iceI('cristal-salto'); if (ci) { spr(ci, cx, y + 3, 50, 0.5, 1, false, 0, 1 + k * 0.12, sq); continue; } }
    for (const [dx, hh, w2] of [[-12, 24, 9], [12, 26, 9], [0, 38, 12]]) { const h2 = hh * sq; const cg = ctx.createLinearGradient(cx + dx - w2, 0, cx + dx + w2, 0); cg.addColorStop(0, '#7a2ad8'); cg.addColorStop(0.5, '#f0b8ff'); cg.addColorStop(1, '#a050ff'); ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx + dx - w2, y); ctx.lineTo(cx + dx - w2 * 0.8, y - h2 * 0.7); ctx.lineTo(cx + dx, y - h2); ctx.lineTo(cx + dx + w2 * 0.8, y - h2 * 0.7); ctx.lineTo(cx + dx + w2, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,230,255,.8)'; ctx.lineWidth = 1.2; ctx.stroke(); } }
  for (const pd of L.pads) if (pd.mush) drawMush(pd);
  for (const pd of L.pads) if (!pd.crystal && !pd.mush) { const k = Math.max(0, 1 - pd.t * 5), x = pd.x, y = pd.y - 9 + k * 6;
    ctx.fillStyle = '#10182e'; ctx.fillRect(x + 2, y, pd.w - 4, 10); ctx.fillStyle = '#3d4d7c'; ctx.fillRect(x + 2, y, pd.w - 4, 3);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const ph = (time * 1.6 + i / 3) % 1, yy = y - 4 - ph * 26; ctx.globalAlpha = (1 - ph) * 0.9; ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 12, yy + 6); ctx.lineTo(x + pd.w / 2, yy); ctx.lineTo(x + pd.w - 12, yy + 6); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(53,255,138,' + (0.45 + 0.25 * Math.sin(time * 8)) + ')'; ctx.fillRect(x + 6, y + 1, pd.w - 12, 3); ctx.globalCompositeOperation = 'source-over'; }
}
function drawStageFront() {         // por delante: láseres, muro, plasma
  for (const l of L.lasers) {
    if (l.lava) { if (l.x < cam.x - 60 || l.x > cam.x + VW + 60) continue; const on = laserOn(l), cyc = (time + l.ph) % (l.on + l.off), warn = !on && cyc > l.on + l.off - 0.6;
      ctx.fillStyle = '#2a1018'; ctx.fillRect(l.x - 22, l.y0 - 8, 44, 10); ctx.fillStyle = '#ff7a24'; ctx.fillRect(l.x - 22, l.y0, 44, 2);
      if (on) { const g2 = ctx.createLinearGradient(l.x - 20, 0, l.x + 20, 0); g2.addColorStop(0, '#a02008'); g2.addColorStop(0.3, '#ff7a1a'); g2.addColorStop(0.5, '#ffe080'); g2.addColorStop(0.7, '#ff7a1a'); g2.addColorStop(1, '#a02008'); ctx.fillStyle = g2;
        ctx.beginPath(); ctx.moveTo(l.x - 16, l.y0 + 2); for (let y = l.y0; y <= l.y1; y += 16) ctx.lineTo(l.x - 16 - Math.sin(y * 0.08 + time * 9) * 3, y); for (let y = l.y1; y >= l.y0; y -= 16) ctx.lineTo(l.x + 16 + Math.sin(y * 0.08 - time * 9) * 3, y); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(l.x - 60, 0, l.x + 60, 0); g3.addColorStop(0, 'rgba(255,100,20,0)'); g3.addColorStop(0.5, 'rgba(255,120,30,.3)'); g3.addColorStop(1, 'rgba(255,100,20,0)'); ctx.fillStyle = g3; ctx.fillRect(l.x - 60, l.y0, 120, l.y1 - l.y0); ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.5) parts.push({ x: l.x + (Math.random() - 0.5) * 30, y: l.y1 - 4, vx: (Math.random() - 0.5) * 140, vy: -80 - Math.random() * 120, life: 0.5, max: 0.5, col: '#ffb040', size: 2.5, grav: 900 }); }
      else if (warn) { for (let k = 0; k < 3; k++) { ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.arc(l.x + (k - 1) * 10, l.y0 + 6 + ((time * 120 + k * 20) % 40), 4, 0, 6.283); ctx.fill(); } }
      continue; }
    if (l.x < cam.x - 60 || l.x > cam.x + VW + 60) continue;
    const ph = laserPh(l), on = ph < l.on, warn = !on && ph > l.on + l.off - 0.45;
    if (okI(xi('obj-laser'))) { const li = IMG['obj-laser'], lw = 40, lh = lw * li.naturalHeight / li.naturalWidth; ctx.drawImage(li, l.x - lw / 2, l.y0 - 6, lw, lh);
      ctx.save(); ctx.translate(l.x, l.y1 + 6); ctx.scale(1, -1); ctx.drawImage(li, -lw / 2, 0, lw, lh); ctx.restore();
      if (!on && !warn) { ctx.fillStyle = 'rgba(20,10,20,.55)'; ctx.beginPath(); ctx.arc(l.x, l.y0 - 6 + lh * 0.9, lw * 0.2, 0, 6.283); ctx.arc(l.x, l.y1 + 6 - lh * 0.9, lw * 0.2, 0, 6.283); ctx.fill(); } }
    else { ctx.fillStyle = '#1a2038'; ctx.fillRect(l.x - 11, l.y0 - 2, 22, 9); ctx.fillRect(l.x - 11, l.y1 - 7, 22, 9);
    ctx.fillStyle = on || warn ? '#ff4a5a' : '#5a2a34'; ctx.fillRect(l.x - 5, l.y0 + 4, 10, 4); ctx.fillRect(l.x - 5, l.y1 - 8, 10, 4); }
    ctx.globalCompositeOperation = 'lighter';
    if (on) { const w = 5 + Math.random() * 3; const g2 = ctx.createLinearGradient(l.x - 22, 0, l.x + 22, 0); g2.addColorStop(0, 'rgba(255,40,70,0)'); g2.addColorStop(0.5, 'rgba(255,40,70,.55)'); g2.addColorStop(1, 'rgba(255,40,70,0)'); ctx.fillStyle = g2; ctx.fillRect(l.x - 22, l.y0 + 6, 44, l.y1 - l.y0 - 12); ctx.fillStyle = '#ff5a7a'; ctx.fillRect(l.x - w / 2, l.y0 + 6, w, l.y1 - l.y0 - 12); ctx.fillStyle = '#fff'; ctx.fillRect(l.x - 1, l.y0 + 6, 2, l.y1 - l.y0 - 12); }
    else if (warn && Math.floor(time * 16) % 2) { ctx.fillStyle = 'rgba(255,90,110,.7)'; ctx.fillRect(l.x - 1, l.y0 + 6, 2, l.y1 - l.y0 - 12); }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const ic of L.icicles) { if (ic.st === 3 || ic.x < cam.x - 60 || ic.x > cam.x + VW + 60) continue;
    const L2 = ic.big ? 66 : 44, w2 = ic.big ? 15 : 10, jx = ic.st === 1 ? Math.sin(time * 70) * 2.5 : 0, x = ic.x + jx, y = ic.y;
    if (L.theme === 'jungle') { drawPod(ic, x, y, L2); continue; }
    { const ci = iceI('carambano'); if (ci) { spr(ci, x, y - 4, L2 + 8, 0.5, 0); if (ic.st === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(160,240,255,.3)'; ctx.beginPath(); ctx.arc(x, y + L2 * 0.4, L2 * 0.6, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } continue; } }
    const g2 = ctx.createLinearGradient(x - w2, 0, x + w2, 0); g2.addColorStop(0, '#5fb8e8'); g2.addColorStop(0.45, '#f2fdff'); g2.addColorStop(1, '#8fd8ff'); ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(x - w2, y); ctx.lineTo(x + w2, y); ctx.lineTo(x + w2 * 0.35, y + L2 * 0.55); ctx.lineTo(x, y + L2); ctx.lineTo(x - w2 * 0.4, y + L2 * 0.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,90,150,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (ic.st === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(160,240,255,.35)'; ctx.beginPath(); ctx.arc(x, y + L2 * 0.4, L2 * 0.6, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
  for (const w of L.winds) { if (!w.k || w.x1 < cam.x || w.x0 > cam.x + VW) continue; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(230,250,255,' + (0.22 * w.k) + ')'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const yy = w.y0 + ((i * 97 + 13) % Math.max(1, w.y1 - w.y0)), sp = Math.sign(w.f), xx = w.x0 + (((time * 600 * sp + i * 173) % (w.x1 - w.x0)) + (w.x1 - w.x0)) % (w.x1 - w.x0); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - sp * (40 + 50 * w.k), yy + 3); ctx.stroke(); }
    if (Math.random() < w.k * 0.9) parts.push({ x: w.f > 0 ? Math.max(w.x0, cam.x) : Math.min(w.x1, cam.x + VW), y: w.y0 + Math.random() * (w.y1 - w.y0), vx: Math.sign(w.f) * (300 + Math.random() * 300), vy: 30 + Math.random() * 40, life: 1.6, max: 1.6, col: '#ffffff', size: 2 + Math.random() * 1.5, grav: 0 });
    ctx.globalCompositeOperation = 'source-over'; }
  for (const m of L.mets) {
    if (m.x < cam.x - 80 || m.x > cam.x + VW + 80) continue;
    const sp = Math.hypot(m.vx, m.vy), ux = m.vx / sp, uy = m.vy / sp, tl = m.r * 5;
    ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createLinearGradient(m.x, m.y, m.x - ux * tl, m.y - uy * tl); const cm = L.meteors && L.meteors.style === 'comet'; tg.addColorStop(0, cm ? 'rgba(170,240,255,.9)' : 'rgba(255,170,60,.85)'); tg.addColorStop(1, cm ? 'rgba(120,120,255,0)' : 'rgba(255,60,20,0)');
    ctx.strokeStyle = tg; ctx.lineCap = 'round'; ctx.lineWidth = m.r * 1.5; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - ux * tl, m.y - uy * tl); ctx.stroke();
    const gg = ctx.createRadialGradient(m.x, m.y, m.r * 0.4, m.x, m.y, m.r * 2.2); gg.addColorStop(0, cm ? 'rgba(150,230,255,.7)' : 'rgba(255,150,50,.6)'); gg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.2, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
    if (L.meteors && L.meteors.style === 'seed') { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(uy, ux) + 1.57); ctx.fillStyle = '#7a5a2a'; ctx.beginPath(); ctx.ellipse(0, 0, m.r * 0.6, m.r, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#b8ff5a'; ctx.beginPath(); ctx.ellipse(0, -m.r * 0.9, m.r * 0.5, m.r * 0.3, 0, 0, 6.283); ctx.fill(); ctx.restore(); continue; }
    { const mi = cm ? IMG['cometa-hielo'] : IMG.meteoro; if (okI(mi)) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(uy, ux) - 2.47); const hh = m.r * 3.4, ww = hh * mi.naturalWidth / mi.naturalHeight; ctx.drawImage(mi, -ww * 0.3, -hh * 0.78, ww, hh); ctx.restore(); continue; } }
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
    const rg = ctx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 1, 0, 0, m.r); if (cm) { rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.6, '#9fe8ff'); rg.addColorStop(1, '#3a6ab0'); } else { rg.addColorStop(0, '#a77d62'); rg.addColorStop(0.7, '#5d3f33'); rg.addColorStop(1, '#2e1d18'); } ctx.fillStyle = rg;
    ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = m.r * (0.82 + 0.18 * Math.sin(k * 2.7 + m.r)); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,18,14,.55)'; ctx.beginPath(); ctx.arc(m.r * 0.25, m.r * 0.1, m.r * 0.22, 0, 6.283); ctx.arc(-m.r * 0.3, m.r * 0.35, m.r * 0.15, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, m.r * 0.9, -0.3 + Math.atan2(uy, ux) - m.rot - 1, Math.atan2(uy, ux) - m.rot + 1); ctx.stroke();
    ctx.restore();
  }
  const ch = L.chase;
  if (ch && ch.on && ch.style === 'swarm') { const x = ch.x, top = cam.y - 20, hh = VHv + 40;          // enjambre de luciérnagas furiosas
    const g2 = ctx.createLinearGradient(x - 420, 0, x + 30, 0); g2.addColorStop(0, 'rgba(10,30,10,.95)'); g2.addColorStop(0.85, 'rgba(30,60,20,.8)'); g2.addColorStop(1, 'rgba(30,60,20,0)'); ctx.fillStyle = g2; ctx.fillRect(cam.x - 60, top, x + 30 - cam.x + 60, hh);
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 60; i++) { const yy = top + ((i * 61 + time * 40 * (i % 3 + 1)) % hh), xx = x - ((i * 37) % 300) + Math.sin(time * 9 + i) * 14, a = 0.5 + 0.5 * Math.sin(time * 12 + i); ctx.fillStyle = 'rgba(220,255,90,' + a + ')'; ctx.fillRect(xx, yy, 3, 3); } ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.3) noise(0.05, 0.04, 3000); }
  else if (ch && ch.on && ch.style === 'snow') { const x = ch.x, top = cam.y - 20, hh = VHv + 40;          // avalancha: muro de nieve con bolas rodando
    const g2 = ctx.createLinearGradient(x - 500, 0, x + 30, 0); g2.addColorStop(0, 'rgba(160,200,235,.98)'); g2.addColorStop(0.8, 'rgba(235,248,255,.97)'); g2.addColorStop(1, 'rgba(255,255,255,.0)'); ctx.fillStyle = g2; ctx.fillRect(cam.x - 60, top, x + 30 - cam.x + 60, hh);
    ctx.fillStyle = '#f4fbff'; for (let i = 0; i < 9; i++) { const yy = top + hh - ((i * 83) % hh), rr = 26 + (i * 17) % 30, xx = x - 10 + Math.sin(time * 6 + i) * 10; ctx.beginPath(); ctx.arc(xx, yy, rr, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = '#c8e2f5'; for (let i = 0; i < 6; i++) { const a2 = time * 8 + i, bx = x - 20 + (i % 3) * 8, by = (L.H - 2) * T - 24 - (i % 2) * 40; ctx.beginPath(); ctx.arc(bx + Math.cos(a2) * 4, by, 22, 0, 6.283); ctx.fill(); }
    for (let i = 0; i < 3; i++) parts.push({ x: x + Math.random() * 20, y: top + Math.random() * hh, vx: 120 + Math.random() * 200, vy: -60 + Math.random() * 60, life: 0.6, max: 0.6, col: '#ffffff', size: 2 + Math.random() * 3, grav: 300 });
    if (Math.random() < 0.2) shake = Math.max(shake, 0.06); }
  else if (ch && ch.on && ch.style === 'lava') { const x = ch.x, top = cam.y - 20, hh = VHv + 40;          // ola de lava que te persigue
    const g2 = ctx.createLinearGradient(x - 460, 0, x + 20, 0); g2.addColorStop(0, 'rgba(90,10,0,.98)'); g2.addColorStop(0.6, 'rgba(230,70,10,.97)'); g2.addColorStop(0.92, 'rgba(255,190,60,.97)'); g2.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(cam.x - 60, top); for (let y = top; y <= top + hh; y += 24) ctx.lineTo(x + Math.sin(y * 0.03 + time * 7) * 14, y); ctx.lineTo(cam.x - 60, top + hh); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(x, 0, x + 120, 0); g3.addColorStop(0, 'rgba(255,120,30,.55)'); g3.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g3; ctx.fillRect(x, top, 120, hh); ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) parts.push({ x: x + Math.random() * 20, y: top + Math.random() * hh, vx: 80 + Math.random() * 220, vy: -120 + Math.random() * 80, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#ffb040' : '#ff5a1a', size: 2.5 + Math.random() * 2, grav: 500 });
    if (Math.random() < 0.2) shake = Math.max(shake, 0.06); }
  else if (ch && ch.on) { const x = ch.x, top = cam.y - 20, hh = VHv + 40;
    const g2 = ctx.createLinearGradient(x - 420, 0, x, 0); g2.addColorStop(0, 'rgba(120,0,60,.96)'); g2.addColorStop(0.75, 'rgba(255,30,80,.85)'); g2.addColorStop(1, 'rgba(255,120,160,.95)'); ctx.fillStyle = g2; ctx.fillRect(cam.x - 60, top, x - cam.x + 60, hh);
    ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(x, 0, x + 90, 0); g3.addColorStop(0, 'rgba(255,60,110,.7)'); g3.addColorStop(1, 'rgba(255,60,110,0)'); ctx.fillStyle = g3; ctx.fillRect(x, top, 90, hh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); for (let y = top; y < top + hh; y += 18) { const xx = x + (Math.random() - 0.5) * 14; if (y === top) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); } ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.7) parts.push({ x: x + Math.random() * 20, y: top + Math.random() * hh, vx: 60 + Math.random() * 160, vy: (Math.random() - 0.5) * 80, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#ff5a8a' : '#ffd0e0', size: 2.5, grav: 0 }); }
  const rs = L.rise;
  if (rs && rs.on && rs.style === 'river') { const y = rs.y, x0 = cam.x - 20, ww = VW + 40; swampBand(x0, ww, y, 900); if (Math.random() < 0.5) parts.push({ x: x0 + Math.random() * ww, y: y + 4, vx: 0, vy: -60, life: 0.6, max: 0.6, col: '#c8ff9a', size: 2, grav: 0 }); }
  else if (rs && rs.on && rs.style === 'water') { const y = rs.y, x0 = cam.x - 20, ww = VW + 40;          // agua helada que sube
    const g2 = ctx.createLinearGradient(0, y, 0, y + 320); g2.addColorStop(0, 'rgba(220,250,255,.95)'); g2.addColorStop(0.08, 'rgba(90,190,240,.9)'); g2.addColorStop(1, 'rgba(10,50,120,.97)'); ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(x0, y + 900); for (let x = x0; x <= x0 + ww + 16; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.025 + time * 3) * 5 + Math.sin(x * 0.01 - time * 1.7) * 4); ctx.lineTo(x0 + ww + 16, y + 900); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,245,255,.5)'; for (let i = 0; i < 14; i++) { const xx = x0 + ((i * 131 + time * 30) % ww), yy = y + 14 + (i % 3) * 10; ctx.fillRect(xx, yy, 18, 3); } ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.6) parts.push({ x: x0 + Math.random() * ww, y: y + 6, vx: 0, vy: -40 - Math.random() * 60, life: 0.8, max: 0.8, col: Math.random() < 0.5 ? '#dff8ff' : '#9fe0ff', size: 2.2, grav: 0 }); }
  else if (rs && rs.on && rs.style === 'lava') { const y = rs.y, x0 = cam.x - 20, ww = VW + 40;          // magma que sube
    ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(0, y - 110, 0, y); g3.addColorStop(0, 'rgba(255,90,20,0)'); g3.addColorStop(1, 'rgba(255,110,30,.55)'); ctx.fillStyle = g3; ctx.fillRect(x0, y - 110, ww, 110); ctx.globalCompositeOperation = 'source-over';
    lavaBand(x0, ww, y, 900);
    if (Math.random() < 0.7) parts.push({ x: x0 + Math.random() * ww, y: y + 4, vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 160, life: 0.7, max: 0.7, col: Math.random() < 0.5 ? '#ffb040' : '#ff5a1a', size: 2.5, grav: 300 }); }
  else if (rs && rs.on) { const y = rs.y, x0 = cam.x - 20, ww = VW + 40;
    ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(0, y - 90, 0, y); g3.addColorStop(0, 'rgba(53,255,138,0)'); g3.addColorStop(1, 'rgba(53,255,138,.5)'); ctx.fillStyle = g3; ctx.fillRect(x0, y - 90, ww, 90); ctx.globalCompositeOperation = 'source-over';
    const g2 = ctx.createLinearGradient(0, y, 0, y + 300); g2.addColorStop(0, 'rgba(160,255,200,.97)'); g2.addColorStop(0.12, 'rgba(40,220,120,.94)'); g2.addColorStop(1, 'rgba(0,70,60,.97)'); ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(x0, y + 900); for (let x = x0; x <= x0 + ww + 16; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + time * 4) * 6 + Math.sin(x * 0.011 - time * 2.3) * 5); ctx.lineTo(x0 + ww + 16, y + 900); ctx.closePath(); ctx.fill();
    if (Math.random() < 0.6) parts.push({ x: x0 + Math.random() * ww, y: y + 4, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 120, life: 0.7, max: 0.7, col: Math.random() < 0.5 ? '#35ff8a' : '#d0ffe6', size: 2.5, grav: 0 }); }
}
// fases a oscuras: una capa negra con agujeros de luz en Lucas y en todo lo que brilla
let DK = null;
function drawDark() {
  const q = 3, w = Math.ceil(VW / q), h = Math.ceil(VHv / q);
  if (!DK) DK = document.createElement('canvas'); if (DK.width !== w || DK.height !== h) { DK.width = w; DK.height = h; }
  const d = DK.getContext('2d'); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h); d.fillStyle = 'rgba(2,3,14,.95)'; d.fillRect(0, 0, w, h); d.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a = 1) => { const sx = (x - cam.x) / q, sy = (y - cam.y) / q, rr = r / q; if (sx < -rr || sx > w + rr || sy < -rr || sy > h + rr) return; const g2 = d.createRadialGradient(sx, sy, rr * 0.15, sx, sy, rr); g2.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g2.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g2; d.fillRect(sx - rr, sy - rr, rr * 2, rr * 2); };
  const p = P; light(p.x + p.w / 2, p.y + p.h / 2, (p.tStar > 0 ? 340 : 235) + Math.min(6, p.flies || 0) * 40 + Math.sin(time * 7) * 5); light(p.x + p.w / 2, p.y + p.h, 120, 0.8);
  for (const cp of L.cps) light(cp.x, cp.y - 60, cp.on ? 150 : 70, cp.on ? 0.9 : 0.55);
  for (const c of L.crys) if (!L.crystalLight || c.lit) light(c.x, c.y - 30 * c.h, (L.crystalLight ? 260 : 150) * c.h, 0.9); else light(c.x, c.y - 30 * c.h, 45, 0.5);
  for (const k of L.keys) if (!k.got) light(k.x, k.y, 90, 0.8); for (const j of L.jumpers) if (j.up) light(j.x, j.y, 110, 0.9);
  for (const ic of L.icicles) if (ic.st < 3) light(ic.x, ic.y + 20, 40, 0.45);
  if (L.theme === 'jungle') { for (const e of enemies) if (e.type === 'dron' && !e.dead) { const eh = e.d.h * SELN.dron[2]; light(e.x + e.w / 2 + (e.dir < 0 ? 1 : -1) * eh * 0.165, e.y + e.h + 2 - eh * 0.29, 110, 0.8); } for (const f of L.flyb) light(f.x, f.y, f.got ? 150 : 90, 0.95); for (const f of L.amb) light(f.x, f.y, 34, 0.5); for (const pd of L.pads) if (pd.mush) light(pd.x + pd.w / 2, pd.y, 130, 0.8); for (const s2 of L.spores) light(s2.x, s2.y - 20, s2.on ? 140 : 50, 0.7); }
  if (L.theme === 'lava') { for (const gz of L.geysers) light(gz.x, gz.y - (gz.on ? gz.h / 2 : 10), gz.on ? gz.h * 0.8 : 50, gz.on ? 0.9 : 0.5);
    if (!L.vert && !L.noLava) for (let x = Math.floor(cam.x / T); x < (cam.x + VW) / T + 1; x += 2) if (x >= 0 && x < L.W && !isWallT(L.g[L.H - 1][x])) light(x * T + T / 2, (L.H - 1) * T, 120, 0.7);
    if (L.rise && L.rise.on) for (let x = cam.x; x < cam.x + VW + 100; x += 160) light(x, L.rise.y, 220, 0.9); }
  for (const pd of L.pads) if (pd.crystal) light(pd.x + 24, pd.y - 20, 90, 0.8);
  for (const po of L.portals) light(po.x, po.y, 135, 0.9);
  light(L.goal.x, L.goal.y - 130, 230);
  for (const l of L.lasers) if (laserOn(l)) for (let y = l.y0 + 20; y < l.y1; y += 44) light(l.x, y, 62, 0.75);
  for (const pd of L.pads) light(pd.x + pd.w / 2, pd.y - 16, 66, 0.8);
  for (const it of items) light(it.x + 20, it.y + 20, 80, 0.9);
  for (const s2 of shots) light(s2.x, s2.y, 60, 0.9);
  for (const e of enemies) if (!e.dead) light(e.x + e.w / 2, e.y + e.h * 0.4, 46, 0.5);
  for (const g3 of L.gears) if (!g3.got) light(g3.x, g3.y, 60, 0.7);
  for (const c of L.chips) if (!c.got) light(c.x, c.y, 26, 0.5);
  if (L.rain) light((L.rain.x0 + L.rain.x1) / 2, (L.H - 6) * T, 900);
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(L.H - 1, Math.floor((cam.y + VHv) / T));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (L.g[ty][tx] === '?') light(tx * T + 24, ty * T + 24, 70, 0.75);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(DK, 0, 0, w, h, 0, 0, w * q, h * q);
}

/* ---------- bucle ---------- */
function update(dt) {
  time += dt;
  if (state === 'map') mapUpdate(dt);
  if (state === 'warp') warpUpdate(dt);
  if (state === 'title' || state === 'map') { cam.x = (Math.sin(time * 0.07) * 0.5 + 0.5) * Math.max(0, L.W * T - VW); cam.y = L.H * T - VHv; }
  if (state === 'play') {
    G.clock += dt;
    if (!P.dead && !P.win && !CHEAT.time) {
      const before = G.tleft; G.tleft = Math.max(0, G.tleft - dt);
      if (before > 30 && G.tleft <= 30) { pop(P.x + P.w / 2, P.y - 30, '¡DATE PRISA!', '#ff5a6a'); [880, 660, 880, 660, 880].forEach((f, i) => tone(f, f, 0.12, 'square', 0.1, i * 0.13)); }
      if (G.tleft <= 10 && G.tleft > 0 && Math.ceil(before) !== Math.ceil(G.tleft)) tone(1245, 1245, 0.08, 'square', 0.1);
      if (G.tleft <= 0) { pop(P.x + P.w / 2, P.y - 30, '¡SE ACABÓ EL TIEMPO!', '#ff5a6a'); die(); }
    }
    for (const m of L.movers) { if (m.raft) { const go = m.go; const nx = go ? Math.min(m.x + m.v * dt, L.W * T - m.w - 2 * T) : m.x; m.dx = nx - m.x; m.dy = 0; m.x = nx; continue; }
      if (m.fall) { const oy = m.y;
        if (m.st === 1) { m.ft += dt; if (m.ft > 0.5) { m.st = 2; m.vy = 0; noise(0.25, 0.08, 120); } }
        else if (m.st === 2) { m.vy = Math.min(m.vy + 1700 * dt, 900); m.y += m.vy * dt; if (m.y > L.H * T + 300) { m.st = 3; m.ft = 0; } }
        else if (m.st === 3) { m.ft += dt; if (m.ft > 3) { m.st = 0; m.y = m.by; m.vy = 0; } }
        m.dx = 0; m.dy = m.y - oy; continue; }
      const k = Math.sin(time * m.sp + m.ph), nx = m.bx + k * m.ax, ny = m.by + k * m.ay; m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny; }
    updatePlayer(dt);
    if (state !== 'play') return;
    updateEnemies(dt);
    updateStage(dt);
    if (L.boss) bossUpdate(dt);
    for (const it of items) { it.t += dt; if (it.mat > 0) { it.mat -= dt; for (let k = 0; k < 3; k++) { const aa = Math.random() * 6.283, d = 60 + Math.random() * 50; parts.push({ x: it.x + 20 + Math.cos(aa) * d, y: it.y + 20 + Math.sin(aa) * d, vx: -Math.cos(aa) * d * 2.2, vy: -Math.sin(aa) * d * 2.2, life: 0.45, max: 0.45, col: Math.random() < 0.5 ? '#7fe9ff' : '#ffffff', size: 2.5, grav: 0 }); } continue; } if (it.stay) continue; if (it.rise < 1) { it.rise = Math.min(1, it.rise + dt * 2.5); it.y -= 46 * dt * 2.5; }
      else if (it.t > 0.8 && !P.dead) { const dx = P.x + P.w / 2 - (it.x + 20), dy = P.y + P.h / 2 - (it.y + 20), d = Math.hypot(dx, dy) || 1, v = Math.min(760, 220 + (it.t - 0.8) * 1100); it.x += dx / d * v * dt; it.y += dy / d * v * dt; } }
    const p = P;
    const tx = p.x + p.w / 2 - VW * 0.4 + p.face * 50, ty = p.y + p.h - VHv * (L.vert ? 0.62 : 0.7);
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    cam.x = Math.max(0, Math.min(L.W * T - VW, cam.x)); if (L.auto) cam.x = L.auto.x;
    if (L.boss && L.boss.fight) { const a = L.arena, lo = a.x0 - 2 * T, hi = a.x1 + 2 * T - VW; cam.x = hi < lo ? (a.x0 + a.x1) / 2 - VW / 2 : Math.max(lo, Math.min(hi, cam.x)); }
    cam.y = Math.max(Math.min(0, L.H * T - VHv), Math.min(L.H * T - VHv, cam.y));
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
// cielo del planeta de cristal: aurora boreal, planeta anillado, montañas de hielo y nieve que cae
const MTN = [0, 1].map(l => { const pts = []; let seed = 11 + l * 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; for (let x = 0; x <= 3000; x += 70 + rnd() * 90) pts.push([x, 0.25 + rnd() * 0.6]); return pts; });
const FLAKES = []; for (let i = 0; i < 110; i++) FLAKES.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.8, v: 18 + Math.random() * 40, ph: Math.random() * 6 });
function drawCaveBg() {              // interior de la cueva: roca oscura, estalactitas al fondo y destellos de cristal
  const g = ctx.createLinearGradient(0, 0, 0, VHv); g.addColorStop(0, '#060818'); g.addColorStop(0.5, '#0c1634'); g.addColorStop(1, '#14264a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
  for (const [par, col, sz] of [[0.1, '#0f1d3d', 1], [0.25, '#0a1530', 1.4]]) { const off = cam.x * par; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); for (let x = -((off) % 90) - 90; x < VW + 90; x += 45) { const i = Math.floor((x + off) / 45), h = (30 + ((i * 53) % 70)) * sz; ctx.lineTo(x, 0); ctx.lineTo(x + 22, h); ctx.lineTo(x + 45, 0); } ctx.lineTo(VW, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, VHv); for (let x = -((off) % 120) - 120; x < VW + 120; x += 60) { const i = Math.floor((x + off) / 60), h = (40 + ((i * 37) % 90)) * sz; ctx.lineTo(x, VHv); ctx.lineTo(x + 30, VHv - h); ctx.lineTo(x + 60, VHv); } ctx.lineTo(VW, VHv); ctx.closePath(); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const s2 of STARS) { if (s2.l !== 3) continue; const px = ((s2.x * 1400 - cam.x * 0.12) % 1400 + 1400) % 1400; if (px > VW) continue; const a = Math.max(0, Math.sin(time * 2 + s2.tw * 3)); ctx.fillStyle = 'rgba(140,230,255,' + a * 0.7 + ')'; ctx.fillRect(px, s2.y * VHv, 2, 2); }
  ctx.globalCompositeOperation = 'source-over';
}
function iceBg(up) { const A = iceI('fondo-lejos-hielo'), B2 = iceI('fondo-cerca-hielo'); if (!A || !B2) return false;
  bgLayer(A, Math.max(220, VHv * 0.46), VHv * 0.84 + up, 0.06); ctx.fillStyle = 'rgba(14,33,80,.22)'; ctx.fillRect(0, 0, VW, VHv);
  if (!L.sky) bgLayer(B2, Math.max(230, VHv * 0.44), VHv + 18 + up * 2, 0.18); return true; }
function drawIceBg() {
  if (L.cave) { drawCaveBg(); return; }
  const g = ctx.createLinearGradient(0, 0, 0, VHv); g.addColorStop(0, '#040824'); g.addColorStop(0.55, '#0e2150'); g.addColorStop(1, '#2b5a8f'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
  for (const s2 of STARS) { const px = ((s2.x * 1400 - cam.x * 0.03 * s2.l) % 1400 + 1400) % 1400; if (px > VW || s2.y > 0.6) continue; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 1.5 + s2.tw); ctx.fillStyle = '#fff'; ctx.fillRect(px, s2.y * VHv, s2.s, s2.s); } ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';          // aurora
  for (let b = 0; b < 3; b++) { const base = VHv * (0.12 + b * 0.07), col = ['53,255,160', '120,255,220', '255,90,200'][b];
    for (let x = -10; x < VW + 10; x += 8) { const wx = x + cam.x * 0.02, y = base + Math.sin(wx * 0.0045 + time * 0.35 + b * 2) * 34 + Math.sin(wx * 0.011 - time * 0.6 + b) * 12, a = (0.08 + 0.06 * Math.sin(wx * 0.02 + time * 1.3 + b)) * (b === 2 ? 0.7 : 1);
      const gg = ctx.createLinearGradient(0, y - 70, 0, y + 30); gg.addColorStop(0, 'rgba(' + col + ',0)'); gg.addColorStop(0.75, 'rgba(' + col + ',' + a + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gg; ctx.fillRect(x, y - 70, 9, 100); } }
  ctx.globalCompositeOperation = 'source-over';
  { const px = VW * 0.8 - cam.x * 0.015, py = VHv * 0.2, r = 46;           // planeta anillado
    ctx.strokeStyle = 'rgba(180,220,255,.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(px, py, r * 2, r * 0.42, -0.35, Math.PI, 2 * Math.PI); ctx.stroke();
    const pg = ctx.createRadialGradient(px - 14, py - 16, 4, px, py, r); pg.addColorStop(0, '#e6f4ff'); pg.addColorStop(0.6, '#7fa8d8'); pg.addColorStop(1, '#2c4a80'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(180,220,255,.6)'; ctx.beginPath(); ctx.ellipse(px, py, r * 2, r * 0.42, -0.35, 0, Math.PI); ctx.stroke(); }
  if (L.sky) { const up2 = (L.H * T - VHv - cam.y) * 0.1; for (let l = 0; l < 3; l++) { const by = VHv * (0.72 + l * 0.1) + up2 * (l + 1), off = cam.x * (0.05 + l * 0.08); ctx.fillStyle = ['rgba(150,190,240,.55)', 'rgba(190,220,250,.7)', 'rgba(235,245,255,.85)'][l];
    ctx.beginPath(); ctx.moveTo(0, VHv); for (let x = -((off) % 160) - 160; x < VW + 160; x += 80) ctx.arc(x + 40, by + Math.sin((x + off) * 0.01 + l) * 8, 52 + l * 6, Math.PI, 0); ctx.lineTo(VW, VHv); ctx.closePath(); ctx.fill(); ctx.fillRect(0, by + 10, VW, VHv); } return; }
  const up = (L.H * T - VHv - cam.y) * 0.1;
  if (!iceBg(up)) [[0.06, VHv * 0.66, VHv * 0.36, ['#2f5288', '#8fbbe6'], 0], [0.16, VHv * 0.82, VHv * 0.3, ['#22406f', '#bfe0fb'], 1]].forEach(([par, base, hh, cols, l]) => {
    const off = cam.x * par; ctx.beginPath(); ctx.moveTo(0, VHv); const pts = MTN[l];
    for (let rep2 = 0; rep2 < 3; rep2++) for (const [mx, mh] of pts) { const x = mx + rep2 * 3000 - (off % 3000); if (x < -200 || x > VW + 200) continue; ctx.lineTo(x, base + up * (l + 1) - mh * hh); }
    ctx.lineTo(VW, VHv); ctx.closePath(); const mg = ctx.createLinearGradient(0, base - hh, 0, VHv); mg.addColorStop(0, cols[1]); mg.addColorStop(0.3, cols[0]); mg.addColorStop(1, '#101f3e'); ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = 'rgba(230,248,255,.5)'; ctx.lineWidth = 2; ctx.stroke(); });
  const fg = ctx.createLinearGradient(0, VHv * 0.6, 0, VHv); fg.addColorStop(0, 'rgba(160,220,255,0)'); fg.addColorStop(1, 'rgba(170,225,255,.25)'); ctx.fillStyle = fg; ctx.fillRect(0, VHv * 0.6, VW, VHv * 0.4);
}
function drawWater() {                // bajo el hielo: agua azul, rayos de luz, cáusticas y burbujas
  const sy = L.water.y - cam.y; if (sy > VHv) return; const top = Math.max(0, sy);
  ctx.save(); ctx.setTransform(SC, 0, 0, SC, 0, 0);
  const g = ctx.createLinearGradient(0, top, 0, VHv); g.addColorStop(0, 'rgba(40,160,230,.26)'); g.addColorStop(1, 'rgba(4,30,90,.5)'); ctx.fillStyle = g; ctx.fillRect(0, top, VW, VHv - top);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const x = ((i * 260 - cam.x * 0.3 + time * 18) % (VW + 400) + VW + 400) % (VW + 400) - 200, w = 60 + (i % 3) * 30, a = 0.05 + 0.03 * Math.sin(time * 0.8 + i);
    const rg = ctx.createLinearGradient(0, top, 0, VHv); rg.addColorStop(0, 'rgba(200,250,255,' + a + ')'); rg.addColorStop(1, 'rgba(200,250,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w + 160, VHv); ctx.lineTo(x + 120, VHv); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = 'rgba(190,245,255,.07)'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) { ctx.beginPath(); for (let x = 0; x <= VW; x += 20) { const y = top + 40 + r * 70 + Math.sin(x * 0.02 + time * 1.4 + r) * 8 + Math.sin(x * 0.007 - time + r * 2) * 10; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  if (sy > -10) { ctx.strokeStyle = 'rgba(230,252,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= VW; x += 12) { const y = sy + Math.sin(x * 0.04 + time * 3) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.restore();
  if (Math.random() < 0.5) parts.push({ x: cam.x + Math.random() * VW, y: cam.y + VHv + 10, vx: (Math.random() - 0.5) * 10, vy: -40 - Math.random() * 50, life: 6, max: 6, col: 'rgba(210,245,255,.55)', size: 1 + Math.random() * 3, grav: 0 });
}
function drawSnow() {               // copos por delante de todo, en pantalla
  if (L.theme !== 'ice' || L.water || L.cave) return; const storm = L.winds.length ? Math.max(0, ...L.winds.map(w => w.k || 0)) : 0, dir = L.winds.length ? Math.sign(L.winds[0].f) : 0;
  ctx.fillStyle = '#fff';
  for (const f of FLAKES) { f.y += f.v * 0.0003 * (1 + storm); f.x += (Math.sin(time + f.ph) * 0.0002) + dir * storm * 0.004; if (f.y > 1) { f.y = 0; f.x = Math.random(); } f.x = (f.x + 1) % 1;
    ctx.globalAlpha = 0.5 + 0.4 * f.s / 2.4; ctx.beginPath(); ctx.arc(f.x * VW, f.y * VHv, f.s, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (storm > 0.05) { ctx.fillStyle = 'rgba(225,240,255,' + storm * 0.22 + ')'; ctx.fillRect(0, 0, VW, VHv); }
}
function drawLavaBg() {              // planeta volcánico: cielo rojizo, volcanes a lo lejos y brasas que suben
  if (L.cave) { drawCaveBg(); ctx.fillStyle = 'rgba(140,30,10,.22)'; ctx.fillRect(0, 0, VW, VHv); const gl = ctx.createLinearGradient(0, VHv * 0.6, 0, VHv); gl.addColorStop(0, 'rgba(255,80,20,0)'); gl.addColorStop(1, 'rgba(255,80,20,.18)'); ctx.fillStyle = gl; ctx.fillRect(0, VHv * 0.6, VW, VHv * 0.4); return; }
  const g = ctx.createLinearGradient(0, 0, 0, VHv); g.addColorStop(0, '#0e0418'); g.addColorStop(0.45, '#2e0b26'); g.addColorStop(0.8, '#6a1c1a'); g.addColorStop(1, '#a8361a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VHv);
  for (const s2 of STARS) { const px = ((s2.x * 1400 - cam.x * 0.03 * s2.l) % 1400 + 1400) % 1400; if (px > VW || s2.y > 0.55) continue; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + s2.tw); ctx.fillStyle = '#ffe8d0'; ctx.fillRect(px, s2.y * VHv, s2.s, s2.s); } ctx.globalAlpha = 1;
  { const px = VW * 0.78 - cam.x * 0.012, py = VHv * 0.18, r = 38, pg = ctx.createRadialGradient(px - 12, py - 12, 3, px, py, r); pg.addColorStop(0, '#f4e0ff'); pg.addColorStop(0.6, '#9a7ab8'); pg.addColorStop(1, '#3a2458'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill();
    const p2 = VW * 0.2 - cam.x * 0.008; ctx.fillStyle = '#5a3a6a'; ctx.beginPath(); ctx.arc(p2, VHv * 0.12, 18, 0, 6.283); ctx.fill(); }
  const up = (L.H * T - VHv - cam.y) * 0.1, FA = lavaI('fondo-lejos-lava'), FB = lavaI('fondo-cerca-lava');
  if (FA && FB) { bgLayer(FA, Math.max(220, VHv * 0.48), VHv * 0.84 + up, 0.06); ctx.fillStyle = 'rgba(40,8,30,.25)'; ctx.fillRect(0, 0, VW, VHv); if (!L.sky) bgLayer(FB, Math.max(230, VHv * 0.42), VHv + 16 + up * 2, 0.18); }
  else [[0.05, VHv * 0.62, VHv * 0.34, '#3a1430', 0], [0.14, VHv * 0.8, VHv * 0.3, '#22091c', 1]].forEach(([par, base, hh, col, l]) => {
    const off = cam.x * par; ctx.beginPath(); ctx.moveTo(0, VHv); const pts = MTN[l];
    for (let rep2 = 0; rep2 < 3; rep2++) for (const [mx, mh] of pts) { const x = mx + rep2 * 3000 - (off % 3000); if (x < -200 || x > VW + 200) continue; ctx.lineTo(x, base + up * (l + 1) - mh * hh); }
    ctx.lineTo(VW, VHv); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = l ? 'rgba(255,110,40,.35)' : 'rgba(255,90,60,.2)'; ctx.lineWidth = 2; ctx.stroke();
    if (l === 0) { const vx = ((VW * 0.62 - off * 0.6) % (VW * 1.6) + VW * 1.6) % (VW * 1.6) - VW * 0.3, vy = base + up - hh * 0.95;          // volcán humeante
      ctx.fillStyle = '#2c0f24'; ctx.beginPath(); ctx.moveTo(vx - hh * 0.9, base + up + 40); ctx.lineTo(vx - hh * 0.12, vy); ctx.lineTo(vx + hh * 0.12, vy); ctx.lineTo(vx + hh * 0.9, base + up + 40); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; const cg = ctx.createRadialGradient(vx, vy, 2, vx, vy, hh * 0.4); cg.addColorStop(0, 'rgba(255,170,60,.8)'); cg.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = cg; ctx.fillRect(vx - hh * 0.4, vy - hh * 0.4, hh * 0.8, hh * 0.8);
      ctx.strokeStyle = 'rgba(255,120,30,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(vx - 4, vy); ctx.quadraticCurveTo(vx - hh * 0.2, vy + hh * 0.3, vx - hh * 0.35, vy + hh * 0.75); ctx.moveTo(vx + 5, vy); ctx.quadraticCurveTo(vx + hh * 0.15, vy + hh * 0.4, vx + hh * 0.3, vy + hh * 0.8); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(60,40,60,.35)'; for (let i = 0; i < 6; i++) { const ph = (time * 0.12 + i / 6) % 1; ctx.beginPath(); ctx.arc(vx + Math.sin(i * 2 + time * 0.3) * 20 + ph * 60, vy - ph * hh * 0.9, 14 + ph * 40, 0, 6.283); ctx.fill(); } }
  });
  const gl = ctx.createLinearGradient(0, VHv * 0.55, 0, VHv); gl.addColorStop(0, 'rgba(255,90,20,0)'); gl.addColorStop(1, 'rgba(255,90,20,.2)'); ctx.fillStyle = gl; ctx.fillRect(0, VHv * 0.55, VW, VHv * 0.45);
  ctx.globalCompositeOperation = 'lighter'; for (const f of FLAKES) { f.y -= f.v * 0.00025; f.x += Math.sin(time + f.ph) * 0.0003; if (f.y < 0) { f.y = 1; f.x = Math.random(); } ctx.globalAlpha = 0.3 + 0.4 * f.s / 2.4; ctx.fillStyle = f.s > 1.6 ? '#ffb040' : '#ff6a20'; ctx.fillRect(f.x * VW, f.y * VHv, f.s, f.s); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawBackground() {
  if (L.theme === 'ice') { drawIceBg(); return; }
  if (L.theme === 'lava') { drawLavaBg(); return; }
  if (L.theme === 'jungle') { drawJungleBg(); return; }
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
  if (L.space) {           // fase en el espacio abierto: un planeta enorme abajo y estrellas fugaces, sin ciudad
    const r = VHv * 1.05, ex = VW * 0.35 - cam.x * 0.015, ey = VHv * 1.62 + (L.H * T - VHv - cam.y) * 0.05;
    ctx.globalCompositeOperation = 'lighter'; const at = ctx.createRadialGradient(ex, ey, r * 0.95, ex, ey, r * 1.18); at.addColorStop(0, 'rgba(80,200,255,.55)'); at.addColorStop(1, 'rgba(80,200,255,0)'); ctx.fillStyle = at; ctx.beginPath(); ctx.arc(ex, ey, r * 1.18, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    const pg = ctx.createRadialGradient(ex - r * 0.3, ey - r * 0.6, r * 0.1, ex, ey, r); pg.addColorStop(0, '#5fd6ff'); pg.addColorStop(0.45, '#2a6fd6'); pg.addColorStop(0.85, '#14306e'); pg.addColorStop(1, '#0a1640'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ex, ey, r, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, r, 0, 6.283); ctx.clip(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
    for (let k = 0; k < 7; k++) { const yy = ey - r + 40 + k * 46, xx = ex - r + ((k * 173 + time * 6) % (r * 2)); ctx.beginPath(); ctx.ellipse(xx, yy, 120 + k * 14, 9, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(xx - r * 1.1, yy + 18, 90, 7, 0, 0, 6.283); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
    const sh = (time * 0.35) % 1, sx = VW * (1.1 - sh * 1.3), sy = VHv * (0.05 + sh * 0.35); if (sh < 0.5) { ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(sx, sy, sx + 140, sy - 50); sg.addColorStop(0, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = sg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 140, sy - 50); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    return;
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
  const G = iceI('suelo-hielo') || lavaI('suelo-lava') || selI('suelo-selva') || IMG.suelo, gOk = G && G.naturalWidth, gw = gOk ? G.naturalWidth / 8 : 0, gh = gOk ? G.naturalHeight / 2 : 0;
  // plataformas flotantes (una imagen por tramo)
  const PI = iceI('plataforma-hielo') || IMG.plataforma, PFX = PI === IMG.plataforma ? [0.165, 0.835] : [0.31, 0.69];
  for (const pl of L.plats) {
    if (pl.x1 < x0 - 1 || pl.x0 > x1 + 1) continue;
    const w = (pl.x1 - pl.x0 + 1) * T + 10, x = pl.x0 * T - 5, y = pl.ty * T - 2 + Math.sin(time * 2 + pl.x0) * 1.2;
    { const LP = lavaI('plataforma-lava') || selI('plataforma-selva'); if (LP && pl.x1 - pl.x0 < 7) { const h2 = w * LP.naturalHeight / LP.naturalWidth; ctx.drawImage(LP, x, pl.ty * T - h2 * 0.06, w, h2); continue; } }
    if (L.theme === 'jungle') { const yy = pl.ty * T;          // puente de tablas y cuerdas
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, yy - 18); ctx.quadraticCurveTo(x + w / 2, yy - 6, x + w, yy - 18); ctx.stroke();
      for (let xx = x + 2; xx < x + w - 4; xx += 16) { ctx.fillStyle = (xx / 16 | 0) % 2 ? '#8a5a2a' : '#7a4a22'; ctx.fillRect(xx, yy, 14, 12); ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.5; ctx.strokeRect(xx, yy, 14, 12); ctx.strokeStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(xx + 7, yy); ctx.lineTo(xx + 7, yy - 14); ctx.stroke(); }
      ctx.fillStyle = '#4ac84a'; for (let xx = x + 10; xx < x + w; xx += 37) { ctx.beginPath(); ctx.ellipse(xx, yy + 13, 7, 3, 0.4, 0, 6.283); ctx.fill(); } continue; }
    if (L.theme === 'lava') { const yy = pl.ty * T;          // pasarela de metal oxidado con remaches al rojo
      const g2 = ctx.createLinearGradient(0, yy, 0, yy + 20); g2.addColorStop(0, '#6a4a5a'); g2.addColorStop(0.25, '#3a2232'); g2.addColorStop(1, '#1a0c16'); ctx.fillStyle = g2; ctx.fillRect(x + 3, yy, w - 6, 18);
      ctx.fillStyle = '#ff8a30'; ctx.fillRect(x + 3, yy, w - 6, 2.5); ctx.strokeStyle = '#120408'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, yy, w - 6, 18);
      ctx.strokeStyle = 'rgba(20,6,14,.8)'; ctx.lineWidth = 2; ctx.beginPath(); for (let xx = x + 3; xx < x + w - 20; xx += 24) { ctx.moveTo(xx, yy + 18); ctx.lineTo(xx + 12, yy + 4); ctx.lineTo(xx + 24, yy + 18); } ctx.stroke();
      ctx.fillStyle = '#ffb060'; for (let xx = x + 10; xx < x + w - 6; xx += 24) { ctx.beginPath(); ctx.arc(xx, yy + 7, 1.8, 0, 6.283); ctx.fill(); }
      continue; }
    if (PI && PI.naturalWidth) {
      const h = w * PI.naturalHeight / PI.naturalWidth, a = 0.3 + 0.14 * Math.sin(time * 7 + pl.x0);
      ctx.globalCompositeOperation = 'lighter';
      for (const fx of PFX) { const g2 = ctx.createRadialGradient(x + w * fx, y + h, 0, x + w * fx, y + h, w * 0.13); g2.addColorStop(0, 'rgba(60,230,255,' + a + ')'); g2.addColorStop(1, 'rgba(60,230,255,0)'); ctx.fillStyle = g2; ctx.fillRect(x + w * fx - w * 0.13, y + h - 4, w * 0.26, w * 0.14); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(PI, x, y, w, h);
    } else { ctx.fillStyle = '#2c386e'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#35ff8a'; ctx.fillRect(x, y, w, 2.5); }
  }
  // suelo y bloques macizos
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const c = L.g[ty][tx]; if (c === '#' || (c === 'C' && !okI(xi('muro-roto')))) solidTile(tx, ty, G, gOk, gw, gh); if (c === 'C' && okI(IMG['muro-roto'])) { ctx.drawImage(IMG['muro-roto'], tx * T - 1, ty * T - 1, T + 2, T + 2); continue; } if (c === 'C') { const x = tx * T, y = ty * T; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y + 6); ctx.lineTo(x + 20, y + 20); ctx.lineTo(x + 14, y + 30); ctx.lineTo(x + 24, y + 42); ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + 34, y + 16); ctx.moveTo(x + 30, y + 30); ctx.lineTo(x + 40, y + 38); ctx.stroke(); } }
  if (L.theme === 'ice') iceDeco(x0, x1, y0, y1);
  else if (L.theme === 'lava' || L.theme === 'jungle') for (const c of L.crys) { if (c.x < cam.x - 80 || c.x > cam.x + VW + 80) continue; drawCrystal(c.x, c.y, c.c, c.h); }
  // cajas (de izquierda a derecha, para que cada una tape el lateral de la anterior)
  drawBoxes(x0, x1, y0, y1);
}
const isWallT = c => c === '#' || c === 'F' || c === 'C' || c === 'D';
function solidTile(tx, ty, G, gOk, gw, gh) {
    const x = tx * T, y = ty * T;
    let d = 0; while (d < 9 && ty - 1 - d >= 0 && isWallT(L.g[ty - 1 - d][tx])) d++;
    if (gOk && (G === IMG['suelo-hielo'] || G === IMG['suelo-lava'] || G === IMG['suelo-selva'])) { const sx = ((tx * 7 + ty * 3) % 6) * 256;
      if (d === 0) ctx.drawImage(G, sx, 0, 256, 347, x - 0.5, y - T * 0.336, T + 1, T * 1.336 + 0.5); else ctx.drawImage(G, sx, 347, 256, 256, x, y, T + 0.5, T + 0.5);
    } else if (gOk) {
      const sx = (tx % 8) * gw;
      if (d === 0) ctx.drawImage(G, sx, 0, gw, gh, x, y, T + 0.5, T + 0.5);
      else if (d % 2) ctx.drawImage(G, sx, gh, gw, gh, x, y, T + 0.5, T + 0.5);
      else { ctx.save(); ctx.translate(x, y + T); ctx.scale(1, -1); ctx.drawImage(G, sx, gh, gw, gh, 0, -0.5, T + 0.5, T + 0.5); ctx.restore(); }
    } else { ctx.fillStyle = '#263060'; ctx.fillRect(x, y, T + 0.5, T + 0.5); if (d === 0) { ctx.fillStyle = '#29e6ff'; ctx.fillRect(x, y, T + 0.5, 2.5); } }
    if (L.theme === 'ice' && G !== IMG['suelo-hielo']) { ctx.fillStyle = 'rgba(175,228,255,.3)'; ctx.fillRect(x, y, T + 0.5, T + 0.5); }
    else if (L.theme === 'lava' && G !== IMG['suelo-lava']) { ctx.fillStyle = 'rgba(70,12,28,.55)'; ctx.fillRect(x, y, T + 0.5, T + 0.5); if (d === 0) { ctx.fillStyle = '#ff7a24'; ctx.fillRect(x, y, T + 0.5, 3); ctx.fillStyle = 'rgba(255,160,60,.35)'; ctx.fillRect(x, y + 3, T + 0.5, 3); } }
    ctx.fillStyle = L.theme === 'ice' ? '#0c2a4a' : L.theme === 'lava' ? '#1a0610' : L.theme === 'jungle' ? '#04201a' : '#080b1c';
    if (tx > 0 && !isWallT(L.g[ty][tx - 1])) ctx.fillRect(x, y, 2.5, T + 0.5);
    if (tx < L.W - 1 && !isWallT(L.g[ty][tx + 1])) ctx.fillRect(x + T - 2.5, y, 2.5, T + 0.5);
    if (ty < L.H - 1 && !isWallT(L.g[ty + 1][tx])) ctx.fillRect(x, y + T - 2.5, T + 0.5, 2.5);
}
// pared falsa: se dibuja por delante de Lucas y se vuelve transparente cuando estás dentro
function drawFake() {
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(L.W - 1, Math.floor((cam.x + VW) / T) + 1), y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(L.H - 1, Math.floor((cam.y + VHv) / T));
  const G = iceI('suelo-hielo') || lavaI('suelo-lava') || selI('suelo-selva') || IMG.suelo, gOk = G && G.naturalWidth, gw = gOk ? G.naturalWidth / 8 : 0, gh = gOk ? G.naturalHeight / 2 : 0, pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (L.g[ty][tx] !== 'F') continue;
    const dd = Math.hypot(tx * T + T / 2 - pcx, ty * T + T / 2 - pcy), a = dd < 2.6 * T ? 0.28 + Math.max(0, dd - 1.4 * T) / (1.2 * T) * 0.72 : 1;
    ctx.globalAlpha = Math.min(1, a); solidTile(tx, ty, G, gOk, gw, gh); ctx.globalAlpha = 1; }
}
// detalles del mundo de hielo: nieve encima del suelo y de las plataformas, carámbanos pequeños debajo
function iceDeco(x0, x1, y0, y1) {
  ctx.fillStyle = '#f4fcff'; const gI = !!iceI('suelo-hielo');
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isWallT(L.g[ty][tx]) || (ty > 0 && isWallT(L.g[ty - 1][tx]))) continue;
    const x = tx * T, y = ty * T, sd = (tx * 37 + ty * 11) % 7;
    if (!gI) { ctx.beginPath(); ctx.moveTo(x - 1, y + 7); ctx.quadraticCurveTo(x + T * 0.25, y - 4 - sd * 0.4, x + T * 0.5, y + 1); ctx.quadraticCurveTo(x + T * 0.75, y - 5 + sd * 0.3, x + T + 1, y + 7); ctx.lineTo(x + T + 1, y + 9); ctx.lineTo(x - 1, y + 9); ctx.closePath(); ctx.fill(); }
    if (ty < L.H - 1 && !isWallT(L.g[ty + 1][tx]) && sd % 3 === 0) { ctx.fillStyle = 'rgba(200,240,255,.9)'; ctx.beginPath(); ctx.moveTo(x + 10, y + T); ctx.lineTo(x + 18, y + T); ctx.lineTo(x + 14, y + T + 12 + sd); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f4fcff'; }
  }
  if (!iceI('plataforma-hielo')) for (const pl of L.plats) { if (pl.x1 < x0 - 1 || pl.x0 > x1 + 1) continue; const x = pl.x0 * T - 2, w = (pl.x1 - pl.x0 + 1) * T + 4, y = pl.ty * T - 3 + Math.sin(time * 2 + pl.x0) * 1.2;
    ctx.beginPath(); ctx.moveTo(x, y + 5); for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(x + w * (i + 0.5) / 7, y - 3 - ((i * 7 + pl.x0) % 3), x + w * (i + 1) / 7, y + 2); ctx.lineTo(x + w, y + 6); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill(); }
  for (const c of L.crys) { if (c.x < cam.x - 80 || c.x > cam.x + VW + 80) continue; drawCrystal(c.x, c.y, c.c, c.h); }
}
function drawCrystal(x, y, c, h) {
  { const ci = c >= 4 ? selI('seta-' + (c - 4) % 3) : c < 3 ? iceI('cristal-' + (c % 3)) : lavaI('cristal-lava-' + (Math.floor(x / T) % 3)); if (ci) { const col = ['41,200,255', '198,90,255', '53,255,190', '255,80,40', '60,170,255', '255,80,210', '110,255,110'][c % 7], s2 = 30 * h; ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(x, y - s2, 2, x, y - s2, s2 * 1.6); gg.addColorStop(0, 'rgba(' + col + ',' + (0.28 + 0.12 * Math.sin(time * 2 + x)) + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gg; ctx.fillRect(x - s2 * 1.6, y - s2 * 2.6, s2 * 3.2, s2 * 3.2); ctx.globalCompositeOperation = 'source-over'; spr(ci, x, y + 3, 60 * h, 0.5, 1); return; } }
  const col = [['#1f8fd0', '#d8f8ff', '#5fd0ff', '41,200,255'], ['#7a2ad8', '#f0c8ff', '#b070ff', '198,90,255'], ['#1aa088', '#d0fff0', '#40e0b0', '53,255,190'], ['#a01828', '#ffd8c8', '#ff5a4a', '255,70,50']][c % 4], s2 = 30 * h;
  ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(x, y - s2, 2, x, y - s2, s2 * 1.6); gg.addColorStop(0, 'rgba(' + col[3] + ',' + (0.28 + 0.12 * Math.sin(time * 2 + x)) + ')'); gg.addColorStop(1, 'rgba(' + col[3] + ',0)'); ctx.fillStyle = gg; ctx.fillRect(x - s2 * 1.6, y - s2 * 2.6, s2 * 3.2, s2 * 3.2); ctx.globalCompositeOperation = 'source-over';
  for (const [dx, hh, ww, rr] of [[-10, 1.1, 7, -0.25], [11, 1.25, 7, 0.22], [0, 1.9, 10, 0]]) { ctx.save(); ctx.translate(x + dx * h, y); ctx.rotate(rr); const H2 = s2 * hh, W2 = ww * h, g2 = ctx.createLinearGradient(-W2, 0, W2, 0); g2.addColorStop(0, col[0]); g2.addColorStop(0.5, col[1]); g2.addColorStop(1, col[2]); ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(-W2, 0); ctx.lineTo(-W2, -H2 * 0.75); ctx.lineTo(0, -H2); ctx.lineTo(W2, -H2 * 0.75); ctx.lineTo(W2, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
}
function drawBoxes(x0, x1, y0, y1) {
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = L.g[ty][tx]; if (c === 'X' || c === 'Y' || c === '!' || c === 'D') { drawSpecial(c, tx, ty); continue; } if (c !== '?' && c !== 'B' && c !== 'U') continue;
    const cx = tx * T + T / 2; let cy = ty * T + T / 2;
    const b = bumps.find(q => q.tx === tx && q.ty === ty); if (b) cy -= Math.sin(b.t / 0.2 * Math.PI) * 10;
    if (c === '?') {
      const pu = 0.5 + 0.5 * Math.sin(time * 4 + tx);
      ctx.globalCompositeOperation = 'lighter';
      const g2 = ctx.createRadialGradient(cx, cy, 14, cx, cy, 46); g2.addColorStop(0, 'rgba(255,190,60,' + (0.2 + 0.14 * pu) + ')'); g2.addColorStop(1, 'rgba(255,190,60,0)');
      ctx.fillStyle = g2; ctx.fillRect(cx - 46, cy - 46, 92, 92);
      ctx.globalCompositeOperation = 'source-over';
      spr(IMG['obj-caja'], cx, cy, 57 * (1 + pu * 0.03), 0.5, 0.5);
    } else if (c === 'B' && iceI('caja-hielo')) spr(IMG['caja-hielo'], cx, cy, 52, 0.5, 0.5);
    else if (c === 'B' && lavaI('caja-lava')) spr(IMG['caja-lava'], cx, cy, 52, 0.5, 0.5);
    else if (c === 'B' && selI('caja-selva')) spr(IMG['caja-selva'], cx, cy, 52, 0.5, 0.5);
    else if (c === 'B' && L.theme === 'ice') { const x = cx - 23, y = cy - 23, g2 = ctx.createLinearGradient(x, y, x + 46, y + 46); g2.addColorStop(0, 'rgba(230,252,255,.95)'); g2.addColorStop(0.5, 'rgba(120,210,255,.85)'); g2.addColorStop(1, 'rgba(60,150,230,.9)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, 46, 46, 6) : ctx.rect(x, y, 46, 46); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(x + 8, y + 30); ctx.lineTo(x + 20, y + 12); ctx.moveTo(x + 26, y + 38); ctx.lineTo(x + 38, y + 20); ctx.stroke(); }
    else spr(IMG[c === 'B' ? 'caja-x' : 'caja-usada'], cx, cy, c === 'B' ? 53 : 54, 0.5, 0.5);
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
  const ghost = CHEAT.ghost && !p.dead;
  if (ghost) { const gr = ctx.createRadialGradient(cx, p.y + p.h / 2, 4, cx, p.y + p.h / 2, 80); gr.addColorStop(0, 'rgba(41,230,255,' + (0.32 + 0.12 * Math.sin(time * 5)) + ')'); gr.addColorStop(1, 'rgba(41,230,255,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(cx - 80, p.y + p.h / 2 - 80, 160, 160); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.5) parts.push({ x: cx + (Math.random() - 0.5) * 36, y: p.y + Math.random() * p.h, vx: -p.face * 30, vy: -40 - Math.random() * 30, life: 0.7, max: 0.7, col: Math.random() < 0.6 ? '#29e6ff' : '#e8fdff', size: 2.2, grav: 0 });
    ctx.globalAlpha = 0.5; }
  // llamas de los 3 propulsores
  if (!p.dead) {
    if (p.wet && Math.random() < 0.25) parts.push({ x: cx + (Math.random() - 0.5) * 20, y: p.y + p.h - 6, vx: (Math.random() - 0.5) * 20, vy: -30, life: 1.2, max: 1.2, col: 'rgba(220,250,255,.8)', size: 1.5 + Math.random() * 2.5, grav: -120 });
    const fl = p.wet || p.flip > 0 ? 0 : p.win ? 14 : (p.tTurbo > 0 || CHEAT.fly || p.fly) && K.jump ? 64 : !p.onGround ? (p.vy < 0 ? 48 : 20) : (Math.abs(p.vx) > 40 ? 17 : 12);
    const fs = p.face < 0 ? -1 : 1, hk = LUCAS_K * mini, mouths = CAN[pose].map(o => [cx + fs * o[0] * hk * sx, by - o[1] * hk * sy - 2.5 * mini]);
    if (p.onGround) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,130,40,' + (0.2 + 0.08 * Math.sin(time * 40)) + ')'; ctx.beginPath(); ctx.ellipse(mouths[1][0], p.y + p.h + 1, 30 * mini, 5 * mini, 0, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    if (fl > 0) mouths.forEach((m, i) => flame(m[0], m[1], fl * mini * (i === 1 ? 1.1 : 1), 9 * mini, i + 1));
    if (p.onGround && Math.abs(p.vx) > 150 && Math.random() < 0.35) parts.push({ x: cx - p.face * 14, y: p.y + p.h, vx: -p.face * (40 + Math.random() * 80), vy: -20 - Math.random() * 70, life: 0.28, max: 0.28, col: Math.random() < 0.5 ? '#ffb347' : '#fff2c0', size: 2.2, grav: 300 });
    if (!p.onGround && p.vy < -100 && Math.random() < 0.7) { const m = mouths[Math.floor(Math.random() * 3)]; parts.push({ x: m[0] + (Math.random() - 0.5) * 6, y: m[1] + 20 + Math.random() * 20, vx: (Math.random() - 0.5) * 50, vy: 140 + Math.random() * 140, life: 0.32, max: 0.32, col: Math.random() < 0.6 ? '#ff9a3c' : '#ffe08a', size: 2.6, grav: 0 }); }
  }
  if (p.tStar > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = 'hsl(' + (time * 400 % 360) + ',100%,60%)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h / 2, p.w * 1.05, p.h * 0.72, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    if (Math.random() < 0.6) parts.push({ x: cx + (Math.random() - 0.5) * 40, y: p.y + Math.random() * p.h, vx: 0, vy: -30, life: 0.5, max: 0.5, col: 'hsl(' + Math.random() * 360 + ',100%,65%)', size: 3.5, grav: 0 }); }
  if (ghost) { ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 22 + 8 * Math.sin(time * 6); ctx.globalAlpha = 0.55 + 0.08 * Math.sin(time * 4); }
  if (L.djr && L.djr.length) {        // ondas de energía del doble salto
    ctx.globalCompositeOperation = 'lighter';
    for (const r of L.djr) { const a = (time - r.t0) / 0.45; if (a >= 1) continue;
      for (let k = 0; k < 2; k++) { const q = Math.min(1, a * (1.25 - k * 0.35)), R = 14 + q * (70 - k * 20); ctx.strokeStyle = k ? 'rgba(53,255,138,' + (1 - q) * 0.8 + ')' : 'rgba(127,246,255,' + (1 - q) + ')'; ctx.lineWidth = 5 * (1 - q) + 1; ctx.beginPath(); ctx.ellipse(r.x, r.y + k * 6, R, R * 0.3, 0, 0, 6.283); ctx.stroke(); }
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 46); g.addColorStop(0, 'rgba(200,255,255,' + (1 - a) * 0.7 + ')'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r.x, r.y, 46, 18, 0, 0, 6.283); ctx.fill();
      for (let k = -1; k <= 1; k++) { const lx = r.x + k * 14, ly = r.y + 6 + a * 50; ctx.strokeStyle = 'rgba(190,250,255,' + (1 - a) * 0.8 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 26 * (1 - a)); ctx.stroke(); } }
    ctx.globalCompositeOperation = 'source-over'; L.djr = L.djr.filter(r => time - r.t0 < 0.45);
  }
  if (p.flip > 0 && !p.dead) {          // voltereta del doble salto, con estela
    const pr = 1 - p.flip / 0.42, ang = pr * 6.283 * (p.face < 0 ? -1 : 1), my = p.y + p.h / 2;
    for (let g2 = 2; g2 >= 1; g2--) { const a2 = ang - g2 * 0.5 * (p.face < 0 ? -1 : 1); ctx.save(); ctx.globalAlpha = 0.18 / g2; ctx.translate(cx, my); ctx.rotate(a2); ctx.translate(-cx, -my); spr(im, cx, by, h, ANCH[pose], 1, p.face < 0, 0, sx, sy); ctx.restore(); }
    ctx.save(); ctx.translate(cx, my); ctx.rotate(ang); ctx.translate(-cx, -my); spr(im, cx, by, h, ANCH[pose], 1, p.face < 0, 0, sx, sy); ctx.restore();
  } else spr(im, cx, by, h, ANCH[pose], 1, p.face < 0, lean, sx, sy);
  if (ghost) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1; }
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
  for (const cp of L.cps) if (vis(cp.x)) { if (cp.on) { ctx.fillStyle = 'rgba(53,255,138,' + (0.25 + 0.15 * Math.sin(time * 6)) + ')'; ctx.beginPath(); ctx.arc(cp.x, cp.y - 100, 22, 0, 6.283); ctx.fill(); } ctx.globalAlpha = cp.on ? 1 : 0.7; spr(IMG['obj-checkpoint'], cp.x, cp.y + 2, 118); ctx.globalAlpha = 1; }
  if (vis(L.goal.x)) { const g = ctx.createRadialGradient(L.goal.x, L.goal.y - 150, 4, L.goal.x, L.goal.y - 150, 90); g.addColorStop(0, 'rgba(41,230,255,.45)'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.goal.x, L.goal.y - 150, 90, 0, 6.283); ctx.fill(); spr(IMG['obj-antena5g'], L.goal.x, L.goal.y + 2, 250); }
  drawCogs(); drawTiles();
  drawStageBack();
  // chips y engranajes
  for (const c of L.chips) if (!c.got && vis(c.x)) { const s = Math.cos(time * 4 + c.t); spr(IMG['obj-chip'], c.x, c.y + Math.sin(time * 3 + c.t) * 3, 26, 0.5, 0.5, false, 0, Math.abs(s) * 0.85 + 0.15, 1); }
  for (const g of L.gears) if (!g.got && vis(g.x)) { ctx.globalAlpha = g.old ? 0.38 : 1; ctx.fillStyle = 'rgba(61,184,255,.22)'; ctx.beginPath(); ctx.arc(g.x, g.y, 30, 0, 6.283); ctx.fill(); spr(IMG['obj-engranaje'], g.x, g.y + Math.sin(time * 2.5) * 4, 40, 0.5, 0.5, false, time * 1.2); ctx.globalAlpha = 1; }
  const PIMG = { laser: 'poder-laser', escudo: 'poder-escudo', turbo: 'poder-turbo', iman: 'poder-iman', mini: 'poder-mini', estrella: 'poder-estrella5g' };
  if (L.kitP) for (const k of L.kitP) { if (!vis(k.x)) continue; const ic = k.kind === 'vuelo' ? 'poder-turbo' : PIMG[k.kind], bob = Math.sin(time * 3 + k.x) * 4;
    if (L.theme === 'jungle') { if (k.st) continue; const sy = k.y - 70 + Math.sin(time * 2 + k.x) * 6; ctx.strokeStyle = '#3a8a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(k.x, cam.y - 10); ctx.quadraticCurveTo(k.x + 10, sy - 60, k.x, sy - 26); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(k.x, sy, 4, k.x, sy, 52); g2.addColorStop(0, 'rgba(180,255,90,.55)'); g2.addColorStop(1, 'rgba(120,255,60,0)'); ctx.fillStyle = g2; ctx.fillRect(k.x - 52, sy - 52, 104, 104); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(90,200,70,.55)'; ctx.beginPath(); ctx.ellipse(k.x, sy, 28, 32, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#1a5a1a'; ctx.lineWidth = 2.5; ctx.stroke(); spr(IMG[ic], k.x, sy, 36, 0.5, 0.5); continue; }
    if (L.theme === 'ice') { if (k.st) continue;          // cristal de hielo con el poder congelado dentro
      ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(k.x, k.y - 45, 4, k.x, k.y - 45, 60); g2.addColorStop(0, 'rgba(160,240,255,.5)'); g2.addColorStop(1, 'rgba(160,240,255,0)'); ctx.fillStyle = g2; ctx.fillRect(k.x - 60, k.y - 105, 120, 110); ctx.globalCompositeOperation = 'source-over';
      spr(IMG[ic], k.x, k.y - 45, 40, 0.5, 0.5);
      const cg = ctx.createLinearGradient(k.x - 28, 0, k.x + 28, 0); cg.addColorStop(0, 'rgba(120,200,255,.55)'); cg.addColorStop(0.5, 'rgba(230,252,255,.35)'); cg.addColorStop(1, 'rgba(80,170,240,.55)'); ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(k.x - 26, k.y); ctx.lineTo(k.x - 30, k.y - 60); ctx.lineTo(k.x, k.y - 92); ctx.lineTo(k.x + 30, k.y - 62); ctx.lineTo(k.x + 26, k.y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(k.x - 14, k.y - 20); ctx.lineTo(k.x - 4, k.y - 70); ctx.stroke(); }
    else {          // forja: yunque al rojo con el poder flotando entre llamas
      ctx.fillStyle = '#2a1018'; ctx.fillRect(k.x - 24, k.y - 22, 48, 22); ctx.fillStyle = '#3e1c26'; ctx.fillRect(k.x - 30, k.y - 30, 60, 10); ctx.fillStyle = '#ff7a24'; ctx.fillRect(k.x - 30, k.y - 30, 60, 3);
      if (k.st) continue; if (Math.random() < 0.8) parts.push({ x: k.x + (Math.random() - 0.5) * 40, y: k.y - 32, vx: (Math.random() - 0.5) * 30, vy: -90 - Math.random() * 90, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#ffb040' : '#ff5a1a', size: 3, grav: -50 }); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(k.x, k.y - 66, 4, k.x, k.y - 66, 50); g2.addColorStop(0, 'rgba(255,170,60,.55)'); g2.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g2; ctx.fillRect(k.x - 50, k.y - 116, 100, 100); ctx.globalCompositeOperation = 'source-over';
      spr(IMG[ic], k.x, k.y - 66 + bob, 42, 0.5, 0.5); } }
  for (const it of items) { if (it.mat > 0) ctx.globalAlpha = Math.max(0, 1 - it.mat / 1.4); const iy = it.y + 20 + Math.sin(it.t * 4) * 3;
    if (it.kind === 'vida') { ctx.globalCompositeOperation = 'lighter'; const vg = ctx.createRadialGradient(it.x + 20, iy, 4, it.x + 20, iy, 34); vg.addColorStop(0, 'rgba(53,255,138,.55)'); vg.addColorStop(1, 'rgba(53,255,138,0)'); ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(it.x + 20, iy, 34, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(160,255,200,.9)'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(20,60,40,.45)'; ctx.beginPath(); ctx.arc(it.x + 20, iy, 22, 0, 6.283); ctx.fill(); ctx.stroke(); spr(IMG['lucas-quieto'], it.x + 20, iy + 15, 32, 0.5, 1);
      ctx.font = '900 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#35ff8a'; ctx.fillText('1UP', it.x + 20, iy - 26); continue; }
    ctx.fillStyle = 'rgba(41,230,255,.2)'; ctx.beginPath(); ctx.arc(it.x + 20, iy, 30, 0, 6.283); ctx.fill(); spr(IMG[PIMG[it.kind]], it.x + 20, iy, 44, 0.5, 0.5); ctx.globalAlpha = 1; }
  // enemigos
  for (const e of enemies) {
    if (!vis(e.x)) continue;
    const cx = e.x + e.w / 2, by = e.y + e.h, TV = L.theme === 'lava' ? LAVN : L.theme === 'jungle' ? SELN : ICEN, iv = TV[e.type] && (iceI(TV[e.type][0]) || lavaI(TV[e.type][0]) || selI(TV[e.type][0])), eim = iv || IMG[e.d.img], eax = iv ? 0.5 : e.d.ax || 0.5, efl = iv || e.d.faceR ? e.dir < 0 : e.dir > 0, eh = iv ? e.d.h * TV[e.type][2] : e.d.h;
    if (eim._n) eim._f = e.dead ? 0 : e.type === 'torreta' ? (e.shotT > 0 ? 2 : e.near && e.timer < 0.6 ? 1 : 0) : Math.floor(e.t * (e.d.fps || 22));
    if (e.dead) { if (e.how === 'squish') spr(eim, cx, by, eh, eax, 1, efl, 0, 1.25, 0.25); else spr(eim, cx, by - eh / 2, eh, 0.5, 0.5, efl, e.dead * 9); continue; }
    const wob = e.d.fly || e.type === 'torreta' ? 0 : Math.sin(e.t * 9) * 0.04;
    if (iv && L.theme === 'jungle' && e.type === 'dron') { const gx = cx + (efl ? 1 : -1) * eh * 0.165, gy2 = by + 2 - eh * 0.29, R = eh * 0.55 * (0.85 + 0.15 * Math.sin(time * 6 + e.x)); ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(gx, gy2, 2, gx, gy2, R); fg.addColorStop(0, 'rgba(190,255,90,.85)'); fg.addColorStop(0.35, 'rgba(120,255,60,.35)'); fg.addColorStop(1, 'rgba(80,255,40,0)'); ctx.fillStyle = fg; ctx.fillRect(gx - R, gy2 - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
    spr(eim, cx, by + (e.type === 'alien' ? 4 : 2), eh, eax, 1, efl, wob, 1, e.type === 'alien' ? 1 + Math.sin(e.t * 5) * 0.05 : 1);
    if (iv && L.theme === 'jungle' && e.type === 'dron') { const gx = cx + (efl ? 1 : -1) * eh * 0.165, gy2 = by + 2 - eh * 0.29; ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(gx, gy2, 1, gx, gy2, eh * 0.2); fg.addColorStop(0, 'rgba(230,255,160,.7)'); fg.addColorStop(1, 'rgba(120,255,60,0)'); ctx.fillStyle = fg; ctx.fillRect(gx - eh * 0.22, gy2 - eh * 0.22, eh * 0.44, eh * 0.44); ctx.globalCompositeOperation = 'source-over'; }
    if (L.theme === 'lava' && !iv) { const tc = tintCv(eim, 'rgba(255,80,20,1)'); if (tc) { tc._f = eim._f; ctx.globalAlpha = 0.34 + 0.06 * Math.sin(time * 5 + e.x); spr(tc, cx, by + (e.type === 'alien' ? 4 : 2), eh, eax, 1, efl, wob, 1, e.type === 'alien' ? 1 + Math.sin(e.t * 5) * 0.05 : 1); ctx.globalAlpha = 1; } }
  }
  if (L.boss) drawBoss();
  drawPlayer();
  drawFake();
  drawStageFront();
  drawWaves();
  // disparos
  ctx.globalCompositeOperation = 'lighter';
  for (const s of shots) {
    if (s.mine) { ctx.fillStyle = 'rgba(255,60,90,.4)'; ctx.fillRect(s.x - 18, s.y - 6, 36, 12); ctx.fillStyle = '#ff6a8a'; ctx.fillRect(s.x - 12, s.y - 3, 24, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 9, s.y - 1, 18, 2); }
    else if (s.ball && L.theme === 'jungle') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0); const sg = ctx.createRadialGradient(-6, -6, 3, 0, 0, 19); sg.addColorStop(0, '#b8b8a0'); sg.addColorStop(1, '#4a4a3a'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#1a1a10'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = '#5aff6a'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 4); ctx.stroke(); ctx.restore(); }
    else if (s.seed) { ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 22); sg.addColorStop(0, 'rgba(200,255,120,.9)'); sg.addColorStop(1, 'rgba(80,255,60,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#6a4a1a'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 9, 12, Math.atan2(s.vy, s.vx), 0, 6.283); ctx.fill(); ctx.fillStyle = '#9aff6a'; ctx.beginPath(); ctx.arc(s.x, s.y - 3, 3, 0, 6.283); ctx.fill(); }
    else if (s.ball) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0); const bg = ctx.createRadialGradient(-6, -6, 3, 0, 0, 19); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.7, '#d8f2ff'); bg.addColorStop(1, '#8cc8ec'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#5a9cc8'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = 'rgba(120,180,220,.7)'; ctx.beginPath(); ctx.arc(0, 0, 11, 0.3, 2.2); ctx.stroke(); ctx.restore(); }
    else if (s.magma) { ctx.globalCompositeOperation = 'lighter'; const mg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 24); mg.addColorStop(0, 'rgba(255,220,120,.9)'); mg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(s.x, s.y, 24, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3a1410'; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, 6, 0, 6.283); ctx.fill(); if (Math.random() < 0.6) parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.4, max: 0.4, col: '#ff8a20', size: 3, grav: 0 }); }
    else if (s.ice) { ctx.fillStyle = 'rgba(120,220,255,.45)'; ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, 6.283); ctx.fill(); ctx.fillStyle = '#bff4ff'; ctx.beginPath(); ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x, s.y - 9); ctx.lineTo(s.x + 9, s.y); ctx.lineTo(s.x, s.y + 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 6.283); ctx.fill(); }
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
  spr(IMG['lucas-quieto'], pad + 14, 44, 38, 0.5, 1); txt('× ' + (CHEAT.live ? '∞' : Math.max(0, G.lives)), pad + 34, 26, CHEAT.live ? '#7fe9ff' : '#fff');
  spr(IMG['obj-chip'], pad + 112, 26, 24, 0.5, 0.5); txt(String(G.chips), pad + 130, 26, '#ffe27a');
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < G.gears ? 1 : 0.28; spr(IMG['obj-engranaje'], pad + 196 + i * 28, 26, 24, 0.5, 0.5); } ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; txt(String(G.score).padStart(6, '0'), w / 2, 26);
  ctx.font = '700 12px system-ui,sans-serif'; txt(L.custom ? 'TALLER · ' + L.name : 'PLANETA ' + curId, w / 2, 46, '#9fb4ff');
  { // reloj: se pone rojo y late cuando quedan 30 s
    const tl = Math.ceil(G.tleft), low = tl <= 30, vlow = tl <= 10, tx = Math.min(w - 190, w / 2 + 200), pu = low ? 1 + (vlow ? 0.16 : 0.08) * Math.abs(Math.sin(time * (vlow ? 10 : 5))) : 1, col = low ? '#ff4a5a' : '#fff';
    ctx.save(); ctx.translate(tx, 30); ctx.scale(pu, pu);
    if (low) { ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 16; }
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.fillStyle = 'rgba(5,7,26,.7)'; ctx.beginPath(); ctx.arc(-44, 0, 12, 0, 6.283); ctx.fill(); ctx.stroke();
    const an = -1.5708 + 6.283 * (1 - G.tleft / L.time); ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(-44 + Math.cos(an) * 8, Math.sin(an) * 8); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(-46.5, -17, 5, 4);
    ctx.font = '800 22px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(5,7,26,.85)'; ctx.shadowBlur = 0; ctx.fillText(CHEAT.time ? '∞' : Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), -24.5, 2.5);
    if (low) { ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 14; } ctx.fillStyle = CHEAT.time ? '#7fe9ff' : col; ctx.fillText(CHEAT.time ? '∞' : Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), -26, 1);
    ctx.restore(); ctx.textAlign = 'center';
  }
  if (L.boss && L.boss.fight && !L.boss.gone) { const b = L.boss, bw = Math.min(320, w * 0.4), bx = w / 2 - bw / 2, by2 = 62;
    ctx.font = '800 11px system-ui,sans-serif'; ctx.textAlign = 'center'; txt(L.bossName || 'EL GUARDIÁN', w / 2, by2, L.theme === 'ice' ? '#9ff0ff' : '#ff8a9a');
    ctx.fillStyle = 'rgba(5,7,26,.8)'; ctx.fillRect(bx - 2, by2 + 8, bw + 4, 14); for (let k = 0; k < b.max; k++) { const on = k < b.hp; ctx.fillStyle = on ? (b.hp <= b.max / 2 ? '#ff3a4a' : '#ff6a3a') : '#2a1a2a'; ctx.fillRect(bx + k * bw / b.max + 1, by2 + 10, bw / b.max - 2, 10); }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + b.flash * 2 + ')'; ctx.fillRect(bx, by2 + 10, bw, 10); } }
  // poderes activos
  const p = P, act = [];
  if (p.power === 'laser' || CHEAT.laser) act.push(['poder-laser', 0]); if (p.power === 'mini') act.push(['poder-mini', 0]); if (p.shield) act.push(['poder-escudo', 0]); if (p.fly) act.push(['poder-turbo', 0]);
  if (p.tTurbo > 0) act.push(['poder-turbo', p.tTurbo / 7]); if (p.tMagnet > 0) act.push(['poder-iman', p.tMagnet / 14]); if (p.tStar > 0) act.push(['poder-estrella5g', p.tStar / 9]);
  act.forEach(([n, f], i) => { const x = pad + 18 + i * 44, y = 76; spr(IMG[n], x, y, 36, 0.5, 0.5);
    if (f > 0) { ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20, -1.5708, -1.5708 + 6.283 * f); ctx.stroke(); } });
  ctx.restore();
}
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (!L) { ctx.fillStyle = '#070a1e'; ctx.fillRect(0, 0, VW, VHv); return; }
  if (state === 'warp') drawWarp(); else if (state === 'map') drawMap(); else if (state === 'edit') { cam.x = edCam = Math.max(0, Math.min(edCam, L.W * T - VW)); const yb = L.H * T - (VHv - 92); if (edCamY === null) edCamY = yb; cam.y = edCamY = Math.max(Math.min(-50, yb), Math.min(yb, edCamY)); drawBackground(); drawWorld(); drawEditorOverlay(); const sc = $('edScr'); if (sc && document.activeElement !== sc) sc.value = Math.round(edCam / Math.max(1, L.W * T - VW) * 1000); } else { drawBackground(); drawWorld(); if (L.water) drawWater(); if (L.dark && state !== 'title') drawDark(); drawSnow(); drawJungleFx(); }
  if (state === 'play' || state === 'done' || state === 'over') drawHUD();
  const vg = ctx.createRadialGradient(VW / 2, VHv / 2, VHv * 0.45, VW / 2, VHv / 2, Math.max(VW, VHv) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VHv);
  if (state === 'play' && G.tleft <= 30 && !P.win && !CHEAT.time) { const a = (G.tleft <= 10 ? 0.34 : 0.16) * (0.5 + 0.5 * Math.sin(time * (G.tleft <= 10 ? 10 : 5))); const rg = ctx.createRadialGradient(VW / 2, VHv / 2, VHv * 0.42, VW / 2, VHv / 2, Math.max(VW, VHv) * 0.72); rg.addColorStop(0, 'rgba(255,30,50,0)'); rg.addColorStop(1, 'rgba(255,30,50,' + a + ')'); ctx.fillStyle = rg; ctx.fillRect(0, 0, VW, VHv); }
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
const INSTALLED = matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches || navigator.standalone;
let fsLeft = false;      // el jugador salió a propósito de pantalla completa: no se la volvemos a imponer
function enterFull() {
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen; if (!rq || document.fullscreenElement) return;
  try { Promise.resolve(rq.call(el, { navigationUI: 'hide' })).then(() => {
    if (TOUCH) { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
    else { try { navigator.keyboard && navigator.keyboard.lock && navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) {} }   // así Esc pausa en vez de salir
  }).catch(() => {}); } catch (e) {}
}
function goFull() { if (TOUCH || (INSTALLED && !fsLeft)) enterFull(); }
function toggleFull() { if (document.fullscreenElement) { fsLeft = true; try { document.exitFullscreen(); } catch (e) {} } else { fsLeft = false; enterFull(); } }
document.addEventListener('fullscreenchange', () => { const b = $('btnFull'); if (b) b.textContent = document.fullscreenElement ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'; setTimeout(resize, 60); });
// instalada en PC: pantalla completa de verdad (sin barra de Windows) al primer clic o tecla
if (INSTALLED && !TOUCH) { const first = () => { if (!fsLeft) enterFull(); }; addEventListener('pointerdown', first); addEventListener('keydown', first); }
addEventListener('keydown', e => { if ((e.target && e.target.tagName === 'INPUT') || CON.on || $('adm').classList.contains('on')) return; if (e.code === 'F11' || (e.code === 'KeyF' && !e.repeat && state !== 'play')) { e.preventDefault(); toggleFull(); } });
if (!TOUCH) { $('btnFull').style.display = ''; $('btnFull').onclick = toggleFull; }
function startGame() {
  audio(); startMusic();
  resetLevel(true); state = 'play'; paused = false; if (L.intro) { const t0 = L.intro; setTimeout(() => { if (state === 'play') { pop(P.x + P.w / 2, P.y - 40, t0, '#7fe9ff'); SFX.portal(); } }, 600); }
  show('title', false); show('panel', false); show('mapUI', false); show('top', true); show('touch', TOUCH && !padUsed); checkRot();
}
function togglePause() {
  if (state !== 'play' || CON.on) return;
  paused = !paused;
  if (paused) { $('card').classList.remove('tips'); $('card').innerHTML = '<h2 id="pauseT" style="cursor:default;padding:6px 0">PAUSA</h2><div class="row"><button class="btn" id="pc">SEGUIR</button><button class="btn" id="pm">MAPA</button>' + (CHEAT.test && L && !L.custom ? '<button class="btn" id="pEd" style="border-color:#ffd23c">✏️ EDITAR</button>' : '') + '</div>' + (CHEAT.test ? '<div style="margin-top:12px;color:#ffd23c;font:800 12px system-ui;letter-spacing:.08em">🧪 MODO PRUEBAS · TOCA PARA ACTIVAR O QUITAR</div><div class="row" id="pTest" style="max-width:640px">' + CODES.map(c => '<button class="btn' + (CHEAT[c[0].toLowerCase()] ? ' tOn' : '') + '" data-ck="' + c[0].toLowerCase() + '" style="font-size:12px;padding:8px 11px">' + (c[0] === 'UNLOCK' ? '🔓 SALTAR CANDADOS' : c[1]) + '</button>').join('') + '</div>' : ''); show('panel', true);
    if (CHEAT.test) { if (!$('tOnSt')) { const s = document.createElement('style'); s.id = 'tOnSt'; s.textContent = '#pTest .btn.tOn{border-color:#35ff8a;background:rgba(20,90,50,.9);box-shadow:0 0 14px rgba(53,255,138,.7)}'; document.head.appendChild(s); }
      $('card').querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { const k = b.dataset.ck; CHEAT[k] = !CHEAT[k]; if (k === 'floor') CHEAT.floorT = 0; saveCheats(); b.classList.toggle('tOn', CHEAT[k]); tone(CHEAT[k] ? 1200 : 500, CHEAT[k] ? 1600 : 300, 0.08, 'square', 0.05); }); } $('pc').onclick = togglePause; $('pm').onclick = () => toMap(false); if ($('pEd')) $('pEd').onclick = openEditOff; pauseTap = { n: 0, t: 0 }; $('pauseT').addEventListener('pointerup', pauseTapOn); }
  else show('panel', false);
}
function cheatsOff() { let any = false; for (const c of CODES) { const k = c[0].toLowerCase(); if (CHEAT[k]) any = true; CHEAT[k] = false; } if (any) saveCheats(); }
function toMenu() { cheatsOff(); setTimeout(updApply, 300);      // volver a la portada apaga los trucos (recargar o actualizarse no)
  paused = false; state = 'title'; show('panel', false); show('mapUI', false); show('top', false); show('touch', false); show('title', true); checkRot(); }
function levelDone() {
  state = 'done'; show('touch', false); $('card').classList.remove('tips'); if (!L.custom) evt('superada', curId);
  const stars = 1 + (G.gears === 3 ? 1 : 0) + (G.deaths === 0 ? 1 : 0);
  const secs = Math.floor(G.clock), bonus = Math.ceil(G.tleft) * 10; G.score += bonus;
  const old = PROG[curId] || { stars: 0, best: 0 }, first = !PROG[curId]; bossBeatBefore = !first;
  if (!L.custom) PROG[curId] = { stars: Math.max(old.stars, stars), best: Math.max(old.best, G.score), rb: G.tr ? old.rb || 0 : Math.max(old.rb || 0, G.score) }; if (!L.custom) { saveProg(); rankSend(); }
  { const ci = MAP.findIndex(n => n.id === curId); justOpened = first ? MAP.findIndex((n, k) => k > 0 && !n.bonus && mapPrev(k) === ci) : -1; }
  $('card').innerHTML = '<h2>' + (/-J$/.test(curId) ? '¡PLANETA ' + curId[0] + ' COMPLETADO!' : '¡FASE SUPERADA!') + '</h2><div class="stars">' + [0, 1, 2].map(i => '<span id="st' + i + '">★</span>').join('') + '</div>' +
    '<div class="stat"><span>Chips</span><b>' + G.chips + '</b></div><div class="stat"><span>Engranajes</span><b>' + G.gears + ' / 3</b></div>' +
    '<div class="stat"><span>Tiempo</span><b>' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + '</b></div><div class="stat"><span>Bonus por tiempo sobrante</span><b>+' + bonus + '</b></div>' +
    '<div class="stat"><span>Puntos</span><b>' + G.score + (G.score > old.best ? ' · ¡RÉCORD!' : '') + '</b></div>' +
    '<div class="small">★ terminar · ★ los 3 engranajes · ★ sin perder vidas</div>' +
    '<div class="row"><button class="btn" id="pm">CONTINUAR</button><button class="btn" id="pr">REPETIR</button></div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = () => toMap(true);
  for (let i = 0; i < stars; i++) setTimeout(() => { const e = $('st' + i); if (e) { e.classList.add('on'); tone(784 + i * 196, 784 + i * 196, 0.2, 'triangle', 0.14); } }, 400 + i * 380);
}
function gameOver() {
  state = 'over'; show('touch', false); SFX.over(); $('card').classList.remove('tips');
  $('card').innerHTML = '<h2>FIN DE LA PARTIDA</h2><div class="stat"><span>Puntos</span><b>' + G.score + '</b></div><div class="row"><button class="btn" id="pr">REINTENTAR</button><button class="btn" id="pm">MAPA</button></div>';
  show('panel', true); $('pr').onclick = startGame; $('pm').onclick = () => toMap(false);
}


/* ---------- viaje entre mundos: despegue, salto al hiperespacio y aterrizaje en el mapa nuevo ---------- */
function startWarp(w) {
  if (warp || w < 0 || w >= WORLDS.length) return;
  const t0 = mapT(), [sx, sy] = mapPt(t0, mapL.x, mapL.y), st = [];
  for (let i = 0; i < 280; i++) st.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, c: ['#ffffff', '#7fe9ff', '#c6a0ff', '#9ff0ff', '#ffd6f0'][i % 5] });
  warp = { t: 0, to: w, dir: w > curW ? 1 : -1, sx, sy, st, from: curW };
  mapImg(w); state = 'warp'; show('mapUI', false); show('panel', false); mapRoute = []; audio();
}
const easeIO = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function warpUpdate(dt) {
  const W = warp; if (!W) return; W.t += dt;
  if (!W.s0) { W.s0 = 1; tone(70, 520, 1.0, 'sawtooth', 0.06); tone(140, 1040, 1.0, 'square', 0.025); }
  if (W.t > 1.0 && !W.s1) { W.s1 = 1; noise(1.3, 0.28, 2600); tone(260, 2600, 0.75, 'sawtooth', 0.08); tone(90, 45, 0.9, 'sawtooth', 0.12); }
  if (W.t > 1.75 && !W.s2) { W.s2 = 1; tone(55, 55, 2.2, 'triangle', 0.12); tone(110, 220, 2.1, 'sine', 0.05); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.45, 'triangle', 0.06, 0.35 + i * 0.13)); }
  if (W.t > 3.9 && !W.s3) { W.s3 = 1; noise(0.5, 0.2, 5000); tone(1800, 220, 0.7, 'sine', 0.1);
    setWorld(W.to); const tg = W.dir > 0 ? 0 : MAP.findIndex(n => n.boss); mapSel = mapAt = tg; mapL = { x: MAP[tg].x, y: MAP[tg].y }; const t1 = mapT(), p1 = mapPt(t1, mapL.x, mapL.y); W.tx = p1[0]; W.ty = p1[1]; }
  if (W.t > 4.75 && !W.s4) { W.s4 = 1; SFX.stomp(); noise(0.45, 0.3, 700); tone(120, 50, 0.4, 'square', 0.12);
    for (let k = 0; k < 46; k++) { const a = Math.random() * 6.283, v = 80 + Math.random() * 260; mapParts.push({ x: W.tx, y: W.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.45 - 40, life: 1, max: 1, col: k % 3 ? '#9ff0ff' : '#fff', size: 2 + Math.random() * 3 }); } }
  for (const q of mapParts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!q.nog) q.vy += 120 * dt; } mapParts = mapParts.filter(q => q.life > 0);
  if (W.t > 5.7) { warp = null; state = 'map'; show('mapUI', true); mapInfo(); mapMsg = { txt: (W.dir > 0 ? '¡BIENVENIDO A ' : '¡DE VUELTA EN ') + WORLDS[curW].name + '!', t: 3, ok: true }; SFX.life(); setTimeout(updApply, 4000); }
}
function warpLucas(x, y, h, pose, fl, rot, face) {     // Lucas con sus 3 propulsores, a cualquier tamaño
  const im = IMG[pose], k = h / 480, fs = face || 1;
  CAN[pose].forEach((o, i) => flame(x + fs * o[0] * k, y - o[1] * k - 2, fl * h * (i === 1 ? 1.1 : 1), h * 0.09, i + 1));
  spr(im, x, y, (im.naturalHeight || 240) * KS * k, ANCH[pose], 1, fs < 0, rot || 0);
}
function drawWarp() {
  const W = warp; if (!W) { drawMap(); return; } const t = W.t, toW = WORLDS[W.to];
  if (t < 1.75) {                       // 1 · carga y despegue desde el mapa
    const k = t < 1 ? 0 : (t - 1) / 0.75, z = 1 + k * k * 0.7, hL = Math.max(58, 0.074 * mapT().u);
    ctx.save(); ctx.translate(W.sx, W.sy); ctx.scale(z, z); ctx.translate(-W.sx, -W.sy); mapHideLucas = true; drawMap(); mapHideLucas = false; ctx.restore();
    ctx.fillStyle = 'rgba(2,4,16,' + (k * 0.88) + ')'; ctx.fillRect(0, 0, VW, VHv);
    const ch = Math.min(1, t), sh = t < 1 ? ch * 5 : 2, lx = W.sx + (Math.random() - 0.5) * sh, ly = W.sy - k * k * (VHv + 400) + (Math.random() - 0.5) * sh;
    ctx.globalCompositeOperation = 'lighter';
    if (t < 1.2) { const R = hL * (0.6 + ch * 1.6), g = ctx.createRadialGradient(W.sx, W.sy - hL * 0.4, 2, W.sx, W.sy - hL * 0.4, R); g.addColorStop(0, 'rgba(255,255,255,' + 0.5 * ch + ')'); g.addColorStop(0.4, 'rgba(41,230,255,' + 0.35 * ch + ')'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W.sx, W.sy - hL * 0.4, R, 0, 6.283); ctx.fill();
      for (let i = 0; i < 3; i++) { const rr = hL * (2.2 - ((t * 1.6 + i / 3) % 1) * 2); ctx.strokeStyle = 'rgba(127,243,255,' + 0.6 * ch + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(W.sx, W.sy, rr, rr * 0.38, 0, 0, 6.283); ctx.stroke(); }
      if (Math.random() < 0.9) { const a = Math.random() * 6.283, d = hL * 2.2; mapParts.push({ x: W.sx + Math.cos(a) * d, y: W.sy + Math.sin(a) * d * 0.5, vx: -Math.cos(a) * d * 2, vy: -Math.sin(a) * d, life: 0.45, max: 0.45, col: Math.random() < 0.5 ? '#7fe9ff' : '#fff', size: 2 }); } }
    if (k > 0) { const tg = ctx.createLinearGradient(0, ly, 0, W.sy + 20); tg.addColorStop(0, 'rgba(255,190,80,.9)'); tg.addColorStop(1, 'rgba(255,90,30,0)'); ctx.fillStyle = tg; ctx.fillRect(lx - hL * 0.18, ly, hL * 0.36, Math.max(0, W.sy + 20 - ly)); }
    for (const q of mapParts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    warpLucas(lx, ly, hL * (1 + k * 0.4), k > 0 ? 'lucas-saltando' : 'lucas-quieto', 0.15 + ch * 0.35 + k * 1.8, 0);
    if (t > 1.5) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (t - 1.5) / 0.25) + ')'; ctx.fillRect(0, 0, VW, VHv); }
    return;
  }
  if (t < 3.9) {                        // 2 · hiperespacio
    const u = (t - 1.75) / 2.15, sp = 0.4 + Math.sin(u * Math.PI) * 2.6, cx = VW * 0.4, cy = VHv * 0.52;
    ctx.save(); if (W.dir < 0) { ctx.translate(VW, 0); ctx.scale(-1, 1); }      // de vuelta: todo en espejo, Lucas vuela hacia la izquierda
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(VW, VHv)); bg.addColorStop(0, W.dir > 0 ? '#1a1060' : '#10204a'); bg.addColorStop(0.5, '#070726'); bg.addColorStop(1, '#000'); ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VHv);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const nx = ((1.4 - ((u * (1.2 + i * 0.3) + i * 0.37) % 1.4)) * VW * 1.3) - VW * 0.15, ny = VHv * (0.15 + (i * 0.19) % 0.8), r = VHv * (0.35 + 0.1 * i), g = ctx.createRadialGradient(nx, ny, 0, nx, ny, r); g.addColorStop(0, ['rgba(198,60,255,.18)', 'rgba(41,160,255,.16)', 'rgba(53,255,190,.12)', 'rgba(255,70,160,.14)', 'rgba(120,200,255,.14)'][i]); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(nx - r, ny - r, r * 2, r * 2); }
    for (const s2 of W.st) { s2.x -= sp * s2.z * 0.016 * 1.6; if (s2.x < -0.2) { s2.x += 1.4; s2.y = Math.random(); }
      const x = s2.x * VW, y = s2.y * VHv, len = sp * s2.z * 140; ctx.strokeStyle = s2.c; ctx.globalAlpha = 0.35 + 0.65 * s2.z; ctx.lineWidth = 1 + s2.z * 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // destino que se acerca
    if (u > 0.55) { const a = (u - 0.55) / 0.45, px = VW * (1.25 - a * 0.42), py = VHv * 0.42, r = VHv * (0.08 + a * a * 0.55);
      const pg = ctx.createRadialGradient(px - r * 0.3, py - r * 0.35, r * 0.1, px, py, r); if (W.to === 1) { pg.addColorStop(0, '#eaffff'); pg.addColorStop(0.5, '#6fd8ff'); pg.addColorStop(1, '#1a4a9a'); } else if (W.to === 3) { pg.addColorStop(0, '#d8ffc8'); pg.addColorStop(0.45, '#3ac87a'); pg.addColorStop(1, '#0a2a3a'); } else if (W.to === 2) { pg.addColorStop(0, '#ffe8a0'); pg.addColorStop(0.45, '#ff6a1a'); pg.addColorStop(1, '#4a0a14'); } else { pg.addColorStop(0, '#d8e8ff'); pg.addColorStop(0.5, '#6a78b0'); pg.addColorStop(1, '#1a1a4a'); }
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'lighter';
      const at = ctx.createRadialGradient(px, py, r * 0.95, px, py, r * 1.25); at.addColorStop(0, 'rgba(160,240,255,.5)'); at.addColorStop(1, 'rgba(160,240,255,0)'); ctx.fillStyle = at; ctx.beginPath(); ctx.arc(px, py, r * 1.25, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(200,240,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, r * 1.7, r * 0.32, -0.3, 0, 6.283); ctx.stroke(); }
    // estela de Lucas
    const ly = cy + Math.sin(t * 3) * 10, h = VHv * 0.3, back = cx - h * 0.25;
    const tr = ctx.createLinearGradient(back - VW * 0.4, 0, back, 0); tr.addColorStop(0, 'rgba(255,80,30,0)'); tr.addColorStop(0.7, 'rgba(255,150,50,.5)'); tr.addColorStop(1, 'rgba(255,240,200,.9)'); ctx.fillStyle = tr;
    ctx.beginPath(); ctx.moveTo(back, ly - h * 0.12); ctx.lineTo(back - VW * 0.4, ly + (Math.random() - 0.5) * 8); ctx.lineTo(back, ly + h * 0.12); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(back + 8, ly); ctx.rotate(Math.PI / 2); for (let i = -1; i <= 1; i++) flame(i * h * 0.09, 0, h * (0.5 + Math.random() * 0.1), h * 0.1, i + 2); ctx.restore();
    spr(IMG['lucas-avanzando'], cx, ly + h * 0.5, h, 0.5, 1, false, -0.12);
    ctx.restore();
    // rótulo del mundo
    const ta = Math.min(1, Math.max(0, (u - 0.12) * 4)) * Math.min(1, Math.max(0, (0.97 - u) * 6));
    if (ta > 0) { ctx.globalAlpha = ta; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const sp2 = 18 * (1 - Math.min(1, (u - 0.12) * 2)), y0 = VHv * 0.18;
      ctx.font = '800 ' + Math.round(VHv * 0.035) + 'px system-ui,sans-serif'; ctx.fillStyle = '#7fe9ff'; ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 12; ctx.fillText((W.dir > 0 ? 'RUMBO AL PLANETA ' : 'REGRESO AL PLANETA ') + toW.n, VW / 2, y0);
      ctx.font = '900 ' + Math.round(VHv * 0.085) + 'px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowBlur = 26; const nm = toW.name, cw = [...nm].map(c => ctx.measureText(c).width), tw = cw.reduce((a, b) => a + b, 0) + sp2 * (nm.length - 1); let xx = VW / 2 - tw / 2;
      [...nm].forEach((c, i) => { ctx.fillText(c, xx + cw[i] / 2, y0 + VHv * 0.09); xx += cw[i] + sp2; }); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    if (u > 0.9) { ctx.fillStyle = 'rgba(255,255,255,' + (u - 0.9) * 10 + ')'; ctx.fillRect(0, 0, VW, VHv); }
    return;
  }
  // 3 · llegada: el mapa nuevo se abre y Lucas aterriza en su base
  const a = Math.min(1, (t - 3.9) / 0.95), z = 1 + (1 - easeIO(a)) * 0.6, tx = W.tx || VW / 2, ty = W.ty || VHv / 2, landed = t >= 4.75;
  const shk = landed && t < 5.05 ? (5.05 - t) * 40 : 0;
  ctx.save(); ctx.translate(tx + (Math.random() - 0.5) * shk, ty + (Math.random() - 0.5) * shk); ctx.scale(z, z); ctx.translate(-tx, -ty); mapHideLucas = !landed; drawMap(); mapHideLucas = false; ctx.restore();
  if (!landed) { const d = Math.min(1, (t - 3.9) / 0.85), hL = Math.max(58, 0.074 * mapT().u), ly = ty - (1 - d * d) * (VHv + 200);
    warpLucas(tx, ly, hL, 'lucas-cayendo', 0.6 + (1 - d) * 0.8, 0); }
  else if (t < 5.4) { const r = (t - 4.75) * 900, al = Math.max(0, 1 - (t - 4.75) / 0.65); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(160,245,255,' + al + ')'; ctx.lineWidth = 6 * al + 1; ctx.beginPath(); ctx.ellipse(tx, ty, r, r * 0.36, 0, 0, 6.283); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (t < 4.3) { ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - (t - 3.9) / 0.4) + ')'; ctx.fillRect(0, 0, VW, VHv); }
}

/* ---------- mapa del mundo 1 (ilustración + camino de energía) ---------- */
// x, y y rx van en fracciones del dibujo del mapa; way = puntos del tubo desde la fase anterior
const MAP1 = [
  { id: '1-1', n: '1', name: 'MUELLE DE CARGA', x: 0.1041, y: 0.498, rx: 0.033, built: true },
  { id: '1-2', n: '2', name: 'PASILLOS DE SERVICIO', x: 0.3479, y: 0.659, rx: 0.033, built: true, way: [[0.16, 0.47], [0.20, 0.477], [0.23, 0.52], [0.26, 0.60], [0.29, 0.655]] },
  { id: '1-3', n: '3', name: 'SALA DE MÁQUINAS', x: 0.4996, y: 0.499, rx: 0.033, built: true, way: [[0.39, 0.675], [0.42, 0.635], [0.45, 0.60], [0.47, 0.57]] },
  { id: '1-4', n: '4', name: 'TORRE DE ANTENAS', x: 0.6515, y: 0.339, rx: 0.033, gold: true, built: true, way: [[0.53, 0.46], [0.56, 0.42], [0.59, 0.385], [0.62, 0.37]] },
  { id: '1-J', n: '', name: 'JEFE · EL GUARDIÁN', x: 0.871, y: 0.393, rx: 0.05, boss: true, built: true, way: [[0.685, 0.335], [0.71, 0.305], [0.74, 0.295], [0.78, 0.31], [0.81, 0.335], [0.84, 0.37]] },
  { id: '1-B', n: '★', name: 'FASE SECRETA · PASEO ESPACIAL', x: 0.6177, y: 0.186, rx: 0.021, bonus: true, built: true, prev: 3, way: [[0.625, 0.33], [0.603, 0.29], [0.598, 0.24], [0.595, 0.21]] }
];
/* ---------- mapa del mundo 2: PLANETA DE CRISTAL ---------- */
const MAP2 = [
  { id: '2-1', n: '1', name: 'LLANURA HELADA', x: 0.104, y: 0.4955, rx: 0.04, built: true },
  { id: '2-2', n: '2', name: 'CUEVAS DE CRISTAL', x: 0.3475, y: 0.657, rx: 0.04, built: true, way: [[0.165, 0.453], [0.22, 0.488], [0.25, 0.56], [0.29, 0.625]] },
  { id: '2-3', n: '3', name: 'BAJO EL HIELO', x: 0.3635, y: 0.437, rx: 0.038, built: true, way: [[0.35, 0.59], [0.355, 0.52]] },
  { id: '2-4', n: '4', name: 'TORMENTA DE NIEVE', x: 0.4985, y: 0.491, rx: 0.038, built: true, way: [[0.415, 0.448], [0.455, 0.475]] },
  { id: '2-5', n: '5', name: 'AVALANCHA', x: 0.648, y: 0.654, rx: 0.038, built: true, way: [[0.53, 0.555], [0.585, 0.627]] },
  { id: '2-6', n: '6', name: 'POZO DE LA MINA', x: 0.651, y: 0.351, rx: 0.036, gold: true, built: true, way: [[0.67, 0.555], [0.666, 0.45]] },
  { id: '2-J', n: '', name: 'JEFE · GUARDIÁN DE HIELO', x: 0.8725, y: 0.401, rx: 0.058, boss: true, built: true, way: [[0.71, 0.33], [0.775, 0.315], [0.83, 0.355]] },
  { id: '2-B', n: '★', name: 'FASE SECRETA · AURORA', x: 0.618, y: 0.19, rx: 0.024, bonus: true, built: true, prev: 5, way: [[0.635, 0.305], [0.613, 0.26], [0.615, 0.224]] }
];
/* ---------- mapa del mundo 3: PLANETA VOLCÁNICO (panorámico: la cámara sigue a Lucas) ---------- */
const MAP3 = [
  { id: '3-1', n: '1', name: 'LLANURA DE CENIZA', x: 0.0405, y: 0.5519, rx: 0.03, built: true },
  { id: '3-2', n: '2', name: 'GÉISERES DE FUEGO', x: 0.0918, y: 0.3877, rx: 0.03, built: true },
  { id: '3-3', n: '3', name: 'CRÁTER DEL VOLCÁN', x: 0.2955, y: 0.3628, rx: 0.03, built: true },
  { id: '3-4', n: '4', name: 'RÍO DE MAGMA', x: 0.2093, y: 0.5317, rx: 0.03, built: true },
  { id: '3-5', n: '5', name: 'LLUVIA DE FUEGO', x: 0.0887, y: 0.7327, rx: 0.03, built: true },
  { id: '3-6', n: '6', name: 'TÚNELES DE LAVA', x: 0.2026, y: 0.8535, rx: 0.03, built: true },
  { id: '3-7', n: '7', name: 'EL GRAN PUENTE', x: 0.329, y: 0.7318, rx: 0.03, built: true },
  { id: '3-8', n: '8', name: 'LA FUNDICIÓN', x: 0.5095, y: 0.5118, rx: 0.03, built: true },
  { id: '3-9', n: '9', name: 'LAS CHIMENEAS', x: 0.6145, y: 0.7293, rx: 0.03, built: true },
  { id: '3-10', n: '10', name: 'ENGRANAJES GIGANTES', x: 0.7199, y: 0.3906, rx: 0.03, built: true },
  { id: '3-11', n: '11', name: 'ROCAS FLOTANTES', x: 0.7503, y: 0.5477, rx: 0.03, built: true },
  { id: '3-12', n: '12', name: 'MURALLAS DE LA FORTALEZA', x: 0.8237, y: 0.6655, rx: 0.03, gold: true, built: true },
  { id: '3-J', n: '', name: 'JEFE · SEÑOR DEL MAGMA', x: 0.8825, y: 0.511, rx: 0.04, boss: true, built: true },
  { id: '3-B', n: '★', name: 'FASE SECRETA · TESORO DEL VOLCÁN', x: 0.5419, y: 0.845, rx: 0.03, bonus: true, built: true, prev: 7 },
  { id: '3-13', n: '13', name: 'ISLA FLOTANTE', x: 0.7732, y: 0.2766, rx: 0.03, built: true, prev: 9 },
  { id: '3-14', n: '14', name: 'MINA DE CRISTAL ROJO', x: 0.7134, y: 0.887, rx: 0.03, built: true, prev: 13 }
];
/* ---------- mapa del planeta 4: SELVA LUMINOSA (4 pantallas de ancho; paint = plataforma dibujada por el juego) ---------- */
const MAP4 = [
  { id: '4-1', n: '1', name: 'SENDERO LUMINOSO', x: 0.1325, y: 0.529, rx: 0.04, built: true },
  { id: '4-2', n: '2', name: 'LIANAS GIGANTES', x: 0.196, y: 0.70, rx: 0.04, built: true },
  { id: '4-3', n: '3', name: 'CIÉNAGA TÓXICA', x: 0.187, y: 0.386, rx: 0.04, built: true },
  { id: '4-4', n: '4', name: 'TORMENTA TROPICAL', x: 0.2775, y: 0.418, rx: 0.04, built: true },
  { id: '4-5', n: '5', name: 'CHORROS DE ESPORAS', x: 0.362, y: 0.80, rx: 0.04, built: true, paint: true },
  { id: '4-6', n: '6', name: 'DENTRO DEL ÁRBOL', x: 0.46, y: 0.842, rx: 0.04, built: true },
  { id: '4-7', n: '7', name: 'LAS COPAS', x: 0.516, y: 0.544, rx: 0.04, built: true },
  { id: '4-8', n: '8', name: 'NIDO DE PLANTAS CARNÍVORAS', x: 0.5225, y: 0.331, rx: 0.04, built: true },
  { id: '4-9', n: '9', name: 'EL PUENTE COLGANTE', x: 0.6145, y: 0.348, rx: 0.04, built: true },
  { id: '4-10', n: '10', name: 'LA GRAN CASCADA', x: 0.5375, y: 0.887, rx: 0.04, built: true },
  { id: '4-11', n: '11', name: 'RÍO ABAJO', x: 0.64, y: 0.872, rx: 0.04, built: true },
  { id: '4-12', n: '12', name: 'EL LAGO DE LOS NENÚFARES', x: 0.734, y: 0.643, rx: 0.04, built: true },
  { id: '4-13', n: '13', name: 'LLUVIA DE SEMILLAS', x: 0.67, y: 0.214, rx: 0.04, built: true },
  { id: '4-14', n: '14', name: 'LA CUEVA DE LAS SETAS', x: 0.71, y: 0.321, rx: 0.04, built: true },
  { id: '4-15', n: '15', name: 'LA ESCALINATA', x: 0.746, y: 0.426, rx: 0.04, built: true },
  { id: '4-16', n: '16', name: 'RUINAS DEL TEMPLO', x: 0.811, y: 0.877, rx: 0.042, built: true, gold: true },
  { id: '4-J', n: '', name: 'JEFE · COLOSO DE LA SELVA', x: 0.892, y: 0.56, rx: 0.055, boss: true, built: true },
  { id: '4-B', n: '★', name: 'FASE SECRETA · NIDO DE LUCIÉRNAGAS', x: 0.44, y: 0.19, rx: 0.04, bonus: true, built: true, prev: 7, paint: true },
  { id: '4-C', n: '★', name: 'FASE SECRETA · JARDÍN FLOTANTE', x: 0.36, y: 0.12, rx: 0.04, bonus: true, built: true, prev: 17, paint: true },
  { id: '4-D', n: '★', name: 'FASE SECRETA · TRAS LA CASCADA', x: 0.566, y: 0.56, rx: 0.04, bonus: true, built: true, prev: 8, paint: true }
];
const WORLDS = [
  { n: 1, name: 'ESTACIÓN ORBITAL', img: 'mapa1', nodes: MAP1, col: '#29e6ff', fog: 'nebula' },
  { n: 2, name: 'PLANETA DE CRISTAL', img: 'mapa2', nodes: MAP2, col: '#9ff0ff', fog: 'snow' },
  { n: 3, name: 'PLANETA VOLCÁNICO', img: 'mapa3', nodes: MAP3, col: '#ffb040', fog: 'smoke' },
  { n: 4, name: 'SELVA LUMINOSA', img: 'mapa4', nodes: MAP4, col: '#9aff6a', fog: 'mist', plat: 'obj-plat4', platW: 0.0419, platA: [0.494, 0.377, 0.3988] }
];
// tramos sin camino dibujado: arco suave entre plataformas (la proporción del mapa se tiene en cuenta para que se vea redondo)
WORLDS.forEach(W => { const ar = W.img === 'mapa4' ? 4.03 : W.img === 'mapa3' ? 3.03 : 1.79; W.nodes.forEach((n, i) => { if (!i) return; const p = W.nodes[n.prev !== undefined ? n.prev : i - 1], dx = (n.x - p.x) * ar, dy = n.y - p.y, d = Math.hypot(dx, dy), lift = Math.min(0.05, d * 0.1); n.way = [];
  for (let k = 1; k < 6; k++) { const f = k / 6, bx = p.x + (n.x - p.x) * f, by = p.y + (n.y - p.y) * f - Math.sin(f * Math.PI) * lift; n.way.push([bx, by]); } }); });

const ALLN = () => WORLDS.reduce((a, w) => a.concat(w.nodes), []);
let curW = 0; try { curW = Math.min(WORLDS.length - 1, +localStorage.getItem('tl_w') || 0); } catch (e) {}
let MAP = WORLDS[curW].nodes;
function setWorld(w) { mapCam = null; curW = w; MAP = WORLDS[w].nodes; mapImg(w); try { localStorage.setItem('tl_w', String(w)); } catch (e) {} }
function mapImg(w) { const k = WORLDS[w].img; if (!IMG[k]) { const im = new Image(); im.src = 'img/' + TIER + '/' + k + '.webp?v=' + VERSION; IMG[k] = im; } return IMG[k]; }
const worldOf = id => WORLDS.findIndex(w => w.nodes.some(n => n.id === id));
const bossOf = w => WORLDS[w].nodes.find(n => n.boss);
const worldOpen = w => w === 0 || CHEAT.unlock || !!PROG[bossOf(w - 1).id] || DEV[WORLDS[w].nodes[0].id] === 1;
let bossBeatBefore = false, warp = null, mapHideLucas = false;
let PROG = {}, curId = '1-1', mapSel = 0, mapAt = 0, mapL = { x: MAP[0].x, y: MAP[0].y }, mapRoute = [], mapFace = 1, mapShake = { i: -1, t: 0 }, mapMsg = { txt: '', t: 0 }, mapUnl = null, mapParts = [], justOpened = -1;
try { PROG = JSON.parse(localStorage.getItem('tl_prog') || '{}') || {}; const os = +localStorage.getItem('tl_stars_1_1') || 0; if (os && !PROG['1-1']) PROG['1-1'] = { stars: os, best: +localStorage.getItem('tl_best_1_1') || 0 }; } catch (e) { PROG = {}; }
function saveProg() { try { localStorage.setItem('tl_prog', JSON.stringify(PROG)); } catch (e) {} cloudSave(); }
const mapPrev = i => MAP[i].prev !== undefined ? MAP[i].prev : i - 1;
let DEV = {}; try { DEV = JSON.parse(localStorage.getItem('tl_dev') || '{}') || {}; } catch (e) { DEV = {}; }
const isBuilt = n => n.built === true || (DEV[n.id] === 1 && typeof LEVELS[n.id] === 'function');
const mapOpen = i => i === 0 ? worldOpen(curW) : (CHEAT.unlock || !!PROG[MAP[mapPrev(i)].id] || DEV[MAP[i].id] === 1);
let devTap = { i: -1, n: 0, t: 0 };
function devTapOn(i) {            // 10 toques rápidos sobre una fase aún no publicada: la abre solo en este dispositivo
  const n = MAP[i], now = performance.now(); if (typeof LEVELS[n.id] !== 'function' || mapOpen(i)) return false;
  devTap = devTap.i === i && now - devTap.t < 700 ? { i, n: devTap.n + 1, t: now } : { i, n: 1, t: now };
  if (devTap.n < 10) return false;
  DEV[n.id] = 1; try { localStorage.setItem('tl_dev', JSON.stringify(DEV)); } catch (e) {}
  devTap = { i: -1, n: 0, t: 0 }; SFX.life(); mapMsg = { txt: 'MODO PRUEBAS · FASE ' + n.id + ' ABIERTA', t: 2.6 }; mapGo(i); return true;
}
// el mapa llena la pantalla; si no cabe entero (pantallas cuadradas o mapas panorámicos) la cámara sigue a Lucas
let mapCam = null, mapCamT = 0, mapFreeT = 0, mapDrag = null;
// mover el mapa a mano (ratón, dedo o L1/L2/R1/R2 y joystick derecho); a los 2 s sin tocar nada vuelve a enfocar a Lucas
function mapPanBy(dx, dy) { if (!mapCam) return; mapCam.x = Math.min(0, Math.max(VW - mapCam.w, mapCam.x + dx)); mapCam.y = Math.min(0, Math.max(VHv - mapCam.h, mapCam.y + dy)); mapFreeT = performance.now(); }
function mapTarget(w, h) { const fo = mapUnl && MAP[mapUnl.i].bonus && mapUnl.t > 0.25 ? MAP[mapUnl.i] : mapL, fx = fo.x * w, fy = fo.y * h;
  return [w > VW + 1 ? Math.min(0, Math.max(VW - w, VW * 0.5 - fx)) : (VW - w) / 2, h > VHv + 1 ? Math.min(0, Math.max(VHv - h, VHv * 0.55 - fy)) : (VHv - h) / 2]; }
function mapT() { const im = mapImg(curW), iw = im && im.naturalWidth || 16, ih = im && im.naturalHeight || 9, sc = Math.max(VW / iw, VHv / ih), w = iw * sc, h = ih * sc;
  const tg = mapTarget(w, h); if (!mapCam || mapCam.w !== w || mapCam.h !== h) mapCam = { x: tg[0], y: tg[1], w, h };
  return { sc, w, h, u: Math.min(w, h * 1.8), ox: Math.min(0, Math.max(VW - w, mapCam.x)), oy: Math.min(0, Math.max(VHv - h, mapCam.y)) }; }
function mapCamStep() { const t = mapT(), tg = mapTarget(t.w, t.h), now = performance.now(), dt = Math.min(0.05, (now - (mapCamT || now)) / 1000); mapCamT = now;
  if (now - mapFreeT < 2000 && !mapRoute.length && !mapUnl) return;
  const k = Math.min(1, dt * 3.5); mapCam.x += (tg[0] - mapCam.x) * k; mapCam.y += (tg[1] - mapCam.y) * k; }
const mapPt = (t, fx, fy) => [t.ox + fx * t.w, t.oy + fy * t.h];
function mapPath(a, b) {            // puntos (en fracciones) para ir de la fase a a la fase b siguiendo el tubo
  const up = i => { const l = [i]; while (i > 0) { i = mapPrev(i); l.push(i); } return l; };
  const ua = up(a), ub = up(b), lca = ua.find(x => ub.includes(x)), pts = [];
  for (const c of ua) { if (c === lca) break; pts.push(...MAP[c].way.slice().reverse()); const q = MAP[mapPrev(c)]; pts.push([q.x, q.y]); }
  for (const d of ub.slice(0, ub.indexOf(lca)).reverse()) { pts.push(...MAP[d].way); pts.push([MAP[d].x, MAP[d].y]); }
  return pts;
}
function mapGo(i) { mapFreeT = 0; mapRoute = mapPath(mapAt, i); mapSel = i; mapInfo(); }
function openMap() {
  try { licRefresh(); } catch (e) {}
  audio(); startMusic(); goFull();
  state = 'map'; paused = false; mapRoute = []; mapAt = mapSel; mapL = { x: MAP[mapSel].x, y: MAP[mapSel].y }; mapCam = null;
  show('title', false); show('panel', false); show('top', false); show('touch', false); show('mapUI', true); mapInfo(); checkRot();
}
function toMap(advance) {
  tmpOff();
  if (L && L.custom) { tallerBack(); return; }
  paused = false; state = 'map';
  show('panel', false); show('top', false); show('touch', false); show('mapUI', true);
  const i = MAP.findIndex(n => n.id === curId);
  if (advance && justOpened >= 0) { mapUnl = { i: justOpened, t: 0, snd: false }; }
  else if (advance && i >= 0 && MAP[i].boss && curW + 1 < WORLDS.length && !bossBeatBefore) { setTimeout(() => { if (state === 'map') startWarp(curW + 1); }, 1100); }
  else if (advance && i >= 0 && MAP[i].boss && curW + 1 >= WORLDS.length) { setTimeout(() => { if (state === 'map') showTheEnd(); }, 900); }
  else if (advance && i >= 0) { const nx = MAP.findIndex((n, k) => k > i && !n.bonus && mapPrev(k) === i); if (nx >= 0 && mapOpen(nx)) mapGo(nx); }
  justOpened = -1;
  mapInfo(); checkRot(); setTimeout(updApply, 4000);
}
function mapInfo() {
  const n = MAP[mapSel], pr = PROG[n.id];
  $('mTitle').textContent = (n.boss || n.bonus ? '' : 'FASE ' + n.id + ' · ') + n.name;
  $('mSub').innerHTML = !isBuilt(n) ? 'PRÓXIMAMENTE' : pr ? 'Mejor: ' + pr.best + ' puntos · <span class="mst">' + '★'.repeat(pr.stars) + '</span><span class="mso">' + '★'.repeat(3 - pr.stars) + '</span>' : '¡Fase nueva! Consigue las 3 estrellas';
  $('mPlay').disabled = !isBuilt(n);
}
function mapDeny(i) { mapShake = { i, t: 0.45 }; mapMsg = { txt: 'BLOQUEADA · supera antes la fase anterior', t: 2.2 }; SFX.bump(); }
const testBoss = i => CHEAT.test && MAP[i] && MAP[i].boss;      // en modo pruebas el jefe siempre se puede pisar (para viajar al planeta siguiente)
function mapSelect(i) {
  if (i < 0 || i >= MAP.length || mapUnl) return;
  if (!mapOpen(i) && !testBoss(i)) return mapDeny(i);
  if (i === mapSel) { if (!mapRoute.length) mapPlay(); return; }
  SFX.chip(); mapGo(i);
}
function mapMove(d) {          // mando/teclado: va a la fase conectada que está en esa dirección del dibujo
  if (mapUnl) return;
  const cur = MAP[mapSel], nb = MAP.map((n, k) => k).filter(k => k !== mapSel && (k === mapPrev(mapSel) && mapSel > 0 || mapPrev(k) === mapSel && k > 0));
  const dir = d === 1 ? [1, 0] : d === -1 ? [-1, 0] : d === 2 ? [0, -1] : [0, 1], t = mapT();
  let best = -1, bs = -1e9;
  for (const k of nb) { const dx = (MAP[k].x - cur.x) * t.w, dy = (MAP[k].y - cur.y) * t.h, dd = Math.hypot(dx, dy) || 1, dot = (dx * dir[0] + dy * dir[1]) / dd; if (dot < 0.2) continue; const sc = dot * 2 - dd / 2000 + (d === 1 && k > mapSel ? 0.3 : 0) + (d === -1 && k < mapSel ? 0.3 : 0); if (sc > bs) { bs = sc; best = k; } }
  if (best < 0) return;
  if (!mapOpen(best) && !testBoss(best)) return mapDeny(best);
  SFX.chip(); mapGo(best);
}
function mapPlay(force) {
  if (mapUnl || mapRoute.length || warp) return; const n = MAP[mapSel]; if (!isBuilt(n)) { mapMsg = { txt: 'PRÓXIMAMENTE', t: 1.6 }; SFX.bump(); return; }
  // en el jefe ya superado se puede viajar al mundo siguiente; en la primera fase de un mundo, volver al anterior
  if (!force && n.boss && curW + 1 < WORLDS.length && (PROG[n.id] || worldOpen(curW + 1) || CHEAT.test)) return askTravel('JUGAR EL JEFE', 'VIAJAR AL PLANETA ' + WORLDS[curW + 1].n, curW + 1);
  if (!force && mapSel === 0 && curW > 0) return askTravel('JUGAR FASE ' + n.id, 'VOLVER AL PLANETA ' + WORLDS[curW - 1].n, curW - 1);
  if (licGated(n.id) && !licOk()) { showPaywall(() => mapPlay(true)); return; }
  curId = n.id; evt('jugar', curId); startGame();
}
function askTravel(playTxt, goTxt, w) {
  const c = $('card'); c.classList.remove('tips'); SFX.chip();
  c.innerHTML = '<h2>' + (w > curW ? '🚀 ¿SIGUIENTE PLANETA?' : '🚀 ¿VOLVER ATRÁS?') + '</h2><div style="color:#cfe0ff;margin:4px 0 10px">' + (w > curW ? 'Puedes jugar esta fase o despegar hacia <b>' + WORLDS[w].name + '</b>.' : 'Puedes jugar esta fase o volar de vuelta a <b>' + WORLDS[w].name + '</b>.') + '</div>' +
    '<div class="row"><button class="btn" id="tvGo" style="border-color:#35ff8a;box-shadow:0 0 16px rgba(53,255,138,.6)">' + goTxt + '</button><button class="btn" id="tvPlay">' + playTxt + '</button><button class="btn" id="tvX">VOLVER</button></div>';
  show('panel', true);
  $('tvGo').onclick = () => { show('panel', false); startWarp(w); };
  $('tvPlay').onclick = () => { show('panel', false); mapPlay(true); };
  $('tvX').onclick = () => show('panel', false);
}
function mapUpdate(dt) {
  const t = mapT();
  if (mapUnl) {
    const sb = MAP[mapUnl.i].bonus;
    if (!mapUnl.snd) { mapUnl.snd = true; if (sb) { tone(180, 520, 1.0, 'sine', 0.06); } else { tone(220, 1320, 1.5, 'sawtooth', 0.05); tone(330, 1980, 1.5, 'sine', 0.08); } }
    mapUnl.t += dt / (sb ? 3.2 : 1.6);
    if (sb) secretFx(t, mapUnl);
    if (mapUnl.t >= 1) { const i = mapUnl.i; mapUnl = null; SFX.life(); const [x, y] = mapPt(t, MAP[i].x, MAP[i].y); if (!MAP[i].bonus) { for (let k = 0; k < 34; k++) { const a = Math.random() * 6.283, v = 60 + Math.random() * 200; mapParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 60, life: 0.9, max: 0.9, col: k % 2 ? '#7fe9ff' : '#fff', size: 2 + Math.random() * 2.5 }); } mapGo(i); } else mapMsg = { txt: '★ ¡FASE SECRETA DESCUBIERTA! ★', t: 3.2, ok: true }; }
  }
  let step = 330 * dt;
  while (mapRoute.length && step > 0) {
    const [tx, ty] = mapPt(t, mapRoute[0][0], mapRoute[0][1]), [lx, ly] = mapPt(t, mapL.x, mapL.y), dx = tx - lx, dy = ty - ly, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) mapFace = dx > 0 ? 1 : -1;
    if (d <= step) { mapL = { x: mapRoute[0][0], y: mapRoute[0][1] }; mapRoute.shift(); step -= d; if (!mapRoute.length) { mapAt = mapSel; SFX.stomp(); } }
    else { mapL = { x: mapL.x + dx / d * step / t.w, y: mapL.y + dy / d * step / t.h }; step = 0; }
  }
  if (mapRoute.length) { const [lx, ly] = mapPt(t, mapL.x, mapL.y); for (let k = 0; k < 2; k++) mapParts.push({ x: lx + (Math.random() - 0.5) * 14, y: ly + (Math.random() - 0.5) * 8, vx: -mapFace * (20 + Math.random() * 50), vy: 10 + Math.random() * 40, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#7fe9ff' : '#ffd08a', size: 1.5 + Math.random() * 2.2 }); }
  for (const q of mapParts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!q.nog) q.vy += 120 * dt; }
  mapParts = mapParts.filter(q => q.life > 0);
  mapShake.t = Math.max(0, mapShake.t - dt); mapMsg.t = Math.max(0, mapMsg.t - dt);
}
function polyAt(pts, f) {            // punto a la fracción f (0..1) de una línea quebrada
  let tot = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
  let d = f * tot; for (let i = 0; i < ls.length; i++) { if (d <= ls[i] || i === ls.length - 1) { const k = ls[i] ? Math.min(1, d / ls[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, i]; } d -= ls[i]; }
  return [pts[0][0], pts[0][1], 0];
}
const FOGC = { nebula: ['150,120,255', '90,170,255', '#e6dcff'], snow: ['225,240,255', '190,215,245', '#ffffff'], smoke: ['70,55,65', '110,70,60', '#ffb040'], mist: ['150,255,200', '90,220,160', '#eaff6a'] };
function mapFog(x, y, rx, a, i, v) {          // nube que tapa una base secreta; v = remolino (0..1) al descubrirla
  const st = WORLDS[curW].fog || 'snow', C = FOGC[st], R = rx * 2.7 * (1 - v * 0.85), sp = 0.15 + v * v * 9;
  for (let k = 0; k < 11; k++) { const an = k / 11 * 6.283 + time * sp + i + v * v * 6, d = R * (0.3 + 0.28 * Math.sin(time * 0.7 + k * 1.7)), px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.55, r = R * (0.42 + 0.14 * Math.sin(time + k));
    const g = ctx.createRadialGradient(px, py, 0, px, py, Math.max(1, r)); g.addColorStop(0, 'rgba(' + C[k % 2] + ',' + (st === 'smoke' ? 0.8 : 0.6) * a + ')'); g.addColorStop(1, 'rgba(' + C[k % 2] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, Math.max(1, r), 0, 6.283); ctx.fill(); }
  // el núcleo de la nube, más denso, para que no se vea lo que hay debajo
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.8); g.addColorStop(0, 'rgba(' + C[0] + ',' + 0.85 * a + ')'); g.addColorStop(1, 'rgba(' + C[0] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R * 0.8, R * 0.5, 0, 0, 6.283); ctx.fill();
  // brillitos propios de cada planeta (polvo de estrellas, copos, brasas, luciérnagas)
  if (Math.random() < 0.18 * a) mapParts.push({ x: x + (Math.random() - 0.5) * R * 1.6, y: y + (Math.random() - 0.5) * R * 0.8, vx: (Math.random() - 0.5) * 20, vy: st === 'smoke' ? -25 - Math.random() * 20 : st === 'snow' ? 15 : (Math.random() - 0.5) * 20, life: 1.4, max: 1.4, col: C[2], size: 1.2 + Math.random() * 1.6, nog: 1 });
}
function secretFx(t, u) {                    // la secuencia de "descubrir" una base secreta
  const n = MAP[u.i], [x, y] = mapPt(t, n.x, n.y), R = n.rx * t.u, C = FOGC[WORLDS[curW].fog || 'snow'];
  if (u.t > 0.32 && u.t < 0.6) { if (!u.s1) { u.s1 = 1; tone(70, 420, 0.95, 'sawtooth', 0.045); tone(140, 840, 0.95, 'triangle', 0.04); }
    mapShake = { i: u.i, t: 0.05 }; for (let k = 0; k < 3; k++) { const a = Math.random() * 6.283, d = R * (3 + Math.random() * 2); mapParts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, vx: -Math.cos(a) * d * 2.2, vy: -Math.sin(a) * d * 1.3, life: 0.45, max: 0.45, col: k ? C[2] : '#ffffff', size: 1.5 + Math.random() * 2, nog: 1 }); } }
  if (u.t >= 0.6 && !u.s2) { u.s2 = 1; SFX.life(); tone(500, 2600, 0.7, 'sine', 0.09); tone(750, 3000, 0.5, 'triangle', 0.05, 0.08);
    for (let k = 0; k < 70; k++) { const a = Math.random() * 6.283, v = 80 + Math.random() * 320; mapParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 120, life: 1.2 + Math.random() * 0.6, max: 1.8, col: ['#ffd23c', '#fff6c8', '#ffffff', C[2]][k % 4], size: 1.8 + Math.random() * 3 }); } }
}
function drawSecretFx(x, y, R, p) {           // destello, ondas y columna de luz (p = progreso del descubrimiento)
  if (p < 0.6) return; const q = (p - 0.6) / 0.4; ctx.globalCompositeOperation = 'lighter';
  const bw = R * (1.3 - q * 0.6), bh = R * 9, ba = Math.max(0, 1 - q) * 0.75, bg = ctx.createLinearGradient(x, y - bh, x, y); bg.addColorStop(0, 'rgba(255,230,140,0)'); bg.addColorStop(1, 'rgba(255,240,180,' + ba + ')');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x - bw * 0.3, y - bh); ctx.lineTo(x + bw * 0.3, y - bh); ctx.lineTo(x + bw, y); ctx.lineTo(x - bw, y); ctx.fill();
  for (let k = 0; k < 3; k++) { const w = q * 2.2 - k * 0.25; if (w <= 0 || w >= 1) continue; ctx.strokeStyle = 'rgba(255,225,120,' + (1 - w) + ')'; ctx.lineWidth = 6 * (1 - w) + 1; ctx.beginPath(); ctx.ellipse(x, y, R * (1 + w * 7), R * (1 + w * 7) * 0.4, 0, 0, 6.283); ctx.stroke(); }
  if (q < 0.25) { const fa = 1 - q / 0.25, fg = ctx.createRadialGradient(x, y, 0, x, y, R * 8); fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')'); fg.addColorStop(0.3, 'rgba(255,230,150,' + fa * 0.6 + ')'); fg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, R * 8, 0, 6.283); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
}
function drawTrail(pts, frac, col, u, r0, r1) {    // camino suave entre dos plataformas (sin efectos, ligero)
  let tot = 0; const ls = []; for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); ls.push(l); tot += l; }
  const a = r0 / tot, b = Math.min(frac, 1 - r1 / tot); if (b <= a) return;
  const N = 24, P = []; for (let k = 0; k <= N; k++) P.push(polyAt(pts, a + (b - a) * k / N));
  const line = () => { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= N; k++) ctx.lineTo(P[k][0], P[k][1]); ctx.stroke(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,12,.4)'; ctx.lineWidth = Math.max(6, 0.011 * u); line();
  ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = Math.max(5, 0.009 * u); line();
  ctx.globalAlpha = 0.95; ctx.lineWidth = Math.max(2, 0.0034 * u); line();
  ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 0.0012 * u); line(); ctx.globalAlpha = 1;
}
function drawPaintPlat(x, y, s) {             // plataforma dibujada por el juego (para las bases que no vienen en la ilustración)
  const W = WORLDS[curW], im = W.plat && xi(W.plat); if (!okI(im)) return; const t = mapT(), w = W.platW * t.w * s, h = w * W.platA[2];
  ctx.drawImage(im, x - w * W.platA[0], y - h * W.platA[1], w, h);
}
function drawMap() {
  mapCamStep(); const t = mapT(), u = t.u, im = mapImg(curW);
  if (im && im.naturalWidth) ctx.drawImage(im, t.ox, t.oy, t.w, t.h); else drawBackground();
  // caminos entre fases (sólo los ya abiertos; se van dibujando al abrirse)
  for (let i = 1; i < MAP.length; i++) {
    const n = MAP[i], open = mapOpen(i), ing = mapUnl && mapUnl.i === i, unl = ing ? (n.bonus ? Math.min(1, mapUnl.t / 0.32) : Math.min(1, mapUnl.t / 0.8)) : (open ? 1 : 0);
    if (unl <= 0) continue;
    const pv = MAP[mapPrev(i)], full = [mapPt(t, pv.x, pv.y), ...n.way.map(p => mapPt(t, p[0], p[1])), mapPt(t, n.x, n.y)];
    drawTrail(full, unl, n.bonus ? '#ffd34a' : WORLDS[curW].col, u, pv.rx * u * 0.9, n.rx * u * 0.9);
  }
  // plataformas de cada fase
  const post = [];
  for (let i = 0; i < MAP.length; i++) {
    const n = MAP[i], ing = mapUnl && mapUnl.i === i, sp = ing && n.bonus ? mapUnl.t : 1, open = mapOpen(i) && (!ing || (n.bonus && sp >= 0.6)), dn = PROG[n.id], sel = i === mapSel, pu = 0.5 + 0.5 * Math.sin(time * 4 + i), rx = n.rx * u, ry = rx * 0.4;
    let [x, y] = mapPt(t, n.x, n.y); if (mapShake.i === i && mapShake.t > 0) x += Math.sin(mapShake.t * 60) * 5;
    const col = dn ? '53,255,138' : n.boss ? '255,70,80' : n.gold || n.bonus ? '255,205,70' : '41,230,255';
    if (!open) {
      const fade = ing && !n.bonus ? 1 - Math.max(0, mapUnl.t - 0.75) * 4 : 1;
      if (n.bonus) { mapFog(x, y, rx, 1, i, ing ? Math.max(0, Math.min(1, (sp - 0.32) / 0.28)) : 0); continue; }          // las bases secretas están tapadas por una nube hasta que se descubren
      ctx.globalAlpha = fade; spr(IMG['ico-candado'], x, y + ry * 0.75 + Math.sin(time * 2 + i) * 1.5, rx * 1.55, 0.5, 1); ctx.globalAlpha = 1;
      continue;
    }
    if (ing && n.bonus) { const q = Math.min(1, (sp - 0.6) / 0.15), s = q < 1 ? Math.sin(q * 2.1) * 1.18 : 1; if (n.paint) drawPaintPlat(x, y, Math.max(0.05, s)); drawSecretFx(x, y, rx, sp); if (sp < 0.66) continue; }
    else if (n.paint) drawPaintPlat(x, y, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 3 + pu * 2; ctx.strokeStyle = 'rgba(' + col + ',' + (0.55 + 0.35 * pu) + ')'; ctx.shadowColor = 'rgb(' + col + ')'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.9, ry * 0.9, 0, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    if (sel) { ctx.setLineDash([rx * 0.26, rx * 0.2]); ctx.lineDashOffset = -time * 40; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 + 0.3 * pu) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.68, ry * 0.68, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
    if (n.boss) spr(curW === 3 && okI(xi('jefe4')) ? IMG.jefe4 : curW === 2 && okI(xi('jefe3')) ? IMG.jefe3 : curW === 1 && okI(xi('jefe2')) ? IMG.jefe2 : IMG.jefe1, x, y + ry * 0.4, rx * 1.4, 0.5, 1);
    else { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); ctx.font = '900 ' + Math.round(rx * 1.05) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = rx * 0.1; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.strokeText(n.n, 0, rx * 0.04); ctx.fillStyle = n.gold || n.bonus ? '#6a3d00' : '#0d1a55'; ctx.fillText(n.n, 0, rx * 0.04); ctx.restore(); }
    if (dn) post.push(() => {
      const fx = x + rx * 0.95, fy = y - ry * 0.1;
      ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(fx + rx * 0.4, fy - rx * 0.8, 0, fx + rx * 0.4, fy - rx * 0.8, rx * 0.9); fg.addColorStop(0, 'rgba(53,255,138,' + (0.35 + 0.2 * pu) + ')'); fg.addColorStop(1, 'rgba(53,255,138,0)'); ctx.fillStyle = fg; ctx.fillRect(fx - rx * 0.6, fy - rx * 1.8, rx * 2, rx * 2); ctx.globalCompositeOperation = 'source-over';
      spr(IMG['ico-bandera'], fx, fy, rx * 1.35, 0.12, 1, false, Math.sin(time * 3 + i) * 0.06);
      for (let k = 0; k < 3; k++) spr(IMG[k < dn.stars ? 'ico-estrella' : 'ico-estrella-off'], x + (k - 1) * rx * 0.66, y + rx * 1.22 + (k === 1 ? rx * 0.08 : 0), rx * 0.6, 0.5, 0.5);
    }); else if (!isBuilt(n)) { ctx.font = '800 ' + Math.max(9, Math.round(rx * 0.38)) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#05071a'; ctx.fillText('PRONTO', x + 1, y + rx * 1.25 + 1); ctx.fillStyle = '#cfe0ff'; ctx.fillText('PRONTO', x, y + rx * 1.25); }
  }
  // chispas y Lucas recorriendo el tubo
  ctx.globalCompositeOperation = 'lighter';
  for (const q of mapParts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.283); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const moving = mapRoute.length > 0, pose = moving ? 'lucas-avanzando' : 'lucas-quieto', lim = IMG[pose], [lx, ly0] = mapPt(t, mapL.x, mapL.y);
  const hL = Math.max(58, 0.074 * u), k = hL / 480, by = ly0 + 0.004 * u - (moving ? 6 : 3) + Math.sin(time * 3) * 2.5, fs = mapFace;
  if (!mapHideLucas) {
  ctx.fillStyle = 'rgba(0,0,10,.3)'; ctx.beginPath(); ctx.ellipse(lx, ly0 + 0.004 * u, hL * 0.26, hL * 0.07, 0, 0, 6.283); ctx.fill();
  CAN[pose].forEach((o, i) => flame(lx + fs * o[0] * k, by - o[1] * k - 2, (moving ? 0.34 : 0.15) * hL * (i === 1 ? 1.1 : 1), hL * 0.09, i + 1));
  spr(lim, lx, by, (lim.naturalHeight || 240) * KS * k, ANCH[pose], 1, fs < 0, moving ? 0.07 * fs : 0); }
  post.forEach(f => f());          // banderas y estrellas por encima de Lucas
  // cabecera y zona de botones
  const hg = ctx.createLinearGradient(0, 0, 0, 110); hg.addColorStop(0, 'rgba(4,6,22,.7)'); hg.addColorStop(1, 'rgba(4,6,22,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, 110);
  const bg = ctx.createRadialGradient(VW - 150, VHv + 20, 30, VW - 150, VHv + 20, 420); bg.addColorStop(0, 'rgba(4,6,22,.92)'); bg.addColorStop(0.5, 'rgba(4,6,22,.7)'); bg.addColorStop(1, 'rgba(4,6,22,0)'); ctx.fillStyle = bg; ctx.fillRect(VW - 570, VHv - 400, 570, 400);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '800 14px system-ui,sans-serif'; ctx.fillStyle = '#7fe9ff'; ctx.fillText('PLANETA ' + WORLDS[curW].n, 22, 32);
  ctx.font = '800 26px system-ui,sans-serif'; ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff'; ctx.fillText(WORLDS[curW].name, 22, 60); ctx.shadowBlur = 0;
  const done = MAP.filter(n => PROG[n.id]).length, stars = MAP.reduce((a, n) => a + (PROG[n.id] ? PROG[n.id].stars : 0), 0);
  ctx.font = '700 13px system-ui,sans-serif'; ctx.fillStyle = '#cfe0ff'; ctx.fillText(done + ' / ' + MAP.length + ' fases', 22, 82);
  spr(IMG['ico-estrella'], 112, 77, 16, 0.5, 0.5); ctx.fillStyle = '#ffd23c'; ctx.fillText(stars + ' / ' + MAP.length * 3, 124, 82);
  if (mapMsg.t > 0) { ctx.globalAlpha = Math.min(1, mapMsg.t * 2); ctx.font = '800 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(mapMsg.txt).width + 28, my = VHv * 0.16; ctx.fillStyle = mapMsg.ok ? 'rgba(4,30,40,.9)' : 'rgba(40,10,20,.9)'; ctx.fillRect(VW / 2 - w / 2, my - 16, w, 32); ctx.strokeStyle = mapMsg.ok ? '#35ff8a' : '#ff5a6a'; ctx.lineWidth = 2; ctx.strokeRect(VW / 2 - w / 2, my - 16, w, 32); ctx.fillStyle = mapMsg.ok ? '#d6fff0' : '#ffd0d6'; ctx.fillText(mapMsg.txt, VW / 2, my); ctx.globalAlpha = 1; }
  ctx.textBaseline = 'alphabetic';
}
cv.addEventListener('pointerdown', e => {
  if (state === 'play') tapCount();
  if (state === 'warp') { if (warp && warp.t > 1.8 && warp.t < 3.9) warp.t = 3.9; return; }
  if (state !== 'map') return;
  mapDrag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
});
cv.addEventListener('pointermove', e => {
  if (state !== 'map' || !mapDrag || e.pointerId !== mapDrag.id) return;
  if (!mapDrag.moved && Math.hypot(e.clientX - mapDrag.sx, e.clientY - mapDrag.sy) > 10) mapDrag.moved = true;
  if (mapDrag.moved) { mapPanBy((e.clientX - mapDrag.x) * DPR / SC, (e.clientY - mapDrag.y) * DPR / SC); cv.style.cursor = 'grabbing'; }
  mapDrag.x = e.clientX; mapDrag.y = e.clientY;
});
addEventListener('pointerup', e => {
  if (!mapDrag || e.pointerId !== mapDrag.id) return; const d = mapDrag; mapDrag = null; cv.style.cursor = '';
  if (state !== 'map' || d.moved || e.target !== cv) return;
  const x = e.clientX * DPR / SC, y = e.clientY * DPR / SC, t = mapT();
  for (let i = MAP.length - 1; i >= 0; i--) { const [nx, ny] = mapPt(t, MAP[i].x, MAP[i].y), rx = MAP[i].rx * t.u; if (((x - nx) / (rx * 1.75)) ** 2 + ((y - ny - rx * 0.2) / (rx * 1.2)) ** 2 < 1) { if (!devTapOn(i)) mapSelect(i); return; } }
  mapEmptyTap();
});
$('mPlay').onclick = () => mapPlay(); $('mBack').onclick = toMenu;
$('btnPlay').onclick = () => { if (ACC || GUEST) openMap(); else showAccess(); };
// en iPhone los toques cerca del borde de arriba a veces no llegan como "click": estos botones responden al levantar el dedo
function tapBind(el, fn) { if (!el) return; let last = 0; const go = e => { if (e) { e.preventDefault(); e.stopPropagation(); } const n = Date.now(); if (n - last < 450) return; last = n; fn(); };
  el.addEventListener('touchend', go, { passive: false }); el.addEventListener('click', go); }
tapBind($('btnPause'), togglePause);
// ajustes: buscar actualizaciones (fuerza la descarga de la última versión), sonido y botones táctiles
async function forceUpdate(v) {
  try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (e) {}
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.update().catch(() => {}))); } } catch (e) {}
  location.replace(location.pathname + '?u=' + encodeURIComponent(v || VERSION) + '&t=' + Date.now());
}
async function checkUpdates() {
  uiDialog({ icon: '🛰️', title: 'BUSCANDO ACTUALIZACIONES…', html: 'Conectando con la base de COSMOLUCAS…', buttons: [] });
  let j = null; try { j = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null); } catch (e) {}
  if (!j || !j.v) { uiDialog({ icon: '📡', title: 'SIN CONEXIÓN', html: 'No hemos podido comprobar si hay versión nueva. Revisa tu conexión a internet y vuelve a intentarlo.', buttons: [{ t: 'ENTENDIDO', cls: 'ok', v: 1 }] }); return; }
  if (j.v !== VERSION) { await uiDialog({ icon: '🚀', tone: 'gold', title: '¡VERSIÓN NUEVA DISPONIBLE!', html: 'Tienes la <b>v' + VERSION + '</b> y ya está lista la <b>v' + esc(j.v) + '</b> con mejoras y novedades.<br><br>Vamos a instalarla ahora mismo: tu progreso no se pierde.', buttons: [{ t: '⬇ ACTUALIZAR AHORA', cls: 'ok', v: 1 }] }); forceUpdate(j.v); return; }
  const v = await uiDialog({ icon: '✅', title: '¡ESTÁS AL DÍA!', html: 'Tienes la <b>última versión de COSMOLUCAS (v' + VERSION + ')</b>.<br>Lucas tiene los propulsores a punto y todo funciona con lo más nuevo. 🚀<br><br><span style="color:#8ea3e6;font-size:13px">Si notas algo raro, puedes reinstalar el juego desde aquí: no se pierde tu progreso.</span>', buttons: [{ t: 'REINSTALAR', v: 2 }, { t: 'GENIAL', cls: 'ok', v: 1 }] });
  if (v === 2) forceUpdate(VERSION);
}
tapBind($('btnCfg'), async () => {
  const v = await uiDialog({ icon: '⚙️', title: 'AJUSTES', html: 'Versión instalada: <b>v' + VERSION + '</b>', buttons: [{ t: '🔄 BUSCAR ACTUALIZACIONES', cls: 'ok', v: 'upd' }, { t: sndOn ? '🔊 SONIDO: SÍ' : '🔇 SONIDO: NO', v: 'snd' }].concat(TOUCH ? [{ t: '🎮 POSICIÓN DE LOS BOTONES', v: 'tp' }] : []).concat([{ t: 'CERRAR', v: 0 }]) });
  if (v === 'upd') checkUpdates(); else if (v === 'snd') { audio(); setSnd(!sndOn); } else if (v === 'tp') $('btnTouch').dispatchEvent(new Event('click'));
});
// posición de los botones táctiles (rueda ⚙ arriba): izquierda y derecha, bajos / medios / altos, se guarda en el dispositivo
const TP_LV = [0, 13, 26];       // cuánto se suben (en % de la altura de la pantalla)
let TPOS = { l: 0, r: 0 }; try { TPOS = Object.assign(TPOS, JSON.parse(localStorage.getItem('tl_tpos') || '{}')); } catch (e) {}
function tpApply() { const r = document.documentElement.style; r.setProperty('--tpl', TP_LV[TPOS.l] + 'vh'); r.setProperty('--tpr', TP_LV[TPOS.r] + 'vh'); }
tpApply();
(() => { const b = document.createElement('button'); b.className = 'btn'; b.id = 'btnTouch'; b.setAttribute('aria-label', 'Posición de los botones'); b.textContent = '⚙'; b.style.display = TOUCH ? '' : 'none'; $('top').prepend(b);
  tapBind(b, async () => {
    const wasP = paused; if (state === 'play' && !paused) togglePause(); show('panel', false);
    const row = (side, t) => '<div class="tpr"><b>' + t + '</b>' + ['⬇ BAJOS', 'MEDIO', '⬆ ALTOS'].map((x, i) => '<button class="btn' + (TPOS[side] === i ? ' on' : '') + '" data-tp="' + side + i + '">' + x + '</button>').join('') + '</div>';
    const p = uiDialog({ wrap: 'tp', title: '🎮 POSICIÓN DE LOS BOTONES', html: 'Elige a qué altura quieres los botones de cada lado. Se quedan guardados en este dispositivo.' + row('l', '◀ ▶ ▼ Izquierda') + row('r', 'SALTAR · LÁSER Derecha'), buttons: [{ t: '✔ LISTO', cls: 'ok', v: 1 }] });
    $('uidlg').querySelectorAll('[data-tp]').forEach(x => x.onclick = () => { const sd = x.dataset.tp[0], i = +x.dataset.tp[1]; TPOS[sd] = i; tpApply(); try { localStorage.setItem('tl_tpos', JSON.stringify(TPOS)); } catch (e) {}
      $('uidlg').querySelectorAll('[data-tp^="' + sd + '"]').forEach(y => y.classList.toggle('on', y === x)); tone(900, 900, 0.04, 'square', 0.05); });
    show('touch', true); await p; show('touch', state === 'play' && !padUsed);
    if (state === 'play' && paused && !wasP) togglePause(); }); })();
tapBind($('btnMute'), () => { audio(); setSnd(!sndOn); });
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
  else infoPanel('INSTALAR', 'Abre el menú del navegador <b>⋮</b> y elige <b>"Instalar aplicación"</b> o <b>"Añadir a pantalla de inicio"</b>.<br>Tendrás COSMOLUCAS como una app más, a pantalla completa.');
};
$('iosOk').onclick = () => show('ios', false);
// compartir: solo texto + enlace, para que WhatsApp muestre la tarjeta con imagen
$('btnShare').onclick = () => {
  const url = 'https://puntofibra.github.io/turbolucas/?c=cosmo10', text = '¡Juega a COSMOLUCAS! Viaja con Lucas por 10 planetas 🚀';
  if (navigator.share) navigator.share({ title: 'COSMOLUCAS', text, url }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
};

/* ---------- portada: web del creador, consejos e instalar (todo con el estilo del juego, nada de alerts) ---------- */
const API = 'https://script.google.com/macros/s/AKfycbxtRso7g_0i53NRLJZFdM22TF2GW2EtzgwMZ3Mavq5ZVK6Ni0lXQNVXid6U7j5RL3wodQ/exec';
function api(d) { return fetch(API, { method: 'POST', body: JSON.stringify(d) }).then(r => r.json()).catch(() => ({ ok: false, error: 'Sin conexión. Inténtalo otra vez.' })); }
function evt(e, f) { try { api(Object.assign({ a: 'evt', e, f }, who())); } catch (x) {} }
try { const k = 'tl_vis_' + new Date().toISOString().slice(0, 10); if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); setTimeout(() => evt('visita'), 3000); } } catch (e) {}
(() => { const st = document.createElement('style'); st.textContent = `
.card.tips{width:min(94vw,760px);max-height:92vh;display:flex;flex-direction:column;text-align:left;padding:14px 18px}
.card.tips h2{text-align:center}
.tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:4px 0 10px}
.tabs .btn{font-size:12px;padding:7px 10px;border-radius:10px;opacity:.75}
.tabs .btn.on{opacity:1;border-color:var(--gr);box-shadow:0 0 14px rgba(53,255,138,.55),inset 0 0 10px rgba(53,255,138,.2)}
.tbody{overflow-y:auto;touch-action:pan-y;overscroll-behavior:contain;flex:1;min-height:0;font-size:clamp(12px,2.5vh,15px);line-height:1.45;color:#cfe0ff;padding-right:4px;scrollbar-width:thin}
.tbody h3{margin:8px 0 4px;font-size:1.05em;color:#fff;letter-spacing:.04em;text-shadow:0 0 10px rgba(41,230,255,.7)}
.tbody b{color:#fff}.tbody .k{display:inline-block;min-width:22px;padding:1px 6px;margin:1px 2px;border:1px solid #29e6ff;border-radius:6px;background:rgba(41,230,255,.12);color:#fff;font-weight:800;font-size:.9em;text-align:center}
.tgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
.tit{display:flex;gap:10px;align-items:flex-start;background:rgba(41,230,255,.06);border:1px solid rgba(41,230,255,.25);border-radius:12px;padding:8px 10px}
.tit .ic{font-size:24px;line-height:1;flex:none;width:34px;text-align:center}.tit img{width:40px;height:40px;object-fit:contain;flex:none}
.tit p{margin:0;overflow-wrap:anywhere}
@media (max-height:460px){.card.tips{padding:8px 12px;max-height:96vh}.card.tips h2{font-size:18px;margin:0}.tabs{margin:2px 0 6px}.tabs .btn{padding:5px 8px;font-size:11px}.tfoot{margin-top:6px}.tfoot .btn{padding:6px 14px}.tit{padding:6px 8px}}.tfoot{text-align:center;margin-top:10px}`; document.head.appendChild(st); })();
const TIPS = {
  'DÓNDE JUGAR': `<div class="tgrid">
    <div class="tit"><div class="ic">📱</div><p><b>Móvil y tablet</b><br>Siempre en horizontal. Pulsa <b>INSTALAR</b> y tendrás COSMOLUCAS como una app más: a pantalla completa y sin barras del navegador.</p></div>
    <div class="tit"><div class="ic">💻</div><p><b>PC y portátil</b><br>En Chrome, Edge, Firefox o Safari. Pulsa <span class="k">F</span> o <b>PANTALLA COMPLETA</b>. También se puede instalar como aplicación.</p></div>
    <div class="tit"><div class="ic">📺</div><p><b>Smart TV</b><br>Abre el navegador de la tele (Samsung, LG, Android TV, Google TV, Fire TV…) y entra en <b>puntofibra.github.io/turbolucas</b>. Se disfruta mucho más con un mando o un teclado conectado a la tele.</p></div>
    <div class="tit"><div class="ic">⚡</div><p><b>Siempre al día</b><br>El juego se actualiza solo con fases y mejoras nuevas, y una vez cargado sigue funcionando aunque se vaya la conexión.</p></div></div>`,
  'MANDOS': `<div class="tgrid">
    <div class="tit"><div class="ic">🎮</div><p><b>Mandos compatibles</b><br>PlayStation 5 (DualSense), PlayStation 4 (DualShock 4), Xbox One y Series, Nintendo Switch Pro y la mayoría de mandos Bluetooth o USB.</p></div>
    <div class="tit"><div class="ic">🔗</div><p><b>Cómo conectarlo</b><br><b>PS5:</b> mantén PS + Create. <b>PS4:</b> PS + Share. <b>Xbox:</b> botón de emparejar de arriba. <b>Switch Pro:</b> botón de sincronizar. Cuando la luz parpadee, búscalo en <b>Ajustes › Bluetooth</b> del móvil, PC o tele. En PC también vale el cable USB.</p></div>
    <div class="tit"><div class="ic">🕹️</div><p><b>Botones</b><br><b>Saltar:</b> <span class="k">✕</span> / <span class="k">A</span><br><b>Láser:</b> <span class="k">□</span> <span class="k">○</span> <span class="k">R1</span> / <span class="k">X</span> <span class="k">B</span> <span class="k">RB</span><br><b>Pausa:</b> <span class="k">OPTIONS</span> / <span class="k">MENU</span></p></div>
    <div class="tit"><div class="ic">🧭</div><p><b>Menús con el mando</b><br>Cruceta o joystick para elegir, <span class="k">✕</span>/<span class="k">A</span> para aceptar y <span class="k">○</span>/<span class="k">B</span> para volver. Al usar el mando desaparecen los botones táctiles.</p></div></div>`,
  'CONTROLES': `<div class="tgrid">
    <div class="tit"><div class="ic">⌨️</div><p><b>Teclado</b><br><span class="k">←</span><span class="k">→</span> o <span class="k">A</span><span class="k">D</span> moverse<br><span class="k">↑</span> <span class="k">ESPACIO</span> <span class="k">Z</span> saltar<br><span class="k">↓</span> <span class="k">S</span> agacharse<br><span class="k">CTRL</span> <span class="k">X</span> láser · <span class="k">P</span> <span class="k">ESC</span> pausa</p></div>
    <div class="tit"><div class="ic">👆</div><p><b>Pantalla táctil</b><br><b>◀ ▶</b> moverse, <b>▼</b> agacharse, <b>SALTAR</b> y <b>LÁSER</b>. Puedes pulsar varios a la vez.</p></div>
    <div class="tit"><div class="ic">🚀</div><p><b>Salto con propulsores</b><br>Mantén pulsado saltar para llegar más alto; suéltalo antes para un salto corto y preciso.</p></div>
    <div class="tit"><div class="ic">⬇️</div><p><b>Bajar de plataformas</b><br>Sobre una plataforma flotante, abajo + saltar para dejarte caer.</p></div></div>`,
  'PODERES': () => '<div class="tgrid">' + [['laser', 'LÁSER', 'Dispara rayos que fulminan a los bichos.'], ['escudo', 'ESCUDO', 'Aguanta un golpe sin perder nada.'], ['turbo', 'TURBO', 'Mantén saltar y Lucas vuela unos segundos.'], ['iman', 'IMÁN', 'Atrae todos los chips cercanos.'], ['mini', 'MINI LUCAS', 'Diminuto: cabe por huecos estrechos.'], ['estrella5g', 'ESTRELLA 5G', 'Invencible: arrasa con todo lo que toque.']]
    .map(([f, n, d]) => '<div class="tit"><img src="img/' + TIER + '/poder-' + f + '.webp" alt=""><p><b>' + n + '</b><br>' + d + '</p></div>').join('') +
    '<div class="tit"><img src="img/' + TIER + '/obj-chip.webp" alt=""><p><b>CHIPS</b><br>Cada 100 chips, una vida extra.</p></div><div class="tit"><img src="img/' + TIER + '/obj-engranaje.webp" alt=""><p><b>ENGRANAJES</b><br>Hay 3 en cada fase. Encuéntralos todos.</p></div></div>',
  'CONSEJOS PRO': `<div class="tgrid">
    <div class="tit"><div class="ic">⭐</div><p><b>Tres estrellas</b><br>Una por terminar la fase, otra por los 3 engranajes y otra por no perder ninguna vida.</p></div>
    <div class="tit"><div class="ic">⏱️</div><p><b>Cada segundo cuenta</b><br>El tiempo que te sobre se convierte en puntos. Cuando el reloj se pone rojo, ¡corre!</p></div>
    <div class="tit"><div class="ic">👾</div><p><b>Aplasta bichos</b><br>Cae encima de los enemigos para eliminarlos… menos del erizo: pincha.</p></div>
    <div class="tit"><div class="ic">📡</div><p><b>Puntos de control</b><br>Las antenas pequeñas guardan tu avance: si pierdes una vida, sigues desde ahí.</p></div>
    <div class="tit"><div class="ic">📦</div><p><b>Cajas</b><br>Golpéalas desde abajo: las de interrogación esconden chips o poderes; las otras se rompen.</p></div>
    <div class="tit"><div class="ic">🏆</div><p><b>Récords</b><br>Repite las fases para batir tu mejor puntuación y completar el mapa en verde.</p></div></div>`
};
let tipTab = 'DÓNDE JUGAR';
function showTips(tab) {
  if (tab) tipTab = tab; const c = $('card'); c.classList.add('tips');
  const body = TIPS[tipTab], html = typeof body === 'function' ? body() : body;
  c.innerHTML = '<h2>CONSEJOS</h2><div class="tabs">' + Object.keys(TIPS).map(k => '<button class="btn' + (k === tipTab ? ' on' : '') + '" data-t="' + k + '">' + k + '</button>').join('') + '</div><div class="tbody">' + html + '</div><div class="tfoot"><button class="btn" id="tipX">VOLVER</button></div>';
  c.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SFX.chip(); showTips(b.dataset.t); });
  $('tipX').onclick = () => { show('panel', false); c.classList.remove('tips'); };
  show('panel', true);
}
function infoPanel(title, html) {
  const c = $('card'); c.classList.remove('tips');
  c.innerHTML = '<h2>' + title + '</h2><div style="font-size:15px;line-height:1.5;color:#cfe0ff;margin:6px 0 4px">' + html + '</div><div class="row"><button class="btn" id="infX">ENTENDIDO</button></div>';
  $('infX').onclick = () => show('panel', false); show('panel', true);
}
$('btnTips').onclick = () => { audio(); SFX.chip(); showTips(); };
$('btnRank').onclick = () => { audio(); SFX.chip(); showRanking(); };
$('btnTaller').onclick = () => { audio(); SFX.chip(); openTaller(); };
$('btnWeb').onclick = () => { SFX.chip(); setTimeout(() => { location.href = 'https://puntofibra.github.io/web/'; }, 120); };

/* ---------- ADMIN: entrada con llave NFC (o QR desde un móvil Android) y menú oculto ---------- */
let ADM = null; try { sessionStorage.removeItem('tl_adm'); } catch (e) {}
const setAdm = t => { ADM = t; };          // la sesión de admin solo vive mientras el panel está abierto: siempre se pide la llave
const HAY_NFC = 'NDEFReader' in window;
let nfcCtl = null;
function nfcStop() { if (nfcCtl) { try { nfcCtl.abort(); } catch (e) {} nfcCtl = null; } }
async function nfcRead(onSerial, onErr) {        // solo se usa el número de serie de la llave
  nfcStop(); let busy = false;
  try { nfcCtl = new AbortController(); const r = new NDEFReader(); await r.scan({ signal: nfcCtl.signal });
    r.onreading = async ev => { if (busy) return; busy = true; try { navigator.vibrate && navigator.vibrate(80); } catch (e) {} const s2 = String(ev.serialNumber || '').replace(/:/g, '').toUpperCase(); try { await onSerial(s2); nfcStop(); } catch (e) { onErr(e.message || String(e)); busy = false; } };
    r.onreadingerror = () => { if (!busy) onErr('No pude leer la llave. Vuelve a acercarla.'); };
    return true;
  } catch (e) { nfcStop(); if (e && e.name === 'NotAllowedError' && onErr.gesture) { onErr.gesture(); return false; } onErr('Activa el NFC del móvil y vuelve a intentarlo.'); return false; }
}
const NFC_HTML = '<div class="nfcw"><svg viewBox="0 0 64 64" width="54" height="54"><rect x="14" y="6" width="36" height="52" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M27 24a9 9 0 0 1 0 16M33 19a16 16 0 0 1 0 26M39 14a23 23 0 0 1 0 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><i></i><i></i></div>';
(() => { const st = document.createElement('style'); st.textContent = `
.nfcw{position:relative;width:96px;height:96px;margin:10px 0;color:#29e6ff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 8px #29e6ff)}
.nfcw i{position:absolute;inset:0;border-radius:50%;border:2px solid #29e6ff;animation:nfcp 2s infinite}.nfcw i+i{animation-delay:1s}
@keyframes nfcp{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.25);opacity:0}}
#conQr{position:absolute;z-index:7;right:calc(24px + env(safe-area-inset-right));top:50%;transform:translateY(-50%);background:#fff;padding:12px 12px 8px;border-radius:12px;box-shadow:0 0 30px rgba(41,230,255,.8);text-align:center;animation:qrIn .4s ease-out}
#conQr img{display:block;width:min(42vh,300px);height:min(42vh,300px);image-rendering:pixelated}
#conQr div{font:800 12px system-ui,sans-serif;color:#0a1640;letter-spacing:.08em;margin-top:6px}
@keyframes qrIn{from{opacity:0;transform:translateY(-50%) scale(.8)}}
@media (max-width:700px){#conQr{right:50%;transform:translate(50%,-50%)}}
#adm{position:fixed;inset:0;z-index:56;display:none;background:radial-gradient(ellipse at 50% 30%,#06163a,#010309 75%);font-family:"Lucida Console","Courier New",ui-monospace,monospace;color:#cfe0ff}
#adm.on{display:flex;flex-direction:column}
#adm::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 2px,transparent 2px 4px);z-index:3}
.ahead{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) 8px calc(16px + env(safe-area-inset-left));border-bottom:1px solid rgba(41,230,255,.35);position:relative;z-index:4}
.ahead h1{margin:0;font-size:clamp(14px,3vh,20px);letter-spacing:.18em;color:#35ff8a;text-shadow:0 0 10px #35ff8a;flex:1}
.atabs{display:flex;gap:6px;flex-wrap:wrap;padding:8px calc(16px + env(safe-area-inset-right)) 8px calc(16px + env(safe-area-inset-left));position:relative;z-index:4}
#adm .btn{font-family:inherit;font-size:12px;padding:7px 10px;border-radius:8px}
#adm .btn.on{border-color:#35ff8a;box-shadow:0 0 14px rgba(53,255,138,.6);color:#35ff8a}
#adm .btn.red{border-color:#ff4a6a;box-shadow:0 0 12px rgba(255,74,106,.45)}
.abody{flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;overscroll-behavior:contain;padding:6px calc(16px + env(safe-area-inset-right)) 20px calc(16px + env(safe-area-inset-left));position:relative;z-index:4;font-size:clamp(12px,2.5vh,14px);line-height:1.5}
.abody h3{color:#29e6ff;letter-spacing:.12em;margin:14px 0 6px;text-shadow:0 0 8px #29e6ff;font-size:1.05em}
.trk{display:grid;grid-template-columns:minmax(150px,300px) 1fr;gap:12px;align-items:center;background:rgba(41,230,255,.06);border:1px solid rgba(41,230,255,.3);border-radius:10px;padding:10px;margin-bottom:10px}
.trk img{width:100%;border-radius:6px;border:1px solid rgba(41,230,255,.5);box-shadow:0 0 14px rgba(41,230,255,.35)}
.trk b{color:#ffd23c}.trk .tg{display:inline-block;font-size:.8em;color:#010309;background:#35ff8a;border-radius:4px;padding:0 6px;margin-right:6px;font-weight:900}
@media (max-width:560px){.trk{grid-template-columns:1fr}}
.arow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}
.ain{font:inherit;color:#fff;background:rgba(2,10,30,.9);border:1px solid #29e6ff;border-radius:6px;padding:7px 9px;min-width:0;-webkit-user-select:text!important;user-select:text!important;touch-action:manipulation}
.akey{background:rgba(41,230,255,.06);border:1px solid rgba(41,230,255,.3);border-radius:10px;padding:10px;margin-bottom:8px}
.bars .bar{display:grid;grid-template-columns:110px 1fr 46px;gap:8px;align-items:center;margin:3px 0}.bars i{height:10px;background:linear-gradient(90deg,#29e6ff,#35ff8a);border-radius:5px;box-shadow:0 0 8px rgba(41,230,255,.6);display:block}
.amsg{min-height:1.4em;color:#ffd23c}.amsg.err{color:#ff4a6a}`; document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'adm'; document.body.appendChild(d); })();
const SECRETS = [
  { f: '1-1', img: 'n1-1b', t: 'Vida oculta al empezar', d: 'Nada más empezar, salta justo encima de la primera fila de chips: aparece un bloque invisible con una vida extra (1UP).' },
  { f: '1-2', img: 'n1-2b', t: 'Vida oculta antes del primer bicho', d: 'Justo antes del primer robot patrulla, salta en el aire: hay un bloque invisible con una vida.' },
  { f: '1-2', img: 'n1-2c', t: 'Imán escondido en la sala de chips', d: 'Dentro de la sala de la lluvia de chips, ve a la izquierda del todo, hasta la pared, y salta justo ahí: aparece una caja oculta con un IMÁN que atrae todos los chips que caen cerca.' },
  { f: '1-3', img: 'n1-3a', t: 'Vida oculta junto al erizo', d: 'Al pasar el primer erizo, antes de la escalera de bloques, salta: un bloque invisible suelta una vida extra.' },
  { f: '1-4', img: 'n1-4a', t: 'Vida oculta en la base de la torre', d: 'En el suelo de la base, entre la fila de chips y la caja del escudo, salta: hay un bloque invisible con una vida.' },
  { f: '1-B', img: 'n1-Ba', t: 'Vida oculta bajo el 5G', d: 'Justo a la derecha de la plataforma del "5G" de chips, salta en el aire: un bloque invisible esconde una vida.' },
  { f: '1-J', img: 'n1-Ja', t: 'Vida antes del jefe', d: 'Junto al punto de control de antes de la arena, salta a la izquierda de la caja: un bloque invisible te da una vida para la pelea.' },
  { f: '2-1', img: 'n2-1a', t: 'Vida oculta al empezar', d: "Nada más empezar, a la derecha de la primera fila de chips, salta: aparece un bloque invisible con una vida." },
  { f: '2-1', img: 'n2-1b', t: 'La escotilla invisible del iglú', d: "Pasado el pico del engranaje, justo antes del erizo, agáchate en el suelo: hay una escotilla que no se ve y te lleva a un iglú secreto con chips, una vida oculta y un portal de vuelta." },
  { f: '2-1', img: 'n2-1c', t: 'La colina hueca', d: "La colina baja que hay después de la plataforma móvil está hueca: camina contra ella y la atraviesas. Dentro hay un engranaje." },
  { f: '2-2', img: 'n2-2a', t: 'Vida oculta en la entrada de la cueva', d: "Al empezar, encima de la primera fila de chips, salta: bloque invisible con una vida." },
  { f: '2-2', img: 'n2-2b', t: 'La llave de la roca', d: "La primera llave está dentro de una roca baja: su pared de la izquierda es falsa (la atraviesas andando) y la de la derecha se rompe con el láser." },
  { f: '2-3', img: 'n2-3a', t: 'Vida oculta al zambullirte', d: "Nada más empezar, nada un poco hacia arriba sobre los primeros chips: bloque invisible con una vida." },
  { f: '2-3', img: 'n2-3b', t: 'La cámara de hielo sellada', d: "Pasada la primera corriente, la cámara bajo el techo de hielo tiene la pared de la izquierda falsa: entra por ahí a por el engranaje." },
  { f: '2-4', img: 'n2-4a', t: 'Vida oculta antes de la ventisca', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '2-4', img: 'n2-4b', t: 'El suelo falso de la isla', d: "En la isla con cristal saltarín y punto de control, el centro del suelo es falso: colócate justo en medio y te hundes en una cámara con un engranaje." },
  { f: '2-5', img: 'n2-5a', t: 'Vida oculta en lo alto de la ladera', d: "Nada más empezar, encima de los chips, salta rápido antes de que la avalancha te empuje: hay una vida escondida." },
  { f: '2-5', img: 'n2-5b', t: 'La escotilla del refugio', d: "Después del segundo punto de control, agáchate justo donde empieza el escalón: una escotilla invisible te mete en el refugio secreto del fondo del valle, lleno de chips y con un engranaje." },
  { f: '2-6', img: 'n2-6a', t: 'El portal escondido en el agujero', d: 'En el suelo de la mina, a la derecha, hay un agujero: cae por él a una galería oculta con chips, un engranaje y un portal que te lleva a una cámara secreta del pozo con otro engranaje.' },
  { f: '2-6', img: 'n2-6b', t: 'Vida oculta en el fondo del pozo', d: 'En el suelo de la mina, a la derecha de la primera fila de chips, salta: bloque invisible con una vida.' },
  { f: '2-B', img: 'n2-Ba', t: 'Vida oculta entre las nubes', d: "Al empezar, salta sobre la fila de chips: bloque invisible con una vida." },
  { f: '2-J', img: 'n2-Ja', t: 'Vida antes del Guardián de Hielo', d: "Junto al punto de control de antes de la arena, salta: bloque invisible con una vida." },
  { f: '3-1', img: 'n3-1a', t: 'Vida oculta al empezar', d: "Al empezar, a la derecha de la primera fila de chips, salta: bloque invisible con una vida." },
  { f: '3-1', img: 'n3-1b', t: 'El agujero sin lava', d: "Tras el segundo punto de control hay un agujero sin lava: déjate caer y llegas a una cueva secreta con chips, un engranaje y un portal de vuelta." },
  { f: '3-1', img: 'n3-1c', t: 'El montículo hueco', d: "El montículo de roca de después del agujero tiene la cara izquierda falsa: entra andando y coge el engranaje." },
  { f: '3-2', img: 'n3-2a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja del turbo, salta: bloque invisible con una vida." },
  { f: '3-2', img: 'n3-2b', t: 'La roca hueca', d: "Pasado el segundo géiser, la roca alta tiene la cara izquierda falsa: dentro hay un engranaje." },
  { f: '3-3', img: 'n3-3a', t: 'Vida oculta en la boca del cráter', d: "Al empezar, ve a la derecha del borde del cráter y salta: bloque invisible con una vida." },
  { f: '3-3', img: 'n3-3b', t: 'El hueco en la pared', d: "Bajando, a media altura, la pared de la izquierda tiene un hueco falso con un engranaje dentro." },
  { f: '3-4', img: 'n3-4a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-4', img: 'n3-4b', t: 'El agujero sin lava', d: "Tras el segundo punto de control hay un agujero pequeño sin lava: cae por él a una orilla secreta con chips y un engranaje." },
  { f: '3-5', img: 'n3-5a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja del escudo, salta: bloque invisible con una vida." },
  { f: '3-5', img: 'n3-5b', t: 'La roca hueca', d: "Pasada la torreta, la roca baja se atraviesa andando por la izquierda: dentro hay un engranaje." },
  { f: '3-6', img: 'n3-6a', t: 'Vida oculta al subir a la vagoneta', d: "Al empezar, encima de los chips, salta enseguida: bloque invisible con una vida." },
  { f: '3-6', img: 'n3-6b', t: 'La roca hueca y el atajo', d: "Casi al final, la roca baja se atraviesa por la izquierda (engranaje dentro). Justo después, agáchate en el suelo: una escotilla invisible te deja junto a la salida." },
  { f: '3-7', img: 'n3-7a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-7', img: 'n3-7b', t: 'El hueco del puente', d: "En el último tramo del puente hay un hueco sin lava: cae por él a una cueva secreta con un engranaje y un portal de vuelta." },
  { f: '3-8', img: 'n3-8a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-8', img: 'n3-8b', t: 'La máquina hueca', d: "Después del ascensor de calor, la máquina baja tiene la cara izquierda falsa: dentro hay un engranaje." },
  { f: '3-9', img: 'n3-9a', t: 'Vida oculta en el fondo del horno', d: "Al empezar, en el suelo, salta un poco a la derecha de los chips: bloque invisible con una vida." },
  { f: '3-9', img: 'n3-9b', t: 'La cámara en la pared', d: "Casi arriba, a la derecha, hay una cámara pegada a la pared con la entrada izquierda falsa: dentro hay chips y un engranaje." },
  { f: '3-10', img: 'n3-10a', t: 'Vida oculta al empezar', d: "Al empezar, entre los chips y la caja, salta: bloque invisible con una vida." },
  { f: '3-10', img: 'n3-10b', t: 'La escotilla invisible', d: "Justo después de la caja del láser, agáchate en el suelo: hay una escotilla invisible que te lleva a la sala de los engranajes por un atajo." },
  { f: '3-11', img: 'n3-11a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-11', img: 'n3-11b', t: 'La roca hueca', d: "En la roca grande del segundo punto de control, la cara izquierda es falsa: entra y coge el engranaje." },
  { f: '3-12', img: 'n3-12a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-12', img: 'n3-12b', t: 'La puerta falsa de la segunda torre', d: "La segunda torre se abre rompiendo su pared agrietada con el láser… pero su pared de la derecha es falsa: también puedes entrar andando por ahí a por la llave." },
  { f: '3-13', img: 'n3-13a', t: 'Vida oculta al empezar', d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '3-13', img: 'n3-13b', t: 'La escotilla de la isla', d: "En la isla del primer punto de control, agáchate a la derecha del punto de control: una escotilla invisible te lleva directo a la isla de la antena. En esa misma isla, el bloque de la derecha tiene una cara falsa con un engranaje." },
  { f: '3-14', img: 'n3-14a', t: 'Vida oculta al empezar', d: "Al empezar, a la derecha de la caja del láser, salta: bloque invisible con una vida." },
  { f: '3-B', img: 'n3-Ba', t: 'Vida oculta en el tesoro', d: "Al empezar, sobre la fila de chips, salta: bloque invisible con una vida." },
  { f: '3-J', img: 'n3-Ja', t: 'Vida antes del Señor del Magma', d: "Junto al punto de control de antes de la arena, salta: bloque invisible con una vida." },
  { f: '4-1', img: 'n4-1a', t: "Vida oculta al empezar", d: "Al empezar, encima de la primera fila de chips, salta: bloque invisible con una vida." },
  { f: '4-1', img: 'n4-1b', t: "El tronco hueco invisible", d: "Pasada la caja del láser, justo antes del robot patrulla, agáchate en el suelo: hay una escotilla que no se ve y te lleva a un escondite con chips, un engranaje y un portal de vuelta." },
  { f: '4-2', img: 'n4-2a', t: "Vida oculta al pie del árbol", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-2', img: 'n4-2b', t: "El tronco de corteza falsa", d: "En el tronco que hay después de la luciérnaga, ponte encima en el centro: la corteza de arriba es falsa y caes a un hueco con un engranaje." },
  { f: '4-3', img: 'n4-3a', t: "Vida oculta en la orilla", d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '4-3', img: 'n4-3b', t: "El hoyo oscuro", d: "Tras la planta torreta hay un hoyo negro sin ciénaga: déjate caer y llegas a la cueva de la rana dorada, con chips y un portal de vuelta." },
  { f: '4-4', img: 'n4-4a', t: "Vida oculta bajo la lluvia", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-4', img: 'n4-4b', t: "La roca hueca", d: "Pasada la seta azul, la roca baja tiene la cara izquierda falsa: dentro hay chips y una luciérnaga." },
  { f: '4-5', img: 'n4-5a', t: "Vida oculta al pie del hongo", d: "Al empezar, en el suelo, salta un poco a la derecha de los chips: bloque invisible con una vida." },
  { f: '4-5', img: 'n4-5b', t: "El nicho en la pared", d: "A media subida, a la izquierda, hay un nicho en la pared con la entrada falsa: dentro hay chips y un engranaje." },
  { f: '4-6', img: 'n4-6a', t: "Vida oculta en la oscuridad", d: "Al empezar, a la derecha de los chips, salta: bloque invisible con una vida." },
  { f: '4-6', img: 'n4-6b', t: "La cámara bajo la rama", d: "Después del punto de control, la pared bajo la gran rama es falsa: entra andando a la cámara con un engranaje y una luciérnaga." },
  { f: '4-6', img: 'n4-6c', t: "La escotilla del atajo", d: "Pasada la plataforma del dron, agáchate en el suelo: una escotilla invisible te deja junto a la puerta final." },
  { f: '4-7', img: 'n4-7a', t: "Vida oculta en la primera rama", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-7', img: 'n4-7b', t: "La rama hueca", d: "Bajo la rama gruesa del centro, salta desde la plataforma de abajo: su parte de abajo es falsa y dentro hay chips y una luciérnaga." },
  { f: '4-8', img: 'n4-8a', t: "Vida oculta en la entrada del nido", d: "Al empezar, a la izquierda de la caja del láser, salta: bloque invisible con una vida." },
  { f: '4-8', img: 'n4-8b', t: "El tocón de la cara falsa", d: "El tocón que hay después del erizo se atraviesa por su lado DERECHO: dentro hay un engranaje." },
  { f: '4-9', img: 'n4-9a', t: "Vida oculta antes del puente", d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '4-9', img: 'n4-9b', t: "El hueco del último puente", d: "Pasado el segundo punto de control, en el primer hueco del puente déjate caer: llegas a una cueva secreta con chips y una luciérnaga." },
  { f: '4-10', img: 'n4-10a', t: "Vida oculta en lo alto de la cascada", d: "Al empezar, ve a la derecha y salta: bloque invisible con una vida." },
  { f: '4-10', img: 'n4-10b', t: "La cueva tras el agua", d: "A media bajada, en la repisa de la derecha, camina hacia la pared: es falsa y esconde un engranaje." },
  { f: '4-11', img: 'n4-11a', t: "Vida antes de subir a la balsa", d: "Al empezar, antes de subir a la balsa, salta: bloque invisible con una vida." },
  { f: '4-12', img: 'n4-12a', t: "Vida oculta en la orilla del lago", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-12', img: 'n4-12b', t: "La cámara sumergida", d: "Bajo el agua, la cámara de piedra tiene la pared izquierda falsa: entra nadando a por el engranaje." },
  { f: '4-13', img: 'n4-13a', t: "Vida oculta al empezar", d: "Al empezar, a la izquierda de la caja, salta: bloque invisible con una vida." },
  { f: '4-13', img: 'n4-13b', t: "La roca hueca", d: "Después de los chorros de esporas, la roca baja tiene la cara izquierda falsa: dentro hay chips y una luciérnaga." },
  { f: '4-14', img: 'n4-14a', t: "Vida oculta en la cueva", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-14', img: 'n4-14b', t: "La roca de la cara falsa", d: "La roca grande del centro se atraviesa por su lado DERECHO: dentro hay un engranaje." },
  { f: '4-14', img: 'n4-14c', t: "La escotilla del final", d: "Después del último interruptor, agáchate en el suelo: una escotilla invisible te deja junto a la salida." },
  { f: '4-15', img: 'n4-15a', t: "Vida oculta al pie de la escalinata", d: "Al empezar, encima de los chips, salta: bloque invisible con una vida." },
  { f: '4-15', img: 'n4-15b', t: "La ofrenda del altar", d: "En la última terraza, el pequeño altar tiene la cara izquierda falsa: dentro hay un engranaje." },
  { f: '4-16', img: 'n4-16a', t: "Vida oculta en la entrada del templo", d: "Al empezar, a la izquierda de la caja del láser, salta: bloque invisible con una vida." },
  { f: '4-16', img: 'n4-16b', t: "El pasadizo secreto del templo", d: "Pasada la sala de la tercera llave, agáchate en el suelo: una escotilla invisible te deja delante de la gran puerta. Esa sala también se abre por su pared derecha, que es falsa." },
  { f: '4-J', img: 'n4-Ja', t: "Vida antes del Coloso", d: "Junto al punto de control de antes de la arena, salta: bloque invisible con una vida." },
  { f: '4-B', img: 'n4-Ba', t: "Vida oculta en el nido", d: "Al empezar, salta sobre el borde: bloque invisible con una vida." },
  { f: '4-C', img: 'n4-Ca', t: "Vida oculta junto al 4", d: "Al empezar, a la izquierda del 4 de chips, salta: bloque invisible con una vida." },
  { f: '4-D', img: 'n4-Da', t: "Vida oculta en el tesoro", d: "Al empezar, a la derecha de la entrada, salta: bloque invisible con una vida." }
];
let admTab = 'PAGOS', admLl = [], admSt = null;
function openAdmin() {
  closeConsole(); if (state === 'play' && !paused) togglePause();
  const a = $('adm'); a.classList.add('on'); admPaint();
}
function closeAdmin() { nfcStop(); $('adm').classList.remove('on'); setAdm(null); }
async function admOp(op, d) {
  const r = await api(Object.assign({ a: 'adm', t: ADM, op }, d || {}));
  if (!r.ok) { if (r.error === 'ADMIN') { setAdm(null); closeAdmin(); infoPanel('SESIÓN CADUCADA', 'La sesión de administrador ha caducado. Vuelve a entrar con tu llave.'); } throw new Error(r.error || 'Error'); }
  return r;
}
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function admMsg(t, err) { const m = $('amsg'); if (m) { m.textContent = t; m.className = 'amsg' + (err ? ' err' : ''); } }
function admPaint() {
  const tabs = ['PAGOS', 'NIVELES', 'TRUCOS', 'TEMPORALES', 'CÓDIGOS', 'FASES', 'LLAVES', 'ESTADÍSTICAS', 'RANKING', 'RECORDATORIO', 'SISTEMA'];
  $('adm').innerHTML = '<div class="ahead"><h1>▌ PANEL SECRETO · COSMOLUCAS</h1><button class="btn" id="admX">SALIR</button></div><div class="atabs">' + tabs.map(t => '<button class="btn' + (t === admTab ? ' on' : '') + '" data-a="' + t + '">' + t + '</button>').join('') + '</div><div class="abody" id="abody"></div>';
  $('admX').onclick = closeAdmin;
  $('adm').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { admTab = b.dataset.a; tone(900, 900, 0.04, 'square', 0.05); admPaint(); });
  const B = $('abody');
  if (admTab === 'TRUCOS') {
    let h = '<div style="color:#8ea3e6">Solo tú ves esto. Secretos escondidos en cada fase:</div>', last = '';
    SECRETS.forEach(s2 => { const n = ALLN().find(m => m.id === s2.f); if (s2.f !== last) { last = s2.f; h += '<h3>PLANETA ' + s2.f[0] + ' · ' + (n.boss ? 'JEFE' : n.bonus ? 'FASE SECRETA' : 'FASE ' + s2.f.slice(2)) + ' — ' + esc(n.name.replace(/^(JEFE|FASE SECRETA) · /, '')) + '</h3>'; }
      h += '<div class="trk"><img loading="lazy" src="img/trucos/' + s2.img + '.webp?v=' + VERSION + '" alt=""><div><span class="tg">' + s2.f + '</span><b>' + esc(s2.t) + '</b><br>' + esc(s2.d) + '</div></div>'; });
    B.innerHTML = h;
  } else if (admTab === 'CÓDIGOS') {
    B.innerHTML = '<div style="color:#8ea3e6">Se escriben en la consola (pausa · 10 toques rápidos sobre PAUSA). Aquí puedes activarlos directamente.</div>' + CODES.map(c => { const on = CHEAT[c[0].toLowerCase()]; return '<div class="akey"><b style="color:#ffd23c">' + c[0] + '</b> — ' + c[1] + '<br>' + esc(c[2]) + '<div class="arow"><button class="btn' + (on ? ' on' : '') + '" data-c="' + c[0] + '">' + (on ? 'ACTIVADO ✔' : 'ACTIVAR') + '</button></div></div>'; }).join('') + '<div class="akey"><b style="color:#ffd23c">HACK</b> — muestra la lista de códigos con la animación de hackeo.<br><b style="color:#ffd23c">ADMIN</b> — abre este panel (pide la llave NFC).</div>';
    B.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const k = b.dataset.c.toLowerCase(); CHEAT[k] = !CHEAT[k]; if (k === 'floor') CHEAT.floorT = 0; saveCheats(); SFX.power(); admPaint(); });
  } else if (admTab === 'FASES') {
    B.innerHTML = '<h3>JUGAR DIRECTAMENTE</h3>' + WORLDS.map((w, wi) => '<div style="color:#8ea3e6;margin-top:6px">PLANETA ' + w.n + ' · ' + w.name + '</div><div class="arow">' + w.nodes.map((n, i) => '<button class="btn" data-w="' + wi + '" data-f="' + i + '"' + (typeof LEVELS[n.id] === 'function' ? '' : ' disabled style="opacity:.35"') + '>' + (n.boss ? 'JEFE ' + w.n : n.bonus ? 'SECRETA ' + w.n : n.id) + '</button>').join('') + '</div>').join('') +
      '<h3>PROGRESO EN ESTE DISPOSITIVO</h3><div class="arow"><button class="btn" id="aOpen">ABRIR TODAS LAS FASES</button><button class="btn red" id="aReset">BORRAR MI PROGRESO</button></div><div class="amsg" id="amsg"></div>';
    B.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { closeAdmin(); setWorld(+b.dataset.w); curId = MAP[+b.dataset.f].id; mapSel = +b.dataset.f; startGame(); });
    $('aOpen').onclick = () => { ALLN().forEach(n => { if (typeof LEVELS[n.id] === 'function') DEV[n.id] = 1; }); try { localStorage.setItem('tl_dev', JSON.stringify(DEV)); } catch (e) {} admMsg('✔ Todas las fases abiertas en este dispositivo'); SFX.life(); };
    $('aReset').onclick = () => { if ($('aReset').dataset.ok !== '1') { $('aReset').dataset.ok = '1'; $('aReset').textContent = '¿SEGURO? PULSA OTRA VEZ'; return; } PROG = {}; DEV = {}; GOT = {}; saveProg(); try { localStorage.setItem('tl_dev', '{}'); localStorage.setItem('tl_got', '{}'); } catch (e) {} admMsg('Progreso borrado'); $('aReset').textContent = 'BORRAR MI PROGRESO'; $('aReset').dataset.ok = ''; };
  } else if (admTab === 'LLAVES') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando llaves…</div><div id="akeys"></div><h3>AÑADIR LLAVE</h3><div class="akey">' + (HAY_NFC ? '<div class="arow"><button class="btn on" id="aScan">ESCANEAR LLAVE NUEVA</button></div>' : '<div style="color:#8ea3e6">Para escanear una llave abre este panel desde un móvil Android. Aquí puedes escribir su código a mano:</div>') +
      '<div class="arow"><input class="ain" id="anN" placeholder="Nombre" maxlength="30" style="width:140px"><input class="ain" id="anK" placeholder="Código de la llave (hex)" maxlength="40" style="flex:1;min-width:160px"><button class="btn" id="anAdd">GUARDAR</button></div></div>';
    const paintKeys = () => { $('akeys').innerHTML = admLl.map((k, i) => '<div class="akey"><div class="arow"><input class="ain" data-n="' + i + '" value="' + esc(k.n) + '" maxlength="30" style="width:150px"><input class="ain" data-k="' + i + '" value="' + esc(k.k) + '" maxlength="40" style="flex:1;min-width:170px;letter-spacing:.08em"></div><div class="arow"><span style="color:#8ea3e6;flex:1">Guardada el ' + new Date(k.f).toLocaleString('es-ES') + '</span><button class="btn" data-s="' + i + '">GUARDAR CAMBIOS</button><button class="btn red" data-d="' + i + '">BORRAR</button></div></div>').join('');
      $('akeys').querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { const i = +b.dataset.s; try { const r = await admOp('llaveEdit', { k: admLl[i].k, nk: $('akeys').querySelector('[data-k="' + i + '"]').value, n: $('akeys').querySelector('[data-n="' + i + '"]').value }); admLl = r.llaves; paintKeys(); admMsg('✔ Llave actualizada'); } catch (e) { admMsg(e.message, 1); } });
      $('akeys').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { const i = +b.dataset.d; if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } try { const r = await admOp('llaveDel', { k: admLl[i].k }); admLl = r.llaves; paintKeys(); admMsg('Llave borrada'); } catch (e) { admMsg(e.message, 1); } }); };
    admOp('llaves').then(r => { admLl = r.llaves; paintKeys(); admMsg(admLl.length + ' llave(s) con acceso de administrador'); }).catch(e => admMsg(e.message, 1));
    $('anAdd').onclick = async () => { try { const r = await admOp('llaveAdd', { k: $('anK').value, n: $('anN').value || 'Llave' }); admLl = r.llaves; paintKeys(); $('anK').value = ''; $('anN').value = ''; admMsg('✔ Llave añadida'); SFX.life(); } catch (e) { admMsg(e.message, 1); } };
    if (HAY_NFC) $('aScan').onclick = () => { admMsg('📡 Acerca la llave nueva a la parte de atrás del móvil…'); nfcRead(async k => { $('anK').value = k; admMsg('Llave leída: ' + k + '. Ponle un nombre y pulsa GUARDAR.'); }, t => admMsg(t, 1)); };
  } else if (admTab === 'TEMPORALES') {
    const opts = CODES.filter(c => c[0] !== 'UNLOCK').map(c => '<option value="' + c[0].toLowerCase() + '">' + c[0] + ' · ' + esc(c[1]) + '</option>').join('');
    B.innerHTML = '<div style="color:#8ea3e6">Trucos secretos para quien tú quieras: se activan durante una fase con una palabra del teclado, una combinación del mando o toques rápidos en la pantalla. Solo duran esa fase y no cuentan para el ranking.</div>' +
      '<h3>CREAR TRUCO TEMPORAL</h3><div class="akey"><div class="arow"><span>Truco</span><select class="ain" id="tT">' + opts + '</select></div>' +
      '<div class="arow"><span>Válido durante</span><input class="ain" id="tN" type="number" min="1" value="1" style="width:70px"><select class="ain" id="tU"><option value="60">horas</option><option value="1">minutos</option><option value="1440">días</option><option value="0">siempre (indefinido)</option></select></div>' +
      '<div class="arow"><span>Palabra del teclado</span><input class="ain" id="tK" maxlength="12" placeholder="p. ej. LUCAS (opcional)" style="flex:1;min-width:140px"></div>' +
      '<div class="arow"><span>Mando PS</span><span id="tPv" style="color:#ffd23c;min-height:1em">—</span></div><div class="arow">' + PNAMES.map(n => '<button class="btn" data-pb="' + n + '">' + n + '</button>').join('') + '<button class="btn red" id="tPc">BORRAR</button></div>' +
      '<div class="arow"><span>Toques rápidos en la pantalla</span><input class="ain" id="tQ" type="number" min="0" max="30" value="0" style="width:70px"><span style="color:#8ea3e6">(0 = no se usa; mínimo 4)</span></div>' +
      '<div class="arow"><span>Nota</span><input class="ain" id="tNo" maxlength="60" placeholder="Para quién es (opcional)" style="flex:1;min-width:140px"></div><div class="arow"><button class="btn on" id="tAdd">CREAR</button></div></div>' +
      '<div class="amsg" id="amsg"></div><h3>TRUCOS TEMPORALES GUARDADOS</h3><div id="tL">Cargando…</div>';
    const pad = []; const pv = () => { $('tPv').textContent = pad.length ? pad.join(' + ') : '—'; };
    B.querySelectorAll('[data-pb]').forEach(b => b.onclick = () => { if (pad.length < 10) pad.push(b.dataset.pb); pv(); }); $('tPc').onclick = () => { pad.length = 0; pv(); };
    const paint = l => { $('tL').innerHTML = l.length ? l.map(t => { const exp = t.hasta && t.hasta < Date.now(); return '<div class="akey"' + (exp ? ' style="opacity:.5"' : '') + '><b style="color:#35ff8a">' + t.truco.toUpperCase() + '</b> · ' + (t.hasta ? (exp ? 'CADUCADO' : 'hasta ' + new Date(t.hasta).toLocaleString('es-ES')) : 'sin caducidad') + (t.nota ? ' · ' + esc(t.nota) : '') +
      '<br>' + (t.teclas ? '⌨ ' + esc(t.teclas) + '   ' : '') + (t.pad ? '🎮 ' + esc(t.pad.split('+').join(' + ')) + '   ' : '') + (t.toques ? '👆 ' + t.toques + ' toques' : '') + '<div class="arow"><button class="btn red" data-td="' + t.id + '">ELIMINAR</button></div></div>'; }).join('') : '<div>No hay ninguno.</div>';
      $('tL').querySelectorAll('[data-td]').forEach(b => b.onclick = async () => { if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } try { const r = await admOp('tmpDel', { id: b.dataset.td }); paint(r.tmp); tmpLoad(); admMsg('✔ Eliminado: ya no le sirve a nadie'); } catch (e) { admMsg(e.message, 1); } }); };
    admOp('tmpList').then(r => paint(r.tmp)).catch(e => admMsg(e.message, 1));
    $('tAdd').onclick = async () => { const u = +$('tU').value; try { const r = await admOp('tmpAdd', { truco: $('tT').value, mins: u ? Math.max(1, +$('tN').value || 1) * u : 0, teclas: $('tK').value, pad: pad.join('+'), toques: +$('tQ').value || 0, nota: $('tNo').value }); paint(r.tmp); tmpLoad(); admMsg('✔ Truco temporal creado'); SFX.life(); } catch (e) { admMsg(e.message, 1); } };
  } else if (admTab === 'NIVELES') {
    B.innerHTML = '<div style="color:#8ea3e6">Código secreto de cada fase. Si un jugador lo escribe en TALLER › CARGAR UN NIVEL, se le abren todos los candados hasta esa fase (incluida). Las que no se haya pasado quedan con 0 estrellas; las que ya tenía conservan las suyas.</div><div class="amsg" id="amsg">Cargando…</div><div id="nvC"></div>';
    admOp('nivLlaves', { ids: ALLN().map(n => n.id) }).then(r => { const c = r.cods || {}; admMsg(''); $('nvC').innerHTML = WORLDS.map(w => '<h3>PLANETA ' + w.n + ' · ' + esc(w.name) + '</h3><div class="arow">' + w.nodes.map(n => '<div class="akey" style="min-width:150px;text-align:center"><span style="color:#8ea3e6">' + lvlName(n) + '</span><br><b style="color:#ffd23c;font:900 20px monospace;letter-spacing:.15em;user-select:all">' + esc(c[n.id] || '—') + '</b>' + (c[n.id] ? '<br><button class="btn" style="margin-top:6px" data-cp="' + esc(c[n.id]) + '">📋 COPIAR</button>' : '') + '</div>').join('') + '</div>').join('');
      $('nvC').querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { const t = b.dataset.cp; let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { try { const x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); ok = document.execCommand('copy'); x.remove(); } catch (e2) {} }
        b.textContent = ok ? '✔ COPIADO' : '✖ NO SE PUDO'; tone(1200, 1500, 0.06, 'square', 0.05); setTimeout(() => { b.textContent = '📋 COPIAR'; }, 1500); }); }).catch(e => admMsg(e.message, 1));
  } else if (admTab === 'PAGOS') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando…</div><div id="pgA"></div><div id="pgT"></div>'; admLicTexts($('pgT'));
    const fd = t => t ? new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    const paint = r => { const l = r.lic || [], pend = l.filter(x => x.estado === 'pendiente').length; admMsg(pend ? pend + ' pago(s) pendiente(s) de validar. Comprueba en myPOS que te ha llegado el dinero antes de aceptar.' : 'No hay pagos pendientes. Se guardan en el Sheet, pestaña "licencias".');
      const col = { pendiente: '#ffd23c', activa: '#35ff8a', rechazada: '#ff5a6a' };
      $('pgA').innerHTML = l.map((x, i) => '<div class="akey arow"><span style="flex:1;min-width:180px"><b>' + esc(x.nombre) + '</b><br><span style="color:#8ea3e6;font-size:12px">' + esc(x.email) + '</span></span><b style="color:' + (col[x.estado] || '#fff') + ';width:100px">' + esc(String(x.estado).toUpperCase()) + '</b><span style="color:#8ea3e6;font-size:12px;width:150px">Pedido ' + fd(x.pedido) + '<br>' + x.fallos + ' fallo(s) · ' + x.intentos + ' intento(s)</span>' +
        (x.estado !== 'activa' ? '<button class="btn" style="border-color:#35ff8a" data-pok="' + i + '">ACEPTAR</button>' : '') + (x.estado !== 'rechazada' ? '<button class="btn red" data-pno="' + i + '">RECHAZAR</button>' : '') + '</div>').join('') || '<div class="akey">Todavía nadie ha comprado la licencia.</div>';
      $('pgA').querySelectorAll('[data-pok],[data-pno]').forEach(b => b.onclick = async () => { if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } const x = l[+(b.dataset.pok || b.dataset.pno)], ok = b.dataset.pok !== undefined;
        try { paint(await admOp(ok ? 'licOk' : 'licNo', { email: x.email })); admMsg(ok ? '✔ Licencia de ' + x.nombre + ' activada' : '✖ Pago de ' + x.nombre + ' rechazado: se le bloquean las fases desde la 3-2'); } catch (e) { admMsg(e.message, 1); } }); };
    admOp('licList').then(paint).catch(e => admMsg(e.message, 1));
  } else if (admTab === 'RANKING') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando…</div><div id="rkA"></div>';
    api(Object.assign({ a: 'ranking' }, who())).then(r => { if (!r.ok) return admMsg(r.error, 1); admMsg(r.total + ' jugador(es) en el ranking. Se guarda en el Sheet, pestaña "ranking".');
      $('rkA').innerHTML = r.top.map((x, i) => '<div class="akey arow"><b style="color:#ffd23c;width:30px">' + (i + 1) + '</b><span style="flex:1">' + esc(x.n) + '</span><b style="color:#35ff8a">' + x.p + '</b><span style="color:#8ea3e6">' + x.f + ' fases · ' + x.e + '★</span><button class="btn red" data-rd="' + esc(x.n) + '">QUITAR</button></div>').join('');
      $('rkA').querySelectorAll('[data-rd]').forEach(b => b.onclick = async () => { if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } await admOp('rankDel', { id: b.dataset.rd }); admPaint(); }); });
  } else if (admTab === 'RECORDATORIO') {
    B.innerHTML = '<div style="color:#8ea3e6">Tus accesos y trucos secretos (solo los ves tú).</div>' +
      '<h3>ENTRAR AL PANEL DE ADMIN</h3><div class="akey">• En el mapa de cualquier planeta: <b>10 toques rápidos</b> con el dedo o el ratón en una zona vacía (sin bases).<br>• Con el mando de PlayStation, en el mapa: <b>L1 + R1 a la vez, 3 veces seguidas</b>.<br>• En una fase: pausa y <b>10 toques rápidos sobre PAUSA</b> (o 10 veces △ con el mando) para abrir la consola, y escribe <b>ADMIN</b>.<br>• Siempre te pide tu <b>llave NFC</b> (en el PC, escaneas un QR con el móvil y acercas la llave).</div>' +
      '<h3>CONSOLA DE TRUCOS</h3><div class="akey">' + CODES.map(c => '<b style="color:#35ff8a">' + c[0] + '</b> · ' + esc(c[1]) + '<br>').join('') + 'Comandos: <b>HACK</b> (lista), <b>OPEN</b>, <b>CLOSE</b>, <b>ADMIN</b>, <b>CLS</b>, <b>SALIR</b>. Los trucos se apagan al pulsar VOLVER en el menú principal.</div>' +
      '<h3>TRUCOS TEMPORALES</h3><div class="akey">Los creas en la pestaña TEMPORALES: palabra del teclado, combinación del mando o toques rápidos durante una fase. Duran solo esa fase.</div>' +
      '<h3>RANKING</h3><div class="akey">Cualquier partida con un truco activo (de consola o temporal) no suma puntos al ranking.</div>' +
      '<h3>SECRETOS DE LAS FASES</h3><div class="akey">Están con foto en la pestaña TRUCOS.</div>';
  } else if (admTab === 'ESTADÍSTICAS') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando…</div><div id="ast"></div>';
    admOp('stats').then(r => { const s2 = r.stats || {}, t = s2.tot || { visitas: 0, partidas: 0, superadas: 0 }, dias = s2.dias || {}, jug = s2.jug || {}, win = s2.win || {};
      const bars = (o, lab) => { const e = Object.entries(o), mx = Math.max(1, ...e.map(x => x[1])); return '<div class="bars">' + (e.length ? e.map(([k, v]) => '<div class="bar"><span>' + esc(lab ? lab(k) : k) + '</span><i style="width:' + (v / mx * 100) + '%"></i><b>' + v + '</b></div>').join('') : '<div style="color:#8ea3e6">Aún no hay datos</div>') + '</div>'; };
      const last = Object.keys(dias).sort().slice(-14), dd = {}; last.forEach(k => dd[k] = dias[k]);
      const fases = {}; ALLN().forEach(n => { if (jug[n.id] || win[n.id]) fases[n.id] = jug[n.id] || 0; });
      const sem = r.semana || [], mxp = Math.max(1, ...sem.map(d => d.personas));
      $('ast').innerHTML = '<h3>ÚLTIMOS 7 DÍAS</h3>' + sem.slice().reverse().map(d => '<div class="akey"><b style="color:#ffd23c">' + d.fecha.slice(8) + '/' + d.fecha.slice(5, 7) + '</b> · <b style="color:#35ff8a">' + d.personas + '</b> persona(s) (' + d.cuentas + ' con cuenta, ' + d.anonimos + ' anónima(s)) · ' + d.partidas + ' partidas · ' + d.niveles + ' niveles superados<div class="bars"><div class="bar"><span></span><i style="width:' + (d.personas / mxp * 100) + '%"></i><span></span></div></div>' + (d.correos.length ? '<div style="color:#8ea3e6;font-size:.9em">' + d.correos.map(esc).join(', ') + '</div>' : '') + '</div>').join('') + '<h3>TOTAL</h3>' + '<div class="arow"><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.visitas + '</b><br>visitas</div><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.partidas + '</b><br>partidas</div><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.superadas + '</b><br>fases superadas</div></div>' +
        '<h3>JUGADORES POR DÍA (14 DÍAS)</h3>' + bars(dd, k => k.slice(8) + '/' + k.slice(5, 7)) + '<h3>PARTIDAS POR FASE</h3>' + bars(fases) + '<h3>% DE ÉXITO POR FASE</h3><div class="bars">' + ALLN().filter(n => jug[n.id]).map(n => { const pc = Math.round((win[n.id] || 0) / jug[n.id] * 100); return '<div class="bar"><span>' + n.id + '</span><i style="width:' + pc + '%"></i><b>' + pc + '%</b></div>'; }).join('') + '</div>' +
        '<div class="arow" style="margin-top:12px"><button class="btn red" id="aSR">PONER A CERO</button></div>';
      admMsg(''); $('aSR').onclick = async () => { if ($('aSR').dataset.ok !== '1') { $('aSR').dataset.ok = '1'; $('aSR').textContent = '¿SEGURO? PULSA OTRA VEZ'; return; } await admOp('statsReset'); admPaint(); };
    }).catch(e => admMsg(e.message, 1));
  } else if (admTab === 'SISTEMA') {
    B.innerHTML = '<div class="akey">Versión del juego: <b style="color:#35ff8a">v' + VERSION + '</b><br>Calidad de imágenes: <b>' + (TIER === 'hd' ? 'HD (tablet/PC)' : 'SD (móvil)') + '</b><br>Lector NFC en este dispositivo: <b>' + (HAY_NFC ? 'SÍ' : 'NO') + '</b><br>Mando conectado: <b>' + (padUsed ? 'SÍ' : 'NO') + '</b></div>' +
      '<div class="arow"><button class="btn" id="aUpd">BUSCAR ACTUALIZACIÓN</button><button class="btn red" id="aOut">CERRAR SESIÓN ADMIN</button></div><div class="amsg" id="amsg"></div>';
    $('aUpd').onclick = () => { admMsg('Buscando…'); fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.v !== VERSION) { admMsg('Hay versión nueva (v' + j.v + '). Recargando…'); setTimeout(() => location.replace(location.pathname + '?u=' + j.v), 900); } else admMsg('✔ Ya tienes la última versión'); }).catch(() => admMsg('Sin conexión', 1)); };
    $('aOut').onclick = () => { setAdm(null); closeAdmin(); };
  }
}
// la consola pide la llave
let admQrT = 0;
function conAdmin() {
  say('*** ACCESO RESTRINGIDO ***', 'r big', 24); say('IDENTIFICACIÓN POR LLAVE REQUERIDA', 'w', 14);
  const ok = r => { clearInterval(admQrT); { const qb = $('conQr'); if (qb) qb.remove(); } setAdm(r.adm); say(r.nueva ? 'LLAVE MAESTRA REGISTRADA ✔' : 'LLAVE RECONOCIDA ✔', 'g big', 22); say('ACCESO CONCEDIDO. ABRIENDO PANEL…', 'g', 14); SFX.win(); setTimeout(() => { if (CON.on) openAdmin(); }, 2200); };
  if (HAY_NFC) {
    CON.q.push({ txt: '', cls: '', fast: true });
    setTimeout(() => { const box = document.createElement('div'); box.innerHTML = NFC_HTML + '<div id="cnfc" class="y">ACERCA TU LLAVE A LA PARTE DE ATRÁS DEL MÓVIL…</div>'; conOut.appendChild(box); conScroll(); }, 900);
    nfcRead(async k => { $('cnfc') && ($('cnfc').textContent = 'LEYENDO LLAVE ' + k.replace(/(..)/g, '$1 ').trim() + ' …'); const r = await api({ a: 'llave', k }); if (!r.ok) throw new Error(r.error); ok(r); },
      t => { const c = $('cnfc'); if (c) { c.textContent = '✖ ' + t.toUpperCase(); c.className = 'r'; } tone(140, 90, 0.3, 'square', 0.08); });
  } else {
    say('ESTE DISPOSITIVO NO LEE NFC. ESCANEA EL CÓDIGO CON TU MÓVIL ANDROID Y ACERCA LA LLAVE:', 'y', 10);
    api({ a: 'qr' }).then(r => { if (!r.ok) { say('ERROR: ' + r.error, 'r', 10); return; }
      const url = location.origin + location.pathname + '?admq=' + r.q, box = document.createElement('div'); box.id = 'conQr'; const old = $('conQr'); if (old) old.remove();
      try { const q = qrcode(0, 'M'); q.addData(url); q.make(); box.innerHTML = '<img src="' + q.createDataURL(8, 4) + '" alt="QR"><div>ESCANÉALO CON TU MÓVIL</div>'; } catch (e) { box.textContent = url; }
      setTimeout(() => { if (CON.on) $('con').appendChild(box); }, 1200);
      clearInterval(admQrT); admQrT = setInterval(async () => { if (!CON.on) return clearInterval(admQrT); const s2 = await api({ a: 'qrEst', q: r.q }); if (s2.estado === 'ok') ok(s2); else if (s2.estado === 'caducado') { clearInterval(admQrT); say('EL CÓDIGO HA CADUCADO. ESCRIBE ADMIN OTRA VEZ.', 'r', 10); } }, 2000);
    });
  }
}
// el móvil que escanea el QR autoriza al otro dispositivo con la llave
(() => {
  const q = new URLSearchParams(location.search).get('admq'); if (!q) return;
  history.replaceState(null, '', location.pathname);
  const a = $('adm'); a.classList.add('on');
  a.innerHTML = '<div class="abody" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"><h3 style="font-size:1.4em">AUTORIZAR ACCESO</h3>' + NFC_HTML + '<div class="amsg" id="amsg">' + (HAY_NFC ? '📡 Acerca tu llave a la parte de atrás del móvil…' : 'Este móvil no lee NFC. Usa un Android con Chrome.') + '</div>' + '<div class="arow"><button class="btn" id="qX">CERRAR</button></div></div>';
  $('qX').onclick = closeAdmin;
  if (HAY_NFC) {     // el lector se activa solo al abrir la pantalla (si Chrome aún no tiene el permiso, basta con tocar en cualquier sitio una única vez)
    const err = t => admMsg(t, 1), go = () => nfcRead(async k => { const r = await api({ a: 'qrOk', q, k }); if (!r.ok) throw new Error(r.error); admMsg('✔ Acceso autorizado. Ya puedes cerrar esto.'); SFX && SFX.win(); }, err);
    err.gesture = () => { admMsg('📡 Acerca tu llave a la parte de atrás del móvil…'); const once = e => { if (e.target && e.target.id === 'qX') return; a.removeEventListener('pointerdown', once); go(); }; a.addEventListener('pointerdown', once); };
    go();
  }
})();


/* ---------- cuentas: jugar con cuenta (progreso en la nube, en cualquier dispositivo) o sin cuenta (solo este dispositivo) ---------- */
const GOOGLE_ID = '454055120059-nuhaop4r62urc3u036cc3grpqo71ulg7.apps.googleusercontent.com';
let ACC = null, GUEST = false; try { ACC = JSON.parse(localStorage.getItem('tl_acc') || 'null'); GUEST = localStorage.getItem('tl_guest') === '1'; } catch (e) {}
/* ======================= TALLER ESPACIAL: crea tus niveles en una cuadrícula ======================= */
const TL_PAL = [
  ['erase', '🧽', 'Borrar'], ['#', '🧱', 'Suelo'], ['=', '➖', 'Plataforma'], ['?', '❓', 'Caja sorpresa'], ['B', '📦', 'Caja rompible'], ['I', '👻', 'Bloque invisible (vida)'], ['F', '🌫️', 'Pared falsa'],
  ['C', '💥', 'Pared agrietada (láser)'], ['!', '❗', 'Interruptor'], ['X', '🟥', 'Bloque rojo'], ['Y', '🟦', 'Bloque azul'], ['D', '🚪', 'Puerta de llaves'],
  ['o:chip', '🪙', 'Chip'], ['o:gear', '⚙️', 'Engranaje'], ['o:key', '🔑', 'Llave'],
  ['o:en:patrulla', '🤖', 'Robot patrulla'], ['o:en:dron', '🚁', 'Dron'], ['o:en:erizo', '🦔', 'Erizo'], ['o:en:alien', '👽', 'Alien'], ['o:en:torreta', '🔫', 'Torreta'],
  ['o:pad', '⏫', 'Saltador'], ['o:spring', '💎', 'Cristal saltarín'], ['o:moverH', '↔️', 'Plataforma móvil ↔'], ['o:moverV', '↕️', 'Plataforma móvil ↕'], ['o:fall', '🪨', 'Roca que se hunde'], ['o:plank', '🪵', 'Peldaño que se cae'], ['o:portal', '🌀', 'Portal (pon 2: ida y vuelta)'],
  ['o:laser', '🔴', 'Láser'], ['o:lavafall', '🌋', 'Cortina de lava'], ['o:geyser', '🔥', 'Géiser'], ['o:jumper', '☄️', 'Bola de magma'], ['o:icicle', '🧊', 'Carámbano'], ['o:snowgun', '⛄', 'Cañón de nieve'],
  ['o:mush', '🍄', 'Seta trampolín'], ['o:vine', '🌿', 'Liana (trepar)'], ['o:spore', '🌸', 'Chorro de esporas'], ['o:fly', '✨', 'Luciérnaga'], ['o:crystal', '🔮', 'Cristal / seta deco'], ['o:cp', '🚩', 'Punto de control'], ['start', '🟢', 'Salida de Lucas'], ['goal', '📡', 'Antena (meta)']];
const TL_FX = [['', 'Sin efecto'], ['water', '🌊 Inundado'], ['chase', '🏃 Te persigue'], ['meteors', '☄️ Meteoritos'], ['dark', '🌑 A oscuras']];
const TL_BOX = ['chip', 'escudo', 'laser', 'turbo', 'iman', 'mini', 'estrella', 'vida'], TL_THEMES = [['', 'Estación'], ['ice', 'Cristal'], ['lava', 'Volcán'], ['jungle', 'Selva']];
let edCamY = null, ED = null, edTool = '#', edBox = 'escudo', edCam = 0, edTest = false, edDirty = false, edHover = null, edDrag = null, edUndo = [];
function tlNew(n) { const w = 120, h = 16, g = []; for (let y = 0; y < h; y++) g.push((y >= h - 2 ? '#' : ' ').repeat(w)); return { n: n || 'Mi nivel', t: '', w, h, g, bx: {}, o: [], s: [3, h - 3], e: [w - 6, h - 3], c: null }; }
function tlObj(B, o, th) { const x = o.x, y = o.y;      // pone una pieza del taller (también sirve para retocar las pantallas reales)
    if (o.k === 'chip') B.chip(x, y); else if (o.k === 'gear') B.gear(x, y); else if (o.k === 'key') B.key(x, y);
    else if (o.k.startsWith('en:')) { const t = o.k.slice(3); B.en(t, x, y, t === 'dron' ? { x0: x - 5, x1: x + 5 } : {}); }
    else if (o.k === 'pad') B.pad(x, y + 1); else if (o.k === 'spring') B.spring(x, y + 1); else if (o.k === 'cp') B.cp(x, y + 1); else if (o.k === 'crystal') B.crystal(x, y + 1, th === 'lava' ? 3 : th === 'jungle' ? 4 + x % 3 : x % 3);
    else if (o.k === 'mush') B.mush(x, y + 1, x % 3); else if (o.k === 'vine') B.vine(x, Math.max(0, y - 6), y); else if (o.k === 'spore') B.spore(x, y + 1, 6, (x % 4) * 0.5); else if (o.k === 'fly') B.fly(x, y);
    else if (o.k === 'moverH') B.mover(x, y, 3, 2.5 * T, 0, 1.1); else if (o.k === 'moverV') B.mover(x, y, 3, 0, 2.5 * T, 1.1); else if (o.k === 'fall') B.fall(x, y, 2); else if (o.k === 'plank') { B.fall(x, y, 1); B.movers[B.movers.length - 1].plank = true; }
    else if (o.k === 'laser') B.laser(x, y, y + 2, (x % 4) * 0.5); else if (o.k === 'lavafall') B.lavafall(x, y, y + 3, (x % 4) * 0.5); else if (o.k === 'geyser') B.geyser(x, y + 1, 4, (x % 5) * 0.6);
    else if (o.k === 'jumper') B.jumper(x, y + 1, 4, (x % 4) * 0.5); else if (o.k === 'icicle') B.icicle(x, y); else if (o.k === 'snowgun') B.snowgun(x, y + 1, -1, 3); }
function buildCustom(d) {
  const B = LB(d.w, d.h), th = d.t || undefined, P = (x, y) => y;
  d.g.forEach((r, y) => { for (let x = 0; x < d.w; x++) { const c = r[x]; if (!c || c === ' ') continue; if (c === '?') B.box(x, y, (d.bx || {})[x + ',' + y] || 'chip'); else if (c === 'I') B.hid(x, y, 'vida'); else B.set(x, y, c); } });
  for (const o of d.o) tlObj(B, o, d.t);
  const pts = d.o.filter(o => o.k === 'portal');          // portales por parejas: el 1º con el 2º, el 3º con el 4º… (ida y vuelta)
  for (let i = 0; i + 1 < pts.length; i += 2) { const a = pts[i], b = pts[i + 1]; B.portal(a.x, a.y + 1, b.x + 1, b.y + 1); B.portal(b.x, b.y + 1, a.x + 1, a.y + 1); }
  const fx = {}, sx = d.s[0];
  if (d.fx === 'water') fx.water = { y: (d.h - 7) * T };
  if (d.fx === 'chase') fx.chase = { x: -9999, speed: 150, startX: (sx + 6) * T, on: false, style: d.t === 'ice' ? 'snow' : d.t === 'jungle' ? 'swarm' : undefined };
  if (d.fx === 'meteors') fx.meteors = { zones: [[(sx + 8) * T, Math.max(sx + 12, d.e[0] - 4) * T]], every: 1.3, acc: 0, style: d.t === 'ice' ? 'comet' : d.t === 'jungle' ? 'seed' : undefined };
  if (d.fx === 'dark') fx.dark = true;
  return B.done(Object.assign(fx, { name: d.n, theme: th, ice: d.t === 'ice', time: 300, custom: true, noLava: d.t !== 'lava' && d.t !== 'jungle', spawn: { x: d.s[0] * T + T / 2, y: (d.s[1] + 1) * T }, goal: { x: d.e[0] * T + T / 2, y: (d.e[1] + 1) * T } }));
}
LEVELS['TALLER'] = () => buildCustom(ED || tlNew());
// --- guardar: con cuenta en la nube (código de 6 letras/números); sin cuenta, en este dispositivo
function tlLocal() { try { return JSON.parse(localStorage.getItem('tl_lvls') || '[]'); } catch (e) { return []; } }
function tlLocalSave(l) { try { localStorage.setItem('tl_lvls', JSON.stringify(l)); } catch (e) {} }
const tlPack = d => JSON.stringify({ v: 1, t: d.t, fx: d.fx || '', w: d.w, h: d.h, g: d.g, bx: d.bx, o: d.o, s: d.s, e: d.e });
function tlUnpack(c, n, t, datos) { const d = JSON.parse(datos); return Object.assign(tlNew(n), d, { n, c, t: d.t || t || '' }); }
async function tlSave() {
  const msg = t => { const m = $('edMsg'); if (m) m.textContent = t; };
  if (!ED.s || !ED.e) return msg('Pon la salida de Lucas y la antena');
  if (ACC) { msg('Guardando…'); const r = await api({ a: 'nivGuardar', ses: ACC.ses, c: ED.c, n: ED.n, t: ED.t, datos: tlPack(ED) }); if (!r.ok) return msg('✖ ' + r.error); ED.c = r.c; edDirty = false; msg('✔ Guardado · código ' + r.c); SFX.chip(); }
  else { const l = tlLocal(); if (!ED.lid) ED.lid = 'L' + Date.now(); const i = l.findIndex(x => x.lid === ED.lid), it = { lid: ED.lid, n: ED.n, t: ED.t, datos: tlPack(ED), f: Date.now() }; if (i >= 0) l[i] = it; else l.unshift(it); tlLocalSave(l); edDirty = false; msg('✔ Guardado en este dispositivo (entra con tu cuenta para tener código y compartirlo)'); SFX.chip(); }
}
// --- la lista de niveles del taller
async function openTaller(info) {
  closeEditor(true); state = 'title'; show('title', true);
  const c = $('card'); c.classList.add('tips');
  c.innerHTML = '<h2>🛠️ TALLER ESPACIAL</h2><div class="tbody" id="tlB"><div style="text-align:center;color:#8ea3e6">Cargando…</div></div><div class="row"><button class="btn" id="tlNew">NUEVO NIVEL</button><button class="btn" id="tlCode">CARGAR CÓDIGO</button><button class="btn" id="tlPub" style="border-color:#ffd23c">🌍 PANTALLAS PÚBLICAS</button><button class="btn" id="tlX">VOLVER</button></div>';
  show('panel', true); $('tlX').onclick = () => show('panel', false);
  $('tlNew').onclick = () => { ED = tlNew('Nivel ' + (new Date().toLocaleDateString('es-ES'))); openEditor(); };
  $('tlCode').onclick = () => tlAskCode();
  $('tlPub').onclick = () => tlPublic('ult');
  let list = [];
  if (ACC) { const r = await api({ a: 'nivMios', ses: ACC.ses }); if (r.ok) list = r.niveles.map(x => ({ c: x.c, n: x.n, t: x.t, f: x.f })); }
  else list = tlLocal().map(x => ({ lid: x.lid, n: x.n, t: x.t, f: x.f }));
  const B = $('tlB'); if (!B) return;
  B.innerHTML = (info ? '<div style="text-align:center;color:#35ff8a;margin-bottom:8px">' + info + '</div>' : '') + (ACC ? '' : '<div style="text-align:center;color:#ffd23c;margin-bottom:8px">Sin cuenta tus niveles se guardan solo en este dispositivo. Entra con tu cuenta para tenerlos en la nube con un código y compartirlos.</div>') +
    (list.length ? list.map((x, i) => '<div class="stat" style="flex-wrap:wrap;gap:6px"><span><b>' + esc(x.n) + '</b> <span style="color:#8ea3e6">' + (TL_THEMES.find(t => t[0] === (x.t || '')) || ['', ''])[1] + (x.c ? ' · código <b style="color:#ffd23c">' + x.c + '</b>' : '') + '</span></span><span style="display:flex;gap:4px;flex-wrap:wrap">' +
      '<button class="btn" data-tp="' + i + '">JUGAR</button><button class="btn" data-te="' + i + '">EDITAR</button><button class="btn" data-tr="' + i + '">NOMBRE</button><button class="btn" data-td="' + i + '" style="border-color:#ff4a6a">BORRAR</button></span></div>').join('') : '<div style="text-align:center">Aún no tienes niveles. ¡Crea el primero!</div>');
  const load = async i => { const x = list[i]; if (x.c) { const r = await api({ a: 'nivGet', c: x.c }); if (!r.ok) throw new Error(r.error); return tlUnpack(r.c, r.n, r.t, r.datos); } const l = tlLocal().find(q => q.lid === x.lid); const d = tlUnpack(null, l.n, l.t, l.datos); d.lid = l.lid; return d; };
  B.querySelectorAll('[data-tp]').forEach(b => b.onclick = async () => { try { ED = await load(+b.dataset.tp); tlPlay(false); } catch (e) { infoPanel('ERROR', esc(e.message)); } });
  B.querySelectorAll('[data-te]').forEach(b => b.onclick = async () => { try { ED = await load(+b.dataset.te); openEditor(); } catch (e) { infoPanel('ERROR', esc(e.message)); } });
  B.querySelectorAll('[data-tr]').forEach(b => b.onclick = async () => { const x = list[+b.dataset.tr], n = ((await uiPrompt('CAMBIAR NOMBRE', 'Nuevo nombre del nivel:', x.n)) || '').trim().slice(0, 30); if (!n) return;
    if (x.c) await api({ a: 'nivNombre', ses: ACC.ses, c: x.c, n }); else { const l = tlLocal(), q = l.find(z => z.lid === x.lid); if (q) { q.n = n; tlLocalSave(l); } } openTaller(); });
  B.querySelectorAll('[data-td]').forEach(b => b.onclick = async () => { if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } const x = list[+b.dataset.td];
    if (x.c) await api({ a: 'nivBorrar', ses: ACC.ses, c: x.c }); else tlLocalSave(tlLocal().filter(z => z.lid !== x.lid)); openTaller(); });
}
async function tlPublic(tab) {
  const c = $('card'); c.classList.add('tips');
  c.innerHTML = '<h2>🌍 PANTALLAS PÚBLICAS</h2><div class="tabs"><button class="btn' + (tab === 'ult' ? ' on' : '') + '" id="tpU">ÚLTIMAS 20</button><button class="btn' + (tab === 'top' ? ' on' : '') + '" id="tpT">🏆 TOP 10 MÁS GUARDADAS</button></div><div class="tbody" id="tpB"><div style="text-align:center;color:#8ea3e6">Cargando…</div></div><div class="row"><button class="btn" id="tpX">VOLVER</button></div>';
  show('panel', true); $('tpX').onclick = () => openTaller(); $('tpU').onclick = () => tlPublic('ult'); $('tpT').onclick = () => tlPublic('top');
  const r = await api({ a: 'nivPublicos' }), B = $('tpB'); if (!B) return; if (!r.ok) { B.textContent = r.error || 'Sin conexión'; return; }
  const l = tab === 'top' ? r.top : r.ultimos;
  B.innerHTML = '<div style="text-align:center;color:#8ea3e6;margin-bottom:8px">' + (tab === 'top' ? 'Las pantallas que más jugadores tienen guardadas en su taller ahora mismo. Si alguien la borra, baja en el top.' : 'Las 20 últimas pantallas creadas por los jugadores.') + '</div>' +
    (l.length ? l.map((x, i) => '<div class="stat" style="flex-wrap:wrap;gap:6px"><span>' + (tab === 'top' ? (i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.') + ' ' : '') + '<b>' + esc(x.n) + '</b> <span style="color:#8ea3e6">de ' + esc(x.autor) + ' · ' + (TL_THEMES.find(t => t[0] === (x.t || '')) || ['', ''])[1] + ' · código <b style="color:#ffd23c">' + x.c + '</b> · 💾 ' + x.copias + '</span></span><span style="display:flex;gap:4px"><button class="btn" data-pp="' + x.c + '">JUGAR</button><button class="btn" data-pg="' + x.c + '" style="border-color:#35ff8a">GUARDAR</button></span></div>').join('') : '<div style="text-align:center">' + (tab === 'top' ? 'Todavía ninguna pantalla ha sido guardada por otros jugadores.' : 'Todavía no hay pantallas publicadas.') + '</div>');
  B.querySelectorAll('[data-pp]').forEach(b => b.onclick = async () => { const q = await api({ a: 'nivGet', c: b.dataset.pp }); if (!q.ok) return infoPanel('ERROR', esc(q.error)); ED = tlUnpack(null, q.n, q.t, q.datos); tlPlay(false); });
  B.querySelectorAll('[data-pg]').forEach(b => b.onclick = async () => { b.textContent = '…';
    if (ACC) { const q = await api({ a: 'nivCopiar', ses: ACC.ses, c: b.dataset.pg }); b.textContent = q.ok ? '✔ GUARDADA' : '✖ ' + q.error; if (q.ok) SFX.life(); }
    else { const q = await api({ a: 'nivGet', c: b.dataset.pg }); if (!q.ok) { b.textContent = '✖'; return; } const ll = tlLocal(); ll.unshift({ lid: 'L' + Date.now(), n: q.n, t: q.t, datos: q.datos, f: Date.now() }); tlLocalSave(ll); b.textContent = '✔ GUARDADA'; SFX.life(); } });
}
function tlAskCode() {
  const c = $('card'); c.classList.remove('tips');
  c.innerHTML = '<h2>CARGAR UN NIVEL</h2><div style="color:#cfe0ff;margin:6px 0">Escribe el código de 6 letras y números que te han pasado:</div><input id="tlC" maxlength="6" style="font:900 26px system-ui;letter-spacing:.3em;text-transform:uppercase;width:220px;text-align:center;padding:8px;border-radius:10px;border:2px solid #29e6ff;background:#020a1e;color:#fff"><div id="tlM" style="min-height:1.4em;color:#ffd23c;margin-top:6px"></div><div class="row"><button class="btn" id="tlG">CARGAR</button><button class="btn" id="tlB2">VOLVER</button></div>';
  show('panel', true); $('tlB2').onclick = () => openTaller(); setTimeout(() => $('tlC').focus(), 100);
  $('tlG').onclick = async () => { const code = $('tlC').value.trim().toUpperCase(); if (code.length !== 6) { $('tlM').textContent = 'El código tiene 6 caracteres'; return; } $('tlM').textContent = 'Buscando…';
    const lk = await api({ a: 'nivLlave', c: code, ids: ALLN().map(n => n.id) }); if (lk.ok && lk.id) { const nd = ALLN().find(n => n.id === lk.id); $('tlM').textContent = ''; if (nd && await uiConfirm('🔓 CÓDIGO DE NIVEL', 'Tu partida se ajustará a la fase <b>' + lvlName(nd) + '</b>:<br>todas las anteriores quedarán abiertas (conservas tus estrellas) y desde ahí en adelante, con candado.', 'AJUSTAR', 'CANCELAR')) unlockTo(lk.id); return; }
    if (ACC) { const r = await api({ a: 'nivCopiar', ses: ACC.ses, c: code }); if (!r.ok) { $('tlM').textContent = '✖ ' + r.error; return; } SFX.life(); openTaller('✔ «' + esc(r.n) + '» guardado en tu taller con el código ' + r.c); }
    else { const r = await api({ a: 'nivGet', c: code }); if (!r.ok) { $('tlM').textContent = '✖ ' + r.error; return; } const l = tlLocal(); l.unshift({ lid: 'L' + Date.now(), n: r.n, t: r.t, datos: r.datos, f: Date.now() }); tlLocalSave(l); SFX.life(); openTaller('✔ «' + esc(r.n) + '» guardado en este dispositivo'); } };
}
function tlPlay(test) { edTest = test; closeEditor(true); curId = 'TALLER'; startGame(); }
function tallerBack() { show('panel', false); if (edTest) openEditor(); else openTaller(); }
// --- el editor
(() => { const st = document.createElement('style'); st.textContent = `
#ed{position:fixed;inset:0;z-index:30;display:none;pointer-events:none;font-family:system-ui,sans-serif}
#ed.on{display:block}
#ed .bar{pointer-events:auto;position:absolute;left:0;right:0;top:0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:calc(6px + env(safe-area-inset-top)) calc(8px + env(safe-area-inset-right)) 6px calc(8px + env(safe-area-inset-left));background:linear-gradient(180deg,rgba(4,6,22,.92),rgba(4,6,22,.6))}
#ed .bar input,#ed .bar select{font:700 13px system-ui;color:#fff;background:#020a1e;border:1px solid #29e6ff;border-radius:8px;padding:6px 8px}
#ed .btn{font-size:12px;padding:7px 10px;border-radius:10px}
#ed .pal{pointer-events:auto;position:absolute;left:0;right:0;bottom:0;display:flex;gap:4px;overflow-x:auto;touch-action:pan-x;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:6px calc(8px + env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));background:linear-gradient(0deg,rgba(4,6,22,.95),rgba(4,6,22,.7));scrollbar-width:thin}
#ed .pal button{touch-action:pan-x;flex:0 0 auto;width:58px;height:56px;border-radius:10px;border:1px solid rgba(41,230,255,.4);background:rgba(10,20,50,.85);color:#cfe0ff;font:700 9px system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.05;text-align:center;padding:2px;cursor:pointer}
#ed .pal button span{font-size:22px}
#ed .pal button.on,#ed .pal button.pf{border-color:#35ff8a;box-shadow:0 0 12px rgba(53,255,138,.7);color:#fff}
#ed .msg{position:absolute;left:50%;transform:translateX(-50%);top:calc(74px + env(safe-area-inset-top));color:#ffd23c;font:800 13px system-ui;text-shadow:0 1px 3px #000;pointer-events:none;text-align:center}
#ed .scr{pointer-events:auto;position:absolute;left:12px;right:12px;top:calc(50px + env(safe-area-inset-top));accent-color:#29e6ff}`; document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'ed'; document.body.appendChild(d); })();
function openEditor() {
  show('panel', false); show('title', false); show('top', false); show('touch', false); show('mapUI', false);
  state = 'edit'; paused = false; curId = 'TALLER'; L = buildLevel(); spawnEnemies(); P = newPlayer(L.spawn.x, L.spawn.y); items = []; shots = []; parts = []; cam.y = L.H * T - VHv; edCam = Math.max(0, Math.min(cam.x, L.W * T - VW)); cam.x = edCam;
  edCamY = null; const e = $('ed'); e.classList.add('on');
  e.innerHTML = '<div class="bar"><input id="edN" maxlength="30" value="' + esc(ED.n) + '" style="width:120px"><select id="edT">' + TL_THEMES.map(t => '<option value="' + t[0] + '"' + (t[0] === (ED.t || '') ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select><select id="edFx" title="Efecto del nivel">' + TL_FX.map(t => '<option value="' + t[0] + '"' + (t[0] === (ED.fx || '') ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select>' +
    '<span style="color:#8ea3e6;font:700 12px system-ui">Largo</span><button class="btn" id="edW-">−</button><span id="edWv" style="color:#fff;font:800 13px system-ui;min-width:30px;text-align:center">' + ED.w + '</span><button class="btn" id="edW+">+</button>' +
    '<select id="edBx" title="Premio de la caja sorpresa">' + TL_BOX.map(b => '<option value="' + b + '"' + (b === edBox ? ' selected' : '') + '>❓ ' + POWER_NAME[b === 'chip' ? 'vida' : b].replace('+1 VIDA', b === 'chip' ? 'CHIP' : '+1 VIDA') + '</option>').join('') + '</select>' +
    '<button class="btn" id="edU">DESHACER</button><button class="btn" id="edMv">✋ MOVER</button><span style="flex:1"></span>' + (ED.c ? '<span style="color:#ffd23c;font:800 13px system-ui">' + ED.c + '</span>' : '') + '<button class="btn" id="edP" style="border-color:#35ff8a">▶ PROBAR</button><button class="btn" id="edS">GUARDAR</button><button class="btn" id="edX">SALIR</button></div>' +
    '<div class="msg" id="edMsg">' + (TOUCH ? 'Toca para poner · arrastra para pintar · ✋ MOVER para desplazarte' : 'Clic para poner · arrastra para pintar · rueda o flechas para desplazarte · clic derecho borra') + '</div>' +
    '<input type="range" class="scr" id="edScr" min="0" max="1000" value="0">' +
    '<div class="pal">' + TL_PAL.map(p => '<button data-t="' + p[0] + '"' + (p[0] === edTool ? ' class="on"' : '') + '><span>' + p[1] + '</span>' + p[2] + '</button>').join('') + '</div>';
  e.querySelectorAll('.pal button').forEach(b => b.onclick = () => { edTool = b.dataset.t; e.querySelectorAll('.pal button').forEach(q => q.classList.toggle('on', q === b)); $('edMv').classList.remove('on'); tone(900, 900, 0.04, 'square', 0.05); });
  $('edN').oninput = () => { ED.n = $('edN').value; edDirty = true; };
  $('edT').onchange = () => { ED.t = $('edT').value; edRebuild(); };
  const edLay = () => { const bh = e.querySelector('.bar').offsetHeight; $('edScr').style.top = (bh + 6) + 'px'; $('edMsg').style.top = (bh + 26) + 'px'; }; edLay(); setTimeout(edLay, 50); addEventListener('resize', edLay);
  $('edFx').onchange = () => { ED.fx = $('edFx').value; edDirty = true; edRebuild(); };
  $('edBx').onchange = () => { edBox = $('edBx').value; };
  $('edW-').onclick = () => edResize(-20); $('edW+').onclick = () => edResize(20);
  $('edU').onclick = edUndoDo;
  $('edMv').onclick = () => { edTool = 'move'; $('edMv').classList.add('on'); e.querySelectorAll('.pal button').forEach(q => q.classList.remove('on')); };
  $('edP').onclick = () => { if (!ED.s || !ED.e) { $('edMsg').textContent = 'Pon la salida de Lucas y la antena'; return; } tlPlay(true); };
  $('edS').onclick = () => tlSave();
  $('edX').onclick = () => { if (edDirty && $('edX').dataset.ok !== '1') { $('edX').dataset.ok = '1'; $('edX').textContent = '¿SIN GUARDAR?'; return; } openTaller(); };
  $('edScr').oninput = () => { edCam = $('edScr').value / 1000 * Math.max(0, L.W * T - VW); };
  preTheme(ED.t);
}
/* ---------- editor de las pantallas reales (modo pruebas · pausa › EDITAR) ---------- */
const ptEmpty = () => ({ t: {}, bx: {}, d: [], a: [] });
const ptIsEmpty = p => !p || (!Object.keys(p.t || {}).length && !(p.d || []).length && !(p.a || []).length && !p.s && !p.e);
function offRefreshED() { ED = { n: EDO.id, t: L.theme || '', fx: '', w: L.W, h: L.H, g: L.g.map(r => r.join('')), bx: L.boxes || {}, o: EDO.p.a, s: null, e: null }; }
function offRebuild() { curId = EDO.id; EDRAFT[EDO.id] = EDO.p; L = buildLevel(); spawnEnemies(); items = []; shots = []; P = newPlayer(L.spawn.x, L.spawn.y); P.x = EDO.px; P.y = EDO.py; offRefreshED(); }
function openEditOff() {
  if (!L || L.custom || !CHEAT.test) return;
  const base = EDRAFT[curId] || PATCH[curId], p0 = Object.assign(ptEmpty(), base ? JSON.parse(JSON.stringify(base)) : {});
  EDO = { id: curId, p: p0, px: P.x, py: P.y, oldED: ED, undo: [], dirty: !!EDRAFT[curId] };
  paused = false; show('panel', false); show('top', false); show('touch', false); state = 'edit'; offRebuild();
  edCam = P.x - VW / 2; edCamY = P.y - VHv / 2; if (edTool === 'move') edTool = '#';
  const e = $('ed'), nd = ALLN().find(n => n.id === EDO.id); e.classList.add('on');
  e.innerHTML = '<div class="bar"><b style="color:#ffd23c;font:900 13px system-ui;letter-spacing:.06em">✏️ ' + (nd ? lvlName(nd) : EDO.id) + '</b>' +
    '<select id="edBx" title="Premio de la caja sorpresa">' + TL_BOX.map(b => '<option value="' + b + '"' + (b === edBox ? ' selected' : '') + '>❓ ' + POWER_NAME[b === 'chip' ? 'vida' : b].replace('+1 VIDA', b === 'chip' ? 'CHIP' : '+1 VIDA') + '</option>').join('') + '</select>' +
    '<button class="btn" id="edU">DESHACER</button><button class="btn" id="edMv">✋ MOVER</button><span style="flex:1"></span>' +
    '<button class="btn" id="edP" style="border-color:#35ff8a">▶ PROBAR</button><button class="btn" id="edS" style="border-color:#ffd23c">GUARDAR</button><button class="btn" id="edR">ORIGINAL</button><button class="btn" id="edX">SALIR</button></div>' +
    '<div class="msg" id="edMsg">Pantalla real del juego: lo que guardes les sale a todos los jugadores · ' + (TOUCH ? 'toca para poner · 🧽 borra · ✋ MOVER para desplazarte' : 'clic para poner · clic derecho borra · flechas o rueda para moverte') + '</div>' +
    (L.vert ? '' : '<input type="range" class="scr" id="edScr" min="0" max="1000" value="0">') +
    '<div class="pal">' + TL_PAL.map(p => '<button data-t="' + p[0] + '"' + (p[0] === edTool ? ' class="on"' : '') + '><span>' + p[1] + '</span>' + p[2] + '</button>').join('') + '</div>';
  const msg = t => { const m = $('edMsg'); if (m) m.textContent = t; };
  e.querySelectorAll('.pal button').forEach(b => b.onclick = () => { edTool = b.dataset.t; e.querySelectorAll('.pal button').forEach(q => q.classList.toggle('on', q === b)); $('edMv').classList.remove('on'); tone(900, 900, 0.04, 'square', 0.05); });
  const edLay = () => { const bh = e.querySelector('.bar').offsetHeight; if ($('edScr')) $('edScr').style.top = (bh + 6) + 'px'; $('edMsg').style.top = (bh + (L.vert ? 6 : 26)) + 'px'; }; edLay(); setTimeout(edLay, 50);
  $('edBx').onchange = () => { edBox = $('edBx').value; };
  $('edU').onclick = edUndoDo;
  $('edMv').onclick = () => { edTool = 'move'; $('edMv').classList.add('on'); e.querySelectorAll('.pal button').forEach(q => q.classList.remove('on')); };
  if ($('edScr')) $('edScr').oninput = () => { edCam = $('edScr').value / 1000 * Math.max(0, L.W * T - VW); };
  $('edP').onclick = () => offLeave(true);
  $('edX').onclick = async () => { if (EDO.dirty && !(await uiConfirm('¿SALIR SIN GUARDAR?', 'Los cambios que no has guardado de esta fase se pierden.', 'SALIR', 'SEGUIR EDITANDO'))) return; delete EDRAFT[EDO.id]; offLeave(false); };
  $('edS').onclick = async () => {
    if (!ACC) return msg('✖ Entra con tu cuenta de dueño para guardar los cambios');
    msg('Guardando…'); const p = ptIsEmpty(EDO.p) ? null : EDO.p, r = await api({ a: 'parcheGuardar', ses: ACC.ses, id: EDO.id, p });
    if (!r.ok) return msg('✖ ' + r.error);
    if (p) PATCH[EDO.id] = JSON.parse(JSON.stringify(p)); else delete PATCH[EDO.id]; try { localStorage.setItem('tl_pt', JSON.stringify(PATCH)); } catch (e) {}
    delete EDRAFT[EDO.id]; EDO.dirty = false; SFX.life(); msg('✔ Guardado: ya les sale así a todos los jugadores'); };
  $('edR').onclick = async () => {
    if (!(await uiConfirm('¿VOLVER A LA ORIGINAL?', 'Se quitan todos los retoques de esta fase y vuelve a quedar como venía en el juego, también para todos los jugadores.', 'VOLVER A LA ORIGINAL', 'CANCELAR'))) return;
    if (PATCH[EDO.id]) { if (!ACC) return msg('✖ Entra con tu cuenta de dueño para quitar los retoques'); const r = await api({ a: 'parcheGuardar', ses: ACC.ses, id: EDO.id, p: null }); if (!r.ok) return msg('✖ ' + r.error); delete PATCH[EDO.id]; try { localStorage.setItem('tl_pt', JSON.stringify(PATCH)); } catch (e) {} }
    EDO.undo.push(JSON.stringify(EDO.p)); EDO.p = ptEmpty(); delete EDRAFT[EDO.id]; offRebuild(); delete EDRAFT[EDO.id]; EDO.dirty = false; SFX.chip(); msg('✔ La fase ha vuelto a ser la original'); };
  preTheme(L.theme);
}
function offLeave(test) {          // vuelve a jugar desde donde estaba Lucas (PROBAR conserva los cambios sin guardar)
  const px = EDO.px, py = EDO.py; if (!test) delete EDRAFT[EDO.id]; else if (EDO.dirty) EDRAFT[EDO.id] = EDO.p; else delete EDRAFT[EDO.id];
  ED = EDO.oldED; curId = EDO.id; EDO = null; closeEditor(); edDrag = null;
  L = buildLevel(); spawnEnemies(); items = []; shots = []; parts = []; P = newPlayer(L.spawn.x, L.spawn.y); P.x = px; P.y = py; P.inv = Math.max(P.inv || 0, 1.5);
  cam.x = P.x - VW * 0.4; cam.y = P.y - VHv * 0.6; state = 'play'; paused = false; show('top', true); show('touch', TOUCH && !padUsed); checkRot();
}
function offPut(tx, ty, erase) {
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return;
  const p = EDO.p, t = erase ? 'erase' : edTool, k = tx + ',' + ty, cur = L.g[ty][tx];
  if (t === 'erase') { p.a = p.a.filter(o => !(o.x === tx && o.y === ty)); if (!p.d.includes(k)) p.d.push(k); p.t[k] = ' '; delete p.bx[k]; }
  else if (t === 'start') p.s = [tx, ty]; else if (t === 'goal') p.e = [tx, ty];
  else if (t.startsWith('o:')) { const kk = t.slice(2); if (p.a.some(o => o.x === tx && o.y === ty && o.k === kk)) return; p.a = p.a.filter(o => !(o.x === tx && o.y === ty)); p.a.push({ k: kk, x: tx, y: ty }); if (cur !== ' ' && cur !== '=') p.t[k] = ' '; }
  else { if (cur === t && (t !== '?' || p.bx[k] === edBox)) return; p.t[k] = t; if (t === '?') p.bx[k] = edBox; else delete p.bx[k]; }
  EDO.dirty = true; offRebuild();
}
function edUndoDo() { if (EDO) { const u = EDO.undo.pop(); if (u) { EDO.p = JSON.parse(u); EDO.dirty = true; offRebuild(); } return; } const u = edUndo.pop(); if (u) { ED = u; edRebuild(); } }
function closeEditor(keep) { const e = $('ed'); if (e) { e.classList.remove('on'); e.innerHTML = ''; } }
function edRebuild() { if (EDO) return offRebuild(); const cx = edCam; curId = 'TALLER'; L = buildLevel(); spawnEnemies(); P = newPlayer(L.spawn.x, L.spawn.y); edCam = cx; edDirty = true; preTheme(ED.t); }
function edSnap() { if (EDO) { EDO.undo.push(JSON.stringify(EDO.p)); if (EDO.undo.length > 60) EDO.undo.shift(); return; } edUndo.push(JSON.parse(JSON.stringify(ED))); if (edUndo.length > 40) edUndo.shift(); }
function edResize(dw) { const w = Math.max(40, Math.min(300, ED.w + dw)); if (w === ED.w) return; edSnap();
  ED.g = ED.g.map((r, y) => w > ED.w ? r + (y >= ED.h - 2 ? '#' : ' ').repeat(w - ED.w) : r.slice(0, w)); ED.w = w; ED.o = ED.o.filter(o => o.x < w); if (ED.e && ED.e[0] >= w) ED.e = [w - 4, ED.e[1]]; if (ED.s && ED.s[0] >= w) ED.s = [2, ED.s[1]]; $('edWv').textContent = w; edRebuild(); }
function edPut(tx, ty, erase) {
  if (EDO) return offPut(tx, ty, erase);
  if (tx < 0 || ty < 0 || tx >= ED.w || ty >= ED.h) return;
  const t = erase ? 'erase' : edTool, setT = c => { ED.g[ty] = ED.g[ty].slice(0, tx) + c + ED.g[ty].slice(tx + 1); }, key = tx + ',' + ty;
  const cur = ED.g[ty][tx], ob = ED.o.find(o => o.x === tx && o.y === ty);
  if (t === 'erase') { if (!ob && cur === ' ') return; ED.o = ED.o.filter(o => o !== ob); setT(' '); delete ED.bx[key]; }
  else if (t === 'start') { ED.s = [tx, ty]; }
  else if (t === 'goal') { ED.e = [tx, ty]; }
  else if (t.startsWith('o:')) { const k = t.slice(2); if (ob && ob.k === k) return; ED.o = ED.o.filter(o => o !== ob); ED.o.push({ k, x: tx, y: ty }); if (cur !== ' ' && cur !== '=') setT(' ');
    if (k === 'portal') { const n = ED.o.filter(o => o.k === 'portal').length, m = $('edMsg'); if (m) m.textContent = n % 2 ? '🌀 Portal de entrada puesto: ahora pon el portal de salida' : '🌀 ¡Pareja de portales lista! Se puede ir y volver por ellos'; } }
  else { if (cur === t && (t !== '?' || ED.bx[key] === edBox)) return; setT(t); if (ob) ED.o = ED.o.filter(o => o !== ob); if (t === '?') ED.bx[key] = edBox; else delete ED.bx[key]; }
  edRebuild();
}
function edCell(e) { const x = e.clientX * DPR / SC, y = e.clientY * DPR / SC; return [Math.floor((x + cam.x) / T), Math.floor((y + cam.y) / T)]; }
cv.addEventListener('pointerdown', e => { if (state !== 'edit') return; e.preventDefault(); const [tx, ty] = edCell(e);
  if (edTool === 'move' || e.button === 1) { edDrag = { x: e.clientX, y: e.clientY, cam: edCam, camY: edCamY, pan: true }; return; }
  edSnap(); edDrag = { erase: e.button === 2, last: tx + ',' + ty }; edPut(tx, ty, e.button === 2); });
cv.addEventListener('pointermove', e => { if (state !== 'edit') return; const [tx, ty] = edCell(e); edHover = [tx, ty]; if (!edDrag) return;
  if (edDrag.pan) { edCam = edDrag.cam - (e.clientX - edDrag.x) * DPR / SC; edCamY = edDrag.camY - (e.clientY - edDrag.y) * DPR / SC; return; }
  const k = tx + ',' + ty; if (k !== edDrag.last && !['start', 'goal', 'o:portal'].includes(edTool)) { edDrag.last = k; edPut(tx, ty, edDrag.erase); } });
addEventListener('pointerup', () => { edDrag = null; });
cv.addEventListener('contextmenu', e => { if (state === 'edit') e.preventDefault(); });
cv.addEventListener('wheel', e => { if (state !== 'edit') return; if (e.shiftKey) edCamY += e.deltaY; else edCam += (e.deltaX || e.deltaY) * 1.2; e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => { if (state !== 'edit' || (e.target && e.target.tagName === 'INPUT')) return; if (e.code === 'ArrowRight') edCam += 96; if (e.code === 'ArrowLeft') edCam -= 96; if (e.code === 'ArrowUp') edCamY -= 96; if (e.code === 'ArrowDown') edCamY += 96; if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') edUndoDo(); });
// mando: cruceta mueve el cursor, ✕ pone, ○ borra, L1/R1 cambian de pieza
let edPad = { x: 5, y: 10, prev: {} };
function edPadPoll(gp) { if (state !== 'edit' || !gp) return; const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), P2 = edPad.prev, edge = i => b(i) && !P2[i];
  if (!ED) return; if (edge(15)) edPad.x++; if (edge(14)) edPad.x--; if (edge(12)) edPad.y--; if (edge(13)) edPad.y++; edPad.x = Math.max(0, Math.min(ED.w - 1, edPad.x)); edPad.y = Math.max(0, Math.min(ED.h - 1, edPad.y)); edHover = [edPad.x, edPad.y];
  const sx = edPad.x * T - cam.x, sy = edPad.y * T - cam.y; if (sx < 80) edCam -= 96; if (sx > VW - 120) edCam += 96; if (sy < 70) edCamY -= 96; if (sy > VHv - 150) edCamY += 96;
  if (edge(0)) { edSnap(); edPut(edPad.x, edPad.y, false); } if (edge(1)) { edSnap(); edPut(edPad.x, edPad.y, true); }
  if (edge(4) || edge(5)) { const i = TL_PAL.findIndex(p => p[0] === edTool), n = (Math.max(0, i) + (edge(5) ? 1 : -1) + TL_PAL.length) % TL_PAL.length; edTool = TL_PAL[n][0]; const bts = $('ed').querySelectorAll('.pal button'); bts.forEach((q, k) => q.classList.toggle('on', k === n)); bts[n] && bts[n].scrollIntoView({ inline: 'center', block: 'nearest' }); }
  if (edge(3)) { if (EDO) offLeave(true); else tlPlay(true); }
  for (let i = 0; i < 16; i++) P2[i] = b(i); }
function drawEditorOverlay() {
  const x0 = Math.floor(cam.x / T), x1 = Math.min(ED.w - 1, Math.ceil((cam.x + VW) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(ED.h - 1, Math.ceil((cam.y + VHv) / T));
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  ctx.strokeStyle = 'rgba(127,233,255,.13)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * T, y0 * T); ctx.lineTo(x * T, (y1 + 1) * T); } for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * T, y * T); ctx.lineTo((x1 + 1) * T, y * T); } ctx.stroke();
  ctx.font = '800 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = ED.g[y][x];
    if (c === 'I') { ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('?', x * T + T / 2, y * T + T / 2 + 1); }
    if (c === 'F') { ctx.fillStyle = 'rgba(198,60,255,.28)'; ctx.fillRect(x * T, y * T, T, T); } }
  for (const o of ED.o) if (o.x >= x0 && o.x <= x1 && ['laser', 'lavafall', 'jumper', 'snowgun', 'icicle', 'portal'].includes(o.k)) { ctx.globalAlpha = 0.6; ctx.fillText(TL_PAL.find(p => p[0] === 'o:' + o.k)[1], o.x * T + T / 2, o.y * T + T / 2); ctx.globalAlpha = 1; }
  if (ED.s) { ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 2; ctx.strokeRect(ED.s[0] * T + 1, ED.s[1] * T + 1, T - 2, T - 2); }
  if (edHover) { const [hx, hy] = edHover; ctx.strokeStyle = '#ffd23c'; ctx.lineWidth = 3; ctx.strokeRect(hx * T + 1.5, hy * T + 1.5, T - 3, T - 3); const p = TL_PAL.find(q => q[0] === edTool); if (p && edTool !== 'move') { ctx.globalAlpha = 0.55; ctx.fillText(p[1], hx * T + T / 2, hy * T + T / 2); ctx.globalAlpha = 1; } }
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}
/* ---------- jugador: código anónimo del dispositivo (para no contar dos veces a la misma persona el mismo día) ---------- */
let PID = ''; try { PID = localStorage.getItem('tl_id') || ''; if (!PID) { PID = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 16); localStorage.setItem('tl_id', PID); } } catch (e) { PID = 'x'; }
const who = () => ({ id: PID, ses: ACC && ACC.ses || '' });
/* ---------- ranking: suma de tus mejores puntuaciones de cada fase conseguidas SIN trucos ---------- */
const cheatOn = () => CODES.some(c => CHEAT[c[0].toLowerCase()]) || TMPON.length > 0;
let rankT = null;
function rankSend() { clearTimeout(rankT); rankT = setTimeout(() => { let p = 0, f = 0, e = 0; for (const k in PROG) { p += PROG[k].rb || 0; if (PROG[k].rb) f++; e += PROG[k].stars || 0; } if (p <= 0) return;
  let nick = ''; try { nick = localStorage.getItem('tl_nick') || ''; } catch (x) {} api(Object.assign({ a: 'puntos', puntos: p, fases: f, estrellas: e, nombre: nick }, who())); }, 1500); }
async function showRanking() {
  const c = $('card'); c.classList.add('tips'); c.innerHTML = '<h2>🏆 RANKING</h2><div class="tbody" id="rkB" style="text-align:center">Cargando…</div><div class="row"><button class="btn" id="rkX">CERRAR</button></div>'; show('panel', true); $('rkX').onclick = () => show('panel', false);
  const r = await api(Object.assign({ a: 'ranking' }, who())); const B = $('rkB'); if (!B) return;
  if (!r.ok) { B.textContent = r.error || 'Sin conexión'; return; }
  let nick = ''; try { nick = localStorage.getItem('tl_nick') || ''; } catch (x) {}
  B.innerHTML = '<div style="color:#8ea3e6;margin-bottom:8px">Suma de tus mejores puntos en cada fase. Las partidas con trucos no cuentan.</div>' +
    (r.top.length ? r.top.map((x, i) => '<div class="stat" style="' + (x.yo ? 'color:#35ff8a;text-shadow:0 0 8px #35ff8a' : '') + '"><span>' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.') + ' ' + esc(x.n) + '</span><b>' + x.p + '</b></div>').join('') : '<div>Todavía no hay nadie. ¡Sé el primero!</div>') +
    (r.yo && r.yo.pos > 30 ? '<div class="stat" style="color:#35ff8a;margin-top:6px"><span>' + r.yo.pos + '. ' + esc(r.yo.n) + ' (tú)</span><b>' + r.yo.p + '</b></div>' : '') +
    (!ACC ? '<div style="margin-top:12px">Tu nombre en el ranking: <input class="ain" id="rkN" maxlength="18" value="' + esc(nick) + '" placeholder="Invitado" style="font:inherit;padding:6px;border-radius:6px;border:1px solid #29e6ff;background:#020a1e;color:#fff;width:150px"> <button class="btn" id="rkS">GUARDAR</button></div>' : '');
  if (!ACC) $('rkS').onclick = () => { try { localStorage.setItem('tl_nick', $('rkN').value.trim().slice(0, 18)); } catch (x) {} rankSend(); SFX.chip(); setTimeout(showRanking, 2600); };
}
/* ---------- trucos temporales del admin: se activan con una palabra, una combinación del mando o toques rápidos, solo para la fase que se está jugando ---------- */
let TMP = [], TMPON = [];
const TSAL = 'tl-turbo-lucas-25';
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
function tmpLoad() { api({ a: 'tmp' }).then(r => { if (r.ok) TMP = r.tmp || []; }); }
setTimeout(tmpLoad, 4000); setInterval(tmpLoad, 300000);
async function tmpCheck(kind, seq) {        // kind: 'k' teclas, 'p' mando, 'n' toques
  if (state !== 'play' || !TMP.length || !crypto.subtle) return;
  const pre = { k: 'K', p: 'P', n: 'T' }[kind], cands = kind === 'n' ? [seq] : kind === 'k' ? Array.from({ length: Math.min(12, seq.length) - 2 }, (_, i) => seq.slice(-(i + 3))) : Array.from({ length: Math.min(10, seq.length) - 1 }, (_, i) => seq.slice(-(i + 2)).join('+'));
  for (const c of cands) { const h = await sha256(TSAL + pre + c); const t = TMP.find(x => x[kind] === h); if (t) { tmpOn(t.truco); return; } }
}
function tmpOn(k) { if (!(k in CHEAT) || CHEAT[k]) return; CHEAT[k] = true; if (k === 'floor') CHEAT.floorT = 0; TMPON.push(k); G.tr = true; tone(1760, 2640, 0.12, 'sine', 0.05); }
function tmpOff() { TMPON.forEach(k => { CHEAT[k] = false; }); TMPON = []; }
const KBUF = []; addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; if (/^Key[A-Z]$|^Digit[0-9]$/.test(e.code)) { KBUF.push(e.code.slice(-1)); if (KBUF.length > 12) KBUF.shift(); tmpCheck('k', KBUF.join('')); } });
const PBUF = [], PNAMES = ['X', 'O', 'CUADRADO', 'TRIANGULO', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQUIERDA', 'DERECHA'], PPREV = [];
let l1r1 = { n: 0, t: 0, prev: false };
function padNames(gp) {
  for (let i = 0; i < 16; i++) { const on = !!(gp.buttons[i] && gp.buttons[i].pressed); if (on && !PPREV[i]) { PBUF.push(PNAMES[i]); if (PBUF.length > 10) PBUF.shift(); tmpCheck('p', PBUF.slice()); } PPREV[i] = on; }
  const both = !!(gp.buttons[4] && gp.buttons[4].pressed && gp.buttons[5] && gp.buttons[5].pressed);          // L1+R1 tres veces en el mapa: panel de admin
  if (both && !l1r1.prev && state === 'map') { const now = performance.now(); l1r1.n = now - l1r1.t < 1500 ? l1r1.n + 1 : 1; l1r1.t = now; if (l1r1.n >= 3) { l1r1.n = 0; adminAsk(true); } } l1r1.prev = both;
}
let taps = { n: 0, t: 0, to: null };
function tapCount() { const now = performance.now(); taps.n = now - taps.t < 450 ? taps.n + 1 : 1; taps.t = now; clearTimeout(taps.to); taps.to = setTimeout(() => { if (taps.n >= 4) tmpCheck('n', String(taps.n)); taps.n = 0; }, 500); }
let mapTaps = { n: 0, t: 0 };
function mapEmptyTap() { const now = performance.now(); mapTaps.n = now - mapTaps.t < 500 ? mapTaps.n + 1 : 1; mapTaps.t = now; if (mapTaps.n >= 10) { mapTaps.n = 0; adminAsk(false); } }
function adminAsk(pad) { if (CON.on) return; openConsole(pad); setTimeout(() => conAdmin(), 1500); }
(() => { const st = document.createElement('style'); st.textContent = `
.card.acc{width:min(94vw,520px);max-height:94vh;overflow-y:auto;text-align:center;padding:16px 20px}
.opt{display:flex;gap:14px;align-items:center;text-align:left;width:100%;margin:8px 0;padding:14px 16px;border-radius:16px;border:2px solid var(--cy);background:rgba(12,20,52,.85);color:#fff;font:inherit;cursor:pointer;box-shadow:0 0 14px rgba(41,230,255,.35)}
.opt.rec{border-color:var(--gr);box-shadow:0 0 20px rgba(53,255,138,.5)}.opt .oi{font-size:30px;flex:none}.opt b{font-size:16px;letter-spacing:.05em;display:block}.opt span{font-size:13px;color:#cfe0ff;line-height:1.35}
.opt .bdg{display:inline-block;font-size:10px;font-weight:900;color:#010309;background:var(--gr);border-radius:5px;padding:1px 6px;margin-left:6px;vertical-align:middle;letter-spacing:.08em}
.opt.pf{outline:3px solid #fff;outline-offset:3px}
.fin{width:100%;font:inherit;font-size:16px;color:#fff;background:rgba(2,10,30,.9);border:1.5px solid rgba(41,230,255,.6);border-radius:10px;padding:11px 12px;margin:5px 0;-webkit-user-select:text!important;user-select:text!important;touch-action:manipulation}
.fin:focus{outline:none;border-color:var(--gr);box-shadow:0 0 12px rgba(53,255,138,.45)}
.atab{display:flex;gap:6px;margin:10px 0 6px}.atab .btn{flex:1;font-size:13px;padding:8px}.atab .btn.on{border-color:var(--gr);box-shadow:0 0 14px rgba(53,255,138,.55)}
.sep{display:flex;align-items:center;gap:10px;color:#8ea3e6;font-size:12px;margin:10px 0 4px}.sep::before,.sep::after{content:"";flex:1;height:1px;background:rgba(142,163,230,.35)}
.amsg2{min-height:1.3em;font-size:13px;color:#ffd23c;margin-top:6px}.amsg2.err{color:#ff6a7a}.lnk{background:none;border:0;color:#7fe9ff;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;margin-top:4px}
#gBtn{display:flex;justify-content:center;min-height:44px;margin-top:6px}
#accChip{position:fixed;top:calc(18px + env(safe-area-inset-top));touch-action:manipulation;-webkit-user-select:none;right:calc(62px + env(safe-area-inset-right));z-index:10;font-size:12px;padding:7px 12px;border-radius:999px;display:none}
#title.on ~ #accChip{display:block}`; document.head.appendChild(st);
  const ch = document.createElement('button'); ch.id = 'accChip'; ch.className = 'btn'; $('title').after(ch); let lastOpen = 0; const open = e => { if (e) { e.preventDefault(); e.stopPropagation(); } const n = Date.now(); if (n - lastOpen < 600) return; lastOpen = n; audio(); SFX.chip(); ACC ? showAccount() : showLogin(); };
  // en iPhone el "click" a veces no llega (Safari se lo come cerca del borde de arriba): se abre también al levantar el dedo
  ch.addEventListener('touchend', open, { passive: false }); ch.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') open(e); }); ch.addEventListener('click', open); })();
function accChip() { const c = $('accChip'); if (!c) return; c.textContent = ACC ? '👤 ' + ACC.nombre : GUEST ? '👤 SIN CUENTA · ENTRAR' : '👤 ENTRAR'; }
function accCard(html) { const c = $('card'); c.classList.remove('tips'); c.classList.add('acc'); c.innerHTML = html; show('panel', true); }
function accClose() { show('panel', false); $('card').classList.remove('acc'); }
const accMsg = (t, err) => { const m = $('amsg2'); if (m) { m.textContent = t; m.className = 'amsg2' + (err ? ' err' : ''); } };
function showAccess() {
  audio();
  accCard('<h2>¿CÓMO QUIERES JUGAR?</h2>' +
    '<button class="opt rec" id="oAcc"><span class="oi">☁️</span><span><b>CON MI CUENTA <i class="bdg">RECOMENDADO</i></b>Tu progreso se guarda en la nube: sigues donde lo dejaste en el móvil, la tablet, el PC o la tele. Con Google en un toque.</span></button>' +
    '<button class="opt" id="oGst"><span class="oi">🎮</span><span><b>SIN CUENTA</b>Juega ya, sin registrarte. El progreso solo se queda en este dispositivo.</span></button>' +
    '<div class="row"><button class="btn" id="oX">VOLVER</button></div>');
  $('oAcc').onclick = () => { SFX.chip(); showLogin(); };
  $('oGst').onclick = () => { SFX.chip(); showGuestWarn(); };
  $('oX').onclick = accClose;
}
function showGuestWarn() {
  accCard('<h2>⚠️ SIN CUENTA</h2><div style="color:#cfe0ff;line-height:1.5;font-size:15px;margin:6px 0 10px">Tus fases, estrellas y récords se guardarán <b>solo en este dispositivo</b>.<br>No podrás seguir tu partida en otro móvil, PC o tele, y si se borran los datos del navegador <b>lo perderás todo</b>.<br><br>Entrar con tu cuenta es <b>gratis</b> y con Google tardas <b>10 segundos</b>.</div>' +
    '<div class="row"><button class="btn" id="gwAcc" style="border-color:var(--gr);box-shadow:0 0 16px rgba(53,255,138,.6)">ENTRAR CON CUENTA</button><button class="btn" id="gwGo">SEGUIR SIN CUENTA</button></div>');
  $('gwAcc').onclick = () => { SFX.chip(); showLogin(); };
  $('gwGo').onclick = () => { GUEST = true; try { localStorage.setItem('tl_guest', '1'); } catch (e) {} accChip(); accClose(); openMap(); };
}
let loginTab = 'entrar';
function showLogin(tab) {
  if (tab) loginTab = tab;
  const f = loginTab === 'entrar' ? '<input class="fin" id="lE" type="email" autocomplete="username" placeholder="Tu correo" inputmode="email"><input class="fin" id="lP" type="password" autocomplete="current-password" placeholder="Contraseña"><button class="btn big" id="lGo" style="width:100%;margin-top:8px">ENTRAR</button><button class="lnk" id="lOlv">¿Olvidaste tu contraseña?</button>'
    : loginTab === 'crear' ? '<input class="fin" id="lN" autocomplete="nickname" placeholder="Nombre de jugador" maxlength="24"><input class="fin" id="lE" type="email" autocomplete="username" placeholder="Tu correo" inputmode="email"><input class="fin" id="lP" type="password" autocomplete="new-password" placeholder="Contraseña (mínimo 6)"><button class="btn big" id="lGo" style="width:100%;margin-top:8px">CREAR CUENTA</button>'
    : '<div style="color:#cfe0ff;font-size:14px">Te enviamos un código a tu correo para poner una contraseña nueva.</div><input class="fin" id="lE" type="email" autocomplete="username" placeholder="Tu correo" inputmode="email"><button class="btn" id="lCod" style="width:100%;margin:4px 0">ENVIARME EL CÓDIGO</button><input class="fin" id="lC" inputmode="numeric" placeholder="Código de 6 cifras" maxlength="6"><input class="fin" id="lP" type="password" autocomplete="new-password" placeholder="Contraseña nueva"><button class="btn big" id="lGo" style="width:100%;margin-top:8px">CAMBIAR Y ENTRAR</button>';
  accCard('<h2>☁️ TU CUENTA</h2><div style="color:#cfe0ff;font-size:13px">Guarda tu progreso y juega en cualquier dispositivo</div><div id="gBtn"></div><div class="sep">o con tu correo</div>' +
    '<div class="atab"><button class="btn' + (loginTab === 'entrar' ? ' on' : '') + '" id="tE">ENTRAR</button><button class="btn' + (loginTab === 'crear' ? ' on' : '') + '" id="tC">CREAR CUENTA</button></div>' + f +
    '<div class="amsg2" id="amsg2"></div><div class="row"><button class="btn" id="lX">VOLVER</button></div>');
  $('tE').onclick = () => showLogin('entrar'); $('tC').onclick = () => showLogin('crear'); $('lX').onclick = () => { accClose(); if (!ACC && !GUEST) showAccess(); };
  if ($('lOlv')) $('lOlv').onclick = () => showLogin('recuperar');
  if ($('lCod')) $('lCod').onclick = async () => { accMsg('Enviando…'); const r = await api({ a: 'recuperar', email: $('lE').value }); r.ok ? accMsg('📧 Código enviado. Mira tu correo (y el spam).') : accMsg(r.error, 1); };
  const go = async () => { const b = $('lGo'); b.disabled = true; accMsg('Conectando…');
    const d = loginTab === 'entrar' ? { a: 'entrar', email: $('lE').value, pass: $('lP').value } : loginTab === 'crear' ? { a: 'registro', nombre: $('lN').value, email: $('lE').value, pass: $('lP').value } : { a: 'restablecer', email: $('lE').value, codigo: $('lC').value, pass: $('lP').value };
    const r = await api(d); if (r.ok) accDone(r); else { accMsg(r.error || 'No se pudo entrar', 1); b.disabled = false; } };
  $('lGo').onclick = go; const lp = $('lP'); if (lp) lp.onkeydown = e => { if (e.key === 'Enter') go(); };
  gsiLoad(() => { try { google.accounts.id.initialize({ client_id: GOOGLE_ID, ux_mode: 'popup', callback: async r => { accMsg('Comprobando tu cuenta de Google…'); const x = await api({ a: 'google', credential: r.credential }); x.ok ? accDone(x) : accMsg(x.error || 'No se pudo entrar con Google', 1); } });
    const g = $('gBtn'); if (g) google.accounts.id.renderButton(g, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(340, g.offsetWidth || 300) }); } catch (e) {} });
}
let gsiOk = false;
function gsiLoad(cb) { if (window.google && google.accounts) return cb(); if (gsiOk) return setTimeout(() => gsiLoad(cb), 300); gsiOk = true; const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = cb; document.head.appendChild(sc); }
let PRV = 0; try { PRV = +(localStorage.getItem('tl_rv') || 0); } catch (e) {}          // versión de reinicio del progreso (LOCK): manda sobre las copias viejas de otros dispositivos
function lvlName(n) { const w = WORLDS.find(w => w.nodes.includes(n)); return n.boss ? 'JEFE ' + w.n : n.bonus ? 'SECRETA ' + w.n : n.id; }
function unlockTo(id) {     // código de nivel: ajusta la partida a esa fase. Hacia atrás todo abierto (con sus estrellas o a 0), esa fase lista para jugar y desde ahí en adelante, candados
  const all = ALLN().filter(n => typeof LEVELS[n.id] === 'function'), k = all.findIndex(n => n.id === id); if (k < 0) return false;
  const keep = new Set(all.slice(0, k).map(n => n.id)), np = {}; for (const i in PROG) if (keep.has(i)) np[i] = PROG[i]; PROG = np;
  for (const i in GOT) if (!keep.has(i)) delete GOT[i];
  DEV = {}; for (let i = 0; i <= k; i++) DEV[all[i].id] = 1; CHEAT.unlock = false; saveCheats();
  PRV = Date.now(); try { localStorage.setItem('tl_rv', String(PRV)); localStorage.setItem('tl_dev', JSON.stringify(DEV)); localStorage.setItem('tl_prog', JSON.stringify(PROG)); localStorage.setItem('tl_got', JSON.stringify(GOT)); } catch (e) {} cloudSave(true);   // el reinicio manda también en los otros dispositivos de la cuenta
  const wi = WORLDS.findIndex(w => w.nodes.some(n => n.id === id)); setWorld(wi); mapSel = Math.max(0, MAP.findIndex(n => n.id === id)); openMap();
  mapUnl = { i: mapSel, t: 0, snd: false }; SFX.life(); mapMsg = { txt: '🔓 PARTIDA AJUSTADA A ' + lvlName(all[k]), t: 3.5, ok: true }; return true;
}
function mergeProg(cloud) {      // junta lo de este dispositivo con lo de la nube: siempre se queda lo mejor (salvo que en la nube se haya reiniciado)
  const cp = (cloud && cloud.prog) || {}, cg = (cloud && cloud.got) || {};
  if (cloud && (+cloud.rv || 0) > PRV) { PRV = +cloud.rv; PROG = {}; GOT = {}; DEV = {}; try { localStorage.setItem('tl_rv', String(PRV)); localStorage.setItem('tl_dev', '{}'); } catch (e) {} if (typeof cloud.w === 'number' && WORLDS[cloud.w]) setWorld(cloud.w); else setWorld(0); }
  for (const id in cp) { const a = PROG[id], b = cp[id]; PROG[id] = !a ? b : { stars: Math.max(a.stars || 0, b.stars || 0), best: Math.max(a.best || 0, b.best || 0) }; }
  const cdv = (cloud && cloud.dev) || {}; for (const id in cdv) if (cdv[id] === 1) DEV[id] = 1; try { localStorage.setItem('tl_dev', JSON.stringify(DEV)); } catch (e) {}
  for (const id in cg) { const o = gotOf(id), c = cg[id]; ['c', 'b', 'g'].forEach(k => (c[k] || []).forEach(v => { if (!o[k].includes(v)) o[k].push(v); })); if (c.r) o.r = 1; }
  try { localStorage.setItem('tl_prog', JSON.stringify(PROG)); localStorage.setItem('tl_got', JSON.stringify(GOT)); } catch (e) {}
}
function accDone(r) {
  ACC = { ses: r.ses, email: r.email, nombre: r.nombre }; GUEST = false; try { localStorage.setItem('tl_acc', JSON.stringify(ACC)); localStorage.removeItem('tl_guest'); } catch (e) {}
  mergeProg(r.progreso); setLic(r.lic); cloudSave(true); accChip(); SFX.win(); accClose(); openMap(); mapMsg = { txt: '¡HOLA, ' + String(ACC.nombre).toUpperCase() + '! PROGRESO GUARDADO EN LA NUBE', t: 3.2, ok: true };
}
function showAccount() {
  accCard('<h2>👤 ' + esc(ACC.nombre) + '</h2><div style="color:#cfe0ff;font-size:14px;margin:4px 0 10px">' + esc(ACC.email) + '<br>Tu progreso se guarda solo en la nube ☁️</div><div class="amsg2" id="amsg2"></div><div class="row"><button class="btn" id="aSync">SINCRONIZAR AHORA</button><button class="btn" id="aOut2" style="border-color:#ff4a6a">CERRAR SESIÓN</button><button class="btn" id="aSw2">CAMBIAR DE USUARIO</button><button class="btn" id="aX2">VOLVER</button></div>');
  $('aSync').onclick = async () => { accMsg('Sincronizando…'); const r = await api({ a: 'cargar', ses: ACC.ses }); if (r.ok) { mergeProg(r.progreso); setLic(r.lic); cloudSave(true); accMsg('✔ Todo al día'); } else accMsg(r.error === 'SESION' ? 'La sesión ha caducado: vuelve a entrar' : r.error, 1); };
  $('aOut2').onclick = () => { api({ a: 'salir', ses: ACC.ses }); ACC = null; setLic(null); try { localStorage.removeItem('tl_acc'); } catch (e) {} accChip(); accClose(); };
  $('aSw2').onclick = () => { api({ a: 'salir', ses: ACC.ses }); ACC = null; setLic(null); try { localStorage.removeItem('tl_acc'); } catch (e) {} accChip(); showLogin(); };
  $('aX2').onclick = accClose;
}
let cloudT = 0;
function cloudSave(now) {
  if (!ACC) return; clearTimeout(cloudT);
  cloudT = setTimeout(async () => { const r = await api({ a: 'guardar', ses: ACC.ses, progreso: { prog: PROG, got: GOT, w: curW, rv: PRV, dev: DEV } }); if (r.ok && r.stale && r.progreso) { mergeProg(r.progreso); if (state === 'map') { mapSel = mapAt = 0; mapL = { x: MAP[0].x, y: MAP[0].y }; mapCam = null; mapInfo(); } } if (!r.ok && r.error === 'SESION') { ACC = null; try { localStorage.removeItem('tl_acc'); } catch (e) {} accChip(); } }, now ? 50 : 3000);
}
/* ======================= VENTANAS DEL JUEGO (sustituyen a los avisos nativos del navegador) ======================= */
(() => { const st = document.createElement('style'); st.textContent = `
#uidlg{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at center,rgba(10,20,60,.72),rgba(2,4,14,.9));backdrop-filter:blur(4px)}
#uidlg.on{display:flex;animation:uiFade .18s ease-out}
.uiw .ucard{touch-action:pan-y;position:relative;max-width:min(560px,94vw);width:100%;max-height:92vh;overflow:auto;background:linear-gradient(160deg,rgba(18,28,70,.97),rgba(8,12,34,.98));border:2px solid var(--cy);border-radius:22px;padding:22px 24px 18px;text-align:center;box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 0 40px rgba(41,230,255,.35),0 20px 60px rgba(0,0,0,.6);animation:uiPop .32s cubic-bezier(.2,1.4,.4,1)}
.uiw .ucard.gold{border-color:#ffd23c;box-shadow:0 0 44px rgba(255,210,60,.4),0 20px 60px rgba(0,0,0,.6)}
.uiw .ucard.red{border-color:#ff4a6a;box-shadow:0 0 44px rgba(255,74,106,.35),0 20px 60px rgba(0,0,0,.6)}
.uiw [contenteditable]{user-select:text;-webkit-user-select:text;outline:1px dashed rgba(255,210,60,.5);border-radius:6px;cursor:text}
.uiw .ucard.pv{animation:none;margin:0 auto 14px}
.uiw .uic{font-size:46px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 0 14px rgba(41,230,255,.6))}
#uidlg h2{margin:0 0 10px;font-size:clamp(20px,4.6vh,30px);letter-spacing:.04em;text-shadow:0 0 16px var(--cy)}
.uiw .ucard.gold h2{text-shadow:0 0 18px rgba(255,210,60,.8);color:#fff4c8}
.uiw .utx{color:#d6e2ff;font-size:15px;line-height:1.55;margin:0 auto 14px;max-width:470px}
.uiw .utx b{color:#fff}
.uiw .uprice{display:inline-block;margin:2px 0 14px;padding:8px 22px;border-radius:999px;background:linear-gradient(90deg,#ffd23c,#ff9a3c);color:#2a1400;font-weight:900;font-size:24px;letter-spacing:.04em;box-shadow:0 0 24px rgba(255,190,60,.6)}
.uiw .uperks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 16px;text-align:left}
.uiw .uperks div{background:rgba(41,230,255,.07);border:1px solid rgba(41,230,255,.25);border-radius:12px;padding:8px 10px;font-size:13px;color:#cfe0ff}
.uiw .urow{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.uiw .urow .btn{font-size:15px;padding:11px 20px}
.uiw .btn.ok{border-color:var(--gr);box-shadow:0 0 18px rgba(53,255,138,.55),inset 0 0 12px rgba(53,255,138,.2)}
.uiw .btn.pay{border-color:#ffd23c;background:linear-gradient(180deg,rgba(80,56,8,.9),rgba(40,26,4,.9));box-shadow:0 0 22px rgba(255,210,60,.6),inset 0 0 12px rgba(255,210,60,.25);font-size:18px!important;padding:13px 28px!important}
#uidlg input{width:100%;font:inherit;font-size:17px;color:#fff;background:rgba(5,10,30,.9);border:2px solid rgba(41,230,255,.5);border-radius:12px;padding:10px 14px;margin:0 0 14px;outline:none;user-select:text;-webkit-user-select:text}
.uiw .usmall{color:#8ea3e6;font-size:12px;margin-top:10px}
#uidlg.tp{background:rgba(2,4,14,.18);backdrop-filter:none;align-items:flex-start;padding-top:calc(10px + env(safe-area-inset-top))}
#uidlg.tp .ucard{max-width:min(520px,92vw);padding:14px 18px 12px}
.uiw .tpr{display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0;flex-wrap:wrap}
.uiw .tpr b{min-width:150px;text-align:right;color:#cfe0ff;font-size:14px}
.uiw .tpr .btn{font-size:13px;padding:8px 12px}
.uiw .tpr .btn.on{border-color:var(--gr);background:rgba(20,80,50,.85);box-shadow:0 0 14px rgba(53,255,138,.6)}
@keyframes uiFade{from{opacity:0}to{opacity:1}}
@keyframes uiPop{from{transform:scale(.82) translateY(20px);opacity:0}to{transform:none;opacity:1}}`; document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'uidlg'; d.className = 'uiw'; document.body.appendChild(d); })();
// muestra una ventana con botones; devuelve una promesa con el botón pulsado (o el texto escrito si hay campo)
function uiDialog(o) {
  return new Promise(res => { const d = $('uidlg'); try { SFX.chip(); } catch (e) {}
    d.innerHTML = '<div class="ucard ' + (o.tone || '') + '">' + (o.icon ? '<div class="uic">' + o.icon + '</div>' : '') + (o.title ? '<h2>' + o.title + '</h2>' : '') + (o.html ? '<div class="utx">' + o.html + '</div>' : '') +
      (o.input !== undefined ? '<input id="uiIn" maxlength="' + (o.max || 40) + '" value="' + esc(o.input) + '">' : '') +
      '<div class="urow">' + o.buttons.map((b, i) => '<button class="btn ' + (b.cls || '') + '" data-ui="' + i + '">' + b.t + '</button>').join('') + '</div>' + (o.foot ? '<div class="usmall">' + o.foot + '</div>' : '') + '</div>';
    d.className = 'uiw on' + (o.wrap ? ' ' + o.wrap : ''); const inp = $('uiIn'); if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const done = v => { d.className = 'uiw'; d.innerHTML = ''; res(v); };
    d.querySelectorAll('[data-ui]').forEach(b => b.onclick = () => { const bt = o.buttons[+b.dataset.ui]; if (bt.fn) { bt.fn(); return; } done(inp ? (bt.v ? inp.value : null) : bt.v); });
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); };
  });
}
const uiAlert = (title, html, icon) => uiDialog({ title, html, icon, buttons: [{ t: 'ENTENDIDO', cls: 'ok', v: true }] });
const uiConfirm = (title, html, ok, no, icon) => uiDialog({ title, html, icon, buttons: [{ t: no || 'CANCELAR', v: false }, { t: ok || 'ACEPTAR', cls: 'ok', v: true }] });
const uiPrompt = (title, html, val) => uiDialog({ title, html, input: val || '', buttons: [{ t: 'CANCELAR', v: false }, { t: 'GUARDAR', cls: 'ok', v: true }] });

// fin del contenido publicado: cartel de "próximamente" y aviso por correo al creador
function showTheEnd() {
  const nw = WORLDS.length, nf = Object.keys(PROG).length; SFX.win();
  api(Object.assign({ a: 'finJuego', w: nw, n: nf }, who()));
  uiDialog({ icon: '🏆', tone: 'gold', title: '¡HAS COMPLETADO COSMOLUCAS!', html: '¡Increíble! Has superado los <b>' + nw + ' planetas</b> y has derrotado a todos los jefes. Eres de los primeros en llegar hasta aquí. 🚀<br><br>Lucas ya está calentando los propulsores para viajar a <b>nuevos planetas</b>: muy pronto llegarán más niveles, nuevos jefes y más secretos por descubrir.<br><br>¡Vuelve pronto, la aventura continúa!', buttons: [{ t: '¡ALLÍ ESTARÉ!', cls: 'ok', v: 1 }], foot: 'PRÓXIMAMENTE · PLANETA ' + (nw + 1) });
}

/* ======================= LICENCIA: pago único de 1,49 € con myPOS ======================= */
// a partir de la fase 2 del planeta 3 hace falta la licencia; el pago lo valida a mano el administrador desde el panel (pestaña PAGOS)
const LIC_URL = 'https://mypos.com/@futurmovil/1.49', LIC_PRECIO = '1,49 €';
let LIC = null; try { LIC = JSON.parse(localStorage.getItem('tl_lic') || 'null'); } catch (e) {}
let licT = 0;
const LT0 = {
  main: { t: '¿TE ESTÁ GUSTANDO COSMOLUCAS?', h: '¡Lucas ha llegado al <b>Planeta Volcánico</b> y aún le quedan aventuras increíbles por delante!<br>Desbloquea el juego completo con un <b>pago único</b>, para siempre.' },
  guest: { t: '¿TE ESTÁ GUSTANDO COSMOLUCAS?', h: 'Has llegado muy lejos, ¡y lo mejor está por llegar! Para seguir la aventura de Lucas solo hace falta un <b>pago único de {PRECIO}</b>.<br><br>La licencia se guarda en tu cuenta, así que primero <b>entra o crea tu cuenta gratis</b>.' },
  conf: { t: '¿HAS COMPLETADO EL PAGO?', h: 'Se ha abierto la página de pago de myPOS. Cuando hayas pagado <b>{PRECIO}</b>, vuelve aquí y confirma tu compra para activar tu licencia.' },
  ok0: { t: '¡GRACIAS POR TU COMPRA!', h: 'Tu licencia de <b>COSMOLUCAS</b> ya está guardada en tu cuenta: podrás jugar en todos tus dispositivos.<br><br>¡A por el Planeta Volcánico, Lucas te espera! 🚀' },
  ok1: { t: '¡GRACIAS POR TU COMPRA!', h: 'Hemos recibido tu confirmación. Mientras verificamos el pago tienes el juego <b>desbloqueado durante 1 hora</b>.<br><br>¡A por el Planeta Volcánico, Lucas te espera! 🚀' },
  ok2: { t: '¡GRACIAS POR TU COMPRA!', h: 'Después de dos intentos de pago fallidos, tu licencia se activará <b>en las próximas horas</b>, en cuanto verifiquemos el pago.<br><br>Cuando esté lista podrás seguir jugando desde aquí mismo.' },
  rej1: { t: 'NO PUDIMOS VERIFICAR TU PAGO', h: 'Hubo un problema con tu pago y no se ha podido verificar, por eso se han vuelto a bloquear las fases desde el Planeta 3.<br><br>Vuelve a intentarlo: al confirmar tendrás el juego <b>desbloqueado 1 hora</b> mientras comprobamos el pago.<br><br>Pago único de <b>{PRECIO}</b>.' },
  rej2: { t: 'NO PUDIMOS VERIFICAR TU PAGO', h: 'Hemos intentado verificar tu pago dos veces y no ha llegado, por eso se han vuelto a bloquear las fases desde el Planeta 3.<br><br>Si vuelves a pagar, esta vez la licencia se activará <b>cuando confirmemos el pago</b> (en las próximas horas).<br><br>Pago único de <b>{PRECIO}</b>.' },
  pend1: { t: 'ESTAMOS VERIFICANDO TU PAGO', h: 'Tu hora de juego mientras comprobábamos el pago ha terminado. En cuanto verifiquemos tu pago se desbloqueará todo el juego automáticamente.' },
  pend2: { t: 'ESTAMOS VERIFICANDO TU PAGO', h: 'Después de dos intentos de pago que no pudimos verificar, tu licencia se activará <b>en cuanto confirmemos que el pago ha llegado</b>. Suele tardar unas horas.<br><br>¡Gracias por tu paciencia!' }
};
const LT_NOM = { main: 'Cartel de pago (fase 3-2)', guest: 'Sin cuenta', conf: 'Después de pulsar PAGAR', ok0: 'Gracias (1ª compra)', ok1: 'Gracias (tras 1 rechazo: 1 hora)', ok2: 'Gracias (tras 2 rechazos: espera)', rej1: 'Pago rechazado 1 vez', rej2: 'Pago rechazado 2 veces', pend1: 'Pendiente: hora terminada', pend2: 'Pendiente (3er intento)' };
const LT_IC = { main: '🚀', guest: '🚀', conf: '💳', ok0: '🎉', ok1: '🎉', ok2: '🙏', rej1: '⚠️', rej2: '⚠️', pend1: '⏳', pend2: '⏳' };
let LTX = {}; try { LTX = JSON.parse(localStorage.getItem('tl_ltx') || '{}') || {}; } catch (e) {}
const lt = (k, f) => String(((LTX[k] && LTX[k][f]) || LT0[k][f])).replace(/\{PRECIO\}/g, LIC_PRECIO);
setTimeout(() => api({ a: 'licTxt' }).then(r => { if (r.ok && r.txt) { LTX = r.txt; try { localStorage.setItem('tl_ltx', JSON.stringify(LTX)); } catch (e) {} } }), 3000);
const licGated = id => { const w = +String(id).split('-')[0]; return w >= 4 || (w === 3 && id !== '3-1'); };
function licOk() {
  if (CHEAT.full) return true;
  if (!ACC || !LIC) return false; if (LIC.estado === 'activa') return true;
  if (LIC.estado === 'pendiente') { if ((LIC.fallos || 0) === 0) return true; if (LIC.fallos === 1) return Date.now() - (LIC.pedido || 0) < 3600e3; }
  return false;
}
function setLic(l) { LIC = l || null; try { if (LIC) localStorage.setItem('tl_lic', JSON.stringify(LIC)); else localStorage.removeItem('tl_lic'); } catch (e) {} licWipe(); }
function licWipe() {          // si un pago se rechazó, se pierde lo conseguido desde la fase de pago (en todos los dispositivos)
  if (!ACC || !LIC) return; const f = LIC.fallos || 0; let done = 0; try { done = +(localStorage.getItem('tl_lw_' + ACC.email) || 0); } catch (e) {}
  if (f <= done) return; try { localStorage.setItem('tl_lw_' + ACC.email, String(f)); } catch (e) {}
  if (LIC.estado === 'activa') return;
  for (const id in PROG) if (licGated(id)) delete PROG[id]; for (const id in GOT) if (licGated(id)) delete GOT[id];
  try { localStorage.setItem('tl_prog', JSON.stringify(PROG)); localStorage.setItem('tl_got', JSON.stringify(GOT)); } catch (e) {}
  if (curW > 2) setWorld(2); if (state === 'map') { const i = MAP.findIndex(n => !PROG[n.id]); mapSel = mapAt = Math.max(0, Math.min(i < 0 ? 0 : i, MAP.length - 1)); mapL = { x: MAP[mapSel].x, y: MAP[mapSel].y }; mapCam = null; mapInfo(); }
  cloudSave(true);
}
async function licRefresh(force) { if (!ACC || (!force && Date.now() - licT < 60000)) return; licT = Date.now(); const r = await api({ a: 'licEstado', ses: ACC.ses }); if (r.ok) setLic(r.lic); }
const LIC_PERKS = '<div class="uperks"><div>🔓 <b>Todos los planetas</b> y fases secretas</div><div>☁️ Se guarda en <b>tu cuenta</b></div><div>📱 Móvil, tablet, PC y tele</div><div>🚫 Sin suscripciones ni anuncios</div></div>';
function licMainHtml(h) { return h + '</div><div class="uprice">' + LIC_PRECIO + '</div>' + LIC_PERKS + '<div>'; }
function licOpenPay() { try { const a = document.createElement('a'); a.href = LIC_URL; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { location.href = LIC_URL; } }
async function showPaywall(retry) {
  await licRefresh(true);
  if (licOk()) { if (retry) retry(); return; }
  if (!ACC) { const v = await uiDialog({ icon: LT_IC.guest, tone: 'gold', title: lt('guest', 't'), html: lt('guest', 'h'), buttons: [{ t: 'AHORA NO', v: 0 }, { t: 'ENTRAR / CREAR CUENTA', cls: 'ok', v: 1 }] }); if (v) showLogin(); return; }
  const f = LIC ? LIC.fallos || 0 : 0, est = LIC ? LIC.estado : '';
  if (est === 'pendiente') {        // pagado pero aún sin verificar (y ya sin la hora de cortesía)
    const k = f >= 2 ? 'pend2' : 'pend1', v = await uiDialog({ icon: LT_IC[k], title: lt(k, 't'), html: lt(k, 'h'), buttons: [{ t: 'VOLVER', v: 0 }, { t: 'COMPROBAR AHORA', cls: 'ok', v: 1 }] });
    if (v) { await licRefresh(true); if (licOk()) { await uiAlert('¡LICENCIA ACTIVADA!', 'Tu pago está verificado. ¡A disfrutar del juego completo!', '🎉'); if (retry) retry(); } else uiAlert('AÚN NO', 'Todavía no hemos podido verificar tu pago. Vuelve a comprobarlo en un rato.', '⏳'); }
    return;
  }
  const k = est === 'rechazada' ? (f >= 2 ? 'rej2' : 'rej1') : 'main';
  const v = await uiDialog({ icon: LT_IC[k], tone: k === 'main' ? 'gold' : 'red', title: lt(k, 't'), html: k === 'main' ? licMainHtml(lt(k, 'h')) : lt(k, 'h'), buttons: [{ t: 'AHORA NO', v: 0 }, { t: '💳 PAGAR ' + LIC_PRECIO, cls: 'pay', v: 1 }], foot: 'Pago seguro con myPOS · ' + esc(ACC.email) });
  if (!v) return;
  licOpenPay();
  const ok = await uiDialog({ icon: LT_IC.conf, title: lt('conf', 't'), html: lt('conf', 'h'), buttons: [{ t: 'CANCELAR', v: 0 }, { t: 'ABRIR EL PAGO OTRA VEZ', fn: licOpenPay }, { t: '✔ CONFIRMAR COMPRA', cls: 'ok', v: 1 }] });
  if (!ok) return;
  const r = await api({ a: 'licPagar', ses: ACC.ses }); if (!r.ok) { uiAlert('UPS…', 'No hemos podido registrar tu compra: ' + esc(r.error || 'sin conexión') + '. Inténtalo de nuevo.', '📡'); return; }
  setLic(r.lic); SFX.win();
  const kk = licOk() ? (LIC.fallos === 1 ? 'ok1' : 'ok0') : 'ok2';
  await uiDialog({ icon: LT_IC[kk], tone: kk === 'ok2' ? '' : 'gold', title: lt(kk, 't'), html: lt(kk, 'h'), buttons: [{ t: kk === 'ok2' ? 'ENTENDIDO' : 'SEGUIR JUGANDO', cls: 'ok', v: 1 }] });
  if (kk !== 'ok2' && retry) retry();
}
// panel de admin: los carteles tal cual salen en el juego, con el título y el texto editables
function admLicTexts(box) {
  box.innerHTML = '<h3 style="margin:18px 0 6px">TEXTOS DE LOS CARTELES DE PAGO</h3><div style="color:#8ea3e6;margin-bottom:10px">Toca el título o el texto de cualquier cartel para cambiarlo y pulsa GUARDAR TEXTOS. Escribe {PRECIO} donde quieras que salga el precio.</div><div class="uiw" id="ltBox"></div>' +
    '<div class="row"><button class="btn" id="ltSave" style="border-color:#35ff8a">GUARDAR TEXTOS</button><button class="btn red" id="ltReset">VOLVER A LOS ORIGINALES</button></div><div class="amsg" id="ltMsg"></div>';
  const raw = (k, f) => String((LTX[k] && LTX[k][f]) || LT0[k][f]);
  $('ltBox').innerHTML = Object.keys(LT0).map(k => '<div style="color:#ffd23c;font-weight:800;margin:10px 0 4px">' + LT_NOM[k] + '</div><div class="ucard pv ' + (k === 'main' || k.startsWith('ok') && k !== 'ok2' || k === 'guest' ? 'gold' : k.startsWith('rej') ? 'red' : '') + '"><div class="uic">' + LT_IC[k] + '</div><h2 contenteditable="true" data-lk="' + k + '" data-lf="t">' + raw(k, 't') + '</h2><div class="utx" contenteditable="true" data-lk="' + k + '" data-lf="h">' + raw(k, 'h') + '</div>' +
    (k === 'main' ? '<div class="uprice">' + LIC_PRECIO + '</div>' + LIC_PERKS : '') + '<div class="urow">' + (k === 'main' || k.startsWith('rej') ? '<button class="btn">AHORA NO</button><button class="btn pay">💳 PAGAR ' + LIC_PRECIO + '</button>' : k === 'conf' ? '<button class="btn">CANCELAR</button><button class="btn">ABRIR EL PAGO OTRA VEZ</button><button class="btn ok">✔ CONFIRMAR COMPRA</button>' : '<button class="btn ok">' + (k.startsWith('pend') ? 'COMPROBAR AHORA' : k === 'guest' ? 'ENTRAR / CREAR CUENTA' : 'SEGUIR JUGANDO') + '</button>') + '</div></div>').join('');
  const msg = t => { $('ltMsg').textContent = t; };
  $('ltSave').onclick = async () => { const o = {}; $('ltBox').querySelectorAll('[data-lk]').forEach(el => { const k = el.dataset.lk, f = el.dataset.lf, h = el.innerHTML.trim(); if (h && h !== LT0[k][f]) (o[k] = o[k] || {})[f] = h; });
    try { await admOp('licTxtSet', { txt: JSON.stringify(o) }); LTX = o; try { localStorage.setItem('tl_ltx', JSON.stringify(o)); } catch (e) {} msg('✔ Textos guardados: los jugadores verán los nuevos carteles'); } catch (e) { msg(e.message); } };
  $('ltReset').onclick = async () => { if ($('ltReset').dataset.ok !== '1') { $('ltReset').dataset.ok = '1'; $('ltReset').textContent = '¿SEGURO?'; return; } try { await admOp('licTxtSet', { txt: '{}' }); LTX = {}; try { localStorage.setItem('tl_ltx', '{}'); } catch (e) {} admLicTexts(box); } catch (e) { msg(e.message); } };
}

accChip();
if (ACC) setTimeout(async () => { const r = await api({ a: 'cargar', ses: ACC.ses }); if (r.ok) { mergeProg(r.progreso); setLic(r.lic); cloudSave(); } else if (r.error === 'SESION') { ACC = null; try { localStorage.removeItem('tl_acc'); } catch (e) {} accChip(); } }, 2500);

/* ---------- actualización automática ---------- */
// Mira cada minuto si hay versión nueva. Nunca recarga en mitad de una partida: espera a que el jugador vuelva al menú.
let updPending = null;
function updCheck() {
  if (document.hidden) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.v && j.v !== VERSION) { updPending = j.v; updApply(); } }).catch(() => {});
}
function updApply() {
  if (!updPending || (state !== 'title' && state !== 'map') || (state === 'map' && (mapUnl || mapRoute.length))) return;
  try { const k = 'tl_upd_' + updPending, last = +sessionStorage.getItem(k) || 0; if (Date.now() - last < 300000) return; sessionStorage.setItem(k, Date.now()); } catch (e) {}
  try { if (state === 'map') sessionStorage.setItem('tl_back', JSON.stringify({ sel: mapSel, unl: mapUnl ? mapUnl.i : -1, w: curW })); } catch (e) {}
  location.replace(location.pathname + '?u=' + encodeURIComponent(updPending));
}
setInterval(updCheck, 60000); setTimeout(updCheck, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updCheck(); });

/* ---------- arranque ---------- */
setSnd(sndOn); resize();
L = buildLevel(); preTheme(L.theme); P = newPlayer(L.spawn.x, L.spawn.y); spawnEnemies(); cam.y = L.H * T - VHv;
requestAnimationFrame(frame);
loadImages(() => {
  state = 'title'; setWorld(curW); setTimeout(() => WORLDS.forEach((w, i) => mapImg(i)), 1500);
  let back = null; try { back = JSON.parse(sessionStorage.getItem('tl_back') || 'null'); sessionStorage.removeItem('tl_back'); } catch (e) {}
  if (back && back.w !== undefined) setWorld(back.w);
  if (back && MAP[back.sel]) { mapSel = back.unl >= 0 ? back.unl : back.sel; openMap(); }      // tras actualizarse vuelve al mapa, no a la portada
});
window.__TL = { noEnemies() { enemies = []; }, get E() { return enemies; }, get P() { return P; }, get G() { return G; }, get state() { return state; }, get L() { return L; }, K, press, get MAP() { return MAP; }, die, get DEV() { return DEV; }, warp(w) { startWarp(w); }, setWorld(w) { setWorld(w); }, get curW() { return curW; }, get mapSel() { return mapSel; }, set mapSel(v) { mapSel = v; mapAt = v; mapL = { x: MAP[v].x, y: MAP[v].y }; }, openMap() { openMap(); }, set cur(v) { curId = v; }, start() { startGame(); }, get time() { return time; }, get PROG() { return PROG; }, mapSelect(i) { mapSelect(i); }, mapPlay() { mapPlay(); }, mapOpen(i) { return mapOpen(i); }, setLic(l) { setLic(l); }, licOk() { return licOk(); }, admTexts(el) { admLicTexts(el); }, theEnd() { showTheEnd(); }, tcustom(fx) { const d = tlNew('t'); d.fx = fx; d.o.push({ k: 'portal', x: 10, y: 12 }, { k: 'portal', x: 40, y: 12 }, { k: 'plank', x: 20, y: 10 }); ED = d; return Object.keys(buildCustom(d)).filter(k => ['water', 'chase', 'meteors', 'dark', 'portals'].includes(k)).map(k => k + ':' + JSON.stringify(buildCustom(d)[k]).slice(0, 60)); }, editT(fx) { ED.fx = fx; openEditor(); }, ids() { return Object.keys(LEVELS).filter(k => k !== 'TALLER'); }, dumpLevel(id) { const c0 = curId; curId = id; const l = buildLevel(); curId = c0; const pick = (a, ks) => (a || []).map(o => { const r = {}; ks.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; });
    return { id, W: l.W, H: l.H, g: l.g.map(r => Array.isArray(r) ? r.join('') : r), gk: l.gk || 1, vert: !!l.vert, water: l.water || null, spawn: l.spawn, goal: l.goal, sw: !!l.sw,
      pads: pick(l.pads, ['x', 'y', 'w', 'mush', 'crystal']), movers: pick(l.movers, ['bx', 'by', 'w', 'ax', 'ay', 'fall', 'raft', 'plank']), lifts: pick(l.lifts, ['x0', 'x1', 'y0', 'y1']), vines: pick(l.vines, ['x', 'y0', 'y1']), spores: pick(l.spores, ['x', 'y', 'h']),
      pipes: pick(l.pipes, ['x', 'y', 'tox', 'toy', 'hid']), portals: pick(l.portals, ['x', 'y', 'tox', 'toy']), keys: pick(l.keys, ['x', 'y']), winds: pick(l.winds, ['x0', 'x1', 'y0', 'y1', 'f']), cps: pick(l.cps, ['x', 'y']), strips: pick(l.strips, ['x0', 'x1', 'y']), rise: !!l.rise, chase: !!l.chase, auto: !!l.auto, sky: !!l.sky }; },
  playC(n, t, datos) { ED = tlUnpack(null, n, t, datos); tlPlay(false); }, unl(i) { mapUnl = { i, t: 0, snd: false }; } };
/* ---------- botón ✕ para salir del juego (portada y mapas) ---------- */
(() => {
  const st = document.createElement('style'); st.textContent = `
#btnExit{position:fixed;top:calc(12px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));z-index:11;width:42px;height:42px;padding:0;border-radius:50%;font:900 20px system-ui;line-height:1;display:none;align-items:center;justify-content:center;border-color:#ff4a6a;box-shadow:0 0 14px rgba(255,74,106,.55);color:#fff;touch-action:manipulation}
#btnExit.on{display:flex}
#byeOv{position:fixed;inset:0;z-index:90;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(ellipse at 50% 40%,#0b1a4a,#010309 75%);color:#cfe0ff;text-align:center;font-family:system-ui,sans-serif;padding:20px}
#byeOv.on{display:flex}
#byeOv img{width:min(70vw,460px);filter:drop-shadow(0 0 16px rgba(53,255,138,.45))}
#byeOv h2{margin:0;color:#35ff8a;letter-spacing:.12em;text-shadow:0 0 12px #35ff8a}`;
  document.head.appendChild(st);
  const b = document.createElement('button'); b.id = 'btnExit'; b.className = 'btn'; b.textContent = '✕'; b.title = 'Salir del juego'; document.body.appendChild(b);
  const bye = document.createElement('div'); bye.id = 'byeOv';
  const logo = document.querySelector('#title .logo'); bye.innerHTML = (logo ? '<img src="' + logo.getAttribute('src') + '" alt="">' : '') + '<h2>¡HASTA PRONTO!</h2><div>Tu progreso está guardado. Ya puedes cerrar la app o esta pestaña.</div><button class="btn" id="byeBack">VOLVER A JUGAR</button>';
  document.body.appendChild(bye);
  const vis = () => { const on = !CON.on && !$('adm').classList.contains('on') && !bye.classList.contains('on') && !$('uidlg').classList.contains('on') && ((state === 'title' && $('title').classList.contains('on') && !$('panel').classList.contains('on')) || (state === 'map' && !warp && !$('panel').classList.contains('on'))); b.classList.toggle('on', on); };
  setInterval(vis, 200);
  let busy = false;
  tapBind(b, async () => { if (busy) return; busy = true;
    const ok = await uiConfirm('¿SALIR DEL JUEGO?', 'Se cerrará COSMOLUCAS. Tu progreso queda guardado.', 'SALIR', 'CANCELAR', '🚪'); busy = false; if (!ok) return;
    try { cloudSave(true); } catch (e) {} try { if (AC) AC.suspend(); } catch (e) {}
    try { window.close(); } catch (e) {}
    setTimeout(() => { bye.classList.add('on'); b.classList.remove('on'); }, 350);      // si el navegador no deja cerrar (pestaña normal, iPhone), se queda la pantalla de despedida
  });
  $('byeBack').onclick = () => { bye.classList.remove('on'); try { audio(); } catch (e) {} };
})();
})();
