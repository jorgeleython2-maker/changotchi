// game_shop.js — Shop с тирами, ростом цен и MCAP-floor ($5,000)
(function(){
  const $ = (s, r=document) => r.querySelector(s);

  /* ===== MCAP helpers ===== */
  const mcapEl = $('#market-cap');
  function parseMCAP(){
    if (!mcapEl) return 0;
    const t = mcapEl.textContent || "";
    const n = parseFloat(t.replace(/[^0-9.]+/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function fmt(n){ return Math.max(0, Math.floor(n)).toLocaleString(); }
  function setMCAP(n){
    if (!mcapEl) return;
    const val = Math.max(0, Math.floor(n));
    mcapEl.textContent = `MCAP: $${fmt(val)}`;
  }

  /* ===== Persistent state (localStorage) ===== */
  const LS_KEY = 'shop_state_v1';
  const state = loadState();
  function loadState(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {buys:{}, peak:0}; }
    catch { return {buys:{}, peak:0}; }
  }
  function saveState(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch{} }

  // Track peak MCAP via observer (для тир-разлока)
  if (mcapEl) {
    const obs = new MutationObserver(() => { bumpPeak(); updateBalanceMini(); });
    obs.observe(mcapEl, { childList:true, characterData:true, subtree:true });
  }
  function bumpPeak(){
    const cur = parseMCAP();
    if (cur > state.peak){ state.peak = cur; saveState(); }
  }
  bumpPeak();

  /* ===== UI bootstrap ===== */
  const topbar = $('#ux-topbar');
  if (topbar && !$('#ux-shop')) {
    const shopBtn = document.createElement('button');
    shopBtn.id = 'ux-shop';
    shopBtn.className = 'chip square';
    shopBtn.title = 'Shop';
    shopBtn.textContent = '$';
    topbar.appendChild(shopBtn);
  }
  if (!$('#shop-modal')) {
    const modal = document.createElement('div');
    modal.id = 'shop-modal';
    modal.innerHTML = `
      <div class="shop-backdrop" data-close="1"></div>
      <div class="shop-card">
        <div class="shop-header">
          <span>SHOP</span>
          <div class="shop-meta">
            <span class="shop-tier">Tier: <b id="shop-tier">1</b></span>
            <span class="shop-mcap">Balance: <b id="shop-balance">$0</b></span>
          </div>
          <button class="chip square close" data-close="1">✕</button>
        </div>
        <div class="shop-note">Minimum balance after purchase: <b>$5,000</b></div>
        <div class="shop-list"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /* ===== Tiers + items =====
     Тиры по пику MCAP: T1 >= 0, T2 >= 25k, T3 >= 100k
     Цена растёт на +20% за каждую покупку (пер-айтем).
  */
  const TIER_THRESH = [0, 25000, 100000];
  function getTier(peak){ return peak >= TIER_THRESH[2] ? 3 : peak >= TIER_THRESH[1] ? 2 : 1; }

  const items = [
    { id:'energy', tier:1, name:'Energy Drink',    base:  500, desc:'HYPE +10%',               use:()=>{ adjust('hype', +0.10);} },
    { id:'meme',   tier:1, name:'Meme Pack (10x)', base:  300, desc:'HYPE +5%, FAITH +5%',     use:()=>{ adjust('hype', +0.05); adjust('faith', +0.05);} },
    { id:'shield', tier:2, name:'Anti-FUD Shield', base:  900, desc:'FUD −20%',                use:()=>{ adjust('fud',  -0.20);} },
    { id:'bots',   tier:2, name:'Bot Army',        base: 1000, desc:'HYPE +20%, FUD +5%',      use:()=>{ adjust('hype', +0.20); adjust('fud', +0.05);} },
    { id:'pr',     tier:3, name:'PR Campaign',     base: 1500, desc:'FAITH +15%, FUD −10%',    use:()=>{ adjust('faith',+0.15); adjust('fud',  -0.10);} },
  ];
  function buyCount(id){ return state.buys[id]|0; }
  function priceNow(it){ return Math.floor(it.base * Math.pow(1.2, buyCount(it.id))); }

  /* ===== Bars (safe) ===== */
  function getBarPair(id){
    const bar = $('#' + id + '-bar');
    const wrap = bar?.parentElement;
    if (!bar || !wrap) return { value:0, bar, wrap };
    const wBar  = parseFloat(getComputedStyle(bar).width);
    const wWrap = parseFloat(getComputedStyle(wrap).width);
    const v = (!isFinite(wBar) || !isFinite(wWrap) || wWrap<=0) ? 0 : Math.max(0, Math.min(1, wBar / wWrap));
    return { value: v, bar, wrap };
  }
  function setBar(id, v){
    const { bar } = getBarPair(id);
    if (!bar) return;
    const clamped = Math.max(0, Math.min(1, v));
    bar.style.width = (clamped * 100).toFixed(1) + '%';
  }
  function adjust(id, delta){ setBar(id, getBarPair(id).value + delta); }

  /* ===== Render ===== */
  const MIN_AFTER = 5000;
  function updateBalanceMini(){
    const bal = $('#shop-balance'); if (bal) bal.textContent = `$${fmt(parseMCAP())}`;
    const tierEl = $('#shop-tier'); if (tierEl) tierEl.textContent = String(getTier(state.peak));
  }

  function renderShop(){
    const list = $('#shop-modal .shop-list'); if (!list) return;
    bumpPeak(); updateBalanceMini();
    const tier = getTier(state.peak);

    list.innerHTML = '';
    items
      .filter(it => it.tier <= tier)
      .forEach(it => {
        const price = priceNow(it);
        const bal   = parseMCAP();
        const willLeft = bal - price;
        const cantAfford = price > bal;
        const breaksFloor = willLeft < MIN_AFTER;

        const row = document.createElement('div');
        row.className = 'shop-row';
        row.innerHTML = `
          <div class="shop-name">${it.name}<div class="shop-desc">${it.desc}</div></div>
          <div class="shop-cost">$${fmt(price)}</div>
          <button class="btn buy" data-id="${it.id}">Buy</button>
        `;
        const btn = row.querySelector('.buy');
        if (cantAfford || breaksFloor){
          btn.classList.add('disabled');
          btn.title = cantAfford ? 'Not enough MCAP' : 'Must keep at least $5,000';
        }
        btn.addEventListener('click', () => tryBuy(it));
        list.appendChild(row);
      });

    // Плейсхолдер для закрытых тиров
    const locked = items.filter(it => it.tier > tier)
      .map(it=>it.tier).filter((v,i,a)=>a.indexOf(v)===i).sort();
    if (locked.length){
      const need = locked[0] === 2 ? TIER_THRESH[1] : TIER_THRESH[2];
      const lockRow = document.createElement('div');
      lockRow.className = 'shop-locked';
      lockRow.textContent = `Unlock Tier ${locked[0]} at peak MCAP ≥ $${fmt(need)}. Current peak: $${fmt(state.peak)}`;
      list.appendChild(lockRow);
    }
  }

  function tryBuy(it){
    const price = priceNow(it);
    const bal = parseMCAP();
    if (price > bal) { flashBad('Not enough MCAP'); return; }
    if (bal - price < MIN_AFTER) { flashBad('Must keep at least $5,000'); return; }
    setMCAP(bal - price);
    try{ it.use(); }catch{}
    state.buys[it.id] = buyCount(it.id) + 1; saveState();
    renderShop(); // обновить цены/кнопки
    flashGood(`${it.name} purchased`);
  }

  /* ===== Open/close ===== */
  $('#ux-shop')?.addEventListener('click', ()=> { renderShop(); openShop(); });
  $('#shop-modal')?.addEventListener('click', (e)=>{
    const t = e.target;
    if (t instanceof Element && t.closest('[data-close]')) closeShop();
  });
  function openShop(){ $('#shop-modal')?.classList.add('open'); }
  function closeShop(){ $('#shop-modal')?.classList.remove('open'); }

  /* ===== Feedback fallbacks ===== */
  function flashGood(msg){
    if (typeof window.flashGood === 'function') window.flashGood(msg);
    else { const el = $('#event-log'); if (el){ el.textContent = msg; el.style.color = '#53d491'; } }
  }
  function flashBad(msg){
    if (typeof window.flashBad === 'function') window.flashBad(msg);
    else { const el = $('#event-log'); if (el){ el.textContent = msg; el.style.color = '#ff6b6b'; } }
  }
})();
