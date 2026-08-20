document.documentElement.classList.add('js');

const selection = document.querySelector('[data-selection]');
let selectionFrame = 0;

function updateSelection() {
  selectionFrame = 0;
  if (!selection) return;

  const rect = selection.getBoundingClientRect();
  const travel = Math.max(1, selection.offsetHeight - innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / travel));

  selection.classList.toggle('is-focus', progress >= .22);
  selection.classList.toggle('is-pair', progress >= .58);
}

function requestSelectionUpdate() {
  if (selectionFrame) return;
  selectionFrame = requestAnimationFrame(updateSelection);
}

addEventListener('scroll', requestSelectionUpdate, { passive: true });
addEventListener('resize', requestSelectionUpdate);
updateSelection();

const dialog = document.querySelector('.lightbox');
const dialogImage = dialog.querySelector('img');
const closeButton = dialog.querySelector('.lightbox__close');
const main = document.querySelector('main');
let opener = null;

function closeLightbox() {
  if (dialog.hidden) return;
  dialog.hidden = true;
  dialogImage.removeAttribute('src');
  dialogImage.alt = '';
  document.body.classList.remove('has-lightbox');
  main.removeAttribute('inert');
  opener?.focus();
  opener = null;
}

function openLightbox(link) {
  opener = link;
  const source = link.querySelector('img');
  dialogImage.src = link.href;
  dialogImage.alt = source?.alt || '';
  dialog.hidden = false;
  document.body.classList.add('has-lightbox');
  main.setAttribute('inert', '');
  closeButton.focus();
}

document.querySelectorAll('[data-lightbox]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openLightbox(link);
  });
});

closeButton.addEventListener('click', closeLightbox);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (dialog.hidden) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'Tab') {
    event.preventDefault();
    closeButton.focus();
  }
});
