import 'server-only';
import {NextResponse} from 'next/server';
import {FEED_CURRENCIES_F325} from '../../../../../lib/exchange-rates/feed-six-currency-f325';
import {getFeedFxRatesF326} from '../../../../../lib/exchange-rates/feed-six-currency-f326';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){
  try {
    const {ratesPerEur,sources,unavailableCurrencies}=await getFeedFxRatesF326(FEED_CURRENCIES_F325,'optional');
    return NextResponse.json({ok:true,contract:'ARCTOR_READER_FX_DISPLAY_V1',ratesPerEur,sources,unavailableCurrencies},{headers:{'Cache-Control':'private, max-age=600','X-Content-Type-Options':'nosniff'}});
  }catch{
    return NextResponse.json({ok:false,errorCode:'READER_FX_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
