/* ---------------- Rental duration selector (detail modal) ---------------- */
/* Nyimpen durasi yang lagi dipilih user per postingan (postId -> 'hour'|'pakmal'|'day').
   Direset tiap kali detail modal dibuka biar gak nyangkut dari sesi sebelumnya. */
let selectedRentalDuration = {};
/* Nyimpen jumlah jam yang diketik user di opsi "Sewa Custom" per postingan (postId -> string jumlah jam). */
let customRentalHours = {};
/* Daftar tipe durasi rental yang tersedia (bisa ditambah admin lewat pengaturan kategori). */
function getRentalDurationTypes() {
  return (profile.rentalDurationTypes && profile.rentalDurationTypes.length) ? profile.rentalDurationTypes : defaultProfile.rentalDurationTypes;
}
/* hour/day/pakmal tetap dipetakan ke field lama (priceHour/priceDay/pricePakmal) biar data postingan
   lama gak perlu dimigrasi. Tipe durasi custom baru disimpan di post.customRentalPrices[key]. */
/* Link di deskripsi jadi bisa diklik. Link inventory/profil Roblox & link lain -> tombol "Full Spek" (buka tab baru);
   link wa.me tetap tampil sebagai teks link biasa yang bisa diklik. */
function linkifyDesc(text) {
  const raw = String(text || '');
  const re = /(https?:\/\/[^\s<>"']+|(?:wa\.me|www\.roblox\.com)\/[^\s<>"']+)/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(raw)) !== null) {
    let url = m[0], trail = '';
    const t = url.match(/[.,;:!?)\]]+$/); if (t) { trail = t[0]; url = url.slice(0, -trail.length); }
    const href = /^https?:/i.test(url) ? url : 'https://' + url;
    out += escapeHtml(raw.slice(last, m.index));
    if (/(^|\/\/)(www\.)?wa\.me/i.test(href)) {
      out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:#86efac;text-decoration:underline">${escapeHtml(url)}</a>`;
    } else {
      out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="display:inline-block;margin:2px 0;padding:3px 12px;border-radius:9999px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;font-weight:700;text-decoration:none">Full Spek ↗</a>`;
    }
    out += escapeHtml(trail);
    last = m.index + m[0].length;
  }
  return out + escapeHtml(raw.slice(last));
}
/* Pisahkan link non-WA (inventory/full spek) dari deskripsi: teksnya dibuang dari deskripsi, linknya jadi tombol besar di atas harga. */
function splitSpekLinks(desc) {
  const raw = String(desc || '');
  const links = [];
  const re = /https?:\/\/[^\s<>"']+|(?:www\.roblox\.com)\/[^\s<>"']+/gi;
  let text = raw.replace(re, (m) => {
    let url = m.replace(/[.,;:!?)\]]+$/, '');
    const href = /^https?:/i.test(url) ? url : 'https://' + url;
    if (/(^|\/\/)(www\.)?wa\.me/i.test(href)) return m;
    links.push(href);
    return '';
  });
  text = text.split('\n').filter(l => !/^\s*>?\s*inventory\s*:?\s*$/i.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, links };
}
function renderSpekButtons(post, skipEntrance, baseDelay) {
  if (post.soldOut || (!post.desc && !post.detail)) return '';
  let text, links;
  const dl = String(post.detail || '').trim();
  if (post.game === 'RB' && dl) {
    // Roblox: "Detail akun" = link inventory, "Deskripsi akun" = teks deskripsi
    links = (dl.match(/https?:\/\/[^\s<>"']+|www\.roblox\.com\/[^\s<>"']+/gi) || []).map(u => /^https?:/i.test(u) ? u : 'https://' + u);
    text = String(post.desc || '').trim();
  } else { ({ text, links } = splitSpekLinks(post.desc)); }
  const cls = skipEntrance ? '' : ' detail-content-in';
  const dly = skipEntrance ? '' : ` animation-delay:${(baseDelay || 0).toFixed(2)}s;`;
  const gradBtn = 'press-glow flex-1 block rounded-xl py-3 text-center text-sm font-extrabold text-white';
  const gradSt = 'background:linear-gradient(135deg,#ec4899,#a855f7);text-decoration:none;box-shadow:0 6px 18px rgba(168,85,247,.35)';
  if (post.game === 'RB') {
    // Roblox: [Deskripsi v] (klik dulu baru deskripsi muncul) + [Inventory]
    if (!links.length && !text) return '';
    const id = 'rbdesc-' + String(post.id).replace(/[^\w-]/g, '');
    const descBtn = text ? `<button type="button" class="rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/20 bg-white/5" onclick="event.stopPropagation();var d=document.getElementById('${id}');var o=d.style.display==='none';d.style.display=o?'block':'none';this.querySelector('i').textContent=o?'\u25B4':'\u25BE';">Deskripsi <i style="font-style:normal">\u25BE</i></button>` : '';
    const invBtns = links.map((u, i) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="${gradBtn}" style="${gradSt}">Inventory${links.length > 1 ? ' ' + (i + 1) : ''} \u2197</a>`).join('');
    return `<div class="mt-2${cls}" style="${dly}"><div class="flex gap-2">${descBtn}${invBtns}</div>` +
      (text ? `<p id="${id}" class="mt-2 text-xs text-white/70 whitespace-pre-line" style="display:none">${linkifyDesc(text)}</p>` : '') + `</div>`;
  }
  if (!links.length) return '';
  return `<div class="mt-2 flex flex-col gap-2${cls}" style="${dly}">` + links.map((u, i) =>
    `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="${gradBtn}" style="${gradSt}">Full Spek${links.length > 1 ? ' ' + (i + 1) : ''} \u2197</a>`).join('') + `</div>`;
}
function getRentalPriceForType(post, key) {
  if (key === 'hour') return post.priceHour;
  if (key === 'day') return post.priceDay;
  if (key === 'pakmal') return post.pricePakmal;
  return (post.customRentalPrices || {})[key];
}
function setRentalPriceForType(post, key, val) {
  if (key === 'hour') { post.priceHour = val; return; }
  if (key === 'day') { post.priceDay = val; return; }
  if (key === 'pakmal') { post.pricePakmal = val; return; }
  post.customRentalPrices = post.customRentalPrices || {};
  post.customRentalPrices[key] = val;
}
function getDurationPlaceholder(key) {
  if (key === 'hour') return 'Contoh: Rp3.000';
  if (key === 'day') return 'Contoh: Rp15.000';
  if (key === 'pakmal') return 'Contoh: Rp50.000';
  return 'Contoh: Rp10.000';
}
function getDurationFieldLabel(t) {
  if (t.key === 'pakmal') return `Harga ${t.label} (Paket Malam 21.00-08.00)`;
  return `Harga ${t.label}`;
}
/* Render input harga per tipe durasi rental secara dinamis (bisa nambah sendiri lewat admin). */
function renderRentalPriceFields(post) {
  const wrap = document.getElementById('post-rental-price-fields');
  if (!wrap) return;
  wrap.innerHTML = getRentalDurationTypes().map(t => {
    const val = post ? (getRentalPriceForType(post, t.key) || '') : '';
    return `<div><label class="text-xs text-white/60">${escapeHtml(getDurationFieldLabel(t))}</label><input data-dur-key="${escapeHtml(t.key)}" class="input post-price-dur mt-1 w-full rounded-lg px-3 py-2" placeholder="${escapeHtml(getDurationPlaceholder(t.key))}" value="${escapeHtml(String(val))}" /></div>`;
  }).join('');
  wrap.querySelectorAll('.post-price-dur').forEach(attachRupiahFormatter);
}
function getRentalOptions(post) {
  const opts = [];
  getRentalDurationTypes().forEach(t => {
    const price = getRentalPriceForType(post, t.key);
    if (price) opts.push({ key: t.key, label: t.label, waLabel: t.waLabel, price, note: t.note, badge: t.badge });
  });
  return opts;
}
function renderRentalPriceBlock(post, skipEntrance, baseDelay) {
  baseDelay = baseDelay || 0;
  const opts = getRentalOptions(post);
  const priceHourNum = parseRupiahNumber(post.priceHour);
  const hasCustom = !!priceHourNum;
  if (!opts.length && !hasCustom) return '';
  const selKey = selectedRentalDuration[post.id];
  const optsHtml = opts.map((o, oi) => {
    const active = selKey === o.key;
    const optDelay = baseDelay + oi * 0.04;
    return `
    <button type="button" onclick="selectRentalDuration('${post.id}','${o.key}')" class="${skipEntrance ? '' : 'detail-content-in'} flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition ${active ? 'border-pink-400 bg-pink-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}"${skipEntrance ? '' : ` style="animation-delay:${optDelay.toFixed(2)}s"`}>
      <span class="flex items-center gap-2.5">
        <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${active ? 'border-pink-400 bg-pink-500' : 'border-white/30'}">${active ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:9px;height:9px"><path d="M20 6 9 17l-5-5"/></svg>' : ''}</span>
        <span>
          <span class="flex items-center gap-1.5">
            <span class="rental-opt-label block text-xs font-semibold text-white">${escapeHtml(o.label)}</span>
            ${o.badge ? `<span class="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-green-400">${escapeHtml(o.badge)}</span>` : ''}
          </span>
          ${o.note ? `<span class="block text-[10px] text-amber-300/90">${escapeHtml(o.note)}</span>` : ''}
        </span>
      </span>
      <span class="flex-shrink-0 text-xs font-bold price-font ${post.rentalGame === 'ML' ? 'text-pink-300' : 'text-purple-300'}">${escapeHtml(formatRp(o.price))}</span>
    </button>`;
  }).join('');

  /* Opsi "Sewa Custom": user ngetik sendiri mau berapa jam, harga dihitung otomatis dari
     harga per 1 jam (post.priceHour) dikali jumlah jam yang diketik. */
  const hoursRaw = customRentalHours[post.id] || '';
  const hoursNum = parseInt(hoursRaw, 10);
  const customPrice = (hasCustom && hoursNum > 0) ? hoursNum * priceHourNum : null;
  const customActive = selKey === 'custom' && customPrice;
  const customDelay = baseDelay + opts.length * 0.04;
  const customHtml = hasCustom ? `
    <div class="${skipEntrance ? '' : 'detail-content-in'} rounded-lg border px-3 py-2.5 transition ${customActive ? 'border-pink-400 bg-pink-500/15' : 'border-white/10 bg-white/[0.03]'}" onclick="selectCustomRentalDuration('${post.id}')" style="cursor:pointer${skipEntrance ? '' : `;animation-delay:${customDelay.toFixed(2)}s`}">
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-2.5">
          <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${customActive ? 'border-pink-400 bg-pink-500' : 'border-white/30'}">${customActive ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:9px;height:9px"><path d="M20 6 9 17l-5-5"/></svg>' : ''}</span>
          <span class="rental-opt-label text-xs font-semibold text-white">Sewa Custom</span>
        </span>
        <span class="flex flex-shrink-0 items-center gap-1.5">
          <input type="text" inputmode="numeric" pattern="[0-9]*" placeholder="0" value="${hoursRaw ? escapeHtml(String(hoursRaw)) : ''}" oninput="updateCustomRentalHours('${post.id}', this.value)" class="custom-rental-hours-input input w-14 rounded-md px-2 py-1 text-center text-xs" />
          <span class="text-[11px] text-white/50">jam</span>
        </span>
      </div>
      ${customPrice
        ? `<div class="mt-1.5 flex items-center justify-between"><span class="text-[10px] text-white/40">${hoursNum} jam × ${escapeHtml(formatRp(post.priceHour))}</span><span class="flex-shrink-0 text-xs font-bold price-font ${post.rentalGame === 'ML' ? 'text-pink-300' : 'text-purple-300'}">${escapeHtml(formatRupiahNumber(customPrice))}</span></div>`
        : `<p class="mt-1 text-[10px] text-white/35">Ketik jumlah jam, harga kehitung otomatis</p>`}
    </div>` : '';

  const selOpt = customActive
    ? { price: formatRupiahNumber(customPrice), waLabel: `${hoursNum} jam` }
    : opts.find(o => o.key === selKey);
  const waNumber = getBeliWaNumber();
  let ctaHtml;
  const ctaDelay = (baseDelay + opts.length * 0.04 + (hasCustom ? 0.04 : 0)).toFixed(2);
  if (selOpt && waNumber) {
    const titleLower = (post.title || '').toLowerCase().trim();
    const namaRental = titleLower.startsWith('rental') ? titleLower : ('rental ' + titleLower);
    const waMsg = encodeURIComponent(`min aku mau ${namaRental} ${selOpt.waLabel}\nkirim payment min`);
    // Teks kecil "Chat ke sini, Rental - Rp X" nempel tepat di atas tombol WA -- ngasih tau
    // jelas kalau tombol di bawahnya itu yang harus diklik buat chat, sekalian nunjukin lagi
    // harga yang kepilih (biar user yakin sebelum ngeklik ke WA).
    const chatHint = `<p class="${skipEntrance ? '' : 'detail-content-in'} mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-white/55"${skipEntrance ? '' : ` style="animation-delay:${ctaDelay}s"`}><span>Chat ke sini, Rental - ${escapeHtml(formatRp(selOpt.price))}</span>${priceCopyLinkBtn(post)}</p>`;
    ctaHtml = chatHint + `<a href="https://wa.me/${waNumber}?text=${waMsg}" onclick="playSfx('buy')" target="_blank" rel="noreferrer" class="${skipEntrance ? '' : 'detail-content-in'} primary press-glow btn-attract mt-1.5 block w-full text-center rounded-lg py-2.5 text-sm font-semibold"${skipEntrance ? '' : ` style="animation-delay:${ctaDelay}s"`}>Rental — ${escapeHtml(formatRp(selOpt.price))}</a>`;
  } else {
    ctaHtml = `<button type="button" disabled class="${skipEntrance ? '' : 'detail-content-in'} mt-2.5 block w-full cursor-not-allowed rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold text-white/40"${skipEntrance ? '' : ` style="animation-delay:${ctaDelay}s"`}>Pilih Durasi Rental</button>`;
  }
  return `<div class="mt-2 space-y-2">${optsHtml}${customHtml}</div>${ctaHtml}`;
}
/* Dipanggil tiap user ngetik di kolom "Sewa Custom". Section-nya di-render ulang biar harga & tombol
   WA ikut update, tapi fokus + posisi kursor di input dikembalikan lagi biar ga keputus pas lagi ngetik. */
/* Dipanggil pas user nge-klik baris "Sewa Custom" (bukan cuma ngetik di input-nya) -- misalnya
   abis sempet milih durasi lain padahal jam custom-nya udah keisi valid, atau mau fokus ke
   input buat ngetik jam. */
function selectCustomRentalDuration(postId) {
  playSfx('filterSelect');
  const hoursRaw = customRentalHours[postId] || '';
  if (hoursRaw && parseInt(hoursRaw, 10) > 0) selectedRentalDuration[postId] = 'custom';
  const post = posts.find(p => p.id === postId);
  const section = document.querySelector(`.detail-snap-section[data-post-id="${postId}"]`) || document.querySelector(`[data-post-id="${postId}"]`);
  if (!post || !section) return;
  section.innerHTML = renderDetailHtml(post, false, true);
  const input = section.querySelector('.custom-rental-hours-input');
  if (input) {
    input.focus();
    const len = input.value.length;
    try { input.setSelectionRange(len, len); } catch (e) {}
  }
}
function updateCustomRentalHours(postId, val) {
  val = (val || '').replace(/[^0-9]/g, '');
  customRentalHours[postId] = val;
  if (val && parseInt(val, 10) > 0) selectedRentalDuration[postId] = 'custom';
  else if (selectedRentalDuration[postId] === 'custom') delete selectedRentalDuration[postId];
  const post = posts.find(p => p.id === postId);
  const section = document.querySelector(`.detail-snap-section[data-post-id="${postId}"]`) || document.querySelector(`[data-post-id="${postId}"]`);
  if (!post || !section) return;
  section.innerHTML = renderDetailHtml(post, false, true);
  const input = section.querySelector('.custom-rental-hours-input');
  if (input) {
    input.focus();
    const len = input.value.length;
    try { input.setSelectionRange(len, len); } catch (e) {}
  }
}
/* Tombol kecil "salin link postingan" di samping harga (detail Stok & tombol Rental). KHUSUS ADMIN: pembeli tidak melihatnya.
   Dulu fungsi ini dipanggil tapi tidak pernah dibuat -> memilih jam rental error. */
function priceCopyLinkBtn(post) {
  if (typeof isAdmin === 'undefined' || !isAdmin || !post || !post.id) return '';
  const id = String(post.id).replace(/[^A-Za-z0-9_\-]/g, '');
  return `<button type="button" class="price-copy-link" aria-label="Salin link postingan" title="Salin link postingan" onclick="event.stopPropagation();copyPostLink('${id}')" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:6px;padding:0;border:0;border-radius:50%;background:rgba(127,127,160,.28);color:inherit;cursor:pointer;flex:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg></button>`;
}
function renderStokPriceBlock(post, skipEntrance, baseDelay) {
  const cls = skipEntrance ? '' : ' detail-content-in';
  const dlyAttr = skipEntrance ? '' : ` style="animation-delay:${(baseDelay || 0).toFixed(2)}s"`;
  // FITUR BARU: kalau Harga belum diisi admin, tetap tampilin kotaknya (bukan hilang total)
  // dengan teks "Belum diedit", biar keliatan jelas kalau postingan ini emang belum diisi
  // harganya, bukan cuma kosong diam-diam.
  if (!post.price) {
    return `
    <div class="mt-1 flex items-center justify-center gap-1.5 rounded-lg btn-ghost px-2 py-2.5${cls}"${dlyAttr}>
      <span class="price-font text-base font-semibold text-white/40">Belum diedit</span>
    </div>`;
  }
  const gameColorClass = isPinkGame(post.game) ? 'text-pink-400' : 'text-purple-300';
  if (post.discountActive && post.discountPrice) {
    const origNum = parseRupiahNumber(post.price);
    const discNum = parseRupiahNumber(post.discountPrice);
    const hemat = (origNum != null && discNum != null && origNum > discNum) ? origNum - discNum : null;
    return `
    <div class="mt-1 flex flex-col items-center gap-1 rounded-lg btn-ghost px-2 py-2.5${cls}"${dlyAttr}>
      <span class="price-font text-sm font-medium text-white/40 line-through">${escapeHtml(formatRp(post.price))}</span>
      <span class="flex items-center gap-1.5">
        <span class="price-font text-2xl font-bold text-pink-400">${escapeHtml(formatRp(post.discountPrice))}</span>
        ${priceCopyLinkBtn(post)}
      </span>
      ${hemat ? `<span class="price-font text-xs font-bold text-green-400">Hemat ${escapeHtml(formatRupiahNumber(hemat))}</span>` : ''}
    </div>`;
  }
  return `
    <div class="mt-1 flex items-center justify-center gap-1.5 rounded-lg btn-ghost px-2 py-2.5${cls}"${dlyAttr}>
      <span class="price-font text-xl font-bold ${gameColorClass}">${escapeHtml(formatRp(post.price))}</span>
      ${priceCopyLinkBtn(post)}
    </div>`;
}
// Baris info singkat (garansi/cicil/tukar tambah) di BAWAH kotak harga -- ikon gaya flat-
// sticker (bukan lingkaran warna solid lagi) niru persis file lightning.webp yang dikasih
// user, dan animasinya auto-scroll (marquee) niru video referensi (baris "Jaminan Layanan..."
// yang geser ke kiri terus-terusan tanpa putus). Kontennya di-duplikat 2x di dalam track biar
// loopingnya mulus (translateX(-50%) pas balik ke awal gak keliatan "loncat").
// Ikon lightning pakai file asli (lightning.webp, di-embed base64 biar gak perlu hosting
// terpisah). 2 ikon lain (shield & tukar-tambah) dibikin gaya flat-sticker senada (warna solid
// dua-nada + bentuk membulat) biar konsisten walau bukan file asli dari user.
const STOK_INFO_ICON_LIGHTNING = 'data:image/webp;base64,UklGRmAFAABXRUJQVlA4WAoAAAAwAAAAlQAAlQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBI4QAAAAEPMP8REQJObW0RHDizUCIBKViJE5CGFCRQzsLhm5X/JV26iP5PgPu3rx7oARjEhZjEIgRUohGdGDrYLn9kEouQvKkSjejEIC7ElJx5EQIq0YguFdMgLsQkFiGgSsqWRnRiEBdiSkqWRQiob9nQiP4mvzc+SHHn8qXszC/aWYSA+q1stF/JRCLiRv0WNpxz7cNhz33whDMuSYXIFklKRCQCcSC8ob45oBCZSES0NEmBOBCecEAhsqlLiYhEIA6ENw3JAYXIRCIiEWwXHQhPOKAQGZiJiEQgDoQHLg78If7NAQBWUDggiAIAABAVAJ0BKpYAlgA+bTaWSKQjIiEl0rkQgA2JY27gwAP4Aw1f4AfoBngEAAfgBeSNy/btddh+55+F+dunTsuf4HTS8wD9S+kB5gOif6AH9A/1XWAegB+kHpj+wv+7f7Z+zY+/wdR2VDIQEqNU+D37Y39dv2NkbKhCTvbzZIP2w7RiqEQ7Gn5Qt/h1SVIhd+EZwSi4D7oJ7nSLaWwKi6pS7JD7Q9G0qGJ90AVls8gJUbdUAAD9pAgBzyS3//5d8P4Z8bnXzLvx386kPAH4e1TRyIVL58R6DU+QJAug3PW/4dfluAdf+GteiSPQ4a3regGDq8jHpLYdMT/F2zGZ0aqeWoTOmxNv5/l3BRnW7P+WJfdADjpABc/kCkAHRt15X+qI7pSmNLdk5Q/IdG0S5QEwiLPsoGzGZ0argsx0DiHJRHZeZmZu6RjH/lrBjoomI6hkRhFChnnTrfGWh9Y3JR/mN6p54et6AYOryMdu4JtgLGZ2B7zLffuCXSgq6F95v/MtSkK9WbAuU+iMKGbKztJfnEgoG0Cj/1Vi+QV4NQhjbBYFlcFt1tWP19zKhchsfNZQD5J78whyDSO4TCfWYey7NnkXy5wNBKFs8ywTo+NzME68FQdZzSRDLN/Pg7YmNNupwfvJS92afv/uXf/w1OscRe7nCoK9i3UBtVtQRjzAyRhK8q7v9mW3caumCojzCJ/H/ADv9TWCsClA9yvxQEEQxikpfa+Ouj4L8OL1w/+matqnkm0iZ0gx7V7KyvLqlKwSu1T8ugr49utTAoCtN9v6yVATn1uqjEW/iuthM2JKw9Vv/uHoV9qnkm0iWr1BKCIpXkt+Su/9VcFs8PnG6PQlG1X2pW4AAAAAAA==';
const STOK_INFO_ROW_ITEMS = [
  { label: 'Allref Bergaransi', img: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%2360a5fa" d="M12 2 4 5v6c0 5 3.5 9.3 8 11 4.5-1.7 8-6 8-11V5z"/><path fill="%232563eb" d="m9.3 12.1 1.9 1.9 4-4.3-1.2-1.1-2.9 3.1-.8-.8z"/></svg>'.replace(/%23/g,'#')) },
  { label: 'Open Cicil', img: STOK_INFO_ICON_LIGHTNING },
  { label: 'Open Tukar Tambah', img: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c084fc" d="M16.2 2.8 20.7 7l-4.5 4.2V8.3H4V6h12.2z"/><path fill="#9333ea" d="M7.8 21.2 3.3 17l4.5-4.2v2.9H20V18H7.8z"/></svg>'.replace(/%23/g,'#')) },
];
function renderStokInfoRow(post, skipEntrance, baseDelay) {
  return ''; // DIHAPUS atas permintaan: Open Cicil / Open Tukar Tambah / Allref Bergaransi tidak ditampilkan lagi
  if (post.soldOut || !post.price) return '';
  const cls = skipEntrance ? '' : ' detail-content-in';
  const dlyAttr = skipEntrance ? '' : ` style="animation-delay:${(baseDelay || 0).toFixed(2)}s"`;
  const renderItems = () => STOK_INFO_ROW_ITEMS.map(it => `
      <span class="inline-flex flex-shrink-0 items-center gap-1.5 px-3">
        <img src="${it.img}" alt="" class="flex-shrink-0" style="width:20px;height:20px;object-fit:contain" />
        <span class="stok-info-font whitespace-nowrap text-[11px]">${escapeHtml(it.label)}</span>
      </span>`).join('');
  // Track-nya isinya 2 SET item yang sama persis ditaro berurutan -- pas animasi geser sejauh
  // 50% lebar track (= persis 1 set), langsung nyambung mulus ke set kedua yang emang identik,
  // jadi kelihatannya muter terus tanpa putus/loncat.
  return `
    <div class="stok-info-marquee mt-2${cls}"${dlyAttr}>
      <div class="stok-info-marquee-track">${renderItems()}${renderItems()}</div>
    </div>`;
}
function selectRentalDuration(postId, key) {
  playSfx('filterSelect');
  selectedRentalDuration[postId] = key;
  const post = posts.find(p => p.id === postId);
  // BUG YANG DIPERBAIKI: sebelumnya query-nya cuma `[data-post-id="..."]` doang, yang ternyata
  // BUKAN cuma nempel di section detail -- tombol Suka & Wishlist di kartu grid belakang juga
  // punya atribut data-post-id yang sama. Jadi document.querySelector() sering nyangkut ke
  // elemen yang SALAH (ketimpa duluan sama elemen kartu grid, bukan section detailnya), bikin
  // klik "1 Jam"/opsi durasi lain kelihatan gak ngefek/ngebug. Sekarang diprioritasin nyari
  // `.detail-snap-section[data-post-id="..."]` dulu (spesifik ke section detail), baru fallback
  // ke selector umum kalau itu nggak ketemu.
  const section = document.querySelector(`.detail-snap-section[data-post-id="${postId}"]`) || document.querySelector(`[data-post-id="${postId}"]`);
  if (post && section) section.innerHTML = renderDetailHtml(post, false, true);
}

function postThumb(post, i) {
  const thumbImgRaw = post.slide1 || (post.slide2Images && post.slide2Images[0]) || null;
  // Thumbnail grid tetap dikecilin (kartu emang cuma butuh resolusi kecil buat performa
  // scroll), tapi kualitasnya dinaikin dari sebelumnya (dulu 380/65, 260/40 utk sold out)
  // biar kartu di grid gak keliatan pecah/burik juga -- sebelumnya ini salah satu sumber
  // komplain "foto blur" walau upload aslinya udah bagus.
  const thumbImg = thumbImgRaw ? supaThumb(thumbImgRaw, post.soldOut ? 300 : 640, post.soldOut ? 50 : 82) : null;
  // Foto di baris PALING ATAS grid (langsung kelihatan pas halaman/tab baru dibuka, gak perlu
  // discroll dulu) sengaja dimuat eager + fetchpriority tinggi, BUKAN lazy -- soalnya loading="lazy"
  // di gambar yang udah kelihatan dari awal cuma bikin browser nunda mulai download-nya, jadi kerasa
  // lama munculnya (ini yang bikin foto rental homepage keluarnya lama, karena kartunya lebar/cuma
  // 2 kolom, jadi banyak yang ke-anggap "baris pertama"). Dibatasi 3 kartu pertama biar cukup buat
  // baris atas grid 2 kolom maupun 3 kolom, sisanya (di bawah layar) tetap lazy seperti biasa.
  const isAboveFold = (i || 0) < 3;
  const thumbLoadAttrs = isAboveFold ? 'loading="eager" fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const imgHtml = thumbImg
    ? `<img src="${thumbImg}" ${thumbLoadAttrs} onload="this.style.opacity='${post.soldOut ? '0.5' : '1'}'" onerror="handleImgError(this)" class="img-fade h-full w-full object-cover" />`
    : `<div class="flex h-full w-full items-center justify-center text-[10px] text-white/30">No Foto</div>`;
  const soldOverlay = post.soldOut ? `
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold sold-overlay-badge badge-pop shadow-lg"><span class="inline-flex items-center justify-center flex-shrink-0" style="width:11px;height:11px;border-radius:9999px;background:rgba(255,255,255,.28)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:7px;height:7px;display:block"><path d="M18 6 6 18M6 6l12 12"/></svg></span>SOLD OUT</span>
    </div>` : '';
  const discountBadge = (post.discountActive && !post.soldOut) ? `
    <span class="absolute left-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white badge-pop shadow-lg">✦ FLASH SALE</span>` : '';
  // Badge "NEW STOK" -- nongol kalau postingan diupload kurang dari 24 jam terakhir DAN lagi
  // gak disembunyikan (post.hidden). Warna biru langit (sky) dipilih biar beda jelas dari FLASH
  // SALE (oranye), Pin (kuning), & Wishlist (kuning juga) -- kesan "baru/fresh" tanpa nabrak
  // warna badge lain. Ikon petir (zap) solid, bukan emoji, biar konsisten sama badge lain di
  // kartu. Ditumpuk di bawah discountBadge (kalau dua-duanya nyala bareng) di pojok kiri-atas.
  const isNewUpload = !post.soldOut && !post.hidden && postFreshTime(post) && (Date.now() - postFreshTime(post)) < 24 * 60 * 60 * 1000;
  const newBadge = isNewUpload ? `
    <span class="absolute left-1.5 ${post.discountActive ? 'top-7' : 'top-1.5'} rounded-md bg-sky-500 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white badge-pop shadow-lg inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:9px;height:9px"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>NEW STOK</span>` : '';
  const pinnedBadge = post.pinned ? `
    <span class="absolute right-1.5 top-1.5 flex items-center rounded-md bg-yellow-400 px-1.5 py-0.5 text-black/90 badge-pop shadow-lg">${ICON_PIN}</span>` : '';
  const hiddenBadge = (post.hidden && isAdmin) ? `
    <span class="absolute left-1.5 bottom-1.5 flex items-center gap-1 rounded-md bg-slate-700/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>Disembunyikan</span>` : '';
  // Kalau postingan rental gak punya rentalGame (misal data lama), fallback ke game rental
  // pertama yang ada, biar badge "Free Fire"/"Mobile Legends" gak pernah kosong kayak bug P9.
  const postRentalGameResolved = post.type === 'rental'
    ? (post.rentalGame || (getRentalGames()[0] && getRentalGames()[0].v))
    : null;
  const gameBadge = post.type === 'stok'
    ? `<span class="rounded-md border border-white/15 px-1.5 py-0.5 text-[9px] font-bold text-white/80">${post.game}</span>`
    : (postRentalGameResolved ? `<span class="rounded-md border border-white/15 px-1.5 py-0.5 text-[9px] font-bold text-white/80">${escapeHtml(getRentalGameLabel(postRentalGameResolved))}</span>` : '');
  const typeBadge = `<span class="text-[9px] font-medium text-white/50">${post.type === 'stok' ? 'STOK' : 'RENTAL'}</span>`;
  const kodeBadge = (post.type === 'stok' && post.kode) ? `<span class="text-[9px] font-bold kode-yellow-text">${escapeHtml(post.kode)}</span>` : '';
  const titleWithKode = escapeHtml(post.title || 'Tanpa judul');
  const hideTitleInSoldOutView = !!post.soldOut;   // judul postingan akun sold out selalu disembunyikan (di semua tampilan)
  const showDiscount = post.type === 'stok' && post.discountActive && post.discountPrice;
  const rentalGameColorClass = postRentalGameResolved === 'ML' ? 'text-pink-300' : 'text-purple-300';
  const rentalOptsForCard = post.type === 'rental' ? getRentalOptions(post) : [];
  const rentalPriceLine = rentalOptsForCard.length ? (() => {
    const nums = rentalOptsForCard.map(o => parseRupiahNumber(o.price)).filter(n => n != null);
    const minPrice = nums.length ? Math.min(...nums) : null;
    const maxPills = 2;
    const shownOpts = rentalOptsForCard.slice(0, maxPills);
    const extraCount = rentalOptsForCard.length - shownOpts.length;
    return `
      <div class="mt-1 flex items-center gap-1 ${rentalGameColorClass}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
        ${minPrice != null ? `<span class="text-[12px] font-bold price-font">Mulai ${escapeHtml(formatRupiahNumber(minPrice))}</span>` : ''}
      </div>
      <p class="mt-1 flex flex-wrap items-center gap-1">
        ${shownOpts.map(o => `<span class="rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-white/55">${escapeHtml(o.label)}</span>`).join('')}
        ${extraCount > 0 ? `<span class="rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-white/40">+${extraCount}</span>` : ''}
      </p>`;
  })() : '';
  let discountLine = '';
  if (showDiscount) {
    const origNum = parseRupiahNumber(post.price);
    const discNum = parseRupiahNumber(post.discountPrice);
    const hemat = (origNum != null && discNum != null && origNum > discNum) ? origNum - discNum : null;
    discountLine = `<div class="mt-1 flex flex-col price-font"><span class="text-[11px] font-medium text-white/40 line-through">${escapeHtml(formatRp(post.price || ''))}</span><span class="text-base font-bold text-pink-400">${escapeHtml(formatRp(post.discountPrice))}</span></div>${hemat ? `<p class="text-[9.5px] font-bold text-green-400 price-font">Hemat ${escapeHtml(formatRupiahNumber(hemat))}</p>` : ''}`;
  }
  const stokGameColorClass = isPinkGame(post.game) ? 'text-pink-400' : 'text-purple-300';
  const statusLine = post.soldOut
    ? ''
    : showDiscount
      ? discountLine
      : (post.type === 'rental' ? rentalPriceLine
        : (post.type === 'stok'
          ? (post.price
            ? `<p class="mt-1 text-[13.5px] font-bold price-font ${stokGameColorClass}">${escapeHtml(formatRp(post.price))}</p>`
            : `<p class="mt-1 text-[13.5px] font-bold price-font text-white/35">Belum diedit</p>`)
          : ''));
  // Delay animasi masuk tiap kartu ngikutin urutan render di grid (kiri->kanan, atas->bawah,
  // sama kayak angka 1 2 3 / 4 5 6 / 7 8 9 / 10 11 12), biar kerasa "loading" foto dari
  // pojok kiri atas nurun ke bawah. Dibatasin sampai 12 kartu pertama (halaman awal yang
  // langsung keliatan di layar) -- kartu ke-13 dst pakai delay yang sama kayak kartu ke-12
  // biar gak bikin user nunggu lama pas listnya panjang.
  // Pas first-load (halaman baru dibuka), kartu postingan sengaja ditahan mulai animasinya
  // sampai chip kategori (Free Fire/Mobile Legends dkk, delay .6s-.88s) udah pada muncul duluan
  // -- biar urutannya kerasa: kategori dulu, baru postingan. Re-render sesudahnya (pindah tab/
  // ganti kategori) gak kena offset ini lagi, langsung delay normal dari 0.
  // Kartu postingan sekarang mulai animasinya BARENG chip kategori (.76s, sama kayak chip
  // pertama), bukan nunggu semua chip kelar dulu (dulu offsetnya 1.1s) -- biar kerasa nyatu,
  // gak kayak dua tahap loading yang kepisah.
  const firstLoadCardOffset = document.body.classList.contains('first-load') ? 0.76 : 0;
  const delay = firstLoadCardOffset + Math.min(i || 0, 11) * 0.02;
  return `
    <div class="relative overflow-hidden rounded-lg post-wrap" id="post-wrap-${post.id}">
      <div id="swipe-hint-${post.id}" class="pointer-events-none absolute inset-0 z-0 flex items-center rounded-lg pl-3" style="opacity:0;background:linear-gradient(to right, rgba(var(--card-glow-rgb),.92), rgba(var(--card-glow-rgb),0) 65%)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="anim-in card stock-card ${isPinkGame(post.game) ? 'stock-card-ml' : 'stock-card-ff'} relative overflow-hidden rounded-lg" style="animation-delay:${delay}s;touch-action:pan-y" id="post-${post.id}" ${cardSwipeAttrs(post.id)}>
      <div onclick="openPostDetailWithPressFeel('${post.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPostDetailWithPressFeel('${post.id}')}" role="button" tabindex="0" class="block w-full text-left cursor-pointer">
        <div class="relative overflow-hidden stock-card-img" style="aspect-ratio:${post.type === 'rental' ? '1536/709' : '4/5'}${post.hidden ? ';opacity:0.55' : ''}">
          ${imgHtml}
          ${soldOverlay}
          ${discountBadge}
          ${newBadge}
          ${pinnedBadge}
          ${hiddenBadge}
          ${wishlistBtnHtml(post)}
        </div>
        <div class="px-2 py-2 stock-card-text">
          <div class="flex items-center gap-1">${gameBadge}<span class="text-white/25">|</span>${typeBadge}${kodeBadge ? `<span class="text-white/25">|</span>${kodeBadge}` : ''}</div>
          ${hideTitleInSoldOutView ? '' : `<p class="mt-1 truncate text-[11.5px] font-semibold text-white/90">${titleWithKode}</p>`}
          ${statusLine}
        </div>
      </div>
      </div>
    </div>`;
}

let postsLoaded = false;
function renderSkeleton(rental) {
  const cols = rental ? ((profile.gridCols && profile.gridCols.rental) || defaultProfile.gridCols.rental) : ((profile.gridCols && profile.gridCols.stok) || defaultProfile.gridCols.stok);
  const ratio = rental ? '1536/709' : '4/5';
  return `<div class="grid grid-cols-${cols} gap-3 skeleton-fade">${Array(rental ? 4 : 6).fill(0).map(() =>
    `<div><div class="animate-pulse rounded-lg card stock-card" style="aspect-ratio:${ratio};background:rgba(255,255,255,0.06)"></div>
      <div class="mt-1.5 h-3 w-2/3 animate-pulse rounded" style="background:rgba(255,255,255,0.06)"></div></div>`
  ).join('')}</div>`;
}
function renderGrid(list, emptyMsg, cols, key, sig) {
  cols = cols || 2;
  if (postsLoadFailed) return `<div class="rounded-xl border border-dashed border-red-500/30 bg-red-500/5 p-6 text-center text-sm text-white/70 anim-in">
    ▲ Gagal memuat data (koneksi bermasalah).
    <button onclick="loadPosts()" class="mt-2 block mx-auto primary rounded-lg px-4 py-1.5 text-xs font-medium">⟳ Coba Lagi</button>
  </div>`;
  if (!list.length) return `<div class="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/60 anim-in">${emptyMsg}</div>`;
  // PERF: kartu digambar bertahap (12 dulu, sisanya nambah otomatis pas discroll mendekati bawah)
  // supaya HP gak perlu nahan puluhan kartu + foto sekaligus. `key` dikosongkan = tampil semua.
  let shown = list;
  if (key && 'IntersectionObserver' in window) {
    let st = gridState[key];
    if (!st || st.sig !== sig) st = gridState[key] = { sig: sig, limit: GRID_PAGE, list: list };
    st.list = list;
    shown = list.slice(0, st.limit);
  }
  const more = (key && shown.length < list.length) ? `<div class="grid-sentinel" data-grid-key="${key}" style="height:1px"></div>` : '';
  return `<div class="grid grid-cols-${cols} gap-3">${shown.map((p, i) => { try { return postThumb(p, i); } catch (e) { console.error('postThumb error', p.id, e); return ''; } }).join('')}</div>${more}`;
}
const GRID_PAGE = 16;   // dulu 12; ditambah supaya pas scroll cepat kartu belum habis sebelum batch berikutnya digambar
const gridState = {};
let gridMoreIO = null;
function gridMoreObserver() {
  if (gridMoreIO || !('IntersectionObserver' in window)) return gridMoreIO;
  gridMoreIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      gridMoreIO.unobserve(en.target);
      loadMoreGrid(en.target);
    });
  }, { rootMargin: '2400px 0px' });   // dulu 600px: batch berikutnya baru digambar kalau sudah dekat sekali -> pas scroll cepat sempat kosong
  return gridMoreIO;
}
function loadMoreGrid(sentinel) {
  const st = gridState[sentinel.dataset.gridKey];
  const grid = sentinel.previousElementSibling;
  if (!st || !grid || !sentinel.isConnected) return;
  const start = st.limit;
  st.limit = Math.min(st.list.length, start + GRID_PAGE);
  const html = st.list.slice(start, st.limit).map((p, i) => { try { return postThumb(p, start + i); } catch (e) { return ''; } }).join('');
  grid.insertAdjacentHTML('beforeend', html);
  if (st.limit >= st.list.length) sentinel.remove();
  else gridMoreObserver().observe(sentinel);
}
function armGridMore(container) {
  const s = container && container.querySelector('.grid-sentinel');
  const io = gridMoreObserver();
  if (s && io) io.observe(s);
}

/* Cek satu postingan STOK cocok/enggak sama filter yang lagi aktif di halaman utama --
   dipusatkan di sini (dipakai renderStok() & getDetailFeedList()) biar logikanya SATU tempat
   aja, gak dobel-nulis kayak sebelumnya (dua fungsi itu tadinya nulis predicate yang PERSIS
   sama, rawan salah satu ketinggalan kalau ada perubahan aturan filter di kemudian hari). */
function matchesStokFilter(p) {
  if (p.type !== 'stok' || p.game !== curGame) return false;
  if (!isAdmin && p.hidden) return false;
  const tagOk = curTag === 'SOLD_OUT' ? p.soldOut
    : curTag === 'DISKON' ? (!p.soldOut && p.discountActive)
    : curTag === 'ALL_READY' ? !p.soldOut
    : (!p.soldOut && p.nominalTag === curTag);
  if (!tagOk) return false;
  // Filter TAMBAHAN kategori SG (khusus FF, cuma aktif kalau minimal 1 kategori lagi dipilih) --
  // logika AND/irisan: postingan cuma lolos kalau punya SEMUA kategori yang lagi dipilih (misal
  // pilih SG OPM + REPPER, yang muncul cuma akun yang beneran ada SG OPM DAN REPPER bareng --
  // yang cuma punya salah satu doang gak ikut muncul).
  if (curGame === 'FF' && isFFSgCategoryEnabled() && activeSgFilters.size) {
    const cats = Array.isArray(p.ffCategories) ? p.ffCategories : [];
    if (![...activeSgFilters].every(c => cats.includes(c))) return false;
  }
  return true;
}
function renderStok() {
  const container = document.getElementById('stok-posts');
  if (!postsLoaded) { container.innerHTML = renderSkeleton(); return; }
  let list = posts.filter(matchesStokFilter);
  list = sortListBySort(list, curSort);
  container.innerHTML = renderGrid(list, 'Belum ada stok di kategori ini — silakan hubungi via WA.', (profile.gridCols && profile.gridCols.stok) || defaultProfile.gridCols.stok, 'stok', curGame + '|' + curTag + '|' + curSort + '|' + [...activeSgFilters].sort().join(','));
  armGridMore(container);
}
const rentalShuffleKeys = new Map(); // id -> angka acak, buat urutan tab "Semua" Rental (lihat renderRental)
function getRentalShuffleKey(id) {
  if (!rentalShuffleKeys.has(id)) rentalShuffleKeys.set(id, Math.random());
  return rentalShuffleKeys.get(id);
}
function renderRental() {
  if (!postsLoaded) {
    document.getElementById('rental-available').innerHTML = renderSkeleton(true);
    document.getElementById('rental-soldout-wrap').style.display = 'none';
    return;
  }
  const fallbackGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
  const avail = posts.filter(p => p.type === 'rental' && !p.soldOut && (isAdmin || !p.hidden) &&
    (p.rentalGame || fallbackGame) === curRentalGame &&
    (curRentalTag === 'ALL_READY' || p.rentalTag === curRentalTag) &&
    (!isRentalSgCategoryEnabled() || !activeRentalSgFilters.size || (Array.isArray(p.rentalSgCategories) && [...activeRentalSgFilters].every(c => p.rentalSgCategories.includes(c)))));
  // Khusus tab "Semua": urutan diacak (bukan ngikutin urutan asli/harga) biar semua kategori
  // harga rental kebagian tampil di atas gantian -- gak monoton itu-itu aja yang paling
  // kelihatan duluan. Acaknya PER PENGUNJUNG beda-beda & ganti tiap kali situsnya di-refresh
  // (lihat rentalShuffleKeys: masing-masing id postingan dikasih angka acak SEKALI per sesi
  // browser, dipakai buat ngurutin -- jadi urutannya stabil selama sesi itu, gak lompat-lompat
  // sendiri tiap 30 detik polling, tapi beda lagi begitu halaman di-refresh/dibuka ulang).
  if (curRentalTag === 'ALL_READY') avail.sort((a, b) => getRentalShuffleKey(a.id) - getRentalShuffleKey(b.id));
  const sold = posts.filter(p => p.type === 'rental' && p.soldOut && (isAdmin || !p.hidden) &&
    (p.rentalGame || fallbackGame) === curRentalGame);
  const rentalCols = (profile.gridCols && profile.gridCols.rental) || defaultProfile.gridCols.rental;
  document.getElementById('rental-available').innerHTML = renderGrid(avail, 'Belum ada rental tersedia — silakan hubungi via WA.', rentalCols, 'rental-av', curRentalGame + '|' + curRentalTag + '|' + [...activeRentalSgFilters].sort().join(','));
  armGridMore(document.getElementById('rental-available'));
  document.getElementById('rental-soldout-wrap').style.display = sold.length ? '' : 'none';
  document.getElementById('rental-soldout').innerHTML = renderGrid(sold, '', rentalCols, 'rental-sold', curRentalGame);
  armGridMore(document.getElementById('rental-soldout'));
}

/* ---------------- View counter (stok & rental) ---------------- */
/* ---------------- Detail modal ---------------- */
/* Ambil daftar postingan "satu grup" sama post yang lagi dibuka, sesuai filter kategori
   yang lagi aktif di grid — ini yang jadi urutan buat scroll-nya (mirip swipe di IG). */
function getDetailFeedList(post) {
  if (post.type === 'rental') {
    const fallbackGame = getRentalGames()[0] ? getRentalGames()[0].v : null;
    const game = post.rentalGame || fallbackGame;
    const avail = posts.filter(p => p.type === 'rental' && !p.soldOut && (isAdmin || !p.hidden) &&
      (p.rentalGame || fallbackGame) === game);
    const sold = posts.filter(p => p.type === 'rental' && p.soldOut && (isAdmin || !p.hidden) &&
      (p.rentalGame || fallbackGame) === game);
    if (curRentalTag === 'ALL_READY') avail.sort((a, b) => getRentalShuffleKey(a.id) - getRentalShuffleKey(b.id));
    return avail.concat(sold);
  }
  // urutan geser = urutan yang tampil di grid (termasuk acak tab Semua & hasil pencarian)
  return sortListBySort(posts.filter(matchesStokFilter), curSort);
}

let detailObserver = null;
let mountObserver = null;

let detailOpenedFromLink = false;
/* Judul modal detail ("Stok Touka Enay" / "Rental Touka Enay") fade-in SEKALI aja tiap kali
   kebuka/berubah (misal pas scroll pindah dari postingan Stok ke Rental) -- disamain kayak
   animasi elemen lain di detail (.detail-content-in), gak pakai efek ketik lagi. Kalau textnya
   ganti (postingan lain jenisnya), animasi fade-in-nya di-retrigger dari awal buat teks baru.
   Reduced motion (aksesibilitas/koneksi lambat) otomatis di-handle lewat CSS
   (.detail-content-in kena "animation:none" di prefers-reduced-motion & body.reduce-anim). */
function setDetailTitle(el, text) {
  if (!el || el.dataset.title === text) return;
  el.dataset.title = text;
  el.textContent = text;
  el.classList.remove('detail-content-in');
  void el.offsetWidth; // paksa reflow biar animasinya jalan ulang tiap ganti teks
  el.classList.add('detail-content-in');
}
// Sengaja nunda sebentar (harus PAS SAMA/lebih lama dikit dari durasi transition zoom kartu,
// lihat ".card.stock-card" transition .15s di CSS) -- biar animasi zoom+glow pas kartu ditekan
// (.is-pressed) sempat "kelihatan" dulu sebelum modal detail nutupin seluruh layar. Tanpa delay
// ini, modal-nya kebuka duluan sebelum animasinya sempat jalan, jadi kesannya kayak gak ada
// animasi zoom sama sekali walau kodenya udah bener.
function openPostDetailWithPressFeel(id) {
  playSfx('open');
  setTimeout(() => openPostDetail(id), 130);
}
function openPostDetail(id) {
  selectedRentalDuration = {};
  customRentalHours = {};
  const post = posts.find(p => p.id === id);
  if (!post) return;
  if (post.hidden && !isAdmin) return;

  // Fitur "Dilihat"/mata (termasuk hitungan otomatis pas postingan dibuka) udah dihapus total
  // sesuai request -- sekarang cuma tinggal Suka/Like doang.

  let feed = getDetailFeedList(post);
  if (!feed.some(p => p.id === id)) feed = [post]; // jaga-jaga kalau gak ketemu di list manapun

  const targetIdx = feed.findIndex(p => p.id === id);
  const content = document.getElementById('detail-content');
  // Biar buka detail nggak lag: postingan yang lagi dibuka (+1 tetangga atas/bawah biar swipe
  // cepet tetep mulus) dirender penuh (foto beneran) dari awal. Sisanya cuma dikasih kotak
  // kosong sesuai ukurannya dulu (placeholder) -- fotonya baru "dinyalain" beneran belakangan,
  // pas usernya mulai deket ke situ pas scroll (lihat mountObserver di bawah). Jadi HP nggak
  // perlu download+decode puluhan foto sekaligus pas modal baru kebuka.
  content.innerHTML = feed.map((p, i) => {
    const nearTarget = Math.abs(i - targetIdx) <= 1;
    const inner = nearTarget ? renderDetailHtml(p, i === targetIdx) : renderDetailPlaceholder(p);
    return `<section class="detail-snap-section flex flex-col justify-center pb-8" data-post-id="${p.id}" data-rendered="${nearTarget ? '1' : '0'}" style="scroll-snap-align:start;scroll-snap-stop:always;min-height:100%">${inner}</section>`;
  }).join('');

  const counterEl = document.getElementById('detail-feed-counter');
  const dateEl = document.getElementById('detail-post-date');
  const setTitleFor = (p) => {
    const titleLabelEl = document.getElementById('detail-modal-title-label');
    const titleKodeEl = document.getElementById('detail-modal-title-kode');
    if (titleLabelEl) setDetailTitle(titleLabelEl, p.type === 'rental' ? 'Rental Touka Enay' : 'Stok Touka Enay');
    if (titleKodeEl) titleKodeEl.textContent = '';
    // Tanggal postingan (kapan pertama kali diupload) ditampilin di sebelah judul/counter,
    // format singkat "07 Agu 2026" -- ngikutin postingan yang lagi keliatan di feed, sama
    // kayak counter "3/30" di sampingnya.
    if (dateEl) {
      if (p.createdAt) {
        dateEl.textContent = new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        dateEl.classList.remove('hidden');
      } else {
        dateEl.classList.add('hidden');
      }
    }
    // Angka di samping judul = posisi slide foto di postingan yang lagi keliatan (misal 2/30).
    if (counterEl) {
      counterEl.dataset.postId = p.id;
      if (typeof tkUpdateSlideCounter === 'function') tkUpdateSlideCounter(p.id);
    }
    // Alamat bar ikut berubah sesuai postingan yang lagi keliatan (misal toukaenay.com/ff20-namaakun),
    // pakai replaceState biar gak numpuk history pas cuma scroll di dalam feed yang sama.
    history.replaceState(null, '', '/' + buildPostSlug(p));
  };
  setTitleFor(post);

  openModal('modal-detail');

  // Langsung lompat ke postingan yang diklik, tanpa animasi scroll yang aneh.
  const targetSection = content.querySelector(`[data-post-id="${id}"]`);
  if (targetSection) targetSection.scrollIntoView({ block: 'start' });

  // detailObserver dipasang buat mantau postingan TETANGGA yang ikut kesorot pas discroll di
  // dalam feed yang sama -- gunanya sekarang cuma buat nyegerin judul/tanggal/counter/URL
  // (setTitleFor) biar ngikutin postingan yang lagi keliatan, gak ada lagi urusan hitungan
  // "Dilihat" (fitur itu udah dihapus total).
  if (detailObserver) detailObserver.disconnect();
  detailObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const pid = entry.target.dataset.postId;
      const p = posts.find(x => x.id === pid);
      if (!p) return;
      setTitleFor(p);
      // Dulu di sini ada kode yang ngulang animasi "muncul ke fokus" (scale+fade) tiap kali
      // postingan yang sama balik keliatan pas discroll -- termasuk bingkai foto stok/rental
      // ikut animasi ulang tiap scroll, jadi kesannya norak/ganggu. Sekarang animasi masuknya
      // (foto meluncur dari kiri, dst) cuma sekali pas section-nya PERTAMA kali dirender
      // (lihat renderDetailHtml/skipEntrance), jadi pas discroll ke postingan yang udah pernah
      // dirender, gak ada animasi ulang lagi sama sekali.
    });
  }, { root: content, threshold: 0.6 });
  content.querySelectorAll('.detail-snap-section').forEach(sec => detailObserver.observe(sec));

  // Observer kedua: khusus buat "nyalain" placeholder jadi konten+foto beneran begitu
  // seksinya udah deket mau keliatan (rootMargin dilebihin ~1.5x tinggi layar), sebelum
  // user beneran sampe situ. Hasilnya scroll tetep mulus (foto udah siap duluan) tapi
  // gak semua puluhan foto didownload barengan di awal.
  if (mountObserver) mountObserver.disconnect();
  mountObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const sec = entry.target;
      if (sec.dataset.rendered === '1') { mountObserver.unobserve(sec); return; }
      const pid = sec.dataset.postId;
      const p = posts.find(x => x.id === pid);
      if (!p) { mountObserver.unobserve(sec); return; }
      sec.innerHTML = renderDetailHtml(p);
      sec.dataset.rendered = '1';
      mountObserver.unobserve(sec);
    });
  }, { root: content, rootMargin: '40% 0px 40% 0px', threshold: 0 });
  content.querySelectorAll('.detail-snap-section').forEach(sec => mountObserver.observe(sec));

  // Selalu bikin entry "/" di bawah entry link postingan ini, baik dibuka lewat klik kartu biasa
  // maupun lewat link yang dibagikan -- efeknya tombol X, klik di luar, "Lihat stok lainnya",
  // ATAU tombol Back HP semuanya konsisten balik ke toukaenay.com.
  if (location.pathname !== '/') history.replaceState(null, '', '/');
  history.pushState(null, '', '/' + buildPostSlug(post));
}
/* Kotak kosong pengganti sementara sebelum foto+detail postingan beneran dirender (lihat
   mountObserver di openPostDetail). Rasio-nya disamain sama slideshow aslinya biar pas
   fotonya nongol nanti, tinggi section-nya nggak lompat/geser (nggak nge-jank pas scroll). */
function renderDetailPlaceholder(post) {
  const ratio = post.type === 'rental' ? '1536/709' : '4/5';
  return `<div class="mx-auto"><div class="card animate-pulse" style="aspect-ratio:${ratio}"></div></div>`;
}
function renderDetailHtml(post, eager, skipEntrance) {
  const cls = skipEntrance ? '' : ' detail-content-in';
  const frameCls = skipEntrance ? '' : ' detail-frame-in';
  // Tiap elemen di modal detail dikasih delay bertingkat (dly = 0.15 + n*0.05, dly2 =
  // 0.6 + n*0.05) biar muncul satu-satu berurutan dari atas ke bawah, bukan bareng semua.
  const dly = (n) => skipEntrance ? '' : ` style="animation-delay:${(0.15 + n * 0.05).toFixed(2)}s"`;
  // Delay generasi ke-2, dipakai buat elemen SETELAH blok harga rental (yang jumlah barisnya
  // dinamis) -- biar tetep urut kebelakang dan gak numpuk/nyalip animasi opsi durasi rental.
  const dly2 = (n) => skipEntrance ? '' : ` style="animation-delay:${(0.6 + n * 0.05).toFixed(2)}s"`;
  const priceBlockDelay = 0.15 + 3 * 0.05;
  const soldBadge = post.soldOut ? `<button type="button" onclick="showSoldOutInfo(event)" class="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">SOLD OUT</button>` : '';
  const priceBlock = post.soldOut ? '' : (post.type === 'rental' ? renderRentalPriceBlock(post, skipEntrance, priceBlockDelay) : renderStokPriceBlock(post, skipEntrance, priceBlockDelay));
  const stokInfoRow = post.type === 'stok' ? renderStokInfoRow(post, skipEntrance, priceBlockDelay + 0.05) : '';
  const waNumber = getBeliWaNumber();
  const postSlug = buildPostSlug(post);
  const postLink = location.origin + '/' + postSlug;
  const waMsg = encodeURIComponent(`Hallo admin, saya mau beli akun yang ini kode ${post.kode || post.title || ''}.\n\n${postLink}`);
  const adminBtn = isAdmin ? `
    <div class="mt-2 flex items-center justify-between gap-2${cls}"${dly2(3)}>
      <button onclick="closeDetailModal();openEditPost('${post.id}')" title="Edit" class="btn-ghost flex flex-1 items-center justify-center rounded-lg py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </button>
      <button onclick="confirmDeletePost('${post.id}')" title="Hapus" class="flex flex-1 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 py-2.5 text-red-400 hover:bg-red-500/25">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
      <button onclick="toggleSoldOutQuick('${post.id}')" title="${post.soldOut ? 'Batal Sold Out' : 'Tandai Sold Out'}" class="flex flex-1 items-center justify-center rounded-lg py-2.5 ${post.soldOut ? 'bg-red-500 text-white' : 'btn-ghost'}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/></svg>
      </button>
      <button onclick="toggleHiddenQuick('${post.id}')" title="${post.hidden ? 'Tampilkan Lagi' : 'Sembunyikan Postingan'}" class="flex flex-1 items-center justify-center rounded-lg py-2.5 ${post.hidden ? 'bg-slate-500 text-white' : 'btn-ghost'}">
        ${post.hidden
          ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'}
      </button>
      <button onclick="togglePinnedQuick('${post.id}')" title="${post.pinned ? 'Batal Sematkan' : 'Sematkan'}" class="flex flex-1 items-center justify-center rounded-lg py-2.5 ${post.pinned ? 'bg-yellow-400 text-black/90' : 'btn-ghost'}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
      </button>
      <button onclick="openSuntikLikePrompt('${post.id}')" title="Suntik Disukai" class="flex flex-1 items-center justify-center rounded-lg py-2.5 btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </button>
      <button onclick="duplicatePost('${post.id}')" title="Duplikat Postingan" class="flex flex-1 items-center justify-center rounded-lg py-2.5 btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>` : '';
  const rentalNoticeText = (profile.rentalNotice !== undefined ? profile.rentalNotice : defaultProfile.rentalNotice || '').trim();
  const rentalSyaratBlock = (!post.soldOut && post.type === 'rental' && rentalNoticeText) ? `
    <div class="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2.5 text-left text-[9px] leading-relaxed text-white/70${cls}"${dly2(0)}>
      <p class="font-bold text-amber-300">BACA SEBELUM RENTAL 👇🏻</p>
      <p class="whitespace-pre-line">${escapeHtml(rentalNoticeText)}</p>
    </div>` : '';
  return `
    <div class="mx-auto${frameCls}">${renderSlideshow(post, true, eager)}</div>
    <div class="mt-2 flex flex-col items-center gap-1 text-center${cls}"${dly(1)}>
      ${post.soldOut ? '' : `<h3 class="text-sm font-semibold leading-snug">${(post.type === 'stok' && post.kode) ? `<span class="kode-yellow-text">${escapeHtml(post.kode)}</span> <span class="text-white/30">|</span> ` : ''}${escapeHtml(post.title || 'Tanpa judul')}</h3>`}
      ${soldBadge}
    </div>
    ${(!post.soldOut && post.game !== 'RB' && post.desc && splitSpekLinks(post.desc).text) ? `<p class="mt-1 text-xs text-white/60 whitespace-pre-line${cls}"${dly(2)}>${linkifyDesc(splitSpekLinks(post.desc).text)}</p>` : ''}
    ${post.type === 'stok' ? renderSpekButtons(post, skipEntrance, priceBlockDelay - 0.05) : ''}
    ${priceBlock}
    ${stokInfoRow}
    ${rentalSyaratBlock}
    <div class="mt-2 flex gap-2${cls}"${dly2(1)}>
      <button onclick="sharePost('${post.id}')" class="press-glow flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Bagikan
      </button>
      <button onclick="toggleLikePost('${post.id}')" data-post-id="${post.id}" class="press-glow like-btn flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold btn-ghost ${isPostLiked(post.id) ? 'is-liked' : ''}">
        <svg class="like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isPostLiked(post.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span class="like-label">${isPostLiked(post.id) ? 'Disukai' : 'Suka'}</span>
      </button>
      ${(!post.soldOut && waNumber && post.type !== 'rental') ? `<a href="https://wa.me/${waNumber}?text=${waMsg}" onclick="playSfx('buy')" target="_blank" rel="noreferrer" class="press-glow btn-attract flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center text-xs font-bold" style="background:#22c55e;color:#fff">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
        Beli Sekarang
      </a>` : ''}
    </div>
    <div class="mt-1.5 flex items-center justify-center gap-4${cls}"${dly2(2)}>
      <div class="flex items-center gap-1 text-white/40">
        <span class="flex items-center justify-center text-pink-400/70">${ICON_HEART_LG.replace(/18px/g, '13px')}</span>
        <p id="stat-likes-${post.id}" class="text-[11px] font-semibold text-white/60">${formatCompactCount(post.likes || 0)}</p>
        <p class="text-[9px] uppercase tracking-wide">Disukai</p>
      </div>
    </div>
    ${adminBtn}
    <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-white/45${cls}"${dly2(4)}>
      <button onclick="goBackToGridWithSlide()" class="press-glow flex-shrink-0 font-medium hover:text-white/75">‹ Lihat stok lainnya</button>
      <span class="flex flex-shrink-0 items-center gap-1">
        Scroll kebawah buat cek stok lainnya
        <svg class="hint-arrow-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
      </span>
    </div>`;
}

