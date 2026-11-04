function tkBootDone() { try { requestAnimationFrame(function () { requestAnimationFrame(function () { document.documentElement.classList.remove('tk-boot'); }); }); } catch (e) { document.documentElement.classList.remove('tk-boot'); } }
console.log('%c[touka-store build: cloudflare-only-v1]', 'color:#a855f7;font-weight:bold');
/* ---------------- Cloudflare Worker setup (database, auth, gambar semua lewat sini) ---------------- */
const R2_WORKER_URL = 'https://touka-api.nayyprib.workers.dev';
const R2_UPLOAD_SECRET = 'tka9xpR2k7Lm3';
const ADMIN_TOKEN_KEY = 'touka_admin_token';

const backendReady = true;
function getAdminToken() { try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; } }
function setAdminToken(t) { try { if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t); else localStorage.removeItem(ADMIN_TOKEN_KEY); } catch (e) {} }
async function apiFetch(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (opts.admin) headers['X-Admin-Token'] = getAdminToken();
  const res = await Promise.race([
    fetch(`${R2_WORKER_URL}${path}`, { method: opts.method || 'GET', headers, body: opts.body }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
  ]);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Error ${res.status}`);
  return data;
}

const defaultProfile = {
  name: 'TOUKA ENAY STR',
  subtitle: 'Jual Beli Akun & Rental FF ML',
  subtitle2: 'Pusat akun gacor, aman, dan terpercaya',
  verifyLabel: 'Cek keaslian admin di',
  verifyText: 'linktr.ee/enayjb',
  verifyUrl: 'https://linktr.ee/enayjb',
  logo: 'https://gtuixdincqykjpgwefmj.supabase.co/storage/v1/object/public/touka-images/assets/logo.jpeg',
  waJual: '6289519103394',
  waRekber: '6289520835165',
  chStok: 'https://whatsapp.com/channel/0029VaxzZuCAInPs2yL05N1P',
  chRental: 'https://whatsapp.com/channel/0029VbCQbd3FCCoa4lZGLP00',
  topupLabel: 'Topup resmi via',
  topupText: 'toukatopup.id',
  topupUrl: 'https://toukatopup.id/',
  ffTags: [{ v: 'FF_0_500K', l: '0-500K' }, { v: 'FF_501_1JT', l: '501-999K' }, { v: 'FF_1JT_PLUS', l: '1JT+++' }],
  mlTags: [{ v: 'ML_READY', l: 'ML READY' }],
  rbTags: [{ v: 'RB_READY', l: 'ROBLOX READY' }],
  rentalGames: [
    { v: 'FF', l: 'Free Fire' },
    { v: 'ML', l: 'Mobile Legends' }
  ],
  rentalTagsByGame: {
    FF: [
      { v: 'RENTAL_7K', l: '7K/Jam' },
      { v: 'RENTAL_8K', l: '8K/Jam' },
      { v: 'RENTAL_10K', l: '10K/Jam' },
      { v: 'RENTAL_16K', l: '16K/Jam' },
      { v: 'RENTAL_25K', l: '25K/Jam' }
    ],
    ML: [
      { v: 'RENTAL_ML_READY', l: 'Ready' }
    ]
  },
  ffShowAllReady: true,
  mlShowAllReady: true,
  ffShowSoldOut: true,
  mlShowSoldOut: true,
  ffShowDiskon: true,
  mlShowDiskon: true,
  // Kategori SG khusus FF (chip filter tambahan + kategori di form Stok) -- bisa dimatiin
  // total oleh admin (ffSgCategoryEnabled), dan daftar kategorinya sendiri bisa diubah/tambah/
  // hapus lewat "Kelola Kategori" (mirip kategori nominal FF/ML).
  ffSgCategoryEnabled: true,
  ffSgCategories: ['REPPER', 'OPM', 'LUMUT', 'SG EVO', 'METEOR', 'GURUN', 'SG DIGIMON', 'LAINNYA'],
  // Kategori SG versi Rental -- chip filter kecil tambahan di homepage, ditaruh DI BAWAH chip
  // kategori harga Rental (lihat renderRentalSgFilter), dan jadi opsi tag multi-select di form
  // tambah/edit postingan Rental (lihat renderRentalSgBtns). Kosong secara default: chip-nya
  // otomatis nyembunyi diri sampai admin nambah minimal 1 kategori lewat "Kelola Kategori".
  rentalSgCategoryEnabled: true,
  rentalSgCategories: [],
  bannerSlides: [],
  testimoniUrl: 'https://whatsapp.com/channel/0029Vb7aTR3IyPtNR09EfZ3t',
  navLabels: {
    waJual: 'WA Jual/Beli',
    waRekber: 'WA Rekber',
    chStok: 'Saluran Stok',
    chRental: 'Saluran Rental',
    topup: 'Topup All GAME',
    testimoni: 'Testimoni'
  },
  rentalDurationTypes: [
    { key: 'hour', label: '1 JAM', waLabel: '1 jam' },
    { key: 'pakmal', label: 'PAKET MALEM', waLabel: 'pakmal', note: 'Tersedia Mulai Pukul 21:00 - 08:00' },
    { key: 'day', label: '1 HARI', waLabel: '1 hari', badge: 'Lebih Hemat' }
  ],
  /* Teks peringatan yang muncul di bawah harga tiap postingan rental. Admin bisa ubah atau
     dikosongin lewat menu Profil -- kalau dikosongin, blok peringatan ini gak akan ditampilkan sama sekali. */
  rentalNotice: '– sebelum main akun, wajib logoutin all perangkat di FF, biar ga tabrakan sama perental sebelumnya.\n– kalau waktu rental udah habis, segera logout dari akun Google maupun FF-nya.\n– waktu rental dihitung dari waktu saat login ke akun Google.',
  /* Instastory: foto-foto ini PERMANEN (gak ilang 24 jam kayak IG asli), admin bisa nambah/hapus
     lewat menu Kelola Instastory. Urutan array = urutan tampil (paling akhir = paling baru). */
  storyImages: [],
  storyLikes: {},
  storyPlaylist: [],
  // Jumlah kolom grid postingan di homepage, bisa diatur admin lewat menu Profil.
  gridCols: { stok: 3, rental: 2 },
  // Warna gradien kartu stok/rental pas ditekan/di-zoom (foto & teks), bisa diganti admin lewat
  // color picker di menu Profil. Kosong ('') = pakai default kuning keemasan (lihat CSS var
  // --card-glow-rgb & applyCardGlowColor()).
  cardPressGradientColor: '',
  // Halaman Link Bio (toukaenay.com/info) -- gaya Linktree: foto profil, nama+verified,
  // counter klik pengunjung, toggle musik, dan daftar tombol link yang bisa diatur admin.
  linkbio: {
    name: 'TOUKA ENAY STORE',
    avatarUrl: 'https://gtuixdincqykjpgwefmj.supabase.co/storage/v1/object/public/touka-images/assets/logo.jpeg',
    verified: true,
    musicUrl: '',
    musicStart: 0,
    musicEnd: null,
    musicPlaylist: [], // playlist musik baru (array {url,start,end}) -- musicUrl di atas cuma dipakai buat migrasi data lama, lihat linkbioComputePlaylist()
    bgColor: '',
    boxColor: '',
    textColor: '',
    links: [
      { id: 'lb1', icon: '🛒', label: 'WEBSITE BELI AKUN & RENTAL', url: 'https://toukaenay.com', active: true },
      { id: 'lb2', icon: '💎', label: 'TOP UP ALL GAME 24 JAM', url: 'https://toukatopup.id', active: true },
      { id: 'lb3', icon: '📦', label: 'SALURAN UTAMA STOK', url: 'https://whatsapp.com/channel/0029VaxzZuCAInPs2yL05N1P', active: true },
      { id: 'lb4', icon: '🎮', label: 'SALURAN RENTAL FF', url: 'https://whatsapp.com/channel/0029VbCQbd3FCCoa4lZGLP00', active: true }
    ]
  }
};

let profile = { ...defaultProfile };
let profileLoaded = false;
let posts = [];
let isAdmin = false;

/* Nomor WA tombol "Beli Sekarang" & Rental: selalu WA JB; kalau kosong jatuh ke WA Rekber. */
function getBeliWaNumber() {
  return profile.waJual || profile.waRekber || '';
}
/* Save profile ke Worker (D1) */
async function saveProfile(p) {
  const merged = { ...profile, ...p };
  const size = JSON.stringify(merged).length;
  if (size > 950000) {
    showToast('Foto profil terlalu besar, coba foto lain.');
    return false;
  }
  try {
    await apiFetch('/api/profile', { method: 'POST', admin: true, body: JSON.stringify(merged) });
    return true;
  } catch (e) {
    console.error(e);
    showToast(e.message === 'timeout'
      ? 'Gagal menyimpan: koneksi lambat / timeout. Coba lagi.'
      : `Gagal menyimpan profile ke server: ${e.message || 'error tidak diketahui'}`);
    return false;
  }
}
/* Save (add/update) one post ke Worker (D1) */
async function savePostRemote(post) {
  const size = JSON.stringify(post).length;
  if (size > 950000) {
    showToast('Foto terlalu besar (>1MB total). Kurangi jumlah foto atau pakai foto lain.');
    return false;
  }
  try {
    await apiFetch('/api/posts', { method: 'POST', admin: true, body: JSON.stringify(post) });
    return true;
  } catch (e) {
    console.error(e);
    showToast(e.message === 'timeout'
      ? 'Gagal menyimpan: koneksi lambat / timeout. Coba lagi.'
      : `Gagal menyimpan postingan ke server: ${e.message || 'error tidak diketahui'}`);
    return false;
  }
}
/* Delete one post dari Worker (D1) — admin only */
async function deletePostRemote(id) {
  try {
    await apiFetch(`/api/posts?id=${encodeURIComponent(id)}`, { method: 'DELETE', admin: true });
    return true;
  } catch (e) {
    console.error(e);
    showToast(e.message === 'timeout'
      ? 'Gagal menghapus: koneksi lambat / timeout. Coba lagi.'
      : `Gagal menghapus postingan dari server: ${e.message || 'error tidak diketahui'}`);
    return false;
  }
}
/* Ambil data profile dari Worker (D1) */
/* BUGFIX (race condition API overlap): loadProfile() bisa kepanggil dari BANYAK sumber
   bebarengan -- polling 30 detik, balik fokus tab/app, abis simpan profil di admin, dst.
   Kalau ada 2 request "nyusul" (request lama belum kelar, request baru udah jalan lagi) dan
   jaringan bikin urutan balesannya kebalik (yang lebih baru malah nyampe duluan, yang lebih
   lama nyusul belakangan), TANPA guard di bawah ini balesan yang LAMA bisa nimpa balesan yang
   lebih BARU begitu dia akhirnya nyampe -- profil jadi keliatan "mundur"/gak sinkron sesaat.
   Fix: tiap kali loadProfile() dipanggil sebagai request BARU (bukan lanjutan retry dari
   panggilan sebelumnya), nomor urut globalnya (profileFetchSeq) dinaikin -- balesan cuma
   dipakai kalau nomor urutnya masih yang PALING BARU pas itu selesai. */
let profileFetchSeq = 0;
async function loadProfile(retriesLeft = 3, seq) {
  if (seq === undefined) seq = ++profileFetchSeq;
  let data;
  try {
    data = await apiFetch('/api/profile');
  } catch (error) {
    console.error(error);
    if (seq !== profileFetchSeq) return; // udah kesusul request yang lebih baru, gak usah lanjut retry
    if (retriesLeft > (profileLoaded ? 2 : 0)) { setTimeout(() => loadProfile(retriesLeft - 1, seq), 2000); return; }
    // Semua percobaan gagal (jaringan/server lagi bermasalah) -- SEBELUMNYA di titik ini fungsi
    // cuma "return" diem-diem tanpa nampilin apa-apa, jadi kalau ini kejadian pas lagi di /info,
    // halamannya nge-blank kosong total (nunggu profil yang gak kunjung dateng) sampai koneksi
    // pulih sendiri di polling 30 detik berikutnya. Sekarang begitu gagal, langsung pakai profil
    // BAWAAN (nama/logo default dkk, sudah ke-assign dari awal di variabel `profile`) biar
    // halaman tetap keisi/kebuka -- begitu koneksi pulih, polling berikutnya otomatis ganti ke
    // data asli.
    finishProfileLoad();
    return;
  }
  if (seq !== profileFetchSeq) return; // balesan ini udah basi, ada request lebih baru yang menang
  // Data sama persis dengan polling sebelumnya -> gak usah render ulang (banner/tag/dll gak
  // di-reset tiap 30 detik).
  let sig = '';
  try { sig = data && data.data ? JSON.stringify(data.data) : ''; } catch (e) {}
  if (profileLoaded && sig && sig === lastProfileSig) return;
  lastProfileSig = sig;
  profile = data && data.data ? { ...defaultProfile, ...data.data } : { ...defaultProfile };
  // Simpan data terakhir yang berhasil dimuat; dipakai buat tampil instan pas buka/refresh
  // berikutnya & jadi cadangan kalau jaringan lambat/gagal (selalu di-refresh dari server).
  try { if (sig && sig.length < 1500000) localStorage.setItem(PROFILE_CACHE_KEY, sig); } catch (e) {}
  finishProfileLoad();
}
const PROFILE_CACHE_KEY = 'touka_profile_cache_v1';
let lastProfileSig = '';
function applyCachedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached !== 'object') return;
    lastProfileSig = raw;
    profile = { ...defaultProfile, ...cached };
    finishProfileLoad();
  } catch (e) {}
}
function finishProfileLoad() {
  profileLoaded = true;
  renderProfile();
  renderTags();
  renderRentalGames();
  renderRentalTags();
  renderNominalBtns();
  renderLinkBio();
  // /info (Link Bio) & /story cuma butuh data PROFIL buat langsung ditampilin -- beda sama
  // rute lain (link postingan) yang butuh daftar STOK (posts) dulu buat nyari postingan yang
  // dimaksud. Sebelumnya kedua rute ini ikut nunggu loadPosts() kelar (lihat guard
  // initialRouteHandled di situ) -- padahal gak butuh data itu sama sekali. Kalau API stok lagi
  // lemot/gagal (bisa kena timeout 15 detik x beberapa kali percobaan), /info jadi ikut
  // nge-hang/nge-blank lama padahal harusnya bisa langsung nongol begitu profil kebaca. Makanya
  // di sini rutenya langsung dicoba SEKALI lebih awal, cuma buat 2 path yang aman ini.
  if (!initialRouteHandled) {
    const earlyPath = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();
    if (earlyPath === 'info' || earlyPath === 'story') {
      initialRouteHandled = true;
      handlePathRoute();
    }
  }
}
let postsLoadFailed = false;
let initialRouteHandled = false;
/* ---------------- BUG YANG DIPERBAIKI: Disukai kerasa "nggak nambah" pas ada yang like bareng ----------------
   toggleLikePost SUDAH atomik di server (likes beneran nambah di database walau 2 orang like
   bareng persis), TAPI: kalau kamu lagi STAY di modal detail postingan itu, terus orang LAIN
   yang nge-like postingan yang lagi kamu liatin -- loadPosts() yang jalan tiap 30 detik
   (polling, lihat subscribeFirestore) cuma nge-refresh grid stok/rental (renderStok/
   renderRental), TAPI angka di dalam modal detail yang lagi kebuka (id="stat-likes-…") gak
   ikut disegarkan -- jadi keliatannya "nggak nambah" padahal di database udah nambah, cuma
   tampilan kamu yang basi/gak sinkron. Fungsi ini nyegerin ulang angka Disukai yang lagi
   ketampil di layar (modal detail yang lagi kebuka) tiap kali ada refresh data dari server --
   jadi begitu ada yang nge-like bareng, angkanya ikut update live tanpa perlu reload manual. */
function syncVisibleCounts() {
  posts.forEach(p => {
    const statLikes = document.getElementById('stat-likes-' + p.id);
    if (statLikes) statLikes.textContent = formatCompactCount(p.likes || 0);
  });
}
/* BUGFIX (race condition API overlap) -- sama persis kayak loadProfile() di atas: loadPosts()
   juga dipanggil dari banyak sumber bebarengan (polling, fokus tab, abis simpan/edit/hapus
   postingan, tombol "Coba Lagi"). Nomor urut global (postsFetchSeq) mastiin balesan yang udah
   basi (ada request lebih baru yang jalan belakangan) gak nimpa data `posts` yang lebih baru. */
let postsFetchSeq = 0;
let lastPostsSig = '';
async function loadPosts(retriesLeft = 3, seq) {
  if (seq === undefined) seq = ++postsFetchSeq;
  let data;
  try {
    data = await apiFetch('/api/posts');
  } catch (error) {
    console.error(error);
    if (seq !== postsFetchSeq) return; // udah kesusul request yang lebih baru, gak usah lanjut retry
    // Data dari server (boot) sudah tampil: gagal menyegarkan di belakang layar tidak perlu diulang 3x (membebani HP di jaringan yang
    // memblokir workers.dev); cukup 1x ulang, berikutnya menunggu polling.
    if (retriesLeft > (posts.length > 0 ? 2 : 0)) { setTimeout(() => loadPosts(retriesLeft - 1, seq), 2000); return; }
    // Semua percobaan gagal (koneksi bener2 bermasalah). Kalau sudah ada postingan yang pernah
    // berhasil dimuat, pertahankan itu (jangan diganti layar error). Layar error + tombol coba
    // lagi cuma muncul kalau memang belum ada data sama sekali.
    if (posts.length > 0) { postsLoaded = true; tkBootDone(); return; }
    postsLoadFailed = true;
    postsLoaded = true; tkBootDone();
    renderStok(); renderRental();
    markFirstLoadAnimDone();
    if (!initialRouteHandled) { initialRouteHandled = true; handleHash(); handlePathRoute(); }
    return;
  }
  if (seq !== postsFetchSeq) return; // balesan ini udah basi, ada request lebih baru yang menang
  postsLoadFailed = false;
  // Data sama persis dengan yang sudah tampil -> lewati render ulang seluruh grid.
  let psig = '';
  try { psig = JSON.stringify((data && data.data) || []); } catch (e) {}
  if (postsLoaded && psig && psig === lastPostsSig) return;
  lastPostsSig = psig;
  posts = (data && data.data) || [];
  sortPosts();
  postsLoaded = true; tkBootDone();
  renderStok(); renderRental();
  syncVisibleCounts(); // lihat komentar di definisinya
  markFirstLoadAnimDone();
  checkNewPostNotification();
  // Routing berdasarkan URL (buka detail dari link yang dibagikan) cuma boleh jalan SEKALI
  // pas app pertama kali dibuka. loadPosts() sendiri dipanggil berkali-kali (habis simpan
  // postingan, window balik fokus, dll) -- kalau handleHash/handlePathRoute ikut dipanggil
  // tiap kali itu, address bar yang lagi "nyangkut" di URL postingan (misal abis buka detail)
  // bakal bikin app auto-lompat balik ke detail postingan itu, padahal user lagi nambah/edit
  // postingan lain. Makanya di-guard biar cuma jalan sekali di awal.
  if (!initialRouteHandled) {
    initialRouteHandled = true;
    handleHash();
    handlePathRoute();
  }
}
// Urutan: yang disematkan naik ke paling atas, sisanya dari yang paling baru diposting.
/* Waktu "baru" sebuah postingan = yang paling akhir antara waktu dibuat (createdAt) dan waktu terakhir DITAMPILKAN ke publik
   (shownAt, diisi otomatis saat postingan yang tadinya disembunyikan ditampilkan). Jadi stok yang lama disembunyikan lalu dibuka
   dihitung sebagai NEW STOK dan naik ke atas. Dipakai badge NEW STOK, urutan "Terbaru", acak tab Semua, dan notifikasi postingan baru. */
function postFreshTime(p) { return Math.max((p && p.createdAt) || 0, (p && p.shownAt) || 0); }
function sortPosts() {
  posts.sort((a, b) => {
    const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return postFreshTime(b) - postFreshTime(a);
  });
}
/* Toggle cepat langsung dari halaman detail postingan (tanpa buka modal edit dulu), admin only. */
function refreshOpenDetail(id) {
  const wrap = document.getElementById('detail-content');
  const post = posts.find(p => p.id === id);
  if (!wrap || !post) return;
  const section = wrap.querySelector(`.detail-snap-section[data-post-id="${id}"]`);
  if (section) { section.innerHTML = renderDetailHtml(post, false, true); section.dataset.rendered = '1'; }
}
async function toggleSoldOutQuick(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const prev = post.soldOut;
  const prevSoldAt = post.soldAt;
  const prevSoldPrice = post.soldPrice;
  const willBeSold = !prev;
  post.soldOut = willBeSold;
  // FITUR BARU: catat KAPAN persisnya postingan ditandai Sold Out (soldAt) -- dipakai buat
  // breakdown keuntungan HARIAN di Statistik Stok per Bulan (soldOut doang gak cukup, soalnya
  // itu cuma status ya/nggak, gak nyimpen tanggal kejadiannya). Kalau ditandai SOLD, dicatat
  // waktu sekarang; kalau dibatalin (balik ke available lagi), soldAt-nya dihapus lagi biar
  // gak nyangkut ke statistik bulan yang salah kalau nanti di-sold-out-in ulang di lain waktu.
  if (willBeSold) {
    post.soldAt = Date.now();
    // BUG YANG DIPERBAIKI (Statistik Untung kepake harga AWAL, padahal aslinya laku di harga
    // NEGO/DISKON): sebelumnya "Untung" di statistik selalu diitung dari post.price (harga
    // normal/awal), walau postingannya lagi kena Flash Sale (harga jual sebenernya lebih murah,
    // post.discountPrice) atau lakunya di harga nego yang beda lagi dari keduanya. Sekarang pas
    // ditandai Sold Out, admin dikasih kesempatan konfirmasi/koreksi HARGA SOLD SEBENARNYA --
    // default-nya udah ke-isi otomatis (harga diskon kalau Flash Sale lagi aktif, atau harga
    // normal kalau enggak), tinggal diketik ulang manual kalau ternyata lakunya di harga nego
    // yang beda lagi. Ini yang dipakai buat itung Untung, BUKAN post.price lagi.
    const defaultPrice = (post.discountActive && post.discountPrice) ? post.discountPrice : post.price;
    const defaultNum = parseRupiahNumber(defaultPrice) || 0;
    const input = prompt('Laku di harga berapa? (isi kalau beda dari harga di postingan, misal nego/diskon)', defaultNum ? String(defaultNum) : '');
    const parsed = input === null ? null : parseRupiahNumber(input);
    post.soldPrice = (parsed != null && parsed > 0) ? String(parsed) : (defaultPrice || '');
  } else {
    post.soldAt = null;
    post.soldPrice = null;
  }
  renderStok(); renderRental(); refreshOpenDetail(id);
  const ok = await savePostRemote(post);
  if (!ok) {
    const p2 = posts.find(p => p.id === id);
    if (p2) { p2.soldOut = prev; p2.soldAt = prevSoldAt; p2.soldPrice = prevSoldPrice; }
    renderStok(); renderRental(); refreshOpenDetail(id);
  }
}
async function togglePinnedQuick(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const prev = post.pinned;
  post.pinned = !prev;
  sortPosts();
  renderStok(); renderRental(); refreshOpenDetail(id);
  const ok = await savePostRemote(post);
  if (!ok) {
    const p2 = posts.find(p => p.id === id);
    if (p2) p2.pinned = prev;
    sortPosts(); renderStok(); renderRental(); refreshOpenDetail(id);
  }
}
// FITUR BARU: Duplikat Postingan -- salin SEMUA isi postingan (foto slide 1/2/dst, harga, harga
// diskon, judul, deskripsi, kategori, dll persis sama) jadi postingan BARU yang OTOMATIS
// disembunyikan (post.hidden = true) & dapet kode urutan berikutnya yang baru (misal STOK 12 jadi
// STOK 13) -- biar admin gampang bikin varian mirip dari postingan yang udah ada tanpa isi form
// dari nol, terus tinggal diedit bagian yang beda & di-"Tampilkan Lagi" pas udah siap.
async function duplicatePost(id) {
  const orig = posts.find(p => p.id === id);
  if (!orig) return;
  playSfx('tap');
  // JSON.parse(JSON.stringify(...)) -- deep-copy SEMUA field apa adanya (termasuk array foto
  // slide2Images, dll) tanpa perlu nulis field satu-satu manual & gampang kelupaan kalau nanti
  // ada field baru ditambahin ke struktur post.
  const clone = JSON.parse(JSON.stringify(orig));
  clone.id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  clone.createdAt = Date.now();
  clone.hidden = true; // wajib -- ini inti request-nya, jangan sampai nongol duluan ke customer
  clone.soldOut = false;
  clone.soldAt = null;
  clone.soldPrice = null;
  clone.pinned = false;
  clone.likes = 0; // listing baru, mulai dari nol lagi -- bukan lanjutan punya yang lama
  if (clone.type === 'stok') clone.kode = computeNextKode(clone.game); // kode urutan BARU, bukan nyontek punya aslinya
  posts.push(clone);
  sortPosts();
  renderStok(); renderRental();
  const ok = await savePostRemote(clone);
  if (!ok) {
    const idx = posts.findIndex(p => p.id === clone.id);
    if (idx !== -1) posts.splice(idx, 1);
    sortPosts(); renderStok(); renderRental();
    return;
  }
  // FITUR BARU: abis duplikat postingan Stok, benerin urutan kode FF & ML biar rapi.
  if (clone.type === 'stok') await resyncKodeUrutan();
  showToast(`Berhasil diduplikat${clone.kode ? ' jadi ' + clone.kode : ''} (disembunyikan otomatis).`);
  closeDetailModal();
  openEditPost(clone.id); // langsung buka form edit-nya biar bisa langsung diubah bagian yang beda
}
async function toggleHiddenQuick(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const prev = post.hidden, prevShownAt = post.shownAt;
  post.hidden = !prev;
  if (prev) { post.shownAt = Date.now(); sortPosts(); }   // baru ditampilkan ke publik -> dihitung stok baru
  renderStok(); renderRental(); refreshOpenDetail(id);
  const ok = await savePostRemote(post);
  if (!ok) {
    const p2 = posts.find(p => p.id === id);
    if (p2) { p2.hidden = prev; p2.shownAt = prevShownAt; sortPosts(); }
    renderStok(); renderRental(); refreshOpenDetail(id);
  } else if (prev) {
    await loadPosts();
    const sp = posts.find(p => p.id === id);
    if (sp && !sp.shownAt) showToast('Server belum menyimpan waktu tampil (shownAt), jadi stok ini belum dihitung baru. Kabari developer (server data menolak field baru).', 6500);
  }
}
/* Terima input angka biasa (500), atau singkatan ala Instagram (5rb / 5k / 1.2jt). */
function parseCompactCount(str) {
  if (str == null) return null;
  const s = String(str).trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  const m = s.match(/^([\d.]+)\s*(rb|k|jt|juta)?$/);
  if (!m) return null;
  let num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  if (m[2] === 'rb' || m[2] === 'k') num *= 1000;
  else if (m[2] === 'jt' || m[2] === 'juta') num *= 1000000;
  return Math.max(0, Math.round(num));
}
/* Fitur "Dilihat"/mata udah dihapus total (sesuai request) -- Suntik sekarang cuma buat
   angka Disukai aja. */
async function openSuntikLikePrompt(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const likesInput = prompt('Atur jumlah Disukai (contoh: 500 atau 5rb). Kosongkan/batal untuk gak diubah:', post.likes || 0);
  if (likesInput === null) return;
  const likesVal = parseCompactCount(likesInput);
  if (likesVal === null) return;
  const prevLikes = post.likes;
  post.likes = likesVal;
  renderStok(); renderRental(); refreshOpenDetail(id);
  // BUG YANG DIPERBAIKI: sama kayak toggleLikePost -- postingannya dicari
  // ulang pakai id (bukan pegang object/index lama) sebelum ditulis hasil akhirnya, biar aman
  // kalau loadPosts() (realtime) sempet jalan & ganti total array `posts` selagi nunggu
  // savePostRemote() di bawah ini kelar.
  const ok = await savePostRemote(post);
  const freshPost = posts.find(p => p.id === id);
  if (!ok) {
    if (freshPost) freshPost.likes = prevLikes;
    renderStok(); renderRental(); refreshOpenDetail(id);
    showToast('Gagal menyimpan suntikan, coba lagi.');
  } else {
    showToast('Angka Disukai berhasil diubah.');
  }
}
/* D1/Cloudflare Worker nggak punya realtime kayak Supabase, jadi update sesama-pengunjung
   dipastikan lewat POLLING BIASA (narik ulang data tiap 30 detik) + ditarik ulang tiap kali
   tab dibuka/difokus lagi (visitor balik dari app lain / kunci layar). */
async function subscribeFirestore() {
  applyCachedProfile(); // tampil instan pakai data terakhir (kalau ada), server tetap jadi sumber akhir
  await loadProfile();
  await loadPosts();

  // Polling dilewati kalau tab lagi di background (hemat baterai/kuota); pas balik ke tab,
  // refetchIfDue() di bawah yang narik data terbaru.
  setInterval(() => { if (!document.hidden) loadProfile(); }, 120000);
  setInterval(() => { if (!document.hidden) loadPosts(); }, 90000);

  // FIX HEMAT REQUEST: 'visibilitychange' (balik ke tab) & 'focus' (window difokus) bisa nembak
  // BARENGAN/berdempetan (umum di HP pas app di-switch balik) -- di-jaga biar kalau baru aja
  // narik data dalam 3 detik terakhir, panggilan yang nyusul di-skip.
  let lastRefetchAt = 0;
  function refetchIfDue() {
    const now = Date.now();
    if (now - lastRefetchAt < 3000) return;
    lastRefetchAt = now;
    loadProfile(); loadPosts();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refetchIfDue(); });
  window.addEventListener('focus', refetchIfDue);

  setTimeout(() => { if (!postsLoaded) { postsLoaded = true; tkBootDone(); renderStok(); renderRental(); markFirstLoadAnimDone(); } }, 15000);
}
// Lepas class "first-load" abis animasi stagger chip pertama kali BENERAN kelar (delay
// terpanjang .88s + durasi animasi .22s), dihitung dari saat chip pertama kali di-render ke DOM
// -- bukan dari timer tetap sejak halaman dibuka. Dulu pakai timer tetap dari saat <body> mulai
// dibuka, jadi pas fetch data Supabase lebih lambat dari 1.3 detik (koneksi lambat/cold start),
// class first-load keburu kehapus duluan sebelum chip sempat dirender -- animasi stagger-nya
// jadi gak kejadian sama sekali. Sekarang dipanggil dari semua jalur yang bikin renderStok()/
// renderRental() jalan buat PERTAMA kalinya, biar delay-nya selalu dihitung dari titik yang
// bener.
let firstLoadAnimDone = false;
function markFirstLoadAnimDone() {
  if (firstLoadAnimDone) return;
  firstLoadAnimDone = true;
  setTimeout(() => document.body.classList.remove('first-load'), 1300);
}

