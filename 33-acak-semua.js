/* 33-acak-semua.js — urutan stok di tab "Semua" diacak berkala (dimuat SETELAH 22-stok-tabs.js, di luar bundle utama).
   Aturan (hanya tab Semua + urutan "Terbaru"; kalau pengunjung memilih Termurah/Termahal urutannya tetap harga):
     1) Postingan yang disematkan (pin) tetap di paling atas.
     2) NEW STOK (diupload < 24 jam) berikutnya, urut dari yang paling baru.
     3) Sisanya DIACAK: stok lama di bawah bisa naik ke atas, campur FF & ML. Acakannya sama untuk semua pengunjung dan
        berganti tiap X jam (diatur admin di Dashboard: "Acak stok di tab Semua"; bawaan 1 jam; 0 = mati = urutan lama).
   Tab Free Fire / Mobile Legends tidak diacak. Dibaca dari profile.acakSemuaJam (jam) dan profile.acakSemuaSeed (tombol "Acak ulang sekarang"). */
(function () {
  'use strict';
  if (typeof sortListBySort !== 'function') return;
  var DEFAULT_HOURS = 1, DAY = 24 * 3600 * 1000;
  var oSort = sortListBySort;

  function hours() {
    var h = (typeof profile !== 'undefined' && profile) ? profile.acakSemuaJam : undefined;
    h = (h === undefined || h === null || h === '') ? DEFAULT_HOURS : parseFloat(h);
    return isFinite(h) && h > 0 ? h : 0;
  }
  function inAllView() {
    var t = document.querySelector('#stok-game-tabs .st-tab.on');
    return !t || t.getAttribute('data-stv') === 'ALL';
  }
  /* angka acak 0..1 yang tetap untuk (id postingan + periode) */
  function key(id, salt) {
    var s = String(id) + '|' + salt, h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  window.sortListBySort = function (list, sort) {
    var base = oSort.apply(this, arguments);
    var hr = hours();
    if (sort !== 'terbaru' || !hr || !inAllView()) return base;
    var period = Math.floor(Date.now() / (hr * 3600 * 1000));
    var salt = period + '|' + ((profile && profile.acakSemuaSeed) || 0);
    var now = Date.now();
    var pinned = [], fresh = [], rest = [];
    base.forEach(function (p) {
      if (p.pinned) pinned.push(p);
      else if (!p.soldOut && !p.hidden && postFreshTime(p) && (now - postFreshTime(p)) < DAY) fresh.push(p);
      else rest.push(p);
    });
    rest.sort(function (a, b) { return key(a.id, salt) - key(b.id, salt); });
    return pinned.concat(fresh, rest);
  };
  window.acakSemuaInfo = function () { return { jam: hours() }; };
  try { if (typeof renderStok === 'function' && typeof postsLoaded !== 'undefined' && postsLoaded) renderStok(); } catch (e) {}
})();
