# P4.10.0-C8-P3-B0 — Exact Bridge Edit Map

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / exact edit map before TypeScript bridge patch

This checkpoint does not change runtime code.

Goal: prove exact insertion/replacement points before adding optional additionalCategoryLinks to valueObjectBridge.ts.

## 1. Git status

```text
?? docs/value-objects/category-derivation-bridge-edit-map-c8-p3-b0.md
```

## 2. Recent commits

```text
8602757 Restore full category derivation bridge preflight report
b6b6c87 Preflight category derivation bridge implementation
3f347a1 Preflight category derivation bridge implementation
9178350 Document category link constraint inspection result
ad52d4d Remove diagnostic section from category link constraint inspection SQL
efb4c73 Fix value object category link constraint inspection SQL
53b58aa Add value object category link constraint inspection SQL
d2510a0 Document category derivation bridge integration contract
9a86207 Remove duplicate fast category link inventory report
0cff9ac Inventory category derivation bridge category link path
12412ee Inventory category derivation bridge category link path
796aa07 Document route derivation live DB verification result
```

## 3. File line counts

```text
.\lib\activity\valueObjectBridge.ts => 1394 lines
.\lib\activity\activityValueObjectLifecycle.ts => 133 lines
.\src\app\api\activity\debug\free-text-value-object-test\route.ts => 673 lines
```

## 4. BridgeSource type

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts line 3, pattern: type BridgeSource, range 1-33 -----
    1: import type { SupabaseClient } from "@supabase/supabase-js";
    2: 
    3: type BridgeSource =
    4:   | "rule"
    5:   | "manual"
    6:   | "ai_draft"
    7:   | "api"
    8:   | "system"
    9:   | "correction"
   10:   | "commercial";
   11: 
   12: type V42ProjectionSource = "rule" | "ai" | "manual" | "system_seed" | "migration";
   13: 
   14: type ValueObjectCategoryRole =
   15:   | "primary"
   16:   | "semantic_component"
   17:   | "context"
   18:   | "object"
   19:   | "action"
   20:   | "goal"
   21:   | "protocol"
   22:   | "general_meaning"
   23:   | "system_suggested";
   24: 
   25: type ValueObjectStateDeltaDirection =
   26:   | "increase"
   27:   | "decrease"
   28:   | "neutral"
   29:   | "set";
   30: 
   31: type ValueObjectInstanceStatus =
   32:   | "draft"
   33:   | "planned"
```

## 5. ValueObjectBridgeMapping type

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts line 81, pattern: export type ValueObjectBridgeMapping, range 66-141 -----
   66:   classificationId: string | null;
   67:   contextId: string | null;
   68:   contextCode: string | null;
   69:   contextName: string | null;
   70:   objectTypeId: string | null;
   71:   objectTypeCode: string | null;
   72:   objectTypeName: string | null;
   73:   actionTypeId: string | null;
   74:   actionTypeCode: string | null;
   75:   actionTypeName: string | null;
   76:   controlledRule: string | null;
   77:   mapper: string | null;
   78:   mapperVersion: string | null;
   79: };
   80: 
   81: export type ValueObjectBridgeMapping = {
   82:   valueObjectId: string;
   83: 
   84:   relationType?:
   85:     | "executes"
   86:     | "creates"
   87:     | "uses"
   88:     | "supports"
   89:     | "consumes"
   90:     | "updates_state"
   91:     | "commercial_source"
   92:     | "related_to";
   93: 
   94:   weight?: number;
   95:   confidence?: number;
   96:   source?: BridgeSource;
   97: 
   98:   instanceStatus?: ValueObjectInstanceStatus;
   99:   instanceTitle?: string | null;
  100:   instanceNote?: string | null;
  101:   resultStatus?: string | null;
  102:   qualityScore?: number | null;
  103: 
  104:   metricKey: string;
  105:   metricUnit?: string | null;
  106:   deltaValueNumeric?: number | null;
  107:   deltaValueText?: string | null;
  108:   deltaDirection?: ValueObjectStateDeltaDirection;
  109: 
  110:   aggregateDate?: string | null;
  111:   aggregateType?: string;
  112:   aggregateKey?: string;
  113: 
  114:   metadata?: Record<string, unknown>;
  115: };
  116: 
  117: export type ProcessValueObjectBridgeInput = {
  118:   supabase: SupabaseClient;
  119:   eventId: string;
  120:   mappings: ValueObjectBridgeMapping[];
  121:   source?: BridgeSource;
  122:   allowNonCompletedEvent?: boolean;
  123:   processorName?: string;
  124: };
  125: 
  126: export type ValueObjectBridgeCreatedItem = {
  127:   valueObjectId: string;
  128:   valueObjectInstanceId: string | null;
  129:   linkId: string | null;
  130:   stateDeltaId: string | null;
  131:   aggregateId: string | null;
  132:   snapshotId: string | null;
  133: 
  134:   /**
  135:    * P4.9.1 additive v4.2 projection fields.
  136:    *
  137:    * These do not replace the old VOI pipeline:
  138:    * - linkId still refers to activity_event_value_object_instance_links;
  139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
  141:    */
```

## 6. ProcessValueObjectBridgeInput type

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts line 117, pattern: export type ProcessValueObjectBridgeInput, range 107-142 -----
  107:   deltaValueText?: string | null;
  108:   deltaDirection?: ValueObjectStateDeltaDirection;
  109: 
  110:   aggregateDate?: string | null;
  111:   aggregateType?: string;
  112:   aggregateKey?: string;
  113: 
  114:   metadata?: Record<string, unknown>;
  115: };
  116: 
  117: export type ProcessValueObjectBridgeInput = {
  118:   supabase: SupabaseClient;
  119:   eventId: string;
  120:   mappings: ValueObjectBridgeMapping[];
  121:   source?: BridgeSource;
  122:   allowNonCompletedEvent?: boolean;
  123:   processorName?: string;
  124: };
  125: 
  126: export type ValueObjectBridgeCreatedItem = {
  127:   valueObjectId: string;
  128:   valueObjectInstanceId: string | null;
  129:   linkId: string | null;
  130:   stateDeltaId: string | null;
  131:   aggregateId: string | null;
  132:   snapshotId: string | null;
  133: 
  134:   /**
  135:    * P4.9.1 additive v4.2 projection fields.
  136:    *
  137:    * These do not replace the old VOI pipeline:
  138:    * - linkId still refers to activity_event_value_object_instance_links;
  139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
  141:    */
  142:   activityEventValueObjectLinkId: string | null;
```

## 7. ValueObjectBridgeCreatedItem type

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts line 126, pattern: export type ValueObjectBridgeCreatedItem, range 116-171 -----
  116: 
  117: export type ProcessValueObjectBridgeInput = {
  118:   supabase: SupabaseClient;
  119:   eventId: string;
  120:   mappings: ValueObjectBridgeMapping[];
  121:   source?: BridgeSource;
  122:   allowNonCompletedEvent?: boolean;
  123:   processorName?: string;
  124: };
  125: 
  126: export type ValueObjectBridgeCreatedItem = {
  127:   valueObjectId: string;
  128:   valueObjectInstanceId: string | null;
  129:   linkId: string | null;
  130:   stateDeltaId: string | null;
  131:   aggregateId: string | null;
  132:   snapshotId: string | null;
  133: 
  134:   /**
  135:    * P4.9.1 additive v4.2 projection fields.
  136:    *
  137:    * These do not replace the old VOI pipeline:
  138:    * - linkId still refers to activity_event_value_object_instance_links;
  139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
  141:    */
  142:   activityEventValueObjectLinkId: string | null;
  143:   usageAggregateId: string | null;
  144:   v42ProjectionError: string | null;
  145: 
  146:   /**
  147:    * P4.9.2 additive category bridge fields.
  148:    *
  149:    * These connect a derived Value Object to reliable category/rubricator metadata.
  150:    * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
  151:    */
  152:   valueObjectCategoryLinkId: string | null;
  153:   valueObjectCategoryLinkError: string | null;
  154: 
  155:   skipped: boolean;
  156:   skipReason: string | null;
  157: };
  158: 
  159: export type ProcessValueObjectBridgeResult = {
  160:   ok: boolean;
  161:   skipped: boolean;
  162:   skipReason: string | null;
  163:   eventId: string;
  164:   eventStatus: string | null;
  165:   mappingsRequested: number;
  166:   created: ValueObjectBridgeCreatedItem[];
  167:   errors: string[];
  168: };
  169: 
  170: function clamp01(value: number | null | undefined, fallback: number): number {
  171:   if (typeof value !== "number" || Number.isNaN(value)) {
```

## 8. Existing extractCategoryLinkMetadata function

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts line 373, pattern: function extractCategoryLinkMetadata, range 353-453 -----
  353: 
  354: function getSignedNumericDelta(
  355:   value: number | null | undefined,
  356:   direction: ValueObjectStateDeltaDirection
  357: ): number | null {
  358:   if (typeof value !== "number" || Number.isNaN(value)) {
  359:     return null;
  360:   }
  361: 
  362:   if (direction === "decrease") {
  363:     return -Math.abs(value);
  364:   }
  365: 
  366:   if (direction === "increase") {
  367:     return Math.abs(value);
  368:   }
  369: 
  370:   return value;
  371: }
  372: 
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }
  398: 
  399: async function readActivityEvent(
  400:   supabase: SupabaseClient,
  401:   eventId: string
  402: ): Promise<{
  403:   event: ActivityEventForValueObjectBridge | null;
  404:   errorMessage: string | null;
  405: }> {
  406:   const { data, error } = await supabase
  407:     .from("activity_events")
  408:     .select(
  409:       [
  410:         "id",
  411:         "user_id",
  412:         "status",
  413:         "started_at",
  414:         "ended_at",
  415:         "duration_minutes",
  416:         "title",
  417:         "description",
  418:         "performed_by_actor_id",
  419:         "acting_as_actor_id",
  420:         "acting_for_actor_id",
  421:       ].join(", ")
  422:     )
  423:     .eq("id", eventId)
  424:     .maybeSingle();
  425: 
  426:   if (error) {
  427:     return {
  428:       event: null,
  429:       errorMessage: error.message,
  430:     };
  431:   }
  432: 
  433:   return {
  434:     event: (data as ActivityEventForValueObjectBridge | null) ?? null,
  435:     errorMessage: null,
  436:   };
  437: }
  438: 
  439: async function readValueObjectOwnerContext(
  440:   supabase: SupabaseClient,
  441:   valueObjectId: string
  442: ): Promise<{
  443:   ownerActorId: string | null;
  444:   organizationId: string | null;
  445:   errorMessage: string | null;
  446: }> {
  447:   const { data, error } = await supabase
  448:     .from("value_objects")
  449:     .select("id, owner_actor_id, organization_id")
  450:     .eq("id", valueObjectId)
  451:     .maybeSingle();
  452: 
  453:   if (error) {
```

## 9. Existing createValueObjectCategoryLink function

```text
NO MATCH: async function createValueObjectCategoryLink
```

## 10. Bridge loop over mappings

```text
NO MATCH: for (const mapping of input.mappings)
```

## 11. created.push block

```text
NO MATCH: created.push({
```

## 12. activityValueObjectLifecycle wrapper call

```text
MATCH COUNT: 5

----- .\lib\activity\activityValueObjectLifecycle.ts line 4, pattern: processValueObjectBridge, range 1-59 -----
    1: import type { SupabaseClient } from "@supabase/supabase-js";
    2: 
    3: import {
    4:   processValueObjectBridgeForActivityEvent,
    5:   type ProcessValueObjectBridgeResult,
    6: } from "./valueObjectBridge";
    7: 
    8: import {
    9:   resolveValueObjectMappingsFromRubricatorForActivityEvent,
   10:   type RubricatorValueObjectMappingResult,
   11: } from "./rubricatorValueObjectMapper";
   12: 
   13: export type ProcessActivityValueObjectBridgeInput = {
   14:   supabase: SupabaseClient;
   15:   eventId: string;
   16:   processorName: string;
   17:   allowNonCompletedEvent?: boolean;
   18: };
   19: 
   20: export type ProcessActivityValueObjectBridgeResult = {
   21:   ok: boolean;
   22:   skipped: boolean;
   23:   skipReason: string | null;
   24:   eventId: string;
   25:   processorName: string;
   26:   mappingResult: RubricatorValueObjectMappingResult | null;
   27:   bridgeResult: ProcessValueObjectBridgeResult | null;
   28:   errors: string[];
   29: };
   30: 
   31: function normalizeErrorMessage(error: unknown): string {
   32:   if (error instanceof Error) {
   33:     return error.message;
   34:   }
   35: 
   36:   if (typeof error === "string") {
   37:     return error;
   38:   }
   39: 
   40:   try {
   41:     return JSON.stringify(error);
   42:   } catch {
   43:     return "Unknown value object bridge lifecycle error.";
   44:   }
   45: }
   46: 
   47: /**
   48:  * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
   49:  *
   50:  * Important:
   51:  * - This wrapper is for normal completed/confirmed lifecycle paths.
   52:  * - It does not create missing controlled Value Objects.
   53:  * - It does not use controlled text fallback.
   54:  * - It must not be called for imported_pending events before confirm.
   55:  * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
   56:  */
   57: export async function processActivityValueObjectBridge(
   58:   input: ProcessActivityValueObjectBridgeInput
   59: ): Promise<ProcessActivityValueObjectBridgeResult> {

----- .\lib\activity\activityValueObjectLifecycle.ts line 5, pattern: processValueObjectBridge, range 1-60 -----
    1: import type { SupabaseClient } from "@supabase/supabase-js";
    2: 
    3: import {
    4:   processValueObjectBridgeForActivityEvent,
    5:   type ProcessValueObjectBridgeResult,
    6: } from "./valueObjectBridge";
    7: 
    8: import {
    9:   resolveValueObjectMappingsFromRubricatorForActivityEvent,
   10:   type RubricatorValueObjectMappingResult,
   11: } from "./rubricatorValueObjectMapper";
   12: 
   13: export type ProcessActivityValueObjectBridgeInput = {
   14:   supabase: SupabaseClient;
   15:   eventId: string;
   16:   processorName: string;
   17:   allowNonCompletedEvent?: boolean;
   18: };
   19: 
   20: export type ProcessActivityValueObjectBridgeResult = {
   21:   ok: boolean;
   22:   skipped: boolean;
   23:   skipReason: string | null;
   24:   eventId: string;
   25:   processorName: string;
   26:   mappingResult: RubricatorValueObjectMappingResult | null;
   27:   bridgeResult: ProcessValueObjectBridgeResult | null;
   28:   errors: string[];
   29: };
   30: 
   31: function normalizeErrorMessage(error: unknown): string {
   32:   if (error instanceof Error) {
   33:     return error.message;
   34:   }
   35: 
   36:   if (typeof error === "string") {
   37:     return error;
   38:   }
   39: 
   40:   try {
   41:     return JSON.stringify(error);
   42:   } catch {
   43:     return "Unknown value object bridge lifecycle error.";
   44:   }
   45: }
   46: 
   47: /**
   48:  * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
   49:  *
   50:  * Important:
   51:  * - This wrapper is for normal completed/confirmed lifecycle paths.
   52:  * - It does not create missing controlled Value Objects.
   53:  * - It does not use controlled text fallback.
   54:  * - It must not be called for imported_pending events before confirm.
   55:  * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
   56:  */
   57: export async function processActivityValueObjectBridge(
   58:   input: ProcessActivityValueObjectBridgeInput
   59: ): Promise<ProcessActivityValueObjectBridgeResult> {
   60:   const { supabase, eventId, processorName, allowNonCompletedEvent = false } =

----- .\lib\activity\activityValueObjectLifecycle.ts line 27, pattern: processValueObjectBridge, range 2-82 -----
    2: 
    3: import {
    4:   processValueObjectBridgeForActivityEvent,
    5:   type ProcessValueObjectBridgeResult,
    6: } from "./valueObjectBridge";
    7: 
    8: import {
    9:   resolveValueObjectMappingsFromRubricatorForActivityEvent,
   10:   type RubricatorValueObjectMappingResult,
   11: } from "./rubricatorValueObjectMapper";
   12: 
   13: export type ProcessActivityValueObjectBridgeInput = {
   14:   supabase: SupabaseClient;
   15:   eventId: string;
   16:   processorName: string;
   17:   allowNonCompletedEvent?: boolean;
   18: };
   19: 
   20: export type ProcessActivityValueObjectBridgeResult = {
   21:   ok: boolean;
   22:   skipped: boolean;
   23:   skipReason: string | null;
   24:   eventId: string;
   25:   processorName: string;
   26:   mappingResult: RubricatorValueObjectMappingResult | null;
   27:   bridgeResult: ProcessValueObjectBridgeResult | null;
   28:   errors: string[];
   29: };
   30: 
   31: function normalizeErrorMessage(error: unknown): string {
   32:   if (error instanceof Error) {
   33:     return error.message;
   34:   }
   35: 
   36:   if (typeof error === "string") {
   37:     return error;
   38:   }
   39: 
   40:   try {
   41:     return JSON.stringify(error);
   42:   } catch {
   43:     return "Unknown value object bridge lifecycle error.";
   44:   }
   45: }
   46: 
   47: /**
   48:  * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
   49:  *
   50:  * Important:
   51:  * - This wrapper is for normal completed/confirmed lifecycle paths.
   52:  * - It does not create missing controlled Value Objects.
   53:  * - It does not use controlled text fallback.
   54:  * - It must not be called for imported_pending events before confirm.
   55:  * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
   56:  */
   57: export async function processActivityValueObjectBridge(
   58:   input: ProcessActivityValueObjectBridgeInput
   59: ): Promise<ProcessActivityValueObjectBridgeResult> {
   60:   const { supabase, eventId, processorName, allowNonCompletedEvent = false } =
   61:     input;
   62: 
   63:   try {
   64:     const mappingResult =
   65:       await resolveValueObjectMappingsFromRubricatorForActivityEvent({
   66:         supabase,
   67:         eventId,
   68:         allowNonCompletedEvent,
   69:         createMissingControlledValueObject: true,
   70:         allowControlledTextFallback: true,
   71:       });
   72: 
   73:     if (!mappingResult.ok) {
   74:       return {
   75:         ok: false,
   76:         skipped: mappingResult.skipped,
   77:         skipReason: mappingResult.skipReason,
   78:         eventId,
   79:         processorName,
   80:         mappingResult,
   81:         bridgeResult: null,
   82:         errors: mappingResult.errors,

----- .\lib\activity\activityValueObjectLifecycle.ts line 55, pattern: processValueObjectBridge, range 30-110 -----
   30: 
   31: function normalizeErrorMessage(error: unknown): string {
   32:   if (error instanceof Error) {
   33:     return error.message;
   34:   }
   35: 
   36:   if (typeof error === "string") {
   37:     return error;
   38:   }
   39: 
   40:   try {
   41:     return JSON.stringify(error);
   42:   } catch {
   43:     return "Unknown value object bridge lifecycle error.";
   44:   }
   45: }
   46: 
   47: /**
   48:  * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
   49:  *
   50:  * Important:
   51:  * - This wrapper is for normal completed/confirmed lifecycle paths.
   52:  * - It does not create missing controlled Value Objects.
   53:  * - It does not use controlled text fallback.
   54:  * - It must not be called for imported_pending events before confirm.
   55:  * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
   56:  */
   57: export async function processActivityValueObjectBridge(
   58:   input: ProcessActivityValueObjectBridgeInput
   59: ): Promise<ProcessActivityValueObjectBridgeResult> {
   60:   const { supabase, eventId, processorName, allowNonCompletedEvent = false } =
   61:     input;
   62: 
   63:   try {
   64:     const mappingResult =
   65:       await resolveValueObjectMappingsFromRubricatorForActivityEvent({
   66:         supabase,
   67:         eventId,
   68:         allowNonCompletedEvent,
   69:         createMissingControlledValueObject: true,
   70:         allowControlledTextFallback: true,
   71:       });
   72: 
   73:     if (!mappingResult.ok) {
   74:       return {
   75:         ok: false,
   76:         skipped: mappingResult.skipped,
   77:         skipReason: mappingResult.skipReason,
   78:         eventId,
   79:         processorName,
   80:         mappingResult,
   81:         bridgeResult: null,
   82:         errors: mappingResult.errors,
   83:       };
   84:     }
   85: 
   86:     if (mappingResult.skipped || mappingResult.mappings.length === 0) {
   87:       return {
   88:         ok: true,
   89:         skipped: true,
   90:         skipReason:
   91:           mappingResult.skipReason ??
   92:           (mappingResult.mappings.length === 0
   93:             ? "no_value_object_mappings"
   94:             : "mapping_skipped"),
   95:         eventId,
   96:         processorName,
   97:         mappingResult,
   98:         bridgeResult: null,
   99:         errors: mappingResult.errors,
  100:       };
  101:     }
  102: 
  103:     const bridgeResult = await processValueObjectBridgeForActivityEvent({
  104:       supabase,
  105:       eventId,
  106:       mappings: mappingResult.mappings,
  107:       allowNonCompletedEvent,
  108:       processorName,
  109:     });
  110: 

----- .\lib\activity\activityValueObjectLifecycle.ts line 103, pattern: processValueObjectBridge, range 78-133 -----
   78:         eventId,
   79:         processorName,
   80:         mappingResult,
   81:         bridgeResult: null,
   82:         errors: mappingResult.errors,
   83:       };
   84:     }
   85: 
   86:     if (mappingResult.skipped || mappingResult.mappings.length === 0) {
   87:       return {
   88:         ok: true,
   89:         skipped: true,
   90:         skipReason:
   91:           mappingResult.skipReason ??
   92:           (mappingResult.mappings.length === 0
   93:             ? "no_value_object_mappings"
   94:             : "mapping_skipped"),
   95:         eventId,
   96:         processorName,
   97:         mappingResult,
   98:         bridgeResult: null,
   99:         errors: mappingResult.errors,
  100:       };
  101:     }
  102: 
  103:     const bridgeResult = await processValueObjectBridgeForActivityEvent({
  104:       supabase,
  105:       eventId,
  106:       mappings: mappingResult.mappings,
  107:       allowNonCompletedEvent,
  108:       processorName,
  109:     });
  110: 
  111:     return {
  112:       ok: bridgeResult.ok,
  113:       skipped: bridgeResult.skipped,
  114:       skipReason: bridgeResult.skipReason,
  115:       eventId,
  116:       processorName,
  117:       mappingResult,
  118:       bridgeResult,
  119:       errors: [...mappingResult.errors, ...bridgeResult.errors],
  120:     };
  121:   } catch (error) {
  122:     return {
  123:       ok: false,
  124:       skipped: false,
  125:       skipReason: "exception",
  126:       eventId,
  127:       processorName,
  128:       mappingResult: null,
  129:       bridgeResult: null,
  130:       errors: [normalizeErrorMessage(error)],
  131:     };
  132:   }
  133: }
```

## 13. debug route bridge call

```text
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts line 550, pattern: processActivityValueObjectBridge({, range 520-595 -----
  520:         categoryDerivationCreatePolicy: categoryDerivationOptions.createPolicy,
  521:         aiUsed: false,
  522:         createdAt: nowIso,
  523:       },
  524:     })
  525:     .select()
  526:     .single();
  527: 
  528:   if (createError || !createdEventData) {
  529:     return NextResponse.json(
  530:       {
  531:         ok: false,
  532:         error: createError?.message ?? "Failed to create activity event.",
  533:       },
  534:       { status: 500 }
  535:     );
  536:   }
  537: 
  538:   const createdEvent = createdEventData as { id: string };
  539: 
  540:   const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
  541:     activityEventId: createdEvent.id,
  542:     inputText,
  543:     title,
  544:     description,
  545:     durationMinutes: timing.durationMinutes,
  546:     personActorId: personActor.id,
  547:     options: categoryDerivationOptions,
  548:   });
  549: 
  550:   const bridgeResult = await processActivityValueObjectBridge({
  551:     supabase,
  552:     eventId: createdEvent.id,
  553:     processorName: "activity_debug_free_text_value_object_test",
  554:     allowNonCompletedEvent: false,
  555:   });
  556: 
  557:   const categoryDerivationWarning =
  558:     categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
  559: 
  560:   const logResult = await safeCreateActivityProcessingLog({
  561:     userId: appUser.id,
  562:     rawSignalId: null,
  563:     activityEventId: createdEvent.id,
  564:     processingRunId,
  565:     processorName: "activity_debug_free_text_value_object_test",
  566:     processingStage: "finalize",
  567:     processingStatus: bridgeResult.ok
  568:       ? categoryDerivationWarning
  569:         ? "warning"
  570:         : bridgeResult.skipped
  571:           ? "skipped"
  572:           : "completed"
  573:       : "warning",
  574:     severity:
  575:       bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
  576:     message: "Debug free-text Value Object bridge processed.",
  577:     input: {
  578:       eventId: createdEvent.id,
  579:       inputText,
  580:       durationMinutes: timing.durationMinutes,
  581:       categoryDerivation: {
  582:         enabled: categoryDerivationOptions.enabled,
  583:         dryRun: categoryDerivationOptions.dryRun,
  584:         createPolicy: categoryDerivationOptions.createPolicy,
  585:       },
  586:     },
  587:     output: {
  588:       ok: bridgeResult.ok,
  589:       skipped: bridgeResult.skipped,
  590:       skipReason: bridgeResult.skipReason,
  591:       mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
  592:       mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
  593:       bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
  594:       errors: bridgeResult.errors,
  595:       categoryDerivation: {
```

## 14. Required implementation decision from P2-B

- category_role must be semantic_component.
- source must be rule, because category_derivation is not allowed by DB constraint.
- sourceLayer must be written into metadata_json.
- upsert conflict target must remain value_object_id, category_table, category_id, category_role.
- no links for dryRun, null categoryId, unresolved candidates.

## 15. Next step

Proceed to P4.10.0-C8-P3-B1 only after this edit map is committed:

- add optional additionalCategoryLinks contract to valueObjectBridge.ts
- do not modify default bridge behavior
- then add transpile check
- then update route to pass resolved candidates
