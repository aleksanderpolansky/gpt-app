import type { HTMLAttributes, ReactNode } from "react";

import { Badge } from "./badge";
import { cn } from "./utils";

export type TimelineTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type TimelineDensity = "compact" | "comfortable";
export type TimelineSide = "left" | "right";

const timelineToneClassMap: Record<TimelineTone, string> = {
  neutral: "bg-[#7c8099] text-white",
  primary: "bg-[#3b6ef8] text-white",
  success: "bg-[#22c55e] text-white",
  warning: "bg-[#f97316] text-white",
  danger: "bg-[#ef4444] text-white",
  violet: "bg-[#8b5cf6] text-white",
  cyan: "bg-[#06b6d4] text-white",
};

const timelineSoftToneClassMap: Record<TimelineTone, string> = {
  neutral: "bg-[#f0f2f7] text-[#7c8099]",
  primary: "bg-[#eef2ff] text-[#3b6ef8]",
  success: "bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  warning: "bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  danger: "bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
  violet: "bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  cyan: "bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
};

const timelineBorderToneClassMap: Record<TimelineTone, string> = {
  neutral: "border-[rgba(0,0,0,0.06)]",
  primary: "border-[rgba(59,110,248,0.22)]",
  success: "border-[rgba(34,197,94,0.22)]",
  warning: "border-[rgba(249,115,22,0.22)]",
  danger: "border-[rgba(239,68,68,0.22)]",
  violet: "border-[rgba(139,92,246,0.22)]",
  cyan: "border-[rgba(6,182,212,0.22)]",
};

const timelineDensityClassMap: Record<TimelineDensity, string> = {
  compact: "gap-2",
  comfortable: "gap-3",
};

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  density?: TimelineDensity;
  connector?: boolean;
}

export function Timeline({
  children,
  density = "comfortable",
  connector = true,
  className,
  ...props
}: TimelineProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col",
        timelineDensityClassMap[density],
        connector && "before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TimelineMarkerProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TimelineTone;
  icon?: ReactNode;
  soft?: boolean;
  active?: boolean;
}

export function TimelineMarker({
  tone = "primary",
  icon,
  soft = false,
  active = false,
  className,
  ...props
}: TimelineMarkerProps) {
  return (
    <span
      className={cn(
        "relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-sm",
        soft ? timelineSoftToneClassMap[tone] : timelineToneClassMap[tone],
        active && "ring-4 ring-[#3b6ef8]/15",
        className,
      )}
      {...props}
    >
      {icon ?? "•"}
    </span>
  );
}

export interface TimelineItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  tone?: TimelineTone;
  active?: boolean;
  selected?: boolean;
  compact?: boolean;
  children?: ReactNode;
}

export function TimelineItem({
  title,
  description,
  time,
  meta,
  action,
  badge,
  icon,
  tone = "primary",
  active = false,
  selected = false,
  compact = false,
  className,
  children,
  ...props
}: TimelineItemProps) {
  return (
    <div
      className={cn("relative flex min-w-0 gap-3", className)}
      {...props}
    >
      <TimelineMarker tone={tone} icon={icon} active={active || selected} soft={!active} />

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border bg-white shadow-sm",
          compact ? "p-3" : "p-4",
          selected ? "border-[#3b6ef8] ring-2 ring-[#3b6ef8]/15" : timelineBorderToneClassMap[tone],
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="truncate text-[13px] font-semibold leading-[1.3] text-[#1a1d2e]">
                {title}
              </div>

              {badge ? <span className="shrink-0">{badge}</span> : null}
            </div>

            {description ? (
              <div className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[#7c8099]">
                {description}
              </div>
            ) : null}

            {meta ? (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-[#9ca3b8]">
                {meta}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {time ? (
              <span className="text-[10px] font-semibold tabular-nums text-[#9ca3b8]">
                {time}
              </span>
            ) : null}

            {action}
          </div>
        </div>

        {children ? <div className="mt-3 min-w-0">{children}</div> : null}
      </div>
    </div>
  );
}

export interface TimelineGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

export function TimelineGroup({
  title,
  description,
  children,
  action,
  className,
  ...props
}: TimelineGroupProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {(title || description || action) ? (
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title ? (
              <div className="truncate text-[13px] font-semibold text-[#1a1d2e]">
                {title}
              </div>
            ) : null}

            {description ? (
              <div className="mt-1 text-[11px] leading-[1.4] text-[#7c8099]">
                {description}
              </div>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <Timeline>{children}</Timeline>
    </section>
  );
}

export interface TimelineConnectorProps extends HTMLAttributes<HTMLDivElement> {
  tone?: TimelineTone;
  side?: TimelineSide;
}

const timelineConnectorSideClassMap: Record<TimelineSide, string> = {
  left: "ml-[15px]",
  right: "mr-[15px]",
};

export function TimelineConnector({
  tone = "neutral",
  side = "left",
  className,
  ...props
}: TimelineConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-6 w-px",
        timelineConnectorSideClassMap[side],
        timelineToneClassMap[tone],
        className,
      )}
      {...props}
    />
  );
}

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "confirmed"
  | "rejected"
  | "rollback"
  | "system"
  | "ai_suggested"
  | "user_corrected";

export type AuditTone = "neutral" | "primary" | "success" | "warning" | "danger" | "violet" | "cyan";

const auditActionToneMap: Record<AuditAction, AuditTone> = {
  created: "success",
  updated: "primary",
  deleted: "danger",
  confirmed: "success",
  rejected: "danger",
  rollback: "warning",
  system: "neutral",
  ai_suggested: "violet",
  user_corrected: "cyan",
};

const auditActionLabelMap: Record<AuditAction, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  confirmed: "Confirmed",
  rejected: "Rejected",
  rollback: "Rollback",
  system: "System",
  ai_suggested: "AI suggested",
  user_corrected: "User corrected",
};

const auditToneToBadgeVariantMap: Record<
  AuditTone,
  "neutral" | "blue" | "green" | "orange" | "red" | "violet" | "cyan"
> = {
  neutral: "neutral",
  primary: "blue",
  success: "green",
  warning: "orange",
  danger: "red",
  violet: "violet",
  cyan: "cyan",
};

export interface AuditRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  action?: AuditAction;
  title: ReactNode;
  description?: ReactNode;
  actor?: ReactNode;
  timestamp?: ReactNode;
  entity?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  reason?: ReactNode;
  rightSlot?: ReactNode;
  compact?: boolean;
}

export function AuditRow({
  action = "updated",
  title,
  description,
  actor,
  timestamp,
  entity,
  before,
  after,
  reason,
  rightSlot,
  compact = false,
  className,
  ...props
}: AuditRowProps) {
  const tone = auditActionToneMap[action];

  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-sm",
        compact ? "p-3" : "p-4",
        className,
      )}
      {...props}
    >
      <TimelineMarker tone={tone} soft icon={auditActionLabelMap[action].slice(0, 1)} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="truncate text-[13px] font-semibold leading-[1.3] text-[#1a1d2e]">
                {title}
              </div>

              <Badge variant={auditToneToBadgeVariantMap[tone]} size="xs">
                {auditActionLabelMap[action]}
              </Badge>

              {entity ? (
                <Badge variant="neutral" size="xs">
                  {entity}
                </Badge>
              ) : null}
            </div>

            {description ? (
              <div className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[#7c8099]">
                {description}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {timestamp ? (
              <span className="text-[10px] font-semibold tabular-nums text-[#9ca3b8]">
                {timestamp}
              </span>
            ) : null}

            {rightSlot}
          </div>
        </div>

        {(before || after) ? (
          <AuditDiff before={before} after={after} className="mt-3" />
        ) : null}

        {(actor || reason) ? (
          <AuditMeta actor={actor} reason={reason} className="mt-3" />
        ) : null}
      </div>
    </div>
  );
}

export interface AuditDiffProps extends HTMLAttributes<HTMLDivElement> {
  before?: ReactNode;
  after?: ReactNode;
  beforeLabel?: ReactNode;
  afterLabel?: ReactNode;
}

export function AuditDiff({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  className,
  ...props
}: AuditDiffProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-2 rounded-lg bg-[#f5f6fb] p-2 sm:grid-cols-2",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 rounded-md bg-white px-2.5 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3b8]">
          {beforeLabel}
        </div>
        <div className="min-w-0 text-[11px] leading-[1.4] text-[#4a4f6a]">
          {before ?? "—"}
        </div>
      </div>

      <div className="min-w-0 rounded-md bg-white px-2.5 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3b8]">
          {afterLabel}
        </div>
        <div className="min-w-0 text-[11px] leading-[1.4] text-[#1a1d2e]">
          {after ?? "—"}
        </div>
      </div>
    </div>
  );
}

export interface AuditMetaProps extends HTMLAttributes<HTMLDivElement> {
  actor?: ReactNode;
  reason?: ReactNode;
}

export function AuditMeta({
  actor,
  reason,
  className,
  ...props
}: AuditMetaProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-[#7c8099]",
        className,
      )}
      {...props}
    >
      {actor ? (
        <span className="rounded-full bg-[#f0f2f7] px-2 py-1 font-medium">
          {actor}
        </span>
      ) : null}

      {reason ? (
        <span className="min-w-0 truncate rounded-full bg-[#f0f2f7] px-2 py-1 font-medium">
          {reason}
        </span>
      ) : null}
    </div>
  );
}

export interface AuditTrailProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  compact?: boolean;
}

export function AuditTrail({
  children,
  compact = false,
  className,
  ...props
}: AuditTrailProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        compact ? "gap-2" : "gap-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const timelineTones = timelineToneClassMap;
export const timelineSoftTones = timelineSoftToneClassMap;
export const timelineBorderTones = timelineBorderToneClassMap;
export const timelineDensities = timelineDensityClassMap;
export const timelineConnectorSides = timelineConnectorSideClassMap;
export const auditActionTones = auditActionToneMap;
export const auditActionLabels = auditActionLabelMap;
export const auditToneBadgeVariants = auditToneToBadgeVariantMap;
