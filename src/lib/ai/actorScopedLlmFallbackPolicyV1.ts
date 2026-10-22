/** P3.5 pure policy. No provider, SQL, side effects, or billing. */
export const P35_CONTRACT = "ARCTOR_P35_SCOPED_ACTIVITY_LLM_FALLBACK_V1" as const;
export const P35_MAX_ORIGINAL_CHARS = 500;
export const P35_MAX_OUTPUT_TOKENS = 900;
export const P35_MAX_ESTIMATED_INPUT_TOKENS = 45000;
export const P35_ABSOLUTE_EUR_LIMIT = 0.05;

export type P35ModelDecision = {
  decision: "suggest" | "clarify";
  suggestedRawActivity: string;
  evidence: string[];
  unknowns: string[];
  explanation: string;
};

export const P35_SCHEMA: Record<string, unknown> = {
  type: "object", additionalProperties: false,
  required: ["decision", "suggestedRawActivity", "evidence", "unknowns", "explanation"],
  properties: {
    decision: { type: "string", enum: ["suggest", "clarify"] },
    suggestedRawActivity: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    unknowns: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
};

const control = /[\u0000-\u001F\u007F]/u;
const number = /\d+(?:[.,]\d+)?/gu;
const negation = /(?:^|[\s,.;:!?])(?:не|нет|без|not|never|no|nie|bez|nicht|kein|keine|sin|nunca)(?=$|[\s,.;:!?])/iu;

export function validP35Text(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() &&
    value.length > 0 && value.length <= P35_MAX_ORIGINAL_CHARS && !control.test(value);
}

export function p35EstimatedInputTokens(bytes: number): number {
  // Conservative upper bound, not an exact tokenizer count. Includes schema/prompt overhead.
  return Math.ceil(bytes) + 1024;
}

export function p35ReservationCeilingEur(estimatedCostEur: number): number {
  if (!Number.isFinite(estimatedCostEur) || estimatedCostEur <= 0) throw new Error("P35_INVALID_COST");
  return Math.max(0.000001, Math.ceil(estimatedCostEur * 1.25 * 1000000) / 1000000);
}

export function validateP35ModelDecision(output: unknown, originalText: string): P35ModelDecision {
  const clarify = (message: string): P35ModelDecision => ({
    decision: "clarify", suggestedRawActivity: "", evidence: [],
    unknowns: ["Требуется уточнение исходного сообщения"], explanation: message,
  });
  if (!output || typeof output !== "object" || Array.isArray(output)) return clarify("INVALID_JSON_SHAPE");
  const v = output as Record<string, unknown>;
  const str = (x: unknown, max: number) => typeof x === "string" && x.length <= max && !control.test(x);
  const strArray = (x: unknown) => Array.isArray(x) && x.length <= 6 &&
    x.every((entry) => str(entry, 140));
  if ((v.decision !== "suggest" && v.decision !== "clarify") ||
      !str(v.suggestedRawActivity, 600) || !str(v.explanation, 500) ||
      !strArray(v.evidence) || !strArray(v.unknowns)) return clarify("INVALID_MODEL_OUTPUT");
  const proposed = v.suggestedRawActivity as string;
  const evidence = v.evidence as string[];
  const unknowns = v.unknowns as string[];
  const explanation = v.explanation as string;
  if (v.decision === "clarify") return { decision: "clarify", suggestedRawActivity: "", evidence,
    unknowns: unknowns.length ? unknowns : ["Требуется уточнение"], explanation };
  if (negation.test(originalText)) return clarify("NEGATION_REQUIRES_CLARIFICATION");
  if (!proposed.trim() || proposed !== proposed.trim()) return clarify("EMPTY_OR_UNNORMALIZED_PROPOSAL");
  if (!evidence.length || !evidence.every((x) => x.trim() && originalText.toLocaleLowerCase().includes(x.trim().toLocaleLowerCase()))) {
    return clarify("EVIDENCE_NOT_GROUNDED_IN_SOURCE");
  }
  // New quantities must come from the current message; the selected rule is contextual,
  // never authorization to invent numbers for a non-matching utterance.
  const givenNumbers = new Set((originalText.match(number) ?? []).map((n) => n.replace(",", ".")));
  const proposedNumbers = (proposed.match(number) ?? []).map((n) => n.replace(",", "."));
  if (proposedNumbers.some((n) => !givenNumbers.has(n))) return clarify("UNSUPPORTED_NUMERIC_CLAIM");
  return { decision: "suggest", suggestedRawActivity: proposed, evidence, unknowns, explanation };
}

export function p35QuoteMatches(quoteHash: unknown, actualHash: string, approvedEur: unknown, quoteEur: number): boolean {
  return typeof quoteHash === "string" && /^[a-f0-9]{64}$/.test(quoteHash) && quoteHash === actualHash &&
    typeof approvedEur === "number" && Number.isFinite(approvedEur) && Math.abs(approvedEur - quoteEur) < 0.0000005;
}
