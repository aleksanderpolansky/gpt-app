"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LocaleCode } from "@/i18n";

import { CuratorObjectBootstrap } from "./curator-object-bootstrap";

type ParameterItem = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  canonicalUnitLabel: string;
  aggregationMethodCode: string;
  defaultWindowCode: string;
  status: string;
};

type SelectedParameterItem = ParameterItem & {
  selectionSource: string;
  selectedAt: string;
  mappingCompleted: boolean;
  mappingResult: string | null;
  mappingSummaryRu: string | null;
  mappingSummaryEn: string | null;
};

type ParameterState = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  confirmed?: boolean;
  confirmationComment?: string | null;
  selected?: SelectedParameterItem[];
  available?: ParameterItem[];
};

type CreatedParameterResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  definition?: ParameterItem;
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  onChanged: () => void;
};

type AddMode = "existing" | "new";

type Copy = {
  title: string;
  hint: string;
  rule: string;
  selectedTitle: string;
  noneSelected: string;
  addAdditional: string;
  chooseExisting: string;
  createNew: string;
  searchPlaceholder: string;
  noAvailable: string;
  addParameter: string;
  selectedBadge: string;
  mappingReady: string;
  mappingPending: string;
  confirmTitle: string;
  confirmHint: string;
  confirmComment: string;
  confirmCommentHint: string;
  confirmButton: string;
  confirmed: string;
  confirmedHint: string;
  currentParameter: string;
  allMapped: string;
  allMappedHint: string;
  openCatalog: string;
  loading: string;
  saving: string;
  loadError: string;
  newTitle: string;
  newDescription: string;
  technicalCode: string;
  dimension: string;
  valueType: string;
  unit: string;
  aggregation: string;
  window: string;
  allowNegative: string;
  choose: string;
  createAndAdd: string;
};

const EN: Copy = {
  title: "Typical activity parameters",
  hint: "Build the required parameter set for the new system typical activity. Add an existing system parameter or create a missing one. After every addition, the selected set remains visible and you can add another parameter.",
  rule: "A typical activity cannot be completed without at least one parameter. Parameters are the measurable facts by which execution of the activity is recorded.",
  selectedTitle: "Selected parameters",
  noneSelected: "No parameters have been selected yet.",
  addAdditional: "+ Add another parameter",
  chooseExisting: "Choose existing",
  createNew: "Create new",
  searchPlaceholder: "Search by name, code or dimension…",
  noAvailable: "No matching active system parameters.",
  addParameter: "Add parameter",
  selectedBadge: "Selected",
  mappingReady: "Measurable object determined",
  mappingPending: "Measurable object is not determined yet",
  confirmTitle: "Finish the parameter set",
  confirmHint: "When the set is complete, confirm it. After confirmation, parameters are handled one by one and each is linked to its measurable leaf observation object.",
  confirmComment: "Decision comment",
  confirmCommentHint: "Briefly explain why this parameter set is sufficient for the typical activity.",
  confirmButton: "Confirm parameter set and continue",
  confirmed: "Typical activity parameter set confirmed",
  confirmedHint: "The parameter set is locked for this review step. Now determine the measurable leaf observation object for every selected parameter.",
  currentParameter: "Parameter being configured",
  allMapped: "Measurable objects determined for all parameters",
  allMappedHint: "This constructor section is complete. The next step can continue building the system typical activity.",
  openCatalog: "Open parameter catalog",
  loading: "Loading parameter constructor…",
  saving: "Saving…",
  loadError: "Could not load or save the parameter constructor.",
  newTitle: "Name",
  newDescription: "Description",
  technicalCode: "Technical code",
  dimension: "Dimension",
  valueType: "Value type",
  unit: "Canonical unit",
  aggregation: "Aggregation",
  window: "Default window",
  allowNegative: "Allow negative values",
  choose: "Choose…",
  createAndAdd: "Create system parameter and add it",
};

const RU: Copy = {
  ...EN,
  title: "Параметры типовой активности",
  hint: "Сформируйте обязательный набор параметров новой системной типовой активности. Можно выбрать существующий системный параметр или создать недостающий. После каждого добавления выбранный набор остаётся видимым, и можно добавить следующий параметр.",
  rule: "Типовая активность не может быть завершена без хотя бы одного параметра. Именно параметры образуют измеримые факты, которыми фиксируется выполнение активности.",
  selectedTitle: "Выбранные параметры",
  noneSelected: "Пока не выбран ни один параметр.",
  addAdditional: "+ Добавить дополнительный параметр",
  chooseExisting: "Выбрать существующий",
  createNew: "Создать новый",
  searchPlaceholder: "Поиск по названию, коду или измерению…",
  noAvailable: "Подходящих активных системных параметров не найдено.",
  addParameter: "Добавить параметр",
  selectedBadge: "Выбран",
  mappingReady: "Измеримый объект определён",
  mappingPending: "Измеримый объект ещё не определён",
  confirmTitle: "Завершить набор параметров",
  confirmHint: "Когда набор сформирован, подтвердите его. После подтверждения параметры будут последовательно обработаны: для каждого нужно определить измеримый листовой ОН.",
  confirmComment: "Комментарий к решению",
  confirmCommentHint: "Кратко зафиксируйте, почему этого набора параметров достаточно для типовой активности.",
  confirmButton: "Подтвердить набор параметров и продолжить",
  confirmed: "Набор параметров типовой активности сформирован",
  confirmedHint: "Набор зафиксирован для этого шага проверки. Теперь для каждого выбранного параметра определите измеримый листовой объект наблюдения.",
  currentParameter: "Настраиваем параметр",
  allMapped: "Измеримые объекты определены для всех параметров",
  allMappedHint: "Этот участок конструктора завершён. Следующий этап может продолжить построение системной типовой активности.",
  openCatalog: "Открыть каталог параметров",
  loading: "Загружаем конструктор параметров…",
  saving: "Сохраняем…",
  loadError: "Не удалось загрузить или сохранить конструктор параметров.",
  newTitle: "Название",
  newDescription: "Описание",
  technicalCode: "Технический код",
  dimension: "Измерение",
  valueType: "Тип значения",
  unit: "Каноническая единица",
  aggregation: "Агрегация",
  window: "Окно по умолчанию",
  allowNegative: "Разрешить отрицательные значения",
  choose: "Выберите…",
  createAndAdd: "Создать системный параметр и добавить",
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: RU,
  pl: EN,
  uk: EN,
  de: EN,
  es: EN,
  cs: EN,
};

const DIMENSIONS = [
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
  "pressure",
  "ratio",
  "sound_level",
  "illuminance",
] as const;

const VALUE_TYPES = ["numeric", "text", "boolean", "timestamp"] as const;
const AGGREGATIONS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;
const WINDOWS = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;

function localized(
  ru: string | null | undefined,
  en: string | null | undefined,
  locale: LocaleCode,
) {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function parameterMeta(item: ParameterItem) {
  return [
    item.parameterCode,
    item.dimensionCode,
    item.valueTypeCode,
    item.canonicalUnitLabel || item.canonicalUnitCode,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CuratorTemplateParameters({ signalId, locale, onChanged }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [state, setState] = useState<ParameterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("existing");
  const [search, setSearch] = useState("");
  const [confirmComment, setConfirmComment] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDimension, setNewDimension] = useState("");
  const [newValueType, setNewValueType] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newAggregation, setNewAggregation] = useState("");
  const [newWindow, setNewWindow] = useState("");
  const [newAllowNegative, setNewAllowNegative] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const requestUrl =
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`;

    void fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ParameterState | null;
        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || payload?.errorCode || `HTTP_${response.status}`,
          );
        }
        setState(payload);
        setAdding((payload.selected?.length ?? 0) === 0);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "UNKNOWN");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [locale, signalId]);

  async function reload() {
    const response = await fetch(
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`,
      { method: "GET", cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as ParameterState | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
    }
    setState(payload);
    return payload;
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalId, locale, ...body }),
        },
      );
      const payload = (await response.json().catch(() => null)) as ParameterState | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
      }
      setState(payload);
      setAdding(false);
      setSearch("");
      onChanged();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createAndAddParameter() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/activity-parameter-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          parameterCode: newCode,
          dimensionCode: newDimension,
          valueTypeCode: newValueType,
          canonicalUnitCode: newUnit,
          allowedUnitCodes: newUnit ? [newUnit] : [],
          aggregationMethodCode: newAggregation,
          defaultWindowCode: newWindow,
          allowNegative: newAllowNegative,
        }),
      });
      const created = (await response.json().catch(() => null)) as CreatedParameterResponse | null;
      if (!response.ok || !created?.ok || !created.definition?.id) {
        throw new Error(
          created?.error || created?.errorCode || `HTTP_${response.status}`,
        );
      }

      const selectResponse = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId,
            locale,
            action: "select_parameter",
            parameterDefinitionId: created.definition.id,
            selectionSource: "created",
          }),
        },
      );
      const selected = (await selectResponse.json().catch(() => null)) as ParameterState | null;
      if (!selectResponse.ok || !selected?.ok) {
        throw new Error(
          selected?.error || selected?.errorCode || `HTTP_${selectResponse.status}`,
        );
      }

      setState(selected);
      setAdding(false);
      setNewTitle("");
      setNewDescription("");
      setNewCode("");
      setNewDimension("");
      setNewValueType("");
      setNewUnit("");
      setNewAggregation("");
      setNewWindow("");
      setNewAllowNegative(false);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">
        {copy.loading}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {copy.loadError} {error}
      </div>
    );
  }

  const selected = state.selected ?? [];
  const available = state.available ?? [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? available.filter((item) =>
        [
          item.title,
          item.parameterCode,
          item.dimensionCode,
          item.valueTypeCode,
          item.canonicalUnitCode,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : available;

  const newParameterValid = Boolean(
    newTitle.trim() &&
      /^[a-z][a-z0-9_]{1,79}$/.test(newCode.trim()) &&
      newDimension &&
      newValueType &&
      /^[a-z][a-z0-9_]{0,79}$/.test(newUnit.trim()) &&
      newAggregation &&
      newWindow,
  );

  if (state.confirmed) {
    const nextParameter = selected.find((item) => !item.mappingCompleted) ?? null;

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-sm font-extrabold text-emerald-900">{copy.confirmed}</div>
          <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.confirmedHint}</div>
        </div>

        <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
          <div className="text-sm font-extrabold text-[#263044]">{copy.selectedTitle}</div>
          <div className="mt-3 space-y-2">
            {selected.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                    <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.mappingCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {item.mappingCompleted ? copy.mappingReady : copy.mappingPending}
                  </span>
                </div>
                {item.mappingCompleted ? (
                  <div className="mt-2 text-xs leading-5 text-[#65708d]">
                    {localized(item.mappingSummaryRu, item.mappingSummaryEn, locale)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {nextParameter ? (
          <>
            <div className="rounded-xl border border-[#cfd8ef] bg-white px-3 py-2 text-xs text-[#5f6679]">
              <span className="font-extrabold text-[#34405a]">{copy.currentParameter}: </span>
              <span className="font-bold text-[#263044]">{nextParameter.title}</span>
              <span className="ml-1 font-mono text-[#65708d]">· {nextParameter.parameterCode}</span>
            </div>
            <CuratorObjectBootstrap
              signalId={signalId}
              locale={locale}
              parameterDefinitionId={nextParameter.id}
              parameterTitle={nextParameter.title}
              parameterCode={nextParameter.parameterCode}
              onChanged={() => {
                void reload().catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "UNKNOWN");
                });
                onChanged();
              }}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="text-sm font-extrabold text-emerald-900">{copy.allMapped}</div>
            <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.allMappedHint}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-[#263044]">{copy.title}</div>
          <div className="mt-1 max-w-4xl text-xs leading-5 text-[#727991]">{copy.hint}</div>
        </div>
        <Link
          href={`/activity-templates?locale=${locale}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-xs font-bold text-[#34405a]"
        >
          {copy.openCatalog}
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        {copy.rule}
      </div>

      <div className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#65708d]">
        {copy.selectedTitle}
      </div>
      {selected.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-[#d8def0] bg-white px-3 py-4 text-xs text-[#7c8099]">
          {copy.noneSelected}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {selected.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                  <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                </div>
                <span className="rounded-full bg-[#eef3ff] px-2 py-1 text-[10px] font-bold text-[#3157b8]">
                  {copy.selectedBadge}
                </span>
              </div>
              {item.description ? (
                <div className="mt-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!adding && selected.length > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 py-2 text-sm font-bold text-[#34405a] disabled:opacity-40"
        >
          {copy.addAdditional}
        </button>
      ) : null}

      {adding ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("existing")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "existing" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.chooseExisting}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("new")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "new" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.createNew}
            </button>
          </div>

          {addMode === "existing" ? (
            <div className="mt-3 space-y-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
              />
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d8def0] px-3 py-4 text-xs text-[#7c8099]">
                  {copy.noAvailable}
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filtered.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e8f3] p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                        <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                        {item.description ? (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void post({
                            action: "select_parameter",
                            parameterDefinitionId: item.id,
                            selectionSource: "existing",
                          })
                        }
                        className="inline-flex min-h-9 items-center rounded-xl bg-[#3b6ef8] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {busy ? copy.saving : copy.addParameter}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newTitle}
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value.slice(0, 200))}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newDescription}
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value.slice(0, 4000))}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.technicalCode}
                <input
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value.toLowerCase().slice(0, 80))}
                  placeholder="duration"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.dimension}
                  <select value={newDimension} onChange={(event) => setNewDimension(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {DIMENSIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.valueType}
                  <select value={newValueType} onChange={(event) => setNewValueType(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {VALUE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.unit}
                  <input value={newUnit} onChange={(event) => setNewUnit(event.target.value.toLowerCase().slice(0, 80))} placeholder="minute" className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none" />
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.aggregation}
                  <select value={newAggregation} onChange={(event) => setNewAggregation(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {AGGREGATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.window}
                  <select value={newWindow} onChange={(event) => setNewWindow(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {WINDOWS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-[#4b5563]">
                  <input type="checkbox" checked={newAllowNegative} onChange={(event) => setNewAllowNegative(event.target.checked)} />
                  {copy.allowNegative}
                </label>
              </div>

              <button
                type="button"
                disabled={busy || !newParameterValid}
                onClick={() => void createAndAddParameter()}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? copy.saving : copy.createAndAdd}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="text-sm font-extrabold text-[#263044]">{copy.confirmTitle}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.confirmHint}</div>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.confirmComment}</div>
            <textarea
              value={confirmComment}
              onChange={(event) => setConfirmComment(event.target.value.slice(0, 1500))}
              placeholder={copy.confirmCommentHint}
              rows={3}
              className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{confirmComment.length}/1500</div>
          </label>
          <button
            type="button"
            disabled={busy || !confirmComment.trim()}
            onClick={() =>
              void post({
                action: "confirm_parameter_set",
                comment: confirmComment,
              })
            }
            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? copy.saving : copy.confirmButton}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 text-xs text-red-700">{copy.loadError} {error}</div>
      ) : null}
    </div>
  );
}
