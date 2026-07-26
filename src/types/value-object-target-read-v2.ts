export type P72B1ValueObjectRead = {
  id: string;
  title: string;
  nodeRoleCode: string;
  objectKind: string;
  branchTypeCode: string | null;
  rootValueObjectId: string;
  parentValueObjectId: string | null;
};

export type P72B1ParameterDefinitionRead = {
  id: string;
  scopeCode: "system" | "actor";
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: "numeric" | "text" | "boolean" | "timestamp";
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  status: "active" | "retired";
};

export type P72B1TargetVersionRead = {
  id: string;
  targetSeriesId: string;
  version: number;
  statusCode: "draft" | "active" | "superseded" | "archived";
  targetKindCode: string;
  normalizationPolicyCode: string | null;

  originalValueNumeric: number | null;
  originalMinNumeric: number | null;
  originalMaxNumeric: number | null;
  originalValueBoolean: boolean | null;
  originalValueText: string | null;
  originalUnitCode: string | null;

  canonicalValueNumeric: number | null;
  canonicalMinNumeric: number | null;
  canonicalMaxNumeric: number | null;
  canonicalValueBoolean: boolean | null;
  canonicalValueText: string | null;
  canonicalUnitCode: string | null;

  periodCount: number | null;
  periodUnitCode: string | null;
  periodDaysNumeric: number | null;

  dailyEquivalentNumeric: number | null;
  dailyEquivalentUnitCode: string | null;
  normalizationStateCode:
    | "derived"
    | "not_applicable"
    | "formula_required";
  normalizationFormulaVersion: string | null;

  priorityCode: string;
  sourceTypeCode: string;
  label: string | null;
  description: string | null;
  safetyNote: string | null;

  supersedesTargetVersionId: string | null;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

export type P72B1ParameterAssignmentRead = {
  id: string;
  status: "active" | "inactive" | "retired";
  displayOrder: number;
  validFrom: string;
  validTo: string | null;
  parameter: P72B1ParameterDefinitionRead;
  currentTarget: P72B1TargetVersionRead | null;
  targetHistory: P72B1TargetVersionRead[];
};

export type P72B1ValueObjectTargetReadSuccess = {
  ok: true;
  routeMarker: "p7-2b1-real-target-read-route-v1";
  readMode: "p7_2b1_real_read_only";
  valueObject: P72B1ValueObjectRead;
  assignments: P72B1ParameterAssignmentRead[];
  counts: {
    assignments: number;
    activeAssignments: number;
    targetSeries: number;
    targetVersions: number;
  };
  sideEffects: {
    dbReadExecuted: true;
    dbWriteExecuted: false;
    rowsActuallyWritten: 0;
  };
  safety: {
    serverMediatedOnly: true;
    directBrowserSupabaseReadAllowed: false;
    clientProvidedOwnershipTrusted: false;
    writeActionsEnabled: true;
  };
};

export type P72B1ValueObjectTargetReadError = {
  ok: false;
  routeMarker: "p7-2b1-real-target-read-route-v1";
  readMode: "p7_2b1_real_read_only";
  errorCode: string;
  errorMessage: string;
  sideEffects: {
    dbReadExecuted: boolean;
    dbWriteExecuted: false;
    rowsActuallyWritten: 0;
  };
};

export type P72B1ValueObjectTargetReadResponse =
  | P72B1ValueObjectTargetReadSuccess
  | P72B1ValueObjectTargetReadError;
