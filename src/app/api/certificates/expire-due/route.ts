import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ExpiredCertificateResult = {
  certificate_id: string;
  certificate_code: string;
  status: string;
  points_status: string;
  points_charged: number;
  reserved_balance_after: number;
  spent_balance_after: number;
};

export async function POST(request: Request) {
  const cronSecret = process.env.CERTIFICATE_CRON_SECRET;
  const requestSecret = request.headers.get("x-cron-secret");

  if (cronSecret && requestSecret !== cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { data: expiredCertificates, error: expireError } = await supabase.rpc(
    "expire_due_certificates"
  );

  if (expireError) {
    return NextResponse.json(
      {
        ok: false,
        error: expireError.message,
      },
      { status: 400 }
    );
  }

  const results =
    (expiredCertificates as ExpiredCertificateResult[] | null) ?? [];

  return NextResponse.json({
    ok: true,
    expiredCount: results.length,
    expiredCertificates: results,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Certificate expiry endpoint is available. Use POST to expire due certificates.",
  });
}