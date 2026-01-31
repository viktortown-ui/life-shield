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
    return DEFAULT_SHIELD_TILES;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return mergeTiles(parsed);
    }
    if (parsed && Array.isArray(parsed.tiles)) {
      return mergeTiles(parsed.tiles);
    }
    return DEFAULT_SHIELD_TILES;
  } catch (error) {
    console.warn('Не удалось прочитать снимок щита из хранилища', error);
    return DEFAULT_SHIELD_TILES;
  }
};

export const getShieldSnapshot = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return parseStored(raw);
};

export const setShieldSnapshot = (tiles) => {
  const payload = Array.isArray(tiles) ? tiles : DEFAULT_SHIELD_TILES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tiles: payload }));
};
