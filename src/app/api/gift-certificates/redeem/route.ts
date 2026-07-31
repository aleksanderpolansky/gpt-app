import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Static QR redemption has been replaced by live QR check-in.",
      errorCode: "PGC10D_LEGACY_REDEMPTION_DISABLED",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
