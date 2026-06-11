import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  listServiceLogRunsFromRequest,
  toServiceLogApiErrorResponse,
} from "../../../../../lib/activity/serviceLog/readModel";

export async function GET(request: NextRequest) {
  const result = await listServiceLogRunsFromRequest(request);

  if (!result.ok) {
    return NextResponse.json(toServiceLogApiErrorResponse(result), {
      status: result.status,
    });
  }

  return NextResponse.json(result.data);
}
