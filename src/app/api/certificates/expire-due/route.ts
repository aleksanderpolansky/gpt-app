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

function isAuthorizedCronRequest(request: Request) {
  const certificateCronSecret = process.env.CERTIFICATE_CRON_SECRET;
  const vercelCronSecret = process.env.CRON_SECRET;

  const requestCronSecret = request.headers.get("x-cron-secret");
  const authorizationHeader = request.headers.get("authorization");

  if (certificateCronSecret && requestCronSecret === certificateCronSecret) {
    return true;
  }

  if (
    vercelCronSecret &&
    authorizationHeader === `Bearer ${vercelCronSecret}`
  ) {
    return true;
  }

  if (
    certificateCronSecret &&
    authorizationHeader === `Bearer ${certificateCronSecret}`
  ) {
    return true;
  }

  return false;
}

async function expireDueCertificates() {
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

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return expireDueCertificates();
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return expireDueCertificates();
}