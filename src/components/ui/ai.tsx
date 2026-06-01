import type { HTMLAttributes, ReactNode } from "react";

import { Badge, StatusPill } from "./badge";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "./utils";

export type AIMessageRole = "assistant" | "user" | "system" | "tool";
export type AIMessageStatus = "idle" | "thinking" | "success" | "warning" | "error";

const aiMessageRoleClassMap: Record<AIMessageRole, string> = {
  assistant:
    "border-[rgba(59,110,248,0.14)] bg-[#eef2ff] text-[#1a1d2e]",
  user:
    "border-[rgba(0,0,0,0.06)] bg-white text-[#1a1d2e]",
  system:
    "border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] text-[#4a4f6a]",
  tool:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#1a1d2e]",
};

const aiMessageAvatarClassMap: Record<AIMessageRole, string> = {
  assistant: "bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5] text-white",
  user: "bg-gradient-to-br from-[#9ca3b8] to-[#7c8099] text-white",
  system: "bg-[#f0f2f7] text-[#7c8099]",
  tool: "bg-[rgba(6,182,212,0.12)] text-[#0891b2]",
};

const aiMessageStatusClassMap: Record<AIMessageStatus, string> = {
  idle: "text-[#7c8099]",
  thinking: "text-[#8b5cf6]",
  success: "text-[#22c55e]",
  warning: "text-[#f97316]",
  error: "text-[#ef4444]",
};

const aiMessageRoleLabelMap: Record<AIMessageRole, string> = {
  assistant: "AI",
  user: "User",
  system: "System",
  tool: "Tool",
};

export interface AIThinkingDotsProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function AIThinkingDots({
  label = "AI thinking",
  className,
  ...props
}: AIThinkingDotsProps) {
  return (
    <span
      aria-label={label}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
    </span>
  );
}

export interface AIMessageProps extends HTMLAttributes<HTMLDivElement> {
  role?: AIMessageRole;
  status?: AIMessageStatus;
  author?: ReactNode;
  timestamp?: ReactNode;
  avatar?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}

export function AIMessage({
  role = "assistant",
  status = "idle",
  author,
  timestamp,
  avatar,
  meta,
  actions,
  compact = false,
  className,
  children,
  ...props
}: AIMessageProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 rounded-xl border shadow-sm",
        compact ? "p-3" : "p-4",
        aiMessageRoleClassMap[role],
        className,
      )}
      data-ai-role={role}
      {...props}
    >
      <div
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm",
          aiMessageAvatarClassMap[role],
        )}
      >
        {avatar ?? aiMessageRoleLabelMap[role].slice(0, 2)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12.5px] font-semibold leading-[1.25] text-[#1a1d2e]">
              {author ?? aiMessageRoleLabelMap[role]}
            </span>

            {status === "thinking" ? (
              <span className={cn("inline-flex", aiMessageStatusClassMap[status])}>
                <AIThinkingDots />
              </span>
            ) : null}

            {meta ? (
              <span className="truncate text-[11px] font-medium text-[#7c8099]">
                {meta}
              </span>
            ) : null}
          </div>

          {timestamp ? (
            <span className="shrink-0 text-[10px] font-medium text-[#9ca3b8]">
              {timestamp}
            </span>
          ) : null}
        </div>

        <div className="mt-2 min-w-0 text-[12.5px] leading-[1.5] text-[#1a1d2e]">
          {children}
        </div>

        {actions ? (
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type AIInsightTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type AIInsightStatus =
  | "candidate"
  | "confirmed"
  | "rejected"
  | "needs_review"
  | "active";

const aiInsightToneClassMap: Record<AIInsightTone, string> = {
  neutral:
    "border-[rgba(0,0,0,0.06)] bg-white text-[#1a1d2e]",
  primary:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#1a1d2e]",
  success:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] text-[#1a1d2e]",
  warning:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.08)] text-[#1a1d2e]",
  danger:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] text-[#1a1d2e]",
  violet:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.08)] text-[#1a1d2e]",
  cyan:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.08)] text-[#1a1d2e]",
};

const aiInsightAccentClassMap: Record<AIInsightTone, string> = {
  neutral: "bg-[#7c8099]",
  primary: "bg-[#3b6ef8]",
  success: "bg-[#22c55e]",
  warning: "bg-[#f97316]",
  danger: "bg-[#ef4444]",
  violet: "bg-[#8b5cf6]",
  cyan: "bg-[#06b6d4]",
};

const aiInsightStatusToStatusPillMap: Record<
  AIInsightStatus,
  "candidate" | "confirmed" | "rejected" | "needs_review" | "active"
> = {
  candidate: "candidate",
  confirmed: "confirmed",
  rejected: "rejected",
  needs_review: "needs_review",
  active: "active",
};

function formatAIConfidence(confidence?: number): string | null {
  if (confidence === undefined || confidence === null || Number.isNaN(confidence)) {
    return null;
  }

  const normalized = confidence > 1 ? confidence : confidence * 100;
  const clamped = Math.min(Math.max(normalized, 0), 100);

  return `${Math.round(clamped)}%`;
}

export interface AIInsightCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  insight?: ReactNode;
  source?: ReactNode;
  confidence?: number;
  tone?: AIInsightTone;
  status?: AIInsightStatus;
  statusLabel?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function AIInsightCard({
  title,
  description,
  insight,
  source,
  confidence,
  tone = "primary",
  status = "candidate",
  statusLabel,
  icon,
  action,
  footer,
  children,
  className,
  ...props
}: AIInsightCardProps) {
  const confidenceLabel = formatAIConfidence(confidence);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 shadow-sm",
        aiInsightToneClassMap[tone],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("absolute left-0 top-0 h-full w-1", aiInsightAccentClassMap[tone])}
      />

      <div className="flex min-w-0 items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 flex-1 gap-2.5">
          {icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-current shadow-sm">
              {icon}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="truncate text-[14px] font-semibold leading-[1.3] text-[#1a1d2e]">
                {title}
              </div>

              <StatusPill
                status={aiInsightStatusToStatusPillMap[status]}
                label={statusLabel}
                size="xs"
              />
            </div>

            {description ? (
              <div className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[#7c8099]">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {insight ? (
        <div className="mt-3 rounded-lg bg-white/70 p-3 text-[12.5px] leading-[1.5] text-[#1a1d2e]">
          {insight}
        </div>
      ) : null}

      {children ? <div className="mt-3 min-w-0">{children}</div> : null}

      {(source || confidenceLabel || footer) ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 pl-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {source ? (
              <Badge variant="neutral" size="xs">
                {source}
              </Badge>
            ) : null}

            {confidenceLabel ? (
              <Badge variant="blue" size="xs">
                {confidenceLabel}
              </Badge>
            ) : null}
          </div>

          {footer ? (
            <div className="truncate text-[11px] font-medium text-[#7c8099]">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type AIRecommendationPriority = "low" | "medium" | "high" | "critical";

const aiRecommendationPriorityVariantMap: Record<
  AIRecommendationPriority,
  "neutral" | "blue" | "orange" | "red"
> = {
  low: "neutral",
  medium: "blue",
  high: "orange",
  critical: "red",
};

const aiRecommendationPriorityLabelMap: Record<AIRecommendationPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export interface AIRecommendationCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  reason?: ReactNode;
  expectedImpact?: ReactNode;
  direction?: ReactNode;
  priority?: AIRecommendationPriority;
  confidence?: number;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export function AIRecommendationCard({
  title,
  description,
  reason,
  expectedImpact,
  direction,
  priority = "medium",
  confidence,
  action,
  secondaryAction,
  meta,
  selected = false,
  className,
  ...props
}: AIRecommendationCardProps) {
  const confidenceLabel = formatAIConfidence(confidence);

  return (
    <Card
      selected={selected}
      className={cn("gap-3", className)}
      {...props}
    >
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-1.5">
            <Badge
              variant={aiRecommendationPriorityVariantMap[priority]}
              size="xs"
            >
              {aiRecommendationPriorityLabelMap[priority]}
            </Badge>

            {confidenceLabel ? (
              <Badge variant="blue" size="xs">
                {confidenceLabel}
              </Badge>
            ) : null}
          </div>
        }
      />

      <CardContent className="flex flex-col gap-3">
        {direction ? (
          <div className="rounded-lg bg-[#eef2ff] px-3 py-2 text-[12px] font-semibold leading-[1.4] text-[#3b6ef8]">
            {direction}
          </div>
        ) : null}

        {reason ? (
          <div className="text-[12.5px] leading-[1.5] text-[#1a1d2e]">
            {reason}
          </div>
        ) : null}

        {expectedImpact ? (
          <div className="rounded-lg bg-[#f5f6fb] px-3 py-2 text-[11px] leading-[1.4] text-[#7c8099]">
            {expectedImpact}
          </div>
        ) : null}

        {(action || secondaryAction || meta) ? (
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {action}
              {secondaryAction}
            </div>

            {meta ? (
              <div className="truncate text-[11px] font-medium text-[#9ca3b8]">
                {meta}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface AIActionBarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}

const aiActionBarAlignClassMap: Record<
  NonNullable<AIActionBarProps["align"]>,
  string
> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function AIActionBar({
  children,
  align = "start",
  wrap = true,
  className,
  ...props
}: AIActionBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        wrap ? "flex-wrap" : "overflow-hidden",
        aiActionBarAlignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type AIContextNoteTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

const aiContextNoteToneClassMap: Record<AIContextNoteTone, string> = {
  neutral:
    "border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] text-[#4a4f6a]",
  primary:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8]",
  success:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  warning:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  danger:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
  violet:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  cyan:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
};

export interface AIContextNoteProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AIContextNoteTone;
  icon?: ReactNode;
  label?: ReactNode;
  children: ReactNode;
}

export function AIContextNote({
  tone = "neutral",
  icon,
  label,
  className,
  children,
  ...props
}: AIContextNoteProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 rounded-lg border px-3 py-2 text-[11px] leading-[1.4]",
        aiContextNoteToneClassMap[tone],
        className,
      )}
      {...props}
    >
      {icon ? <span className="mt-0.5 inline-flex shrink-0">{icon}</span> : null}

      <div className="min-w-0 flex-1">
        {label ? (
          <div className="mb-0.5 truncate font-semibold">{label}</div>
        ) : null}

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export const aiMessageRoles = aiMessageRoleClassMap;
export const aiMessageAvatars = aiMessageAvatarClassMap;
export const aiMessageStatuses = aiMessageStatusClassMap;
export const aiInsightTones = aiInsightToneClassMap;
export const aiInsightAccents = aiInsightAccentClassMap;
export const aiInsightStatusPills = aiInsightStatusToStatusPillMap;
export const aiRecommendationPriorities = aiRecommendationPriorityVariantMap;
export const aiRecommendationPriorityLabels = aiRecommendationPriorityLabelMap;
export const aiActionBarAlignments = aiActionBarAlignClassMap;
export const aiContextNoteTones = aiContextNoteToneClassMap;
