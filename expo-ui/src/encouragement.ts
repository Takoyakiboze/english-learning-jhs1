import { words } from './curriculum';
import { currentLevel, levelProgress, type MasteryRecord } from './mastery';

export type Encouragement = { title: string; body: string };
export type ProgressEncouragement = Encouragement & { mastered: number; total: number; nextMilestone?: number };
export const MASTERY_MILESTONES = [10, 25, 50, 100, 200, 300, 500, 750, 1000, words.length];
const wordIds = new Set(words.map(word => word.id));
const masteredIds = (records: readonly MasteryRecord[]) => new Set(records.filter(r => r.mastered && wordIds.has(r.wordId)).map(r => r.wordId));

export function progressEncouragement(records: readonly MasteryRecord[]): ProgressEncouragement {
  const mastered = masteredIds(records).size;
  const practiced = new Set(records.filter(r => wordIds.has(r.wordId)).map(r => r.wordId)).size;
  const progress = { mastered, total: words.length, nextMilestone: MASTERY_MILESTONES.find(n => n > mastered) };
  if (mastered === words.length) return { ...progress, title: '1,200語、ぜんぶ習得！', body: 'ここまで積み重ねた練習、すばらしいね。復習で力を育てていこう。' };
  if (mastered > 0) return {
    ...progress, title: `${mastered.toLocaleString()}語を習得！一歩ずつ進んでいるね。`,
    body: currentLevel(records) > 1 ? `レベル${currentLevel(records)}まで進めたね。前に学んだ単語も大切にしていこう。` : 'くり返し取り組んだ成果だね。自分のペースで、次の一語へ。',
  };
  return practiced > 0
    ? { ...progress, title: '練習を積み重ねているね！', body: `これまで${practiced}語に取り組めたよ。くり返しの練習が、覚える力になるよ。` }
    : { ...progress, title: '最初の1問が、大きな一歩。', body: '自分のペースで、一緒に覚えていこう。' };
}

type AnswerProgress = { correct: boolean; streak: number; answered: number; total: number; review: boolean; extraReview: boolean };
export function answerEncouragement({ correct, streak, answered, total, review, extraReview }: AnswerProgress): string {
  if (correct && review) return '復習で正解！練習が実ったね。';
  if (correct && [3, 5, 10, 15, 20].includes(streak)) return `${streak}問連続正解！いい調子！`;
  if (!extraReview && answered === total) return `${total}問に取り組めたね！`;
  if (!extraReview && answered === total / 2) return '半分まで進めたね！ひとつずつ。';
  if (!extraReview && answered % 5 === 0) return `${answered}問進めたね！自分のペースで。`;
  if (!correct) return '答えを確かめたね。次につなげよう。';
  return ['よく思い出せたね！', 'ひとつ、できたね！', 'その調子で、少しずつ。'][answered % 3];
}

type SessionProgress = {
  before: readonly MasteryRecord[]; after: readonly MasteryRecord[];
  correct: number; total: number; reviews: number; assessment: boolean;
};
export function completedSessionEncouragement(p: SessionProgress): Encouragement {
  if (p.assessment) return {
    title: `${p.total}問の実力チェック、やりきったね！`,
    body: p.correct > 0 ? `${p.correct}問正解できたよ。得意なところも、練習したいところも見つける一歩だね。` : '答えを確かめるところまで取り組めたね。ここから少しずつ覚えていこう。',
  };
  const before = masteredIds(p.before), after = masteredIds(p.after);
  const gained = [...after].filter(id => !before.has(id)).length;
  const oldLevels = levelProgress(p.before), newLevels = levelProgress(p.after);
  const advanced = newLevels.find((level, i) => level.advanceReady && !oldLevels[i].advanceReady);
  const completed = newLevels.find((level, i) => level.complete && !oldLevels[i].complete);
  const milestone = MASTERY_MILESTONES.filter(n => before.size < n && after.size >= n).at(-1);
  let title: string;
  if (after.size === words.length && before.size < words.length) title = '1,200語をすべて習得！大きな積み重ねだね！';
  else if (advanced) title = `レベル${advanced.level}で8割習得！おめでとう！`;
  else if (completed) title = `レベル${completed.level}の120語、ぜんぶ習得！`;
  else if (milestone) title = `累計${after.size.toLocaleString()}語の習得、おめでとう！`;
  else if (gained > 0) title = `新しく${gained}語を習得！練習の成果だね。`;
  else if (p.reviews > 0) title = `${p.reviews}語の復習で正解できたね！`;
  else if (p.correct === p.total) title = `${p.total}問ぜんぶ正解！よく思い出せたね！`;
  else title = `${p.total}問やりきったね！`;
  const details: string[] = [];
  if (gained > 0) details.push(`このセットで新しく${gained}語を習得。`);
  if (p.reviews > 0) details.push(`${p.reviews}語の復習で正解できたよ。`);
  details.push(gained > 0 ? 'くり返し学んだ力が、ちゃんと育っているね。' : '最後まで取り組んだ練習を、次の一歩につなげよう。');
  return { title, body: details.join('') };
}
