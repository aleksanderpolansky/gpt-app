import type { HTMLAttributes, ReactNode } from "react";

import { clampNumber, cn } from "./utils";

export type ProgressRingTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan"
  | "orange";

export type ProgressRingSize = "sm" | "md" | "lg" | "xl";

const progressRingToneClassMap: Record<ProgressRingTone, string> = {
  neutral: "text-[#7c8099]",
  primary: "text-[#3b6ef8]",
  success: "text-[#22c55e]",
  warning: "text-[#f97316]",
  danger: "text-[#ef4444]",
  violet: "text-[#8b5cf6]",
  cyan: "text-[#06b6d4]",
  orange: "text-[#f97316]",
};

const progressRingTrackClassMap: Record<ProgressRingTone, string> = {
  neutral: "stroke-[#f0f2f7]",
  primary: "stroke-[#eef2ff]",
  success: "stroke-[rgba(34,197,94,0.12)]",
  warning: "stroke-[rgba(249,115,22,0.12)]",
  danger: "stroke-[rgba(239,68,68,0.12)]",
  violet: "stroke-[rgba(139,92,246,0.12)]",
  cyan: "stroke-[rgba(6,182,212,0.12)]",
  orange: "stroke-[rgba(249,115,22,0.12)]",
};

const progressRingSizeMap: Record<
  ProgressRingSize,
  { size: number; strokeWidth: number; valueText: string; labelText: string }
> = {
  sm: {
    size: 48,
    strokeWidth: 5,
    valueText: "text-[11px]",
    labelText: "text-[9px]",
  },
  md: {
    size: 64,
    strokeWidth: 6,
    valueText: "text-[14px]",
    labelText: "text-[10px]",
  },
  lg: {
    size: 80,
    strokeWidth: 7,
    valueText: "text-[18px]",
    labelText: "text-[11px]",
  },
  xl: {
    size: 112,
    strokeWidth: 9,
    valueText: "text-[24px]",
    labelText: "text-[12px]",
  },
};

function normalizeProgressValue(value: number, max: number): number {
  if (max <= 0 || Number.isNaN(max)) {
    return 0;
  }

  const rawPercent = value > 1 && max === 1 ? value : (value / max) * 100;

  return clampNumber(rawPercent, 0, 100);
}

export interface ProgressRingProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: ProgressRingTone;
  size?: ProgressRingSize;
  label?: ReactNode;
  center?: ReactNode;
  showValue?: boolean;
  suffix?: ReactNode;
  trackLabel?: string;
  progressLabel?: string;
}

export function ProgressRing({
  value,
  max = 100,
  tone = "primary",
  size = "md",
  label,
  center,
  showValue = true,
  suffix = "%",
  trackLabel = "Progress track",
  progressLabel = "Progress value",
  className,
  ...props
}: ProgressRingProps) {
  const config = progressRingSizeMap[size];
  const normalized = normalizeProgressValue(value, max);
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;
  const roundedValue = Math.round(normalized);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: config.size, height: config.size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedValue}
      {...props}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
      >
        <circle
          className={progressRingTrackClassMap[tone]}
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          strokeWidth={config.strokeWidth}
        />

        <circle
          className={cn(
            "stroke-current transition-[stroke-dashoffset] duration-300 ease-out",
            progressRingToneClassMap[tone],
          )}
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          strokeLinecap="round"
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />

        <title>{progressLabel}</title>
        <desc>
          {trackLabel}: {roundedValue}
          {suffix}
        </desc>
      </svg>

      <span className="relative z-10 flex min-w-0 flex-col items-center justify-center px-1 text-center">
        {center ?? (
          <>
            {showValue ? (
              <span
                className={cn(
                  "font-semibold leading-none tracking-[-0.03em]",
                  config.valueText,
                  progressRingToneClassMap[tone],
                )}
              >
                {roundedValue}
                {suffix}
              </span>
            ) : null}

            {label ? (
              <span
                className={cn(
                  "mt-0.5 max-w-full truncate font-medium leading-none text-[#7c8099]",
                  config.labelText,
                )}
              >
                {label}
              </span>
            ) : null}
          </>
        )}
      </span>
    </div>
  );
}

export interface ProgressRingCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  value: number;
  max?: number;
  tone?: ProgressRingTone;
  size?: ProgressRingSize;
  description?: ReactNode;
  footer?: ReactNode;
  ringLabel?: ReactNode;
}

export function ProgressRingCard({
  title,
  value,
  max = 100,
  tone = "primary",
  size = "lg",
  description,
  footer,
  ringLabel,
  className,
  ...props
}: ProgressRingCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-4 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm",
        className,
      )}
      {...props}
    >
      <ProgressRing value={value} max={max} tone={tone} size={size} label={ringLabel} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-[1.3] text-[#1a1d2e]">
          {title}
        </div>

        {description ? (
          <div className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[#7c8099]">
            {description}
          </div>
        ) : null}

        {footer ? (
          <div className="mt-2 truncate text-[11px] font-medium text-[#9ca3b8]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ProgressRingGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  align?: "start" | "center" | "end";
}

const progressRingGroupGapClassMap: Record<
  NonNullable<ProgressRingGroupProps["gap"]>,
  string
> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const progressRingGroupAlignClassMap: Record<
  NonNullable<ProgressRingGroupProps["align"]>,
  string
> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export function ProgressRingGroup({
  children,
  gap = "md",
  align = "center",
  className,
  ...props
}: ProgressRingGroupProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap",
        progressRingGroupGapClassMap[gap],
        progressRingGroupAlignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface LinearProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: ProgressRingTone;
  label?: ReactNode;
  showValue?: boolean;
}

const linearProgressToneClassMap: Record<ProgressRingTone, string> = {
  neutral: "bg-[#7c8099]",
  primary: "bg-[#3b6ef8]",
  success: "bg-[#22c55e]",
  warning: "bg-[#f97316]",
  danger: "bg-[#ef4444]",
  violet: "bg-[#8b5cf6]",
  cyan: "bg-[#06b6d4]",
  orange: "bg-[#f97316]",
};

export function LinearProgress({
  value,
  max = 100,
  tone = "primary",
  label,
  showValue = true,
  className,
  ...props
}: LinearProgressProps) {
  const normalized = normalizeProgressValue(value, max);
  const roundedValue = Math.round(normalized);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      {(label || showValue) ? (
        <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] font-medium text-[#7c8099]">
          <span className="truncate">{label}</span>

          {showValue ? (
            <span className="shrink-0 tabular-nums">{roundedValue}%</span>
          ) : null}
        </div>
      ) : null}

      <div className="h-2 overflow-hidden rounded-full bg-[#f0f2f7]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            linearProgressToneClassMap[tone],
          )}
          style={{ width: `${roundedValue}%` }}
        />
      </div>
    </div>
  );
}

export const progressRingTones = progressRingToneClassMap;
export const progressRingTracks = progressRingTrackClassMap;
export const progressRingSizes = progressRingSizeMap;
export const progressRingGroupGaps = progressRingGroupGapClassMap;
export const progressRingGroupAlignments = progressRingGroupAlignClassMap;
export const linearProgressTones = linearProgressToneClassMap;

