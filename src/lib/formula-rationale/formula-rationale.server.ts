import type { LocaleCode } from "@/i18n";
import {
  readHelpContentByKeys,
  writeHelpContentRevision,
} from "@/lib/help/helpStore.server";
import {
  hashHelpSourceText,
  translateHelpBlockAllLocales,
} from "@/lib/help/helpTranslation.server";
import type {
  HelpTranslations,
} from "@/lib/help/helpTypes";
import {
  FORMULA_RATIONALE_SECTIONS,
  formulaRationaleHelpKey,
  type FormulaRationaleRecord,
  type FormulaRationaleSection,
} from "./formula-rationale";

type HelpRow = Awaited<
  ReturnType<typeof readHelpContentByKeys>
>[number];

function toFormulaRationaleRecord(
  ruleVersionId: string,
  section: FormulaRationaleSection,
  row: HelpRow,
): FormulaRationaleRecord {
  return {
    ruleVersionId,
    section,
    sourceLocale: row.sourceLocale,
    sourceText: row.sourceText,
    translations: row.translations,
    revision: row.revision,
    provider: row.provider,
    modelName: row.modelName,
    reasoningEffort: row.reasoningEffort,
    responseId: row.responseId,
    updatedAt: row.updatedAt,
  };
}

export async function readFormulaRationalesForVersionIds(
  ruleVersionIds: string[],
) {
  const uniqueVersionIds = [
    ...new Set(
      ruleVersionIds
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  if (uniqueVersionIds.length === 0) {
    return [] as FormulaRationaleRecord[];
  }

  const descriptors = uniqueVersionIds.flatMap(
    (ruleVersionId) =>
      FORMULA_RATIONALE_SECTIONS.map((section) => ({
        ruleVersionId,
        section,
        helpKey: formulaRationaleHelpKey(
          ruleVersionId,
          section,
        ),
      })),
  );

  const descriptorByHelpKey = new Map(
    descriptors.map((descriptor) => [
      descriptor.helpKey,
      descriptor,
    ]),
  );

  const rows = await readHelpContentByKeys(
    descriptors.map((descriptor) => descriptor.helpKey),
  );

  const result: FormulaRationaleRecord[] = [];

  for (const row of rows) {
    if (row.blockKind !== "what") {
      continue;
    }

    const descriptor =
      descriptorByHelpKey.get(row.helpKey);

    if (!descriptor) {
      continue;
    }

    result.push(
      toFormulaRationaleRecord(
        descriptor.ruleVersionId,
        descriptor.section,
        row,
      ),
    );
  }

  return result;
}

const FORMULA_RATIONALE_LOCALES: readonly LocaleCode[] = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

function sourceOnlyTranslations(
  sourceLocale: LocaleCode,
  sourceText: string,
) {
  const translations =
    Object.fromEntries(
      FORMULA_RATIONALE_LOCALES.map(
        (locale) => [
          locale,
          locale === sourceLocale
            ? sourceText
            : "",
        ],
      ),
    ) as HelpTranslations;

  return translations;
}

function currentRationaleRow(
  rows: HelpRow[],
) {
  return (
    rows.find(
      (row) =>
        row.blockKind ===
        "what",
    ) ??
    null
  );
}

export async function saveFormulaRationaleSource(
  input: {
    ruleVersionId: string;
    section: FormulaRationaleSection;
    sourceLocale: LocaleCode;
    sourceText: string;
    updatedByAppUserId: string;
  },
) {
  const sourceText =
    input.sourceText.trim();

  const row =
    await writeHelpContentRevision({
      helpKey:
        formulaRationaleHelpKey(
          input.ruleVersionId,
          input.section,
        ),
      blockKind:
        "what",
      sourceLocale:
        input.sourceLocale,
      sourceText,
      translations:
        sourceOnlyTranslations(
          input.sourceLocale,
          sourceText,
        ),
      sourceHash:
        hashHelpSourceText(
          sourceText,
        ),
      provider:
        sourceText
          ? "formula_rationale_source_save_v1"
          : "none",
      modelName:
        null,
      reasoningEffort:
        null,
      responseId:
        null,
      usage:
        sourceText
          ? {
              translationState:
                "pending",
            }
          : {
              translationState:
                "not_required",
            },
      updatedByAppUserId:
        input.updatedByAppUserId,
    });

  return toFormulaRationaleRecord(
    input.ruleVersionId,
    input.section,
    row,
  );
}

export async function translateFormulaRationaleSection(
  input: {
    ruleVersionId: string;
    section: FormulaRationaleSection;
    sourceLocale: LocaleCode;
    sourceText: string;
    expectedRevision: number;
    updatedByAppUserId: string;
  },
) {
  const sourceText =
    input.sourceText.trim();

  const helpKey =
    formulaRationaleHelpKey(
      input.ruleVersionId,
      input.section,
    );

  const beforeRows =
    await readHelpContentByKeys([
      helpKey,
    ]);

  const before =
    currentRationaleRow(
      beforeRows,
    );

  if (!before) {
    throw new Error(
      "FORMULA_RATIONALE_TRANSLATION_SOURCE_NOT_FOUND",
    );
  }

  if (
    before.revision !==
      input.expectedRevision ||
    before.sourceLocale !==
      input.sourceLocale ||
    before.sourceText !==
      sourceText
  ) {
    return {
      state:
        "stale" as const,
      content:
        toFormulaRationaleRecord(
          input.ruleVersionId,
          input.section,
          before,
        ),
    };
  }

  if (!sourceText) {
    return {
      state:
        "not_required" as const,
      content:
        toFormulaRationaleRecord(
          input.ruleVersionId,
          input.section,
          before,
        ),
    };
  }

  const translated =
    await translateHelpBlockAllLocales({
      sourceLocale:
        input.sourceLocale,
      sourceText,
    });

  const afterTranslationRows =
    await readHelpContentByKeys([
      helpKey,
    ]);

  const afterTranslation =
    currentRationaleRow(
      afterTranslationRows,
    );

  if (!afterTranslation) {
    throw new Error(
      "FORMULA_RATIONALE_TRANSLATION_SOURCE_DISAPPEARED",
    );
  }

  if (
    afterTranslation.revision !==
      input.expectedRevision ||
    afterTranslation.sourceLocale !==
      input.sourceLocale ||
    afterTranslation.sourceText !==
      sourceText
  ) {
    return {
      state:
        "stale" as const,
      content:
        toFormulaRationaleRecord(
          input.ruleVersionId,
          input.section,
          afterTranslation,
        ),
    };
  }

  const translatedRow =
    await writeHelpContentRevision({
      helpKey,
      blockKind:
        "what",
      sourceLocale:
        input.sourceLocale,
      sourceText,
      translations:
        translated.translations,
      sourceHash:
        translated.sourceHash,
      provider:
        translated.provider,
      modelName:
        translated.modelName,
      reasoningEffort:
        translated.reasoningEffort,
      responseId:
        translated.responseId,
      usage:
        translated.usage,
      updatedByAppUserId:
        input.updatedByAppUserId,
    });

  return {
    state:
      "translated" as const,
    content:
      toFormulaRationaleRecord(
        input.ruleVersionId,
        input.section,
        translatedRow,
      ),
  };
}
