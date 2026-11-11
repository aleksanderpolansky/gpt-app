/**
 * ARCTor ARI-03.04.01–04 / M-0111–M-0114 — explicit, source-backed locale alias candidates.
 *
 * This is a pure offline component. It never queries Supabase, chooses an ON UUID,
 * creates an ON, changes an API, or establishes object identity from translation.
 * Callers MUST prefilter by authorization before passing entries here.
 * These aliases are curator-verified bindings, not merely words seen in a dictionary.
 * M-0112 introduces conservative locale-aware equality; it does not stem, translate, or infer identity.
 * M-0113 separates reviewed semantic broader/narrower edges from synonym identity.
 */
export const ARCTOR_ALIAS_LOCALES_V1 = ["en", "pl", "es", "de", "cs", "uk", "ru"] as const;
export type ArctorAliasLocaleV1 = (typeof ARCTOR_ALIAS_LOCALES_V1)[number];
export type ArctorAliasReviewV1 = "verified" | "candidate" | "rejected";
export type ArctorAliasSourceV1 = {
  type: "curator_record" | "catalog_localization" | "documented_dictionary";
  reference: string;
  version: string;
  evidenceSha256: string;
};
export type ArctorAliasEntryV1 = {
  /** Real or synthetic-in-tests UUID, already selected by an authorized caller. */
  objectId: string;
  locale: ArctorAliasLocaleV1;
  alias: string;
  review: ArctorAliasReviewV1;
  reviewedBy: string | null;
  source: ArctorAliasSourceV1;
};
export type ArctorAliasCandidateV1 = {
  objectId: string;
  locale: ArctorAliasLocaleV1;
  alias: string;
  provenance: ArctorAliasSourceV1[];
};
export type ArctorAliasLookupV1 = {
  status: "no_verified_match" | "candidates" | "ambiguous";
  candidates: ArctorAliasCandidateV1[];
  /** Deliberately never selects a UUID or proves absence in the database. */
  autoSelectedId: null;
  absenceProven: false;
  scopedInputOnly: true;
};
export type ArctorAliasIndexV1 = {
  version: "ARCTOR_LOCALE_ALIAS_INDEX_V1";
  coveredLocales: ArctorAliasLocaleV1[];
  verifiedBindings: number;
  skippedUnreviewed: number;
  lookup: (locale: ArctorAliasLocaleV1, phrase: string) => ArctorAliasLookupV1;
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const MAX_ALIASES = 50000;
const isLocale = (value: string): value is ArctorAliasLocaleV1 =>
  (ARCTOR_ALIAS_LOCALES_V1 as readonly string[]).includes(value);

/**
 * M-0112: deterministic locale-aware key for ALREADY VERIFIED alias bindings.
 * NFKC, language-specific lowercase, NFC, and whitespace canonicalization.
 * All accents and language-specific letters stay meaningful: PL ą/ł/ż, CS č/ě/ů,
 * ES ñ/á, DE ä/ß, UK ї/ґ, RU ё/й. In particular ё !== е and ß !== ss.
 * Ukrainian typographical apostrophes (U+2019 and U+02BC) equal ASCII apostrophe.
 * NO stemming, transliteration, phonetic matching or cross-language UUID inference.
 * The default locale is retained only for M-0111 API compatibility.
 */
const LOCALE_CASE_TAG_V1: Readonly<Record<ArctorAliasLocaleV1, string>> = {
  en: "en", pl: "pl", es: "es", de: "de", cs: "cs", uk: "uk", ru: "ru",
};
export function normalizeAliasKeyV1(text: string, locale: ArctorAliasLocaleV1 = "en"): string {
  if (typeof text !== "string") throw new Error("ALIAS_INVALID_TEXT");
  if (!isLocale(locale)) throw new Error("ALIAS_INVALID_LOCALE");
  let normalized = text.normalize("NFKC")
    .toLocaleLowerCase(LOCALE_CASE_TAG_V1[locale]).normalize("NFC");
  if (locale === "uk") normalized = normalized.replace(/[\u2019\u02BC]/gu, "'");
  return normalized.replace(/\s+/gu, " ").trim();
}

function requireValidEntry(entry: ArctorAliasEntryV1): void {
  if (!UUID_RE.test(entry.objectId)) throw new Error("ALIAS_INVALID_UUID");
  if (!isLocale(entry.locale)) throw new Error("ALIAS_INVALID_LOCALE");
  if (!["verified", "candidate", "rejected"].includes(entry.review)) throw new Error("ALIAS_INVALID_REVIEW");
  if (entry.alias.length > 180 || !normalizeAliasKeyV1(entry.alias, entry.locale)) throw new Error("ALIAS_INVALID_TEXT");
  if (!["curator_record", "catalog_localization", "documented_dictionary"].includes(entry.source?.type))
    throw new Error("ALIAS_INVALID_SOURCE_TYPE");
  if (!entry.source.reference.trim() || !entry.source.version.trim() || !SHA256_RE.test(entry.source.evidenceSha256))
    throw new Error("ALIAS_SOURCE_EVIDENCE_REQUIRED");
  if (entry.review === "verified" && (!entry.reviewedBy || !entry.reviewedBy.trim()))
    throw new Error("ALIAS_VERIFICATION_REQUIRED");
}

/**
 * Pure index over ALREADY AUTHORIZED input rows. A colliding translation retains
 * all separate UUIDs, is marked ambiguous, and cannot authorize automatic merging.
 */
export function buildLocaleAliasIndexV1(entries: readonly ArctorAliasEntryV1[]): ArctorAliasIndexV1 {
  if (!Array.isArray(entries) || entries.length > MAX_ALIASES) throw new Error("ALIAS_INPUT_LIMIT");
  const grouped = new Map<string, Map<string, ArctorAliasCandidateV1>>();
  let verifiedBindings = 0;
  let skippedUnreviewed = 0;
  for (const entry of entries) {
    requireValidEntry(entry);
    if (entry.review !== "verified") { skippedUnreviewed++; continue; }
    verifiedBindings++;
    const key = `${entry.locale}\u0000${normalizeAliasKeyV1(entry.alias, entry.locale)}`;
    let group = grouped.get(key);
    if (!group) { group = new Map(); grouped.set(key, group); }
    const id = entry.objectId.toLowerCase();
    const existing = group.get(id);
    if (existing) {
      if (!existing.provenance.some(p => p.type === entry.source.type && p.reference === entry.source.reference && p.version === entry.source.version && p.evidenceSha256 === entry.source.evidenceSha256))
        existing.provenance.push({ ...entry.source });
    } else {
      group.set(id, { objectId: id, locale: entry.locale, alias: entry.alias, provenance: [{...entry.source}] });
    }
  }
  const snapshot = new Map<string, ArctorAliasCandidateV1[]>();
  for (const [key, rows] of grouped)
    snapshot.set(key, [...rows.values()].sort((a,b) => a.objectId.localeCompare(b.objectId)));
  return {
    version: "ARCTOR_LOCALE_ALIAS_INDEX_V1",
    coveredLocales: [...ARCTOR_ALIAS_LOCALES_V1], verifiedBindings, skippedUnreviewed,
    lookup(locale, phrase) {
      if (!isLocale(locale)) throw new Error("ALIAS_INVALID_LOCALE");
      if (typeof phrase !== "string" || phrase.length > 180) throw new Error("ALIAS_INVALID_QUERY");
      const key = `${locale}\u0000${normalizeAliasKeyV1(phrase, locale)}`;
      const candidates = (snapshot.get(key) ?? []).map(row => ({ ...row, provenance: row.provenance.map(p => ({...p})) }));
      return {
        status: candidates.length === 0 ? "no_verified_match" : candidates.length === 1 ? "candidates" : "ambiguous",
        candidates, autoSelectedId: null, absenceProven: false, scopedInputOnly: true,
      };
    },
  };
}

/**
 * M-0113 — BROADER / NARROWER describe relations between TWO DISTINCT ON UUIDs.
 * They never authorize a synonym, translation, alias binding or UUID merge.
 * These are reviewed semantic edges, not structural parent assignments.
 * Neither an edge nor its absence can prove an ontology object's existence/absence.
 */
export type ArctorBroaderNarrowerReviewV1 = ArctorAliasReviewV1;
export type ArctorBroaderNarrowerEntryV1 = {
  /** Explicitly ordered semantic endpoints; no inference of structural hierarchy. */
  broaderObjectId: string;
  narrowerObjectId: string;
  review: ArctorBroaderNarrowerReviewV1;
  reviewedBy: string | null;
  source: ArctorAliasSourceV1;
};
export type ArctorBroaderNarrowerEvidenceV1 = {
  broaderObjectId: string;
  narrowerObjectId: string;
  relationType: "broader_narrower";
  provenance: ArctorAliasSourceV1[];
};
export type ArctorRelationEvidenceLookupV1 = {
  status: "no_verified_relation" | "relations";
  relations: ArctorBroaderNarrowerEvidenceV1[];
  autoSelectedId: null;
  absenceProven: false;
  scopedInputOnly: true;
  /** A semantic broader/narrower relationship must not create an alias. */
  aliasEquivalenceEstablished: false;
};
export type ArctorBroaderNarrowerIndexV1 = {
  version: "ARCTOR_BROADER_NARROWER_REVIEW_INDEX_V1";
  verifiedEdges: number;
  skippedUnreviewed: number;
  /** All EXPLICIT reviewed edges with objectId as narrower end. */
  broaderOf: (objectId: string) => ArctorRelationEvidenceLookupV1;
  /** All EXPLICIT reviewed edges with objectId as broader end. */
  narrowerOf: (objectId: string) => ArctorRelationEvidenceLookupV1;
  /** Direct edge check, without transitive closure or reflexive inference. */
  between: (broaderObjectId: string, narrowerObjectId: string) => ArctorRelationEvidenceLookupV1;
};
const MAX_REVIEWED_RELATIONS_V1 = 50000;
function requireRelationUuidV1(id: string): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("RELATION_INVALID_UUID");
  return id.toLowerCase();
}
function requireRelationEntryV1(entry: ArctorBroaderNarrowerEntryV1): [string, string] {
  if (!entry || typeof entry !== "object") throw new Error("RELATION_INVALID_ENTRY");
  const broad = requireRelationUuidV1(entry.broaderObjectId);
  const narrow = requireRelationUuidV1(entry.narrowerObjectId);
  if (broad === narrow) throw new Error("RELATION_REFLEXIVE_DISALLOWED");
  if (!["verified", "candidate", "rejected"].includes(entry.review)) throw new Error("RELATION_INVALID_REVIEW");
  if (!entry.source || !["curator_record", "catalog_localization", "documented_dictionary"].includes(entry.source.type))
    throw new Error("RELATION_INVALID_SOURCE_TYPE");
  if (typeof entry.source.reference !== "string" || !entry.source.reference.trim() ||
      typeof entry.source.version !== "string" || !entry.source.version.trim() ||
      !SHA256_RE.test(entry.source.evidenceSha256)) throw new Error("RELATION_SOURCE_EVIDENCE_REQUIRED");
  if (entry.review === "verified" && (typeof entry.reviewedBy !== "string" || !entry.reviewedBy.trim()))
    throw new Error("RELATION_VERIFICATION_REQUIRED");
  return [broad, narrow];
}
function relationResultV1(rows: readonly ArctorBroaderNarrowerEvidenceV1[]): ArctorRelationEvidenceLookupV1 {
  return {
    status: rows.length ? "relations" : "no_verified_relation",
    relations: rows.map(row => ({ ...row, provenance: row.provenance.map(source => ({...source})) })),
    autoSelectedId: null,
    absenceProven: false,
    scopedInputOnly: true,
    aliasEquivalenceEstablished: false,
  };
}
/**
 * Read-only semantic relation registry over ALREADY AUTHORIZED, reviewed input.
 * No DB calls, graph traversal, inverse assertion, root/parent mutation or auto-merge.
 * An authorized caller must filter both endpoints BEFORE constructing this index.
 */
export function buildBroaderNarrowerIndexV1(
  entries: readonly ArctorBroaderNarrowerEntryV1[],
): ArctorBroaderNarrowerIndexV1 {
  if (!Array.isArray(entries) || entries.length > MAX_REVIEWED_RELATIONS_V1)
    throw new Error("RELATION_INPUT_LIMIT");
  const edges = new Map<string, ArctorBroaderNarrowerEvidenceV1>();
  let verifiedEdges = 0;
  let skippedUnreviewed = 0;
  for (const entry of entries) {
    const [broad, narrow] = requireRelationEntryV1(entry);
    if (entry.review !== "verified") { skippedUnreviewed++; continue; }
    verifiedEdges++;
    const key = broad + "\u0000" + narrow;
    const existing = edges.get(key);
    if (existing) {
      if (!existing.provenance.some(p => p.type === entry.source.type && p.reference === entry.source.reference &&
          p.version === entry.source.version && p.evidenceSha256 === entry.source.evidenceSha256))
        existing.provenance.push({...entry.source});
    } else {
      edges.set(key, { broaderObjectId: broad, narrowerObjectId: narrow,
        relationType: "broader_narrower", provenance: [{...entry.source}] });
    }
  }
  const ordered = [...edges.values()].sort((a,b) =>
    a.broaderObjectId.localeCompare(b.broaderObjectId) || a.narrowerObjectId.localeCompare(b.narrowerObjectId));
  return {
    version: "ARCTOR_BROADER_NARROWER_REVIEW_INDEX_V1", verifiedEdges, skippedUnreviewed,
    broaderOf(id) {
      const target = requireRelationUuidV1(id);
      return relationResultV1(ordered.filter(edge => edge.narrowerObjectId === target));
    },
    narrowerOf(id) {
      const target = requireRelationUuidV1(id);
      return relationResultV1(ordered.filter(edge => edge.broaderObjectId === target));
    },
    between(broaderObjectId, narrowerObjectId) {
      const broad = requireRelationUuidV1(broaderObjectId);
      const narrow = requireRelationUuidV1(narrowerObjectId);
      if (broad === narrow) return relationResultV1([]);
      return relationResultV1(ordered.filter(edge => edge.broaderObjectId === broad && edge.narrowerObjectId === narrow));
    },
  };
}

/**
 * M-0114 / ARI-03.04.04 — homonymy & polysemy evidence ONLY.
 * A single spelling may legitimately refer to multiple different observation objects.
 * Sense discriminators help curators review a query; they never establish an ON identity.
 * Input MUST already be restricted to objects and evidence the caller may see.
 * The returned `unresolved` state is intentional, even if contextual hints favor one candidate.
 */
export type ArctorSenseDiscriminatorEntryV1 = ArctorAliasEntryV1 & {
  /** Domain-specific stable sense label, NOT a UUID, not ontology parent hierarchy. */
  senseKey: string;
  /** Explicit evidence-backed, optional language-local hints for human disambiguation. */
  positiveCues: readonly string[];
  negativeCues: readonly string[];
};
export type ArctorSenseCandidateV1 = {
  objectId: string;
  senseKey: string;
  locale: ArctorAliasLocaleV1;
  alias: string;
  provenance: ArctorAliasSourceV1[];
  positiveCuesMatched: string[];
  negativeCuesMatched: string[];
  reviewNeeded: true;
};
export type ArctorSenseLookupV1 = {
  status: "unresolved" | "review_required" | "no_verified_sense";
  reason: "multiple_verified_senses" | "manual_confirmation_required" | "no_verified_binding";
  candidates: ArctorSenseCandidateV1[];
  autoSelectedId: null;
  absenceProven: false;
  scopedInputOnly: true;
  aliasEquivalenceEstablished: false;
  objectCreationAuthorized: false;
};
export type ArctorSenseIndexV1 = {
  version: "ARCTOR_LOCALE_SENSE_INDEX_V1";
  coveredLocales: ArctorAliasLocaleV1[];
  verifiedBindings: number;
  skippedUnreviewed: number;
  lookup: (locale: ArctorAliasLocaleV1, phrase: string, context?: string) => ArctorSenseLookupV1;
};
const MAX_SENSE_BINDINGS_V1 = 50000;
const MAX_SENSE_CUES_V1 = 12;
const SENSE_KEY_RE_V1 = /^[a-z][a-z0-9_.-]{1,79}$/;

type ArctorStoredSenseV1 = Omit<ArctorSenseCandidateV1,
  "positiveCuesMatched" | "negativeCuesMatched" | "reviewNeeded"> & {
    positiveCues: string[];
    negativeCues: string[];
};

function validateSenseCuesV1(cues: readonly string[], locale: ArctorAliasLocaleV1): string[] {
  if (!Array.isArray(cues) || cues.length > MAX_SENSE_CUES_V1)
    throw new Error("SENSE_CUE_LIMIT");
  const result = new Set<string>();
  for (const cue of cues) {
    if (typeof cue !== "string" || cue.length > 90) throw new Error("SENSE_INVALID_CUE");
    const normalized = normalizeAliasKeyV1(cue, locale);
    if (!normalized || /[\u0000-\u001f\u007f]/u.test(normalized)) throw new Error("SENSE_INVALID_CUE");
    result.add(normalized);
  }
  return [...result].sort();
}
function requireSenseEntryV1(entry: ArctorSenseDiscriminatorEntryV1): {
  id: string; key: string; positive: string[]; negative: string[];
} {
  if (!entry || typeof entry !== "object") throw new Error("SENSE_INVALID_ENTRY");
  requireValidEntry(entry);
  if (typeof entry.senseKey !== "string" || !SENSE_KEY_RE_V1.test(entry.senseKey))
    throw new Error("SENSE_INVALID_KEY");
  const positive = validateSenseCuesV1(entry.positiveCues, entry.locale);
  const negative = validateSenseCuesV1(entry.negativeCues, entry.locale);
  if (positive.some(cue => negative.includes(cue))) throw new Error("SENSE_CONTRADICTORY_CUES");
  return { id: entry.objectId.toLowerCase(), key: entry.senseKey, positive, negative };
}
/** Whole-token or contiguous whole-phrase hints; never arbitrary substring evidence. */
function senseCueInContextV1(cue: string, context: string): boolean {
  const words = (value: string): string[] => value.match(/[\p{L}\p{N}]+/gu) ?? [];
  const needle = words(cue), haystack = words(context);
  if (!needle.length || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++)
    if (needle.every((token, j) => haystack[i + j] === token)) return true;
  return false;
}
/**
 * Pure review aid over supplied verified sense bindings. A shared spelling does not imply
 * same UUID or same sense; contextual cues DO NOT select a winner or prove a negative.
 */
export function buildLocaleSenseIndexV1(entries: readonly ArctorSenseDiscriminatorEntryV1[]): ArctorSenseIndexV1 {
  if (!Array.isArray(entries) || entries.length > MAX_SENSE_BINDINGS_V1)
    throw new Error("SENSE_INPUT_LIMIT");
  const grouped = new Map<string, Map<string, ArctorStoredSenseV1>>();
  let verifiedBindings = 0, skippedUnreviewed = 0;
  for (const entry of entries) {
    const parsed = requireSenseEntryV1(entry);
    if (entry.review !== "verified") { skippedUnreviewed++; continue; }
    verifiedBindings++;
    const aliasKey = normalizeAliasKeyV1(entry.alias, entry.locale);
    const lookupKey = `${entry.locale}\u0000${aliasKey}`;
    const senseId = `${parsed.id}\u0000${parsed.key}`;
    let bucket = grouped.get(lookupKey);
    if (!bucket) { bucket = new Map(); grouped.set(lookupKey, bucket); }
    const stored = bucket.get(senseId);
    if (stored) {
      const sameArray = (a: readonly string[], b: readonly string[]) =>
        a.length === b.length && a.every((value, i) => value === b[i]);
      // One sense + UUID may have multiple provenance sources, but not contradictory hints.
      if (!sameArray(stored.positiveCues, parsed.positive) || !sameArray(stored.negativeCues, parsed.negative))
        throw new Error("SENSE_CONFLICTING_DISCRIMINATORS");
      if (!stored.provenance.some(p => p.type === entry.source.type && p.reference === entry.source.reference &&
          p.version === entry.source.version && p.evidenceSha256 === entry.source.evidenceSha256))
        stored.provenance.push({...entry.source});
    } else {
      bucket.set(senseId, {objectId: parsed.id, senseKey: parsed.key, locale: entry.locale,
        alias: entry.alias, provenance: [{...entry.source}],
        positiveCues: parsed.positive, negativeCues: parsed.negative});
    }
  }
  return {
    version: "ARCTOR_LOCALE_SENSE_INDEX_V1", coveredLocales: [...ARCTOR_ALIAS_LOCALES_V1],
    verifiedBindings, skippedUnreviewed,
    lookup(locale, phrase, context = "") {
      if (!isLocale(locale)) throw new Error("SENSE_INVALID_LOCALE");
      if (typeof phrase !== "string" || phrase.length > 180 || typeof context !== "string" || context.length > 600)
        throw new Error("SENSE_INVALID_QUERY");
      const aliasKey = normalizeAliasKeyV1(phrase, locale);
      const normalizedContext = normalizeAliasKeyV1(context, locale);
      const bucket = grouped.get(`${locale}\u0000${aliasKey}`);
      const candidates: ArctorSenseCandidateV1[] = [...(bucket?.values() ?? [])]
        .map(stored => ({objectId: stored.objectId, senseKey: stored.senseKey, locale: stored.locale,
          alias: stored.alias, provenance: stored.provenance.map(p => ({...p})),
          positiveCuesMatched: stored.positiveCues.filter(cue => senseCueInContextV1(cue, normalizedContext)),
          negativeCuesMatched: stored.negativeCues.filter(cue => senseCueInContextV1(cue, normalizedContext)),
          reviewNeeded: true as const}))
        .sort((a, b) => a.objectId.localeCompare(b.objectId) || a.senseKey.localeCompare(b.senseKey));
      return {
        status: !candidates.length ? "no_verified_sense" : candidates.length > 1 ? "unresolved" : "review_required",
        reason: !candidates.length ? "no_verified_binding" : candidates.length > 1 ? "multiple_verified_senses" : "manual_confirmation_required",
        candidates, autoSelectedId: null, absenceProven: false, scopedInputOnly: true,
        aliasEquivalenceEstablished: false, objectCreationAuthorized: false,
      };
    },
  };
}

/**
 * M-0116 / ARI-03.04.06 — deterministic, read-only preview of a versioned
 * dictionary import. This is not a writer, migration, or approval mechanism.
 * A server must enforce authorization BEFORE supplying either snapshot.
 */
export type ArctorAliasDictionaryPackageV1 = {
  contract: "ARCTOR_LOCALE_ALIAS_DICTIONARY_PACKAGE_V1";
  version: string; // strict semver, monotonically increasing against current
  locales: ArctorAliasLocaleV1[];
  entries: ArctorAliasEntryV1[];
};
export type ArctorAliasImportChangeV1 = {
  locale: ArctorAliasLocaleV1;
  aliasKey: string;
  objectId: string;
  change: "added" | "updated" | "unchanged" | "omitted_requires_review";
};
export type ArctorAliasImportCollisionV1 = {
  locale: ArctorAliasLocaleV1;
  aliasKey: string;
  objectIds: string[];
};
export type ArctorAliasImportPreviewV1 = {
  contract: "ARCTOR_ALIAS_IMPORT_DRY_RUN_V1";
  currentVersion: string;
  proposedVersion: string;
  status: "review_required";
  changes: ArctorAliasImportChangeV1[];
  collisions: ArctorAliasImportCollisionV1[];
  counts: { added: number; updated: number; unchanged: number; omitted: number; collisions: number };
  coveredLocales: ArctorAliasLocaleV1[];
  autoSelectedId: null;
  autoMerged: false;
  writesPerformed: false;
  approvalGranted: false;
  absenceProven: false;
  scopedInputOnly: true;
};
const DICTIONARY_CONTRACT_V1 = "ARCTOR_LOCALE_ALIAS_DICTIONARY_PACKAGE_V1";
const SEMVER_V1 = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const MAX_DICTIONARY_ENTRIES_V1 = 50000;
const DICT_ENTRY_KEYS = ["alias", "locale", "objectId", "review", "reviewedBy", "source"];
const DICT_SOURCE_KEYS = ["evidenceSha256", "reference", "type", "version"];
function requireExactKeysV1(value: unknown, keys: readonly string[], reason: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) throw new Error(reason);
  return value as Record<string, unknown>;
}
function parseVersionV1(value: unknown): number[] {
  if (typeof value !== "string" || !SEMVER_V1.test(value)) throw new Error("DICTIONARY_INVALID_VERSION");
  const nums = value.split(".").map(Number);
  if (nums.some(n => !Number.isSafeInteger(n))) throw new Error("DICTIONARY_INVALID_VERSION");
  return nums;
}
function compareVersionV1(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
function checkSourceV1(value: unknown): ArctorAliasSourceV1 {
  const x = requireExactKeysV1(value, DICT_SOURCE_KEYS, "DICTIONARY_INVALID_SOURCE_SCHEMA");
  if (!["curator_record", "catalog_localization", "documented_dictionary"].includes(String(x.type)) ||
      typeof x.reference !== "string" || !x.reference.trim() || x.reference.length > 500 ||
      typeof x.version !== "string" || !x.version.trim() || x.version.length > 100 ||
      typeof x.evidenceSha256 !== "string" || !SHA256_RE.test(x.evidenceSha256))
    throw new Error("DICTIONARY_INVALID_SOURCE_EVIDENCE");
  return {type:x.type as ArctorAliasSourceV1["type"],reference:x.reference.trim(),
    version:x.version.trim(),evidenceSha256:x.evidenceSha256.toUpperCase()};
}
function checkEntryV1(value: unknown): ArctorAliasEntryV1 {
  const x = requireExactKeysV1(value, DICT_ENTRY_KEYS, "DICTIONARY_INVALID_ENTRY_SCHEMA");
  if (typeof x.objectId !== "string" || !UUID_RE.test(x.objectId)) throw new Error("DICTIONARY_INVALID_UUID");
  if (typeof x.locale !== "string" || !isLocale(x.locale)) throw new Error("DICTIONARY_INVALID_LOCALE");
  if (typeof x.alias !== "string" || x.alias.length > 180 || !normalizeAliasKeyV1(x.alias,x.locale) ||
      /[\u0000-\u001f\u007f]/u.test(x.alias)) throw new Error("DICTIONARY_INVALID_ALIAS");
  if (x.review !== "verified" && x.review !== "candidate" && x.review !== "rejected")
    throw new Error("DICTIONARY_INVALID_REVIEW");
  if (x.reviewedBy !== null && (typeof x.reviewedBy !== "string" || !x.reviewedBy.trim() || x.reviewedBy.length > 200))
    throw new Error("DICTIONARY_INVALID_REVIEWER");
  if (x.review === "verified" && typeof x.reviewedBy !== "string") throw new Error("DICTIONARY_REVIEW_REQUIRED");
  return {objectId:x.objectId.toLowerCase(),locale:x.locale,alias:x.alias,review:x.review,
    reviewedBy:x.reviewedBy === null ? null : (x.reviewedBy as string).trim(),source:checkSourceV1(x.source)};
}
export function validateLocaleAliasDictionaryV1(input: unknown): ArctorAliasDictionaryPackageV1 {
  const raw = requireExactKeysV1(input,["contract","version","locales","entries"],"DICTIONARY_INVALID_PACKAGE_SCHEMA");
  if (raw.contract !== DICTIONARY_CONTRACT_V1) throw new Error("DICTIONARY_INVALID_CONTRACT");
  parseVersionV1(raw.version);
  if (!Array.isArray(raw.locales) || raw.locales.length !== 7 ||
      raw.locales.some(v => typeof v !== "string" || !isLocale(v)) || new Set(raw.locales).size !== 7)
    throw new Error("DICTIONARY_SEVEN_LOCALES_REQUIRED");
  if (!Array.isArray(raw.entries) || raw.entries.length > MAX_DICTIONARY_ENTRIES_V1)
    throw new Error("DICTIONARY_INPUT_LIMIT");
  const entries = raw.entries.map(checkEntryV1);
  const seen = new Set<string>();
  for (const e of entries) {
    const key = `${e.locale}\u0000${normalizeAliasKeyV1(e.alias,e.locale)}\u0000${e.objectId}`;
    if (seen.has(key)) throw new Error("DICTIONARY_DUPLICATE_BINDING");
    seen.add(key);
  }
  return {contract:DICTIONARY_CONTRACT_V1,version:raw.version as string,
    locales:[...ARCTOR_ALIAS_LOCALES_V1],entries};
}
function dictionaryBindingKeyV1(e: ArctorAliasEntryV1): string {
  return `${e.locale}\u0000${normalizeAliasKeyV1(e.alias,e.locale)}\u0000${e.objectId}`;
}
function dictionaryFingerprintV1(e: ArctorAliasEntryV1): string {
  return JSON.stringify([e.review,e.reviewedBy,e.source.type,e.source.reference,
    e.source.version,e.source.evidenceSha256]);
}
/** Validate BOTH snapshots. Do not apply changes or interpret omissions as revocations. */
export function previewLocaleAliasDictionaryImportV1(current: unknown, incoming: unknown): ArctorAliasImportPreviewV1 {
  const before = validateLocaleAliasDictionaryV1(current);
  const after = validateLocaleAliasDictionaryV1(incoming);
  if (compareVersionV1(parseVersionV1(after.version),parseVersionV1(before.version)) <= 0)
    throw new Error("DICTIONARY_VERSION_NOT_NEWER");
  const old = new Map(before.entries.map(e => [dictionaryBindingKeyV1(e),e]));
  const next = new Map(after.entries.map(e => [dictionaryBindingKeyV1(e),e]));
  const changes: ArctorAliasImportChangeV1[]=[];
  for (const [key,e] of next) {
    const previous=old.get(key);
    const change=!previous ? "added" : dictionaryFingerprintV1(previous)===dictionaryFingerprintV1(e) ? "unchanged" : "updated";
    changes.push({locale:e.locale,aliasKey:normalizeAliasKeyV1(e.alias,e.locale),objectId:e.objectId,change});
  }
  for (const [key,e] of old) if (!next.has(key))
    changes.push({locale:e.locale,aliasKey:normalizeAliasKeyV1(e.alias,e.locale),objectId:e.objectId,
      change:"omitted_requires_review"});
  changes.sort((a,b)=>a.locale.localeCompare(b.locale)||a.aliasKey.localeCompare(b.aliasKey)||
    a.objectId.localeCompare(b.objectId));
  const collisionMap=new Map<string,Set<string>>();
  // Preview proposed verified binding collisions without choosing an object ID.
  for (const e of after.entries.filter(x=>x.review==="verified")) {
    const key=`${e.locale}\u0000${normalizeAliasKeyV1(e.alias,e.locale)}`;
    const ids=collisionMap.get(key)??new Set<string>();ids.add(e.objectId);collisionMap.set(key,ids);
  }
  const collisions:ArctorAliasImportCollisionV1[]=[];
  for (const [key,ids] of collisionMap) if (ids.size>1) {
    const [locale,aliasKey]=key.split("\u0000");
    collisions.push({locale:locale as ArctorAliasLocaleV1,aliasKey,objectIds:[...ids].sort()});
  }
  collisions.sort((a,b)=>a.locale.localeCompare(b.locale)||a.aliasKey.localeCompare(b.aliasKey));
  return {contract:"ARCTOR_ALIAS_IMPORT_DRY_RUN_V1",currentVersion:before.version,
    proposedVersion:after.version,status:"review_required",changes,collisions,
    counts:{added:changes.filter(c=>c.change==="added").length,
      updated:changes.filter(c=>c.change==="updated").length,
      unchanged:changes.filter(c=>c.change==="unchanged").length,
      omitted:changes.filter(c=>c.change==="omitted_requires_review").length,
      collisions:collisions.length},coveredLocales:[...ARCTOR_ALIAS_LOCALES_V1],
    autoSelectedId:null,autoMerged:false,writesPerformed:false,approvalGranted:false,
    absenceProven:false,scopedInputOnly:true};
}

/**
 * M-0117 / ARI-03.04.07 — pure, incremental alias index revision preview.
 * A dictionary omission or downgrade is NOT a revocation. Only an explicit
 * binding-specific reviewed revocation record can remove a verified alias from
 * this in-memory preview. A calling server MUST authenticate/authorize and
 * audit the review decision before passing it here; the string fields in this
 * record do not establish that a real curator approved anything.
 *
 * Immutable source snapshots and revocation decisions remain available for
 * replay/audit. This module does NOT write to Supabase or activate any index.
 */
export type ArctorAliasRevocationDecisionV1 = {
  contract: "ARCTOR_ALIAS_REVOCATION_DECISION_V1";
  fromVersion: string;
  toVersion: string;
  locale: ArctorAliasLocaleV1;
  alias: string;
  objectId: string;
  decision: "approved";
  reviewedBy: string;
  reason: string;
  source: ArctorAliasSourceV1;
};
export type ArctorAliasRevisionDeltaV1 = {
  locale: ArctorAliasLocaleV1;
  aliasKey: string;
  objectId: string;
  change: "added" | "revoked" | "retained";
};
export type ArctorAliasRevisionHistoryV1 = {
  locale: ArctorAliasLocaleV1;
  aliasKey: string;
  objectId: string;
  fromVersion: string;
  toVersion: string;
  reviewedBy: string;
  reason: string;
  source: ArctorAliasSourceV1;
};
export type ArctorAliasIncrementalRevisionV1 = {
  contract: "ARCTOR_ALIAS_INCREMENTAL_REVISION_PREVIEW_V1";
  fromVersion: string;
  toVersion: string;
  /** Only authorized/scoped inputs should be passed to this function. */
  effectiveIndex: ArctorAliasIndexV1;
  delta: ArctorAliasRevisionDeltaV1[];
  history: ArctorAliasRevisionHistoryV1[];
  missingReview: ArctorAliasRevisionDeltaV1[];
  collisions: ArctorAliasImportCollisionV1[];
  counts: { added: number; revoked: number; retained: number; pendingReview: number; collisions: number };
  autoSelectedId: null;
  autoMerged: false;
  writesPerformed: false;
  authorityVerifiedByModule: false;
  absenceProven: false;
  scopedInputOnly: true;
};
const REVOCATION_CONTRACT_V1 = "ARCTOR_ALIAS_REVOCATION_DECISION_V1";
const REVOCATION_KEYS_V1 = ["contract", "fromVersion", "toVersion", "locale", "alias", "objectId", "decision", "reviewedBy", "reason", "source"];
function parseAliasRevocationV1(raw: unknown, before: ArctorAliasDictionaryPackageV1,
  after: ArctorAliasDictionaryPackageV1): ArctorAliasRevocationDecisionV1 {
  const d = requireExactKeysV1(raw, REVOCATION_KEYS_V1, "REVOCATION_INVALID_SCHEMA");
  if (d.contract !== REVOCATION_CONTRACT_V1 || d.decision !== "approved")
    throw new Error("REVOCATION_NOT_APPROVED");
  if (d.fromVersion !== before.version || d.toVersion !== after.version)
    throw new Error("REVOCATION_STALE_VERSION");
  if (typeof d.locale !== "string" || !isLocale(d.locale) ||
      typeof d.alias !== "string" || !d.alias.trim() || d.alias.length > 180 ||
      /[\u0000-\u001f\u007f]/u.test(d.alias) ||
      typeof d.objectId !== "string" || !UUID_RE.test(d.objectId))
    throw new Error("REVOCATION_INVALID_BINDING");
  if (typeof d.reviewedBy !== "string" || !d.reviewedBy.trim() || d.reviewedBy.length > 200 ||
      typeof d.reason !== "string" || !d.reason.trim() || d.reason.length > 1000)
    throw new Error("REVOCATION_REASON_AND_REVIEWER_REQUIRED");
  const source = checkSourceV1(d.source);
  if (source.type !== "curator_record") throw new Error("REVOCATION_CURATOR_EVIDENCE_REQUIRED");
  return {contract:REVOCATION_CONTRACT_V1,fromVersion:before.version,toVersion:after.version,
    locale:d.locale,alias:d.alias,objectId:d.objectId.toLowerCase(),decision:"approved",
    reviewedBy:d.reviewedBy.trim(),reason:d.reason.trim(),source};
}
function sortRevisionRowsV1<T extends {locale: ArctorAliasLocaleV1; aliasKey: string; objectId: string}>(rows: T[]): T[] {
  return rows.sort((a,b)=>a.locale.localeCompare(b.locale)||a.aliasKey.localeCompare(b.aliasKey)||
    a.objectId.localeCompare(b.objectId));
}
/**
 * Validates two full dictionary snapshots and applies ONLY explicitly reviewed
 * revocations to an IN-MEMORY index. Omitted/downgraded verified bindings
 * lacking a revocation remain active and are flagged for review. The delta is
 * per normalized (locale, alias, UUID) binding, not per word or entire UUID.
 */
export function previewIncrementalAliasRevisionV1(
  current: unknown, incoming: unknown, decisions: readonly unknown[],
): ArctorAliasIncrementalRevisionV1 {
  const before = validateLocaleAliasDictionaryV1(current);
  const after = validateLocaleAliasDictionaryV1(incoming);
  // Reuse the existing schema/version/diff guard. Never infer revocations from omissions.
  previewLocaleAliasDictionaryImportV1(before,after);
  if (!Array.isArray(decisions) || decisions.length > MAX_DICTIONARY_ENTRIES_V1)
    throw new Error("REVOCATION_INPUT_LIMIT");
  const old = new Map(before.entries.map(e=>[dictionaryBindingKeyV1(e),e]));
  const proposed = new Map(after.entries.map(e=>[dictionaryBindingKeyV1(e),e]));
  const records = new Map<string,ArctorAliasRevocationDecisionV1>();
  for (const raw of decisions) {
    const d=parseAliasRevocationV1(raw,before,after);
    const key=`${d.locale}\u0000${normalizeAliasKeyV1(d.alias,d.locale)}\u0000${d.objectId}`;
    if (records.has(key)) throw new Error("REVOCATION_DUPLICATE_DECISION");
    const previous=old.get(key);
    if (!previous || previous.review !== "verified") throw new Error("REVOCATION_UNKNOWN_VERIFIED_BINDING");
    if (proposed.get(key)?.review === "verified") throw new Error("REVOCATION_BINDING_STILL_VERIFIED");
    records.set(key,d);
  }
  const active=new Map<string,ArctorAliasEntryV1>();
  for (const [key,e] of proposed) if(e.review==="verified") active.set(key,e);
  const missingReview:ArctorAliasRevisionDeltaV1[]=[];
  const history:ArctorAliasRevisionHistoryV1[]=[];
  const delta:ArctorAliasRevisionDeltaV1[]=[];
  for (const [key,e] of old) {
    if (e.review !== "verified") continue;
    const aliasKey=normalizeAliasKeyV1(e.alias,e.locale);
    const tuple={locale:e.locale,aliasKey,objectId:e.objectId};
    const decision=records.get(key);
    if (decision) {
      active.delete(key);
      delta.push({...tuple,change:"revoked"});
      history.push({...tuple,fromVersion:before.version,toVersion:after.version,
        reviewedBy:decision.reviewedBy,reason:decision.reason,source:{...decision.source}});
    } else {
      // A missing binding or proposed downgrade is not evidence of an approved revocation.
      if (proposed.get(key)?.review !== "verified") {
        active.set(key,e);
        missingReview.push({...tuple,change:"retained"});
      }
      delta.push({...tuple,change:"retained"});
    }
  }
  for (const [key,e] of active) if(old.get(key)?.review!=="verified")
    delta.push({locale:e.locale,aliasKey:normalizeAliasKeyV1(e.alias,e.locale),objectId:e.objectId,change:"added"});
  const effectiveIndex=buildLocaleAliasIndexV1([...active.values()]);
  const groups=new Map<string,Set<string>>();
  for (const e of active.values()) {
    const key=`${e.locale}\u0000${normalizeAliasKeyV1(e.alias,e.locale)}`;
    const ids=groups.get(key)??new Set<string>();ids.add(e.objectId);groups.set(key,ids);
  }
  const collisions:ArctorAliasImportCollisionV1[]=[];
  for (const [key,ids] of groups) if(ids.size>1) {
    const i=key.indexOf("\u0000");
    collisions.push({locale:key.slice(0,i) as ArctorAliasLocaleV1,aliasKey:key.slice(i+1),objectIds:[...ids].sort()});
  }
  collisions.sort((a,b)=>a.locale.localeCompare(b.locale)||a.aliasKey.localeCompare(b.aliasKey));
  sortRevisionRowsV1(delta);sortRevisionRowsV1(missingReview);sortRevisionRowsV1(history);
  return {contract:"ARCTOR_ALIAS_INCREMENTAL_REVISION_PREVIEW_V1",
    fromVersion:before.version,toVersion:after.version,effectiveIndex,
    delta,history,missingReview,collisions,
    counts:{added:delta.filter(d=>d.change==="added").length,
      revoked:history.length,retained:delta.filter(d=>d.change==="retained").length,
      pendingReview:missingReview.length,collisions:collisions.length},
    autoSelectedId:null,autoMerged:false,writesPerformed:false,authorityVerifiedByModule:false,
    absenceProven:false,scopedInputOnly:true};
}
