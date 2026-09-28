"use client";
import { useState } from "react";
import { notifyAssistChange } from "@/components/admin/full-assist-banner";
type UserResult = { user: { id: string; name?: string; email?: string }; profiles: { id: string; name: string }[] };
const field = "w-full rounded border bg-white p-3 text-black";
export default function FullAssistControl({ initialUser }: { initialUser: string }) {
  const [user, setUser] = useState(initialUser), [profile, setProfile] = useState("");
  const [found, setFound] = useState<UserResult | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [ack, setAck] = useState(false);
  async function send(body: Record<string, unknown>) {
    const r = await fetch("/api/assist-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Ошибка"); return data;
  }
  async function run(task: () => Promise<void>) { setBusy(true); setError(""); try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); } finally { setBusy(false); } }
  return <main className="mx-auto max-w-3xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Войти в режим пользователя</h1>
    <p>Откроются обычные страницы выбранного аккаунта: предприятия, фотографии, предложения, сертификаты, календарь и другие материалы.</p>
    <label className="block">ID пользователя<input className={field} value={user} onChange={e => { setUser(e.target.value); setFound(null); setAck(false); }} /></label>
    <button disabled={busy || !user.trim()} className="rounded border px-4 py-2" onClick={() => run(async () => {
      const data: UserResult = await send({ action: "lookup", user: user.trim() }); setFound(data); setProfile(data.profiles[0]?.id || "");
    })}>Найти пользователя</button>
    {error && <p role="alert">{error}</p>}
    {found && <section className="space-y-4 rounded border p-4">
      <strong>{found.user.name} · {found.user.email}</strong>
      <label className="block">Начальный профиль<select className={field} value={profile} onChange={e => setProfile(e.target.value)}>
        {found.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
        <span>Работаю с полными правами пользователя. Публикации, скрытие материалов и другие операции изменяют его данные; платные AI-действия используют его баланс. Режим действует во всех вкладках этого браузера.</span>
      </label>
      <button disabled={busy || !profile || !ack} className="rounded bg-blue-600 px-4 py-3 text-white disabled:opacity-50" onClick={() => run(async () => {
        await send({ action: "start", user: found.user.id, profileId: profile, fullAccessAcknowledged: true });
        notifyAssistChange(); window.location.assign("/organizations?locale=ru");
      })}>Войти как пользователь на 30 минут</button>
    </section>}
  </main>;
}
