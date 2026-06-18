import type { ValueObjectTargetStandard } from "@/types/value-object-standards";
import {
  formatValueObjectTargetStandardSummary,
  formatValueObjectTargetStandardValue,
} from "@/types/value-object-standards";
import { VALUE_OBJECT_TARGET_STANDARD_FIXTURES } from "@/types/value-object-standard-fixtures";

type ValueObjectStandardsPanelProps = {
  readonly valueObjectId?: string | null;
  readonly valueObjectTitle?: string | null;
  readonly includeDemoFallback?: boolean;
  readonly className?: string;
};

const PANEL_MARKER = "VALUE_OBJECT_STANDARDS_STEP60_NO_WRITE_PANEL";

const PANEL_BASE_CLASSES =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const CARD_CLASSES =
  "rounded-2xl border border-slate-200 bg-slate-50 p-4";

const BADGE_CLASSES =
  "inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600";

const VALUE_BADGE_CLASSES =
  "inline-flex items-center rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white";

function humanizeToken(value: string): string {
  return value.replace(/_/g, " ");
}

function getPriorityLabel(priority: ValueObjectTargetStandard["priority"]): string {
  if (priority === "high") {
    return "High priority";
  }

  if (priority === "low") {
    return "Low priority";
  }

  return "Normal priority";
}

function getDisplayStandards(
  valueObjectId: string | null | undefined,
  includeDemoFallback: boolean
): {
  readonly standards: readonly ValueObjectTargetStandard[];
  readonly matchedCount: number;
  readonly isDemoFallback: boolean;
} {
  const normalizedValueObjectId = valueObjectId?.trim();

  const matchedStandards = normalizedValueObjectId
    ? VALUE_OBJECT_TARGET_STANDARD_FIXTURES.filter(
        (standard) => standard.valueObjectId === normalizedValueObjectId
      )
    : [];

  if (matchedStandards.length > 0) {
    return {
      standards: matchedStandards,
      matchedCount: matchedStandards.length,
      isDemoFallback: false,
    };
  }

  if (includeDemoFallback) {
    return {
      standards: VALUE_OBJECT_TARGET_STANDARD_FIXTURES,
      matchedCount: 0,
      isDemoFallback: true,
    };
  }

  return {
    standards: [],
    matchedCount: 0,
    isDemoFallback: false,
  };
}

function getPanelTitle(valueObjectTitle: string | null | undefined): string {
  const trimmedTitle = valueObjectTitle?.trim();

  if (trimmedTitle) {
    return `Target standards for ${trimmedTitle}`;
  }

  return "Target standards";
}

function ValueObjectStandardCard({
  standard,
}: {
  readonly standard: ValueObjectTargetStandard;
}) {
  return (
    <article className={CARD_CLASSES}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {humanizeToken(standard.metricType)} · {humanizeToken(standard.period)}
            </p>
            <h3 className="text-base font-semibold text-slate-950">
              {standard.label}
            </h3>
          </div>

          <span className={VALUE_BADGE_CLASSES}>
            {formatValueObjectTargetStandardValue(standard)}
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-700">
          {standard.description}
        </p>

        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Summary</p>
            <p className="mt-1 leading-5">
              {formatValueObjectTargetStandardSummary(standard)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Rule</p>
            <p className="mt-1 leading-5">
              {humanizeToken(standard.ruleType)} · {getPriorityLabel(standard.priority)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={BADGE_CLASSES}>
            unit: {humanizeToken(standard.unit)}
          </span>
          <span className={BADGE_CLASSES}>
            source: {humanizeToken(standard.source)}
          </span>
          <span className={BADGE_CLASSES}>
            status: {humanizeToken(standard.status)}
          </span>
          <span className={BADGE_CLASSES}>
            valueObjectId: {standard.valueObjectId}
          </span>
        </div>

        {standard.safetyNote ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            {standard.safetyNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ValueObjectStandardsPanel({
  valueObjectId = null,
  valueObjectTitle = null,
  includeDemoFallback = true,
  className = "",
}: ValueObjectStandardsPanelProps) {
  const { standards, matchedCount, isDemoFallback } = getDisplayStandards(
    valueObjectId,
    includeDemoFallback
  );

  const normalizedValueObjectId = valueObjectId?.trim() || null;

  return (
    <section
      className={[PANEL_BASE_CLASSES, className].filter(Boolean).join(" ")}
      data-step60-marker={PANEL_MARKER}
      aria-label="Value Object target standards"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Value Object standards · no-write preview
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {getPanelTitle(valueObjectTitle)}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This panel reads Step 59 fixture standards only. It does not create
              standards, does not update Value Objects, and does not write to the
              database. Later analytics can compare user-owned facts with these
              structured targets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Displayed
            </p>
            <p className="text-2xl font-semibold text-slate-950">
              {standards.length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          {normalizedValueObjectId ? (
            <p>
              Requested Value Object ID: <strong>{normalizedValueObjectId}</strong>.
              {matchedCount > 0
                ? " Matching fixture standards are shown below."
                : " No direct fixture match was found, so demo/reference standards are shown as a safe fallback."}
            </p>
          ) : (
            <p>
              No Value Object ID filter was provided. Showing the full demo/reference
              standards set.
            </p>
          )}
        </div>

        {isDemoFallback ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Demo fallback is active. These standards are fixtures for UI and
            analytics development, not medical, legal, productivity, or financial
            advice.
          </div>
        ) : null}

        {standards.length > 0 ? (
          <div className="grid gap-4">
            {standards.map((standard) => (
              <ValueObjectStandardCard
                key={standard.standardId}
                standard={standard}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
            No target standards are available for this Value Object yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default ValueObjectStandardsPanel;
