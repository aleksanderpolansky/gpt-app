import { normalizeLocale } from "@/i18n";
import PublicationEditClient from "./PublicationEditClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
};

export default async function PublicationEditPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PublicationEditClient id={id} locale={normalizeLocale(query.locale)} />;
}
