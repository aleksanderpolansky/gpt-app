"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type CreateOrganizationResponse = {
  ok?: boolean;
  error?: string;
  organization?: {
    id: string;
    organization_name: string;
    organization_type: string;
    description?: string | null;
  };
  organizationActor?: {
    id: string;
    display_name: string;
    actor_type: string;
  };
  businessSpace?: {
    id: string;
    title: string;
    space_type: string;
  };
};

export default function NewOrganizationPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("private_business");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<CreateOrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState("Кнопка ещё не нажималась.");

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDebugMessage("Кнопка нажата. Отправляю запрос...");
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName,
          organizationType,
          description,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok || !data.ok) {
        setDebugMessage("Ошибка при создании организации.");
        return;
      }

      setDebugMessage("Организация успешно создана.");

      setOrganizationName("");
      setDescription("");
      setOrganizationType("private_business");
    } catch (error) {
      setDebugMessage("Ошибка JavaScript при отправке формы.");
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

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
          maxWidth: "640px",
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
              margin: "0 0 20px",
            }}
          >
            Создать организацию
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
            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              На главную
            </Link>

            <Link
              href="/organizations"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Мои организации
            </Link>
          </nav>
        </header>

        <form
          onSubmit={handleCreateOrganization}
          style={{
            border: "1px solid #dddddd",
            borderRadius: "12px",
            padding: "20px",
            background: "#f9fafb",
            display: "grid",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Название организации
            </label>

            <input
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Например: Massage Studio Test"
              style={{
                width: "100%",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Тип организации
            </label>

            <select
              value={organizationType}
              onChange={(event) => setOrganizationType(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            >
              <option value="private_business">Private business</option>
              <option value="employer">Employer</option>
              <option value="supplier_company">Supplier company</option>
              <option value="customer_company">Customer company</option>
              <option value="school">School</option>
              <option value="community">Community</option>
              <option value="nonprofit">Nonprofit</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Описание
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Кратко опиши организацию"
              style={{
                width: "100%",
                minHeight: "112px",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || organizationName.trim().length === 0}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "8px",
              padding: "14px 18px",
              background:
                isLoading || organizationName.trim().length === 0
                  ? "#9ca3af"
                  : "#111827",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor:
                isLoading || organizationName.trim().length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isLoading ? "Создаю..." : "Создать организацию"}
          </button>
        </form>

        <div
          style={{
            marginTop: "16px",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "14px",
            background: "#eff6ff",
          }}
        >
          <p style={{ fontWeight: 700, margin: "0 0 6px" }}>Debug:</p>
          <p style={{ margin: 0 }}>{debugMessage}</p>
        </div>

        {result && (
          <div
            style={{
              marginTop: "24px",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              padding: "16px",
              background: "#fffbeb",
            }}
          >
            <p style={{ fontWeight: 700, margin: "0 0 10px" }}>Результат:</p>

            {result.ok ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <p style={{ margin: 0 }}>Организация создана успешно.</p>

                <p style={{ margin: 0 }}>
                  <strong>Organization:</strong>{" "}
                  {result.organization?.organization_name}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Actor:</strong>{" "}
                  {result.organizationActor?.display_name} (
                  {result.organizationActor?.actor_type})
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Space:</strong> {result.businessSpace?.title}
                </p>

                <div style={{ paddingTop: "8px" }}>
                  <Link
                    href="/organizations"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                  >
                    Перейти к списку организаций
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ color: "#dc2626", margin: 0 }}>
                {result.error || "Unknown error"}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}