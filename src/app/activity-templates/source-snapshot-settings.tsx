"use client";

import { useEffect, useRef, useState } from "react";
import type { SourceResolution } from "@/lib/activity/source-snapshot-resolution";

type StateLeafOption = {
  valueObjectId: string;
  valueObjectTitle: string;
};

type ParameterOption = {
  parameterDefinitionId: string;
};

export function SourceSnapshotSettings({ locale, parameterId, parameterCode, value, onChange, disabled }: {
  locale: string; parameterId: string; parameterCode: string; value?: SourceResolution;
  onChange: (value: SourceResolution) => void; disabled: boolean;
}) {
  const ru = locale === "ru";
  const [options, setOptions] = useState<StateLeafOption[]>([]);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode = value?.mode ?? "direct";
  const current = value ?? { mode: "direct" as const, multiplier: 1 };

  useEffect(() => {
    if (mode === "direct") return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/activity/facts/snapshots?locale=${encodeURIComponent(locale)}&parameterCode=${encodeURIComponent(parameterCode)}`,
          { signal: controller.signal },
        );
        const body = await response.json();

        if (!response.ok || !body.ok) {
          throw new Error(body.errorMessage || "Snapshot catalog unavailable");
        }

        const stateLeaves = Array.isArray(body.stateLeaves)
          ? body.stateLeaves as StateLeafOption[]
          : [];
        const parameterOptions = Array.isArray(body.parameterOptions)
          ? body.parameterOptions as ParameterOption[]
          : [];

        if (!parameterOptions.some((option) => option.parameterDefinitionId === parameterId)) {
          throw new Error("Selected parameter is not available for state snapshots.");
        }

        setOptions(stateLeaves);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [mode, locale, parameterCode, parameterId, attempt]);

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  const selectedOption = options.find(
    (option) => option.valueObjectId === value?.snapshotValueObjectId,
  ) ?? null;

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = (
    normalizedQuery
      ? options.filter((option) =>
          option.valueObjectTitle.toLocaleLowerCase().includes(normalizedQuery))
      : options
  ).slice(0, 150);

  const inputValue = query || selectedOption?.valueObjectTitle || "";

  function selectState(option: StateLeafOption) {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }

    setQuery("");
    setPickerOpen(false);
    setActiveIndex(-1);
    onChange({
      ...current,
      snapshotValueObjectId: option.valueObjectId,
    });
  }

  return (
    <fieldset
      disabled={disabled}
      className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3"
    >
      <legend className="px-1 text-xs font-bold">
        {ru ? "Способ получения значения" : "Value source"}
      </legend>

      <select
        aria-label={ru ? "Способ получения значения" : "Value source"}
        className="w-full rounded border p-2 text-sm"
        value={mode}
        onChange={(event) => onChange({
          ...current,
          mode: event.target.value as SourceResolution["mode"],
          multiplier: current.multiplier ?? 1,
        })}
      >
        <option value="direct">
          {ru ? "Прямое значение" : "Direct value"}
        </option>
        <option value="direct_or_snapshot">
          {ru
            ? "Прямое значение → если отсутствует, рассчитать"
            : "Direct value, otherwise calculate"}
        </option>
        <option value="snapshot_only">
          {ru ? "Только рассчитываемое" : "Always calculate"}
        </option>
      </select>

      {mode !== "direct" && (
        <>
          <label
            htmlFor="source-snapshot-state-combobox"
            className="block text-xs"
          >
            {ru ? "Источник: факт-срез состояния" : "Source: state snapshot"}
          </label>

          <div className="relative">
            <input
              id="source-snapshot-state-combobox"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={pickerOpen}
              aria-controls="source-snapshot-state-options"
              aria-activedescendant={
                pickerOpen &&
                activeIndex >= 0 &&
                visible[activeIndex]
                  ? `source-snapshot-state-option-${visible[activeIndex].valueObjectId}`
                  : undefined
              }
              value={inputValue}
              placeholder={
                loading
                  ? (ru ? "Загрузка…" : "Loading…")
                  : (ru
                      ? "Начните вводить название состояния…"
                      : "Start typing a state name…")
              }
              autoComplete="off"
              required
              onFocus={(event) => {
                if (blurTimerRef.current) {
                  clearTimeout(blurTimerRef.current);
                  blurTimerRef.current = null;
                }
                setPickerOpen(true);
                setActiveIndex(-1);
                event.currentTarget.select();
              }}
              onBlur={() => {
                blurTimerRef.current = setTimeout(() => {
                  setPickerOpen(false);
                  setActiveIndex(-1);
                  if (!value?.snapshotValueObjectId) setQuery("");
                }, 120);
              }}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setPickerOpen(true);
                setActiveIndex(-1);

                if (
                  value?.snapshotValueObjectId &&
                  nextQuery !== selectedOption?.valueObjectTitle
                ) {
                  onChange({
                    ...current,
                    snapshotValueObjectId: undefined,
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setPickerOpen(true);
                  setActiveIndex((currentIndex) => {
                    if (visible.length === 0) return -1;
                    return currentIndex < visible.length - 1
                      ? currentIndex + 1
                      : 0;
                  });
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setPickerOpen(true);
                  setActiveIndex((currentIndex) => {
                    if (visible.length === 0) return -1;
                    return currentIndex > 0
                      ? currentIndex - 1
                      : visible.length - 1;
                  });
                  return;
                }

                if (
                  event.key === "Enter" &&
                  pickerOpen &&
                  activeIndex >= 0 &&
                  visible[activeIndex]
                ) {
                  event.preventDefault();
                  selectState(visible[activeIndex]);
                  return;
                }

                if (event.key === "Escape") {
                  setPickerOpen(false);
                  setActiveIndex(-1);
                }
              }}
              className="w-full rounded border p-2 pr-10 text-sm"
            />

            <button
              type="button"
              aria-label={ru ? "Показать состояния" : "Show states"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setPickerOpen((open) => !open);
                setActiveIndex(-1);
              }}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
            >
              <span aria-hidden="true">⌄</span>
            </button>

            {pickerOpen && (
              <div
                id="source-snapshot-state-options"
                role="listbox"
                className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded border border-slate-200 bg-white p-1 shadow-lg"
              >
                {visible.length > 0 ? (
                  visible.map((option, index) => {
                    const active = index === activeIndex;
                    const selected =
                      option.valueObjectId === value?.snapshotValueObjectId;

                    return (
                      <button
                        id={`source-snapshot-state-option-${option.valueObjectId}`}
                        key={option.valueObjectId}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectState(option)}
                        className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
                          active || selected
                            ? "bg-slate-100 font-semibold text-slate-950"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span>{option.valueObjectTitle}</span>
                        {selected ? <span className="ml-3">✓</span> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-500">
                    {ru
                      ? "Подходящие состояния не найдены."
                      : "No matching states found."}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}{" "}
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
              >
                {ru ? "Повторить" : "Retry"}
              </button>
            </p>
          )}

          {!loading && !error && !options.length && (
            <p className="text-xs">
              {ru
                ? "Нет доступных системных листовых ОН ветви «Состояния и потребности»."
                : "No active system state-leaf observation objects are available."}
            </p>
          )}

          <label className="block text-xs">
            {ru ? "Умножить на" : "Multiply by"}
            <input
              type="number"
              step="any"
              required
              className="ml-2 w-28 rounded border p-2"
              value={
                Number.isFinite(current.multiplier)
                  ? current.multiplier
                  : ""
              }
              onChange={(event) => onChange({
                ...current,
                multiplier:
                  event.target.value === ""
                    ? NaN
                    : Number(event.target.value),
              })}
            />
          </label>

          <p className="text-xs text-slate-500">
            {ru
              ? "При выполнении система найдёт последний подтверждённый срез выбранного ОН с этим параметром, действующий на момент активности, и умножит его на коэффициент. Системное назначение ОН ↔ параметр не требуется. Если среза нет — потребуется уточнение."
              : "At runtime the system finds the latest confirmed snapshot for the selected observation object and this parameter at the activity time, then applies the multiplier. A system object ↔ parameter assignment is not required. A missing snapshot requires clarification."}
          </p>
        </>
      )}
    </fieldset>
  );
}
