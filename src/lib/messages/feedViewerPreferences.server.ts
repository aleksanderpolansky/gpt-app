import { auth0 } from "../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../lib/actor-context";
import { supabase } from "../../../lib/supabase";

type PublicProfileRow = {
  id: string;
  actor_id: string;
  public_slug: string;
  display_name: string;
  image_url: string | null;
  is_public: boolean;
  updated_at: string;
};

type HiddenIdRow = {
  message_object_id: string;
  hidden_at: string;
};

export type FeedViewerState = {
  ownerUserId: string;
  actorId: string;
  actorType: "person" | "avatar";
  profileId: string;
  profileKind: "personal" | "avatar";
  displayName: string;
  imageUrl: string | null;
  publicSlug: string | null;
  canPublishPublicly: boolean;
  hiddenMessageObjectIds: string[];
};

function readRpcRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function getCurrentFeedViewerState(): Promise<FeedViewerState | null> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  try {
    const context = await resolveActiveActorContext(session.user.sub);

    const { data: profileData, error: profileError } = await supabase
      .from("actor_public_profiles")
      .select(
        "id,actor_id,public_slug,display_name,image_url,is_public,updated_at",
      )
      .eq("id", context.profile.profileId)
      .eq("actor_id", context.actorId)
      .eq("owner_user_id", context.appUserId)
      .limit(1);

    if (profileError) {
      throw new Error(`FEED_VIEWER_PROFILE_READ_FAILED:${profileError.message}`);
    }

    const profile =
      ((profileData ?? [])[0] as PublicProfileRow | undefined) ?? null;

    const { data: hiddenData, error: hiddenError } = await supabase.rpc(
      "list_hidden_message_object_ids_v1",
      {
        p_owner_user_id: context.appUserId,
        p_viewer_actor_id: context.actorId,
        p_limit: 2000,
      },
    );

    if (hiddenError) {
      throw new Error(`FEED_HIDDEN_LIST_FAILED:${hiddenError.message}`);
    }

    return {
      ownerUserId: context.appUserId,
      actorId: context.actorId,
      actorType: context.actorType,
      profileId: context.profile.profileId,
      profileKind: context.profile.profileKind,
      displayName: context.profile.displayName,
      imageUrl: context.profile.imageUrl,
      publicSlug: profile?.public_slug ?? null,
      canPublishPublicly: Boolean(profile?.is_public && profile.public_slug),
      hiddenMessageObjectIds: readRpcRows<HiddenIdRow>(hiddenData).map(
        (row) => row.message_object_id,
      ),
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return null;
    }

    console.warn(
      "Feed viewer state warning",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
