/* ---------------- Add / Edit post modal ---------------- */
let editingId = null;
let draftId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
let postType = 'stok';
let postGame = 'FF';
let postNominal = getFFTags()[0].v;
let postRentalGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
let postRentalTag = getRentalTags(postRentalGame)[0] ? getRentalTags(postRentalGame)[0].v : null;
let slide1Data = null;
let slide2Data = [];
const fullspekMode = true; // sekarang selalu pakai template, opsi "3 foto biasa" dihapus
let fullspekPending = null; // foto ganjil yang lagi nunggu pasangannya

// ---------------- Kategori SG (khusus Stok FF, bisa pilih lebih dari satu) ----------------
// Daftarnya sekarang diatur admin lewat "Kelola Kategori" (getFFSgCategories(), bisa
// nambah/ubah/hapus + dimatiin total lewat isFFSgCategoryEnabled()) -- BUKAN daftar tetap
// hardcode lagi. Dipakai di 2 tempat: (1) form tambah/edit postingan (multi-select, gantiin
// Deskripsi khusus buat FF), (2) chip filter tambahan di halaman utama tab FF (lihat
// renderTags()/matchesStokFilter()).
let selectedFFCategories = []; // kategori SG yang dipilih admin di form (disimpan di post.ffCategories; TIDAK ditulis ke judul)
let selectedRentalSgCategories = []; // kategori SG Rental yang kepilih di form postingan (multi-select, gak nempel ke judul)

/* Postingan baru otomatis ngikut slide/tab yang lagi kebuka pas tombol "+" ditekan:
   kalau lagi di slide Stok jadi Stok, kalau lagi di slide Rental jadi Rental. */
function getActiveMainTab() {
  const stokPanel = document.getElementById('stok-panel');
  return (stokPanel && stokPanel.style.display === 'none') ? 'rental' : 'stok';
}
function resetPostForm() {
  editingId = null;
  draftId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  postType = getActiveMainTab(); postGame = 'FF'; postNominal = getFFTags()[0].v;
  postRentalGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
  postRentalTag = getRentalTags(postRentalGame)[0] ? getRentalTags(postRentalGame)[0].v : null;
  slide1Data = null; slide2Data = [];
  fullspekPending = null;
  // BUG YANG DIPERBAIKI: sebelumnya kategori SG yang kepilih dari postingan SEBELUMNYA yang
  // lagi diedit/ditambah gak pernah direset di sini -- jadi kalau abis edit/tambah postingan FF
  // dengan kategori tertentu, terus langsung buka form "+ Tambah Postingan" baru, tombol
  // kategorinya masih kebawa nyala dari postingan sebelumnya (padahal ini postingan BARU/kosong).
  selectedFFCategories = [];
  selectedRentalSgCategories = [];
  document.getElementById('post-modal-title').textContent = '+ Tambah Postingan';
  document.getElementById('post-title').value = '';
  document.getElementById('post-desc').value = '';
  { const _d = document.getElementById('post-detail'); if (_d) _d.value = ''; }
  document.getElementById('post-rental-soldout').checked = false;
  document.getElementById('post-pinned').checked = false;
  document.getElementById('post-hidden').checked = false;
  document.getElementById('post-price').value = '';
  renderRentalPriceFields(null);
  document.getElementById('post-discount-price').value = '';
  document.getElementById('post-slide1-input').value = '';
  document.getElementById('post-slide2-input').value = '';
  document.getElementById('post-slide1-preview').classList.add('hidden');
  document.getElementById('post-slide2-preview').innerHTML = '';
  setPostType(postType);
  setPostGame('FF');
  renderNominalBtns();
  updateKodeDisplay();
}
function setPostType(t) {
  postType = t;
  document.getElementById('fields-stok-top').classList.toggle('hidden', t !== 'stok');
  document.getElementById('fields-stok-bottom').classList.toggle('hidden', t !== 'stok');
  document.getElementById('fields-rental').classList.toggle('hidden', t !== 'rental');
  const slide1PreviewEl = document.getElementById('post-slide1-preview');
  const slide1LabelEl = document.getElementById('post-slide1-label');
  slide1PreviewEl.style.aspectRatio = t === 'rental' ? '1536/709' : '4/5';
  slide1PreviewEl.style.maxWidth = t === 'rental' ? '260px' : '160px';
  if (slide1LabelEl) slide1LabelEl.textContent = t === 'rental' ? 'Slide 1 — Pilih File (rasio 2,17:1)' : 'Slide 1 — Pilih File (rasio 3:4, seperti IG)';
  const slide1HintEl = document.getElementById('post-slide1-hint');
  if (slide1HintEl) slide1HintEl.classList.toggle('hidden', t !== 'rental');
  renderRentalGameBtns();
  renderRentalTagBtns();
  renderRentalSgBtns();
  updateKodeDisplay();
  updateFFCategoryFieldVisibility();
}
function setPostGame(g, userTriggered) {
  // Foto fullspek yang udah ke-upload (slide2Data) itu gambar HASIL TEMPEL ke template
  // ungu(FF)/pink(ML) -- bukan foto mentah, jadi gak bisa "diproses ulang" otomatis kalau
  // game-nya diganti. Makanya kalau admin manual ganti game pas lagi edit/nambah post dan
  // udah ada foto fullspek ke-upload sebelumnya, foto lama itu dibuang otomatis di sini
  // biar gak nyangkut tetep pake template game yang lama -- admin tinggal upload ulang,
  // nanti otomatis ketempel ke template yang sesuai (lihat composeFullspekSlide(postGame, ...)).
  if (userTriggered && g !== postGame && (slide2Data.length || fullspekPending)) {
    slide2Data = [];
    fullspekPending = null;
    renderSlide2Preview();
    showToast(`Ganti game: foto fullspek lama dihapus, upload ulang biar template-nya kepasang ${g === 'FF' ? 'ungu (FF)' : 'pink (' + g + ')'}.`, 4000);
  }
  // Ganti ke ML: kategori SG (fitur khusus FF) tidak relevan lagi -> dikosongkan. Judul tidak disentuh.
  if (g !== 'FF' && selectedFFCategories.length) selectedFFCategories = [];
  postGame = g;
  postNominal = getTagsForGame(g)[0].v;
  let activeBtn = null;
  document.querySelectorAll('.post-game-btn').forEach(b => {
    const active = b.dataset.game === g;
    const isPink = active && isPinkGame(g);
    b.classList.toggle('primary', active && !isPink);
    b.classList.toggle('primary-pink', isPink);
    b.classList.toggle('text-white/60', !active);
    if (active) activeBtn = b;
  });
  // requestAnimationFrame: setPostGame ini sering dipanggil SEBELUM modal-post
  // kebuka (dari resetPostForm/openEditPost), jadi wrap-nya masih display:none dan
  // getBoundingClientRect() di segMoveIndicator bakal balikin lebar 0 -- indikator
  // ungu/pink jadi collapse ke 0px dan gak pernah keliatan (makanya tombolnya
  // kelihatan putih/transparan padahal harusnya ungu). Nunda 1 frame biar modal
  // udah pasti ke-render dulu.
  if (activeBtn) requestAnimationFrame(() => segMoveIndicator(document.getElementById('post-game-toggle-wrap'), activeBtn, isPinkGame(g) ? '#ec4899' : '#a855f7'));
  renderNominalBtns();
  updateKodeDisplay();
  // BUG YANG DIPERBAIKI: sebelumnya visibility Deskripsi vs Kategori SG cuma dihitung ulang di
  // setPostType() -- kalau setPostGame() dipanggil BELAKANGAN (misal pas openEditPost: setPostType
  // duluan baru setPostGame), hasilnya bisa nyangkut salah (misal edit postingan Stok ML tapi
  // yang kelihatan malah kotak Kategori SG, bukan Deskripsi). Dipanggil ulang di sini juga biar
  // selalu ngikutin kombinasi postType+postGame yang PALING BARU, gak peduli urutan pemanggilan.
  updateFFCategoryFieldVisibility();
}

/* Kode otomatis per game (FF & ML dihitung terpisah, tidak nyambung satu sama lain).
   Ini cuma dipakai buat NEBAK/preview kode kalau postingan baru mau ditambahkan (sebelum
   Simpan diklik) -- kode FINAL yang beneran kesimpen tetap ditentukan oleh
   renumberKodeForGame() di bawah, yang jalan otomatis abis Simpan/Hapus. */
function computeNextKode(game) {
  const gamePosts = posts.filter(p => p.type === 'stok' && p.game === game);
  return game + ' ' + String(gamePosts.length + 1).padStart(2, '0');
}
/* FITUR BARU: Benerin/susun ulang kode biar SELALU urut rapi tanpa bolong (01, 02, 03, ...),
   dihitung TERPISAH per game (FF punya urutannya sendiri, ML punya urutannya sendiri -- gak
   nyambung satu sama lain). Urutannya ngikutin waktu upload: yang paling LAMA diupload =
   kode 01 (posisi paling bawah di grid, karena grid disortir terbaru duluan di paling atas),
   makin baru diupload angkanya makin besar (naik ke atas).
   Dipanggil otomatis abis Simpan Postingan / Hapus Postingan (lihat pemanggilnya). Kalau ada
   yang dihapus di tengah, sisanya otomatis "geser ulang" nomornya dari 01 lagi -- ini
   disengaja, yang penting hasilnya selalu urut tanpa bolong, nomor lama gak perlu dipertahankan.
   Balikin true kalau ada kode yang berubah (perlu di-reload ulang datanya di pemanggil). */
async function renumberKodeForGame(game) {
  const gamePosts = posts.filter(p => p.type === 'stok' && p.game === game);
  gamePosts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const changed = [];
  gamePosts.forEach((p, idx) => {
    const newKode = game + ' ' + String(idx + 1).padStart(2, '0');
    if (p.kode !== newKode) {
      p.kode = newKode;
      changed.push(p);
    }
  });
  for (const p of changed) {
    await savePostRemote(p);
  }
  return changed.length > 0;
}
/* Panggil ini abis loadPosts() setiap kali ada perubahan postingan Stok (tambah/edit/hapus/
   pindah game) -- ngecek & benerin urutan kode FF dan ML sekaligus, terus reload ulang data
   kalau memang ada yang berubah biar tampilan langsung nunjukin kode yang udah rapi. */
async function resyncKodeUrutan() {
  const changedFF = await renumberKodeForGame('FF');
  const changedML = await renumberKodeForGame('ML');
  const changedRB = await renumberKodeForGame('RB');
  if (changedFF || changedML || changedRB) await loadPosts();
}
function updateKodeDisplay() {
  const wrap = document.getElementById('post-kode-wrap');
  const disp = document.getElementById('post-kode-display');
  if (!wrap || !disp) return;
  if (postType !== 'stok') { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  if (editingId) {
    const existing = posts.find(p => p.id === editingId);
    const gameChanged = existing && existing.game && existing.game !== postGame;
    if (existing && existing.kode && !gameChanged) {
      disp.textContent = existing.kode;
    } else {
      // Game-nya baru diganti (misal FF -> ML) -- tampilin kode BARU buat game yang baru,
      // jangan nunjukin kode lama punya game sebelumnya (itu yang bikin bug "kode FF nyangkut").
      disp.textContent = computeNextKode(postGame) + (gameChanged ? ' (kode baru, game diganti)' : '');
    }
  } else {
    disp.textContent = computeNextKode(postGame);
  }
}
function renderNominalBtns() {
  const wrap = document.getElementById('post-nominal-wrap');
  const btnsWrap = document.getElementById('post-nominal-btns');
  const label = document.getElementById('post-nominal-label');
  const tags = getTagsForGame(postGame);
  const activeCls = isPinkGame(postGame) ? 'active-pink' : 'active';
  if (label) label.textContent = `Kategori Nominal (${postGame})`;
  wrap.classList.remove('hidden');
  btnsWrap.innerHTML = tags.map(t => `<button type="button" data-nom="${t.v}" class="post-nom-btn chip ${postNominal === t.v ? activeCls : ''} rounded-lg px-3 py-2 text-[11px] font-semibold">${escapeHtml(t.l)}</button>`).join('');
  btnsWrap.querySelectorAll('.post-nom-btn').forEach(b => b.onclick = () => { postNominal = b.dataset.nom; renderNominalBtns(); });
}
/* Render tombol multi-select kategori SG di form admin (gaya sama kayak chip Kategori Nominal,
   bedanya di sini SEMUA tombol bisa aktif bareng, bukan cuma satu). */
function renderFFCategoryBtns() {
  const wrap = document.getElementById('post-ff-category-btns');
  if (!wrap) return;
  wrap.innerHTML = getFFSgCategories().map(cat => {
    const active = selectedFFCategories.includes(cat);
    return `<button type="button" data-cat="${escapeHtml(cat)}" class="post-ffcat-btn chip ${active ? 'active' : ''} rounded-lg px-3 py-2 text-[11px] font-semibold">${escapeHtml(cat)}</button>`;
  }).join('');
  wrap.querySelectorAll('.post-ffcat-btn').forEach(b => b.onclick = () => toggleFFCategory(b.dataset.cat));
}
function toggleFFCategory(cat) {
  const idx = selectedFFCategories.indexOf(cat);
  if (idx === -1) selectedFFCategories.push(cat); else selectedFFCategories.splice(idx, 1);
  renderFFCategoryBtns();
}
/* Deskripsi vs Kategori SG saling gantiin tempat: cuma Stok + FF yang nampilin Kategori SG
   (Deskripsi disembunyiin), selain itu (ML, atau Rental apapun gamenya) tetap Deskripsi biasa. */
function updateFFCategoryFieldVisibility() {
  // CATATAN: sengaja TIDAK dicek isFFSgCategoryEnabled() di sini lagi -- toggle "Aktifkan
  // Kategori SG" di pengaturan itu sekarang cuma ngaruh ke chip filter PUBLIK di homepage
  // (lihat renderSgCategoryFilter), bukan ke form tambah/edit postingan punya admin. Jadi
  // walau togglenya lagi dimatiin, admin tetap bisa milih/liat Kategori SG pas nambah/edit
  // Stok FF -- gunanya biar admin bisa nyiapin/nempelin kategori duluan sebelum fiturnya
  // ditampilin ke publik.
  const isFFStok = postType === 'stok' && postGame === 'FF';
  const descWrap = document.getElementById('post-desc-wrap');
  const catWrap = document.getElementById('post-ff-category-wrap');
  const titleWrap = document.getElementById('post-title-wrap');
  if (descWrap) descWrap.classList.toggle('hidden', isFFStok);
  // Roblox: dua kolom -> "Deskripsi akun" (teks) + "Detail akun" (link inventory)
  const isRBStok = postType === 'stok' && postGame === 'RB';
  const detailWrap = document.getElementById('post-detail-wrap');
  if (detailWrap) detailWrap.classList.toggle('hidden', !isRBStok);
  const descLb = document.getElementById('post-desc-label');
  if (descLb) descLb.textContent = isRBStok ? 'Deskripsi akun' : 'Deskripsi';
  // Kolom Judul dilebarin jadi full-width (gantiin grid 2 kolom) pas Deskripsi lagi
  // disembunyiin -- biar gak nyisain kotak kosong nganggur di sebelahnya.
  if (titleWrap) titleWrap.classList.toggle('col-span-2', isFFStok);
  if (catWrap) catWrap.classList.toggle('hidden', !isFFStok);
  if (isFFStok) renderFFCategoryBtns();
}
function renderRentalGameBtns() {
  const wrap = document.getElementById('post-rental-game-wrap');
  const btnsWrap = document.getElementById('post-rental-game-btns');
  if (!wrap || !btnsWrap) return;
  const games = getRentalGames();
  if (!games.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  if (!postRentalGame || !games.some(g => g.v === postRentalGame)) postRentalGame = games[0].v;
  btnsWrap.innerHTML = games.map(g => `<button type="button" data-rgame="${g.v}" class="post-nom-btn chip ${postRentalGame === g.v ? (g.v === 'ML' ? 'active-pink' : 'active') : ''} rounded-lg px-3 py-2 text-[11px] font-semibold">${escapeHtml(g.l)}</button>`).join('');
  btnsWrap.querySelectorAll('.post-nom-btn').forEach(b => b.onclick = () => {
    postRentalGame = b.dataset.rgame;
    postRentalTag = null; // reset biar ambil default kategori harga dari game baru
    renderRentalGameBtns();
    renderRentalTagBtns();
  });
}
function renderRentalTagBtns() {
  const wrap = document.getElementById('post-rental-tag-wrap');
  const btnsWrap = document.getElementById('post-rental-tag-btns');
  if (!wrap || !btnsWrap) return;
  const tags = getRentalTags(postRentalGame);
  const activeCls = postRentalGame === 'ML' ? 'active-pink' : 'active';
  if (!tags.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  if (!postRentalTag || !tags.some(t => t.v === postRentalTag)) postRentalTag = tags[0].v;
  btnsWrap.innerHTML = tags.map(t => `<button type="button" data-rtag="${t.v}" class="post-nom-btn chip ${postRentalTag === t.v ? activeCls : ''} rounded-lg px-3 py-2 text-[11px] font-semibold">${escapeHtml(t.l)}</button>`).join('');
  btnsWrap.querySelectorAll('.post-nom-btn').forEach(b => b.onclick = () => { postRentalTag = b.dataset.rtag; renderRentalTagBtns(); });
}
/* Tombol multi-select Kategori SG Rental di form admin -- gaya sama kayak Kategori SG punya
   Stok FF (renderFFCategoryBtns), tapi lebih sederhana: gak nempel ke judul, cuma kesimpen ke
   post.rentalSgCategories buat dipakai filter chip di homepage. */
function renderRentalSgBtns() {
  const wrap = document.getElementById('post-rental-sg-wrap');
  const btnsWrap = document.getElementById('post-rental-sg-btns');
  if (!wrap || !btnsWrap) return;
  const cats = getRentalSgCategories();
  if (!cats.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  btnsWrap.innerHTML = cats.map(cat => {
    const active = selectedRentalSgCategories.includes(cat);
    return `<button type="button" data-rsgcat="${escapeHtml(cat)}" class="post-rsgcat-btn chip ${active ? 'active' : ''} rounded-lg px-3 py-2 text-[11px] font-semibold">${escapeHtml(cat)}</button>`;
  }).join('');
  btnsWrap.querySelectorAll('.post-rsgcat-btn').forEach(b => b.onclick = () => {
    const cat = b.dataset.rsgcat;
    const idx = selectedRentalSgCategories.indexOf(cat);
    if (idx === -1) selectedRentalSgCategories.push(cat); else selectedRentalSgCategories.splice(idx, 1);
    renderRentalSgBtns();
  });
}
document.querySelectorAll('.post-game-btn').forEach(b => b.onclick = () => setPostGame(b.dataset.game, true));

/* Auto-format field harga jadi "Rp" + pemisah ribuan (misal 1000000 -> Rp1.000.000) */
function attachRupiahFormatter(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return;
  el.addEventListener('input', () => {
    let digits = el.value.replace(/[^0-9]/g, '');
    digits = digits.replace(/^0+(?=\d)/, '');
    if (!digits) { el.value = ''; return; }
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    el.value = 'Rp ' + formatted;
  });
}
['post-price', 'post-discount-price'].forEach(attachRupiahFormatter);

/* Auto-pilih Kategori Nominal (FF) berdasarkan angka di field Harga.
   Cuma jalan buat game FF, dan cuma kalau kategori default (0-500K / 501-999K / 1JT+++)
   masih ada di daftar kategori (kalau admin udah ganti/hapus kategori default, biarin manual). */
function autoDetectFFNominal() {
  if (postGame !== 'FF') return;
  const digits = document.getElementById('post-price').value.replace(/[^0-9]/g, '');
  if (!digits) return;
  const nominal = parseInt(digits, 10);
  const tags = getFFTags();
  const hasDefault = (v) => tags.some(t => t.v === v);
  let target = null;
  if (nominal <= 500000 && hasDefault('FF_0_500K')) target = 'FF_0_500K';
  else if (nominal >= 500001 && nominal < 1000000 && hasDefault('FF_501_1JT')) target = 'FF_501_1JT';
  else if (nominal >= 1000000 && hasDefault('FF_1JT_PLUS')) target = 'FF_1JT_PLUS';
  if (target && target !== postNominal) {
    postNominal = target;
    renderNominalBtns();
  }
}
document.getElementById('post-price').addEventListener('input', autoDetectFFNominal);

document.getElementById('btn-add-post').onclick = () => { resetPostForm(); openModal('modal-post'); };

document.getElementById('post-slide1-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const prev = document.getElementById('post-slide1-preview');
  const saveBtn = document.getElementById('btn-save-post');
  const prevSlide1Data = slide1Data; // simpan foto lama, buat di-restore kalau upload gagal
  const savedBtnText = saveBtn.textContent;
  saveBtn.disabled = true; saveBtn.textContent = 'Mengunggah foto...';
  try {
    const original = await fileToDataUrl(file);
    prev.classList.remove('hidden');
    prev.querySelector('img').src = original;
    const ext = (file.name && file.name.split('.').pop()) || 'jpg';
    slide1Data = await uploadImageToStorage(original, `posts/${draftId}/slide1_${Date.now()}.${ext}`);
    prev.querySelector('img').src = slide1Data;
    showToast('Foto slide 1 berhasil diganti.');
  } catch (err) {
    console.error(err);
    // Upload gagal: JANGAN diam-diam pakai foto lama padahal preview kelihatan udah ganti.
    // Balikin preview & slide1Data ke foto lama, dan kasih tau jelas (alert, bukan cuma toast
    // yang ilang 2 detik) biar keliatan kalau perubahannya BELUM tersimpan.
    slide1Data = prevSlide1Data;
    if (prevSlide1Data) {
      prev.classList.remove('hidden');
      prev.querySelector('img').src = prevSlide1Data;
    } else {
      prev.classList.add('hidden');
    }
    alert(`Gagal mengunggah foto slide 1: ${err.message || err.code || 'error tidak diketahui'}. Foto TIDAK berubah — coba lagi.`);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = savedBtnText;
    document.getElementById('post-slide1-input').value = '';
  }
};
document.getElementById('post-slide2-input').onchange = async (e) => {
  // PENTING: kalau pilih banyak foto sekaligus dari galeri HP (terutama Android), urutan file
  // yang dikirim browser ke `e.target.files` SERINGKALI BUKAN urutan foto ditap/dipilih -- bisa
  // balik ke urutan penyimpanan galeri. Nama filenya juga acak (bukan A/B/C), jadi gak bisa
  // diurutin dari nama. Yang paling reliable dan konsisten sama urutan foto diambil adalah
  // `file.lastModified` (waktu file dibuat/diambil) -- diurutkan ASCENDING (paling lama duluan)
  // biar foto pertama yang diambil jadi foto pertama juga di sini, baru dipasangkan 2-2.
  const files = [...e.target.files];   /* urutan = urutan foto yang kamu pilih (tidak lagi diurutkan menurut tanggal foto) */
  if (!files.length) return;
  const saveBtnLock = document.getElementById('btn-save-post');
  const savedBtnText = saveBtnLock.textContent;
  saveBtnLock.disabled = true;

  // Pasangkan file jadi 2-2 dulu (baca lokal, cepat) -- SEKARANG sesuai urutan `files` yang
  // sudah diurutkan di atas, bukan urutan mentah dari `e.target.files`.
  const pairs = [];
  // Foto diproses maksimal 3 sekaligus (lihat 28-foto-hd.js): foto sumber dikecilkan secukupnya buat kotak template
  // (sisi terpendek 1440px), lalu ditempel ke template dalam ukuran asli template (HD) -- cepat DAN tetap tajam.
  const toInput = window.fileToFullspekInput || fileToDataUrl;
  const convertAll = window.mapLimit || ((arr, n, fn) => Promise.all(arr.map(fn)));
  const converted = await convertAll(files, 3, (file) => toInput(file).catch((err) => { console.error(err); return null; }));
  for (const original of converted) {
    if (!original) continue;
    if (!fullspekPending) {
      fullspekPending = original;
    } else {
      pairs.push([fullspekPending, original]);
      fullspekPending = null;
    }
  }

  // Upload bertahap per batch kecil (3 pasang sekaligus) biar gak overload HP/koneksi
  const BATCH_SIZE = 2;
  let done = 0, failed = 0, firstErrMsg = '';
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    saveBtnLock.textContent = `Mengunggah foto... (${done}/${pairs.length})`;
    showToast(`Mengunggah foto ${done + 1}-${Math.min(done + batch.length, pairs.length)} dari ${pairs.length} pasang...`);
    const results = await Promise.allSettled(batch.map(async ([a, b]) => {
      const composed = await composeFullspekSlide(postGame, a, b);
      return uploadImageToStorage(composed, `posts/${draftId}/fullspek_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
    }));
    for (const r of results) {
      if (r.status === 'fulfilled') { slide2Data.push(r.value); done++; }
      else {
        failed++;
        console.error(r.reason);
        // Simpan pesan error pertama (nama+isi) buat ditunjukin ke user -- toast lama cuma
        // bilang "gagal" tanpa alasan, jadi susah dilacak dari HP tanpa buka console.
        if (!firstErrMsg) firstErrMsg = (r.reason && (r.reason.message || r.reason.name)) || String(r.reason);
      }
    }
    renderSlide2Preview();
  }

  if (failed > 0) showToast(`${failed} foto gagal diunggah: ${firstErrMsg}`, 6000);
  else if (pairs.length > 0) showToast(`Selesai, ${pairs.length} slide fullspek berhasil diunggah.`);
  saveBtnLock.disabled = false; saveBtnLock.textContent = savedBtnText;
  renderSlide2Preview();
};
function renderSlide2Preview() {
  const wrap = document.getElementById('post-slide2-preview');
  const pendingHtml = fullspekPending
    ? `<div class="relative"><img src="${fullspekPending}" class="h-16 w-28 rounded object-cover opacity-50" /><span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">⏳ nunggu pasangan</span></div>`
    : '';
  const countLabel = `${slide2Data.length} slide fullspek${fullspekPending ? ' + 1 foto nunggu pasangan' : ''}`;
  wrap.innerHTML = slide2Data.map((im, i) => `
    <div class="relative s2-item" data-i="${i}" style="touch-action:pan-y;cursor:grab">
      <img src="${im}" draggable="false" class="h-16 w-28 rounded object-cover" style="pointer-events:none" />
      <span class="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] font-bold leading-4">${i + 1}</span>
      ${i > 0 ? `<button type="button" onclick="moveSlide2First(${i})" title="Jadikan foto pertama" class="absolute left-1 bottom-1 rounded bg-black/70 px-1.5 text-[11px] font-bold leading-5">⇤</button>` : ''}
      <button type="button" onclick="removeSlide2(${i})" class="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-[10px] leading-5">✕</button>
    </div>`).join('') + pendingHtml + `<p class="w-full text-[10px] text-white/40 mt-1">${countLabel}${slide2Data.length > 1 ? ' · tahan & tarik foto untuk mengubah urutan, atau tekan ⇤ untuk jadikan pertama' : ''}</p>`;
}
function moveSlide2First(i) { if (i <= 0 || i >= slide2Data.length) return; const [m] = slide2Data.splice(i, 1); slide2Data.unshift(m); renderSlide2Preview(); }
/* tarik-geser untuk ubah urutan foto fullspek (tahan sebentar lalu tarik; HP & mouse) */
(function () {
  const wrap = document.getElementById('post-slide2-preview'); if (!wrap) return;
  let d = null;
  wrap.addEventListener('pointerdown', (e) => {
    const it = e.target.closest && e.target.closest('.s2-item'); if (!it || e.target.closest('button')) return;
    d = { it, i: +it.dataset.i, t: +it.dataset.i, x: e.clientX, y: e.clientY, on: false, timer: 0 };
    d.timer = setTimeout(() => { if (d) { d.on = true; it.style.zIndex = 5; it.style.opacity = '.92'; it.style.boxShadow = '0 8px 22px rgba(0,0,0,.5)'; it.style.cursor = 'grabbing'; } }, 220);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) { if (Math.hypot(dx, dy) > 8) { clearTimeout(d.timer); d = null; } return; }
    e.preventDefault();
    d.it.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`;
    const items = [...wrap.querySelectorAll('.s2-item')]; let t = d.i, best = 1e9;
    items.forEach((n, k) => { if (n === d.it) return; const r = n.getBoundingClientRect(); const c = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (c < best && c < r.width * 0.75) { best = c; t = k; } });
    d.t = t; items.forEach((n, k) => { n.style.outline = (k === t && n !== d.it) ? '2px solid #a78bfa' : ''; });
  });
  const end = (cancel) => {
    if (!d) return; clearTimeout(d.timer); const x = d; d = null;
    if (x.on && !cancel && x.t !== x.i) { const [m] = slide2Data.splice(x.i, 1); slide2Data.splice(x.t, 0, m); }
    renderSlide2Preview();
  };
  wrap.addEventListener('pointerup', () => end(false));
  wrap.addEventListener('pointercancel', () => end(true));
  wrap.addEventListener('touchmove', (e) => { if (d && d.on) e.preventDefault(); }, { passive: false });
  wrap.addEventListener('contextmenu', (e) => { if (d && d.on) e.preventDefault(); });
})();
function removeSlide2(i) { slide2Data.splice(i, 1); renderSlide2Preview(); }

function openEditPost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  resetPostForm();
  editingId = id;
  draftId = id;
  document.getElementById('post-modal-title').textContent = '✎ Edit Postingan';
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-desc').value = post.desc || '';
  { const _d = document.getElementById('post-detail'); if (_d) _d.value = post.detail || ''; }
  document.getElementById('post-pinned').checked = !!post.pinned;
  document.getElementById('post-hidden').checked = !!post.hidden;
  // Pulihkan kategori SG yang sudah tersimpan (Stok FF) SEBELUM setPostType/setPostGame: keduanya menggambar ulang
  // tombol kategori berdasarkan selectedFFCategories. Judul dibiarkan persis seperti yang tersimpan.
  selectedFFCategories = (post.type === 'stok' && post.game === 'FF' && Array.isArray(post.ffCategories)) ? [...post.ffCategories] : [];
  setPostType(post.type);
  if (post.type === 'stok') {
    setPostGame(post.game || 'FF');
    postNominal = post.nominalTag || getTagsForGame(post.game || 'FF')[0].v;
    renderNominalBtns();
    document.getElementById('post-price').value = post.price || '';
    document.getElementById('post-discount-price').value = post.discountPrice || '';
  } else {
    postRentalGame = post.rentalGame || (getRentalGames()[0] && getRentalGames()[0].v) || null;
    renderRentalGameBtns();
    renderRentalPriceFields(post);
    postRentalTag = post.rentalTag || (getRentalTags(postRentalGame)[0] && getRentalTags(postRentalGame)[0].v) || null;
    renderRentalTagBtns();
    selectedRentalSgCategories = Array.isArray(post.rentalSgCategories) ? [...post.rentalSgCategories] : [];
    renderRentalSgBtns();
    document.getElementById('post-rental-soldout').checked = !!post.soldOut;
  }
  if (post.slide1) {
    slide1Data = post.slide1;
    const prev = document.getElementById('post-slide1-preview');
    prev.classList.remove('hidden');
    prev.querySelector('img').src = slide1Data;
  }
  slide2Data = [...(post.slide2Images || [])];
  fullspekPending = null;
  renderSlide2Preview();
  openModal('modal-post');
}

document.getElementById('btn-save-post').onclick = async () => {
  const saveBtnGuard = document.getElementById('btn-save-post');
  if (saveBtnGuard.disabled) { return; } // lagi upload foto, jangan simpan dulu
  // FITUR BARU: Judul sekarang OPSIONAL, gak wajib diisi lagi buat bisa Simpan Postingan.
  // Tempat lain di kode ini udah otomatis nunjukin fallback "Tanpa judul" kalau title kosong,
  // jadi aman dibiarkan kosong tanpa bikin tampilan berantakan.
  const title = document.getElementById('post-title').value.trim();
  // Stok FF gak punya Deskripsi lagi (digantiin Kategori SG) -- dikosongin paksa di sini
  // juga (bukan cuma disembunyiin di form) biar gak ada teks Deskripsi lama yang nyangkut
  // kesimpen diam-diam kalau kotaknya sempet keisi sebelum ganti ke FF/Stok. Toggle "Aktifkan
  // Kategori SG" cuma ngaruh ke chip filter publik di homepage, BUKAN ke form admin -- jadi
  // isFFStokSave di sini sengaja disamain sama isFFStok di updateFFCategoryFieldVisibility
  // (gak dicek isFFSgCategoryEnabled() lagi), biar kategori yang dipilih admin tetap kesimpen
  // walau togglenya lagi mati.
  const isFFStokSave = postType === 'stok' && postGame === 'FF';
  const desc = isFFStokSave ? '' : document.getElementById('post-desc').value.trim();

  const btnEl = document.getElementById('btn-save-post');
  if (fullspekMode && fullspekPending) {
    btnEl.disabled = true; btnEl.textContent = 'Memproses foto...';
    try {
      const composed = await composeFullspekSlide(postGame, fullspekPending, null);
      const url = await uploadImageToStorage(composed, `posts/${draftId}/fullspek_${Date.now()}.jpg`);
      slide2Data.push(url);
      fullspekPending = null;
      renderSlide2Preview();
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses foto fullspek terakhir, coba lagi.');
      btnEl.disabled = false; btnEl.textContent = 'Simpan Postingan';
      return;
    }
    btnEl.disabled = false; btnEl.textContent = 'Simpan Postingan';
  }

  const existingForEdit = editingId ? posts.find(p => p.id === editingId) : null;
  let post = {
    id: editingId || ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    type: postType,
    title, desc,
    detail: (postType === 'stok' && postGame === 'RB' && document.getElementById('post-detail')) ? document.getElementById('post-detail').value.trim() : '',
    slide1: slide1Data,
    slide2Images: slide2Data,
    fullspek: fullspekMode,
    pinned: document.getElementById('post-pinned').checked,
    hidden: document.getElementById('post-hidden').checked,
    views: existingForEdit ? (existingForEdit.views || 0) : 0,
    createdAt: existingForEdit ? (existingForEdit.createdAt || Date.now()) : Date.now()
  };
  // Postingan yang tadinya disembunyikan lalu ditampilkan lewat form ini juga dihitung stok baru (lihat postFreshTime di 01-core.js).
  if (existingForEdit && existingForEdit.shownAt) post.shownAt = existingForEdit.shownAt;
  if (existingForEdit && existingForEdit.hidden && !post.hidden) post.shownAt = Date.now();

  if (postType === 'stok') {
    post.game = postGame;
    post.nominalTag = postNominal;
    // BUG YANG DIPERBAIKI: sebelumnya kategori SG yang dipilih admin di form (selectedFFCategories)
    // gak pernah ikut disimpen ke object postingan-nya sama sekali -- makanya kepilihannya "ilang"
    // abis Simpan (cuma nempel sebentar di judul doang, tapi gak ada data buat dipakai filter chip
    // di halaman utama, dan gak kebawa lagi kalau postingannya dibuka ulang buat diedit).
    post.ffCategories = isFFStokSave ? [...selectedFFCategories] : [];
    post.price = document.getElementById('post-price').value.trim();
    post.soldOut = existingForEdit ? !!existingForEdit.soldOut : false; // diatur lewat quick-action Tandai Sold Out di halaman detail, bukan di form ini
    // Harga Diskon udah gak pake toggle "Aktifkan Flash Sale" terpisah -- tinggal isi
    // Harga Diskon-nya, kalau ada angka > 0 otomatis dianggap flash sale aktif.
    post.discountPrice = document.getElementById('post-discount-price').value.trim();
    post.discountActive = !!(parseRupiahNumber(post.discountPrice) > 0);
    if (editingId) {
      const existing = posts.find(p => p.id === editingId);
      // Kalau lagi EDIT dan game-nya DIGANTI (misal ke-posting FF padahal harusnya ML, terus
      // dipindah ke ML di form ini), kode LAMA (kode FF-nya) jangan dipakai lagi -- itu bikin
      // postingan ML ini jadi bawa2 kode "FF ..." dan nomor urut FF-nya jadi bolong/nyangkut.
      // Kalau game-nya SAMA kayak semula, kode lama tetap dipertahankan seperti biasa.
      const gameChanged = existing && existing.game && existing.game !== postGame;
      post.kode = (existing && existing.kode && !gameChanged) ? existing.kode : computeNextKode(postGame);
    } else {
      post.kode = computeNextKode(postGame);
    }
  } else {
    post.rentalGame = postRentalGame;
    post.customRentalPrices = post.customRentalPrices || {};
    document.querySelectorAll('#post-rental-price-fields .post-price-dur').forEach(inp => {
      setRentalPriceForType(post, inp.dataset.durKey, inp.value.trim());
    });
    post.rentalTag = postRentalTag;
    post.rentalSgCategories = [...selectedRentalSgCategories];
    post.soldOut = document.getElementById('post-rental-soldout').checked;
  }

  const btn = document.getElementById('btn-save-post');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  const ok = await savePostRemote(post);
  btn.disabled = false; btn.textContent = 'Simpan Postingan';
  if (!ok) return;
  await loadPosts();
  // FITUR BARU: abis simpan postingan Stok (tambah/edit/pindah game), benerin urutan kode
  // FF & ML biar tetap rapi 01,02,03,... tanpa bolong.
  if (postType === 'stok') await resyncKodeUrutan();
  closeModal('modal-post');
  showToast(editingId ? 'Postingan berhasil diupdate untuk semua orang.' : 'Postingan berhasil ditambahkan untuk semua orang.');
};

