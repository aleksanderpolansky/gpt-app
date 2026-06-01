import type {
  ElementType,
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "./utils";

type UiTone =
  | "default"
  | "muted"
  | "subtle"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "violet";

type UiAlign = "left" | "center" | "right";
type UiWeight = "normal" | "medium" | "semibold" | "bold";

const toneClassMap: Record<UiTone, string> = {
  default: "text-[#1a1d2e]",
  muted: "text-[#7c8099]",
  subtle: "text-[#9ca3b8]",
  primary: "text-[#3b6ef8]",
  success: "text-[#22c55e]",
  warning: "text-[#f97316]",
  danger: "text-[#ef4444]",
  violet: "text-[#8b5cf6]",
};

const alignClassMap: Record<UiAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const weightClassMap: Record<UiWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  tone?: UiTone;
  align?: UiAlign;
  children: ReactNode;
}

const headingSizeClassMap: Record<HeadingLevel, string> = {
  1: "text-[22px] leading-[1.15] tracking-[-0.02em]",
  2: "text-[18px] leading-[1.2] tracking-[-0.015em]",
  3: "text-[16px] leading-[1.25]",
  4: "text-[14px] leading-[1.3]",
};

const headingElementMap: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

export function Heading({
  level = 2,
  tone = "default",
  align = "left",
  className,
  children,
  ...props
}: HeadingProps) {
  const Component = headingElementMap[level];

  return (
    <Component
      className={cn(
        "m-0 font-semibold",
        headingSizeClassMap[level],
        toneClassMap[tone],
        alignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export type TextSize = "xs" | "sm" | "md" | "base" | "lg";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: TextSize;
  tone?: UiTone;
  align?: UiAlign;
  weight?: UiWeight;
  children: ReactNode;
}

const textSizeClassMap: Record<TextSize, string> = {
  xs: "text-[10px] leading-[1.35]",
  sm: "text-[11px] leading-[1.4]",
  md: "text-[12.5px] leading-[1.45]",
  base: "text-[14px] leading-[1.5]",
  lg: "text-[16px] leading-[1.55]",
};

export function Text({
  as: Component = "p",
  size = "base",
  tone = "default",
  align = "left",
  weight = "normal",
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(
        "m-0",
        textSizeClassMap[size],
        toneClassMap[tone],
        alignClassMap[align],
        weightClassMap[weight],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface LabelTextProps extends LabelHTMLAttributes<HTMLLabelElement> {
  tone?: UiTone;
  weight?: UiWeight;
  children: ReactNode;
}

export function LabelText({
  tone = "default",
  weight = "semibold",
  className,
  children,
  ...props
}: LabelTextProps) {
  return (
    <label
      className={cn(
        "m-0 text-[12.5px] leading-[1.35]",
        toneClassMap[tone],
        weightClassMap[weight],
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export interface CaptionProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: UiTone;
  align?: UiAlign;
  children: ReactNode;
}

export function Caption({
  tone = "muted",
  align = "left",
  className,
  children,
  ...props
}: CaptionProps) {
  return (
    <p
      className={cn(
        "m-0 text-[11px] leading-[1.4]",
        toneClassMap[tone],
        alignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: UiTone;
  align?: UiAlign;
  children: ReactNode;
}

export function Eyebrow({
  tone = "muted",
  align = "left",
  className,
  children,
  ...props
}: EyebrowProps) {
  return (
    <p
      className={cn(
        "m-0 text-[10px] font-semibold uppercase tracking-[0.08em] leading-[1.35]",
        toneClassMap[tone],
        alignClassMap[align],
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface MutedTextProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function MutedText({ className, children, ...props }: MutedTextProps) {
  return (
    <Text
      as="p"
      size="md"
      tone="muted"
      className={className}
      {...props}
    >
      {children}
    </Text>
  );
}

export interface ValueTextProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: UiTone;
  children: ReactNode;
}

export function ValueText({
  tone = "default",
  className,
  children,
  ...props
}: ValueTextProps) {
  return (
    <span
      className={cn(
        "text-[22px] font-semibold leading-[1.15] tracking-[-0.02em]",
        toneClassMap[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export interface MonoTextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: "sm" | "md";
  tone?: UiTone;
  children: ReactNode;
}

export function MonoText({
  as: Component = "code",
  size = "sm",
  tone = "muted",
  className,
  children,
  ...props
}: MonoTextProps) {
  const sizeClass = size === "sm" ? "text-[11px]" : "text-[12.5px]";

  return (
    <Component
      className={cn(
        "font-mono leading-[1.45]",
        sizeClass,
        toneClassMap[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export const typographyTones = toneClassMap;
export const typographySizes = {
  heading: headingSizeClassMap,
  text: textSizeClassMap,
} as const;
