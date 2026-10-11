"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AutoFactSetting = { enabled: boolean; revision: number; updatedAt: string | null };

type Diagnostic = {
  code:string|null; stage:string; problem:string; suggestion:string;
  severity:"waiting"|"review"|"failure";
  source:{rawSignalAvailable:boolean;basicAnalysisAvailable:boolean};
  extractedMeasurements:Array<{parameterCode:string|null;valueNumeric:number|null;valueText:string|null;unit:string|null;fragment:string|null}>;
  candidateCount:number;
  recordedFacts:Array<{valueObjectId:string|null;parameterDefinitionId:string|null;valueNumeric:number|null;valueText:string|null;unit:string;status:string}>;
  recordedFactCountWithinSample:number; factsQueryLimitReached:boolean;
  history:Array<{at:string|null;status:string|null;reason:string|null;templateId:string|null;analysisAvailable:boolean}>;
  historyNote:string;
};
type Row = {
  id:string; title:string|null; input_text:string|null; created_at:string;
  commercial_processing_status:string|null; commercial_processing_error:string|null;
  activity_template_id:string|null; source_message_object_id:string|null;
  diagnostic:Diagnostic;
};

export default function CommercialActivitiesAdminPage() {
  const [rows,setRows] = useState<Row[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const [autoFactSetting,setAutoFactSetting] = useState<AutoFactSetting|null>(null);
  const [settingError,setSettingError] = useState("");
  const [settingLoading,setSettingLoading] = useState(true);
  const [settingBusy,setSettingBusy] = useState(false);
  const loadAutoFactSetting = useCallback(async () => {
    setSettingLoading(true);
    setSettingError("");
    try {
      const response = await fetch("/api/admin/commercial-activities/settings", {cache:"no-store"});
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Ошибка чтения настройки");
      setAutoFactSetting(payload.setting as AutoFactSetting);
    } catch (error) {
      setAutoFactSetting(null);
      setSettingError(error instanceof Error ? error.message : String(error));
    } finally { setSettingLoading(false); }
  }, []);
  const changeAutoFactSetting = useCallback(async (desired: boolean) => {
    if (!autoFactSetting || settingBusy) return;
    if (desired && !window.confirm("Включить автоматическую запись коммерческих фактов? Новые и повторно обработанные публикации будут записываться без подтверждения пользователя.")) return;
    setSettingBusy(true);
    setSettingError("");
    try {
      const response = await fetch("/api/admin/commercial-activities/settings", {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({enabled:desired,expectedRevision:autoFactSetting.revision}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Не удалось изменить настройку");
      setAutoFactSetting(payload.setting as AutoFactSetting);
      setMessage(desired ? "Автоматическая запись включена" : "Автоматическая запись выключена");
    } catch (error) {
      setSettingError(error instanceof Error ? error.message : String(error));
      await loadAutoFactSetting();
    } finally { setSettingBusy(false); }
  }, [autoFactSetting,settingBusy,loadAutoFactSetting]);
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
    const timer = setTimeout(() => { void reload(); void loadAutoFactSetting(); }, 0);
    return () => clearTimeout(timer);
  }, [reload,loadAutoFactSetting]);
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
    <section aria-label="Настройка автоматической записи" className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Автоматическая запись коммерческих фактов</h2>
          <p className="text-sm opacity-75">Управление сохраняется в Supabase. Выключение блокирует новые автоматические записи на уровне базы.</p>
        </div>
        <label className="inline-flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" aria-label="Автоматическая запись коммерческих фактов"
            className="h-5 w-5 accent-blue-600"
            checked={Boolean(autoFactSetting?.enabled)}
            disabled={settingLoading || settingBusy || autoFactSetting === null}
            onChange={(event)=>void changeAutoFactSetting(event.target.checked)}/>
          {settingLoading ? "Загрузка..." : autoFactSetting === null ? "Недоступно" :
            settingBusy ? "Сохраняем..." : autoFactSetting.enabled ? "Включено" : "Выключено"}
        </label>
      </div>
      {settingError && <p role="alert" className="text-sm text-red-700">{settingError}</p>}
      {autoFactSetting && <p className="text-xs opacity-65">Версия настройки: {autoFactSetting.revision}. Последнее изменение: {autoFactSetting.updatedAt ? new Date(autoFactSetting.updatedAt).toLocaleString("ru-RU") : "не было"}.</p>}
      <button className="rounded border px-3 py-1 text-sm" disabled={settingLoading || settingBusy}
        onClick={()=>void loadAutoFactSetting()}>Обновить состояние</button>
    </section>
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
      <section aria-label="Диагностика обработки" className="rounded-lg border p-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Этап: {item.diagnostic.stage}</span>
          <span className={item.diagnostic.severity==="waiting"?"text-amber-700":item.diagnostic.severity==="failure"?"text-red-700":"text-orange-700"}>
            {item.diagnostic.severity==="waiting"?"Ожидание (не ошибка)":item.diagnostic.severity==="failure"?"Ошибка":"Нужна проверка"}
          </span>
        </div>
        <p>{item.diagnostic.problem}</p>
        <p className="opacity-80">Что проверить: {item.diagnostic.suggestion}</p>
        {item.diagnostic.code&&<p className="break-all font-mono text-xs opacity-70">Код: {item.diagnostic.code}</p>}
        {item.commercial_processing_error&&item.commercial_processing_error!==item.diagnostic.code&&<details>
          <summary className="cursor-pointer">Техническое сообщение</summary>
          <p className="mt-2 break-all font-mono text-xs">{item.commercial_processing_error}</p>
        </details>}
        <details className="rounded-md border p-2">
          <summary className="cursor-pointer font-medium">Результаты анализа и история</summary>
          <div className="mt-3 space-y-3">
            <p>Исходный сигнал: {item.diagnostic.source.rawSignalAvailable?"найден":"не найден"}; сохранённый базовый анализ: {item.diagnostic.source.basicAnalysisAvailable?"есть":"нет"}.</p>
            <p>Кандидатов типовой активности: {item.diagnostic.candidateCount}. Сохранённых фактов в выборке: {item.diagnostic.recordedFactCountWithinSample}.</p>
            {item.diagnostic.extractedMeasurements.length>0?<div className="space-y-1">
              <h3 className="font-semibold">Извлечённые значения</h3>
              {item.diagnostic.extractedMeasurements.map((m,i)=><p key={i} className="break-words">
                {m.parameterCode??"Параметр не указан"}: {m.valueNumeric??m.valueText??"значение отсутствует"} {m.unit??""}
                {m.fragment?` — «${m.fragment}»`:""}
              </p>)}
            </div>:<p className="opacity-70">Извлечённые значения в сохранённом анализе отсутствуют.</p>}
            {item.diagnostic.recordedFacts.length>0?<div className="space-y-1">
              <h3 className="font-semibold">Фактически записанные листовые ОН и параметры</h3>
              {item.diagnostic.recordedFacts.map((fact,i)=><p key={i} className="break-all text-xs">
                ОН: {fact.valueObjectId??"не определён"}; параметр: {fact.parameterDefinitionId??"не определён"}; значение: {fact.valueNumeric??fact.valueText??"—"} {fact.unit}; статус: {fact.status}
              </p>)}
            </div>:<p className="opacity-70">Подтверждённые листовые назначения в фактах отсутствуют. Кандидаты не считаются фактами.</p>}
            {item.diagnostic.factsQueryLimitReached&&<p role="note">Выборка фактов достигла ограничения 1000 строк; здесь показана диагностическая выдержка, не полная статистика.</p>}
            <h3 className="font-semibold">Предыдущие попытки ({item.diagnostic.history.length})</h3>
            {item.diagnostic.history.length>0?<ol className="list-decimal pl-5 space-y-1">
              {item.diagnostic.history.map((entry,i)=><li key={i}>
                {entry.at?new Date(entry.at).toLocaleString("ru-RU"):"Дата не сохранена"} — {entry.status??"прежний статус не сохранён"}; {entry.reason??"прежняя причина не сохранена"}
              </li>)}
            </ol>:<p className="opacity-70">История предыдущих попыток отсутствует.</p>}
            <p className="text-xs opacity-65">{item.diagnostic.historyNote}</p>
          </div>
        </details>
      </section>
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
