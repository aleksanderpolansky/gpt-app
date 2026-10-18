// ARCTor ADM-5B.4: read-only content/policy provenance diagnostic.
// All hashes represent comparison evidence, NOT authorization or a signature.
import { createHash } from "node:crypto";
import type { ContextPreview } from "./contextContractV1";
import { buildAdminContextManifestV1 } from "./contextManifestV1";
import { makeInternalSnapshot } from "./contextSnapshotV1";

export const ADM5B4_CONTRACT = "ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1" as const;
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const isDigest = (text: unknown): text is string => typeof text === "string" && /^[a-f0-9]{64}$/.test(text);

type EvidenceSection = { ordinal: number; sourceType: string; reference: string; text: string; sha256: string };
export type SavedEvidence = {
  id: string; version_num: number; manifest_digest: string; snapshot_digest: string;
  snapshot_text: string; captured_at: string;
};
export type SectionCheck = {
  ordinal: number; sourceType: string; reference: string; sha256: string; chars: number;
  required: boolean; rationale: string;
};
export type ContextQualityReport = {
  contract: typeof ADM5B4_CONTRACT;
  caseCode: string; assignmentId: string; roleCode: string; taskCode: string;
  sectionCount: number; characters: number; tokensApproxMin: number; tokensApproxMax: number;
  tokensEstimateIsBilling: false;
  contextCharLimit: number; withinLimit: boolean;
  manifestDigest: string; frozenDigest: string; frozenBytes: number;
  includedTextDigest: string; policyMetadataDigest: string;
  sections: readonly SectionCheck[];
  includedDocuments: readonly { id: string; version: string }[];
  excludedDocuments: readonly { id: string; version: string; reason: string }[];
  snapshot: null | {
    id: string; version: number; createdAt: string;
    integrity: "valid" | "invalid";
    changed: "none" | "included_text" | "metadata_or_exclusions" | "unknown";
    currentManifestMatches: boolean;
    frozenDigestMatches: boolean; embeddedDigestMatches: boolean; sectionHashesMatch: boolean;
    status: string;
  };
  blockingReasons: readonly string[];
  optimizationCandidates: readonly { section: string; recommendation: string; enabled: false }[];
  outboundAuthorized: false; agentExecutionPermitted: false;
  modelCallsPerformed: false; dbWritesPerformed: false;
};
function contentFingerprint(sections: readonly EvidenceSection[]) {
  return sha(JSON.stringify(sections.map(s => ({
    ordinal: s.ordinal, sourceType: s.sourceType, reference: s.reference,
    sha256: sha(s.text), chars: s.text.length,
  }))));
}
export function calculateDraftCost(input: {
  estimatedInputLow: number; estimatedInputHigh: number; overheadTokens: number;
  outputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
}): { lowUsd: number; highUsd: number } {
  const values = Object.values(input);
  if (values.some(v => !Number.isFinite(v) || v < 0 || v > 10000000)) throw new Error("INVALID_ESTIMATE_INPUT");
  if (input.estimatedInputLow > input.estimatedInputHigh) throw new Error("INVALID_TOKEN_RANGE");
  return {
    lowUsd: ((input.estimatedInputLow + input.overheadTokens) * input.inputUsdPerMillion + input.outputTokens * input.outputUsdPerMillion) / 1000000,
    highUsd: ((input.estimatedInputHigh + input.overheadTokens) * input.inputUsdPerMillion + input.outputTokens * input.outputUsdPerMillion) / 1000000,
  };
}
export function buildContextQualityV1(preview: ContextPreview, saved: SavedEvidence | null = null, decision = "none"): ContextQualityReport {
  const manifest = buildAdminContextManifestV1(preview);
  const frozen = makeInternalSnapshot(preview);
  const sections: EvidenceSection[] = preview.sections.map((s, ordinal) => ({
    ordinal, sourceType: s.sourceType, reference: s.reference, text: s.text,
    sha256: sha(s.text),
  }));
  const textDigest = contentFingerprint(sections);
  const policyDigest = sha(JSON.stringify({
    included: manifest.documentsIncluded,
    excluded: manifest.documentsExcluded,
    blockers: manifest.blockingReasons,
    sourceVerification: manifest.sourceVerification,
  }));
  const checks: SectionCheck[] = sections.map(s => ({
    ordinal: s.ordinal, sourceType: s.sourceType, reference: s.reference,
    sha256: s.sha256, chars: s.text.length,
    required: s.sourceType !== "approved_instruction",
    rationale: s.sourceType === "case" ? "Идентичность, ограничения и цель дела ADM-4" :
      s.sourceType === "assignment" ? "Точное поручение и критерий результата" :
      s.sourceType === "public_source" ? "Проверенный буквальный фрагмент публичного первоисточника" :
      "Только утверждённая и разрешённая версия специализированной инструкции",
  }));
  const recommendations = checks.map(c => ({
    section: `${c.sourceType} · ${c.reference}`,
    recommendation: c.required
      ? "Обязательная секция; автоматическое исключение и сокращение запрещены"
      : "Допустимый кандидат для отдельного ручного решения о минимизации; сейчас не исключается",
    enabled: false as const,
  }));
  let snapshot: ContextQualityReport["snapshot"] = null;
  if (saved) {
    let frozenDigestMatches = false;
    let embeddedDigestMatches = false;
    let sectionHashesMatch = false;
    let oldTextDigest: string | null = null;
    let status = "STORED_SNAPSHOT_INVALID";
    try {
      frozenDigestMatches = isDigest(saved.snapshot_digest) && sha(saved.snapshot_text) === saved.snapshot_digest;
      const x = JSON.parse(saved.snapshot_text) as Record<string, unknown>;
      const oldManifest = x.manifest as Record<string, unknown> | undefined;
      const raw = x.sections;
      if (x.contract === "ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1" &&
          Array.isArray(raw) && oldManifest && typeof oldManifest === "object") {
        const priorSections: EvidenceSection[] = [];
        sectionHashesMatch = raw.every((s: unknown, i: number) => {
          if (!s || typeof s !== "object" || Array.isArray(s)) return false;
          const v = s as Record<string, unknown>;
          if (!Number.isInteger(v.ordinal) || v.ordinal !== i ||
              typeof v.text !== "string" || typeof v.sourceType !== "string" ||
              typeof v.reference !== "string" || !isDigest(v.sha256) || sha(v.text) !== v.sha256) return false;
          priorSections.push({ ordinal: v.ordinal as number, sourceType: v.sourceType,
            reference: v.reference, text: v.text, sha256: v.sha256 });
          return true;
        });
        if (sectionHashesMatch) oldTextDigest = contentFingerprint(priorSections);
        embeddedDigestMatches = oldManifest.digestSha256 === saved.manifest_digest;
        status = frozenDigestMatches && embeddedDigestMatches && sectionHashesMatch ? "STORED_INTEGRITY_VERIFIED" : "STORED_INTEGRITY_FAILED";
      }
    } catch { status = "STORED_SNAPSHOT_INVALID_JSON"; }
    const currentManifestMatches = saved.manifest_digest === frozen.manifestDigest;
    const integrityValid = frozenDigestMatches && embeddedDigestMatches && sectionHashesMatch;
    const changed = !integrityValid || !oldTextDigest ? "unknown" :
      oldTextDigest !== textDigest ? "included_text" :
      !currentManifestMatches ? "metadata_or_exclusions" : "none";
    snapshot = { id: saved.id, version: saved.version_num, createdAt: saved.captured_at,
      integrity: integrityValid ? "valid" : "invalid", changed, currentManifestMatches,
      frozenDigestMatches, embeddedDigestMatches, sectionHashesMatch,
      status: `${status}; decision=${decision}` };
  }
  const blockers = [...manifest.blockingReasons];
  if (snapshot?.integrity === "invalid") blockers.push("STORED_SNAPSHOT_INTEGRITY_FAILED");
  if (snapshot && !snapshot.currentManifestMatches) blockers.push("SAVED_MANIFEST_STALE");
  return {
    contract: ADM5B4_CONTRACT, caseCode: preview.caseCode, assignmentId: preview.assignmentId,
    roleCode: preview.roleCode, taskCode: preview.taskCode,
    sectionCount: manifest.totals.sectionCount, characters: manifest.totals.characters,
    tokensApproxMin: manifest.totals.tokensApproxMin, tokensApproxMax: manifest.totals.tokensApproxMax,
    tokensEstimateIsBilling: false, contextCharLimit: 8000,
    withinLimit: manifest.totals.withinCharLimit,
    manifestDigest: manifest.digestSha256, frozenDigest: frozen.frozenDigest,
    frozenBytes: Buffer.byteLength(frozen.frozenJson,"utf8"),
    includedTextDigest: textDigest, policyMetadataDigest: policyDigest,
    sections: checks, includedDocuments: manifest.documentsIncluded.map(d=>({id:d.id,version:d.version})),
    excludedDocuments: manifest.documentsExcluded,
    snapshot, blockingReasons: [...new Set(blockers)].sort(), optimizationCandidates: recommendations,
    outboundAuthorized: false, agentExecutionPermitted: false, modelCallsPerformed: false, dbWritesPerformed: false,
  };
}
