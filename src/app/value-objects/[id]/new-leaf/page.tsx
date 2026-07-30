import { notFound } from "next/navigation";

import { isValueObjectStructuralKindV2 } from "@/types/reality-core/reality-core-contracts-v2";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { LeafCreateForm } from "./leaf-create-form";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type LeafCreatePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

type StructuralParentRow = {
  id: string;
  title: string;
  object_kind: string | null;
  node_role_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  status: string;
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

export default async function LeafCreatePage({
  params,
  searchParams,
}: LeafCreatePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
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

  const { data: parentData, error: parentError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status
    `,
    )
    .eq("id", id)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .maybeSingle();

  if (parentError) {
    throw new Error(parentError.message);
  }

  const parent = parentData as StructuralParentRow | null;

  if (!parent) {
    notFound();
  }

  const branchTypeCode = parent.branch_type_code;
  const objectKind = parent.object_kind;
  const rootValueObjectId = parent.root_value_object_id;
  const parentIsEligible =
    parent.node_role_code === "structural" &&
    typeof rootValueObjectId === "string" &&
    isValueObjectStructuralKindV2(objectKind) &&
    typeof branchTypeCode === "string" &&
    (parent.status === "draft" || parent.status === "active");

  if (
    !parentIsEligible ||
    !branchTypeCode ||
    !objectKind ||
    !rootValueObjectId
  ) {
    notFound();
  }

  return (
    <LeafCreateForm
      locale={locale}
      activeProfileName={actorContext.profile.displayName}
      parent={{
        id: parent.id,
        title: parent.title,
        branchTypeCode,
        objectKind,
        rootValueObjectId,
        status: parent.status,
      }}
    />
  );
}
