/**
 * ARI-03.05.02 / M-0119 — DESIGN-ONLY deterministic embedding-unit contract.
 * NOT a vector search client, embedding provider, authorization boundary or DB writer.
 * The caller MUST enforce RLS/visibility before constructing these records.
 */
export const VECTOR_UNIT_CONTRACT_V1 = 'ARCTOR_EMBEDDING_UNIT_DRAFT_V1' as const;
export const VECTOR_LOCALES_V1 = ['en', 'pl', 'es', 'de', 'cs', 'uk', 'ru'] as const;
export type VectorLocaleV1 = (typeof VECTOR_LOCALES_V1)[number];
export type EvidenceTextV1 = { text: string; sourceId: string; approved: boolean };
export type AliasEvidenceV1 = {
  onId: string;
  locale: VectorLocaleV1;
  dictionaryVersion: string;
  value: string;
  sourceId: string;
  reviewStatus: 'approved' | 'pending' | 'rejected' | 'revoked';
};
export type EmbeddingUnitVisibilityV1 =
  | { kind: 'global_system' }
  | { kind: 'owner_private'; ownerActorId: string };
export type EmbeddingUnitInputV1 = {
  onId: string;
  locale: VectorLocaleV1;
  ontologyVersion: string;
  dictionaryVersion: string;
  scope: EmbeddingUnitVisibilityV1;
  title: EvidenceTextV1;
  definition: EvidenceTextV1;
  aliases: readonly AliasEvidenceV1[];
};
export type EmbeddingUnitDraftV1 = {
  contract: typeof VECTOR_UNIT_CONTRACT_V1;
  identity: string;
  onId: string;
  locale: VectorLocaleV1;
  ontologyVersion: string;
  dictionaryVersion: string;
  scope: EmbeddingUnitVisibilityV1;
  title: string;
  definition: string;
  approvedAliases: string[];
  sourceIds: string[];
  textForEmbedding: string;
  approvedAliasCount: number;
  requiresOwnerAuthorizationAtCaller: true;
  generatedEmbeddings: false;
};
export type EmbeddingUnitBlockReasonV1 =
  | 'INVALID_INPUT' | 'INVALID_UUID' | 'INVALID_LOCALE'
  | 'INVALID_VERSION' | 'INVALID_SCOPE' | 'INVALID_SOURCE'
  | 'TITLE_NOT_APPROVED' | 'DEFINITION_NOT_APPROVED'
  | 'MISSING_TITLE' | 'MISSING_DEFINITION'
  | 'ALIAS_SCOPE_CONFLICT' | 'ALIAS_VERSION_CONFLICT'
  | 'ALIAS_RECORD_INVALID' | 'TOO_MANY_ALIASES'
  | 'TEXT_TOO_LONG' | 'INVALID_CONTROL_CHARACTER';
export type EmbeddingUnitResultV1 =
  | { ok: true; unit: EmbeddingUnitDraftV1 }
  | { ok: false; reason: EmbeddingUnitBlockReasonV1 };
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const versionRe = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const sourceRe = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,191}$/;
const validLocale = (v: unknown): v is VectorLocaleV1 =>
  typeof v === 'string' && (VECTOR_LOCALES_V1 as readonly string[]).includes(v);
const clean = (v: string) => v.normalize('NFC').replace(/\s+/gu, ' ').trim();
const hasBadControl = (v: string) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
const fail = (reason: EmbeddingUnitBlockReasonV1): EmbeddingUnitResultV1 => ({ ok: false, reason });
/** Pure deterministic draft: *never* calls AI, never queries data, never writes SQL. */
export function prepareEmbeddingUnitV1(input: EmbeddingUnitInputV1): EmbeddingUnitResultV1 {
  if (!input || typeof input !== 'object' || !Array.isArray(input.aliases)) return fail('INVALID_INPUT');
  if (typeof input.onId !== 'string' || !uuidRe.test(input.onId)) return fail('INVALID_UUID');
  if (!validLocale(input.locale)) return fail('INVALID_LOCALE');
  if (typeof input.ontologyVersion !== 'string' || !versionRe.test(input.ontologyVersion) ||
      typeof input.dictionaryVersion !== 'string' || !versionRe.test(input.dictionaryVersion)) return fail('INVALID_VERSION');
  if (!input.scope || (input.scope.kind !== 'global_system' && input.scope.kind !== 'owner_private') ||
      (input.scope.kind === 'owner_private' && (typeof input.scope.ownerActorId !== 'string' || !uuidRe.test(input.scope.ownerActorId))))
    return fail('INVALID_SCOPE');
  if (!input.title || typeof input.title.text !== 'string') return fail('MISSING_TITLE');
  if (!input.definition || typeof input.definition.text !== 'string') return fail('MISSING_DEFINITION');
  if (!input.title.approved) return fail('TITLE_NOT_APPROVED');
  if (!input.definition.approved) return fail('DEFINITION_NOT_APPROVED');
  if (typeof input.title.sourceId !== 'string' || !sourceRe.test(input.title.sourceId) ||
      typeof input.definition.sourceId !== 'string' || !sourceRe.test(input.definition.sourceId)) return fail('INVALID_SOURCE');
  if (hasBadControl(input.title.text) || hasBadControl(input.definition.text)) return fail('INVALID_CONTROL_CHARACTER');
  const title = clean(input.title.text), definition = clean(input.definition.text);
  if (!title) return fail('MISSING_TITLE');
  if (!definition) return fail('MISSING_DEFINITION');
  if (input.aliases.length > 250) return fail('TOO_MANY_ALIASES');
  const values: string[] = [], sources = new Set<string>([input.title.sourceId, input.definition.sourceId]);
  for (const alias of input.aliases) {
    if (!alias || typeof alias !== 'object' || typeof alias.value !== 'string' ||
        typeof alias.onId !== 'string' || !uuidRe.test(alias.onId) ||
        !validLocale(alias.locale) || typeof alias.dictionaryVersion !== 'string' ||
        !versionRe.test(alias.dictionaryVersion) || typeof alias.sourceId !== 'string' ||
        !sourceRe.test(alias.sourceId) ||
        !['approved','pending','rejected','revoked'].includes(alias.reviewStatus)) return fail('ALIAS_RECORD_INVALID');
    if (alias.onId.toLowerCase() !== input.onId.toLowerCase()) return fail('ALIAS_SCOPE_CONFLICT');
    if (alias.locale !== input.locale) continue; // Explicitly separate one embedding unit per locale.
    if (alias.reviewStatus !== 'approved') continue;
    if (alias.dictionaryVersion !== input.dictionaryVersion) return fail('ALIAS_VERSION_CONFLICT');
    if (hasBadControl(alias.value)) return fail('INVALID_CONTROL_CHARACTER');
    const value = clean(alias.value);
    if (!value) return fail('ALIAS_RECORD_INVALID');
    values.push(value);
    sources.add(alias.sourceId);
  }
  const aliases = [...new Set(values)].sort((a,b)=>a < b ? -1 : a > b ? 1 : 0);
  if (aliases.length > 100) return fail('TOO_MANY_ALIASES');
  const normalizedId = input.onId.toLowerCase();
  const scope = input.scope.kind === 'global_system'
    ? { kind:'global_system' as const }
    : { kind:'owner_private' as const, ownerActorId:input.scope.ownerActorId.toLowerCase() };
  // JSON encoding prevents field/line delimiter injection and gives stable ordering.
  const text = JSON.stringify({ title, definition, approvedAliases: aliases });
  if (text.length > 16000 || title.length > 512 || definition.length > 8000) return fail('TEXT_TOO_LONG');
  const identity = JSON.stringify([normalizedId,input.locale,input.ontologyVersion,input.dictionaryVersion,
    scope.kind,scope.kind === 'owner_private' ? scope.ownerActorId : null]);
  return { ok: true, unit: {
    contract: VECTOR_UNIT_CONTRACT_V1, identity, onId: normalizedId, locale: input.locale,
    ontologyVersion: input.ontologyVersion, dictionaryVersion: input.dictionaryVersion,
    scope, title, definition, approvedAliases:aliases, sourceIds:[...sources].sort(),
    textForEmbedding:text, approvedAliasCount:aliases.length,
    requiresOwnerAuthorizationAtCaller:true, generatedEmbeddings:false,
  }};
}
