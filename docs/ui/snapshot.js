import { clampScore } from '../core/shield.js';
import {
  DEFAULT_SHIELD_TILES,
  getShieldSnapshot,
  getShieldSnapshotData,
  setShieldSnapshot,
} from '../storage/shield.js';
import { setActiveScreen } from './navigation.js';
import { renderShield } from './shield.js';

const formatNumber = (value) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const formatDate = (iso) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const buildTilesFromSnapshot = (snapshot) =>
  DEFAULT_SHIELD_TILES.map((tile) => {
    switch (tile.id) {
      case 'money': {
        const expenses = Math.max(snapshot.expenses, 1);
        const months = Math.min(snapshot.reserve / expenses, 6);
        return { ...tile, score: clampScore(Math.round((months / 6) * 10)) };
      }
      case 'obligations': {
        if (!snapshot.hasCredits) {
          return { ...tile, score: 10 };
        }
        const ratio = snapshot.creditPayment / Math.max(snapshot.income, 1);
        return { ...tile, score: clampScore(Math.round(10 - ratio * 10)) };
      }
      case 'income': {
        const coverage = snapshot.income / Math.max(snapshot.expenses, 1);
        const base = (Math.min(coverage, 2) / 2) * 8;
        const sourceBonus = snapshot.incomeSources >= 3 ? 2 : snapshot.incomeSources === 2 ? 1 : 0;
        return { ...tile, score: clampScore(Math.round(base + sourceBonus)) };
      }
      case 'energy':
        return { ...tile, score: clampScore(snapshot.energy) };
      case 'support':
        return { ...tile, score: clampScore(snapshot.support) };
      case 'flexibility':
        return { ...tile, score: clampScore(snapshot.flexibility) };
      default:
        return tile;
    }
  });

const STEP_MAP = {
  money: 'Пополнить резерв хотя бы на одну небольшую сумму в эту неделю.',
  obligations: 'Пересмотреть обязательства и найти один платеж для снижения.',
  income: 'Подумать об одном дополнительном источнике дохода или подработке.',
  energy: 'Запланировать 2 коротких окна восстановления по 20–30 минут.',
  support: 'Написать одному человеку и попросить о небольшой помощи.',
  flexibility: 'Найти одну рутину, которую можно сделать проще или автоматизировать.',
};

const buildWeeklySteps = (tiles) =>
  [...tiles]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((tile) => STEP_MAP[tile.id] ?? 'Выбрать один понятный шаг для этой сферы.');

const updateRangeValue = (input, output) => {
  if (output) {
    output.textContent = input.value;
  }
};

const hydrateForm = (form, snapshot) => {
  if (!snapshot) {
    return;
  }
  form.reserve.value = snapshot.reserve.toString();
  form.expenses.value = snapshot.expenses.toString();
  form.income.value = snapshot.income.toString();
  form.incomeSources.value = snapshot.incomeSources.toString();
  form.hasCredits.checked = snapshot.hasCredits;
  form.creditPayment.value = snapshot.creditPayment.toString();
  form.energy.value = snapshot.energy.toString();
  form.support.value = snapshot.support.toString();
  form.flexibility.value = snapshot.flexibility.toString();
};

const readSnapshotFromForm = (form) => {
  const incomeSources = Number.parseInt(form.incomeSources.value, 10);
  const hasCredits = form.hasCredits.checked;
  return {
    reserve: formatNumber(form.reserve.value),
    expenses: formatNumber(form.expenses.value),
    income: formatNumber(form.income.value),
    incomeSources: Number.isFinite(incomeSources) ? incomeSources : 1,
    hasCredits,
    creditPayment: hasCredits ? formatNumber(form.creditPayment.value) : 0,
    energy: formatNumber(form.energy.value),
    support: formatNumber(form.support.value),
    flexibility: formatNumber(form.flexibility.value),
    createdAt: new Date().toISOString(),
  };
};

export const initSnapshot = () => {
  const screen = document.querySelector('[data-screen="snapshot"]');
  if (!screen) {
    return;
  }
  const form = screen.querySelector('[data-snapshot-form]');
  const results = screen.querySelector('[data-snapshot-results]');
  const stepsList = screen.querySelector('[data-snapshot-steps]');
  const dateLabel = screen.querySelector('[data-snapshot-date]');
  const backButton = screen.querySelector('[data-close-snapshot]');
  const stressButton = screen.querySelector('[data-open-stress]');
  const creditToggle = screen.querySelector('[data-credit-toggle]');
  const creditPaymentField = screen.querySelector('[data-credit-payment]');

  if (!form || !results || !stepsList || !dateLabel) {
    return;
  }

  const rangeInputs = Array.from(form.querySelectorAll('input[type="range"]'));
  rangeInputs.forEach((input) => {
    const output = input.parentElement?.querySelector('[data-range-value]');
    updateRangeValue(input, output);
    input.addEventListener('input', () => updateRangeValue(input, output));
  });

  const toggleCreditField = () => {
    const isChecked = creditToggle?.checked ?? false;
    if (creditPaymentField) {
      creditPaymentField.hidden = !isChecked;
      const paymentInput = creditPaymentField.querySelector('input');
      if (paymentInput) {
        paymentInput.required = isChecked;
        if (!isChecked) {
          paymentInput.value = '0';
        }
      }
    }
  };

  creditToggle?.addEventListener('change', toggleCreditField);

  const renderResults = (tiles, snapshot) => {
    const steps = buildWeeklySteps(tiles);
    stepsList.innerHTML = '';
    steps.forEach((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      stepsList.appendChild(item);
    });
    dateLabel.textContent = formatDate(snapshot?.createdAt);
    results.hidden = false;
  };

  const storedSnapshot = getShieldSnapshotData();
  if (storedSnapshot) {
    hydrateForm(form, storedSnapshot);
    toggleCreditField();
    const tiles = getShieldSnapshot();
    renderResults(tiles, storedSnapshot);
  } else {
    toggleCreditField();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const snapshot = readSnapshotFromForm(form);
    const tiles = buildTilesFromSnapshot(snapshot);
    setShieldSnapshot(tiles, snapshot);
    renderShield();
    renderResults(tiles, snapshot);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  backButton?.addEventListener('click', () => {
    setActiveScreen('shield');
  });

  stressButton?.addEventListener('click', () => {
    setActiveScreen('stress');
  });
};
