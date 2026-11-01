import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  word: string;
  example: string;
  onPlay: (texts: readonly string[]) => void;
  onStop: () => void;
};

export default function PronunciationControls({ word, example, onPlay, onStop }: Props) {
  return <View style={s.row}>
    <Pressable accessibilityRole="button" onPress={() => onPlay([word])} style={s.button}><Text style={s.text}>単語を聞く</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => onPlay([example])} style={s.button}><Text style={s.text}>例文を聞く</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="音声を停止" onPress={onStop} style={s.button}><Text style={s.text}>停止</Text></Pressable>
  </View>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  button: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  text: { color: '#245d4a', fontSize: 13, fontWeight: '700' },
});
