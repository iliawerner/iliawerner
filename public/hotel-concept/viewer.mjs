export function setupViewer(items) {
  const $ = id => document.getElementById(id);
  const dialog = $('viewer'), stage = $('stage'), plane = $('image-plane'), status = $('image-status');
  const close = $('close'), zoom = $('zoom'), background = $('page');
  let full = $('full'), index = 0, ticket = 0, opener = null, savedInert = false, drag = null;
  function setZoom(on) {
    stage.classList.toggle('zoom', on);
    zoom.setAttribute('aria-pressed', String(on)); zoom.textContent = on ? 'Вписать' : '1:1';
    zoom.setAttribute('aria-label', on ? 'Вписать в экран' : 'Показать один пиксель изображения на один CSS-пиксель');
    stage.scrollLeft = on ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
    stage.scrollTop = on ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
  }
  function hide() {
    if (!dialog.open) return;
    ++ticket; drag = null; stage.classList.remove('panning');
    dialog.close(); document.body.classList.remove('viewing'); background.inert = savedInert;
    setZoom(false); full.style.visibility = 'hidden'; full.removeAttribute('src');
    if (opener?.isConnected) opener.focus({preventScroll: true});
    opener = null;
  }
  async function show(next, from = null) {
    index = (next + items.length) % items.length;
    const item = items[index], current = ++ticket;
    if (!dialog.open) {
      opener = from || item.link; savedInert = background.inert;
      background.inert = true; document.body.classList.add('viewing'); dialog.showModal(); close.focus();
    }
    setZoom(false); drag = null; stage.classList.remove('panning');
    $('view-title').textContent = item.group + ' · ' + item.title;
    $('view-count').textContent = `${index + 1} / ${items.length} · ${item.original.width} × ${item.original.height} px`;
    $('original').href = $('download').href = item.original.src;
    $('download').download = item.original.src.split('/').pop();
    full.style.visibility = 'hidden'; zoom.disabled = true;
    status.hidden = false; status.textContent = 'Загрузка полного PNG…';
    const candidate = new Image(item.original.width, item.original.height);
    candidate.id = 'full'; candidate.alt = item.alt; candidate.draggable = false; candidate.decoding = 'async'; candidate.style.visibility = 'hidden';
    candidate.src = item.original.src;
    try {
      await candidate.decode();
      if (current !== ticket || !dialog.open) return;
      if (candidate.naturalWidth !== item.original.width || candidate.naturalHeight !== item.original.height) throw new Error('Dimensions mismatch');
      full.replaceWith(candidate); full = candidate;
      plane.style.setProperty('--image-width', item.original.width + 'px');
      plane.style.setProperty('--image-height', item.original.height + 'px');
      full.style.visibility = 'visible'; status.hidden = true; zoom.disabled = false;
    } catch {
      if (current !== ticket || !dialog.open) return;
      status.textContent = 'Изображение недоступно или его размер не совпал с каталогом. Можно открыть оригинал отдельно.';
    }
  }
  items.forEach((item, i) => item.link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); show(i, item.link);
  }));
  close.addEventListener('click', hide);
  dialog.addEventListener('cancel', e => { e.preventDefault(); hide(); });
  $('previous').addEventListener('click', () => show(index - 1));
  $('next').addEventListener('click', () => show(index + 1));
  zoom.addEventListener('click', () => setZoom(!stage.classList.contains('zoom')));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const stops = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')];
      const first = stops[0], last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.activeElement === stage && stage.classList.contains('zoom') && e.key.startsWith('Arrow')) {
      e.preventDefault(); stage.scrollLeft += e.key === 'ArrowRight' ? 80 : e.key === 'ArrowLeft' ? -80 : 0;
      stage.scrollTop += e.key === 'ArrowDown' ? 80 : e.key === 'ArrowUp' ? -80 : 0; return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(index + (e.key === 'ArrowRight' ? 1 : -1)); }
    if (e.key === 'Home') { e.preventDefault(); show(0); }
    if (e.key === 'End') { e.preventDefault(); show(items.length - 1); }
  });
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !stage.classList.contains('zoom')) return;
    drag = {x:e.clientX, y:e.clientY, left:stage.scrollLeft, top:stage.scrollTop};
    stage.setPointerCapture(e.pointerId); stage.classList.add('panning');
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    stage.scrollLeft = drag.left - (e.clientX - drag.x); stage.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const end = e => { drag = null; stage.classList.remove('panning'); if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
}
