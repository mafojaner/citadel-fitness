// Citadel Fitness landing page: scroll reveal + nav state.
// No framework, no build step: this is a static page served as-is by Vercel.

(function () {
  // Tell the stylesheet the script is running. Everything that starts
  // hidden is scoped to this class, so if this file never executes the page
  // renders in full rather than blank.
  document.documentElement.classList.add('js');

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

  // ---- the week: bars grow, then the figures count -------------------
  // Plays once, when it is actually on screen. The finished state is what
  // the CSS renders by default, so nothing here is load-bearing for
  // legibility -- it only winds the panel back and lets it play.
  var week = document.querySelector('[data-week]');
  if (week) {
    var playWeek = function () {
      week.classList.add('is-playing');

      // Counting is skipped entirely under reduced motion: the numbers are
      // already correct in the markup, and a number ticking upward is
      // exactly the kind of movement that setting asks us not to make.
      if (reduceMotion) return;

      // The bars finish at 6 * 100ms of stagger plus the scene duration.
      // The figures start as the last bar lands rather than racing it.
      var LEAD = 900;
      var RUN = 900;

      week.querySelectorAll('[data-count]').forEach(function (el) {
        var to = parseInt(el.getAttribute('data-to'), 10);
        if (!isFinite(to)) return;
        var started = null;
        el.textContent = '0';

        var tick = function (now) {
          if (started === null) started = now;
          var t = Math.min(1, (now - started) / RUN);
          // Ease out: fast at first, settling into the real figure, so the
          // final value is legible for most of the animation.
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(to * eased).toLocaleString('en-GB');
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = to.toLocaleString('en-GB');
        };

        setTimeout(function () { requestAnimationFrame(tick); }, LEAD);
      });
    };

    if (reduceMotion || !('IntersectionObserver' in window)) {
      playWeek();
    } else {
      var weekObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playWeek();
              weekObserver.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      weekObserver.observe(week);
    }
  }

  // ---- stop ambient loops nobody is looking at ------------------------
  // Six infinite keyframe animations run on this page. Left alone they keep
  // running under a hero that has scrolled away, and in a background tab,
  // which is battery spent on nothing. `animation-play-state` is the whole
  // mechanism; the class is toggled rather than each element touched.
  var ambient = document.querySelectorAll(
    '.hero-glow, .section-glow, .nav-logo, .live-dot, .mock-float, .btn-pulse'
  );
  var setAmbient = function (running) {
    ambient.forEach(function (el) {
      el.style.animationPlayState = running ? '' : 'paused';
    });
  };

  document.addEventListener('visibilitychange', function () {
    setAmbient(!document.hidden);
  });

  if ('IntersectionObserver' in window) {
    var ambientObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.style.animationPlayState =
            entry.isIntersecting && !document.hidden ? '' : 'paused';
        });
      },
      { threshold: 0 }
    );
    ambient.forEach(function (el) { ambientObserver.observe(el); });
  }

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
