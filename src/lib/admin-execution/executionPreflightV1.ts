// ARCTor ADM-5C.1 — pure, non-executable, FAIL-CLOSED preflight diagnostic.
// An internal review does NOT grant any agent, API or outbound privilege.
import type { ContextPreview } from "./contextContractV1";
import type { ContextQualityReport } from "./contextQualityV1";

export const ADM5C1_CONTRACT = "ARCTOR_ADM5C1_PREFLIGHT_DESIGN_READ_ONLY_V1" as const;
export type GateState = "pass" | "blocked" | "unknown";
export type PreflightGate = { code: string; title: string; state: GateState;
  evidence: string; nextAction: string };
export type RoleEvidence = { isActive: boolean; agentExecutionEnabled: boolean } | null;
export type PreflightInput = {
  preview: ContextPreview;
  quality: ContextQualityReport;
  role: RoleEvidence;
  latestDecision: "reviewed_internal" | "rejected" | "not_reviewed" | "unknown";
  eventHistoryComplete: boolean;
};
export type PreflightReport = {
  contract: typeof ADM5C1_CONTRACT;
  caseCode: string; assignmentId: string; roleCode: string; taskCode: string;
  gates: readonly PreflightGate[];
  passed: number; blocked: number; unknown: number;
  readyForInternalReview: boolean;
  finalDisposition: "EXECUTION_FORBIDDEN";
  reasons: readonly string[];
  agentExecutionPermitted: false; outboundAuthorized: false;
  modelCallsPerformed: false; dbWritesPerformed: false;
};
const blockers = new Set(["ASSIGNMENT_CASE_MISMATCH", "ASSIGNMENT_TERMINAL",
  "TASK_ROLE_NOT_PERMITTED", "ROLE_INACTIVE", "AGENT_ASSIGNMENT_UNVERIFIED",
  "HUMAN_ASSIGNMENT_REGRESSION_RISK", "UNSUPPORTED_SOURCE_SCOPE",
  "SOURCE_TEXT_NOT_PROVEN", "SOURCE_EXCERPT_TOO_LARGE"]);
export function evaluateAgentPreflightV1(input: PreflightInput): PreflightReport {
  const { preview: p, quality: q, role, latestDecision, eventHistoryComplete } = input;
  if (p.contract !== "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1" ||
      q.contract !== "ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1" ||
      p.mode !== "admin_preview_only" || !p.previewConstructed ||
      p.agentExecutionPermitted !== false || q.agentExecutionPermitted !== false ||
      q.outboundAuthorized !== false || p.dbWritesPerformed !== false || q.dbWritesPerformed !== false ||
      p.modelCallsPerformed !== false || q.modelCallsPerformed !== false ||
      q.caseCode !== p.caseCode || q.assignmentId !== p.assignmentId ||
      q.roleCode !== p.roleCode || q.taskCode !== p.taskCode) {
    throw new Error("PREFLIGHT_UPSTREAM_INVARIANT_FAILED");
  }
  const gates: PreflightGate[] = [];
  const add = (code: string, title: string, state: GateState, evidence: string, nextAction: string) => {
    gates.push({ code, title, state, evidence, nextAction });
  };
  const assignmentProblems = p.reasons.filter(x => blockers.has(x.code));
  add("ADM4_ASSIGNMENT_VERIFIED", "Дело, поручение, должность и допустимость задачи",
    assignmentProblems.length ? "blocked" : "pass",
    assignmentProblems.length ? assignmentProblems.map(x => x.code).join(", ") : `${p.caseCode} · ${p.assignmentId} · ${p.roleCode}`,
    assignmentProblems.length ? "Проверить ADM-4 и маршрутизацию; новую запись не создавать." : "Дополнительных действий для этого доказательства не требуется.");
  add("ROLE_ACTIVE", "Должность активна", role === null ? "unknown" : role.isActive ? "pass" : "blocked",
    role === null ? "Не удалось независимо прочитать роль из Supabase" : `is_active=${role.isActive}`,
    "Проверить фактический статус должности ADM-2B.2.");
  add("AGENT_FLAG_OFF", "Общий флаг агентов остаётся выключенным",
    role === null ? "unknown" : role.agentExecutionEnabled ? "blocked" : "pass",
    role === null ? "Флаг не прочитан" : `agent_execution_enabled=${role.agentExecutionEnabled}`,
    "Не включать существующий флаг: это может нарушить выдачу человеческих поручений. Нужна отдельная миграция ADM-5C/D.");
  add("PUBLIC_TEXT_PROVEN", "Публичный первоисточник буквально подтверждён",
    p.sourceVerification === "verified_exact_public_text" ? "pass" : "blocked",
    `sourceVerification=${p.sourceVerification}`,
    "Проверить публикацию в действующем публичном источнике; личные активности не использовать.");
  const ss = q.snapshot;
  add("SAVED_SNAPSHOT_EXISTS", "Неизменяемый снимок найден", ss ? "pass" : "blocked",
    ss ? `version=${ss.version}; id=${ss.id}` : "У данного поручения нет доступного снимка",
    "Сохранить снимок через ADM-5B.3, без запуска ИИ.");
  add("SAVED_SNAPSHOT_INTEGRITY", "Хеши снимка, манифеста и секций проверены",
    !ss ? "unknown" : ss.integrity === "valid" && ss.frozenDigestMatches && ss.embeddedDigestMatches && ss.sectionHashesMatch ? "pass" : "blocked",
    ss ? `integrity=${ss.integrity}; frozen=${ss.frozenDigestMatches}; manifest=${ss.embeddedDigestMatches}; sections=${ss.sectionHashesMatch}` : "Снимок отсутствует",
    "При ошибке целостности не использовать снимок; провести расследование и создать новую версию после проверки.");
  add("SAVED_SNAPSHOT_FRESH", "Снимок актуален относительно живых источников",
    !ss ? "unknown" : ss.currentManifestMatches && ss.changed === "none" ? "pass" : "blocked",
    ss ? `manifestMatches=${ss.currentManifestMatches}; changed=${ss.changed}` : "Нет данных для сравнения",
    "Перечитать ADM-4, пересобрать манифест и отдельно проверить новую версию.");
  add("INTERNAL_REVIEW_EVENT", "Решение администратора подтверждено журналом",
    !eventHistoryComplete ? "unknown" : latestDecision === "reviewed_internal" ? "pass" : "blocked",
    `lastDecision=${latestDecision}; complete=${eventHistoryComplete}`,
    "Ознакомиться с текущим снимком и зафиксировать решение через ADM-5B.3. Это только внутренняя проверка.");
  add("CONTEXT_SIZE", "Объём контекста в пределах локальных лимитов",
    q.withinLimit && q.characters <= 8000 && q.frozenBytes <= 32000 && q.sectionCount >= 2 ? "pass" : "blocked",
    `${q.characters}/8000 chars; ${q.frozenBytes}/32000 bytes; sections=${q.sectionCount}`,
    "Пересмотреть источники; нельзя автоматически удалять обязательные секции.");
  add("APPROVED_INSTRUCTIONS", "Есть утверждённая инструкция именно для этой задачи",
    q.includedDocuments.length > 0 && p.documentsSelected.length > 0 ? "pass" : "blocked",
    `included=${q.includedDocuments.length}; selected=${p.documentsSelected.length}`,
    "Согласовать точную версию документа и разрешить использование для роли и taskCode отдельно; не менять agentEnabled автоматически.");
  // The following three gates MUST NOT be inferred from SHA, role flags, UI or DB reads.
  add("OUTBOUND_POLICY", "Разрешена конкретная передача данных модели", "blocked",
    "OUTBOUND_POLICY_NOT_APPROVED: контракт безопасной передачи не реализован",
    "Утвердить отдельную политику получателя, классификацию данных, допустимые поля, журнал и согласие при необходимости.");
  add("BUDGET_AND_MODEL", "Модель, лимит и бюджет утверждены", "unknown",
    "ADM-5B.4 даёт только приблизительный расчёт; резерва бюджета и выбора модели к исполнению нет",
    "Разработать ADM-5C.2: конкретные тарифы, резерв, лимит, разрешённую модель и подтверждение.");
  add("EXECUTION_RUNTIME", "Исполнительный контур и журнал попыток введены в эксплуатацию", "blocked",
    "RUNTIME_NOT_IMPLEMENTED: ADM-5C.1 только чтение",
    "После отдельной приёмки разработать ADM-5C.3–5C.7 и испытать ограниченный пилот.");
  const passed = gates.filter(g => g.state === "pass").length;
  const blocked = gates.filter(g => g.state === "blocked").length;
  const unknown = gates.filter(g => g.state === "unknown").length;
  const reasons = gates.filter(g => g.state !== "pass").map(g => g.code);
  return { contract: ADM5C1_CONTRACT, caseCode: p.caseCode, assignmentId: p.assignmentId,
    roleCode: p.roleCode, taskCode: p.taskCode, gates, passed, blocked, unknown,
    readyForInternalReview: Boolean(ss && ss.integrity === "valid" && ss.currentManifestMatches &&
      latestDecision === "reviewed_internal" && eventHistoryComplete && assignmentProblems.length === 0),
    finalDisposition: "EXECUTION_FORBIDDEN", reasons,
    agentExecutionPermitted: false, outboundAuthorized: false,
    modelCallsPerformed: false, dbWritesPerformed: false };
}
