import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export type InputSize = "sm" | "md" | "lg";
export type InputTone = "default" | "danger" | "success" | "warning";

const inputSizeClassMap: Record<InputSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-3.5 text-[12.5px]",
  lg: "h-10 px-4 text-[14px]",
};

const inputToneClassMap: Record<InputTone, string> = {
  default:
    "border-transparent bg-[#f5f6fb] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#3b6ef8] focus:bg-white focus:ring-[#3b6ef8]/15",
  danger:
    "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#ef4444] focus:bg-white focus:ring-[#ef4444]/15",
  success:
    "border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#22c55e] focus:bg-white focus:ring-[#22c55e]/15",
  warning:
    "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.06)] text-[#1a1d2e] placeholder:text-[#b0b4c8] focus:border-[#f97316] focus:bg-white focus:ring-[#f97316]/15",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  tone?: InputTone;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  fullWidth?: boolean;
}

export function Input({
  inputSize = "md",
  tone = "default",
  leftIcon,
  rightSlot,
  fullWidth = true,
  className,
  disabled,
  ...props
}: InputProps) {
  const hasLeftIcon = Boolean(leftIcon);
  const hasRightSlot = Boolean(rightSlot);

  return (
    <div className={cn("relative inline-flex min-w-0", fullWidth && "w-full")}>
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 inline-flex -translate-y-1/2 text-[#9ca3b8]">
          {leftIcon}
        </span>
      ) : null}

      <input
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border font-medium outline-none transition-all",
          "focus:ring-2 disabled:cursor-not-allowed disabled:opacity-55",
          inputSizeClassMap[inputSize],
          inputToneClassMap[tone],
          hasLeftIcon && "pl-9",
          hasRightSlot && "pr-10",
          className,
        )}
        {...props}
      />

      {rightSlot ? (
        <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[#9ca3b8]">
          {rightSlot}
        </span>
      ) : null}
    </div>
  );
}

export interface SearchInputProps
  extends Omit<InputProps, "type" | "leftIcon"> {
  searchIcon?: ReactNode;
}

function DefaultSearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M9.25 15.5a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m13.8 13.8 3.2 3.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SearchInput({
  searchIcon = <DefaultSearchIcon />,
  placeholder = "Поиск...",
  inputSize = "md",
  ...props
}: SearchInputProps) {
  return (
    <Input
      type="search"
      inputSize={inputSize}
      leftIcon={searchIcon}
      placeholder={placeholder}
      {...props}
    />
  );
}

export interface FieldMessageProps {
  id?: string;
  tone?: InputTone;
  children?: ReactNode;
  className?: string;
}

const fieldMessageToneClassMap: Record<InputTone, string> = {
  default: "text-[#7c8099]",
  danger: "text-[#ef4444]",
  success: "text-[#16803d]",
  warning: "text-[#b45309]",
};

export function FieldMessage({
  id,
  tone = "default",
  children,
  className,
}: FieldMessageProps) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      className={cn(
        "m-0 text-[11px] font-medium leading-[1.4]",
        fieldMessageToneClassMap[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}

export interface FieldShellProps {
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  tone?: InputTone;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  description,
  message,
  tone = "default",
  htmlFor,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
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

      {children}

      <FieldMessage tone={tone}>{message}</FieldMessage>
    </div>
  );
}

export const inputSizes = inputSizeClassMap;
export const inputTones = inputToneClassMap;
export const fieldMessageTones = fieldMessageToneClassMap;
