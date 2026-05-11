"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ActivityType = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
};

type TemplateLink = {
  id: string;
  linkedEntityType: string;
  linkedEntityId: string | null;
  linkedEntityKey: string | null;
  linkRole: string;
  relationType: string;
  defaultWeight: number;
  defaultConfidence: number;
  sourceType: string;
  isRequired: boolean;
  metadata: Record<string, unknown>;
};

type TemplateShortcut = {
  id: string;
  shortcutScope: string;
  shortcutType: string;
  shortcutValue: string;
  label: string | null;
  description: string | null;
  isFavorite: boolean;
  showInDefaultUi: boolean;
  isDeprecatedAlias: boolean;
  nfcTagId: string | null;
  voicePhrase: string | null;
  deviceBinding: string | null;
  metadata: Record<string, unknown>;
};

type ActivityTemplate = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string | null;
  description: string | null;
  templateGroup: string;
  templateScope: string;
  visibility: string;
  sourceType: string;
  status: string;
  defaultActivityType: ActivityType | null;
  defaultDurationMinutes: number | null;
  quickDurationMinutes: number[];
  defaultStatus: string;
  defaultSourceType: string;
  defaultPrivacyScope: string;
  iconKey: string | null;
  colorKey: string | null;
  showInQuickCapture: boolean;
  showInOnboarding: boolean;
  allowManualDuration: boolean;
  allowComment: boolean;
  allowStartedAtOverride: boolean;
  allowEndedAtOverride: boolean;
  inputSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  links: TemplateLink[];
  shortcuts: TemplateShortcut[];
  createdAt: string;
  updatedAt: string;
};

type TemplatesResponse = {
  ok: boolean;
  count?: number;
  error?: string;
  templates?: ActivityTemplate[];
};

type ActivityRecordResponse = {
  ok: boolean;
  status?: string;
  error?: string;
  event?: Record<string, unknown>;
  eventLinks?: Record<string, unknown>[];
  impactEvents?: Record<string, unknown>[];
  dailyAggregates?: Record<string, unknown>[];
  currentSnapshots?: Record<string, unknown>[];
  impactProcessor?: {
    ok?: boolean;
    skipped?: boolean;
    reason?: string | null;
    counts?: {
      impactEvents?: number;
      dailyAggregates?: number;
      currentSnapshots?: number;
    };
  };
  parser?: Record<string, unknown>;
};

type EventsResponse = {
  ok: boolean;
  count?: number;
  error?: string;
  events?: Array<{
    id: string | null;
    title: string | null;
    status: string | null;
    source: string | null;
    sourceType: string | null;
    privacyScope: string | null;
    processingStatus: string | null;
    durationMinutes: number | null;
    comment: string | null;
    createdAt: string | null;
    eventLinksCount: number;
    impactEventsCount: number;
  }>;
};

function getTemplateLabel(template: ActivityTemplate) {
  return template.shortTitle ?? template.title;
}

function formatTemplateMeta(template: ActivityTemplate) {
  const activityType = template.defaultActivityType?.title ?? "No activity type";
  const duration =
    template.defaultDurationMinutes !== null
      ? `${template.defaultDurationMinutes} min`
      : "No default duration";

  return `${activityType} · ${duration} · ${template.defaultPrivacyScope}`;
}

function getVisibleShortcuts(template: ActivityTemplate) {
  return template.shortcuts.filter(
    (shortcut) => shortcut.showInDefaultUi && !shortcut.isDeprecatedAlias
  );
}

function getDeprecatedShortcuts(template: ActivityTemplate) {
  return template.shortcuts.filter((shortcut) => shortcut.isDeprecatedAlias);
}

function safeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[520px] overflow-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-relaxed text-zinc-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-500">
      {text}
    </div>
  );
}

export default function ActivityCapturePage() {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [durationInput, setDurationInput] = useState("25");
  const [comment, setComment] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordResult, setRecordResult] =
    useState<ActivityRecordResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventsResponse | null>(null);
  const [recentEventsLoading, setRecentEventsLoading] = useState(false);

  const selectedTemplate = useMemo(() => {
    return (
      templates.find((template) => template.id === selectedTemplateId) ?? null
    );
  }, [selectedTemplateId, templates]);

  const groups = useMemo(() => {
    return Array.from(
      new Set(templates.map((template) => template.templateGroup))
    ).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const groupMatches =
        groupFilter === "all" || template.templateGroup === groupFilter;

      if (!groupMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        template.slug,
        template.title,
        template.shortTitle,
        template.description,
        template.templateGroup,
        template.defaultActivityType?.title,
        template.defaultActivityType?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [groupFilter, query, templates]);

  async function loadTemplates() {
    setTemplatesLoading(true);
    setTemplatesError(null);

    try {
      const response = await fetch("/api/activity/templates?limit=50", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const body = (await response.json()) as TemplatesResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load activity templates");
      }

      const loadedTemplates = body.templates ?? [];

      setTemplates(loadedTemplates);

      if (!selectedTemplateId && loadedTemplates.length > 0) {
        const firstTemplate = loadedTemplates[0];
        setSelectedTemplateId(firstTemplate.id);

        if (firstTemplate.defaultDurationMinutes !== null) {
          setDurationInput(String(firstTemplate.defaultDurationMinutes));
        }
      }
    } catch (error) {
      setTemplatesError(
        error instanceof Error ? error.message : "Unknown templates error"
      );
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function loadRecentEvents() {
    setRecentEventsLoading(true);

    try {
      const response = await fetch("/api/activity/events?limit=5", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const body = (await response.json()) as EventsResponse;
      setRecentEvents(body);
    } catch (error) {
      setRecentEvents({
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load recent events",
      });
    } finally {
      setRecentEventsLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
    void loadRecentEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(template: ActivityTemplate) {
    setSelectedTemplateId(template.id);

    if (template.defaultDurationMinutes !== null) {
      setDurationInput(String(template.defaultDurationMinutes));
    }

    setRecordError(null);
    setRecordResult(null);
  }

  async function recordActivity() {
    if (!selectedTemplate) {
      setRecordError("Select an activity template first.");
      return;
    }

    const durationMinutes = safeNumber(durationInput);

    if (durationMinutes === null) {
      setRecordError("Duration must be a valid non-negative number.");
      return;
    }

    setRecordLoading(true);
    setRecordError(null);
    setRecordResult(null);

    try {
      const response = await fetch("/api/activity/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          templateSlug: selectedTemplate.slug,
          durationMinutes,
          comment: comment.trim() || null,
          sourceType: "manual_form",
        }),
      });

      const body = (await response.json()) as ActivityRecordResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to record activity");
      }

      setRecordResult(body);
      await loadRecentEvents();
    } catch (error) {
      setRecordError(
        error instanceof Error ? error.message : "Unknown recording error"
      );
    } finally {
      setRecordLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-emerald-400">
                Activity Recording Layer v2
              </p>
              <h1 className="text-2xl font-semibold text-white md:text-3xl">
                Activity Capture Dev UI
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Template-first activity recording. The user selects a clear
                activity template, duration and comment. Numeric codes remain
                only optional legacy shortcuts, not the main UX.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                href="/api/activity/templates"
                target="_blank"
              >
                Templates API
              </Link>
              <Link
                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                href="/api/activity/events?limit=5"
                target="_blank"
              >
                Events API
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  1. Choose activity template
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Templates carry stable meaning: value object, contexts,
                  observed objects and default rules.
                </p>
              </div>

              <button
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={templatesLoading}
                onClick={() => void loadTemplates()}
                type="button"
              >
                {templatesLoading ? "Loading..." : "Reload templates"}
              </button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search template, group, activity type..."
                value={query}
              />

              <select
                className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                onChange={(event) => setGroupFilter(event.target.value)}
                value={groupFilter}
              >
                <option value="all">All groups</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {templatesError ? (
              <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">
                {templatesError}
              </div>
            ) : null}

            {filteredTemplates.length === 0 && !templatesLoading ? (
              <EmptyState text="No activity templates found." />
            ) : null}

            <div className="grid gap-3">
              {filteredTemplates.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                const visibleShortcuts = getVisibleShortcuts(template);
                const deprecatedShortcuts = getDeprecatedShortcuts(template);

                return (
                  <button
                    className={[
                      "rounded-3xl border p-4 text-left transition",
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-950/40"
                        : "border-zinc-800 bg-black/50 hover:border-zinc-600",
                    ].join(" ")}
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    type="button"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-white">
                            {getTemplateLabel(template)}
                          </h3>
                          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                            {template.templateGroup}
                          </span>
                          {template.templateScope === "system" ? (
                            <span className="rounded-full bg-blue-950 px-2.5 py-1 text-xs text-blue-200">
                              system
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-zinc-400">
                          {template.description ?? "No description"}
                        </p>

                        <p className="mt-2 text-xs text-zinc-500">
                          {formatTemplateMeta(template)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {template.quickDurationMinutes.map((duration) => (
                          <span
                            className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                            key={duration}
                          >
                            {duration} min
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
                      <div>
                        Links:{" "}
                        <span className="text-zinc-300">
                          {template.links.length}
                        </span>
                      </div>
                      <div>
                        Visible shortcuts:{" "}
                        <span className="text-zinc-300">
                          {visibleShortcuts.length}
                        </span>
                      </div>
                    </div>

                    {visibleShortcuts.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visibleShortcuts.map((shortcut) => (
                          <span
                            className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                            key={shortcut.id}
                          >
                            {shortcut.label ?? shortcut.shortcutValue}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {deprecatedShortcuts.length > 0 ? (
                      <p className="mt-3 text-xs text-zinc-600">
                        Deprecated legacy shortcut exists but is hidden from
                        primary UX.
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">
                2. Record selected activity
              </h2>

              {selectedTemplate ? (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/50 p-4">
                  <p className="text-sm font-medium text-white">
                    {selectedTemplate.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    slug: {selectedTemplate.slug}
                  </p>

                  <div className="mt-4">
                    <label
                      className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500"
                      htmlFor="duration"
                    >
                      Duration minutes
                    </label>
                    <input
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                      disabled={!selectedTemplate.allowManualDuration}
                      id="duration"
                      onChange={(event) => setDurationInput(event.target.value)}
                      type="number"
                      value={durationInput}
                    />

                    {selectedTemplate.quickDurationMinutes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTemplate.quickDurationMinutes.map((duration) => (
                          <button
                            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-300"
                            key={duration}
                            onClick={() => setDurationInput(String(duration))}
                            type="button"
                          >
                            {duration} min
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <label
                      className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500"
                      htmlFor="comment"
                    >
                      Comment
                    </label>
                    <textarea
                      className="min-h-28 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
                      disabled={!selectedTemplate.allowComment}
                      id="comment"
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Example: B2B letter practice, client reply, handwriting session..."
                      value={comment}
                    />
                  </div>

                  {recordError ? (
                    <div className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">
                      {recordError}
                    </div>
                  ) : null}

                  <button
                    className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={recordLoading}
                    onClick={() => void recordActivity()}
                    type="button"
                  >
                    {recordLoading ? "Recording..." : "Record activity"}
                  </button>
                </div>
              ) : (
                <EmptyState text="Select a template to record an activity." />
              )}
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">
                  3. Recent events
                </h2>
                <button
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={recentEventsLoading}
                  onClick={() => void loadRecentEvents()}
                  type="button"
                >
                  {recentEventsLoading ? "Loading..." : "Reload"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {recentEvents?.events?.map((event) => (
                  <div
                    className="rounded-2xl border border-zinc-800 bg-black/50 p-4"
                    key={event.id ?? Math.random().toString()}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {event.title ?? "Untitled activity"}
                      </p>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                        {event.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {event.durationMinutes ?? 0} min · {event.source} ·{" "}
                      {event.processingStatus}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      links: {event.eventLinksCount} · impacts:{" "}
                      {event.impactEventsCount}
                    </p>
                  </div>
                ))}

                {recentEvents?.events?.length === 0 ? (
                  <EmptyState text="No recent activity events found." />
                ) : null}

                {recentEvents?.error ? (
                  <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">
                    {recentEvents.error}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-semibold text-white">
            4. Last recording response
          </h2>

          <div className="mt-4">
            {recordResult ? (
              <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
                <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
                  <p className="text-sm font-semibold text-emerald-300">
                    Recorded successfully
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Status</dt>
                      <dd className="text-zinc-100">{recordResult.status}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Links</dt>
                      <dd className="text-zinc-100">
                        {recordResult.eventLinks?.length ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Impacts</dt>
                      <dd className="text-zinc-100">
                        {recordResult.impactEvents?.length ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Daily aggregates</dt>
                      <dd className="text-zinc-100">
                        {recordResult.dailyAggregates?.length ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Current snapshots</dt>
                      <dd className="text-zinc-100">
                        {recordResult.currentSnapshots?.length ?? 0}
                      </dd>
                    </div>
                  </dl>
                </div>

                <JsonBlock value={recordResult} />
              </div>
            ) : (
              <EmptyState text="No activity has been recorded from this UI yet." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
