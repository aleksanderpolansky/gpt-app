"use client";

import { QRCodeSVG } from "qrcode.react";

export function GiftCertificateQr({
  value,
  publicCode,
  title,
  instruction,
}: {
  readonly value: string;
  readonly publicCode: string;
  readonly title: string;
  readonly instruction: string;
}) {
  return (
    <section className="rounded-[24px] border border-[#c7d2fe] bg-white p-5 shadow-sm">
      <h2 className="text-[16px] font-bold text-[#1e3a8a]">{title}</h2>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-2xl border border-[#dbe4ff] bg-white p-3">
          <QRCodeSVG
            value={value}
            size={220}
            level="M"
            includeMargin
            title={title}
          />
        </div>
        <div className="max-w-md">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
            {publicCode}
          </div>
          <p className="mt-3 text-[13px] leading-6 text-[#4a4f6a]">
            {instruction}
          </p>
        </div>
      </div>
    </section>
  );
}
