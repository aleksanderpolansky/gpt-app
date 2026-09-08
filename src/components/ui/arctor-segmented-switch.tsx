"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type ArctorSegmentedSwitchItem = {
  readonly value: string;
  readonly label: ReactNode;
  readonly href: string;
  readonly prefetch?: boolean;
};

type ArctorSegmentedSwitchProps = {
  readonly value: string;
  readonly items: readonly ArctorSegmentedSwitchItem[];
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onValueChange?: (value: string) => void;
};

export function ArctorSegmentedSwitch({
  value,
  items,
  ariaLabel,
  className,
  onValueChange,
}: ArctorSegmentedSwitchProps) {
  return (
    <div
      role="navigation"
      aria-label={ariaLabel}
      className={[
        "inline-flex w-fit max-w-full flex-wrap rounded-xl border border-[#dfe3f1] bg-white p-1 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Link
            key={item.value}
            href={item.href}
            prefetch={item.prefetch}
            aria-current={selected ? "page" : undefined}
            onClick={() => onValueChange?.(item.value)}
            className={[
              "rounded-lg px-4 py-2 text-[13px] font-semibold transition-all",
              selected
                ? "bg-[#3b6ef8] text-white shadow-sm"
                : "text-[#5a5f7a] hover:bg-[#f5f6fb]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
