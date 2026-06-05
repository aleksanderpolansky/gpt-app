import type { OrganizationSummary } from "./commercial-core.types";
import { getCommercialCurrencyForCountry } from "./commercial-core.utils";

type CommercialOrganizationCardProps = {
  readonly organization: OrganizationSummary;
  readonly footerNote?: string;
};

const roleLabelByRole: Record<OrganizationSummary["role"], string> = {
  buyer: "Buyer",
  seller: "Seller",
  "organization-admin": "Organization admin",
  "public-viewer": "Public viewer",
  "platform-preview": "Platform preview",
};

const visibilityLabelByVisibility: Record<OrganizationSummary["visibility"], string> = {
  "public-directory-preview": "Public directory preview",
  "partner-preview": "Partner preview",
  "private-preview": "Private preview",
  "blocked-preview": "Blocked preview",
};

function formatOrganizationCounter(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

export function CommercialOrganizationCard({
  organization,
  footerNote = "Organization data is fixture-first and read-only in UI-14.",
}: CommercialOrganizationCardProps) {
  const derivedCurrencyFromCountry = getCommercialCurrencyForCountry(
    organization.countryCode,
  );
  const currencyMatchesCountry =
    derivedCurrencyFromCountry === organization.derivedCurrency;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {roleLabelByRole[organization.role]}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {organization.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization.legalName}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {visibilityLabelByVisibility[organization.visibility]}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Country
          </dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {organization.countryCode} · {organization.city}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Derived currency
          </dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {organization.derivedCurrency}
          </dd>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {currencyMatchesCountry
              ? "Currency follows organization country."
              : "Currency requires country review."}
          </p>
        </div>
      </dl>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Offers
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {formatOrganizationCounter(organization.offersCount)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Certificates
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {formatOrganizationCounter(organization.certificatesCount)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confirmations
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {formatOrganizationCounter(organization.purchaseConfirmationsCount)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </article>
  );
}

