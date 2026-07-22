"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type CheckResult = {
  readonly label: string;
  readonly passed: boolean;
  readonly actual: string;
};

type TestState = {
  readonly status: "idle" | "running" | "passed" | "failed";
  readonly message: string;
  readonly checks: readonly CheckResult[];
  readonly response: unknown;
  readonly factsResponse: unknown;
};

type Scenario = "valid_conversion" | "invalid_unit";

const INITIAL_STATE: TestState = {
  status: "idle",
  message: "Тест ещё не запускался.",
  checks: [],
  response: null,
  factsResponse: null,
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(record: UnknownRecord, key: string): string | null {
  return typeof record[key] === "string" ? (record[key] as string) : null;
}

function readBoolean(record: UnknownRecord, key: string): boolean | null {
  return typeof record[key] === "boolean" ? (record[key] as boolean) : null;
}

function readNumber(record: UnknownRecord, key: string): number | null {
  return typeof record[key] === "number" && Number.isFinite(record[key])
    ? (record[key] as number)
    : null;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildSaveBody(scenario: Scenario) {
  const nowIso = new Date().toISOString();
  const id = crypto.randomUUID();
  const isValid = scenario === "valid_conversion";

  const rawText = isValid
    ? "Reality Core R1-3C: тестовая активность длилась полтора часа"
    : "Reality Core R1-3C: намеренно несовместимая длительность 70 килограммов";
  const localSuffix = isValid ? "valid" : "invalid";
  const unit = isValid ? "hour" : "kilogram";
  const numericValue = isValid ? 1.5 : 70;

  return {
    routeMode: "future_server_mediated_write",
    temporalDirection: "past",
    idempotencyKey: `reality-core-r1-3c-${localSuffix}-${id}`,
    sourcePackageId: `reality-core-r1-3c-package-${localSuffix}-${id}`,
    activityProcessingPackage: {
      packageId: `reality-core-r1-3c-package-${localSuffix}-${id}`,
      status: "ready_for_save_gate",
      rawInput: {
        text: rawText,
        locale: "ru",
        source: "manual_test_fixture",
        capturedAtIso: nowIso,
      },
      recognition: {
        status: "obvious_activity",
        confidence: 1,
        reason: "Authenticated Reality Core R1-3C runtime verification.",
        detectedActivityTitle: rawText,
        shouldAskUserBeforeSaving: false,
      },
      measures: [
        {
          localId: `measure-duration-${localSuffix}`,
          measureType: "duration",
          unit,
          numericValue,
          textValue: null,
          confidence: 1,
          evidenceText: isValid ? "1,5 часа" : "70 килограммов",
          normalizedLabel: rawText,
        },
      ],
      semanticCategories: [
        {
          localId: `category-reality-core-${localSuffix}`,
          semanticObjectKey: `reality_core_runtime_${localSuffix}`,
          labelRu: "Проверка Reality Core",
          layer: "system",
          confidence: 1,
          evidenceText: rawText,
          reason: "Technical runtime verification of parameter normalization.",
        },
      ],
      valueObjectMatches: [
        {
          semanticCategoryLocalId: `category-reality-core-${localSuffix}`,
          matchStatus: "not_applicable",
          valueObjectId: null,
          valueObjectTitle: null,
          parentValueObjectId: null,
          parentValueObjectTitle: null,
          confidence: 1,
          reason: "This normalization test does not require a Value Object.",
        },
      ],
      missingValueObjectCandidates: [],
      factPreviews: [
        {
          localId: `fact-duration-${localSuffix}`,
          activityEventId: null,
          measureLocalId: `measure-duration-${localSuffix}`,
          semanticCategoryLocalId: `category-reality-core-${localSuffix}`,
          semanticObjectKey: `reality_core_runtime_${localSuffix}`,
          valueObjectId: null,
          valueObjectTitle: null,
          measureType: "duration",
          unit,
          numericValue,
          textValue: null,
          status: "ready_for_fact_write",
          confidence: 1,
          explanation: rawText,
        },
      ],
      safety: {
        previewOnly: false,
        dbWriteAllowed: true,
        sqlAllowed: false,
        openAiCallAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "Authenticated browser runtime test.",
          "No OpenAI call.",
          "No SQL execution.",
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
        factLocalId: `fact-duration-${localSuffix}`,
        decision: "accept",
        reasonRu: isValid
          ? "Подтверждён валидный тест конвертации часов в минуты."
          : "Подтверждён намеренно невалидный тест несовместимой единицы.",
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

function getNormalizationItem(body: UnknownRecord): UnknownRecord {
  const normalization = asRecord(body.realityCoreNormalization);
  return asRecord(asArray(normalization.items)[0]);
}

function getCreatedIdsAreEmpty(body: UnknownRecord): boolean {
  const createdIds = asRecord(body.createdIds);
  const activityEventId = createdIds.activityEventId;
  const arrayKeys = [
    "measureIds",
    "valueObjectIds",
    "factIds",
    "reviewItemIds",
    "recalculationQueueIds",
  ];

  return (
    (activityEventId === null || activityEventId === undefined) &&
    arrayKeys.every((key) => asArray(createdIds[key]).length === 0)
  );
}

function createCheck(label: string, passed: boolean, actual: unknown): CheckResult {
  return {
    label,
    passed,
    actual:
      typeof actual === "string" ? actual : JSON.stringify(actual, null, 0),
  };
}

async function postScenario(scenario: Scenario) {
  const response = await fetch("/api/activity/facts/save-gate", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildSaveBody(scenario)),
  });

  const body = await response.json().catch(() => ({
    ok: false,
    errorCode: "RESPONSE_NOT_JSON",
    errorMessage: "Response was not valid JSON.",
  }));

  return {
    httpStatus: response.status,
    body,
  };
}

const buttonBase: React.CSSProperties = {
  minHeight: "44px",
  padding: "12px 18px",
  borderRadius: "14px",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  borderRadius: "20px",
  background: "#ffffff",
  padding: "22px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

function CheckList({ checks }: { readonly checks: readonly CheckResult[] }) {
  if (checks.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "8px", marginTop: "16px" }}>
      {checks.map((check) => (
        <div
          key={check.label}
          style={{
            borderRadius: "12px",
            padding: "10px 12px",
            background: check.passed ? "#ecfdf5" : "#fef2f2",
            color: check.passed ? "#065f46" : "#991b1b",
            fontSize: "13px",
          }}
        >
          <strong>{check.passed ? "✓" : "✕"} {check.label}</strong>
          <div style={{ marginTop: "4px", opacity: 0.85 }}>Получено: {check.actual}</div>
        </div>
      ))}
    </div>
  );
}

export default function RealityCoreRuntimeTestPage() {
  const [validState, setValidState] = useState<TestState>(INITIAL_STATE);
  const [invalidState, setInvalidState] = useState<TestState>(INITIAL_STATE);

  const allPassed = useMemo(() => {
    return validState.status === "passed" && invalidState.status === "passed";
  }, [invalidState.status, validState.status]);

  async function runValidTest() {
    setValidState({ ...INITIAL_STATE, status: "running", message: "Выполняется реальная запись..." });

    try {
      const result = await postScenario("valid_conversion");
      const body = asRecord(result.body);
      const normalization = asRecord(body.realityCoreNormalization);
      const item = getNormalizationItem(body);
      const createdIds = asRecord(body.createdIds);

      const checks = [
        createCheck("HTTP 200", result.httpStatus === 200, result.httpStatus),
        createCheck("ok=true", readBoolean(body, "ok") === true, body.ok),
        createCheck("writeStatus=written", readString(body, "writeStatus") === "written", body.writeStatus),
        createCheck("normalization.ok=true", readBoolean(normalization, "ok") === true, normalization.ok),
        createCheck("parameterCode=duration", readString(item, "parameterCode") === "duration", item.parameterCode),
        createCheck("canonicalUnitCode=minute", readString(item, "canonicalUnitCode") === "minute", item.canonicalUnitCode),
        createCheck("1.5 hour -> 90 minute", readNumber(item, "canonicalValueNumeric") === 90, item.canonicalValueNumeric),
        createCheck("activityEventId создан", typeof createdIds.activityEventId === "string", createdIds.activityEventId),
        createCheck("dbWriteExecuted=true", readBoolean(body, "dbWriteExecuted") === true, body.dbWriteExecuted),
      ];

      const passed = checks.every((check) => check.passed);
      const factsResponse = await fetch("/api/activity/facts?limit=10", {
        method: "GET",
        credentials: "same-origin",
      });
      const factsBody = await factsResponse.json().catch(() => null);

      setValidState({
        status: passed ? "passed" : "failed",
        message: passed
          ? "Валидный факт сохранён, а 1,5 часа нормализованы в 90 минут."
          : "Ответ получен, но не все ожидаемые условия выполнены.",
        checks,
        response: result,
        factsResponse: {
          httpStatus: factsResponse.status,
          body: factsBody,
        },
      });
    } catch (error) {
      setValidState({
        status: "failed",
        message: "Browser fetch завершился ошибкой.",
        checks: [],
        response: error instanceof Error ? error.message : String(error),
        factsResponse: null,
      });
    }
  }

  async function runInvalidTest() {
    setInvalidState({ ...INITIAL_STATE, status: "running", message: "Проверяется блокировка до записи..." });

    try {
      const result = await postScenario("invalid_unit");
      const body = asRecord(result.body);
      const normalization = asRecord(body.realityCoreNormalization);
      const item = getNormalizationItem(body);
      const sideEffects = asRecord(body.sideEffects);

      const checks = [
        createCheck("HTTP 400", result.httpStatus === 400, result.httpStatus),
        createCheck("ok=false", readBoolean(body, "ok") === false, body.ok),
        createCheck(
          "routeStatus=normalization_failed_before_write",
          readString(body, "routeStatus") === "reality_core_normalization_failed_before_write",
          body.routeStatus,
        ),
        createCheck(
          "ошибка save-gate нормализации",
          readString(body, "errorCode") === "ACTIVITY_FACTS_SAVE_REALITY_CORE_NORMALIZATION_FAILED",
          body.errorCode,
        ),
        createCheck("normalization.ok=false", readBoolean(normalization, "ok") === false, normalization.ok),
        createCheck(
          "причина REALITY_CORE_UNIT_NOT_ALLOWED",
          readString(item, "errorCode") === "REALITY_CORE_UNIT_NOT_ALLOWED",
          item.errorCode,
        ),
        createCheck("dbWriteExecuted=false", readBoolean(body, "dbWriteExecuted") === false, body.dbWriteExecuted),
        createCheck("rowsActuallyWritten=0", readNumber(sideEffects, "rowsActuallyWritten") === 0, sideEffects.rowsActuallyWritten),
        createCheck("createdIds пусты", getCreatedIdsAreEmpty(body), body.createdIds),
      ];

      const passed = checks.every((check) => check.passed);

      setInvalidState({
        status: passed ? "passed" : "failed",
        message: passed
          ? "Несовместимая единица заблокирована до первой записи в Supabase."
          : "Ответ получен, но не все защитные условия подтверждены.",
        checks,
        response: result,
        factsResponse: null,
      });
    } catch (error) {
      setInvalidState({
        status: "failed",
        message: "Browser fetch завершился ошибкой.",
        checks: [],
        response: error instanceof Error ? error.message : String(error),
        factsResponse: null,
      });
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px", background: "#f1f5f9", color: "#0f172a" }}>
      <section style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <div style={{ ...panelStyle, marginBottom: "20px" }}>
          <p style={{ margin: 0, color: "#2563eb", fontSize: "12px", fontWeight: 900, letterSpacing: "0.12em" }}>
            REALITY CORE R1-3C · AUTHENTICATED RUNTIME VERIFICATION
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "28px" }}>Проверка нормализации фактов до записи</h1>
          <p style={{ margin: "12px 0 0", lineHeight: 1.6, color: "#475569" }}>
            Первый тест создаёт реальную прошлую активность и проверяет преобразование 1,5 часа в 90 минут.
            Второй отправляет намеренно несовместимую пару «duration + kilogram» и подтверждает нулевое число записей.
          </p>
          <div style={{ marginTop: "14px", padding: "12px", borderRadius: "12px", background: allPassed ? "#dcfce7" : "#e0e7ff" }}>
            <strong>{allPassed ? "R1-3C runtime acceptance: PASSED" : "Выполните оба теста по порядку."}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
          <section style={panelStyle}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>1. Валидная запись и конвертация</h2>
            <p style={{ color: "#64748b", lineHeight: 1.5 }}>Ожидается реальная запись и canonical preview: duration / minute / 90.</p>
            <button
              type="button"
              onClick={runValidTest}
              disabled={validState.status === "running"}
              style={{
                ...buttonBase,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                opacity: validState.status === "running" ? 0.65 : 1,
              }}
            >
              {validState.status === "running" ? "Выполняется..." : "Записать 1,5 часа"}
            </button>
            <p style={{ marginBottom: 0, fontWeight: 700 }}>{validState.message}</p>
            <CheckList checks={validState.checks} />
            {validState.response !== null ? (
              <details style={{ marginTop: "16px" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>JSON ответа</summary>
                <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", fontSize: "11px", background: "#0f172a", color: "#e2e8f0", padding: "14px", borderRadius: "12px" }}>{json(validState.response)}</pre>
              </details>
            ) : null}
          </section>

          <section style={panelStyle}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>2. Невалидная единица без записи</h2>
            <p style={{ color: "#64748b", lineHeight: 1.5 }}>Ожидается HTTP 400, REALITY_CORE_UNIT_NOT_ALLOWED и rowsActuallyWritten=0.</p>
            <button
              type="button"
              onClick={runInvalidTest}
              disabled={invalidState.status === "running"}
              style={{
                ...buttonBase,
                border: "1px solid #dc2626",
                background: "#ffffff",
                color: "#b91c1c",
                opacity: invalidState.status === "running" ? 0.65 : 1,
              }}
            >
              {invalidState.status === "running" ? "Проверяется..." : "Отправить duration + kilogram"}
            </button>
            <p style={{ marginBottom: 0, fontWeight: 700 }}>{invalidState.message}</p>
            <CheckList checks={invalidState.checks} />
            {invalidState.response !== null ? (
              <details style={{ marginTop: "16px" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>JSON ответа</summary>
                <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", fontSize: "11px", background: "#0f172a", color: "#e2e8f0", padding: "14px", borderRadius: "12px" }}>{json(invalidState.response)}</pre>
              </details>
            ) : null}
          </section>
        </div>

        <div style={{ ...panelStyle, marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link href="/activity-facts" style={{ ...buttonBase, display: "inline-flex", alignItems: "center", textDecoration: "none", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a" }}>
            Открыть таблицу фактов
          </Link>
          <Link href="/workspace" style={{ ...buttonBase, display: "inline-flex", alignItems: "center", textDecoration: "none", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a" }}>
            Вернуться в workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
