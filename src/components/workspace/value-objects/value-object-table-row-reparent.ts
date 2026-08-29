import {
  createArctorTableRowMoveOperationId,
  createArctorTableRowMoveRequest,
} from "@/components/tables/arctor-row-move-contract";
import {
  applyValueObjectReparent,
  previewValueObjectReparent,
  ValueObjectReparentClientError,
} from "./value-object-reparent-client";
import type {
  ValueObjectTreeRestructureApplyResult,
  ValueObjectTreeRestructurePreview,
} from "@/types/value-object-tree-restructure";

import {
  canUseObservationObjectTableParent,
  type ValueObjectTableCreateCandidate,
  type ValueObjectTableCreateRole,
} from "./value-object-table-row-create";

type ValueObjectSemanticRole = "root" | "intermediate" | "leaf";

export type ValueObjectTableReparentDraft = {
  operationId: string;
  sourceId: string;
  sourceRole: Exclude<ValueObjectSemanticRole, "root">;
  oldParentId: string | null;
  newParentId: string;
};

export type ValueObjectTableReparentPreview = ValueObjectTreeRestructurePreview;
export type ValueObjectTableReparentApplyResult = ValueObjectTreeRestructureApplyResult;

export class ValueObjectTableReparentError extends Error {
  readonly errorCode: string | null;

  constructor(message: string, errorCode: string | null = null) {
    super(message);
    this.name = "ValueObjectTableReparentError";
    this.errorCode = errorCode;
  }
}

function semanticRole(
  valueObject: ValueObjectTableCreateCandidate,
): ValueObjectSemanticRole {
  if (
    valueObject.ontology_node_role_code === "root" ||
    valueObject.ontology_node_role_code === "intermediate" ||
    valueObject.ontology_node_role_code === "leaf"
  ) {
    return valueObject.ontology_node_role_code;
  }

  if (
    valueObject.id &&
    valueObject.parent_value_object_id === null &&
    valueObject.root_value_object_id === valueObject.id
  ) {
    return "root";
  }

  if (valueObject.node_role_code === "activity_leaf") {
    return "leaf";
  }

  return "intermediate";
}

export function canReparentObservationObjectFromTable(
  valueObject: ValueObjectTableCreateCandidate | null | undefined,
): valueObject is ValueObjectTableCreateCandidate & { id: string } {
  if (!valueObject?.id) {
    return false;
  }

  const role = semanticRole(valueObject);
  return Boolean(
    (role === "intermediate" || role === "leaf") &&
      valueObject.scope_code === "actor" &&
      (valueObject.status === "draft" || valueObject.status === "active") &&
      valueObject.canonical_key?.trim() &&
      valueObject.branch_type_code?.trim() &&
      valueObject.root_value_object_id?.trim(),
  );
}

export function canUseObservationObjectTableReparentParent(
  source: ValueObjectTableCreateCandidate | null | undefined,
  parent: ValueObjectTableCreateCandidate | null | undefined,
): parent is ValueObjectTableCreateCandidate & { id: string } {
  if (!canReparentObservationObjectFromTable(source) || !parent?.id) {
    return false;
  }
  if (source.id === parent.id || source.parent_value_object_id === parent.id) {
    return false;
  }

  const sourceRole = semanticRole(source);
  const parentRole: ValueObjectTableCreateRole =
    sourceRole === "leaf" ? "leaf" : "intermediate";

  return Boolean(
    canUseObservationObjectTableParent(parent, parentRole) &&
      source.branch_type_code &&
      parent.branch_type_code === source.branch_type_code,
  );
}

export function createValueObjectTableReparentDraft(
  source: ValueObjectTableCreateCandidate | null | undefined,
): ValueObjectTableReparentDraft | null {
  if (!canReparentObservationObjectFromTable(source)) {
    return null;
  }

  const role = semanticRole(source);
  if (role === "root") {
    return null;
  }

  return {
    operationId: createArctorTableRowMoveOperationId("vo-table-reparent"),
    sourceId: source.id,
    sourceRole: role,
    oldParentId: source.parent_value_object_id ?? null,
    newParentId: "",
  };
}

function normalizeMove(input: {
  draft: ValueObjectTableReparentDraft;
  source: ValueObjectTableCreateCandidate | null | undefined;
  parent: ValueObjectTableCreateCandidate | null | undefined;
}) {
  if (!canReparentObservationObjectFromTable(input.source)) {
    throw new ValueObjectTableReparentError("ROW_MOVE_SOURCE_INVALID");
  }
  if (input.source.id !== input.draft.sourceId) {
    throw new ValueObjectTableReparentError("ROW_MOVE_SOURCE_CHANGED");
  }
  if (!canUseObservationObjectTableReparentParent(input.source, input.parent)) {
    throw new ValueObjectTableReparentError("ROW_MOVE_PARENT_INVALID");
  }
  if (input.parent.id !== input.draft.newParentId) {
    throw new ValueObjectTableReparentError("ROW_MOVE_PARENT_CHANGED");
  }

  return createArctorTableRowMoveRequest({
    operationId: input.draft.operationId,
    source: "toolbar",
    rowKey: input.source.id,
    placement: { kind: "child", parentRowKey: input.parent.id },
    historyPolicy: "domain_managed",
  });
}

function translateClientError(error: unknown): never {
  if (error instanceof ValueObjectReparentClientError) {
    throw new ValueObjectTableReparentError(error.message, error.errorCode);
  }
  throw error;
}

export async function previewObservationObjectTableReparent(input: {
  draft: ValueObjectTableReparentDraft;
  source: ValueObjectTableCreateCandidate | null | undefined;
  parent: ValueObjectTableCreateCandidate | null | undefined;
}): Promise<ValueObjectTableReparentPreview> {
  const request = normalizeMove(input);
  if (request.placement.kind !== "child") {
    throw new ValueObjectTableReparentError("ROW_MOVE_PLACEMENT_INVALID");
  }

  try {
    return await previewValueObjectReparent({
      sourceId: request.rowKey,
      newParentId: request.placement.parentRowKey,
    });
  } catch (error) {
    translateClientError(error);
  }
}

export async function applyObservationObjectTableReparent(input: {
  draft: ValueObjectTableReparentDraft;
  preview: ValueObjectTableReparentPreview;
  source: ValueObjectTableCreateCandidate | null | undefined;
  parent: ValueObjectTableCreateCandidate | null | undefined;
}): Promise<ValueObjectTableReparentApplyResult> {
  const request = normalizeMove(input);
  if (request.placement.kind !== "child") {
    throw new ValueObjectTableReparentError("ROW_MOVE_PLACEMENT_INVALID");
  }
  if (
    input.preview.mode !== "reparent" ||
    input.preview.target.id !== request.rowKey ||
    input.preview.destinationParent?.id !== request.placement.parentRowKey
  ) {
    throw new ValueObjectTableReparentError("ROW_MOVE_PREVIEW_STALE");
  }

  try {
    return await applyValueObjectReparent({
      sourceId: request.rowKey,
      newParentId: request.placement.parentRowKey,
      preview: input.preview,
      idempotencyKey: request.operationId,
    });
  } catch (error) {
    translateClientError(error);
  }
}
