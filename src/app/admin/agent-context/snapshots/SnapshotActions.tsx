"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  caseCode: string; assignmentId: string; taskCode: string; expectedDigest: string;
  snapshotId?: string; mode: "capture" | "review_internal" | "reject";
  disabled?: boolean;
};
export default function SnapshotActions(props: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isDecision = props.mode !== "capture";
  const labels: Record<Props["mode"], string> = {
    capture: "Сохранить новый снимок (без запуска ИИ)",
    review_internal: "Подтвердить внутреннюю проверку",
    reject: "Отклонить снимок",
  };
  async function submit() {
    if (busy || props.disabled || (isDecision && reason.trim().length < 10)) return;
    if (!window.confirm(props.mode === "capture" ?
      "Сохранить неизменяемый снимок текущего контекста в Supabase?" :
      "Записать окончательное решение в неизменяемый журнал? Это не даёт ИИ права использовать данные.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/management/agent-context/snapshots", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...props, action: props.mode, reason, operationId: crypto.randomUUID() }),
      });
      const data = await response.json() as { ok?: boolean; errorCode?: string };
      if (!response.ok || data.ok !== true) throw new Error(data.errorCode || "REQUEST_FAILED");
      setMessage("Записано в Supabase. ИИ остаётся отключённым.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? `Не записано: ${err.message}` : "Не записано: неизвестная ошибка");
    } finally { setBusy(false); }
  }
  return <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
    {isDecision && <label className="block text-sm">Основание решения (10–1000 символов)
      <textarea className="mt-1 w-full rounded border p-2" rows={2} maxLength={1000}
        value={reason} onChange={event => setReason(event.target.value)}
        placeholder="Что проверено и почему принято решение" />
    </label>}
    <button type="button" onClick={submit} disabled={busy || props.disabled || (isDecision && reason.trim().length < 10)}
      className="rounded-lg border border-indigo-500 px-4 py-2 text-sm text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? "Выполняется проверка..." : labels[props.mode]}
    </button>
    {message && <p role="status" className="break-words text-sm">{message}</p>}
  </div>;
}
