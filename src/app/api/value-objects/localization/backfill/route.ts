import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import {
  normalizeContentLocale,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
} from "@/lib/localization/contentLocalization";
import {
  ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
  generateLocalizedContentBatch,
} from "@/lib/localization/contentLocalization.server";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 5;

type JsonRecord = Record<string, unknown>;

type BackfillRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  metadata_json?: JsonRecord | null;
  scope_code?: string | null;
  usage_scope?: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVisibleObservationObject(row: BackfillRow) {
  const metadata = isRecord(row.metadata_json) ? row.metadata_json : {};
  return (
    row.scope_code !== "global" &&
    row.usage_scope !== "commercial" &&
    metadata.system_hidden_from_observation_ui !== true &&
    metadata.system_root_code !== "products_services"
  );
}

function fieldsFor(row: BackfillRow) {
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : null;
  const description =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : null;

  return {
    title,
    ...(description ? { description } : {}),
  };
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let actorContext;
  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        { ok: false, error: error.message, errorCode: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as JsonRecord;
  const locale = normalizeContentLocale(body.locale);

  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,description,metadata_json,scope_code,usage_scope")
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const pending = ((data ?? []) as BackfillRow[]).filter((row) => {
    if (!isVisibleObservationObject(row)) return false;
    if (readLocalizedContentEnvelope(row.metadata_json)) return false;
    return Boolean(fieldsFor(row).title);
  });

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      localized: 0,
      pending: 0,
      locale,
      warnings: [],
    });
  }

  let localized = 0;
  const warnings: string[] = [];

  for (const batch of chunks(pending, BATCH_SIZE)) {
    try {
      const generated = await generateLocalizedContentBatch({
        userId: actorContext.appUserId,
        actorId: actorContext.actorId,
        operationId: randomUUID(),
        sourceLocaleHint: locale,
        items: batch.map((row) => ({
          key: row.id,
          fields: fieldsFor(row),
        })),
      });

      await Promise.all(
        batch.map(async (row) => {
          const envelope = generated.envelopes.get(row.id);
          if (!envelope) {
            warnings.push(`MISSING_LOCALIZATION_RESULT:${row.id}`);
            return;
          }

          const detectedSourceLocale = envelope.detectedSourceLocale as ArctorContentLocale;
          const protectedSourceEnvelope = {
            ...envelope,
            humanLocales: Array.from(
              new Set<ArctorContentLocale>([
                ...envelope.humanLocales,
                detectedSourceLocale,
              ]),
            ),
            lastEditedLocale: detectedSourceLocale,
          };
          const metadata = isRecord(row.metadata_json) ? row.metadata_json : {};
          const { error: updateError } = await supabase
            .from("value_objects")
            .update({
              metadata_json: {
                ...metadata,
                localizedContent: protectedSourceEnvelope,
                contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
              },
            })
            .eq("id", row.id)
            .eq("owner_user_id", actorContext.appUserId)
            .eq("owner_actor_id", actorContext.actorId);

          if (updateError) {
            warnings.push(`LOCALIZATION_WRITE_FAILED:${row.id}:${updateError.message}`);
            return;
          }

          localized += 1;
        }),
      );
    } catch (batchError) {
      warnings.push(
        batchError instanceof Error
          ? batchError.message
          : "CONTENT_LOCALIZATION_BACKFILL_FAILED",
      );
    }
  }

  return NextResponse.json({
    ok: true,
    localized,
    pending: pending.length,
    locale,
    warnings,
  });
}
