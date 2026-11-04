/* 19-toko-admin.js — dimuat SETELAH 18-fixes.js (lihat index.php), di luar bundle app.min.js.
   1) Judul postingan: teks "(Belum diberi judul — tolong edit)" dianggap kosong & tidak ditampilkan di mana pun.
   2) Footer (keterangan, nomor WA, link) bisa diubah admin.
   3) Sorotan (bulatan di bawah banner). Tap bulatan -> penampil ala TikTok (24-sorotan-viewer.js).
   4) Logo tab Sold Out (Semua / Free Fire / Mobile Legends).
   Semua disimpan di profil toko (profile.siteInfo, profile.sorotan, profile.soldLogos) lewat saveProfile().
   PENGATURANNYA sekarang ada di Panel Admin (/admin -> Info Toko & Sorotan, lihat 21-admin-toko.js), bukan popup di toko lagi.
   File ini juga membuka window.TKA (fungsi bantu) supaya Panel Admin memakai logika yang sama persis. */
(function () {
  'use strict';
  if (typeof saveProfile !== 'function' || typeof renderProfile !== 'function' || typeof escapeHtml !== 'function') return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return escapeHtml(s == null ? '' : s); }
  function sfx(n) { try { if (typeof playSfx === 'function') playSfx(n); } catch (e) {} }
  function toast(m, d) { try { showToast(m, d); } catch (e) { alert(m); } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* =====================================================================
     1. JUDUL KOSONG — "(Belum diberi judul — tolong edit)" tidak ditampilkan
     ===================================================================== */
  var PH = /^\(?\s*belum diberi judul/i;
  function cleanPost(p) { if (p && typeof p.title === 'string' && PH.test(p.title)) p.title = ''; return p; }
  function cleanAll() { try { (posts || []).forEach(cleanPost); } catch (e) {} }

  if (typeof sortPosts === 'function') {
    var oSort = sortPosts;
    window.sortPosts = function () { cleanAll(); return oSort.apply(this, arguments); };
  }
  if (typeof postThumb === 'function') {
    var oThumb = postThumb;
    window.postThumb = function (post) {
      cleanPost(post);
      var h = oThumb.apply(this, arguments);
      if (post && !post.title && typeof h === 'string') h = h.replace(/<p class="[^"]*">Tanpa judul<\/p>/g, '');
      return h;
    };
  }
  if (typeof renderDetailHtml === 'function') {
    var oDetail = renderDetailHtml;
    window.renderDetailHtml = function (post) {
      cleanPost(post);
      var h = oDetail.apply(this, arguments);
      if (post && !post.title && typeof h === 'string') {
        h = h.replace(/(?:<span class="text-white\/30">\|<\/span>\s*)?Tanpa judul(<\/h3>)/g, '$1')
             .replace(/<h3 class="text-sm font-semibold leading-snug">\s*<\/h3>/g, '');
      }
      return h;
    };
  }
  if (typeof showQuickPreview === 'function') {
    var oQuick = showQuickPreview;
    window.showQuickPreview = function (id) {
      var r = oQuick.apply(this, arguments);
      try {
        var t = document.querySelector('.quick-preview-title');
        if (t && /Tanpa judul\s*$/.test(t.textContent)) {
          var post = (posts || []).filter(function (p) { return p.id === id; })[0];
          if (!post || !post.title) {
            t.innerHTML = t.innerHTML.replace(/Tanpa judul\s*$/, '');
            if (!t.textContent.trim()) t.style.display = 'none';
          }
        }
      } catch (e) {}
      return r;
    };
  }
  cleanAll();

  /* =====================================================================
     2. DATA BAWAAN + PEMBANTU
     ===================================================================== */
  var DEF_INFO = {
    about: '**Touka Enay Store** merupakan platform digital terpercaya yang hadir untuk memenuhi berbagai kebutuhan gaming bagi para gamer di Indonesia. Telah melayani puluhan ribu customer, kami menyediakan berbagai layanan mulai dari Jual Beli Akun, Rental Akun, Jasa Rekber (Rekening Bersama), hingga Top Up berbagai game selama 24 jam. Dengan harga yang kompetitif, proses transaksi yang cepat, serta sistem yang aman dan praktis, kami berkomitmen untuk memberikan pengalaman bertransaksi yang nyaman dan terpercaya bagi setiap pelanggan. Melalui **toukaenay.com**, kami menghadirkan layanan gaming yang mudah diakses dengan dukungan pelayanan profesional dan customer service yang responsif. Setiap transaksi diproses dengan mengutamakan keamanan, kenyamanan, serta kepuasan pelanggan. Kami terus berupaya meningkatkan kualitas layanan dan mengembangkan sistem yang lebih inovatif agar setiap kebutuhan gaming dapat terpenuhi dengan mudah, cepat, dan aman. Bagi kami, kepercayaan pelanggan adalah prioritas utama. Touka Enay Store — solusi terpercaya untuk segala kebutuhan gaming kamu.',
    sections: [
      { title: 'Website', items: [
        { label: 'Stok Idaman', value: 'toukaenay.com', url: 'https://toukaenay.com' },
        { label: 'Topup Murah', value: 'toukatopup.id', url: 'https://toukatopup.id' }
      ] },
      { title: 'Kontak Resmi', items: [
        { label: 'WhatsApp Jual Beli', ref: 'waJual' },
        { label: 'WhatsApp Rekber', ref: 'waRekber' }
      ] },
      { title: 'Saluran WhatsApp', items: [
        { label: 'Saluran Utama', ref: 'chStok' },
        { label: 'Saluran Rental', ref: 'chRental' },
        { label: 'Saluran Rekber', url: 'https://whatsapp.com/channel/0029Vb7BbGt2UPBM2s6cYr3N' }
      ] },
      { title: 'Telegram Channel', items: [
        { label: 'Ch Touka', value: 't.me/toukajb', url: 'https://t.me/toukajb' },
        { label: 'Ch Enay', value: 't.me/enaayjb', url: 'https://t.me/enaayjb' }
      ] },
      { title: 'Sosial Media', items: [
        { label: 'TikTok Touka', value: '@toukatopup.id', url: 'https://www.tiktok.com/@toukatopup.id' },
        { label: 'TikTok Enay', value: '@enaystoree', url: 'https://www.tiktok.com/@enaystoree' }
      ] },
      { title: 'Telegram Support', items: [
        { label: 'Telegram Touka', value: '@toukastore', url: 'https://t.me/toukastore' },
        { label: 'Telegram Enay', value: '@EnayStoree', url: 'https://t.me/EnayStoree' }
      ] }
    ],
    warning: '⚠ Touka Enay Store TIDAK memiliki nomor lain selain kontak resmi di atas CLONE. Touka Enay juga tidak memiliki PT/OWN resmi. Siapapun yang mengaku-ngaku sebagai partner/owner Touka Enay adalah 100% PENIPUAN.',
    copyright: '© {tahun} Touka Enay Store. All rights reserved.'
  };

  function digits(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
  function normWa(v) {
    var d = digits(v); if (!d) return '';
    if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d;
    return d;
  }
  function fmtWa(v) {
    var d = digits(v); if (!d) return '';
    if (d.indexOf('62') === 0) d = '0' + d.slice(2);
    return d.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  /* rapikan link: tanpa awalan http -> ditambah https:// ; kosong tetap kosong */
  function normUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return '';
    if (/^(https?:|tel:|mailto:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // javascript:, data:, dll tidak diizinkan
    return 'https://' + u.replace(/^\/+/, '');
  }
  function safeHref(u) { u = normUrl(u); return /^(https?:|tel:|mailto:)/i.test(u) ? u : ''; }

  /* ---------- atur foto sorotan: mode (penuh layar / utuh), putar, zoom, fokus ----------
     Dipakai penampil di toko (24-sorotan-viewer.js) DAN kanvas editor admin (21-admin-toko.js), jadi tampilannya sama persis. */
  function clampN(v, lo, hi, d) { v = parseFloat(v); if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
  function photoAdj(sl) {
    sl = sl || {};
    var fit = (sl.fit === 'cover' || sl.fit === 'contain') ? sl.fit : '';
    var a = { fit: fit, rot: Math.round(clampN(sl.rot, -180, 180, 0)), zoom: clampN(sl.zoom, 1, 3, 1), fx: clampN(sl.fx, 0, 100, 50), fy: clampN(sl.fy, 0, 100, 50) };
    a.any = !!(fit || a.rot || a.zoom > 1.001 || Math.abs(a.fx - 50) > 0.5 || Math.abs(a.fy - 50) > 0.5);
    return a;
  }
  /* sl = slide (fit/rot/zoom/fx/fy), W/H = ukuran kotak tampil (px), nw/nh = ukuran asli foto (0 kalau belum tahu).
     Hasil: teks CSS untuk <img>, atau '' kalau slide ini tidak diatur (pakai tampilan bawaan: 9:16 penuh, selain itu utuh). */
  function photoCss(sl, W, H, nw, nh) {
    var a = photoAdj(sl);
    if (!a.any || !W || !H) return '';
    var base = Math.round(a.rot / 90) * 90, small = a.rot - base, odd = Math.abs(base / 90) % 2 === 1;
    var sw = odd ? H : W, sh = odd ? W : H;
    var fit = a.fit;
    if (!fit) { var r = (nw && nh) ? (odd ? nh / nw : nw / nh) : 0; fit = (r > 0.72) ? 'contain' : 'cover'; }
    var k = a.zoom;
    if (fit === 'cover' && Math.abs(small) > 0.01) {   // putar kecil (meluruskan): perbesar sedikit supaya sudut tidak kosong
      var th = Math.abs(small) * Math.PI / 180, asp = Math.max(W / H, H / W);
      k *= (Math.cos(th) + Math.sin(th) * asp);
    }
    var tx = 0, ty = 0;
    if (k > 1.0001) {
      var mx = (k - 1) * W / 2, my = (k - 1) * H / 2;
      tx = -Math.max(-mx, Math.min(mx, k * ((a.fx / 100 - 0.5) * W)));
      ty = -Math.max(-my, Math.min(my, k * ((a.fy / 100 - 0.5) * H)));
    }
    var f = function (n) { return Math.round(n * 100) / 100; };
    return 'position:absolute;left:50%;top:50%;max-width:none;width:' + f(sw) + 'px;height:' + f(sh) + 'px;margin:' + f(-sh / 2) + 'px 0 0 ' + f(-sw / 2) + 'px;' +
      'object-fit:' + fit + ';object-position:' + a.fx + '% ' + a.fy + '%;transform:translate(' + f(tx) + 'px,' + f(ty) + 'px) rotate(' + a.rot + 'deg) scale(' + f(k) + ');transform-origin:center center';
  }
  /* pasang ke <img> di kanvas editor admin (pengaturan dibaca dari atribut data-adj) */
  function applyPhoto(img) {
    var box = img.parentNode; if (!box) return;
    var adj = {}; try { adj = JSON.parse(img.getAttribute('data-adj') || '{}') || {}; } catch (e) {}
    var css = photoCss(adj, box.clientWidth, box.clientHeight, img.naturalWidth, img.naturalHeight);
    img.style.cssText = css;
    img.classList.toggle('fit', !css && img.naturalWidth / img.naturalHeight > 0.72);
  }

  /* =====================================================================
     3. FOOTER (keterangan, nomor, link)
     ===================================================================== */
  function curInfo() {
    var s = profile && profile.siteInfo;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return clone(DEF_INFO);
    return {
      about: typeof s.about === 'string' ? s.about : DEF_INFO.about,
      sections: Array.isArray(s.sections) ? s.sections : clone(DEF_INFO.sections),
      warning: typeof s.warning === 'string' ? s.warning : DEF_INFO.warning,
      copyright: typeof s.copyright === 'string' ? s.copyright : DEF_INFO.copyright
    };
  }
  /* satu item footer -> {label, value, url} (atau null kalau nomor/link-nya kosong) */
  function resolveItem(it) {
    var r = { label: String(it.label || ''), value: String(it.value || ''), url: String(it.url || '') };
    if (it.ref === 'waJual' || it.ref === 'waRekber') {
      var n = profile[it.ref]; if (!digits(n)) return null;
      r.value = fmtWa(n); r.url = 'https://wa.me/' + normWa(n);
    } else if (it.ref === 'chStok' || it.ref === 'chRental') {
      if (!profile[it.ref]) return null;
      r.url = profile[it.ref]; r.value = '';
    }
    return r.label || r.value ? r : null;
  }
  function richText(s) {
    return String(s || '').split(/\n{2,}/).map(function (par) {
      var h = esc(par.trim()).replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/70">$1</strong>').replace(/\n/g, '<br />');
      return h ? '<p>' + h + '</p>' : '';
    }).join('');
  }
  function renderFooter() {
    var f = $('official-contact-footer'); if (!f) return;
    var d = curInfo(), html = '';
    var about = richText(d.about);
    if (about) html += '<div class="px-4 pt-5 text-center text-[11px] leading-relaxed text-white/45">' + about + '</div>';
    var secs = d.sections.map(function (sec) {
      var items = (sec.items || []).map(resolveItem).filter(Boolean);
      if (!items.length) return '';
      var links = items.map(function (it, i) {
        var href = safeHref(it.url), mt = i ? ' mt-2' : '';
        var open = href ? '<a class="block' + mt + (it.value ? ' text-white/60 hover:text-white/90' : ' font-semibold text-white/85 hover:text-white') + '" href="' + esc(href) + '" target="_blank" rel="noreferrer">'
                          : '<span class="block' + mt + (it.value ? ' text-white/60' : ' font-semibold text-white/85') + '">';
        var close = href ? '</a>' : '</span>';
        return open + esc(it.label) + (it.value ? '<br /><span class="font-semibold text-white/85">' + esc(it.value) + '</span>' : '') + close;
      }).join('');
      return '<div><h5 class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-300">' + esc(sec.title || '') + '</h5>' + links + '</div>';
    }).join('');
    if (secs) html += '<div class="grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 text-[11px] leading-relaxed sm:grid-cols-3">' + secs + '</div>';
    var cp = String(d.copyright || '').replace(/\{tahun\}/gi, String(new Date().getFullYear()));
    var warn = String(d.warning || '').trim();
    html += '<div class="border-t border-white/10 px-4 py-4 text-[11px] leading-relaxed text-white/45">' +
      (warn ? '<p class="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-300/90">' + esc(warn).replace(/\n/g, '<br />') + '</p>' : '') +
      (cp ? '<p class="' + (warn ? 'mt-3 ' : '') + 'text-white/30" id="footer-copyright-year">' + esc(cp) + '</p>' : '') + '</div>';
    if (f.__tkHtml !== html) { f.__tkHtml = html; f.innerHTML = html; }
  }

  /* =====================================================================
     4. SOROTAN (bulatan ala Instagram di bawah banner)
     ===================================================================== */
  var REFS = {
    waJual:       { el: 'nav-wa-jual',    nl: 'waJual',    nm: 'WA Jual/Beli',   wa: true },
    waRekber:     { el: 'nav-wa-rekber',  nl: 'waRekber',  nm: 'WA Rekber',      wa: true },
    testimoniUrl: { el: 'nav-testimoni',  nl: 'testimoni', nm: 'Testimoni' },
    chStok:       { el: 'nav-ch-stok',    nl: 'chStok',    nm: 'Saluran Stok' },
    chRental:     { el: 'nav-ch-rental',  nl: 'chRental',  nm: 'Saluran Rental' },
    topupUrl:     { el: 'nav-topup',      nl: 'topup',     nm: 'Topup Game' }
  };
  var INFO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  var LINK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg>';
  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';


  /* ---------- pustaka ikon bulatan sorotan (dipakai penampil & editor sorotan) ---------- */
  function withBadge(id, base, mark, cy) {
    return '<defs><mask id="tk-' + id + 'a"><rect width="24" height="24" fill="#fff" stroke="none"/><circle cx="17.5" cy="' + cy + '" r="6.3" fill="#000" stroke="none"/></mask>' +
      '<mask id="tk-' + id + 'b"><rect width="24" height="24" fill="#fff" stroke="none"/><g stroke="#000" stroke-width="1.6" fill="none">' + mark + '</g></mask></defs>' +
      '<g mask="url(#tk-' + id + 'a)">' + base + '</g><circle cx="17.5" cy="' + cy + '" r="4.6" fill="currentColor" stroke="none" mask="url(#tk-' + id + 'b)"/>';
  }
  var P_BAG = '<path d="M5.3 8h11.4a2 2 0 0 1 2 2.3l-1.3 8.2a3 3 0 0 1-3 2.5H7.6a3 3 0 0 1-3-2.5l-1.3-8.2A2 2 0 0 1 5.3 8z"/><path d="M8 11V7a3.5 3.5 0 0 1 7 0"/>';
  var P_CART = '<circle cx="6.5" cy="19.5" r="1.8"/><circle cx="17" cy="19.5" r="1.8"/><path d="M17 17.7H6.5V3.5H3.5"/><path d="M6.5 6l13.5 1.2-1.2 6.3H6.5"/>';
  var ICO = {
    'tas-tanya': withBadge('tq', P_BAG, '<path d="M16 5.3a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.8.6-.8 1.1"/><path d="M17.5 9.3v.01"/>', 6.5),
    'tas-centang': withBadge('tc', P_BAG, '<path d="M15.2 6.6l1.6 1.6 3-3.4"/>', 6.5),
    'keranjang-tanya': withBadge('kq', P_CART, '<path d="M16 4.8a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.8.6-.8 1.1"/><path d="M17.5 8.8v.01"/>', 6),
    'keranjang-centang': withBadge('kc', P_CART, '<path d="M15.2 6.1l1.6 1.6 3-3.4"/>', 6),
    'tas': '<path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1-2.966 2.544h-6.852a3 3 0 0 1-2.965-2.544l-1.255-8.152a2 2 0 0 1 1.977-2.304z"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/>',
    'keranjang': '<circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M17 17h-11v-14h-2"/><path d="M6 5l14 1l-1 7h-13"/>',
    'toko': '<path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2-4h14l2 4"/><path d="M5 21v-10.15"/><path d="M19 21v-10.15"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>',
    'label-harga': '<circle cx="7.5" cy="7.5" r="1"/><path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592-5.592a2.41 2.41 0 0 0 0-3.408l-7.71-7.71a2 2 0 0 0-1.414-.586h-5.172a3 3 0 0 0-3 3z"/>',
    'struk': '<path d="M5 21v-16a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2l-2 2l-2-2l-2 2l-2-2l-3 2"/><path d="M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5m2 0v1.5m0-9v1.5"/>',
    'kartu': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/>',
    'dompet': '<path d="M17 8v-3a1 1 0 0 0-1-1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1-1 1h-12a2 2 0 0 1-2-2v-12"/><path d="M20 12v4h-4a2 2 0 0 1 0-4h4"/>',
    'koin': '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a2 2 0 0 0-1.8-1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1-1.8-1"/><path d="M12 7v10"/>',
    'berlian': '<path d="M6 5h12l3 5l-8.5 9.5a.7.7 0 0 1-1 0l-8.5-9.5l3-5"/><path d="M10 12l-2-2.2l.6-1"/>',
    'hadiah': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    'game': '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4"/><path d="M15 11v.01"/><path d="M18 13v.01"/>',
    'mahkota': '<path d="M12 6l4 6l5-4l-2 10h-14l-2-10l5 4z"/>',
    'petir': '<path d="M13 3v7h6l-8 11v-7h-6l8-11"/>',
    'bintang': '<path d="M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
    'hati': '<path d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572"/>',
    'truk': '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h-2v-11a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5"/>',
    'aman': '<path d="M11.46 20.846a12 12 0 0 1-7.96-14.846a12 12 0 0 0 8.5-3a12 12 0 0 0 8.5 3a12 12 0 0 1-.09 7.06"/><path d="M15 19l2 2l4-4"/>',
    'gembok': '<path d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-6z"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
    'tanya': '<circle cx="12" cy="12" r="9"/><path d="M12 16v.01"/><path d="M12 13a2 2 0 0 0 .914-3.782a1.98 1.98 0 0 0-2.414.483"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
    'langkah': '<path d="M3.5 5.5l1.5 1.5l2.5-2.5"/><path d="M3.5 11.5l1.5 1.5l2.5-2.5"/><path d="M3.5 17.5l1.5 1.5l2.5-2.5"/><path d="M11 6h9"/><path d="M11 12h9"/><path d="M11 18h9"/>',
    'centang': '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2l4-4"/>',
    'chat': '<path d="M3 20l1.3-3.9c-2.324-3.437-1.426-7.872 2.1-10.374c3.526-2.501 8.59-2.296 11.845.48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235-7.615 4.215-11.574 2.293l-4.7 1"/>',
    'akun': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.168 18.849a4 4 0 0 1 3.832-2.849h4a4 4 0 0 1 3.834 2.855"/>',
    'tim': '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>',
    'kartu-id': '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2"/><path d="M15 12h2"/><path d="M7 16h10"/>',
    'kunci': '<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15l8.15-8.15"/><path d="M18 5l3 3"/><path d="M15 8l3 3"/>',
    'piala': '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v8a5 5 0 0 1-10 0v-8"/><circle cx="5" cy="9" r="2"/><circle cx="19" cy="9" r="2"/>',
    'headset': '<path d="M4 14v-3a8 8 0 1 1 16 0v3"/><path d="M18 19c0 1.657-2.686 3-6 3"/><path d="M4 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3z"/><path d="M15 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3z"/>',
    'lonceng': '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    'api': '<path d="M12 12c2-2.96 0-7-1-8c0 3.038-1.773 4.741-3 6c-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5c-1.786 3-2.791 3-4 2z"/>',
    'roket': '<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3-5a9 9 0 0 0 6-8a3 3 0 0 0-3-3a9 9 0 0 0-8 6a6 6 0 0 0-5 3"/><path d="M7 14a6 6 0 0 0-3 6a6 6 0 0 0 6-3"/><circle cx="15" cy="9" r="1"/>',
    'paket': '<path d="M12 3l8 4.5v9l-8 4.5l-8-4.5v-9l8-4.5"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12l-8-4.5"/>',
    'uang': '<rect x="7" y="9" width="14" height="10" rx="2"/><circle cx="14" cy="14" r="2"/><path d="M17 9v-2a2 2 0 0 0-2-2h-10a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>',
    'terverifikasi': '<path d="M5 7.2a2.2 2.2 0 0 1 2.2-2.2h1a2.2 2.2 0 0 0 1.55-.64l.7-.7a2.2 2.2 0 0 1 3.12 0l.7.7c.412.41.97.64 1.55.64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58.23 1.138.64 1.55l.7.7a2.2 2.2 0 0 1 0 3.12l-.7.7a2.2 2.2 0 0 0-.64 1.55v1a2.2 2.2 0 0 1-2.2 2.2h-1a2.2 2.2 0 0 0-1.55.64l-.7.7a2.2 2.2 0 0 1-3.12 0l-.7-.7a2.2 2.2 0 0 0-1.55-.64h-1a2.2 2.2 0 0 1-2.2-2.2v-1a2.2 2.2 0 0 0-.64-1.55l-.7-.7a2.2 2.2 0 0 1 0-3.12l.7-.7a2.2 2.2 0 0 0 .64-1.55v-1"/><path d="M9 12l2 2l4-4"/>',
    'jempol': '<path d="M7 11v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3a4 4 0 0 0 4-4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1-2 2h-7a3 3 0 0 1-3-3"/>',
    'telepon': '<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5l5 2v4a2 2 0 0 1-2 2a16 16 0 0 1-15-15a2 2 0 0 1 2-2"/>',
    'diskon': '<circle cx="16" cy="17" r="1"/><circle cx="8" cy="7" r="1"/><path d="M6 18l12-12"/>',
    'jam': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'cari': '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
    'ponsel': '<rect x="7" y="4" width="10" height="16" rx="2"/><path d="M11 5h2"/><path d="M12 17v.01"/>',
    'tautan': '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/>',
    'permata': '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13l4-13l-3-6"/><path d="M2 9h20"/>',
    'kilau': '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2"/><path d="M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2"/><path d="M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6"/>',
    'stik-game': '<path d="M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1-3.923-2.035l1.634-8.173a5 5 0 0 1 4.904-4.019h3.4z"/><path d="M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925-2.023l-1.6-8.232"/><path d="M8 9v2"/><path d="M7 10h2"/><path d="M14 10h2"/>',
    'pedang': '<path d="M20 4v5l-9 7l-4 4l-3-3l4-4l7-9z"/><path d="M6.5 11.5l6 6"/>',
    'dua-pedang': '<path d="M21 3v5l-11 9l-4 4l-3-3l4-4l9-11z"/><path d="M5 13l6 6"/><path d="M14.32 17.32l3.68 3.68l3-3l-3.365-3.365"/><path d="M10 5.5l-2-2.5h-5v5l3 2.5"/>',
    'perisai': '<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1-8.5 15a12 12 0 0 1-8.5-15a12 12 0 0 0 8.5-3"/>',
    'akun-aman': '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><path d="M15 19l2 2l4-4"/>',
    'keranjang-anyam': '<path d="M10 14a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M5.001 8h13.999a2 2 0 0 1 1.977 2.304l-1.255 7.152a3 3 0 0 1-2.966 2.544h-9.512a3 3 0 0 1-2.965-2.544l-1.255-7.152a2 2 0 0 1 1.977-2.304"/><path d="M17 10l-2-6"/><path d="M7 10l2-6"/>',
    'whatsapp': '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05.9"/><path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    'telegram': '<path d="M15 10l-4 4l6 6l4-16l-18 7l4 2l2 6l3-4"/>',
    'instagram': '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3"/><path d="M16.5 7.5v.01"/>',
    'tiktok': '<path d="M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917"/>',
    'bintang-isi': '<path fill="currentColor" d="M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
    'hati-isi': '<path fill="currentColor" d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572"/>',
    'petir-isi': '<path fill="currentColor" d="M13 3v7h6l-8 11v-7h-6l8-11"/>',
    'mahkota-isi': '<path fill="currentColor" d="M12 6l4 6l5-4l-2 10h-14l-2-10l5 4z"/>',
    'permata-isi': '<path fill="currentColor" d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20" stroke="#000" stroke-opacity=".35"/><path d="M11 3L8 9l4 13l4-13l-3-6" stroke="#000" stroke-opacity=".35"/>',
    'api-isi': '<path fill="currentColor" d="M12 12c2-2.96 0-7-1-8c0 3.038-1.773 4.741-3 6c-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5c-1.786 3-2.791 3-4 2z"/>',
    'tas-isi': '<path fill="currentColor" d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1-2.966 2.544h-6.852a3 3 0 0 1-2.965-2.544l-1.255-8.152a2 2 0 0 1 1.977-2.304z"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/>'
  };
  var ICO_COLORS = ['#a78bfa', '#f472b6', '#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#60a5fa'];
  var ICO_NAMES = { 'tas-tanya': 'Tas + ?', 'tas-centang': 'Tas + centang', 'keranjang-tanya': 'Keranjang + ?', 'keranjang-centang': 'Keranjang + centang', 'tas': 'Tas belanja', 'keranjang': 'Keranjang', 'toko': 'Toko', 'label-harga': 'Label harga', 'struk': 'Struk', 'kartu': 'Kartu bayar', 'dompet': 'Dompet', 'koin': 'Koin', 'berlian': 'Berlian', 'hadiah': 'Hadiah', 'game': 'Game', 'mahkota': 'Mahkota', 'petir': 'Kilat', 'bintang': 'Bintang', 'hati': 'Hati', 'truk': 'Pengiriman', 'aman': 'Aman', 'gembok': 'Gembok', 'tanya': 'Tanya jawab', 'info': 'Info', 'langkah': 'Langkah', 'centang': 'Centang', 'chat': 'Chat', 'akun': 'Akun', 'tim': 'Tim / grup', 'kartu-id': 'Kartu ID', 'kunci': 'Kunci', 'piala': 'Piala', 'headset': 'Headset', 'lonceng': 'Lonceng', 'api': 'Api / hot', 'roket': 'Roket', 'paket': 'Paket', 'uang': 'Uang tunai', 'terverifikasi': 'Terverifikasi', 'jempol': 'Jempol', 'telepon': 'Telepon', 'diskon': 'Diskon', 'jam': 'Jam', 'cari': 'Cari', 'ponsel': 'Ponsel', 'tautan': 'Tautan', 'permata': 'Permata', 'kilau': 'Kilau', 'stik-game': 'Stik game', 'pedang': 'Pedang', 'dua-pedang': 'Dua pedang', 'perisai': 'Perisai', 'akun-aman': 'Akun aman', 'keranjang-anyam': 'Keranjang anyam', 'whatsapp': 'WhatsApp', 'telegram': 'Telegram', 'instagram': 'Instagram', 'tiktok': 'TikTok', 'bintang-isi': 'Bintang isi', 'hati-isi': 'Hati isi', 'petir-isi': 'Kilat isi', 'mahkota-isi': 'Mahkota isi', 'permata-isi': 'Permata isi', 'api-isi': 'Api isi', 'tas-isi': 'Tas isi' };
  function icoSvg(k) { return ICO[k] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICO[k] + '</svg>' : ''; }

  function defSor() {
    var l = ['waJual', 'waRekber', 'testimoniUrl', 'chStok', 'chRental', 'topupUrl'].map(function (k) {
      return { id: 'd-' + k, ref: k, name: '', logo: '', link: '', photos: [], hidden: false };
    });
    l.push({ id: 'd-info', type: 'info', name: '', logo: '', link: '', photos: [], hidden: false });
    return l;
  }
  function getSor() { return Array.isArray(profile.sorotan) ? profile.sorotan : defSor(); }
  function navLabel(R) {
    var nl = profile.navLabels || {}, dn = (typeof defaultProfile !== 'undefined' && defaultProfile.navLabels) || {};
    return nl[R.nl] || dn[R.nl] || R.nm;
  }
  /* satu slide -> {id, img, text, btn, link} (atau null kalau gambarnya kosong) */
  function cleanId(s, fb) { s = String(s == null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 30); return s || fb; }
  function slideView(sl, i, fallbackLink) {
    if (typeof sl === 'string') sl = { img: sl };
    sl = sl || {};
    var img = /^(https?:)?\/\//i.test(sl.img || '') ? sl.img : '';
    if (!img) return null;
    var link = safeHref(sl.link != null && sl.link !== '' ? sl.link : '');
    var btn = String(sl.btn || '').trim();
    if (!link && fallbackLink && sl.link == null) link = fallbackLink;      // data lama: foto ikut link sorotannya
    var adj = photoAdj(sl);
    return { id: cleanId(sl.id, 'p' + i), img: img, text: String(sl.text || '').trim(), btn: link ? btn : '', link: link, items: Array.isArray(sl.items) ? sl.items : null, fit: adj.fit, rot: adj.rot, zoom: adj.zoom, fx: adj.fx, fy: adj.fy,
      dur: Math.max(0, Math.min(120, parseFloat(sl.dur) || 0)), music: /^(https?:)?\/\//i.test(sl.music || '') ? sl.music : '', ms: Math.max(0, parseFloat(sl.ms) || 0), mc: /^(https?:)?\/\//i.test(sl.mc || '') ? sl.mc : '' };
  }
  /* daftar slide dari item (format baru: slides[], format lama: photos[]) */
  function slidesOf(it, fallbackLink) {
    var src = Array.isArray(it.slides) && it.slides.length ? it.slides : (Array.isArray(it.photos) ? it.photos : []);
    var out = [];
    src.forEach(function (sl, i) { var v = slideView(sl, i, fallbackLink); if (v) out.push(v); });
    return out;
  }
  /* satu sorotan -> data siap tampil */
  function srView(it) {
    var v = { id: cleanId(it.id, 'sor'), name: String(it.name || '').trim(), logo: /^(https?:)?\/\//i.test(it.logo || '') ? it.logo : '', link: String(it.link || '').trim(), icon: LINK_SVG, info: false, slides: [] };
    if (it.type === 'info') { v.info = true; v.icon = INFO_SVG; if (!v.name) v.name = 'Info Grup JB'; }
    else if (it.ref && REFS[it.ref]) {
      var R = REFS[it.ref], val = profile[it.ref];
      if (!v.name) v.name = navLabel(R);
      if (!v.link) {
        if (R.wa) v.link = digits(val) ? 'https://wa.me/' + normWa(val) : '';
        else v.link = val || (it.ref === 'testimoniUrl' && typeof defaultProfile !== 'undefined' ? defaultProfile.testimoniUrl : '') || '';
      }
      var a = $(R.el), sv = a && a.querySelector('svg');
      if (sv) v.icon = sv.outerHTML.replace(/\sclass="[^"]*"/, '').replace(/\sstyle="[^"]*"/, '');
    }
    v.link = safeHref(v.link);
    var mcs = it.mc || {}, logo0 = v.logo;
    v.logoRaw = logo0;
    v.mc = { k: mcs.k === 'foto' ? 'foto' : 'auto', v: String(mcs.v || ''), c: '' };   /* foto kecil di samping ikon lagu: otomatis atau foto sendiri */
    var cv = it.cov;   /* gambar bulatan pilihan admin: emoji / ikon (kalau tidak diatur: foto logo seperti biasa) */
    if (cv && cv.k === 'emoji' && cv.v) { v.logo = ''; v.icon = '<span class="hl-emo">' + esc(cv.v) + '</span>'; }
    else if (cv && cv.k === 'ikon' && ICO[cv.v]) { v.logo = ''; v.icon = '<span class="hl-cov"' + (/^#[0-9a-f]{6}$/i.test(cv.c || '') ? ' style="color:' + cv.c + '"' : '') + '>' + icoSvg(cv.v) + '</span>'; }
    v.slides = slidesOf(it, v.link);
    if (cv && cv.k === 'slide' && v.slides[0] && v.slides[0].img) { v.logo = v.slides[0].img; v.icon = ''; }   /* bulatan memakai foto pertama sorotan */
    v.music = /^(https?:)?\/\//i.test(it.music || '') ? it.music : '';       // lagu sorotan (opsional, satu per sorotan)
    v.ms = Math.max(0, parseFloat(it.ms) || 0);                                // lagu mulai dari detik ke-berapa
    v.mmode = it.mmode === 'each' ? 'each' : 'split';                           // 'split' = 1 lagu dibagi rata ke semua foto, 'each' = lagu mulai ulang tiap foto
    v.photos = v.slides;   // nama lama, supaya kode lain yang masih membaca v.photos tetap jalan
    if (!v.name) v.name = 'Sorotan';
    return v;
  }
  var srList = [];
  function renderSor() {
    var wrap = $('story-highlights'); if (!wrap) return;
    srList = getSor().filter(function (it) { return !it.hidden; }).map(function (it) { return srView(it); })
      .filter(function (v) { return v.info ? !!$('menu-go-linkbio') : (v.link || v.slides.length); });
    var html = srList.map(function (v, i) {
      return '<button type="button" class="hl" data-sr="' + i + '"><span class="hl-ring"><span class="hl-in">' +
        (v.logo ? '<img src="' + esc(v.logo) + '" alt="" loading="lazy" decoding="async">' : v.icon) +
        '</span></span><span class="hl-lb">' + esc(v.name) + '</span></button>';
    }).join('');
    if (wrap.__tkHtml !== html) { wrap.__tkHtml = html; wrap.innerHTML = html; }
  }
  var hlWrap = $('story-highlights');
  if (hlWrap) hlWrap.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-sr]') : null; if (!b) return;
    var k = b.getAttribute('data-sr'); sfx('link');
    var v = srList[+k]; if (!v) return;
    if (v.slides.length && window.TkSor) window.TkSor.open(v, srList);
    else if (v.info) { var m = $('menu-go-linkbio'); if (m) m.click(); }
    else if (v.link) window.open(v.link, '_blank', 'noopener');
    else if (v.slides.length && v.slides[0].link) window.open(v.slides[0].link, '_blank', 'noopener');
  });

  /* =====================================================================
     5. HOOK RENDER + FUNGSI BANTU UNTUK PANEL ADMIN
     ===================================================================== */
  function renderAll() {
    try { renderFooter(); } catch (e) { console.error('renderFooter', e); }
    try { renderSor(); } catch (e) { console.error('renderSor', e); }
    try { if (typeof window.__renderSold === 'function') window.__renderSold(); } catch (e) { console.error('renderSold', e); }
  }
  var oRP = renderProfile;
  window.renderProfile = function () { var r = oRP.apply(this, arguments); renderAll(); return r; };
  if (typeof renderAdminUI === 'function') {
    var oAdm = renderAdminUI;
    window.renderAdminUI = function () { var r = oAdm.apply(this, arguments); try { renderSor(); } catch (e) {} return r; };
  }
  renderAll();
  // cadangan: profil / menu kadang baru siap sesudah file ini jalan
  var tries = 0, iv = setInterval(function () { renderSor(); if (++tries > 12) clearInterval(iv); }, 500);

  window.TKA = {
    ICO: ICO, ICO_NAMES: ICO_NAMES, ICO_COLORS: ICO_COLORS, icoSvg: icoSvg,
    DEF_INFO: DEF_INFO, curInfo: curInfo, defSor: defSor, getSor: getSor, srView: srView, slidesOf: slidesOf,
    digits: digits, normWa: normWa, fmtWa: fmtWa, normUrl: normUrl, safeHref: safeHref, photoAdj: photoAdj, photoCss: photoCss, applyPhoto: applyPhoto, clone: clone, uid: uid,
    renderAll: renderAll, cleanId: cleanId
  };
})();
