"use client";

import { useEffect, useMemo, useState } from "react";

import { Cux3AiRulesEditor } from "@/components/calendar/cux3-ai-rules-editor";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";

type UiLocale = "global" | ActivityTimingLocalePp1;

type PreferencePayload = {
  ok?: boolean;
  error?: string;
  localeCode?: UiLocale;
  maxLength?: number;
  actor?: {
    actorId: string;
    profileId: string;
    profileKind: "personal" | "avatar";
    displayName: string;
  };
  selectedPreference?: {
    id: string;
    custom_instruction_text: string | null;
    current_revision: number;
    updated_at: string;
  } | null;
  effective?: {
    text: string | null;
    source:
      | "personal_exact"
      | "personal_global"
      | "personal_en"
      | "none";
    sourceLocale: UiLocale | null;
    revision: number | null;
    updatedAt: string | null;
  };
  history?: Array<{
    id: string;
    revision: number;
    instruction_text: string | null;
    action_code: "save_custom" | "restore_default";
    created_at: string;
  }>;
  priority?: string[];
};

const LOCALES: readonly UiLocale[] = [
  "global",
  "en",
  "pl",
  "ru",
  "uk",
  "de",
  "es",
  "cs",
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : value;
}

function sourceLabel(
  source: PreferencePayload["effective"] extends infer T
    ? T extends { source: infer S }
      ? S
      : never
    : never,
) {
  if (source === "personal_exact") {
    return "Personal rule for this language";
  }
  if (source === "personal_global") {
    return "Global personal rule";
  }
  if (source === "personal_en") {
    return "English personal fallback";
  }
  return "No personal processing rule";
}

export default function AiProcessingSettingsClient() {
  const [localeCode, setLocaleCode] = useState<UiLocale>("global");
  const [snapshot, setSnapshot] = useState<PreferencePayload | null>(null);
  const [draft, setDraft] = useState("");
  const [maxLength, setMaxLength] = useState(20_000);
  const [status, setStatus] = useState<
    "loading" | "idle" | "saving" | "error"
  >("loading");
  const [message, setMessage] = useState<string | null>(null);

  const selectedText =
    snapshot?.selectedPreference?.custom_instruction_text ?? "";

  const dirty = useMemo(
    () => draft !== selectedText,
    [draft, selectedText],
  );

  async function load(nextLocale = localeCode) {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch(
        `/api/ai-processing/preferences?locale=${encodeURIComponent(nextLocale)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );

      const payload =
        (await response.json().catch(() => null)) as PreferencePayload | null;

      if (!response.ok || !payload?.actor || !payload.effective) {
        throw new Error(
          payload?.error ?? `Preference request failed: ${response.status}`,
        );
      }

      setSnapshot(payload);
      setDraft(payload.selectedPreference?.custom_instruction_text ?? "");
      setMaxLength(payload.maxLength ?? 20_000);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load personal processing rules.",
      );
    }
  }

  useEffect(() => {
    void load(localeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeCode]);

  async function save() {
    if (!draft.trim()) {
      setMessage("Enter a personal rule before saving.");
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/ai-processing/preferences", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          localeCode,
          instructionText: draft,
        }),
      });

      const payload =
        (await response.json().catch(() => null)) as PreferencePayload | null;

      if (!response.ok || !payload?.actor || !payload.effective) {
        throw new Error(
          payload?.error ?? `Preference save failed: ${response.status}`,
        );
      }

      setSnapshot(payload);
      setDraft(payload.selectedPreference?.custom_instruction_text ?? "");
      setStatus("idle");
      setMessage("Personal processing rules saved.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save personal processing rules.",
      );
    }
  }

  async function restore() {
    if (
      !window.confirm(
        `Remove the personal override for ${localeCode} and use fallback rules?`,
      )
    ) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/ai-processing/preferences", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ localeCode }),
      });

      const payload =
        (await response.json().catch(() => null)) as PreferencePayload | null;

      if (!response.ok || !payload?.actor || !payload.effective) {
        throw new Error(
          payload?.error ?? `Preference restore failed: ${response.status}`,
        );
      }

      setSnapshot(payload);
      setDraft("");
      setStatus("idle");
      setMessage("Personal override removed.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not restore fallback rules.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#d8deef] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">General personal defaults</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667091]">
              Examples: “coffee normally means double espresso without
              sugar”, “my usual portion is 250 g”, or “when I say I practised
              German with my daughter, consider both language practice and
              family interaction as candidate directions”.
            </p>
          </div>

          {snapshot?.actor ? (
            <div className="rounded-full border border-[#cbd7ff] bg-[#eef2ff] px-3 py-1.5 text-xs font-bold text-[#315ee7]">
              {snapshot.actor.displayName} · {snapshot.actor.profileKind}
            </div>
          ) : null}
        </div>

        <label className="mt-5 block max-w-xs text-xs font-extrabold uppercase tracking-[0.14em] text-[#667091]">
          Rule language
          <select
            value={localeCode}
            onChange={(event) =>
              setLocaleCode(event.target.value as UiLocale)
            }
            className="mt-2 w-full rounded-xl border border-[#cbd7ff] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e]"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </label>

        {snapshot?.effective ? (
          <div className="mt-4 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-3 text-xs text-[#667091]">
            <p className="font-bold text-[#1a1d2e]">
              Effective source: {sourceLabel(snapshot.effective.source)}
            </p>
            <p className="mt-1">
              Effective revision: {snapshot.effective.revision ?? "—"} ·
              updated {formatDate(snapshot.effective.updatedAt)}
            </p>
            {snapshot.effective.text &&
            snapshot.effective.source !== "personal_exact" ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-5 text-[#52607a]">
                {snapshot.effective.text}
              </pre>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#667091]">
            Your personal processing rules
          </span>
          <textarea
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value.slice(0, maxLength))
            }
            rows={12}
            maxLength={maxLength}
            placeholder="Write defaults and personal interpretation rules in normal language."
            className="mt-2 w-full resize-y rounded-xl border border-[#cbd7ff] bg-white p-4 text-sm leading-6 text-[#1a1d2e] outline-none focus:border-[#3b6ef8]"
          />
          <span className="mt-1 block text-right text-xs text-[#7c8099]">
            {draft.length}/{maxLength}
          </span>
        </label>

        {message ? (
          <div
            className={[
              "mt-3 rounded-xl border p-3 text-sm",
              status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || !draft.trim() || status === "saving"}
            className="rounded-xl bg-[#3b6ef8] px-5 py-2 text-sm font-bold text-white disabled:bg-[#aebdf0]"
          >
            {status === "saving" ? "Saving…" : "Save personal rules"}
          </button>
          <button
            type="button"
            onClick={() => void restore()}
            disabled={!snapshot?.selectedPreference || status === "saving"}
            className="rounded-xl border border-[#cbd7ff] bg-white px-5 py-2 text-sm font-bold text-[#315ee7] disabled:text-[#9ca3b8]"
          >
            Remove personal override
          </button>
        </div>

        <details className="mt-5 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-4">
          <summary className="cursor-pointer text-sm font-bold">
            Interpretation priority
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#667091]">
            <li>Database and security invariants cannot be overridden.</li>
            <li>
              Explicit facts and numbers in the current message are
              authoritative.
            </li>
            <li>Active ARCTor system instructions guide processing.</li>
            <li>
              Your personal defaults fill missing context; they do not replace
              explicit current-message data.
            </li>
            <li>ARCTor may ask for clarification when uncertainty matters.</li>
          </ol>
        </details>

        <details className="mt-4 rounded-xl border border-[#e0e5f2] bg-[#f8f9fc] p-4">
          <summary className="cursor-pointer text-sm font-bold">
            Revision history ({snapshot?.history?.length ?? 0})
          </summary>
          <div className="mt-3 space-y-3">
            {(snapshot?.history ?? []).length === 0 ? (
              <p className="text-sm text-[#7c8099]">
                No personal revision has been saved for this language yet.
              </p>
            ) : (
              snapshot?.history?.map((revision) => (
                <article
                  key={revision.id}
                  className="rounded-xl border border-[#e0e5f2] bg-white p-3"
                >
                  <div className="flex justify-between gap-3 text-xs text-[#7c8099]">
                    <span>
                      Revision {revision.revision} · {revision.action_code}
                    </span>
                    <span>{formatDate(revision.created_at)}</span>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#52607a]">
                    {revision.instruction_text ?? "(system fallback)"}
                  </pre>
                </article>
              ))
            )}
          </div>
        </details>
      </section>

      {localeCode !== "global" ? (
        <section className="rounded-2xl border border-[#d8deef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Calendar-specific rules</h2>
          <p className="mt-2 text-sm leading-6 text-[#667091]">
            Existing calendar rules remain a separate specialised layer. They
            are applied only to calendar timing and target interpretation.
          </p>
          <Cux3AiRulesEditor
            locale={localeCode}
            sourceText=""
            onRulesChanged={() => undefined}
          />
        </section>
      ) : null}
    </div>
  );
}
