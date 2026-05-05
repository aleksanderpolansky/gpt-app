"use client";

import { useEffect, useState } from "react";

type Wallet = {
  id?: string;
  user_id: string;
  balance: number;
  available_balance?: number | null;
  reserved_balance?: number | null;
  spent_balance?: number | null;
  released_balance?: number | null;
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

  available_balance_before: number | null;
  available_balance_after: number | null;

  reserved_balance_before: number | null;
  reserved_balance_after: number | null;

  spent_balance_before: number | null;
  spent_balance_after: number | null;

  released_balance_before: number | null;
  released_balance_after: number | null;

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

function toNumber(value: number | null | undefined) {
  if (typeof value !== "number") {
    return 0;
  }

  return value;
}

function calculateBalance(
  available: number | null | undefined,
  reserved: number | null | undefined
) {
  return toNumber(available) + toNumber(reserved);
}

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

  if (direction === "charge") {
    return "Окончательное списание";
  }

  return direction ?? "—";
}

function getTransactionSign(direction: string | null | undefined) {
  if (direction === "credit" || direction === "release") {
    return "+";
  }

  if (
    direction === "debit" ||
    direction === "reserve" ||
    direction === "charge"
  ) {
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
    return "Возвращено на счёт после отмены";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("redeem") || combined.includes("redemption"))
  ) {
    return "Списано за использование сертификата";
  }

  if (
    combined.includes("certificate") &&
    (combined.includes("expire") || combined.includes("expiration"))
  ) {
    return "Окончательно списано после истечения срока сертификата";
  }

  if (direction === "credit") {
    return "Начисление POINT";
  }

  if (direction === "debit" || direction === "charge") {
    return "Списание POINT";
  }

  return "Операция POINT";
}

function getLatestTransactionText(transaction: PointsTransaction | undefined) {
  if (!transaction) {
    return "Операций пока нет";
  }

  return getTransactionHumanTitle(transaction);
}

function getTransactionStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "—";
  }

  if (status === "completed") {
    return "Завершено";
  }

  if (status === "confirmed") {
    return "Подтверждено";
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

  if (
    direction === "debit" ||
    direction === "reserve" ||
    direction === "charge"
  ) {
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

function BalanceLine({
  label,
  before,
  after,
  isPrimary = false,
}: {
  label: string;
  before: number | null | undefined;
  after: number | null | undefined;
  isPrimary?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        gap: "8px",
        fontSize: isPrimary ? "14px" : "13px",
        lineHeight: "1.35",
      }}
    >
      <span style={{ color: isPrimary ? "#111" : "#666", fontWeight: 600 }}>
        {label}
      </span>
      <strong style={{ whiteSpace: "nowrap" }}>
        {formatPoints(before)} → {formatPoints(after)}
      </strong>
    </div>
  );
}

export default function PointsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentBalance = calculateBalance(
    wallet?.available_balance,
    wallet?.reserved_balance
  );

  const latestTransaction = transactions[0];

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
    <main style={{ padding: "32px", maxWidth: "1240px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Мои POINTS</h1>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
          Здесь отображается баланс POINTS, доступные POINTS, резерв под
          сертификаты и audit-история всех операций.
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                border: "2px solid #111",
                borderRadius: "16px",
                padding: "24px",
                background: "#fff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ color: "#444", marginBottom: "8px" }}>Баланс</div>
              <div style={{ fontSize: "34px", fontWeight: 800 }}>
                {formatPoints(currentBalance)} POINT
              </div>
              <div style={{ color: "#666", marginTop: "10px", fontSize: "14px" }}>
                Баланс = доступно сейчас + зарезервировано под активные
                сертификаты.
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
                Доступно сейчас
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>
                {formatPoints(wallet?.available_balance)} POINT
              </div>
              <div style={{ color: "#777", marginTop: "10px", fontSize: "14px" }}>
                Можно использовать для новых сертификатов.
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
              <div style={{ color: "#666", marginBottom: "8px" }}>В резерве</div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>
                {formatPoints(wallet?.reserved_balance)} POINT
              </div>
              <div style={{ color: "#777", marginTop: "10px", fontSize: "14px" }}>
                Зарезервировано под активные сертификаты.
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
                Начислено / потрачено за всё время
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700 }}>
                {formatPoints(wallet?.balance)} /{" "}
                {formatPoints(wallet?.spent_balance)} POINT
              </div>
              <div style={{ color: "#777", marginTop: "10px", fontSize: "14px" }}>
                Архивная статистика: сколько начислено всего и сколько
                окончательно использовано или списано.
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
                Последняя транзакция
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>
                {getLatestTransactionText(latestTransaction)}
              </div>
              <div style={{ color: "#777", marginTop: "10px", fontSize: "14px" }}>
                {latestTransaction
                  ? `${getTransactionSign(latestTransaction.direction)}${formatPoints(
                      latestTransaction.amount
                    )} POINT · ${formatDate(latestTransaction.created_at)}`
                  : "История операций пуста."}
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
                  Главный показатель — баланс: доступно сейчас + резерв.
                  Остальные поля показывают, как именно POINTS перемещались
                  между карманами.
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
                    minWidth: "1180px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>Дата</th>
                      <th style={{ padding: "12px 16px" }}>Смысл операции</th>
                      <th style={{ padding: "12px 16px" }}>Движение</th>
                      <th style={{ padding: "12px 16px" }}>POINT</th>
                      <th style={{ padding: "12px 16px" }}>
                        Баланс и карманы
                      </th>
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

                      const balanceBefore = calculateBalance(
                        transaction.available_balance_before,
                        transaction.reserved_balance_before
                      );

                      const balanceAfter = calculateBalance(
                        transaction.available_balance_after,
                        transaction.reserved_balance_after
                      );

                      return (
                        <tr
                          key={transaction.id}
                          style={{ borderTop: "1px solid #eee" }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              verticalAlign: "top",
                            }}
                          >
                            {formatDate(transaction.created_at)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              verticalAlign: "top",
                            }}
                          >
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

                          <td
                            style={{
                              padding: "12px 16px",
                              verticalAlign: "top",
                            }}
                          >
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
                              verticalAlign: "top",
                            }}
                          >
                            {getTransactionSign(transaction.direction)}
                            {formatPoints(transaction.amount)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                              verticalAlign: "top",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gap: "4px",
                              }}
                            >
                              <BalanceLine
                                label="Баланс"
                                before={balanceBefore}
                                after={balanceAfter}
                                isPrimary
                              />
                              <BalanceLine
                                label="Доступно"
                                before={transaction.available_balance_before}
                                after={transaction.available_balance_after}
                              />
                              <BalanceLine
                                label="Резерв"
                                before={transaction.reserved_balance_before}
                                after={transaction.reserved_balance_after}
                              />
                              <BalanceLine
                                label="Потрачено"
                                before={transaction.spent_balance_before}
                                after={transaction.spent_balance_after}
                              />
                              <BalanceLine
                                label="Возвращено"
                                before={transaction.released_balance_before}
                                after={transaction.released_balance_after}
                              />
                              <BalanceLine
                                label="Начислено всего"
                                before={transaction.balance_before}
                                after={transaction.balance_after}
                              />
                            </div>
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              verticalAlign: "top",
                            }}
                          >
                            {organizationName}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              verticalAlign: "top",
                            }}
                          >
                            {getTransactionStatusLabel(transaction.status)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#666",
                              fontSize: "13px",
                              verticalAlign: "top",
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