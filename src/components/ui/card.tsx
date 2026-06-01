import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type SurfaceTone =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

export type SurfacePadding = "none" | "sm" | "md" | "lg";
export type SurfaceRadius = "lg" | "xl" | "2xl";
export type SurfaceShadow = "none" | "sm" | "card" | "panel";

const surfaceToneClassMap: Record<SurfaceTone, string> = {
  default: "border-[rgba(0,0,0,0.06)] bg-white text-[#1a1d2e]",
  muted: "border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] text-[#1a1d2e]",
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

const surfacePaddingClassMap: Record<SurfacePadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const surfaceRadiusClassMap: Record<SurfaceRadius, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const surfaceShadowClassMap: Record<SurfaceShadow, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  card: "shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]",
  panel: "shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
};

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  radius?: SurfaceRadius;
  shadow?: SurfaceShadow;
  bordered?: boolean;
  children: ReactNode;
}

export function Surface({
  tone = "default",
  padding = "md",
  radius = "xl",
  shadow = "sm",
  bordered = true,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "min-w-0",
        bordered && "border",
        surfaceToneClassMap[tone],
        surfacePaddingClassMap[padding],
        surfaceRadiusClassMap[radius],
        surfaceShadowClassMap[shadow],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardProps extends SurfaceProps {
  interactive?: boolean;
  selected?: boolean;
}

export function Card({
  interactive = false,
  selected = false,
  tone = "default",
  padding = "md",
  radius = "xl",
  shadow = "sm",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Surface
      tone={tone}
      padding={padding}
      radius={radius}
      shadow={shadow}
      className={cn(
        "flex flex-col gap-3",
        interactive &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
        selected && "border-[#3b6ef8] ring-2 ring-[#3b6ef8]/15",
        className,
      )}
      {...props}
    >
      {children}
    </Surface>
  );
}

export interface PanelProps extends SurfaceProps {
  sticky?: boolean;
}

export function Panel({
  sticky = false,
  tone = "default",
  padding = "md",
  radius = "xl",
  shadow = "panel",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <Surface
      tone={tone}
      padding={padding}
      radius={radius}
      shadow={shadow}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        sticky && "sticky top-4",
        className,
      )}
      {...props}
    >
      {children}
    </Surface>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title ? (
          <div className="truncate text-[14px] font-semibold leading-[1.3] text-[#1a1d2e]">
            {title}
          </div>
        ) : null}

        {description ? (
          <div className="mt-1 text-[11px] leading-[1.4] text-[#7c8099]">
            {description}
          </div>
        ) : null}

        {children}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "m-0 truncate text-[14px] font-semibold leading-[1.3] text-[#1a1d2e]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function CardDescription({
  className,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "m-0 text-[11px] leading-[1.4] text-[#7c8099]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={cn("min-w-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 pt-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  orientation = "horizontal",
  className,
  ...props
}: DividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        orientation === "horizontal"
          ? "h-px w-full"
          : "h-full min-h-4 w-px",
        "bg-[rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export const surfaceTones = surfaceToneClassMap;
export const surfacePaddings = surfacePaddingClassMap;
export const surfaceRadii = surfaceRadiusClassMap;
export const surfaceShadows = surfaceShadowClassMap;

