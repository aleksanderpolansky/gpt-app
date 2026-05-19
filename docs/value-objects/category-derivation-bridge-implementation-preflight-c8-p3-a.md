# P4.10.0-C8-P3-A — Bridge Implementation Preflight

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / preflight before TypeScript bridge integration

This checkpoint does not change runtime code.

Goal: capture exact bridge/lifecycle/route code surfaces before adding optional additionalCategoryLinks.

## 1. Git status

```text
?? docs/value-objects/category-derivation-bridge-implementation-preflight-c8-p3-a.md
```

## 2. Recent commits

```text
9178350 Document category link constraint inspection result
ad52d4d Remove diagnostic section from category link constraint inspection SQL
efb4c73 Fix value object category link constraint inspection SQL
53b58aa Add value object category link constraint inspection SQL
d2510a0 Document category derivation bridge integration contract
9a86207 Remove duplicate fast category link inventory report
0cff9ac Inventory category derivation bridge category link path
12412ee Inventory category derivation bridge category link path
796aa07 Document route derivation live DB verification result
49fa20a Add route derivation live DB verification SQL
effd078 Document category derivation route runtime verification
201d0a8 Integrate category derivation into debug route
57cc671 Preflight category derivation route integration
c720c1a Verify category derivation persistence with mock Supabase
f68fb20 Verify category derivation persistence transpile
b64e9b9 Add category derivation persistence module
6497d12 Verify category derivation resolver with mock Supabase
f9a9b3d Correct category derivation resolver Unicode normalization
```

## 3. File status

- FOUND: .\lib\activity\valueObjectBridge.ts (1394 lines)
- FOUND: .\lib\activity\activityValueObjectLifecycle.ts (133 lines)
- FOUND: .\src\app\api\activity\debug\free-text-value-object-test\route.ts (673 lines)
- FOUND: .\lib\activity\categoryDerivation\types.ts (132 lines)
- FOUND: .\lib\activity\categoryDerivation\resolver.ts (349 lines)

## 4. valueObjectBridge.ts — types and public contracts

```text

----- pattern: export type | lines 65-97 -----
   65:   classificationRole: string | null;
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

----- pattern: export type | lines 101-133 -----
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

----- pattern: export type | lines 110-142 -----
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

----- pattern: export type | lines 143-175 -----
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
  172:     return fallback;
  173:   }
  174: 
  175:   if (value < 0) {

----- pattern: ValueObjectBridgeMapping | lines 104-136 -----
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

----- pattern: ValueObjectBridgeMapping | lines 230-262 -----
  230:   const allowed: ValueObjectStateDeltaDirection[] = [
  231:     "increase",
  232:     "decrease",
  233:     "neutral",
  234:     "set",
  235:   ];
  236: 
  237:   if (allowed.includes(value as ValueObjectStateDeltaDirection)) {
  238:     return value as ValueObjectStateDeltaDirection;
  239:   }
  240: 
  241:   return "neutral";
  242: }
  243: 
  244: function normalizeRelationType(
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",
  253:     "updates_state",
  254:     "commercial_source",
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }

----- pattern: ValueObjectBridgeMapping | lines 231-263 -----
  231:     "increase",
  232:     "decrease",
  233:     "neutral",
  234:     "set",
  235:   ];
  236: 
  237:   if (allowed.includes(value as ValueObjectStateDeltaDirection)) {
  238:     return value as ValueObjectStateDeltaDirection;
  239:   }
  240: 
  241:   return "neutral";
  242: }
  243: 
  244: function normalizeRelationType(
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",
  253:     "updates_state",
  254:     "commercial_source",
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }
  263: 

----- pattern: ValueObjectBridgeMapping | lines 243-275 -----
  243: 
  244: function normalizeRelationType(
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",
  253:     "updates_state",
  254:     "commercial_source",
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }
  263: 
  264:   return "executes";
  265: }
  266: 
  267: function normalizeCategoryRole(
  268:   value: string | null | undefined
  269: ): ValueObjectCategoryRole {
  270:   const allowed: ValueObjectCategoryRole[] = [
  271:     "primary",
  272:     "semantic_component",
  273:     "context",
  274:     "object",
  275:     "action",

----- pattern: ValueObjectBridgeMapping | lines 245-277 -----
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",
  253:     "updates_state",
  254:     "commercial_source",
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }
  263: 
  264:   return "executes";
  265: }
  266: 
  267: function normalizeCategoryRole(
  268:   value: string | null | undefined
  269: ): ValueObjectCategoryRole {
  270:   const allowed: ValueObjectCategoryRole[] = [
  271:     "primary",
  272:     "semantic_component",
  273:     "context",
  274:     "object",
  275:     "action",
  276:     "goal",
  277:     "protocol",

----- pattern: ValueObjectBridgeResult | lines 969-1001 -----
  969: 
  970:   if (error || !data) {
  971:     return {
  972:       valueObjectCategoryLinkId: null,
  973:       errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
  974:     };
  975:   }
  976: 
  977:   return {
  978:     valueObjectCategoryLinkId: (data as { id: string }).id,
  979:     errorMessage: null,
  980:   };
  981: }
  982: 
  983: export async function processValueObjectBridgeForActivityEvent(
  984:   input: ProcessValueObjectBridgeInput
  985: ): Promise<ProcessValueObjectBridgeResult> {
  986:   const {
  987:     supabase,
  988:     eventId,
  989:     mappings,
  990:     source,
  991:     allowNonCompletedEvent = false,
  992:     processorName = "value_object_bridge_p4_7",
  993:   } = input;
  994: 
  995:   const result: ProcessValueObjectBridgeResult = {
  996:     ok: false,
  997:     skipped: false,
  998:     skipReason: null,
  999:     eventId,
 1000:     eventStatus: null,
 1001:     mappingsRequested: mappings.length,

----- pattern: ValueObjectBridgeResult | lines 979-1011 -----
  979:     errorMessage: null,
  980:   };
  981: }
  982: 
  983: export async function processValueObjectBridgeForActivityEvent(
  984:   input: ProcessValueObjectBridgeInput
  985: ): Promise<ProcessValueObjectBridgeResult> {
  986:   const {
  987:     supabase,
  988:     eventId,
  989:     mappings,
  990:     source,
  991:     allowNonCompletedEvent = false,
  992:     processorName = "value_object_bridge_p4_7",
  993:   } = input;
  994: 
  995:   const result: ProcessValueObjectBridgeResult = {
  996:     ok: false,
  997:     skipped: false,
  998:     skipReason: null,
  999:     eventId,
 1000:     eventStatus: null,
 1001:     mappingsRequested: mappings.length,
 1002:     created: [],
 1003:     errors: [],
 1004:   };
 1005: 
 1006:   if (mappings.length === 0) {
 1007:     result.ok = true;
 1008:     result.skipped = true;
 1009:     result.skipReason = "no_mappings";
 1010:     return result;
 1011:   }

----- pattern: mappingMetadata | lines 674-706 -----
  674:     usageCount: Math.max(0, Math.trunc(asNumber(row.usage_count, 0))),
  675:     exposureMinutes: Math.max(0, asNumber(row.exposure_minutes, 0)),
  676:     firstUsedAt: row.first_used_at,
  677:     errorMessage: null,
  678:   };
  679: }
  680: 
  681: async function upsertV42ValueObjectProjection(params: {
  682:   supabase: SupabaseClient;
  683:   event: ActivityEventForValueObjectBridge;
  684:   valueObjectId: string;
  685:   valueObjectInstanceId: string;
  686:   oldVoiLinkId: string | null;
  687:   bridgeSource: BridgeSource;
  688:   confidence: number;
  689:   processorName: string;
  690:   mappingMetadata: Record<string, unknown>;
  691: }): Promise<{
  692:   activityEventValueObjectLinkId: string | null;
  693:   usageAggregateId: string | null;
  694:   errorMessage: string | null;
  695: }> {
  696:   const {
  697:     supabase,
  698:     event,
  699:     valueObjectId,
  700:     valueObjectInstanceId,
  701:     oldVoiLinkId,
  702:     bridgeSource,
  703:     confidence,
  704:     processorName,
  705:     mappingMetadata,
  706:   } = params;

----- pattern: mappingMetadata | lines 689-721 -----
  689:   processorName: string;
  690:   mappingMetadata: Record<string, unknown>;
  691: }): Promise<{
  692:   activityEventValueObjectLinkId: string | null;
  693:   usageAggregateId: string | null;
  694:   errorMessage: string | null;
  695: }> {
  696:   const {
  697:     supabase,
  698:     event,
  699:     valueObjectId,
  700:     valueObjectInstanceId,
  701:     oldVoiLinkId,
  702:     bridgeSource,
  703:     confidence,
  704:     processorName,
  705:     mappingMetadata,
  706:   } = params;
  707: 
  708:   const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  709:   const exposureMinutes = normalizeExposureMinutes(event.duration_minutes);
  710:   const nowIso = new Date().toISOString();
  711: 
  712:   const existingProjection = await readExistingV42ProjectionLink(
  713:     supabase,
  714:     event.id,
  715:     valueObjectId,
  716:     projectionSource
  717:   );
  718: 
  719:   if (existingProjection.errorMessage) {
  720:     return {
  721:       activityEventValueObjectLinkId: null,

----- pattern: mappingMetadata | lines 726-758 -----
  726: 
  727:   const { data: projectionData, error: projectionError } = await supabase
  728:     .from("activity_event_value_object_links")
  729:     .upsert(
  730:       {
  731:         user_id: event.user_id,
  732:         event_id: event.id,
  733:         value_object_id: valueObjectId,
  734:         exposure_minutes: exposureMinutes,
  735:         source: projectionSource,
  736:         confidence,
  737:         metadata_json: {
  738:           processorName,
  739:           bridgeSource,
  740:           valueObjectInstanceId,
  741:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  742:           mappingMetadata,
  743:           p491: {
  744:             projection: "activity_event_value_object_links",
  745:             mode: "additive_v4_2_runtime_projection",
  746:           },
  747:         },
  748:         updated_at: nowIso,
  749:       },
  750:       {
  751:         onConflict: "event_id,value_object_id,source",
  752:       }
  753:     )
  754:     .select("id")
  755:     .single();
  756: 
  757:   if (projectionError || !projectionData) {
  758:     return {

----- pattern: mappingMetadata | lines 843-875 -----
  843:     activityEventValueObjectLinkId,
  844:     usageAggregateId: (usageData as { id: string }).id,
  845:     errorMessage: null,
  846:   };
  847: }
  848: 
  849: async function upsertV42ValueObjectCategoryLink(params: {
  850:   supabase: SupabaseClient;
  851:   event: ActivityEventForValueObjectBridge;
  852:   valueObjectId: string;
  853:   valueObjectInstanceId: string;
  854:   oldVoiLinkId: string | null;
  855:   activityEventValueObjectLinkId: string | null;
  856:   bridgeSource: BridgeSource;
  857:   confidence: number;
  858:   processorName: string;
  859:   mappingMetadata: Record<string, unknown>;
  860: }): Promise<{
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,
  866:     event,
  867:     valueObjectId,
  868:     valueObjectInstanceId,
  869:     oldVoiLinkId,
  870:     activityEventValueObjectLinkId,
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;

----- pattern: mappingMetadata | lines 858-890 -----
  858:   processorName: string;
  859:   mappingMetadata: Record<string, unknown>;
  860: }): Promise<{
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,
  866:     event,
  867:     valueObjectId,
  868:     valueObjectInstanceId,
  869:     oldVoiLinkId,
  870:     activityEventValueObjectLinkId,
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 
  886:   const categoryLookup = await readContextualCategoryForLink(
  887:     supabase,
  888:     categoryMetadata.contextualCategoryId
  889:   );
  890: 

----- pattern: mappingMetadata | lines 861-893 -----
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,
  866:     event,
  867:     valueObjectId,
  868:     valueObjectInstanceId,
  869:     oldVoiLinkId,
  870:     activityEventValueObjectLinkId,
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 
  886:   const categoryLookup = await readContextualCategoryForLink(
  887:     supabase,
  888:     categoryMetadata.contextualCategoryId
  889:   );
  890: 
  891:   if (categoryLookup.errorMessage) {
  892:     return {
  893:       valueObjectCategoryLinkId: null,

----- pattern: mappingMetadata | lines 1121-1153 -----
 1121:           event.performed_by_actor_id ??
 1122:           null,
 1123:         organization_id: ownerContext.organizationId,
 1124:         status: mapping.instanceStatus ?? "completed",
 1125:         started_at: event.started_at,
 1126:         ended_at: event.ended_at,
 1127:         duration_minutes: event.duration_minutes,
 1128:         instance_title: mapping.instanceTitle ?? event.title,
 1129:         instance_note: mapping.instanceNote ?? event.description,
 1130:         result_status: mapping.resultStatus ?? null,
 1131:         quality_score: mapping.qualityScore ?? null,
 1132:         confidence,
 1133:         source: mappingSource,
 1134:         metadata_json: {
 1135:           processorName,
 1136:           eventId: event.id,
 1137:           mappingMetadata: mapping.metadata ?? {},
 1138:         },
 1139:       })
 1140:       .select("id")
 1141:       .single();
 1142: 
 1143:     if (voiError || !voiData) {
 1144:       createdItem.skipped = true;
 1145:       createdItem.skipReason = voiError?.message ?? "failed_to_create_voi";
 1146:       result.created.push(createdItem);
 1147:       continue;
 1148:     }
 1149: 
 1150:     const valueObjectInstanceId = (voiData as { id: string }).id;
 1151:     createdItem.valueObjectInstanceId = valueObjectInstanceId;
 1152: 
 1153:     const { data: linkData, error: linkError } = await supabase

----- pattern: mappingMetadata | lines 1169-1201 -----
 1169:       .single();
 1170: 
 1171:     if (linkError) {
 1172:       result.errors.push(linkError.message);
 1173:     } else if (linkData) {
 1174:       createdItem.linkId = (linkData as { id: string }).id;
 1175: 
 1176:       const v42Projection = await upsertV42ValueObjectProjection({
 1177:         supabase,
 1178:         event,
 1179:         valueObjectId: mapping.valueObjectId,
 1180:         valueObjectInstanceId,
 1181:         oldVoiLinkId: createdItem.linkId,
 1182:         bridgeSource: mappingSource,
 1183:         confidence,
 1184:         processorName,
 1185:         mappingMetadata: mapping.metadata ?? {},
 1186:       });
 1187: 
 1188:       createdItem.activityEventValueObjectLinkId =
 1189:         v42Projection.activityEventValueObjectLinkId;
 1190:       createdItem.usageAggregateId = v42Projection.usageAggregateId;
 1191:       createdItem.v42ProjectionError = v42Projection.errorMessage;
 1192: 
 1193:       if (v42Projection.errorMessage) {
 1194:         /*
 1195:          * P4.9.1 compatibility rule:
 1196:          * The new v4.2 projection must not roll back the existing VOI pipeline.
 1197:          * Keep the old bridge flow running and expose the projection problem
 1198:          * in the created item + console warning for post-check diagnostics.
 1199:          */
 1200:         console.warn("P4.9.1 v4.2 projection failed", {
 1201:           eventId: event.id,

----- pattern: mappingMetadata | lines 1203-1235 -----
 1203:           valueObjectInstanceId,
 1204:           errorMessage: v42Projection.errorMessage,
 1205:         });
 1206:       }
 1207: 
 1208:       const categoryLink = await upsertV42ValueObjectCategoryLink({
 1209:         supabase,
 1210:         event,
 1211:         valueObjectId: mapping.valueObjectId,
 1212:         valueObjectInstanceId,
 1213:         oldVoiLinkId: createdItem.linkId,
 1214:         activityEventValueObjectLinkId:
 1215:           v42Projection.activityEventValueObjectLinkId,
 1216:         bridgeSource: mappingSource,
 1217:         confidence,
 1218:         processorName,
 1219:         mappingMetadata: mapping.metadata ?? {},
 1220:       });
 1221: 
 1222:       createdItem.valueObjectCategoryLinkId =
 1223:         categoryLink.valueObjectCategoryLinkId;
 1224:       createdItem.valueObjectCategoryLinkError = categoryLink.errorMessage;
 1225: 
 1226:       if (categoryLink.errorMessage) {
 1227:         /*
 1228:          * P4.9.2 compatibility rule:
 1229:          * Category-link creation is additive and must not roll back the existing VOI
 1230:          * pipeline or the already verified P4.9.1 projection layer.
 1231:          */
 1232:         console.warn("P4.9.2 value_object_category_links upsert failed", {
 1233:           eventId: event.id,
 1234:           valueObjectId: mapping.valueObjectId,
 1235:           valueObjectInstanceId,

----- pattern: mappingMetadata | lines 1248-1280 -----
 1248:         value_object_instance_id: valueObjectInstanceId,
 1249:         value_object_id: mapping.valueObjectId,
 1250:         rule_id: null,
 1251:         metric_key: mapping.metricKey,
 1252:         delta_value_numeric:
 1253:           typeof mapping.deltaValueNumeric === "number"
 1254:             ? Math.abs(mapping.deltaValueNumeric)
 1255:             : null,
 1256:         delta_value_text: mapping.deltaValueText ?? null,
 1257:         metric_unit: mapping.metricUnit ?? null,
 1258:         delta_direction: deltaDirection,
 1259:         source: mappingSource,
 1260:         confidence,
 1261:         metadata_json: {
 1262:           processorName,
 1263:           signedDelta,
 1264:           mappingMetadata: mapping.metadata ?? {},
 1265:         },
 1266:       })
 1267:       .select("id")
 1268:       .single();
 1269: 
 1270:     if (deltaError || !deltaData) {
 1271:       result.errors.push(deltaError?.message ?? "failed_to_create_state_delta");
 1272:       result.created.push(createdItem);
 1273:       continue;
 1274:     }
 1275: 
 1276:     const stateDeltaId = (deltaData as { id: string }).id;
 1277:     createdItem.stateDeltaId = stateDeltaId;
 1278: 
 1279:     let aggregateNumericValue: number | null = null;
 1280: 

----- pattern: metadata_json | lines 721-753 -----
  721:       activityEventValueObjectLinkId: null,
  722:       usageAggregateId: null,
  723:       errorMessage: existingProjection.errorMessage,
  724:     };
  725:   }
  726: 
  727:   const { data: projectionData, error: projectionError } = await supabase
  728:     .from("activity_event_value_object_links")
  729:     .upsert(
  730:       {
  731:         user_id: event.user_id,
  732:         event_id: event.id,
  733:         value_object_id: valueObjectId,
  734:         exposure_minutes: exposureMinutes,
  735:         source: projectionSource,
  736:         confidence,
  737:         metadata_json: {
  738:           processorName,
  739:           bridgeSource,
  740:           valueObjectInstanceId,
  741:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  742:           mappingMetadata,
  743:           p491: {
  744:             projection: "activity_event_value_object_links",
  745:             mode: "additive_v4_2_runtime_projection",
  746:           },
  747:         },
  748:         updated_at: nowIso,
  749:       },
  750:       {
  751:         onConflict: "event_id,value_object_id,source",
  752:       }
  753:     )

----- pattern: metadata_json | lines 796-828 -----
  796:   const lastUsedAt = getEventLastUsedAt(event);
  797:   const nextUsageCount = existingUsage.usageCount + 1;
  798:   const nextExposureMinutes = existingUsage.exposureMinutes + exposureMinutes;
  799: 
  800:   const { data: usageData, error: usageError } = await supabase
  801:     .from("value_object_usage_aggregates")
  802:     .upsert(
  803:       {
  804:         user_id: event.user_id,
  805:         value_object_id: valueObjectId,
  806:         usage_count: nextUsageCount,
  807:         exposure_minutes: nextExposureMinutes,
  808:         first_used_at: firstUsedAt,
  809:         last_used_at: lastUsedAt,
  810:         last_event_id: event.id,
  811:         source: projectionSource,
  812:         metadata_json: {
  813:           processorName,
  814:           bridgeSource,
  815:           lastActivityEventValueObjectLinkId: activityEventValueObjectLinkId,
  816:           lastValueObjectInstanceId: valueObjectInstanceId,
  817:           lastOldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  818:           lastExposureMinutes: exposureMinutes,
  819:           p491: {
  820:             projection: "value_object_usage_aggregates",
  821:             mode: "additive_v4_2_runtime_projection",
  822:           },
  823:         },
  824:         updated_at: nowIso,
  825:       },
  826:       {
  827:         onConflict: "user_id,value_object_id",
  828:       }

----- pattern: metadata_json | lines 906-938 -----
  906:   const categoryRole = normalizeCategoryRole(
  907:     categoryMetadata.classificationRole === "primary"
  908:       ? "primary"
  909:       : "semantic_component"
  910:   );
  911: 
  912:   const { data, error } = await supabase
  913:     .from("value_object_category_links")
  914:     .upsert(
  915:       {
  916:         value_object_id: valueObjectId,
  917:         category_table: "contextual_categories",
  918:         category_id: categoryMetadata.contextualCategoryId,
  919:         category_role: categoryRole,
  920:         source: projectionSource,
  921:         confidence,
  922:         metadata_json: {
  923:           processorName,
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,

----- pattern: metadata_json | lines 1118-1150 -----
 1118:         owner_actor_id:
 1119:           ownerContext.ownerActorId ??
 1120:           event.acting_as_actor_id ??
 1121:           event.performed_by_actor_id ??
 1122:           null,
 1123:         organization_id: ownerContext.organizationId,
 1124:         status: mapping.instanceStatus ?? "completed",
 1125:         started_at: event.started_at,
 1126:         ended_at: event.ended_at,
 1127:         duration_minutes: event.duration_minutes,
 1128:         instance_title: mapping.instanceTitle ?? event.title,
 1129:         instance_note: mapping.instanceNote ?? event.description,
 1130:         result_status: mapping.resultStatus ?? null,
 1131:         quality_score: mapping.qualityScore ?? null,
 1132:         confidence,
 1133:         source: mappingSource,
 1134:         metadata_json: {
 1135:           processorName,
 1136:           eventId: event.id,
 1137:           mappingMetadata: mapping.metadata ?? {},
 1138:         },
 1139:       })
 1140:       .select("id")
 1141:       .single();
 1142: 
 1143:     if (voiError || !voiData) {
 1144:       createdItem.skipped = true;
 1145:       createdItem.skipReason = voiError?.message ?? "failed_to_create_voi";
 1146:       result.created.push(createdItem);
 1147:       continue;
 1148:     }
 1149: 
 1150:     const valueObjectInstanceId = (voiData as { id: string }).id;

----- pattern: metadata_json | lines 1147-1179 -----
 1147:       continue;
 1148:     }
 1149: 
 1150:     const valueObjectInstanceId = (voiData as { id: string }).id;
 1151:     createdItem.valueObjectInstanceId = valueObjectInstanceId;
 1152: 
 1153:     const { data: linkData, error: linkError } = await supabase
 1154:       .from("activity_event_value_object_instance_links")
 1155:       .insert({
 1156:         user_id: event.user_id,
 1157:         event_id: event.id,
 1158:         value_object_instance_id: valueObjectInstanceId,
 1159:         relation_type: relationType,
 1160:         weight,
 1161:         confidence,
 1162:         source: mappingSource,
 1163:         metadata_json: {
 1164:           processorName,
 1165:           valueObjectId: mapping.valueObjectId,
 1166:         },
 1167:       })
 1168:       .select("id")
 1169:       .single();
 1170: 
 1171:     if (linkError) {
 1172:       result.errors.push(linkError.message);
 1173:     } else if (linkData) {
 1174:       createdItem.linkId = (linkData as { id: string }).id;
 1175: 
 1176:       const v42Projection = await upsertV42ValueObjectProjection({
 1177:         supabase,
 1178:         event,
 1179:         valueObjectId: mapping.valueObjectId,

----- pattern: metadata_json | lines 1245-1277 -----
 1245:       .insert({
 1246:         user_id: event.user_id,
 1247:         event_id: event.id,
 1248:         value_object_instance_id: valueObjectInstanceId,
 1249:         value_object_id: mapping.valueObjectId,
 1250:         rule_id: null,
 1251:         metric_key: mapping.metricKey,
 1252:         delta_value_numeric:
 1253:           typeof mapping.deltaValueNumeric === "number"
 1254:             ? Math.abs(mapping.deltaValueNumeric)
 1255:             : null,
 1256:         delta_value_text: mapping.deltaValueText ?? null,
 1257:         metric_unit: mapping.metricUnit ?? null,
 1258:         delta_direction: deltaDirection,
 1259:         source: mappingSource,
 1260:         confidence,
 1261:         metadata_json: {
 1262:           processorName,
 1263:           signedDelta,
 1264:           mappingMetadata: mapping.metadata ?? {},
 1265:         },
 1266:       })
 1267:       .select("id")
 1268:       .single();
 1269: 
 1270:     if (deltaError || !deltaData) {
 1271:       result.errors.push(deltaError?.message ?? "failed_to_create_state_delta");
 1272:       result.created.push(createdItem);
 1273:       continue;
 1274:     }
 1275: 
 1276:     const stateDeltaId = (deltaData as { id: string }).id;
 1277:     createdItem.stateDeltaId = stateDeltaId;

----- pattern: metadata_json | lines 1300-1332 -----
 1300:       .from("value_object_daily_aggregates")
 1301:       .upsert(
 1302:         {
 1303:           user_id: event.user_id,
 1304:           value_object_id: mapping.valueObjectId,
 1305:           aggregate_date: aggregateDate,
 1306:           aggregate_type: aggregateType,
 1307:           aggregate_key: aggregateKey,
 1308:           metric_key: mapping.metricKey,
 1309:           metric_value_numeric: aggregateNumericValue ?? 0,
 1310:           metric_value_text: mapping.deltaValueText ?? null,
 1311:           metric_unit: mapping.metricUnit ?? null,
 1312:           source: mappingSource,
 1313:           last_event_id: event.id,
 1314:           last_state_delta_id: stateDeltaId,
 1315:           updated_at: new Date().toISOString(),
 1316:           metadata_json: {
 1317:             processorName,
 1318:             lastSignedDelta: signedDelta,
 1319:           },
 1320:         },
 1321:         {
 1322:           onConflict:
 1323:             "user_id,value_object_id,aggregate_date,aggregate_type,aggregate_key,metric_key",
 1324:         }
 1325:       )
 1326:       .select("id")
 1327:       .single();
 1328: 
 1329:     if (aggregateError) {
 1330:       result.errors.push(aggregateError.message);
 1331:     } else if (aggregateData) {
 1332:       createdItem.aggregateId = (aggregateData as { id: string }).id;

----- pattern: metadata_json | lines 1354-1386 -----
 1354:     }
 1355: 
 1356:     const { data: snapshotData, error: snapshotError } = await supabase
 1357:       .from("value_object_state_snapshots")
 1358:       .upsert(
 1359:         {
 1360:           user_id: event.user_id,
 1361:           value_object_id: mapping.valueObjectId,
 1362:           metric_key: mapping.metricKey,
 1363:           metric_value_numeric: snapshotNumericValue,
 1364:           metric_value_text: mapping.deltaValueText ?? null,
 1365:           metric_unit: mapping.metricUnit ?? null,
 1366:           last_event_id: event.id,
 1367:           last_state_delta_id: stateDeltaId,
 1368:           updated_at: new Date().toISOString(),
 1369:           source: mappingSource,
 1370:           metadata_json: {
 1371:             processorName,
 1372:             lastSignedDelta: signedDelta,
 1373:           },
 1374:         },
 1375:         {
 1376:           onConflict: "user_id,value_object_id,metric_key",
 1377:         }
 1378:       )
 1379:       .select("id")
 1380:       .single();
 1381: 
 1382:     if (snapshotError) {
 1383:       result.errors.push(snapshotError.message);
 1384:     } else if (snapshotData) {
 1385:       createdItem.snapshotId = (snapshotData as { id: string }).id;
 1386:     }
```

## 5. valueObjectBridge.ts — category link creation path

```text

----- pattern: extractCategoryLinkMetadata | lines 351-395 -----
  351:   );
  352: }
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

----- pattern: extractCategoryLinkMetadata | lines 855-899 -----
  855:   activityEventValueObjectLinkId: string | null;
  856:   bridgeSource: BridgeSource;
  857:   confidence: number;
  858:   processorName: string;
  859:   mappingMetadata: Record<string, unknown>;
  860: }): Promise<{
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,
  866:     event,
  867:     valueObjectId,
  868:     valueObjectInstanceId,
  869:     oldVoiLinkId,
  870:     activityEventValueObjectLinkId,
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 
  886:   const categoryLookup = await readContextualCategoryForLink(
  887:     supabase,
  888:     categoryMetadata.contextualCategoryId
  889:   );
  890: 
  891:   if (categoryLookup.errorMessage) {
  892:     return {
  893:       valueObjectCategoryLinkId: null,
  894:       errorMessage: categoryLookup.errorMessage,
  895:     };
  896:   }
  897: 
  898:   if (!categoryLookup.category) {
  899:     return {

----- pattern: value_object_category_links | lines 891-935 -----
  891:   if (categoryLookup.errorMessage) {
  892:     return {
  893:       valueObjectCategoryLinkId: null,
  894:       errorMessage: categoryLookup.errorMessage,
  895:     };
  896:   }
  897: 
  898:   if (!categoryLookup.category) {
  899:     return {
  900:       valueObjectCategoryLinkId: null,
  901:       errorMessage: null,
  902:     };
  903:   }
  904: 
  905:   const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  906:   const categoryRole = normalizeCategoryRole(
  907:     categoryMetadata.classificationRole === "primary"
  908:       ? "primary"
  909:       : "semantic_component"
  910:   );
  911: 
  912:   const { data, error } = await supabase
  913:     .from("value_object_category_links")
  914:     .upsert(
  915:       {
  916:         value_object_id: valueObjectId,
  917:         category_table: "contextual_categories",
  918:         category_id: categoryMetadata.contextualCategoryId,
  919:         category_role: categoryRole,
  920:         source: projectionSource,
  921:         confidence,
  922:         metadata_json: {
  923:           processorName,
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,

----- pattern: value_object_category_links | lines 933-977 -----
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {
  948:             id: categoryLookup.category.id,
  949:             slug: categoryLookup.category.slug,
  950:             name: categoryLookup.category.name,
  951:             status: categoryLookup.category.status,
  952:             isActive: categoryLookup.category.is_active,
  953:           },
  954:           p492: {
  955:             projection: "value_object_category_links",
  956:             mode: "runtime_category_link_from_bridge_mapping_metadata",
  957:             sourceEventId: event.id,
  958:             sourceProjectionId: activityEventValueObjectLinkId,
  959:           },
  960:         },
  961:         updated_at: new Date().toISOString(),
  962:       },
  963:       {
  964:         onConflict: "value_object_id,category_table,category_id,category_role",
  965:       }
  966:     )
  967:     .select("id")
  968:     .single();
  969: 
  970:   if (error || !data) {
  971:     return {
  972:       valueObjectCategoryLinkId: null,
  973:       errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
  974:     };
  975:   }
  976: 
  977:   return {

----- pattern: value_object_category_links | lines 1210-1254 -----
 1210:         event,
 1211:         valueObjectId: mapping.valueObjectId,
 1212:         valueObjectInstanceId,
 1213:         oldVoiLinkId: createdItem.linkId,
 1214:         activityEventValueObjectLinkId:
 1215:           v42Projection.activityEventValueObjectLinkId,
 1216:         bridgeSource: mappingSource,
 1217:         confidence,
 1218:         processorName,
 1219:         mappingMetadata: mapping.metadata ?? {},
 1220:       });
 1221: 
 1222:       createdItem.valueObjectCategoryLinkId =
 1223:         categoryLink.valueObjectCategoryLinkId;
 1224:       createdItem.valueObjectCategoryLinkError = categoryLink.errorMessage;
 1225: 
 1226:       if (categoryLink.errorMessage) {
 1227:         /*
 1228:          * P4.9.2 compatibility rule:
 1229:          * Category-link creation is additive and must not roll back the existing VOI
 1230:          * pipeline or the already verified P4.9.1 projection layer.
 1231:          */
 1232:         console.warn("P4.9.2 value_object_category_links upsert failed", {
 1233:           eventId: event.id,
 1234:           valueObjectId: mapping.valueObjectId,
 1235:           valueObjectInstanceId,
 1236:           activityEventValueObjectLinkId:
 1237:             v42Projection.activityEventValueObjectLinkId,
 1238:           errorMessage: categoryLink.errorMessage,
 1239:         });
 1240:       }
 1241:     }
 1242: 
 1243:     const { data: deltaData, error: deltaError } = await supabase
 1244:       .from("value_object_state_deltas")
 1245:       .insert({
 1246:         user_id: event.user_id,
 1247:         event_id: event.id,
 1248:         value_object_instance_id: valueObjectInstanceId,
 1249:         value_object_id: mapping.valueObjectId,
 1250:         rule_id: null,
 1251:         metric_key: mapping.metricKey,
 1252:         delta_value_numeric:
 1253:           typeof mapping.deltaValueNumeric === "number"
 1254:             ? Math.abs(mapping.deltaValueNumeric)

----- pattern: contextualCategoryId | lines 40-84 -----
   40:   id: string;
   41:   user_id: string;
   42:   status: string;
   43:   started_at: string | null;
   44:   ended_at: string | null;
   45:   duration_minutes: number | null;
   46:   title: string | null;
   47:   description: string | null;
   48:   performed_by_actor_id?: string | null;
   49:   acting_as_actor_id?: string | null;
   50:   acting_for_actor_id?: string | null;
   51: };
   52: 
   53: type ContextualCategoryForLink = {
   54:   id: string;
   55:   slug: string | null;
   56:   name: string | null;
   57:   status: string | null;
   58:   is_active: boolean | null;
   59: };
   60: 
   61: type ExtractedCategoryLinkMetadata = {
   62:   contextualCategoryId: string | null;
   63:   contextualCategorySlug: string | null;
   64:   contextualCategoryName: string | null;
   65:   classificationRole: string | null;
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

----- pattern: contextualCategoryId | lines 357-401 -----
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

## 6. valueObjectBridge.ts — bridge processing loop

```text

----- pattern: for (const mapping | lines 1010-1058 -----
 1010:     return result;
 1011:   }
 1012: 
 1013:   const { event, errorMessage } = await readActivityEvent(supabase, eventId);
 1014: 
 1015:   if (errorMessage) {
 1016:     result.errors.push(errorMessage);
 1017:     return result;
 1018:   }
 1019: 
 1020:   if (!event) {
 1021:     result.errors.push("Activity event not found.");
 1022:     return result;
 1023:   }
 1024: 
 1025:   result.eventStatus = event.status;
 1026: 
 1027:   if (!allowNonCompletedEvent && event.status !== "completed") {
 1028:     result.ok = true;
 1029:     result.skipped = true;
 1030:     result.skipReason = `event_status_${event.status}_not_completed`;
 1031:     return result;
 1032:   }
 1033: 
 1034:   for (const mapping of mappings) {
 1035:     const mappingSource = normalizeSource(mapping.source ?? source);
 1036:     const confidence = clamp01(mapping.confidence, 1);
 1037:     const weight = clamp01(mapping.weight, 1);

## 7. activityValueObjectLifecycle.ts — bridge wrapper contract

```text

----- pattern: processActivityValueObjectBridge | lines 1-31 -----
    1: import type { SupabaseClient } from "@supabase/supabase-js";
    2: 
    3: import {
    4:   processValueObjectBridgeForActivityEvent,
    5:   type ProcessValueObjectBridgeResult,
    6: } from "./valueObjectBridge";
    7: 
    8: import {

## 8. debug route — Category Derivation and bridge call

```text

----- pattern: runCategoryDerivationForDebugRoute | lines 240-276 -----
  240: 
  241:   if (Number.isNaN(endedDate.getTime())) {
  242:     return {
  243:       ok: false as const,
  244:       error: "Invalid endedAt.",

## 9. categoryDerivation types full file

```text
    1: export type JsonPrimitive = string | number | boolean | null;
    2: 
    3: export type JsonValue =
    4:   | JsonPrimitive
    5:   | JsonValue[]
    6:   | { [key: string]: JsonValue };
    7: 
    8: export type JsonRecord = Record<string, JsonValue>;
    9: 
   10: export type CategoryDerivationSource =

## 10. Confirmed P2-B implementation constraints

- category_role = semantic_component is allowed.
- source = category_derivation is NOT allowed.
- C8-P must use source = rule.
- Category Derivation origin must be stored in metadata_json.sourceLayer.
- Upsert conflict target must be: value_object_id, category_table, category_id, category_role.
- metadata_json must always be an object.
- category links must not be created for dryRun/unresolved/null categoryId.

## 11. Next implementation step

Proceed to P4.10.0-C8-P3-B:

- add optional additionalCategoryLinks contract
- preserve existing bridge behavior when optional input is absent
- use source = rule
- store sourceLayer = category_derivation in metadata_json
- update debug route only after bridge accepts optional category links
- run transpile/mock checks before runtime test
