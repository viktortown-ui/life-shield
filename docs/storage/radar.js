const STORAGE_KEY = 'life-shield-radar-snapshots';
const MAX_SNAPSHOTS = 50;
const VERSION = 'radar-v1';

const safeParse = (value) => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Не удалось прочитать снимки радара', error);
    return [];
  }
};

export const getRadarSnapshots = () => {
  return safeParse(localStorage.getItem(STORAGE_KEY));
};

export const getLatestRadarSnapshot = () => {
  const snapshots = getRadarSnapshots();
  return snapshots[0] ?? null;
};

export const saveRadarSnapshot = (snapshot) => {
  const existing = getRadarSnapshots();
  const next = [
    {
      version: VERSION,
      ...snapshot,
    },
    ...existing,
  ];
  const trimmed = next.slice(0, MAX_SNAPSHOTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const RADAR_STORAGE_VERSION = VERSION;
