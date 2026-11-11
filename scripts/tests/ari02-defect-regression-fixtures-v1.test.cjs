'use strict';
// M-0081. Immutable offline evidence replay. A reproduced historical BUG is NOT a quality PASS.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const load=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function safeCheck(condition,message){if(!condition)throw Error('M0081_SNAPSHOT_DRIFT: '+message);}
function verifyCase(f,rows){
 safeCheck(f.query&&f.locale==='ru'&&f.defect_id&&f.gold_case_id&&f.reason&&f.expected_quality_behavior,'incomplete case '+f.defect_id);
 if(f.fixture_kind==='HISTORICAL_NO_PRIMARY_HTTP'){
  safeCheck(f.historical_http_source_sha256===null&&f.frozen_snapshot===null&&f.frozen_sha256===null&&f.observed_rank===null&&f.ranked_uuid===null,'historical evidence incorrectly asserted');
  safeCheck(Array.isArray(rows)&&rows.some(r=>r.id===f.later_catalog_uuid&&r.title==='Сон'&&r.rank===1),'later ON catalog observation missing');
  return {defect_id:f.defect_id,kind:f.fixture_kind,evidence_status:'INCONCLUSIVE_MISSING_PRIMARY_HTTP',quality_gate:'NOT_EVALUATED'};
 }
 safeCheck(Array.isArray(rows)&&rows.length>0,'no rows '+f.defect_id);
 safeCheck(rows.every((r,i)=>r.rank===i+1&&typeof r.id==='string'&&typeof r.score==='number'),'rank/score/order inconsistent '+f.defect_id);
 safeCheck(new Set(rows.map(r=>r.id)).size===rows.length,'duplicate UUID snapshot '+f.defect_id);
 const hit=rows.find(r=>r.id===f.ranked_uuid);
 safeCheck(hit&&hit.rank===f.observed_rank&&hit.score===f.observed_score,'rank/UUID/score drift '+f.defect_id);
 if(f.fixture_kind==='RANK_INVERSION'){
  safeCheck(hit.title===f.expected_title,'exact ON title drift');
  const broad=rows.find(r=>r.id===f.comparison_uuid);
  safeCheck(broad&&broad.title==='Сон'&&broad.rank===f.comparison_rank&&broad.score===f.comparison_score,'generic ON evidence drift');
  safeCheck(broad.rank<hit.rank,'snapshot no longer displays documented inversion');
 }else if(f.fixture_kind==='TOP10_FALSE_POSITIVE'){
  safeCheck(hit.rank<=10&&f.gold_judgment_grade===0,'original top10/AI-assisted grade drift');
  safeCheck(f.search_mode==='ARI-02.2_BASELINE_LEXICAL'&&f.run_key==='baseline','wrong search mode');
  safeCheck((f.observed_rank===6&&hit.title==='Подъём по лестнице')||(f.observed_rank===8&&hit.title==='Длительность ходьбы'),'unexpected lexical result/title');
 }else throw Error('M0081_SNAPSHOT_DRIFT: unexpected fixture kind');
 return {defect_id:f.defect_id,kind:f.fixture_kind,evidence_status:'BUG_PRESENT_IN_FROZEN_SNAPSHOT',quality_gate:'NOT_PASSED_OPEN_DEFECT'};
}
function runSuite({fixturePath,snapshotDir,linkPath}){
 const cfg=load(fixturePath),links=load(linkPath);
 safeCheck(cfg.contract==='ARCTOR_ARI_M0081_DETERMINISTIC_DEFECT_FIXTURES_V1'&&cfg.step==='M-0081'&&cfg.roadmap_id==='ARI-02.07.07','fixture contract/step');
 safeCheck(cfg.fixtures.length===4&&new Set(cfg.fixtures.map(x=>x.defect_id)).size===4,'case count/identity');
 safeCheck(cfg.source_links_sha256===hash(fs.readFileSync(linkPath)),'prior link digest mismatch');
 safeCheck(links.contract==='ARCTOR_ARI_M0079_GOLD_DEFECT_LINKS_V1'&&links.links.length===4,'prior links contract');
 safeCheck(cfg.evidence_protocol?.frozen_replay_is_not_live_regression===true&&cfg.evidence_protocol?.historical_missing_primary_inconclusive===true&&cfg.evidence_protocol?.all_defects_remain_open===true&&cfg.evidence_protocol?.real_recall20==='N/A','epistemic scope');
 const cached=new Map();
 for(const s of cfg.frozen_snapshots){
  const file=path.join(snapshotDir,s.file);
  safeCheck(!path.isAbsolute(s.file)&&!s.file.includes('..'),'unsafe snapshot path');
  const b=fs.readFileSync(file);
  safeCheck(hash(b)===s.sha256,'SHA mismatch '+s.file);
  cached.set(s.file,load(file));
 }
 const out=[];
 for(let i=0;i<4;i++){
  const f=cfg.fixtures[i],l=links.links[i];
  for(const k of ['defect_id','gold_case_id','query','locale','search_mode','ranked_uuid','observed_rank','source_sha256','source_kind','source_file','frozen_file'])safeCheck(f[k]===l[k],'M0079 link disagreement '+k);
  safeCheck(f.frozen_sha256===l.frozen_sha256,'frozen SHA link disagreement '+f.defect_id);
  let snapshot=f.fixture_kind==='HISTORICAL_NO_PRIMARY_HTTP'?cached.get(f.later_catalog_snapshot):cached.get(f.frozen_snapshot);
  safeCheck(snapshot&&snapshot.query=== (f.fixture_kind==='HISTORICAL_NO_PRIMARY_HTTP'?'сон':f.query) &&snapshot.locale==='ru','source query/locale disagreement');
  if(f.fixture_kind!=='HISTORICAL_NO_PRIMARY_HTTP'){
   const frozen=cfg.frozen_snapshots.find(s=>s.file===f.frozen_snapshot);
   safeCheck(!!frozen&&frozen.sha256===f.frozen_sha256&&snapshot.sourceSha256===f.source_sha256,'pinned raw/derived mismatch');
   safeCheck(snapshot.contract===(f.run_key==='baseline'?'ARCTOR_ARI_M0070_FROZEN_BASELINE_V1':'ARCTOR_ARI_M0070_FROZEN_EXPERIMENTAL_V1'),'search mode snapshot conflict');
  }
  out.push(verifyCase(f,snapshot.rows));
 }
 safeCheck(out.filter(x=>x.evidence_status==='BUG_PRESENT_IN_FROZEN_SNAPSHOT').length===3,'expected 3 frozen bug observations');
 safeCheck(out.filter(x=>x.evidence_status==='INCONCLUSIVE_MISSING_PRIMARY_HTTP').length===1,'historical must stay inconclusive');
 return {contract:'ARCTOR_ARI_M0081_OFFLINE_REPLAY_REPORT_V1',frozenBugObservations:3,missingHistoricalPrimary:1,qualityDefectsFixed:0,liveApiCalls:0,independentGold:false,realRecall20:'N/A',allDefectsOpen:true,cases:out};
}
function options(argv){
 const root=path.resolve(__dirname,'../..');let fixturePath=path.join(root,'docs/ari/02/error_catalog/M0081_DETERMINISTIC_DEFECT_FIXTURES_V1.json'),snapshotDir=path.join(root,'docs/ari/02/regression_fixtures'),linkPath=path.join(root,'docs/ari/02/error_catalog/M0079_GOLD_DEFECT_LINKS_V1.json');
 for(let i=0;i<argv.length;i++){
  const arg=argv[i],v=argv[i+1];
  if(['--fixtures','--snapshots','--links'].includes(arg)){
   assert(v,'missing '+arg);if(arg==='--fixtures')fixturePath=v;if(arg==='--snapshots')snapshotDir=v;if(arg==='--links')linkPath=v;i++;
  }else throw Error('Unsupported option '+arg);
 }
 return {fixturePath,snapshotDir,linkPath};
}
if(require.main===module){
 try{const r=runSuite(options(process.argv.slice(2)));console.log('M0081_OFFLINE_REPLAY_OBSERVED 3/3 frozen bugs; HISTORICAL_INCONCLUSIVE 1/1; FIXED 0');console.log(JSON.stringify(r,null,2));}
 catch(e){console.error('M0081_TEST_STOP: '+e.stack);process.exitCode=1;}
}
module.exports={runSuite,verifyCase,options};
