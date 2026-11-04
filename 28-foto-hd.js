/* 28-foto-hd.js — foto upload tetap HD tapi proses pembuatannya dibuat cepat (dimuat SETELAH 02-notif-templates-toast-sfx.js; di toko & di Panel Admin).
   Dipakai oleh: foto stok slide 1, foto fullspek/editan 2 foto (composeFullspekSlide), dan foto Sorotan.
   Kenapa dulu lambat saat kualitas dinaikkan: tiap foto dibaca jadi teks base64, dibuka ulang jadi gambar, digambar, lalu di-encode
   JPEG kualitas 96% di thread utama (HP "nge-freeze"), dan hasil akhirnya dikecilkan lagi ke 1080px/75% (jadi tidak HD).
   Sekarang:
   1) Foto JPEG yang sudah <= 2560px dan <= 3,5 MB TIDAK diproses ulang sama sekali (kualitas asli, tanpa menunggu) -> langsung diunggah.
   2) Foto lain dibuka lewat createImageBitmap (dekode di luar thread utama), digambar, dan di-encode lewat canvas.toBlob (asinkron)
      kualitas 93% (secara kasat mata sama dengan 96%, ukuran file jauh lebih kecil -> unggah lebih cepat).
   3) Foto fullspek (2 foto ke template): foto sumbernya cukup selebar kotak di template, jadi dikecilkan sampai sisi terpendek 1440px
      (fileToFullspekInput), beberapa foto diproses bersamaan (mapLimit), lalu hasil akhirnya dibuat dalam ukuran ASLI template
      (tidak dikecilkan ke 1080px lagi) kualitas 90%, tanpa membekukan layar.
   Kalau browser tidak mendukung, otomatis memakai cara lama (fungsi di 02-notif-templates-toast-sfx.js) -> tidak pernah gagal. */
(function () {
  'use strict';
  var MAX_DIM = 2560, Q_PHOTO = 0.93, Q_FULLSPEK = 0.9, FULLSPEK_MIN_SIDE = 1440, PASS_MAX_BYTES = 3.5 * 1024 * 1024;
  var oldFileToDataUrl = typeof window.fileToDataUrl === 'function' ? window.fileToDataUrl : null;
  var oldCompose = typeof window.composeFullspekSlide === 'function' ? window.composeFullspekSlide : null;
  var canBitmap = typeof window.createImageBitmap === 'function' && typeof HTMLCanvasElement !== 'undefined' && !!HTMLCanvasElement.prototype.toBlob;

  function readAsDataUrl(blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('file-read-failed')); }; r.readAsDataURL(blob); });
  }
  function canvasToDataUrl(canvas, q) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { if (!b) { rej(new Error('encode-failed')); return; } readAsDataUrl(b).then(res, rej); }, 'image/jpeg', q);
    });
  }
  /* ukuran JPEG dari header (tanpa membuka gambarnya): [lebar, tinggi] atau null */
  function jpegSize(buf) {
    var v = new DataView(buf), n = v.byteLength;
    if (n < 4 || v.getUint16(0) !== 0xFFD8) return null;
    var o = 2;
    while (o + 9 < n) {
      if (v.getUint8(o) !== 0xFF) { o++; continue; }
      var m = v.getUint8(o + 1);
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
      var len = v.getUint16(o + 2);
      if ((m >= 0xC0 && m <= 0xCF) && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [v.getUint16(o + 7), v.getUint16(o + 5)];
      o += 2 + len;
    }
    return null;
  }
  /* JPEG dengan tanda orientasi EXIF selain "normal" tetap diproses ulang (supaya hasilnya pasti tegak di mana pun) */
  function exifRotated(buf) {
    try {
      var v = new DataView(buf), n = Math.min(v.byteLength, 65536), o = 2;
      while (o + 4 < n) {
        if (v.getUint8(o) !== 0xFF) return false;
        var m = v.getUint8(o + 1), len = v.getUint16(o + 2);
        if (m === 0xE1 && v.getUint32(o + 4) === 0x45786966) {
          var t = o + 10, le = v.getUint16(t) === 0x4949, cnt = v.getUint16(t + 8, le), p = t + 10;
          for (var i = 0; i < cnt; i++, p += 12) if (v.getUint16(p, le) === 0x0112) return v.getUint16(p + 8, le) > 1;
          return false;
        }
        o += 2 + len;
      }
    } catch (e) {}
    return false;
  }

  /* opt.maxDim = batas sisi terpanjang; opt.minSide = batas sisi terpendek (dipakai foto fullspek) */
  async function fastToDataUrl(file, opt, q) {
    if (!canBitmap) throw new Error('no-bitmap');
    function scaleFor(w, h) {
      var k = 1;
      if (opt.maxDim && Math.max(w, h) > opt.maxDim) k = Math.min(k, opt.maxDim / Math.max(w, h));
      if (opt.minSide && Math.min(w, h) > opt.minSide) k = Math.min(k, opt.minSide / Math.min(w, h));
      return k;
    }
    if (file.type === 'image/jpeg' && file.size <= PASS_MAX_BYTES) {
      var head = await file.slice(0, 131072).arrayBuffer();
      var sz = jpegSize(head);
      if (sz && scaleFor(sz[0], sz[1]) === 1 && !exifRotated(head)) return readAsDataUrl(file);   // sudah cukup HD & ringan: apa adanya
    }
    var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    var w = bmp.width, h = bmp.height, k0 = scaleFor(w, h);
    if (k0 < 1) { w = Math.round(w * k0); h = Math.round(h * k0); }
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = (k0 < 0.7 ? 'medium' : 'high');   // dikecilkan banyak: 'medium' lebih cepat & hasilnya tetap halus
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    return canvasToDataUrl(c, q);
  }
  window.fileToDataUrl = function (file) {
    return fastToDataUrl(file, { maxDim: MAX_DIM }, Q_PHOTO).catch(function (e) {
      console.warn('fileToDataUrl: pakai cara lama', e && e.message);
      return oldFileToDataUrl ? oldFileToDataUrl(file) : compressImage(file, MAX_DIM, 0.96);
    });
  };

  /* ---------- fullspek: 1-2 foto ke dalam template ---------- */
  window.fileToFullspekInput = function (file) {
    return fastToDataUrl(file, { minSide: FULLSPEK_MIN_SIDE, maxDim: 4000 }, Q_FULLSPEK).catch(function (e) {
      console.warn('fileToFullspekInput: pakai cara lama', e && e.message);
      return window.fileToDataUrl(file);
    });
  };
  /* jalankan fn untuk tiap item, maksimal `limit` sekaligus (HP tidak kehabisan memori), urutan hasil = urutan item */
  window.mapLimit = function (items, limit, fn) {
    var out = new Array(items.length), next = 0;
    function worker() {
      if (next >= items.length) return Promise.resolve();
      var i = next++;
      return Promise.resolve(fn(items[i], i)).then(function (r) { out[i] = r; }).then(worker);
    }
    var ws = []; for (var i = 0; i < Math.min(limit, items.length); i++) ws.push(worker());
    return Promise.all(ws).then(function () { return out; });
  };
  async function bitmapOf(dataUrl) { var b = await (await fetch(dataUrl)).blob(); return createImageBitmap(b); }
  window.composeFullspekSlide = async function (game, dataUrl1, dataUrl2) {
    try {
      if (!canBitmap) throw new Error('no-bitmap');
      var tpl = FULLSPEK_TEMPLATES[game] || FULLSPEK_TEMPLATES.FF;
      var parts = await Promise.all([getFullspekTemplateImg(game), bitmapOf(dataUrl1), dataUrl2 ? bitmapOf(dataUrl2) : null]);
      var tplImg = parts[0], b1 = parts[1], b2 = parts[2];
      var w = tplImg.naturalWidth, h = tplImg.naturalHeight;
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
      drawCover(ctx, b1, tpl.box1.x * w, tpl.box1.y * h, tpl.box1.w * w, tpl.box1.h * h);       // foto di belakang, template di depan (sama seperti sebelumnya)
      if (b2) drawCover(ctx, b2, tpl.box2.x * w, tpl.box2.y * h, tpl.box2.w * w, tpl.box2.h * h);
      ctx.drawImage(tplImg, 0, 0, w, h);
      if (b1.close) b1.close(); if (b2 && b2.close) b2.close();
      return await canvasToDataUrl(c, Q_FULLSPEK);
    } catch (e) {
      console.warn('composeFullspekSlide: pakai cara lama', e && e.message);
      if (oldCompose) return oldCompose(game, dataUrl1, dataUrl2);
      throw e;
    }
  };
})();
