"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type SnapshotOption = {
  assignmentId: string;
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  dimensionCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
  valueObjectId: string;
  valueObjectCanonicalKey: string;
  valueObjectTitle: string;
};

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  explanationTitle: string;
  explanationBody: string;
  explanationExamples: string;
  explanationNotSnapshot: string;
  targetHint: string;
  back: string;
  target: string;
  value: string;
  unit: string;
  effectiveAt: string;
  sourceText: string;
  sourceHint: string;
  submit: string;
  saving: string;
  loading: string;
  noOptions: string;
  success: string;
  openFacts: string;
  error: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    eyebrow: "STATE SNAPSHOT",
    title: "Add a state snapshot",
    subtitle:
      "A snapshot stores a user-reported state value at a specific moment using the existing system parameter assignment.",
    explanationTitle: "What is a state snapshot?",
    explanationBody:
      "A snapshot records the value of an observation object's property at a specific moment. It exists independently of a particular activity and can later be used in analytics and calculations.",
    explanationExamples:
      "Examples: body mass 96 kg, body temperature 36.6 °C, blood pressure 125 mmHg.",
    explanationNotSnapshot:
      "Not a snapshot: walk duration, exercise repetitions or floors climbed. Those values belong to a particular activity and are recorded as source facts.",
    targetHint:
      "Choose a property that describes the object's state at the selected moment, not the result of a particular action.",
    back: "Back to facts",
    target: "Observation object and parameter",
    value: "Value",
    unit: "Unit",
    effectiveAt: "State at",
    sourceText: "Source note",
    sourceHint: "Optional: e.g. Weighed myself: 96 kg",
    submit: "Confirm and save snapshot",
    saving: "Saving...",
    loading: "Loading available system assignments...",
    noOptions: "No eligible system assignment was found.",
    success: "Snapshot saved.",
    openFacts: "Open snapshot facts",
    error: "Could not save the snapshot.",
  },
  pl: {
    eyebrow: "PRZEKRÓJ STANU",
    title: "Dodaj przekrój stanu",
    subtitle:
      "Przekrój zapisuje zgłoszoną przez użytkownika wartość stanu na określony moment przez istniejące systemowe przypisanie parametru.",
    explanationTitle: "Czym jest przekrój stanu?",
    explanationBody:
      "Przekrój zapisuje wartość właściwości obiektu obserwacji w określonym momencie. Istnieje niezależnie od konkretnej aktywności i może być później użyty w analizach oraz obliczeniach.",
    explanationExamples:
      "Przykłady: masa ciała 96 kg, temperatura ciała 36,6 °C, ciśnienie tętnicze 125 mmHg.",
    explanationNotSnapshot:
      "Nie jest przekrojem: czas spaceru, liczba powtórzeń ćwiczenia ani liczba pokonanych pięter. Takie wartości należą do konkretnej aktywności i są zapisywane jako fakty źródłowe.",
    targetHint:
      "Wybierz właściwość opisującą stan obiektu w wybranym momencie, a nie wynik konkretnego działania.",
    back: "Wróć do faktów",
    target: "Obiekt obserwacji i parametr",
    value: "Wartość",
    unit: "Jednostka",
    effectiveAt: "Stan na",
    sourceText: "Notatka źródłowa",
    sourceHint: "Opcjonalnie: np. Ważyłem się: 96 kg",
    submit: "Potwierdź i zapisz przekrój",
    saving: "Zapisywanie...",
    loading: "Ładowanie dostępnych przypisań systemowych...",
    noOptions: "Nie znaleziono odpowiedniego przypisania systemowego.",
    success: "Przekrój zapisany.",
    openFacts: "Otwórz fakty-przekroje",
    error: "Nie udało się zapisać przekroju.",
  },
  ru: {
    eyebrow: "ФАКТ-СРЕЗ СОСТОЯНИЯ",
    title: "Добавить факт-срез состояния",
    subtitle:
      "Срез сохраняет сообщённое пользователем значение состояния на конкретный момент через существующее системное назначение параметра.",
    explanationTitle: "Что такое факт-срез состояния?",
    explanationBody:
      "Факт-срез фиксирует значение свойства объекта наблюдения на конкретный момент времени. Он существует независимо от отдельной активности и позднее может использоваться в аналитике и расчётах.",
    explanationExamples:
      "Примеры: масса тела — 96 кг, температура тела — 36,6 °C, артериальное давление — 125 мм рт. ст.",
    explanationNotSnapshot:
      "Не является фактом-срезом: продолжительность прогулки, количество повторений упражнения или число пройденных этажей. Такие значения относятся к конкретной активности и записываются как исходные факты.",
    targetHint:
      "Выберите свойство, значение которого характеризует состояние объекта на указанный момент, а не результат отдельного действия.",
    back: "Вернуться к фактам",
    target: "Объект наблюдения и параметр",
    value: "Значение",
    unit: "Единица",
    effectiveAt: "Состояние на момент",
    sourceText: "Исходная запись",
    sourceHint: "Необязательно: например «Взвесился: 96 кг»",
    submit: "Подтвердить и сохранить срез",
    saving: "Сохраняем...",
    loading: "Загружаем доступные системные назначения...",
    noOptions: "Подходящее системное назначение не найдено.",
    success: "Факт-срез сохранён.",
    openFacts: "Открыть факты-срезы",
    error: "Не удалось сохранить факт-срез.",
  },
  uk: {
    eyebrow: "ФАКТ-ЗРІЗ СТАНУ",
    title: "Додати факт-зріз стану",
    subtitle:
      "Зріз зберігає повідомлене користувачем значення стану на конкретний момент через чинне системне призначення параметра.",
    explanationTitle: "Що таке факт-зріз стану?",
    explanationBody:
      "Факт-зріз фіксує значення властивості об’єкта спостереження на конкретний момент часу. Він існує незалежно від окремої активності й надалі може використовуватися в аналітиці та розрахунках.",
    explanationExamples:
      "Приклади: маса тіла — 96 кг, температура тіла — 36,6 °C, артеріальний тиск — 125 мм рт. ст.",
    explanationNotSnapshot:
      "Не є фактом-зрізом: тривалість прогулянки, кількість повторень вправи або кількість пройдених поверхів. Такі значення належать до конкретної активності та записуються як вихідні факти.",
    targetHint:
      "Оберіть властивість, значення якої характеризує стан об’єкта у вказаний момент, а не результат окремої дії.",
    back: "Повернутися до фактів",
    target: "Об’єкт спостереження і параметр",
    value: "Значення",
    unit: "Одиниця",
    effectiveAt: "Стан на момент",
    sourceText: "Вихідний запис",
    sourceHint: "Необов’язково: наприклад «Зважився: 96 кг»",
    submit: "Підтвердити й зберегти зріз",
    saving: "Зберігаємо...",
    loading: "Завантажуємо доступні системні призначення...",
    noOptions: "Відповідне системне призначення не знайдено.",
    success: "Факт-зріз збережено.",
    openFacts: "Відкрити факти-зрізи",
    error: "Не вдалося зберегти факт-зріз.",
  },
  de: {
    eyebrow: "ZUSTANDSSCHNITT",
    title: "Zustandsschnitt hinzufügen",
    subtitle:
      "Ein Schnitt speichert einen vom Benutzer gemeldeten Zustandswert zu einem bestimmten Zeitpunkt über eine vorhandene Systemzuordnung.",
    explanationTitle: "Was ist ein Zustandsschnitt?",
    explanationBody:
      "Ein Zustandsschnitt erfasst den Wert einer Eigenschaft eines Beobachtungsobjekts zu einem bestimmten Zeitpunkt. Er besteht unabhängig von einer einzelnen Aktivität und kann später für Analysen und Berechnungen verwendet werden.",
    explanationExamples:
      "Beispiele: Körpermasse 96 kg, Körpertemperatur 36,6 °C, Blutdruck 125 mmHg.",
    explanationNotSnapshot:
      "Kein Zustandsschnitt sind Gehzeit, Wiederholungen einer Übung oder gestiegene Stockwerke. Solche Werte gehören zu einer konkreten Aktivität und werden als Quellfakten gespeichert.",
    targetHint:
      "Wählen Sie eine Eigenschaft, die den Zustand des Objekts zum angegebenen Zeitpunkt beschreibt, nicht das Ergebnis einer einzelnen Handlung.",
    back: "Zurück zu Fakten",
    target: "Beobachtungsobjekt und Parameter",
    value: "Wert",
    unit: "Einheit",
    effectiveAt: "Stand zum Zeitpunkt",
    sourceText: "Quellnotiz",
    sourceHint: "Optional: z. B. Gewogen: 96 kg",
    submit: "Bestätigen und speichern",
    saving: "Speichern...",
    loading: "Systemzuordnungen werden geladen...",
    noOptions: "Keine passende Systemzuordnung gefunden.",
    success: "Zustandsschnitt gespeichert.",
    openFacts: "Snapshot-Fakten öffnen",
    error: "Zustandsschnitt konnte nicht gespeichert werden.",
  },
  es: {
    eyebrow: "CORTE DE ESTADO",
    title: "Añadir corte de estado",
    subtitle:
      "Un corte guarda un valor de estado informado por el usuario en un momento concreto mediante una asignación de sistema existente.",
    explanationTitle: "¿Qué es un corte de estado?",
    explanationBody:
      "Un corte registra el valor de una propiedad de un objeto de observación en un momento concreto. Existe independientemente de una actividad específica y después puede utilizarse en análisis y cálculos.",
    explanationExamples:
      "Ejemplos: masa corporal 96 kg, temperatura corporal 36,6 °C, presión arterial 125 mmHg.",
    explanationNotSnapshot:
      "No es un corte: duración de una caminata, repeticiones de un ejercicio o pisos subidos. Esos valores pertenecen a una actividad concreta y se guardan como hechos fuente.",
    targetHint:
      "Elija una propiedad que describa el estado del objeto en el momento indicado, no el resultado de una acción concreta.",
    back: "Volver a hechos",
    target: "Objeto de observación y parámetro",
    value: "Valor",
    unit: "Unidad",
    effectiveAt: "Estado en",
    sourceText: "Nota de origen",
    sourceHint: "Opcional: p. ej. Me pesé: 96 kg",
    submit: "Confirmar y guardar corte",
    saving: "Guardando...",
    loading: "Cargando asignaciones del sistema...",
    noOptions: "No se encontró una asignación de sistema adecuada.",
    success: "Corte de estado guardado.",
    openFacts: "Abrir hechos de estado",
    error: "No se pudo guardar el corte.",
  },
  cs: {
    eyebrow: "SNÍMEK STAVU",
    title: "Přidat snímek stavu",
    subtitle:
      "Snímek uloží uživatelem oznámenou hodnotu stavu k určitému okamžiku pomocí existujícího systémového přiřazení.",
    explanationTitle: "Co je snímek stavu?",
    explanationBody:
      "Snímek stavu zaznamenává hodnotu vlastnosti objektu pozorování v konkrétním okamžiku. Existuje nezávisle na jednotlivé aktivitě a později může být použit v analýzách a výpočtech.",
    explanationExamples:
      "Příklady: tělesná hmotnost 96 kg, tělesná teplota 36,6 °C, krevní tlak 125 mmHg.",
    explanationNotSnapshot:
      "Snímkem není délka chůze, počet opakování cviku ani počet vystoupaných pater. Tyto hodnoty patří ke konkrétní aktivitě a ukládají se jako zdrojová fakta.",
    targetHint:
      "Vyberte vlastnost, která popisuje stav objektu v uvedeném okamžiku, nikoli výsledek jednotlivé činnosti.",
    back: "Zpět k faktům",
    target: "Objekt pozorování a parametr",
    value: "Hodnota",
    unit: "Jednotka",
    effectiveAt: "Stav k okamžiku",
    sourceText: "Zdrojová poznámka",
    sourceHint: "Volitelné: např. Zvážil jsem se: 96 kg",
    submit: "Potvrdit a uložit snímek",
    saving: "Ukládání...",
    loading: "Načítání systémových přiřazení...",
    noOptions: "Vhodné systémové přiřazení nebylo nalezeno.",
    success: "Snímek stavu uložen.",
    openFacts: "Otevřít snímky stavu",
    error: "Snímek stavu se nepodařilo uložit.",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value && value in COPY ? (value as Locale) : "en";
}

function localDateTimeValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function SnapshotCapturePageContent() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const copy = COPY[locale];

  const [options, setOptions] = useState<SnapshotOption[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(localDateTimeValue());
  const [sourceText, setSourceText] = useState("");
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successFactId, setSuccessFactId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/activity/facts/snapshots?locale=${encodeURIComponent(locale)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          options?: SnapshotOption[];
          errorMessage?: string;
        };

        if (!response.ok || payload.ok !== true) {
          throw new Error(payload.errorMessage || copy.error);
        }

        if (cancelled) return;

        const nextOptions = Array.isArray(payload.options)
          ? payload.options
          : [];

        setOptions(nextOptions);

        setAssignmentId("");
        setUnit("");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : copy.error,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [copy.error, locale]);

  const selectedOption = useMemo(
    () =>
      options.find((option) => option.assignmentId === assignmentId) ??
      null,
    [assignmentId, options],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOption || !value || !unit || !effectiveAt) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setErrorMessage(copy.error);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessFactId("");

    try {
      const response = await fetch("/api/activity/facts/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedOption.assignmentId,
          value: numericValue,
          unit,
          effectiveAt: new Date(effectiveAt).toISOString(),
          sourceText,
          clientRequestId,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        factId?: string;
        errorMessage?: string;
      };

      if (!response.ok || payload.ok !== true || !payload.factId) {
        throw new Error(payload.errorMessage || copy.error);
      }

      setSuccessFactId(payload.factId);
      setClientRequestId(crypto.randomUUID());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.error,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#eef2f7] px-4 py-6 text-[#101632] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section className="rounded-[32px] border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-emerald-600">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#69708f]">
            {copy.subtitle}
          </p>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900">
              {copy.explanationTitle}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-emerald-950/80">
              {copy.explanationBody}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-emerald-900">
              {copy.explanationExamples}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-emerald-950/80">
              {copy.explanationNotSnapshot}
            </p>
          </div>

          <Link
            href={`/activity-facts?locale=${locale}`}
            className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← {copy.back}
          </Link>
        </section>

        <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm font-bold text-[#69708f]">
              {copy.loading}
            </p>
          ) : options.length === 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              {copy.noOptions}
            </p>
          ) : (
            <form className="grid gap-5" onSubmit={submit}>
              <label className="grid gap-2">
                <span className="text-sm font-black">{copy.target}</span>
                <span className="text-xs font-medium leading-5 text-[#69708f]">
                  {copy.targetHint}
                </span>
                <select
                  value={assignmentId}
                  onChange={(event) => {
                    const nextAssignmentId = event.target.value;
                    setAssignmentId(nextAssignmentId);
                    const nextOption =
                      options.find(
                        (option) => option.assignmentId === nextAssignmentId,
                      ) ?? null;
                    setUnit(nextOption?.canonicalUnitCode ?? "");
                  }}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-400"
                  required
                >
                  <option value="">—</option>
                  {options.map((option) => (
                    <option
                      key={option.assignmentId}
                      value={option.assignmentId}
                    >
                      {option.valueObjectTitle} · {option.parameterTitle}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black">{copy.value}</span>
                  <input
                    type="number"
                    step="any"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-blue-400"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black">{copy.unit}</span>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-400"
                    required
                  >
                    {(selectedOption?.allowedUnitCodes ?? []).map(
                      (unitCode) => (
                        <option key={unitCode} value={unitCode}>
                          {unitCode}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black">{copy.effectiveAt}</span>
                <input
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(event) => setEffectiveAt(event.target.value)}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-blue-400"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black">{copy.sourceText}</span>
                <input
                  type="text"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder={copy.sourceHint}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-blue-400"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
                  {errorMessage}
                </div>
              ) : null}

              {successFactId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  <p>{copy.success}</p>
                  <Link
                    href={`/activity-facts?factRoleCode=snapshot&locale=${locale}`}
                    className="mt-2 inline-flex underline"
                  >
                    {copy.openFacts}
                  </Link>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving || !selectedOption}
                className="min-h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? copy.saving : copy.submit}
              </button>
            </form>
          )}

          {!loading && errorMessage && options.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
              {errorMessage}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SnapshotCapturePage() {
  return (
    <Suspense fallback={null}>
      <SnapshotCapturePageContent />
    </Suspense>
  );
}
