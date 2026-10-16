"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Category = "commercial_activity" | "consequence_task";
type QueueItem = {
  id: string; category: Category; label: string; state: string;
  createdAt: string; href: string; caseCode: string | null;
  eligibleForAdministrativeIntake: boolean; eligibilityReason: string;
};
type WorkStep = { code: string; title: string; status: "done" | "remaining" | "blocked" | "unverified"; explanation: string };
type WorkProgress = {
  contract: string;
  summary: string; done: number; notConfirmedComplete: number;
  automaticWriting: "enabled" | "disabled" | "unknown";
  counts: {
    extractedMeasurements: number | null; profileBindings: number | null;
    preparedValues: number | null; valuesFromText: number | null;
    valuesFromTemplateDefaults: number | null; preliminaryLeafCandidates: number | null;
    technicalRepresentativesProposed: number | null; storedFacts: number | null;
  };
  steps: WorkStep[];
};
type P25Evidence = {
  contract: string; analysisCompleted: boolean;
  extractedMeasurements: Array<{parameter: string;value:string;unit:string;qualifier:string|null;fragment:string}>;
  reportedMeasurementCount:number|null;
  profileCheck:"checked"|"unavailable";profileFailureCode:string|null;
  bindings:Array<{parameter:string;targetBranch:string;valueStatus:string;value:string|null;valueOrigin:"text"|"profile_default"|"not_prepared";
    valueExplanation:string;matchedMeasurements:number;leafStatus:"candidate"|"technical_proposal"|"not_found";leafExplanation:string;candidateCount:number}>;
  conclusion:string;
};
type SourceDetail = {
  id: string;
  title: string;
  publicText: string;
  truncatedText: boolean;
  state: string;
  createdAt: string;
  stage: string;
  problem: string;
  suggestion: string;
  reasonCode: string | null;
  messageId: string;
  workProgress: WorkProgress;
  p25Evidence?: P25Evidence;
};
type SourceDetailReply = { ok: boolean; contract?: string; detail?: SourceDetail; errorCode?: string };
type CaseOption = { id: string; caseCode: string; title: string };
type QueueReply = {
  ok: boolean; contract?: string; items?: QueueItem[]; eligibleCases?: CaseOption[];
  counts?: { commercialShown: number; consequenceShown: number };
  truncated?: { commercial: boolean; consequence: boolean }; errorCode?: string;
};
const QUEUE_CONTRACT = "ARCTOR_ADM4B2_WORK_QUEUE_PREVIEW_V1";
const INTAKE_CONTRACT = "ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1";
const SOURCE_DETAIL_CONTRACT = "ARCTOR_ADM4B2_COMMERCIAL_SOURCE_DETAIL_V1";

export default function ArctorAdminWorkQueues() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState<QueueReply | null>(null);
  const [category, setCategory] = useState<Category>("commercial_activity");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<Record<string, string>>({});
  const operationIds = useRef<Record<string, string>>({});
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sourceDetail, setSourceDetail] = useState<SourceDetail | null>(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    void fetch("/api/admin/management/work-queues", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const data: QueueReply = await response.json();
        if (!response.ok || !data.ok || data.contract !== QUEUE_CONTRACT || !Array.isArray(data.items)) {
          throw new Error(`${data.errorCode ?? "QUEUE_LOAD_FAILED"} (HTTP ${response.status})`);
        }
        if (!controller.signal.aborted) { setReply(data); setError(""); }
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Ошибка загрузки очередей");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [expanded, revision]);

  useEffect(() => {
    if (!sourceId) return;
    const controller = new AbortController();
    void fetch(`/api/admin/management/work-queues/source-detail?activityEventId=${encodeURIComponent(sourceId)}`, {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(async (response) => {
      const data: SourceDetailReply = await response.json();
      if (!response.ok || !data.ok || data.contract !== SOURCE_DETAIL_CONTRACT || !data.detail || data.detail.id !== sourceId) {
        throw new Error(`${data.errorCode ?? "SOURCE_DETAIL_UNAVAILABLE"} (HTTP ${response.status})`);
      }
      if (!controller.signal.aborted) { setSourceDetail(data.detail); setDetailStatus("ready"); }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setDetailError(cause instanceof Error ? cause.message : "Не удалось загрузить запись");
        setDetailStatus("error");
      }
    });
    return () => controller.abort();
  }, [sourceId]);

  useEffect(() => {
    if (!sourceId) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSourceId(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sourceId]);

  const openSource = (id: string) => {
    setSourceDetail(null);
    setDetailError("");
    setDetailStatus("loading");
    setSourceId(id);
  };

  const shown = useMemo(() => (reply?.items ?? []).filter((item) => item.category === category), [reply, category]);
  const reload = () => { setLoading(true); setError(""); setRevision((value) => value + 1); };

  async function runIntake(item: QueueItem, action: "create" | "link") {
    if (!item.eligibleForAdministrativeIntake || busy) return;
    const caseId = action === "link" ? selectedCases[item.id] : undefined;
    if (action === "link" && !caseId) return;
    const confirmation = action === "create"
      ? `Создать административное дело по публичной коммерческой активности ${item.id.slice(0, 8)} и выдать первичное поручение?`
      : `Связать публичную коммерческую активность ${item.id.slice(0, 8)} с выбранным существующим делом?`;
    if (!window.confirm(confirmation)) return;
    const key = `${action}:${item.id}:${caseId ?? ""}`;
    const operationId = operationIds.current[key] ?? crypto.randomUUID();
    operationIds.current[key] = operationId; // Retain on transport errors for an exact retry.
    setBusy(key); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/management/intake", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, operationId, sourceKind: "commercial_activity", sourceId: item.id, ...(caseId ? { caseId } : {}) }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("ok" in data) || data.ok !== true || !("contract" in data) || data.contract !== INTAKE_CONTRACT) {
        const code = data && typeof data === "object" && "errorCode" in data ? String(data.errorCode) : `HTTP ${response.status}`;
        throw new Error(`Запись отклонена: ${code}`);
      }
      const result = data as { caseCode?: string; alreadyLinked?: boolean };
      delete operationIds.current[key];
      setNotice(result.alreadyLinked ? `Связь уже зарегистрирована: ${result.caseCode ?? "дело"}` : `Записано: ${result.caseCode ?? "дело"}. Обновите общий реестр ADM-2B.1.`);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка записи. Операция сохранена для безопасного повтора.");
    } finally { setBusy(null); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-3 md:p-4" data-arctor-adm4b2="true">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">ADM-4B2 · Настоящие рабочие очереди</h3>
        <p className="mt-1 text-xs text-slate-600">Первичные записи не копируются. Создание дел разрешено только для проверенных публичных коммерческих источников.</p>
      </div>
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => {
        if (!expanded) { setLoading(true); setError(""); }
        setExpanded((value) => !value);
      }}>{expanded ? "Скрыть очереди" : "Открыть очереди"}</button>
    </div>
    {expanded && <div className="mt-3 space-y-3">
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
        Личные активности и задания конструктора последствий остаются только для просмотра в своих кабинетах. Административные дела по личным сигналам запрещены до отдельного утверждения приватного порядка. ИИ-агенты не запускаются.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={category === "commercial_activity"}
          className={`rounded-lg px-3 py-2 text-sm ${category === "commercial_activity" ? "bg-blue-100 text-blue-800" : "bg-slate-100"}`}
          onClick={() => setCategory("commercial_activity")}>Коммерческие активности ({reply?.counts?.commercialShown ?? "…"})</button>
        <button type="button" aria-pressed={category === "consequence_task"}
          className={`rounded-lg px-3 py-2 text-sm ${category === "consequence_task" ? "bg-blue-100 text-blue-800" : "bg-slate-100"}`}
          onClick={() => setCategory("consequence_task")}>Конструктор последствий ({reply?.counts?.consequenceShown ?? "…"})</button>
        <button type="button" disabled={loading || busy !== null} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={reload}>Обновить</button>
      </div>
      {loading && <p role="status" className="text-sm text-slate-600">Загружаем первичные очереди…</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 p-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 p-2 text-sm text-emerald-800">{notice}</p>}
      {!loading && !error && shown.length === 0 && <p className="text-sm text-slate-500">В доступной выборке нет заданий этой категории.</p>}
      {!error && shown.length > 0 && <ul className="space-y-2">
        {shown.map((item) => <li key={`${item.category}:${item.id}`} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium break-words">{item.label}</div>
              <div className="text-xs text-slate-600">Состояние: {item.state} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ru-RU") : "дата неизвестна"}</div>
              <div className="text-xs text-slate-700">{item.caseCode ? `Дело ${item.caseCode}` : item.eligibilityReason}</div>
            </div>
            {item.category === "commercial_activity" ?
              <button type="button" className="rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"
                onClick={() => openSource(item.id)}>Открыть первоисточник →</button>
              : <Link className="rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50" href={item.href}>Открыть первоисточник →</Link>}
          </div>
          {item.category === "commercial_activity" && item.eligibleForAdministrativeIntake && <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy !== null} className="rounded-lg bg-blue-700 px-3 py-2 text-xs text-white disabled:opacity-50" onClick={() => void runIntake(item, "create")}>Создать дело</button>
            <select aria-label={`Дело для привязки активности ${item.id.slice(0, 8)}`} className="max-w-full rounded-lg border px-2 py-2 text-xs"
              value={selectedCases[item.id] ?? ""} onChange={(event) => setSelectedCases((prev) => ({ ...prev, [item.id]: event.target.value }))}>
              <option value="">Выберите существующее дело</option>
              {(reply?.eligibleCases ?? []).map((option) => <option key={option.id} value={option.id}>{option.caseCode} — {option.title}</option>)}
            </select>
            <button type="button" disabled={busy !== null || !selectedCases[item.id]} className="rounded-lg border border-blue-300 px-3 py-2 text-xs text-blue-800 disabled:opacity-50" onClick={() => void runIntake(item, "link")}>Привязать к делу</button>
          </div>}
        </li>)}
      </ul>}
      <p className="text-xs text-slate-600">Не более 30 записей каждой очереди. Это не полный счётчик: {reply?.truncated?.[category === "commercial_activity" ? "commercial" : "consequence"] ? "есть дополнительные записи" : "дополнительные записи не подтверждены"}.</p>
    </div>}
    {sourceId && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setSourceId(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="adm4b2-source-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div>
            <h4 id="adm4b2-source-title" className="text-lg font-semibold">Первоисточник коммерческой активности</h4>
            <p className="text-xs text-slate-600">Запись {sourceId.slice(0, 8)} · только чтение · данные не копируются в дело</p>
          </div>
          <button type="button" autoFocus onClick={() => setSourceId(null)} aria-label="Закрыть окно первоисточника"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-100">Закрыть ✕</button>
        </div>
        <div className="space-y-3 overflow-y-auto p-4 text-sm">
          {detailStatus === "loading" && <p role="status">Загружаем выбранную запись…</p>}
          {detailStatus === "error" && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{detailError}</p>}
          {detailStatus === "ready" && sourceDetail && <>
            <h5 className="font-semibold">{sourceDetail.title}</h5>
            <p className="text-xs text-slate-600">Создана: {new Date(sourceDetail.createdAt).toLocaleString("ru-RU")} · Состояние: {sourceDetail.state}</p>
            <div className="rounded-xl border bg-slate-50 p-3">
              <p className="mb-2 font-semibold">Текст публичного объявления</p>
              <p className="whitespace-pre-wrap break-words">{sourceDetail.publicText || "Текст отсутствует в исходной записи"}</p>
              {sourceDetail.truncatedText && <p className="mt-2 text-xs text-amber-800">Показано начало текста; полный разбор доступен в разделе коммерческих активностей.</p>}
            </div>
            <div className="space-y-2 rounded-xl border p-3">
              <p><strong>Текущий этап автоматической обработки:</strong> {sourceDetail.stage}</p>
              <p><strong>Диагностическое сообщение:</strong> {sourceDetail.problem}</p>
              <p><strong>Рекомендация по этому этапу:</strong> {sourceDetail.suggestion}</p>
              {sourceDetail.reasonCode && <p className="text-xs text-slate-600">Код диагностики: {sourceDetail.reasonCode}</p>}
            </div>
            {sourceDetail.workProgress && <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3" aria-label="Ход обработки коммерческой активности">
              <div>
                <h5 className="font-semibold">Что уже сделано и что ещё осталось</h5>
                <p className="mt-1 text-xs text-slate-600">Подтверждено завершённых этапов: {sourceDetail.workProgress.done} из {sourceDetail.workProgress.steps.length}. Остальные {sourceDetail.workProgress.notConfirmedComplete} требуют работы или дополнительной проверки.</p>
              </div>
              <p className="rounded-lg bg-white p-3 leading-relaxed">{sourceDetail.workProgress.summary}</p>
              <ol className="space-y-2">
                {sourceDetail.workProgress.steps.map((step) => <li key={step.code} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className={step.status === "done" ? "text-emerald-700" : step.status === "blocked" ? "text-rose-700" : "text-amber-700"}>
                      {step.status === "done" ? "✓" : step.status === "blocked" ? "!" : "○"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{step.title} <span className="ml-1 text-xs font-normal text-slate-600">— {step.status === "done" ? "выполнено" : step.status === "blocked" ? "требует исправления" : step.status === "unverified" ? "не подтверждено" : "осталось выполнить"}</span></p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">{step.explanation}</p>
                    </div>
                  </div>
                </li>)}
              </ol>
              <p className="text-xs text-slate-600">Проверка показывает известное состояние, а не запускает запись. Выбор ОН, подтверждение и запись фактов остаются отдельными действиями.</p>
            </section>}
            {sourceDetail.p25Evidence && <details className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3" data-arctor-p25-evidence="true">
              <summary className="cursor-pointer font-semibold">Диагностика параметров P2.5 — почему факт ещё не готов</summary>
              <a href="/project-knowledge/admin-library#ADR-ADM-DIAG-001" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-indigo-700 underline">Правила диагностики и объяснения причин (библиотека администратора) ↗</a>
              <p className="mt-3 text-sm leading-relaxed">{sourceDetail.p25Evidence.conclusion}</p>
              <p className="mt-2 text-xs text-slate-600">Извлечённые измерения и подготовленные значения — разные вещи. Проверка выполняется только на чтение.</p>
              <div className="mt-3 space-y-2">
                <h6 className="font-semibold">1. Что вернул базовый анализ текста</h6>
                <p className="text-xs text-slate-600">Измерений: {sourceDetail.p25Evidence.reportedMeasurementCount ?? "неизвестно"}. Показано не более 30.</p>
                {sourceDetail.p25Evidence.extractedMeasurements.length === 0
                  ? <p className="rounded-lg bg-white p-2">Подтверждённых извлечённых измерений в результате нет.</p>
                  : <ul className="space-y-2">{sourceDetail.p25Evidence.extractedMeasurements.map((m, index) =>
                    <li key={`${m.parameter}:${index}`} className="rounded-lg bg-white p-2">
                      <p className="font-medium">{m.parameter}: {m.value} {m.unit}{m.qualifier ? ` (${m.qualifier})` : ""}</p>
                      {m.fragment && <p className="mt-1 text-xs text-slate-600">Исходный фрагмент: «{m.fragment}»</p>}
                    </li>)}</ul>}
                <h6 className="pt-2 font-semibold">2. Как измерения сопоставлены с параметрами и ОН</h6>
                {sourceDetail.p25Evidence.profileCheck === "unavailable"
                  ? <p className="rounded-lg border border-amber-200 bg-white p-2">Профиль не удалось проверить. Код: {sourceDetail.p25Evidence.profileFailureCode ?? "неизвестен"}</p>
                  : <ul className="space-y-2">{sourceDetail.p25Evidence.bindings.map((b, index) =>
                    <li key={`${b.parameter}:${b.targetBranch}:${index}`} className="rounded-lg border bg-white p-3">
                      <p className="font-semibold break-words">{b.parameter} → {b.targetBranch}</p>
                      <p className="mt-1">Значение: <strong>{b.value ?? "не подготовлено"}</strong> · {b.valueOrigin === "text" ? "из исходного текста" : b.valueOrigin === "profile_default" ? "из настроек профиля" : "требует выяснения"}</p>
                      <p className="text-xs text-slate-600">{b.valueExplanation} Совпадающих измерений: {b.matchedMeasurements}.</p>
                      <p className="mt-2">Листовой ОН: <strong>{b.leafStatus === "candidate" ? "кандидат предварительно найден" : b.leafStatus === "technical_proposal" ? "предложен технический представитель" : "не найден"}</strong></p>
                      <p className="text-xs text-slate-600">{b.leafExplanation}</p>
                    </li>)}</ul>}
              </div>
              <button type="button" className="mt-3 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-indigo-800"
                onClick={() => {
                  const evidence = sourceDetail.p25Evidence;
                  if (!evidence) return;
                  const report = JSON.stringify({contract:evidence.contract,activityEventId:sourceDetail.id,sourceTitle:sourceDetail.title,p25Evidence:evidence},null,2);
                  void navigator.clipboard.writeText(report).then(() => setNotice("Диагностика P2.5 скопирована. Не содержит данных личного профиля."))
                    .catch(() => setDetailError("Не удалось скопировать. Проверьте разрешения браузера."));
                }}>Скопировать диагностический отчёт</button>
              {detailError && <p role="alert" className="mt-2 text-xs text-red-700">{detailError}</p>}
              {notice && <p role="status" className="mt-2 text-xs text-emerald-800">{notice}</p>}
            </details>}
            <p className="text-xs text-slate-600">Источник подтверждён как действующая публичная публикация. Окно не изменяет запись, дело или факты.</p>
          </>}
        </div>
        <div className="flex justify-end gap-2 border-t p-3">
          <Link href="/admin/commercial-activities" className="rounded-lg border px-3 py-2 text-sm text-blue-700">Весь список и полная диагностика ↗</Link>
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => setSourceId(null)}>Закрыть</button>
        </div>
      </div>
    </div>}
  </section>;
}
