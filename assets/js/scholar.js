'use strict';
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
if (menu && navigation) {
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      menu.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('open');
    }
  });
}
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.resource-card')];
const search = document.querySelector('#resource-search');
let selectedCategory = 'All';
function filterResources() {
  const query = (search?.value || '').toLowerCase().trim();
  let visible = 0;
  cards.forEach((card) => {
    const match = (selectedCategory === 'All' || card.dataset.category === selectedCategory)
      && card.dataset.search.toLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible += 1;
  });
  const count = document.querySelector('.resource-count');
  const empty = document.querySelector('.empty-state');
  if (count) count.textContent = `${visible} resource${visible === 1 ? '' : 's'}`;
  if (empty) empty.hidden = visible !== 0;
}
filterButtons.forEach((button) => button.addEventListener('click', () => {
  selectedCategory = button.dataset.filter;
  filterButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  filterResources();
}));
search?.addEventListener('input', filterResources);
document.querySelector('.print-button')?.addEventListener('click', () => window.print());
