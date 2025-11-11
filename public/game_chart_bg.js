// game_chart_bg.js — blurred 8-bit candlestick background reacting to MCAP
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const screen = $('#screen');
  if (!screen) return;

  // Create & insert canvas at the very back
// канвас — в самое начало, чтобы точно быть «сзади»
    let canvas = document.getElementById('bg-chart');
    if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'bg-chart';
    }
    screen.prepend(canvas); // <— важно: prepend, не append

  const ctx = canvas.getContext('2d', { alpha: true });

  // Style & sizing
  function fit() {
    const w = Math.max(200, screen.clientWidth);
    const h = Math.max(150, screen.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  new ResizeObserver(fit).observe(screen);
  fit();

  // Candle series
  const candles = []; // {o,h,l,c}
  const MAX = 140;
  let base = 100;
  let trend = 0; // -1, 0, +1
  let lastMCAP = null;

  // Read MCAP changes to set 'trend'
  const mcapEl = $('#market-cap');
  if (mcapEl) {
    const obs = new MutationObserver(() => {
      const t = mcapEl.textContent || '';
      const n = parseFloat(t.replace(/[^0-9.]+/g, ''));
      if (!isFinite(n)) return;
      if (lastMCAP == null) { lastMCAP = n; return; }
      trend = n > lastMCAP ? 1 : (n < lastMCAP ? -1 : 0);
      lastMCAP = n;
      // small kick to price toward trend
      base += trend * 0.6;
    });
    obs.observe(mcapEl, { childList: true, characterData: true, subtree: true });
  }

  // RNG helper
  const rnd = (min, max) => min + Math.random() * (max - min);

  function pushCandle() {
    const prev = candles[candles.length - 1];
    const o = prev ? prev.c : base;
    // directional drift based on trend
    const drift = trend * rnd(0.4, 1.2);
    const noise = rnd(-0.6, 0.6);
    const c = Math.max(1, o + drift + noise);
    const h = Math.max(o, c) + rnd(0.1, 0.8);
    const l = Math.min(o, c) - rnd(0.1, 0.8);
    candles.push({ o, h, l, c });
    if (candles.length > MAX) candles.shift();
  }

  // Grid
  function drawGrid() {
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    // dark bg so blur blends subtly
    // keep flat fill for 8-bit vibe
    ctx.fillStyle = '#0a0f20';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const gx = 20, gy = 16;
    for (let x = 0; x <= w; x += gx) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += gy) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    ctx.restore();
  }

  // Map price to y
  function getRange() {
    // compute min/max over current window
    let mn = Infinity, mx = -Infinity;
    for (const k of candles) { if (k.l < mn) mn = k.l; if (k.h > mx) mx = k.h; }
    if (!isFinite(mn) || !isFinite(mx) || mn === mx) { mn = base - 3; mx = base + 3; }
    // pad
    const pad = (mx - mn) * 0.2 + 2;
    return [mn - pad, mx + pad];
  }

  function yOf(val, h, mn, mx) {
    return Math.round(h - (val - mn) / (mx - mn) * h);
  }

  function drawCandles() {
    const w = canvas.width, h = canvas.height;
    const [mn, mx] = getRange();

    const count = candles.length;
    if (!count) return;

    const gap = 6;               // distance between candles
    const cw = 4;                // body width
    const totalW = count * gap;
    const startX = Math.max(8, w - totalW - 8);

    for (let i = 0; i < count; i++) {
      const k = candles[i];
      const x = startX + i * gap;
      const yo = yOf(k.o, h, mn, mx);
      const yc = yOf(k.c, h, mn, mx);
      const yh = yOf(k.h, h, mn, mx);
      const yl = yOf(k.l, h, mn, mx);

      const up = k.c >= k.o;
      // 8-bit colors
      ctx.strokeStyle = up ? '#2cff7a' : '#ff4e57';
      ctx.fillStyle = up ? '#2cff7a' : '#ff4e57';

      // wick
      ctx.beginPath();
      ctx.moveTo(x + cw / 2, yh);
      ctx.lineTo(x + cw / 2, yl);
      ctx.stroke();

      // body
      const by = Math.min(yo, yc);
      const bh = Math.max(1, Math.abs(yo - yc));
      ctx.fillRect(x, by, cw, bh);
      // tiny border for legibility
      ctx.strokeRect(x, by, cw, bh);
    }
  }

  // Animate
  let tAccum = 0;
  let lastT = performance.now();

  function tick() {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    lastT = now;
    tAccum += dt;

    // new candle every ~1.2s
    if (tAccum > 1.2) {
      tAccum = 0;
      pushCandle();
      drawGrid();
      drawCandles();
    }
    requestAnimationFrame(tick);
  }

  // Seed a few candles
  for (let i = 0; i < 40; i++) pushCandle();
  drawGrid(); drawCandles();
  requestAnimationFrame(tick);
})();
