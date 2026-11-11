'use client';

import { useState } from 'react';

type Item = {
  ancestorValueObjectId: string;
  ancestorTitle: string;
  depth: number;
  epistemicKind: 'DIRECT' | 'DERIVED';
  ruleId: string;
  ruleVersion: string;
  supportEdges: { childId: string; parentId: string }[];
};
type Response = {
  ok: boolean;
  error?: string;
  scope?: string;
  items?: Item[];
  pathComplete?: boolean;
  stopReason?: string;
  ruleStatus?: string;
};

export default function GraphAncestryPilotPage() {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Response | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  async function inspect() {
    setBusy(true); setResult(null); setHttpStatus(null);
    try {
      const response = await fetch(`/api/value-objects/${encodeURIComponent(id.trim())}/graph-ancestry-pilot`,
        { cache: 'no-store', credentials: 'same-origin' });
      setHttpStatus(response.status);
      setResult(await response.json() as Response);
    } catch {
      setResult({ ok: false, error: 'NETWORK_OR_RESPONSE_ERROR' });
    } finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 800, margin: '3rem auto', padding: '1rem', fontFamily: 'system-ui' }}>
    <h1>ARCTor — пилот наследования иерархии</h1>
    <p>Локальная проверка только по существующим ОН. Два уровня вверх по parent_value_object_id.
      Прямые и производные связи показаны раздельно; существующие данные не изменяются.</p>
    <label htmlFor="objectId">UUID объекта наблюдения</label>
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input id="objectId" value={id} onChange={(e) => setId(e.target.value)}
        placeholder="UUID ОН" style={{ flex: 1, padding: 10 }} />
      <button onClick={inspect} disabled={busy || !id.trim()} style={{ padding: 10 }}>
        {busy ? 'Проверка...' : 'Показать наследование'}
      </button>
    </div>
    {httpStatus !== null && <p>HTTP: {httpStatus}</p>}
    {result && !result.ok && <p role="alert">Ошибка: {result.error}</p>}
    {result?.ok && <section>
      <p>Область: {result.scope} · Правило: {result.ruleStatus} · Путь: {result.stopReason}</p>
      {result.items?.length === 0 && <p>Доступные предки не обнаружены. Это не означает доказанного отсутствия связей.</p>}
      {result.items?.map((item) => <article key={`${item.depth}:${item.ancestorValueObjectId}`}
        style={{ border: '1px solid #888', borderRadius: 6, padding: 12, marginTop: 10 }}>
        <strong>{item.depth === 1 ? 'ПРЯМАЯ РОДИТЕЛЬСКАЯ СВЯЗЬ' : 'ПРОИЗВОДНЫЙ ВЫВОД'}</strong>
        <p>{item.ancestorTitle} — {item.ancestorValueObjectId}</p>
        <small>Правило: {item.ruleId} v{item.ruleVersion}; оснований: {item.supportEdges.length}</small>
        <details><summary>Цепочка подтверждающих рёбер</summary><pre>
          {item.supportEdges.map(e => `${e.childId} → ${e.parentId}`).join('\n')}
        </pre></details>
      </article>)}
      <p>Полный путь: {result.pathComplete ? 'да' : 'нет / достигнут предел или родитель недоступен'}</p>
      <p><small>Валидность применения правила — не научная достоверность знания.
        SEC-06 и проверки межакторной безопасности остаются открытыми.</small></p>
    </section>}
  </main>;
}
