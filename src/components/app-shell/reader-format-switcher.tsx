'use client';

import {useEffect,useRef,useState} from 'react';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import {getLocaleSearchParam,type LocaleCode} from '@/i18n';
import {useReaderFormatV1} from './reader-format-provider';
import {DISPLAY_CURRENCIES_V1,type DisplayCurrencyV1,type MeasurementSystemV1} from '@/lib/reader-format/readerFormatV1';

const COPY:Record<LocaleCode,{title:string;currency:string;units:string;metric:string;us:string;uk:string;note:string}>={
 en:{title:'Display values',currency:'Currency',units:'Units',metric:'Metric',us:'US customary',uk:'UK imperial',note:'Original values are preserved.'},
 ru:{title:'Валюта и единицы',currency:'Валюта',units:'Единицы',metric:'Метрическая',us:'Американская',uk:'Британская',note:'Исходные значения сохраняются.'},
 uk:{title:'Валюта та одиниці',currency:'Валюта',units:'Одиниці',metric:'Метрична',us:'Американська',uk:'Британська',note:'Початкові значення зберігаються.'},
 pl:{title:'Waluta i jednostki',currency:'Waluta',units:'Jednostki',metric:'Metryczne',us:'Amerykańskie',uk:'Brytyjskie',note:'Oryginalne wartości zostają.'},
 es:{title:'Moneda y unidades',currency:'Moneda',units:'Unidades',metric:'Métrico',us:'Estadounidense',uk:'Británico',note:'Se conservan los valores originales.'},
 de:{title:'Währung und Einheiten',currency:'Währung',units:'Einheiten',metric:'Metrisch',us:'US-Maße',uk:'Britisch',note:'Originalwerte bleiben erhalten.'},
 cs:{title:'Měna a jednotky',currency:'Měna',units:'Jednotky',metric:'Metrická',us:'Americká',uk:'Britská',note:'Původní hodnoty zůstávají.'},
};
export function ReaderFormatSwitcher(){
 const {prefs,setPrefs,fxStatus}=useReaderFormatV1();
 const [isOpen,setIsOpen]=useState(false),[locale,setLocale]=useState<LocaleCode>('en');
 const root=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const sync=()=>setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
  const outside=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setIsOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setIsOpen(false);};
  sync();window.addEventListener('popstate',sync);document.addEventListener('mousedown',outside);window.addEventListener('keydown',escape);
  return()=>{window.removeEventListener('popstate',sync);document.removeEventListener('mousedown',outside);window.removeEventListener('keydown',escape);};
 },[]);
 const copy=COPY[locale];
 const unitLabel=prefs.units==='metric'?'kg':prefs.units==='us'?'lb':'UK';
 return <div ref={root} className="relative">
  <button type="button" aria-label={copy.title} aria-haspopup="dialog" aria-expanded={isOpen} title={copy.title}
    onClick={()=>setIsOpen(v=>!v)}
    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e4e7f2] bg-white px-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm hover:bg-[#f8f9fd]">
    <SlidersHorizontal size={14} className="text-[#7c8099]"/>
    <span className="hidden sm:inline">{prefs.currency} · {unitLabel}</span><ChevronDown size={12}/>
  </button>
  {isOpen?<div role="dialog" aria-label={copy.title} className="absolute right-0 z-50 mt-2 w-[250px] rounded-xl border border-[#e4e7f2] bg-white p-3 shadow-lg">
    <strong className="mb-2 block text-xs text-[#30354d]">{copy.title}</strong>
    <label className="mb-2 block text-xs text-[#555b73]">{copy.currency}
      <select aria-label={copy.currency} value={prefs.currency} onChange={e=>setPrefs({...prefs,currency:e.target.value as DisplayCurrencyV1})}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
        {DISPLAY_CURRENCIES_V1.map(currency=><option key={currency} value={currency}>{currency}</option>)}
      </select>
    </label>
    <label className="block text-xs text-[#555b73]">{copy.units}
      <select aria-label={copy.units} value={prefs.units} onChange={e=>setPrefs({...prefs,units:e.target.value as MeasurementSystemV1})}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
        <option value="metric">{copy.metric} (kg, km, L)</option>
        <option value="us">{copy.us} (lb, mi, US gal)</option>
        <option value="uk">{copy.uk} (lb, mi, UK gal)</option>
      </select>
    </label>
    <p className="mt-2 text-[11px] leading-4 text-[#7c8099]">{copy.note}{fxStatus==='unavailable'?' · FX unavailable':''}</p>
  </div>:null}
 </div>;
}
