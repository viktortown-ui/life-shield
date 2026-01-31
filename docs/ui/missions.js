import { clampScore } from '../core/shield.js';
import { MISSIONS } from '../modules/missions/data.js';
import { getShieldSnapshot, getShieldSnapshotData, setShieldSnapshot, DEFAULT_SHIELD_TILES } from '../storage/shield.js';
import { getToneMode, onToneChange } from '../storage/tone.js';
import { pickLine } from './copy.js';
import { renderShield } from './shield.js';

const STORAGE_KEY = 'life-shield-mission-state';
const REROLL_LIMIT = 3;
const BONUS_BASE = 0.4;
const BONUS_DECAY = 0.6;
const BONUS_CAP = 1.5;

const getDateKey = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const parseDateKey = (value) => {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const isYesterday = (previousKey, currentKey) => {
  const previousDate = parseDateKey(previousKey);
  const currentDate = parseDateKey(currentKey);
  if (!previousDate || !currentDate) {
    return false;
  }
  const diff = currentDate.getTime() - previousDate.getTime();
  return diff >= 86400000 && diff < 172800000;
};

const hashString = (value) =>
  Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);

const getMissionById = (id) => MISSIONS.find((mission) => mission.id === id) ?? MISSIONS[0];

const pickMissionForDate = (dateKey) => {
  const index = hashString(dateKey) % MISSIONS.length;
  return MISSIONS[index];
};

const buildMissionState = (dateKey, stored = {}) => {
  const xp = Number.isFinite(stored.xp) ? stored.xp : 0;
  const streak = Number.isFinite(stored.streak) ? stored.streak : 0;
  const lastCompletedDate = typeof stored.lastCompletedDate === 'string' ? stored.lastCompletedDate : null;
  const bonuses = stored.bonuses && typeof stored.bonuses === 'object' ? stored.bonuses : {};
  const mission = pickMissionForDate(dateKey);

  return {
    date: dateKey,
    missionId: mission.id,
    rerollsUsed: 0,
    rerollHistory: [mission.id],
    completed: false,
    xp,
    streak,
    lastCompletedDate,
    bonuses,
  };
};

const loadMissionState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return buildMissionState(getDateKey());
  }
  try {
    const parsed = JSON.parse(raw);
    const today = getDateKey();
    if (!parsed || typeof parsed !== 'object') {
      return buildMissionState(today);
    }
    if (parsed.date !== today) {
      return buildMissionState(today, parsed);
    }
    return {
      ...buildMissionState(today, parsed),
      ...parsed,
    };
  } catch (error) {
    console.warn('Не удалось прочитать миссии дня', error);
    return buildMissionState(getDateKey());
  }
};

const saveMissionState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getTileLabel = (tileId) =>
  DEFAULT_SHIELD_TILES.find((tile) => tile.id === tileId)?.label ?? 'Плитка';

const getBonusMeta = (state, tileId) => {
  const stored = state.bonuses?.[tileId] ?? { total: 0, count: 0 };
  const count = Number.isFinite(stored.count) ? stored.count : 0;
  const total = Number.isFinite(stored.total) ? stored.total : 0;
  const increment = BONUS_BASE * Math.pow(BONUS_DECAY, count);
  const available = Math.max(0, BONUS_CAP - total);
  const applied = Math.max(0, Math.min(available, increment));
  return {
    total,
    count,
    applied,
    nextTotal: total + applied,
  };
};

const applyBonusToShield = (tileId, applied) => {
  if (applied <= 0) {
    return;
  }
  const tiles = getShieldSnapshot();
  const snapshot = getShieldSnapshotData();
  const updatedTiles = tiles.map((tile) => {
    if (tile.id !== tileId) {
      return tile;
    }
    return {
      ...tile,
      score: clampScore(tile.score + applied),
    };
  });
  setShieldSnapshot(updatedTiles, snapshot);
  renderShield();
};

const applyCompletion = (state, mission) => {
  const today = getDateKey();
  if (state.completed) {
    return state;
  }
  const xpGain = Number.isFinite(mission.xp) ? mission.xp : 10;
  const nextState = { ...state };
  nextState.xp += xpGain;

  if (isYesterday(nextState.lastCompletedDate, today)) {
    nextState.streak += 1;
  } else if (nextState.lastCompletedDate !== today) {
    nextState.streak = 1;
  }
  nextState.lastCompletedDate = today;
  nextState.completed = true;

  const bonusMeta = getBonusMeta(nextState, mission.tileId);
  if (bonusMeta.applied > 0) {
    const current = nextState.bonuses?.[mission.tileId] ?? { total: 0, count: 0 };
    nextState.bonuses = {
      ...nextState.bonuses,
      [mission.tileId]: {
        total: Number(current.total ?? 0) + bonusMeta.applied,
        count: Number(current.count ?? 0) + 1,
      },
    };
    applyBonusToShield(mission.tileId, bonusMeta.applied);
  }
  return nextState;
};

const pickRerollMission = (state) => {
  const used = new Set(state.rerollHistory ?? []);
  const available = MISSIONS.filter((mission) => !used.has(mission.id));
  const pool = available.length ? available : MISSIONS;
  return pool[Math.floor(Math.random() * pool.length)];
};

const updateLine = async (lineElement) => {
  if (!lineElement) {
    return;
  }
  const toneMode = getToneMode();
  const text = await pickLine('missionLines', toneMode);
  if (text) {
    lineElement.textContent = text;
  }
};

export const initMissions = () => {
  const screen = document.querySelector('[data-screen="missions"]');
  if (!screen) {
    return;
  }

  const title = screen.querySelector('[data-mission-title]');
  const detail = screen.querySelector('[data-mission-detail]');
  const tile = screen.querySelector('[data-mission-tile]');
  const bonus = screen.querySelector('[data-mission-bonus]');
  const line = screen.querySelector('[data-mission-line]');
  const xp = screen.querySelector('[data-mission-xp]');
  const streak = screen.querySelector('[data-mission-streak]');
  const status = screen.querySelector('[data-mission-status]');
  const rerolls = screen.querySelector('[data-mission-rerolls]');
  const completeButton = screen.querySelector('[data-mission-complete]');
  const rerollButton = screen.querySelector('[data-mission-reroll]');

  if (!title || !detail || !tile || !bonus || !xp || !streak || !status || !rerolls || !completeButton || !rerollButton) {
    return;
  }

  let state = loadMissionState();

  const render = () => {
    const mission = getMissionById(state.missionId);
    const bonusMeta = getBonusMeta(state, mission.tileId);
    title.textContent = mission.title;
    detail.textContent = mission.detail;
    tile.textContent = `Плитка: ${getTileLabel(mission.tileId)}`;
    bonus.textContent = `Бонус: +${bonusMeta.applied.toFixed(1)} (итого +${bonusMeta.nextTotal.toFixed(1)}/${BONUS_CAP})`;
    xp.textContent = state.xp.toString();
    streak.textContent = state.streak.toString();

    if (state.completed) {
      status.textContent = 'Сегодня выполнено';
      completeButton.textContent = 'Выполнено';
      completeButton.disabled = true;
    } else {
      status.textContent = `Награда: +${mission.xp ?? 10} XP`;
      completeButton.textContent = 'Выполнить';
      completeButton.disabled = false;
    }

    const remaining = Math.max(0, REROLL_LIMIT - (state.rerollsUsed ?? 0));
    rerolls.textContent = `Рероллы: ${remaining}/${REROLL_LIMIT}`;
    rerollButton.disabled = remaining === 0 || state.completed;
  };

  completeButton.addEventListener('click', () => {
    if (state.completed) {
      return;
    }
    const mission = getMissionById(state.missionId);
    state = applyCompletion(state, mission);
    saveMissionState(state);
    render();
    void updateLine(line);
  });

  rerollButton.addEventListener('click', () => {
    const used = Number.isFinite(state.rerollsUsed) ? state.rerollsUsed : 0;
    if (used >= REROLL_LIMIT || state.completed) {
      return;
    }
    const nextMission = pickRerollMission(state);
    state = {
      ...state,
      missionId: nextMission.id,
      completed: false,
      rerollsUsed: used + 1,
      rerollHistory: [...(state.rerollHistory ?? []), nextMission.id],
    };
    saveMissionState(state);
    render();
    void updateLine(line);
  });

  render();
  void updateLine(line);
  onToneChange(() => {
    void updateLine(line);
  });
};
