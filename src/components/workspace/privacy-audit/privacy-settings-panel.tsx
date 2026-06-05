import type { PrivacyAuditSettingsPanel as PrivacyAuditSettingsPanelModel } from "./privacy-audit.types";
import {
  getControlStateClassName,
  getControlStateLabel,
  getVisibilityClassName,
  getVisibilityLabel,
  isLockedControlState,
} from "./privacy-audit.utils";

interface PrivacySettingsPanelProps {
  readonly settings: PrivacyAuditSettingsPanelModel;
}

export function PrivacySettingsPanel({ settings }: PrivacySettingsPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {settings.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {settings.description}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {settings.items.map((item) => {
          const locked = isLockedControlState(item.controlState);

          return (
            <article
              key={item.id}
              data-read-only={locked}
              className="rounded-lg border border-border bg-background/60 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {item.label}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getVisibilityClassName(
                        item.visibility,
                      )}`}
                    >
                      {getVisibilityLabel(item.visibility)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getControlStateClassName(
                        item.controlState,
                      )}`}
                    >
                      {getControlStateLabel(item.controlState)}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current policy
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {item.currentPolicy}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-dashed border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Future gate
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {item.futureGateLabel}
                  </p>
                </div>

                <div className="rounded-md border border-dashed border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Helper text
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {item.helperText}
                  </p>
                </div>
              </div>

              {locked ? (
                <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  This control is shown for transparency only. UI-13 does not
                  apply privacy policy writes.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
