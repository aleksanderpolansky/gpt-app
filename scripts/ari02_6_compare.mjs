/** Offline ARI-02.6 Gold Corpus comparator.
 * Example: node scripts/ari02_6_compare.mjs --before before.json --after after.json --engine experimental --out report.json
 * Exit codes: 0 PASS; 2 INCONCLUSIVE; 3 FAIL; 1 invalid input.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const argv=process.argv.slice(2);
function option(name,defaultValue='') {const i=argv.indexOf('--'+name);return i<0?defaultValue:argv[i+1]??'';}
const beforePath=option('before'), afterPath=option('after'), outPath=option('out');
if(!beforePath || !afterPath) {
  console.error('Usage: node scripts/ari02_6_compare.mjs --before old-gold.json --after new-gold.json [--engine experimental|baseline] [--min-cases 10] [--out report.json]');
  process.exit(1);
}
const scriptPath='src/lib/ontology-research/ari02RegressionV1.ts';
try {
  const source=fs.readFileSync(scriptPath,'utf8');
  const result=ts.transpileModule(source,{fileName:scriptPath,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
  if(result.diagnostics?.length)throw Error('TRANSPILE_DIAGNOSTICS');
  const exported={};
  new Function('exports','require',result.outputText)(exported,()=>{throw Error('UNEXPECTED_RUNTIME_REQUIRE');});
  function read(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
  const report=exported.compareAri02GoldSnapshots(read(beforePath),read(afterPath),option('engine','experimental'),Number(option('min-cases','10')));
  report.sourceFiles={before:path.basename(beforePath),after:path.basename(afterPath)};
  report.generatedAt=new Date().toISOString();
  if(outPath){fs.mkdirSync(path.dirname(path.resolve(outPath)),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(report,null,2),'utf8');}
  console.log(`ARI-02.6: ${report.gate} | comparable P@10: ${report.comparablePrecisionCases}/${report.minComparableCases} | scenarios: ${report.cases.length} | issues: ${report.blockingIssues.length}`);
  console.log(report.gateExplanation);
  if(outPath)console.log('Report:',path.resolve(outPath));
  process.exit(report.gate==='PASS'?0:report.gate==='INCONCLUSIVE'?2:3);
} catch(e){console.error('ARI-02.6 ERROR:',e?.message??e);process.exit(1);}
