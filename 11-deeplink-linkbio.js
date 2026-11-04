/* ---------------- Deep link ---------------- */
function resolvePostBySlug(slug) {
  if (!slug) return null;
  let post = null;
  // Link lama format post-<id> / #post-<id>, tetap didukung biar link yang udah kesebar gak rusak.
  if (slug.startsWith('post-')) {
    post = posts.find(p => p.id === slug.slice(5));
  }
  if (!post) {
    post = posts.find(p => buildPostSlug(p) === slug);
  }
  if (!post) {
    // Judul mungkin sudah diedit setelah link dibagikan — coba cocokkan lewat kode-nya saja.
    const kodePart = slug.split('-')[0];
    post = posts.find(p => p.type === 'stok' && p.kode && slugify(p.kode) === kodePart);
  }
  return post;
}
function openPostFromSlug(slug) {
  const post = resolvePostBySlug(slug);
  if (!post) return;
  const id = post.id;
  if (post.type === 'rental') {
    document.querySelector('.tab[data-tab="rental"]').click();
  } else {
    document.querySelector('.tab[data-tab="stok"]').click();
    curGame = post.game;
    curTag = post.soldOut ? 'SOLD_OUT' : 'ALL_READY';
    if (curGame !== 'FF') { activeSgFilters.clear(); sgCategoryPanelOpen = false; }
    document.querySelectorAll('.game').forEach(x => { x.classList.remove('primary', 'primary-pink'); x.classList.add('text-white/60'); });
    const deepLinkGameBtn = document.querySelector(`.game[data-game="${curGame}"]`);
    deepLinkGameBtn.classList.add(curGame === 'ML' ? 'primary-pink' : 'primary');
    deepLinkGameBtn.classList.remove('text-white/60');
    segMoveIndicator(document.getElementById('game-toggle-wrap'), deepLinkGameBtn, curGame === 'ML' ? '#ec4899' : '#a855f7');
    renderTags(); renderSortWrap(); renderStok(); updateFooterLogo();
  }
  // openPostDetail sendiri yang ngurus history (bikin entry "/" di bawah entry link postingan
  // ini), jadi Address bar tetap konsisten balik ke toukaenay.com pas ditutup dengan cara apapun.
  // Ditandai "dibuka dari link" di sini SETELAH openPostDetail supaya nggak ketiban balik ke
  // false sama fungsi itu (fungsi itu dipakai juga buat klik kartu grid biasa, yang harus tetap false).
  openPostDetail(id);
  detailOpenedFromLink = true;
}
function handleHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash) openPostFromSlug(hash);
}
function handlePathRoute() {
  const path = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ''));
  if (path.toLowerCase() === 'story') { openStoryViewer(); return; }
  if (path.toLowerCase() === 'info') { openLinkBio(); return; }
  if (path && path.toLowerCase() !== 'index.html') openPostFromSlug(path);
}

/* Cegah cara paling umum buat nyimpen gambar (drag-and-drop & menu "Simpan gambar" pas
   tahan/klik-kanan). Ini bukan proteksi 100% (orang tetap bisa screenshot), tapi cukup
   buat bikin gambar gak bisa langsung didownload/di-share filenya lewat menu browser. */
document.addEventListener('contextmenu', (e) => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});
document.addEventListener('dragstart', (e) => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});

/* Partikel melayang di background — dekoratif, gak nyentuh interaksi apapun. */
function initBgParticles() {
  const wrap = document.getElementById('bg-particles');
  if (!wrap) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const count = lowEnd ? 4 : (window.innerWidth < 640 ? 8 : 14);
  const colors = ['#d8b4fe', '#f0abfc', '#c4b5fd'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const size = (Math.random() * 3 + 2).toFixed(1);
    const left = (Math.random() * 100).toFixed(2);
    const duration = (Math.random() * 10 + 12).toFixed(1);
    const delay = (Math.random() * -20).toFixed(1);
    const drift = (Math.random() * 80 - 40).toFixed(0);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = left + '%';
    p.style.setProperty('--drift', drift + 'px');
    p.style.animationDuration = duration + 's';
    p.style.animationDelay = delay + 's';
    p.style.background = `radial-gradient(circle, ${colors[i % colors.length]} 0%, rgba(168,85,247,.5) 55%, rgba(168,85,247,0) 75%)`;
    wrap.appendChild(p);
  }
}

/* Reveal-on-scroll buat konten paling bawah (footer info & kolom kontak): tiap elemen
   ".scroll-reveal" dikasih class "is-visible" pas kescroll masuk layar, sekali doang lalu
   berhenti diamati (biar ringan, gak jalan berkali-kali). */
function initScrollReveal() {
  const targets = document.querySelectorAll('.scroll-reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(t => io.observe(t));
}

/* ==================== LINK BIO (/info) ====================
   Halaman gaya Linktree yang bisa dibagikan sebagai toukaenay.com/info. Datanya (nama, foto,
   verified, musik, daftar tombol link) disimpan bareng profil utama (kolom "data" di tabel
   Supabase "profile", key "linkbio") -- jadi kelola-nya lewat mekanisme saveProfile/loadProfile
   yang sudah ada, gak perlu tabel baru. Counter "User Klik" itung PENGUNJUNG yang buka halaman
   ini (bukan klik per-tombol), disimpan TERPISAH lewat RPC atomik (increment_linkbio_click) biar
   gak ketimpa/ilang kalau ada beberapa pengunjung buka bareng. */
let linkbioOpenedFromLink = false;
let linkbioMusicPlaying = false;
let linkbioMusicStart = 0; // detik mulai potongan lagu yang lagi jalan
let linkbioMusicEnd = null; // detik selesai potongan lagu yang lagi jalan, null = sampe abis file
let linkbioPlaylist = []; // daftar lagu {url,start,end} hasil olahan dari lb.musicPlaylist (atau migrasi dari musicUrl lama)
let linkbioTrackIndex = 0; // lagu ke berapa di linkbioPlaylist yang lagi/bakal diputer

// Data lama cuma nyimpen 1 lagu (musicUrl/musicStart/musicEnd) -- kalau musicPlaylist belum
// pernah diisi, otomatis dianggap playlist isi 1 lagu itu, biar profil yang udah disetel
// sebelumnya tetap jalan normal tanpa admin perlu upload ulang.
function linkbioComputePlaylist(lb) {
  let list = Array.isArray(lb.musicPlaylist) ? lb.musicPlaylist.filter(s => s && s.url) : [];
  if (!list.length && lb.musicUrl) {
    list = [{ url: lb.musicUrl, start: Number(lb.musicStart) || 0, end: (lb.musicEnd === null || lb.musicEnd === undefined) ? null : Number(lb.musicEnd) }];
  }
  return list;
}
// Ganti sumber <audio> ke lagu ke-`index` di linkbioPlaylist (dipanggil pas halaman pertama
// dibuka & pas pindah ke lagu berikutnya) tanpa nge-render ulang seluruh halaman.
function linkbioLoadTrack(index) {
  const audio = document.getElementById('linkbio-audio');
  if (!audio) return;
  const track = linkbioPlaylist[index] || null;
  const wantedSrc = track ? track.url : '';
  if (audio.dataset.src !== wantedSrc) {
    audio.pause();
    audio.src = wantedSrc;
    audio.dataset.src = wantedSrc;
    linkbioMusicPlaying = false;
    linkbioSetMusicIcon(false);
  }
  linkbioMusicStart = track ? (Number(track.start) || 0) : 0;
  linkbioMusicEnd = track && (track.end !== null && track.end !== undefined) ? Number(track.end) : null;
}

// Digambar oleh 16-linkbio-v2.js (menimpa fungsi ini). Stub kosong supaya panggilan awal dari 01-core/12-init tidak error.
function renderLinkBio() {}
// Kalau lagu abis (nyampe ujung potongan ATAU beneran abis filenya): playlist isi lebih dari 1
// lagu -> lanjut ke lagu berikutnya gantian terus. Playlist isi 1 lagu (atau abis semua) ->
// berhenti aja, JANGAN diulang balik ke awal lagi (beda dari sebelumnya yang loop terus-terusan).
function linkbioAdvanceOrStop() {
  const audio = document.getElementById('linkbio-audio');
  if (linkbioPlaylist.length > 1) {
    linkbioTrackIndex = (linkbioTrackIndex + 1) % linkbioPlaylist.length;
    linkbioLoadTrack(linkbioTrackIndex);
    if (audio) {
      audio.currentTime = linkbioMusicStart;
      audio.play().then(() => { linkbioMusicPlaying = true; linkbioSetMusicIcon(true); }).catch(() => { linkbioMusicPlaying = false; linkbioSetMusicIcon(false); });
    }
  } else {
    if (audio) { audio.pause(); audio.currentTime = linkbioMusicStart; }
    linkbioMusicPlaying = false;
    linkbioSetMusicIcon(false);
  }
}
(function () {
  const audio = document.getElementById('linkbio-audio');
  if (!audio) return;
  audio.addEventListener('timeupdate', () => {
    if (linkbioMusicEnd !== null && audio.currentTime >= linkbioMusicEnd) linkbioAdvanceOrStop();
  });
  audio.addEventListener('ended', () => linkbioAdvanceOrStop());
})();

let linkbioAutoplayArmed = false; // true kalau lagi nunggu sentuhan pertama pengguna buat mulai musik (lihat linkbioArmAutoplayFallback)
function linkbioArmAutoplayFallback() {
  if (linkbioAutoplayArmed) return;
  linkbioAutoplayArmed = true;
  const tryPlay = () => {
    linkbioDisarmAutoplayFallback();
    const audio = document.getElementById('linkbio-audio');
    if (!audio || !audio.src || linkbioMusicPlaying) return;
    audio.play().then(() => { linkbioMusicPlaying = true; linkbioSetMusicIcon(true); }).catch(() => {});
  };
  linkbioAutoplayHandler = tryPlay;
  document.addEventListener('pointerdown', tryPlay, { capture: true, once: true });
  document.addEventListener('touchstart', tryPlay, { capture: true, once: true });
}
let linkbioAutoplayHandler = null;
function linkbioDisarmAutoplayFallback() {
  if (!linkbioAutoplayArmed) return;
  linkbioAutoplayArmed = false;
  if (linkbioAutoplayHandler) {
    document.removeEventListener('pointerdown', linkbioAutoplayHandler, { capture: true });
    document.removeEventListener('touchstart', linkbioAutoplayHandler, { capture: true });
    linkbioAutoplayHandler = null;
  }
}

function linkbioSetMusicIcon(playing) {
  const btn = document.getElementById('btn-linkbio-music');
  const icon = document.getElementById('linkbio-music-icon');
  if (!btn || !icon) return;
  btn.classList.toggle('is-playing', playing);
  icon.innerHTML = playing
    ? '<rect x="5" y="4" width="4.5" height="16" rx="1"/><rect x="14.5" y="4" width="4.5" height="16" rx="1"/>'
    : '<path d="M7 4.5v15l13-7.5-13-7.5z"/>';
  icon.setAttribute('fill', 'currentColor');
}

function linkbioToggleMusic() {
  const audio = document.getElementById('linkbio-audio');
  if (!audio || !audio.src) return;
  if (linkbioMusicPlaying) {
    audio.pause();
    linkbioMusicPlaying = false;
    linkbioSetMusicIcon(false);
  } else {
    if (audio.currentTime < linkbioMusicStart || (linkbioMusicEnd !== null && audio.currentTime >= linkbioMusicEnd)) audio.currentTime = linkbioMusicStart;
    audio.play().then(() => { linkbioMusicPlaying = true; linkbioSetMusicIcon(true); }).catch(() => showToast('Gagal memutar musik.'));
  }
}

/* Nambahin +1 ke counter "User Klik" tiap kali halaman /info dibuka -- lewat endpoint di
   Worker biar nambahnya ATOMIK, gak kayak nyimpen angka di JSON profil yang gampang ketimpa
   kalau ada 2 pengunjung buka bareng-bareng. */
async function linkbioTrackVisit() {
  const clicksEl = document.getElementById('linkbio-clicks');
  try {
    const result = await apiFetch('/api/linkbio-click', { method: 'POST' });
    if (clicksEl && result && typeof result.value === 'number') clicksEl.textContent = formatCompactCount(result.value);
  } catch (e) {
    console.error('linkbio click gagal:', e);
  }
}

function openLinkBio() {
  const page = document.getElementById('page-linkbio');
  if (!page) return;
  // Musik latar di website stok & musik Grup JB jangan sampai numpuk bareng: kalau musik
  // stok lagi nyala, dimatiin dulu di sini (fungsi ini juga dipakai buat Instastory, jadi
  // otomatis inget status "lagi nyala apa nggak" sebelumnya) -- baru musik Grup JB mulai.
  // Kalau orang emang langsung ke /info dari luar (bukan dari tombol musik di web stok),
  // musik stok emang dari awal belum nyala, jadi baris ini gak ngefek/gak ganggu apa-apa.
  pauseBgMusicForStory();
  renderLinkBio();
  page.classList.remove('hidden');
  page.classList.add('flex');
  document.body.classList.add('linkbio-open');
  document.body.classList.remove('route-boot-hide');
  page.scrollTop = 0;
  linkbioTrackVisit();
  // Coba langsung muterin musiknya begitu halaman kebuka. Kalau ini dipicu dari klik/tap
  // langsung di dalam web (misal tombol menu "Grup JB"), browser masih nganggep itu ada
  // "izin" dari interaksi pengguna barusan, jadi biasanya lolos. TAPI kalau halaman ini
  // dibuka langsung dari luar (ketik toukaenay.com/info di address bar, atau kebuka dari
  // link WhatsApp) -- itu dianggap "belum ada interaksi apa-apa" oleh browser, jadi
  // autoplay yang ada suaranya PASTI diblokir (ini aturan baku semua browser modern, bukan
  // bug di web ini -- gak ada cara nembus itu murni lewat kode). Buat nyiasatin, kalau
  // percobaan pertama ini keblokir, langsung dipasang "jebakan": begitu pengguna nyentuh
  // layar di mana aja (bukan harus pas di tombol musik), lagunya langsung jalan detik itu juga.
  const audio = document.getElementById('linkbio-audio');
  if (audio && audio.src) {
    audio.currentTime = linkbioMusicStart || 0;
    audio.play().then(() => { linkbioMusicPlaying = true; linkbioSetMusicIcon(true); }).catch(() => {
      linkbioMusicPlaying = false;
      linkbioSetMusicIcon(false);
      linkbioArmAutoplayFallback();
    });
  }
  // Selalu jamin ada 1 lapis riwayat "/" DI BAWAH "/info" -- baik pas dibuka dari klik di
  // dalam web (pathname masih "/") MAUPUN pas dibuka langsung dari luar (pathname udah
  // "/info" dari awal muat, sebelumnya kondisi ini bikin baris di bawah gak pernah jalan
  // sama sekali buat kasus ini, jadi cuma ada SATU riwayat "/info" doang -- makanya pas
  // tombol kembali dipencet, browser gak punya halaman lain buat dibalikin & jadi blank).
  history.replaceState(null, '', '/');
  history.pushState(null, '', '/info');
  linkbioOpenedFromLink = true;
}

function closeLinkBio(skipHistory) {
  const page = document.getElementById('page-linkbio');
  if (!page) return;
  linkbioDisarmAutoplayFallback(); // batalin "jebakan main musik pas disentuh" kalau ternyata keburu ditutup duluan
  const audio = document.getElementById('linkbio-audio');
  if (audio) audio.pause();
  linkbioMusicPlaying = false;
  page.classList.add('hidden');
  page.classList.remove('flex');
  document.body.classList.remove('linkbio-open');
  // Kalau musik stok tadi dimatiin otomatis pas buka Grup JB (lihat openLinkBio), nyalain
  // lagi di sini -- tapi cuma kalau tadinya emang lagi nyala, kalau enggak ya dibiarin mati.
  resumeBgMusicAfterStory();
  if (!skipHistory && linkbioOpenedFromLink && location.pathname === '/info') {
    history.back();
  }
  linkbioOpenedFromLink = false;
}

/* ---- Admin: form kecil buat ubah profil + tombol link di halaman /info ---- */
let linkbioAdminDraft = null; // salinan kerja sementara, baru disimpan beneran pas tombol Simpan dipencet
let linkbioAdminAvatarData = null;
let linkbioMusicEditingIndex = -1; // index lagu di linkbioAdminDraft.musicPlaylist yang lagi kebuka di panel potong (-1 = gak ada)
let linkbioAdminColors = { bg: '', box: '', text: '' }; // kosong = pakai warna bawaan (default)
const LINKBIO_COLOR_NEUTRAL = { bg: '#171b26', box: '#1c142d', text: '#ffffff' }; // cuma buat isi awal <input type=color>, bukan berarti "sudah diset"

function openLinkbioAdmin() {
  if (!isAdmin) return;
  const lb = { ...defaultProfile.linkbio, ...(profile.linkbio || {}) };
  linkbioAdminDraft = { ...lb, links: (lb.links || []).map(l => ({ ...l })) };
  linkbioAdminAvatarData = lb.avatarUrl || '';
  // Migrasi data lama (single musicUrl) jadi playlist berisi 1 lagu, kalau belum ada playlist sama sekali.
  let playlist = Array.isArray(lb.musicPlaylist) ? lb.musicPlaylist.map(s => ({ ...s })) : [];
  if (!playlist.length && lb.musicUrl) {
    playlist = [{ id: 'lbmusic-legacy', url: lb.musicUrl, name: 'Musik', start: Number(lb.musicStart) || 0, end: (lb.musicEnd === null || lb.musicEnd === undefined) ? null : Number(lb.musicEnd) }];
  }
  linkbioAdminDraft.musicPlaylist = playlist;
  linkbioMusicEditingIndex = -1;
  linkbioAdminColors = { bg: lb.bgColor || '', box: lb.boxColor || '', text: lb.textColor || '' };
  document.getElementById('linkbio-f-color-bg').value = linkbioAdminColors.bg || LINKBIO_COLOR_NEUTRAL.bg;
  document.getElementById('linkbio-f-color-box').value = linkbioAdminColors.box || LINKBIO_COLOR_NEUTRAL.box;
  document.getElementById('linkbio-f-color-text').value = linkbioAdminColors.text || LINKBIO_COLOR_NEUTRAL.text;
  document.getElementById('linkbio-f-name').value = linkbioAdminDraft.name || '';
  document.getElementById('linkbio-f-avatar-preview').src = linkbioAdminAvatarData;
  document.getElementById('linkbio-f-avatar-file').value = '';
  document.getElementById('linkbio-f-verified').checked = !!linkbioAdminDraft.verified;
  document.getElementById('linkbio-f-music-file').value = '';
  linkbioMusicTrimmer.reset();
  renderLinkbioAdminPlaylist();
  openModal('modal-linkbio-admin');
}
document.getElementById('linkbio-f-avatar-file').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('linkbio-f-avatar-preview');
  try {
    const compressed = await compressImage(file, 1024, 0.92);   // dulu 500px/0.8: logo/foto profil dibuat HD
    preview.src = compressed; // preview instan pakai versi lokal dulu
    linkbioAdminAvatarData = await uploadImageToStorage(compressed, `linkbio/avatar_${Date.now()}.jpg`);
    preview.src = linkbioAdminAvatarData;
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah foto: ${err.message || err.code || 'error tidak diketahui'}`);
  }
};
document.getElementById('linkbio-f-music-file').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !linkbioAdminDraft) return;
  const entry = { id: 'lbmusic' + Date.now(), url: '', name: file.name, start: 0, end: null };
  linkbioAdminDraft.musicPlaylist.push(entry);
  const idx = linkbioAdminDraft.musicPlaylist.length - 1;
  linkbioMusicEditingIndex = idx;
  linkbioMusicTrimmer.load(file); // langsung nongolin trimmer + waveform-nya buat dipotong admin
  document.getElementById('linkbio-f-music-trim-name').textContent = file.name;
  renderLinkbioAdminPlaylist();
  try {
    const rawSong = await fileToRawDataUrl(file);
    entry.url = await uploadImageToStorage(rawSong, `linkbio/music_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
    renderLinkbioAdminPlaylist();
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah musik: ${err.message || err.code || 'error tidak diketahui'}`);
    // Upload gagal -> buang lagi entry yang tadi udah kadung ditambahin.
    const pos = linkbioAdminDraft.musicPlaylist.indexOf(entry);
    if (pos !== -1) linkbioAdminDraft.musicPlaylist.splice(pos, 1);
    linkbioMusicEditingIndex = -1;
    linkbioMusicTrimmer.reset();
    renderLinkbioAdminPlaylist();
  }
  e.target.value = '';
};
async function linkbioReplacePlaylistSong(i, inputEl) {
  const file = inputEl.files[0];
  if (!file || !linkbioAdminDraft || !linkbioAdminDraft.musicPlaylist[i]) return;
  const entry = linkbioAdminDraft.musicPlaylist[i];
  entry.name = file.name; entry.start = 0; entry.end = null; entry.url = '';
  linkbioMusicEditingIndex = i;
  linkbioMusicTrimmer.load(file);
  document.getElementById('linkbio-f-music-trim-name').textContent = file.name;
  renderLinkbioAdminPlaylist();
  try {
    const rawSong = await fileToRawDataUrl(file);
    entry.url = await uploadImageToStorage(rawSong, `linkbio/music_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah musik: ${err.message || err.code || 'error tidak diketahui'}`);
  }
  renderLinkbioAdminPlaylist();
}
function removeLinkbioPlaylistSong(i) {
  if (!linkbioAdminDraft) return;
  linkbioAdminDraft.musicPlaylist.splice(i, 1);
  if (linkbioMusicEditingIndex === i) { linkbioMusicEditingIndex = -1; linkbioMusicTrimmer.reset(); }
  else if (linkbioMusicEditingIndex > i) linkbioMusicEditingIndex--;
  renderLinkbioAdminPlaylist();
}
// Dipanggil pas admin pencet "Selesai Potong" -- nyalin posisi potongan yang lagi diatur di
// trimmer (kalau ada lagu yang lagi dibuka) ke data lagu itu di playlist, terus nutup panelnya.
function linkbioCommitMusicTrim() {
  if (linkbioMusicEditingIndex >= 0 && linkbioAdminDraft && linkbioAdminDraft.musicPlaylist[linkbioMusicEditingIndex]) {
    const range = linkbioMusicTrimmer.getRange();
    const entry = linkbioAdminDraft.musicPlaylist[linkbioMusicEditingIndex];
    if (range) { entry.start = range.start; entry.end = range.end; }
  }
  linkbioMusicEditingIndex = -1;
  linkbioMusicTrimmer.reset();
  renderLinkbioAdminPlaylist();
}
function renderLinkbioAdminPlaylist() {
  const wrap = document.getElementById('linkbio-admin-playlist');
  if (!wrap || !linkbioAdminDraft) return;
  const list = linkbioAdminDraft.musicPlaylist || [];
  wrap.innerHTML = list.map((s, i) => `
    <div class="linkbio-admin-row card flex items-center justify-between gap-2 rounded-xl p-2.5">
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-semibold">${i + 1}. ${escapeHtml(s.name || 'Lagu')}</p>
        <p class="text-[10px] text-white/40">${Math.round(s.start || 0)}d – ${(s.end !== null && s.end !== undefined) ? Math.round(s.end) + 'd' : 'selesai'}${!s.url ? ' • mengunggah...' : ''}</p>
      </div>
      <div class="flex flex-shrink-0 items-center gap-1">
        <label class="btn-ghost cursor-pointer rounded-md px-2 py-1 text-[11px]">Ganti<input type="file" accept="audio/*" class="hidden" onchange="linkbioReplacePlaylistSong(${i}, this)" /></label>
        <button type="button" onclick="removeLinkbioPlaylistSong(${i})" class="rounded-md bg-red-500/80 px-2 py-1 text-[11px] font-semibold text-white">Hapus</button>
      </div>
    </div>
  `).join('') || '<p class="text-center text-xs text-white/40 py-2">Belum ada lagu.</p>';
}
document.getElementById('linkbio-f-color-bg').oninput = (e) => { linkbioAdminColors.bg = e.target.value; };
document.getElementById('linkbio-f-color-box').oninput = (e) => { linkbioAdminColors.box = e.target.value; };
document.getElementById('linkbio-f-color-text').oninput = (e) => { linkbioAdminColors.text = e.target.value; };
function linkbioClearColor(key) {
  linkbioAdminColors[key] = '';
  const input = document.getElementById(`linkbio-f-color-${key}`);
  if (input) input.value = LINKBIO_COLOR_NEUTRAL[key];
}


