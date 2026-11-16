// 11 · Interações em JS vanilla, sem bibliotecas
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const toggle = $('.menu-toggle'), nav = $('#nav-menu');
const menuLinks = $$('a', nav);
const themeToggle = $('.theme-toggle');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo noturno');
  $('.theme-icon', themeToggle).textContent = dark ? '☀' : '☾';
}
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('palhaco-theme', next); } catch (_) {}
  updateThemeButton();
});
updateThemeButton();
function menu(open) {
  toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  nav.classList.toggle('open', open); nav.inert = !open; nav.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
  (open ? menuLinks[0] : toggle).focus();
}
nav.inert = true;
toggle.addEventListener('click', () => menu(toggle.getAttribute('aria-expanded') !== 'true'));
menuLinks.forEach(link => link.addEventListener('click', () => menu(false)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { e.preventDefault(); menu(false); }
  if (e.key === 'Tab' && nav.classList.contains('open')) {
    const focusable = [toggle, ...menuLinks], ix = focusable.indexOf(document.activeElement);
    if (e.shiftKey && ix === 0) { e.preventDefault(); focusable.at(-1).focus(); }
    if (!e.shiftKey && ix === focusable.length - 1) { e.preventDefault(); toggle.focus(); }
  }
});
$('#ano').textContent = new Date().getFullYear();
// Galeria infinita: duplica a faixa para uma transição sem salto.
const track = $('.reels-track'), cards = $$('.reels-set .reel-card', track);
const secondSet = $('.reels-set', track).cloneNode(true);
secondSet.setAttribute('aria-hidden', 'true');
$$('.reel-card', secondSet).forEach(card => card.tabIndex = -1);
track.append(secondSet);
// A faixa acompanha o dedo e retoma a animação três segundos após soltá-lo.
const reelsViewport = $('.reels-viewport');
const REELS_PAUSE_MS = 3000;
let drag = null, resumeTimer = null, suppressTouchClickUntil = 0;
function finishReelsTouch() {
  if (!drag) return;
  const animation = drag.animation;
  drag = null;
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { if (!reduced && animation) animation.play(); }, REELS_PAUSE_MS);
}
reelsViewport.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || reduced) return;
  const animation = track.getAnimations().find(item => item.animationName === 'reels-marquee');
  if (!animation) return;
  clearTimeout(resumeTimer);
  animation.pause();
  drag = {id:event.pointerId, x:event.clientX, time:Number(animation.currentTime) || 0, animation, moved:false};
}, {passive:true});
reelsViewport.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  if (Math.abs(event.clientX - drag.x) < 8 && !drag.moved) return;
  drag.moved = true;
  const width = track.scrollWidth / 2;
  if (!width) return;
  const duration = Number(drag.animation.effect.getTiming().duration);
  const time = drag.time - (event.clientX - drag.x) * duration / width;
  drag.animation.currentTime = ((time % duration) + duration) % duration;
}, {passive:true});
reelsViewport.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.id) return;
  if (drag.moved) suppressTouchClickUntil = performance.now() + 700;
  finishReelsTouch();
}, {passive:true});
reelsViewport.addEventListener('pointercancel', event => {
  if (drag && event.pointerId === drag.id) finishReelsTouch();
}, {passive:true});
reelsViewport.addEventListener('click', event => {
  if (performance.now() < suppressTouchClickUntil) {
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressTouchClickUntil = 0;
  }
}, true);
let activeTile, photoIndex = 0;
const dialog = $('#lightbox');
const photo = $('.gallery-dialog-image', dialog);
const photoTitle = $('.gallery-dialog-title', dialog);
const photoCounter = $('.gallery-dialog-counter', dialog);
const videoLink = $('.gallery-dialog-video', dialog);
function showPhoto(index) {
  photoIndex = (index + cards.length) % cards.length;
  const card = cards[photoIndex];
  const image = $('img', card);
  photo.src = card.dataset.cover;
  photo.alt = image.alt;
  photoTitle.textContent = card.dataset.title;
  photoCounter.textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  if (card.dataset.video) {
    videoLink.href = `https://www.youtube.com/shorts/${encodeURIComponent(card.dataset.video)}`;
    videoLink.hidden = false;
  } else videoLink.hidden = true;
}
track.addEventListener('click', event => {
  const tile = event.target.closest('.reel-card');
  if (!tile || !track.contains(tile)) return;
  activeTile = cards.find(card => card.dataset.title === tile.dataset.title) || cards[0];
  showPhoto(cards.indexOf(activeTile));
  dialog.showModal();
});
$('.gallery-dialog-prev', dialog).addEventListener('click', () => showPhoto(photoIndex - 1));
$('.gallery-dialog-next', dialog).addEventListener('click', () => showPhoto(photoIndex + 1));
$('.gallery-dialog-close', dialog).addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(photoIndex - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + 1); }
});
dialog.addEventListener('close', () => { if (activeTile) activeTile.focus(); });
// IntersectionObserver entra e recua ao sair; atraso de 80 ms entre cards.
if (!reduced && 'IntersectionObserver' in window) {
  $$('.highlight,.about-photo-card,.about-copy,.mission-item,.invitation-grid>div,.footer-main').forEach((el, i) => {
    el.dataset.reveal = el.matches('.about-photo-card') ? 'zoom-pop' : (el.matches('.mission-item') ? 'slide' : (el.matches('.highlight') ? 'bounce' : 'fade-up'));
    if (el.matches('.highlight,.mission-item')) el.style.setProperty('--delay', (i % 5) * 80 + 'ms');
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting)), { threshold: .08, rootMargin: '0px 0px -3% 0px' });
  document.body.classList.add('motion-ready');
  $$('[data-reveal]').forEach(el => observer.observe(el));
}

// Ao entrar no rodapé, o acesso ao Instagram acompanha a marca.
const instagramFloat = $('.instagram-float');
const instagramDocked = $('.instagram-docked');
const footer = $('.footer');
let footerFrame = 0;
function updateInstagramPosition() {
  footerFrame = 0;
  const rect = footer.getBoundingClientRect();
  const dock = rect.top <= window.innerHeight && rect.bottom > 0;
  instagramFloat.hidden = dock;
  instagramDocked.hidden = !dock;
}
function scheduleInstagramPosition() {
  if (!footerFrame) footerFrame = requestAnimationFrame(updateInstagramPosition);
}
window.addEventListener('scroll', scheduleInstagramPosition, {passive:true});
window.addEventListener('resize', scheduleInstagramPosition);
updateInstagramPosition();
