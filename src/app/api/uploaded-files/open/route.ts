import crypto from "node:crypto";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readImageEvidence(value: unknown) {
  const record = asRecord(value);
  const storagePath = text(record.storagePath);
  const mimeType = text(record.mimeType);
  const originalName = text(record.originalName);
  const sha256 = text(record.sha256).toLowerCase();
  if (
    record.kind !== "image" ||
    record.storageBucket !== ACTIVITY_EVIDENCE_BUCKET ||
    !storagePath ||
    !mimeType.startsWith("image/") ||
    !originalName ||
    !/^[0-9a-f]{64}$/.test(sha256)
  ) {
    return null;
  }
  return { storagePath, mimeType, originalName, sha256 };
}

function contentDispositionFilename(value: string) {
  const cleaned = value.replace(/[\r\n]/g, " ").trim().slice(0, 180) || "image";
  const asciiFallback = cleaned
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_") || "image";
  return {
    asciiFallback,
    encodedUtf8: encodeURIComponent(cleaned).replace(/['()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    ),
  };
}

export async function GET(request: Request) {
  const { appUser, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser) return new Response("USER_CONTEXT_NOT_FOUND", { status: 500 });

  const url = new URL(request.url);
  const signalId = url.searchParams.get("signalId")?.trim() ?? "";
  const forceDownload = url.searchParams.get("download") === "1";

  if (!UUID_RE.test(signalId)) {
    return new Response("INVALID_SIGNAL_ID", { status: 400 });
  }

  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("metadata_json,raw_payload")
    .eq("id", signalId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (error) return new Response("FILE_REFERENCE_READ_FAILED", { status: 500 });
  if (!data) return new Response("FILE_NOT_FOUND", { status: 404 });

  const row = data as Row;
  const evidence =
    readImageEvidence(asRecord(row.metadata_json).imageEvidence) ??
    readImageEvidence(asRecord(row.raw_payload).imageEvidence);

  if (!evidence) return new Response("FILE_REFERENCE_INVALID", { status: 404 });

  // V5 writes private activity evidence under <userId>/<signalId>/<uuid>.<ext>.
  // Never accept an arbitrary path from the request.
  const expectedPrefix = `${appUser.id}/${signalId}/`;
  if (!evidence.storagePath.startsWith(expectedPrefix)) {
    return new Response("FILE_REFERENCE_OWNERSHIP_MISMATCH", { status: 403 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(ACTIVITY_EVIDENCE_BUCKET)
    .download(evidence.storagePath);

  if (downloadError || !blob) {
    return new Response("FILE_STORAGE_READ_FAILED", { status: 404 });
  }

  const bytes = Buffer.from(await blob.arrayBuffer());
  const actualSha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha !== evidence.sha256) {
    return new Response("FILE_INTEGRITY_CHECK_FAILED", { status: 409 });
  }

  const disposition = forceDownload ? "attachment" : "inline";
  const filename = contentDispositionFilename(evidence.originalName);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${disposition}; filename="${filename.asciiFallback}"; filename*=UTF-8''${filename.encodedUtf8}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data: blob:; sandbox",
    },
  });
}
