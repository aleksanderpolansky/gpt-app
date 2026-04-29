"use client";

import { useEffect, useState } from "react";

type PublicPurchaseHistoryItem = {
  publicCode: string;
  publicHash: string;
  organizationName: string;
  organizationId: string;
  buyerMaskedName: string;
  purchaseDate: string;
  purchaseLabel: string;
  pointsAwarded: number;
};

type PublicPurchaseHistoryApiResponse = {
  ok: boolean;
  publicPurchaseHistory?: PublicPurchaseHistoryItem[];
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

export default function PurchaseHistoryPage() {
  const [purchaseHistory, setPurchaseHistory] = useState<
    PublicPurchaseHistoryItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadPurchaseHistory() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/public/purchase-history", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await response.json()) as PublicPurchaseHistoryApiResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Cannot load public purchase history");
      }

      setPurchaseHistory(json.publicPurchaseHistory ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPurchaseHistory();
  }, []);

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
          maxWidth: "1200px",
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
            Public purchase history
          </h1>

          <p
            style={{
              margin: 0,
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Здесь отображаются только подтверждённые покупки. Точные суммы,
            чеки, внутренние ID и комментарии продавца не публикуются.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
              Подтверждённых покупок
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {purchaseHistory.length}
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
              Публичная безопасность
            </div>
            <div style={{ fontSize: "16px", lineHeight: "1.5" }}>
              Имя и фамилия покупателя маскируются, а сумма покупки не
              раскрывается.
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
            Загрузка публичной истории покупок...
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
              onClick={() => void loadPurchaseHistory()}
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
                  Confirmed purchases
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Публичный список подтверждённых покупок без раскрытия точной
                  суммы.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadPurchaseHistory()}
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

            {purchaseHistory.length === 0 ? (
              <div style={{ padding: "24px", color: "#666666" }}>
                Подтверждённых публичных покупок пока нет.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1000px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>Дата</th>
                      <th style={{ padding: "12px 16px" }}>Предприятие</th>
                      <th style={{ padding: "12px 16px" }}>Покупатель</th>
                      <th style={{ padding: "12px 16px" }}>Покупка</th>
                      <th style={{ padding: "12px 16px" }}>Points</th>
                      <th style={{ padding: "12px 16px" }}>Публичный код</th>
                      <th style={{ padding: "12px 16px" }}>Hash</th>
                    </tr>
                  </thead>

                  <tbody>
                    {purchaseHistory.map((item) => (
                      <tr
                        key={`${item.publicCode}-${item.publicHash}`}
                        style={{ borderTop: "1px solid #eeeeee" }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(item.purchaseDate)}
                        </td>

                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                          {item.organizationName}
                        </td>

                        <td
                          style={{
                            padding: "12px 16px",
                            whiteSpace: "nowrap",
                            fontFamily:
                              "Arial, Helvetica, sans-serif",
                          }}
                        >
                          {item.buyerMaskedName}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          {item.purchaseLabel}
                        </td>

                        <td
                          style={{
                            padding: "12px 16px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatPoints(item.pointsAwarded)} POINT
                        </td>

                        <td
                          style={{
                            padding: "12px 16px",
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                          }}
                        >
                          {item.publicCode}
                        </td>

                        <td
                          style={{
                            padding: "12px 16px",
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                          }}
                        >
                          {item.publicHash}
                        </td>
                      </tr>
                    ))}
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