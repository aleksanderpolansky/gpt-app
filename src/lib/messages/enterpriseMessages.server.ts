import { supabase } from "../../../lib/supabase";
import { ensurePublicMessageObjectLocalizationsV1 } from "./messageObjectOnDemandLocalization.server";
import { getPublicMessageImageMap, type PublicMessageImage } from "./messageMedia.server";

type OrganizationActorRow = {
  id: string;
};

type MessageObjectRow = {
  id: string;
  owner_user_id: string | null;
  created_by_actor_id: string | null;
  title: string | null;
  content_text: string | null;
  language_code: string | null;
  metadata_json: Record<string, unknown> | null;
  activated_at: string | null;
  created_at: string;
};

type DistributionRow = {
  message_object_id: string;
};

export type PublicEnterpriseMessage = {
  id: string;
  title: string | null;
  contentText: string | null;
  languageCode: string | null;
  publishedAt: string;
  image: PublicMessageImage | null;
};

export type PublicEnterpriseMessagesResult = {
  messages: PublicEnterpriseMessage[];
  errorMessage: string | null;
};

async function getActiveOrganizationActorId(organizationId: string) {
  const { data, error } = await supabase
    .from("actors")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("actor_type", "organization")
    .eq("status", "active")
    .limit(1);

  if (error) {
    throw new Error(`ENTERPRISE_MESSAGE_ORGANIZATION_ACTOR_READ_FAILED:${error.message}`);
  }

  const row = ((data ?? [])[0] as OrganizationActorRow | undefined) ?? null;

  return row?.id ?? null;
}

export async function getPublicEnterpriseMessages(input: {
  organizationId: string;
  locale?: string;
  limit?: number;
}): Promise<PublicEnterpriseMessagesResult> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);

  try {
    const organizationActorId = await getActiveOrganizationActorId(
      input.organizationId,
    );

    if (!organizationActorId) {
      return {
        messages: [],
        errorMessage: null,
      };
    }

    const { data: messageRows, error: messageError } = await supabase
      .from("message_objects")
      .select(
        "id,owner_user_id,created_by_actor_id,title,content_text,language_code,metadata_json,activated_at,created_at",
      )
      .eq("author_actor_id", organizationActorId)
      .eq("audience_scope_code", "public")
      .eq("lifecycle_status", "active")
      .order("activated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(limit * 3, 100));

    if (messageError) {
      throw new Error(
        `ENTERPRISE_MESSAGE_PUBLIC_READ_FAILED:${messageError.message}`,
      );
    }

    const rows = (messageRows ?? []) as MessageObjectRow[];

    if (rows.length === 0) {
      return {
        messages: [],
        errorMessage: null,
      };
    }

    const messageIds = rows.map((row) => row.id);

    const { data: distributionRows, error: distributionError } = await supabase
      .from("message_object_distributions")
      .select("message_object_id")
      .in("message_object_id", messageIds)
      .eq("channel_code", "arctor")
      .eq("delivery_status", "succeeded");

    if (distributionError) {
      throw new Error(
        `ENTERPRISE_MESSAGE_DISTRIBUTION_READ_FAILED:${distributionError.message}`,
      );
    }

    const distributedIds = new Set(
      ((distributionRows ?? []) as DistributionRow[]).map(
        (row) => row.message_object_id,
      ),
    );

    const distributedRows = rows
      .filter((row) => distributedIds.has(row.id))
      .slice(0, limit);

    const [localization, imageByMessageId] = await Promise.all([
      ensurePublicMessageObjectLocalizationsV1({
        targetLocale: input.locale,
        messages: distributedRows.map((row) => ({
          id: row.id,
          ownerUserId: row.owner_user_id,
          createdByActorId: row.created_by_actor_id,
          sourceLocaleHint: row.language_code,
          contentText: row.content_text,
          metadataJson: row.metadata_json,
        })),
      }),
      getPublicMessageImageMap(distributedRows.map((row) => row.id)),
    ]);

    if (localization.warnings.length > 0) {
      console.warn(
        "Enterprise public message localization warnings",
        localization.warnings,
      );
    }

    return {
      messages: distributedRows.map((row) => ({
        id: row.id,
        title: row.title,
        contentText:
          localization.contentTextById.get(row.id) ?? row.content_text,
        languageCode: row.language_code,
        publishedAt: row.activated_at ?? row.created_at,
        image: imageByMessageId.get(row.id) ?? null,
      })),
      errorMessage: null,
    };
  } catch (error) {
    return {
      messages: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Enterprise public activity could not be loaded.",
    };
  }
}
