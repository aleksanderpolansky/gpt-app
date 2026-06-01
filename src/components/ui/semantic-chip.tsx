import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type SemanticChipKind =
  | "category"
  | "value_object"
  | "activity"
  | "state_signal"
  | "external_concept"
  | "role"
  | "responsibility"
  | "care"
  | "candidate"
  | "confirmed"
  | "rejected";

export type SemanticChipSize = "sm" | "md";
export type SemanticChipDensity = "compact" | "comfortable";

const semanticChipKindClassMap: Record<SemanticChipKind, string> = {
  category:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8]",
  value_object:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  activity:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
  state_signal:
    "border-[rgba(0,0,0,0.06)] bg-[#f0f2f7] text-[#7c8099]",
  external_concept:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
  role:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  responsibility:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  care:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  candidate:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8]",
  confirmed:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  rejected:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
};

const semanticChipDotClassMap: Record<SemanticChipKind, string> = {
  category: "bg-[#3b6ef8]",
  value_object: "bg-[#8b5cf6]",
  activity: "bg-[#06b6d4]",
  state_signal: "bg-[#7c8099]",
  external_concept: "bg-[#06b6d4]",
  role: "bg-[#f97316]",
  responsibility: "bg-[#f97316]",
  care: "bg-[#22c55e]",
  candidate: "bg-[#3b6ef8]",
  confirmed: "bg-[#22c55e]",
  rejected: "bg-[#ef4444]",
};

const semanticChipSizeClassMap: Record<SemanticChipSize, string> = {
  sm: "min-h-7 px-2 py-1 text-[11px]",
  md: "min-h-8 px-2.5 py-1.5 text-[12px]",
};

const semanticChipDensityClassMap: Record<SemanticChipDensity, string> = {
  compact: "gap-1",
  comfortable: "gap-1.5",
};

export interface SemanticChipProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: SemanticChipKind;
  size?: SemanticChipSize;
  density?: SemanticChipDensity;
  label: ReactNode;
  description?: ReactNode;
  source?: ReactNode;
  confidence?: number;
  count?: number;
  selected?: boolean;
  muted?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

function formatConfidence(confidence?: number): string | null {
  if (confidence === undefined || confidence === null || Number.isNaN(confidence)) {
    return null;
  }

  const normalized = confidence > 1 ? confidence : confidence * 100;
  const clamped = Math.min(Math.max(normalized, 0), 100);

  return `${Math.round(clamped)}%`;
}

export function SemanticChip({
  kind = "category",
  size = "sm",
  density = "comfortable",
  label,
  description,
  source,
  confidence,
  count,
  selected = false,
  muted = false,
  leftSlot,
  rightSlot,
  className,
  ...props
}: SemanticChipProps) {
  const confidenceLabel = formatConfidence(confidence);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border font-semibold leading-none transition-all",
        semanticChipKindClassMap[kind],
        semanticChipSizeClassMap[size],
        semanticChipDensityClassMap[density],
        selected && "ring-2 ring-[#3b6ef8]/15",
        muted && "opacity-60",
        className,
      )}
      title={typeof label === "string" ? label : undefined}
      {...props}
    >
      {leftSlot ?? (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            semanticChipDotClassMap[kind],
          )}
        />
      )}

      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate">{label}</span>

        {description ? (
          <span className="hidden max-w-[180px] truncate font-medium opacity-70 sm:inline">
            {description}
          </span>
        ) : null}
      </span>

      {source ? (
        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold opacity-80">
          {source}
        </span>
      ) : null}

      {confidenceLabel ? (
        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums opacity-80">
          {confidenceLabel}
        </span>
      ) : null}

      {typeof count === "number" ? (
        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums opacity-80">
          {count}
        </span>
      ) : null}

      {rightSlot ? <span className="inline-flex shrink-0">{rightSlot}</span> : null}
    </span>
  );
}

export interface SemanticChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  wrap?: boolean;
  gap?: "sm" | "md";
}

const semanticChipGroupGapClassMap: Record<
  NonNullable<SemanticChipGroupProps["gap"]>,
  string
> = {
  sm: "gap-1.5",
  md: "gap-2",
};

export function SemanticChipGroup({
  children,
  wrap = true,
  gap = "sm",
  className,
  ...props
}: SemanticChipGroupProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        wrap ? "flex-wrap" : "overflow-hidden",
        semanticChipGroupGapClassMap[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type SemanticSourceKind =
  | "system"
  | "user"
  | "ai"
  | "external"
  | "ontology"
  | "history";

const semanticSourceClassMap: Record<SemanticSourceKind, string> = {
  system:
    "border-[rgba(0,0,0,0.06)] bg-[#f0f2f7] text-[#7c8099]",
  user:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8]",
  ai:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  external:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
  ontology:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  history:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d]",
};

export interface SemanticSourceBadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  source?: SemanticSourceKind;
  children?: ReactNode;
}

const semanticSourceDefaultLabelMap: Record<SemanticSourceKind, string> = {
  system: "System",
  user: "User",
  ai: "AI",
  external: "External",
  ontology: "Ontology",
  history: "History",
};

export function SemanticSourceBadge({
  source = "system",
  children,
  className,
  ...props
}: SemanticSourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        semanticSourceClassMap[source],
        className,
      )}
      {...props}
    >
      {children ?? semanticSourceDefaultLabelMap[source]}
    </span>
  );
}

export interface SemanticConfidenceBarProps
  extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  label?: ReactNode;
}

export function SemanticConfidenceBar({
  value = 0,
  label,
  className,
  ...props
}: SemanticConfidenceBarProps) {
  const normalized = value > 1 ? value : value * 100;
  const clamped = Math.min(Math.max(normalized, 0), 100);

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      {label ? (
        <span className="shrink-0 text-[11px] font-medium text-[#7c8099]">
          {label}
        </span>
      ) : null}

      <span className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-[#f0f2f7]">
        <span
          className="block h-full rounded-full bg-[#3b6ef8]"
          style={{ width: `${clamped}%` }}
        />
      </span>

      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[#7c8099]">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

export const semanticChipKinds = semanticChipKindClassMap;
export const semanticChipDots = semanticChipDotClassMap;
export const semanticChipSizes = semanticChipSizeClassMap;
export const semanticChipDensities = semanticChipDensityClassMap;
export const semanticSources = semanticSourceClassMap;
export const semanticSourceDefaultLabels = semanticSourceDefaultLabelMap;
