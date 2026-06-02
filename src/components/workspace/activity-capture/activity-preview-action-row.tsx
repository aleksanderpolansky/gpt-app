export const ACTIVITY_CAPTURE_PREVIEW_ACTIONS_CREATED =
  "ACTIVITY_CAPTURE_PREVIEW_ACTIONS_CREATED" as const;

export interface ActivityPreviewActionRowProps {
  hasPreview: boolean;
  draftLength: number;
  categoryCount: number;
  valueObjectCount: number;
  privacyHintCount: number;
  onClearPreview: () => void;
  onResetAll: () => void;
}

function getPreviewActionStatus(hasPreview: boolean, draftLength: number): string {
  if (hasPreview) {
    return "Preview ready";
  }

  if (draftLength > 0) {
    return "Draft text ready";
  }

  return "Waiting for input";
}

export function ActivityPreviewActionRow({
  hasPreview,
  draftLength,
  categoryCount,
  valueObjectCount,
  privacyHintCount,
  onClearPreview,
  onResetAll,
}: ActivityPreviewActionRowProps) {
  const canResetAll = draftLength > 0 || hasPreview;

  return (
    <div
      aria-labelledby="activity-preview-action-row-title"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Local preview actions
          </p>

          <h3
            id="activity-preview-action-row-title"
            className="mt-1 text-sm font-semibold text-slate-900"
          >
            Preview action row
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Действия меняют только локальное состояние компонента. Ничего не
            сохраняется и не отправляется.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {getPreviewActionStatus(hasPreview, draftLength)}
          </span>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            draft {draftLength}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Categories
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {categoryCount}
          </p>
        </div>

        <div className="rounded-lg bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Value Objects
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {valueObjectCount}
          </p>
        </div>

        <div className="rounded-lg bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Privacy hints
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {privacyHintCount}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onClearPreview}
          disabled={!hasPreview}
          className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          Clear preview
        </button>

        <button
          type="button"
          onClick={onResetAll}
          disabled={!canResetAll}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Reset draft
        </button>

        <span className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-500">
          local-only action row
        </span>
      </div>
    </div>
  );
}
