import { supabase } from "../../../lib/supabase";

import type {
  CalculationModelScope,
  CalculationModelVersionStatus,
} from "./calculation-model-catalog.contract";

type CalculationModelSeriesRow = {
  id: string;
  model_code: string;
  scope_code: CalculationModelScope;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  organization_id: string | null;
  title: string;
  description: string | null;
  category_code: string;
  visibility_code:
    | "private"
    | "shared"
    | "public";
  status_code:
    | "active"
    | "inactive"
    | "archived";
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

type CalculationModelVersionRow = {
  id: string;
  model_series_id: string;
  version_no: number;
  expression_language_code: string;
  input_contract_json: unknown;
  expression_contract_json: unknown;
  output_contract_json: unknown;
  applicability_contract_json: unknown;
  evidence_contract_json: unknown;
  status_code: CalculationModelVersionStatus;
  supersedes_model_version_id: string | null;
  published_at: string | null;
  valid_from: string;
  valid_to: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export async function listCalculationModelCatalogV1(
  input: {
    scopeCode:
      | "system"
      | "user";

    ownerUserId?: string | null;
  },
) {
  let query =
    supabase
      .from(
        "calculation_model_series_v1",
      )
      .select(
        "id,model_code,scope_code,owner_user_id,owner_actor_id,organization_id,title,description,category_code,visibility_code,status_code,metadata_json,created_at,updated_at",
      )
      .eq(
        "scope_code",
        input.scopeCode,
      )
      .neq(
        "status_code",
        "archived",
      )
      .order(
        "updated_at",
        {
          ascending: false,
        },
      )
      .limit(1000);

  if (
    input.scopeCode === "system"
  ) {
    query =
      query
        .is(
          "owner_user_id",
          null,
        )
        .is(
          "owner_actor_id",
          null,
        )
        .is(
          "organization_id",
          null,
        );
  }
  else if (
    input.scopeCode === "user"
  ) {
    const ownerUserId =
      input.ownerUserId?.trim();

    if (!ownerUserId) {
      return [];
    }

    query =
      query.eq(
        "owner_user_id",
        ownerUserId,
      );
  }
  else {
    return [];
  }

  const {
    data: seriesData,
    error: seriesError,
  } =
    await query;

  if (seriesError) {
    throw new Error(
      `CALCULATION_MODEL_SERIES_LIST_FAILED:${seriesError.message}`,
    );
  }

  const seriesRows =
    (
      seriesData as unknown as
        | CalculationModelSeriesRow[]
        | null
    ) ??
    [];

  if (
    seriesRows.length === 0
  ) {
    return [];
  }

  const {
    data: versionData,
    error: versionError,
  } =
    await supabase
      .from(
        "calculation_model_versions_v1",
      )
      .select(
        "id,model_series_id,version_no,expression_language_code,input_contract_json,expression_contract_json,output_contract_json,applicability_contract_json,evidence_contract_json,status_code,supersedes_model_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
      )
      .in(
        "model_series_id",
        seriesRows.map(
          (row) =>
            row.id,
        ),
      )
      .order(
        "version_no",
        {
          ascending: false,
        },
      )
      .limit(5000);

  if (versionError) {
    throw new Error(
      `CALCULATION_MODEL_VERSION_LIST_FAILED:${versionError.message}`,
    );
  }

  const versions =
    (
      versionData as unknown as
        | CalculationModelVersionRow[]
        | null
    ) ??
    [];

  const bySeries =
    new Map<
      string,
      CalculationModelVersionRow[]
    >();

  for (
    const version of versions
  ) {
    const bucket =
      bySeries.get(
        version.model_series_id,
      ) ??
      [];

    bucket.push(version);

    bySeries.set(
      version.model_series_id,
      bucket,
    );
  }

  return seriesRows.map(
    (series) => ({
      ...series,

      versions:
        bySeries.get(
          series.id,
        ) ??
        [],
    }),
  );
}