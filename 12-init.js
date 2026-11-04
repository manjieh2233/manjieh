/* ---------------- Init ---------------- */
renderProfile();
renderTags();
renderRentalGames();
renderRentalTags();
renderStok();
renderRental();
updateFooterLogo();
renderLinkBio();
const footerYearEl = document.getElementById('footer-copyright-year');
if (footerYearEl) footerYearEl.textContent = `© ${new Date().getFullYear()} Touka Enay Store. All rights reserved.`;
renderAdminUI();
subscribeFirestore();
subscribeAuth();
initBgParticles();
initScrollReveal();
window.addEventListener('hashchange', handleHash);
window.addEventListener('popstate', () => {
  const path = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ''));
  if (!path || path.toLowerCase() === 'index.html') {
    closeModal('modal-detail');
    const wasStoryOpen = !document.getElementById('modal-story').classList.contains('hidden');
    stopStoryTimer();
    storyAudioLoadToken++; // batalin donlot lagu yg mungkin masih jalan, biar gak keplay abis modal ditutup
    document.removeEventListener('touchstart', blockEdgeSwipeBack);
    document.removeEventListener('touchmove', blockEdgeSwipeBack);
    const audio = document.getElementById('story-audio');
    if (audio) { audio.pause(); audio.currentTime = 0; }
    document.body.classList.remove('story-open');
    closeModal('modal-story');
    // Ditutup lewat tombol back HP/browser (bukan tombol X di app) tetap harus ditandai
    // "udah ditonton" -- kalau enggak, ring-nya gak akan pernah jadi abu-abu.
    if (wasStoryOpen) markStoriesSeenNow();
    if (wasStoryOpen) resumeBgMusicAfterStory();
    const pageLinkbioEl = document.getElementById('page-linkbio');
    if (pageLinkbioEl && !pageLinkbioEl.classList.contains('hidden')) closeLinkBio(true);
  } else {
    handlePathRoute();
  }
});
