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
      className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${
        compact ? "text-[12px]" : "text-[15px]"
      }`}
      aria-label={accessibleText}
    >
      <span
        aria-hidden="true"
        className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1"
      >
        {showRegularPrice ? (
          <LocalizedMoney
            value={regularPrice}
            currency={currency}
            locale={locale}
            className={`${
              compact ? "text-[15px]" : "text-[22px]"
            } font-semibold text-[#dc2626] line-through decoration-[1.5px]`}
          />
        ) : null}

        {moneyRemainder > 0 ? (
          <LocalizedMoney
            value={moneyRemainder}
            currency={currency}
            locale={locale}
            className={`${
              compact ? "text-[15px]" : "text-[22px]"
            } font-extrabold tracking-[-0.03em] text-[#111827]`}
          />
        ) : null}

        {moneyRemainder > 0 && hasPointsPart ? (
          <span className="font-bold text-[#7c8099]">+</span>
        ) : null}

        {hasPointsPart ? (
          <span
            className={`${
              compact ? "text-[12px]" : "text-[15px]"
            } font-bold text-[#315bd0]`}
          >
            {formatLocalizedPoints(pointsPrice, locale)}
          </span>
        ) : null}
      </span>
    </span>
  );
}
