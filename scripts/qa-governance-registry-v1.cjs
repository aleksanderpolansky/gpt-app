/* AI-GOV-MVP1: compile TS modules with installed TypeScript; deterministic tests, no external I/O. */
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS QA runner uses Node built-ins and TypeScript via require(). */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const vm = require('node:vm');
function loadTypeScript(filename) {
  const source = fs.readFileSync(path.join(process.cwd(), filename), 'utf8');
  const result = ts.transpileModule(source, {compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const testModule = {exports:{}};
  vm.runInNewContext(result.outputText, {module:testModule, exports:testModule.exports});
  return testModule.exports;
}
const reg=loadTypeScript('src/lib/ai/governanceRegistryV1.ts');
const sim=loadTypeScript('src/lib/ai/governanceRulePreviewV1.ts');
let count=0;
function check(ok, message){assert.ok(ok,message);count++;}
check(reg.GOVERNANCE_DOMAINS_V1.length===6,'six domains');
check(new Set(reg.GOVERNANCE_DOMAINS_V1.map(x=>x.code)).size===6,'unique codes');
check(reg.GOVERNANCE_DOMAINS_V1.some(x=>x.code==='personal_activities'),'activities');
check(reg.GOVERNANCE_DOMAINS_V1.some(x=>x.code==='goods_services'),'products');
check(reg.GOVERNANCE_DOMAINS_V1.every(x=>x.systemLink==='/admin/ai-instructions'),'system links');
check(reg.GOVERNANCE_DOMAINS_V1.every(x=>x.personalLink==='/settings/ai-processing'),'personal links');
check(reg.GOVERNANCE_LAYERS_V1.length===5,'five layers');
check(reg.GOVERNANCE_WORKFLOW_STAGES_V1.some(x=>x.code==='ai_fallback'&&x.state==='not_connected'),'AI off');
const rule=sim.GOVERNANCE_SAMPLE_ACTIVITY_RULE_V1;
const activity={text:'Один',domain:'personal_activities',inputMode:'voice_command',locale:'ru'};
const matched=sim.previewGovernanceRuleV1(rule,activity);
check(matched.matched===true,'voice phrase matched');
check(matched.status==='matched_simulation_only','dry run');
check(matched.wouldWriteToDatabase===false,'no writes');
check(matched.wouldCallModel===false,'no AI');
check(matched.wouldChargeAiEur===false,'no charge');
check(matched.proposedOutput.includes('12 подтягиваний'),'expanded candidate');
check(sim.previewGovernanceRuleV1(rule,{...activity,text:'один раз'}).matched===false,'full phrase required');
check(sim.previewGovernanceRuleV1(rule,{...activity,domain:'publications'}).matched===false,'no feed escape');
check(sim.previewGovernanceRuleV1(rule,{...activity,inputMode:'text_activity'}).matched===false,'no text escape');
check(sim.previewGovernanceRuleV1(rule,{...activity,locale:'pl'}).matched===false,'language isolation');
check(sim.previewGovernanceRuleV1({...rule,phrase:''},activity).status==='invalid_rule','empty rule rejected');
const price=sim.GOVERNANCE_SAMPLE_PRICE_RULE_V1;
const post={text:'Картофель по 12,90 крон за килограмм',domain:'publications',inputMode:'feed_post',locale:'ru'};
check(sim.previewGovernanceRuleV1(price,post).matched===true,'price marker');
check(sim.previewGovernanceRuleV1(price,{...post,domain:'personal_activities'}).matched===false,'price does not invade activity');
check(sim.previewGovernanceRuleV1({...price,inputMode:'voice_command'},post).status==='invalid_rule','invalid routing rejected');
check(sim.previewGovernanceRuleV1({...price,locale:'es'},post).matched===false,'locale scoped');
console.log('AI_GOVERNANCE_MVP1_TESTS_PASS '+count+'/'+count);
