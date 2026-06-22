"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AdminReadiness = {
  ok?: boolean;
  routeMarker?: string;
  routeStatus?: string;
  currentAdmin?: {
    id?: string;
    role?: string;
    status?: string;
  };
  allowedMethod?: string;
  sideEffects?: {
    dbReadExecuted?: boolean;
    dbWriteExecuted?: boolean;
    rpcExecuted?: boolean;
    openAiCallExecuted?: boolean;
  };
  error?: string;
  errorMessage?: string;
};

type BalanceResponse = {
  ok?: boolean;
  wallet?: {
    status?: string;
    balanceEur?: number;
    reservedEur?: number;
    availableEur?: number;
    currency?: string;
    walletId?: string | null;
    updatedAt?: string | null;
  };
  projections?: Array<{
    tierCode?: string;
    displayName?: string;
    pricingStatus?: string;
    sourceNote?: string;
  }>;
  rules?: {
    singleWallet?: boolean;
    perModelWallets?: boolean;
    modelTiersAreInformationalProjections?: boolean;
    openAiCallExecuted?: boolean;
  };
  sideEffects?: {
    dbReadExecuted?: boolean;
    dbWriteExecuted?: boolean;
    openAiCallExecuted?: boolean;
    rowsActuallyWritten?: number;
  };
  error?: string;
  errorMessage?: string;
};

type GrantResponse = {
  ok?: boolean;
  routeStatus?: string;
  targetUser?: {
    id?: string;
    email?: string | null;
    name?: string | null;
  };
  admin?: {
    id?: string;
    role?: string;
  };
  grant?: {
    wallet_id?: string;
    ledger_id?: string;
    app_user_id?: string;
    balance_before_eur?: number;
    balance_after_eur?: number;
    amount_eur?: number;
    currency?: string;
    idempotency_key?: string;
    ledger_created_at?: string;
  };
  sideEffects?: {
    dbReadExecuted?: boolean;
    dbWriteExecuted?: boolean;
    rpcExecuted?: boolean;
    rowsActuallyWritten?: number;
    openAiCallExecuted?: boolean;
  };
  error?: string;
  errorMessage?: string;
};

type RequestState = {
  loading: boolean;
  errorMessage: string | null;
};

function formatEur(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0.00 EUR";
  }

  return value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " EUR";
}

function buildIdempotencyKey(targetEmail: string, amountEur: string) {
  const safeEmail = targetEmail.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeAmount = amountEur.trim().replace(/[^0-9]+/g, "-");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[^0-9]/g, "");

  return "admin-ai-eur-grant-" + safeEmail + "-" + safeAmount + "-" + stamp;
}

function JsonPreview({ value }: { value: unknown }) {
  if (!value) {
    return null;
  }

  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        borderRadius: "14px",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "16px",
        fontSize: "12px",
        lineHeight: 1.5,
        maxHeight: "360px",
        overflow: "auto",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminAiBillingPage() {
  const [readiness, setReadiness] = useState<AdminReadiness | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [grantResult, setGrantResult] = useState<GrantResponse | null>(null);
  const [targetEmail, setTargetEmail] = useState("aleksanderpolansky@gmail.com");
  const [amountEur, setAmountEur] = useState("5");
  const [reason, setReason] = useState("Manual admin AI EUR grant from Admin AI Billing UI");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [requestState, setRequestState] = useState<RequestState>({
    loading: false,
    errorMessage: null,
  });

  const canSubmit = useMemo(() => {
    return (
      readiness?.ok === true &&
      targetEmail.trim().length > 3 &&
      Number(amountEur) > 0 &&
      reason.trim().length >= 3 &&
      !requestState.loading
    );
  }, [amountEur, readiness?.ok, reason, requestState.loading, targetEmail]);

  async function loadReadiness() {
    const response = await fetch("/api/admin/ai-billing/grant", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({
      ok: false,
      errorMessage: "Could not parse admin readiness response.",
    }))) as AdminReadiness;

    setReadiness(data);
  }

  async function loadBalance() {
    const response = await fetch("/api/ai-billing/balance", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({
      ok: false,
      errorMessage: "Could not parse balance response.",
    }))) as BalanceResponse;

    setBalance(data);
  }

  async function refreshData() {
    setRequestState({
      loading: true,
      errorMessage: null,
    });

    try {
      await Promise.all([loadReadiness(), loadBalance()]);
      setRequestState({
        loading: false,
        errorMessage: null,
      });
    } catch (error) {
      setRequestState({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "Failed to refresh admin data.",
      });
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalIdempotencyKey =
      idempotencyKey.trim() || buildIdempotencyKey(targetEmail, amountEur);

    setRequestState({
      loading: true,
      errorMessage: null,
    });

    setGrantResult(null);

    try {
      const response = await fetch("/api/admin/ai-billing/grant", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          targetEmail: targetEmail.trim().toLowerCase(),
          amountEur: Number(amountEur),
          reason: reason.trim(),
          idempotencyKey: finalIdempotencyKey,
          metadata: {
            source: "admin_ai_billing_ui_step18a",
            uiRoute: "/admin/ai-billing",
            safetyNote:
              "UI calls server-side grant API; frontend never receives service role or OpenAI key.",
          },
        }),
      });

      const data = (await response.json().catch(() => ({
        ok: false,
        errorMessage: "Could not parse grant response.",
      }))) as GrantResponse;

      setGrantResult(data);
      setIdempotencyKey(finalIdempotencyKey);

      if (!response.ok || !data.ok) {
        setRequestState({
          loading: false,
          errorMessage:
            data.errorMessage || data.error || "Grant request failed.",
        });
        return;
      }

      await loadBalance();

      setRequestState({
        loading: false,
        errorMessage: null,
      });
    } catch (error) {
      setRequestState({
        loading: false,
        errorMessage:
          error instanceof Error ? error.message : "Grant request failed.",
      });
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#111827",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <Link
              href="/admin"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontWeight: 700,
              }}
            >
              Admin hub
            </Link>

            <Link
              href="/workspace"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Workspace
            </Link>

            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Home
            </Link>
          </div>

          <p
            style={{
              margin: "0 0 8px",
              color: "#2563eb",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "12px",
            }}
          >
            AI EUR Billing · Step 18A
          </p>

          <h1
            style={{
              fontSize: "38px",
              lineHeight: 1.15,
              margin: "0 0 10px",
              fontWeight: 900,
            }}
          >
            Ручное начисление AI-баланса
          </h1>

          <p
            style={{
              margin: 0,
              color: "#4b5563",
              fontSize: "16px",
              lineHeight: 1.55,
              maxWidth: "780px",
            }}
          >
            Эта страница вызывает только server-side route
            /api/admin/ai-billing/grant. Баланс остаётся единым EUR-кошельком,
            Nano / Standard / Pro не являются отдельными кошельками.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "18px",
              background: "#eff6ff",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                color: "#1e40af",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              Admin status
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900 }}>
              {readiness?.ok ? "Allowed" : "Not ready"}
            </div>
            <div
              style={{
                marginTop: "8px",
                color: "#1e40af",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              role: {readiness?.currentAdmin?.role ?? "-"} · status:{" "}
              {readiness?.currentAdmin?.status ?? "-"}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "18px",
              background: "#f0fdf4",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                color: "#166534",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              Current AI wallet
            </div>
            <div style={{ fontSize: "34px", fontWeight: 900 }}>
              {formatEur(balance?.wallet?.availableEur)}
            </div>
            <div
              style={{
                marginTop: "8px",
                color: "#166534",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              balance: {formatEur(balance?.wallet?.balanceEur)} · reserved:{" "}
              {formatEur(balance?.wallet?.reservedEur)}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #fde68a",
              borderRadius: "18px",
              background: "#fffbeb",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                color: "#92400e",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              Safety
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900 }}>
              Ledger-first
            </div>
            <div
              style={{
                marginTop: "8px",
                color: "#92400e",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              No frontend service role. No OpenAI call. Direct balance overwrite
              is not used.
            </div>
          </div>
        </section>

        {requestState.errorMessage ? (
          <section
            style={{
              border: "1px solid #fecaca",
              borderRadius: "16px",
              background: "#fef2f2",
              color: "#991b1b",
              padding: "18px",
              marginBottom: "20px",
            }}
          >
            <strong>Error:</strong> {requestState.errorMessage}
          </section>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "18px",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              background: "#ffffff",
              padding: "22px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              display: "grid",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "24px" }}>
              Начислить пользователю EUR
            </h2>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Email пользователя
              <input
                value={targetEmail}
                onChange={(event) => setTargetEmail(event.target.value)}
                type="email"
                placeholder="user@example.com"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "15px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Сумма EUR
              <input
                value={amountEur}
                onChange={(event) => setAmountEur(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="5"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "15px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Причина / reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "15px",
                  resize: "vertical",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
              Idempotency key, необязательно
              <input
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
                placeholder="Оставь пустым — система создаст ключ сама"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "15px",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "12px 18px",
                  background: canSubmit ? "#2563eb" : "#9ca3af",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {requestState.loading ? "Выполняю..." : "Начислить AI EUR"}
              </button>

              <button
                type="button"
                onClick={() => void refreshData()}
                disabled={requestState.loading}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "999px",
                  padding: "12px 18px",
                  background: "#ffffff",
                  color: "#111827",
                  fontWeight: 800,
                  cursor: requestState.loading ? "not-allowed" : "pointer",
                }}
              >
                Обновить статус
              </button>
            </div>
          </form>

          {grantResult ? (
            <section
              style={{
                border: grantResult.ok ? "1px solid #bbf7d0" : "1px solid #fecaca",
                borderRadius: "20px",
                background: grantResult.ok ? "#f0fdf4" : "#fef2f2",
                padding: "22px",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {grantResult.ok ? "Начисление выполнено" : "Начисление не выполнено"}
              </h2>

              {grantResult.ok ? (
                <p style={{ lineHeight: 1.6 }}>
                  Пользователь:{" "}
                  <strong>{grantResult.targetUser?.email ?? grantResult.targetUser?.id}</strong>
                  <br />
                  Balance before:{" "}
                  <strong>{formatEur(grantResult.grant?.balance_before_eur)}</strong>
                  <br />
                  Balance after:{" "}
                  <strong>{formatEur(grantResult.grant?.balance_after_eur)}</strong>
                  <br />
                  Ledger ID: <strong>{grantResult.grant?.ledger_id ?? "-"}</strong>
                </p>
              ) : null}

              <JsonPreview value={grantResult} />
            </section>
          ) : null}

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              background: "#ffffff",
              padding: "22px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Readiness / balance diagnostics</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              <JsonPreview value={readiness} />
              <JsonPreview value={balance} />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
