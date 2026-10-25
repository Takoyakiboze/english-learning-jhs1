import { test, expect } from '@playwright/test';
import { questionHint, words, type Question } from '../src/learning';
import type { Word } from '../src/curriculum';

function question(word: Word, type: Question['type']): Question {
  const answer = type === 'choice' ? word.meaning : word.word;
  return { ...word, type, answer, prompt: word.word, acceptedAnswers: [answer] };
}

test('meaning hints do not disclose Japanese answers, including one-character meanings', () => {
  const personalPronoun = { ...words.find(w => w.word === 'I')!, meaning: '私' };
  for (const word of [...words, personalPronoun]) {
    const hint = questionHint(question(word, 'choice'));
    expect(hint, word.word).not.toContain(word.meaning);
    expect(hint, word.word).not.toContain('で始まる');
    expect(hint, word.word).not.toMatch(/\d+文字/);
    expect(hint.trim(), word.word).not.toBe('');
  }
});

test('English input hints keep useful prefixes without revealing single-letter answers', () => {
  for (const type of ['spell', 'blank'] as const) {
    const mother = words.find(w => w.word === 'mother')!;
    expect(questionHint(question(mother, type))).toBe('「m」で始まる6文字の単語だよ');
    for (const word of words.filter(w => w.word.length === 1)) {
      const hint = questionHint(question(word, type));
      expect(hint).toContain('1文字');
      expect(hint).not.toContain(word.word);
      expect(hint).not.toContain('で始まる');
    }
  }
});
