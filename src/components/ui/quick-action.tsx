import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "./utils";

export type QuickActionTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type QuickActionSize = "sm" | "md" | "lg";
export type QuickActionShape = "rounded" | "pill" | "square";
export type QuickActionVariant = "solid" | "soft" | "ghost" | "outline";

const quickActionToneClassMap: Record<
  QuickActionTone,
  Record<QuickActionVariant, string>
> = {
  neutral: {
    solid: "bg-[#1a1d2e] text-white hover:bg-[#2a2f45]",
    soft: "bg-[#f5f6fb] text-[#4a4f6a] hover:bg-[#eef0f6]",
    ghost: "bg-transparent text-[#4a4f6a] hover:bg-[#f5f6fb]",
    outline:
      "border border-[rgba(0,0,0,0.08)] bg-white text-[#4a4f6a] hover:bg-[#f5f6fb]",
  },
  primary: {
    solid: "bg-[#3b6ef8] text-white hover:bg-[#2f5ee0]",
    soft: "bg-[#eef2ff] text-[#3b6ef8] hover:bg-[#e3e9ff]",
    ghost: "bg-transparent text-[#3b6ef8] hover:bg-[#eef2ff]",
    outline:
      "border border-[rgba(59,110,248,0.22)] bg-white text-[#3b6ef8] hover:bg-[#eef2ff]",
  },
  success: {
    solid: "bg-[#22c55e] text-white hover:bg-[#16a34a]",
    soft:
      "bg-[rgba(34,197,94,0.10)] text-[#16803d] hover:bg-[rgba(34,197,94,0.16)]",
    ghost:
      "bg-transparent text-[#16803d] hover:bg-[rgba(34,197,94,0.10)]",
    outline:
      "border border-[rgba(34,197,94,0.22)] bg-white text-[#16803d] hover:bg-[rgba(34,197,94,0.10)]",
  },
  warning: {
    solid: "bg-[#f97316] text-white hover:bg-[#ea580c]",
    soft:
      "bg-[rgba(249,115,22,0.10)] text-[#b45309] hover:bg-[rgba(249,115,22,0.16)]",
    ghost:
      "bg-transparent text-[#b45309] hover:bg-[rgba(249,115,22,0.10)]",
    outline:
      "border border-[rgba(249,115,22,0.22)] bg-white text-[#b45309] hover:bg-[rgba(249,115,22,0.10)]",
  },
  danger: {
    solid: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
    soft:
      "bg-[rgba(239,68,68,0.10)] text-[#b91c1c] hover:bg-[rgba(239,68,68,0.16)]",
    ghost:
      "bg-transparent text-[#b91c1c] hover:bg-[rgba(239,68,68,0.10)]",
    outline:
      "border border-[rgba(239,68,68,0.22)] bg-white text-[#b91c1c] hover:bg-[rgba(239,68,68,0.10)]",
  },
  violet: {
    solid: "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]",
    soft:
      "bg-[rgba(139,92,246,0.10)] text-[#6d28d9] hover:bg-[rgba(139,92,246,0.16)]",
    ghost:
      "bg-transparent text-[#6d28d9] hover:bg-[rgba(139,92,246,0.10)]",
    outline:
      "border border-[rgba(139,92,246,0.22)] bg-white text-[#6d28d9] hover:bg-[rgba(139,92,246,0.10)]",
  },
  cyan: {
    solid: "bg-[#06b6d4] text-white hover:bg-[#0891b2]",
    soft:
      "bg-[rgba(6,182,212,0.10)] text-[#0891b2] hover:bg-[rgba(6,182,212,0.16)]",
    ghost:
      "bg-transparent text-[#0891b2] hover:bg-[rgba(6,182,212,0.10)]",
    outline:
      "border border-[rgba(6,182,212,0.22)] bg-white text-[#0891b2] hover:bg-[rgba(6,182,212,0.10)]",
  },
};

const quickActionSizeClassMap: Record<QuickActionSize, string> = {
  sm: "min-h-8 px-2.5 text-[11px]",
  md: "min-h-9 px-3 text-[12px]",
  lg: "min-h-11 px-4 text-[13px]",
};

const quickActionIconSizeClassMap: Record<QuickActionSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const quickActionShapeClassMap: Record<QuickActionShape, string> = {
  rounded: "rounded-xl",
  pill: "rounded-full",
  square: "rounded-lg",
};

function QuickActionSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export interface QuickActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  shortcut?: ReactNode;
  badge?: ReactNode;
  tone?: QuickActionTone;
  actionSize?: QuickActionSize;
  shape?: QuickActionShape;
  variant?: QuickActionVariant;
  active?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  stacked?: boolean;
}

export function QuickActionButton({
  label,
  description,
  icon,
  rightSlot,
  shortcut,
  badge,
  tone = "primary",
  actionSize = "md",
  shape = "rounded",
  variant = "soft",
  active = false,
  loading = false,
  fullWidth = false,
  stacked = false,
  className,
  disabled,
  type = "button",
  ...props
}: QuickActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-pressed={active || undefined}
      className={cn(
        "group inline-flex min-w-0 items-center justify-center gap-2 font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        quickActionToneClassMap[tone][variant],
        quickActionSizeClassMap[actionSize],
        quickActionShapeClassMap[shape],
        fullWidth && "w-full",
        stacked ? "flex-col py-3 text-center" : "text-left",
        active && "ring-2 ring-[#3b6ef8]/15",
        className,
      )}
      {...props}
    >
      {loading ? (
        <QuickActionSpinner />
      ) : icon ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            quickActionIconSizeClassMap[actionSize],
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className={cn("min-w-0", stacked ? "flex flex-col items-center" : "flex-1")}>
        <span className="block truncate leading-[1.25]">{label}</span>

        {description ? (
          <span className="mt-0.5 block line-clamp-1 text-[10.5px] font-medium leading-[1.25] opacity-70">
            {description}
          </span>
        ) : null}
      </span>

      {!stacked && shortcut ? (
        <kbd className="shrink-0 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none opacity-80 shadow-sm">
          {shortcut}
        </kbd>
      ) : null}

      {!stacked && badge ? <span className="shrink-0">{badge}</span> : null}
      {!stacked && rightSlot ? <span className="shrink-0">{rightSlot}</span> : null}
    </button>
  );
}

export interface QuickActionGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  wrap?: boolean;
  align?: "start" | "center" | "end" | "between";
}

const quickActionGroupGapClassMap: Record<
  NonNullable<QuickActionGroupProps["gap"]>,
  string
> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
};

const quickActionGroupAlignClassMap: Record<
  NonNullable<QuickActionGroupProps["align"]>,
  string
> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function QuickActionGroup({
  children,
  gap = "md",
  wrap = true,
  align = "start",
  className,
  ...props
}: QuickActionGroupProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        wrap ? "flex-wrap" : "overflow-hidden",
        quickActionGroupGapClassMap[gap],
        quickActionGroupAlignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface QuickActionCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: QuickActionTone;
  selected?: boolean;
  compact?: boolean;
  children?: ReactNode;
}

export function QuickActionCard({
  title,
  description,
  icon,
  action,
  tone = "primary",
  selected = false,
  compact = false,
  className,
  children,
  ...props
}: QuickActionCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border bg-white shadow-sm transition-all",
        compact ? "p-3" : "p-4",
        selected
          ? "border-[#3b6ef8] ring-2 ring-[#3b6ef8]/15"
          : "border-[rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? (
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                quickActionToneClassMap[tone].soft,
              )}
            >
              {icon}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-[1.3] text-[#1a1d2e]">
              {title}
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

      {children ? <div className="min-w-0">{children}</div> : null}
    </div>
  );
}

export interface FloatingQuickActionButtonProps
  extends Omit<QuickActionButtonProps, "fullWidth" | "stacked"> {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

const floatingQuickActionPositionClassMap: Record<
  NonNullable<FloatingQuickActionButtonProps["position"]>,
  string
> = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "right-6 top-6",
  "top-left": "left-6 top-6",
};

export function FloatingQuickActionButton({
  position = "bottom-right",
  className,
  ...props
}: FloatingQuickActionButtonProps) {
  return (
    <QuickActionButton
      className={cn(
        "fixed z-40 shadow-[0_10px_30px_rgba(15,23,42,0.18)]",
        floatingQuickActionPositionClassMap[position],
        className,
      )}
      fullWidth={false}
      stacked={false}
      {...props}
    />
  );
}

export interface QuickActionGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

const quickActionGridColumnsClassMap: Record<
  NonNullable<QuickActionGridProps["columns"]>,
  string
> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function QuickActionGrid({
  children,
  columns = 4,
  className,
  ...props
}: QuickActionGridProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3",
        quickActionGridColumnsClassMap[columns],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const quickActionTones = quickActionToneClassMap;
export const quickActionSizes = quickActionSizeClassMap;
export const quickActionIconSizes = quickActionIconSizeClassMap;
export const quickActionShapes = quickActionShapeClassMap;
export const quickActionGroupGaps = quickActionGroupGapClassMap;
export const quickActionGroupAlignments = quickActionGroupAlignClassMap;
export const floatingQuickActionPositions = floatingQuickActionPositionClassMap;
export const quickActionGridColumns = quickActionGridColumnsClassMap;
