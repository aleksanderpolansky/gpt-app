import OpenAI from "openai";
import {
  OPENAI_DEFAULT_MODEL,
  OPENAI_MAX_OUTPUT_TOKENS,
} from "../ai/openaiConfig";

export type ObjectActionSuggestionAiStatus =
  | "matched_existing"
  | "new_category_suggested"
  | "low_confidence"
  | "failed";

export type ObjectActionExistingCategoryInput = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type ObjectActionSuggestionAnalysisInput = {
  userText: string;
  locale: string;
  contextCode: string;
  existingCategories: ObjectActionExistingCategoryInput[];
};

export type ObjectActionSuggestionAnalysisResult = {
  aiStatus: ObjectActionSuggestionAiStatus;
  objectText: string | null;
  actionText: string | null;
  categoryText: string | null;
  categorySlug: string | null;
  confidence: number | null;
  matchedExistingCategoryId: string | null;
  rationale: string;
  riskNotes: string;
  rawAnalysisJson: Record<string, unknown>;
  aiModel: string | null;
  aiPromptVersion: string;
  errorMessage: string | null;
};

type RawAiAnalysisResult = {
  objectText?: unknown;
  actionText?: unknown;
  categoryText?: unknown;
  categorySlug?: unknown;
  confidence?: unknown;
  aiStatus?: unknown;
  matchedExistingCategoryId?: unknown;
  rationale?: unknown;
  riskNotes?: unknown;
};

type ResponseDiagnostic = {
  status: unknown;
  incompleteDetails: unknown;
  error: unknown;
  outputTypes: string[];
  contentTypes: string[];
  outputPreview: unknown;
  usage: unknown;
  configuredMaxOutputTokens: number;
  effectiveMaxOutputTokens: number;
};

const AI_PROMPT_VERSION = "object-action-suggestion-analysis-v1";
const DEFAULT_MODEL = OPENAI_DEFAULT_MODEL;
const MAX_EXISTING_CATEGORIES_IN_PROMPT = 80;
const MIN_SUGGESTION_ANALYSIS_MAX_OUTPUT_TOKENS = 800;

const AI_STATUS_VALUES = new Set<ObjectActionSuggestionAiStatus>([
  "matched_existing",
  "new_category_suggested",
  "low_confidence",
  "failed",
]);

const suggestionAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    objectText: {
      type: "string",
      description:
        "The main object/service/domain described by the user. Example: электросамокат, massage, dog, car.",
    },
    actionText: {
      type: "string",
      description:
        "The normalized action. Prefer concise English verbs such as repair, clean, treat, train, sell, provide_service, book, gift.",
    },
    categoryText: {
      type: "string",
      description:
        "Human-readable suggested contextual category name in the user's language if possible.",
    },
    categorySlug: {
      type: "string",
      description:
        "Lowercase URL-safe slug proposal in English transliteration, using hyphens.",
    },
    confidence: {
      type: "number",
      description:
        "Confidence from 0 to 1. Use lower values when the text is vague or could map to several categories.",
    },
    aiStatus: {
      type: "string",
      enum: ["matched_existing", "new_category_suggested", "low_confidence"],
      description:
        "matched_existing if one existing category is clearly suitable; new_category_suggested if a new category is likely needed; low_confidence if manual review is necessary.",
    },
    matchedExistingCategoryId: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
      description:
        "Existing category id if aiStatus is matched_existing; otherwise null.",
    },
    rationale: {
      type: "string",
      description:
        "Short explanation for the admin. Do not promise that the category is correct.",
    },
    riskNotes: {
      type: "string",
      description:
        "Short warning about ambiguity, duplicates, legal risk, health risk, or why manual review is needed. Empty string if no special risk.",
    },
  },
  required: [
    "objectText",
    "actionText",
    "categoryText",
    "categorySlug",
    "confidence",
    "aiStatus",
    "matchedExistingCategoryId",
    "rationale",
    "riskNotes",
  ],
} as const;

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getModelName() {
  return DEFAULT_MODEL;
}

function getSuggestionAnalysisMaxOutputTokens() {
  if (!Number.isFinite(OPENAI_MAX_OUTPUT_TOKENS)) {
    return MIN_SUGGESTION_ANALYSIS_MAX_OUTPUT_TOKENS;
  }

  return Math.max(
    Math.trunc(OPENAI_MAX_OUTPUT_TOKENS),
    MIN_SUGGESTION_ANALYSIS_MAX_OUTPUT_TOKENS
  );
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeRequiredString(value: unknown, fallbackValue: string) {
  return normalizeString(value) ?? fallbackValue;
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value);
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number") {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Math.round(value * 100) / 100;
}

function normalizeAiStatus(value: unknown): ObjectActionSuggestionAiStatus {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return "low_confidence";
  }

  if (AI_STATUS_VALUES.has(normalizedValue as ObjectActionSuggestionAiStatus)) {
    return normalizedValue as ObjectActionSuggestionAiStatus;
  }

  return "low_confidence";
}

function createFailedAnalysisResult(
  errorMessage: string,
  rawAnalysisJson: Record<string, unknown> = {}
): ObjectActionSuggestionAnalysisResult {
  return {
    aiStatus: "failed",
    objectText: null,
    actionText: null,
    categoryText: null,
    categorySlug: null,
    confidence: null,
    matchedExistingCategoryId: null,
    rationale: "AI analysis failed. Manual admin review is required.",
    riskNotes: "Do not publish or merge this request based on failed AI output.",
    rawAnalysisJson,
    aiModel: getModelName(),
    aiPromptVersion: AI_PROMPT_VERSION,
    errorMessage,
  };
}

function getKnownExistingCategoryIds(
  existingCategories: ObjectActionExistingCategoryInput[]
) {
  return new Set(existingCategories.map((category) => category.id));
}

function normalizeMatchedExistingCategoryId(
  value: unknown,
  existingCategories: ObjectActionExistingCategoryInput[]
) {
  const normalizedValue = normalizeNullableString(value);

  if (!normalizedValue) {
    return null;
  }

  const knownIds = getKnownExistingCategoryIds(existingCategories);

  if (!knownIds.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function buildExistingCategoriesPayload(
  existingCategories: ObjectActionExistingCategoryInput[]
) {
  return existingCategories
    .slice(0, MAX_EXISTING_CATEGORIES_IN_PROMPT)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
    }));
}

function buildSystemInstruction() {
  return [
    "You analyze user-submitted business direction suggestions for an Object-Action Rubricator.",
    "Your job is to suggest an object, an action, and a contextual category for admin review.",
    "You must not approve, publish, create, mutate, or promise any public category.",
    "You must prefer matching an existing category when it is clearly suitable.",
    "If the user's text is vague, ambiguous, too broad, unsafe, or could match several categories, return low_confidence.",
    "Return only one compact JSON object matching the requested schema.",
    "Keep all string fields short and practical for an admin moderation panel.",
  ].join("\n");
}

function buildUserPrompt(input: ObjectActionSuggestionAnalysisInput) {
  const existingCategories = buildExistingCategoriesPayload(
    input.existingCategories
  );

  return JSON.stringify(
    {
      task:
        "Analyze this suggestion request. Suggest object/action/category for admin review only. Do not publish anything.",
      contextCode: input.contextCode,
      locale: input.locale,
      userText: input.userText,
      existingCategories,
      rules: [
        "If a listed existing category clearly matches the user text, set aiStatus=matched_existing and matchedExistingCategoryId to that category id.",
        "If no existing category clearly matches but the user text is specific, set aiStatus=new_category_suggested.",
        "If the text is unclear or risky, set aiStatus=low_confidence.",
        "confidence must be between 0 and 1.",
        "categorySlug must be lowercase and URL-safe with hyphens.",
        "Use concise actionText values such as repair, clean, treat, train, sell, provide_service, book, gift.",
        "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
      ],
    },
    null,
    2
  );
}

function getContentItemText(contentItem: unknown) {
  const directText = (contentItem as { text?: unknown }).text;

  if (typeof directText === "string" && directText.trim()) {
    return directText;
  }

  const outputText = (contentItem as { output_text?: unknown }).output_text;

  if (typeof outputText === "string" && outputText.trim()) {
    return outputText;
  }

  return null;
}

function parseOutputText(response: unknown) {
  const directOutputText = (response as { output_text?: unknown }).output_text;

  if (typeof directOutputText === "string" && directOutputText.trim()) {
    return directOutputText;
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
      const text = getContentItemText(contentItem);

      if (text) {
        textParts.push(text);
      }
    }
  }

  const joinedText = textParts.join("").trim();

  return joinedText || null;
}

function parseRawAnalysisJson(outputText: string) {
  const parsedJson = JSON.parse(outputText) as unknown;

  if (
    typeof parsedJson !== "object" ||
    parsedJson === null ||
    Array.isArray(parsedJson)
  ) {
    throw new Error("AI response was not a JSON object.");
  }

  return parsedJson as Record<string, unknown>;
}

function getOutputTypes(response: unknown) {
  const output = (response as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return [];
  }

  return output
    .map((outputItem) => {
      const type = (outputItem as { type?: unknown }).type;

      return typeof type === "string" ? type : "unknown";
    })
    .slice(0, 20);
}

function getContentTypes(response: unknown) {
  const output = (response as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return [];
  }

  const contentTypes: string[] = [];

  for (const outputItem of output) {
    const content = (outputItem as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      const type = (contentItem as { type?: unknown }).type;

      contentTypes.push(typeof type === "string" ? type : "unknown");
    }
  }

  return contentTypes.slice(0, 30);
}

function createResponseDiagnostic(response: unknown): ResponseDiagnostic {
  const responseLike = response as {
    status?: unknown;
    incomplete_details?: unknown;
    error?: unknown;
    output?: unknown;
    usage?: unknown;
  };

  return {
    status: responseLike.status ?? null,
    incompleteDetails: responseLike.incomplete_details ?? null,
    error: responseLike.error ?? null,
    outputTypes: getOutputTypes(response),
    contentTypes: getContentTypes(response),
    outputPreview: Array.isArray(responseLike.output)
      ? responseLike.output.slice(0, 3)
      : null,
    usage: responseLike.usage ?? null,
    configuredMaxOutputTokens: OPENAI_MAX_OUTPUT_TOKENS,
    effectiveMaxOutputTokens: getSuggestionAnalysisMaxOutputTokens(),
  };
}

function normalizeRawAnalysisResult(
  rawAnalysisJson: Record<string, unknown>,
  input: ObjectActionSuggestionAnalysisInput,
  aiModel: string
): ObjectActionSuggestionAnalysisResult {
  const rawResult = rawAnalysisJson as RawAiAnalysisResult;

  let aiStatus = normalizeAiStatus(rawResult.aiStatus);
  const confidence = normalizeConfidence(rawResult.confidence);

  const matchedExistingCategoryId = normalizeMatchedExistingCategoryId(
    rawResult.matchedExistingCategoryId,
    input.existingCategories
  );

  if (aiStatus === "matched_existing" && !matchedExistingCategoryId) {
    aiStatus = "low_confidence";
  }

  if (confidence !== null && confidence < 0.5) {
    aiStatus = "low_confidence";
  }

  return {
    aiStatus,
    objectText: normalizeNullableString(rawResult.objectText),
    actionText: normalizeNullableString(rawResult.actionText),
    categoryText: normalizeNullableString(rawResult.categoryText),
    categorySlug: normalizeNullableString(rawResult.categorySlug),
    confidence,
    matchedExistingCategoryId,
    rationale: normalizeRequiredString(
      rawResult.rationale,
      "AI produced an analysis. Manual admin review is required."
    ),
    riskNotes: normalizeRequiredString(rawResult.riskNotes, ""),
    rawAnalysisJson,
    aiModel,
    aiPromptVersion: AI_PROMPT_VERSION,
    errorMessage: null,
  };
}

export async function analyzeObjectActionSuggestion(
  input: ObjectActionSuggestionAnalysisInput
): Promise<ObjectActionSuggestionAnalysisResult> {
  const openai = getOpenAiClient();
  const aiModel = getModelName();

  if (!openai) {
    return createFailedAnalysisResult(
      "OPENAI_API_KEY is not configured. AI analysis was not requested."
    );
  }

  const userText = input.userText.trim();

  if (!userText) {
    return createFailedAnalysisResult("userText is empty.");
  }

  try {
    const response = await openai.responses.create({
      model: aiModel,
      reasoning: {
        effort: "minimal",
      },
      input: [
        {
          role: "system",
          content: buildSystemInstruction(),
        },
        {
          role: "user",
          content: buildUserPrompt({
            ...input,
            userText,
          }),
        },
      ],
      max_output_tokens: getSuggestionAnalysisMaxOutputTokens(),
      text: {
        format: {
          type: "json_schema",
          name: "object_action_suggestion_analysis",
          strict: true,
          schema: suggestionAnalysisSchema,
        },
      },
    });

    const outputText = parseOutputText(response);

    if (!outputText) {
      const diagnostic = createResponseDiagnostic(response);

      return createFailedAnalysisResult(
        `AI response did not contain text. status=${String(
          diagnostic.status ?? "unknown"
        )}`,
        {
          responseDiagnostic: diagnostic as unknown as Record<string, unknown>,
        }
      );
    }

    const rawAnalysisJson = parseRawAnalysisJson(outputText);

    return normalizeRawAnalysisResult(rawAnalysisJson, input, aiModel);
  } catch (error) {
    return createFailedAnalysisResult(
      error instanceof Error ? error.message : "Unknown AI analysis error."
    );
  }
}