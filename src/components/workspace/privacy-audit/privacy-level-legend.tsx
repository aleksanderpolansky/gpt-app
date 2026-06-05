import type { PrivacyLevel } from "./privacy-audit.types";
import {
  getPrivacyLevelClassName,
  getPrivacyLevelSummary,
  getVisibilityClassName,
  getVisibilityLabel,
  isSensitivePrivacyLevel,
} from "./privacy-audit.utils";

interface PrivacyLevelLegendProps {
  readonly privacyLevels: readonly PrivacyLevel[];
}

export function PrivacyLevelLegend({ privacyLevels }: PrivacyLevelLegendProps) {
  const sensitiveCount = privacyLevels.filter(isSensitivePrivacyLevel).length;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Privacy level legend
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Sensitive categories stay visible for transparency and correction,
            but controls remain read-only and future-gated in UI-13.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{sensitiveCount}</span>{" "}
          sensitive/restricted signals
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {privacyLevels.map((level) => (
          <article
            key={level.id}
            className={`rounded-lg border p-4 ${getPrivacyLevelClassName(
              level.level,
            )}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">{level.label}</h3>
                <p className="text-sm opacity-90">{getPrivacyLevelSummary(level)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-current px-2.5 py-1 text-xs font-medium capitalize">
                  {level.level}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getVisibilityClassName(
                    level.visibility,
                  )}`}
                >
                  {getVisibilityLabel(level.visibility)}
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {level.examples.map((example) => (
                <li key={example} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-current" />
                  <span>{example}</span>
                </li>
              ))}
            </ul>

            {isSensitivePrivacyLevel(level) ? (
              <p className="mt-4 rounded-md border border-current bg-background/60 px-3 py-2 text-xs font-medium">
                Sensitive history: visible here for user review, not for hidden
                persistence or public profiling.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
