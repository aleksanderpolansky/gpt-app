import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../../lib/auth0';
import { ActorContextError, resolveActiveActorContext } from '../../../../../../lib/actor-context';
import { supabase } from '../../../../../../lib/supabase';
import { inferGraphAncestryPilotV1, type GraphAncestryNodeV1 } from '@/lib/ontology/graphAncestryPilotV1';
import { GRAPH_ANCESTRY_RULE_PILOT_V1 } from '@/lib/ontology/graphRuleRegistryPilotV1';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Isolated local development pilot. No writes, no materialized edges, no shared cache.
 * Never enable as a production replacement for graph-neighbors while SEC-06 is open.
 */
export async function GET(request: Request, context: RouteContext) {
  if (process.env.NODE_ENV === 'production' || process.env.ARCTOR_GRAPH_ANCESTRY_PILOT_ENABLED !== '1')
    return json({ ok: false, error: 'PILOT_DISABLED' }, 404);

  const { id } = await context.params;
  if (!UUID.test(id)) return json({ ok: false, error: 'INVALID_VALUE_OBJECT_ID' }, 400);
  if (new URL(request.url).searchParams.size !== 0)
    return json({ ok: false, error: 'UNEXPECTED_QUERY_PARAMETER' }, 400);

  const session = await auth0.getSession();
  if (!session?.user?.sub) return json({ ok: false, error: 'NOT_AUTHENTICATED' }, 401);
  let userId: string;
  let actorId: string;
  try {
    const actor = await resolveActiveActorContext(session.user.sub);
    userId = actor.appUserId;
    actorId = actor.actorId;
  } catch (e) {
    if (e instanceof ActorContextError) return json({ ok: false, error: e.code }, e.status);
    return json({ ok: false, error: 'ACTOR_CONTEXT_FAILED' }, 500);
  }

  const fields = 'id,title,parent_value_object_id';
  // Identical system/actor anchor selection strategy to existing M-0195 route.
  const systemCheck = await supabase.from('value_objects').select(fields)
    .eq('id', id).eq('scope_code', 'global').eq('origin_type_code', 'system_model')
    .eq('status', 'active').maybeSingle();
  if (systemCheck.error) return json({ ok: false, error: 'ANCHOR_LOOKUP_FAILED' }, 500);
  const systemScope = Boolean(systemCheck.data);
  const actorCheck = systemScope ? null : await supabase.from('value_objects').select(fields)
    .eq('id', id).eq('scope_code', 'actor').eq('owner_user_id', userId).eq('owner_actor_id', actorId)
    .eq('status', 'active').maybeSingle();
  if (actorCheck?.error) return json({ ok: false, error: 'ANCHOR_LOOKUP_FAILED' }, 500);
  const anchor = (systemCheck.data ?? actorCheck?.data) as GraphAncestryNodeV1 | null | undefined;
  if (!anchor) return json({ ok: false, error: 'NOT_FOUND_OR_ACCESS_DENIED' }, 404);

  const nodes: GraphAncestryNodeV1[] = [anchor];
  let current = anchor;
  // At most two index-backed lookups, always constrained to the caller's scope.
  for (let hop = 0; hop < GRAPH_ANCESTRY_RULE_PILOT_V1.maxDepth; hop++) {
    if (!current.parent_value_object_id) break;
    if (nodes.some((node) => node.id === current.parent_value_object_id))
      return json({ ok: false, error: 'INVALID_HIERARCHY_CYCLE' }, 409);
    let q = supabase.from('value_objects').select(fields)
      .eq('id', current.parent_value_object_id).eq('status', 'active');
    if (systemScope) q = q.eq('scope_code', 'global').eq('origin_type_code', 'system_model');
    else q = q.eq('scope_code', 'actor').eq('owner_user_id', userId).eq('owner_actor_id', actorId);
    const result = await q.maybeSingle();
    if (result.error) return json({ ok: false, error: 'HIERARCHY_READ_FAILED' }, 500);
    if (!result.data) break; // No scope bypass, no parent ID disclosure.
    current = result.data as GraphAncestryNodeV1;
    nodes.push(current);
  }

  try {
    const inferred = inferGraphAncestryPilotV1({ anchorId: id, authorizedNodes: nodes });
    return json({
      ok: true, pilot: true, scope: systemScope ? 'system' : 'actor',
      valueObjectId: id, ruleAuthority: GRAPH_ANCESTRY_RULE_PILOT_V1.approvalMode,
      ruleStatus: GRAPH_ANCESTRY_RULE_PILOT_V1.status,
      lineageBasis: 'VISIBLE_ACTIVE_DB_PARENT_EDGES',
      ...inferred, cacheEligible: false,
      runtimeSecurityVerified: false,
    });
  } catch {
    return json({ ok: false, error: 'INVALID_HIERARCHY_DATA' }, 409);
  }
}
