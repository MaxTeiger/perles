'use strict';

// ---------- Données ----------
const PALETTE = {
  '.': '#bfe3f7', R: '#e5484d', D: '#a8323a', W: '#fafafa', K: '#3a3a44', C: '#f1dcb0',
  G: '#4caf50', O: '#f39c32', P: '#f48fb1', B: '#2f6db5', L: '#8ec9f0', N: '#1d2547', Y: '#ffd23f',
};

const ART = [
  { name: 'Cœur', rows: [
    '............',
    '..RR....RR..',
    '.RRRR..RRRR.',
    'RRWWRRRRRRRR',
    'RWWRRRRRRRRR',
    'RRRRRRRRRRRR',
    '.RRRRRRRRRD.',
    '..RRRRRRRD..',
    '...RRRRRD...',
    '....RRDD....',
    '.....DD.....',
    '............',
  ] },
  { name: 'Champignon', rows: [
    '................',
    '......KKKK......',
    '....KKRRRRKK....',
    '...KRRWWRRRRK...',
    '..KRRWWWWRRRRK..',
    '.KRRRWWWWRRWWRK.',
    '.KRRRRWWRRWWWWK.',
    'KRWWRRRRRRWWWWRK',
    'KRWWWRRRRRRWWRRK',
    'KRRWRRRRRRRRRRRK',
    '.KKKKKKKKKKKKKK.',
    '....KCCCCCCK....',
    '....KCKCCKCK....',
    '....KCCCCCCK....',
    '.....KKKKKK.....',
    'GGGGGGGGGGGGGGGG',
  ] },
  { name: 'Chat', rows: [
    '................',
    '..KK........KK..',
    '..KOK......KOK..',
    '..KOOK....KOOK..',
    '..KOOOKKKKOOOK..',
    '.KOOOOOOOOOOOOK.',
    '.KOOOOOOOOOOOOK.',
    '.KOOGKOOOOGKOOK.',
    '.KOOGKOOOOGKOOK.',
    '.KOOOOOOOOOOOOK.',
    '.KWWOOOPPOOOWWK.',
    '.KWWWOOKKOOWWWK.',
    '..KWWWWWWWWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....',
    '................',
  ] },
  { name: 'Poisson', rows: [
    'BBBBBBBBBBBBBBBB',
    'BBBLBBBBBBBBBBBB',
    'BBBBBBBBBBBLBBBB',
    'BBBBBBOOOOBBBBBB',
    'BBBBBOOOOOOOBBBB',
    'BBBBOOOOOOOOOBBO',
    'BBBOOWKOOOOOOOOO',
    'BBOOOKKOOWOOOOOO',
    'BBOOOOOOOWOOOOOO',
    'BBBOOOOOOOOOOOOO',
    'BBBBOOOOOOOOOBBO',
    'BBBBBOOOOOOOBBBB',
    'BBBBBBOOOOBBBBBB',
    'BLBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBGBBB',
    'GGBBBBBBBBBGGGBB',
  ] },
  { name: 'Fusée', rows: [
    'NNNNNNNWWNNNNYNN',
    'NYNNNNWRRWNNNNNN',
    'NNNNNWRRRRWNNNNN',
    'NNNNNWWWWWWNNNYN',
    'NNNNNWWBBWWNNNNN',
    'NNYNNWBBBBWNNNNN',
    'NNNNNWWBBWWNNNNN',
    'NNNNNWWWWWWNNYNN',
    'NNNNNWWWWWWNNNNN',
    'NNNNRWWWWWWRNNNN',
    'NNNRRWWWWWWRRNNN',
    'NNNRRWWRRWWRRNNN',
    'NNNRNNOYYONNRNNN',
    'NNNNNNOYYONNNNNN',
    'NNYNNNNOONNNNNYN',
    'NNNNNNNNNNNNNNNN',
  ] },
];

function parseArt({ name, rows }) {
  const w = Math.max(...rows.map(r => r.length));
  const chars = [];
  const cells = [];
  for (const row of rows) {
    for (let x = 0; x < w; x++) {
      const ch = PALETTE[row[x]] ? row[x] : '.';
      let i = chars.indexOf(ch);
      if (i < 0) { i = chars.length; chars.push(ch); }
      cells.push(i);
    }
  }
  return { name, w, h: rows.length, cells, colors: chars.map(c => PALETTE[c]) };
}

const LEVELS = ART.map(parseArt);
const CAP = 9;
const SAVE_KEY = 'perles.done';
const done = new Set(JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'));

// ---------- Couleurs ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(h, k) { // k < 0 : plus sombre, k > 0 : plus clair
  const [r, g, b] = hexToRgb(h);
  const f = v => k < 0 ? v * (1 + k) : v + (255 - v) * k;
  return rgbToHex(f(r), f(g), f(b));
}
function luma(h) { const [r, g, b] = hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

// ---------- État ----------
const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
let S = null; // état de la partie

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function makeLots(level, mix) {
  const counts = level.colors.map(() => 0);
  level.cells.forEach(c => counts[c]++);
  const lots = [];
  counts.forEach((n, c) => {
    const beads = Math.ceil(n / CAP) * CAP;
    for (let i = 0; i < beads; i += 3) lots.push([c, c, c]);
  });
  shuffle(lots);
  // Mélange : échange des perles entre lots pour qu'ils ne soient pas tous unis
  for (let i = 0; i < lots.length; i++) {
    if (Math.random() < mix) {
      const j = Math.random() * lots.length | 0, a = Math.random() * 3 | 0, b = Math.random() * 3 | 0;
      [lots[i][a], lots[j][b]] = [lots[j][b], lots[i][a]];
    }
  }
  return lots;
}

function startLevel(level, idx) {
  const nColors = level.colors.length;
  const nTrays = Math.min(7, Math.max(4, nColors)); // réglé par simulation : ~65 % de victoires pour un bot simple
  const queue = makeLots(level, idx == null ? 0.55 : Math.min(0.6, 0.3 + 0.08 * idx));
  // Ordre de remplissage : de bas en haut, comme une image qui se construit
  const order = level.colors.map(() => []);
  for (let i = level.cells.length - 1; i >= 0; i--) order[level.cells[i]].push(i);
  S = {
    level, idx, order,
    filled: new Uint8Array(level.cells.length),
    fillAt: new Float64Array(level.cells.length),
    nFilled: 0,
    trays: Array.from({ length: nTrays }, () => []),
    lots: [queue.shift() || null, queue.shift() || null, queue.shift() || null],
    queue, extraUsed: false, busy: false, over: false,
  };
  shades = level.colors.map(c => ({
    bg: luma(c) > 0.8 ? shade(c, -0.16) : c,
    dark: shade(c, -0.32),
    hi: shade(c, 0.45),
  }));
  $('title').textContent = level.name;
  resize();
  render();
}

// ---------- Placement ----------
// Simule la pose d'un lot : chaque perle va sur un plateau de sa couleur non plein, sinon sur un plateau vide.
function simulate(lot) {
  const t = S.trays.map(a => a.slice());
  const moves = [];
  for (const c of lot) {
    let k = t.findIndex(a => a.length > 0 && a.length < CAP && a[0] === c);
    if (k < 0) k = t.findIndex(a => a.length === 0);
    if (k < 0) return null;
    t[k].push(c);
    moves.push({ tray: k, slot: t[k].length - 1, color: c });
  }
  return { trays: t, moves };
}

function play(i) {
  if (S.busy || S.over || !S.lots[i]) return;
  const sim = simulate(S.lots[i]);
  const lotEl = $('lots').children[i];
  if (!sim) { lotEl.classList.remove('shake'); void lotEl.offsetWidth; lotEl.classList.add('shake'); return; }
  S.busy = true;
  const from = [...lotEl.children].map(e => e.getBoundingClientRect());
  // Les perles arrivent dans des emplacements encore vides : on affiche l'état final en masquant les arrivées
  S.trays = sim.trays;
  S.lots[i] = S.queue.shift() || null;
  render(sim.moves);
  const flights = sim.moves.map((m, j) => {
    const slotEl = $('trays').children[m.tray].children[m.slot];
    return fly(from[j], slotEl.getBoundingClientRect(), S.level.colors[m.color], j * 60, 280)
      .then(() => slotEl.classList.remove('hidden'));
  });
  Promise.all(flights).then(resolveFull);
}

function resolveFull() {
  const full = S.trays.map((a, k) => a.length === CAP ? k : -1).filter(k => k >= 0);
  if (!full.length) { S.busy = false; afterMove(); return; }
  const rect = canvas.getBoundingClientRect();
  const cs = rect.width / S.level.w;
  const now = performance.now();
  const flights = [];
  for (const k of full) {
    const c = S.trays[k][0];
    const slots = [...$('trays').children[k].children].map(e => e.getBoundingClientRect());
    let last = -1;
    slots.forEach((r, j) => {
      const idx = S.order[c].find(p => !S.filled[p]);
      const target = idx ?? last;
      const delay = j * 45, dur = 420;
      if (idx != null) {
        S.filled[idx] = 1; S.fillAt[idx] = now + delay + dur; S.nFilled++; last = idx;
      }
      if (target < 0) return;
      const x = rect.left + (target % S.level.w) * cs, y = rect.top + Math.floor(target / S.level.w) * cs;
      flights.push(fly(r, { left: x, top: y, width: cs, height: cs }, S.level.colors[c], delay, dur));
    });
    S.trays[k] = [];
  }
  render();
  Promise.all(flights).then(() => { S.busy = false; updateProgress(); afterMove(); });
}

function afterMove() {
  render();
  if (S.nFilled === S.level.cells.length) {
    S.over = true;
    if (S.idx != null) { done.add(S.idx); localStorage.setItem(SAVE_KEY, JSON.stringify([...done])); }
    const next = S.idx != null && S.idx + 1 < LEVELS.length ? S.idx + 1 : null;
    setTimeout(() => message('Bravo ! 🎉', `« ${S.level.name} » est terminé.`, [
      next != null ? ['Niveau suivant', () => startLevel(LEVELS[next], next), true] : ['Choisir un niveau', openMenu, true],
      ['Rejouer', restart],
    ]), 500);
    return;
  }
  const playable = S.lots.some(l => l && simulate(l));
  if (!playable) {
    S.over = true;
    const btns = [];
    if (!S.extraUsed) btns.push(['+1 plateau', () => { S.extraUsed = true; S.trays.push([]); S.over = false; render(); }, true]);
    btns.push(['Recommencer', restart, S.extraUsed]);
    message('Bloqué !', 'Aucun lot ne rentre dans les plateaux.', btns);
  }
}

function restart() { startLevel(S.level, S.idx); }

// ---------- Animation des perles ----------
function fly(a, b, color, delay, dur) {
  const g = document.createElement('div');
  g.className = 'ghost bead';
  g.style.setProperty('--c', color);
  g.style.width = a.width + 'px'; g.style.height = a.height + 'px';
  document.body.appendChild(g);
  const s = b.width / a.width;
  const midX = (a.left + b.left) / 2, midY = Math.min(a.top, b.top) - 40;
  const anim = g.animate([
    { transform: `translate(${a.left}px, ${a.top}px) scale(1)` },
    { transform: `translate(${midX}px, ${midY}px) scale(${(1 + s) / 2 * 1.15})`, offset: 0.5 },
    { transform: `translate(${b.left}px, ${b.top}px) scale(${s})` },
  ], { duration: dur, delay, easing: 'ease-in-out', fill: 'both' });
  g.style.transformOrigin = '0 0';
  return anim.finished.then(() => g.remove(), () => g.remove());
}

// ---------- Rendu ----------
let shades = [];

function render(arriving = []) {
  // Lots
  const lotsEl = $('lots');
  lotsEl.innerHTML = '';
  S.lots.forEach((lot, i) => {
    const d = document.createElement('div');
    d.className = 'lot' + (!lot ? ' empty' : (!S.busy && !simulate(lot) ? ' off' : ''));
    (lot || []).forEach(c => d.appendChild(beadEl(c)));
    d.onclick = () => play(i);
    lotsEl.appendChild(d);
  });
  const left = document.createElement('div');
  left.id = 'left';
  left.textContent = S.queue.length ? `+${S.queue.length}\nlots` : '';
  left.style.whiteSpace = 'pre-line';
  lotsEl.appendChild(left);
  // Plateaux
  const traysEl = $('trays');
  traysEl.innerHTML = '';
  traysEl.style.gridTemplateColumns = `repeat(${S.trays.length}, minmax(0, 1fr))`;
  S.trays.forEach((t, k) => {
    const d = document.createElement('div');
    d.className = 'tray' + (S.extraUsed && k === S.trays.length - 1 ? ' extra' : '');
    for (let j = 0; j < CAP; j++) {
      const s = document.createElement('div');
      s.className = 'slot';
      if (j < t.length) {
        s.classList.add('bead');
        s.style.setProperty('--c', S.level.colors[t[j]]);
        if (arriving.some(m => m.tray === k && m.slot === j)) s.classList.add('hidden');
      }
      d.appendChild(s);
    }
    traysEl.appendChild(d);
  });
  updateProgress();
}

function beadEl(c) {
  const b = document.createElement('div');
  b.className = 'bead';
  b.style.setProperty('--c', S.level.colors[c]);
  return b;
}

function updateProgress() {
  const now = performance.now();
  let n = 0;
  for (let i = 0; i < S.filled.length; i++) if (S.filled[i] && S.fillAt[i] <= now) n++;
  const p = Math.floor(100 * n / S.filled.length);
  $('bar').style.width = p + '%';
  $('pct').textContent = p + '%';
}

function resize() {
  if (!S) return;
  const w = canvas.clientWidth || 460;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.height = (w * S.level.h / S.level.w) + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * S.level.h / S.level.w * dpr);
}
addEventListener('resize', resize);

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function draw(now) {
  requestAnimationFrame(draw);
  if (!S) return;
  const L = S.level, cs = canvas.width / L.w;
  let popping = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < L.cells.length; i++) {
    const c = L.cells[i], x = (i % L.w) * cs, y = Math.floor(i / L.w) * cs;
    const on = S.filled[i] && now >= S.fillAt[i];
    const sh = shades[c];
    ctx.fillStyle = on ? sh.dark : sh.bg;
    ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
    let pad = cs * 0.12;
    if (on) {
      const t = (now - S.fillAt[i]) / 260;
      if (t < 1) { pad -= cs * 0.14 * Math.sin(t * Math.PI); popping = true; }
    }
    const s = cs - 2 * pad;
    rr(ctx, x + pad, y + pad, s, s, s * 0.3);
    ctx.fillStyle = on ? L.colors[c] : '#f3ead3';
    ctx.fill();
    if (on) {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(x + pad + s * 0.15, y + pad + s * 0.82, s * 0.7, s * 0.1);
      ctx.fillStyle = sh.hi;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
    }
    ctx.beginPath();
    ctx.arc(x + pad + s * 0.33, y + pad + s * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (popping) updateProgress();
}
requestAnimationFrame(draw);

// ---------- Menus ----------
function message(title, text, buttons) {
  $('msgTitle').textContent = title;
  $('msgText').textContent = text;
  const box = $('msgBtns');
  box.innerHTML = '';
  for (const [label, fn, main] of buttons) {
    const b = document.createElement('button');
    b.className = 'btn' + (main ? ' main' : '');
    b.textContent = label;
    b.onclick = () => { $('msg').close(); fn(); };
    box.appendChild(b);
  }
  $('msg').showModal();
}

function thumb(level) {
  const c = document.createElement('canvas');
  c.width = level.w; c.height = level.h;
  const x = c.getContext('2d');
  level.cells.forEach((v, i) => { x.fillStyle = level.colors[v]; x.fillRect(i % level.w, Math.floor(i / level.w), 1, 1); });
  return c;
}

function openMenu() {
  const list = $('levelList');
  list.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.className = 'lvl' + (done.has(i) ? ' done' : '');
    b.appendChild(thumb(lv));
    b.append(`${i + 1}. ${lv.name}`);
    b.onclick = () => { $('menu').close(); startLevel(lv, i); };
    list.appendChild(b);
  });
  $('menu').showModal();
}

$('menuBtn').onclick = openMenu;
$('closeMenu').onclick = () => $('menu').close();
$('restartBtn').onclick = () => { if (!S.busy) restart(); };

// ---------- Photo perso : réduite et ramenée à 7 couleurs (k-means) ----------
$('photo').onchange = e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(img.src);
    const MAX = 24;
    const k = Math.min(MAX / img.width, MAX / img.height);
    const w = Math.max(6, Math.round(img.width * k)), h = Math.max(6, Math.round(img.height * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    const data = x.getImageData(0, 0, w, h).data;
    const px = [];
    for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
    const { centers, labels } = kmeans(px, 7);
    // Retire les couleurs inutilisées
    const used = [...new Set(labels)];
    const level = {
      name: 'Ta photo', w, h,
      cells: labels.map(l => used.indexOf(l)),
      colors: used.map(u => rgbToHex(...centers[u])),
    };
    $('menu').close();
    startLevel(level, null);
  };
  img.src = URL.createObjectURL(file);
};

function kmeans(px, k) {
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  // Initialisation k-means++ (déterministe : on prend le point le plus éloigné)
  const centers = [px[px.length >> 1].slice()];
  while (centers.length < k) {
    let best = 0, bi = 0;
    px.forEach((p, i) => { const d = Math.min(...centers.map(c => d2(p, c))); if (d > best) { best = d; bi = i; } });
    if (best === 0) break;
    centers.push(px[bi].slice());
  }
  let labels = [];
  for (let it = 0; it < 12; it++) {
    labels = px.map(p => { let b = 0, bd = Infinity; centers.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); return b; });
    const sum = centers.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => { const s = sum[labels[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    sum.forEach((s, j) => { if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return { centers, labels };
}

// ---------- Démarrage ----------
const first = LEVELS.findIndex((_, i) => !done.has(i));
startLevel(LEVELS[first < 0 ? 0 : first], first < 0 ? 0 : first);
