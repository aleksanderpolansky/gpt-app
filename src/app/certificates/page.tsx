import Link from "next/link";

import { type LocaleCode } from "@/i18n";

import {
  buildGiftCertificateLocaleHref,
  formatGiftCertificateDate,
  formatGiftCertificateMoney,
  formatGiftCertificatePoints,
  GIFT_CERTIFICATE_CATALOG_COPY,
  normalizeGiftCertificateLocale,
} from "./gift-certificate-copy";
import { listAvailableGiftCertificates } from "./gift-certificate-data";

export const dynamic = "force-dynamic";

type CertificatesPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

function formatReputation(value: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CertificatesPage({
  searchParams,
}: CertificatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(
    resolvedSearchParams?.locale,
  );
  const copy = GIFT_CERTIFICATE_CATALOG_COPY[locale];
  const certificates = await listAvailableGiftCertificates();

  return (
    <main className="min-h-screen bg-[#f0f2f7] p-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {copy.catalogEyebrow}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.03em]">
                {copy.catalogTitle}
              </h1>
              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#5a5f7a]">
                {copy.catalogSubtitle}
              </p>
            </div>
            <div className="rounded-xl bg-[#eef2ff] px-4 py-3 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#6574a6]">
                {copy.availableCount}
              </div>
              <div className="mt-1 text-[24px] font-bold text-[#3b6ef8]">
                {certificates.length}
              </div>
            </div>
          </div>
        </header>

        {certificates.length === 0 ? (
          <section className="mt-5 rounded-[22px] border border-dashed border-[#cbd5e1] bg-white p-6 text-[14px] font-semibold text-[#64748b] shadow-sm">
            {copy.noAvailable}
          </section>
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            {certificates.map((certificate) => (
              <article
                key={certificate.activityEventId}
                className="flex flex-col rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                      {certificate.objectKind === "service_type"
                        ? copy.service
                        : copy.product}
                    </div>
                    <h2 className="mt-2 text-[19px] font-bold">
                      {certificate.title}
                    </h2>
                    {certificate.description ? (
                      <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-[#5a5f7a]">
                        {certificate.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-[#f4fbf6] px-3 py-2 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#4f7b59]">
                      {copy.reputation}
                    </div>
                    <div className="mt-1 text-[18px] font-bold text-[#166534]">
                      {formatReputation(
                        certificate.providerReputation,
                        locale,
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {copy.provider}
                    </div>
                    <div className="mt-1 text-[13px] font-bold">
                      {certificate.providerDisplayName}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {copy.pointsPrice}
                    </div>
                    <div className="mt-1 text-[13px] font-bold text-[#3b6ef8]">
                      {formatGiftCertificatePoints(
                        certificate.pointsPrice,
                        locale,
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {copy.moneyRemainder}
                    </div>
                    <div className="mt-1 text-[13px] font-bold">
                      {formatGiftCertificateMoney(
                        certificate.moneyRemainder,
                        certificate.providerCurrency,
                        locale,
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#7c8099]">
                      {copy.validity}
                    </div>
                    <div className="mt-1 text-[12px] font-bold">
                      {formatGiftCertificateDate(
                        certificate.availableFrom,
                        locale,
                      )}{" "}
                      —{" "}
                      {formatGiftCertificateDate(
                        certificate.availableUntil,
                        locale,
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#eef0f5] pt-4">
                  <span className="text-[11px] text-[#7c8099]">
                    {copy.published}:{" "}
                    {certificate.publishedAt
                      ? new Intl.DateTimeFormat(
                          locale === "en" ? "en-US" : locale,
                          { dateStyle: "medium" },
                        ).format(new Date(certificate.publishedAt))
                      : "—"}
                  </span>
                  <Link
                    href={buildGiftCertificateLocaleHref(
                      `/certificates/${certificate.activityEventId}`,
                      locale,
                    )}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#315ed6]"
                  >
                    {copy.details}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
