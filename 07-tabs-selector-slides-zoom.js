/* ---------------- Tabs (Stok/Rental) ---------------- */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  playSfx('gameSwitch'); // FIX: dulu ganti tab Stok<->Rental gak ada bunyinya sama sekali -- sekarang dikasih sfx senada tombol ganti game FF/ML.
  document.querySelectorAll('.tab').forEach(x => { x.classList.remove('border-purple-500'); x.classList.add('border-transparent', 'text-white/60'); });
  b.classList.add('border-purple-500'); b.classList.remove('border-transparent', 'text-white/60');
  // Gerakin simbol (svg) di tombol tab yang dipencet -- SETIAP kali dipencet animasinya
  // harus nyala lagi dari awal, bukan cuma pas pertama kali. Class-nya dicopot dulu, terus
  // ditambahin lagi di frame render berikutnya (requestAnimationFrame) -- lebih diandalkan
  // daripada trik "reflow" (void offsetWidth) doang, yang kadang gak konsisten micu ulang
  // animasi CSS di beberapa browser HP (terutama Safari iOS) kalau dipencet cepat berkali-kali.
  const tapIcon = b.querySelector('svg');
  if (tapIcon) {
    tapIcon.classList.remove('tab-icon-tap');
    requestAnimationFrame(() => requestAnimationFrame(() => tapIcon.classList.add('tab-icon-tap')));
  }
  const isStok = b.dataset.tab === 'stok';
  const showEl = document.getElementById(isStok ? 'stok-panel' : 'rental-panel');
  const hideEl = document.getElementById(isStok ? 'rental-panel' : 'stok-panel');
  hideEl.style.display = 'none';
  showEl.style.display = '';
  showEl.classList.remove('panel-fade');
  void showEl.offsetWidth; // restart animation
  showEl.classList.add('panel-fade');
  // BUG FIX: posisi/lebar kotak indikator ungu (.seg-indicator) dihitung lewat getBoundingClientRect(),
  // yang balikin 0 kalau elemennya lagi ada di dalam panel yang display:none. Kalau ini kejadian
  // pas render pertama (misal toggle rental dihitung sebelum tab Rental pernah dibuka), indikatornya
  // jadi nyangkut di ukuran/posisi 0 -- keliatan transparan/ilang warnanya -- dan gak pernah kebenerin
  // sendiri. Jadi tiap abis pindah tab (panelnya udah pasti keliatan/display:'' sekarang), tombol
  // yang lagi aktif di toggle masing-masing panel diukur ulang & indikatornya digeser ke posisi benar.
  requestAnimationFrame(() => {
    if (isStok) {
      const activeGameBtn = document.querySelector('#game-toggle-wrap .game.primary, #game-toggle-wrap .game.primary-pink');
      if (activeGameBtn) segMoveIndicator(document.getElementById('game-toggle-wrap'), activeGameBtn, isPinkGame(curGame) ? '#ec4899' : '#a855f7');
    } else {
      const activeRentalBtn = rentalGamesWrap && rentalGamesWrap.querySelector('.rental-game.primary');
      if (activeRentalBtn) segMoveIndicator(rentalGamesWrap, activeRentalBtn, '#a855f7');
    }
  });
});

/* ---------------- Stok game/tag selector ---------------- */
function getFFTags() {
  return (profile.ffTags && profile.ffTags.length) ? profile.ffTags : defaultProfile.ffTags;
}
function getRBTags() {
  return (profile.rbTags && profile.rbTags.length) ? profile.rbTags : defaultProfile.rbTags;
}
function isPinkGame(g) { return g === 'ML' || g === 'RB'; } // Roblox pakai tema pink + susunan chip satu baris seperti ML
function getTagsForGame(g) { return g === 'FF' ? getFFTags() : (g === 'RB' ? getRBTags() : getMLTags()); }
function getMLTags() {
  return (profile.mlTags && profile.mlTags.length) ? profile.mlTags : defaultProfile.mlTags;
}
// Daftar kategori SG (FF) & tombol aktif/nonaktif-nya -- dua-duanya diatur admin lewat
// "Kelola Kategori". Kalau dimatiin (isFFSgCategoryEnabled() === false), chip filter di
// homepage & kotak kategori di form Stok FF disembunyikan total (lihat renderSgCategoryFilter/
// updateFFCategoryFieldVisibility) -- postingan yang UDAH kepasang kategori sebelumnya tetap
// aman datanya, cuma gak kesaring/keliatan lagi sampai fiturnya dinyalain ulang.
function getFFSgCategories() {
  return (profile.ffSgCategories && profile.ffSgCategories.length) ? profile.ffSgCategories : defaultProfile.ffSgCategories;
}
/* Kategori SG yang langsung terlihat di filter (sisanya muncul setelah menekan "Kategori SG lainnya").
   Diatur admin (profile.ffSgPinned). Kalau belum pernah diatur: OPM, REAPER/REPPER, DIGIMON. */
function getFFSgPinned() {
  const all = getFFSgCategories();
  const norm = s => String(s || '').trim().toUpperCase();
  if (Array.isArray(profile.ffSgPinned)) {
    const want = new Set(profile.ffSgPinned.map(norm));
    return all.filter(c => want.has(norm(c)));
  }
  return all.filter(c => /(^|\s)(OPM|REAPER|REPPER|DIGIMON)(\s|$)/.test(norm(c)));
}
function isFFSgCategoryEnabled() {
  return profile.ffSgCategoryEnabled !== undefined ? profile.ffSgCategoryEnabled : defaultProfile.ffSgCategoryEnabled;
}
function getRentalGames() {
  return (profile.rentalGames && profile.rentalGames.length) ? profile.rentalGames : defaultProfile.rentalGames;
}
function getRentalGameLabel(v) {
  const g = getRentalGames().find(x => x.v === v);
  return g ? g.l : (v || '');
}
function getRentalTags(game) {
  if (profile.rentalTagsByGame && profile.rentalTagsByGame[game] && profile.rentalTagsByGame[game].length) {
    return profile.rentalTagsByGame[game];
  }
  // Data lama sebelum ada Game Rental: dulu cuma 1 daftar kategori harga buat semua.
  if (!profile.rentalTagsByGame && profile.rentalTags && profile.rentalTags.length) {
    return profile.rentalTags;
  }
  return (defaultProfile.rentalTagsByGame[game] && defaultProfile.rentalTagsByGame[game].length) ? defaultProfile.rentalTagsByGame[game] : [];
}
function getRentalSgCategories() {
  return (profile.rentalSgCategories && profile.rentalSgCategories.length) ? profile.rentalSgCategories : defaultProfile.rentalSgCategories;
}
function isRentalSgCategoryEnabled() {
  return profile.rentalSgCategoryEnabled !== undefined ? profile.rentalSgCategoryEnabled : defaultProfile.rentalSgCategoryEnabled;
}
function getChipSetting(key) {
  return profile[key] !== undefined ? profile[key] : defaultProfile[key];
}
function getDefaultTag(game) {
  // ML gak punya chip "ALL_READY" tersendiri (lihat renderTags: chip ML cuma nominalChips +
  // Flash Sale + Sold Out, gak ada baris status terpisah kayak FF) -- jadi kalau default-nya
  // dipaksa 'ALL_READY' gak bakal ada chip yang match/nyala pas tab ML pertama dibuka.
  // Makanya ML SELALU default ke tag pertamanya sendiri (misal "ML READY"), FF tetap boleh
  // default ke 'ALL_READY' karena chip itu memang dirender di baris status FF.
  if (game === 'FF' && getChipSetting('ffShowAllReady')) return 'ALL_READY';
  return getTagsForGame(game)[0].v;
}
let curGame = 'FF', curTag = getDefaultTag('FF');
// Kategori SG (khusus FF, multi-select) yang lagi dipakai buat filter TAMBAHAN di halaman
// utama -- independen dari curTag/curSort, jadi bisa dikombinasi bareng (misal: kategori OPM +
// REPPER, DITAMBAH chip Termurah). Direset tiap pindah keluar dari tab FF (lihat game toggle
// onclick) karena ML gak punya kategori ini sama sekali. Post cocok kalau punya SEMUA (bukan
// salah satu) kategori yang kepilih ADA di ffCategories postingannya (logika AND/irisan -- pilih
// OPM + REPPER, yang muncul cuma akun yang beneran punya OPM DAN REPPER bareng).
let activeSgFilters = new Set();
// Dulu dipakai biar chip default gak keliatan "nyala" sebelum user klik -- sekarang chip
// default (misal "FF Ready"/"ML Ready") SENGAJA langsung nyala begitu ganti tab, kaya chip
// "Semua" di Rental (lihat renderTags: activeCls sekarang cuma ngecek curTag === c.tag).
// Variabel ini udah gak ngaruh ke tampilan chip lagi, dibiarin ada buat jaga-jaga kalau
// ada bagian lain yang masih nyetel nilainya.
let tagUserSelected = false;
// Urutan tampilan stok: 'terbaru' (default begitu web dibuka), 'termurah', atau 'termahal'.
let curSort = 'terbaru';
const tagsWrap = document.getElementById('tags-wrap');
const sortWrap = document.getElementById('sort-wrap');
function getEffectivePrice(p) {
  if (p.discountActive && p.discountPrice) {
    const n = parseRupiahNumber(p.discountPrice);
    if (n != null) return n;
  }
  return parseRupiahNumber(p.price) || 0;
}
function sortListBySort(list, sort) {
  if (sort === 'termurah') return [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
  if (sort === 'termahal') return [...list].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
  return list; // 'terbaru' -> udah ikut urutan default posts (pinned dulu, lalu paling baru diposting)
}
function renderSortWrap() {
  if (!sortWrap) return;
  sortWrap.querySelectorAll('.sort-check').forEach(cb => {
    cb.checked = cb.dataset.sort === curSort;
    cb.classList.toggle('accent-pink-themed', isPinkGame(curGame));
    cb.classList.toggle('accent-purple-500', !isPinkGame(curGame));
  });
}
if (sortWrap) {
  sortWrap.querySelectorAll('.sort-check').forEach(cb => {
    cb.onchange = () => {
      // Berlaku kayak radio (cuma 1 aktif): centang salah satu otomatis lepas yang lain,
      // dan gak boleh semua kosong -- kalo yang aktif di-uncheck, balik ke "Terbaru".
      curSort = cb.checked ? cb.dataset.sort : 'terbaru';
      renderSortWrap();
      renderStok();
      // Kasih feedback pop kecil di label yang baru dipencet.
      const lbl = cb.closest('label');
      if (lbl) {
        lbl.classList.remove('sort-opt-pop');
        requestAnimationFrame(() => requestAnimationFrame(() => lbl.classList.add('sort-opt-pop')));
      }
    };
  });
}
renderSortWrap();
let curRentalGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
let curRentalTag = 'ALL_READY';
const rentalTagsWrap = document.getElementById('rental-tags-wrap');
const rentalGamesWrap = document.getElementById('rental-games-wrap');

const ICON_CHECK_GLASS = `<span class="inline-flex items-center justify-center flex-shrink-0" style="width:16px;height:16px;border-radius:9999px;background:rgba(255,255,255,.22)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;display:block"><path d="M5 13l4 4L19 7"/></svg></span>`;
const ICON_PIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:-2px"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`;
const ICON_X_GLASS = `<span class="inline-flex items-center justify-center flex-shrink-0" style="width:16px;height:16px;border-radius:9999px;background:rgba(255,255,255,.22)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;display:block"><path d="M18 6 6 18M6 6l12 12"/></svg></span>`;
function renderTags() {
  const tags = getTagsForGame(curGame);
  const _gk = curGame === 'FF' ? 'ff' : 'ml'; // Roblox ikut pengaturan chip ML
  const showAllReady = getChipSetting(_gk + 'ShowAllReady');
  const showSoldOut = getChipSetting(_gk + 'ShowSoldOut');
  const showDiskon = getChipSetting(_gk + 'ShowDiskon');

  // FF: baris pertama chip status (Semua Ready - Flash Sale - Sold Out), baris di bawahnya
  // kategori nominal harga yang udah ada (0-500K dst) -- tetap 2 baris terpisah kayak biasa.
  // ML: gak ada kategori harga, jadi chip "ML Ready" (dari nominalChips) digabung jadi SATU
  // baris bareng Flash Sale & Sold Out, urutannya ML Ready -> Flash Sale -> Sold Out.
  const nominalChips = tags.map(t => ({ tag: t.v, label: `${ICON_CHECK_GLASS}${escapeHtml(t.l)}`, danger: false }));

  const chipBtn = (c) => {
    const activeCls = (curTag === c.tag) ? ((c.danger || c.discount) ? 'active' : (isPinkGame(curGame) ? 'active-pink' : 'active')) : '';
    return `<button data-tag="${c.tag}" class="chip anim-in ${activeCls} ${c.danger ? 'danger' : ''} ${c.discount ? 'discount' : ''} inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">${c.label}</button>`;
  };
  const chipRow = (chips) => chips.length ? `<div class="chip-row">${chips.map(chipBtn).join('')}</div>` : '';

  if (isPinkGame(curGame)) {
    const mlRow = [
      ...nominalChips,
      ...(showDiskon ? [{ tag: 'DISKON', label: `✦ Flash Sale`, danger: false, discount: true }] : []),
      ...(showSoldOut ? [{ tag: 'SOLD_OUT', label: `${ICON_X_GLASS}Sold Out`, danger: true }] : [])
    ];
    tagsWrap.innerHTML = chipRow(mlRow);
  } else {
    const statusChips = [
      ...(showAllReady ? [{ tag: 'ALL_READY', label: `${ICON_CHECK_GLASS}${curGame} Ready`, danger: false }] : []),
      ...(showDiskon ? [{ tag: 'DISKON', label: `✦ Flash Sale`, danger: false, discount: true }] : []),
      ...(showSoldOut ? [{ tag: 'SOLD_OUT', label: `${ICON_X_GLASS}Sold Out`, danger: true }] : [])
    ];
    tagsWrap.innerHTML = [chipRow(statusChips), chipRow(nominalChips)].filter(Boolean).join('<div class="mt-2"></div>');
  }
  tagsWrap.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { playSfx('filterSelect'); curTag = b.dataset.tag; tagUserSelected = true; renderTags(); renderStok(); });
  renderSgCategoryFilter();
}
/* Filter TAMBAHAN khusus tab FF -- kategori SG (SG 2, REPPER, OPM, dst), bisa pilih lebih
   dari satu (multi-select, klik lagi buat batalin). Ini independen dari chip Termurah/Termahal/
   Terbaru/status di atas -- keduanya digabung (AND) pas nyaring daftar postingan, lihat
   matchesStokFilter(). Disembunyikan total di tab ML karena kategori ini emang cuma milik FF.
   Opsinya TERSEMBUNYI secara default -- baru kebuka pas chip "Kategori SG" (di sebelah
   Terbaru/Termurah/Termahal) diklik, bukan langsung nampilin 9 pilihan sekaligus dari awal. */
let sgCategoryPanelOpen = false;
function renderSgCategoryFilter() {
  const wrap = document.getElementById('sg-category-wrap');
  const toggleBtn = document.getElementById('sg-category-toggle-btn');
  const badge = document.getElementById('sg-category-toggle-badge');
  const chevron = document.getElementById('sg-category-toggle-chevron');
  if (!wrap || !toggleBtn) return;
  if (curGame !== 'FF' || !isFFSgCategoryEnabled()) {
    wrap.classList.add('hidden'); wrap.innerHTML = '';
    toggleBtn.classList.add('hidden'); toggleBtn.classList.remove('flex');
    return;
  }
  toggleBtn.classList.remove('hidden'); toggleBtn.classList.add('flex');
  toggleBtn.classList.toggle('border-purple-500', activeSgFilters.size > 0 || sgCategoryPanelOpen);
  if (badge) {
    badge.classList.toggle('hidden', activeSgFilters.size === 0);
    badge.textContent = String(activeSgFilters.size);
  }
  if (chevron) chevron.style.transform = sgCategoryPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  if (!sgCategoryPanelOpen) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = `<p class="mb-1.5 text-center text-[10px] text-white/40">Bisa pilih lebih dari satu</p><div class="chip-row">${getFFSgCategories().map(cat => {
    const active = activeSgFilters.has(cat);
    return `<button data-sgcat="${escapeHtml(cat)}" class="chip anim-in ${active ? 'active' : ''} inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">${escapeHtml(cat)}</button>`;
  }).join('')}</div>`;
  wrap.querySelectorAll('[data-sgcat]').forEach(b => b.onclick = () => {
    playSfx('filterSelect');
    const cat = b.dataset.sgcat;
    if (activeSgFilters.has(cat)) activeSgFilters.delete(cat); else activeSgFilters.add(cat);
    renderSgCategoryFilter();
    renderStok();
  });
}
document.getElementById('sg-category-toggle-btn').onclick = () => {
  sgCategoryPanelOpen = !sgCategoryPanelOpen;
  renderSgCategoryFilter();
};

/* ---------------- Rental game & category selector ---------------- */
function renderRentalGames() {
  if (!rentalGamesWrap) return;
  const games = getRentalGames();
  if (!games.some(g => g.v === curRentalGame)) curRentalGame = games[0] ? games[0].v : null;
  rentalGamesWrap.innerHTML = `<div class="grid gap-2" style="grid-template-columns:repeat(${Math.max(games.length, 1)}, minmax(0,1fr))">
    ${games.map(g => `<button data-rgame="${g.v}" class="rental-game rounded-lg py-2 text-sm font-semibold ${curRentalGame === g.v ? 'primary' : 'text-white/60'}">${escapeHtml(g.l)}</button>`).join('')}
  </div>`;
  rentalGamesWrap.querySelectorAll('[data-rgame]').forEach(b => b.onclick = () => {
    playSfx('gameSwitch'); // FIX: ganti game rental (FF/ML) dulu bisu, sekarang bunyi kayak tombol game FF/ML di tab Stok.
    curRentalGame = b.dataset.rgame;
    curRentalTag = 'ALL_READY';
    activeRentalSgFilters.clear(); // kategori SG rental cuma relevan buat game yang lagi aktif
    renderRentalGames(); renderRentalTags(); renderRental();
  });
  const activeRentalBtn = rentalGamesWrap.querySelector('.rental-game.primary');
  if (activeRentalBtn) requestAnimationFrame(() => segMoveIndicator(rentalGamesWrap, activeRentalBtn, '#a855f7'));
}
function renderRentalTags() {
  if (!rentalTagsWrap) return;
  const tags = getRentalTags(curRentalGame);
  const chips = [
    { tag: 'ALL_READY', label: `${ICON_CHECK_GLASS}Semua`, danger: false },
    ...tags.map(t => ({ tag: t.v, label: `${ICON_CHECK_GLASS}${escapeHtml(t.l)}`, danger: false }))
  ];
  const lastAlone = chips.length % 3 === 1;
  rentalTagsWrap.innerHTML = `<div class="grid grid-cols-3 gap-2">
    ${chips.map((c, i) => {
      const centerLast = lastAlone && i === chips.length - 1;
      const activeCls = curRentalTag === c.tag ? 'active' : '';
      return `<button data-rtag="${c.tag}" class="chip anim-in ${activeCls} inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold${centerLast ? ' col-span-3 justify-self-center' : ''}">${c.label}</button>`;
    }).join('')}
  </div>`;
  rentalTagsWrap.querySelectorAll('[data-rtag]').forEach(b => b.onclick = () => { playSfx('filterSelect'); curRentalTag = b.dataset.rtag; renderRentalTags(); renderRental(); }); // FIX: ganti chip kategori harga rental (6k/jam, 10k/jam, dst) dulu bisu, sekarang bunyi sama kayak chip filter di tab Stok.
  renderRentalSgFilter();
}
// Filter tambahan (multi-select, AND/irisan -- pilih 2 kategori, yang muncul cuma yang punya
// DUA-DUANYA bareng, samain kayak Kategori SG punya Stok FF) berdasarkan Kategori SG Rental --
// independen dari
// curRentalTag, jadi bisa dikombinasikan bareng (mis. kategori "PREMIUM" + tag "10K/Jam").
let activeRentalSgFilters = new Set();
function renderRentalSgFilter() {
  const wrap = document.getElementById('rental-sg-wrap');
  if (!wrap) return;
  const cats = getRentalSgCategories();
  if (!isRentalSgCategoryEnabled() || !cats.length) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = `<div class="flex flex-wrap justify-center gap-1.5">${cats.map(cat => {
    const active = activeRentalSgFilters.has(cat);
    return `<button type="button" data-rsg="${escapeHtml(cat)}" class="chip anim-in ${active ? 'active' : ''} rounded-full px-2.5 py-1 text-[11px] font-semibold">${escapeHtml(cat)}</button>`;
  }).join('')}</div>`;
  wrap.querySelectorAll('[data-rsg]').forEach(b => b.onclick = () => {
    playSfx('filterSelect');
    const cat = b.dataset.rsg;
    if (activeRentalSgFilters.has(cat)) activeRentalSgFilters.delete(cat); else activeRentalSgFilters.add(cat);
    renderRentalSgFilter();
    renderRental();
  });
}

/* Indikator geser buat segmented toggle (FF/ML, game rental, dst). Elemen .seg-indicator
   dibuat/dipindah via JS pakai translateX + width, biar transisinya "meluncur" ke tombol
   yang lagi aktif, bukan cuma ganti warna instan. Aman dipanggil berkali-kali walau wrap-nya
   baru di-render ulang (innerHTML diganti) karena bakal bikin ulang elemen indikatornya. */
function segMoveIndicator(wrap, btn, color) {
  if (!wrap || !btn) return;
  let ind = wrap.querySelector('.seg-indicator');
  if (!ind) {
    ind = document.createElement('div');
    ind.className = 'seg-indicator';
    wrap.insertBefore(ind, wrap.firstChild);
  }
  const wrapRect = wrap.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  ind.style.width = btnRect.width + 'px';
  ind.style.transform = `translateX(${btnRect.left - wrapRect.left}px)`;
  if (color) ind.style.background = color;
}
// Debounce: resize event bisa nembak puluhan kali pas jendela lagi ditarik-tarik/rotate HP --
// getBoundingClientRect() di segMoveIndicator itu forced layout read, jadi ditunda dikit
// (100ms) dan cuma dijalanin SEKALI abis resize-nya beneran berhenti, bukan tiap event.
let segIndicatorResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(segIndicatorResizeTimer);
  segIndicatorResizeTimer = setTimeout(() => {
    const activeGameBtn = document.querySelector('.game.primary, .game.primary-pink');
    if (activeGameBtn) segMoveIndicator(document.getElementById('game-toggle-wrap'), activeGameBtn, isPinkGame(curGame) ? '#ec4899' : '#a855f7');
    const activeRentalBtn = rentalGamesWrap && rentalGamesWrap.querySelector('.rental-game.primary');
    if (activeRentalBtn) segMoveIndicator(rentalGamesWrap, activeRentalBtn, '#a855f7');
  }, 100);
});

document.querySelectorAll('.game').forEach(b => b.onclick = () => {
  playSfx('gameSwitch');
  curGame = b.dataset.game; curTag = getDefaultTag(curGame); tagUserSelected = false;
  if (curGame !== 'FF') { activeSgFilters.clear(); sgCategoryPanelOpen = false; } // kategori SG cuma milik FF, gak relevan lagi pas pindah ke ML
  document.querySelectorAll('.game').forEach(x => { x.classList.remove('primary', 'primary-pink'); x.classList.add('text-white/60'); });
  b.classList.add(isPinkGame(curGame) ? 'primary-pink' : 'primary'); b.classList.remove('text-white/60');
  segMoveIndicator(document.getElementById('game-toggle-wrap'), b, isPinkGame(curGame) ? '#ec4899' : '#a855f7');
  renderTags(); renderSortWrap(); renderStok(); updateFooterLogo();
});
requestAnimationFrame(() => {
  const initialActive = document.querySelector('#game-toggle-wrap .game.primary, #game-toggle-wrap .game.primary-pink');
  if (initialActive) segMoveIndicator(document.getElementById('game-toggle-wrap'), initialActive, isPinkGame(curGame) ? '#ec4899' : '#a855f7');
});
/* Logo di banner footer ganti sendiri: ungu pas lagi liat tab Free Fire, pink pas lagi liat
   tab Mobile Legends -- biar nyambung sama warna yang lagi ditonton. */
function updateFooterLogo() {
  // Banner crown (elemen #footer-bg-purple/pink/-light) udah dihapus dari HTML (lihat komentar
  // di deket <footer>), jadi bagian yang dulu toggle elemen-elemen itu dihapus juga -- sebelumnya
  // 4 getElementById itu SELALU null (elemennya gak ada), jadi gak ngapa-ngapain, cuma nambah
  // kerjaan sia-sia tiap fungsi ini dipanggil. Yang masih relevan cuma toggle class .theme-pink
  // di footer buat ganti skema warna sesuai game yang lagi dibuka.
  const footer = document.getElementById('official-contact-footer');
  if (footer) footer.classList.toggle('theme-pink', isPinkGame(curGame));
}

/* ---------------- Slides ---------------- */
function buildSlides(post) {
  const slides = [];
  if (post.slide1) slides.push({ type: 'single', img: post.slide1 });
  const imgs = post.slide2Images || [];
  if (post.fullspek) {
    imgs.forEach(im => slides.push({ type: 'single', img: im }));
  } else {
    for (let i = 0; i < imgs.length; i += 3) slides.push({ type: 'rows', imgs: imgs.slice(i, i + 3) });
  }
  return slides;
}
// FITUR: download foto langsung (bukan .zip) -- fetch gambarnya jadi Blob dulu baru dipicu
// sebagai <a download>, ini caranya biar browser nyimpen file GAMBAR ASLI ke folder
// Download/galeri HP (bukan cuma buka tab baru/preview doang kayak kalau href-nya link
// langsung ke URL Supabase).
async function downloadImageDirect(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch (e) { return false; }
}
function imgExtFromUrl(url) {
  return ((url.split('.').pop() || 'jpg').split('?')[0].slice(0, 4)) || 'jpg';
}
async function downloadPostPoster(postId, btnEl) {
  const post = posts.find(p => p.id === postId);
  if (!post || !post.slide1) { showToast('Postingan ini gak ada foto poster.'); return; }
  playSfx('tap');
  if (btnEl) btnEl.disabled = true;
  const ok = await downloadImageDirect(post.slide1, slugify((post.kode || post.title || 'stok') + '-poster') + '.' + imgExtFromUrl(post.slide1));
  if (btnEl) btnEl.disabled = false;
  showToast(ok ? 'Poster berhasil di-download.' : 'Gagal download poster, coba lagi.');
}
async function downloadPostAllPhotos(postId, btnEl) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const items = [];
  if (post.slide1) items.push({ url: post.slide1, name: 'poster' });
  (post.slide2Images || []).forEach((u, i) => items.push({ url: u, name: 'fullspek-' + String(i + 1).padStart(2, '0') }));
  if (!items.length) { showToast('Postingan ini belum ada fotonya.'); return; }
  playSfx('tap');
  const origLabel = btnEl ? btnEl.innerHTML : '';
  if (btnEl) btnEl.disabled = true;
  let done = 0, failed = 0;
  // Donlot SATU-SATU berurutan (bukan sekaligus bareng) sengaja pakai jeda dikit antar file --
  // kalau semua file dipicu <a download> BARENGAN dalam sepersekian detik, browser (terutama di
  // HP) sering nganggep itu "flood download" & langsung BLOKIR sisanya/minta izin manual per
  // file, jadi malah kacau. Jeda ~350ms bikin tiap file keanggep aksi terpisah yang wajar.
  for (let i = 0; i < items.length; i++) {
    if (btnEl) btnEl.textContent = `${done}/${items.length}`;
    const ok = await downloadImageDirect(items[i].url, slugify((post.kode || post.title || 'stok') + '-' + items[i].name) + '.' + imgExtFromUrl(items[i].url));
    if (!ok) failed++;
    done++;
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 350));
  }
  if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origLabel; }
  showToast(failed ? `Selesai, tapi ${failed} dari ${items.length} foto gagal.` : `Semua ${items.length} foto berhasil di-download.`);
}
function renderSlideshow(post, big, eager) {
  const slides = buildSlides(post);
  const uid = 'sl_' + post.id + (big ? '_big' : '');
  const maxW = big ? '100%' : '220px';
  const ratio = post.type === 'rental' ? '1536/709' : '4/5';
  if (!slides.length) {
    return `<div class="flex items-center justify-center rounded-lg card text-xs text-white/40" style="aspect-ratio:${ratio};max-width:${maxW}">Belum ada foto</div>`;
  }
  // Lebar & kualitas target beda-beda tergantung konteks. BUG YANG DIPERBAIKI: sebelumnya
  // foto di halaman DETAIL (big=true, yg bisa di-zoom/cubit) cuma diminta dalam 900px/kualitas
  // 75 -- padahal fotonya sendiri udah HD, tapi begitu di-zoom ya keliatan blur/pecah krn
  // resolusi yg diminta ke server emang sengaja dikecilin segitu. Sekarang detail view dinaikin
  // jauh (2000px/92) biar beneran HD pas di-zoom, sesuai yang diminta. Kartu grid (bukan detail)
  // tetap dikecilin buat performa scroll (itu emang wajar & gak butuh setajam detail), tapi
  // kualitasnya ikut dinaikin dikit biar gak keliatan pecah juga. Postingan SOLD OUT tetap
  // dikecilin lebih jauh dari yang aktif (arsip, prioritas performa scroll), tapi gak
  // se-ekstrem sebelumnya (480/40) biar tetap layak dilihat kalau di-klik.
  const singleW = big ? (post.soldOut ? 1600 : 2000) : (post.soldOut ? 300 : 640);
  const singleQ = big ? (post.soldOut ? 85 : 92) : (post.soldOut ? 50 : 82);
  // Baris 3 foto: di halaman DETAIL (big) dulu ikut ukuran kartu (460px/78) -> pecah saat di-zoom. Sekarang HD juga (tetap kecil di kartu grid).
  const rowW = big ? (post.soldOut ? 900 : 1000) : (post.soldOut ? 260 : 460);
  const rowQ = big ? (post.soldOut ? 70 : 85) : (post.soldOut ? 45 : 78);
  const slidesHtml = slides.map((s, si) => {
    const finalOpacity = post.soldOut ? '0.5' : '1';
    // Foto pertama dari postingan yang LANGSUNG dibuka (bukan tetangga hasil scroll) dimuat
    // eager + fetchpriority=high, jadi browser gak nunda-nunda ini kayak foto lain yang masih
    // di luar layar -- ini yang bikin foto detail nongol cepet begitu modal kebuka, bukan nunggu.
    const isFirstEager = eager && si === 0;
    const loadAttrs = isFirstEager ? 'loading="eager" decoding="async" fetchpriority="high"' : 'loading="lazy" decoding="async"';
    if (s.type === 'single') return `<div class="h-full w-full flex-shrink-0"><img src="${supaThumb(s.img, singleW, singleQ)}" ${loadAttrs} onload="this.style.opacity='${finalOpacity}'" onerror="handleImgError(this)" class="img-fade h-full w-full object-cover" /></div>`;
    return `<div class="h-full w-full flex-shrink-0"><div class="row3-wrap">${s.imgs.map(im => `<div><img src="${supaThumb(im, rowW, rowQ)}" loading="lazy" decoding="async" onload="this.style.opacity='${finalOpacity}'" onerror="handleImgError(this)" class="img-fade h-full w-full object-cover" /></div>`).join('')}</div></div>`;
  }).join('');
  const soldOverlaySlideshow = post.soldOut ? `
    <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold sold-overlay-badge badge-pop shadow-lg"><span class="inline-flex items-center justify-center flex-shrink-0" style="width:14px;height:14px;border-radius:9999px;background:rgba(255,255,255,.28)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:9px;height:9px;display:block"><path d="M18 6 6 18M6 6l12 12"/></svg></span>SOLD OUT</span>
    </div>` : '';
  const dotsInner = slides.length > 1 ? (big && typeof tkDotsHtml === 'function' ? tkDotsHtml(uid, slides.length, 0) : dotsHtml(uid, slides.length, 0)) : '';
  const zoomHintText = big ? 'Ketuk 2x untuk zoom' : '';
  const wishlistBtn = big ? wishlistBtnHtml(post, 'lg') : '';
  // Di modal detail (big=true), gaya TikTok: dots + hint zoom ditumpuk jadi satu pil kecil
  // yang nempel DI ATAS gambar (overlay), bukan makan tempat vertikal di bawah gambar.
  // Ini yang bikin caption/harga/tombol Bagikan-Suka/"Lihat stok lainnya" di bawahnya
  // otomatis naik ngisi space kosong, jadi lebih keliatan di layar HP tanpa scroll.
  let dots = '';
  let zoomHint = '';
  let topOverlay = '';
  if (big) {
    if (dotsInner || zoomHintText) {
      topOverlay = `
      <div class="slideshow-topbar pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl px-3.5 py-1.5">
        ${dotsInner}
        ${zoomHintText ? `<p class="slideshow-topbar-hint"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>${zoomHintText}</p>` : ''}
      </div>`;
    }
  } else {
    dots = dotsInner ? `<div class="mt-2 flex justify-center">${dotsInner}</div>` : '';
  }
  // FITUR: tombol download foto -- LANGSUNG nempel di halaman foto stok (bukan lewat menu Fitur
  // terpisah lagi), khusus admin, khusus tipe Stok, & cuma di modal detail (big=true) biar gak
  // numpuk-numpuk kartu grid. Ada 2 pilihan: "Poster" doang, atau "Semua" foto (poster+fullspek)
  // -- keduanya donlot LANGSUNG per-file ke galeri/folder Download HP (BUKAN digabung .zip lagi).
  const photoCountForDl = (post.slide1 ? 1 : 0) + (post.slide2Images ? post.slide2Images.length : 0);
  const downloadCtrl = (big && isAdmin && post.type === 'stok' && photoCountForDl) ? `
    <div class="mt-2 flex items-center justify-center gap-2">
      ${post.slide1 ? `<button type="button" onclick="downloadPostPoster('${post.id}', this)" class="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[10.5px] font-semibold text-white/80 active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Poster</button>` : ''}
      <button type="button" onclick="downloadPostAllPhotos('${post.id}', this)" class="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[10.5px] font-semibold text-white/80 active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Semua (${photoCountForDl})</button>
    </div>` : '';
  return `
    <div style="max-width:${maxW}" class="mx-auto">
      <div class="relative overflow-hidden rounded-lg slide-track-wrap" id="${uid}_wrap" style="aspect-ratio:${ratio}">
        <div id="${uid}" data-index="0" data-count="${slides.length}" class="flex h-full w-full slide-track"
          ${dragAttrs(uid)}
          style="touch-action:pan-y">${slidesHtml}</div>
        ${soldOverlaySlideshow}
        ${topOverlay}
        ${wishlistBtn}
      </div>
      ${dots}
      ${zoomHint}
      ${downloadCtrl}
    </div>`;
}
// Ambil koordinat X dari event apapun (touch, mouse, atau pointer) secara konsisten.
// Pasang SALAH SATU (touch atau mouse), jangan dua-duanya di elemen yang sama.
// HP suka nembak "mouse event palsu" beberapa saat setelah sentuhan asli buat kompatibilitas
// situs lama, dan itu bisa nabrak state drag yang lagi jalan kalau touch+mouse dipasang bareng.
const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
function dragAttrs(uid) {
  return IS_TOUCH_DEVICE
    ? `ontouchstart="slideTouchStart(event,'${uid}')" ontouchmove="slideTouchMove(event,'${uid}')" ontouchend="slideTouchEnd(event,'${uid}')" ontouchcancel="slideTouchEnd(event,'${uid}')"`
    : `onmousedown="slideTouchStart(event,'${uid}')" onmousemove="slideTouchMove(event,'${uid}')" onmouseup="slideTouchEnd(event,'${uid}')" onmouseleave="slideTouchEnd(event,'${uid}')"`;
}
function getEventX(e) {
  if (e.touches && e.touches.length) return e.touches[0].clientX;
  if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
  return e.clientX;
}
function getEventY(e) {
  if (e.touches && e.touches.length) return e.touches[0].clientY;
  if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientY;
  return e.clientY;
}

/* ---------------- Zoom gambar di slideshow (pinch & double-tap), khusus modal detail ---------------- */
const zoomState = {};
function getZoomState(uid) { if (!zoomState[uid]) zoomState[uid] = { scale: 1, tx: 0, ty: 0 }; return zoomState[uid]; }
function getActiveSlideImg(uid) {
  const track = document.getElementById(uid);
  if (!track) return null;
  const idx = parseInt(track.dataset.index, 10) || 0;
  const slide = track.children[idx];
  if (!slide) return null;
  // Slide tipe "3 gambar sejajar" di-zoom sebagai satu grup biar konsisten.
  return slide.querySelector('.row3-wrap') || slide.querySelector('img');
}
function applyZoomTransform(uid) {
  const img = getActiveSlideImg(uid);
  const st = getZoomState(uid);
  if (img) img.style.transform = `scale(${st.scale}) translate(${st.tx / st.scale}px, ${st.ty / st.scale}px)`;
}
function clampPan(uid) {
  const st = getZoomState(uid);
  const img = getActiveSlideImg(uid);
  if (!img) return;
  const rect = img.parentElement.getBoundingClientRect();
  const maxX = (rect.width * (st.scale - 1)) / 2;
  const maxY = (rect.height * (st.scale - 1)) / 2;
  st.tx = Math.max(-maxX, Math.min(maxX, st.tx));
  st.ty = Math.max(-maxY, Math.min(maxY, st.ty));
}
function resetZoom(uid, animate) {
  const st = getZoomState(uid);
  st.scale = 1; st.tx = 0; st.ty = 0;
  const img = getActiveSlideImg(uid);
  const track = document.getElementById(uid);
  if (img) { img.style.transition = animate ? 'transform .2s ease' : 'none'; img.style.transform = ''; }
  if (track) { track.dataset.zoomed = '0'; track.style.touchAction = 'pan-y'; }
}
function toggleZoomAt(uid, clientX, clientY) {
  const st = getZoomState(uid);
  const img = getActiveSlideImg(uid);
  const track = document.getElementById(uid);
  if (!img || !track) return;
  if (st.scale > 1.05) { resetZoom(uid, true); return; }
  const rect = img.getBoundingClientRect();
  const offsetX = clientX - (rect.left + rect.width / 2);
  const offsetY = clientY - (rect.top + rect.height / 2);
  st.scale = 2.2;
  st.tx = -offsetX * (st.scale - 1) / st.scale;
  st.ty = -offsetY * (st.scale - 1) / st.scale;
  clampPan(uid);
  img.style.transition = 'transform .2s ease';
  applyZoomTransform(uid);
  track.dataset.zoomed = '1';
  track.style.touchAction = 'none';
}

// Banner promo & lightbox-nya sengaja gak boleh di-zoom (pinch/ketuk 2x) -- cuma boleh diklik & digeser.
const NO_ZOOM_UIDS = ['promo_banner'];
function slideTouchStart(e, uid) {
  const el = document.getElementById(uid);
  if (!el) return;
  const st = getZoomState(uid);
  const zoomDisabled = NO_ZOOM_UIDS.includes(uid);

  // Dua jari nyentuh = mulai pinch-zoom.
  if (!zoomDisabled && e.touches && e.touches.length === 2) {
    el.dataset.pinching = '1';
    el.dataset.dragging = '0';
    const [t1, t2] = e.touches;
    el.dataset.pinchStartDist = String(Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1);
    el.dataset.pinchStartScale = String(st.scale);
    el.dataset.pinchStartTx = String(st.tx);
    el.dataset.pinchStartTy = String(st.ty);
    el.dataset.panning = '0';
    // jari pertama sempat menggeser track -> kembalikan ke posisi slide, biar tidak bergeser saat pinch
    el.style.transition = 'none';
    el.style.transform = `translateX(-${(parseInt(el.dataset.index, 10) || 0) * 100}%)`;
    const img = getActiveSlideImg(uid);
    if (img) img.style.transition = 'none';
    return;
  }

  // Lagi zoom-in -> satu jari dipakai buat geser (pan) posisi gambar, bukan pindah slide.
  if (!zoomDisabled && st.scale > 1.05) {
    el.dataset.panning = '1';
    el.dataset.panStartX = String(getEventX(e));
    el.dataset.panStartY = String(getEventY(e));
    el.dataset.panStartTx = String(st.tx);
    el.dataset.panStartTy = String(st.ty);
    const imgPan = getActiveSlideImg(uid);
    if (imgPan) imgPan.style.transition = 'none';
    return;
  }

  const x = getEventX(e), y = getEventY(e);
  el.dataset.dragStartX = x;
  el.dataset.dragStartY = y;
  el.dataset.dragX = x;
  el.dataset.dragging = '1';
  el.style.transition = 'none';
  // Lebar track diukur SEKALI di sini (touchstart), bukan di tiap event touchmove.
  // getBoundingClientRect() motret ulang layout tiap dipanggil -- kalau dipanggil tiap
  // gerakan jari (bisa puluhan kali/detik), itu yang bikin geser foto kerasa berat/nge-lag.
  el.dataset.dragWidth = String(el.getBoundingClientRect().width || 1);
  // Buat deteksi "flick" (tarikan cepat): dicatat waktu+posisi tiap gerakan, dipakai pas
  // lepas jari buat ngitung kecepatan -- flick cepat bisa pindah slide walau jaraknya
  // belum jauh, kayak swipe carousel yang enak dipakai di app-app besar.
  el.dataset.moveT = String(Date.now());
  el.dataset.moveX = x;
  el.dataset.velocity = '0';
}
function slideTouchMove(e, uid) {
  const el = document.getElementById(uid);
  if (!el) return;

  if (el.dataset.pinching === '1' && e.touches && e.touches.length === 2) {
    if (e.cancelable) e.preventDefault();
    const st = getZoomState(uid);
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const startDist = parseFloat(el.dataset.pinchStartDist || '1') || 1;
    st.scale = Math.max(1, Math.min(4, parseFloat(el.dataset.pinchStartScale || '1') * (dist / startDist)));
    st.tx = parseFloat(el.dataset.pinchStartTx || '0');
    st.ty = parseFloat(el.dataset.pinchStartTy || '0');
    clampPan(uid);
    applyZoomTransform(uid);
    return;
  }

  if (el.dataset.panning === '1') {
    if (e.cancelable) e.preventDefault();
    const st = getZoomState(uid);
    const x = getEventX(e), y = getEventY(e);
    st.tx = parseFloat(el.dataset.panStartTx || '0') + (x - parseFloat(el.dataset.panStartX || '0'));
    st.ty = parseFloat(el.dataset.panStartTy || '0') + (y - parseFloat(el.dataset.panStartY || '0'));
    clampPan(uid);
    applyZoomTransform(uid);
    return;
  }

  if (el.dataset.dragging !== '1') return;
  // Cegah halaman ikut ke-scroll horizontal pas lagi geser slide.
  if (e.cancelable) e.preventDefault();
  const startX = parseFloat(el.dataset.dragX || '0');
  const nowX = getEventX(e);
  const deltaPx = nowX - startX;
  const idx = parseInt(el.dataset.index, 10);
  const count = parseInt(el.dataset.count, 10) || 1;
  const width = parseFloat(el.dataset.dragWidth || '0') || el.getBoundingClientRect().width || 1;
  // Rubber-band: kalau udah di slide paling awal/akhir dan masih ditarik ke arah luar,
  // gerakannya diperlambat (dibagi 2.8) biar kerasa "mentok karet", bukan geser bebas
  // nunjukkin area kosong -- sama kayak swipe carousel di app-app gede.
  const atStartEdge = idx <= 0 && deltaPx > 0;
  const atEndEdge = idx >= count - 1 && deltaPx < 0;
  const resistedDeltaPx = (atStartEdge || atEndEdge) ? deltaPx / 2.8 : deltaPx;
  const deltaPct = (resistedDeltaPx / width) * 100;
  el.style.transform = `translateX(calc(-${idx * 100}% + ${deltaPct}%))`;
  // Update penanda waktu+posisi buat ngitung kecepatan tarikan (velocity) pas jari lepas.
  const now = Date.now();
  const lastT = parseFloat(el.dataset.moveT || String(now));
  const dt = now - lastT;
  if (dt > 0) el.dataset.velocity = String((nowX - parseFloat(el.dataset.moveX || String(nowX))) / dt);
  el.dataset.moveT = String(now);
  el.dataset.moveX = String(nowX);
}
function slideTouchEnd(e, uid) {
  const el = document.getElementById(uid);
  if (!el) return;

  if (el.dataset.pinching === '1') {
    el.dataset.pinching = '0';
    const st = getZoomState(uid);
    if (st.scale <= 1.05) {
      resetZoom(uid, true);
    } else {
      el.dataset.zoomed = '1';
      el.style.touchAction = 'none';
    }
    el.style.transition = '';
    return;
  }
  if (el.dataset.panning === '1') { el.dataset.panning = '0'; return; }

  if (el.dataset.dragging !== '1') return;
  el.dataset.dragging = '0';
  el.style.transition = '';
  const startX = parseFloat(el.dataset.dragX || '0');
  const startY0 = parseFloat(el.dataset.dragStartY || '0');
  const endX = getEventX(e);
  const endY = getEventY(e);
  const zoomDisabled = NO_ZOOM_UIDS.includes(uid);
  const totalMove = Math.hypot(endX - parseFloat(el.dataset.dragStartX || String(endX)), endY - startY0);

  // Gerakannya beneran kecil (tap diam, bukan swipe) -> cek apakah ini tap KEDUA dari
  // double-tap (buat toggle zoom). Sengaja diputuskan DI SINI (pas sentuhan berakhir &
  // total gerakannya udah pasti kecil), bukan di awal sentuhan -- supaya awal swipe yang
  // baru gak pernah kesalah-baca jadi double-tap cuma karena posisinya deket sama swipe
  // sebelumnya (ini yang bikin di iOS suka cuma bisa geser sekali, abis itu macet).
  if (!zoomDisabled && totalMove < 12) {
    const now = Date.now();
    const lastT = parseFloat(el.dataset.lastTapTime || '0');
    const lastX = parseFloat(el.dataset.lastTapX || '0');
    const lastY = parseFloat(el.dataset.lastTapY || '0');
    if (lastT && (now - lastT) < 320 && Math.hypot(endX - lastX, endY - lastY) < 30) {
      el.dataset.lastTapTime = '0';
      toggleZoomAt(uid, endX, endY);
      return;
    }
    el.dataset.lastTapTime = String(now);
    el.dataset.lastTapX = String(endX);
    el.dataset.lastTapY = String(endY);
    return;
  }
  el.dataset.lastTapTime = '0';

  const delta = endX - startX;
  const threshold = 35;
  // Flick cepat (tarikan pendek tapi laju, misal >.55px/ms) tetap dianggap swipe walau
  // jaraknya belum nyampe threshold jarak -- biar geser cepat kerasa responsif, gak perlu
  // narik jauh-jauh buat pindah slide.
  const velocity = parseFloat(el.dataset.velocity || '0');
  const isFastFlick = Math.abs(velocity) > 0.55 && Math.abs(delta) > 8;
  if (delta > threshold || (isFastFlick && velocity > 0)) moveSlide(uid, -1);
  else if (delta < -threshold || (isFastFlick && velocity < 0)) moveSlide(uid, 1);
  else moveSlide(uid, 0); // balik ke posisi semula kalau geser gak cukup jauh
}
/* Render titik indikator slide ala iOS: maksimal 5 titik kelihatan, titik di ujung
   mengecil buat nandain masih ada slide lagi. Elemennya dibikin sekali dan gak pernah
   di-recreate lagi — pas geser, cuma transform track + class titik yang diubah, jadi
   transisinya beneran keanimasi mulus (gak "loncat") di slide manapun. */
const DOT_SLOT_PX = 10;
function dotsWindow(count, idx) {
  const maxDots = 5;
  let start = 0;
  if (count > maxDots) {
    if (idx <= 2) start = 0;
    else if (idx >= count - 3) start = count - maxDots;
    else start = idx - 2;
  }
  return { start, end: Math.min(start + maxDots, count), maxDots };
}
function dotClass(count, idx, i) {
  const { start, end, maxDots } = dotsWindow(count, idx);
  const isEdgeMore = count > maxDots && ((i === start && start > 0) || (i === end - 1 && end < count));
  return 'dots-dot rounded-full ' + (i === idx ? 'h-2 w-2 bg-purple-400' : isEdgeMore ? 'h-1 w-1 bg-white/20' : 'h-1.5 w-1.5 bg-white/30');
}
function dotsHtml(uid, count, idx) {
  if (count <= 1) return '';
  let slots = '';
  for (let i = 0; i < count; i++) {
    slots += `<div class="dots-slot"><span class="${dotClass(count, idx, i)}"></span></div>`;
  }
  const visible = Math.min(count, 5);
  return `<div class="dots-wrap mx-auto" id="${uid}_dots" style="width:${DOT_SLOT_PX * visible}px">
    <div class="dots-track" id="${uid}_dots_track">${slots}</div>
  </div>`;
}
function updateDotsTrack(uid, count, idx) {
  const track = document.getElementById(uid + '_dots_track');
  if (!track) return;
  const { start } = dotsWindow(count, idx);
  track.style.transform = `translateX(-${start * DOT_SLOT_PX}px)`;
  const slots = track.children;
  for (let i = 0; i < count; i++) {
    const dot = slots[i] && slots[i].querySelector('.dots-dot');
    if (dot) dot.className = dotClass(count, idx, i);
  }
}
function moveSlide(uid, dir) {
  const el = document.getElementById(uid);
  if (!el) return;
  // Efek suara "tik" cuma buat geseran BENERAN (dir -1/1, hasil swipe/tap panah user), bukan
  // buat balik ke posisi semula (dir 0) atau buat banner promo yang geser otomatis sendiri
  // tiap beberapa detik (bakal berisik/ganggu kalau ikut bunyi).
  const atEdge = uid.indexOf('sl_') === 0 && ((dir < 0 && (parseInt(el.dataset.index, 10) || 0) <= 0) || (dir > 0 && (parseInt(el.dataset.index, 10) || 0) >= (parseInt(el.dataset.count, 10) || 1) - 1));
  if (dir !== 0 && uid !== 'promo_banner' && !atEdge) playSfx('swipe');
  if (el.dataset.zoomed === '1') resetZoom(uid, false);
  const count = parseInt(el.dataset.count, 10);
  let idx = parseInt(el.dataset.index, 10) + dir;
  const isPostSlide = uid.indexOf('sl_') === 0;
  if (isPostSlide) {
    // foto postingan: mentok di ujung, tidak muter ke awal/akhir
    if (idx < 0) idx = 0;
    if (idx >= count) idx = count - 1;
  } else {
    if (idx < 0) idx = count - 1;
    if (idx >= count) idx = 0;
  }
  el.dataset.index = idx;
  el.style.transform = `translateX(-${idx * 100}%)`;
  if (isPostSlide && typeof tkSlideChanged === 'function') tkSlideChanged(uid, count, idx);
  else updateDotsTrack(uid, count, idx);
}

