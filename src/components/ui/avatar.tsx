import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type IconBoxTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan"
  | "muted";

export type IconBoxSize = "sm" | "md" | "lg";
export type IconBoxRadius = "lg" | "xl" | "full";

const iconBoxToneClassMap: Record<IconBoxTone, string> = {
  default: "bg-white text-[#1a1d2e] border-[rgba(0,0,0,0.06)]",
  primary: "bg-[#eef2ff] text-[#3b6ef8] border-[rgba(59,110,248,0.18)]",
  success:
    "bg-[rgba(34,197,94,0.10)] text-[#16803d] border-[rgba(34,197,94,0.18)]",
  warning:
    "bg-[rgba(249,115,22,0.10)] text-[#b45309] border-[rgba(249,115,22,0.18)]",
  danger:
    "bg-[rgba(239,68,68,0.10)] text-[#b91c1c] border-[rgba(239,68,68,0.18)]",
  violet:
    "bg-[rgba(139,92,246,0.10)] text-[#6d28d9] border-[rgba(139,92,246,0.18)]",
  cyan:
    "bg-[rgba(6,182,212,0.10)] text-[#0891b2] border-[rgba(6,182,212,0.18)]",
  muted: "bg-[#f5f6fb] text-[#7c8099] border-[rgba(0,0,0,0.06)]",
};

const iconBoxSizeClassMap: Record<IconBoxSize, string> = {
  sm: "h-7 w-7 text-[13px]",
  md: "h-8 w-8 text-[14px]",
  lg: "h-10 w-10 text-[16px]",
};

const iconBoxRadiusClassMap: Record<IconBoxRadius, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export interface IconBoxProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: IconBoxTone;
  size?: IconBoxSize;
  radius?: IconBoxRadius;
  bordered?: boolean;
  children: ReactNode;
}

export function IconBox({
  tone = "primary",
  size = "md",
  radius = "lg",
  bordered = false,
  className,
  children,
  ...props
}: IconBoxProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        bordered && "border",
        iconBoxToneClassMap[tone],
        iconBoxSizeClassMap[size],
        iconBoxRadiusClassMap[radius],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan"
  | "neutral";

const avatarSizeClassMap: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-[13px]",
};

const avatarToneClassMap: Record<AvatarTone, string> = {
  primary: "from-[#3b6ef8] to-[#6f42f5] text-white",
  success: "from-[#22c55e] to-[#16a34a] text-white",
  warning: "from-[#f97316] to-[#ea580c] text-white",
  danger: "from-[#ef4444] to-[#dc2626] text-white",
  violet: "from-[#8b5cf6] to-[#6d28d9] text-white",
  cyan: "from-[#06b6d4] to-[#0891b2] text-white",
  neutral: "from-[#9ca3b8] to-[#7c8099] text-white",
};

export type AvatarStatus = "online" | "busy" | "away" | "offline";

const avatarStatusClassMap: Record<AvatarStatus, string> = {
  online: "bg-[#22c55e]",
  busy: "bg-[#ef4444]",
  away: "bg-[#f97316]",
  offline: "bg-[#9ca3b8]",
};

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  initials?: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  status?: AvatarStatus;
  imageProps?: Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "alt" | "className"
  >;
}

function getInitials(name?: string, fallback?: string): string {
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim().slice(0, 3).toUpperCase();
  }

  if (!name || name.trim().length === 0) {
    return "AI";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AI";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

export function Avatar({
  name,
  initials,
  src,
  alt,
  size = "md",
  tone = "primary",
  status,
  imageProps,
  className,
  ...props
}: AvatarProps) {
  const computedInitials = getInitials(name, initials);
  const accessibleLabel = alt ?? name ?? computedInitials;

  return (
    <div
      className={cn("relative inline-flex shrink-0", avatarSizeClassMap[size])}
      title={name}
      {...props}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold leading-none shadow-sm",
          avatarToneClassMap[tone],
          className,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={accessibleLabel}
            className="h-full w-full object-cover"
            {...imageProps}
          />
        ) : (
          <span aria-label={accessibleLabel}>{computedInitials}</span>
        )}
      </div>

      {status ? (
        <span
          aria-label={status}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
            avatarStatusClassMap[status],
          )}
        />
      ) : null}
    </div>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  overlap?: "sm" | "md";
}

const avatarGroupOverlapClassMap: Record<
  NonNullable<AvatarGroupProps["overlap"]>,
  string
> = {
  sm: "-space-x-1.5",
  md: "-space-x-2",
};

export function AvatarGroup({
  children,
  overlap = "md",
  className,
  ...props
}: AvatarGroupProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        avatarGroupOverlapClassMap[overlap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface UserBadgeProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  description?: ReactNode;
  src?: string;
  initials?: string;
  status?: AvatarStatus;
  avatarTone?: AvatarTone;
  compact?: boolean;
}

export function UserBadge({
  name,
  description,
  src,
  initials,
  status,
  avatarTone = "primary",
  compact = false,
  className,
  ...props
}: UserBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-[#f5f6fb]",
        className,
      )}
      {...props}
    >
      <Avatar
        name={name}
        src={src}
        initials={initials}
        status={status}
        tone={avatarTone}
        size={compact ? "sm" : "md"}
      />

      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold leading-[1.25] text-[#1a1d2e]">
          {name}
        </span>

        {!compact && description ? (
          <span className="block truncate text-[11px] leading-[1.35] text-[#7c8099]">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export const iconBoxTones = iconBoxToneClassMap;
export const iconBoxSizes = iconBoxSizeClassMap;
export const iconBoxRadii = iconBoxRadiusClassMap;
export const avatarSizes = avatarSizeClassMap;
export const avatarTones = avatarToneClassMap;
export const avatarStatuses = avatarStatusClassMap;
