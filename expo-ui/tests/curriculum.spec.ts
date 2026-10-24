import { test, expect } from '@playwright/test';
import { buildQuestions, isCorrectAnswer, maskExample, words } from '../src/learning';

test('1200 unique headwords have meanings and maskable bilingual examples', () => {
  expect(words).toHaveLength(1200);
  expect(new Set(words.map(w => w.id)).size).toBe(1200);
  expect(new Set(words.map(w => w.word)).size).toBe(1200);
  for (const w of words) {
    expect(w.meaning.trim()).not.toBe('');
    expect(w.translation.trim()).not.toBe('');
    expect(maskExample(w.example, w.word), w.word).toContain('_____');
  }
  for (const original of ['apple','book','water','happy','school','friend','morning','small','music','beautiful']) {
    expect(words.some(w => w.word === original)).toBe(true);
  }
});

test('all 1200 words can be selected and four-choice answers are distinct', () => {
  let seed = 246;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const questions = buildQuestions(1200, random);
  expect(new Set(questions.map(q => q.id)).size).toBe(1200);
  for (const q of questions) {
    expect(isCorrectAnswer(q, q.answer)).toBe(true);
    if (q.options) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter(a => a === q.answer)).toHaveLength(1);
    }
  }
  expect(buildQuestions(0)).toHaveLength(0);
});

test('masking respects word boundaries and sentence capitalization', () => {
  expect(maskExample('Is he in the house?', 'he')).toBe('Is _____ in the house?');
  expect(maskExample('Blood is red.', 'blood')).toBe('_____ is red.');
  expect(maskExample('I like music.', 'I')).toBe('_____ like music.');
});

test('registered synonyms are valid spelling answers', () => {
  const q = buildQuestions(1200, () => .5).find(q => q.type === 'spell' && q.acceptedAnswers.length > 1);
  expect(q).toBeDefined();
  for (const a of q!.acceptedAnswers) expect(isCorrectAnswer(q!, ` ${a.toUpperCase()} `)).toBe(true);
  expect(isCorrectAnswer(q!, 'incorrect')).toBe(false);
});
