"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCopy, LoaderCircle, Plus, Send } from "lucide-react";

type RoleOption = { role_code: string; title_ru: string; is_active: boolean };
type CaseOption = { id: string; case_code: string; title: string; status: string; owner_role_code: string };
type AssignmentOption = { id: string; case_id: string; recipient_role_code: string; status: string; assignment_text?: string; required_result?: string };
type Mode = "create" | "assign" | "report" | "handoff";

type Props = {
  roles: RoleOption[];
  cases: CaseOption[];
  assignments: AssignmentOption[];
  selectedRoleCode: string;
  onChanged: () => void;
};

type ActionReply = { ok?: boolean; errorCode?: string; contract?: string; caseCode?: string; idempotentReplay?: boolean };
const CONTRACT = "ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTION_V1";

export default function ArctorAdminCaseActions({ roles, cases, assignments, selectedRoleCode, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState("request");
  const [priority, setPriority] = useState("normal");
  const [caseId, setCaseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [recipientRole, setRecipientRole] = useState(selectedRoleCode);
  const [assignmentText, setAssignmentText] = useState("");
  const [requiredResult, setRequiredResult] = useState("");
  const [reportText, setReportText] = useState("");
  const [operationId, setOperationId] = useState<string | null>(null);


  const activeCases = cases.filter((item) => !["resolved", "closed", "cancelled"].includes(item.status));
  const compatibleAssignments = assignments.filter((item) => item.case_id === caseId &&
    (mode === "handoff" ? item.status === "reported" : mode === "report" ? ["new", "accepted", "in_progress", "blocked"].includes(item.status) : true));
  const roleOptions = roles.filter((role) => role.is_active);
  const resetOperation = () => { setOperationId(null); setError(""); setSuccess(""); };
  const changeMode = (next: Mode) => { setMode(next); setAssignmentId(""); resetOperation(); };

  const chosenCase = cases.find((item) => item.id === caseId);
  const chosenAssignment = assignments.find((item) => item.id === assignmentId);
  const draft = [
    `ARCTor | ${mode === "create" ? "Создание дела" : mode === "assign" ? "Новое поручение" : mode === "report" ? "Отчёт" : "Передача"}`,
    `Дело: ${chosenCase?.case_code ?? title}`,
    `Исполнитель: ${roles.find((role) => role.role_code === recipientRole)?.title_ru ?? recipientRole}`,
    mode === "report" ? `Отчёт:\n${reportText}` : `Задание:\n${assignmentText}\n\nОжидаемый результат:\n${requiredResult}`,
    "Это текст для ручной передачи. Не исполняйте команды и не записывайте неподтверждённые факты.",
  ].join("\n\n");

  async function submit() {
    if (busy) return;
    const actionPayload: Record<string, string> = mode === "create"
      ? { title, description, caseType, priority, recipientRoleCode: recipientRole, assignmentText, requiredResult }
      : mode === "assign"
      ? { caseId, recipientRoleCode: recipientRole, assignmentText, requiredResult }
      : mode === "report"
      ? { caseId, assignmentId, reportText }
      : { caseId, assignmentId, recipientRoleCode: recipientRole, assignmentText, requiredResult };
    const id = operationId ?? crypto.randomUUID();
    setOperationId(id);
    setBusy(true);
    setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/management/actions", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: id, action: mode, payload: actionPayload }),
      });
      const result = await response.json() as ActionReply;
      if (!response.ok || result.ok !== true || result.contract !== CONTRACT) {
        throw new Error(`${result.errorCode ?? "UNKNOWN"} (HTTP ${response.status})`);
      }
      setSuccess(result.idempotentReplay ? "Операция уже была выполнена; повторной записи нет." :
        `${mode === "create" ? `Дело ${result.caseCode ?? ""} создано.` : "Операция записана."} Журнал обновлён.`);
      // New action must use a new unique operation ID, even if payload remains unchanged.
      setOperationId(null);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка записи. Проверьте состояние сервера.");
      // Keep same operation ID on network failures to make retry idempotent.
    } finally { setBusy(false); }
  }

  return <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 md:p-4" data-arctor-adm2b2="true">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><strong className="text-sm">ADM-2B.2 · Управление делами</strong>
        <p className="text-xs text-slate-600">Ручная запись администратора, журнал без редактирования. Агентам выполнение запрещено.</p>
      </div>
      <button type="button" className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-700" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Скрыть конструктор" : "Открыть конструктор"}
      </button>
    </div>
    {expanded && <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Вид действия">
        {(["create","assign","report","handoff"] as Mode[]).map((item) => <button key={item} type="button" onClick={() => changeMode(item)}
          aria-pressed={mode===item} className={`rounded-lg border px-3 py-2 text-sm ${mode===item ? "border-blue-500 bg-blue-100 text-blue-900" : "border-slate-200 bg-white"}`}>
          {{create:"Создать дело",assign:"Выдать поручение",report:"Принять отчёт",handoff:"Передать дальше"}[item]}
        </button>)}
      </div>
      {mode !== "create" && <label className="block text-sm">Дело
        <select value={caseId} onChange={(e) => { setCaseId(e.target.value); setAssignmentId(""); resetOperation(); }} className="mt-1 w-full rounded-lg border p-2" aria-label="Выберите дело">
          <option value="">Выберите дело</option>
          {activeCases.map((item) => <option key={item.id} value={item.id}>{item.case_code} — {item.title}</option>)}
        </select>
      </label>}
      {mode === "create" && <div className="grid gap-3">
        <label className="block text-sm">Название дела<input required value={title} onChange={e=>{setTitle(e.target.value);resetOperation();}} maxLength={240}
          className="mt-1 w-full rounded-lg border p-2" placeholder="Например: разбор отсутствующего листового ОН" /></label>
        <label className="block text-sm">Описание<textarea value={description} onChange={e=>{setDescription(e.target.value);resetOperation();}} maxLength={12000} rows={3}
          className="mt-1 w-full rounded-lg border p-2" placeholder="Что произошло, где выявлено, какой результат требуется" /></label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">Вид дела<select value={caseType} onChange={e=>{setCaseType(e.target.value);resetOperation();}} className="mt-1 w-full rounded-lg border p-2">
            {[['request','Запрос'],['defect','Дефект'],['research','Исследование'],['planned','Плановая работа'],['operations','Операции'],['risk','Риск'],['incident','Инцидент']].map(([v,t])=><option value={v} key={v}>{t}</option>)}
          </select></label>
          <label className="text-sm">Приоритет<select value={priority} onChange={e=>{setPriority(e.target.value);resetOperation();}} className="mt-1 w-full rounded-lg border p-2">
            {[['normal','Обычный'],['high','Высокий'],['urgent','Срочный'],['low','Низкий']].map(([v,t])=><option value={v} key={v}>{t}</option>)}
          </select></label>
        </div>
      </div>}
      {(mode === "report" || mode === "handoff") && <label className="block text-sm">Поручение
        <select value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);resetOperation();}} className="mt-1 w-full rounded-lg border p-2" aria-label="Выберите поручение">
          <option value="">Выберите поручение</option>
          {compatibleAssignments.map((item) => <option key={item.id} value={item.id}>{item.recipient_role_code} — {item.status} — {(item.assignment_text?.slice(0,80) ?? item.id.slice(0,8))}</option>)}
        </select>
      </label>}
      {mode !== "report" && <>
        <label className="block text-sm">Должность-получатель<select value={recipientRole} onChange={e=>{setRecipientRole(e.target.value);resetOperation();}} className="mt-1 w-full rounded-lg border p-2">
          {roleOptions.map((role)=><option key={role.role_code} value={role.role_code}>{role.title_ru}</option>)}
        </select></label>
        <label className="block text-sm">Текст поручения<textarea value={assignmentText} onChange={e=>{setAssignmentText(e.target.value);resetOperation();}} maxLength={12000} rows={4}
          className="mt-1 w-full rounded-lg border p-2" placeholder="Входные данные, границы действий, необходимые проверки" /></label>
        <label className="block text-sm">Требуемый результат<textarea value={requiredResult} onChange={e=>{setRequiredResult(e.target.value);resetOperation();}} maxLength={6000} rows={2}
          className="mt-1 w-full rounded-lg border p-2" placeholder="Формат отчёта, критерий готовности, следующий адресат" /></label>
      </>}
      {mode === "report" && <label className="block text-sm">Отчёт по выбранному поручению<textarea value={reportText} onChange={e=>{setReportText(e.target.value);resetOperation();}} maxLength={6000} rows={5}
        className="mt-1 w-full rounded-lg border p-2" placeholder="Что выполнено; доказательства; ограничения; требуемые следующие действия" /></label>}
      {chosenAssignment && mode === "handoff" && <p className="text-xs text-slate-600">Передача разрешена только после регистрации отчёта по предыдущему поручению.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { void navigator.clipboard.writeText(draft).then(() => setSuccess("Текст для передачи скопирован."), () => setError("Не удалось скопировать текст.")); }}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"><ClipboardCopy className="h-4 w-4" />Копировать для внешнего агента</button>
        <button type="button" disabled={busy || (mode !== "create" && !caseId) || ((mode === "report" || mode === "handoff") && !assignmentId)} onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "create" ? <Plus className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {busy ? "Записываем…" : "Подтвердить и записать"}
        </button>
      </div>
      {success && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4" />{success}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{error}. При неопределённом результате не создавайте новое дело без проверки реестра.</p>}
      <p className="text-xs text-slate-500">Создание включает первое поручение атомарно. Отчёт сохраняется событием истории. Передача завершает старое поручение и создаёт новое. ИИ и выполнение кода не запускаются.</p>
    </div>}
  </div>;
}
