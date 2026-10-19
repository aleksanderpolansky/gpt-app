import { NextResponse } from 'next/server';
import {
  ARCTOR_READER_COUNTRY_DEFAULTS_CONTRACT_V1,
  readerCountryDefaultsV1,
} from '@/lib/reader-format/readerCountryDefaultsV1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Browser-only display defaults. No IP, coordinates, cookie or account is stored. */
export async function GET(request: Request) {
  const rawCountry = request.headers.get('x-vercel-ip-country');
  const country = rawCountry && /^[a-z]{2}$/i.test(rawCountry.trim())
    ? rawCountry.trim().toUpperCase() : null;
  const defaults = readerCountryDefaultsV1(country);
  return NextResponse.json({
    ok: true,
    contract: ARCTOR_READER_COUNTRY_DEFAULTS_CONTRACT_V1,
    country,
    defaults,
    source: defaults ? 'vercel_country_ip' : 'not_available',
  }, { headers: {
    'Cache-Control': 'private, no-store, max-age=0',
    'Vary': 'X-Vercel-IP-Country',
  } });
}
