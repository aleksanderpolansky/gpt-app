export type ArctorTableRowCreateSource =
  | "toolbar"
  | "keyboard"
  | "paste"
  | "api";

export type ArctorTableRowPlacement =
  | { readonly kind: "root" }
  | { readonly kind: "child"; readonly parentRowKey: string }
  | { readonly kind: "after"; readonly anchorRowKey: string }
  | { readonly kind: "append" };

export type ArctorTableRowHistoryPolicy = "table_local" | "domain_managed";

export type ArctorTableRowCreateRequest<TDraft extends object> = {
  readonly operationId: string;
  readonly source: ArctorTableRowCreateSource;
  readonly placement: ArctorTableRowPlacement;
  readonly historyPolicy: ArctorTableRowHistoryPolicy;
  readonly draft: TDraft;
};

function normalizeOperationNamespace(namespace: string) {
  const normalized = namespace
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || "arctor-row";
}

function createOperationEntropy() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createArctorTableRowOperationId(
  namespace = "arctor-row",
): string {
  return `${normalizeOperationNamespace(namespace)}-${createOperationEntropy()}`;
}
