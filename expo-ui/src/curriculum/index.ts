import data from './words.json';
import levelData from './levels.json';

export type Word = {
  id: string; word: string; meaning: string; example: string; translation: string;
  category: string; partOfSpeech: string; level: number;
};
export const words: Word[] = data;
export const categories = Array.from(new Set(words.map(w => w.category)));
export const levels = levelData;

// Match a complete word, including sentence-initial capitals, never part of another word.
export function maskExample(example: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '_____');
}
