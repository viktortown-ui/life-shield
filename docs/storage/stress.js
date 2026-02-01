const STORAGE_KEY = 'life-shield-stress-history';
const TOKENS_KEY = 'life-shield-stress-tokens';
const MAX_HISTORY = 30;

const parseStored = (raw) => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Не удалось прочитать историю стресс-теста', error);
    return [];
  }
};

export const getStressHistory = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return parseStored(raw);
};

export const addStressRun = (entry) => {
  const history = getStressHistory();
  const nextHistory = [entry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export const getStressTokens = () => {
  const raw = localStorage.getItem(TOKENS_KEY);
  const value = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(value) ? value : 0;
};

export const addStressTokens = (delta = 1) => {
  const nextValue = Math.max(0, getStressTokens() + delta);
  localStorage.setItem(TOKENS_KEY, String(nextValue));
  return nextValue;
};
