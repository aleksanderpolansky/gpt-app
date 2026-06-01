import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import { Badge } from "./badge";
import { cn } from "./utils";

export type NavItemTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type NavItemSize = "sm" | "md";
export type NavItemDensity = "compact" | "comfortable";

const navItemToneClassMap: Record<NavItemTone, string> = {
  default:
    "text-[#4a4f6a] hover:bg-[#f5f6fb] hover:text-[#1a1d2e]",
  primary:
    "text-[#3b6ef8] hover:bg-[#eef2ff]",
  success:
    "text-[#16803d] hover:bg-[rgba(34,197,94,0.10)]",
  warning:
    "text-[#b45309] hover:bg-[rgba(249,115,22,0.10)]",
  danger:
    "text-[#b91c1c] hover:bg-[rgba(239,68,68,0.10)]",
  violet:
    "text-[#6d28d9] hover:bg-[rgba(139,92,246,0.10)]",
  cyan:
    "text-[#0891b2] hover:bg-[rgba(6,182,212,0.10)]",
};

const navItemActiveToneClassMap: Record<NavItemTone, string> = {
  default: "bg-[#f5f6fb] text-[#1a1d2e]",
  primary: "bg-[#eef2ff] text-[#3b6ef8]",
  success: "bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  warning: "bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  danger: "bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
  violet: "bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  cyan: "bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
};

const navItemSizeClassMap: Record<NavItemSize, string> = {
  sm: "min-h-8 px-2 text-[12px]",
  md: "min-h-9 px-2.5 text-[12.5px]",
};

const navItemDensityClassMap: Record<NavItemDensity, string> = {
  compact: "gap-1.5",
  comfortable: "gap-2",
};

export interface NavItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  rightSlot?: ReactNode;
  active?: boolean;
  tone?: NavItemTone;
  navSize?: NavItemSize;
  density?: NavItemDensity;
  depth?: 0 | 1 | 2 | 3;
  collapsed?: boolean;
}

const navItemDepthPaddingClassMap: Record<NonNullable<NavItemProps["depth"]>, string> = {
  0: "",
  1: "pl-5",
  2: "pl-8",
  3: "pl-11",
};

export function NavItem({
  icon,
  label,
  description,
  badge,
  rightSlot,
  active = false,
  tone = "default",
  navSize = "md",
  density = "comfortable",
  depth = 0,
  collapsed = false,
  className,
  disabled,
  type = "button",
  ...props
}: NavItemProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full min-w-0 items-center rounded-xl text-left font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        navItemSizeClassMap[navSize],
        navItemDensityClassMap[density],
        navItemDepthPaddingClassMap[depth],
        active ? navItemActiveToneClassMap[tone] : navItemToneClassMap[tone],
        collapsed && "justify-center px-2",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-current">
          {icon}
        </span>
      ) : null}

      {!collapsed ? (
        <>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate leading-[1.25]">{label}</span>

            {description ? (
              <span className="line-clamp-1 text-[11px] font-medium leading-[1.25] opacity-65">
                {description}
              </span>
            ) : null}
          </span>

          {badge ? <span className="shrink-0">{badge}</span> : null}
          {rightSlot ? <span className="shrink-0">{rightSlot}</span> : null}
        </>
      ) : null}
    </button>
  );
}

export interface NavGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
}

export function NavGroup({
  title,
  action,
  children,
  collapsed = false,
  className,
  ...props
}: NavGroupProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>
      {(title || action) && !collapsed ? (
        <div className="flex min-h-7 items-center justify-between gap-2 px-2">
          {title ? (
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ca3b8]">
              {title}
            </div>
          ) : null}

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

export interface NavBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  value: ReactNode;
  tone?: "neutral" | "blue" | "green" | "orange" | "red" | "violet" | "cyan";
}

const navBadgeToneToBadgeVariantMap: Record<
  NonNullable<NavBadgeProps["tone"]>,
  "neutral" | "blue" | "green" | "orange" | "red" | "violet" | "cyan"
> = {
  neutral: "neutral",
  blue: "blue",
  green: "green",
  orange: "orange",
  red: "red",
  violet: "violet",
  cyan: "cyan",
};

export function NavBadge({
  value,
  tone = "neutral",
  className,
  ...props
}: NavBadgeProps) {
  return (
    <Badge
      variant={navBadgeToneToBadgeVariantMap[tone]}
      size="xs"
      className={className}
      {...props}
    >
      {value}
    </Badge>
  );
}

export type TreeNodeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export interface TreeNodeProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  rightSlot?: ReactNode;
  depth?: 0 | 1 | 2 | 3 | 4;
  active?: boolean;
  selected?: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  tone?: TreeNodeTone;
}

const treeNodeDepthPaddingClassMap: Record<NonNullable<TreeNodeProps["depth"]>, string> = {
  0: "pl-2",
  1: "pl-5",
  2: "pl-8",
  3: "pl-11",
  4: "pl-14",
};

const treeNodeToneClassMap: Record<TreeNodeTone, string> = {
  default: "text-[#4a4f6a] hover:bg-[#f5f6fb] hover:text-[#1a1d2e]",
  primary: "text-[#3b6ef8] hover:bg-[#eef2ff]",
  success: "text-[#16803d] hover:bg-[rgba(34,197,94,0.10)]",
  warning: "text-[#b45309] hover:bg-[rgba(249,115,22,0.10)]",
  danger: "text-[#b91c1c] hover:bg-[rgba(239,68,68,0.10)]",
  violet: "text-[#6d28d9] hover:bg-[rgba(139,92,246,0.10)]",
  cyan: "text-[#0891b2] hover:bg-[rgba(6,182,212,0.10)]",
};

const treeNodeActiveToneClassMap: Record<TreeNodeTone, string> = {
  default: "bg-[#f5f6fb] text-[#1a1d2e]",
  primary: "bg-[#eef2ff] text-[#3b6ef8]",
  success: "bg-[rgba(34,197,94,0.10)] text-[#16803d]",
  warning: "bg-[rgba(249,115,22,0.10)] text-[#b45309]",
  danger: "bg-[rgba(239,68,68,0.10)] text-[#b91c1c]",
  violet: "bg-[rgba(139,92,246,0.10)] text-[#6d28d9]",
  cyan: "bg-[rgba(6,182,212,0.10)] text-[#0891b2]",
};

function TreeChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#9ca3b8] transition-transform",
        expanded && "rotate-90",
      )}
    >
      ›
    </span>
  );
}

export function TreeNode({
  label,
  description,
  icon,
  badge,
  rightSlot,
  depth = 0,
  active = false,
  selected = false,
  expanded = false,
  hasChildren = false,
  tone = "default",
  className,
  disabled,
  type = "button",
  ...props
}: TreeNodeProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-lg pr-2 text-left text-[12px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        treeNodeDepthPaddingClassMap[depth],
        active || selected ? treeNodeActiveToneClassMap[tone] : treeNodeToneClassMap[tone],
        selected && "ring-1 ring-[#3b6ef8]/20",
        className,
      )}
      {...props}
    >
      {hasChildren ? <TreeChevron expanded={expanded} /> : <span className="h-4 w-4 shrink-0" />}

      {icon ? (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-current">
          {icon}
        </span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate leading-[1.25]">{label}</span>

        {description ? (
          <span className="line-clamp-1 text-[10px] font-medium leading-[1.25] opacity-65">
            {description}
          </span>
        ) : null}
      </span>

      {badge ? <span className="shrink-0">{badge}</span> : null}
      {rightSlot ? <span className="shrink-0">{rightSlot}</span> : null}
    </button>
  );
}

export interface TreeNodeGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  expanded?: boolean;
  indent?: boolean;
}

export function TreeNodeGroup({
  children,
  expanded = true,
  indent = false,
  className,
  ...props
}: TreeNodeGroupProps) {
  if (!expanded) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        indent && "border-l border-[rgba(0,0,0,0.06)] pl-2",
        className,
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

export interface SidebarRailProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  width?: "compact" | "normal" | "wide";
}

const sidebarRailWidthClassMap: Record<
  NonNullable<SidebarRailProps["width"]>,
  string
> = {
  compact: "w-16",
  normal: "w-[240px]",
  wide: "w-[292px]",
};

export function SidebarRail({
  children,
  width = "normal",
  className,
  ...props
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col gap-3 border-r border-[rgba(0,0,0,0.06)] bg-white p-3",
        sidebarRailWidthClassMap[width],
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export interface NavListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: "none" | "sm" | "md";
}

const navListGapClassMap: Record<NonNullable<NavListProps["gap"]>, string> = {
  none: "gap-0",
  sm: "gap-1",
  md: "gap-2",
};

export function NavList({
  children,
  gap = "sm",
  className,
  ...props
}: NavListProps) {
  return (
    <nav
      className={cn("flex min-w-0 flex-col", navListGapClassMap[gap], className)}
      {...props}
    >
      {children}
    </nav>
  );
}

export const navItemTones = navItemToneClassMap;
export const navItemActiveTones = navItemActiveToneClassMap;
export const navItemSizes = navItemSizeClassMap;
export const navItemDensities = navItemDensityClassMap;
export const navItemDepthPaddings = navItemDepthPaddingClassMap;
export const treeNodeTones = treeNodeToneClassMap;
export const treeNodeActiveTones = treeNodeActiveToneClassMap;
export const treeNodeDepthPaddings = treeNodeDepthPaddingClassMap;
export const sidebarRailWidths = sidebarRailWidthClassMap;
export const navListGaps = navListGapClassMap;

