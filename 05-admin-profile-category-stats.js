/* ---------------- Edit profile ---------------- */
let pfLogoData = null;
let pfCardGlowColor = ''; // '' = default kuning keemasan bawaan; diisi hex kalau admin ganti warnanya
document.getElementById('menu-edit-profile').onclick = () => {
  closeFiturMenu();
  document.getElementById('pf-name').value = profile.name;
  document.getElementById('pf-subtitle').value = profile.subtitle;
  document.getElementById('pf-subtitle2').value = profile.subtitle2;
  document.getElementById('pf-verify-label').value = profile.verifyLabel;
  document.getElementById('pf-verify-text').value = profile.verifyText;
  document.getElementById('pf-verify-url').value = profile.verifyUrl;
  pfLogoData = profile.logo;
  document.getElementById('pf-logo-preview').src = profile.logo;
  document.getElementById('pf-logo-input').value = '';
  document.getElementById('pf-wa-jual').value = profile.waJual;
  document.getElementById('pf-wa-rekber').value = profile.waRekber;
  document.getElementById('pf-ch-stok').value = profile.chStok;
  document.getElementById('pf-ch-rental').value = profile.chRental;
  document.getElementById('pf-topup-url').value = profile.topupUrl;
  document.getElementById('pf-testimoni-url').value = profile.testimoniUrl || defaultProfile.testimoniUrl;
  document.getElementById('pf-rental-notice').value = (profile.rentalNotice !== undefined ? profile.rentalNotice : defaultProfile.rentalNotice);
  const curGridCols = { ...defaultProfile.gridCols, ...(profile.gridCols || {}) };
  document.getElementById('pf-grid-cols-stok').value = String(curGridCols.stok);
  document.getElementById('pf-grid-cols-rental').value = String(curGridCols.rental);
  pfCardGlowColor = profile.cardPressGradientColor || '';
  document.getElementById('pf-card-glow-color').value = pfCardGlowColor || '#facc15';
  const pfNavLabels = { ...defaultProfile.navLabels, ...(profile.navLabels || {}) };
  document.getElementById('pf-label-wa-jual').value = pfNavLabels.waJual;
  document.getElementById('pf-label-wa-rekber').value = pfNavLabels.waRekber;
  document.getElementById('pf-label-ch-stok').value = pfNavLabels.chStok;
  document.getElementById('pf-label-ch-rental').value = pfNavLabels.chRental;
  document.getElementById('pf-label-topup').value = pfNavLabels.topup;
  document.getElementById('pf-label-testimoni').value = pfNavLabels.testimoni;
  openModal('modal-profile');
};
document.getElementById('pf-logo-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('pf-logo-preview');
  try {
    const compressed = await compressImage(file, 1024, 0.92);   // dulu 500px/0.8: logo/foto profil dibuat HD
    preview.src = compressed; // preview instan pakai versi lokal dulu
    pfLogoData = await uploadImageToStorage(compressed, `profile/logo_${Date.now()}.jpg`);
    preview.src = pfLogoData;
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah foto profil: ${err.message || err.code || 'error tidak diketahui'}`);
  }
};
document.getElementById('pf-card-glow-color').oninput = (e) => {
  pfCardGlowColor = e.target.value;
};
document.getElementById('pf-card-glow-reset').onclick = () => {
  pfCardGlowColor = '';
  document.getElementById('pf-card-glow-color').value = '#facc15';
};
document.getElementById('btn-save-profile').onclick = async () => {
  const newProfile = {
    name: document.getElementById('pf-name').value.trim() || defaultProfile.name,
    subtitle: document.getElementById('pf-subtitle').value.trim(),
    subtitle2: document.getElementById('pf-subtitle2').value.trim(),
    verifyLabel: document.getElementById('pf-verify-label').value.trim(),
    verifyText: document.getElementById('pf-verify-text').value.trim(),
    verifyUrl: document.getElementById('pf-verify-url').value.trim(),
    logo: pfLogoData || profile.logo,
    waJual: document.getElementById('pf-wa-jual').value.trim(),
    waRekber: document.getElementById('pf-wa-rekber').value.trim(),
    chStok: document.getElementById('pf-ch-stok').value.trim(),
    chRental: document.getElementById('pf-ch-rental').value.trim(),
    topupLabel: 'Topup resmi via',
    topupText: 'toukatopup.id',
    topupUrl: document.getElementById('pf-topup-url').value.trim(),
    testimoniUrl: document.getElementById('pf-testimoni-url').value.trim() || defaultProfile.testimoniUrl,
    rentalNotice: document.getElementById('pf-rental-notice').value.replace(/\r\n/g, '\n'),
    gridCols: {
      stok: parseInt(document.getElementById('pf-grid-cols-stok').value, 10) || defaultProfile.gridCols.stok,
      rental: parseInt(document.getElementById('pf-grid-cols-rental').value, 10) || defaultProfile.gridCols.rental
    },
    // Kosong ('') kalau admin pencet "Default" (lihat pf-card-glow-reset) -- berarti balik ke
    // kuning keemasan bawaan CSS, bukan disimpan sebagai hex kosong yang invalid.
    cardPressGradientColor: pfCardGlowColor,
    navLabels: {
      waJual: document.getElementById('pf-label-wa-jual').value.trim() || defaultProfile.navLabels.waJual,
      waRekber: document.getElementById('pf-label-wa-rekber').value.trim() || defaultProfile.navLabels.waRekber,
      chStok: document.getElementById('pf-label-ch-stok').value.trim() || defaultProfile.navLabels.chStok,
      chRental: document.getElementById('pf-label-ch-rental').value.trim() || defaultProfile.navLabels.chRental,
      topup: document.getElementById('pf-label-topup').value.trim() || defaultProfile.navLabels.topup,
      testimoni: document.getElementById('pf-label-testimoni').value.trim() || defaultProfile.navLabels.testimoni
    }
  };
  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  const ok = await saveProfile(newProfile);
  btn.disabled = false; btn.textContent = 'Simpan Profile';
  if (!ok) return;
  await loadProfile();
  closeModal('modal-profile');
  showToast('Profile berhasil disimpan untuk semua orang.');
};

/* ---------------- Edit categories (FF & ML nominal tags, + Rental games & price tags) ---------------- */
let editingFFTags = [];
let editingMLTags = [];
let editingRentalGames = [];
let editingRentalTagsByGame = {};
let curEditingRentalGameV = null;
let editingRentalDurationTypes = [];
let editingFFSgCategories = [];
let editingRentalSgCategories = [];
function renderCatList(list, containerId, onChange) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = list.length ? list.map((t, i) => `
    <div class="flex items-center gap-2">
      <input data-idx="${i}" class="cat-label-input input flex-1 rounded-lg px-3 py-2 text-sm" value="${String(t.l).replace(/"/g, '&quot;')}" placeholder="Nama kategori" />
      <button data-idx="${i}" type="button" class="cat-remove-btn rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-400 hover:bg-red-500/25">✕</button>
    </div>`).join('') : `<p class="text-xs text-white/40">Belum ada kategori, tambah minimal satu.</p>`;
  wrap.querySelectorAll('.cat-label-input').forEach(inp => {
    inp.oninput = () => { list[+inp.dataset.idx].l = inp.value; };
  });
  wrap.querySelectorAll('.cat-remove-btn').forEach(b => {
    b.onclick = () => {
      if (!confirm('Hapus kategori ini? Postingan lama dengan kategori ini tidak akan terhapus, tapi jadi tidak muncul di tab manapun.')) return;
      list.splice(+b.dataset.idx, 1);
      onChange();
    };
  });
}
function renderRentalGameSelect() {
  const sel = document.getElementById('rental-price-game-select');
  if (!sel) return;
  sel.innerHTML = editingRentalGames.map(g => `<option value="${g.v}">${escapeHtml(g.l)}</option>`).join('');
  if (!curEditingRentalGameV || !editingRentalGames.some(g => g.v === curEditingRentalGameV)) {
    curEditingRentalGameV = editingRentalGames[0] ? editingRentalGames[0].v : null;
  }
  if (curEditingRentalGameV) sel.value = curEditingRentalGameV;
  sel.onchange = () => { curEditingRentalGameV = sel.value; renderRentalPriceTagsList(); };
}
function renderRentalPriceTagsList() {
  if (!curEditingRentalGameV) { document.getElementById('cat-list-rental').innerHTML = `<p class="text-xs text-white/40">Tambah game rental dulu di atas.</p>`; return; }
  if (!editingRentalTagsByGame[curEditingRentalGameV]) editingRentalTagsByGame[curEditingRentalGameV] = [];
  renderCatList(editingRentalTagsByGame[curEditingRentalGameV], 'cat-list-rental', renderRentalPriceTagsList);
}
function renderRentalDurationTypesList() {
  const wrap = document.getElementById('cat-list-rental-duration');
  const list = editingRentalDurationTypes;
  wrap.innerHTML = list.length ? list.map((t, i) => `
    <div class="space-y-1.5 rounded-lg border border-white/10 p-2">
      <div class="flex items-center gap-2">
        <input data-idx="${i}" class="dur-label-input input flex-1 rounded-lg px-3 py-2 text-sm" value="${String(t.l).replace(/"/g, '&quot;')}" placeholder="Nama durasi" />
        <button data-idx="${i}" type="button" class="dur-remove-btn rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-400 hover:bg-red-500/25">✕</button>
      </div>
      <input data-idx="${i}" class="dur-badge-input input w-full rounded-lg px-3 py-2 text-xs" value="${String(t.badge || '').replace(/"/g, '&quot;')}" placeholder="Teks badge hijau (misal: Lebih Hemat) -- kosongin kalau gak perlu" />
    </div>`).join('') : `<p class="text-xs text-white/40">Belum ada durasi, tambah minimal satu.</p>`;
  wrap.querySelectorAll('.dur-label-input').forEach(inp => {
    inp.oninput = () => { list[+inp.dataset.idx].l = inp.value; };
  });
  wrap.querySelectorAll('.dur-badge-input').forEach(inp => {
    inp.oninput = () => { list[+inp.dataset.idx].badge = inp.value; };
  });
  wrap.querySelectorAll('.dur-remove-btn').forEach(b => {
    b.onclick = () => {
      if (!confirm('Hapus durasi ini? Postingan lama dengan durasi ini tidak akan terhapus, tapi jadi tidak muncul di form manapun.')) return;
      list.splice(+b.dataset.idx, 1);
      renderRentalDurationTypesList();
    };
  });
}
function renderCategoryLists() {
  renderCatList(editingFFTags, 'cat-list-ff', renderCategoryLists);
  renderCatList(editingMLTags, 'cat-list-ml', renderCategoryLists);
  renderCatList(editingFFSgCategories, 'cat-list-ff-sg', renderCategoryLists);
  renderCatList(editingRentalSgCategories, 'cat-list-rental-sg', renderCategoryLists);
  renderCatList(editingRentalGames, 'cat-list-rental-games', () => {
    editingRentalGames.forEach(g => { if (!editingRentalTagsByGame[g.v]) editingRentalTagsByGame[g.v] = []; });
    renderCategoryLists();
  });
  renderRentalGameSelect();
  renderRentalPriceTagsList();
  renderRentalDurationTypesList();
}
document.getElementById('menu-edit-categories').onclick = () => {
  closeFiturMenu();
  editingFFTags = getFFTags().map(t => ({ v: t.v, l: t.l }));
  editingMLTags = getMLTags().map(t => ({ v: t.v, l: t.l }));
  editingFFSgCategories = getFFSgCategories().map(c => ({ l: c }));
  editingRentalSgCategories = getRentalSgCategories().map(c => ({ l: c }));
  editingRentalGames = getRentalGames().map(g => ({ v: g.v, l: g.l }));
  editingRentalTagsByGame = {};
  editingRentalGames.forEach(g => { editingRentalTagsByGame[g.v] = getRentalTags(g.v).map(t => ({ v: t.v, l: t.l })); });
  curEditingRentalGameV = editingRentalGames[0] ? editingRentalGames[0].v : null;
  editingRentalDurationTypes = getRentalDurationTypes().map(t => ({ v: t.key, l: t.label, waLabel: t.waLabel, note: t.note, badge: t.badge }));
  renderCategoryLists();
  document.getElementById('chip-ff-allready').checked = profile.ffShowAllReady !== undefined ? profile.ffShowAllReady : defaultProfile.ffShowAllReady;
  document.getElementById('chip-ml-allready').checked = profile.mlShowAllReady !== undefined ? profile.mlShowAllReady : defaultProfile.mlShowAllReady;
  document.getElementById('chip-ff-soldout').checked = profile.ffShowSoldOut !== undefined ? profile.ffShowSoldOut : defaultProfile.ffShowSoldOut;
  document.getElementById('chip-ml-soldout').checked = profile.mlShowSoldOut !== undefined ? profile.mlShowSoldOut : defaultProfile.mlShowSoldOut;
  document.getElementById('chip-ff-diskon').checked = profile.ffShowDiskon !== undefined ? profile.ffShowDiskon : defaultProfile.ffShowDiskon;
  document.getElementById('chip-ml-diskon').checked = profile.mlShowDiskon !== undefined ? profile.mlShowDiskon : defaultProfile.mlShowDiskon;
  document.getElementById('chip-ff-sg-enabled').checked = isFFSgCategoryEnabled();
  document.getElementById('chip-rental-sg-enabled').checked = isRentalSgCategoryEnabled();
  openModal('modal-categories');
};
document.getElementById('btn-add-category-ff').onclick = () => {
  const label = prompt('Nama kategori FF baru (contoh: 1JT - 2JT):');
  if (!label || !label.trim()) return;
  editingFFTags.push({ v: 'FF_CUSTOM_' + Date.now(), l: label.trim() });
  renderCategoryLists();
};
document.getElementById('btn-add-category-ml').onclick = () => {
  const label = prompt('Nama kategori ML baru (contoh: Full Skin):');
  if (!label || !label.trim()) return;
  editingMLTags.push({ v: 'ML_CUSTOM_' + Date.now(), l: label.trim() });
  renderCategoryLists();
};
document.getElementById('btn-add-category-ff-sg').onclick = () => {
  const label = prompt('Nama kategori SG baru (contoh: SUPREME):');
  if (!label || !label.trim()) return;
  editingFFSgCategories.push({ l: label.trim().toUpperCase() });
  renderCategoryLists();
};
document.getElementById('btn-add-category-rental-sg').onclick = () => {
  const label = prompt('Nama kategori SG Rental baru (contoh: PREMIUM):');
  if (!label || !label.trim()) return;
  editingRentalSgCategories.push({ l: label.trim().toUpperCase() });
  renderCategoryLists();
};
document.getElementById('btn-add-rental-game').onclick = () => {
  const label = prompt('Nama game rental baru (contoh: Roblox, PUBG Mobile):');
  if (!label || !label.trim()) return;
  const v = 'RENTAL_GAME_' + Date.now();
  editingRentalGames.push({ v, l: label.trim() });
  editingRentalTagsByGame[v] = [];
  curEditingRentalGameV = v;
  renderCategoryLists();
};
document.getElementById('btn-add-rental-duration').onclick = () => {
  const label = prompt('Nama durasi rental baru (contoh: 2 Jam, 3 Jam, Mingguan):');
  if (!label || !label.trim()) return;
  const v = 'DUR_' + Date.now();
  editingRentalDurationTypes.push({ v, l: label.trim().toUpperCase(), waLabel: label.trim().toLowerCase() });
  renderCategoryLists();
};
document.getElementById('btn-add-category-rental').onclick = () => {
  if (!curEditingRentalGameV) { showToast('Tambah game rental dulu sebelum nambah kategori harga.'); return; }
  const label = prompt('Nama kategori harga rental baru (contoh: 20K/Jam):');
  if (!label || !label.trim()) return;
  if (!editingRentalTagsByGame[curEditingRentalGameV]) editingRentalTagsByGame[curEditingRentalGameV] = [];
  editingRentalTagsByGame[curEditingRentalGameV].push({ v: 'RENTAL_CUSTOM_' + Date.now(), l: label.trim() });
  renderRentalPriceTagsList();
};
document.getElementById('btn-save-categories').onclick = async () => {
  const cleanedFF = editingFFTags.filter(t => t.l && t.l.trim() !== '');
  const cleanedML = editingMLTags.filter(t => t.l && t.l.trim() !== '');
  // Kategori SG: cukup daftar string aja (bukan {v,l} kayak tag nominal) -- dedupe juga di sini
  // (case-insensitive) biar admin gak sengaja nyimpen kategori yang isinya sama persis dobel.
  const seenSg = new Set();
  const cleanedFFSg = editingFFSgCategories
    .map(c => (c.l || '').trim())
    .filter(l => {
      if (!l) return false;
      const key = l.toUpperCase();
      if (seenSg.has(key)) return false;
      seenSg.add(key);
      return true;
    });
  const seenRentalSg = new Set();
  const cleanedRentalSg = editingRentalSgCategories
    .map(c => (c.l || '').trim())
    .filter(l => {
      if (!l) return false;
      const key = l.toUpperCase();
      if (seenRentalSg.has(key)) return false;
      seenRentalSg.add(key);
      return true;
    });
  const cleanedRentalGames = editingRentalGames.filter(g => g.l && g.l.trim() !== '');
  if (!cleanedFF.length || !cleanedML.length) { showToast('Minimal harus ada 1 kategori FF dan 1 kategori ML.'); return; }
  if (!cleanedRentalGames.length) { showToast('Minimal harus ada 1 game rental.'); return; }
  const cleanedRentalTagsByGame = {};
  cleanedRentalGames.forEach(g => {
    cleanedRentalTagsByGame[g.v] = (editingRentalTagsByGame[g.v] || []).filter(t => t.l && t.l.trim() !== '');
  });
  const cleanedRentalDurationTypes = editingRentalDurationTypes
    .filter(t => t.l && t.l.trim() !== '')
    .map(t => ({ key: t.v, label: t.l.trim(), waLabel: t.waLabel || t.l.trim().toLowerCase(), note: t.note, badge: (t.badge || '').trim() }));
  if (!cleanedRentalDurationTypes.length) { showToast('Minimal harus ada 1 durasi rental.'); return; }
  const btn = document.getElementById('btn-save-categories');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  const ok = await saveProfile({
    ffTags: cleanedFF,
    mlTags: cleanedML,
    ffSgCategories: cleanedFFSg,
    ffSgCategoryEnabled: document.getElementById('chip-ff-sg-enabled').checked,
    rentalSgCategories: cleanedRentalSg,
    rentalSgCategoryEnabled: document.getElementById('chip-rental-sg-enabled').checked,
    rentalGames: cleanedRentalGames,
    rentalTagsByGame: cleanedRentalTagsByGame,
    rentalDurationTypes: cleanedRentalDurationTypes,
    ffShowAllReady: document.getElementById('chip-ff-allready').checked,
    mlShowAllReady: document.getElementById('chip-ml-allready').checked,
    ffShowSoldOut: document.getElementById('chip-ff-soldout').checked,
    mlShowSoldOut: document.getElementById('chip-ml-soldout').checked,
    ffShowDiskon: document.getElementById('chip-ff-diskon').checked,
    mlShowDiskon: document.getElementById('chip-ml-diskon').checked
  });
  btn.disabled = false; btn.textContent = 'Simpan Kategori';
  if (!ok) return;
  await loadProfile();
  closeModal('modal-categories');
  showToast('Kategori berhasil disimpan untuk semua orang.');
};

/* ---------------- Edit banner (profile promo slides, max 2) ---------------- */
let editingBanners = [];
function renderBannerList() {
  const wrap = document.getElementById('banner-list');
  if (!editingBanners.length) {
    wrap.innerHTML = `<p class="text-xs text-white/40">Belum ada banner. Klik "Tambah Banner" untuk menambahkan.</p>`;
  } else {
    wrap.innerHTML = editingBanners.map((b, i) => `
      <div class="rounded-lg border border-white/10 p-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white/70">Banner ${i + 1}</span>
          <button data-idx="${i}" type="button" class="banner-remove-btn rounded-lg border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/25">✕ Hapus</button>
        </div>
        <div class="mt-2 overflow-hidden rounded-lg" style="aspect-ratio:3/1">
          <img data-preview="${i}" src="${b.img || ''}" class="h-full w-full object-cover ${b.img ? '' : 'hidden'}" />
          <div data-placeholder="${i}" class="flex h-full w-full items-center justify-center text-xs text-white/40 card ${b.img ? 'hidden' : ''}">Belum ada gambar</div>
        </div>
        <input data-idx="${i}" type="file" accept="image/*" class="banner-img-input mt-2 w-full text-xs" />
        <input data-idx="${i}" type="text" value="${(b.link || '').replace(/"/g, '&quot;')}" placeholder="Link tujuan (opsional), mis. https://..." class="banner-link-input input mt-2 w-full rounded-lg px-3 py-2 text-sm" />
      </div>`).join('');
  }
  wrap.querySelectorAll('.banner-remove-btn').forEach(btn => {
    btn.onclick = () => { editingBanners.splice(+btn.dataset.idx, 1); renderBannerList(); };
  });
  wrap.querySelectorAll('.banner-link-input').forEach(inp => {
    inp.oninput = () => { editingBanners[+inp.dataset.idx].link = inp.value.trim(); };
  });
  wrap.querySelectorAll('.banner-img-input').forEach(inp => {
    inp.onchange = async (e) => {
      const idx = +inp.dataset.idx;
      const file = e.target.files[0];
      if (!file) return;
      const prev = wrap.querySelector(`img[data-preview="${idx}"]`);
      const ph = wrap.querySelector(`[data-placeholder="${idx}"]`);
      try {
        const compressed = await fileToDataUrl(file);
        prev.src = compressed; prev.classList.remove('hidden'); ph.classList.add('hidden');
        const url = await uploadImageToStorage(compressed, `banners/banner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
        editingBanners[idx].img = url;
        prev.src = url;
      } catch (err) {
        console.error(err);
        showToast(`Gagal mengunggah gambar banner: ${err.message || err.code || 'error tidak diketahui'}`);
      }
    };
  });
}
document.getElementById('menu-edit-banner').onclick = () => {
  closeFiturMenu();
  editingBanners = getBannerSlides().map(s => ({ img: s.img, link: s.link || '' }));
  renderBannerList();
  openModal('modal-banner');
};

/* ---------------- Instastory: admin (upload/hapus, permanen) ---------------- */
function getStoryImages() { return (profile.storyImages && profile.storyImages.length) ? profile.storyImages : []; }
function renderStoryAdminList() {
  const wrap = document.getElementById('story-admin-list');
  const list = getStoryImages();
  wrap.innerHTML = list.length ? list.map(s => `
    <div class="relative overflow-hidden rounded-lg card" style="aspect-ratio:9/16">
      <img src="${s.url}" class="h-full w-full object-cover" />
      ${s.song ? `<span class="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white" title="Ada lagu">♪</span>` : ''}
      ${s.caption ? `<span class="absolute left-1 ${s.song ? 'top-7' : 'top-1'} flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[9px] font-bold text-white" title="Ada teks">Aa</span>` : ''}
      <span class="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">${storyDurationLabel(s.duration)}</span>
      <button onclick="removeStoryImage('${s.id}')" title="Hapus" class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button>
    </div>`).join('') : `<p class="col-span-3 text-xs text-white/40">Belum ada foto instastory.</p>`;
}
function storyDurationLabel(sec) {
  sec = sec || STORY_DEFAULT_DURATION;
  if (sec >= 60) return '1 menit';
  return sec + ' detik';
}
document.getElementById('menu-edit-story').onclick = () => {
  closeFiturMenu();
  renderStoryAdminList();
  renderStoryPlaylistAdminList();
  openModal('modal-story-admin');
};
/* ---------------- Statistik Stok per Bulan (khusus admin) ---------------- */
const MONTH_NAMES_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
// Data historis SEBELUM sistem pencatatan otomatis ini ada -- angkanya dikasih langsung sama
// admin (bukan dihitung dari data postingan asli, soalnya postingan lama gak ada/gak lengkap
// datanya buat bulan-bulan ini), makanya SENGAJA gak ada breakdown FF/ML/Sold Out, cuma total
// aja (lihat isManual di renderStatsModal). Bulan yang ada di daftar ini SELALU pakai angka
// manual (menang dari hitungan postingan asli, biar tampilannya konsisten sama Mei/Juni).
// Bulan SEKARANG dan seterusnya yang GAK ada di daftar ini TETAP kehitung otomatis LIVE dari
// postingan asli (computeMonthlyStokStats di bawah).
const MANUAL_MONTHLY_STOK_STATS = [
  { year: 2026, month: 3, total: 128 }, // April 2026
  { year: 2026, month: 4, total: 109 }, // Mei 2026
  { year: 2026, month: 5, total: 112 }, // Juni 2026
  { year: 2026, month: 6, total: 100 }, // Juli 2026
  { year: 2026, month: 7, total: 129 }, // Agustus 2026
];
function emptyGameBucket() {
  return { uploaded: 0, uploadedValue: 0, sold: 0, soldRevenue: 0, soldNoDate: 0 };
}
// Ngelompokin postingan tipe STOK (Rental gak dihitung -- sesuai request "total stok") per
// bulan-tahun upload aslinya (post.createdAt) buat hitungan "Diupload", sekalian dipecah per
// game (FF/ML) biar lebih kepake buat admin, bukan cuma angka total doang.
// "Keuntungan"/"Untung" DI SINI = TOTAL HARGA JUAL dari akun yang statusnya Sold Out (bukan
// omzet dikurangi modal -- sesuai request, gak perlu itung-itungan modal, langsung dari harga
// jual tiap akun aja). Angka "Terjual"-nya DIKELOMPOKKAN PER TANGGAL SOLD-nya (post.soldAt),
// BUKAN per tanggal upload -- soalnya akun yang diupload bulan lalu bisa aja baru laku bulan
// ini, jadi keuntungannya harus nyatet di bulan/hari dia BENERAN LAKU, bukan di bulan dia
// diupload. Makanya "Diupload" & "Terjual" pada satu bucket bulan yang sama BISA merujuk ke
// akun yang berbeda-beda (itu udah bener/wajar).
function computeMonthlyStokStats() {
  const map = {};
  const getBucket = (key, year, month) => {
    if (!map[key]) map[key] = { key, year, month, total: 0, ff: emptyGameBucket(), ml: emptyGameBucket(), daily: {} };
    return map[key];
  };
  posts.forEach(p => {
    if (p.type !== 'stok') return;
    const gameKey = p.game === 'ML' ? 'ml' : (p.game === 'FF' ? 'ff' : null);
    const priceNum = parseRupiahNumber(p.price) || 0;
    // 1) Hitungan "Diupload" -- per bulan post.createdAt, pakai harga LISTING (post.price) --
    //    ini emang cerminan harga yang DIPASANG pas upload, bukan harga akhir laku.
    const dUp = new Date(p.createdAt || Date.now());
    const keyUp = dUp.getFullYear() + '-' + String(dUp.getMonth() + 1).padStart(2, '0');
    const bucketUp = getBucket(keyUp, dUp.getFullYear(), dUp.getMonth());
    bucketUp.total++;
    if (gameKey) {
      bucketUp[gameKey].uploaded++;
      bucketUp[gameKey].uploadedValue += priceNum;
    }
    // 2) Hitungan "Terjual"/keuntungan -- per bulan & TANGGAL post.soldAt (kapan beneran laku),
    //    independen dari bulan upload di atas. PAKAI post.soldPrice (harga sold SEBENARNYA --
    //    udah termasuk diskon Flash Sale/nego kalau ada, DIISI/DIKONFIRM admin pas nandain Sold
    //    Out), BUKAN post.price lagi -- soalnya harga listing bisa beda jauh dari harga akhir
    //    yang beneran diterima. Fallback ke harga diskon aktif lalu harga normal cuma buat data
    //    LAMA yang ditandai sold SEBELUM fitur soldPrice ini ada (belum sempet keisi).
    if (p.soldOut && gameKey) {
      if (!p.soldAt) {
        // Sold dari SEBELUM fitur pencatatan tanggal ini ada -- gak ketauan kapan lakunya,
        // jadi gak bisa dimasukin ke breakdown harian/keuntungan bulan manapun. Dicatat doang
        // di bucket upload-nya biar admin tau ada yang "ketinggalan" & gak bingung angkanya kurang.
        bucketUp[gameKey].soldNoDate++;
      } else {
        const soldPriceRaw = p.soldPrice || (p.discountActive && p.discountPrice ? p.discountPrice : p.price);
        const soldPriceNum = parseRupiahNumber(soldPriceRaw) || 0;
        const dSold = new Date(p.soldAt);
        const keySold = dSold.getFullYear() + '-' + String(dSold.getMonth() + 1).padStart(2, '0');
        const bucketSold = getBucket(keySold, dSold.getFullYear(), dSold.getMonth());
        bucketSold[gameKey].sold++;
        bucketSold[gameKey].soldRevenue += soldPriceNum;
        const dayKey = dSold.getFullYear() + '-' + String(dSold.getMonth() + 1).padStart(2, '0') + '-' + String(dSold.getDate()).padStart(2, '0');
        if (!bucketSold.daily[dayKey]) bucketSold.daily[dayKey] = { day: dSold.getDate(), ff: 0, ml: 0, revenue: 0 };
        bucketSold.daily[dayKey][gameKey]++;
        bucketSold.daily[dayKey].revenue += soldPriceNum;
      }
    }
  });
  // Data manual SELALU menang: kalau bulannya ada di MANUAL_MONTHLY_STOK_STATS, angka live dari
  // postingan asli (kalau ada) diganti angka manual (tampilan total doang, tanpa breakdown).
  MANUAL_MONTHLY_STOK_STATS.forEach(m => {
    const key = m.year + '-' + String(m.month + 1).padStart(2, '0');
    map[key] = { key, year: m.year, month: m.month, total: m.total, isManual: true };
  });
  // Bulan paling baru duluan (urut turun berdasarkan tahun lalu bulan).
  return Object.values(map).sort((a, b) => (b.year - a.year) || (b.month - a.month));
}
// DESAIN ULANG (sebelumnya kerasa "pusing" -- kepadetan teks kecil 10-11px numpuk semua di satu
// tampilan sekaligus buat SEMUA bulan). Prinsip baru: (1) SATU angka paling penting (Untung) selalu
// paling GEDE & paling nyolok tiap baris -- itu yang admin cari duluan. (2) Bulan lain DEFAULT
// nutup/ringkas (cuma 1 baris: nama bulan + untung), gak numpahin semua detail sekaligus -- tinggal
// tap buat buka rinciannya. (3) Warna dipisah konsisten sama tema web: FF ungu (#a855f7), ML pink
// (#ec4899), biar bisa "dipindai" cepat tanpa baca teks satu-satu.
function statTile(label, colorHex, g) {
  return `
    <div class="rounded-xl p-3" style="background:linear-gradient(135deg, ${colorHex}22, ${colorHex}0d);border:1px solid ${colorHex}33">
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" style="background:${colorHex}"></span>
        <p class="text-[11px] font-bold" style="color:${colorHex}">${label}</p>
      </div>
      <p class="mt-1.5 text-xl font-extrabold leading-none text-emerald-400">${escapeHtml(formatRupiahNumber(g.soldRevenue))}</p>
      <p class="mt-1 text-[10px] text-white/45">${g.sold} akun terjual${g.soldNoDate ? ` <span class="text-amber-300/70">(+${g.soldNoDate} lama)</span>` : ''}</p>
      <div class="mt-2 border-t border-white/10 pt-1.5 text-[10px] text-white/40">
        <div class="flex items-center justify-between"><span>Diupload</span><span class="font-semibold text-white/65">${g.uploaded} akun</span></div>
        <div class="mt-1"><span class="block">Total Nominal Harga</span><span class="block font-semibold text-white/65">${escapeHtml(formatRupiahNumber(g.uploadedValue))}</span></div>
      </div>
    </div>`;
}
function renderDailyRow(s, d) {
  return `<div class="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-2.5 py-2">
    <div class="flex h-8 w-8 flex-shrink-0 flex-col items-center justify-center rounded-md bg-white/5 leading-none">
      <span class="text-xs font-extrabold text-white/85">${String(d.day).padStart(2, '0')}</span>
      <span class="text-[7.5px] uppercase text-white/40">${MONTH_NAMES_ID[s.month].slice(0, 3)}</span>
    </div>
    <div class="flex flex-1 items-center gap-1.5 text-[10px] text-white/50">
      ${d.ff ? `<span class="rounded-full px-1.5 py-0.5 font-bold" style="background:#a855f733;color:#c9a3fb">FF ${d.ff}</span>` : ''}
      ${d.ml ? `<span class="rounded-full px-1.5 py-0.5 font-bold" style="background:#ec489933;color:#f6a8ce">ML ${d.ml}</span>` : ''}
    </div>
    <span class="flex-shrink-0 text-sm font-extrabold text-emerald-400">${escapeHtml(formatRupiahNumber(d.revenue))}</span>
  </div>`;
}
// Rincian harian dipecah PER MINGGU (4 slide: tgl 1-7, 8-14, 15-21, 22-akhir bulan) -- geser
// kiri/kanan buat pindah minggu, jadi gak numpuk jadi satu list panjang.
const statsWeekIdx = {}; // { 'YYYY-MM': index minggu yang lagi dibuka (0-3) }
function statsDefaultWeek(s) {
  const now = new Date();
  if (now.getFullYear() === s.year && now.getMonth() === s.month) return Math.min(3, Math.floor((now.getDate() - 1) / 7));
  return 0;
}
function renderDailyBreakdown(s) {
  const days = Object.keys(s.daily || {});
  if (!days.length) return '<p class="mt-3 rounded-lg bg-white/[0.03] px-3 py-4 text-center text-[11px] text-white/40">Belum ada yang laku bulan ini.</p>';
  const lastDay = new Date(s.year, s.month + 1, 0).getDate();
  const weeks = [0, 1, 2, 3].map(i => ({ n: i + 1, from: i * 7 + 1, to: i === 3 ? lastDay : i * 7 + 7, items: [], revenue: 0, sold: 0 }));
  days.forEach(k => {
    const d = s.daily[k];
    const w = weeks[Math.min(3, Math.floor((d.day - 1) / 7))];
    w.items.push(d); w.revenue += d.revenue; w.sold += (d.ff + d.ml);
  });
  weeks.forEach(w => w.items.sort((x, y) => y.day - x.day)); // tanggal terbaru duluan
  if (statsWeekIdx[s.key] === undefined) statsWeekIdx[s.key] = statsDefaultWeek(s);
  const active = statsWeekIdx[s.key];
  const mon3 = MONTH_NAMES_ID[s.month].slice(0, 3);
  const dot = (i) => `<button type="button" onclick="statsWeekGo('${s.key}',${i})" aria-label="Minggu ${i + 1}" class="p-1"><span class="block h-1.5 rounded-full transition-all" style="width:${i === active ? '14px' : '6px'};background:${i === active ? '#a855f7' : 'rgba(255,255,255,.22)'}"></span></button>`;
  return `
    <div class="mt-3">
      <div class="mb-1.5 flex items-center justify-between px-0.5">
        <p class="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Rincian Harian</p>
        <div class="flex items-center">
          <button type="button" onclick="statsWeekNav('${s.key}',-1)" aria-label="Minggu sebelumnya" class="flex h-6 w-6 items-center justify-center rounded-md text-white/50 active:bg-white/10"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div id="stats-dots-${s.key}" class="flex items-center">${[0, 1, 2, 3].map(dot).join('')}</div>
          <button type="button" onclick="statsWeekNav('${s.key}',1)" aria-label="Minggu berikutnya" class="flex h-6 w-6 items-center justify-center rounded-md text-white/50 active:bg-white/10"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
      <div id="stats-week-${s.key}" class="stats-week-slider" onscroll="onStatsWeekScroll('${s.key}', this)">
        ${weeks.map(w => `
        <div class="stats-week-slide">
          <div class="mb-1.5 flex items-center justify-between rounded-lg bg-white/[0.06] px-2.5 py-1.5">
            <div>
              <p class="text-[11px] font-bold text-white/85">Minggu ${w.n}</p>
              <p class="text-[9.5px] text-white/40">${w.from}–${w.to} ${mon3}</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] font-extrabold ${w.sold ? 'text-emerald-400' : 'text-white/30'}">${escapeHtml(formatRupiahNumber(w.revenue))}</p>
              <p class="text-[9.5px] text-white/40">${w.sold} akun terjual</p>
            </div>
          </div>
          ${w.items.length
            ? `<div class="space-y-1.5">${w.items.map(d => renderDailyRow(s, d)).join('')}</div>`
            : '<p class="rounded-lg bg-white/[0.03] px-3 py-4 text-center text-[11px] text-white/40">Belum ada yang laku minggu ini.</p>'}
        </div>`).join('')}
      </div>
    </div>`;
}
function updateStatsDots(key, idx) {
  const box = document.getElementById('stats-dots-' + key);
  if (!box) return;
  Array.from(box.children).forEach((btn, i) => {
    const sp = btn.firstElementChild;
    if (!sp) return;
    sp.style.width = i === idx ? '14px' : '6px';
    sp.style.background = i === idx ? '#a855f7' : 'rgba(255,255,255,.22)';
  });
}
function onStatsWeekScroll(key, el) {
  const w = el.clientWidth || 1;
  const idx = Math.max(0, Math.min(3, Math.round(el.scrollLeft / w)));
  if (statsWeekIdx[key] === idx) return;
  statsWeekIdx[key] = idx;
  updateStatsDots(key, idx);
}
function statsWeekGo(key, idx) {
  playSfx('tap');
  const el = document.getElementById('stats-week-' + key);
  if (!el) return;
  idx = Math.max(0, Math.min(3, idx));
  el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
}
function statsWeekNav(key, dir) {
  const el = document.getElementById('stats-week-' + key);
  if (!el) return;
  const cur = Math.round(el.scrollLeft / (el.clientWidth || 1));
  statsWeekGo(key, cur + dir);
}
let statsExpandedMonth = null;
function renderStatsModal() {
  const container = document.getElementById('stats-months-list');
  if (!container) return;
  const stats = computeMonthlyStokStats();
  if (!stats.length) {
    container.innerHTML = `<div class="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">Belum ada postingan Stok sama sekali.</div>`;
    return;
  }
  const now = new Date();
  const curKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  // Kalau belum ada bulan yang dibuka manual, otomatis buka Bulan Ini duluan (biar begitu modal
  // ditap langsung keliatan angka terbaru, gak perlu tap 2x: buka modal LALU tap bulan).
  if (statsExpandedMonth === null && stats.some(s => s.key === curKey && !s.isManual)) statsExpandedMonth = curKey;
  container.innerHTML = stats.map(s => {
    const isCur = s.key === curKey;
    // Data historis manual gak ada breakdown FF/ML/Sold Out/keuangan (lihat komentar MANUAL_MONTHLY_STOK_STATS).
    if (s.isManual) {
      return `
      <div class="flex items-center justify-between rounded-xl card px-3.5 py-3">
        <p class="text-sm font-semibold text-white/80">${MONTH_NAMES_ID[s.month]} ${s.year}</p>
        <div class="text-right">
          <p class="text-base font-bold text-purple-300">${s.total}</p>
          <p class="text-[9.5px] text-white/35">akun diupload</p>
        </div>
      </div>`;
    }
    const untungTotal = s.ff.soldRevenue + s.ml.soldRevenue;
    const soldTotal = s.ff.sold + s.ml.sold;
    const isOpen = statsExpandedMonth === s.key;
    return `
    <div class="rounded-xl card overflow-hidden${isCur ? ' border-purple-500/50' : ''}">
      <button type="button" onclick="toggleStatsMonthDetail('${s.key}')" class="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left active:bg-white/5">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-[13px] font-bold text-white/85">${MONTH_NAMES_ID[s.month]} ${s.year}${isCur ? '<span class="rounded-full bg-purple-500/25 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">SEKARANG</span>' : ''}</p>
          <p class="mt-0.5 text-[10.5px] text-white/40">${soldTotal} akun terjual · ${s.total} diupload</p>
        </div>
        <div class="flex flex-shrink-0 items-center gap-2">
          <div class="text-right">
            <p class="text-[9px] uppercase tracking-wide text-white/35">Untung</p>
            <p class="text-base font-extrabold leading-tight text-emerald-400">${escapeHtml(formatRupiahNumber(untungTotal))}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 flex-shrink-0 text-white/30 transition-transform" style="transform:rotate(${isOpen ? '180deg' : '0deg'})"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      ${isOpen ? `
      <div class="border-t border-white/10 px-3.5 pb-3.5 pt-3">
        <div class="grid grid-cols-2 gap-2">
          ${statTile('Free Fire', '#a855f7', s.ff)}
          ${statTile('Mobile Legends', '#ec4899', s.ml)}
        </div>
        ${renderDailyBreakdown(s)}
        <button type="button" onclick="toggleStatsMonthDetail('${s.key}')" aria-label="Tutup rincian" class="mt-3 flex w-full items-center justify-center rounded-lg py-1.5 text-white/40 hover:text-white/70 active:bg-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      </div>` : ''}
    </div>`;
  }).join('');
  // Balikin posisi slide minggu yang terakhir dibuka (render ulang bikin scroll-nya reset ke 0).
  if (statsExpandedMonth && statsWeekIdx[statsExpandedMonth]) {
    const sl = document.getElementById('stats-week-' + statsExpandedMonth);
    if (sl && sl.clientWidth) { sl.style.scrollBehavior = 'auto'; sl.scrollLeft = statsWeekIdx[statsExpandedMonth] * sl.clientWidth; sl.style.scrollBehavior = ''; }
  }
}
function toggleStatsMonthDetail(key) {
  playSfx('tap');
  statsExpandedMonth = statsExpandedMonth === key ? null : key;
  renderStatsModal();
}
document.getElementById('menu-stok-stats').onclick = () => {
  closeFiturMenu();
  statsExpandedMonth = null;
  openModal('modal-stats');
  renderStatsModal();
};

const STORY_DEFAULT_DURATION = 15;
/* Baca otomatis Judul & Nama Penyanyi dari nama file lagu, pola "Judul - Nama Penyanyi"
   (underscore dianggap spasi, mis. "Who_Knows_-_Daniel_Caesar.m4a" -> judul "Who Knows",
   penyanyi "Daniel Caesar"). Kalau nama filenya gak punya pemisah " - ", balikin null biar
   kotak teksnya tetap kosong (ditandai lewat placeholder) dan diisi manual oleh admin. */
function parseSongFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, '');
  const cleaned = base.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/\s*-\s*/);
  if (parts.length >= 2 && parts[0].trim() && parts.slice(1).join(' ').trim()) {
    return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() };
  }
  return null;
}
