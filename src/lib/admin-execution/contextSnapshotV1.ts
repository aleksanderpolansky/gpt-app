// ARCTor ADM-5B.3 -- immutable ADMIN-INTERNAL evidence. Never an outbound authorization.
import { createHash } from "node:crypto";
import { buildAdminContextManifestV1 } from "./contextManifestV1";
import type { ContextPreview } from "./contextContractV1";

export const ADM5B3_CONTRACT = "ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1" as const;
export const MAX_SNAPSHOT_BYTES = 32000;
const SHA = /^[a-f0-9]{64}$/;
const digest = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
export type FrozenSnapshot = {
  manifestDigest: string;
  frozenJson: string;
  frozenDigest: string;
  sectionCount: number;
  characters: number;
  blockingReasons: readonly string[];
};
export function makeInternalSnapshot(preview: ContextPreview): FrozenSnapshot {
  const manifest = buildAdminContextManifestV1(preview);
  const forbidden = new Set([
    "ASSIGNMENT_CASE_MISMATCH", "ROLE_INACTIVE", "TASK_ROLE_NOT_PERMITTED",
    "AGENT_ASSIGNMENT_UNVERIFIED", "ASSIGNMENT_TERMINAL", "HUMAN_ASSIGNMENT_REGRESSION_RISK",
    "UNSUPPORTED_SOURCE_SCOPE", "SOURCE_TEXT_NOT_PROVEN", "SOURCE_EXCERPT_TOO_LARGE",
  ]);
  if (preview.reasons.some(reason => forbidden.has(reason.code))) throw new Error("UNSAFE_PREVIEW_INVARIANT");
  if (!manifest.totals.withinCharLimit || manifest.totals.characters > 8000) throw new Error("CONTEXT_TOO_LARGE");
  if (manifest.sourceVerification !== "verified_exact_public_text" ||
      !manifest.entries.some(e => e.sourceType === "public_source")) {
    throw new Error("VERIFIED_PUBLIC_SOURCE_REQUIRED");
  }
  // Freeze full text locally on server; metadata-only manifest is not the preserved snapshot.
  const sections = preview.sections.map((section, i) => ({
    ordinal: i,
    sourceType: section.sourceType,
    reference: section.reference,
    text: section.text,
    sha256: manifest.entries[i]?.sha256,
  }));
  if (sections.length !== manifest.entries.length || !sections.every(x => SHA.test(x.sha256 ?? ""))) {
    throw new Error("SECTION_MANIFEST_MISMATCH");
  }
  const frozenJson = JSON.stringify({ contract: ADM5B3_CONTRACT, manifest, sections });
  if (Buffer.byteLength(frozenJson, "utf8") > MAX_SNAPSHOT_BYTES) throw new Error("SNAPSHOT_BYTES_LIMIT");
  return { manifestDigest: manifest.digestSha256, frozenJson,
    frozenDigest: digest(frozenJson), sectionCount: sections.length,
    characters: manifest.totals.characters, blockingReasons: manifest.blockingReasons };
}
export function isSha256(x: unknown): x is string {
  return typeof x === "string" && SHA.test(x.toLowerCase());
}
export function isUuid(x: unknown): x is string {
  return typeof x === "string" && /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(x);
}
