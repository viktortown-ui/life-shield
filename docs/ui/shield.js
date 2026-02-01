import { calculateShieldTotal, findWeakestTile, normalizeTiles } from '../core/shield.js';
import { getShieldSnapshot } from '../storage/shield.js';
import { getCopyData } from './copy.js';
import { closeSheet, openSheet, initSheetCloseHandlers } from './help.js';
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

const shieldState = {
  grid: null,
  totalValue: null,
  goalTitle: null,
  goalStep: null,
  snapshotButton: null,
  breakdownSheet: null,
  breakdownTitle: null,
  breakdownIntro: null,
  breakdownList: null,
  breakdownWeakLabel: null,
  breakdownWeak: null,
  breakdownStrongLabel: null,
  breakdownStrong: null,
  breakdownActionsTitle: null,
  breakdownActionsSubtitle: null,
  breakdownActions: null,
};

const copyPromise = getCopyData();

const formatPercent = (value) => `${value.toFixed(1)}%`;

const renderBreakdown = (tiles, copyData) => {
  if (
    !shieldState.breakdownTitle ||
    !shieldState.breakdownIntro ||
    !shieldState.breakdownList ||
    !shieldState.breakdownWeak ||
    !shieldState.breakdownStrong ||
    !shieldState.breakdownActions ||
    !shieldState.breakdownWeakLabel ||
    !shieldState.breakdownStrongLabel ||
    !shieldState.breakdownActionsTitle ||
    !shieldState.breakdownActionsSubtitle
  ) {
    return;
  }

  const breakdownCopy = copyData?.indexBreakdown ?? {};
  const actionsMap = copyData?.shieldActions ?? {};
  const weight = tiles.length ? 100 / tiles.length : 0;

  shieldState.breakdownTitle.textContent = breakdownCopy.title ?? 'Разбор индекса';
  shieldState.breakdownIntro.textContent = breakdownCopy.intro ?? '';
  shieldState.breakdownWeakLabel.textContent = breakdownCopy.weakLabel ?? 'Слабые зоны';
  shieldState.breakdownStrongLabel.textContent = breakdownCopy.strongLabel ?? 'Сильные зоны';
  shieldState.breakdownActionsTitle.textContent = breakdownCopy.actionsTitle ?? 'Что можно сделать';
  shieldState.breakdownActionsSubtitle.textContent = breakdownCopy.actionsSubtitle ?? '';

  shieldState.breakdownList.innerHTML = '';
  tiles.forEach((tile) => {
    const item = document.createElement('li');
    item.className = 'breakdown__item';

    const title = document.createElement('strong');
    title.textContent = tile.label;

    const meta = document.createElement('div');
    meta.className = 'breakdown__meta';
    const score = `${breakdownCopy.scoreLabel ?? 'Балл'} ${tile.score}/10`;
    const weightText = `${breakdownCopy.weightsLabel ?? 'Вес'} ${formatPercent(weight)}`;
    const contributionValue = (tile.score / 10) * weight;
    const contribution = `${breakdownCopy.contributionLabel ?? 'Вклад'} ${formatPercent(contributionValue)}`;
    meta.textContent = `${score} · ${weightText} · ${contribution}`;

    item.append(title, meta);
    shieldState.breakdownList.appendChild(item);
  });

  const sorted = [...tiles].sort((a, b) => a.score - b.score);
  const weak = sorted.slice(0, 2);
  const strong = sorted.slice(-2).reverse();

  const renderPills = (target, list) => {
    target.innerHTML = '';
    list.forEach((tile) => {
      const pill = document.createElement('li');
      pill.className = 'breakdown__pill';
      pill.textContent = `${tile.label} ${tile.score}/10`;
      target.appendChild(pill);
    });
  };

  renderPills(shieldState.breakdownWeak, weak);
  renderPills(shieldState.breakdownStrong, strong);

  shieldState.breakdownActions.innerHTML = '';
  const actionList = [];
  weak.forEach((tile) => {
    const action = actionsMap[tile.id];
    if (action && !actionList.includes(action)) {
      actionList.push(action);
    }
  });
  if (!actionList.length && breakdownCopy.fallbackAction) {
    actionList.push(breakdownCopy.fallbackAction);
  }
  actionList.slice(0, 2).forEach((action) => {
    const item = document.createElement('li');
    item.textContent = action;
    shieldState.breakdownActions.appendChild(item);
  });
};

export const renderShield = async () => {
  if (!shieldState.grid || !shieldState.totalValue) {
    return;
  }

  const tiles = normalizeTiles(getShieldSnapshot());
  const total = calculateShieldTotal(tiles);
  const weakestId = findWeakestTile(tiles);
  const weakestTile = tiles.find((tile) => tile.id === weakestId) ?? tiles[0] ?? null;
  const copyData = await copyPromise;
  const actionsMap = copyData?.shieldActions ?? {};

  shieldState.totalValue.textContent = total.toString();
  shieldState.grid.innerHTML = '';
  tiles.forEach((tile) => {
    const card = createTileCard(tile, tile.id === weakestId);
    shieldState.grid.appendChild(card);
  });

  renderBreakdown(tiles, copyData);

  if (shieldState.goalTitle && shieldState.goalStep) {
    if (weakestTile) {
      shieldState.goalTitle.textContent = `Фокус на плитке «${weakestTile.label}».`;
      shieldState.goalStep.textContent =
        actionsMap[weakestTile.id] ?? 'Сделай один небольшой шаг, чтобы поддержать эту сферу.';
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
  shieldState.goalTitle = screen.querySelector('[data-shield-goal-title]');
  shieldState.goalStep = screen.querySelector('[data-shield-goal-step]');
  shieldState.snapshotButton = screen.querySelector('[data-open-snapshot]');
  shieldState.breakdownSheet = document.querySelector('[data-sheet=\"breakdown\"]');
  shieldState.breakdownTitle = shieldState.breakdownSheet?.querySelector('[data-breakdown-title]');
  shieldState.breakdownIntro = shieldState.breakdownSheet?.querySelector('[data-breakdown-intro]');
  shieldState.breakdownList = shieldState.breakdownSheet?.querySelector('[data-breakdown-list]');
  shieldState.breakdownWeakLabel = shieldState.breakdownSheet?.querySelector('[data-breakdown-weak-label]');
  shieldState.breakdownWeak = shieldState.breakdownSheet?.querySelector('[data-breakdown-weak]');
  shieldState.breakdownStrongLabel = shieldState.breakdownSheet?.querySelector('[data-breakdown-strong-label]');
  shieldState.breakdownStrong = shieldState.breakdownSheet?.querySelector('[data-breakdown-strong]');
  shieldState.breakdownActionsTitle = shieldState.breakdownSheet?.querySelector('[data-breakdown-actions-title]');
  shieldState.breakdownActionsSubtitle = shieldState.breakdownSheet?.querySelector('[data-breakdown-actions-subtitle]');
  shieldState.breakdownActions = shieldState.breakdownSheet?.querySelector('[data-breakdown-actions]');

  if (!shieldState.grid || !shieldState.totalValue) {
    return;
  }

  void renderShield();

  if (shieldState.breakdownSheet) {
    initSheetCloseHandlers(shieldState.breakdownSheet);
  }

  if (shieldState.snapshotButton) {
    shieldState.snapshotButton.addEventListener('click', () => {
      setActiveScreen('snapshot');
    });
  }

  const breakdownButton = screen.querySelector('[data-open-breakdown]');
  breakdownButton?.addEventListener('click', async (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-help]')) {
      return;
    }
    const copyData = await copyPromise;
    const tiles = normalizeTiles(getShieldSnapshot());
    renderBreakdown(tiles, copyData);
    openSheet(shieldState.breakdownSheet);
  });

  breakdownButton?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    const copyData = await copyPromise;
    const tiles = normalizeTiles(getShieldSnapshot());
    renderBreakdown(tiles, copyData);
    openSheet(shieldState.breakdownSheet);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (shieldState.breakdownSheet && !shieldState.breakdownSheet.hasAttribute('hidden')) {
      closeSheet(shieldState.breakdownSheet);
    }
  });
};
