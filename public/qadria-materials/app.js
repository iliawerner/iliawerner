(() => {
  'use strict';
  const tiles = [...document.querySelectorAll('.tile')];
  const dialog = document.querySelector('#viewer');
  const stage = document.querySelector('#stage');
  const full = document.querySelector('#full');
  const status = document.querySelector('#status');
  const title = document.querySelector('#view-title');
  const count = document.querySelector('#view-count');
  const close = document.querySelector('#close');
  const zoom = document.querySelector('#zoom');
  const original = document.querySelector('#original');
  const download = document.querySelector('#download');
  let index = 0, ticket = 0, opener = null, dragging = null, dragged = false;
  function setZoom(on) {
    stage.classList.toggle('zoom', on);
    zoom.setAttribute('aria-pressed', String(on));
    zoom.textContent = on ? 'Вписать' : '1:1';
    zoom.setAttribute('aria-label', on ? 'Вписать изображение в экран' : 'Показать в масштабе один к одному');
    stage.scrollLeft = on ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
    stage.scrollTop = on ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
  }
  async function show(i, from = null) {
    index = (i + tiles.length) % tiles.length;
    const tile = tiles[index], current = ++ticket;
    if (!dialog.open) {
      opener = from || tile;
      setZoom(false);
      document.body.classList.add('viewing');
      dialog.showModal();
      close.focus();
    }
    title.textContent = tile.dataset.name;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${tiles.length} · 1619 × 972 px`;
    original.href = download.href = tile.href;
    download.download = tile.href.split('/').pop();
    full.alt = `Qadria — ${tile.dataset.name}`;
    full.style.visibility = 'hidden';
    status.textContent = 'Загрузка PNG…';
    status.hidden = false;
    history.replaceState(null, '', `#${String(index + 1).padStart(2, '0')}`);
    const image = new Image();
    image.src = tile.href;
    try {
      await image.decode();
      if (current !== ticket || !dialog.open) return;
      full.src = tile.href;
      full.style.visibility = 'visible';
      status.hidden = true;
    } catch (_) {
      if (current !== ticket || !dialog.open) return;
      status.textContent = 'Не удалось загрузить изображение. Попробуйте открыть PNG отдельно.';
    }
  }
  function hide() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    if (dialog.open) return; // A queued close event must not erase a newly reopened viewer.
    ticket++;
    document.body.classList.remove('viewing');
    setZoom(false);
    history.replaceState(null, '', location.pathname + location.search);
    if (opener?.isConnected) opener.focus({preventScroll:true});
  });
  tiles.forEach((tile, i) => tile.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); show(i, tile);
  }));
  close.addEventListener('click', hide);
  document.querySelector('#previous').addEventListener('click', () => show(index - 1));
  document.querySelector('#next').addEventListener('click', () => show(index + 1));
  zoom.addEventListener('click', () => setZoom(!stage.classList.contains('zoom')));
  full.addEventListener('click', () => {
    if (dragged) { dragged = false; return; }
    setZoom(!stage.classList.contains('zoom'));
  });
  dialog.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const stops = [...dialog.querySelectorAll('button,a[href],[tabindex="0"]')];
      const first = stops[0], last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); show(index + (e.key === 'ArrowRight' ? 1 : -1));
    }
    if (e.key === 'Home') { e.preventDefault(); show(0); }
    if (e.key === 'End') { e.preventDefault(); show(tiles.length - 1); }
  });
  stage.addEventListener('pointerdown', e => {
    dragged = false;
    if (e.pointerType !== 'mouse' || e.button !== 0 || !stage.classList.contains('zoom')) return;
    dragging = {x:e.clientX, y:e.clientY, left:stage.scrollLeft, top:stage.scrollTop};
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('panning');
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    stage.scrollLeft = dragging.left - dx;
    stage.scrollTop = dragging.top - dy;
  });
  function endDrag(e) {
    dragging = null; stage.classList.remove('panning');
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  const requested = /^#(\d{2})$/.exec(location.hash);
  if (requested && +requested[1] >= 1 && +requested[1] <= tiles.length) show(+requested[1] - 1);
})();
