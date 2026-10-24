// Original vocabulary and example sentences for this app. No dictionary scraping.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const result = [];
const seen = new Set();
for (const file of fs.readdirSync(path.join(root, 'curriculum-source')).filter(f => f.endsWith('.txt')).sort()) {
  let group;
  for (const raw of fs.readFileSync(path.join(root, 'curriculum-source', file), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@')) { const [category, pos, en, ja] = line.slice(1).split('|'); group = { category, pos, en, ja }; continue; }
    if (!group) throw new Error(`Missing group: ${file}`);
    const [word, meaning, ownExample, ownTranslation] = line.split('|');
    if (seen.has(word)) throw new Error(`Duplicate headword: ${word}`);
    const article = /^(hour|honest)/.test(word) || /^[aeiou]/i.test(word) && !/^(university|uniform|unit|use)/.test(word) ? 'an' : 'a';
    const fill = text => text.replaceAll('{word}', word).replaceAll('{meaning}', meaning).replaceAll('{article}', article);
    const example = ownExample || fill(group.en);
    const translation = ownTranslation || fill(group.ja);
    if (!word || !meaning || !example || !translation || !example.toLowerCase().includes(word.toLowerCase())) throw new Error(`Invalid row: ${line}`);
    seen.add(word);
    result.push({ id: `word-${word.replaceAll("'", '').replaceAll(' ', '-')}`, word, meaning, example, translation, category: group.category, partOfSpeech: group.pos });
  }
}
console.log('Vocabulary:', result.length);
console.log(JSON.stringify(result.reduce((a, w) => { a[w.category] = (a[w.category] || 0) + 1; return a; }, {}), null, 2));
if (result.length !== 1200) { process.exitCode = 1; return; }
const groups = JSON.parse(fs.readFileSync(path.join(root,'curriculum-source/levels.json'),'utf8'));
const levels = new Map();
if(groups.length !== 10) throw new Error('10 levels required');
for(const [i, group] of groups.entries()) {
  if(group.level !== i+1 || group.words.length !== 120) throw new Error(`Invalid level ${group.level}`);
  for(const word of group.words) {
    if(!seen.has(word) || levels.has(word)) throw new Error(`Invalid level assignment: ${word}`);
    levels.set(word,group.level);
  }
}
for(const word of result) {
  if(!levels.has(word.word)) throw new Error(`Missing level: ${word.word}`);
  word.level = levels.get(word.word);
}
fs.mkdirSync(path.join(root, 'src/curriculum'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/curriculum/words.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'src/curriculum/levels.json'), JSON.stringify(groups.map(({level,title})=>({level,title})),null,2)+'\n');
