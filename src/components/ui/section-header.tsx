import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "./utils";

export type SectionHeaderSize = "sm" | "md" | "lg";
export type SectionHeaderAlign = "start" | "center" | "between";
export type SectionHeaderTone = "default" | "muted" | "primary";

const sectionHeaderSizeClassMap: Record<SectionHeaderSize, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
};

const sectionHeaderTitleSizeClassMap: Record<SectionHeaderSize, string> = {
  sm: "text-[14px] leading-[1.3]",
  md: "text-[16px] leading-[1.25]",
  lg: "text-[18px] leading-[1.2]",
};

const sectionHeaderAlignClassMap: Record<SectionHeaderAlign, string> = {
  start: "items-start",
  center: "items-center",
  between: "items-start justify-between",
};

const sectionHeaderToneClassMap: Record<SectionHeaderTone, string> = {
  default: "text-[#1a1d2e]",
  muted: "text-[#4a4f6a]",
  primary: "text-[#3b6ef8]",
};

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  size?: SectionHeaderSize;
  align?: SectionHeaderAlign;
  tone?: SectionHeaderTone;
  divided?: boolean;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  meta,
  icon,
  action,
  size = "md",
  align = "between",
  tone = "default",
  divided = false,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3",
        sectionHeaderAlignClassMap[align],
        divided && "border-b border-[rgba(0,0,0,0.06)] pb-3",
        className,
      )}
      {...props}
    >
      <div className={cn("flex min-w-0 flex-1", sectionHeaderSizeClassMap[size])}>
        {icon ? (
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#3b6ef8]">
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7c8099]">
              {eyebrow}
            </div>
          ) : null}

          <div
            className={cn(
              "truncate font-semibold tracking-[-0.015em]",
              sectionHeaderTitleSizeClassMap[size],
              sectionHeaderToneClassMap[tone],
            )}
          >
            {title}
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
      </div>

      {action ? (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  secondaryAction,
  breadcrumbs,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {breadcrumbs ? (
        <div className="min-w-0 text-[11px] font-medium text-[#7c8099]">
          {breadcrumbs}
        </div>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7c8099]">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="m-0 truncate text-[22px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#1a1d2e]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-3xl text-[12.5px] leading-[1.5] text-[#7c8099]">
              {description}
            </p>
          ) : null}
        </div>

        {(action || secondaryAction) ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type ToolbarDensity = "compact" | "comfortable";
export type ToolbarAlign = "start" | "center" | "end" | "between";

const toolbarDensityClassMap: Record<ToolbarDensity, string> = {
  compact: "min-h-9 gap-1.5 p-1.5",
  comfortable: "min-h-11 gap-2 p-2",
};

const toolbarAlignClassMap: Record<ToolbarAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  density?: ToolbarDensity;
  align?: ToolbarAlign;
  wrap?: boolean;
  bordered?: boolean;
  children: ReactNode;
}

export function Toolbar({
  density = "comfortable",
  align = "between",
  wrap = true,
  bordered = true,
  className,
  children,
  ...props
}: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-xl bg-white",
        toolbarDensityClassMap[density],
        toolbarAlignClassMap[align],
        wrap ? "flex-wrap" : "overflow-hidden",
        bordered && "border border-[rgba(0,0,0,0.06)] shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ToolbarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: "start" | "center" | "end";
  grow?: boolean;
}

const toolbarGroupAlignClassMap: Record<
  NonNullable<ToolbarGroupProps["align"]>,
  string
> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

export function ToolbarGroup({
  children,
  align = "start",
  grow = false,
  className,
  ...props
}: ToolbarGroupProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        toolbarGroupAlignClassMap[align],
        grow && "flex-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ToolbarButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  label?: ReactNode;
  count?: ReactNode;
}

export function ToolbarButton({
  active = false,
  icon,
  label,
  count,
  className,
  disabled,
  type = "button",
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6ef8] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-55",
        active
          ? "bg-[#eef2ff] text-[#3b6ef8]"
          : "text-[#4a4f6a] hover:bg-[#f5f6fb] hover:text-[#1a1d2e]",
        className,
      )}
      {...props}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {label ?? children ? (
        <span className="truncate">{label ?? children}</span>
      ) : null}
      {count ? (
        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export interface ToolbarSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

export function ToolbarSeparator({
  orientation = "vertical",
  className,
  ...props
}: ToolbarSeparatorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        orientation === "vertical" ? "h-6 w-px" : "h-px w-full",
        "bg-[rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export interface ToolbarSpacerProps extends HTMLAttributes<HTMLDivElement> {
  minWidth?: string;
}

export function ToolbarSpacer({
  minWidth = "0.5rem",
  className,
  style,
  ...props
}: ToolbarSpacerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("shrink-0 grow", className)}
      style={{ minWidth, ...style }}
      {...props}
    />
  );
}

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: ReactNode;
}

export function Breadcrumbs({
  items,
  separator = "/",
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("min-w-0", className)}
      {...props}
    >
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-1 p-0 text-[11px] font-medium text-[#7c8099]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="inline-flex min-w-0 items-center gap-1">
              {item.href && !isCurrent ? (
                <a
                  href={item.href}
                  className="truncate text-[#7c8099] transition-colors hover:text-[#3b6ef8]"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isCurrent && "font-semibold text-[#1a1d2e]",
                  )}
                >
                  {item.label}
                </span>
              )}

              {!isLast ? (
                <span className="shrink-0 text-[#b0b4c8]">{separator}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const sectionHeaderSizes = sectionHeaderSizeClassMap;
export const sectionHeaderTitleSizes = sectionHeaderTitleSizeClassMap;
export const sectionHeaderAlignments = sectionHeaderAlignClassMap;
export const sectionHeaderTones = sectionHeaderToneClassMap;
export const toolbarDensities = toolbarDensityClassMap;
export const toolbarAlignments = toolbarAlignClassMap;
export const toolbarGroupAlignments = toolbarGroupAlignClassMap;


