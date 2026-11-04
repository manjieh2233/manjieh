/* ---------------- FIX: animasi masuk (.anim-in, tombol nav) gak pernah "lepas" sehingga
   nge-block animasi klik (transform) di atasnya ----------------
   ROOT CAUSE: .anim-in (dipakai di kartu stok/rental & chip kategori) dan nav a.card (tombol
   WA Jual/Beli, WA Rekber, Saluran Stok/Rental, Topup, Testimoni) sama-sama pakai
   "animation: ... both" buat animasi masuk (fadeInUp/cardPopIn/navIconReveal/navIconPop).
   Fill-mode "both" bikin animasinya TERUS "aktif nempel" di elemen itu SELAMANYA walau udah
   kelar (gak pernah dicopot lewat JS) -- padahal secara spesifikasi CSS, "CSS Animation yang
   lagi aktif" itu prioritasnya LEBIH TINGGI daripada rule/transisi biasa buat property yang
   sama. Akibatnya: transform (& box-shadow) yang seharusnya dipicu pas .is-pressed ditambahin
   (efek zoom+glow kartu, efek scale tombol nav pas diklik) ketutupan/gak keliatan sama sekali,
   soalnya browser nganggep transform-nya masih "dikuasai" animasi masuk yang udah lama kelar
   itu. Makanya tombol WA JB/WA Rekber/Saluran/Topup kerasa "polos" pas diklik walau CSS efek
   klik-nya sendiri udah bener ada.
   FIX: begitu animasi masuknya beneran SELESAI (event 'animationend'), langsung copot animasi
   itu dari elemennya (style.animation='none') -- ini ngelepas transform/box-shadow balik ke
   kontrol CSS normal, jadi transition/rule .is-pressed sesudahnya bisa jalan semestinya. Aman
   dipasang sebagai satu listener event-delegation di document (gak perlu re-init tiap render
   ulang kartu/chip/tombol -- otomatis kena tiap kali elemen baru selesai animasi masuknya). */
document.addEventListener('animationend', (e) => {
  const el = e.target;
  if (el instanceof Element && el.matches('.anim-in, nav a.card, nav a.card svg')) {
    // "nav a.card" nyetel opacity:0 sebagai property TERPISAH (bukan cuma lewat keyframe) buat
    // state awal sebelum animasi jalan -- kalau cuma animation-nya doang yang dicopot, opacity:0
    // itu bakal balik "menang" dan bikin tombolnya ngilang lagi abis animasi masuknya kelar.
    // Makanya opacity dipatok balik ke 1 barengan pas animation-nya dicopot, khusus buat selector
    // ini (.anim-in & svg-nya gak butuh ini, opacity awal mereka cuma lewat keyframe).
    if (el.matches('nav a.card')) el.style.opacity = '1';
    el.style.animation = 'none';
  }
});

/* ---------------- Efek "zoom + glow ungu" pas kartu stok/rental disentuh/ditekan ----------------
   Dulu efek ini cuma diatur lewat CSS :active, jadi: (1) suka gak konsisten di beberapa HP kalau
   pas nyentuh sambil discroll, (2) durasinya kepotong sependek sentuhan doang jadi kesannya
   buru-buru, (3) kesannya cuma garis pinggir doang yang nyala tanpa fotonya ikut zoom. Sekarang
   dipegang lewat JS: nempelin class .is-pressed ke kartu yang disentuh -- jalan SAMA PERSIS di
   kartu stok MAUPUN rental karena dua-duanya sama-sama pake class .stock-card -- terus lepasnya
   sengaja ditahan dikit biar animasinya sempat "selesai" kerasa, gak instan ilang. */
let pressedCardEl = null;
let pressedCardReleaseTimer = null;
// Kilau emas (.card-shine) dipisah dari zoom -- ini SENGAJA selalu langsung nyala begitu
// disentuh (termasuk pas numpang lewat/scroll), soalnya efek ini yang bikin kesan mewah dan
// gak ganggu apa-apa walau kepicu tiap kartu yang kesentuh pas scroll.
function triggerCardShine(card) {
  const img = card.querySelector('.stock-card-img');
  if (img) {
    img.classList.remove('card-shine');
    void img.offsetWidth; // paksa reflow biar animasinya restart dari awal kalau ditekan cepet berkali-kali
    img.classList.add('card-shine');
    setTimeout(() => img.classList.remove('card-shine'), 520);
  }
}
function setPressedCard(card) {
  if (pressedCardReleaseTimer) { clearTimeout(pressedCardReleaseTimer); pressedCardReleaseTimer = null; }
  if (pressedCardEl && pressedCardEl !== card) pressedCardEl.classList.remove('is-pressed');
  pressedCardEl = card;
  if (card) card.classList.add('is-pressed');
}
function releasePressedCard() {
  if (!pressedCardEl) return;
  const card = pressedCardEl;
  pressedCardReleaseTimer = setTimeout(() => {
    card.classList.remove('is-pressed');
    if (pressedCardEl === card) pressedCardEl = null;
  }, 180);
}
/* BUGFIX (kartu ke-zoom sendiri pas scroll): dulu is-pressed langsung nempel begitu jari
   nyentuh kartu (pointerdown doang), terus baru dicopot kalau jari kedeteksi udah gerak lewat
   toleransi kecil. Masalahnya: pas mulai scroll, jari nyentuh dulu baru gerak -- jadi ada jeda
   sepersekian detik di mana zoom (transisinya .22s) sempat mulai kelihatan sebelum keburu
   dibatalin, jadi kerasa "kepicu" tiap kartu yang kesentuh pas scroll lewat.
   Fix: zoom+glow-nya sekarang DITUNDA dulu (PRESS_HOLD_DELAY) sebelum beneran nempel. Kalau
   dalam jeda itu jari kedeteksi gerak (tandanya orang mau scroll) ATAU jarinya udah lepas
   duluan, zoom dibatalin SEBELUM sempat nempel sama sekali -- jadi pas scroll gak akan pernah
   kelihatan zoom-nya nyala. Kalau jari diem/beneran ditekan, zoom baru muncul begitu jeda
   kelar. Kilau kuning (triggerCardShine) tetap dipanggil langsung di pointerdown, gak ikut
   ditunda, sesuai yang diminta. */
const PRESS_HOLD_DELAY = 90;
const PRESS_MOVE_TOLERANCE = 8;
let pressStartX = 0, pressStartY = 0, pressMoveCancelled = false, pressHoldTimer = null, pressCandidateCard = null;
document.addEventListener('pointerdown', (e) => {
  const card = e.target.closest('.stock-card, .press-glow');
  if (card) {
    pressStartX = e.clientX; pressStartY = e.clientY; pressMoveCancelled = false;
    pressCandidateCard = card;
    triggerCardShine(card);
    if (pressHoldTimer) clearTimeout(pressHoldTimer);
    pressHoldTimer = setTimeout(() => {
      pressHoldTimer = null;
      if (!pressMoveCancelled && pressCandidateCard === card) setPressedCard(card);
    }, PRESS_HOLD_DELAY);
  }
}, { passive: true });
document.addEventListener('pointermove', (e) => {
  if (pressMoveCancelled || !pressCandidateCard) return;
  if (Math.abs(e.clientX - pressStartX) > PRESS_MOVE_TOLERANCE || Math.abs(e.clientY - pressStartY) > PRESS_MOVE_TOLERANCE) {
    pressMoveCancelled = true;
    if (pressHoldTimer) { clearTimeout(pressHoldTimer); pressHoldTimer = null; }
    if (pressedCardEl) {
      if (pressedCardReleaseTimer) { clearTimeout(pressedCardReleaseTimer); pressedCardReleaseTimer = null; }
      pressedCardEl.classList.remove('is-pressed');
      pressedCardEl = null;
    }
  }
}, { passive: true });
['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (pressHoldTimer) { clearTimeout(pressHoldTimer); pressHoldTimer = null; }
    pressCandidateCard = null;
    releasePressedCard();
  }, { passive: true });
});

/* ---------------- Mode Terang/Gelap (tersedia buat semua orang, disimpan lokal di device masing-masing) ---------------- */
const THEME_STORAGE_KEY = 'toukaenay_theme';
const THEME_ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7.1 7.1 0 0 0 21 12.8Z"/></svg>';
const THEME_ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
function applyTheme(theme) {
  document.documentElement.classList.toggle('light-theme', theme === 'light');
  const icon = document.getElementById('menu-theme-icon');
  const label = document.getElementById('menu-theme-label');
  if (icon) icon.innerHTML = theme === 'light' ? THEME_ICON_MOON : THEME_ICON_SUN;
  if (label) label.textContent = theme === 'light' ? 'Mode Gelap' : 'Mode Terang';
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch (e) {}
  applyTheme(saved === 'light' ? 'light' : 'dark');
})();
updateSoundFxMenuLabel();
document.getElementById('menu-toggle-theme').onclick = () => {
  playSfx('tap'); // FIX: klik Mode Terang/Gelap dulu bisu -- sekarang ada bunyi tap pas modenya diganti.
  const isLight = document.documentElement.classList.contains('light-theme');
  const next = isLight ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (e) {}
  // curGame belum ke-declare pas initTheme() jalan pertama kali (makanya panggilan ini
  // gak ditaruh di dalam applyTheme() itu sendiri), tapi di titik ini (klik tombol,
  // pasti udah lewat init penuh) curGame udah aman dipanggil buat refresh banner footer
  // ke versi dark/light yang sesuai.
  if (typeof updateFooterLogo === 'function') updateFooterLogo();
  closeFiturMenu();
};
document.getElementById('menu-logout').onclick = async () => {
  closeFiturMenu();
  setAdminToken(null);
  isAdmin = false;
  renderAdminUI();
  showToast('Berhasil keluar dari admin.');
};
document.getElementById('btn-toggle-pass').onclick = () => {
  const inp = document.getElementById('login-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
};
document.getElementById('btn-login-submit').onclick = async () => {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  document.getElementById('login-error').classList.add('hidden');
  if (!u || !p) { document.getElementById('login-error').classList.remove('hidden'); return; }
  const btn = document.getElementById('btn-login-submit');
  btn.disabled = true; btn.textContent = 'Memproses...';
  try {
    const result = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (!result || !result.success || !result.token) throw new Error('invalid');
    setAdminToken(result.token);
    isAdmin = true;
    renderAdminUI();
    closeModal('modal-login');
    showToast('Login admin berhasil.');
  } catch (e) {
    // BUG YANG DIPERBAIKI: sebelumnya sindiran "Hayoo mau ngapain" ini muncul sebagai toast
    // ngambang di paling bawah layar (terpisah dari form login-nya) -- sekarang ditaruh
    // LANGSUNG di tengah-tengah form login itu sendiri (gantiin teks error biasa), biar
    // orang yang lagi iseng coba-coba login langsung lihat sindirannya di situ juga.
    const errEl = document.getElementById('login-error');
    errEl.textContent = 'Hayoo mau ngapain 👀 — Username atau password salah.';
    errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Masuk';
};

