import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maskExample, questionHint, Question } from './learning';

type Props = {
  question: Question; progress: string; answer: string; feedback: boolean | null;
  notice: string; last: boolean; onAnswer: (value: string) => void;
  onCheck: () => void; onNext: () => void; onExit: () => void;
};
export default function LearningQuestion(p: Props) {
  const [hint, setHint] = useState(false);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setTyping(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setTyping(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const inset = useSafeAreaInsets();
  const q = p.question;
  const check = () => { Keyboard.dismiss(); p.onCheck(); };
  return <KeyboardAvoidingView style={[s.screen, { paddingTop: inset.top, paddingBottom: inset.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    {!typing && <View style={s.header}><Text testID="question-progress" style={s.progress}>{p.progress}</Text><Pressable accessibilityRole="button" onPress={p.onExit} style={s.exit}><Text>中断してホームへ</Text></Pressable></View>}
    <View testID={`question-${q.id}`} style={s.body}>
      {q.fromEarlierLevel && !q.review && <Text testID="earlier-level-review" style={s.label}>前のレベルの未習得語 · Lv.{q.level}</Text>}
      {q.fromMistake && !q.review && <Text testID="past-mistake" style={s.label}>前に間違えた単語の復習</Text>}
      <Text style={s.label}>{q.type === 'choice' ? '意味を選ぼう' : q.type === 'spell' ? '英語で入力しよう' : '空欄を英語で埋めよう'}</Text>
      <Text testID="question-prompt" style={[s.question, typing && s.compactQuestion]}>{q.prompt}</Text>
      <View style={s.example}>
        {(q.type !== 'blank' || p.feedback !== null) && <Text style={s.exampleEnglish}>例文：{p.feedback === null ? maskExample(q.example, q.word) : q.example}</Text>}
        <Text testID="question-translation" style={s.translation}>和訳：{q.translation}</Text>
      </View>
      {<View style={[s.hintRow, typing && s.compactHintRow]}><Pressable accessibilityRole="button" accessibilityState={{ expanded: hint }} onPress={() => setHint(v => !v)} style={s.hintButton}><Text style={s.hintLabel}>{hint ? 'ヒントを閉じる' : 'ヒントを見る'}</Text></Pressable><Text testID="question-hint" accessibilityLiveRegion="polite" style={s.hint}>{hint ? questionHint(q) : ''}</Text></View>}
      {q.options ? <View style={s.grid}>{q.options.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: p.answer === value }} onPress={() => p.onAnswer(value)} style={[s.option, p.answer === value && s.selected]}><Text style={s.optionText}>{value}</Text></Pressable>)}</View> : <TextInput accessibilityLabel="解答" value={p.answer} onChangeText={p.onAnswer} style={s.input} autoCapitalize="none" autoCorrect={false} placeholder="答えを入力" returnKeyType="done" onSubmitEditing={p.feedback === null ? check : Keyboard.dismiss} />}
      <View style={[s.message, typing && p.feedback === null && { minHeight: 8, paddingVertical: 0 }]} accessibilityLiveRegion="polite">
        {p.feedback !== null && <Text style={[s.feedback, { color: p.feedback ? '#245d4a' : '#875716' }]}>{p.feedback ? '○ 正解！' : 'もう一度、覚えよう'}</Text>}
        {p.feedback !== null && <Text style={s.detail}>正解：{q.answer}{!p.feedback ? ' · 正しい答えに直して次へ' : ''}</Text>}
        {!!p.notice && <Text style={s.detail}>{p.notice}</Text>}
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: p.feedback === null && !p.answer.trim() }} disabled={p.feedback === null && !p.answer.trim()} onPress={p.feedback === null ? check : () => { Keyboard.dismiss(); p.onNext(); }} style={[s.primary, p.feedback === null && !p.answer.trim() && { opacity: .4 }]}><Text style={s.primaryText}>{p.feedback === null ? '答え合わせ' : p.last ? '結果を見る' : '次へ →'}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5ef' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48 },
  progress: { color: '#245d4a', fontWeight: '700', fontSize: 14 }, exit: { paddingVertical: 12, paddingLeft: 8 },
  body: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 12 }, label: { color: '#637268', fontSize: 13, marginTop: 8 },
  question: { color: '#243e32', fontSize: 27, fontWeight: '800', lineHeight: 34, marginVertical: 12 }, translation: { color: '#243e32', fontSize: 14, lineHeight: 20 },
  example: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#e9efdf' }, exampleEnglish: { color: '#243e32', fontSize: 15, lineHeight: 21 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginVertical: 4 }, hintButton: { paddingVertical: 12 }, hintLabel: { color: '#245d4a', fontWeight: '700' }, hint: { flex: 1, color: '#637268', fontSize: 13 },
  compactQuestion: { fontSize: 23, lineHeight: 28, marginVertical: 6 }, compactHintRow: { marginVertical: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, option: { width: '48%', minHeight: 56, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: '#dde5d7', backgroundColor: '#fff', justifyContent: 'center' }, selected: { borderColor: '#245d4a', backgroundColor: '#e9efdf' }, optionText: { fontSize: 17, color: '#243e32' },
  input: { height: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#cdd8c7', backgroundColor: '#fff', color: '#243e32', fontSize: 18 },
  message: { minHeight: 62, paddingVertical: 8 }, feedback: { fontSize: 17, fontWeight: '700' }, detail: { color: '#637268', fontSize: 13, lineHeight: 19 },
  primary: { backgroundColor: '#245d4a', minHeight: 48, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
