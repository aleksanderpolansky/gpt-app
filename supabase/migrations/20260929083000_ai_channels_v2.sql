-- ARCTOR_AI_CHANNELS_V2. Apply AFTER the installed v1 migration, before deploying v2 code.
-- Additive schema change. Existing rows, RLS and ownership semantics are preserved.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.ai_channels_v1') IS NULL THEN RAISE EXCEPTION 'Install AI_CHANNELS_V1 first'; END IF;
END $$;
ALTER TABLE public.ai_channel_runs_v1 ADD COLUMN IF NOT EXISTS provider_response_id text;
CREATE INDEX IF NOT EXISTS ai_channel_runs_pending_v2 ON public.ai_channel_runs_v1(started_at) WHERE status IN ('running','ready');
CREATE OR REPLACE FUNCTION public.ai_channel_command_v1(p_user uuid,p_actor uuid,p_action text,p_id uuid DEFAULT NULL,p_body jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.ai_channels_v1%rowtype; r public.ai_channel_runs_v1%rowtype; admin_ok boolean;
 v_id uuid; v_scope text; item jsonb; obj text; m_id uuid; n integer:=0; item_key text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_user AND access_status IS DISTINCT FROM 'blocked')
 OR NOT public.message_actor_controlled_by_user_v1(p_user,p_actor) THEN RAISE EXCEPTION 'CHANNEL_ACCESS_DENIED'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE app_user_id=p_user AND status='active' AND role IN ('owner','admin')) INTO admin_ok;
 -- Serialize quota checks globally; lock held only for this short DB call, never over provider I/O.
 PERFORM pg_advisory_xact_lock(9282026,1400);
 IF p_id IS NOT NULL THEN
  SELECT * INTO c FROM public.ai_channels_v1 WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR (c.scope='private' AND c.owner_user_id<>p_user) THEN RAISE EXCEPTION 'CHANNEL_NOT_FOUND'; END IF;
  IF p_action='preference' THEN
   INSERT INTO public.ai_channel_preferences_v1 VALUES(p_user,c.id,(p_body->>'enabled')::boolean)
   ON CONFLICT(owner_user_id,channel_id) DO UPDATE SET enabled=excluded.enabled;
   RETURN jsonb_build_object('ok',true);
  END IF;
  IF c.owner_user_id<>p_user AND NOT(c.scope='public' AND admin_ok) THEN RAISE EXCEPTION 'CHANNEL_ACCESS_DENIED'; END IF;
  IF c.scope='public' AND NOT admin_ok THEN RAISE EXCEPTION 'CHANNEL_ADMIN_REQUIRED'; END IF;
 END IF;
 IF p_action='capabilities' THEN RETURN jsonb_build_object('version',2); END IF;
 IF p_action='save' THEN
  IF p_id IS NULL THEN
   IF (SELECT count(*) FROM public.ai_channels_v1 WHERE owner_user_id=p_user AND status<>'archived')>=10 THEN RAISE EXCEPTION 'CHANNEL_LIMIT_10'; END IF;
   v_scope:=CASE WHEN admin_ok AND p_body->>'scope'='public' THEN 'public' ELSE 'private' END;
  ELSE
   IF c.lock_until>now() THEN RAISE EXCEPTION 'CHANNEL_BUSY'; END IF;
   IF c.revision IS DISTINCT FROM (p_body->>'revision')::integer THEN RAISE EXCEPTION 'CHANNEL_REVISION_CONFLICT'; END IF;
   v_scope:=c.scope;
  END IF;
  IF coalesce((p_body->>'maxItems')::integer,5) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'CHANNEL_LIMIT_INVALID'; END IF;
  IF coalesce(p_body->>'searchDepth','quick') NOT IN ('quick','detailed') OR coalesce(p_body->>'freshness','recent') NOT IN ('recent','current') THEN RAISE EXCEPTION 'CHANNEL_SEARCH_MODE_INVALID'; END IF;
  IF jsonb_array_length(p_body->'objectIds') NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'CHANNEL_OBJECTS_REQUIRED'; END IF;
  FOR obj IN SELECT jsonb_array_elements_text(p_body->'objectIds') LOOP
   IF NOT EXISTS(SELECT 1 FROM public.value_objects WHERE id=obj::uuid AND scope_code='global' AND status='active'
    AND visibility_code='public' AND privacy_class_code='public_ontology' AND ui_visibility='visible') THEN RAISE EXCEPTION 'CHANNEL_OBJECT_NOT_PUBLIC_ONTOLOGY'; END IF;
  END LOOP;
  IF p_id IS NULL THEN
   INSERT INTO public.ai_channels_v1(owner_user_id,creator_actor_id,scope,name,spec,interval_hours)
   VALUES(p_user,p_actor,v_scope,p_body->>'name',jsonb_set(p_body,'{scope}',to_jsonb(v_scope)),(p_body->>'intervalHours')::integer) RETURNING id INTO v_id;
  ELSE
   UPDATE public.ai_channels_v1 SET name=p_body->>'name',spec=jsonb_set(p_body,'{scope}',to_jsonb(v_scope)),interval_hours=(p_body->>'intervalHours')::integer,
    revision=revision+1,updated_at=now(),next_run_at=now() WHERE id=c.id RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('id',v_id);
 ELSIF p_action='status' THEN
  IF c.id IS NULL OR c.lock_until>now() THEN RAISE EXCEPTION 'CHANNEL_BUSY_OR_MISSING'; END IF;
  UPDATE public.ai_channels_v1 SET status=p_body->>'status',updated_at=now(),next_run_at=now() WHERE id=c.id;
  IF p_body->>'status'='archived' THEN
   UPDATE public.message_objects SET lifecycle_status='withdrawn' WHERE id IN(SELECT message_object_id FROM public.ai_channel_items_v1 WHERE channel_id=c.id);
  END IF;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='start' THEN
  IF (p_body->>'revision')::integer IS DISTINCT FROM c.revision THEN RAISE EXCEPTION 'CHANNEL_REVISION_CONFLICT'; END IF;
  IF c.id IS NULL OR c.status='archived' OR c.lock_until>now() THEN RAISE EXCEPTION 'CHANNEL_BUSY_OR_MISSING'; END IF;
  IF p_body->>'kind'='scheduled' AND (c.status<>'active' OR c.next_run_at>now()) THEN RAISE EXCEPTION 'CHANNEL_NOT_DUE'; END IF;
  IF EXISTS(SELECT 1 FROM public.ai_channel_runs_v1 WHERE channel_id=c.id AND started_at>now()-interval '60 seconds') THEN RAISE EXCEPTION 'CHANNEL_RATE_LIMIT'; END IF;
  IF (SELECT count(*) FROM public.ai_channel_runs_v1 WHERE requested_by=p_user AND started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=20
   OR (SELECT count(*) FROM public.ai_channel_runs_v1 WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=200 THEN RAISE EXCEPTION 'CHANNEL_DAILY_LIMIT'; END IF;
  UPDATE public.ai_channel_runs_v1 SET status='failed',error_code='RUN_LEASE_EXPIRED',finished_at=now() WHERE channel_id=c.id AND status='running';
  INSERT INTO public.ai_channel_runs_v1(channel_id,requested_by,revision,kind,spec_snapshot)
   VALUES(c.id,p_user,c.revision,p_body->>'kind',c.spec) RETURNING id INTO v_id;
  UPDATE public.ai_channels_v1 SET lock_until=now()+interval '30 minutes',last_run_at=now(),last_error=NULL WHERE id=c.id;
  RETURN jsonb_build_object('runId',v_id);
 ELSIF p_action='attach_provider' THEN
  SELECT * INTO r FROM public.ai_channel_runs_v1 WHERE id=(p_body->>'runId')::uuid AND channel_id=c.id FOR UPDATE;
  IF r.id IS NULL OR r.status<>'running' OR r.revision<>c.revision OR c.lock_until<now()
   OR coalesce(p_body->>'responseId','') !~ '^resp_[A-Za-z0-9_-]+$' THEN RAISE EXCEPTION 'CHANNEL_RUN_CONFLICT'; END IF;
  IF r.provider_response_id IS NOT NULL AND r.provider_response_id<>p_body->>'responseId' THEN RAISE EXCEPTION 'CHANNEL_RUN_CONFLICT'; END IF;
  UPDATE public.ai_channel_runs_v1 SET provider_response_id=p_body->>'responseId',usage=coalesce(p_body->'usage','{}') WHERE id=r.id;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='finish' THEN
  SELECT * INTO r FROM public.ai_channel_runs_v1 WHERE id=(p_body->>'runId')::uuid AND channel_id=c.id FOR UPDATE;
  IF r.id IS NOT NULL AND r.revision=c.revision AND r.status IN ('ready','published','failed') THEN RETURN jsonb_build_object('ok',true,'alreadyFinished',true); END IF;
  IF r.id IS NULL OR r.status<>'running' OR r.revision<>c.revision THEN RAISE EXCEPTION 'CHANNEL_RUN_CONFLICT'; END IF;
  IF p_body->>'error' IS NULL AND (jsonb_typeof(p_body->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_body->'items')>30) THEN RAISE EXCEPTION 'CHANNEL_OUTPUT_INVALID'; END IF;
  UPDATE public.ai_channel_runs_v1 SET status=CASE WHEN p_body->>'error' IS NULL THEN 'ready' ELSE 'failed' END,
   items=coalesce(p_body->'items','[]'),usage=coalesce(p_body->'usage','{}'),error_code=p_body->>'error',finished_at=now() WHERE id=r.id;
  UPDATE public.ai_channels_v1 SET lock_until=NULL,last_error=p_body->>'error',
   next_run_at=CASE WHEN r.kind='scheduled' THEN now()+make_interval(hours=>c.interval_hours) ELSE next_run_at END WHERE id=c.id;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='publish' THEN
  SELECT * INTO r FROM public.ai_channel_runs_v1 WHERE id=(p_body->>'runId')::uuid AND channel_id=c.id FOR UPDATE;
  IF r.status='published' THEN RETURN jsonb_build_object('published',r.published_count); END IF;
  IF r.id IS NULL OR r.status<>'ready' OR r.revision<>c.revision OR c.status='archived' OR r.finished_at<now()-interval '24 hours' THEN RAISE EXCEPTION 'CHANNEL_RUN_CONFLICT'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(r.items) LOOP
   IF item->>'url' !~ '^https?://' OR jsonb_array_length(item->'objectIds')=0 THEN CONTINUE; END IF;
   item_key:=coalesce(nullif(item->>'findingKey',''),item->>'url');
   IF length(item_key)>503 THEN RAISE EXCEPTION 'CHANNEL_OUTPUT_INVALID'; END IF;
   IF EXISTS(SELECT 1 FROM public.ai_channel_items_v1 WHERE channel_id=c.id AND url_key=item_key) THEN CONTINUE; END IF;
   -- Preserve old publications; skip exact legacy findings, but allow other findings on their page.
   IF EXISTS(SELECT 1 FROM public.ai_channel_items_v1 i JOIN public.message_objects m ON m.id=i.message_object_id
    WHERE i.channel_id=c.id AND i.url_key=item->>'url' AND m.content_text=item->>'summary') THEN CONTINUE; END IF;
   -- An offer may expire between preview and publication; compare in the channel's time zone.
   IF nullif(item->>'validUntil','') IS NOT NULL AND (item->>'validUntil')::date <
    (now() AT TIME ZONE coalesce(c.spec->>'timeZone','UTC'))::date THEN CONTINUE; END IF;
   -- Strict allow-list: no new objects and no links to private ontology.
   FOR obj IN SELECT jsonb_array_elements_text(item->'objectIds') LOOP
    IF NOT(c.spec->'objectIds' ? obj) OR NOT EXISTS(SELECT 1 FROM public.value_objects WHERE id=obj::uuid AND scope_code='global'
     AND status='active' AND visibility_code='public' AND privacy_class_code='public_ontology' AND ui_visibility='visible') THEN RAISE EXCEPTION 'CHANNEL_OBJECT_NOT_ALLOWED'; END IF;
   END LOOP;
   INSERT INTO public.message_objects(owner_user_id,created_by_actor_id,author_actor_id,author_display_name_snapshot,
    content_text,language_code,audience_scope_code,lifecycle_status,origin_kind_code,origin_provider_code,
    external_account_id,external_item_id,canonical_url,source_published_at,imported_at,intent_code,metadata_json)
   VALUES(c.owner_user_id,c.creator_actor_id,NULL,item->>'source',item->>'summary',c.spec->>'language',
    CASE WHEN c.scope='public' THEN 'public' ELSE 'self' END,'active','system','arctor_ai_channel',c.id::text,md5(item_key),
    item->>'url',nullif(item->>'publishedAt','')::timestamptz,now(),'information',
    jsonb_build_object('ai_channel_id',c.id,'ai_summary',true,'source_author',item->>'author','source_title',item->>'title','run_id',r.id,'checked_at',r.finished_at,'finding_key',item_key,'valid_from',item->>'validFrom','valid_until',item->>'validUntil')) RETURNING id INTO m_id;
   INSERT INTO public.ai_channel_items_v1(channel_id,message_object_id,url_key,run_id) VALUES(c.id,m_id,item_key,r.id);
   INSERT INTO public.message_object_distributions(message_object_id,channel_code,destination_ref,delivery_status,delivered_at)
    VALUES(m_id,'arctor','ai-channel:'||c.id::text,'succeeded',now());
   FOR obj IN SELECT jsonb_array_elements_text(item->'objectIds') LOOP
    INSERT INTO public.message_object_relations(message_object_id,relation_code,target_value_object_id) VALUES(m_id,'about',obj::uuid);
   END LOOP;
   n:=n+1;
  END LOOP;
  UPDATE public.ai_channel_runs_v1 SET status='published',published_count=n WHERE id=r.id;
  RETURN jsonb_build_object('published',n);
 END IF;
 RAISE EXCEPTION 'CHANNEL_ACTION_INVALID';
END $$;
REVOKE ALL ON FUNCTION public.ai_channel_command_v1(uuid,uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_channel_command_v1(uuid,uuid,text,uuid,jsonb) TO service_role;
COMMIT;
