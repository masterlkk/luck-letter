import {QUESTIONS,answerLabels,buildSampleReport,SAMPLE_ANSWERS,validateModelReport} from './domain.mjs';

const app=document.getElementById('app'),modal=document.getElementById('modal');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state={answers:{},step:0,note:'',report:null,sample:false,style:'letter',quote:0,nickname:'',showScore:false,checks:[],status:{aiConfigured:false,reviewsAvailable:false},reviews:null,filter:0,busy:false};
let controller=null,toastTimer;
const storage={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
function persistQuiz(){try{sessionStorage.setItem('luck-quiz',JSON.stringify({answers:state.answers,step:state.step,note:state.note}));}catch{}}
function restoreQuiz(){try{const saved=JSON.parse(sessionStorage.getItem('luck-quiz'));if(saved?.answers){state.answers=Object.fromEntries(QUESTIONS.filter(q=>q.options.some(o=>o[0]===saved.answers[q.id])).map(q=>[q.id,saved.answers[q.id]]));state.step=Math.min(6,Math.max(0,Number(saved.step)||0));state.note=typeof saved.note==='string'?saved.note.slice(0,400):'';}}catch{}}
restoreQuiz();
const apiBase=(()=>{const raw=window.LUCK_CONFIG?.apiBase||'';if(!raw)return '';try{const url=new URL(raw);if(url.protocol==='https:'||['127.0.0.1','localhost'].includes(url.hostname))return url.href.replace(/\/$/,'');}catch{}return '';})();
async function api(path,options={}){
  const response=await fetch(apiBase+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  let data;try{data=await response.json();}catch{throw new Error('服务暂时没有寄来回音，你可以先体验基础来信。');}
  if(!response.ok)throw new Error(data.error||'服务暂时繁忙，请稍后再试。');return data;
}
function toast(message){const el=document.getElementById('toast');clearTimeout(toastTimer);el.textContent=message;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,3200);}
function navigate(route){if(location.hash==='#'+route)renderRoute();else location.hash=route;}
function showModal(title,content){document.getElementById('modal-content').innerHTML=`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button></div>${content}`;modal.showModal();}
function stamp(date){const d=new Date(date||Date.now());return Number.isNaN(d.valueOf())?'好运来信':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit'}).format(d);}

function posterMarkup(report,{style='letter',quote=0,nickname='',showScore=false,mini=false}={}){
  return `<div class="poster ${style==='ticket'?'ticket':''}" role="img" aria-label="${esc(report.quotes[quote])}，${esc(report.archetype)}，好运签语卡">
    <div class="poster-top"><span>${style==='ticket'?'GOOD LUCK PASS<br>本周好运通行证':'GOOD THINGS<br>ARE ON THEIR WAY'}</span><span class="poster-symbol" aria-hidden="true">✳</span></div>
    <div class="poster-body"><div class="poster-label">${style==='ticket'?'TO · 更自在的自己':'写给最近的你'}</div><div class="poster-quote">${esc(report.quotes[quote])}</div><div class="poster-rule"></div><div class="poster-identity">${esc(report.archetype)}</div>${nickname?`<div class="poster-nickname">致 ${esc(nickname)}</div>`:''}</div>
    <div class="poster-bottom"><div><span class="poster-footer-brand">好运来信</span>${showScore?`近期状态 ${report.score}/100`:'愿你遇见好事情'}</div><span>${report.mode==='ai'?'AI 娱乐解读':report.mode==='review'?'用户分享':'体验版 · 娱乐解读'}</span></div>
  </div>`;
}

function renderHome(){
  const sample=buildSampleReport(SAMPLE_ANSWERS);
  app.innerHTML=`<section class="home-hero"><div class="hero-copy"><div class="eyebrow">A LITTLE LUCK, JUST FOR YOU</div><h1>最近的你，<br>值得一封<em>好消息。</em></h1><p class="hero-description">是时候向前一步，还是先把力气还给自己？<br>回答六个问题，让一封来信陪你理清最近的状态，<br>找到未来七天，可以更顺一点的小方向。</p><div class="hero-actions"><button class="primary" data-action="start" type="button">收取我的好运来信 <span aria-hidden="true">↗</span></button><a class="link-button" href="#sample">先读一封示例</a></div><div class="hero-facts"><span>约 90 秒</span><span>五维状态解读</span><span>专属签语分享卡</span></div></div><div class="hero-visual">${posterMarkup(sample)}<p class="hero-caption">一封写给自己的信，也是一份小小的鼓励。</p></div></section>
  <section class="home-promise" aria-label="你将收到什么"><div><span class="promise-number">01</span><div><h3>听见最近的自己</h3><p>从真实回答出发，看看你在意的事、正在投入的力气。</p></div></div><div><span class="promise-number">02</span><div><h3>找到可以做的小事</h3><p>五个维度、一份七日行动建议，让下一步具体一点。</p></div></div><div><span class="promise-number">03</span><div><h3>把喜欢的话带走</h3><p>选一句有共鸣的签语，做成一张属于你的好运卡。</p></div></div></section>
  <section class="home-bottom"><div><h2>每一封回信，都有自己的温度。</h2><p>看看收信人自愿分享的真实感受，也欢迎留下你的声音。</p></div><a class="secondary" href="#reviews">读读大家的回信 <span aria-hidden="true">↗</span></a></section>`;
}

function renderQuiz(){
  if(state.busy){renderPending();return;}
  const final=state.step===6,q=QUESTIONS[state.step];
  app.innerHTML=`<section class="quiz-shell"><div class="quiz-top"><button type="button" data-action="quiz-back">← ${state.step===0?'返回首页':'上一题'}</button><span>${final?'写下最后一点心事':`第 ${state.step+1} / 6 题`}</span></div><div class="progress" role="progressbar" aria-label="答题进度" aria-valuenow="${Math.min(state.step,6)}" aria-valuemin="0" aria-valuemax="6"><span style="width:${state.step/6*100}%"></span></div>
  ${final?`<div class="quiz-heading"><div class="eyebrow">ONE LAST LITTLE THING</div><h1>还有什么，想放进这封信里？</h1><p>可以留下一点心事，也可以直接收信。</p></div><label class="field" for="personal-note">一句想说的话 <span class="small-note">选填 · 不需要填写真实姓名等身份信息</span><textarea id="personal-note" maxlength="400" placeholder="例如：想开始一个新计划，但总是有点犹豫……">${esc(state.note)}</textarea></label><div class="quiz-extras"><h3>${state.status.aiConfigured?'让 AI 为你写一封深度来信':'先收一封基础体验来信'}</h3><p class="small-note">${state.status.aiConfigured?'根据你的选择和补充，梳理五个维度的状态，给出未来七天的行动建议。':'根据六个回答整理状态、行动建议和专属签语。当前体验版不会调用 AI，补充心事也不会上传。'}</p></div>${state.status.aiConfigured?`<label class="checkbox-row"><input id="ai-consent" type="checkbox"><span>我同意将本次回答和补充内容发送给 ${esc(state.status.providerLabel||'阿里云百炼')}，生成娱乐解读。<button class="link-button" type="button" data-action="privacy">查看数据说明</button></span></label>`:''}<div class="quiz-nav"><span class="small-note">${state.status.aiConfigured?'AI 深度解读 · 仅供自我探索':'基础体验 · 免费收信'}</span><button class="primary" type="button" data-action="analyze">${state.status.aiConfigured?'写下我的好运来信':'收取我的体验来信'} <span aria-hidden="true">↗</span></button></div><p id="quiz-error" class="inline-error" role="alert"></p>`:
  `<div class="quiz-heading"><h1>${esc(q.title)}</h1><p>${esc(q.hint)}</p></div><fieldset class="quiz-options"><legend class="sr-only">${esc(q.title)}</legend>${q.options.map((option,index)=>`<label class="quiz-option"><input type="radio" name="${q.id}" value="${option[0]}" ${state.answers[q.id]===option[0]?'checked':''}><span class="option-mark" aria-hidden="true">${state.answers[q.id]===option[0]?'✓':String.fromCharCode(65+index)}</span><span><strong>${esc(option[1])}</strong><small>${esc(option[2])}</small></span></label>`).join('')}</fieldset><div class="quiz-nav"><span class="small-note">按你的真实感受选择就好。</span><button class="primary" type="button" data-action="quiz-next" ${state.answers[q.id]?'':'disabled'}>${state.step===5?'回答好了':'下一题'} <span aria-hidden="true">→</span></button></div>`}</section>`;
}

function renderPending(){app.innerHTML=`<section class="pending"><span class="pending-mark" aria-hidden="true">✳</span><div class="eyebrow" style="justify-content:center">A LETTER IS ON ITS WAY</div><h1>一封写给你的信，正在路上。</h1><p>正在根据你的回答整理近期状态、五维解读与行动建议。<br>给这份认真一点时间。</p><div class="pending-dots" aria-label="正在生成来信"><span></span><span></span><span></span></div><button type="button" class="secondary" data-action="cancel-analysis">取消，返回回答</button></section>`;}

async function analyze(useBasic=false){
  const consent=document.getElementById('ai-consent')?.checked;
  if(state.status.aiConfigured&&!useBasic&&!consent){document.getElementById('quiz-error').textContent='请先确认数据使用说明，再收取 AI 来信。';return;}
  state.note=document.getElementById('personal-note')?.value.slice(0,400)||state.note;persistQuiz();
  state.busy=true;renderPending();const activeController=new AbortController();controller=activeController;
  try{
    const report=state.status.aiConfigured&&!useBasic?await api('/api/analyze',{method:'POST',signal:activeController.signal,body:JSON.stringify({answers:state.answers,note:state.note,consent:true})}):buildSampleReport(state.answers);
    if(activeController.signal.aborted)return;
    state.report=report;
    state.sample=false;state.quote=0;state.checks=[];state.busy=false;navigate('result');
  }catch(error){
    if(controller!==activeController)return;
    state.busy=false;if(error.name==='AbortError'){if(location.hash==='#quiz')renderQuiz();return;}
    renderQuiz();const el=document.getElementById('quiz-error');el.textContent=error.message;
    const basic=document.createElement('button');basic.type='button';basic.className='link-button';basic.dataset.action='basic';basic.textContent='先收取一封基础来信';el.after(basic);
  }
}

function renderResult(){
  const r=state.report;if(!r){navigate('home');return;}
  const labels=answerLabels(state.answers);
  app.innerHTML=`<div class="result-wrap"><div class="result-top"><a href="#home">← 返回首页</a><div class="result-top-right"><span class="pill filled">${state.sample?'示例来信':r.mode==='ai'?'AI 深度来信':'基础体验来信'}</span><button type="button" data-action="save">保存这封信 ↗</button></div></div>
  ${r.mode!=='ai'?`<div class="mode-banner"><span>${state.sample?'这是一封示例来信，供你预览内容与分享效果。':'这是一封根据问卷选择整理的基础体验来信，未使用 AI 生成。'}</span><button type="button" data-action="start">${state.sample?'收取我的来信':'重新回答'}</button></div>`:''}
  <div class="result-layout"><div class="report-main"><article class="letter-paper" aria-labelledby="letter-title"><div class="letter-kicker"><div class="eyebrow">A LETTER FOR YOUR NEXT 7 DAYS</div><div class="postmark" aria-label="${esc(stamp(r.createdAt))} 好运来信"><span>GOOD LUCK</span><b>好运</b><span>${esc(stamp(r.createdAt))}</span></div></div><h1 id="letter-title">${esc(r.theme)}</h1><p class="letter-to">致，最近的你：</p><p class="letter-body">${esc(r.letter)}</p><div class="signature">愿好事情，慢慢发生。<small>你的好运来信</small></div><div class="letter-bottom"><div><span class="pill">${esc(r.archetype)}</span></div><div class="overall-score" aria-label="近期状态指数 ${r.score} 分"><strong>${r.score}</strong><span>/ 100<br>近期状态指数</span></div></div></article>
  <section class="report-section"><div class="strength-block"><span class="strength-star" aria-hidden="true">✳</span><div><h3>${esc(r.strength.title)}</h3><p>${esc(r.strength.body)}</p></div></div></section>
  <section class="report-section" aria-labelledby="dimensions-title"><div class="section-head"><h2 id="dimensions-title">最近的你，有这五个侧面。</h2><span>YOUR FIVE DIMENSIONS</span></div><div class="dimension-overview">${r.dimensions.map(d=>`<div class="dimension-small"><strong>${d.score}</strong><span>${esc(d.short)}</span><div class="score-track" role="meter" aria-label="${esc(d.title)}状态指数" aria-valuenow="${d.score}" aria-valuemin="0" aria-valuemax="100"><span style="width:${d.score}%"></span></div></div>`).join('')}</div>${r.dimensions.map((d,index)=>`<details class="dimension-detail" ${index===0?'open':''}><summary><h3>${esc(d.title)}</h3><span>${esc(d.summary)}</span></summary><div class="dimension-inside"><p><b>可以试试</b><span>${esc(d.opportunity)}</span></p><p><b>留意一点</b><span>${esc(d.caution)}</span></p><p><b>一小步</b><span>${esc(d.action)}</span></p></div></details>`).join('')}
  <details class="evidence"><summary>为什么这样说？看看与你回答的联系</summary><div class="evidence-content">${r.evidence.map(e=>{const item=labels.find(l=>l.id===e.questionId);return `<div><span>${esc(item?.question||'你的回答')}</span><blockquote>「${esc(item?.answer||'')}」</blockquote><p>${esc(e.interpretation)}</p></div>`;}).join('')}</div></details></section>
  <section class="report-section"><div class="section-head"><h2>未来七天，给自己一点方向。</h2><span>A GENTLE PLAN</span></div><div class="timeline">${r.timeline.map(t=>`<div class="timeline-item"><small>${esc(t.label)}</small><h3>${esc(t.theme)}</h3><p>${esc(t.advice)}</p></div>`).join('')}</div></section>
  <section class="report-section"><div class="section-head"><h2>这些时候，记得照顾自己。</h2><span>A LITTLE REMINDER</span></div><div class="reminders">${r.reminders.map(t=>`<p>${esc(t)}</p>`).join('')}</div></section>
  <section class="report-section"><div class="section-head"><h2>从一件小事开始，就很好。</h2><span>ONE SMALL STEP</span></div><div class="action-list">${r.actions.map((a,i)=>`<label class="action-item"><input type="checkbox" data-check="${i}" ${state.checks.includes(i)?'checked':''}><span>${esc(a)}</span></label>`).join('')}</div></section>
  <div class="lucky-row"><div><span>本周关键词</span><p>${esc(r.lucky.word)}</p></div><div><span>象征幸运色</span><p>${esc(r.lucky.color)}</p></div><div><span>给生活的小仪式</span><p>${esc(r.lucky.ritual)}</p></div></div><p class="result-fine">状态指数是基于本次问卷的趣味表达，不代表未来事件发生的概率。七日安排是行动建议，幸运色与关键词是象征性的鼓励。本测评供娱乐与自我探索使用。</p>
  <section class="rating-invite"><div><h3>这封信，有没有一点懂你？</h3><p>喜欢的、没说中的，都可以诚实告诉我们。</p></div><button class="secondary" type="button" data-action="review">写一封回信 ↗</button></section></div>
  <aside class="share-sidebar" aria-labelledby="share-title"><div class="share-box"><div class="share-heading"><h2 id="share-title">把喜欢的话，带走。</h2><span>YOUR LITTLE LUCK</span></div><div class="style-switch" role="group" aria-label="分享卡样式"><button type="button" data-style="letter" aria-pressed="${state.style==='letter'}">签语来信</button><button type="button" data-style="ticket" aria-pressed="${state.style==='ticket'}">好运票根</button></div><div id="poster-host">${posterMarkup(r,state)}</div><div class="share-settings"><label class="field" for="quote-select">哪句话最像你？<select id="quote-select">${r.quotes.map((q,i)=>`<option value="${i}" ${state.quote===i?'selected':''}>${esc(q)}</option>`).join('')}</select></label><label class="field" for="share-nickname">写给谁？ <span class="small-note">选填昵称</span><input id="share-nickname" type="text" maxlength="16" autocomplete="off" placeholder="可以只写「自己」" value="${esc(state.nickname)}"></label><label class="checkbox-row"><input id="show-score" type="checkbox" ${state.showScore?'checked':''}><span>在分享卡上显示我的状态指数</span></label></div><button class="primary share-download" type="button" data-action="download">↓ 保存我的好运卡</button><div class="share-other"><button type="button" data-action="native-share">分享给朋友 ↗</button><button type="button" data-action="copy-link">复制测评链接</button></div><p class="share-fine">分享卡不包含你的问卷答案和补充心事。</p></div></aside></div></div>`;
}

function updatePoster(){const host=document.getElementById('poster-host');if(host)host.innerHTML=posterMarkup(state.report,state);document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===state.style)));}

async function renderReviews(){
  app.innerHTML=`<section class="review-wrap"><div class="page-intro"><div class="eyebrow">LETTERS BACK TO US</div><h1>收信人的回响。</h1><p>每一种感受，都值得被好好听见。以下是用户自愿公开的评价与签语卡。</p></div><div id="review-content"><p class="small-note">正在收取回信……</p></div></section>`;
  try{state.reviews=await api('/api/reviews');}catch{state.reviews=null;}
  if(location.hash!=='#reviews')return;renderReviewContent();
}
function renderReviewContent(){
  const target=document.getElementById('review-content');if(!target)return;
  const data=state.reviews;
  if(!data||data.count===0){target.innerHTML=`<div class="empty-state"><span aria-hidden="true">✳</span><h2>第一封回信，正在等你。</h2><p>${!data?'回信服务暂时没有连接，仍然可以收取来信和保存分享卡。':'这里还没有公开评价。收取你的来信后，可以分享真实感受。'}</p><button type="button" class="primary" data-action="start">先收一封属于我的信 ↗</button></div>`;return;}
  const reviews=data.reviews.filter(r=>!state.filter||r.rating===state.filter);
  target.innerHTML=`<div class="review-summary"><strong>${Number(data.average).toFixed(1)}<span class="small-note"> / 5</span></strong><div><div class="review-stars" aria-hidden="true">★★★★★</div><p>共 ${data.count} 条公开评价 · 体验版与 AI 版均可评价</p></div></div><div class="review-filter" role="group" aria-label="按评分筛选"><button data-filter="0" type="button" aria-pressed="${!state.filter}">全部</button>${[5,4,3,2,1].map(n=>`<button data-filter="${n}" type="button" aria-pressed="${state.filter===n}">${n} 星 · ${data.distribution[n-1]}</button>`).join('')}</div><p class="small-note" style="margin-bottom:18px">展示最近 24 条回信；总评分包含全部公开评价。</p><div class="review-grid">${reviews.map(r=>`<article class="review-card">${r.quote?posterMarkup({quotes:[r.quote],archetype:r.archetype,score:0,mode:'review'},{style:r.style,mini:true}):''}<div class="review-stars" aria-label="${r.rating}星">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${esc(r.note)}</p><div class="review-meta"><span>${esc(r.nickname)}</span><span>${r.mode==='ai'?'AI 来信':'基础体验'} · ${esc(stamp(r.createdAt))}</span></div></article>`).join('')}</div>${reviews.length?'':'<p class="small-note">最近的回信中，暂无这个星级的评价。</p>'}`;
}

function renderAbout(){app.innerHTML=`<section class="about-wrap"><div class="page-intro"><div class="eyebrow">A KINDER WAY TO LOOK AHEAD</div><h1>给最近的你，一个温柔的停顿。</h1><p>有时，往前走需要的，是看清自己的状态，和一个可以开始的小方向。</p></div><div class="about-grid"><article class="about-item"><span>01</span><h2>从你的回答出发</h2><p>六道关于近期生活的问题，让解读有具体的依据。AI 深度来信会综合回答与自愿补充的内容；基础体验版则按明确规则整理建议。</p></article><article class="about-item"><span>02</span><h2>把鼓励落在行动里</h2><p>看见自己的优点，也留意可能消耗自己的情境。七日计划提供能尝试的小行动，未来仍然由你自己选择。</p></article><article class="about-item"><span>03</span><h2>好运，是一种轻盈的表达</h2><p>状态指数来自问卷，幸运色和签语是象征性的鼓励。我们提供娱乐与自我探索，不把分数当作命运或未来概率。</p></article><article class="about-item"><span>04</span><h2>只带走你想分享的部分</h2><p>签语卡不含问卷答案和补充心事。是否公开评价、展示昵称与分数，都由你决定。你也可以清除这个设备上保存的来信。</p></article></div><div class="about-cta"><button type="button" class="primary" data-action="start">收取我的好运来信 ↗</button></div></section>`;}

function openPrivacy(){showModal('关于你的数据',`<p class="modal-copy">答题不需要真实姓名、生日、手机号或出生地点。请在补充内容中避免填写身份、账户等敏感信息。</p><p class="modal-copy">基础体验版在浏览器中生成，问卷和补充内容不会上传。使用 AI 深度来信时，只有在你勾选同意后，六个回答和自愿补充的内容才会经本站服务端发送给 ${esc(state.status.providerLabel||'阿里云百炼')}；本站不保存这些回答。模型服务方会按其服务规则处理请求。</p><p class="modal-copy">答题进度暂存在本次浏览器会话中。点击「保存这封信」会将来信和对应回答保存在本机，供你下次打开；你可以随时使用页面底部的「清除本机记录」。</p><p class="modal-copy">只有单独授权公开的评价、昵称及所选签语卡内容会保存在服务端并公开展示。分享图不含原始问卷和补充心事。服务使用访问频次限制保护接口。</p>`);}

function openReview(){
  if(!state.report){toast('先收取一封来信，再留下你的感受。');navigate('quiz');return;}
  if(state.sample){toast('示例来信不参与评价。先收取属于你的来信吧。');return;}
  if(!state.status.reviewsAvailable){toast('回信服务暂未开放，你仍然可以保存分享卡。');return;}
  showModal('这封信，有没有一点懂你？',`<form id="review-form"><fieldset class="rating-picker"><legend>这份解读有多贴近你？</legend><div>${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" required aria-label="${n}星"><span aria-hidden="true">☆</span></label>`).join('')}</div></fieldset><label class="field">行动建议有没有帮助？<select name="helpful" required><option value="">请选择</option><option value="yes">有帮助，想试一试</option><option value="partly">有一部分可以参考</option><option value="no">帮助不大</option></select></label><label class="field">写下一点真实感受<textarea name="note" maxlength="240" required placeholder="哪句话让你有共鸣？哪些地方还不太像你？"></textarea></label><label class="field">公开昵称（选填）<input name="nickname" maxlength="16" autocomplete="off" placeholder="一位收信人"></label><label class="checkbox-row"><input name="attach" type="checkbox"><span>附上当前选择的签语卡（不含昵称和状态分数）</span></label><label class="checkbox-row" style="margin-top:12px"><input name="consent" type="checkbox" required><span>我同意将本次评价、公开昵称及勾选的签语卡内容公开展示，已确认不含私人信息。</span></label><p id="review-error" class="inline-error" role="alert"></p><button class="primary" type="submit">寄出我的回信 ↗</button></form>`);
}

function saveReport(){if(state.sample){toast('这是示例来信。先收取属于你的那一封吧。');return;}if(storage.set('luck-letter-saved',{report:state.report,answers:state.answers,quote:state.quote,style:state.style,checks:state.checks}))toast('已保存在这个设备，点击「我的来信」即可重读。');else toast('当前浏览器不允许保存，可以下载好运卡留念。');}
function loadSaved(){
  const saved=storage.get('luck-letter-saved');if(!saved){toast('这里还没有保存的来信，先收一封吧。');return;}
  try{const report=validateModelReport(saved.report,saved.answers);state.report={...report,mode:saved.report.mode==='ai'?'ai':'experience',createdAt:saved.report.createdAt};state.answers=saved.answers;state.quote=Math.min(2,Math.max(0,Number(saved.quote)||0));state.style=saved.style==='ticket'?'ticket':'letter';state.checks=Array.isArray(saved.checks)?saved.checks:[];state.sample=false;navigate('result');}catch{toast('这份本机记录无法读取，请重新收取一封来信。');}
}

function wrapText(ctx,text,x,y,width,lineHeight,maxLines=6){
  const lines=[];let line='';for(const char of Array.from(text)){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
  lines.slice(0,maxLines).forEach((text,index)=>ctx.fillText(index===maxLines-1&&lines.length>maxLines?text.slice(0,-1)+'…':text,x,y+index*lineHeight));return Math.min(lines.length,maxLines)*lineHeight;
}
async function makeImage(){
  const r=state.report;if(!r)throw new Error('请先收取一封来信。');
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d');
  const ticket=state.style==='ticket',bg=ticket?'#e8eaf2':'#e9eddf',ink=ticket?'#3f496c':'#2f4635',muted=ticket?'#78809c':'#718168';
  c.fillStyle=bg;c.fillRect(0,0,1080,1440);c.fillStyle=ink;c.font='22px "Microsoft YaHei",sans-serif';c.fillText(ticket?'GOOD LUCK PASS':'GOOD THINGS',88,100);c.fillText(ticket?'本周好运通行证':'ARE ON THEIR WAY',88,138);
  c.font='130px serif';c.fillText('✳',865,166);c.fillStyle=muted;c.font='24px "Microsoft YaHei",sans-serif';c.fillText(ticket?'TO · 更自在的自己':'写给最近的你',90,350);
  c.fillStyle=ink;c.font='82px "Songti SC","SimSun",serif';wrapText(c,r.quotes[state.quote],88,500,900,135,4);
  c.strokeStyle=muted;c.lineWidth=2;if(ticket)c.setLineDash([12,10]);c.beginPath();c.moveTo(90,1060);c.lineTo(ticket?990:205,1060);c.stroke();c.setLineDash([]);
  c.font='32px "Microsoft YaHei",sans-serif';c.fillStyle=ink;c.fillText(r.archetype,90,1136);c.fillStyle=muted;c.font='25px "Microsoft YaHei",sans-serif';if(state.nickname)c.fillText('致 '+state.nickname,90,1190);
  c.fillStyle=ink;c.font='36px "Songti SC","SimSun",serif';c.fillText('好运来信',90,1315);c.font='21px "Microsoft YaHei",sans-serif';c.fillStyle=muted;c.fillText(state.showScore?`近期状态 ${r.score}/100 · 娱乐解读`:'愿你在自己的节奏里，遇见好事情。',90,1358);
  c.textAlign='right';c.font='18px "Microsoft YaHei",sans-serif';c.fillText(r.mode==='ai'?'AI 娱乐解读':'体验版 · 娱乐解读',990,1310);const host=location.protocol==='file:'?'好运来信':location.host+location.pathname.replace(/index\.html$/,'');wrapText(c,host,990,1358,450,23,1);c.textAlign='left';
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片暂未生成，请重试。')),'image/png'));
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportImage(share=false){
  const button=document.querySelector(share?'[data-action="native-share"]':'[data-action="download"]');if(button)button.disabled=true;
  try{const blob=await makeImage(),name='好运来信-'+new Date().toISOString().slice(0,10)+'.png';const url=location.href.split('#')[0];const file=new File([blob],name,{type:'image/png'});
    if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'好运来信',text:state.report.quotes[state.quote]+' '+url});}
    else{downloadBlob(blob,name);toast(share?'分享卡已保存，可以在聊天或朋友圈中发送。':'好运卡已生成，请查看浏览器下载。');}
  }catch(error){if(error.name!=='AbortError')toast(error.message||'图片暂未生成，请重试。');}finally{if(button)button.disabled=false;}
}
async function copyLink(){const value=location.href.split('#')[0];try{await navigator.clipboard.writeText(value);toast('测评链接已复制，不包含你的私人结果。');}catch{showModal('把好运来信分享出去',`<label class="field">复制这个测评入口<input readonly value="${esc(value)}"></label><p class="modal-copy">这个链接不会包含你的私人解读或问卷答案。</p>`);}}

function renderRoute(){
  if(controller&&state.busy){controller.abort();state.busy=false;}
  const route=location.hash.slice(1)||'home';
  if(route==='sample'){state.report=buildSampleReport(SAMPLE_ANSWERS);state.answers={...SAMPLE_ANSWERS};state.sample=true;state.quote=0;state.checks=[];renderResult();}
  else if(route==='result')renderResult();else if(route==='quiz')renderQuiz();else if(route==='reviews')renderReviews();else if(route==='about')renderAbout();else renderHome();
  window.scrollTo({top:0,behavior:'instant'});
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action],[data-style],[data-filter]');if(!button||button.disabled)return;
  if(button.dataset.style){state.style=button.dataset.style;updatePoster();return;}
  if(button.dataset.filter){state.filter=Number(button.dataset.filter);renderReviewContent();return;}
  const action=button.dataset.action;
  if(action==='start'){state.answers={};state.step=0;state.note='';persistQuiz();navigate('quiz');}
  else if(action==='quiz-next'){if(!state.answers[QUESTIONS[state.step]?.id])return;state.step++;persistQuiz();renderQuiz();window.scrollTo({top:0,behavior:'instant'});}
  else if(action==='quiz-back'){if(state.step===0)navigate('home');else{state.step--;persistQuiz();renderQuiz();}}
  else if(action==='analyze')await analyze();else if(action==='basic')await analyze(true);
  else if(action==='cancel-analysis'){controller?.abort();state.busy=false;renderQuiz();}
  else if(action==='save')saveReport();else if(action==='saved')loadSaved();
  else if(action==='download')await exportImage();else if(action==='native-share')await exportImage(true);else if(action==='copy-link')await copyLink();
  else if(action==='privacy')openPrivacy();else if(action==='close-modal')modal.close();else if(action==='review')openReview();
  else if(action==='clear'){showModal('清除这个设备上的记录？',`<p class="modal-copy">会清除已保存的来信、本次答题进度和补充心事。已公开的评价仍会保留。</p><button type="button" class="primary" data-action="confirm-clear">清除本机记录</button>`);}
  else if(action==='confirm-clear'){try{localStorage.removeItem('luck-letter-saved');sessionStorage.removeItem('luck-quiz');}catch{}state.answers={};state.note='';state.report=null;state.checks=[];modal.close();navigate('home');toast('本机记录已清除。');}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('.quiz-options input')){const q=QUESTIONS[state.step];state.answers[q.id]=el.value;persistQuiz();renderQuiz();document.querySelector(`input[value="${CSS.escape(el.value)}"]`)?.focus();}
  else if(el.id==='quote-select'){state.quote=Number(el.value);updatePoster();}
  else if(el.id==='show-score'){state.showScore=el.checked;updatePoster();}
  else if(el.dataset.check!==undefined){const n=Number(el.dataset.check);state.checks=el.checked?[...new Set([...state.checks,n])]:state.checks.filter(i=>i!==n);}
  else if(el.name==='rating'){const n=Number(el.value);modal.querySelectorAll('.rating-picker label').forEach(label=>{label.querySelector('span').textContent=Number(label.querySelector('input').value)<=n?'★':'☆';});}
});
document.addEventListener('input',event=>{if(event.target.id==='share-nickname'){state.nickname=event.target.value.slice(0,16);updatePoster();}if(event.target.id==='personal-note'){state.note=event.target.value.slice(0,400);persistQuiz();}});
document.addEventListener('submit',async event=>{
  if(event.target.id!=='review-form')return;event.preventDefault();const form=event.target,fields=new FormData(form),submit=form.querySelector('[type=submit]'),error=document.getElementById('review-error');submit.disabled=true;error.textContent='';
  try{await api('/api/reviews',{method:'POST',body:JSON.stringify({rating:Number(fields.get('rating')),helpful:fields.get('helpful'),note:fields.get('note'),nickname:fields.get('nickname'),consent:fields.get('consent')==='on',quote:fields.has('attach')?state.report.quotes[state.quote]:'',archetype:fields.has('attach')?state.report.archetype:'',style:state.style,mode:state.report.mode})});modal.close();toast('你的回信已寄出，谢谢你真实的感受。');state.reviews=null;}catch(e){error.textContent=e.message;}finally{submit.disabled=false;}
});
modal.addEventListener('click',event=>{if(event.target===modal){const box=modal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)modal.close();}});
window.addEventListener('hashchange',renderRoute);
renderRoute();
api('/api/status').then(status=>{state.status=status;if(location.hash==='#quiz'&&state.step===6&&!state.busy)renderQuiz();}).catch(()=>{});
