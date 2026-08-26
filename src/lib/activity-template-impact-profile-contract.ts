export const ACTIVITY_TEMPLATE_CAPTURE_POLICY_CODES = [
  "deterministic",
  "deterministic_or_ai",
  "ai_required",
  "manual",
  "external_source",
] as const;

export type ActivityTemplateCapturePolicyCode =
  (typeof ACTIVITY_TEMPLATE_CAPTURE_POLICY_CODES)[number];

export type ActivityTemplateAuthoringV2Input = {
  title: string;
  description: string;
  defaultDurationMinutes: number | null;
  notes: string;
  parameterDefinitionIds: string[];
  targetValueObjectIds: string[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uuidArray(
  value: unknown,
  fieldName: string,
  maxItems: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }
  if (value.length > maxItems) {
    throw new Error(`${fieldName} may contain at most ${maxItems} items.`);
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    const id = text(raw, 64);
    if (!UUID_RE.test(id)) {
      throw new Error(`${fieldName} contains an invalid UUID.`);
    }
    if (!seen.has(id)) {
      seen.add(id);
      output.push(id);
    }
  }

  return output;
}

export function normalizeActivityTemplateAuthoringV2Input(
  value: unknown,
): ActivityTemplateAuthoringV2Input {
  const source = asRecord(value);
  const title = text(source.title, 180);

  if (!title) {
    throw new Error("Название типовой активности обязательно.");
  }

  const rawDuration =
    source.defaultDurationMinutes === null ||
    source.defaultDurationMinutes === undefined ||
    source.defaultDurationMinutes === ""
      ? null
      : finiteNumber(source.defaultDurationMinutes);

  if (
    rawDuration !== null &&
    (!Number.isInteger(rawDuration) ||
      rawDuration < 0 ||
      rawDuration > 525600)
  ) {
    throw new Error(
      "Длительность должна быть целым числом минут от 0 до 525600.",
    );
  }

  return {
    title,
    description: text(source.description, 4000),
    defaultDurationMinutes: rawDuration,
    notes: text(source.notes, 4000),
    parameterDefinitionIds: uuidArray(
      source.parameterDefinitionIds ?? [],
      "parameterDefinitionIds",
      200,
    ),
    targetValueObjectIds: uuidArray(
      source.targetValueObjectIds ?? [],
      "targetValueObjectIds",
      500,
    ),
  };
}
