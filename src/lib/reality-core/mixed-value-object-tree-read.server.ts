import { supabase } from "../../../lib/supabase";
import { resolveActorValueObjectReadLocalizationsV1 } from "@/lib/localization/valueObjectReadLocalization.server";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";

export const ARCTOR_MIXED_VALUE_OBJECT_TREE_READ_V1 =
  "ARCTOR_MIXED_VALUE_OBJECT_TREE_READ_V1" as const;

export type MixedValueObjectTreeNodeV1 = {
  id: string;
  title: string;
  canonical_key: string | null;
  node_role_code: string | null;
  object_kind: string | null;
  object_kind_code: string | null;
  ontology_node_role_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  status: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
};

const MIXED_TREE_SELECT_V1 = [
  "id",
  "title",
  "canonical_key",
  "node_role_code",
  "object_kind",
  "object_kind_code",
  "ontology_node_role_code",
  "branch_type_code",
  "root_value_object_id",
  "parent_value_object_id",
  "status",
  "metadata_json",
  "created_at",
  "scope_code",
  "origin_type_code",
  "owner_user_id",
  "owner_actor_id",
].join(",");

function compareCreatedAt(
  left: MixedValueObjectTreeNodeV1,
  right: MixedValueObjectTreeNodeV1,
) {
  const leftValue = left.created_at ?? "";
  const rightValue = right.created_at ?? "";

  if (leftValue === rightValue) {
    return left.id.localeCompare(right.id);
  }

  return leftValue.localeCompare(rightValue);
}

export async function readMixedValueObjectTreeV1(input: {
  rootValueObjectId: string;
  appUserId: string;
  actorId: string;
  locale: string;
}): Promise<MixedValueObjectTreeNodeV1[]> {
  const [globalResult, actorResult] = await Promise.all([
    supabase
      .from("value_objects")
      .select(MIXED_TREE_SELECT_V1)
      .eq("root_value_object_id", input.rootValueObjectId)
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model")
      .order("created_at", { ascending: true }),
    supabase
      .from("value_objects")
      .select(MIXED_TREE_SELECT_V1)
      .eq("root_value_object_id", input.rootValueObjectId)
      .eq("scope_code", "actor")
      .eq("owner_user_id", input.appUserId)
      .eq("owner_actor_id", input.actorId)
      .order("created_at", { ascending: true }),
  ]);

  if (globalResult.error) {
    throw new Error(
      `MIXED_TREE_GLOBAL_READ_FAILED:${globalResult.error.message}`,
    );
  }

  if (actorResult.error) {
    throw new Error(
      `MIXED_TREE_ACTOR_READ_FAILED:${actorResult.error.message}`,
    );
  }

  const globalRows =
    (globalResult.data ?? []) as unknown as MixedValueObjectTreeNodeV1[];
  const actorRows =
    (actorResult.data ?? []) as unknown as MixedValueObjectTreeNodeV1[];

  const localizedActor = await resolveActorValueObjectReadLocalizationsV1({
    entities: actorRows,
    targetLocale: input.locale,
    fieldCodes: ["title"],
  });

  const byId = new Map<string, MixedValueObjectTreeNodeV1>();

  for (const node of globalRows) {
    byId.set(
      node.id,
      localizeGlobalSystemValueObject(node, input.locale),
    );
  }

  for (const node of actorRows) {
    const localizedTitle =
      localizedActor.fieldsById.get(node.id)?.title ?? node.title;

    byId.set(node.id, {
      ...node,
      title: localizedTitle,
    });
  }

  return [...byId.values()].sort(compareCreatedAt);
}
