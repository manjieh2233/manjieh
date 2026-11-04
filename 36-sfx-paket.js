/* 36-sfx-paket.js — FILE BARU: paket efek suara yang bisa dipilih admin (Panel Admin > Dashboard > "Suara efek").
   Dimuat SETELAH 02-notif-templates-toast-sfx.js (pakai getSfxCtx() & sfxMasterBus di sana: AudioContext, compressor, unlock sentuhan pertama).
   playSfx(kind) di 02 memanggil sfxPackPlay(); paket yang dipakai = profile.sfxPaket (disimpan di server -> berlaku untuk semua pengunjung).
   Paket: klasik (A, versi diperhalus) | pop (B) | air (J) | hud (W) | menu (Z). Kosong / tidak dikenal -> klasik.
   Jenis bunyi yang dimintai toko: tap open close swipe filterSelect like wishlist link gameSwitch share buy. */
(function () {
  'use strict';

  var PACKS = [
    { key: 'hud',    name: 'W. HUD futuristik',       desc: 'Blip digital bersih, sapuan naik-turun, konfirmasi ala sistem.' },
    { key: 'menu',   name: 'Z. Menu game',            desc: 'Whoosh dan "ting" logam khas menu game mobile.' },
    { key: 'air',    name: 'J. Tetesan air',          desc: 'Plop lembut meluncur naik dengan gema kecil.' },
    { key: 'pop',    name: 'B. Pop lembut',           desc: 'Bunyi "plop" bulat seperti gelembung.' },
    { key: 'klasik', name: 'A. Klasik (diperhalus)',  desc: 'Bunyi lama toko, sekarang tanpa klik tajam dan tidak patah-patah.' }
  ];
  var DEFAULT_KEY = 'klasik';
  var TRIM = 0.75;               // samakan kerasnya dengan contoh yang didengarkan
  var bus = null, wetGain = null, busCtx = null;

  /* ===== jalur suara khusus paket: voices -> bus -> (dry) sfxMasterBus  +  (reverb kecil) -> sfxMasterBus ===== */
  function getBus(ctx) {
    if (bus && busCtx === ctx) return bus;
    busCtx = ctx;
    bus = ctx.createGain();
    bus.gain.value = TRIM;
    var dest = (typeof sfxMasterBus !== 'undefined' && sfxMasterBus) ? sfxMasterBus : ctx.destination;
    bus.connect(dest);
    try {
      var len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      var cv = ctx.createConvolver(); cv.buffer = ir;
      wetGain = ctx.createGain(); wetGain.gain.value = 0;
      bus.connect(cv); cv.connect(wetGain); wetGain.connect(dest);
    } catch (e) { wetGain = null; }
    return bus;
  }

  /* ===== suara dasar ===== */
  var C = null;   // ctx yang sedang dipakai
  function tone(t, f, d, o) {
    o = o || {};
    var parts = o.parts || [[1, 1, 1]], g0 = o.g == null ? 0.5 : o.g;
    parts.forEach(function (p) {
      var os = C.createOscillator(), g = C.createGain(), fl = C.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = o.lp || 8000;
      os.type = o.type || 'sine';
      os.frequency.setValueAtTime(f * p[0], t);
      if (o.to) os.frequency.exponentialRampToValueAtTime(o.to * p[0], t + d * (o.tp || 0.6));
      var dd = d * (p[2] || 1), a = Math.max(o.att || 0.004, 0.006);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(g0 * p[1], 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dd, a + 0.01));
      os.connect(g); g.connect(fl); fl.connect(bus);
      os.start(t); os.stop(t + Math.max(dd, a + 0.01) + 0.06);
    });
  }
  function noise(t, d, f1, f2, q, g) {
    var n = Math.floor(C.sampleRate * d), b = C.createBuffer(1, n, C.sampleRate), o = b.getChannelData(0);
    for (var i = 0; i < n; i++) o[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
    var s = C.createBufferSource(), bp = C.createBiquadFilter(), gn = C.createGain();
    s.buffer = b; bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f1, t); bp.frequency.exponentialRampToValueAtTime(f2, t + d);
    gn.gain.value = g; s.connect(bp); bp.connect(gn); gn.connect(bus); s.start(t);
  }
  function chord(t, fs, d, g) {
    fs.forEach(function (f) {
      [-4, 4].forEach(function (c) {
        var os = C.createOscillator(), fl = C.createBiquadFilter(), gn = C.createGain();
        os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = c;
        fl.type = 'lowpass'; fl.frequency.value = 2400;
        gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
        os.connect(fl); fl.connect(gn); gn.connect(bus); os.start(t); os.stop(t + d + 0.06);
      });
    });
  }
  var BELL = [[1, 1, 1], [2.76, 0.3, 0.5], [5.4, 0.12, 0.3]];
  function bell(t, f, g, d) { tone(t, f, d || 0.5, { parts: BELL, g: g || 0.3, att: 0.002 }); }
  function blip(t, f1, f2, g) { tone(t, f1, 0.06, { to: f2, g: g || 0.35, att: 0.002 }); }
  function tink(t, f, g) { tone(t, f, 0.1, { parts: [[1, 1, 0.8], [2.4, 0.5, 0.5], [5.1, 0.3, 0.25]], g: g || 0.3, att: 0.001 }); }

  /* tangga nada pentatonik: nada acak tetap selalu serasi */
  var SC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  var lastR = -1;
  function R(mx) { var r, n = SC.length - mx; do { r = Math.floor(Math.random() * n); } while (r === lastR && n > 1); lastR = r; return r; }
  function seq(t, r, o, gap, fn) { o.forEach(function (x, i) { fn(t + i * gap, SC[Math.min(r + x, SC.length - 1)]); }); }

  /* jenis bunyi tambahan di toko dipetakan ke bunyi yang sudah ada */
  var ALIAS = { wishlist: 'like', link: 'share', gameSwitch: 'filterSelect' };

  /* ===== paket W: HUD futuristik ===== */
  function packHud(e, t) {
    var r;
    if (e === 'tap') { r = R(0); blip(t, SC[r] * 1.3, SC[r] * 1.6); }
    else if (e === 'swipe') { noise(t, 0.05, 5000, 6000, 3, 0.12); }
    else if (e === 'open') { tone(t, 500, 0.14, { to: 1500, tp: 1, g: 0.2 }); blip(t + 0.12, 1800, 2100, 0.25); }
    else if (e === 'close') { tone(t, 1500, 0.14, { to: 500, tp: 1, g: 0.2 }); }
    else if (e === 'filterSelect') { r = R(1); seq(t, r, [0, 1], 0.05, function (a, f) { blip(a, f * 1.3, f * 1.5); }); }
    else if (e === 'like') { r = R(2); seq(t, r, [0, 2], 0.06, function (a, f) { blip(a, f * 1.3, f * 1.7); }); bell(t + 0.1, SC[r + 2] * 2, 0.12, 0.4); }
    else if (e === 'share') { r = R(2); seq(t, r, [0, 1, 2], 0.06, function (a, f) { blip(a, f * 1.3, f * 1.6); }); }
    else { tone(t, 300, 0.25, { to: 1800, tp: 1, g: 0.2, att: 0.03 }); [523, 784, 1047].forEach(function (f) { tone(t + 0.25, f, 0.4, { g: 0.25 }); }); blip(t + 0.28, 2400, 2800, 0.2); }
  }
  /* ===== paket Z: Menu game ===== */
  function packMenu(e, t) {
    var r;
    if (e === 'tap') { r = R(0); tink(t, 1200 + r * 120); }
    else if (e === 'swipe') { noise(t, 0.1, 800, 2500, 1.5, 0.15); }
    else if (e === 'open') { noise(t, 0.18, 500, 3000, 1.5, 0.3); tink(t + 0.12, 1800, 0.3); }
    else if (e === 'close') { noise(t, 0.18, 3000, 500, 1.5, 0.3); tink(t + 0.12, 900, 0.3); }
    else if (e === 'filterSelect') { tink(t, 1400); tink(t + 0.05, 1900); }
    else if (e === 'like') { tink(t, 1500); bell(t + 0.06, 2637, 0.2, 0.5); }
    else if (e === 'share') { noise(t, 0.15, 500, 3000, 1.5, 0.25); [1500, 1800, 2200].forEach(function (f, i) { tink(t + 0.12 + i * 0.06, f); }); }
    else { noise(t, 0.25, 400, 3500, 1.5, 0.3); chord(t + 0.2, [523, 784, 1047, 1319], 0.35, 0.07); [2093, 2637, 3136].forEach(function (f, i) { bell(t + 0.3 + i * 0.05, f, 0.12, 0.4); }); }
  }
  /* ===== paket J: Tetesan air ===== */
  var MEL = {
    tap: [[1318, 0.12, 0, 1]], open: [[659, 0.2, 0, 1]], close: [[659, 0.12, 0, 1], [494, 0.18, 0.07, 1]], swipe: [[1568, 0.06, 0, 0.35]],
    filterSelect: [[784, 0.1, 0, 1], [1046, 0.14, 0.06, 1]], like: [[1046, 0.2, 0, 1], [1318, 0.2, 0.08, 1], [1568, 0.3, 0.16, 1]],
    share: [[523, 0.2, 0, 1], [659, 0.2, 0.08, 1], [784, 0.2, 0.16, 1], [1046, 0.35, 0.24, 1]],
    buy: [[523, 0.2, 0, 1], [659, 0.2, 0.06, 1], [784, 0.2, 0.12, 1], [1046, 0.25, 0.18, 1], [1318, 0.45, 0.24, 1]]
  };
  function packAir(e, t) {
    (MEL[e] || MEL.tap).forEach(function (n) {
      var tt = t + n[2], f = n[0], g = n[3];
      tone(tt, f * 0.5, 0.1, { to: f * 1.2, g: 0.5 * g, att: 0.004 });
      tone(tt + 0.11, f * 0.5, 0.1, { to: f * 1.2, g: 0.16 * g, att: 0.004 });
    });
  }
  /* ===== paket B: Pop lembut ===== */
  function packPop(e, t) {
    var P = function (f1, f2, d, dl, g) { tone(t + (dl || 0), f1, d, { to: f2, g: g || 0.55, att: 0.004 }); };
    if (e === 'tap') P(300, 520, 0.07);
    else if (e === 'open') P(380, 640, 0.09);
    else if (e === 'close') P(600, 320, 0.09);
    else if (e === 'swipe') P(260, 330, 0.04, 0, 0.25);
    else if (e === 'filterSelect') { P(420, 700, 0.07); P(560, 900, 0.08, 0.06); }
    else if (e === 'like') { P(500, 900, 0.09); P(700, 1200, 0.12, 0.08); }
    else if (e === 'share') { P(450, 720, 0.08); P(560, 900, 0.08, 0.08); P(700, 1100, 0.12, 0.16); }
    else { P(450, 720, 0.08); P(560, 900, 0.08, 0.07); P(700, 1100, 0.08, 0.14); P(900, 1400, 0.1, 0.21); tone(t + 0.24, 1568, 0.35, { g: 0.25, parts: BELL, att: 0.002 }); }
  }
  /* ===== paket A: Klasik, diperhalus =====
     Nada & urutannya sama seperti bunyi lama, tapi: hanya gelombang sine (+ sedikit harmonik hangat) -- tidak ada lagi gelombang
     triangle/klik tajam 1,3-1,8 kHz yang bikin "sakit" di kuping; awal bunyi naik halus (linear) dan habisnya meluruh pelan
     (tidak terpotong) sehingga tidak "pop"/patah-patah. */
  var WARM = [[1, 1, 1], [2, 0.12, 0.6]];
  function packKlasik(e, t) {
    var N = function (f, d, dl, to, g) { tone(t + (dl || 0), f, d * 1.5, { parts: WARM, to: to, tp: 0.7, g: g || 0.42, lp: 5000, att: 0.012 }); };
    if (e === 'tap') N(520, 0.07);
    else if (e === 'open') N(440, 0.1);
    else if (e === 'close') N(480, 0.11, 0, 270);
    else if (e === 'swipe') N(420, 0.05, 0, 330, 0.18);
    else if (e === 'filterSelect') { N(700, 0.06); N(1046.5, 0.08, 0.05); }
    else if (e === 'like') N(880, 0.12);
    else if (e === 'share') { N(523.25, 0.09); N(659.25, 0.09, 0.08); N(783.99, 0.18, 0.16); }
    else { N(523.25, 0.07); N(659.25, 0.07, 0.06); N(783.99, 0.07, 0.12); N(1046.5, 0.26, 0.18); }
  }

  var IMPL = {
    hud:    { fn: packHud,    wet: 0.12 },
    menu:   { fn: packMenu,   wet: 0.15 },
    air:    { fn: packAir,    wet: 0 },
    pop:    { fn: packPop,    wet: 0 },
    klasik: { fn: packKlasik, wet: 0 }
  };

  window.SFX_PACKS = PACKS;
  window.sfxPackKey = function () {
    var k = '';
    try { k = (typeof profile !== 'undefined' && profile && profile.sfxPaket) ? String(profile.sfxPaket) : ''; } catch (e) {}
    return IMPL[k] ? k : DEFAULT_KEY;
  };
  /* Dipanggil playSfx() (02) dan pratinjau admin. ctx = AudioContext yang sudah aktif, now = ctx.currentTime (atau lebih), key opsional = paksa paket tertentu. */
  window.sfxPackPlay = function (kind, ctx, now, key) {
    var k = IMPL[key] ? key : window.sfxPackKey(), pk = IMPL[k];
    C = ctx; getBus(ctx);
    if (wetGain) wetGain.gain.setValueAtTime(pk.wet, now);
    var e = ALIAS[kind] || kind;
    if (!MEL[e]) e = 'tap';
    pk.fn(e, now);
    return true;
  };
  /* Pratinjau di Panel Admin: tetap bunyi walau "Efek Suara" di menu lagi dimatikan. kinds = array jenis bunyi, jedaGap = detik antar bunyi. */
  window.sfxPackPreview = function (key, kinds, gap) {
    var ctx = (typeof getSfxCtx === 'function') ? getSfxCtx() : null;
    if (!ctx) return;
    var go = function () { var now = ctx.currentTime + 0.03; (kinds || ['tap']).forEach(function (k, i) { try { window.sfxPackPlay(k, ctx, now + i * (gap || 0.8), key); } catch (e) {} }); };
    if (ctx.state === 'suspended') ctx.resume().then(go).catch(function () {}); else go();
  };
})();
