import type { OrganizationSummary } from "./commercial-core.types";
import { CommercialOrganizationCard } from "./commercial-organization-card";

type CommercialOrganizationListProps = {
  readonly organizations: readonly OrganizationSummary[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
  readonly footerNote?: string;
};

function getOrganizationListSummary(organizations: readonly OrganizationSummary[]): string {
  const organizationCount = organizations.length;
  const sellerCount = organizations.filter(
    (organization) => organization.role === "seller",
  ).length;
  const countryCount = new Set(
    organizations.map((organization) => organization.countryCode),
  ).size;

  return (
    organizationCount.toLocaleString("en-US") +
    " organizations · " +
    sellerCount.toLocaleString("en-US") +
    " sellers · " +
    countryCount.toLocaleString("en-US") +
    " countries"
  );
}

export function CommercialOrganizationList({
  organizations,
  title = "Organizations",
  description = "Read-only organization directory with country-derived currency and commercial preview counters.",
  emptyMessage = "No organization fixtures are available for this read-only preview.",
  footerNote = "Organization records are fixture-first. Creating or editing organizations requires a future commercial write gate.",
}: CommercialOrganizationListProps) {
  const hasOrganizations = organizations.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial directory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Read-only
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {getOrganizationListSummary(organizations)}
      </div>

      {hasOrganizations ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => (
            <CommercialOrganizationCard
              footerNote={footerNote}
              key={organization.id}
              organization={organization}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

