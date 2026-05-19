# P4.10.0-C8-O0 — Route Integration Preflight

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / preflight before debug route integration

This checkpoint does not change runtime code.

Goal: capture exact current route and integration surfaces before C8-O full route replacement behind an explicit feature flag.

## 1. Git status before preflight

```text
?? docs/value-objects/category-derivation-route-integration-preflight-c8-o0.md
```

## 2. Recent commits

```text
c720c1a Verify category derivation persistence with mock Supabase
f68fb20 Verify category derivation persistence transpile
b64e9b9 Add category derivation persistence module
6497d12 Verify category derivation resolver with mock Supabase
f9a9b3d Correct category derivation resolver Unicode normalization
0537c97 Add category derivation resolver
95743d5 Verify Unicode category derivation rules
d4f4dd2 Verify deterministic category derivation rule extractor
c064188 Add deterministic category derivation rule extractor
ee96256 Correct category derivation type contracts
76f5fff Add category derivation type contracts
973e4ca Inventory category derivation runtime integration surface
1598cc1 Plan category derivation extractor implementation
9c3411e Document category derivation runtime regression
d7d09e4 Document corrected category derivation safety check failure
4876269 Document category derivation repo safety check
3c3ae22 Document category derivation live migration verification
317f9db Add category derivation schema verification SQL
2f216d2 Draft category derivation additive schema SQL
8b1271a Plan category derivation additive schema
e7a9c44 Inventory category derivation implementation surface
c79ce3d Document category derivation layer design
c8e004d Document free-text value object runtime verification
4fbb9af Add debug free-text value object test route
c0b5386 Enable controlled free-text value object fallback
c46c9d2 Inspect controlled free-text value object fallback
b1601b5 Inspect free-text value object contracts
44a8e51 Document minimal free-text value object design
```

## 3. Target file status

- FOUND: .\src\app\api\activity\debug\free-text-value-object-test\route.ts (351 lines)
- FOUND: .\lib\activity\categoryDerivation\ruleExtractor.ts (574 lines)
- FOUND: .\lib\activity\categoryDerivation\resolver.ts (349 lines)
- FOUND: .\lib\activity\categoryDerivation\persistDerivations.ts (328 lines)
- FOUND: .\lib\activity\categoryDerivation\types.ts (132 lines)
- FOUND: .\lib\activity\rubricatorValueObjectMapper.ts (865 lines)
- FOUND: .\lib\activity\valueObjectBridge.ts (1394 lines)

## 4. Route integration markers

```text

### Pattern: import
    1: import { NextResponse } from "next/server";
    2: import { randomUUID } from "crypto";
    4: import {
    8: import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
   10: import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
   11: import { supabase } from "../../../../../../lib/supabase";

### Pattern: POST
  151: export async function POST(request: Request) {

### Pattern: request.json
  165: body = (await request.json()) as FreeTextValueObjectTestBody;

### Pattern: inputText
   16: inputText?: unknown;
  144: inputText: "walked to work for 15 minutes",
  188: const inputText = asString(body.inputText) ?? asString(body.naturalInput);
  190: if (!inputText) {
  194: error: "inputText or naturalInput is required.",
  227: input_text: inputText,
  283: inputText,

### Pattern: durationMinutes
   20: durationMinutes?: unknown;
   52: const durationMinutes = asNumber(body.durationMinutes) ?? 15;
   54: if (durationMinutes < 0) {
   57: error: "durationMinutes must be greater than or equal to 0.",
   89: durationMinutes: Math.round(
  105: const endedDate = new Date(startedDate.getTime() + durationMinutes * 60000);
  111: durationMinutes,
  124: const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);
  130: durationMinutes,
  145: durationMinutes: 15,
  232: duration_minutes: timing.durationMinutes,
  284: durationMinutes: timing.durationMinutes,

### Pattern: allowControlledTextFallback
(no matches)

### Pattern: createMissingControlledValueObject
(no matches)

### Pattern: valueObjectBridge
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
  260: const bridgeResult = await processActivityValueObjectBridge({
  312: valueObjectBridge: {
  342: valueObjectBridge: {

### Pattern: created_and_bridge_processed
  309: : "created_and_bridge_processed"

### Pattern: processingLogs
   10: import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
  340: processingLogs: {

### Pattern: return NextResponse.json
  135: return NextResponse.json({
  153: return NextResponse.json(
  167: return NextResponse.json(
  180: return NextResponse.json(
  191: return NextResponse.json(
  203: return NextResponse.json(
  249: return NextResponse.json(
  304: return NextResponse.json({

### Pattern: catch
  166: } catch {

### Pattern: supabase
   11: import { supabase } from "../../../../../../lib/supabase";
  216: const { data: createdEventData, error: createError } = await supabase
  261: supabase,
```

## 5. Category Derivation module exports

```text

### Pattern: export function deriveCategoryCandidates
  105: export function deriveCategoryCandidates(

### Pattern: CATEGORY_DERIVATION_PROCESSOR_VERSION
    8: export const CATEGORY_DERIVATION_PROCESSOR_VERSION = "category_derivation_v1";
  122: processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,
  562: processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,

### Pattern: CATEGORY_DERIVATION_RULE_VERSION
    9: export const CATEGORY_DERIVATION_RULE_VERSION = "rules_v1";
  123: ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
  130: extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
  563: ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
  570: extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
```

## 6. Resolver module exports

```text

### Pattern: export function normalizeCategoryCandidateSlug
   59: export function normalizeCategoryCandidateSlug(value: string): string {

### Pattern: export async function resolveCategoryCandidates
  200: export async function resolveCategoryCandidates(

### Pattern: categoryDerivationResolver
  178: resolver: "categoryDerivationResolver",
  339: resolver: "categoryDerivationResolver",
  347: export const categoryDerivationResolver = {
```

## 7. Persistence module exports

```text

### Pattern: export async function persistCategoryDerivations
  242: export async function persistCategoryDerivations(

### Pattern: categoryDerivationPersistence
   26: export interface CategoryDerivationPersistenceSupabaseClient {
  205: supabase: CategoryDerivationPersistenceSupabaseClient,
  224: supabase: CategoryDerivationPersistenceSupabaseClient,
  243: supabase: CategoryDerivationPersistenceSupabaseClient,
  326: export const categoryDerivationPersistence = {
```

## 8. Bridge return markers

```text

### Pattern: valueObjectCategoryLinkId
  152: valueObjectCategoryLinkId: string | null;
  861: valueObjectCategoryLinkId: string | null;
  881: valueObjectCategoryLinkId: null,
  893: valueObjectCategoryLinkId: null,
  900: valueObjectCategoryLinkId: null,
  972: valueObjectCategoryLinkId: null,
  978: valueObjectCategoryLinkId: (data as { id: string }).id,
 1058: valueObjectCategoryLinkId: null,
 1222: createdItem.valueObjectCategoryLinkId =
 1223: categoryLink.valueObjectCategoryLinkId;

### Pattern: activityEventValueObjectLinkId
  139: * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  142: activityEventValueObjectLinkId: string | null;
  692: activityEventValueObjectLinkId: string | null;
  721: activityEventValueObjectLinkId: null,
  759: activityEventValueObjectLinkId: null,
  766: const activityEventValueObjectLinkId = (projectionData as { id: string }).id;
  775: activityEventValueObjectLinkId,
  789: activityEventValueObjectLinkId,
  815: lastActivityEventValueObjectLinkId: activityEventValueObjectLinkId,
  835: activityEventValueObjectLinkId,
  843: activityEventValueObjectLinkId,
  855: activityEventValueObjectLinkId: string | null;
  870: activityEventValueObjectLinkId,
  927: activityEventValueObjectLinkId,
  958: sourceProjectionId: activityEventValueObjectLinkId,
 1055: activityEventValueObjectLinkId: null,
 1188: createdItem.activityEventValueObjectLinkId =
 1189: v42Projection.activityEventValueObjectLinkId;
 1214: activityEventValueObjectLinkId:
 1215: v42Projection.activityEventValueObjectLinkId,
 1236: activityEventValueObjectLinkId:
 1237: v42Projection.activityEventValueObjectLinkId,

### Pattern: createdCount
(no matches)

### Pattern: processingLogs
(no matches)

### Pattern: value_object_category_links
  913: .from("value_object_category_links")
  955: projection: "value_object_category_links",
 1232: console.warn("P4.9.2 value_object_category_links upsert failed", {
```

## 9. Full current debug route file

```text
    1: import { NextResponse } from "next/server";
    2: import { randomUUID } from "crypto";
    3: 
    4: import {
    5:   ACTIVITY_RECORDING_DISABLED_MESSAGE,
    6:   ACTIVITY_RECORDING_ENABLED,
    7: } from "../../../../../../lib/activity/activityRecordingConfig";
    8: import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
   10: import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
   11: import { supabase } from "../../../../../../lib/supabase";
   12: 
   13: export const dynamic = "force-dynamic";
   14: 
   15: type FreeTextValueObjectTestBody = {
   16:   inputText?: unknown;
   17:   naturalInput?: unknown;
   18:   title?: unknown;
   19:   description?: unknown;
   20:   durationMinutes?: unknown;
   21:   startedAt?: unknown;
   22:   endedAt?: unknown;
   23: };
   24: 
   25: function asString(value: unknown): string | null {
   26:   if (typeof value !== "string") {
   27:     return null;
   28:   }
   29: 
   30:   const trimmed = value.trim();
   31:   return trimmed.length > 0 ? trimmed : null;
   32: }
   33: 
   34: function asNumber(value: unknown): number | null {
   35:   if (typeof value === "number" && Number.isFinite(value)) {
   36:     return value;
   37:   }
   38: 
   39:   if (typeof value === "string") {
   40:     const normalized = value.trim().replace(",", ".");
   41:     const parsed = Number.parseFloat(normalized);
   42: 
   43:     if (Number.isFinite(parsed)) {
   44:       return parsed;
   45:     }
   46:   }
   47: 
   48:   return null;
   49: }
   50: 
   51: function resolveTiming(body: FreeTextValueObjectTestBody) {
   52:   const durationMinutes = asNumber(body.durationMinutes) ?? 15;
   53: 
   54:   if (durationMinutes < 0) {
   55:     return {
   56:       ok: false as const,
   57:       error: "durationMinutes must be greater than or equal to 0.",
   58:     };
   59:   }
   60: 
   61:   const rawStartedAt = asString(body.startedAt);
   62:   const rawEndedAt = asString(body.endedAt);
   63: 
   64:   if (rawStartedAt && rawEndedAt) {
   65:     const startedDate = new Date(rawStartedAt);
   66:     const endedDate = new Date(rawEndedAt);
   67: 
   68:     if (
   69:       Number.isNaN(startedDate.getTime()) ||
   70:       Number.isNaN(endedDate.getTime())
   71:     ) {
   72:       return {
   73:         ok: false as const,
   74:         error: "Invalid startedAt or endedAt.",
   75:       };
   76:     }
   77: 
   78:     if (endedDate.getTime() < startedDate.getTime()) {
   79:       return {
   80:         ok: false as const,
   81:         error: "endedAt must be greater than or equal to startedAt.",
   82:       };
   83:     }
   84: 
   85:     return {
   86:       ok: true as const,
   87:       startedAt: startedDate.toISOString(),
   88:       endedAt: endedDate.toISOString(),
   89:       durationMinutes: Math.round(
   90:         (endedDate.getTime() - startedDate.getTime()) / 60000
   91:       ),
   92:     };
   93:   }
   94: 
   95:   if (rawStartedAt) {
   96:     const startedDate = new Date(rawStartedAt);
   97: 
   98:     if (Number.isNaN(startedDate.getTime())) {
   99:       return {
  100:         ok: false as const,
  101:         error: "Invalid startedAt.",
  102:       };
  103:     }
  104: 
  105:     const endedDate = new Date(startedDate.getTime() + durationMinutes * 60000);
  106: 
  107:     return {
  108:       ok: true as const,
  109:       startedAt: startedDate.toISOString(),
  110:       endedAt: endedDate.toISOString(),
  111:       durationMinutes,
  112:     };
  113:   }
  114: 
  115:   const endedDate = rawEndedAt ? new Date(rawEndedAt) : new Date();
  116: 
  117:   if (Number.isNaN(endedDate.getTime())) {
  118:     return {
  119:       ok: false as const,
  120:       error: "Invalid endedAt.",
  121:     };
  122:   }
  123: 
  124:   const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);
  125: 
  126:   return {
  127:     ok: true as const,
  128:     startedAt: startedDate.toISOString(),
  129:     endedAt: endedDate.toISOString(),
  130:     durationMinutes,
  131:   };
  132: }
  133: 
  134: export async function GET() {
  135:   return NextResponse.json({
  136:     ok: true,
  137:     endpoint: "/api/activity/debug/free-text-value-object-test",
  138:     enabled: ACTIVITY_RECORDING_ENABLED,
  139:     status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
  140:     message: ACTIVITY_RECORDING_ENABLED
  141:       ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
  142:       : ACTIVITY_RECORDING_DISABLED_MESSAGE,
  143:     example: {
  144:       inputText: "walked to work for 15 minutes",
  145:       durationMinutes: 15,
  146:       title: "Walked to work",
  147:     },
  148:   });
  149: }
  150: 
  151: export async function POST(request: Request) {
  152:   if (!ACTIVITY_RECORDING_ENABLED) {
  153:     return NextResponse.json(
  154:       {
  155:         ok: false,
  156:         error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
  157:       },
  158:       { status: 503 }
  159:     );
  160:   }
  161: 
  162:   let body: FreeTextValueObjectTestBody;
  163: 
  164:   try {
  165:     body = (await request.json()) as FreeTextValueObjectTestBody;
  166:   } catch {
  167:     return NextResponse.json(
  168:       {
  169:         ok: false,
  170:         error: "Invalid JSON body.",
  171:       },
  172:       { status: 400 }
  173:     );
  174:   }
  175: 
  176:   const userContext = await getActivityUserContext();
  177:   const { appUser, personActor } = userContext;
  178: 
  179:   if (!appUser || !personActor) {
  180:     return NextResponse.json(
  181:       {
  182:         ok: false,
  183:         error: "Authenticated app user and person actor context are required.",
  184:       },
  185:       { status: 401 }
  186:     );
  187:   }
  188:   const inputText = asString(body.inputText) ?? asString(body.naturalInput);
  189: 
  190:   if (!inputText) {
  191:     return NextResponse.json(
  192:       {
  193:         ok: false,
  194:         error: "inputText or naturalInput is required.",
  195:       },
  196:       { status: 400 }
  197:     );
  198:   }
  199: 
  200:   const timing = resolveTiming(body);
  201: 
  202:   if (!timing.ok) {
  203:     return NextResponse.json(
  204:       {
  205:         ok: false,
  206:         error: timing.error,
  207:       },
  208:       { status: 400 }
  209:     );
  210:   }
  211: 
  212:   const processingRunId = randomUUID();
  213:   const processingStartedAt = new Date();
  214:   const nowIso = new Date().toISOString();
  215: 
  216:   const { data: createdEventData, error: createError } = await supabase
  217:     .from("activity_events")
  218:     .insert({
  219:       user_id: appUser.id,
  220:       performed_by_actor_id: personActor.id,
  221:       acting_as_actor_id: personActor.id,
  222:       acting_for_actor_id: null,
  223:       activity_type_id: null,
  224:       activity_template_id: null,
  225:       template_id: null,
  226:       event_code: null,
  227:       input_text: inputText,
  228:       title: asString(body.title) ?? "Free-text activity test",
  229:       description: asString(body.description),
  230:       started_at: timing.startedAt,
  231:       ended_at: timing.endedAt,
  232:       duration_minutes: timing.durationMinutes,
  233:       source: "manual_chat",
  234:       status: "completed",
  235:       privacy_scope: "private",
  236:       processing_status: "processed",
  237:       metadata_json: {
  238:         parser: "debug_free_text_value_object_test_v1",
  239:         p4Step: "P4.10.0-C7",
  240:         freeTextValueObjectTest: true,
  241:         aiUsed: false,
  242:         createdAt: nowIso,
  243:       },
  244:     })
  245:     .select()
  246:     .single();
  247: 
  248:   if (createError || !createdEventData) {
  249:     return NextResponse.json(
  250:       {
  251:         ok: false,
  252:         error: createError?.message ?? "Failed to create activity event.",
  253:       },
  254:       { status: 500 }
  255:     );
  256:   }
  257: 
  258:   const createdEvent = createdEventData as { id: string };
  259: 
  260:   const bridgeResult = await processActivityValueObjectBridge({
  261:     supabase,
  262:     eventId: createdEvent.id,
  263:     processorName: "activity_debug_free_text_value_object_test",
  264:     allowNonCompletedEvent: false,
  265:   });
  266: 
  267:   const logResult = await safeCreateActivityProcessingLog({
  268:     userId: appUser.id,
  269:     rawSignalId: null,
  270:     activityEventId: createdEvent.id,
  271:     processingRunId,
  272:     processorName: "activity_debug_free_text_value_object_test",
  273:     processingStage: "finalize",
  274:     processingStatus: bridgeResult.ok
  275:       ? bridgeResult.skipped
  276:         ? "skipped"
  277:         : "completed"
  278:       : "warning",
  279:     severity: bridgeResult.ok ? "info" : "warning",
  280:     message: "Debug free-text Value Object bridge processed.",
  281:     input: {
  282:       eventId: createdEvent.id,
  283:       inputText,
  284:       durationMinutes: timing.durationMinutes,
  285:     },
  286:     output: {
  287:       ok: bridgeResult.ok,
  288:       skipped: bridgeResult.skipped,
  289:       skipReason: bridgeResult.skipReason,
  290:       mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
  291:       mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
  292:       bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
  293:       errors: bridgeResult.errors,
  294:     },
  295:     metadata: {
  296:       endpoint: "/api/activity/debug/free-text-value-object-test",
  297:       p4Step: "P4.10.0-C7",
  298:     },
  299:     startedAt: processingStartedAt.toISOString(),
  300:     finishedAt: new Date().toISOString(),
  301:     durationMs: new Date().getTime() - processingStartedAt.getTime(),
  302:   });
  303: 
  304:   return NextResponse.json({
  305:     ok: bridgeResult.ok,
  306:     status: bridgeResult.ok
  307:       ? bridgeResult.skipped
  308:         ? "created_but_bridge_skipped"
  309:         : "created_and_bridge_processed"
  310:       : "created_but_bridge_failed",
  311:     event: createdEventData,
  312:     valueObjectBridge: {
  313:       ok: bridgeResult.ok,
  314:       skipped: bridgeResult.skipped,
  315:       skipReason: bridgeResult.skipReason,
  316:       errors: bridgeResult.errors,
  317:       mapping: bridgeResult.mappingResult
  318:         ? {
  319:             ok: bridgeResult.mappingResult.ok,
  320:             skipped: bridgeResult.mappingResult.skipped,
  321:             skipReason: bridgeResult.mappingResult.skipReason,
  322:             classificationSummaryCount:
  323:               bridgeResult.mappingResult.classificationSummary.length,
  324:             mappingsCount: bridgeResult.mappingResult.mappings.length,
  325:             mappings: bridgeResult.mappingResult.mappings,
  326:           }
  327:         : null,
  328:       bridge: bridgeResult.bridgeResult
  329:         ? {
  330:             ok: bridgeResult.bridgeResult.ok,
  331:             skipped: bridgeResult.bridgeResult.skipped,
  332:             skipReason: bridgeResult.bridgeResult.skipReason,
  333:             mappingsRequested: bridgeResult.bridgeResult.mappingsRequested,
  334:             createdCount: bridgeResult.bridgeResult.created.length,
  335:             created: bridgeResult.bridgeResult.created,
  336:             errors: bridgeResult.bridgeResult.errors,
  337:           }
  338:         : null,
  339:     },
  340:     processingLogs: {
  341:       processingRunId,
  342:       valueObjectBridge: {
  343:         ok: logResult.ok,
  344:         error: logResult.error,
  345:         logId: logResult.log?.id ?? null,
  346:       },
  347:     },
  348:   });
  349: }
  350: 
  351: 
```

## 10. C8-O implementation constraints

- C8-O must integrate Category Derivation only behind an explicit feature flag.
- Existing C7 behavior must remain default-compatible.
- If the flag is absent/false, route behavior must remain effectively the same as C8-H2 regression.
- The integration order should be: deriveCategoryCandidates -> resolveCategoryCandidates -> persistCategoryDerivations.
- The route response should include a categoryDerivation block with extraction/resolution/persistence summaries.
- No value_object_category_links bridge integration yet; that belongs to C8-P.
- After C8-O, run the old C8-H2 regression without the flag and a new flagged regression with the flag.

## 11. Next step

Proceed to P4.10.0-C8-O1:

- create full route replacement for src/app/api/activity/debug/free-text-value-object-test/route.ts
- add Category Derivation behind explicit feature flag
- do not change mapper or bridge yet
- run targeted runtime checks
