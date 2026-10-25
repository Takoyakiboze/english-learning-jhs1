import { maskExample, words, type Word } from './curriculum';
import { priorityMistakes, type MistakeRecord } from './mistakes';
import { currentLevel, type MasteryRecord } from './mastery';
export { maskExample, words } from './curriculum';

export const SESSION_SIZE = 20;
export const REVIEW_QUOTA = 5;
export const EARLIER_REVIEW_QUOTA = 5;
export const ASSESSMENT_SIZE = 10;

export type Question = Word & {
  prompt: string; answer: string; type: 'choice' | 'spell' | 'blank';
  options?: string[]; review?: boolean; fromMistake?: boolean; fromEarlierLevel?: boolean; acceptedAnswers: string[];
};
export const normalize = (s: string) => s.trim().toLowerCase();
export const isCorrectAnswer = (q: Question, value: string) => q.acceptedAnswers.some(a => normalize(a) === normalize(value));

export function questionHint(q: Question): string {
  if (q.type === 'choice') {
    // Categories such as 「人・仕事」 or 「家・日用品」 can themselves expose a short answer.
    const clues = [
      `品詞：${q.partOfSpeech}`,
      `分野：${q.category}`,
    ].filter(clue => !clue.includes(q.answer));
    return clues.join(' ／ ') || '選択肢をもう一度見比べてみよう。';
  }
  if (q.answer.length === 1) return 'アルファベット1文字の単語だよ';
  return `「${q.answer[0]}」で始まる${q.answer.length}文字の単語だよ`;
}

function shuffle<T>(items: T[], random: () => number): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function makeQuestions(selected: Word[], random: () => number, pool = words): Question[] {
  return selected.map((w, i) => {
    const type = i % 3 === 0 ? 'choice' : i % 3 === 1 ? 'spell' : 'blank';
    const answer = type === 'choice' ? w.meaning : w.word;
    // Synonyms with exactly the same registered meaning are also valid for spelling.
    const acceptedAnswers = type === 'spell' ? pool.filter(x => x.meaning === w.meaning).map(x => x.word) : [answer];
    const distractors = Array.from(new Set(pool.filter(x => x.meaning !== w.meaning).map(x => x.meaning)));
    return {
      ...w, type, answer, acceptedAnswers,
      prompt: type === 'choice' ? w.word : type === 'spell' ? w.meaning : maskExample(w.example, w.word),
      options: type === 'choice' ? shuffle([w.meaning, ...shuffle(distractors, random).slice(0, 3)], random) : undefined,
    };
  });
}

export function buildQuestions(count: number, random = Math.random, pool = words): Question[] {
  return makeQuestions(shuffle(pool, random).slice(0, count), random, pool);
}

export function buildLearningSession(records: readonly MistakeRecord[], random = Math.random, mastery: readonly MasteryRecord[] = []): Question[] {
  const active = currentLevel(mastery);
  const pool = words.filter(w => w.level <= active);
  const eligible = new Set(pool.map(w => w.id));
  const history = records.filter(r => eligible.has(r.wordId));
  const priority = new Set(priorityMistakes(history, REVIEW_QUOTA));
  const allMistakes = new Set(history.map(r => r.wordId));
  const byId = new Map(mastery.map(r => [r.wordId,r]));
  const reviewWords = pool.filter(w => priority.has(w.id));
  const pending = (candidates: Word[]) => shuffle(candidates, random)
    .sort((a,b) => Number(allMistakes.has(a.id)) - Number(allMistakes.has(b.id)) || (byId.get(a.id)?.lastPracticedAt || 0) - (byId.get(b.id)?.lastPracticedAt || 0));
  const earlier = pending(pool.filter(w => w.level < active && !byId.get(w.id)?.mastered && !priority.has(w.id)))
    .slice(0, EARLIER_REVIEW_QUOTA);
  const used = new Set([...reviewWords, ...earlier].map(w => w.id));
  const ordinary = pending(pool.filter(w => w.level === active && !byId.get(w.id)?.mastered && !used.has(w.id)))
    .slice(0, SESSION_SIZE - used.size);
  ordinary.forEach(w => used.add(w.id));
  // Keep filling with unmastered words, including earlier levels after level 10.
  const remaining = pending(pool.filter(w => !byId.get(w.id)?.mastered && !used.has(w.id)))
    .slice(0, SESSION_SIZE - used.size);
  remaining.forEach(w => used.add(w.id));
  const extra = shuffle(pool.filter(w => !used.has(w.id)), random).slice(0, SESSION_SIZE - used.size);
  return makeQuestions(shuffle([...reviewWords, ...earlier, ...ordinary, ...remaining, ...extra], random), random, pool)
    .map(q => ({...q, fromMistake: allMistakes.has(q.id), fromEarlierLevel: q.level < active && !byId.get(q.id)?.mastered}));
}
