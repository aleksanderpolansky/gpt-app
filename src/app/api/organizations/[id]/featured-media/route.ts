import crypto from "node:crypto";

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

const BUCKET_ID = "arctor-public-media";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

async function ensurePublicMediaBucket() {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`FEATURED_MEDIA_BUCKET_LIST_FAILED:${listError.message}`);
  }

  if ((buckets ?? []).some((bucket) => bucket.id === BUCKET_ID)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_ID,
    {
      public: true,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      fileSizeLimit: MAX_UPLOAD_BYTES,
    },
  );

  if (
    createError &&
    !/already exists|duplicate/i.test(createError.message)
  ) {
    throw new Error(
      `FEATURED_MEDIA_BUCKET_CREATE_FAILED:${createError.message}`,
    );
  }
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

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select("id,owner_actor_id")
    .eq("id", organizationId)
    .limit(1);

  if (organizationError) {
    return NextResponse.json(
      { ok: false, error: organizationError.message },
      { status: 500 },
    );
  }

  const organization =
    ((organizationData ?? [])[0] as
      | { id: string; owner_actor_id: string | null }
      | undefined) ?? null;

  if (!organization) {
    return NextResponse.json(
      { ok: false, error: "Organization not found." },
      { status: 404 },
    );
  }

  if (organization.owner_actor_id !== actorContext.actorId) {
    return NextResponse.json(
      { ok: false, error: "You cannot edit this organization." },
      { status: 403 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid multipart body." },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Image file is required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Only JPEG, PNG and WebP images are supported.",
      },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image must be smaller than 5 MB." },
      { status: 400 },
    );
  }

  try {
    await ensurePublicMediaBucket();

    const extension = EXTENSION_BY_MIME[file.type];
    const objectPath =
      `featured/${organizationId}/${crypto.randomUUID()}.${extension}`;
    const fileBytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ID)
      .upload(objectPath, fileBytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`FEATURED_MEDIA_UPLOAD_FAILED:${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_ID)
      .getPublicUrl(objectPath);

    const publicUrl = publicUrlData.publicUrl?.trim();

    if (!publicUrl) {
      throw new Error("FEATURED_MEDIA_PUBLIC_URL_MISSING");
    }

    return NextResponse.json({
      ok: true,
      publicUrl,
      storageBucket: BUCKET_ID,
      storagePath: objectPath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Featured image upload failed.",
      },
      { status: 500 },
    );
  }
}
