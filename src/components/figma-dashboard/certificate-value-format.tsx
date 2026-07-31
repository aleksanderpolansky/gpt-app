import { type LocaleCode } from "@/i18n";

const LOCALE_TAGS: Record<LocaleCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

type PointForms = {
  readonly one: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
};

const POINT_FORMS: Record<LocaleCode, PointForms> = {
  en: { one: "point", other: "points" },
  pl: { one: "punkt", few: "punkty", many: "punktów", other: "punktu" },
  ru: { one: "пункт", few: "пункта", many: "пунктов", other: "пункта" },
  uk: { one: "пункт", few: "пункти", many: "пунктів", other: "пункту" },
  de: { one: "Punkt", other: "Punkte" },
  es: { one: "punto", other: "puntos" },
  cs: { one: "bod", few: "body", many: "bodů", other: "bodu" },
};

export function getLocaleTag(locale: LocaleCode): string {
  return LOCALE_TAGS[locale];
}

export function formatPointAmount(value: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getPointWord(value: number, locale: LocaleCode): string {
  const category = new Intl.PluralRules(LOCALE_TAGS[locale]).select(value);
  const forms = POINT_FORMS[locale];

  if (category === "one") return forms.one;
  if (category === "few" && forms.few) return forms.few;
  if (category === "many" && forms.many) return forms.many;
  return forms.other;
}

export function formatLocalizedPoints(
  value: number,
  locale: LocaleCode,
): string {
  return `${formatPointAmount(value, locale)} ${getPointWord(value, locale)}`;
}

export function formatCurrencyText(
  value: number,
  currency: string,
  locale: LocaleCode,
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(value);
}

export function LocalizedMoney({
  value,
  currency,
  locale,
  className,
}: {
  readonly value: number;
  readonly currency: string;
  readonly locale: LocaleCode;
  readonly className?: string;
}) {
  const formatter = new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  });
  const parts = formatter.formatToParts(value);
  const accessibleValue = formatter.format(value);

  return (
    <span className={className} aria-label={accessibleValue}>
      <span aria-hidden="true">
        {parts.map((part, index) => {
          if (part.type === "decimal") {
            return null;
          }

          if (part.type === "fraction") {
            return (
              <sup
                key={`${part.type}-${index}`}
                className="relative -top-[0.15em] ml-[0.04em] text-[0.62em] font-bold leading-none"
              >
                {part.value}
              </sup>
            );
          }

          return <span key={`${part.type}-${index}`}>{part.value}</span>;
        })}
      </span>
    </span>
  );
}
