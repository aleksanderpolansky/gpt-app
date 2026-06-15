import type {
  ActivityFactsSaveGateDecision,
  ActivityFactsSaveGateRouteMode,
  ActivityFactsSaveGateValueObjectDecision,
} from "@/types/activity-facts-save-gate";

export type ActivityFactsSaveGateValidationSeverity = "error" | "warning";

export type ActivityFactsSaveGateValidationIssue = {
  code: string;
  fieldPath: string;
  severity: ActivityFactsSaveGateValidationSeverity;
  messageRu: string;
};

export type ActivityFactsSaveGateRequestSummary = {
  sourcePackageId: string | null;
  idempotencyKey: string | null;
  routeMode: ActivityFactsSaveGateRouteMode | null;
  factDecisionCount: number;
  editedFactDecisionCount: number;
  valueObjectCandidateDecisionCount: number;
  writeIntentDetected: boolean;
  writeIntentReasons: string[];
  validationErrorCount: number;
  validationWarningCount: number;
};

export type ActivityFactsSaveGateValidationResult = {
  ok: boolean;
  requestRecord: Record<string, unknown>;
  summary: ActivityFactsSaveGateRequestSummary;
  errors: ActivityFactsSaveGateValidationIssue[];
  warnings: ActivityFactsSaveGateValidationIssue[];
};

const ALLOWED_ROUTE_MODES = new Set<string>([
  "contract_preview_only",
  "future_server_mediated_write",
]);

const ALLOWED_FACT_DECISIONS = new Set<string>([
  "accept",
  "reject",
  "edit",
  "defer",
]);

const ALLOWED_VALUE_OBJECT_DECISIONS = new Set<string>([
  "use_existing",
  "create_new",
  "skip",
  "defer",
]);

const SAFE_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,240}$/;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pushIssue(
  target: ActivityFactsSaveGateValidationIssue[],
  issue: ActivityFactsSaveGateValidationIssue
) {
  target.push(issue);
}

function validateRequiredSafeId(params: {
  value: unknown;
  fieldPath: string;
  labelRu: string;
  errors: ActivityFactsSaveGateValidationIssue[];
}): string | null {
  const value = asString(params.value);

  if (!value) {
    pushIssue(params.errors, {
      code: "REQUIRED_STRING_MISSING",
      fieldPath: params.fieldPath,
      severity: "error",
      messageRu: `${params.labelRu}: обязательная строка отсутствует.`,
    });

    return null;
  }

  if (!SAFE_ID_PATTERN.test(value)) {
    pushIssue(params.errors, {
      code: "UNSAFE_ID_FORMAT",
      fieldPath: params.fieldPath,
      severity: "error",
      messageRu:
        `${params.labelRu}: строка должна быть безопасным техническим ключом ` +
        "из букв, цифр, точки, подчёркивания, дефиса или двоеточия.",
    });

    return value;
  }

  return value;
}

function validateRouteMode(
  value: unknown,
  errors: ActivityFactsSaveGateValidationIssue[]
): ActivityFactsSaveGateRouteMode | null {
  const routeMode = asString(value);

  if (!routeMode) {
    pushIssue(errors, {
      code: "ROUTE_MODE_REQUIRED",
      fieldPath: "routeMode",
      severity: "error",
      messageRu: "routeMode обязателен.",
    });

    return null;
  }

  if (!ALLOWED_ROUTE_MODES.has(routeMode)) {
    pushIssue(errors, {
      code: "ROUTE_MODE_UNSUPPORTED",
      fieldPath: "routeMode",
      severity: "error",
      messageRu:
        "routeMode должен быть contract_preview_only или future_server_mediated_write.",
    });

    return null;
  }

  return routeMode as ActivityFactsSaveGateRouteMode;
}

function validateClientSafetyConfirmation(params: {
  body: Record<string, unknown>;
  errors: ActivityFactsSaveGateValidationIssue[];
  warnings: ActivityFactsSaveGateValidationIssue[];
}) {
  const safety = asRecord(params.body.clientSafetyConfirmation);

  const requiredBooleanFields = [
    "userReviewedPreview",
    "userConfirmedMissingValueObjectCreation",
    "userConfirmedFactWrite",
    "userUnderstandsPreviewIsNotDiagnosis",
  ];

  for (const field of requiredBooleanFields) {
    if (asBoolean(safety[field]) === null) {
      pushIssue(params.errors, {
        code: "CLIENT_SAFETY_BOOLEAN_REQUIRED",
        fieldPath: `clientSafetyConfirmation.${field}`,
        severity: "error",
        messageRu: `clientSafetyConfirmation.${field} должен быть boolean.`,
      });
    }
  }

  if (asBoolean(safety.userReviewedPreview) === false) {
    pushIssue(params.warnings, {
      code: "USER_REVIEW_NOT_CONFIRMED",
      fieldPath: "clientSafetyConfirmation.userReviewedPreview",
      severity: "warning",
      messageRu:
        "Пользовательский просмотр preview не подтверждён. Для будущей записи это должно блокировать save.",
    });
  }

  if (asBoolean(safety.userUnderstandsPreviewIsNotDiagnosis) === false) {
    pushIssue(params.warnings, {
      code: "NON_DIAGNOSIS_ACK_NOT_CONFIRMED",
      fieldPath:
        "clientSafetyConfirmation.userUnderstandsPreviewIsNotDiagnosis",
      severity: "warning",
      messageRu:
        "Пользователь не подтвердил, что preview не является медицинским диагнозом.",
    });
  }
}

function validateFactDecisions(params: {
  body: Record<string, unknown>;
  errors: ActivityFactsSaveGateValidationIssue[];
}) {
  const factDecisions = asArray(params.body.factDecisions);

  for (const [index, rawDecision] of factDecisions.entries()) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);
    const decisionValue = asString(decision.decision);

    if (!factLocalId) {
      pushIssue(params.errors, {
        code: "FACT_LOCAL_ID_REQUIRED",
        fieldPath: `factDecisions.${index}.factLocalId`,
        severity: "error",
        messageRu: "factLocalId обязателен для каждого решения по факту.",
      });
    }

    if (!decisionValue || !ALLOWED_FACT_DECISIONS.has(decisionValue)) {
      pushIssue(params.errors, {
        code: "FACT_DECISION_UNSUPPORTED",
        fieldPath: `factDecisions.${index}.decision`,
        severity: "error",
        messageRu: "decision должен быть accept, reject, edit или defer.",
      });
    }
  }
}

function validateEditedFactDecisions(params: {
  body: Record<string, unknown>;
  errors: ActivityFactsSaveGateValidationIssue[];
}) {
  const editedFactDecisions = asArray(params.body.editedFactDecisions);

  for (const [index, rawDecision] of editedFactDecisions.entries()) {
    const decision = asRecord(rawDecision);
    const factLocalId = asString(decision.factLocalId);
    const decisionValue = asString(decision.decision);
    const editedFact = asRecord(decision.editedFact);

    if (!factLocalId) {
      pushIssue(params.errors, {
        code: "EDITED_FACT_LOCAL_ID_REQUIRED",
        fieldPath: `editedFactDecisions.${index}.factLocalId`,
        severity: "error",
        messageRu: "factLocalId обязателен для каждого editedFactDecision.",
      });
    }

    if (decisionValue !== "edit") {
      pushIssue(params.errors, {
        code: "EDITED_FACT_DECISION_MUST_BE_EDIT",
        fieldPath: `editedFactDecisions.${index}.decision`,
        severity: "error",
        messageRu: "editedFactDecision.decision должен быть edit.",
      });
    }

    if (Object.keys(editedFact).length === 0) {
      pushIssue(params.errors, {
        code: "EDITED_FACT_PATCH_REQUIRED",
        fieldPath: `editedFactDecisions.${index}.editedFact`,
        severity: "error",
        messageRu: "editedFact обязателен для решения edit.",
      });
    }
  }
}

function validateValueObjectCandidateDecisions(params: {
  body: Record<string, unknown>;
  errors: ActivityFactsSaveGateValidationIssue[];
}) {
  const candidateDecisions = asArray(params.body.valueObjectCandidateDecisions);

  for (const [index, rawDecision] of candidateDecisions.entries()) {
    const decision = asRecord(rawDecision);
    const semanticObjectKey = asString(decision.semanticObjectKey);
    const proposedTitleRu = asString(decision.proposedTitleRu);
    const decisionValue = asString(decision.decision);

    if (!semanticObjectKey) {
      pushIssue(params.errors, {
        code: "SEMANTIC_OBJECT_KEY_REQUIRED",
        fieldPath: `valueObjectCandidateDecisions.${index}.semanticObjectKey`,
        severity: "error",
        messageRu:
          "semanticObjectKey обязателен для каждого решения по кандидату Value Object.",
      });
    }

    if (!proposedTitleRu) {
      pushIssue(params.errors, {
        code: "PROPOSED_TITLE_REQUIRED",
        fieldPath: `valueObjectCandidateDecisions.${index}.proposedTitleRu`,
        severity: "error",
        messageRu:
          "proposedTitleRu обязателен для каждого решения по кандидату Value Object.",
      });
    }

    if (
      !decisionValue ||
      !ALLOWED_VALUE_OBJECT_DECISIONS.has(decisionValue)
    ) {
      pushIssue(params.errors, {
        code: "VALUE_OBJECT_CANDIDATE_DECISION_UNSUPPORTED",
        fieldPath: `valueObjectCandidateDecisions.${index}.decision`,
        severity: "error",
        messageRu:
          "decision должен быть use_existing, create_new, skip или defer.",
      });
    }
  }
}

function detectWriteIntent(body: Record<string, unknown>): {
  writeIntentDetected: boolean;
  writeIntentReasons: string[];
} {
  const reasons: string[] = [];
  const routeMode = asString(body.routeMode);
  const safety = asRecord(body.clientSafetyConfirmation);
  const candidateDecisions = asArray(body.valueObjectCandidateDecisions);

  if (routeMode === "future_server_mediated_write") {
    reasons.push("routeMode=future_server_mediated_write");
  }

  if (asBoolean(safety.userConfirmedFactWrite) === true) {
    reasons.push("clientSafetyConfirmation.userConfirmedFactWrite=true");
  }

  if (asBoolean(safety.userConfirmedMissingValueObjectCreation) === true) {
    reasons.push(
      "clientSafetyConfirmation.userConfirmedMissingValueObjectCreation=true"
    );
  }

  for (const [index, rawDecision] of candidateDecisions.entries()) {
    const decision = asRecord(rawDecision);
    const decisionValue = asString(decision.decision);

    if (decisionValue === "create_new") {
      reasons.push(
        `valueObjectCandidateDecisions.${index}.decision=create_new`
      );
    }
  }

  return {
    writeIntentDetected: reasons.length > 0,
    writeIntentReasons: reasons,
  };
}

export function validateActivityFactsSaveGateRequest(
  body: unknown
): ActivityFactsSaveGateValidationResult {
  const requestRecord = asRecord(body);
  const errors: ActivityFactsSaveGateValidationIssue[] = [];
  const warnings: ActivityFactsSaveGateValidationIssue[] = [];

  const routeMode = validateRouteMode(requestRecord.routeMode, errors);

  const sourcePackageId = validateRequiredSafeId({
    value: requestRecord.sourcePackageId,
    fieldPath: "sourcePackageId",
    labelRu: "sourcePackageId",
    errors,
  });

  const idempotencyKey = validateRequiredSafeId({
    value: requestRecord.idempotencyKey,
    fieldPath: "idempotencyKey",
    labelRu: "idempotencyKey",
    errors,
  });

  if (!Array.isArray(requestRecord.factDecisions)) {
    pushIssue(errors, {
      code: "FACT_DECISIONS_ARRAY_REQUIRED",
      fieldPath: "factDecisions",
      severity: "error",
      messageRu: "factDecisions должен быть массивом.",
    });
  }

  if (!Array.isArray(requestRecord.editedFactDecisions)) {
    pushIssue(errors, {
      code: "EDITED_FACT_DECISIONS_ARRAY_REQUIRED",
      fieldPath: "editedFactDecisions",
      severity: "error",
      messageRu: "editedFactDecisions должен быть массивом.",
    });
  }

  if (!Array.isArray(requestRecord.valueObjectCandidateDecisions)) {
    pushIssue(errors, {
      code: "VALUE_OBJECT_CANDIDATE_DECISIONS_ARRAY_REQUIRED",
      fieldPath: "valueObjectCandidateDecisions",
      severity: "error",
      messageRu: "valueObjectCandidateDecisions должен быть массивом.",
    });
  }

  validateClientSafetyConfirmation({
    body: requestRecord,
    errors,
    warnings,
  });

  validateFactDecisions({
    body: requestRecord,
    errors,
  });

  validateEditedFactDecisions({
    body: requestRecord,
    errors,
  });

  validateValueObjectCandidateDecisions({
    body: requestRecord,
    errors,
  });

  const writeIntent = detectWriteIntent(requestRecord);

  const summary: ActivityFactsSaveGateRequestSummary = {
    sourcePackageId,
    idempotencyKey,
    routeMode,
    factDecisionCount: asArray(requestRecord.factDecisions).length,
    editedFactDecisionCount: asArray(requestRecord.editedFactDecisions).length,
    valueObjectCandidateDecisionCount: asArray(
      requestRecord.valueObjectCandidateDecisions
    ).length,
    writeIntentDetected: writeIntent.writeIntentDetected,
    writeIntentReasons: writeIntent.writeIntentReasons,
    validationErrorCount: errors.length,
    validationWarningCount: warnings.length,
  };

  return {
    ok: errors.length === 0,
    requestRecord,
    summary,
    errors,
    warnings,
  };
}

export function isActivityFactsSaveGateDecision(
  value: unknown
): value is ActivityFactsSaveGateDecision {
  const decision = asString(value);

  return Boolean(decision && ALLOWED_FACT_DECISIONS.has(decision));
}

export function isActivityFactsSaveGateValueObjectDecision(
  value: unknown
): value is ActivityFactsSaveGateValueObjectDecision {
  const decision = asString(value);

  return Boolean(decision && ALLOWED_VALUE_OBJECT_DECISIONS.has(decision));
}
