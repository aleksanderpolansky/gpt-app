import type {
  ValueObjectAttentionStatus,
  ValueObjectLifecycleStatus,
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  formatValueObjectPercent,
  isValueObjectNeedsReview,
} from "./value-object-normalizer";

export type ValueObjectStatusBadgeVariant =
  | "lifecycle"
  | "attention"
  | "progress"
  | "review";

export interface ValueObjectStatusBadgeProps {
  readonly valueObject: ValueObjectUiNode;
  readonly variant?: ValueObjectStatusBadgeVariant;
  readonly compact?: boolean;
}

export interface ValueObjectStatusBadgeGroupProps {
  readonly valueObject: ValueObjectUiNode;
}

const BASE_BADGE_CLASSES =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-tight shadow-sm";

const COMPACT_BADGE_CLASSES = "px-2 py-0.5 text-[11px]";

const TONE_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

const LIFECYCLE_LABELS: Record<ValueObjectLifecycleStatus, string> = {
  active: "Active",
  draft: "Draft",
  paused: "Paused",
  needs_review: "Needs review",
  archived_preview: "Archived preview",
};

const LIFECYCLE_TONES: Record<ValueObjectLifecycleStatus, ValueObjectSignalTone> =
  {
    active: "emerald",
    draft: "slate",
    paused: "amber",
    needs_review: "amber",
    archived_preview: "slate",
  };

const ATTENTION_LABELS: Record<ValueObjectAttentionStatus, string> = {
  balanced: "Balanced",
  under_attention: "Under attention",
  over_attention: "Over attention",
  needs_review: "Needs review",
  not_started: "Not started",
};

const ATTENTION_TONES: Record<ValueObjectAttentionStatus, ValueObjectSignalTone> =
  {
    balanced: "emerald",
    under_attention: "amber",
    over_attention: "rose",
    needs_review: "amber",
    not_started: "cyan",
  };

const getProgressTone = (progressPercent: number): ValueObjectSignalTone => {
  if (progressPercent >= 70) {
    return "emerald";
  }

  if (progressPercent >= 45) {
    return "indigo";
  }

  return "amber";
};

const getBadgeLabel = (
  valueObject: ValueObjectUiNode,
  variant: ValueObjectStatusBadgeVariant,
): string => {
  if (variant === "lifecycle") {
    return LIFECYCLE_LABELS[valueObject.lifecycleStatus];
  }

  if (variant === "attention") {
    return ATTENTION_LABELS[valueObject.attentionStatus];
  }

  if (variant === "progress") {
    return `Progress ${formatValueObjectPercent(valueObject.progressPercent)}`;
  }

  return isValueObjectNeedsReview(valueObject)
    ? "Review signal"
    : "Stable preview";
};

const getBadgeTone = (
  valueObject: ValueObjectUiNode,
  variant: ValueObjectStatusBadgeVariant,
): ValueObjectSignalTone => {
  if (variant === "lifecycle") {
    return LIFECYCLE_TONES[valueObject.lifecycleStatus];
  }

  if (variant === "attention") {
    return ATTENTION_TONES[valueObject.attentionStatus];
  }

  if (variant === "progress") {
    return getProgressTone(valueObject.progressPercent);
  }

  return isValueObjectNeedsReview(valueObject) ? "amber" : "emerald";
};

export function ValueObjectStatusBadge({
  valueObject,
  variant = "lifecycle",
  compact = false,
}: ValueObjectStatusBadgeProps) {
  const label = getBadgeLabel(valueObject, variant);
  const tone = getBadgeTone(valueObject, variant);

  return (
    <span
      aria-label={`Value Object ${variant} status: ${label}`}
      className={[
        BASE_BADGE_CLASSES,
        TONE_CLASS_NAMES[tone],
        compact ? COMPACT_BADGE_CLASSES : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}

export function ValueObjectStatusBadgeGroup({
  valueObject,
}: ValueObjectStatusBadgeGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ValueObjectStatusBadge valueObject={valueObject} variant="lifecycle" />
      <ValueObjectStatusBadge valueObject={valueObject} variant="attention" />
      <ValueObjectStatusBadge valueObject={valueObject} variant="progress" />
      <ValueObjectStatusBadge valueObject={valueObject} variant="review" />
    </div>
  );
}
