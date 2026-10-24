import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { categories, levels, words } from './curriculum';
import { currentLevel, type MasteryRecord } from './mastery';

const PAGE_SIZE = 20;
export default function VocabularyBrowser({mastery = []}: {mastery?: readonly MasteryRecord[]}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('すべて');
  const [page, setPage] = useState(0);
  const [level, setLevel] = useState(0);
  const mastered = new Set(mastery.filter(r=>r.mastered).map(r=>r.wordId));
  const active = currentLevel(mastery);
  const matches = words.filter(w =>
    (level === 0 || w.level === level) && (category === 'すべて' || w.category === category) &&
    `${w.word} ${w.meaning} ${w.example} ${w.translation}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  return <View>
    <Text style={s.title}>教材を見てみよう · {words.length.toLocaleString()}語</Text>
    <Text style={s.note}>小学校の復習を含む中1向けの基本語彙。教科書との照合は未実施です。</Text>
    <TextInput accessibilityLabel="単語を検索" value={query} onChangeText={s => { setQuery(s); setPage(0); }} placeholder="英単語・日本語で検索" autoCapitalize="none" autoCorrect={false} style={s.search}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} keyboardShouldPersistTaps="handled">
      {[0,...levels.map(l=>l.level)].map(n => <Pressable key={n} accessibilityRole="button" accessibilityState={{selected:level===n}} onPress={()=>{setLevel(n);setPage(0);}} style={[s.chip,level===n&&s.selected]}><Text style={{color:level===n?'#fff':'#245d4a'}}>{n===0?'全レベル':`レベル${n}`}</Text></Pressable>)}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} keyboardShouldPersistTaps="handled">
      {['すべて', ...categories].map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: category === c }} onPress={() => { setCategory(c); setPage(0); }} style={[s.chip, category === c && s.selected]}><Text style={{color: category === c ? '#fff' : '#245d4a'}}>{c}</Text></Pressable>)}
    </ScrollView>
    <Text accessibilityLiveRegion="polite" style={s.note}>{matches.length.toLocaleString()}語 · {page + 1} / {pages}ページ</Text>
    {matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(w => <View key={w.id} style={s.entry}>
      <Text style={s.word}>{w.word}　{w.meaning}</Text>
      <Text style={s.note}>レベル{w.level} · {w.partOfSpeech} · {w.category} · {mastered.has(w.id)?'習得済み':w.level>active?'未解放':'学習中'}</Text>
      <Text style={s.example}>{w.example}</Text><Text style={s.example}>{w.translation}</Text>
    </View>)}
    {matches.length === 0 && <Text style={s.note}>一致する単語がありません。</Text>}
    <View style={s.controls}>
      <Pressable accessibilityRole="button" disabled={page === 0} onPress={() => setPage(p => p - 1)} style={[s.chip, page === 0 && s.disabled]}><Text>前の20語</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={page + 1 >= pages} onPress={() => setPage(p => p + 1)} style={[s.chip, page + 1 >= pages && s.disabled]}><Text>次の20語</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  title: {fontSize: 19, fontWeight: '700', color: '#243e32', marginBottom: 10}, note: {fontSize: 13, lineHeight: 20, color: '#6a766d', marginVertical: 5},
  search: {borderWidth: 1, borderColor: '#d6ded3', padding: 12, minHeight: 48, borderRadius: 12, fontSize: 16, marginVertical: 8},
  filters: {gap: 8, paddingVertical: 8}, chip: {padding: 12, minHeight: 44, borderRadius: 18, backgroundColor: '#e9efdf', justifyContent: 'center'}, selected: {backgroundColor: '#245d4a'},
  entry: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#edf0e8'}, word: {fontWeight: '700', color: '#243e32', fontSize: 16}, example: {fontSize: 14, lineHeight: 22, color: '#536651'}, controls: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}, disabled: {opacity: .4},
});
