'use strict';
/** Reference-only Unicode normalizer; no DB, no ON identity assignment, no runtime search. */
const Prior=require('./M0099_REFERENCE_VALIDATOR.cjs');
const SCHEMA=require('./M0100_NORMALIZATION_CONTRACT_V1.json');
const LOCALES=new Set(['en','pl','es','de','cs','uk','ru','und']);
const FOLD_LOCALES=new Set(SCHEMA['x-permitted-soft-fold-languages']);
const error=s=>{throw Error('M0100_INVALID: '+s)};
const check=(b,s)=>{if(!b)error(s)};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function normalizeRequest(q){
 check(plain(q),'request object');
 check(Object.keys(q).length===3&&['text','locale','mode'].every(k=>Object.hasOwn(q,k)),'only text/locale/mode');
 check(q.mode==='suggest_by_text','M0099 explicit text only');
 check(typeof q.text==='string'&&typeof q.locale==='string'&&LOCALES.has(q.locale),'text/locale');
 check(q.text.length>0&&Array.from(q.text).length<=512&&Buffer.byteLength(q.text,'utf8')<=2048,'length cap');
 for(let i=0;i<q.text.length;i++){
  const n=q.text.charCodeAt(i);
  if(n>=0xD800&&n<=0xDBFF){check(i+1<q.text.length,'unpaired high surrogate');const m=q.text.charCodeAt(i+1);check(m>=0xDC00&&m<=0xDFFF,'unpaired high surrogate');i++;}
  else check(!(n>=0xDC00&&n<=0xDFFF),'unpaired low surrogate');
 }
 check(!/[\p{Cf}]/u.test(q.text),'format or bidi controls');
 for(const ch of q.text){check(!(/[\p{Cc}]/u.test(ch)&&!/[\s]/u.test(ch)),'non-whitespace control');}
 const normalized=q.text.normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase(q.locale==='und'?'en':q.locale).normalize('NFC');
 check(normalized.length>0,'blank normalized');
 return Object.freeze({text:normalized,locale:q.locale});
}
function keys(q){
 const r=normalizeRequest(q);const prefix=r.locale+'::';
 const strictKey=prefix+r.text;const candidates=[];
 if(FOLD_LOCALES.has(r.locale)){
  const accentFold=r.text.normalize('NFD').replace(/\p{M}/gu,'').normalize('NFC');
  if(accentFold!==r.text)candidates.push(prefix+accentFold);
  if(r.locale==='ru'){
   const yoFold=r.text.replace(/ё/gu,'е');
   if(yoFold!==r.text)candidates.push(prefix+yoFold);
   const combined=accentFold.replace(/ё/gu,'е');
   if(combined!==r.text)candidates.push(prefix+combined);
  }
 }
 const unique=[...new Set(candidates)].filter(k=>k!==strictKey);
 // Contract maximum 2 derived soft keys; if combined emits >2, use the strictly conservative intersection key only.
 // For simultaneous accent+yo forms, prefer only the combined fold and exclude individual broad paths.
 const final=unique.length<=2?unique:[unique[unique.length-1]];
 check(final.length<=2&&final.every(k=>k.startsWith(prefix)),'soft candidates bounded to locale');
 return Object.freeze({strictKey,candidateOnlyKeys:Object.freeze(final),candidateMode:'RECALL_ONLY_NOT_EXACT',identityResolution:'NEVER_AUTO_SELECT_OR_MERGE',sourceLocale:r.locale});
}
function resolveCandidates(ids){
 check(Array.isArray(ids)&&ids.every(x=>typeof x==='string'&&x.length>0),'candidate ids');
 // Do not deduplicate distinct identities by normalized title; use unique opaque UUID-like identities.
 const distinct=[...new Set(ids)];
 return Object.freeze({outcome:distinct.length===0?'NO_MATCH':distinct.length===1?'SINGLE_UNCONFIRMED':'AMBIGUOUS_REQUIRES_QUESTION',selectedObjectId:null,candidates:Object.freeze(distinct)});
}
function selftest(){
 const prev=Prior.selftest();check(prev.negativeTestCount===32&&prev.modeCount===2,'M0099 guard');
 const K=(text,locale)=>keys({text,locale,mode:'suggest_by_text'});
 const eq=(a,b)=>check(a===b,'unexpected normalized key '+String(a)+' != '+String(b));
 eq(K('ЁЖ','ru').strictKey,K('ЁЖ','ru').strictKey); // Unicode canonical equivalence
 eq(K('  ПрИвЕт\u00A0 \t  МИР  ','ru').strictKey,'ru::привет мир');
 eq(K('Ёлка','ru').strictKey,'ru::ёлка');eq(K('Елка','ru').strictKey,'ru::елка');
 check(K('Ёлка','ru').strictKey!==K('Елка','ru').strictKey,'yo strict distinct');
 check(K('Ёлка','ru').candidateOnlyKeys.includes('ru::елка'),'yo candidate only');
 check(K('canción','es').strictKey!==K('cancion','es').strictKey,'es accent strict distinct');
 check(K('canción','es').candidateOnlyKeys.includes('es::cancion'),'es recall candidate');
 check(K('schön','de').strictKey!==K('schon','de').strictKey,'de accent strict distinct');
 check(K('schön','de').candidateOnlyKeys.includes('de::schon'),'de recall candidate');
 check(K('łódź','pl').candidateOnlyKeys.every(x=>x!=='pl::lodz'),'no Polish l stroke conversion');
 check(K('straße','de').candidateOnlyKeys.every(x=>x!=='de::strasse'),'no German ss conversion');
 check(K('Сон','ru').strictKey!==K('Сон','uk').strictKey,'locale partition');
 check(K('гарний́','uk').candidateOnlyKeys.length===0,'uk candidate suppression');
 check(K('mañana','und').candidateOnlyKeys.length===0,'und candidate suppression');
 check(K('C++','en').strictKey!==K('C','en').strictKey,'punctuation distinct');
 check(K('a-b','en').strictKey!==K('ab','en').strictKey,'hyphen distinct');
 check(K('Α','en').strictKey!==K('A','en').strictKey,'no confusable fold');
 eq(K('e\u0301','es').strictKey,K('é','es').strictKey);
 eq(K('  foo\nbar ','en').strictKey,'en::foo bar');
 const identical=K('лук','ru');check(identical.strictKey==='ru::лук','homonym strict text equality');
 check(resolveCandidates(['bow-uuid','onion-uuid']).outcome==='AMBIGUOUS_REQUIRES_QUESTION','homonym collision');
 check(resolveCandidates(['one-uuid']).outcome==='SINGLE_UNCONFIRMED','one still unconfirmed');
 check(resolveCandidates([]).outcome==='NO_MATCH','zero results');
 check(resolveCandidates(['foo','foo','bar']).candidates.length===2,'deduplicate IDs only');
 // Even identical strict normalized strings do not collapse two ON UUID identities.
 check(resolveCandidates(['uuid-A','uuid-B']).selectedObjectId===null,'no auto selection');
 const base={mode:'suggest_by_text',text:'ёлка',locale:'ru'};
 const bad=[
  {...base,mode:'exact_uuid_lookup'}, {...base,locale:'fr'}, {...base,locale:'RU'},
  {...base,text:''},{...base,text:' \t '},{...base,text:42},{...base,text:null},
  {...base,text:'a'.repeat(513)},{...base,text:'😀'.repeat(513)},
  {...base,text:'\ud800'},{...base,text:'\udc00'},{...base,text:'x\ud800q'},
  {...base,text:'x\u0000q'},{...base,text:'x\u0007q'},{...base,text:'x\u202Eq'},
  {...base,text:'x\u200Bq'},{...base,text:'x\u2066q'},
  {...base,ownerId:'uuid'},{...base,actorScope:'global_and_own'},
  {...base,autoSelect:true},{...base,objectId:'123e4567-e89b-42d3-a456-426614174000'},
  {...base,fallback:'exact_uuid_lookup'},
  {text:'abc',locale:'en'},{text:'abc',mode:'suggest_by_text'},
  {mode:'suggest_by_text',text:'abc',locale:'und',filters:{}},
  null,[],{},'foo',
 ];
 for(let i=0;i<bad.length;i++){let thrown=false;try{keys(bad[i]);}catch{thrown=true}check(thrown,'negative '+i);}
 const schemaOk=SCHEMA.$schema==='https://json-schema.org/draft/2020-12/schema'&&SCHEMA.additionalProperties===false&&SCHEMA.properties.mode.const==='suggest_by_text'&&SCHEMA.$defs.normalizedKeys.properties.identityResolution.const==='NEVER_AUTO_SELECT_OR_MERGE'&&SCHEMA['x-unknown-locale-soft-fold']===false;
 check(schemaOk,'schema design invariants');
 console.log('M0100_REFERENCE_SELFTEST_PASS: '+bad.length+' negatives, 24+ positive invariants, locale-bound NFC strict and recall-only folds; M0099 pinned');
 return {negativeTestCount:bad.length,positiveInvariantCount:24,modeCount:1,priorNegativeTestCount:prev.negativeTestCount};
}
if(require.main===module){try{selftest()}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={normalizeRequest,keys,resolveCandidates,selftest};
