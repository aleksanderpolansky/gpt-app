import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";

export const QUICK_CAPTURE_INFINITIVE_INTENT_CONTRACT =
  "P5C_QUICK_CAPTURE_INFINITIVE_INTENT_V1" as const;

const RU_PREFIX_WORDS = new Set([
  "активность",
  "задача",
  "план",
  "намерение",
  "напоминание",
  "команда",
  "просьба",
  "нужно",
  "надо",
  "необходимо",
  "хочу",
  "хотим",
]);

const UK_PREFIX_WORDS = new Set([
  "активність",
  "завдання",
  "план",
  "намір",
  "нагадування",
  "команда",
  "прохання",
  "треба",
  "потрібно",
  "необхідно",
  "хочу",
  "хочемо",
]);

const RU_NOUN_EXCEPTIONS = new Set([
  "память",
  "кровать",
  "печать",
  "сеть",
  "часть",
  "власть",
  "область",
  "смерть",
  "шерсть",
  "кость",
  "нефть",
  "медь",
]);

const UK_NOUN_EXCEPTIONS = new Set([
  "память",
  "пам'ять",
  "ліжко",
  "печать",
  "мережа",
  "частина",
  "влада",
  "область",
  "смерть",
  "кістка",
]);

function words(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .match(/[\p{L}'’]+/gu) ?? [];
}

function firstIntentWord(value: string, prefixes: Set<string>) {
  const tokens = words(value);
  let index = 0;
  while (index < tokens.length && prefixes.has(tokens[index])) {
    index += 1;
  }
  return tokens[index] ?? "";
}

function looksLikeRussianInfinitive(value: string) {
  return /(?:ться|ть|чь|ти)$/u.test(value) && !RU_NOUN_EXCEPTIONS.has(value);
}

function looksLikeUkrainianInfinitive(value: string) {
  return /(?:тися|итися|їтися|ти|ть)$/u.test(value) && !UK_NOUN_EXCEPTIONS.has(value);
}

export function hasInfinitiveFutureIntent(
  value: string,
  locale: ActivityTimingLocalePp1 | undefined,
) {
  if (!value.trim()) {
    return false;
  }

  if (locale === "ru") {
    return looksLikeRussianInfinitive(firstIntentWord(value, RU_PREFIX_WORDS));
  }

  if (locale === "uk") {
    return looksLikeUkrainianInfinitive(firstIntentWord(value, UK_PREFIX_WORDS));
  }

  return false;
}
