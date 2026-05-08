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

function getSafeMaxOutputTokens(maxOutputTokens?: number) {
  const requestedLimit = maxOutputTokens || OPENAI_MAX_OUTPUT_TOKENS;

  if (!Number.isFinite(requestedLimit) || requestedLimit < 1) {
    return 800;
  }

  return Math.max(requestedLimit, 800);
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
    status?: unknown;
    incomplete_details?: unknown;
    error?: unknown;
    usage?: unknown;
    output?: unknown;
  };

  return {
    status: responseObject.status ?? null,
    incomplete_details: responseObject.incomplete_details ?? null,
    error: responseObject.error ?? null,
    usage: responseObject.usage ?? null,
    output: responseObject.output ?? null,
  };
}

export async function runAiJson<T = unknown>({
  system,
  user,
  model,
  maxOutputTokens,
}: RunAiJsonRequest): Promise<T> {
  if (!AI_ENABLED) {
    throw new Error("AI is disabled by AI_ENABLED=false");
  }

  const response = await openai.responses.create({
    model: model || OPENAI_DEFAULT_MODEL,
    reasoning: {
      effort: "minimal",
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
      `OpenAI returned empty output_text. Debug: ${JSON.stringify(
        getResponseDebugInfo(response)
      )}`
    );
  }

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${outputText}`);
  }
}