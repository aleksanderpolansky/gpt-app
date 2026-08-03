import Link from "next/link";
import type { ElementType, ReactNode } from "react";

export function CertificateProfileTopCard({
  label,
  icon: Icon,
  accent,
  children,
}: {
  readonly label: string;
  readonly icon: ElementType;
  readonly accent: string;
  readonly children: ReactNode;
}) {
  return (
    <article className="flex h-full min-h-[350px] min-w-0 flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">
          {label}
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon size={15} />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

export function CertificateProfileBigCard({
  id,
  title,
  detailLabel,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly detailLabel?: string;
  readonly children: ReactNode;
}) {
  return (
    <article
      id={id}
      className="min-w-0 rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-[#1a1d2e]">{title}</h2>
        {detailLabel ? (
          <span className="text-[11px] text-[#3b6ef8]">{detailLabel}</span>
        ) : null}
      </div>
      {children}
    </article>
  );
}

export function CertificateProfileActionLink({
  href,
  active = false,
  children,
}: {
  readonly href: string;
  readonly active?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={
        active
          ? "rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:bg-[#2f5fe3]"
          : "rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition hover:bg-[#f5f6fb]"
      }
    >
      {children}
    </a>
  );
}

export function CertificateProfileNavLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

export function CertificateProfileDirectionCard({
  label,
  value,
  color,
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly color: string;
  readonly sub: string;
}) {
  return (
    <article className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[#1a1d2e]">{label}</span>
        <span className="text-[12px] font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf0f7]">
        <div className="h-full w-full rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="mt-2 text-[11px] text-[#9ca3b8]">{sub}</div>
    </article>
  );
}
