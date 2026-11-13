/**
 * X04-020. Fail-closed, read-only clock vector for the Graph Neighbors reader.
 * Not a shared cache, not a substitute for transactional writer-side bump.
 * Pure helpers intentionally independent from Supabase for isolated tests.
 */

const DOMAINS = ['catalog', 'relation_review'] as const;

type ClockRow = Readonly<{
  version_key?: unknown;
  domain_code?: unknown;
  revision?: unknown;
  owner_user_id?: unknown;
  owner_actor_id?: unknown;
}>;

function revisionToken(value: unknown): string | null {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return String(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    try { return BigInt(value).toString(10); } catch { return null; }
  }
  return null;
}

/** The endpoint reads ONs and direct relations, not rule evaluation.
 *  Require catalog + relation_review clocks only.
 *  Missing actor rows are the zero baseline; missing system rows fail closed.
 */
export function graphClockVectorX04(
  systemRows: readonly ClockRow[],
  actorRows: readonly ClockRow[],
  actor: Readonly<{ appUserId: string; actorId: string }>,
): string | null {
  const system = new Map<string, string>();
  for (const row of systemRows) {
    const key = row.version_key;
    if (typeof key !== 'string' || !DOMAINS.some(d => key === `system:${d}`) || system.has(key))
      return null;
    const revision = revisionToken(row.revision);
    if (revision === null) return null;
    system.set(key, revision);
  }
  if (system.size !== DOMAINS.length) return null;

  const scoped = new Map<string, string>();
  for (const row of actorRows) {
    if (row.owner_user_id !== actor.appUserId || row.owner_actor_id !== actor.actorId)
      return null;
    const domain = row.domain_code;
    if (typeof domain !== 'string' || !DOMAINS.some(d => d === domain) || scoped.has(domain))
      return null;
    const revision = revisionToken(row.revision);
    if (revision === null) return null;
    scoped.set(domain, revision);
  }

  return JSON.stringify({
    system: DOMAINS.map(d => system.get(`system:${d}`)),
    actor: DOMAINS.map(d => scoped.get(d) ?? '0'),
  });
}

export type VersionFenceOutcome<T> =
  | { state: 'stable'; value: T; attempts: number }
  | { state: 'unavailable' | 'changed'; attempts: number };

/** No result from a mixed-epoch read may be accepted. Retry at most twice. */
export async function runGraphVersionFenceX04<T>(args: {
  readVersion: () => Promise<string | null>;
  readValue: () => Promise<T>;
}): Promise<VersionFenceOutcome<T>> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let before: string | null;
    try { before = await args.readVersion(); } catch { return { state: 'unavailable', attempts: attempt }; }
    if (before === null) return { state: 'unavailable', attempts: attempt };
    const value = await args.readValue();
    let after: string | null;
    try { after = await args.readVersion(); } catch { return { state: 'unavailable', attempts: attempt }; }
    if (after === null) return { state: 'unavailable', attempts: attempt };
    if (before === after) return { state: 'stable', value, attempts: attempt };
  }
  return { state: 'changed', attempts: 2 };
}
