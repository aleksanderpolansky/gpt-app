import { supabase } from "../../../lib/supabase";

type RelationRow = {
  message_object_id: string;
  target_message_object_id: string | null;
};

type CommentRow = {
  id: string;
};

export async function getPublicCommentCountMap(
  publicationMessageObjectIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const publicationIds = Array.from(
    new Set(publicationMessageObjectIds.filter(Boolean)),
  );

  for (const publicationId of publicationIds) {
    result.set(publicationId, 0);
  }

  if (publicationIds.length === 0) {
    return result;
  }

  try {
    const { data: relationRows, error: relationError } = await supabase
      .from("message_object_relations")
      .select("message_object_id,target_message_object_id")
      .in("target_message_object_id", publicationIds)
      .eq("relation_code", "reply_to");

    if (relationError) {
      throw new Error(
        `PUBLIC_COMMENT_COUNT_RELATION_READ_FAILED:${relationError.message}`,
      );
    }

    const relations = (relationRows ?? []) as RelationRow[];
    const commentIds = Array.from(
      new Set(relations.map((row) => row.message_object_id).filter(Boolean)),
    );

    if (commentIds.length === 0) {
      return result;
    }

    const { data: commentRows, error: commentError } = await supabase
      .from("message_objects")
      .select("id")
      .in("id", commentIds)
      .eq("audience_scope_code", "public")
      .eq("intent_code", "comment")
      .eq("lifecycle_status", "active");

    if (commentError) {
      throw new Error(
        `PUBLIC_COMMENT_COUNT_MESSAGE_READ_FAILED:${commentError.message}`,
      );
    }

    const activeCommentIds = new Set(
      ((commentRows ?? []) as CommentRow[]).map((row) => row.id),
    );

    for (const relation of relations) {
      const targetId = relation.target_message_object_id;

      if (!targetId || !activeCommentIds.has(relation.message_object_id)) {
        continue;
      }

      result.set(targetId, (result.get(targetId) ?? 0) + 1);
    }
  } catch (error) {
    console.warn(
      "Public comment count read warning",
      error instanceof Error ? error.message : error,
    );
  }

  return result;
}
