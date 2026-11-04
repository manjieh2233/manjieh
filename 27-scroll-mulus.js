/* 27-scroll-mulus.js — scroll toko lebih mulus & foto sudah siap sebelum kelihatan (dimuat SETELAH 25-rental-rak.js, di luar bundle utama).
   1) Foto kartu yang masih jauh di bawah ikut diminta lebih awal (sekitar 2,5 layar ke depan), jadi pas scroll cepat tidak sempat kosong.
      (Atribut loading="lazy" bawaan browser baru memuat ketika sudah dekat; di sini diubah jadi "eager" kalau sudah masuk jangkauan itu.)
   2) Animasi latar (glow & partikel) dijeda selama jari menggeser layar, supaya HP fokus menggambar kartu. Jalan lagi ~0,2 detik setelah berhenti.
   Tidak mengubah tampilan apa pun. Aman dimatikan: hapus file ini dari index.php. */
(function () {
  'use strict';
  /* ---------- 1) foto dimuat lebih awal ---------- */
  var io = null, seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        try { if (en.target.loading === 'lazy') en.target.loading = 'eager'; } catch (e) {}
      });
    }, { rootMargin: '2500px 0px' });
  }
  var queued = false;
  function scan() {
    queued = false;
    if (!io) return;
    var imgs = document.querySelectorAll('#stok-posts img[loading="lazy"], #stok-soldout img[loading="lazy"], #rental-available img[loading="lazy"], #rental-soldout img[loading="lazy"]');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (seen) { if (seen.has(im)) continue; seen.add(im); }
      io.observe(im);
    }
  }
  function queue() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(scan); }
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(queue);
    ['stok-posts', 'stok-soldout', 'rental-available', 'rental-soldout'].forEach(function (id) {
      var el = document.getElementById(id); if (el) mo.observe(el, { childList: true, subtree: true });
    });
  }
  queue();

  /* ---------- 2) animasi latar dijeda saat scroll ---------- */
  var root = document.documentElement, t = 0, on = false;
  function onScroll() {
    if (!on) { on = true; root.classList.add('tk-scrolling'); }
    clearTimeout(t);
    t = setTimeout(function () { on = false; root.classList.remove('tk-scrolling'); }, 200);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();
