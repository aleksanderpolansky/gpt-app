"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  GOVERNANCE_DOMAINS_V1, GOVERNANCE_LAYERS_V1, GOVERNANCE_WORKFLOW_STAGES_V1,
  type GovernanceDomainCode,
} from "@/lib/ai/governanceRegistryV1";
import {
  GOVERNANCE_SAMPLE_ACTIVITY_RULE_V1, GOVERNANCE_SAMPLE_PRICE_RULE_V1,
  previewGovernanceRuleV1, type GovernanceRuleDraftV1,
} from "@/lib/ai/governanceRulePreviewV1";

const STATES: Record<string, string> = {
  runtime_wired: "Подключено", existing_partial: "Частично работает", catalog_only: "Только каталог",
  planned: "Планируется", design_ready: "Проектный контракт", not_connected: "Не подключено",
  not_connected_in_this_registry: "Интеграция не подключена",
};
const inputClass = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100";

export default function GovernanceClient() {
  const [selectedDomain, setSelectedDomain] = useState<GovernanceDomainCode>("personal_activities");
  const [draft, setDraft] = useState<GovernanceRuleDraftV1>(GOVERNANCE_SAMPLE_ACTIVITY_RULE_V1);
  const [sourceText, setSourceText] = useState("один");
  const [testDomain, setTestDomain] = useState<"personal_activities" | "publications">("personal_activities");
  const [testInputMode, setTestInputMode] = useState<GovernanceRuleDraftV1["inputMode"]>("voice_command");
  const [testLocale, setTestLocale] = useState<GovernanceRuleDraftV1["locale"]>("ru");
  const [copied, setCopied] = useState(false);
  const selected = GOVERNANCE_DOMAINS_V1.find((x) => x.code === selectedDomain);
  const preview = useMemo(() => previewGovernanceRuleV1(draft, {
    text: sourceText, domain: testDomain, inputMode: testInputMode, locale: testLocale,
  }), [draft, sourceText, testDomain, testInputMode, testLocale]);

  function loadSample(kind: "activity_phrase" | "publication_price_marker") {
    const next = kind === "activity_phrase" ? GOVERNANCE_SAMPLE_ACTIVITY_RULE_V1 : GOVERNANCE_SAMPLE_PRICE_RULE_V1;
    setDraft(next); setTestDomain(kind === "activity_phrase" ? "personal_activities" : "publications");
    setTestInputMode(next.inputMode); setTestLocale(next.locale);
    setSourceText(kind === "activity_phrase" ? "один" : "Картофель стоит 12,90 крон за килограмм");
    setCopied(false);
  }

  return <div className="space-y-6">
    <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">ARCTor · AI Governance · MVP 1</p>
      <h1 className="mt-2 text-2xl font-bold text-white">Единый реестр направлений, правил и ИИ-исполнителей</h1>
      <p className="mt-2 text-sm text-slate-300">Сначала карта применимости и безопасная симуляция. Эта страница не исполняет ИИ, не списывает AI EUR и не записывает факты.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/ai-instructions" className="rounded-lg border border-violet-500 px-3 py-2 text-violet-200 hover:bg-slate-800">Системные инструкции и ревизии →</Link>
        <Link href="/settings/ai-processing" className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-800">Персональные инструкции →</Link>
        <Link href="/admin" className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-800">Админка →</Link>
      </div>
      <p className="mt-3 text-xs text-amber-200">Не путайте наличие записи в каталоге с реальным подключением правила. Статусы ниже — карта подтверждённых и запланированных возможностей, не мониторинг runtime в реальном времени.</p>
    </header>

    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
      <h2 className="text-lg font-bold">1 · Направления обработки</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(210px,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">{GOVERNANCE_DOMAINS_V1.map((x) => <button key={x.code} type="button" onClick={() => setSelectedDomain(x.code)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedDomain === x.code ? "border-violet-400 bg-violet-950/40" : "border-slate-700 bg-slate-950"}`}>
          <span className="block font-semibold">{x.title}</span><span className="mt-1 block text-xs text-slate-400">{STATES[x.connection]}</span>
        </button>)}</div>
        {selected && <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
          <h3 className="font-semibold text-violet-200">{selected.title}</h3>
          <p className="mt-3 text-slate-300"><b>Источники:</b> {selected.inputExamples.join(" · ")}</p>
          <p className="mt-2 text-slate-300"><b>Обработка:</b> {selected.processingExamples.join(" · ")}</p>
          <p className="mt-3 rounded-lg bg-slate-900 p-3 text-amber-100">{selected.currentEvidence}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-violet-300"><Link href={selected.systemLink}>Системная настройка →</Link><Link href={selected.personalLink}>Персональная настройка →</Link></div>
        </div>}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
      <h2 className="text-lg font-bold">2 · Приоритеты и маршрут</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">{GOVERNANCE_LAYERS_V1.map((x) => <div key={x.code} className="rounded-lg border border-slate-700 p-3 text-sm"><b>{x.level}. {x.title}</b><p className="text-xs text-slate-400">{x.editor} · {x.mutability}</p></div>)}</div>
        <div className="space-y-2">{GOVERNANCE_WORKFLOW_STAGES_V1.map((x,i) => <div key={x.code} className="flex justify-between gap-2 rounded-lg border border-slate-700 p-3 text-sm"><span>{i+1}. {x.title}</span><span className="shrink-0 text-xs text-slate-400">{STATES[x.state]}</span></div>)}</div>
      </div>
    </section>

    <section className="rounded-2xl border border-violet-700 bg-slate-900/70 p-5" id="rule-sandbox">
      <h2 className="text-lg font-bold">3 · Конструктор черновика и симулятор</h2>
      <p className="mt-2 text-sm text-slate-300">Формула: событие → область применения → точное совпадение/фраза → предлагаемое действие. Нет сохранения в БД, реальных записей или вызова модели.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => loadSample("activity_phrase")} className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white">Пример «один» → активность</button>
        <button type="button" onClick={() => loadSample("publication_price_marker")} className="rounded-lg border border-violet-500 px-3 py-2 text-sm text-violet-100">Пример цены за килограмм</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">Вид правила<select className={inputClass} value={draft.kind} onChange={e => loadSample(e.target.value as GovernanceRuleDraftV1["kind"])}><option value="activity_phrase">Персональная команда</option><option value="publication_price_marker">Маркер цены в публикации</option></select></label>
        <label className="text-xs text-slate-300">Язык правила<select className={inputClass} value={draft.locale} onChange={e => setDraft({...draft, locale:e.target.value as GovernanceRuleDraftV1["locale"]})}>{["ru","pl","uk","en","de","es","cs"].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
        <label className="text-xs text-slate-300">Способ сравнения<select className={inputClass} value={draft.matchMode} onChange={e => setDraft({...draft, matchMode:e.target.value as GovernanceRuleDraftV1["matchMode"]})}><option value="exact_phrase">Точное совпадение</option><option value="contains_phrase">Текст содержит фразу</option></select></label>
        <label className="text-xs text-slate-300">Триггер<input className={inputClass} maxLength={120} value={draft.phrase} onChange={e => setDraft({...draft, phrase:e.target.value})}/></label>
        <label className="text-xs text-slate-300 md:col-span-2">Предложенное действие (только черновик)<textarea className={inputClass} rows={2} maxLength={600} value={draft.proposedOutput} onChange={e => setDraft({...draft, proposedOutput:e.target.value})}/></label>
      </div>
      <div className="mt-5 border-t border-slate-700 pt-4">
        <h3 className="font-semibold">Проверка области применения</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-300">Источник события<select className={inputClass} value={testDomain} onChange={e => setTestDomain(e.target.value as typeof testDomain)}><option value="personal_activities">Персональная активность</option><option value="publications">Публикация</option></select></label>
          <label className="text-xs text-slate-300">Канал ввода<select className={inputClass} value={testInputMode} onChange={e => setTestInputMode(e.target.value as typeof testInputMode)}><option value="voice_command">Голосовая команда</option><option value="text_activity">Текст активности</option><option value="feed_post">Пост в ленте</option></select></label>
          <label className="text-xs text-slate-300">Язык теста<select className={inputClass} value={testLocale} onChange={e => setTestLocale(e.target.value as typeof testLocale)}>{["ru","pl","uk","en","de","es","cs"].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
        </div>
        <label className="mt-3 block text-xs text-slate-300">Текст входящего события<textarea className={inputClass} rows={2} maxLength={5000} value={sourceText} onChange={e => setSourceText(e.target.value)}/></label>
        <div className="mt-4 rounded-xl border border-slate-600 bg-slate-950 p-4" aria-live="polite">
          <div className={preview.matched ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>{preview.matched ? "Совпадение — только симуляция" : preview.status === "invalid_rule" ? "Некорректное правило" : "Правило не применимо"}</div>
          <p className="mt-1 text-xs text-slate-400">{preview.reason}</p>
          {preview.proposedOutput && <p className="mt-2 text-sm text-white">{preview.proposedOutput}</p>}
          <p className="mt-3 text-xs text-slate-400">DB write: NO · AI call: NO · AI EUR: 0 · Runtime activation: NO</p>
        </div>
        <button type="button" className="mt-3 rounded-lg border border-slate-500 px-3 py-2 text-sm" onClick={() => {void navigator.clipboard.writeText(JSON.stringify(draft,null,2)).then(() => setCopied(true), () => setCopied(false));}}>{copied ? "Черновик скопирован" : "Копировать JSON черновика"}</button>
        <p className="mt-2 text-xs text-amber-200">JSON — лишь описание правила. Его нельзя импортировать как исполняемый скрипт; подключение к runtime требует отдельной проверки и релиза.</p>
      </div>
    </section>
  </div>;
}
