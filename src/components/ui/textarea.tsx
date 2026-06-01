import type { ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "./utils";
import type { InputTone } from "./input";
import { FieldMessage } from "./input";

export type TextareaSize = "sm" | "md" | "lg";

const textareaSizeClassMap: Record<TextareaSize, string> = {
  sm: "min-h-20 px-3 py-2 text-[12px]",
  md: "min-h-24 px-3.5 py-2.5 text-[12.5px]",
  lg: "min-h-32 px-4 py-3 text-[14px]",
};

const textareaToneClassMap: Record<InputTone, string> = {
  default:
    "border-transparent bg-[#f5f6fb] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#3b6ef8] focus:bg-white focus:ring-[#3b6ef8]/15",
  danger:
    "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#ef4444] focus:bg-white focus:ring-[#ef4444]/15",
  success:
    "border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#22c55e] focus:bg-white focus:ring-[#22c55e]/15",
  warning:
    "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#f97316] focus:bg-white focus:ring-[#f97316]/15",
};

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  textareaSize?: TextareaSize;
  tone?: InputTone;
  fullWidth?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const textareaResizeClassMap: Record<
  NonNullable<TextareaProps["resize"]>,
  string
> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

export function Textarea({
  textareaSize = "md",
  tone = "default",
  fullWidth = true,
  resize = "vertical",
  className,
  disabled,
  ...props
}: TextareaProps) {
  return (
    <textarea
      disabled={disabled}
      className={cn(
        "rounded-lg border font-medium outline-none transition-all",
        "focus:ring-2 disabled:cursor-not-allowed disabled:opacity-55",
        fullWidth && "w-full",
        textareaSizeClassMap[textareaSize],
        textareaToneClassMap[tone],
        textareaResizeClassMap[resize],
        className,
      )}
      {...props}
    />
  );
}

export interface TextareaFieldProps {
  id?: string;
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  tone?: InputTone;
  textareaProps?: TextareaProps;
  className?: string;
}

export function TextareaField({
  id,
  label,
  description,
  message,
  tone = "default",
  textareaProps,
  className,
}: TextareaFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="text-[12.5px] font-semibold leading-[1.35] text-[#1a1d2e]"
        >
          {label}
        </label>
      ) : null}

      {description ? (
        <p className="m-0 text-[11px] leading-[1.4] text-[#7c8099]">
          {description}
        </p>
      ) : null}

      <Textarea id={id} tone={tone} {...textareaProps} />

      <FieldMessage tone={tone}>{message}</FieldMessage>
    </div>
  );
}

export const textareaSizes = textareaSizeClassMap;
export const textareaTones = textareaToneClassMap;
export const textareaResize = textareaResizeClassMap;
