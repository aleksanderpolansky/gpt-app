"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type TaskState = "awaiting_template" | "awaiting_relations";

type ConsequenceTask = {
  id: string;
  rawSignalId: string;
  activityEventId: string;
  activityKind: "typical" | "raw";
  activityTitle: string;
  activityTemplateId: string | null;
  activityTemplateTitle: string | null;
  rawActivityTitle: string;
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  sourceValueObjectId: string;
  sourceValueObjectTitle: string;
  targetValueObjectId: null;
  targetSelectionState: "locked_pending_relations";
  state: TaskState;
  createdAt: string;
};

type TemplateOption = {
  id: string;
  title: string;
  shortTitle: string | null;
};

type QueueResponse = {
  ok?: boolean;
  pendingCount?: number;
  tasks?: ConsequenceTask[];
  templates?: TemplateOption[];
  error?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  count: string;
  activity: string;
  parameter: string;
  source: string;
  target: string;
  state: string;
  typical: string;
  raw: string;
  chooseTemplate: string;
  bindTemplate: string;
  rawOrigin: string;
  targetLocked: string;
  waitingTemplate: string;
  waitingRelations: string;
  empty: string;
  loading: string;
  refresh: string;
  ruleNote: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: { title: "Consequence constructor", subtitle: "Tasks appear here immediately after a leaf observation object is assigned to a parameter. Consequence pairs are contextual: they will be defined only inside a concrete typical activity, not as a universal relation between two observation objects.", count: "tasks", activity: "Activity context", parameter: "Parameter", source: "Source leaf object", target: "Target leaf object", state: "State", typical: "Typical activity", raw: "Raw activity", chooseTemplate: "Choose typical activity…", bindTemplate: "Save activity", rawOrigin: "Raw origin", targetLocked: "Available after observation-object relations are configured", waitingTemplate: "Needs typical activity", waitingRelations: "Waiting for relations", empty: "There are no consequence tasks yet.", loading: "Loading…", refresh: "Refresh", ruleNote: "This version does not create a universal source→target relation and does not create formulas. Target selection remains locked until the observation-object relation constructor is implemented." },
  ru: { title: "Конструктор последствий", subtitle: "Запись появляется здесь сразу после назначения листового объекта наблюдения параметру. Пары ОН контекстные: они будут иметь смысл только внутри конкретной типовой активности, а не как универсальная связь двух ОН.", count: "заданий", activity: "Контекст активности", parameter: "Параметр", source: "Исходный листовой ОН", target: "Целевой листовой ОН", state: "Состояние", typical: "Типовая активность", raw: "Сырая активность", chooseTemplate: "Выберите типовую активность…", bindTemplate: "Сохранить активность", rawOrigin: "Исходная сырая активность", targetLocked: "Станет доступно после настройки связей ОН", waitingTemplate: "Нужна типовая активность", waitingRelations: "Ожидает связей", empty: "Заданий для конструктора последствий пока нет.", loading: "Загрузка…", refresh: "Обновить", ruleNote: "В этой версии не создаётся универсальная связь исходный ОН → целевой ОН и не создаются формулы. Выбор целевого ОН остаётся закрытым до реализации конструктора связей объектов наблюдения." },
  pl: { title: "Konstruktor konsekwencji", subtitle: "Zadanie pojawia się od razu po przypisaniu liściowego obiektu obserwacji do parametru. Pary obiektów są kontekstowe i będą obowiązywać tylko w ramach konkretnej aktywności typowej.", count: "zadań", activity: "Kontekst aktywności", parameter: "Parametr", source: "Źródłowy obiekt liściowy", target: "Docelowy obiekt liściowy", state: "Stan", typical: "Aktywność typowa", raw: "Aktywność surowa", chooseTemplate: "Wybierz aktywność typową…", bindTemplate: "Zapisz aktywność", rawOrigin: "Źródłowa aktywność surowa", targetLocked: "Dostępne po skonfigurowaniu relacji obiektów", waitingTemplate: "Wymaga aktywności typowej", waitingRelations: "Oczekuje na relacje", empty: "Brak zadań konstruktora konsekwencji.", loading: "Ładowanie…", refresh: "Odśwież", ruleNote: "Ta wersja nie tworzy uniwersalnej relacji źródło→cel ani formuł. Wybór celu pozostaje zablokowany do wdrożenia konstruktora relacji." },
  uk: { title: "Конструктор наслідків", subtitle: "Завдання з’являється одразу після призначення листового об’єкта спостереження параметру. Пари об’єктів є контекстними й діятимуть лише в межах конкретної типової активності.", count: "завдань", activity: "Контекст активності", parameter: "Параметр", source: "Вихідний листовий об’єкт", target: "Цільовий листовий об’єкт", state: "Стан", typical: "Типова активність", raw: "Сира активність", chooseTemplate: "Оберіть типову активність…", bindTemplate: "Зберегти активність", rawOrigin: "Вихідна сира активність", targetLocked: "Буде доступно після налаштування зв’язків об’єктів", waitingTemplate: "Потрібна типова активність", waitingRelations: "Очікує зв’язків", empty: "Завдань конструктора наслідків поки немає.", loading: "Завантаження…", refresh: "Оновити", ruleNote: "У цій версії не створюється універсальний зв’язок джерело→ціль і не створюються формули. Вибір цілі заблокований до реалізації конструктора зв’язків." },
  de: { title: "Folgen-Konstruktor", subtitle: "Eine Aufgabe erscheint sofort, nachdem einem Parameter ein Blatt-Beobachtungsobjekt zugeordnet wurde. Objektpaare sind kontextbezogen und gelten nur innerhalb einer konkreten typischen Aktivität.", count: "Aufgaben", activity: "Aktivitätskontext", parameter: "Parameter", source: "Quell-Blattobjekt", target: "Ziel-Blattobjekt", state: "Status", typical: "Typische Aktivität", raw: "Rohaktivität", chooseTemplate: "Typische Aktivität wählen…", bindTemplate: "Aktivität speichern", rawOrigin: "Ursprüngliche Rohaktivität", targetLocked: "Nach Einrichtung der Objektbeziehungen verfügbar", waitingTemplate: "Typische Aktivität erforderlich", waitingRelations: "Wartet auf Beziehungen", empty: "Noch keine Folgen-Aufgaben.", loading: "Laden…", refresh: "Aktualisieren", ruleNote: "Diese Version erstellt weder eine universelle Quelle→Ziel-Beziehung noch Formeln. Die Zielauswahl bleibt bis zum Beziehungskonstruktor gesperrt." },
  es: { title: "Constructor de consecuencias", subtitle: "La tarea aparece inmediatamente después de asignar un objeto hoja a un parámetro. Los pares de objetos son contextuales y solo tendrán significado dentro de una actividad típica concreta.", count: "tareas", activity: "Contexto de actividad", parameter: "Parámetro", source: "Objeto hoja de origen", target: "Objeto hoja de destino", state: "Estado", typical: "Actividad típica", raw: "Actividad bruta", chooseTemplate: "Seleccione una actividad típica…", bindTemplate: "Guardar actividad", rawOrigin: "Actividad bruta de origen", targetLocked: "Disponible después de configurar las relaciones de objetos", waitingTemplate: "Necesita actividad típica", waitingRelations: "Espera relaciones", empty: "Todavía no hay tareas de consecuencias.", loading: "Cargando…", refresh: "Actualizar", ruleNote: "Esta versión no crea una relación universal origen→destino ni fórmulas. La selección del destino permanece bloqueada hasta implementar el constructor de relaciones." },
  cs: { title: "Konstruktor důsledků", subtitle: "Úloha se objeví ihned po přiřazení listového objektu pozorování k parametru. Dvojice objektů jsou kontextové a budou platit jen v rámci konkrétní typické aktivity.", count: "úloh", activity: "Kontext aktivity", parameter: "Parametr", source: "Zdrojový listový objekt", target: "Cílový listový objekt", state: "Stav", typical: "Typická aktivita", raw: "Surová aktivita", chooseTemplate: "Vyberte typickou aktivitu…", bindTemplate: "Uložit aktivitu", rawOrigin: "Původní surová aktivita", targetLocked: "Dostupné po nastavení vztahů objektů", waitingTemplate: "Vyžaduje typickou aktivitu", waitingRelations: "Čeká na vztahy", empty: "Zatím nejsou žádné úlohy důsledků.", loading: "Načítání…", refresh: "Obnovit", ruleNote: "Tato verze nevytváří univerzální vztah zdroj→cíl ani vzorce. Výběr cíle zůstává uzamčen do zavedení konstruktoru vztahů." },
};

export default function AdminConsequenceConstructorPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [tasks, setTasks] = useState<ConsequenceTask[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateByTask, setSelectedTemplateByTask] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);

  const fetchTasks = useCallback(async (): Promise<QueueResponse> => {
    const response = await fetch("/api/admin/consequence-constructor", {
      cache: "no-store",
    });
    const payload = (await response.json()) as QueueResponse;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, []);

  const applyPayload = useCallback((payload: QueueResponse) => {
    const nextTasks = payload.tasks ?? [];
    setTasks(nextTasks);
    setTemplates(payload.templates ?? []);
    setSelectedTemplateByTask(
      Object.fromEntries(
        nextTasks.map((task) => [task.id, task.activityTemplateId ?? ""]),
      ),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyPayload(await fetchTasks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [applyPayload, fetchTasks]);

  useEffect(() => {
    let cancelled = false;
    void fetchTasks()
      .then((payload) => {
        if (cancelled) return;
        applyPayload(payload);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyPayload, fetchTasks]);

  async function bindTemplate(task: ConsequenceTask) {
    const templateId = selectedTemplateByTask[task.id] ?? "";
    if (!templateId || templateId === task.activityTemplateId) return;
    setBusyId(task.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/consequence-constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bind_template",
          taskId: task.id,
          templateId,
        }),
      });
      const payload = (await response.json()) as QueueResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      await load();
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : String(bindError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
              <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#3b6ef8]">
                {tasks.length} {copy.count}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b7280]">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#d8dced] px-3 py-2 text-sm font-medium text-[#4a4f6a] hover:bg-[#f8f9fc]"
          >
            {copy.refresh}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {copy.ruleNote}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p> : null}
        {!loading && tasks.length === 0 ? <p className="mt-6 text-sm text-[#6b7280]">{copy.empty}</p> : null}

        {!loading && tasks.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[#8a8fa8]">
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.activity}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.parameter}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.source}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.target}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.state}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const selectedTemplateId = selectedTemplateByTask[task.id] ?? "";
                  const templateChanged =
                    selectedTemplateId !== "" &&
                    selectedTemplateId !== (task.activityTemplateId ?? "");
                  return (
                    <tr key={task.id} className="align-top">
                      <td className="min-w-[330px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${task.activityKind === "typical" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {task.activityKind === "typical" ? copy.typical : copy.raw}
                          </span>
                          <span className="font-medium text-[#23263a]">{task.activityTitle}</span>
                        </div>
                        {task.activityKind === "typical" ? (
                          <div className="mt-1 text-xs text-[#8a8fa8]">{copy.rawOrigin}: {task.rawActivityTitle}</div>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <select
                            value={selectedTemplateId}
                            onChange={(event) =>
                              setSelectedTemplateByTask((current) => ({
                                ...current,
                                [task.id]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-[#d8dced] bg-white px-2.5 py-2 text-xs text-[#4a4f6a]"
                          >
                            <option value="">{copy.chooseTemplate}</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!templateChanged || busyId !== null}
                            onClick={() => void bindTemplate(task)}
                            className="whitespace-nowrap rounded-lg border border-[#cfd5ea] px-3 py-2 text-xs font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {copy.bindTemplate}
                          </button>
                        </div>
                      </td>
                      <td className="min-w-[220px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="font-medium text-[#23263a]">{task.parameterTitle}</div>
                        <div className="mt-1 text-xs text-[#8a8fa8]">{task.parameterCode || task.parameterDefinitionId}</div>
                      </td>
                      <td className="min-w-[240px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="font-medium text-[#23263a]">{task.sourceValueObjectTitle}</div>
                        <div className="mt-1 text-xs text-[#8a8fa8]">{task.sourceValueObjectId}</div>
                      </td>
                      <td className="min-w-[290px] border-b border-[#f0f1f6] px-3 py-3">
                        <select
                          disabled
                          value=""
                          className="w-full cursor-not-allowed rounded-lg border border-[#e1e4ef] bg-[#f8f9fc] px-2.5 py-2 text-xs text-[#9ca3b8]"
                        >
                          <option value="">{copy.targetLocked}</option>
                        </select>
                      </td>
                      <td className="min-w-[180px] border-b border-[#f0f1f6] px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.state === "awaiting_template" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                          {task.state === "awaiting_template" ? copy.waitingTemplate : copy.waitingRelations}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
