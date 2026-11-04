/* 35-slide-tiktok.js — penanda slide ala TikTok + angka slide di modal detail postingan (dimuat SETELAH 28-foto-hd.js, di luar bundle utama).
   - Titik: maksimal 7 kelihatan, titik putih (aktif) bergeser ke kanan satu-satu sampai posisi ke-5, baru setelah itu jendela titiknya ikut geser.
     Titik di pinggir mengecil. Tampilan pil (titik + "Ketuk 2x untuk zoom") tetap sama.
   - Angka di samping judul ("STOK TOUKA ENAY  2/30") = posisi slide foto di postingan yang lagi tampil / total slide-nya, ikut berubah saat digeser.
   Dipanggil dari renderSlideshow() & moveSlide() (07-tabs-selector-slides-zoom.js) dan setTitleFor() (09-detail-modal.js). */
var TK_DOT_SLOT = 10;
var TK_DOT_WINDOW = 7;

function tkDotSize(i, start, vis, count) {
  if (count < 6) return 6;
  var p = i - start;
  if (p <= 0 || p >= vis - 1) return 4;
  if (p === 1 || p === vis - 2) return 5;
  return 6;
}
function tkDotStyle(i, idx, start, vis, count) {
  var s = i === idx ? 8 : tkDotSize(i, start, vis, count);
  return 'width:' + s + 'px;height:' + s + 'px';
}
function tkDotStart(count, idx, prev) {
  var s = prev;
  if (idx > s + 4) s = idx - 4;
  if (idx < s + 2) s = idx - 2;
  return Math.max(0, Math.min(s, Math.max(0, count - TK_DOT_WINDOW)));
}
function tkDotsHtml(uid, count, idx) {
  if (count <= 1) return '';
  var vis = Math.min(count, TK_DOT_WINDOW);
  var start = tkDotStart(count, idx, 0);
  var slots = '';
  for (var i = 0; i < count; i++) {
    slots += '<div class="dots-slot"><span class="dots-dot rounded-full' + (i === idx ? ' bg-purple-400' : '') + '" style="' + tkDotStyle(i, idx, start, vis, count) + '"></span></div>';
  }
  return '<div class="dots-wrap mx-auto" id="' + uid + '_dots" style="width:' + (TK_DOT_SLOT * vis) + 'px">' +
    '<div class="dots-track" id="' + uid + '_dots_track" data-start="' + start + '" style="transform:translateX(-' + (start * TK_DOT_SLOT) + 'px)">' + slots + '</div></div>';
}
function tkUpdateDots(uid, count, idx) {
  var track = document.getElementById(uid + '_dots_track');
  if (!track) return;
  var vis = Math.min(count, TK_DOT_WINDOW);
  var start = tkDotStart(count, idx, parseInt(track.dataset.start, 10) || 0);
  track.dataset.start = String(start);
  track.style.transform = 'translateX(-' + (start * TK_DOT_SLOT) + 'px)';
  var slots = track.children;
  for (var i = 0; i < count; i++) {
    var dot = slots[i] && slots[i].firstElementChild;
    if (!dot) continue;
    dot.className = 'dots-dot rounded-full' + (i === idx ? ' bg-purple-400' : '');
    dot.style.cssText = tkDotStyle(i, idx, start, vis, count);
  }
}
function tkUpdateSlideCounter(postId) {
  var el = document.getElementById('detail-feed-counter');
  if (!el) return;
  var post = (typeof posts !== 'undefined') ? posts.find(function (p) { return p.id === postId; }) : null;
  var count = post ? buildSlides(post).length : 0;
  if (count <= 1) { el.classList.add('hidden'); return; }
  var track = document.getElementById('sl_' + postId + '_big');
  var idx = track ? (parseInt(track.dataset.index, 10) || 0) : 0;
  el.textContent = (idx + 1) + '/' + count;
  el.classList.remove('hidden');
}
function tkSlideChanged(uid, count, idx) {
  tkUpdateDots(uid, count, idx);
  var m = /^sl_(.+)_big$/.exec(uid);
  var el = document.getElementById('detail-feed-counter');
  if (m && el && el.dataset.postId === m[1]) tkUpdateSlideCounter(m[1]);
}
