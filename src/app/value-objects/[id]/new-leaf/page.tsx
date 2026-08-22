import { notFound } from "next/navigation";

import { resolveLocalizedContentField } from "@/lib/localization/contentLocalization";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { LeafCreateForm } from "./leaf-create-form";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type LeafCreatePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ locale?: string | string[] }>;
};

type ParentRow = {
  id: string;
  title: string;
  root_value_object_id: string | null;
  status: string;
  canonical_key: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  metadata_json: Record<string, unknown> | null;
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === "pl" ||
    candidate === "ru" ||
    candidate === "uk" ||
    candidate === "de" ||
    candidate === "es" ||
    candidate === "cs"
  ) {
    return candidate;
  }

  return "en";
}

export default async function NewLeafPage({
  params,
  searchParams,
}: LeafCreatePageProps) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    notFound();
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;
  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      notFound();
    }
    throw error;
  }

  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(query?.locale);

  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,root_value_object_id,status,canonical_key,ontology_node_role_code,scope_code,metadata_json",
    )
    .eq("id", id)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .single();

  if (error || !data) {
    notFound();
  }

  const parent = data as ParentRow;
  const role = parent.ontology_node_role_code;
  const rootValueObjectId = parent.root_value_object_id;

  const parentIsEligible =
    parent.scope_code === "actor" &&
    typeof parent.canonical_key === "string" &&
    parent.canonical_key.length > 0 &&
    role === "intermediate" &&
    typeof rootValueObjectId === "string" &&
    rootValueObjectId.length > 0 &&
    (parent.status === "draft" || parent.status === "active");

  if (!parentIsEligible || role !== "intermediate" || !rootValueObjectId) {
    notFound();
  }

  const localizedParentTitle =
    resolveLocalizedContentField({
      metadata: parent.metadata_json,
      locale,
      fieldCode: "title",
      fallback: parent.title,
    }) ?? parent.title;

  return (
    <LeafCreateForm
      locale={locale}
      activeProfileName={actorContext.profile.displayName}
      parent={{
        id: parent.id,
        title: localizedParentTitle,
        rootValueObjectId,
        status: parent.status,
        ontologyNodeRoleCode: "intermediate",
      }}
    />
  );
}
