import {
  INTERFACE_LOCALES,
  type LocaleCode,
} from "./locales";

export type DictionaryCompletenessIssueKind = "missing-key" | "missing-locale" | "empty-value";

export type DictionaryCompletenessIssue = {
  dictionaryName: string;
  key: string;
  locale?: LocaleCode;
  kind: DictionaryCompletenessIssueKind;
  message: string;
};

export type DictionaryCompletenessReport = {
  dictionaryName: string;
  checkedLocales: readonly LocaleCode[];
  totalKeys: number;
  totalExpectedValues: number;
  totalPresentValues: number;
  missingValues: number;
  isComplete: boolean;
  issues: DictionaryCompletenessIssue[];
};

export type CheckableDictionary = Record<
  string,
  Partial<Record<LocaleCode, string>> | undefined
>;

export function checkDictionaryCompleteness(
  dictionaryName: string,
  dictionary: CheckableDictionary,
  checkedLocales: readonly LocaleCode[] = INTERFACE_LOCALES,
): DictionaryCompletenessReport {
  const issues: DictionaryCompletenessIssue[] = [];
  const keys = Object.keys(dictionary).sort();
  let totalPresentValues = 0;

  for (const key of keys) {
    const values = dictionary[key];

    if (!values) {
      issues.push({
        dictionaryName,
        key,
        kind: "missing-key",
        message: `Dictionary key ${key} is missing a value map.`,
      });

      continue;
    }

    for (const locale of checkedLocales) {
      const value = values[locale];

      if (typeof value !== "string") {
        issues.push({
          dictionaryName,
          key,
          locale,
          kind: "missing-locale",
          message: `Dictionary key ${key} is missing locale ${locale}.`,
        });
        continue;
      }

      if (value.trim().length === 0) {
        issues.push({
          dictionaryName,
          key,
          locale,
          kind: "empty-value",
          message: `Dictionary key ${key} has an empty value for locale ${locale}.`,
        });
        continue;
      }

      totalPresentValues += 1;
    }
  }

  const totalExpectedValues = keys.length * checkedLocales.length;

  return {
    dictionaryName,
    checkedLocales,
    totalKeys: keys.length,
    totalExpectedValues,
    totalPresentValues,
    missingValues: totalExpectedValues - totalPresentValues,
    isComplete: issues.length === 0,
    issues,
  };
}

export function assertDictionaryCompleteness(
  dictionaryName: string,
  dictionary: CheckableDictionary,
  checkedLocales: readonly LocaleCode[] = INTERFACE_LOCALES,
): void {
  const report = checkDictionaryCompleteness(
    dictionaryName,
    dictionary,
    checkedLocales,
  );

  if (!report.isComplete) {
    const issueText = report.issues
      .map((issue) => `- ${issue.message}`)
      .join("\n");

    throw new Error(
      `Dictionary ${dictionaryName} is incomplete.\n${issueText}`,
    );
  }
}
