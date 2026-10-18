// ADM-5B.1 — pure, deliberately non-executable context preview contract.
// This is NOT an OpenAI prompt delivery / agent execution permission.
export const ADM5B1_CONTRACT = "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1" as const;
export const MAX_CASE_CHARS = 12000;
export const MAX_ASSIGNMENT_CHARS = 12000;
export const MAX_CONTEXT_CHARS = 8000;
export const MAX_PUBLIC_EXCERPT_CHARS = 1200;

export type RoleSnapshot = {
  roleCode: string; isActive: boolean; agentExecutionEnabled: boolean;
};
export type CaseSnapshot = {
  id: string; caseCode: string; title: string; description: string;
  status: string; ownerRoleCode: string;
  sourceSystem: string; sourceEntityKind: string | null; sourceExternalId: string | null;
  nextExpectedResult: string | null;
};
export type AssignmentSnapshot = {
  id: string; caseId: string; recipientRoleCode: string; status: string;
  assignmentText: string; requiredResult: string; recipientAgentCode: string | null;
};
export type PublicSourceEvidence = {
  sourceId: string;
  sourceMessageId: string | null;
  verification: "verified_exact_public_text" | "verified_public_metadata_only" | "not_public" | "unavailable";
  excerpt: string | null;
  processingStatus: string | null;
};
export type ContextDocument = {
  id: string; version: string; approvalStatus: string; agentEnabled: boolean;
  roleCodes: readonly string[]; taskCodes: readonly string[];
  sourceSha256: string; agentBrief: string;
};
export type Reason = { code: string; certainty: "confirmed" | "unknown"; humanText: string; nextAction: string };
export type ContextSection = {
  sourceType: "case" | "assignment" | "public_source" | "approved_instruction";
  reference: string; label: string; text: string;
};
export type ContextPreview = {
  contract: typeof ADM5B1_CONTRACT; mode: "admin_preview_only";
  caseCode: string; caseId: string; assignmentId: string; roleCode: string; taskCode: string;
  sections: readonly ContextSection[];
  documentsSelected: readonly { id: string; version: string; sha256: string }[];
  documentsExcluded: readonly { id: string; version: string; reason: string }[];
  sourceVerification: PublicSourceEvidence["verification"];
  reasons: readonly Reason[];
  estimate: { characters: number; tokensApproxMin: number; tokensApproxMax: number; basis: "character_heuristic_not_billing" };
  previewConstructed: boolean;
  agentContextApproved: false;
  agentExecutionPermitted: false;
  dbWritesPerformed: false;
  modelCallsPerformed: false;
};
export type CompilerInput = {
  caseRecord: CaseSnapshot;
  assignment: AssignmentSnapshot;
  role: RoleSnapshot;
  taskCode: string;
  permittedRoles: readonly string[] | null; // derived from ADM-5A.2 registry, not browser roles
  documents: readonly ContextDocument[];
  publicSource: PublicSourceEvidence;
};
const digest = /^[a-f0-9]{64}$/i;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const safe = (value: string, limit: number) => value.replace(/\u0000/g, "").slice(0, limit);

export function compileAdminContextPreviewV1(input: CompilerInput): ContextPreview {
  const { caseRecord: c, assignment: a, role, taskCode, publicSource: source } = input;
  const reasons: Reason[] = [];
  const warn = (code: string, humanText: string, nextAction: string, certainty: Reason["certainty"] = "confirmed") =>
    reasons.push({ code, humanText, nextAction, certainty });
  const sections: ContextSection[] = [];

  if (a.caseId !== c.id || a.recipientRoleCode !== role.roleCode || !uuid.test(a.id)) {
    warn("ASSIGNMENT_CASE_MISMATCH", "Поручение не подтверждено как часть выбранного дела и должности.", "Проверить реестр ADM-4.");
  }
  if (!role.isActive) warn("ROLE_INACTIVE", "Должность неактивна.", "Проверить статус роли.");
  if (role.agentExecutionEnabled) warn("HUMAN_ASSIGNMENT_REGRESSION_RISK", "Флаг агента включён; это может нарушить человеческие поручения ADM-2B2.", "Не запускать ИИ. Провести отдельную миграцию и регрессию.");
  if (!input.permittedRoles || !input.permittedRoles.includes(role.roleCode)) {
    warn("TASK_ROLE_NOT_PERMITTED", "Тип задачи не предусмотрен для этой должности в проектном каталоге.", "Проверить taskCode и должность.");
  }
  if (a.recipientAgentCode) {
    warn("AGENT_ASSIGNMENT_UNVERIFIED", "Для поручения указан агент, но его регистрация и права не проверялись.", "Проверить полномочия отдельно в ADM-5C/D.");
  }
  if (["completed", "cancelled", "declined"].includes(a.status)) {
    warn("ASSIGNMENT_TERMINAL", "Поручение уже завершено или отменено.", "Выбрать действующее поручение.");
  }

  sections.push({ sourceType: "case", reference: c.caseCode, label: "Дело ADM-4",
    text: `Дело ${c.caseCode}: ${safe(c.title, 240)}. Статус: ${safe(c.status, 30)}. Описание: ${safe(c.description, MAX_CASE_CHARS)}. Ожидаемый результат: ${safe(c.nextExpectedResult ?? "не указан", 3000)}.` });
  sections.push({ sourceType: "assignment", reference: a.id, label: "Конкретное поручение ADM-4",
    text: `Поручение (${safe(a.status, 30)}) для ${safe(a.recipientRoleCode, 50)}: ${safe(a.assignmentText, MAX_ASSIGNMENT_CHARS)}. Требуемый результат: ${safe(a.requiredResult, 6000)}.` });

  if (c.sourceSystem !== "arctor" || c.sourceEntityKind !== "commercial_activity_event"
    || !c.sourceExternalId || c.sourceExternalId !== source.sourceId) {
    warn("UNSUPPORTED_SOURCE_SCOPE", "Для этого подэтапа не доказана применимость и публичность первоисточника.", "Уточнить контракт чтения других источников.");
  } else if (source.verification !== "verified_exact_public_text" || !source.excerpt) {
    warn("SOURCE_TEXT_NOT_PROVEN", "Публичность метаданных не доказывает совпадение текста активности с публикацией. Текст не включён.", "Проверить точное совпадение с публичным сообщением.");
  } else if (source.excerpt.length > MAX_PUBLIC_EXCERPT_CHARS) {
    warn("SOURCE_EXCERPT_TOO_LARGE", "Текст первоисточника превышает установленный лимит.", "Утвердить безопасный фрагмент отдельно.");
  } else {
    sections.push({ sourceType: "public_source", reference: source.sourceId,
      label: "Проверенное публичное сообщение", text: source.excerpt });
  }

  const applicable = input.documents.filter(d => d.roleCodes.includes(role.roleCode) && d.taskCodes.includes(taskCode));
  const included: ContextPreview["documentsSelected"][number][] = [];
  const excluded: ContextPreview["documentsExcluded"][number][] = [];
  const seen = new Set<string>();
  for (const d of applicable) {
    if (seen.has(d.id)) { excluded.push({ id: d.id, version: d.version, reason: "duplicate_id" }); continue; }
    seen.add(d.id);
    const reason = d.approvalStatus !== "approved" ? "not_approved"
      : !d.agentEnabled ? "agent_not_enabled"
      : !digest.test(d.sourceSha256) ? "invalid_sha256"
      : !d.agentBrief.trim() ? "empty_agent_brief" : null;
    if (reason) { excluded.push({ id: d.id, version: d.version, reason }); continue; }
    included.push({ id: d.id, version: d.version, sha256: d.sourceSha256 });
    sections.push({ sourceType: "approved_instruction", reference: `${d.id}@${d.version}`,
      label: "Утверждённая инструкция", text: safe(d.agentBrief, 2500) });
  }
  if (!included.length) warn("NO_APPROVED_INSTRUCTIONS", "Нет утверждённых и разрешённых агенту инструкций по этой роли и задаче.", "Согласовать версии документов отдельно, не включая ИИ.");

  const chars = sections.map(s => s.label.length + s.text.length).reduce((acc,n) => acc+n, 0);
  if (chars > MAX_CONTEXT_CHARS) warn("CONTEXT_TOO_LARGE", "Превышен лимит контекста предпросмотра; часть текста нельзя автоматически отрезать.", "Уменьшить задачу и явно согласовать сокращение.");
  // This phase never hands the sections to a model even if all checks happen to pass.
  warn("RUNTIME_NOT_IMPLEMENTED", "ADM-5B.1 формирует только административный предпросмотр; запуск ИИ не реализован.", "Продолжить ADM-5B/C/D и отдельную приёмку.");
  return {
    contract: ADM5B1_CONTRACT, mode: "admin_preview_only", caseCode: c.caseCode,
    caseId: c.id, assignmentId: a.id, roleCode: role.roleCode, taskCode,
    sections, documentsSelected: included, documentsExcluded: excluded,
    sourceVerification: source.verification, reasons,
    estimate: { characters: chars, tokensApproxMin: Math.ceil(chars / 5),
      tokensApproxMax: Math.ceil(chars / 2), basis: "character_heuristic_not_billing" },
    previewConstructed: true, agentContextApproved: false, agentExecutionPermitted: false,
    dbWritesPerformed: false, modelCallsPerformed: false
  };
}
