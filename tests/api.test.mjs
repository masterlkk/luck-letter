import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi,callDeepSeek,validateReview} from '../server/api.mjs';
import {SAMPLE_ANSWERS,buildSampleReport} from '../public/domain.mjs';
const request=(path,body,origin)=>new Request('https://luck.example'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});
function memoryStore(){const reviews=[],counts=new Map();return {async allow(kind,id,max){const key=kind+id;const count=(counts.get(key)||0)+1;counts.set(key,count);return count<=max;},async listReviews(){return {reviews,count:reviews.length,average:reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:null,distribution:[1,2,3,4,5].map(n=>reviews.filter(r=>r.rating===n).length)};},async addReview(r){reviews.push(r);}};}

test('health response reports missing AI without leaking credentials',async()=>{
  const response=await handleApi(request('/api/status'),{DEEPSEEK_API_KEY:'secret-test'},memoryStore());
  const data=await response.json();assert.equal(data.aiConfigured,true);assert.ok(!JSON.stringify(data).includes('secret-test'));
});
test('AI consent and complete answers are required before a provider call',async()=>{
  const env={DEEPSEEK_API_KEY:'secret-test'};let called=false;const provider=()=>{called=true;};
  assert.equal((await handleApi(request('/api/analyze',{answers:SAMPLE_ANSWERS}),env,memoryStore(),'test',provider)).status,400);
  assert.equal((await handleApi(request('/api/analyze',{answers:{},consent:true}),env,memoryStore(),'test',provider)).status,400);assert.equal(called,false);
});
test('unconfigured AI returns 503 instead of fabricating an AI response',async()=>assert.equal((await handleApi(request('/api/analyze',{answers:SAMPLE_ANSWERS,consent:true}),{},memoryStore())).status,503));
test('unknown origins are blocked; configured GitHub origin gets CORS',async()=>{
  const env={ALLOWED_ORIGINS:'https://masterlkk.github.io'};
  assert.equal((await handleApi(request('/api/status',null,'https://evil.example'),env,memoryStore())).status,403);
  const response=await handleApi(request('/api/status',null,'https://masterlkk.github.io'),env,memoryStore());assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://masterlkk.github.io');
});
test('DeepSeek request uses server credentials and returns only validated public content',async()=>{
  const result=await callDeepSeek({answers:SAMPLE_ANSWERS,note:'example'},{DEEPSEEK_API_KEY:'secret-test'},async(url,options)=>{
    assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.Authorization,'Bearer secret-test');const body=JSON.parse(options.body);assert.equal(body.model,'deepseek-flash');assert.equal(body.thinking.type,'enabled');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(buildSampleReport(SAMPLE_ANSWERS)),reasoning_content:'private reasoning'}}]});
  });assert.equal(result.mode,'ai');assert.ok(!JSON.stringify(result).includes('private reasoning'));
});
test('truncated or invalid provider content fails visibly',async()=>{
  await assert.rejects(()=>callDeepSeek({answers:SAMPLE_ANSWERS},{DEEPSEEK_API_KEY:'test'},async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})),/尚未写完/);
  await assert.rejects(()=>callDeepSeek({answers:SAMPLE_ANSWERS},{DEEPSEEK_API_KEY:'test'},async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]})),/格式/);
});
test('reviews require consent, ratings and honest written feedback',()=>{
  assert.throws(()=>validateReview({rating:5,note:'ok',helpful:'yes'}));
  assert.throws(()=>validateReview({rating:6,note:'ok',helpful:'yes',consent:true}));
  assert.throws(()=>validateReview({rating:5,note:'',helpful:'yes',consent:true}));
});
test('both low and high ratings are saved and included in the aggregate',async()=>{
  const store=memoryStore();for(const rating of [1,5])assert.equal((await handleApi(request('/api/reviews',{rating,note:'真实反馈',helpful:'partly',consent:true}),{},store)).status,201);
  const data=await(await handleApi(request('/api/reviews'),{},store)).json();assert.equal(data.count,2);assert.equal(data.average,3);assert.deepEqual(data.distribution,[1,0,0,0,1]);assert.ok(!JSON.stringify(data).includes('answers'));
});
test('model calls are rate limited before reaching the provider',async()=>{
  const store=memoryStore(),env={DEEPSEEK_API_KEY:'test'};let calls=0;const provider=async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(buildSampleReport(SAMPLE_ANSWERS))}}]});};
  for(let i=0;i<7;i++){const result=await handleApi(request('/api/analyze',{answers:SAMPLE_ANSWERS,consent:true}),env,store,'same',provider);assert.equal(result.status,i===6?429:200);}assert.equal(calls,6);
});
test('oversized and non-JSON requests are rejected',async()=>{
  const store=memoryStore();const big=await handleApi(request('/api/reviews',{note:'x'.repeat(13000)}),{},store);assert.equal(big.status,413);
  const response=await handleApi(new Request('https://luck.example/api/reviews',{method:'POST',body:'text'}),{},store);assert.equal(response.status,415);
});
