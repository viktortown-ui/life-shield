import { clampScore } from '../core/shield.js';

const STORAGE_KEY = 'life-shield-snapshot';

export const DEFAULT_SHIELD_TILES = [
  { id: 'money', label: 'Деньги', score: 6, description: 'Финансовый запас.' },
  { id: 'obligations', label: 'Обязательства', score: 5, description: 'Нагрузка и ответственность.' },
  { id: 'income', label: 'Доход', score: 7, description: 'Стабильность поступлений.' },
  { id: 'energy', label: 'Энергия', score: 6, description: 'Силы и восстановление.' },
  { id: 'support', label: 'Опора', score: 8, description: 'Люди и ресурсы.' },
  { id: 'flexibility', label: 'Гибкость', score: 5, description: 'Способность меняться.' },
];

const mergeTiles = (storedTiles = []) =>
  DEFAULT_SHIELD_TILES.map((tile) => {
    const stored = storedTiles.find((entry) => entry.id === tile.id);
    return {
      ...tile,
      score: clampScore(stored?.score ?? tile.score),
    };
  });

const parseStored = (raw) => {
  if (!raw) {
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { tiles: mergeTiles(parsed), snapshot: null };
    }
    if (parsed && Array.isArray(parsed.tiles)) {
      return { tiles: mergeTiles(parsed.tiles), snapshot: parsed.snapshot ?? null };
    }
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null };
  } catch (error) {
    console.warn('Не удалось прочитать снимок щита из хранилища', error);
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null };
  }
};

export const getShieldSnapshot = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return parseStored(raw).tiles;
};

export const getShieldSnapshotData = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return parseStored(raw).snapshot;
};

export const setShieldSnapshot = (tiles, snapshot = null) => {
  const payload = Array.isArray(tiles) ? tiles : DEFAULT_SHIELD_TILES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tiles: payload, snapshot }));
};
