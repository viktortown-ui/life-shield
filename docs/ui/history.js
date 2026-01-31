import { getShieldHistory } from '../storage/shield.js';
import { getStressHistory } from '../storage/stress.js';

const formatDate = (value) => {
  if (!value) {
    return 'Без даты';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Без даты';
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Без даты';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Без даты';
  }
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRunway = (value) => {
  if (!Number.isFinite(value)) {
    return '∞';
  }
  return value.toFixed(1);
};

const buildChangeLines = (current, previous) => {
  if (!previous) {
    return ['Первый зафиксированный снимок.'];
  }
  const previousScores = new Map(previous.tiles.map((tile) => [tile.id, tile.score]));
  const diffs = current.tiles
    .map((tile) => ({
      label: tile.label,
      diff: tile.score - (previousScores.get(tile.id) ?? tile.score),
    }))
    .filter((entry) => entry.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);

  if (!diffs.length) {
    return ['Без заметных изменений по сферам.'];
  }

  return diffs.map((entry) => {
    const sign = entry.diff > 0 ? '+' : '';
    return `${entry.label} ${sign}${entry.diff}`;
  });
};

const renderChart = (container, history) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'history__chart-empty';
    empty.textContent = 'Снимков пока нет — график появится после первого сохранения.';
    container.appendChild(empty);
    return;
  }

  const ordered = [...history].reverse();
  const width = 240;
  const height = 84;
  const padding = 12;
  const span = ordered.length > 1 ? (width - padding * 2) / (ordered.length - 1) : 0;
  const points = ordered.map((entry, index) => {
    const x = padding + span * index;
    const clamped = Math.max(0, Math.min(100, entry.total));
    const y = height - padding - (clamped / 100) * (height - padding * 2);
    return { x, y, total: clamped };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${
    height - padding
  } Z`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.classList.add('history__chart-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'График индекса щита');
  svg.innerHTML = `
    <defs>
      <linearGradient id="historyLine" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.05" />
      </linearGradient>
    </defs>
    <path class="history__chart-area" d="${areaPath}" />
    <path class="history__chart-line" d="${linePath}" />
    ${points
      .map(
        (point, index) =>
          `<circle cx="${point.x}" cy="${point.y}" r="${
            index === points.length - 1 ? 3.5 : 2.5
          }" class="history__chart-dot" />`
      )
      .join('')}
  `;

  const meta = document.createElement('div');
  meta.className = 'history__chart-meta';
  meta.innerHTML = `
    <span>0</span>
    <span>100</span>
    <span class="history__chart-latest">Сейчас: ${points.at(-1).total}</span>
  `;

  container.appendChild(svg);
  container.appendChild(meta);
};

const renderSnapshots = (container, history) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'history__list-empty';
    empty.textContent = 'Снимков пока нет. Сделай первый снимок щита.';
    container.appendChild(empty);
    return;
  }

  history.slice(0, 6).forEach((entry, index) => {
    const previous = history[index + 1];
    const card = document.createElement('article');
    card.className = 'history__item';
    const changes = buildChangeLines(entry, previous);
    card.innerHTML = `
      <div class="history__item-header">
        <div>
          <strong>${formatDate(entry.createdAt)}</strong>
          <span>Индекс: ${entry.total}</span>
        </div>
        <span class="history__item-pill">${index === 0 ? 'Последний' : 'Снимок'}</span>
      </div>
      <ul class="history__item-list">
        ${changes.map((line) => `<li>${line}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  });
};

const renderStress = (container, history) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'history__list-empty';
    empty.textContent = 'Запусков стресс-тестов пока нет.';
    container.appendChild(empty);
    return;
  }

  history.slice(0, 6).forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'history__item';
    card.innerHTML = `
      <div class="history__item-header">
        <div>
          <strong>${formatDateTime(entry.createdAt)}</strong>
          <span>${entry.scenarioTitle}</span>
        </div>
        <span class="history__item-pill">Runway ${formatRunway(entry.runway)} мес.</span>
      </div>
      <p class="history__item-note">${entry.breakdown}</p>
    `;
    container.appendChild(card);
  });
};

export const initHistory = () => {
  const screen = document.querySelector('[data-screen="history"]');
  if (!screen) {
    return;
  }
  const emptyState = screen.querySelector('[data-history-empty]');
  const content = screen.querySelector('[data-history-content]');
  const chart = screen.querySelector('[data-history-chart]');
  const snapshots = screen.querySelector('[data-history-snapshots]');
  const stress = screen.querySelector('[data-history-stress]');
  const navButton = document.querySelector('[data-target="history"]');

  const render = () => {
    const snapshotHistory = getShieldHistory();
    const stressHistory = getStressHistory();
    const hasData = snapshotHistory.length > 0 || stressHistory.length > 0;

    if (emptyState) {
      emptyState.hidden = hasData;
    }
    if (content) {
      content.hidden = !hasData;
    }

    renderChart(chart, snapshotHistory);
    renderSnapshots(snapshots, snapshotHistory);
    renderStress(stress, stressHistory);
  };

  navButton?.addEventListener('click', render);
  render();
};
