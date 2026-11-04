/* 25-rental-rak.js — tampilan Rental per paket harga (rak yang bisa digeser kanan-kiri). Dimuat SETELAH 22-stok-tabs.js (di luar bundle utama).
   - Rental tersedia dikelompokkan per kategori harga (6K/Jam, 8K/Jam, dst): satu rak per paket, kartu digeser ke samping.
   - Tiap rak punya keterangan "Geser →" di samping judulnya (hilang setelah rak itu digeser) + kartu berikutnya sedikit kelihatan
     + bayangan di tepi kanan, supaya pembeli paham. Di layar dengan mouse ada tombol ‹ ›.
   - Tombol game ("Free Fire") disembunyikan kalau cuma ada satu game rental. Baris chip harga lama diganti rak ini.
   - Chip kategori (REAPER, OPM, dst) tetap jadi filter tambahan untuk semua rak.
   - Bagian Rental yang sudah disewa (Sold Out) tidak berubah. */
(function () {
  'use strict';
  if (typeof renderRental !== 'function' || typeof renderRentalGames !== 'function' || typeof renderRentalTags !== 'function' ||
      typeof postThumb !== 'function' || typeof getRentalTags !== 'function' || typeof renderGrid !== 'function') return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* geser-untuk-bookmark & tahan-untuk-preview di kartu bentrok dengan geser rak, jadi atributnya dilepas dari kartu di dalam rak
     (tombol bookmark di pojok kartu tetap ada) */
  var SWIPE_ATTR = /\s(?:ontouchstart|ontouchmove|ontouchend|ontouchcancel|onmousedown|onmousemove|onmouseup|onmouseleave)="[^"]*"/g;
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

  /* ---------- tombol game & chip harga lama ---------- */
  var origGames = renderRentalGames;
  window.renderRentalGames = function () {
    var r = origGames.apply(this, arguments);
    var w = $('rental-games-wrap');
    if (w) w.style.display = getRentalGames().length > 1 ? '' : 'none';
    return r;
  };
  window.renderRentalTags = function () {
    var w = $('rental-tags-wrap'); if (w) w.innerHTML = '';
    curRentalTag = 'ALL_READY';
    renderRentalSgFilter();
  };

  /* ---------- rak ---------- */
  function cardsOf(list) {
    return list.map(function (p, i) {
      var h = '';
      try { h = postThumb(p, i); } catch (e) { console.error('postThumb error', p && p.id, e); }
      return h ? '<div class="rk-cell">' + h.replace(SWIPE_ATTR, '') + '</div>' : '';
    }).join('');
  }
  function groupsOf(avail) {
    var tags = getRentalTags(curRentalGame) || [], seen = {}, groups = [];
    tags.forEach(function (t) {
      seen[t.v] = 1;
      var l = avail.filter(function (p) { return p.rentalTag === t.v; });
      if (l.length) groups.push({ l: t.l, list: l });
    });
    var rest = avail.filter(function (p) { return !seen[p.rentalTag]; });
    if (rest.length) groups.push({ l: groups.length ? 'Lainnya' : 'Rental tersedia', list: rest });
    groups.forEach(function (g) { g.list = g.list.slice().sort(function (a, b) { return getRentalShuffleKey(a.id) - getRentalShuffleKey(b.id); }); });
    return groups;
  }
  function shelvesHtml(groups) {
    return groups.map(function (g, i) {
      return '<section class="rk-shelf" data-rk="' + esc(g.l) + '"><div class="rk-head"><h3 class="rk-title">' + esc(g.l) + '</h3><span class="rk-n">' + g.list.length + ' akun</span>' +
        '<span class="rk-hint" aria-hidden="true">Geser ' + ARROW + '</span>' +
        '<span class="rk-nav"><button type="button" class="rk-b" data-rk-dir="-1" aria-label="Sebelumnya">‹</button><button type="button" class="rk-b" data-rk-dir="1" aria-label="Berikutnya">›</button></span></div>' +
        '<div class="rk-row">' + cardsOf(g.list) + '</div></section>';
    }).join('');
  }

  function measure(box) {
    var shelves = box.querySelectorAll('.rk-shelf');
    for (var i = 0; i < shelves.length; i++) {
      var sh = shelves[i], row = sh.querySelector('.rk-row');
      var over = row.scrollWidth > row.clientWidth + 4;
      sh.classList.toggle('rk-more', over);
      sh.classList.toggle('rk-end', !over || row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
    }
  }
  function wire(box) {
    var rows = box.querySelectorAll('.rk-row');
    Array.prototype.forEach.call(rows, function (row) {
      var sh = row.parentNode;
      row.addEventListener('scroll', function () {
        sh.classList.toggle('rk-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
        if (row.scrollLeft > 8) sh.classList.add('rk-moved');
      }, { passive: true });
    });
    measure(box);
    /* tab Rental sering digambar saat masih tersembunyi (lebar 0): ukur ulang begitu kotaknya benar-benar tampil / berubah ukuran */
    if (window.ResizeObserver && !box._rkRO) { box._rkRO = new ResizeObserver(function () { requestAnimationFrame(function () { measure(box); }); }); box._rkRO.observe(box); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-rk-dir]') : null; if (!b) return;
    var row = b.closest('.rk-shelf').querySelector('.rk-row');
    row.scrollBy({ left: (+b.getAttribute('data-rk-dir')) * row.clientWidth * 0.8, behavior: 'smooth' });
  });
  var rsT = 0;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { var b = $('rental-available'); if (b) measure(b); }, 150); });

  /* ---------- renderRental baru ---------- */
  var origRental = renderRental;
  window.renderRental = function () {
    var box = $('rental-available');
    if (!postsLoaded || !box) return origRental.apply(this, arguments);     // kerangka muat lama
    var fallbackGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
    var inGame = function (p) { return p.type === 'rental' && (isAdmin || !p.hidden) && (p.rentalGame || fallbackGame) === curRentalGame; };
    var avail = posts.filter(function (p) {
      return inGame(p) && !p.soldOut &&
        (!isRentalSgCategoryEnabled() || !activeRentalSgFilters.size || (Array.isArray(p.rentalSgCategories) && Array.from(activeRentalSgFilters).every(function (c) { return p.rentalSgCategories.includes(c); })));
    });
    var sold = posts.filter(function (p) { return inGame(p) && p.soldOut; });
    var cols = (profile.gridCols && profile.gridCols.rental) || defaultProfile.gridCols.rental;

    if (postsLoadFailed || !avail.length) {
      box.innerHTML = renderGrid(avail, 'Belum ada rental tersedia — silakan hubungi via WA.', cols, 'rental-av', curRentalGame);
    } else {
      var keep = {};   // posisi geser tiap rak dipertahankan waktu data dimuat ulang otomatis
      Array.prototype.forEach.call(box.querySelectorAll('.rk-shelf'), function (sh) { keep[sh.getAttribute('data-rk')] = sh.querySelector('.rk-row').scrollLeft; });
      box.innerHTML = shelvesHtml(groupsOf(avail));
      Array.prototype.forEach.call(box.querySelectorAll('.rk-shelf'), function (sh) {
        var x = keep[sh.getAttribute('data-rk')]; if (x) sh.querySelector('.rk-row').scrollLeft = x;
      });
      wire(box);
    }
    var wrap = $('rental-soldout-wrap'), sbox = $('rental-soldout');
    if (wrap) wrap.style.display = sold.length ? '' : 'none';
    if (sbox) { sbox.innerHTML = renderGrid(sold, '', cols, 'rental-sold', curRentalGame); armGridMore(sbox); }
  };

  /* gambar ulang sekarang (data toko mungkin sudah ada dari cache server) */
  try { window.renderRentalGames(); window.renderRentalTags(); window.renderRental(); } catch (e) { console.error('25-rental-rak', e); }
})();
