/* 42-sorotan-editor.js — Editor Sorotan LANGSUNG di toko (khusus admin), tanpa masuk Panel Admin.
   Dibuka dari tombol "✎ Atur Sorotan" di bawah bulatan sorotan, atau tombol ✎ di dalam penampil sorotan.
   - Elemen (teks / emoji / tombol link): 1 jari = geser, 2 jari = zoom (besar/kecil) + putar, seperti TikTok / Instagram.
   - Durasi per foto (detik) atau otomatis mengikuti lagu. Lagu per sorotan (dibagi rata / mulai ulang tiap foto) atau lagu sendiri per foto.
   - Simpan lewat saveProfile() yang sama dengan Panel Admin (profile.sorotan), jadi data tetap satu. */
(function () {
  'use strict';
  var T = function () { return window.TKA || {}; };
  var root = null, S = [], cur = -1, sj = 0, sel = -1, dirty = false, busy = false, emoOn = false;
  var EMOJIS = ['🔥', '❤️', '😍', '😂', '😮', '👏', '✨', '💎', '🎮', '⚡', '👑', '🚀', '💯', '⭐', '🎁', '✅', '👉', '⬇️', '🛒', '🏆'];
  var LINK_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg>';
  var EMO_COVER = ['🛒', '🛍️', '🏪', '💎', '🎮', '🔥', '🎁', '💰', '⭐', '✅', '📦', '🚀', '💳', '👑', '⚡', '🏷️', '❓', '📖', '💬', '🤝', '🔒', '📱', '🏆', '🎯'];
  var songLen = {};   // url -> detik (untuk petunjuk durasi)

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d, lo, hi) { v = parseFloat(v); if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
  function toast(m) { try { showToast(m); } catch (e) {} }
  function uid() { return (T().uid && T().uid()) || ('s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); }
  function cid(s, fb) { s = String(s == null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 30); return s || fb; }
  function okUrl(u) { return /^(https?:)?\/\//i.test(u || ''); }
  function q(sel_) { return root.querySelector(sel_); }

  /* ---------- data ---------- */
  var HEX = /^#[0-9a-f]{6}$/i, FONTS = [['', 'Bawaan'], ['mont', 'Montserrat'], ['bebas', 'Bebas Neue'], ['anton', 'Anton'], ['play', 'Playfair'], ['pacif', 'Pacifico'], ['dance', 'Dancing'], ['caveat', 'Caveat'], ['marker', 'Marker'], ['type', 'Typewriter'], ['lex', 'Lexend']];
  var PAL = ['#ffffff', '#000000', '#ff2d55', '#ff9500', '#ffcc00', '#34c759', '#00c7ff', '#0a84ff', '#af52de', '#ff5ac8'], fontsOn = false;
  function fkOk(f) { for (var i = 0; i < FONTS.length; i++) if (FONTS[i][0] && FONTS[i][0] === f) return f; return ''; }
  function ensureFonts() {
    if (fontsOn) return; fontsOn = true;
    try { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Lexend:wght@800&family=Montserrat:wght@800&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@600&family=Special+Elite&display=swap'; document.head.appendChild(l); } catch (e) {}
  }
  function normItem(it) {
    var t = it.t === 'emoji' || it.t === 'link' ? it.t : 'text';
    return { id: it.id || uid(), t: t, text: String(it.text == null ? '' : it.text), link: String(it.link || ''), x: num(it.x, 50, 3, 97), y: num(it.y, 50, 3, 97), s: num(it.s, 1, .5, 3.5), r: num(it.r, 0, -180, 180), c: HEX.test(it.c || '') ? it.c : '', sc: HEX.test(it.sc || '') ? it.sc : '', sw: num(it.sw, 0, 0, 10), f: fkOk(it.f) };
  }
  function normSlide(x, fbLink) {
    if (typeof x === 'string') x = { img: x, link: fbLink || '', btn: fbLink ? 'Buka link' : '' };
    var items = Array.isArray(x.items) ? x.items : [];
    if (!Array.isArray(x.items)) {
      if (x.text) items.push({ t: 'text', text: x.text, x: 50, y: 82, s: 1 });
      if (x.link) items.push({ t: 'link', text: x.btn || 'Buka link', link: x.link, x: 50, y: 68, s: 1 });
    }
    var ad = T().photoAdj ? T().photoAdj(x) : { fit: '', rot: 0, zoom: 1, fx: 50, fy: 50 };
    return { id: x.id || uid(), img: x.img || '', items: items.map(normItem), fit: ad.fit, rot: ad.rot, zoom: ad.zoom, fx: ad.fx, fy: ad.fy, dur: +x.dur > 0 ? +x.dur : 0, music: x.music || '', ms: +x.ms || 0, mc: okUrl(x.mc) ? x.mc : '' };
  }
  function load() {
    var base = (T().getSor ? T().getSor() : []) || [];
    S = JSON.parse(JSON.stringify(base)).map(function (s) {
      var src = Array.isArray(s.slides) && s.slides.length ? s.slides : (Array.isArray(s.photos) ? s.photos : []);
      s.slides = src.map(function (x) { return normSlide(x, s.link); }).filter(function (x) { return x.img; });
      delete s.photos;
      s.music = s.music || ''; s.ms = +s.ms || 0; s.mmode = s.mmode === 'each' ? 'each' : 'split';
      return s;
    });
    dirty = false;
  }
  function nameOf(s) { try { return T().srView(Object.assign({}, s, { photos: [], slides: [] })).name; } catch (e) { return s.name || 'Sorotan'; } }
  function logoOf(s) { try { if (s.cov && s.cov.k === 'slide' && s.slides && s.slides[0] && s.slides[0].img) return '<img src="' + esc(s.slides[0].img) + '" alt="">'; var v = T().srView(Object.assign({}, s, { photos: [], slides: [] })); return v.logo ? '<img src="' + esc(v.logo) + '" alt="">' : '<span class="se-ic">' + v.icon + '</span>'; } catch (e) { return ''; } }
  function dirtyOn() { dirty = true; var b = q('.se-save'); if (b) b.classList.add('on'); }

  /* ---------- upload ---------- */
  function pick(accept, cb) {
    var f = document.createElement('input'); f.type = 'file'; f.accept = accept; f.style.display = 'none'; document.body.appendChild(f);
    f.onchange = function () { var file = f.files && f.files[0]; document.body.removeChild(f); if (file) cb(file); };
    f.click();
  }
  function logoUrl(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onerror = function () { rej(new Error('file tidak terbaca')); };
      r.onload = function () {
        var im = new Image(); im.onerror = function () { rej(new Error('gambar tidak bisa dibuka')); };
        im.onload = function () {
          var m = 256, sc = Math.min(1, m / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
          var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); res(c.toDataURL('image/png'));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  async function withBusy(label, fn) {
    if (busy) return; busy = true; toast(label);
    try { await fn(); dirtyOn(); } catch (e) { console.error(e); toast('Gagal: ' + (e && e.message ? e.message : 'upload bermasalah')); }
    busy = false; render();
  }
  function upImage(cb) { pick('image/*', function (f) { withBusy('Mengunggah gambar…', async function () { cb(await uploadImageToStorage(await fileToDataUrl(f), 'sorotan_' + Date.now() + '.jpg')); }); }); }
  function upLogo(cb) { pick('image/*', function (f) { withBusy('Mengunggah logo…', async function () { cb(await uploadImageToStorage(await logoUrl(f), 'logo_' + Date.now() + '.png')); }); }); }
  function upSong(cb) {
    pick('audio/*,.mp3,.m4a', function (f) {
      withBusy('Mengunggah lagu…', async function () {
        if (!/^audio\//i.test(f.type || '') && !/\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name || '')) throw new Error('pilih file lagu (mp3 / m4a)');
        if (f.size > 12 * 1024 * 1024) throw new Error('ukuran lagu maksimal 12 MB');
        cb(await uploadImageToStorage(await fileToRawDataUrl(f), 'sorotan_song_' + Date.now() + '.mp3'));
      });
    });
  }
  function getLen(url, cb) {
    if (!okUrl(url)) return; if (songLen[url]) return;
    var a = new Audio(); a.preload = 'metadata';
    a.onloadedmetadata = function () { if (isFinite(a.duration)) { songLen[url] = a.duration; cb && cb(); } };
    a.src = url;
  }

  /* ---------- tampilan ---------- */
  function css() {
    if (document.getElementById('se-css')) return;
    var st = document.createElement('style'); st.id = 'se-css';
    st.textContent = [
      '#se-root{position:fixed;inset:0;z-index:9000;background:#0d0a14;color:#fff;display:flex;flex-direction:column;font-family:inherit}',
      '#se-root[hidden]{display:none}',
      '.se-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;border-bottom:1px solid rgba(255,255,255,.1)}',
      '.se-top b{flex:1;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.se-btn{border:0;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:13px;font-weight:600;padding:8px 12px;cursor:pointer}',
      '.se-btn.pri{background:#7c3aed}.se-btn.del{color:#fda4af}.se-btn.sm{padding:6px 9px;font-size:12px}',
      '.se-save{opacity:.45}.se-save.on{opacity:1;background:#16a34a}',
      '.se-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:12px 12px calc(30px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}',
      '.se-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:rgba(255,255,255,.06);margin-bottom:8px}',
      '.se-card.off{opacity:.5}.se-card .nm{flex:1;min-width:0;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.se-card small{display:block;font-weight:400;opacity:.6;font-size:11px}',
      '.se-lg{width:44px;height:44px;border-radius:50%;overflow:hidden;background:#2a1850;flex:none;display:flex;align-items:center;justify-content:center;border:0;padding:0;color:#fff}',
      '.se-lg img{width:100%;height:100%;object-fit:cover}.se-ic svg{width:20px;height:20px}',
      '.se-in{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#fff;border-radius:10px;padding:9px 10px;font:inherit;font-size:14px}',
      '.se-sec{margin:12px 0;padding:10px;border-radius:14px;background:rgba(255,255,255,.05);display:flex;flex-direction:column;gap:8px}',
      '.se-sec>b{font-size:12px;opacity:.75}.se-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.se-row>.se-in{flex:1;min-width:0}',
      '.se-hint{font-size:11px;opacity:.6;line-height:1.4}',
      '.se-chip{border:1px solid rgba(255,255,255,.2);background:none;color:#fff;border-radius:999px;font:inherit;font-size:12px;padding:6px 11px;cursor:pointer}.se-chip.on{background:#7c3aed;border-color:#7c3aed}',
      '.se-strip{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px}',
      '.se-th{flex:none;width:54px;height:96px;border-radius:9px;overflow:hidden;border:2px solid transparent;position:relative;background:#000;padding:0}.se-th.on{border-color:#a78bfa}.se-th img{width:100%;height:100%;object-fit:cover}',
      '.se-th i{position:absolute;left:3px;bottom:2px;font-style:normal;font-size:10px;font-weight:700;text-shadow:0 1px 3px #000}',
      '.se-add{flex:none;width:54px;height:96px;border-radius:9px;border:1.5px dashed rgba(255,255,255,.35);background:none;color:#fff;font-size:22px}',
      '.se-cvw{display:flex;justify-content:center}',
      '.se-cv{--u:3px;position:relative;width:min(100%,330px);aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#0b0713;border:1px solid rgba(255,255,255,.18);touch-action:none;user-select:none;-webkit-user-select:none}',
      '.se-cv>img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}',
      '.se-cv>img.bg.fit{object-fit:contain}',
      '.se-cv .srv-it{pointer-events:auto!important;touch-action:none;cursor:grab;outline:1.5px dashed transparent;outline-offset:4px}',
      '.se-cv .srv-it.sel{outline-color:#a78bfa}',
      '.se-gd{position:absolute;top:0;bottom:0;left:50%;width:0;border-left:1px dashed rgba(255,255,255,.7);opacity:0;pointer-events:none}.se-gd.on{opacity:1}',
      '.se-rng{width:100%}.se-lbl{display:flex;justify-content:space-between;font-size:12px;opacity:.8}',
      '.se-emo{display:flex;flex-wrap:wrap;gap:4px}.se-emo button{font-size:24px;background:none;border:0;padding:4px;cursor:pointer}',
      '.se-num{width:90px!important;flex:none!important}',
      '.se-cl{width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.25);padding:0;cursor:pointer}.se-cl.on{border-color:#fff;box-shadow:0 0 0 2px #7c3aed}',
      '.se-ig{display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:6px}',
      '.se-ib{height:48px;border-radius:10px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;padding:10px;cursor:pointer}.se-ib.on{border-color:#a78bfa;background:rgba(124,58,237,.35)}.se-ib svg{width:100%;height:100%}'
    ].join('');
    document.head.appendChild(st);
  }
  function ensure() {
    if (root) return;
    css();
    root = document.createElement('div'); root.id = 'se-root'; root.hidden = true;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    window.addEventListener('resize', function () { fitCv(); });
    window.addEventListener('popstate', function () { if (root && !root.hidden && pushed) { pushed = false; closeNow(); } });
  }
  var pushed = false;
  function open(sid, slideId) {
    if (!(typeof isAdmin !== 'undefined' && isAdmin)) { toast('Masuk sebagai admin dulu.'); return; }
    if (!window.TKA) { toast('Data toko belum siap, coba lagi.'); return; }
    ensure(); load();
    cur = -1; sj = 0; sel = -1; emoOn = false;
    if (sid) {
      for (var i = 0; i < S.length; i++) if (cid(S[i].id, 'sor') === cid(sid, 'sor')) { cur = i; break; }
      if (cur >= 0 && slideId) for (var j = 0; j < S[cur].slides.length; j++) if (cid(S[cur].slides[j].id, 'p' + j) === cid(slideId, 'p' + j)) { sj = j; break; }
    }
    root.hidden = false; document.documentElement.classList.add('tk-noscroll');
    try { history.pushState({ se: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    render();
  }
  function closeNow() { if (!root) return; root.hidden = true; document.documentElement.classList.remove('tk-noscroll'); }
  function close() {
    if (busy) return;
    if (dirty && !confirm('Ada perubahan yang belum disimpan. Keluar tanpa menyimpan?')) return;
    closeNow();
    if (pushed) { pushed = false; try { if (history.state && history.state.se) history.back(); } catch (e) {} }
  }

  function render() {
    if (!root) return;
    var keep = q('.se-body') ? q('.se-body').scrollTop : 0;
    var h = '<div class="se-top"><button class="se-btn" data-a="back">' + (cur >= 0 ? '‹ Daftar' : '✕') + '</button><b>' + (cur >= 0 ? esc(nameOf(S[cur])) : 'Atur Sorotan') + '</b><button class="se-btn pri se-save' + (dirty ? ' on' : '') + '" data-a="save">Simpan</button></div><div class="se-body">';
    h += cur < 0 ? listHtml() : detailHtml(S[cur]);
    root.innerHTML = h + '</div>';
    var b = q('.se-body'); if (b) b.scrollTop = keep;
    fitCv();
    var im = q('.se-cv > img.bg'); if (im && im.complete) adjImg(im);
    if (cur >= 0 && S[cur].music) getLen(S[cur].music, function () { var n = q('.se-songinfo'); if (n && cur >= 0) n.innerHTML = songInfo(S[cur]); });
  }
  function listHtml() {
    var h = '<p class="se-hint" style="margin:0 0 10px">Ketuk sorotan untuk mengedit foto, teks, lagu & durasi. Semua dikerjakan di sini, tidak perlu masuk Panel Admin.</p>';
    h += S.map(function (s, i) {
      return '<div class="se-card' + (s.hidden ? ' off' : '') + '"><button class="se-lg" data-a="go:' + i + '">' + logoOf(s) + '</button>' +
        '<div class="nm" data-a="go:' + i + '">' + esc(nameOf(s)) + '<small>' + s.slides.length + ' foto' + (s.music ? ' · ♫ lagu' : '') + (s.hidden ? ' · disembunyikan' : '') + '</small></div>' +
        '<button class="se-btn sm" data-a="up:' + i + '">↑</button><button class="se-btn sm" data-a="dn:' + i + '">↓</button></div>';
    }).join('');
    return h + '<button class="se-btn pri" style="width:100%;padding:12px" data-a="add">+ Tambah sorotan</button>';
  }
  function coverK(s) { return s.cov && (s.cov.k === 'emoji' || s.cov.k === 'ikon' || s.cov.k === 'slide') ? s.cov.k : 'foto'; }
  function coverHtml(s) {
    var k = coverK(s), I = T().ICO || {}, N = T().ICO_NAMES || {};
    var h = '<div class="se-row"><span class="se-hint">Gambar bulatan:</span>' + [['foto', 'Foto'], ['slide', 'Foto sorotan'], ['emoji', 'Emoji'], ['ikon', 'Ikon']].map(function (m) { return '<button class="se-chip' + (k === m[0] ? ' on' : '') + '" data-a="cvk:' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>';
    if (k === 'foto') h += '<div class="se-row"><button class="se-btn sm" data-a="logo">' + (s.logo ? 'Ganti foto' : '+ Pilih foto') + '</button></div>';
    else if (k === 'slide') h += '<div class="se-hint">Bulatan memakai foto pertama di sorotan ini.</div>';
    else if (k === 'emoji') h += '<input class="se-in" data-cv="emoji" value="' + esc((s.cov && s.cov.v) || '') + '" placeholder="Ketik atau tempel emoji"><div class="se-emo">' + EMO_COVER.map(function (e) { return '<button data-a="cve:' + e + '">' + e + '</button>'; }).join('') + '</div>';
    else {
      var cc = (s.cov && /^#[0-9a-f]{6}$/i.test(s.cov.c || '')) ? s.cov.c : '', cl = T().ICO_COLORS || [];
      h += '<div class="se-row"><span class="se-hint">Warna:</span><button class="se-cl' + (cc ? '' : ' on') + '" data-a="cvc:" style="background:#fff" title="Putih"></button>' + cl.map(function (c) { return '<button class="se-cl' + (cc === c ? ' on' : '') + '" data-a="cvc:' + c + '" style="background:' + c + '"></button>'; }).join('') + '</div>';
      h += '<div class="se-ig">' + Object.keys(I).map(function (n) { return '<button class="se-ib' + (s.cov && s.cov.v === n ? ' on' : '') + '" data-a="cvi:' + n + '" title="' + esc(N[n] || n) + '"' + (cc ? ' style="color:' + cc + '"' : '') + '>' + T().icoSvg(n) + '</button>'; }).join('') + '</div>';
    }
    return h;
  }
  function mcHtml(s) {
    var m = s.mc || {}, k = m.k === 'foto' ? 'foto' : 'auto';
    var h = '<div class="se-hint">Foto kecil di samping ikon lagu (atas story)</div><div class="se-row"><button class="se-chip' + (k === 'auto' ? ' on' : '') + '" data-a="mck:auto">Otomatis</button><button class="se-chip' + (k === 'foto' ? ' on' : '') + '" data-a="mck:foto">Foto sendiri</button></div>';
    if (k === 'foto') h += '<div class="se-row"><button class="se-btn sm" data-a="mcup">' + (m.v ? 'Ganti foto' : '+ Pilih foto') + '</button>' + (m.v ? '<img src="' + esc(m.v) + '" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover">' : '') + '</div>';
    return h;
  }
  function songInfo(s) {
    if (!s.music) return '';
    var L = songLen[s.music], n = s.slides.length;
    if (!L) return 'Membaca durasi lagu…';
    var avail = Math.max(1, L - (+s.ms || 0));
    return 'Lagu ' + Math.round(avail) + ' dtk' + (s.mmode === 'split' && n ? ' → ' + (Math.round(avail / n * 10) / 10) + ' dtk per foto (' + n + ' foto)' : ' → tiap foto ' + Math.round(avail) + ' dtk (lagu mulai ulang)');
  }
  function detailHtml(s) {
    var auto = s.ref || s.type === 'info';
    var h = '<div class="se-sec"><div class="se-row"><button class="se-lg" data-a="logo">' + logoOf(s) + '</button><input class="se-in" data-b="name" value="' + esc(s.name || '') + '" placeholder="' + esc(auto ? nameOf(s) : 'Nama sorotan') + '"></div>';
    if (s.type !== 'info') h += '<input class="se-in" data-b="link" value="' + esc(s.link || '') + '" placeholder="Link bulatan (dipakai kalau tidak ada foto)" inputmode="url" autocapitalize="off" spellcheck="false">';
    h += coverHtml(s);
    h += '<div class="se-row"><button class="se-btn sm" data-a="hide">' + (s.hidden ? 'Tampilkan' : 'Sembunyikan') + '</button>' + (s.logo ? '<button class="se-btn sm" data-a="logodel">Hapus logo</button>' : '') + '<button class="se-btn sm" data-a="up:' + cur + '">↑</button><button class="se-btn sm" data-a="dn:' + cur + '">↓</button><button class="se-btn sm del" data-a="del">Hapus sorotan</button></div></div>';
    if (s.type !== 'info' && s.music) {   // lagu sorotan lama (1 lagu utk semua foto): fitur dihapus, tinggal hapus; lagu sekarang per foto
      h += '<div class="se-sec"><b>♫ Lagu lama (sorotan)</b><div class="se-hint">Diganti lagu per foto. Hapus, lalu pasang lagu di tiap foto.</div><div class="se-row"><button class="se-btn sm del" data-a="songdel">Hapus lagu lama</button></div></div>';
    }
    h += '<div class="se-sec"><b>Foto</b><div class="se-strip">' + s.slides.map(function (sl, j) {
      return '<button class="se-th' + (j === sj ? ' on' : '') + '" data-a="sl:' + j + '"><img src="' + esc(sl.img) + '" alt=""><i>' + (j + 1) + '</i></button>';
    }).join('') + '<button class="se-add" data-a="sladd">+</button></div>';
    if (s.slides[sj]) h += slideHtml(s, s.slides[sj]);
    else h += '<div class="se-hint">Belum ada foto. Tekan + untuk menambah.</div>';
    return h + '</div>';
  }
  function itemHtml(it, k) {
    var st = 'left:' + it.x + '%;top:' + it.y + '%;--s:' + it.s + ';--r:' + it.r + 'deg';
    var cls = 'srv-it ' + (it.t === 'emoji' ? 'srv-emoji' : it.t === 'link' ? 'srv-link' : 'srv-text') + (k === sel ? ' sel' : '');
    if (it.t !== 'emoji' && fkOk(it.f)) { cls += ' srv-f-' + it.f; ensureFonts(); }
    if (it.t === 'text') { if (HEX.test(it.c || '')) st += ';--c:' + it.c; if (num(it.sw, 0, 0, 10) > 0) { st += ';--sw:' + num(it.sw, 0, 0, 10) + ';--sc:' + (HEX.test(it.sc || '') ? it.sc : '#000000'); cls += ' srv-st'; } }
    var inner = it.t === 'link' ? LINK_ICO + '<b>' + esc(it.text || 'Tombol') + '</b>' : esc(it.text || (it.t === 'emoji' ? '🙂' : 'Teks'));
    return '<span class="' + cls + '" data-k="' + k + '" style="' + st + '">' + inner + '</span>';
  }
  function slideHtml(s, sl) {
    var h = '';
    if (s.type !== 'info' && sl.music) h += '<div class="se-hint">Foto lagu untuk foto ke-' + (sj + 1) + ' (kecil di samping ikon lagu)</div><div class="se-row"><button class="se-btn sm" data-a="slmc">' + (sl.mc ? 'Ganti foto lagu' : '+ Foto lagu') + '</button>' + (sl.mc ? '<img src="' + esc(sl.mc) + '" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover"><button class="se-btn sm del" data-a="slmcdel">Hapus</button>' : '<span class="se-hint">kosong = otomatis</span>') + '</div>';
    h += '<div class="se-cvw"><div class="se-cv"><img class="bg" src="' + esc(sl.img) + '" alt="" draggable="false" onload="TkSE._adj(this)"><div class="se-gd"></div>' + sl.items.map(itemHtml).join('') + '</div></div>';
    h += '<div class="se-row" style="justify-content:center"><button class="se-btn sm" data-a="it:text">+ Teks</button><button class="se-btn sm" data-a="emo">+ Emoji</button><button class="se-btn sm" data-a="it:link">+ Tombol link</button></div>';
    if (emoOn) h += '<div class="se-emo">' + EMOJIS.map(function (e) { return '<button data-a="emopick:' + e + '">' + e + '</button>'; }).join('') + '</div>';
    h += '<div class="se-selbox">' + selHtml(sl) + '</div>';
    h += settingsHtml(s, sl);
    return h;
  }
  function swatch(act, cur_, none) {
    var h = (none ? '<button class="se-cl' + (!cur_ ? ' on' : '') + '" data-a="' + act + ':" style="background:linear-gradient(135deg,#fff 45%,#f43f5e 46%,#f43f5e 54%,#fff 55%)" title="Tanpa"></button>' : '');
    h += PAL.map(function (c) { return '<button class="se-cl' + (cur_ && cur_.toLowerCase() === c ? ' on' : '') + '" data-a="' + act + ':' + c + '" style="background:' + c + '"></button>'; }).join('');
    return h;
  }
  function styleHtml(it) {
    ensureFonts();
    var h = '<div class="se-hint">Font</div><div class="se-row">' + FONTS.map(function (f) { return '<button class="se-chip' + (fkOk(it.f) === f[0] ? ' on' : '') + (f[0] ? ' srv-f-' + f[0] : '') + '" data-a="tf:' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>';
    if (it.t === 'text') {
      var c = HEX.test(it.c || '') ? it.c : '#ffffff', sc = HEX.test(it.sc || '') ? it.sc : '#000000', sw = num(it.sw, 0, 0, 10);
      h += '<div class="se-hint">Warna teks</div><div class="se-row">' + swatch('tc', c) + '<input type="color" data-i="c" value="' + c + '" style="width:30px;height:30px;padding:0;border:0;background:none">' + '</div>';
      h += '<label class="se-lbl"><span>Stroke (garis tepi)</span><b data-v="sw">' + (sw ? sw : 'mati') + '</b></label><input class="se-rng" type="range" min="0" max="10" step="0.5" data-i="sw" value="' + sw + '">';
      h += '<div class="se-hint">Warna stroke</div><div class="se-row">' + swatch('sc', sc) + '<input type="color" data-i="sc" value="' + sc + '" style="width:30px;height:30px;padding:0;border:0;background:none"></div>';
    }
    return h;
  }
  function selHtml(sl) {
    var h = '', it = sl.items[sel];
    if (it) {
      h += '<div class="se-sec" data-sel><b>' + (it.t === 'emoji' ? 'Emoji' : it.t === 'link' ? 'Tombol link' : 'Teks') + ' terpilih — geser 1 jari, zoom & putar 2 jari</b>';
      if (it.t === 'emoji') h += '<input class="se-in" data-i="text" value="' + esc(it.text) + '">';
      else h += '<textarea class="se-in" rows="' + (it.t === 'link' ? 1 : 2) + '" data-i="text" placeholder="' + (it.t === 'link' ? 'Tulisan tombol' : 'Isi teks') + '">' + esc(it.text) + '</textarea>';
      if (it.t === 'link') h += '<input class="se-in" data-i="link" value="' + esc(it.link) + '" placeholder="Link https://…" inputmode="url" autocapitalize="off" spellcheck="false">';
      h += '<label class="se-lbl"><span>Ukuran</span><b data-v="s">' + Math.round(it.s * 100) + '%</b></label><input class="se-rng" type="range" min="50" max="350" step="5" data-i="s100" value="' + Math.round(it.s * 100) + '">' +
        '<label class="se-lbl"><span>Putar</span><b data-v="r">' + Math.round(it.r) + '°</b></label><input class="se-rng" type="range" min="-180" max="180" step="1" data-i="r" value="' + Math.round(it.r) + '">' +
        (it.t === 'emoji' ? '' : styleHtml(it)) +
        '<div class="se-row"><button class="se-btn sm" data-a="r0">Luruskan</button><button class="se-btn sm" data-a="ctr">Tengah</button><button class="se-btn sm del" data-a="itdel">Hapus elemen</button></div></div>';
    } else h += '<div class="se-hint" style="text-align:center">Ketuk elemen di foto untuk memilih.</div>';
    return h;
  }
  function settingsHtml(s, sl) {
    var h = '<div class="se-sec"><b>Pengaturan foto ' + (sj + 1) + '</b><div class="se-row"><span class="se-hint">Durasi (detik)</span><input class="se-in se-num" type="number" min="0" max="120" step="0.5" inputmode="decimal" data-sl="dur" value="' + (sl.dur || '') + '" placeholder="auto"><span class="se-hint">kosong = ikut lagu / 5 dtk</span></div>';
    if (s.type !== 'info') {
      if (sl.music) h += '<audio controls preload="none" src="' + esc(sl.music) + '" style="width:100%;height:36px"></audio><div class="se-row"><span class="se-hint">Lagu foto ini mulai detik</span><input class="se-in se-num" type="number" min="0" step="1" inputmode="numeric" data-sl="ms" value="' + esc(sl.ms || 0) + '"></div><div class="se-row"><button class="se-btn sm" data-a="slsong">Ganti lagu foto</button><button class="se-btn sm del" data-a="slsongdel">Hapus lagu foto</button></div><div class="se-hint">Foto ini memutar lagunya sendiri dari awal sampai habis (durasi = lagu).</div>';
      else h += '<button class="se-btn sm" data-a="slsong" style="align-self:flex-start">+ Lagu khusus foto ini</button>';
    }
    h += '<div class="se-row"><span class="se-hint">Tampil:</span>' + [['', 'Otomatis'], ['cover', 'Penuh'], ['contain', 'Utuh']].map(function (m) { return '<button class="se-chip' + (sl.fit === m[0] ? ' on' : '') + '" data-a="fit:' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="se-row"><button class="se-btn sm" data-a="slimg">Ganti gambar</button><button class="se-btn sm" data-a="slup">← Maju</button><button class="se-btn sm" data-a="sldn">Mundur →</button><button class="se-btn sm del" data-a="sldel">Hapus foto</button></div></div>';
    return h;
  }
  function adjImg(im) {
    var box = im.parentNode; if (!box) return;
    var sl = cur >= 0 && S[cur] && S[cur].slides[sj], css_ = '';
    try { if (sl && T().photoCss) css_ = T().photoCss(sl, box.clientWidth, box.clientHeight, im.naturalWidth, im.naturalHeight); } catch (e) {}
    im.style.cssText = css_;
    im.classList.toggle('fit', !css_ && im.naturalWidth / im.naturalHeight > 0.72);
  }
  function fitCv() { var c = q('.se-cv'); if (c) c.style.setProperty('--u', (c.clientWidth / 100) + 'px'); }

  /* ---------- aksi ---------- */
  function slide() { return cur >= 0 && S[cur] && S[cur].slides[sj]; }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return false; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; return true; }
  function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el || busy) return;
    var a = el.getAttribute('data-a').split(':'), act = a[0], n = a[1], s = S[cur], sl = slide(), ch = true;
    if (act === 'back') { if (cur >= 0) { cur = -1; sel = -1; emoOn = false; render(); } else close(); return; }
    if (act === 'save') { save(); return; }
    if (act === 'go') { cur = +n; sj = 0; sel = -1; emoOn = false; render(); return; }
    if (act === 'add') { S.push({ id: uid(), name: '', logo: '', link: '', slides: [], hidden: false, music: '', ms: 0, mmode: 'split' }); cur = S.length - 1; sj = 0; }
    else if (act === 'up') { if (!move(S, +n, -1)) ch = false; else if (cur >= 0) cur = Math.max(0, cur - 1); }
    else if (act === 'dn') { if (!move(S, +n, 1)) ch = false; else if (cur >= 0) cur = Math.min(S.length - 1, cur + 1); }
    else if (act === 'hide') s.hidden = !s.hidden;
    else if (act === 'cvk') { var ck = coverK(s); s.cov = n === 'foto' ? null : { k: n, v: ck === n ? ((s.cov && s.cov.v) || '') : '' }; }
    else if (act === 'cve') s.cov = { k: 'emoji', v: n };
    else if (act === 'cvi') s.cov = { k: 'ikon', v: n, c: (s.cov && s.cov.k === 'ikon' && s.cov.c) || '' };
    else if (act === 'cvc') { if (s.cov && s.cov.k === 'ikon') s.cov.c = n || ''; else ch = false; }
    else if (act === 'del') { if (confirm('Hapus sorotan "' + nameOf(s) + '"?')) { S.splice(cur, 1); cur = -1; } else ch = false; }
    else if (act === 'logo') { upLogo(function (u) { s.logo = u; }); return; }
    else if (act === 'logodel') s.logo = '';
    else if (act === 'song') { upSong(function (u) { s.music = u; s.ms = 0; }); return; }
    else if (act === 'songdel') { s.music = ''; s.ms = 0; }
    else if (act === 'mck') { var o0 = s.mc || {}; s.mc = n === 'auto' ? null : { k: n, v: o0.k === n ? (o0.v || '') : '', c: o0.k === n ? (o0.c || '') : '' }; }
    else if (act === 'mcup') { upLogo(function (u) { s.mc = { k: 'foto', v: u }; }); return; }
    else if (act === 'mce') s.mc = { k: 'emoji', v: n };
    else if (act === 'mci') s.mc = { k: 'ikon', v: n, c: (s.mc && s.mc.k === 'ikon' && s.mc.c) || '' };
    else if (act === 'mcc') { if (s.mc && s.mc.k === 'ikon') s.mc.c = n || ''; else ch = false; }
    else if (act === 'mm') s.mmode = n === 'each' ? 'each' : 'split';
    else if (act === 'sl') { sj = +n; sel = -1; emoOn = false; render(); return; }
    else if (act === 'sladd') { upImage(function (u) { s.slides.push({ id: uid(), img: u, items: [], fit: '', rot: 0, zoom: 1, fx: 50, fy: 50, dur: 0, music: '', ms: 0, mc: '' }); sj = s.slides.length - 1; sel = -1; }); return; }
    else if (act === 'slimg') { upImage(function (u) { sl.img = u; }); return; }
    else if (act === 'sldel') { if (confirm('Hapus foto ini?')) { s.slides.splice(sj, 1); sj = Math.max(0, sj - 1); sel = -1; } else ch = false; }
    else if (act === 'slup') { if (move(s.slides, sj, -1)) sj--; else ch = false; }
    else if (act === 'sldn') { if (move(s.slides, sj, 1)) sj++; else ch = false; }
    else if (act === 'slsong') { upSong(function (u) { sl.music = u; sl.ms = 0; }); return; }
    else if (act === 'slsongdel') { sl.music = ''; sl.ms = 0; }
    else if (act === 'slmc') { upLogo(function (u) { sl.mc = u; }); return; }
    else if (act === 'slmcdel') sl.mc = '';
    else if (act === 'fit') sl.fit = n === 'cover' || n === 'contain' ? n : '';
    else if (act === 'emo') { emoOn = !emoOn; render(); return; }
    else if (act === 'it' || act === 'emopick') {
      var k = sl.items.length, off = Math.min(k, 5) * 6;
      var it = act === 'emopick' ? { t: 'emoji', text: n, x: 50, y: 40 + off, s: 1 } : n === 'link' ? { t: 'link', text: 'CEK STOK DISINI', link: '', x: 50, y: 66 + Math.min(k, 3) * 4, s: 1 } : { t: 'text', text: 'Teks baru', x: 50, y: 30 + off, s: 1 };
      sl.items.push(normItem(it)); sel = sl.items.length - 1; emoOn = false;
    }
    else if (act === 'itdel') { sl.items.splice(sel, 1); sel = -1; }
    else if (act === 'r0') { sl.items[sel].r = 0; }
    else if (act === 'tf') { sl.items[sel].f = fkOk(n); }
    else if (act === 'tc') { sl.items[sel].c = HEX.test(n || '') ? n : ''; }
    else if (act === 'sc') { sl.items[sel].sc = HEX.test(n || '') ? n : ''; }
    else if (act === 'ctr') { sl.items[sel].x = 50; }
    else ch = false;
    if (ch) { dirtyOn(); render(); }
  }
  function onInput(e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var s = S[cur], sl = slide(), b = t.getAttribute('data-b'), i = t.getAttribute('data-i'), d = t.getAttribute('data-sl');
    if (t.getAttribute('data-mc') === 'emoji') { s.mc = { k: 'emoji', v: Array.from(t.value.trim()).slice(0, 2).join('') }; dirtyOn(); return; }
    if (t.getAttribute('data-cv') === 'emoji') { s.cov = { k: 'emoji', v: Array.from(t.value.trim()).slice(0, 2).join('') }; dirtyOn(); return; }
    if (b) { s[b] = b === 'ms' ? Math.max(0, parseFloat(t.value) || 0) : t.value; dirtyOn(); if (b === 'ms') { var n = q('.se-songinfo'); if (n) n.innerHTML = songInfo(s); } return; }
    if (d && sl) { sl[d] = d === 'dur' ? Math.max(0, Math.min(120, parseFloat(t.value) || 0)) : Math.max(0, parseFloat(t.value) || 0); dirtyOn(); return; }
    if (i && sl && sel >= 0) {
      var it = sl.items[sel], el = q('.se-cv .srv-it[data-k="' + sel + '"]');
      if (i === 'text') { it.text = t.value; if (el) { var tg = el.querySelector('b') || el; tg.textContent = t.value || (it.t === 'emoji' ? '🙂' : it.t === 'link' ? 'Tombol' : 'Teks'); } }
      else if (i === 'link') it.link = t.value;
      else if (i === 's100') { it.s = num(t.value / 100, 1, .5, 3.5); if (el) el.style.setProperty('--s', it.s); var lv = q('[data-v="s"]'); if (lv) lv.textContent = Math.round(it.s * 100) + '%'; }
      else if (i === 'c' || i === 'sc') { if (HEX.test(t.value)) { it[i] = t.value; if (el) { if (i === 'c') el.style.setProperty('--c', t.value); else el.style.setProperty('--sc', t.value); } } }
      else if (i === 'sw') { it.sw = num(t.value, 0, 0, 10); if (el) { el.classList.toggle('srv-st', it.sw > 0 && it.t === 'text'); el.style.setProperty('--sw', it.sw); if (!HEX.test(it.sc || '')) el.style.setProperty('--sc', '#000000'); } var lw = q('[data-v="sw"]'); if (lw) lw.textContent = it.sw || 'mati'; }
      else if (i === 'r') { it.r = num(t.value, 0, -180, 180); if (el) el.style.setProperty('--r', it.r + 'deg'); var lr = q('[data-v="r"]'); if (lr) lr.textContent = Math.round(it.r) + '°'; }
      dirtyOn();
    }
  }

  /* ---------- gesture: 1 jari geser, 2 jari zoom + putar (seperti TikTok / Instagram) ---------- */
  var ptrs = {}, g = null, emptyTap = false;
  function cvOf(e) { return e.target.closest ? e.target.closest('.se-cv') : null; }
  function pcount() { return Object.keys(ptrs).length; }
  function two() { var k = Object.keys(ptrs); if (k.length < 2) return null; var a = ptrs[k[0]], b = ptrs[k[1]]; return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI }; }
  function syncPanel(it) {
    var sv = q('[data-v="s"]'), rv = q('[data-v="r"]'), sr = q('[data-i="s100"]'), rr = q('[data-i="r"]');
    if (sv) sv.textContent = Math.round(it.s * 100) + '%'; if (rv) rv.textContent = Math.round(it.r) + '°';
    if (sr) sr.value = Math.round(it.s * 100); if (rr) rr.value = Math.round(it.r);
  }
  function selectEl(cv, k) {
    sel = k; emoOn = false;
    var all = cv.querySelectorAll('.srv-it'); for (var n = 0; n < all.length; n++) all[n].classList.toggle('sel', +all[n].getAttribute('data-k') === k);
  }
  document.addEventListener('pointerdown', function (e) {
    if (!root || root.hidden) return;
    var cv = cvOf(e); if (!cv) return;
    var sl = slide(); if (!sl) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var elx = e.target.closest('.srv-it');
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    if (pcount() > 1) emptyTap = false;
    if (pcount() === 1) {
      if (elx) {
        var k = +elx.getAttribute('data-k'), wasSel = sel === k;
        selectEl(cv, k);
        var it = sl.items[k];
        g = { cv: cv, el: elx, it: it, k: k, r: cv.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, moved: false, wasSel: wasSel, pinch: null, changed: false };
        rerenderPanel(sl);
      } else { g = null; emptyTap = true; }
    } else if (pcount() === 2 && sel >= 0 && sl.items[sel]) {
      var it2 = sl.items[sel], t2 = two(), el2 = cv.querySelector('.srv-it[data-k="' + sel + '"]');
      g = g || { cv: cv, el: el2, it: it2, k: sel, r: cv.getBoundingClientRect(), moved: true, changed: false };
      g.el = el2; g.it = it2; g.moved = true; g.pinch = { d: t2.d, ang: t2.ang, s: it2.s, r: it2.r };
    }
    e.preventDefault();
  }, { passive: false });
  function rerenderPanel(sl) { var bx = q('.se-selbox'); if (bx) bx.innerHTML = selHtml(sl); }
  document.addEventListener('pointermove', function (e) {
    if (!g || !ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var it = g.it, gd = g.cv.querySelector('.se-gd');
    if (pcount() >= 2 && g.pinch) {
      var t = two(); if (!t) return;
      it.s = num(g.pinch.s * t.d / g.pinch.d, 1, .5, 3.5);
      var r = g.pinch.r + (t.ang - g.pinch.ang); while (r > 180) r -= 360; while (r < -180) r += 360;
      it.r = Math.round(r * 10) / 10;
      g.el.style.setProperty('--s', it.s); g.el.style.setProperty('--r', it.r + 'deg');
      g.changed = true; syncPanel(it); e.preventDefault(); return;
    }
    if (pcount() === 1 && g.pinch == null) {
      var dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      g.moved = true;
      var x = num(g.ox + dx / g.r.width * 100, 50, 3, 97), y = num(g.oy + dy / g.r.height * 100, 50, 3, 97), snap = Math.abs(x - 50) < 2;
      if (snap) x = 50;
      if (gd) gd.classList.toggle('on', snap);
      it.x = Math.round(x * 10) / 10; it.y = Math.round(y * 10) / 10;
      g.el.style.left = it.x + '%'; g.el.style.top = it.y + '%'; g.changed = true;
      e.preventDefault();
    }
  }, { passive: false });
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    if (!g && pcount() === 0 && emptyTap) { emptyTap = false; var c0 = q('.se-cv'), sl0 = slide(); if (c0 && sl0 && sel !== -1) { selectEl(c0, -1); rerenderPanel(sl0); } }
    if (g) {
      var gd = g.cv.querySelector('.se-gd'); if (gd) gd.classList.remove('on');
      if (g.changed) dirtyOn();
      if (pcount() === 1 && g.pinch) { var k2 = Object.keys(ptrs)[0], p = ptrs[k2]; g.pinch = null; g.sx = p.x; g.sy = p.y; g.ox = g.it.x; g.oy = g.it.y; g.moved = true; g.dead = true; }
      if (pcount() === 0) {
        if (!g.moved && g.wasSel && !g.changed) { var ta = q('[data-i="text"]'); if (ta && g.it.t !== 'emoji') { try { ta.focus(); } catch (x) {} } }
        g = null;
      }
    }
  }
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  /* mouse / trackpad: gulir = zoom, Shift + gulir = putar */
  document.addEventListener('wheel', function (e) {
    if (!root || root.hidden || !cvOf(e)) return;
    var sl = slide(); if (!sl || sel < 0 || !sl.items[sel]) return;
    var it = sl.items[sel], el = q('.se-cv .srv-it[data-k="' + sel + '"]');
    if (e.shiftKey) { var r = it.r + (e.deltaY > 0 ? 3 : -3); while (r > 180) r -= 360; while (r < -180) r += 360; it.r = r; el && el.style.setProperty('--r', r + 'deg'); }
    else { it.s = num(it.s * Math.exp(-e.deltaY * 0.002), 1, .5, 3.5); el && el.style.setProperty('--s', it.s); }
    syncPanel(it); dirtyOn(); e.preventDefault();
  }, { passive: false });

  /* ---------- simpan ---------- */
  async function save() {
    if (busy) return; busy = true;
    var b = q('.se-save'); if (b) b.textContent = 'Menyimpan…';
    var out;
    try { out = S.map(function (s) {
      var slides = s.slides.filter(function (x) { return x.img; }).map(function (x) {
        var items = x.items.map(function (it) {
          var o = { id: it.id || uid(), t: it.t, text: String(it.text || '').trim().slice(0, 120), x: num(it.x, 50, 3, 97), y: num(it.y, 50, 3, 97), s: num(it.s, 1, .5, 3.5), r: Math.round(num(it.r, 0, -180, 180)) };
          if (it.t === 'link') o.link = T().normUrl ? T().normUrl(it.link) : it.link;
          if (it.t !== 'emoji' && fkOk(it.f)) o.f = it.f;
          if (it.t === 'text') { if (HEX.test(it.c || '') && it.c.toLowerCase() !== '#ffffff') o.c = it.c; var sw_ = num(it.sw, 0, 0, 10); if (sw_ > 0) { o.sw = sw_; o.sc = HEX.test(it.sc || '') ? it.sc : '#000000'; } }
          return o;
        }).filter(function (o) { return o.text; });
        var ad = T().photoAdj(x), sv = { id: x.id || uid(), img: x.img, items: items };
        if (ad.any) { sv.fit = ad.fit; sv.rot = ad.rot; sv.zoom = Math.round(ad.zoom * 100) / 100; sv.fx = Math.round(ad.fx); sv.fy = Math.round(ad.fy); }
        if (+x.dur > 0) sv.dur = Math.round(Math.min(120, +x.dur) * 10) / 10;
        if (okUrl(x.mc)) sv.mc = x.mc;
        if (okUrl(x.music)) { sv.music = x.music; sv.ms = Math.max(0, Math.round(+x.ms || 0)); }
        return sv;
      });
      var o = { id: s.id || uid(), name: String(s.name || '').trim(), logo: s.logo || '', link: s.type === 'info' ? '' : (T().normUrl ? T().normUrl(s.link) : s.link), slides: slides, hidden: !!s.hidden };
      if (s.ref) o.ref = s.ref; if (s.type) o.type = s.type;
      if (s.cov && s.cov.k === 'slide') o.cov = { k: 'slide' };
      else if (s.cov && ((s.cov.k === 'emoji' && s.cov.v) || (s.cov.k === 'ikon' && T().ICO && T().ICO[s.cov.v]))) { o.cov = { k: s.cov.k, v: s.cov.v }; if (s.cov.k === 'ikon' && /^#[0-9a-f]{6}$/i.test(s.cov.c || '')) o.cov.c = s.cov.c; }
      if (okUrl(s.music) && s.mc) {
        var mc_ = s.mc;
        if (mc_.k === 'logo' || mc_.k === 'slide') o.mc = { k: mc_.k };
        else if (mc_.k === 'foto' && okUrl(mc_.v)) o.mc = { k: 'foto', v: mc_.v };
        else if (mc_.k === 'emoji' && mc_.v) o.mc = { k: 'emoji', v: mc_.v };
        else if (mc_.k === 'ikon' && T().ICO && T().ICO[mc_.v]) { o.mc = { k: 'ikon', v: mc_.v }; if (/^#[0-9a-f]{6}$/i.test(mc_.c || '')) o.mc.c = mc_.c; }
      }
      if (okUrl(s.music)) { o.music = s.music; o.ms = Math.max(0, Math.round(+s.ms || 0)); if (s.mmode === 'each') o.mmode = 'each'; }
      return o;
    }).filter(function (o) { return o.ref || o.type || o.name || o.logo || o.link || o.slides.length; });
    } catch (e) { console.error(e); busy = false; toast('Gagal menyimpan: ' + (e && e.message || 'data tidak valid')); render(); return; }
    var ok = false;
    try { ok = await saveProfile({ sorotan: out }); } catch (e) { console.error(e); }
    if (ok) { try { profile.sorotan = out; T().renderAll(); } catch (e) { console.error(e); } dirty = false; toast('Sorotan tersimpan ✓'); }   /* langsung tampil dari data lokal: tidak perlu unduh ulang seluruh profil */
    else toast('Gagal menyimpan. Coba lagi.');
    busy = false;
    if (ok) load();
    render();
  }

  window.TkSE = { open: open, _adj: adjImg };
})();
