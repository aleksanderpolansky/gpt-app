import Link from "next/link";

import { ValueObjectTargetReadPanel } from "@/components/workspace/value-objects/value-object-target-read-panel";

type ValueObjectStandardsDetailPageProps = {
  readonly params: Promise<{
    readonly id: string;
  }>;
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

function readLocale(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();

  return normalized ? normalized : null;
}

function withLocale(pathname: string, locale: string | null): string {
  return locale
    ? `${pathname}?locale=${encodeURIComponent(locale)}`
    : pathname;
}

export default async function ValueObjectStandardsDetailPage({
  params,
  searchParams,
}: ValueObjectStandardsDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const decodedValueObjectId = decodeURIComponent(id);
  const locale = readLocale(resolvedSearchParams?.locale);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={withLocale(
              `/value-objects/${encodeURIComponent(decodedValueObjectId)}`,
              locale,
            )}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Back to observation object
          </Link>
          <Link
            href="/activity-facts"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Activity Facts
          </Link>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            P7.2B1 · real read-only data
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Parameters and planned targets
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This page reads the active actor&apos;s real parameter assignments,
            current targets and version history for one activity observation
            leaf. It does not add, edit, archive or write any data.
          </p>
        </header>

        <ValueObjectTargetReadPanel
          valueObjectId={decodedValueObjectId}
        />
      </div>
    </main>
  );
}
