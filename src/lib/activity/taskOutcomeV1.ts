export const TASK_OUTCOME_METADATA_KEY = "taskOutcomeV1";
export const TASK_OUTCOME_MAX_OPTIONS = 8;
export const TASK_OUTCOME_MAX_LABEL_LENGTH = 120;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTaskOutcomeOptions(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n/)
      : [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const label = asString(item);
    if (!label) continue;
    const clipped = label.slice(0, TASK_OUTCOME_MAX_LABEL_LENGTH).trim();
    if (!clipped) continue;
    const key = clipped.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clipped);
    if (result.length >= TASK_OUTCOME_MAX_OPTIONS) break;
  }

  return result;
}

export function readTaskOutcomeOptions(metadata: unknown): string[] {
  const root = asRecord(metadata);
  const contract = asRecord(root[TASK_OUTCOME_METADATA_KEY]);
  return normalizeTaskOutcomeOptions(contract.options);
}

export function readTaskOutcomeSelection(metadata: unknown): string | null {
  const root = asRecord(metadata);
  const contract = asRecord(root[TASK_OUTCOME_METADATA_KEY]);
  return asString(contract.selectedOutcome);
}

export function writeTaskOutcomeOptions(metadata: unknown, options: unknown): JsonRecord {
  const root = { ...asRecord(metadata) };
  const current = asRecord(root[TASK_OUTCOME_METADATA_KEY]);
  root[TASK_OUTCOME_METADATA_KEY] = {
    ...current,
    version: 1,
    options: normalizeTaskOutcomeOptions(options),
  };
  return root;
}

export function writeTaskOutcomeSelection(
  metadata: unknown,
  selectedOutcome: string | null,
  selectedAt: string,
): JsonRecord {
  const root = { ...asRecord(metadata) };
  const current = asRecord(root[TASK_OUTCOME_METADATA_KEY]);
  root[TASK_OUTCOME_METADATA_KEY] = {
    ...current,
    version: 1,
    selectedOutcome,
    selectedAt,
  };
  return root;
}
