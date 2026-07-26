export type P72B3TargetKindCode =
  | "amount_per_period"
  | "count_per_period"
  | "point_value"
  | "range"
  | "threshold_min"
  | "threshold_max"
  | "boolean_condition"
  | "qualitative_criterion";

export type P72B3NormalizationPolicyCode =
  | "linear_rate"
  | "cadence_rate"
  | "no_daily_division"
  | "custom_formula";

export type P72B3PeriodUnitCode =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "rolling_7_days"
  | "rolling_30_days";

export type P72B3PriorityCode = "low" | "normal" | "high" | "critical";

export type P72B3TargetCreateVersionRequest = {
  mode: "create_series" | "new_version";
  targetSeriesId?: string | null;
  targetKindCode: P72B3TargetKindCode;
  normalizationPolicyCode?: P72B3NormalizationPolicyCode | null;
  originalValueNumeric?: number | null;
  originalMinNumeric?: number | null;
  originalMaxNumeric?: number | null;
  originalValueBoolean?: boolean | null;
  originalValueText?: string | null;
  originalUnitCode?: string | null;
  periodCount?: number | null;
  periodUnitCode?: P72B3PeriodUnitCode | null;
  priorityCode?: P72B3PriorityCode;
  label?: string | null;
  description?: string | null;
  safetyNote?: string | null;
  idempotencyKey: string;
};

export type P72B3TargetArchiveRequest = {
  mode: "archive";
  idempotencyKey: string;
};

export type P72B3TargetWriteResult = {
  targetSeriesId: string;
  targetVersionId: string;
  version: number;
  statusCode: "draft" | "active" | "superseded" | "archived";
  normalizationStateCode:
    | "derived"
    | "not_applicable"
    | "formula_required";
  dailyEquivalentNumeric: number | null;
  idempotentReplay: boolean;
  rowsActuallyWritten: number;
};

export type P72B3TargetWriteSuccess = {
  ok: true;
  routeMarker: "p7-2b3-target-write-route-v1";
  writeMode: "p7_2b3_target_write";
  result: P72B3TargetWriteResult;
  sideEffects: {
    dbReadExecuted: true;
    dbWriteExecuted: true;
    rowsActuallyWritten: number;
  };
};

export type P72B3TargetWriteError = {
  ok: false;
  routeMarker: "p7-2b3-target-write-route-v1";
  writeMode: "p7_2b3_target_write";
  errorCode: string;
  errorMessage: string;
  sideEffects: {
    dbReadExecuted: boolean;
    dbWriteExecuted: boolean;
    rowsActuallyWritten: 0;
  };
};

export type P72B3TargetWriteResponse =
  | P72B3TargetWriteSuccess
  | P72B3TargetWriteError;
