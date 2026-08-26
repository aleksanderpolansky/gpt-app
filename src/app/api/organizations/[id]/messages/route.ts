import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  owner_actor_id: string | null;
  public_slug: string | null;
};

type OrganizationActorRow = {
  id: string;
};

type MessageObjectRow = {
  id: string;
  content_text: string | null;
  language_code: string | null;
  lifecycle_status: string;
  activated_at: string | null;
  created_at: string;
};

type DistributionRow = {
  id: string;
};

const MAX_CONTENT_LENGTH = 5000;
const SUPPORTED_LOCALES = new Set([
  "en",
  "pl",
  "uk",
  "ru",
  "de",
  "es",
  "cs",
]);

function parseContentText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text || text.length > MAX_CONTENT_LENGTH) {
    return null;
  }

  return text;
}

function parseLocale(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const locale = value.trim().toLowerCase();

  return SUPPORTED_LOCALES.has(locale) ? locale : null;
}

async function getCurrentActorContext() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.code,
            errorMessage: error.message,
          },
          { status: error.status },
        ),
      };
    }

    return {
      actorContext: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

async function getOwnedOrganization(input: {
  organizationId: string;
  actorId: string;
}) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,organization_name,owner_actor_id,public_slug")
    .eq("id", input.organizationId)
    .limit(1);

  if (error) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      ),
    };
  }

  const organization =
    ((data ?? [])[0] as OrganizationRow | undefined) ?? null;

  if (!organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Organization not found." },
        { status: 404 },
      ),
    };
  }

  if (organization.owner_actor_id !== input.actorId) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Only the active organization owner can publish messages.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

async function getOrganizationActor(organizationId: string) {
  const { data, error } = await supabase
    .from("actors")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("actor_type", "organization")
    .eq("status", "active")
    .limit(1);

  if (error) {
    return {
      actor: null,
      error: error.message,
    };
  }

  return {
    actor:
      ((data ?? [])[0] as OrganizationActorRow | undefined) ?? null,
    error: null,
  };
}

function readRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as T;
  }

  return null;
}

async function cleanupMessageObject(messageObjectId: string) {
  const { error } = await supabase
    .from("message_objects")
    .delete()
    .eq("id", messageObjectId);

  return error?.message ?? null;
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id: organizationId } = await params;

  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!actorContext) {
    return NextResponse.json(
      { ok: false, error: "Actor context not found" },
      { status: 500 },
    );
  }

  const { organization, errorResponse: ownershipError } =
    await getOwnedOrganization({
      organizationId,
      actorId: actorContext.actorId,
    });

  if (ownershipError) {
    return ownershipError;
  }

  if (!organization) {
    return NextResponse.json(
      { ok: false, error: "Organization not found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const contentText = parseContentText(body.contentText);
  const languageCode = parseLocale(body.locale);

  if (!contentText) {
    return NextResponse.json(
      {
        ok: false,
        error: `Publication text must contain 1-${MAX_CONTENT_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const organizationActorResult = await getOrganizationActor(organization.id);

  if (organizationActorResult.error) {
    return NextResponse.json(
      { ok: false, error: organizationActorResult.error },
      { status: 500 },
    );
  }

  if (!organizationActorResult.actor) {
    return NextResponse.json(
      {
        ok: false,
        error: "Active organization actor is missing.",
      },
      { status: 409 },
    );
  }

  const { data: createData, error: createError } = await supabase.rpc(
    "create_message_object_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_created_by_actor_id: actorContext.actorId,
      p_author_actor_id: organizationActorResult.actor.id,
      p_title: null,
      p_content_text: contentText,
      p_content_json: {},
      p_language_code: languageCode,
      p_audience_scope_code: "public",
      p_audience_selector_json: {},
      p_intent_code: null,
      p_lifecycle_status: "draft",
      p_scheduled_at: null,
      p_origin_kind_code: "native",
      p_origin_provider_code: "arctor",
      p_external_account_id: null,
      p_external_item_id: null,
      p_canonical_url: null,
      p_source_published_at: null,
      p_metadata_json: {
        source: "enterprise_publication_f2",
        organization_id: organization.id,
        surface: "directory",
      },
    },
  );

  const createdMessage = readRpcRow<MessageObjectRow>(createData);

  if (createError || !createdMessage) {
    return NextResponse.json(
      {
        ok: false,
        error:
          createError?.message ??
          "Canonical message object could not be created.",
      },
      { status: createError?.code === "42501" ? 403 : 500 },
    );
  }

  const destinationRef = organization.public_slug
    ? `directory:${organization.public_slug}`
    : `organization:${organization.id}`;

  const { data: distributionData, error: distributionError } = await supabase
    .from("message_object_distributions")
    .insert({
      message_object_id: createdMessage.id,
      channel_code: "arctor",
      destination_ref: destinationRef,
      delivery_status: "pending",
      metadata_json: {
        surface: "directory",
        organization_id: organization.id,
      },
    })
    .select("id")
    .limit(1);

  const distribution =
    ((distributionData ?? [])[0] as DistributionRow | undefined) ?? null;

  if (distributionError || !distribution) {
    const cleanupError = await cleanupMessageObject(createdMessage.id);

    return NextResponse.json(
      {
        ok: false,
        error:
          distributionError?.message ??
          "ARCTor distribution could not be created.",
        cleanupError,
      },
      { status: 500 },
    );
  }

  const { data: activateData, error: activateError } = await supabase.rpc(
    "activate_message_object_v1",
    {
      p_owner_user_id: actorContext.appUserId,
      p_message_object_id: createdMessage.id,
    },
  );

  const activatedMessage = readRpcRow<MessageObjectRow>(activateData);

  if (activateError || !activatedMessage) {
    const cleanupError = await cleanupMessageObject(createdMessage.id);

    return NextResponse.json(
      {
        ok: false,
        error:
          activateError?.message ??
          "Canonical message object could not be activated.",
        cleanupError,
      },
      { status: activateError?.code === "42501" ? 403 : 500 },
    );
  }

  const deliveredAt = new Date().toISOString();

  const { error: deliveryError } = await supabase
    .from("message_object_distributions")
    .update({
      delivery_status: "succeeded",
      first_attempt_at: deliveredAt,
      last_attempt_at: deliveredAt,
      delivered_at: deliveredAt,
      error_code: null,
      error_message: null,
    })
    .eq("id", distribution.id)
    .eq("message_object_id", activatedMessage.id);

  if (deliveryError) {
    const cleanupError = await cleanupMessageObject(activatedMessage.id);

    return NextResponse.json(
      {
        ok: false,
        error: deliveryError.message,
        cleanupError,
      },
      { status: 500 },
    );
  }

  if (organization.public_slug) {
    revalidatePath(`/directory/${organization.public_slug}`);
  }

  return NextResponse.json(
    {
      ok: true,
      message: {
        id: activatedMessage.id,
        contentText: activatedMessage.content_text,
        languageCode: activatedMessage.language_code,
        publishedAt:
          activatedMessage.activated_at ?? activatedMessage.created_at,
      },
      author: {
        actorId: organizationActorResult.actor.id,
        organizationId: organization.id,
        organizationName: organization.organization_name,
      },
      createdBy: {
        actorId: actorContext.actorId,
        profileId: actorContext.profile.profileId,
      },
      distribution: {
        channelCode: "arctor",
        status: "succeeded",
      },
    },
    { status: 201 },
  );
}
