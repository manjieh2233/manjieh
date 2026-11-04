/* 24-sorotan-viewer.js — penampil Sorotan ala TikTok / Instagram (dimuat SETELAH 19-toko-admin.js, di luar bundle).
   Menggantikan 20-sorotan-viewer.js (sudah dihapus).
   - Layar penuh, progress bar per slide, ketuk kiri = mundur, ketuk kanan = maju, TAHAN = jeda, geser ke bawah = tutup.
   - Foto 9:16 memenuhi layar; foto 1:1 / 4:5 / dll tampil utuh di tengah (tidak di-zoom), latarnya blur dari foto itu sendiri.
   - Bar bawah: kotak gelap berisi 3 emoji (😍 😂 😳), hati (jadi merah kalau disuka), dan share. Tanpa angka, tanpa kolom pesan.
   - Ketuk emoji / hati: beberapa emoji naik dari bawah, lalu blur & hilang.
   - Lagu (opsional, diatur admin per sorotan): otomatis main saat sorotan dibuka, berulang, tidak bisa dimatikan pengunjung.
     Cuma ada ikon not di kanan atas. Musik latar toko dijeda selama sorotan terbuka, lalu lanjut lagi saat ditutup.
   - Hitungan disimpan di server lewat sorotan.php (1 pengunjung = 1 like + 1 emoji aktif per slide); angkanya hanya tampil di Panel Admin.
   Dipanggil oleh 19-toko-admin.js lewat window.TkSor.open(view). */
(function () {
  'use strict';

  var EMO = ['😍', '😂', '😳'];
  var EI = [5, 6, 7];            /* nomor emoji ini di sorotan.php (0-4 = emoji lama, dibiarkan supaya hitungan lama tidak tertukar) */
  var HOLD_MS = 220;
  var LIST = [], LI = 0, holdS = false;   /* daftar semua sorotan (untuk pindah kanan/kiri) + tahan di strip bawah */
  var API = '/sorotan.php';
  var CONTAIN_ABOVE = 0.72;      /* lebar/tinggi di atas ini (mis. 1:1, 4:5) = tampil utuh; di bawahnya (9:16) = penuh */
  var REDUCE = false;
  try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { try { if (typeof showToast === 'function') showToast(m); } catch (e) {} }
  function noop() {}

  /* id pengunjung anonim (untuk membatasi 1 like / 1 emoji per slide) */
  var memVid = '';
  function vid() {
    try {
      var v = localStorage.getItem('tk_vid');
      if (v && /^[A-Za-z0-9_\-]{8,48}$/.test(v)) return v;
      v = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      localStorage.setItem('tk_vid', v);
      return v;
    } catch (e) {
      if (!memVid) memVid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      return memVid;
    }
  }
  function blank() { return { l: 0, ml: 0, mr: -1 }; }
  function clone(o) { return { l: o.l, ml: o.ml, mr: o.mr }; }

  var root = null, card = null, media = null, low = null, stripOn = false, V = null, idx = 0, stats = {}, paused = false, holdT = 0, held = false;
  var down = null, blockUntil = 0, progUntil = 0, userNav = false;

  var NOTE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  var HEART_ICO = '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  var X_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  var HEX = /^#[0-9a-f]{6}$/i, FK = ['mont', 'bebas', 'anton', 'play', 'pacif', 'dance', 'caveat', 'marker', 'type', 'lex'], fontsOn = false;
  function ensureFonts() {
    if (fontsOn) return; fontsOn = true;
    try { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Lexend:wght@800&family=Montserrat:wght@800&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@600&family=Special+Elite&display=swap'; document.head.appendChild(l); } catch (e) {}
  }
  var SHARE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'sr-viewer'; root.className = 'srv'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Sorotan');
    root.innerHTML =
      '<div class="srv-card">' +
        '<div class="srv-media">' +
          '<img class="srv-blur" alt="" draggable="false">' +
          '<div class="srv-stage"><img class="srv-img" alt="" draggable="false"></div>' +
          '<div class="srv-shade"></div>' +
          '<div class="srv-items"></div>' +
          '<div class="srv-bars"></div>' +
          '<div class="srv-head"><span class="srv-av"></span><div class="srv-t"><b></b></div><span class="srv-note" hidden aria-hidden="true"><b class="srv-nb"></b><i>' + NOTE_ICO + '</i></span><button type="button" class="srv-edit" hidden aria-label="Edit sorotan">✎</button><button type="button" class="srv-x" aria-label="Tutup">' + X_ICO + '</button></div>' +
          '<div class="srv-zone"></div>' +
          '<div class="srv-pi" aria-hidden="true"></div>' +
          '<div class="srv-intro"><span></span></div>' +
        '</div>' +
        '<div class="srv-low">' +
          '<div class="srv-bar">' +
            EMO.map(function (e, i) { return '<button type="button" class="srv-e" data-e="' + i + '" aria-label="Reaksi ' + e + '"><span>' + e + '</span></button>'; }).join('') +
            '<button type="button" class="srv-act srv-like" aria-label="Suka">' + HEART_ICO + '</button>' +
            '<button type="button" class="srv-act srv-share" aria-label="Bagikan">' + SHARE_ICO + '</button>' +
          '</div>' +
          '<div class="srv-strip"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    card = root.querySelector('.srv-card'); media = root.querySelector('.srv-media'); low = root.querySelector('.srv-low');

    root.querySelector('.srv-x').addEventListener('click', function () { close(); });
    root.querySelector('.srv-edit').addEventListener('click', function () {
      var sid = V && V.id, sl = cur(), lid = sl && sl.id; close();
      setTimeout(function () { if (window.TkSE) window.TkSE.open(sid, lid); }, 350);
    });
    window.addEventListener('popstate', function () { if (root && !root.hidden) close(true); });
    root.querySelector('.srv-intro').addEventListener('pointerdown', endIntro);
    window.addEventListener('resize', function () { fit(); var im0 = root && root.querySelector('.srv-img'); if (im0 && im0.complete && im0.naturalWidth && !root.hidden) fitImg(im0); });
    /* ketukan di dalam sorotan tidak boleh tembus ke halaman di belakangnya (mis. bulatan Topup) */
    root.addEventListener('click', function (e) { if (!(e.target.closest && e.target.closest('a,button'))) { e.preventDefault(); } e.stopPropagation(); });
    document.addEventListener('click', function (e) { if (Date.now() < blockUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
    root.querySelector('.srv-bar').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.srv-e') : null; if (b) react(+b.getAttribute('data-e'), b);
    });
    root.querySelector('.srv-like').addEventListener('click', function () { like(); });
    root.querySelector('.srv-share').addEventListener('click', share);
    root.querySelector('.srv-bars').addEventListener('animationend', function (e) {
      if (e.animationName === 'srvbar' && !paused) go(idx + 1);
    });
    var strip = root.querySelector('.srv-strip');
    function sOn() { holdS = true; applyPause(); }
    function sOff() { holdS = false; applyPause(); }
    strip.addEventListener('touchstart', sOn, { passive: true }); strip.addEventListener('touchend', sOff); strip.addEventListener('touchcancel', sOff);
    strip.addEventListener('mousedown', sOn); document.addEventListener('mouseup', function () { if (holdS) sOff(); });
    /* geser strip = ganti foto story mengikuti thumbnail yang ada di tengah (seperti Instagram) */
    var scRaf = 0;
    strip.addEventListener('scroll', function () {
      if (Date.now() < progUntil || scRaf) return;
      scRaf = requestAnimationFrame(function () {
        scRaf = 0; if (!V || Date.now() < progUntil) return;
        var th = strip.children, mid = strip.scrollLeft + strip.clientWidth / 2, best = -1, bd = 1e9;
        for (var k = 0; k < th.length; k++) { var d = Math.abs(th[k].offsetLeft + th[k].offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } }
        if (best >= 0 && best !== idx) { userNav = true; show(best); userNav = false; }
      });
    }, { passive: true });
    strip.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.srv-th'); if (b) go(+b.getAttribute('data-i')); });
    var im = root.querySelector('.srv-img');
    im.addEventListener('load', function () { fitImg(im); });
    im.addEventListener('error', function () { im.style.cssText = ''; });

    /* ketuk / tahan / geser */
    var zone = root.querySelector('.srv-zone');
    zone.addEventListener('pointerdown', function (e) {
      retryPlay();
      down = { x: e.clientX, y: e.clientY, t: Date.now() }; held = false;
      clearTimeout(holdT);
      holdT = setTimeout(function () { held = true; setPause(true); }, HOLD_MS);
    });
    function up(e) {
      if (!down) return;
      clearTimeout(holdT);
      var dx = (e.clientX || 0) - down.x, dy = (e.clientY || 0) - down.y, dt = Date.now() - down.t;
      var wasHeld = held; down = null; held = false; setPause(false);
      if (e.type === 'pointercancel') return;
      if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) return;   /* geser bawah tidak menutup: tutup hanya lewat X / tombol kembali */
      if (!wasHeld && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {   /* geser kiri = sorotan berikutnya, geser kanan = sebelumnya */
        if (dx < 0) nextSor(); else if (LI > 0) prevSor();
        return;
      }
      if (wasHeld || Math.abs(dx) > 14 || Math.abs(dy) > 14 || dt > 600) return;
      stripOn = false; applyPause();   /* ketuk = balik ke tampilan normal (emoji muncul lagi) */
      var f = (e.clientX - zone.getBoundingClientRect().left) / zone.getBoundingClientRect().width;
      if (f < 0.3) go(idx - 1); else go(idx + 1);   /* ketuk kanan = berikutnya, ketuk kiri = sebelumnya (seperti Instagram) */
    }
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
      if (!root || root.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(idx + 1); else if (e.key === 'ArrowLeft') go(idx - 1);
    });
    document.addEventListener('visibilitychange', function () { if (root && !root.hidden) setPause(document.hidden); });
  }

  /* ---------- foto: tampil sesuai pengaturan admin; kalau tidak diatur: 9:16 penuh, selain itu utuh (tidak di-zoom) ---------- */
  function fitImg(im) {
    var w = im.naturalWidth, h = im.naturalHeight, s = cur(), css = '';
    try { if (s && window.TKA && TKA.photoCss && media) css = TKA.photoCss(s, media.clientWidth, media.clientHeight, w, h); } catch (e) {}
    im.style.cssText = css;
    im.classList.toggle('srv-contain', !css && !!(w && h) && w / h > CONTAIN_ABOVE);
  }

  /* ---------- jeda: tahan layar / tombol jeda / tab disembunyikan ---------- */
  var holdP = false, manual = false;
  var PAUSE_ICO = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
  var PLAY_ICO = '<svg viewBox="0 0 24 24"><path d="M7.5 5v14a1 1 0 0 0 1.5.86l11.2-7a1 1 0 0 0 0-1.72L9 4.14A1 1 0 0 0 7.5 5z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  function setPause(p) { holdP = !!p; applyPause(); }
  function applyPause() {
    paused = holdP || holdS || manual;
    var pr0 = holdP || holdS; if (pr0) stripOn = true;   /* ditahan: strip foto muncul & tetap ada setelah dilepas sampai ketuk / ganti story */
    if (card) { card.classList.toggle('srv-paused', paused); card.classList.toggle('srv-clean', pr0); card.classList.toggle('srv-stripmode', stripOn && !pr0); if (stripOn && V) ensureStrip(); }
    if (card) card.classList.toggle('srv-man', manual);
    if (root) { var pi = root.querySelector('.srv-pi'); if (pi && !pi.firstChild) pi.innerHTML = PLAY_ICO; }
    if (aud && curSrc) { if (paused) aud.pause(); else if (aud.paused && !waiting) { var pr = aud.play(); if (pr && pr.catch) pr.catch(noop); } }
  }

  /* ---------- lagu: SATU elemen audio dipakai terus (aman di HP). Durasi foto ikut lagu / diatur admin ---------- */
  var aud = null, curSrc = '', curStart = 0, bgWas = false, waiting = false, planT = 0, planTok = 0;
  function bgPause() {
    try { if (typeof bgMusicPlaying !== 'undefined' && bgMusicPlaying && typeof toggleBgMusic === 'function') { toggleBgMusic(); bgWas = true; } } catch (e) {}
  }
  function bgResume() {
    if (!bgWas) return; bgWas = false;
    try { if (typeof bgMusicPlaying !== 'undefined' && !bgMusicPlaying && typeof toggleBgMusic === 'function') toggleBgMusic(); } catch (e) {}
  }
  function okUrl(u) { return !!u && /^(https?:)?\/\//i.test(u); }
  function ensureAud() {
    if (aud) return;
    aud = new Audio(); aud.preload = 'auto';
    aud.addEventListener('ended', function () { try { aud.currentTime = curStart; var pr = aud.play(); if (pr && pr.catch) pr.catch(noop); } catch (e) {} });
    aud.addEventListener('error', function () { var n = root && root.querySelector('.srv-note'); if (n) n.hidden = true; });
  }
  function audStop() {
    planTok++; clearTimeout(planT); waiting = false;
    if (aud) { try { aud.pause(); aud.removeAttribute('src'); aud.load(); } catch (e) {} }
    curSrc = '';
    var note = root && root.querySelector('.srv-note'); if (note) note.hidden = true;
  }
  function retryPlay() {
    if (aud && curSrc && aud.paused && !paused && !waiting) { var p = aud.play(); if (p && p.catch) p.catch(noop); }
  }
  /* lagu dipakai slide ini + bagian mana: 'own' = lagu milik slide, 'split' = 1 lagu dibagi rata, 'each' = lagu mulai ulang tiap foto */
  function songFor(s, i) {
    if (s.music && okUrl(s.music)) return { src: s.music, mode: 'each', start: Math.max(0, +s.ms || 0) };
    if (V.music && okUrl(V.music)) {
      var n = 0, pos = 0;
      V.slides.forEach(function (x, k) { if (!(x.music && okUrl(x.music))) { if (k < i) pos++; n++; } });
      return { src: V.music, mode: V.mmode === 'each' ? 'each' : 'split', start: Math.max(0, +V.ms || 0), n: n || 1, pos: pos };
    }
    return null;
  }
  /* tentukan durasi slide i (detik) lalu panggil done(detik). Bar progress baru jalan setelah durasinya diketahui. */
  function planSlide(s, i, done) {
    var tok = ++planTok, sg = songFor(s, i), manualDur = +s.dur > 0 ? Math.min(120, +s.dur) : 0;
    clearTimeout(planT);
    var note = root.querySelector('.srv-note');
    if (!sg) {
      if (aud && curSrc) audStop();
      note.hidden = true; done(manualDur || 5); return;
    }
    note.hidden = false; bgPause(); ensureAud();
    var same = curSrc === sg.src;
    curStart = sg.start;
    if (!same) { curSrc = sg.src; try { aud.src = sg.src; aud.load(); } catch (e) {} }
    waiting = true;
    var fin = false;
    function ready() {
      if (fin || tok !== planTok || !V) return; fin = true; waiting = false; clearTimeout(planT);
      var d = aud.duration; if (!isFinite(d) || d <= 0) d = 0;
      var avail = d ? Math.max(1, d - sg.start) : 0, len, at;
      if (sg.mode === 'split' && avail) { var seg = avail / sg.n; len = seg; at = sg.start + seg * sg.pos; }
      else { len = avail || 15; at = sg.start; }
      if (manualDur) len = manualDur;
      len = Math.max(1, Math.min(len, 300));
      try { if (!same || sg.mode === 'each' || Math.abs(aud.currentTime - at) > 0.6) aud.currentTime = at; } catch (e) {}
      if (!paused) { var pr = aud.play(); if (pr && pr.catch) pr.catch(noop); }
      done(len);
    }
    if (same && aud.readyState >= 1) ready();
    else {
      aud.addEventListener('loadedmetadata', function h() { aud.removeEventListener('loadedmetadata', h); ready(); });
      if (!paused) { var p0 = aud.play(); if (p0 && p0.catch) p0.catch(noop); }   /* dipanggil langsung dari ketukan supaya tidak diblokir HP */
      planT = setTimeout(ready, 4000);
    }
  }

  function noteImg() {
    var nb = root && root.querySelector('.srv-nb'); if (!nb || !V) return;
    var m = V.mc || {}, sl = V.slides[idx], su = (sl && sl.img) || '', h = '', T = window.TKA;
    if (sl && okUrl(sl.mc)) m = { k: 'foto', v: sl.mc };   /* foto lagu khusus story ini */
    if (m.k === 'emoji' && m.v) h = '<span class="srv-nemo">' + esc(m.v) + '</span>';
    else if (m.k === 'ikon' && m.v && T && T.icoSvg && T.icoSvg(m.v)) h = '<span class="srv-nico"' + (HEX.test(m.c || '') ? ' style="color:' + m.c + '"' : '') + '>' + T.icoSvg(m.v) + '</span>';
    else {
      var u = m.k === 'foto' ? (okUrl(m.v) ? m.v : '') : m.k === 'slide' ? su : m.k === 'logo' ? (V.logoRaw || su) : (V.logo || V.logoRaw || su);
      if (u) h = '<img alt="" draggable="false" src="' + esc(u) + '">';
    }
    if (nb.__h !== h) { nb.__h = h; nb.innerHTML = h; }
  }
  function keyOf(s) { return V.id + '.' + s.id; }
  function cur() { return V && V.slides[idx]; }
  function st(k) { return stats[k] || (stats[k] = blank()); }

  function open(view, list) {
    if (!view || !view.slides || !view.slides.length) return;
    build();
    LIST = (Array.isArray(list) ? list : [view]).filter(function (v) { return v && v.slides && v.slides.length; });
    LI = Math.max(0, LIST.indexOf(view)); if (!LIST.length) { LIST = [view]; LI = 0; }
    root.hidden = false;
    document.documentElement.classList.add('tk-noscroll');
    var eb = root.querySelector('.srv-edit'), adm = false; try { adm = !!isAdmin && !!window.TkSE; } catch (e) {} eb.hidden = !adm;
    try { history.pushState({ srv: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    enter(view, true);
  }
  /* tampilkan satu sorotan dari foto pertama (dipakai saat buka & saat pindah ke sorotan sebelah) */
  function enter(view, first) {
    audStop();
    V = view; idx = 0; stats = {};
    root.querySelector('.srv-t b').textContent = view.name || 'Sorotan';
    root.querySelector('.srv-av').innerHTML = view.logo ? '<img src="' + esc(view.logo) + '" alt="">' : (view.icon || '');
    root.querySelector('.srv-bars').innerHTML = view.slides.map(function () { return '<i><b></b></i>'; }).join('');
    var stp = root.querySelector('.srv-strip'); stp.innerHTML = ''; stp.removeAttribute('data-b');   /* strip dibuat baru saat pertama kali ditahan (hemat memori) */
    holdP = false; holdS = false; manual = false; stripOn = false; applyPause();
    fit();
    show(0);
    if (first) intro(view.name);
    loadStats();
  }
  function nextSor() { if (LI < LIST.length - 1) { LI++; enter(LIST[LI], false); } else close(); }
  function prevSor() { if (LI > 0) { LI--; enter(LIST[LI], false); } else show(0); }   /* sorotan pertama: ulang dari awal, tidak keluar */
  function markStrip(instant) {
    var st = root.querySelector('.srv-strip'); if (!st || st.getAttribute('data-b') !== '1') return;
    var th = st.children; for (var k = 0; k < th.length; k++) th[k].classList.toggle('on', k === idx);
    var c = th[idx]; if (!c) return;
    if (userNav) return;   /* digeser pengguna: thumbnail sudah di tengah, jangan digulung ulang */
    progUntil = Date.now() + (instant ? 150 : 700);
    var x = c.offsetLeft + c.offsetWidth / 2 - st.clientWidth / 2;   /* foto yang sedang dilihat selalu di tengah */
    try { st.scrollTo({ left: x, behavior: (!instant && card && card.classList.contains('srv-clean')) ? 'smooth' : 'auto' }); } catch (e) { st.scrollLeft = x; }
  }
  function ensureStrip() {
    var st = root && root.querySelector('.srv-strip'); if (!st || !V || st.getAttribute('data-b') === '1') return;
    st.setAttribute('data-b', '1');
    st.innerHTML = V.slides.map(function (s, k) {
      var u = s.img || '', t = /^https?:\/\//i.test(u) ? '/thumb.php?u=' + encodeURIComponent(u) + '&w=160&q=70&f=webp' : u;
      return '<button type="button" class="srv-th" data-i="' + k + '"><img src="' + esc(t) + '" data-o="' + esc(u) + '" alt="" draggable="false" loading="lazy" decoding="async" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.dataset.o}"></button>';
    }).join('');
    markStrip(true);
  }
  var pushed = false;
  function close(fromPop) {
    if (!root || root.hidden) return;
    blockUntil = Date.now() + 600;   /* tahan ketukan susulan supaya tidak mengenai halaman di belakang */
    clearTimeout(holdT); down = null; endIntro();
    audStop(); bgResume(); holdP = false; holdS = false; stripOn = false; if (card) card.classList.remove('srv-clean', 'srv-stripmode');
    root.hidden = true;
    if (pushed) { pushed = false; if (fromPop !== true) { try { if (history.state && history.state.srv) history.back(); } catch (e) {} } }
    var im = root.querySelector('.srv-img'); im.removeAttribute('src');
    var bl = root.querySelector('.srv-blur'); if (bl) bl.removeAttribute('src');
    document.documentElement.classList.remove('tk-noscroll');
    V = null;
  }

  /* ---------- elemen di atas gambar (teks / emoji / tombol link) yang diatur admin ---------- */
  function num(v, d, lo, hi) { v = parseFloat(v); if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
  function itemsOf(s) {
    if (Array.isArray(s.items)) return s.items;
    var a = [];   /* slide lama: teks + tombol link jadi elemen di posisi bawaan */
    if (s.text) a.push({ t: 'text', text: s.text, x: 50, y: 82, s: 1 });
    if (s.link) a.push({ t: 'link', text: s.btn || 'Buka link', link: s.link, x: 50, y: 68, s: 1 });
    return a;
  }
  var LINK_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg>';
  function itemHtml(it, k) {
    var st = 'left:' + num(it.x, 50, 0, 100) + '%;top:' + num(it.y, 50, 0, 100) + '%;--s:' + num(it.s, 1, .5, 3.5) + ';--r:' + num(it.r, 0, -180, 180) + 'deg';
    var tx = esc(String(it.text == null ? '' : it.text));
    var sw = num(it.sw, 0, 0, 10), fk = FK.indexOf(it.f) >= 0 ? it.f : '', cx = '';
    if (fk) { cx += ' srv-f-' + fk; ensureFonts(); }
    if (it.t === 'text') {
      if (HEX.test(it.c || '')) st += ';--c:' + it.c;
      if (sw > 0) { st += ';--sw:' + sw + ';--sc:' + (HEX.test(it.sc || '') ? it.sc : '#000000'); cx += ' srv-st'; }
    }
    if (it.t === 'emoji') return '<span class="srv-it srv-emoji" data-k="' + k + '" style="' + st + '">' + tx + '</span>';
    if (it.t === 'link') {
      var href = (window.TKA && TKA.safeHref) ? TKA.safeHref(it.link) : (it.link || '');
      var ok = /^(https?:|tel:|mailto:)/i.test(href);
      var inner = LINK_ICO + '<b>' + tx + '</b>';
      return ok ? '<a class="srv-it srv-link' + cx + '" data-k="' + k + '" style="' + st + '" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>'
                : '<span class="srv-it srv-link' + cx + '" data-k="' + k + '" style="' + st + '">' + inner + '</span>';
    }
    return '<span class="srv-it srv-text' + cx + '" data-k="' + k + '" style="' + st + '">' + tx + '</span>';
  }
  function renderItems(s) {
    var box = root.querySelector('.srv-items');
    box.innerHTML = itemsOf(s).map(itemHtml).join('');
  }
  /* satuan ukuran: 1% lebar kartu (elemen & editor admin memakai satuan yang sama, jadi posisi/ukuran persis sama) */
  function fit() {
    if (!card || !media) return;
    var W = card.clientWidth, H = card.clientHeight; if (!W || !H) return;
    var top = parseFloat(getComputedStyle(card).paddingTop) || 0, pb = low ? (parseFloat(getComputedStyle(low).paddingBottom) || 0) : 0;
    var mh = Math.min(W * 16 / 9, H - top - pb - 92), mw = mh * 9 / 16;   /* kotak story selalu 9:16, sisanya bawah = kotak hitam */
    if (mh < 120) { mh = Math.max(120, H - top - pb - 92); mw = Math.min(W, mh * 9 / 16); }
    media.style.width = mw + 'px'; media.style.height = mh + 'px'; media.style.maxHeight = 'none';
    card.style.setProperty('--u', (mw / 100) + 'px');
  }

  /* ---------- pembuka (seperti contoh TikTok): foto diredupkan + judul di tengah, lalu redupnya hilang pelan-pelan ---------- */
  var introT = 0, introAnims = [];
  function intro(name) {
    var el = root.querySelector('.srv-intro'), sp = el.querySelector('span');
    sp.textContent = name || '';
    clearTimeout(introT); introAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); introAnims = [];
    if (REDUCE || !sp.animate) { endIntro(); return; }
    el.style.display = 'flex'; el.style.opacity = '1';
    card.classList.add('srv-hold');
    introAnims.push(sp.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 180, easing: 'ease-out', fill: 'both' }));
    introT = setTimeout(function () {
      if (!root || root.hidden) return;
      var ease = 'cubic-bezier(.4,0,.6,1)';
      var txt = sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: ease, fill: 'forwards' });
      var dim = el.animate([{ opacity: 1, backdropFilter: 'blur(5px)', webkitBackdropFilter: 'blur(5px)' }, { opacity: 0, backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)' }], { duration: 480, easing: ease, fill: 'forwards' });
      introAnims.push(txt, dim);
      dim.onfinish = endIntro;
    }, 340);
  }
  function endIntro() {
    clearTimeout(introT);
    introAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); introAnims = [];
    if (!root) return;
    var el = root.querySelector('.srv-intro'); if (el) { el.style.display = 'none'; el.style.opacity = ''; }
    if (card) card.classList.remove('srv-hold');
  }

  function go(i) {
    if (!V) return;
    if (i < 0) { prevSor(); return; }
    if (i >= V.slides.length) { nextSor(); return; }
    show(i);
  }
  function show(i) {
    idx = i;
    var s = V.slides[i];
    var im = root.querySelector('.srv-img');
    var bars = root.querySelectorAll('.srv-bars i');
    for (var k = 0; k < bars.length; k++) bars[k].className = k < i ? 'done' : (k === i ? 'on' : '');
    /* restart animasi progress slide ini */
    card.classList.add('srv-wait');
    im.classList.remove('srv-in'); void im.offsetWidth;
    im.style.cssText = 'visibility:hidden';
    im.src = s.img || ''; im.classList.add('srv-in');
    if (im.complete && im.naturalWidth) fitImg(im);
    var bl = root.querySelector('.srv-blur'); if (bl) bl.src = s.img || '';
    renderItems(s);
    noteImg();
    planSlide(s, i, function (sec) {
      var on = root.querySelector('.srv-bars i.on b'); if (!on || idx !== i) return;
      on.style.animationDuration = sec + 's';
      card.classList.remove('srv-wait');
    });
    /* siapkan gambar berikutnya */
    var nx = V.slides[i + 1]; if (nx && nx.img) { var pre = new Image(); pre.src = nx.img; }
    paint();
    markStrip();
  }

  /* ---------- status tombol (hati merah / emoji terpilih) & server ---------- */
  function paint() {
    if (!V) return;
    var s = cur(); if (!s) return;
    var d = st(keyOf(s));
    var es = root.querySelectorAll('.srv-e');
    for (var i = 0; i < es.length; i++) es[i].classList.toggle('on', d.mr === i);
    root.querySelector('.srv-like').classList.toggle('on', !!d.ml);
  }
  function parseRow(r) {
    var mr = r.mr == null ? -1 : EI.indexOf(+r.mr);
    return { l: +r.l || 0, ml: +r.ml || 0, mr: mr };
  }
  function loadStats() {
    if (!V) return;
    var me = V, keys = V.slides.map(keyOf).join(',');
    fetch(API + '?action=get&v=' + encodeURIComponent(vid()) + '&k=' + encodeURIComponent(keys), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || V !== me) return;
        Object.keys(j.data || {}).forEach(function (k) { stats[k] = parseRow(j.data[k]); });
        paint();
      }).catch(noop);
  }
  function send(body, key, before) {
    body.k = key; body.v = vid();
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'gagal');
        if (j.data) { stats[key] = parseRow(j.data); if (V && cur() && keyOf(cur()) === key) paint(); }
      })
      .catch(function () { if (before) { stats[key] = before; paint(); } toast('Gagal terhubung. Coba lagi.'); });
  }
  function like() {
    var s = cur(); if (!s) return;
    var k = keyOf(s), d = st(k), before = clone(d);
    if (d.ml) { d.ml = 0; } else { d.ml = 1; burst('❤️', root.querySelector('.srv-like')); }
    paint();
    send({ t: 'like', on: d.ml }, k, before);
  }
  function react(i, btn) {
    var s = cur(); if (!s || i < 0 || i >= EMO.length) return;
    var k = keyOf(s), d = st(k), before = clone(d);
    burst(EMO[i], btn);                       /* boleh diketuk berkali-kali: animasinya selalu muncul */
    if (d.mr === i) return;                   /* sudah terpilih: tidak perlu kirim ke server lagi */
    d.mr = i; paint();
    send({ t: 'react', e: EI[i] }, k, before);
  }

  /* ---------- emoji naik dari bawah, lalu membesar + blur + hilang ---------- */
  function burst(emo, from) {
    if (REDUCE || !card || !from) return;
    try {
      var cr = card.getBoundingClientRect(), fr = from.getBoundingClientRect();
      var x0 = fr.left - cr.left + fr.width / 2 - 14, y0 = fr.top - cr.top - 4, H = cr.height;
      for (var n = 0; n < 9; n++) {
        (function (n) {
          var f = document.createElement('span');
          f.className = 'srv-fl'; f.textContent = emo;
          f.style.left = (x0 + (Math.random() * 26 - 13)) + 'px';
          f.style.top = y0 + 'px';
          f.style.fontSize = (22 + Math.random() * 10) + 'px';
          card.appendChild(f);
          if (!f.animate) { setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 800); return; }
          var rise = H * (0.38 + Math.random() * 0.3), sw = Math.random() * 70 - 35, sw2 = sw + (Math.random() * 50 - 25);
          var a = f.animate([
            { transform: 'translate(0,0) scale(.5)', opacity: 0, filter: 'blur(0px)' },
            { transform: 'translate(0,-' + (rise * 0.12) + 'px) scale(1)', opacity: 1, filter: 'blur(0px)', offset: 0.12 },
            { transform: 'translate(' + sw + 'px,-' + (rise * 0.7) + 'px) scale(1.15)', opacity: 1, filter: 'blur(0px)', offset: 0.7 },
            { transform: 'translate(' + sw2 + 'px,-' + rise + 'px) scale(1.3)', opacity: 0, filter: 'blur(7px)' }
          ], { duration: 1500 + Math.random() * 700, delay: n * 90, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'both' });
          a.onfinish = function () { if (f.parentNode) f.parentNode.removeChild(f); };
        })(n);
      }
    } catch (e) {}
  }

  function share() {
    var s = cur(); if (!s) return;
    var k = keyOf(s), d = st(k);
    var url = location.origin + '/', title = V.name || 'Touka Enay Store', text = title;
    function counted() { send({ t: 'share' }, k, clone(d)); }
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).then(counted).catch(noop);
      return;
    }
    var done = function () { toast('Link toko disalin.'); counted(); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done).catch(function () { toast(url); }); return; }
    } catch (e) {}
    toast(url);
  }

  window.TkSor = { open: open, close: close };
})();
