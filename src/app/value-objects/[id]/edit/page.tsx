import { redirect } from "next/navigation";

type ValueObjectEditPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

export default async function ValueObjectEditPage({
  params,
  searchParams,
}: ValueObjectEditPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const rawLocale = Array.isArray(resolvedSearchParams?.locale)
    ? resolvedSearchParams?.locale[0]
    : resolvedSearchParams?.locale;

  const query = new URLSearchParams({ mode: "edit" });

  if (rawLocale) {
    query.set("locale", rawLocale);
  }

  redirect(`/value-objects/${encodeURIComponent(id)}?${query.toString()}`);
}
