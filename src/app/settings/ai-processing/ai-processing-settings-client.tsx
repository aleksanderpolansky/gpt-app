"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Cux3AiRulesEditor } from "@/components/calendar/cux3-ai-rules-editor";
import { normalizeLocale, type LocaleCode } from "@/i18n";
import {
  formatAiProcessingTemplate,
  getAiProcessingBrowserLocale,
  getAiProcessingInstructionLanguageLabel,
  getAiProcessingUiCopy,
} from "@/i18n/messages/ai-processing";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";

type RuleLocale = "global" | ActivityTimingLocalePp1;

type PreferencePayload = {
  ok?: boolean;
  error?: string;
  localeCode?: RuleLocale;
  maxLength?: number;
  actor?: { actorId: string; profileId: string; profileKind: "personal" | "avatar"; displayName: string };
  selectedPreference?: { id: string; custom_instruction_text: string | null; current_revision: number; updated_at: string } | null;
  effective?: { text: string | null; source: "personal_exact" | "personal_global" | "none"; sourceLocale: RuleLocale | null; revision: number | null; updatedAt: string | null };
  history?: Array<{ id: string; revision: number; instruction_text: string | null; action_code: "save_custom" | "restore_default"; created_at: string }>;
};

const RULE_LOCALES: readonly RuleLocale[] = ["global", "en", "pl", "ru", "uk", "de", "es", "cs"];

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getAiProcessingBrowserLocale(locale)) : value;
}

export default function AiProcessingSettingsClient() {
  const searchParams = useSearchParams();
  const interfaceLocale = normalizeLocale(searchParams.get("locale") ?? searchParams.get("lang"));
  const ui = getAiProcessingUiCopy(interfaceLocale);

  const [localeCode, setLocaleCode] = useState<RuleLocale>("global");
  const [snapshot, setSnapshot] = useState<PreferencePayload | null>(null);
  const [draft, setDraft] = useState("");
  const [maxLength, setMaxLength] = useState(20_000);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const selectedText = snapshot?.selectedPreference?.custom_instruction_text ?? "";
  const dirty = useMemo(() => draft !== selectedText, [draft, selectedText]);

  function sourceLabel(source: NonNullable<PreferencePayload["effective"]>["source"]) {
    if (source === "personal_exact") return ui.settings.personalExact;
    if (source === "personal_global") return ui.settings.personalGlobal;
    return ui.settings.noPersonalRule;
  }

  function profileKindLabel(kind: "personal" | "avatar") {
    return kind === "avatar" ? ui.settings.profileAvatar : ui.settings.profilePersonal;
  }

  function actionLabel(action: "save_custom" | "restore_default") {
    return action === "restore_default" ? ui.settings.restoreDefaultAction : ui.settings.saveCustomAction;
  }

  async function load(nextLocale = localeCode) {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch(`/api/ai-processing/preferences?locale=${encodeURIComponent(nextLocale)}`, { credentials: "include", headers: { Accept: "application/json" } });
      const payload = (await response.json().catch(() => null)) as PreferencePayload | null;
      if (!response.ok || !payload?.actor || !payload.effective) throw new Error(ui.settings.loadError);
      setSnapshot(payload);
      setDraft(payload.selectedPreference?.custom_instruction_text ?? "");
      setMaxLength(payload.maxLength ?? 20_000);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage(ui.settings.loadError);
    }
  }

  useEffect(() => {
    void load(localeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeCode]);

  async function save() {
    if (!draft.trim()) { setMessage(ui.settings.enterBeforeSave); return; }
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/ai-processing/preferences", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ localeCode, instructionText: draft }) });
      const payload = (await response.json().catch(() => null)) as PreferencePayload | null;
      if (!response.ok || !payload?.actor || !payload.effective) throw new Error(ui.settings.saveError);
      setSnapshot(payload);
      setDraft(payload.selectedPreference?.custom_instruction_text ?? "");
      setStatus("idle");
      setMessage(ui.settings.saved);
    } catch {
      setStatus("error");
      setMessage(ui.settings.saveError);
    }
  }

  async function restore() {
    const language = getAiProcessingInstructionLanguageLabel(localeCode, interfaceLocale);
    if (!window.confirm(formatAiProcessingTemplate(ui.settings.removeConfirm, { language }))) return;
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/ai-processing/preferences", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ localeCode }) });
      const payload = (await response.json().catch(() => null)) as PreferencePayload | null;
      if (!response.ok || !payload?.actor || !payload.effective) throw new Error(ui.settings.restoreError);
      setSnapshot(payload);
      setDraft("");
      setStatus("idle");
      setMessage(ui.settings.removed);
    } catch {
      setStatus("error");
      setMessage(ui.settings.restoreError);
    }
  }

  return (
    <div className="space-y-5">
      <header className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#315ee7]">{ui.settings.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black">{ui.settings.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#667091]">{ui.settings.intro}</p>
      </header>

      <section className="rounded-2xl border border-[#d8deef] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-black">{ui.settings.generalTitle}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667091]">{ui.settings.examples}</p></div>
          {snapshot?.actor ? <div className="rounded-full border border-[#cbd7ff] bg-[#eef2ff] px-3 py-1.5 text-xs font-bold text-[#315ee7]">{snapshot.actor.displayName} · {profileKindLabel(snapshot.actor.profileKind)}</div> : null}
        </div>

        <label className="mt-5 block max-w-xs text-xs font-extrabold uppercase tracking-[0.14em] text-[#667091]">
          {ui.settings.ruleLanguage}
          <select value={localeCode} onChange={(event) => setLocaleCode(event.target.value as RuleLocale)} className="mt-2 w-full rounded-xl border border-[#cbd7ff] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e]">
            {RULE_LOCALES.map((locale) => <option key={locale} value={locale}>{getAiProcessingInstructionLanguageLabel(locale, interfaceLocale)}</option>)}
          </select>
        </label>
        <p className="mt-3 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-3 text-xs leading-5 text-[#667091]">{ui.settings.languageHelp}</p>

        {snapshot?.effective ? (
          <div className="mt-4 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-3 text-xs text-[#667091]">
            <p className="font-bold text-[#1a1d2e]">{ui.settings.effectiveSource}: {sourceLabel(snapshot.effective.source)}</p>
            <p className="mt-1">{ui.settings.effectiveRevision}: {snapshot.effective.revision ?? "—"} · {ui.settings.updated} {formatDate(snapshot.effective.updatedAt, interfaceLocale)}</p>
            {snapshot.effective.text && snapshot.effective.source !== "personal_exact" ? <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-5 text-[#52607a]">{snapshot.effective.text}</pre> : null}
          </div>
        ) : null}

        <label className="mt-4 block"><span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#667091]">{ui.settings.rulesLabel}</span><textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, maxLength))} rows={12} maxLength={maxLength} placeholder={ui.settings.rulesPlaceholder} className="mt-2 w-full resize-y rounded-xl border border-[#cbd7ff] bg-white p-4 text-sm leading-6 text-[#1a1d2e] outline-none focus:border-[#3b6ef8]"/><span className="mt-1 block text-right text-xs text-[#7c8099]">{draft.length}/{maxLength}</span></label>

        {message ? <div className={["mt-3 rounded-xl border p-3 text-sm", status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"].join(" ")}>{message}</div> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={!dirty || !draft.trim() || status === "saving"} className="rounded-xl bg-[#3b6ef8] px-5 py-2 text-sm font-bold text-white disabled:bg-[#aebdf0]">{status === "saving" ? ui.settings.saving : ui.settings.save}</button>
          <button type="button" onClick={() => void restore()} disabled={!snapshot?.selectedPreference || status === "saving"} className="rounded-xl border border-[#cbd7ff] bg-white px-5 py-2 text-sm font-bold text-[#315ee7] disabled:text-[#9ca3b8]">{ui.settings.remove}</button>
        </div>

        <details className="mt-5 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-4"><summary className="cursor-pointer text-sm font-bold">{ui.settings.interpretationPriority}</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#667091]">{ui.settings.priority.map((item) => <li key={item}>{item}</li>)}</ol></details>

        <details className="mt-4 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-4"><summary className="cursor-pointer text-sm font-bold">{ui.settings.revisionHistory} ({snapshot?.history?.length ?? 0})</summary><div className="mt-3 space-y-3">{(snapshot?.history ?? []).length === 0 ? <p className="text-sm text-[#7c8099]">{ui.settings.noHistory}</p> : snapshot?.history?.map((revision) => <article key={revision.id} className="rounded-xl border border-[#e0e5f2] bg-white p-3"><div className="flex justify-between gap-3 text-xs text-[#7c8099]"><span>{ui.settings.revision} {revision.revision} · {actionLabel(revision.action_code)}</span><span>{formatDate(revision.created_at, interfaceLocale)}</span></div><pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#52607a]">{revision.instruction_text ?? ui.settings.systemFallback}</pre></article>)}</div></details>
      </section>

      {localeCode !== "global" ? (
        <section className="rounded-2xl border border-[#d8deef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{ui.settings.calendarTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667091]">{ui.settings.calendarIntro}</p>
          <Cux3AiRulesEditor locale={localeCode} uiLocale={interfaceLocale as ActivityTimingLocalePp1} sourceText="" onRulesChanged={() => undefined} />
        </section>
      ) : null}
    </div>
  );
}
