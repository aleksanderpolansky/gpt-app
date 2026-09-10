import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import { materializeActorValueObjectAllLocalizationsV1 } from "@/lib/localization/valueObjectLocalizationMaterialization.server";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function normalizeCursor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized && normalized.length <= 200 ? normalized : null;
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not resolve active actor context",
      },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as JsonRecord;
  const cursor = normalizeCursor(body.cursor);

  let query = supabase
    .from("value_objects")
    .select("id,title,description")
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("id", { ascending: true })
    .limit(2);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<{
    id: string;
    title: string | null;
    description: string | null;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      done: true,
      processed: 0,
      cursor,
      nextCursor: cursor,
      item: null,
    });
  }

  const row = rows[0];

  try {
    const item =
      await materializeActorValueObjectAllLocalizationsV1({
        appUserId: actorContext.appUserId,
        actorId: actorContext.actorId,
        entityId: row.id,
        fieldCodes: ["title", "description"],
      });

    if (!item.complete) {
      return NextResponse.json(
        {
          ok: false,
          done: false,
          processed: 0,
          retryCursor: cursor,
          failedEntityId: row.id,
          item,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      done: rows.length === 1,
      processed: 1,
      cursor,
      nextCursor: row.id,
      item,
    });
  } catch (materializationError) {
    return NextResponse.json(
      {
        ok: false,
        done: false,
        processed: 0,
        retryCursor: cursor,
        failedEntityId: row.id,
        error:
          materializationError instanceof Error
            ? materializationError.message
            : "VALUE_OBJECT_ALL_LOCALE_BACKFILL_FAILED",
      },
      { status: 503 },
    );
  }
}
