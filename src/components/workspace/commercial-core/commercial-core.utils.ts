import type {
  CertificateSummary,
  CommercialCoreActionState,
  CommercialCoreCountryCode,
  CommercialCoreCurrencyCode,
  CommercialCoreStatusTone,
  PurchaseConfirmationStatus,
  SellerConfirmationDecisionPreview,
} from "./commercial-core.types";

const currencyByCountry: Record<CommercialCoreCountryCode, CommercialCoreCurrencyCode> = {
  PL: "PLN",
  DE: "EUR",
  ES: "EUR",
  FR: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  CZ: "EUR",
  SK: "EUR",
  UA: "UAH",
  US: "USD",
  GB: "GBP",
};

const purchaseStatusMetaByStatus: Record<
  PurchaseConfirmationStatus,
  { readonly label: string; readonly tone: CommercialCoreStatusTone }
> = {
  "draft-preview": {
    label: "Draft preview",
    tone: "neutral",
  },
  "pending-seller-review": {
    label: "Pending seller review",
    tone: "warning",
  },
  "confirmed-by-seller": {
    label: "Confirmed by seller",
    tone: "success",
  },
  "rejected-by-seller": {
    label: "Rejected by seller",
    tone: "destructive",
  },
  "needs-buyer-clarification": {
    label: "Needs buyer clarification",
    tone: "warning",
  },
  "cancelled-preview": {
    label: "Cancelled preview",
    tone: "muted",
  },
};

const actionStateMetaByState: Record<
  CommercialCoreActionState,
  { readonly label: string; readonly disabled: true }
> = {
  "visible-disabled": {
    label: "Visible disabled",
    disabled: true,
  },
  "preview-only": {
    label: "Preview only",
    disabled: true,
  },
  "future-gated": {
    label: "Future commercial gate required",
    disabled: true,
  },
  "blocked-no-rights": {
    label: "Blocked because rights are missing",
    disabled: true,
  },
};

const sellerDecisionLabelByDecision: Record<SellerConfirmationDecisionPreview, string> = {
  "confirm-disabled": "Confirm disabled",
  "reject-disabled": "Reject disabled",
  "confirm-later-disabled": "Confirm later disabled",
};

export type CertificateMoneyPreviewInput = Pick<
  CertificateSummary,
  "faceValue" | "buyerDiscountPreview" | "pointsRequired"
>;

export type CertificateMoneyPreviewResult = {
  readonly buyerMoneyPartPreview: number;
  readonly sellerMoneyPartPreview: number;
  readonly pointsBurnedPreview: number;
};

export function getCommercialCurrencyForCountry(
  countryCode: CommercialCoreCountryCode,
): CommercialCoreCurrencyCode {
  return currencyByCountry[countryCode];
}

export function normalizeCommercialAmountPreview(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.round(amount * 100) / 100);
}

export function formatCommercialMoneyPreview(
  amount: number,
  currency: CommercialCoreCurrencyCode,
): string {
  const normalizedAmount = normalizeCommercialAmountPreview(amount);
  const formattedAmount = normalizedAmount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: normalizedAmount % 1 === 0 ? 0 : 2,
  });

  return formattedAmount + " " + currency;
}

export function formatCommercialPointsPreview(points: number): string {
  const normalizedPoints = Number.isFinite(points) ? Math.round(points) : 0;
  const absolutePoints = Math.abs(normalizedPoints);
  const sign = normalizedPoints > 0 ? "+" : normalizedPoints < 0 ? "-" : "";

  return sign + absolutePoints.toLocaleString("en-US") + " pts";
}

function maskPublicBuyerWord(word: string): string {
  const trimmedWord = word.trim();

  if (trimmedWord.length <= 1) {
    return trimmedWord;
  }

  if (trimmedWord.length === 2) {
    return trimmedWord.charAt(0) + "*";
  }

  const firstLetter = trimmedWord.charAt(0);
  const lastLetter = trimmedWord.charAt(trimmedWord.length - 1);
  const hiddenPart = "*".repeat(trimmedWord.length - 2);

  return firstLetter + hiddenPart + lastLetter;
}

function normalizePublicSurnameWord(word: string): string {
  const trimmedWord = word.trim();

  if (trimmedWord.length === 0) {
    return trimmedWord;
  }

  return trimmedWord.charAt(0).toUpperCase() + trimmedWord.slice(1);
}

export function maskPublicBuyerName(publicNameInput: string): string {
  const visibleWords = publicNameInput
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return visibleWords
    .map((word, index) => {
      if (index === 0) {
        return maskPublicBuyerWord(word);
      }

      return maskPublicBuyerWord(normalizePublicSurnameWord(word));
    })
    .join(" ");
}

export function getPurchaseConfirmationStatusLabel(
  status: PurchaseConfirmationStatus,
): string {
  return purchaseStatusMetaByStatus[status].label;
}

export function getPurchaseConfirmationStatusTone(
  status: PurchaseConfirmationStatus,
): CommercialCoreStatusTone {
  return purchaseStatusMetaByStatus[status].tone;
}

export function getCommercialActionStateLabel(
  actionState: CommercialCoreActionState,
): string {
  return actionStateMetaByState[actionState].label;
}

export function isCommercialActionDisabled(
  actionState: CommercialCoreActionState,
): boolean {
  return actionStateMetaByState[actionState].disabled;
}

export function getSellerDecisionPreviewLabel(
  decision: SellerConfirmationDecisionPreview,
): string {
  return sellerDecisionLabelByDecision[decision];
}

export function calculateCertificateMoneyPreview(
  input: CertificateMoneyPreviewInput,
): CertificateMoneyPreviewResult {
  const faceValue = normalizeCommercialAmountPreview(input.faceValue);
  const buyerDiscount = normalizeCommercialAmountPreview(input.buyerDiscountPreview);
  const buyerMoneyPartPreview = normalizeCommercialAmountPreview(faceValue - buyerDiscount);

  return {
    buyerMoneyPartPreview,
    sellerMoneyPartPreview: buyerMoneyPartPreview,
    pointsBurnedPreview: Math.max(0, Math.round(input.pointsRequired)),
  };
}

export function buildExternalPurchaseConfirmationNotice(
  sellerOrganizationTitle: string,
): string {
  return (
    "External purchase confirmation preview for " +
    sellerOrganizationTitle +
    ". No platform payment or commercial write is executed in UI-14."
  );
}

export function buildReadOnlyCommercialActionNotice(
  actionState: CommercialCoreActionState,
): string {
  return (
    getCommercialActionStateLabel(actionState) +
    ": this control is disabled until a future commercial write gate is approved."
  );
}

