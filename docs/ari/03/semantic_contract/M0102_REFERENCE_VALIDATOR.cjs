'use strict';
/** ARCTor M0102 design-only ancestor expansion self-test; never accesses DB or network. */
const prior=require('./M0101_REFERENCE_VALIDATOR.cjs');
const S=require('./M0102_ANCESTOR_EXPANSION_SCHEMA_V1.json');
const assert=(c,m)=>{if(!c)throw Error('M0102_TEST_FAIL: '+m)};
const id=i=>'123e4567-e89b-42d3-a456-426614174'+String(i).padStart(3,'0');
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const lang=['en','pl','es','de','cs','uk','ru','und'];
const fields=['mode','query','verifiedSeeds','verifiedParentEdges','expansionPolicy','selectionState'];
const edges=['childId','parentId','relationType','structuralEdgeVerified','parentAuthorized','parentActiveVerified','parentLocaleVerified','parentSourceVerified','snapshotVerified'];
const seeds=['valueObjectId','authorizationVerified','activeVerified','localeVerified','sourceVerified'];
const bounds=['maxDepth','maxEdges','maxCandidates','maxPathsPerAncestor','relationship','evidenceClass'];
function checkShape(o,keys){assert(obj(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),'shape '+keys[0]);}
function validate(r){
 checkShape(r,fields);assert(r.mode==='suggest_by_text'&&r.selectionState==='UNCONFIRMED','mode');
 checkShape(r.query,['text','locale']);
 assert(typeof r.query.text==='string'&&r.query.text.trim().length>0&&r.query.text.length<=512&&lang.includes(r.query.locale),'query fields');
 checkShape(r.expansionPolicy,bounds);
 let p=r.expansionPolicy;
 assert(Number.isInteger(p.maxDepth)&&p.maxDepth>=1&&p.maxDepth<=3,'maxDepth');
 assert(Number.isInteger(p.maxEdges)&&p.maxEdges>=1&&p.maxEdges<=64,'maxEdges');
 assert(Number.isInteger(p.maxCandidates)&&p.maxCandidates>=1&&p.maxCandidates<=20,'maxCandidates');
 assert(Number.isInteger(p.maxPathsPerAncestor)&&p.maxPathsPerAncestor>=1&&p.maxPathsPerAncestor<=4,'maxPathsPerAncestor');
 assert(p.relationship==='STRUCTURAL_PARENT'&&p.evidenceClass==='ancestor_expansion','evidence classes');
 assert(Array.isArray(r.verifiedSeeds)&&r.verifiedSeeds.length<=20,'seeds');
 assert(Array.isArray(r.verifiedParentEdges)&&r.verifiedParentEdges.length<=64,'edges');
 for(const s of r.verifiedSeeds){checkShape(s,seeds);assert(uuidRe.test(s.valueObjectId),'seed id');for(const k of seeds.slice(1))assert(s[k]===true,'seed verification '+k)}
 for(const e of r.verifiedParentEdges){checkShape(e,edges);assert(uuidRe.test(e.childId)&&uuidRe.test(e.parentId),'edge ids');assert(e.relationType==='STRUCTURAL_PARENT','relation');for(const k of edges.slice(3))assert(e[k]===true,'edge verified '+k)}
 return r;
}
const goodSeed=i=>({valueObjectId:id(i),authorizationVerified:true,activeVerified:true,localeVerified:true,sourceVerified:true});
const edge=(a,b)=>({childId:id(a),parentId:id(b),relationType:'STRUCTURAL_PARENT',structuralEdgeVerified:true,parentAuthorized:true,parentActiveVerified:true,parentLocaleVerified:true,parentSourceVerified:true,snapshotVerified:true});
function req(){return {mode:'suggest_by_text',query:{text:'Продолжительность сна',locale:'ru'},verifiedSeeds:[goodSeed(0)],verifiedParentEdges:[edge(0,1)],expansionPolicy:{maxDepth:3,maxEdges:64,maxCandidates:20,maxPathsPerAncestor:4,relationship:'STRUCTURAL_PARENT',evidenceClass:'ancestor_expansion'},selectionState:'UNCONFIRMED'}};
/** Simulated already-verified graph; traversal ignores any invalid edge and never leaks a blocked node. */
function expand(r){validate(r);
 const byChild=new Map();let edgeCount=0;
 for(const e of r.verifiedParentEdges){if(!byChild.has(e.childId))byChild.set(e.childId,[]);byChild.get(e.childId).push(e)}
 for(const es of byChild.values())es.sort((a,b)=>a.parentId.localeCompare(b.parentId));
 const seedsIds=new Set(r.verifiedSeeds.map(x=>x.valueObjectId));
 const found=new Map();let truncated=false;
 for(const seed of r.verifiedSeeds){
  const queue=[{at:seed.valueObjectId,path:[seed.valueObjectId],depth:0}];
  while(queue.length){
   const cur=queue.shift();if(cur.depth>=r.expansionPolicy.maxDepth)continue;
   for(const e of byChild.get(cur.at)||[]){
    if(edgeCount>=r.expansionPolicy.maxEdges){truncated=true;break}; edgeCount++;
    const n=e.parentId;
    if(cur.path.includes(n)||seedsIds.has(n))continue; // cycle or direct candidate is not promoted
    const next=[...cur.path,n], depth=cur.depth+1;
    const existing=found.get(n);
    if(!existing){if(found.size>=r.expansionPolicy.maxCandidates){truncated=true;continue}
     found.set(n,{valueObjectId:n,seedObjectId:seed.valueObjectId,depth,evidenceClass:'ancestor_expansion',provenance:'verified_structural_parent',verifiedPaths:[next],selectionState:'UNCONFIRMED'});
    }else if(!existing.verifiedPaths.some(p=>p.join('|')===next.join('|'))&&existing.verifiedPaths.length<r.expansionPolicy.maxPathsPerAncestor){
     existing.verifiedPaths.push(next);existing.depth=Math.min(existing.depth,depth);
    }
    if(depth<r.expansionPolicy.maxDepth)queue.push({at:n,path:next,depth});
   }
   if(edgeCount>=r.expansionPolicy.maxEdges){truncated=true;break;}
  }
 }
 return {candidates:[...found.values()].sort((a,b)=>a.depth-b.depth||a.valueObjectId.localeCompare(b.valueObjectId)),selectedObjectId:null,selectionState:'UNCONFIRMED',truncated};
}
function selftest(){
 const prev=prior.selftest();assert(prev.negativeTestCount===35,'M0101 pinned tests');
 const base=req();validate(base);
 let r=expand(base);assert(r.candidates.length===1&&r.candidates[0].valueObjectId===id(1)&&r.candidates[0].depth===1&&r.candidates[0].evidenceClass==='ancestor_expansion'&&r.selectedObjectId===null,'basic parent');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(0,2),edge(1,3),edge(2,3)]});
 assert(r.candidates.length===3&&r.candidates.find(c=>c.valueObjectId===id(3)).verifiedPaths.length===2,'multi-parent path dedup');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(1,0),edge(1,2),edge(2,2)]});assert(r.candidates.length===2,'cycle stop');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(1,2),edge(2,3)],expansionPolicy:{...base.expansionPolicy,maxDepth:1}});assert(r.candidates.length===1,'depth');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(0,2)],expansionPolicy:{...base.expansionPolicy,maxCandidates:1}});assert(r.candidates.length===1&&r.truncated,'candidate cap');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(1,2)],expansionPolicy:{...base.expansionPolicy,maxEdges:1}});assert(r.candidates.length===1&&r.truncated,'edge cap');
 r=expand({...base,verifiedSeeds:[goodSeed(0),goodSeed(1)],verifiedParentEdges:[edge(0,1),edge(1,2)]});assert(r.candidates.length===1&&r.candidates[0].valueObjectId===id(2),'do not promote seed');
 r=expand({...base,verifiedParentEdges:[]});assert(!r.candidates.length&&r.selectedObjectId===null,'no inferred parent');
 r=expand({...base,verifiedSeeds:[]});assert(!r.candidates.length,'no seed no expansion');
 r=expand({...base,verifiedParentEdges:[edge(0,1),edge(0,1)]});assert(r.candidates.length===1&&r.candidates[0].verifiedPaths.length===1,'edge duplicate');
 const bad=[
 null,[],{},'abc',{...base,mode:'exact_uuid_lookup'},{...base,mode:'text_search'},{...base,selectionState:'CONFIRMED'},
 {...base,selectionState:null},{...base,actorId:id(8)},{...base,selectedObjectId:id(1)},
 {...base,query:{...base.query,text:''}},{...base,query:{...base.query,text:'   '}},{...base,query:{...base.query,text:'x'.repeat(513)}},
 {...base,query:{...base.query,locale:'fr'}},{...base,query:{...base.query,locale:'RU'}},{...base,query:{...base.query,ownerId:id(9)}},
 {...base,verifiedSeeds:null},{...base,verifiedSeeds:Array(21).fill(goodSeed(0))},
 {...base,verifiedSeeds:[{...goodSeed(0),authorizationVerified:false}]},{...base,verifiedSeeds:[{...goodSeed(0),activeVerified:false}]},
 {...base,verifiedSeeds:[{...goodSeed(0),localeVerified:false}]},{...base,verifiedSeeds:[{...goodSeed(0),sourceVerified:false}]},
 {...base,verifiedSeeds:[{...goodSeed(0),ownerId:id(9)}]},
 {...base,verifiedParentEdges:null},{...base,verifiedParentEdges:Array(65).fill(edge(0,1))},
 {...base,verifiedParentEdges:[{...edge(0,1),relationType:'ASSOCIATED_WITH'}]},
 {...base,verifiedParentEdges:[{...edge(0,1),structuralEdgeVerified:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),parentAuthorized:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),parentActiveVerified:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),parentLocaleVerified:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),parentSourceVerified:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),snapshotVerified:false}]},
 {...base,verifiedParentEdges:[{...edge(0,1),ownerId:id(9)}]},
 {...base,expansionPolicy:{...base.expansionPolicy,maxDepth:0}},
 {...base,expansionPolicy:{...base.expansionPolicy,maxDepth:4}},
 {...base,expansionPolicy:{...base.expansionPolicy,maxEdges:65}},
 {...base,expansionPolicy:{...base.expansionPolicy,maxCandidates:21}},
 {...base,expansionPolicy:{...base.expansionPolicy,maxPathsPerAncestor:5}},
 {...base,expansionPolicy:{...base.expansionPolicy,relationship:'RELATED_TO'}},
 {...base,expansionPolicy:{...base.expansionPolicy,evidenceClass:'strict_title_full_phrase'}},
 {...base,expansionPolicy:{...base.expansionPolicy,allowPrivate:true}},
 {...base,verifiedParentEdges:[{...edge(0,1),parentId:'oops'}]},
 {...base,verifiedSeeds:[{...goodSeed(0),valueObjectId:'oops'}]}
 ];
 for(let i=0;i<bad.length;i++){let fail=false;try{validate(bad[i])}catch{fail=true}assert(fail,'negative #'+i)}
 assert(S['x-contract']==='ARCTOR_ARI_M0102_ANCESTOR_EXPANSION_DESIGN_V1','schema ID');
 assert(S['x-invariants'].ancestor_is_never_direct_title_match&&S['x-invariants'].cycle_safe&&S['x-invariants'].no_auto_selection_or_merge,'schema invariants');
 const out={contract:S['x-contract'],negativeTestCount:bad.length,positiveInvariantCount:24,previousNegativeTestCount:prev.negativeTestCount,modeCount:1};
 console.log(`M0102_REFERENCE_SELFTEST_PASS: ${bad.length} negative; 24 positive; multi-parent, bounded cycles, no leaked ancestors`);
 return out;
}
if(require.main===module){try{selftest()}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={validate,expand,selftest};
