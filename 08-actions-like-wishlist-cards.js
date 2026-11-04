/* ---------------- Delete post (admin only) ---------------- */
async function confirmDeletePost(id) {
  if (!isAdmin) return;
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const ok = window.confirm(`Hapus postingan "${post.title || 'Tanpa judul'}"? Tindakan ini tidak bisa dibatalkan.`);
  if (!ok) return;
  const success = await deletePostRemote(id);
  if (success) {
    await loadPosts();
    // FITUR BARU: abis hapus postingan Stok, benerin urutan kode FF & ML biar sisanya
    // tetap rapi 01,02,03,... tanpa bolong (nomor otomatis geser ulang, itu disengaja).
    if (post.type === 'stok') await resyncKodeUrutan();
    closeDetailModal();
    showToast('Postingan berhasil dihapus untuk semua orang.');
  }
}

/* ---------------- Copy link ---------------- */
/* Bikin slug dari kode + deskripsi, misal "FF 01" + "Akun Ganteng Keren Full Skin" -> "ff01-akungantengkerenfullskin" */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
function buildPostSlug(post) {
  const descSlug = slugify(post.desc || post.title).slice(0, 40) || slugify(post.title) || 'akun';
  if (post.type === 'stok' && post.kode) {
    // Link cuma dari kode akun aja (misal "FF 01" -> "ff01"), gak nempel judul/deskripsi lagi --
    // jadi link tetap sama walau judul/deskripsi diedit belakangan.
    return slugify(post.kode);
  }
  if (post.type === 'rental') {
    // Link rental dibikin bersih dari judul aja (misal "RENTAL P18" -> "rentalp18"), tanpa embel-embel id.
    return slugify(post.title) || descSlug || 'rental';
  }
  // Stok tanpa kode lama tetap dikasih slug, ditambah potongan id biar gak tabrakan.
  return descSlug + '-' + String(post.id).slice(-6);
}
function copyPostLink(id) {
  const post = posts.find(p => p.id === id);
  const slug = post ? buildPostSlug(post) : id;
  const url = location.origin + '/' + slug;
  const done = () => showToast('Link postingan disalin!');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
  } else fallbackCopy(url, done);
}
/* Tombol "Bagikan": pakai menu share asli HP kalau browsernya support (Android/iOS),
   biar orang bisa langsung pilih mau share ke WA/Telegram/dll. Kalau gak support
   (misal buka dari laptop), otomatis fallback nyalin link kayak tombol lama. */
function sharePost(id) {
  playSfx('share');
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const slug = buildPostSlug(post);
  const url = location.origin + '/' + slug;
  const title = (post.type === 'stok' && post.kode) ? `${post.kode} — ${post.title || ''}` : (post.title || 'TOUKA ENAY STR');
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {}); // orangnya batal share -> diemin aja, gak perlu toast error
  } else {
    copyPostLink(id);
  }
}

/* ---------------- Like/Suka postingan ---------------- */
/* Status "udah disuka" disimpen di localStorage HP masing-masing pengunjung (gak perlu akun/login),
   jadi tiap browser cuma bisa nge-like sekali per postingan. Total like-nya disimpen di Supabase. */
const LIKED_POSTS_KEY = 'touka_liked_posts';
function getLikedPostIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveLikedPostIds(set) {
  try { localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify([...set])); } catch (e) {}
}
function isPostLiked(id) { return getLikedPostIds().has(id); }

async function toggleLikePost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const liked = getLikedPostIds();
  const alreadyLiked = liked.has(id);
  const prevCount = post.likes || 0;
  const delta = alreadyLiked ? -1 : 1;

  // Update tampilan duluan biar berasa instan, baru nyimpen ke server di belakang.
  if (alreadyLiked) { liked.delete(id); post.likes = Math.max(0, prevCount - 1); }
  else { liked.add(id); post.likes = prevCount + 1; }
  saveLikedPostIds(liked);
  updateLikeButtonsUI(id);
  if (!alreadyLiked) playSfx('like');

  try {
    // Panggil endpoint khusus di Worker (bukan simpan full data postingan), jadi aman
    // dipakai pengunjung biasa tanpa perlu akses admin.
    const result = await apiFetch('/api/like', { method: 'POST', body: JSON.stringify({ id, delta }) });
    // Cari ulang postingannya pakai id (bukan pakai object/index lama) -- biar aman kalau
    // loadPosts() sempet jalan & ganti total array `posts` selagi nunggu balesan server ini.
    const freshPost = posts.find(p => p.id === id);
    if (result && typeof result.likes === 'number' && freshPost) { freshPost.likes = result.likes; updateLikeButtonsUI(id); }
  } catch (e) {
    console.error('Gagal simpan like', e);
    // Gagal simpan -> balikin lagi kayak semula.
    const freshPost = posts.find(p => p.id === id);
    if (freshPost) freshPost.likes = prevCount;
    if (alreadyLiked) liked.add(id); else liked.delete(id);
    saveLikedPostIds(liked);
    updateLikeButtonsUI(id);
    showToast('Gagal menyimpan, coba lagi.');
  }
}
function updateLikeButtonsUI(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const liked = isPostLiked(id);
  document.querySelectorAll(`.like-btn[data-post-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('is-liked', liked);
    const label = btn.querySelector('.like-label');
    if (label) label.textContent = liked ? 'Disukai' : 'Suka';
    const icon = btn.querySelector('.like-icon');
    if (icon) {
      icon.setAttribute('fill', liked ? 'currentColor' : 'none');
      if (liked) {
        icon.classList.remove('like-pop');
        void icon.offsetWidth; // reset animasi biar kepicu ulang tiap kali diklik
        icon.classList.add('like-pop');
      }
    }
  });
  const stat = document.getElementById('stat-likes-' + id);
  if (stat) stat.textContent = formatCompactCount(post.likes || 0);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { showToast('Gagal menyalin link.'); }
  document.body.removeChild(ta);
}

/* ---------------- Wishlist (simpan lokal di HP masing-masing pengunjung) ---------------- */
/* Beda sama Suka (LIKED_POSTS_KEY di atas): Wishlist ini MURNI lokal, gak ngirim apa-apa ke
   server/gak nambahin angka publik apapun -- cuma buat pengunjung nandain akun yang dia incer
   biar gampang dibuka lagi nanti tanpa scroll ulang dari awal. Disimpan per-browser/device. */
const WISHLIST_KEY = 'touka_wishlist_posts';
function getWishlistIds() {
  try { return new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveWishlistIds(set) {
  try { localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set])); } catch (e) {}
}
function isWishlisted(id) { return getWishlistIds().has(id); }
function toggleWishlist(e, id) {
  if (e) e.stopPropagation();
  const set = getWishlistIds();
  const already = set.has(id);
  if (already) set.delete(id); else set.add(id);
  saveWishlistIds(set);
  updateWishlistButtonsUI(id);
  if (!already) playSfx('wishlist');
  showToast(already ? 'Dihapus dari Wishlist' : '✓ Disimpan ke Wishlist');
  // Modal Wishlist lagi kebuka & item-nya baru dihapus -> render ulang biar langsung ilang
  // dari list, gak nunggu modal ditutup-buka lagi buat keliatan updatenya.
  if (already) renderWishlistModal();
}
function updateWishlistButtonsUI(id) {
  const saved = isWishlisted(id);
  document.querySelectorAll(`.wishlist-btn[data-post-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('is-wishlisted', saved);
    const icon = btn.querySelector('.wishlist-icon');
    if (icon) {
      icon.setAttribute('fill', saved ? 'currentColor' : 'none');
      icon.classList.remove('like-pop');
      void icon.offsetWidth; // reset animasi biar kepicu ulang tiap kali ditandai
      if (saved) icon.classList.add('like-pop');
    }
  });
}
// Ikon bookmark kecil yang ditumpuk di pojok kartu/foto detail -- 'lg' dipakai di modal detail
// (foto besar), ukuran default dipakai di kartu grid yang lebih kecil.
function wishlistBtnHtml(post, variant) {
  const saved = isWishlisted(post.id);
  const big = variant === 'lg';
  const posCls = big ? 'right-2 top-2 h-8 w-8' : 'right-1.5 bottom-1.5 h-6 w-6';
  const iconSize = big ? '17' : '13';
  return `<span onclick="toggleWishlist(event,'${post.id}')" data-post-id="${post.id}" title="${saved ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}" class="wishlist-btn absolute ${posCls} z-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-sm text-white${saved ? ' is-wishlisted' : ''}" style="cursor:pointer"><svg class="wishlist-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:${iconSize}px;height:${iconSize}px"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>`;
}
// Buka/render modal Wishlist -- daftar postingan (stok & rental) yang ditandai pengunjung ini,
// dibaca dari localStorage device-nya sendiri, dirender pakai kartu yang sama kayak grid utama.
let wishlistModalMode = 'saved'; // 'saved' = cuma yang udah disimpan, 'browse' = mode tambah (semua postingan + search)
let wishlistBrowseGame = 'FF'; // FF/ML -- cuma dipakai di mode 'browse', biar bisa dibedain per game kayak tab utama
function renderWishlistModal() {
  const container = document.getElementById('wishlist-posts');
  if (!container) return;
  const ids = getWishlistIds();
  if (wishlistModalMode === 'browse') {
    // Mode tambah: nampilin postingan yang MASIH READY doang (sold out disembunyikan -- gak
    // ada gunanya ditambahin ke wishlist kalau udah kejual), dipisah per game (FF/ML, lewat
    // toggle di atas -- postingan Rental ikut disaring pakai rentalGame-nya), difilter lagi
    // sama kata kunci di search box kalau ada. Tiap kartu udah otomatis punya ikon bookmark
    // (wishlistBtnHtml, dipasang postThumb) buat langsung tap tambah/hapus dari Wishlist.
    const q = (document.getElementById('wishlist-add-search')?.value || '').trim().toLowerCase();
    const fallbackRentalGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
    let list = posts.filter(p => (isAdmin || !p.hidden) && !p.soldOut);
    list = list.filter(p => p.type === 'stok' ? p.game === wishlistBrowseGame : (p.rentalGame || fallbackRentalGame) === wishlistBrowseGame);
    if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q) || (p.kode || '').toLowerCase().includes(q));
    container.innerHTML = list.length
      ? `<div class="grid grid-cols-2 gap-3">${list.map((p, i) => { try { return postThumb(p, i); } catch (e) { return ''; } }).join('')}</div>`
      : `<div class="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/60">Gak ada akun yang cocok.</div>`;
    return;
  }
  const list = posts.filter(p => ids.has(p.id) && (isAdmin || !p.hidden));
  container.innerHTML = list.length
    ? `<div class="grid grid-cols-2 gap-3">${list.map((p, i) => { try { return postThumb(p, i); } catch (e) { return ''; } }).join('')}</div>`
    : `<div class="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/60">Belum ada akun yang disimpan. Ketuk tombol + di pojok kanan bawah, atau ikon bookmark di kartu/detail akun, buat nyimpen ke sini.</div>`;
}
// Toggle Free Fire/Mobile Legends khusus mode 'browse' -- gaya & perilakunya (indikator geser)
// disamain kayak toggle game di tab utama, tapi pakai class sendiri (.wishlist-game-btn, BUKAN
// .game) biar gak ke-nyantol/ketimpa sama handler toggle game halaman utama.
function renderWishlistGameToggle() {
  const wrap = document.getElementById('wishlist-game-toggle-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.wishlist-game-btn').forEach(b => {
    const active = b.dataset.game === wishlistBrowseGame;
    b.classList.toggle('primary', active && wishlistBrowseGame === 'FF');
    b.classList.toggle('primary-pink', active && wishlistBrowseGame === 'ML');
    b.classList.toggle('text-white/60', !active);
  });
  const activeBtn = wrap.querySelector('button.primary, button.primary-pink');
  if (activeBtn) requestAnimationFrame(() => segMoveIndicator(wrap, activeBtn, wishlistBrowseGame === 'ML' ? '#ec4899' : '#a855f7'));
}
document.querySelectorAll('.wishlist-game-btn').forEach(b => b.onclick = () => {
  wishlistBrowseGame = b.dataset.game;
  renderWishlistGameToggle();
  renderWishlistModal();
});
function openWishlistModal() {
  wishlistModalMode = 'saved';
  document.getElementById('wishlist-add-bar').classList.add('hidden');
  const search = document.getElementById('wishlist-add-search');
  if (search) search.value = '';
  renderWishlistModal();
  openModal('modal-wishlist');
}
// Tombol "+" (FAB pojok kanan-bawah) Wishlist -- pindah ke mode "tambah" (browse per game + search).
document.getElementById('btn-wishlist-add').onclick = () => {
  wishlistModalMode = 'browse';
  wishlistBrowseGame = 'FF';
  document.getElementById('wishlist-add-bar').classList.remove('hidden');
  renderWishlistGameToggle();
  renderWishlistModal();
  document.getElementById('wishlist-add-search')?.focus();
};
document.getElementById('btn-wishlist-add-done').onclick = () => {
  wishlistModalMode = 'saved';
  document.getElementById('wishlist-add-bar').classList.add('hidden');
  renderWishlistModal();
};
document.getElementById('wishlist-add-search').oninput = () => renderWishlistModal();

/* ---------------- Swipe kanan kartu = tambah ke Wishlist (+ tombol Urungkan) ---------------- */
/* Cuma swipe ke KANAN yang aktif (sesuai request) -- swipe kiri gak ngapa-ngapain, kartu balik
   ke posisi semula. Kartunya sendiri (id="post-<id>") yang digeser translateX pas lagi ditarik,
   sementara "swipe-hint-<id>" (lapisan kuning + ikon bookmark di baliknya) makin keliatan
   (opacity naik) ngikutin seberapa jauh jarinya udah geser -- efeknya kayak nge-"reveal" aksi
   di belakang kartu, mirip swipe-to-action di aplikasi chat.

   NEMPEL di gesture yang sama: TAHAN JARI diem di kartu (gak digeser & gak dilepas) selama
   ~480ms -> muncul kotak preview cepat ngambang di atas kartu (harga, kode, judul singkat)
   TANPA buka modal detail penuh. Timer-nya (lpTimer) dibatalin otomatis kalau ternyata jarinya
   gerak (berarti maksudnya scroll grid atau mulai swipe kanan, bukan nahan diem). */
const cardSwipeState = {};
const SWIPE_WISHLIST_THRESHOLD = 70;
const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOLERANCE = 10;
function cardSwipeAttrs(id) {
  return IS_TOUCH_DEVICE
    ? `ontouchstart="cardSwipeStart(event,'${id}')" ontouchmove="cardSwipeMove(event,'${id}')" ontouchend="cardSwipeEnd(event,'${id}')" ontouchcancel="cardSwipeCancel('${id}')"`
    : `onmousedown="cardSwipeStart(event,'${id}')" onmousemove="cardSwipeMove(event,'${id}')" onmouseup="cardSwipeEnd(event,'${id}')" onmouseleave="cardSwipeCancel('${id}')"`;
}
function cardSwipeStart(e, id) {
  const st = { startX: getEventX(e), startY: getEventY(e), dx: 0, dragging: true, longPressFired: false };
  cardSwipeState[id] = st;
  st.lpTimer = setTimeout(() => {
    if (cardSwipeState[id] === st && st.dragging && Math.abs(st.dx) < LONG_PRESS_MOVE_TOLERANCE) {
      st.longPressFired = true;
      showQuickPreview(id);
    }
  }, LONG_PRESS_MS);
}
function cardSwipeMove(e, id) {
  const st = cardSwipeState[id];
  if (!st || !st.dragging) return;
  const dx = getEventX(e) - st.startX;
  const dy = getEventY(e) - st.startY;
  if (Math.abs(dx) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimeout(st.lpTimer);
  if (st.longPressFired) return; // preview udah nongol, gesture geser gak diproses lagi
  // Kalau gerakannya lebih vertikal daripada horizontal, itu maksudnya orangnya lagi scroll
  // grid ke bawah -- BUKAN swipe kartu, jadi diabaikan (biar scroll grid tetap normal).
  if (Math.abs(dy) > Math.abs(dx)) return;
  st.dx = dx;
  const card = document.getElementById('post-' + id);
  const hint = document.getElementById('swipe-hint-' + id);
  if (!card) return;
  const clamped = Math.max(0, Math.min(dx, 130)); // cuma respon geser ke KANAN
  card.style.transition = 'none';
  card.style.transform = `translateX(${clamped}px)`;
  if (hint) hint.style.opacity = String(Math.min(clamped / SWIPE_WISHLIST_THRESHOLD, 1));
}
function cardSwipeCancel(id) {
  const st = cardSwipeState[id];
  if (st) clearTimeout(st.lpTimer);
  cardSwipeState[id] = null;
  const card = document.getElementById('post-' + id);
  const hint = document.getElementById('swipe-hint-' + id);
  if (card) { card.style.transition = 'transform .25s cubic-bezier(.22,.85,.32,1)'; card.style.transform = 'translateX(0)'; }
  if (hint) hint.style.opacity = '0';
  hideQuickPreview(id);
}
function cardSwipeEnd(e, id) {
  const st = cardSwipeState[id];
  if (!st || !st.dragging) return;
  clearTimeout(st.lpTimer);
  const dx = st.dx;
  const wasLongPress = st.longPressFired;
  cardSwipeCancel(id);
  if (wasLongPress) { if (e && e.cancelable) e.preventDefault(); return; } // udah nampilin preview, jangan lanjut buka detail
  if (dx <= SWIPE_WISHLIST_THRESHOLD) return; // gesernya kurang jauh, dianggap batal
  if (e && e.cancelable) e.preventDefault(); // biar abis swipe gak ikut kebuka detail-nya
  if (isWishlisted(id)) { showToast('Udah ada di Wishlist'); return; }
  const set = getWishlistIds(); set.add(id); saveWishlistIds(set);
  updateWishlistButtonsUI(id);
  playSfx('wishlist');
  showUndoToast('✓ Ditambahin ke Wishlist', () => {
    const s2 = getWishlistIds(); s2.delete(id); saveWishlistIds(s2); updateWishlistButtonsUI(id);
  });
}

/* ---------------- Preview cepat (long-press kartu) ---------------- */
/* Kotak kecil ngambang isinya info penting doang (kode, judul singkat, harga) -- dibuat/diisi
   on-demand pas long-press kejadian (bukan dirender duluan di tiap kartu), biar HTML awal
   tetep ringan. Nempel di dalam #post-wrap-<id> yang emang udah position:relative. */
function showQuickPreview(id) {
  const post = posts.find(p => p.id === id);
  const wrap = document.getElementById('post-wrap-' + id);
  if (!post || !wrap) return;
  let popup = document.getElementById('quick-preview-' + id);
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'quick-preview-' + id;
    popup.className = 'quick-preview-popup';
    wrap.appendChild(popup);
  }
  const kode = post.kode ? `<span class="kode-yellow-text">${escapeHtml(post.kode)}</span> ` : '';
  const priceText = post.discountActive && post.discountPrice ? formatRp(post.discountPrice) : formatRp(post.price || '');
  popup.innerHTML = `
    <div class="quick-preview-inner">
      <p class="quick-preview-title">${kode}${escapeHtml(post.title || 'Tanpa judul')}</p>
      ${priceText ? `<p class="quick-preview-price">${escapeHtml(priceText)}</p>` : ''}
    </div>`;
  popup.classList.add('show');
  playSfx('open');
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
}
function hideQuickPreview(id) {
  const popup = document.getElementById('quick-preview-' + id);
  if (popup) popup.classList.remove('show');
}

/* ---------------- Card / thumbnail renderers ---------------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
// Kecilin resolusi foto lewat Supabase Storage image transform (cuma jalan buat foto yang
// memang disimpan di Supabase Storage kita -- URL luar/base64 dibalikin apa adanya).
// Dipakai khusus di slide 2+ postingan sold out biar nggak berat/lag pas discroll.
// Kartu grid & slide kecil dimuat lewat /thumb.php (dikecilin + di-cache di server), BUKAN file
// asli 2560px yang beratnya 1-3 MB per foto -- ini penyebab utama foto lama muncul & scroll berat.
// Kalau thumb.php gagal, handleImgError() otomatis balik ke URL asli, jadi foto gak pernah blank.
const THUMB_WEBP = (() => {
  try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; }
  catch (e) { return false; }
})();
function supaThumb(url, w, q) {
  if (!url || typeof url !== 'string') return url;
  if (!/^https:\/\//i.test(url)) return url;     // base64 / relatif: apa adanya
  if (w > 1000) return url;                        // foto detail HD (zoom) tetap file asli
  return '/thumb.php?u=' + encodeURIComponent(url) + '&w=' + w + '&q=' + Math.min(q || 78, 85) + (THUMB_WEBP ? '&f=webp' : '');
}

/* ---------------- Format harga: pastikan selalu ada spasi setelah "Rp" ---------------- */
function formatRp(str) {
  if (!str) return '';
  return String(str).replace(/Rp\.?\s*/gi, 'Rp ').trim();
}
// Ambil angka murni dari teks harga (buang "Rp", titik pemisah ribuan, dll) buat dihitung selisihnya (hemat).
function parseRupiahNumber(str) {
  if (!str) return null;
  const digits = String(str).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}
function formatRupiahNumber(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}
// Format angka dilihat/disukai ala Instagram: di bawah 1000 apa adanya, di atas itu disingkat "X,X rb".
function formatCompactCount(n) {
  n = n || 0;
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' rb';
  return String(n);
}
const ICON_HEART_LG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

