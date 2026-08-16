(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const currentEl = document.getElementById('current');
  const totalEl = document.getElementById('total');
  const progress = document.querySelector('.progress span');
  const nav = document.querySelector('.deck-nav');
  const clamp = (n) => Math.max(0, Math.min(slides.length - 1, n));
  let index = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  const fromHash = () => {
    const parsed = Number.parseInt(location.hash.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? clamp(parsed - 1) : 0;
  };

  const setInteractiveState = (slide, active) => {
    slide.setAttribute('aria-hidden', String(!active));
    if ('inert' in slide) slide.inert = !active;
  };

  const show = (next, updateHash = true) => {
    next = clamp(next);
    slides.forEach((slide, i) => {
      slide.classList.toggle('was-active', i < next);
      slide.classList.toggle('is-active', i === next);
      setInteractiveState(slide, i === next);
    });
    index = next;
    currentEl.textContent = String(index + 1).padStart(2, '0');
    totalEl.textContent = String(slides.length).padStart(2, '0');
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    document.title = `${String(index + 1).padStart(2, '0')} · Grand Kadria — investor concept`;
    if (updateHash) history.replaceState(null, '', `#${String(index + 1).padStart(2, '0')}`);
  };

  const next = () => show(index + 1);
  const prev = () => show(index - 1);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      // Fullscreen may be blocked when opened from a file URL; navigation still works.
    }
  };

  nav.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'next') next();
    if (action === 'prev') prev();
    if (action === 'fullscreen') toggleFullscreen();
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (['arrowright', 'arrowdown', 'pagedown', ' ', 'enter'].includes(key)) {
      event.preventDefault(); next();
    } else if (['arrowleft', 'arrowup', 'pageup', 'backspace'].includes(key)) {
      event.preventDefault(); prev();
    } else if (key === 'home') {
      event.preventDefault(); show(0);
    } else if (key === 'end') {
      event.preventDefault(); show(slides.length - 1);
    } else if (key === 'f') {
      event.preventDefault(); toggleFullscreen();
    } else if (key === 'p') {
      event.preventDefault(); window.print();
    }
  });

  document.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  window.addEventListener('hashchange', () => show(fromHash(), false));
  show(fromHash(), false);
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('deck-ready')));
})();
