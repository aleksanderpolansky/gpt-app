"use client";

import { useEffect, useState } from "react";

type Organization = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
};

type MyPurchaseConfirmation = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  buyer_public_code: string | null;
  purchase_amount: number | null;
  purchase_currency: string | null;
  user_comment: string | null;
  points_awarded: number | null;
  status: string;
  requested_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  last_decision_at: string | null;
  created_at: string;
  updated_at: string | null;
  organizations?: Organization | Organization[] | null;
};

type MyPurchaseConfirmationsApiResponse = {
  ok: boolean;
  purchaseConfirmations?: MyPurchaseConfirmation[];
  error?: string;
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
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

function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  if (typeof amount !== "number") {
    return "—";
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "requested") {
    return "Ожидает решения продавца";
  }

  if (status === "confirmed") {
    return "Подтверждена";
  }

  if (status === "rejected") {
    return "Отклонена";
  }

  if (status === "cancelled") {
    return "Отменена";
  }

  return status ?? "—";
}

function getStatusStyle(status: string | null | undefined) {
  if (status === "confirmed") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (status === "rejected") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  if (status === "cancelled") {
    return {
      background: "#f5f5f5",
      color: "#555555",
      border: "1px solid #dddddd",
    };
  }

  return {
    background: "#fff8e6",
    color: "#7a4b00",
    border: "1px solid #f0d28a",
  };
}

export default function MyPurchaseConfirmationsPage() {
  const [purchaseConfirmations, setPurchaseConfirmations] = useState<
    MyPurchaseConfirmation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadMyPurchaseConfirmations() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/my/purchase-confirmations", {
        method: "GET",
        cache: "no-store",
      });

      const json =
        (await response.json()) as MyPurchaseConfirmationsApiResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Cannot load my purchase confirmations");
      }

      setPurchaseConfirmations(json.purchaseConfirmations ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMyPurchaseConfirmations();
  }, []);

  const requestedCount = purchaseConfirmations.filter(
    (item) => item.status === "requested"
  ).length;

  const confirmedCount = purchaseConfirmations.filter(
    (item) => item.status === "confirmed"
  ).length;

  const rejectedCount = purchaseConfirmations.filter(
    (item) => item.status === "rejected"
  ).length;

  const totalPointsAwarded = purchaseConfirmations.reduce((sum, item) => {
    return (
      sum + (typeof item.points_awarded === "number" ? item.points_awarded : 0)
    );
  }, 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1300px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 10px",
            }}
          >
            Мои заявки на подтверждение покупок
          </h1>

          <p
            style={{
              margin: 0,
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Здесь отображаются только ваши собственные заявки как покупателя:
            отправленные, подтверждённые, отклонённые и начисленные points.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "16px",
              padding: "22px",
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#666666", marginBottom: "8px" }}>
              Всего заявок
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {purchaseConfirmations.length}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #f0d28a",
              borderRadius: "16px",
              padding: "22px",
              background: "#fff8e6",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#7a4b00", marginBottom: "8px" }}>
              Ожидают решения
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {requestedCount}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #bfe5c8",
              borderRadius: "16px",
              padding: "22px",
              background: "#edf8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#176b2c", marginBottom: "8px" }}>
              Подтверждены
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {confirmedCount}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "16px",
              padding: "22px",
              background: "#fff5f5",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#a40000", marginBottom: "8px" }}>
              Отклонены
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {rejectedCount}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "16px",
              padding: "22px",
              background: "#eff6ff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ color: "#1e3a8a", marginBottom: "8px" }}>
              Начислено points
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {formatPoints(totalPointsAwarded)}
            </div>
          </div>
        </section>

        {isLoading ? (
          <section
            style={{
              border: "1px solid #dddddd",
              borderRadius: "12px",
              padding: "24px",
              background: "#f9fafb",
            }}
          >
            Загрузка ваших заявок...
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
              onClick={() => void loadMyPurchaseConfirmations()}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #a40000",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              Повторить
            </button>
          </section>
        ) : (
          <section
            style={{
              border: "1px solid #dddddd",
              borderRadius: "16px",
              background: "#ffffff",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #eeeeee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  История моих заявок
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Это личный список покупателя. Он не является seller-панелью
                  продавца.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadMyPurchaseConfirmations()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Обновить
              </button>
            </div>

            {purchaseConfirmations.length === 0 ? (
              <div style={{ padding: "24px", color: "#666666" }}>
                У вас пока нет заявок на подтверждение покупок.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1200px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>Дата заявки</th>
                      <th style={{ padding: "12px 16px" }}>Статус</th>
                      <th style={{ padding: "12px 16px" }}>Предприятие</th>
                      <th style={{ padding: "12px 16px" }}>Сумма</th>
                      <th style={{ padding: "12px 16px" }}>Points</th>
                      <th style={{ padding: "12px 16px" }}>Комментарий</th>
                      <th style={{ padding: "12px 16px" }}>Подтверждена</th>
                      <th style={{ padding: "12px 16px" }}>Отклонена</th>
                      <th style={{ padding: "12px 16px" }}>Публичный код</th>
                    </tr>
                  </thead>

                  <tbody>
                    {purchaseConfirmations.map((item) => {
                      const organization = getFirstRelatedItem(
                        item.organizations
                      );
                      const statusStyle = getStatusStyle(item.status);

                      return (
                        <tr
                          key={item.id}
                          style={{ borderTop: "1px solid #eeeeee" }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(item.created_at)}
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: "999px",
                                fontSize: "13px",
                                whiteSpace: "nowrap",
                                ...statusStyle,
                              }}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </td>

                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                            {organization?.organization_name ??
                              "Unknown organization"}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMoney(
                              item.purchase_amount,
                              item.purchase_currency
                            )}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatPoints(item.points_awarded)} POINT
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            {item.user_comment ?? "—"}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(item.confirmed_at)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(item.rejected_at)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                              fontFamily: "monospace",
                            }}
                          >
                            {item.buyer_public_code ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}