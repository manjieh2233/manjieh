/* 38-rental-poster.js — Rental tampil pakai POSTER (rasio 2610:3192, sama seperti template poster rental). Dimuat PALING AKHIR (di luar bundle).
   Sifatnya tambahan saja: tidak mengubah/menghapus file lama, cuma "membungkus" fungsi yang sudah ada.
   - Kartu rental di rak (25-rental-rak.js) jadi kartu poster: nama + "Mulai Rp ..." + chip READY.
   - Detail rental: slide 1 = poster (rasio poster); slide geser = fullspek (2 screenshot ditumpuk atas-bawah).
   - Foto yang rasionya beda jauh dari poster (postingan rental lama / slide fullspek) otomatis ditampilkan utuh (contain), tidak kepotong.
   - Pilihan durasi di detail jadi grid 2 kolom + saran hemat otomatis di Sewa Custom.
   - Form admin (tipe Rental): label/rasio preview slide 1 jadi poster, upload fullspek rental = 2 screenshot ditumpuk (bukan template 4:5). */
(function () {
  'use strict';
  var R = '2610/3192', RV = 2610 / 3192, OLD = /aspect-ratio:\s*1536\/709/g;

  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function wrapFn(name, fn) {
    if (typeof window[name] !== 'function') return;
    var o = window[name];
    window[name] = function () {
      var r = o.apply(this, arguments);
      try { var x = fn(r, arguments); return x === undefined ? r : x; } catch (e) { console.error('38-rental-poster', name, e); return r; }
    };
  }
  var origSlide = typeof window.renderSlideshow === 'function' ? window.renderSlideshow : null;
  function normKode(v) { v = String(v || '').toUpperCase().replace(/\s+/g, ''); if (/^\d+$/.test(v)) v = 'P' + parseInt(v, 10); return v; }
  function kodeNum(k) { var m = /(\d+)/.exec(String(k || '')); return m ? parseInt(m[1], 10) : null; }
  function serialize(frag) { var d = document.createElement('div'); d.appendChild(frag); return d.innerHTML; }

  /* ---------- kartu rental (rak & grid) ---------- */
  wrapFn('postThumb', function (h, a) {
    var post = a[0];
    if (!post || post.type !== 'rental' || typeof h !== 'string') return h;
    var t = document.createElement('template'); t.innerHTML = h;
    var f = t.content, card = f.querySelector('.stock-card'), im = f.querySelector('.stock-card-img'), tx = f.querySelector('.stock-card-text');
    if (!card || !im) return h;
    card.classList.add('rp-card');
    im.style.aspectRatio = R; im.setAttribute('data-rp', '1');
    /* tampilan awal: tanpa badge NEW STOK & tanpa tombol wishlist (wishlist tetap ada di detail postingan) */
    Array.prototype.forEach.call(im.querySelectorAll('.wishlist-btn,[class*="bg-sky-500"]'), function (n) { n.parentNode.removeChild(n); });
    if (!post.soldOut && tx) {
      var opts = []; try { opts = getRentalOptions(post); } catch (e) {}
      var nums = opts.map(function (o) { return parseRupiahNumber(o.price); }).filter(function (n) { return n != null; });
      var min = nums.length ? Math.min.apply(null, nums) : null;
      tx.className = 'rp-text';
      tx.innerHTML = '<p class="rp-meta"><span>Rental</span>' + (post.kode ? '<i>|</i><b class="kode-yellow-text">' + esc(post.kode) + '</b>' : '') + '</p>' +
        (post.title ? '<p class="rp-name">' + esc(post.title) + '</p>' : '') +
        (min != null ? '<p class="rp-price"><span>Mulai</span> ' + esc(formatRupiahNumber(min)) + '</p>' : '');
    }
    return serialize(f);
  });

  /* ---------- slideshow detail, skeleton, placeholder: rasio poster ---------- */
  wrapFn('renderSlideshow', function (h, a) {
    if (!a[0] || a[0].type !== 'rental' || typeof h !== 'string') return h;
    h = h.replace(OLD, 'aspect-ratio:' + R).replace('slide-track-wrap"', 'slide-track-wrap" data-rp="1"');
    if (a[1]) {
      h = h.replace('style="max-width:100%" class="mx-auto"', 'style="max-width:min(100%,calc(54vh*0.8177));max-width:min(100%,calc(54dvh*0.8177))" class="mx-auto rp-show"');
      /* tombol download Poster / Semua (cuma admin, sama seperti di Stok) */
      try {
        if (origSlide && typeof isAdmin !== 'undefined' && isAdmin) {
          var t = document.createElement('template'); t.innerHTML = origSlide(Object.assign({}, a[0], { type: 'stok' }), true, a[2]);
          var b = t.content.querySelector('button[onclick^="downloadPost"]');
          if (b && b.parentNode) h = h.replace(/<\/div>\s*$/, b.parentNode.outerHTML + '</div>');
        }
      } catch (e) {}
    }
    return h;
  });
  wrapFn('renderSkeleton', function (h, a) { return (a[0] && typeof h === 'string') ? h.replace(OLD, 'aspect-ratio:' + R) : h; });
  wrapFn('renderDetailPlaceholder', function (h, a) { return (a[0] && a[0].type === 'rental' && typeof h === 'string') ? h.replace(OLD, 'aspect-ratio:' + R) : h; });

  /* foto yang rasionya jauh beda dari poster -> tampil utuh (contain) */
  document.addEventListener('load', function (e) {
    var im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.closest || !im.closest('[data-rp]')) return;
    if (im.closest('.stock-card-img')) return;           // kartu: foto selalu penuh (cover), tidak ada kotak kosong
    var w = im.naturalWidth, h = im.naturalHeight; if (!w || !h) return;
    if (Math.abs((w / h) / RV - 1) > 0.015) {
      var p = im.parentNode;
      if (p && !p.classList.contains('rp-fit')) {
        p.classList.add('rp-fit');
        try { p.style.setProperty('--rp-bg', 'url("' + (im.currentSrc || im.src) + '")'); } catch (_) {}   // latar "cerminan" transparan di belakang foto
      }
    }
  }, true);

  wrapFn('renderDetailHtml', function (h, a) {
    var post = a[0];
    if (!post || post.type !== 'rental' || typeof h !== 'string') return h;
    var t = document.createElement('template'); t.innerHTML = h;
    var f = t.content;
    var sh = f.querySelector('button[onclick^="sharePost"]'); if (sh && sh.parentNode) sh.parentNode.classList.add('rp-hide');
    var lk = f.querySelector('[id^="stat-likes-"]'); if (lk && lk.parentNode && lk.parentNode.parentNode) lk.parentNode.parentNode.classList.add('rp-hide');
    var h3 = f.querySelector('h3');
    if (h3 && post.kode) h3.insertAdjacentHTML('afterbegin', '<span class="kode-yellow-text">' + esc(post.kode) + '</span> <span class="text-white/30">|</span> ');
    return serialize(f);
  });

  /* urutan geser ke kanan di rak: P1, P2, P3 ... (postingan tanpa kode ikut di belakang); kode sama -> yang lebih baru duluan */
  wrapFn('getRentalShuffleKey', function (r, a) {
    var p = null; try { p = posts.filter(function (x) { return x.id === a[0]; })[0]; } catch (e) {}
    if (p && p.type === 'rental') { var n = kodeNum(p.kode); if (n != null) return -100000 + n - (p.createdAt || 0) / 1e13; }
    return r;
  });

  /* ---------- pilihan durasi di detail: grid 2 kolom + saran hemat ---------- */
  wrapFn('renderRentalPriceBlock', function (h, a) {
    var post = a[0]; if (!post || typeof h !== 'string') return h;
    var t = document.createElement('template'); t.innerHTML = h;
    var o = t.content.querySelector('.space-y-2'); if (!o) return h;
    o.classList.add('rp-opts', post.rentalGame === 'ML' ? 'rp-ml' : 'rp-ff');
    /* catatan paket malem: "Tersedia Mulai Pukul 21:00 - 08:00" -> "🌙 21:00–08:00" */
    Array.prototype.forEach.call(o.querySelectorAll('[class*="text-amber-300"]'), function (n) {
      var m = /(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/.exec(n.textContent || '');
      if (m) n.textContent = '🌙 ' + m[1].padStart(2, '0') + ':' + m[2] + '–' + m[3].padStart(2, '0') + ':' + m[4];
    });
    try {
      var hrs = parseInt(customRentalHours[post.id], 10), ph = parseRupiahNumber(post.priceHour), pd = parseRupiahNumber(post.priceDay);
      if (selectedRentalDuration[post.id] === 'custom' && hrs > 0 && ph && pd && hrs * ph > pd) {
        o.insertAdjacentHTML('afterend', '<div class="rp-hint">💡 Paket <b>1 Hari</b> cuma ' + esc(formatRupiahNumber(pd)) + ' — lebih hemat ' + esc(formatRupiahNumber(hrs * ph - pd)) + '</div>');
      }
    } catch (e) {}
    return serialize(t.content);
  });

  /* ---------- form admin: tipe Rental ---------- */
  function ensureKode() {
    if (document.getElementById('post-rental-kode')) return;
    var host = document.getElementById('fields-rental'); if (!host) return;
    host.insertAdjacentHTML('afterbegin', '<div id="post-rental-kode-wrap"><label class="text-xs text-white/60">Kode Rental (P1, P2, …)</label>' +
      '<input id="post-rental-kode" maxlength="8" autocomplete="off" oninput="this.value=this.value.toUpperCase()" class="input mt-1 w-full rounded-lg px-3 py-2" placeholder="P1" /></div>');
  }
  function setKode(forId, val) { ensureKode(); var i = document.getElementById('post-rental-kode'); if (i) { i.value = val || ''; i.dataset.for = forId; } }
  wrapFn('resetPostForm', function () { setKode('__new__', ''); });
  wrapFn('openEditPost', function (r, a) { var p = null; try { p = posts.filter(function (x) { return x.id === a[0]; })[0]; } catch (e) {} if (p && p.type === 'rental') setKode(p.id, p.kode); });
  if (typeof window.savePostRemote === 'function') {
    var osr = window.savePostRemote;
    window.savePostRemote = function (post) {
      try {
        var i = document.getElementById('post-rental-kode');
        if (post && post.type === 'rental' && i) {
          var isNew = i.dataset.for === '__new__' && !posts.some(function (x) { return x.id === post.id; });
          if (isNew || i.dataset.for === post.id) { var k = normKode(i.value); if (k) post.kode = k; else delete post.kode; }
        }
      } catch (e) { console.error('38-rental-poster kode', e); }
      return osr.apply(this, arguments);
    };
  }
  ensureKode();
  var orig2 = null;
  function hideAdminHints() {   // keterangan panjang di form admin: dibuang biar ringkas
    try { Array.prototype.forEach.call(document.querySelectorAll('#modal-post p'), function (n) { if (/Mau nambah durasi lain/i.test(n.textContent || '')) n.style.display = 'none'; }); } catch (e) {}
  }
  hideAdminHints();
  function formTexts(rental) {
    var q = function (id) { return document.getElementById(id); };
    var l1 = q('post-slide1-label'), h1 = q('post-slide1-hint'), pv = q('post-slide1-preview'), l2 = q('post-slide2-label'), h2 = q('post-slide2-hint');
    if (!orig2 && l2 && h2) orig2 = { l: l2.textContent, h: h2.textContent };
    if (rental) {
      if (l1) l1.textContent = 'Poster Rental';
      if (h1) h1.textContent = '';
      if (pv) { pv.style.aspectRatio = R; pv.style.maxWidth = '180px'; }
      if (l2) l2.textContent = 'Fullspek (2 foto jadi 1 slide)';
      if (h2) h2.textContent = '';
    } else if (orig2) {
      if (l2) l2.textContent = orig2.l;
      if (h2) h2.textContent = orig2.h;
    }
  }
  wrapFn('setPostType', function (r, a) { ensureKode(); formTexts(a[0] === 'rental');  hideAdminHints(); });

  /* upload fullspek untuk rental: 2 screenshot ditumpuk (tiap kotak rasio 1536:709), bukan template 4:5 */
  function cover(ctx, img, x, y, w, h) {
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
  }
  if (typeof window.composeFullspekSlide === 'function' && typeof loadImageEl === 'function') {
    var oc = window.composeFullspekSlide;
    window.composeFullspekSlide = async function (game, a, b) {
      var rental = false; try { rental = (postType === 'rental'); } catch (e) {}
      if (!rental) return oc.apply(this, arguments);
      try {
        var W = 1600, BH = Math.round(W * 709 / 1536), i1 = await loadImageEl(a), i2 = b ? await loadImageEl(b) : null;
        var c = document.createElement('canvas'); c.width = W; c.height = BH * (i2 ? 2 : 1);
        var x = c.getContext('2d'); x.fillStyle = '#0b0615'; x.fillRect(0, 0, c.width, c.height);
        cover(x, i1, 0, 0, W, BH); if (i2) cover(x, i2, 0, BH, W, BH);
        return c.toDataURL('image/jpeg', 0.86);
      } catch (e) { console.warn('38-rental-poster: tumpuk gagal, pakai template', e && e.message); return oc.apply(this, arguments); }
    };
  }

  /* ---------- harga paket otomatis per kategori (form postingan rental) ---------- */
  function curTag() {
    try { var tags = getRentalTags(postRentalGame) || []; for (var i = 0; i < tags.length; i++) if (tags[i].v === postRentalTag) return tags[i]; } catch (e) {}
    return null;
  }
  function presetValue(tag, key) {
    var p = tag && tag.prices && tag.prices[key];
    if (p != null && p !== '') { var n = parseInt(String(p).replace(/\D/g, ''), 10); if (n > 0) return n; }
    if (key === 'hour' && tag && tag.l) {   // "6K/Jam" -> 6000
      var m = /^\s*(\d+(?:[.,]\d+)?)\s*K/i.exec(tag.l);
      if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
    }
    return null;
  }
  function applyPreset() {
    var tag = curTag(); if (!tag) return;
    var n = 0;
    getRentalDurationTypes().forEach(function (t) {
      var v = presetValue(tag, t.key); if (v == null) return;
      var inp = document.querySelector('#post-rental-price-fields .post-price-dur[data-dur-key="' + t.key + '"]');
      if (!inp) return;
      inp.value = formatRupiahNumber(v);
      inp.dispatchEvent(new Event('input', { bubbles: true })); n++;
    });
    if (n && typeof showToast === 'function') showToast('Harga otomatis diisi dari kategori ' + tag.l + '.');
  }
  wrapFn('renderRentalTagBtns', function () {
    var w = document.getElementById('post-rental-tag-btns') || document;
    Array.prototype.forEach.call(document.querySelectorAll('.post-nom-btn[data-rtag]'), function (b) {
      b.onclick = function () { postRentalTag = b.dataset.rtag; applyPreset(); renderRentalTagBtns(); };
    });
  });

  /* ---------- KODE AKUN PERMANEN ----------
     Dulu: abis Simpan/Hapus, kode stok disusun ulang otomatis (hapus 1 akun di tengah -> kode akun lain bergeser -> link ikut berubah).
     Sekarang: kode yang sudah ada TIDAK PERNAH diubah. Akun baru dapat nomor = nomor terbesar + 1 (bukan jumlah akun + 1,
     supaya tidak kembar dengan kode yang masih ada). Kode rental (P1, P2, ...) memang manual, tidak ikut diubah juga. */
  if (typeof window.renumberKodeForGame === 'function') window.renumberKodeForGame = async function () { return false; };
  if (typeof window.computeNextKode === 'function') {
    window.computeNextKode = function (game) {
      var max = 0;
      try { posts.forEach(function (p) { if (p.type === 'stok' && p.game === game) { var m = /(\d+)\s*$/.exec(p.kode || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); } }); } catch (e) {}
      return game + ' ' + String(max + 1).padStart(2, '0');
    };
  }

  /* ---------- LINK: rental = /rentalp1, /rentalp2 ... (dari kode), tab = /ff /ml /rental ---------- */
  wrapFn('buildPostSlug', function (r, a) {
    var p = a[0];
    if (p && p.type === 'rental' && p.kode) { var sl = ('rental' + p.kode).toLowerCase().replace(/[^a-z0-9]+/g, ''); if (sl) return sl; }
    return r;
  });
  wrapFn('resolvePostBySlug', function (r, a) {          // tidak peduli huruf besar/kecil (/RentalP1 = /rentalp1); link rental lama (dari judul) tetap jalan
    if (r || !a[0]) return r;
    var s = String(a[0]).toLowerCase();
    try { return posts.filter(function (p) { return String(buildPostSlug(p)).toLowerCase() === s || (p.type === 'rental' && slugify(p.title) === s); })[0] || r; } catch (e) { return r; }
  });
  var TAB_PATHS = { ml: 1, ff: 1, rental: 1, stok: 1 };
  function curPath() { return decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase(); }
  function overlayOpen() {
    return ['modal-detail', 'modal-story', 'page-linkbio'].some(function (id) { var m = document.getElementById(id); return m && !m.classList.contains('hidden'); });
  }
  function stokView() { var t = document.querySelector('.st-tab.on'); return t ? t.getAttribute('data-stv') : 'ALL'; }
  function syncTabUrl() {                                 // cuma replaceState (tidak numpuk history) dan cuma kalau URL-nya "/" atau URL tab
    try {
      var cp = curPath(); if (cp && !TAB_PATHS[cp]) return;
      if (overlayOpen()) return;
      var want = '/';
      if (getActiveMainTab() === 'rental') want = '/rental';
      else { var v = stokView(); if (v === 'FF') want = '/ff'; else if (v === 'ML') want = '/ml'; }
      if (location.pathname !== want) history.replaceState(null, '', want);
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.tab,.st-tab,[data-stv]') : null;
    if (t) setTimeout(syncTabUrl, 30);
  });
  wrapFn('closeModal', function (r, a) { if (a[0] === 'modal-detail') { setTimeout(syncTabUrl, 150); setTimeout(syncTabUrl, 600); } });
  wrapFn('handlePathRoute', function () {                 // buka langsung toukaenay.com/ff, /ml, /rental
    var cp = curPath(); if (!TAB_PATHS[cp]) return;
    try {
      if (cp === 'rental') { if (getActiveMainTab() !== 'rental') document.querySelector('.tab[data-tab="rental"]').click(); return; }
      if (getActiveMainTab() !== 'stok') document.querySelector('.tab[data-tab="stok"]').click();
      if (cp === 'ff' || cp === 'ml') { var g = cp.toUpperCase(); if (stokView() !== g) { var b = document.querySelector('.st-tab[data-stv="' + g + '"]'); if (b) b.click(); } }
    } catch (e) {}
  });
  /* FIX: balik dari aplikasi lain ke browser -> alamat tetap /rental (atau /ff, /ml) tapi tampilan malah reset ke Stok > Semua.
     Sekarang tiap halaman kembali terlihat, tampilan disamakan lagi dengan alamatnya (alamat "/" = Semua, dibiarkan). */
  function resyncViewToUrl() {
    try {
      if (document.hidden || overlayOpen()) return;
      if (TAB_PATHS[curPath()] && typeof window.handlePathRoute === 'function') window.handlePathRoute();
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(resyncViewToUrl, 250); });
  window.addEventListener('pageshow', function () { setTimeout(resyncViewToUrl, 250); });
  window.addEventListener('focus', function () { setTimeout(resyncViewToUrl, 250); });

  if (typeof window.cardSwipeCancel === 'function') {
    var ocs = window.cardSwipeCancel;
    window.cardSwipeCancel = function (id) {
      var r = ocs.apply(this, arguments);
      setTimeout(function () { try { if (!cardSwipeState[id]) { var c = document.getElementById('post-' + id); if (c) { c.style.transform = ''; c.style.transition = ''; } } } catch (e) {} }, 320);
      return r;
    };
  }

  /* ---------- TEKAN KARTU: tidak sensitif (kayak Instagram/Facebook) ----------
     Zoom/glow/kilau baru nyala kalau jari DIAM ~0,25 detik. Begitu jari gerak, halaman/rak discroll, atau jari diangkat,
     semuanya dibatalkan sebelum sempat kelihatan -- jadi scroll tidak pernah bikin kartu ke-zoom. */
  (function () {
    var gen = 0, tPress = null, tShine = null, oSet = window.setPressedCard, oShine = window.triggerCardShine;
    function cancelAll() {
      var pr = false; try { pr = !!pressedCardEl; } catch (e) {}
      if (!tPress && !tShine && !pr) return;
      gen++; clearTimeout(tPress); clearTimeout(tShine); tPress = tShine = null;
      try { if (pressedCardEl) { pressedCardEl.classList.remove('is-pressed'); pressedCardEl = null; } } catch (e) {}
      try { for (var k in cardSwipeState) { var st = cardSwipeState[k]; if (st && st.lpTimer && !st.longPressFired) clearTimeout(st.lpTimer); } } catch (e) {}
    }
    function stillHeld(card) { try { return pressCandidateCard === card && !pressMoveCancelled; } catch (e) { return true; } }
    if (typeof oSet === 'function') window.setPressedCard = function (card) {
      if (!card) return oSet.apply(this, arguments);
      var my = gen; clearTimeout(tPress);
      tPress = setTimeout(function () { tPress = null; if (my === gen && stillHeld(card)) oSet.call(null, card); }, 170);
    };
    if (typeof oShine === 'function') window.triggerCardShine = function (card) {
      var my = gen; clearTimeout(tShine);
      tShine = setTimeout(function () { tShine = null; if (my === gen && stillHeld(card)) oShine.call(null, card); }, 130);
    };
    document.addEventListener('scroll', cancelAll, { passive: true, capture: true });
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (ev) { document.addEventListener(ev, function () { gen++; clearTimeout(tPress); clearTimeout(tShine); tPress = tShine = null; }, { passive: true }); });
  })();

  /* ---------- pintasan admin: tombol "Atur Sorotan" tepat di bawah bulatan Sorotan ---------- */
  function sorotanPill() {
    var box = document.getElementById('story-highlights'); if (!box) return;
    var ex = document.getElementById('rp-sorotan-pill'), adm = false; try { adm = !!isAdmin; } catch (e) {}
    if (!adm) { if (ex) ex.remove(); return; }
    if (ex) return;
    box.insertAdjacentHTML('afterend', '<div id="rp-sorotan-pill" style="text-align:center;margin:-2px 0 8px"><a href="#" onclick="if(window.TkSE){TkSE.open();return false}" style="display:inline-block;font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid rgba(168,85,247,.5);color:#d8b4fe;background:rgba(168,85,247,.12)">✎ Atur Sorotan</a></div>');
  }
  wrapFn('renderAdminUI', function () { sorotanPill(); });
  sorotanPill();

  /* kartu rental yang sudah tergambar sebelum file ini dimuat -> gambar ulang */
  try { if (typeof window.renderRental === 'function') window.renderRental(); } catch (e) { console.error('38-rental-poster', e); }
})();
