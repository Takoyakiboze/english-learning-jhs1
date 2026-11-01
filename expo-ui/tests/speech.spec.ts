import { test, expect, type Page } from '@playwright/test';
import { words } from '../src/learning';
import { version } from '../package.json';
import { installSpeechMock } from './helpers/speech';

async function begin(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('app-version')).toHaveText(`v${version}`);
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
  await page.getByRole('button', { name: '今日の学習をはじめる →', exact: true }).click();
  await expect(page.getByTestId(/^question-word-/)).toBeVisible();
}

async function currentWord(page: Page) {
  const id = (await page.getByTestId(/^question-word-/).getAttribute('data-testid'))!.slice('question-'.length);
  return words.find(w => w.id === id)!;
}

async function checkAnswer(page: Page, incorrect = false) {
  const word = await currentWord(page);
  const input = page.getByRole('textbox', { name: '解答', exact: true });
  if (await input.count()) await input.fill(incorrect ? 'wrong-answer' : word.word);
  else {
    if (incorrect) {
      const options = page.getByRole('button').filter({ hasNotText: /ヒント|答え合わせ|中断/ });
      const labels = await options.allTextContents();
      await page.getByRole('button', { name: labels.find(label => label !== word.meaning)!, exact: true }).click();
    } else await page.getByRole('button', { name: word.meaning, exact: true }).click();
  }
  await page.getByRole('button', { name: '答え合わせ', exact: true }).click();
  await expect(page.getByRole('button', { name: '単語を聞く', exact: true })).toBeVisible();
  return word;
}

test('correct answers speak the English word then example in all formats, with replay and stop', async ({ page }) => {
  await installSpeechMock(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await begin(page);
  for (let i = 0; i < 3; i++) {
    await expect(page.getByRole('button', { name: '単語を聞く', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
    const before = await page.evaluate(() => window.__speechTest.calls.length);
    const word = await checkAnswer(page);
    const calls = await page.evaluate(() => window.__speechTest.calls);
    expect(calls.slice(before).map(call => call.text)).toEqual([word.word, word.example]);
    for (const call of calls.slice(before)) {
      expect(call.language).toBe('en-US');
      expect(call.rate).toBeCloseTo(.85);
      expect(call.activated).toBe(true);
    }
    await page.getByRole('button', { name: '単語を聞く', exact: true }).click();
    expect(await page.evaluate(() => window.__speechTest.pending.map(u => u.text))).toEqual([word.word]);
    await page.getByRole('button', { name: '例文を聞く', exact: true }).click();
    expect(await page.evaluate(() => window.__speechTest.pending.map(u => u.text))).toEqual([word.example]);
    await expect(page.getByTestId('speech-error')).toHaveCount(0);
    if (i === 0) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await page.getByRole('button', { name: '音声を停止', exact: true }).click();
    expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
    const next = page.getByRole('button', { name: '次へ →', exact: true });
    const bounds = await next.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
    await next.click();
    await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  }
});

test('wrong answers stay silent, permit pronunciation review, and navigation cancels speech', async ({ page }) => {
  await installSpeechMock(page);
  await begin(page);
  const word = await checkAnswer(page, true);
  expect(await page.evaluate(() => window.__speechTest.calls)).toEqual([]);
  await page.getByRole('button', { name: '例文を聞く', exact: true }).click();
  expect(await page.evaluate(() => window.__speechTest.pending.map(u => u.text))).toEqual([word.example]);
  await page.getByRole('button', { name: word.meaning, exact: true }).click();
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
  await checkAnswer(page);
  await page.getByRole('button', { name: '中断してホームへ', exact: true }).click();
  await expect(page.getByTestId('app-version')).toBeVisible();
  expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
});

test('vocabulary entries play their own word and example and stop when leaving the screen', async ({ page }) => {
  await installSpeechMock(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
  await page.getByRole('tab', { name: '記録', exact: true }).click();
  await page.getByRole('textbox', { name: '単語を検索', exact: true }).fill('apple');
  const apple = words.find(word => word.word === 'apple')!;
  const entry = page.getByTestId(`vocabulary-${apple.id}`);
  await entry.getByRole('button', { name: '単語を聞く', exact: true }).click();
  await entry.getByRole('button', { name: '例文を聞く', exact: true }).click();
  expect(await page.evaluate(() => window.__speechTest.calls.map(call => call.text))).toEqual([apple.word, apple.example]);
  expect(await page.evaluate(() => window.__speechTest.pending.map(u => u.text))).toEqual([apple.example]);
  await page.getByRole('tab', { name: 'ホーム', exact: true }).click();
  await expect(entry).toHaveCount(0);
  expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
});

test('unsupported browsers show an explanation and allow learning to continue', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  const word = await checkAnswer(page);
  await expect(page.getByTestId('speech-error')).toHaveText('このブラウザーは音声再生に対応していません。');
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('speech errors offer replay and do not interrupt answering', async ({ page }) => {
  await installSpeechMock(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  await page.evaluate(() => { window.__speechTest.failNext = true; });
  const word = await checkAnswer(page);
  await expect(page.getByTestId('speech-error')).toContainText('音声を再生できませんでした。');
  expect(await page.evaluate(() => window.__speechTest.pending.length)).toBe(0);
  await page.getByRole('button', { name: '単語を聞く', exact: true }).click();
  await expect(page.getByTestId('speech-error')).toHaveCount(0);
  expect(await page.evaluate(() => window.__speechTest.pending.map(u => u.text))).toEqual([word.word]);
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(page.getByTestId(`question-${word.id}`)).toHaveCount(0);
  expect(errors).toEqual([]);
});
