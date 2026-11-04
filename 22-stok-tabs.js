/* 22-stok-tabs.js — FILE BARU, dimuat SETELAH semua JS toko & 19-toko-admin.js (lihat index.php), di luar bundle.
   Tidak menimpa kode lama: file lama (07/09 dst.) tetap utuh. File ini hanya "membungkus" 2 fungsi yang sudah ada
   (renderTags & matchesStokFilter) dan menambah tampilan baru:
   1) Tab game ala Sold Out: [Semua] [Free Fire] [Mobile Legends] dengan logo yang bisa diganti admin (profile.readyLogos).
      Awal dibuka = Semua (FF + ML campur). Pindah ke FF / ML memakai tombol game lama (logika, warna, kategori SG tetap jalan).
   2) Chip dikecilkan, urutan (Terbaru / Termurah / Termahal) jadi satu tombol kecil di ujung baris chip.
   3) Kolom pencarian di atas (kode, judul, harga, kategori/skin), jumlah hasil di kiri, tombol Filter di kanan (urutan, kategori, SG). */
/* Kunci zoom halaman: viewport sudah melarang zoom, tapi Safari iOS mengabaikannya -> cegah juga gesture pinch bawaan browser.
   Zoom foto di detail postingan memakai sentuhan 2 jari buatan sendiri (07-tabs-selector-slides-zoom.js), jadi tidak terganggu. */
(function () {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
})();
(function () {
  'use strict';
  if (typeof renderTags !== 'function' || typeof matchesStokFilter !== 'function' || typeof renderStok !== 'function') return;
  var tagsEl = document.getElementById('tags-wrap');
  var toggleWrap = document.getElementById('game-toggle-wrap');
  var panel = document.getElementById('stok-panel');
  if (!tagsEl || !toggleWrap || !panel) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sfx(n) { try { if (typeof playSfx === 'function') playSfx(n); } catch (e) {} }

  var view = 'ALL';          // ALL | FF | ML
  var allTag = 'ALL_READY';  // chip aktif khusus tampilan Semua: ALL_READY | DISKON | P<index>
  var query = '';            // kata pencarian (berlaku di semua tampilan)
  var SORTS = [['terbaru', 'Terbaru'], ['termurah', 'Termurah'], ['termahal', 'Termahal']];
  var TABS = [['ALL', 'Semua', 'all'], ['FF', 'Free Fire', 'ff'], ['ML', 'Mobile Legends', 'ml'], ['RB', 'Roblox', 'rb']];
  var SVG_ALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>';

  /* ---------- helper data ---------- */
  function logoOf(k) {
    try { var l = profile && profile.readyLogos; return (l && typeof l[k] === 'string' && /^(https?:)?\/\//i.test(l[k])) ? l[k] : ''; } catch (e) { return ''; }
  }
  function priceOf(p) { try { return +getEffectivePrice(p) || 0; } catch (e) { return +p.price || 0; } }
  /* "0-500K", "501-999K", "1JT+++" -> [min, max] dalam rupiah; null kalau tidak terbaca */
  function parseRange(label) {
    var s = String(label || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^(\d+(?:[.,]\d+)?)(k|jt)?-(\d+(?:[.,]\d+)?)(k|jt)$/);
    function val(n, u) { n = parseFloat(String(n).replace(',', '.')); return u === 'jt' ? n * 1e6 : n * 1e3; }
    if (m) return [Math.max(0, val(m[1], m[2] || m[4]) - (val(m[1], m[2] || m[4]) > 0 ? 999 : 0)), val(m[3], m[4]) + 999];
    m = s.match(/^(\d+(?:[.,]\d+)?)(k|jt)\+*$/);
    if (m) return [val(m[1], m[2]), Infinity];
    return null;
  }
  function priceChips() {
    var out = [];
    try { getFFTags().forEach(function (t, i) { var r = parseRange(t.l); if (r) out.push({ tag: 'P' + i, label: t.l, r: r }); }); } catch (e) {}
    return out;
  }
  function normQ(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  /* pencarian pintar (nama game, budget harga, kode, kata) ada di 26-stok-cari.js */
  function matchQuery(p) { return window.TkCari ? window.TkCari.match(p, query) : true; }

  /* ---------- bungkus matchesStokFilter (tampilan Semua + pencarian) ---------- */
  var origMatch = matchesStokFilter;
  /* Kalau lagi mencari, hasil TIDAK terikat filter (chip Ready / Flash Sale / rentang harga / Kategori SG): yang dicari muncul semua,
     walau chip filternya sedang memilih rentang lain. Yang tetap berlaku: tab game yang dipilih, sold out & postingan tersembunyi. */
  function searching() { return !!(query && String(query).trim()); }
  window.matchesStokFilter = function (p) {
    var ok;
    if (searching()) {
      if (!p || p.type !== 'stok' || p.soldOut) return false;
      if (!isAdmin && p.hidden) return false;
      if (view !== 'ALL' && p.game !== curGame) return false;
      return matchQuery(p);
    }
    if (view === 'ALL') {
      if (!p || p.type !== 'stok') return false;
      if (!isAdmin && p.hidden) return false;
      if (allTag === 'DISKON') ok = !p.soldOut && !!p.discountActive;
      else if (allTag && allTag.charAt(0) === 'P') {
        var pc = priceChips().filter(function (c) { return c.tag === allTag; })[0];
        var pr = priceOf(p);
        ok = !p.soldOut && (!pc || (pr >= pc.r[0] && pr <= pc.r[1]));
      } else ok = !p.soldOut;
    } else ok = origMatch.apply(this, arguments);
    return ok && matchQuery(p);
  };

  /* ---------- bungkus renderTags ---------- */
  var origTags = renderTags;
  function allChips() {
    var chips = [{ tag: 'ALL_READY', label: 'Ready' }, { tag: 'DISKON', label: '✦ Flash Sale', disc: true }];
    priceChips().forEach(function (c) { chips.push({ tag: c.tag, label: c.label }); });
    return chips;
  }
  function paintTags() {
    var html = '<div class="chip-row st-chips">' + allChips().map(function (c) {
      return '<button type="button" data-sttag="' + c.tag + '" class="chip' + (allTag === c.tag ? ' active' : '') + (c.disc ? ' discount' : '') + ' inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">' + (c.disc || typeof ICON_CHECK_GLASS === 'undefined' ? '' : ICON_CHECK_GLASS) + esc(c.label) + '</button>';
    }).join('') + '</div>';
    tagsEl.innerHTML = html;
  }
  window.renderTags = function () {
    var r;
    if (view === 'ALL') {
      paintTags();
      var sgBtn = $('sg-category-toggle-btn'), sgWrap = $('sg-category-wrap');
      if (sgBtn) { sgBtn.classList.add('hidden'); sgBtn.classList.remove('flex'); }
      if (sgWrap) { sgWrap.classList.add('hidden'); sgWrap.innerHTML = ''; }
    } else {
      r = origTags.apply(this, arguments);
    }
    paintMeta();
    return r;
  };

  /* klik chip tampilan Semua */
  tagsEl.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-sttag]') : null;
    if (t) { sfx('filterSelect'); allTag = t.getAttribute('data-sttag'); window.renderTags(); renderStok(); }
  }, true);

  /* ---------- tab game ---------- */
  var bar = document.createElement('div');
  bar.id = 'stok-game-tabs'; bar.className = 'st-tabs'; bar.setAttribute('role', 'tablist');
  toggleWrap.parentNode.insertBefore(bar, toggleWrap);
  function paintBar() {
    bar.innerHTML = TABS.map(function (t) {
      var lg = logoOf(t[0]);
      return '<button type="button" role="tab" class="st-tab' + (view === t[0] ? ' on' : '') + (t[0] === 'ML' || t[0] === 'RB' ? ' ml' : '') + '" data-stv="' + t[0] + '" aria-selected="' + (view === t[0]) + '">' +
        '<span class="gt-dot ' + t[2] + (lg ? ' has-img' : '') + '">' + (lg ? '<img src="' + esc(lg) + '" alt="" loading="lazy" decoding="async">' : (t[0] === 'ALL' ? SVG_ALL : '')) + '</span>' + t[1] + '</button>';
    }).join('');
  }
  function setView(v) {
    if (v === view) return;
    view = v;
    if (v === 'ALL') { allTag = 'ALL_READY'; }
    else {
      var b = document.querySelector('#game-toggle-wrap .game[data-game="' + v + '"]');
      if (b) b.click();   // logika lama: curGame, chip, kategori SG, warna, logo footer
    }
    paintBar(); window.renderTags(); renderStok();
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-stv]') : null; if (!b) return;
    sfx('gameSwitch'); setView(b.getAttribute('data-stv'));
  });
  /* kalau tampilan diganti dari luar (mis. membuka link akun ML), ikuti */
  try {
    new MutationObserver(function () {
      var a = document.querySelector('#game-toggle-wrap .game.primary, #game-toggle-wrap .game.primary-pink');
      var g = a && a.getAttribute('data-game');
      if (g && view !== 'ALL' && g !== view) { view = g; paintBar(); }
    }).observe(toggleWrap, { attributes: true, subtree: true, attributeFilter: ['class'] });
  } catch (e) {}

  /* ---------- pencarian + jumlah hasil + tombol Filter (khusus tab Stok; Sold Out tidak ikut) ---------- */
  var SVG_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var SVG_FILTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';
  var top = document.createElement('div');
  top.id = 'st-top'; top.className = 'st-top';
  top.innerHTML = '<label class="st-find">' + SVG_SEARCH + '<input id="st-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cari akun, game, skin, harga..." aria-label="Cari akun"><button type="button" class="st-fx" data-st="clear" aria-label="Hapus" hidden>\u2715</button></label>';
  panel.insertBefore(top, bar);
  var meta = document.createElement('div');
  meta.id = 'st-meta'; meta.className = 'st-meta';
  meta.innerHTML = '<span id="st-count" class="st-count"></span><button type="button" class="st-filterbtn" data-st="filter" aria-haspopup="dialog">' + SVG_FILTER + '<span>Filter</span><b id="st-fbadge" class="st-fbadge" hidden></b></button>';
  panel.insertBefore(meta, toggleWrap);
  var inp = $('st-q'), dbT = 0;

  /* lembar Filter: urutan + kategori harga/status + kategori SG (elemen lama dipindah ke sini, logikanya tetap) */
  var fsheet = document.createElement('div');
  fsheet.id = 'st-filter'; fsheet.className = 'st-filter'; fsheet.hidden = true;
  fsheet.innerHTML = '<div class="st-fbg" data-st="fclose"></div><div class="st-fpanel" role="dialog" aria-label="Filter">' +
    '<div class="st-fhead"><b>Filter</b><button type="button" class="st-fx2" data-st="fclose" aria-label="Tutup">\u2715</button></div>' +
    '<div class="st-fbody">' +
      '<div class="st-fsec"><div class="st-flabel">Urutkan</div><div id="st-sorts" class="st-fsorts"></div></div>' +
      '<div class="st-fsec"><div class="st-flabel">Kategori</div><div id="st-fcats"></div></div>' +
      '<div class="st-fsec" id="st-fsg"></div>' +
    '</div>' +
    '<div class="st-ffoot"><button type="button" class="btn-ghost st-freset" data-st="freset">Reset</button><button type="button" class="primary st-fdone" data-st="fclose">Tampilkan <span id="st-fn"></span></button></div></div>';
  document.body.appendChild(fsheet);
  $('st-fcats').appendChild(tagsEl);
  var sortWrapEl = $('sort-wrap'); if (sortWrapEl) $('st-fsg').appendChild(sortWrapEl);

  function curSortKey() { try { return (typeof curSort !== 'undefined' && curSort) || 'terbaru'; } catch (e) { return 'terbaru'; } }
  function setSort(v) {
    /* pakai kotak centang urutan lama (disembunyikan) supaya logikanya tetap satu pintu */
    var cb = document.querySelector('#sort-wrap .sort-check[data-sort="' + v + '"]');
    if (cb) { cb.checked = true; if (typeof cb.onchange === 'function') cb.onchange(); }
    else { try { curSort = v; } catch (er) {} renderStok(); }
  }
  function paintSorts() {
    var cur = curSortKey();
    $('st-sorts').innerHTML = SORTS.map(function (s) { return '<button type="button" data-stsort="' + s[0] + '" class="st-sp' + (s[0] === cur ? ' on' : '') + '">' + s[1] + '</button>'; }).join('');
  }
  function paintMeta() {
    var cnt = $('st-count'); if (!cnt) return;
    var n = '';
    try { if (typeof postsLoaded !== 'undefined' && postsLoaded) n = posts.filter(function (p) { return window.matchesStokFilter(p); }).length; } catch (e) {}
    var filterOn = false;
    try { filterOn = (view === 'ALL' ? allTag !== 'ALL_READY' : curTag !== 'ALL_READY') || (view !== 'ALL' && activeSgFilters.size > 0); } catch (e) {}
    cnt.textContent = n === '' ? '' : (n + ' hasil' + (window.TkCari && window.TkCari.label(query) ? ' · ' + window.TkCari.label(query) : '') + (searching() && filterOn ? ' · filter diabaikan' : ''));
    var fn = $('st-fn'); if (fn) fn.textContent = n === '' ? '' : (n + ' hasil');
    var c = 0;
    if (curSortKey() !== 'terbaru') c++;
    try { if (view === 'ALL') { if (allTag !== 'ALL_READY') c++; } else if (curTag !== getDefaultTag(curGame)) c++; } catch (e) {}
    try { if (view !== 'ALL' && activeSgFilters.size) c++; } catch (e) {}
    var b = $('st-fbadge'); if (b) { b.hidden = !c; b.textContent = c; }
    var x = top.querySelector('.st-fx'); if (x) x.hidden = !inp.value;
    var dot = $('menu-search-dot'); if (dot) dot.hidden = !normQ(query);
  }
  function openFilter() { paintSorts(); paintMeta(); fsheet.hidden = false; sfx('open'); }
  function closeFilter() { if (!fsheet.hidden) { fsheet.hidden = true; sfx('close'); } }
  function resetFilters() {
    allTag = 'ALL_READY';
    if (view !== 'ALL') { try { curTag = getDefaultTag(curGame); } catch (e) {} }
    try { if (activeSgFilters.size) { activeSgFilters.clear(); if (typeof window.renderSgCategoryFilter === 'function') window.renderSgCategoryFilter(); } } catch (e) {}
    setSort('terbaru');
    window.renderTags(); renderStok(); paintSorts();
  }
  fsheet.addEventListener('click', function (e) {
    var s = e.target.closest ? e.target.closest('[data-stsort]') : null;
    if (s) { sfx('filterSelect'); setSort(s.getAttribute('data-stsort')); paintSorts(); paintMeta(); return; }
    var a = e.target.closest ? e.target.closest('[data-st]') : null; if (!a) return;
    var k = a.getAttribute('data-st');
    if (k === 'fclose') closeFilter(); else if (k === 'freset') { sfx('filterSelect'); resetFilters(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilter(); });
  meta.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-st="filter"]')) openFilter(); });
  inp.addEventListener('input', function () {
    clearTimeout(dbT);
    dbT = setTimeout(function () { query = inp.value; renderStok(); }, 160);
    var x = top.querySelector('.st-fx'); if (x) x.hidden = !inp.value;
  });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { try { inp.blur(); } catch (er) {} } });
  top.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-st="clear"]')) { inp.value = ''; query = ''; renderStok(); try { inp.focus(); } catch (er) {} }
  });
  /* jumlah hasil ikut diperbarui tiap daftar stok digambar ulang */
  var oRS = window.renderStok;
  window.renderStok = function () { var r = oRS.apply(this, arguments); try { paintMeta(); } catch (e) {} return r; };

  /* item "Cari akun" di menu Fitur (diletakkan setelah Home) -> langsung ke kolom pencarian */
  function focusSearch() {
    var ps = $('stok-panel');
    if (ps && ps.offsetParent === null) { var t = document.querySelector('[data-tab="stok"]'); if (t) t.click(); }
    setTimeout(function () { try { inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); inp.focus(); } catch (e) {} }, 140);
  }
  function addMenuItem() {
    if ($('menu-search-stok')) return;
    var home = $('menu-go-home'); if (!home || !home.parentNode) return;
    var b = document.createElement('button');
    b.id = 'menu-search-stok'; b.className = home.className;
    b.innerHTML = '<span class="menu-ico flex-shrink-0">' + SVG_SEARCH + '</span><span>Cari akun</span><span id="menu-search-dot" class="st-mdot" hidden></span>';
    b.addEventListener('click', function () { try { closeFiturMenu(); } catch (e) {} setTimeout(focusSearch, 120); });
    home.parentNode.insertBefore(b, home.nextSibling);
  }
  addMenuItem();

  /* ---------- sembunyikan kontrol lama (tetap ada di DOM, dibaca logika lama) ---------- */
  var st = document.createElement('style');
  st.textContent = '#game-toggle-wrap{display:none!important}#sort-wrap .sort-check,#sort-wrap > label{display:none!important}';
  document.head.appendChild(st);

  /* ---------- logo tab ikut berubah saat profil dimuat ---------- */
  var oRP = window.renderProfile;
  if (typeof oRP === 'function') {
    window.renderProfile = function () { var r = oRP.apply(this, arguments); try { paintBar(); addMenuItem(); } catch (e) {} return r; };
  }

  /* ---------- mulai di tampilan Semua ---------- */
  paintBar();
  window.renderTags();
  renderStok();
})();
