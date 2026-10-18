import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { ADM5B1_CONTRACT } from "@/lib/admin-execution/contextContractV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
// This route has only GET. No agent execution, no writes, no model requests.
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, ADM5B1_CONTRACT);
  const url = new URL(request.url);
  const code = url.searchParams.get("caseCode") ?? "ADM-000001";
  const assignmentId = url.searchParams.get("assignmentId");
  const taskCode = url.searchParams.get("taskCode") ?? "commercial_fact_preflight";
  try {
    const result = await readAdminContextPreviewV1(code, assignmentId, taskCode);
    return NextResponse.json({ ok: !result.errorCode, contract: ADM5B1_CONTRACT, ...result,
      dbWritesPerformed: false, modelCallsPerformed: false, agentExecutionPermitted: false },
      { status: result.errorCode && result.errorCode !== "SELECT_ASSIGNMENT" ? 422 : 200, headers: HEADERS });
  } catch (cause) {
    console.error("ADM5B1_READ_FAILED", cause instanceof Error ? cause.name : "unknown");
    return NextResponse.json({ ok: false, contract: ADM5B1_CONTRACT,
      errorCode: "ADM5B1_READ_UNAVAILABLE", dbWritesPerformed: false,
      modelCallsPerformed: false }, { status: 503, headers: HEADERS });
  }
}
