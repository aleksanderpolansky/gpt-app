'use strict';
// Offline non-production smoke test for documented known limitations. Does not alter runtime search.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const catalog=path.join(root,'docs','ari','02','error_catalog');
const p=path.join(catalog,'M0080_EXPERIMENTAL_DICTIONARY_LIMITATIONS_V1.json');
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const src=fs.readFileSync(path.join(root,d.source.repo_path));
const sha=crypto.createHash('sha256').update(src).digest('hex').toUpperCase();
assert.equal(sha,d.source.sha256);assert.equal(d.limitations.length,6);
assert.deepEqual(d.limitations.map(x=>x.id),Array.from({length:6},(_,i)=>'ARI02-LIM-DICT-'+String(i+1).padStart(3,'0')));
for(const x of d.limitations){assert.equal(x.dbRootCauseProven,false);assert.ok(src.toString().includes(x.verificationAnchor));}
assert.equal(d.dbDefectProven,false);assert.equal(d.indexedSearchARI03Tested,false);assert.equal(d.realRecall20,'N/A');
assert.equal(d.relatedFrozenDefect.status,'OPEN_UNFIXED');
const linked=JSON.parse(fs.readFileSync(path.join(catalog,'M0079_GOLD_DEFECT_LINKS_V1.json'),'utf8'));
assert.equal(linked.links.length,4);assert.equal(d.relatedFrozenDefect.source_http_sha256,linked.links[0].source_sha256);
console.log('M0080_OFFLINE_TEST_PASS: 6 limitations, source SHA, M0079 provenance, no DB claim');
