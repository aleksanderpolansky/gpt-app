import type { SensitiveCategoryControl } from "./privacy-audit.types";
import {
  getControlStateClassName,
  getControlStateLabel,
  isLockedControlState,
} from "./privacy-audit.utils";

interface SensitiveCategoryControlsProps {
  readonly controls: readonly SensitiveCategoryControl[];
}

export function SensitiveCategoryControls({
  controls,
}: SensitiveCategoryControlsProps) {
  const lockedCount = controls.filter((control) =>
    isLockedControlState(control.controlState),
  ).length;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Sensitive category controls
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Health, toilet, money, and family categories are visible here for
            audit transparency only. UI-13 does not apply privacy writes.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{lockedCount}</span>{" "}
          locked controls
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {controls.map((control) => {
          const locked = isLockedControlState(control.controlState);

          return (
            <article
              key={control.id}
              data-read-only={locked}
              className="rounded-lg border border-border bg-background/60 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sensitive domain: {control.domain}
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    {control.categoryLabel}
                  </h3>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getControlStateClassName(
                    control.controlState,
                  )}`}
                >
                  {getControlStateLabel(control.controlState)}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current policy
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {control.currentPolicy}
                  </p>
                </div>

                <div className="rounded-md border border-dashed border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Future gate
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {control.futureGateLabel}
                  </p>
                </div>

                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-destructive">
                    Sensitive warning
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    {control.warning}
                  </p>
                </div>
              </div>

              <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                Read-only control: shown for review, correction, and audit
                visibility. No hidden persistence, resolver mutation, or policy
                write is executed in UI-13.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
