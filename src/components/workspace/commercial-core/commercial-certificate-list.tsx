import type { CertificateSummary } from "./commercial-core.types";
import { CommercialCertificateCard } from "./commercial-certificate-card";

type CommercialCertificateListProps = {
  readonly certificates: readonly CertificateSummary[];
  readonly title?: string;
  readonly description?: string;
  readonly emptyMessage?: string;
  readonly footerNote?: string;
};

function getCertificateListSummary(
  certificates: readonly CertificateSummary[],
): string {
  const certificateCount = certificates.length;
  const availableCount = certificates.filter(
    (certificate) => certificate.availabilityStatus === "available-preview",
  ).length;
  const futureGatedCount = certificates.filter(
    (certificate) =>
      certificate.availabilityStatus === "future-gated" ||
      certificate.actionState === "future-gated",
  ).length;
  const pointsRequiredTotal = certificates.reduce(
    (sum, certificate) => sum + Math.max(0, Math.round(certificate.pointsRequired)),
    0,
  );

  return (
    certificateCount.toLocaleString("en-US") +
    " certificates · " +
    availableCount.toLocaleString("en-US") +
    " available · " +
    futureGatedCount.toLocaleString("en-US") +
    " future-gated · " +
    pointsRequiredTotal.toLocaleString("en-US") +
    " pts preview"
  );
}

export function CommercialCertificateList({
  certificates,
  title = "Certificates",
  description = "Read-only certificate catalog with face value, buyer money part, seller money part and points burn preview.",
  emptyMessage = "No certificate fixtures are available for this read-only preview.",
  footerNote = "Certificate records are fixture-first. Spending points requires a future commercial write gate.",
}: CommercialCertificateListProps) {
  const hasCertificates = certificates.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial certificate catalog
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
        {getCertificateListSummary(certificates)}
      </div>

      {hasCertificates ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {certificates.map((certificate) => (
            <CommercialCertificateCard
              certificate={certificate}
              footerNote={footerNote}
              key={certificate.id}
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

