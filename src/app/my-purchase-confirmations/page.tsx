import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";
import LocalDateTime from "../../components/LocalDateTime";
import {
  getPurchaseConfirmationText,
  type PurchaseConfirmationMessageKey,
} from "../../i18n/messages/purchase-confirmations";

export const dynamic = "force-dynamic";

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

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type PageData = {
  purchaseConfirmations: MyPurchaseConfirmation[];
  errorMessage: string | null;
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

type MyPurchaseConfirmationsPageProps = {
  searchParams?: Promise<SearchParamsInput>;
};

type PurchaseTextParams = Record<string, string | number>;

type PurchaseText = (
  key: PurchaseConfirmationMessageKey,
  params?: PurchaseTextParams,
) => string;

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

async function getMyPurchaseConfirmations(): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      purchaseConfirmations: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      purchaseConfirmations: [],
      errorMessage: "User context not found",
    };
  }

  const { data: purchaseConfirmations, error: purchaseConfirmationsError } =
    await supabase
      .from("purchase_confirmations")
      .select(
        `
        id,
        organization_id,
        buyer_user_id,
        buyer_public_code,
        purchase_amount,
        purchase_currency,
        user_comment,
        points_awarded,
        status,
        requested_at,
        confirmed_at,
        rejected_at,
        cancelled_at,
        last_decision_at,
        created_at,
        updated_at,
        organizations (
          id,
          organization_name,
          organization_type,
          country_code,
          default_currency,
          status
        )
      `,
      )
      .eq("buyer_user_id", appUser.id)
      .order("created_at", { ascending: false });

  if (purchaseConfirmationsError) {
    return {
      purchaseConfirmations: [],
      errorMessage: purchaseConfirmationsError.message,
    };
  }

  return {
    purchaseConfirmations:
      (purchaseConfirmations as MyPurchaseConfirmation[] | null) ?? [],
    errorMessage: null,
  };
}

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getSearchParamValue(
  searchParams: SearchParamsInput,
  key: string,
): string | undefined {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getPurchaseLocale(value: string | undefined) {
  if (
    value === "ru" ||
    value === "pl" ||
    value === "en" ||
    value === "es" ||
    value === "uk" ||
    value === "de" ||
    value === "cs"
  ) {
    return value;
  }

  return "ru";
}

function getIntlLocale(locale: string) {
  if (locale === "pl") {
    return "pl-PL";
  }

  if (locale === "en") {
    return "en-US";
  }

  if (locale === "es") {
    return "es-ES";
  }

  if (locale === "uk") {
    return "uk-UA";
  }

  if (locale === "de") {
    return "de-DE";
  }

  if (locale === "cs") {
    return "cs-CZ";
  }

  return "ru-RU";
}

function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
  fallback: string,
) {
  if (typeof amount !== "number") {
    return fallback;
  }

  return `${new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined, locale: string) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusLabel(
  status: string | null | undefined,
  purchaseText: PurchaseText,
) {
  if (status === "requested") {
    return purchaseText("purchaseConfirmations.status.requested");
  }

  if (status === "confirmed") {
    return purchaseText("purchaseConfirmations.status.confirmed");
  }

  if (status === "rejected") {
    return purchaseText("purchaseConfirmations.status.rejected");
  }

  if (status === "cancelled") {
    return purchaseText("purchaseConfirmations.status.cancelled");
  }

  return status ?? purchaseText("purchaseConfirmations.common.dash");
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

function getLinkStyle() {
  return {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #dddddd",
    background: "#ffffff",
    color: "#111111",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  };
}

function getAuditLinkStyle() {
  return {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #6366f1",
    background: "#eef2ff",
    color: "#3730a3",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
  };
}

function getDateCell(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  return <LocalDateTime value={value} />;
}

export default async function MyPurchaseConfirmationsPage({
  searchParams,
}: MyPurchaseConfirmationsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pageLocale = getPurchaseLocale(
    getSearchParamValue(resolvedSearchParams, "locale"),
  );
  const purchaseText: PurchaseText = (key, params) =>
    getPurchaseConfirmationText(key, pageLocale, params);
  const dashText = purchaseText("purchaseConfirmations.common.dash");

  const { purchaseConfirmations, errorMessage } =
    await getMyPurchaseConfirmations();

  const requestedCount = purchaseConfirmations.filter(
    (item) => item.status === "requested",
  ).length;

  const confirmedCount = purchaseConfirmations.filter(
    (item) => item.status === "confirmed",
  ).length;

  const rejectedCount = purchaseConfirmations.filter(
    (item) => item.status === "rejected",
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
            {purchaseText("purchaseConfirmations.buyer.title")}
          </h1>

          <p
            style={{
              margin: "0 0 6px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            {purchaseText("purchaseConfirmations.buyer.description")}
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
              {purchaseText("purchaseConfirmations.buyer.title")}
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
              {purchaseText("purchaseConfirmations.status.requested")}
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
              {purchaseText("purchaseConfirmations.status.confirmed")}
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
              {purchaseText("purchaseConfirmations.status.rejected")}
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
              {purchaseText("purchaseConfirmations.common.pointsAwarded")}
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>
              {formatPoints(totalPointsAwarded, pageLocale)}
            </div>
          </div>
        </section>

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
            <h2 style={{ marginTop: 0 }}>
              {purchaseText("purchaseConfirmations.common.error")}
            </h2>
            <p>{errorMessage}</p>
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
                  {purchaseText("purchaseConfirmations.buyer.title")}
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  {purchaseText("purchaseConfirmations.buyer.description")}
                </p>
              </div>

              <a
                href={`/my-purchase-confirmations?locale=${pageLocale}`}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {purchaseText("purchaseConfirmations.common.refresh")}
              </a>
            </div>

            {purchaseConfirmations.length === 0 ? (
              <div style={{ padding: "24px", color: "#666666" }}>
                <h2 style={{ marginTop: 0 }}>
                  {purchaseText("purchaseConfirmations.buyer.emptyTitle")}
                </h2>
                <p>
                  {purchaseText(
                    "purchaseConfirmations.buyer.emptyDescription",
                  )}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1400px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText("purchaseConfirmations.common.createdAt")}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText("purchaseConfirmations.common.status")}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText(
                          "purchaseConfirmations.common.organization",
                        )}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText(
                          "purchaseConfirmations.history.publicCode",
                        )}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText("purchaseConfirmations.common.auditLog")}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText("purchaseConfirmations.common.amount")}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText(
                          "purchaseConfirmations.common.pointsAwarded",
                        )}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText("purchaseConfirmations.common.comment")}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText(
                          "purchaseConfirmations.common.confirmedAt",
                        )}
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        {purchaseText(
                          "purchaseConfirmations.common.rejectedAt",
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {purchaseConfirmations.map((item) => {
                      const organization = getFirstRelatedItem(
                        item.organizations,
                      );
                      const organizationId =
                        organization?.id ?? item.organization_id;
                      const organizationName =
                        organization?.organization_name ??
                        purchaseText(
                          "purchaseConfirmations.common.organization",
                        );
                      const statusStyle = getStatusStyle(item.status);
                      const auditHref = `/purchase-confirmations/${item.id}/events?locale=${pageLocale}`;

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
                            {getDateCell(item.created_at, dashText)}
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
                              {getStatusLabel(item.status, purchaseText)}
                            </span>
                          </td>

                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                            {organizationName}
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <a
                                href={`/organizations/${organizationId}?locale=${pageLocale}`}
                                style={getLinkStyle()}
                              >
                                {purchaseText(
                                  "purchaseConfirmations.common.organization",
                                )}
                              </a>

                              <a
                                href={`/purchase-history?organizationId=${organizationId}&locale=${pageLocale}`}
                                style={getLinkStyle()}
                              >
                                {purchaseText(
                                  "purchaseConfirmations.history.title",
                                )}
                              </a>
                            </div>
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            <a href={auditHref} style={getAuditLinkStyle()}>
                              {purchaseText(
                                "purchaseConfirmations.buyer.viewAudit",
                              )}
                            </a>
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMoney(
                              item.purchase_amount,
                              item.purchase_currency,
                              pageLocale,
                              dashText,
                            )}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatPoints(item.points_awarded, pageLocale)}{" "}
                            {purchaseText("purchaseConfirmations.common.points")}
                          </td>

                          <td style={{ padding: "12px 16px" }}>
                            {item.user_comment ?? dashText}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getDateCell(item.confirmed_at, dashText)}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getDateCell(item.rejected_at, dashText)}
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
