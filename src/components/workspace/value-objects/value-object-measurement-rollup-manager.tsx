"use client";

import { useEffect, useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ParameterOption = {
  id: string;
  parameterCode: string;
  title: string;
  dimensionCode: string;
  canonicalUnitCode: string;
};

type CandidateOption = {
  id: string;
  title: string;
  canonicalKey: string | null;
  facetCode: string | null;
  objectKindCode: string | null;
};

type Configuration = {
  parameterDefinitionId: string;
  parameterCode: string;
  canonicalUnitCode: string;
  sourceValueObjectIds: string[];
  discrepancyToleranceAbsolute: number;
};

type ApiSuccess = {
  ok: true;
  target: {
    id: string;
    title: string;
    canonicalKey: string | null;
  };
  configuration: Configuration | null;
  candidates: CandidateOption[];
  parameters: ParameterOption[];
};

type Copy = {
  title: string;
  intro: string;
  ordinary: string;
  toggle: string;
  parameter: string;
  parameterHint: string;
  operator: string;
  operatorValue: string;
  sources: string;
  sourcesHint: string;
  allRequired: string;
  directPolicy: string;
  missingPolicy: string;
  tolerance: string;
  toleranceHint: string;
  save: string;
  saving: string;
  clear: string;
  clearing: string;
  saved: string;
  cleared: string;
  minimumSources: string;
  noSources: string;
  loading: string;
  fixedPolicies: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Detail rollup",
    intro:
      "Use only when one leaf is the total for more detailed sibling leaves of the same measurement. Ordinary leaves need no special role.",
    ordinary: "Ordinary leaf. No detail-rollup rule is configured.",
    toggle: "This leaf is the rollup target",
    parameter: "Universal parameter",
    parameterHint:
      "The parameter remains universal. Meaning comes from the observation objects.",
    operator: "Operation",
    operatorValue: "Sum",
    sources: "Detailed source leaves",
    sourcesHint:
      "Choose sibling leaves that together form this target. Source leaves are not marked with a separate component role.",
    allRequired: "All selected sources are required for derivation.",
    directPolicy:
      "If a direct total exists, it is used and the source sum is only checked.",
    missingPolicy: "Missing sources remain unknown; they are never treated as zero.",
    tolerance: "Allowed difference",
    toleranceHint: "In the canonical unit of the selected parameter.",
    save: "Save rollup target",
    saving: "Saving...",
    clear: "Remove rollup target",
    clearing: "Removing...",
    saved: "Rollup target saved.",
    cleared: "Rollup target removed. The leaf is ordinary again.",
    minimumSources: "Select at least two source leaves.",
    noSources: "No sibling leaf candidates are available.",
    loading: "Loading rollup settings...",
    fixedPolicies: "Fixed V1 rules",
  },
  pl: {
    title: "Agregacja poziomu szczegółowości",
    intro:
      "Używaj tylko wtedy, gdy jeden liść jest sumą bardziej szczegółowych liści tego samego pomiaru. Zwykłe liście nie wymagają specjalnej roli.",
    ordinary: "Zwykły liść. Nie skonfigurowano reguły agregacji szczegółów.",
    toggle: "Ten liść jest celem agregacji",
    parameter: "Parametr uniwersalny",
    parameterHint:
      "Parametr pozostaje uniwersalny. Znaczenie wynika z obiektów obserwacji.",
    operator: "Operacja",
    operatorValue: "Suma",
    sources: "Szczegółowe liście źródłowe",
    sourcesHint:
      "Wybierz liście równorzędne, które razem tworzą ten wynik. Liście źródłowe nie otrzymują osobnej roli component.",
    allRequired: "Do wyliczenia wymagane są wszystkie wybrane źródła.",
    directPolicy:
      "Jeśli istnieje wartość bezpośrednia, jest używana, a suma źródeł służy tylko do kontroli.",
    missingPolicy: "Brakujące źródła pozostają nieznane i nigdy nie są zerem.",
    tolerance: "Dopuszczalna różnica",
    toleranceHint: "W jednostce kanonicznej wybranego parametru.",
    save: "Zapisz cel agregacji",
    saving: "Zapisywanie...",
    clear: "Usuń cel agregacji",
    clearing: "Usuwanie...",
    saved: "Cel agregacji zapisany.",
    cleared: "Cel agregacji usunięty. Liść jest znów zwykły.",
    minimumSources: "Wybierz co najmniej dwa liście źródłowe.",
    noSources: "Brak dostępnych równorzędnych liści źródłowych.",
    loading: "Ładowanie ustawień agregacji...",
    fixedPolicies: "Stałe reguły V1",
  },
  ru: {
    title: "Агрегация детализации",
    intro:
      "Используйте только когда один лист является общим итогом для более детальных листов того же измерения. Обычным листам специальная роль не нужна.",
    ordinary: "Обычный лист. Правило агрегации детализации не настроено.",
    toggle: "Этот лист является rollup_target",
    parameter: "Универсальный параметр",
    parameterHint:
      "Параметр остаётся универсальным. Смысл задают объекты наблюдения.",
    operator: "Операция",
    operatorValue: "Сумма",
    sources: "Детальные листы-источники",
    sourcesHint:
      "Выберите равнозначные листы того же уровня, которые вместе образуют итог. Отдельный признак component у источников не создаётся.",
    allRequired: "Для расчёта нужны все выбранные источники.",
    directPolicy:
      "Если общий итог сообщён напрямую, используется он, а сумма источников служит проверкой.",
    missingPolicy:
      "Отсутствующие источники остаются неизвестными и никогда не превращаются в 0.",
    tolerance: "Допустимое расхождение",
    toleranceHint: "В канонической единице выбранного параметра.",
    save: "Сохранить rollup_target",
    saving: "Сохранение...",
    clear: "Убрать rollup_target",
    clearing: "Удаление...",
    saved: "Настройка rollup_target сохранена.",
    cleared: "Настройка удалена. Лист снова обычный.",
    minimumSources: "Выберите минимум два листа-источника.",
    noSources: "Нет доступных листов того же уровня.",
    loading: "Загрузка настройки агрегации...",
    fixedPolicies: "Фиксированные правила V1",
  },
  uk: {
    title: "Агрегація деталізації",
    intro:
      "Використовуйте лише коли один лист є загальним підсумком для детальніших листів того самого виміру. Звичайним листам спеціальна роль не потрібна.",
    ordinary: "Звичайний лист. Правило агрегації деталізації не налаштовано.",
    toggle: "Цей лист є rollup_target",
    parameter: "Універсальний параметр",
    parameterHint:
      "Параметр залишається універсальним. Зміст задають об’єкти спостереження.",
    operator: "Операція",
    operatorValue: "Сума",
    sources: "Детальні листи-джерела",
    sourcesHint:
      "Виберіть рівнозначні листи того самого рівня, які разом утворюють підсумок. Окрема роль component для джерел не створюється.",
    allRequired: "Для розрахунку потрібні всі вибрані джерела.",
    directPolicy:
      "Якщо загальний підсумок повідомлено напряму, використовується він, а сума джерел слугує перевіркою.",
    missingPolicy:
      "Відсутні джерела залишаються невідомими і ніколи не перетворюються на 0.",
    tolerance: "Допустиме відхилення",
    toleranceHint: "У канонічній одиниці вибраного параметра.",
    save: "Зберегти rollup_target",
    saving: "Збереження...",
    clear: "Прибрати rollup_target",
    clearing: "Видалення...",
    saved: "Налаштування rollup_target збережено.",
    cleared: "Налаштування видалено. Лист знову звичайний.",
    minimumSources: "Виберіть щонайменше два листи-джерела.",
    noSources: "Немає доступних листів того самого рівня.",
    loading: "Завантаження налаштувань агрегації...",
    fixedPolicies: "Фіксовані правила V1",
  },
  de: {
    title: "Detailaggregation",
    intro:
      "Nur verwenden, wenn ein Blatt die Gesamtsumme detaillierter gleichrangiger Blätter derselben Messung ist. Normale Blätter benötigen keine Sonderrolle.",
    ordinary: "Normales Blatt. Keine Detailaggregationsregel konfiguriert.",
    toggle: "Dieses Blatt ist das rollup_target",
    parameter: "Universeller Parameter",
    parameterHint:
      "Der Parameter bleibt universell. Die Bedeutung kommt aus den Beobachtungsobjekten.",
    operator: "Operation",
    operatorValue: "Summe",
    sources: "Detaillierte Quellblätter",
    sourcesHint:
      "Wählen Sie gleichrangige Blätter, die zusammen diesen Gesamtwert bilden. Für Quellen wird keine separate component-Rolle gespeichert.",
    allRequired: "Alle ausgewählten Quellen sind für die Ableitung erforderlich.",
    directPolicy:
      "Wenn ein direkter Gesamtwert vorhanden ist, wird er verwendet; die Quellsumme dient nur zur Prüfung.",
    missingPolicy:
      "Fehlende Quellen bleiben unbekannt und werden niemals als 0 behandelt.",
    tolerance: "Zulässige Abweichung",
    toleranceHint: "In der kanonischen Einheit des gewählten Parameters.",
    save: "rollup_target speichern",
    saving: "Speichern...",
    clear: "rollup_target entfernen",
    clearing: "Entfernen...",
    saved: "rollup_target wurde gespeichert.",
    cleared: "rollup_target entfernt. Das Blatt ist wieder normal.",
    minimumSources: "Wählen Sie mindestens zwei Quellblätter.",
    noSources: "Keine gleichrangigen Quellblätter verfügbar.",
    loading: "Aggregationseinstellungen werden geladen...",
    fixedPolicies: "Feste V1-Regeln",
  },
  es: {
    title: "Agregación de detalle",
    intro:
      "Úsalo solo cuando una hoja sea el total de hojas hermanas más detalladas de la misma medición. Las hojas normales no necesitan un rol especial.",
    ordinary: "Hoja normal. No hay una regla de agregación de detalle configurada.",
    toggle: "Esta hoja es el rollup_target",
    parameter: "Parámetro universal",
    parameterHint:
      "El parámetro sigue siendo universal. El significado proviene de los objetos de observación.",
    operator: "Operación",
    operatorValue: "Suma",
    sources: "Hojas fuente detalladas",
    sourcesHint:
      "Selecciona hojas hermanas que juntas formen este total. No se guarda un rol component separado en las fuentes.",
    allRequired: "Se requieren todas las fuentes seleccionadas para derivar el total.",
    directPolicy:
      "Si existe un total directo, se usa y la suma de las fuentes solo sirve para comprobarlo.",
    missingPolicy:
      "Las fuentes ausentes siguen siendo desconocidas y nunca se tratan como 0.",
    tolerance: "Diferencia permitida",
    toleranceHint: "En la unidad canónica del parámetro seleccionado.",
    save: "Guardar rollup_target",
    saving: "Guardando...",
    clear: "Eliminar rollup_target",
    clearing: "Eliminando...",
    saved: "rollup_target guardado.",
    cleared: "rollup_target eliminado. La hoja vuelve a ser normal.",
    minimumSources: "Selecciona al menos dos hojas fuente.",
    noSources: "No hay hojas hermanas disponibles.",
    loading: "Cargando configuración de agregación...",
    fixedPolicies: "Reglas V1 fijas",
  },
  cs: {
    title: "Agregace detailu",
    intro:
      "Použijte jen tehdy, když je jeden list celkovým součtem podrobnějších sourozeneckých listů stejného měření. Běžné listy zvláštní roli nepotřebují.",
    ordinary: "Běžný list. Není nastavena agregace detailu.",
    toggle: "Tento list je rollup_target",
    parameter: "Univerzální parametr",
    parameterHint:
      "Parametr zůstává univerzální. Význam určují objekty pozorování.",
    operator: "Operace",
    operatorValue: "Součet",
    sources: "Podrobné zdrojové listy",
    sourcesHint:
      "Vyberte sourozenecké listy, které společně tvoří tento celek. U zdrojů se neukládá samostatná role component.",
    allRequired: "Pro odvození jsou vyžadovány všechny vybrané zdroje.",
    directPolicy:
      "Pokud existuje přímá celková hodnota, použije se a součet zdrojů slouží jen ke kontrole.",
    missingPolicy:
      "Chybějící zdroje zůstávají neznámé a nikdy se nepovažují za 0.",
    tolerance: "Povolený rozdíl",
    toleranceHint: "V kanonické jednotce zvoleného parametru.",
    save: "Uložit rollup_target",
    saving: "Ukládání...",
    clear: "Odstranit rollup_target",
    clearing: "Odstraňování...",
    saved: "rollup_target uložen.",
    cleared: "rollup_target odstraněn. List je opět běžný.",
    minimumSources: "Vyberte alespoň dva zdrojové listy.",
    noSources: "Nejsou dostupné žádné sourozenecké listy.",
    loading: "Načítání nastavení agregace...",
    fixedPolicies: "Pevná pravidla V1",
  },
};

function normalizeLocale(locale: string): LocaleCode {
  return locale === "pl" ||
    locale === "ru" ||
    locale === "uk" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
    ? locale
    : "en";
}

function isSuccess(value: unknown): value is ApiSuccess {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { ok?: unknown }).ok === true,
  );
}

export function ValueObjectMeasurementRollupManager({
  valueObjectId,
  locale: rawLocale,
}: {
  valueObjectId: string;
  locale: string;
}) {
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];

  const [bundle, setBundle] = useState<ApiSuccess | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [parameterDefinitionId, setParameterDefinitionId] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [tolerance, setTolerance] = useState("1");
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const endpoint = `/api/admin/value-objects/${encodeURIComponent(
    valueObjectId,
  )}/measurement-rollup`;

  useEffect(() => {
    let cancelled = false;
    const loadEndpoint = `/api/admin/value-objects/${encodeURIComponent(
      valueObjectId,
    )}/measurement-rollup?locale=${encodeURIComponent(locale)}`;

    void fetch(loadEndpoint, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();

        if (!response.ok || !isSuccess(payload)) {
          const error =
            payload && typeof payload === "object"
              ? String(
                  (payload as {
                    errorMessage?: unknown;
                    error?: unknown;
                  }).errorMessage ??
                    (payload as { error?: unknown }).error ??
                    "Rollup settings load failed",
                )
              : "Rollup settings load failed";
          throw new Error(error);
        }

        return payload;
      })
      .then((payload) => {
        if (cancelled) return;

        setBundle(payload);
        const configuration = payload.configuration;
        setEnabled(Boolean(configuration));
        setSourceIds(configuration?.sourceValueObjectIds ?? []);
        setTolerance(
          String(configuration?.discrepancyToleranceAbsolute ?? 1),
        );

        const preferredParameterId =
          configuration?.parameterDefinitionId ??
          payload.parameters.find(
            (parameter) => parameter.parameterCode === "duration",
          )?.id ??
          payload.parameters[0]?.id ??
          "";

        setParameterDefinitionId(preferredParameterId);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [valueObjectId, locale]);

  const selectedParameter = useMemo(
    () =>
      bundle?.parameters.find(
        (parameter) => parameter.id === parameterDefinitionId,
      ) ?? null,
    [bundle, parameterDefinitionId],
  );

  function toggleSource(id: string) {
    setSourceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function save() {
    setMessage("");
    setErrorMessage("");

    if (!enabled) {
      setErrorMessage(copy.minimumSources);
      return;
    }

    if (sourceIds.length < 2) {
      setErrorMessage(copy.minimumSources);
      return;
    }

    const parsedTolerance = Number(tolerance);
    if (!Number.isFinite(parsedTolerance) || parsedTolerance < 0) {
      setErrorMessage(copy.tolerance);
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          parameterDefinitionId,
          sourceValueObjectIds: sourceIds,
          discrepancyToleranceAbsolute: parsedTolerance,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isSuccess(payload)) {
        throw new Error(
          payload && typeof payload === "object"
            ? String(
                (payload as { errorMessage?: unknown; error?: unknown })
                  .errorMessage ??
                  (payload as { error?: unknown }).error ??
                  "Rollup target save failed",
              )
            : "Rollup target save failed",
        );
      }

      setBundle(payload);
      setEnabled(true);
      setSourceIds(payload.configuration?.sourceValueObjectIds ?? []);
      setTolerance(
        String(
          payload.configuration?.discrepancyToleranceAbsolute ?? 1,
        ),
      );
      setParameterDefinitionId(
        payload.configuration?.parameterDefinitionId ??
          parameterDefinitionId,
      );
      setMessage(copy.saved);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setMessage("");
    setErrorMessage("");
    setBusy("clear");

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isSuccess(payload)) {
        throw new Error(
          payload && typeof payload === "object"
            ? String(
                (payload as { errorMessage?: unknown; error?: unknown })
                  .errorMessage ??
                  (payload as { error?: unknown }).error ??
                  "Rollup target clear failed",
              )
            : "Rollup target clear failed",
        );
      }

      setBundle(payload);
      setEnabled(false);
      setSourceIds([]);
      setTolerance("1");
      setMessage(copy.cleared);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(null);
    }
  }

  if (!bundle && !errorMessage) {
    return (
      <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <h2 className="text-[22px] font-bold text-[#111827]">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-[#7c8099]">{copy.loading}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
      <h2 className="text-[22px] font-bold text-[#111827]">
        {copy.title}
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5a5f7a]">
        {copy.intro}
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {errorMessage}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {bundle ? (
        <div className="mt-5 grid gap-5">
          {!bundle.configuration && !enabled ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {copy.ordinary}
            </p>
          ) : null}

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={enabled}
              disabled={busy !== null}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            {copy.toggle}
          </label>

          {enabled ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-900">
                  {copy.parameter}
                  <select
                    value={parameterDefinitionId}
                    disabled={busy !== null}
                    onChange={(event) =>
                      setParameterDefinitionId(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                  >
                    {bundle.parameters.map((parameter) => (
                      <option key={parameter.id} value={parameter.id}>
                        {parameter.title} · {parameter.parameterCode} ·{" "}
                        {parameter.canonicalUnitCode}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-normal leading-5 text-slate-500">
                    {copy.parameterHint}
                  </span>
                </label>

                <div className="grid content-start gap-2 text-sm">
                  <span className="font-semibold text-slate-900">
                    {copy.operator}
                  </span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    {copy.operatorValue}
                    {selectedParameter
                      ? ` · ${selectedParameter.canonicalUnitCode}`
                      : ""}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {copy.sources}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {copy.sourcesHint}
                </p>

                {bundle.candidates.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {copy.noSources}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {bundle.candidates.map((candidate) => (
                      <label
                        key={candidate.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sourceIds.includes(candidate.id)}
                          disabled={busy !== null}
                          onChange={() => toggleSource(candidate.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-semibold text-slate-900">
                            {candidate.title}
                          </span>
                          {candidate.canonicalKey ? (
                            <span className="mt-1 block text-xs text-slate-500">
                              {candidate.canonicalKey}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-900">
                {copy.tolerance}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tolerance}
                  disabled={busy !== null}
                  onChange={(event) => setTolerance(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                />
                <span className="text-xs font-normal text-slate-500">
                  {copy.toleranceHint}
                </span>
              </label>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">
                  {copy.fixedPolicies}
                </p>
                <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-700">
                  <li>{copy.allRequired}</li>
                  <li>{copy.directPolicy}</li>
                  <li>{copy.missingPolicy}</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    busy !== null ||
                    !parameterDefinitionId ||
                    sourceIds.length < 2
                  }
                  onClick={() => void save()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "save" ? copy.saving : copy.save}
                </button>

                {bundle.configuration ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void clear()}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-50"
                  >
                    {busy === "clear" ? copy.clearing : copy.clear}
                  </button>
                ) : null}
              </div>

              {sourceIds.length > 0 && sourceIds.length < 2 ? (
                <p className="text-sm text-amber-700">
                  {copy.minimumSources}
                </p>
              ) : null}
            </>
          ) : bundle.configuration ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void clear()}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-50"
              >
                {busy === "clear" ? copy.clearing : copy.clear}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
