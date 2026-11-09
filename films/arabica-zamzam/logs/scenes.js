// ---- The world (sizes in px of a 1080x1920 frame; scaled to any render size by s = S.W / 1080) ----
const RW = 1080, RH = 1920;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k, al = 1) => { const A = rgbOf(a), B = rgbOf(b); const c = A.map((v, i) => Math.round(v + (B[i] - v) * k)); return `rgba(${c[0]},${c[1]},${c[2]},${al})`; };
// dune layers, near to far: parallax p, base y, amplitude, wavelength, phase, share of haze
const LAYERS = [
  { p: 1.00, B: 1370, A: 250, L: 920, ph: 0.72, hz: 0.00 },
  { p: 0.62, B: 1135, A: 150, L: 640, ph: 0.31, hz: 0.20 },
  { p: 0.40, B: 1005, A: 98, L: 500, ph: 0.55, hz: 0.40 },
  { p: 0.26, B: 918, A: 62, L: 400, ph: 0.12, hz: 0.58 },
  { p: 0.16, B: 860, A: 38, L: 320, ph: 0.83, hz: 0.72 },
  { p: 0.09, B: 824, A: 22, L: 260, ph: 0.44, hz: 0.84 },
];
const CREST = 0.72;                            // where along each dune its sharp crest sits
const SUN = { x: 250, y: 700 };                // low sun on the left: windward slopes lit, lee faces in deep shadow
function duneShape(f) { return f < CREST ? Math.pow(Math.sin(f / CREST * Math.PI / 2), 1.5) : Math.pow(Math.cos((f - CREST) / (1 - CREST) * Math.PI / 2), 0.8); }
function duneH(li, x) {
  const Ly = LAYERS[li], u = x / Ly.L + Ly.ph, n = Math.floor(u), f = u - n;
  const amp = li === 0 && n === 0 ? 1 : 0.62 + 0.38 * hash1(n * 7 + li * 131);
  return Ly.A * amp * duneShape(f) + Ly.A * 0.05 * Math.sin(x * 0.019 + li * 1.7);
}
// the drop's path along the near layer: a table of its x every 1/240 s (deterministic, built once)
const X0 = 0;
const DROP_X = lazy(() => {
  const dt = 1 / 240, out = [X0]; let x = X0;
  for (let i = 1; i <= 20 * 240; i++) {
    const t = i * dt;
    const v = t < 2 ? 0 : (300 + 240 * (1 - smooth(2, 3.4, t))) * (1 - 0.82 * smooth(9.2, 11.2, t));
    x += v * dt; out.push(x);
  }
  return out;
});
const dropX = (t) => { const a = DROP_X(), i = clamp(t, 0, 20) * 240, j = Math.floor(i), k = i - j; return a[j] + ((a[j + 1] ?? a[j]) - a[j]) * k; };
// the near layer reshapes where the drop has passed: its crests rise and sharpen, like sand under wind
function grow0(x, t) { return smooth(5.6, 9.0, t) * smooth(0, 380, dropX(t) - x) * (x > X0 - 200 ? 1 : 0); }
function surf0(x, t) { return duneH(0, x) * (1 + 0.2 * grow0(x, t)); }
const H_ABOVE = (t) => 1250 * (1 - Math.pow(clamp(t / CUES.land), 2));
function camOf(t) {                           // camera: x follows the drop a quarter second behind, y tilts down with the fall
  const camX = dropX(Math.max(0, t - 0.28)) - 60;
  let camY = t < CUES.land ? 0.86 * H_ABOVE(t) : 0;
  camY += t > CUES.land ? 14 * Math.exp(-(t - CUES.land) * 7) * Math.sin((t - CUES.land) * 40) : 0;   // the landing jolt
  camY += 18 * Math.sin(t * 0.7) * smooth(2.5, 5, t);   // a slow breathing crane
  const Z = 1 + 1.55 * EASE.inOut(clamp((t - 9.5) / 2.3));   // the push into the macro
  return { camX, camY, Z };
}
const layerY = (li, x, t, cam) => LAYERS[li].B + cam.camY * LAYERS[li].p - (li === 0 ? surf0(x, t) : duneH(li, x));
const toLayer = (li, sx, cam) => sx - RW / 2 + cam.camX * LAYERS[li].p;      // screen x -> layer x
const toScreen = (li, x, cam) => x - cam.camX * LAYERS[li].p + RW / 2;

function sky(g, cam) {
  const hz = 790 + cam.camY * 0.05;
  const gr = g.createLinearGradient(0, 0, 0, hz + 60);
  gr.addColorStop(0, '#16304f'); gr.addColorStop(0.45, PALETTE.sky); gr.addColorStop(0.78, '#8a7f9a');
  gr.addColorStop(0.93, PALETTE.haze); gr.addColorStop(1, '#f1cfae');
  g.fillStyle = gr; g.fillRect(-200, -200, RW + 400, RH + 400);
  const sy = SUN.y + cam.camY * 0.05, glow = g.createRadialGradient(SUN.x, sy, 10, SUN.x, sy, 520);
  glow.addColorStop(0, 'rgba(255,236,196,0.95)'); glow.addColorStop(0.08, 'rgba(255,214,160,0.75)');
  glow.addColorStop(0.35, 'rgba(240,170,120,0.22)'); glow.addColorStop(1, 'rgba(230,184,168,0)');
  g.fillStyle = glow; g.fillRect(-200, -200, RW + 400, RH + 400);
  dot(g, S, SUN.x, sy, 46, '#fff4dc', 0.95);
}

function layer(g, li, t, cam, o = {}) {
  const Ly = LAYERS[li], step = 3, x0 = -120, x1 = RW + 120;
  const lit = mixc(li === 0 ? '#d79a48' : PALETTE.crest, PALETTE.haze, Ly.hz), shadow = mixc(PALETTE.coffee, '#b98f90', Ly.hz * 0.95);
  g.save();
  g.beginPath(); g.moveTo(x0, RH + 600);
  for (let sx = x0; sx <= x1; sx += step) g.lineTo(sx, layerY(li, toLayer(li, sx, cam), t, cam));
  g.lineTo(x1, RH + 600); g.closePath();
  g.fillStyle = shadow; g.fill(); g.clip();
  // light by slope: the windward faces turn to the sun, the lee faces fall into shadow
  for (let sx = x0; sx <= x1; sx += step) {
    const x = toLayer(li, sx, cam), y = layerY(li, x, t, cam), dy = layerY(li, x + 3, t, cam) - y;
    const light = clamp(-dy / 3 * 1.6 + 0.15);
    if (light <= 0.02) continue;
    g.fillStyle = lit; g.globalAlpha = Math.pow(light, 0.8) * 0.95;
    g.fillRect(sx, y, step + 0.6, (li === 0 ? 340 : 160) * (1 + Ly.p));
  }
  g.globalAlpha = 1;
  // depth inside the layer: darker toward its base, hazier for far layers
  const top = Ly.B + cam.camY * Ly.p - Ly.A * 1.2, gr = g.createLinearGradient(0, top, 0, Ly.B + cam.camY * Ly.p + 260 * Ly.p);
  gr.addColorStop(0, 'rgba(42,22,8,0)'); gr.addColorStop(1, mixc(PALETTE.coffee, '#b98f90', Ly.hz, 0.78));
  g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, RH + 800);
  if (li <= 1) grains(g, li, t, cam);
  if (o.after) o.after(g);
  g.restore();
  // the crest line catches the sun
  g.save(); g.lineWidth = li === 0 ? 3 : 1.6; g.strokeStyle = mixc('#ffd89a', PALETTE.haze, Ly.hz, 0.55 - 0.3 * Ly.hz); g.beginPath();
  for (let sx = x0; sx <= x1; sx += 6) { const x = toLayer(li, sx, cam); const u = x / Ly.L + Ly.ph, f = u - Math.floor(u);
    if (Math.abs(f - CREST) < 0.05) g.lineTo(sx, layerY(li, x, t, cam)); else g.moveTo(sx, layerY(li, x, t, cam)); }
  g.stroke(); g.restore();
}

function grains(g, li, t, cam) {             // ground coffee: granules near the surface, lit on the sun side
  const cell = li === 0 ? 11 : 16, xa = toLayer(li, -60, cam), xb = toLayer(li, RW + 60, cam);
  for (let c = Math.floor(xa / cell); c <= Math.ceil(xb / cell); c++) {
    const r = rng(c * 13 + li * 7919);
    for (let i = 0; i < (li === 0 ? 7 : 3); i++) {
      const x = c * cell + r() * cell, depth = Math.pow(r(), 1.6) * (li === 0 ? 300 : 120);
      const sx = toScreen(li, x, cam), y = layerY(li, x, t, cam) + 2 + depth;
      const lightSide = layerY(li, x + 3, t, cam) < layerY(li, x, t, cam);
      const sz = (li === 0 ? 1.6 : 1.1) + r() * (li === 0 ? 2.4 : 1.2);
      g.fillStyle = r() < 0.5 ? (lightSide ? '#f0c27a' : '#5c3418') : (lightSide ? '#8a5428' : '#140a04');
      g.globalAlpha = 0.55 * (1 - depth / (li === 0 ? 330 : 140));
      g.fillRect(sx, y, sz, sz * 0.8);
    }
  }
  g.globalAlpha = 1;
}

function streamers(g, li, t, cam) {          // sand blown off each crest: grains drift right on the wind
  const Ly = LAYERS[li], xa = toLayer(li, -100, cam), xb = toLayer(li, RW + 100, cam);
  for (let n = Math.floor(xa / Ly.L + Ly.ph) - 1; n <= Math.ceil(xb / Ly.L + Ly.ph); n++) {
    const cx = (n + CREST - Ly.ph) * Ly.L, top = layerY(li, cx, t, cam), sx = toScreen(li, cx, cam);
    const strong = li === 0 ? 0.35 + 0.65 * grow0(cx, t) : 0.25;
    const count = li === 0 ? 34 : 14;
    for (let i = 0; i < count; i++) {
      const h = hash1(n * 97 + i * 13 + li * 5), age = (t * (0.45 + 0.3 * h) + h * 7) % 1;
      const px = sx + age * (150 + 120 * h) * Ly.p * (0.6 + strong), py = top - (10 + 30 * strong) * Math.sin(Math.PI * age) * Ly.p * 1.6 + age * 26 * Ly.p;
      g.globalAlpha = (1 - age) * 0.6 * strong; g.fillStyle = '#ffd99c';
      g.fillRect(px, py, 2.2 * Ly.p + 0.6, 1.6 * Ly.p + 0.5);
    }
  }
  g.globalAlpha = 1;
}

function dropPath(g, x, y, h) {              // the logo's drop: a fine tip on top, a round bulb (x, y = the bulb's centre)
  const r = 0.38 * h, tip = y - 0.62 * h;
  g.beginPath(); g.moveTo(x, tip);
  g.bezierCurveTo(x + 0.05 * h, y - 0.44 * h, x + r, y - 0.26 * h, x + r, y);
  g.arc(x, y, r, 0, Math.PI);
  g.bezierCurveTo(x - r, y - 0.26 * h, x - 0.05 * h, y - 0.44 * h, x, tip);
  g.closePath();
}
function drawDrop(g, x, y, h, o = {}) {      // gold glass: lit from the left, the sky inside it, one hard highlight
  const sq = o.squash || 0;
  g.save(); g.translate(x, y + 0.38 * h); g.scale(1 + sq * 0.35, 1 - sq * 0.3); g.translate(-x, -(y + 0.38 * h));
  dropPath(g, x, y, h);
  const gr = g.createLinearGradient(x - 0.4 * h, y - 0.6 * h, x + 0.4 * h, y + 0.4 * h);
  gr.addColorStop(0, '#fbe7b0'); gr.addColorStop(0.45, PALETTE.accent); gr.addColorStop(1, '#8a5a1c');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  g.globalAlpha = 0.35; g.fillStyle = PALETTE.sky; g.beginPath(); g.ellipse(x + 0.08 * h, y - 0.05 * h, 0.22 * h, 0.12 * h, -0.4, 0, TAU); g.fill();
  g.globalAlpha = 0.5; g.fillStyle = '#5a3610'; g.beginPath(); g.ellipse(x + 0.12 * h, y + 0.26 * h, 0.3 * h, 0.12 * h, 0, 0, TAU); g.fill();
  g.restore();
  g.globalAlpha = 1; g.lineWidth = Math.max(1, 0.025 * h); g.strokeStyle = '#7a4d16'; dropPath(g, x, y, h); g.stroke();
  g.globalAlpha = 0.95; g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(x - 0.17 * h, y - 0.12 * h, 0.07 * h, 0.12 * h, 0.5, 0, TAU); g.fill();
  g.restore();
}
function bean(g, x, y, sz, rot, a = 1) {      // a roasted bean: oval body, its S-shaped crease
  if (sz <= 0.02) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sz, sz); g.globalAlpha = a;
  const gr = g.createLinearGradient(-12, -16, 12, 16); gr.addColorStop(0, '#9a5c2a'); gr.addColorStop(0.5, '#5e3216'); gr.addColorStop(1, '#2a1406');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 13, 18, 0, 0, TAU); g.fill();
  g.strokeStyle = '#1a0b03'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, -15); g.bezierCurveTo(-6, -5, 6, 5, 0, 15); g.stroke();
  g.fillStyle = 'rgba(255,220,160,0.35)'; g.beginPath(); g.ellipse(-6, -7, 3, 6, 0.3, 0, TAU); g.fill();
  g.restore();
}

// the world at time t, drawn in 1080x1920 px
function desert(g, t, cam) {
  sky(g, cam);
  for (let li = LAYERS.length - 1; li >= 1; li--) {
    layer(g, li, t, cam);
    if (li <= 2) streamers(g, li, t, cam);
    if (li === 3) { const hz = g.createLinearGradient(0, 760 + cam.camY * 0.2, 0, 900 + cam.camY * 0.2);   // heat haze over the far dunes
      hz.addColorStop(0, 'rgba(230,184,168,0)'); hz.addColorStop(0.6, 'rgba(240,200,170,0.28)'); hz.addColorStop(1, 'rgba(230,184,168,0)');
      g.fillStyle = hz; g.fillRect(-200, 700 + cam.camY * 0.2, RW + 400, 260); }
  }
  layer(g, 0, t, cam, { after: (g) => trail(g, t, cam) });
  streamers(g, 0, t, cam);
}
function trailPts(t, cam, from = X0) {
  const out = [], to = dropX(t);
  for (let x = from; x <= to; x += 7) out.push([toScreen(0, x, cam), layerY(0, x, t, cam) + 4]);
  return out;
}
function trail(g, t, cam) {                  // the wet trail: coffee darkened by the water, glowing as it ferments
  if (t < CUES.land) return;
  const land = MOTION.at(t, CUES.land, 0.5), pts = trailPts(t, cam);
  // the landing mark
  g.fillStyle = 'rgba(20,10,4,0.85)'; g.beginPath(); g.ellipse(toScreen(0, X0, cam), layerY(0, X0, t, cam) + 6, 50 * EASE.out(land), 16 * EASE.out(land), 0, 0, TAU); g.fill();
  if (pts.length < 2) return;
  const line = (w, c, a) => { g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
  line(22, '#140a04', 0.85); line(9, '#2a1406', 0.9);
  const glowK = smooth(9.8, 11.6, t);
  line(3, '#ffd28a', 0.35 + 0.45 * glowK);
  if (glowK > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = '#e2a24a'; g.shadowBlur = 26; line(10, '#b5701e', 0.45 * glowK); g.restore(); }
  g.globalAlpha = 1;
  // beans wake along the trail: each grain swells into a bean
  if (t > 10.0) {
    const a = dropX(10.0) - 760, b = dropX(t) - 30;
    for (let x = Math.ceil(a / 38) * 38, i = 0; x < b; x += 38, i++) {
      const hsh = hash1(Math.round(x) * 3 + 11), k = MOTION.at(t, 10.25 + (x - a) / 760 * 1.3 + hsh * 0.25, 0.7);
      bean(g, toScreen(0, x + (hsh - 0.5) * 16, cam), layerY(0, x, t, cam) + 2 + hsh * 10, 0.95 * MOTION.back(k, 1.4), (hsh - 0.5) * 1.4);
    }
    // warm motes rise from the waking beans
    for (let i = 0; i < 26; i++) {
      const h = hash1(i * 31 + 5), age = (t * (0.35 + 0.2 * h) + h * 3) % 1, x = a + h * (b - a);
      g.globalAlpha = Math.sin(Math.PI * age) * 0.7 * smooth(10.4, 11.5, t); g.fillStyle = '#ffdb9e';
      g.fillRect(toScreen(0, x, cam) + Math.sin(age * 6 + i) * 6, layerY(0, x, t, cam) - age * 140, 2.4, 2.4);
    }
    g.globalAlpha = 1;
  }
}
function dropScreen(t, cam) {                // the drop on screen (before the zoom): bulb centre and height
  const h = 120, x = dropX(t), surf = layerY(0, x, t, cam);
  if (t < CUES.land) return { x: toScreen(0, x, cam), y: surf - H_ABOVE(t) - 0.38 * h, h };
  const roll = Math.sin((t - CUES.land) * 9) * Math.exp(-(t - CUES.land) * 2) * 6;
  return { x: toScreen(0, x, cam), y: surf - 0.38 * h - 2 + roll, h };
}
function zoomed(g, cam, fx, fy, fn) { g.save(); g.translate(fx, fy); g.scale(cam.Z, cam.Z); g.translate(-fx, -fy); fn(g); g.restore(); }
function words(g, t) {                       // the copy, a fragment at a time, in the top third
  const frag = (str, at, out) => {
    const a = smooth(at, at + 0.45, t) * (1 - smooth(out - 0.4, out, t));
    if (a <= 0) return;
    g.save(); g.setTransform(S.u, 0, 0, S.u, S.W / 2, S.H / 2);
    g.shadowColor = 'rgba(10,6,4,0.55)'; g.shadowBlur = S.u * 0.02;
    text(g, S, str, 0, -0.565 - 0.012 * (t - at) / 3, 0.078, PALETTE.ink, a, 0.02, { weight: 400, reveal: smooth(at, at + 0.7, t), by: 'char', spread: 0.5 });
    g.restore();
  };
  frag('Arabica çekirdeği', CUES.word1, CUES.word1 + 2.75);
  frag('Zamzam suyuyla', CUES.word2, CUES.word2 + 2.7);
  frag('fermente edildi.', CUES.word3, CUES.rise + 0.05);
  label(g, S, 'ARABICA ZAMZAM COFFEE', -0.42, 0.5, 0.032, PALETTE.ink, null, smooth(2.05, 2.4, t) * (1 - smooth(3.5, 3.85, t)), 'left', 'text');
}

// the cup in the desert, seen from above at three quarters
const CUP = { x: 540, y: 1090, rx: 360, ry: 104 };
function cupGeom(e) {                        // e 0..1: from larger than the frame to its place
  const k = Math.pow(e, 0.85);
  return { x: CUP.x, y: lerp(980, CUP.y, k), rx: lerp(1500, CUP.rx, k), ry: lerp(2300, CUP.ry, k) };
}
function cupBody(g, c) {
  const { x, y, rx, ry } = c, depth = rx * 1.05;
  // shadow on the sand, away from the sun
  g.fillStyle = 'rgba(20,10,4,0.45)'; g.beginPath(); g.ellipse(x + rx * 0.55, y + depth + ry * 0.6, rx * 1.35, ry * 1.1, -0.08, 0, TAU); g.fill();
  // saucer
  const sy = y + depth * 0.92, sgr = g.createLinearGradient(x - rx * 1.3, 0, x + rx * 1.3, 0);
  sgr.addColorStop(0, '#5a3a24'); sgr.addColorStop(0.35, '#2a1810'); sgr.addColorStop(1, '#0d0705');
  g.fillStyle = sgr; g.beginPath(); g.ellipse(x, sy, rx * 1.32, ry * 1.25, 0, 0, TAU); g.fill();
  g.strokeStyle = PALETTE.accent; g.lineWidth = 2.5; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(x, sy, rx * 1.32, ry * 1.25, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); g.globalAlpha = 1;
  // bowl: dark glazed ceramic, the sun's highlight on its left flank
  g.beginPath(); g.moveTo(x - rx, y);
  g.bezierCurveTo(x - rx, y + depth * 0.7, x - rx * 0.55, y + depth, x, y + depth);
  g.bezierCurveTo(x + rx * 0.55, y + depth, x + rx, y + depth * 0.7, x + rx, y);
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI, false); g.closePath();
  const bgr = g.createLinearGradient(x - rx, 0, x + rx, 0);
  bgr.addColorStop(0, '#3a2416'); bgr.addColorStop(0.12, '#c9925a'); bgr.addColorStop(0.2, '#4a2c1a'); bgr.addColorStop(0.6, '#1a0e08'); bgr.addColorStop(1, '#080403');
  g.fillStyle = bgr; g.fill();
  // handle on the right, in shadow
  g.strokeStyle = '#120905'; g.lineWidth = rx * 0.09; g.beginPath(); g.ellipse(x + rx * 1.02, y + depth * 0.38, rx * 0.2, depth * 0.22, 0, -Math.PI * 0.55, Math.PI * 0.55); g.stroke();
}
function coffeeSurface(g, c, t, a) {          // inside the rim: dark coffee, crema rings that echo the dunes
  if (a <= 0) return;
  const { x, y, rx, ry } = c;
  g.globalAlpha = a;
  const gr = g.createRadialGradient(x - rx * 0.2, y - ry * 0.2, 4, x, y, rx);
  gr.addColorStop(0, '#4a2610'); gr.addColorStop(0.7, '#24110a'); gr.addColorStop(1, '#a0642c');
  g.fillStyle = gr; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  g.strokeStyle = 'rgba(200,137,58,0.45)'; g.lineWidth = 2;
  for (let i = 1; i <= 6; i++) { g.beginPath();
    for (let j = 0; j <= 96; j++) { const th = TAU * j / 96, rr = (0.15 * i + 0.04 * Math.sin(th * 3 + i + t * 0.6)) ; const px = x + Math.cos(th) * rx * rr, py = y + Math.sin(th) * ry * rr; j ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke(); }
  g.globalAlpha = 1;
}
const WORLD_BUF = lazy(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return { c, g: c.getContext('2d') }; });

function dropCrossesDesert(g, k, t, S) {
  // one continuous shot: tilt down with the falling drop (2 s, ease-in on the fall), track beside it as it slides
  // (8 s, steady), push in to the macro (2.3 s, ease-in-out), then pull back and up to the cup (2 s, ease-in-out)
  const s = S.W / RW;
  const worldAt = (gg, tt) => {               // the desert and the drop at tt, with the macro zoom
    const cam = camOf(tt), d = dropScreen(tt, cam);
    const fx = d.x - 140, fy = d.y + 40;
    gg.save(); gg.setTransform(s, 0, 0, s, 0, 0);
    zoomed(gg, cam, fx, fy, (gg) => {
      desert(gg, tt, cam);
      if (tt < CUES.rise) {
        const sq = tt >= CUES.land ? Math.exp(-(tt - CUES.land) * 9) * Math.cos((tt - CUES.land) * 30) * 0.8 : 0;
        if (tt < CUES.land) { gg.fillStyle = 'rgba(20,10,4,0.35)'; gg.beginPath(); gg.ellipse(d.x + 30, layerY(0, dropX(tt), tt, cam) + 4, 40 * (1 - H_ABOVE(tt) / 1250), 9, 0, 0, TAU); gg.fill(); }
        drawDrop(gg, d.x, d.y, d.h, { squash: Math.max(0, sq) });
      }
    });
    gg.restore();
    return { cam, d, fx, fy };
  };
  if (t < CUES.rise) { worldAt(g, t); words(g, t); return; }
  // pull back: the desert shrinks into the cup, whose rim was the last ridge
  const e = EASE.inOut(clamp((t - CUES.rise) / (CUES.cup - 0.1 - CUES.rise)));
  const buf = WORLD_BUF(); buf.g.setTransform(1, 0, 0, 1, 0, 0);
  const frozen = Math.min(t, CUES.rise + 0.3), w = worldAt(buf.g, frozen);
  g.save(); g.setTransform(s, 0, 0, s, 0, 0);
  const wideCam = { camX: dropX(CUES.rise) + 300, camY: 300, Z: 1 };
  desert(g, frozen, wideCam);
  const c = cupGeom(e);
  cupBody(g, c);
  g.save(); g.beginPath(); g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); g.clip();
  const dw = lerp(RW * 1.6, c.rx * 2, e), dh = lerp(RH * 1.6, c.ry * 2 * 2.2, e);
  g.drawImage(buf.c, c.x - dw / 2, c.y - dh / 2 - lerp(0, 0, e), dw, dh);
  coffeeSurface(g, c, t, smooth(0.35, 0.92, e));
  ripples(g, c, t);
  g.restore();
  g.strokeStyle = PALETTE.accent; g.lineWidth = lerp(18, 5, e); g.beginPath(); g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,240,200,0.7)'; g.lineWidth = lerp(6, 1.6, e); g.beginPath(); g.ellipse(c.x, c.y - 2, c.rx, c.ry, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
  // the drop springs off the macro and falls into the middle of the cup
  if (t < CUES.cup) {
    const P0 = { x: w.fx + (w.d.x - w.fx) * w.cam.Z, y: w.fy + (w.d.y - w.fy) * w.cam.Z, h: w.d.h * w.cam.Z };
    const kk = clamp((t - CUES.rise) / (CUES.cup - CUES.rise)), fall = kk * kk;
    const x = lerp(P0.x, CUP.x, EASE.inOut(kk)), y = lerp(P0.y, CUP.y - 30, fall) - 520 * Math.sin(Math.PI * Math.min(1, kk * 1.1)) * (1 - kk);
    drawDrop(g, x, y, lerp(P0.h, 64, EASE.out(kk)));
  }
  g.restore();
}
function ripples(g, c, t) {                  // the drop lands: a crown of drops, then rings of light
  const age = t - CUES.cup; if (age < 0) return;
  for (let i = 0; i < 4; i++) {
    const a = age - i * 0.12; if (a <= 0) continue;
    const r = 18 + 300 * Math.pow(a, 0.55);
    g.globalAlpha = Math.max(0, 0.9 - a * 0.9) * (i ? 0.6 : 1); g.strokeStyle = '#f2cf86'; g.lineWidth = 3.5 - i * 0.6;
    g.beginPath(); g.ellipse(c.x, c.y, r, r * c.ry / c.rx, 0, 0, TAU); g.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const h = hash1(i * 17 + 3), th = TAU * i / 9 + h, v = 160 + 80 * h, a = age;
    if (a > 0.55) continue;
    const px = c.x + Math.cos(th) * v * a * 0.9, py = c.y + Math.sin(th) * v * a * 0.25 - (420 * a - 900 * a * a);
    g.globalAlpha = 1 - a / 0.55; dot(g, S, px, py, 5 - 4 * a, '#e9bf6e', 1);
  }
  g.globalAlpha = 1;
}

// ---- the end card: the ripple's ring becomes the logo's ring, the drop settles above it, the name rises ----
const LOGO_IMG = lazy(() => { const i = new Image(); i.src = window.LOGO_DATA; return i; });
const LOGO = { x0: 90, y0: 597, w: 900, h: 622 };   // the logo drawn here; its ring at (540, 900), drop bulb at (541, 790), h 279
function ringBecomesLogo(g, k, t, S) {
  // locked off, a slow 2.5 % push across the card; one light sweep across the name
  const s = S.W / RW, push = 1 + 0.025 * EASE.inOut(k);
  g.save(); g.setTransform(s, 0, 0, s, 0, 0);
  g.fillStyle = PALETTE.bg; g.fillRect(0, 0, RW, RH);
  const glow = g.createRadialGradient(540, 860, 20, 540, 860, 760); glow.addColorStop(0, 'rgba(90,50,20,0.55)'); glow.addColorStop(1, 'rgba(11,6,4,0)');
  g.fillStyle = glow; g.fillRect(0, 0, RW, RH);
  g.translate(540, 900); g.scale(push, push); g.translate(-540, -900);
  const m = EASE.inOut(MOTION.at(t, CUES.card, 0.85));
  const vec = 1 - smooth(17.45, 17.95, t);             // the drawn mark hands over to the real logo
  if (vec > 0) {
    g.globalAlpha = vec;
    g.strokeStyle = PALETTE.accent; g.lineWidth = lerp(3.5, 9, m);
    g.beginPath(); g.ellipse(540, lerp(1090, 900, m), lerp(330, 155, m), lerp(96, 18, m), 0, 0, TAU); g.stroke();
    const rise = MOTION.back(MOTION.at(t, CUES.card + 0.15, 0.95), 1.2);
    const dh = lerp(64, 279, rise), dy = lerp(1060, 790, rise);
    drawDrop(g, 541, dy, dh);
    const bk = MOTION.back(MOTION.at(t, 16.95, 0.5), 1.6);
    bean(g, 541, dy + 0.02 * dh, 3.2 * bk, 0.18, 1);
    g.globalAlpha = 1;
  }
  const img = LOGO_IMG(), la = smooth(17.4, 17.95, t);
  if (img.complete && la > 0) {
    g.save(); g.globalCompositeOperation = 'screen';
    const cut = 430;                                     // the mark above, the name below
    g.globalAlpha = la; g.drawImage(img, 0, 0, 1100, cut, LOGO.x0, LOGO.y0, LOGO.w, cut * LOGO.w / 1100);
    const na = smooth(17.7, 18.4, t), lift = 14 * (1 - EASE.out(na));
    g.globalAlpha = na; g.drawImage(img, 0, cut, 1100, 760 - cut, LOGO.x0, LOGO.y0 + cut * LOGO.w / 1100 + lift, LOGO.w, (760 - cut) * LOGO.w / 1100);
    g.restore();
    lightSweep(g, LOGO.x0, LOGO.y0, LOGO.w, LOGO.h, smooth(18.5, 19.5, t), { clip: (g) => g.rect(LOGO.x0, LOGO.y0 + 330, LOGO.w, 300), angle: 20, width: 0.18, strength: 0.35 });
  }
  g.restore();
}
