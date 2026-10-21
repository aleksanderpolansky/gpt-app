import "server-only";

import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  readAdminInstructionCatalog,
  type AiProcessingLocale,
} from "@/lib/ai/processingInstructions.server";
import { readProcessingControlCatalog } from "@/lib/ai/processingRules.server";
import { supabase } from "../../../../lib/supabase";

type EvidenceProps = { localeCode: AiProcessingLocale };
type Probe = {
  name: string;
  route: string;
  operationKind: string;
  staticConnection: string;
};

// Source-traced routes, NOT a claim of complete runtime coverage or instruction application.
const ROUTE_PROBES: readonly Probe[] = [
  { name: "AI Navigator", route: "/api/test", operationKind: "chat_message", staticConnection: "Методологический контекст + платный шлюз" },
  { name: "Semantic Review A3.1", route: "/api/activity/review-analysis", operationKind: "semantic_intake", staticConnection: "Компилятор контекста + платный шлюз" },
  { name: "Базовый анализ Quick Capture", route: "/api/activity/quick-capture", operationKind: "semantic_intake", staticConnection: "Встроенный промпт + платный шлюз; персональные инструкции не подключены" },
  { name: "Локализация активности", route: "/api/activity/quick-capture", operationKind: "content_localization", staticConnection: "Компилятор контекста; персональная инструкция намеренно исключена" },
];

function sourceLabel(source: string) {
  switch (source) {
    case "db_locale": return "БД · язык";
    case "db_global": return "БД · global";
    case "code_default": return "Исходный код · по умолчанию";
    case "db_custom_inactive": return "Неактивный вариант";
    default: return "Неизвестный источник";
  }
}

function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";
}

export default async function GovernanceRuntimeEvidence({ localeCode }: EvidenceProps) {
  // This server component is not an API. Check privileges independently of its parent page.
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) return null;

  const [systemResult, rulesResult, draftsResult] = await Promise.allSettled([
    readAdminInstructionCatalog(localeCode),
    readProcessingControlCatalog(localeCode),
    supabase.from("ai_processing_instruction_sets")
      .select("instruction_code,locale_code,current_revision,status,updated_at")
      .like("instruction_code", "governance_draft__%")
      .order("updated_at", { ascending: false })
      .limit(30),
  ] as const);

  const routeResults = await Promise.allSettled(ROUTE_PROBES.map((probe) =>
    supabase.from("ai_usage_events")
      .select("created_at,status")
      .eq("route_path", probe.route)
      .eq("operation_kind", probe.operationKind)
      .order("created_at", { ascending: false })
      .limit(1),
  ));

  const systems = systemResult.status === "fulfilled" ? systemResult.value.items : null;
  const rules = rulesResult.status === "fulfilled" ? rulesResult.value.processingRules : null;
  const drafts = draftsResult.status === "fulfilled" && !draftsResult.value.error
    ? (draftsResult.value.data ?? []) : null;

  const routeEvidence = ROUTE_PROBES.map((probe, index) => {
    const result = routeResults[index];
    if (!result || result.status !== "fulfilled" || result.value.error) {
      return { ...probe, state: "Недоступно", lastAt: null as string | null };
    }
    const item = result.value.data?.[0];
    return {
      ...probe,
      state: item ? `Запись учёта: ${item.status}` : "Записи не найдены",
      lastAt: item?.created_at ?? null,
    };
  });

  return (
    <section id="runtime-evidence" className="rounded-2xl border border-cyan-800 bg-slate-900/70 p-5 text-slate-100" data-testid="p31c-runtime-evidence">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">P3.1.C · диагностическая интеграция · только чтение</p>
          <h2 className="mt-1 text-lg font-bold">5 · Текущие инструкции и подтверждения подключения</h2>
        </div>
        <span className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200">Язык: {localeCode}</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Данные ниже получены из действующих каталогов и журнала AI-вызовов, а не из черновика Governance.
        Наличие инструкции в каталоге или запись вызова <strong>не доказывают</strong>, что конкретная редакция инструкции применялась в Production.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-lg border border-violet-500 px-3 py-2 text-violet-200 hover:bg-slate-800" href={`/admin/ai-instructions?locale=${localeCode}`}>Редактировать системные инструкции →</Link>
        <Link className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-800" href="/settings/ai-processing">Персональные инструкции →</Link>
        <Link className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-800" href="#draft-storage">К неактивным черновикам →</Link>
      </div>

      <h3 className="mt-6 text-base font-semibold">Системные инструкции: действующий источник и ревизия</h3>
      {systems === null ? <p className="mt-2 text-sm text-amber-200" role="status">Каталог временно недоступен. Статус применения не установлен.</p> : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-300"><tr><th className="p-2">Инструкция</th><th className="p-2">Источник</th><th className="p-2">Ревизия</th><th className="p-2">Цели runtime</th></tr></thead>
            <tbody>{systems.map(({ definition, effective }) => (
              <tr className="border-t border-slate-700" key={definition.code}>
                <td className="p-2"><span className="font-medium">{definition.title}</span><span className="block text-xs text-slate-400">{definition.code}</span></td>
                <td className="p-2">{sourceLabel(effective.source)} ({effective.localeCode})</td>
                <td className="p-2">{effective.revision === null ? "Код (нет DB-ревизии)" : `v${effective.revision}`}</td>
                <td className="p-2 text-xs text-slate-300">{effective.runtimeTargets.join(", ") || "Не назначены"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <h3 className="mt-6 text-base font-semibold">Детерминированные правила: существующий каталог</h3>
      {rules === null ? <p className="mt-2 text-sm text-amber-200" role="status">Каталог правил временно недоступен.</p> : (
        <div className="mt-3 space-y-2">{rules.length === 0 && <p className="text-sm text-slate-400">Правила не обнаружены.</p>}
          {rules.map((rule) => (
            <div key={`${rule.ruleCode}:${rule.localeCode}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><b>{rule.ruleCode}</b><span className="text-slate-300">{rule.status === "active" ? "active" : "inactive"} · {sourceLabel(rule.source)} · {rule.revision === null ? "код" : `v${rule.revision}`}</span></div>
              <p className="mt-1 text-xs text-slate-400">{rule.status !== "active" ? "Неактивно" : rule.runtimeConsumption === "runtime_wired" ? "Маршрут подключён в исходниках (не доказательство срабатывания)" : "Только каталог; runtime не подключён"}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-6 text-base font-semibold">MVP 2: сохранённые черновики Governance</h3>
      {drafts === null ? <p className="mt-2 text-sm text-amber-200" role="status">Метаданные черновиков недоступны.</p> : (
        <div className="mt-2 text-sm text-slate-300">
          <p>Найдено записей: {drafts.length}{drafts.length === 30 ? " (показаны первые 30)" : ""}. {drafts.some((d) => d.status !== "inactive") ? <strong className="text-red-300">Обнаружена запись не в статусе inactive: требуется аудит!</strong> : <strong>Все показанные имеют статус inactive.</strong>}</p>
          <ul className="mt-2 space-y-1">{drafts.map((d) => (
            <li key={`${d.instruction_code}:${d.locale_code}`} className="text-xs text-slate-400">{d.instruction_code.replace(/^governance_draft__/, "")} · {d.locale_code} · v{d.current_revision} · {d.status} · {shortDate(d.updated_at)}</li>
          ))}</ul>
        </div>
      )}

      <h3 className="mt-6 text-base font-semibold">Маршруты: кодовая связь и последняя запись учёта</h3>
      <div className="mt-3 space-y-2">{routeEvidence.map((probe) => (
        <div key={`${probe.route}:${probe.operationKind}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
          <b>{probe.name}</b><p className="mt-1 text-slate-300">{probe.staticConnection}</p>
          <p className="mt-1 text-xs text-cyan-200">{probe.state} · {shortDate(probe.lastAt)}</p>
          <p className="mt-1 text-xs text-slate-400">{probe.route} · {probe.operationKind}</p>
        </div>
      ))}</div>
      <p className="mt-4 rounded-lg border border-amber-800/70 p-3 text-xs text-amber-100">
        Личные инструкции привязаны к владельцу и актору; общий административный блок не показывает их тексты или данные других пользователей.
        Отсутствие ссылки actor_processing_instruction в старой истории само по себе не означает ошибку.
        P3.1.C ничего не активирует: без AI-вызовов, списаний AI EUR и записи фактов.
      </p>
    </section>
  );
}
