/* ---------------- Modal helpers ---------------- */
// Matikan auto scroll-restoration bawaan browser pas back/forward. Tanpa ini, browser suka
// "ikut campur" mulihin posisi scroll versinya sendiri pas history.back() dipanggil buat nutup
// modal detail -- dan seringnya salah (balik ke atas), karena posisi scroll yang browser catat
// pas modal lagi kebuka udah ke-reset ke 0 (efek trik body position:fixed buat kunci scroll).
// Dengan manual, cuma window.scrollTo(0, savedBodyScrollY) di closeModal() yang berlaku.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let openModalCount = 0;
// Posisi scroll beranda pas modal pertama dibuka -- disimpan biar pas modal ditutup,
// beranda balik lagi ke posisi semula (soalnya body.modal-open sekarang pakai position:fixed,
// yang otomatis bikin body "lompat" ke top:0 kalau posisi ini gak dijaga manual).
let savedBodyScrollY = 0;
function openModal(id) {
  const el = document.getElementById(id);
  if (el.classList.contains('hidden')) {
    openModalCount++;
    if (openModalCount === 1) {
      savedBodyScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${savedBodyScrollY}px`;
    }
  }
  el.classList.remove('hidden');
  el.classList.add('flex');
  document.body.classList.add('modal-open');
  // FIX UMUM: apapun yang manggil segMoveIndicator SEBELUM modal ini kebuka (kayak
  // setPostGame di resetPostForm/openEditPost) bakal dapet lebar 0 karena wrap-nya
  // masih display:none. Daripada nambal satu-satu tiap tempat yang manggil, di sini
  // kita paksa hitung ULANG semua indikator toggle (.segwrap) yang ada DI DALAM modal
  // ini, setelah modalnya beneran udah keliatan (1 frame biar layout-nya settle).
  requestAnimationFrame(() => {
    el.querySelectorAll('.segwrap').forEach(wrap => {
      const activeBtn = wrap.querySelector('button.primary, button.primary-pink');
      if (activeBtn) {
        const color = activeBtn.classList.contains('primary-pink') ? '#ec4899' : '#a855f7';
        segMoveIndicator(wrap, activeBtn, color);
      }
    });
  });
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el.classList.contains('hidden')) openModalCount = Math.max(0, openModalCount - 1);
  el.classList.add('hidden');
  el.classList.remove('flex');
  if (openModalCount === 0) {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, savedBodyScrollY);
  }
}
/* Nutup modal detail postingan. Kalau modal ini dibuka gara-gara orang klik link share
   (bukan klik kartu biasa di grid), nutupnya lewat history.back() -- ini yang bikin address
   bar otomatis balik jadi toukaenay.com, apapun cara nutupnya (tombol X, klik di luar modal,
   "Lihat stok lainnya", ATAU tombol Back HP -- semua konsisten). */
/* Render ulang list kartu yang lagi aktif (stok ATAU rental, sesuai tab yang kebuka) -- ini
   otomatis mancing ulang animasi masuk (.anim-in / fadeInUp bertingkat) tiap kartunya, soalnya
   elemen kartu itu jadi elemen DOM baru lagi tiap kali innerHTML-nya diganti. Dipanggil pas
   modal detail baru ditutup, biar kartunya "muncul" lagi kayak pas pertama kali buka web,
   bukan cuma diem nongol balik gitu aja. */
function replayGridEntranceAnim() {
  const stokPanel = document.getElementById('stok-panel');
  if (stokPanel && stokPanel.style.display !== 'none') { renderStok(); return; }
  renderRental();
}
function closeDetailModal() {
  playSfx('close');
  // Observer yang mantau postingan tetangga (lihat openPostDetail) gak ada gunanya lagi
  // begitu modal ketutup -- diputus di sini juga (bukan cuma pas modal BERIKUTNYA dibuka),
  // biar gak nganggur nempel ke DOM yang lagi disembunyiin.
  if (detailObserver) { detailObserver.disconnect(); detailObserver = null; }
  // BUGFIX: mountObserver (pemantau placeholder yang belum di-render, lihat openPostDetail)
  // sebelumnya cuma diputus pas modal BERIKUTNYA dibuka -- antara modal ditutup sampe modal
  // detail dibuka lagi (atau kalau usernya gak pernah buka detail lagi), observer ini nganggur
  // masih nempel ngintip section-section yang udah disembunyiin/gak kepake. Diputus juga di
  // sini biar bersih seketika pas modal ditutup, bukan nunggu sampe ada modal baru.
  if (mountObserver) { mountObserver.disconnect(); mountObserver = null; }
  // Modal ditutup LANGSUNG duluan (instan) -- history.back()/replaceState di bawah cuma
  // buat beresin address bar, jangan sampe modal nunggu browser process itu dulu baru
  // ketutup (itu yang bikin kerasa delay/ngelag tiap pencet X sebelumnya).
  const wasOpenedFromLink = detailOpenedFromLink;
  detailOpenedFromLink = false;
  closeModal('modal-detail');
  // Kalau modal ini kebuka dari share-link ke postingan ML (openPostFromSlug sempet
  // ngubah curGame jadi 'ML' biar modalnya bisa nge-swipe ke akun ML lain), begitu
  // modalnya ditutup baliknya HARUS tetep ke tab Free Fire (default toko), bukan
  // nyangkut di tab ML -- biar tampilan awal toko selalu konsisten mulai dari FF.
  if (wasOpenedFromLink && curGame === 'ML') {
    curGame = 'FF'; curTag = getDefaultTag('FF'); tagUserSelected = false;
    activeSgFilters.clear();
    sgCategoryPanelOpen = false;
    document.querySelectorAll('.game').forEach(x => { x.classList.remove('primary', 'primary-pink'); x.classList.add('text-white/60'); });
    const ffBtn = document.querySelector('.game[data-game="FF"]');
    if (ffBtn) {
      ffBtn.classList.add('primary'); ffBtn.classList.remove('text-white/60');
      segMoveIndicator(document.getElementById('game-toggle-wrap'), ffBtn, '#a855f7');
    }
    renderTags(); renderSortWrap(); updateFooterLogo();
  }
  replayGridEntranceAnim();
  if (wasOpenedFromLink && location.pathname !== '/') {
    history.back();
  } else if (location.pathname !== '/') {
    history.replaceState(null, '', '/');
  }
}
document.querySelectorAll('.modal-close').forEach(b => b.onclick = () => {
  if (b.dataset.target === 'modal-detail') closeDetailModal();
  else closeModal(b.dataset.target);
});
/* Dipanggil khusus dari tombol "‹ Lihat stok lainnya": panelnya digeser dulu ke arah kiri
   (arah panahnya) + fade out, BARU abis itu modalnya beneran ditutup -- biar kerasa "geser
   balik ke grid" bukan cuma ilang tiba-tiba kayak nutup pake X/klik luar/tombol Back HP
   (yang sengaja tetap instan biar responsif, lihat komentar di closeDetailModal). */
function goBackToGridWithSlide() {
  const panel = document.querySelector('#modal-detail .detail-card-bg');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!panel || reduceMotion) { closeDetailModal(); return; }
  panel.classList.add('slide-out-left');
  setTimeout(() => {
    closeDetailModal();
    panel.classList.remove('slide-out-left');
  }, 220);
}
document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => {
  if (e.target !== ov) return;
  if (ov.id === 'modal-detail') closeDetailModal();
  else closeModal(ov.id);
}));

/* ---------------- Render: profile & nav ---------------- */
/* Ubah hex ("#facc15") jadi string "R,G,B" ("250,204,21") buat dipakai di CSS custom property
   --card-glow-rgb (lihat rgba(var(--card-glow-rgb), alpha) di CSS gradien kartu). Balikin null
   kalau hex-nya kosong/gak valid, biar caller-nya tau harus fallback ke default. */
function hexToRgbString(hex) {
  if (!hex) return null;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}
/* Nempelin warna gradien kartu (pas kartu stok/rental ditekan/di-zoom) ke CSS custom property
   di :root -- dipanggil tiap kali profile dirender (first-load maupun abis admin ganti &
   simpan), jadi seluruh kartu di halaman langsung ikut kepakai tanpa perlu render ulang tiap
   kartu satu-satu. Kosong/invalid = balik ke default kuning keemasan bawaan CSS. */
function applyCardGlowColor(hex) {
  const rgb = hexToRgbString(hex);
  if (rgb) document.documentElement.style.setProperty('--card-glow-rgb', rgb);
  else document.documentElement.style.removeProperty('--card-glow-rgb');
}
function renderProfile() {
  document.getElementById('p-name').textContent = profile.name || 'TOUKA ENAY STR';
  applyCardGlowColor(profile.cardPressGradientColor);
  document.getElementById('p-subtitle').textContent = profile.subtitle;
  document.getElementById('p-subtitle2').textContent = profile.subtitle2;
  const logoEl = document.getElementById('p-logo');
  logoEl.style.display = '';
  logoEl.src = profile.logo;
  // Favicon/PP tab browser: di-set ulang ke logo yang lagi aktif tiap kali profile dirender.
  // Ini yang bikin tab browser & preview link (WA/Telegram) tetap nampilin logo yang benar
  // walaupun file /favicon.ico terpisah di hosting belum/gak kepasang.
  const faviconLink = document.getElementById('favicon-link');
  const faviconAppleLink = document.getElementById('favicon-apple-link');
  if (profile.logo) {
    if (faviconLink) faviconLink.href = profile.logo;
    if (faviconAppleLink) faviconAppleLink.href = profile.logo;
  }
  const logoBtn = document.getElementById('p-logo-btn');
  const logoRing = document.getElementById('p-logo-ring');
  const hasStories = (profile.storyImages && profile.storyImages.length) > 0;
  logoRing.classList.remove('story-ring-unseen', 'story-ring-seen', 'story-ring-none');
  logoRing.classList.add(!hasStories ? 'story-ring-none' : (hasUnseenStory() ? 'story-ring-unseen' : 'story-ring-seen'));
  logoBtn.style.cursor = hasStories ? 'pointer' : 'default';
  document.getElementById('p-verify-label').textContent = profile.verifyLabel;
  const verifyLink = document.getElementById('p-verify-link');
  verifyLink.textContent = profile.verifyText;
  verifyLink.href = profile.verifyUrl;

  document.getElementById('nav-wa-jual').href = 'https://wa.me/' + profile.waJual;
  document.getElementById('nav-wa-rekber').href = 'https://wa.me/' + profile.waRekber;
  document.getElementById('nav-ch-stok').href = profile.chStok;
  document.getElementById('nav-ch-rental').href = profile.chRental;
  document.getElementById('nav-topup').href = profile.topupUrl;
  document.getElementById('nav-testimoni').href = profile.testimoniUrl || defaultProfile.testimoniUrl;
  const navLabels = { ...defaultProfile.navLabels, ...(profile.navLabels || {}) };
  document.getElementById('nav-wa-jual-label').textContent = navLabels.waJual;
  document.getElementById('nav-wa-rekber-label').textContent = navLabels.waRekber;
  document.getElementById('nav-ch-stok-label').textContent = navLabels.chStok;
  document.getElementById('nav-ch-rental-label').textContent = navLabels.chRental;
  document.getElementById('nav-topup-label').textContent = navLabels.topup;
  document.getElementById('nav-testimoni-label').textContent = navLabels.testimoni;
  renderBanner();
}

/* ---------------- Banner slideshow (profile) ---------------- */
function getBannerSlides() {
  return profile.bannerSlides || [];
}
let bannerAutoTimer = null;
/* ---------------- Auto-retry buat gambar yang gagal load ---------------- */
/* Kalau foto (dari R2) gagal dimuat (koneksi lemot/putus), coba lagi otomatis
   sampai 3x dengan jeda. Kalau tetap gagal, tampilkan ikon placeholder. */
function handleImgError(img) {
  // Thumbnail (/thumb.php) gagal -> langsung coba URL foto aslinya sekali, baru masuk alur retry biasa.
  if (img.src.indexOf('/thumb.php?') !== -1 && !img.dataset.thumbFallback) {
    img.dataset.thumbFallback = '1';
    try {
      const orig = new URL(img.src, location.href).searchParams.get('u');
      if (orig) { delete img.dataset.origSrc; img.src = orig; return; }
    } catch (e) {}
  }
  if (!img.dataset.origSrc) img.dataset.origSrc = img.src.split('?_retry=')[0];
  const attempts = parseInt(img.dataset.retryCount || '0', 10);
  if (attempts < 4) {
    img.dataset.retryCount = attempts + 1;
    setTimeout(() => {
      img.src = img.dataset.origSrc + '?_retry=' + Date.now();
    }, 1000 * (attempts + 1));
  } else {
    img.onerror = null;
    img.style.display = 'none';
    const wrap = img.parentElement;
    if (wrap && !wrap.querySelector('.img-fallback-icon')) {
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      const fb = document.createElement('div');
      fb.className = 'img-fallback-icon absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/30 p-1 text-center';
      fb.innerHTML = '<span class="text-lg">▢</span><span class="diag-label text-[10px]">Mengecek penyebab...</span>';
      wrap.appendChild(fb);
      // Diagnosa langsung: coba fetch URL aslinya dan tampilkan alasan gagalnya
      // di layar (biar kelihatan tanpa perlu buka DevTools).
      fetch(img.dataset.origSrc, { mode: 'cors' })
        .then(res => {
          const label = fb.querySelector('.diag-label');
          label.textContent = res.ok
            ? 'Loaded tapi <img> nolak (cek Content-Type)'
            : `Gagal (HTTP ${res.status})`;
        })
        .catch(err => {
          const label = fb.querySelector('.diag-label');
          label.textContent = `Gagal: ${err.message || 'network/CORS error'}`;
        });
    }
  }
}

function renderBanner() {
  const wrap = document.getElementById('banner-wrap');
  const slides = getBannerSlides();
  if (bannerAutoTimer) { clearInterval(bannerAutoTimer); bannerAutoTimer = null; }
  if (!slides.length) {
    // Kalau ini kepanggil SEBELUM data profile beneran kelar diambil dari server (profileLoaded
    // masih false), JANGAN sentuh wrap sama sekali -- biarin skeleton bawaan HTML tetap kepasang
    // di slot animasinya (biar urutan banner -> WA jual-beli/rekber/saluran tetap benar, gak
    // nunggu network). Cuma pas udah DIPASTIKAN kosong (profileLoaded true) baru boleh disembunyiin.
    if (profileLoaded) { wrap.classList.add('hidden'); wrap.innerHTML = ''; }
    return;
  }
  wrap.classList.remove('hidden');
  const uid = 'promo_banner';
  const slidesHtml = slides.map((s, i) => {
    const img = `<img src="${s.img}" ${i === 0 ? 'decoding="async"' : 'loading="lazy" decoding="async"'} onload="this.style.opacity='1'" onerror="handleImgError(this)" class="img-fade h-full w-full object-cover" />`;
    return `<div class="h-full w-full flex-shrink-0">${s.link ? `<a href="${s.link}" target="_blank" rel="noreferrer">${img}</a>` : img}</div>`;
  }).join('');
  const dots = slides.length > 1 ? `
    <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2">
      ${dotsHtml(uid, slides.length, 0)}
    </div>` : '';
  wrap.innerHTML = `
    <div class="relative overflow-hidden rounded-xl" style="aspect-ratio:3/1">
      <div id="${uid}" data-index="0" data-count="${slides.length}" class="flex h-full w-full slide-track"
        ${dragAttrs(uid)}
        style="touch-action:pan-y">${slidesHtml}</div>
      ${dots}
    </div>`;
  if (slides.length > 1) {
    bannerAutoTimer = setInterval(() => moveSlide(uid, 1), 4000);
  }
}

/* ---------------- Admin UI state ---------------- */
function renderAdminUI() {
  const addPostBtn = document.getElementById('btn-add-post');
  closeFiturMenu();
  const adminOnlyItems = document.getElementById('admin-only-items');
  const adminLoginBtn = document.getElementById('menu-admin-login');
  if (isAdmin) {
    addPostBtn.classList.remove('hidden'); addPostBtn.classList.add('flex');
    adminOnlyItems.classList.remove('hidden');
    adminLoginBtn.classList.add('hidden');
  } else {
    addPostBtn.classList.add('hidden'); addPostBtn.classList.remove('flex');
    adminOnlyItems.classList.add('hidden');
    adminLoginBtn.classList.remove('hidden');
  }
  renderStok();
  renderRental();
  const linkbioAdminBtn = document.getElementById('btn-linkbio-admin');
  if (linkbioAdminBtn) { if (isAdmin) linkbioAdminBtn.classList.remove('hidden'); else linkbioAdminBtn.classList.add('hidden'); }
}

/* Tombol "Fitur" ini sekarang kebuka buat semua orang (bukan cuma admin), isinya Home, mode
   gelap/terang, Admin (posisi ke-3), lalu Music paling bawah. Buka/tutupnya lewat class
   'fitur-open' di #admin-corner (bukan classList 'hidden' langsung di #admin-menu lagi)
   supaya transisi slide-in-dari-kiri & backdrop-nya kepakai (lihat CSS #admin-corner.fitur-open
   ...). Backdrop-nya sengaja polos tanpa blur (lihat catatan di CSS-nya) biar gak bikin
   tampilan di belakangnya keliatan blur/glitch pas menu dibuka. */
/* #fitur-blur sekarang nutupin SELURUH layar yang lagi keliatan (setinggi viewport), bukan
   cuma sampai bawah kotak #admin-menu -- biar konsisten sama referensi (venderpedia): pas
   menu "Fitur" dibuka, semua konten di belakangnya (termasuk yang di bawah kotak menu) ikut
   blur/gelap, gak ada bagian yang keliatan tajam/nyala sendiri. Posisinya fixed, jadi cukup
   diset setinggi window.innerHeight, gak perlu ngikutin scroll atau tinggi halaman penuh. */
function updateFiturBlurHeight() {
  const blur = document.getElementById('fitur-blur');
  if (!blur) return;
  blur.style.height = window.innerHeight + 'px';
}
/* Kunci scroll halaman di belakang menu Fitur: semua gerakan sentuh/scroll yang BUKAN di dalam
   daftar lagu (#bg-music-playlist-wrap) diblok, jadi geser slider musik gak ikut nge-scroll stok. */
function fiturScrollBlock(e) {
  const list = document.getElementById('bg-music-playlist-wrap');
  if (list && list.contains(e.target) && list.scrollHeight > list.clientHeight) return;
  if (e.cancelable) e.preventDefault();
}
function openFiturMenu() {
  playSfx('open'); // FIX: klik tombol Fitur belum ada bunyinya sama sekali -- sekarang bunyi pas menu kebuka.
  document.getElementById('admin-corner').classList.add('fitur-open');
  updateFiturBlurHeight();
  document.addEventListener('touchmove', fiturScrollBlock, { passive: false });
  document.addEventListener('wheel', fiturScrollBlock, { passive: false });
}
function closeFiturMenu() {
  // FIX: nutup menu Fitur (baik lewat tombol X, klik di luar/backdrop, ATAU otomatis abis
  // milih salah satu menu kayak Home/Mode Terang/dst) belum ada bunyinya. Dicek dulu menu-nya
  // emang lagi kebuka -- soalnya closeFiturMenu() ini juga dipanggil terus tiap kali klik di
  // MANAPUN di halaman (listener 'click' global di bawah), jadi kalau gak dicek dulu, bunyinya
  // bakal nyala tiap klik apapun walau menu Fitur-nya emang lagi ketutup dari awal.
  const corner = document.getElementById('admin-corner');
  if (corner.classList.contains('fitur-open')) playSfx('close');
  corner.classList.remove('fitur-open');
  document.removeEventListener('touchmove', fiturScrollBlock);
  document.removeEventListener('wheel', fiturScrollBlock);
}
document.getElementById('btn-admin-toggle').onclick = () => {
  const corner = document.getElementById('admin-corner');
  if (corner.classList.contains('fitur-open')) closeFiturMenu(); else openFiturMenu();
};
document.getElementById('btn-fitur-close').onclick = closeFiturMenu;
document.getElementById('fitur-backdrop').onclick = closeFiturMenu;
window.addEventListener('resize', () => {
  if (document.getElementById('admin-corner').classList.contains('fitur-open')) updateFiturBlurHeight();
});
document.getElementById('menu-go-home').onclick = () => {
  closeFiturMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.getElementById('menu-go-linkbio').onclick = () => {
  closeFiturMenu();
  openLinkBio();
};
document.getElementById('btn-wishlist-toggle').onclick = () => {
  closeFiturMenu();
  openWishlistModal();
};
document.getElementById('menu-admin-login').onclick = () => {
  closeFiturMenu();
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-pass').type = 'password';
  document.getElementById('login-error').classList.add('hidden');
  openModal('modal-login');
};
document.addEventListener('click', (e) => {
  const corner = document.getElementById('admin-corner');
  if (!corner.contains(e.target)) closeFiturMenu();
});

