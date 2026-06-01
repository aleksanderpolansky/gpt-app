import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type BadgeVariant =
  | "neutral"
  | "blue"
  | "green"
  | "violet"
  | "orange"
  | "red"
  | "cyan";

export type BadgeSize = "xs" | "sm" | "md";
export type BadgeShape = "rounded" | "pill";

const badgeVariantClassMap: Record<BadgeVariant, string> = {
  neutral:
    "border-[rgba(0,0,0,0.06)] bg-[#f0f2f7] text-[#7c8099]",
  blue:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8]",
  green:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  violet:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  orange:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  red:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
  cyan:
    "border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
};

const badgeSizeClassMap: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[10px] leading-[1.2]",
  sm: "px-2 py-0.5 text-[11px] leading-[1.25]",
  md: "px-2.5 py-1 text-[12px] leading-[1.25]",
};

const badgeShapeClassMap: Record<BadgeShape, string> = {
  rounded: "rounded-md",
  pill: "rounded-full",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "sm",
  shape = "pill",
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-1 whitespace-nowrap border font-semibold",
        badgeVariantClassMap[variant],
        badgeSizeClassMap[size],
        badgeShapeClassMap[shape],
        className,
      )}
      {...props}
    >
      {leftIcon ? <span className="inline-flex shrink-0">{leftIcon}</span> : null}
      <span className="truncate">{children}</span>
      {rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </span>
  );
}

export type StatusPillStatus =
  | "neutral"
  | "draft"
  | "active"
  | "confirmed"
  | "success"
  | "warning"
  | "danger"
  | "rejected"
  | "needs_review"
  | "candidate"
  | "suggested"
  | "external_hint"
  | "state_signal";

const statusPillVariantMap: Record<StatusPillStatus, BadgeVariant> = {
  neutral: "neutral",
  draft: "neutral",
  active: "blue",
  confirmed: "green",
  success: "green",
  warning: "orange",
  danger: "red",
  rejected: "red",
  needs_review: "orange",
  candidate: "blue",
  suggested: "violet",
  external_hint: "cyan",
  state_signal: "neutral",
};

const statusPillDefaultLabelMap: Record<StatusPillStatus, string> = {
  neutral: "Neutral",
  draft: "Draft",
  active: "Active",
  confirmed: "Confirmed",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
  rejected: "Rejected",
  needs_review: "Needs review",
  candidate: "Candidate",
  suggested: "Suggested",
  external_hint: "External hint",
  state_signal: "State signal",
};

export interface StatusPillProps
  extends Omit<BadgeProps, "variant" | "children"> {
  status?: StatusPillStatus;
  label?: ReactNode;
}

export function StatusPill({
  status = "neutral",
  label,
  size = "sm",
  shape = "pill",
  className,
  ...props
}: StatusPillProps) {
  return (
    <Badge
      variant={statusPillVariantMap[status]}
      size={size}
      shape={shape}
      className={className}
      {...props}
    >
      {label ?? statusPillDefaultLabelMap[status]}
    </Badge>
  );
}

export interface CountBadgeProps
  extends Omit<BadgeProps, "children" | "size" | "shape"> {
  count: number;
  max?: number;
  compact?: boolean;
}

export function CountBadge({
  count,
  max = 99,
  compact = false,
  variant = "blue",
  className,
  ...props
}: CountBadgeProps) {
  const displayValue = count > max ? `${max}+` : String(count);

  return (
    <Badge
      variant={variant}
      size="xs"
      shape="pill"
      className={cn(
        "min-w-[18px] px-1.5 text-center tabular-nums",
        compact && "min-w-0 px-1",
        className,
      )}
      {...props}
    >
      {displayValue}
    </Badge>
  );
}

export interface DotBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  label?: string;
}

const dotVariantClassMap: Record<BadgeVariant, string> = {
  neutral: "bg-[#7c8099]",
  blue: "bg-[#3b6ef8]",
  green: "bg-[#22c55e]",
  violet: "bg-[#8b5cf6]",
  orange: "bg-[#f97316]",
  red: "bg-[#ef4444]",
  cyan: "bg-[#06b6d4]",
};

export function DotBadge({
  variant = "blue",
  label,
  className,
  ...props
}: DotBadgeProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex h-[7px] w-[7px] shrink-0 rounded-full",
        dotVariantClassMap[variant],
        className,
      )}
      {...props}
    />
  );
}

export const badgeVariants = badgeVariantClassMap;
export const badgeSizes = badgeSizeClassMap;
export const badgeShapes = badgeShapeClassMap;
export const statusPillVariants = statusPillVariantMap;
export const statusPillDefaultLabels = statusPillDefaultLabelMap;
