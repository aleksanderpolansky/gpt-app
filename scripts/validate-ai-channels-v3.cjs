'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const Module=require('module');
const ts=require('typescript');

const checks=[
 ['src/lib/ai-channels/contracts.ts',['coverageMode?:ChannelCoverageMode','allowedCategories?:string[]','feedPreviewCount?:number','providerKey?:string','coverageSelect','CHANNEL_MODEL_OPTIONS','CHANNEL_ALLOWED_MODELS',"const findingKey='v3:'","minDistinctProviders>maxItems"]],
 ['src/lib/ai-channels/search.ts',['arctor_channel_results_v3','STRICT CATEGORY FILTER','providerKey','coverageInstruction','max_tool_calls',"ResponseCreateParamsNonStreaming['model']"]],
 ['src/lib/ai-channels/server.ts',['providerRuntimeSpec','setChannelItemVisibility','channelId:string','feedPreviewCount:number']],
 ['src/app/api/ai-channels/route.ts',["body.action==='item_visibility'",'setChannelItemVisibility','const safeSpec=who.admin?parsed','model:CHANNEL_MODEL']],
 ['src/app/feed/AiChannels.tsx',['adminMode=false','CHANNEL_MODEL_OPTIONS.map','coverageMode','feedPreviewCount','Расширенные настройки администратора']],
 ['src/app/feed/AiChannelFeedGroup.tsx',['Pokaż jeszcze','item_visibility','data-ai-channel-id']],
 ['src/app/feed/GlobalFeedContent.tsx',['AiChannelFeedGroup','aiGroups = new Map']],
 ['src/app/admin/ai-instructions/ai-instructions-admin-client.tsx',['import AiChannels from "@/app/feed/AiChannels";','<AiChannels locale={interfaceLocale} adminMode />']],
 ['docs/recovery/ARCTOR_AI_CHANNELS_V3_4_ADMIN_COVERAGE_FEED_GROUPING_RU_20260929.md',['ARCTOR_AI_CHANNELS_V3_4','target-only rollback','No production SQL is required']],
];

function fail(message){throw new Error(message);}
function read(file){if(!fs.existsSync(file))fail(`MISSING:${file}`);return fs.readFileSync(file,'utf8');}
function syntax(file){
 const source=read(file);
 const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file,reportDiagnostics:true});
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(errors.length){const text=errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' | ');fail(`TS_SYNTAX:${file}:${text}`);}
 return result.outputText;
}

let markerPass=0;
for(const [file,needles] of checks){
 const text=read(file);
 for(const needle of needles){if(!text.includes(needle))fail(`MISSING_MARKER:${file}:${needle}`);}
 markerPass++;
}

const syntaxFiles=checks.map(x=>x[0]).filter(file=>/\.(ts|tsx)$/.test(file));
for(const file of syntaxFiles)syntax(file);

const contractsFile='src/lib/ai-channels/contracts.ts';
const compiled=syntax(contractsFile);
const tmp=path.join(os.tmpdir(),`arctor-ai-channels-v3-contracts-${process.pid}-${Date.now()}.cjs`);
fs.writeFileSync(tmp,compiled,'utf8');
let contract;
try{
 const m=new Module(tmp,module);m.filename=tmp;m.paths=Module._nodeModulePaths(path.dirname(tmp));m._compile(compiled,tmp);contract=m.exports;
} finally {try{fs.unlinkSync(tmp);}catch{}}

const oid='11111111-1111-4111-8111-111111111111';
const base={name:'test',topic:'grocery promotions',geography:'Szczecin',exclusions:'',domains:[],language:'pl',intervalHours:24,lookbackDays:7,maxItems:20,searchDepth:'detailed',freshness:'current',timeZone:'Europe/Warsaw',model:'gpt-5.6-luna',reasoningEffort:'medium',maxToolCalls:12,searchContextSize:'high',maxOutputTokens:12000,coverageMode:'exhaustive',maxPerProvider:2,minDistinctProviders:3,categoryMode:'strict',allowedCategories:['food_grocery','non_alcoholic_beverage'],feedPreviewCount:1,objectIds:[oid],scope:'public',revision:1};
const parsed=contract.parseChannelSpec(base);
if(parsed.maxItems!==20||parsed.minDistinctProviders!==3||parsed.model!=='gpt-5.6-luna')fail('UNIT_PARSE_VALID_FAILED');
const sanitized=contract.channelSpecWithDefaults({...base,model:'tampered-model',maxToolCalls:999,maxOutputTokens:999999,searchContextSize:'broken',coverageMode:'broken'});
if(sanitized.model!=='gpt-5.4-mini'||sanitized.maxToolCalls!==10||sanitized.maxOutputTokens!==12000||sanitized.searchContextSize!=='high'||sanitized.coverageMode!=='ranked')fail('UNIT_RUNTIME_SANITIZE_FAILED');
for(const bad of [
 {...base,model:'not-a-model'},
 {...base,categoryMode:'strict',allowedCategories:[]},
 {...base,maxItems:2,minDistinctProviders:3},
 {...base,timeZone:'Not/AZone'},
]){
 let threw=false;try{contract.parseChannelSpec(bad);}catch{threw=true;}if(!threw)fail('UNIT_PARSE_REJECT_FAILED');
}
const now=new Date('2026-09-29T12:00:00Z');
const url='https://example.com/offers';
const item=(provider,key,category='food_grocery')=>({title:key,summary:`${provider} offer ${key}`,url,author:null,publishedAt:null,objectIds:[oid],findingKey:key,validFrom:'2026-09-28',validUntil:'2026-09-30',providerKey:provider,category});
const raw=[item('biedronka','a'),item('biedronka','b'),item('biedronka','c'),item('lidl','d'),item('kaufland','e'),item('netto','f'),item('biedronka','watch','electronics')];
const result=contract.validateChannelResults(raw,parsed,[url],now);
if(result.items.length!==5)fail(`UNIT_SELECTION_COUNT:${result.items.length}`);
const counts=new Map();for(const x of result.items)counts.set(x.providerKey,(counts.get(x.providerKey)||0)+1);
if([...counts.values()].some(n=>n>2))fail('UNIT_PROVIDER_CAP_FAILED');
if(result.items.some(x=>x.category==='electronics'))fail('UNIT_CATEGORY_FILTER_FAILED');
if(!result.diagnostics.rejected.category)fail('UNIT_CATEGORY_DIAGNOSTIC_FAILED');
if(result.diagnostics.providerCount<3)fail('UNIT_PROVIDER_DIVERSITY_FAILED');
const expired=contract.validateChannelResults([{...item('lidl','expired'),validUntil:'2026-09-28'}],parsed,[url],now);
if(expired.items.length!==0||!expired.diagnostics.rejected.expired)fail('UNIT_EXPIRED_FILTER_FAILED');
const grounding=contract.validateChannelResults([item('lidl','ground')],parsed,['https://other.example/a'],now);
if(grounding.items.length!==0||!grounding.diagnostics.rejected.source_not_grounded)fail('UNIT_GROUNDING_FAILED');
const sameUrl=contract.validateChannelResults([item('lidl','x'),item('lidl','y')],{...parsed,maxItems:20,coverageMode:'ranked',maxPerProvider:10,minDistinctProviders:1},[url],now);
if(sameUrl.items.length!==2)fail('UNIT_MULTI_FINDING_SAME_URL_FAILED');

console.log(`VALIDATOR=PASS_MARKERS_${markerPass}_${checks.length}`);
console.log(`TS_SYNTAX=PASS_${syntaxFiles.length}`);
console.log('UNIT_CONTRACTS=PASS_9');
