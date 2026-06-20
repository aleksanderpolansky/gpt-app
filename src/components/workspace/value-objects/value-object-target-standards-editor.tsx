"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  VALUE_OBJECT_STANDARD_METRIC_TYPE_LABELS,
  VALUE_OBJECT_STANDARD_METRIC_TYPES,
  VALUE_OBJECT_STANDARD_PERIOD_LABELS,
  VALUE_OBJECT_STANDARD_PERIODS,
  VALUE_OBJECT_STANDARD_PRIORITIES,
  VALUE_OBJECT_STANDARD_RULE_TYPE_LABELS,
  VALUE_OBJECT_STANDARD_RULE_TYPES,
  VALUE_OBJECT_STANDARD_UNIT_LABELS,
  VALUE_OBJECT_STANDARD_UNITS,
  type ValueObjectStandardMetricType,
  type ValueObjectStandardPeriod,
  type ValueObjectStandardPriority,
  type ValueObjectStandardRuleType,
  type ValueObjectStandardUnit,
} from "@/types/value-object-standards";

type ValueObjectTargetStandardsEditorProps = {
  readonly valueObjectId: string;
};

type SavedTargetStandard = {
  id?: string | null;
  value_object_id?: string | null;
  metric_type?: string | null;
  rule_type?: string | null;
  target_value?: number | string | null;
  target_min?: number | string | null;
  target_max?: number | string | null;
  unit?: string | null;
  period?: string | null;
  priority?: string | null;
  source?: string | null;
  status?: string | null;
  label?: string | null;
  description?: string | null;
  safety_note?: string | null;
  idempotency_key?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StandardsListResponse = {
  ok?: boolean;
  count?: number;
  standards?: SavedTargetStandard[];
  errorCode?: string;
  errorMessage?: string;
};

type SaveGateResponse = {
  ok?: boolean;
  writeStatus?: string;
  routeStatus?: string;
  idempotentReplay?: boolean;
  errorCode?: string;
  errorMessage?: string;
  createdStandard?: SavedTargetStandard | null;
  sideEffects?: {
    rowsActuallyWritten?: number;
    dbWriteExecuted?: boolean;
    valueObjectTargetStandardCreated?: boolean;
  } | null;
  validation?: {
    ok?: boolean;
    errors?: string[];
    warnings?: string[];
  } | null;
};

const DEFAULT_SAFETY_NOTE =
  "Пользовательский плановый показатель для аналитики. Это не медицинская рекомендация, не диагноз и не гарантированная норма.";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

function parseNumberInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIdempotencyPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яёіїєąćęłńóśźż]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatSavedStandardValue(standard: SavedTargetStandard) {
  const unit = standard.unit ?? "";
  const value = standard.target_value ?? "?";

  if (
    standard.rule_type === "desired_range" &&
    standard.target_min !== null &&
    standard.target_min !== undefined &&
    standard.target_max !== null &&
    standard.target_max !== undefined
  ) {
    return `${standard.target_min}–${standard.target_max} ${unit}`;
  }

  return `${value} ${unit}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "без даты";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ValueObjectTargetStandardsEditor({
  valueObjectId,
}: ValueObjectTargetStandardsEditorProps) {
  const [metricType, setMetricType] =
    useState<ValueObjectStandardMetricType>("volume");
  const [ruleType, setRuleType] =
    useState<ValueObjectStandardRuleType>("desired_minimum");
  const [targetValue, setTargetValue] = useState("1.25");
  const [targetMin, setTargetMin] = useState("");
  const [targetMax, setTargetMax] = useState("");
  const [unit, setUnit] = useState<ValueObjectStandardUnit>("liters");
  const [period, setPeriod] = useState<ValueObjectStandardPeriod>("day");
  const [priority, setPriority] =
    useState<ValueObjectStandardPriority>("normal");
  const [label, setLabel] = useState("5 стаканов воды в день");
  const [description, setDescription] = useState(
    "Пользовательская цель: выпивать 5 стаканов воды в день. В системе нормализовано как 1.25 литра в день, где 1 стакан ≈ 250 мл.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStandards, setIsLoadingStandards] = useState(false);
  const [standards, setStandards] = useState<SavedTargetStandard[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [listErrorMessage, setListErrorMessage] = useState("");
  const [lastResponse, setLastResponse] = useState<SaveGateResponse | null>(
    null,
  );

  const loadStandards = useCallback(async () => {
    setIsLoadingStandards(true);
    setListErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/standards`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      const data = (await response.json()) as StandardsListResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.errorMessage ?? "Не удалось загрузить плановые показатели.",
        );
      }

      setStandards(Array.isArray(data.standards) ? data.standards : []);
    } catch (error) {
      setListErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingStandards(false);
    }
  }, [valueObjectId]);

  useEffect(() => {
    void loadStandards();
  }, [loadStandards]);

  const targetValueNumber = useMemo(
    () => parseNumberInput(targetValue),
    [targetValue],
  );

  const targetMinNumber = useMemo(() => parseNumberInput(targetMin), [targetMin]);
  const targetMaxNumber = useMemo(() => parseNumberInput(targetMax), [targetMax]);

  const idempotencyKey = useMemo(() => {
    const labelPart = normalizeIdempotencyPart(label) || "target-standard";
    const valuePart =
      ruleType === "desired_range"
        ? `${targetMin || "min"}-${targetMax || "max"}`
        : targetValue || "value";

    return [
      "target-standard",
      valueObjectId,
      metricType,
      ruleType,
      unit,
      period,
      normalizeIdempotencyPart(valuePart),
      labelPart,
    ].join(":");
  }, [
    label,
    metricType,
    period,
    ruleType,
    targetMax,
    targetMin,
    targetValue,
    unit,
    valueObjectId,
  ]);

  const formattedPreview = useMemo(() => {
    const unitLabel = VALUE_OBJECT_STANDARD_UNIT_LABELS[unit];
    const periodLabel = VALUE_OBJECT_STANDARD_PERIOD_LABELS[period];
    const ruleLabel = VALUE_OBJECT_STANDARD_RULE_TYPE_LABELS[ruleType];
    const metricLabel = VALUE_OBJECT_STANDARD_METRIC_TYPE_LABELS[metricType];

    if (ruleType === "desired_range" && targetMin && targetMax) {
      return `${metricLabel}: ${ruleLabel} ${targetMin}–${targetMax} ${unitLabel} ${periodLabel}`;
    }

    return `${metricLabel}: ${ruleLabel} ${targetValue || "?"} ${unitLabel} ${periodLabel}`;
  }, [metricType, period, ruleType, targetMax, targetMin, targetValue, unit]);

  function applyFiveGlassesPreset() {
    setMetricType("volume");
    setRuleType("desired_minimum");
    setTargetValue("1.25");
    setTargetMin("");
    setTargetMax("");
    setUnit("liters");
    setPeriod("day");
    setPriority("normal");
    setLabel("5 стаканов воды в день");
    setDescription(
      "Пользовательская цель: выпивать 5 стаканов воды в день. В системе нормализовано как 1.25 литра в день, где 1 стакан ≈ 250 мл.",
    );
    setMessage("Preset применён: 5 стаканов × 250 мл = 1.25 liters/day.");
    setErrorMessage("");
    setLastResponse(null);
  }

  function applyThirtyMinutesPreset() {
    setMetricType("duration");
    setRuleType("desired_minimum");
    setTargetValue("30");
    setTargetMin("");
    setTargetMax("");
    setUnit("minutes");
    setPeriod("day");
    setPriority("normal");
    setLabel("30 минут в день");
    setDescription(
      "Пользовательская цель: уделять этому ценному объекту минимум 30 минут в день.",
    );
    setMessage("Preset применён: 30 minutes/day.");
    setErrorMessage("");
    setLastResponse(null);
  }

  function resetFormForNewStandard() {
    setMetricType("duration");
    setRuleType("desired_minimum");
    setTargetValue("");
    setTargetMin("");
    setTargetMax("");
    setUnit("minutes");
    setPeriod("day");
    setPriority("normal");
    setLabel("");
    setDescription("");
    setMessage("Форма очищена. Уже сохранённые показатели не удаляются.");
    setErrorMessage("");
    setLastResponse(null);
  }

  async function saveTargetStandard() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");
    setLastResponse(null);

    try {
      if (!label.trim()) {
        throw new Error("Введите название планового показателя.");
      }

      if (targetValueNumber === null) {
        throw new Error("Введите корректное основное значение targetValue.");
      }

      if (ruleType === "desired_range") {
        if (targetMinNumber === null || targetMaxNumber === null) {
          throw new Error(
            "Для desired_range нужно заполнить targetMin и targetMax.",
          );
        }

        if (targetMinNumber > targetMaxNumber) {
          throw new Error("targetMin не может быть больше targetMax.");
        }
      }

      const payload = {
        mode: "confirm_save",
        idempotencyKey,
        standardDraft: {
          valueObjectId,
          metricType,
          ruleType,
          targetValue: targetValueNumber,
          targetMin: ruleType === "desired_range" ? targetMinNumber : null,
          targetMax: ruleType === "desired_range" ? targetMaxNumber : null,
          unit,
          period,
          priority,
          source: "user_defined",
          status: "active",
          label: label.trim(),
          description: description.trim() || undefined,
          safetyNote: DEFAULT_SAFETY_NOTE,
        },
      };

      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(
          valueObjectId,
        )}/standards/save-gate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const responseText = await response.text();

      let data: SaveGateResponse;

      try {
        data = JSON.parse(responseText) as SaveGateResponse;
      } catch {
        data = {
          ok: false,
          errorMessage:
            responseText.slice(0, 500) || "Ответ API не является JSON.",
        };
      }

      setLastResponse(data);

      if (!response.ok || !data.ok) {
        const validationErrors = data.validation?.errors?.join(" ");
        throw new Error(
          data.errorMessage ||
            validationErrors ||
            "Не удалось сохранить плановый показатель.",
        );
      }

      const rowsActuallyWritten = data.sideEffects?.rowsActuallyWritten ?? 0;

      setMessage(
        data.idempotentReplay
          ? "Такой плановый показатель уже был сохранён раньше. Повторная запись не создана."
          : `Плановый показатель сохранён. Новых строк: ${rowsActuallyWritten}.`,
      );

      await loadStandards();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-[#dbeafe] bg-white p-5 shadow-[0_8px_24px_rgba(59,110,248,0.07)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2563eb]">
        Target standards
      </div>

      <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111827]">
            Плановые показатели
          </h2>

          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            Здесь можно установить любой плановый показатель для текущего
            ценного объекта: воду, сон, время обучения, шаги, деньги, баллы,
            дистанцию или другой измеримый ориентир. Запись выполняется через
            server-mediated save-gate, а не напрямую из браузера в Supabase.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
          <button
            type="button"
            onClick={() => void saveTargetStandard()}
            disabled={isSaving}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-5 py-3 text-[14px] font-bold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Сохраняем..." : "Добавить показатель"}
          </button>

          <button
            type="button"
            onClick={resetFormForNewStandard}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Очистить форму
          </button>

          <button
            type="button"
            onClick={applyFiveGlassesPreset}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[13px] font-bold text-[#1d4ed8] transition hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preset: 5 стаканов воды
          </button>

          <button
            type="button"
            onClick={applyThirtyMinutesPreset}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-bold text-[#047857] transition hover:bg-[#dcfce7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preset: 30 минут
          </button>
        </div>
      </div>

      {(errorMessage || message) && (
        <div
          className={
            errorMessage
              ? "mt-4 rounded-2xl border border-[#ffd5d5] bg-[#fff7f7] p-4 text-[13px] font-semibold text-[#b42318]"
              : "mt-4 rounded-2xl border border-[#c9f2d4] bg-[#f4fff7] p-4 text-[13px] font-semibold text-[#16713b]"
          }
        >
          {errorMessage || message}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-[#e0e7ff] bg-[#f8fafc] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">
              Сохранённые показатели этого объекта
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[#5a5f7a]">
              Это реальные строки из таблицы target standards для текущего Value
              Object и текущего пользователя.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStandards()}
            disabled={isLoadingStandards}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingStandards ? "Обновляем..." : "Обновить список"}
          </button>
        </div>

        {listErrorMessage ? (
          <div className="mt-3 rounded-xl border border-[#ffd5d5] bg-[#fff7f7] p-3 text-[13px] font-semibold text-[#b42318]">
            {listErrorMessage}
          </div>
        ) : null}

        {!listErrorMessage && standards.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#cbd5e1] bg-white p-4 text-[13px] font-semibold text-[#64748b]">
            Пока нет сохранённых плановых показателей для этого объекта.
          </div>
        ) : null}

        {standards.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {standards.map((standard) => (
              <article
                key={standard.id ?? standard.idempotency_key ?? standard.label}
                className="rounded-2xl border border-[#dfe3f1] bg-white p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#111827]">
                      {standard.label || "Без названия"}
                    </h3>
                    <div className="mt-1 text-[13px] font-semibold text-[#4a4f6a]">
                      {standard.metric_type} / {standard.rule_type} /{" "}
                      {formatSavedStandardValue(standard)} / {standard.period}
                    </div>
                    {standard.description ? (
                      <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                        {standard.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-[#4a4f6a]">
                    {standard.status ?? "status?"} ·{" "}
                    {standard.priority ?? "priority?"}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-[12px] text-[#64748b] md:grid-cols-2">
                  <div>
                    source:{" "}
                    <span className="font-mono">
                      {standard.source ?? "unknown"}
                    </span>
                  </div>
                  <div>created: {formatDate(standard.created_at)}</div>
                  <div className="break-all md:col-span-2">
                    id: <span className="font-mono">{standard.id}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          Название / label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={isSaving}
            placeholder="Например: 30 минут немецкого в день"
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          />
        </label>

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          metricType
          <select
            value={metricType}
            onChange={(event) =>
              setMetricType(event.target.value as ValueObjectStandardMetricType)
            }
            disabled={isSaving}
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          >
            {VALUE_OBJECT_STANDARD_METRIC_TYPES.map((item) => (
              <option key={item} value={item}>
                {item} — {VALUE_OBJECT_STANDARD_METRIC_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          ruleType
          <select
            value={ruleType}
            onChange={(event) =>
              setRuleType(event.target.value as ValueObjectStandardRuleType)
            }
            disabled={isSaving}
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          >
            {VALUE_OBJECT_STANDARD_RULE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item} — {VALUE_OBJECT_STANDARD_RULE_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          targetValue
          <input
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            disabled={isSaving}
            inputMode="decimal"
            placeholder="Например: 30"
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          />
        </label>

        {ruleType === "desired_range" ? (
          <>
            <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              targetMin
              <input
                value={targetMin}
                onChange={(event) => setTargetMin(event.target.value)}
                disabled={isSaving}
                inputMode="decimal"
                placeholder="Например: 7"
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
              />
            </label>

            <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              targetMax
              <input
                value={targetMax}
                onChange={(event) => setTargetMax(event.target.value)}
                disabled={isSaving}
                inputMode="decimal"
                placeholder="Например: 8"
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
              />
            </label>
          </>
        ) : null}

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          unit
          <select
            value={unit}
            onChange={(event) =>
              setUnit(event.target.value as ValueObjectStandardUnit)
            }
            disabled={isSaving}
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          >
            {VALUE_OBJECT_STANDARD_UNITS.map((item) => (
              <option key={item} value={item}>
                {item} — {VALUE_OBJECT_STANDARD_UNIT_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          period
          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as ValueObjectStandardPeriod)
            }
            disabled={isSaving}
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          >
            {VALUE_OBJECT_STANDARD_PERIODS.map((item) => (
              <option key={item} value={item}>
                {item} — {VALUE_OBJECT_STANDARD_PERIOD_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
          priority
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as ValueObjectStandardPriority)
            }
            disabled={isSaving}
            className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
          >
            {VALUE_OBJECT_STANDARD_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
        Описание
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSaving}
          rows={4}
          placeholder="Кратко опиши смысл планового показателя."
          className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold normal-case tracking-normal text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
        />
      </label>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
            Preview
          </div>
          <div className="mt-2 text-[14px] font-semibold text-[#1a1d2e]">
            {formattedPreview}
          </div>
          <div className="mt-2 break-all font-mono text-[12px] text-[#5a5f7a]">
            idempotencyKey: {idempotencyKey}
          </div>
        </div>

        <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#b45309]">
            Safety
          </div>
          <p className="mt-2 text-[13px] leading-5 text-[#92400e]">
            Плановый показатель — это ориентир для аналитики. Он не является
            медицинской, юридической или финансовой рекомендацией.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e0e7ff] bg-[#f8fafc] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[13px] leading-5 text-[#5a5f7a]">
            source сохраняется как{" "}
            <span className="font-mono text-[#1a1d2e]">user_defined</span>,
            status — как{" "}
            <span className="font-mono text-[#1a1d2e]">active</span>.
          </div>

          <button
            type="button"
            onClick={() => void saveTargetStandard()}
            disabled={isSaving}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-5 py-3 text-[14px] font-bold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Сохраняем..." : "Сохранить показатель"}
          </button>
        </div>
      </div>

      {lastResponse ? (
        <details className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <summary className="cursor-pointer text-[13px] font-bold text-[#374151]">
            Последний ответ save-gate
          </summary>
          <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#111827] p-4 text-[12px] leading-5 text-[#d1d5db]">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
