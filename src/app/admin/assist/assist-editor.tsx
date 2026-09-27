"use client";
import { useEffect, useState } from "react";

type Item = { locale?: string; localized?: { lastEditedLocale?: string; detectedSourceLocale?: string; variants?: Record<string, { organizationName?: string | null; description?: string | null; shortDescription?: string | null }> }; id: string; title: string | null; text: string | null; shortText?: string | null; duration?: number | null; version: string };
type Session = { sessionId: string; expiresAt: string; userName: string; profileName: string; targetUserId: string; organizations: Item[]; messages: Item[]; templates: Item[] };
type Lookup = { user: { id: string; name: string | null; email: string | null }; profiles: { actorId: string; name: string }[] };
type Kind = "organization" | "message" | "template" | "create-template";
async function api(body?: Record<string, unknown>) {
  const response = await fetch("/api/admin/assist", {
    method: body ? "POST" : "GET", cache: "no-store", credentials: "same-origin",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Ошибка запроса");
  return result;
}
function withLocale(item: Item, locale: string): Item {
  const v = item.localized?.variants?.[locale];
  return { ...item, locale, title: v?.organizationName ?? item.title, text: v?.description ?? item.text, shortText: v?.shortDescription ?? item.shortText };
}
const field = "w-full rounded border p-2 text-black bg-white";
const button = "rounded border px-4 py-2 disabled:opacity-50";
export default function AssistEditor({ initialUser }: { initialUser: string }) {
  const [user, setUser] = useState(initialUser);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [actor, setActor] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [edit, setEdit] = useState<{ kind: Kind; item: Item; sessionId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [expired, setExpired] = useState(false);
  async function run(task: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await task(); } catch (e) { setNotice(e instanceof Error ? e.message : "Ошибка"); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let cancelled = false;
    api().then((data) => { if (!cancelled && data.active) setSession(data); })
      .catch((e: Error) => { if (!cancelled) setNotice(e.message); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const check = () => setExpired(Boolean(session && Date.now() >= Date.parse(session.expiresAt)));
    check(); const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [session]);
  return <main className="mx-auto max-w-4xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Помощь пользователю</h1>
    <p>Редактор материалов выбранного профиля. Изменения сохраняются пользователю, действия администратора записываются в журнал.</p>
    {notice && <p role="status" className="rounded border p-3">{notice}</p>}
    {session && <section className="sticky top-0 z-20 space-y-2 rounded border bg-amber-100 p-4 text-black">
      <strong>Вы помогаете: {session.userName} · {session.profileName}</strong>
      <p>{expired ? "Сессия истекла. Начните новую." : `Сессия до ${new Date(session.expiresAt).toLocaleTimeString()}`}</p>
      <button className={button} disabled={busy} onClick={() => run(async () => {
        await api({ action: "stop", sessionId: session.sessionId }); setSession(null); setEdit(null); setLookup(null);
      })}>Завершить помощь</button>
    </section>}
    {(!session || expired) && <section className="space-y-3 rounded border p-4">
      <label className="block">Auth0 ID или внутренний ID пользователя
        <input className={field} value={user} onChange={e => { setUser(e.target.value); setLookup(null); setActor(""); }} />
      </label>
      <button className={button} disabled={busy || !user.trim()} onClick={() => run(async () => {
        const data: Lookup = await api({ action: "lookup", user: user.trim() });
        setLookup(data); setActor(data.profiles[0]?.actorId || "");
      })}>Найти пользователя</button>
      {lookup && <>
        <p>{lookup.user.name} · {lookup.user.email}</p>
        <label className="block">Профиль
          <select className={field} value={actor} onChange={e => setActor(e.target.value)}>
            {lookup.profiles.map(p => <option key={p.actorId} value={p.actorId}>{p.name}</option>)}
          </select>
        </label>
        {!lookup.profiles.length && <p>У пользователя нет доступного профиля.</p>}
        <button className={button} disabled={busy || !actor} onClick={() => run(async () => {
          const data = await api({ action: "start", user: lookup.user.id, actorId: actor }); setSession(data); setEdit(null);
        })}>Начать помощь на 30 минут</button>
      </>}
    </section>}
    {session && !expired && <>
      <button className={button} disabled={busy} onClick={() => run(async () => {
        setEdit(null); const data = await api(); if (!data.active) { setSession(null); return; } setSession(data);
      })}>Обновить список</button>
      {([
        ["Предприятия: название и описание", "organization", session.organizations],
        ["Черновики публикаций предприятий", "message", session.messages],
        ["Персональные типовые активности", "template", session.templates],
      ] as const).map(([title, kind, items]) => <section key={kind} className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {!items.length && <p>Нет материалов.</p>}
        {items.map(item => <button key={item.id} className={`${button} mr-2 mb-2`} disabled={busy}
          onClick={() => setEdit({ kind, item: kind === "organization" ? withLocale(item, item.localized?.lastEditedLocale || item.localized?.detectedSourceLocale || "ru") : { ...item }, sessionId: session.sessionId })}>{item.title || "Без названия"}</button>)}
      </section>)}
      <button className={button} disabled={busy} onClick={() => setEdit({ kind: "create-template", sessionId: session.sessionId,
        item: { id: "", title: "", text: "", duration: 30, version: "" } })}>Создать персональную типовую активность</button>
      <p className="text-sm">Здесь редактируются тексты и длительность. Создаваемая активность — персональный шаблон записи; параметры ОН, формулы и профили влияния настраиваются в штатном редакторе. Изменения описания уже опубликованного предприятия будут видны посетителям. Черновики публикаций остаются черновиками.</p>
      {edit && <form className="space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); void run(async () => {
        await api({ id: edit.item.id, version: edit.item.version, shortText: edit.item.shortText, duration: edit.item.duration, locale: edit.item.locale, action: edit.kind, sessionId: edit.sessionId, title: edit.item.title || "", text: edit.item.text || "" });
        setEdit(null); setNotice("Сохранено.");
        const data = await api(); if (data.active) setSession(data); else setSession(null);
      }); }}>
        {edit.kind === "organization" && <label className="block">Язык редактируемого текста
          <select className={field} value={edit.item.locale || "ru"} onChange={e => {
            const original = session.organizations.find(item => item.id === edit.item.id);
            if (original) setEdit({ ...edit, item: withLocale(original, e.target.value) });
          }}>{["ru", "pl", "en", "uk", "de", "es", "cs"].map(locale => <option key={locale}>{locale}</option>)}</select>
          <span className="text-sm">При смене языка форма загружает сохранённый текст. Сначала сохраните текущие правки.</span>
        </label>}
        <label className="block">Название<input required maxLength={300} className={field} value={edit.item.title || ""}
          onChange={e => setEdit({ ...edit, item: { ...edit.item, title: e.target.value } })} /></label>
        <label className="block">Текст<textarea maxLength={50000} rows={8} className={field} value={edit.item.text || ""}
          onChange={e => setEdit({ ...edit, item: { ...edit.item, text: e.target.value } })} /></label>
        {edit.kind === "organization" && <label className="block">Краткое описание<textarea maxLength={2000} className={field} value={edit.item.shortText || ""}
          onChange={e => setEdit({ ...edit, item: { ...edit.item, shortText: e.target.value } })} /></label>}
        {(edit.kind === "template" || edit.kind === "create-template") && <label className="block">Длительность, минуты<input type="number" min={1} max={10080} required className={field} value={edit.item.duration ?? 30}
          onChange={e => setEdit({ ...edit, item: { ...edit.item, duration: Number(e.target.value) } })} /></label>}
        <button className={button} disabled={busy || expired}>Сохранить пользователю</button>{" "}
        <button type="button" className={button} disabled={busy} onClick={() => setEdit(null)}>Отмена</button>
      </form>}
    </>}
  </main>;
}
