/* 39-glow-kategori.js — warna animasi kilau/gradien kartu (yang geser kiri→kanan pas kartu ditekan) bisa BEDA per kategori:
   Stok FF, Stok ML, Rental. Tambahan saja: warna "Default" lama tetap jalan (dipakai kategori yang belum diatur).
   Disimpan di field lama profile.cardPressGradientColor sebagai teks, mis. "#facc15|ff:#a855f7|ml:#ec4899|rental:#22d3ee"
   (teks hex biasa dari versi lama tetap terbaca = default semua kategori). Dimuat di toko & panel admin. */
(function () {
  'use strict';
  var KEYS = [['ff', 'FF'], ['ml', 'ML'], ['rental', 'Rental']];
  var HEX = /^#[0-9a-f]{6}$/i;
  function parse(v) {
    var o = { def: '', ff: '', ml: '', rental: '' };
    String(v || '').split('|').forEach(function (t) {
      t = t.trim(); if (!t) return;
      var m = /^([a-z]+):(#[0-9a-f]{6})$/i.exec(t);
      if (m) { var k = m[1].toLowerCase(); if (k in o && k !== 'def') o[k] = m[2]; }
      else if (HEX.test(t)) o.def = t;
    });
    return o;
  }
  function encode(o) {
    var p = []; if (o.def) p.push(o.def);
    KEYS.forEach(function (k) { if (o[k[0]]) p.push(k[0] + ':' + o[k[0]]); });
    return p.join('|');
  }
  function rgb(hex) {
    if (typeof hexToRgbString === 'function') return hexToRgbString(hex);
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
    return m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : null;
  }

  /* CSS: tiap jenis kartu ambil warnanya sendiri (default kuning keemasan kalau belum diatur) */
  if (!document.getElementById('cg-style')) {
    var st = document.createElement('style'); st.id = 'cg-style';
    st.textContent = '.stock-card{--card-glow-rgb:var(--cg-ff,250,204,21)}.stock-card-ml{--card-glow-rgb:var(--cg-ml,250,204,21)}.stock-card.rp-card{--card-glow-rgb:var(--cg-rental,250,204,21)}';
    document.head.appendChild(st);
  }

  /* terapkan warna dari profil (dipanggil renderProfile + preview live di menu Profil) */
  var oApply = window.applyCardGlowColor;
  window.applyCardGlowColor = function (v) {
    var o = parse(v), root = document.documentElement.style, d = rgb(o.def);
    if (typeof oApply === 'function') oApply.call(this, o.def);
    KEYS.forEach(function (k) { var c = rgb(o[k[0]]) || d; if (c) root.setProperty('--cg-' + k[0], c); else root.removeProperty('--cg-' + k[0]); });
  };
  try { if (typeof profile !== 'undefined' && profile && profile.cardPressGradientColor) window.applyCardGlowColor(profile.cardPressGradientColor); } catch (e) {}

  /* 3 pemilih warna di menu Profil, tepat di bawah warna "Default" */
  var state = { ff: '', ml: '', rental: '' };
  function defPicker() { return document.getElementById('pf-card-glow-color'); }
  function build() {
    var d = defPicker(); if (!d || document.getElementById('cg-multi')) return;
    var row = d.closest ? d.closest('.pf-color') : d.parentNode; if (!row) return;
    row.insertAdjacentHTML('afterend', '<div id="cg-multi" class="pf-color" style="flex-wrap:wrap;gap:10px">' +
      KEYS.map(function (k) { return '<label style="display:flex;align-items:center;gap:6px;font-size:12px">' + k[1] + ' <input type="color" id="cg-' + k[0] + '" /></label>'; }).join('') +
      '<button type="button" id="cg-reset" class="press-glow btn-ghost">Samakan</button></div>');
    KEYS.forEach(function (k) {
      document.getElementById('cg-' + k[0]).oninput = function (e) { state[k[0]] = e.target.value; preview(); };
    });
    document.getElementById('cg-reset').onclick = function () { state = { ff: '', ml: '', rental: '' }; fill(parse(currentRaw())); preview(); };
  }
  function currentRaw() { try { return profile.cardPressGradientColor || ''; } catch (e) { return ''; } }
  function fill(o) {
    var d = defPicker(); build();
    state = { ff: o.ff, ml: o.ml, rental: o.rental };
    if (d) d.value = o.def || '#facc15';
    try { pfCardGlowColor = o.def || ''; } catch (e) {}
    KEYS.forEach(function (k) { var i = document.getElementById('cg-' + k[0]); if (i) i.value = o[k[0]] || o.def || '#facc15'; });
  }
  function preview() {
    var o = { def: '' }; try { o.def = pfCardGlowColor || ''; } catch (e) {}
    KEYS.forEach(function (k) { o[k[0]] = state[k[0]]; });
    window.applyCardGlowColor(encode(o));
  }
  /* kalau warna Default diganti, preview ikut */
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'pf-card-glow-color') setTimeout(preview, 0); }, true);
  var mp = document.getElementById('menu-edit-profile');
  if (mp) mp.addEventListener('click', function () { setTimeout(function () { fill(parse(currentRaw())); }, 0); });

  /* saat Simpan Profil: gabungkan Default + warna per kategori jadi satu teks */
  if (typeof window.saveProfile === 'function') {
    var osp = window.saveProfile;
    window.saveProfile = function (p) {
      try {
        if (p && Object.prototype.hasOwnProperty.call(p, 'cardPressGradientColor') && document.getElementById('cg-multi')) {
          var o = parse(p.cardPressGradientColor);
          KEYS.forEach(function (k) { o[k[0]] = state[k[0]] || ''; });
          p.cardPressGradientColor = encode(o);
        }
      } catch (e) { console.error('39-glow-kategori', e); }
      return osp.apply(this, arguments);
    };
  }
  build();
})();
