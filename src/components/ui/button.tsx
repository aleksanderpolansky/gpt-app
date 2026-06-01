import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning"
  | "violet";

export type ButtonSize = "sm" | "md" | "lg" | "icon";
export type ButtonRadius = "lg" | "xl" | "full";

const buttonVariantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border border-[#3b6ef8] bg-[#3b6ef8] text-white shadow-sm hover:bg-[#315fe0] hover:border-[#315fe0]",
  secondary:
    "border border-[rgba(0,0,0,0.08)] bg-white text-[#1a1d2e] shadow-sm hover:bg-[#f5f6fb]",
  ghost:
    "border border-transparent bg-transparent text-[#4a4f6a] hover:bg-[#f5f6fb] hover:text-[#1a1d2e]",
  danger:
    "border border-[#ef4444] bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626] hover:border-[#dc2626]",
  success:
    "border border-[#22c55e] bg-[#22c55e] text-white shadow-sm hover:bg-[#16a34a] hover:border-[#16a34a]",
  warning:
    "border border-[#f97316] bg-[#f97316] text-white shadow-sm hover:bg-[#ea580c] hover:border-[#ea580c]",
  violet:
    "border border-[#8b5cf6] bg-[#8b5cf6] text-white shadow-sm hover:bg-[#7c3aed] hover:border-[#7c3aed]",
};

const buttonSizeClassMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-3.5 text-[12.5px]",
  lg: "h-10 px-4 text-[14px]",
  icon: "h-8 w-8 p-0 text-[12.5px]",
};

const buttonRadiusClassMap: Record<ButtonRadius, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  radius = "lg",
  leftIcon,
  rightIcon,
  isLoading = false,
  loadingLabel = "Загрузка...",
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const iconOnly = size === "icon";
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        buttonVariantClassMap[variant],
        buttonSizeClassMap[size],
        buttonRadiusClassMap[radius],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? <LoadingSpinner /> : leftIcon ? <span className="inline-flex shrink-0">{leftIcon}</span> : null}

      {iconOnly ? (
        isLoading ? null : children
      ) : (
        <span className="inline-flex min-w-0 items-center justify-center truncate">
          {isLoading ? loadingLabel : children}
        </span>
      )}

      {!isLoading && !iconOnly && rightIcon ? (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      ) : null}
    </button>
  );
}

export type ActionButtonTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet";

const actionButtonToneClassMap: Record<ActionButtonTone, string> = {
  default:
    "border-[rgba(0,0,0,0.06)] bg-white text-[#1a1d2e] hover:bg-[#f5f6fb]",
  primary:
    "border-[rgba(59,110,248,0.18)] bg-[#eef2ff] text-[#3b6ef8] hover:bg-[#e4eaff]",
  success:
    "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.10)] text-[#16803d] hover:bg-[rgba(34,197,94,0.16)]",
  warning:
    "border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.10)] text-[#b45309] hover:bg-[rgba(249,115,22,0.16)]",
  danger:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.10)] text-[#b91c1c] hover:bg-[rgba(239,68,68,0.16)]",
  violet:
    "border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.10)] text-[#6d28d9] hover:bg-[rgba(139,92,246,0.16)]",
};

export interface ActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  active?: boolean;
  tone?: ActionButtonTone;
  fullWidth?: boolean;
}

export function ActionButton({
  icon,
  label,
  description,
  badge,
  active = false,
  tone = "default",
  fullWidth = false,
  className,
  disabled,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        "group inline-flex min-h-10 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        actionButtonToneClassMap[tone],
        active && "border-[#3b6ef8] bg-[#eef2ff] text-[#3b6ef8]",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-current shadow-sm">
          {icon}
        </span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-semibold leading-[1.25]">
          {label}
        </span>

        {description ? (
          <span className="line-clamp-2 text-[11px] leading-[1.35] opacity-75">
            {description}
          </span>
        ) : null}
      </span>

      {badge ? <span className="ml-auto shrink-0">{badge}</span> : null}
    </button>
  );
}

export const buttonVariants = buttonVariantClassMap;
export const buttonSizes = buttonSizeClassMap;
export const buttonRadii = buttonRadiusClassMap;
export const actionButtonTones = actionButtonToneClassMap;
