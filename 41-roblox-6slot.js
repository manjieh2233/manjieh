/* 41-roblox-6slot.js — FILE BARU. Fullspek Roblox: 6 foto = 1 slide (template Kuromi), foto otomatis dipotong
   (bar status atas & panel menu bawah screenshot dibuang) dan tiap foto hanya mengisi kotaknya sendiri.
   Hanya aktif kalau game = Roblox (RB) di Stok. FF/ML/Rental tetap memakai kode lama (tidak disentuh).
   Dimuat PALING AKHIR (lihat index.php & admin.php). */
(function () {
  'use strict';
  var SRC = '/assets/img/template-roblox-6.webp?v=2';
  var W = 1086, H = 1448, PAD = 2;
  var CY = 0.48;                       // titik tengah potongan vertikal screenshot (karakter ada di tengah)
  var SLOTS = [                        // kotak slot (x1,y1,x2,y2): 1-2-3 atas, 4-5-6 bawah
    [89, 391, 361, 745], [405, 391, 680, 745], [723, 391, 997, 745],
    [90, 789, 363, 1149], [405, 789, 680, 1149], [724, 789, 997, 1149]
  ];
  var tplP = null;

  function isRB() { try { return postType === 'stok' && postGame === 'RB'; } catch (e) { return false; } }
  function loadTpl() {
    if (!tplP) tplP = loadImageEl(SRC).catch(function (e) { tplP = null; throw e; });
    return tplP;
  }

  /* gabungkan sampai 6 foto (dataURL) ke template -> 1 gambar JPEG */
  async function compose6(urls) {
    var tpl = await loadTpl();
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < urls.length && i < 6; i++) {
      var im = await loadImageEl(urls[i]);
      var s = SLOTS[i], dx = s[0] - PAD, dy = s[1] - PAD, dw = s[2] - s[0] + PAD * 2, dh = s[3] - s[1] + PAD * 2;
      var iw = im.naturalWidth, ih = im.naturalHeight;
      var k = Math.max(dw / iw, dh / ih), sw = dw / k, sh = dh / k;
      var sx = Math.min(Math.max(iw / 2 - sw / 2, 0), iw - sw);
      var sy = Math.min(Math.max(ih * CY - sh / 2, 0), ih - sh);
      x.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);   // foto di belakang, template di depan
      im.src = '';
    }
    x.drawImage(tpl, 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.86);
  }

  /* ---------- upload: aktif hanya untuk Roblox ---------- */
  var inp = document.getElementById('post-slide2-input');
  if (inp) {
    var oldChange = inp.onchange;
    inp.onchange = async function (e) {
      if (!isRB()) return oldChange ? oldChange.call(this, e) : undefined;
      var files = Array.prototype.slice.call(e.target.files).sort(function (a, b) { return a.lastModified - b.lastModified; });
      if (!files.length) return;
      var btn = document.getElementById('btn-save-post');
      var btnText = btn ? btn.textContent : '';
      if (btn) btn.disabled = true;
      try {
        var toInput = window.fileToFullspekInput || fileToDataUrl;
        var conv = window.mapLimit || function (arr, n, fn) { return Promise.all(arr.map(fn)); };
        var data = (await conv(files, 3, function (f) { return toInput(f).catch(function (err) { console.error(err); return null; }); }))
          .filter(Boolean);
        var total = Math.ceil(data.length / 6), done = 0, failed = 0, msg = '';
        for (var i = 0; i < data.length; i += 6) {
          if (btn) btn.textContent = 'Mengunggah slide... (' + done + '/' + total + ')';
          try {
            var out = await compose6(data.slice(i, i + 6));
            var url = await uploadImageToStorage(out, 'posts/' + draftId + '/fullspek_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.jpg');
            slide2Data.push(url); done++;
            renderSlide2Preview();
          } catch (err) { failed++; console.error(err); if (!msg) msg = (err && (err.message || err.name)) || String(err); }
        }
        if (failed) showToast(failed + ' slide gagal diunggah: ' + msg, 6000);
        else showToast('Selesai, ' + done + ' slide Roblox berhasil diunggah.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
        e.target.value = '';
        renderSlide2Preview();
      }
    };
  }

  /* ---------- teks form & thumbnail ---------- */
  var orig = null;
  function syncText() {
    var l = document.getElementById('post-slide2-label'), h = document.getElementById('post-slide2-hint');
    if (!l || !h) return;
    if (isRB()) {
      if (!orig) orig = { l: l.textContent, h: h.textContent };
      l.textContent = 'Fullspek Roblox — Pilih File (6 foto per slide)';
      h.textContent = 'Pilih banyak screenshot sekaligus. Otomatis dipotong ke template Kuromi, 6 foto jadi 1 slide.';
    } else if (orig) { l.textContent = orig.l; h.textContent = orig.h; orig = null; }
  }
  function wrap(name, after) {
    var f = window[name]; if (typeof f !== 'function') return;
    window[name] = function () { var r = f.apply(this, arguments); try { after(); } catch (e) {} return r; };
  }
  wrap('setPostGame', syncText);
  wrap('setPostType', syncText);
  wrap('renderSlide2Preview', function () {
    if (!isRB()) return;
    var imgs = document.querySelectorAll('#post-slide2-preview img');
    for (var i = 0; i < imgs.length; i++) { imgs[i].classList.remove('h-16', 'w-28'); imgs[i].style.cssText = 'height:112px;width:84px;object-fit:cover'; }
  });
})();
