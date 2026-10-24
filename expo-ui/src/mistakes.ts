import { words } from './curriculum';

export const MISTAKES_STORAGE_KEY = 'kotoba:mistakes:v1';
export type MistakeRecord = { wordId: string; misses: number; lastWrongAt: number; lastReviewedAt: number };
const validIds = new Set(words.map(w => w.id));

export function decodeMistakes(raw: string | null): MistakeRecord[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('records' in value) || !Array.isArray(value.records)) throw new Error('Invalid mistake history');
  const unique = new Map<string, MistakeRecord>();
  for (const row of value.records) {
    if (!row || !validIds.has(row.wordId) || !Number.isInteger(row.misses) || row.misses < 1 || !Number.isFinite(row.lastWrongAt) || !Number.isFinite(row.lastReviewedAt)) continue;
    unique.set(row.wordId, {wordId: row.wordId, misses: row.misses, lastWrongAt: row.lastWrongAt, lastReviewedAt: row.lastReviewedAt});
  }
  return [...unique.values()];
}

export function recordPracticeAnswer(records: MistakeRecord[], wordId: string, correct: boolean, now = Date.now()): MistakeRecord[] {
  const previous = records.find(r => r.wordId === wordId);
  if (!previous && correct) return records;
  const updated = { wordId, misses: (previous?.misses || 0) + (correct ? 0 : 1), lastWrongAt: correct ? previous!.lastWrongAt : now, lastReviewedAt: now };
  return [...records.filter(r => r.wordId !== wordId), updated];
}

export function priorityMistakes(records: readonly MistakeRecord[], count: number): string[] {
  return [...new Map(records.filter(r => validIds.has(r.wordId)).map(r => [r.wordId, r])).values()]
    .sort((a,b) => a.lastReviewedAt - b.lastReviewedAt || b.misses - a.misses || b.lastWrongAt - a.lastWrongAt || a.wordId.localeCompare(b.wordId))
    .slice(0, count).map(r => r.wordId);
}
