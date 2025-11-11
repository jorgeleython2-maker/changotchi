// game_dop.js — defensive polish layer
// - Никаких жёстких зависимостей: всё через проверки
// - Хоткеи 1..4 (ищут #action-* или первые .game-action)
// - Бип на клики (WebAudio), переключатель звука
// - Фуллскрин
// - Лёгкая индикация роста/падения MCAP (если #market-cap есть)

(function () {
  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.from(document.querySelectorAll(s)); }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(() => {
    // ---------- Fullscreen ----------
    const fsBtn = $('#ux-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const root = document.documentElement;
        if (!document.fullscreenElement) root.requestFullscreen?.();
        else document.exitFullscreen?.();
      });
    }

    // ---------- Compact toggle ----------
    const compactBtn = $('#ux-compact');
    if (compactBtn) {
      compactBtn.addEventListener('click', () => {
        document.body.classList.toggle('compact-ui');
      });
    }

    // ---------- Audio tiny SFX ----------
    let audioOn = true;
    const audioBtn = $('#ux-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        audioOn = !audioOn;
        audioBtn.textContent = audioOn ? '🔊' : '🔈';
      });
    }

    function beep(freq = 640, dur = 0.07, type = 'square') {
      try {
        if (!audioOn || !('AudioContext' in window)) return;
        const ctx = beep._ctx || (beep._ctx = new AudioContext());
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.value = 0.075;
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + dur);
      } catch (_) { /* безопасно замолкаем */ }
    }

    // бип по data-beep и по основным action-кнопкам
    const ids = ['#action-shill', '#action-ama', '#action-ban', '#action-contest'];
    ids.forEach((sel, i) => {
      const el = $(sel);
      if (el) el.addEventListener('click', () => beep(520 + 40 * i));
    });
    $all('[data-beep]').forEach(btn => btn.addEventListener('click', () => beep()));

    // ---------- Keyboard shortcuts ----------
    window.addEventListener('keydown', (e) => {
      if (!/^[1-4]$/.test(e.key)) return;
      const map = { '1':'#action-shill','2':'#action-ama','3':'#action-ban','4':'#action-contest' };
      const byId = $(map[e.key]);
      if (byId && !byId.disabled) { byId.click(); return; }
      const actions = $all('.game-action');
      const idx = parseInt(e.key, 10) - 1;
      if (actions[idx] && !actions[idx].disabled) actions[idx].click();
    });

    // ---------- Market-cap flair ----------
    const mcap = $('#market-cap');
    if (mcap) {
      let last = null;
      const obs = new MutationObserver(() => {
        const text = mcap.textContent || '';
        const num = parseFloat(text.replace(/[^0-9.]+/g, ''));
        if (!isFinite(num)) return;
        if (last == null) { last = num; return; }
        const up = num > last;
        mcap.classList.remove('increase', 'decrease');
        mcap.classList.add(up ? 'increase' : 'decrease');
        last = num;
        setTimeout(() => mcap.classList.remove('increase', 'decrease'), 450);
      });
      obs.observe(mcap, { childList: true, subtree: true, characterData: true });
    }

    // ---------- Safe helpers for log (если нужен) ----------
    const log = $('#event-log');
    if (log) {
      window.flashGood = (msg) => { log.textContent = msg; log.classList.add('good'); log.classList.remove('bad'); };
      window.flashBad  = (msg) => { log.textContent = msg; log.classList.add('bad');  log.classList.remove('good'); };
    }
  });
})();
