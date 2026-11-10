/**
 * M-0197 / ARI-04.07.04. Public global search is NOT an actor relation API.
 * Pure fail-closed checks; no database or network access.
 * A globally scoped row still must be an unowned system-model object.
 */
export type PublicSystemIndexRowV1 = Readonly<{
  id: string;
  title: string | null;
  scope_code: 'global';
  origin_type_code: 'system_model';
  owner_user_id: null;
  owner_actor_id: null;
  status: 'active';
  parent_value_object_id: string | null;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Require a complete, explicitly global, owner-free identity. */
export function isPublicSystemIndexRowV1(value: unknown): value is PublicSystemIndexRowV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return typeof r.id === 'string' && UUID.test(r.id) &&
    (r.title === null || typeof r.title === 'string') &&
    r.scope_code === 'global' &&
    r.origin_type_code === 'system_model' &&
    r.owner_user_id === null && r.owner_actor_id === null &&
    r.status === 'active' &&
    (r.parent_value_object_id === null ||
      (typeof r.parent_value_object_id === 'string' && UUID.test(r.parent_value_object_id)));
}

/** Global endpoint does not accept actor/scope/relation selectors, even if ignored today. */
export function isPublicSystemSearchQueryV1(params: URLSearchParams): boolean {
  let onlyLocale = true;
  params.forEach((_value, key) => { if (key !== 'locale') onlyLocale = false; });
  return onlyLocale && params.getAll('locale').length <= 1;
}

/** Prevent dangling/private parent identifiers in a public catalog response. */
export function projectPublicParentIdV1(parentId: string | null, visibleIds: ReadonlySet<string>): string | null {
  return parentId && visibleIds.has(parentId) ? parentId : null;
}
