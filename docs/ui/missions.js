import { clampScore } from '../core/shield.js';
import { MISSIONS } from '../modules/missions/data.js';
import { RADAR_DOMAINS } from '../modules/radar/data.js';
import { getLatestRadarSnapshot } from '../storage/radar.js';
import { getShieldSnapshot, getShieldSnapshotData, setShieldSnapshot } from '../storage/shield.js';
import { getToneMode, onToneChange } from '../storage/tone.js';
import { getCopyData, pickLine } from './copy.js';
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

const getTargetDomains = (snapshot) => {
  if (!snapshot?.domainScores) {
    return [];
  }
  const entries = RADAR_DOMAINS.map((domain) => ({
    id: domain.id,
    score: snapshot.domainScores?.[domain.id]?.score ?? 0,
  }));
  const sorted = entries.sort((a, b) => a.score - b.score);
  return sorted.slice(0, 2).map((item) => item.id);
};

const getMissionPool = (targetDomains) => {
  const pool = MISSIONS.filter((mission) => targetDomains.includes(mission.domainId));
  return pool.length ? pool : MISSIONS;
};

const pickMissionForDate = (dateKey, targetDomains) => {
  const pool = getMissionPool(targetDomains);
  const key = `${dateKey}:${targetDomains.join('|')}`;
  const index = pool.length ? hashString(key) % pool.length : 0;
  return pool[index] ?? MISSIONS[0];
};

const buildMissionState = (dateKey, stored = {}, targetDomains = []) => {
  const xp = Number.isFinite(stored.xp) ? stored.xp : 0;
  const streak = Number.isFinite(stored.streak) ? stored.streak : 0;
  const lastCompletedDate = typeof stored.lastCompletedDate === 'string' ? stored.lastCompletedDate : null;
  const bonuses = stored.bonuses && typeof stored.bonuses === 'object' ? stored.bonuses : {};
  const mission = pickMissionForDate(dateKey, targetDomains);

  return {
    date: dateKey,
    missionId: mission.id,
    targetDomains,
    targetKey: targetDomains.join('|'),
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
  const latestRadar = getLatestRadarSnapshot();
  const targetDomains = getTargetDomains(latestRadar);
  const targetKey = targetDomains.join('|');
  if (!raw) {
    return buildMissionState(getDateKey(), {}, targetDomains);
  }
  try {
    const parsed = JSON.parse(raw);
    const today = getDateKey();
    if (!parsed || typeof parsed !== 'object') {
      return buildMissionState(today, {}, targetDomains);
    }
    if (parsed.date !== today || parsed.targetKey !== targetKey) {
      return buildMissionState(today, parsed, targetDomains);
    }
    return {
      ...buildMissionState(today, parsed, targetDomains),
      ...parsed,
    };
  } catch (error) {
    console.warn('Не удалось прочитать миссии дня', error);
    return buildMissionState(getDateKey(), {}, targetDomains);
  }
};

const saveMissionState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

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
  const pool = getMissionPool(state.targetDomains ?? []);
  const used = new Set(state.rerollHistory ?? []);
  const available = pool.filter((mission) => !used.has(mission.id));
  const finalPool = available.length ? available : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
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
  const why = screen.querySelector('[data-mission-why]');
  const line = screen.querySelector('[data-mission-line]');
  const xp = screen.querySelector('[data-mission-xp]');
  const streak = screen.querySelector('[data-mission-streak]');
  const status = screen.querySelector('[data-mission-status]');
  const rerolls = screen.querySelector('[data-mission-rerolls]');
  const completeButton = screen.querySelector('[data-mission-complete]');
  const rerollButton = screen.querySelector('[data-mission-reroll]');

  if (!title || !detail || !tile || !bonus || !why || !xp || !streak || !status || !rerolls || !completeButton || !rerollButton) {
    return;
  }

  let state = loadMissionState();

  const render = async () => {
    const mission = getMissionById(state.missionId);
    const bonusMeta = getBonusMeta(state, mission.tileId);
    const copyData = await getCopyData();
    const domainLabel = copyData?.radar?.domains?.[mission.domainId]?.label ?? mission.domainId ?? 'Домен';
    const whyCopy = copyData?.radar?.missionWhy ?? 'Почему эта миссия: поддержать домен «{domain}».';

    title.textContent = mission.title;
    detail.textContent = mission.detail;
    tile.textContent = `Домен: ${domainLabel}`;
    why.textContent = whyCopy.replace('{domain}', domainLabel);
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
    void render();
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
    void render();
    void updateLine(line);
  });

  void render();
  void updateLine(line);
  onToneChange(() => {
    void updateLine(line);
  });
};
