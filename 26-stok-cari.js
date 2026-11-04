/* 26-stok-cari.js — pencarian pintar untuk tab Stok (dimuat SETELAH 22-stok-tabs.js, di luar bundle utama).
   Dipanggil oleh 22-stok-tabs.js lewat window.TkCari.match(post, kata) & window.TkCari.label(kata).
   Yang dipahami pencarian:
   1) NAMA GAME  : "mobile legends", "mobile legend", "mobile", "mlbb", "mole", "ml"      -> hanya akun Mobile Legends
                   "free fire", "freefire", "ff", "epep", "game burik", "burik"          -> hanya akun Free Fire
   2) HARGA      : "450k" / "450rb" / "450ribu" / "450.000" / "450000" / "1jt" / "1,5jt" / "1 juta"
                   -> bukan harga persis, tapi RENTANG budget di sekitarnya (lihat budgetOf di bawah).
                   Rentang persis juga bisa: "300-600k", "300k-1jt".
   3) KODE       : "ff 171" / "ml 45" (kalau memang ada akun berkode itu) -> akun berkode itu saja.
   4) KATA LAIN  : judul, deskripsi, kategori/skin ("sakura", "reaper") -> semua kata harus cocok.
   Kata game + harga + kata lain bisa digabung: "ml 450k", "epep 1jt sakura".
   Kalau di tab Free Fire / Mobile Legends dan yang diketik menyebut game atau harga, tampilan otomatis pindah ke tab Semua
   (supaya hasilnya tidak tersaring chip kategori tab itu). */
(function () {
  'use strict';

  /* ---------- ATUR DI SINI ---------- */
  var STEP = 50000;          // pembulatan batas bawah/atas (Rp)
  var UNDER_1JT_SPREAD = 0.3; // di bawah 1jt: +/- 30% dari harga yang diketik (dibulatkan ke STEP) -> 400k = 300k-500k, 450k = 300k-600k
  var FROM_1JT_LOW = 0.8;     // 1jt ke atas: dari 80% ...
  var FROM_1JT_HIGH = 2;      // ... sampai 200% dari harga yang diketik -> 1jt = 800k-2jt
  var MIN_BARE_PRICE = 100;   // angka polos (tanpa k/rb/jt) mulai segini dianggap "ribu": "ml 450" = 450k. Di bawahnya dianggap kode / kata biasa.

  function budgetOf(v) {
    var lo, hi;
    if (v >= 1e6) { lo = v * FROM_1JT_LOW; hi = v * FROM_1JT_HIGH; }
    else { var step = Math.max(STEP, Math.round(v * UNDER_1JT_SPREAD / STEP) * STEP); lo = v - step; hi = v + step; }
    return [Math.max(0, Math.round(lo / STEP) * STEP), Math.round(hi / STEP) * STEP];
  }

  var ML_RE = /(^|[^a-z])(mobile\s*legends?|mlbb|mobile|mole|ml)(?![a-z])/g;
  var FF_RE = /(^|[^a-z])(free\s*fire|freefire|game\s*burik|burik|epep|ff)(?![a-z])/g;
  var U = '(k|rb|ribu|jt|juta)';

  function normQ(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function unitVal(n, u) {
    n = parseFloat(String(n).replace(',', '.')); if (!isFinite(n)) return null;
    u = String(u || '').toLowerCase();
    if (u === 'jt' || u === 'juta') return n * 1e6;
    if (u === 'k' || u === 'rb' || u === 'ribu') return n * 1e3;
    return null;
  }
  function priceOf(p) { try { return +getEffectivePrice(p) || 0; } catch (e) { return parseInt(String(p.price || '').replace(/\D/g, ''), 10) || 0; } }
  function kodeNum(p) { var n = parseInt(String(p.kode || '').replace(/\D/g, ''), 10); return isFinite(n) ? n : -1; }

  /* ---------- baca kalimat pencarian ---------- */
  function parse(raw) {
    var s = ' ' + String(raw == null ? '' : raw).toLowerCase() + ' ';
    var gML = false, gFF = false;
    s = s.replace(ML_RE, function (m, pre) { gML = true; return pre + ' '; });
    s = s.replace(FF_RE, function (m, pre) { gFF = true; return pre + ' '; });
    var game = (gML && !gFF) ? 'ML' : ((gFF && !gML) ? 'FF' : null);
    var lo = null, hi = null, center = null;

    /* rentang persis: 300-600k, 300k-1jt, 300 sampai 600rb */
    s = s.replace(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + U + '?\\s*(?:-|–|—|sd|s/d|sampai|hingga)\\s*(\\d+(?:[.,]\\d+)?)\\s*' + U + '(?![a-z])', 'g'), function (m, a, ua, b, ub) {
      var v1 = unitVal(a, ua || ub), v2 = unitVal(b, ub);
      if (v1 == null || v2 == null) return m;
      if (lo === null) { lo = Math.min(v1, v2); hi = Math.max(v1, v2); }
      return ' ';
    });
    function one(m, a, u) { var v = unitVal(a, u); if (v == null) return m; if (center === null && lo === null) center = v; return ' '; }
    /* 450k, 450rb, 450ribu, 1jt, 1,5jt, 1 juta */
    s = s.replace(new RegExp('(?:rp\\.?\\s*)?(\\d+(?:[.,]\\d+)?)\\s*' + U + '(?![a-z])', 'g'), one);
    /* 450.000  /  1.500.000 */
    s = s.replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)(?!\d)/g, function (m, a) { var v = parseInt(a.replace(/\./g, ''), 10); if (center === null && lo === null) center = v; return ' '; });
    /* 450000 */
    s = s.replace(/(?:rp\.?\s*)?(\d{5,9})(?!\d)/g, function (m, a) { var v = parseInt(a, 10); if (center === null && lo === null) center = v; return ' '; });

    /* angka polos 1-4 digit: kode akun atau "ribu" -> diputuskan nanti (perlu data postingan) */
    var bare = [];
    s = s.replace(/(^|[^a-z0-9])(\d{1,4})(?![a-z0-9])/g, function (m, pre, a) { bare.push(+a); return pre + ' '; });

    var tokens = s.split(/\s+/).map(normQ).filter(Boolean);
    return { game: game, lo: lo, hi: hi, center: center, bare: bare, tokens: tokens };
  }

  /* ---------- siapkan (butuh daftar postingan untuk membedakan kode vs harga) ---------- */
  var cache = { key: '', q: null };
  function get(raw) {
    var n = 0; try { n = posts.length; } catch (e) {}
    var key = raw + '|' + n;
    if (cache.key === key) return cache.q;
    var q = parse(raw); q.kodes = [];
    q.bare.forEach(function (num) {
      var hit = false;
      try { hit = posts.some(function (p) { return p.type === 'stok' && kodeNum(p) === num && (!q.game || p.game === q.game); }); } catch (e) {}
      if (hit) q.kodes.push(num);
      else if (num >= MIN_BARE_PRICE && q.lo === null && q.center === null) q.center = num * 1000;
      else q.tokens.push(String(num));
    });
    if (q.lo === null && q.center !== null) { var b = budgetOf(q.center); q.lo = b[0]; q.hi = b[1]; }
    q.active = !!(q.game || q.lo !== null || q.kodes.length || q.tokens.length);
    cache = { key: key, q: q };
    return q;
  }

  function match(p, raw) {
    var q = get(raw); if (!q.active) return true;
    if (q.game && p.game !== q.game) return false;
    if (q.lo !== null) { var pr = priceOf(p); if (pr < q.lo || pr > q.hi) return false; }
    if (q.kodes.length && q.kodes.indexOf(kodeNum(p)) < 0) return false;
    if (q.tokens.length) {
      var hay = normQ((p.kode || '') + ' ' + (p.title || '') + ' ' + (p.desc || '') + ' ' + (p.game || '') + ' ' + priceOf(p) + ' ' + (p.price || '') + ' ' + (p.discountPrice || '') + ' ' + (Array.isArray(p.ffCategories) ? p.ffCategories.join(' ') : '') + ' ' + (p.nominalTag || ''));
      for (var i = 0; i < q.tokens.length; i++) if (hay.indexOf(q.tokens[i]) < 0) return false;
    }
    return true;
  }

  function fmt(v) {
    if (v >= 1e6) return String(Math.round(v / 1e4) / 100).replace('.', ',') + 'jt';
    return Math.round(v / 1000) + 'rb';
  }
  /* keterangan kecil di dekat jumlah hasil: "budget Rp 300rb-600rb" */
  function label(raw) {
    var q = get(raw);
    return q.lo !== null ? ('budget Rp ' + fmt(q.lo) + '–' + fmt(q.hi)) : '';
  }
  function wants(raw) { var q = get(raw); return !!(q.game || q.lo !== null); }

  window.TkCari = { match: match, label: label, wants: wants, parse: parse, budgetOf: budgetOf };

  /* ---------- pindah ke tab Semua kalau yang diketik menyebut game / harga ---------- */
  var inp = document.getElementById('st-q'), t = 0;
  if (inp) {
    inp.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!window.TkCari.wants(inp.value)) return;
        var cur = document.querySelector('#stok-game-tabs .st-tab.on');
        if (cur && cur.getAttribute('data-stv') !== 'ALL') { var all = document.querySelector('#stok-game-tabs [data-stv="ALL"]'); if (all) all.click(); }
      }, 230);
    });
  }
  try { if (typeof renderStok === 'function') renderStok(); } catch (e) {}
})();
