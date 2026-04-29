"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

type OfferItem = {
  id: string;
  value_object_id: string;
  quantity: number | string;
  unit_price: number | string | null;
  total_price: number | string | null;
  currency: string | null;
  is_required: boolean;
  status: string;
  value_objects?: {
    id: string;
    title: string;
    value_type: string;
  } | null;
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
  offer_items?: OfferItem[];
};

type PurchaseConfirmationCreateResponse = {
  ok: boolean;
  purchaseConfirmation?: unknown;
  error?: string;
};

type MinimumPurchaseThreshold = {
  currency: string;
  amount: number;
};

const MINIMUM_PURCHASE_THRESHOLDS: Record<string, MinimumPurchaseThreshold> = {
  EUR: {
    currency: "EUR",
    amount: 10,
  },
  PLN: {
    currency: "PLN",
    amount: 45,
  },
  USD: {
    currency: "USD",
    amount: 11,
  },
  GBP: {
    currency: "GBP",
    amount: 9,
  },
  UAH: {
    currency: "UAH",
    amount: 450,
  },
  CZK: {
    currency: "CZK",
    amount: 250,
  },
};

function formatMoney(value: number | string | null, currency: string | null) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  return `${value} ${currency || ""}`.trim();
}

function normalizeCurrency(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().toUpperCase();
}

function getMinimumPurchaseThreshold(
  currency: string | null | undefined
): MinimumPurchaseThreshold | null {
  const normalizedCurrency = normalizeCurrency(currency);

  if (!normalizedCurrency) {
    return null;
  }

  return MINIMUM_PURCHASE_THRESHOLDS[normalizedCurrency] ?? null;
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const organizationId = String(params.id);

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

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [valueObjects, setValueObjects] = useState<ValueObject[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("");
  const [userComment, setUserComment] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseSubmitMessage, setPurchaseSubmitMessage] = useState("");
  const [purchaseSubmitError, setPurchaseSubmitError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const organization = useMemo(() => {
    return organizations.find((item) => item.id === organizationId) ?? null;
  }, [organizations, organizationId]);

  const organizationValueObjects = useMemo(() => {
    return valueObjects.filter(
      (valueObject) => valueObject.organization_id === organizationId
    );
  }, [valueObjects, organizationId]);

  const organizationOffers = useMemo(() => {
    return offers.filter((offer) => offer.organization_id === organizationId);
  }, [offers, organizationId]);

  const effectivePurchaseCurrency =
    normalizeCurrency(purchaseCurrency) ||
    normalizeCurrency(organization?.default_currency) ||
    "PLN";

  const minimumPurchaseThreshold = getMinimumPurchaseThreshold(
    effectivePurchaseCurrency
  );

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [organizationsResponse, valueObjectsResponse, offersResponse] =
        await Promise.all([
          fetch("/api/organizations", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/value-objects", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/offers", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      const organizationsData = await organizationsResponse.json();
      const valueObjectsData = await valueObjectsResponse.json();
      const offersData = await offersResponse.json();

      if (!organizationsResponse.ok || !organizationsData.ok) {
        setErrorMessage(
          organizationsData.error ?? "Failed to load organization"
        );
        return;
      }

      if (!valueObjectsResponse.ok || !valueObjectsData.ok) {
        setErrorMessage(
          valueObjectsData.error ?? "Failed to load value objects"
        );
        return;
      }

      if (!offersResponse.ok || !offersData.ok) {
        setErrorMessage(offersData.error ?? "Failed to load offers");
        return;
      }

      setOrganizations(organizationsData.organizations ?? []);
      setValueObjects(valueObjectsData.valueObjects ?? []);
      setOffers(offersData.offers ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitPurchaseConfirmation(event: FormEvent) {
    event.preventDefault();

    setPurchaseSubmitMessage("");
    setPurchaseSubmitError("");

    const parsedPurchaseAmount = Number(purchaseAmount);

    if (Number.isNaN(parsedPurchaseAmount) || parsedPurchaseAmount <= 0) {
      setPurchaseSubmitError("Введите положительную сумму покупки.");
      return;
    }

    setIsSubmittingPurchase(true);

    try {
      const response = await fetch("/api/purchase-confirmations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          organizationId,
          purchaseAmount: parsedPurchaseAmount,
          purchaseCurrency: effectivePurchaseCurrency,
          userComment: userComment.trim() || null,
          receiptUrl: receiptUrl.trim() || null,
        }),
      });

      const json =
        (await response.json()) as PurchaseConfirmationCreateResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to submit purchase confirmation");
      }

      setPurchaseAmount("");
      setUserComment("");
      setReceiptUrl("");
      setPurchaseSubmitMessage(
        "Заявка на подтверждение покупки создана. Теперь продавец сможет подтвердить или отклонить её."
      );
    } catch (error) {
      setPurchaseSubmitError(
        error instanceof Error ? error.message : "Unknown submit error"
      );
    } finally {
      setIsSubmittingPurchase(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (organization?.default_currency && purchaseCurrency.trim() === "") {
      setPurchaseCurrency(organization.default_currency);
    }
  }, [organization, purchaseCurrency]);

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
            <Link href="/" style={{ color: "#2563eb" }}>
              На главную
            </Link>

            <Link href="/organizations" style={{ color: "#2563eb" }}>
              Мои организации
            </Link>

            <Link href={createValueObjectHref} style={{ color: "#2563eb" }}>
              Create value object
            </Link>

            <Link href={createOfferHref} style={{ color: "#2563eb" }}>
              Create offer
            </Link>

            <Link href={myPurchaseConfirmationsHref} style={{ color: "#2563eb" }}>
              My purchase confirmations
            </Link>

            <Link href={purchaseConfirmationsHref} style={{ color: "#2563eb" }}>
              Seller purchase confirmations
            </Link>

            <Link href={publicPurchaseHistoryHref} style={{ color: "#2563eb" }}>
              Public purchase history
            </Link>
          </nav>
        </header>

        {isLoading && (
          <div
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "18px",
              background: "#f9fafb",
            }}
          >
            Loading organization details...
          </div>
        )}

        {errorMessage && (
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
        )}

        {!isLoading && !errorMessage && !organization && (
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
        )}

        {!isLoading && !errorMessage && organization && (
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

            <section
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "20px",
                background: "#eff6ff",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
                Purchase confirmations & points
              </h2>

              <p style={{ margin: "0 0 12px", color: "#374151" }}>
                Здесь покупатель может зарегистрировать покупку у этого
                предприятия. Продавец позже подтвердит или отклонит заявку.
                После подтверждения система начислит points по правилам
                предприятия.
              </p>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#1e3a8a",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                Seller purchase confirmations — это закрытая панель продавца.
                Она доступна только владельцу предприятия. Покупатели и другие
                пользователи видят только публичную историю подтверждённых
                покупок. My purchase confirmations — это личная страница
                покупателя со своими заявками.
              </p>

              <form
                onSubmit={handleSubmitPurchaseConfirmation}
                style={{
                  display: "grid",
                  gap: "14px",
                  padding: "16px",
                  border: "1px solid #93c5fd",
                  borderRadius: "12px",
                  background: "#ffffff",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "20px" }}>
                  Зарегистрировать покупку
                </h3>

                {minimumPurchaseThreshold ? (
                  <div
                    style={{
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    Минимальная сумма для начисления 10 points: больше{" "}
                    <strong>
                      {minimumPurchaseThreshold.amount}{" "}
                      {minimumPurchaseThreshold.currency}
                    </strong>
                    .
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid #facc15",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "#fefce8",
                      color: "#713f12",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    Минимальный порог начисления points пока не определён:
                    проверьте страну и валюту предприятия.
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 600 }}>Сумма покупки</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseAmount}
                      onChange={(event) => setPurchaseAmount(event.target.value)}
                      placeholder="Например: 95"
                      required
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "15px",
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 600 }}>Валюта</span>
                    <input
                      type="text"
                      value={purchaseCurrency}
                      onChange={(event) =>
                        setPurchaseCurrency(event.target.value.toUpperCase())
                      }
                      placeholder={organization.default_currency || "PLN"}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "15px",
                      }}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 600 }}>Комментарий покупателя</span>
                  <textarea
                    value={userComment}
                    onChange={(event) => setUserComment(event.target.value)}
                    placeholder="Например: покупка аксессуаров, чек приложен ссылкой."
                    rows={3}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "15px",
                      resize: "vertical",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 600 }}>Ссылка на чек</span>
                  <input
                    type="url"
                    value={receiptUrl}
                    onChange={(event) => setReceiptUrl(event.target.value)}
                    placeholder="https://..."
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  />
                </label>

                {purchaseSubmitError && (
                  <div
                    style={{
                      border: "1px solid #f2b8b5",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "#fff5f5",
                      color: "#a40000",
                    }}
                  >
                    {purchaseSubmitError}
                  </div>
                )}

                {purchaseSubmitMessage && (
                  <div
                    style={{
                      border: "1px solid #bfe5c8",
                      borderRadius: "8px",
                      padding: "12px",
                      background: "#edf8f0",
                      color: "#176b2c",
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <div>{purchaseSubmitMessage}</div>

                    <Link
                      href={myPurchaseConfirmationsHref}
                      style={{
                        display: "inline-block",
                        width: "fit-content",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#176b2c",
                        border: "1px solid #bfe5c8",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Посмотреть мои заявки
                    </Link>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="submit"
                    disabled={isSubmittingPurchase}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #2563eb",
                      background: isSubmittingPurchase ? "#93c5fd" : "#2563eb",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: isSubmittingPurchase ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSubmittingPurchase
                      ? "Отправка..."
                      : "Зарегистрировать покупку"}
                  </button>

                  <Link
                    href={myPurchaseConfirmationsHref}
                    style={{
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      color: "#2563eb",
                      border: "1px solid #93c5fd",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    My purchase confirmations
                  </Link>

                  <Link
                    href={purchaseConfirmationsHref}
                    style={{
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      color: "#2563eb",
                      border: "1px solid #93c5fd",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Seller purchase confirmations
                  </Link>

                  <Link
                    href={publicPurchaseHistoryHref}
                    style={{
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      color: "#2563eb",
                      border: "1px solid #93c5fd",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Public purchase history
                  </Link>
                </div>
              </form>
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
                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    Value objects
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#666666" }}>
                    Products, services and certificates connected to this
                    organization.
                  </p>
                </div>

                <Link
                  href={createValueObjectHref}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create value object
                </Link>
              </div>

              {organizationValueObjects.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No value objects connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {organizationValueObjects.map((valueObject) => (
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

                <Link
                  href={createOfferHref}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create offer
                </Link>
              </div>

              {organizationOffers.length === 0 ? (
                <p style={{ margin: 0, color: "#666666" }}>
                  No offers connected to this organization yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {organizationOffers.map((offer) => (
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
                            {offer.offer_items.map((item) => (
                              <li key={item.id}>
                                {item.value_objects?.title ??
                                  item.value_object_id}{" "}
                                × {item.quantity} —{" "}
                                {formatMoney(item.total_price, item.currency)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}