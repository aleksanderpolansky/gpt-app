import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import LocalDateTime from "../../../../components/LocalDateTime";

export const dynamic = "force-dynamic";

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type RelatedOrganization = {
  id: string;
  created_by_user_id: string | null;
  organization_name?: string | null;
};

type PurchaseConfirmationAccessRecord = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  buyer_public_code: string | null;
  status: string;
  purchase_amount: number | null;
  purchase_currency: string | null;
  created_at: string;
  organizations?: RelatedOrganization | RelatedOrganization[] | null;
};

type PurchaseConfirmationEvent = {
  id: string;
  purchase_confirmation_id: string;
  organization_id: string;
  buyer_user_id: string;
  actor_user_id: string | null;
  event_type: string;
  status_before: string | null;
  status_after: string;
  purchase_amount: number | null;
  purchase_currency: string | null;
  points_awarded: number | null;
  buyer_public_code: string | null;
  user_comment: string | null;
  seller_comment: string | null;
  previous_hash: string | null;
  record_hash: string | null;
  created_at: string;
};

type PageData = {
  purchaseConfirmation: PurchaseConfirmationAccessRecord | null;
  organizationName: string | null;
  accessRole: "buyer" | "seller" | null;
  events: PurchaseConfirmationEvent[];
  errorMessage: string | null;
};

type PurchaseConfirmationEventsPageProps = {
  params: Promise<{
    id: string;
  }>;
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

function getDateCell(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return <LocalDateTime value={value} />;
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

function getAccessRoleLabel(accessRole: "buyer" | "seller" | null) {
  if (accessRole === "buyer") {
    return "Покупатель";
  }

  if (accessRole === "seller") {
    return "Продавец предприятия";
  }

  return "—";
}

function getEventTypeLabel(eventType: string | null | undefined) {
  if (eventType === "submitted") {
    return "Заявка создана";
  }

  if (eventType === "confirmed") {
    return "Покупка подтверждена";
  }

  if (eventType === "rejected") {
    return "Покупка отклонена";
  }

  if (eventType === "corrected_to_confirmed") {
    return "Исправление: отклонённая заявка подтверждена";
  }

  if (eventType === "cancelled") {
    return "Заявка отменена";
  }

  return eventType ?? "—";
}

function getEventStyle(eventType: string | null | undefined) {
  if (eventType === "confirmed" || eventType === "corrected_to_confirmed") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (eventType === "rejected") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  if (eventType === "cancelled") {
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

function shortHash(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUser | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorMessage: appUserError?.message ?? "App user not found",
    };
  }

  return {
    appUser: appUser as AppUser,
    errorMessage: null,
  };
}

async function getPurchaseConfirmationEventsPageData(
  purchaseConfirmationId: string
): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      purchaseConfirmation: null,
      organizationName: null,
      accessRole: null,
      events: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      purchaseConfirmation: null,
      organizationName: null,
      accessRole: null,
      events: [],
      errorMessage: "User context not found",
    };
  }

  const { data: purchaseConfirmation, error: purchaseConfirmationError } =
    await supabase
      .from("purchase_confirmations")
      .select(
        `
      id,
      organization_id,
      buyer_user_id,
      buyer_public_code,
      status,
      purchase_amount,
      purchase_currency,
      created_at,
      organizations (
        id,
        created_by_user_id,
        organization_name
      )
    `
      )
      .eq("id", purchaseConfirmationId)
      .single();

  if (purchaseConfirmationError || !purchaseConfirmation) {
    return {
      purchaseConfirmation: null,
      organizationName: null,
      accessRole: null,
      events: [],
      errorMessage:
        purchaseConfirmationError?.message ??
        "Purchase confirmation not found",
    };
  }

  const accessRecord =
    purchaseConfirmation as unknown as PurchaseConfirmationAccessRecord;

  const relatedOrganization = getFirstRelatedItem(accessRecord.organizations);

  const isBuyer = accessRecord.buyer_user_id === appUser.id;
  const isSeller =
    relatedOrganization?.created_by_user_id === appUser.id &&
    accessRecord.organization_id === relatedOrganization.id;

  if (!isBuyer && !isSeller) {
    return {
      purchaseConfirmation: null,
      organizationName: relatedOrganization?.organization_name ?? null,
      accessRole: null,
      events: [],
      errorMessage: "Access denied",
    };
  }

  const { data: events, error: eventsError } = await supabase
    .from("purchase_confirmation_events")
    .select(
      `
      id,
      purchase_confirmation_id,
      organization_id,
      buyer_user_id,
      actor_user_id,
      event_type,
      status_before,
      status_after,
      purchase_amount,
      purchase_currency,
      points_awarded,
      buyer_public_code,
      user_comment,
      seller_comment,
      previous_hash,
      record_hash,
      created_at
    `
    )
    .eq("purchase_confirmation_id", purchaseConfirmationId)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return {
      purchaseConfirmation: accessRecord,
      organizationName: relatedOrganization?.organization_name ?? null,
      accessRole: isSeller ? "seller" : "buyer",
      events: [],
      errorMessage: eventsError.message,
    };
  }

  return {
    purchaseConfirmation: accessRecord,
    organizationName: relatedOrganization?.organization_name ?? null,
    accessRole: isSeller ? "seller" : "buyer",
    events: (events as PurchaseConfirmationEvent[] | null) ?? [],
    errorMessage: null,
  };
}

export default async function PurchaseConfirmationEventsPage({
  params,
}: PurchaseConfirmationEventsPageProps) {
  const resolvedParams = await params;
  const purchaseConfirmationId = resolvedParams.id;

  const {
    purchaseConfirmation,
    organizationName,
    accessRole,
    events,
    errorMessage,
  } = await getPurchaseConfirmationEventsPageData(purchaseConfirmationId);

  const backToSellerHref = "/purchase-confirmations";
  const backToBuyerHref = "/my-purchase-confirmations";

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
            Журнал событий заявки
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Здесь показана неизменяемая история заявки на подтверждение покупки:
            создание, подтверждение, отклонение, исправление решения и
            техническая hash-связь между событиями.
          </p>

          <p
            style={{
              margin: "0 0 16px",
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            POINTS — это бонусные единицы программы лояльности. Они не являются
            деньгами, валютой или средством платежа. Время показывается по
            настройкам вашего устройства.
          </p>

          <nav
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <a
              href={backToBuyerHref}
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Мои заявки
            </a>

            <a
              href={backToSellerHref}
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Страница продавца
            </a>

            {purchaseConfirmation ? (
              <a
                href={`/organizations/${purchaseConfirmation.organization_id}`}
                style={{
                  color: "#2563eb",
                  textDecoration: "underline",
                }}
              >
                Предприятие
              </a>
            ) : null}
          </nav>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "24px",
              background: "#fff5f5",
              color: "#a40000",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Ошибка загрузки журнала событий</h2>
            <p>{errorMessage}</p>
          </section>
        ) : null}

        {!errorMessage && purchaseConfirmation ? (
          <>
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
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Предприятие
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {organizationName ?? purchaseConfirmation.organization_id}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Ваша роль
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getAccessRoleLabel(accessRole)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Текущий статус
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {getStatusLabel(purchaseConfirmation.status)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Сумма покупки
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {formatMoney(
                    purchaseConfirmation.purchase_amount,
                    purchaseConfirmation.purchase_currency
                  )}
                </div>
              </div>
            </section>

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
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  История событий
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Каждая строка показывает одно событие заявки и его связь с
                  предыдущей записью.
                </p>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  Для этой заявки пока нет записей в журнале событий.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "1300px",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                        <th style={{ padding: "12px 16px" }}>Дата</th>
                        <th style={{ padding: "12px 16px" }}>Событие</th>
                        <th style={{ padding: "12px 16px" }}>Статус</th>
                        <th style={{ padding: "12px 16px" }}>Сумма покупки</th>
                        <th style={{ padding: "12px 16px" }}>Бонус</th>
                        <th style={{ padding: "12px 16px" }}>Покупатель</th>
                        <th style={{ padding: "12px 16px" }}>
                          Комментарий покупателя
                        </th>
                        <th style={{ padding: "12px 16px" }}>
                          Комментарий продавца
                        </th>
                        <th style={{ padding: "12px 16px" }}>
                          Предыдущий hash
                        </th>
                        <th style={{ padding: "12px 16px" }}>Hash записи</th>
                      </tr>
                    </thead>

                    <tbody>
                      {events.map((event) => {
                        const eventStyle = getEventStyle(event.event_type);

                        return (
                          <tr
                            key={event.id}
                            style={{ borderTop: "1px solid #eeeeee" }}
                          >
                            <td
                              style={{
                                padding: "12px 16px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getDateCell(event.created_at)}
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "6px 10px",
                                  borderRadius: "999px",
                                  fontSize: "13px",
                                  whiteSpace: "nowrap",
                                  ...eventStyle,
                                }}
                              >
                                {getEventTypeLabel(event.event_type)}
                              </span>
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getStatusLabel(event.status_before)} →{" "}
                              {getStatusLabel(event.status_after)}
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatMoney(
                                event.purchase_amount,
                                event.purchase_currency
                              )}
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPoints(event.points_awarded)} POINTS
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {event.buyer_public_code ?? "—"}
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              {event.user_comment ?? "—"}
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              {event.seller_comment ?? "—"}
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                              }}
                              title={event.previous_hash ?? ""}
                            >
                              {shortHash(event.previous_hash)}
                            </td>

                            <td
                              style={{
                                padding: "12px 16px",
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                              }}
                              title={event.record_hash ?? ""}
                            >
                              {shortHash(event.record_hash)}
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
        ) : null}
      </div>
    </main>
  );
}