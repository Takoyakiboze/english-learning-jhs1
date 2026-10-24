const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const words = require('../src/curriculum/words.json');
assert.equal(words.length, 1200, 'Exactly 1,200 headwords required');
assert.equal(new Set(words.map(w => w.id)).size, 1200, 'Duplicate IDs');
assert.equal(new Set(words.map(w => w.word)).size, 1200, 'Duplicate headwords');
for (let level=1;level<=10;level++) assert.equal(words.filter(w=>w.level===level).length,120,`Level ${level} must contain 120 words`);
const errors = [];
for (const w of words) {
  for (const key of ['id','word','meaning','example','translation','category','partOfSpeech']) {
    if (typeof w[key] !== 'string' || !w[key].trim()) errors.push(`${w.word}: missing ${key}`);
  }
  const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${escaped}\\b`, 'i').test(w.example)) errors.push(`${w.word}: target not a complete word in example`);
  if (!/[ぁ-んァ-ヶ一-龠]/.test(w.meaning) || !/[ぁ-んァ-ヶ一-龠]/.test(w.translation)) errors.push(`${w.word}: Japanese required`);
  if (/\{\w+\}|_____/.test(w.example + w.translation)) errors.push(`${w.word}: unresolved template`);
}
assert.deepEqual(errors, [], errors.join('\n'));
const summary = { wordCount: words.length, exampleCount: words.length, categories: words.reduce((a,w) => { a[w.category] = (a[w.category] || 0) + 1; return a; }, {}), bytes: fs.statSync(path.join(__dirname,'../src/curriculum/words.json')).size };
console.log(JSON.stringify(summary, null, 2));
