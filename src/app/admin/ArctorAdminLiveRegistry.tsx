"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ArctorAdminCaseActions from "./ArctorAdminCaseActions";
import ArctorAdminSourceLinks from "./ArctorAdminSourceLinks";
import ArctorAdminWorkQueues from "./ArctorAdminWorkQueues";
import { AlertCircle, ArrowRight, ClipboardList, History, Inbox, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

type RoleRow = {
  role_code: string;
  title_ru: string;
  manager_title_ru: string;
  responsibility_summary_ru: string;
  is_active: boolean;
  agent_execution_enabled: boolean;
};

type CaseRow = {
  id: string;
  case_code: string;
  title: string;
  description: string;
  case_type: string;
  priority: string;
  status: string;
  owner_role_code: string;
  source_system: string;
  source_entity_kind: string | null;
  source_external_id: string | null;
  source_path: string | null;
  next_expected_result: string | null;
  created_at: string;
  updated_at: string;
};

type AssignmentSummary = {
  id: string;
  case_id: string;
  recipient_role_code: string;
  status: string;
  created_at: string;
};

type AssignmentDetail = AssignmentSummary & {
  assignment_text: string;
  required_result: string;
  accepted_at: string | null;
  completed_at: string | null;
};

type EventRow = {
  id: string;
  case_id: string;
  assignment_id: string | null;
  event_kind: string;
  performed_by_type: string;
  result_summary: string | null;
  occurred_at: string;
};

type RegistryPayload = {
  ok: true;
  contract: string;
  mode: "registry";
  roles: RoleRow[];
  cases: CaseRow[];
  assignments: AssignmentSummary[];
  truncated: { cases: boolean; assignments: boolean };
};

type DetailPayload = {
  ok: true;
  contract: string;
  mode: "case_detail";
  case: Pick<CaseRow, "id" | "case_code" | "title" | "status" | "owner_role_code">;
  assignments: AssignmentDetail[];
  events: EventRow[];
  truncated: { assignments: boolean; events: boolean };
};

type LiveView = "inbox" | "registry";
const CONTRACT = "ARCTOR_ADMIN_ADM2B1_REGISTRY_READ_ONLY_V1";

function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

async function loadJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || !("ok" in body) || body.ok !== true) {
    throw new Error(`Чтение ADM-2B.1 не удалось (HTTP ${response.status}). Проверьте права администратора и миграции ADM-2A.`);
  }
  if (!("contract" in body) || body.contract !== CONTRACT) {
    throw new Error("Версия ответа сервера ADM-2B.1 не совпадает с интерфейсом.");
  }
  return body as T;
}

export default function ArctorAdminLiveRegistry() {
  const [data, setData] = useState<RegistryPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [roleCode, setRoleCode] = useState("process");
  const [view, setView] = useState<LiveView>("inbox");
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void loadJson<RegistryPayload>("/api/admin/management/registry?limit=100", controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (payload.mode !== "registry" || !Array.isArray(payload.roles) || !Array.isArray(payload.cases) || !Array.isArray(payload.assignments)) {
          throw new Error("Неполный ответ сервера ADM-2B.1.");
        }
        setData(payload);
        setError("");
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Ошибка загрузки реестра");
        setStatus("error");
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void loadJson<DetailPayload>(`/api/admin/management/registry?caseId=${encodeURIComponent(selectedId)}`, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (payload.mode !== "case_detail") throw new Error("Неправильный формат истории дела.");
        setDetail(payload);
        setDetailStatus("ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setDetailError(cause instanceof Error ? cause.message : "История недоступна");
        setDetailStatus("error");
      });
    return () => controller.abort();
  }, [selectedId, reload]);

  const openCase = useCallback((id: string) => {
    setDetail(null);
    setDetailError("");
    setDetailStatus("loading");
    setSelectedId(id);
  }, []);

  const roles = data?.roles ?? [];
  const cases = useMemo(() => data?.cases ?? [], [data]);
  const assignments = useMemo(() => data?.assignments ?? [], [data]);
  const assignedIds = useMemo(() => new Set(assignments
    .filter((a) => a.recipient_role_code === roleCode && !["completed", "declined", "cancelled"].includes(a.status))
    .map((a) => a.case_id)), [assignments, roleCode]);
  const displayCases = useMemo(() => cases.filter((item) => {
    if (view === "inbox" && item.owner_role_code !== roleCode && !assignedIds.has(item.id)) return false;
    const needle = filter.trim().toLocaleLowerCase("ru");
    return !needle || [item.case_code, item.title, item.description, item.source_system, item.status]
      .some((text) => text.toLocaleLowerCase("ru").includes(needle));
  }), [cases, view, roleCode, assignedIds, filter]);

  const selectedCase = cases.find((item) => item.id === selectedId);
  const activeRole = roles.find((role) => role.role_code === roleCode);
  const refreshing = () => {
    setStatus("loading");
    setDetail(null);
    setDetailStatus(selectedId ? "loading" : "idle");
    setReload((value) => value + 1);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm md:p-6" data-arctor-adm2b1="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">ADM-2B.1 · постоянный реестр Supabase</p>
          <h2 className="mt-1 text-xl font-bold">Настоящие дела и должностные кабинеты</h2>
          <p className="mt-1 text-sm text-slate-600">Данные Supabase. Запись действий доступна только действующему администратору; демонстрационные дела ADM-1 отделены.</p>
        </div>
        <button type="button" onClick={refreshing} disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />Обновить
        </button>
      </div>

      {status === "loading" && <p role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <LoaderCircle className="h-4 w-4 animate-spin" />Получаем должности и дела из Supabase…
      </p>}
      {status === "error" && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
      </div>}
      {status === "ready" && data && <>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>{roles.length}</strong> должностей в БД</span>
          <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>{cases.length}</strong> реальных дел (показано)</span>
          <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>{assignments.length}</strong> поручений (показано)</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><ShieldCheck className="h-4 w-4"/>Агенты не запускаются</span>
        </div>
        {(data.truncated.cases || data.truncated.assignments) && <p className="text-xs text-amber-800" role="status">
          Достигнут предел выборки. Показаны не все дела или поручения; для полной выборки потребуется постраничная загрузка.
        </p>}
        {roles.length !== 8 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          В реестре найдено {roles.length} должностей вместо ожидаемых восьми. Проверьте ADM-2A.
        </p>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Реальные должности Supabase">
          {roles.map((role) => {
            const count = cases.filter((item) => item.owner_role_code === role.role_code).length;
            return <button type="button" key={role.role_code} onClick={() => { setRoleCode(role.role_code); setView("inbox"); }}
              aria-pressed={role.role_code === roleCode}
              className={`rounded-xl border p-3 text-left ${role.role_code === roleCode ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <p className="text-sm font-semibold">{role.title_ru}</p>
              <p className="mt-1 text-xs text-slate-600">{role.manager_title_ru}</p>
              <p className="mt-2 text-xs text-blue-700">{count} дела в ответственности</p>
            </button>;
          })}
        </div>
        {activeRole && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <strong className="text-slate-800">{activeRole.manager_title_ru}.</strong> {activeRole.responsibility_summary_ru}
        </p>}
        <ArctorAdminCaseActions roles={roles} cases={cases} assignments={assignments} selectedRoleCode={roleCode} onChanged={refreshing} />
        <ArctorAdminSourceLinks cases={cases} onChanged={refreshing} />
        <ArctorAdminWorkQueues />
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <button type="button" onClick={() => setView("inbox")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${view === "inbox" ? "bg-blue-100 text-blue-800" : "bg-slate-50 text-slate-700"}`}>
            <Inbox className="h-4 w-4" />Входящие должности
          </button>
          <button type="button" onClick={() => setView("registry")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${view === "registry" ? "bg-blue-100 text-blue-800" : "bg-slate-50 text-slate-700"}`}>
            <ClipboardList className="h-4 w-4" />Все реальные дела
          </button>
          <input aria-label="Поиск по реальным делам" type="search" value={filter} onChange={(event) => setFilter(event.target.value)}
            placeholder="Найти дело, статус…" className="min-w-40 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        {displayCases.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          {cases.length === 0 ? "В Supabase пока нет зарегистрированных дел. Это нормальное начальное состояние ADM-2A; 14 демонстрационных дел не импортированы." : "У выбранной должности нет соответствующих дел в загруженной выборке."}
        </p>}
        {displayCases.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded border bg-white px-2 py-1 font-mono">{item.case_code}</span>
            <span>{item.case_type}</span><span>• {item.priority}</span><span>• {item.status}</span>
          </div>
          <h3 className="mt-2 font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{item.description || "Описание не добавлено"}</p>
          <p className="mt-2 text-xs text-slate-500">Ответственное направление: {roles.find((r) => r.role_code === item.owner_role_code)?.title_ru ?? item.owner_role_code} · {displayDate(item.created_at)}</p>
          {item.next_expected_result && <p className="mt-1 text-xs text-slate-600">Ожидаемый результат: {item.next_expected_result}</p>}
          {item.source_entity_kind && item.source_external_id && <p className="mt-1 text-xs text-slate-600">Первоисточник: {item.source_entity_kind} · {item.source_external_id.slice(0, 8)}{item.source_path?.startsWith("/") ? <> · <a href={item.source_path} className="text-blue-700 underline">Открыть раздел источника</a></> : null}</p>}
          <button type="button" onClick={() => openCase(item.id)} className="mt-3 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
            <History className="h-4 w-4" />Открыть историю и поручения <ArrowRight className="h-3 w-3" />
          </button>
        </article>)}
        {selectedId && <div className="rounded-xl border border-blue-200 p-4" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold">История дела {selectedCase?.case_code ?? selectedId}</h3>
            <button type="button" onClick={() => { setSelectedId(null); setDetail(null); setDetailStatus("idle"); }} className="text-sm text-blue-700">Закрыть</button>
          </div>
          {detailStatus === "loading" && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Загружаем историю…</p>}
          {detailStatus === "error" && <p role="alert" className="mt-3 text-sm text-red-700">{detailError}</p>}
          {detailStatus === "ready" && detail && <div className="mt-3 space-y-4">
            {detail.truncated.events || detail.truncated.assignments ? <p className="text-xs text-amber-800">Достигнут предел истории или поручений (100 записей).</p> : null}
            <div>
              <h4 className="text-sm font-semibold">Поручения ({detail.assignments.length})</h4>
              {detail.assignments.length === 0 && <p className="mt-2 text-sm text-slate-600">Поручений пока нет.</p>}
              {detail.assignments.map((assignment) => <div key={assignment.id} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium">{assignment.recipient_role_code} · {assignment.status}</p>
                <p className="mt-1 whitespace-pre-wrap">{assignment.assignment_text}</p>
                <p className="mt-1 text-xs text-slate-600">Требуемый результат: {assignment.required_result}</p>
              </div>)}
            </div>
            <div>
              <h4 className="text-sm font-semibold">События истории ({detail.events.length})</h4>
              {detail.events.length === 0 && <p className="mt-2 text-sm text-slate-600">Событий пока нет.</p>}
              {detail.events.map((event) => <div key={event.id} className="mt-2 rounded-lg border-l-2 border-blue-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">{displayDate(event.occurred_at)} · {event.performed_by_type}</p>
                <p className="font-medium">{event.event_kind}</p>
                {event.result_summary && <p className="mt-1 whitespace-pre-wrap">{event.result_summary}</p>}
              </div>)}
            </div>
          </div>}
        </div>}
      </>}
      <p className="text-xs text-slate-500">ADM-2B.2: ручное создание дел, поручений, отчётов и передачи; операции атомарны, история дополняется без редактирования.</p>
    </section>
  );
}
