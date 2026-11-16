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
