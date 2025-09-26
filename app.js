// TrueShade App JS - colorblind-friendly eCommerce with camera color detector
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const state = {
    products: [],
    cart: load('ts_cart', []),
    wishlist: load('ts_wishlist', []),
    prefs: load('ts_prefs', { filter: 'none', highContrast: false, largeText: false }),
    recommendations: [],
  };

  const FILTER_DESCRIPTIONS = {
    none: ['No Filter', 'Natural colors'],
    protanopia: ['Protanopia', 'Red sensitivity reduced'],
    deuteranopia: ['Deuteranopia', 'Green sensitivity reduced'],
    tritanopia: ['Tritanopia', 'Blue sensitivity reduced'],
    achromatopsia: ['Achromatopsia', 'No color perception'],
  };

  function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }

  function currency(n){ return `$${n.toFixed(2)}`; }

  // Seed demo products
  function seedProducts(){
    const demo = [
      {id:'p1', name:'Aurora Jacket', price:159, color:'Sky Blue – Calm Tone', colorFamily:'cool', tags:['new'], img:'#6ae3ff', desc:'Lightweight jacket with breathable mesh.'},
      {id:'p2', name:'Solar Sneakers', price:129, color:'Sunset Orange – Warm Tone', colorFamily:'warm', tags:['bestseller'], img:'#ff7a4a', desc:'Cushioned comfort with dynamic grip.'},
      {id:'p3', name:'Monolith Backpack', price:98, color:'Graphite – Neutral Tone', colorFamily:'neutral', tags:['eco'], img:'#2f3645', desc:'Recycled materials, spacious compartments.'},
      {id:'p4', name:'Tide Tee', price:32, color:'Ocean Teal – Calm Tone', colorFamily:'cool', tags:['eco','new'], img:'#1eb5a1', desc:'Ultra-soft cotton with cooling knit.'},
      {id:'p5', name:'Blossom Hoodie', price:86, color:'Rose Pink – Gentle Tone', colorFamily:'warm', tags:['new'], img:'#ff7adf', desc:'Cozy fleece with oversized hood.'},
      {id:'p6', name:'Nimbus Bottle', price:24, color:'Frost White – Clear Tone', colorFamily:'neutral', tags:['bestseller'], img:'#e6ebff', desc:'Double-wall vacuum insulated.'},
    ];
    state.products = demo;
  }

  // Rendering helpers
  function renderProducts(list = state.products){
    const grid = $('#products');
    grid.innerHTML = '';
    list.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-media">
          <div class="img" style="background:linear-gradient(135deg, ${shade(p.img, -12)}, ${p.img})"></div>
          <span class="chip" aria-label="Color description">${p.color}</span>
        </div>
        <div class="card-body">
          <div class="card-title">${p.name}</div>
          <div class="card-meta">${p.desc}</div>
          <div class="card-meta">Color: <strong>${p.color}</strong></div>
          <div class="card-meta price">${currency(p.price)}</div>
          <div class="cta-row">
            <button class="btn primary" data-add="${p.id}">Add to Cart</button>
            <button class="btn ghost" data-wish="${p.id}">Wishlist</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  function renderCart(){
    const body = $('#cart-items');
    body.innerHTML = '';
    let subtotal = 0;
    state.cart.forEach(ci => {
      const p = state.products.find(x => x.id === ci.id);
      if (!p) return;
      subtotal += p.price * ci.qty;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div style="display:flex;gap:.6rem;align-items:center">
          <span class="swatch" style="display:inline-block;width:20px;height:20px;border-radius:4px;border:1px solid #333;background:${p.img}"></span>
          <strong>${p.name}</strong>
        </div>
        <div style="margin-left:auto;display:flex;gap:.4rem;align-items:center">
          <button aria-label="Decrease quantity" data-dec="${p.id}">−</button>
          <span aria-live="polite">${ci.qty}</span>
          <button aria-label="Increase quantity" data-inc="${p.id}">+</button>
          <strong>${currency(p.price * ci.qty)}</strong>
          <button aria-label="Remove item" data-rem="${p.id}">×</button>
        </div>`;
      body.appendChild(row);
    });
    $('#cart-subtotal').textContent = currency(subtotal);
  }

  function renderWishlist(){
    const body = $('#wishlist-items');
    body.innerHTML = '';
    state.wishlist.forEach(id => {
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div style="display:flex;gap:.6rem;align-items:center">
          <span class="swatch" style="display:inline-block;width:20px;height:20px;border-radius:4px;border:1px solid #333;background:${p.img}"></span>
          <strong>${p.name}</strong>
        </div>
        <div style="margin-left:auto;display:flex;gap:.4rem;align-items:center">
          <button class="btn ghost" data-move="${p.id}">Add to Cart</button>
          <button aria-label="Remove from wishlist" data-unwish="${p.id}">×</button>
        </div>`;
      body.appendChild(row);
    });
  }

  function openDrawer(id){ const el = document.getElementById(id); el.setAttribute('aria-hidden','false'); }
  function closeDrawer(id){ const el = document.getElementById(id); el.setAttribute('aria-hidden','true'); }
  function toggleModal(id, show){ const el = document.getElementById(id); el.setAttribute('aria-hidden', show ? 'false' : 'true'); }

  // Search and filters
  function applyFilters(){
    const q = $('#search-input')?.value.trim().toLowerCase() || '';
    const price = Number($('#price-range').value);
    const families = $$('.color-family:checked').map(i => i.value);
    const tagsSel = Array.from($('#tag-filter').selectedOptions).map(o => o.value);
    const list = state.products.filter(p => {
      const matchesQ = q === '' || `${p.name} ${p.color} ${p.desc}`.toLowerCase().includes(q);
      const matchesPrice = p.price <= price;
      const matchesFam = families.length ? families.includes(p.colorFamily) : true;
      const matchesTag = tagsSel.length ? tagsSel.every(t => p.tags.includes(t)) : true;
      return matchesQ && matchesPrice && matchesFam && matchesTag;
    });
    renderProducts(list);
  }

  // Color blindness filter application (simulate via SVG filter on root)
  function updateColorBlindFilter(value){
    state.prefs.filter = value; save('ts_prefs', state.prefs);
    const [label, desc] = FILTER_DESCRIPTIONS[value];
    $('#cb-label').textContent = label; $('#cb-desc').textContent = desc;
    document.documentElement.style.filter = `url(#cb-${value})`;
    $('#cb-filter').value = value;
  }

  // Personalization prefs
  function applyPrefs(){
    document.body.classList.toggle('pref-high-contrast', !!state.prefs.highContrast);
    document.body.style.setProperty('--accent', state.prefs.highContrast ? '#6aff00' : '#6ae3ff');
    document.body.style.setProperty('--accent-2', state.prefs.highContrast ? '#ff2bd6' : '#ff7adf');
    document.body.style.fontSize = state.prefs.largeText ? '18px' : '';
    $('#pref-high-contrast').checked = !!state.prefs.highContrast;
    $('#pref-large-text').checked = !!state.prefs.largeText;
  }

  // Camera color detector
  let mediaStream = null;
  async function openCamera(){
    try{
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = $('#camera');
      video.srcObject = mediaStream;
      toggleModal('camera-modal', true);
    }catch(err){
      alert('Camera access denied or unavailable.');
    }
  }
  function closeCamera(){
    if(mediaStream){ mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    toggleModal('camera-modal', false);
  }
  function sampleColor(){
    const video = $('#camera');
    const canvas = $('#camera-canvas');
    if(!video.videoWidth) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const x = Math.floor(canvas.width/2), y = Math.floor(canvas.height/2);
    const data = ctx.getImageData(x, y, 1, 1).data;
    const [r,g,b] = [data[0], data[1], data[2]];
    const hex = rgbToHex(r,g,b);
    const name = nameColor(r,g,b);
    const desc = describeTone(r,g,b);
    $('#readout-swatch').style.background = hex;
    $('#readout-name').textContent = name;
    $('#readout-hex').textContent = hex;
    $('#readout-desc').textContent = desc;
  }

  // Torch toggle (best-effort)
  async function toggleTorch(){
    try{
      const track = mediaStream?.getVideoTracks?.()[0];
      const capabilities = track?.getCapabilities?.();
      if(capabilities && 'torch' in capabilities){
        const settings = track.getSettings();
        const on = !settings.torch;
        await track.applyConstraints({ advanced: [{ torch: on }] });
      }else{
        alert('Torch not supported on this device.');
      }
    }catch{ alert('Unable to toggle torch.'); }
  }

  // Event wiring
  function wireEvents(){
    // Search and filter controls
    $('form.search')?.addEventListener('submit', e => { e.preventDefault(); applyFilters(); });
    $('#search-input')?.addEventListener('input', applyFilters);
    $('#price-range')?.addEventListener('input', e => { $('#price-output').textContent = `Up to $${e.target.value}`; applyFilters(); });
    $$('.color-family').forEach(cb => cb.addEventListener('change', applyFilters));
    $('#tag-filter')?.addEventListener('change', applyFilters);

    // Product ctas (event delegation)
    $('#products').addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      const wish = e.target.closest('[data-wish]');
      if(add){ addToCart(add.dataset.add); }
      if(wish){ toggleWishlist(wish.dataset.wish); }
    });

    // Cart drawer
    $('#open-cart').addEventListener('click', () => { renderCart(); openDrawer('cart-drawer'); });
    $('#cart-drawer').addEventListener('click', e => {
      if(e.target.matches('[data-inc]')) changeQty(e.target.dataset.inc, +1);
      if(e.target.matches('[data-dec]')) changeQty(e.target.dataset.dec, -1);
      if(e.target.matches('[data-rem]')) removeFromCart(e.target.dataset.rem);
    });
    $('[data-close="cart-drawer"]').addEventListener('click', () => closeDrawer('cart-drawer'));
    $('#checkout').addEventListener('click', checkout);

    // Wishlist drawer
    $('#open-wishlist').addEventListener('click', () => { renderWishlist(); openDrawer('wishlist-drawer'); });
    $('#wishlist-drawer').addEventListener('click', e => {
      if(e.target.matches('[data-move]')){ addToCart(e.target.dataset.move); toggleWishlist(e.target.dataset.move, false); renderWishlist(); }
      if(e.target.matches('[data-unwish]')){ toggleWishlist(e.target.dataset.unwish, false); renderWishlist(); }
    });
    $('[data-close="wishlist-drawer"]').addEventListener('click', () => closeDrawer('wishlist-drawer'));

    // Camera modal
    $('#open-camera').addEventListener('click', openCamera);
    $('#hero-camera').addEventListener('click', openCamera);
    $('[data-close="camera-modal"]').addEventListener('click', closeCamera);
    $('#snap-color').addEventListener('click', sampleColor);
    $('#toggle-torch').addEventListener('click', toggleTorch);

    // Color blindness filter selector
    $('#cb-filter').addEventListener('change', e => updateColorBlindFilter(e.target.value));

    // Prefs
    $('#pref-high-contrast').addEventListener('change', e => { state.prefs.highContrast = e.target.checked; save('ts_prefs', state.prefs); applyPrefs(); });
    $('#pref-large-text').addEventListener('change', e => { state.prefs.largeText = e.target.checked; save('ts_prefs', state.prefs); applyPrefs(); });

    // Simple nav toggle for small screens
    $('.nav-toggle')?.addEventListener('click', e => {
      const nav = $('#nav');
      const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
      e.currentTarget.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'flex';
    });

    // Scroll parallax on hero decor (reduced motion respected)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!prefersReduced){
      const decor = document.querySelector('.parallax.decor');
      const onScroll = () => {
        const y = window.scrollY * 0.15;
        decor && (decor.style.transform = `translate3d(0, ${-y}px, 0)`);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // Cart/wishlist logic
  function addToCart(id){
    const found = state.cart.find(c => c.id === id);
    if(found) found.qty += 1; else state.cart.push({ id, qty: 1 });
    save('ts_cart', state.cart); renderCart(); recommendFrom(id);
  }
  function changeQty(id, delta){
    const found = state.cart.find(c => c.id === id); if(!found) return;
    found.qty += delta; if(found.qty <= 0) state.cart = state.cart.filter(c => c.id !== id);
    save('ts_cart', state.cart); renderCart();
  }
  function removeFromCart(id){ state.cart = state.cart.filter(c => c.id !== id); save('ts_cart', state.cart); renderCart(); }
  function toggleWishlist(id, toggle = true){
    if(toggle){
      state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter(x => x !== id) : [...state.wishlist, id];
    } else {
      state.wishlist = state.wishlist.filter(x => x !== id);
    }
    save('ts_wishlist', state.wishlist);
  }
  function checkout(){
    alert('Demo checkout. Accessibility-friendly flow coming soon.');
  }

  // Recommendations: simple heuristic by colorFamily/tag similarity
  function recommendFrom(id){
    const base = state.products.find(p => p.id === id);
    if(!base) return;
    const scored = state.products.filter(p => p.id !== id).map(p => ({
      p,
      score: (p.colorFamily === base.colorFamily ? 2 : 0) + p.tags.filter(t => base.tags.includes(t)).length
    })).sort((a,b) => b.score - a.score).slice(0,3).map(x => x.p);
    state.recommendations = scored; renderRecommendations();
  }
  function renderRecommendations(){
    const row = $('#recommend-row');
    row.innerHTML = '';
    state.recommendations.forEach(p => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <div class="card-media"><div class="img" style="background:${p.img}"></div></div>
        <div class="card-body"><div class="card-title">${p.name}</div><div class="card-meta">${p.color}</div><div class="price">${currency(p.price)}</div>
        <div class="cta-row"><button class="btn primary" data-add="${p.id}">Add to Cart</button></div></div>`;
      row.appendChild(el);
    });
  }

  // Color utils
  function rgbToHex(r,g,b){
    return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  function shade(hex, amt){
    const c = hex.replace('#','');
    const num = parseInt(c,16);
    let r = (num>>16) + amt; let g = ((num>>8)&0xff) + amt; let b = (num&0xff) + amt;
    r = Math.max(0,Math.min(255,r)); g = Math.max(0,Math.min(255,g)); b = Math.max(0,Math.min(255,b));
    return rgbToHex(r,g,b);
  }
  function nameColor(r,g,b){
    // Concise descriptive names for accessibility
    const max = Math.max(r,g,b), min = Math.min(r,g,b); const d = max - min;
    const brightness = (0.2126*r + 0.7152*g + 0.0722*b);
    let hueName = 'Neutral';
    if(d < 15){ hueName = 'Neutral'; }
    else if(max === r && g >= b) hueName = 'Warm Red';
    else if(max === r && g < b) hueName = 'Magenta';
    else if(max === g && r >= b) hueName = 'Olive';
    else if(max === g && r < b) hueName = 'Green';
    else if(max === b && r >= g) hueName = 'Violet';
    else if(max === b && r < g) hueName = 'Blue';
    const tone = brightness > 180 ? 'Bright Tone' : brightness > 100 ? 'Calm Tone' : 'Deep Tone';
    return `${hueName}`;
  }
  function describeTone(r,g,b){
    const contrastWhite = contrastRatio([r,g,b],[255,255,255]);
    const contrastBlack = contrastRatio([r,g,b],[0,0,0]);
    const best = contrastWhite >= contrastBlack ? 'Best on Dark Text' : 'Best on Light Text';
    return `${best} • ${Math.max(contrastWhite, contrastBlack).toFixed(1)}:1 contrast`;
  }
  function contrastRatio([r1,g1,b1],[r2,g2,b2]){
    const l1 = relativeLuminance(r1,g1,b1), l2 = relativeLuminance(r2,g2,b2);
    const [L1,L2] = l1 >= l2 ? [l1,l2] : [l2,l1];
    return (L1 + 0.05) / (L2 + 0.05);
  }
  function relativeLuminance(r,g,b){
    const a = [r,g,b].map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
  }

  // Init
  function init(){
    seedProducts();
    renderProducts();
    wireEvents();
    updateColorBlindFilter(state.prefs.filter || 'none');
    applyPrefs();
    $('#year').textContent = new Date().getFullYear();
    // Initial recommendations
    recommendFrom('p1');
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    // Refresh preferences and persisted data when back to tab
    state.cart = load('ts_cart', state.cart);
    state.wishlist = load('ts_wishlist', state.wishlist);
    state.prefs = load('ts_prefs', state.prefs);
    applyPrefs();
  });

  window.addEventListener('load', init);
})();

