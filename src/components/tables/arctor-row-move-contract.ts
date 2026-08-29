import {
  createArctorTableRowOperationId,
  type ArctorTableRowHistoryPolicy,
} from "./arctor-row-create-contract";

export type ArctorTableRowMoveSource =
  | "toolbar"
  | "keyboard"
  | "drag"
  | "api";

export type ArctorTableRowMovePlacement =
  | { readonly kind: "child"; readonly parentRowKey: string }
  | { readonly kind: "before"; readonly anchorRowKey: string }
  | { readonly kind: "after"; readonly anchorRowKey: string }
  | { readonly kind: "append" };

export type ArctorTableRowMoveRequest = {
  readonly operationId: string;
  readonly source: ArctorTableRowMoveSource;
  readonly rowKey: string;
  readonly placement: ArctorTableRowMovePlacement;
  readonly historyPolicy: ArctorTableRowHistoryPolicy;
};

function normalizeRowKey(value: string, errorCode: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(errorCode);
  }
  return normalized;
}

export function createArctorTableRowMoveOperationId(
  namespace = "arctor-row-move",
): string {
  return createArctorTableRowOperationId(namespace);
}

export function createArctorTableRowMoveRequest(input: {
  operationId?: string;
  source: ArctorTableRowMoveSource;
  rowKey: string;
  placement: ArctorTableRowMovePlacement;
  historyPolicy: ArctorTableRowHistoryPolicy;
  namespace?: string;
}): ArctorTableRowMoveRequest {
  const rowKey = normalizeRowKey(input.rowKey, "ROW_MOVE_KEY_REQUIRED");
  const operationId = input.operationId?.trim() ||
    createArctorTableRowMoveOperationId(input.namespace);

  let placement: ArctorTableRowMovePlacement;
  if (input.placement.kind === "child") {
    const parentRowKey = normalizeRowKey(
      input.placement.parentRowKey,
      "ROW_MOVE_PARENT_KEY_REQUIRED",
    );
    if (parentRowKey === rowKey) {
      throw new Error("ROW_MOVE_SELF_PARENT_FORBIDDEN");
    }
    placement = { kind: "child", parentRowKey };
  } else if (input.placement.kind === "before" || input.placement.kind === "after") {
    const anchorRowKey = normalizeRowKey(
      input.placement.anchorRowKey,
      "ROW_MOVE_ANCHOR_KEY_REQUIRED",
    );
    if (anchorRowKey === rowKey) {
      throw new Error("ROW_MOVE_SELF_ANCHOR_FORBIDDEN");
    }
    placement = { kind: input.placement.kind, anchorRowKey };
  } else {
    placement = { kind: "append" };
  }

  return {
    operationId,
    source: input.source,
    rowKey,
    placement,
    historyPolicy: input.historyPolicy,
  };
}
