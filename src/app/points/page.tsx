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

  if (direction === "reserve") {
    return "Резерв";
  }

  if (direction === "release") {
    return "Возврат из резерва";
  }

  return direction ?? "—";
}

function getTransactionSign(direction: string | null | undefined) {
  if (direction === "credit" || direction === "release") {
    return "+";
  }

  if (direction === "debit" || direction === "reserve") {
    return "-";
  }

  return "";
}

function getTransactionHumanTitle(transaction: PointsTransaction) {
  const transactionType = transaction.transaction_type?.toLowerCase() ?? "";
  const sourceType = transaction.source_type?.toLowerCase() ?? "";
  const description = transaction.description?.toLowerCase() ?? "";
  const direction = transaction.direction?.toLowerCase() ?? "";

  const combined = `${transactionType} ${sourceType} ${description}`;

  if (
    combined.includes("purchase") &&
    (direction === "credit" || combined.includes("award"))
  ) {
    return "Начислено за подтверждённую покупку";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("reserve") || direction === "reserve")
  ) {
    return "Зарезервировано под сертификат";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("cancel") ||
      combined.includes("release") ||
      direction === "release")
  ) {
    return "Возвращено после отмены сертификата";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("redeem") || combined.includes("usage"))
  ) {
    return "Списано при использовании сертификата";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("expire") || combined.includes("expiration"))
  ) {
    return "Списано после истечения срока сертификата";
  }

  if (direction === "credit") {
    return "Начисление POINT";
  }

  if (direction === "debit") {
    return "Списание POINT";
  }

  return "Операция POINT";
}

function getTransactionStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "—";
  }

  if (status === "completed") {
    return "Завершено";
  }

  if (status === "pending") {
    return "В обработке";
  }

  if (status === "failed") {
    return "Ошибка";
  }

  if (status === "cancelled") {
    return "Отменено";
  }

  return status;
}

function getTransactionTone(direction: string | null | undefined) {
  if (direction === "credit" || direction === "release") {
    return {
      background: "#f0fff4",
      border: "#b7ebc6",
      color: "#137333",
    };
  }

  if (direction === "debit" || direction === "reserve") {
    return {
      background: "#fff8e6",
      border: "#f7d58a",
      color: "#8a5a00",
    };
  }

  return {
    background: "#f7f7f7",
    border: "#ddd",
    color: "#444",
  };
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
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Мои POINTS</h1>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
          Здесь отображается общий баланс пользователя на платформе и понятная
          история операций: начисление, резервирование, возврат и списание
          POINTS.
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
          Загрузка POINTS...
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
                Текущий доступный баланс
              </div>
              <div style={{ fontSize: "40px", fontWeight: 700 }}>
                {formatPoints(wallet?.balance)} POINT
              </div>
              <div style={{ color: "#777", marginTop: "10px", fontSize: "14px" }}>
                POINTS — это бонусные единицы внутри платформы, не деньги и не
                средство вывода средств.
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
                  История операций POINTS
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666" }}>
                  Человеческое объяснение каждой операции плюс технические
                  данные для audit.
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
                Операций POINTS пока нет.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "980px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>Дата</th>
                      <th style={{ padding: "12px 16px" }}>Смысл операции</th>
                      <th style={{ padding: "12px 16px" }}>Движение</th>
                      <th style={{ padding: "12px 16px" }}>POINT</th>
                      <th style={{ padding: "12px 16px" }}>Баланс</th>
                      <th style={{ padding: "12px 16px" }}>Предприятие</th>
                      <th style={{ padding: "12px 16px" }}>Статус</th>
                      <th style={{ padding: "12px 16px" }}>Audit source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const organizationName =
                        transaction.organizations?.organization_name ?? "—";
                      const tone = getTransactionTone(transaction.direction);

                      return (
                        <tr
                          key={transaction.id}
                          style={{ borderTop: "1px solid #eee" }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            {formatDate(transaction.created_at)}
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 700 }}>
                              {getTransactionHumanTitle(transaction)}
                            </div>
                            <div
                              style={{
                                color: "#777",
                                fontSize: "13px",
                                marginTop: "4px",
                              }}
                            >
                              {transaction.description ??
                                transaction.transaction_type ??
                                "—"}
                            </div>
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: "999px",
                                background: tone.background,
                                border: `1px solid ${tone.border}`,
                                color: tone.color,
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getDirectionLabel(transaction.direction)}
                            </span>
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
                            {getTransactionStatusLabel(transaction.status)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#666",
                              fontSize: "13px",
                            }}
                          >
                            <div>
                              <strong>type:</strong>{" "}
                              {transaction.transaction_type ?? "—"}
                            </div>
                            <div>
                              <strong>source:</strong>{" "}
                              {transaction.source_type ?? "—"}
                            </div>
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