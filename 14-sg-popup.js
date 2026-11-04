/* 14-sg-popup.js — Kategori SG (tab Stok > Free Fire) jadi KOTAK MELAYANG, bukan panel yang melebar di bawah tombol.
   Dimuat SETELAH semua JS toko (lihat index.php), jadi file toko & bundle assets/dist tidak perlu diubah.
   Cara kerja:
   - Tombol "Kategori SG" sekarang membuka kotak di tengah layar (latar diburamkan), isinya chip kategori.
   - Pilihan disimpan dulu sebagai draft; baru berlaku saat tekan "Terapkan". "Reset" mengosongkan pilihan.
     Tap area gelap / tombol ✕ / tombol Esc = tutup tanpa mengubah filter.
   - Filter yang dipakai tetap activeSgFilters bawaan toko, jadi logika penyaringan stok tidak berubah. */
(function () {
  'use strict';
  if (typeof activeSgFilters === 'undefined' || typeof renderStok !== 'function') return;

  var MODAL_ID = 'modal-sg';
  var draft = new Set();

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function sfx(name) { try { if (typeof playSfx === 'function') playSfx(name); } catch (e) {} }

  /* ---------- gaya (disuntik lewat JS supaya tidak menambah file CSS) ---------- */
  var st = document.createElement('style');
  st.textContent =
    '#' + MODAL_ID + '{background:rgba(8,5,16,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    'body.reduce-anim #' + MODAL_ID + '{background:rgba(8,5,16,.82);-webkit-backdrop-filter:none;backdrop-filter:none}' +
    '#' + MODAL_ID + ' .sg-pop{width:100%;max-width:26rem;max-height:80vh;max-height:80dvh;display:flex;flex-direction:column;background:#1c142d;color:#f3eefe;border:1px solid rgba(255,255,255,.14);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.6)}' +
    '#' + MODAL_ID + ' .sg-pop-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 18px 12px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#' + MODAL_ID + ' .sg-pop-h h3{margin:0;font-size:16px;font-weight:700}' +
    '#' + MODAL_ID + ' .sg-pop-h p{margin:3px 0 0;font-size:11px;opacity:.55}' +
    '#' + MODAL_ID + ' .sg-pop-x{flex-shrink:0;width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:inherit;cursor:pointer;font-size:14px;line-height:1}' +
    '#' + MODAL_ID + ' .sg-pop-b{padding:14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '#' + MODAL_ID + ' .sg-pop-b .chip-row{gap:.5rem}' +
    '#' + MODAL_ID + ' .sg-pop-empty{text-align:center;font-size:12px;opacity:.55;padding:18px 0}' +
    '#' + MODAL_ID + ' .sg-pop-f{display:flex;gap:10px;padding:12px 16px 16px;border-top:1px solid rgba(255,255,255,.08)}' +
    '#' + MODAL_ID + ' .sg-pop-f button{border-radius:12px;padding:12px 14px;font-size:14px;font-weight:700;cursor:pointer}' +
    '#' + MODAL_ID + ' .sg-pop-f .sg-reset{flex:0 0 auto;min-width:88px}' +
    '#' + MODAL_ID + ' .sg-pop-f .sg-apply{flex:1}' +
    'html.light-theme #' + MODAL_ID + '{background:rgba(246,243,255,.6)}' +
    'html.light-theme #' + MODAL_ID + ' .sg-pop{background:#ffffff;color:#241a3d;border-color:rgba(90,60,140,.2);box-shadow:0 24px 60px rgba(60,30,120,.25)}' +
    'html.light-theme #' + MODAL_ID + ' .sg-pop-h,html.light-theme #' + MODAL_ID + ' .sg-pop-f{border-color:rgba(90,60,140,.14)}' +
    'html.light-theme #' + MODAL_ID + ' .sg-pop-x{background:rgba(90,60,140,.1)}';
  document.head.appendChild(st);

  /* ---------- kerangka kotak ---------- */
  var el = document.createElement('div');
  el.id = MODAL_ID;
  el.className = 'modal-overlay fixed inset-0 z-50 hidden items-center justify-center px-4';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Kategori SG');
  el.innerHTML =
    '<div class="sg-pop">' +
      '<div class="sg-pop-h"><div><h3>Kategori SG</h3><p>Bisa pilih lebih dari satu</p></div>' +
        '<button type="button" class="sg-pop-x" id="sg-pop-x" aria-label="Tutup">✕</button></div>' +
      '<div class="sg-pop-b"><div id="sg-pop-chips" class="chip-row"></div></div>' +
      '<div class="sg-pop-f">' +
        '<button type="button" id="sg-pop-reset" class="btn-ghost sg-reset">Reset</button>' +
        '<button type="button" id="sg-pop-apply" class="primary sg-apply">Terapkan</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);

  function isOpen() { return !el.classList.contains('hidden'); }

  function cats() { try { return getFFSgCategories(); } catch (e) { return []; } }

  function renderChips() {
    var box = $('sg-pop-chips');
    var list = cats();
    if (!list.length) { box.innerHTML = '<p class="sg-pop-empty" style="flex:1 1 100%">Belum ada kategori SG.</p>'; return; }
    box.innerHTML = list.map(function (c) {
      return '<button type="button" data-sgcat="' + esc(c) + '" class="chip ' + (draft.has(c) ? 'active' : '') +
        ' inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">' + esc(c) + '</button>';
    }).join('');
  }
  function renderApplyLabel() {
    $('sg-pop-apply').textContent = draft.size ? 'Terapkan (' + draft.size + ')' : 'Terapkan';
  }

  function open() {
    draft = new Set(activeSgFilters);
    renderChips();
    renderApplyLabel();
    if (typeof openModal === 'function') openModal(MODAL_ID);
    sfx('open');
  }
  function close() {
    if (!isOpen()) return;
    if (typeof closeModal === 'function') closeModal(MODAL_ID);
    sfx('close');
  }
  function apply() {
    activeSgFilters.clear();
    draft.forEach(function (c) { activeSgFilters.add(c); });
    if (typeof closeModal === 'function') closeModal(MODAL_ID);
    sfx('filterSelect');
    window.renderSgCategoryFilter();
    renderStok();
  }

  /* ---------- interaksi ---------- */
  $('sg-pop-chips').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-sgcat]') : null;
    if (!b) return;
    var c = b.getAttribute('data-sgcat');
    if (draft.has(c)) { draft.delete(c); b.classList.remove('active'); } else { draft.add(c); b.classList.add('active'); }
    sfx('filterSelect');
    renderApplyLabel();
  });
  $('sg-pop-reset').addEventListener('click', function () {
    draft.clear();
    renderChips();
    renderApplyLabel();
  });
  $('sg-pop-apply').addEventListener('click', apply);
  $('sg-pop-x').addEventListener('click', close);
  el.addEventListener('click', function (e) { if (e.target === el) close(); });   // tap area gelap = tutup
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });

  /* ---------- ganti perilaku bawaan toko ---------- */
  // Fungsi bawaan menggambar panel chip di bawah tombol. Versi ini hanya mengurus tombol & lencana jumlahnya;
  // chip-nya sekarang ada di kotak melayang di atas. (Dipanggil toko tiap ganti tab/game, jadi harus tetap ada.)
  window.renderSgCategoryFilter = function () {
    var wrap = $('sg-category-wrap');
    var btn = $('sg-category-toggle-btn');
    var badge = $('sg-category-toggle-badge');
    var chevron = $('sg-category-toggle-chevron');
    if (!btn) return;
    if (wrap) { wrap.classList.add('hidden'); wrap.innerHTML = ''; }
    try { sgCategoryPanelOpen = false; } catch (e) {}
    var show = true;
    try { show = (curGame === 'FF') && isFFSgCategoryEnabled(); } catch (e) { show = false; }
    if (!show) {
      btn.classList.add('hidden'); btn.classList.remove('flex');
      if (isOpen()) close();
      return;
    }
    btn.classList.remove('hidden'); btn.classList.add('flex');
    btn.classList.toggle('border-purple-500', activeSgFilters.size > 0);
    if (badge) {
      badge.classList.toggle('hidden', activeSgFilters.size === 0);
      badge.textContent = String(activeSgFilters.size);
    }
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  };
  var toggleBtn = $('sg-category-toggle-btn');
  if (toggleBtn) toggleBtn.onclick = open;
  window.renderSgCategoryFilter();
})();
