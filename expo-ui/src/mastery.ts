import { levels, words } from './curriculum';

export const PROGRESS_STORAGE_KEY = 'kotoba:mastery:v1';
export const MASTERY_THRESHOLD = 2;
export const WORDS_PER_LEVEL = 120;
export type MasteryRecord = { wordId: string; consecutiveCorrect: number; mastered: boolean; lastSessionId: string; lastPracticedAt: number };
export type PracticeResult = {wordId: string; correct: boolean};
const byId = new Map(words.map(w => [w.id,w]));

export function levelProgress(records: readonly MasteryRecord[]) {
  const mastered = new Set(records.filter(r => r.mastered).map(r => r.wordId));
  return levels.map(level => {
    const count = words.filter(w => w.level === level.level && mastered.has(w.id)).length;
    return {...level, mastered: count, total: WORDS_PER_LEVEL, complete: count === WORDS_PER_LEVEL};
  });
}
export function currentLevel(records: readonly MasteryRecord[]): number {
  return levelProgress(records).find(level => !level.complete)?.level ?? levels.length;
}

// Only a completed set's initial answers count. Corrections and repeat taps cannot
// earn a second success in the same set. Previously unlocked levels stay unlocked.
export function applyMasterySession(records: readonly MasteryRecord[], answers: readonly PracticeResult[], sessionId: string, now = Date.now()): MasteryRecord[] {
  if (!sessionId) return [...records];
  const active = currentLevel(records);
  const next = new Map(records.map(r => [r.wordId,r]));
  const processed = new Set<string>();
  for (const {wordId, correct} of answers) {
    const word = byId.get(wordId);
    if (!word || word.level > active || processed.has(wordId)) continue;
    processed.add(wordId);
    const old = next.get(wordId);
    if (old?.lastSessionId === sessionId) continue;
    const consecutiveCorrect = old?.mastered ? MASTERY_THRESHOLD : correct ? (old?.consecutiveCorrect || 0) + 1 : 0;
    next.set(wordId, {wordId, consecutiveCorrect, mastered: consecutiveCorrect >= MASTERY_THRESHOLD, lastSessionId: sessionId, lastPracticedAt: now});
  }
  return [...next.values()];
}

export function decodeMastery(raw: string | null): MasteryRecord[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('curriculum' in value) || value.curriculum !== 'levels-v1' || !('records' in value) || !Array.isArray(value.records)) throw new Error('Invalid mastery history');
  const unique = new Map<string,MasteryRecord>();
  for (const r of value.records) {
    if (!r || !byId.has(r.wordId) || !Number.isInteger(r.consecutiveCorrect) || r.consecutiveCorrect < 0 || r.consecutiveCorrect > MASTERY_THRESHOLD || typeof r.mastered !== 'boolean' || r.mastered !== (r.consecutiveCorrect >= MASTERY_THRESHOLD) || typeof r.lastSessionId !== 'string' || !r.lastSessionId || !Number.isFinite(r.lastPracticedAt) || r.lastPracticedAt < 0) continue;
    unique.set(r.wordId, {wordId:r.wordId,consecutiveCorrect:r.consecutiveCorrect,mastered:r.mastered,lastSessionId:r.lastSessionId,lastPracticedAt:r.lastPracticedAt});
  }
  return [...unique.values()];
}
