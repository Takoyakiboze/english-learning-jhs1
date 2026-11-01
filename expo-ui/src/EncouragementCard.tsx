import { StyleSheet, Text, View } from 'react-native';
import type { Encouragement, ProgressEncouragement } from './encouragement';

type Props = { message: Encouragement; progress?: ProgressEncouragement; testID: string };
export default function EncouragementCard({ message, progress, testID }: Props) {
  return <View testID={testID} style={s.card}>
    <Text style={s.caption}>{progress ? '一歩ずつ、成長中' : '今回のがんばり'}</Text>
    <Text style={s.title}>{message.title}</Text>
    <Text style={s.body}>{message.body}</Text>
    {progress && <>
      <Text style={s.count}>習得した単語　{progress.mastered.toLocaleString()} / {progress.total.toLocaleString()}語</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="英単語の習得状況" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.mastered} style={s.track}>
        <View style={[s.fill, { width: `${progress.mastered / progress.total * 100}%` }]}/>
      </View>
      <Text style={s.next}>{progress.nextMilestone ? `次の節目：${progress.nextMilestone.toLocaleString()}語まであと${progress.nextMilestone - progress.mastered}語` : '全1,200語の習得を達成！復習で力を育てよう。'}</Text>
    </>}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#edf3e6', borderColor: '#dce7ce', borderWidth: 1, borderRadius: 22, padding: 20, marginBottom: 20 },
  caption: { color: '#637442', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  title: { color: '#245d4a', fontSize: 19, fontWeight: '800', lineHeight: 27 },
  body: { color: '#536651', fontSize: 14, lineHeight: 22, marginTop: 8 },
  count: { color: '#245d4a', fontSize: 13, fontWeight: '700', marginTop: 16 },
  track: { height: 8, backgroundColor: '#dbe4cf', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  fill: { height: 8, backgroundColor: '#74974e', borderRadius: 8 },
  next: { color: '#536651', fontSize: 12, lineHeight: 19, marginTop: 7 },
});
