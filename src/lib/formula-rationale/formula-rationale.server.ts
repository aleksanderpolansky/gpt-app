import type { LocaleCode } from "@/i18n";
import {
  readHelpContentByKeys,
  writeHelpContentRevision,
} from "@/lib/help/helpStore.server";
import {
  translateHelpBlockAllLocales,
} from "@/lib/help/helpTranslation.server";
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

export async function writeFormulaRationaleSection(
  input: {
    ruleVersionId: string;
    section: FormulaRationaleSection;
    sourceLocale: LocaleCode;
    sourceText: string;
    updatedByAppUserId: string;
  },
) {
  const sourceText = input.sourceText.trim();

  const translated =
    await translateHelpBlockAllLocales({
      sourceLocale: input.sourceLocale,
      sourceText,
    });

  const row = await writeHelpContentRevision({
    helpKey: formulaRationaleHelpKey(
      input.ruleVersionId,
      input.section,
    ),
    blockKind: "what",
    sourceLocale: input.sourceLocale,
    sourceText,
    translations: translated.translations,
    sourceHash: translated.sourceHash,
    provider: translated.provider,
    modelName: translated.modelName,
    reasoningEffort: translated.reasoningEffort,
    responseId: translated.responseId,
    usage: translated.usage,
    updatedByAppUserId: input.updatedByAppUserId,
  });

  return toFormulaRationaleRecord(
    input.ruleVersionId,
    input.section,
    row,
  );
}
