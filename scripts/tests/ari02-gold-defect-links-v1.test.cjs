'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname;
const file=fs.existsSync(path.join(root,'M0079_GOLD_DEFECT_LINKS_V1.json'))?path.join(root,'M0079_GOLD_DEFECT_LINKS_V1.json'):path.resolve(root,'../../docs/ari/02/error_catalog/M0079_GOLD_DEFECT_LINKS_V1.json');
const d=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(d.contract,'ARCTOR_ARI_M0079_GOLD_DEFECT_LINKS_V1');
assert.equal(d.links.length,4);
assert.equal(new Set(d.links.map(x=>x.defect_id)).size,4);
assert.equal(d.source_gold_cases,156);
assert.equal(d.independent_gold,false);
assert.equal(d.real_recall20,'N/A');
for(const l of d.links){assert(l.gold_case_id&&l.source_sha256&&l.search_mode);assert.equal(l.source_sha256.length,64);assert(l.defect_status.startsWith('OPEN_'));}
const hist=d.links.find(x=>x.registration_step==='M-0077');
assert(hist);assert.equal(hist.search_mode,'UNKNOWN_OLDER_ONTO_AI');assert.equal(hist.run_key,null);assert.equal(hist.historical_http_source_sha256,null);
assert.equal(hist.source_kind,'HISTORICAL_HANDOFF_TEXT_NOT_HTTP_RESPONSE');
assert(hist.link_status.includes('REPRODUCTION_PENDING'));
assert(d.links.filter(x=>x.registration_step==='M-0076').every(x=>x.gold_case_id==='sleep-ari026-duration'));
console.log('M0079_TEST_PASS: 4 distinct defect links, 3 gold IDs, historical NOT reproduced');
