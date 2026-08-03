import { redirect } from "next/navigation";

import { normalizeGiftCertificateLocale } from "../../certificates/gift-certificate-copy";

type GiftCertificateDetailsPageProps = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

export default async function GiftCertificateDetailsPage({
  params,
  searchParams,
}: GiftCertificateDetailsPageProps) {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(resolvedSearchParams?.locale);
  const query = new URLSearchParams();

  if (locale !== "en") {
    query.set("locale", locale);
  }

  redirect(
    `/certificates/${encodeURIComponent(activityEventId)}?${query.toString()}`,
  );
}
