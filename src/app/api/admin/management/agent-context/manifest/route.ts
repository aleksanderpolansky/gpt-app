import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { ADM5B2_CONTRACT, buildAdminContextManifestV1 } from "@/lib/admin-execution/contextManifestV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const digestPattern = /^[0-9a-f]{64}$/i;

// Admin-only diagnostic GET. No POST, no AI API, no DB writes, no approval.
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, ADM5B2_CONTRACT);
  const url = new URL(request.url);
  const caseCode = url.searchParams.get("caseCode") ?? "";
  const assignmentId = url.searchParams.get("assignmentId");
  const taskCode = url.searchParams.get("taskCode") ?? "";
  const previousDigest = url.searchParams.get("previousDigest");
  if (!caseCode || !assignmentId || !taskCode ||
    (previousDigest !== null && !digestPattern.test(previousDigest))) {
    return NextResponse.json({ ok: false, contract: ADM5B2_CONTRACT,
      errorCode: "INVALID_OR_INCOMPLETE_PARAMETERS" }, { status: 400, headers: HEADERS });
  }
  try {
    const result = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
    if (result.errorCode || !result.preview) {
      return NextResponse.json({ ok: false, contract: ADM5B2_CONTRACT,
        errorCode: result.errorCode ?? "PREVIEW_MISSING", agentExecutionPermitted: false },
        { status: 422, headers: HEADERS });
    }
    return NextResponse.json({ ok: true, manifest: buildAdminContextManifestV1(result.preview, previousDigest),
      modelCallsPerformed: false, dbWritesPerformed: false, agentExecutionPermitted: false }, { headers: HEADERS });
  } catch (e) {
    console.error("ADM5B2_MANIFEST_READ_FAILED", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ ok: false, contract: ADM5B2_CONTRACT, errorCode: "MANIFEST_NOT_AVAILABLE" },
      { status: 503, headers: HEADERS });
  }
}
