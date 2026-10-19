import { type DisplayCurrencyV1, type MeasurementSystemV1, isDisplayCurrencyV1 } from './readerFormatV1';

export type DisplayRateSourceV1 = {code:DisplayCurrencyV1;referenceDate:string;source:string;fallback:boolean};
export type DisplayFxSnapshotV1 = {
  ratesPerEur:Partial<Record<DisplayCurrencyV1,number>>;
  sources:DisplayRateSourceV1[];
};
export type DisplayTextPartV1 = {original:string;annotation:string|null;tooltip:string|null};

const CURRENCY_TOKEN = 'EUR|PLN|UAH|USD|GBP|CZK|€|£|₴|zł|Kč|euro|euros|евро|євро|грн|гривень|гривні|гривен|złoty|złotych';
const UNIT_TOKEN = 'кг|kg|kilograms?|кілограм(?:и|ів)?|килограмм(?:а|ов)?|г|гр|grams?|g|км|km|kilomet(?:er|re)s?|м|meters?|metres?|cm|см|mm|мм|l|л|lit(?:er|re)s?|ml|мл|lb|lbs|фунт(?:а|ов)?|oz|ounces?|mi|miles?|in|inches|°C|°F';
const AMOUNT = '\\d{1,7}(?:[.,]\\d{1,2})?';
const currencyAfter = new RegExp(`(?<![\\p{L}\\p{N}])(${AMOUNT})\\s*(${CURRENCY_TOKEN})(?![\\p{L}\\p{N}])`,'giu');
const currencyBefore = new RegExp(`(?<![\\p{L}\\p{N}])(€|£|₴)\\s*(${AMOUNT})(?![\\p{L}\\p{N}])`,'giu');
const quantityAfter = new RegExp(`(?<![\\p{L}\\p{N}])(${AMOUNT})\\s*(${UNIT_TOKEN})(?![\\p{L}\\p{N}])`,'giu');

const CURRENCY_ALIASES:Record<string,DisplayCurrencyV1> = {
  'eur':'EUR','euro':'EUR','euros':'EUR','евро':'EUR','євро':'EUR','€':'EUR',
  'pln':'PLN','zł':'PLN','złoty':'PLN','złotych':'PLN','uah':'UAH','₴':'UAH','грн':'UAH','гривень':'UAH','гривні':'UAH','гривен':'UAH','usd':'USD',
  'gbp':'GBP','£':'GBP','czk':'CZK','kč':'CZK',
};
const CURRENCY_SYMBOLS:Record<DisplayCurrencyV1,string> = {
  EUR:'€',PLN:'zł',UAH:'₴',USD:'$',GBP:'£',CZK:'Kč',
};
const REGION_NUMBER_FORMAT:Record<DisplayCurrencyV1,string> = {
  EUR:'de-DE',PLN:'pl-PL',UAH:'uk-UA',USD:'en-US',GBP:'en-GB',CZK:'cs-CZ',
};
function amount(text:string):number|null {
  // If an input has 3 decimals, allow only for physical quantities.
  if(!/^\d{1,7}(?:[.,]\d{1,3})?$/.test(text))return null;
  const result=Number(text.replace(',','.'));
  return Number.isFinite(result)&&result>=0&&result<=10000000?result:null;
}
function formattedNumber(value:number,digits:number,locale='en-US'):string {
  return new Intl.NumberFormat(locale,{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(value);
}
function formatCurrency(value:number,currency:DisplayCurrencyV1):string {
  if(!Number.isFinite(value))return '';
  return `${formattedNumber(value,2,REGION_NUMBER_FORMAT[currency])} ${CURRENCY_SYMBOLS[currency]}`;
}
function annotateMoney(valueText:string,currencyToken:string,target:DisplayCurrencyV1,fx:DisplayFxSnapshotV1|null):{text:string;tooltip:string}|null {
  const value=amount(valueText);
  const source=CURRENCY_ALIASES[currencyToken.toLowerCase()];
  if(value===null || !source || source===target || !fx || !isDisplayCurrencyV1(target))return null;
  const from=fx.ratesPerEur[source],to=fx.ratesPerEur[target];
  if(!from||!to||!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<=0)return null;
  const converted=value*(to/from);
  if(!Number.isFinite(converted)||converted>1e12)return null;
  const refs=fx.sources.filter(s=>s.code===source||s.code===target);
  if(source!=='EUR' && !refs.some(s=>s.code===source)) return null;
  if(target!=='EUR' && !refs.some(s=>s.code===target)) return null;
  const text=`≈ ${formatCurrency(converted,target)}`;
  const tooltip=refs.map(s=>`${s.code}: ${s.source}, ${s.referenceDate}${s.fallback?' (cached)':''}`).join('; ');
  return {text,tooltip:tooltip||'Reference currency rate'};
}

type UnitDefinition = {kind:'mass'|'distance'|'volume'|'temperature';baseFactor:number;metric:boolean};
const unitDefs:Record<string,UnitDefinition>={
  kg:{kind:'mass',baseFactor:1,metric:true},кг:{kind:'mass',baseFactor:1,metric:true},kilogram:{kind:'mass',baseFactor:1,metric:true},kilograms:{kind:'mass',baseFactor:1,metric:true},
  g:{kind:'mass',baseFactor:.001,metric:true},г:{kind:'mass',baseFactor:.001,metric:true},гр:{kind:'mass',baseFactor:.001,metric:true},gram:{kind:'mass',baseFactor:.001,metric:true},grams:{kind:'mass',baseFactor:.001,metric:true},
  lb:{kind:'mass',baseFactor:.45359237,metric:false},lbs:{kind:'mass',baseFactor:.45359237,metric:false},фунт:{kind:'mass',baseFactor:.45359237,metric:false},фунта:{kind:'mass',baseFactor:.45359237,metric:false},фунтов:{kind:'mass',baseFactor:.45359237,metric:false},
  oz:{kind:'mass',baseFactor:.028349523125,metric:false},ounce:{kind:'mass',baseFactor:.028349523125,metric:false},ounces:{kind:'mass',baseFactor:.028349523125,metric:false},
  km:{kind:'distance',baseFactor:1000,metric:true},км:{kind:'distance',baseFactor:1000,metric:true},kilometer:{kind:'distance',baseFactor:1000,metric:true},kilometers:{kind:'distance',baseFactor:1000,metric:true},kilometre:{kind:'distance',baseFactor:1000,metric:true},kilometres:{kind:'distance',baseFactor:1000,metric:true},
  m:{kind:'distance',baseFactor:1,metric:true},м:{kind:'distance',baseFactor:1,metric:true},meter:{kind:'distance',baseFactor:1,metric:true},meters:{kind:'distance',baseFactor:1,metric:true},metre:{kind:'distance',baseFactor:1,metric:true},metres:{kind:'distance',baseFactor:1,metric:true},
  cm:{kind:'distance',baseFactor:.01,metric:true},см:{kind:'distance',baseFactor:.01,metric:true},mm:{kind:'distance',baseFactor:.001,metric:true},мм:{kind:'distance',baseFactor:.001,metric:true},
  mi:{kind:'distance',baseFactor:1609.344,metric:false},mile:{kind:'distance',baseFactor:1609.344,metric:false},miles:{kind:'distance',baseFactor:1609.344,metric:false},
  in:{kind:'distance',baseFactor:.0254,metric:false},inch:{kind:'distance',baseFactor:.0254,metric:false},inches:{kind:'distance',baseFactor:.0254,metric:false},
  l:{kind:'volume',baseFactor:1,metric:true},л:{kind:'volume',baseFactor:1,metric:true},liter:{kind:'volume',baseFactor:1,metric:true},liters:{kind:'volume',baseFactor:1,metric:true},litre:{kind:'volume',baseFactor:1,metric:true},litres:{kind:'volume',baseFactor:1,metric:true},
  ml:{kind:'volume',baseFactor:.001,metric:true},мл:{kind:'volume',baseFactor:.001,metric:true},
  '°c':{kind:'temperature',baseFactor:1,metric:true},'°f':{kind:'temperature',baseFactor:1,metric:false},
};
function annotateUnit(valueText:string,unitToken:string,system:MeasurementSystemV1,locale:string):string|null {
  const value=amount(valueText),unit=unitDefs[unitToken.toLowerCase()];
  if(value===null||!unit)return null;
  if((system==='metric')===unit.metric)return null;
  if(unit.kind==='temperature') {
    return system==='metric'?`${formattedNumber((value-32)*5/9,1,locale)} °C`:`${formattedNumber(value*9/5+32,1,locale)} °F`;
  }
  const base=value*unit.baseFactor;
  let targetUnit:string, targetFactor:number, digits=2;
  if(system==='metric') {
    if(unit.kind==='mass') {targetUnit='kg';targetFactor=1;}
    else if(unit.kind==='distance') {targetUnit='km';targetFactor=1000;}
    else {targetUnit='L';targetFactor=1;}
  } else {
    if(unit.kind==='mass') {targetUnit='lb';targetFactor=.45359237;}
    else if(unit.kind==='distance') {targetUnit='mi';targetFactor=1609.344;}
    else {targetUnit=system==='uk'?'UK gal':'US gal';targetFactor=system==='uk'?4.54609:3.785411784;}
  }
  if(unit.kind==='distance' && system!=='metric' && base<200) {targetUnit='in';targetFactor=.0254;}
  if(unit.kind==='mass' && system!=='metric' && base<.45) {targetUnit='oz';targetFactor=.028349523125;}
  if(unit.kind==='distance' && system==='metric' && base<1000) {targetUnit='m';targetFactor=1;}
  if(unit.kind==='mass' && system==='metric' && base<1) {targetUnit='g';targetFactor=.001;}
  if(unit.kind==='volume' && system==='metric' && base<1) {targetUnit='ml';targetFactor=.001;}
  const output=base/targetFactor;
  if(!Number.isFinite(output)||output>1e12)return null;
  if(output>=1000)digits=0;
  return `${formattedNumber(output,digits,locale)} ${targetUnit}`;
}

type FoundMatch = {index:number;end:number;original:string;annotation:string;tooltip:string|null;priority:number};
/** Strict textual decorations. Ambiguous notation, unsupported units or stale FX are left unchanged. */
export function annotateDisplayValuesV1(text:string,currency:DisplayCurrencyV1,units:MeasurementSystemV1,fx:DisplayFxSnapshotV1|null,locale='en-US'):DisplayTextPartV1[] {
  if(!text)return [];
  // Bound work even for user-generated long posts; remainder is always preserved.
  const scan=text.slice(0,8000);
  const found:FoundMatch[]=[];
  const add=(m:RegExpExecArray,r:{text:string;tooltip:string|null}|null,priority:number)=>{
    if(!r)return;found.push({index:m.index,end:m.index+m[0].length,original:m[0],annotation:r.text,tooltip:r.tooltip,priority});
  };
  for(const regex of [currencyAfter,currencyBefore,quantityAfter]) {
    regex.lastIndex=0;
    let m:RegExpExecArray|null;
    let steps=0;
    while((m=regex.exec(scan))!==null && steps++<100) {
      // Do not interpret the tail of a negative or thousands-formatted number as a new value.
      if(m.index>0 && /[\d.,-]/.test(scan[m.index-1]))continue;
      if(regex===currencyAfter) {
        const r=annotateMoney(m[1],m[2],currency,fx);
        add(m,r?{text:r.text,tooltip:r.tooltip}:null,2);
      } else if(regex===currencyBefore) {
        const r=annotateMoney(m[2],m[1],currency,fx);
        add(m,r?{text:r.text,tooltip:r.tooltip}:null,2);
      } else {
        const r=annotateUnit(m[1],m[2],units,locale);
        add(m,r?{text:`≈ ${r}`,tooltip:null}:null,1);
      }
    }
  }
  found.sort((a,b)=>a.index-b.index||b.priority-a.priority||b.end-a.end);
  const parts:DisplayTextPartV1[]=[];
  let pos=0, decorations=0;
  for(const m of found) {
    if(m.index<pos||decorations>=20)continue;
    if(m.index>pos)parts.push({original:text.slice(pos,m.index),annotation:null,tooltip:null});
    parts.push({original:m.original,annotation:m.annotation,tooltip:m.tooltip});
    pos=m.end;decorations++;
  }
  if(pos<text.length)parts.push({original:text.slice(pos),annotation:null,tooltip:null});
  return parts;
}
