import crypto from "node:crypto";

import type { LocaleCode } from "@/i18n";
import {
  readHelpContentByKeys,
  writeHelpContentRevision,
} from "@/lib/help/helpStore.server";
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

function emptyTranslations() {
  return Object.fromEntries(
    FORMULA_RATIONALE_LOCALES.map(
      (locale) => [
        locale,
        "",
      ],
    ),
  ) as HelpTranslations;
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

function hashSourceText(
  sourceText: string,
) {
  return crypto
    .createHash(
      "sha256",
    )
    .update(
      sourceText,
      "utf8",
    )
    .digest(
      "hex",
    );
}

export async function saveFormulaRationaleLocale(
  input: {
    ruleVersionId: string;
    section: FormulaRationaleSection;
    locale: LocaleCode;
    text: string;
    updatedByAppUserId: string;
  },
) {
  const text =
    input.text.trim();

  const helpKey =
    formulaRationaleHelpKey(
      input.ruleVersionId,
      input.section,
    );

  const currentRows =
    await readHelpContentByKeys([
      helpKey,
    ]);

  const current =
    currentRationaleRow(
      currentRows,
    );

  const translations =
    current
      ? {
          ...current.translations,
        }
      : emptyTranslations();

  translations[
    input.locale
  ] = text;

  const row =
    await writeHelpContentRevision({
      helpKey,
      blockKind:
        "what",
      sourceLocale:
        input.locale,
      sourceText:
        text,
      translations,
      sourceHash:
        hashSourceText(
          text,
        ),
      provider:
        "formula_rationale_manual_locale_v1",
      modelName:
        null,
      reasoningEffort:
        null,
      responseId:
        null,
      usage: {
        localizationMode:
          "manual",
        editedLocale:
          input.locale,
        machineTranslation:
          false,
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
