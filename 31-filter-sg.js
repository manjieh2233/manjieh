/* 31-filter-sg.js — "Kategori SG" di lembar Filter Stok (dimuat SETELAH 14-sg-popup.js & 22-stok-tabs.js, di luar bundle utama).
   - Kategori yang ditandai bintang di Panel Admin (default: OPM, REAPER/REPPER, DIGIMON) LANGSUNG terlihat sebagai chip di lembar Filter;
     menekannya langsung memilih / melepas kategori itu.
   - Daftar lengkap tetap ada di kotak melayang lama (14-sg-popup.js): dibuka lewat tombol "Kategori SG lainnya" -> tidak penuh.
   - Pilihan memakai activeSgFilters bawaan toko, jadi logika penyaringan stok tidak berubah.
   Menggantikan renderSgCategoryFilter() milik 14-sg-popup.js (yang tadinya cuma mengurus tombol & lencana). */
(function () {
  'use strict';
  var wrap = document.getElementById('sg-category-wrap'), btn = document.getElementById('sg-category-toggle-btn'), sec = document.getElementById('st-fsg');
  if (!wrap || !btn || !sec || typeof renderSgCategoryFilter !== 'function' || typeof getFFSgPinned !== 'function') return;

  /* urutan di lembar Filter: judul kecil, chip kategori, tombol "lainnya" */
  var label = document.createElement('div');
  label.className = 'st-flabel'; label.id = 'st-fsg-label'; label.textContent = 'Kategori SG'; label.hidden = true;
  sec.insertBefore(label, sec.firstChild);
  wrap.className = 'st-sgwrap hidden'; wrap.removeAttribute('style');
  sec.insertBefore(wrap, label.nextSibling);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chip(cat) {
    var on = activeSgFilters.has(cat);
    return '<button type="button" data-sgcat="' + esc(cat) + '" class="chip ' + (on ? 'active' : '') + ' inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">' + ICON_CHECK_GLASS + esc(cat) + '</button>';
  }

  window.renderSgCategoryFilter = function () {
    var badge = document.getElementById('sg-category-toggle-badge'), chevron = document.getElementById('sg-category-toggle-chevron');
    var txt = btn.querySelector('span');
    /* tampilan "Semua" tidak memakai filter SG (cuma tab Free Fire), jadi disembunyikan di sana */
    var tabOn = document.querySelector('#stok-game-tabs .st-tab.on');
    var inAll = !!tabOn && tabOn.getAttribute('data-stv') === 'ALL';
    var hideAll = inAll || curGame !== 'FF' || !isFFSgCategoryEnabled();
    var all = hideAll ? [] : getFFSgCategories();
    try { sgCategoryPanelOpen = false; } catch (e) {}
    if (!all.length) {
      wrap.classList.add('hidden'); wrap.innerHTML = '';
      btn.classList.add('hidden'); btn.classList.remove('flex'); label.hidden = true;
      return;
    }
    var up = function (s) { return String(s).trim().toUpperCase(); };
    var pins = getFFSgPinned().map(up);
    var shown = all.filter(function (c) { return pins.indexOf(up(c)) > -1; });
    var rest = all.filter(function (c) { return pins.indexOf(up(c)) < 0; });
    label.hidden = false;

    wrap.classList.toggle('hidden', !shown.length);
    wrap.innerHTML = shown.length ? '<div class="chip-row st-sgrow">' + shown.map(chip).join('') + '</div>' : '';

    if (!rest.length) { btn.classList.add('hidden'); btn.classList.remove('flex'); }
    else {
      btn.classList.remove('hidden'); btn.classList.add('flex');
      if (txt) txt.textContent = shown.length ? 'Kategori SG lainnya' : 'Kategori SG';
      var nOn = rest.filter(function (c) { return activeSgFilters.has(c); }).length;
      btn.classList.toggle('border-purple-500', nOn > 0);
      if (badge) { badge.classList.toggle('hidden', nOn === 0); badge.textContent = String(nOn); }
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
    wrap.querySelectorAll('[data-sgcat]').forEach(function (b) {
      b.onclick = function () {
        playSfx('filterSelect');
        var cat = b.dataset.sgcat;
        if (activeSgFilters.has(cat)) activeSgFilters.delete(cat); else activeSgFilters.add(cat);
        window.renderSgCategoryFilter();
        renderStok();
      };
    });
  };
  /* ikut diperbarui tiap tab game / chip diganti (22-stok-tabs.js menyembunyikan tombol SG di "Semua" tanpa memanggil fungsi ini) */
  var oRT = window.renderTags;
  if (typeof oRT === 'function') window.renderTags = function () { var r = oRT.apply(this, arguments); window.renderSgCategoryFilter(); return r; };
  window.renderSgCategoryFilter();
})();
