/* 16-linkbio-v2.js — halaman /info versi baru (dimuat setelah bundle toko; tidak mengubah file lama).
   - 7 konsep tampilan (assets/css/linkbio-themes.css), bisa dikunci 1 konsep atau berganti otomatis
     tiap N jam / N hari, urut atau acak (semua pengunjung melihat konsep yang sama di waktu yang sama).
   - Data link dipisah: Saluran, Grup JB (WA & Telegram), Kontak (website/top up/WA) dengan status Aktif/Otw Full/Full/Kenon.
   - Admin baru yang simpel: tab Link, Konsep, Profil & Musik + impor cepat dari teks + reset semua / per bagian.
   UPDATE: semua konsep kini berisi SAMA (3 tab: Saluran / Grup JB / WA Admin, kartu besar 2, Website & Top Up ikut tampil di tab WA Admin);
   tiap tab boleh punya teks kecil di bawah daftar (disimpan di linkbio.notes).
   Mengganti (override) renderLinkBio, openLinkbioAdmin, saveLinkbioAdmin; fungsi musik/trim lama tetap dipakai. */
(function () {
  'use strict';
  var E = function (s) { return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };

  /* ================= KONSEP ================= */
  var THEMES = [
    { id: 'glass', name: 'Glass Ungu', tabs: 3, heroes: 2, dup: true, dots: ['#7c3aed', '#a78bfa', '#f4f0ff'], font: 'Plus+Jakarta+Sans:wght@500;600;700;800' },
    { id: 'kawaii', name: 'Kawaii Pop', tabs: 3, heroes: 2, dup: true, dots: ['#ff6fb1', '#7ad7ff', '#fff3fa'], font: 'Fredoka:wght@500;600' },
    { id: 'brutal', name: 'Neo Brutal', tabs: 3, heroes: 2, dup: true, dots: ['#ff5c8a', '#ffd400', '#fff3b8'], font: 'Space+Grotesk:wght@500;600;700' },
    { id: 'pixel', name: 'Pixel Quest', tabs: 3, heroes: 2, dup: true, dots: ['#ffd93d', '#4ecdc4', '#fef3d7'], font: 'Pixelify+Sans:wght@500;600' },
    { id: 'mint', name: 'Mint Fresh', tabs: 3, heroes: 2, dup: true, dots: ['#10b981', '#06b6d4', '#f2faf7'], font: 'Plus+Jakarta+Sans:wght@500;600;700;800' },
    { id: 'mono', name: 'Mono Ink', tabs: 3, heroes: 2, dup: true, dots: ['#0a0a0a', '#ff3d81', '#f7f7f5'], font: 'Inter:wght@500;600;700' },
    { id: 'profil', name: 'Profil', tabs: 3, heroes: 2, dup: true, dots: ['#ec4899', '#7c3aed', '#ffffff'], font: 'Plus+Jakarta+Sans:wght@500;600;700;800' }
  ];
  var TH = {}; THEMES.forEach(function (t) { TH[t.id] = t; });
  var fontsLoaded = {};
  function loadFont(f) {
    if (!f || fontsLoaded[f]) return; fontsLoaded[f] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f + '&display=swap'; document.head.appendChild(l);
  }

  /* ---------- jadwal ganti konsep ---------- */
  var WIB = 7 * 3600e3;
  function startOfWibDay(ms) { return Math.floor((ms + WIB) / 864e5) * 864e5 - WIB; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(ids, seed) {
    var a = ids.slice(), r = mulberry(seed | 0);
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function rotOf(lb) {
    var r = Object.assign({ mode: 'fixed', fixed: 'glass', n: 1, unit: 'day', order: 'urut', list: THEMES.map(function (t) { return t.id; }), anchor: 0, seed: 1 }, (lb && lb.rotation) || {});
    r.list = (r.list || []).filter(function (id) { return TH[id]; });
    if (!r.list.length) r.list = THEMES.map(function (t) { return t.id; });
    if (!TH[r.fixed]) r.fixed = 'glass';
    r.n = Math.max(1, Math.min(999, parseInt(r.n, 10) || 1));
    r.unit = r.unit === 'hour' ? 'hour' : 'day';
    return r;
  }
  function stepMs(r) { return (r.unit === 'hour' ? 3600e3 : 864e5) * r.n; }
  function slotOf(r, now) { return Math.max(0, Math.floor((now - (r.anchor || 0)) / stepMs(r))); }
  function pickTheme(r, now) {
    if (r.mode !== 'auto') return r.fixed;
    var ids = r.list, n = ids.length, slot = slotOf(r, now), cyc = Math.floor(slot / n), pos = slot % n;
    if (r.order === 'acak') {
      var o = shuffled(ids, (r.seed | 0) + cyc);
      if (cyc > 0 && n > 1) { var prev = shuffled(ids, (r.seed | 0) + cyc - 1); if (o[0] === prev[n - 1]) { var t = o[0]; o[0] = o[1]; o[1] = t; } }
      return o[pos];
    }
    return ids[pos];
  }
  function nextChangeAt(r, now) { return (r.anchor || 0) + (slotOf(r, now) + 1) * stepMs(r); }

  /* ================= DATA LINK ================= */
  var uid = function () { return 'lb' + Date.now() + Math.random().toString(36).slice(2, 6); };
  var KEEP = { JB: 1, FF: 1, ML: 1, WA: 1, GB: 1, PT: 1, X: 1 };
  function nice(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.toLowerCase().replace(/\S+/g, function (w) {
      var u = w.toUpperCase(); if (KEEP[u]) return u;
      if (w.charAt(0) === '(') return '(' + w.charAt(1).toUpperCase() + w.slice(2);
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }
  function splitStatus(label) {
    var t = String(label || ''), st = 'aktif';
    if (/otw\s*full/i.test(t)) st = 'otw'; else if (/\bfull\b/i.test(t)) st = 'full'; else if (/kenon/i.test(t)) st = 'kenon';
    var c = t.replace(/\[[^\]]*\]/g, ' ').replace(/\((online|aktif|kenon|full)\)/ig, ' ').replace(/\b(otw\s*full|full|kenon)\b/ig, ' ').replace(/\s*[-–]\s*$/, '').replace(/^\s*[-–]\s*/, '').replace(/\s+/g, ' ').trim();
    return { label: c || t.trim(), status: st };
  }
  function kindOfUrl(u) {
    u = String(u || '');
    if (/whatsapp\.com\/channel\//i.test(u)) return 'ch';
    if (/chat\.whatsapp\.com\//i.test(u)) return 'gr';
    if (/(^|\/\/)(t\.me|telegram\.me)\//i.test(u)) return 'tg';
    if (/(wa\.me|api\.whatsapp\.com)\//i.test(u)) return 'wa';
    return '';
  }
  function fromLegacy(links, prof) {
    var o = { channels: [], groups: [], telegram: [], contacts: [], note: [] }, sec = '';
    (links || []).forEach(function (l) {
      if (!l) return;
      if (l.type === 'divider') {
        var t = String(l.label || '').toUpperCase();
        if (/SALURAN/.test(t)) sec = 'ch'; else if (/TELE/.test(t)) sec = 'tg'; else if (/GRUP|JOIN/.test(t)) sec = 'gr';
        else if (t.trim()) o.note.push(String(l.label).trim());
        return;
      }
      var url = /^https?:\/\//i.test(l.url || '') ? String(l.url).trim() : '';
      var sp = splitStatus(l.label);
      var it = { id: l.id || uid(), label: nice(sp.label), url: url, icon: l.icon && /^https?:/i.test(l.icon) ? l.icon : '', sub: '', status: sp.status, active: l.active !== false };
      var k = kindOfUrl(url) || sec;
      if (k === 'ch') o.channels.push(it);
      else if (k === 'gr') o.groups.push(it);
      else if (k === 'tg') o.telegram.push(it);
      else if (k === 'wa') { it.kind = 'wa'; o.contacts.push(it); }
      else if (!k) { it.kind = 'site'; o.contacts.push(it); }
      else o.groups.push(it);
    });
    // Sesuai daftar terbaru dari admin: Grup JB 3 sudah tidak OTW FULL (aktif).
    o.groups.forEach(function (g) { if (/^grup jb 3$/i.test(g.label) && g.status === 'otw') g.status = 'aktif'; });
    var sites = o.contacts.filter(function (c) { return c.kind === 'site'; });
    sites.forEach(function (c, i) { c.tag = i === 0 ? 'Paling dicari' : (/24/.test(c.label) ? '24 jam' : 'Top up'); c.sub = /top\s*up/i.test(c.label) ? 'Buka 24 jam' : 'Beli akun & rental'; });
    return o;
  }
  function waContacts(prof) {
    var out = [], j = (prof && prof.waJual) || '6289519103394', r = (prof && prof.waRekber) || '6289520835165';
    out.push({ id: uid(), kind: 'wa', label: 'WA Jual / Beli', url: 'https://wa.me/' + j, icon: '', sub: 'Chat admin untuk transaksi', status: 'aktif', active: true });
    out.push({ id: uid(), kind: 'wa', label: 'WA Rekber', url: 'https://wa.me/' + r, icon: '', sub: 'Transaksi aman via rekber', status: 'kenon', active: true });
    return out;
  }
  function seedData() {
    var g = function (l, u, st) { return { id: uid(), label: l, url: u || '', icon: '', sub: '', status: st || 'aktif', active: true }; };
    var q = '?s=cl&p=a&mlu=4&ilr=4', c = 'https://chat.whatsapp.com/';
    return {
      channels: [g('Saluran Utama Stok', 'https://whatsapp.com/channel/0029VaxzZuCAInPs2yL05N1P'), g('Saluran Rental FF', 'https://whatsapp.com/channel/0029VbCQbd3FCCoa4lZGLP00'), g('Saluran Jaspost (Free)', 'https://whatsapp.com/channel/0029Vb7BbGt2UPBM2s6cYr3N')],
      groups: [g('Grup JB 1', c + 'H3WYmaFTzVVB2SCj6gSuML' + q, 'full'), g('Grup JB 2', '', 'kenon'), g('Grup JB 3', c + 'H6vDMFAPu2DAnIOc0igNgC' + q), g('Grup JB 4', c + 'L5wWzHwJEttFdVe2uC4aRS' + q), g('Grup JB 5', c + 'IJU7SUvh0oQJqCHjkOEBsE' + q), g('Grup JB 6', c + 'Ls2EZDQloyC9k5aI1cKo2i' + q), g('Grup Mabar 1', c + 'HCs2XgoDM3bAubDSScIPV6' + q), g('Grup Majid X Toukaenay', c + 'ExrwJ1ChdDW0VDTkpfRukV' + q)],
      telegram: [],
      contacts: [
        { id: uid(), kind: 'site', label: 'Website Stok', url: 'https://toukaenay.com', icon: '', sub: 'Stok murah & aman', tag: 'Paling dicari', status: 'aktif', active: true },
        { id: uid(), kind: 'site', label: 'Top Up All Game', url: 'https://toukatopup.id', icon: '', sub: 'Murah & cepat, buka 24 jam', tag: '24 jam', status: 'aktif', active: true }
      ].concat(waContacts(null)),
      note: ''
    };
  }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  /* Teks kecil di bawah daftar tiap tab: { channels, groups, contacts }. groupNote lama otomatis jadi teks tab Grup JB. */
  function notesOf(lb, d) {
    var n = (lb && lb.notes && typeof lb.notes === 'object') ? lb.notes : {};
    var g = n.groups !== undefined ? n.groups : ((lb && lb.groupNote) || (d && d.note) || '');
    return { channels: String(n.channels || ''), groups: String(g || ''), contacts: String(n.contacts || '') };
  }
  function noteHtml(t) { t = String(t || '').trim(); return t ? '<p class="lb2-note">' + E(t) + '</p>' : ''; }
  function linkData(lb) {
    var d;
    if (Array.isArray(lb.channels) || Array.isArray(lb.groups) || Array.isArray(lb.contacts)) {
      d = { channels: lb.channels || [], groups: lb.groups || [], telegram: lb.telegram || [], contacts: lb.contacts || [], note: lb.groupNote || '' };
    } else if (profile && profile.linkbio && Array.isArray(profile.linkbio.links) && profile.linkbio.links.length) {
      var m = fromLegacy(profile.linkbio.links, profile);
      d = { channels: m.channels, groups: m.groups, telegram: m.telegram, contacts: m.contacts.concat(waContacts(profile)), note: m.note.join('\n') };
    } else d = seedData();
    d = copy(d);
    d.notes = notesOf(lb, d);
    freezeHeroes(d.contacts);
    ['channels', 'groups', 'telegram', 'contacts'].forEach(function (k) { d[k].forEach(function (it) { if (!it.id) it.id = uid(); if (!it.status) it.status = 'aktif'; }); });
    return d;
  }

  /* ================= RENDER PUBLIK ================= */
  var curTheme = '', curTab = 0, lastHtmlKey = '';
  function iconHtml(it) {
    if (/^https?:\/\//i.test(it.icon || '')) return '<img src="' + E(it.icon) + '" alt="" loading="lazy" draggable="false">';
    if (it.icon) return E(it.icon);
    return E((String(it.label || '?').match(/\d+|\S/) || ['?'])[0].toUpperCase());
  }
  function badge(it, isWa) {
    if (it.status === 'otw') return '<i class="lb2-tag s-otw">OTW FULL</i>';
    if (it.status === 'full') return '<i class="lb2-tag s-full">FULL</i>';
    if (it.status === 'kenon') return '<i class="lb2-tag s-kenon">KENON</i>';
    return isWa ? '<i class="lb2-tag">ONLINE</i>' : '';
  }
  /* Full / Kenon: tampil abu-abu tapi TETAP BISA DIKLIK (asal ada link), supaya orang tetap bisa join / chat. */
  function rowHtml(it, n, isWa) {
    var has = /^https?:\/\//i.test(it.url || ''), dim = it.status === 'full' || it.status === 'kenon';
    var inner = '<span class="lb2-ic">' + iconHtml(it) + '</span><span class="lb2-tx"><b>' + E(it.label) + '</b>' + (it.sub ? '<small>' + E(it.sub) + '</small>' : '') + '</span>' + badge(it, isWa);
    var st = ' style="animation-delay:' + (n * 0.04) + 's"';
    return has ? '<a class="lb2-row' + (dim ? ' dim' : '') + '" href="' + E(it.url) + '" target="_blank" rel="noopener noreferrer"' + st + '>' + inner + '</a>'
      : '<div class="lb2-row off"' + st + '>' + inner + '</div>';
  }
  function act(a) { return (a || []).filter(function (x) { return x && x.active !== false && (x.label || '').trim(); }); }

  /* ---------- tata letak: jumlah halaman, isi tiap halaman, nama tab, judul bagian, kartu sorotan ---------- */
  var SEC_NAME = { channels: 'Saluran', groups: 'Grup JB', contacts: 'WA Admin' };
  var SEC_SHORT = { channels: 'Saluran', groups: 'Grup JB', contacts: 'WA Admin' };
  var SECS = ['channels', 'groups', 'contacts'];
  var TITLES = { channels: 'Saluran', groups: 'Join Grup WA Ku', telegram: 'Join Grup Telegram', sites: 'Website & Top Up', was: 'WhatsApp Admin' };
  function defMap(n) { return n === 1 ? { channels: 0, groups: 0, contacts: 0 } : (n === 2 ? { channels: 0, groups: 1, contacts: 1 } : { channels: 0, groups: 1, contacts: 2 }); }
  function layOf(lb) {
    var L = (lb && lb.layout) || {}, h = parseInt(L.heroes, 10);
    return {
      pages: [1, 2, 3].indexOf(parseInt(L.pages, 10)) > -1 ? parseInt(L.pages, 10) : 0,
      map: Object.assign({}, L.map || {}),
      names: (Array.isArray(L.names) ? L.names : []).slice(0, 3),
      titles: Object.assign({}, L.titles || {}),
      heroes: (h === 0 || h === 1 || h === 2) ? h : -1,
      fx: ['pulse', 'shine', 'off'].indexOf(L.fx) > -1 ? L.fx : ''
    };
  }
  function effMap(L, n) { var m = defMap(n); SECS.forEach(function (k) { var v = parseInt(L.map[k], 10); if (!isNaN(v)) m[k] = v < 0 ? -1 : Math.min(v, n - 1); }); return m; }
  function autoName(secs) { return secs.length === 1 ? SEC_NAME[secs[0]] : secs.map(function (k) { return SEC_SHORT[k]; }).join(' & '); }
  function pagesOf(L, th) {
    var n = L.pages, map, base = [];
    if (!n) {
      if (th.tabs === 3) { n = 3; map = defMap(3); base = ['Saluran', 'Grup JB', 'WA Admin']; }
      else { n = 2; map = { channels: 0, groups: 0, contacts: 1 }; base = ['Saluran & Grup JB', 'WA JB & Rekber']; }
    } else map = effMap(L, n);
    var pages = [];
    for (var i = 0; i < n; i++) {
      var secs = SECS.filter(function (k) { return map[k] === i; });
      if (!secs.length) continue;
      var custom = L.names[i] && String(L.names[i]).trim();
      pages.push({ name: custom || (L.pages ? autoName(secs) : base[i]), secs: secs });
    }
    return pages;
  }
  function heroNOf(L, th) { return L.heroes >= 0 ? L.heroes : th.heroes; }
  function siteList(d) { return act(d.contacts).filter(function (c) { return c.kind !== 'wa'; }); }
  function heroItems(d, L, th) { return siteList(d).filter(function (c) { return /^https?:\/\//i.test(heroUrl(c) || ''); }).slice(0, heroNOf(L, th)); }
  var DEF_TAG = ['Paling dicari', '24 jam'];
  /* Kartu besar punya isi SENDIRI (htag/hlabel/hsub/hemoji), terpisah dari baris di daftar link.
     Kalau belum pernah diedit, otomatis meniru baris link seperti dulu (data lama tetap aman). */
  var LEAD_EMO = /^\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*\s*/u;
  function hasV(v) { return v !== undefined && v !== null; }
  function heroTag(c, i) { return hasV(c.htag) ? String(c.htag) : (hasV(c.tag) ? String(c.tag) : (DEF_TAG[i] || '')); }
  function heroLabel(c) { return hasV(c.hlabel) ? String(c.hlabel) : String(c.label || '').replace(LEAD_EMO, ''); }
  function heroSub(c) { return hasV(c.hsub) ? String(c.hsub) : String(c.sub || ''); }
  function heroEmoji(c) { return hasV(c.hemoji) ? String(c.hemoji) : String(c.emoji || ''); }
  /* Link kartu besar juga terpisah dari link di daftar kontak (hurl). Belum diisi = ikut link kontak. */
  function heroUrl(c) { return hasV(c.hurl) ? String(c.hurl) : String(c.url || ''); }
  /* "Kunci" isi kartu besar: salin nilai yang tadinya ikut daftar kontak ke kolom kartu itu sendiri, jadi mengganti nama/link
     di daftar kontak TIDAK lagi mengubah kartu besar (dan sebaliknya). Dipanggil saat data dimuat dan saat simpan. */
  function freezeHeroes(arr) {
    var n = 0;
    (arr || []).forEach(function (c) {
      if (c.kind === 'wa') return;
      if (!hasV(c.htag)) c.htag = heroTag(c, n);
      if (!hasV(c.hlabel)) c.hlabel = heroLabel(c);
      if (!hasV(c.hsub)) c.hsub = heroSub(c);
      if (!hasV(c.hemoji)) c.hemoji = heroEmoji(c);
      if (!hasV(c.hurl)) c.hurl = String(c.url || '');
      n++;
    });
  }
  function bodyHtml(d, th, L, secs, heroes) {
    var n = 0, h = '';
    function ttl(k) { return L.titles[k] !== undefined && L.titles[k] !== null ? String(L.titles[k]) : TITLES[k]; }
    function sec(k, arr, isWa) { if (!arr.length) return; var t = ttl(k); if (t) h += '<div class="lb2-g">' + E(t) + '</div>'; arr.forEach(function (it) { h += rowHtml(it, n++, isWa); }); }
    var ct = act(d.contacts), sites = siteList(d), was = ct.filter(function (c) { return c.kind === 'wa'; });
    var nt = d.notes || { channels: '', groups: d.note || '', contacts: '' };
    secs.forEach(function (k) {
      if (k === 'channels') { sec('channels', act(d.channels)); h += noteHtml(nt.channels); }
      else if (k === 'groups') { sec('groups', act(d.groups)); sec('telegram', act(d.telegram)); h += noteHtml(nt.groups); }
      else { sec('sites', th.dup ? sites : sites.filter(function (c) { return heroes.indexOf(c) < 0; })); sec('was', was, true); h += noteHtml(nt.contacts); }
    });
    return h || '<div class="lb2-empty">Belum ada link di bagian ini.</div>';
  }
  function ctxOf(lb) {
    var id = pickTheme(rotOf(lb), Date.now()), th = TH[id] || TH.glass, L = layOf(lb), d = linkData(lb);
    return { th: th, L: L, d: d, pages: pagesOf(L, th), heroes: heroItems(d, L, th) };
  }
  function pageHtml(x) {
    var th = x.th, L = x.L, d = x.d, heroes = x.heroes;
    var hh = heroes.length ? '<div class="lb2-heroes' + (heroes.length === 1 ? ' one' : '') + (L.fx ? ' fx-' + L.fx : '') + '">' + heroes.map(function (c, i) {
      var tag = heroTag(c, i), hl = heroLabel(c), he = heroEmoji(c), hs = heroSub(c);
      return '<a class="lb2-hero" href="' + E(heroUrl(c)) + '" target="_blank" rel="noopener noreferrer">' + (tag ? '<small>' + E(tag) + '</small>' : '') + '<h2>' + (he ? '<span class="lb2-emo">' + E(he) + '</span> ' : '') + E(hl) + '</h2>' + (hs ? '<p>' + E(hs) + '</p>' : '') + '</a>';
    }).join('') + '</div>' : '';
    if (curTab >= x.pages.length) curTab = 0;
    var tabs = x.pages.length > 1 ? '<div class="lb2-tabs" style="--n:' + x.pages.length + ';--i:' + curTab + '"><i class="lb2-pill"></i>' + x.pages.map(function (p, i) { return '<button type="button" data-lb2t="' + i + '" class="' + (i === curTab ? 'on' : '') + '">' + E(p.name) + '</button>'; }).join('') + '</div>' : '';
    var body = x.pages.length ? bodyHtml(d, th, L, x.pages[curTab].secs, heroes) : '<div class="lb2-empty">Belum ada link.</div>';
    var pt = (x.pages.length === 1 && L.names && String(L.names[0] || '').trim()) ? '<div class="lb2-ptitle">' + E(String(L.names[0]).trim()) + '</div>' : '';
    return '<div class="lb2">' + hh + tabs + pt + '<div id="lb2-body">' + body + '</div></div>';
  }

  function lb2Render() {
    var lb = Object.assign({}, defaultProfile.linkbio, profile.linkbio || {});
    var nameEl = $('linkbio-name'), avatarEl = $('linkbio-avatar'), verifiedEl = $('linkbio-verified'), musicBtn = $('btn-linkbio-music'), wrap = $('linkbio-links'), menuIcon = $('menu-linkbio-icon'), pageEl = $('page-linkbio');
    if (menuIcon) menuIcon.src = lb.avatarUrl || '';
    if (!nameEl || !avatarEl || !wrap || !pageEl) return;
    nameEl.textContent = lb.name || '';
    avatarEl.src = lb.avatarUrl || ''; avatarEl.alt = lb.name || '';
    verifiedEl.classList.toggle('hidden', !lb.verified);
    linkbioPlaylist = linkbioComputePlaylist(lb);
    if (linkbioTrackIndex >= linkbioPlaylist.length) linkbioTrackIndex = 0;
    if (musicBtn) musicBtn.classList.toggle('hidden', linkbioPlaylist.length === 0);

    var rot = rotOf(lb), id = pickTheme(rot, Date.now()), th = TH[id] || TH.glass;
    if (id !== curTheme) { curTab = 0; curTheme = id; }
    loadFont(th.font);
    pageEl.className = pageEl.className.replace(/\blbt-\S+/g, '').replace(/\s+/g, ' ').trim() + ' lbt-' + th.id;
    pageEl.style.background = '';
    ['--bg', '--bgi', '--card', '--tx', '--linkbio-box-color', '--linkbio-text-color'].forEach(function (k) { pageEl.style.removeProperty(k); });
    if (lb.useCustomColors && rot.mode === 'fixed') {
      if (lb.bgColor) { pageEl.style.setProperty('--bg', lb.bgColor); pageEl.style.setProperty('--bgi', 'none'); }
      if (lb.boxColor) pageEl.style.setProperty('--card', lb.boxColor);
      if (lb.textColor) { pageEl.style.setProperty('--tx', lb.textColor); pageEl.style.setProperty('--linkbio-text-color', lb.textColor); }
    }
    var head = $('linkbio-head'); if (head) head.classList.add('lb-head');
    wrap.innerHTML = pageHtml(ctxOf(lb));
    try { var cs = getComputedStyle(pageEl); localStorage.setItem('lb2bg', cs.getPropertyValue('--bg').trim()); localStorage.setItem('lb2tx', cs.getPropertyValue('--tx').trim()); } catch (e) {}
    linkbioLoadTrack(linkbioTrackIndex);
  }
  window.renderLinkBio = lb2Render;
  /* PERBAIKAN refresh /info: bundle toko (dimuat lebih dulu) sudah sempat menggambar versi LAMA sebelum file ini siap,
     dan sesudahnya tidak ada yang menggambar ulang. Jadi begitu file ini siap, langsung gambar ulang versi baru. */
  function lb2Boot() { try { if (typeof profileLoaded !== 'undefined' && profileLoaded) lb2Render(); } catch (e) { console.error(e); } }
  lb2Boot();
  if (document.readyState !== 'complete') window.addEventListener('load', lb2Boot);

  var linksWrap = $('linkbio-links');
  if (linksWrap) linksWrap.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lb2t]') : null; if (!b) return;
    curTab = +b.getAttribute('data-lb2t');
    var lb = Object.assign({}, defaultProfile.linkbio, profile.linkbio || {}), x = ctxOf(lb), tabs = b.parentNode;
    if (curTab >= x.pages.length) curTab = 0;
    tabs.style.setProperty('--i', curTab);
    [].forEach.call(tabs.querySelectorAll('button'), function (z) { z.classList.toggle('on', z === b); });
    $('lb2-body').innerHTML = bodyHtml(x.d, x.th, x.L, x.pages[curTab].secs, x.heroes);
  });
  setInterval(function () {
    var p = $('page-linkbio'); if (!p || p.classList.contains('hidden') || document.hidden) return;
    var lb = Object.assign({}, defaultProfile.linkbio, profile.linkbio || {});
    if (pickTheme(rotOf(lb), Date.now()) !== curTheme) lb2Render();
  }, 30000);

  /* ================= ADMIN ================= */
  var A = null;
  var STS = [['aktif', 'Aktif'], ['otw', 'Otw Full'], ['full', 'Full'], ['kenon', 'Kenon']];
  var STS_WA = [['aktif', 'Online'], ['kenon', 'Kenon']];

  function rowAdm(sec, i, it) {
    var st = sec === 'groups' || sec === 'telegram' ? STS : (sec === 'contacts' && it.kind === 'wa' ? STS_WA : null);
    var img = /^https?:\/\//i.test(it.icon || '') ? '<img src="' + E(it.icon) + '" alt="">' : '<span>+</span>';
    return '<div class="lb2a-row' + (it.active === false ? ' off' : '') + '" data-s="' + sec + '" data-i="' + i + '">' +
      '<div class="lb2a-top"><label class="lb2a-ic" title="Ganti ikon">' + img + '<input type="file" accept="image/*" data-act="icon" hidden></label>' +
      '<div class="lb2a-f"><input data-f="label" placeholder="Nama tombol" value="' + E(it.label) + '">' +
      '<input data-f="url" placeholder="Link https://..." value="' + E(it.url) + '" inputmode="url"></div></div>' +
      '<input class="lb2a-sub" data-f="sub" placeholder="Keterangan kecil (opsional, kosong = tidak tampil)" value="' + E(it.sub || '') + '">' +
      (sec === 'contacts' && it.kind !== 'wa' ? '<div class="lb2a-emo"><span>Emoji di judul:</span>' + ['⚡', '🔥', '✨', '🛒', '💎', '🎮', '🎁', '👉'].map(function (e) { return '<button type="button" data-act="emo" data-v="' + e + '">' + e + '</button>'; }).join('') + '<button type="button" data-act="emo" data-v="">Hapus</button></div>' : '') +
      (st ? '<div class="lb2a-st">' + st.map(function (s) { return '<button type="button" data-act="st" data-v="' + s[0] + '" class="s-' + s[0] + (it.status === s[0] ? ' on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="lb2a-ctl"><label class="lb2a-sw"><input type="checkbox" data-f="active"' + (it.active !== false ? ' checked' : '') + '><i></i>Tampil</label>' +
      '<span><button type="button" data-act="up">↑</button><button type="button" data-act="dn">↓</button><button type="button" class="del" data-act="del">Hapus</button></span></div></div>';
  }
  function noteBox(k, label, ph) {
    var v = (A.d.notes && A.d.notes[k]) || '';
    return '<label class="lb2a-lbl">' + label + '</label><textarea id="lb2a-note-' + k + '" rows="2" placeholder="' + E(ph) + '">' + E(v) + '</textarea>';
  }
  function card(sec, title, desc, adds, extra) {
    var arr = A.d[sec], rows = arr.length ? arr.map(function (it, i) { return rowAdm(sec, i, it); }).join('') : '<p class="lb2a-empty">Belum ada. Tambahkan di bawah.</p>';
    return '<section class="lb2a-card"><header><div><h4>' + title + ' <em>' + arr.length + '</em></h4><p>' + desc + '</p></div>' +
      (arr.length ? '<button type="button" class="lb2a-link" data-act="clear" data-s="' + sec + '">Kosongkan</button>' : '') + '</header>' + rows +
      '<div class="lb2a-add">' + adds + '</div>' + (extra || '') + '</section>';
  }
  function linksHtml() {
    return '<details class="lb2a-card lb2a-imp"><summary>⚡ Impor cepat dari teks (tempel daftar link WhatsApp)</summary>' +
      '<p>Tempel daftar seperti biasa kamu kirim (judul bertanda *…* lalu link di bawahnya). Link otomatis masuk ke Saluran / Grup / Telegram / Kontak. Kata FULL, OTW FULL, KENON di judul otomatis jadi status (tetap bisa diklik).</p>' +
      '<textarea id="lb2a-imp" rows="6" placeholder="*GB 1 FULL*&#10;https://chat.whatsapp.com/...&#10;*GB 2 KENON*"></textarea>' +
      '<div class="lb2a-add"><button type="button" class="lb2a-btn" data-act="imp" data-m="add">+ Tambahkan</button><button type="button" class="lb2a-btn warn" data-act="imp" data-m="replace">Ganti isi bagian yang ada di teks</button></div></details>' +
      card('channels', 'Saluran', 'Saluran WhatsApp (stok, rental, jaspost, testimoni).', '<button type="button" class="lb2a-btn" data-act="add" data-s="channels">+ Tambah saluran</button>',
        noteBox('channels', 'Teks kecil di bawah daftar saluran (opsional)', 'mis. Hanya saluran di atas yang resmi')) +
      card('groups', 'Grup JB (WhatsApp)', 'Atur status tiap grup: Aktif, Otw Full, Full, atau Kenon. Full & Kenon tampil abu-abu tapi tetap bisa diklik (selama ada link), jadi orang tetap bisa join.', '<button type="button" class="lb2a-btn" data-act="add" data-s="groups">+ Tambah grup</button>',
        noteBox('groups', 'Teks kecil di bawah daftar grup (opsional)', 'mis. Gak punya PT ataupun owner. Hati-hati clone ‼️')) +
      card('telegram', 'Grup Telegram', 'Link grup / folder Telegram.', '<button type="button" class="lb2a-btn" data-act="add" data-s="telegram">+ Tambah Telegram</button>') +
      card('contacts', 'WA Admin', 'Website stok, top up, WA Jual/Beli, WA Rekber. Website paling atas jadi kartu sorotan (jumlahnya diatur di tab Halaman). Ganti judul, label kecil, dan emoji di sini.', '<button type="button" class="lb2a-btn" data-act="add" data-s="contacts" data-k="site">+ Website / link</button><button type="button" class="lb2a-btn" data-act="add" data-s="contacts" data-k="wa">+ Nomor WhatsApp</button>',
        noteBox('contacts', 'Teks kecil di bawah daftar WA Admin (opsional)', 'mis. Jangan percaya nomor lain selain di atas')) +
      '<section class="lb2a-card lb2a-danger"><h4>Reset</h4><p>Kosongkan lalu isi ulang sendiri. Bisa semuanya, atau per bagian lewat tombol “Kosongkan” di tiap kartu. Baru tersimpan setelah kamu menekan Simpan.</p>' +
      '<div class="lb2a-add"><button type="button" class="lb2a-btn danger" data-act="clearall">Reset semua link</button><button type="button" class="lb2a-btn danger" data-act="clear" data-s="groups">Reset Grup JB saja</button></div></section>';
  }
  function fmt(ms) { return new Date(ms).toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function themeHtml() {
    var r = A.rot, now = Date.now(), cur = TH[pickTheme(rotOf({ rotation: r }), now)];
    var h = '<section class="lb2a-card"><h4>Cara tampil</h4><div class="lb2a-seg"><button type="button" data-act="mode" data-v="auto" class="' + (r.mode === 'auto' ? 'on' : '') + '">Ganti otomatis</button><button type="button" data-act="mode" data-v="fixed" class="' + (r.mode === 'fixed' ? 'on' : '') + '">Kunci 1 konsep</button></div>';
    if (r.mode === 'fixed') {
      h += '<label class="lb2a-lbl">Konsep yang dipakai</label><div class="lb2a-themes">' + THEMES.map(function (t) {
        return '<button type="button" data-act="fixed" data-v="' + t.id + '" class="lb2a-th' + (r.fixed === t.id ? ' on' : '') + '"><span class="dots">' + t.dots.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' + t.name + '</button>';
      }).join('') + '</div>';
    } else {
      h += '<label class="lb2a-lbl">Ganti konsep setiap</label><div class="lb2a-every"><input type="number" min="1" max="999" data-f2="n" value="' + r.n + '"><div class="lb2a-seg"><button type="button" data-act="unit" data-v="hour" class="' + (r.unit === 'hour' ? 'on' : '') + '">Jam</button><button type="button" data-act="unit" data-v="day" class="' + (r.unit === 'day' ? 'on' : '') + '">Hari</button></div></div>' +
        '<label class="lb2a-lbl">Urutan</label><div class="lb2a-seg"><button type="button" data-act="order" data-v="urut" class="' + (r.order === 'urut' ? 'on' : '') + '">Berurutan (sesuai daftar)</button><button type="button" data-act="order" data-v="acak" class="' + (r.order === 'acak' ? 'on' : '') + '">Acak</button></div>' +
        '<label class="lb2a-lbl">Konsep yang ikut berputar' + (r.order === 'urut' ? ' (urutan dari atas ke bawah)' : '') + '</label><div class="lb2a-tl">' +
        orderedAll().map(function (t) {
          var on = r.list.indexOf(t.id) > -1;
          return '<div class="lb2a-tr' + (on ? '' : ' off') + '"><label><input type="checkbox" data-act="tpick" data-v="' + t.id + '"' + (on ? ' checked' : '') + '><span class="dots">' + t.dots.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' + t.name + '</label>' +
            (on && r.order === 'urut' ? '<span><button type="button" data-act="tup" data-v="' + t.id + '">↑</button><button type="button" data-act="tdn" data-v="' + t.id + '">↓</button></span>' : '') + '</div>';
        }).join('') + '</div>' +
        '<p class="lb2a-hint">Konsep sekarang: <b>' + cur.name + '</b>' + (r.list.length > 1 ? ' · ganti berikutnya: <b>' + fmt(nextChangeAt(rotOf({ rotation: r }), now)) + '</b>' : '') + '. Jadwal dihitung dari waktu kamu menekan Simpan (hari dihitung per tengah malam WIB). Semua pengunjung melihat konsep yang sama.</p>' +
        '<button type="button" class="lb2a-btn" data-act="restart">Mulai ulang jadwal dari konsep pertama sekarang</button>';
    }
    return h + '</section>';
  }
  var EMOJIS = ['⚡', '🔥', '✨', '🛒', '💎', '🎮', '🎁', '👉', '⭐', '🌟', '💫', '🏆', '👑', '🚀', '💥', '🎯', '💜', '❤️', '💰', '🛍️', '📱', '🕹️', '🎉', '🆕', '✅', '🔔', '📢', '💬', '🤝', '🔒', '😍', '🥳', '😎', '🎊', '💯', '🔝', '🪙', '🏅', '🧿', '🆓'];
  function thOfAdmin() { return TH[pickTheme(rotOf({ rotation: A.rot }), Date.now())] || TH.glass; }
  function heroEditHtml() {
    var l = A.lay, th = thOfAdmin(), n = heroNOf(l, th), items = heroItems(A.d, l, th);
    if (!n) return '<p class="lb2a-empty">Kartu besar sedang Mati. Pilih “1 kartu” atau “2 kartu” di atas supaya bisa diedit.</p>';
    if (!items.length) return '<p class="lb2a-empty">Belum ada website yang bisa jadi kartu. Tambahkan di tab Link → WA Admin (isi nama + link https://).</p>';
    return items.map(function (it, k) {
      var idx = A.d.contacts.indexOf(it), cur = heroEmoji(it);
      return '<div class="lb2a-row lb2a-hed" data-s="contacts" data-i="' + idx + '"><div class="lb2a-hn">Kartu ' + (k + 1) + '</div>' +
        '<label class="lb2a-lbl">Label kecil di atas (mis. Paling dicari)</label><input data-f="htag" placeholder="kosong = tanpa label" value="' + E(heroTag(it, k)) + '">' +
        '<label class="lb2a-lbl">Judul besar</label><input data-f="hlabel" placeholder="Judul kartu" value="' + E(heroLabel(it)) + '">' +
        '<label class="lb2a-lbl">Keterangan kecil</label><input data-f="hsub" placeholder="kosong = tidak tampil" value="' + E(heroSub(it)) + '">' +
        '<label class="lb2a-lbl">Link tujuan kartu besar</label><input data-f="hurl" inputmode="url" placeholder="https://..." value="' + E(heroUrl(it)) + '">' +
        '<label class="lb2a-lbl">Emoji di depan judul' + (cur ? ': <b class="lb2a-cur">' + E(cur) + '</b>' : '') + '</label>' +
        '<div class="lb2a-emg">' + EMOJIS.map(function (e) { return '<button type="button" data-act="hemo" data-v="' + e + '"' + (cur === e ? ' class="on"' : '') + '>' + e + '</button>'; }).join('') + '<button type="button" class="x" data-act="hemo" data-v="">Hapus</button></div>' +
        '<input data-f="hemoji" placeholder="…atau ketik / tempel emoji sendiri dari keyboard HP" value="' + E(cur) + '"></div>';
    }).join('');
  }
  function layHtml() {
    var l = A.lay, th = thOfAdmin(), n = l.pages || (th.tabs === 3 ? 3 : 2), one = n === 1;
    var seg = function (act, cur, arr) { return '<div class="lb2a-seg">' + arr.map(function (o) { return '<button type="button" data-act="' + act + '" data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    var h = '<section class="lb2a-card"><h4>Jumlah halaman (tab)</h4><p>“1” = semua link satu daftar tanpa tab. “Bawaan” = ikut konsep (Glass Ungu 3 tab, konsep lain 2 tab).</p>' +
      seg('pages', l.pages, [[0, 'Bawaan'], [1, '1'], [2, '2'], [3, '3']]) + '</section>';
    var map = l.pages ? effMap(l, l.pages) : null, nm = '';
    for (var i = 0; i < n; i++) {
      var ph = map ? autoName(SECS.filter(function (k) { return map[k] === i; })) : (th.tabs === 3 ? ['Saluran', 'Grup JB', 'WA Admin'] : ['Saluran & Grup JB', 'WA Admin'])[i];
      nm += '<div class="lb2a-fld"><span>' + (one ? 'Judul' : 'Tab ' + (i + 1)) + '</span><input type="text" data-lay="name" data-i="' + i + '" placeholder="' + (one ? '(tanpa judul)' : E(ph || ('Halaman ' + (i + 1)))) + '" value="' + E(l.names[i] || '') + '"></div>';
    }
    h += one ? '<section class="lb2a-card"><h4>Judul halaman</h4><p>Karena cuma 1 halaman (tanpa tab), tulisan ini tampil sebagai judul besar di atas daftar link. Kosong = tanpa judul.</p>' + nm + '</section>'
      : '<section class="lb2a-card"><h4>Nama tab</h4><p>Ganti tulisan di tab, mis. “WA Jual Beli” atau “Grup GB”. Kosong = nama otomatis.</p>' + nm + '</section>';
    h += '<section class="lb2a-card"><h4>Judul bagian</h4><p>Tulisan pemisah di atas tiap daftar (mis. “Saluran”, “Join Grup WA Ku”). Kosongkan kalau mau judulnya hilang.</p>' +
      Object.keys(TITLES).map(function (k) {
        var lab = { channels: 'Saluran', groups: 'Grup WA', telegram: 'Grup Telegram', sites: 'Website', was: 'Nomor WA' }[k];
        return '<div class="lb2a-fld"><span>' + lab + '</span><input type="text" data-lay="title" data-k="' + k + '" placeholder="(tanpa judul)" value="' + E(l.titles[k] !== undefined && l.titles[k] !== null ? l.titles[k] : TITLES[k]) + '"></div>';
      }).join('') + '<div class="lb2a-add"><button type="button" class="lb2a-btn" data-act="titlesreset">Kembalikan judul bawaan</button></div></section>';
    h += '<section class="lb2a-card"><h4>Kartu besar di atas</h4><p>Kotak besar “Paling dicari”. Isinya website paling atas dari WA Admin. Semua tulisannya bisa diganti di sini.</p>' +
      '<label class="lb2a-lbl">Jumlah kartu</label>' + seg('heroes', l.heroes, [[-1, 'Bawaan'], [0, 'Mati'], [1, '1 kartu'], [2, '2 kartu']]) +
      '<label class="lb2a-lbl">Efek penarik perhatian</label>' + seg('fx', l.fx, [['', 'Bawaan'], ['pulse', 'Berdenyut'], ['shine', 'Kilau'], ['off', 'Mati']]) + '</section>';
    h += '<section class="lb2a-card"><h4>Isi kartu besar</h4>' + heroEditHtml() + '<p class="lb2a-hint">Bentuk emoji mengikuti HP orang yang membuka: iPhone tampil gaya Apple, Android gaya Google.</p></section>';
    if (l.pages) {
      var m = effMap(l, l.pages), opts = function (k) { var o = '<option value="-1"' + (m[k] === -1 ? ' selected' : '') + '>Sembunyikan</option>'; for (var j = 0; j < l.pages; j++) o += '<option value="' + j + '"' + (m[k] === j ? ' selected' : '') + '>Halaman ' + (j + 1) + '</option>'; return o; };
      h += '<details class="lb2a-card lb2a-adv"' + (window.__lb2adv ? ' open' : '') + ' ontoggle="window.__lb2adv=this.open"><summary>Pengaturan lanjutan: isi tiap halaman</summary><p>Pilih bagian mana tampil di halaman berapa.</p>' +
        SECS.map(function (k) { return '<div class="lb2a-fld"><span>' + SEC_NAME[k] + '</span><select data-act="map" data-k="' + k + '">' + opts(k) + '</select></div>'; }).join('') + '</details>';
    }
    return h;
  }
  function orderedAll() { var l = A.rot.list.map(function (id) { return TH[id]; }), rest = THEMES.filter(function (t) { return A.rot.list.indexOf(t.id) < 0; }); return l.concat(rest); }

  function setTab(t) {
    A.tab = t;
    [].forEach.call(document.querySelectorAll('#lb2a-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
    ['links', 'theme', 'layout', 'profile'].forEach(function (k) { var p = $('lb2a-p-' + k); if (p) p.classList.toggle('lb2a-hide', k !== t); });
    if (t === 'links') $('lb2a-links').innerHTML = linksHtml();
    if (t === 'theme') $('lb2a-theme').innerHTML = themeHtml();
    if (t === 'layout' && $('lb2a-layout')) $('lb2a-layout').innerHTML = layHtml();
  }
  function refresh() { var st = $('lb2a-body-scroll') ? $('lb2a-body-scroll').scrollTop : 0; setTab(A.tab); if ($('lb2a-body-scroll')) $('lb2a-body-scroll').scrollTop = st; }

  var _open = window.openLinkbioAdmin;
  window.openLinkbioAdmin = function () {
    if (typeof isAdmin === 'undefined' || !isAdmin) return;
    if (typeof _open === 'function') _open();
    var lb = Object.assign({}, defaultProfile.linkbio, profile.linkbio || {}), rot = rotOf(lb);
    A = { d: linkData(lb), lay: layOf(lb), rot: { mode: rot.mode, fixed: rot.fixed, n: rot.n, unit: rot.unit, order: rot.order, list: rot.list.slice(), anchor: rot.anchor, seed: rot.seed }, tab: 'links', orig: JSON.stringify([rot.mode, rot.n, rot.unit, rot.order, rot.list, rot.fixed]) };
    var uc = $('lb2a-usecolors'); if (uc) uc.checked = !!lb.useCustomColors;
    setTab('links');
  };

  function importText(text, replace) {
    var lines = String(text || '').split(/\r?\n/), found = { channels: [], groups: [], telegram: [], contacts: [] }, pending = null, n = 0;
    function flush(url) {
      var title = pending; pending = null;
      var sp = splitStatus(title || '');
      var k = kindOfUrl(url);
      if (!url) {
        if (title && /(^|\s)(gb|grup)\b/i.test(title) && sp.status !== 'aktif') found.groups.push({ id: uid(), label: nice(sp.label), url: '', icon: '', sub: '', status: sp.status, active: true });
        return;
      }
      var it = { id: uid(), label: nice(sp.label.replace(/^join\s+/i, '')) || 'Link', url: url, icon: '', sub: '', status: sp.status, active: true };
      if (k === 'ch') found.channels.push(it);
      else if (k === 'tg') found.telegram.push(it);
      else if (k === 'wa') { it.kind = 'wa'; found.contacts.push(it); }
      else if (k === 'gr') found.groups.push(it);
      else { it.kind = 'site'; found.contacts.push(it); }
    }
    lines.forEach(function (ln) {
      var bare = ln.match(/^[\s\-•>*]*((?:[a-z0-9-]+\.)+(?:com|id|net|co\.id|me))\/?[\s*]*$/i);
      if (bare) { flush('https://' + bare[1]); return; }
      var ph = ln.match(/^[\s\-•>*]*(?:\+?62|0)(8[\d\s-]{7,14})[\s*]*$/);
      if (ph) { flush('https://wa.me/62' + ph[1].replace(/[\s-]/g, '')); return; }
      var u = ln.match(/https?:\/\/[^\s<>"']+/);
      if (u) { flush(u[0].replace(/[)\]*.,]+$/, '')); return; }
      var t = ln.replace(/[*_>~`]/g, '').replace(/^[\s\-•]+/, '').trim();
      if (!t || /^[━─=\-_\s]+$/.test(t)) return;
      if (pending) flush('');
      if (/(gb|grup|saluran|channel|telegram|website|top\s*up|stok|^wa\b)/i.test(t)) pending = t;
    });
    if (pending) flush('');
    ['channels', 'groups', 'telegram', 'contacts'].forEach(function (k) {
      if (!found[k].length) return;
      n += found[k].length;
      if (replace) { if (k === 'contacts') { var keep = A.d.contacts.filter(function (c) { return !found.contacts.some(function (f) { return f.kind === c.kind; }); }); A.d.contacts = keep.concat(found.contacts); } else A.d[k] = found[k]; }
      else A.d[k] = A.d[k].concat(found[k]);
    });
    return n;
  }

  var root = $('modal-linkbio-admin');
  if (root) {
    root.addEventListener('input', function (e) {
      var t = e.target, row = t.closest ? t.closest('.lb2a-row') : null;
      if (t.id && t.id.indexOf('lb2a-note-') === 0 && A) { if (!A.d.notes) A.d.notes = { channels: '', groups: '', contacts: '' }; A.d.notes[t.id.slice(10)] = t.value; return; }
      var lay = t.getAttribute && t.getAttribute('data-lay');
      if (lay && A) { if (lay === 'name') A.lay.names[+t.getAttribute('data-i')] = t.value; else if (lay === 'title') A.lay.titles[t.getAttribute('data-k')] = t.value; return; }
      if (t.getAttribute && t.getAttribute('data-f2') === 'n') { A.rot.n = Math.max(1, Math.min(999, parseInt(t.value, 10) || 1)); return; }
      if (!row || !A || !t.getAttribute('data-f')) return;
      var it = A.d[row.getAttribute('data-s')][+row.getAttribute('data-i')], f = t.getAttribute('data-f');
      if (f === 'active') { it.active = t.checked; row.classList.toggle('off', !t.checked); } else it[f] = t.value;
    });
    root.addEventListener('change', function (e) {
      var t = e.target, a = t.getAttribute && t.getAttribute('data-act');
      if (a === 'icon') { var row = t.closest('.lb2a-row'); iconUpload(row.getAttribute('data-s'), +row.getAttribute('data-i'), t); }
      else if (a === 'tpick') { var id = t.getAttribute('data-v'), l = A.rot.list, p = l.indexOf(id); if (t.checked && p < 0) l.push(id); else if (!t.checked && p > -1 && l.length > 1) l.splice(p, 1); else if (!t.checked) { t.checked = true; showToast('Minimal 1 konsep harus ikut berputar.'); } refresh(); }
      else if (a === 'map') { A.lay.map[t.getAttribute('data-k')] = parseInt(t.value, 10); refresh(); }
      else if (t.id === 'lb2a-usecolors') { /* dibaca saat simpan */ }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act],#lb2a-tabs button') : null; if (!b || !A) return;
      if (b.parentNode && b.parentNode.id === 'lb2a-tabs') { setTab(b.getAttribute('data-t')); return; }
      var a = b.getAttribute('data-act'), v = b.getAttribute('data-v'), s = b.getAttribute('data-s'), row = b.closest('.lb2a-row'), i = row ? +row.getAttribute('data-i') : -1, sec = row ? row.getAttribute('data-s') : s;
      var r = A.rot;
      if (a === 'icon') return;
      if (a === 'add') {
        var nowT = Date.now(); if (A.__lastAdd && nowT - A.__lastAdd < 450) return; A.__lastAdd = nowT;   // satu ketukan tidak boleh terhitung dua kali
        var it = { id: uid(), label: '', url: '', icon: '', sub: '', status: 'aktif', active: true };
        if (s === 'contacts') { it.kind = b.getAttribute('data-k') || 'site'; if (it.kind === 'wa') it.url = 'https://wa.me/62'; }
        A.d[s].push(it); refresh();
        var rows = root.querySelectorAll('.lb2a-row[data-s="' + s + '"]'); var last = rows[rows.length - 1]; if (last) { last.scrollIntoView({ block: 'center' }); var inp = last.querySelector('[data-f="label"]'); if (inp) inp.focus(); }
      } else if (a === 'del') { if (window.confirm('Hapus tombol ini?')) { A.d[sec].splice(i, 1); refresh(); } }
      else if (a === 'up' || a === 'dn') { var j = a === 'up' ? i - 1 : i + 1, arr = A.d[sec]; if (j >= 0 && j < arr.length) { var x = arr[i]; arr[i] = arr[j]; arr[j] = x; refresh(); } }
      else if (a === 'st') { A.d[sec][i].status = v; refresh(); }
      else if (a === 'clear') { if (window.confirm('Kosongkan semua isi bagian ini? Baru tersimpan setelah kamu menekan Simpan.')) { A.d[s] = []; if (s === 'groups' && A.d.notes) A.d.notes.groups = ''; refresh(); } }
      else if (a === 'clearall') { if (window.confirm('Reset SEMUA link (saluran, grup, telegram, kontak)? Baru tersimpan setelah kamu menekan Simpan.')) { A.d = { channels: [], groups: [], telegram: [], contacts: [], note: '', notes: A.d.notes || { channels: '', groups: '', contacts: '' } }; refresh(); } }
      else if (a === 'imp') { var n = importText(($('lb2a-imp') || {}).value, b.getAttribute('data-m') === 'replace'); if (!n) { showToast('Tidak ada link yang terbaca dari teks itu.'); return; } showToast(n + ' link dimasukkan. Jangan lupa Simpan.'); refresh(); }
      else if (a === 'mode') { r.mode = v; refresh(); }
      else if (a === 'fixed') { r.fixed = v; refresh(); }
      else if (a === 'unit') { r.unit = v; refresh(); }
      else if (a === 'order') { r.order = v; refresh(); }
      else if (a === 'tup' || a === 'tdn') { var l = r.list, p = l.indexOf(v), q = a === 'tup' ? p - 1 : p + 1; if (p > -1 && q >= 0 && q < l.length) { var tmp = l[p]; l[p] = l[q]; l[q] = tmp; refresh(); } }
      else if (a === 'pages') { A.lay.pages = parseInt(v, 10) || 0; if (A.lay.pages) { SECS.forEach(function (k) { if (parseInt(A.lay.map[k], 10) >= A.lay.pages) delete A.lay.map[k]; }); } refresh(); }
      else if (a === 'heroes') { A.lay.heroes = parseInt(v, 10); refresh(); }
      else if (a === 'fx') { A.lay.fx = v || ''; refresh(); }
      else if (a === 'titlesreset') { A.lay.titles = {}; refresh(); }
      else if (a === 'hemo') { A.d[sec][i].hemoji = v; refresh(); }
      else if (a === 'emo') { var cur = A.d[sec][i], base = String(cur.label || '').replace(/^[^\p{L}\p{N}]+/u, ''); cur.label = v ? (v + ' ' + base) : base; refresh(); }
      else if (a === 'restart') { r.anchor = 0; r._restart = 1; showToast('Jadwal dimulai ulang saat kamu menekan Simpan.'); }
    });
  }
  async function iconUpload(sec, i, input) {
    var f = input.files[0]; if (!f || !A) return;
    try {
      var c = await compressImage(f, 160, 0.85);
      A.d[sec][i].icon = await uploadImageToStorage(c, 'linkbio/icon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.jpg');
      refresh();
    } catch (err) { console.error(err); showToast('Gagal mengunggah ikon: ' + (err.message || err.code || 'error tidak diketahui')); }
  }

  window.saveLinkbioAdmin = async function () {
    if (!A || !linkbioAdminDraft) return;
    linkbioCommitMusicTrim();
    freezeHeroes(A.d.contacts);
    var old = profile.linkbio || {}, clean = function (arr) { return arr.filter(function (x) { return (x.label || '').trim(); }).map(function (x) { x.label = x.label.trim(); x.url = (x.url || '').trim(); if (hasV(x.hurl)) x.hurl = String(x.hurl).trim(); return x; }); };
    var d = { channels: clean(A.d.channels), groups: clean(A.d.groups), telegram: clean(A.d.telegram), contacts: clean(A.d.contacts) };
    var r = A.rot, sig = JSON.stringify([r.mode, r.n, r.unit, r.order, r.list, r.fixed]);
    if (!r.anchor || r._restart || sig !== A.orig) {
      var now = Date.now(); r.anchor = r.unit === 'day' ? startOfWibDay(now) : Math.floor(now / 3600e3) * 3600e3;
      if (r.order === 'acak' && (sig !== A.orig || r._restart)) r.seed = 1 + Math.floor(Math.random() * 1e6);
    }
    var rot = { mode: r.mode, fixed: r.fixed, n: r.n, unit: r.unit, order: r.order, list: r.list, anchor: r.anchor, seed: r.seed };
    var updated = Object.assign({}, old, {
      name: $('linkbio-f-name').value.trim() || defaultProfile.linkbio.name,
      avatarUrl: linkbioAdminAvatarData || defaultProfile.linkbio.avatarUrl,
      verified: $('linkbio-f-verified').checked,
      musicPlaylist: linkbioAdminDraft.musicPlaylist.filter(function (s) { return s.url; }).map(function (s) { return { id: s.id, url: s.url, name: s.name || 'Lagu', start: Number(s.start) || 0, end: (s.end === null || s.end === undefined) ? null : Number(s.end) }; }),
      musicUrl: '', musicStart: 0, musicEnd: null,
      bgColor: linkbioAdminColors.bg || '', boxColor: linkbioAdminColors.box || '', textColor: linkbioAdminColors.text || '',
      useCustomColors: !!($('lb2a-usecolors') && $('lb2a-usecolors').checked),
      channels: d.channels, groups: d.groups, telegram: d.telegram, contacts: d.contacts, groupNote: String((A.d.notes && A.d.notes.groups) || '').trim(),
      notes: { channels: String((A.d.notes && A.d.notes.channels) || '').trim(), groups: String((A.d.notes && A.d.notes.groups) || '').trim(), contacts: String((A.d.notes && A.d.notes.contacts) || '').trim() },
      rotation: rot,
      layout: { pages: A.lay.pages || 0, map: A.lay.map, names: [0, 1, 2].map(function (i) { return String(A.lay.names[i] || '').trim(); }), titles: A.lay.titles, heroes: A.lay.heroes, fx: A.lay.fx || '' },
      v: 2
    });
    showToast('Menyimpan...');
    var ok = await saveProfile({ linkbio: updated });
    if (ok) { profile.linkbio = updated; curTab = 0; curTheme = ''; lb2Render(); closeModal('modal-linkbio-admin'); showToast('Link Bio tersimpan.'); }
  };
})();
