// ADM-5B.2. A deterministic evidence inventory, NOT a runnable agent payload.
// The hash is evidence of equal compiler output, not an authorization, approval or signature.
import { createHash } from "node:crypto";
import type { ContextPreview } from "./contextContractV1";

export const ADM5B2_CONTRACT = "ARCTOR_ADM5B2_CONTEXT_MANIFEST_READ_ONLY_V1" as const;
export const ADM5B2_SCHEMA_VERSION = 1 as const;
export const ADM5B2_MAX_CHARS = 8000;
const HEX = /^[0-9a-f]{64}$/i;
const sha = (x: string): string => createHash("sha256").update(x, "utf8").digest("hex");

export type ManifestEntry = {
  ordinal: number;
  sourceType: "case" | "assignment" | "public_source" | "approved_instruction";
  sourceRef: string;
  label: string;
  classification: "internal_admin" | "verified_public_excerpt" | "approved_instruction";
  provenance: string;
  chars: number;
  sha256: string;
  included: true;
  outboundAuthorized: false;
};
export type ContextManifest = {
  contract: typeof ADM5B2_CONTRACT;
  schemaVersion: 1;
  mode: "human_readonly_preview";
  caseCode: string;
  caseId: string;
  assignmentId: string;
  roleCode: string;
  taskCode: string;
  entries: readonly ManifestEntry[];
  documentsIncluded: readonly { id: string; version: string; sha256: string }[];
  documentsExcluded: readonly { id: string; version: string; reason: string }[];
  sourceVerification: ContextPreview["sourceVerification"];
  blockingReasons: readonly string[];
  totals: { sectionCount: number; characters: number; tokensApproxMin: number; tokensApproxMax: number; withinCharLimit: boolean };
  digestAlgorithm: "SHA-256";
  digestSha256: string;
  comparison: { previousDigest: string | null; result: "not_requested" | "unchanged" | "changed" };
  contextApproved: false;
  outboundAuthorized: false;
  agentExecutionPermitted: false;
  modelCallsPerformed: false;
  dbWritesPerformed: false;
};
const classifications: Record<ManifestEntry["sourceType"], ManifestEntry["classification"]> = {
  case: "internal_admin", assignment: "internal_admin",
  public_source: "verified_public_excerpt", approved_instruction: "approved_instruction"
};

export function buildAdminContextManifestV1(preview: ContextPreview, previousDigest: string | null = null): ContextManifest {
  if (previousDigest !== null && !HEX.test(previousDigest)) throw new Error("INVALID_PREVIOUS_DIGEST");
  if (preview.contract !== "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1" ||
      preview.mode !== "admin_preview_only" || !preview.previewConstructed ||
      preview.agentExecutionPermitted !== false || preview.dbWritesPerformed !== false ||
      preview.modelCallsPerformed !== false || preview.agentContextApproved !== false) {
    throw new Error("UPSTREAM_PREVIEW_INVARIANT_FAILED");
  }
  if (!preview.caseId || !preview.assignmentId || !preview.roleCode || !preview.taskCode) {
    throw new Error("INCOMPLETE_PREVIEW_IDENTITY");
  }
  const entries: ManifestEntry[] = preview.sections.map((section, ordinal) => {
    if (!(section.sourceType in classifications) || !section.reference || !section.label) {
      throw new Error("UNSUPPORTED_OR_UNIDENTIFIED_SECTION");
    }
    // Fail closed if the original compiler ever includes a public excerpt without proof.
    if (section.sourceType === "public_source" && preview.sourceVerification !== "verified_exact_public_text") {
      throw new Error("UNVERIFIED_PUBLIC_SOURCE_IN_PREVIEW");
    }
    const provenance = section.sourceType === "case" ? "adm4_case_record" :
      section.sourceType === "assignment" ? "adm4_assignment_record" :
      section.sourceType === "public_source" ? "active_public_message_literal_substring_match" :
      "versioned_approved_library_brief";
    if (section.sourceType === "approved_instruction" &&
      !preview.documentsSelected.some(d => `${d.id}@${d.version}` === section.reference && HEX.test(d.sha256))) {
      throw new Error("UNVERIFIED_INSTRUCTION_SECTION");
    }
    return { ordinal, sourceType: section.sourceType, sourceRef: section.reference,
      label: section.label, classification: classifications[section.sourceType],
      provenance, chars: section.text.length, sha256: sha(section.text),
      included: true, outboundAuthorized: false };
  });
  if (!entries.some(x => x.sourceType === "case") || !entries.some(x => x.sourceType === "assignment")) {
    throw new Error("REQUIRED_CASE_OR_ASSIGNMENT_MISSING");
  }
  // Version and hash are bound to the exact selected brief; exclude rejected candidates.
  const docs = preview.documentsSelected.map(d => {
    if (!HEX.test(d.sha256)) throw new Error("INVALID_DOCUMENT_SOURCE_SHA256");
    return { id: d.id, version: d.version, sha256: d.sha256.toLowerCase() };
  });
  const excluded = preview.documentsExcluded.map(d => ({ id: d.id, version: d.version, reason: d.reason }));
  const chars = preview.estimate.characters;
  const withinCharLimit = chars <= ADM5B2_MAX_CHARS;
  const blockers = [...new Set([
    ...preview.reasons.map(r => r.code),
    ...(withinCharLimit ? [] : ["CONTEXT_TOO_LARGE"]),
    ...(preview.sourceVerification === "verified_exact_public_text" ? [] : ["PUBLIC_SOURCE_NOT_VERIFIED"]),
    "OUTBOUND_POLICY_NOT_APPROVED",
  ])].sort();
  // Stable JSON: field order explicit; no timestamps, random ids, browser metadata or user-provided values.
  const canonical = {
    schemaVersion: ADM5B2_SCHEMA_VERSION, caseCode: preview.caseCode, caseId: preview.caseId,
    assignmentId: preview.assignmentId, roleCode: preview.roleCode, taskCode: preview.taskCode,
    entries, documentsIncluded: docs, documentsExcluded: excluded,
    sourceVerification: preview.sourceVerification, blockingReasons: blockers,
    characters: chars, withinCharLimit
  };
  const digestSha256 = sha(JSON.stringify(canonical));
  return { contract: ADM5B2_CONTRACT, schemaVersion: ADM5B2_SCHEMA_VERSION,
    mode: "human_readonly_preview", caseCode: preview.caseCode, caseId: preview.caseId,
    assignmentId: preview.assignmentId, roleCode: preview.roleCode, taskCode: preview.taskCode,
    entries, documentsIncluded: docs, documentsExcluded: excluded,
    sourceVerification: preview.sourceVerification, blockingReasons: blockers,
    totals: { sectionCount: entries.length, characters: chars,
      tokensApproxMin: preview.estimate.tokensApproxMin,
      tokensApproxMax: preview.estimate.tokensApproxMax, withinCharLimit },
    digestAlgorithm: "SHA-256", digestSha256,
    comparison: { previousDigest, result: previousDigest === null ? "not_requested" :
      previousDigest.toLowerCase() === digestSha256 ? "unchanged" : "changed" },
    contextApproved: false, outboundAuthorized: false, agentExecutionPermitted: false,
    modelCallsPerformed: false, dbWritesPerformed: false };
}
