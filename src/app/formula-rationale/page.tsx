import {
  notFound,
} from "next/navigation";

import {
  auth0,
} from "../../../lib/auth0";
import {
  type LocaleCode,
} from "@/i18n";
import {
  FORMULA_RATIONALE_SECTIONS,
  formulaRationaleRecordKey,
} from "@/lib/formula-rationale/formula-rationale";
import {
  readFormulaRationalesForVersionIds,
} from "@/lib/formula-rationale/formula-rationale.server";
import {
  listFormulaRuleRegistryV1,
} from "@/lib/reality-curator/formula-rule-registry.server";

export const dynamic =
  "force-dynamic";

type SearchParams = {
  ruleCode?: string | string[];
  version?: string | string[];
  locale?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const SUPPORTED_LOCALES:
  LocaleCode[] = [
    "en",
    "pl",
    "ru",
    "uk",
    "de",
    "es",
    "cs",
  ];

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    formula: string;
    version: string;
    resultUnit: string;
    inputs: string;
    scientific: string;
    noRationale: string;
    sections: Record<
      (typeof FORMULA_RATIONALE_SECTIONS)[number],
      string
    >;
  }
> = {
  ru: {
    title:
      "Как рассчитано?",
    subtitle:
      "Объяснение конкретной версии расчётной формулы ARCTor.",
    formula:
      "Формула",
    version:
      "Версия",
    resultUnit:
      "Единица результата",
    inputs:
      "Используемые данные",
    scientific:
      "Научные константы и коэффициенты",
    noRationale:
      "Администратор пока не опубликовал текстовое обоснование этой версии формулы.",
    sections: {
      summary:
        "Что рассчитывает формула",
      method:
        "Обоснование метода",
      interpretation:
        "Что означает результат",
      limitations:
        "Ограничения",
      aggregation:
        "Повторения и агрегирование",
    },
  },
  pl: {
    title:
      "Jak to obliczono?",
    subtitle:
      "Wyjaśnienie konkretnej wersji formuły obliczeniowej ARCTor.",
    formula:
      "Formuła",
    version:
      "Wersja",
    resultUnit:
      "Jednostka wyniku",
    inputs:
      "Użyte dane",
    scientific:
      "Stałe naukowe i współczynniki",
    noRationale:
      "Administrator nie opublikował jeszcze opisu tej wersji formuły.",
    sections: {
      summary:
        "Co oblicza formuła",
      method:
        "Uzasadnienie metody",
      interpretation:
        "Co oznacza wynik",
      limitations:
        "Ograniczenia",
      aggregation:
        "Powtórzenia i agregacja",
    },
  },
  en: {
    title:
      "How was this calculated?",
    subtitle:
      "Explanation of the exact ARCTor calculation-formula version.",
    formula:
      "Formula",
    version:
      "Version",
    resultUnit:
      "Result unit",
    inputs:
      "Data used",
    scientific:
      "Scientific constants and coefficients",
    noRationale:
      "The administrator has not published a written rationale for this formula version yet.",
    sections: {
      summary:
        "What the formula calculates",
      method:
        "Method rationale",
      interpretation:
        "What the result means",
      limitations:
        "Limitations",
      aggregation:
        "Repetition and aggregation",
    },
  },
  es: {
    title:
      "¿Cómo se calculó?",
    subtitle:
      "Explicación de la versión exacta de la fórmula de ARCTor.",
    formula:
      "Fórmula",
    version:
      "Versión",
    resultUnit:
      "Unidad del resultado",
    inputs:
      "Datos utilizados",
    scientific:
      "Constantes y coeficientes científicos",
    noRationale:
      "El administrador aún no ha publicado la justificación de esta versión.",
    sections: {
      summary:
        "Qué calcula la fórmula",
      method:
        "Justificación del método",
      interpretation:
        "Qué significa el resultado",
      limitations:
        "Limitaciones",
      aggregation:
        "Repetición y agregación",
    },
  },
  uk: {
    title:
      "Як це розраховано?",
    subtitle:
      "Пояснення конкретної версії розрахункової формули ARCTor.",
    formula:
      "Формула",
    version:
      "Версія",
    resultUnit:
      "Одиниця результату",
    inputs:
      "Використані дані",
    scientific:
      "Наукові константи та коефіцієнти",
    noRationale:
      "Адміністратор ще не опублікував текстове обґрунтування цієї версії.",
    sections: {
      summary:
        "Що розраховує формула",
      method:
        "Обґрунтування методу",
      interpretation:
        "Що означає результат",
      limitations:
        "Обмеження",
      aggregation:
        "Повторення й агрегація",
    },
  },
  de: {
    title:
      "Wie wurde das berechnet?",
    subtitle:
      "Erläuterung der konkreten ARCTor-Formelversion.",
    formula:
      "Formel",
    version:
      "Version",
    resultUnit:
      "Ergebniseinheit",
    inputs:
      "Verwendete Daten",
    scientific:
      "Wissenschaftliche Konstanten und Koeffizienten",
    noRationale:
      "Für diese Formelversion wurde noch keine Begründung veröffentlicht.",
    sections: {
      summary:
        "Was die Formel berechnet",
      method:
        "Begründung der Methode",
      interpretation:
        "Was das Ergebnis bedeutet",
      limitations:
        "Einschränkungen",
      aggregation:
        "Wiederholung und Aggregation",
    },
  },
  cs: {
    title:
      "Jak to bylo vypočteno?",
    subtitle:
      "Vysvětlení konkrétní verze výpočetního vzorce ARCTor.",
    formula:
      "Vzorec",
    version:
      "Verze",
    resultUnit:
      "Jednotka výsledku",
    inputs:
      "Použitá data",
    scientific:
      "Vědecké konstanty a koeficienty",
    noRationale:
      "Administrátor zatím nezveřejnil odůvodnění této verze.",
    sections: {
      summary:
        "Co vzorec počítá",
      method:
        "Odůvodnění metody",
      interpretation:
        "Co výsledek znamená",
      limitations:
        "Omezení",
      aggregation:
        "Opakování a agregace",
    },
  },
};

function one(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

function normalizeLocale(
  value: string,
): LocaleCode {
  return SUPPORTED_LOCALES.includes(
    value as LocaleCode,
  )
    ? value as LocaleCode
    : "en";
}

function asRecord(
  value: unknown,
) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Record<
          string,
          unknown
        >
      : {}
  );
}

function parseVersion(
  value: string,
) {
  const normalized =
    value
      .trim()
      .replace(
        /^v/i,
        "",
      );

  const parsed =
    Number.parseInt(
      normalized,
      10,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function referenceHref(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    /^https?:\/\//i.test(
      trimmed,
    )
  ) {
    return trimmed;
  }

  const doi =
    trimmed.match(
      /^DOI:\s*(10\.\S+)$/i,
    );

  return doi?.[1]
    ? `https://doi.org/${doi[1]}`
    : null;
}

export default async function FormulaRationalePage(
  {
    searchParams,
  }: PageProps,
) {
  const session =
    await auth0.getSession();

  if (
    !session?.user?.sub
  ) {
    notFound();
  }

  const params =
    await searchParams;

  const ruleCode =
    one(
      params?.ruleCode,
    ).trim();

  const versionNo =
    parseVersion(
      one(
        params?.version,
      ),
    );

  const locale =
    normalizeLocale(
      one(
        params?.locale,
      )
        .trim()
        .toLowerCase(),
    );

  if (
    !ruleCode ||
    versionNo === null
  ) {
    notFound();
  }

  const registry =
    await listFormulaRuleRegistryV1();

  const series =
    registry.find(
      (item) =>
        item.rule_code ===
        ruleCode,
    );

  if (!series) {
    notFound();
  }

  const version =
    series.versions.find(
      (item) =>
        item.version_no ===
          versionNo &&
        item.status_code ===
          "published",
    );

  if (!version) {
    notFound();
  }

  const rationale =
    await readFormulaRationalesForVersionIds([
      version.id,
    ]);

  const byKey =
    new Map(
      rationale.map(
        (item) => [
          formulaRationaleRecordKey(
            item.ruleVersionId,
            item.section,
          ),
          item,
        ],
      ),
    );

  const copy =
    COPY[locale];

  const sectionRows =
    FORMULA_RATIONALE_SECTIONS.map(
      (section) => ({
        section,
        title:
          copy.sections[
            section
          ],
        text:
          byKey
            .get(
              formulaRationaleRecordKey(
                version.id,
                section,
              ),
            )
            ?.translations?.[
            locale
          ]
            ?.trim() ??
          "",
      }),
    );

  const hasRationale =
    sectionRows.some(
      (item) =>
        Boolean(
          item.text,
        ),
    );

  const inputs =
    Array.isArray(
      version.input_contract_json,
    )
      ? version.input_contract_json
      : [];

  const metadata =
    asRecord(
      version.metadata_json,
    );

  const constants =
    Array.isArray(
      metadata.scientificConstants,
    )
      ? metadata.scientificConstants
      : [];

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#eef2f7] px-4 py-6 text-[#101632] sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            ARCTOR · FORMULA EXPLANATION
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">
            {
              copy.title
            }
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-[#69708f]">
            {
              copy.subtitle
            }
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#7c8099]">
                {
                  copy.formula
                }
              </div>
              <div className="mt-2 break-words font-mono text-xs font-bold">
                {
                  series.rule_code
                }
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#7c8099]">
                {
                  copy.version
                }
              </div>
              <div className="mt-2 text-sm font-bold">
                v
                {
                  version.version_no
                }
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#7c8099]">
                {
                  copy.resultUnit
                }
              </div>
              <div className="mt-2 text-sm font-bold">
                {
                  version.result_unit_code ??
                  "—"
                }
              </div>
            </div>
          </div>
        </section>

        {
          hasRationale
            ? sectionRows.map(
                (
                  item,
                ) =>
                  item.text
                    ? (
                        <section
                          key={
                            item.section
                          }
                          className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6"
                        >
                          <h2 className="text-lg font-black">
                            {
                              item.title
                            }
                          </h2>
                          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[#4f5870]">
                            {
                              item.text
                            }
                          </p>
                        </section>
                      )
                    : null,
              )
            : (
                <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-medium leading-6 text-amber-900">
                  {
                    copy.noRationale
                  }
                </section>
              )
        }

        <section className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">
            {
              copy.inputs
            }
          </h2>

          <div className="mt-4 space-y-2">
            {
              inputs.map(
                (
                  item,
                  index,
                ) => {
                  const record =
                    asRecord(
                      item,
                    );

                  const label =
                    typeof record.label ===
                      "string" &&
                    record.label.trim()
                      ? record.label.trim()
                      : typeof record.key ===
                            "string"
                        ? record.key
                        : `#${index + 1}`;

                  return (
                    <div
                      key={
                        `${label}-${index}`
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="text-sm font-bold">
                        {
                          label
                        }
                      </div>
                      <div className="mt-1 text-xs text-[#69708f]">
                        {
                          [
                            record.kind,
                            record.selection,
                            record.window,
                          ]
                            .filter(
                              (
                                value,
                              ) =>
                                typeof value ===
                                  "string" &&
                                Boolean(
                                  value,
                                ),
                            )
                            .join(
                              " · ",
                            )
                        }
                      </div>
                    </div>
                  );
                },
              )
            }
          </div>
        </section>

        {
          constants.length >
          0
            ? (
                <section className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-black">
                    {
                      copy.scientific
                    }
                  </h2>

                  <div className="mt-4 space-y-3">
                    {
                      constants.map(
                        (
                          item,
                          index,
                        ) => {
                          const record =
                            asRecord(
                              item,
                            );

                          const label =
                            typeof record.label ===
                              "string" &&
                            record.label.trim()
                              ? record.label.trim()
                              : typeof record.key ===
                                    "string"
                                ? record.key
                                : `#${index + 1}`;

                          const href =
                            referenceHref(
                              record.sourceReference,
                            );

                          return (
                            <article
                              key={
                                `${label}-${index}`
                              }
                              className="rounded-2xl border border-slate-200 p-4"
                            >
                              <div className="font-bold">
                                {
                                  label
                                }
                              </div>

                              <div className="mt-1 font-mono text-sm text-blue-700">
                                {
                                  String(
                                    record.value ??
                                    "—",
                                  )
                                }
                                {
                                  typeof record.unitCode ===
                                    "string"
                                    ? ` ${record.unitCode}`
                                    : ""
                                }
                              </div>

                              {
                                typeof record.sourceTitle ===
                                  "string" &&
                                record.sourceTitle
                                  ? (
                                      <div className="mt-3 text-sm font-semibold text-[#4f5870]">
                                        {
                                          record.sourceTitle
                                        }
                                      </div>
                                    )
                                  : null
                              }

                              {
                                typeof record.sourceReference ===
                                  "string" &&
                                record.sourceReference
                                  ? href
                                    ? (
                                        <a
                                          href={
                                            href
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-1 block break-words text-sm font-semibold text-blue-700 hover:underline"
                                        >
                                          {
                                            record.sourceReference
                                          }
                                        </a>
                                      )
                                    : (
                                        <div className="mt-1 break-words text-sm text-[#69708f]">
                                          {
                                            record.sourceReference
                                          }
                                        </div>
                                      )
                                  : null
                              }

                              {
                                typeof record.applicability ===
                                  "string" &&
                                record.applicability
                                  ? (
                                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#69708f]">
                                        {
                                          record.applicability
                                        }
                                      </p>
                                    )
                                  : null
                              }
                            </article>
                          );
                        },
                      )
                    }
                  </div>
                </section>
              )
            : null
        }

        <details className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-black text-[#4f5870]">
            Technical formula
          </summary>

          <pre className="mt-4 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#f7f8fb] p-4 text-[11px] leading-5 text-[#4b5563]">
            {
              JSON.stringify(
                {
                  condition:
                    version.condition_contract_json,
                  expression:
                    version.expression_contract_json,
                },
                null,
                2,
              )
            }
          </pre>
        </details>
      </div>
    </main>
  );
}
