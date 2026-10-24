import { test, expect } from '@playwright/test';
import { buildLearningSession, REVIEW_QUOTA, SESSION_SIZE, words } from '../src/learning';
import { decodeMistakes, priorityMistakes, recordPracticeAnswer, type MistakeRecord } from '../src/mistakes';

const history = (count: number): MistakeRecord[] => [...words].sort((a,b)=>a.level-b.level).slice(0, count).map((w,i) => ({wordId:w.id, misses:1, lastWrongAt:i+1, lastReviewedAt:i+1}));

test('every session has 20 unique questions, including 5 past mistakes when available', () => {
  for (const count of [0,1,3,5,8,100]) {
    const session = buildLearningSession(history(count), () => .4);
    expect(session).toHaveLength(SESSION_SIZE);
    expect(new Set(session.map(q => q.id)).size).toBe(SESSION_SIZE);
    expect(session.filter(q => q.fromMistake)).toHaveLength(Math.min(count, REVIEW_QUOTA));
    for (const id of priorityMistakes(history(count), REVIEW_QUOTA)) expect(session.some(q => q.id === id)).toBe(true);
    expect(session.some(q => q.review)).toBe(false); // Counts toward the regular 20-question score.
  }
});

test('review history rotates instead of repeatedly selecting only the same five', () => {
  let records = history(10);
  const first = buildLearningSession(records);
  const firstIds = first.filter(q => q.fromMistake).map(q => q.id);
  for (const id of firstIds) records = recordPracticeAnswer(records, id, true, 100);
  const secondIds = buildLearningSession(records).filter(q => q.fromMistake).map(q => q.id);
  expect(secondIds).toHaveLength(5);
  expect(secondIds.filter(id => firstIds.includes(id))).toHaveLength(0);
});

test('all-mistake and stale histories still produce a complete session without duplicates', () => {
  const stale = [{wordId:'deleted-id',misses:1,lastWrongAt:1,lastReviewedAt:0}];
  expect(buildLearningSession(stale).filter(q => q.fromMistake)).toHaveLength(0);
  for (const count of [1190,1200]) {
    const session = buildLearningSession(history(count));
    expect(session).toHaveLength(20);
    expect(new Set(session.map(q => q.id)).size).toBe(20);
    expect(session.filter(q => q.fromMistake).length).toBeGreaterThanOrEqual(5);
  }
});

test('wrong answers update history; correct review answers retain it; serialization is validated', () => {
  const id = words[0].id;
  let records = recordPracticeAnswer([], id, false, 10);
  records = recordPracticeAnswer(records, id, false, 20);
  records = recordPracticeAnswer(records, id, true, 30);
  expect(records).toEqual([{wordId:id,misses:2,lastWrongAt:20,lastReviewedAt:30}]);
  expect(decodeMistakes(JSON.stringify({version:1,records}))).toEqual(records);
  expect(recordPracticeAnswer([], id, true)).toEqual([]);
  expect(decodeMistakes(null)).toEqual([]);
  expect(decodeMistakes(JSON.stringify({version:1,records:[...records,...records,{wordId:'removed',misses:1}]}))).toEqual(records);
  expect(() => decodeMistakes('broken')).toThrow();
});
