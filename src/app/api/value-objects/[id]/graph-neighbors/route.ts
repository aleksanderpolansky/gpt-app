import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../../lib/auth0';
import { ActorContextError, resolveActiveActorContext } from '../../../../../../lib/actor-context';
import { supabase } from '../../../../../../lib/supabase';
import {
  buildGraphNeighborViewV1,
  parseGraphNeighborQueryV1,
  selectGraphNeighborTypeCodesV1,
  type GraphRelationRowV1,
  type GraphRelationTypeV1,
  type GraphNeighborNodeV1,
} from '@/lib/ontology/graphQueryV1';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cacheHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };
const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cacheHeaders });
type RouteContext = { params: Promise<{id: string}> };

type ActorId = { appUserId: string; actorId: string };

/** Disabled by default while SEC-06 remains OPEN_BLOCKER. No automatic activation. */
export async function GET(request: Request, context: RouteContext) {
  if (process.env.ARCTOR_GRAPH_NEIGHBOR_V1_ENABLED !== '1')
    return respond({ ok: false, error: 'GRAPH_NEIGHBOR_API_DISABLED' }, 404);
  const { id: rawId } = await context.params;
  if (!UUID.test(rawId)) return respond({ ok: false, error: 'INVALID_VALUE_OBJECT_ID' }, 400);
  let query;
  try {
    query = parseGraphNeighborQueryV1(new URL(request.url).searchParams);
  } catch {
    return respond({ ok: false, error: 'INVALID_GRAPH_QUERY' }, 400);
  }
  const session = await auth0.getSession();
  if (!session?.user?.sub) return respond({ ok: false, error: 'NOT_AUTHENTICATED' }, 401);
  let actor: ActorId;
  try {
    const resolved = await resolveActiveActorContext(session.user.sub);
    actor = { appUserId: resolved.appUserId, actorId: resolved.actorId };
  } catch (error) {
    if (error instanceof ActorContextError) return respond({ ok: false, error: error.code }, error.status);
    return respond({ ok: false, error: 'ACTOR_CONTEXT_FAILED' }, 500);
  }

  // Resolve anchor scope server-side. A request cannot choose another actor.
  const globalAnchor = await supabase.from('value_objects').select('id')
    .eq('id', rawId).eq('scope_code', 'global').eq('origin_type_code', 'system_model')
    .eq('status', 'active').maybeSingle();
  if (globalAnchor.error) return respond({ ok: false, error: 'ANCHOR_LOOKUP_FAILED' }, 500);
  const isSystem = Boolean(globalAnchor.data);
  if (!isSystem) {
    const ownedAnchor = await supabase.from('value_objects').select('id')
      .eq('id', rawId).eq('scope_code', 'actor').eq('owner_user_id', actor.appUserId)
      .eq('owner_actor_id', actor.actorId).eq('status', 'active').maybeSingle();
    if (ownedAnchor.error) return respond({ ok: false, error: 'ANCHOR_LOOKUP_FAILED' }, 500);
    if (!ownedAnchor.data) return respond({ ok: false, error: 'NOT_FOUND_OR_ACCESS_DENIED' }, 404);
  }
  const registry = await supabase.from('value_object_relation_types')
    .select('relation_type_code,directionality_code,status').eq('status', 'active');
  if (registry.error) return respond({ ok: false, error: 'RELATION_REGISTRY_READ_FAILED' }, 500);
  const types = (registry.data ?? []) as GraphRelationTypeV1[];
  const codes = selectGraphNeighborTypeCodesV1(types, query);
  if (codes.length === 0) return respond({ ok: true, valueObjectId: rawId, scope: isSystem ? 'system' : 'actor', ...buildGraphNeighborViewV1({anchorValueObjectId: rawId, query, types, rows: [], visibleNeighbors: []}) });

  const table = isSystem ? 'system_value_object_relations' : 'value_object_relations';
  const fields = 'id,source_value_object_id,target_value_object_id,relation_type_code,status,updated_at';
  const wantsOutgoing = query.direction !== 'incoming';
  const wantsIncoming = query.direction !== 'outgoing';
  const fetchSide = (key: 'source_value_object_id' | 'target_value_object_id') => {
    let b = supabase.from(table).select(fields)
      .eq(key, rawId).eq('status', 'active').in('relation_type_code', codes);
    if (!isSystem) b = b.eq('owner_user_id', actor.appUserId).eq('owner_actor_id', actor.actorId);
    return b.order('updated_at', { ascending: false }).limit(query.limit + 1);
  };
  const sides = await Promise.all([
    wantsOutgoing ? fetchSide('source_value_object_id') : Promise.resolve(null),
    wantsIncoming ? fetchSide('target_value_object_id') : Promise.resolve(null),
  ]);
  if (sides.some((part) => part?.error)) return respond({ok: false, error: 'GRAPH_RELATIONS_READ_FAILED'}, 500);
  const rows = sides.flatMap((part) => (part?.data ?? []) as GraphRelationRowV1[]);
  const ids = [...new Set(rows.map((row) => row.source_value_object_id === rawId
    ? row.target_value_object_id : row.source_value_object_id))];
  let nodes: GraphNeighborNodeV1[] = [];
  if (ids.length > 0) {
    let b = supabase.from('value_objects').select('id,title').in('id', ids).eq('status','active');
    if (isSystem) b = b.eq('scope_code', 'global').eq('origin_type_code', 'system_model');
    else b = b.eq('scope_code', 'actor').eq('owner_user_id', actor.appUserId).eq('owner_actor_id', actor.actorId);
    const result = await b;
    if (result.error) return respond({ok: false, error: 'GRAPH_NEIGHBOR_VISIBILITY_FAILED'}, 500);
    nodes = (result.data ?? []) as GraphNeighborNodeV1[];
  }
  const view = buildGraphNeighborViewV1({anchorValueObjectId: rawId, query, types, rows, visibleNeighbors: nodes});
  // A query side that reached the capped fetch size may contain further authorized rows.
  const moreMayExist = sides.some((part) => (part?.data?.length ?? 0) > query.limit);
  return respond({ ok: true, valueObjectId: rawId, scope: isSystem ? 'system' : 'actor',
    ...view, truncated: view.truncated || moreMayExist });
}
