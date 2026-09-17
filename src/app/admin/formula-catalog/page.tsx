"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getLocaleSearchParam,
  type LocaleCode,
} from "@/i18n";

type ModelVersion = {
  id: string;
  model_series_id: string;
  version_no: number;
  expression_language_code: string;
  input_contract_json: unknown;
  expression_contract_json: unknown;
  output_contract_json: unknown;
  applicability_contract_json: unknown;
  evidence_contract_json: unknown;
  status_code: string;
  published_at: string | null;
};

type ModelSeries = {
  id: string;
  model_code: string;
  scope_code: string;
  title: string;
  description: string | null;
  category_code: string;
  visibility_code: string;
  status_code: string;
  versions: ModelVersion[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  scope?: string;
  models?: ModelSeries[];
};

type Scope =
  | "user"
  | "system";

const COPY = {
  ru: {
    title:
      "Формулы",
    subtitle:
      "Общий каталог версионных расчётных моделей ARCTor.",
    my:
      "Мои формулы",
    system:
      "Системные формулы",
    empty:
      "В этом разделе пока нет формул.",
    loading:
      "Загрузка…",
    error:
      "Не удалось загрузить каталог.",
    category:
      "Категория",
    visibility:
      "Видимость",
    version:
      "Версия",
    status:
      "Состояние",
    language:
      "Язык формулы",
    inputs:
      "Входы",
    output:
      "Выход",
    expression:
      "Формула",
    evidence:
      "Основание / доказательства",
    applicability:
      "Условия применимости",
    foundation:
      "Формула хранится отдельно от места её применения. Типовая активность, правило последствий или другой модуль впоследствии будут ссылаться на конкретную опубликованную версию.",
  },

  en: {
    title:
      "Formulas",
    subtitle:
      "Shared catalog of versioned ARCTor calculation models.",
    my:
      "My formulas",
    system:
      "System formulas",
    empty:
      "There are no formulas in this section yet.",
    loading:
      "Loading…",
    error:
      "Could not load the catalog.",
    category:
      "Category",
    visibility:
      "Visibility",
    version:
      "Version",
    status:
      "Status",
    language:
      "Formula language",
    inputs:
      "Inputs",
    output:
      "Output",
    expression:
      "Formula",
    evidence:
      "Evidence",
    applicability:
      "Applicability",
    foundation:
      "The formula is stored independently from its application. A typical activity, consequence rule, or another module can later reference a specific published version.",
  },
} as const;

function pretty(
  value: unknown,
) {
  return JSON.stringify(
    value,
    null,
    2,
  );
}

export default function FormulaCatalogPage() {
  const [
    locale,
  ] =
    useState<LocaleCode>(
      () =>
        typeof window ===
        "undefined"
          ? "en"
          : getLocaleSearchParam(
              new URLSearchParams(
                window.location.search,
              ),
            ),
    );

  const initialScope =
    typeof window !==
      "undefined" &&
    new URLSearchParams(
      window.location.search,
    ).get("scope") ===
      "user"
      ? "user"
      : "system";

  const [
    scope,
    setScope,
  ] =
    useState<Scope>(
      initialScope,
    );

  const [
    models,
    setModels,
  ] =
    useState<ModelSeries[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const copy =
    useMemo(
      () =>
        locale === "ru"
          ? COPY.ru
          : COPY.en,
      [locale],
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              `/api/admin/calculation-models?scope=${encodeURIComponent(scope)}`,
              {
                cache:
                  "no-store",
              },
            );

          const payload =
            (
              await response.json()
            ) as ApiResponse;

          if (
            !response.ok ||
            !payload.ok
          ) {
            throw new Error(
              payload.error ||
                `HTTP_${response.status}`,
            );
          }

          if (!cancelled) {
            setModels(
              payload.models ??
                [],
            );
          }
        }
        catch (loadError) {
          if (!cancelled) {
            setModels([]);
            setError(
              loadError instanceof Error
                ? loadError.message
                : String(loadError),
            );
          }
        }
        finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [scope],
  );

  function changeScope(
    next: Scope,
  ) {
    setScope(next);

    if (
      typeof window !==
      "undefined"
    ) {
      const url =
        new URL(
          window.location.href,
        );

      url.searchParams.set(
        "scope",
        next,
      );

      url.searchParams.set(
        "locale",
        locale,
      );

      window.history.replaceState(
        null,
        "",
        url.toString(),
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#dde3f0] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-[#1f2937]">
          {copy.title}
        </h1>

        <p className="mt-1 text-sm leading-6 text-[#6b7280]">
          {copy.subtitle}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              changeScope(
                "user",
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              scope === "user"
                ? "bg-[#3b6ef8] text-white"
                : "border border-[#d9dfeb] bg-white text-[#34405a]"
            }`}
          >
            {copy.my}
          </button>

          <button
            type="button"
            onClick={() =>
              changeScope(
                "system",
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              scope === "system"
                ? "bg-[#3b6ef8] text-white"
                : "border border-[#d9dfeb] bg-white text-[#34405a]"
            }`}
          >
            {copy.system}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[#d8e3ff] bg-[#f4f7ff] px-4 py-3 text-xs leading-5 text-[#41547a]">
          {copy.foundation}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-[#dde3f0] bg-white p-5 text-sm text-[#6b7280]">
          {copy.loading}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {copy.error}
          <div className="mt-2 font-mono text-xs">
            {error}
          </div>
        </div>
      ) : null}

      {!loading &&
      !error &&
      models.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-[#dde3f0] bg-white p-5 text-sm text-[#6b7280]">
          {copy.empty}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {models.map(
          (model) => {
            const version =
              model.versions[0] ??
              null;

            return (
              <article
                key={model.id}
                className="rounded-2xl border border-[#dde3f0] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[#20293a]">
                      {model.title}
                    </h2>

                    <div className="mt-1 font-mono text-xs text-[#778096]">
                      {model.model_code}
                    </div>
                  </div>

                  <div className="rounded-full border border-[#d8def0] bg-[#f8faff] px-3 py-1 text-xs font-bold text-[#58627a]">
                    {model.status_code}
                  </div>
                </div>

                {model.description ? (
                  <p className="mt-3 text-sm leading-6 text-[#596377]">
                    {model.description}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f8faff] p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#8790a4]">
                      {copy.category}
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#2d3748]">
                      {model.category_code}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f8faff] p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#8790a4]">
                      {copy.visibility}
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#2d3748]">
                      {model.visibility_code}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f8faff] p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#8790a4]">
                      {copy.version}
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#2d3748]">
                      {version
                        ? `v${version.version_no} · ${version.status_code}`
                        : "—"}
                    </div>
                  </div>
                </div>

                {version ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl border border-[#e1e5ee] p-4">
                      <div className="text-xs font-black text-[#30394a]">
                        {copy.inputs}
                      </div>

                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                        {pretty(
                          version.input_contract_json,
                        )}
                      </pre>
                    </section>

                    <section className="rounded-xl border border-[#e1e5ee] p-4">
                      <div className="text-xs font-black text-[#30394a]">
                        {copy.output}
                      </div>

                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                        {pretty(
                          version.output_contract_json,
                        )}
                      </pre>
                    </section>

                    <section className="rounded-xl border border-[#e1e5ee] p-4 lg:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-black text-[#30394a]">
                          {copy.expression}
                        </div>

                        <div className="font-mono text-[10px] text-[#6f7890]">
                          {
                            version.expression_language_code
                          }
                        </div>
                      </div>

                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                        {pretty(
                          version.expression_contract_json,
                        )}
                      </pre>
                    </section>

                    <section className="rounded-xl border border-[#e1e5ee] p-4">
                      <div className="text-xs font-black text-[#30394a]">
                        {copy.applicability}
                      </div>

                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                        {pretty(
                          version.applicability_contract_json,
                        )}
                      </pre>
                    </section>

                    <section className="rounded-xl border border-[#e1e5ee] p-4">
                      <div className="text-xs font-black text-[#30394a]">
                        {copy.evidence}
                      </div>

                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                        {pretty(
                          version.evidence_contract_json,
                        )}
                      </pre>
                    </section>
                  </div>
                ) : null}
              </article>
            );
          },
        )}
      </div>
    </main>
  );
}