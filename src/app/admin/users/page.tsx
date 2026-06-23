"use client";

import { useEffect, useMemo, useState } from "react";

type TierProjection = {
  tierCode: string;
  modelName: string | null;
  approximateInputTokensForAvailableBalance: number | null;
  approximateOutputTokensForAvailableBalance: number | null;
};

type AdminUserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  displayName: string;
  auth0Sub: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  adminRole: string | null;
  adminStatus: string;
  aiBalanceEur: number;
  aiReservedEur: number;
  aiAvailableEur: number;
  aiWalletStatus: string;
  aiAvailableApproxByTier: Record<string, TierProjection>;
  pointsBalance: number;
  pointsAvailableBalance: number;
  pointsReservedBalance: number;
  pointsSpentBalance: number;
  pointsWalletStatus: string;
  lastSeenAt: string | null;
  presenceStatus: "online" | "recent" | "offline" | "unknown" | string;
  presenceReason: string;
  activeSessionsCount: number;
  totalSessionsCount: number;
  lastSessionSeenAt: string | null;
  sessionsSource: string;
  lastActivityAt: string | null;
  lastAiUsageAt: string | null;
  totalAiSpentEur: number;
  totalAiTokens: number;
  aiUsageEventCount: number;
};

type AdminUsersResponse = {
  ok: boolean;
  routeMarker?: string;
  routeStatus?: string;
  users?: AdminUserRow[];
  meta?: {
    userCount?: number;
    limitations?: string[];
    schemaContract?: Record<string, unknown>;
  };
  errorCode?: string;
  errorMessage?: string;
};

type LoadState = "idle" | "loading" | "success" | "error";

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

function formatEur(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokens(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getPresenceLabel(row: AdminUserRow): string {
  if (row.presenceStatus === "online") {
    return "online";
  }

  if (row.presenceStatus === "recent") {
    return "recent";
  }

  if (row.presenceStatus === "offline") {
    return "offline";
  }

  return "unknown";
}

function getAdminRoleLabel(row: AdminUserRow): string {
  return row.adminRole ?? "user";
}

function getTierInputTokens(row: AdminUserRow, tierCode: string): string {
  return formatTokens(
    row.aiAvailableApproxByTier?.[tierCode]?.approximateInputTokensForAvailableBalance,
  );
}

export default function AdminUsersPage() {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [sortMode, setSortMode] = useState<
    "created_desc" | "last_activity_desc" | "ai_balance_desc" | "points_desc"
  >("created_desc");

  async function refreshUsers() {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const json = (await response.json()) as AdminUsersResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.errorMessage ?? "Admin users API failed.");
      }

      setRows(json.users ?? []);
      setLimitations(json.meta?.limitations ?? []);
      setLoadState("success");
    } catch (error) {
      setRows([]);
      setLimitations([]);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void refreshUsers();
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (onlyAdmins && !row.adminRole) {
          return false;
        }

        if (onlyOnline && row.presenceStatus !== "online") {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          row.displayName,
          row.email,
          row.name,
          row.auth0Sub,
          row.userId,
          row.adminRole,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((left, right) => {
        if (sortMode === "ai_balance_desc") {
          return right.aiAvailableEur - left.aiAvailableEur;
        }

        if (sortMode === "points_desc") {
          return right.pointsBalance - left.pointsBalance;
        }

        if (sortMode === "last_activity_desc") {
          return (
            Date.parse(right.lastActivityAt ?? right.updatedAt ?? right.createdAt ?? "") -
            Date.parse(left.lastActivityAt ?? left.updatedAt ?? left.createdAt ?? "")
          );
        }

        return Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "");
      });
  }, [onlyAdmins, onlyOnline, rows, searchText, sortMode]);

  const totalAiAvailable = useMemo(
    () => rows.reduce((sum, row) => sum + row.aiAvailableEur, 0),
    [rows],
  );

  const totalPoints = useMemo(
    () => rows.reduce((sum, row) => sum + row.pointsBalance, 0),
    [rows],
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Admin · Users
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Список пользователей
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Admin-only read model: пользователи, AI EUR ledger projection,
                пункты, активность и заготовка под presence/sessions. Таблица
                не выполняет записей и не вызывает OpenAI.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500"
              >
                Назад в админку
              </a>
              <button
                type="button"
                onClick={refreshUsers}
                disabled={loadState === "loading"}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Обновить
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Пользователи</p>
            <p className="mt-2 text-2xl font-semibold text-white">{rows.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Админы</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {rows.filter((row) => row.adminRole).length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">AI EUR доступно</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatEur(totalAiAvailable)}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Points total</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatPoints(totalPoints)}
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_160px]">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Поиск по email, name, auth0Sub, userId..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />

            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as typeof sortMode)
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="created_desc">Новые сверху</option>
              <option value="last_activity_desc">Последняя активность</option>
              <option value="ai_balance_desc">AI balance</option>
              <option value="points_desc">Points</option>
            </select>

            <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={onlyAdmins}
                onChange={(event) => setOnlyAdmins(event.target.checked)}
              />
              Только admin
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={onlyOnline}
                onChange={(event) => setOnlyOnline(event.target.checked)}
              />
              Только online
            </label>
          </div>

          {limitations.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">
              <p className="font-semibold">Ограничения текущего MVP:</p>
              <ul className="mt-2 list-inside list-disc">
                {limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {loadState === "loading" ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Загружаю список пользователей...
          </section>
        ) : null}

        {loadState === "error" ? (
          <section className="rounded-3xl border border-red-900/70 bg-red-950/40 p-6 text-red-100">
            <p className="font-semibold">Ошибка загрузки</p>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </section>
        ) : null}

        {loadState === "success" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Пользователь</th>
                    <th className="px-4 py-4">Роль</th>
                    <th className="px-4 py-4">AI EUR</th>
                    <th className="px-4 py-4">Nano / Standard / Pro</th>
                    <th className="px-4 py-4">Points</th>
                    <th className="px-4 py-4">Активность</th>
                    <th className="px-4 py-4">Сессии</th>
                    <th className="px-4 py-4">AI usage</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredRows.map((row) => (
                    <tr key={row.userId} className="align-top hover:bg-slate-800/40">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{row.displayName}</p>
                        <p className="mt-1 text-slate-300">{row.email ?? "—"}</p>
                        <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                          {row.auth0Sub ?? row.userId}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Created: {formatDateTime(row.createdAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
                          {getAdminRoleLabel(row)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {formatEur(row.aiAvailableEur)} EUR
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          balance {formatEur(row.aiBalanceEur)} · reserved{" "}
                          {formatEur(row.aiReservedEur)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.aiWalletStatus}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-300">
                          Nano: {getTierInputTokens(row, "nano")}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">
                          Standard: {getTierInputTokens(row, "standard")}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">
                          Pro: {getTierInputTokens(row, "pro")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          approx input tokens
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {formatPoints(row.pointsBalance)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          available {formatPoints(row.pointsAvailableBalance)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.pointsWalletStatus}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {getPresenceLabel(row)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          last seen: {formatDateTime(row.lastSeenAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          last activity: {formatDateTime(row.lastActivityAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {row.activeSessionsCount} / {row.totalSessionsCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          last: {formatDateTime(row.lastSessionSeenAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.sessionsSource}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {formatEur(row.totalAiSpentEur)} EUR
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.aiUsageEventCount} events ·{" "}
                          {formatTokens(row.totalAiTokens)} tokens
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          last: {formatDateTime(row.lastAiUsageAt)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length === 0 ? (
              <div className="border-t border-slate-800 p-6 text-sm text-slate-400">
                Нет пользователей под текущие фильтры.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
