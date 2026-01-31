import { calculateShieldTotal, findWeakestTile, normalizeTiles } from '../core/shield.js';
import { getShieldSnapshot } from '../storage/shield.js';
import { setActiveScreen } from './navigation.js';

const createTileCard = (tile, isWeakest) => {
  const card = document.createElement('article');
  card.className = 'shield-card';
  if (isWeakest) {
    card.classList.add('is-weakest');
  }

  const title = document.createElement('h3');
  title.className = 'shield-card__title';
  title.textContent = tile.label;

  const score = document.createElement('div');
  score.className = 'shield-card__score';
  score.textContent = tile.score.toString();

  const note = document.createElement('p');
  note.className = 'shield-card__note';
  note.textContent = tile.description;

  if (isWeakest) {
    const badge = document.createElement('span');
    badge.className = 'shield-card__badge';
    badge.textContent = 'Самая слабая';
    card.appendChild(badge);
  }

  card.append(title, score, note);
  return card;
};

export const initShield = () => {
  const screen = document.querySelector('[data-screen="shield"]');
  if (!screen) {
    return;
  }
  const grid = screen.querySelector('[data-shield-grid]');
  const totalValue = screen.querySelector('[data-shield-total]');
  const snapshotButton = screen.querySelector('[data-open-snapshot]');

  if (!grid || !totalValue) {
    return;
  }

  const tiles = normalizeTiles(getShieldSnapshot());
  const total = calculateShieldTotal(tiles);
  const weakestId = findWeakestTile(tiles);

  totalValue.textContent = total.toString();
  grid.innerHTML = '';
  tiles.forEach((tile) => {
    const card = createTileCard(tile, tile.id === weakestId);
    grid.appendChild(card);
  });

  if (snapshotButton) {
    snapshotButton.addEventListener('click', () => {
      setActiveScreen('snapshot');
    });
  }
};
