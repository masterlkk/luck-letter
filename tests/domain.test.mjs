import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,SAMPLE_ANSWERS,normalizeAnswers,calculateProfile,buildSampleReport,validateModelReport} from '../public/domain.mjs';

test('all six answers are required; extra fields cannot enter the profile',()=>{
  assert.throws(()=>normalizeAnswers({}));assert.throws(()=>normalizeAnswers({...SAMPLE_ANSWERS,week:'unknown'}));
  assert.deepEqual(normalizeAnswers({...SAMPLE_ANSWERS,extra:'private'}),SAMPLE_ANSWERS);
});
test('state scores are deterministic for the same answers',()=>assert.deepEqual(calculateProfile(SAMPLE_ANSWERS),calculateProfile(SAMPLE_ANSWERS)));
test('every possible answer combination has valid, varied scores and a complete result',()=>{
  const totals=new Set();let checked=0;
  function visit(index,answers){if(index===QUESTIONS.length){const p=calculateProfile(answers);for(const d of p.dimensions)assert.ok(d.score>=35&&d.score<=94);totals.add(p.score);checked++;return;}const q=QUESTIONS[index];for(const o of q.options)visit(index+1,{...answers,[q.id]:o[0]});}
  visit(0,{});assert.equal(checked,4096);assert.ok(totals.size>20);
});
test('AI cannot overwrite rule-based scores, titles or reporting dates',()=>{
  const sample=buildSampleReport(SAMPLE_ANSWERS);sample.score=100;sample.dimensions.forEach(d=>d.score=100);
  const result=validateModelReport(sample,SAMPLE_ANSWERS);assert.deepEqual(result.dimensions.map(d=>d.score),calculateProfile(SAMPLE_ANSWERS).dimensions.map(d=>d.score));assert.equal(result.mode,'ai');
});
test('malformed, missing and excessively long model fields are rejected',()=>{
  const r=buildSampleReport(SAMPLE_ANSWERS);assert.throws(()=>validateModelReport({...r,dimensions:r.dimensions.slice(1)},SAMPLE_ANSWERS));
  assert.throws(()=>validateModelReport({...r,quotes:['a'.repeat(100),'b','c']},SAMPLE_ANSWERS));
  assert.throws(()=>validateModelReport({...r,evidence:[{questionId:'fake',interpretation:'x'}]},SAMPLE_ANSWERS));
});
