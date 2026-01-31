import { calculateShieldTotal, clampScore } from '../core/shield.js';

const STORAGE_KEY = 'life-shield-snapshot';
const MAX_HISTORY = 24;

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

const buildHistoryEntry = (tiles, snapshot) => ({
  createdAt: snapshot?.createdAt ?? new Date().toISOString(),
  total: calculateShieldTotal(tiles),
  tiles: tiles.map((tile) => ({
    id: tile.id,
    label: tile.label,
    score: clampScore(tile.score),
  })),
});

const normalizeHistoryEntry = (entry) => {
  if (!entry || !Array.isArray(entry.tiles)) {
    return null;
  }
  const labelMap = new Map(DEFAULT_SHIELD_TILES.map((tile) => [tile.id, tile.label]));
  const tiles = entry.tiles.map((tile) => ({
    id: tile.id,
    label: tile.label ?? labelMap.get(tile.id) ?? 'Сфера',
    score: clampScore(tile.score),
  }));
  return {
    createdAt: entry.createdAt ?? null,
    total: Number.isFinite(entry.total) ? entry.total : calculateShieldTotal(tiles),
    tiles,
  };
};

const parseStored = (raw) => {
  if (!raw) {
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null, history: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { tiles: mergeTiles(parsed), snapshot: null, history: [] };
    }
    if (parsed && Array.isArray(parsed.tiles)) {
      const history = Array.isArray(parsed.history)
        ? parsed.history.map(normalizeHistoryEntry).filter(Boolean)
        : [];
      return { tiles: mergeTiles(parsed.tiles), snapshot: parsed.snapshot ?? null, history };
    }
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null, history: [] };
  } catch (error) {
    console.warn('Не удалось прочитать снимок щита из хранилища', error);
    return { tiles: DEFAULT_SHIELD_TILES, snapshot: null, history: [] };
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

export const getShieldHistory = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const stored = parseStored(raw);
  if ((!stored.history || !stored.history.length) && stored.snapshot) {
    return [buildHistoryEntry(stored.tiles, stored.snapshot)];
  }
  return stored.history;
};

export const setShieldSnapshot = (tiles, snapshot = null) => {
  const payload = Array.isArray(tiles) ? tiles : DEFAULT_SHIELD_TILES;
  const stored = parseStored(localStorage.getItem(STORAGE_KEY));
  const historyEntry =
    snapshot && Array.isArray(payload) ? buildHistoryEntry(payload, snapshot) : null;
  const nextHistory = historyEntry
    ? [historyEntry, ...(stored.history ?? [])].slice(0, MAX_HISTORY)
    : stored.history ?? [];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ tiles: payload, snapshot, history: nextHistory })
  );
};
