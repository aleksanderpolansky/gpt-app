"use client";

import { useEffect, useState } from "react";

type Wallet = {
  id?: string;
  user_id: string;
  balance: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

type Organization = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
};

type PointsTransaction = {
  id: string;
  wallet_id: string | null;
  user_id: string;
  organization_id: string | null;
  transaction_type: string | null;
  direction: string | null;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  source_type: string | null;
  source_id: string | null;
  certificate_id: string | null;
  offer_id: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  points_currency_code: string | null;
  reference_currency: string | null;
  reference_value_per_point: number | null;
  reference_value_total: number | null;
  organizations?: Organization | null;
};

type WalletApiResponse = {
  ok: boolean;
  wallet?: Wallet;
  error?: string;
};

type TransactionsApiResponse = {
  ok: boolean;
  transactions?: PointsTransaction[];
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getDirectionLabel(direction: string | null | undefined) {
  if (direction === "credit") {
    return "Начисление";
  }

  if (direction === "debit") {
    return "Списание";
  }

  return direction ?? "—";
}

function getTransactionSign(direction: string | null | undefined) {
  if (direction === "credit") {
    return "+";
  }

  if (direction === "debit") {
    return "-";
  }

  return "";
}

export default function PointsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadPointsData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        fetch("/api/points/wallet", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/points/transactions", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const walletJson = (await walletResponse.json()) as WalletApiResponse;
      const transactionsJson =
        (await transactionsResponse.json()) as TransactionsApiResponse;

      if (!walletResponse.ok || !walletJson.ok) {
        throw new Error(walletJson.error ?? "Cannot load points wallet");
      }

      if (!transactionsResponse.ok || !transactionsJson.ok) {
        throw new Error(
          transactionsJson.error ?? "Cannot load points transactions"
        );
      }

      setWallet(walletJson.wallet ?? null);
      setTransactions(transactionsJson.transactions ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown loading error";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPointsData();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Мои points</h1>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
          Здесь отображается общий баланс пользователя на платформе и история
          операций начисления или списания points.
        </p>
      </div>

      {isLoading ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "24px",
            background: "#fff",
          }}
        >
          Загрузка points...
        </section>
      ) : errorMessage ? (
        <section
          style={{
            border: "1px solid #f2b8b5",
            borderRadius: "12px",
            padding: "24px",
            background: "#fff5f5",
            color: "#a40000",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Ошибка загрузки</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadPointsData()}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #a40000",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Повторить
          </button>
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "16px",
                padding: "24px",
                background: "#fff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#666", marginBottom: "8px" }}>
                Текущий баланс
              </div>
              <div style={{ fontSize: "40px", fontWeight: 700 }}>
                {formatPoints(wallet?.balance)} POINT
              </div>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "16px",
                padding: "24px",
                background: "#fff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#666", marginBottom: "8px" }}>
                Статус wallet
              </div>
              <div style={{ fontSize: "24px", fontWeight: 600 }}>
                {wallet?.status ?? "not_created"}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "16px",
                padding: "24px",
                background: "#fff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#666", marginBottom: "8px" }}>
                Количество операций
              </div>
              <div style={{ fontSize: "24px", fontWeight: 600 }}>
                {transactions.length}
              </div>
            </div>
          </section>

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: "16px",
              background: "#fff",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  История операций
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666" }}>
                  Последние начисления и списания points.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadPointsData()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Обновить
              </button>
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: "24px", color: "#666" }}>
                Операций points пока нет.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "900px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>Дата</th>
                      <th style={{ padding: "12px 16px" }}>Тип</th>
                      <th style={{ padding: "12px 16px" }}>Операция</th>
                      <th style={{ padding: "12px 16px" }}>POINT</th>
                      <th style={{ padding: "12px 16px" }}>Баланс</th>
                      <th style={{ padding: "12px 16px" }}>Предприятие</th>
                      <th style={{ padding: "12px 16px" }}>Источник</th>
                      <th style={{ padding: "12px 16px" }}>Описание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const organizationName =
                        transaction.organizations?.organization_name ?? "—";

                      return (
                        <tr
                          key={transaction.id}
                          style={{ borderTop: "1px solid #eee" }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            {formatDate(transaction.created_at)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {transaction.transaction_type ?? "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {getDirectionLabel(transaction.direction)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getTransactionSign(transaction.direction)}
                            {formatPoints(transaction.amount)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatPoints(transaction.balance_before)} →{" "}
                            {formatPoints(transaction.balance_after)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {organizationName}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {transaction.source_type ?? "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {transaction.description ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}