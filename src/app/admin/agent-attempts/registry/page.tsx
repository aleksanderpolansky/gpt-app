import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import RegistryClient from "./RegistryClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = {caseCode?: string|string[]; assignmentId?: string|string[]; taskCode?: string|string[]};
const one = (value: string|string[]|undefined) => typeof value === "string" ? value : "";
export default async function AttemptRegistryPage({searchParams}:{searchParams:Promise<Params>}) {
  const admin = await requirePlatformAdmin({allowedRoles:["owner","admin"]});
  if (!admin.ok) notFound();
  const p = await searchParams;
  const caseCode = one(p.caseCode), assignmentId = one(p.assignmentId), taskCode = one(p.taskCode);
  const qs = new URLSearchParams({caseCode,assignmentId,taskCode});
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6 space-y-2">
        <nav className="flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href={`/admin/agent-attempts?${qs.toString()}`}>Карточка кандидата ADM-5C.3A</Link>
          <Link href={`/admin/agent-context/snapshots?${qs.toString()}`}>Снимок ADM-5B.3</Link>
          <Link href={`/admin/agent-preflight?${qs.toString()}`}>Проверка допуска</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
        </nav>
        <p className="text-xs font-semibold text-indigo-700">ADM-5C.3B · ЗАПИСЬ НАМЕРЕНИЯ · БЕЗ ИИ</p>
        <h1 className="text-2xl font-bold">Реестр попыток: регистрация и аудит</h1>
        <p className="text-sm">Допускается только фиксация намерения в состоянии awaiting_preflight. Запуск, очередь, отправка данных, резервирование средств и изменение дела невозможны.</p>
      </header>
      <RegistryClient key={`${caseCode}:${assignmentId}:${taskCode}`} caseCode={caseCode} assignmentId={assignmentId} taskCode={taskCode}/>
      <footer className="rounded-xl border bg-white p-4 text-xs">ARCTOR_ADM5C3B_REGISTER_ONLY_UI_V1 · Серверное API проверяет человека-администратора и актуальность сохранённого снимка. Флаги агентов выключены.</footer>
    </div>
  </main>;
}
