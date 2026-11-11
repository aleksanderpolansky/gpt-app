'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require(process.env.ARCTOR_M0139_TEST_RUNNER_PATH||path.join(__dirname,'../ari/M0139_NIGHT_SLEEP_REVIEW.cjs'));
const modulePath=process.env.ARCTOR_M0139_HYBRID_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
const priorPath=process.env.ARCTOR_M0139_M0130_TEST_PATH||path.join(process.cwd(),'scripts/tests/ari03-m0130-stable-ties-locales.test.cjs');
const goldPath=process.env.ARCTOR_M0139_GOLD_PATH||path.join(__dirname,'../ari/M0139_APPROVED_EXACT_GOLD_18.json');
const H=R.loadHybrid(modulePath),gold=JSON.parse(fs.readFileSync(goldPath,'utf8'));
const prior=fs.readFileSync(priorPath,'utf8');
const uuid=R.TARGET_UUID;
const vec=(locale,flip=false)=>R.candidates(gold,locale,flip);
const ev=(locale,title,kind='canonical_title',more={})=>({onId:uuid,scope:{kind:'global_system'},locale,kind,text:title,...more});
const run=(locale,title,options={})=>H.rankHybridCandidatesStableTiesV1({
 ...vec(locale,options.reverse||false),query:{text:options.query||title,locale},evidence:options.evidence===undefined?[ev(locale,title)]:options.evidence,
 graphExpansion:{requestedDepth:0}
});
function ok(r){assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.orderVerified,true);assert.equal(r.candidates.length,18);return r}
const all=R.review(gold,prior,H);
test('review contract',()=>assert.equal(all.contract,R.CONTRACT));
test('gold has 18 distinct global ON candidates',()=>assert.equal(R.validateGold(gold),true));
test('prior accepted fixture matches all seven expected strings',()=>assert.ok(R.validatePriorFixture(prior)));
test('gold is actually approved Russian exact title for night sleep',()=>{assert.ok(gold.queries.some(q=>q.locale==='ru'&&q.query==='Ночной сон'&&q.relevantOnIds[0]===uuid))});
test('seven locales complete and unique',()=>assert.deepEqual([...new Set(R.LOCALES.map(x=>x[0]))].sort(),['cs','de','en','es','pl','ru','uk']));
test('real accepted M0130 module exposes exact/ties implementation',()=>assert.equal(typeof H.rankHybridCandidatesStableTiesV1,'function'));
test('target is correct UUID',()=>assert.equal(uuid,'bf6b8ca1-97b4-56c3-a115-f76e2e7fec5a'));
test('seven selected for rank1',()=>assert.equal(all.verifiedExactRankOneCount,7));
test('seven total and all first',()=>assert.equal(all.allSevenRankOne,true));
test('evidence does not claim independently verified live DB titles',()=>assert.equal(all.verifiedLiveTranslations,false));
test('evidence does not claim actual live admin diagnostic page',()=>assert.equal(all.verifiedLiveAdminDiagnostics,false));
test('no Supabase read or SQL performed',()=>assert.equal(all.sqlExecuted,false));
test('no payment or OpenAI calls',()=>assert.equal(all.paidApiCalls,0));
test('baseline avoids target top slot by design',()=>{for(const [loc,txt] of R.LOCALES){const r=ok(run(loc,txt,{evidence:[]}));assert.notEqual(r.candidates[0].onId,uuid)}});
test('real ranked result has 18 unique UUID',()=>{for(const [loc,txt] of R.LOCALES){const rows=ok(run(loc,txt)).candidates;assert.equal(new Set(rows.map(x=>x.onId)).size,18)}});
test('existing RRF policy unchanged',()=>assert.equal(H.HYBRID_RRF_K_V1,60));
test('graph expansion always disabled before ARI-04',()=>assert.equal(ok(run('ru','Ночной сон')).graphCandidatesAdded,0));
test('all reviewed examples include provenance',()=>all.examples.forEach(x=>assert.match(x.fixtureProvenance,/NOT_LIVE/)));
test('accepted fixture hash is stable',()=>assert.match(all.fixtureProvenanceSha256,/^[0-9A-F]{64}$/));
test('all report metrics correspond to actual algorithms',()=>all.examples.forEach(x=>{assert.equal(x.matchKind,'canonical_title');assert.equal(x.rank,1)}));
for(const [locale,title] of R.LOCALES){
 test(`${locale}: full localized exact title rank #1`,()=>{const r=ok(run(locale,title));assert.equal(r.candidates[0].onId,uuid);assert.equal(r.candidates[0].finalRank,1)});
 test(`${locale}: priority derived from canonical title`,()=>{const r=ok(run(locale,title));assert.equal(r.candidates[0].matchKind,'canonical_title');assert.equal(r.candidates[0].matchPriority,2)});
 test(`${locale}: no exact evidence cannot manufacture rank1`,()=>{const r=ok(run(locale,title,{evidence:[]}));assert.notEqual(r.candidates[0].onId,uuid)});
 test(`${locale}: substring/suffix is not exact title`,()=>{const r=ok(run(locale,title,{query:title+' more'}));assert.notEqual(r.candidates[0].onId,uuid);assert.ok(r.candidates.every(x=>x.matchPriority===0))});
 test(`${locale}: pending alias does not boost rank`,()=>{const r=ok(run(locale,title,{evidence:[ev(locale,title,'alias',{aliasStatus:'pending'})]}));assert.notEqual(r.candidates[0].onId,uuid)});
 test(`${locale}: revoked alias does not boost rank`,()=>{const r=ok(run(locale,title,{evidence:[ev(locale,title,'alias',{aliasStatus:'revoked'})]}));assert.notEqual(r.candidates[0].onId,uuid)});
 test(`${locale}: reversed lexical/vector inputs retain rank1`,()=>{const r=ok(run(locale,title,{reverse:true}));assert.equal(r.candidates[0].onId,uuid)});
 test(`${locale}: wrong-locale title cannot boost`,()=>{const other=R.LOCALES.find(x=>x[0]!==locale);const r=ok(run(locale,title,{evidence:[ev(other[0],other[1])] }));assert.notEqual(r.candidates[0].onId,uuid)});
}
