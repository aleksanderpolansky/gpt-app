"use client";

import type { ChangeEvent } from "react";

import {
  activityCaptureExamplePrompts,
  type ActivityCaptureExamplePrompt,
} from "./activity-capture-fixtures";

export const ACTIVITY_INPUT_CREATED = "ACTIVITY_INPUT_CREATED" as const;

const defaultActivityInputPlaceholder =
  "Например: Немецкий 40 минут: Babbel, письмо клиенту, выписал 5 новых B2B-фраз.";

export interface ActivityInputProps {
  value: string;
  onValueChange: (nextValue: string) => void;
  onPreviewClick: () => void;
  onClearClick: () => void;
  onExampleClick: (rawText: string) => void;
  examples?: ActivityCaptureExamplePrompt[];
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

export function ActivityInput({
  value,
  onValueChange,
  onPreviewClick,
  onClearClick,
  onExampleClick,
  examples = activityCaptureExamplePrompts,
  disabled = false,
  minLength = 3,
  maxLength = 800,
}: ActivityInputProps) {
  const trimmedValue = value.trim();
  const visibleExamples = examples.length > 0 ? examples : activityCaptureExamplePrompts;
  const charactersRemaining = maxLength - value.length;
  const isTooShort = trimmedValue.length < minLength;
  const isTooLong = value.length > maxLength;
  const previewDisabled = disabled || isTooShort || isTooLong;

  function handleTextAreaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onValueChange(event.target.value.slice(0, maxLength));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="activity-capture-input"
          className="text-sm font-semibold text-slate-900"
        >
          Что ты сейчас сделал?
        </label>

        <p id="activity-capture-input-help" className="text-xs leading-5 text-slate-500">
          Опиши активность одной фразой. На UI-4 это создаёт только локальный
          draft preview без сохранения в DB.
        </p>
      </div>

      <textarea
        id="activity-capture-input"
        aria-describedby="activity-capture-input-help activity-capture-input-counter"
        value={value}
        onChange={handleTextAreaChange}
        placeholder={defaultActivityInputPlaceholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={5}
        className="mt-4 min-h-[132px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p
          id="activity-capture-input-counter"
          className="text-xs font-medium text-slate-500"
        >
          {charactersRemaining} символов осталось
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearClick}
            disabled={disabled || value.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Очистить
          </button>

          <button
            type="button"
            onClick={onPreviewClick}
            disabled={previewDisabled}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            Создать local preview
          </button>
        </div>
      </div>

      {isTooShort ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Для preview нужно минимум {minLength} символа. Пустая активность не
          обрабатывается.
        </p>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Быстро вставить пример
          </p>

          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
            local only
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleExamples.slice(0, 5).map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => onExampleClick(example.rawText)}
              disabled={disabled}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
