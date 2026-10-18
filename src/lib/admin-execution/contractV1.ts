// ADM-5A.2: DESIGN-ONLY contract. No DB writes, no agent executor, no provider calls.
// Human assignment status remains under ADM-2B2; these are future *attempt* states.
export const ADM5A2_CONTRACT = "ARCTOR_ADM5A2_GOVERNANCE_DESIGN_READ_ONLY_V1" as const;
export const ADM5A2_ROLE_CODES = ["process", "product", "semantic", "ai", "engineering", "quality", "commercial", "support"] as const;
export type AdminRoleCode = (typeof ADM5A2_ROLE_CODES)[number];
export const ADM5A2_CAPABILITIES = ["inspect", "read_approved_context", "prepare_report", "request_approval", "execute_approved_action"] as const;
export type AdminAgentCapability = (typeof ADM5A2_CAPABILITIES)[number];
export const ADM5A2_CURRENT_CAPABILITIES: readonly AdminAgentCapability[] = ["inspect"];
export type ReasonCertainty = "confirmed" | "probable" | "unknown";
export type ReadinessReason = { readonly code: string; readonly description: string; readonly certainty: ReasonCertainty; readonly nextAction: string };

export const ADM5A2_TASKS = [
  { taskCode: "agent_architecture_review", title: "Архитектурная проверка исполнителя", roles: ["ai", "engineering", "quality", "process"] },
  { taskCode: "agent_context_assembly", title: "Подготовка узкого контекста", roles: ["ai", "engineering", "process", "quality"] },
  { taskCode: "admin_executor_governance", title: "Контроль полномочий исполнителя", roles: ["ai", "process", "engineering", "quality", "semantic", "product", "commercial", "support"] },
  { taskCode: "observation_leaf_matching", title: "Сопоставление листовых ОН", roles: ["semantic", "quality"] },
  { taskCode: "activity_parameter_diagnostics", title: "Диагностика параметров активности", roles: ["semantic", "engineering", "quality"] },
  { taskCode: "commercial_fact_preflight", title: "Предпроверка коммерческих фактов", roles: ["commercial", "semantic", "quality", "engineering"] },
  { taskCode: "administrative_knowledge_governance", title: "Управление инструкциями", roles: ["ai", "process", "quality"] }
] as const satisfies ReadonlyArray<{ taskCode: string; title: string; roles: readonly AdminRoleCode[] }>;

// These transitions are proposed for a future *separate run ledger*, never ADM-2B2 assignment updates.
export const ADM5A2_DRAFT_TRANSITIONS = {
  draft: ["awaiting_preflight", "cancelled"],
  awaiting_preflight: ["awaiting_human_authorization", "blocked", "cancelled"],
  awaiting_human_authorization: ["queued", "rejected", "cancelled"],
  queued: ["running", "blocked", "cancelled"],
  running: ["report_ready", "failed", "blocked"],
  report_ready: ["awaiting_human_review"],
  awaiting_human_review: ["approved", "rejected", "needs_revision"],
  needs_revision: ["cancelled"], // a revision must use a NEW runId, not silently reset history
  approved: [], rejected: [], cancelled: [], failed: [], blocked: []
} as const;
export type DraftRunState = keyof typeof ADM5A2_DRAFT_TRANSITIONS;

export type RoleEvidence = {
  roleCode: string;
  isActive: boolean | null; // null means unknown, never silently true
  agentExecutionEnabled: boolean | null;
};
export type DocumentEvidence = {
  id: string;
  version: string;
  approvalStatus: string;
  agentEnabled: boolean;
  roleCodes: readonly string[];
  taskCodes: readonly string[];
  sourceSha256: string;
};
export type FutureRunRequirements = {
  registrationVerified: boolean; assignmentVerified: boolean;
  humanAuthorizationVerified: boolean; contextCompilerApproved: boolean;
  aiBillingPolicyApproved: boolean; secureRunAuditReady: boolean;
};

export type GovernanceResult = {
  readonly roleCode: string; readonly taskCode: string;
  readonly humanRoleEligible: boolean;
  readonly humanAssignmentRegressionRisk: boolean;
  readonly referenceDocuments: number;
  readonly authorizedDocuments: number;
  readonly contextReady: false; // no ADM-5 context compiler is installed
  readonly agentRunPermitted: false; // deliberately invariant during ADM-5A.2
  readonly currentCapabilities: readonly ["inspect"];
  readonly reasons: readonly ReadinessReason[];
};

export function evaluateGovernance(role: RoleEvidence, taskCode: string,
  documents: readonly DocumentEvidence[], _future?: Partial<FutureRunRequirements>): GovernanceResult {
  const task = ADM5A2_TASKS.find((entry) => entry.taskCode === taskCode);
  const reasons: ReadinessReason[] = [];
  const push = (code: string, description: string, certainty: ReasonCertainty, nextAction: string) =>
    reasons.push({ code, description, certainty, nextAction });
  if (!ADM5A2_ROLE_CODES.some((code) => code === role.roleCode) || role.isActive === null) {
    push("ROLE_NOT_VERIFIED", "Должность отсутствует в подтверждённой восьмёрке или её состояние неизвестно.", "confirmed", "Проверить роль в административном реестре.");
  } else if (!role.isActive) {
    push("ROLE_INACTIVE", "Должность отключена.", "confirmed", "Согласовать восстановление роли отдельно от ИИ.");
  }
  if (!task) {
    push("UNKNOWN_TASK", "Код задачи отсутствует в проектном каталоге.", "confirmed", "Утвердить тип задачи перед исполнением.");
  } else if (!(task.roles as readonly string[]).includes(role.roleCode)) {
    push("TASK_ROLE_MISMATCH", "Для должности такой вид работы не предусмотрен проектным каталогом.", "confirmed", "Передать в соответствующее направление или согласовать новый контракт.");
  }
  if (role.agentExecutionEnabled === true) {
    push("HUMAN_ASSIGNMENT_CONFLICT", "В текущей ADM-2B2 включение флага агента может блокировать выдачу поручений человеку.", "confirmed", "Не менять флаг; согласовать отдельный SQL-контракт и регрессионные тесты.");
  } else if (role.agentExecutionEnabled === null) {
    push("AGENT_FLAG_UNKNOWN", "Текущее значение флага запуска ИИ не подтверждено.", "unknown", "Проверить флаг в Supabase.");
  } else {
    push("AGENT_DISABLED", "Флаг запуска ИИ отключён.", "confirmed", "Оставить отключённым до разрешения всех блокирующих условий.");
  }
  const applicable = documents.filter((doc) => doc.roleCodes.includes(role.roleCode) && doc.taskCodes.includes(taskCode));
  const approved = applicable.filter((doc) => doc.approvalStatus === "approved" && doc.agentEnabled && /^[0-9a-f]{64}$/i.test(doc.sourceSha256));
  if (!approved.length) {
    push("NO_APPROVED_CONTEXT", "Нет ни одной подходящей утверждённой инструкции с разрешением для агента.", "confirmed", "Согласовать документы и отдельно разрешить использование, не меняя права исполнителя.");
  }
  push("ASSIGNMENT_NOT_VERIFIED", "Конкретное поручение и регистрация исполнителя для этого запроса не проверялись.", "confirmed", "Подготовить контракт реального поручения ADM-4 и отдельную регистрацию исполнителя.");
  push("RUNTIME_NOT_IMPLEMENTED", "Серверный запуск, журнал попыток, одобрение и бюджет ADM-5 ещё не реализованы.", "confirmed", "Продолжить ADM-5B/C до проведения ограниченного пилота.");
  return {
    roleCode: role.roleCode, taskCode,
    humanRoleEligible: role.isActive === true,
    humanAssignmentRegressionRisk: role.agentExecutionEnabled === true,
    referenceDocuments: applicable.length, authorizedDocuments: approved.length,
    contextReady: false, agentRunPermitted: false,
    currentCapabilities: ["inspect"], reasons
  };
}
