import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import {
  persistMediaImageValue,
  PUBLIC_MEDIA_BUCKET_ID,
} from "../../../../../../lib/media-storage";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  owner_actor_id: string | null;
  public_slug: string | null;
};

type OrganizationActorRow = { id: string };

type MessageObjectRow = {
  id: string;
  content_text: string | null;
  language_code: string | null;
  lifecycle_status: string;
  activated_at: string | null;
  created_at: string;
};

type DistributionRow = { id: string };

type ParsedImage = {
  widthPx: number;
  heightPx: number;
  byteSize: number;
  sha256Hex: string;
  storagePath: string;
  dataUrl: string;
};

type ParsedPublicationInput = {
  contentText: string | null;
  languageCode: string | null;
  image: ParsedImage | null;
};

const MAX_CONTENT_LENGTH = 5000;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_IMAGE_EDGE_PX = 1600;
const MESSAGE_IMAGE_NAMESPACE = "message-objects/image";

const SUPPORTED_LOCALES = new Set([
  "en", "pl", "uk", "ru", "de", "es", "cs",
]);

class PublicationInputError extends Error {
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.status = status;
  }
}

function parseContentText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= MAX_CONTENT_LENGTH ? text : null;
}

function parseLocale(value: unknown) {
  if (typeof value !== "string") return null;
  const locale = value.trim().toLowerCase();
  return SUPPORTED_LOCALES.has(locale) ? locale : null;
}

function readUint24LE(bytes: Buffer, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16)
  );
}

function readWebPDimensions(bytes: Buffer) {
  if (
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new PublicationInputError("PUBLICATION_IMAGE_WEBP_INVALID");
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourCc = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkSize;

    if (dataEnd > bytes.length) {
      throw new PublicationInputError("PUBLICATION_IMAGE_WEBP_INVALID");
    }

    if (fourCc === "VP8X" && chunkSize >= 10) {
      return {
        width: 1 + readUint24LE(bytes, dataOffset + 4),
        height: 1 + readUint24LE(bytes, dataOffset + 7),
      };
    }

    if (
      fourCc === "VP8 " &&
      chunkSize >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (
      fourCc === "VP8L" &&
      chunkSize >= 5 &&
      bytes[dataOffset] === 0x2f
    ) {
      const bits = bytes.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }

    offset = dataEnd + (chunkSize % 2);
  }

  throw new PublicationInputError("PUBLICATION_IMAGE_WEBP_DIMENSIONS_MISSING");
}

async function parseMultipartPublication(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    throw new PublicationInputError("PUBLICATION_FORM_DATA_INVALID");
  }

  const contentText = parseContentText(formData.get("contentText"));
  const languageCode = parseLocale(formData.get("locale"));
  const imageValue = formData.get("image");

  if (!imageValue || typeof imageValue === "string" || imageValue.size === 0) {
    return { contentText, languageCode, image: null } satisfies ParsedPublicationInput;
  }

  if (imageValue.type !== "image/webp") {
    throw new PublicationInputError("PUBLICATION_IMAGE_TYPE_UNSUPPORTED");
  }
  if (imageValue.size > MAX_IMAGE_BYTES) {
    throw new PublicationInputError("PUBLICATION_IMAGE_TOO_LARGE");
  }

  const bytes = Buffer.from(await imageValue.arrayBuffer());

  if (bytes.byteLength !== imageValue.size || bytes.byteLength <= 0) {
    throw new PublicationInputError("PUBLICATION_IMAGE_BYTES_INVALID");
  }

  const dimensions = readWebPDimensions(bytes);

  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    Math.max(dimensions.width, dimensions.height) > MAX_IMAGE_EDGE_PX
  ) {
    throw new PublicationInputError("PUBLICATION_IMAGE_DIMENSIONS_INVALID");
  }

  const sha256Hex = createHash("sha256").update(bytes).digest("hex");

  return {
    contentText,
    languageCode,
    image: {
      widthPx: dimensions.width,
      heightPx: dimensions.height,
      byteSize: bytes.byteLength,
      sha256Hex,
      storagePath: `${MESSAGE_IMAGE_NAMESPACE}/${sha256Hex}.webp`,
      dataUrl: `data:image/webp;base64,${bytes.toString("base64")}`,
    },
  } satisfies ParsedPublicationInput;
}

async function parsePublicationInput(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartPublication(request);
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    throw new PublicationInputError("PUBLICATION_JSON_BODY_INVALID");
  }

  return {
    contentText: parseContentText(body.contentText),
    languageCode: parseLocale(body.locale),
    image: null,
  } satisfies ParsedPublicationInput;
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
          { ok: false, error: error.code, errorMessage: error.message },
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

  return { organization, errorResponse: null };
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
    return { actor: null, error: error.message };
  }

  return {
    actor: ((data ?? [])[0] as OrganizationActorRow | undefined) ?? null,
    error: null,
  };
}

function readRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === "object") return data as T;
  return null;
}

async function cleanupMessageObject(messageObjectId: string) {
  const { error } = await supabase
    .from("message_objects")
    .delete()
    .eq("id", messageObjectId);
  return error?.message ?? null;
}

async function publicMediaObjectExists(storagePath: string) {
  const slashIndex = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, slashIndex);
  const fileName = storagePath.slice(slashIndex + 1);

  const { data, error } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET_ID)
    .list(folder, { limit: 10, search: fileName });

  if (error) {
    throw new Error(`MESSAGE_MEDIA_EXISTENCE_CHECK_FAILED:${error.message}`);
  }

  return (data ?? []).some((row) => row.name === fileName);
}

async function cleanupMediaObject(input: {
  storagePath: string | null;
  existedBefore: boolean;
}) {
  if (!input.storagePath || input.existedBefore) return null;

  const { error } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET_ID)
    .remove([input.storagePath]);

  return error?.message ?? null;
}

async function cleanupPublicationResources(input: {
  messageObjectId: string;
  mediaStoragePath: string | null;
  mediaExistedBefore: boolean;
}) {
  return {
    messageCleanupError: await cleanupMessageObject(input.messageObjectId),
    mediaCleanupError: await cleanupMediaObject({
      storagePath: input.mediaStoragePath,
      existedBefore: input.mediaExistedBefore,
    }),
  };
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id: organizationId } = await params;
  const { actorContext, errorResponse } = await getCurrentActorContext();

  if (errorResponse) return errorResponse;

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

  if (ownershipError) return ownershipError;

  if (!organization) {
    return NextResponse.json(
      { ok: false, error: "Organization not found." },
      { status: 404 },
    );
  }

  let publicationInput: ParsedPublicationInput;

  try {
    publicationInput = await parsePublicationInput(request);
  } catch (error) {
    if (error instanceof PublicationInputError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "PUBLICATION_INPUT_READ_FAILED" },
      { status: 400 },
    );
  }

  const contentText = publicationInput.contentText;
  const languageCode = publicationInput.languageCode;
  const image = publicationInput.image;

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
      { ok: false, error: "Active organization actor is missing." },
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
        source: image
          ? "enterprise_publication_f2m"
          : "enterprise_publication_f2",
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

  let mediaStoragePath: string | null = null;
  let mediaExistedBefore = false;

  if (image) {
    mediaStoragePath = image.storagePath;

    try {
      mediaExistedBefore = await publicMediaObjectExists(image.storagePath);

      const publicMediaUrl = await persistMediaImageValue({
        value: image.dataUrl,
        visibility: "public",
        namespace: MESSAGE_IMAGE_NAMESPACE,
        maxBytes: MAX_IMAGE_BYTES,
      });

      if (!publicMediaUrl || !/^https?:\/\//i.test(publicMediaUrl)) {
        throw new Error("MESSAGE_MEDIA_PUBLIC_URL_MISSING");
      }

      const { error: mediaInsertError } = await supabase
        .from("message_object_media")
        .insert({
          message_object_id: createdMessage.id,
          media_kind_code: "image",
          media_origin_code: "native",
          storage_bucket: PUBLIC_MEDIA_BUCKET_ID,
          storage_path: image.storagePath,
          external_url: null,
          mime_type: "image/webp",
          byte_size: image.byteSize,
          sha256_hex: image.sha256Hex,
          width_px: image.widthPx,
          height_px: image.heightPx,
          duration_seconds: null,
          sort_order: 0,
          alt_text: null,
          metadata_json: {
            source: "enterprise_publication_f2m",
            optimized_before_network: true,
            max_edge_px: MAX_IMAGE_EDGE_PX,
            preferred_payload_bytes: 400 * 1024,
            server_hard_ceiling_bytes: MAX_IMAGE_BYTES,
          },
        });

      if (mediaInsertError) {
        throw new Error(
          `MESSAGE_MEDIA_ROW_CREATE_FAILED:${mediaInsertError.message}`,
        );
      }
    } catch (error) {
      const cleanup = await cleanupPublicationResources({
        messageObjectId: createdMessage.id,
        mediaStoragePath,
        mediaExistedBefore,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "MESSAGE_MEDIA_PERSIST_FAILED",
          cleanup,
        },
        { status: 500 },
      );
    }
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
    const cleanup = await cleanupPublicationResources({
      messageObjectId: createdMessage.id,
      mediaStoragePath,
      mediaExistedBefore,
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          distributionError?.message ??
          "ARCTor distribution could not be created.",
        cleanup,
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
    const cleanup = await cleanupPublicationResources({
      messageObjectId: createdMessage.id,
      mediaStoragePath,
      mediaExistedBefore,
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          activateError?.message ??
          "Canonical message object could not be activated.",
        cleanup,
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
    const cleanup = await cleanupPublicationResources({
      messageObjectId: activatedMessage.id,
      mediaStoragePath,
      mediaExistedBefore,
    });

    return NextResponse.json(
      { ok: false, error: deliveryError.message, cleanup },
      { status: 500 },
    );
  }

  if (organization.public_slug) {
    revalidatePath(`/directory/${organization.public_slug}`);
  }
  revalidatePath("/feed");

  return NextResponse.json(
    {
      ok: true,
      message: {
        id: activatedMessage.id,
        contentText: activatedMessage.content_text,
        languageCode: activatedMessage.language_code,
        publishedAt:
          activatedMessage.activated_at ?? activatedMessage.created_at,
        hasImage: Boolean(image),
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
