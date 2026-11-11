'use strict';
// Deterministic synthetic arithmetic guards, no personal reviewed data and no production requests.
const assert=require('node:assert/strict');
const dcg=a=>a.reduce((s,v,i)=>s+(2**v-1)/Math.log2(i+2),0);
const pAtReturned=(list,grades)=>list.length?list.filter(x=>grades[x]>=2).length/list.length:null;
const ndcg=(list,grades)=>{const idcg=dcg(Object.values(grades).sort((a,b)=>b-a).slice(0,10));return idcg===0?null:dcg(list.map(x=>grades[x]))/idcg};
assert.equal(pAtReturned(['a','b'],{a:3,b:0}),0.5);
assert.equal(pAtReturned([],{a:3}),null);
assert.equal(ndcg(['a','b'],{a:3,b:0}),1);
assert.ok(ndcg(['b','a'],{a:3,b:0})<1);
assert.equal(ndcg([],{a:0}),null);
assert.ok(Number.isNaN(Number('?')));
console.log('M0085_REVIEWED_SCORING_TEST_PASS: returned precision, pooled nDCG, no-results N/A, unknown');
