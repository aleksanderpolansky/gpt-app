'use client';

import { useMemo,useState } from 'react';
import { cleanSummary } from '@/lib/ai-channels/contracts';
import type { LocaleCode } from '@/i18n';

type FeedItem={
 id:string;content_text:string;canonical_url:string;source_published_at:string|null;activated_at:string;
 author_display_name_snapshot:string|null;metadata_json:Record<string,unknown>;channelId:string;channelName:string;canManage:boolean;feedPreviewCount:number;
};
const INTL:Record<LocaleCode,string>={en:'en-GB',pl:'pl-PL',ru:'ru-RU',uk:'uk-UA',de:'de-DE',es:'es-ES',cs:'cs-CZ'};
const WORDS:Record<LocaleCode,{more:(n:number)=>string;less:string;source:string;checked:string;unknown:string;hide:string;hiding:string;ai:string}>={
 en:{more:n=>`Show ${n} more`,less:'Show less',source:'Source',checked:'Last check',unknown:'publication date not confirmed',hide:'Hide',hiding:'Hiding…',ai:'AI summary'},
 pl:{more:n=>`Pokaż jeszcze ${n}`,less:'Pokaż mniej',source:'Źródło',checked:'Ostatnia kontrola',unknown:'data publikacji niepotwierdzona',hide:'Ukryj',hiding:'Ukrywanie…',ai:'Podsumowanie AI'},
 ru:{more:n=>`Показать ещё ${n}`,less:'Свернуть',source:'Источник',checked:'Последняя проверка',unknown:'дата публикации не подтверждена',hide:'Скрыть',hiding:'Скрываю…',ai:'ИИ-пересказ'},
 uk:{more:n=>`Показати ще ${n}`,less:'Згорнути',source:'Джерело',checked:'Остання перевірка',unknown:'дату публікації не підтверджено',hide:'Сховати',hiding:'Приховую…',ai:'Підсумок ШІ'},
 de:{more:n=>`${n} weitere anzeigen`,less:'Weniger anzeigen',source:'Quelle',checked:'Letzte Prüfung',unknown:'Veröffentlichungsdatum nicht bestätigt',hide:'Ausblenden',hiding:'Wird ausgeblendet…',ai:'KI-Zusammenfassung'},
 es:{more:n=>`Mostrar ${n} más`,less:'Mostrar menos',source:'Fuente',checked:'Última comprobación',unknown:'fecha de publicación no confirmada',hide:'Ocultar',hiding:'Ocultando…',ai:'Resumen de IA'},
 cs:{more:n=>`Zobrazit dalších ${n}`,less:'Zobrazit méně',source:'Zdroj',checked:'Poslední kontrola',unknown:'datum publikace nepotvrzeno',hide:'Skrýt',hiding:'Skrývám…',ai:'Souhrn AI'},
};
function fmt(value:string,locale:LocaleCode){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat(INTL[locale],{dateStyle:'medium',timeStyle:'short'}).format(d);}
function host(url:string){try{return new URL(url).hostname;}catch{return url;}}

export default function AiChannelFeedGroup({items:initialItems,locale}:{items:FeedItem[];locale:LocaleCode}){
 const [items,setItems]=useState(initialItems),[expanded,setExpanded]=useState(false),[busyId,setBusyId]=useState<string|null>(null),[error,setError]=useState('');
 const w=WORDS[locale],preview=Math.max(1,Math.min(5,items[0]?.feedPreviewCount??1));
 const visible=useMemo(()=>expanded?items:items.slice(0,preview),[expanded,items,preview]);
 const remaining=Math.max(0,items.length-visible.length);
 if(!items.length)return null;
 async function hide(item:FeedItem){if(!item.canManage||busyId)return;setBusyId(item.id);setError('');try{
  const r=await fetch('/api/ai-channels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'item_visibility',id:item.channelId,messageObjectId:item.id,hidden:true})});
  const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.error??`HTTP_${r.status}`);setItems(current=>current.filter(x=>x.id!==item.id));
 }catch(e){setError(e instanceof Error?e.message:'CHANNEL_ITEM_VISIBILITY_FAILED');}finally{setBusyId(null);}}
 return <article className="rounded-2xl border border-[#e4e8f2] bg-white p-4 sm:p-5" data-ai-channel-id={items[0].channelId}>
  <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-600">{items[0].channelName}</div><div className="text-[10px] text-slate-400">{w.ai} · {items.length}</div></div></div>
  <div className="space-y-3">{visible.map((item,index)=><div key={item.id} data-feed-message-object-id={item.id} className={index?'border-t border-slate-100 pt-3':''}>
   <div className="flex items-start justify-between gap-3"><p className="min-w-0 flex-1 text-sm leading-6 text-slate-800">{cleanSummary(item.content_text)}{' '}<a className="text-blue-700 underline" href={item.canonical_url} target="_blank" rel="noopener noreferrer">{w.source}: {item.author_display_name_snapshot??host(item.canonical_url)}</a></p>
   {item.canManage?<button type="button" disabled={Boolean(busyId)} onClick={()=>void hide(item)} className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">{busyId===item.id?w.hiding:w.hide}</button>:null}</div>
   <p className="mt-2 text-xs text-slate-500">{w.checked}: {fmt(String(item.metadata_json.checked_at??item.activated_at),locale)} · {item.source_published_at?fmt(item.source_published_at,locale):w.unknown}</p>
  </div>)}</div>
  {items.length>preview?<button type="button" onClick={()=>setExpanded(x=>!x)} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-slate-50">{expanded?w.less:w.more(remaining)}</button>:null}
  {error?<p className="mt-2 text-xs text-red-700">{error}</p>:null}
 </article>;
}
