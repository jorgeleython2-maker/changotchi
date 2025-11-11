// game_plus.js — audio + score + quests + events + passives + combos + particles + animations
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ===================== SCORE BAR ===================== */
  // Вставим полоску со счётом над #game-window
  (function mountScore(){
    if ($('#scorebar')) return;
    const host = $('#game-container') || document.body;
    const scorebar = document.createElement('div'); scorebar.id='scorebar';
    scorebar.innerHTML = `

      <span class="chip cur">Score: <b id="score-val">0</b></span>
      <span class="chip best">Best: <b id="best-val">0</b></span>
    `;
    host.prepend(scorebar);

    const qebar = document.createElement('div'); qebar.id='qebar';
    host.insertBefore(qebar, scorebar.nextSibling);
  })();

  /* ===================== MCAP helpers ===================== */
  const FLOOR = 5000;
  const mcapEl = $('#market-cap');
  const fmt = n => Math.max(0, Math.floor(n)).toLocaleString();
  function parseMCAP(){
    if (!mcapEl) return FLOOR;
    const t = mcapEl.textContent || "";
    const n = parseFloat(t.replace(/[^0-9.]+/g,''));
    return Number.isFinite(n) ? n : FLOOR;
  }
  function setMCAP(n){
    if (!mcapEl) return;
    mcapEl.textContent = `MCAP: $${fmt(Math.max(FLOOR, n))}`;
  }

  // Score = текущий MCAP, Best = peak MCAP (persist)
  const LS_KEY = 'pg_best_v1';
  const scoreEl = $('#score-val'), bestEl = $('#best-val');
  function updateScoreUI(){
    const cur = parseMCAP();
    const best = Math.max(cur, getBest());
    setBest(best);
    scoreEl && (scoreEl.textContent = fmt(cur));
    bestEl  && (bestEl.textContent  = fmt(best));
  }
  const getBest = ()=> { try{ return +localStorage.getItem(LS_KEY) || 0 }catch{ return 0 } };
  const setBest = (v)=> { try{ localStorage.setItem(LS_KEY, String(v)) }catch{} };

  if (mcapEl) new MutationObserver(updateScoreUI).observe(mcapEl,{childList:true,subtree:true,characterData:true});
  updateScoreUI();

/* ===================== AUDIO (music+SFX) ===================== */
const Audio = (() => {
  let ctx=null, enabled=true, loopNode=null, loopGain=null, sfxGain=null;
  const LS_VOL='pg_vol_v1', LS_MUTE='pg_mute_v1';
  let volume = +localStorage.getItem(LS_VOL); if (!isFinite(volume)) volume = 0.5;
  let muted  = localStorage.getItem(LS_MUTE)==='1';

  function ensure(){
    if (!ctx) {
      ctx = new (window.AudioContext||window.webkitAudioContext)();
      loopGain = ctx.createGain(); loopGain.gain.value = 0;        // начнём с 0
      sfxGain  = ctx.createGain();  sfxGain.gain.value  = muted?0:0.08;
      loopGain.connect(ctx.destination); sfxGain.connect(ctx.destination);
    }
    return ctx;
  }

  function beep(freq=640, dur=0.07, type='square', gain=0.08){
    if (muted) return;
    const c = ensure();
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(sfxGain); o.start(); o.stop(c.currentTime + dur);
  }

  function startLoop(){
    const c = ensure();
    if (loopNode) return;
    loopNode = c.createOscillator(); loopNode.type='square'; loopNode.frequency.value = 220;
    loopNode.connect(loopGain); loopNode.start();

    // крошечный арпеджиатор
    const tempo = 116, spb = 60/tempo; let step=0;
    (function tick(){
      if (!loopNode) return;
      const seq = [0,7,12,7, 0,5,9,5];
      const n = 220*Math.pow(2, seq[step%seq.length]/12);
      loopNode.frequency.setValueAtTime(n, c.currentTime);
      step++; setTimeout(tick, spb*1000);
    })();

    // попытка сразу поднять громкость — если автоплей запрещён, контекст будет suspended
    fadeTo(muted ? 0 : volume, 0.25);
  }

  function stopLoop(){ try{ loopNode && loopNode.stop() }catch{} loopNode=null; }

  function setMuted(v){
    muted = !!v; localStorage.setItem(LS_MUTE, muted?'1':'0');
    fadeTo(muted?0:volume, 0.15);
    if (sfxGain) sfxGain.gain.value = muted?0:0.08;
  }

  function setVolume(v){
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem(LS_VOL, String(volume));
    if (!muted) fadeTo(volume, 0.15);
  }

  function fadeTo(target, sec){
    ensure();
    const t = ctx.currentTime;
    loopGain.gain.cancelScheduledValues(t);
    loopGain.gain.setTargetAtTime(target, t, sec/3);
  }

  // автозапуск максимально рано
  document.addEventListener('DOMContentLoaded', () => {
    try { startLoop(); } catch {}
  });
  // если контекст «suspended», размьютим при первом взаимодействии
  function unlock(){ try{ ensure().resume(); startLoop(); if (!muted) fadeTo(volume,0.2); }catch{} }
  window.addEventListener('pointerdown', unlock, { once:true });
  window.addEventListener('keydown',      unlock, { once:true });

  // ── UI: кнопка 🎵 + поповер −/+ ──
  (function mountMusicUI(){
    const top = $('#ux-topbar'); if (!top) return;
    if ($('#ux-music')) return;
    const btn = document.createElement('button');
    btn.id='ux-music'; btn.className='chip square'; btn.title='Music / Volume'; btn.textContent='🎵';
    const pop = document.createElement('div');
    pop.id='vol-pop';
    pop.innerHTML = `
      <span class="vlabel">VOL</span>
      <span class="vbtn" data-v="-">−</span>
      <span class="vbtn" data-v="+">+</span>
      <span class="vbtn" data-v="M">${muted?'UNMUTE':'MUTE'}</span>
    `;
    btn.addEventListener('click', ()=>{
      pop.classList.toggle('open');
    });
    document.addEventListener('click', (e)=>{
      if (!pop.contains(e.target) && e.target!==btn) pop.classList.remove('open');
    });
    pop.addEventListener('click', (e)=>{
      const t = e.target.closest('.vbtn'); if (!t) return;
      const k = t.getAttribute('data-v');
      if (k === '-') setVolume(volume - 0.1);
      if (k === '+') setVolume(volume + 0.1);
      if (k === 'M'){ setMuted(!muted); t.textContent = muted ? 'UNMUTE':'MUTE'; }
    });
    top.appendChild(btn); top.appendChild(pop);
  })();

  return { beep, startLoop, stopLoop, setMuted, setVolume };
})();
  /* ===================== PARTICLES & HERO ANIMS ===================== */
  function spawnFx(msg, cls='up'){
    const screen = $('#screen'); if(!screen) return;
    const fx = document.createElement('div');
    fx.className = `fx ${cls}`; fx.textContent = msg;
    screen.appendChild(fx); setTimeout(()=>fx.remove(), 900);
  }
  function heroTypingFlash(){
    const hero = $('#alon-character, #alon8'); if(!hero) return;
    hero.classList.add('typing');
    clearTimeout(hero._typingT); hero._typingT = setTimeout(()=>hero.classList.remove('typing'), 420);
  }
  function heroBanGlare(){
    const hero = $('#alon-character, #alon8'); if(!hero) return;
    hero.classList.add('ban');
    setTimeout(()=>hero.classList.remove('ban'), 250);
  }
  // вешаем на действия
  $('#action-shill')?.addEventListener('click', ()=>{ heroTypingFlash(); spawnFx('+HYPE','up'); });
  $('#action-ama')  ?.addEventListener('click', ()=>{ heroTypingFlash(); spawnFx('+FAITH','up'); });
  $('#action-ban')  ?.addEventListener('click', ()=>{ heroBanGlare();   spawnFx('−FUD','down'); });
  $('#action-contest')?.addEventListener('click',()=>{ heroTypingFlash(); spawnFx('+HYPE','up'); });

  /* ===================== QUESTS ×3 ===================== */
  const Q = {
    data: [
      { id:'q_ama3',  name:'Do shit 3 times',      need:3, cur:0, reward:()=>{ adjust('faith',+0.15); spawnFx('+FAITH','up'); } },
      { id:'q_ban5',  name:'Ignore FUD 5 times',   need:5, cur:0, reward:()=>{ adjust('fud',  -0.20); spawnFx('−FUD','down'); } },
      { id:'q_cont2', name:'Build 2 times', need:2, cur:0, reward:()=>{ adjust('hype', +0.20); spawnFx('+HYPE','up'); } },
      { id:'shill4', name:'Shill CA 4 times', need:4, cur:0, reward:()=>{ adjust('hype', +0.20); spawnFx('+HYPE', '+FAITH', 'up'); } },
    ],
    el: null,
    mount(){
      const row = $('#qebar'); if (!row) return;
      this.el = row;
      row.innerHTML = '';
      this.data.forEach(q=>{
        const b = document.createElement('span'); b.className = 'badge'; b.id = q.id;
        b.textContent = `${q.name} [0/${q.need}]`; row.appendChild(b);
      });
    },
    bump(id){
      const q = this.data.find(x=>x.id===id); if(!q || q.cur>=q.need) return;
      q.cur++; const b = $('#'+q.id);
      if (b) b.textContent = `${q.name} [${q.cur}/${q.need}]`;
      if (q.cur>=q.need){
        b && b.classList.add('done');
        Audio.beep(880, .12, 'square', 0.1);
        q.reward();
      }
    }
  };
  Q.mount();
  $('#action-ama')?.addEventListener('click', ()=> Q.bump('q_ama3'));
  $('#action-ban')?.addEventListener('click', ()=> Q.bump('q_ban5'));
  $('#action-contest')?.addEventListener('click', ()=> Q.bump('q_cont2'));
  $('#action-shill')?.addEventListener('click', ()=> Q.bump('shill4'));

  /* ===================== EVENTS OF THE DAY ===================== */
  // лёгкий модификатор на 60–120 сек: Buff/Debuff
  const Events = (() => {
    const el = $('#qebar');
    let active = null, timer = null;
    const pool = [
      { id:'e_bull', name:'Bull Sentiment',  dur:[60,120], apply:()=>{ Mods.hypeMul = 1.3 },  clear:()=>{ Mods.hypeMul = 1.0 } },
      { id:'e_bear', name:'Fee Hike',        dur:[60,120], apply:()=>{ Mods.faithMul = 0.8 }, clear:()=>{ Mods.faithMul = 1.0 } },
      { id:'e_trend',name:'Influencer Pump', dur:[60,120], apply:()=>{ Mods.mcapMul = 1.25 }, clear:()=>{ Mods.mcapMul = 1.0 } },
    ];
    function badge(text){
      let b = $('#event-badge');
      if (!b && el){ b = document.createElement('span'); b.id='event-badge'; b.className='badge'; el.appendChild(b); }
      if (b) b.textContent = text;
    }
    function start(){
      const e = pool[Math.floor(Math.random()*pool.length)];
      active = e; e.apply(); badge(`Event: ${e.name}`);
      clearTimeout(timer);
      const ms = (e.dur[0] + Math.random()*(e.dur[1]-e.dur[0]))*1000;
      timer = setTimeout(stop, ms);
    }
    function stop(){
      if (active){ active.clear(); active=null; badge('Event: —'); }
      // перезапуск через паузу
      setTimeout(start, 20000 + Math.random()*15000);
    }
    return { start };
  })();
  const Mods = { hypeMul:1.0, faithMul:1.0, mcapMul:1.0 };
  Events.start();

  /* ===================== PASSIVES (unlock by peak) ===================== */
  const Passives = (() => {
    const k = 'pg_passives_v1';
    let has = {};
    try{ has = JSON.parse(localStorage.getItem(k)) || {} }catch{}
    function save(){ try{ localStorage.setItem(k, JSON.stringify(has)) }catch{} }
    function checkUnlocks(){
      const peak = getBest();
      if (peak >= 25000 && !has.p1){ has.p1=true; Mods.hypeMul *= 1.1;  spawnFx('Passive: HYPE x1.1'); save(); }
      if (peak >=100000 && !has.p2){ has.p2=true; Mods.faithMul *= 1.1; spawnFx('Passive: FAITH x1.1'); save(); }
    }
    return { checkUnlocks };
  })();
  setInterval(Passives.checkUnlocks, 4000);

  /* ===================== COMBOS ===================== */
  // Последовательности за 2.5с: SHILL→CONTEST→AMA => мультипликатор
  const Combo = (() => {
    const windowMs = 2500;
    const seq = [];
    function push(tag){
      const now = performance.now();
      seq.push({tag, t:now});
      // чистим старое
      while (seq.length && now - seq[0].t > windowMs) seq.shift();
      // проверяем паттерны
      const tags = seq.map(x=>x.tag).join('-');
      if (/-S-C-A$/.test('-'+tags)) { // Shill-Contest-AMA
        spawnFx('COMBO x1.2'); Audio.beep(980,.09,'square',.1);
        Mods.hypeMul *= 1.2; setTimeout(()=> Mods.hypeMul/=1.2, 4000);
      }
      if (/-B-S$/.test('-'+tags)) { // Ban-Shill
        spawnFx('FUD↓'); Audio.beep(440,.09,'square',.08);
        adjust('fud', -0.1);
      }
    }
    return { push };
  })();
  $('#action-shill')?.addEventListener('click', ()=> Combo.push('S'));
  $('#action-ama')  ?.addEventListener('click', ()=> Combo.push('A'));
  $('#action-ban')  ?.addEventListener('click', ()=> Combo.push('B'));
  $('#action-contest')?.addEventListener('click',()=> Combo.push('C'));

  /* ===================== SAFE BAR HELPERS ===================== */
  function getBarPair(id){
    const bar = $('#'+id+'-bar'), wrap = bar?.parentElement;
    if (!bar || !wrap) return { value:0, bar, wrap };
    const wBar = parseFloat(getComputedStyle(bar).width);
    const wWrap= parseFloat(getComputedStyle(wrap).width);
    const v = (!isFinite(wBar)||!isFinite(wWrap)||wWrap<=0) ? 0 : Math.max(0, Math.min(1, wBar/wrap));
    return { value:v, bar, wrap };
  }
  function setBar(id, v){
    const { bar } = getBarPair(id); if (!bar) return;
    bar.style.width = (Math.max(0,Math.min(1,v))*100).toFixed(1)+'%';
  }
  function adjust(id, delta){ setBar(id, getBarPair(id).value + delta); }

  /* ===================== OPTIONAL HOOK: mcapMul effect ===================== */
  // если твой game.js где-то апдейтит MCAP, это множитель подхватит график/дрейф:
  // просто пример — каждые 12s делаем микро-буст MCAP по модификатору событий
  setInterval(()=>{
    const cur = parseMCAP();
    const target = cur * Mods.mcapMul;
    if (Mods.mcapMul !== 1.0) setMCAP(target);
  }, 12000);

  /* резюмируем: всё подключается само, ничего не ломая */
})();
