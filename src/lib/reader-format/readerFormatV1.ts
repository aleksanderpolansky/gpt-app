/** Reader-facing DISPLAY preferences. Never change canonical values or search filters. */
export const READER_FORMAT_CONTRACT_V1 = 'ARCTOR_READER_FORMAT_DISPLAY_V1' as const;
export const READER_FORMAT_STORAGE_KEY_V1 = 'arctor.reader.format.v1';
export const READER_FORMAT_CHANGE_EVENT_V1 = 'arctor:reader-format-changed';
export const DISPLAY_CURRENCIES_V1 = ['EUR','PLN','UAH','USD','GBP','CZK'] as const;
export type DisplayCurrencyV1 = (typeof DISPLAY_CURRENCIES_V1)[number];
export type MeasurementSystemV1 = 'metric'|'us'|'uk';
export type ReaderFormatV1 = { currency:DisplayCurrencyV1; units:MeasurementSystemV1 };
export const DEFAULT_READER_FORMAT_V1:ReaderFormatV1 = {currency:'EUR',units:'metric'};
const CURRENCIES:ReadonlySet<string> = new Set(DISPLAY_CURRENCIES_V1);
export function isDisplayCurrencyV1(value:unknown):value is DisplayCurrencyV1 {
  return typeof value==='string' && CURRENCIES.has(value);
}
export function isMeasurementSystemV1(value:unknown):value is MeasurementSystemV1 {
  return value==='metric'||value==='us'||value==='uk';
}
export function validateReaderFormatV1(value:unknown):ReaderFormatV1|null {
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  const item=value as Record<string,unknown>;
  if(!isDisplayCurrencyV1(item.currency) || !isMeasurementSystemV1(item.units)) return null;
  return {currency:item.currency,units:item.units};
}
/** Browser region is a one-time, untrusted suggestion; display language remains independent. */
export function suggestReaderFormatV1(language:string):ReaderFormatV1 {
  const m=/(?:^|[-_])(US|GB|UK|PL|UA|DE|AT|ES|CZ|SK|IE)(?:$|[-_])/i.exec(language);
  const region=m?.[1]?.toUpperCase()??'';
  const mapping:Record<string,DisplayCurrencyV1>={US:'USD',GB:'GBP',UK:'GBP',PL:'PLN',UA:'UAH',DE:'EUR',AT:'EUR',ES:'EUR',CZ:'CZK',SK:'EUR',IE:'EUR'};
  return {currency:mapping[region]??'EUR', units:region==='US'?'us':'metric'};
}
