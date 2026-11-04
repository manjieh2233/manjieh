/* ---------------- Song trimmer widget (kayak Instagram): pilih potongan lagu sambil
   dengerin preview-nya langsung lewat waveform + gagang geser, gak perlu hafalin/nebak
   detik lagi. Dipakai di 2 tempat (lagu per-foto instastory & lagu playlist musik story),
   makanya dibikin reusable -- prefix nentuin id elemen HTML yang dipakai (mis. prefix
   "story-admin-song" -> elemen story-admin-song-trimmer, -waveform, -handle-start, dst). */
function createSongTrimmer(prefix, getMaxLen) {
  const trimmerEl = document.getElementById(prefix + '-trimmer');
  const canvas = document.getElementById(prefix + '-waveform');
  const rangeEl = document.getElementById(prefix + '-range');
  const handleStart = document.getElementById(prefix + '-handle-start');
  const handleEnd = document.getElementById(prefix + '-handle-end');
  const label = document.getElementById(prefix + '-range-label');
  const previewBtn = document.getElementById(prefix + '-preview-btn');
  const audio = document.getElementById(prefix + '-audio');
  let duration = 0, startSec = 0, endSec = 0, objectUrl = null, previewing = false, dragTarget = null;
  // Buat mode "geser bareng" (drag area tengah): nyimpen posisi detik di bawah jari pas drag
  // mulai + posisi startSec awal, biar pas jari geser, start & end ikut mindah bareng dengan
  // jarak (selisih detik) yang sama -- durasi potongannya gak berubah sama sekali.
  let moveAnchorSec = 0, moveInitStart = 0, moveWinLen = 0;

  // Batas maksimal panjang potongan (detik), ngikutin "Durasi Tampil" story yang dipilih admin --
  // soalnya lagu bakal keputus/diulang begitu fotonya ganti, jadi percuma potong lebih panjang
  // dari durasi tampilnya (ujungnya toh gak akan pernah kedengeran pas story beneran jalan).
  function maxLen() { const m = getMaxLen ? getMaxLen() : Infinity; return (Number.isFinite(m) && m > 0) ? m : Infinity; }

  function fmt(s) { return (Math.round(s * 10) / 10).toFixed(1); }
  function updateUI() {
    if (label) {
      const ml = maxLen();
      label.textContent = duration
        ? `${fmt(startSec)}d – ${fmt(endSec)}d (durasi ${fmt(endSec - startSec)}d${Number.isFinite(ml) ? `, maks ${ml}d` : ''})`
        : '';
    }
    if (!duration) return;
    const startPct = (startSec / duration) * 100;
    const endPct = (endSec / duration) * 100;
    handleStart.style.left = startPct + '%';
    handleEnd.style.left = endPct + '%';
    rangeEl.style.left = startPct + '%';
    rangeEl.style.right = (100 - endPct) + '%';
  }
  // Rect canvas di-cache pas gesture MULAI (pointerdown), bukan dibaca ulang (getBoundingClientRect)
  // tiap pointermove -- baca ukuran elemen di tengah2 gerakan jari itu "layout thrashing" & bikin
  // drag kerasa berat/nyendat, apalagi di HP kelas bawah.
  let cachedTrimRect = null;
  function refreshTrimRect() { cachedTrimRect = canvas.getBoundingClientRect(); }
  window.addEventListener('resize', () => { if (dragTarget) refreshTrimRect(); }, { passive: true });
  function pctFromEvent(e) {
    const rect = cachedTrimRect || canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }
  // Update visual (style.left, label) dibungkus requestAnimationFrame biar nempel ke ritme render
  // browser -- pointermove bisa nembak jauh lebih sering dari layar bisa gambar ulang, jadi tanpa
  // throttle ini tiap event langsung nulis ke DOM (numpuk kerja, bikin drag kerasa patah-patah).
  let trimDragRaf = null;
  function scheduleUpdateUI() {
    if (trimDragRaf) return;
    trimDragRaf = requestAnimationFrame(() => { trimDragRaf = null; updateUI(); });
  }
  function onDragMove(e) {
    if (!dragTarget || !duration) return;
    if (e.cancelable) e.preventDefault();
    const sec = pctFromEvent(e) * duration;
    const ml = maxLen();
    if (dragTarget === 'move') {
      const delta = sec - moveAnchorSec;
      let newStart = Math.max(0, Math.min(duration - moveWinLen, moveInitStart + delta));
      startSec = newStart; endSec = newStart + moveWinLen;
      scheduleUpdateUI();
      return;
    }
    if (dragTarget === 'start') {
      const newStart = Math.max(0, Math.min(sec, endSec - 0.2));
      if (endSec - newStart > ml) {
        // Udah mentok di batas durasi maksimal (ml) -- daripada gagangnya cuma berhenti diam
        // (bikin user harus manual pindahin gagang satunya dulu), jendelanya (start & end)
        // digeser BARENG ngikutin jari, panjangnya tetap ml, biar geser ke kiri/kanan mulus
        // dalam satu tarikan tanpa perlu gonta-ganti gagang.
        startSec = Math.max(0, sec);
        endSec = Math.min(duration, startSec + ml);
        if (endSec - startSec < ml) startSec = Math.max(0, endSec - ml);
      } else {
        startSec = newStart;
      }
    } else {
      const newEnd = Math.min(duration, Math.max(sec, startSec + 0.2));
      if (newEnd - startSec > ml) {
        // Sama kayak di atas tapi arah sebaliknya: gagang kanan mentok di ml -> geser jendela
        // (start & end) bareng ke kanan ngikutin jari, bukan cuma diem di tempat.
        endSec = Math.min(duration, sec);
        startSec = Math.max(0, endSec - ml);
        if (endSec - startSec < ml) endSec = Math.min(duration, startSec + ml);
      } else {
        endSec = newEnd;
      }
    }
    scheduleUpdateUI();
  }
  // setPointerCapture: begitu jari nyentuh gagang, semua event pointer berikutnya (termasuk pas
  // jari geser keluar dari area gagang yang kecil) tetap "dikunci" ke gagang ini -- ini yang bikin
  // drag-nya gak putus/kelewat gampang meleset kayak sebelumnya, dipadu sama hitbox yang diperbesar
  // di HTML (36px sentuh) + hitbox yang gak lagi kepotong overflow-hidden di ujung kiri/kanan.
  handleStart.addEventListener('pointerdown', (e) => { e.preventDefault(); if (previewing) stopPreview(); dragTarget = 'start'; refreshTrimRect(); handleStart.classList.add('is-dragging'); try { handleStart.setPointerCapture(e.pointerId); } catch (_) {} onDragMove(e); });
  handleEnd.addEventListener('pointerdown', (e) => { e.preventDefault(); if (previewing) stopPreview(); dragTarget = 'end'; refreshTrimRect(); handleEnd.classList.add('is-dragging'); try { handleEnd.setPointerCapture(e.pointerId); } catch (_) {} onDragMove(e); });
  // Drag di AREA TENGAH (yang udah kepilih) -- mindahin start & end BARENG (durasi tetap),
  // bukan salah satu doang. Dipisah dari listener canvas di bawah (yang buat lompat ke gagang
  // terdekat kalau nge-tap di luar area terpilih).
  if (rangeEl) rangeEl.addEventListener('pointerdown', (e) => {
    if (!duration) return;
    e.preventDefault();
    if (previewing) stopPreview();
    dragTarget = 'move';
    refreshTrimRect();
    moveAnchorSec = pctFromEvent(e) * duration;
    moveInitStart = startSec;
    moveWinLen = endSec - startSec;
    rangeEl.classList.add('is-dragging');
    try { rangeEl.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!duration) return;
    if (previewing) stopPreview();
    refreshTrimRect();
    const sec = pctFromEvent(e) * duration;
    dragTarget = Math.abs(sec - startSec) <= Math.abs(sec - endSec) ? 'start' : 'end';
    (dragTarget === 'start' ? handleStart : handleEnd).classList.add('is-dragging');
    onDragMove(e);
  });
  document.addEventListener('pointermove', onDragMove);
  function endDrag() { dragTarget = null; if (trimDragRaf) { cancelAnimationFrame(trimDragRaf); trimDragRaf = null; } handleStart.classList.remove('is-dragging'); handleEnd.classList.remove('is-dragging'); if (rangeEl) rangeEl.classList.remove('is-dragging'); }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function drawWaveform(audioBuffer) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300, height = canvas.clientHeight || 56;
    canvas.width = width * dpr; canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / width));
    const amp = height / 2;
    ctx.fillStyle = 'rgba(168,85,247,.55)';
    for (let i = 0; i < width; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx >= data.length) break;
        const v = data[idx];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (max < min) { max = 0; min = 0; }
      const y1 = amp + min * amp, y2 = amp + max * amp;
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  }
  async function load(file) {
    reset(false);
    trimmerEl.parentElement.parentElement.classList.remove('hidden');
    objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    await new Promise((res) => { audio.onloadedmetadata = res; audio.onerror = res; });
    duration = audio.duration || 0;
    startSec = 0; endSec = Math.min(duration, maxLen());
    updateUI();
    try {
      const arrayBuf = await file.arrayBuffer();
      const actx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await actx.decodeAudioData(arrayBuf);
      drawWaveform(decoded);
      actx.close();
    } catch (err) { console.error('Gagal gambar waveform lagu', err); }
  }
  function stopPreview() {
    audio.pause();
    previewing = false;
    if (previewBtn) previewBtn.textContent = '▶ Preview';
  }
  if (previewBtn) previewBtn.onclick = () => {
    if (!duration) return;
    if (previewing) { stopPreview(); return; }
    audio.currentTime = startSec;
    audio.play();
    previewing = true;
    previewBtn.textContent = '⏸ Stop';
  };
  audio.addEventListener('timeupdate', () => { if (previewing && audio.currentTime >= endSec) audio.currentTime = startSec; });
  audio.addEventListener('ended', stopPreview);
  function reset(hide) {
    stopPreview();
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    audio.removeAttribute('src');
    duration = 0; startSec = 0; endSec = 0;
    if (label) label.textContent = '';
    if (hide !== false) trimmerEl.parentElement.parentElement.classList.add('hidden');
  }
  function getRange() {
    if (!duration) return { start: 0, end: null };
    const s = Math.max(0, Math.round(startSec));
    const e = (endSec >= duration - 0.05) ? null : Math.max(s + 1, Math.round(endSec));
    return { start: s, end: e };
  }
  // Dipanggil pas admin gonta-ganti pilihan "Durasi Tampil" -- kalau potongan yang udah dipilih
  // jadi lebih panjang dari durasi tampil yang baru, otomatis dipendekin ngikutin durasi barunya.
  function clampToMaxLen() {
    if (!duration) return;
    const ml = maxLen();
    if (endSec - startSec > ml) { endSec = Math.min(duration, startSec + ml); updateUI(); }
  }
  return { load, reset, getRange, stopPreview, clampToMaxLen };
}
function getStoryDurationSec() {
  const sel = document.getElementById('story-admin-duration');
  const v = sel ? parseInt(sel.value, 10) : NaN;
  return (Number.isFinite(v) && v > 0) ? v : Infinity;
}
const storySongTrimmer = createSongTrimmer('story-admin-song', getStoryDurationSec);
const playlistSongTrimmer = createSongTrimmer('story-playlist-song', getStoryDurationSec);
// Musik latar Link Bio (/info): gak ada batas "durasi tampil" kayak Instastory, jadi maxLen-nya
// dibiarin gak terbatas (Infinity) -- admin bebas mau motong lagunya berapa detik juga.
const linkbioMusicTrimmer = createSongTrimmer('linkbio-f-music', () => Infinity);
document.getElementById('story-admin-duration').addEventListener('change', () => {
  storySongTrimmer.clampToMaxLen();
  playlistSongTrimmer.clampToMaxLen();
});

/* Foto album default kalau admin milih gaya "Piringan"/"Album" tapi gak upload foto album sendiri
   -- gradient ungu-pink + ikon not musik, biar badge-nya tetap keliatan bagus, bukan kotak kosong. */
const DEFAULT_ALBUM_ART = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="76" font-size="54" text-anchor="middle" fill="white" font-family="sans-serif">&#9834;</text></svg>');

/* ---------------- Foto album + gaya badge musik (kayak pilih sticker musik Instagram) ----------------
   Reusable buat 2 tempat (lagu per-foto & lagu playlist), sama kayak createSongTrimmer di atas.
   getArtFile() -> File foto album yg dipilih admin (atau null kalau gak pilih), getStyle() -> salah
   satu dari 'pill' | 'disc' | 'art' | 'text' sesuai tombol yg terakhir ditekan admin. */
function setupSongBadgeExtras(prefix) {
  const artInput = document.getElementById(prefix + '-art-file');
  const artPreview = document.getElementById(prefix + '-art-preview');
  const artLabel = document.getElementById(prefix + '-art-label');
  const styleWrap = document.getElementById(prefix + '-style');
  let artFile = null, artObjectUrl = null, style = 'pill';
  if (artInput) {
    artInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      artFile = file;
      if (artObjectUrl) URL.revokeObjectURL(artObjectUrl);
      artObjectUrl = URL.createObjectURL(file);
      if (artPreview) { artPreview.src = artObjectUrl; artPreview.classList.remove('hidden'); }
      if (artLabel) artLabel.textContent = 'Ganti Foto Album';
    };
  }
  if (styleWrap) {
    styleWrap.querySelectorAll('.badge-style-btn').forEach(btn => {
      btn.onclick = () => {
        style = btn.dataset.style;
        styleWrap.querySelectorAll('.badge-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });
  }
  function reset() {
    artFile = null; style = 'pill';
    if (artObjectUrl) { URL.revokeObjectURL(artObjectUrl); artObjectUrl = null; }
    if (artInput) artInput.value = '';
    if (artPreview) { artPreview.classList.add('hidden'); artPreview.src = ''; }
    if (artLabel) artLabel.textContent = '+ Pilih Foto Album';
    if (styleWrap) {
      styleWrap.querySelectorAll('.badge-style-btn').forEach(b => b.classList.remove('active'));
      const def = styleWrap.querySelector('[data-style="pill"]');
      if (def) def.classList.add('active');
    }
  }
  return { getArtFile: () => artFile, getStyle: () => style, reset };
}
const storySongExtras = setupSongBadgeExtras('story-admin-song');
const playlistSongExtras = setupSongBadgeExtras('story-playlist-song');

let pendingCaptionColor = '#ffffff';
const captionTextInput = document.getElementById('story-admin-caption-text');
const captionOptsWrap = document.getElementById('story-admin-caption-opts');
captionTextInput.addEventListener('input', () => {
  captionOptsWrap.classList.toggle('hidden', !captionTextInput.value.trim());
});
document.querySelectorAll('.story-caption-swatch').forEach(btn => {
  btn.onclick = () => {
    pendingCaptionColor = btn.dataset.color;
    document.querySelectorAll('.story-caption-swatch').forEach(b => b.style.borderColor = 'transparent');
    btn.style.borderColor = '#fff';
  };
});
function resetCaptionForm() {
  captionTextInput.value = '';
  captionOptsWrap.classList.add('hidden');
  document.getElementById('story-admin-caption-pos').value = 'center';
  pendingCaptionColor = '#ffffff';
  document.querySelectorAll('.story-caption-swatch').forEach(b => b.style.borderColor = 'transparent');
  document.querySelector('.story-caption-swatch[data-color="#ffffff"]').style.borderColor = '#fff';
}

let pendingStorySongFile = null;
document.getElementById('story-admin-song-file').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pendingStorySongFile = file;
  document.getElementById('story-admin-song-name').textContent = file.name;
  document.getElementById('story-admin-song-clear').classList.remove('hidden');
  document.getElementById('story-admin-song-trim').classList.remove('hidden');
  const artistInput = document.getElementById('story-admin-song-artist');
  const titleInput = document.getElementById('story-admin-song-title');
  const parsed = parseSongFilename(file.name);
  if (parsed) {
    artistInput.value = parsed.artist;
    titleInput.value = parsed.title;
  } else {
    artistInput.value = '';
    titleInput.value = '';
    artistInput.placeholder = '(Nama Penyanyi)';
    titleInput.placeholder = '(Judul Lagu)';
  }
  storySongTrimmer.load(file);
};
document.getElementById('story-admin-song-clear').onclick = () => {
  pendingStorySongFile = null;
  document.getElementById('story-admin-song-file').value = '';
  document.getElementById('story-admin-song-name').textContent = 'Tambah Lagu (opsional)';
  document.getElementById('story-admin-song-clear').classList.add('hidden');
  document.getElementById('story-admin-song-trim').classList.add('hidden');
  document.getElementById('story-admin-song-artist').value = '';
  document.getElementById('story-admin-song-title').value = '';
  storySongTrimmer.reset();
  storySongExtras.reset();
};
document.getElementById('story-admin-file').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const duration = parseInt(document.getElementById('story-admin-duration').value, 10) || STORY_DEFAULT_DURATION;
  const songFile = pendingStorySongFile;
  // Potongan lagu (opsional) ditentuin lewat trimmer visual (geser + preview), bukan hafalin
  // angka detik lagi -- biar lagunya cuma muter di bagian yang dipilih (loop selama foto tampil).
  const { start: songStart, end: songEnd } = storySongTrimmer.getRange();
  const songArtist = document.getElementById('story-admin-song-artist').value.trim();
  const songTitle = document.getElementById('story-admin-song-title').value.trim();
  const songArtFile = storySongExtras.getArtFile();
  const songBadgeStyle = storySongExtras.getStyle();
  showToast('Mengunggah foto instastory...', 4000);
  try {
    const compressed = await fileToDataUrl(file);
    const url = await uploadImageToStorage(compressed, `stories/story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
    let songUrl = null;
    let songArtUrl = null;
    if (songFile) {
      const rawSong = await fileToRawDataUrl(songFile);
      songUrl = await uploadImageToStorage(rawSong, `stories/song_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
      if (songArtFile) {
        const compressedArt = await fileToDataUrl(songArtFile);
        songArtUrl = await uploadImageToStorage(compressedArt, `stories/songart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
      }
    }
    const id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const captionText = captionTextInput.value.trim();
    const captionPos = document.getElementById('story-admin-caption-pos').value;
    const updated = [...getStoryImages(), { id, url, duration, song: songUrl, songArtist: songUrl ? songArtist : '', songTitle: songUrl ? songTitle : '', songStart: songUrl ? songStart : 0, songEnd: songUrl ? songEnd : null, songArt: songUrl ? songArtUrl : null, songBadgeStyle: songUrl ? songBadgeStyle : 'pill', caption: captionText, captionColor: captionText ? pendingCaptionColor : '', captionPos: captionText ? captionPos : '', addedAt: Date.now() }];
    const ok = await saveProfile({ storyImages: updated });
    if (ok) {
      profile.storyImages = updated;
      pendingStorySongFile = null;
      document.getElementById('story-admin-song-file').value = '';
      document.getElementById('story-admin-song-name').textContent = 'Tambah Lagu (opsional)';
      document.getElementById('story-admin-song-clear').classList.add('hidden');
      document.getElementById('story-admin-song-trim').classList.add('hidden');
      document.getElementById('story-admin-song-artist').value = '';
      document.getElementById('story-admin-song-title').value = '';
      storySongTrimmer.reset();
      storySongExtras.reset();
      resetCaptionForm();
      renderStoryAdminList(); renderProfile(); showToast('Foto instastory ditambahkan!');
    }
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah foto instastory: ${err.message || 'error tidak diketahui'}`);
  }
};
async function removeStoryImage(id) {
  if (!confirm('Hapus foto instastory ini?')) return;
  const updated = getStoryImages().filter(s => s.id !== id);
  const ok = await saveProfile({ storyImages: updated });
  if (ok) { profile.storyImages = updated; renderStoryAdminList(); renderProfile(); showToast('Foto instastory dihapus.'); }
}

/* ---------------- Instastory: viewer (publik) ---------------- */
let storyIndex = 0;
const STORY_LIKED_KEY = 'touka_liked_stories';
function getLikedStoryIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORY_LIKED_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveLikedStoryIds(set) {
  try { localStorage.setItem(STORY_LIKED_KEY, JSON.stringify([...set])); } catch (e) {}
}

/* Ring foto profil ala Instastory: nyala/mutar kalau ada story yg belum ditonton, jadi abu-abu
   kalau semua udah ditonton, lalu otomatis "nyala lagi" 24 jam kemudian (atau kalau ada foto
   story baru yg ditambahin admin) -- disimpan per-device lewat localStorage, bukan per-server,
   sama persis kayak mekanisme like story. */
const STORY_SEEN_KEY = 'touka_story_seen_state';
function getStorySeenState() {
  try { return JSON.parse(localStorage.getItem(STORY_SEEN_KEY) || 'null'); }
  catch (e) { return null; }
}
function markStoriesSeenNow() {
  const list = getStoryImages();
  if (!list.length) return;
  const latest = list[list.length - 1];
  try { localStorage.setItem(STORY_SEEN_KEY, JSON.stringify({ at: Date.now(), lastId: latest.id })); } catch (e) {}
  renderProfile();
}
function hasUnseenStory() {
  const list = getStoryImages();
  if (!list.length) return false;
  const seen = getStorySeenState();
  if (!seen) return true;
  if (Date.now() - seen.at > 24 * 60 * 60 * 1000) return true; // reset abis 24 jam
  const latest = list[list.length - 1];
  if (seen.lastId !== latest.id) return true; // ada story baru sejak terakhir ditonton
  return false;
}

/* ---------------- Instastory: playlist musik ---------------- */
/* Playlist musik global buat instastory (di luar lagu per-foto yg udah ada). Cara ngacaknya
   (kantong kocok, no-repeat) ada di createSongShuffler() & storySongShuffler di bawah. */
function getStoryPlaylist() { return (profile.storyPlaylist && profile.storyPlaylist.length) ? profile.storyPlaylist : []; }

/* ---------------- Util: "kocok kartu" playlist (dipakai musik Fitur & musik Instastory) ----------------
   BUKAN random murni tiap panggil -- random murni bisa bikin 1 lagu keputer 2-3x beruntun
   sebelum lagu lain kebagian giliran (persis keluhan yang pernah kejadian). Di sini playlist
   diacak sekali jadi satu "kantong" berisi semua lagu, dimainin satu-satu abis dari kantong itu
   TANPA ada yang diulang, baru kalau kantongnya abis di-kocok ulang buat putaran berikutnya --
   dan lagu terakhir putaran ini gak boleh jadi lagu pertama putaran baru biar gak berasa
   "sama" 2x beruntun pas transisi antar putaran. Tiap tempat pemutaran (musik Fitur / musik
   Instastory) punya kantongnya sendiri2 (instance terpisah) karena keduanya jalan independen. */
function createSongShuffler() {
  let bag = [];
  let lastId = null;
  function shuffledIds(list) {
    const ids = list.map(s => s.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }
  function refill(list) {
    bag = shuffledIds(list);
    if (bag.length > 1 && bag[0] === lastId) {
      const j = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[j]] = [bag[j], bag[0]];
    }
  }
  return {
    next(list) {
      if (!list.length) return null;
      if (list.length === 1) { lastId = list[0].id; return list[0]; }
      const validIds = new Set(list.map(s => s.id));
      bag = bag.filter(id => validIds.has(id)); // buang id lagu yg udah dihapus admin dari antrian lama
      if (!bag.length) refill(list);
      const id = bag.shift();
      const song = list.find(s => s.id === id);
      if (!song) return this.next(list); // jaga-jaga kalau somehow gak ketemu
      lastId = id;
      return song;
    },
    reset() { bag = []; lastId = null; }
  };
}

/* ---------------- Util: donlot lagu jadi Blob dulu -- biar SEEK-nya PASTI akurat ---------------- */
/* AKAR MASALAH SEBENARNYA (ketemu setelah 2x perbaikan berbasis timing/event masih tetep gagal
   di real device): nge-seek audio yang lagi di-STREAM langsung dari URL server itu BUTUH server-nya
   ngedukung "HTTP Range request" secara akurat & konsisten. Kalau server/CDN penyimpanan lagunya
   gak selalu ngasih itu dengan mulus (apalagi baru aja ganti src, belum sempat ke-buffer sama
   sekali), browser bisa DIAM-DIAM gagal/clamp seek-nya balik ke 0 -- padahal dari sisi kode JS,
   currentTime UDAH di-set dengan bener & event 'seeked'/'loadedmetadata' UDAH ditunggu dengan
   bener juga. Ini kenapa perbaikan sebelumnya (nunggu event, nyimpen niat geser, dsb) masih
   kerasa gagal di sebagian device/koneksi -- masalahnya emang bukan di urutan kode JS-nya lagi.
   SOLUSI PALING PASTI: donlot file lagunya SEUTUHNYA ke memori (Blob) dulu SEBELUM dipasang ke
   elemen <audio>, baru dari Blob itu dibikin Object URL lokal. Begitu sumbernya udah berupa Blob
   lokal (bukan lagi stream dari server), geser ke detik/menit manapun PASTI instan & akurat --
   karena udah gak butuh kirim request Range ke server sama sekali, semua byte-nya udah ada di
   memori HP/PC. Di-cache per URL lagu (Map, bertahan selama tab masih kebuka) biar lagu yang
   SAMA yang keputer ulang (lumrah banget krn sistemnya acak/shuffle) gak didonlot berkali-kali --
   pemutaran ke-2/ke-3/dst untuk lagu yang sama jadi INSTAN karena udah ada di cache.
   Kalau donlotnya gagal (mis. lagi bener2 offline / CORS server bermasalah), fallback otomatis
   ke cara lama (streaming langsung dari URL asli) -- jadi paling jelek ya balik senormal
   sebelumnya, gak pernah lebih buruk dari itu. */
const audioBlobCache = new Map(); // url asli lagu -> Promise<string ObjectURL> (atau Promise<null> kalau gagal)
function loadAudioAsBlobUrl(url) {
  if (!url) return Promise.resolve(null);
  if (audioBlobCache.has(url)) return audioBlobCache.get(url);
  const p = fetch(url)
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.blob(); })
    .then(blob => URL.createObjectURL(blob))
    .catch(err => {
      console.error('Gagal donlot lagu buat seek akurat, fallback ke streaming langsung:', err);
      audioBlobCache.delete(url); // jangan di-cache kegagalannya, siapa tau lain kali koneksinya udah oke
      return null;
    });
  audioBlobCache.set(url, p);
  return p;
}

/* ---------------- Musik latar homepage (tombol bulat pojok kanan bawah) ----------------
   Makek lagu yang SAMA kayak playlist Instastory (dikelola admin lewat "Kelola Playlist
   Musik"), diputar ACAK (bukan urut 1,2,3,4 lagi) pakai "kantong kocok" di atas -- jadi kalau
   dibuka gak harus mulai dari lagu pertama, & gak ada 1 lagu yang nongol berkali-kali sebelum
   lagu lain kebagian. Tiap lagu cuma dimainin dari detik start-end yang udah dipotong admin di
   song trimmer -- persis kayak cara musik dimainin pas Instastory kebuka, cuma di sini muternya
   terus-terusan gonta-ganti foto. */
let bgMusicPlaying = false;
let bgMusicCurrentId = null; // id lagu yg lagi aktif (ganti dari index numerik krn urutannya sekarang acak)
let bgMusicHistory = []; // stack id lagu yg udah pernah diputar, dipakai tombol "prev" biar bener2 balik ke lagu sebelumnya
const bgMusicShuffler = createSongShuffler();
let bgMusicWasPlayingBeforeStory = false;
// FITUR BARU: toggle Acak / Berurutan (ala Spotify) khusus musik latar homepage (musik Fitur).
// Default-nya tetap ACAK kayak semula kalau nggak pernah diklik -- begitu user klik tombol
// shuffle di menu, mode-nya pindah ke Berurutan (ngikutin urutan lagu persis kayak di daftar
// "Kelola Playlist Musik"), klik lagi balik ke Acak. Pilihannya disimpen ke localStorage biar
// nempel walau halaman di-reload. Instastory TETAP murni acak selamanya, gak kesentuh fitur ini.
let bgMusicShuffleMode = true;
try {
  const savedShuffleMode = localStorage.getItem('touka_bg_music_shuffle');
  if (savedShuffleMode !== null) bgMusicShuffleMode = savedShuffleMode === '1';
} catch (e) {}
let bgMusicPendingSeekRatio = null; // simpenan posisi geser user kalau durasi lagu BARU belum kebaca pas dia geser
let bgMusicUserSoughtThisLoad = false; // true kalau user UDAH geser manual sejak lagu ini dimuat -- dicek listener 'loadedmetadata' biar gak pernah nimpa balik ke 0
let bgMusicLoadToken = 0; // penanda "muatan lagu paling baru" -- jaga2 kalau user ganti lagu cepet2 sebelum metadata lagu lama kebaca
/* ---------------- Ganti lagu = default balik ke 00:00, KECUALI user lagi mau geser ke posisi lain ----------------
   RIWAYAT SINGKAT (biar gak ada yg iseng "balikin" ke versi lama pas maintenance nanti):
   1) Awalnya lagu di-stream langsung dari URL server + di-reset currentTime pas ganti lagu.
   2) Ternyata geser (seek) ke detik tertentu SERING gagal diam-diam / balik ke 0, apalagi baru
      aja ganti lagu -- dicoba dibenerin lewat urutan event ('loadedmetadata'/'seeked') & macem2
      flag (bgMusicUserSoughtThisLoad, bgMusicPendingSeekRatio) beberapa kali, tapi tetep bolong
      di sebagian device/koneksi karena akar masalahnya BUKAN di timing kode JS, melainkan
      keandalan seek jaringan itu sendiri (server storage gak selalu ngedukung Range request
      dengan presisi & konsisten).
   3) SOLUSI FINAL: lagu didonlot jadi Blob dulu (loadAudioAsBlobUrl, di-cache per URL) SEBELUM
      dipasang ke <audio> -- begitu sumbernya udah Blob lokal, seek ke detik manapun pasti akurat
      & instan (gak butuh Range request ke server sama sekali). Flag2 dari langkah (2) di atas
      TETAP dipertahankan sebagai jaring pengaman tambahan buat jeda singkat antara src dipasang &
      'loadedmetadata' nembak (bukan lagi andalan utama). */
// BUG YANG DIPERBAIKI (musik "berhenti sendiri" pas lagu abis natural, sering kejadian pas HP
// di-background/koneksi lambat): sebelumnya fungsi ini NUNGGU donlot Blob-nya kelar SEPENUHNYA
// dulu baru masang src & mulai muter. Kalau fetch Blob itu ketunda lama/gantung (jaringan lambat,
// atau browser sengaja mbatesin fetch pas tab lagi di-background), lagu berikutnya jadi gak
// pernah mulai diputar -- kerasa kayak "musiknya berhenti sendiri" padahal sebenernya cuma
// nyangkut nunggu donlot yg gak kunjung kelar. Sekarang audio LANGSUNG dipasang & mulai diputar
// dari URL stream aslinya (gak nunggu apa-apa), donlot Blob-nya jalan di BELAKANG LAYAR buat
// nyiapin seek yg akurat -- begitu Blob-nya siap (dan masih lagu yg sama yg lagi aktif), sumber
// audio ditukar ke Blob itu SAMBIL mempertahankan posisi & status main/pause biar suaranya gak
// putus/keulang.
function bgMusicLoadTrack(track) {
  if (!track) return Promise.resolve(null);
  bgMusicCurrentId = track.id;
  const audio = document.getElementById('bg-music-audio');
  const myToken = ++bgMusicLoadToken;
  audio.pause();
  bgMusicPendingSeekRatio = null; // ganti lagu = rencana geser lama (kalau ada) udah gak relevan lagi
  bgMusicUserSoughtThisLoad = false; // belum ada geseran manual buat lagu yg baru ini
  bgMusicSeekReset(); // reset tampilan bar SEKARANG juga biar kerasa instan

  audio.removeAttribute('src');
  audio.load(); // paksa browser buang state/posisi lagu sebelumnya sepenuhnya
  audio.src = track.url; // langsung stream dari URL asli -- TIDAK nunggu Blob kelar donlot dulu
  audio.currentTime = 0;
  audio.addEventListener('loadedmetadata', function applyStartPosition() {
    if (myToken !== bgMusicLoadToken) return; // udah keburu ganti lagu lain lagi, listener ini basi -- abaikan
    if (bgMusicUserSoughtThisLoad) {
      if (bgMusicPendingSeekRatio !== null && isFinite(audio.duration) && audio.duration > 0) {
        const ratio = bgMusicPendingSeekRatio;
        bgMusicPendingSeekRatio = null;
        audio.currentTime = ratio * audio.duration;
        bgMusicSeekRender(ratio, audio.currentTime, audio.duration);
      }
      return;
    }
    audio.currentTime = 0; // belum ada geseran manual sama sekali -- default mulai dari 0:00
  }, { once: true });

  // Donlot Blob buat seek akurat, di belakang layar & TIDAK diikutin/di-await sebelum lagu mulai
  // main. Kalau gagal/gantung/lambat, lagu tetap jalan normal dari stream aslinya -- paling jelek
  // cuma seek-nya balik ke perilaku lama (kadang kurang presisi), tapi lagu PASTI tetap kedengeran.
  loadAudioAsBlobUrl(track.url).then(blobUrl => {
    if (!blobUrl || myToken !== bgMusicLoadToken) return; // udah keburu ganti lagu lain / gagal donlot, gak usah ditukar
    const wasPlaying = !audio.paused;
    const pos = audio.currentTime;
    audio.src = blobUrl;
    audio.addEventListener('loadedmetadata', function restorePosAfterBlobSwap() {
      audio.currentTime = pos;
      if (wasPlaying) audio.play().catch(() => {});
    }, { once: true });
  });

  return Promise.resolve(track);
}
/* Lagu berikutnya/sebelumnya versi Berurutan -- ngikutin urutan asli di playlist (array index),
   muter balik ke awal/akhir kalau udah nyampe ujung. Dipakai kalau bgMusicShuffleMode = false. */
function bgMusicGetSequentialTrack(direction) {
  const list = getStoryPlaylist();
  if (!list.length) return null;
  const idx = list.findIndex(s => s.id === bgMusicCurrentId);
  if (idx === -1) return list[0];
  const nextIdx = (idx + direction + list.length) % list.length;
  return list[nextIdx];
}
/* Ambil lagu berikutnya (dipanggil pas lagu abis / tombol next) -- ACAK kalau mode shuffle nyala
   (default), BERURUTAN kalau user udah matiin shuffle lewat tombolnya. Lagu yg lagi aktif tetap
   direkam ke histori dulu biar tombol "prev" bisa bener2 balik ke lagu itu. */
function bgMusicGetNextTrack() {
  const list = getStoryPlaylist();
  if (!list.length) return null;
  if (bgMusicCurrentId) bgMusicHistory.push(bgMusicCurrentId);
  if (!bgMusicShuffleMode) return bgMusicGetSequentialTrack(1);
  return bgMusicShuffler.next(list);
}
/* Tombol "prev": mode Acak balik ke lagu yg BENERAN diputar sebelumnya (dari histori). Mode
   Berurutan langsung mundur satu lagu ngikutin urutan playlist, gak perlu histori. */
function bgMusicGetPrevTrack() {
  const list = getStoryPlaylist();
  if (!list.length) return null;
  if (!bgMusicShuffleMode) return bgMusicGetSequentialTrack(-1);
  const validIds = new Set(list.map(s => s.id));
  let prevId;
  while ((prevId = bgMusicHistory.pop()) !== undefined) {
    if (validIds.has(prevId)) return list.find(s => s.id === prevId);
  }
  return bgMusicShuffler.next(list);
}

/* ---------------- Seek bar musik latar (ala Spotify) ----------------
   Cuma buat audio #bg-music-audio (musik FAB/menu Fitur). Instastory TETAP dipatok durasi
   per foto (15/30/60dtk) kayak semula, gak disentuh sama kode ini.

   Optimasi performa animasinya:
   - Posisi bar (fill & thumb) digerakin lewat CSS "transform" doang (scaleX/translate),
     BUKAN width/left -- transform itu kerjaannya di GPU compositor, gak numpang lewat
     layout/reflow, jadi mulus di refresh rate berapa pun (60/90/120Hz+) & gak bikin CPU sibuk.
   - Elemen DOM-nya di-cache sekali di awal (bukan document.getElementById berulang tiap
     render), dan lebar track cuma dibaca (getBoundingClientRect) SEKALI pas jari nyentuh
     layar (pointerdown), bukan tiap pointermove -- baca ukuran elemen berkali-kali di
     tengah gerakan itu yang namanya "layout thrashing", makanya dihindari di sini.
   - Update visual pas drag dibungkus requestAnimationFrame, jadi ngikutin ritme
     render browser (gak nembak lebih sering dari yang bisa digambar layar) & gak numpuk
     kerjaan kalau event pointermove nembak superr cepat di layar refresh rate tinggi.
   - timeupdate bawaan browser dipakai buat update normal (bukan bikin timer/interval sendiri). */
let bgSeekDragging = false;
const bgSeekEls = {
  wrap: null, fill: null, thumb: null, cur: null, tot: null, track: null,
  init() {
    this.wrap = document.getElementById('bg-music-seek-wrap');
    this.fill = document.getElementById('bg-music-seek-fill');
    this.thumb = document.getElementById('bg-music-seek-thumb');
    this.cur = document.getElementById('bg-music-time-current');
    this.tot = document.getElementById('bg-music-time-total');
    this.track = document.getElementById('bg-music-seek-track');
  }
};
bgSeekEls.init();
bgSeekEls.trackWidth = 0;
if (bgSeekEls.track) {
  // Lebar track dicache di sini & di-refresh otomatis kalau ukurannya beneran berubah (buka
  // menu pertama kali, resize layar, dll) -- BUKAN dibaca ulang (clientWidth) tiap kali bar
  // di-render, soalnya baca ukuran elemen di tengah-tengah writes lain itu bisa maksa browser
  // ngitung ulang layout (forced reflow) padahal sebagian besar saat itu ukurannya gak berubah.
  if ('ResizeObserver' in window) {
    new ResizeObserver((entries) => {
      for (const entry of entries) bgSeekEls.trackWidth = entry.contentRect.width;
    }).observe(bgSeekEls.track);
  } else {
    bgSeekEls.trackWidth = bgSeekEls.track.clientWidth;
  }
}
function bgMusicFmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function bgMusicSeekReset() {
  if (!bgSeekEls.wrap) return;
  bgSeekEls.wrap.classList.remove('hidden');
  if (bgSeekEls.fill) bgSeekEls.fill.style.transform = 'translateY(-50%) scaleX(0)';
  if (bgSeekEls.thumb) bgSeekEls.thumb.style.transform = 'translate(0px,-50%)';
  if (bgSeekEls.cur) bgSeekEls.cur.textContent = '0:00';
  if (bgSeekEls.tot) bgSeekEls.tot.textContent = '0:00';
}
function bgMusicSeekRender(ratio, currentSec, durationSec) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const trackW = bgSeekEls.trackWidth || 0;
  if (bgSeekEls.fill) bgSeekEls.fill.style.transform = 'translateY(-50%) scaleX(' + clamped + ')';
  if (bgSeekEls.thumb) bgSeekEls.thumb.style.transform = 'translate(' + (clamped * trackW) + 'px,-50%)';
  if (bgSeekEls.cur) bgSeekEls.cur.textContent = bgMusicFmtTime(currentSec);
  if (bgSeekEls.tot && isFinite(durationSec)) bgSeekEls.tot.textContent = bgMusicFmtTime(durationSec);
}
(function initBgMusicSeekBar() {
  const audio = document.getElementById('bg-music-audio');
  const track = bgSeekEls.track;
  if (!audio || !track) return;

  // timeupdate nembak berkali-kali/detik dari browser sendiri (gak nambah beban CPU kita),
  // tapi pas lagi di-drag pengguna, JANGAN ikut update posisi bar dari audio (biar gak "ketarik
  // balik" pas jari masih nempel di layar).
  audio.addEventListener('timeupdate', () => {
    if (bgSeekDragging) return;
    const dur = audio.duration;
    if (!isFinite(dur) || dur <= 0) return;
    bgMusicSeekRender(audio.currentTime / dur, audio.currentTime, dur);
  });
  audio.addEventListener('loadedmetadata', () => {
    if (bgSeekDragging) return;
    const dur = audio.duration;
    if (bgSeekEls.tot && isFinite(dur)) bgSeekEls.tot.textContent = bgMusicFmtTime(dur);
  });

  let dragTrackRect = null; // di-cache pas pointerdown, dipakai selama drag (gak baca layout tiap gerak)
  let dragRaf = null;
  let pendingRatio = 0;
  function ratioFromClientX(clientX) {
    if (!dragTrackRect || !dragTrackRect.width) return 0;
    return Math.max(0, Math.min(1, (clientX - dragTrackRect.left) / dragTrackRect.width));
  }
  // BUG YANG DIPERBAIKI: sebelumnya kalau durasi lagu belum kebaca (baru ganti lagu / jaringan
  // lambat), seekTo() cuma diem2 "return" tanpa ngapa2in -- makanya kalau diklik langsung abis
  // ganti lagu, klik-nya kerasa gak ngefek (harus diklik berkali2 sampe kebeneran pas durasi udah
  // ada). Sekarang niat geser user tetap DISIMPEN (bgMusicPendingSeekRatio) & langsung diterapin
  // begitu metadata lagu siap (lihat bgMusicLoadTrack), + tampilan bar tetap gerak ngikutin jari
  // walau detik/durasi persisnya belum diketahui.
  function seekTo(ratio) {
    bgMusicUserSoughtThisLoad = true; // tandain SEKARANG juga, apapun status durasinya -- ini yg jamin
    // listener 'loadedmetadata' di bgMusicLoadTrack gak akan nimpa balik ke 0 dalam kondisi apapun.
    const dur = audio.duration;
    if (!isFinite(dur) || dur <= 0) {
      bgMusicPendingSeekRatio = ratio;
      bgMusicSeekRender(ratio, 0, 0);
      return;
    }
    bgMusicPendingSeekRatio = null;
    bgMusicSeekRender(ratio, ratio * dur, dur);
    audio.currentTime = ratio * dur;
  }
  track.addEventListener('pointerdown', (e) => {
    if (!getStoryPlaylist().length) return;
    bgSeekDragging = true;
    dragTrackRect = track.getBoundingClientRect(); // baca layout SEKALI di awal gesture
    track.setPointerCapture(e.pointerId);
    seekTo(ratioFromClientX(e.clientX));
  });
  track.addEventListener('pointermove', (e) => {
    if (!bgSeekDragging) return;
    // Selama drag, cuma update TAMPILAN bar (lokal, gak nyentuh audio.currentTime tiap gerak).
    // Dibungkus rAF biar nempel ke ritme render browser (gak dobel-render per event kalau
    // pointermove nembak lebih cepat dari refresh rate layar) & seek beneran ke audio baru
    // kejadian pas jari dilepas. Tampilan bar tetap ngikutin jari meski durasi belum diketahui.
    pendingRatio = ratioFromClientX(e.clientX);
    if (dragRaf) return;
    dragRaf = requestAnimationFrame(() => {
      dragRaf = null;
      const dur = audio.duration;
      if (isFinite(dur) && dur > 0) bgMusicSeekRender(pendingRatio, pendingRatio * dur, dur);
      else bgMusicSeekRender(pendingRatio, 0, 0);
    });
  });
  function endDrag(e) {
    if (!bgSeekDragging) return;
    bgSeekDragging = false;
    if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
    seekTo(ratioFromClientX(e.clientX));
    dragTrackRect = null;
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', () => { bgSeekDragging = false; dragTrackRect = null; if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; } });
})();
function bgMusicSetIcon(playing) {
  updateMenuSongUI(playing);
}
/* Sinkronin baris "Music" di menu Fitur (ikon + nama lagu) sama status musik latar. */
const SONG_ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
const SONG_ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
function updateMenuSongUI(playing) {
  const icon = document.getElementById('menu-song-icon');
  const label = document.getElementById('menu-song-label');
  if (!icon || !label) return;
  icon.innerHTML = playing ? SONG_ICON_PAUSE : SONG_ICON_PLAY;
  const list = getStoryPlaylist();
  const track = list.find(s => s.id === bgMusicCurrentId);
  label.textContent = playing && track ? (track.title || 'Sedang diputar…') : 'Music';
  const playlistWrap = document.getElementById('bg-music-playlist-wrap');
  if (playlistWrap && !playlistWrap.classList.contains('hidden')) renderBgMusicPlaylist();
}
// FIX: sebelumnya kalau audio.play() gagal (lagu rusak/link putus/koneksi kepotong pas
// donlot), yang kejadian cuma toast "Gagal memutar musik, coba lagi." doang & ikon tetap
// nyangkut di posisi Play -- padahal user udah mencet, kesannya nge-bug. Sekarang kalau
// GAGAL, otomatis nyoba lompat ke lagu lain di playlist (maks 3x biar gak nyoba selama-lamanya
// kalau ternyata semua lagu/koneksinya emang bermasalah), baru kalau abis dicoba tetep gagal
// semua baru nongolin toast & ikon balik ke Play.
let bgMusicAutoSkipCount = 0;
function bgMusicTryNextOnError(failedTrack) {
  const audio = document.getElementById('bg-music-audio');
  console.error('Musik latar gagal diputar, lagu:', failedTrack && (failedTrack.title || failedTrack.url));
  bgMusicAutoSkipCount++;
  const list = getStoryPlaylist();
  const next = bgMusicGetNextTrack();
  if (bgMusicAutoSkipCount > 3 || !next || !list.length || (failedTrack && list.length <= 1)) {
    bgMusicAutoSkipCount = 0;
    bgMusicPlaying = false;
    bgMusicSetIcon(false);
    showToast('Gagal memutar musik, coba lagi.');
    return;
  }
  bgMusicLoadTrack(next).then(() => {
    if (bgMusicCurrentId !== next.id) return; // udah keburu ganti lagi, jangan ikut lanjut
    audio.play().then(() => {
      bgMusicAutoSkipCount = 0;
      bgMusicPlaying = true;
      bgMusicSetIcon(true);
    }).catch(() => bgMusicTryNextOnError(next));
  });
}
function toggleBgMusic() {
  const list = getStoryPlaylist();
  const audio = document.getElementById('bg-music-audio');
  if (!list.length) { showToast('Belum ada lagu di playlist (atur lewat menu admin "Kelola Playlist Musik").'); return; }
  if (bgMusicPlaying) {
    audio.pause();
    bgMusicPlaying = false;
    bgMusicSetIcon(false);
    return;
  }
  bgMusicAutoSkipCount = 0; // user baru aja mencet play manual -- reset hitungan percobaan lama
  const playWhenReady = (track) => {
    if (track && bgMusicCurrentId !== track.id) return; // udah keburu ganti ke lagu lain lagi, jangan ikut mulai main
    audio.play().then(() => {
      bgMusicAutoSkipCount = 0;
      bgMusicPlaying = true;
      bgMusicSetIcon(true);
    }).catch(() => bgMusicTryNextOnError(track));
  };
  if (!audio.src) {
    // Lagu pertama yang diputar di homepage disamain sama lagu yang lagi "aktif"/terakhir
    // keputar di Instastory (lastPlaylistSongId) kalau ada -- kalau enggak: ACAK (default, BUKAN
    // selalu mulai dari lagu ke-1) kecuali user udah nyalain mode Berurutan, baru mulai dari
    // lagu pertama di playlist.
    const synced = lastPlaylistSongId ? list.find(s => s.id === lastPlaylistSongId) : null;
    const track = synced || (bgMusicShuffleMode ? bgMusicShuffler.next(list) : list[0]);
    bgMusicLoadTrack(track).then(() => playWhenReady(track));
    return;
  }
  playWhenReady(null);
}
// Musik latar homepage diputar sampai BENER-BENER kelar (natural 'ended' di bawah), BEDA
// sama musik di Instastory yang sengaja dipotong start-end & diloop di rentang itu aja. Kalau
// admin ngasih titik "end" buat potongan Instastory, itu gak dipakai buat motong musik latar --
// biar pengunjung yang masih di halaman & belum refresh gak ngerasa lagunya ganti tiba-tiba
// padahal belum abis. Ganti lagu cuma kejadian kalau lagunya beneran abis (event 'ended'), &
// lagu berikutnya diambil ACAK (gak balik ke lagu yg sama sebelum semua lagu lain kebagian).
document.getElementById('bg-music-audio').addEventListener('ended', function () {
  if (!bgMusicPlaying) return;
  const next = bgMusicGetNextTrack();
  if (!next) return;
  const audioEl = this;
  bgMusicLoadTrack(next).then(() => {
    if (bgMusicCurrentId !== next.id) return; // udah keburu ganti lagi sebelum donlot ini kelar
    audioEl.play().then(() => {
      bgMusicAutoSkipCount = 0;
      bgMusicPlaying = true;
      // BUG YANG DIPERBAIKI: sebelumnya baris di bawah ini kelewat dipanggil di sini, jadi label
      // judul lagu di menu Fitur "nyangkut" ke judul lagu LAMA tiap kali lagu ganti otomatis abis
      // kelar sendiri (natural 'ended') -- padahal lagunya di baliknya udah beneran ganti. Tombol
      // prev/next manual gak kena bug ini karena bgMusicSwitchTrack (dipakainya) udah manggil ini.
      bgMusicSetIcon(true);
    }).catch(() => bgMusicTryNextOnError(next)); // lagu abis natural terus lagu SELANJUTNYA-nya ternyata rusak -- jangan diem aja, coba lompat lagi
  });
});
// FIX (masih suka muncul toast "Gagal memutar musik" walau retry-nya udah ada): retry yang lama
// cuma nangkep kegagalan pas audio.play() DIPANGGIL (promise reject-nya doang) -- kalau lagunya
// SEMPET mulai muter normal terus tiba2 putus di TENGAH jalan (koneksi kepotong, link kena
// error/CORS, dsb), itu kejadiannya lewat event 'error' bawaan elemen <audio>, yang SEBELUMNYA
// gak ada listener-nya sama sekali -- jadi lagu diem gantung, atau baru ketauan gagal pas lagu
// abis & giliran ganti ke berikutnya. Sekarang event 'error' asli ini ikut dipantau.
// BUG YANG DIPERBAIKI (revisi ke-2 -- versi pertama kemarin kepasang KETERLALU sensitif):
// Ternyata event 'error' juga bisa nembak SESAAT & GAK BERBAHAYA pas proses normal "tukar sumber
// lagu ke versi Blob" (loadAudioAsBlobUrl, buat seek akurat -- lihat bgMusicLoadTrack), yang
// CUMA kejadian pas lagu itu PERTAMA KALI diputar (belum ke-cache) -- begitu audio.src ditukar
// ke Blob-nya, itu SENDIRI otomatis pulih & lanjut muter normal lewat listener 'loadedmetadata'
// yang udah nunggu di sana. Guard versi lama (cek this.src kosong) GAK NANGKEP kasus ini, soalnya
// pas event 'error' itu beneran nembak (asinkron), audio.src UDAH KETUKAR ke sumber baru duluan
// (jadi keliatan "ada src", padahal itu efek samping pertukaran sumber yang kita sengaja, bukan
// kegagalan beneran) -- makanya lagu tetep kedengeran normal, tapi toast "Gagal memutar musik"
// & status ikon/judul telanjur nyangkut karena keburu dianggap gagal & disuruh lompat lagu.
// SOLUSI: kasih jeda dulu sebelum nganggep ini gagal beneran -- cek lagi abis jeda itu, kalau
// ternyata audio-nya UDAH LANJUT MUTER SENDIRI (gak lagi paused), berarti cuma efek samping
// sesaat tadi & aman diabaikan; baru kalau abis dijeda KETAUAN beneran masih berhenti, itu baru
// dianggap kegagalan asli & lompat ke lagu lain.
document.getElementById('bg-music-audio').addEventListener('error', function () {
  const el = this;
  if (!bgMusicPlaying) return;
  setTimeout(() => {
    if (!bgMusicPlaying || !el.paused) return; // udah lanjut muter sendiri (pulih) -- diemin aja
    const list = getStoryPlaylist();
    const track = list.find(s => s.id === bgMusicCurrentId) || null;
    bgMusicTryNextOnError(track);
  }, 400);
});
document.getElementById('menu-song-toggle').onclick = toggleBgMusic;
/* Geser ke lagu lain (prev/next) LANGSUNG main, gak perlu tap tombol play lagi -- beda
   sama sebelumnya yang cuma lanjut muter kalau pas itu emang lagi playing. "Next" ngambil lagu
   acak baru dari kantong kocok, "prev" beneran balik ke lagu yg sebelumnya diputar (dari histori). */
function bgMusicSwitchTrack(track) {
  const list = getStoryPlaylist();
  if (!list.length || !track) { showToast('Belum ada lagu di playlist (atur lewat menu admin "Kelola Playlist Musik").'); return; }
  bgMusicAutoSkipCount = 0; // user manual mencet prev/next -- reset hitungan percobaan lama
  bgMusicLoadTrack(track).then(() => {
    if (bgMusicCurrentId !== track.id) return; // udah keburu ganti ke lagu lain lagi sebelum donlot ini kelar
    document.getElementById('bg-music-audio').play().then(() => {
      bgMusicAutoSkipCount = 0;
      bgMusicPlaying = true;
      bgMusicSetIcon(true);
    }).catch(() => bgMusicTryNextOnError(track));
  });
}
document.getElementById('menu-song-prev').onclick = () => bgMusicSwitchTrack(bgMusicGetPrevTrack());
document.getElementById('menu-song-next').onclick = () => bgMusicSwitchTrack(bgMusicGetNextTrack());
/* Tombol shuffle (ala Spotify): ungu/aktif = mode Acak (default), abu-abu/nonaktif = mode
   Berurutan. Klik buat gonta-ganti, pilihannya nempel ke localStorage. */
function updateShuffleToggleUI() {
  const btn = document.getElementById('menu-song-shuffle-toggle');
  if (!btn) return;
  btn.classList.toggle('text-purple-400', bgMusicShuffleMode);
  btn.classList.toggle('text-white/70', !bgMusicShuffleMode);
  btn.title = bgMusicShuffleMode ? 'Mode: Acak (klik buat berurutan)' : 'Mode: Berurutan (klik buat acak)';
}
function toggleBgMusicShuffleMode() {
  bgMusicShuffleMode = !bgMusicShuffleMode;
  try { localStorage.setItem('touka_bg_music_shuffle', bgMusicShuffleMode ? '1' : '0'); } catch (e) {}
  updateShuffleToggleUI();
  showToast(bgMusicShuffleMode ? '🔀 Lagu diputar acak' : '➡️ Lagu diputar berurutan');
}
document.getElementById('menu-song-shuffle-toggle').onclick = toggleBgMusicShuffleMode;
updateShuffleToggleUI();
/* ---------------- FITUR BARU: daftar lagu (ala Spotify) khusus musik Fitur ----------------
   Cuma buat musik latar homepage (tombol Fitur) -- tap salah satu lagu di daftar buat LANGSUNG
   loncat ke lagu itu. Instastory TETAP murni acak sepenuhnya, gak kesentuh sama sekali oleh
   fitur ini (sesuai permintaan). Next/prev/lagu pertama pas dibuka juga TETAP acak seperti
   biasa -- daftar ini cuma jalan pintas tambahan buat yang mau milih lagu spesifik. */
function renderBgMusicPlaylist() {
  const wrap = document.getElementById('bg-music-playlist-list');
  if (!wrap) return;
  const list = getStoryPlaylist();
  if (!list.length) {
    wrap.innerHTML = `<div class="px-2 py-3 text-center text-[11px] text-white/40">Belum ada lagu di playlist.</div>`;
    return;
  }
  wrap.innerHTML = list.map(s => {
    const label = escapeHtml([s.artist, s.title].filter(Boolean).join(' · ') || s.name || 'Tanpa judul');
    const active = s.id === bgMusicCurrentId;
    return `<button onclick="bgMusicPlaySpecific('${s.id}')" class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] hover:bg-white/5 ${active ? 'font-semibold text-purple-300' : 'text-white/70'}">
      <span class="flex h-1.5 w-1.5 flex-shrink-0 rounded-full ${active && bgMusicPlaying ? 'bg-purple-400' : 'bg-transparent'}"></span>
      <span class="min-w-0 flex-1 truncate">${label}</span>
    </button>`;
  }).join('');
}
document.getElementById('menu-song-list-toggle').onclick = () => {
  const wrap = document.getElementById('bg-music-playlist-wrap');
  if (!wrap) return;
  const opening = wrap.classList.contains('hidden');
  if (opening) renderBgMusicPlaylist();
  wrap.classList.toggle('hidden', !opening);
};
/* Loncat langsung ke lagu pilihan user dari daftar. Lagu yg lagi aktif (kalau ada) tetap
   direkam ke histori dulu biar tombol "prev" abis ini bisa balik ke situ. */
function bgMusicPlaySpecific(trackId) {
  const list = getStoryPlaylist();
  const track = list.find(s => s.id === trackId);
  if (!track) return;
  if (bgMusicCurrentId && bgMusicCurrentId !== track.id) bgMusicHistory.push(bgMusicCurrentId);
  bgMusicSwitchTrack(track);
  renderBgMusicPlaylist(); // refresh highlight "lagi diputar" ke lagu yg baru dipilih
}
// Musik latar & musik Instastory jangan sampai numpuk bareng -- musik latar otomatis
// dijeda pas Instastory dibuka, terus otomatis lanjut lagi (kalau tadinya lagi nyala)
// begitu Instastory ditutup.
function pauseBgMusicForStory() {
  bgMusicWasPlayingBeforeStory = bgMusicPlaying;
  if (bgMusicPlaying) { document.getElementById('bg-music-audio').pause(); bgMusicPlaying = false; bgMusicSetIcon(false); }
}
function resumeBgMusicAfterStory() {
  if (bgMusicWasPlayingBeforeStory) { bgMusicWasPlayingBeforeStory = false; toggleBgMusic(); }
}
// Tombol "Ke atas": cuma nongol begitu halaman udah discroll ke bawah lumayan jauh.
// Di-throttle lewat requestAnimationFrame -- scroll event bisa nembak puluhan kali/detik,
// tapi browser cuma perlu ngecek/toggle class ini SEKALI per frame render, bukan tiap event.
let scrollTopBtnTicking = false;
// FIX PERFORMA SCROLL: dipakai jadi 1 listener yang ngurus DUA hal -- (1) toggle tombol "Ke atas"
// (udah ada dari dulu), dan (2) nambahin class body.is-scrolling buat "pause" animasi blob/partikel
// background sesaat pas lagi aktif discroll (lihat CSS body.is-scrolling di atas), biar GPU gak
// dipaksa nge-blend background yang gerak sama kartu transparan yang lagi digeser DI TIAP FRAME.
// isScrollingTimer di-reset tiap event scroll baru masuk -- begitu scroll BENERAN berhenti (gak ada
// event baru selama 160ms), class-nya dicabut & animasi background lanjut normal lagi.
let isScrollingTimer = null;
window.addEventListener('scroll', () => {
  if (!document.body.classList.contains('is-scrolling')) document.body.classList.add('is-scrolling');
  clearTimeout(isScrollingTimer);
  isScrollingTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 160);
  if (scrollTopBtnTicking) return;
  scrollTopBtnTicking = true;
  requestAnimationFrame(() => {
    const btn = document.getElementById('btn-scroll-top');
    if (btn) btn.classList.toggle('hidden', window.scrollY < 400);
    scrollTopBtnTicking = false;
  });
}, { passive: true });
document.getElementById('btn-scroll-top').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
let lastPlaylistSongId = null; // dipakai fitur Musik "Fitur" buat nyamain lagu pertamanya sama yg lagi aktif di story
const storySongShuffler = createSongShuffler();
/* Sebelumnya cuma ngecualiin lagu TERAKHIR yang diputar (jadi kalau playlist-nya 3-4 lagu,
   masih mungkin 1 lagu kepilih lagi 2-3x sebelum lagu lain kebagian giliran). Sekarang pakai
   "kantong kocok" yang sama kayak musik latar homepage -- lagu abis dari kantong dulu semua,
   baru dikocok ulang, jadi tiap lagu dijamin kebagian giliran secara merata. */
function getTodayPlaylistSong() {
  const pick = storySongShuffler.next(getStoryPlaylist());
  if (pick) lastPlaylistSongId = pick.id;
  return pick;
}
function renderStoryPlaylistAdminList() {
  const wrap = document.getElementById('story-playlist-admin-list');
  if (!wrap) return;
  const list = getStoryPlaylist();
  wrap.innerHTML = list.length ? list.map((s, i) => {
    const mainText = s.title || s.name || 'Lagu';
    const subText = s.artist || '';
    const durLabel = (s.start || s.end) ? `${s.start || 0}–${s.end ? s.end : 'selesai'}d` : '';
    return `
    <div class="card flex items-center gap-2.5 rounded-xl px-2.5 py-2">
      <span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/25 text-[10.5px] font-bold text-purple-300">${i + 1}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-semibold text-white/90">${escapeHtml(mainText)}</p>
        <div class="mt-0.5 flex items-center gap-1.5">
          ${subText ? `<p class="min-w-0 truncate text-[10px] text-white/45">${escapeHtml(subText)}</p>` : ''}
          ${durLabel ? `<span class="ml-auto flex-shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-300/80">${durLabel}</span>` : ''}
        </div>
      </div>
      <button onclick="removeStoryPlaylistSong('${s.id}')" title="Hapus" class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button>
    </div>`;
  }).join('') : `<p class="text-xs text-white/40">Belum ada lagu di playlist. Kalau kosong, story pakai lagu per-foto (kalau ada) atau tanpa lagu.</p>`;
}
let pendingPlaylistSongFile = null;
document.getElementById('story-playlist-admin-file').onchange = (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  pendingPlaylistSongFile = file;
  document.getElementById('story-playlist-song-name').textContent = file.name;
  document.getElementById('story-playlist-song-fields').classList.remove('hidden');
  const parsed = parseSongFilename(file.name);
  const artistInput = document.getElementById('story-playlist-song-artist');
  const titleInput = document.getElementById('story-playlist-song-title');
  if (parsed) {
    artistInput.value = parsed.artist;
    titleInput.value = parsed.title;
  } else {
    artistInput.value = '';
    titleInput.value = '';
    artistInput.placeholder = '(Nama Penyanyi)';
    titleInput.placeholder = '(Judul Lagu)';
  }
  playlistSongTrimmer.load(file);
};
function resetPlaylistSongForm() {
  pendingPlaylistSongFile = null;
  document.getElementById('story-playlist-admin-file').value = '';
  document.getElementById('story-playlist-song-name').textContent = '+ Pilih File Lagu';
  document.getElementById('story-playlist-song-fields').classList.add('hidden');
  document.getElementById('story-playlist-song-artist').value = '';
  document.getElementById('story-playlist-song-title').value = '';
  playlistSongTrimmer.reset();
  playlistSongExtras.reset();
}
document.getElementById('story-playlist-song-cancel').onclick = resetPlaylistSongForm;
document.getElementById('story-playlist-song-add').onclick = async () => {
  const file = pendingPlaylistSongFile;
  if (!file) return;
  const { start, end } = playlistSongTrimmer.getRange();
  const artist = document.getElementById('story-playlist-song-artist').value.trim();
  const title = document.getElementById('story-playlist-song-title').value.trim();
  const btn = document.getElementById('story-playlist-song-add');
  const artFile = playlistSongExtras.getArtFile();
  const badgeStyle = playlistSongExtras.getStyle();
  btn.disabled = true; btn.textContent = 'Mengunggah...';
  try {
    const rawSong = await fileToRawDataUrl(file);
    const url = await uploadImageToStorage(rawSong, `stories/playlist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
    let artUrl = null;
    if (artFile) {
      const compressedArt = await fileToDataUrl(artFile);
      artUrl = await uploadImageToStorage(compressedArt, `stories/playlistart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
    }
    const id = 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const updated = [...getStoryPlaylist(), { id, url, name: file.name, artist, title, start, end, art: artUrl, badgeStyle }];
    const ok = await saveProfile({ storyPlaylist: updated });
    if (ok) {
      profile.storyPlaylist = updated;
      resetPlaylistSongForm();
      renderStoryPlaylistAdminList(); showToast('Lagu playlist ditambahkan!');
    }
  } catch (err) {
    console.error(err);
    showToast(`Gagal mengunggah lagu: ${err.message || 'error tidak diketahui'}`);
  }
  btn.disabled = false; btn.textContent = '+ Tambah ke Playlist';
};
async function removeStoryPlaylistSong(id) {
  if (!confirm('Hapus lagu ini dari playlist?')) return;
  const updated = getStoryPlaylist().filter(s => s.id !== id);
  const ok = await saveProfile({ storyPlaylist: updated });
  if (ok) { profile.storyPlaylist = updated; renderStoryPlaylistAdminList(); showToast('Lagu playlist dihapus.'); }
}
let storyOpenedFromLink = false;
let storyTimer = null;
let storyAudioLoadToken = 0; // jaga2 kalau user geser cepet antar foto story sebelum donlot lagu foto sebelumnya kelar
let storyProgressRaf = null;
function openStoryViewer() {
  const list = getStoryImages();
  if (!list.length) return;
  pauseBgMusicForStory();
  storyIndex = list.length - 1; // buka dari foto paling baru dulu, kayak IG
  updateStoryImg();
  openModal('modal-story');
  document.body.classList.add('story-open');
  document.addEventListener('touchstart', blockEdgeSwipeBack, { passive: false });
  document.addEventListener('touchmove', blockEdgeSwipeBack, { passive: false });
  // Sama kayak link postingan: bagikan link /story, tapi begitu ditutup (X, klik profil,
  // atau tombol Back HP) alamatnya otomatis balik ke halaman utama. Selalu bikin entry "/"
  // di bawah entry "/story", baik dibuka lewat klik biasa maupun lewat link langsung.
  history.replaceState(null, '', '/');
  history.pushState(null, '', '/story');
  storyOpenedFromLink = true;
}
/* Safari iOS punya gesture bawaan "geser dari tepi layar = tombol Back" yang suka kepicu gak
   sengaja pas jari nahan (hold buat pause story) deket tepi kiri/kanan -- akibatnya story malah
   ketutup balik ke beranda padahal cuma mau di-pause. Diblokir manual selama story lagi kebuka
   (Android gak kena masalah ini jadi gak perlu diapa-apain). */
function blockEdgeSwipeBack(e) {
  if (!e.touches || !e.touches.length) return;
  const x = e.touches[0].clientX;
  if (x < 24 || x > window.innerWidth - 24) {
    if (e.cancelable) e.preventDefault();
  }
}
function closeStoryViewer() {
  stopStoryTimer();
  storyAudioLoadToken++; // batalin donlot lagu yg mungkin masih jalan, biar gak keplay abis modal ditutup
  document.removeEventListener('touchstart', blockEdgeSwipeBack);
  document.removeEventListener('touchmove', blockEdgeSwipeBack);
  const audio = document.getElementById('story-audio');
  if (audio) { audio.pause(); audio.currentTime = 0; }
  ['story-music-badge', 'story-music-disc', 'story-music-art', 'story-music-text-big'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.classList.add('hidden');
  });
  document.body.classList.remove('story-open');
  if (storyOpenedFromLink && location.pathname === '/story') {
    history.back();
  } else {
    closeModal('modal-story');
  }
  storyOpenedFromLink = false;
  markStoriesSeenNow(); // ring jadi abu-abu setelah ditonton, nyala lagi otomatis 24 jam kemudian
  resumeBgMusicAfterStory();
}
function storyStep(dir) {
  const list = getStoryImages();
  if (!list.length) return;
  storyIndex += dir;
  if (storyIndex < 0) { closeStoryViewer(); return; }
  if (storyIndex >= list.length) { closeStoryViewer(); return; }
  updateStoryImg();
}
function stopStoryTimer() {
  if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
  if (storyProgressRaf) { cancelAnimationFrame(storyProgressRaf); storyProgressRaf = null; }
}
function renderStoryDots() {
  const list = getStoryImages();
  const wrap = document.getElementById('story-dots');
  wrap.innerHTML = list.map((_, i) => `
    <span class="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
      <span data-dot="${i}" class="block h-full w-full origin-left rounded-full bg-white" style="transform:scaleX(${i < storyIndex ? 1 : 0}); will-change:transform"></span>
    </span>`).join('');
}
function updateStoryImg() {
  const list = getStoryImages();
  const s = list[storyIndex];
  if (!s) return;
  document.getElementById('story-img').src = s.url;
  renderStoryDots();
  const liked = getLikedStoryIds().has(s.id);
  const icon = document.getElementById('story-like-icon');
  icon.setAttribute('fill', liked ? '#ec4899' : 'none');
  icon.setAttribute('stroke', liked ? '#ec4899' : 'currentColor');

  // Header ala IG: foto profil, nama, waktu upload
  const picEl = document.getElementById('story-profile-pic');
  const nameEl = document.getElementById('story-profile-name');
  const timeEl = document.getElementById('story-profile-time');
  if (picEl) picEl.src = profile.logo || '';
  if (nameEl) nameEl.textContent = profile.name || 'TOUKA ENAY STR';
  if (timeEl) timeEl.textContent = s.addedAt ? storyTimeAgo(s.addedAt) : '';

  // Teks overlay di foto (kayak "Aa" Instagram) -- posisi atas/tengah/bawah, warna sesuai pilihan admin.
  const captionEl = document.getElementById('story-caption-text');
  if (captionEl) {
    if (s.caption) {
      captionEl.textContent = s.caption;
      captionEl.style.color = s.captionColor || '#ffffff';
      captionEl.style.top = ''; captionEl.style.bottom = ''; captionEl.style.transform = '';
      if (s.captionPos === 'top') { captionEl.style.top = '5.5rem'; }
      else if (s.captionPos === 'bottom') { captionEl.style.bottom = '2.5rem'; }
      else { captionEl.style.top = '50%'; captionEl.style.transform = 'translateY(-50%)'; }
      captionEl.classList.remove('hidden');
    } else {
      captionEl.classList.add('hidden');
    }
  }

  // Lagu instastory: prioritas lagu khusus foto ini, kalau gak ada pakai lagu playlist hari ini.
  // Kalau lagunya dipotong (ada songStart/songEnd atau start/end), lagu cuma muter di rentang
  // itu aja dan diulang-ulang (loop) di rentang yg sama selama fotonya masih tampil.
  const audio = document.getElementById('story-audio');
  stopStoryTimer();
  if (audio) {
    audio.pause();
    audio.ontimeupdate = null;
    const todaySong = getTodayPlaylistSong();
    const activeSong = s.song
      ? { url: s.song, start: s.songStart || 0, end: s.songEnd || null, artist: s.songArtist || '', title: s.songTitle || '', art: s.songArt || '', style: s.songBadgeStyle || 'pill' }
      : (todaySong ? { url: todaySong.url, start: todaySong.start || 0, end: todaySong.end || null, artist: todaySong.artist || '', title: todaySong.title || '', art: todaySong.art || '', style: todaySong.badgeStyle || 'pill' } : null);
    if (activeSong && activeSong.url) {
      const targetStart = activeSong.start || 0;
      const myStoryAudioToken = ++storyAudioLoadToken;
      // AKAR MASALAHNYA: nge-seek lagu yang lagi di-STREAM langsung dari server itu butuh
      // dukungan "Range request" yang presisi & konsisten dari server penyimpanan lagunya --
      // kalau enggak, browser bisa diam-diam gagal/clamp seek-nya balik ke 0, KHUSUSNYA pas
      // baru aja ganti src (belum sempat ke-buffer). Ini yang bikin perbaikan2 sebelumnya
      // (nunggu event 'seeked', nambah timeout jaring pengaman, dobel pengecekan ulang) tetep
      // gagal di sebagian lagu/koneksi -- masalahnya emang bukan di urutan/timing kode JS-nya,
      // tapi di keandalan seek jaringan itu sendiri. SOLUSI PASTINYA (lihat loadAudioAsBlobUrl):
      // donlot lagunya jadi Blob dulu SEBELUM dipasang ke <audio> -- begitu sumbernya udah Blob
      // lokal, seek ke detik manapun (sesuai potongan admin: 0:15, 0:30, 1:00, dst) PASTI akurat
      // & instan, gak ada lagi ketergantungan ke server buat ngambil posisi tertentu.
      loadAudioAsBlobUrl(activeSong.url).then(blobUrl => {
        if (myStoryAudioToken !== storyAudioLoadToken) return; // udah pindah ke foto lain, buang hasil donlot ini
        audio.removeAttribute('src');
        audio.load();
        audio.src = blobUrl || activeSong.url; // blob kalau berhasil, fallback streaming langsung kalau gagal
        audio.onloadedmetadata = () => {
          if (myStoryAudioToken !== storyAudioLoadToken) return;
          audio.currentTime = targetStart;
          audio.play().catch(() => {});
        };
        if (activeSong.end) {
          audio.ontimeupdate = () => { if (audio.currentTime >= activeSong.end) audio.currentTime = targetStart; };
        }
      });
    } else {
      audio.removeAttribute('src');
    }
    // Badge lagu (kayak sticker musik di Instastory) -- cuma muncul kalau ada lagu aktif DAN nama
    // penyanyi/judulnya sudah diisi admin. Ada 4 gaya (pil/piringan/album/teks besar), tapi cuma
    // 1 yang ditampilin sesuai gaya yang dipilih admin pas upload lagu itu -- sisanya disembunyiin.
    const pillBadge = document.getElementById('story-music-badge');
    const pillText = document.getElementById('story-music-text');
    const discBadge = document.getElementById('story-music-disc');
    const discArt = document.getElementById('story-music-disc-art');
    const artBadge = document.getElementById('story-music-art');
    const artImg = document.getElementById('story-music-art-img');
    const artText = document.getElementById('story-music-art-text');
    const textBigBadge = document.getElementById('story-music-text-big');
    [pillBadge, discBadge, artBadge, textBigBadge].forEach(el => { if (el) el.classList.add('hidden'); });
    if (pillBadge) pillBadge.classList.remove('eq-paused');
    if (discBadge) discBadge.classList.remove('eq-paused');
    if (activeSong && activeSong.url && (activeSong.artist || activeSong.title)) {
      const labelText = [activeSong.artist, activeSong.title].filter(Boolean).join(' · ');
      const style = activeSong.style || 'pill';
      if (style === 'disc' && discBadge && discArt) {
        discArt.src = activeSong.art || DEFAULT_ALBUM_ART;
        discBadge.classList.remove('hidden');
      } else if (style === 'art' && artBadge && artImg && artText) {
        artImg.src = activeSong.art || DEFAULT_ALBUM_ART;
        artText.textContent = labelText;
        artBadge.classList.remove('hidden');
      } else if (style === 'text' && textBigBadge) {
        textBigBadge.textContent = labelText;
        textBigBadge.classList.remove('hidden');
      } else if (pillBadge && pillText) {
        pillText.textContent = labelText;
        pillBadge.classList.remove('hidden');
      }
    }
  }

  // Timer otomatis pindah slide + animasi progress bar, kayak Instagram.
  // Disimpan di variabel modul (bukan lokal) supaya bisa di-pause/resume pas story ditahan (hold).
  storyDurationMs = (s.duration || STORY_DEFAULT_DURATION) * 1000;
  storyDotFill = document.querySelector(`[data-dot="${storyIndex}"]`);
  storyStartedAt = performance.now();
  storyPauseAccum = 0;
  storyPausedAt = null;
  storyRunTick();
}
let storyDurationMs = 0, storyDotFill = null, storyStartedAt = 0, storyPauseAccum = 0, storyPausedAt = null;
function storyRunTick() {
  const tick = (now) => {
    if (storyPausedAt !== null) return; // lagi ditahan, jangan lanjut ngitung/jadwal ulang
    const elapsed = now - storyStartedAt - storyPauseAccum;
    if (storyDotFill) storyDotFill.style.transform = 'scaleX(' + Math.min(1, elapsed / storyDurationMs) + ')';
    if (elapsed < storyDurationMs) {
      storyProgressRaf = requestAnimationFrame(tick);
    }
  };
  storyProgressRaf = requestAnimationFrame(tick);
  const elapsedNow = performance.now() - storyStartedAt - storyPauseAccum;
  if (storyTimer) clearTimeout(storyTimer);
  storyTimer = setTimeout(() => storyStep(1), Math.max(0, storyDurationMs - elapsedNow));
}
/* Tahan (hold) buat pause: tap biasa tetap jalan navigasi seperti biasa lewat storyStep,
   tapi kalau ditahan lebih dari sebentar, story & lagu berhenti sampai dilepas. */
let storyHoldActive = false;
let storyHoldTimeout = null;
const STORY_HOLD_DELAY = 180; // ms sebelum dianggap "nahan", bukan sekadar tap
function storyPause() {
  if (storyPausedAt !== null) return;
  storyPausedAt = performance.now();
  if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
  if (storyProgressRaf) { cancelAnimationFrame(storyProgressRaf); storyProgressRaf = null; }
  const audio = document.getElementById('story-audio');
  if (audio && audio.src) audio.pause();
  const musicBadge = document.getElementById('story-music-badge');
  if (musicBadge) musicBadge.classList.add('eq-paused');
  const discBadge = document.getElementById('story-music-disc');
  if (discBadge) discBadge.classList.add('eq-paused');
  const inner = document.getElementById('story-inner');
  if (inner) inner.classList.add('story-ui-hidden');
}
function storyResume() {
  if (storyPausedAt === null) return;
  storyPauseAccum += performance.now() - storyPausedAt;
  storyPausedAt = null;
  const audio = document.getElementById('story-audio');
  if (audio && audio.src) audio.play().catch(() => {});
  const musicBadge = document.getElementById('story-music-badge');
  if (musicBadge) musicBadge.classList.remove('eq-paused');
  const discBadge = document.getElementById('story-music-disc');
  if (discBadge) discBadge.classList.remove('eq-paused');
  const inner = document.getElementById('story-inner');
  if (inner) inner.classList.remove('story-ui-hidden');
  storyRunTick();
}
function storyPointerDown(e) {
  storyHoldActive = false;
  storyHoldTimeout = setTimeout(() => { storyHoldActive = true; storyPause(); }, STORY_HOLD_DELAY);
}
// Keputusan "ini tap biasa atau lepas dari hold" langsung diambil di sini (bukan nunggu event
// "click" dari browser) -- di iPhone, "click" suka nembak dengan timing yang gak konsisten
// setelah pointerup, jadi kalau nunggu itu, hold-nya suka kebaca salah jadi tap biasa sesaat
// dilepas (skip ke story lain / balik ke home padahal cuma mau lepas hold).
function storyPointerUp(idx) {
  clearTimeout(storyHoldTimeout);
  if (storyHoldActive) {
    storyResume();
    storyHoldActive = false;
  } else {
    storyStep(idx === 0 ? -1 : 1);
  }
}
// Jari geser keluar area / gesture dibatalkan -- cuma lepas hold (kalau lagi hold), JANGAN ikut navigasi.
function storyPointerCancel() {
  clearTimeout(storyHoldTimeout);
  if (storyHoldActive) storyResume();
  storyHoldActive = false;
}
['story-tap-prev', 'story-tap-next'].forEach((id, idx) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', storyPointerDown);
  el.addEventListener('pointerup', () => storyPointerUp(idx));
  el.addEventListener('pointerleave', storyPointerCancel);
  el.addEventListener('pointercancel', storyPointerCancel);
});
function storyTimeAgo(ts) {
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return diffMin + 'm';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + 'j';
  return Math.floor(diffH / 24) + 'h';
}
async function toggleLikeStory() {
  const list = getStoryImages();
  const s = list[storyIndex];
  if (!s) return;
  const liked = getLikedStoryIds();
  const alreadyLiked = liked.has(s.id);
  if (alreadyLiked) liked.delete(s.id); else liked.add(s.id);
  saveLikedStoryIds(liked);
  // Cuma update tampilan ikon hati -- JANGAN panggil updateStoryImg() di sini, karena itu
  // fungsi yang sama dipakai buat "buka foto story dari awal" (reset audio, progress bar,
  // timer auto-next). Mencet like harusnya gak ngaruh sama sekali ke pemutaran/progress.
  const icon = document.getElementById('story-like-icon');
  if (icon) {
    icon.setAttribute('fill', alreadyLiked ? 'none' : '#ec4899');
    icon.setAttribute('stroke', alreadyLiked ? 'currentColor' : '#ec4899');
  }
  // Jumlah like cuma disimpan ke server kalau lagi login sebagai admin -- pengunjung biasa
  // gak punya akses tulis ke tabel profile (kena row level security), jadi kalau dipaksa
  // simpan, munculnya malah toast error. Status "sudah di-like" pengunjung sendiri tetap
  // kesimpen normal per-device lewat getLikedStoryIds/saveLikedStoryIds di atas.
  if (isAdmin) {
    const counts = { ...(profile.storyLikes || {}) };
    counts[s.id] = Math.max(0, (counts[s.id] || 0) + (alreadyLiked ? -1 : 1));
    profile.storyLikes = counts;
    saveProfile({ storyLikes: counts }).catch(() => {});
  }
}
function shareStory() {
  playSfx('share');
  const url = location.origin + '/story';
  const title = `Instastory ${profile.name || 'TOUKA ENAY STR'}`;
  if (navigator.share) navigator.share({ title, url }).catch(() => {});
  else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => showToast('Link disalin!'));
}

document.getElementById('btn-add-banner').onclick = () => {
  editingBanners.push({ img: '', link: '' });
  renderBannerList();
};
document.getElementById('btn-save-banner').onclick = async () => {
  const cleaned = editingBanners.filter(b => b.img);
  const btn = document.getElementById('btn-save-banner');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  const ok = await saveProfile({ bannerSlides: cleaned });
  btn.disabled = false; btn.textContent = 'Simpan Banner';
  if (!ok) return;
  await loadProfile();
  closeModal('modal-banner');
  showToast('Banner berhasil disimpan untuk semua orang.');
};

