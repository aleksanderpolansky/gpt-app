import { type LocaleCode } from '@/i18n';
import { type ReaderFormatV1 } from './readerFormatV1';

/** Defaults suggested only for a new visitor, NEVER authorization or confirmed residence. */
export const ARCTOR_READER_COUNTRY_DEFAULTS_CONTRACT_V1 = 'ARCTOR_READER_COUNTRY_DEFAULTS_V1' as const;
export const READER_MANUAL_LOCALE_KEY_V1 = 'arctor.interface.locale.manual.v1';
export const READER_AUTO_LOCALE_KEY_V1 = 'arctor.interface.locale.auto.v1';

export type ReaderCountryDefaultsV1 = ReaderFormatV1 & { locale: LocaleCode };

const COUNTRY_DEFAULTS: Readonly<Record<string, ReaderCountryDefaultsV1>> = {
  PL: { locale: 'pl', currency: 'PLN', units: 'metric' },
  CZ: { locale: 'cs', currency: 'CZK', units: 'metric' },
  UA: { locale: 'uk', currency: 'UAH', units: 'metric' },
  DE: { locale: 'de', currency: 'EUR', units: 'metric' },
  AT: { locale: 'de', currency: 'EUR', units: 'metric' },
  ES: { locale: 'es', currency: 'EUR', units: 'metric' },
  US: { locale: 'en', currency: 'USD', units: 'us' },
  GB: { locale: 'en', currency: 'GBP', units: 'uk' },
  IE: { locale: 'en', currency: 'EUR', units: 'metric' },
  SK: { locale: 'en', currency: 'EUR', units: 'metric' },
};

export function readerCountryDefaultsV1(country: unknown): ReaderCountryDefaultsV1 | null {
  if (typeof country !== 'string' || !/^[a-z]{2}$/i.test(country.trim())) return null;
  return COUNTRY_DEFAULTS[country.trim().toUpperCase()] ?? null;
}
