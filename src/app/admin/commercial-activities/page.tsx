"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id:string; title:string|null; input_text:string|null; created_at:string;
  commercial_processing_status:string|null; commercial_processing_error:string|null;
  activity_template_id:string|null; source_message_object_id:string|null;
};

export default function CommercialActivitiesAdminPage() {
  const [rows,setRows] = useState<Row[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r=await fetch("/api/admin/commercial-activities",{cache:"no-store"});
      const data=await r.json();
      if(!r.ok || !data.ok) throw new Error(data.error??"Доступ запрещён");
      setRows(Array.isArray(data.records)?data.records:[]);
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    return () => clearTimeout(timer);
  }, [reload]);
  async function retry(id:string){
    setBusy(id);setMessage("");
    try {
      const r=await fetch("/api/admin/commercial-activities",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({activityEventId:id})});
      const data=await r.json();
      if(!r.ok || !data.ok) throw new Error(data.error??"Повторный анализ не удался");
      setMessage(`Обработка ${id}: ${data.result?.status??"завершена"}`);
      await reload();
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}
    finally{setBusy(null);}
  }
  return <main className="mx-auto max-w-5xl p-6 space-y-5">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Неразобранные коммерческие активности</h1>
      <p className="text-sm opacity-70">После исправления типовой активности или ОН нажмите «Повторно обработать». Первоначальная публикация не дублируется.</p></header>
    <div className="flex items-center gap-3">
      <button className="rounded border px-4 py-2" onClick={()=>void reload()} disabled={loading}>Обновить</button>
      <span className="text-sm opacity-70">{loading?"Загрузка...":`${rows.length} записей`}</span>
    </div>
    {message&&<p role="status" className="rounded border px-4 py-2">{message}</p>}
    <section className="space-y-3">{rows.map(item=><article key={item.id} className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{item.commercial_processing_status}</span>
        <time className="text-xs opacity-70">{new Date(item.created_at).toLocaleString("ru-RU")}</time>
      </div>
      <p className="whitespace-pre-wrap">{item.input_text??item.title??"Без текста"}</p>
      <p className="text-sm opacity-80">{item.commercial_processing_error??"Ожидает автоматического продолжения"}</p>
      <p className="text-xs opacity-60 break-all">Событие: {item.id} | Шаблон: {item.activity_template_id??"не найден"}</p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy!==null} onClick={()=>void retry(item.id)}>
          {busy===item.id?"Повторная обработка...":"Повторно обработать"}
        </button>
        <Link href="/activity-templates?scope=system&locale=ru" className="rounded border px-4 py-2">Типовые активности</Link>
        <Link href="/value-objects?scope=system&locale=ru" className="rounded border px-4 py-2">Объекты наблюдения</Link>
      </div>
    </article>)}</section>
  </main>;
}
