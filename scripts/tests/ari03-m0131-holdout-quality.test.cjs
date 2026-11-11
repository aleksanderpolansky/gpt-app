'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require(require.resolve('typescript',{paths:[process.cwd(),'/opt/nvm/versions/node/v22.16.0/lib/node_modules']}));
const file=process.env.ARCTOR_M0131_TEST_MODULE_PATH||path.join(process.cwd(),'src/lib/ontology-research/hybridRankerV1.ts');
const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(out.diagnostics?.length||0,0);const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(out.outputText,file);
const H=mod.exports;
const ID=Array.from({length:16},(_,i)=>`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const LOCALES=['en','pl','es','de','cs','uk','ru'];
function inp(n=3){return {queries:Array.from({length:n},(_,i)=>({id:'q'+i,locale:LOCALES[i%7],relevantOnIds:[ID[i]],exactTitle:i%2===0})),
 candidateIds:[...ID],rankings:Array.from({length:n},(_,i)=>({queryId:'q'+i,onIds:[ID[i],ID[(i+1)%16],ID[(i+2)%16]]}))};}
function ok(a){const r=H.scoreHybridHoldoutV1(a);assert.equal(r.ok,true,JSON.stringify(r));return r}
function bad(a,reason){const r=H.scoreHybridHoldoutV1(a);assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.reason,reason);assert.deepEqual(r.perQuery,[])}
test('contract',()=>assert.equal(H.HYBRID_HOLDOUT_QUALITY_CONTRACT_V1,'ARCTOR_ARI03_M0131_HOLDOUT_QUALITY_V1'));
test('prior functions preserved',()=>{for(const k of ['rankHybridCandidatesStableTiesV1','rankHybridCandidatesGraphGatedV1','rankHybridCandidatesRrfV1','rankHybridCandidatesWithExactPriorityV1','explainHybridCandidatesV1'])assert.equal(typeof H[k],'function')});
test('correct top1',()=>{const r=ok(inp());assert.equal(r.metrics.hitAt1,1);assert.equal(r.metrics.ndcgAt5,1);assert.equal(r.metrics.falsePositiveAt1,0);assert.equal(r.metrics.falsePositiveCountAt5,6);assert.equal(r.metrics.exactHitAt1,1)});
test('wrong top1 and matching second',()=>{const a=inp(1);a.rankings[0].onIds=[ID[1],ID[0]];const r=ok(a);assert.equal(r.metrics.hitAt1,0);assert.equal(r.metrics.ndcgAt5,1/Math.log2(3));assert.equal(r.metrics.falsePositiveAt1,1);assert.equal(r.metrics.missAt1,1)});
test('empty response means miss not FP',()=>{const a=inp(1);a.rankings[0].onIds=[];const r=ok(a);assert.equal(r.metrics.falsePositiveAt1,0);assert.equal(r.metrics.missAt1,1);assert.equal(r.metrics.coverageAt1,0);assert.equal(r.metrics.fpShareOfReturnedTop5,null)});
test('false positive top5 denominator correctly differs for sparse lists',()=>{const a=inp(1);a.rankings[0].onIds=[ID[1],ID[2],ID[0]];const r=ok(a);assert.equal(r.metrics.fpShareOfReturnedTop5,2/3)});
test('exact title subset does not include semantic query',()=>{const a=inp(2);const r=ok(a);assert.equal(r.metrics.exactQueries,1);assert.equal(r.metrics.exactHitAt1,1)});
test('undefined exact -> fail',()=>{const a=inp();delete a.queries[0].exactTitle;bad(a,'INVALID_QUERY')});
test('missing input -> fail',()=>bad({},'INVALID_INPUT'));
test('not array -> fail',()=>bad({queries:{},candidateIds:[],rankings:[]},'INVALID_INPUT'));
test('empty queries -> fail',()=>bad({queries:[],candidateIds:[ID[0],ID[1]],rankings:[]},'INVALID_INPUT'));
test('too few candidates -> fail',()=>{const a=inp();a.candidateIds=[ID[0]];bad(a,'INVALID_INPUT')});
test('duplicate candidate UUID -> fail',()=>{const a=inp();a.candidateIds=[ID[0],ID[0]];bad(a,'INVALID_CANDIDATES')});
test('malformed candidate -> fail',()=>{const a=inp();a.candidateIds[0]='bad';bad(a,'INVALID_CANDIDATES')});
test('case-sensitive canonical UUID -> fail',()=>{const a=inp();a.candidateIds[0]='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'.toUpperCase();bad(a,'INVALID_CANDIDATES')});
test('duplicate query -> fail',()=>{const a=inp();a.queries[1].id='q0';bad(a,'INVALID_QUERY')});
test('unknown locale -> fail',()=>{const a=inp();a.queries[0].locale='fr';bad(a,'INVALID_QUERY')});
test('duplicate relevant label -> fail',()=>{const a=inp();a.queries[0].relevantOnIds=[ID[0],ID[0]];bad(a,'INVALID_LABELS')});
test('unknown relevant label -> fail',()=>{const a=inp();a.queries[0].relevantOnIds=['99999999-9999-4999-8999-999999999999'];bad(a,'INVALID_LABELS')});
test('empty relevant label -> fail',()=>{const a=inp();a.queries[0].relevantOnIds=[];bad(a,'INVALID_LABELS')});
test('missing ranking -> fail',()=>{const a=inp();a.rankings.pop();bad(a,'INVALID_INPUT')});
test('query id changed -> fail',()=>{const a=inp();a.rankings[0].queryId='other';bad(a,'INVALID_RANKINGS')});
test('duplicate ranking ids -> fail',()=>{const a=inp();a.rankings[0].onIds=[ID[0],ID[0]];bad(a,'INVALID_RANKINGS')});
test('unknown returned UUID -> fail',()=>{const a=inp();a.rankings[0].onIds=['99999999-9999-4999-8999-999999999999'];bad(a,'UNKNOWN_UUID')});
test('no mutation',()=>{const a=inp(),orig=structuredClone(a);ok(a);assert.deepEqual(a,orig)});
test('frozen data',()=>{const a=inp();Object.freeze(a.candidateIds);Object.freeze(a.rankings);Object.freeze(a.queries);Object.freeze(a);ok(a)});
test('no original rank change',()=>{const a=inp();const prev=H.rankHybridCandidatesStableTiesV1({lexical:[{onId:ID[0],rank:1,locale:'ru',scope:{kind:'global_system'}}],vector:[],query:{text:'demo',locale:'ru'},evidence:[]});assert.equal(prev.ok,true);ok(a);const now=H.rankHybridCandidatesStableTiesV1({lexical:[{onId:ID[0],rank:1,locale:'ru',scope:{kind:'global_system'}}],vector:[],query:{text:'demo',locale:'ru'},evidence:[]});assert.deepEqual(now,prev)});
test('no external API',()=>{const ext=fs.readFileSync(file,'utf8').split('ARI-03.06.07 / M-0131')[1];assert.ok(ext);assert.doesNotMatch(ext,/https:\/\/|OPENAI_API_KEY|fetch\s*\(|process\.env/)});
for(const locale of LOCALES){
 test(locale+' correct scoring',()=>{const a=inp(1);a.queries[0].locale=locale;const r=ok(a);assert.equal(r.perLocale[locale].ndcgAt5,1)});
 test(locale+' wrong rank 3',()=>{const a=inp(1);a.queries[0].locale=locale;a.rankings[0].onIds=[ID[1],ID[2],ID[0]];const r=ok(a);assert.equal(r.perLocale[locale].ndcgAt5,0.5)});
 test(locale+' no result',()=>{const a=inp(1);a.queries[0].locale=locale;a.rankings[0].onIds=[];const r=ok(a);assert.equal(r.perLocale[locale].coverageAt1,0)});
 test(locale+' selected query retained',()=>{const a=inp(1);a.queries[0].locale=locale;const r=ok(a);assert.equal(r.perQuery[0].locale,locale);assert.equal(r.perQuery[0].expected[0],ID[0])});
}
for(let k=1;k<=38;k++)test('ranked position numeric audit #'+k,()=>{
 const a=inp(1);const chosen=[ID[(k%15)+1],ID[0]];a.rankings[0].onIds=chosen;
 const r=ok(a);assert.equal(r.metrics.ndcgAt5,1/Math.log2(3));assert.equal(r.metrics.hitAt1,0);
});
