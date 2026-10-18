import "server-only";
import { createHash } from "node:crypto";
import { supabase } from "../../../lib/supabase";
import { adminKnowledgeDocuments } from "@/lib/admin-knowledge/library.server";
import { ADM5A2_TASKS, ADM5A2_ROLE_CODES } from "@/lib/admin-execution/contractV1";
import { compileAdminContextPreviewV1, type CaseSnapshot, type AssignmentSnapshot,
  type RoleSnapshot, type PublicSourceEvidence, type ContextPreview } from "./contextContractV1";

const CASE_CODE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const publicTextField = /text|body|content|caption|title|description/i;
export type CaseChoice = { id: string; caseCode: string; title: string; sourceKind: string | null };
export type AssignmentChoice = { id: string; roleCode: string; status: string; createdAt: string };
export type ContextRead = {
  caseChoice: CaseChoice | null; choices: AssignmentChoice[];
  preview: ContextPreview | null; errorCode: string | null;
  debug: { sourceLookupStatus: string; candidateDocs: number; selectedTask: string };
};
const empty = (errorCode: string): ContextRead => ({ caseChoice: null, choices: [], preview: null,
  errorCode, debug: { sourceLookupStatus: "not_attempted", candidateDocs: 0, selectedTask: "" } });

export async function readAdminContextPreviewV1(caseCode: string, assignmentId: string | null,
  taskCode: string): Promise<ContextRead> {
  if (!CASE_CODE.test(caseCode) || caseCode.length > 30 || (assignmentId !== null && !UUID.test(assignmentId))) {
    return empty("INVALID_CASE_OR_ASSIGNMENT_ID");
  }
  const task = ADM5A2_TASKS.find(t => t.taskCode === taskCode);
  if (!task) return empty("UNKNOWN_TASK_CODE");
  const caseResult = await supabase.from("arctor_admin_cases_adm2_v1")
    .select("id,case_code,title,description,status,case_type,owner_role_code,source_system,source_entity_kind,source_external_id,next_expected_result")
    .eq("case_code", caseCode).maybeSingle();
  if (caseResult.error) return empty("CASE_READ_FAILED");
  if (!caseResult.data) return empty("CASE_NOT_FOUND");
  const c = caseResult.data;
  const caseChoice: CaseChoice = { id: c.id, caseCode: c.case_code, title: c.title, sourceKind: c.source_entity_kind };
  const assignments = await supabase.from("arctor_admin_assignments_adm2_v1")
    .select("id,case_id,recipient_role_code,status,assignment_text,required_result,created_at,recipient_agent_code")
    .eq("case_id", c.id).order("created_at", { ascending: false }).limit(21);
  if (assignments.error || !Array.isArray(assignments.data)) {
    return { ...empty("ASSIGNMENTS_READ_FAILED"), caseChoice };
  }
  if (assignments.data.length > 20) return { ...empty("ASSIGNMENT_LIST_TRUNCATED"), caseChoice };
  const choices = assignments.data.map(a => ({ id: a.id, roleCode: a.recipient_role_code,
    status: a.status, createdAt: a.created_at }));
  if (!assignmentId) return { ...empty("SELECT_ASSIGNMENT"), caseChoice, choices };
  const a = assignments.data.find(row => row.id === assignmentId);
  if (!a) return { ...empty("ASSIGNMENT_NOT_IN_CASE"), caseChoice, choices };
  if (!ADM5A2_ROLE_CODES.some(code => code === a.recipient_role_code)) {
    return { ...empty("UNKNOWN_ROLE_CODE"), caseChoice, choices };
  }
  const roleResult = await supabase.from("arctor_admin_roles_adm2_v1")
    .select("role_code,is_active,agent_execution_enabled")
    .eq("role_code", a.recipient_role_code).maybeSingle();
  if (roleResult.error || !roleResult.data) return { ...empty("ROLE_UNVERIFIED"), caseChoice, choices };

  const role: RoleSnapshot = { roleCode: roleResult.data.role_code,
    isActive: roleResult.data.is_active, agentExecutionEnabled: roleResult.data.agent_execution_enabled };
  const record: CaseSnapshot = { id: c.id, caseCode: c.case_code, title: c.title,
    description: c.description, status: c.status, ownerRoleCode: c.owner_role_code,
    sourceSystem: c.source_system, sourceEntityKind: c.source_entity_kind,
    sourceExternalId: c.source_external_id, nextExpectedResult: c.next_expected_result };
  const assign: AssignmentSnapshot = { id: a.id, caseId: a.case_id, recipientRoleCode: a.recipient_role_code,
    status: a.status, assignmentText: a.assignment_text, requiredResult: a.required_result,
    recipientAgentCode: a.recipient_agent_code };

  // Privacy boundary: only commercial sources with verified current PUBLIC+ACTIVE message status.
  // Never read raw personal activity signals or attach user data to context.
  let publicSource: PublicSourceEvidence = {
    sourceId: c.source_external_id || "", sourceMessageId: null,
    verification: "unavailable", excerpt: null, processingStatus: null
  };
  if (c.source_system === "arctor" && c.source_entity_kind === "commercial_activity_event"
    && typeof c.source_external_id === "string" && UUID.test(c.source_external_id)) {
    const activityResult = await supabase.from("activity_events")
      .select("id,input_text,source_message_object_id,commercial_processing_status")
      .eq("id", c.source_external_id).eq("activity_context_code", "commercial").maybeSingle();
    if (activityResult.error) return { ...empty("SOURCE_READ_FAILED"), caseChoice, choices };
    const activity = activityResult.data;
    if (activity?.source_message_object_id) {
      // A deliberately narrow, one-row server-side verification. Only a *matching* public
      // source text is included in preview. No other message fields escape the server.
      const msgResult = await supabase.from("message_objects").select("*")
        .eq("id", activity.source_message_object_id)
        .eq("audience_scope_code", "public").eq("lifecycle_status", "active").maybeSingle();
      if (msgResult.error) return { ...empty("PUBLIC_MESSAGE_READ_FAILED"), caseChoice, choices };
      if (msgResult.data) {
        const input = typeof activity.input_text === "string" ? activity.input_text.trim() : "";
        const message = msgResult.data as Record<string, unknown>;
        const exact = input.length > 0 && Object.entries(message).some(([field, value]) =>
          publicTextField.test(field) && typeof value === "string" &&
          value.toLocaleLowerCase().includes(input.toLocaleLowerCase()));
        publicSource = { sourceId: c.source_external_id, sourceMessageId: msgResult.data.id,
          verification: exact ? "verified_exact_public_text" : "verified_public_metadata_only",
          excerpt: exact ? input : null, processingStatus: activity.commercial_processing_status };
      } else {
        publicSource = { ...publicSource, verification: "not_public" };
      }
    }
  }
  const docs = adminKnowledgeDocuments.map(d => ({
    id: d.id, version: d.version, approvalStatus: d.approvalStatus, agentEnabled: d.agentEnabled,
    roleCodes: d.roleCodes, taskCodes: d.taskCodes,
    // Integrity guard: even an 'approved' label cannot authorize mismatched embedded markdown.
    sourceSha256: createHash("sha256").update(d.markdown, "utf8").digest("hex").toUpperCase() === d.sourceSha256.toUpperCase()
      ? d.sourceSha256 : "invalid",
    agentBrief: d.agentBrief
  }));
  const preview = compileAdminContextPreviewV1({ caseRecord: record, assignment: assign, role,
    taskCode, permittedRoles: task.roles, publicSource, documents: docs });
  return { caseChoice, choices, preview, errorCode: null,
    debug: { sourceLookupStatus: publicSource.verification,
      candidateDocs: docs.filter(d => d.roleCodes.includes(role.roleCode) && d.taskCodes.includes(taskCode)).length,
      selectedTask: taskCode } };
}
