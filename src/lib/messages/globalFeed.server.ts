import { toMediaDeliveryUrl } from "../../../lib/media-egress";
import { supabase } from "../../../lib/supabase";
import { resolveLocalizedContentFieldsStrict } from "../localization/contentLocalization";
import { getPublicCommentCountMap } from "./commentCounts.server";
import {
  getPublicMessageImageMap,
  type PublicMessageImage,
} from "./messageMedia.server";
import {
  ensurePublicMessageObjectLocalizationsV1,
  readCachedPublicMessageObjectLocalizationV1,
  type MessageObjectLocalizationSource,
} from "./messageObjectOnDemandLocalization.server";

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

type PublicProfileRow = {
  id: string;
  actor_id: string;
  public_slug: string | null;
  display_name: string;
  image_url: string | null;
  is_public: boolean;
  updated_at: string;
};

export type GlobalArctorFeedItem = {
  id: string;
  sourceContentText: string | null;
  languageCode: string | null;
  publishedAt: string;
  localizationSource: MessageObjectLocalizationSource;
  image: PublicMessageImage | null;
  commentCount: number;
  author: {
    actorId: string;
    kind: "organization" | "profile";
    displayName: string;
    publicSlug: string | null;
    imageUrl: string | null;
  };
};

export type GlobalArctorFeedResult = {
  items: GlobalArctorFeedItem[];
  errorMessage: string | null;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const READ_MULTIPLIER = 5;
const MAX_CANDIDATES = 200;

function clampLimit(value: number | undefined) {
  return Math.min(Math.max(value ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
}

function buildOrganizationLogoUrl(row: OrganizationRow) {
  const version = row.updated_at ?? row.created_at;

  return `/api/directory/organizations/${encodeURIComponent(
    row.public_slug ?? "",
  )}/logo?v=${encodeURIComponent(version)}`;
}

function buildProfileImageUrl(row: PublicProfileRow) {
  return toMediaDeliveryUrl(
    row.image_url,
    `/api/profiles/${encodeURIComponent(row.id)}/image`,
    row.updated_at,
  );
}

export function readCachedGlobalArctorFeedItemContent(input: {
  locale?: string;
  item: GlobalArctorFeedItem;
}) {
  return readCachedPublicMessageObjectLocalizationV1({
    targetLocale: input.locale,
    message: input.item.localizationSource,
  });
}

export async function localizeGlobalArctorFeedItems(input: {
  locale?: string;
  items: GlobalArctorFeedItem[];
}) {
  const localization = await ensurePublicMessageObjectLocalizationsV1({
    targetLocale: input.locale,
    messages: input.items.map((item) => item.localizationSource),
  });

  if (localization.warnings.length > 0) {
    console.warn(
      "Global ARCTor feed localization warnings",
      localization.warnings,
    );
  }

  return localization.contentTextById;
}

export async function getGlobalArctorFeed(input: {
  locale?: string;
  limit?: number;
  excludeMessageObjectIds?: string[];
  includeOnlyMessageObjectIds?: string[];
}): Promise<GlobalArctorFeedResult> {
  const limit = clampLimit(input.limit);
  const includeOnly = Array.from(
    new Set((input.includeOnlyMessageObjectIds ?? []).filter(Boolean)),
  );

  if (
    Array.isArray(input.includeOnlyMessageObjectIds) &&
    includeOnly.length === 0
  ) {
    return { items: [], errorMessage: null };
  }

  try {
    let query = supabase
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

    if (includeOnly.length > 0) {
      query = query.in("id", includeOnly);
    }

    const { data: messageRows, error: messageError } = await query;

    if (messageError) {
      throw new Error(`GLOBAL_FEED_MESSAGE_READ_FAILED:${messageError.message}`);
    }

    const excludedIds = new Set(
      (input.excludeMessageObjectIds ?? []).filter(Boolean),
    );
    const messages = ((messageRows ?? []) as MessageObjectRow[]).filter(
      (row) => !excludedIds.has(row.id),
    );

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

    const profileActorIds = Array.from(
      new Set(
        deliveredMessages
          .map((message) => actorById.get(message.author_actor_id))
          .filter(
            (actor): actor is ActorRow =>
              Boolean(
                actor &&
                  (actor.actor_type === "person" ||
                    actor.actor_type === "avatar"),
              ),
          )
          .map((actor) => actor.id),
      ),
    );

    let organizationRows: OrganizationRow[] = [];

    if (organizationIds.length > 0) {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id,organization_name,public_slug,metadata_json,created_at,updated_at",
        )
        .in("id", organizationIds)
        .eq("status", "active")
        .eq("directory_status", "published")
        .eq("is_public_profile_enabled", true)
        .eq("is_listed_in_directory", true);

      if (error) {
        throw new Error(
          `GLOBAL_FEED_ORGANIZATION_READ_FAILED:${error.message}`,
        );
      }

      organizationRows = (data ?? []) as OrganizationRow[];
    }

    let profileRows: PublicProfileRow[] = [];

    if (profileActorIds.length > 0) {
      const { data, error } = await supabase
        .from("actor_public_profiles")
        .select(
          "id,actor_id,public_slug,display_name,image_url,is_public,updated_at",
        )
        .in("actor_id", profileActorIds);

      if (error) {
        throw new Error(`GLOBAL_FEED_PROFILE_READ_FAILED:${error.message}`);
      }

      profileRows = (data ?? []) as PublicProfileRow[];
    }

    const organizationById = new Map(
      organizationRows
        .filter((row) => Boolean(row.public_slug))
        .map((row) => [row.id, row]),
    );

    const profileByActorId = new Map(
      profileRows.map((row) => [row.actor_id, row]),
    );

    const eligibleMessages = deliveredMessages
      .filter((message) => {
        const actor = actorById.get(message.author_actor_id);

        if (!actor) return false;

        if (
          actor.actor_type === "organization" &&
          actor.organization_id
        ) {
          return organizationById.has(actor.organization_id);
        }

        if (actor.actor_type === "person" || actor.actor_type === "avatar") {
          return profileByActorId.has(actor.id);
        }

        return false;
      })
      .slice(0, limit);

    const eligibleIds = eligibleMessages.map((message) => message.id);
    const [imageByMessageId, commentCountByMessageId] = await Promise.all([
      getPublicMessageImageMap(eligibleIds),
      getPublicCommentCountMap(eligibleIds),
    ]);

    const items = eligibleMessages.flatMap((message) => {
      const actor = actorById.get(message.author_actor_id);

      if (!actor) {
        return [];
      }

      let author: GlobalArctorFeedItem["author"] | null = null;

      if (actor.actor_type === "organization" && actor.organization_id) {
        const organization = organizationById.get(actor.organization_id);

        if (organization?.public_slug) {
          const localizedOrganization = resolveLocalizedContentFieldsStrict({
            metadata: organization.metadata_json,
            locale: input.locale,
            fieldCodes: ["organizationName"],
          });

          author = {
            actorId: actor.id,
            kind: "organization",
            displayName:
              localizedOrganization.organizationName ??
              organization.organization_name,
            publicSlug: organization.public_slug,
            imageUrl: buildOrganizationLogoUrl(organization),
          };
        }
      } else if (
        actor.actor_type === "person" ||
        actor.actor_type === "avatar"
      ) {
        const profile = profileByActorId.get(actor.id);

        if (profile) {
          const hasPublicProfile = Boolean(
            profile.is_public && profile.public_slug,
          );

          author = {
            actorId: actor.id,
            kind: "profile",
            displayName: profile.display_name,
            publicSlug: hasPublicProfile ? profile.public_slug : null,
            imageUrl: hasPublicProfile ? buildProfileImageUrl(profile) : null,
          };
        }
      }

      if (!author) {
        return [];
      }

      const localizationSource: MessageObjectLocalizationSource = {
        id: message.id,
        ownerUserId: message.owner_user_id,
        createdByActorId: message.created_by_actor_id,
        sourceLocaleHint: message.language_code,
        contentText: message.content_text,
        metadataJson: message.metadata_json,
      };

      return [
        {
          id: message.id,
          sourceContentText: message.content_text,
          languageCode: message.language_code,
          publishedAt: message.activated_at ?? message.created_at,
          localizationSource,
          image: imageByMessageId.get(message.id) ?? null,
          commentCount: commentCountByMessageId.get(message.id) ?? 0,
          author,
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
