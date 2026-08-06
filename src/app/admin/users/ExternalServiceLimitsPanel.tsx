"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LimitOperation = "search" | "resolve";

type LimitSetting = {
  provider: "GOOGLE_PLACES_NEW";
  operation: LimitOperation;
  enabled: boolean;
  userScopeType: "user_hour" | "user_day";
  userLimit: number;
  globalDayLimit: number;
  globalMonthLimit: number;
  updatedAt: string | null;
  updatedByAppUserId: string | null;
};

type LimitUsage = {
  operation: LimitOperation;
  currentHourTotal: number;
  currentDayTotal: number;
  currentMonthTotal: number;
};

type LimitsResponse = {
  ok?: boolean;
  settings?: LimitSetting[];
  usage?: LimitUsage[];
  canEdit?: boolean;
  updatedBy?: {
    appUserId: string;
    role: string;
  } | null;
  errorMessage?: string;
};

type EditableLimits = {
  searchEnabled: boolean;
  searchUserHourLimit: number;
  searchGlobalDayLimit: number;
  searchGlobalMonthLimit: number;
  resolveEnabled: boolean;
  resolveUserDayLimit: number;
  resolveGlobalDayLimit: number;
  resolveGlobalMonthLimit: number;
};

const SAFE_DEFAULTS: EditableLimits = {
  searchEnabled: true,
  searchUserHourLimit: 30,
  searchGlobalDayLimit: 500,
  searchGlobalMonthLimit: 9000,
  resolveEnabled: true,
  resolveUserDayLimit: 10,
  resolveGlobalDayLimit: 100,
  resolveGlobalMonthLimit: 3000,
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function percent(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (used / limit) * 100));
}

function asPositiveInteger(value: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return 0;
  }

  return parsedValue;
}

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const usagePercent = percent(used, limit);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{formatNumber(used)} использовано</span>
        <span>{usagePercent.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={[
            "h-full rounded-full transition-all",
            usagePercent >= 90
              ? "bg-red-500"
              : usagePercent >= 70
                ? "bg-amber-400"
                : "bg-cyan-400",
          ].join(" ")}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  help: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(asPositiveInteger(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>
    </label>
  );
}

export default function ExternalServiceLimitsPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [values, setValues] = useState<EditableLimits>(SAFE_DEFAULTS);
  const [usage, setUsage] = useState<LimitUsage[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchUsage = useMemo(
    () => usage.find((row) => row.operation === "search") ?? null,
    [usage],
  );
  const resolveUsage = useMemo(
    () => usage.find((row) => row.operation === "resolve") ?? null,
    [usage],
  );

  const hasFreeTierWarning =
    values.searchGlobalMonthLimit > 10000 ||
    values.resolveGlobalMonthLimit > 10000;

  const validationError = useMemo(() => {
    const allValues = [
      values.searchUserHourLimit,
      values.searchGlobalDayLimit,
      values.searchGlobalMonthLimit,
      values.resolveUserDayLimit,
      values.resolveGlobalDayLimit,
      values.resolveGlobalMonthLimit,
    ];

    if (allValues.some((value) => !Number.isInteger(value) || value < 1)) {
      return "Все лимиты должны быть целыми числами не меньше 1.";
    }

    if (values.searchGlobalDayLimit > values.searchGlobalMonthLimit) {
      return "Дневной лимит поиска не может быть больше месячного.";
    }

    if (values.resolveGlobalDayLimit > values.resolveGlobalMonthLimit) {
      return "Дневной лимит получения адреса не может быть больше месячного.";
    }

    return null;
  }, [values]);

  const loadLimits = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/external-service-limits", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      const json = (await response.json()) as LimitsResponse;

      if (!response.ok || json.ok !== true) {
        throw new Error(json.errorMessage ?? "Не удалось загрузить лимиты.");
      }

      const search = json.settings?.find((row) => row.operation === "search");
      const resolve = json.settings?.find((row) => row.operation === "resolve");

      if (!search || !resolve) {
        throw new Error("В базе отсутствуют настройки Google Places.");
      }

      setValues({
        searchEnabled: search.enabled,
        searchUserHourLimit: search.userLimit,
        searchGlobalDayLimit: search.globalDayLimit,
        searchGlobalMonthLimit: search.globalMonthLimit,
        resolveEnabled: resolve.enabled,
        resolveUserDayLimit: resolve.userLimit,
        resolveGlobalDayLimit: resolve.globalDayLimit,
        resolveGlobalMonthLimit: resolve.globalMonthLimit,
      });
      setUsage(json.usage ?? []);
      setCanEdit(json.canEdit === true);
      setLastUpdatedAt(
        [search.updatedAt, resolve.updatedAt]
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка загрузки.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLimits();
  }, [loadLimits]);

  async function saveLimits() {
    if (validationError || !canEdit) {
      return;
    }

    if (
      hasFreeTierWarning &&
      !window.confirm(
        "Один из месячных лимитов выше 10 000 запросов. Это может выйти за обсуждавшийся бесплатный порог Google Places. Сохранить?",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/external-service-limits", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });
      const json = (await response.json()) as LimitsResponse;

      if (!response.ok || json.ok !== true) {
        throw new Error(json.errorMessage ?? "Не удалось сохранить лимиты.");
      }

      setMessage("Системные лимиты Google Places сохранены и уже действуют.");
      await loadLimits();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка сохранения.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-900/60 bg-slate-900 shadow-2xl">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left hover:bg-slate-800/40"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Системные лимиты внешних сервисов
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Google Places</h2>
          <p className="mt-1 text-sm text-slate-400">
            Управление расходом платных подсказок адресов без изменения кода и повторного развёртывания.
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
          {isOpen ? "Свернуть" : "Развернуть"}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-800 p-5">
          {isLoading ? (
            <p className="text-sm text-slate-400">Загружаю настройки и расход...</p>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-900/70 bg-emerald-950/40 p-4 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">Поиск адресов</h3>
                      <p className="mt-1 text-xs text-slate-500">Google AutocompletePlacesRequest</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={values.searchEnabled}
                        disabled={!canEdit || isSaving}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            searchEnabled: event.target.checked,
                          }))
                        }
                      />
                      Включено
                    </label>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <NumberField
                      label="На пользователя в час"
                      value={values.searchUserHourLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          searchUserHourLimit: value,
                        }))
                      }
                      help="Защищает от частого ввода и автоматических запросов одного аккаунта."
                    />
                    <NumberField
                      label="На ARCTor в день"
                      value={values.searchGlobalDayLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          searchGlobalDayLimit: value,
                        }))
                      }
                      help="Общий предел всех пользователей за сутки UTC."
                    />
                    <NumberField
                      label="На ARCTor в месяц"
                      value={values.searchGlobalMonthLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          searchGlobalMonthLimit: value,
                        }))
                      }
                      help="Главный месячный предел расходов на подсказки."
                    />
                  </div>

                  <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm font-medium text-slate-200">Текущий расход</p>
                    <p className="text-xs text-slate-400">
                      За текущий час: {formatNumber(searchUsage?.currentHourTotal ?? 0)}
                    </p>
                    <ProgressBar
                      used={searchUsage?.currentDayTotal ?? 0}
                      limit={values.searchGlobalDayLimit}
                    />
                    <ProgressBar
                      used={searchUsage?.currentMonthTotal ?? 0}
                      limit={values.searchGlobalMonthLimit}
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">Получение выбранного адреса</h3>
                      <p className="mt-1 text-xs text-slate-500">Google GetPlaceRequest</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={values.resolveEnabled}
                        disabled={!canEdit || isSaving}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            resolveEnabled: event.target.checked,
                          }))
                        }
                      />
                      Включено
                    </label>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <NumberField
                      label="На пользователя в день"
                      value={values.resolveUserDayLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          resolveUserDayLimit: value,
                        }))
                      }
                      help="Количество окончательно выбранных адресов одним аккаунтом."
                    />
                    <NumberField
                      label="На ARCTor в день"
                      value={values.resolveGlobalDayLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          resolveGlobalDayLimit: value,
                        }))
                      }
                      help="Общий дневной предел получения страны и координат."
                    />
                    <NumberField
                      label="На ARCTor в месяц"
                      value={values.resolveGlobalMonthLimit}
                      disabled={!canEdit || isSaving}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          resolveGlobalMonthLimit: value,
                        }))
                      }
                      help="Главный месячный предел запросов подробностей."
                    />
                  </div>

                  <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm font-medium text-slate-200">Текущий расход</p>
                    <ProgressBar
                      used={resolveUsage?.currentDayTotal ?? 0}
                      limit={values.resolveGlobalDayLimit}
                    />
                    <ProgressBar
                      used={resolveUsage?.currentMonthTotal ?? 0}
                      limit={values.resolveGlobalMonthLimit}
                    />
                  </div>
                </article>
              </div>

              {hasFreeTierWarning ? (
                <div className="mt-4 rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm leading-6 text-amber-100">
                  Месячный лимит выше 10 000 запросов. Это может выйти за обсуждавшийся бесплатный порог Google Places.
                </div>
              ) : null}

              {validationError ? (
                <div className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-100">
                  {validationError}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-xs leading-5 text-slate-500">
                  <p>После достижения лимита Google не вызывается, а форма переключается на ручной ввод.</p>
                  <p>Последнее изменение: {formatDateTime(lastUpdatedAt)}</p>
                  {!canEdit ? <p>Текущая роль может только просматривать настройки.</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadLimits()}
                    disabled={isSaving}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500 disabled:opacity-50"
                  >
                    Обновить расход
                  </button>
                  <button
                    type="button"
                    onClick={() => setValues(SAFE_DEFAULTS)}
                    disabled={!canEdit || isSaving}
                    className="rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
                  >
                    Вернуть безопасные значения
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveLimits()}
                    disabled={!canEdit || isSaving || Boolean(validationError)}
                    className="rounded-xl bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Сохраняю..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
