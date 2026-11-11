/* TURBOLUCAS - un juego de FuturMovil. Motor de plataformas + nivel 1-1 (Estación orbital). */
(() => {
'use strict';
const VERSION = '0.23';
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
    im.src = 'img/' + TIER + '/' + n + '.webp?v=' + VERSION;
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
  const stepDur = 0.17 * (L && L.boss && L.boss.fight && !L.boss.gone ? 0.82 : 1) * (P && P.tStar > 0 ? 0.72 : 1) * (G.tleft <= 10 ? 0.6 : G.tleft <= 30 ? 0.74 : 1);
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
  if (CON.on) { if (e.code === 'Escape') closeConsole(); return; }
  if ($('adm').classList.contains('on')) return;
  const k = KEYMAP[e.code];
  if (k) { press(k, true); e.preventDefault(); }
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'play') togglePause();
  if (state === 'map') { if (e.code === 'ArrowRight' || e.code === 'KeyD') mapMove(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') mapMove(-1); else if (e.code === 'ArrowUp' || e.code === 'KeyW') mapMove(2); else if (e.code === 'ArrowDown' || e.code === 'KeyS') mapMove(-2); else if (e.code === 'Enter' || e.code === 'Space') mapPlay(); else if (e.code === 'Escape') toMenu(); return; }
  if (e.code === 'Enter') { if (state === 'title') openMap(); else if ($('panel').classList.contains('on')) { const b = $('card').querySelector('button'); if (b) b.click(); } }
});
addEventListener('keyup', e => { if (CON.on || $('adm').classList.contains('on')) return; const k = KEYMAP[e.code]; if (k) { press(k, false); e.preventDefault(); } });
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
document.addEventListener('touchstart', noZoom, { passive: false }); document.addEventListener('touchmove', e => { if (!(e.touches.length === 1 && e.target.closest && e.target.closest('#conOut,.abody,.tbody'))) e.preventDefault(); }, { passive: false });
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
  if (state === 'map' && !nav.length) { if (now.right && !padPrev.mr) mapMove(1); if (now.left && !padPrev.ml) mapMove(-1); if (up && !padPrev.mu) mapMove(2); if (now.down && !padPrev.md) mapMove(-2); }
  padPrev.a = b(0); padPrev.o = b(1); padPrev.mr = now.right; padPrev.ml = now.left; padPrev.mu = up; padPrev.md = now.down;
  padPrev.start = b(9);
}


/* ---------- consola secreta de trucos (10 toques rápidos sobre PAUSA) ---------- */
const CHEAT = { ghost: false, live: false, floor: false, stop: false, kill: false, unlock: false, laser: false, fly: false, time: false, floorT: 0 };
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
  if (!vkbOn) { if (U || D) { conOut.scrollTop += U ? -60 : 60; conHold = performance.now() + 4000; } if (edge(0, 'cx')) vkbEnter(); return; }
  if (edge(4, 'cl1') | edge(5, 'cr1')) { vkbTop = !vkbTop; vkbShow(true); }
  if (L || R || U || D) {
    const old = vkbRow(vkbR).length;
    if (L) vkbC = (vkbC - 1 + old) % old; if (R) vkbC = (vkbC + 1) % old;
    if (U || D) { const nr = (vkbR + (U ? -1 : 1) + VKB_ROWS.length) % VKB_ROWS.length, nl = vkbRow(nr).length; vkbC = Math.min(nl - 1, Math.round(vkbC * (nl - 1) / Math.max(1, old - 1))); vkbR = nr; }
    vkbPaint(); tone(1300, 1300, 0.02, 'square', 0.03);
  }
  if (edge(0, 'cx')) { vkbPress(); const el = $('vkb').querySelector('.k.sel'); if (el) { el.style.transform = 'scale(.9)'; setTimeout(() => el.style.transform = '', 90); } }
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
  if (!it) { CON.typing = false; if (CON.on && CON.busy) conPrompt(); return; }
  CON.typing = true;
  const el = document.createElement('div'); if (it.cls) el.className = it.cls; conOut.appendChild(el);
  if (it.fast || !it.txt) { el.textContent = it.txt || ' '; conScroll(); conTimer = setTimeout(conPump, it.fast ? 28 : 60); return; }
  let i = 0; const cur = document.createElement('span'); cur.className = 'cur'; cur.textContent = '_';
  const step = () => { if (!CON.on) return; el.textContent = it.txt.slice(0, ++i); el.appendChild(cur);
    if (i % 2 === 0) tone(1800 + Math.random() * 400, 1800, 0.012, 'square', 0.025); conScroll();
    if (i < it.txt.length) conTimer = setTimeout(step, it.speed); else { cur.remove(); conTimer = setTimeout(conPump, 90); } };
  step();
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
  vkbShow(false); const c = $('con'); c.classList.add('off'); tone(900, 50, 0.35, 'sawtooth', 0.06);
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
    say('Escribe un código para activarlo o desactivarlo.', 'd', 10);
    SFX.power(); return;
  }
  const code = CODES.find(c => c[0] === cmd || (cmd === 'LIVES' && c[0] === 'LIVE'));
  if (code) {
    const k = code[0].toLowerCase(); CHEAT[k] = !CHEAT[k]; if (k === 'floor') CHEAT.floorT = 0;
    if (CHEAT[k]) { say('>> ' + code[1] + ' ACTIVADO ✔', 'g big', 26); say('   ' + code[2], '', 10); SFX.power(); }
    else { say('>> ' + code[1] + ' DESACTIVADO', 'r', 22); tone(500, 120, 0.3, 'square', 0.06); }
    say(activeTxt(), 'y', 0, true); return;
  }
  if (cmd === 'ADMIN') { conAdmin(); return; }
  if (cmd === 'CLS' || cmd === 'LIMPIAR') { conOut.innerHTML = ''; say('', '', 0, true); return; }
  if (cmd === 'SALIR' || cmd === 'EXIT') { closeConsole(); return; }
  say('ERROR 0x' + rh(4) + ' · CÓDIGO "' + cmd.slice(0, 20) + '" NO RECONOCIDO', 'r', 12); tone(140, 90, 0.3, 'square', 0.08);
}
conIn.addEventListener('input', () => { conIn.value = conIn.value.toUpperCase().slice(0, 30); const tx = $('conTx'); if (tx && !CON.busy) tx.textContent = conIn.value; tone(2200, 2200, 0.01, 'square', 0.03); conScroll(); });
conIn.addEventListener('keydown', e => { e.stopPropagation();
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); const st = /Page/.test(e.key) ? conOut.clientHeight * 0.8 : 60; conOut.scrollTop += /Up/.test(e.key) ? -st : st; conHold = conOut.scrollHeight - conOut.scrollTop - conOut.clientHeight > 20 ? performance.now() + 4000 : 0; return; }
  if (e.key === 'Enter') { e.preventDefault(); if (!CON.busy) conRun(conIn.value); else if (conIn.value.trim()) { CON.pend.push(conIn.value); conIn.value = ''; } } else if (e.key === 'Escape') closeConsole(); });
const conKb = e => { if (e.target.id === 'conX' || (e.target.closest && e.target.closest('#vkb'))) return; try { conIn.blur(); conIn.focus({ preventScroll: true }); conIn.click(); } catch (x) {} };      // tocar la pantalla vuelve a sacar el teclado
let conTy = 0, conMoved = false;
$('con').addEventListener('touchstart', e => { conTy = e.touches[0].clientY; conMoved = false; }, { passive: true });
$('con').addEventListener('touchmove', e => { if (Math.abs(e.touches[0].clientY - conTy) > 10) conMoved = true; }, { passive: true });
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
  B.en('alien', 176, 13); B.laser(181, 6, 13, 0); B.row(183, 185, 12); B.pad(186, 14); B.block(186, 188, 8, 8, '='); B.gear(187, 6); B.laser(191, 6, 13, 1.4); B.row(193, 196, 12);
  B.laser(198, 6, 13, 0.7); B.box(202, 10, 'iman'); B.en('dron', 206, 10, { x0: 201, x1: 212 }); B.block(214, 217, 12, 13); B.en('torreta', 216, 11); B.row(220, 224, 11);
  // F · recta final con fosos, túnel bajo y escalera
  B.cp(227, 14); B.ground(234, 240); B.arc(230, 234, 11, 2); B.en('erizo', 237, 13); B.ground(244, 299); B.arc(240, 244, 11, 2);
  B.en('patrulla', 248, 13); B.block(252, 260, 10, 12); B.block(262, 262, 13, 13); B.row(252, 260, 13); B.box(264, 10, 'estrella'); B.en('patrulla', 268, 13); B.en('patrulla', 273, 13); B.en('erizo', 278, 13);
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
  P(9, 13, 95); P(15, 19, 92); B.en('patrulla', 16, 91); B.laser(18, 87, 91, 0, 1.1, 1.5);      // láser anclado: del techo (repisa) al suelo de la plataforma P(23, 28, 89); B.row(23, 28, 88); B.cp(27, 89);
  B.block(14, 22, 86, 86); B.pad(15, 86); B.row(17, 21, 85); B.box(19, 82, 'chip'); B.box(20, 82, 'chip');
  B.block(3, 5, 84, 84); B.gear(4, 82); B.arc(6, 12, 84, 2);                  // engranaje 1: a la izquierda del saltador
  // C · ascensor antigravedad entre drones
  P(12, 17, 79); B.en('alien', 14, 78); P(19, 23, 81);
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
  P(10, 14, 16); B.row(10, 14, 15); P(4, 8, 13);
  // F · la cima: antena 5G
  P(3, 7, 11); B.block(9, 30, 10, 11); B.en('patrulla', 14, 9); B.en('patrulla', 19, 9); B.arc(9, 22, 7, 3); B.box(17, 5, 'estrella');
  return B.done({ name: 'TORRE DE ANTENAS', time: 210, vert: true, spawn: { x: 5 * T, y: (H - 2) * T }, goal: { x: 26 * T + T / 2, y: 10 * T }, rise: { y: H * T + 400, speed: 40, startY: 103 * T, on: false } });
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
  B.en('dron', 68, 15, { x0: 62, x1: 76 }); B.en('patrulla', 74, 19);
  P(64, 67, 14); P(70, 73, 9); P(76, 79, 5); B.row(70, 73, 8); B.gear(78, 3);              // engranaje 2: escalera al cielo
  // D · el gran vacío
  B.mover(80, 17, 2, 0, 60, 1.2, 0); B.mover(84, 15, 2, 0, 60, 1.2, 1.5); B.arc(80, 87, 12, 3);
  B.ground(87, 110); B.box(90, 16, 'iman'); B.en('alien', 95, 19); B.en('dron', 100, 14, { x0: 92, x1: 108 });
  B.block(102, 104, 17, 19); B.en('torreta', 103, 16); P(106, 109, 15); B.row(106, 109, 14);
  // E · saltador a la isla del cielo (o por abajo con la plataforma)
  B.pad(108, 20); P(112, 117, 7); B.gear(116, 5); B.arc(111, 118, 5, 2);                   // engranaje 3: isla del cielo
  B.mover(112, 18, 3, 80, 0, 1.1, 0); B.ground(118, 165); B.cp(120, 20);
  // F · lluvia de chips y meta
  B.box(131, 16, 'estrella'); B.en('erizo', 150, 19);
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
  B.block(18, 20, 9, 9, '='); B.gear(19, 7); B.en('patrulla', 23, 13); B.en('dron', 28, 10, { x0: 25, x1: 33 }); B.row(25, 31, 12);
  B.cp(35, 14); B.box(38, 10, 'chip'); B.hid(33, 10, 'vida');
  B.block(42, 43, 0, 10); B.block(78, 79, 0, 15);                                  // puerta de la arena y pared del fondo
  B.gear(46, 12); B.gear(76, 12); B.row(55, 67, 13);
  return B.done({ name: 'EL GUARDIÁN', time: 240, spawn: { x: 3 * T, y: 14 * T }, goal: { x: -99999, y: 14 * T }, arena: { x0: 44 * T, x1: 78 * T }, bossLvl: true });
};
function bossInit(l) { l.boss = { x: (l.arena.x0 + l.arena.x1) / 2, y: 9.8 * T, hover0: 9.8 * T, hp: 6, max: 6, st: 'wait', t: 0, fight: false, flash: 0, inv: 0, shotT: 1, vy: 0, dieT: 0, boomT: 0, gone: false }; l.waves = []; }
function bossGate(close) { for (let y = 11; y <= 13; y++) for (let x = 42; x <= 43; x++) L.g[y][x] = close ? '#' : ' '; }
function bossReset() { const b = L.boss; if (!b || b.gone) return; bossGate(false); Object.assign(b, { x: (L.arena.x0 + L.arena.x1) / 2, y: b.hover0, hp: b.max, st: 'wait', t: 0, fight: false, flash: 0, inv: 0, vy: 0 }); L.waves = []; }
const BOSS_H = 200, bossRect = b => ({ x: b.x - 68, y: b.y - 172, w: 136, h: 166 });
function bossHit() {
  const b = L.boss; if (b.inv > 0) return;
  b.hp--; b.flash = 0.3; b.inv = 0.7; shake = 0.4; addScore(1000, b.x, b.y - 210);
  [880, 660, 440, 220].forEach((f, i) => tone(f, f * 0.7, 0.12, 'sawtooth', 0.12, i * 0.06)); noise(0.4, 0.2, 1200);
  burst(b.x, b.y - 110, 30, '#ffd23c', 320, 0.7, 400, 4); burst(b.x, b.y - 110, 16, '#fff', 260, 0.4, 0, 3);
  if (b.hp <= 0) { b.st = 'die'; b.dieT = 0; L.waves = []; enemies.forEach(e => killEnemy(e, 'fly')); shots = shots.filter(s2 => s2.mine); return; }
  if (b.hp === b.max / 2) { pop(b.x, b.y - 230, '¡SE HA ENFADADO!', '#ff4a5a'); tone(80, 40, 1.2, 'sawtooth', 0.12); }
  b.st = 'rise'; b.t = 0;
}
function bossUpdate(dt) {
  const b = L.boss, p = P; if (!b || b.gone) return;
  b.t += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
  const a = L.arena, mid = (a.x0 + a.x1) / 2, ph2 = b.hp <= b.max / 2, gy = 14 * T;
  if (b.st === 'wait') { b.y = b.hover0 + Math.sin(time * 2) * 10;
    if (!p.dead && p.x > a.x0 + 3 * T) { bossGate(true); b.fight = true; b.st = 'intro'; b.t = 0; shake = 0.6; pop(mid, b.y - 260, '¡EL GUARDIÁN!', '#ff4a5a'); tone(90, 45, 1.4, 'sawtooth', 0.14); noise(0.8, 0.2, 400); }
    return; }
  if (b.st === 'intro') { b.y = b.hover0 + Math.sin(time * 9) * 4; if (b.t > 1.7) { b.st = 'hover'; b.t = 0; b.shotT = 0.6; } }
  else if (b.st === 'hover') {
    const tx = mid + Math.sin(b.t * (ph2 ? 1.25 : 0.9)) * ((a.x1 - a.x0) / 2 - 190);
    b.x += (tx - b.x) * Math.min(1, dt * 1.6); b.y = b.hover0 + Math.sin(time * 2.5) * 14;
    b.shotT -= dt;
    if (b.shotT <= 0 && !p.dead) { const n = ph2 ? 5 : 3, sp = ph2 ? 330 : 270, cx0 = b.x, cy0 = b.y - 130, an = Math.atan2(p.y + p.h / 2 - cy0, p.x + p.w / 2 - cx0);
      for (let k = 0; k < n; k++) { const aa = an + (k - (n - 1) / 2) * 0.24; shots.push({ mine: false, x: cx0, y: cy0, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, w: 16, h: 16, life: 4 }); }
      b.shotT = ph2 ? 1.05 : 1.45; tone(300, 120, 0.25, 'sawtooth', 0.09); burst(cx0, cy0, 12, '#ff9a3c', 160, 0.35, 0, 3); }
    if (b.t > (ph2 ? 4.2 : 5.5)) { b.st = 'aim'; b.t = 0; tone(200, 1400, 0.8, 'square', 0.05); }
  } else if (b.st === 'aim') {
    b.x += (Math.max(a.x0 + 110, Math.min(a.x1 - 110, p.x + p.w / 2)) - b.x) * Math.min(1, dt * 5); b.y = b.hover0 - 30 * Math.min(1, b.t * 2);
    if (b.t > (ph2 ? 0.7 : 0.95)) { b.st = 'slam'; b.vy = 200; b.t = 0; }
  } else if (b.st === 'slam') {
    b.vy += 3800 * dt; b.y += b.vy * dt;
    if (b.y >= gy) { b.y = gy; b.st = 'stun'; b.t = 0; shake = 0.7; noise(0.6, 0.3, 500); tone(70, 35, 0.6, 'sawtooth', 0.15);
      const ws = ph2 ? 520 : 420; L.waves.push({ x: b.x - 70, dir: -1, sp: ws }, { x: b.x + 70, dir: 1, sp: ws });
      burst(b.x - 60, gy, 18, '#9fb4ff', 260, 0.6, 600, 4); burst(b.x + 60, gy, 18, '#9fb4ff', 260, 0.6, 600, 4);
      if (ph2 && enemies.filter(e => !e.dead).length < 3) { const tx = b.x < mid ? a.x1 - 2 * T : a.x0 + T, d = ENEMY.patrulla; enemies.push({ type: 'patrulla', d, w: d.w, h: d.bh, x: tx, y: 4 * T, vx: 0, vy: 0, dir: b.x < mid ? -1 : 1, dead: 0, t: 0, timer: 1 }); } }
  } else if (b.st === 'stun') { if (b.t > (ph2 ? 2.1 : 2.9)) { b.st = 'rise'; b.t = 0; } }
  else if (b.st === 'rise') { b.y -= 420 * dt; if (b.y <= b.hover0) { b.y = b.hover0; b.st = 'hover'; b.t = 0; b.shotT = 0.9; } }
  else if (b.st === 'die') {
    b.dieT += dt; b.boomT -= dt; shake = Math.max(shake, 0.2);
    if (b.boomT <= 0) { b.boomT = 0.11; const ex = b.x + (Math.random() - 0.5) * 180, ey = b.y - 20 - Math.random() * 200; burst(ex, ey, 16, Math.random() < 0.5 ? '#ff9a3c' : '#ffd23c', 240, 0.5, 200, 4); noise(0.25, 0.18, 900); }
    if (b.y < gy) b.y = Math.min(gy, b.y + 120 * dt);
    if (b.dieT > 2.8) { b.gone = true; shake = 1; for (let k = 0; k < 6; k++) burst(b.x, b.y - 110, 30, ['#fff', '#ffd23c', '#ff9a3c', '#29e6ff', '#35ff8a', '#c63cff'][k], 420, 1.2, 250, 5);
      SFX.win(); L.goal = { x: mid, y: gy }; pop(mid, b.y - 260, '¡GUARDIÁN DERROTADO!', '#35ff8a'); bossGate(false); }
    return;
  }
  // golpes
  const r = bossRect(b);
  if (CHEAT.kill && !p.dead && !p.win && overlap(p, r) && b.inv <= 0) bossHit();
  else if (!p.dead && !p.win && overlap(p, r)) {
    if ((b.st === 'stun' || p.tStar > 0 && b.st === 'stun') && p.vy > 0 && p.y + p.h - p.vy * dt * 1.5 <= r.y + 40) { bossHit(); p.vy = -760; p.y = r.y - p.h - 1; p.sq = 1; }
    else if (b.st !== 'stun') hurt();
  }
  for (const s2 of shots) if (s2.mine && s2.life > 0 && overlap({ x: s2.x - s2.w / 2, y: s2.y - s2.h / 2, w: s2.w, h: s2.h }, r)) {
    s2.life = 0; if (b.st === 'stun') bossHit(); else { burst(s2.x, s2.y, 8, '#cfe0ff', 140, 0.25, 0, 2.5); tone(2400, 1800, 0.05, 'square', 0.05); } }
  for (const w of L.waves) { w.x += w.dir * w.sp * dt; if (w.x < a.x0 - 20 || w.x > a.x1 + 20) w.dead = true;
    if (!p.dead && !p.win && p.y + p.h > gy - 38 && Math.abs(p.x + p.w / 2 - w.x) < 30) hurt(); }
  L.waves = L.waves.filter(w => !w.dead);
}
const TINT = {};
function tintOf(im, col) { const k = col; if (TINT[k] || !im.naturalWidth) return TINT[k]; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (TINT[k] = c); }
function drawBoss() {
  const b = L.boss; if (!b || b.gone) return;
  const im = IMG.jefe1; if (!im || !im.naturalWidth) return;
  const h = BOSS_H, w = h * im.naturalWidth / im.naturalHeight, flip = P.x + P.w / 2 > b.x, fs = flip ? -1 : 1, ph2 = b.hp <= b.max / 2, gy = 14 * T;
  let x = b.x, y = b.y; if (b.st === 'aim' || b.st === 'die' || b.st === 'intro') { x += (Math.random() - 0.5) * 8; y += (Math.random() - 0.5) * 6; }
  const air = Math.max(0, gy - y);
  ctx.fillStyle = 'rgba(0,0,10,' + Math.max(0.12, 0.45 - air / 900) + ')'; ctx.beginPath(); ctx.ellipse(b.x, gy + 2, 110 - Math.min(60, air / 8), 14, 0, 0, 6.283); ctx.fill();
  if (b.st === 'aim') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,60,' + (0.25 + 0.25 * Math.sin(time * 30)) + ')'; ctx.fillRect(b.x - 90, gy - 6, 180, 8); ctx.globalCompositeOperation = 'source-over'; }
  if (b.st !== 'stun' && b.st !== 'die') flame(x + fs * -0.04 * w, y - 22, b.st === 'slam' ? 26 : 78 + (ph2 ? 20 : 0), 46, 9);
  const rot = b.st === 'stun' ? 0.1 * Math.sin(time * 3) : b.st === 'die' ? (Math.random() - 0.5) * 0.12 : Math.sin(time * 2) * 0.03;
  const draw = (src, al) => { ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(fs, 1); ctx.drawImage(src, -w / 2, -h, w, h); ctx.restore(); };
  draw(im, 1);
  if (ph2 || b.st === 'die') { const t2 = tintOf(im, 'rgba(255,30,30,1)'); if (t2) draw(t2, 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(time * 8))); if (Math.random() < 0.3) parts.push({ x: x + (Math.random() - 0.5) * 140, y: y - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 60, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#ffd23c' : '#8a8fa8', size: 2.5, grav: 0 }); }
  if (b.flash > 0) { const t3 = tintOf(im, '#fff'); if (t3) draw(t3, Math.min(1, b.flash / 0.15)); }
  // núcleo (el punto débil) y ojo
  const cx = x + fs * (0.457 - 0.5) * w, cy = y - h * (1 - 0.453), stun = b.st === 'stun';
  ctx.globalCompositeOperation = 'lighter';
  const R = stun ? 60 + 14 * Math.sin(time * 14) : 26, cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, R); cg.addColorStop(0, stun ? 'rgba(255,255,200,1)' : 'rgba(255,120,60,.6)'); cg.addColorStop(0.35, stun ? 'rgba(255,200,60,.8)' : 'rgba(255,60,40,.35)'); cg.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
  const ex = x + fs * (0.495 - 0.5) * w, ey = y - h * (1 - 0.19), eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, stun ? 10 : 22); eg.addColorStop(0, 'rgba(255,80,80,.9)'); eg.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 22, 0, 6.283); ctx.fill();
  if (b.st === 'aim') { ctx.strokeStyle = 'rgba(255,40,60,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(b.x, gy); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  if (stun) { ctx.font = '900 26px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const aa = time * 4 + k * 2.094; ctx.fillStyle = '#ffd23c'; ctx.fillText('★', b.x + Math.cos(aa) * 60, y - h - 6 + Math.sin(aa) * 12); }
    ctx.font = '800 13px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(time * 10)) + ')'; ctx.fillText('¡AHORA! SALTA ENCIMA', b.x, y - h - 34); ctx.textBaseline = 'alphabetic'; }
}
function drawWaves() {
  if (!L.waves) return; const gy = 14 * T; ctx.globalCompositeOperation = 'lighter';
  for (const w of L.waves) { const g2 = ctx.createRadialGradient(w.x, gy, 2, w.x, gy, 46); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(0.4, 'rgba(255,120,60,.7)'); g2.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(w.x, gy, 30, 42, 0, Math.PI, 0); ctx.fill();
    if (Math.random() < 0.8) parts.push({ x: w.x, y: gy - Math.random() * 20, vx: -w.dir * 60, vy: -80 - Math.random() * 120, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#ff9a3c' : '#fff', size: 2.5, grav: 600 }); }
  ctx.globalCompositeOperation = 'source-over';
}
function buildLevel() {
  const l = (LEVELS[curId] || LEVELS['1-1'])();
  l.time = l.time || 180; l.cps = l.cps || [l.checkpoint]; l.pads = l.pads || []; l.lasers = l.lasers || []; l.movers = l.movers || []; l.strips = l.strips || []; l.lifts = l.lifts || []; l.gk = l.gk || 1; l.mets = []; l.lastCp = null; if (l.bossLvl) bossInit(l);
  return l;
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
  if (P.inv > 0 || P.dead || P.win || P.tStar > 0 || CHEAT.ghost) return;
  if (P.shield) { P.shield = false; P.inv = 1.6; SFX.hurt(); burst(P.x + P.w / 2, P.y + P.h / 2, 16, '#29a8ff', 220); shake = 0.15; return; }
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
  P = newPlayer(cp.x, cp.y); P.inv = 1.5; G.tleft = L.time;
  spawnEnemies(); shots = [];
  if (L.chase && L.chase.on) L.chase.x = P.x - 560;
  if (L.rise && L.rise.on) L.rise.y = P.y + P.h + 460;
  if (L.boss) bossReset();
}
function updatePlayer(dt) {
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
  const wantCrouch = K.down && p.onGround && p.power !== 'mini';
  if (wantCrouch && !p.crouch) { p.crouch = true; setSize(p); }
  else if (!wantCrouch && p.crouch && canStand(p)) { p.crouch = false; setSize(p); }
  // horizontal
  const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
  const max = (p.crouch ? 110 : 270) * (p.tStar > 0 ? 1.2 : 1) * (p.tTurbo > 0 ? 1.15 : 1) * (p.fast > 0 ? 1.75 : 1);
  const acc = (p.onGround ? 2200 : 1500) * (p.fast > 0 ? 1.7 : 1);
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
  if (!K.jump && p.vy < -260 && !p.boost) p.vy = -260;               // salto corto si sueltas
  if ((p.tTurbo > 0 || CHEAT.fly) && K.jump) p.vy = Math.max(p.vy - 3600 * dt, -330);   // turbo: volar
  p.vy = Math.min(p.vy + 2000 * L.gk * dt, L.gk < 1 ? 560 : 900);
  const wasAir = !p.onGround, vyBefore = p.vy, feet0 = p.y + p.h;
  moveEnt(p, dt);
  if (p.vy < 0 && !p.dead) { const ty = Math.floor(p.y / T);           // bloque invisible: aparece al golpearlo desde abajo
    for (const tx of [Math.floor((p.x + p.w / 2) / T), Math.floor((p.x + 4) / T), Math.floor((p.x + p.w - 4) / T)]) if (tileAt(tx, ty) === 'I') {
      L.g[ty][tx] = '?'; p.y = (ty + 1) * T + 0.01; p.vy = 0; hitBlock(tx, ty); burst(tx * T + T / 2, ty * T + T / 2, 22, '#fff', 220, 0.5, 0, 3); tone(1568, 2093, 0.18, 'triangle', 0.1); break; } }
  if (p.vy >= 0) p.boost = 0;
  if (p.vy >= 0 && !p.drop) for (const m of L.movers) {        // plataformas móviles: te llevan encima
    if (p.x + p.w > m.x + 4 && p.x < m.x + m.w - 4 && feet0 <= m.y - m.dy + 10 && p.y + p.h >= m.y - 2) { p.y = m.y - p.h - 0.01; p.vy = 0; p.onGround = true; p.x += m.dx; if (collide(p)) p.x -= m.dx; break; }
  }
  if (p.onGround) for (const pd of L.pads) {                    // plataformas de salto
    const c = p.x + p.w / 2; if (c > pd.x - 4 && c < pd.x + pd.w + 4 && Math.abs(p.y + p.h - pd.y) < 5) { p.vy = -1180; p.onGround = false; p.boost = 1; p.coyote = 0; p.sq = 1; pd.t = 0; if (p.crouch) { p.crouch = false; setSize(p); } tone(180, 900, 0.28, 'sawtooth', 0.09); tone(360, 1500, 0.24, 'square', 0.05); burst(c, pd.y, 16, '#35ff8a', 260, 0.45, 0, 3); break; }
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
    if (Math.abs(c.x - cx) < p.w / 2 + 14 && Math.abs(c.y - cy) < p.h / 2 + 14) { c.got = true; addChip(c.x, c.y); }
  }
  for (const g of L.gears) if (!g.got && Math.abs(g.x - cx) < p.w / 2 + 20 && Math.abs(g.y - cy) < p.h / 2 + 20) { g.got = true; G.gears++; addScore(500, g.x, g.y - 20); SFX.gear(); burst(g.x, g.y, 24, '#3db8ff', 240, 0.7, 200, 4); }
  for (const it of items) if (!it.got && it.rise >= 1 && overlap(p, it)) { it.got = true; givePower(it.kind); }
  items = items.filter(i => !i.got);
  // punto de control, portal, meta
  for (const cp of L.cps) if (!cp.on && Math.abs(cx - cp.x) < 30 && p.y + p.h > cp.y - 120 && p.y + p.h < cp.y + 30) { cp.on = true; L.lastCp = cp; SFX.check(); pop(cp.x, cp.y - 90, 'PUNTO DE CONTROL', '#35ff8a'); burst(cp.x, cp.y - 60, 20, '#35ff8a', 200, 0.6, 0, 3); }
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
const POWER_NAME = { vida: '+1 VIDA', laser: 'LÁSER', escudo: 'ESCUDO', turbo: 'TURBO', iman: 'IMÁN', mini: 'MINI LUCAS', estrella: 'ESTRELLA 5G' };
function givePower(k) {
  const p = P; SFX.power(); addScore(200); pop(p.x + p.w / 2, p.y - 16, POWER_NAME[k], '#29e6ff');
  burst(p.x + p.w / 2, p.y + p.h / 2, 20, '#29e6ff', 240, 0.6, 0, 3);
  if (k === 'vida') { G.lives++; SFX.life(); }
  else if (k === 'escudo') p.shield = true;
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
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
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
  p.inLift = false;
  if (!p.dead && !p.win) for (const lf of L.lifts) { const c = p.x + p.w / 2;
    if (c > lf.x0 && c < lf.x1 && p.y + p.h > lf.y0 && p.y < lf.y1) { if (!p.wasLift) tone(200, 700, 0.4, 'sine', 0.08); p.inLift = true; p.vy = Math.max(p.vy - 4400 * dt, -400); p.onGround = false; if (Math.random() < 0.5) parts.push({ x: c + (Math.random() - 0.5) * 30, y: p.y + p.h, vx: 0, vy: 120, life: 0.35, max: 0.35, col: '#7fe9ff', size: 2.4, grav: 0 }); break; } }
  p.wasLift = p.inLift;
  if (!p.dead && !p.win) for (const l of L.lasers) if (laserOn(l) && p.x < l.x + 6 && p.x + p.w > l.x - 6 && p.y < l.y1 && p.y + p.h > l.y0) { if (p.tStar <= 0) hurt(); break; }
  for (const c of L.chips) if (c.fall && !c.got) { c.y += c.vy * dt; if (c.y > (L.H - 2) * T - 6) c.got = true; }
  const r = L.rain;
  if (r) {
    if (r.st === 0 && p.x > r.x0 && p.x < r.x1) { r.st = 1; pop(p.x + p.w / 2, p.y - 40, '¡LLUVIA DE CHIPS!', '#ffd23c'); SFX.life(); }
    if (r.st === 1) { r.t += dt; r.acc += dt; while (r.acc > 0.065) { r.acc -= 0.065; L.chips.push({ x: r.x0 + 30 + Math.random() * (r.x1 - r.x0 - 60), y: cam.y - 20, t: Math.random() * 6, vy: 230 + Math.random() * 260, fall: true }); } if (r.t > r.dur) r.st = 2; }
    if (L.chips.length > 600) L.chips = L.chips.filter(c => !c.got);
  }
  const ch = L.chase;
  if (ch) {
    if (!ch.on && p.x > ch.startX) { ch.on = true; ch.x = p.x - 620; pop(p.x + p.w / 2, p.y - 40, '¡CORRE!', '#ff5a6a'); [330, 440, 330, 440, 330, 440].forEach((f, i) => tone(f, f, 0.14, 'sawtooth', 0.1, i * 0.15)); shake = 0.3; }
    if (ch.on && !p.win && !p.dead) { ch.x += ch.speed * dt; ch.x = Math.max(ch.x, p.x - VW * 0.8); if (CHEAT.stop) ch.x = Math.min(ch.x, p.x - 230); if (p.x < ch.x + 4) die(); }
  }
  const mt = L.meteors;
  if (mt) {
    const cxp = p.x + p.w / 2, inZone = mt.zones.some(z => cxp > z[0] && cxp < z[1]);
    if (inZone && !p.dead && !p.win) { mt.acc += dt; if (mt.acc > mt.every) { mt.acc = Math.random() * 0.3; L.mets.push({ x: cxp - 150 + Math.random() * 800, y: cam.y - 50, vx: -50 - Math.random() * 70, vy: 230 + Math.random() * 110, r: 13 + Math.random() * 9, rot: Math.random() * 6, sp: (Math.random() - 0.5) * 6 }); if (!mt.warned) { mt.warned = 1; pop(cxp, p.y - 40, '¡METEORITOS!', '#ff9a3c'); [600, 450, 600, 450].forEach((f, i) => tone(f, f, 0.12, 'sawtooth', 0.08, i * 0.14)); } } }
    for (const m of L.mets) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.sp * dt;
      if (Math.random() < 0.9) parts.push({ x: m.x + (Math.random() - 0.5) * m.r, y: m.y + (Math.random() - 0.5) * m.r, vx: -m.vx * 0.3 + (Math.random() - 0.5) * 40, vy: -m.vy * 0.3, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#ff9a3c' : '#ffe08a', size: 2.5 + Math.random() * 2, grav: 0 });
      let boom = isSolid(tileAt(Math.floor(m.x / T), Math.floor((m.y + m.r * 0.6) / T))) || m.y > L.H * T + 40;
      if (!boom && !p.dead && !p.win && Math.abs(m.x - (p.x + p.w / 2)) < m.r * 0.8 + p.w / 2 && Math.abs(m.y - (p.y + p.h / 2)) < m.r * 0.8 + p.h / 2) { if (CHEAT.kill || p.tStar > 0) { boom = true; addScore(50, m.x, m.y); } else if (!CHEAT.ghost) { hurt(); boom = true; } }
      if (!boom) for (const s2 of shots) if (s2.mine && Math.hypot(s2.x - m.x, s2.y - m.y) < m.r + 12) { s2.life = 0; boom = true; addScore(50, m.x, m.y - 10); break; }
      if (boom) { m.dead = true; if (m.y < L.H * T) { burst(m.x, m.y, 18, '#ff9a3c', 220, 0.5, 300, 3.5); burst(m.x, m.y, 8, '#6b4a3a', 160, 0.6, 600, 4); if (m.x > cam.x - 50 && m.x < cam.x + VW + 50) { noise(0.3, 0.16, 800); shake = Math.max(shake, 0.1); } } }
    }
    L.mets = L.mets.filter(m => !m.dead);
  }
  const rs = L.rise;
  if (rs) {
    if (!rs.on && p.y + p.h < rs.startY) { rs.on = true; pop(p.x + p.w / 2, p.y - 40, '¡EL PLASMA SUBE!', '#35ff8a'); [220, 262, 330, 392].forEach((f, i) => tone(f, f * 1.5, 0.2, 'sawtooth', 0.08, i * 0.14)); shake = 0.3; }
    if (rs.on && !p.win && !p.dead) { rs.y -= rs.speed * dt; rs.y = Math.min(rs.y, p.y + p.h + VHv * 0.62); if (CHEAT.stop) rs.y = Math.max(rs.y, p.y + p.h + 170); if (p.y + p.h > rs.y + 10) die(); }
  }
}
function drawStageBack() {          // por detrás de los personajes
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
    const w = lf.x1 - lf.x0, h = lf.y1 - lf.y0; ctx.globalCompositeOperation = 'lighter';
    const g2 = ctx.createLinearGradient(lf.x0, 0, lf.x1, 0); g2.addColorStop(0, 'rgba(41,230,255,0)'); g2.addColorStop(0.5, 'rgba(41,230,255,' + (0.16 + 0.05 * Math.sin(time * 5)) + ')'); g2.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g2; ctx.fillRect(lf.x0, lf.y0, w, h);
    ctx.strokeStyle = 'rgba(127,243,255,.55)'; ctx.lineWidth = 3; const off = (time * 140) % 44;
    for (let y = lf.y1 - off; y > lf.y0 + 6; y -= 44) { ctx.globalAlpha = Math.min(1, (y - lf.y0) / 120) * 0.8; ctx.beginPath(); ctx.moveTo(lf.x0 + w * 0.3, y); ctx.lineTo(lf.x0 + w / 2, y - 12); ctx.lineTo(lf.x0 + w * 0.7, y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#7fe9ff'; ctx.fillRect(lf.x0 + 4, lf.y1 - 4, w - 8, 4); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.4) parts.push({ x: lf.x0 + Math.random() * w, y: lf.y1 - Math.random() * h, vx: 0, vy: -90 - Math.random() * 90, life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#7fe9ff' : '#fff', size: 1.8, grav: 0 }); }
  const PI = IMG.plataforma;
  for (const m of L.movers) { const w = m.w + 10, x = m.x - 5, y = m.y - 2, h = PI && PI.naturalWidth ? w * PI.naturalHeight / PI.naturalWidth : 14;
    ctx.globalCompositeOperation = 'lighter'; for (const fx of [0.165, 0.835]) { const g2 = ctx.createRadialGradient(x + w * fx, y + h, 0, x + w * fx, y + h, w * 0.16); g2.addColorStop(0, 'rgba(255,190,60,.5)'); g2.addColorStop(1, 'rgba(255,190,60,0)'); ctx.fillStyle = g2; ctx.fillRect(x + w * fx - w * 0.16, y + h - 4, w * 0.32, w * 0.18); } ctx.globalCompositeOperation = 'source-over';
    if (PI && PI.naturalWidth) ctx.drawImage(PI, x, y, w, h); else { ctx.fillStyle = '#2c386e'; ctx.fillRect(x, y, w, 14); } }
  for (const pd of L.pads) { const k = Math.max(0, 1 - pd.t * 5), x = pd.x, y = pd.y - 9 + k * 6;
    ctx.fillStyle = '#10182e'; ctx.fillRect(x + 2, y, pd.w - 4, 10); ctx.fillStyle = '#3d4d7c'; ctx.fillRect(x + 2, y, pd.w - 4, 3);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const ph = (time * 1.6 + i / 3) % 1, yy = y - 4 - ph * 26; ctx.globalAlpha = (1 - ph) * 0.9; ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 12, yy + 6); ctx.lineTo(x + pd.w / 2, yy); ctx.lineTo(x + pd.w - 12, yy + 6); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(53,255,138,' + (0.45 + 0.25 * Math.sin(time * 8)) + ')'; ctx.fillRect(x + 6, y + 1, pd.w - 12, 3); ctx.globalCompositeOperation = 'source-over'; }
}
function drawStageFront() {         // por delante: láseres, muro, plasma
  for (const l of L.lasers) {
    if (l.x < cam.x - 60 || l.x > cam.x + VW + 60) continue;
    const ph = laserPh(l), on = ph < l.on, warn = !on && ph > l.on + l.off - 0.45;
    ctx.fillStyle = '#1a2038'; ctx.fillRect(l.x - 11, l.y0 - 2, 22, 9); ctx.fillRect(l.x - 11, l.y1 - 7, 22, 9);
    ctx.fillStyle = on || warn ? '#ff4a5a' : '#5a2a34'; ctx.fillRect(l.x - 5, l.y0 + 4, 10, 4); ctx.fillRect(l.x - 5, l.y1 - 8, 10, 4);
    ctx.globalCompositeOperation = 'lighter';
    if (on) { const w = 5 + Math.random() * 3; const g2 = ctx.createLinearGradient(l.x - 22, 0, l.x + 22, 0); g2.addColorStop(0, 'rgba(255,40,70,0)'); g2.addColorStop(0.5, 'rgba(255,40,70,.55)'); g2.addColorStop(1, 'rgba(255,40,70,0)'); ctx.fillStyle = g2; ctx.fillRect(l.x - 22, l.y0 + 6, 44, l.y1 - l.y0 - 12); ctx.fillStyle = '#ff5a7a'; ctx.fillRect(l.x - w / 2, l.y0 + 6, w, l.y1 - l.y0 - 12); ctx.fillStyle = '#fff'; ctx.fillRect(l.x - 1, l.y0 + 6, 2, l.y1 - l.y0 - 12); }
    else if (warn && Math.floor(time * 16) % 2) { ctx.fillStyle = 'rgba(255,90,110,.7)'; ctx.fillRect(l.x - 1, l.y0 + 6, 2, l.y1 - l.y0 - 12); }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const m of L.mets) {
    if (m.x < cam.x - 80 || m.x > cam.x + VW + 80) continue;
    const sp = Math.hypot(m.vx, m.vy), ux = m.vx / sp, uy = m.vy / sp, tl = m.r * 5;
    ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createLinearGradient(m.x, m.y, m.x - ux * tl, m.y - uy * tl); tg.addColorStop(0, 'rgba(255,170,60,.85)'); tg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.strokeStyle = tg; ctx.lineCap = 'round'; ctx.lineWidth = m.r * 1.5; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - ux * tl, m.y - uy * tl); ctx.stroke();
    const gg = ctx.createRadialGradient(m.x, m.y, m.r * 0.4, m.x, m.y, m.r * 2.2); gg.addColorStop(0, 'rgba(255,150,50,.6)'); gg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.2, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
    const rg = ctx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 1, 0, 0, m.r); rg.addColorStop(0, '#a77d62'); rg.addColorStop(0.7, '#5d3f33'); rg.addColorStop(1, '#2e1d18'); ctx.fillStyle = rg;
    ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = m.r * (0.82 + 0.18 * Math.sin(k * 2.7 + m.r)); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,18,14,.55)'; ctx.beginPath(); ctx.arc(m.r * 0.25, m.r * 0.1, m.r * 0.22, 0, 6.283); ctx.arc(-m.r * 0.3, m.r * 0.35, m.r * 0.15, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, m.r * 0.9, -0.3 + Math.atan2(uy, ux) - m.rot - 1, Math.atan2(uy, ux) - m.rot + 1); ctx.stroke();
    ctx.restore();
  }
  const ch = L.chase;
  if (ch && ch.on) { const x = ch.x, top = cam.y - 20, hh = VHv + 40;
    const g2 = ctx.createLinearGradient(x - 420, 0, x, 0); g2.addColorStop(0, 'rgba(120,0,60,.96)'); g2.addColorStop(0.75, 'rgba(255,30,80,.85)'); g2.addColorStop(1, 'rgba(255,120,160,.95)'); ctx.fillStyle = g2; ctx.fillRect(cam.x - 60, top, x - cam.x + 60, hh);
    ctx.globalCompositeOperation = 'lighter'; const g3 = ctx.createLinearGradient(x, 0, x + 90, 0); g3.addColorStop(0, 'rgba(255,60,110,.7)'); g3.addColorStop(1, 'rgba(255,60,110,0)'); ctx.fillStyle = g3; ctx.fillRect(x, top, 90, hh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); for (let y = top; y < top + hh; y += 18) { const xx = x + (Math.random() - 0.5) * 14; if (y === top) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); } ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.7) parts.push({ x: x + Math.random() * 20, y: top + Math.random() * hh, vx: 60 + Math.random() * 160, vy: (Math.random() - 0.5) * 80, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#ff5a8a' : '#ffd0e0', size: 2.5, grav: 0 }); }
  const rs = L.rise;
  if (rs && rs.on) { const y = rs.y, x0 = cam.x - 20, ww = VW + 40;
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
  const p = P; light(p.x + p.w / 2, p.y + p.h / 2, (p.tStar > 0 ? 340 : 235) + Math.sin(time * 7) * 5); light(p.x + p.w / 2, p.y + p.h, 120, 0.8);
  for (const cp of L.cps) light(cp.x, cp.y - 60, cp.on ? 150 : 70, cp.on ? 0.9 : 0.55);
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
  if (state === 'title' || state === 'map') { cam.x = (Math.sin(time * 0.07) * 0.5 + 0.5) * Math.max(0, L.W * T - VW); cam.y = L.H * T - VHv; }
  if (state === 'play') {
    G.clock += dt;
    if (!P.dead && !P.win && !CHEAT.time) {
      const before = G.tleft; G.tleft = Math.max(0, G.tleft - dt);
      if (before > 30 && G.tleft <= 30) { pop(P.x + P.w / 2, P.y - 30, '¡DATE PRISA!', '#ff5a6a'); [880, 660, 880, 660, 880].forEach((f, i) => tone(f, f, 0.12, 'square', 0.1, i * 0.13)); }
      if (G.tleft <= 10 && G.tleft > 0 && Math.ceil(before) !== Math.ceil(G.tleft)) tone(1245, 1245, 0.08, 'square', 0.1);
      if (G.tleft <= 0) { pop(P.x + P.w / 2, P.y - 30, '¡SE ACABÓ EL TIEMPO!', '#ff5a6a'); die(); }
    }
    for (const m of L.movers) { const k = Math.sin(time * m.sp + m.ph), nx = m.bx + k * m.ax, ny = m.by + k * m.ay; m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny; }
    updatePlayer(dt);
    if (state !== 'play') return;
    updateEnemies(dt);
    updateStage(dt);
    if (L.boss) bossUpdate(dt);
    for (const it of items) { it.t += dt; if (it.rise < 1) { it.rise = Math.min(1, it.rise + dt * 2.5); it.y -= 46 * dt * 2.5; }
      else if (it.t > 0.8 && !P.dead) { const dx = P.x + P.w / 2 - (it.x + 20), dy = P.y + P.h / 2 - (it.y + 20), d = Math.hypot(dx, dy) || 1, v = Math.min(760, 220 + (it.t - 0.8) * 1100); it.x += dx / d * v * dt; it.y += dy / d * v * dt; } }
    const p = P;
    const tx = p.x + p.w / 2 - VW * 0.4 + p.face * 50, ty = p.y + p.h - VHv * (L.vert ? 0.62 : 0.7);
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    cam.x = Math.max(0, Math.min(L.W * T - VW, cam.x));
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
  const ghost = CHEAT.ghost && !p.dead;
  if (ghost) { const gr = ctx.createRadialGradient(cx, p.y + p.h / 2, 4, cx, p.y + p.h / 2, 80); gr.addColorStop(0, 'rgba(41,230,255,' + (0.32 + 0.12 * Math.sin(time * 5)) + ')'); gr.addColorStop(1, 'rgba(41,230,255,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(cx - 80, p.y + p.h / 2 - 80, 160, 160); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.5) parts.push({ x: cx + (Math.random() - 0.5) * 36, y: p.y + Math.random() * p.h, vx: -p.face * 30, vy: -40 - Math.random() * 30, life: 0.7, max: 0.7, col: Math.random() < 0.6 ? '#29e6ff' : '#e8fdff', size: 2.2, grav: 0 });
    ctx.globalAlpha = 0.5; }
  // llamas de los 3 propulsores
  if (!p.dead) {
    const fl = p.win ? 14 : (p.tTurbo > 0 || CHEAT.fly) && K.jump ? 64 : !p.onGround ? (p.vy < 0 ? 48 : 20) : (Math.abs(p.vx) > 40 ? 17 : 12);
    const fs = p.face < 0 ? -1 : 1, hk = LUCAS_K * mini, mouths = CAN[pose].map(o => [cx + fs * o[0] * hk * sx, by - o[1] * hk * sy - 2.5 * mini]);
    if (p.onGround) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,130,40,' + (0.2 + 0.08 * Math.sin(time * 40)) + ')'; ctx.beginPath(); ctx.ellipse(mouths[1][0], p.y + p.h + 1, 30 * mini, 5 * mini, 0, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    mouths.forEach((m, i) => flame(m[0], m[1], fl * mini * (i === 1 ? 1.1 : 1), 9 * mini, i + 1));
    if (p.onGround && Math.abs(p.vx) > 150 && Math.random() < 0.35) parts.push({ x: cx - p.face * 14, y: p.y + p.h, vx: -p.face * (40 + Math.random() * 80), vy: -20 - Math.random() * 70, life: 0.28, max: 0.28, col: Math.random() < 0.5 ? '#ffb347' : '#fff2c0', size: 2.2, grav: 300 });
    if (!p.onGround && p.vy < -100 && Math.random() < 0.7) { const m = mouths[Math.floor(Math.random() * 3)]; parts.push({ x: m[0] + (Math.random() - 0.5) * 6, y: m[1] + 20 + Math.random() * 20, vx: (Math.random() - 0.5) * 50, vy: 140 + Math.random() * 140, life: 0.32, max: 0.32, col: Math.random() < 0.6 ? '#ff9a3c' : '#ffe08a', size: 2.6, grav: 0 }); }
  }
  if (p.tStar > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = 'hsl(' + (time * 400 % 360) + ',100%,60%)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h / 2, p.w * 1.05, p.h * 0.72, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    if (Math.random() < 0.6) parts.push({ x: cx + (Math.random() - 0.5) * 40, y: p.y + Math.random() * p.h, vx: 0, vy: -30, life: 0.5, max: 0.5, col: 'hsl(' + Math.random() * 360 + ',100%,65%)', size: 3.5, grav: 0 }); }
  if (ghost) { ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 22 + 8 * Math.sin(time * 6); ctx.globalAlpha = 0.55 + 0.08 * Math.sin(time * 4); }
  spr(im, cx, by, h, ANCH[pose], 1, p.face < 0, lean, sx, sy);
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
  for (const cp of L.cps) if (vis(cp.x)) { if (cp.on) { ctx.fillStyle = 'rgba(53,255,138,' + (0.25 + 0.15 * Math.sin(time * 6)) + ')'; ctx.beginPath(); ctx.arc(cp.x, cp.y - 78, 26, 0, 6.283); ctx.fill(); } ctx.globalAlpha = cp.on ? 1 : 0.7; spr(IMG['obj-checkpoint'], cp.x, cp.y, 84); ctx.globalAlpha = 1; }
  if (vis(L.goal.x)) { const g = ctx.createRadialGradient(L.goal.x, L.goal.y - 150, 4, L.goal.x, L.goal.y - 150, 90); g.addColorStop(0, 'rgba(41,230,255,.45)'); g.addColorStop(1, 'rgba(41,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.goal.x, L.goal.y - 150, 90, 0, 6.283); ctx.fill(); spr(IMG['obj-antena5g'], L.goal.x, L.goal.y, 250); }
  drawTiles();
  drawStageBack();
  // chips y engranajes
  for (const c of L.chips) if (!c.got && vis(c.x)) { const s = Math.cos(time * 4 + c.t); spr(IMG['obj-chip'], c.x, c.y + Math.sin(time * 3 + c.t) * 3, 26, 0.5, 0.5, false, 0, Math.abs(s) * 0.85 + 0.15, 1); }
  for (const g of L.gears) if (!g.got && vis(g.x)) { ctx.fillStyle = 'rgba(61,184,255,.22)'; ctx.beginPath(); ctx.arc(g.x, g.y, 30, 0, 6.283); ctx.fill(); spr(IMG['obj-engranaje'], g.x, g.y + Math.sin(time * 2.5) * 4, 40, 0.5, 0.5, false, time * 1.2); }
  const PIMG = { laser: 'poder-laser', escudo: 'poder-escudo', turbo: 'poder-turbo', iman: 'poder-iman', mini: 'poder-mini', estrella: 'poder-estrella5g' };
  for (const it of items) { const iy = it.y + 20 + Math.sin(it.t * 4) * 3;
    if (it.kind === 'vida') { ctx.globalCompositeOperation = 'lighter'; const vg = ctx.createRadialGradient(it.x + 20, iy, 4, it.x + 20, iy, 34); vg.addColorStop(0, 'rgba(53,255,138,.55)'); vg.addColorStop(1, 'rgba(53,255,138,0)'); ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(it.x + 20, iy, 34, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(160,255,200,.9)'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(20,60,40,.45)'; ctx.beginPath(); ctx.arc(it.x + 20, iy, 22, 0, 6.283); ctx.fill(); ctx.stroke(); spr(IMG['lucas-quieto'], it.x + 20, iy + 15, 32, 0.5, 1);
      ctx.font = '900 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#35ff8a'; ctx.fillText('1UP', it.x + 20, iy - 26); continue; }
    ctx.fillStyle = 'rgba(41,230,255,.2)'; ctx.beginPath(); ctx.arc(it.x + 20, iy, 30, 0, 6.283); ctx.fill(); spr(IMG[PIMG[it.kind]], it.x + 20, iy, 44, 0.5, 0.5); }
  // enemigos
  for (const e of enemies) {
    if (!vis(e.x)) continue;
    const cx = e.x + e.w / 2, by = e.y + e.h, eim = IMG[e.d.img], eax = e.d.ax || 0.5, efl = e.d.faceR ? e.dir < 0 : e.dir > 0;
    if (eim._n) eim._f = e.dead ? 0 : e.type === 'torreta' ? (e.shotT > 0 ? 2 : e.near && e.timer < 0.6 ? 1 : 0) : Math.floor(e.t * (e.d.fps || 22));
    if (e.dead) { if (e.how === 'squish') spr(IMG[e.d.img], cx, by, e.d.h, eax, 1, efl, 0, 1.25, 0.25); else spr(IMG[e.d.img], cx, by - e.d.h / 2, e.d.h, 0.5, 0.5, efl, e.dead * 9); continue; }
    const wob = e.d.fly || e.type === 'torreta' ? 0 : Math.sin(e.t * 9) * 0.04;
    spr(IMG[e.d.img], cx, by + (e.type === 'alien' ? 4 : 2), e.d.h, eax, 1, efl, wob, 1, e.type === 'alien' ? 1 + Math.sin(e.t * 5) * 0.05 : 1);
  }
  if (L.boss) drawBoss();
  drawPlayer();
  drawStageFront();
  drawWaves();
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
  spr(IMG['lucas-quieto'], pad + 14, 44, 38, 0.5, 1); txt('× ' + (CHEAT.live ? '∞' : Math.max(0, G.lives)), pad + 34, 26, CHEAT.live ? '#7fe9ff' : '#fff');
  spr(IMG['obj-chip'], pad + 112, 26, 24, 0.5, 0.5); txt(String(G.chips), pad + 130, 26, '#ffe27a');
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < G.gears ? 1 : 0.28; spr(IMG['obj-engranaje'], pad + 196 + i * 28, 26, 24, 0.5, 0.5); } ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; txt(String(G.score).padStart(6, '0'), w / 2, 26);
  ctx.font = '700 12px system-ui,sans-serif'; txt('MUNDO ' + curId, w / 2, 46, '#9fb4ff');
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
    ctx.font = '800 11px system-ui,sans-serif'; ctx.textAlign = 'center'; txt('EL GUARDIÁN', w / 2, by2, '#ff8a9a');
    ctx.fillStyle = 'rgba(5,7,26,.8)'; ctx.fillRect(bx - 2, by2 + 8, bw + 4, 14); for (let k = 0; k < b.max; k++) { const on = k < b.hp; ctx.fillStyle = on ? (b.hp <= b.max / 2 ? '#ff3a4a' : '#ff6a3a') : '#2a1a2a'; ctx.fillRect(bx + k * bw / b.max + 1, by2 + 10, bw / b.max - 2, 10); }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + b.flash * 2 + ')'; ctx.fillRect(bx, by2 + 10, bw, 10); } }
  // poderes activos
  const p = P, act = [];
  if (p.power === 'laser' || CHEAT.laser) act.push(['poder-laser', 0]); if (p.power === 'mini') act.push(['poder-mini', 0]); if (p.shield) act.push(['poder-escudo', 0]);
  if (p.tTurbo > 0) act.push(['poder-turbo', p.tTurbo / 7]); if (p.tMagnet > 0) act.push(['poder-iman', p.tMagnet / 14]); if (p.tStar > 0) act.push(['poder-estrella5g', p.tStar / 9]);
  { const ch = CODES.filter(c => CHEAT[c[0].toLowerCase()]).map(c => c[0]); if (ch.length) { ctx.font = '800 11px ui-monospace,monospace'; ctx.textAlign = 'left'; ctx.shadowColor = '#29e6ff'; ctx.shadowBlur = 8; ctx.fillStyle = '#7fe9ff'; ctx.fillText('> ' + ch.join(' · ') + (Math.floor(time * 2) % 2 ? '_' : ''), pad, act.length ? 108 : 70); ctx.shadowBlur = 0; ctx.textAlign = 'center'; } }
  act.forEach(([n, f], i) => { const x = pad + 18 + i * 44, y = 76; spr(IMG[n], x, y, 36, 0.5, 0.5);
    if (f > 0) { ctx.strokeStyle = '#35ff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20, -1.5708, -1.5708 + 6.283 * f); ctx.stroke(); } });
  ctx.restore();
}
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (!L) { ctx.fillStyle = '#070a1e'; ctx.fillRect(0, 0, VW, VHv); return; }
  if (state === 'map') drawMap(); else { drawBackground(); drawWorld(); if (L.dark && state !== 'title') drawDark(); }
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
addEventListener('keydown', e => { if (CON.on || $('adm').classList.contains('on')) return; if (e.code === 'F11' || (e.code === 'KeyF' && !e.repeat && state !== 'play')) { e.preventDefault(); toggleFull(); } });
if (!TOUCH) { $('btnFull').style.display = ''; $('btnFull').onclick = toggleFull; }
function startGame() {
  audio(); startMusic();
  resetLevel(true); state = 'play'; paused = false; if (L.intro) { const t0 = L.intro; setTimeout(() => { if (state === 'play') { pop(P.x + P.w / 2, P.y - 40, t0, '#7fe9ff'); SFX.portal(); } }, 600); }
  show('title', false); show('panel', false); show('mapUI', false); show('top', true); show('touch', TOUCH && !padUsed); checkRot();
}
function togglePause() {
  if (state !== 'play' || CON.on) return;
  paused = !paused;
  if (paused) { $('card').classList.remove('tips'); $('card').innerHTML = '<h2 id="pauseT" style="cursor:default;padding:6px 0">PAUSA</h2><div class="row"><button class="btn" id="pc">SEGUIR</button><button class="btn" id="pm">MAPA</button></div>'; show('panel', true); $('pc').onclick = togglePause; $('pm').onclick = () => toMap(false); pauseTap = { n: 0, t: 0 }; $('pauseT').addEventListener('pointerup', pauseTapOn); }
  else show('panel', false);
}
function toMenu() { setTimeout(updApply, 300); paused = false; state = 'title'; show('panel', false); show('mapUI', false); show('top', false); show('touch', false); show('title', true); checkRot(); }
function levelDone() {
  state = 'done'; show('touch', false); $('card').classList.remove('tips'); evt('superada', curId);
  const stars = 1 + (G.gears === 3 ? 1 : 0) + (G.deaths === 0 ? 1 : 0);
  const secs = Math.floor(G.clock), bonus = Math.ceil(G.tleft) * 10; G.score += bonus;
  const old = PROG[curId] || { stars: 0, best: 0 }, first = !PROG[curId];
  PROG[curId] = { stars: Math.max(old.stars, stars), best: Math.max(old.best, G.score) }; saveProg();
  { const ci = MAP.findIndex(n => n.id === curId); justOpened = first ? MAP.findIndex((n, k) => k > 0 && !n.bonus && mapPrev(k) === ci) : -1; }
  $('card').innerHTML = '<h2>' + (curId === '1-J' ? '¡MUNDO 1 COMPLETADO!' : '¡FASE SUPERADA!') + '</h2><div class="stars">' + [0, 1, 2].map(i => '<span id="st' + i + '">★</span>').join('') + '</div>' +
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

/* ---------- mapa del mundo 1 (ilustración + camino de energía) ---------- */
// x, y y rx van en fracciones del dibujo del mapa; way = puntos del tubo desde la fase anterior
const MAP = [
  { id: '1-1', n: '1', name: 'MUELLE DE CARGA', x: 0.1041, y: 0.498, rx: 0.033, built: true },
  { id: '1-2', n: '2', name: 'PASILLOS DE SERVICIO', x: 0.3479, y: 0.659, rx: 0.033, built: true, way: [[0.16, 0.47], [0.20, 0.477], [0.23, 0.52], [0.26, 0.60], [0.29, 0.655]] },
  { id: '1-3', n: '3', name: 'SALA DE MÁQUINAS', x: 0.4996, y: 0.499, rx: 0.033, built: true, way: [[0.39, 0.675], [0.42, 0.635], [0.45, 0.60], [0.47, 0.57]] },
  { id: '1-4', n: '4', name: 'TORRE DE ANTENAS', x: 0.6515, y: 0.339, rx: 0.033, gold: true, built: true, way: [[0.53, 0.46], [0.56, 0.42], [0.59, 0.385], [0.62, 0.37]] },
  { id: '1-J', n: '', name: 'JEFE · EL GUARDIÁN', x: 0.871, y: 0.393, rx: 0.05, boss: true, built: true, way: [[0.685, 0.335], [0.71, 0.305], [0.74, 0.295], [0.78, 0.31], [0.81, 0.335], [0.84, 0.37]] },
  { id: '1-B', n: '★', name: 'FASE SECRETA · PASEO ESPACIAL', x: 0.6177, y: 0.186, rx: 0.021, bonus: true, built: true, prev: 3, way: [[0.625, 0.33], [0.603, 0.29], [0.598, 0.24], [0.595, 0.21]] }
];
let PROG = {}, curId = '1-1', mapSel = 0, mapAt = 0, mapL = { x: MAP[0].x, y: MAP[0].y }, mapRoute = [], mapFace = 1, mapShake = { i: -1, t: 0 }, mapMsg = { txt: '', t: 0 }, mapUnl = null, mapParts = [], justOpened = -1;
try { PROG = JSON.parse(localStorage.getItem('tl_prog') || '{}') || {}; const os = +localStorage.getItem('tl_stars_1_1') || 0; if (os && !PROG['1-1']) PROG['1-1'] = { stars: os, best: +localStorage.getItem('tl_best_1_1') || 0 }; } catch (e) { PROG = {}; }
function saveProg() { try { localStorage.setItem('tl_prog', JSON.stringify(PROG)); } catch (e) {} }
const mapPrev = i => MAP[i].prev !== undefined ? MAP[i].prev : i - 1;
let DEV = {}; try { DEV = JSON.parse(localStorage.getItem('tl_dev') || '{}') || {}; } catch (e) { DEV = {}; }
const isBuilt = n => n.built === true || (DEV[n.id] === 1 && typeof LEVELS[n.id] === 'function');
const mapOpen = i => i === 0 || CHEAT.unlock || !!PROG[MAP[mapPrev(i)].id] || DEV[MAP[i].id] === 1;
let devTap = { i: -1, n: 0, t: 0 };
function devTapOn(i) {            // 10 toques rápidos sobre una fase aún no publicada: la abre solo en este dispositivo
  const n = MAP[i], now = performance.now(); if (typeof LEVELS[n.id] !== 'function' || mapOpen(i)) return false;
  devTap = devTap.i === i && now - devTap.t < 700 ? { i, n: devTap.n + 1, t: now } : { i, n: 1, t: now };
  if (devTap.n < 10) return false;
  DEV[n.id] = 1; try { localStorage.setItem('tl_dev', JSON.stringify(DEV)); } catch (e) {}
  devTap = { i: -1, n: 0, t: 0 }; SFX.life(); mapMsg = { txt: 'MODO PRUEBAS · FASE ' + n.id + ' ABIERTA', t: 2.6 }; mapGo(i); return true;
}
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
  $('mSub').innerHTML = !isBuilt(n) ? 'PRÓXIMAMENTE' : pr ? 'Mejor: ' + pr.best + ' puntos · <span class="mst">' + '★'.repeat(pr.stars) + '</span><span class="mso">' + '★'.repeat(3 - pr.stars) + '</span>' : '¡Fase nueva! Consigue las 3 estrellas';
  $('mPlay').disabled = !isBuilt(n);
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
function mapPlay() { if (mapUnl || mapRoute.length) return; const n = MAP[mapSel]; if (!isBuilt(n)) { mapMsg = { txt: 'PRÓXIMAMENTE', t: 1.6 }; SFX.bump(); return; } curId = n.id; evt('jugar', curId); startGame(); }
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
  const post = [];
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
  ctx.fillStyle = 'rgba(0,0,10,.3)'; ctx.beginPath(); ctx.ellipse(lx, ly0 + 0.004 * u, hL * 0.26, hL * 0.07, 0, 0, 6.283); ctx.fill();
  CAN[pose].forEach((o, i) => flame(lx + fs * o[0] * k, by - o[1] * k - 2, (moving ? 0.34 : 0.15) * hL * (i === 1 ? 1.1 : 1), hL * 0.09, i + 1));
  spr(lim, lx, by, (lim.naturalHeight || 240) * KS * k, ANCH[pose], 1, fs < 0, moving ? 0.07 * fs : 0);
  post.forEach(f => f());          // banderas y estrellas por encima de Lucas
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
  for (let i = MAP.length - 1; i >= 0; i--) { const [nx, ny] = mapPt(t, MAP[i].x, MAP[i].y), rx = MAP[i].rx * t.w; if (((x - nx) / (rx * 1.75)) ** 2 + ((y - ny - rx * 0.2) / (rx * 1.2)) ** 2 < 1) { if (!devTapOn(i)) mapSelect(i); return; } }
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
  else infoPanel('INSTALAR', 'Abre el menú del navegador <b>⋮</b> y elige <b>"Instalar aplicación"</b> o <b>"Añadir a pantalla de inicio"</b>.<br>Tendrás TURBOLUCAS como una app más, a pantalla completa.');
};
$('iosOk').onclick = () => show('ios', false);
// compartir: solo texto + enlace, para que WhatsApp muestre la tarjeta con imagen
$('btnShare').onclick = () => {
  const url = 'https://puntofibra.github.io/turbolucas/', text = '¡Juega a TURBOLUCAS! Ayuda a Lucas a cruzar la estación orbital 🚀';
  if (navigator.share) navigator.share({ title: 'TURBOLUCAS', text, url }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
};

/* ---------- portada: web del creador, consejos e instalar (todo con el estilo del juego, nada de alerts) ---------- */
const API = 'https://script.google.com/macros/s/AKfycbxtRso7g_0i53NRLJZFdM22TF2GW2EtzgwMZ3Mavq5ZVK6Ni0lXQNVXid6U7j5RL3wodQ/exec';
function api(d) { return fetch(API, { method: 'POST', body: JSON.stringify(d) }).then(r => r.json()).catch(() => ({ ok: false, error: 'Sin conexión. Inténtalo otra vez.' })); }
function evt(e, f) { try { api({ a: 'evt', e, f }); } catch (x) {} }
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
    <div class="tit"><div class="ic">📱</div><p><b>Móvil y tablet</b><br>Siempre en horizontal. Pulsa <b>INSTALAR</b> y tendrás TURBOLUCAS como una app más: a pantalla completa y sin barras del navegador.</p></div>
    <div class="tit"><div class="ic">💻</div><p><b>PC y portátil</b><br>En Chrome, Edge, Firefox o Safari. Pulsa <span class="k">F</span> o <b>PANTALLA COMPLETA</b>. También se puede instalar como aplicación.</p></div>
    <div class="tit"><div class="ic">📺</div><p><b>Smart TV</b><br>Abre el navegador de la tele (Samsung, LG, Android TV, Google TV, Fire TV…) y entra en <b>puntofibra.github.io/turbolucas</b>. Se disfruta mucho más con un mando o un teclado conectado a la tele.</p></div>
    <div class="tit"><div class="ic">⚡</div><p><b>Siempre al día</b><br>El juego se actualiza solo con fases y mejoras nuevas, y una vez cargado sigue funcionando aunque se vaya la conexión.</p></div></div>`,
  'MANDOS': `<div class="tgrid">
    <div class="tit"><div class="ic">🎮</div><p><b>Mandos compatibles</b><br>PlayStation 5 (DualSense), PlayStation 4 (DualShock 4), Xbox One y Series, Nintendo Switch Pro y la mayoría de mandos Bluetooth o USB.</p></div>
    <div class="tit"><div class="ic">🔗</div><p><b>Cómo conectarlo</b><br><b>PS5:</b> mantén PS + Create. <b>PS4:</b> PS + Share. <b>Xbox:</b> botón de emparejar de arriba. <b>Switch Pro:</b> botón de sincronizar. Cuando la luz parpadee, búscalo en <b>Ajustes › Bluetooth</b> del móvil, PC o tele. En PC también vale el cable USB.</p></div>
    <div class="tit"><div class="ic">🕹️</div><p><b>Botones</b><br><b>Saltar:</b> <span class="k">✕</span> / <span class="k">A</span><br><b>Láser:</b> <span class="k">□</span> <span class="k">○</span> <span class="k">R1</span> / <span class="k">X</span> <span class="k">B</span> <span class="k">RB</span><br><b>Pausa:</b> <span class="k">OPTIONS</span> / <span class="k">MENU</span></p></div>
    <div class="tit"><div class="ic">🧭</div><p><b>Menús con el mando</b><br>Cruceta o joystick para elegir, <span class="k">✕</span>/<span class="k">A</span> para aceptar y <span class="k">○</span>/<span class="k">B</span> para volver. Al usar el mando desaparecen los botones táctiles.</p></div></div>`,
  'CONTROLES': `<div class="tgrid">
    <div class="tit"><div class="ic">⌨️</div><p><b>Teclado</b><br><span class="k">←</span><span class="k">→</span> o <span class="k">A</span><span class="k">D</span> moverse<br><span class="k">↑</span> <span class="k">W</span> <span class="k">ESPACIO</span> saltar<br><span class="k">↓</span> <span class="k">S</span> agacharse<br><span class="k">X</span> <span class="k">SHIFT</span> láser · <span class="k">P</span> <span class="k">ESC</span> pausa</p></div>
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
$('btnWeb').onclick = () => { SFX.chip(); setTimeout(() => { location.href = 'https://puntofibra.github.io/web/'; }, 120); };

/* ---------- ADMIN: entrada con llave NFC (o QR desde un móvil Android) y menú oculto ---------- */
let ADM = null; try { ADM = sessionStorage.getItem('tl_adm'); } catch (e) {}
const setAdm = t => { ADM = t; try { t ? sessionStorage.setItem('tl_adm', t) : sessionStorage.removeItem('tl_adm'); } catch (e) {} };
const HAY_NFC = 'NDEFReader' in window;
let nfcCtl = null;
function nfcStop() { if (nfcCtl) { try { nfcCtl.abort(); } catch (e) {} nfcCtl = null; } }
async function nfcRead(onSerial, onErr) {        // solo se usa el número de serie de la llave
  nfcStop(); let busy = false;
  try { nfcCtl = new AbortController(); const r = new NDEFReader(); await r.scan({ signal: nfcCtl.signal });
    r.onreading = async ev => { if (busy) return; busy = true; try { navigator.vibrate && navigator.vibrate(80); } catch (e) {} const s2 = String(ev.serialNumber || '').replace(/:/g, '').toUpperCase(); try { await onSerial(s2); nfcStop(); } catch (e) { onErr(e.message || String(e)); busy = false; } };
    r.onreadingerror = () => { if (!busy) onErr('No pude leer la llave. Vuelve a acercarla.'); };
    return true;
  } catch (e) { nfcStop(); onErr('Activa el NFC del móvil y vuelve a intentarlo.'); return false; }
}
const NFC_HTML = '<div class="nfcw"><svg viewBox="0 0 64 64" width="54" height="54"><rect x="14" y="6" width="36" height="52" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M27 24a9 9 0 0 1 0 16M33 19a16 16 0 0 1 0 26M39 14a23 23 0 0 1 0 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><i></i><i></i></div>';
(() => { const st = document.createElement('style'); st.textContent = `
.nfcw{position:relative;width:96px;height:96px;margin:10px 0;color:#29e6ff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 8px #29e6ff)}
.nfcw i{position:absolute;inset:0;border-radius:50%;border:2px solid #29e6ff;animation:nfcp 2s infinite}.nfcw i+i{animation-delay:1s}
@keyframes nfcp{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.25);opacity:0}}
.conqr{background:#fff;padding:10px;display:inline-block;border-radius:8px;margin:8px 0;box-shadow:0 0 22px rgba(41,230,255,.6)}
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
  { f: '1-1', img: '1-1a', t: 'Túnel y cielo secreto', d: 'En el último tramo, bajo el bloque largo, hay un túnel con chips y un engranaje. Al final, el portal morado te sube a una plataforma escondida en el cielo con un montón de chips y otro engranaje.' },
  { f: '1-1', img: '1-1b', t: 'Vida oculta al empezar', d: 'Nada más empezar, salta justo encima de la primera fila de chips: aparece un bloque invisible con una vida extra (1UP).' },
  { f: '1-2', img: '1-2a', t: 'Sala de la lluvia de chips', d: 'Tras el laberinto, la plataforma flotante con portal te lleva a una sala secreta donde llueven chips durante unos segundos. El portal del fondo te devuelve al camino.' },
  { f: '1-2', img: '1-2b', t: 'Vida oculta antes del primer bicho', d: 'Justo antes del primer robot patrulla, salta en el aire: hay un bloque invisible con una vida.' },
  { f: '1-2', img: '1-2c', t: 'Imán escondido en la sala de chips', d: 'Dentro de la sala de la lluvia de chips, ve a la izquierda del todo, hasta la pared, y salta justo ahí: aparece una caja oculta con un IMÁN que atrae todos los chips que caen cerca.' },
  { f: '1-3', img: '1-3a', t: 'Vida oculta junto al erizo', d: 'Al pasar el primer erizo, antes de la escalera de bloques, salta: un bloque invisible suelta una vida extra.' },
  { f: '1-3', img: '1-3b', t: 'Ruta alta de los drones', d: 'En la parte de las dos rutas, el saltador verde te sube por encima: más chips y menos láseres que por abajo.' },
  { f: '1-4', img: '1-4a', t: 'Vida oculta en la base de la torre', d: 'En el suelo de la base, entre la fila de chips y la caja del escudo, salta: hay un bloque invisible con una vida.' },
  { f: '1-4', img: '1-4b', t: 'Repisa del tercer engranaje', d: 'Encima del techo de cajas, el saltador de la derecha te lanza a una repisa pegada a la pared con el tercer engranaje.' },
  { f: '1-B', img: '1-Ba', t: 'Vida oculta bajo el 5G', d: 'Justo a la derecha de la plataforma del "5G" de chips, salta en el aire: un bloque invisible esconde una vida.' },
  { f: '1-B', img: '1-Bb', t: 'Isla del cielo', d: 'Al final, el saltador te lanza muy alto (con la gravedad lunar) a una isla escondida con el tercer engranaje y un arco de chips.' },
  { f: '1-J', img: '1-Ja', t: 'Vida antes del jefe', d: 'Junto al punto de control de antes de la arena, salta a la izquierda de la caja: un bloque invisible te da una vida para la pelea.' }
];
let admTab = 'TRUCOS', admLl = [], admSt = null;
function openAdmin() {
  closeConsole(); if (state === 'play' && !paused) togglePause();
  const a = $('adm'); a.classList.add('on'); admPaint();
}
function closeAdmin() { nfcStop(); $('adm').classList.remove('on'); }
async function admOp(op, d) {
  const r = await api(Object.assign({ a: 'adm', t: ADM, op }, d || {}));
  if (!r.ok) { if (r.error === 'ADMIN') { setAdm(null); closeAdmin(); infoPanel('SESIÓN CADUCADA', 'La sesión de administrador ha caducado. Vuelve a entrar con tu llave.'); } throw new Error(r.error || 'Error'); }
  return r;
}
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function admMsg(t, err) { const m = $('amsg'); if (m) { m.textContent = t; m.className = 'amsg' + (err ? ' err' : ''); } }
function admPaint() {
  const tabs = ['TRUCOS', 'CÓDIGOS', 'FASES', 'LLAVES', 'ESTADÍSTICAS', 'SISTEMA'];
  $('adm').innerHTML = '<div class="ahead"><h1>▌ PANEL SECRETO · TURBOLUCAS</h1><button class="btn" id="admX">SALIR</button></div><div class="atabs">' + tabs.map(t => '<button class="btn' + (t === admTab ? ' on' : '') + '" data-a="' + t + '">' + t + '</button>').join('') + '</div><div class="abody" id="abody"></div>';
  $('admX').onclick = closeAdmin;
  $('adm').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { admTab = b.dataset.a; tone(900, 900, 0.04, 'square', 0.05); admPaint(); });
  const B = $('abody');
  if (admTab === 'TRUCOS') {
    let h = '<div style="color:#8ea3e6">Solo tú ves esto. Secretos escondidos en cada fase:</div>', last = '';
    SECRETS.forEach(s2 => { const n = MAP.find(m => m.id === s2.f); if (s2.f !== last) { last = s2.f; h += '<h3>MUNDO 1 · ' + (n.boss ? 'JEFE' : n.bonus ? 'FASE SECRETA' : 'FASE ' + s2.f.slice(2)) + ' — ' + esc(n.name.replace(/^(JEFE|FASE SECRETA) · /, '')) + '</h3>'; }
      h += '<div class="trk"><img loading="lazy" src="img/trucos/' + s2.img + '.webp?v=' + VERSION + '" alt=""><div><span class="tg">' + s2.f + '</span><b>' + esc(s2.t) + '</b><br>' + esc(s2.d) + '</div></div>'; });
    B.innerHTML = h;
  } else if (admTab === 'CÓDIGOS') {
    B.innerHTML = '<div style="color:#8ea3e6">Se escriben en la consola (pausa · 10 toques rápidos sobre PAUSA). Aquí puedes activarlos directamente.</div>' + CODES.map(c => { const on = CHEAT[c[0].toLowerCase()]; return '<div class="akey"><b style="color:#ffd23c">' + c[0] + '</b> — ' + c[1] + '<br>' + esc(c[2]) + '<div class="arow"><button class="btn' + (on ? ' on' : '') + '" data-c="' + c[0] + '">' + (on ? 'ACTIVADO ✔' : 'ACTIVAR') + '</button></div></div>'; }).join('') + '<div class="akey"><b style="color:#ffd23c">HACK</b> — muestra la lista de códigos con la animación de hackeo.<br><b style="color:#ffd23c">ADMIN</b> — abre este panel (pide la llave NFC).</div>';
    B.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const k = b.dataset.c.toLowerCase(); CHEAT[k] = !CHEAT[k]; if (k === 'floor') CHEAT.floorT = 0; SFX.power(); admPaint(); });
  } else if (admTab === 'FASES') {
    B.innerHTML = '<h3>JUGAR DIRECTAMENTE</h3><div class="arow">' + MAP.map((n, i) => '<button class="btn" data-f="' + i + '">' + (n.boss ? 'JEFE' : n.bonus ? 'SECRETA' : n.id) + '</button>').join('') + '</div>' +
      '<h3>PROGRESO EN ESTE DISPOSITIVO</h3><div class="arow"><button class="btn" id="aOpen">ABRIR TODAS LAS FASES</button><button class="btn red" id="aReset">BORRAR MI PROGRESO</button></div><div class="amsg" id="amsg"></div>';
    B.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { closeAdmin(); curId = MAP[+b.dataset.f].id; mapSel = +b.dataset.f; startGame(); });
    $('aOpen').onclick = () => { MAP.forEach(n => DEV[n.id] = 1); try { localStorage.setItem('tl_dev', JSON.stringify(DEV)); } catch (e) {} admMsg('✔ Todas las fases abiertas en este dispositivo'); SFX.life(); };
    $('aReset').onclick = () => { if ($('aReset').dataset.ok !== '1') { $('aReset').dataset.ok = '1'; $('aReset').textContent = '¿SEGURO? PULSA OTRA VEZ'; return; } PROG = {}; DEV = {}; saveProg(); try { localStorage.setItem('tl_dev', '{}'); } catch (e) {} admMsg('Progreso borrado'); $('aReset').textContent = 'BORRAR MI PROGRESO'; $('aReset').dataset.ok = ''; };
  } else if (admTab === 'LLAVES') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando llaves…</div><div id="akeys"></div><h3>AÑADIR LLAVE</h3><div class="akey">' + (HAY_NFC ? '<div class="arow"><button class="btn on" id="aScan">ESCANEAR LLAVE NUEVA</button></div>' : '<div style="color:#8ea3e6">Para escanear una llave abre este panel desde un móvil Android. Aquí puedes escribir su código a mano:</div>') +
      '<div class="arow"><input class="ain" id="anN" placeholder="Nombre" maxlength="30" style="width:140px"><input class="ain" id="anK" placeholder="Código de la llave (hex)" maxlength="40" style="flex:1;min-width:160px"><button class="btn" id="anAdd">GUARDAR</button></div></div>';
    const paintKeys = () => { $('akeys').innerHTML = admLl.map((k, i) => '<div class="akey"><div class="arow"><input class="ain" data-n="' + i + '" value="' + esc(k.n) + '" maxlength="30" style="width:150px"><input class="ain" data-k="' + i + '" value="' + esc(k.k) + '" maxlength="40" style="flex:1;min-width:170px;letter-spacing:.08em"></div><div class="arow"><span style="color:#8ea3e6;flex:1">Guardada el ' + new Date(k.f).toLocaleString('es-ES') + '</span><button class="btn" data-s="' + i + '">GUARDAR CAMBIOS</button><button class="btn red" data-d="' + i + '">BORRAR</button></div></div>').join('');
      $('akeys').querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { const i = +b.dataset.s; try { const r = await admOp('llaveEdit', { k: admLl[i].k, nk: $('akeys').querySelector('[data-k="' + i + '"]').value, n: $('akeys').querySelector('[data-n="' + i + '"]').value }); admLl = r.llaves; paintKeys(); admMsg('✔ Llave actualizada'); } catch (e) { admMsg(e.message, 1); } });
      $('akeys').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { const i = +b.dataset.d; if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿SEGURO?'; return; } try { const r = await admOp('llaveDel', { k: admLl[i].k }); admLl = r.llaves; paintKeys(); admMsg('Llave borrada'); } catch (e) { admMsg(e.message, 1); } }); };
    admOp('llaves').then(r => { admLl = r.llaves; paintKeys(); admMsg(admLl.length + ' llave(s) con acceso de administrador'); }).catch(e => admMsg(e.message, 1));
    $('anAdd').onclick = async () => { try { const r = await admOp('llaveAdd', { k: $('anK').value, n: $('anN').value || 'Llave' }); admLl = r.llaves; paintKeys(); $('anK').value = ''; $('anN').value = ''; admMsg('✔ Llave añadida'); SFX.life(); } catch (e) { admMsg(e.message, 1); } };
    if (HAY_NFC) $('aScan').onclick = () => { admMsg('📡 Acerca la llave nueva a la parte de atrás del móvil…'); nfcRead(async k => { $('anK').value = k; admMsg('Llave leída: ' + k + '. Ponle un nombre y pulsa GUARDAR.'); }, t => admMsg(t, 1)); };
  } else if (admTab === 'ESTADÍSTICAS') {
    B.innerHTML = '<div class="amsg" id="amsg">Cargando…</div><div id="ast"></div>';
    admOp('stats').then(r => { const s2 = r.stats || {}, t = s2.tot || { visitas: 0, partidas: 0, superadas: 0 }, dias = s2.dias || {}, jug = s2.jug || {}, win = s2.win || {};
      const bars = (o, lab) => { const e = Object.entries(o), mx = Math.max(1, ...e.map(x => x[1])); return '<div class="bars">' + (e.length ? e.map(([k, v]) => '<div class="bar"><span>' + esc(lab ? lab(k) : k) + '</span><i style="width:' + (v / mx * 100) + '%"></i><b>' + v + '</b></div>').join('') : '<div style="color:#8ea3e6">Aún no hay datos</div>') + '</div>'; };
      const last = Object.keys(dias).sort().slice(-14), dd = {}; last.forEach(k => dd[k] = dias[k]);
      const fases = {}; MAP.forEach(n => { if (jug[n.id] || win[n.id]) fases[n.id] = jug[n.id] || 0; });
      $('ast').innerHTML = '<div class="arow"><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.visitas + '</b><br>visitas</div><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.partidas + '</b><br>partidas</div><div class="akey" style="flex:1"><b style="color:#35ff8a;font-size:1.6em">' + t.superadas + '</b><br>fases superadas</div></div>' +
        '<h3>JUGADORES POR DÍA (14 DÍAS)</h3>' + bars(dd, k => k.slice(8) + '/' + k.slice(5, 7)) + '<h3>PARTIDAS POR FASE</h3>' + bars(fases) + '<h3>% DE ÉXITO POR FASE</h3><div class="bars">' + MAP.filter(n => jug[n.id]).map(n => { const pc = Math.round((win[n.id] || 0) / jug[n.id] * 100); return '<div class="bar"><span>' + n.id + '</span><i style="width:' + pc + '%"></i><b>' + pc + '%</b></div>'; }).join('') + '</div>' +
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
  if (ADM) { say('SESIÓN DE ADMINISTRADOR ACTIVA', 'g', 18); setTimeout(openAdmin, 700); return; }
  say('*** ACCESO RESTRINGIDO ***', 'r big', 24); say('IDENTIFICACIÓN POR LLAVE REQUERIDA', 'w', 14);
  const ok = r => { clearInterval(admQrT); setAdm(r.adm); say(r.nueva ? 'LLAVE MAESTRA REGISTRADA ✔' : 'LLAVE RECONOCIDA ✔', 'g big', 22); say('ACCESO CONCEDIDO. ABRIENDO PANEL…', 'g', 14); SFX.win(); setTimeout(() => { if (CON.on) openAdmin(); }, 2200); };
  if (HAY_NFC) {
    CON.q.push({ txt: '', cls: '', fast: true });
    setTimeout(() => { const box = document.createElement('div'); box.innerHTML = NFC_HTML + '<div id="cnfc" class="y">ACERCA TU LLAVE A LA PARTE DE ATRÁS DEL MÓVIL…</div>'; conOut.appendChild(box); conScroll(); }, 900);
    nfcRead(async k => { $('cnfc') && ($('cnfc').textContent = 'LEYENDO LLAVE ' + k.replace(/(..)/g, '$1 ').trim() + ' …'); const r = await api({ a: 'llave', k }); if (!r.ok) throw new Error(r.error); ok(r); },
      t => { const c = $('cnfc'); if (c) { c.textContent = '✖ ' + t.toUpperCase(); c.className = 'r'; } tone(140, 90, 0.3, 'square', 0.08); });
  } else {
    say('ESTE DISPOSITIVO NO LEE NFC. ESCANEA EL CÓDIGO CON TU MÓVIL ANDROID Y ACERCA LA LLAVE:', 'y', 10);
    api({ a: 'qr' }).then(r => { if (!r.ok) { say('ERROR: ' + r.error, 'r', 10); return; }
      const url = location.origin + location.pathname + '?admq=' + r.q, box = document.createElement('div'); box.className = 'conqr';
      try { const q = qrcode(0, 'M'); q.addData(url); q.make(); box.innerHTML = '<img src="' + q.createDataURL(5, 0) + '" width="190" height="190" style="image-rendering:pixelated;display:block" alt="QR">'; } catch (e) { box.textContent = url; }
      setTimeout(() => { conOut.appendChild(box); conScroll(); }, 1200);
      clearInterval(admQrT); admQrT = setInterval(async () => { if (!CON.on) return clearInterval(admQrT); const s2 = await api({ a: 'qrEst', q: r.q }); if (s2.estado === 'ok') ok(s2); else if (s2.estado === 'caducado') { clearInterval(admQrT); say('EL CÓDIGO HA CADUCADO. ESCRIBE ADMIN OTRA VEZ.', 'r', 10); } }, 2000);
    });
  }
}
// el móvil que escanea el QR autoriza al otro dispositivo con la llave
(() => {
  const q = new URLSearchParams(location.search).get('admq'); if (!q) return;
  history.replaceState(null, '', location.pathname);
  const a = $('adm'); a.classList.add('on');
  a.innerHTML = '<div class="abody" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"><h3 style="font-size:1.4em">AUTORIZAR ACCESO</h3>' + NFC_HTML + '<div class="amsg" id="amsg">' + (HAY_NFC ? 'Pulsa el botón y acerca tu llave a la parte de atrás del móvil' : 'Este móvil no lee NFC. Usa un Android con Chrome.') + '</div>' +
    (HAY_NFC ? '<div class="arow"><button class="btn on" id="qScan">ACTIVAR LECTOR</button></div>' : '') + '<div class="arow"><button class="btn" id="qX">CERRAR</button></div></div>';
  $('qX').onclick = closeAdmin;
  if (HAY_NFC) $('qScan').onclick = () => { admMsg('📡 Esperando la llave…'); nfcRead(async k => { const r = await api({ a: 'qrOk', q, k }); if (!r.ok) throw new Error(r.error); admMsg('✔ Acceso autorizado. Ya puedes cerrar esto.'); SFX && SFX.win(); }, t => admMsg(t, 1)); };
})();

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
  try { if (state === 'map') sessionStorage.setItem('tl_back', JSON.stringify({ sel: mapSel, unl: mapUnl ? mapUnl.i : -1 })); } catch (e) {}
  location.replace(location.pathname + '?u=' + encodeURIComponent(updPending));
}
setInterval(updCheck, 60000); setTimeout(updCheck, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updCheck(); });

/* ---------- arranque ---------- */
setSnd(sndOn); resize();
L = buildLevel(); P = newPlayer(L.spawn.x, L.spawn.y); spawnEnemies(); cam.y = L.H * T - VHv;
requestAnimationFrame(frame);
loadImages(() => {
  state = 'title';
  let back = null; try { back = JSON.parse(sessionStorage.getItem('tl_back') || 'null'); sessionStorage.removeItem('tl_back'); } catch (e) {}
  if (back && MAP[back.sel]) { mapSel = back.unl >= 0 ? back.unl : back.sel; openMap(); }      // tras actualizarse vuelve al mapa, no a la portada
});
window.__TL = { noEnemies() { enemies = []; }, get P() { return P; }, get G() { return G; }, get state() { return state; }, get L() { return L; }, K, press, MAP, die, get DEV() { return DEV; }, set cur(v) { curId = v; }, start() { startGame(); }, get time() { return time; }, get PROG() { return PROG; } };
})();
