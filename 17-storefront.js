/* 17-storefront.js — dimuat SETELAH semua JS toko (lihat index.php), bundle assets/dist tidak perlu diubah.
   - Bagian Sold Out di bawah stok ready: tab Semua / Free Fire / Mobile Legends.
     Yang tampil awal cuma N akun sold out TERMAHAL (bawaan 10, per tab), sisanya lewat tombol "Lihat N akun sold out lainnya".
     Jumlah awal & teks tombol bisa diatur admin (Panel Admin -> Info Toko -> Sold Out).
   - (Sorotan sekarang diurus 19-toko-admin.js, supaya admin bisa mengaturnya.)
   - Detail postingan Sold Out dari bagian bawah tetap bisa dibuka & digeser. */
(function () {
  'use strict';
  if (typeof renderStok !== 'function' || typeof renderGrid !== 'function') return;

  var soldTab = 'ALL'; // ALL | FF | ML
  function $(id) { return document.getElementById(id); }
  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sfx(n) { try { if (typeof playSfx === 'function') playSfx(n); } catch (e) {} }

  /* ---------- Sold Out di bawah ---------- */
  function priceOf(p) { return +p.price || 0; }
  /* semua sold out di tab itu, diurutkan dari HARGA TERMAHAL (yang sama harga: yang paling baru laku di atas) */
  function soldList(tab) {
    var t = tab || soldTab;
    var l = posts.filter(function (p) {
      return p.type === 'stok' && p.soldOut && (isAdmin || !p.hidden) && (t === 'ALL' || p.game === t);
    });
    l.sort(function (a, b) { return (priceOf(b) - priceOf(a)) || ((b.soldAt || b.createdAt || 0) - (a.soldAt || a.createdAt || 0)); });
    return l;
  }
  /* pengaturan dari admin: profile.soldLimit (jumlah awal) & profile.soldMoreText (teks tombol) */
  function soldLimit() { var n = parseInt(profile && profile.soldLimit, 10); return n >= 1 && n <= 100 ? n : 10; }
  function moreText(rest) {
    var t = (profile && typeof profile.soldMoreText === 'string' && profile.soldMoreText.trim()) || 'Lihat akun sold out lainnya';
    return t.replace(/\{n\}/g, String(rest));
  }
  var soldOpen = { ALL: false, FF: false, ML: false, RB: false };   // tab mana yang sudah dibuka semuanya
  /* daftar yang SEDANG tampil (dipakai juga untuk geser antar detail) */
  function soldShown(tab) {
    var t = tab || soldTab, l = soldList(t);
    return soldOpen[t] ? l : l.slice(0, soldLimit());
  }
  var SVG_ALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>';
  var TABS = [['ALL', 'Semua', 'all'], ['FF', 'Free Fire', 'ff'], ['ML', 'Mobile Legends', 'ml'], ['RB', 'Roblox', 'rb']];
  var NAMES = { ALL: 'Sold Out', FF: 'Free Fire', ML: 'Mobile Legends', RB: 'Roblox' };

  /* logo tab Sold Out: diupload admin lewat Kelola Info & Sorotan -> tab Logo (disimpan di profile.soldLogos) */
  function logoOf(k) {
    try { var l = profile && profile.soldLogos; return (l && typeof l[k] === 'string' && /^(https?:)?\/\//i.test(l[k])) ? l[k] : ''; } catch (e) { return ''; }
  }
  function renderSold() {
    var sec = $('stok-soldout'); if (!sec) return;
    var hide = typeof postsLoaded === 'undefined' || !postsLoaded || (typeof postsLoadFailed !== 'undefined' && postsLoadFailed) || curTag === 'SOLD_OUT';
    var all = hide ? [] : soldList('ALL');
    if (hide || !all.length) { sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');
    $('stok-soldout-tabs').innerHTML = TABS.map(function (t) {
      return '<button type="button" role="tab" class="sold-tab' + (soldTab === t[0] ? ' on' : '') + '" data-st="' + t[0] + '" aria-selected="' + (soldTab === t[0]) + '"><span class="st-dot ' + t[2] + (logoOf(t[0]) ? ' has-img' : '') + '">' + (logoOf(t[0]) ? '<img src="' + esc(logoOf(t[0])) + '" alt="" loading="lazy" decoding="async">' : (t[0] === 'ALL' ? SVG_ALL : '')) + '</span>' + t[1] + '</button>';
    }).join('');
    var full = soldList(), shown = soldShown(), rest = full.length - shown.length;
    $('stok-soldout-title').innerHTML = esc(NAMES[soldTab]) + '<small>' + full.length + ' akun</small>';
    var cols = (profile.gridCols && profile.gridCols.stok) || (defaultProfile.gridCols && defaultProfile.gridCols.stok) || 2;
    var html = renderGrid(shown, 'Belum ada yang sold out di kategori ini.', cols, 'stok-sold', soldTab + '|' + soldOpen[soldTab] + '|' + shown.length);
    if (rest > 0) html += '<div class="sold-more-wrap"><button type="button" class="sold-more" data-sm="open">' + esc(moreText(rest)) + '</button></div>';
    else if (soldOpen[soldTab] && full.length > soldLimit()) html += '<div class="sold-more-wrap"><button type="button" class="sold-more ghost" data-sm="close">Tampilkan lebih sedikit</button></div>';
    $('stok-soldout-list').innerHTML = html;
    if (typeof armGridMore === 'function') armGridMore($('stok-soldout-list'));
  }
  var tabsEl = $('stok-soldout-tabs');
  if (tabsEl) tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-st]') : null; if (!b) return;
    soldTab = b.getAttribute('data-st'); sfx('filterSelect'); renderSold();
  });
  var listEl = $('stok-soldout-list');
  if (listEl) listEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-sm]') : null; if (!b) return;
    var open = b.getAttribute('data-sm') === 'open';
    sfx('filterSelect'); soldOpen[soldTab] = open; renderSold();
    if (!open) { var sec = $('stok-soldout'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' }); }
  });

  var origRenderStok = renderStok;
  window.renderStok = function () { var r = origRenderStok.apply(this, arguments); try { renderSold(); } catch (e) { console.error('renderSold', e); } return r; };

  // buka detail dari bagian Sold Out -> daftar geser = daftar sold out yang lagi tampil
  if (typeof getDetailFeedList === 'function') {
    var origFeed = getDetailFeedList;
    window.getDetailFeedList = function (post) {
      var l = origFeed.apply(this, arguments);
      if (post && post.type === 'stok' && post.soldOut && l.indexOf(post) < 0) {
        var s = soldShown(); return s.indexOf(post) < 0 ? [post] : s;
      }
      return l;
    };
  }

  window.__renderSold = renderSold; // dipanggil 19-toko-admin.js setelah profil (logo tab) dimuat
  try { renderSold(); } catch (e) {}
})();
