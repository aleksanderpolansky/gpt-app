'use strict';
/** Offline M0086 bounded timing, memory sampling, deterministic repeat. No network/DB/AI.
 * node M0086_MEASURE.cjs --repo <root> --gold <absolute private gold> --out <empty directory> [--probe <path>]
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const fail=x=>{throw Error('M0086_MEASURE_STOP: '+x)};
const check=(x,s)=>{if(!x)fail(s)};
const opt=k=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]};
const json=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const enc=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const GOLD_SHA='E5073D25DEA44D91FC67A01B727C9427740FC7E5C13528281DA965DFD5A17916';
const COMPARE_SHA='5BD6BDD69FC9340E92258059F4737262BB025C18B12805238AD8C7361E024524';
const TEST_SHA='22FE5A83330168C43F7F67A4CF9F194345DB18567CBA4CEB2C70F9190E3E2729';
const TS_SHA='DBAA0ACC9D87EB2F63C82A82E9316FF7FC62EA610E81F59FE86D90A368311741';
const rep=3;
function percentile(x,p){const s=x.slice().sort((a,b)=>a-b);let idx=(s.length-1)*p;return Number((s[Math.floor(idx)]+(s[Math.ceil(idx)]-s[Math.floor(idx)])*(idx-Math.floor(idx))).toFixed(3));}
function measure(repo,gold,out,probe){
 check(fs.existsSync(probe),'preload probe not found');
 const pins=[['scripts/ari02_6_compare.mjs',COMPARE_SHA],['scripts/tests/ari02_6_regression.test.mjs',TEST_SHA],['src/lib/ontology-research/ari02RegressionV1.ts',TS_SHA]];
 for(const [f,h] of pins)check(sha(fs.readFileSync(path.join(repo,...f.split('/'))))===h,'source hash drift '+f);
 check(sha(fs.readFileSync(gold))===GOLD_SHA,'Gold SHA drift');
 const goldObj=json(gold);check(goldObj.contract==='ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1'&&goldObj.cases?.length===156,'Gold source contract');
 check(!fs.existsSync(out)||fs.readdirSync(out).length===0,'output dir must be empty');fs.mkdirSync(out,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ARCTOR_M0086_METRICS_'));
 const runs=[],groups={synthetic:[],baseline:[],experimental:[]};
 const types=['synthetic','baseline','experimental'];
 try{
  for(const type of types){for(let i=1;i<=rep;i++){
   const probeFile=path.join(tmp,type+'_'+i+'_probe.json'),reportFile=path.join(tmp,type+'_'+i+'_report.json');
   const args=['--max-old-space-size=384','--require',probe];
   if(type==='synthetic')args.push(path.join(repo,'scripts','tests','ari02_6_regression.test.mjs'));
   else args.push(path.join(repo,'scripts','ari02_6_compare.mjs'),'--before',gold,'--after',gold,'--engine',type,'--min-cases','10','--out',reportFile);
   const start=process.hrtime.bigint();const child=cp.spawnSync(process.execPath,args,{cwd:repo,env:{...process.env,ARCTOR_M0086_PROBE_PATH:probeFile},encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:16*1024*1024});
   const ms=Number((Number(process.hrtime.bigint()-start)/1e6).toFixed(3));
   check(!child.error,'subprocess failed '+type+'/'+i+' '+String(child.error));
   check(child.status===(type==='synthetic'?0:2),'exit unexpected '+type+'/'+i+': '+child.status+' '+String(child.stderr||child.stdout).slice(-1200));
   check(fs.existsSync(probeFile),'memory probe missing '+type+'/'+i);
   const p=json(probeFile);check(p.contract==='ARCTOR_ARI_M0086_CHILD_MEMORY_V1'&&p.samples>=1&&p.sampledPeakRssBytes>0,'invalid memory probe '+type+'/'+i);
   let digest,qualityGate='SYNTHETIC_PASS',comparable=null,blockers=null,casenum=null;
   if(type==='synthetic'){
    check(child.stdout.includes('regression fixtures PASS'),'synthetic suite output not PASS');
    digest=sha(Buffer.from(child.stdout.trim()));
   }else{
    const r=json(reportFile);
    check(r.contract==='ARCTOR_ARI_02_6_REGRESSION_V1'&&r.gate==='INCONCLUSIVE'&&r.engine===type&&r.cases.length===156,'regression contract/gate changed '+type+'/'+i);
    check(r.blockingIssues.length===0&&r.warnings.length===0&&r.comparableRecallCases===0,'false issues '+type+'/'+i);
    check(r.comparablePrecisionCases===(type==='baseline'?3:0),'comparable coverage drift '+type+'/'+i);
    const clean=JSON.parse(JSON.stringify(r));delete clean.generatedAt;delete clean.sourceFiles;
    digest=sha(enc(clean));qualityGate='INCONCLUSIVE_INSUFFICIENT_GOLD';comparable=r.comparablePrecisionCases;blockers=r.blockingIssues.length;casenum=r.cases.length;
   }
   const entry={suite:type,repeat:i,wallTimeMs:ms,exitCode:child.status,semanticSha256:digest,
    sampledPeakRssMiB:Number((p.sampledPeakRssBytes/1048576).toFixed(3)),sampledPeakHeapMiB:Number((p.sampledPeakHeapUsedBytes/1048576).toFixed(3)),
    sampleCount:p.samples,osMaxRssRaw:p.osMaxRssRaw,osMaxRssUnit:p.osMaxRssUnit,
    qualityGate,comparablePrecisionCases:comparable,blockingIssues:blockers,scenarios:casenum};
   runs.push(entry);groups[type].push(entry);
   console.log('M0086_MEASURE '+type+' '+i+'/'+rep+' '+ms+'ms '+entry.sampledPeakRssMiB+'MiB RSS '+digest.slice(0,10));
  }}
  const suites={};
  for(const [type,entries] of Object.entries(groups)){
   const hashes=new Set(entries.map(x=>x.semanticSha256));
   check(hashes.size===1,'NONDETERMINISM: '+type+' output hashes disagree');
   suites[type]={repeatCount:rep,semanticSha256:entries[0].semanticSha256,identicalOutputs:true,wallTimeMedianMs:percentile(entries.map(x=>x.wallTimeMs),0.5),wallTimeMaxMs:Math.max(...entries.map(x=>x.wallTimeMs)),sampledPeakRssMaxMiB:Math.max(...entries.map(x=>x.sampledPeakRssMiB)),qualityGate:entries[0].qualityGate};
  }
  const maxRss=Math.max(...runs.map(x=>x.sampledPeakRssMiB));
  check(maxRss<=512,'RSS observed above advisory 512MiB: '+maxRss+'; needs owner review, no acceptance');
  const totalMs=runs.reduce((s,x)=>s+x.wallTimeMs,0);
  const audit={contract:'ARCTOR_ARI_M0086_RUNTIME_DETERMINISM_V1',step:'M-0086',roadmapId:'ARI-02.08.05',
   sourceGoldSha256:GOLD_SHA,sourceGoldCases:156,measurementHost:{platform:process.platform,arch:process.arch,node:process.version,cpus:os.cpus().length,logicalMemoryGiB:Number((os.totalmem()/1073741824).toFixed(2))},
   limits:{perChildTimeoutMs:120000,v8OldSpaceLimitMiB:384,observedRssAdvisoryMiB:512,topLevelProbeIntervalMs:20},
   memoryScope:'sampled RSS of top-level child Node processes; excludes nested descendants, browser, Vercel and database; not a hard OS RSS limit',
   timeScope:'synchronous wall clock for each test/comparator child; includes Node startup, disk access and JSON generation; local measurement host only',
   determinismScope:'strict console bytes for synthetic suite; parsed JSON comparator excluding generatedAt/sourceFiles only; 3 repeats on same frozen Gold and code; no cross-machine guarantee',
   totals:{suiteTypes:types.length,runs:runs.length,totalWallTimeMs:Number(totalMs.toFixed(3)),maxSampledPeakRssMiB:maxRss,allDeterministic:true},
   suites,runs,qualityGate:'INCONCLUSIVE_INSUFFICIENT_GOLD',realRecall20:'N/A',productionLatencyNotTested:true,
   catalogCoverageNotCertified:true,aiCallsPerformed:false,dbWritesPerformed:false,codeChanges:false};
  fs.writeFileSync(path.join(out,'M0086_RUNTIME_DETERMINISM_AUDIT_V1.json'),enc(audit),{flag:'wx'});
  fs.writeFileSync(path.join(out,'M0086_RUNTIME_DETERMINISM_REPORT_V1.md'),`# M-0086 — локальный test suite: память, время, детерминизм\n\n`+
   `- Девять запусков: 3× synthetic regression, 3× baseline, 3× experimental на одном замороженном Gold SHA256 ${GOLD_SHA}.\n`+
   `- Node ${process.version}, ${process.platform}/${process.arch}; RAM ${audit.measurementHost.logicalMemoryGiB} GiB; логических CPU ${audit.measurementHost.cpus}.\n`+
   `- Пиковая наблюдаемая RSS **${maxRss.toFixed(3)} MiB**, ограничение *V8 old-space* **384 MiB** (не общий RSS), порог сигнализации **512 MiB**, timeout **120 s на процесс**.\n`+
   `- Общее измеренное wall time: **${(totalMs/1000).toFixed(3)} s**. Память измерена с интервалом 20 ms только в верхнеуровневом Node-процессе, дочерние процессы отсутствуют в этих измерениях.\n`+
   Object.entries(suites).map(([k,v])=>`- ${k}: n=${v.repeatCount}, median ${v.wallTimeMedianMs} ms, max ${v.wallTimeMaxMs} ms, peakRSS ${v.sampledPeakRssMaxMiB} MiB, stable SHA256 ${v.semanticSha256}; gate ${v.qualityGate}.\n`).join('')+
   `- Повторяемость **PASS** на одной машине и неизменном снимке, но качество поиска **INCONCLUSIVE**: baseline 3/10 и experimental 0/10 полностью оценённых сравнений; Recall@20 N/A.\n- SQL, production, Git, индексированный поиск ARI-03 не изменены.\n`,'utf8');
  return audit;
 }finally{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}}
}
try{const repo=opt('repo'),gold=opt('gold'),out=opt('out');check(repo&&gold&&out,'--repo/--gold/--out missing');const probe=opt('probe')||path.join(__dirname,'M0086_MEMORY_PROBE.cjs');const a=measure(path.resolve(repo),path.resolve(gold),path.resolve(out),path.resolve(probe));console.log('M0086_MEASURE_PASS 9/9 deterministic, maxRSS='+a.totals.maxSampledPeakRssMiB+'MiB, quality INCONCLUSIVE');}catch(e){console.error(e.stack||String(e));process.exitCode=1}
