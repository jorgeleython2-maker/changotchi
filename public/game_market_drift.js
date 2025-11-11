// game_market_drift.js — постоянный фоновой дрейф MCAP (respect floor), без кнопки
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const mcapEl = $('#market-cap'); if (!mcapEl) return;

  const FLOOR = 5000;
  const fmt = n => Math.max(0, Math.floor(n)).toLocaleString();
  const parseMCAP = () => {
    const t = mcapEl.textContent || "";
    const n = parseFloat(t.replace(/[^0-9.]+/g, ''));
    return Number.isFinite(n) ? n : FLOOR;
  };
  const setMCAP = (n) => { mcapEl.textContent = `MCAP: $${fmt(Math.max(FLOOR, n))}`; };

  // если магазин открыт — лучше не дёргать баланс (оставь, если нужно дергать и во время покупки — скажи, уберу паузу)
  const shopOpen = () => !!$('#shop-modal.open');

  let stormTimer = 0; // 0 — нет шторма
  function maybeStartStorm(){
    if (stormTimer > 0) return;
    if (Math.random() < 0.06) stormTimer = 8 + Math.random() * 10; // 8–18 c
  }

  function scheduleNext(){
    const base   = stormTimer > 0 ? 800  : 2500; // мс
    const jitter = stormTimer > 0 ? 500  : 2000;
    setTimeout(tick, base + Math.random()*jitter);
  }

  function tick(){
    try{
      if (shopOpen()) { // не мешаем покупкам
        if (stormTimer > 0) stormTimer = Math.max(0, stormTimer - 2.0);
        return scheduleNext();
      }

      let m = parseMCAP();
      const atFloor = m <= FLOOR + 1;

      // базовая вола: обычный режим ~0.15%, шторм ~0.5%
      const vol = (stormTimer > 0 ? 0.005 : 0.0015) * m;

      let delta = 0, r = Math.random();
      if (!atFloor && r < 0.10) {                 // крупная красная
        delta = -m * (0.007 + Math.random()*0.018);
      } else if (r < 0.15) {                      // крупная зелёная
        delta =  m * (0.004 + Math.random()*0.012);
      } else {                                    // мелкий дрейф (слегка вниз чаще)
        const sign = Math.random() < 0.48 ? -1 : 1;
        delta = sign * (0.25 + Math.random()*0.75) * vol;
      }
      if (atFloor && delta < 0) delta = 0;

      m += delta;
      if (m < FLOOR) m = FLOOR;
      setMCAP(m);

      if (stormTimer > 0) stormTimer = Math.max(0, stormTimer - ((800+500)/1000));
      else maybeStartStorm();
    } finally {
      scheduleNext();
    }
  }

  scheduleNext();
})();
