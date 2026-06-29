import type { Metadata } from "next";
import Link from "next/link";

import { ActualValueObjectsList } from "@/components/workspace/value-objects/actual-value-objects-list";
import { ValueObjectsPanel } from "@/components/workspace/value-objects/value-objects-panel";
import { getLocaleSearchParam, getValueObjectsMessage } from "@/i18n";

export const metadata: Metadata = {
  title: "Observation objects | AI Navigator",
  description:
    "Observation object list, tree, cloud, and detail preview.",
};

type ValueObjectsPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

function getPageLocaleSearchParams(localeValue: string | string[] | undefined) {
  const locale =
    Array.isArray(localeValue) ? localeValue[0] : localeValue;

  const searchParams = new URLSearchParams();

  if (locale) {
    searchParams.set("locale", locale);
  }

  return searchParams;
}

function buildLocaleAwareHref(pathname: string, locale: string) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export default async function ValueObjectsPage({
  searchParams,
}: ValueObjectsPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getLocaleSearchParam(
    getPageLocaleSearchParams(resolvedSearchParams?.locale),
  );

  const fixtureHref = buildLocaleAwareHref(
    "/value-objects/learning-business-german",
    locale,
  );

  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto flex max-w-7xl justify-end px-6 pt-6">
            <Link
              href={fixtureHref}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {getValueObjectsMessage("valueObjects.page.openFixture", locale)}
            </Link>
          </div>

          <div className="mx-auto max-w-7xl px-6 pt-6">
            <ActualValueObjectsList />
          </div>

          <ValueObjectsPanel />
        </div>
      </div>
    </div>
  );
}
