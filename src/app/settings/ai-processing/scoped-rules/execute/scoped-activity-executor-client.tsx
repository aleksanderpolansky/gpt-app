"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActorScopedRuleDocumentV1 } from "@/lib/ai/actorScopedRulesV1";

type Rule = { rule_code: string; current_revision: number; status: "draft" | "disabled";
  document_json: ActorScopedRuleDocumentV1 };
type Catalog = { ok: boolean; errorCode?: string; rules?: Rule[]; actor?: { displayName: string; profileKind: string } };
type Sim = { ok: boolean; errorCode?: string; revision?: number; cases?: Array<{
  previewMatch: boolean; proposedRawActivity: string | null; reason: string;
}> };
type Receipt = { ok?: boolean; error?: string; signalId?: string; duplicate?: boolean;
  result?: { activityEventId?: string; [key: string]: unknown } };
type Preview = { originalText: string; proposedText: string; ruleCode: string; revision: number; localeCode: string };

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
async function readP34Catalog(): Promise<Catalog> {
  const r = await fetch("/api/ai-processing/scoped-rules", { credentials: "same-origin", cache: "no-store" });
  const data = (await r.json()) as Catalog;
  if (!r.ok || !data.ok) throw new Error(data.errorCode ?? "P34_CATALOG_UNAVAILABLE");
  return data;
}

export default function ScopedActivityExecutorClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [actor, setActor] = useState<Catalog["actor"]>();
  const [ruleCode, setRuleCode] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Загрузка правил активного профиля...");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const requestId = useRef("");

  useEffect(() => {
    let cancelled = false;
    void readP34Catalog().then((data) => {
      if (!cancelled) { setRules(data.rules ?? []); setActor(data.actor);
        setMessage("Готово. Выбери черновик с режимом text_activity."); }
    }).catch((e: unknown) => { if (!cancelled) setMessage(e instanceof Error ? e.message : "Ошибка загрузки"); });
    return () => { cancelled = true; };
  }, []);

  const selected = rules.find((r) => r.rule_code === ruleCode);
  function invalidateProposal() { setPreview(null); setReceipt(null); requestId.current = ""; }
  async function showProposal() {
    if (!selected || selected.status !== "draft" || selected.document_json.inputMode !== "text_activity") return;
    setBusy(true); invalidateProposal(); setMessage("Проверяем правило на сервере...");
    const rule = selected.document_json;
    try {
      const response = await fetch("/api/ai-processing/scoped-rules/simulate", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ruleCode: selected.rule_code, compareRevision: null, cases: [{
          label: "p34_proposal", text: originalText, expectedMatch: true,
          localeCode: rule.localeCode, inputMode: "text_activity", domainCode: rule.domainCode,
          surfaceCode: rule.surfaceCode, eventType: rule.eventType,
        }]}),
      });
      const data = (await response.json()) as Sim;
      if (!response.ok || !data.ok) throw new Error(data.errorCode ?? "P34_PREVIEW_FAILED");
      const c = data.cases?.[0];
      if (!c?.previewMatch || !c.proposedRawActivity) {
        setMessage(`Правило не применимо: ${c?.reason ?? "NO_MATCH"}. Ничего не записано.`);
        return;
      }
      if (data.revision !== selected.current_revision) throw new Error("P34_REVISION_CHANGED");
      requestId.current = `p34:${crypto.randomUUID()}`;
      setPreview({originalText, proposedText: c.proposedRawActivity, ruleCode: selected.rule_code,
        revision: selected.current_revision, localeCode: rule.localeCode });
      setMessage("Распознано → предложено. Проверь текст и подтверди запись через Quick Capture.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "P34_PREVIEW_FAILED"); }
    finally { setBusy(false); }
  }

  async function confirmCapture() {
    if (!preview || !requestId.current) return;
    setBusy(true); setMessage("Отправка подтверждённой активности в стандартный Quick Capture...");
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const response = await fetch("/api/activity/quick-capture", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText: preview.originalText, locale: preview.localeCode,
          temporalDirection: "past", timeZone: zone,
          clientRequestId: requestId.current,
          scopedRule: {ruleCode: preview.ruleCode, expectedRevision: preview.revision, inputMode: "text_activity"},
        }),
      });
      const data = (await response.json()) as Receipt;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "P34_CAPTURE_FAILED");
      setReceipt(data);
      setMessage(data.duplicate ? "Запись уже существовала для этого запроса — дубликат не создан." :
        "Записано через стандартный Quick Capture. Дальнейшая обработка выполняется существующим маршрутом.");
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "P34_CAPTURE_FAILED"}. При повторе используется тот же requestId.`);
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">ARCTor · MVP 3 · P3.4</p>
      <h1 className="mt-2 text-2xl font-bold">Персональное правило → сырая активность</h1>
      <p className="mt-2 text-sm text-slate-600">Один ограниченный исполнитель: распознать сохранённое правило, показать предложение, затем по твоему подтверждению вызвать обычный Quick Capture. Семантические факты не создаются напрямую.</p>
      <p className="mt-2 text-xs text-slate-500">Активный профиль: {actor ? `${actor.displayName} (${actor.profileKind})` : "не определён"}. При смене профиля обнови страницу.</p>
      <Link href="/settings/ai-processing/scoped-rules?locale=ru" className="mt-3 inline-block text-sm font-semibold text-blue-700 underline">← Редактор персональных правил</Link>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="text-lg font-semibold">1. Ввод и проверка</h2>
      <label className="block text-sm">Правило активного профиля
        <select className={inputClass} value={ruleCode} onChange={(e) => {
          setRuleCode(e.target.value); invalidateProposal();
          const r = rules.find((x) => x.rule_code === e.target.value);
          setOriginalText(r?.document_json.matcher.lexemes[0] ?? "");
        }}><option value="">— выбери правило —</option>
          {rules.map((r) => <option key={r.rule_code} value={r.rule_code}>{r.rule_code} · v{r.current_revision} · {r.status} · {r.document_json.inputMode}</option>)}
        </select>
      </label>
      <label className="block text-sm">Исходное сообщение пользователя
        <textarea className={inputClass} rows={3} maxLength={600} value={originalText}
          onChange={(e) => {setOriginalText(e.target.value); invalidateProposal();}}/>
      </label>
      <p className="text-xs text-slate-500">Ограничение P3.4: запись только завершённой активности (past), без планирования или создания повторяющихся событий.</p>
      <button type="button" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!selected || selected.status !== "draft" || selected.document_json.inputMode !== "text_activity" || busy || !originalText.trim()}
        onClick={() => void showProposal()}>Проверить и предложить</button>
      <p className="text-sm text-slate-600">{message}</p>
      {selected && selected.document_json.inputMode !== "text_activity" && <p className="text-xs text-amber-700">В P3.4 подключён только текстовый маршрут. Голосовая команда не исполняется.</p>}
    </section>
    {preview && <section className="rounded-2xl border border-blue-200 bg-white p-5 space-y-3">
      <h2 className="text-lg font-semibold">2. Распознано → предложено</h2>
      <p className="text-xs text-slate-500">{preview.ruleCode} · v{preview.revision} · {preview.localeCode}</p>
      <p className="text-sm"><b>Оригинал:</b> {preview.originalText}</p>
      <p className="rounded-lg bg-blue-50 p-3 text-sm"><b>Предлагаемая сырая активность:</b> {preview.proposedText}</p>
      <p className="text-xs text-slate-600">Это предложение, пока запись не выполнена. При подтверждении сервер заново проверит профиль, статус и ревизию правила. Совпадение бесплатно; стандартный последующий анализ активности может отдельно использовать ИИ согласно настройкам платформы.</p>
      <button type="button" className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy || Boolean(receipt?.ok)} onClick={() => void confirmCapture()}>Подтвердить и добавить сырую активность</button>
    </section>}
    {receipt?.ok && <section className="rounded-2xl border border-green-200 bg-white p-5 space-y-2">
      <h2 className="text-lg font-semibold">3. Записано</h2>
      <p className="text-sm">Signal ID: <code>{receipt.signalId ?? "—"}</code>. {receipt.duplicate ? "Повторный запрос — без дублирования." : "Новая запись создана."}</p>
      <Link href="/activity-today?locale=ru" className="text-blue-700 underline text-sm">Открыть журнал активностей</Link>
    </section>}
  </div>;
}
