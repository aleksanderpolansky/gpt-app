export const SEMANTIC_PROJECTION_CONTRACT_VERSION =
  "AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1" as const;

export type SemanticProjectionEpistemicStatus =
  | "OBSERVED"
  | "DECLARED"
  | "DERIVED"
  | "INFERRED"
  | "MODEL_HYPOTHESIS";

export type SemanticProjectionCode =
  | "purchase_contains_food_goods"
  | "relevant_to_nutrition"
  | "possible_household_provisioning"
  | "possible_family_benefit";

export type SemanticProjection = {
  contractVersion: typeof SEMANTIC_PROJECTION_CONTRACT_VERSION;
  projectionCode: SemanticProjectionCode;
  epistemicStatus: SemanticProjectionEpistemicStatus;
  targetCanonicalKey: string;
  basisCode: string;
  evidenceFragments: string[];
  writeAllowed: false;
  primaryClassificationChanged: false;
};

type BuildSemanticProjectionInput = {
  selectedCanonicalKey: string | null;
  sourceFragment: string;
  contextText?: string;
  locale: string;
};

const FOOD_CUES = [
  "продукт",
  "пищ",
  "консерв",
  "тун",
  "макарон",
  "хлеб",
  "молок",
  "мяс",
  "рыб",
  "овощ",
  "фрукт",
  "сыр",
  "яйц",
  "круп",
  "grocer",
  "food",
  "tuna",
  "pasta",
  "bread",
  "milk",
  "meat",
  "fish",
  "vegetable",
  "fruit",
  "cheese",
  "egg",
  "żyw",
  "spożyw",
  "tuńczyk",
  "makaron",
  "chleb",
  "mleko",
  "mięso",
  "ryb",
  "warzyw",
  "owoc",
  "ser",
  "jaj",
  "харч",
  "їж",
  "тунец",
  "макарон",
  "хліб",
  "молок",
  "м'яс",
  "риба",
  "овоч",
  "фрукт",
  "сир",
  "яйц",
  "lebensmittel",
  "thunfisch",
  "nudel",
  "brot",
  "milch",
  "fleisch",
  "fisch",
  "gemüse",
  "obst",
  "käse",
  "ei",
  "alimento",
  "comida",
  "atún",
  "pasta",
  "pan",
  "leche",
  "carne",
  "pescado",
  "verdura",
  "fruta",
  "queso",
  "huevo",
  "potrav",
  "tuňák",
  "těstovin",
  "chléb",
  "mléko",
  "maso",
  "ryb",
  "zelenin",
  "ovoce",
  "sýr",
  "vejce",
] as const;

const STORE_CUES = [
  "магазин",
  "стокрот",
  "супермаркет",
  "store",
  "shop",
  "supermarket",
  "grocery",
  "sklep",
  "biedron",
  "geschäft",
  "laden",
  "supermarkt",
  "tienda",
  "supermercado",
  "obchod",
  "supermarket",
] as const;

const FAMILY_CUES = [
  "семья",
  "семье",
  "семьи",
  "для семьи",
  "жена",
  "жене",
  "жену",
  "мужу",
  "мужа",
  "детям",
  "детей",
  "ребен",
  "ребён",
  "дочер",
  "дочке",
  "сыну",
  "сына",
  "для нас",
  "family",
  "wife",
  "husband",
  "children",
  "child",
  "for us",
  "rodzin",
  "żonie",
  "mężowi",
  "dzieci",
  "dla nas",
  "сім'",
  "дружин",
  "чоловік",
  "діт",
  "родин",
  "familie",
  "frau",
  "ehemann",
  "kinder",
  "für uns",
  "familia",
  "esposa",
  "esposo",
  "hijos",
  "niños",
  "para nosotros",
  "rodin",
  "manžel",
  "děti",
  "pro nás",
] as const;

function normalized(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function expandEvidenceFragment(source: string, index: number, length: number) {
  const hasWhitespace = source.slice(index, index + length).includes(" ");
  if (hasWhitespace) {
    return source.slice(index, index + length).trim();
  }

  const separator = /[\s,.;:!?()\[\]{}"'«»]/u;
  let start = index;
  let end = index + length;

  while (start > 0 && !separator.test(source[start - 1] ?? "")) {
    start -= 1;
  }

  while (end < source.length && !separator.test(source[end] ?? "")) {
    end += 1;
  }

  return source.slice(start, end).trim();
}

function collectEvidence(source: string, cues: readonly string[], limit = 4) {
  const sourceNormalized = normalized(source);
  const evidence: string[] = [];
  const seen = new Set<string>();

  for (const cue of cues) {
    const cueNormalized = normalized(cue);
    const index = sourceNormalized.indexOf(cueNormalized);

    if (index < 0) continue;

    const fragment = expandEvidenceFragment(source, index, cue.length);
    const key = normalized(fragment);

    if (!fragment || seen.has(key)) continue;

    seen.add(key);
    evidence.push(fragment);

    if (evidence.length >= limit) break;
  }

  return evidence;
}

function projection(
  input: Omit<SemanticProjection, "contractVersion" | "writeAllowed" | "primaryClassificationChanged">,
): SemanticProjection {
  return {
    contractVersion: SEMANTIC_PROJECTION_CONTRACT_VERSION,
    ...input,
    writeAllowed: false,
    primaryClassificationChanged: false,
  };
}

export function buildSemanticProjections(
  input: BuildSemanticProjectionInput,
): SemanticProjection[] {
  if (input.selectedCanonicalKey !== "process.finance.purchase") {
    return [];
  }

  const sourceFragment = input.sourceFragment.trim();
  if (!sourceFragment) return [];

  const contextText = input.contextText?.trim() || sourceFragment;
  const foodEvidence = collectEvidence(sourceFragment, FOOD_CUES);
  if (foodEvidence.length === 0) return [];

  const projections: SemanticProjection[] = [
    projection({
      projectionCode: "purchase_contains_food_goods",
      epistemicStatus: "DERIVED",
      targetCanonicalKey: "entity.food.item",
      basisCode: "explicit_food_goods_inside_purchase_fragment",
      evidenceFragments: foodEvidence,
    }),
    projection({
      projectionCode: "relevant_to_nutrition",
      epistemicStatus: "DERIVED",
      targetCanonicalKey: "domain.nutrition_consumption",
      basisCode: "food_goods_make_purchase_relevant_to_nutrition_domain",
      evidenceFragments: foodEvidence,
    }),
  ];

  const storeEvidence = collectEvidence(contextText, STORE_CUES, 2);
  if (storeEvidence.length > 0) {
    projections.push(
      projection({
        projectionCode: "possible_household_provisioning",
        epistemicStatus: "INFERRED",
        targetCanonicalKey: "process.home.household_task",
        basisCode: "food_purchase_in_store_can_be_household_provisioning",
        evidenceFragments: [...storeEvidence, ...foodEvidence].slice(0, 4),
      }),
    );
  }

  const familyEvidence = collectEvidence(contextText, FAMILY_CUES, 2);
  if (familyEvidence.length > 0) {
    projections.push(
      projection({
        projectionCode: "possible_family_benefit",
        epistemicStatus: "INFERRED",
        targetCanonicalKey: "domain.relationships_social_life",
        basisCode: "explicit_family_cue_inside_food_purchase_fragment",
        evidenceFragments: [...familyEvidence, ...foodEvidence].slice(0, 4),
      }),
    );
  }

  return projections;
}
