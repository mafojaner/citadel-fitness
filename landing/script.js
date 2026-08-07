// Citadel Fitness landing page: scroll reveal + nav state.
// No framework, no build step: this is a static page served as-is by Vercel.

(function () {
  // ---- single source of truth for the demo link ----
  // TODO: confirm this matches the subdomain you point at your existing
  // Vercel deployment (see project instructions). Change it here once and
  // every "Live demo" link on the page updates.
  var DEMO_URL = 'https://demo.citadelfitness.app';
  document.querySelectorAll('[data-demo-link]').forEach(function (el) {
    el.href = DEMO_URL;
  });

  // ---- reveal-on-scroll (fly-in variants) ----
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach(function (el) { observer.observe(el); });
  }

  // ---- nav: intensify the glass once the hero scrolls past ----
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- scroll progress bar: the "journey" motif, always live ----
  var progressBar = document.getElementById('progress-bar');
  var onProgress = function () {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    progressBar.style.width = pct + '%';
  };
  document.addEventListener('scroll', onProgress, { passive: true });
  window.addEventListener('resize', onProgress);
  onProgress();
})();
