import { supabase } from "../../../lib/supabase";
import { resolveLocalizedContentFieldsStrict } from "../localization/contentLocalization";
import { ensurePublicMessageObjectLocalizationsV1 } from "./messageObjectOnDemandLocalization.server";

type MessageObjectRow = {
  id: string;
  owner_user_id: string | null;
  created_by_actor_id: string | null;
  author_actor_id: string;
  content_text: string | null;
  language_code: string | null;
  metadata_json: Record<string, unknown> | null;
  activated_at: string | null;
  created_at: string;
};

type DistributionRow = {
  message_object_id: string;
};

type ActorRow = {
  id: string;
  actor_type: string;
  organization_id: string | null;
  status: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  public_slug: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type GlobalArctorFeedItem = {
  id: string;
  contentText: string | null;
  languageCode: string | null;
  publishedAt: string;
  author: {
    actorId: string;
    organizationId: string;
    organizationName: string;
    publicSlug: string;
    logoUrl: string;
  };
};

export type GlobalArctorFeedResult = {
  items: GlobalArctorFeedItem[];
  errorMessage: string | null;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const READ_MULTIPLIER = 4;
const MAX_CANDIDATES = 160;

function clampLimit(value: number | undefined) {
  return Math.min(Math.max(value ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
}

function buildOrganizationLogoUrl(row: OrganizationRow) {
  const version = row.updated_at ?? row.created_at;

  return `/api/directory/organizations/${encodeURIComponent(
    row.public_slug ?? "",
  )}/logo?v=${encodeURIComponent(version)}`;
}

export async function getGlobalArctorFeed(input: {
  locale?: string;
  limit?: number;
}): Promise<GlobalArctorFeedResult> {
  const limit = clampLimit(input.limit);

  try {
    const { data: messageRows, error: messageError } = await supabase
      .from("message_objects")
      .select(
        "id,owner_user_id,created_by_actor_id,author_actor_id,content_text,language_code,metadata_json,activated_at,created_at",
      )
      .eq("audience_scope_code", "public")
      .eq("lifecycle_status", "active")
      .eq("origin_kind_code", "native")
      .eq("origin_provider_code", "arctor")
      .order("activated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.min(limit * READ_MULTIPLIER, MAX_CANDIDATES));

    if (messageError) {
      throw new Error(`GLOBAL_FEED_MESSAGE_READ_FAILED:${messageError.message}`);
    }

    const messages = (messageRows ?? []) as MessageObjectRow[];

    if (messages.length === 0) {
      return { items: [], errorMessage: null };
    }

    const messageIds = messages.map((row) => row.id);

    const { data: distributionRows, error: distributionError } = await supabase
      .from("message_object_distributions")
      .select("message_object_id")
      .in("message_object_id", messageIds)
      .eq("channel_code", "arctor")
      .eq("delivery_status", "succeeded");

    if (distributionError) {
      throw new Error(
        `GLOBAL_FEED_DISTRIBUTION_READ_FAILED:${distributionError.message}`,
      );
    }

    const deliveredIds = new Set(
      ((distributionRows ?? []) as DistributionRow[]).map(
        (row) => row.message_object_id,
      ),
    );

    const deliveredMessages = messages.filter((row) =>
      deliveredIds.has(row.id),
    );

    if (deliveredMessages.length === 0) {
      return { items: [], errorMessage: null };
    }

    const authorIds = Array.from(
      new Set(deliveredMessages.map((row) => row.author_actor_id)),
    );

    const { data: actorRows, error: actorError } = await supabase
      .from("actors")
      .select("id,actor_type,organization_id,status")
      .in("id", authorIds)
      .eq("status", "active");

    if (actorError) {
      throw new Error(`GLOBAL_FEED_ACTOR_READ_FAILED:${actorError.message}`);
    }

    const actorById = new Map(
      ((actorRows ?? []) as ActorRow[]).map((row) => [row.id, row]),
    );

    const organizationIds = Array.from(
      new Set(
        deliveredMessages
          .map((message) => actorById.get(message.author_actor_id))
          .filter(
            (actor): actor is ActorRow =>
              Boolean(
                actor &&
                  actor.actor_type === "organization" &&
                  actor.organization_id,
              ),
          )
          .map((actor) => actor.organization_id as string),
      ),
    );

    if (organizationIds.length === 0) {
      return { items: [], errorMessage: null };
    }

    const { data: organizationRows, error: organizationError } = await supabase
      .from("organizations")
      .select(
        "id,organization_name,public_slug,metadata_json,created_at,updated_at",
      )
      .in("id", organizationIds)
      .eq("status", "active")
      .eq("directory_status", "published")
      .eq("is_public_profile_enabled", true)
      .eq("is_listed_in_directory", true);

    if (organizationError) {
      throw new Error(
        `GLOBAL_FEED_ORGANIZATION_READ_FAILED:${organizationError.message}`,
      );
    }

    const organizationById = new Map(
      ((organizationRows ?? []) as OrganizationRow[])
        .filter((row) => Boolean(row.public_slug))
        .map((row) => [row.id, row]),
    );

    const eligibleMessages = deliveredMessages
      .filter((message) => {
        const actor = actorById.get(message.author_actor_id);
        return Boolean(
          actor?.organization_id &&
            actor.actor_type === "organization" &&
            organizationById.has(actor.organization_id),
        );
      })
      .slice(0, limit);

    const localization = await ensurePublicMessageObjectLocalizationsV1({
      targetLocale: input.locale,
      messages: eligibleMessages.map((row) => ({
        id: row.id,
        ownerUserId: row.owner_user_id,
        createdByActorId: row.created_by_actor_id,
        sourceLocaleHint: row.language_code,
        contentText: row.content_text,
        metadataJson: row.metadata_json,
      })),
    });

    if (localization.warnings.length > 0) {
      console.warn("Global ARCTor feed localization warnings", localization.warnings);
    }

    const items = eligibleMessages.flatMap((message) => {
      const actor = actorById.get(message.author_actor_id);

      if (
        !actor ||
        actor.actor_type !== "organization" ||
        !actor.organization_id
      ) {
        return [];
      }

      const organization = organizationById.get(actor.organization_id);

      if (!organization?.public_slug) {
        return [];
      }

      const localizedOrganization = resolveLocalizedContentFieldsStrict({
        metadata: organization.metadata_json,
        locale: input.locale,
        fieldCodes: ["organizationName"],
      });

      return [
        {
          id: message.id,
          contentText:
            localization.contentTextById.get(message.id) ?? message.content_text,
          languageCode: message.language_code,
          publishedAt: message.activated_at ?? message.created_at,
          author: {
            actorId: actor.id,
            organizationId: organization.id,
            organizationName:
              localizedOrganization.organizationName ??
              organization.organization_name,
            publicSlug: organization.public_slug,
            logoUrl: buildOrganizationLogoUrl(organization),
          },
        } satisfies GlobalArctorFeedItem,
      ];
    });

    return { items, errorMessage: null };
  } catch (error) {
    return {
      items: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Global ARCTor feed could not be loaded.",
    };
  }
}
