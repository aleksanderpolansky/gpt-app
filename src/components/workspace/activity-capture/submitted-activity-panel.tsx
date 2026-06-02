import type { LocalActivityDraft } from "./activity-capture-types";

export const SUBMITTED_ACTIVITY_PANEL_CREATED =
  "SUBMITTED_ACTIVITY_PANEL_CREATED" as const;

export interface SubmittedActivityPanelProps {
  draft: LocalActivityDraft;
  normalizedTitle: string;
}

function formatLocalCreatedAt(localCreatedAt: string): string {
  const parsedDate = new Date(localCreatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return localCreatedAt;
  }

  return parsedDate.toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SubmittedActivityPanel({
  draft,
  normalizedTitle,
}: SubmittedActivityPanelProps) {
  return (
    <article
      aria-labelledby="submitted-activity-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Submitted local draft
          </p>

          <h3
            id="submitted-activity-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            {normalizedTitle}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            status: {draft.status}
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            source: local-only
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          rawText
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {draft.rawText}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            localCreatedAt
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">
            {formatLocalCreatedAt(draft.localCreatedAt)}
          </dd>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            durationMinutes
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">
            {draft.durationMinutes ? `${draft.durationMinutes} минут` : "not detected"}
          </dd>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            contextLabel
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">
            {draft.contextLabel ?? "not detected"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        Это только локальный draft/preview. Activity Event ещё не создан, данные
        не сохранены и не отправлены.
      </p>
    </article>
  );
}
