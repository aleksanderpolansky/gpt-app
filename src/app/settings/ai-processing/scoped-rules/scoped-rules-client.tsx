"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACTOR_SCOPED_RULE_VERSION, SCOPED_RULE_LANGUAGES, SCOPED_RULE_INPUT_MODES,
  SCOPED_RULE_MATCH_TYPES, SCOPED_RULE_CODE_RE, createExampleScopedRuleV1,
  validateActorScopedRuleV1, type ActorScopedRuleDocumentV1,
} from "@/lib/ai/actorScopedRulesV1";

type RuleRow = { rule_code: string; current_revision: number; status: "draft" | "disabled";
  document_json: ActorScopedRuleDocumentV1; updated_at: string };
type RevisionRow = { revision: number; action_code: string; document_json: ActorScopedRuleDocumentV1; created_at: string };
type ResponseData = { ok: boolean; errorCode?: string; rules?: RuleRow[]; history?: RevisionRow[];
  actor?: { displayName: string; profileKind: string }; truncated?: boolean };
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const initial = createExampleScopedRuleV1();

// Stable helper: callers fetch asynchronously; effects never synchronously set React state.
async function readCatalog(selectedCode: string | null = null) {
  const url = "/api/ai-processing/scoped-rules" + (selectedCode ? `?code=${encodeURIComponent(selectedCode)}` : "");
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const json = (await res.json()) as ResponseData;
  if (!res.ok || !json.ok) throw new Error(json.errorCode ?? "P32_LOAD_FAILED");
  return json;
}

export default function ScopedRulesClient() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [history, setHistory] = useState<RevisionRow[]>([]);
  const [actor, setActor] = useState<ResponseData["actor"]>();
  const [code, setCode] = useState("pullups_one");
  const [revision, setRevision] = useState(0);
  const [rule, setRule] = useState<ActorScopedRuleDocumentV1>(initial);
  const [lexemes, setLexemes] = useState("один");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Загрузка...");
  const [truncated, setTruncated] = useState(false);

  async function refresh() {
    try {
      const data = await readCatalog();
      setRules(data.rules ?? []); setActor(data.actor); setTruncated(Boolean(data.truncated));
      setMessage("Редактор черновиков. Ни одно правило не исполняется автоматически.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка чтения"); }
  }
  useEffect(() => {
    // Promise callback, not synchronous state changes in the effect body.
    // Ignore responses arriving after unmount or a React StrictMode cleanup.
    let cancelled = false;
    void readCatalog().then((data) => {
      if (cancelled) return;
      setRules(data.rules ?? []);
      setActor(data.actor);
      setTruncated(Boolean(data.truncated));
      setMessage("Редактор черновиков. Ни одно правило не исполняется автоматически.");
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Ошибка чтения");
    });
    return () => { cancelled = true; };
  }, []);

  async function pick(row: RuleRow) {
    setCode(row.rule_code); setRevision(row.current_revision);
    setRule(row.document_json); setLexemes(row.document_json.matcher.lexemes.join("\n"));
    try { const data = await readCatalog(row.rule_code); setHistory(data.history ?? []); }
    catch { setHistory([]); }
    setMessage(`Выбрано ${row.rule_code} · ревизия ${row.current_revision} · ${row.status}`);
  }
  function newDraft() {
    setCode("pullups_one");setRevision(0);setRule(createExampleScopedRuleV1());
    setLexemes("один");setHistory([]);setMessage("Новый черновик; выбери уникальный код.");
  }
  function update(patch: Partial<ActorScopedRuleDocumentV1>) { setRule((prev) => ({ ...prev, ...patch })); }
  function docFromForm() {
    const list = lexemes.split("\n").map((s) => s.trim()).filter(Boolean);
    return validateActorScopedRuleV1({ ...rule, version: ACTOR_SCOPED_RULE_VERSION,
      matcher: { type: rule.matcher.type, lexemes: list } });
  }
  async function write(action: "save" | "disable") {
    if (!SCOPED_RULE_CODE_RE.test(code)) { setMessage("Код: латинские строчные буквы, цифры, _, от 3 до 48 символов."); return; }
    const document = action === "save" ? docFromForm() : null;
    if (action === "save" && !document) { setMessage("Проверь язык, режим, слова-триггеры и текст активности."); return; }
    if (action === "disable" && revision === 0) return;
    setBusy(true); setMessage("Сохранение...");
    try {
      const res = await fetch("/api/ai-processing/scoped-rules", {
        method: "PUT", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleCode: code, expectedRevision: revision, action, document }),
      });
      const json = (await res.json()) as ResponseData & { revision?: number };
      if (!res.ok || !json.ok) throw new Error(json.errorCode ?? "P32_SAVE_FAILED");
      const next = await readCatalog();
      setRules(next.rules ?? []); setActor(next.actor); setTruncated(Boolean(next.truncated));
      const row = (next.rules ?? []).find((item) => item.rule_code === code);
      if (row) await pick(row);
      setMessage(`Сохранено: ${code} · v${json.revision ?? row?.current_revision ?? "?"} · ${action === "save" ? "черновик" : "выключено"}. Runtime не подключён.`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "P32_SAVE_FAILED";
      setMessage(reason === "P32_REVISION_CONFLICT" ? "Конфликт ревизий: обнови список перед повторным сохранением." : reason);
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">ARCTor · MVP 3 · P3.2</p>
      <h1 className="mt-2 text-2xl font-bold">Мои структурированные правила</h1>
      <p className="mt-2 text-sm text-slate-600">Создание и версии персональных правил, привязанных к активному профилю. Здесь нет запуска правил, вызовов ИИ, записи активностей и фактов.</p>
      <p className="mt-2 text-xs text-slate-500">Профиль: {actor ? `${actor.displayName} (${actor.profileKind})` : "не загружен"}. При переключении профиля обнови эту страницу.</p>
      <Link href="/settings/ai-processing" className="mt-3 inline-block text-sm font-bold text-blue-700 underline">← Общие персональные инструкции</Link>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Сохранённые правила</h2><button type="button" onClick={newDraft} className="rounded-lg border px-3 py-2 text-sm">+ Новый черновик</button></div>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {truncated && <p className="text-amber-700 text-xs">Отображены первые 50 правил.</p>}
      <div className="mt-3 grid gap-2 md:grid-cols-2">{rules.map((r) => <button type="button" key={r.rule_code} onClick={() => void pick(r)} className={`rounded-lg border p-3 text-left text-sm ${r.rule_code===code && revision>0 ? "border-blue-500 bg-blue-50":"border-slate-200"}`}>
        <b>{r.rule_code}</b><span className="ml-2 text-xs text-slate-600">v{r.current_revision} · {r.status}</span>
        <span className="mt-1 block text-xs text-slate-500">{r.document_json?.matcher?.lexemes?.join(", ")}</span>
      </button>)}</div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Условие → предложение сырой активности</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">Код правила (уникальный)<input value={code} onChange={(e) => setCode(e.target.value)} disabled={revision>0} maxLength={48} className={input}/></label>
        <label className="text-sm">Язык<select value={rule.localeCode} onChange={(e) => update({localeCode:e.target.value as ActorScopedRuleDocumentV1["localeCode"]})} className={input}>{SCOPED_RULE_LANGUAGES.map((x)=><option value={x} key={x}>{x}</option>)}</select></label>
        <label className="text-sm">Способ ввода<select value={rule.inputMode} onChange={(e)=>update({inputMode:e.target.value as ActorScopedRuleDocumentV1["inputMode"]})} className={input}>{SCOPED_RULE_INPUT_MODES.map((x)=><option value={x} key={x}>{x}</option>)}</select></label>
        <label className="text-sm">Совпадение<select value={rule.matcher.type} onChange={(e)=>update({matcher:{...rule.matcher,type:e.target.value as ActorScopedRuleDocumentV1["matcher"]["type"]}})} className={input}>{SCOPED_RULE_MATCH_TYPES.map((x)=><option value={x} key={x}>{x}</option>)}</select></label>
        <label className="text-sm md:col-span-2">Триггер: при lexeme_set — один вариант на строку<textarea rows={3} value={lexemes} onChange={(e)=>setLexemes(e.target.value)} className={input}/></label>
        <label className="text-sm md:col-span-2">Текст предлагаемой сырой активности<textarea rows={3} value={rule.expandedText} onChange={(e)=>update({expandedText:e.target.value})} maxLength={600} className={input}/></label>
      </div>
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
        <b>Предпросмотр описания (не запуск):</b>
        <p className="mt-2 text-slate-600">Триггер: {lexemes.trim() || "(не указан)"}</p>
        <p className="mt-1 text-slate-600">Предлагаемая сырая активность: {rule.expandedText || "(не задана)"}</p>
        <p className="mt-2 text-xs text-slate-500">Только визуальная проверка сохранённого определения. Совпадения с вводом будут проверяться на P3.3.</p>
      </div>
      <p className="mt-3 text-xs text-slate-600">Фиксированная область: личные активности → quick capture → исходное событие. Нельзя выбрать публикации, факты, SQL, JS или другой API-исполнитель.</p>
      <p className="mt-2 text-xs text-slate-600">Текущая ревизия: {revision || "новый"}. Переход к исполнению запланирован отдельно в P3.4, после тестов P3.3.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={()=>void write("save")} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Сохранить черновик</button>
        <button disabled={busy || revision===0} type="button" onClick={()=>void write("disable")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Выключить</button>
        <button disabled={busy} type="button" onClick={()=>void refresh()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Обновить список</button></div>
      <details className="mt-5 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold text-sm">История ревизий ({history.length})</summary><div className="mt-3 space-y-2">{history.map((item)=><div key={item.revision} className="rounded-lg bg-slate-50 p-2 text-xs"><b>v{item.revision}</b> · {item.action_code} · {item.created_at}<p className="mt-1 whitespace-pre-wrap">{item.document_json.expandedText}</p></div>)}</div></details>
    </section>
  </div>;
}
