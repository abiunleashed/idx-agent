// ---- Keep Gathering: all sizes in px of a 1080x1920 frame, scaled by s = S.W / 1080 ----
const RW = 1080, RH = 1920;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k, al = 1) => { const A = rgbOf(a), B = rgbOf(b); const c = A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))); return `rgba(${c[0]},${c[1]},${c[2]},${al})`; };
const heatColor = (h, al = 1) => h < 0.35 ? mixc('#EFEDE8', '#FFC061', h / 0.35, al) : h < 0.7 ? mixc('#FFC061', '#FF6A2A', (h - 0.35) / 0.35, al) : mixc('#FF6A2A', '#2A0F05', (h - 0.7) / 0.3, al);

// the stack: the middle line, set as rows of logs, read top to bottom
const ROWS = [
  { str: 'the years', y: 990, size: 104, land: () => CUES.row1 },
  { str: 'you spent', y: 1100, size: 104, land: () => CUES.row2 },
  { str: 'gathering', y: 1225, size: 132, land: () => CUES.row3 },
  { str: 'the wood.', y: 1340, size: 104, land: () => CUES.row4 },
];
const TOUCH = { x: 540, y: 905 };              // where the ember meets the top of the stack
const LAST = { str: 'Keep gathering.', y: 930, size: 112 };

function font(g, role, px) { setType(g, TYPE, role, px, { short: 1080, weight: role === 'display' ? 400 : 500 }); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; }
// points on the letters' own ink, sampled once from an offscreen copy (fire is born there; sparks gather there)
function inkPoints(lines, stepPx) {
  const c = document.createElement('canvas'); c.width = RW; c.height = RH;
  const x = c.getContext('2d'); x.fillStyle = '#fff';
  for (const L of lines) { font(x, 'display', L.size); x.fillText(L.str, 540, L.y); }
  const d = x.getImageData(0, 0, RW, RH).data, pts = [];
  for (let y = 0; y < RH; y += stepPx) for (let xx = 0; xx < RW; xx += stepPx) if (d[(y * RW + xx) * 4 + 3] > 140) pts.push([xx, y]);
  return pts;
}
const STACK_PTS = lazy(() => inkPoints(ROWS, 4));
const LAST_PTS = lazy(() => { const p = inkPoints([LAST], 5), r = rng(41); return p.filter(() => r() < 0.55); });
const igniteAt = (x, y) => CUES.touch + Math.hypot(x - TOUCH.x, (y - TOUCH.y) * 1.4) / 950;   // flame spreads from the touch

function emberPos(t) {                         // rises fast from below (the hook), hovers on noise, sinks to the stack
  const rise = EASE.out(clamp(t / 0.95));
  let x = 540 + 70 * (noise1(t * 0.45 + 3) - 0.5) * smooth(0.6, 2, t), y = lerp(1780, 620, rise) + 40 * (noise1(t * 0.38 + 9) - 0.5) * smooth(0.8, 2, t);
  const sink = EASE.inOut(clamp((t - CUES.descend) / (CUES.touch - CUES.descend)));
  return [lerp(x, TOUCH.x, sink), lerp(y, TOUCH.y, sink)];
}
function ember(g, t, a = 1) {
  if (a <= 0) return;
  const fl = 0.8 + 0.35 * noise1(t * 9) + 0.15 * noise1(t * 23 + 4), [x, y] = emberPos(t);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 10; i++) { const [px, py] = emberPos(t - i * 0.022); g.globalAlpha = a * 0.22 * (1 - i / 11); dot(g, S, px, py, 5 - i * 0.3, '#FF8A3A', 1); }   // a short trail
  const halo = g.createRadialGradient(x, y, 0, x, y, 120 * fl);
  halo.addColorStop(0, `rgba(255,170,90,${0.55 * a})`); halo.addColorStop(0.25, `rgba(255,106,42,${0.25 * a})`); halo.addColorStop(1, 'rgba(255,106,42,0)');
  g.globalAlpha = 1; g.fillStyle = halo; g.fillRect(x - 130, y - 130, 260, 260);
  dot(g, S, x, y, 8 * fl, '#FFE9C8', a); dot(g, S, x, y, 4, '#FFFFFF', a);
  for (let i = 0; i < 7; i++) {                // tiny sparks spitting off it
    const h = hash1(i * 7 + 1), age = (t * (0.9 + h) + h * 5) % 1;
    g.globalAlpha = a * (1 - age) * 0.8; dot(g, S, x + (h - 0.5) * 60 * age + 14 * Math.sin(age * 7 + i), y - 90 * age * (0.5 + h), 1.8, '#FFC061', 1);
  }
  g.restore();
}
function words(g, str, x, y, size, color, p, a = 1) {
  if (a <= 0 || p <= 0) return;
  g.save(); g.globalAlpha = a; g.fillStyle = color; font(g, 'display', size);
  typeReveal(g, str, x, y, p, { by: 'char', spread: 0.55, ease: EASE.out }); g.restore();
}
function stack(g, t) {                         // the rows drop in like logs, then heat, char and burn away
  ROWS.forEach((R, i) => {
    const k = MOTION.at(t, R.land() - 0.45, 0.45), drop = (1 - k) * -160;
    if (k <= 0) return;
    const land = t - R.land(), bounce = land > 0 ? 9 * Math.exp(-land * 9) * Math.sin(land * 34) : 0;
    const rowIgnite = igniteAt(540, R.y - R.size * 0.3), h = clamp((t - rowIgnite) / 1.1);
    const gone = 1 - smooth(12.9 + i * 0.12, 13.7 + i * 0.12, t);
    const y = R.y + drop * EASE.in(1 - k) + bounce;
    g.save(); g.globalAlpha = EASE.out(k) * gone;
    if (h > 0) { g.shadowColor = 'rgba(255,106,42,0.9)'; g.shadowBlur = 30 * Math.sin(Math.PI * Math.min(1, h * 1.3)); }
    g.fillStyle = heatColor(h); font(g, 'display', R.size); g.fillText(R.str, 540, y);
    g.restore();
    // the grain under each log: a thin tapered line, as wide as the word
    g.save(); font(g, 'display', R.size); const w = g.measureText(R.str).width; g.restore();
    g.save(); g.globalAlpha = 0.35 * EASE.out(k) * gone; g.strokeStyle = heatColor(h * 0.9); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(540 - w / 2 * EASE.out(k), y + 24); g.quadraticCurveTo(540, y + 30, 540 + w / 2 * EASE.out(k), y + 24); g.stroke(); g.restore();
  });
}
function fire(g, t) {                          // flames born from the letters' own ink, rising on heat
  if (t < CUES.touch) return;
  const P = STACK_PTS(), r0 = rng(5), intensity = smooth(CUES.touch, CUES.touch + 0.6, t) * (1 - smooth(13.2, 14.6, t));
  // the light the fire throws on the dark
  const glow = g.createRadialGradient(540, 1160, 40, 540, 1160, 900);
  glow.addColorStop(0, `rgba(255,120,40,${0.42 * intensity})`); glow.addColorStop(0.45, `rgba(184,50,15,${0.18 * intensity})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, RW, RH);
  g.save(); g.globalCompositeOperation = 'lighter';
  const N = 1700;
  for (let i = 0; i < N; i++) {
    const src = P[Math.floor(r0() * P.length)], ig = igniteAt(src[0], src[1]);
    const life = 0.55 + 0.75 * r0(), birth = ig + r0() * (13.4 - ig), age = (t - birth) / life, sway = r0() * TAU, up = 110 + 190 * r0();
    if (age < 0 || age > 1) continue;
    const x = src[0] + 26 * Math.sin(sway + age * 5) * age + (noise1(i * 0.3 + t * 2) - 0.5) * 30 * age;
    const y = src[1] - up * age - 90 * age * age;
    const col = age < 0.15 ? '#FFF2D0' : age < 0.4 ? '#FFC061' : age < 0.7 ? '#FF6A2A' : '#B8320F';
    g.globalAlpha = (1 - age) * (age < 0.08 ? age / 0.08 : 1) * 0.55;
    dot(g, S, x, y, 3 + 11 * (1 - age) * (0.6 + 0.4 * r0()), col, 1);
  }
  for (let i = 0; i < 180; i++) {              // sparks: small, bright, long-lived, flying high
    const src = P[Math.floor(r0() * P.length)], birth = igniteAt(src[0], src[1]) + r0() * 3.0, life = 1.4 + r0() * 1.2, age = (t - birth) / life;
    const vx = (r0() - 0.5) * 220, vy = 380 + 360 * r0();
    if (age < 0 || age > 1) continue;
    const tt = age * life, x = src[0] + vx * tt + 30 * Math.sin(tt * 4 + i), y = src[1] - vy * tt + 60 * tt * tt;
    g.globalAlpha = (1 - age) * 0.95; dot(g, S, x, y, 2.2 * (1 - age) + 0.8, age < 0.5 ? '#FFE2B0' : '#FF8A3A', 1);
  }
  g.restore();
  // heat shimmer: the air above the fire bends a little (a soft orange veil that breathes)
  g.save(); g.globalAlpha = 0.12 * intensity; g.fillStyle = '#FF9A4A';
  for (let i = 0; i < 6; i++) { const yy = 700 + i * 50 + 20 * Math.sin(t * 3 + i); g.fillRect(200 + 30 * Math.sin(t * 2 + i), yy, 680, 2); }
  g.restore();
}
function gatherLast(g, t) {                    // the sparks gather into the last line, then it stands
  if (t < CUES.gather) return;
  const T = LAST_PTS(), P = STACK_PTS(), r = rng(9);
  const solid = smooth(CUES.last - 0.15, CUES.last + 0.45, t);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < T.length; i++) {
    const src = P[Math.floor(r() * P.length)], start = CUES.gather + r() * 0.5, dur = 0.8 + r() * 0.5;
    const k = EASE.out(clamp((t - start) / dur)); if (k <= 0) continue;
    const sx = src[0] + (r() - 0.5) * 120, sy = src[1] - 200 - r() * 300;
    const [x, y] = MOTION.arc(k, sx, sy, T[i][0], T[i][1], 0.25 * (r() - 0.5));
    g.globalAlpha = (0.9 - 0.85 * solid) * Math.min(1, k * 3); dot(g, S, x, y, 2.6 - 1.2 * k, k < 0.8 ? '#FFB060' : '#FFE9C8', 1);
  }
  g.restore();
  if (solid > 0) {
    g.save(); g.globalAlpha = solid; g.fillStyle = '#EFEDE8'; g.shadowColor = 'rgba(255,140,60,0.55)'; g.shadowBlur = 24 * (1 - solid) + 6;
    font(g, 'display', LAST.size); g.fillText(LAST.str, 540, LAST.y); g.restore();
  }
  // the ember returns as the underline: a line of live coal
  const u = EASE.inOut(clamp((t - (CUES.last + 0.2)) / 0.7));
  if (u > 0) {
    const w = 440 * u, y = LAST.y + 46, fl = 0.85 + 0.15 * noise1(t * 7);
    g.save(); g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(540 - w / 2, 0, 540 + w / 2, 0);
    lg.addColorStop(0, 'rgba(255,106,42,0)'); lg.addColorStop(0.5, `rgba(255,170,90,${0.95 * fl})`); lg.addColorStop(1, 'rgba(255,106,42,0)');
    g.fillStyle = lg; g.fillRect(540 - w / 2, y - 1.5, w, 3);
    g.globalAlpha = 0.35 * fl; g.fillRect(540 - w / 2, y - 7, w, 14);
    g.restore();
  }
  const ha = smooth(CUES.last + 0.7, CUES.last + 1.2, t);
  if (ha > 0) { g.save(); g.globalAlpha = ha * 0.8; g.fillStyle = '#B9B4AC'; setType(g, TYPE, 'text', 40, { short: 1080, weight: 500, track: 0.08 }); g.textAlign = 'center'; g.fillText('@abiunleashed', 540, 1430); g.restore(); }
}

function keepGathering(g, k, t, S) {
  // locked off on the dark, a slow 4 % push across the whole film; a small jolt when the stack ignites
  const s = S.W / RW;
  g.save(); g.setTransform(s, 0, 0, s, 0, 0);
  g.fillStyle = PALETTE.bg; g.fillRect(0, 0, RW, RH);
  const push = 1 + 0.04 * EASE.inOut(t / DURATION), jolt = t > CUES.touch ? 6 * Math.exp(-(t - CUES.touch) * 6) * Math.sin((t - CUES.touch) * 40) : 0;
  g.translate(540, 1000 + jolt); g.scale(push, push); g.translate(-540, -1000);
  // 1. They see the fire.
  const a1 = 1 - smooth(2.35, 2.75, t);
  words(g, 'They see', 540, 860, 96, '#EFEDE8', smooth(CUES.see, CUES.see + 0.6, t), a1);
  const fh = smooth(CUES.fire, CUES.fire + 0.3, t) * (1 - smooth(1.7, 2.4, t));
  g.save(); if (fh > 0) { g.shadowColor = 'rgba(255,106,42,0.95)'; g.shadowBlur = 40 * fh; }
  words(g, 'the fire.', 540, 990, 128, heatColor(0.45 * fh), smooth(CUES.fire, CUES.fire + 0.45, t), a1); g.restore();
  // 2. They never saw (the turn), held above the stack until the fire takes it
  words(g, 'They never saw', 540, 760, 64, '#8E8981', smooth(CUES.never, CUES.never + 0.8, t), 1 - smooth(CUES.touch - 0.3, CUES.touch + 0.3, t));
  // 3. the stack, 4. the fire
  stack(g, t);
  fire(g, t);
  ember(g, t, (1 - smooth(CUES.touch, CUES.touch + 0.25, t)));
  // 5. Keep gathering.
  gatherLast(g, t);
  g.restore();
}
