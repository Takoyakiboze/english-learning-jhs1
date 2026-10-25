import { test, expect, Page } from '@playwright/test';
import { maskExample, words, SESSION_SIZE } from '../src/learning';
import { MISTAKES_STORAGE_KEY } from '../src/mistakes';
import { PROGRESS_STORAGE_KEY } from '../src/mastery';
test.setTimeout(90_000);
async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
  await page.getByRole('button', { name: '今日の学習をはじめる →', exact: true }).click();
  await expect(page.getByTestId(/^question-word-/)).toBeVisible();
}
async function answerQuestion(page: Page, incorrect = false) {
  const body = await page.locator('body').innerText();
  const questionId = (await page.getByTestId(/^question-word-/).getAttribute('data-testid'))!.slice('question-'.length);
  const word = words.find(w => w.id === questionId);
  if (!word) throw new Error(`Could not identify question: ${questionId}`);
  const previousProgress=await page.getByTestId('question-progress').innerText();
  const input = page.getByRole('textbox', { name: '解答', exact: true });
  if (await input.count()) {
    await input.fill(incorrect ? 'not-a-real-answer' : word.word);
  } else {
    const value = incorrect ? words.find(w => w.meaning !== word.meaning && body.split('\n').includes(w.meaning))!.meaning : word.meaning;
    await page.getByRole('button', { name: value, exact: true }).click();
  }
  await expect(page.getByText(`和訳：${word.translation}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`例文：${word.example}`, { exact: true })).toHaveCount(0);
  if (await page.getByText('空欄を英語で埋めよう', { exact: true }).count() === 0) {
    await expect(page.getByText(`例文：${maskExample(word.example, word.word)}`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '答え合わせ', exact: true }).click();
  await expect(page.getByText(`例文：${word.example}`, { exact: true })).toBeVisible();
  const action = page.getByRole('button', { name: /^(次へ →|結果を見る)$/ });
  const bounds = await action.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  if (incorrect) {
    await expect(page.getByText('もう一度、覚えよう', { exact: true })).toBeVisible();
    if (await input.count()) await input.fill(word.word);
    else await page.getByRole('button', { name: word.meaning, exact: true }).click();
  }
  const result = page.getByRole('button', { name: '結果を見る', exact: true });
  if (await result.count()) await result.click();
  else await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect.poll(async()=>{
    if(await page.getByTestId(`question-${word.id}`).count()===0) return true;
    return await page.getByTestId('question-progress').innerText()!==previousProgress;
  }).toBe(true);
  return word.id;
}
test('20/20 grants reward and demo usage, navigation and reset work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page);
  for (let i=0; i<SESSION_SIZE; i++) await answerQuestion(page);
  await expect(page.getByText('10分のごほうびを獲得！', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"records":[]}').records.length, PROGRESS_STORAGE_KEY)).toBe(20);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.some((r: {mastered:boolean})=>r.mastered), PROGRESS_STORAGE_KEY)).toBe(false);
  await page.getByRole('button', { name: 'ごほうびを確認', exact: true }).click();
  await page.getByRole('button', { name: '利用をはじめる', exact: true }).click();
  await expect(page.getByText('利用中（デモ）', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '利用終了・再制限を確認', exact: true }).click();
  await page.getByRole('tab', { name: '記録', exact: true }).click();
  await expect(page.getByText('通常学習　20/20問', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '目標', exact: true }).click();
  await page.getByRole('button', { name: '学校の復習', exact: true }).click();
  await page.getByRole('tab', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: '検証データを初期化', exact: true }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"records":[]}').records.length, PROGRESS_STORAGE_KEY)).toBe(0);
  await page.getByRole('tab', { name: '報酬', exact: true }).click();
  await expect(page.getByRole('button', { name: '利用をはじめる', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'artifacts/mobile-rewards.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('1200-word browser searches, filters and pages the curriculum', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'この設定ではじめる', exact: true }).click();
  await expect(page.getByText(/四択・スペル・穴埋め.*1,200語/)).toBeVisible();
  await page.getByRole('tab', { name: '記録', exact: true }).click();
  await expect(page.getByText('1,200語 · 1 / 60ページ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '次の20語', exact: true }).click();
  await expect(page.getByText('1,200語 · 2 / 60ページ', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '単語を検索', exact: true }).fill('apple');
  await expect(page.getByText('apple　りんご', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '単語を検索', exact: true }).fill('zzzz-no-word');
  await expect(page.getByText('一致する単語がありません。', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '単語を検索', exact: true }).fill('');
  await page.getByRole('button', { name: '動物', exact: true }).click();
  const animalCount = words.filter(w => w.category === '動物').length;
  await expect(page.getByText(`${animalCount}語 · 1 / ${Math.ceil(animalCount / 20)}ページ`, { exact: true })).toBeVisible();
});
test('hints and all question formats fit a small phone without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await begin(page);
  for (let i = 0; i < SESSION_SIZE; i++) {
    await page.getByRole('button', { name: 'ヒントを見る', exact: true }).click();
    const hint = page.getByTestId('question-hint');
    await expect(hint).toBeVisible();
    if (await page.getByText('意味を選ぼう', { exact: true }).count()) {
      await expect(hint).toContainText('品詞：');
      await expect(hint).not.toContainText('で始まる');
    } else {
      await expect(hint).toContainText(/文字の単語/);
    }
    const check = await page.getByRole('button', { name: '答え合わせ', exact: true }).boundingBox();
    expect(check!.y + check!.height).toBeLessThanOrEqual(667);
    await answerQuestion(page, i === SESSION_SIZE - 1);
  }
  await answerQuestion(page);
  await expect(page.getByText('あと一歩。次の20問に挑戦しよう', { exact: true })).toBeVisible();
});

test('the meaning hint for I does not disclose its answer and hints reset between formats', async ({ page }) => {
  const records = words.filter(w => w.level === 1 && w.word !== 'I')
    .map(w => ({ wordId: w.id, consecutiveCorrect: 2, mastered: true, lastSessionId: 'seed', lastPracticedAt: 1 }));
  await page.addInitScript(({ key, records }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, curriculum: 'levels-v1', records }));
    Math.random = () => .999999;
  }, { key: PROGRESS_STORAGE_KEY, records });
  await begin(page);
  await expect(page.getByTestId('question-prompt')).toHaveText('I');
  await page.getByRole('button', { name: 'ヒントを見る', exact: true }).click();
  const hint = page.getByTestId('question-hint');
  await expect(hint).toContainText('代名詞');
  await expect(hint).not.toContainText('私');
  await expect(hint).not.toContainText('で始まる');
  await page.getByRole('button', { name: 'ヒントを閉じる', exact: true }).click();
  await expect(hint).toBeEmpty();
  await answerQuestion(page);
  for (const label of ['英語で入力しよう', '空欄を英語で埋めよう']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(hint).toBeEmpty();
    await page.getByRole('button', { name: 'ヒントを見る', exact: true }).click();
    await expect(hint).toContainText(/で始まる.*文字の単語/);
    await answerQuestion(page);
  }
});
test('19/20 and correction + review do not grant reward', async ({ page }) => {
  await begin(page);
  for (let i=0;i<SESSION_SIZE;i++) await answerQuestion(page,i===SESSION_SIZE - 1);
  await expect(page.getByText('復習タイム · 初回の点数は変わりません', { exact: true })).toBeVisible();
  await answerQuestion(page);
  await expect(page.getByText('あと一歩。次の20問に挑戦しよう', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ごほうびを確認', exact: true }).click();
  await expect(page.getByRole('button', { name: '利用をはじめる', exact: true })).toBeDisabled();
});
test('five prior mistakes are guaranteed after reload, and reset clears saved history', async ({ page }) => {
  await begin(page);
  const missed: string[] = [];
  for(let i=0;i<SESSION_SIZE;i++) {
    const id = await answerQuestion(page, i < 6);
    if(i < 6) missed.push(id);
  }
  for(let i=0;i<6;i++) await answerQuestion(page);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"records":[]}').records.length, MISTAKES_STORAGE_KEY)).toBe(6);
  await page.goto('./');
  await page.getByRole('button', { name:'この設定ではじめる', exact:true }).click();
  await expect(page.getByText('苦手単語は6語。20問のうち最大5問を優先して復習します。', {exact:true})).toBeVisible();
  await page.getByRole('button', { name:'今日の学習をはじめる →', exact:true }).click();
  await expect(page.getByTestId(/^question-word-/)).toBeVisible();
  const reviewed: string[] = [];
  for(let i=0;i<SESSION_SIZE;i++) {
    const isReview = await page.getByTestId('past-mistake').count() > 0;
    const id = await answerQuestion(page);
    if(isReview) reviewed.push(id);
  }
  expect(reviewed).toHaveLength(5);
  expect(new Set(reviewed).size).toBe(5);
  expect(reviewed.every(id=>missed.includes(id))).toBe(true);
  await expect(page.getByText('10分のごほうびを獲得！', {exact:true})).toBeVisible();
  await page.getByRole('tab', {name:'設定',exact:true}).click();
  await page.getByRole('button', {name:'検証データを初期化',exact:true}).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"records":[]}').records.length, MISTAKES_STORAGE_KEY)).toBe(0);
});
test('tablet, assessment and interruption', async ({ page }) => {
  await page.setViewportSize({width:1024,height:768});
  await page.goto('./'); await page.getByRole('button',{name:'この設定ではじめる',exact:true}).click();
  await page.screenshot({path:'artifacts/tablet-home.png',fullPage:true});
  await page.getByRole('button',{name:'確認テストを受ける',exact:true}).click();
  for(let i=0;i<10;i++) await answerQuestion(page);
  await expect(page.getByText('実力チェックの結果',{exact:true})).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"records":[]}').records.length, PROGRESS_STORAGE_KEY)).toBe(0);
  await page.getByRole('button',{name:'ホームへ',exact:true}).click();
  await page.getByRole('button',{name:'今日の学習をはじめる →',exact:true}).click();
  await page.getByRole('button',{name:'中断してホームへ',exact:true}).click();
  await expect(page.getByText('はるさん、こんにちは。',{exact:true})).toBeVisible();
});
test('level advancement requires every word and survives reload; future levels stay locked', async ({page}) => {
  const group=words.filter(w=>w.level===1);
  const records=group.map((w,i)=>({wordId:w.id,consecutiveCorrect:i===119?1:2,mastered:i!==119,lastSessionId:'seed',lastPracticedAt:1}));
  await page.addInitScript(({key,records})=>{
    if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({version:1,curriculum:'levels-v1',records}));
  },{key:PROGRESS_STORAGE_KEY,records});
  await page.goto('./');
  await page.getByRole('button',{name:'この設定ではじめる',exact:true}).click();
  await page.getByRole('tab',{name:'目標',exact:true}).click();
  await expect(page.getByTestId('level-1')).toContainText('119 / 120語');
  await expect(page.getByTestId('level-2')).toContainText('未解放');
  await page.getByRole('button',{name:'この目標で学ぶ',exact:true}).click();
  const asked: string[]=[];
  for(let i=0;i<20;i++) asked.push(await answerQuestion(page));
  expect(asked.every(id=>group.some(w=>w.id===id))).toBe(true);
  expect(asked).toContain(group[119].id);
  await expect(page.getByText('レベル1を習得！次のレベルへ進めます。',{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).records.filter((r:{mastered:boolean})=>r.mastered).length,PROGRESS_STORAGE_KEY)).toBe(120);
  await page.goto('./');
  await page.getByRole('button',{name:'この設定ではじめる',exact:true}).click();
  await page.getByRole('tab',{name:'目標',exact:true}).click();
  await expect(page.getByTestId('level-1')).toContainText('習得済み');
  await expect(page.getByTestId('level-2')).toContainText('学習中');
  await expect(page.getByTestId('level-3')).toContainText('未解放');
  await page.getByRole('button',{name:'この目標で学ぶ',exact:true}).click();
  for(let i=0;i<20;i++) {
    const id=await answerQuestion(page);
    expect(words.find(w=>w.id===id)!.level).toBe(2);
  }
});
