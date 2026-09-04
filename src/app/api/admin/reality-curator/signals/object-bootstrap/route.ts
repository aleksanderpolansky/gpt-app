import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import {
  ActorContextError,
  resolveActiveActorContext,
  type ResolvedActorContext,
} from "../../../../../../../lib/actor-context";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "reality-curator-object-bootstrap-v1-3" as const;
const BASIC_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1" as const;
const PROCESSOR_NAME = "reality_curator_journey" as const;
const PROCESSOR_VERSION = "1" as const;
const PARAMETER_EVENT_CODE = "related_parameter_catalog_checked" as const;
const DECISION_EVENT_CODE = "measurable_object_decision_recorded" as const;
const CREATED_EVENT_CODE = "observation_object_created" as const;
const DECISION_CONTRACT = "ARCTOR_REALITY_CURATOR_MEASURABLE_OBJECT_V1" as const;
const CREATION_CONTRACT = "ARCTOR_REALITY_MODEL_CURATOR_DUAL_SCOPE_BOOTSTRAP_V1_3" as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_KEY_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const RELATIONS = new Set(["part_of", "is_a", "aspect_of", "subprocess_of"]);
const NODE_ROLES = new Set(["root", "intermediate", "leaf"]);
const DECISIONS = new Set([
  "existing_leaf_found",
  "new_leaf_required",
  "parameter_not_assigned",
  "needs_clarification",
]);

const GENERIC_KIND_BY_FACET: Readonly<Record<string, string>> = {
  ENTITY: "generic_entity",
  PROCESS: "generic_process",
  STATE: "generic_state",
  RELATIONSHIP: "generic_relationship",
  ROLE: "generic_role",
  KNOWLEDGE: "generic_knowledge",
  BEHAVIOR: "generic_behavior",
  CONTEXT: "generic_context",
};

const FACET_ORDER = [
  "ENTITY",
  "PROCESS",
  "STATE",
  "RELATIONSHIP",
  "ROLE",
  "KNOWLEDGE",
  "BEHAVIOR",
  "CONTEXT",
] as const;

type JsonRecord = Record<string, unknown>;
type ScopeCode = "private" | "system";
type NodeRoleCode = "root" | "intermediate" | "leaf";

type EligibleSignal = {
  id: string;
  userId: string;
  activityEventId: string;
};

type ParentRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  facet_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  origin_type_code: string | null;
  status: string;
};

type LeafOptionRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  facet_code: string | null;
  scope_code: string | null;
};

type WorkBody = {
  action?: unknown;
  signalId?: unknown;
  locale?: unknown;
  result?: unknown;
  selectedValueObjectId?: unknown;
  comment?: unknown;
  scope?: unknown;
  nodeRole?: unknown;
  parentValueObjectId?: unknown;
  facetCode?: unknown;
  title?: unknown;
  description?: unknown;
  canonicalKey?: unknown;
  titleRu?: unknown;
  descriptionRu?: unknown;
  titleEn?: unknown;
  descriptionEn?: unknown;
  hierarchyRelationCode?: unknown;
};

type DecisionState = {
  completed: boolean;
  result: string | null;
  selectedValueObjectId: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
};

type CreationState = {
  id: string;
  scope: ScopeCode | null;
  nodeRole: NodeRoleCode | null;
  valueObjectId: string | null;
  canonicalKey: string | null;
  title: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
  completedTargetLeaf: boolean;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown): string {
  const locale = text(value).toLowerCase();
  return ["en", "pl", "ru", "uk", "de", "es", "cs"].includes(locale)
    ? locale
    : "en";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requestHash(value: JsonRecord): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")
    .toUpperCase();
}

function parameterCheckLogId(signalId: string) {
  return stableUuid(`ARCTOR_REALITY_CURATOR_PARAMETER_CHECK_V1|${signalId}|${PARAMETER_EVENT_CODE}`);
}

function decisionLogId(signalId: string) {
  return stableUuid(`${DECISION_CONTRACT}|${signalId}|${DECISION_EVENT_CODE}`);
}

function creationLogId(signalId: string, valueObjectId: string) {
  return stableUuid(`${CREATION_CONTRACT}|${signalId}|${CREATED_EVENT_CODE}|${valueObjectId}`);
}

function errorResponse(errorCode: string, error: string, status: number) {
  return NextResponse.json(
    { ok: false, routeMarker: ROUTE_MARKER, errorCode, error },
    { status },
  );
}

function adminMetadata(guard: RequirePlatformAdminSuccess) {
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
    curatorNameSnapshot: guard.appUser.name,
    curatorEmailSnapshot: guard.appUser.email,
  };
}

function supportsRole(raw: unknown, role: NodeRoleCode): boolean {
  if (Array.isArray(raw)) return raw.includes(role);
  const record = asRecord(raw);
  return record[role] === true;
}

async function resolveCurrentActor(guard: RequirePlatformAdminSuccess) {
  const auth0Sub = text(guard.appUser.auth0_sub);
  if (!auth0Sub) {
    throw new ActorContextError(
      409,
      "CURATOR_ACTIVE_PROFILE_AUTH_LINK_MISSING",
      "Current curator is not linked to an Auth0 identity.",
    );
  }
  const context = await resolveActiveActorContext(auth0Sub);
  if (context.appUserId !== guard.appUser.id) {
    throw new ActorContextError(
      409,
      "CURATOR_ACTIVE_PROFILE_USER_MISMATCH",
      "Resolved active profile does not belong to the current curator.",
    );
  }
  return context;
}

async function readEligibleSignal(signalId: string): Promise<EligibleSignal> {
  const { data: signalRows, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id")
    .eq("id", signalId)
    .limit(1);
  if (signalError) throw new Error(`CURATOR_OBJECT_SIGNAL_READ_FAILED:${signalError.message}`);
  const signal = signalRows?.[0];
  if (!signal) throw new Error("CURATOR_OBJECT_SIGNAL_NOT_FOUND");

  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const candidates = Array.isArray(analysis.templateCandidates) ? analysis.templateCandidates : [];
  const eligible =
    signal.source_type === "manual_chat" &&
    text(signal.idempotency_key).startsWith("activity_ai_lab_quick_capture:") &&
    analysis.contract === BASIC_CONTRACT &&
    analysis.status === "completed" &&
    analysis.noSuitableTypicalActivity === true &&
    candidates.length === 0;
  if (!eligible) throw new Error("CURATOR_OBJECT_SIGNAL_NOT_ELIGIBLE");

  const activityEventId = text(analysis.activityEventId) || text(signal.output_event_id);
  if (!activityEventId) throw new Error("CURATOR_OBJECT_ACTIVITY_EVENT_MISSING");

  const { data: eventRows, error: eventError } = await supabase
    .from("activity_events")
    .select("id,user_id")
    .eq("id", activityEventId)
    .eq("user_id", signal.user_id)
    .limit(1);
  if (eventError) throw new Error(`CURATOR_OBJECT_ACTIVITY_READ_FAILED:${eventError.message}`);
  if (!eventRows?.[0]) throw new Error("CURATOR_OBJECT_ACTIVITY_CONTEXT_MISSING");

  return { id: signal.id, userId: signal.user_id, activityEventId };
}

async function assertParameterCheckCompleted(signal: EligibleSignal) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id")
    .eq("id", parameterCheckLogId(signal.id))
    .eq("raw_signal_id", signal.id)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .limit(1);
  if (error) throw new Error(`CURATOR_OBJECT_PARAMETER_GATE_READ_FAILED:${error.message}`);
  if (!data?.[0]) throw new Error("CURATOR_OBJECT_PARAMETER_GATE_REQUIRED");
}

async function readDecisionState(signalId: string): Promise<DecisionState> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json")
    .eq("id", decisionLogId(signalId))
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .limit(1);
  if (error) throw new Error(`CURATOR_OBJECT_DECISION_LOG_READ_FAILED:${error.message}`);
  const row = data?.[0];
  if (!row) {
    return {
      completed: false,
      result: null,
      selectedValueObjectId: null,
      resultSummaryRu: null,
      resultSummaryEn: null,
    };
  }
  const metadata = asRecord(row.metadata_json);
  return {
    completed: true,
    result: text(metadata.objectDecisionResult) || null,
    selectedValueObjectId: text(metadata.selectedValueObjectId) || null,
    resultSummaryRu: text(metadata.resultSummaryRu) || null,
    resultSummaryEn: text(metadata.resultSummaryEn) || null,
  };
}

async function readCreationStates(signalId: string): Promise<CreationState[]> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json,created_at")
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: CREATED_EVENT_CODE })
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`CURATOR_OBJECT_CREATION_LOG_READ_FAILED:${error.message}`);
  return (data ?? []).map((row) => {
    const metadata = asRecord(row.metadata_json);
    const rawScope = text(metadata.creationScope);
    const rawRole = text(metadata.createdNodeRole);
    return {
      id: row.id,
      scope: rawScope === "private" || rawScope === "system" ? rawScope : null,
      nodeRole: rawRole === "root" || rawRole === "intermediate" || rawRole === "leaf" ? rawRole : null,
      valueObjectId: text(metadata.createdValueObjectId) || null,
      canonicalKey: text(metadata.createdCanonicalKey) || null,
      title: text(metadata.createdTitle) || null,
      resultSummaryRu: text(metadata.resultSummaryRu) || null,
      resultSummaryEn: text(metadata.resultSummaryEn) || null,
      completedTargetLeaf: metadata.completedTargetLeaf === true,
    };
  });
}

async function appendLog(input: {
  id: string;
  signal: EligibleSignal;
  guard: RequirePlatformAdminSuccess;
  eventCode: string;
  checklistStepCode: string;
  checklistStepNameSnapshotRu: string;
  labelRu: string;
  labelEn: string;
  resultSummaryRu: string;
  resultSummaryEn: string;
  comment: string;
  extraMetadata: JsonRecord;
}) {
  const occurredAt = new Date().toISOString();
  const { error } = await supabase.from("activity_processing_logs").insert({
    id: input.id,
    user_id: input.signal.userId,
    raw_signal_id: input.signal.id,
    activity_event_id: input.signal.activityEventId,
    processor_name: PROCESSOR_NAME,
    processor_version: PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "completed",
    severity: "notice",
    message: input.labelEn,
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: CREATION_CONTRACT,
      eventCode: input.eventCode,
      checklistVersion: "2.0",
      checklistStepCode: input.checklistStepCode,
      checklistStepNameSnapshotRu: input.checklistStepNameSnapshotRu,
      labelRu: input.labelRu,
      labelEn: input.labelEn,
      actorKind: "curator",
      provenance: "curator_action",
      ...adminMetadata(input.guard),
      curatorComment: input.comment,
      resultSummaryRu: input.resultSummaryRu,
      resultSummaryEn: input.resultSummaryEn,
      ...input.extraMetadata,
    },
    started_at: occurredAt,
    finished_at: occurredAt,
  });
  if (error && error.code !== "23505") {
    throw new Error(`CURATOR_OBJECT_LOG_APPEND_FAILED:${input.eventCode}:${error.message}`);
  }
  return { duplicate: error?.code === "23505" };
}

function toOption(row: LeafOptionRow | ParentRow, locale: string) {
  const localized = row.scope_code === "global"
    ? localizeGlobalSystemValueObject(row, locale)
    : row;
  const role = "ontology_node_role_code" in row ? text(row.ontology_node_role_code) : "leaf";
  const status = "status" in row ? text(row.status) : "active";
  return {
    id: row.id,
    title: text(localized.title) || row.id,
    canonicalKey: text(row.canonical_key) || null,
    facetCode: text(row.facet_code) || null,
    nodeRole: role === "root" || role === "intermediate" || role === "leaf" ? role : null,
    scopeCode: row.scope_code === "global" ? ("global" as const) : ("actor" as const),
    status,
  };
}

async function readFacetOptions() {
  const { data, error } = await supabase
    .from("value_object_facet_registry")
    .select("facet_code,status")
    .eq("status", "active")
    .in("facet_code", [...FACET_ORDER]);
  if (error) throw new Error(`CURATOR_OBJECT_FACET_OPTIONS_READ_FAILED:${error.message}`);
  const active = new Set((data ?? []).map((row) => text(row.facet_code)));
  return FACET_ORDER.filter((facet) => active.has(facet));
}

async function readOptions(actor: ResolvedActorContext, locale: string) {
  const parentSelect = "id,title,description,canonical_key,facet_code,branch_type_code,root_value_object_id,ontology_node_role_code,scope_code,owner_user_id,owner_actor_id,origin_type_code,status";
  const leafSelect = "id,title,description,canonical_key,facet_code,scope_code";
  const [privateParentsResult, systemParentsResult, privateLeavesResult, systemLeavesResult, facets] = await Promise.all([
    supabase
      .from("value_objects")
      .select(parentSelect)
      .eq("scope_code", "actor")
      .eq("owner_user_id", actor.appUserId)
      .eq("owner_actor_id", actor.actorId)
      .eq("status", "active")
      .in("ontology_node_role_code", ["root", "intermediate"])
      .order("title", { ascending: true })
      .limit(2000),
    supabase
      .from("value_objects")
      .select(parentSelect)
      .eq("scope_code", "global")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .eq("origin_type_code", "system_model")
      .in("status", ["draft", "active"])
      .in("ontology_node_role_code", ["root", "intermediate"])
      .order("title", { ascending: true })
      .limit(2000),
    supabase
      .from("value_objects")
      .select(leafSelect)
      .eq("scope_code", "actor")
      .eq("owner_user_id", actor.appUserId)
      .eq("owner_actor_id", actor.actorId)
      .eq("status", "active")
      .eq("ontology_node_role_code", "leaf")
      .order("title", { ascending: true })
      .limit(2000),
    supabase
      .from("value_objects")
      .select(leafSelect)
      .eq("scope_code", "global")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .eq("origin_type_code", "system_model")
      .eq("status", "active")
      .eq("ontology_node_role_code", "leaf")
      .order("title", { ascending: true })
      .limit(2000),
    readFacetOptions(),
  ]);
  for (const [name, result] of [
    ["privateParents", privateParentsResult],
    ["systemParents", systemParentsResult],
    ["privateLeaves", privateLeavesResult],
    ["systemLeaves", systemLeavesResult],
  ] as const) {
    if (result.error) throw new Error(`CURATOR_OBJECT_OPTIONS_READ_FAILED:${name}:${result.error.message}`);
  }
  const privateParents = (privateParentsResult.data ?? []) as ParentRow[];
  const systemParents = (systemParentsResult.data ?? []) as ParentRow[];
  const privateLeaves = (privateLeavesResult.data ?? []) as LeafOptionRow[];
  const systemLeaves = (systemLeavesResult.data ?? []) as LeafOptionRow[];
  return {
    privateParents: privateParents.map((row) => toOption(row, locale)),
    systemParents: systemParents.map((row) => toOption(row, locale)),
    existingLeaves: [
      ...systemLeaves.map((row) => toOption(row, locale)),
      ...privateLeaves.map((row) => toOption(row, locale)),
    ],
    facetOptions: facets,
  };
}

async function buildState(
  signal: EligibleSignal,
  actor: ResolvedActorContext,
  locale: string,
) {
  const [decision, creations, options] = await Promise.all([
    readDecisionState(signal.id),
    readCreationStates(signal.id),
    readOptions(actor, locale),
  ]);
  const targetLeaf = [...creations].reverse().find((item) => item.completedTargetLeaf) ?? null;
  return {
    ok: true,
    routeMarker: ROUTE_MARKER,
    activeProfile: {
      actorId: actor.actorId,
      displayName: actor.profile.displayName,
    },
    decision,
    creation: {
      completed: Boolean(targetLeaf),
      targetLeaf,
      history: creations,
    },
    ...options,
  };
}

async function readAllowedExistingLeaf(
  valueObjectId: string,
  actor: ResolvedActorContext,
) {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,canonical_key,scope_code,owner_user_id,owner_actor_id,origin_type_code,status,ontology_node_role_code")
    .eq("id", valueObjectId)
    .limit(1);
  if (error) throw new Error(`CURATOR_OBJECT_EXISTING_LEAF_READ_FAILED:${error.message}`);
  const row = data?.[0];
  if (!row || row.status !== "active" || row.ontology_node_role_code !== "leaf") return null;
  if (
    row.scope_code === "global" &&
    row.owner_user_id === null &&
    row.owner_actor_id === null &&
    row.origin_type_code === "system_model"
  ) return row;
  if (
    row.scope_code === "actor" &&
    row.owner_user_id === actor.appUserId &&
    row.owner_actor_id === actor.actorId
  ) return row;
  return null;
}

function decisionSummary(result: string, title: string | null) {
  if (result === "existing_leaf_found") {
    return {
      ru: `Подходящий листовой объект наблюдения найден${title ? `: «${title}»` : ""}.`,
      en: `A suitable leaf observation object was found${title ? `: “${title}”` : ""}.`,
    };
  }
  if (result === "new_leaf_required") {
    return {
      ru: "Подходящего листового объекта наблюдения нет; требуется создать новый лист и при необходимости недостающий путь root → intermediate → … → leaf.",
      en: "No suitable leaf observation object exists; a new leaf and, if needed, its missing root → intermediate → … → leaf path must be created.",
    };
  }
  if (result === "parameter_not_assigned") {
    return {
      ru: "Параметр не должен назначаться объекту наблюдения в этом случае.",
      en: "The parameter should not be assigned to an observation object in this case.",
    };
  }
  return {
    ru: "Для определения измеримого объекта требуется дополнительное уточнение.",
    en: "Additional clarification is required to determine the measurable object.",
  };
}

async function readParent(input: {
  parentId: string;
  scope: ScopeCode;
  actor: ResolvedActorContext;
  childRole: NodeRoleCode;
}) {
  let query = supabase
    .from("value_objects")
    .select("id,title,description,canonical_key,facet_code,branch_type_code,root_value_object_id,ontology_node_role_code,scope_code,owner_user_id,owner_actor_id,origin_type_code,status")
    .eq("id", input.parentId)
    .limit(1);
  if (input.scope === "private") {
    query = query
      .eq("scope_code", "actor")
      .eq("owner_user_id", input.actor.appUserId)
      .eq("owner_actor_id", input.actor.actorId)
      .eq("status", "active");
  } else {
    query = query
      .eq("scope_code", "global")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .eq("origin_type_code", "system_model")
      .in("status", ["draft", "active"]);
  }
  const { data, error } = await query;
  if (error) throw new Error(`CURATOR_OBJECT_PARENT_READ_FAILED:${input.scope}:${error.message}`);
  const parent = (data?.[0] as ParentRow | undefined) ?? null;
  if (!parent) return null;
  if (input.childRole === "leaf") {
    return parent.ontology_node_role_code === "intermediate" ? parent : null;
  }
  if (input.childRole === "intermediate") {
    return parent.ontology_node_role_code === "root" || parent.ontology_node_role_code === "intermediate"
      ? parent
      : null;
  }
  return null;
}

async function chooseGenericKind(facetCode: string, role: "intermediate" | "leaf") {
  const preferred = GENERIC_KIND_BY_FACET[facetCode];
  if (!preferred) throw new Error(`CURATOR_OBJECT_FACET_UNSUPPORTED:${facetCode}`);
  const { data, error } = await supabase
    .from("value_object_kind_registry")
    .select("object_kind_code,facet_code,allowed_node_roles_json,status")
    .eq("object_kind_code", preferred)
    .eq("facet_code", facetCode)
    .eq("status", "active")
    .limit(1);
  if (error) throw new Error(`CURATOR_OBJECT_KIND_READ_FAILED:${error.message}`);
  const row = data?.[0];
  if (!row || !supportsRole(row.allowed_node_roles_json, role)) {
    throw new Error(`CURATOR_OBJECT_GENERIC_KIND_ROLE_UNAVAILABLE:${facetCode}:${role}`);
  }
  return preferred;
}

async function resolveSemanticShape(input: {
  role: NodeRoleCode;
  parent: ParentRow | null;
  requestedFacet: string;
}) {
  if (input.role === "root") {
    return {
      facetCode: "DOMAIN",
      objectKindCode: "domain_root",
      rootValueObjectId: null,
    };
  }
  if (!input.parent) throw new Error("CURATOR_OBJECT_PARENT_REQUIRED");
  const parentRole = text(input.parent.ontology_node_role_code);
  const parentFacet = text(input.parent.facet_code);
  let facetCode: string;
  if (parentRole === "root") {
    facetCode = text(input.requestedFacet).toUpperCase();
    if (!FACET_ORDER.includes(facetCode as (typeof FACET_ORDER)[number])) {
      throw new Error("CURATOR_OBJECT_DIRECT_CHILD_FACET_REQUIRED");
    }
  } else {
    facetCode = parentFacet;
  }
  const objectKindCode = await chooseGenericKind(facetCode, input.role);
  const rootValueObjectId = parentRole === "root"
    ? input.parent.id
    : text(input.parent.root_value_object_id);
  if (!UUID_RE.test(rootValueObjectId)) throw new Error("CURATOR_OBJECT_PARENT_ROOT_POINTER_INVALID");
  return { facetCode, objectKindCode, rootValueObjectId };
}

async function createPrivateObject(input: {
  signal: EligibleSignal;
  actor: ResolvedActorContext;
  role: NodeRoleCode;
  parent: ParentRow | null;
  requestedFacet: string;
  title: string;
  description: string;
  hierarchyRelationCode: string;
}) {
  const semantic = await resolveSemanticShape({
    role: input.role,
    parent: input.parent,
    requestedFacet: input.requestedFacet,
  });
  const payload: JsonRecord = {
    title: input.title,
    description: input.description || input.title,
    facetCode: semantic.facetCode,
    objectKindCode: semantic.objectKindCode,
    nodeRoleCode: input.role,
    visibilityCode: "private",
    privacyClassCode: "standard",
  };
  if (input.role !== "root" && input.parent) {
    payload.parentValueObjectId = input.parent.id;
    payload.hierarchyRelationCode = input.hierarchyRelationCode;
  }
  const hash = requestHash(payload);
  const idempotencyKey = `curator-private-v13:${input.signal.id}:${hash.slice(0, 32).toLowerCase()}`;
  const { data, error } = await supabase.rpc("create_value_object_ontology_v1", {
    p_owner_user_id: input.actor.appUserId,
    p_owner_actor_id: input.actor.actorId,
    p_created_by_actor_id: input.actor.actorId,
    p_payload: payload,
    p_idempotency_key: idempotencyKey,
    p_request_hash: hash,
  });
  if (error) throw new Error(`CURATOR_PRIVATE_CREATE_FAILED:${error.code ?? "DB"}:${error.message}`);
  const card = asRecord(data);
  const node = asRecord(card.valueObject);
  const valueObjectId = text(node.id);
  if (!UUID_RE.test(valueObjectId)) throw new Error("CURATOR_PRIVATE_CREATE_INVALID_CARD");

  const { data: rows, error: stateError } = await supabase
    .from("value_objects")
    .select("id,status")
    .eq("id", valueObjectId)
    .limit(1);
  if (stateError) throw new Error(`CURATOR_PRIVATE_POSTCREATE_READ_FAILED:${stateError.message}`);
  if (rows?.[0]?.status === "draft") {
    const { error: activationError } = await supabase.rpc("set_value_object_ontology_lifecycle_v1", {
      p_owner_user_id: input.actor.appUserId,
      p_owner_actor_id: input.actor.actorId,
      p_value_object_id: valueObjectId,
      p_new_status: "active",
    });
    if (activationError) throw new Error(`CURATOR_PRIVATE_ACTIVATION_FAILED:${activationError.code ?? "DB"}:${activationError.message}`);
  }

  const { data: postRows, error: postError } = await supabase
    .from("value_objects")
    .select("id,status,scope_code,owner_user_id,owner_actor_id,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,canonical_key")
    .eq("id", valueObjectId)
    .limit(1);
  if (postError) throw new Error(`CURATOR_PRIVATE_POSTCHECK_FAILED:${postError.message}`);
  const post = postRows?.[0];
  const parentId = input.role === "root" ? null : input.parent?.id ?? null;
  if (
    !post ||
    post.status !== "active" ||
    post.scope_code !== "actor" ||
    post.owner_user_id !== input.actor.appUserId ||
    post.owner_actor_id !== input.actor.actorId ||
    post.parent_value_object_id !== parentId ||
    post.ontology_node_role_code !== input.role ||
    post.facet_code !== semantic.facetCode ||
    (input.role === "root" && post.root_value_object_id !== valueObjectId) ||
    (input.role !== "root" && post.root_value_object_id !== semantic.rootValueObjectId)
  ) {
    throw new Error("CURATOR_PRIVATE_POSTCHECK_STATE_INVALID");
  }
  return { valueObjectId, canonicalKey: text(post.canonical_key) || null, title: input.title };
}

async function createSystemObject(input: {
  signal: EligibleSignal;
  guard: RequirePlatformAdminSuccess;
  role: NodeRoleCode;
  parent: ParentRow | null;
  requestedFacet: string;
  canonicalKey: string;
  titleRu: string;
  descriptionRu: string;
  titleEn: string;
  descriptionEn: string;
  hierarchyRelationCode: string;
}) {
  const semantic = await resolveSemanticShape({
    role: input.role,
    parent: input.parent,
    requestedFacet: input.requestedFacet,
  });
  const payload: JsonRecord = {
    role: input.role,
    canonicalKey: input.canonicalKey,
    parentValueObjectId: input.parent?.id ?? null,
    rootValueObjectId: semantic.rootValueObjectId,
    facetCode: semantic.facetCode,
    objectKindCode: semantic.objectKindCode,
    hierarchyRelationCode: input.role === "root" ? null : input.hierarchyRelationCode,
    titleRu: input.titleRu,
    descriptionRu: input.descriptionRu,
    titleEn: input.titleEn,
    descriptionEn: input.descriptionEn,
  };
  const hash = requestHash(payload);
  const valueObjectId = stableUuid(`ARCTOR_CURATOR_SYSTEM_OBJECT_V1_3|${input.canonicalKey}`);
  const expectedRootId = input.role === "root" ? valueObjectId : semantic.rootValueObjectId;

  const { data: existingRows, error: existingError } = await supabase
    .from("value_objects")
    .select("id,canonical_key,scope_code,owner_user_id,owner_actor_id,created_by_actor_id,status,metadata_json,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,origin_type_code")
    .eq("canonical_key", input.canonicalKey)
    .limit(10);
  if (existingError) throw new Error(`CURATOR_SYSTEM_DUPLICATE_READ_FAILED:${existingError.message}`);
  const existing = existingRows?.[0];
  if (existing) {
    const metadata = asRecord(existing.metadata_json);
    const draftMeta = asRecord(metadata.curator_system_draft_v1);
    const replay =
      existing.id === valueObjectId &&
      text(draftMeta.requestHash) === hash &&
      existing.scope_code === "global" &&
      existing.owner_user_id === null &&
      existing.owner_actor_id === null &&
      existing.created_by_actor_id === null &&
      existing.parent_value_object_id === (input.parent?.id ?? null) &&
      existing.root_value_object_id === expectedRootId &&
      existing.ontology_node_role_code === input.role &&
      existing.facet_code === semantic.facetCode &&
      existing.origin_type_code === "system_model";
    if (!replay) throw new Error("CURATOR_SYSTEM_CANONICAL_KEY_ALREADY_EXISTS");
    return { valueObjectId, canonicalKey: input.canonicalKey, title: input.titleRu, replay: true };
  }

  const metadataJson = {
    system_hidden_from_observation_ui: true,
    curator_system_draft_v1: {
      contract: CREATION_CONTRACT,
      requestHash: hash,
      rawSignalId: input.signal.id,
      curatorAppUserId: input.guard.appUser.id,
      curatorAdminId: input.guard.platformAdmin.id,
      curatorRole: input.guard.platformAdmin.role,
      createdAt: new Date().toISOString(),
      publicationState: "draft_not_published",
      nodeRole: input.role,
      localizations: {
        ru: { title: input.titleRu, description: input.descriptionRu },
        en: { title: input.titleEn, description: input.descriptionEn },
      },
    },
  };

  const { error: insertError } = await supabase.from("value_objects").insert({
    id: valueObjectId,
    owner_actor_id: null,
    value_type: "other",
    title: input.titleEn,
    description: input.descriptionEn,
    organization_id: null,
    commercial_usage: "none",
    parent_value_object_id: input.role === "root" ? null : input.parent?.id ?? null,
    actor_id: null,
    app_user_id: null,
    owner_user_id: null,
    visibility: "public",
    source: "manual",
    usage_scope: "private",
    created_by_actor_id: null,
    object_kind: "other",
    node_role_code: "structural",
    branch_type_code: "ontology_v1",
    root_value_object_id: expectedRootId,
    instance_of_value_object_id: null,
    privacy_level: "public",
    sensitivity_level: "standard",
    status: "draft",
    canonical_key: input.canonicalKey,
    facet_code: semantic.facetCode,
    object_kind_code: semantic.objectKindCode,
    ontology_node_role_code: input.role,
    hierarchy_relation_code: input.role === "root" ? null : input.hierarchyRelationCode,
    scope_code: "global",
    visibility_code: "public",
    privacy_class_code: "public_ontology",
    definition_version: 1,
    origin_type_code: "system_model",
    metadata_json: metadataJson,
    identity_attributes_json: {},
  });
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: replayRows } = await supabase
        .from("value_objects")
        .select("id,metadata_json")
        .eq("id", valueObjectId)
        .limit(1);
      const replayRow = replayRows?.[0];
      const replayMeta = asRecord(asRecord(replayRow?.metadata_json).curator_system_draft_v1);
      if (replayRow?.id === valueObjectId && text(replayMeta.requestHash) === hash) {
        return { valueObjectId, canonicalKey: input.canonicalKey, title: input.titleRu, replay: true };
      }
    }
    throw new Error(`CURATOR_SYSTEM_CREATE_FAILED:${insertError.code ?? "DB"}:${insertError.message}`);
  }

  const [{ data: postRows, error: postError }, { data: versionRows, error: versionError }] = await Promise.all([
    supabase
      .from("value_objects")
      .select("id,status,scope_code,owner_user_id,owner_actor_id,created_by_actor_id,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,origin_type_code,metadata_json")
      .eq("id", valueObjectId)
      .limit(1),
    supabase
      .from("value_object_definition_versions")
      .select("value_object_id,version,scope_code,owner_actor_id,origin_type_code")
      .eq("value_object_id", valueObjectId)
      .eq("version", 1)
      .limit(1),
  ]);
  if (postError) throw new Error(`CURATOR_SYSTEM_POSTCHECK_READ_FAILED:${postError.message}`);
  if (versionError) throw new Error(`CURATOR_SYSTEM_VERSION_POSTCHECK_READ_FAILED:${versionError.message}`);
  const post = postRows?.[0];
  const version = versionRows?.[0];
  const postMetadata = asRecord(post?.metadata_json);
  if (
    !post ||
    post.status !== "draft" ||
    post.scope_code !== "global" ||
    post.owner_user_id !== null ||
    post.owner_actor_id !== null ||
    post.created_by_actor_id !== null ||
    post.parent_value_object_id !== (input.parent?.id ?? null) ||
    post.root_value_object_id !== expectedRootId ||
    post.ontology_node_role_code !== input.role ||
    post.facet_code !== semantic.facetCode ||
    post.origin_type_code !== "system_model" ||
    postMetadata.system_hidden_from_observation_ui !== true ||
    !version ||
    version.scope_code !== "global" ||
    version.owner_actor_id !== null ||
    version.origin_type_code !== "system_model"
  ) {
    throw new Error("CURATOR_SYSTEM_POSTCHECK_STATE_INVALID");
  }
  return { valueObjectId, canonicalKey: input.canonicalKey, title: input.titleRu, replay: false };
}

function roleNameRu(role: NodeRoleCode) {
  if (role === "root") return "корневой";
  if (role === "intermediate") return "промежуточный";
  return "листовой";
}

function roleNameEn(role: NodeRoleCode) {
  if (role === "root") return "root";
  if (role === "intermediate") return "intermediate";
  return "leaf";
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);
  const url = new URL(request.url);
  const signalId = text(url.searchParams.get("signalId"));
  const locale = normalizeLocale(url.searchParams.get("locale"));
  if (!UUID_RE.test(signalId)) return errorResponse("CURATOR_OBJECT_SIGNAL_ID_INVALID", "signalId is invalid", 400);
  try {
    const actor = await resolveCurrentActor(guard);
    const signal = await readEligibleSignal(signalId);
    await assertParameterCheckCompleted(signal);
    return NextResponse.json(await buildState(signal, actor, locale));
  } catch (error) {
    if (error instanceof ActorContextError) return errorResponse(error.code, error.message, error.status);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.endsWith("NOT_FOUND") ? 404 : message.endsWith("REQUIRED") ? 409 : 500;
    return errorResponse("CURATOR_OBJECT_BOOTSTRAP_GET_FAILED", message, status);
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);
  let body: WorkBody;
  try {
    body = (await request.json()) as WorkBody;
  } catch {
    return errorResponse("CURATOR_OBJECT_JSON_INVALID", "Invalid JSON body", 400);
  }
  const signalId = text(body.signalId);
  const locale = normalizeLocale(body.locale);
  if (!UUID_RE.test(signalId)) return errorResponse("CURATOR_OBJECT_SIGNAL_ID_INVALID", "signalId is invalid", 400);

  try {
    const actor = await resolveCurrentActor(guard);
    const signal = await readEligibleSignal(signalId);
    await assertParameterCheckCompleted(signal);
    const action = text(body.action);

    if (action === "record_object_decision") {
      const previous = await readDecisionState(signal.id);
      if (previous.completed) return NextResponse.json(await buildState(signal, actor, locale));
      const result = text(body.result);
      const comment = text(body.comment);
      if (!DECISIONS.has(result)) return errorResponse("CURATOR_OBJECT_DECISION_INVALID", "result is invalid", 400);
      if (!comment || comment.length > 1500) return errorResponse("CURATOR_OBJECT_COMMENT_REQUIRED", "comment is required and must be 1500 characters or fewer", 400);

      let selectedValueObjectId: string | null = null;
      let selectedTitle: string | null = null;
      if (result === "existing_leaf_found") {
        selectedValueObjectId = text(body.selectedValueObjectId);
        if (!UUID_RE.test(selectedValueObjectId)) return errorResponse("CURATOR_OBJECT_EXISTING_LEAF_REQUIRED", "selectedValueObjectId is required", 400);
        const existing = await readAllowedExistingLeaf(selectedValueObjectId, actor);
        if (!existing) return errorResponse("CURATOR_OBJECT_EXISTING_LEAF_NOT_AVAILABLE", "Selected leaf is not available in System or the curator's current private profile", 409);
        selectedTitle = text(existing.title) || null;
      }
      const summary = decisionSummary(result, selectedTitle);
      await appendLog({
        id: decisionLogId(signal.id),
        signal,
        guard,
        eventCode: DECISION_EVENT_CODE,
        checklistStepCode: "400.1",
        checklistStepNameSnapshotRu: "Определить измеримый объект и решить: использовать существующий лист, создать новый лист, не назначать параметр либо запросить уточнение.",
        labelRu: "Определён следующий шаг для измеримого объекта",
        labelEn: "Next measurable-object step determined",
        resultSummaryRu: summary.ru,
        resultSummaryEn: summary.en,
        comment,
        extraMetadata: {
          objectDecisionResult: result,
          selectedValueObjectId,
          selectedValueObjectTitle: selectedTitle,
        },
      });
      return NextResponse.json(await buildState(signal, actor, locale));
    }

    if (action === "create_observation_object") {
      const decision = await readDecisionState(signal.id);
      if (!decision.completed || decision.result !== "new_leaf_required") {
        return errorResponse("CURATOR_OBJECT_NEW_LEAF_DECISION_REQUIRED", "The curator must first record that a new leaf is required", 409);
      }
      const existingCreations = await readCreationStates(signal.id);
      if (existingCreations.some((item) => item.completedTargetLeaf)) {
        return NextResponse.json(await buildState(signal, actor, locale));
      }

      const scope = text(body.scope);
      if (scope !== "private" && scope !== "system") {
        return errorResponse("CURATOR_OBJECT_SCOPE_REQUIRED", "scope must be explicitly private or system", 400);
      }
      const nodeRole = text(body.nodeRole);
      if (!NODE_ROLES.has(nodeRole)) {
        return errorResponse("CURATOR_OBJECT_NODE_ROLE_REQUIRED", "nodeRole must be explicitly root, intermediate or leaf", 400);
      }
      const role = nodeRole as NodeRoleCode;
      const parentId = text(body.parentValueObjectId);
      const requestedFacet = text(body.facetCode).toUpperCase();
      const hierarchyRelationCode = text(body.hierarchyRelationCode);
      const comment = text(body.comment);
      if (!comment || comment.length > 1500) return errorResponse("CURATOR_OBJECT_CREATE_COMMENT_REQUIRED", "comment is required and must be 1500 characters or fewer", 400);

      let parent: ParentRow | null = null;
      if (role === "root") {
        if (parentId) return errorResponse("CURATOR_ROOT_PARENT_FORBIDDEN", "Root observation objects cannot have a parent", 400);
      } else {
        if (!UUID_RE.test(parentId)) return errorResponse("CURATOR_OBJECT_PARENT_REQUIRED", "A valid parentValueObjectId is required", 400);
        parent = await readParent({ parentId, scope: scope as ScopeCode, actor, childRole: role });
        if (!parent) {
          const message = role === "leaf"
            ? "A leaf can be created only under an intermediate object in the same Private/System scope"
            : "An intermediate can be created only under a root or intermediate object in the same Private/System scope";
          return errorResponse("CURATOR_OBJECT_PARENT_NOT_AVAILABLE", message, 409);
        }
        if (text(parent.ontology_node_role_code) === "root" && !FACET_ORDER.includes(requestedFacet as (typeof FACET_ORDER)[number])) {
          return errorResponse("CURATOR_OBJECT_DIRECT_CHILD_FACET_REQUIRED", "A non-DOMAIN facet is required for a direct child of a root", 400);
        }
        if (!RELATIONS.has(hierarchyRelationCode)) {
          return errorResponse("CURATOR_OBJECT_RELATION_INVALID", "hierarchyRelationCode is invalid", 400);
        }
      }

      let created: { valueObjectId: string; canonicalKey: string | null; title: string };
      let resultSummaryRu: string;
      let resultSummaryEn: string;

      if (scope === "private") {
        const title = text(body.title);
        const description = text(body.description);
        if (!title || title.length > 180) return errorResponse("CURATOR_PRIVATE_TITLE_INVALID", "title is required and must be 180 characters or fewer", 400);
        if (description.length > 4000) return errorResponse("CURATOR_PRIVATE_DESCRIPTION_INVALID", "description must be 4000 characters or fewer", 400);
        created = await createPrivateObject({
          signal,
          actor,
          role,
          parent,
          requestedFacet,
          title,
          description,
          hierarchyRelationCode,
        });
        resultSummaryRu = `Создан приватный ${roleNameRu(role)} ОН «${title}» только для текущего профиля «${actor.profile.displayName}».`;
        resultSummaryEn = `Private ${roleNameEn(role)} observation object “${title}” was created only for the current profile “${actor.profile.displayName}”.`;
      } else {
        const canonicalKey = text(body.canonicalKey).toLowerCase();
        const titleRu = text(body.titleRu);
        const descriptionRu = text(body.descriptionRu);
        const titleEn = text(body.titleEn);
        const descriptionEn = text(body.descriptionEn);
        if (!canonicalKey || canonicalKey.length > 160 || !CANONICAL_KEY_RE.test(canonicalKey)) return errorResponse("CURATOR_SYSTEM_CANONICAL_KEY_INVALID", "canonicalKey must be lowercase ASCII segments separated by dot, underscore or hyphen", 400);
        if (!titleRu || !titleEn || titleRu.length > 180 || titleEn.length > 180) return errorResponse("CURATOR_SYSTEM_TITLE_INVALID", "RU and EN titles are required and must be 180 characters or fewer", 400);
        if (!descriptionRu || !descriptionEn || descriptionRu.length > 4000 || descriptionEn.length > 4000) return errorResponse("CURATOR_SYSTEM_DESCRIPTION_INVALID", "RU and EN definitions are required and must be 4000 characters or fewer", 400);
        created = await createSystemObject({
          signal,
          guard,
          role,
          parent,
          requestedFacet,
          canonicalKey,
          titleRu,
          descriptionRu,
          titleEn,
          descriptionEn,
          hierarchyRelationCode,
        });
        resultSummaryRu = `Создан системный ${roleNameRu(role)} ОН-черновик «${titleRu}» (${canonicalKey}). Он ownerless, скрыт из обычного каталога и не опубликован автоматически.`;
        resultSummaryEn = `Ownerless System ${roleNameEn(role)} draft “${titleEn}” (${canonicalKey}) was created. It is hidden from the ordinary catalog and was not published automatically.`;
      }

      const completedTargetLeaf = role === "leaf";
      await appendLog({
        id: creationLogId(signal.id, created.valueObjectId),
        signal,
        guard,
        eventCode: CREATED_EVENT_CODE,
        checklistStepCode: completedTargetLeaf ? "400.3" : "400.2",
        checklistStepNameSnapshotRu: completedTargetLeaf
          ? "Создать целевой листовой объект наблюдения в явно выбранной области Private/System."
          : "Создать недостающий структурный участок пути root → intermediate → … → leaf в явно выбранной области Private/System.",
        labelRu: completedTargetLeaf ? "Создан целевой листовой объект наблюдения" : "Создан структурный объект наблюдения",
        labelEn: completedTargetLeaf ? "Target leaf observation object created" : "Structural observation object created",
        resultSummaryRu,
        resultSummaryEn,
        comment,
        extraMetadata: {
          creationScope: scope,
          createdNodeRole: role,
          createdValueObjectId: created.valueObjectId,
          createdCanonicalKey: created.canonicalKey,
          createdTitle: created.title,
          parentValueObjectId: parent?.id ?? null,
          facetCode: role === "root" ? "DOMAIN" : text(parent?.ontology_node_role_code) === "root" ? requestedFacet : text(parent?.facet_code),
          hierarchyRelationCode: role === "root" ? null : hierarchyRelationCode,
          completedTargetLeaf,
          privateOwnerAppUserId: scope === "private" ? actor.appUserId : null,
          privateOwnerActorId: scope === "private" ? actor.actorId : null,
          systemOwnerless: scope === "system",
          systemPublished: false,
        },
      });
      return NextResponse.json(await buildState(signal, actor, locale));
    }

    return errorResponse("CURATOR_OBJECT_ACTION_INVALID", "action is invalid", 400);
  } catch (error) {
    if (error instanceof ActorContextError) return errorResponse(error.code, error.message, error.status);
    const message = error instanceof Error ? error.message : String(error);
    const conflict =
      message.includes("ALREADY_EXISTS") ||
      message.includes("NOT_AVAILABLE") ||
      message.includes("DECISION_REQUIRED") ||
      message.includes("GATE_REQUIRED") ||
      message.includes("ROLE_UNAVAILABLE");
    const notFound = message.endsWith("NOT_FOUND");
    return errorResponse("CURATOR_OBJECT_BOOTSTRAP_POST_FAILED", message, notFound ? 404 : conflict ? 409 : 500);
  }
}
