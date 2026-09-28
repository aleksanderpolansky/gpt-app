"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function notifyAssistChange() {
  try { localStorage.setItem("arctor-assist-context-change-v2", String(Date.now())); } catch { /* Server checks also reject stale tabs. */ }
}
export default function FullAssistBanner({ context, invalid }: { context: { name: string; expiresAt: string } | null; invalid: boolean }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(invalid);
  useEffect(() => {
    if (!context) return;
    const timer = window.setInterval(() => setExpired(Date.now() >= Date.parse(context.expiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [context]);
  if (!context && !invalid) return null;
  return <div role="status" style={{ position: "sticky", top: 0, zIndex: 2147483000, padding: "12px 20px", background: "#fff1b8", color: "#201800", borderBottom: "2px solid #a66b00" }}>
    <strong>{expired ? "Сессия помощи истекла или недоступна." : `Полный режим пользователя: ${context?.name}`}</strong>{" "}
    Вы действуете с правами и балансом этого пользователя. Все остальные вкладки также переключаются.{" "}
    <button disabled={busy} style={{ padding: "6px 12px", border: "1px solid", borderRadius: 6 }} onClick={async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/assist-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
        if (!r.ok) throw new Error("Не удалось завершить помощь.");
        notifyAssistChange(); window.location.assign("/assist");
      } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); setBusy(false); }
    }}>Вернуться в свой аккаунт</button>{" "}
    <Link prefetch={false} href="/assist">Выбрать пользователя</Link>{" · "}<Link prefetch={false} href="/organizations">Предприятия</Link>{" · "}<Link prefetch={false} href="/activity-templates?scope=user">Типовые активности</Link>
    {error && <span>{error}</span>}
  </div>;
}
