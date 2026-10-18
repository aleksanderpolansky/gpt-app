"use client";

import { useMemo, useState } from "react";
import { planAdminAiCostV1, type PlanningPrice } from "@/lib/admin-execution/budgetQuoteV1";
export type CandidateModel = {
  tierCode: string; modelName: string; displayName: string; reasoningEffort: string;
  price: PlanningPrice | null; pricingStatus: "active_snapshot" | "missing_or_invalid";
};
type Props = { candidates: CandidateModel[]; low: number; high: number; catalogVerifiedAt: string; catalogSeedExpiresAt: string };
const eur = (x:number) => x.toFixed(6)+" EUR";
function parseNumber(v:string, min:number, max:number):number | null {
  if (v.trim()==="" || !/^\d+(?:\.\d+)?$/.test(v.trim())) return null;
  const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
export default function BudgetSandbox({candidates,low,high,catalogVerifiedAt,catalogSeedExpiresAt}:Props){
  const [tier,setTier]=useState(candidates[0]?.tierCode??"");
  const [output,setOutput]=useState("500");
  const [overhead,setOverhead]=useState("100");
  const [safety,setSafety]=useState("1.25");
  const [attempts,setAttempts]=useState("1");
  const [perAttempt,setPerAttempt]=useState("");
  const [perCase,setPerCase]=useState("");
  const selected=candidates.find(c=>c.tierCode===tier);
  const result=useMemo(()=>{
    if(!selected?.price) return {error:"Для модели отсутствует подходящий действующий тариф в AI Billing."};
    const values=[parseNumber(output,1,1000000),parseNumber(overhead,0,100000),parseNumber(safety,1,3),parseNumber(attempts,1,20)];
    const cap1=perAttempt.trim()===""?null:parseNumber(perAttempt,0.000001,1000000);
    const cap2=perCase.trim()===""?null:parseNumber(perCase,0.000001,1000000);
    if(values.some(x=>x===null)||(perAttempt.trim()!==""&&cap1===null)||(perCase.trim()!==""&&cap2===null))
      return {error:"Проверьте числовые поля и лимиты. Точка используется как десятичный разделитель."};
    try {
      return {quote:planAdminAiCostV1(selected.price,{
        inputMin:low,inputMax:high,systemOverhead:values[1]!,expectedOutput:values[0]!,safetyMultiplier:values[2]!,maxAttempts:values[3]!,
        capPerAttemptEur:cap1,capPerCaseEur:cap2,
      })};
    }catch {return {error:"Недопустимые значения тарифа или параметров расчёта."};}
  },[selected,low,high,output,overhead,safety,attempts,perAttempt,perCase]);
  const field=(label:string,value:string,onChange:(s:string)=>void)=>
    <label className="grid gap-1 text-sm">{label}<input className="rounded border p-2" type="text" inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)}/></label>;
  return <div className="space-y-4 text-sm">
    <p className="text-amber-800">Каталог проверялся: {catalogVerifiedAt}; срок автоматического использования: {catalogSeedExpiresAt}. Устаревание каталога не устраняется наличием цены в БД. Перед реальным использованием потребуется повторная проверка модели и тарифа.</p>
    <label className="grid gap-1">Кандидат из существующего каталога (не разрешение на исполнение)
      <select value={tier} onChange={e=>setTier(e.target.value)} className="rounded border p-2">
        {candidates.map(m=><option key={m.tierCode} value={m.tierCode}>{m.displayName} ({m.tierCode}) — {m.pricingStatus==="active_snapshot"?"ценовой снимок найден":"цена недоступна"}</option>)}
      </select>
    </label>
    {selected && <div className="rounded border p-3 space-y-1">
      <p>Модель: <b>{selected.modelName}</b>. Рассуждение в каталоге: {selected.reasoningEffort}.</p>
      {selected.price ? <><p>Активный ценовой снимок AI Billing: <code>{selected.price.id}</code>.</p>
      <p>Тариф: ввод {selected.price.inputCostPer1mTokens}, вывод {selected.price.outputCostPer1mTokens} / 1 млн токенов ({selected.price.pricingCurrency}); USD→EUR: {selected.price.usdToEurRate??"—"}; множитель: {selected.price.eurMarkupMultiplier}.</p></>:
      <p className="text-amber-800">Нет проверенной записи цены; расчет недоступен. Никаких автоматически подставленных тарифов.</p>}
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {field("Ожидаемые токены вывода",output,setOutput)}
      {field("Резерв на обвязку, входные токены",overhead,setOverhead)}
      {field("Запас на неопределённость (1–3)",safety,setSafety)}
      {field("Максимум попыток в сценарии (1–20)",attempts,setAttempts)}
      {field("Проектный лимит одной попытки, EUR (необязательно)",perAttempt,setPerAttempt)}
      {field("Проектный лимит дела, EUR (необязательно)",perCase,setPerCase)}
    </div>
    {"error" in result && result.error && <p className="rounded border border-amber-400 p-3 text-amber-800">{result.error}</p>}
    {"quote" in result && result.quote && <div className="rounded border p-4 space-y-2">
      <p>Ввод с обвязкой: <b>{result.quote.inputTokensLow}–{result.quote.inputTokensHigh}</b> условных токенов.</p>
      <p>Оценка одного вызова: <b>{eur(result.quote.lowCostEur)}–{eur(result.quote.highCostEur)}</b>.</p>
      <p>С защитным множителем: до <b>{eur(result.quote.guardedAttemptEur)}</b> на попытку; до <b>{eur(result.quote.guardedCaseEur)}</b> на выбранное число попыток.</p>
      <p>Проектный лимит попытки: <b>{result.quote.attemptCapAssessment}</b>. Проектный лимит дела: <b>{result.quote.caseCapAssessment}</b>.</p>
      <p>Укладывается в оба введённых тестовых лимита: <b>{result.quote.provisionalBudgetFits?"да, только арифметически":"не подтверждено"}</b>.</p>
      <p className="font-semibold text-amber-800">ИТОГ: EXECUTION_FORBIDDEN. Выбор модели не утверждён, бюджет не зарезервирован, внешний API запрещён.</p>
      <p className="text-xs text-slate-600">Все расчёты локальные. Не проверяются кошелёк, пользователь-плательщик, фактические токены, кэширование, допустимость конкретной модели по taskCode или право выполнять поручение.</p>
    </div>}
  </div>;
}
