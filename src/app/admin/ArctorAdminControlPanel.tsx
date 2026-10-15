"use client";

import ArctorAdminLiveRegistry from "./ArctorAdminLiveRegistry";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  Code2,
  FileText,
  Inbox,
  LayoutDashboard,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
} from "lucide-react";

type DeskId =
  | "process" | "product" | "semantic" | "ai"
  | "engineering" | "quality" | "commercial" | "support";

type Desk = {
  id: DeskId;
  name: string;
  manager: string;
  summary: string;
  responsibilities: string[];
  workspaces: { label: string; href: string }[];
};

type CaseKind = "defect" | "research" | "planned" | "operations" | "risk";
type CaseItem = {
  id: string;
  title: string;
  desk: DeskId;
  owner: string;
  kind: CaseKind;
  priority: "high" | "normal";
  source: string;
  observation: string;
  nextStep: string;
  links: { label: string; href: string }[];
};

const DESKS: Desk[] = [
  {
    id: "process", name: "Управление процессами", manager: "Руководитель процессов / диспетчер",
    summary: "Учёт дел, распределение по компетенции, история, сроки, передачи и отчётность.",
    responsibilities: ["Принять обращение и исключить дубликаты", "Назначить владельца и ответственного исполнителя", "Обеспечить передачу, эскалацию и закрытие"],
    workspaces: [{ label: "Главная административная страница", href: "/admin" }, { label: "Процессы и знания проекта", href: "/project-knowledge/process-map" }, { label: "Риски проекта", href: "/project-knowledge/risks" }, { label: "Сервисный журнал", href: "/service-log" }],
  },
  {
    id: "product", name: "Управление продуктом", manager: "Руководитель продукта",
    summary: "Требования, ценность для пользователя, приоритеты и приёмка новых возможностей.",
    responsibilities: ["Определить ожидаемое поведение функции", "Расставить приоритеты и согласовать объём", "Принять результат с точки зрения пользователя"],
    workspaces: [{ label: "Публичная лента", href: "/feed" }, { label: "Аналитика", href: "/analytics" }, { label: "Календарь", href: "/calendar" }, { label: "Планы и проекты", href: "/projects" }],
  },
  {
    id: "semantic", name: "Семантическая модель", manager: "Главный куратор модели",
    summary: "Онтология ОН, типовые активности, параметры, формулы, связи и последствия.",
    responsibilities: ["Проверять необходимость и место ОН", "Управлять семантикой типовых активностей", "Утверждать предметные предложения перед изменением глобальной модели"],
    workspaces: [
      { label: "Куратор модели", href: "/admin/reality-curator/signals" },
      { label: "Неразобранные коммерческие активности", href: "/admin/commercial-activities" },
      { label: "Конструктор последствий", href: "/admin/consequence-constructor" },
      { label: "Типовые активности", href: "/activity-templates" },
      { label: "Объекты наблюдения", href: "/value-objects" },
      { label: "Редактор связей", href: "/admin/relation-constructor" },
      { label: "Конструктор формул", href: "/admin/formula-builder" },
      { label: "Каталог формул", href: "/admin/formula-catalog" },
      { label: "Обоснования формул", href: "/admin/formula-rationales" },
    ],
  },
  {
    id: "ai", name: "ИИ и инструкции", manager: "Руководитель ИИ-направления",
    summary: "Модели, версии инструкций, контракты ответа и качество распознавания.",
    responsibilities: ["Выявлять, какая инструкция реально исполняется", "Готовить контролируемые изменения сценариев", "Проверять стоимость, качество и воспроизводимость анализа"],
    workspaces: [{ label: "Системные инструкции ИИ", href: "/admin/ai-instructions" }, { label: "Испытательная лаборатория", href: "/activity-ai-lab" }, { label: "Настройки обработки ИИ", href: "/settings/ai-processing" }],
  },
  {
    id: "engineering", name: "Разработка и эксплуатация", manager: "Технический руководитель",
    summary: "Код, серверные обработчики, база данных, безопасность развёртывания.",
    responsibilities: ["Оценивать и утверждать технический подход", "Готовить изменения без нарушения контрактов данных", "Организовать сборку, испытания и контролируемый выпуск"],
    workspaces: [{ label: "Карта API", href: "/project-knowledge/api-map" }, { label: "Карта файлов", href: "/project-knowledge/file-map" }, { label: "Локальные редакторы", href: "/local-editors" }, { label: "Устранение неисправностей", href: "/project-knowledge/troubleshooting" }],
  },
  {
    id: "quality", name: "Качество и контроль", manager: "Руководитель качества",
    summary: "Приёмочные испытания, регрессия, контроль исходных фактов и финансовых событий.",
    responsibilities: ["Создавать независимые критерии приёмки", "Проверять положительные и отрицательные случаи", "Фиксировать протокол и разрешение на дальнейший этап"],
    workspaces: [{ label: "Проверка активностей", href: "/activity-review" }, { label: "Факты активности", href: "/activity-facts" }, { label: "Сервисный журнал", href: "/service-log" }, { label: "Сведения об источниках", href: "/project-knowledge/sources" }],
  },
  {
    id: "commercial", name: "Коммерческие операции", manager: "Руководитель коммерческого направления",
    summary: "Предприятия, предложения, сертификаты, покупки, POINTS и репутация.",
    responsibilities: ["Проверять жизненный цикл предприятия и предложения", "Контролировать выдачу и использование сертификатов", "Передавать финансовые спорные случаи независимому контролёру"],
    workspaces: [{ label: "Предприятия", href: "/organizations" }, { label: "Каталог", href: "/directory" }, { label: "Сертификаты", href: "/certificates" }, { label: "Подтверждения покупок", href: "/purchase-confirmations" }, { label: "Премии и вознаграждения", href: "/rewards" }, { label: "POINTS", href: "/points" }, { label: "Репутация", href: "/reputation" }],
  },
  {
    id: "support", name: "Пользователи и поддержка", manager: "Руководитель поддержки",
    summary: "Управление пользователями, запросами, локализацией и ограниченной помощью.",
    responsibilities: ["Регистрировать пользовательские обращения", "Сопровождать доступ и запросы о помощи", "Проверять основания для административного доступа"],
    workspaces: [{ label: "Пользователи", href: "/admin/users" }, { label: "Административная помощь", href: "/admin/assist" }, { label: "Справочная система", href: "/admin/help-system" }, { label: "Переводы и локализация", href: "/admin/localization-jobs" }, { label: "Сообщения", href: "/messages" }, { label: "AI EUR Billing", href: "/admin/ai-billing" }],
  },
];

const CASES: CaseItem[] = [
  { id: "SEM-001", title: "Сопоставление price и money_value", desk: "semantic", owner: "Системный аналитик + куратор параметров", kind: "defect", priority: "high", source: "Диагностика Jewel-Osco, F3.3", observation: "ИИ извлёк 12 USD, но денежное значение не было подготовлено для записи факта.", nextStep: "Подготовить ТЗ на проверенное сопоставление параметров и регрессионные тесты.", links: [{ label: "Неразобранные активности", href: "/admin/commercial-activities" }] },
  { id: "SEM-002", title: "Цена без указания массы или упаковки", desk: "semantic", owner: "Куратор параметров и онтологии", kind: "research", priority: "high", source: "Публикация Jewel-Osco", observation: "Сумма 12 USD известна; нельзя без основания приписывать её килограмму, фунту или упаковке.", nextStep: "Рассмотреть варианты модели денежного значения без домысливания единицы товара.", links: [{ label: "Объекты наблюдения", href: "/value-objects" }] },
  { id: "SEM-003", title: "Выбор Chicago и представителя Jewel-Osco", desk: "semantic", owner: "Куратор ОН", kind: "research", priority: "normal", source: "Административная проверка коммерческой активности", observation: "Требовалось ручное предметное подтверждение листовых ОН и технического представителя магазина.", nextStep: "Проверить правила распознавания и предложить безопасный маршрут кандидатов.", links: [{ label: "Куратор", href: "/admin/reality-curator/signals" }, { label: "Коммерческие активности", href: "/admin/commercial-activities" }] },
  { id: "AI-001", title: "Связь инструкций ИИ с фактическими обработчиками", desk: "ai", owner: "Руководитель ИИ + архитектор", kind: "research", priority: "high", source: "Системные инструкции ИИ и коммерческий разбор", observation: "Требуется установить для каждой инструкции, участвует ли она в исполняемом маршруте.", nextStep: "Создать карту instruction → обработчик → контракт → версия; без автоматического включения новой инструкции.", links: [{ label: "Инструкции", href: "/admin/ai-instructions" }] },
  { id: "MOD-001", title: "Очередь заданий конструктора последствий", desk: "semantic", owner: "Инженер последствий и формул", kind: "operations", priority: "normal", source: "Конструктор последствий (по скриншоту: 51 задание)", observation: "Рабочие задания нельзя считать дефектами и нельзя дублировать в другой таблице.", nextStep: "Сгруппировать исходные задания по активности, параметру и общей причине.", links: [{ label: "Конструктор последствий", href: "/admin/consequence-constructor" }] },
  { id: "REL-001", title: "Безопасная приёмка автоматической записи фактов", desk: "quality", owner: "Руководитель качества", kind: "risk", priority: "high", source: "Административный переключатель (OFF)", observation: "Выключенное состояние преднамеренно; это не ошибка и не запрос немедленно включить.", nextStep: "Подготовить план испытаний, запреты и отдельное решение о готовности.", links: [{ label: "Проверка коммерческого разбора", href: "/admin/commercial-activities" }] },
  { id: "FEED-001", title: "Группировка нескольких товаров и цен", desk: "product", owner: "Владелец ленты + системный аналитик", kind: "planned", priority: "high", source: "План завершения ленты", observation: "Необходимо исключить смешивание цены товара A с товаром B в одной публикации.", nextStep: "Определить контракт групп фактов и критерии приёмки.", links: [{ label: "Лента", href: "/feed" }] },
  { id: "OPS-001", title: "Восстановление фоновой обработки и повторы", desk: "engineering", owner: "Инженер эксплуатации", kind: "risk", priority: "normal", source: "Конвейер публикаций и активностей", observation: "Нужно проверить идемпотентность, повторные попытки и сбои фонового процесса.", nextStep: "Подготовить план проверок без повторной записи фактов.", links: [{ label: "Сервисный журнал", href: "/service-log" }] },
  { id: "FEED-002", title: "F4: фильтры по дополнительным параметрам", desk: "product", owner: "Владелец ленты", kind: "planned", priority: "normal", source: "Дорожная карта ленты", observation: "Предстоят параметры массы, количества, времени, длительности и другие разрешённые измерения.", nextStep: "Описать пользовательские сценарии и правила отбора по фактам.", links: [{ label: "Лента", href: "/feed" }] },
  { id: "FEED-003", title: "F5: источники, подписки и предпочтения", desk: "product", owner: "Владелец ленты", kind: "planned", priority: "normal", source: "Дорожная карта ленты", observation: "Требуются управляемые предпочтения и категории источников.", nextStep: "Подготовить функциональные требования и границы доступов.", links: [{ label: "Лента", href: "/feed" }] },
  { id: "PERF-001", title: "F6: скорость и нагрузочные испытания ленты", desk: "engineering", owner: "Инженер производительности", kind: "planned", priority: "normal", source: "Дорожная карта ленты", observation: "Требуется оценка запросов, кеширования и времени ответа при росте аудитории.", nextStep: "Зафиксировать эталонную нагрузку и метрики.", links: [{ label: "Лента", href: "/feed" }] },
  { id: "LOC-001", title: "L1: страна, язык и валюта посетителя", desk: "product", owner: "Владелец интерфейса", kind: "planned", priority: "normal", source: "Запрос на локализацию", observation: "Автовыбор значений по умолчанию не должен отменять явные настройки пользователя.", nextStep: "Согласовать порядок приоритетов геолокации, профиля и ручного выбора.", links: [{ label: "Настройки", href: "/settings" }] },
  { id: "FX-001", title: "Испытание реального отказа источников валют", desk: "quality", owner: "Инженер эксплуатации + испытатель", kind: "risk", priority: "normal", source: "F3.2.6; синтетические испытания", observation: "Синтетический PASS не доказывает успешность реального резервного сценария в Production.", nextStep: "Провести контролируемый тест источников и зафиксировать условия отказа.", links: [{ label: "Лента", href: "/feed" }] },
  { id: "GOV-001", title: "Единая диспетчеризация должностей и инструкций", desk: "process", owner: "Руководитель процессов", kind: "planned", priority: "high", source: "Концепция управления ARCTor", observation: "Существующие очереди и инструкции пока не объединены реестром дел и передачей по компетенции.", nextStep: "После ADM-1 выполнить обследование интерфейсов и ТЗ на ADM-2/ADM-3.", links: [{ label: "Инструкции", href: "/admin/ai-instructions" }, { label: "Процессы", href: "/project-knowledge/process-map" }] },
];

const labelForKind: Record<CaseKind, string> = {
  defect: "Дефект", research: "Исследование", planned: "План развития", operations: "Очередь работ", risk: "Контроль риска",
};
const deskIcon: Record<DeskId, typeof Workflow> = {
  process: Workflow, product: LayoutDashboard, semantic: Network, ai: Sparkles,
  engineering: Code2, quality: ShieldCheck, commercial: Store, support: Users,
};

function makeBrief(item: CaseItem, desk: Desk): string {
  return JSON.stringify({
    schema: "ARCTOR_ADM1_MANUAL_HANDOFF_V1",
    mode: "manual_draft_not_recorded",
    caseId: item.id,
    caseKind: labelForKind[item.kind],
    targetPosition: desk.manager,
    assignmentOwner: item.owner,
    source: item.source,
    problemStatement: item.title,
    observedEvidence: item.observation,
    assignment: item.nextStep,
    responsibilities: desk.responsibilities,
    constraints: [
      "Сначала изучить действующие правила и источники; не домысливать недостающие сведения.",
      "Не изменять Production, не включать автоматическую запись фактов.",
      "Не создавать новые системные ОН и не менять существующие без отдельного утверждения.",
      "Не раскрывать секреты, персональные данные и ключи API в отчёте.",
    ],
    requiredReport: ["caseId", "actionsTaken", "evidence", "finding", "unresolvedQuestions", "proposedNextRole", "risk", "testsRequired"],
    nextTransition: "report_to_owner_for_review",
  }, null, 2);
}

type AdminTab = "inbox" | "desks" | "registry" | "handoff";

export default function ArctorAdminControlPanel() {
  const [deskId, setDeskId] = useState<DeskId>("process");
  const [tab, setTab] = useState<AdminTab>("inbox");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CaseKind | "all">("all");
  const [selectedCaseId, setSelectedCaseId] = useState("SEM-001");
  const [copyStatus, setCopyStatus] = useState("");
  const desk = DESKS.find((item) => item.id === deskId) ?? DESKS[0];
  const activeCase = CASES.find((item) => item.id === selectedCaseId) ?? CASES[0];
  const filteredCases = useMemo(() => CASES.filter((item) => {
    if (tab === "inbox" && item.desk !== deskId) return false;
    if (kind !== "all" && item.kind !== kind) return false;
    const needle = query.toLocaleLowerCase("ru").trim();
    if (!needle) return true;
    return [item.id, item.title, item.owner, item.source, item.observation].some((value) => value.toLocaleLowerCase("ru").includes(needle));
  }), [deskId, tab, query, kind]);
  const chosenDesk = DESKS.find((item) => item.id === activeCase.desk) ?? DESKS[0];
  const brief = makeBrief(activeCase, chosenDesk);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopyStatus("Поручение скопировано. Вставьте его в рабочую панель или этот чат.");
    } catch {
      setCopyStatus("Автоматическое копирование недоступно. Выделите текст в поле ниже и скопируйте вручную.");
    }
  }

  return (
    <div className="mb-10 space-y-5 text-slate-900" data-arctor-adm1="true">
      <ArctorAdminLiveRegistry />
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium text-slate-700">ADM-1 · архив проектных примеров (14, не записаны в Supabase)</summary>
        <div className="mt-4 space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">ADM-1 · организационный каркас</p>
            <h2 className="text-2xl font-semibold tracking-tight">Панель администрирования ARCTor</h2>
            <p className="text-sm leading-6 text-slate-600">Функциональные должности, входящие вопросы, реальные рабочие разделы и пробный ручной обмен поручениями.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Пилот · дела пока не записываются в БД</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-2xl font-semibold">{DESKS.length}</p><p className="text-xs text-slate-600">Функциональных кабинетов</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-2xl font-semibold">{CASES.length}</p><p className="text-xs text-slate-600">Предлагаемых первичных дел</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-2xl font-semibold">{CASES.filter((item) => item.priority === "high").length}</p><p className="text-xs text-slate-600">Высокого приоритета в проекте</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-lg font-semibold text-amber-800">OFF</p><p className="text-xs text-slate-600">Автозапись фактов: последняя проверка</p></div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Эти числа — проектный перечень ADM-1, не живые показатели Supabase. Статус автозаписи приведён по предыдущему подтверждённому испытанию: для текущего состояния используйте страницу коммерческих активностей.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Должностные кабинеты">
        {DESKS.map((item) => {
          const Icon = deskIcon[item.id];
          const active = item.id === deskId;
          return <button key={item.id} type="button" onClick={() => { setDeskId(item.id); setTab("inbox"); setCopyStatus(""); }}
            aria-pressed={active}
            className={`rounded-xl border p-3 text-left transition-colors ${active ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
            <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue-600" aria-hidden="true"/><span className="font-semibold text-sm">{item.name}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.manager}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{CASES.filter((c) => c.desk === item.id).length} дела в пилоте</span><ArrowRight className="h-3.5 w-3.5"/></div>
          </button>;
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Активный кабинет</p><h3 className="mt-1 text-lg font-semibold">{desk.manager}</h3><p className="mt-1 text-sm text-slate-600">{desk.summary}</p></div>
          <span className="self-start rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600">Рабочее место · права в ADM-2</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="Разделы кабинета">
          {([
            ["inbox", "Входящие", Inbox], ["desks", "Рабочие места", LayoutDashboard],
            ["registry", "Реестр дел", ClipboardList], ["handoff", "Поручение / копипастер", ClipboardCopy],
          ] as const).map(([id, text, Icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id}
            onClick={() => { setTab(id); setCopyStatus(""); }}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${tab === id ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}><Icon className="h-4 w-4"/>{text}</button>)}
        </div>

        {(tab === "inbox" || tab === "registry") && <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true"/><span className="sr-only">Поиск по делам</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти дело, код, исполнителя..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"/></label>
            <label className="sr-only" htmlFor="adm1-kind">Тип дела</label>
            <select id="adm1-kind" value={kind} onChange={(event) => setKind(event.target.value as CaseKind | "all")} className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
              <option value="all">Все виды</option>{Object.entries(labelForKind).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-500">{tab === "inbox" ? `Входящие для должности «${desk.manager}»` : "Общий предлагаемый реестр актуальных вопросов"} · {filteredCases.length}</p>
          <div className="grid gap-2">
            {filteredCases.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-md border bg-white px-2 py-0.5 font-mono text-xs">{item.id}</span><span className="text-xs text-slate-500">{labelForKind[item.kind]}</span>{item.priority === "high" && <span className="flex items-center gap-1 text-xs text-amber-800"><AlertTriangle className="h-3.5 w-3.5"/>Высокий приоритет</span>}</div>
              <h4 className="mt-2 font-semibold text-sm">{item.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{item.observation}</p>
              <p className="mt-2 text-xs text-slate-500"><strong>Ответственный:</strong> {item.owner}</p>
              <p className="mt-1 text-xs text-slate-500"><strong>Следующий результат:</strong> {item.nextStep}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {item.links.map((link) => <Link key={link.href} href={link.href} className="flex items-center gap-1 text-xs text-blue-700 hover:underline">{link.label}<ArrowRight className="h-3 w-3"/></Link>)}
                <button type="button" onClick={() => { setSelectedCaseId(item.id); setTab("handoff"); }} className="ml-auto rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Подготовить поручение →</button>
              </div>
            </article>)}
            {filteredCases.length === 0 && <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">Для этого кабинета нет совпадающих дел из стартового реестра.</p>}
          </div>
        </div>}

        {tab === "desks" && <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4"><h4 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-blue-600"/>Обязанности</h4><div className="mt-3 space-y-2">{desk.responsibilities.map((item) => <p key={item} className="text-sm text-slate-700">• {item}</p>)}</div></div>
          <div className="rounded-xl border border-slate-200 p-4"><h4 className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-blue-600"/>Действующие рабочие страницы</h4><div className="mt-3 flex flex-col gap-2">{desk.workspaces.map((link) => <Link key={link.href} href={link.href} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-sm text-blue-700 hover:bg-blue-50">{link.label}<ArrowRight className="h-4 w-4 shrink-0"/></Link>)}</div></div>
        </div>}

        {tab === "handoff" && <div className="mt-4 space-y-3">
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Пилот ADM-1: это черновик поручения для ручного переноса. Здесь нет запуска OpenAI, отправки другому агенту или записи в базу.</p>
          <label className="block text-sm font-medium" htmlFor="adm1-selected-case">Выберите дело</label>
          <select id="adm1-selected-case" value={activeCase.id} onChange={(event) => { setSelectedCaseId(event.target.value); setCopyStatus(""); }} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">{CASES.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><p><strong>Адресат:</strong> {chosenDesk.manager}</p><p className="mt-1"><strong>Основание:</strong> {activeCase.source}</p><p className="mt-1"><strong>Следующий результат:</strong> {activeCase.nextStep}</p></div>
          <label className="block text-sm font-medium" htmlFor="adm1-brief">Структурированное поручение для копирования</label>
          <textarea id="adm1-brief" readOnly value={brief} rows={12} className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100"/>
          <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void copyBrief()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><ClipboardCopy className="h-4 w-4"/>Скопировать поручение</button><span role="status" className="text-xs text-slate-600">{copyStatus}</span></div>
          <p className="text-xs text-slate-500">ADM-2/ADM-3 добавят постоянное хранение, журнал событий, маршруты и разграничение доступа. ADM-5 подключит обработку поручений через API.</p>
        </div>}
      </section>
      <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><FileText className="mt-0.5 h-5 w-5 shrink-0"/><div><strong>Сохранена существующая администрация:</strong> все старые страницы доступны по ссылкам выше и в разворачиваемом каталоге ниже. Этот патч не изменяет таблицы Supabase, коммерческий разбор, инструкции моделей, роли в базе или права доступа.</div></section>
        </div>
      </details>
    </div>
  );
}
