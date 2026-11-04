/* ---------------- Notifikasi postingan/update baru (buat visitor yang udah pernah buka web) ---------------- */
const LAST_SEEN_POST_KEY = 'touka_last_seen_post_ts';
let updateBannerShown = false;
function checkNewPostNotification() {
  if (!posts.length) return;
  const maxTs = posts.reduce((m, p) => p.hidden ? m : Math.max(m, postFreshTime(p)), 0);   // postingan tersembunyi tidak ikut dihitung
  let stored = null;
  try { stored = localStorage.getItem(LAST_SEEN_POST_KEY); } catch (e) { return; }
  if (stored === null) {
    // Belum pernah buka web ini sebelumnya — simpan baseline, jangan tampilkan notif.
    try { localStorage.setItem(LAST_SEEN_POST_KEY, String(maxTs)); } catch (e) {}
    return;
  }
  const storedTs = parseInt(stored, 10) || 0;
  if (maxTs > storedTs) {
    try { localStorage.setItem(LAST_SEEN_POST_KEY, String(maxTs)); } catch (e) {}
    if (!updateBannerShown) { updateBannerShown = true; showUpdateBanner(); }
  }
}
let updateBannerTimer = null;
function showUpdateBanner() {
  const el = document.getElementById('update-banner');
  if (!el) return;
  el.classList.remove('hidden');
  clearTimeout(updateBannerTimer);
  updateBannerTimer = setTimeout(hideUpdateBanner, 5000);
}
function hideUpdateBanner() {
  const el = document.getElementById('update-banner');
  if (!el) return;
  clearTimeout(updateBannerTimer);
  el.classList.add('hidden');
  updateBannerShown = false;
}
document.getElementById('update-banner-btn').onclick = () => {
  hideUpdateBanner();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* Cek status login admin dari token yang tersimpan di localStorage */
function subscribeAuth() {
  isAdmin = !!getAdminToken();
  renderAdminUI();
}

/* Compress an image file into a small base64 JPEG before storing it,
   so posts stay well under Firestore's 1MB document limit. */
function compressImage(file, maxDim = 1080, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('img-load-failed'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}
/* Kompres foto sebelum diupload (resize + JPEG quality). SEBELUMNYA dipatok 1600px/0.85 --
   itu yang bikin komplain "foto jadi blur/burik" pas di-zoom. Sekarang batasnya diperlonggar
   jauh (2560px, kualitas 0.96) -- pada praktiknya ini nyaris gak ada bedanya sama file asli
   buat mata (dianggap "HD"), batas 2560px cuma jaring pengaman teknis biar HP kelas bawah gak
   nge-freeze ngolah foto puluhan megapixel dari kamera HP modern jadi 1 gambar besar, BUKAN
   buat ngirit ukuran file kayak sebelumnya. */
function fileToDataUrl(file) {
  return compressImage(file, 2560, 0.96);
}
/* Baca file apa adanya jadi data URL, tanpa kompresi -- dipakai buat file non-gambar kayak lagu instastory. */
function fileToRawDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}
/* Konversi data URL -> Blob pakai fetch() bawaan browser (jauh lebih cepat & gak nge-block
   main thread dibanding loop atob manual, apalagi buat foto beresolusi tinggi). */
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}
/* Upload a compressed (data URL) image ke Cloudflare R2 lewat Worker (POST /upload, FormData). */
async function uploadImageToStorage(dataUrl, path) {
  const blob = await dataUrlToBlob(dataUrl);
  const filename = (path.split('/').pop()) || `${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', blob, filename);

  const res = await fetch(`${R2_WORKER_URL}/upload`, {
    method: 'POST',
    headers: { 'X-Upload-Secret': R2_UPLOAD_SECRET },
    body: formData
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* respons bukan JSON */ }

  if (!res.ok || !data || !data.success || !data.url) {
    const msg = (data && data.error) ? data.error : `Upload gagal (${res.status})`;
    throw new Error(msg);
  }
  return data.url;
}

/* ---------------- Fullspek Akun templates (FF ungu / ML pink) ---------------- */
// FITUR DIPERBAIKI: dulu template ini diambil dari Supabase Storage, tapi udah gak dipakai
// lagi sekarang (Supabase-nya udah gak dipakai sama sekali) -- makanya link lama gak bisa
// diakses & foto fullspek gagal ditempel diam-diam. Sekarang dipindah ke R2 Cloudflare, satu
// tempat sama semua foto postingan lain, biar gak gantung ke layanan luar lagi.
const FULLSPEK_TEMPLATES = {
  FF: {
    src: '/assets/img/template-ff.webp',
    box1: { x: 0.0610, y: 0.2161, w: 0.8812, h: 0.3255 },
    box2: { x: 0.0610, y: 0.5534, w: 0.8812, h: 0.3255 }
  },
  ML: {
    src: '/assets/img/template-ml.webp',
    box1: { x: 0.0624, y: 0.1985, w: 0.8752, h: 0.3231 },
    box2: { x: 0.0624, y: 0.5428, w: 0.8752, h: 0.3224 }
  },
  RB: {
    src: '/assets/img/template-ml.webp',
    box1: { x: 0.0624, y: 0.1985, w: 0.8752, h: 0.3231 },
    box2: { x: 0.0624, y: 0.5428, w: 0.8752, h: 0.3224 }
  }
};
function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    // Wajib: template FF/ML diambil dari domain lain (Supabase). Tanpa ini, canvas
    // jadi "tainted" pas dipakai di composeFullspekSlide -> toDataURL() bakal
    // ngelempar SecurityError, dan itu yang bikin "foto gagal diunggah".
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('template-load-failed'));
    im.src = src;
  });
}
function drawCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.width / img.height, dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
/* Gabungkan 1-2 foto ke dalam template fullspek sesuai game, hasilnya 1 gambar (1 slide).
   RESIZE KHUSUS SLIDE 2+: slide ini (dan foto stok yang udah sold out) dikompres lebih ringan
   dibanding slide 1, karena bukan foto utama yang jadi "wajah" postingan -- ini murni buat
   ngirit ukuran file/bandwidth. Slide 1 TIDAK lewat fungsi ini sama sekali, jadi kualitasnya
   nggak kepengaruh (tetap fileToDataUrl 2560px/0.96 seperti biasa). */
// Cache template yang udah kebuka, biar gak fetch ulang tiap slide (hindari rate-limit R2 dev URL
// -- dulu tiap slide fetch ulang file 1MB+ yang sama, kalau fotonya banyak/banyak slide jadi
// gampang kena limit "This URL is rate-limited" dari R2 Public Development URL & bikin
// sebagian slide gagal ditempel dengan error "template-load-failed").
const _fullspekTplCache = {};
async function getFullspekTemplateImg(game) {
  if (_fullspekTplCache[game]) return _fullspekTplCache[game];
  const tpl = FULLSPEK_TEMPLATES[game] || FULLSPEK_TEMPLATES.FF;
  const img = await loadImageEl(tpl.src);
  _fullspekTplCache[game] = img;
  return img;
}
async function composeFullspekSlide(game, dataUrl1, dataUrl2) {
  const tpl = FULLSPEK_TEMPLATES[game] || FULLSPEK_TEMPLATES.FF;
  const tplImg = await getFullspekTemplateImg(game);
  const w = tplImg.naturalWidth, h = tplImg.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Foto ditempel DULUAN (di belakang), baru template/poster digambar PALING ATAS (di depan).
  // Sengaja gini karena beberapa elemen dekorasi di template (maskot pojok, badge rank, teks
  // "TOUKA STORE") posisinya nempel dikit ke pinggir kotak foto -- kalau foto ditaruh di atas
  // (di depan) malah nutupin dekorasi itu. Dengan foto di belakang, dekorasi template tetap
  // full kelihatan nutupin foto secara wajar di area yang overlap.
  const img1 = await loadImageEl(dataUrl1);
  drawCover(ctx, img1, tpl.box1.x * w, tpl.box1.y * h, tpl.box1.w * w, tpl.box1.h * h);
  if (dataUrl2) {
    const img2 = await loadImageEl(dataUrl2);
    drawCover(ctx, img2, tpl.box2.x * w, tpl.box2.y * h, tpl.box2.w * w, tpl.box2.h * h);
  }
  ctx.drawImage(tplImg, 0, 0, w, h);

  // Resize hasil akhir ke lebar maksimal 1080px (kalau template aslinya lebih lebar dari itu)
  // + turunin quality JPEG ke 0.75. Ini beda dari slide 1 yang sengaja dijaga tetap HD.
  const SLIDE2_MAX_W = 1080;
  const SLIDE2_QUALITY = 0.75;
  if (w > SLIDE2_MAX_W) {
    const outH = Math.round(h * SLIDE2_MAX_W / w);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = SLIDE2_MAX_W; outCanvas.height = outH;
    outCanvas.getContext('2d').drawImage(canvas, 0, 0, SLIDE2_MAX_W, outH);
    return outCanvas.toDataURL('image/jpeg', SLIDE2_QUALITY);
  }
  return canvas.toDataURL('image/jpeg', SLIDE2_QUALITY);
}

/* ---------------- Toast ---------------- */
let toastTimer;
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
function showToast(msg, duration, variant) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.toggle('toast-yellow', variant === 'yellow');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), duration || 2200);
}
// Toast dengan tombol "Urungkan" -- dipakai buat aksi yang gampang gak sengaja (kayak swipe
// kanan nambah ke Wishlist). Beda dari showToast biasa (ganti innerHTML biar bisa nampung
// tombolnya), tapi tetep pakai elemen #toast & toastTimer yang sama.
function showUndoToast(msg, onUndo, duration) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${escapeHtml(msg)}</span> <button type="button" id="toast-undo-btn" class="ml-2 font-bold text-purple-300 underline underline-offset-2">Urungkan</button>`;
  t.classList.remove('hidden');
  t.classList.remove('toast-yellow');
  clearTimeout(toastTimer);
  document.getElementById('toast-undo-btn').onclick = (e) => {
    e.stopPropagation();
    onUndo();
    t.classList.add('hidden');
    clearTimeout(toastTimer);
  };
  toastTimer = setTimeout(() => t.classList.add('hidden'), duration || 3200);
}

/* ---------------- Efek suara halus (micro sound-fx) ---------------- */
/* Nada pendek yang di-generate langsung lewat Web Audio API (BUKAN file audio yang diupload/
   dihosting) -- jadi ringan, gak nambah request/loading, dan bunyinya konsisten di semua HP.
   Defaultnya NYALA, disimpan preferensinya per-browser di localStorage. Ada toggle "Efek Suara"
   di menu Fitur buat matiin kalau ganggu. */
let soundFxEnabled = true;
try { soundFxEnabled = localStorage.getItem('touka_sound_fx') !== '0'; } catch (e) {}
let sfxAudioCtx = null;
let sfxMasterBus = null; // GainNode tempat SEMUA oscillator nyambung, sebelum lanjut ke compressor -> speaker
// FIX (suara sfx kedengeran "pecah"/patah-patah/kurang enak): sebelumnya tiap oscillator nyambung
// LANGSUNG ke ctx.destination dengan gain sampai 1.5 per nada + lapisan "klik tactile" gain 0.5 di
// atasnya. Begitu beberapa nada ini bunyi BARENGAN (semua preset "notes", kayak buy/share/gameSwitch),
// jumlah gelombangnya gampang ngelewatin batas [-1,1] yang sanggup diputer -> KLIP/distorsi digital,
// itu penyebab utama kedengeran pecah/kasar. Sekarang semua oscillator disalurin lewat SATU bus
// bareng (masterGain -> DynamicsCompressor) sebelum ke speaker -- compressor otomatis "ngerem" pas
// sinyalnya numpuk, jadi tetep kenceng & jelas tapi gak klip lagi.
function getSfxCtx() {
  if (sfxAudioCtx) return sfxAudioCtx;
  try {
    // latencyHint 'playback' = buffer audio lebih besar, jauh lebih jarang putus/patah-patah saat HP lagi sibuk menggambar (tunda bunyi cuma beberapa ms).
    try { sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }); }
    catch (e0) { sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    const comp = sfxAudioCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-16, sfxAudioCtx.currentTime);
    comp.knee.setValueAtTime(22, sfxAudioCtx.currentTime);
    comp.ratio.setValueAtTime(14, sfxAudioCtx.currentTime);
    comp.attack.setValueAtTime(0.002, sfxAudioCtx.currentTime);
    comp.release.setValueAtTime(0.14, sfxAudioCtx.currentTime);
    comp.connect(sfxAudioCtx.destination);
    const master = sfxAudioCtx.createGain();
    master.gain.setValueAtTime(0.85, sfxAudioCtx.currentTime);
    master.connect(comp);
    sfxMasterBus = master;
  } catch (e) { sfxAudioCtx = null; sfxMasterBus = null; }
  return sfxAudioCtx;
}
// Isi bunyi tiap aksi (nada, urutan, paket yang dipilih admin) ada di 36-sfx-paket.js -- playSfx() di bawah cuma menyiapkan AudioContext lalu memanggil sfxPackPlay().
// FIX (di HP Android kadang sebagian sfx gak kedengeran sama sekali, bukan cuma soal kecil):
// ini bug KLASIK kebijakan autoplay browser mobile -- AudioContext WAJIB "dibuka kunci" oleh
// sentuhan/klik ASLI dari user dulu sebelum boleh bunyi (Chrome Android & WebView khususnya
// ketat soal ini). Sebelumnya kita cuma ngandelin tiap playSfx() manggil ctx.resume() sendiri2
// pas kepake -- MASALAHNYA kalau resume() itu kepanggil BUKAN persis di sentuhan PERTAMA
// (misal ada sedikit gap/async di antaranya), sebagian browser Android nolak buka context-nya &
// diem-diem gagal terus selamanya buat SISA sesi itu, walau gak ada error keliatan sama sekali
// -- itu yang bikin kerasa "kadang muncul kadang enggak" secara acak. Sekarang context-nya
// dipaksa dibuka SEDINI & SELANGSUNG mungkin, nempel di event sentuhan PERTAMA APAPUN di
// seluruh halaman (touchend paling reliable buat "unlock" di iOS/Android dibanding touchstart).
(function setupAudioUnlockOnFirstTouch() {
  const unlock = () => {
    const ctx = getSfxCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    document.removeEventListener('touchend', unlock);
    document.removeEventListener('mousedown', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('mousedown', unlock);
  document.addEventListener('keydown', unlock);
})();
// FIX (suara sfx kedengeran patah-patah): sebelumnya begitu ctx lagi 'suspended' (lumrah kejadian
// di HP -- browser auto-suspend AudioContext yang nganggur), kita langsung ngejadwalin semua nada
// pake ctx.currentTime SEKARANG JUGA sambil manggil resume() di background TANPA nunggu. Masalahnya
// resume() itu ASYNC -- begitu context-nya beneran aktif lagi (bisa beberapa puluh/ratus ms
// kemudian), currentTime udah maju duluan ngelewatin waktu yang tadi dijadwalin, jadi nada2-nya
// numpuk/kepotong pas dimainin bareng -- itu yang kerasa "patah-patah". Sekarang kalau ctx lagi
// suspended, nada BARU dijadwalin SETELAH resume() beneran selesai (currentTime diambil ulang saat
// itu juga, bukan yang lama), biar timing-nya presisi & suaranya mulus lagi.
// FIX suara dobel: satu klik kadang memicu playSfx() 2x (mis. tab game bunyi sendiri lalu .click() tombol game bunyi lagi).
// Sekarang bunyi yang sama dalam 250ms dibuang, dan bunyi apa pun dalam 70ms dibuang, jadi 1 aksi = 1 suara.
let _sfxLastAt = 0, _sfxLastKind = '';
function playSfx(kind) {
  if (!soundFxEnabled) return;
  const nowT = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const gap = nowT - _sfxLastAt;
  if (gap < 25 || (kind === _sfxLastKind && gap < 120)) return;
  _sfxLastAt = nowT; _sfxLastKind = kind;
  // Biar klik terasa lancar: animasi latar (glow & partikel) dijeda ~0,5 detik tiap ada klik, jadi HP fokus menggambar kartu/popup & suara tidak tersendat.
  if (kind !== 'swipe') {
    try {
      const rt = document.documentElement; rt.classList.add('tk-scrolling');
      clearTimeout(window._tkPauseT);
      window._tkPauseT = setTimeout(() => rt.classList.remove('tk-scrolling'), 500);
    } catch (e) {}
  }
  const ctx = getSfxCtx();
  if (!ctx) return;
  const schedule = () => {
    try {
      if (typeof sfxPackPlay === 'function') sfxPackPlay(kind, ctx, ctx.currentTime);
    } catch (e) { /* diemin, gak kritis */ }
  };
  if (ctx.state === 'suspended') ctx.resume().then(schedule).catch(() => {});
  else schedule();
}
function updateSoundFxMenuLabel() {
  const el = document.getElementById('sound-fx-label');
  if (el) el.textContent = soundFxEnabled ? 'Efek Suara: Nyala' : 'Efek Suara: Mati';
}
function toggleSoundFx() {
  soundFxEnabled = !soundFxEnabled;
  try { localStorage.setItem('touka_sound_fx', soundFxEnabled ? '1' : '0'); } catch (e) {}
  updateSoundFxMenuLabel();
  if (soundFxEnabled) playSfx('tap');
  showToast(soundFxEnabled ? '🔊 Efek suara dinyalain' : '🔇 Efek suara dimatiin');
}

/* Penjelasan singkat kalau badge SOLD OUT di-klik — dibuat toast biar tampilannya nggak menuhin layar.
   (Sebelumnya toast ini cuma nongol SEKALI per sesi browser gara-gara flag sessionStorage, jadi abis
   diklik sekali, klik-klik berikutnya kelihatan kayak nggak ngefek/error. Sekarang toast selalu
   muncul tiap kali badge-nya diklik.) */
function showSoldOutInfo(e) {
  if (e) e.stopPropagation();
  showToast('AKUN SUDAH DIBELI / TERJUAL.', 2600);
}
function showVerifiedInfo(e) {
  if (e) e.stopPropagation();
  showToast('✓ Akun sudah terverifikasi', 2200);
}

