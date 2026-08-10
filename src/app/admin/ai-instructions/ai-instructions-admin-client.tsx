"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { normalizeLocale, type LocaleCode } from "@/i18n";
import {
  formatAiProcessingTemplate,
  getAiProcessingBrowserLocale,
  getAiProcessingInstructionLanguageLabel,
  getAiProcessingInstructionUiCopy,
  getAiProcessingUiCopy,
} from "@/i18n/messages/ai-processing";

type InstructionLocale = "global" | LocaleCode;

type CatalogItem = {
  definition: { code: string; title: string; purpose: string; defaultText: string; runtimeTargets: string[] };
  effective: { code: string; text: string; source: "db_locale" | "db_global" | "code_default"; localeCode: InstructionLocale; instructionSetId: string | null; revision: number | null; updatedAt: string | null };
  selectedOverride: { id: string; status: "active" | "inactive"; current_revision: number; current_instruction_text: string; updated_at: string } | null;
  history: Array<{ id: string; revision: number; instruction_text: string; created_at: string }>;
  immutableGuards: Array<{ runtimeCode: string; text: string }>;
};

type CatalogPayload = { ok?: boolean; error?: string; localeCode?: InstructionLocale; maxLength?: number; canEdit?: boolean; items?: CatalogItem[] };

const INSTRUCTION_LOCALES: readonly InstructionLocale[] = ["global", "en", "pl", "ru", "uk", "de", "es", "cs"];

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getAiProcessingBrowserLocale(locale)) : value;
}

export default function AiInstructionsAdminClient() {
  const searchParams = useSearchParams();
  const interfaceLocale = normalizeLocale(searchParams.get("locale") ?? searchParams.get("lang"));
  const ui = getAiProcessingUiCopy(interfaceLocale);

  const [localeCode, setLocaleCode] = useState<InstructionLocale>("global");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [draft, setDraft] = useState("");
  const [maxLength, setMaxLength] = useState(40_000);
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(() => items.find((item) => item.definition.code === selectedCode) ?? items[0] ?? null, [items, selectedCode]);
  const selectedUi = selected ? getAiProcessingInstructionUiCopy(selected.definition.code, interfaceLocale, { title: selected.definition.title, purpose: selected.definition.purpose }) : null;

  function sourceLabel(source: CatalogItem["effective"]["source"]) {
    if (source === "db_locale") return ui.admin.sourceLocale;
    if (source === "db_global") return ui.admin.sourceGlobal;
    return ui.admin.sourceCode;
  }

  useEffect(() => {
    if (!selected) return;
    setDraft(selected.effective.text);
    if (!selectedCode) setSelectedCode(selected.definition.code);
  }, [selected, selectedCode]);

  async function load(nextLocale = localeCode) {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/ai-instructions?locale=${encodeURIComponent(nextLocale)}`, { credentials: "include", headers: { Accept: "application/json" } });
      const payload = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || !payload?.items) throw new Error(ui.admin.loadError);
      setItems(payload.items);
      setCanEdit(Boolean(payload.canEdit));
      setMaxLength(payload.maxLength ?? 40_000);
      const nextSelected = payload.items.find((item) => item.definition.code === selectedCode) ?? payload.items[0] ?? null;
      setSelectedCode(nextSelected?.definition.code ?? "");
      setDraft(nextSelected?.effective.text ?? "");
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage(ui.admin.loadError);
    }
  }

  useEffect(() => {
    void load(localeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeCode]);

  async function save() {
    if (!selected || !draft.trim() || !canEdit) return;
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-instructions", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ instructionCode: selected.definition.code, localeCode, instructionText: draft }) });
      const payload = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || !payload?.items) throw new Error(ui.admin.saveError);
      setItems(payload.items);
      setStatus("idle");
      setMessage(ui.admin.saved);
    } catch {
      setStatus("error");
      setMessage(ui.admin.saveError);
    }
  }

  async function restore() {
    if (!selected || !selectedUi || !canEdit) return;
    const language = getAiProcessingInstructionLanguageLabel(localeCode, interfaceLocale);
    if (!window.confirm(formatAiProcessingTemplate(ui.admin.restoreConfirm, { title: selectedUi.title, language }))) return;
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-instructions", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ instructionCode: selected.definition.code, localeCode }) });
      const payload = (await response.json().catch(() => null)) as CatalogPayload | null;
      if (!response.ok || !payload?.items) throw new Error(ui.admin.restoreError);
      setItems(payload.items);
      const current = payload.items.find((item) => item.definition.code === selected.definition.code);
      setDraft(current?.effective.text ?? "");
      setStatus("idle");
      setMessage(ui.admin.restored);
    } catch {
      setStatus("error");
      setMessage(ui.admin.restoreError);
    }
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{ui.admin.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black">{ui.admin.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">{ui.admin.intro}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {ui.admin.instructionLanguage}
            <select value={localeCode} onChange={(event) => setLocaleCode(event.target.value as InstructionLocale)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              {INSTRUCTION_LOCALES.map((locale) => <option key={locale} value={locale}>{getAiProcessingInstructionLanguageLabel(locale, interfaceLocale)}</option>)}
            </select>
          </label>
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs leading-5 text-slate-400">{ui.admin.languageHelp}</p>

          <div className="mt-4 space-y-2">
            {items.map((item) => {
              const active = item.definition.code === selected?.definition.code;
              const itemUi = getAiProcessingInstructionUiCopy(item.definition.code, interfaceLocale, { title: item.definition.title, purpose: item.definition.purpose });
              return (
                <button key={item.definition.code} type="button" onClick={() => { setSelectedCode(item.definition.code); setDraft(item.effective.text); setMessage(null); }} className={["w-full rounded-xl border p-3 text-left transition", active ? "border-cyan-400 bg-cyan-950/40" : "border-slate-800 bg-slate-950/50 hover:border-slate-600"].join(" ")}>
                  <span className="block text-sm font-bold text-white">{itemUi.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.definition.runtimeTargets.join(", ")}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          {status === "loading" ? <p className="text-sm text-slate-400">{ui.admin.loading}</p> : null}
          {message ? <div className={["mb-4 rounded-xl border p-3 text-sm", status === "error" ? "border-red-900 bg-red-950/50 text-red-100" : "border-emerald-900 bg-emerald-950/40 text-emerald-100"].join(" ")}>{message}</div> : null}

          {selected && selectedUi ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-xl font-black text-white">{selectedUi.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{selectedUi.purpose}</p></div>
                <div className="text-right text-xs text-slate-400"><p>{sourceLabel(selected.effective.source)}</p><p>{ui.admin.revision}: {selected.effective.revision ?? ui.admin.codeDefault}</p><p>{formatDate(selected.effective.updatedAt, interfaceLocale)}</p></div>
              </div>

              {selected.immutableGuards.length > 0 ? (
                <details className="mt-5 rounded-xl border border-amber-900/70 bg-amber-950/30 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-amber-200">{ui.admin.immutableGuard}</summary>
                  <p className="mt-2 text-xs leading-5 text-amber-100/80">{ui.admin.immutableGuardHelp}</p>
                  {selected.immutableGuards.map((guard) => <pre key={guard.runtimeCode} className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-950/70 p-3 text-xs leading-5 text-slate-300">[{guard.runtimeCode}]{"\n"}{guard.text}</pre>)}
                </details>
              ) : null}

              <label className="mt-5 block"><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{ui.admin.editableInstruction}</span><textarea value={draft} disabled={!canEdit || status === "saving"} onChange={(event) => setDraft(event.target.value.slice(0, maxLength))} maxLength={maxLength} rows={14} className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"/><span className="mt-1 block text-right text-xs text-slate-500">{draft.length}/{maxLength}</span></label>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void save()} disabled={!canEdit || status === "saving" || !draft.trim()} className="rounded-xl bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{status === "saving" ? ui.admin.saving : ui.admin.saveRevision}</button>
                <button type="button" onClick={() => void restore()} disabled={!canEdit || status === "saving"} className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-100 disabled:opacity-50">{ui.admin.restoreFallback}</button>
                <button type="button" onClick={() => void load()} disabled={status === "saving"} className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-100 disabled:opacity-50">{ui.admin.reload}</button>
              </div>

              <details className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-white">{ui.admin.revisionHistory} ({selected.history.length})</summary>
                <div className="mt-4 space-y-3">
                  {selected.history.length === 0 ? <p className="text-sm text-slate-500">{ui.admin.noHistory}</p> : selected.history.map((revision) => <article key={revision.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="flex justify-between gap-3 text-xs text-slate-500"><span>{ui.admin.revision} {revision.revision}</span><span>{formatDate(revision.created_at, interfaceLocale)}</span></div><pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{revision.instruction_text}</pre></article>)}
                </div>
              </details>
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
