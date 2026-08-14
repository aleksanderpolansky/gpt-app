"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeLocale, type LocaleCode } from "@/i18n";

type InstructionLocale = "global" | LocaleCode;
type CatalogItem = {
  definition: { code: string; title: string; purpose: string; defaultText: string; runtimeTargets: string[] };
  effective: { code: string; text: string; source: "db_locale" | "db_global" | "code_default"; localeCode: InstructionLocale; instructionSetId: string | null; revision: number | null; updatedAt: string | null };
  selectedOverride: { id: string; status: "active" | "inactive"; current_revision: number; current_instruction_text: string; updated_at: string } | null;
  history: Array<{ id: string; revision: number; instruction_text: string; created_at: string }>;
};
type RuleItem = {
  ruleCode: string;
  title: string;
  purpose: string;
  localeCode: InstructionLocale;
  runtimeTargets: string[];
  matcherCode: string;
  actionCode: string;
  priority: number;
  status: "active" | "inactive";
  parameters: Record<string, unknown>;
  examples: string[];
  source: string;
  revision: number | null;
  updatedAt: string | null;
  isCodeDefault: boolean;
  runtimeConsumption: string;
  history: Array<{ id: string; revision: number; ruleSnapshot: RuleItem | null; createdAt: string }>;
  conflicts: Array<{ withRuleCode: string; severity: "warning" | "info"; resolution: string }>;
};
type GuardItem = {
  guardCode: string;
  title: string;
  purpose: string;
  runtimeTargets: string[];
  sourcePath: string;
  sourceSymbol: string;
  evidenceNeedle: string;
  fullText: string;
  editable: false;
  precedenceRank: 300;
  whyLocked: string;
  changeSteps: string[];
};
type CatalogPayload = {
  ok?: boolean;
  error?: string;
  localeCode?: InstructionLocale;
  maxLength?: number;
  canEdit?: boolean;
  items?: CatalogItem[];
  controlCatalog?: {
    precedence: Array<{ rank: number; code: string; title: string; meaning: string }>;
    matchers: Array<{ code: string; title: string; help: string }>;
    actions: Array<{ code: string; title: string; help: string }>;
    processingRules: RuleItem[];
    systemGuards: GuardItem[];
    runtimeConsumptionNote: string;
    storageContract: { table: string; revisionTable: string; storagePrefix: string; executableCodeInDatabase: boolean };
  };
};

const LOCALES: readonly InstructionLocale[] = ["global", "en", "pl", "ru", "uk", "de", "es", "cs"];
const EMPTY_RULE = {
  ruleCode: "",
  title: "",
  purpose: "",
  localeCode: "global" as InstructionLocale,
  runtimeTargetsText: "activity_quick_capture",
  matcherCode: "modifier_only_measurement",
  actionCode: "attach_to_adjacent_semantic_activity",
  priority: "100",
  status: "active" as "active" | "inactive",
  parametersText: "{}",
  examplesText: "",
};

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(locale) : value;
}

function sourceInstructionLabel(source: CatalogItem["effective"]["source"]) {
  if (source === "db_locale") return "Сохранённая версия для выбранного языка";
  if (source === "db_global") return "Глобальная сохранённая версия";
  return "Резервная версия из кода";
}

export default function AiInstructionsAdminClient() {
  const searchParams = useSearchParams();
  const interfaceLocale = normalizeLocale(searchParams.get("locale") ?? searchParams.get("lang"));
  const [localeCode, setLocaleCode] = useState<InstructionLocale>("global");
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [selectedInstruction, setSelectedInstruction] = useState("");
  const [instructionDraft, setInstructionDraft] = useState("");
  const [selectedRule, setSelectedRule] = useState("");
  const [ruleDraft, setRuleDraft] = useState(EMPTY_RULE);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const items = payload?.items ?? [];
  const control = payload?.controlCatalog;
  const rules = control?.processingRules ?? [];
  const guards = control?.systemGuards ?? [];
  const canEdit = Boolean(payload?.canEdit);
  const instruction = items.find((item) => item.definition.code === selectedInstruction) ?? items[0] ?? null;
  const rule = rules.find((item) => item.ruleCode === selectedRule) ?? null;

  const fillRuleDraft = useCallback((item: RuleItem, targetLocale: InstructionLocale) => {
    setRuleDraft({
      ruleCode: item.ruleCode,
      title: item.title,
      purpose: item.purpose,
      localeCode: targetLocale,
      runtimeTargetsText: item.runtimeTargets.join(", "),
      matcherCode: item.matcherCode,
      actionCode: item.actionCode,
      priority: String(item.priority),
      status: item.status,
      parametersText: JSON.stringify(item.parameters ?? {}, null, 2),
      examplesText: (item.examples ?? []).join("\n"),
    });
  }, []);

  const load = useCallback(async (
    nextLocale: InstructionLocale,
    preserveInstructionCode = "",
    preserveRuleCode = "",
  ) => {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/ai-instructions?locale=${encodeURIComponent(nextLocale)}`, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      const next = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || next?.ok !== true || !next.items || !next.controlCatalog) throw new Error(next?.error || `HTTP ${response.status}`);
      setPayload(next);
      const nextInstruction = next.items.find((item) => item.definition.code === preserveInstructionCode) ?? next.items[0] ?? null;
      setSelectedInstruction(nextInstruction?.definition.code ?? "");
      setInstructionDraft(nextInstruction?.effective.text ?? "");
      const nextRule = next.controlCatalog.processingRules.find((item) => item.ruleCode === preserveRuleCode) ?? next.controlCatalog.processingRules[0] ?? null;
      setSelectedRule(nextRule?.ruleCode ?? "");
      if (nextRule) fillRuleDraft(nextRule, nextLocale);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить каталог.");
    }
  }, [fillRuleDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(localeCode); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, localeCode]);

  async function saveInstruction() {
    if (!instruction || !canEdit || !instructionDraft.trim()) return;
    setStatus("saving"); setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-instructions", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ instructionCode: instruction.definition.code, localeCode, instructionText: instructionDraft }) });
      const next = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || next?.ok !== true) throw new Error(next?.error || `HTTP ${response.status}`);
      setPayload(next); setStatus("idle"); setMessage("Инструкция сохранена новой ревизией.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Ошибка сохранения."); }
  }

  async function restoreInstruction() {
    if (!instruction || !canEdit || !window.confirm("Отключить выбранную DB-версию и вернуть fallback? История сохранится.")) return;
    setStatus("saving"); setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-instructions", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ instructionCode: instruction.definition.code, localeCode }) });
      const next = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || next?.ok !== true) throw new Error(next?.error || `HTTP ${response.status}`);
      setPayload(next); const current = next.items?.find((item) => item.definition.code === instruction.definition.code); setInstructionDraft(current?.effective.text ?? ""); setStatus("idle"); setMessage("Fallback восстановлен; история не удалена.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Ошибка восстановления."); }
  }

  function startNewRule() {
    setSelectedRule("");
    setRuleDraft({ ...EMPTY_RULE, localeCode });
    setMessage("Новая запись использует только разрешённый matcher/action. Исполняемый JS/SQL/regexp из БД запрещён.");
  }

  async function saveRule() {
    if (!canEdit) return;
    setStatus("saving"); setMessage(null);
    try {
      let parameters: Record<string, unknown>;
      try { parameters = JSON.parse(ruleDraft.parametersText || "{}"); } catch { throw new Error("parameters_json содержит некорректный JSON."); }
      const runtimeTargets = ruleDraft.runtimeTargetsText.split(",").map((item) => item.trim()).filter(Boolean);
      const examples = ruleDraft.examplesText.split("\n").map((item) => item.trim()).filter(Boolean);
      const body = {
        entityKind: "processing_rule",
        localeCode,
        rule: {
          ruleCode: ruleDraft.ruleCode.trim(), title: ruleDraft.title.trim(), purpose: ruleDraft.purpose.trim(), localeCode,
          runtimeTargets, matcherCode: ruleDraft.matcherCode, actionCode: ruleDraft.actionCode,
          priority: Number(ruleDraft.priority), status: ruleDraft.status, parameters, examples,
        },
      };
      const response = await fetch("/api/admin/ai-instructions", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
      const next = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || next?.ok !== true || !next.controlCatalog) throw new Error(next?.error || `HTTP ${response.status}`);
      setPayload(next); setSelectedRule(ruleDraft.ruleCode.trim()); setStatus("idle"); setMessage("Правило сохранено новой ревизией.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Ошибка сохранения правила."); }
  }

  async function deactivateRule() {
    if (!canEdit || !ruleDraft.ruleCode || !window.confirm("Убрать DB-override для этого правила и вернуть fallback из кода? Если нужно просто выключить правило, снимите флажок «Активно» и сохраните новую ревизию.")) return;
    setStatus("saving"); setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-instructions", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ entityKind: "processing_rule", ruleCode: ruleDraft.ruleCode, localeCode }) });
      const next = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || next?.ok !== true) throw new Error(next?.error || `HTTP ${response.status}`);
      setPayload(next); const current = next.controlCatalog?.processingRules.find((item) => item.ruleCode === ruleDraft.ruleCode); if (current) fillRuleDraft(current, localeCode); setStatus("idle"); setMessage("DB-override отключён; fallback из кода восстановлен. История сохранена.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Ошибка отключения правила."); }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">ARCTor AI · единый каталог управления</p>
        <h1 className="mt-2 text-3xl font-black text-white">Все инструкции, правила обработки и системные ограничения</h1>
        <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-400">Эта страница показывает единым списком, что именно направляет модель, что детерминированно исполняет сервер и какие ограничения зашиты в код и не могут быть переопределены. Цель — видеть порядок, конфликты, источник каждого правила и процедуру изменения.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(control?.precedence ?? []).sort((a, b) => b.rank - a.rank).map((item) => <div key={item.code} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3"><div className="text-xs font-black text-cyan-200">ПРИОРИТЕТ {item.rank}</div><div className="mt-1 font-bold text-white">{item.title}</div><p className="mt-1 text-xs leading-5 text-slate-400">{item.meaning}</p></div>)}
        </div>
        <details className="mt-4 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4" open>
          <summary className="cursor-pointer text-sm font-bold text-cyan-100">Как менять безопасно и в каком порядке</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
            <li><b>Сначала проверь системные ограничения.</b> Если желаемое поведение им противоречит, prompt и DB-правило не помогут — нужен code release.</li>
            <li><b>Затем проверь детерминированные правила.</b> Для поддерживаемого matcher/action можно менять priority, параметры, статус и примеры без релиза.</li>
            <li><b>После этого меняй инструкцию AI.</b> Она влияет на предложение модели, но не отменяет два верхних слоя.</li>
            <li><b>После изменения проверь историю, конфликты и контрольный пример.</b> Одинаковый matcher + разные actions + одинаковый priority считается конфликтом.</li>
          </ol>
        </details>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-400">Язык/вариант правила<select value={localeCode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setLocaleCode(event.target.value as InstructionLocale)} className="mt-2 block rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">{LOCALES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => void load(localeCode, selectedInstruction, selectedRule)} disabled={status === "saving"} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Перечитать каталог</button>
          <span className="text-xs text-slate-500">Редактирование: {canEdit ? "owner/admin" : "только просмотр"}</span>
        </div>
      </header>

      {message ? <div className={`rounded-xl border p-4 text-sm ${status === "error" ? "border-red-900 bg-red-950/40 text-red-100" : "border-emerald-900 bg-emerald-950/30 text-emerald-100"}`}>{message}</div> : null}

      <section id="ai-instructions" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">1 · Инструкции AI</p><h2 className="mt-1 text-2xl font-black text-white">Редактируемые инструкции модели</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">Это мягкие инструкции: они помогают модели интерпретировать сообщение, но серверные правила и системные ограничения всегда выше. Изменения версионируются в Supabase.</p></div><span className="rounded-full border border-violet-800 px-3 py-1 text-xs text-violet-200">можно редактировать</span></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">{items.map((item) => <button type="button" key={item.definition.code} onClick={() => { setSelectedInstruction(item.definition.code); setInstructionDraft(item.effective.text); setMessage(null); }} className={`w-full rounded-xl border p-3 text-left ${item.definition.code === instruction?.definition.code ? "border-violet-400 bg-violet-950/30" : "border-slate-800 bg-slate-950/50"}`}><div className="font-bold text-white">{item.definition.title}</div><div className="mt-1 text-xs text-slate-500">{item.definition.code}</div><div className="text-xs text-slate-500">runtime: {item.definition.runtimeTargets.join(", ")}</div></button>)}</div>
          {instruction ? <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black text-white">{instruction.definition.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{instruction.definition.purpose}</p></div><div className="text-right text-xs text-slate-500"><div>{sourceInstructionLabel(instruction.effective.source)}</div><div>revision: {instruction.effective.revision ?? "code"}</div><div>{formatDate(instruction.effective.updatedAt, interfaceLocale)}</div></div></div><div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400"><b className="text-slate-200">Где искать:</b> definition — <code>src/lib/ai/processingInstructions.server.ts</code>; DB override — <code>ai_processing_instruction_sets</code>.<br/><b className="text-slate-200">Как менять:</b> обычно редактируй здесь и сохраняй новую ревизию. Если желаемое поведение упирается в системный guard — переходи к разделу 3.</div><textarea value={instructionDraft} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInstructionDraft(event.target.value.slice(0, payload?.maxLength ?? 40000))} disabled={!canEdit || status === "saving"} rows={12} className="mt-3 w-full rounded-xl border border-slate-700 bg-black p-4 font-mono text-xs leading-5 text-slate-100 disabled:opacity-50"/><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void saveInstruction()} disabled={!canEdit || status === "saving" || !instructionDraft.trim()} className="rounded-xl bg-violet-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">Сохранить новую ревизию</button><button type="button" onClick={() => void restoreInstruction()} disabled={!canEdit || status === "saving"} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Вернуть fallback</button></div><details className="mt-4 rounded-xl border border-slate-800 p-3"><summary className="cursor-pointer text-sm font-bold text-white">История ({instruction.history.length})</summary><div className="mt-3 space-y-2">{instruction.history.map((revision) => <div key={revision.id} className="rounded-lg bg-slate-950 p-3 text-xs text-slate-400"><div>revision {revision.revision} · {formatDate(revision.created_at, interfaceLocale)}</div><pre className="mt-2 whitespace-pre-wrap text-slate-300">{revision.instruction_text}</pre></div>)}</div></details></div> : null}
        </div>
      </section>

      <section id="processing-rules" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">2 · Правила обработки</p><h2 className="mt-1 text-2xl font-black text-white">Детерминированные правила</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">Правила хранятся как данные и версии. В БД нельзя положить исполняемый JS/SQL/regexp: администратор выбирает только заранее разрешённый matcher и action, а меняет параметры, priority, язык, статус и примеры.</p></div><button type="button" onClick={startNewRule} disabled={!canEdit} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">+ Новое правило</button></div>
        {control ? <div className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-xs leading-5 text-amber-100"><b>Состояние подключения:</b> {control.runtimeConsumptionNote}<br/><b>Хранилище:</b> {control.storageContract.table} + {control.storageContract.revisionTable}. Исполняемый код в БД: {String(control.storageContract.executableCodeInDatabase)}.</div> : null}
        <div className="mt-5 grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <div className="space-y-2">{rules.map((item) => <button type="button" key={`${item.ruleCode}-${item.localeCode}`} onClick={() => { setSelectedRule(item.ruleCode); fillRuleDraft(item, localeCode); setMessage(null); }} className={`w-full rounded-xl border p-3 text-left ${item.ruleCode === selectedRule ? "border-emerald-400 bg-emerald-950/30" : "border-slate-800 bg-slate-950/50"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-white">{item.title}</span><span className={`text-[10px] font-black uppercase ${item.status === "active" ? "text-emerald-300" : "text-slate-500"}`}>{item.status}</span></div><div className="mt-1 text-xs text-slate-500">{item.ruleCode}</div><div className="text-xs text-slate-500">{item.matcherCode} → {item.actionCode}</div><div className="text-xs text-slate-500">priority {item.priority} · {item.source}</div>{item.conflicts.length > 0 ? <div className="mt-1 text-xs font-bold text-amber-300">конфликтов: {item.conflicts.length}</div> : null}</button>)}</div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400"><b className="text-slate-200">Порядок редактирования:</b> 1) проверь matcher; 2) action; 3) priority; 4) parameters; 5) examples; 6) сохрани; 7) проверь conflicts. Чтобы выключить правило без релиза, снимите флажок «Активно» и сохраните ревизию. Новый matcher/action требует code release; новая запись с уже поддерживаемым matcher/action — нет.<br/><b className="text-slate-200">Где искать executor:</b> <code>src/lib/ai/processingRuleContract.ts</code> (разрешённые типы) и будущий runtime consumer. <b>Где хранятся записи:</b> Supabase, prefix <code>processing_rule__</code>.</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-400">Код правила<input value={ruleDraft.ruleCode} disabled={Boolean(rule) || status === "saving" || !canEdit} onChange={(event: ChangeEvent<HTMLInputElement>) => setRuleDraft((current) => ({ ...current, ruleCode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50"/></label><label className="text-xs text-slate-400">Priority<input type="number" min={-1000} max={1000} value={ruleDraft.priority} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLInputElement>) => setRuleDraft((current) => ({ ...current, priority: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50"/></label></div>
            <label className="mt-3 block text-xs text-slate-400">Название<input value={ruleDraft.title} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLInputElement>) => setRuleDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50"/></label>
            <label className="mt-3 block text-xs text-slate-400">Назначение<textarea value={ruleDraft.purpose} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRuleDraft((current) => ({ ...current, purpose: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50"/></label>
            <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-400">Matcher<select value={ruleDraft.matcherCode} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRuleDraft((current) => ({ ...current, matcherCode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50">{control?.matchers.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select><span className="mt-1 block leading-5 text-slate-500">{control?.matchers.find((item) => item.code === ruleDraft.matcherCode)?.help}</span></label><label className="text-xs text-slate-400">Action<select value={ruleDraft.actionCode} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRuleDraft((current) => ({ ...current, actionCode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50">{control?.actions.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select><span className="mt-1 block leading-5 text-slate-500">{control?.actions.find((item) => item.code === ruleDraft.actionCode)?.help}</span></label></div>
            <label className="mt-3 block text-xs text-slate-400">Runtime targets, через запятую<input value={ruleDraft.runtimeTargetsText} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLInputElement>) => setRuleDraft((current) => ({ ...current, runtimeTargetsText: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-2 text-sm text-white disabled:opacity-50"/></label>
            <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-400">Parameters JSON — только данные<textarea value={ruleDraft.parametersText} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRuleDraft((current) => ({ ...current, parametersText: event.target.value }))} rows={8} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-3 font-mono text-xs text-white disabled:opacity-50"/></label><label className="text-xs text-slate-400">Контрольные примеры, один на строку<textarea value={ruleDraft.examplesText} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRuleDraft((current) => ({ ...current, examplesText: event.target.value }))} rows={8} className="mt-1 w-full rounded-lg border border-slate-700 bg-black p-3 text-xs text-white disabled:opacity-50"/></label></div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={ruleDraft.status === "active"} disabled={!canEdit || status === "saving"} onChange={(event: ChangeEvent<HTMLInputElement>) => setRuleDraft((current) => ({ ...current, status: event.target.checked ? "active" : "inactive" }))}/> Активно</label>
            {rule?.conflicts?.length ? <div className="mt-4 rounded-lg border border-amber-800 bg-amber-950/30 p-3"><div className="text-sm font-black text-amber-200">Конфликты</div>{rule.conflicts.map((conflict) => <div key={conflict.withRuleCode} className="mt-2 text-xs leading-5 text-amber-100"><b>{conflict.withRuleCode}</b>: {conflict.resolution}</div>)}</div> : <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-200">Для выбранной сохранённой версии явных конфликтов одинакового matcher/runtime не обнаружено.</div>}
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void saveRule()} disabled={!canEdit || status === "saving" || !ruleDraft.ruleCode.trim() || !ruleDraft.title.trim()} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">Сохранить новую ревизию</button><button type="button" onClick={() => void deactivateRule()} disabled={!canEdit || status === "saving" || !ruleDraft.ruleCode} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Вернуть fallback из кода</button></div>
            {rule?.history?.length ? <details className="mt-4 rounded-xl border border-slate-800 p-3"><summary className="cursor-pointer text-sm font-bold text-white">История правила ({rule.history.length})</summary><div className="mt-3 space-y-2">{rule.history.map((revision) => <pre key={revision.id} className="whitespace-pre-wrap rounded-lg bg-black p-3 text-xs text-slate-400">revision {revision.revision} · {formatDate(revision.createdAt, interfaceLocale)}{"\n"}{JSON.stringify(revision.ruleSnapshot, null, 2)}</pre>)}</div></details> : null}
          </div>
        </div>
      </section>

      <section id="system-guards" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">3 · Системные ограничения</p><h2 className="mt-1 text-2xl font-black text-white">Видимы здесь, редактируются только через code release</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">Это самые сильные правила. Здесь для каждого указано назначение, реальный файл/символ, причина блокировки и пошаговая процедура изменения. Они существуют именно для того, чтобы редактируемая инструкция или DB-правило не могли разрушить контракт данных.</p></div><span className="rounded-full border border-amber-800 px-3 py-1 text-xs font-bold text-amber-200">read-only</span></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{guards.map((guard) => <article key={guard.guardCode} className="rounded-xl border border-amber-950/70 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase text-amber-300">{guard.guardCode}</div><h3 className="mt-1 font-black text-white">{guard.title}</h3></div><span className="rounded-full border border-amber-900 px-2 py-1 text-[10px] font-bold text-amber-200">priority {guard.precedenceRank}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{guard.purpose}</p><div className="mt-3 rounded-lg bg-black/70 p-3 text-xs leading-5 text-slate-400"><div><b className="text-slate-200">Runtime:</b> {guard.runtimeTargets.join(", ")}</div><div><b className="text-slate-200">Файл:</b> <code>{guard.sourcePath}</code></div><div><b className="text-slate-200">Символ:</b> <code>{guard.sourceSymbol}</code></div><div><b className="text-slate-200">Контрольная строка:</b> <code>{guard.evidenceNeedle}</code></div></div><pre className="mt-3 whitespace-pre-wrap rounded-lg border border-amber-950/70 bg-black p-3 text-xs leading-5 text-slate-300">{guard.fullText}</pre><div className="mt-3 text-xs leading-5 text-amber-100"><b>Почему нельзя редактировать здесь:</b> {guard.whyLocked}</div><details className="mt-3 rounded-lg border border-slate-800 p-3"><summary className="cursor-pointer text-xs font-bold text-white">Что делать, если это всё-таки нужно изменить</summary><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-400">{guard.changeSteps.map((step) => <li key={step}>{step}</li>)}</ol></details></article>)}</div>
      </section>
    </div>
  );
}
