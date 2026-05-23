import type {
  CategoryCandidate,
  CategoryDerivationInput,
  CategoryDerivationResult,
  JsonRecord,
} from "./types";

export const CATEGORY_DERIVATION_PROCESSOR_VERSION = "category_derivation_v1";
export const CATEGORY_DERIVATION_RULE_VERSION = "rules_v1";

type CandidateDraft = Omit<CategoryCandidate, "source"> & {
  source?: CategoryCandidate["source"];
};

function normalizeInputText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function makeMetadata(
  ruleId: string,
  evidence: string[],
  extra: Record<string, string | number | boolean> = {},
): JsonRecord {
  return {
    ruleId,
    evidence,
    ...extra,
  };
}

function dedupeCandidates(candidates: CategoryCandidate[]): CategoryCandidate[] {
  const byKey = new Map<string, CategoryCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.semanticLayer ?? "other"}::${candidate.slug}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }

    const existingConfidence = existing.confidence ?? 0;
    const candidateConfidence = candidate.confidence ?? 0;

    byKey.set(key, {
      ...existing,
      ...candidate,
      confidence: Math.max(existingConfidence, candidateConfidence),
      isRequired: Boolean(existing.isRequired || candidate.isRequired),
      isConfirmed: Boolean(existing.isConfirmed || candidate.isConfirmed),
      needsUserReview: Boolean(
        existing.needsUserReview || candidate.needsUserReview,
      ),
    });
  }

  return Array.from(byKey.values());
}

function addCandidate(
  target: CategoryCandidate[],
  candidate: CandidateDraft,
): void {
  target.push({
    source: "rule",
    ...candidate,
  });
}

function addDurationMetricCandidate(
  target: CategoryCandidate[],
  input: CategoryDerivationInput,
  text: string,
): void {
  const hasDuration =
    typeof input.durationMinutes === "number" ||
    /\b\d+\s*(minute|minutes|min)\b/.test(text) ||
    /\b\d+\s*(минута|минуты|минут)\b/.test(text);

  if (!hasDuration) {
    return;
  }

  addCandidate(target, {
    slug: "duration-minutes",
    title: "Duration in minutes",
    semanticLayer: "metric",
    categoryType: "measurement",
    confidence: 0.98,
    isRequired: true,
    isConfirmed: true,
    metadata: makeMetadata("duration_minutes_metric", ["durationMinutes or minute expression"]),
  });
}

export function deriveCategoryCandidates(
  input: CategoryDerivationInput,
): CategoryDerivationResult {
  const rawText = [input.inputText, input.title ?? "", input.description ?? ""]
    .filter(Boolean)
    .join(" ");

  const text = normalizeInputText(rawText);
  const candidates: CategoryCandidate[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (text.length === 0) {
    return {
      ok: true,
      skipped: true,
      skipReason: "empty_input_text",
      processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,
      ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
      confidence: null,
      candidates: [],
      warnings: ["No input text was available for deterministic category derivation."],
      errors: [],
      metadata: {
        extractor: "ruleExtractor",
        extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
      },
    };
  }

  const walkedToWork = includesAny(text, [
    "walked to work",
    "walking to work",
    "walk to work",
    "шёл на работу",
    "шел на работу",
    "ходил на работу",
    "пешком на работу",
  ]);

  if (walkedToWork) {
    addCandidate(candidates, {
      slug: "walking",
      title: "Walking",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walked to work"]),
    });

    addCandidate(candidates, {
      slug: "work",
      title: "Work",
      semanticLayer: "context",
      categoryType: "life_domain",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["work destination"]),
    });

    addCandidate(candidates, {
      slug: "commute-to-work",
      title: "Commute to work",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walked to work"]),
    });

    addCandidate(candidates, {
      slug: "walking-to-work",
      title: "Walking to work",
      semanticLayer: "activity_meaning",
      categoryType: "derived_activity_bundle",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walking plus work destination"]),
    });
  }

  const walkingDog = includesAny(text, [
    "walking dog",
    "walked dog",
    "walked with dog",
    "гулял с собакой",
    "гуляла с собакой",
    "выгуливал собаку",
    "выгуливала собаку",
  ]);

  if (walkingDog) {
    addCandidate(candidates, {
      slug: "walking",
      title: "Walking",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.93,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["walking dog"]),
    });

    addCandidate(candidates, {
      slug: "dog",
      title: "Dog",
      semanticLayer: "participant",
      categoryType: "animal_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["dog"]),
    });

    addCandidate(candidates, {
      slug: "pet-care",
      title: "Pet care",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["dog walking care function"]),
    });
  }

  const childStudiedNearby = includesAny(text, [
    "ребенок учил математику рядом",
    "ребёнок учил математику рядом",
    "ребенок занимался математикой рядом",
    "ребёнок занимался математикой рядом",
  ]);

  const taughtMathWithChild =
    !childStudiedNearby &&
    includesAny(text, [
      "учил математику с ребенком",
      "учил математику с ребёнком",
      "занимался математикой с ребенком",
      "занимался математикой с ребёнком",
      "helped child with math",
      "taught math to child",
    ]);

  if (taughtMathWithChild) {
    addCandidate(candidates, {
      slug: "teaching",
      title: "Teaching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["teach math with child"]),
    });

    addCandidate(candidates, {
      slug: "mathematics",
      title: "Mathematics",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["mathematics"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["child participant"]),
    });

    addCandidate(candidates, {
      slug: "learning",
      title: "Learning",
      semanticLayer: "activity_meaning",
      categoryType: "learning_process",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["child learning"]),
    });

    addCandidate(candidates, {
      slug: "family",
      title: "Family",
      semanticLayer: "relationship_context",
      categoryType: "social_context",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["family context inferred from child"]),
    });

    addCandidate(candidates, {
      slug: "helping-child-learn",
      title: "Helping child learn",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["teaching math with child"]),
    });

    addCandidate(candidates, {
      slug: "childcare",
      title: "Childcare",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["adult care responsibility while helping child learn"]),
    });

    addCandidate(candidates, {
      slug: "parental-care",
      title: "Parental care",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["parental care while helping child learn"]),
    });

    addCandidate(candidates, {
      slug: "caregiving",
      title: "Caregiving",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["caregiving role in child learning support"]),
    });

    addCandidate(candidates, {
      slug: "family-duty",
      title: "Family duty",
      semanticLayer: "duty",
      categoryType: "family_responsibility",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child_care_semantics", ["family responsibility"]),
    });
  }

  if (childStudiedNearby) {
    addCandidate(candidates, {
      slug: "mathematics",
      title: "Mathematics",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["child studied mathematics nearby"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["child"]),
    });

    addCandidate(candidates, {
      slug: "learning",
      title: "Learning",
      semanticLayer: "activity_meaning",
      categoryType: "learning_process",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["child learning"]),
    });

    addCandidate(candidates, {
      slug: "family",
      title: "Family",
      semanticLayer: "relationship_context",
      categoryType: "social_context",
      confidence: 0.76,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["family context likely but not explicit"]),
    });

    addCandidate(candidates, {
      slug: "child-supervision",
      title: "Child supervision",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.74,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["nearby adult context"]),
    });

    addCandidate(candidates, {
      slug: "ambiguity-passive-supervision",
      title: "Ambiguity: passive supervision",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.7,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["user may only be nearby"]),
    });

    addCandidate(candidates, {
      slug: "ambiguity-active-help-unknown",
      title: "Ambiguity: active help unknown",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.68,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_studied_math_nearby_supervision_ambiguity", ["do not infer active teaching"]),
    });
  }

  const childHomeworkNearby = includesAny(text, [
    "i was with my child while they did homework",
    "was with my child while they did homework",
    "i stayed with my child while they did homework",
    "stayed with my child while they did homework",
    "i was with my daughter while she did homework",
    "i was with my son while he did homework",
    "я был с ребенком пока он делал домашнее задание",
    "я был с ребёнком пока он делал домашнее задание",
    "я была с ребенком пока он делал домашнее задание",
    "я была с ребёнком пока он делал домашнее задание",
  ]);

  if (childHomeworkNearby) {
    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["child"]),
    });

    addCandidate(candidates, {
      slug: "homework",
      title: "Homework",
      semanticLayer: "object",
      categoryType: "education_task",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["homework"]),
    });

    addCandidate(candidates, {
      slug: "family",
      title: "Family",
      semanticLayer: "relationship_context",
      categoryType: "social_context",
      confidence: 0.82,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["family context inferred from my child"]),
    });

    addCandidate(candidates, {
      slug: "child-supervision",
      title: "Child supervision",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["adult present while child does homework"]),
    });

    addCandidate(candidates, {
      slug: "childcare",
      title: "Childcare",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.78,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["care responsibility possible"]),
    });

    addCandidate(candidates, {
      slug: "parental-care",
      title: "Parental care",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.76,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["my child indicates parental or caregiver context"]),
    });

    addCandidate(candidates, {
      slug: "ambiguity-passive-supervision",
      title: "Ambiguity: passive supervision",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.78,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["with child does not prove active help"]),
    });

    addCandidate(candidates, {
      slug: "ambiguity-active-help-unknown",
      title: "Ambiguity: active help unknown",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.74,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_homework_supervision_ambiguity", ["do not infer active teaching"]),
    });
  }

  const watchedFilmWithChild = includesAny(text, [
    "смотрел фильм с ребенком",
    "смотрел фильм с ребёнком",
    "watched film with child",
    "watched movie with child",
  ]);

  if (watchedFilmWithChild) {
    addCandidate(candidates, {
      slug: "watching",
      title: "Watching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["watch film with child"]),
    });

    addCandidate(candidates, {
      slug: "film",
      title: "Film",
      semanticLayer: "object",
      categoryType: "media_object",
      confidence: 0.93,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["film"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["child"]),
    });
  }

  const watchedEnglishCartoonWithChild = includesAny(text, [
    "английский мультфильм с ребенком",
    "английский мультфильм с ребёнком",
    "english cartoon with child",
  ]);

  const discussedWords = includesAny(text, [
    "обсуждал слова",
    "обсуждали слова",
    "discussed words",
    "discussed vocabulary",
  ]);

  if (watchedEnglishCartoonWithChild) {
    addCandidate(candidates, {
      slug: "watching",
      title: "Watching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["watch english cartoon"]),
    });

    addCandidate(candidates, {
      slug: "english-language",
      title: "English language",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.91,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["english language"]),
    });

    addCandidate(candidates, {
      slug: "cartoon",
      title: "Cartoon",
      semanticLayer: "object",
      categoryType: "media_object",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["cartoon"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["child"]),
    });

    if (discussedWords) {
      addCandidate(candidates, {
        slug: "vocabulary-discussion",
        title: "Vocabulary discussion",
        semanticLayer: "activity_meaning",
        categoryType: "learning_support",
        confidence: 0.88,
        isRequired: true,
        isConfirmed: true,
        metadata: makeMetadata("watch_english_cartoon_with_child", ["discussed words"]),
      });

      addCandidate(candidates, {
        slug: "helping-child-learn",
        title: "Helping child learn",
        semanticLayer: "activity_meaning",
        categoryType: "activity_meaning",
        confidence: 0.84,
        isRequired: true,
        isConfirmed: true,
        metadata: makeMetadata("watch_english_cartoon_with_child", ["cartoon plus vocabulary discussion"]),
      });
    }
  }

  const wroteCommercialProposal = includesAny(text, [
    "писал коммерческое предложение клиенту",
    "писал коммерческое предложение клиенту 40 минут",
    "написал коммерческое предложение клиенту",
    "commercial proposal to client",
    "wrote proposal to client",
    "wrote commercial offer to client",
  ]);

  if (wroteCommercialProposal) {
    addCandidate(candidates, {
      slug: "writing",
      title: "Writing",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["writing proposal"]),
    });

    addCandidate(candidates, {
      slug: "commercial-proposal",
      title: "Commercial proposal",
      semanticLayer: "object",
      categoryType: "business_document",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["commercial proposal"]),
    });

    addCandidate(candidates, {
      slug: "client",
      title: "Client",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["client"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "relationship_context",
      categoryType: "business_domain",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["commercial proposal to client"]),
    });

    addCandidate(candidates, {
      slug: "work-responsibility",
      title: "Work responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["client proposal work"]),
    });

    addCandidate(candidates, {
      slug: "customer-responsibility",
      title: "Customer responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.87,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["responsibility to client"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["sales proposal responsibility"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["commercial intent"]),
    });

    addCandidate(candidates, {
      slug: "business-development",
      title: "Business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.76,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["business development possible"]),
    });

    addCandidate(candidates, {
      slug: "deal-preparation",
      title: "Deal preparation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.78,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["proposal prepares possible deal"]),
    });

    addCandidate(candidates, {
      slug: "relationship-management",
      title: "Relationship management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.7,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_commercial_proposal_client_semantics", ["client relationship possible"]),
    });
  }

  const preparedPotentialClientProposal = includesAny(text, [
    "prepared a proposal for a potential client",
    "prepared proposal for potential client",
    "proposal for a potential client",
    "proposal for potential client",
  ]);

  if (preparedPotentialClientProposal) {
    addCandidate(candidates, {
      slug: "preparing",
      title: "Preparing",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["prepared"]),
    });

    addCandidate(candidates, {
      slug: "commercial-proposal",
      title: "Commercial proposal",
      semanticLayer: "object",
      categoryType: "business_document",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["proposal"]),
    });

    addCandidate(candidates, {
      slug: "potential-client",
      title: "Potential client",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["potential client"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "relationship_context",
      categoryType: "business_domain",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["proposal for potential client"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.87,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["sales preparation"]),
    });

    addCandidate(candidates, {
      slug: "business-development",
      title: "Business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["potential client development"]),
    });

    addCandidate(candidates, {
      slug: "client-acquisition",
      title: "Client acquisition",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["potential client acquisition"]),
    });

    addCandidate(candidates, {
      slug: "deal-preparation",
      title: "Deal preparation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["proposal prepares possible deal"]),
    });

    addCandidate(candidates, {
      slug: "lead-nurturing",
      title: "Lead nurturing",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.66,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", ["potential client may be lead"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.58,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_potential_client_proposal_semantics", [
        "commercial proposal to potential client may support future income; no deal or payment confirmed",
      ]),
    });
  }

  const sentFollowUpAfterMeeting = includesAny(text, [
    "wysłałem follow-up do klienta po spotkaniu",
    "wyslalem follow-up do klienta po spotkaniu",
    "wysłałam follow-up do klienta po spotkaniu",
    "wyslalam follow-up do klienta po spotkaniu",
    "follow-up do klienta po spotkaniu",
    "follow up do klienta po spotkaniu",
  ]);

  if (sentFollowUpAfterMeeting) {
    addCandidate(candidates, {
      slug: "sending",
      title: "Sending",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.93,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["wysłałem follow-up"]),
    });

    addCandidate(candidates, {
      slug: "follow-up-message",
      title: "Follow-up message",
      semanticLayer: "object",
      categoryType: "business_message",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["follow-up"]),
    });

    addCandidate(candidates, {
      slug: "client",
      title: "Client",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["klienta"]),
    });

    addCandidate(candidates, {
      slug: "meeting-follow-up",
      title: "Meeting follow-up",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["po spotkaniu"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "relationship_context",
      categoryType: "business_domain",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["client follow-up"]),
    });

    addCandidate(candidates, {
      slug: "customer-responsibility",
      title: "Customer responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["follow-up to client"]),
    });

    addCandidate(candidates, {
      slug: "relationship-management",
      title: "Relationship management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.85,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["relationship follow-up"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["sales follow-up"]),
    });

    addCandidate(candidates, {
      slug: "pipeline-management",
      title: "Pipeline management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.68,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_follow_up_after_meeting_semantics", ["follow-up may update pipeline"]),
    });
  }

  const priceObjectionCall = includesAny(text, [
    "llamé a un cliente para aclarar objeciones sobre el precio",
    "llame a un cliente para aclarar objeciones sobre el precio",
    "aclarar objeciones sobre el precio",
    "objeciones sobre el precio",
    "cliente precio objeciones",
  ]);

  if (priceObjectionCall) {
    addCandidate(candidates, {
      slug: "calling",
      title: "Calling",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["llamé"]),
    });

    addCandidate(candidates, {
      slug: "client",
      title: "Client",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["cliente"]),
    });

    addCandidate(candidates, {
      slug: "objection-handling",
      title: "Objection handling",
      semanticLayer: "purpose",
      categoryType: "sales_process",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["objeciones"]),
    });

    addCandidate(candidates, {
      slug: "price-objection",
      title: "Price objection",
      semanticLayer: "object",
      categoryType: "sales_objection",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["precio"]),
    });

    addCandidate(candidates, {
      slug: "negotiation",
      title: "Negotiation",
      semanticLayer: "activity_meaning",
      categoryType: "business_interaction",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["clarifying price objections"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "relationship_context",
      categoryType: "business_domain",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["client price objection"]),
    });

    addCandidate(candidates, {
      slug: "customer-responsibility",
      title: "Customer responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["client objection call"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_price_objection_semantics", ["sales objection handling"]),
    });
  }

  const crmLeadUpdate = includesAny(text, [
    "aktualizowałem crm po rozmowie z leadem",
    "aktualizowalem crm po rozmowie z leadem",
    "aktualizowałam crm po rozmowie z leadem",
    "aktualizowalam crm po rozmowie z leadem",
    "crm po rozmowie z leadem",
    "crm after lead call",
  ]);

  if (crmLeadUpdate) {
    addCandidate(candidates, {
      slug: "updating",
      title: "Updating",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["aktualizowałem"]),
    });

    addCandidate(candidates, {
      slug: "crm-record",
      title: "CRM record",
      semanticLayer: "object",
      categoryType: "business_record",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["CRM"]),
    });

    addCandidate(candidates, {
      slug: "lead",
      title: "Lead",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["leadem"]),
    });

    addCandidate(candidates, {
      slug: "post-call-documentation",
      title: "Post-call documentation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["after lead conversation"]),
    });

    addCandidate(candidates, {
      slug: "sales-admin",
      title: "Sales administration",
      semanticLayer: "activity_meaning",
      categoryType: "sales_process",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["CRM update"]),
    });

    addCandidate(candidates, {
      slug: "pipeline-management",
      title: "Pipeline management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["lead CRM update"]),
    });

    addCandidate(candidates, {
      slug: "work-responsibility",
      title: "Work responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["CRM work"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_crm_lead_update_semantics", ["sales pipeline work"]),
    });
  }


  const createdOutboundLeadList = (
    includesAny(text, [
      "tworzyłem listę potencjalnych klientów dla kampanii outbound",
      "tworzylem liste potencjalnych klientow dla kampanii outbound",
    ]) ||
    (
      includesAny(text, ["outbound"]) &&
      includesAny(text, [
        "potencjalnych klientów",
        "potencjalnych klientow",
        "potential clients",
      ]) &&
      includesAny(text, ["listę", "liste", "lista", "list"])
    )
  );

  if (createdOutboundLeadList) {
    addCandidate(candidates, {
      slug: "creating",
      title: "Creating",
      semanticLayer: "action",
      categoryType: "action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["created a list"]),
    });

    addCandidate(candidates, {
      slug: "lead-list",
      title: "Lead list",
      semanticLayer: "object",
      categoryType: "business_artifact",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["list of potential clients"]),
    });

    addCandidate(candidates, {
      slug: "potential-client",
      title: "Potential client",
      semanticLayer: "participant",
      categoryType: "participant",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potencjalnych klientów"]),
    });

    addCandidate(candidates, {
      slug: "prospecting",
      title: "Prospecting",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["pre-contact prospecting"]),
    });

    addCandidate(candidates, {
      slug: "outbound-sales",
      title: "Outbound sales",
      semanticLayer: "context",
      categoryType: "business_process",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["outbound campaign"]),
    });

    addCandidate(candidates, {
      slug: "lead-generation",
      title: "Lead generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potential-client list creation"]),
    });

    addCandidate(candidates, {
      slug: "business-development",
      title: "Business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.8,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["business acquisition preparation"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "context",
      categoryType: "business_domain",
      confidence: 0.76,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potential clients for outbound campaign"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.78,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["sales acquisition work"]),
    });

    addCandidate(candidates, {
      slug: "client-acquisition",
      title: "Client acquisition",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potential-client acquisition"]),
    });

    addCandidate(candidates, {
      slug: "pipeline-management",
      title: "Pipeline management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.62,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["lead list may feed the sales pipeline"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.55,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["lead generation may support future income; no sale confirmed"]),
    });

    addCandidate(candidates, {
      slug: "outbound-campaign",
      title: "Outbound campaign",
      semanticLayer: "object",
      categoryType: "business_artifact",
      confidence: 0.7,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["kampanii outbound"]),
    });

    addCandidate(candidates, {
      slug: "potential-client-list",
      title: "Potential client list",
      semanticLayer: "object",
      categoryType: "business_artifact",
      confidence: 0.72,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["list of potential clients"]),
    });

    addCandidate(candidates, {
      slug: "no-confirmed-contact",
      title: "No confirmed contact",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.66,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["list creation does not confirm contact"]),
    });

    addCandidate(candidates, {
      slug: "no-confirmed-client",
      title: "No confirmed client",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.66,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potential client is not existing client"]),
    });

    addCandidate(candidates, {
      slug: "lead-not-client",
      title: "Lead is not client",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.68,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["pre-contact lead/prospect must not be treated as client"]),
    });

    addCandidate(candidates, {
      slug: "potential-client-not-client",
      title: "Potential client is not client",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.68,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_outbound_lead_list_semantics", ["potential client does not imply existing client"]),
    });
  }

  const negotiatedPartnershipTerms = (
    includesAny(text, [
      "negocjowałem warunki współpracy z partnerem",
      "negocjowalem warunki wspolpracy z partnerem",
    ]) ||
    (
      includesAny(text, ["negocjowałem", "negocjowalem", "negocjacje", "negotiated", "negotiating"]) &&
      includesAny(text, ["partnerem", "partner", "business partner"]) &&
      includesAny(text, ["warunki współpracy", "warunki wspolpracy", "cooperation terms", "partnership terms"])
    )
  );

  if (negotiatedPartnershipTerms) {
    addCandidate(candidates, {
      slug: "negotiating",
      title: "Negotiating",
      semanticLayer: "action",
      categoryType: "action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["negocjowałem"]),
    });

    addCandidate(candidates, {
      slug: "business-partner",
      title: "Business partner",
      semanticLayer: "participant",
      categoryType: "participant",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partnerem"]),
    });

    addCandidate(candidates, {
      slug: "partnership",
      title: "Partnership",
      semanticLayer: "context",
      categoryType: "business_context",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["cooperation with partner"]),
    });

    addCandidate(candidates, {
      slug: "cooperation-terms",
      title: "Cooperation terms",
      semanticLayer: "object",
      categoryType: "business_artifact",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["warunki współpracy"]),
    });

    addCandidate(candidates, {
      slug: "business-development",
      title: "Business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.78,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partner cooperation may develop business"]),
    });

    addCandidate(candidates, {
      slug: "partner-responsibility",
      title: "Partner responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["business partner responsibility"]),
    });

    addCandidate(candidates, {
      slug: "work-responsibility",
      title: "Work responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.78,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["work/business negotiation"]),
    });

    addCandidate(candidates, {
      slug: "strategic-partnership",
      title: "Strategic partnership",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.58,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partnership may be strategic; not confirmed"]),
    });

    addCandidate(candidates, {
      slug: "relationship-management",
      title: "Relationship management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.62,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partner relationship negotiation"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.52,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partnership may support future income; no deal confirmed"]),
    });

    addCandidate(candidates, {
      slug: "revenue-generation",
      title: "Revenue generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.5,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["commercial relevance possible; no revenue confirmed"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "context",
      categoryType: "business_domain",
      confidence: 0.46,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partner negotiation may relate to B2B; not necessarily client sales"]),
    });

    addCandidate(candidates, {
      slug: "business-responsibility",
      title: "Business responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.62,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["business cooperation duty"]),
    });

    addCandidate(candidates, {
      slug: "partner-not-client",
      title: "Partner is not client",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.72,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_partnership_negotiation_semantics", ["partner must not be collapsed into client"]),
    });
  }

  const hadDiscoveryCallWithNewB2BLead = (
    includesAny(text, ["i had a discovery call with a new b2b lead"]) ||
    (
      includesAny(text, ["discovery call"]) &&
      includesAny(text, ["new b2b lead", "new lead", "b2b lead"])
    )
  );

  if (hadDiscoveryCallWithNewB2BLead) {
    addCandidate(candidates, {
      slug: "discovery-call",
      title: "Discovery call",
      semanticLayer: "object",
      categoryType: "business_event",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["discovery call"]),
    });

    addCandidate(candidates, {
      slug: "calling",
      title: "Calling",
      semanticLayer: "action",
      categoryType: "action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["call"]),
    });

    addCandidate(candidates, {
      slug: "new-lead",
      title: "New lead",
      semanticLayer: "participant",
      categoryType: "participant",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["new B2B lead"]),
    });

    addCandidate(candidates, {
      slug: "lead",
      title: "Lead",
      semanticLayer: "participant",
      categoryType: "participant",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["lead"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "context",
      categoryType: "business_domain",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["B2B lead"]),
    });

    addCandidate(candidates, {
      slug: "client-acquisition",
      title: "Client acquisition",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["new lead qualification for acquisition"]),
    });

    addCandidate(candidates, {
      slug: "sales-process",
      title: "Sales process",
      semanticLayer: "context",
      categoryType: "business_process",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["discovery call is a sales-process step"]),
    });

    addCandidate(candidates, {
      slug: "business-development",
      title: "Business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.78,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["new lead may develop business"]),
    });

    addCandidate(candidates, {
      slug: "sales-responsibility",
      title: "Sales responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["sales qualification responsibility"]),
    });

    addCandidate(candidates, {
      slug: "lead-qualification",
      title: "Lead qualification",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["discovery call qualifies new lead"]),
    });

    addCandidate(candidates, {
      slug: "relationship-management",
      title: "Relationship management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.62,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["initial lead relationship"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.54,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["discovery call may support future income; no sale confirmed"]),
    });

    addCandidate(candidates, {
      slug: "deal-preparation",
      title: "Deal preparation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.58,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["qualification may prepare a future deal"]),
    });

    addCandidate(candidates, {
      slug: "pipeline-management",
      title: "Pipeline management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.62,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["new lead belongs to pipeline"]),
    });

    addCandidate(candidates, {
      slug: "possible-business-development",
      title: "Possible business development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.52,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["business development possible; outcome not confirmed"]),
    });

    addCandidate(candidates, {
      slug: "lead-not-client",
      title: "Lead is not client",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.7,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_discovery_call_new_lead_semantics", ["new lead must not be treated as existing client"]),
    });
  }

  const calledClientForPostPurchaseProblem = (
    includesAny(text, [
      "позвонил клиенту, чтобы помочь с проблемой после покупки",
      "позвонил клиенту чтобы помочь с проблемой после покупки",
    ]) ||
    (
      includesAny(text, ["позвонил", "звонил", "позвон"]) &&
      includesAny(text, ["клиенту", "клиент"]) &&
      includesAny(text, ["помочь", "помог", "помощ"]) &&
      includesAny(text, ["проблем"]) &&
      includesAny(text, ["после покупки", "покуп"])
    )
  );

  if (calledClientForPostPurchaseProblem) {
    addCandidate(candidates, {
      slug: "calling",
      title: "Calling",
      semanticLayer: "action",
      categoryType: "action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["позвонил"]),
    });

    addCandidate(candidates, {
      slug: "client",
      title: "Client",
      semanticLayer: "participant",
      categoryType: "participant",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["клиенту"]),
    });

    addCandidate(candidates, {
      slug: "post-purchase-support",
      title: "Post-purchase support",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["problem after purchase"]),
    });

    addCandidate(candidates, {
      slug: "customer-support",
      title: "Customer support",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["help with problem"]),
    });

    addCandidate(candidates, {
      slug: "customer-responsibility",
      title: "Customer responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["client support duty"]),
    });

    addCandidate(candidates, {
      slug: "relationship-management",
      title: "Relationship management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.76,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["supporting existing client relationship"]),
    });

    addCandidate(candidates, {
      slug: "support-responsibility",
      title: "Support responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      needsUserReview: false,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["post-purchase problem support"]),
    });

    addCandidate(candidates, {
      slug: "retention",
      title: "Retention",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.58,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["support may help retention; not a new sale"]),
    });

    addCandidate(candidates, {
      slug: "account-management",
      title: "Account management",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.55,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["existing client support may be account management"]),
    });

    addCandidate(candidates, {
      slug: "customer-success",
      title: "Customer success",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.52,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["helping client solve a post-purchase problem"]),
    });

    addCandidate(candidates, {
      slug: "business-responsibility",
      title: "Business responsibility",
      semanticLayer: "duty",
      categoryType: "responsibility",
      confidence: 0.56,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["business duty to support client after purchase"]),
    });

    addCandidate(candidates, {
      slug: "support-not-new-sale",
      title: "Support is not new sale",
      semanticLayer: "context",
      categoryType: "ambiguity_marker",
      confidence: 0.72,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_post_purchase_support_ambiguity", ["post-purchase support must not be treated as new sale"]),
    });
  }
  const salesLanguageTraining = includesAny(text, [
    "учил немецкие фразы для b2b-продаж",
    "учил немецкие фразы для b2b продаж",
    "учил немецкие фразы для продаж",
    "немецкие фразы для b2b-продаж",
    "немецкие фразы для продаж",
  ]);

  if (salesLanguageTraining) {
    addCandidate(candidates, {
      slug: "learning",
      title: "Learning",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["учил"]),
    });

    addCandidate(candidates, {
      slug: "german-language",
      title: "German language",
      semanticLayer: "object",
      categoryType: "language",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["немецкие фразы"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "relationship_context",
      categoryType: "business_domain",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["B2B-продаж"]),
    });

    addCandidate(candidates, {
      slug: "sales-training",
      title: "Sales training",
      semanticLayer: "purpose",
      categoryType: "professional_training",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["sales phrases training"]),
    });

    addCandidate(candidates, {
      slug: "professional-development",
      title: "Professional development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["professional language training"]),
    });

    addCandidate(candidates, {
      slug: "career-development",
      title: "Career development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["career-related sales language"]),
    });

    addCandidate(candidates, {
      slug: "preparation",
      title: "Preparation",
      semanticLayer: "activity_meaning",
      categoryType: "activity_meaning",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["preparation for sales communication"]),
    });

    addCandidate(candidates, {
      slug: "future-client-communication",
      title: "Future client communication",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.64,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["future communication possible"]),
    });

    addCandidate(candidates, {
      slug: "income-generation",
      title: "Income generation",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.42,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_language_training_preparation_semantics", ["income link only indirect"]),
    });
  }

  const passiveSalesReading = includesAny(text, [
    "читал статью о продажах за кофе",
    "читала статью о продажах за кофе",
    "читал статью о продажах",
    "читала статью о продажах",
  ]);

  if (passiveSalesReading) {
    addCandidate(candidates, {
      slug: "reading",
      title: "Reading",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["читал статью"]),
    });

    addCandidate(candidates, {
      slug: "sales-topic",
      title: "Sales topic",
      semanticLayer: "object",
      categoryType: "knowledge_topic",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["о продажах"]),
    });

    addCandidate(candidates, {
      slug: "self-education",
      title: "Self-education",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["reading article"]),
    });

    addCandidate(candidates, {
      slug: "passive-learning",
      title: "Passive learning",
      semanticLayer: "activity_meaning",
      categoryType: "learning_mode",
      confidence: 0.84,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["reading, not active client work"]),
    });

    addCandidate(candidates, {
      slug: "professional-development",
      title: "Professional development",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.56,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["sales article may support development"]),
    });

    addCandidate(candidates, {
      slug: "rest-context",
      title: "Rest context",
      semanticLayer: "context",
      categoryType: "activity_context",
      confidence: 0.5,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_passive_reading_ambiguity", ["за кофе"]),
    });
  }

  const informalSalesConversation = includesAny(text, [
    "разговаривал с другом о продажах",
    "разговаривала с другом о продажах",
    "говорил с другом о продажах",
    "говорила с другом о продажах",
  ]);

  if (informalSalesConversation) {
    addCandidate(candidates, {
      slug: "conversation",
      title: "Conversation",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["разговаривал"]),
    });

    addCandidate(candidates, {
      slug: "friend",
      title: "Friend",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["с другом"]),
    });

    addCandidate(candidates, {
      slug: "sales-topic",
      title: "Sales topic",
      semanticLayer: "object",
      categoryType: "knowledge_topic",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["о продажах"]),
    });

    addCandidate(candidates, {
      slug: "informal-discussion",
      title: "Informal discussion",
      semanticLayer: "relationship_context",
      categoryType: "social_context",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["friend conversation"]),
    });

    addCandidate(candidates, {
      slug: "reflection",
      title: "Reflection",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.48,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["discussion may be reflective"]),
    });

    addCandidate(candidates, {
      slug: "possible-sales-learning",
      title: "Possible sales learning",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.42,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["sales topic does not prove work"]),
    });

    addCandidate(candidates, {
      slug: "possible-business-idea",
      title: "Possible business idea",
      semanticLayer: "other",
      categoryType: "ambiguity_marker",
      confidence: 0.36,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("business_sales_informal_conversation_ambiguity", ["business idea possible but not explicit"]),
    });
  }
  addDurationMetricCandidate(candidates, input, text);

  const uniqueCandidates = dedupeCandidates(candidates);
  const confidenceValues = uniqueCandidates
    .map((candidate) => candidate.confidence)
    .filter((value): value is number => typeof value === "number");

  const confidence =
    confidenceValues.length > 0
      ? Number(
          (
            confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length
          ).toFixed(4),
        )
      : null;

  if (uniqueCandidates.length === 0) {
    warnings.push("No deterministic category derivation rule matched the input text.");
  }

  return {
    ok: true,
    skipped: uniqueCandidates.length === 0,
    skipReason: uniqueCandidates.length === 0 ? "no_rule_match" : null,
    processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,
    ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
    confidence,
    candidates: uniqueCandidates,
    warnings,
    errors,
    metadata: {
      extractor: "ruleExtractor",
      extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
      inputLength: text.length,
    },
  };
}
