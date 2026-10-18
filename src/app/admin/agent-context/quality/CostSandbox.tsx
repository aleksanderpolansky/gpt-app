"use client";
import { useState } from "react";

type Props = { low: number; high: number };
export default function CostSandbox({ low, high }: Props) {
  const [model, setModel] = useState("");
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const [outputTokens, setOutputTokens] = useState("500");
  const [overhead, setOverhead] = useState("0");
  const parse = (x: string, max: number): number | null => {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(x.trim())) return null;
    const v = Number(x); return Number.isFinite(v) && v <= max ? v : null;
  };
  const rateIn = parse(inputRate, 10000);
  const rateOut = parse(outputRate, 10000);
  const overheadN = parse(overhead, 1000000);
  const outputN = parse(outputTokens, 1000000);
  const valid = rateIn !== null && rateOut !== null && overheadN !== null && outputN !== null;
  const lowUsd = valid ? ((low + overheadN!) * rateIn! + outputN! * rateOut!) / 1000000 : null;
  const highUsd = valid ? ((high + overheadN!) * rateIn! + outputN! * rateOut!) / 1000000 : null;
  return <div className="space-y-3">
    <p className="text-sm">Оценка только для планирования. Укажите название модели и её <b>актуальные тарифы из вашего источника</b> в USD за миллион токенов. Автоматической загрузки цен и списаний нет.</p>
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <label className="grid gap-1">Модель / тариф (справочно)<input className="rounded border p-2" maxLength={100} value={model} onChange={e=>setModel(e.target.value)} placeholder="Модель и версия тарифа" /></label>
      <label className="grid gap-1">Ввод USD / 1 млн токенов<input className="rounded border p-2" inputMode="decimal" value={inputRate} onChange={e=>setInputRate(e.target.value)} placeholder="Указать вручную" /></label>
      <label className="grid gap-1">Вывод USD / 1 млн токенов<input className="rounded border p-2" inputMode="decimal" value={outputRate} onChange={e=>setOutputRate(e.target.value)} placeholder="Указать вручную" /></label>
      <label className="grid gap-1">Ожидаемый вывод, токены<input className="rounded border p-2" inputMode="numeric" value={outputTokens} onChange={e=>setOutputTokens(e.target.value)} /></label>
      <label className="grid gap-1">Резерв под системную обвязку, токены<input className="rounded border p-2" inputMode="numeric" value={overhead} onChange={e=>setOverhead(e.target.value)} /></label>
    </div>
    {valid ? <p className="rounded border p-3 text-sm" role="status">
      Расчётный диапазон <b>${lowUsd!.toFixed(6)}–${highUsd!.toFixed(6)} USD</b> на один условный запрос
      {model.trim() ? ` (${model.trim()})` : ""}. Ввод: {low + overheadN!}–{high + overheadN!} приблизительных токенов; предполагаемый вывод: {outputN}.
    </p> : <p className="text-sm text-amber-700" role="status">Для оценки укажите оба тарифа, ожидаемый вывод и резерв. Без тарифов цена неизвестна.</p>}
    <p className="text-xs text-slate-600">Диапазон токенов взят из эвристики ADM-5B.1, а не из токенизатора конкретной модели. Не учитываются кеширование, инструменты, изображения, налоги, валюта кошелька, фактическое использование и дополнительные вызовы. Не является лимитом или разрешением на расход.</p>
  </div>;
}
