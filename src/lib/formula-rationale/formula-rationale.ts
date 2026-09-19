import type { LocaleCode } from "@/i18n";

export const FORMULA_RATIONALE_SECTIONS = [
  "summary",
  "method",
  "interpretation",
  "limitations",
  "aggregation",
] as const;

export type FormulaRationaleSection =
  (typeof FORMULA_RATIONALE_SECTIONS)[number];

export type FormulaRationaleTranslations =
  Record<LocaleCode, string>;

export type FormulaRationaleRecord = {
  ruleVersionId: string;
  section: FormulaRationaleSection;
  sourceLocale: LocaleCode;
  sourceText: string;
  translations: FormulaRationaleTranslations;
  revision: number;
  provider: string;
  modelName: string | null;
  reasoningEffort: string | null;
  responseId: string | null;
  updatedAt: string;
};

export function isFormulaRationaleSection(
  value: unknown,
): value is FormulaRationaleSection {
  return (
    typeof value === "string" &&
    FORMULA_RATIONALE_SECTIONS.includes(
      value as FormulaRationaleSection,
    )
  );
}

export function formulaRationaleHelpKey(
  ruleVersionId: string,
  section: FormulaRationaleSection,
) {
  return `formula-rationale:${ruleVersionId}:${section}`;
}

export function formulaRationaleRecordKey(
  ruleVersionId: string,
  section: FormulaRationaleSection,
) {
  return `${ruleVersionId}:${section}`;
}
