// Local records contain scores only; answer text is never persisted.
function readPlayerProgress() {
  try {
    const value = JSON.parse(localStorage.getItem('carillion-records-v1'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function savePlayerResult(dayId, points) {
  const records = readPlayerProgress();
  const old = records[dayId];
  const previousBest = Number.isFinite(old?.best) ? old.best : null;
  const plays = Number.isSafeInteger(old?.plays) && old.plays >= 0 ? old.plays : 0;
  const result = { best: previousBest === null ? points : Math.max(points, previousBest), last: points, plays: plays + 1 };
  records[dayId] = result;
  let saved = true;
  try { localStorage.setItem('carillion-records-v1', JSON.stringify(records)); } catch { saved = false; }
  return { ...result, newBest: previousBest === null || points > previousBest, saved };
}
function playerRecordLabel(dayId) {
  const result = readPlayerProgress()[dayId];
  return Number.isFinite(result?.best) ? `Personal best: ${result.best} pts · ${result.plays || 1} completed` : 'Your next daily catch awaits';
}
