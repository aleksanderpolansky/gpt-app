"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createScopedRuleFixtures, type P33Fixture, type P33Reason } from "@/lib/ai/actorScopedRuleSimulatorV1";
import { SCOPED_RULE_LANGUAGES, type ActorScopedRuleDocumentV1 } from "@/lib/ai/actorScopedRulesV1";

type SavedRule = { rule_code: string; current_revision: number; status: "draft" | "disabled"; document_json: ActorScopedRuleDocumentV1 };
type HistoryRow = { revision: number; action_code: string; document_json: ActorScopedRuleDocumentV1 };
type Catalog = { ok: boolean; errorCode?: string; rules?: SavedRule[]; history?: HistoryRow[]; truncated?: boolean };
type CaseResult = { label: string; expectedMatch: boolean; previewMatch: boolean; reason: P33Reason;
  proposedRawActivity: string | null; passed: boolean; baselinePreviewMatch: boolean | null; syntaxRegression: boolean | null };
type Simulation = { ok: boolean; errorCode?: string; ruleCode: string; revision: number; ruleStatus: "draft" | "disabled";
  comparedRevision: number | null; cases: CaseResult[]; total: number; passed: number; failed: number;
  regressions: number; runtimeActivation: false; rawActivityWrites: false; factWrites: false; aiCalls: false; billedEur: 0 };

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const REASONS: Record<P33Reason, string> = {
  MATCH_PREVIEW_ONLY: "Совпадение в симуляторе (не исполнено)",
  RULE_DISABLED: "Правило отключено",
  INVALID_RULE: "Определение правила не прошло валидацию",
  EMPTY_TEXT: "Пустой текст",
  WRONG_DOMAIN: "Другая предметная область",
  WRONG_SURFACE: "Другой раздел платформы",
  WRONG_EVENT: "Другой тип события",
  WRONG_LOCALE: "Другой язык",
  WRONG_INPUT_MODE: "Другой способ ввода",
  NO_MATCH: "Фраза не совпала целиком",
};

async function getCatalog(code?: string): Promise<Catalog> {
  const url = `/api/ai-processing/scoped-rules${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const body = (await res.json()) as Catalog;
  if (!res.ok || !body.ok) throw new Error(body.errorCode ?? "P33_CATALOG_UNAVAILABLE");
  return body;
}

export default function ScopedRuleSimulatorClient() {
  const [catalog, setCatalog] = useState<SavedRule[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [comparison, setComparison] = useState("");
  const [statusMessage, setStatusMessage] = useState("Загрузка сохранённых правил...");
  const [busy, setBusy] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualExpected, setManualExpected] = useState(true);
  const [manualLocale, setManualLocale] = useState("ru");
  const [manualMode, setManualMode] = useState("text_activity");
  const [manualDomain, setManualDomain] = useState("personal_activities");
  const [manualSurface, setManualSurface] = useState("activity_quick_capture");
  const [manualEvent, setManualEvent] = useState("raw_activity_submitted");
  const [result, setResult] = useState<Simulation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCatalog().then((data) => {
      if (cancelled) return;
      setCatalog(data.rules ?? []);
      setStatusMessage((data.rules ?? []).length ? "Выбери правило для симуляции." : "Сохранённых правил у этого актора нет.");
    }).catch((error: unknown) => {
      if (!cancelled) setStatusMessage(error instanceof Error ? error.message : "Ошибка загрузки");
    });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => catalog.find((item) => item.rule_code === selectedCode), [catalog, selectedCode]);
  const fixtures = useMemo((): P33Fixture[] => selected ?
    createScopedRuleFixtures(selected.document_json).map((test) => ({
      ...test, expectedMatch: selected.status === "disabled" ? false : test.expectedMatch,
    })) : [], [selected]);

  async function pickRule(code: string) {
    setSelectedCode(code); setHistory([]); setComparison(""); setResult(null);
    const next = catalog.find((v) => v.rule_code === code);
    if (!next) return;
    const def = next.document_json;
    setManualText(def.matcher.lexemes[0] ?? "");
    setManualExpected(next.status !== "disabled");
    setManualLocale(def.localeCode); setManualMode(def.inputMode);
    setManualDomain(def.domainCode); setManualSurface(def.surfaceCode); setManualEvent(def.eventType);
    try {
      const snapshot = await getCatalog(code);
      if (snapshot.rules?.[0]?.rule_code !== code) throw new Error("P33_RULE_NOT_FOUND");
      setHistory(snapshot.history ?? []);
      setStatusMessage(`Выбрано ${code} · v${next.current_revision} · ${next.status}. Тесты не сохраняются.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Ошибка чтения версий"); }
  }

  async function simulate(kind: "suite" | "manual") {
    if (!selected) return;
    setBusy(true); setResult(null); setStatusMessage("Запуск симулятора без записи данных...");
    const cases: P33Fixture[] = kind === "suite" ? fixtures : [{
      label: "manual_input", expectedMatch: manualExpected, text: manualText,
      localeCode: manualLocale, inputMode: manualMode, domainCode: manualDomain,
      surfaceCode: manualSurface, eventType: manualEvent,
    }];
    try {
      const response = await fetch("/api/ai-processing/scoped-rules/simulate", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleCode: selected.rule_code, cases,
          compareRevision: comparison ? Number(comparison) : null }),
      });
      const data = (await response.json()) as Simulation;
      if (!response.ok || !data.ok) throw new Error(data.errorCode ?? "P33_SIMULATION_ERROR");
      setResult(data);
      setStatusMessage(`Тест выполнен: ${data.passed}/${data.total} ожиданий совпало. Нет AI-вызова, записи и расходов.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Ошибка симулятора"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">ARCTor · MVP 3 · P3.3</p>
      <h1 className="mt-2 text-2xl font-bold">Симулятор персональных правил</h1>
      <p className="mt-2 text-sm text-slate-600">Проверка сохранённых правил на примерах, причина решения и сравнение редакций. Это отдельный диагностический механизм, не исполнитель. Никакие правила не активируются.</p>
      <Link href="/settings/ai-processing/scoped-rules?locale=ru" className="mt-3 inline-block text-sm font-bold text-blue-700 underline">← Вернуться к редактору правил</Link>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">1. Выбор сохранённого правила и редакции</h2>
      <label className="block text-sm">Правило текущего профиля
        <select className={field} value={selectedCode} onChange={(e) => void pickRule(e.target.value)}>
          <option value="">— выбери правило —</option>
          {catalog.map((r) => <option key={r.rule_code} value={r.rule_code}>{r.rule_code} · v{r.current_revision} · {r.status}</option>)}
        </select>
      </label>
      <label className="block text-sm">Сравнить семантику с сохранённой редакцией (без активации)
        <select className={field} value={comparison} onChange={(e) => {setComparison(e.target.value); setResult(null);}} disabled={!selected}>
          <option value="">Без сравнения</option>
          {history.filter((r) => r.revision !== selected?.current_revision && r.action_code === "save")
            .map((v) => <option key={v.revision} value={v.revision}>Редакция v{v.revision}</option>)}
        </select>
      </label>
      {selected && <p className="text-sm text-slate-600">Статус: <b>{selected.status}</b>. {selected.status === "disabled" ?
        "Правило отключено: все проверки применения вернут отказ. Историческую семантику можно сравнить отдельно." :
        "Черновик: совпадения отображаются только как предложения симулятора."}</p>}
      <p className="text-sm text-slate-600">{statusMessage}</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">2. Регрессионный набор и ручная проверка</h2>
      <p className="text-sm text-slate-600">Набор создаётся из выбранного правила: положительный пример, отрицания, лишние слова, числа, другой язык, режим, область, раздел и событие. Для отключённого правила ожидаемый результат — отсутствие применения.</p>
      <button type="button" disabled={!selected || busy} onClick={() => void simulate("suite")}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Проверить стандартные сценарии ({fixtures.length})</button>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm md:col-span-2">Свой тест: исходная фраза
          <textarea className={field} rows={3} maxLength={800} value={manualText} onChange={(e) => setManualText(e.target.value)}/>
        </label>
        <label className="text-sm">Язык
          <select className={field} value={manualLocale} onChange={(e) => setManualLocale(e.target.value)}>
            {SCOPED_RULE_LANGUAGES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-sm">Способ ввода
          <select className={field} value={manualMode} onChange={(e) => setManualMode(e.target.value)}>
            <option value="text_activity">text_activity</option><option value="voice_command">voice_command</option>
          </select>
        </label>
        <label className="text-sm">Область
          <select className={field} value={manualDomain} onChange={(e) => setManualDomain(e.target.value)}>
            <option value="personal_activities">personal_activities</option><option value="publications">publications</option>
          </select>
        </label>
        <label className="text-sm">Раздел
          <select className={field} value={manualSurface} onChange={(e) => setManualSurface(e.target.value)}>
            <option value="activity_quick_capture">activity_quick_capture</option><option value="feed">feed</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">Событие
          <select className={field} value={manualEvent} onChange={(e) => setManualEvent(e.target.value)}>
            <option value="raw_activity_submitted">raw_activity_submitted</option><option value="publication_submitted">publication_submitted</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manualExpected} onChange={(e) => setManualExpected(e.target.checked)}/>Ожидаю совпадение в симуляторе</label>
      <button type="button" disabled={!selected || busy} onClick={() => void simulate("manual")}
        className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Проверить свой пример</button>
    </section>
    {result && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">3. Результат проверки</h2>
      <p className="text-sm">Правило: <b>{result.ruleCode}</b> · v{result.revision} · {result.ruleStatus} · ожидания: <b>{result.passed}/{result.total}</b> · ошибок: <b>{result.failed}</b> · семантических регрессий: <b>{result.regressions}</b></p>
      <p className="text-xs text-slate-600">Сравнение версий касается исключительно распознавания текста, а не активации архивных правил.</p>
      <div className="overflow-auto"><table className="w-full border-collapse text-xs">
        <thead><tr className="border-b text-left"><th className="p-2">Сценарий</th><th className="p-2">Ожидание</th><th className="p-2">Результат</th><th className="p-2">Причина</th><th className="p-2">QA</th></tr></thead>
        <tbody>{result.cases.map((r, i) => <tr key={`${r.label}-${i}`} className="border-b align-top">
          <td className="p-2">{r.label}{r.syntaxRegression && <b className="block text-red-700">Регрессия относительно предыдущей редакции</b>}</td>
          <td className="p-2">{r.expectedMatch ? "совпадение" : "отказ"}</td>
          <td className="p-2">{r.previewMatch ? "совпало" : "отклонено"}</td>
          <td className="p-2">{REASONS[r.reason]}{r.proposedRawActivity && <p className="mt-1 text-blue-700">Предложение: {r.proposedRawActivity}</p>}</td>
          <td className={`p-2 font-bold ${r.passed ? "text-green-700" : "text-red-700"}`}>{r.passed ? "PASS" : "FAIL"}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">Проверка выполнялась только в памяти сервера. Test cases не сохраняются; стоимость AI EUR = 0; запись активности, фактов и публикаций отсутствует.</p>
    </section>}
  </div>;
}
