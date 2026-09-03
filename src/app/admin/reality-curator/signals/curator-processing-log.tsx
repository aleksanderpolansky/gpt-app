"use client";

import { CheckCircle2, Clock3, MessageSquareText, UserRound } from "lucide-react";

import type { LocaleCode } from "@/i18n";

export type CuratorProcessingLogEvent = {
  id: string;
  eventCode: string;
  occurredAt: string;
  checklistVersion: string | null;
  checklistStepCode: string | null;
  checklistStepNameSnapshotRu: string | null;
  labelRu: string | null;
  labelEn: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
  actorDisplayName: string | null;
  actorRole: string | null;
  curatorComment: string | null;
};

export type CuratorProcessingLogBlock = {
  code: string;
  titleRu: string;
  titleEn: string;
  latestAt: string;
  summaryRu: string;
  summaryEn: string;
  comment: string | null;
  events: CuratorProcessingLogEvent[];
};

export type CuratorProcessingLogData = {
  currentStageRu: string;
  currentStageEn: string;
  currentResponsible: string | null;
  lastActionAt: string | null;
  lastActionRu: string | null;
  lastActionEn: string | null;
  sourceUserDisplayName: string;
  sourceChannelRu: string;
  sourceChannelEn: string;
  blocks: CuratorProcessingLogBlock[];
};

type Props = {
  data: CuratorProcessingLogData;
  locale: LocaleCode;
};

function formatDate(value: string | null, locale: LocaleCode) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const localeTag: Record<LocaleCode, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    en: "en-GB",
    es: "es-ES",
    uk: "uk-UA",
    de: "de-DE",
    cs: "cs-CZ",
  };
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function localized(ru: string | null, en: string | null, locale: LocaleCode) {
  return locale === "ru" ? ru || en || "—" : en || ru || "—";
}

export function CuratorProcessingLog({ data, locale }: Props) {
  const isRu = locale === "ru";
  const title = isRu ? "Журнал обработки" : "Processing log";
  const stageLabel = isRu ? "Текущий этап" : "Current stage";
  const responsibleLabel = isRu ? "Ответственный" : "Responsible curator";
  const lastLabel = isRu ? "Последнее действие" : "Latest action";
  const unassigned = isRu ? "Не назначен" : "Not assigned";
  const commentLabel = isRu ? "Комментарий" : "Comment";
  const technical = isRu ? "Технические сведения" : "Technical details";
  const stepWord = isRu ? "шаг" : "step";

  return (
    <div className="mt-4 border-t border-[#eceef5] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-extrabold text-[#263044]">{title}</div>
        <div className="text-[11px] text-[#7c8099]">
          {isRu ? "Сначала показаны последние действия" : "Newest actions are shown first"}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-[#e3e8f8] bg-[#f8faff] px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b90a5]">{stageLabel}</div>
          <div className="mt-1 text-sm font-bold text-[#263044]">
            {localized(data.currentStageRu, data.currentStageEn, locale)}
          </div>
        </div>
        <div className="rounded-xl border border-[#e3e8f8] bg-[#f8faff] px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b90a5]">{responsibleLabel}</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-[#263044]">
            <UserRound size={14} className="text-[#6576a8]" />
            {data.currentResponsible || unassigned}
          </div>
        </div>
        <div className="rounded-xl border border-[#e3e8f8] bg-[#f8faff] px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b90a5]">{lastLabel}</div>
          <div className="mt-1 text-sm font-bold text-[#263044]">
            {localized(data.lastActionRu, data.lastActionEn, locale)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#7c8099]">
            <Clock3 size={12} /> {formatDate(data.lastActionAt, locale)}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {data.blocks.map((block) => (
          <section key={block.code} className="rounded-2xl border border-[#e3e8f3] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={15} />
                </span>
                <div className="text-sm font-extrabold text-[#263044]">
                  {localized(block.titleRu, block.titleEn, locale)}
                </div>
              </div>
              <div className="text-[11px] font-semibold text-[#7c8099]">
                {formatDate(block.latestAt, locale)}
              </div>
            </div>

            <div className="mt-2 text-sm leading-6 text-[#4b5563]">
              {localized(block.summaryRu, block.summaryEn, locale)}
            </div>

            {block.comment ? (
              <div className="mt-3 rounded-xl border border-[#e8eaf2] bg-[#f8f9fc] px-3 py-2.5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b90a5]">
                  <MessageSquareText size={13} /> {commentLabel}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#394154]">{block.comment}</div>
              </div>
            ) : null}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-[#65708d]">{technical}</summary>
              <div className="mt-2 space-y-2 border-l border-[#e7eaf3] pl-3">
                {block.events.map((event) => (
                  <div key={event.id} className="text-[11px] leading-4 text-[#727991]">
                    <div className="font-semibold text-[#4b5563]">
                      {localized(event.labelRu, event.labelEn, locale)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                      <span>{formatDate(event.occurredAt, locale)}</span>
                      <span className="font-mono">{event.eventCode}</span>
                      {event.actorDisplayName ? <span>{event.actorDisplayName}</span> : null}
                      {event.checklistVersion ? <span>v{event.checklistVersion}</span> : null}
                      {event.checklistStepCode ? <span>{stepWord} {event.checklistStepCode}</span> : null}
                    </div>
                    {isRu && event.checklistStepNameSnapshotRu ? (
                      <div className="mt-0.5">{event.checklistStepNameSnapshotRu}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}
