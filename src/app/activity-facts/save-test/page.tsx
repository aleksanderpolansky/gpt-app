"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SaveState =
  | {
      status: "idle";
      message: string;
      response: unknown;
      factsResponse: unknown;
    }
  | {
      status: "saving" | "success" | "error";
      message: string;
      response: unknown;
      factsResponse: unknown;
    };

function buildSaveBody() {
  const nowIso = new Date().toISOString();
  const id = crypto.randomUUID();

  return {
    routeMode: "future_server_mediated_write",
    idempotencyKey: `reels-15-min-${id}`,
    sourcePackageId: `reels-15-min-package-${id}`,
    activityProcessingPackage: {
      packageId: `reels-15-min-package-${id}`,
      status: "ready_for_save_gate",
      rawInput: {
        text: "смотрел рилс 15 минут",
        locale: "ru",
        source: "manual_test_fixture",
        capturedAtIso: nowIso,
      },
      recognition: {
        status: "obvious_activity",
        confidence: 1,
        reason: "Manual authenticated browser save test for activity facts runtime.",
        detectedActivityTitle: "смотрел рилс 15 минут",
        shouldAskUserBeforeSaving: false,
      },
      measures: [
        {
          localId: "measure-duration-15-min",
          measureType: "duration",
          unit: "minute",
          numericValue: 15,
          textValue: null,
          confidence: 1,
          evidenceText: "15 минут",
          normalizedLabel: "15 минут",
        },
      ],
      semanticCategories: [
        {
          localId: "category-watching-reels",
          semanticObjectKey: "watching_reels",
          labelRu: "Просмотр рилсов",
          layer: "activity_type",
          confidence: 1,
          evidenceText: "смотрел рилс",
          reason: "The user reported watching reels.",
        },
      ],
      valueObjectMatches: [
        {
          semanticCategoryLocalId: "category-watching-reels",
          matchStatus: "not_applicable",
          valueObjectId: null,
          valueObjectTitle: null,
          parentValueObjectId: null,
          parentValueObjectTitle: null,
          confidence: 1,
          reason:
            "This first runtime test saves a semantic fact without requiring an existing Value Object.",
        },
      ],
      missingValueObjectCandidates: [],
      factPreviews: [
        {
          localId: "fact-watching-reels-duration",
          activityEventId: null,
          measureLocalId: "measure-duration-15-min",
          semanticCategoryLocalId: "category-watching-reels",
          semanticObjectKey: "watching_reels",
          valueObjectId: null,
          valueObjectTitle: null,
          measureType: "duration",
          unit: "minute",
          numericValue: 15,
          textValue: null,
          status: "ready_for_fact_write",
          confidence: 1,
          explanation: "Факт: пользователь смотрел рилс 15 минут.",
        },
      ],
      safety: {
        previewOnly: false,
        dbWriteAllowed: true,
        sqlAllowed: false,
        openAiCallAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "Authenticated browser test.",
          "No OpenAI call.",
          "No manual SQL execution.",
        ],
      },
      counters: {
        measureCount: 1,
        semanticCategoryCount: 1,
        matchedValueObjectCount: 0,
        missingValueObjectCandidateCount: 0,
        factPreviewCount: 1,
      },
    },
    factDecisions: [
      {
        factLocalId: "fact-watching-reels-duration",
        decision: "accept",
        reasonRu:
          "Пользователь подтвердил тестовую запись факта: смотрел рилс 15 минут.",
      },
    ],
    editedFactDecisions: [],
    valueObjectCandidateDecisions: [],
    clientSafetyConfirmation: {
      userReviewedPreview: true,
      userConfirmedMissingValueObjectCreation: false,
      userConfirmedFactWrite: true,
      userUnderstandsPreviewIsNotDiagnosis: true,
    },
  };
}

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  minWidth: "280px",
  padding: "12px 18px",
  borderRadius: "16px",
  border: "2px solid #1d4ed8",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(37, 99, 235, 0.25)",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  cursor: "not-allowed",
  opacity: 0.65,
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "12px 18px",
  borderRadius: "16px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
};

export default function ActivityFactsSaveTestPage() {
  const [state, setState] = useState<SaveState>({
    status: "idle",
    message:
      "Нажми большую синюю кнопку, чтобы записать тестовую активность: смотрел рилс 15 минут.",
    response: null,
    factsResponse: null,
  });

  const previewBody = useMemo(() => buildSaveBody(), []);

  async function saveActivity() {
    setState({
      status: "saving",
      message: "Отправляю запись в /api/activity/facts/save-gate...",
      response: null,
      factsResponse: null,
    });

    try {
      const body = buildSaveBody();

      const saveResponse = await fetch("/api/activity/facts/save-gate", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const saveJson = await saveResponse.json().catch(() => {
        return {
          ok: false,
          errorCode: "SAVE_RESPONSE_NOT_JSON",
          errorMessage: "Save response was not valid JSON.",
        };
      });

      const factsResponse = await fetch("/api/activity/facts?limit=10", {
        method: "GET",
        credentials: "same-origin",
      });

      const factsJson = await factsResponse.json().catch(() => {
        return {
          ok: false,
          errorCode: "FACTS_RESPONSE_NOT_JSON",
          errorMessage: "Facts response was not valid JSON.",
        };
      });

      const ok =
        saveResponse.ok &&
        Boolean((saveJson as { ok?: unknown }).ok) &&
        (saveJson as { writeStatus?: unknown }).writeStatus === "written";

      setState({
        status: ok ? "success" : "error",
        message: ok
          ? "Готово: backend вернул writeStatus=written. Теперь открой /activity-facts."
          : "Запись не завершилась. Смотри JSON ответа ниже.",
        response: {
          httpStatus: saveResponse.status,
          body: saveJson,
        },
        factsResponse: {
          httpStatus: factsResponse.status,
          body: factsJson,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message: "Ошибка browser fetch. Смотри details ниже.",
        response: {
          error: error instanceof Error ? error.message : String(error),
        },
        factsResponse: null,
      });
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px", background: "#f1f5f9" }}>
      <section
        style={{
          maxWidth: "880px",
          margin: "0 auto 24px auto",
          border: "1px solid #e2e8f0",
          borderRadius: "24px",
          background: "#ffffff",
          padding: "28px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#1d4ed8",
          }}
        >
          Activity Facts · real save test
        </p>

        <h1 style={{ margin: "14px 0 0 0", fontSize: "28px", color: "#020617" }}>
          Записать активность: смотрел рилс 15 минут
        </h1>

        <p style={{ marginTop: "14px", maxWidth: "760px", color: "#334155", lineHeight: 1.6 }}>
          Эта страница вызывает реальный backend route{" "}
          <code>/api/activity/facts/save-gate</code> из браузера с текущей
          authenticated-сессией. После успешной записи факт должен появиться в{" "}
          <Link href="/activity-facts" style={{ color: "#1d4ed8", fontWeight: 700 }}>
            /activity-facts
          </Link>
          .
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
          <button
            type="button"
            onClick={saveActivity}
            disabled={state.status === "saving"}
            style={state.status === "saving" ? disabledButtonStyle : buttonStyle}
          >
            {state.status === "saving"
              ? "Записываю..."
              : "▶ Записать: смотрел рилс 15 минут"}
          </button>

          <Link href="/activity-facts" style={linkButtonStyle}>
            Открыть /activity-facts
          </Link>

          <Link href="/workspace" style={linkButtonStyle}>
            Вернуться в /workspace
          </Link>
        </div>

        <div
          style={{
            marginTop: "24px",
            borderRadius: "18px",
            border:
              state.status === "success"
                ? "1px solid #86efac"
                : state.status === "error"
                  ? "1px solid #fecdd3"
                  : "1px solid #cbd5e1",
            background:
              state.status === "success"
                ? "#dcfce7"
                : state.status === "error"
                  ? "#fff1f2"
                  : "#f8fafc",
            color:
              state.status === "success"
                ? "#14532d"
                : state.status === "error"
                  ? "#881337"
                  : "#0f172a",
            padding: "16px",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {state.message}
        </div>
      </section>

      <section
        style={{
          maxWidth: "880px",
          margin: "0 auto 24px auto",
          border: "1px solid #e2e8f0",
          borderRadius: "24px",
          background: "#ffffff",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#020617" }}>Save response</h2>
        <pre
          style={{
            maxHeight: "360px",
            overflow: "auto",
            borderRadius: "16px",
            background: "#020617",
            color: "#f8fafc",
            padding: "16px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {stringify(state.response)}
        </pre>
      </section>

      <section
        style={{
          maxWidth: "880px",
          margin: "0 auto 24px auto",
          border: "1px solid #e2e8f0",
          borderRadius: "24px",
          background: "#ffffff",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#020617" }}>
          GET /api/activity/facts response
        </h2>
        <pre
          style={{
            maxHeight: "360px",
            overflow: "auto",
            borderRadius: "16px",
            background: "#020617",
            color: "#f8fafc",
            padding: "16px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {stringify(state.factsResponse)}
        </pre>
      </section>

      <section
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          border: "1px solid #e2e8f0",
          borderRadius: "24px",
          background: "#ffffff",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#020617" }}>Request body preview</h2>
        <pre
          style={{
            maxHeight: "360px",
            overflow: "auto",
            borderRadius: "16px",
            background: "#020617",
            color: "#f8fafc",
            padding: "16px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {stringify(previewBody)}
        </pre>
      </section>
    </main>
  );
}
