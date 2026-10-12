"use client";
import { useEffect, useState } from "react";

type State = {
  ok:boolean;
  error?:string;
  enabled:boolean;
  parentId:string;
  representativeLeafId:string|null;
  representativeTitle:string|null;
  firstLeafTitle:string|null;
  hasAnyActiveDirectLeaf:boolean;
};
type Props = { parentId:string; locale:string; compact?:boolean };

function TechnicalRepresentativeManagerBodyV1({parentId,locale,compact=false}:Props) {
  const [state,setState]=useState<State|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const ru=locale==="ru" || locale==="uk";
  useEffect(()=>{
    const abort=new AbortController();
    void fetch(`/api/admin/technical-representative?parentId=${encodeURIComponent(parentId)}`,{
      cache:"no-store",signal:abort.signal,
    }).then(async response=>{
      const data=(await response.json()) as State;
      if(!response.ok || !data.ok)throw new Error(data.error||"P259_LOAD_FAILED");
      if(!abort.signal.aborted)setState(data);
    }).catch(error=>{if(!abort.signal.aborted)setError(error instanceof Error?error.message:String(error));})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[parentId]);

  async function change(enabled:boolean) {
    if(saving||loading||!state)return;
    setSaving(true);setError(null);
    try {
      const response=await fetch("/api/admin/technical-representative",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({parentId,enabled}),
      });
      const data=(await response.json()) as State;
      if(!response.ok||!data.ok)throw new Error(data.error||"P259_SAVE_FAILED");
      setState(data);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setSaving(false);}
  }

  return (
    <section className={`${compact?"rounded-xl p-3":"rounded-2xl p-4"} border border-[#d9e2f4] bg-white text-[#263044]`}>
      {!compact ? <h3 className="mb-2 text-sm font-extrabold">{ru?"Технический представитель дочерних ОН":"Direct-leaf technical representative"}</h3>:null}
      <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold">
        <input type="checkbox" className="mt-0.5 h-4 w-4" disabled={loading||saving||!state}
          checked={state?.enabled===true} onChange={event=>void change(event.target.checked)}/>
        <span>{ru?"Использовать первый созданный дочерний листовой ОН как постоянного технического представителя группы":"Use the first created direct leaf as the group's permanent technical representative"}</span>
      </label>
      <p className="mt-2 text-xs leading-5 text-[#68738a]">
        {state?.enabled && state.representativeLeafId
          ? `${ru?"Представитель":"Representative"}: ${state.representativeTitle??state.representativeLeafId}`
          : state?.enabled
            ? (ru?"Настройка включена. Представитель будет назначен при создании первого листа.":"Enabled. Waiting for the first direct leaf.")
            : (ru?"Режим выключен. Если его включить при наличии листьев, будет выбран самый ранний из них.":"Disabled. Enabling with existing leaves selects the earliest created direct leaf.")}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#8a95a8]">
        {ru?"Только один непосредственный дочерний лист. Представительство не переносит факты, адреса или связи на другие листья.":"Exactly one direct child leaf. Representation does not transfer facts or relationships."}
      </p>
      {(loading||saving)?<p className="mt-1 text-xs text-[#6379ae]">{saving?"Saving…":"Loading…"}</p>:null}
      {error?<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>:null}
    </section>
  );
}

/** A new parent remounts the fetch state; effects only update state asynchronously. */
export function TechnicalRepresentativeManagerV1(props: Props) {
  return <TechnicalRepresentativeManagerBodyV1 key={props.parentId} {...props} />;
}
