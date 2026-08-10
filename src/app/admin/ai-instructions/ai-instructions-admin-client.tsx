"use client";

import { useEffect, useMemo, useState } from "react";

type LocaleCode =
  | "global"
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type CatalogItem = {
  definition: {
    code: string;
    title: string;
    purpose: string;
    defaultText: string;
    runtimeTargets: string[];
  };
  effective: {
    code: string;
    text: string;
    source: "db_locale" | "db_global" | "code_default";
    localeCode: LocaleCode;
    instructionSetId: string | null;
    revision: number | null;
    updatedAt: string | null;
  };
  selectedOverride: {
    id: string;
    status: "active" | "inactive";
    current_revision: number;
    current_instruction_text: string;
    updated_at: string;
  } | null;
  history: Array<{
    id: string;
    revision: number;
    instruction_text: string;
    created_at: string;
  }>;
  immutableGuards: Array<{
    runtimeCode: string;
    text: string;
  }>;
};

type CatalogPayload = {
  ok?: boolean;
  error?: string;
  localeCode?: LocaleCode;
  maxLength?: number;
  canEdit?: boolean;
  items?: CatalogItem[];
};

const LOCALES: readonly LocaleCode[] = [
  "global",
  "en",
  "pl",
  "ru",
  "uk",
  "de",
  "es",
  "cs",
];

function sourceLabel(source: CatalogItem["effective"]["source"]) {
  if (source === "db_locale") {
    return "Saved override for this language";
  }

  if (source === "db_global") {
    return "Global saved override";
  }

  return "Source-code default";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : value;
}

export default function AiInstructionsAdminClient() {
  const [localeCode, setLocaleCode] = useState<LocaleCode>("global");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [maxLength, setMaxLength] = useState(40_000);
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "idle" | "saving" | "error"
  >("loading");
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      items.find((item) => item.definition.code === selectedCode) ??
      items[0] ??
      null,
    [items, selectedCode],
  );

  useEffect(() => {
    if (selected) {
      setDraft(selected.effective.text);
      if (!selectedCode) {
        setSelectedCode(selected.definition.code);
      }
    }
  }, [selected, selectedCode]);

  async function load(nextLocale = localeCode) {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/ai-instructions?locale=${encodeURIComponent(nextLocale)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );

      const payload =
        (await response.json().catch(() => null)) as CatalogPayload | null;

      if (!response.ok || !payload?.items) {
        throw new Error(
          payload?.error ?? `Instruction request failed: ${response.status}`,
        );
      }

      setItems(payload.items);
      setCanEdit(Boolean(payload.canEdit));
      setMaxLength(payload.maxLength ?? 40_000);

      const nextSelected =
        payload.items.find(
          (item) => item.definition.code === selectedCode,
        ) ?? payload.items[0] ?? null;

      setSelectedCode(nextSelected?.definition.code ?? "");
      setDraft(nextSelected?.effective.text ?? "");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load AI instructions.",
      );
    }
  }

  useEffect(() => {
    void load(localeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeCode]);

  async function save() {
    if (!selected || !draft.trim() || !canEdit) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-instructions", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          instructionCode: selected.definition.code,
          localeCode,
          instructionText: draft,
        }),
      });

      const payload =
        (await response.json().catch(() => null)) as CatalogPayload | null;

      if (!response.ok || !payload?.items) {
        throw new Error(
          payload?.error ?? `Instruction save failed: ${response.status}`,
        );
      }

      setItems(payload.items);
      setStatus("idle");
      setMessage("Saved. A new immutable revision was recorded.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the instruction.",
      );
    }
  }

  async function restore() {
    if (!selected || !canEdit) {
      return;
    }

    if (
      !window.confirm(
        `Restore ${selected.definition.title} (${localeCode}) to the ARCTor fallback?`,
      )
    ) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-instructions", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          instructionCode: selected.definition.code,
          localeCode,
        }),
      });

      const payload =
        (await response.json().catch(() => null)) as CatalogPayload | null;

      if (!response.ok || !payload?.items) {
        throw new Error(
          payload?.error ?? `Instruction restore failed: ${response.status}`,
        );
      }

      setItems(payload.items);
      const current = payload.items.find(
        (item) => item.definition.code === selected.definition.code,
      );
      setDraft(current?.effective.text ?? "");
      setStatus("idle");
      setMessage("Selected override disabled; effective fallback restored.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not restore the fallback.",
      );
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Instruction language
          <select
            value={localeCode}
            onChange={(event) =>
              setLocaleCode(event.target.value as LocaleCode)
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const active = item.definition.code === selected?.definition.code;

            return (
              <button
                key={item.definition.code}
                type="button"
                onClick={() => {
                  setSelectedCode(item.definition.code);
                  setDraft(item.effective.text);
                  setMessage(null);
                }}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  active
                    ? "border-cyan-400 bg-cyan-950/40"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-600",
                ].join(" ")}
              >
                <span className="block text-sm font-bold text-white">
                  {item.definition.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.definition.runtimeTargets.join(", ")}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        {status === "loading" ? (
          <p className="text-sm text-slate-400">Loading instructions…</p>
        ) : null}

        {message ? (
          <div
            className={[
              "mb-4 rounded-xl border p-3 text-sm",
              status === "error"
                ? "border-red-900 bg-red-950/50 text-red-100"
                : "border-emerald-900 bg-emerald-950/40 text-emerald-100",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">
                  {selected.definition.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  {selected.definition.purpose}
                </p>
              </div>

              <div className="text-right text-xs text-slate-400">
                <p>{sourceLabel(selected.effective.source)}</p>
                <p>
                  Revision: {selected.effective.revision ?? "code default"}
                </p>
                <p>{formatDate(selected.effective.updatedAt)}</p>
              </div>
            </div>

            {selected.immutableGuards.length > 0 ? (
              <details className="mt-5 rounded-xl border border-amber-900/70 bg-amber-950/30 p-4">
                <summary className="cursor-pointer text-sm font-bold text-amber-200">
                  Immutable runtime guard
                </summary>
                <p className="mt-2 text-xs leading-5 text-amber-100/80">
                  This guard is always injected before editable instructions
                  and cannot be changed from the admin page.
                </p>
                {selected.immutableGuards.map((guard) => (
                  <pre
                    key={guard.runtimeCode}
                    className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-950/70 p-3 text-xs leading-5 text-slate-300"
                  >
                    [{guard.runtimeCode}]{"\n"}
                    {guard.text}
                  </pre>
                ))}
              </details>
            ) : null}

            <label className="mt-5 block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Editable operational instruction
              </span>
              <textarea
                value={draft}
                disabled={!canEdit || status === "saving"}
                onChange={(event) =>
                  setDraft(event.target.value.slice(0, maxLength))
                }
                maxLength={maxLength}
                rows={14}
                className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
              />
              <span className="mt-1 block text-right text-xs text-slate-500">
                {draft.length}/{maxLength}
              </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={!canEdit || status === "saving" || !draft.trim()}
                className="rounded-xl bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {status === "saving" ? "Saving…" : "Save new revision"}
              </button>
              <button
                type="button"
                onClick={() => void restore()}
                disabled={!canEdit || status === "saving"}
                className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-100 disabled:opacity-50"
              >
                Restore fallback
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={status === "saving"}
                className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-100 disabled:opacity-50"
              >
                Reload
              </button>
            </div>

            <details className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-white">
                Revision history ({selected.history.length})
              </summary>
              <div className="mt-4 space-y-3">
                {selected.history.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No database revision yet. The source-code default is active.
                  </p>
                ) : (
                  selected.history.map((revision) => (
                    <article
                      key={revision.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div className="flex justify-between gap-3 text-xs text-slate-500">
                        <span>Revision {revision.revision}</span>
                        <span>{formatDate(revision.created_at)}</span>
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                        {revision.instruction_text}
                      </pre>
                    </article>
                  ))
                )}
              </div>
            </details>
          </>
        ) : null}
      </section>
    </div>
  );
}
