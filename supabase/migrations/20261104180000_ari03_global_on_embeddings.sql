-- ARI-03 M-0146: global/system/active ON only; no owner-private vectors.
-- Apply once through the trusted Supabase SQL editor or a direct owner DB connection.
-- Never expose service-role credentials or embedding vectors to the browser.
create extension if not exists vector with schema extensions;

create table if not exists public.ari03_on_embeddings_v1 (
  on_id uuid not null references public.value_objects(id) on delete cascade,
  locale text not null check(locale='und'),
  model_id text not null check(model_id='text-embedding-3-small'),
  source_sha256 text not null check(source_sha256 ~ '^[A-F0-9]{64}$'),
  embedding extensions.vector(1536) not null,
  updated_at timestamptz not null default now(),
  primary key(on_id,locale,model_id)
);
alter table public.ari03_on_embeddings_v1 enable row level security;
revoke all on public.ari03_on_embeddings_v1 from public,anon,authenticated;
grant select,insert,update,delete on public.ari03_on_embeddings_v1 to service_role;

create index if not exists ari03_on_embedding_hnsw_v1
  on public.ari03_on_embeddings_v1 using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.ari03_match_global_system_v1(
 p_query_embedding extensions.vector(1536), p_limit integer default 200
) returns table (on_id uuid,source_sha256 text,similarity double precision)
language sql stable security invoker set search_path='' as $$
 select e.on_id,e.source_sha256,
  (1 - (e.embedding OPERATOR(extensions.<=>) p_query_embedding))::double precision as similarity
 from public.ari03_on_embeddings_v1 e
 join public.value_objects v on v.id=e.on_id
 where e.locale='und' and e.model_id='text-embedding-3-small'
   and v.scope_code='global' and v.origin_type_code='system_model' and v.status='active'
 order by e.embedding OPERATOR(extensions.<=>) p_query_embedding,e.on_id
 limit least(greatest(coalesce(p_limit,200),1),200)
$$;
revoke all on function public.ari03_match_global_system_v1(extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.ari03_match_global_system_v1(extensions.vector,integer) to service_role;
