export type CommercialCoreRouteKey =
  | "organizations"
  | "offers"
  | "certificates"
  | "points"
  | "buyer-confirmations"
  | "seller-confirmations"
  | "public-purchases";

export type CommercialCoreAccessState =
  | "preview"
  | "read-only"
  | "future-gated"
  | "no-rights";

export type CommercialCoreActorRole =
  | "buyer"
  | "seller"
  | "organization-admin"
  | "public-viewer"
  | "platform-preview";

export type CommercialCoreCountryCode =
  | "PL"
  | "DE"
  | "ES"
  | "FR"
  | "IT"
  | "NL"
  | "BE"
  | "CZ"
  | "SK"
  | "UA"
  | "US"
  | "GB";

export type CommercialCoreCurrencyCode =
  | "PLN"
  | "EUR"
  | "USD"
  | "GBP"
  | "UAH";

export type CommercialCoreStatusTone =
  | "neutral"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "muted";

export type CommercialCoreActionState =
  | "visible-disabled"
  | "preview-only"
  | "future-gated"
  | "blocked-no-rights";

export type PurchaseConfirmationStatus =
  | "draft-preview"
  | "pending-seller-review"
  | "confirmed-by-seller"
  | "rejected-by-seller"
  | "needs-buyer-clarification"
  | "cancelled-preview";

export type SellerConfirmationDecisionPreview =
  | "confirm-disabled"
  | "reject-disabled"
  | "confirm-later-disabled";

export type CertificateAvailabilityStatus =
  | "available-preview"
  | "not-enough-points-preview"
  | "future-gated"
  | "blocked-no-rights";

export type PointOperationKind =
  | "earned-preview"
  | "spent-preview"
  | "burned-preview"
  | "adjustment-preview"
  | "expired-preview";

export type OrganizationVisibility =
  | "public-directory-preview"
  | "partner-preview"
  | "private-preview"
  | "blocked-preview";

export type CommercialCoreHeader = {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly activeRoute: CommercialCoreRouteKey;
  readonly accessState: CommercialCoreAccessState;
};

export type CommercialCoreNavigationLink = {
  readonly routeKey: CommercialCoreRouteKey;
  readonly label: string;
  readonly href: string;
  readonly description: string;
  readonly badge?: string;
  readonly accessState: CommercialCoreAccessState;
};

export type OrganizationSummary = {
  readonly id: string;
  readonly title: string;
  readonly legalName: string;
  readonly role: CommercialCoreActorRole;
  readonly countryCode: CommercialCoreCountryCode;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly city: string;
  readonly visibility: OrganizationVisibility;
  readonly offersCount: number;
  readonly certificatesCount: number;
  readonly purchaseConfirmationsCount: number;
  readonly isReadOnlyPreview: boolean;
};

export type OfferSummary = {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationTitle: string;
  readonly title: string;
  readonly description: string;
  readonly categoryLabel: string;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly referenceAmount: number;
  readonly pointsPreview: number;
  readonly certificateReady: boolean;
  readonly accessState: CommercialCoreAccessState;
  readonly actionState: CommercialCoreActionState;
};

export type CertificateSummary = {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationTitle: string;
  readonly title: string;
  readonly faceValue: number;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly pointsRequired: number;
  readonly buyerDiscountPreview: number;
  readonly buyerMoneyPartPreview: number;
  readonly sellerMoneyPartPreview: number;
  readonly pointsBurnedPreview: number;
  readonly availabilityStatus: CertificateAvailabilityStatus;
  readonly sellerPayoutNote: string;
  readonly actionState: CommercialCoreActionState;
};

export type PointsWalletSummary = {
  readonly ownerLabel: string;
  readonly balancePreview: number;
  readonly availablePreview: number;
  readonly lockedPreview: number;
  readonly earnedAfterSellerConfirmationPreview: number;
  readonly burnedOnCertificatesPreview: number;
  readonly derivedCurrencyContext: CommercialCoreCurrencyCode;
  readonly readOnlyNotice: string;
};

export type PointOperationPreview = {
  readonly id: string;
  readonly kind: PointOperationKind;
  readonly label: string;
  readonly amount: number;
  readonly relatedOrganizationTitle: string;
  readonly relatedCertificateTitle?: string;
  readonly relatedConfirmationCode?: string;
  readonly createdAtLabel: string;
  readonly statusTone: CommercialCoreStatusTone;
  readonly readOnlyNote: string;
};

export type PurchaseConfirmationPreview = {
  readonly id: string;
  readonly publicCode: string;
  readonly buyerMaskedName: string;
  readonly sellerOrganizationId: string;
  readonly sellerOrganizationTitle: string;
  readonly externalPurchaseAmount: number;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly proofLabel: string;
  readonly buyerComment: string;
  readonly status: PurchaseConfirmationStatus;
  readonly pointsImpactPreview: number;
  readonly submittedAtLabel: string;
  readonly reviewedAtLabel?: string;
  readonly actionState: CommercialCoreActionState;
};

export type BuyerConfirmationFormPreview = {
  readonly sellerOrganizationOptions: readonly OrganizationSummary[];
  readonly selectedOrganizationId: string;
  readonly externalPurchaseAmountPreview: number;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly proofRequirementLabel: string;
  readonly commentPlaceholder: string;
  readonly submitActionState: CommercialCoreActionState;
  readonly submitDisabledReason: string;
};

export type SellerConfirmationRequestPreview = {
  readonly id: string;
  readonly publicCode: string;
  readonly buyerMaskedName: string;
  readonly sellerOrganizationId: string;
  readonly sellerOrganizationTitle: string;
  readonly externalPurchaseAmount: number;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly status: PurchaseConfirmationStatus;
  readonly proofLabel: string;
  readonly buyerComment: string;
  readonly pointsImpactPreview: number;
  readonly availableDecisions: readonly SellerConfirmationDecisionPreview[];
  readonly decisionDisabledReason: string;
};

export type PublicPurchaseHistoryEntry = {
  readonly id: string;
  readonly buyerMaskedName: string;
  readonly sellerOrganizationTitle: string;
  readonly sellerCity: string;
  readonly externalPurchaseAmount: number;
  readonly derivedCurrency: CommercialCoreCurrencyCode;
  readonly confirmationStatus: PurchaseConfirmationStatus;
  readonly confirmationDateLabel: string;
  readonly publicSafetyNote: string;
};

export type CommercialReadOnlyBoundary = {
  readonly title: string;
  readonly description: string;
  readonly blockedActions: readonly string[];
  readonly futureGateRequired: boolean;
  readonly noHiddenWritesNotice: string;
};

export type CommercialNoRightsState = {
  readonly title: string;
  readonly description: string;
  readonly missingRights: readonly string[];
  readonly safeFallbackRoute: CommercialCoreRouteKey;
  readonly supportHint: string;
};

export type CommercialCoreViewModel = {
  readonly header: CommercialCoreHeader;
  readonly navigationLinks: readonly CommercialCoreNavigationLink[];
  readonly organizations: readonly OrganizationSummary[];
  readonly offers: readonly OfferSummary[];
  readonly certificates: readonly CertificateSummary[];
  readonly pointsWallet: PointsWalletSummary;
  readonly pointOperations: readonly PointOperationPreview[];
  readonly buyerConfirmationForm: BuyerConfirmationFormPreview;
  readonly buyerConfirmations: readonly PurchaseConfirmationPreview[];
  readonly sellerQueue: readonly SellerConfirmationRequestPreview[];
  readonly publicHistory: readonly PublicPurchaseHistoryEntry[];
  readonly readOnlyBoundary: CommercialReadOnlyBoundary;
  readonly noRightsState: CommercialNoRightsState;
};

