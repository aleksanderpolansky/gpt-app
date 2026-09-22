"use client";
import { useEffect, useState } from "react";
import type { SourceResolution } from "@/lib/activity/source-snapshot-resolution";

type Option = { valueObjectId: string; valueObjectTitle: string; parameterDefinitionId: string; canonicalUnitCode: string };
export function SourceSnapshotSettings({ locale, parameterId, parameterCode, value, onChange, disabled }: {
  locale: string; parameterId: string; parameterCode: string; value?: SourceResolution;
  onChange: (value: SourceResolution) => void; disabled: boolean;
}) {
  const ru = locale === "ru";
  const [options, setOptions] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mode = value?.mode ?? "direct";
  useEffect(() => {
    if (mode === "direct") return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/activity/facts/snapshots?locale=${encodeURIComponent(locale)}&parameterCode=${encodeURIComponent(parameterCode)}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.errorMessage || "Snapshot catalog unavailable");
        setOptions((body.options as Option[]).filter((option) => option.parameterDefinitionId === parameterId));
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Load failed");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [mode, locale, parameterCode, parameterId, attempt]);
  const current = value ?? { mode: "direct" as const, multiplier: 1 };
  const visible = options.filter((option) => option.valueObjectId === value?.snapshotValueObjectId || option.valueObjectTitle.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <fieldset disabled={disabled} className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
    <legend className="px-1 text-xs font-bold">{ru ? "Способ получения значения" : "Value source"}</legend>
    <select aria-label={ru ? "Способ получения значения" : "Value source"} className="w-full rounded border p-2 text-sm" value={mode}
      onChange={(event) => onChange({ ...current, mode: event.target.value as SourceResolution["mode"], multiplier: current.multiplier ?? 1 })}>
      <option value="direct">{ru ? "Прямое значение" : "Direct value"}</option>
      <option value="direct_or_snapshot">{ru ? "Прямое значение → если отсутствует, рассчитать" : "Direct value, otherwise calculate"}</option>
      <option value="snapshot_only">{ru ? "Только рассчитываемое" : "Always calculate"}</option>
    </select>
    {mode !== "direct" && <>
      <input aria-label={ru ? "Поиск состояния" : "Find state"} placeholder={ru ? "Поиск состояния…" : "Find state…"} className="w-full rounded border p-2 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} />
      <label className="block text-xs">{ru ? "Источник: факт-срез состояния" : "Source: state snapshot"}
        <select required className="mt-1 w-full rounded border p-2 text-sm" value={value?.snapshotValueObjectId ?? ""}
          onChange={(event) => onChange({ ...current, snapshotValueObjectId: event.target.value })}>
          <option value="">{loading ? (ru ? "Загрузка…" : "Loading…") : (ru ? "Выберите состояние" : "Select state")}</option>
          {visible.map((option) => <option key={option.valueObjectId} value={option.valueObjectId}>{option.valueObjectTitle} · {option.canonicalUnitCode}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{error} <button type="button" onClick={() => setAttempt((n) => n + 1)}>{ru ? "Повторить" : "Retry"}</button></p>}
      {!loading && !error && !options.length && <p className="text-xs">{ru ? "Нет состояний с этим параметром. Назначьте параметр объекту состояния." : "No states with this parameter. Assign the parameter to a state object."}</p>}
      <label className="block text-xs">{ru ? "Умножить на" : "Multiply by"}
        <input type="number" step="any" required className="ml-2 w-28 rounded border p-2" value={Number.isFinite(current.multiplier) ? current.multiplier : ""}
          onChange={(event) => onChange({ ...current, multiplier: event.target.value === "" ? NaN : Number(event.target.value) })} />
      </label>
      <p className="text-xs text-slate-500">{ru ? "Последний подтверждённый срез пользователя на момент активности × множитель. Если среза нет — потребуется уточнение." : "Latest confirmed user snapshot at activity time × multiplier. A missing snapshot requires clarification."}</p>
    </>}
  </fieldset>;
}
