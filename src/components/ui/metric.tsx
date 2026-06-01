import type { HTMLAttributes, ReactNode } from "react";

import { Badge } from "./badge";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "./utils";

export type MetricTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type MetricSize = "sm" | "md" | "lg";
export type MetricTrendDirection = "up" | "down" | "flat";

const metricToneClassMap: Record<MetricTone, string> = {
  neutral: "text-[#1a1d2e]",
  primary: "text-[#3b6ef8]",
  success: "text-[#22c55e]",
  warning: "text-[#f97316]",
  danger: "text-[#ef4444]",
  violet: "text-[#8b5cf6]",
  cyan: "text-[#06b6d4]",
};

const metricAccentClassMap: Record<MetricTone, string> = {
  neutral: "bg-[#7c8099]",
  primary: "bg-[#3b6ef8]",
  success: "bg-[#22c55e]",
  warning: "bg-[#f97316]",
  danger: "bg-[#ef4444]",
  violet: "bg-[#8b5cf6]",
  cyan: "bg-[#06b6d4]",
};

const metricIconClassMap: Record<MetricTone, string> = {
  neutral:
    "border-[rgba(0,0,0,0.06)] bg-[#f0f2f7] text-[#7c8099]",
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

const metricSizeClassMap: Record<MetricSize, string> = {
  sm: "text-[18px] leading-[1.15]",
  md: "text-[22px] leading-[1.15]",
  lg: "text-[28px] leading-[1.1]",
};

const metricTrendToneClassMap: Record<MetricTrendDirection, MetricTone> = {
  up: "success",
  down: "danger",
  flat: "neutral",
};

function formatMetricValue(value: ReactNode): ReactNode {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 1,
    }).format(value);
  }

  return value;
}

export interface MetricTrend {
  direction?: MetricTrendDirection;
  value?: ReactNode;
  label?: ReactNode;
}

export interface MetricWidgetProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  size?: MetricSize;
  trend?: MetricTrend;
  footer?: ReactNode;
  loading?: boolean;
  compact?: boolean;
}

export function MetricWidget({
  label,
  value,
  unit,
  description,
  icon,
  tone = "primary",
  size = "md",
  trend,
  footer,
  loading = false,
  compact = false,
  className,
  ...props
}: MetricWidgetProps) {
  const trendTone = metricTrendToneClassMap[trend?.direction ?? "flat"];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-sm",
        compact ? "p-3" : "p-4",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7c8099]">
            {label}
          </div>

          {description ? (
            <div className="mt-1 line-clamp-2 text-[11px] leading-[1.35] text-[#9ca3b8]">
              {description}
            </div>
          ) : null}
        </div>

        {icon ? (
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
              metricIconClassMap[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-end gap-1.5">
        {loading ? (
          <span className="h-7 w-24 animate-pulse rounded-md bg-[#f0f2f7]" />
        ) : (
          <>
            <span
              className={cn(
                "truncate font-semibold tracking-[-0.03em]",
                metricSizeClassMap[size],
                metricToneClassMap[tone],
              )}
            >
              {formatMetricValue(value)}
            </span>

            {unit ? (
              <span className="pb-0.5 text-[12px] font-semibold text-[#7c8099]">
                {unit}
              </span>
            ) : null}
          </>
        )}
      </div>

      {trend || footer ? (
        <div className="flex min-w-0 items-center justify-between gap-2 pt-1">
          {trend ? (
            <Badge variant={trendTone === "success" ? "green" : trendTone === "danger" ? "red" : "neutral"} size="xs">
              {trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→"}{" "}
              {trend.value ?? trend.label}
            </Badge>
          ) : (
            <span />
          )}

          {footer ? (
            <span className="truncate text-[11px] font-medium text-[#7c8099]">
              {footer}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface KpiCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: MetricTone;
  trend?: MetricTrend;
  progress?: number;
  progressLabel?: ReactNode;
  status?: ReactNode;
  loading?: boolean;
  selected?: boolean;
}

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  description,
  icon,
  action,
  tone = "primary",
  trend,
  progress,
  progressLabel,
  status,
  loading = false,
  selected = false,
  className,
  ...props
}: KpiCardProps) {
  const normalizedProgress =
    typeof progress === "number"
      ? Math.min(Math.max(progress > 1 ? progress : progress * 100, 0), 100)
      : null;

  return (
    <Card
      selected={selected}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          metricAccentClassMap[tone],
        )}
      />

      <CardHeader
        title={title}
        description={subtitle}
        action={
          <div className="flex items-center gap-2">
            {status}
            {action}
          </div>
        }
        className="pl-1"
      />

      <CardContent className="flex flex-col gap-3 pl-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-end gap-1.5">
              {loading ? (
                <span className="h-8 w-28 animate-pulse rounded-md bg-[#f0f2f7]" />
              ) : (
                <>
                  <span
                    className={cn(
                      "truncate text-[28px] font-semibold leading-[1.1] tracking-[-0.03em]",
                      metricToneClassMap[tone],
                    )}
                  >
                    {formatMetricValue(value)}
                  </span>

                  {unit ? (
                    <span className="pb-0.5 text-[12px] font-semibold text-[#7c8099]">
                      {unit}
                    </span>
                  ) : null}
                </>
              )}
            </div>

            {description ? (
              <div className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[#7c8099]">
                {description}
              </div>
            ) : null}
          </div>

          {icon ? (
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                metricIconClassMap[tone],
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>

        {normalizedProgress !== null ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#7c8099]">
              <span className="truncate">{progressLabel ?? "Progress"}</span>
              <span className="tabular-nums">{Math.round(normalizedProgress)}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#f0f2f7]">
              <div
                className={cn("h-full rounded-full", metricAccentClassMap[tone])}
                style={{ width: `${normalizedProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {trend ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Badge
              variant={
                (trend.direction ?? "flat") === "up"
                  ? "green"
                  : (trend.direction ?? "flat") === "down"
                    ? "red"
                    : "neutral"
              }
              size="xs"
            >
              {(trend.direction ?? "flat") === "up"
                ? "↗"
                : (trend.direction ?? "flat") === "down"
                  ? "↘"
                  : "→"}{" "}
              {trend.value ?? trend.label}
            </Badge>

            {trend.label && trend.value ? (
              <span className="truncate text-[11px] font-medium text-[#7c8099]">
                {trend.label}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface MetricGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

const metricGridColumnsClassMap: Record<NonNullable<MetricGridProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function MetricGrid({
  children,
  columns = 4,
  className,
  ...props
}: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3",
        metricGridColumnsClassMap[columns],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface MiniMetricProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  tone?: MetricTone;
}

export function MiniMetric({
  label,
  value,
  tone = "neutral",
  className,
  ...props
}: MiniMetricProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[#f5f6fb] px-2.5 py-2",
        className,
      )}
      {...props}
    >
      <span className="truncate text-[11px] font-medium text-[#7c8099]">
        {label}
      </span>

      <span
        className={cn(
          "shrink-0 text-[12.5px] font-semibold tabular-nums",
          metricToneClassMap[tone],
        )}
      >
        {formatMetricValue(value)}
      </span>
    </div>
  );
}

export const metricTones = metricToneClassMap;
export const metricAccents = metricAccentClassMap;
export const metricIcons = metricIconClassMap;
export const metricSizes = metricSizeClassMap;
export const metricTrendTones = metricTrendToneClassMap;

