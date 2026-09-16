"use client";

import { useMemo, useState } from "react";

import type { LocaleCode } from "@/i18n";

type JsonRecord = Record<string, unknown>;

type TestResponse = {
  ok?: boolean;
  error?: string;
  noWrite?: boolean;
  evaluationStatus?: string;
  output?: unknown;
  targetUnitCode?: string;
  testPassed?: boolean;
  publishEligibleFromThisTest?: boolean;
  unitAlgebra?: unknown;
  missingRequiredInputs?: string[];
};

type PublishReadiness = {
  ready?: boolean;
  reasons?: string[];
  evidenceState?: string;
  evidenceRecordedAt?: string | null;
  formulaFingerprint?: string;
  publishEnabled?: boolean;
};

type EvidenceResponse = {
  ok?: boolean;
  error?: string;
  evidence?: unknown;
  readiness?: PublishReadiness;
};

type ReadinessResponse = PublishReadiness & {
  ok?: boolean;
  error?: string;
};

type Copy = {
  title: string;
  intro: string;
  inputs: string;
  help: string;
  run: string;
  running: string;
  configureFirst: string;
  savedOnly: string;
  status: string;
  output: string;
  algebra: string;
  targetUnit: string;
  passed: string;
  noWrite: string;
  publish: string;
  yes: string;
  no: string;
  none: string;
  governanceTitle: string;
  evidenceState: string;
  evidenceRecordedAt: string;
  recordEvidence: string;
  recordingEvidence: string;
  recordEvidenceHelp: string;
  checkReadiness: string;
  checkingReadiness: string;
  readiness: string;
  readinessReasons: string;
  ready: string;
  notReady: string;
  evidenceSaved: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "No-write formula test",
    intro: "Run the last saved formula on explicit sample values. No user facts are read and nothing is written.",
    inputs: "Sample input values",
    help: "JSON object: input key → test value. Replace null placeholders before running.",
    run: "Run no-write test",
    running: "Testing…",
    configureFirst: "Save a valid formula configuration first.",
    savedOnly: "The test uses the last saved configuration, not unsaved editor changes.",
    status: "Evaluation status",
    output: "Calculated output",
    algebra: "Unit algebra",
    targetUnit: "Target unit",
    passed: "Test passed",
    noWrite: "No database write",
    publish: "Publish enabled",
    yes: "Yes",
    no: "No",
    none: "No test result yet.",
    governanceTitle: "Test evidence and publish readiness",
    evidenceState: "Evidence state",
    evidenceRecordedAt: "Evidence recorded",
    recordEvidence: "Record test evidence",
    recordingEvidence: "Recording evidence…",
    recordEvidenceHelp: "Runs the same no-write test again and stores only hashes and governance metadata when it passes.",
    checkReadiness: "Check publish readiness",
    checkingReadiness: "Checking readiness…",
    readiness: "Publish readiness",
    readinessReasons: "Blocking reasons",
    ready: "Ready for future publish gate",
    notReady: "Not ready",
    evidenceSaved: "Test evidence recorded.",
  },
  ru: {
    title: "Проверка формулы без записи",
    intro: "Запускает последнюю сохранённую формулу на явно заданных пробных значениях. Факты пользователя не читаются, ничего не записывается.",
    inputs: "Пробные входные значения",
    help: "JSON-объект: ключ входа → пробное значение. Перед запуском замените null.",
    run: "Запустить тест без записи",
    running: "Проверяем…",
    configureFirst: "Сначала сохраните корректно настроенную формулу.",
    savedOnly: "Тестируется последняя сохранённая настройка, а не несохранённые изменения.",
    status: "Результат выполнения",
    output: "Рассчитанное значение",
    algebra: "Проверка размерности",
    targetUnit: "Целевая единица",
    passed: "Тест пройден",
    noWrite: "Запись в базу отсутствует",
    publish: "Публикация разрешена",
    yes: "Да",
    no: "Нет",
    none: "Тест ещё не запускался.",
    governanceTitle: "Доказательство теста и готовность к публикации",
    evidenceState: "Состояние доказательства",
    evidenceRecordedAt: "Доказательство записано",
    recordEvidence: "Зафиксировать доказательство теста",
    recordingEvidence: "Фиксируем доказательство…",
    recordEvidenceHelp: "Повторно запускает тот же тест без записи и при успехе сохраняет только хэши и служебные данные проверки.",
    checkReadiness: "Проверить готовность к публикации",
    checkingReadiness: "Проверяем готовность…",
    readiness: "Готовность к публикации",
    readinessReasons: "Причины блокировки",
    ready: "Готово к будущему этапу публикации",
    notReady: "Не готово",
    evidenceSaved: "Доказательство теста зафиксировано.",
  },
  pl: {
    title: "Test formuły bez zapisu",
    intro: "Uruchamia ostatnią zapisaną formułę na jawnych wartościach testowych. Nie czyta faktów użytkownika i nic nie zapisuje.",
    inputs: "Testowe wartości wejściowe",
    help: "Obiekt JSON: klucz wejścia → wartość. Zastąp null przed uruchomieniem.",
    run: "Uruchom test bez zapisu",
    running: "Testowanie…",
    configureFirst: "Najpierw zapisz poprawną konfigurację.",
    savedOnly: "Test używa ostatniej zapisanej konfiguracji.",
    status: "Stan wykonania",
    output: "Wynik",
    algebra: "Analiza jednostek",
    targetUnit: "Jednostka docelowa",
    passed: "Test zaliczony",
    noWrite: "Brak zapisu do bazy",
    publish: "Publikacja włączona",
    yes: "Tak",
    no: "Nie",
    none: "Brak wyniku testu.",
    governanceTitle: "Dowód testu i gotowość do publikacji",
    evidenceState: "Stan dowodu",
    evidenceRecordedAt: "Zapisano dowód",
    recordEvidence: "Zapisz dowód testu",
    recordingEvidence: "Zapisywanie dowodu…",
    recordEvidenceHelp: "Ponownie uruchamia test bez zapisu i po sukcesie zapisuje tylko hashe oraz metadane kontroli.",
    checkReadiness: "Sprawdź gotowość do publikacji",
    checkingReadiness: "Sprawdzanie gotowości…",
    readiness: "Gotowość do publikacji",
    readinessReasons: "Powody blokady",
    ready: "Gotowe do przyszłego etapu publikacji",
    notReady: "Brak gotowości",
    evidenceSaved: "Dowód testu zapisano.",
  },
  uk: {
    title: "Тест формули без запису",
    intro: "Запускає останню збережену формулу на явних тестових значеннях. Факти користувача не читаються, нічого не записується.",
    inputs: "Тестові вхідні значення",
    help: "JSON-об’єкт: ключ входу → значення. Замініть null перед запуском.",
    run: "Запустити тест без запису",
    running: "Перевірка…",
    configureFirst: "Спочатку збережіть коректну конфігурацію.",
    savedOnly: "Тест використовує останню збережену конфігурацію.",
    status: "Стан виконання",
    output: "Результат",
    algebra: "Перевірка розмірності",
    targetUnit: "Цільова одиниця",
    passed: "Тест пройдено",
    noWrite: "Запис до бази відсутній",
    publish: "Публікація дозволена",
    yes: "Так",
    no: "Ні",
    none: "Тест ще не запускався.",
    governanceTitle: "Доказ тесту та готовність до публікації",
    evidenceState: "Стан доказу",
    evidenceRecordedAt: "Доказ записано",
    recordEvidence: "Зафіксувати доказ тесту",
    recordingEvidence: "Фіксуємо доказ…",
    recordEvidenceHelp: "Повторно запускає тест без запису й після успіху зберігає лише хеші та службові дані перевірки.",
    checkReadiness: "Перевірити готовність до публікації",
    checkingReadiness: "Перевіряємо готовність…",
    readiness: "Готовність до публікації",
    readinessReasons: "Причини блокування",
    ready: "Готово до майбутнього етапу публікації",
    notReady: "Не готово",
    evidenceSaved: "Доказ тесту зафіксовано.",
  },
  de: {
    title: "Formeltest ohne Schreibzugriff",
    intro: "Testet die zuletzt gespeicherte Formel mit expliziten Beispielwerten. Benutzerfakten werden nicht gelesen und nichts wird geschrieben.",
    inputs: "Test-Eingabewerte",
    help: "JSON-Objekt: Eingabeschlüssel → Testwert. null vor dem Start ersetzen.",
    run: "Test ohne Schreiben starten",
    running: "Test läuft…",
    configureFirst: "Zuerst eine gültige Konfiguration speichern.",
    savedOnly: "Getestet wird die zuletzt gespeicherte Konfiguration.",
    status: "Ausführungsstatus",
    output: "Ergebnis",
    algebra: "Einheitenprüfung",
    targetUnit: "Zieleinheit",
    passed: "Test bestanden",
    noWrite: "Kein Datenbank-Schreibzugriff",
    publish: "Veröffentlichung aktiviert",
    yes: "Ja",
    no: "Nein",
    none: "Noch kein Testergebnis.",
    governanceTitle: "Testnachweis und Veröffentlichungsbereitschaft",
    evidenceState: "Nachweisstatus",
    evidenceRecordedAt: "Nachweis gespeichert",
    recordEvidence: "Testnachweis speichern",
    recordingEvidence: "Nachweis wird gespeichert…",
    recordEvidenceHelp: "Führt denselben schreibfreien Test erneut aus und speichert bei Erfolg nur Hashes und Governance-Metadaten.",
    checkReadiness: "Veröffentlichungsbereitschaft prüfen",
    checkingReadiness: "Bereitschaft wird geprüft…",
    readiness: "Veröffentlichungsbereitschaft",
    readinessReasons: "Blockierende Gründe",
    ready: "Bereit für den zukünftigen Veröffentlichungsschritt",
    notReady: "Nicht bereit",
    evidenceSaved: "Testnachweis gespeichert.",
  },
  es: {
    title: "Prueba de fórmula sin escritura",
    intro: "Ejecuta la última fórmula guardada con valores explícitos. No lee hechos del usuario ni escribe datos.",
    inputs: "Valores de entrada de prueba",
    help: "Objeto JSON: clave de entrada → valor. Sustituya null antes de ejecutar.",
    run: "Ejecutar prueba sin escritura",
    running: "Probando…",
    configureFirst: "Guarde primero una configuración válida.",
    savedOnly: "Se prueba la última configuración guardada.",
    status: "Estado de ejecución",
    output: "Resultado",
    algebra: "Análisis de unidades",
    targetUnit: "Unidad objetivo",
    passed: "Prueba superada",
    noWrite: "Sin escritura en base de datos",
    publish: "Publicación activada",
    yes: "Sí",
    no: "No",
    none: "Aún no hay resultado.",
    governanceTitle: "Evidencia de prueba y preparación para publicación",
    evidenceState: "Estado de evidencia",
    evidenceRecordedAt: "Evidencia registrada",
    recordEvidence: "Registrar evidencia de prueba",
    recordingEvidence: "Registrando evidencia…",
    recordEvidenceHelp: "Vuelve a ejecutar la misma prueba sin escritura y, si pasa, guarda solo hashes y metadatos de gobernanza.",
    checkReadiness: "Comprobar preparación para publicación",
    checkingReadiness: "Comprobando preparación…",
    readiness: "Preparación para publicación",
    readinessReasons: "Motivos de bloqueo",
    ready: "Listo para el futuro paso de publicación",
    notReady: "No listo",
    evidenceSaved: "Evidencia de prueba registrada.",
  },
  cs: {
    title: "Test vzorce bez zápisu",
    intro: "Spustí poslední uložený vzorec s explicitními testovacími hodnotami. Nečte uživatelská fakta a nic nezapisuje.",
    inputs: "Testovací vstupní hodnoty",
    help: "JSON objekt: klíč vstupu → hodnota. Před spuštěním nahraďte null.",
    run: "Spustit test bez zápisu",
    running: "Testování…",
    configureFirst: "Nejprve uložte platnou konfiguraci.",
    savedOnly: "Test používá poslední uloženou konfiguraci.",
    status: "Stav vyhodnocení",
    output: "Výsledek",
    algebra: "Kontrola jednotek",
    targetUnit: "Cílová jednotka",
    passed: "Test úspěšný",
    noWrite: "Bez zápisu do databáze",
    publish: "Publikování povoleno",
    yes: "Ano",
    no: "Ne",
    none: "Zatím žádný výsledek.",
    governanceTitle: "Důkaz testu a připravenost k publikaci",
    evidenceState: "Stav důkazu",
    evidenceRecordedAt: "Důkaz uložen",
    recordEvidence: "Uložit důkaz testu",
    recordingEvidence: "Ukládání důkazu…",
    recordEvidenceHelp: "Znovu spustí stejný test bez zápisu a po úspěchu uloží jen hashe a řídicí metadata.",
    checkReadiness: "Zkontrolovat připravenost k publikaci",
    checkingReadiness: "Kontrola připravenosti…",
    readiness: "Připravenost k publikaci",
    readinessReasons: "Důvody blokace",
    ready: "Připraveno pro budoucí krok publikace",
    notReady: "Není připraveno",
    evidenceSaved: "Důkaz testu uložen.",
  },
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function buildTemplate(inputContract: unknown): JsonRecord {
  if (!Array.isArray(inputContract)) return {};
  const result: JsonRecord = {};
  for (const item of inputContract) {
    const record = asRecord(item);
    const key = typeof record.key === "string" ? record.key.trim() : "";
    if (key) result[key] = null;
  }
  return result;
}

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function FormulaTestPanel({
  locale,
  versionId,
  configured,
  inputContract,
}: {
  locale: LocaleCode;
  versionId: string;
  configured: boolean;
  inputContract: unknown;
}) {
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const [sampleText, setSampleText] = useState(() =>
    pretty(buildTemplate(inputContract)),
  );
  const [busy, setBusy] = useState(false);
  const [governanceBusy, setGovernanceBusy] = useState<
    "evidence" | "readiness" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [governanceError, setGovernanceError] = useState<string | null>(null);
  const [governanceSuccess, setGovernanceSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<TestResponse | null>(null);
  const [readiness, setReadiness] = useState<PublishReadiness | null>(null);

  function parsedSampleInputs() {
    const parsed = JSON.parse(sampleText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("FORMULA_TEST_SAMPLE_INPUTS_MUST_BE_OBJECT");
    }
    return parsed as JsonRecord;
  }

  async function runTest() {
    setBusy(true);
    setError(null);
    setResult(null);
    setGovernanceSuccess(null);

    try {
      const parsed = parsedSampleInputs();

      const response = await fetch("/api/admin/formula-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_draft",
          ruleVersionId: versionId,
          sampleInputs: parsed,
        }),
      });

      const payload = (await response.json()) as TestResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setBusy(false);
    }
  }

  async function recordEvidence() {
    setGovernanceBusy("evidence");
    setGovernanceError(null);
    setGovernanceSuccess(null);

    try {
      const parsed = parsedSampleInputs();
      const response = await fetch("/api/admin/formula-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_test_evidence",
          ruleVersionId: versionId,
          sampleInputs: parsed,
        }),
      });

      const payload = (await response.json()) as EvidenceResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setReadiness(payload.readiness ?? null);
      setGovernanceSuccess(copy.evidenceSaved);
    } catch (evidenceError) {
      setGovernanceError(
        evidenceError instanceof Error
          ? evidenceError.message
          : String(evidenceError),
      );
    } finally {
      setGovernanceBusy(null);
    }
  }

  async function checkReadiness() {
    setGovernanceBusy("readiness");
    setGovernanceError(null);
    setGovernanceSuccess(null);

    try {
      const response = await fetch("/api/admin/formula-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_readiness",
          ruleVersionId: versionId,
        }),
      });

      const payload = (await response.json()) as ReadinessResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setReadiness(payload);
    } catch (readinessError) {
      setGovernanceError(
        readinessError instanceof Error
          ? readinessError.message
          : String(readinessError),
      );
    } finally {
      setGovernanceBusy(null);
    }
  }

  const algebra = result ? asRecord(result.unitAlgebra) : {};
  const algebraStatus =
    typeof algebra.status === "string" ? algebra.status : "—";
  const evidenceCanBeRecorded =
    configured &&
    result?.evaluationStatus === "evaluated" &&
    result.testPassed === true &&
    result.noWrite === true &&
    algebraStatus === "resolved";

  return (
    <section className="rounded-xl border border-[#dfe5f5] bg-[#fafbff] p-4">
      <h2 className="text-base font-semibold text-[#23263a]">{copy.title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#6b7280]">{copy.intro}</p>
      <div className="mt-3 rounded-lg border border-[#e5e7f1] bg-white px-3 py-2 text-xs text-[#6b7280]">
        {copy.savedOnly}
      </div>

      {!configured ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {copy.configureFirst}
        </div>
      ) : null}

      <label className="mt-4 block">
        <div className="text-sm font-semibold text-[#23263a]">{copy.inputs}</div>
        <div className="mt-1 text-xs text-[#7c8099]">{copy.help}</div>
        <textarea
          value={sampleText}
          onChange={(event) => {
            setSampleText(event.target.value);
            setResult(null);
            setError(null);
          }}
          rows={8}
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-[#d8dced] bg-white px-3 py-2 font-mono text-xs leading-5 text-[#303449]"
        />
      </label>

      <button
        type="button"
        onClick={() => void runTest()}
        disabled={!configured || busy}
        className="mt-3 rounded-lg border border-[#3b6ef8] bg-white px-4 py-2.5 text-sm font-semibold text-[#3b6ef8] hover:bg-[#f2f5ff] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? copy.running : copy.run}
      </button>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Cell label={copy.status} value={result.evaluationStatus || "—"} />
            <Cell label={copy.output} value={pretty(result.output)} />
            <Cell label={copy.algebra} value={algebraStatus} />
            <Cell label={copy.targetUnit} value={result.targetUnitCode || "—"} />
            <Cell label={copy.passed} value={result.testPassed ? copy.yes : copy.no} />
            <Cell label={copy.noWrite} value={result.noWrite ? copy.yes : copy.no} />
            <Cell
              label={copy.publish}
              value={result.publishEligibleFromThisTest ? copy.yes : copy.no}
            />
          </div>

          {result.missingRequiredInputs?.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              missing: {result.missingRequiredInputs.join(", ")}
            </div>
          ) : null}

          <details className="rounded-lg border border-[#e5e7f1] bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[#4a4f6a]">
              {copy.algebra}
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#4a4f6a]">
              {pretty(result.unitAlgebra)}
            </pre>
          </details>
        </div>
      ) : (
        <div className="mt-3 text-xs text-[#8a8fa8]">{copy.none}</div>
      )}

      <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
        <h3 className="text-sm font-semibold text-violet-950">
          {copy.governanceTitle}
        </h3>
        <p className="mt-1 text-xs leading-5 text-violet-800">
          {copy.recordEvidenceHelp}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void recordEvidence()}
            disabled={!evidenceCanBeRecorded || governanceBusy !== null}
            className="rounded-lg border border-violet-400 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {governanceBusy === "evidence"
              ? copy.recordingEvidence
              : copy.recordEvidence}
          </button>

          <button
            type="button"
            onClick={() => void checkReadiness()}
            disabled={!configured || governanceBusy !== null}
            className="rounded-lg border border-[#cfd5ea] bg-white px-3 py-2 text-xs font-semibold text-[#4a4f6a] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {governanceBusy === "readiness"
              ? copy.checkingReadiness
              : copy.checkReadiness}
          </button>
        </div>

        {governanceSuccess ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {governanceSuccess}
          </div>
        ) : null}

        {governanceError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {governanceError}
          </div>
        ) : null}

        {readiness ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Cell
                label={copy.readiness}
                value={readiness.ready ? copy.ready : copy.notReady}
              />
              <Cell
                label={copy.evidenceState}
                value={readiness.evidenceState || "—"}
              />
              <Cell
                label={copy.evidenceRecordedAt}
                value={readiness.evidenceRecordedAt || "—"}
              />
              <Cell
                label={copy.publish}
                value={readiness.publishEnabled ? copy.yes : copy.no}
              />
            </div>

            {readiness.reasons?.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="font-semibold">{copy.readinessReasons}</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {readiness.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7f1] bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8fa8]">
        {label}
      </div>
      <div className="mt-1 break-all text-sm text-[#303449]">{value}</div>
    </div>
  );
}
