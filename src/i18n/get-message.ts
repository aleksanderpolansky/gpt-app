import {
  DEFAULT_FALLBACK_LOCALE,
  type LocaleCode,
  getLocaleFallbackChain,
  normalizeLocale,
} from "./locales";

export type MessageValue = string;

export type MessageParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type LocaleMessageMap = Partial<Record<LocaleCode, MessageValue>>;

export type FlatMessages<Key extends string = string> = Record<
  Key,
  LocaleMessageMap
>;

export type GetMessageOptions = {
  fallbackLocale?: LocaleCode;
  fallbackText?: string;
};

export function formatMessageTemplate(
  template: string,
  params?: MessageParams,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, key: string) => {
    const value = params[key];

    if (value === null || value === undefined) {
      return match;
    }

    return String(value);
  });
}

export function getLocaleMessage(
  messages: LocaleMessageMap,
  locale: unknown,
  params?: MessageParams,
  options?: GetMessageOptions,
): string {
  const fallbackLocale = options?.fallbackLocale ?? DEFAULT_FALLBACK_LOCALE;
  const localeChain = getLocaleFallbackChain(
    normalizeLocale(locale, fallbackLocale),
    fallbackLocale,
  );

  for (const localeCode of localeChain) {
    const message = messages[localeCode];

    if (typeof message === "string" && message.trim().length > 0) {
      return formatMessageTemplate(message, params);
    }
  }

  return options?.fallbackText ?? "";
}

export function getMessage<Key extends string>(
  dictionary: FlatMessages<Key>,
  key: Key,
  locale: unknown,
  params?: MessageParams,
  options?: GetMessageOptions,
): string {
  const messages = dictionary[key];

  if (!messages) {
    return options?.fallbackText ?? key;
  }

  const resolved = getLocaleMessage(messages, locale, params, options);

  if (resolved.length > 0) {
    return resolved;
  }

  return options?.fallbackText ?? key;
}
