/* 43-route-rb.js — toukaenay.com/rb langsung membuka Stok > tab Roblox. File baru, tidak menyentuh kode lama. */
(function () {
  'use strict';
  function cp() { try { return decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase(); } catch (e) { return ''; } }
  function view() { var t = document.querySelector('.st-tab.on'); return t ? t.getAttribute('data-stv') : ''; }
  function openRb() {
    var tries = 0;
    (function go() {
      if (cp() !== 'rb') return;
      try {
        var tab = document.querySelector('.tab[data-tab="stok"]');
        var rb = document.querySelector('.st-tab[data-stv="RB"]');
        if (tab && rb) {
          if (typeof getActiveMainTab === 'function' && getActiveMainTab() !== 'stok') tab.click();
          if (view() !== 'RB') rb.click();
          return;
        }
      } catch (e) {}
      if (++tries < 40) setTimeout(go, 250);
    })();
  }
  function sync() {
    try {
      var o = document.getElementById('modal-detail'), s = document.getElementById('modal-story'), l = document.getElementById('page-linkbio');
      if ([o, s, l].some(function (m) { return m && !m.classList.contains('hidden'); })) return;
      var v = view(), p = cp();
      if (v === 'RB' && p !== 'rb' && (p === '' || p === 'ff' || p === 'ml')) history.replaceState(null, '', '/rb');
      else if (p === 'rb' && v && v !== 'RB') history.replaceState(null, '', v === 'FF' ? '/ff' : v === 'ML' ? '/ml' : '/');
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.st-tab,.tab')) setTimeout(sync, 80);
  });
  window.addEventListener('popstate', function () { setTimeout(openRb, 50); });
  openRb();
})();
