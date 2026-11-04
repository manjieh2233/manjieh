/* 00-net-fallback.js — dimuat PALING AKHIR sebelum track (lihat index.php/admin.php), membungkus fetch() terluar.
   Kalau panggilan ke Worker (workers.dev) gagal dari HP pengunjung (Failed to fetch / timeout), otomatis
   diulang lewat /api-proxy.php di domain toukaenay.com sendiri. Setelah itu error-nya tidak masuk Error Log
   karena panggilannya berhasil. Gambar dari workers.dev yang gagal dimuat juga dicoba lewat proxy yang sama. */
(function () {
  'use strict';
  var W = 'https://touka-api.nayyprib.workers.dev', P = '/api-proxy.php?u=';
  var of = window.fetch;
  if (typeof of !== 'function' || window.__netFallback) return;
  window.__netFallback = true;
  /* Ingatan "workers.dev lagi bermasalah" disimpan di localStorage (bukan sessionStorage) supaya tetap ada setelah browser ditutup lalu dibuka lagi;
     sebelumnya hilang saat browser ditutup, jadi tiap buka lagi harus menunggu workers.dev gagal dulu (muter-muter) baru pindah ke proxy. Berlaku 30 menit, lalu dicoba langsung lagi. */
  var BAD_MS = 30 * 60 * 1000, badUntil = 0;
  try { badUntil = +localStorage.getItem('touka_direct_bad') || 0; } catch (e) {}
  if (badUntil > Date.now() + BAD_MS) badUntil = 0;
  function markBad() { badUntil = Date.now() + BAD_MS; try { localStorage.setItem('touka_direct_bad', String(badUntil)); } catch (e) {} }
  function viaProxy(path, init) { return of.call(window, P + encodeURIComponent(path), init); }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(W) !== 0) return of.apply(this, arguments);
    var path = url.slice(W.length), method = ((init && init.method) || 'GET').toUpperCase();
    var self = this, args = arguments;
    if (Date.now() < badUntil) {
      return viaProxy(path, init).then(function (r) { if (r.status === 502 || r.status === 501) throw new Error('proxy'); return r; })
        .catch(function () { return of.apply(self, args); });
    }
    return new Promise(function (resolve, reject) {
      var done = false, failed = 0, timer = null;
      function ok(r) { if (!done) { done = true; clearTimeout(timer); resolve(r); } }
      function bad(e) { failed++; if (failed >= 2 && !done) { done = true; clearTimeout(timer); reject(e); } }
      function startProxy() {
        viaProxy(path, init).then(function (r) { if (r.status === 502 || r.status === 501 || r.status === 400) throw new Error('proxy'); ok(r); }).catch(bad);
      }
      of.apply(self, args).then(ok).catch(function (e) { clearTimeout(timer); markBad(); if (method === 'GET' || e instanceof TypeError) startProxy(); else if (!done) { done = true; reject(e); } failed++; });
      if (method === 'GET') timer = setTimeout(function () { if (!done) startProxy(); }, 4500);
    });
  };
  document.addEventListener('error', function (ev) {
    var t = ev.target;
    if (!t || t.tagName !== 'IMG' || t.__viaProxy) return;
    var s = t.getAttribute('src') || '';
    if (s.indexOf(W + '/img/') !== 0) return;
    t.__viaProxy = true;
    t.src = P + encodeURIComponent(s.slice(W.length));
  }, true);
})();
