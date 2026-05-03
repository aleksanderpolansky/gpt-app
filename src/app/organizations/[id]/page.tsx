import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import PurchaseConfirmationForm from "./PurchaseConfirmationForm";

export const dynamic = "force-dynamic";

type Organization = {
  id: string;
  organization_name: string;
  organization_type: string;
  description?: string | null;
  status: string;
  country_code?: string | null;
  default_currency?: string | null;
  created_at?: string | null;
};

type ValueObject = {
  id: string;
  organization_id?: string | null;
  value_type: string;
  title: string;
  description: string | null;
  unit_type: string | null;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  status: string;
  created_at: string;
};

type OfferItemValueObject = {
  id: string;
  title: string;
  value_type: string;
};

type OfferItem = {
  id: string;
  value_object_id: string;
  quantity: number | string;
  unit_price: number | string | null;
  total_price: number | string | null;
  currency: string | null;
  is_required: boolean;
  status: string;
  value_objects?: OfferItemValueObject | OfferItemValueObject[] | null;
};

type Offer = {
  id: string;
  organization_id?: string | null;
  offer_type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  created_at: string;
  offer_items?: OfferItem[] | null;
};

type AppUser = {
  id: string;
  auth0_sub: string;
  email?: string | null;
  name?: string | null;
};

type PageData = {
  organization: Organization | null;
  valueObjects: ValueObject[];
  offers: Offer[];
  errorMessage: string | null;
};

type OrganizationDetailsPageProps = {
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

function formatMoney(value: number | string | null, currency: string | null) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
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

async function getOrganizationPageData(
  organizationId: string
): Promise<PageData> {
  const { appUser, errorMessage } = await getCurrentAppUser();

  if (errorMessage) {
    return {
      organization: null,
      valueObjects: [],
      offers: [],
      errorMessage,
    };
  }

  if (!appUser) {
    return {
      organization: null,
      valueObjects: [],
      offers: [],
      errorMessage: "User context not found",
    };
  }

  const [organizationResult, valueObjectsResult, offersResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          `
          id,
          organization_name,
          organization_type,
          description,
          status,
          country_code,
          default_currency,
          created_at
        `
        )
        .eq("id", organizationId)
        .single(),

      supabase
        .from("value_objects")
        .select(
          `
          id,
          organization_id,
          value_type,
          title,
          description,
          unit_type,
          default_price,
          default_currency,
          default_duration_minutes,
          status,
          created_at
        `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),

      supabase
        .from("offers")
        .select(
          `
          id,
          organization_id,
          offer_type,
          title,
          description,
          price,
          currency,
          status,
          created_at,
          offer_items (
            id,
            value_object_id,
            quantity,
            unit_price,
            total_price,
            currency,
            is_required,
            status,
            value_objects (
              id,
              title,
              value_type
            )
          )
        `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
    ]);

  if (organizationResult.error) {
    return {
      organization: null,
      valueObjects: [],
      offers: [],
      errorMessage: organizationResult.error.message,
    };
  }

  if (!organizationResult.data) {
    return {
      organization: null,
      valueObjects: [],
      offers: [],
      errorMessage: null,
    };
  }

  if (valueObjectsResult.error) {
    return {
      organization: organizationResult.data as Organization,
      valueObjects: [],
      offers: [],
      errorMessage: valueObjectsResult.error.message,
    };
  }

  if (offersResult.error) {
    return {
      organization: organizationResult.data as Organization,
      valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
      offers: [],
      errorMessage: offersResult.error.message,
    };
  }

  return {
    organization: organizationResult.data as Organization,
    valueObjects: (valueObjectsResult.data as ValueObject[] | null) ?? [],
    offers: (offersResult.data as unknown as Offer[] | null) ?? [],
    errorMessage: null,
  };
}

export default async function OrganizationDetailsPage({
  params,
}: OrganizationDetailsPageProps) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  const createValueObjectHref = `/value-objects/new?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const createOfferHref = `/offers/new?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const purchaseConfirmationsHref = `/purchase-confirmations?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const publicPurchaseHistoryHref = `/purchase-history?organizationId=${encodeURIComponent(
    organizationId
  )}`;
  const myPurchaseConfirmationsHref = "/my-purchase-confirmations";

  const { organization, valueObjects, offers, errorMessage } =
    await getOrganizationPageData(organizationId);

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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Organization details
          </h1>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <a href="/" style={{ color: "#2563eb" }}>
              На главную
            </a>

            <a href="/organizations" style={{ color: "#2563eb" }}>
              Мои организации
            </a>

            <a href={createValueObjectHref} style={{ color: "#2563eb" }}>
              Create value object
            </a>

            <a href={createOfferHref} style={{ color: "#2563eb" }}>
              Create offer
            </a>

            <a href={myPurchaseConfirmationsHref} style={{ color: "#2563eb" }}>
              My purchase confirmations
            </a>

            <a href={purchaseConfirmationsHref} style={{ color: "#2563eb" }}>
              Seller purchase confirmations
            </a>

            <a href={publicPurchaseHistoryHref} style={{ color: "#2563eb" }}>
              Public purchase history
            </a>
          </nav>
        </header>

        {errorMessage ? (
          <div
            style={{
              border: "1px solid #f5c2c7",
              borderRadius: "10px",
              padding: "18px",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && !organization ? (
          <div
            style={{
              border: "1px solid #facc15",
              borderRadius: "10px",
              padding: "18px",
              background: "#fefce8",
            }}
          >
            Organization not found or access denied.
          </div>
        ) : null}

        {!errorMessage && organization ? (
          <div style={{ display: "grid", gap: "20px" }}>
            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#f9fafb",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
              }}
            >
              <h2
                style={{
                  fontSize: "26px",
                  margin: "0 0 12px",
                }}
              >
                {organization.organization_name}
              </h2>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Type:</strong> {organization.organization_type}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Status:</strong> {organization.status}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Country:</strong>{" "}
                {organization.country_code || "Not specified"}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Default currency:</strong>{" "}
                {organization.default_currency || "Not specified"}
              </p>

              <p style={{ margin: "0 0 6px" }}>
                <strong>Description:</strong>{" "}
                {organization.description || "Not specified"}
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#666666",
                  fontSize: "14px",
                }}
              >
                ID: {organization.id}
              </p>
            </section>

            <PurchaseConfirmationForm
              organizationId={organizationId}
              organizationDefaultCurrency={organization.default_currency ?? null}
              myPurchaseConfirmationsHref={myPurchaseConfirmationsHref}
              purchaseConfirmationsHref={purchaseConfirmationsHref}
              publicPurchaseHistoryHref={publicPurchaseHistoryHref}
            />

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    Value objects
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Products, services and certificates connected to this
                    organization.
                  </p>
                </div>

                <a
                  href={createValueObjectHref}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create value object
                </a>
              </div>

              {valueObjects.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No value objects connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {valueObjects.map((valueObject) => (
                    <article
                      key={valueObject.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#f9fafb",
                      }}
                    >
                      <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>
                        {valueObject.title}
                      </h3>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Type:</strong> {valueObject.value_type}
                      </p>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Price:</strong>{" "}
                        {formatMoney(
                          valueObject.default_price,
                          valueObject.default_currency
                        )}
                      </p>

                      <p style={{ margin: 0 }}>
                        <strong>Status:</strong> {valueObject.status}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "12px",
                padding: "20px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>Offers</h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Commercial offers connected to this organization.
                  </p>
                </div>

                <a
                  href={createOfferHref}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create offer
                </a>
              </div>

              {offers.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No offers connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {offers.map((offer) => (
                    <article
                      key={offer.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "14px",
                        background: "#f9fafb",
                      }}
                    >
                      <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>
                        {offer.title}
                      </h3>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Type:</strong> {offer.offer_type}
                      </p>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Price:</strong>{" "}
                        {formatMoney(offer.price, offer.currency)}
                      </p>

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Status:</strong> {offer.status}
                      </p>

                      <div
                        style={{
                          marginTop: "10px",
                          border: "1px solid #dddddd",
                          borderRadius: "8px",
                          padding: "10px",
                          background: "#ffffff",
                        }}
                      >
                        <strong>Items:</strong>

                        {!offer.offer_items ||
                        offer.offer_items.length === 0 ? (
                          <p style={{ margin: "6px 0 0", color: "#666666" }}>
                            No offer items.
                          </p>
                        ) : (
                          <ul
                            style={{ margin: "8px 0 0", paddingLeft: "20px" }}
                          >
                            {offer.offer_items.map((item) => {
                              const relatedValueObject = getFirstRelatedItem(
                                item.value_objects
                              );

                              return (
                                <li key={item.id}>
                                  {relatedValueObject?.title ??
                                    item.value_object_id}{" "}
                                  × {item.quantity} —{" "}
                                  {formatMoney(item.total_price, item.currency)}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}