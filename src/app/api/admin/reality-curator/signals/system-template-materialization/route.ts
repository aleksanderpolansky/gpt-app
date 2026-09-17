import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";

import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
  type GlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";

import {
  materializeCuratorSystemTypicalActivityV1,
  type CuratorSystemTypicalActivityMaterializationResult,
} from "@/lib/reality-curator/system-typical-activity-materialization.server";

import {
  isConfirmedMissingTypicalActivityAnalysis,
} from "@/lib/activity/basic-intake-analysis-state";

import {
  getActivityUserContext,
} from "../../../../../../../lib/activity/activityUserContext";

import {
  supabase,
} from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "reality-curator-system-template-materialization-v1" as const;

const PROCESSOR_NAME =
  "reality_curator_journey" as const;

const PROCESSOR_VERSION =
  "1" as const;

const PARAMETER_CHECK_EVENT_CODE =
  "related_parameter_catalog_checked" as const;

const PARAMETER_SET_EVENT_CODE =
  "typical_activity_parameter_set_confirmed" as const;

const MAPPING_SET_CONFIRMED_EVENT_CODE =
  "measurable_object_mapping_set_confirmed" as const;

const MATERIALIZED_EVENT_CODE =
  "system_typical_activity_materialized" as const;

const CONTRACT =
  "ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord =
  Record<string, unknown>;

type EligibleSignal = {
  id: string;
  userId: string;
  activityEventId: string;
};

type ParameterDefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  status: string;
  scope_code: string;
};

type ValueObjectRow = {
  id: string;
  canonical_key: string | null;
  title: string | null;
  description: string | null;
  metadata_json: unknown;

  scope_code: string;
  origin_type_code: string | null;
  ontology_node_role_code: string | null;
  status: string;
};

type MappingPair = {
  parameterDefinitionId: string;
  valueObjectId: string;
};

type DraftState = {
  ready: boolean;

  parameterDefinitionIds: string[];
  mappings: MappingPair[];

  parameters: Array<{
    id: string;
    parameterCode: string;
    title: string;
  }>;

  targetValueObjects: Array<{
    id: string;
    canonicalKey: string | null;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
  }>;

  suggestion: {
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
  } | null;
};

type MaterializationState = {
  templateId: string;
  profileId: string;
  versionNo: number;

  title: string | null;
  titleEn: string | null;

  fingerprint: string | null;

  materializedAt: string | null;
};

type WorkBody = {
  signalId?: unknown;
  locale?: unknown;

  title?: unknown;
  titleEn?: unknown;

  description?: unknown;
  descriptionEn?: unknown;
};

function asRecord(
  value: unknown,
): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function uuidArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(text)
        .filter(
          (item) =>
            UUID_RE.test(item),
        ),
    ),
  ];
}

function stableUuid(
  seed: string,
): string {
  const bytes =
    Buffer.from(
      crypto
        .createHash("sha256")
        .update(seed, "utf8")
        .digest()
        .subarray(0, 16),
    );

  bytes[6] =
    (bytes[6] & 0x0f) | 0x50;

  bytes[8] =
    (bytes[8] & 0x3f) | 0x80;

  const hex =
    bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function materializedLogId(
  signalId: string,
  fingerprint: string,
) {
  return stableUuid(
    `${CONTRACT}|${signalId}|${MATERIALIZED_EVENT_CODE}|${fingerprint}`,
  );
}

function errorResponse(
  errorCode: string,
  error: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      errorCode,
      error,
    },
    { status },
  );
}

async function readEligibleSignal(
  signalId: string,
): Promise<EligibleSignal> {

  const {
    data: signalRows,
    error: signalError,
  } = await supabase
    .from("raw_activity_signals")
    .select(
      "id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id",
    )
    .eq("id", signalId)
    .limit(1);

  if (signalError) {
    throw new Error(
      `CURATOR_E02_SIGNAL_READ_FAILED:${signalError.message}`,
    );
  }

  const signal =
    signalRows?.[0];

  if (!signal) {
    throw new Error(
      "CURATOR_E02_SIGNAL_NOT_FOUND",
    );
  }

  const normalized =
    asRecord(
      signal.normalized_preview_json,
    );

  const analysis =
    asRecord(
      normalized.basicIntakeAnalysisV1,
    );

  const eligible =
    signal.source_type === "manual_chat" &&
    text(signal.idempotency_key)
      .startsWith(
        "activity_ai_lab_quick_capture:",
      ) &&
    isConfirmedMissingTypicalActivityAnalysis(
      analysis,
    );

  if (!eligible) {
    throw new Error(
      "CURATOR_E02_SIGNAL_NOT_ELIGIBLE",
    );
  }

  const activityEventId =
    text(
      analysis.activityEventId,
    ) ||
    text(
      signal.output_event_id,
    );

  if (!activityEventId) {
    throw new Error(
      "CURATOR_E02_ACTIVITY_EVENT_MISSING",
    );
  }

  const {
    data: eventRows,
    error: eventError,
  } = await supabase
    .from("activity_events")
    .select("id,user_id")
    .eq("id", activityEventId)
    .eq("user_id", signal.user_id)
    .limit(1);

  if (eventError) {
    throw new Error(
      `CURATOR_E02_ACTIVITY_READ_FAILED:${eventError.message}`,
    );
  }

  if (!eventRows?.[0]) {
    throw new Error(
      "CURATOR_E02_ACTIVITY_CONTEXT_MISSING",
    );
  }

  return {
    id:
      String(signal.id),

    userId:
      String(signal.user_id),

    activityEventId,
  };
}

async function assertParameterCheckCompleted(
  signalId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("activity_processing_logs")
    .select("id")
    .eq("raw_signal_id", signalId)
    .eq(
      "processor_name",
      PROCESSOR_NAME,
    )
    .eq(
      "processor_version",
      PROCESSOR_VERSION,
    )
    .contains(
      "metadata_json",
      {
        eventCode:
          PARAMETER_CHECK_EVENT_CODE,
      },
    )
    .limit(1);

  if (error) {
    throw new Error(
      `CURATOR_E02_PARAMETER_CHECK_READ_FAILED:${error.message}`,
    );
  }

  if (!data?.[0]) {
    throw new Error(
      "CURATOR_E02_PARAMETER_CHECK_REQUIRED",
    );
  }
}

async function readDraftState(
  signalId: string,
  locale:
    GlobalSystemValueObjectLocale,
): Promise<DraftState> {

  const {
    data: setRows,
    error: setError,
  } = await supabase
    .from("activity_processing_logs")
    .select(
      "metadata_json,started_at,created_at",
    )
    .eq(
      "raw_signal_id",
      signalId,
    )
    .eq(
      "processor_name",
      PROCESSOR_NAME,
    )
    .eq(
      "processor_version",
      PROCESSOR_VERSION,
    )
    .contains(
      "metadata_json",
      {
        eventCode:
          PARAMETER_SET_EVENT_CODE,
      },
    )
    .order(
      "started_at",
      { ascending: false },
    )
    .limit(1);

  if (setError) {
    throw new Error(
      `CURATOR_E02_PARAMETER_SET_READ_FAILED:${setError.message}`,
    );
  }

  const setRow =
    setRows?.[0];

  if (!setRow) {
    return {
      ready: false,
      parameterDefinitionIds: [],
      mappings: [],
      parameters: [],
      targetValueObjects: [],
      suggestion: null,
    };
  }

  const setMetadata =
    asRecord(
      setRow.metadata_json,
    );

  const parameterDefinitionIds =
    uuidArray(
      setMetadata
        .selectedParameterDefinitionIds,
    );

  if (
    parameterDefinitionIds.length === 0
  ) {
    throw new Error(
      "CURATOR_E02_CONFIRMED_PARAMETER_SET_EMPTY",
    );
  }

  const {
    data: mappingRows,
    error: mappingError,
  } = await supabase
    .from("activity_processing_logs")
    .select(
      "metadata_json,started_at,created_at",
    )
    .eq(
      "raw_signal_id",
      signalId,
    )
    .eq(
      "processor_name",
      PROCESSOR_NAME,
    )
    .eq(
      "processor_version",
      PROCESSOR_VERSION,
    )
    .contains(
      "metadata_json",
      {
        eventCode:
          MAPPING_SET_CONFIRMED_EVENT_CODE,
      },
    )
    .order(
      "started_at",
      { ascending: true },
    )
    .limit(500);

  if (mappingError) {
    throw new Error(
      `CURATOR_E02_MAPPING_SET_READ_FAILED:${mappingError.message}`,
    );
  }

  const mappingByParameter =
    new Map<string, string[]>();

  for (
    const row of mappingRows ?? []
  ) {
    const metadata =
      asRecord(
        row.metadata_json,
      );

    const parameterDefinitionId =
      text(
        metadata.parameterDefinitionId,
      );

    if (
      !UUID_RE.test(
        parameterDefinitionId,
      )
    ) {
      continue;
    }

    const valueObjectIds =
      uuidArray(
        metadata
          .mappedLeafValueObjectIds,
      );

    if (
      valueObjectIds.length > 0
    ) {
      mappingByParameter.set(
        parameterDefinitionId,
        valueObjectIds,
      );
    }
  }

  const allMapped =
    parameterDefinitionIds.every(
      (parameterDefinitionId) =>
        (
          mappingByParameter.get(
            parameterDefinitionId,
          ) ?? []
        ).length > 0,
    );

  if (!allMapped) {
    return {
      ready: false,
      parameterDefinitionIds,
      mappings: [],
      parameters: [],
      targetValueObjects: [],
      suggestion: null,
    };
  }

  const mappings =
    parameterDefinitionIds
      .flatMap(
        (
          parameterDefinitionId,
        ) =>
          (
            mappingByParameter.get(
              parameterDefinitionId,
            ) ?? []
          ).map(
            (valueObjectId) => ({
              parameterDefinitionId,
              valueObjectId,
            }),
          ),
      );

  const targetValueObjectIds =
    [
      ...new Set(
        mappings.map(
          (mapping) =>
            mapping.valueObjectId,
        ),
      ),
    ];

  const [
    parameterResult,
    valueObjectResult,
  ] = await Promise.all([
    supabase
      .from(
        "value_object_parameter_definitions",
      )
      .select(
        "id,parameter_code,title,status,scope_code",
      )
      .in(
        "id",
        parameterDefinitionIds,
      )
      .eq(
        "scope_code",
        "system",
      )
      .eq(
        "status",
        "active",
      ),

    supabase
      .from(
        "value_objects",
      )
      .select(
        "id,canonical_key,title,description,metadata_json,scope_code,origin_type_code,ontology_node_role_code,status",
      )
      .in(
        "id",
        targetValueObjectIds,
      ),
  ]);

  if (parameterResult.error) {
    throw new Error(
      `CURATOR_E02_PARAMETER_READ_FAILED:${parameterResult.error.message}`,
    );
  }

  if (valueObjectResult.error) {
    throw new Error(
      `CURATOR_E02_VALUE_OBJECT_READ_FAILED:${valueObjectResult.error.message}`,
    );
  }

  const parameterRows =
    (
      parameterResult.data ??
      []
    ) as unknown as
      ParameterDefinitionRow[];

  if (
    parameterRows.length !==
    parameterDefinitionIds.length
  ) {
    throw new Error(
      "CURATOR_E02_SYSTEM_PARAMETER_SET_CHANGED",
    );
  }

  const parameterById =
    new Map(
      parameterRows.map(
        (row) => [
          row.id,
          row,
        ] as const,
      ),
    );

  const parameters =
    parameterDefinitionIds.map(
      (id) => {

        const row =
          parameterById.get(id);

        if (!row) {
          throw new Error(
            "CURATOR_E02_PARAMETER_ORDER_RESOLUTION_FAILED",
          );
        }

        return {
          id:
            row.id,

          parameterCode:
            row.parameter_code,

          title:
            row.title,
        };
      },
    );

  const valueObjectRows =
    (
      valueObjectResult.data ??
      []
    ) as unknown as
      ValueObjectRow[];

  if (
    valueObjectRows.length !==
    targetValueObjectIds.length
  ) {
    throw new Error(
      "CURATOR_E02_VALUE_OBJECT_SET_CHANGED",
    );
  }

  const valueObjectById =
    new Map(
      valueObjectRows.map(
        (row) => [
          row.id,
          row,
        ] as const,
      ),
    );

  const targetValueObjects =
    targetValueObjectIds.map(
      (id) => {

        const row =
          valueObjectById.get(id);

        if (!row) {
          throw new Error(
            "CURATOR_E02_VALUE_OBJECT_RESOLUTION_FAILED",
          );
        }

        if (
          row.scope_code !==
            "global" ||
          row.origin_type_code !==
            "system_model" ||
          row.ontology_node_role_code !==
            "leaf" ||
          row.status !==
            "active"
        ) {
          throw new Error(
            `CURATOR_E02_TARGET_NOT_ACTIVE_SYSTEM_LEAF:${id}`,
          );
        }

        const localized =
          localizeGlobalSystemValueObject(
            row,
            locale,
          );

        const english =
          localizeGlobalSystemValueObject(
            row,
            "en",
          );

        return {
          id:
            row.id,

          canonicalKey:
            row.canonical_key,

          title:
            text(localized.title) ||
            text(english.title),

          titleEn:
            text(english.title),

          description:
            text(localized.description) ||
            text(english.description),

          descriptionEn:
            text(english.description),
        };
      },
    );

  const primaryParameterId =
    parameterDefinitionIds[0];

  const primaryValueObjectId =
    (
      mappingByParameter.get(
        primaryParameterId,
      ) ?? []
    )[0];

  const primary =
    targetValueObjects.find(
      (item) =>
        item.id ===
        primaryValueObjectId,
    ) ??
    targetValueObjects[0] ??
    null;

  return {
    ready: true,

    parameterDefinitionIds,

    mappings,

    parameters,

    targetValueObjects,

    suggestion:
      primary
        ? {
            title:
              primary.title,

            titleEn:
              primary.titleEn,

            description:
              primary.description,

            descriptionEn:
              primary.descriptionEn,
          }
        : null,
  };
}

async function readMaterialization(
  signalId: string,
): Promise<MaterializationState | null> {

  const {
    data,
    error,
  } = await supabase
    .from("activity_processing_logs")
    .select(
      "metadata_json,started_at,created_at",
    )
    .eq(
      "raw_signal_id",
      signalId,
    )
    .eq(
      "processor_name",
      PROCESSOR_NAME,
    )
    .eq(
      "processor_version",
      PROCESSOR_VERSION,
    )
    .contains(
      "metadata_json",
      {
        eventCode:
          MATERIALIZED_EVENT_CODE,
      },
    )
    .order(
      "started_at",
      { ascending: false },
    )
    .limit(1);

  if (error) {
    throw new Error(
      `CURATOR_E02_MATERIALIZATION_LOG_READ_FAILED:${error.message}`,
    );
  }

  const row =
    data?.[0];

  if (!row) {
    return null;
  }

  const metadata =
    asRecord(
      row.metadata_json,
    );

  const templateId =
    text(
      metadata.templateId,
    );

  const profileId =
    text(
      metadata.profileId,
    );

  const versionNo =
    Number(
      metadata.profileVersionNo,
    );

  if (
    !UUID_RE.test(templateId) ||
    !UUID_RE.test(profileId) ||
    !Number.isInteger(versionNo)
  ) {
    throw new Error(
      "CURATOR_E02_MATERIALIZATION_LOG_INVALID",
    );
  }

  return {
    templateId,
    profileId,
    versionNo,

    title:
      text(
        metadata.materializedTitle,
      ) || null,

    titleEn:
      text(
        metadata.materializedTitleEn,
      ) || null,

    fingerprint:
      text(
        metadata.materializationFingerprint,
      ) || null,

    materializedAt:
      row.started_at ||
      row.created_at ||
      null,
  };
}

async function appendMaterializationLog(
  input: {
    signal: EligibleSignal;
    guard:
      RequirePlatformAdminSuccess;

    locale:
      GlobalSystemValueObjectLocale;

    title: string;
    titleEn: string;

    result:
      CuratorSystemTypicalActivityMaterializationResult;

    draft:
      DraftState;
  },
) {

  const now =
    new Date().toISOString();

  const id =
    materializedLogId(
      input.signal.id,
      input.result.fingerprint,
    );

  const {
    error,
  } = await supabase
    .from(
      "activity_processing_logs",
    )
    .insert({
      id,

      user_id:
        input.signal.userId,

      raw_signal_id:
        input.signal.id,

      activity_event_id:
        input.signal.activityEventId,

      processor_name:
        PROCESSOR_NAME,

      processor_version:
        PROCESSOR_VERSION,

      processing_stage:
        "validate",

      processing_status:
        "completed",

      severity:
        "notice",

      message:
        "System typical activity and versioned profile materialized",

      input_json:
        {},

      output_json:
        {},

      error_json:
        {},

      metadata_json: {
        contract:
          CONTRACT,

        eventCode:
          MATERIALIZED_EVENT_CODE,

        checklistVersion:
          "2.0",

        checklistStepCode:
          "400.T",

        checklistStepNameSnapshotRu:
          "Материализовать системную типовую активность и её версионный профиль.",

        labelRu:
          "Системная типовая активность материализована",

        labelEn:
          "System typical activity materialized",

        actorKind:
          "curator",

        provenance:
          "curator_action",

        curatorAppUserId:
          input.guard.appUser.id,

        curatorAdminId:
          input.guard.platformAdmin.id,

        curatorRole:
          input.guard.platformAdmin.role,

        curatorNameSnapshot:
          input.guard.appUser.name,

        curatorEmailSnapshot:
          input.guard.appUser.email,

        materializationLocale:
          input.locale,

        materializedTitle:
          input.title,

        materializedTitleEn:
          input.titleEn,

        templateId:
          input.result.templateId,

        profileId:
          input.result.profileId,

        profileVersionNo:
          input.result.versionNo,

        routingContractCode:
          input.result.routingContractCode,

        templateScope:
          input.result.templateScope,

        materializationFingerprint:
          input.result.fingerprint,

        idempotentReplay:
          input.result.replayed,

        profileVersionCreated:
          input.result.profileVersionCreated,

        selectedParameterDefinitionIds:
          input.draft.parameterDefinitionIds,

        parameterCount:
          input.draft.parameterDefinitionIds.length,

        mappingPairs:
          input.draft.mappings,

        mappedLeafValueObjectIds:
          [
            ...new Set(
              input.draft.mappings.map(
                (mapping) =>
                  mapping.valueObjectId,
              ),
            ),
          ],

        resultSummaryRu:
          `Создана системная типовая активность «${input.title}» и опубликована версия профиля ${input.result.versionNo}.`,

        resultSummaryEn:
          `System typical activity “${input.titleEn}” and profile version ${input.result.versionNo} were published.`,
      },

      started_at:
        now,

      finished_at:
        now,

      duration_ms:
        0,
    });

  if (
    error &&
    error.code !==
      "23505"
  ) {
    throw new Error(
      `CURATOR_E02_MATERIALIZATION_LOG_APPEND_FAILED:${error.message}`,
    );
  }
}

async function buildResponse(
  signalId: string,
  locale:
    GlobalSystemValueObjectLocale,
) {
  const [
    draft,
    materialization,
  ] = await Promise.all([
    readDraftState(
      signalId,
      locale,
    ),

    readMaterialization(
      signalId,
    ),
  ]);

  return {
    ok: true,

    routeMarker:
      ROUTE_MARKER,

    contract:
      CONTRACT,

    ready:
      draft.ready,

    parameterDefinitionIds:
      draft.parameterDefinitionIds,

    mappings:
      draft.mappings,

    parameters:
      draft.parameters,

    targetValueObjects:
      draft.targetValueObjects,

    suggestion:
      draft.suggestion,

    materialization,
  };
}

export async function GET(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  const url =
    new URL(
      request.url,
    );

  const signalId =
    text(
      url.searchParams.get(
        "signalId",
      ),
    );

  const locale =
    normalizeGlobalSystemValueObjectLocale(
      url.searchParams.get(
        "locale",
      ),
    );

  if (!UUID_RE.test(signalId)) {
    return errorResponse(
      "CURATOR_E02_SIGNAL_ID_INVALID",
      "signalId is invalid",
      400,
    );
  }

  try {

    const signal =
      await readEligibleSignal(
        signalId,
      );

    await assertParameterCheckCompleted(
      signal.id,
    );

    return NextResponse.json(
      await buildResponse(
        signal.id,
        locale,
      ),
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const status =
      message.endsWith(
        "NOT_FOUND",
      )
        ? 404
        : message.includes(
              "REQUIRED",
            ) ||
            message.includes(
              "NOT_ELIGIBLE",
            )
          ? 409
          : 500;

    return errorResponse(
      "CURATOR_E02_GET_FAILED",
      message,
      status,
    );
  }
}

export async function POST(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  let body:
    WorkBody;

  try {

    body =
      await request.json()
        as WorkBody;

  } catch {

    return errorResponse(
      "CURATOR_E02_JSON_INVALID",
      "Invalid JSON body",
      400,
    );
  }

  const signalId =
    text(
      body.signalId,
    );

  const locale =
    normalizeGlobalSystemValueObjectLocale(
      body.locale,
    );

  const title =
    text(
      body.title,
    );

  const titleEn =
    text(
      body.titleEn,
    );

  const description =
    text(
      body.description,
    );

  const descriptionEn =
    text(
      body.descriptionEn,
    );

  if (!UUID_RE.test(signalId)) {
    return errorResponse(
      "CURATOR_E02_SIGNAL_ID_INVALID",
      "signalId is invalid",
      400,
    );
  }

  if (
    !title ||
    title.length > 180
  ) {
    return errorResponse(
      "CURATOR_E02_TITLE_INVALID",
      "title is required and must be 180 characters or fewer",
      400,
    );
  }

  if (
    !titleEn ||
    titleEn.length > 180
  ) {
    return errorResponse(
      "CURATOR_E02_TITLE_EN_INVALID",
      "titleEn is required and must be 180 characters or fewer",
      400,
    );
  }

  if (
    description.length > 4000 ||
    descriptionEn.length > 4000
  ) {
    return errorResponse(
      "CURATOR_E02_DESCRIPTION_TOO_LONG",
      "description must be 4000 characters or fewer",
      400,
    );
  }

  try {

    const signal =
      await readEligibleSignal(
        signalId,
      );

    await assertParameterCheckCompleted(
      signal.id,
    );

    const draft =
      await readDraftState(
        signal.id,
        locale,
      );

    if (!draft.ready) {
      return errorResponse(
        "CURATOR_E02_MAPPINGS_NOT_COMPLETE",
        "Every selected parameter must have a confirmed observation-object mapping before system activity materialization.",
        409,
      );
    }

    const {
      appUser,
      personActor,
      errorResponse:
        actorContextError,
    } =
      await getActivityUserContext();

    if (actorContextError) {
      return actorContextError;
    }

    if (
      !appUser ||
      !personActor
    ) {
      return errorResponse(
        "CURATOR_E02_ACTIVE_ACTOR_REQUIRED",
        "Active actor context not found",
        409,
      );
    }

    if (
      appUser.id !==
      guard.appUser.id
    ) {
      return errorResponse(
        "CURATOR_E02_ADMIN_ACTOR_CONTEXT_MISMATCH",
        "Current actor context does not belong to the active platform admin.",
        409,
      );
    }

    const result =
      await materializeCuratorSystemTypicalActivityV1({
        sourceSignalId:
          signal.id,

        curator: {
          curatorAppUserId:
            guard.appUser.id,

          curatorActorId:
            personActor.id,

          curatorAdminId:
            guard.platformAdmin.id,

          curatorRole:
            guard.platformAdmin.role,
        },

        locale,

        title,
        titleEn,

        description,
        descriptionEn,

        parameterDefinitionIds:
          draft.parameterDefinitionIds,

        mappings:
          draft.mappings,
      });

    await appendMaterializationLog({
      signal,
      guard,
      locale,
      title,
      titleEn,
      result,
      draft,
    });

    return NextResponse.json({
      ...(
        await buildResponse(
          signal.id,
          locale,
        )
      ),

      action:
        "materialize_system_typical_activity",

      result,
    });

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const conflict =
      message.includes(
        "REQUIRED",
      ) ||
      message.includes(
        "MISSING",
      ) ||
      message.includes(
        "CHANGED",
      ) ||
      message.includes(
        "NOT_ACTIVE",
      ) ||
      message.includes(
        "NOT_ELIGIBLE",
      ) ||
      message.includes(
        "MISMATCH",
      );

    const migrationRequired =
      message.includes(
        "MIGRATION_REQUIRED",
      );

    return errorResponse(
      migrationRequired
        ? "CURATOR_E02_MIGRATION_REQUIRED"
        : "CURATOR_E02_POST_FAILED",

      message,

      migrationRequired
        ? 503
        : conflict
          ? 409
          : 500,
    );
  }
}