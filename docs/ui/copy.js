import { getToneMode, onToneChange } from '../storage/tone.js';

const COPY_PATH = 'assets/copy/ru.json';
const lastPick = new Map();

let cachedCopy = null;

const loadCopy = async () => {
  if (cachedCopy) {
    return cachedCopy;
  }
  const response = await fetch(COPY_PATH);
  cachedCopy = await response.json();
  return cachedCopy;
};

export const getCopyData = async () => {
  return loadCopy();
};

export const pickLine = async (listName, toneMode) => {
  const data = await loadCopy();
  const list = Array.isArray(data[listName]) ? data[listName] : [];
  const filtered = list.filter((item) => item.tone === toneMode);
  const pool = filtered.length ? filtered : list;
  if (!pool.length) {
    return '';
  }

  const key = `${listName}:${toneMode}`;
  const last = lastPick.get(key);
  let next = pool[Math.floor(Math.random() * pool.length)];

  if (pool.length > 1) {
    while (next.text === last) {
      next = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  lastPick.set(key, next.text);
  return next.text;
};

const applyCopy = async (toneMode) => {
  const elements = document.querySelectorAll('[data-copy]');
  await Promise.all(
    Array.from(elements).map(async (element) => {
      const listName = element.dataset.copy;
      const text = await pickLine(listName, toneMode);
      if (text) {
        element.textContent = text;
      }
    })
  );
};

export const initCopy = () => {
  const toneMode = getToneMode();
  void applyCopy(toneMode);
  onToneChange((nextTone) => {
    void applyCopy(nextTone);
  });
};
