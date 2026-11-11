'use strict';
// M-0110 static safety gates over the REAL WORKTREE. No API execution, no user records, no writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
function source(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
const legacy=source('src/app/api/admin/ontology-research/context/route.ts');
const indexed=source('src/app/api/value-objects/indexed-lookup/route.ts');
const lexical=source('src/lib/ontology-research/lexicalRetrievalV1.ts');
function contains(hay,pattern){assert.match(hay,pattern);}
function absent(hay,pattern){assert.doesNotMatch(hay,pattern);}
function before(hay,a,b){const ia=hay.indexOf(a),ib=hay.indexOf(b);assert(ia>=0&&ib>=0&&ia<ib,`expected ordering: ${a} before ${b}`);}

// Contract comparison is static: no claim about live response values, DB coverage, or RLS.
test('M0110 legacy research endpoint remains GET',()=>contains(legacy,/export async function GET\(request: Request\)/));
test('M0110 legacy endpoint continues using ONTO_AI_PILOT_CONTRACT',()=>contains(legacy,/contract:ONTO_AI_PILOT_CONTRACT/));
test('M0110 legacy endpoint retains admin access check',()=>contains(legacy,/requirePlatformAdmin\(\{ allowedRoles: \["owner", "admin", "viewer"\] \}\)/));
test('M0110 legacy endpoint preserves q query key',()=>contains(legacy,/searchParams\.get\("q"\)/));
test('M0110 legacy endpoint preserves locale query key',()=>contains(legacy,/searchParams\.get\("locale"\)/));
test('M0110 legacy endpoint preserves search-option parser',()=>contains(legacy,/parseSearchOptions\(url\.searchParams\)/));
test('M0110 legacy success keeps ontology and templates fields',()=>contains(legacy,/ontology,templates:selectedTemplates/));
test('M0110 legacy success retains scanned counts',()=>contains(legacy,/scanned:\{ontology:rows\.length,templates:templates\.length\}/));
test('M0110 legacy success retains searchDetails',()=>contains(legacy,/searchDetails:\s*\{/));
test('M0110 legacy success retains catalogTotals',()=>contains(legacy,/catalogTotals:\{ontology:snapshot\.total,templates:templateResponse\.count\}/));
test('M0110 legacy exposes incomplete coverage rather than proving absence',()=>contains(legacy,/coverage:"partial"/));
test('M0110 legacy includes cautionary warnings',()=>contains(legacy,/warnings:warningStrings\(locale,noMatch,incomplete,templateTruncated\)/));
test('M0110 legacy response does not claim writes or AI calls',()=>contains(legacy,/dbWritesPerformed:false,aiCallsPerformed:false/));
test('M0110 legacy has no imported new lexical module',()=>absent(legacy,/\blexicalRetrievalV1\b/));
test('M0110 legacy route does not depend on new feature flag',()=>absent(legacy,/ARCTOR_ON_INDEXED_LOOKUP_V1/));
test('M0110 legacy read ceiling still explicit and non-exhaustive',()=>{contains(legacy,/const MAX_ON_ROWS = 5000/);contains(legacy,/const PAGE_SIZE = 500/);});
test('M0110 indexed route remains a separate POST',()=>contains(indexed,/export async function POST\(request: Request\)/));
test('M0110 indexed feature flag defaults closed unless enabled',()=>contains(indexed,/process\.env\.ARCTOR_ON_INDEXED_LOOKUP_V1 !== "enabled"/));
test('M0110 feature disabled response is 404',()=>contains(indexed,/errorCode: "FEATURE_DISABLED" \}, 404/));
test('M0110 feature gate is evaluated before auth and RPC',()=>{before(indexed,'process.env.ARCTOR_ON_INDEXED_LOOKUP_V1','auth0.getSession()');before(indexed,'auth0.getSession()','supabase.rpc(');});
test('M0110 indexed route verifies authentication',()=>contains(indexed,/errorCode: "AUTH_REQUIRED"/));
test('M0110 indexed route verifies active actor context',()=>contains(indexed,/resolveActiveActorContext\(session\.user\.sub\)/));
test('M0110 indexed route binds owner identifiers only to server actor context',()=>{contains(indexed,/p_owner_user_id: actor\.appUserId/);contains(indexed,/p_owner_actor_id: actor\.actorId/);});
test('M0110 indexed RPC errors fail closed without legacy fallback',()=>{contains(indexed,/errorCode: "INDEXED_LOOKUP_UNAVAILABLE"/);contains(indexed,/searchComplete: false/);absent(indexed,/loadSystemOnSnapshot\(/);});
test('M0110 indexed result never authorizes ON duplication',()=>{contains(indexed,/noMatchProvesAbsence: false/);contains(indexed,/duplicateCreationAuthorized: false/);});
test('M0110 indexed response includes cursor pagination',()=>contains(indexed,/pagination: \{ pageSize: options\.limit, hasMore, nextCursor/));
test('M0110 indexed response marks no DB writes or AI calls',()=>contains(indexed,/dbWritesPerformed: false,\s*aiCallsPerformed: false/));
test('M0110 lexical module remains independent of HTTP route and env flag',()=>{absent(lexical,/NextResponse|auth0\.getSession|process\.env\.ARCTOR_ON_INDEXED_LOOKUP_V1/);});
