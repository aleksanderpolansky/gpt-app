import {
  createArctorTableRowOperationId,
  type ArctorTableRowHistoryPolicy,
} from "./arctor-row-create-contract";

export type ArctorTableRowDeleteSource = "toolbar" | "keyboard" | "api";

export type ArctorTableRowDeleteRequest = {
  readonly operationId: string;
  readonly source: ArctorTableRowDeleteSource;
  readonly rowKey: string;
  readonly historyPolicy: ArctorTableRowHistoryPolicy;
};

export function createArctorTableRowDeleteRequest(input: {
  source: ArctorTableRowDeleteSource;
  rowKey: string;
  historyPolicy: ArctorTableRowHistoryPolicy;
  namespace?: string;
}): ArctorTableRowDeleteRequest {
  const rowKey = input.rowKey.trim();
  if (!rowKey) {
    throw new Error("ROW_DELETE_KEY_REQUIRED");
  }

  return {
    operationId: createArctorTableRowOperationId(
      input.namespace ?? "arctor-row-delete",
    ),
    source: input.source,
    rowKey,
    historyPolicy: input.historyPolicy,
  };
}
