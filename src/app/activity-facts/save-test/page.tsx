"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type CheckResult = {
  readonly label: string;
  readonly passed: boolean;
  readonly actual: string;
};

type ScenarioResult = {
  readonly status: "idle" | "running" | "passed" | "failed";
  readonly title: string;
  readonly message: string;
  readonly checks: readonly CheckResult[];
  readonly response: unknown;
};

type SaveFixture = {
  readonly idempotencyKey: string;
  readonly sourcePackageId: string;
  readonly body: UnknownRecord;
};

const INITIAL_RESULTS: readonly ScenarioResult[] = [];

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

function createCheck(
  label: string,
  passed: boolean,
  actual: unknown,
): CheckResult {
  return {
    label,
    passed,
    actual:
      typeof actual === "string"
        ? actual
        : JSON.stringify(actual, null, 0),
  };
}

function emptyCreatedIds(body: UnknownRecord): boolean {
  const createdIds = asRecord(body.createdIds);

  return (
    (createdIds.activityEventId === null ||
      createdIds.activityEventId === undefined) &&
    [
      "measureIds",
      "valueObjectIds",
      "factIds",
      "reviewItemIds",
      "recalculationQueueIds",
    ].every((key) => asArray(createdIds[key]).length === 0)
  );
}

function idsEqual(first: UnknownRecord, second: UnknownRecord): boolean {
  const firstIds = asRecord(first.createdIds);
  const secondIds = asRecord(second.createdIds);

  return JSON.stringify(firstIds) === JSON.stringify(secondIds);
}

function makeUuid(): string {
  return crypto.randomUUID();
}

function buildBody(params: {
  idempotencyKey: string;
  sourcePackageId: string;
  rawText: string;
  numericValue: number;
  valueObjectId?: string | null;
}): UnknownRecord {
  const nowIso = new Date().toISOString();
  const localId = params.idempotencyKey.replace(/[^a-z0-9_]/gi, "_");

  return {
    routeMode: "future_server_mediated_write",
    temporalDirection: "past",
    idempotencyKey: params.idempotencyKey,
    sourcePackageId: params.sourcePackageId,
    activityProcessingPackage: {
      packageId: params.sourcePackageId,
      status: "ready_for_save_gate",
      rawInput: {
        text: params.rawText,
        locale: "ru",
        source: "manual_transaction_test_fixture",
        capturedAtIso: nowIso,
      },
      recognition: {
        status: "obvious_activity",
        confidence: 1,
        reason: "Authenticated Reality Core R1-4C transaction verification.",
        detectedActivityTitle: params.rawText,
        shouldAskUserBeforeSaving: false,
      },
      measures: [
        {
          localId: `measure_${localId}`,
          measureType: "duration",
          unit: "hour",
          numericValue: params.numericValue,
          textValue: null,
          confidence: 1,
          evidenceText: `${params.numericValue} hour`,
          normalizedLabel: params.rawText,
        },
      ],
      semanticCategories: [
        {
          localId: `category_${localId}`,
          semanticObjectKey: `reality_core_transaction_${localId}`.slice(0, 79),
          labelRu: "Транзакционная проверка Reality Core",
          layer: "system",
          confidence: 1,
          evidenceText: params.rawText,
          reason: "Technical transaction verification.",
        },
      ],
      valueObjectMatches: [
        {
          semanticCategoryLocalId: `category_${localId}`,
          matchStatus: params.valueObjectId ? "matched" : "not_applicable",
          valueObjectId: params.valueObjectId ?? null,
          valueObjectTitle: params.valueObjectId
            ? "Несуществующий объект для проверки rollback"
            : null,
          parentValueObjectId: null,
          parentValueObjectTitle: null,
          confidence: 1,
          reason: params.valueObjectId
            ? "Intentional nonexistent Value Object UUID."
            : "The successful transaction test does not require a Value Object.",
        },
      ],
      missingValueObjectCandidates: [],
      factPreviews: [
        {
          localId: `fact_${localId}`,
          activityEventId: null,
          measureLocalId: `measure_${localId}`,
          semanticCategoryLocalId: `category_${localId}`,
          semanticObjectKey: `reality_core_transaction_${localId}`.slice(0, 79),
          valueObjectId: params.valueObjectId ?? null,
          valueObjectTitle: params.valueObjectId
            ? "Несуществующий объект для проверки rollback"
            : null,
          measureType: "duration",
          unit: "hour",
          numericValue: params.numericValue,
          textValue: null,
          status: "ready_for_fact_write",
          confidence: 1,
          explanation: params.rawText,
        },
      ],
      safety: {
        previewOnly: false,
        dbWriteAllowed: true,
        sqlAllowed: false,
        openAiCallAllowed: false,
        medicalDiagnosisAllowed: false,
        notes: [
          "Authenticated browser transaction test.",
          "No OpenAI call.",
          "No SQL text execution.",
        ],
      },
      counters: {
        measureCount: 1,
        semanticCategoryCount: 1,
        matchedValueObjectCount: params.valueObjectId ? 1 : 0,
        missingValueObjectCandidateCount: 0,
        factPreviewCount: 1,
      },
    },
    factDecisions: [
      {
        factLocalId: `fact_${localId}`,
        decision: "accept",
        reasonRu: "Подтверждён технический тест транзакционной записи.",
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

function createSuccessFixture(): SaveFixture {
  const suffix = makeUuid();

  return {
    idempotencyKey: `reality-core-r1-4c-success-${suffix}`,
    sourcePackageId: `reality-core-r1-4c-package-success-${suffix}`,
    body: buildBody({
      idempotencyKey: `reality-core-r1-4c-success-${suffix}`,
      sourcePackageId: `reality-core-r1-4c-package-success-${suffix}`,
      rawText: "Reality Core R1-4C: транзакционная активность длилась полтора часа",
      numericValue: 1.5,
    }),
  };
}

function createRollbackFixture(): SaveFixture {
  const suffix = makeUuid();

  return {
    idempotencyKey: `reality-core-r1-4c-rollback-${suffix}`,
    sourcePackageId: `reality-core-r1-4c-package-rollback-${suffix}`,
    body: buildBody({
      idempotencyKey: `reality-core-r1-4c-rollback-${suffix}`,
      sourcePackageId: `reality-core-r1-4c-package-rollback-${suffix}`,
      rawText:
        "Reality Core R1-4C: намеренная ошибка после создания activity_event",
      numericValue: 0.5,
      valueObjectId: makeUuid(),
    }),
  };
}

function createConflictBody(fixture: SaveFixture): UnknownRecord {
  const clone = structuredClone(fixture.body);
  const pkg = asRecord(clone.activityProcessingPackage);
  const rawInput = asRecord(pkg.rawInput);
  const recognition = asRecord(pkg.recognition);
  const measures = asArray(pkg.measures);
  const previews = asArray(pkg.factPreviews);

  rawInput.text = "Reality Core R1-4C: изменённое содержимое с тем же ключом";
  recognition.detectedActivityTitle =
    "Reality Core R1-4C: изменённое содержимое с тем же ключом";

  const measure = asRecord(measures[0]);
  measure.numericValue = 2;

  const preview = asRecord(previews[0]);
  preview.numericValue = 2;

  return clone;
}

async function postBody(body: UnknownRecord) {
  const response = await fetch("/api/activity/facts/save-gate", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const parsed = await response.json().catch(() => ({
    ok: false,
    errorCode: "RESPONSE_NOT_JSON",
  }));

  return {
    httpStatus: response.status,
    body: parsed,
  };
}

function result(
  title: string,
  message: string,
  checks: readonly CheckResult[],
  response: unknown,
): ScenarioResult {
  return {
    status: checks.every((check) => check.passed) ? "passed" : "failed",
    title,
    message,
    checks,
    response,
  };
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  borderRadius: "18px",
  background: "#ffffff",
  padding: "20px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const buttonStyle: React.CSSProperties = {
  minHeight: "46px",
  padding: "12px 18px",
  borderRadius: "14px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
};

function ScenarioCard({ value }: { readonly value: ScenarioResult }) {
  return (
    <article style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "18px" }}>{value.title}</h2>
      <p style={{ color: "#475569", lineHeight: 1.5 }}>{value.message}</p>

      <div style={{ display: "grid", gap: "8px" }}>
        {value.checks.map((check) => (
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
            <strong>
              {check.passed ? "✓" : "✕"} {check.label}
            </strong>
            <div style={{ marginTop: "4px", opacity: 0.8 }}>
              Получено: {check.actual}
            </div>
          </div>
        ))}
      </div>

      <details style={{ marginTop: "14px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          JSON ответа
        </summary>
        <pre
          style={{
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            fontSize: "11px",
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "14px",
            borderRadius: "12px",
          }}
        >
          {JSON.stringify(value.response, null, 2)}
        </pre>
      </details>
    </article>
  );
}

export default function RealityCoreRuntimeTestPage() {
  const [status, setStatus] = useState<"idle" | "running" | "passed" | "failed">(
    "idle",
  );
  const [results, setResults] =
    useState<readonly ScenarioResult[]>(INITIAL_RESULTS);
  const successFixtureRef = useRef<SaveFixture | null>(null);

  const passedCount = useMemo(
    () => results.filter((item) => item.status === "passed").length,
    [results],
  );

  async function runAcceptance() {
    setStatus("running");
    setResults([]);

    const nextResults: ScenarioResult[] = [];

    try {
      const successFixture =
        successFixtureRef.current ?? createSuccessFixture();
      successFixtureRef.current = successFixture;

      const first = await postBody(successFixture.body);
      const firstBody = asRecord(first.body);
      const firstCreatedIds = asRecord(firstBody.createdIds);
      const firstSideEffects = asRecord(firstBody.sideEffects);
      const firstTransaction = asRecord(firstBody.transaction);

      nextResults.push(
        result(
          "1. Атомарная запись",
          "Одна RPC создаёт activity, measure, fact, review и queue.",
          [
            createCheck("HTTP 200", first.httpStatus === 200, first.httpStatus),
            createCheck("ok=true", readBoolean(firstBody, "ok") === true, firstBody.ok),
            createCheck(
              "writeStatus=written",
              readString(firstBody, "writeStatus") === "written",
              firstBody.writeStatus,
            ),
            createCheck(
              "transactional=true",
              readBoolean(firstBody, "transactional") === true,
              firstBody.transactional,
            ),
            createCheck(
              "transaction.committed=true",
              readBoolean(firstTransaction, "committed") === true,
              firstTransaction.committed,
            ),
            createCheck(
              "rowsActuallyWritten=5",
              readNumber(firstSideEffects, "rowsActuallyWritten") === 5,
              firstSideEffects.rowsActuallyWritten,
            ),
            createCheck(
              "activityEventId создан",
              typeof firstCreatedIds.activityEventId === "string",
              firstCreatedIds.activityEventId,
            ),
            createCheck(
              "по одному дочернему ID",
              ["measureIds", "factIds", "reviewItemIds", "recalculationQueueIds"].every(
                (key) => asArray(firstCreatedIds[key]).length === 1,
              ),
              firstCreatedIds,
            ),
          ],
          first,
        ),
      );

      const replay = await postBody(successFixture.body);
      const replayBody = asRecord(replay.body);
      const replaySideEffects = asRecord(replayBody.sideEffects);
      const replayTransaction = asRecord(replayBody.transaction);

      nextResults.push(
        result(
          "2. Идемпотентный повтор",
          "Тот же payload не создаёт дополнительных строк.",
          [
            createCheck("HTTP 200", replay.httpStatus === 200, replay.httpStatus),
            createCheck(
              "writeStatus=idempotent_replay",
              readString(replayBody, "writeStatus") === "idempotent_replay",
              replayBody.writeStatus,
            ),
            createCheck(
              "idempotentReplay=true",
              readBoolean(replayTransaction, "idempotentReplay") === true,
              replayTransaction.idempotentReplay,
            ),
            createCheck(
              "dbWriteExecuted=false",
              readBoolean(replayBody, "dbWriteExecuted") === false,
              replayBody.dbWriteExecuted,
            ),
            createCheck(
              "rowsActuallyWritten=0",
              readNumber(replaySideEffects, "rowsActuallyWritten") === 0,
              replaySideEffects.rowsActuallyWritten,
            ),
            createCheck(
              "возвращены те же ID",
              idsEqual(firstBody, replayBody),
              replayBody.createdIds,
            ),
          ],
          replay,
        ),
      );

      const conflict = await postBody(createConflictBody(successFixture));
      const conflictBody = asRecord(conflict.body);
      const conflictSideEffects = asRecord(conflictBody.sideEffects);

      nextResults.push(
        result(
          "3. Конфликт ключа",
          "Тот же ключ с изменённым содержимым отклоняется.",
          [
            createCheck("HTTP 409", conflict.httpStatus === 409, conflict.httpStatus),
            createCheck("ok=false", readBoolean(conflictBody, "ok") === false, conflictBody.ok),
            createCheck(
              "IDEMPOTENCY_CONFLICT",
              readString(conflictBody, "errorCode") ===
                "ACTIVITY_FACTS_SAVE_IDEMPOTENCY_CONFLICT",
              conflictBody.errorCode,
            ),
            createCheck(
              "transactionCommitted=false",
              readBoolean(conflictBody, "transactionCommitted") === false,
              conflictBody.transactionCommitted,
            ),
            createCheck(
              "rowsActuallyWritten=0",
              readNumber(conflictSideEffects, "rowsActuallyWritten") === 0,
              conflictSideEffects.rowsActuallyWritten,
            ),
            createCheck(
              "createdIds пусты",
              emptyCreatedIds(conflictBody),
              conflictBody.createdIds,
            ),
          ],
          conflict,
        ),
      );

      const rollbackFixture = createRollbackFixture();
      const rollback = await postBody(rollbackFixture.body);
      const rollbackBody = asRecord(rollback.body);
      const rollbackSideEffects = asRecord(rollbackBody.sideEffects);
      const rollbackVerification = asRecord(
        rollbackBody.transactionRollbackVerification,
      );
      const rollbackCounts = asRecord(rollbackVerification.counts);

      nextResults.push(
        result(
          "4. Полный rollback",
          "Несуществующий ЦО вызывает ошибку внутри RPC после попытки создать activity_event.",
          [
            createCheck("HTTP 400", rollback.httpStatus === 400, rollback.httpStatus),
            createCheck("ok=false", readBoolean(rollbackBody, "ok") === false, rollbackBody.ok),
            createCheck(
              "RPC failure",
              readString(rollbackBody, "errorCode") ===
                "ACTIVITY_FACTS_SAVE_TRANSACTIONAL_RPC_FAILED",
              rollbackBody.errorCode,
            ),
            createCheck(
              "причина VALUE_OBJECT_NOT_FOUND",
              (readString(rollbackBody, "errorMessage") ?? "").includes(
                "SAVE_REALITY_ACTIVITY_VALUE_OBJECT_NOT_FOUND",
              ),
              rollbackBody.errorMessage,
            ),
            createCheck(
              "rollback verification passed",
              readBoolean(rollbackVerification, "passed") === true,
              rollbackVerification.passed,
            ),
            createCheck(
              "в пяти таблицах 0 строк",
              [
                "activityEvents",
                "measures",
                "objectFacts",
                "reviewItems",
                "recalculationQueue",
              ].every((key) => readNumber(rollbackCounts, key) === 0),
              rollbackCounts,
            ),
            createCheck(
              "rowsActuallyWritten=0",
              readNumber(rollbackSideEffects, "rowsActuallyWritten") === 0,
              rollbackSideEffects.rowsActuallyWritten,
            ),
            createCheck(
              "createdIds пусты",
              emptyCreatedIds(rollbackBody),
              rollbackBody.createdIds,
            ),
          ],
          rollback,
        ),
      );
    } catch (error) {
      nextResults.push({
        status: "failed",
        title: "Browser/runtime error",
        message: error instanceof Error ? error.message : String(error),
        checks: [],
        response: error instanceof Error ? error.stack ?? error.message : String(error),
      });
    }

    setResults(nextResults);
    setStatus(
      nextResults.length === 4 &&
        nextResults.every((item) => item.status === "passed")
        ? "passed"
        : "failed",
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px",
        background: "#f1f5f9",
        color: "#0f172a",
      }}
    >
      <section style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <header style={{ ...panelStyle, marginBottom: "20px" }}>
          <p
            style={{
              margin: 0,
              color: "#2563eb",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.12em",
            }}
          >
            REALITY CORE R1-4C · TRANSACTION ACCEPTANCE
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "28px" }}>
            Проверка транзакции, идемпотентности и rollback
          </h1>
          <p style={{ margin: "12px 0 0", lineHeight: 1.6, color: "#475569" }}>
            Тест создаёт одну реальную активность. Повтор, конфликт и
            принудительная ошибка не должны добавлять строки.
          </p>

          <button
            type="button"
            onClick={runAcceptance}
            disabled={status === "running"}
            style={{
              ...buttonStyle,
              marginTop: "16px",
              opacity: status === "running" ? 0.65 : 1,
            }}
          >
            {status === "running"
              ? "Выполняются четыре проверки..."
              : "Запустить R1-4C"}
          </button>

          <div
            style={{
              marginTop: "14px",
              padding: "12px",
              borderRadius: "12px",
              background:
                status === "passed"
                  ? "#dcfce7"
                  : status === "failed"
                    ? "#fee2e2"
                    : "#e0e7ff",
            }}
          >
            <strong>
              {status === "passed"
                ? "R1-4C runtime acceptance: PASSED"
                : status === "failed"
                  ? `R1-4C: FAILED (${passedCount}/4)`
                  : status === "running"
                    ? "Проверка выполняется..."
                    : "Нажмите кнопку для запуска."}
            </strong>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "18px",
          }}
        >
          {results.map((item) => (
            <ScenarioCard key={item.title} value={item} />
          ))}
        </div>

        <footer
          style={{
            ...panelStyle,
            marginTop: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <Link
            href="/activity-facts"
            style={{
              ...buttonStyle,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            Открыть таблицу фактов
          </Link>
          <Link
            href="/workspace"
            style={{
              ...buttonStyle,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            Вернуться в workspace
          </Link>
        </footer>
      </section>
    </main>
  );
}
