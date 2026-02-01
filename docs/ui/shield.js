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

const TARGET_ACTIONS = {
  money: 'Переведи 10% дохода в резерв сегодня — даже небольшая сумма укрепит основу.',
  obligations: 'Выпиши все обязательства и выбери одно, которое можно сократить или перенести на неделю.',
  income: 'Сделай один шаг к доп. доходу: обнови профиль или откликнись на 1 предложение.',
  energy: 'Поставь в календарь 2 окна по 30 минут на восстановление и не двигай их.',
  support: 'Напиши одному человеку из окружения и договорись о коротком созвоне.',
  flexibility: 'Выбери новый навык или сценарий и потрать 30 минут на тренировку.',
};

const shieldState = {
  grid: null,
  totalValue: null,
  breakdownList: null,
  goalTitle: null,
  goalStep: null,
  snapshotButton: null,
};

export const renderShield = () => {
  if (!shieldState.grid || !shieldState.totalValue) {
    return;
  }

  const tiles = normalizeTiles(getShieldSnapshot());
  const total = calculateShieldTotal(tiles);
  const weakestId = findWeakestTile(tiles);
  const weakestTile = tiles.find((tile) => tile.id === weakestId) ?? tiles[0] ?? null;

  shieldState.totalValue.textContent = total.toString();
  shieldState.grid.innerHTML = '';
  tiles.forEach((tile) => {
    const card = createTileCard(tile, tile.id === weakestId);
    shieldState.grid.appendChild(card);
  });

  if (shieldState.breakdownList) {
    shieldState.breakdownList.innerHTML = '';
    tiles.forEach((tile) => {
      const item = document.createElement('li');
      item.className = 'shield__total-item';

      const label = document.createElement('span');
      label.textContent = tile.label;

      const score = document.createElement('span');
      score.className = 'shield__total-score';
      score.textContent = `${tile.score}/10`;

      item.append(label, score);
      shieldState.breakdownList.appendChild(item);
    });
  }

  if (shieldState.goalTitle && shieldState.goalStep) {
    if (weakestTile) {
      shieldState.goalTitle.textContent = `Фокус на плитке «${weakestTile.label}».`;
      shieldState.goalStep.textContent =
        TARGET_ACTIONS[weakestTile.id] ?? 'Сделай один небольшой шаг, чтобы поддержать эту сферу.';
    } else {
      shieldState.goalTitle.textContent = 'Добавь данные, чтобы увидеть цель недели.';
      shieldState.goalStep.textContent = 'Заполни снимок — тогда мы подскажем следующий шаг.';
    }
  }
};

export const initShield = () => {
  const screen = document.querySelector('[data-screen="shield"]');
  if (!screen) {
    return;
  }
  shieldState.grid = screen.querySelector('[data-shield-grid]');
  shieldState.totalValue = screen.querySelector('[data-shield-total]');
  shieldState.breakdownList = screen.querySelector('[data-shield-breakdown]');
  shieldState.goalTitle = screen.querySelector('[data-shield-goal-title]');
  shieldState.goalStep = screen.querySelector('[data-shield-goal-step]');
  shieldState.snapshotButton = screen.querySelector('[data-open-snapshot]');

  if (!shieldState.grid || !shieldState.totalValue) {
    return;
  }

  renderShield();

  if (shieldState.snapshotButton) {
    shieldState.snapshotButton.addEventListener('click', () => {
      setActiveScreen('snapshot');
    });
  }
};
