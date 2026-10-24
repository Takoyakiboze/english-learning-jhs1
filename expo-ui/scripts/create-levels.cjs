// Initial editorial ordering. The generated 10 x 120 assignments are committed and
// are NOT recalculated by curriculum:build, so adding vocabulary cannot move levels.
const fs = require('node:fs');
const path = require('node:path');
const words = require('../src/curriculum/words.json');
const bands = [
  `I you he she it we they my your his her our their this that these those a an the
   one two three four five six seven eight nine ten yes no hello goodbye please
   mother father brother sister friend teacher student school book pen pencil desk chair bag
   cat dog bird fish apple orange banana egg milk water bread rice cake ball game music
   sun moon star tree flower red blue yellow green black white big small good bad happy sad
   be have do go come get give take make use like want eat drink see look read write
   speak listen play run walk swim sing day morning night home name time`,
  `me him us them its mine yours who what where when how can not and but or in on at to from with
   family grandmother grandfather parent child baby boy girl man woman people English Japanese
   notebook textbook dictionary ruler eraser clock watch window door room house kitchen bed table
   head face eye ear nose mouth hand arm leg foot hair body
   Sunday Monday Tuesday Wednesday Thursday Friday Saturday today tomorrow yesterday now
   eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty
   first second third next last all every some many much
   learn study teach know think say tell ask answer help meet live love enjoy cook wash sleep stop sit stand jump ride buy open close
   new old young tall long short hot cold warm cool hungry thirsty tired beautiful nice kind`,
  `whose which why there here more other another any each both nothing something everyone
   February January March April May June July August September October November December
   hundred thousand zero sixty seventy eighty ninety week month year hour minute afternoon evening birthday weekend lunch dinner breakfast food fruit vegetable
   horse cow pig sheep duck rabbit animal pet chocolate potato tomato carrot cheese butter tea juice soup sandwich pizza salad
   mother father aunt uncle cousin son daughter
   classroom class lesson subject homework test quiz grade number question word sentence meaning story picture photo
   park zoo city town village bus train car bike bicycle station airport shop store restaurant hospital library gym pool
   learn write draw dance listen watch run swim eat talk speak tell read
   dark bright clean dirty full empty open closed fast slow hard soft high low wet dry right wrong true false
   cut hit kick throw catch push pull grow win lose page letter`,
  `school uniform science math history art sport soccer baseball tennis basketball volleyball badminton
   clothes shirt coat jacket sweater hat skirt dress shoe sock pants shorts glasses
   river sea mountain forest sky cloud rain snow wind spring summer autumn fall winter
   nose tooth knee shoulder stomach back finger
   brown pink purple gray color size round heavy soft clean dirty fast slow early late busy free quiet noisy easy difficult cute great interesting favorite
   feel hear find bring carry hold put keep move turn start begin finish wait try visit stay leave arrive return wake wear send show thank welcome smile laugh cry
   after before by under near for of about up down left right north south east west into
   usually always often sometimes never again too very also together once twice`,
  `worker doctor nurse dentist farmer driver pilot actor artist singer dancer writer player coach team group king queen
   travel trip holiday vacation hotel ticket map road street bridge corner beach island garden yard garage
   notebook camera computer phone smartphone screen keyboard internet website email message video app
   money coin price gift present plan date calendar party festival meeting event
   bread meat beef pork chicken ham pasta spaghetti seafood corn jam candy dessert snack bottle cup glass plate bowl spoon fork knife menu
   important useful safe dangerous strong weak healthy sick ready glad angry lonely funny friendly careful polite shy lucky
   remember forget understand believe need choose decide spell repeat count check explain follow join invite introduce share collect pay sell borrow lend`,
];
const rank = new Map();
const known = new Set(words.map(w => w.word));
bands.forEach((text, i) => text.trim().split(/\s+/).forEach(w => { if (known.has(w) && !rank.has(w)) rank.set(w, i); }));
const categoryRank = {'家族・人':5,'人・仕事':7,'動物':6,'食べ物':5,'食事・飲み物':6,'学校・持ち物':6,'家・日用品':7,'体・健康':6,'服・身につける物':6,'町・移動':7,'自然・天気':7,'時間・行事':6,'色・形・大きさ':6,'気持ち・性格':8,'性質・状態':8,'趣味・社会':9,'基本の動作':8,'代名詞・疑問詞':6,'前置詞・接続詞':8,'数・基本語':7};
const sorted = [...words].sort((a,b) => {
  const ar = rank.get(a.word) ?? categoryRank[a.category];
  const br = rank.get(b.word) ?? categoryRank[b.category];
  return ar - br || a.word.length - b.word.length || a.word.localeCompare(b.word, 'en');
});
const titles = ['はじめの英単語','身近なことば','毎日のくらし','学校と日常','日常の表現を広げる','身の回りを詳しく','町・自然・時間','動作と伝え方','気持ちと考え','社会と発展表現'];
const groups = titles.map((title,i) => ({level:i+1,title,words:sorted.slice(i*120,(i+1)*120).map(w=>w.word)}));
fs.writeFileSync(path.join(__dirname,'../curriculum-source/levels.json'),JSON.stringify(groups,null,2)+'\n');
console.log(groups.map(g=>({level:g.level,title:g.title,count:g.words.length,examples:g.words.slice(0,8)})));
