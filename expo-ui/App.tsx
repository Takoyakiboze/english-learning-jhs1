import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import VocabularyBrowser from './src/VocabularyBrowser';
import LearningQuestion from './src/LearningQuestion';
import LevelOverview from './src/LevelOverview';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildQuestions, buildLearningSession, isCorrectAnswer, words, Question, SESSION_SIZE, ASSESSMENT_SIZE } from './src/learning';
import { decodeMistakes, recordPracticeAnswer, MISTAKES_STORAGE_KEY, type MistakeRecord } from './src/mistakes';
import { applyMasterySession, decodeMastery, levelProgress, LEVEL_ADVANCE_WORDS, PROGRESS_STORAGE_KEY, type MasteryRecord, type PracticeResult } from './src/mastery';

type Page = 'ホーム'|'学習'|'結果'|'報酬'|'記録'|'目標'|'設定';
type Entry = { id:number; score:number; test:boolean; wrong:string[]; level:number };
export default function App() {
 const [ready,R]=useState(false),[name,N]=useState('はる'),[target,T]=useState('ゲーム');
 const params=useLocalSearchParams<{screen?:Page}>();
 const page:Page=params.screen||'ホーム';
 const P=(screen:Page)=>router.setParams({screen});
 const [goal,G]=useState('基礎英単語'),[balance,B]=useState(0),[active,U]=useState(false);
 const [qs,Q]=useState<Question[]>([]),[idx,I]=useState(0),[answer,V]=useState(''),[feedback,F]=useState<boolean|null>(null);
 const [score,S]=useState(0),[wrong,W]=useState<string[]>([]),[test,X]=useState(false),[records,H]=useState<Entry[]>([]),[notice,M]=useState('');
 const [mistakes,setMistakes]=useState<MistakeRecord[]>([]);
 const [mastery,setMastery]=useState<MasteryRecord[]>([]);
 const [sessionLevel,setSessionLevel]=useState(1);
 const sessionId=useRef('');
 const sessionResults=useRef<PracticeResult[]>([]);
 const sessionCommitted=useRef(false);
 const answered=useRef(false);
 const stages=useMemo(()=>levelProgress(mastery),[mastery]);
 const activeLevel=stages.find(l=>!l.advanceReady)?.level ?? 10;
 const stage=stages[activeLevel-1];
 const unlockedIds=new Set(words.filter(w=>w.level<=activeLevel).map(w=>w.id));
 const eligibleMistakes=mistakes.filter(m=>unlockedIds.has(m.wordId));
 const masteredIds=new Set(mastery.filter(m=>m.mastered).map(m=>m.wordId));
 const earlierPending=words.filter(w=>w.level<activeLevel&&!masteredIds.has(w.id)).length;
 const [historyLoaded,setHistoryLoaded]=useState(false);
 const [saveHistory,setSaveHistory]=useState(true);
 const saveQueue=useRef(Promise.resolve());
 useEffect(()=>{
  let mounted=true;
  Promise.all([AsyncStorage.getItem(MISTAKES_STORAGE_KEY),AsyncStorage.getItem(PROGRESS_STORAGE_KEY)]).then(([rawMistakes,rawMastery])=>{
   const restoredMistakes=decodeMistakes(rawMistakes),restoredMastery=decodeMastery(rawMastery);
   if(mounted){setMistakes(restoredMistakes);setMastery(restoredMastery);setHistoryLoaded(true);}
  }).catch(()=>{if(mounted){setSaveHistory(false);setHistoryLoaded(true);M('学習履歴を読み込めませんでした。この起動中の履歴で続けます。');}});
  return()=>{mounted=false;};
 },[]);
 useEffect(()=>{
  if(!historyLoaded||!saveHistory)return;
  const payload=JSON.stringify({version:1,records:mistakes});
  const progress=JSON.stringify({version:1,curriculum:'levels-v1',records:mastery});
  saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>AsyncStorage.multiSet([[MISTAKES_STORAGE_KEY,payload],[PROGRESS_STORAGE_KEY,progress]]));
  saveQueue.current.catch(()=>M('学習履歴を保存できませんでした。端末の空き容量などを確認してください。'));
 },[mistakes,mastery,historyLoaded,saveHistory]);
 const scroll=useRef<ScrollViewInstance>(null);
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[page,idx]);
 const q=qs[idx], last=records[0];
 const go=(p:Page)=>{M('');P(p);};
 const start=(t=false)=>{if(!historyLoaded){M('学習履歴を読み込んでいます。少し待ってから始めてください。');return;}sessionId.current=`${Date.now()}-${Math.random()}`;sessionResults.current=[];sessionCommitted.current=false;answered.current=false;setSessionLevel(activeLevel);Q(t?buildQuestions(ASSESSMENT_SIZE,Math.random,words.filter(w=>w.level===activeLevel)):buildLearningSession(mistakes,Math.random,mastery));I(0);V('');F(null);S(0);W([]);X(t);go('学習');};
 const check=()=>{if(!answer.trim()||feedback!==null||answered.current)return; answered.current=true; const ok=isCorrectAnswer(q,answer);F(ok);setMistakes(m=>recordPracticeAnswer(m,q.id,ok));if(!q.review){sessionResults.current.push({wordId:q.id,correct:ok});if(ok)S(s=>s+1);else{W(w=>[...w,q.word]);Q(a=>[...a,{...q,review:true}]);}}};
 const next=()=>{if(feedback===false&&!isCorrectAnswer(q,answer)){M('正しい答えを選択・入力してから進もう。');return;}M('');if(idx+1<qs.length){answered.current=false;I(i=>i+1);V('');F(null);}else{if(sessionCommitted.current)return;sessionCommitted.current=true;if(!test){const results=[...sessionResults.current],id=sessionId.current;setMastery(m=>applyMasterySession(m,results,id));}H(h=>[{id:Date.now(),score,test,wrong,level:sessionLevel},...h]);if(!test&&score===SESSION_SIZE)B(b=>b+10);go('結果');}};
 const btn=(text:string,fn:()=>void,soft=false,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={fn} disabled={disabled} style={[s.btn,soft&&s.soft,disabled&&{opacity:.4}]}><Text style={[s.btnText,soft&&{color:'#245d4a'}]}>{text}</Text></Pressable>;
 const card=(children:React.ReactNode)=><View style={s.card}>{children}</View>;
 const title=(text:string,sub:string)=><View style={{marginBottom:20}}><Text style={s.title}>{text}</Text><Text style={s.muted}>{sub}</Text></View>;
 const chips=(items:string[],value:string,set:(v:string)=>void)=><View style={s.row}>{items.map(v=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:v===value}} onPress={()=>set(v)} style={[s.chip,v===value&&s.chosen]}><Text style={{color:v===value?'white':'#245d4a'}}>{v}</Text></Pressable>)}</View>;
 if(ready&&page==='学習'&&q) return <><StatusBar style="dark"/><LearningQuestion key={`${test}-${idx}`} question={q} progress={q.review?'復習タイム · 初回の点数は変わりません':`${test?'確認テスト':'今日の学習'} · Lv.${sessionLevel} · ${idx+1} / ${test?ASSESSMENT_SIZE:SESSION_SIZE} 問`} answer={answer} feedback={feedback} notice={notice} last={idx+1===qs.length} onAnswer={V} onCheck={check} onNext={next} onExit={()=>go('ホーム')}/></>;
 return <View style={s.shell}><StatusBar style="dark"/><View style={s.header}><Text style={s.logo}>ことばの時間</Text><Text style={s.badge}>UIプレビュー</Text></View><ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
 {!ready?<><Text style={s.welcome}>学ぶ時間が、{'\n'}楽しむ時間に。</Text><Text style={s.muted}>英単語を20問クリアして、好きなアプリの時間を手に入れよう。</Text>{card(<><Text style={s.h2}>はじめの設定</Text><Text style={s.label}>呼び名</Text><TextInput accessibilityLabel="呼び名" value={name} onChangeText={N} maxLength={20} style={s.input}/><Text style={s.label}>ごほうびの対象</Text>{chips(['ゲーム','動画','ゲーム・動画'],target,T)}<Text style={s.muted}>UI検証版です。ほかのアプリを実際に制限・解除する機能はありません。</Text></>)}{btn('この設定ではじめる',()=>R(true),false,!name.trim())}</>:<>
 {page==='ホーム'&&<>{title(`${name}さん、こんにちは。`,'今日も、ひとつずつ覚えていこう。')}<View style={s.hero}><Text style={s.kicker}>TODAY’S CHALLENGE</Text><Text style={s.heroText}>20問全問正解で{'\n'}10分のごほうび</Text><Text style={{color:'#dceee2'}}>四択・スペル・穴埋め ／ {goal} · {words.length.toLocaleString()}語</Text><Text style={{color:'#dceee2',marginTop:8}}>レベル{activeLevel} · {stage.title} · 習得{stage.mastered}/120語</Text><Text style={{color:'#dceee2',marginTop:8}}>各レベルの目標：{LEVEL_ADVANCE_WORDS}語（80%）の習得</Text>{btn('今日の学習をはじめる →',()=>start(),true,!historyLoaded)}</View><View style={s.row}>{card(<><Text style={s.muted}>現在使える時間</Text><Text style={s.big}>{balance}<Text style={s.unit}> 分</Text></Text><Text>{target}のごほうび</Text></>)}{card(<><Text style={s.muted}>完了した学習</Text><Text style={s.big}>{records.filter(r=>!r.test).length}<Text style={s.unit}> 回</Text></Text><Text>積み重ねを大切に</Text></>)}</View>{card(<><Text style={s.h2}>今日の復習</Text><Text style={s.muted}>{eligibleMistakes.length ? '苦手単語は'+eligibleMistakes.length+'語。20問のうち最大5問を優先して復習します。' : 'まずは20問。苦手な単語を一緒に見つけよう。'}</Text>{earlierPending>0&&<Text style={s.muted}>前のレベルの未習得語：{earlierPending}語。20問の中に最大5問を追加して復習します。</Text>}{btn('復習する',()=>start(),true,!historyLoaded)}</>)}{card(<><Text style={s.h2}>実力をチェック</Text><Text style={s.muted}>現在のレベルから10問出題。テストは習得判定に含めません。</Text>{btn('確認テストを受ける',()=>start(true),true,!historyLoaded)}</>)}</>}
 {page==='結果'&&last&&<>{title(last.test?'実力チェックの結果':last.score===SESSION_SIZE?'おめでとう！全問正解':'よくがんばったね！','学んだことを、次の一歩に。')}{card(<><Text style={s.kicker}>初回回答の結果</Text><Text style={s.big}>{last.score}<Text style={s.unit}> / {last.test?ASSESSMENT_SIZE:SESSION_SIZE} 問</Text></Text><Text style={s.h2}>{last.test?'いまの実力を知る一歩':last.score===SESSION_SIZE?'10分のごほうびを獲得！':'あと一歩。次の20問に挑戦しよう'}</Text><Text style={s.muted}>{last.test?'テストでは報酬・難易度の自動変更はありません。':'合格は初回20問すべて正解。訂正・復習は点数に加算しません。'}</Text>{last.wrong.length>0&&<Text>復習した単語：{last.wrong.join(' / ')}</Text>}</>)}{!last.test&&card(<><Text style={s.h2}>{stages.every(l=>l.complete)?'全10レベルを習得しました！':stages.every(l=>l.advanceReady)?'全10レベルで8割を習得！残りの単語も復習しよう。':stages[last.level-1].advanceReady?'レベル'+last.level+'で8割を習得！次のレベルへ進めます。':'レベル'+last.level+'の習得状況'}</Text><Text>習得{stages[last.level-1].mastered}/120語</Text><Text style={s.muted}>別のセットでも正解して定着させよう。訂正・追加復習は習得回数に含めません。</Text></>)}{btn('ごほうびを確認',()=>go('報酬'))}{btn('もう1セット学ぶ',()=>start(),true,!historyLoaded)}{btn('ホームへ',()=>go('ホーム'),true)}</>}
 {page==='報酬'&&<>{title('ごほうびの時間','がんばって手に入れた、楽しむ時間。')}<View style={s.hero}><Text style={{color:'#dceee2'}}>利用できる時間</Text><Text style={[s.big,{color:'white'}]}>{balance}<Text style={s.unit}> 分</Text></Text><Text style={{color:'#dceee2'}}>対象：{target}</Text></View>{card(<><Text style={s.h2}>{active?'利用中（デモ）':'学習のあとに、楽しもう'}</Text><Text style={s.muted}>利用開始と再制限の表示を確認できます。実際の制御や時間の精算は行いません。</Text>{active?btn('利用終了・再制限を確認',()=>{U(false);M('再制限のデモ表示に戻りました。残高の消費は行っていません。');}):btn('利用をはじめる',()=>U(true),false,balance===0)}{balance===0&&btn('学習して時間をためる',()=>start(),true,!historyLoaded)}</>)}{card(<><Text style={s.h2}>獲得履歴</Text>{records.filter(r=>!r.test&&r.score===SESSION_SIZE).length===0?<Text style={s.muted}>まだごほうびがありません。</Text>:records.filter(r=>!r.test&&r.score===SESSION_SIZE).map(r=><Text key={r.id} style={s.history}>全問正解　＋10分</Text>)}</>)}</>}
 {page==='記録'&&<>{title('学習の記録','できたことも、苦手なことも、次の一歩に。')}{card(<><Text style={s.h2}>これまでの結果</Text>{records.length===0?<Text style={s.muted}>まだ記録がありません。</Text>:records.map(r=><View key={r.id} style={s.history}><Text>{r.test?'実力確認':'通常学習'}　{r.score}/{r.test?ASSESSMENT_SIZE:SESSION_SIZE}問</Text><Text style={s.muted}>{new Date(r.id).toLocaleString('ja-JP')} · {r.wrong.length?r.wrong.join(', '):'全問正解'}</Text></View>)}</>)}{card(<VocabularyBrowser mastery={mastery}/>)}</>}
 {page==='目標'&&<>{title('学習の目標','自分のペースで、少しずつ。')}{card(<><Text style={s.h2}>学習したい範囲</Text>{chips(['基礎英単語','学校の復習','テスト対策'],goal,G)}<Text style={s.muted}>1,200語を難易度順の10レベル（各120語）に分けています。現在のレベルで{LEVEL_ADVANCE_WORDS}語（8割）を習得すると次へ進みます。前のレベルの未習得語も出題します。</Text><Text style={s.label}>1日の目標</Text><Text style={s.question}>20問 × 1セット</Text><Text>初回20問すべて正解で合格。</Text><Text style={s.muted}>過去に間違えた単語があれば、うち5問を復習にします。5語未満ならその全語を出題します。さらに、前のレベルの未習得語を最大5問追加します。</Text></>)}{card(<LevelOverview mastery={mastery}/>)}{btn('この目標で学ぶ',()=>start(),false,!historyLoaded)}</>}
 {page==='設定'&&<>{title('保護者の設定','画面確認用です。本人認証はありません。')}{card(<><Text style={s.label}>子供の呼び名</Text><TextInput accessibilityLabel="子供の呼び名" style={s.input} value={name} onChangeText={N} maxLength={20}/><Text style={s.label}>対象アプリ（デモ）</Text>{chips(['ゲーム','動画','ゲーム・動画'],target,T)}<Text style={s.label}>学習・報酬の条件</Text><Text>20問全問正解 ／ 基本報酬10分</Text><Text style={s.muted}>継続倍率・消費精算・設定変更時の処理は対象外です。</Text><Text style={s.label}>レベル進行</Text><Text>現在レベル{activeLevel} · 習得{stage.mastered}/120語</Text><Text style={s.muted}>別々の学習セットで2回連続正解した単語を習得済みとします。{LEVEL_ADVANCE_WORDS}語（8割）を習得すると次のレベルが開きます。残りの未習得語も次のレベルで復習します。</Text></>)}{card(<><Text style={s.h2}>例外解除を確認</Text><Text style={s.muted}>緊急時の画面を確認するためのデモです。</Text>{btn('例外解除のデモ',()=>{U(true);go('報酬');},true)}</>)}{btn('検証データを初期化',()=>{H([]);B(0);U(false);setMistakes([]);setMastery([]);setSaveHistory(true);M('学習記録・報酬・復習履歴・習得状況を初期化しました。');},true)}<Text style={s.muted}>間違えた単語と習得状況は端末に保存します。学習結果・報酬・設定は再読み込みで初期状態に戻ります。</Text></>}
 </>}
 {!!notice&&<View accessibilityLiveRegion="polite" style={s.feedback}><Text>{notice}</Text></View>}
 </ScrollView>{ready&&page!=='学習'&&<View style={s.nav}>{(['ホーム','報酬','記録','目標','設定'] as Page[]).map(t=><Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:page===t}} onPress={()=>go(t)} style={[s.navItem,page===t&&s.navActive]}><Text style={{color:'#245d4a',fontWeight:page===t?'700':'400'}}>{t}</Text></Pressable>)}</View>}</View>;
}
const s=StyleSheet.create({
 shell:{flex:1,backgroundColor:'#f4f5ef',paddingTop:Platform.OS==='ios'?52:24,paddingBottom:Platform.OS==='ios'?22:8},header:{paddingHorizontal:24,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},logo:{fontSize:20,fontWeight:'800',color:'#245d4a'},badge:{fontSize:11,color:'#637268',padding:8,backgroundColor:'#e4e9df',borderRadius:12},content:{width:'100%',maxWidth:820,alignSelf:'center',padding:24,paddingBottom:40},title:{fontSize:27,fontWeight:'800',color:'#243e32',marginBottom:8},welcome:{fontSize:36,lineHeight:48,fontWeight:'800',color:'#245d4a',marginVertical:30},hero:{backgroundColor:'#245d4a',padding:28,borderRadius:28,marginBottom:20},heroText:{fontSize:34,lineHeight:46,color:'white',fontWeight:'800',marginVertical:16},kicker:{fontSize:12,fontWeight:'700',letterSpacing:1,color:'#8b9b64'},card:{backgroundColor:'white',borderRadius:22,padding:22,marginBottom:16,flexGrow:1,flexShrink:0},h2:{fontSize:19,fontWeight:'700',color:'#243e32',marginBottom:10},muted:{fontSize:14,color:'#6a766d',lineHeight:23,marginVertical:8},big:{fontSize:52,fontWeight:'800',color:'#245d4a',marginVertical:10},unit:{fontSize:18},row:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center',marginVertical:8},btn:{minHeight:52,padding:16,borderRadius:16,backgroundColor:'#245d4a',alignItems:'center',justifyContent:'center',marginTop:12},soft:{backgroundColor:'#e9efdf'},btnText:{fontSize:16,fontWeight:'700',color:'white'},input:{borderWidth:1,borderColor:'#d6ded3',borderRadius:14,padding:16,fontSize:18,color:'#243e32',backgroundColor:'#fafbf7',minHeight:54},label:{fontSize:14,fontWeight:'700',color:'#536651',marginTop:16,marginBottom:10},chip:{borderRadius:30,paddingHorizontal:16,paddingVertical:12,backgroundColor:'#edf1e8'},chosen:{backgroundColor:'#245d4a'},question:{fontSize:32,lineHeight:44,color:'#243e32',fontWeight:'700',marginVertical:28},option:{borderWidth:2,borderColor:'#e5eade',borderRadius:16,padding:18,marginBottom:12},optionSelected:{borderColor:'#245d4a',backgroundColor:'#edf3e6'},feedback:{padding:18,borderRadius:16,backgroundColor:'#fff0da',marginVertical:16},track:{height:8,backgroundColor:'#e0e5d9',borderRadius:8,marginBottom:20,overflow:'hidden'},fill:{height:8,backgroundColor:'#8b9b64'},history:{paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#edf0e8'},nav:{flexDirection:'row',backgroundColor:'white',padding:8,borderTopWidth:1,borderTopColor:'#e5eade'},navItem:{flex:1,paddingVertical:15,alignItems:'center',borderRadius:12},navActive:{backgroundColor:'#e9efdf'}
});

