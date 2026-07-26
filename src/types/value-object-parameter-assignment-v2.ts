import type {
  P72B1ParameterDefinitionRead,
} from "@/types/value-object-target-read-v2";

export type P72B2AssignmentState = {
  id: string;
  status: "active" | "inactive" | "retired";
  displayOrder: number;
  validFrom: string;
  validTo: string | null;
};

export type P72B2CatalogParameter = P72B1ParameterDefinitionRead & {
  assignment: P72B2AssignmentState | null;
  availableForAssignment: boolean;
};

export type P72B2ParameterCatalogSuccess = {
  ok: true;
  routeMarker: "p7-2b2-parameter-catalog-route-v1";
  readMode: "p7_2b2_parameter_catalog";
  valueObject: {
    id: string;
    title: string;
    nodeRoleCode: "activity_leaf";
  };
  systemParameters: P72B2CatalogParameter[];
  actorParameters: P72B2CatalogParameter[];
  counts: {
    systemParameters: number;
    actorParameters: number;
    activeAssignments: number;
    inactiveAssignments: number;
  };
  sideEffects: {
    dbReadExecuted: true;
    dbWriteExecuted: false;
    rowsActuallyWritten: 0;
  };
};

export type P72B2ParameterCatalogError = {
  ok: false;
  routeMarker: "p7-2b2-parameter-catalog-route-v1";
  readMode: "p7_2b2_parameter_catalog";
  errorCode: string;
  errorMessage: string;
  sideEffects: {
    dbReadExecuted: boolean;
    dbWriteExecuted: false;
    rowsActuallyWritten: 0;
  };
};

export type P72B2ParameterCatalogResponse =
  | P72B2ParameterCatalogSuccess
  | P72B2ParameterCatalogError;

export type P72B2AssignExistingRequest = {
  mode: "assign_existing";
  parameterDefinitionId: string;
  displayOrder?: number;
  idempotencyKey: string;
};

export type P72B2CustomDefinitionInput = {
  title: string;
  description?: string | null;
  dimensionCode: string;
  valueTypeCode: "numeric" | "text" | "boolean" | "timestamp";
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative?: boolean;
};

export type P72B2CreateCustomAndAssignRequest = {
  mode: "create_custom_and_assign";
  definition: P72B2CustomDefinitionInput;
  displayOrder?: number;
  idempotencyKey: string;
};

export type P72B2AssignmentCreateRequest =
  | P72B2AssignExistingRequest
  | P72B2CreateCustomAndAssignRequest;

export type P72B2AssignmentStateRequest = {
  mode: "deactivate" | "reactivate";
  idempotencyKey: string;
};

export type P72B2WriteResult = {
  idempotentReplay: boolean;
  stateAlreadySatisfied: boolean;
  mode:
    | "assign_existing"
    | "create_custom_and_assign"
    | "deactivate"
    | "reactivate";
  definitionId: string;
  parameterCode: string;
  assignmentId: string;
  assignmentStatus: "active" | "inactive" | "retired";
  rowsActuallyWritten: number;
};

export type P72B2WriteSuccess = {
  ok: true;
  routeMarker: "p7-2b2-parameter-assignment-route-v1";
  writeMode: "p7_2b2_parameter_assignment";
  result: P72B2WriteResult;
  sideEffects: {
    dbReadExecuted: true;
    dbWriteExecuted: true;
    rowsActuallyWritten: number;
  };
};

export type P72B2WriteError = {
  ok: false;
  routeMarker: "p7-2b2-parameter-assignment-route-v1";
  writeMode: "p7_2b2_parameter_assignment";
  errorCode: string;
  errorMessage: string;
  sideEffects: {
    dbReadExecuted: boolean;
    dbWriteExecuted: boolean;
    rowsActuallyWritten: 0;
  };
};

export type P72B2WriteResponse = P72B2WriteSuccess | P72B2WriteError;
