import { type LocaleCode } from "@/i18n";

import {
  formatCurrencyText,
  formatLocalizedPoints,
  LocalizedMoney,
} from "./certificate-value-format";

export function CertificateCommercialPrice({
  regularPrice,
  moneyRemainder,
  pointsPrice,
  currency,
  locale,
  compact = false,
}: {
  readonly regularPrice: number;
  readonly moneyRemainder: number;
  readonly pointsPrice: number;
  readonly currency: string;
  readonly locale: LocaleCode;
  readonly compact?: boolean;
}) {
  const hasPointsPart = pointsPrice > 0;
  const showRegularPrice = hasPointsPart || moneyRemainder !== regularPrice;
  const accessibleText = [
    showRegularPrice
      ? formatCurrencyText(regularPrice, currency, locale)
      : null,
    moneyRemainder > 0
      ? formatCurrencyText(moneyRemainder, currency, locale)
      : null,
    hasPointsPart ? formatLocalizedPoints(pointsPrice, locale) : null,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${
        compact ? "text-[14px]" : "text-[18px]"
      } font-bold tracking-[-0.02em]`}
      aria-label={accessibleText}
    >
      <span
        aria-hidden="true"
        className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1"
      >
        {showRegularPrice ? (
          <LocalizedMoney
            value={regularPrice}
            currency={currency}
            locale={locale}
            className="text-[#dc2626] line-through decoration-[1.5px]"
          />
        ) : null}

        {moneyRemainder > 0 ? (
          <LocalizedMoney
            value={moneyRemainder}
            currency={currency}
            locale={locale}
            className="text-[#111827]"
          />
        ) : null}

        {moneyRemainder > 0 && hasPointsPart ? (
          <span className="text-[#7c8099]">+</span>
        ) : null}

        {hasPointsPart ? (
          <span className="text-[#315bd0]">
            {formatLocalizedPoints(pointsPrice, locale)}
          </span>
        ) : null}
      </span>
    </span>
  );
}
