export const clampScore = (value, min = 0, max = 10) => {
  const next = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, next));
};

export const normalizeTiles = (tiles = []) =>
  tiles.map((tile) => ({
    ...tile,
    score: clampScore(tile.score),
  }));

export const calculateShieldTotal = (tiles = []) => {
  if (!tiles.length) {
    return 0;
  }
  const sum = tiles.reduce((acc, tile) => acc + clampScore(tile.score), 0);
  const maxTotal = tiles.length * 10;
  return Math.round((sum / maxTotal) * 100);
};

export const findWeakestTile = (tiles = []) => {
  if (!tiles.length) {
    return null;
  }
  return tiles.reduce((weakest, tile) => {
    if (!weakest) {
      return tile;
    }
    return clampScore(tile.score) < clampScore(weakest.score) ? tile : weakest;
  }, null)?.id ?? null;
};
