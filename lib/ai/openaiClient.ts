import OpenAI from "openai";
import {
  AI_ENABLED,
  OPENAI_DEFAULT_MODEL,
  OPENAI_MAX_OUTPUT_TOKENS,
} from "./openaiConfig";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({
  apiKey,
});

type RunAiJsonRequest = {
  system: string;
  user: unknown;
  model?: string;
  maxOutputTokens?: number;
};

export type RunAiJsonUsageMetadata = {
  responseId: string | null;
  model: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rawUsage: unknown;
};

export type RunAiJsonWithUsageMetadataResult<T = unknown> = {
  parsed: T;
  outputText: string;
  usage: RunAiJsonUsageMetadata;
};

function asPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function getSafeMaxOutputTokens(maxOutputTokens?: number) {
  const configuredLimit = asPositiveInteger(OPENAI_MAX_OUTPUT_TOKENS) ?? 800;
  const requestedLimit = asPositiveInteger(maxOutputTokens) ?? configuredLimit;

  return Math.max(1, Math.min(requestedLimit, configuredLimit));
}

function extractOutputText(response: unknown) {
  const directOutputText = (response as { output_text?: unknown }).output_text;

  if (typeof directOutputText === "string" && directOutputText.trim()) {
    return directOutputText.trim();
  }

  const output = (response as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return null;
  }

  const textParts: string[] = [];

  for (const outputItem of output) {
    const content = (outputItem as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      const text = (contentItem as { text?: unknown }).text;

      if (typeof text === "string") {
        textParts.push(text);
      }
    }
  }

  const joinedText = textParts.join("").trim();

  return joinedText || null;
}

function getResponseDebugInfo(response: unknown) {
  const responseObject = response as {
    id?: unknown;
    model?: unknown;
    status?: unknown;
    incomplete_details?: unknown;
    error?: unknown;
    usage?: unknown;
    output?: unknown;
  };

  return {
    id: responseObject.id ?? null,
    model: responseObject.model ?? null,
    status: responseObject.status ?? null,
    incomplete_details: responseObject.incomplete_details ?? null,
    error: responseObject.error ?? null,
    usage: responseObject.usage ?? null,
    output: responseObject.output ?? null,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumberField(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return 0;
  }

  for (const key of keys) {
    const parsed = asPositiveInteger(record[key]);

    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
}

function extractUsageMetadata(response: unknown, fallbackModel: string): RunAiJsonUsageMetadata {
  const responseRecord = readRecord(response);
  const usageRecord = readRecord(responseRecord?.usage);
  const inputDetails = readRecord(
    usageRecord?.input_tokens_details ?? usageRecord?.inputTokensDetails,
  );

  const inputTokens = readNumberField(usageRecord, [
    "input_tokens",
    "inputTokens",
    "prompt_tokens",
    "promptTokens",
  ]);
  const cachedInputTokens = readNumberField(inputDetails, [
    "cached_tokens",
    "cachedTokens",
  ]);
  const outputTokens = readNumberField(usageRecord, [
    "output_tokens",
    "outputTokens",
    "completion_tokens",
    "completionTokens",
  ]);
  const explicitTotalTokens = readNumberField(usageRecord, [
    "total_tokens",
    "totalTokens",
  ]);

  const responseId =
    typeof responseRecord?.id === "string" && responseRecord.id.trim()
      ? responseRecord.id.trim()
      : null;
  const responseModel =
    typeof responseRecord?.model === "string" && responseRecord.model.trim()
      ? responseRecord.model.trim()
      : fallbackModel;

  return {
    responseId,
    model: responseModel || fallbackModel || null,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens: explicitTotalTokens || inputTokens + outputTokens,
    rawUsage: usageRecord ?? null,
  };
}

export async function runAiJsonWithUsageMetadata<T = unknown>({
  system,
  user,
  model,
  maxOutputTokens,
}: RunAiJsonRequest): Promise<RunAiJsonWithUsageMetadataResult<T>> {
  if (!AI_ENABLED) {
    throw new Error("AI is disabled by AI_ENABLED=false");
  }

  const resolvedModel = model || OPENAI_DEFAULT_MODEL;

  const response = await openai.responses.create({
    model: resolvedModel,
    reasoning: {
      effort: "low",
    },
    input: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: JSON.stringify(user),
      },
    ],
    max_output_tokens: getSafeMaxOutputTokens(maxOutputTokens),
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  const outputText = extractOutputText(response);

  if (!outputText) {
    throw new Error(
      "OpenAI returned empty output_text. Debug: " +
        JSON.stringify(getResponseDebugInfo(response)),
    );
  }

  try {
    return {
      parsed: JSON.parse(outputText) as T,
      outputText,
      usage: extractUsageMetadata(response, resolvedModel),
    };
  } catch {
    throw new Error("OpenAI returned invalid JSON: " + outputText);
  }
}

export async function runAiJson<T = unknown>({
  system,
  user,
  model,
  maxOutputTokens,
}: RunAiJsonRequest): Promise<T> {
  const result = await runAiJsonWithUsageMetadata<T>({
    system,
    user,
    model,
    maxOutputTokens,
  });

  return result.parsed;
}
