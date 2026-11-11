'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const inBundle=fs.existsSync(path.join(root,'ARI02_ERROR_CLASSES_V1.json'));
const catalog=inBundle?root:path.resolve(root,'../../docs/ari/02/error_catalog');
const moduleFile=inBundle?path.join(root,'ari02ErrorClassesV1.ts'):path.resolve(root,'../../src/lib/ontology-research/ari02ErrorClassesV1.ts');
const t=JSON.parse(fs.readFileSync(path.join(catalog,'ARI02_ERROR_CLASSES_V1.json'),'utf8'));
const rev=JSON.parse(fs.readFileSync(path.join(catalog,'M0078_CLASSIFICATION_REVIEW.json'),'utf8'));
const classes=['wrong_facet','wrong_sense','translation','path_only','duplicate','truncation'];
assert.deepEqual(t.classes.map(x=>x.code),classes);
assert.equal(new Set(classes).size,6);for(const x of t.classes)assert(x.definition&&x.requiredEvidence.length>=4&&x.counterexample);
assert.equal(rev.records.length,4);assert.equal(new Set(rev.records.map(x=>x.defectId)).size,4);
for(const r of rev.records){assert(r.classesConfirmed.length===0);assert(r.candidateClasses.every(c=>classes.includes(c)));assert(['UNDETERMINED','CANDIDATE_REVIEW_REQUIRED'].includes(r.classificationStatus));assert.equal(r.goldCaseLinkStatus,'PENDING_M0079');}
assert(rev.records.find(x=>x.registrationStep==='M-0077').candidateClasses.length===0);
const ts=fs.readFileSync(moduleFile,'utf8');
for(const cls of classes)assert(ts.includes(`'${cls}'`));
assert(ts.includes('hasReproducibleRankedEvidence && hasCuratorAdjudication'));
console.log('M0078_SELFTEST_PASS: six class codes, four distinct pre-existing cases, zero unverified confirmations, safe TypeScript guards');
