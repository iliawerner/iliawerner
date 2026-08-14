(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  const ready = () => {
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
  };

  if (document.readyState === 'complete') {
    requestAnimationFrame(ready);
  } else {
    window.addEventListener('load', ready, { once: true });
    window.setTimeout(ready, 1800);
  }

  const revealItems = [
    ...document.querySelectorAll('.intro h1, .section-head, .notice, .identity__notice'),
  ];
  revealItems.forEach((item) => item.dataset.reveal = 'copy');

  const figures = [...document.querySelectorAll('figure')];
  figures.forEach((figure, index) => {
    figure.dataset.reveal = 'image';
    figure.style.transitionDelay = `${Math.min(index % 2, 1) * 90}ms`;
  });

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });

    [...revealItems, ...figures].forEach((item) => observer.observe(item));
  } else {
    [...revealItems, ...figures].forEach((item) => item.classList.add('is-visible'));
  }

  const hero = document.querySelector('.hero');
  const parallaxImages = [...document.querySelectorAll('figure img')];
  let ticking = false;

  const renderScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--progress', Math.min(1, y / max).toFixed(4));

    if (reducedMotion.matches) return;

    if (hero) {
      const heroProgress = Math.min(1, Math.max(0, y / Math.max(hero.offsetHeight, 1)));
      hero.style.setProperty('--hero-shift', (heroProgress * 82).toFixed(2));
      hero.style.setProperty('--hero-scale', (1.04 + heroProgress * 0.045).toFixed(4));
      hero.style.setProperty('--hero-name-shift', `${(heroProgress * -54).toFixed(2)}px`);
      hero.style.setProperty('--hero-name-opacity', Math.max(0, 1 - heroProgress * 1.25).toFixed(3));
    }

    if (window.innerWidth > 720) {
      const center = window.innerHeight / 2;
      parallaxImages.forEach((image) => {
        const rect = image.getBoundingClientRect();
        if (rect.bottom < -150 || rect.top > window.innerHeight + 150) return;
        const delta = (rect.top + rect.height / 2 - center) / window.innerHeight;
        image.style.setProperty('--parallax', `${Math.max(-14, Math.min(14, delta * -16)).toFixed(2)}px`);
      });
    }
  };

  const requestScrollRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(renderScroll);
  };

  window.addEventListener('scroll', requestScrollRender, { passive: true });
  window.addEventListener('resize', requestScrollRender, { passive: true });
  reducedMotion.addEventListener?.('change', requestScrollRender);
  requestScrollRender();

  figures.forEach((figure) => {
    const anchor = figure.querySelector('a');
    if (!anchor) return;
    anchor.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches) return;
      const rect = anchor.getBoundingClientRect();
      anchor.style.setProperty('--origin-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      anchor.style.setProperty('--origin-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    }, { passive: true });
  });

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-hidden', 'true');

  const lightboxImage = document.createElement('img');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'lightbox__close';
  closeButton.setAttribute('aria-label', 'Закрыть');
  lightbox.append(lightboxImage, closeButton);
  body.append(lightbox);

  const main = document.querySelector('main');
  let returnFocus = null;
  let mainState = null;
  let imageCleanupTimer = null;

  const cancelImageCleanup = () => {
    if (imageCleanupTimer === null) return;
    window.clearTimeout(imageCleanupTimer);
    imageCleanupTimer = null;
  };

  const closeLightbox = () => {
    if (!lightbox.classList.contains('is-open')) return;
    cancelImageCleanup();
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('has-lightbox');

    if (main && mainState) {
      if (mainState.hadAriaHidden) main.setAttribute('aria-hidden', mainState.ariaHidden);
      else main.removeAttribute('aria-hidden');
      main.inert = mainState.inert;
      mainState = null;
    }

    imageCleanupTimer = window.setTimeout(() => {
      imageCleanupTimer = null;
      if (lightbox.classList.contains('is-open')) return;
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
    }, reducedMotion.matches ? 0 : 560);
    returnFocus?.focus({ preventScroll: true });
  };

  document.querySelectorAll('main figure a, .hero__image').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const image = anchor.querySelector('img');
      if (!image) return;
      event.preventDefault();
      cancelImageCleanup();
      returnFocus = anchor;
      lightboxImage.src = anchor.href;
      lightboxImage.alt = image.alt;
      lightbox.setAttribute('aria-label', image.alt);
      if (main) {
        mainState = {
          hadAriaHidden: main.hasAttribute('aria-hidden'),
          ariaHidden: main.getAttribute('aria-hidden'),
          inert: main.inert,
        };
        main.setAttribute('aria-hidden', 'true');
        main.inert = true;
      }
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      body.classList.add('has-lightbox');
      closeButton.focus({ preventScroll: true });
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...lightbox.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !lightbox.contains(document.activeElement))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !lightbox.contains(document.activeElement))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
})();
