import type { ElementType, ReactNode } from "react";

/**
 * Shared four-card top-zone contract for enterprise, profile, value object,
 * certificate and activity pages. Domain content changes; page rhythm does not.
 */
function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function EntityPageTopGrid({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={cx(
        "grid auto-rows-auto items-stretch gap-4 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function EntityPageTopCard({
  label,
  icon: Icon,
  accent,
  children,
  footer,
  className,
}: {
  readonly label: string;
  readonly icon: ElementType;
  readonly accent: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
}) {
  return (
    <article
      className={cx(
        "flex min-h-[390px] flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {label}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18` }}
          aria-hidden="true"
        >
          <Icon size={14} style={{ color: accent }} />
        </span>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">{children}</div>

      {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
    </article>
  );
}
