import type {
  BuyerConfirmationFormPreview,
  OrganizationSummary,
} from "./commercial-core.types";
import {
  buildReadOnlyCommercialActionNotice,
  formatCommercialMoneyPreview,
  getCommercialActionStateLabel,
  isCommercialActionDisabled,
} from "./commercial-core.utils";

type CommercialBuyerConfirmationFormPreviewProps = {
  readonly form: BuyerConfirmationFormPreview;
  readonly title?: string;
  readonly description?: string;
};

function getSelectedSellerOrganization(
  form: BuyerConfirmationFormPreview,
): OrganizationSummary | undefined {
  return form.sellerOrganizationOptions.find(
    (organization) => organization.id === form.selectedOrganizationId,
  );
}

function getSellerOptionSummary(
  organizations: readonly OrganizationSummary[],
): string {
  const sellerCount = organizations.length;
  const countryCount = new Set(
    organizations.map((organization) => organization.countryCode),
  ).size;

  return (
    sellerCount.toLocaleString("en-US") +
    " seller options · " +
    countryCount.toLocaleString("en-US") +
    " country contexts"
  );
}

export function CommercialBuyerConfirmationFormPreview({
  form,
  title = "Buyer confirmation request preview",
  description = "Read-only preview for registering an already completed external purchase confirmation request.",
}: CommercialBuyerConfirmationFormPreviewProps) {
  const selectedSeller = getSelectedSellerOrganization(form);
  const submitDisabled = isCommercialActionDisabled(form.submitActionState);
  const submitActionLabel = getCommercialActionStateLabel(form.submitActionState);
  const submitActionNotice = buildReadOnlyCommercialActionNotice(
    form.submitActionState,
  );
  const externalPurchaseAmountLabel = formatCommercialMoneyPreview(
    form.externalPurchaseAmountPreview,
    form.derivedCurrency,
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buyer confirmation form preview
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
        This preview does not create a confirmation request. Submit remains disabled until a future commercial write gate.
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Selected seller
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {selectedSeller ? selectedSeller.title : "No seller selected"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectedSeller
              ? selectedSeller.countryCode + " · " + selectedSeller.city
              : "Seller organization selection is preview-only."}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            External purchase amount
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {externalPurchaseAmountLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The platform records confirmation of an external purchase only.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Submit state
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {submitActionLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {submitDisabled ? "Submit disabled" : "Preview state only"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Proof requirement
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {form.proofRequirementLabel}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comment placeholder
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {form.commentPlaceholder}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Seller organization options
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {getSellerOptionSummary(form.sellerOrganizationOptions)}
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Selection preview only
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {form.sellerOrganizationOptions.map((organization) => {
            const isSelected = organization.id === form.selectedOrganizationId;

            return (
              <article
                className="rounded-xl border border-border bg-secondary/40 p-3"
                key={organization.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {organization.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {organization.countryCode} · {organization.city} · {organization.derivedCurrency}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                    {isSelected ? "Selected" : "Option"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {form.submitDisabledReason}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {submitActionNotice}
      </div>
    </section>
  );
}

