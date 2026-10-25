import { test, expect } from '@playwright/test';
import { levels, words } from '../src/curriculum';
import { buildLearningSession } from '../src/learning';
import { applyMasterySession, currentLevel, decodeMastery, levelProgress, LEVEL_ADVANCE_WORDS, type MasteryRecord } from '../src/mastery';

const mastered = (wordId: string): MasteryRecord => ({wordId,consecutiveCorrect:2,mastered:true,lastSessionId:'seed',lastPracticedAt:1});

test('1200 words belong to exactly 10 levels of 120', () => {
  expect(levels).toHaveLength(10);
  for(let level=1;level<=10;level++) expect(words.filter(w=>w.level===level)).toHaveLength(120);
  expect(currentLevel([])).toBe(1);
  const futureMistakes=words.filter(w=>w.level===10).map(w=>({wordId:w.id,misses:10,lastWrongAt:0,lastReviewedAt:0}));
  expect(buildLearningSession(futureMistakes).every(q=>q.level===1)).toBe(true);
});

test('two separate completed sets are needed; same-set retries and corrections cannot master a word', () => {
  const wordId=words.find(w=>w.level===1)!.id;
  let records=applyMasterySession([],[{wordId,correct:true}],'first',1);
  expect(records[0].mastered).toBe(false);
  records=applyMasterySession(records,[{wordId,correct:true}],'first',2);
  expect(records[0].consecutiveCorrect).toBe(1);
  records=applyMasterySession(records,[{wordId,correct:false},{wordId,correct:true}],'second',3);
  expect(records[0].consecutiveCorrect).toBe(0);
  records=applyMasterySession(records,[{wordId,correct:true}],'third',4);
  expect(records[0].mastered).toBe(false);
  records=applyMasterySession(records,[{wordId,correct:true}],'fourth',5);
  expect(records[0].mastered).toBe(true);
});

test('95/120 stays locked; 96/120 unlocks only the next level and preserves saved progress', () => {
  const group=words.filter(w=>w.level===1);
  expect(LEVEL_ADVANCE_WORDS).toBe(96);
  let records=group.slice(0,95).map(w=>mastered(w.id));
  records.push({wordId:group[95].id,consecutiveCorrect:1,mastered:false,lastSessionId:'first',lastPracticedAt:1});
  expect(currentLevel(records)).toBe(1);
  expect(buildLearningSession([],()=>.4,records).every(q=>q.level===1)).toBe(true);
  records=applyMasterySession(records,[{wordId:group[95].id,correct:true}],'second',2);
  expect(currentLevel(records)).toBe(2);
  expect(levelProgress(records)[0]).toMatchObject({mastered:96,advanceReady:true,complete:false});
  expect(buildLearningSession([],()=>.4,records).every(q=>q.level<=2)).toBe(true);
  const saved=JSON.stringify({version:1,curriculum:'levels-v1',records});
  expect(currentLevel(decodeMastery(saved))).toBe(2);
  expect(currentLevel(group.slice(0,119).map(w=>mastered(w.id)))).toBe(2);
});

test('unlocked earlier mistakes stay in the five-question review quota without leaking higher levels', () => {
  const records=words.filter(w=>w.level===1).map(w=>mastered(w.id));
  const history=words.filter(w=>w.level===1||w.level===10).slice(0,10).map(w=>({wordId:w.id,misses:1,lastWrongAt:1,lastReviewedAt:0}));
  const session=buildLearningSession(history,()=>.4,records);
  expect(session.filter(q=>q.fromMistake)).toHaveLength(Math.min(5,history.filter(h=>words.find(w=>w.id===h.wordId)!.level===1).length));
  expect(session.every(q=>q.level<=2)).toBe(true);
  const oldId=records[0].wordId;
  expect(currentLevel(applyMasterySession(records,[{wordId:oldId,correct:false}],'review',3))).toBe(2);
});

test('learning advances at 80 percent and eventually masters all 1200 words without starvation', () => {
  let records: MasteryRecord[]=[];
  for(let step=0;step<200&&!levelProgress(records).every(l=>l.complete);step++) {
    const active=currentLevel(records);
    const session=buildLearningSession([],()=>.4,records);
    expect(session).toHaveLength(20);
    expect(session.every(q=>q.level<=active)).toBe(true);
    records=applyMasterySession(records,session.map(q=>({wordId:q.id,correct:true})),`session-${step}`,step+1);
    expect(currentLevel(records)).toBeLessThanOrEqual(active+1);
  }
  expect(records.filter(r=>r.mastered)).toHaveLength(1200);
  expect(levelProgress(records).every(l=>l.complete)).toBe(true);
  expect(currentLevel(records)).toBe(10);
  expect(buildLearningSession([],()=>.4,records)).toHaveLength(20);
});

test('five earlier unmastered words coexist with five mistake reviews and rotate', () => {
  const group=words.filter(w=>w.level===1);
  const records=group.slice(0,96).map(w=>mastered(w.id));
  const history=[...group.slice(0,5),...words.filter(w=>w.level===10).slice(0,5)]
    .map(w=>({wordId:w.id,misses:1,lastWrongAt:1,lastReviewedAt:0}));
  const session=buildLearningSession(history,()=>.4,records);
  expect(session).toHaveLength(20);
  expect(new Set(session.map(q=>q.id)).size).toBe(20);
  expect(session.filter(q=>q.fromMistake)).toHaveLength(5);
  const earlier=session.filter(q=>q.fromEarlierLevel);
  expect(earlier).toHaveLength(5);
  expect(earlier.every(q=>q.level===1&&!records.some(r=>r.wordId===q.id&&r.mastered))).toBe(true);
  expect(session.filter(q=>q.level===2)).toHaveLength(10);
  expect(session.every(q=>q.level<=2&&!q.review)).toBe(true);
  const next=applyMasterySession(records,session.map(q=>({wordId:q.id,correct:true})),'next',100);
  const rotated=buildLearningSession(history,()=>.4,next).filter(q=>q.fromEarlierLevel);
  expect(rotated).toHaveLength(5);
  expect(rotated.some(q=>earlier.some(old=>old.id===q.id))).toBe(false);
});

test('one to four leftover words all appear, even when one is already in the mistake quota', () => {
  const group=words.filter(w=>w.level===1);
  for(const count of [1,2,3,4]) {
    let records=group.slice(0,120-count).map(w=>mastered(w.id));
    const missing=group.slice(120-count);
    const history=[{wordId:missing[0].id,misses:1,lastWrongAt:1,lastReviewedAt:0}];
    for(let round=0;round<2;round++) {
      const session=buildLearningSession(history,()=>.4,records);
      expect(session.filter(q=>q.fromEarlierLevel)).toHaveLength(count);
      expect(new Set(session.map(q=>q.id)).size).toBe(20);
      for(const word of missing) expect(session.some(q=>q.id===word.id)).toBe(true);
      records=applyMasterySession(records,session.map(q=>({wordId:q.id,correct:true})),`leftover-${round}`,round+2);
    }
    expect(levelProgress(records)[0].complete).toBe(true);
    expect(currentLevel(records)).toBe(2);
  }
});

test('all ten levels at 80 percent still practice the remaining words', () => {
  const records=levels.flatMap(l=>words.filter(w=>w.level===l.level).slice(0,96).map(w=>mastered(w.id)));
  expect(levelProgress(records).every(l=>l.advanceReady&&!l.complete)).toBe(true);
  expect(currentLevel(records)).toBe(10);
  const session=buildLearningSession([],()=>.4,records);
  expect(session).toHaveLength(20);
  expect(session.every(q=>!records.some(r=>r.wordId===q.id&&r.mastered))).toBe(true);
  expect(session.filter(q=>q.fromEarlierLevel)).toHaveLength(5);
  expect(session.filter(q=>q.level===10)).toHaveLength(15);
});

test('invalid progress is rejected and old mistake records cannot fabricate mastery', () => {
  expect(decodeMastery(null)).toEqual([]);
  expect(()=>decodeMastery('{"version":1,"records":[]}')).toThrow();
  const invalid={wordId:words[0].id,consecutiveCorrect:0,mastered:true,lastSessionId:'x',lastPracticedAt:1};
  expect(decodeMastery(JSON.stringify({version:1,curriculum:'levels-v1',records:[invalid]}))).toEqual([]);
  expect(applyMasterySession([],[{wordId:words.find(w=>w.level===10)!.id,correct:true}],'skip')).toEqual([]);
});
