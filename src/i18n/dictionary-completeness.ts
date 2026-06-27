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
// BEGIN PHASE20C_VALIDATION_MISSING_KEY_GUARD
export const phase20cRequiredMessageLocales = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

export type Phase20CRequiredMessageLocale =
  (typeof phase20cRequiredMessageLocales)[number];

export type Phase20CMessagePrimitive =
  | string
  | number
  | boolean
  | null
  | undefined;

export type Phase20CMessageRecord = Record<string, unknown>;

export type Phase20CDictionaryShape =
  | "key-first"
  | "locale-first"
  | "empty"
  | "unknown";

export interface Phase20CDictionaryCompletenessIssue {
  type:
    | "missing-locale"
    | "missing-key"
    | "invalid-locale-map"
    | "invalid-dictionary";
  key: string;
  locale: Phase20CRequiredMessageLocale | "all";
}

export interface Phase20CDictionaryCompletenessResult {
  ok: boolean;
  shape: Phase20CDictionaryShape;
  keys: string[];
  locales: Phase20CRequiredMessageLocale[];
  issues: Phase20CDictionaryCompletenessIssue[];
  missingKeys: string[];
}

function isPhase20CRecord(value: unknown): value is Phase20CMessageRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasPhase20CLocaleShape(value: Phase20CMessageRecord): boolean {
  return phase20cRequiredMessageLocales.some((locale) =>
    Object.prototype.hasOwnProperty.call(value, locale),
  );
}

export function detectPhase20CDictionaryShape(
  dictionary: unknown,
): Phase20CDictionaryShape {
  if (!isPhase20CRecord(dictionary)) {
    return "unknown";
  }

  const topLevelKeys = Object.keys(dictionary);
  if (topLevelKeys.length === 0) {
    return "empty";
  }

  const localeLikeTopLevel = phase20cRequiredMessageLocales.filter((locale) =>
    Object.prototype.hasOwnProperty.call(dictionary, locale),
  );

  if (localeLikeTopLevel.length >= 2) {
    return "locale-first";
  }

  const values = Object.values(dictionary);
  const recordValues = values.filter(isPhase20CRecord);

  if (recordValues.length > 0 && recordValues.some(hasPhase20CLocaleShape)) {
    return "key-first";
  }

  return "unknown";
}

export function collectPhase20CMessageKeys(dictionary: unknown): string[] {
  const shape = detectPhase20CDictionaryShape(dictionary);

  if (!isPhase20CRecord(dictionary) || shape === "unknown" || shape === "empty") {
    return [];
  }

  if (shape === "key-first") {
    return Object.keys(dictionary)
      .filter((key) => !phase20cRequiredMessageLocales.includes(key as Phase20CRequiredMessageLocale))
      .sort();
  }

  const keys = new Set<string>();
  for (const locale of phase20cRequiredMessageLocales) {
    const localeMap = dictionary[locale];
    if (!isPhase20CRecord(localeMap)) {
      continue;
    }
    for (const key of Object.keys(localeMap)) {
      keys.add(key);
    }
  }

  return Array.from(keys).sort();
}

export function checkPhase20CDictionaryCompleteness(
  dictionary: unknown,
  requiredKeys?: readonly string[],
): Phase20CDictionaryCompletenessResult {
  const shape = detectPhase20CDictionaryShape(dictionary);
  const issues: Phase20CDictionaryCompletenessIssue[] = [];
  const keys =
    requiredKeys && requiredKeys.length > 0
      ? Array.from(new Set(requiredKeys)).sort()
      : collectPhase20CMessageKeys(dictionary);

  if (!isPhase20CRecord(dictionary) || shape === "unknown") {
    return {
      ok: false,
      shape,
      keys,
      locales: [...phase20cRequiredMessageLocales],
      issues: [
        {
          type: "invalid-dictionary",
          key: "*",
          locale: "all",
        },
      ],
      missingKeys: ["*"],
    };
  }

  if (shape === "empty") {
    return {
      ok: keys.length === 0,
      shape,
      keys,
      locales: [...phase20cRequiredMessageLocales],
      issues,
      missingKeys: [],
    };
  }

  if (shape === "key-first") {
    for (const key of keys) {
      const localeMap = dictionary[key];
      if (!isPhase20CRecord(localeMap)) {
        issues.push({
          type: "invalid-locale-map",
          key,
          locale: "all",
        });
        continue;
      }

      for (const locale of phase20cRequiredMessageLocales) {
        if (!Object.prototype.hasOwnProperty.call(localeMap, locale)) {
          issues.push({
            type: "missing-locale",
            key,
            locale,
          });
        }
      }
    }
  }

  if (shape === "locale-first") {
    for (const locale of phase20cRequiredMessageLocales) {
      const localeMap = dictionary[locale];
      if (!isPhase20CRecord(localeMap)) {
        issues.push({
          type: "invalid-locale-map",
          key: "*",
          locale,
        });
        continue;
      }

      for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(localeMap, key)) {
          issues.push({
            type: "missing-key",
            key,
            locale,
          });
        }
      }
    }
  }

  const missingKeys = Array.from(new Set(issues.map((issue) => issue.key))).sort();

  return {
    ok: issues.length === 0,
    shape,
    keys,
    locales: [...phase20cRequiredMessageLocales],
    issues,
    missingKeys,
  };
}

export function assertPhase20CDictionaryCompleteness(
  dictionary: unknown,
  requiredKeys?: readonly string[],
): Phase20CDictionaryCompletenessResult {
  const result = checkPhase20CDictionaryCompleteness(dictionary, requiredKeys);

  if (!result.ok) {
    const firstIssue = result.issues[0];
    const issueText = firstIssue
      ? firstIssue.type + ":" + firstIssue.key + ":" + firstIssue.locale
      : "unknown";
    throw new Error("Phase20C dictionary completeness failed: " + issueText);
  }

  return result;
}

export function getPhase20CMessageOrFallback(
  dictionary: unknown,
  key: string,
  locale: Phase20CRequiredMessageLocale,
  fallbackLocale: Phase20CRequiredMessageLocale = "en",
): string {
  if (!isPhase20CRecord(dictionary)) {
    return key;
  }

  const shape = detectPhase20CDictionaryShape(dictionary);

  if (shape === "key-first") {
    const localeMap = dictionary[key];
    if (!isPhase20CRecord(localeMap)) {
      return key;
    }

    const localizedValue = localeMap[locale];
    if (typeof localizedValue === "string" && localizedValue.length > 0) {
      return localizedValue;
    }

    const fallbackValue = localeMap[fallbackLocale];
    if (typeof fallbackValue === "string" && fallbackValue.length > 0) {
      return fallbackValue;
    }

    return key;
  }

  if (shape === "locale-first") {
    const localeMap = dictionary[locale];
    if (isPhase20CRecord(localeMap)) {
      const localizedValue = localeMap[key];
      if (typeof localizedValue === "string" && localizedValue.length > 0) {
        return localizedValue;
      }
    }

    const fallbackMap = dictionary[fallbackLocale];
    if (isPhase20CRecord(fallbackMap)) {
      const fallbackValue = fallbackMap[key];
      if (typeof fallbackValue === "string" && fallbackValue.length > 0) {
        return fallbackValue;
      }
    }

    return key;
  }

  return key;
}
// END PHASE20C_VALIDATION_MISSING_KEY_GUARD
