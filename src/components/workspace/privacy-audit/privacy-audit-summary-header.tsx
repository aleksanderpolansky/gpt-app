import type { PrivacyAuditHeader } from "./privacy-audit.types";
import { getToneClassName } from "./privacy-audit.utils";

interface PrivacyAuditSummaryHeaderProps {
  readonly header: PrivacyAuditHeader;
}

export function PrivacyAuditSummaryHeader({
  header,
}: PrivacyAuditSummaryHeaderProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {header.eyebrow}
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {header.title}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {header.description}
            </p>
          </div>
        </div>

        <div
          aria-label="Privacy audit status badges"
          className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end"
        >
          {header.badges.map((badge) => (
            <span
              key={badge.id}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getToneClassName(
                badge.tone,
              )}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground md:grid-cols-3">
        <div>
          <p className="font-medium text-foreground">Transparency</p>
          <p>Every inferred or corrected meaning must show a visible reason.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Additive audit</p>
          <p>Corrections are appended to history instead of overwriting events.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Read-only boundary</p>
          <p>No hidden persistence, resolver mutation, or privacy policy write.</p>
        </div>
      </div>
    </section>
  );
}
