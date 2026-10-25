import { StyleSheet, Text, View } from 'react-native';
import { currentLevel, levelProgress, LEVEL_ADVANCE_WORDS, type MasteryRecord } from './mastery';

export default function LevelOverview({mastery}: {mastery: readonly MasteryRecord[]}) {
  const active = currentLevel(mastery);
  return <View>
    <Text style={s.title}>10レベルの学習ステップ</Text>
    <Text style={s.note}>各120語のうち{LEVEL_ADVANCE_WORDS}語（80%）を習得すると次へ進みます。残った未習得語も引き続き出題します。別々の学習セットで2回連続正解すると習得です。</Text>
    {levelProgress(mastery).map(l => <View key={l.level} testID={`level-${l.level}`} style={[s.item, l.level === active && !l.complete && s.active]}>
      <Text style={s.name}>レベル{l.level} · {l.title}</Text>
      <Text style={s.note}>{l.complete ? '習得済み' : l.level < active || (l.level === active && l.advanceReady) ? '8割達成・復習中' : l.level === active ? '学習中' : '未解放'} · {l.mastered} / {l.total}語</Text>
    </View>)}
  </View>;
}
const s = StyleSheet.create({
  title: {fontSize:19,fontWeight:'700',color:'#243e32',marginBottom:8}, note: {fontSize:14,lineHeight:22,color:'#637268'},
  item: {borderWidth:1,borderColor:'#e1e7dc',borderRadius:12,padding:12,marginTop:10}, active: {borderColor:'#245d4a',backgroundColor:'#edf3e6'}, name: {fontWeight:'700',color:'#243e32',fontSize:15},
});
