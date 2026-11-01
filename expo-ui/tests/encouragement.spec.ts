import { test, expect, type Page } from '@playwright/test';
import { words } from '../src/curriculum';
import { answerEncouragement, completedSessionEncouragement, progressEncouragement } from '../src/encouragement';
import { applyMasterySession, PROGRESS_STORAGE_KEY, type MasteryRecord } from '../src/mastery';
import { installSpeechMock } from './helpers/speech';

const group = words.filter(word => word.level === 1);
const record = (wordId: string, count = 2): MasteryRecord => ({ wordId, consecutiveCorrect: count, mastered: count === 2, lastSessionId: 'seed', lastPracticedAt: 1 });
const summary = (before: MasteryRecord[], after: MasteryRecord[], overrides = {}) => completedSessionEncouragement({ before, after, correct: 20, total: 20, reviews: 0, assessment: false, ...overrides });

test('home distinguishes practice from mastery and derives the next milestone from saved words', () => {
  expect(progressEncouragement([])).toMatchObject({ mastered: 0, nextMilestone: 10 });
  const practiced = progressEncouragement([record(group[0].id, 1)]);
  expect(practiced.mastered).toBe(0);
  expect(practiced.body).toContain('1語に取り組めた');
  const nine = group.slice(0, 9).map(word => record(word.id));
  expect(progressEncouragement([...nine, nine[0]])).toMatchObject({ mastered: 9, nextMilestone: 10 });
  expect(progressEncouragement([...nine, record(group[9].id)])).toMatchObject({ mastered: 10, nextMilestone: 25 });
});

test('answer praise follows progress, streaks and review without calling mistakes correct', () => {
  const answer = { correct: true, streak: 3, answered: 3, total: 20, review: false, extraReview: false };
  expect(answerEncouragement(answer)).toContain('3問連続正解');
  expect(answerEncouragement({ ...answer, correct: false })).not.toContain('正解');
  expect(answerEncouragement({ ...answer, streak: 1, answered: 5 })).toContain('5問進めた');
  expect(answerEncouragement({ ...answer, correct: false, streak: 0, answered: 10 })).toContain('半分');
  expect(answerEncouragement({ ...answer, streak: 1, answered: 15 })).toContain('15問進めた');
  expect(answerEncouragement({ ...answer, review: true })).toContain('復習で正解');
  expect(answerEncouragement({ ...answer, streak: 1, answered: 25, extraReview: true })).not.toContain('25問進めた');
});

test('results praise only newly mastered words and report the actual cumulative count at milestones', () => {
  const before = group.map((word, i) => record(word.id, i < 9 ? 2 : i < 29 ? 1 : 0));
  const after = applyMasterySession(before, group.slice(9, 29).map(word => ({ wordId: word.id, correct: true })), 'finished');
  expect(summary(before, after)).toMatchObject({ title: '累計29語の習得、おめでとう！' });
  expect(summary(before, after).body).toContain('新しく20語を習得');
  expect(summary(after, after).body).not.toContain('新しく');
  const firstSet = applyMasterySession([], [{ wordId: group[0].id, correct: true }], 'first');
  expect(summary([], firstSet).body).not.toContain('習得');
});

test('80 percent level celebrations remain distinct from all-word mastery', () => {
  const before = group.slice(0, 95).map(word => record(word.id));
  before.push(record(group[95].id, 1));
  const after = applyMasterySession(before, [{ wordId: group[95].id, correct: true }], 'level-up');
  expect(summary(before, after).title).toContain('レベル1で8割習得');
  expect(summary(before, after).title).not.toContain('ぜんぶ');
  const eightyPercent = Array.from({ length: 10 }, (_, i) => words.filter(word => word.level === i + 1).slice(0, 96)).flat().map(word => record(word.id));
  expect(progressEncouragement(eightyPercent)).toMatchObject({ mastered: 960, nextMilestone: 1000 });
  expect(progressEncouragement(eightyPercent).title).not.toContain('ぜんぶ');
  const almostAll = words.map((word, i) => record(word.id, i === words.length - 1 ? 1 : 2));
  const all = applyMasterySession(almostAll, [{ wordId: words.at(-1)!.id, correct: true }], 'last');
  expect(summary(almostAll, all).title).toContain('1,200語をすべて習得');
  expect(progressEncouragement(all)).toMatchObject({ mastered: 1200, nextMilestone: undefined });
});

test('effort, review and assessment are praised without inventing mastery or scores', () => {
  expect(summary([], [], { correct: 0 }).title).toBe('20問やりきったね！');
  expect(summary([], [], { correct: 0 }).body).not.toContain('習得');
  expect(summary([], [], { correct: 19, reviews: 1 }).title).toContain('1語の復習で正解');
  const assessment = summary([], group.map(word => record(word.id)), { correct: 0, total: 10, assessment: true });
  expect(assessment.title).toContain('10問の実力チェック、やりきった');
  expect(assessment.body).not.toContain('習得');
});

async function begin(page: Page) {
  await installSpeechMock(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
}

async function checkAnswer(page: Page, incorrect = false) {
  const id = (await page.getByTestId(/^question-word-/).getAttribute('data-testid'))!.slice('question-'.length);
  const word = words.find(word => word.id === id)!;
  const input = page.getByRole('textbox', { name: '解答', exact: true });
  if (await input.count()) await input.fill(incorrect ? 'wrong-answer' : word.word);
  else if (incorrect) {
    const labels = await page.getByRole('button').filter({ hasNotText: /ヒント|答え合わせ|中断/ }).allTextContents();
    await page.getByRole('button', { name: labels.find(label => label !== word.meaning)!, exact: true }).click();
  } else await page.getByRole('button', { name: word.meaning, exact: true }).click();
  await page.getByRole('button', { name: '答え合わせ', exact: true }).click();
  await expect(page.getByTestId('answer-encouragement')).toBeVisible();
  const button = page.getByRole('button', { name: /^(次へ →|結果を見る)$/ });
  const bounds = await button.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
  if (incorrect) await page.getByRole('button', { name: word.meaning, exact: true }).click();
  return { word, button };
}

test('saved progress, streaks and new mastery are celebrated and survive reload', async ({ page }) => {
  const records = group.map((word, i) => record(word.id, i < 9 ? 2 : i < 29 ? 1 : 0));
  await page.addInitScript(({ key, records }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, curriculum: 'levels-v1', records }));
    Math.random = () => .999999;
  }, { key: PROGRESS_STORAGE_KEY, records });
  await begin(page);
  const home = page.getByTestId('home-encouragement');
  await expect(home).toContainText('9語を習得');
  await expect(home).toContainText('10語まであと1語');
  await page.screenshot({ path: 'artifacts/mobile-encouragement-home.png', fullPage: true });
  await page.getByRole('button', { name: '今日の学習をはじめる →', exact: true }).click();
  for (let i = 0; i < 20; i++) {
    const { word, button } = await checkAnswer(page);
    if (i === 2) await expect(page.getByTestId('answer-encouragement')).toContainText('3問連続正解');
    if (i === 4) await expect(page.getByTestId('answer-encouragement')).toContainText('5問連続正解');
    await button.click();
    await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  }
  await expect(page.getByTestId('result-encouragement')).toContainText('累計29語の習得');
  await expect(page.getByTestId('result-encouragement')).toContainText('新しく20語を習得');
  await page.screenshot({ path: 'artifacts/mobile-encouragement-result.png', fullPage: true });
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.filter((r: MasteryRecord) => r.mastered).length, PROGRESS_STORAGE_KEY)).toBe(29);
  await page.reload();
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
  await expect(home).toContainText('29語を習得');
  await expect(home).toContainText('50語まであと21語');
  await expect(page.getByRole('progressbar', { name: '英単語の習得状況' })).toHaveAttribute('aria-valuenow', '29');
  await page.getByRole('tab', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: '検証データを初期化', exact: true }).click();
  await page.getByRole('tab', { name: 'ホーム', exact: true }).click();
  await expect(home).toContainText('最初の1問');
  await expect(home).toContainText('10語まであと10語');
});

test('a mistake resets the streak while progress and later review still earn encouragement', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: '今日の学習をはじめる →', exact: true }).click();
  for (let i = 0; i < 21; i++) {
    const { word, button } = await checkAnswer(page, i === 0);
    const praise = page.getByTestId('answer-encouragement');
    if (i === 0) await expect(praise).toContainText('答えを確かめた');
    if (i === 3) await expect(praise).toContainText('3問連続正解');
    if (i === 4) await expect(praise).toContainText('5問進めた');
    if (i === 9) await expect(praise).toContainText('半分');
    if (i === 20) await expect(praise).toContainText('復習で正解');
    await button.click();
    await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  }
  await expect(page.getByTestId('result-encouragement')).toContainText('1語の復習で正解');
  await expect(page.getByTestId('result-encouragement')).not.toContainText('習得');
  await expect(page.getByText(/^19\s*\/\s*20\s*問$/)).toBeVisible();
});
