import {
  clampConfidence,
  createStateHookCandidateV3,
  type CategoryCandidateV3,
  type CategoryType,
  type DetectedLanguageCode,
  type SemanticDerivationV3Result,
  type SemanticLayer,
  type StateHookCandidateV3,
} from "./semanticContractV3";

export type EnrichSemanticDerivationV3FromTextParams = {
  result: SemanticDerivationV3Result;
  inputText: string;
  inputLanguage?: string | null;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function normalizeLanguage(value: string | null | undefined): DetectedLanguageCode {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    normalized === "ru" ||
    normalized === "pl" ||
    normalized === "en" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "uk"
  ) {
    return normalized;
  }

  return "unknown";
}

function buildCategory(params: {
  candidateSlug: string;
  candidateTitle: string;
  semanticLayer: SemanticLayer;
  categoryType: CategoryType;
  confidence: number;
  matchedWords: string[];
  inputText: string;
  isRequired?: boolean;
  isCoreMeaning?: boolean;
}): CategoryCandidateV3 {
  return {
    candidateSlug: params.candidateSlug,
    candidateTitle: params.candidateTitle,
    semanticLayer: params.semanticLayer,
    categoryType: params.categoryType,
    confidence: clampConfidence(params.confidence),
    isRequired: params.isRequired ?? true,
    isCoreMeaning: params.isCoreMeaning ?? true,
    needsUserReview: false,
    evidence: {
      source: "rule",
      surfaceText: params.inputText,
      matchedWords: params.matchedWords,
      sourceChain: ["raw_input", "deterministic_text_enrichment_v0"],
      raw: {
        enrichmentVersion: "semantic-text-signal-enrichment-v0.1.0",
      },
    },
    resolutionStatus: "unresolved",
    source: "rule",
  };
}

function addCategoryIfMissing(
  categories: CategoryCandidateV3[],
  category: CategoryCandidateV3
): void {
  if (
    categories.some(
      (existing) => existing.candidateSlug === category.candidateSlug
    )
  ) {
    return;
  }

  categories.push(category);
}

function addHookIfMissing(
  hooks: StateHookCandidateV3[],
  params: {
    hookKey: string;
    confidence: number;
    sourceCategories: string[];
    inputText: string;
  }
): void {
  if (hooks.some((existing) => existing.hookKey === params.hookKey)) {
    return;
  }

  hooks.push(
    createStateHookCandidateV3({
      hookKey: params.hookKey,
      direction: "increase",
      confidence: params.confidence,
      evidence: {
        source: "rule",
        surfaceText: params.inputText,
        sourceChain: ["deterministic_text_enrichment_v0", "state_hook_v0"],
        raw: {
          sourceCategories: params.sourceCategories,
          note: "State hook only. Not a state fact.",
        },
      },
    })
  );
}

function removeMetricUnknownTerms(
  result: SemanticDerivationV3Result
): SemanticDerivationV3Result {
  return {
    ...result,
    unknownTermCandidates: result.unknownTermCandidates.filter((candidate) => {
      if (candidate.lemma === "duration-minutes") {
        return false;
      }

      if (candidate.possibleSemanticLayers.includes("metric")) {
        return false;
      }

      return true;
    }),
  };
}

export function enrichSemanticDerivationV3FromText(
  params: EnrichSemanticDerivationV3FromTextParams
): SemanticDerivationV3Result {
  const inputText = params.inputText;
  const normalized = normalizeText(inputText);
  const languageCode = normalizeLanguage(params.inputLanguage);

  const categoryCandidates = [...params.result.categoryCandidates];
  const stateHookCandidates = [...params.result.stateHookCandidates];
  const contractWarnings = [...params.result.contractWarnings];

  const hasChild = includesAny(normalized, [
    "ребен",
    "ребён",
    "дит",
    "dzieck",
    "child",
    "kind",
    "niñ",
  ]);

  const hasLearning = includesAny(normalized, [
    "учил",
    "учила",
    "учить",
    "обуч",
    "занимал",
    "помогал",
    "помогала",
    "learning",
    "study",
    "studied",
    "teach",
    "teaching",
    "lernen",
    "uczy",
    "uczył",
    "uczyla",
    "aprender",
    "enseñar",
  ]);

  const hasMath = includesAny(normalized, [
    "математ",
    "math",
    "matematy",
    "mathematik",
    "matematic",
  ]);

  const hasBicycle = includesAny(normalized, [
    "велосипед",
    "bike",
    "bicycle",
    "cycling",
    "rower",
    "fahrrad",
    "bicicleta",
  ]);

  const hasCommuteToWork = includesAny(normalized, [
    "на работу",
    "to work",
    "do pracy",
    "zur arbeit",
    "al trabajo",
  ]);

  const hasMassage = includesAny(normalized, [
    "массаж",
    "massage",
    "masaż",
    "masaz",
    "masaje",
  ]);

  const hasClient = includesAny(normalized, [
    "клиент",
    "client",
    "klient",
    "cliente",
  ]);

  if (hasLearning) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "learning-activity",
        candidateTitle: "Learning activity",
        semanticLayer: "action",
        categoryType: "activity",
        confidence: 0.86,
        matchedWords: ["учил/learning"],
        inputText,
      })
    );
  }

  if (hasChild) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "child-participant",
        candidateTitle: "Child participant",
        semanticLayer: "participant",
        categoryType: "personal",
        confidence: 0.88,
        matchedWords: ["ребёнок/child"],
        inputText,
      })
    );
  }

  if (hasLearning && hasChild) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "helping-child-learn",
        candidateTitle: "Helping child learn",
        semanticLayer: "purpose",
        categoryType: "responsibility",
        confidence: 0.9,
        matchedWords: ["учил", "ребёнка"],
        inputText,
      })
    );

    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "parental-care",
        candidateTitle: "Parental care / childcare",
        semanticLayer: "care",
        categoryType: "care_function",
        confidence: 0.86,
        matchedWords: ["ребёнка"],
        inputText,
      })
    );

    addHookIfMissing(stateHookCandidates, {
      hookKey: "family_care_load",
      confidence: 0.78,
      sourceCategories: ["helping-child-learn", "parental-care"],
      inputText,
    });

    addHookIfMissing(stateHookCandidates, {
      hookKey: "child_development_support",
      confidence: 0.74,
      sourceCategories: ["helping-child-learn"],
      inputText,
    });
  }

  if (hasMath) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "mathematics",
        candidateTitle: "Mathematics",
        semanticLayer: "domain",
        categoryType: "domain",
        confidence: 0.9,
        matchedWords: ["математике/math"],
        inputText,
      })
    );

    addHookIfMissing(stateHookCandidates, {
      hookKey: "cognitive_load",
      confidence: 0.66,
      sourceCategories: ["mathematics", "learning-activity"],
      inputText,
    });
  }

  if (hasBicycle) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "bicycle",
        candidateTitle: "Bicycle",
        semanticLayer: "object_or_instrument",
        categoryType: "instrument",
        confidence: 0.88,
        matchedWords: ["велосипед/bicycle"],
        inputText,
      })
    );

    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "cycling",
        candidateTitle: "Cycling",
        semanticLayer: "action",
        categoryType: "activity",
        confidence: 0.84,
        matchedWords: ["велосипед/bicycle"],
        inputText,
      })
    );

    addHookIfMissing(stateHookCandidates, {
      hookKey: "physical_load",
      confidence: 0.72,
      sourceCategories: ["cycling", "bicycle"],
      inputText,
    });
  }

  if (hasCommuteToWork) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "commute-to-work",
        candidateTitle: "Commute to work",
        semanticLayer: "context",
        categoryType: "context",
        confidence: 0.84,
        matchedWords: ["на работу/to work"],
        inputText,
      })
    );

    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "work-context",
        candidateTitle: "Work context",
        semanticLayer: "context",
        categoryType: "context",
        confidence: 0.8,
        matchedWords: ["работу/work"],
        inputText,
      })
    );
  }

  if (hasMassage) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "massage-service",
        candidateTitle: "Massage service",
        semanticLayer: "action",
        categoryType: "commercial",
        confidence: 0.88,
        matchedWords: ["массаж/massage"],
        inputText,
      })
    );

    addHookIfMissing(stateHookCandidates, {
      hookKey: "physical_load",
      confidence: 0.68,
      sourceCategories: ["massage-service"],
      inputText,
    });
  }

  if (hasMassage && hasClient) {
    addCategoryIfMissing(
      categoryCandidates,
      buildCategory({
        candidateSlug: "client-service-work",
        candidateTitle: "Client service work",
        semanticLayer: "context",
        categoryType: "commercial",
        confidence: 0.84,
        matchedWords: ["клиент/client"],
        inputText,
      })
    );

    addHookIfMissing(stateHookCandidates, {
      hookKey: "income_action_attention",
      confidence: 0.72,
      sourceCategories: ["massage-service", "client-service-work"],
      inputText,
    });
  }

  if (!contractWarnings.includes("deterministic_text_enrichment_v0_applied")) {
    contractWarnings.push("deterministic_text_enrichment_v0_applied");
  }

  const cleaned = removeMetricUnknownTerms(params.result);

  return {
    ...cleaned,
    detectedLanguage:
      cleaned.detectedLanguage === "unknown" ? languageCode : cleaned.detectedLanguage,
    categoryCandidates,
    stateHookCandidates,
    unknownTermCandidates: cleaned.unknownTermCandidates,
    contractWarnings,
  };
}
