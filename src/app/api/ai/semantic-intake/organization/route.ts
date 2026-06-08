import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type OrganizationSemanticIntakeRequest = {
  objectType?: "organization";
  objectId?: string | null;
  name?: string | null;
  description?: string | null;
  organizationType?: string | null;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  source?: string | null;
};

type ParsedSemanticOutput = {
  language?: string;
  normalizedTitle?: string;
  shortSummary?: string;
  categoryCandidates?: Array<{
    label: string;
    slug: string;
    confidence: number;
    reason: string;
    sourceText?: string;
    visibilitySuggestion?: "public_safe" | "internal_only" | "needs_review";
  }>;
  unknownTermCandidates?: Array<{
    term: string;
    reason: string;
    suggestedLookup?: string;
  }>;
  riskFlags?: string[];
};

function asText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яёąćęłńóśźżüöäß]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function tryParseJsonObject(text: string): ParsedSemanticOutput | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ParsedSemanticOutput;
  } catch {
    // Continue to fenced/raw JSON extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as ParsedSemanticOutput;
    } catch {
      // Continue to object extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const possibleJson = trimmed.slice(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(possibleJson) as ParsedSemanticOutput;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeParsedOutput(parsed: ParsedSemanticOutput | null, fallbackName: string): ParsedSemanticOutput {
  if (!parsed) {
    return {
      language: "unknown",
      normalizedTitle: fallbackName,
      shortSummary: "OpenAI returned non-JSON output. Manual review required.",
      categoryCandidates: [],
      unknownTermCandidates: [],
      riskFlags: ["non_json_output"],
    };
  }

  const rawCandidates = Array.isArray(parsed.categoryCandidates)
    ? parsed.categoryCandidates
    : [];

  const categoryCandidates = rawCandidates
    .filter((candidate) => candidate && typeof candidate.label === "string")
    .slice(0, 12)
    .map((candidate) => {
      const label = candidate.label.trim();
      const slug = candidate.slug?.trim() || safeSlug(label);
      const confidenceNumber =
        typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
          ? candidate.confidence
          : 0.5;

      return {
        label,
        slug,
        confidence: Math.max(0, Math.min(1, confidenceNumber)),
        reason: typeof candidate.reason === "string" ? candidate.reason : "No reason provided.",
        sourceText: typeof candidate.sourceText === "string" ? candidate.sourceText : undefined,
        visibilitySuggestion:
          candidate.visibilitySuggestion === "public_safe" ||
          candidate.visibilitySuggestion === "internal_only" ||
          candidate.visibilitySuggestion === "needs_review"
            ? candidate.visibilitySuggestion
            : "needs_review",
      };
    })
    .filter((candidate) => candidate.label.length > 0);

  const unknownTermCandidates = Array.isArray(parsed.unknownTermCandidates)
    ? parsed.unknownTermCandidates
        .filter((candidate) => candidate && typeof candidate.term === "string")
        .slice(0, 20)
        .map((candidate) => ({
          term: candidate.term.trim(),
          reason: typeof candidate.reason === "string" ? candidate.reason : "No reason provided.",
          suggestedLookup:
            typeof candidate.suggestedLookup === "string" ? candidate.suggestedLookup : undefined,
        }))
        .filter((candidate) => candidate.term.length > 0)
    : [];

  const riskFlags = Array.isArray(parsed.riskFlags)
    ? parsed.riskFlags.filter((flag): flag is string => typeof flag === "string").slice(0, 20)
    : [];

  return {
    language: typeof parsed.language === "string" ? parsed.language : "unknown",
    normalizedTitle: typeof parsed.normalizedTitle === "string" ? parsed.normalizedTitle : fallbackName,
    shortSummary: typeof parsed.shortSummary === "string" ? parsed.shortSummary : "",
    categoryCandidates,
    unknownTermCandidates,
    riskFlags,
  };
}

export async function POST(request: NextRequest) {
  let body: OrganizationSemanticIntakeRequest | null = null;

  try {
    body = (await request.json()) as OrganizationSemanticIntakeRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_JSON_BODY",
      },
      { status: 400 },
    );
  }

  const objectType = body?.objectType ?? "organization";
  const objectId = asText(body?.objectId ?? "");
  const name = asText(body?.name ?? "");
  const description = asText(body?.description ?? "");
  const organizationType = asText(body?.organizationType ?? "");
  const country = asText(body?.country ?? "");
  const city = asText(body?.city ?? "");
  const district = asText(body?.district ?? "");
  const source = asText(body?.source ?? "organization_create");

  if (objectType !== "organization") {
    return NextResponse.json(
      {
        ok: false,
        error: "UNSUPPORTED_OBJECT_TYPE",
        allowedObjectTypes: ["organization"],
      },
      { status: 400 },
    );
  }

  if (!name && !description) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPTY_SEMANTIC_INPUT",
        message: "Provide at least organization name or description.",
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "OPENAI_API_KEY_MISSING",
        message: "Server environment variable OPENAI_API_KEY is required.",
      },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_SEMANTIC_MODEL || "gpt-5.5";

  const semanticInput = {
    objectType,
    objectId: objectId || null,
    source,
    name,
    description,
    organizationType,
    location: {
      country,
      city,
      district,
    },
  };

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await client.responses.create({
      model,
      instructions: [
        "You are a semantic intake extractor for a B2B platform.",
        "Analyze the provided organization data.",
        "Return ONLY valid JSON. Do not return markdown.",
        "Do not create final truth. Return candidates only.",
        "Find important business categories, domains, services, industries, customer groups, and operational themes.",
        "Avoid private personal data. Prefer public-safe business categories when possible.",
        "Use this JSON shape:",
        "{",
        '  "language": "en|pl|de|es|ru|mixed|unknown",',
        '  "normalizedTitle": "short normalized organization title",',
        '  "shortSummary": "one sentence summary",',
        '  "categoryCandidates": [',
        '    { "label": "AI automation consulting", "slug": "ai-automation-consulting", "confidence": 0.95, "reason": "why this category is relevant", "sourceText": "text fragment", "visibilitySuggestion": "public_safe|internal_only|needs_review" }',
        "  ],",
        '  "unknownTermCandidates": [',
        '    { "term": "term needing lookup", "reason": "why lookup is useful", "suggestedLookup": "optional lookup phrase" }',
        "  ],",
        '  "riskFlags": ["optional safety or ambiguity flags"]',
        "}",
      ].join("\n"),
      input: JSON.stringify(semanticInput, null, 2),
      max_output_tokens: 1200,
    });

    const outputText = (response as { output_text?: string }).output_text ?? "";
    const parsed = normalizeParsedOutput(tryParseJsonObject(outputText), name || "organization");

    return NextResponse.json({
      ok: true,
      mode: "openai_organization_semantic_intake_preview",
      objectType,
      objectId: objectId || null,
      source,
      model,
      responseId: response.id,
      usage: response.usage ?? null,
      input: {
        name,
        description,
        organizationType,
        country,
        city,
        district,
      },
      analysis: parsed,
      persistence: {
        wroteToDatabase: false,
        createdCategoryCandidatesRows: false,
        createdApprovedCategories: false,
        createdPublicSemanticCloudLinks: false,
        note: "This route only sends organization text to OpenAI and returns candidates. DB persistence is a later gated step.",
      },
      rawOutput:
        process.env.NODE_ENV === "development"
          ? outputText
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI request error.";

    return NextResponse.json(
      {
        ok: false,
        error: "OPENAI_SEMANTIC_INTAKE_FAILED",
        model,
        message,
      },
      { status: 500 },
    );
  }
}
