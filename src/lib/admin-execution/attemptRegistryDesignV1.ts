// ADM-5C.3: read-only candidate of an execution intent, NOT a persisted attempt.
// No runtime, wallet operation, approval or AI invocation can be obtained here.
import { createHash } from "node:crypto";
import type { PreflightReport } from "./executionPreflightV1";
import type { ContextQualityReport } from "./contextQualityV1";

export const ADM5C3_CONTRACT = "ARCTOR_ADM5C3_ATTEMPT_CANDIDATE_READ_ONLY_V1" as const;
export const ATTEMPT_STATES = [
  "draft", "awaiting_preflight", "blocked", "awaiting_human_authorization", "queued", "running",
  "report_ready", "awaiting_human_review", "approved", "rejected", "needs_revision", "failed", "cancelled",
] as const;
export type AttemptState = (typeof ATTEMPT_STATES)[number];
export type AttemptIssue = {code: string; status: "blocked" | "unknown"; explanation: string; nextAction: string};
export type AttemptCandidate = {
  contract: typeof ADM5C3_CONTRACT; candidateFingerprint: string; persistedAttemptId: null;
  caseCode: string; assignmentId: string; roleCode: string; taskCode: string;
  snapshotId: string | null; snapshotVersion: number | null; currentManifestDigest: string | null;
  targetState: "awaiting_preflight"; numberOfPersistedAttempts: null;
  selectedModelId: null; pricingSnapshotId: null; approvedBudgetEur: null; payerId: null;
  budgetReservationId: null; outboundPolicyId: null; approvedInstructionVersionIds: readonly [];
  issues: readonly AttemptIssue[]; nextRequiredActions: readonly string[];
  finalDisposition: "EXECUTION_FORBIDDEN";
  agentExecutionPermitted: false; outboundAuthorized: false; budgetReserved: false;
  dbWritesPerformed: false; modelCallsPerformed: false;
};
const CODE=/^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TASK=/^[a-z][a-z0-9_]{2,90}$/;
const digestPattern=/^[0-9a-f]{64}$/i;
export function planAttemptCandidateV1(preflight: PreflightReport, quality: ContextQualityReport): AttemptCandidate {
  if (preflight.contract!=="ARCTOR_ADM5C1_PREFLIGHT_DESIGN_READ_ONLY_V1" ||
      quality.contract!=="ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1" ||
      preflight.agentExecutionPermitted!==false || preflight.outboundAuthorized!==false ||
      quality.agentExecutionPermitted!==false || quality.outboundAuthorized!==false ||
      !CODE.test(preflight.caseCode) || !UUID.test(preflight.assignmentId) ||
      !TASK.test(preflight.taskCode) || !/^[a-z][a-z0-9_]{1,60}$/.test(preflight.roleCode) ||
      preflight.caseCode!==quality.caseCode || preflight.assignmentId!==quality.assignmentId ||
      preflight.taskCode!==quality.taskCode || preflight.roleCode!==quality.roleCode ||
      preflight.gates.length!==preflight.passed+preflight.blocked+preflight.unknown ||
      preflight.finalDisposition!=="EXECUTION_FORBIDDEN" || preflight.modelCallsPerformed!==false ||
      quality.modelCallsPerformed!==false || preflight.dbWritesPerformed!==false ||quality.dbWritesPerformed!==false)
    throw new Error("ATTEMPT_CANDIDATE_UPSTREAM_INVARIANT_FAILED");
  const s=quality.snapshot;
  const validSnapshot=Boolean(s && s.integrity==="valid" && s.currentManifestMatches && s.changed==="none" &&
    s.frozenDigestMatches && s.embeddedDigestMatches && s.sectionHashesMatch &&
    Number.isInteger(s.version) && s.version>0 && UUID.test(s.id));
  const digest=quality.manifestDigest;
  const validManifest=typeof digest==="string"&&digestPattern.test(digest);
  const block:AttemptIssue[]=[];
  if(!validSnapshot) block.push({code:"SNAPSHOT_UNVERIFIED",status:"blocked",explanation:"Нет доказанного актуального и целостного снимка.",nextAction:"Повторить проверку ADM-5B.4 и заново согласовать версию через ADM-5B.3."});
  if(!validManifest) block.push({code:"MANIFEST_DIGEST_UNVERIFIED",status:"blocked",explanation:"Не получен проверяемый SHA-256 манифеста.",nextAction:"Проверить происхождение и контрольные суммы ADM-5B.2/5B.4."});
  // Narrow each gate in the loop body; Array.filter(Boolean) is not a type predicate.
  // "pass" evidence must never be promoted into a blocked/unknown AttemptIssue.
  for (const g of preflight.gates) {
    if (g.state === "pass") continue;
    block.push({code:g.code,status:g.state,explanation:g.evidence,nextAction:g.nextAction});
  }
  // ADM-5C.2 is strictly ephemeral: no model grant, payer, policy or budget reservation is available here.
  block.push({code:"BUDGET_NOT_COMMITTED",status:"blocked",explanation:"ADM-5C.2 рассчитывает проектную сумму, но не создаёт финансового обязательства.",nextAction:"В следующей фазе определить плательщика и лимит, провести серверное резервирование через существующий AI Billing."});
  block.push({code:"ATTEMPT_STORAGE_NOT_DEPLOYED",status:"blocked",explanation:"Реестр и серверные события попыток ADM-5C.3 ещё не введены в эксплуатацию.",nextAction:"Отдельно принять SQL-схему, RLS, service-role RPC, защиту от дубликатов и неизменяемый аудит."});
  const payload={contract:ADM5C3_CONTRACT,caseCode:preflight.caseCode,assignmentId:preflight.assignmentId.toLowerCase(),
    taskCode:preflight.taskCode,roleCode:preflight.roleCode,snapshotId:validSnapshot?s!.id.toLowerCase():null,
    snapshotVersion:validSnapshot?s!.version:null,manifestDigest:validManifest?digest.toLowerCase():null};
  const candidateFingerprint=createHash("sha256").update(JSON.stringify(payload),"utf8").digest("hex");
  return {contract:ADM5C3_CONTRACT,candidateFingerprint,persistedAttemptId:null,
    caseCode:preflight.caseCode,assignmentId:preflight.assignmentId,roleCode:preflight.roleCode,taskCode:preflight.taskCode,
    snapshotId:validSnapshot?s!.id:null,snapshotVersion:validSnapshot?s!.version:null,
    currentManifestDigest:validManifest?digest:null,targetState:"awaiting_preflight",
    numberOfPersistedAttempts:null,selectedModelId:null,pricingSnapshotId:null,approvedBudgetEur:null,payerId:null,
    budgetReservationId:null,outboundPolicyId:null,approvedInstructionVersionIds:[],
    issues:block,nextRequiredActions:[...new Set(block.map(g=>g.nextAction))],
    finalDisposition:"EXECUTION_FORBIDDEN",agentExecutionPermitted:false,outboundAuthorized:false,
    budgetReserved:false,dbWritesPerformed:false,modelCallsPerformed:false};
}
