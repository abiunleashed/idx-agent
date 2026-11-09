// ---- Logo sting: positions are offsets from the frame centre in px of a 1080-wide short side (scaled by S.u / 1080),
// so 9:16, 1:1 and 16:9 all keep the logo centred at the same size relative to the short side ----
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const LOGO_IMG = lazy(() => { const i = new Image(); i.src = window.LOGO_DATA; return i; });
// the cropped logo (1100x760) drawn 900 wide: its top-left, its ring and its drop, relative to the centre
const L = { x: -450, y: -363, w: 900, h: 622, ringY: -60, ringRx: 155, ringRy: 18, dropY: -170, dropH: 279, cut: 430 };

function dropPath(g, x, y, h) {              // the logo's drop: a fine tip, a round bulb (x, y = the bulb's centre)
  const r = 0.38 * h, tip = y - 0.62 * h;
  g.beginPath(); g.moveTo(x, tip);
  g.bezierCurveTo(x + 0.05 * h, y - 0.44 * h, x + r, y - 0.26 * h, x + r, y);
  g.arc(x, y, r, 0, Math.PI);
  g.bezierCurveTo(x - r, y - 0.26 * h, x - 0.05 * h, y - 0.44 * h, x, tip);
  g.closePath();
}
function drawDrop(g, x, y, h, squash = 0, a = 1) {   // gold glass: lit from the upper left, one hard highlight
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.translate(x, y + 0.38 * h); g.scale(1 + squash * 0.4, 1 - squash * 0.35); g.translate(-x, -(y + 0.38 * h));
  dropPath(g, x, y, h);
  const gr = g.createLinearGradient(x - 0.4 * h, y - 0.6 * h, x + 0.4 * h, y + 0.4 * h);
  gr.addColorStop(0, '#FBE7B0'); gr.addColorStop(0.45, PALETTE.accent); gr.addColorStop(1, '#7A4D16');
  g.fillStyle = gr; g.fill();
  g.globalAlpha = 0.95 * a; g.fillStyle = '#FFFAF0'; g.beginPath(); g.ellipse(x - 0.17 * h, y - 0.12 * h, 0.07 * h, 0.12 * h, 0.5, 0, TAU); g.fill();
  g.restore();
}
// the logo drawn on an offscreen copy, so the light pass can be laid only on the logo's own gold (no box around it)
const LIT = lazy(() => { const c = document.createElement('canvas'); c.width = 1100; c.height = 760; return { c, g: c.getContext('2d') }; });

function logoSting(g, k, t, S) {
  // locked off, a 2 % push across the whole sting
  const u = S.u / 1080, cx = S.W / 2, cy = S.H / 2, push = 1 + 0.02 * EASE.inOut(t / DURATION);
  g.save();
  g.fillStyle = PALETTE.bg; g.fillRect(0, 0, S.W, S.H);
  g.translate(cx, cy); g.scale(u * push, u * push);
  const land = CUES.land, ringY = L.ringY;
  // the warm glow that blooms behind the mark when the drop lands
  const bloom = smooth(land, land + 0.6, t) * (0.75 + 0.25 * Math.sin(t * 1.3));
  const glow = g.createRadialGradient(0, -90, 20, 0, -90, 820);
  glow.addColorStop(0, `rgba(110,62,24,${0.55 * bloom + 0.08})`); glow.addColorStop(1, 'rgba(11,8,6,0)');
  g.fillStyle = glow; g.fillRect(-2000, -2000, 4000, 4000);

  // 1. the fall: from above the frame, gravity, a short trail
  if (t < land) {
    const f = t / land, y = lerp(-1150, ringY - 34, f * f);
    for (let i = 1; i <= 6; i++) { const ff = Math.max(0, (t - i * 0.02) / land); drawDrop(g, 0, lerp(-1150, ringY - 34, ff * ff), 70, 0, 0.12 * (1 - i / 7)); }
    drawDrop(g, 0, y, 70);
  }
  // 2. the landing: a splash crown and rings spreading out of the impact, the last one becoming the logo's ring
  const age = t - land;
  if (age >= 0) {
    g.save(); g.strokeStyle = PALETTE.accent;
    for (let i = 1; i <= 3; i++) {
      const a = age - i * 0.1; if (a <= 0) continue;
      const r = 30 + 420 * Math.pow(a, 0.55);
      g.globalAlpha = Math.max(0, 0.7 - a * 0.9) / i; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, ringY, r, r * 0.12, 0, 0, TAU); g.stroke();
    }
    const m = EASE.out(clamp(age / 0.7)), vec = 1 - smooth(1.95, 2.35, t);
    g.globalAlpha = vec; g.lineWidth = lerp(2, 8, m);
    g.beginPath(); g.ellipse(0, ringY, lerp(20, L.ringRx, m), lerp(4, L.ringRy, m), 0, 0, TAU); g.stroke();
    for (let i = 0; i < 10; i++) {               // the crown: gold drops thrown up and falling back
      const h = hash1(i * 17 + 3), th = TAU * i / 10 + h, v = 140 + 90 * h;
      if (age > 0.6) continue;
      g.globalAlpha = (1 - age / 0.6) * vec;
      dot(g, S, Math.cos(th) * v * age, ringY + Math.sin(th) * v * age * 0.2 - (480 * age - 1000 * age * age), 6 - 6 * age, '#E9BF6E', 1);
    }
    g.restore();
    // 3. the rebound: the drop springs up into the logo's drop; the bean appears inside it
    const rise = MOTION.back(MOTION.at(t, land + 0.12, 0.8), 1.3), sq = Math.exp(-age * 10) * Math.cos(age * 28) * 0.8;
    const dh = lerp(70, L.dropH, rise), dy = lerp(ringY - 34, L.dropY, rise);
    drawDrop(g, 0, dy, dh, Math.max(0, age < 0.12 ? sq : 0), 1 - smooth(1.95, 2.35, t));
  }
  // 4. the real logo takes over: the mark first, then the name rises through a mask
  const img = LOGO_IMG(), ma = smooth(1.9, 2.35, t), na = smooth(2.35, 3.1, t);
  if (img.complete && ma > 0) {
    const sc = L.w / 1100, cutH = L.cut * sc;
    g.save(); g.globalCompositeOperation = 'screen';
    g.globalAlpha = ma; g.drawImage(img, 0, 0, 1100, L.cut, L.x, L.y, L.w, cutH);
    if (na > 0) {
      const lift = 26 * (1 - EASE.out(na));
      g.save(); g.beginPath(); g.rect(L.x, L.y + cutH, L.w, L.h - cutH); g.clip();
      g.globalAlpha = na; g.drawImage(img, 0, L.cut, 1100, 760 - L.cut, L.x, L.y + cutH + lift, L.w, (760 - L.cut) * sc);
      g.restore();
    }
    g.restore();
    // 5. a light passes over the logo, only on its gold
    const sweep = clamp((t - CUES.sweep) / 0.9);
    if (sweep > 0 && sweep < 1) {
      const o = LIT(); o.g.setTransform(1, 0, 0, 1, 0, 0); o.g.globalCompositeOperation = 'source-over';
      o.g.clearRect(0, 0, 1100, 760); o.g.drawImage(img, 0, 0);
      o.g.globalCompositeOperation = 'multiply';   // keep only the bright gold: the black ground stays black
      const bx = lerp(-300, 1400, EASE.inOut(sweep)), band = o.g.createLinearGradient(bx - 160, 0, bx + 160, 0);
      band.addColorStop(0, 'rgba(0,0,0,1)'); band.addColorStop(0.5, 'rgba(255,248,225,1)'); band.addColorStop(1, 'rgba(0,0,0,1)');
      o.g.fillStyle = band; o.g.fillRect(0, 0, 1100, 760);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7 * Math.sin(Math.PI * sweep);
      g.drawImage(o.c, L.x, L.y, L.w, L.h); g.restore();
    }
  }
  // tiny gold motes drifting in the glow, so the hold still lives
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const h = hash1(i * 11 + 4), h2 = hash1(i * 23 + 9), x = (h - 0.5) * 1000, y = 420 - ((t * (18 + 30 * h2) + h2 * 900) % 900);
    g.globalAlpha = smooth(land, land + 1, t) * (0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i))); dot(g, S, x, y, 1.4 + 1.6 * h2, '#F2CF86', 1);
  }
  g.restore();
  g.restore();
}

// this film's own voice: a water drop is a bubble ringing up in pitch (a physical model, locked to the frame)
function drip(ctx, out, t, gain = 0.5, f = 900) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.0, t + 0.06);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.18);
  const b = ctx.createOscillator(), bg = ctx.createGain();
  b.type = 'sine'; b.frequency.setValueAtTime(f * 0.5, t); bg.gain.setValueAtTime(gain * 0.45, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  b.connect(bg).connect(out); b.start(t); b.stop(t + 0.1);
}
function shimmer(ctx, out, t, dur, gain = 0.1) {     // a soft high bell-like shimmer under the light pass
  [2093, 2637, 3136].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), at = t + i * 0.09;
    o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain / (i + 1), at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, at + dur); o.connect(g).connect(out); o.start(at); o.stop(at + dur + 0.05);
  });
}

