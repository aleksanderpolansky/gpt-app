import type { DisplayCurrencyV1, MeasurementSystemV1 } from './readerFormatV1';

/** READER-PRICE-V2.1/2.2: a strict, deterministic, display-only unit-price interpreter.
 * Unknown/ambiguous money is never inferred as a fact, and original text is preserved.
 */
type PriceFx = {
  ratesPerEur: Partial<Record<DisplayCurrencyV1, number>>;
  sources: Array<{code:DisplayCurrencyV1;source:string;referenceDate:string;fallback:boolean}>;
};
export type PriceRatioDecorationV2 = {
  index:number;end:number;original:string;annotation:string|null;tooltip:string|null;
};

const PRICE=String.raw`\d{1,6}(?:[.,]\d{1,2})?`;
const QUANTITY=String.raw`\d{1,6}(?:[.,]\d{1,3})?`;
const CUR=String.raw`(?:чешских\s+крон|чеських\s+крон|korony\s+czeskiej|koron\s+czeskich|koruny\s+české|české\s+koruny|EUR|PLN|UAH|USD|GBP|CZK|€|£|₴|\$|zł|Kč|euro|euros|eura|евро|євро|грн|грив(?:на|ни|ень|нею|ні|ен)|злот(?:ый|ых|их|и)|złoty|złotych|доллар(?:а|ов|ы|у)?|долар(?:а|ів|и|у)?|dollars?|dolar(?:y|ów|a|u|ů|ov|em)?|dolár(?:e|ů|y|u)?|dólar(?:es)?|крон(?:а|ы|у)?|корун(?:а|ы)?|koron(?:a|y|u|ą|ami)?|korun(?:a|y|u|ů)?|kronen|coronas?|crowns?)`;
const MASS=String.raw`(?:кг|kg|kilograms?|kilogram(?:ów|y|u|ů|em)?|kilogramm(?:s|e)?|kilogramo(?:s)?|килограмм(?:а|ов|ы)?|кілограм(?:а|ів|и)?|г|гр|g|grams?|грамм(?:а|ов)?|грам(?:а|ів|и)?|gram(?:ów|y)?|lb|lbs|pounds?|funt(?:a|ów|y)?|libr(?:a|u|y|ou)?|pfund(?:s|e)?|фунт(?:а|ов|ы)?|фунт(?:а|ів|и)?|oz|ounces?)`;
const SEP=String.raw`(?:за|za|per|por|pro|for|\/|на)`;
const FIRST = new RegExp(String.raw`(?<![\p{L}\p{N}.,-])(${PRICE})\s*(${CUR})\s*${SEP}\s*(?:(${QUANTITY})\s*)?(${MASS})(?![\p{L}\p{N}])`, 'giu');
const SYMBOL_FIRST = new RegExp(String.raw`(?<![\p{L}\p{N}.,-])([€£₴$])\s*(${PRICE})\s*${SEP}\s*(?:(${QUANTITY})\s*)?(${MASS})(?![\p{L}\p{N}])`, 'giu');
const QUANTITY_FIRST = new RegExp(String.raw`(?<![\p{L}\p{N}.,-])(${QUANTITY})\s*(${MASS})\s*(?:за|za|for|por|pro|=)\s*(${PRICE})\s*(${CUR})(?![\p{L}\p{N}])`, 'giu');
const MONEY_CODES:Readonly<Record<string,DisplayCurrencyV1>>={
  eur:'EUR',euro:'EUR',euros:'EUR',eura:'EUR','€':'EUR',евро:'EUR',євро:'EUR',
  pln:'PLN','zł':'PLN',złoty:'PLN',złotych:'PLN',злотый:'PLN',злотых:'PLN',злотих:'PLN',злоти:'PLN',
  uah:'UAH','₴':'UAH',грн:'UAH',гривна:'UAH',гривни:'UAH',гривень:'UAH',гривнею:'UAH',гривні:'UAH',гривен:'UAH',
  usd:'USD',gbp:'GBP','£':'GBP',czk:'CZK','kč':'CZK',
};
const CURRENCY_MARK:Record<DisplayCurrencyV1,string>={EUR:'€',PLN:'zł',UAH:'₴',USD:'$',GBP:'£',CZK:'Kč'};
const KG_PER_LB=0.45359237;
const UNIT_KG:Readonly<Record<string,number>>={
  kg:1,кг:1,kilogram:1,kilograms:1,kilogramów:1,kilogramy:1,kilogramu:1,'kilogramů':1,kilogramem:1,
  kilogramm:1,kilogramms:1,kilogramme:1,kilogramo:1,kilogramos:1,
  килограмм:1,килограмма:1,килограммов:1,килограммы:1,
  кілограм:1,кілограма:1,кілограмів:1,кілограми:1,
  g:.001,г:.001,гр:.001,gram:.001,grams:.001,грамм:.001,грамма:.001,граммов:.001,грам:.001,грама:.001,грамів:.001,грами:.001,gramów:.001,gramy:.001,
  lb:KG_PER_LB,lbs:KG_PER_LB,pound:KG_PER_LB,pounds:KG_PER_LB,
  funt:KG_PER_LB,funta:KG_PER_LB,'funtów':KG_PER_LB,funty:KG_PER_LB,
  libra:KG_PER_LB,libru:KG_PER_LB,libry:KG_PER_LB,librou:KG_PER_LB,
  pfund:KG_PER_LB,pfunds:KG_PER_LB,pfunde:KG_PER_LB,
  фунт:KG_PER_LB,фунта:KG_PER_LB,фунтов:KG_PER_LB,фунты:KG_PER_LB,фунтів:KG_PER_LB,фунти:KG_PER_LB,
  oz:.028349523125,ounce:.028349523125,ounces:.028349523125,
};
function number(input:string):number|null {
  if(!/^\d{1,6}(?:[.,]\d{1,3})?$/.test(input))return null;
  const n=Number(input.replace(',','.'));
  return Number.isFinite(n)&&n>0?n:null;
}
/** Geographical context only disambiguates generic words, never overrides an explicit ISO code. */
function sourceCurrency(token:string,clause:string):DisplayCurrencyV1|null {
  const t=token.toLowerCase();
  if(/^(?:чешских\s+крон|чеських\s+крон|korony\s+czeskiej|koron\s+czeskich|koruny\s+české|české\s+koruny)$/iu.test(t))return 'CZK';
  const fixed=MONEY_CODES[t];if(fixed)return fixed;
  if(/^(?:доллар|долар|dollar|dolar|dolár|dólar|\$)/iu.test(t))
    return /(?:чикаго|сша|соединенн|америк|chicag(?:o|u|a)|usa|united states|us dollars?|usd)/iu.test(clause)?'USD':null;
  if(/^(?:крон|корун|koron|korun|kronen|corona|crown)/iu.test(t))
    return /(?:брно|чехи|чешск|праг(?:а|е|и|у|ой)?|brno|brn(?:ě|e|ie)|brünn|czech|česk|praha|prague|prahy|prag(?:a|e|i|u)?|pradze|czk)/iu.test(clause)?'CZK':null;
  return null;
}
function clauseAround(text:string,index:number,end:number):string {
  // A store address often uses 'Chicago, Jewel-Osco — price'. Keep the city only
  // when the comma is followed by a store-heading dash, not a separate offer.
  // Never treat the decimal comma inside 3,99 as a phrase separator.
  const left=text.slice(0,index);
  const hardBreak=Math.max(left.lastIndexOf(';'),left.lastIndexOf('\n'),left.lastIndexOf('，'));
  const candidate=left.slice(Math.max(0,hardBreak+1,index-160));
  const comma=candidate.lastIndexOf(',');
  let start=Math.max(0,hardBreak+1,index-160);
  if(comma>=0){
    const after=candidate.slice(comma+1);
    const before=candidate.slice(0,comma);
    const cityBefore=/(?:чикаго|chicag(?:o|u|a)|брно|brno|brn(?:ě|e|ie)|brünn|праг(?:а|е|и|у|ой)?|praha|prague|prag(?:a|e|i|u)?|pradze)/iu.test(before);
    if(!cityBefore||!/\s[—–]\s/u.test(after))start+=comma+1;
  }
  const rest=text.slice(end);
  const followingBreak=rest.search(/[;\n，]/u);
  return text.slice(start,followingBreak<0?Math.min(text.length,end+30):end+followingBreak);
}
function fxFactor(source:DisplayCurrencyV1,target:DisplayCurrencyV1,fx:PriceFx|null):{rate:number;tooltip:string}|null {
  if(source===target)return {rate:1,tooltip:'Same currency; no exchange rate used'};
  if(!fx)return null;
  const from=fx.ratesPerEur[source],to=fx.ratesPerEur[target];
  if(!from||!to||!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<=0)return null;
  const refs=fx.sources.filter(item=>item.code===source||item.code===target);
  if(source!=='EUR'&&!refs.some(item=>item.code===source))return null;
  if(target!=='EUR'&&!refs.some(item=>item.code===target))return null;
  return {rate:to/from,tooltip:refs.map(item=>`${item.code}: ${item.source}, ${item.referenceDate}${item.fallback?' (cached)':''}`).join('; ')};
}
function decoration(priceText:string,moneyText:string,qtyText:string|undefined,unitText:string,clause:string,
    target:DisplayCurrencyV1,system:MeasurementSystemV1,fx:PriceFx|null,locale:string):{annotation:string|null;tooltip:string|null} {
  const price=number(priceText),quantity=qtyText===undefined?1:number(qtyText);
  const source=sourceCurrency(moneyText,clause),kg=UNIT_KG[unitText.toLowerCase()];
  if(price===null||quantity===null||!source||!kg)return {annotation:null,tooltip:null};
  const multiplier=fxFactor(source,target,fx);
  if(!multiplier)return {annotation:null,tooltip:null};
  const targetKg=system==='metric'?1:KG_PER_LB;
  if(source===target&&Math.abs(quantity*kg-targetKg)<1e-10)return {annotation:null,tooltip:null};
  const converted=price/(quantity*kg)*targetKg*multiplier.rate;
  if(!Number.isFinite(converted)||converted>1e12)return {annotation:null,tooltip:null};
  const amount=new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(converted);
  return {annotation:`≈ ${amount} ${CURRENCY_MARK[target]}/${system==='metric'?'kg':'lb'}`,tooltip:multiplier.tooltip||null};
}
// P3.6.B1: extraction uses the SAME strict patterns as reader price annotations.
// This is unverified source-derived metadata, never a confirmed offer/fact or FX conversion.
export type PublicationPriceSourceEvidenceV1 = {
  sourceFragment: string;
  start: number;
  end: number;
  currencyCode: DisplayCurrencyV1;
  amount: number;
  quantity: number;
  sourceUnit: string;
  quantityKg: number;
  sourceCurrencyPerKg: number;
};

export function extractPublicationValueEvidenceV1(text: string): PublicationPriceSourceEvidenceV1[] {
  const scan = text.slice(0, 5000);
  const candidates: PublicationPriceSourceEvidenceV1[] = [];
  for (const [patternIndex, regex] of [FIRST, SYMBOL_FIRST, QUANTITY_FIRST].entries()) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    let steps = 0;
    while ((match = regex.exec(scan)) !== null && steps++ < 100) {
      if (match.index > 0 && /[\d.,-]/.test(scan[match.index - 1])) continue;
      const [priceToken, currencyToken, quantityToken, unitToken] =
        patternIndex === 0 ? [match[1], match[2], match[3], match[4]] :
        patternIndex === 1 ? [match[2], match[1], match[3], match[4]] :
        [match[3], match[4], match[1], match[2]];
      const amount = number(priceToken);
      const quantity = quantityToken === undefined ? 1 : number(quantityToken);
      const factorKg = UNIT_KG[unitToken.toLowerCase()];
      const context = clauseAround(scan, match.index, match.index + match[0].length);
      const currencyCode = sourceCurrency(currencyToken, context);
      if (amount === null || quantity === null || !factorKg || !currencyCode) continue;
      const kg = quantity * factorKg;
      if (!Number.isFinite(kg) || kg <= 0) continue;
      const pricePerKg = amount / kg;
      if (!Number.isFinite(pricePerKg) || pricePerKg <= 0 || pricePerKg > 1_000_000_000) continue;
      candidates.push({
        sourceFragment: match[0], start: match.index,
        end: match.index + match[0].length, currencyCode, amount, quantity,
        sourceUnit: unitToken.toLowerCase(),
        quantityKg: Number(kg.toFixed(9)),
        sourceCurrencyPerKg: Number(pricePerKg.toFixed(6)),
      });
    }
  }
  candidates.sort((a,b) => a.start - b.start || b.end - a.end);
  const result: PublicationPriceSourceEvidenceV1[] = [];
  for (const candidate of candidates) {
    if (result.some((saved) => candidate.start < saved.end && saved.start < candidate.end)) continue;
    result.push(candidate);
    if (result.length >= 24) break;
  }
  return result;
}

export function findPriceRatioAnnotationsV2(text:string,target:DisplayCurrencyV1,system:MeasurementSystemV1,fx:PriceFx|null,locale:string):PriceRatioDecorationV2[] {
  const scan=text.slice(0,8000),out:PriceRatioDecorationV2[]=[];
  // Do not overlap untrusted numeric fragments. Strict limited patterns are intentional.
  for(const [index,regex] of [FIRST,SYMBOL_FIRST,QUANTITY_FIRST].entries()) {
    regex.lastIndex=0;let m:RegExpExecArray|null;let steps=0;
    while((m=regex.exec(scan))!==null&&steps++<100) {
      const context=clauseAround(scan,m.index,m.index+m[0].length);
      const [price,currency,qty,unit] = index===0?[m[1],m[2],m[3],m[4]]:
        index===1?[m[2],m[1],m[3],m[4]]:[m[3],m[4],m[1],m[2]];
      const result=decoration(price,currency,qty,unit,context,target,system,fx,locale);
      out.push({index:m.index,end:m.index+m[0].length,original:m[0],...result});
    }
  }
  return out.sort((a,b)=>a.index-b.index||b.end-a.end);
}
