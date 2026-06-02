export const ACTIVITY_REVIEW_FIXTURE_PREVIEW_SWITCH_CREATED =
  "ACTIVITY_REVIEW_FIXTURE_PREVIEW_SWITCH_CREATED" as const;

interface ActivityReviewFixturePreviewSwitchProps {
  isEnabled: boolean;
  onToggle: () => void;
  fixtureLabel?: string;
  className?: string;
}

function getFixturePreviewSwitchStatusLabel(isEnabled: boolean): string {
  return isEnabled ? "Fixture preview enabled" : "Fixture preview disabled";
}

function buildFixturePreviewSwitchAriaLabel(
  isEnabled: boolean,
  fixtureLabel: string,
): string {
  return `${getFixturePreviewSwitchStatusLabel(isEnabled)}. Fixture: ${fixtureLabel}. Local-only switch. No hidden writes. No Activity Event. No Value Objects. No DB write.`;
}

export function ActivityReviewFixturePreviewSwitch({
  isEnabled,
  onToggle,
  fixtureLabel = "Default Activity Review fixture",
  className,
}: ActivityReviewFixturePreviewSwitchProps) {
  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-ui5-review-fixture-switch="activity-review-fixture-preview-switch"
      aria-label={buildFixturePreviewSwitchAriaLabel(isEnabled, fixtureLabel)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Fixture preview switch
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
            Show review fixture
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Включает демонстрационный candidate package, когда local parser
            ещё не создал parserResult. Это только UI preview.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition",
            isEnabled
              ? "border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          ].join(" ")}
          aria-pressed={isEnabled}
        >
          {isEnabled ? "Hide fixture" : "Show fixture"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <p>
          <strong className="font-semibold">Fixture:</strong> {fixtureLabel}
        </p>
        <p>
          <strong className="font-semibold">Status:</strong>{" "}
          candidate package waits until parserResult is available or fixture
          preview is enabled.
        </p>
        <p>
          <strong className="font-semibold">Boundary:</strong>{" "}
          local-only preview. No hidden writes. No Activity Event. No Value
          Objects. No DB write.
        </p>
      </div>
    </section>
  );
}
