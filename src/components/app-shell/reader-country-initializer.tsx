'use client';

import { useEffect } from 'react';
import { isLocaleCode, type LocaleCode } from '@/i18n';
import {
  ARCTOR_READER_COUNTRY_DEFAULTS_CONTRACT_V1,
  READER_AUTO_LOCALE_KEY_V1,
  READER_MANUAL_LOCALE_KEY_V1,
  type ReaderCountryDefaultsV1,
} from '@/lib/reader-format/readerCountryDefaultsV1';
import {
  READER_FORMAT_STORAGE_KEY_V1,
  suggestReaderFormatV1,
  validateReaderFormatV1,
} from '@/lib/reader-format/readerFormatV1';
import { useReaderFormatV1 } from './reader-format-provider';

function stored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* private browsing */ }
}
function asLocale(value: string | null): LocaleCode | null {
  const code = value?.trim().toLowerCase();
  return code && isLocaleCode(code) ? code : null;
}
function explicitUrlLanguage(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('locale') || params.has('lang');
}
function redirectToLocale(locale: LocaleCode): void {
  const url = new URL(window.location.href);
  url.searchParams.set('locale', locale);
  url.searchParams.delete('lang');
  if (url.href !== window.location.href) window.location.replace(url.href);
}
function hasSavedFormat(): boolean {
  const raw = stored(READER_FORMAT_STORAGE_KEY_V1);
  if (!raw) return false;
  try { return validateReaderFormatV1(JSON.parse(raw) as unknown) !== null; }
  catch { return false; }
}
function browserFallback(): ReaderCountryDefaultsV1 {
  const language = navigator.language || 'en';
  const lang = language.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  return { locale: asLocale(lang) ?? 'en', ...suggestReaderFormatV1(language) };
}
function validResponse(value: unknown): ReaderCountryDefaultsV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const response = value as Record<string, unknown>;
  if (response.ok !== true || response.contract !== ARCTOR_READER_COUNTRY_DEFAULTS_CONTRACT_V1) return null;
  const defaults = response.defaults;
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) return null;
  const d = defaults as Record<string, unknown>;
  const prefs = validateReaderFormatV1(d);
  if (!prefs || !isLocaleCode(d.locale)) return null;
  return {locale:d.locale, ...prefs};
}

/** Runs only in the browser; never changes persisted/manual choices or server-side source data. */
export function ReaderCountryInitializer() {
  const { setPrefs } = useReaderFormatV1();
  useEffect(() => {
    let disposed = false;
    const explicit = explicitUrlLanguage();
    const remembered = asLocale(stored(READER_MANUAL_LOCALE_KEY_V1))
      ?? asLocale(stored(READER_AUTO_LOCALE_KEY_V1));
    // Explicit links win. For bare URLs, previously chosen language wins.
    if (!explicit && remembered) {
      redirectToLocale(remembered);
      return;
    }
    // When both settings were established earlier, no country lookup is needed.
    if (explicit && hasSavedFormat()) return;
    const controller = new AbortController();
    void (async () => {
      let defaults: ReaderCountryDefaultsV1 | null = null;
      try {
        const response = await fetch('/api/reader-country-defaults', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (response.ok) defaults = validResponse(await response.json() as unknown);
      } catch { /* localhost, offline, proxy, unavailable endpoint */ }
      if (disposed) return;
      const proposed = defaults ?? browserFallback();
      // Recheck after network request: a user may have changed values meanwhile.
      if (!hasSavedFormat()) setPrefs({currency:proposed.currency,units:proposed.units});
      if (!explicitUrlLanguage() &&
          !asLocale(stored(READER_MANUAL_LOCALE_KEY_V1)) &&
          !asLocale(stored(READER_AUTO_LOCALE_KEY_V1))) {
        save(READER_AUTO_LOCALE_KEY_V1, proposed.locale);
        redirectToLocale(proposed.locale);
      }
    })();
    return () => { disposed = true; controller.abort(); };
  }, [setPrefs]);
  return null;
}
