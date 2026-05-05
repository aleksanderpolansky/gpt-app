"use client";

import { useEffect, useMemo, useState } from "react";

type Organization = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
};

type PurchaseConfirmation = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  buyer_public_code: string | null;
  confirmed_by_user_id: string | null;
  purchase_amount: number;
  purchase_currency: string | null;
  user_comment: string | null;
  seller_comment: string | null;
  receipt_url: string | null;
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

type PurchaseConfirmationsApiResponse = {
  ok: boolean;
  purchaseConfirmations?: PurchaseConfirmation[];
  error?: string;
};

type PurchaseConfirmationActionResponse = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

type SellerPurchaseConfirmationsClientProps = {
  initialPurchaseConfirmations: PurchaseConfirmation[];
  initialOrganizationIdFilter: string | null;
  initialErrorMessage: string | null;
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

function LocalDateTimeText({
  value,
}: {
  value: string | null | undefined;
}) {
  const [formattedValue, setFormattedValue] = useState("—");

  useEffect(() => {
    if (!value) {
      setFormattedValue("—");
      return;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      setFormattedValue("—");
      return;
    }

    const browserLanguage =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "pl-PL";

    setFormattedValue(
      new Intl.DateTimeFormat(browserLanguage, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    );
  }, [value]);

  return <span>{formattedValue}</span>;
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
    return "Ожидает решения";
  }

  if (status === "confirmed") {
    return "Покупка подтверждена";
  }

  if (status === "rejected") {
    return "Покупка отклонена";
  }

  if (status === "cancelled") {
    return "Заявка отменена";
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
      color: "#555",
      border: "1px solid #ddd",
    };
  }

  return {
    background: "#fff8e6",
    color: "#7a4b00",
    border: "1px solid #f0d28a",
  };
}

function getAuditLinkStyle() {
  return {
    display: "inline-block",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #6366f1",
    background: "#eef2ff",
    color: "#3730a3",
    textDecoration: "none",
    fontWeight: 700,
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
  };
}

export default function SellerPurchaseConfirmationsClient({
  initialPurchaseConfirmations,
  initialOrganizationIdFilter,
  initialErrorMessage,
}: SellerPurchaseConfirmationsClientProps) {
  const [purchaseConfirmations, setPurchaseConfirmations] = useState<
    PurchaseConfirmation[]
  >(initialPurchaseConfirmations);
  const [organizationIdFilter, setOrganizationIdFilter] = useState<
    string | null
  >(initialOrganizationIdFilter);
  const [sellerComments, setSellerComments] = useState<Record<string, string>>(
    {}
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage
  );

  const visiblePurchaseConfirmations = useMemo(() => {
    if (!organizationIdFilter) {
      return purchaseConfirmations;
    }

    return purchaseConfirmations.filter(
      (item) => item.organization_id === organizationIdFilter
    );
  }, [purchaseConfirmations, organizationIdFilter]);

  const activeOrganizationName = useMemo(() => {
    if (!organizationIdFilter) {
      return null;
    }

    const matchingPurchaseConfirmation = purchaseConfirmations.find(
      (item) => item.organization_id === organizationIdFilter
    );

    const organization = getFirstRelatedItem(
      matchingPurchaseConfirmation?.organizations
    );

    return organization?.organization_name ?? organizationIdFilter;
  }, [purchaseConfirmations, organizationIdFilter]);

  async function loadPurchaseConfirmations() {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/purchase-confirmations", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await response.json()) as PurchaseConfirmationsApiResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Cannot load purchase confirmations");
      }

      setPurchaseConfirmations(json.purchaseConfirmations ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown loading error";

      setErrorMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handlePurchaseConfirmationAction(
    purchaseConfirmationId: string,
    action: "confirm" | "reject"
  ) {
    setProcessingId(purchaseConfirmationId);
    setActionMessage(null);
    setActionError(null);

    try {
      const sellerComment = sellerComments[purchaseConfirmationId]?.trim();

      const response = await fetch(
        `/api/purchase-confirmations/${purchaseConfirmationId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            sellerComment: sellerComment || null,
          }),
        }
      );

      const json =
        (await response.json()) as PurchaseConfirmationActionResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? `Cannot ${action} purchase confirmation`);
      }

      setActionMessage(
        action === "confirm"
          ? "Покупка подтверждена. Если эта заявка ранее была отклонена по ошибке, исправление сохранено в журнале событий."
          : "Покупка отклонена. Решение сохранено в журнале событий."
      );

      setSellerComments((currentComments) => ({
        ...currentComments,
        [purchaseConfirmationId]: "",
      }));

      await loadPurchaseConfirmations();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unknown action error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  function clearOrganizationFilter() {
    setOrganizationIdFilter(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/purchase-confirmations");
    }
  }

  const requestedCount = visiblePurchaseConfirmations.filter(
    (item) => item.status === "requested"
  ).length;

  const confirmedCount = visiblePurchaseConfirmations.filter(
    (item) => item.status === "confirmed"
  ).length;

  const totalPointsAwarded = visiblePurchaseConfirmations.reduce(
    (sum, item) => {
      return (
        sum + (typeof item.points_awarded === "number" ? item.points_awarded : 0)
      );
    },
    0
  );

  return (
    <main style={{ padding: "32px", maxWidth: "1300px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
          Подтверждение покупок
        </h1>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
          Здесь продавец проверяет заявки покупателей и подтверждает только
          реальные покупки. После подтверждения система может начислить
          пользователю POINTS как бонусные единицы программы лояльности.
        </p>
        <p style={{ color: "#777", fontSize: "14px", lineHeight: "1.5" }}>
          POINTS не являются деньгами, валютой или средством платежа. Время на
          этой странице показывается по настройкам устройства пользователя.
        </p>
      </div>

      {organizationIdFilter ? (
        <section
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            padding: "14px 18px",
            background: "#eff6ff",
            color: "#1e3a8a",
            marginBottom: "18px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>Фильтр по предприятию:</strong>{" "}
            {activeOrganizationName ?? organizationIdFilter}
          </div>

          <button
            type="button"
            onClick={clearOrganizationFilter}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #93c5fd",
              background: "#ffffff",
              color: "#1d4ed8",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Показать все заявки
          </button>
        </section>
      ) : null}

      {errorMessage ? (
        <section
          style={{
            border: "1px solid #f2b8b5",
            borderRadius: "12px",
            padding: "24px",
            background: "#fff5f5",
            color: "#a40000",
            marginBottom: "18px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Ошибка загрузки</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadPurchaseConfirmations()}
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
      ) : null}

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
            border: "1px solid #ddd",
            borderRadius: "16px",
            padding: "24px",
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#666", marginBottom: "8px" }}>Всего заявок</div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>
            {visiblePurchaseConfirmations.length}
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
            Ожидают решения
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>
            {requestedCount}
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
          <div style={{ color: "#666", marginBottom: "8px" }}>Подтверждены</div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>
            {confirmedCount}
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
            Начислено POINTS
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>
            {formatPoints(totalPointsAwarded)}
          </div>
        </div>
      </section>

      {actionError ? (
        <section
          style={{
            border: "1px solid #f2b8b5",
            borderRadius: "12px",
            padding: "14px 18px",
            background: "#fff5f5",
            color: "#a40000",
            marginBottom: "16px",
          }}
        >
          {actionError}
        </section>
      ) : null}

      {actionMessage ? (
        <section
          style={{
            border: "1px solid #bfe5c8",
            borderRadius: "12px",
            padding: "14px 18px",
            background: "#edf8f0",
            color: "#176b2c",
            marginBottom: "16px",
          }}
        >
          {actionMessage}
        </section>
      ) : null}

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
            <h2 style={{ margin: 0, fontSize: "22px" }}>Журнал заявок</h2>
            <p style={{ margin: "6px 0 0", color: "#666", lineHeight: "1.5" }}>
              Покупатель подаёт заявку, а продавец подтверждает или отклоняет
              её после проверки. Если отказ был сделан по ошибке, отклонённую
              заявку можно позже подтвердить — такое исправление сохраняется в
              журнале событий.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPurchaseConfirmations()}
            disabled={isRefreshing}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#fff",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>
        </div>

        {visiblePurchaseConfirmations.length === 0 ? (
          <div style={{ padding: "24px", color: "#666" }}>
            Заявок на подтверждение покупок пока нет.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1450px",
              }}
            >
              <thead>
                <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Дата заявки</th>
                  <th style={{ padding: "12px 16px" }}>Статус</th>
                  <th style={{ padding: "12px 16px" }}>Предприятие</th>
                  <th style={{ padding: "12px 16px" }}>Покупатель</th>
                  <th style={{ padding: "12px 16px" }}>Сумма покупки</th>
                  <th style={{ padding: "12px 16px" }}>Бонус</th>
                  <th style={{ padding: "12px 16px" }}>
                    Комментарий покупателя
                  </th>
                  <th style={{ padding: "12px 16px" }}>
                    Комментарий продавца
                  </th>
                  <th style={{ padding: "12px 16px" }}>Чек</th>
                  <th style={{ padding: "12px 16px" }}>Журнал</th>
                  <th style={{ padding: "12px 16px" }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {visiblePurchaseConfirmations.map((item) => {
                  const organization = getFirstRelatedItem(item.organizations);
                  const organizationName =
                    organization?.organization_name ?? "—";

                  const statusStyle = getStatusStyle(item.status);
                  const canConfirmStandard = item.status === "requested";
                  const canRejectStandard = item.status === "requested";
                  const canCorrectRejected = item.status === "rejected";
                  const canShowSellerCommentInput =
                    canConfirmStandard || canRejectStandard || canCorrectRejected;
                  const isProcessingThisItem = processingId === item.id;
                  const auditHref = `/purchase-confirmations/${item.id}/events`;

                  return (
                    <tr key={item.id} style={{ borderTop: "1px solid #eee" }}>
                      <td
                        style={{
                          padding: "12px 16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <LocalDateTimeText value={item.created_at} />
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
                      <td style={{ padding: "12px 16px" }}>
                        {organizationName}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {item.buyer_public_code ?? "—"}
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
                        {formatPoints(item.points_awarded)} POINTS
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {item.user_comment ?? "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div>{item.seller_comment ?? "—"}</div>

                          {canShowSellerCommentInput ? (
                            <input
                              type="text"
                              value={sellerComments[item.id] ?? ""}
                              onChange={(event) =>
                                setSellerComments((currentComments) => ({
                                  ...currentComments,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder={
                                canCorrectRejected
                                  ? "Причина исправления решения"
                                  : "Комментарий к решению"
                              }
                              style={{
                                padding: "8px 10px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                minWidth: "210px",
                              }}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {item.receipt_url ? (
                          <a
                            href={item.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Открыть
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <a href={auditHref} style={getAuditLinkStyle()}>
                          История
                        </a>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {canConfirmStandard || canRejectStandard ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={isProcessingThisItem}
                              onClick={() =>
                                void handlePurchaseConfirmationAction(
                                  item.id,
                                  "confirm"
                                )
                              }
                              style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid #16a34a",
                                background: isProcessingThisItem
                                  ? "#bbf7d0"
                                  : "#16a34a",
                                color: "#ffffff",
                                cursor: isProcessingThisItem
                                  ? "not-allowed"
                                  : "pointer",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Подтвердить покупку
                            </button>

                            <button
                              type="button"
                              disabled={isProcessingThisItem}
                              onClick={() =>
                                void handlePurchaseConfirmationAction(
                                  item.id,
                                  "reject"
                                )
                              }
                              style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid #dc2626",
                                background: isProcessingThisItem
                                  ? "#fecaca"
                                  : "#dc2626",
                                color: "#ffffff",
                                cursor: isProcessingThisItem
                                  ? "not-allowed"
                                  : "pointer",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Отклонить заявку
                            </button>
                          </div>
                        ) : canCorrectRejected ? (
                          <div
                            style={{
                              display: "grid",
                              gap: "8px",
                              minWidth: "220px",
                            }}
                          >
                            <div
                              style={{
                                border: "1px solid #f0d28a",
                                borderRadius: "8px",
                                background: "#fff8e6",
                                color: "#7a4b00",
                                padding: "8px 10px",
                                fontSize: "13px",
                                lineHeight: "1.4",
                              }}
                            >
                              Заявка отклонена. Подтверждайте её только если
                              отказ был ошибочным.
                            </div>

                            <button
                              type="button"
                              disabled={isProcessingThisItem}
                              onClick={() =>
                                void handlePurchaseConfirmationAction(
                                  item.id,
                                  "confirm"
                                )
                              }
                              style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid #d97706",
                                background: isProcessingThisItem
                                  ? "#fed7aa"
                                  : "#f59e0b",
                                color: "#111827",
                                cursor: isProcessingThisItem
                                  ? "not-allowed"
                                  : "pointer",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Исправить отказ и подтвердить
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#666" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}