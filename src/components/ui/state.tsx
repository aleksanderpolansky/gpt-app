import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type StatePanelTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type StatePanelSize = "sm" | "md" | "lg";

const statePanelToneClassMap: Record<StatePanelTone, string> = {
  neutral: "border-[rgba(0,0,0,0.06)] bg-white text-[#1a1d2e]",
  primary: "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#1a1d2e]",
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

const statePanelIconClassMap: Record<StatePanelTone, string> = {
  neutral: "bg-[#f0f2f7] text-[#7c8099]",
  primary: "bg-[#eef2ff] text-[#3b6ef8]",
  success: "bg-[rgba(34,197,94,0.12)] text-[#16803d]",
  warning: "bg-[rgba(249,115,22,0.12)] text-[#b45309]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[#b91c1c]",
  violet: "bg-[rgba(139,92,246,0.12)] text-[#6d28d9]",
  cyan: "bg-[rgba(6,182,212,0.12)] text-[#0891b2]",
};

const statePanelSizeClassMap: Record<StatePanelSize, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const statePanelIconSizeClassMap: Record<StatePanelSize, string> = {
  sm: "h-10 w-10 text-[18px]",
  md: "h-12 w-12 text-[22px]",
  lg: "h-14 w-14 text-[26px]",
};

const statePanelTitleSizeClassMap: Record<StatePanelSize, string> = {
  sm: "text-[14px]",
  md: "text-[16px]",
  lg: "text-[18px]",
};

function EmptyStateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M5 7.75A2.75 2.75 0 0 1 7.75 5h8.5A2.75 2.75 0 0 1 19 7.75v8.5A2.75 2.75 0 0 1 16.25 19h-8.5A2.75 2.75 0 0 1 5 16.25v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.25 10.25h7.5M8.25 13.75h4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ErrorStateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 8.25v4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M12 16h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <path
        d="M10.2 4.9 3.9 16.1A2.6 2.6 0 0 0 6.15 20h11.7a2.6 2.6 0 0 0 2.25-3.9L13.8 4.9a2.08 2.08 0 0 0-3.6 0Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function NoRightsStateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M7.75 10V8.25a4.25 4.25 0 0 1 8.5 0V10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.75 10h10.5A1.75 1.75 0 0 1 19 11.75v6A1.75 1.75 0 0 1 17.25 19.5H6.75A1.75 1.75 0 0 1 5 17.75v-6A1.75 1.75 0 0 1 6.75 10Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export interface StatePanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  tone?: StatePanelTone;
  size?: StatePanelSize;
  centered?: boolean;
  compact?: boolean;
}

export function StatePanel({
  title,
  description,
  icon,
  action,
  secondaryAction,
  footer,
  children,
  tone = "neutral",
  size = "md",
  centered = true,
  compact = false,
  className,
  ...props
}: StatePanelProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-xl border shadow-sm",
        statePanelToneClassMap[tone],
        statePanelSizeClassMap[size],
        compact && "p-4",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-2xl",
            statePanelIconClassMap[tone],
            statePanelIconSizeClassMap[size],
          )}
        >
          {icon}
        </div>
      ) : null}

      <div className={cn("min-w-0", Boolean(icon) ? "mt-3" : undefined)}>
        <div
          className={cn(
            "font-semibold leading-[1.25] tracking-[-0.015em] text-[#1a1d2e]",
            statePanelTitleSizeClassMap[size],
          )}
        >
          {title}
        </div>

        {description ? (
          <div className="mt-1 max-w-xl text-[12px] leading-[1.5] text-[#7c8099]">
            {description}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-4 min-w-0 w-full">{children}</div> : null}

      {(action || secondaryAction) ? (
        <div
          className={cn(
            "mt-4 flex min-w-0 flex-wrap items-center gap-2",
            centered ? "justify-center" : "justify-start",
          )}
        >
          {action}
          {secondaryAction}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-3 max-w-xl text-[11px] leading-[1.4] text-[#9ca3b8]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export interface EmptyStateProps
  extends Omit<StatePanelProps, "tone" | "icon"> {
  tone?: Extract<StatePanelTone, "neutral" | "primary" | "violet" | "cyan">;
  icon?: ReactNode;
}

export function EmptyState({
  title = "No data yet",
  description = "There is nothing to show here yet.",
  tone = "neutral",
  icon = <EmptyStateIcon />,
  ...props
}: EmptyStateProps) {
  return (
    <StatePanel
      title={title}
      description={description}
      tone={tone}
      icon={icon}
      {...props}
    />
  );
}

export interface ErrorStateProps
  extends Omit<StatePanelProps, "tone" | "icon"> {
  tone?: Extract<StatePanelTone, "danger" | "warning">;
  icon?: ReactNode;
  errorCode?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "The requested operation could not be completed.",
  tone = "danger",
  icon = <ErrorStateIcon />,
  errorCode,
  footer,
  ...props
}: ErrorStateProps) {
  return (
    <StatePanel
      title={title}
      description={description}
      tone={tone}
      icon={icon}
      footer={footer ?? errorCode}
      {...props}
    />
  );
}

export interface NoRightsStateProps
  extends Omit<StatePanelProps, "tone" | "icon"> {
  tone?: Extract<StatePanelTone, "warning" | "danger" | "neutral">;
  icon?: ReactNode;
  requiredRole?: ReactNode;
}

export function NoRightsState({
  title = "No access rights",
  description = "You do not have permission to view or change this section.",
  tone = "warning",
  icon = <NoRightsStateIcon />,
  requiredRole,
  footer,
  ...props
}: NoRightsStateProps) {
  return (
    <StatePanel
      title={title}
      description={description}
      tone={tone}
      icon={icon}
      footer={footer ?? requiredRole}
      {...props}
    />
  );
}

export interface LoadingStateProps
  extends Omit<StatePanelProps, "tone" | "icon"> {
  tone?: Extract<StatePanelTone, "neutral" | "primary" | "violet">;
}

export function LoadingState({
  title = "Loading",
  description = "Please wait while the data is being prepared.",
  tone = "primary",
  ...props
}: LoadingStateProps) {
  return (
    <StatePanel
      title={title}
      description={description}
      tone={tone}
      icon={
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      }
      {...props}
    />
  );
}

export interface StateListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
}

const stateListGapClassMap: Record<NonNullable<StateListProps["gap"]>, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

export function StateList({
  children,
  gap = "md",
  className,
  ...props
}: StateListProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        stateListGapClassMap[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const statePanelTones = statePanelToneClassMap;
export const statePanelIcons = statePanelIconClassMap;
export const statePanelSizes = statePanelSizeClassMap;
export const statePanelIconSizes = statePanelIconSizeClassMap;
export const statePanelTitleSizes = statePanelTitleSizeClassMap;
export const stateListGaps = stateListGapClassMap;

