import { test, expect } from '@playwright/test';
import { levels, words } from '../src/curriculum';
import { buildLearningSession } from '../src/learning';
import { applyMasterySession, currentLevel, decodeMastery, levelProgress, type MasteryRecord } from '../src/mastery';

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

test('119/120 cannot unlock the next level; the final word unlocks only the next level', () => {
  const group=words.filter(w=>w.level===1);
  let records=group.slice(0,119).map(w=>mastered(w.id));
  records.push({wordId:group[119].id,consecutiveCorrect:1,mastered:false,lastSessionId:'first',lastPracticedAt:1});
  expect(currentLevel(records)).toBe(1);
  expect(buildLearningSession([],()=>.4,records).some(q=>q.id===group[119].id)).toBe(true);
  records=applyMasterySession(records,[{wordId:group[119].id,correct:true}],'second',2);
  expect(currentLevel(records)).toBe(2);
  expect(buildLearningSession([],()=>.4,records).every(q=>q.level===2)).toBe(true);
  const saved=JSON.stringify({version:1,curriculum:'levels-v1',records});
  expect(currentLevel(decodeMastery(saved))).toBe(2);
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

test('learning covers all 120 words and progresses through all ten levels without starvation', () => {
  let records: MasteryRecord[]=[];
  for(let step=0;step<150&&!levelProgress(records).every(l=>l.complete);step++) {
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

test('invalid progress is rejected and old mistake records cannot fabricate mastery', () => {
  expect(decodeMastery(null)).toEqual([]);
  expect(()=>decodeMastery('{"version":1,"records":[]}')).toThrow();
  const invalid={wordId:words[0].id,consecutiveCorrect:0,mastered:true,lastSessionId:'x',lastPracticedAt:1};
  expect(decodeMastery(JSON.stringify({version:1,curriculum:'levels-v1',records:[invalid]}))).toEqual([]);
  expect(applyMasterySession([],[{wordId:words.find(w=>w.level===10)!.id,correct:true}],'skip')).toEqual([]);
});
