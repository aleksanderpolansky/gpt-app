"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TreasuryResponse = {
  ok?: boolean;
  routeMarker?: string;
  routeStatus?: string;
  canEdit?: boolean;
  providerBalance?: {
    id?: string;
    provider?: string;
    balanceUsd?: number | null;
    currency?: string;
    sourceCode?: string;
    sourceNote?: string | null;
    capturedAt?: string;
    createdAt?: string;
    balanceEur?: number | null;
  } | null;
  fx?: {
    source?: string;
    priceSnapshotId?: string;
    modelName?: string;
    usdToEurRate?: number;
    validFrom?: string;
  };
  allocation?: {
    allocatedUserAiEur?: number;
    walletCount?: number;
    projectedUnallocatedEur?: number | null;
    deficit?: boolean;
  };
  rules?: {
    creditBalanceOfficialApiAvailable?: boolean;
    ownerWalletsExcludedFromAllocation?: boolean;
    providerBalanceSource?: string;
  };
  errorMessage?: string;
};

type Props = {
  allocatedAiEur: number;
  forecastAllocatedAiEur: number;
};

function formatEur(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatDateTime(value: string | null | undefined): string {
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

export default function OpenAiTreasuryCard({
  allocatedAiEur,
  forecastAllocatedAiEur,
}: Props) {
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTreasury = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/openai-treasury", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const json = (await response.json()) as TreasuryResponse;

      if (!response.ok || json.ok !== true) {
        throw new Error(
          json.errorMessage ?? "Не удалось загрузить резерв OpenAI.",
        );
      }

      setData(json);

      if (!isEditing) {
        const balanceUsd = json.providerBalance?.balanceUsd;

        setBalanceInput(
          typeof balanceUsd === "number" && Number.isFinite(balanceUsd)
            ? String(balanceUsd)
            : "",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isEditing]);

  useEffect(() => {
    void loadTreasury();
  }, [loadTreasury, allocatedAiEur]);

  const providerBalanceEur = data?.providerBalance?.balanceEur ?? null;

  const liveProjectedEur = useMemo(() => {
    if (
      typeof providerBalanceEur !== "number" ||
      !Number.isFinite(providerBalanceEur)
    ) {
      return null;
    }

    return (
      Math.round(
        (providerBalanceEur - forecastAllocatedAiEur) * 1_000_000,
      ) / 1_000_000
    );
  }, [forecastAllocatedAiEur, providerBalanceEur]);

  const draftDiffersFromSaved =
    Math.abs(forecastAllocatedAiEur - allocatedAiEur) >= 0.0000005;

  async function saveBalance() {
    const parsed = Number(balanceInput.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < -100000 || parsed > 100000) {
      setErrorMessage("Баланс OpenAI должен быть числом в USD.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/openai-treasury", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          balanceUsd: Math.round(parsed * 1_000_000) / 1_000_000,
          capturedAt: new Date().toISOString(),
          sourceNote:
            "Confirmed manually from OpenAI Platform credit balance.",
        }),
      });

      const json = (await response.json()) as TreasuryResponse;

      if (!response.ok || json.ok !== true) {
        throw new Error(
          json.errorMessage ?? "Не удалось сохранить баланс OpenAI.",
        );
      }

      setData(json);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const negative =
    typeof liveProjectedEur === "number" && liveProjectedEur < 0;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Резерв OpenAI</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading
              ? "…"
              : formatUsd(data?.providerBalance?.balanceUsd)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ≈ {formatEur(providerBalanceEur)} EUR по утверждённому FX
          </p>
        </div>

        {data?.canEdit ? (
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-cyan-500"
            title="Обновить фактический Credit balance из OpenAI Platform"
          >
            ✎
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
          <label className="block text-xs font-medium text-slate-300">
            Credit balance OpenAI, USD
            <input
              value={balanceInput}
              onChange={(event) => setBalanceInput(event.target.value)}
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveBalance()}
              className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
            >
              {isSaving ? "Сохраняю…" : "Сохранить"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-800 pt-3 text-xs leading-5">
        <p className="text-slate-400">
          Распределено пользователям:{" "}
          <span className="font-semibold text-slate-200">
            {formatEur(forecastAllocatedAiEur)} EUR
          </span>
          {draftDiffersFromSaved ? (
            <span className="ml-1 text-amber-300">(план)</span>
          ) : null}
        </p>

        <p className={negative ? "font-semibold text-red-400" : "font-semibold text-emerald-300"}>
          Прогнозируемый остаток:{" "}
          {formatEur(liveProjectedEur)} EUR
        </p>

        {negative ? (
          <p className="text-red-400">
            Распределено больше, чем обеспечено текущим резервом OpenAI.
          </p>
        ) : null}

        <p className="mt-1 text-slate-500">
          снимок: {formatDateTime(data?.providerBalance?.capturedAt)}
        </p>
        <p className="text-slate-600">
          OpenAI не предоставляет документированный API Credit balance;
          значение подтверждается по OpenAI Platform.
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
      ) : null}
    </article>
  );
}
