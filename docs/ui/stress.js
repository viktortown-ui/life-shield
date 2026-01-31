import { getShieldSnapshotData } from '../storage/shield.js';
import { addStressRun, getStressHistory } from '../storage/stress.js';
import { setActiveScreen } from './navigation.js';

const SCENARIOS = [
  {
    id: 'base',
    title: 'Базовый',
    description: 'Базовая устойчивость при текущих показателях.',
    incomeMultiplier: 1,
    expensesMultiplier: 1,
  },
  {
    id: 'income-down',
    title: 'Доход -30%',
    description: 'Доход проседает на 30%, резерв не пополняется.',
    incomeMultiplier: 0.7,
    expensesMultiplier: 1,
  },
  {
    id: 'income-zero',
    title: 'Доход = 0',
    description: 'Доход исчезает полностью, живем только на резерв.',
    incomeOverride: 0,
    incomeMultiplier: 0,
    expensesMultiplier: 1,
  },
  {
    id: 'combo',
    title: 'Комбо: доход вниз + расходы вверх',
    description: 'Доход -30%, расходы +20%.',
    incomeMultiplier: 0.7,
    expensesMultiplier: 1.2,
  },
];

const MAX_RUNWAY_MONTHS = 12;

const formatNumber = (value) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value));

const formatMonths = (value) => {
  if (!Number.isFinite(value)) {
    return '∞';
  }
  return value.toFixed(1);
};

const getRunway = (reserve, expenses) => {
  if (expenses <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return reserve / expenses;
};

const describeBreakdown = ({ income, expenses, runway }) => {
  if (income <= 0) {
    return 'Доход обнуляется — резерв расходуется без подпитки.';
  }
  if (income < expenses) {
    return 'Расходы превышают доход, резерв тает каждый месяц.';
  }
  if (runway < 3) {
    return 'Резерв заканчивается быстрее, чем за 3 месяца.';
  }
  return 'Критичной поломки нет: запас покрывает расходы.';
};

const buildLevers = ({ income, expenses, reserve, scenario }) => {
  const levers = [];
  const gap = expenses - income;

  if (income <= 0) {
    levers.push('Вернуть хотя бы один стабильный поток дохода на ближайшие 1–2 месяца.');
    levers.push('Заморозить необязательные траты и оставить только критичные платежи.');
  } else if (gap > 0) {
    levers.push(`Снизить обязательные расходы минимум на ${formatNumber(gap)} ₽/мес.`);
    levers.push('Найти быстрый источник дохода на 2–4 недели.');
  } else {
    levers.push('Усилить резерв до 3–6 месяцев расходов.');
  }

  if (scenario.expensesMultiplier > 1) {
    levers.push('Зафиксировать потолок трат: отложить крупные покупки и сервисы.');
  }

  if (scenario.incomeMultiplier < 1 || scenario.incomeOverride === 0) {
    levers.push('Диверсифицировать доход: второй источник или временная подработка.');
  } else {
    levers.push('Собрать список расходов, которые можно быстро урезать при первом сигнале.');
  }

  if (reserve < expenses) {
    levers.push('Пополнить резерв хотя бы до одного месяца расходов.');
  }

  return levers.slice(0, 3);
};

const buildResult = (snapshot, scenario) => {
  const income =
    typeof scenario.incomeOverride === 'number'
      ? scenario.incomeOverride
      : snapshot.income * scenario.incomeMultiplier;
  const expenses = snapshot.expenses * scenario.expensesMultiplier;
  const reserve = snapshot.reserve;
  const runway = getRunway(reserve, expenses);
  const breakdown = describeBreakdown({ income, expenses, runway });
  const levers = buildLevers({ income, expenses, reserve, scenario });

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    income,
    expenses,
    reserve,
    runway,
    breakdown,
    levers,
    createdAt: new Date().toISOString(),
  };
};

const renderBaseline = (container, snapshot) => {
  if (!container) {
    return;
  }
  if (!snapshot) {
    container.innerHTML = `
      <div class="stress__baseline-card stress__baseline-card--empty">
        <p>Нет данных снимка. Заполни финансы, чтобы стресс-тест был точным.</p>
        <button class="stress__snapshot-button" type="button" data-open-stress-snapshot>
          Заполнить снимок
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="stress__baseline-card">
      <h3>Базовые данные</h3>
      <div class="stress__baseline-grid">
        <div>
          <p class="stress__baseline-label">Резерв</p>
          <strong>${formatNumber(snapshot.reserve)} ₽</strong>
        </div>
        <div>
          <p class="stress__baseline-label">Расходы/мес</p>
          <strong>${formatNumber(snapshot.expenses)} ₽</strong>
        </div>
        <div>
          <p class="stress__baseline-label">Доход/мес</p>
          <strong>${formatNumber(snapshot.income)} ₽</strong>
        </div>
      </div>
    </div>
  `;
};

const createScenarioCard = (scenario) => {
  const card = document.createElement('article');
  card.className = 'stress__card';
  card.dataset.scenarioId = scenario.id;
  card.innerHTML = `
    <header class="stress__card-header">
      <div>
        <h3>${scenario.title}</h3>
        <p>${scenario.description}</p>
      </div>
      <button class="stress__card-button" type="button" data-stress-run>
        Прогнать
      </button>
    </header>
    <div class="stress__chart">
      <div class="stress__chart-bar" data-stress-bar></div>
      <div class="stress__chart-labels">
        <span>0</span>
        <span>${MAX_RUNWAY_MONTHS}м</span>
      </div>
    </div>
    <div class="stress__result">
      <p class="stress__result-runway">Runway: <strong data-stress-runway>—</strong> мес.</p>
      <p class="stress__result-breakdown" data-stress-breakdown>Что сломалось: —</p>
      <div class="stress__result-levers">
        <p>Быстрые рычаги:</p>
        <ul data-stress-levers></ul>
      </div>
    </div>
  `;
  return card;
};

const updateScenarioCard = (card, result) => {
  const runwayValue = card.querySelector('[data-stress-runway]');
  const breakdown = card.querySelector('[data-stress-breakdown]');
  const leversList = card.querySelector('[data-stress-levers]');
  const bar = card.querySelector('[data-stress-bar]');

  if (runwayValue) {
    runwayValue.textContent = formatMonths(result.runway);
  }
  if (breakdown) {
    breakdown.textContent = `Что сломалось: ${result.breakdown}`;
  }
  if (leversList) {
    leversList.innerHTML = '';
    result.levers.forEach((lever) => {
      const item = document.createElement('li');
      item.textContent = lever;
      leversList.appendChild(item);
    });
  }
  if (bar) {
    const level = Number.isFinite(result.runway)
      ? Math.min(result.runway, MAX_RUNWAY_MONTHS) / MAX_RUNWAY_MONTHS
      : 1;
    bar.style.setProperty('--stress-bar-level', level.toString());
  }
};

const renderHistory = (list) => {
  if (!list) {
    return;
  }
  const history = getStressHistory();
  list.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'stress__history-empty';
    empty.textContent = 'Пока нет запусков. Нажми «Прогнать» в любом сценарии.';
    list.appendChild(empty);
    return;
  }
  history.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'stress__history-item';
    const date = new Date(entry.createdAt);
    item.innerHTML = `
      <div>
        <strong>${entry.scenarioTitle}</strong>
        <span>${date.toLocaleString('ru-RU')}</span>
      </div>
      <p>Runway: ${formatMonths(entry.runway)} мес.</p>
      <p>${entry.breakdown}</p>
    `;
    list.appendChild(item);
  });
};

export const initStress = () => {
  const screen = document.querySelector('[data-screen="stress"]');
  if (!screen) {
    return;
  }
  const baseline = screen.querySelector('[data-stress-baseline]');
  const scenariosWrapper = screen.querySelector('[data-stress-scenarios]');
  const runAllButton = screen.querySelector('[data-stress-run-all]');
  const historyList = screen.querySelector('[data-stress-history-list]');

  const snapshot = getShieldSnapshotData();
  renderBaseline(baseline, snapshot);

  const cards = new Map();

  if (scenariosWrapper) {
    scenariosWrapper.innerHTML = '';
    SCENARIOS.forEach((scenario) => {
      const card = createScenarioCard(scenario);
      const runButton = card.querySelector('[data-stress-run]');
      runButton?.addEventListener('click', () => {
        if (!snapshot) {
          setActiveScreen('snapshot');
          return;
        }
        const result = buildResult(snapshot, scenario);
        updateScenarioCard(card, result);
        addStressRun(result);
        renderHistory(historyList);
      });
      scenariosWrapper.appendChild(card);
      cards.set(scenario.id, card);
    });
  }

  runAllButton?.addEventListener('click', () => {
    if (!snapshot) {
      setActiveScreen('snapshot');
      return;
    }
    SCENARIOS.forEach((scenario) => {
      const card = cards.get(scenario.id);
      if (!card) {
        return;
      }
      const result = buildResult(snapshot, scenario);
      updateScenarioCard(card, result);
      addStressRun(result);
    });
    renderHistory(historyList);
  });

  screen.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.matches('[data-open-stress-snapshot]')) {
      setActiveScreen('snapshot');
    }
  });

  renderHistory(historyList);
};
