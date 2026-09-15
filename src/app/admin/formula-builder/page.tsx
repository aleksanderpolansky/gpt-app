"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type JsonRecord = Record<string, unknown>;

type FormulaVersion = {
  id: string;
  rule_series_id: string;
  version_no: number;
  expression_language_code: string;
  input_contract_json: unknown;
  condition_contract_json: unknown;
  expression_contract_json: unknown;
  trigger_contract_json: unknown;
  result_fact_role_code: "result" | "snapshot";
  result_unit_code: string | null;
  missing_input_policy_code: "insufficient_data" | "skip" | "fail";
  status_code:
    | "draft"
    | "testing"
    | "published"
    | "disabled"
    | "superseded"
    | "archived";
  metadata_json: unknown;
};

type FormulaSeries = {
  id: string;
  rule_code: string;
  scope_code: "system" | "user" | "organization";
  activity_template_id: string;
  source_value_object_id: string;
  source_parameter_definition_id: string;
  target_value_object_id: string;
  target_parameter_definition_id: string;
  status_code: string;
  versions: FormulaVersion[];
};

type RegistryResponse = {
  ok?: boolean;
  series?: FormulaSeries[];
  error?: string;
};

type ConfigureResponse = {
  ok?: boolean;
  error?: string;
  version?: FormulaVersion;
  formulaState?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  back: string;
  loading: string;
  notFound: string;
  rule: string;
  scope: string;
  version: string;
  status: string;
  source: string;
  target: string;
  resultUnit: string;
  inputs: string;
  inputsHelp: string;
  condition: string;
  conditionHelp: string;
  expression: string;
  expressionHelp: string;
  quickFormula: string;
  sourceOnly: string;
  multiply: string;
  divide: string;
  add: string;
  subtract: string;
  constant: string;
  applyQuick: string;
  triggers: string;
  resultRole: string;
  missingPolicy: string;
  save: string;
  saving: string;
  configured: string;
  validationNote: string;
  advancedNote: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Formula Builder",
    subtitle:
      "Configure a validated draft calculation rule. Publishing and execution remain disabled.",
    back: "Back to consequence constructor",
    loading: "Loading…",
    notFound: "Formula draft was not found.",
    rule: "Rule",
    scope: "Scope",
    version: "Version",
    status: "Status",
    source: "Source semantic address",
    target: "Target semantic address",
    resultUnit: "Result unit",
    inputs: "Inputs",
    inputsHelp:
      "JSON array of controlled input selectors. Required inputs must be used by the expression or condition.",
    condition: "Condition",
    conditionHelp:
      'Use {} for no condition or {"expression": AST} for a boolean condition.',
    expression: "Formula expression",
    expressionHelp:
      "Controlled arctor_formula_v1 AST. Arbitrary JavaScript/SQL is not accepted.",
    quickFormula: "Quick formula",
    sourceOnly: "source",
    multiply: "source × constant",
    divide: "source ÷ constant",
    add: "source + constant",
    subtract: "source − constant",
    constant: "Constant",
    applyQuick: "Apply",
    triggers: "Recalculation triggers",
    resultRole: "Result fact role",
    missingPolicy: "Missing input policy",
    save: "Validate and save configuration",
    saving: "Validating…",
    configured: "Draft configured successfully.",
    validationNote:
      "The server validates AST structure, input references, required inputs, source semantic address and result unit.",
    advancedNote:
      "This V1 combines simple quick patterns with an advanced JSON editor. A later UI can replace JSON editing without changing the rule contract.",
  },
  ru: {
    title: "Конструктор формулы",
    subtitle:
      "Настройка проверяемого черновика расчётного правила. Публикация и исполнение пока выключены.",
    back: "Назад в Конструктор последствий",
    loading: "Загрузка…",
    notFound: "Черновик формулы не найден.",
    rule: "Правило",
    scope: "Область",
    version: "Версия",
    status: "Состояние",
    source: "Исходный смысловой адрес",
    target: "Целевой смысловой адрес",
    resultUnit: "Единица результата",
    inputs: "Входные данные",
    inputsHelp:
      "JSON-массив контролируемых входов. Обязательные входы должны использоваться формулой или условием.",
    condition: "Условие",
    conditionHelp:
      'Оставьте {} без условия либо {"expression": AST} для логического условия.',
    expression: "Математическое выражение",
    expressionHelp:
      "Контролируемое дерево arctor_formula_v1. Произвольный JavaScript/SQL не допускается.",
    quickFormula: "Быстрая формула",
    sourceOnly: "исходное значение",
    multiply: "исходное × коэффициент",
    divide: "исходное ÷ коэффициент",
    add: "исходное + число",
    subtract: "исходное − число",
    constant: "Число",
    applyQuick: "Применить",
    triggers: "Когда пересчитывать",
    resultRole: "Роль результирующего факта",
    missingPolicy: "Если не хватает входных данных",
    save: "Проверить и сохранить настройку",
    saving: "Проверяем…",
    configured: "Черновик формулы успешно настроен.",
    validationNote:
      "Сервер проверяет структуру формулы, ссылки на входы, обязательные входы, исходный смысловой адрес и единицу результата.",
    advancedNote:
      "V1 сочетает простые готовые схемы и расширенный JSON-редактор. Позже JSON можно заменить визуальными блоками без изменения контракта правил.",
  },
  pl: {
    title: "Konstruktor formuły",
    subtitle:
      "Konfiguracja walidowanego szkicu reguły obliczeniowej. Publikacja i wykonanie pozostają wyłączone.",
    back: "Wróć do konstruktora konsekwencji",
    loading: "Ładowanie…",
    notFound: "Nie znaleziono szkicu formuły.",
    rule: "Reguła",
    scope: "Zakres",
    version: "Wersja",
    status: "Stan",
    source: "Źródłowy adres semantyczny",
    target: "Docelowy adres semantyczny",
    resultUnit: "Jednostka wyniku",
    inputs: "Dane wejściowe",
    inputsHelp: "Kontrolowana lista wejść JSON.",
    condition: "Warunek",
    conditionHelp: "Użyj {} bez warunku albo {\"expression\": AST}.",
    expression: "Wyrażenie formuły",
    expressionHelp: "Kontrolowany AST arctor_formula_v1.",
    quickFormula: "Szybka formuła",
    sourceOnly: "źródło",
    multiply: "źródło × stała",
    divide: "źródło ÷ stała",
    add: "źródło + stała",
    subtract: "źródło − stała",
    constant: "Stała",
    applyQuick: "Zastosuj",
    triggers: "Wyzwalacze przeliczenia",
    resultRole: "Rola faktu wynikowego",
    missingPolicy: "Brak danych wejściowych",
    save: "Sprawdź i zapisz",
    saving: "Sprawdzanie…",
    configured: "Szkic skonfigurowano.",
    validationNote: "Walidacja odbywa się po stronie serwera.",
    advancedNote: "V1 łączy szybkie wzorce z zaawansowanym edytorem JSON.",
  },
  uk: {
    title: "Конструктор формули",
    subtitle:
      "Налаштування перевірюваної чернетки розрахункового правила. Публікація та виконання вимкнені.",
    back: "Назад до Конструктора наслідків",
    loading: "Завантаження…",
    notFound: "Чернетку формули не знайдено.",
    rule: "Правило",
    scope: "Область",
    version: "Версія",
    status: "Стан",
    source: "Вихідна смислова адреса",
    target: "Цільова смислова адреса",
    resultUnit: "Одиниця результату",
    inputs: "Вхідні дані",
    inputsHelp: "Контрольований JSON-масив входів.",
    condition: "Умова",
    conditionHelp: "Використовуйте {} або {\"expression\": AST}.",
    expression: "Вираз формули",
    expressionHelp: "Контрольований AST arctor_formula_v1.",
    quickFormula: "Швидка формула",
    sourceOnly: "джерело",
    multiply: "джерело × стала",
    divide: "джерело ÷ стала",
    add: "джерело + стала",
    subtract: "джерело − стала",
    constant: "Стала",
    applyQuick: "Застосувати",
    triggers: "Тригери перерахунку",
    resultRole: "Роль результату",
    missingPolicy: "Якщо бракує даних",
    save: "Перевірити та зберегти",
    saving: "Перевірка…",
    configured: "Чернетку налаштовано.",
    validationNote: "Перевірка виконується на сервері.",
    advancedNote: "V1 поєднує швидкі схеми та розширений JSON-редактор.",
  },
  de: {
    title: "Formel-Builder",
    subtitle:
      "Konfiguration eines validierten Berechnungsentwurfs. Veröffentlichung und Ausführung bleiben deaktiviert.",
    back: "Zurück zum Folgen-Konstruktor",
    loading: "Laden…",
    notFound: "Formelentwurf nicht gefunden.",
    rule: "Regel",
    scope: "Bereich",
    version: "Version",
    status: "Status",
    source: "Quelladresse",
    target: "Zieladresse",
    resultUnit: "Ergebniseinheit",
    inputs: "Eingaben",
    inputsHelp: "Kontrollierte JSON-Eingabeliste.",
    condition: "Bedingung",
    conditionHelp: "Verwenden Sie {} oder {\"expression\": AST}.",
    expression: "Formelausdruck",
    expressionHelp: "Kontrollierter arctor_formula_v1 AST.",
    quickFormula: "Schnellformel",
    sourceOnly: "Quelle",
    multiply: "Quelle × Konstante",
    divide: "Quelle ÷ Konstante",
    add: "Quelle + Konstante",
    subtract: "Quelle − Konstante",
    constant: "Konstante",
    applyQuick: "Anwenden",
    triggers: "Neuberechnungs-Trigger",
    resultRole: "Ergebnisrolle",
    missingPolicy: "Fehlende Eingaben",
    save: "Prüfen und speichern",
    saving: "Prüfung…",
    configured: "Entwurf konfiguriert.",
    validationNote: "Die Validierung erfolgt serverseitig.",
    advancedNote: "V1 kombiniert Schnellmuster mit einem erweiterten JSON-Editor.",
  },
  es: {
    title: "Constructor de fórmula",
    subtitle:
      "Configuración de un borrador validado. La publicación y ejecución siguen desactivadas.",
    back: "Volver al constructor de consecuencias",
    loading: "Cargando…",
    notFound: "No se encontró el borrador.",
    rule: "Regla",
    scope: "Ámbito",
    version: "Versión",
    status: "Estado",
    source: "Dirección de origen",
    target: "Dirección de destino",
    resultUnit: "Unidad del resultado",
    inputs: "Entradas",
    inputsHelp: "Lista JSON controlada de entradas.",
    condition: "Condición",
    conditionHelp: "Use {} o {\"expression\": AST}.",
    expression: "Expresión de fórmula",
    expressionHelp: "AST controlado arctor_formula_v1.",
    quickFormula: "Fórmula rápida",
    sourceOnly: "origen",
    multiply: "origen × constante",
    divide: "origen ÷ constante",
    add: "origen + constante",
    subtract: "origen − constante",
    constant: "Constante",
    applyQuick: "Aplicar",
    triggers: "Disparadores de recálculo",
    resultRole: "Rol del resultado",
    missingPolicy: "Datos ausentes",
    save: "Validar y guardar",
    saving: "Validando…",
    configured: "Borrador configurado.",
    validationNote: "La validación se realiza en el servidor.",
    advancedNote: "V1 combina patrones rápidos con un editor JSON avanzado.",
  },
  cs: {
    title: "Konstruktor vzorce",
    subtitle:
      "Konfigurace ověřovaného návrhu výpočtového pravidla. Publikování a spuštění zůstávají vypnuté.",
    back: "Zpět do konstruktoru důsledků",
    loading: "Načítání…",
    notFound: "Návrh vzorce nebyl nalezen.",
    rule: "Pravidlo",
    scope: "Rozsah",
    version: "Verze",
    status: "Stav",
    source: "Zdrojová adresa",
    target: "Cílová adresa",
    resultUnit: "Jednotka výsledku",
    inputs: "Vstupy",
    inputsHelp: "Kontrolovaný JSON seznam vstupů.",
    condition: "Podmínka",
    conditionHelp: "Použijte {} nebo {\"expression\": AST}.",
    expression: "Výraz vzorce",
    expressionHelp: "Kontrolovaný AST arctor_formula_v1.",
    quickFormula: "Rychlý vzorec",
    sourceOnly: "zdroj",
    multiply: "zdroj × konstanta",
    divide: "zdroj ÷ konstanta",
    add: "zdroj + konstanta",
    subtract: "zdroj − konstanta",
    constant: "Konstanta",
    applyQuick: "Použít",
    triggers: "Spouštěče přepočtu",
    resultRole: "Role výsledku",
    missingPolicy: "Chybějící vstupy",
    save: "Ověřit a uložit",
    saving: "Ověřování…",
    configured: "Návrh nakonfigurován.",
    validationNote: "Validace probíhá na serveru.",
    advancedNote: "V1 kombinuje rychlé vzory s pokročilým JSON editorem.",
  },
};

const TRIGGERS = [
  "fact_created",
  "fact_corrected",
  "standard_changed",
  "time_boundary",
] as const;

type Trigger = (typeof TRIGGERS)[number];

function prettyJson(value: unknown, fallback: unknown) {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export default function AdminFormulaBuilderPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [versionId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("versionId")?.trim() ??
        "",
  );

  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const [series, setSeries] = useState<FormulaSeries | null>(null);
  const [version, setVersion] = useState<FormulaVersion | null>(null);
  const [inputsText, setInputsText] = useState("[]");
  const [conditionText, setConditionText] = useState("{}");
  const [expressionText, setExpressionText] = useState(
    '{\n  "op": "literal",\n  "value": null\n}',
  );
  const [triggers, setTriggers] = useState<Trigger[]>([
    "fact_created",
    "fact_corrected",
  ]);
  const [resultRole, setResultRole] = useState<"result" | "snapshot">("result");
  const [missingPolicy, setMissingPolicy] = useState<
    "insufficient_data" | "skip" | "fail"
  >("insufficient_data");
  const [quickMode, setQuickMode] = useState<
    "source" | "multiply" | "divide" | "add" | "subtract"
  >("multiply");
  const [constantValue, setConstantValue] = useState("1");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/formula-rules", {
        cache: "no-store",
      });
      const payload = (await response.json()) as RegistryResponse;

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      let matchedSeries: FormulaSeries | null = null;
      let matchedVersion: FormulaVersion | null = null;

      for (const item of payload.series ?? []) {
        const candidate =
          item.versions.find((ruleVersion) => ruleVersion.id === versionId) ??
          null;
        if (candidate) {
          matchedSeries = item;
          matchedVersion = candidate;
          break;
        }
      }

      if (!matchedSeries || !matchedVersion) {
        setSeries(null);
        setVersion(null);
        return;
      }

      setSeries(matchedSeries);
      setVersion(matchedVersion);
      setInputsText(prettyJson(matchedVersion.input_contract_json, []));
      setConditionText(prettyJson(matchedVersion.condition_contract_json, {}));
      setExpressionText(
        prettyJson(matchedVersion.expression_contract_json, {
          op: "literal",
          value: null,
        }),
      );

      const rawTriggers = Array.isArray(matchedVersion.trigger_contract_json)
        ? matchedVersion.trigger_contract_json
        : [];
      const knownTriggers = rawTriggers.filter(
        (value): value is Trigger =>
          typeof value === "string" &&
          TRIGGERS.includes(value as Trigger),
      );
      setTriggers(
        knownTriggers.length > 0
          ? knownTriggers
          : ["fact_created", "fact_corrected"],
      );
      setResultRole(matchedVersion.result_fact_role_code);
      setMissingPolicy(matchedVersion.missing_input_policy_code);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  function sourceInputKey() {
    try {
      const parsed = JSON.parse(inputsText) as unknown;
      if (!Array.isArray(parsed)) return null;

      const preferred = parsed.find(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          asRecord(item).kind === "source_fact" &&
          asRecord(item).required === true,
      );
      const first = preferred ?? parsed[0];
      if (!first || typeof first !== "object" || Array.isArray(first)) {
        return null;
      }
      const key = asRecord(first).key;
      return typeof key === "string" && key.trim() ? key.trim() : null;
    } catch {
      return null;
    }
  }

  function applyQuickFormula() {
    setError(null);
    setSuccess(null);

    const key = sourceInputKey();
    if (!key) {
      setError("FORMULA_BUILDER_SOURCE_INPUT_NOT_FOUND");
      return;
    }

    if (quickMode === "source") {
      setExpressionText(
        JSON.stringify({ op: "input", input: key }, null, 2),
      );
      return;
    }

    const numericValue = Number(constantValue);
    if (!Number.isFinite(numericValue)) {
      setError("FORMULA_BUILDER_CONSTANT_NOT_NUMERIC");
      return;
    }

    setExpressionText(
      JSON.stringify(
        {
          op: quickMode,
          args: [
            { op: "input", input: key },
            { op: "literal", value: numericValue },
          ],
        },
        null,
        2,
      ),
    );
  }

  function toggleTrigger(trigger: Trigger) {
    setTriggers((current) =>
      current.includes(trigger)
        ? current.filter((item) => item !== trigger)
        : [...current, trigger],
    );
  }

  async function save() {
    if (!version) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedInputs = JSON.parse(inputsText) as unknown;
      const parsedCondition = JSON.parse(conditionText) as unknown;
      const parsedExpression = JSON.parse(expressionText) as unknown;

      if (!Array.isArray(parsedInputs)) {
        throw new Error("FORMULA_BUILDER_INPUTS_MUST_BE_ARRAY");
      }
      if (
        !parsedCondition ||
        typeof parsedCondition !== "object" ||
        Array.isArray(parsedCondition)
      ) {
        throw new Error("FORMULA_BUILDER_CONDITION_MUST_BE_OBJECT");
      }
      if (
        !parsedExpression ||
        typeof parsedExpression !== "object" ||
        Array.isArray(parsedExpression)
      ) {
        throw new Error("FORMULA_BUILDER_EXPRESSION_MUST_BE_OBJECT");
      }
      if (triggers.length === 0) {
        throw new Error("FORMULA_BUILDER_TRIGGER_REQUIRED");
      }

      const response = await fetch("/api/admin/formula-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure_draft",
          ruleVersionId: version.id,
          inputs: parsedInputs,
          condition: parsedCondition,
          expression: parsedExpression,
          triggers,
          resultFactRole: resultRole,
          resultUnitCode: version.result_unit_code,
          missingInputPolicy: missingPolicy,
          curatorMetadata: {
            uiSurface: "admin_formula_builder_v1",
          },
        }),
      });

      const payload = (await response.json()) as ConfigureResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setSuccess(copy.configured);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  }

  const editable =
    version?.status_code === "draft" || version?.status_code === "testing";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <a
          href={`/admin/consequence-constructor?locale=${encodeURIComponent(locale)}`}
          className="text-sm font-medium text-[#3b6ef8] hover:underline"
        >
          ← {copy.back}
        </a>
      </div>

      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          {copy.subtitle}
        </p>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          {copy.validationNote}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p>
        ) : null}

        {!loading && (!series || !version) ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {copy.notFound}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        {series && version ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Info label={copy.rule} value={series.rule_code} />
              <Info label={copy.scope} value={series.scope_code} />
              <Info label={copy.version} value={`v${version.version_no}`} />
              <Info label={copy.status} value={version.status_code} />
              <Info
                label={copy.source}
                value={`${series.source_value_object_id} / ${series.source_parameter_definition_id}`}
              />
              <Info
                label={copy.target}
                value={`${series.target_value_object_id} / ${series.target_parameter_definition_id}`}
              />
              <Info
                label={copy.resultUnit}
                value={version.result_unit_code || "—"}
              />
            </div>

            <div className="rounded-xl border border-[#eceef5] p-4">
              <h2 className="text-sm font-semibold text-[#23263a]">
                {copy.quickFormula}
              </h2>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[220px]">
                  <select
                    value={quickMode}
                    onChange={(event) =>
                      setQuickMode(
                        event.target.value as
                          | "source"
                          | "multiply"
                          | "divide"
                          | "add"
                          | "subtract",
                      )
                    }
                    disabled={!editable || busy}
                    className="w-full rounded-lg border border-[#d8dced] bg-white px-3 py-2 text-sm"
                  >
                    <option value="source">{copy.sourceOnly}</option>
                    <option value="multiply">{copy.multiply}</option>
                    <option value="divide">{copy.divide}</option>
                    <option value="add">{copy.add}</option>
                    <option value="subtract">{copy.subtract}</option>
                  </select>
                </label>

                {quickMode !== "source" ? (
                  <label className="min-w-[150px] text-xs font-medium text-[#6b7280]">
                    {copy.constant}
                    <input
                      type="number"
                      step="any"
                      value={constantValue}
                      onChange={(event) => setConstantValue(event.target.value)}
                      disabled={!editable || busy}
                      className="mt-1 w-full rounded-lg border border-[#d8dced] px-3 py-2 text-sm text-[#23263a]"
                    />
                  </label>
                ) : null}

                <button
                  type="button"
                  onClick={applyQuickFormula}
                  disabled={!editable || busy}
                  className="rounded-lg border border-[#cfd5ea] px-3 py-2 text-sm font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.applyQuick}
                </button>
              </div>
            </div>

            <JsonEditor
              label={copy.inputs}
              help={copy.inputsHelp}
              value={inputsText}
              onChange={setInputsText}
              disabled={!editable || busy}
              rows={12}
            />

            <JsonEditor
              label={copy.condition}
              help={copy.conditionHelp}
              value={conditionText}
              onChange={setConditionText}
              disabled={!editable || busy}
              rows={8}
            />

            <JsonEditor
              label={copy.expression}
              help={copy.expressionHelp}
              value={expressionText}
              onChange={setExpressionText}
              disabled={!editable || busy}
              rows={14}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#eceef5] p-4">
                <h2 className="text-sm font-semibold text-[#23263a]">
                  {copy.triggers}
                </h2>
                <div className="mt-3 space-y-2">
                  {TRIGGERS.map((trigger) => (
                    <label
                      key={trigger}
                      className="flex items-center gap-2 text-sm text-[#4a4f6a]"
                    >
                      <input
                        type="checkbox"
                        checked={triggers.includes(trigger)}
                        onChange={() => toggleTrigger(trigger)}
                        disabled={!editable || busy}
                      />
                      {trigger}
                    </label>
                  ))}
                </div>
              </div>

              <label className="rounded-xl border border-[#eceef5] p-4 text-sm font-semibold text-[#23263a]">
                {copy.resultRole}
                <select
                  value={resultRole}
                  onChange={(event) =>
                    setResultRole(event.target.value as "result" | "snapshot")
                  }
                  disabled={!editable || busy}
                  className="mt-3 w-full rounded-lg border border-[#d8dced] bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="result">result</option>
                  <option value="snapshot">snapshot</option>
                </select>
              </label>

              <label className="rounded-xl border border-[#eceef5] p-4 text-sm font-semibold text-[#23263a]">
                {copy.missingPolicy}
                <select
                  value={missingPolicy}
                  onChange={(event) =>
                    setMissingPolicy(
                      event.target.value as
                        | "insufficient_data"
                        | "skip"
                        | "fail",
                    )
                  }
                  disabled={!editable || busy}
                  className="mt-3 w-full rounded-lg border border-[#d8dced] bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="insufficient_data">insufficient_data</option>
                  <option value="skip">skip</option>
                  <option value="fail">fail</option>
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {copy.advancedNote}
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={!editable || busy}
              className="rounded-lg bg-[#3b6ef8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#315fdc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? copy.saving : copy.save}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eceef5] bg-[#fbfbfe] px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8fa8]">
        {label}
      </div>
      <div className="mt-1 break-all text-sm text-[#303449]">{value}</div>
    </div>
  );
}

function JsonEditor({
  label,
  help,
  value,
  onChange,
  disabled,
  rows,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rows: number;
}) {
  return (
    <label className="block rounded-xl border border-[#eceef5] p-4">
      <div className="text-sm font-semibold text-[#23263a]">{label}</div>
      <div className="mt-1 text-xs leading-5 text-[#7c8099]">{help}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        spellCheck={false}
        className="mt-3 w-full rounded-lg border border-[#d8dced] bg-[#fbfbfe] px-3 py-2 font-mono text-xs leading-5 text-[#303449] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
