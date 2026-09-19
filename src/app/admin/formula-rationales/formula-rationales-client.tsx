"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Save,
  Search,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getLocaleSearchParam,
  type LocaleCode,
} from "@/i18n";
import {
  FORMULA_RATIONALE_SECTIONS,
  formulaRationaleRecordKey,
  type FormulaRationaleRecord,
  type FormulaRationaleSection,
} from "@/lib/formula-rationale/formula-rationale";

type FormulaVersion = {
  id: string;
  version_no: number;
  status_code: string;
  input_contract_json: unknown;
  condition_contract_json: unknown;
  expression_contract_json: unknown;
  result_fact_role_code: string;
  result_unit_code: string | null;
  missing_input_policy_code: string;
  metadata_json: unknown;
};

type FormulaSeries = {
  id: string;
  rule_code: string;
  scope_code: string;
  source_value_object_id: string;
  source_parameter_definition_id: string;
  target_value_object_id: string;
  target_parameter_definition_id: string;
  versions: FormulaVersion[];
};

type AdminPayload = {
  ok?: boolean;
  error?: string;
  canEdit?: boolean;
  series?: FormulaSeries[];
  content?: FormulaRationaleRecord[];
  localizationMode?: "manual";
  machineTranslation?: false;
  supportedLocales?: LocaleCode[];
};

type Copy = {
  title: string;
  subtitle: string;
  search: string;
  model: string;
  save: string;
  saving: string;
  saved: string;
  empty: string;
  loadError: string;
  translationNote: string;
  formula: string;
  version: string;
  status: string;
  unit: string;
  source: string;
  target: string;
  builder: string;
  userPreview: string;
  technical: string;
  scientific: string;
  sections: Record<
    FormulaRationaleSection,
    {
      title: string;
      placeholder: string;
    }
  >;
};

const COPY: Record<
  LocaleCode,
  Copy
> = {
  ru: {
    title:
      "Обоснования формул",
    subtitle:
      "Редактор пользовательских объяснений для каждой версии расчётной формулы ARCTor. Текст хранится отдельно от неизменяемого вычислительного контракта.",
    search:
      "Поиск по коду, версии, адресу или тексту…",
    model:
      "Редактируемая локализация",
    save:
      "Сохранить",
    saving:
      "Сохраняем…",
    saved:
      "Сохранено",
    empty:
      "Текст пока не заполнен.",
    loadError:
      "Не удалось загрузить обоснования формул.",
    translationNote:
      "Автоматический перевод через API отключён. Переключите язык интерфейса в правом верхнем углу, вставьте заранее подготовленный текст для этой локализации и сохраните его. Остальные языки не изменяются.",
    formula:
      "Формула",
    version:
      "Версия",
    status:
      "Состояние",
    unit:
      "Единица результата",
    source:
      "Исходный адрес",
    target:
      "Целевой адрес",
    builder:
      "Открыть конструктор формулы",
    userPreview:
      "Как рассчитано?",
    technical:
      "Технический контракт",
    scientific:
      "Научные константы и коэффициенты",
    sections: {
      summary: {
        title:
          "Что рассчитывает формула",
        placeholder:
          "Кратко объясните пользователю, какой показатель рассчитывается.",
      },
      method: {
        title:
          "Обоснование метода",
        placeholder:
          "Объясните, почему используются именно эти входы, операции, константы и коэффициенты.",
      },
      interpretation: {
        title:
          "Что означает результат",
        placeholder:
          "Опишите смысл результата, единицу измерения и границы интерпретации.",
      },
      limitations: {
        title:
          "Ограничения",
        placeholder:
          "Укажите, какие факторы модель пока не учитывает и где нельзя трактовать результат как прямое измерение.",
      },
      aggregation: {
        title:
          "Повторения и агрегирование",
        placeholder:
          "Поясните, как количество событий, время и последующая аналитика соотносятся с этим единичным расчётом.",
      },
    },
  },
  pl: {
    title: "Uzasadnienia formuł",
    subtitle:
      "Edytor wyjaśnień użytkownika dla każdej wersji formuły obliczeniowej ARCTor.",
    search:
      "Szukaj po kodzie, wersji, adresie lub tekście…",
    model: "Edytowana lokalizacja",
    save: "Zapisz",
    saving:
      "Zapisywanie…",
    saved: "Zapisano",
    empty:
      "Tekst nie został jeszcze uzupełniony.",
    loadError:
      "Nie udało się wczytać uzasadnień formuł.",
    translationNote:
      "Automatyczne tłumaczenie przez API jest wyłączone. Zmień język interfejsu, wklej przygotowany wcześniej tekst dla tej lokalizacji i zapisz. Pozostałe języki nie są zmieniane.",
    formula: "Formuła",
    version: "Wersja",
    status: "Stan",
    unit: "Jednostka wyniku",
    source: "Adres źródłowy",
    target: "Adres docelowy",
    builder:
      "Otwórz konstruktor formuły",
    userPreview:
      "Jak to obliczono?",
    technical:
      "Kontrakt techniczny",
    scientific:
      "Stałe naukowe i współczynniki",
    sections: {
      summary: {
        title:
          "Co oblicza formuła",
        placeholder:
          "Krótko opisz obliczany wskaźnik.",
      },
      method: {
        title:
          "Uzasadnienie metody",
        placeholder:
          "Wyjaśnij dobór danych, operacji, stałych i współczynników.",
      },
      interpretation: {
        title:
          "Co oznacza wynik",
        placeholder:
          "Opisz znaczenie wyniku i granice interpretacji.",
      },
      limitations: {
        title:
          "Ograniczenia",
        placeholder:
          "Wskaż nieuwzględnione czynniki i ograniczenia modelu.",
      },
      aggregation: {
        title:
          "Powtórzenia i agregacja",
        placeholder:
          "Wyjaśnij relację między pojedynczym obliczeniem a późniejszą agregacją.",
      },
    },
  },
  en: {
    title:
      "Formula rationales",
    subtitle:
      "User-facing explanations for every versioned ARCTor calculation formula.",
    search:
      "Search code, version, address, or text…",
    model:
      "Edited locale",
    save:
      "Save",
    saving:
      "Saving…",
    saved:
      "Saved",
    empty:
      "No text yet.",
    loadError:
      "Could not load formula rationales.",
    translationNote:
      "Automatic API translation is disabled. Switch the interface language, paste the prepared text for that locale, and save it. Other locales remain unchanged.",
    formula:
      "Formula",
    version:
      "Version",
    status:
      "Status",
    unit:
      "Result unit",
    source:
      "Source address",
    target:
      "Target address",
    builder:
      "Open Formula Builder",
    userPreview:
      "How was this calculated?",
    technical:
      "Technical contract",
    scientific:
      "Scientific constants and coefficients",
    sections: {
      summary: {
        title:
          "What the formula calculates",
        placeholder:
          "Briefly explain the calculated quantity.",
      },
      method: {
        title:
          "Method rationale",
        placeholder:
          "Explain the inputs, operations, constants, and coefficients.",
      },
      interpretation: {
        title:
          "What the result means",
        placeholder:
          "Explain the result, its unit, and interpretation limits.",
      },
      limitations: {
        title:
          "Limitations",
        placeholder:
          "State factors that the model does not yet account for.",
      },
      aggregation: {
        title:
          "Repetition and aggregation",
        placeholder:
          "Explain how a single calculation relates to later aggregation.",
      },
    },
  },
  es: {
    title: "Justificaciones de fórmulas",
    subtitle:
      "Explicaciones para el usuario de cada versión de fórmula de ARCTor.",
    search:
      "Buscar por código, versión, dirección o texto…",
    model: "Localización editada",
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado",
    empty: "Aún no hay texto.",
    loadError:
      "No se pudieron cargar las justificaciones.",
    translationNote:
      "La traducción automática por API está desactivada. Cambie el idioma de la interfaz, pegue el texto preparado para esa localización y guárdelo. Los demás idiomas no cambian.",
    formula: "Fórmula",
    version: "Versión",
    status: "Estado",
    unit: "Unidad del resultado",
    source: "Dirección de origen",
    target: "Dirección de destino",
    builder:
      "Abrir constructor de fórmula",
    userPreview:
      "¿Cómo se calculó?",
    technical:
      "Contrato técnico",
    scientific:
      "Constantes y coeficientes científicos",
    sections: {
      summary: {
        title: "Qué calcula la fórmula",
        placeholder:
          "Explique brevemente la magnitud calculada.",
      },
      method: {
        title:
          "Justificación del método",
        placeholder:
          "Explique entradas, operaciones, constantes y coeficientes.",
      },
      interpretation: {
        title:
          "Qué significa el resultado",
        placeholder:
          "Explique el significado y los límites de interpretación.",
      },
      limitations: {
        title: "Limitaciones",
        placeholder:
          "Indique los factores que el modelo aún no considera.",
      },
      aggregation: {
        title:
          "Repetición y agregación",
        placeholder:
          "Explique la relación con la agregación posterior.",
      },
    },
  },
  uk: {
    title:
      "Обґрунтування формул",
    subtitle:
      "Користувацькі пояснення для кожної версії розрахункової формули ARCTor.",
    search:
      "Пошук за кодом, версією, адресою або текстом…",
    model:
      "Редагована локалізація",
    save:
      "Зберегти",
    saving:
      "Зберігаємо…",
    saved:
      "Збережено",
    empty:
      "Текст ще не заповнено.",
    loadError:
      "Не вдалося завантажити обґрунтування.",
    translationNote:
      "Автоматичний переклад через API вимкнено. Змініть мову інтерфейсу, вставте підготовлений текст для цієї локалізації та збережіть. Інші мови не змінюються.",
    formula:
      "Формула",
    version:
      "Версія",
    status:
      "Стан",
    unit:
      "Одиниця результату",
    source:
      "Вихідна адреса",
    target:
      "Цільова адреса",
    builder:
      "Відкрити конструктор формули",
    userPreview:
      "Як це розраховано?",
    technical:
      "Технічний контракт",
    scientific:
      "Наукові константи та коефіцієнти",
    sections: {
      summary: {
        title:
          "Що розраховує формула",
        placeholder:
          "Коротко опишіть показник.",
      },
      method: {
        title:
          "Обґрунтування методу",
        placeholder:
          "Поясніть входи, операції, константи та коефіцієнти.",
      },
      interpretation: {
        title:
          "Що означає результат",
        placeholder:
          "Поясніть результат та межі його тлумачення.",
      },
      limitations: {
        title:
          "Обмеження",
        placeholder:
          "Вкажіть фактори, які модель ще не враховує.",
      },
      aggregation: {
        title:
          "Повторення й агрегація",
        placeholder:
          "Поясніть зв’язок одиничного розрахунку з подальшою агрегацією.",
      },
    },
  },
  de: {
    title:
      "Formelbegründungen",
    subtitle:
      "Nutzerverständliche Erläuterungen für jede Version einer ARCTor-Berechnungsformel.",
    search:
      "Nach Code, Version, Adresse oder Text suchen…",
    model:
      "Bearbeitete Lokalisierung",
    save:
      "Speichern",
    saving:
      "Speichern…",
    saved:
      "Gespeichert",
    empty:
      "Noch kein Text.",
    loadError:
      "Formelbegründungen konnten nicht geladen werden.",
    translationNote:
      "Die automatische API-Übersetzung ist deaktiviert. Wechseln Sie die Oberflächensprache, fügen Sie den vorbereiteten Text für diese Lokalisierung ein und speichern Sie ihn. Andere Sprachen bleiben unverändert.",
    formula:
      "Formel",
    version:
      "Version",
    status:
      "Status",
    unit:
      "Ergebniseinheit",
    source:
      "Quelladresse",
    target:
      "Zieladresse",
    builder:
      "Formel-Builder öffnen",
    userPreview:
      "Wie wurde das berechnet?",
    technical:
      "Technischer Vertrag",
    scientific:
      "Wissenschaftliche Konstanten und Koeffizienten",
    sections: {
      summary: {
        title:
          "Was die Formel berechnet",
        placeholder:
          "Beschreiben Sie kurz die berechnete Größe.",
      },
      method: {
        title:
          "Begründung der Methode",
        placeholder:
          "Erläutern Sie Eingaben, Operationen, Konstanten und Koeffizienten.",
      },
      interpretation: {
        title:
          "Was das Ergebnis bedeutet",
        placeholder:
          "Erläutern Sie Bedeutung und Interpretationsgrenzen.",
      },
      limitations: {
        title:
          "Einschränkungen",
        placeholder:
          "Nennen Sie Faktoren, die das Modell noch nicht berücksichtigt.",
      },
      aggregation: {
        title:
          "Wiederholung und Aggregation",
        placeholder:
          "Erläutern Sie den Bezug zur späteren Aggregation.",
      },
    },
  },
  cs: {
    title:
      "Odůvodnění vzorců",
    subtitle:
      "Uživatelská vysvětlení pro každou verzi výpočetního vzorce ARCTor.",
    search:
      "Hledat podle kódu, verze, adresy nebo textu…",
    model:
      "Upravovaná lokalizace",
    save:
      "Uložit",
    saving:
      "Ukládání…",
    saved:
      "Uloženo",
    empty:
      "Text zatím není vyplněn.",
    loadError:
      "Odůvodnění vzorců se nepodařilo načíst.",
    translationNote:
      "Automatický překlad přes API je vypnutý. Přepněte jazyk rozhraní, vložte připravený text pro danou lokalizaci a uložte jej. Ostatní jazyky se nemění.",
    formula:
      "Vzorec",
    version:
      "Verze",
    status:
      "Stav",
    unit:
      "Jednotka výsledku",
    source:
      "Zdrojová adresa",
    target:
      "Cílová adresa",
    builder:
      "Otevřít konstruktor vzorce",
    userPreview:
      "Jak to bylo vypočteno?",
    technical:
      "Technický kontrakt",
    scientific:
      "Vědecké konstanty a koeficienty",
    sections: {
      summary: {
        title:
          "Co vzorec počítá",
        placeholder:
          "Stručně popište počítanou veličinu.",
      },
      method: {
        title:
          "Odůvodnění metody",
        placeholder:
          "Vysvětlete vstupy, operace, konstanty a koeficienty.",
      },
      interpretation: {
        title:
          "Co výsledek znamená",
        placeholder:
          "Vysvětlete význam výsledku a meze interpretace.",
      },
      limitations: {
        title:
          "Omezení",
        placeholder:
          "Uveďte faktory, které model zatím nezohledňuje.",
      },
      aggregation: {
        title:
          "Opakování a agregace",
        placeholder:
          "Vysvětlete vztah k následné agregaci.",
      },
    },
  },
};

const FORMULA_RATIONALE_LOCALES: readonly LocaleCode[] = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

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

function pretty(
  value: unknown,
) {
  return JSON.stringify(
    value ?? null,
    null,
    2,
  );
}

function localeFromWindow() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "en" as LocaleCode;
  }

  return getLocaleSearchParam(
    new URLSearchParams(
      window.location.search,
    ),
  );
}

function selectedVersionFromWindow() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    new URLSearchParams(
      window.location.search,
    )
      .get("versionId")
      ?.trim() ??
    ""
  );
}

function sourceLabel(
  version: FormulaVersion,
) {
  if (
    !Array.isArray(
      version.input_contract_json,
    )
  ) {
    return null;
  }

  const preferred =
    version.input_contract_json.find(
      (item) =>
        asRecord(item).kind ===
        "source_fact",
    ) ??
    version.input_contract_json[0];

  const record =
    asRecord(preferred);

  const label =
    record.label;

  const key =
    record.key;

  if (
    typeof label === "string" &&
    label.trim()
  ) {
    return label.trim();
  }

  return (
    typeof key === "string" &&
    key.trim()
      ? key.trim()
      : null
  );
}

function contentKey(
  record: FormulaRationaleRecord,
) {
  return formulaRationaleRecordKey(
    record.ruleVersionId,
    record.section,
  );
}

export function FormulaRationalesClient() {
  const [
    locale,
    setLocale,
  ] =
    useState<LocaleCode>(
      "en",
    );

  const [
    payload,
    setPayload,
  ] =
    useState<AdminPayload | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    openVersions,
    setOpenVersions,
  ] =
    useState<Set<string>>(
      new Set(),
    );

  const [
    drafts,
    setDrafts,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    savingKey,
    setSavingKey,
  ] =
    useState<string | null>(
      null,
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    const nextLocale =
      localeFromWindow();

    setLocale(
      nextLocale,
    );

    const selected =
      selectedVersionFromWindow();

    if (selected) {
      setOpenVersions(
        new Set([
          selected,
        ]),
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/admin/formula-rationales",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await response.json() as AdminPayload;

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              `HTTP_${response.status}`,
          );
        }

        if (active) {
          setPayload(data);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "UNKNOWN",
          );
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const copy =
    COPY[locale] ??
    COPY.en;

  const contentByKey =
    useMemo(() => {
      const map =
        new Map<
          string,
          FormulaRationaleRecord
        >();

      for (
        const item
        of payload?.content ??
        []
      ) {
        map.set(
          contentKey(item),
          item,
        );
      }

      return map;
    }, [
      payload?.content,
    ]);

  const formulas =
    useMemo(() => {
      const rows =
        (
          payload?.series ??
          []
        )
          .flatMap(
            (series) =>
              series.versions.map(
                (version) => ({
                  series,
                  version,
                }),
              ),
          )
          .sort(
            (a, b) =>
              b.version.version_no -
                a.version.version_no ||
              a.series.rule_code.localeCompare(
                b.series.rule_code,
              ),
          );

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return rows;
      }

      return rows.filter(
        ({
          series,
          version,
        }) => {
          const rationale =
            FORMULA_RATIONALE_SECTIONS.map(
              (section) =>
                contentByKey
                  .get(
                    formulaRationaleRecordKey(
                      version.id,
                      section,
                    ),
                  )
                  ?.translations?.[
                  locale
                ] ??
                "",
            )
              .join(" ")
              .toLowerCase();

          return [
            series.rule_code,
            series.scope_code,
            series.source_value_object_id,
            series.source_parameter_definition_id,
            series.target_value_object_id,
            series.target_parameter_definition_id,
            version.id,
            String(
              version.version_no,
            ),
            version.status_code,
            version.result_unit_code ??
              "",
            sourceLabel(
              version,
            ) ??
              "",
            rationale,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      contentByKey,
      locale,
      payload?.series,
      search,
    ]);

  function draftKey(
    versionId: string,
    section: FormulaRationaleSection,
  ) {
    return `${versionId}:${section}:${locale}`;
  }

  function currentText(
    versionId: string,
    section: FormulaRationaleSection,
  ) {
    const localDraftKey =
      draftKey(
        versionId,
        section,
      );

    if (
      Object.prototype.hasOwnProperty.call(
        drafts,
        localDraftKey,
      )
    ) {
      return (
        drafts[
          localDraftKey
        ] ??
        ""
      );
    }

    return (
      contentByKey
        .get(
          formulaRationaleRecordKey(
            versionId,
            section,
          ),
        )
        ?.translations?.[
        locale
      ] ??
      ""
    );
  }

  function replaceContent(
    key: string,
    content: FormulaRationaleRecord,
  ) {
    setPayload(
      (current) =>
        current
          ? {
              ...current,
              content: [
                ...(
                  current.content ??
                  []
                ).filter(
                  (item) =>
                    contentKey(item) !==
                    key,
                ),
                content,
              ],
            }
          : current,
    );
  }

  async function save(
    versionId: string,
    section: FormulaRationaleSection,
  ) {
    const key =
      formulaRationaleRecordKey(
        versionId,
        section,
      );

    const sourceText =
      currentText(
        versionId,
        section,
      );

    setSavingKey(
      key,
    );

    setStatus(
      (current) => ({
        ...current,
        [key]: "",
      }),
    );

    try {
      const response =
        await fetch(
          "/api/admin/formula-rationales",
          {
            method:
              "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ruleVersionId:
                  versionId,
                section,
                sourceLocale:
                  locale,
                sourceText,
              }),
          },
        );

      const data =
        await response.json() as {
          ok?: boolean;
          error?: string;
          localizationMode?: "manual";
          machineTranslation?: false;
          content?: FormulaRationaleRecord;
        };

      if (
        !response.ok ||
        !data.ok ||
        !data.content
      ) {
        throw new Error(
          data.error ||
            `HTTP_${response.status}`,
        );
      }

      if (
        data.machineTranslation !==
        false
      ) {
        throw new Error(
          "FORMULA_RATIONALE_MANUAL_MODE_EXPECTED",
        );
      }

      replaceContent(
        key,
        data.content,
      );

      setDrafts(
        (current) => {
          const prefix =
            `${key}:`;

          return Object.fromEntries(
            Object.entries(
              current,
            ).filter(
              ([draftEntryKey]) =>
                !draftEntryKey.startsWith(
                  prefix,
                ),
            ),
          );
        },
      );

      setStatus(
        (current) => ({
          ...current,
          [key]:
            copy.saved,
        }),
      );
    } catch (cause) {
      setStatus(
        (current) => ({
          ...current,
          [key]:
            cause instanceof Error
              ? cause.message
              : "UNKNOWN",
        }),
      );
    } finally {
      setSavingKey(
        null,
      );
    }
  }

  function toggleVersion(
    versionId: string,
  ) {
    setOpenVersions(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            versionId,
          )
        ) {
          next.delete(
            versionId,
          );
        } else {
          next.add(
            versionId,
          );
        }

        return next;
      },
    );
  }

  if (
    !payload &&
    !error
  ) {
    return (
      <div className="p-8 text-sm text-[#7c8099]">
        <Loader2
          className="mr-2 inline animate-spin"
          size={16}
        />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {copy.loadError}
        <div className="mt-2 font-mono text-xs">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 p-5 lg:p-7">
      <section className="rounded-[22px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.22em] text-[#3b6ef8]">
              ARCTOR · FORMULA RATIONALE REGISTRY
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#111827]">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#7c8099]">
              {copy.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-[#dbe4ff] bg-[#eef2ff] px-4 py-3 text-xs text-[#4a4f6a]">
            <div className="font-bold text-[#3b6ef8]">
              {copy.model}
            </div>
            <div className="mt-1 font-semibold">
              {locale.toUpperCase()}
              {" · manual"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {
            copy.translationNote
          }
        </div>

        <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[#d8def0] bg-white px-3">
          <Search
            size={16}
            className="text-[#9ca3b8]"
          />
          <input
            value={search}
            onChange={
              (event) =>
                setSearch(
                  event.target.value,
                )
            }
            placeholder={
              copy.search
            }
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </section>

      <section className="space-y-3">
        {
          formulas.map(
            ({
              series,
              version,
            }) => {
              const open =
                openVersions.has(
                  version.id,
                ) ||
                Boolean(
                  search.trim(),
                );

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
                <article
                  key={
                    version.id
                  }
                  className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-[#f8f9fc]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleVersion(
                        version.id,
                      )
                    }
                    className="flex w-full items-start gap-3 bg-white px-5 py-4 text-left"
                  >
                    {
                      open
                        ? (
                            <ChevronDown
                              size={16}
                              className="mt-1"
                            />
                          )
                        : (
                            <ChevronRight
                              size={16}
                              className="mt-1"
                            />
                          )
                    }

                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] font-bold text-[#3b6ef8]">
                        {
                          series.rule_code
                        }
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-[#1a1d2e]">
                        {
                          sourceLabel(
                            version,
                          ) ??
                          copy.formula
                        }
                        {" · v"}
                        {
                          version.version_no
                        }
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 text-[10px] font-bold">
                      <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[#3b6ef8]">
                        {
                          version.status_code
                        }
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[#687089] ring-1 ring-[#e0e4ef]">
                        {
                          version.result_unit_code ??
                          "—"
                        }
                      </span>
                    </div>
                  </button>

                  {
                    open
                      ? (
                          <div className="space-y-4 p-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-xl border border-[#e1e5ee] bg-white p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a91a5]">
                                  {
                                    copy.version
                                  }
                                </div>
                                <div className="mt-1 text-sm font-bold">
                                  v
                                  {
                                    version.version_no
                                  }
                                </div>
                              </div>

                              <div className="rounded-xl border border-[#e1e5ee] bg-white p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a91a5]">
                                  {
                                    copy.status
                                  }
                                </div>
                                <div className="mt-1 text-sm font-bold">
                                  {
                                    version.status_code
                                  }
                                </div>
                              </div>

                              <div className="rounded-xl border border-[#e1e5ee] bg-white p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a91a5]">
                                  {
                                    copy.unit
                                  }
                                </div>
                                <div className="mt-1 text-sm font-bold">
                                  {
                                    version.result_unit_code ??
                                    "—"
                                  }
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white p-3">
                                <a
                                  href={`/admin/formula-builder?versionId=${encodeURIComponent(version.id)}&locale=${encodeURIComponent(locale)}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#3b6ef8] hover:underline"
                                >
                                  {
                                    copy.builder
                                  }
                                  <ExternalLink
                                    size={12}
                                  />
                                </a>

                                {
                                  version.status_code ===
                                  "published"
                                    ? (
                                        <a
                                          href={`/formula-rationale?ruleCode=${encodeURIComponent(series.rule_code)}&version=${encodeURIComponent(String(version.version_no))}&locale=${encodeURIComponent(locale)}`}
                                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                                        >
                                          {
                                            copy.userPreview
                                          }
                                          <ExternalLink
                                            size={12}
                                          />
                                        </a>
                                      )
                                    : null
                                }
                              </div>
                            </div>

                            <div className="grid gap-3 xl:grid-cols-2">
                              {
                                FORMULA_RATIONALE_SECTIONS.map(
                                  (
                                    section,
                                  ) => {
                                    const key =
                                      formulaRationaleRecordKey(
                                        version.id,
                                        section,
                                      );

                                    const value =
                                      currentText(
                                        version.id,
                                        section,
                                      );

                                    const contentRecord =
                                      contentByKey.get(
                                        key,
                                      );

                                    const exists =
                                      Boolean(
                                        contentRecord
                                          ?.translations?.[
                                          locale
                                        ]
                                          ?.trim(),
                                      );

                                    const coverageCount =
                                      FORMULA_RATIONALE_LOCALES.filter(
                                        (localeCode) =>
                                          Boolean(
                                            contentRecord
                                              ?.translations?.[
                                              localeCode
                                            ]
                                              ?.trim(),
                                          ),
                                      ).length;

                                    return (
                                      <section
                                        key={
                                          section
                                        }
                                        className="rounded-xl border border-[#dbe4ff] bg-[#fbfcff] p-3"
                                      >
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#38415d]">
                                          {
                                            copy.sections[
                                              section
                                            ].title
                                          }

                                          {
                                            exists
                                              ? (
                                                  <CheckCircle2
                                                    size={13}
                                                    className="ml-auto text-emerald-500"
                                                  />
                                                )
                                              : (
                                                  <span className="ml-auto text-[10px] font-medium text-[#9ca3b8]">
                                                    {
                                                      copy.empty
                                                    }
                                                  </span>
                                                )
                                          }
                                        </div>

                                        <div className="mb-2 flex flex-wrap gap-1">
                                          {
                                            FORMULA_RATIONALE_LOCALES.map(
                                              (localeCode) => {
                                                const filled =
                                                  Boolean(
                                                    contentRecord
                                                      ?.translations?.[
                                                      localeCode
                                                    ]
                                                      ?.trim(),
                                                  );

                                                return (
                                                  <span
                                                    key={
                                                      localeCode
                                                    }
                                                    className={
                                                      filled
                                                        ? "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                                                        : "rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400"
                                                    }
                                                  >
                                                    {localeCode.toUpperCase()}
                                                    {" "}
                                                    {filled ? "✓" : "—"}
                                                  </span>
                                                );
                                              },
                                            )
                                          }

                                          <span className="ml-auto px-1 py-1 text-[10px] font-semibold text-[#8a91a5]">
                                            {coverageCount}/7
                                          </span>
                                        </div>

                                        <textarea
                                          value={
                                            value
                                          }
                                          disabled={
                                            !payload?.canEdit ||
                                            savingKey ===
                                              key
                                          }
                                          onChange={
                                            (event) =>
                                              setDrafts(
                                                (
                                                  current,
                                                ) => ({
                                                  ...current,
                                                  [draftKey(
                                                    version.id,
                                                    section,
                                                  )]:
                                                    event.target.value,
                                                }),
                                              )
                                          }
                                          placeholder={
                                            copy.sections[
                                              section
                                            ].placeholder
                                          }
                                          className="min-h-[150px] w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2.5 text-sm leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-2 focus:ring-[#3b6ef8]/10 disabled:opacity-60"
                                        />

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                          <span className="min-w-0 truncate text-[10px] text-[#9ca3b8]">
                                            {
                                              status[
                                                key
                                              ] ??
                                              ""
                                            }
                                          </span>

                                          {
                                            payload?.canEdit
                                              ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void save(
                                                        version.id,
                                                        section,
                                                      )
                                                    }
                                                    disabled={
                                                      savingKey !==
                                                      null
                                                    }
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b6ef8] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#315ed8] disabled:cursor-wait disabled:opacity-60"
                                                  >
                                                    {
                                                      savingKey ===
                                                      key
                                                        ? (
                                                            <Loader2
                                                              size={14}
                                                              className="animate-spin"
                                                            />
                                                          )
                                                        : (
                                                            <Save
                                                              size={14}
                                                            />
                                                          )
                                                    }

                                                    {
                                                      savingKey ===
                                                      key
                                                        ? copy.saving
                                                        : copy.save
                                                    }
                                                  </button>
                                                )
                                              : null
                                          }
                                        </div>
                                      </section>
                                    );
                                  },
                                )
                              }
                            </div>

                            <details className="rounded-xl border border-[#e1e5ee] bg-white p-4">
                              <summary className="cursor-pointer text-xs font-extrabold text-[#30394a]">
                                {
                                  copy.technical
                                }
                              </summary>

                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a91a5]">
                                    {
                                      copy.source
                                    }
                                  </div>
                                  <div className="mt-1 break-all font-mono text-[11px]">
                                    {
                                      series.source_value_object_id
                                    }
                                    {" / "}
                                    {
                                      series.source_parameter_definition_id
                                    }
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a91a5]">
                                    {
                                      copy.target
                                    }
                                  </div>
                                  <div className="mt-1 break-all font-mono text-[11px]">
                                    {
                                      series.target_value_object_id
                                    }
                                    {" / "}
                                    {
                                      series.target_parameter_definition_id
                                    }
                                  </div>
                                </div>
                              </div>

                              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                                {
                                  pretty({
                                    inputs:
                                      version.input_contract_json,
                                    condition:
                                      version.condition_contract_json,
                                    expression:
                                      version.expression_contract_json,
                                  })
                                }
                              </pre>
                            </details>

                            <details className="rounded-xl border border-[#e1e5ee] bg-white p-4">
                              <summary className="cursor-pointer text-xs font-extrabold text-[#30394a]">
                                {
                                  copy.scientific
                                }
                                {" · "}
                                {
                                  constants.length
                                }
                              </summary>

                              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fb] p-3 text-[11px] leading-5 text-[#4b5563]">
                                {
                                  pretty(
                                    constants,
                                  )
                                }
                              </pre>
                            </details>
                          </div>
                        )
                      : null
                  }
                </article>
              );
            },
          )
        }
      </section>
    </div>
  );
}
