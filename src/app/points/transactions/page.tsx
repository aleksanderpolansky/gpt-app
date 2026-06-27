"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPointsText } from "../../../i18n/messages";

type PointsLocale = NonNullable<Parameters<typeof getPointsText>[1]>;

const pointsSupportedLocales = ["ru", "pl", "en", "es", "uk", "de", "cs"] as const;

function getPointsLocaleFromLocation(): PointsLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("locale") ?? params.get("lang") ?? "en";

  if (pointsSupportedLocales.includes(candidate as PointsLocale)) {
    return candidate as PointsLocale;
  }

  return "en";
}

const pointsText = (key: Parameters<typeof getPointsText>[0]) =>
  getPointsText(key, getPointsLocaleFromLocation());

type PointsTransaction = {
  readonly id?: string | null;
  readonly transaction_type?: string | null;
  readonly direction?: string | null;
  readonly amount?: number | string | null;
  readonly balance_before?: number | string | null;
  readonly balance_after?: number | string | null;
  readonly source_type?: string | null;
  readonly description?: string | null;
  readonly status?: string | null;
  readonly created_at?: string | null;
  readonly organizations?: {
    readonly organization_name?: string | null;
  } | null;
};

type PointsTransactionsResponse = {
  readonly ok?: boolean;
  readonly transactions?: PointsTransaction[];
  readonly error?: string;
};

function formatPoints(value: unknown): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(parsed);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return pointsText("points.transactions.noDate");
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

function getTransactionKind(transaction: PointsTransaction): string {
  const direction = (transaction.direction ?? "").toLowerCase();
  const type = (transaction.transaction_type ?? "").toLowerCase();

  if (
    direction.includes("debit") ||
    direction.includes("out") ||
    type.includes("spend") ||
    type.includes("burn") ||
    type.includes("redeem")
  ) {
    return pointsText("points.transactions.kindRedeem");
  }

  if (
    direction.includes("credit") ||
    direction.includes("in") ||
    type.includes("award") ||
    type.includes("earn") ||
    type.includes("confirm")
  ) {
    return pointsText("points.transactions.kindAccrual");
  }

  return pointsText("points.transactions.kindOperation");
}

export default function PointsTransactionsPage() {
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTransactions() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/points/transactions", {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data = (await response.json()) as PointsTransactionsResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? pointsText("points.transactions.loadError"));
      }

      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : pointsText("points.transactions.unavailableError"),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  const totalVisibleAmount = useMemo(() => {
    return transactions.reduce((sum, transaction) => {
      const parsed = Number(transaction.amount);

      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0);
  }, [transactions]);

  return (
    <main className="min-h-screen bg-[#f0f2f7] p-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
              {pointsText("points.transactions.eyebrow")}
            </p>
            <h1 className="mt-2 text-[24px] font-bold">
              {pointsText("points.transactions.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#5a5f7a]">
              {pointsText("points.transactions.description")}


            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {pointsText("points.transactions.backToWorkspace")}
            </Link>
            <button
              type="button"
              onClick={() => void loadTransactions()}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? pointsText("points.transactions.refreshing") : pointsText("points.transactions.refresh")}
            </button>
          </div>
        </div>

        <section className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {pointsText("points.transactions.operationsLabel")}
            </div>
            <div className="mt-2 text-[24px] font-bold">
              {transactions.length}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {pointsText("points.transactions.visibleAmountLabel")}
            </div>
            <div className="mt-2 text-[24px] font-bold">
              {formatPoints(totalVisibleAmount)}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#7c8099]">
              {pointsText("points.transactions.dataSourceLabel")}
            </div>
            <div className="mt-2 text-[14px] font-bold">
              /api/points/transactions
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-[#ffd5d5] bg-[#fff7f7] p-4 text-[14px] font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && isLoading ? (
          <div className="rounded-2xl bg-white p-5 text-[14px] font-semibold text-[#5a5f7a] shadow-sm">
            {pointsText("points.transactions.loading")}
          </div>
        ) : null}

        {!errorMessage && !isLoading && transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-5 text-[14px] font-semibold text-[#64748b] shadow-sm">
            {pointsText("points.transactions.empty")}
          </div>
        ) : null}

        {!errorMessage && transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <article
                key={transaction.id ?? `${transaction.created_at}-${transaction.amount}`}
                className="rounded-2xl border border-[#e5e7ef] bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold">
                      {getTransactionKind(transaction)}:{" "}
                      {formatPoints(transaction.amount)} {pointsText("points.transactions.pointsUnit")}
                    </h2>

                    <p className="mt-1 text-[13px] leading-5 text-[#5a5f7a]">
                      {transaction.description ||
                        transaction.source_type ||
                        pointsText("points.transactions.noDescription")}
                    </p>

                    {transaction.organizations?.organization_name ? (
                      <p className="mt-1 text-[12px] font-semibold text-[#7c8099]">
                        {pointsText("points.transactions.businessPrefix")} {transaction.organizations.organization_name}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-[#4a4f6a]">
                    {transaction.status ?? "status?"} {" | "}
                    {formatDate(transaction.created_at)}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-[12px] text-[#64748b] md:grid-cols-3">
                  <div>
                    before:{" "}
                    <span className="font-mono">
                      {formatPoints(transaction.balance_before)}
                    </span>
                  </div>
                  <div>
                    after:{" "}
                    <span className="font-mono">
                      {formatPoints(transaction.balance_after)}
                    </span>
                  </div>
                  <div>
                    type:{" "}
                    <span className="font-mono">
                      {transaction.transaction_type ?? "unknown"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
