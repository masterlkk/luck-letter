export const QUESTIONS = [
  { id:'focus',title:'最近，你最想让哪一件事变顺？',hint:'就选此刻最在意的那一件。',options:[['career','工作 / 学业','想让努力被看见'],['relationship','亲密关系','想靠近，也想被理解'],['money','钱与生活安排','想多一点从容'],['self','我自己的状态','想找回轻盈的感觉']] },
  { id:'week',title:'过去一周，哪句话最像你？',hint:'没有标准答案，照顾自己的真实感受就好。',options:[['busy','做了很多，自己的事却没推进','一直在回应别人的需求'],['waiting','有件事，一直在等一个回应','想知道下一步该往哪里走'],['ready','有一点新想法，正准备行动','期待改变，也有一点犹豫'],['steady','日子还算平稳，想有一点新鲜感','想给生活打开一扇小窗']] },
  { id:'response',title:'计划突然被打乱，你通常会……',hint:'想想最近一次发生的时候。',options:[['adapt','先调整，找到能继续做的部分','一步一步，把事情接住'],['overthink','反复想哪里出了问题','希望把事情考虑周全'],['pause','先缓一缓，再整理思绪','给自己一点重新出发的空间'],['push','想办法尽快追回进度','不太愿意轻易放下目标']] },
  { id:'boundary',title:'别人临时来找你帮忙，你更像哪一种？',hint:'体贴别人，也可以把自己放进考虑里。',options:[['yes','往往先答应，再安排自己的事','不太想让别人失望'],['check','先看看自己的时间，再回复','希望双方都能踏实一点'],['hesitate','想拒绝，但会纠结很久','担心影响彼此的关系'],['clear','会说清楚自己能帮到哪里','愿意帮忙，也保留边界']] },
  { id:'pressure',title:'现在，最消耗你的是哪一种感觉？',hint:'承认疲惫，也是认真照顾自己。',options:[['overload','事情太多，没有自己的空隙','想把力气慢慢收回来'],['uncertain','结果未知，不知道等不等得到','想多一点确定感'],['choice','选择太多，迟迟定不下来','想找到值得投入的方向'],['connection','有些话，始终没有说清楚','想要更舒适的相处']] },
  { id:'wish',title:'如果这周只让一件事变好，你会选？',hint:'最后一题，把愿望留给真正重要的事。',options:[['progress','推进一件一直想做的小事','给想法一个开始'],['talk','完成一次真诚的沟通','让关系多一点理解'],['rest','有一段不被打扰的休息','把自己重新充满'],['order','整理好时间、支出或生活空间','让日子更有秩序']] }
];

export const DIMENSIONS = [
  {id:'career',title:'事业 / 学业',short:'事业'}, {id:'relationship',title:'情感互动',short:'情感'},
  {id:'social',title:'人际支持',short:'人际'}, {id:'money',title:'财务节奏',short:'财务'}, {id:'energy',title:'生活能量',short:'能量'}
];

export function normalizeAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请完成全部六道题。');
  const answers = {};
  for (const q of QUESTIONS) {
    if (!q.options.some(o=>o[0]===input[q.id])) throw new Error('请完成全部六道题。');
    answers[q.id] = input[q.id];
  }
  return answers;
}

export function answerLabels(answers) {
  return QUESTIONS.map(q=>({id:q.id,question:q.title,answer:q.options.find(o=>o[0]===answers[q.id])?.[1] || ''}));
}

const WEIGHTS = {
  busy:[-8,-3,3,-2,-14],waiting:[-5,-6,-3,0,-5],ready:[10,0,2,1,7],steady:[3,3,3,5,5],
  adapt:[8,3,4,3,5],overthink:[-4,-2,-2,0,-7],pause:[0,1,0,1,3],push:[8,-2,-2,1,-5],
  yes:[-2,1,5,-1,-8],check:[4,4,5,4,6],hesitate:[-3,-4,0,-2,-6],clear:[5,5,4,5,6],
  overload:[-3,-1,-2,-2,-8],uncertain:[-3,-4,-1,-3,-4],choice:[-5,0,0,-3,-2],connection:[-1,-7,-4,0,-3],
  progress:[6,0,0,1,2],talk:[0,7,5,0,2],rest:[0,1,0,1,8],order:[3,0,1,7,3]
};
export function calculateProfile(input) {
  const answers=normalizeAnswers(input),scores=[69,70,71,70,69];
  for(const key of ['week','response','boundary','pressure','wish']) {
    const weights=WEIGHTS[answers[key]];scores.forEach((_,index)=>scores[index]+=weights[index]);
  }
  const values=scores.map(v=>Math.max(35,Math.min(94,v)));
  return {score:Math.round(values.reduce((sum,n)=>sum+n,0)/values.length),dimensions:DIMENSIONS.map((d,i)=>({...d,score:values[i]}))};
}

const ARCHETYPES = {
  boundary:{name:'温柔的边界建立者',theme:'把一点温柔，也留给自己。',word:'留白',color:'苔绿',strength:'你愿意照顾别人的感受',quotes:['温柔可以有边界。','我正在把力气还给自己。','把自己，也放进重要的人里。']},
  start:{name:'悄悄发光的行动者',theme:'小小的开始，也会带来回响。',word:'启程',color:'晨金',strength:'你愿意认真对待新的想法',quotes:['先走一步，答案会慢慢清晰。','小小的开始，也值得庆祝。','把期待，变成今天的一小步。']},
  clarity:{name:'寻找晴天的观察者',theme:'答案，可以从一个小决定开始。',word:'清晰',color:'雾蓝',strength:'你愿意把选择想得更周全',quotes:['先照顾今天，再等待答案。','慢慢来，也可以很有力量。','我允许自己，边走边清晰。']},
  connection:{name:'认真靠近的倾听者',theme:'你想说的话，值得被好好听见。',word:'靠近',color:'暖杏',strength:'你愿意为关系留出理解的空间',quotes:['真诚，也包括说出我的需要。','好的靠近，让彼此更自在。','我的感受，也值得被听见。']}
};
const DIRECTION = {
  career:{summary:'把注意力放回一件能完成的事情，推进感会更容易出现。',opportunity:'给重要的小事留一个不被打断的时间段。',caution:'同时追赶多个目标，可能让你难以感受到进展。',action:'选一件事，写下今天能完成的第一步。'},
  relationship:{summary:'清楚表达自己的感受，有助于减少不必要的猜测。',opportunity:'在双方有余裕的时候，说一件具体的小事。',caution:'若对方回复较慢，先了解情况，再解读其用意。',action:'用「我感受到……我希望……」开启一次沟通。'},
  social:{summary:'互相支持的关系，通常需要给与和接受都有空间。',opportunity:'找一位信任的人，分享一个小近况。',caution:'在答应额外请求前，确认自己的时间和力气。',action:'下一次被请求帮忙，先说清楚自己能做的部分。'},
  money:{summary:'把日常安排看清楚，会让生活多一点可掌握的感觉。',opportunity:'整理一次近期支出和已经确定的安排。',caution:'如果购物是为了缓解情绪，可以先留一点考虑时间。',action:'给一笔非必要购买留出一天的考虑时间。'},
  energy:{summary:'为恢复留空间，也是让计划顺利推进的一部分。',opportunity:'给自己一个不用回应消息的小空隙。',caution:'若这周继续排满，留意自己是否已经需要暂停。',action:'预留半小时，做一件让自己感到放松的小事。'}
};

export function buildSampleReport(input) {
  const answers=normalizeAnswers(input),profile=calculateProfile(answers);
  const type=['yes','hesitate'].includes(answers.boundary)?'boundary':answers.pressure==='connection'||answers.wish==='talk'?'connection':answers.week==='ready'||answers.wish==='progress'?'start':'clarity';
  const a=ARCHETYPES[type],labels=answerLabels(answers);
  const first=labels.find(x=>x.id==='week').answer,second=labels.find(x=>x.id==='wish').answer;
  return {
    version:1,mode:'experience',createdAt:new Date().toISOString(),...profile,
    archetype:a.name,theme:a.theme,
    letter:`你提到「${first}」，也希望「${second}」。这些回答里，既有你正在承受的事，也有你想照顾好的方向。接下来七天，可以先把这个愿望拆成一件不需要很用力的小事。给自己一个可完成的开始，让进展和休息都在生活里有位置。`,
    strength:{title:a.strength,body:`你的选择说明，你正在认真面对自己的处境。愿意说清楚现在的需要，就是调整节奏的起点。这周，可以把这种认真用在一件对自己重要的事情上。`},
    dimensions:profile.dimensions.map(d=>({...d,...DIRECTION[d.id]})),
    evidence:[{questionId:'week',interpretation:'这是这封来信理解你近期处境的起点。'},{questionId:'wish',interpretation:'这决定了行动建议优先照顾的方向。'}],
    timeline:[{label:'第 1—2 天',theme:'先整理，再出发',advice:'写下最占心力的一件事，区分能做的和需要等待的。'},{label:'第 3—5 天',theme:'做一个小尝试',advice:DIRECTION[answers.focus==='self'?'energy':answers.focus].action},{label:'第 6—7 天',theme:'把一点进展看见',advice:'回顾一次：什么让你更轻松？把有用的做法留下来。'}],
    reminders:[DIRECTION.energy.caution,DIRECTION.social.caution],
    actions:[DIRECTION[answers.focus==='self'?'energy':answers.focus].action,DIRECTION.social.action,'睡前记下一件今天已经完成的小事。'],
    quotes:a.quotes,lucky:{word:a.word,color:a.color,ritual:'给自己写一句鼓励，放在每天都能看到的地方。'}
  };
}

function text(value,max=240) {
  if(typeof value!=='string'||!value.trim()||value.length>max) throw new Error('解读内容不完整，请重试。');
  return value.trim();
}
export function validateModelReport(value,answers) {
  if(!value||typeof value!=='object') throw new Error('解读内容不完整，请重试。');
  const profile=calculateProfile(answers);
  if(!Array.isArray(value.dimensions)||value.dimensions.length!==5) throw new Error('解读维度不完整，请重试。');
  const dimensions=profile.dimensions.map(d=>{
    const item=value.dimensions.find(x=>x.id===d.id);if(!item)throw new Error('解读维度不完整，请重试。');
    return {...d,...Object.fromEntries(['summary','opportunity','caution','action'].map(k=>[k,text(item[k],180)]))};
  });
  const list=(items,min,max,length)=>{if(!Array.isArray(items)||items.length<min||items.length>max)throw new Error('解读内容不完整，请重试。');return items.map(x=>text(x,length));};
  if(!Array.isArray(value.timeline)||value.timeline.length!==3)throw new Error('解读计划不完整，请重试。');
  if(!Array.isArray(value.evidence)||value.evidence.length<2||value.evidence.length>4)throw new Error('解读依据不完整，请重试。');
  const evidence=value.evidence.map(e=>{if(!QUESTIONS.some(q=>q.id===e.questionId))throw new Error('解读依据无效，请重试。');return {questionId:e.questionId,interpretation:text(e.interpretation,180)};});
  return {version:1,mode:'ai',createdAt:new Date().toISOString(),...profile,archetype:text(value.archetype,18),theme:text(value.theme,40),letter:text(value.letter,600),strength:{title:text(value.strength?.title,40),body:text(value.strength?.body,240)},dimensions,evidence,
    timeline:value.timeline.map((t,i)=>({label:['第 1—2 天','第 3—5 天','第 6—7 天'][i],theme:text(t.theme,24),advice:text(t.advice,180)})),
    reminders:list(value.reminders,2,3,160),actions:list(value.actions,3,3,90),quotes:list(value.quotes,3,3,28),lucky:{word:text(value.lucky?.word,8),color:text(value.lucky?.color,12),ritual:text(value.lucky?.ritual,80)}};
}

export const SAMPLE_ANSWERS = {focus:'career',week:'busy',response:'adapt',boundary:'yes',pressure:'overload',wish:'rest'};
