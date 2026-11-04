/* 18-fixes.js — dimuat PALING AKHIR (lihat index.php), di luar bundle app.min.js, jadi bundle tidak perlu dibuat ulang.
   1) Musik: toast "Gagal memutar musik" yang muncul padahal lagunya sebenarnya tetap jalan (play() "terpotong"
      saat sumber lagu ditukar ke versi Blob) -> sekarang dicek dulu, kalau audio ternyata jalan, toast diabaikan.
   2) /info: isi halaman baru ditampilkan setelah data link siap (tidak ada bulatan hitam / layar kosong saat refresh). */
(function () {
  'use strict';

  /* ---------- 1. musik ---------- */
  try {
    if (typeof bgMusicTryNextOnError === 'function' && !window.__bgFixOn) {
      window.__bgFixOn = true;
      var origFail = bgMusicTryNextOnError;
      window.bgMusicTryNextOnError = function (failedTrack) {
        var a = document.getElementById('bg-music-audio');
        setTimeout(function () {
          // lagu ternyata lagi jalan (hanya "terpotong" sesaat) -> pulihkan status & jangan tampilkan toast
          if (a && !a.paused && !a.ended && a.readyState >= 2) {
            try { bgMusicAutoSkipCount = 0; bgMusicPlaying = true; bgMusicSetIcon(true); } catch (e) {}
            return;
          }
          origFail(failedTrack);
        }, 700);
      };
    }
  } catch (e) { console.error('18-fixes musik', e); }

  /* ---------- 2. /info tanpa layar kosong ---------- */
  var page = document.getElementById('page-linkbio');
  var links = document.getElementById('linkbio-links');
  var av = document.getElementById('linkbio-avatar');
  if (!page || !links) return;

  function avatarCheck() {
    if (!av) return;
    var src = av.getAttribute('src');
    if (src && av.complete && av.naturalWidth > 0) av.classList.add('lb-av-ok');
  }
  if (av) {
    document.addEventListener('load', function (ev) { if (ev.target === av) avatarCheck(); }, true);
    new MutationObserver(function () { av.classList.remove('lb-av-ok'); avatarCheck(); }).observe(av, { attributes: true, attributeFilter: ['src'] });
  }
  function ready() { page.classList.add('lb-ready'); avatarCheck(); }
  if (links.children.length) ready();
  else {
    try {
      var mo = new MutationObserver(function () { if (links.children.length) { mo.disconnect(); ready(); } });
      mo.observe(links, { childList: true });
    } catch (e) { ready(); }
    // jaga-jaga kalau server data benar-benar tidak menjawab: setelah 6 detik tombol kembali tetap muncul
    setTimeout(ready, 6000);
  }
})();
