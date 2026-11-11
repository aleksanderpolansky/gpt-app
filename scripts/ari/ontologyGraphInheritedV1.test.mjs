/** M-0196 / ARI-04.07.03 deterministic, offline, read-only contract tests. */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import fs from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const root=process.env.ARCTOR_REPO?resolve(process.env.ARCTOR_REPO):resolve(here,'../..');
const mod=await import('file://'+join(root,'src/lib/ontology/graphInheritedV1.ts').replaceAll('\\','/'));
const {projectInheritedRelationsV1:P,composeGraphReadWithInheritanceV1:C}=mod;
const rule=(o={})=>({rule_id:'rule_a',rule_version:'v1',relation_type_code:'depends_on',scope:'system',status:'approved',max_depth:2,applicability_code:'structural',...o});
const cand=(o={})=>({candidate_id:'cand_a',source_value_object_id:'anchor',target_value_object_id:'neighbor',relation_type_code:'depends_on',scope:'system',rule_id:'rule_a',rule_version:'v1',depth:2,applicability:'applicable',applicability_code:'structural',support_relation_ids:['rel_a','rel_b'],evidence_refs:['https://example.org/source/v1#x'],...o});
const args=(o={})=>({anchorValueObjectId:'anchor',scope:'system',visibleValueObjectIds:['neighbor'],approvedRules:[rule()],candidates:[cand()],limit:25,...o});
const valid=()=>P(args());
let fixtures=0,invariants=0;
const check=(fn)=>{fn();fixtures++};
const inv=(fn)=>{fn();invariants++};
for(let i=0;i<12;i++)check(()=>{
 const src=cand({candidate_id:'c_'+i,target_value_object_id:'neighbor'});
 const r=P(args({candidates:[src]}));
 assert.equal(r.inheritedRelations.length,1);
 assert.equal(r.inheritedRelations[0].rule_id,'rule_a');
 assert.equal(r.inheritedRelations[0].depth,2);
 assert.equal(r.inheritedRelations[0].applicability,'applicable');
 assert.equal(r.inheritedRelations[0].epistemicStatus,'DERIVED_CANDIDATE');
 assert.equal(r.inheritedRelations[0].verified,false);
});
for(let i=0;i<12;i++)check(()=>{
 const statuses=['needs_review','blocked'];
 const r=P(args({candidates:[cand({candidate_id:'cand_'+i,applicability:statuses[i%2]})]}));
 assert.equal(r.inheritedRelations.length,0);assert.equal(r.inheritanceReview.length,1);
 assert.equal(r.inheritanceReview[0].applicability,statuses[i%2]);
});
for(let i=0;i<12;i++)check(()=>{
 const modes=[{scope:'actor',owner_user_id:'otherUser',owner_actor_id:'otherActor'},{status:'draft'},{status:'retired'},{rule_version:'v2'},{relation_type_code:'supports'},{max_depth:1}];
 const r=P(args({approvedRules:[rule(modes[i%6])]}));
 assert.equal(r.inheritedRelations.length,0);assert.equal(r.rejectedCandidateCount,1);
});
for(let i=0;i<12;i++)check(()=>{
 const bad=[{support_relation_ids:[]},{evidence_refs:[]},{depth:0},{depth:3},
 {scope:'actor'},{target_value_object_id:'secret'}];
 const r=P(args({candidates:[cand(bad[i%6])]}));
 assert.equal(r.inheritedRelations.length,0);assert.equal(r.rejectedCandidateCount,1);
});
for(let i=0;i<12;i++)check(()=>{
 const seed=cand({candidate_id:'c'+i});
 const r=P(args({candidates:[seed,{...seed,candidate_id:'dup'+i}]}));
 assert.equal(r.inheritedRelations.length,1);
 const two=P(args({candidates:[seed,{...seed,candidate_id:'alt'+i,evidence_refs:['ref_new']}]}));
 assert.equal(two.inheritedRelations.length,2);
});
for(let i=0;i<12;i++)check(()=>{
 const r=P(args({candidates:[cand({candidate_id:'c'+i}),cand({candidate_id:'z'+i,target_value_object_id:'other'})],visibleValueObjectIds:['neighbor']}));
 const direct=[{relationId:'r'+i}];
 const merged=C({directRelations:direct,derived:r});
 assert.equal(merged.directRelations.length,1);assert.equal(merged.inheritedRelations.length,1);
 assert.equal(merged.inheritanceRuleRuntimeVerified,false);
 assert.notEqual(merged.directRelations, direct);
});
assert.equal(fixtures,72);
for(let i=0;i<8;i++)inv(()=>{
 const v=valid();assert.equal(v.runtimeRulesVerified,false);
 assert.equal(v.inheritedRelations[0].verified,false);
 assert.equal(v.inheritedRelations[0].supportRelationIds.length,2);
 assert.equal(v.inheritedRelations[0].evidenceRefs[0],'https://example.org/source/v1#x');
});
for(let i=0;i<8;i++)inv(()=>{
 const obj=args({limit:0});assert.throws(()=>P(obj));
 assert.throws(()=>P(args({limit:51})));assert.throws(()=>P(args({limit:1.5})));
});
for(let i=0;i<8;i++)inv(()=>{
 assert.throws(()=>P(args({approvedRules:[rule(),rule()]})));
 assert.throws(()=>P(args({approvedRules:[rule({rule_id:'BAD RULE'})]})));
});
for(let i=0;i<8;i++)inv(()=>{
 const input=args();const baseline=JSON.stringify(input);P(input);assert.equal(JSON.stringify(input),baseline);
 const item=valid().inheritedRelations[0];assert.equal(Object.hasOwn(item,'isVerified'),false);
 assert.equal(Object.hasOwn(item,'relationId'),false);
 assert.throws(()=>P(args({scope:'actor'})));
 const actorRule=rule({scope:'actor',owner_user_id:'userA',owner_actor_id:'actorA'});
 const actorCand=cand({scope:'actor',owner_user_id:'userA',owner_actor_id:'actorA'});
 assert.equal(P(args({scope:'actor',ownerUserId:'userA',ownerActorId:'actorA',approvedRules:[actorRule],candidates:[actorCand]})).inheritedRelations.length,1);
 assert.equal(P(args({scope:'actor',ownerUserId:'userB',ownerActorId:'actorA',approvedRules:[actorRule],candidates:[actorCand]})).inheritedRelations.length,0);
});
for(let i=0;i<8;i++)inv(()=>{
 const r=P(args({candidates:[cand({depth:1}),cand({candidate_id:'b',depth:2})],limit:1}));
 assert.equal(r.truncated,true);assert.equal(r.inheritedRelations.length,1);
 assert.equal(r.inheritedRelations[0].depth,1);
});
assert.equal(invariants,40);
const src=fs.readFileSync(join(root,'src/lib/ontology/graphInheritedV1.ts'),'utf8');
assert(!/\b(?:fetch|supabase|postgres|createClient|insert|update|delete|writeFileSync|execSync)\s*\(/.test(src));
assert(src.includes('epistemicStatus'));
console.log('M-0196 SYNTHETIC INHERITED PROJECTION FIXTURES PASS: 72/72');
console.log('M-0196 INDEPENDENT INHERITANCE INVARIANTS PASS: 40/40');
console.log('M-0196 LOCAL READONLY: no live rule engine, API/DB/network, ledger or graph writes.');
