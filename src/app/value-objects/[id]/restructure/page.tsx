import Link from "next/link";

import { ValueObjectTreeRestructureManager } from "../../../../components/workspace/value-objects/value-object-tree-restructure-manager";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ locale?: string | string[] }>;
};

function resolveLocale(value: string | string[] | undefined): LocaleCode {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate === "pl" ||
    candidate === "ru" ||
    candidate === "uk" ||
    candidate === "de" ||
    candidate === "es" ||
    candidate === "cs"
    ? candidate
    : "en";
}

function buildLocaleHref(path: string, locale: LocaleCode) {
  return locale === "en" ? path : `${path}?locale=${encodeURIComponent(locale)}`;
}

export default async function ValueObjectTreeRestructurePage({
  params,
  searchParams,
}: Props) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ locale?: string | string[] }>({}),
  ]);
  const locale = resolveLocale(resolvedSearchParams.locale);
  const isRussian = locale === "ru" || locale === "uk";

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b5cf6]">
            P8 · controlled tree restructure
          </div>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[800px]">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {isRussian
                  ? "Безопасная перестройка дерева"
                  : "Safe Value Object tree restructure"}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {isRussian
                  ? "Сначала система показывает старый и новый путь, затрагиваемые поддеревья и причины запрета. Затем подтверждённая операция выполняется одной транзакцией и получает журнал для контролируемого отката."
                  : "The system first shows the old path, proposed path, affected subtrees and any blocking reason. A confirmed operation is then committed atomically and receives an audit record for guarded rollback."}
              </p>
            </div>
            <Link
              href={buildLocaleHref(`/value-objects/${id}`, locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {isRussian ? "Назад к объекту" : "Back to object"}
            </Link>
          </div>
        </header>

        <ValueObjectTreeRestructureManager valueObjectId={id} locale={locale} />
      </div>
    </main>
  );
}
