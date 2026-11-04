/* 13-track.js — dimuat SETELAH semua file JS lain (lihat index.php & admin.php).
   Tugasnya:
   1) Nangkep error JS / promise / gagal-API di web pengunjung -> dikirim ke track.php (Error Log di Panel Admin).
   2) Nyatet "akun diminati": simpan ke Wishlist & klik tombol WA di halaman detail.
   3) Di web publik: login admin tetap lewat tombol "Admin" di menu Fitur (kotak login langsung muncul, setelah itu
      tetap di beranda). Setelah login, menu Fitur dapat item "Panel Admin" yang membuka /admin. Menu Kelola Konten
      lama (Edit Profil, Kategori, Banner, Instastory, Statistik) disembunyikan karena sudah pindah ke Panel Admin;
      tombol "+" tambah postingan dan "Keluar Admin" TETAP ada di beranda. */
(function () {
  'use strict';
  var IS_ADMIN_PAGE = !!window.__TOUKA_ADMIN__;
  var TRACK_URL = '/track.php';

  function send(payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        if (navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'application/json' }))) return;
      }
      fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- 1) Error log ---------- */
  var seen = {};
  function reportError(kind, msg, src, line) {
    try {
      msg = String(msg || '').slice(0, 300);
      if (!msg) return;
      var key = kind + '|' + msg + '|' + src + '|' + line;
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > 2) return;                 // pesan yang sama cukup dikirim 2x per kunjungan
      send({ t: 'error', kind: kind, msg: msg, src: src || '', line: line || 0, page: location.pathname });
    } catch (e) {}
  }
  window.addEventListener('error', function (ev) {
    // error pemuatan gambar/skrip (target = elemen) diabaikan, yang dicatat cuma error JS beneran
    if (ev && ev.target && ev.target !== window) return;
    var m = (ev && ev.message) || '';
    /* xbrowser / swbrowser = skrip yang disuntik browser bawaan HP (bukan kode toko) -> tidak perlu dicatat */
    if (/ResizeObserver loop|Script error\.?$|\b(xbrowser|swbrowser)\b/i.test(m)) return;
    reportError('js', m, ev && ev.filename, ev && ev.lineno);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    var m = (r && (r.message || r.toString && r.toString())) || 'Promise ditolak';
    reportError('promise', m, '', 0);
  });
  if (typeof window.apiFetch === 'function') {
    var origApiFetch = window.apiFetch;
    window.apiFetch = async function (path, opts) {
      try {
        return await origApiFetch.apply(this, arguments);
      } catch (err) {
        var method = (opts && opts.method) || 'GET';
        var p = String(path || '').replace(/\?.*$/, '');
        /* Gagal menyegarkan data di belakang layar padahal postingan/profil dari server sudah tampil = pengunjung tidak merasakan apa-apa
           (biasanya jaringannya memblokir workers.dev) -> tidak dicatat sebagai error supaya Error Log tidak penuh. */
        var quiet = method === 'GET' && ((p === '/api/posts' && typeof posts !== 'undefined' && posts.length > 0) || (p === '/api/profile' && typeof profileLoaded !== 'undefined' && profileLoaded));
        if (!quiet) reportError('api', method + ' ' + p + ': ' + ((err && err.message) || 'gagal'), '', 0);
        throw err;
      }
    };
  }

  /* ---------- 2) Akun diminati ---------- */
  if (typeof window.toggleWishlist === 'function') {
    var origToggleWishlist = window.toggleWishlist;
    window.toggleWishlist = function (e, id) {
      var res = origToggleWishlist.apply(this, arguments);
      try { if (typeof isWishlisted === 'function' && isWishlisted(id)) send({ t: 'wishlist', pid: id }); } catch (er) {}
      return res;
    };
  }
  document.addEventListener('click', function (ev) {
    try {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href*="wa.me"]');
      if (!a) return;
      var detail = document.getElementById('modal-detail');
      if (!detail || !detail.contains(a)) return;     // cuma tombol WA di halaman detail postingan
      var slug = '';
      var m = decodeURIComponent(a.href.split('text=')[1] || '').match(/https?:\/\/[^\s/]+\/([^\s?#]+)/);
      if (m) slug = m[1];
      if (!slug) slug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ''));
      var post = (slug && typeof resolvePostBySlug === 'function') ? resolvePostBySlug(slug) : null;
      if (post && post.id) send({ t: 'wa', pid: post.id });
    } catch (e) {}
  }, true);

  /* ---------- 3) Web publik: item "Panel Admin" di menu Fitur (muncul setelah login) ---------- */
  if (!IS_ADMIN_PAGE) {
    var st = document.createElement('style');
    st.textContent =
      '#menu-edit-profile,#menu-edit-categories,#menu-edit-banner,#menu-edit-story,#menu-stok-stats{display:none!important}' +
      '#admin-only-items > p{display:none!important}';
    document.head.appendChild(st);
    var box = document.getElementById('admin-only-items');   // kotak ini cuma tampil kalau sudah login admin
    if (box && !document.getElementById('menu-panel-admin')) {
      var b = document.createElement('button');
      b.id = 'menu-panel-admin';
      b.type = 'button';
      b.className = 'flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-white/5';
      b.innerHTML = '<span class="menu-ico flex-shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg></span><span>Panel Admin</span>';
      b.onclick = function () { location.href = '/admin'; };
      box.insertBefore(b, box.firstChild);
    }
  }
})();
