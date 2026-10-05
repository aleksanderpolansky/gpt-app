"use client";

import {
  Check,
  ChevronDown,
  ListChecks,
  Maximize2,
  Network,
  Plus,
  Save,
  Search,
  Send,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cux6TaskDetailModal } from "@/components/calendar/cux6-task-detail-modal";
import type { Cux6ShelfItem } from "@/components/calendar/cux6-task-shelf";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

type LocaleCode = "ru" | "pl" | "en" | "es" | "uk" | "de" | "cs";

type RootOption = {
  id: string;
  title: string | null;
  description: string | null;
  parentValueObjectId: string | null;
  parentTitle: string | null;
};

type ProjectActivityItem = {
  id: string;
  title: string;
  statusCode: string | null;
  scheduleModeCode: string | null;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  projectPlanning: {
    nodeKind: "time_container";
    windowKind: "date_range" | "time_of_day";
    timeStart: string | null;
    timeEnd: string | null;
    timeZone: string | null;
  } | null;
  containsActivityIds: string[];
  containedByActivityIds: string[];
  recurrence: {
    id: string;
    frequencyCode: "daily" | "weekly" | "monthly";
    intervalCount: number;
    anchorDate: string;
    recurrenceBasisCode: string;
    endModeCode: string;
    untilDate: string | null;
    countLimit: number | null;
    statusCode: string;
    materializedOccurrenceCount: number;
    upcomingOccurrences: Array<{
      occurrenceOrdinal: number;
      occurrenceKey: string;
      scheduleModeCode: "date_only" | "date_range";
      scheduledDate: string | null;
      scheduleStartDate: string | null;
      scheduleEndDate: string | null;
      activityEventId: string;
      statusCode: string;
    }>;
  } | null;
};

type ProjectItem = {
  id: string;
  title: string;
  description: string | null;
  projectModeCode: string;
  statusCode: string;
  timezone: string;
  currencyCode: string | null;
  createdAt: string;
  updatedAt: string;
  rootValueObject: {
    id: string;
    title: string | null;
    parentValueObjectId: string | null;
  };
  activities: ProjectActivityItem[];
};

type ProjectsPayload = {
  ok?: boolean;
  projects?: ProjectItem[];
  eligibleRoots?: RootOption[];
  error?: string;
};

type ValueObjectCatalogRow = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  parent_value_object_id?: unknown;
  scope_code?: unknown;
  ontology_node_role_code?: unknown;
  visibility_code?: unknown;
  visibility?: unknown;
  status?: unknown;
};

type ValueObjectCatalogPayload = {
  ok?: boolean;
  valueObjects?: ValueObjectCatalogRow[];
  error?: string;
};

type ProjectCreatePayload = {
  ok?: boolean;
  project?: ProjectItem;
  error?: string;
};

type ProjectTaskQuickCaptureResponse = {
  ok?: boolean;
  error?: string;
  recurrenceRule?: unknown;
  result?: {
    activityEventIds?: string[];
  } | null;
};

type ProjectTaskCaptureCopy = {
  title: string;
  placeholder: string;
  sending: string;
  send: string;
  error: string;
  close: string;
};

type Copy = {
  pageTitle: string;
  pageSubtitle: string;
  newProject: string;
  chooseProject: string;
  loading: string;
  loadError: string;
  projectLabel: string;
  titlePlaceholder: string;
  leafPlaceholder: string;
  leafNoMatches: string;
  leafRequired: string;
  addObservationObject: string;
  addTask: string;
  addDateWindow: string;
  addTimeWindow: string;
  timeWindowLabel: string;
  dateWindowDefaultTitle: string;
  timeWindowDefaultTitle: string;
  createWindow: string;
  taskLabel: string;
  unscheduledLabel: string;
  save: string;
  saving: string;
  saved: string;
  createError: string;
};

const EN: Copy = {
  pageTitle: "Project map",
  pageSubtitle:
    "Start with the central block: enter the project name and choose the linked leaf observation object.",
  newProject: "New project",
  chooseProject: "Choose project",
  loading: "Loading project map…",
  loadError: "Could not load projects.",
  projectLabel: "PROJECT",
  titlePlaceholder: "Project name",
  leafPlaceholder: "Choose linked leaf observation object",
  leafNoMatches: "No matching leaf objects",
  leafRequired: "Choose a linked leaf observation object",
  addObservationObject: "Add new observation object",
  addTask: "Add task",
  addDateWindow: "Add date window",
  addTimeWindow: "Add time-of-day window",
  timeWindowLabel: "TIME WINDOW",
  dateWindowDefaultTitle: "Date window",
  timeWindowDefaultTitle: "Time window",
  createWindow: "Create window",
  taskLabel: "TASK",
  unscheduledLabel: "No exact time",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  createError: "Could not save the project.",
};

const PROJECT_TASK_CAPTURE_COPY: Record<LocaleCode, ProjectTaskCaptureCopy> = {
  en: {
    title: "Add task",
    placeholder: "What needs to be done?",
    sending: "Saving activity…",
    send: "Send",
    error: "Could not add the task.",
    close: "Close",
  },
  ru: {
    title: "Добавить задачу",
    placeholder: "Что нужно сделать?",
    sending: "Сохраняю активность…",
    send: "Отправить",
    error: "Не удалось добавить задачу.",
    close: "Закрыть",
  },
  uk: {
    title: "Додати завдання",
    placeholder: "Що потрібно зробити?",
    sending: "Зберігаю активність…",
    send: "Надіслати",
    error: "Не вдалося додати завдання.",
    close: "Закрити",
  },
  pl: {
    title: "Dodaj zadanie",
    placeholder: "Co trzeba zrobić?",
    sending: "Zapisywanie aktywności…",
    send: "Wyślij",
    error: "Nie udało się dodać zadania.",
    close: "Zamknij",
  },
  de: {
    title: "Aufgabe hinzufügen",
    placeholder: "Was muss erledigt werden?",
    sending: "Aktivität wird gespeichert…",
    send: "Senden",
    error: "Die Aufgabe konnte nicht hinzugefügt werden.",
    close: "Schließen",
  },
  es: {
    title: "Añadir tarea",
    placeholder: "¿Qué hay que hacer?",
    sending: "Guardando actividad…",
    send: "Enviar",
    error: "No se pudo añadir la tarea.",
    close: "Cerrar",
  },
  cs: {
    title: "Přidat úkol",
    placeholder: "Co je potřeba udělat?",
    sending: "Ukládání aktivity…",
    send: "Odeslat",
    error: "Úkol se nepodařilo přidat.",
    close: "Zavřít",
  },
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: {
    ...EN,
    pageTitle: "Карта проекта",
    pageSubtitle:
      "Начните с центрального блока — задайте название проекта и выберите связанный листовой объект наблюдения.",
    newProject: "Новый проект",
    chooseProject: "Выберите проект",
    loading: "Загружаю карту проекта…",
    loadError: "Не удалось загрузить проекты.",
    projectLabel: "ПРОЕКТ",
    titlePlaceholder: "Название проекта",
    leafPlaceholder: "Выберите связанный листовой ОН",
    leafNoMatches: "Подходящие листовые ОН не найдены",
    leafRequired: "Выберите связанный листовой ОН",
    addObservationObject: "Добавить новый объект наблюдения",
    addTask: "Добавить задачу",
    addDateWindow: "Добавить временное окно по датам",
    addTimeWindow: "Добавить временное окно по часам",
    timeWindowLabel: "ВРЕМЕННОЕ ОКНО",
    dateWindowDefaultTitle: "Период по датам",
    timeWindowDefaultTitle: "Промежуток по часам",
    createWindow: "Создать окно",
    taskLabel: "ЗАДАЧА",
    unscheduledLabel: "Без точного времени",
    save: "Сохранить",
    saving: "Сохраняю…",
    saved: "Сохранено",
    createError: "Не удалось сохранить проект.",
  },
  uk: {
    ...EN,
    pageTitle: "Карта проєкту",
    pageSubtitle:
      "Почніть із центрального блока — задайте назву проєкту та виберіть пов’язаний листовий об’єкт спостереження.",
    newProject: "Новий проєкт",
    chooseProject: "Оберіть проєкт",
    loading: "Завантажую карту проєкту…",
    loadError: "Не вдалося завантажити проєкти.",
    projectLabel: "ПРОЄКТ",
    titlePlaceholder: "Назва проєкту",
    leafPlaceholder: "Оберіть пов’язаний листовий ОН",
    leafNoMatches: "Відповідні листові ОН не знайдено",
    leafRequired: "Оберіть пов’язаний листовий ОН",
    addObservationObject: "Додати новий об’єкт спостереження",
    addTask: "Додати завдання",
    taskLabel: "ЗАВДАННЯ",
    unscheduledLabel: "Без точного часу",
    save: "Зберегти",
    saving: "Зберігаю…",
    saved: "Збережено",
    createError: "Не вдалося зберегти проєкт.",
  },
  pl: {
    ...EN,
    pageTitle: "Mapa projektu",
    pageSubtitle:
      "Zacznij od centralnego bloku — wpisz nazwę projektu i wybierz powiązany liściowy obiekt obserwacji.",
    newProject: "Nowy projekt",
    chooseProject: "Wybierz projekt",
    loading: "Ładowanie mapy projektu…",
    loadError: "Nie udało się załadować projektów.",
    projectLabel: "PROJEKT",
    titlePlaceholder: "Nazwa projektu",
    leafPlaceholder: "Wybierz powiązany liściowy obiekt obserwacji",
    leafNoMatches: "Brak pasujących obiektów liściowych",
    leafRequired: "Wybierz powiązany obiekt liściowy",
    addObservationObject: "Dodaj nowy obiekt obserwacji",
    addTask: "Dodaj zadanie",
    taskLabel: "ZADANIE",
    unscheduledLabel: "Bez dokładnej godziny",
    save: "Zapisz",
    saving: "Zapisywanie…",
    saved: "Zapisano",
    createError: "Nie udało się zapisać projektu.",
  },
  de: {
    ...EN,
    pageTitle: "Projektkarte",
    newProject: "Neues Projekt",
    chooseProject: "Projekt wählen",
    projectLabel: "PROJEKT",
    titlePlaceholder: "Projektname",
    leafPlaceholder: "Verknüpftes Blatt-Beobachtungsobjekt wählen",
    addObservationObject: "Neues Beobachtungsobjekt hinzufügen",
    addTask: "Aufgabe hinzufügen",
    taskLabel: "AUFGABE",
    unscheduledLabel: "Ohne genaue Zeit",
    save: "Speichern",
    saving: "Speichern…",
    saved: "Gespeichert",
  },
  es: {
    ...EN,
    pageTitle: "Mapa del proyecto",
    newProject: "Nuevo proyecto",
    chooseProject: "Elegir proyecto",
    projectLabel: "PROYECTO",
    titlePlaceholder: "Nombre del proyecto",
    leafPlaceholder: "Elegir objeto de observación hoja vinculado",
    addObservationObject: "Añadir nuevo objeto de observación",
    addTask: "Añadir tarea",
    taskLabel: "TAREA",
    unscheduledLabel: "Sin hora exacta",
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado",
  },
  cs: {
    ...EN,
    pageTitle: "Mapa projektu",
    newProject: "Nový projekt",
    chooseProject: "Vybrat projekt",
    projectLabel: "PROJEKT",
    titlePlaceholder: "Název projektu",
    leafPlaceholder: "Vyberte propojený listový objekt pozorování",
    addObservationObject: "Přidat nový objekt pozorování",
    addTask: "Přidat úkol",
    taskLabel: "ÚKOL",
    unscheduledLabel: "Bez přesného času",
    save: "Uložit",
    saving: "Ukládání…",
    saved: "Uloženo",
  },
};

function normalizeLocale(value: string): LocaleCode {
  const locale = value.trim().toLowerCase();
  return ["ru", "pl", "en", "es", "uk", "de", "cs"].includes(locale)
    ? (locale as LocaleCode)
    : "en";
}

function localeHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isPersonalLeaf(row: ValueObjectCatalogRow) {
  const visibility =
    textValue(row.visibility_code) ?? textValue(row.visibility) ?? "private";

  return (
    textValue(row.id) !== null &&
    textValue(row.scope_code) === "actor" &&
    textValue(row.ontology_node_role_code) === "leaf" &&
    textValue(row.status) === "active" &&
    visibility === "private"
  );
}

const PROJECT_DRAFT_STORAGE_KEY =
  "arctor.project-planning.central-draft.v1";
const PROJECTS_CHANGED_EVENT = "arctor:projects-changed";

function createProjectTaskCaptureRequestId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `project-task-${globalThis.crypto.randomUUID()}`;
  }

  return `project-task-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function writeProjectDraft(title: string) {
  try {
    window.sessionStorage.setItem(
      PROJECT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        title,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // The project still works when transient browser storage is unavailable.
  }
}

function readProjectDraftTitle(): string | null {
  try {
    const raw = window.sessionStorage.getItem(PROJECT_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      title?: unknown;
      savedAt?: unknown;
    };

    if (typeof parsed.title !== "string") {
      return null;
    }

    return parsed.title;
  } catch {
    return null;
  }
}

function clearProjectDraft() {
  try {
    window.sessionStorage.removeItem(PROJECT_DRAFT_STORAGE_KEY);
  } catch {
    // No-op when browser storage is unavailable.
  }
}

function normalizedText(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function rootDisplay(option: RootOption | null | undefined) {
  if (!option) return "";
  const title = option.title?.trim() || option.id;
  const parent = option.parentTitle?.trim();

  return parent ? `${parent} → ${title}` : title;
}

function projectActivityRecurrenceLabel(
  activity: ProjectActivityItem,
  locale: LocaleCode,
) {
  const recurrence = activity.recurrence;
  if (!recurrence) return null;

  if (recurrence.intervalCount === 1) {
    const single: Record<
      LocaleCode,
      Record<"daily" | "weekly" | "monthly", string>
    > = {
      ru: {
        daily: "Каждый день",
        weekly: "Каждую неделю",
        monthly: "Каждый месяц",
      },
      uk: {
        daily: "Щодня",
        weekly: "Щотижня",
        monthly: "Щомісяця",
      },
      pl: {
        daily: "Codziennie",
        weekly: "Co tydzień",
        monthly: "Co miesiąc",
      },
      en: {
        daily: "Every day",
        weekly: "Every week",
        monthly: "Every month",
      },
      de: {
        daily: "Jeden Tag",
        weekly: "Jede Woche",
        monthly: "Jeden Monat",
      },
      es: {
        daily: "Cada día",
        weekly: "Cada semana",
        monthly: "Cada mes",
      },
      cs: {
        daily: "Každý den",
        weekly: "Každý týden",
        monthly: "Každý měsíc",
      },
    };

    return single[locale][recurrence.frequencyCode];
  }

  const units: Record<
    LocaleCode,
    Record<"daily" | "weekly" | "monthly", string>
  > = {
    ru: { daily: "дн.", weekly: "нед.", monthly: "мес." },
    uk: { daily: "дн.", weekly: "тиж.", monthly: "міс." },
    pl: { daily: "dni", weekly: "tyg.", monthly: "mies." },
    en: { daily: "days", weekly: "weeks", monthly: "months" },
    de: { daily: "Tage", weekly: "Wochen", monthly: "Monate" },
    es: { daily: "días", weekly: "sem.", monthly: "meses" },
    cs: { daily: "dní", weekly: "týd.", monthly: "měs." },
  };

  return locale === "en"
    ? `Every ${recurrence.intervalCount} ${units[locale][recurrence.frequencyCode]}`
    : `${recurrence.intervalCount} × ${units[locale][recurrence.frequencyCode]}`;
}

function projectActivityTimingLabel(
  activity: ProjectActivityItem,
  copy: Copy,
  locale: LocaleCode,
) {
  const recurrenceLabel = projectActivityRecurrenceLabel(activity, locale);
  if (
    activity.projectPlanning?.nodeKind === "time_container" &&
    activity.projectPlanning.windowKind === "time_of_day"
  ) {
    const clockLabel = [
      activity.projectPlanning.timeStart,
      activity.projectPlanning.timeEnd,
    ].filter(Boolean).join(" → ");
    return recurrenceLabel && clockLabel
      ? `${recurrenceLabel} · ${clockLabel}`
      : recurrenceLabel ?? clockLabel ?? copy.unscheduledLabel;
  }

  let scheduleLabel: string | null = null;

  if (
    activity.scheduleModeCode === "date_only" &&
    activity.scheduledDate
  ) {
    scheduleLabel = activity.scheduledDate;
  } else if (
    activity.scheduleModeCode === "date_range" &&
    activity.scheduleStartDate &&
    activity.scheduleEndDate
  ) {
    scheduleLabel = `${activity.scheduleStartDate} → ${activity.scheduleEndDate}`;
  } else if (
    activity.scheduleModeCode === "deadline" &&
    activity.deadlineAt
  ) {
    scheduleLabel = `≤ ${new Date(activity.deadlineAt).toLocaleString()}`;
  } else if (
    activity.scheduleModeCode === "exact" &&
    activity.startedAt
  ) {
    scheduleLabel = new Date(activity.startedAt).toLocaleString();
  }

  if (recurrenceLabel && scheduleLabel) {
    return `${recurrenceLabel} · ${scheduleLabel}`;
  }

  return recurrenceLabel ?? scheduleLabel ?? copy.unscheduledLabel;
}

function projectActivityOccurrenceLabel(
  occurrence: NonNullable<ProjectActivityItem["recurrence"]>["upcomingOccurrences"][number],
) {
  if (occurrence.scheduleModeCode === "date_only") {
    return occurrence.scheduledDate ?? "—";
  }

  return [occurrence.scheduleStartDate, occurrence.scheduleEndDate]
    .filter(Boolean)
    .join(" → ");
}

type ProjectCenterData = Record<string, unknown> & {
  copy: Copy;
  title: string;
  rootQuery: string;
  selectedRoot: RootOption | null;
  filteredRoots: RootOption[];
  rootDropdownOpen: boolean;
  readonlyMode: boolean;
  saveDisabled: boolean;
  saving: boolean;
  saveError: string | null;
  onTitleChange: (value: string) => void;
  onRootQueryChange: (value: string) => void;
  onRootFocus: () => void;
  onRootToggle: () => void;
  onRootSelect: (option: RootOption) => void;
  onAddObservationObject: () => void;
  onAddTask: () => void;
  onAddDateWindow: () => void;
  onAddTimeWindow: () => void;
};

type ProjectCenterNode = Node<ProjectCenterData, "project-center">;

type ProjectActivityNodeData = Record<string, unknown> & {
  copy: Copy;
  locale: LocaleCode;
  activity: ProjectActivityItem;
  containedActivities: ProjectActivityItem[];
  onOpenActivity: (
    activityEventId: string,
    isRecurrenceDefinition: boolean,
  ) => void;
  onAddContainedTask: (containerActivityEventId: string) => void;
};

type ProjectActivityNode = Node<
  ProjectActivityNodeData,
  "project-activity"
>;

function ProjectActivityCard({
  data,
}: NodeProps<ProjectActivityNode>) {
  if (data.activity.projectPlanning?.nodeKind === "time_container") {
    const planning = data.activity.projectPlanning;
    const windowLabel =
      planning.windowKind === "time_of_day"
        ? [planning.timeStart, planning.timeEnd].filter(Boolean).join(" → ")
        : projectActivityTimingLabel(data.activity, data.copy, data.locale);

    return (
      <div className="relative min-h-[210px] w-[610px] rounded-[26px] border-2 border-dashed border-[#8fa5f6] bg-[#f7f9ff] px-5 py-4 shadow-[0_18px_44px_rgba(63,91,170,0.12)]">
        <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-[#7895ff]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#5174ef]">{data.copy.timeWindowLabel}</div>
            <button type="button" onClick={() => data.onOpenActivity(data.activity.id, Boolean(data.activity.recurrence))} className="mt-1 block max-w-[470px] truncate text-left text-[13px] font-extrabold text-[#27324d] hover:text-[#315ee7]">{data.activity.title}</button>
            <div className="mt-1 text-[10px] font-semibold text-[#7180a2]">{windowLabel || data.copy.unscheduledLabel}</div>
          </div>
          <button type="button" onClick={() => data.onAddContainedTask(data.activity.id)} title={data.copy.addTask} aria-label={data.copy.addTask} className="nodrag nopan flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#b9c8ff] bg-white text-lg font-bold text-[#315ee7] shadow-sm hover:bg-[#eef2ff]">+</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.containedActivities.length > 0 ? data.containedActivities.map((child) => (
            <button key={child.id} type="button" onClick={() => data.onOpenActivity(child.id, Boolean(child.recurrence))} className="rounded-xl border border-[#dce3f7] bg-white px-3 py-2.5 text-left shadow-sm hover:border-[#aebfff] hover:bg-[#fbfcff]">
              <div className="truncate text-[11px] font-bold text-[#313a54]">{child.title}</div>
              <div className="mt-1 truncate text-[9px] font-medium text-[#7b849d]">{projectActivityTimingLabel(child, data.copy, data.locale)}</div>
            </button>
          )) : (
            <div className="col-span-2 rounded-xl border border-dashed border-[#dce3f7] bg-white/70 px-3 py-5 text-center text-[10px] font-semibold text-[#9aa4bf]">{data.copy.addTask}</div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-[#7895ff]" />
      </div>
    );
  }

  return (
    <div className="relative w-[300px] rounded-[22px] border border-[#cfd8f7] bg-white px-4 py-3.5 shadow-[0_14px_34px_rgba(63,91,170,0.12)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-[#9baadc]"
      />

      <div className="flex items-center gap-2 text-[#5174ef]">
        <ListChecks size={15} />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.15em]">
          {data.copy.taskLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          data.onOpenActivity(
            data.activity.id,
            Boolean(data.activity.recurrence),
          )
        }
        className="mt-2.5 block w-full text-left text-[12px] font-bold leading-5 text-[#29324a] hover:text-[#315ee7]"
      >
        {data.activity.title}
      </button>

      <button
        type="button"
        onClick={() =>
          data.onOpenActivity(
            data.activity.id,
            Boolean(data.activity.recurrence),
          )
        }
        className="mt-2 block text-left text-[10px] font-medium text-[#7b849d] hover:text-[#315ee7]"
      >
        {projectActivityTimingLabel(data.activity, data.copy, data.locale)}
      </button>

      {data.activity.recurrence?.upcomingOccurrences?.length ? (
        <div className="mt-2 space-y-1 rounded-xl border border-[#edf0f7] bg-[#fafbff] px-2.5 py-2">
          {data.activity.recurrence.upcomingOccurrences
            .slice(0, 3)
            .map((occurrence) => (
              <button
                key={occurrence.occurrenceKey}
                type="button"
                onClick={() =>
                  data.onOpenActivity(
                    occurrence.activityEventId,
                    false,
                  )
                }
                className="block w-full rounded-md px-1 py-0.5 text-left text-[9px] font-semibold text-[#7b849d] hover:bg-[#eef2ff] hover:text-[#315ee7]"
              >
                #{occurrence.occurrenceOrdinal} · {projectActivityOccurrenceLabel(occurrence)}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function ProjectCenterCard({ data }: NodeProps<ProjectCenterNode>) {
  return (
    <div className="relative w-[510px] rounded-[26px] border-2 border-[#6f8fff] bg-white px-5 py-4 shadow-[0_18px_46px_rgba(63,91,170,0.16)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-[#8fa2d7]"
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#5174ef]">
          <Network size={18} strokeWidth={2} />
          <span className="text-[13px] font-extrabold uppercase tracking-[0.16em]">
            {data.copy.projectLabel}
          </span>
        </div>

        <button
          type="button"
          disabled
          aria-label="expand"
          className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-[#e0e5ef] bg-white text-[#8791aa] shadow-sm"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <div className="nodrag nopan space-y-3">
        <input
          value={data.title}
          onChange={(event) => data.onTitleChange(event.target.value)}
          readOnly={data.readonlyMode}
          maxLength={240}
          placeholder={data.copy.titlePlaceholder}
          className="nodrag nopan nowheel w-full rounded-[18px] border border-[#dbe1ed] bg-[#fbfcff] px-4 py-3 text-[13px] font-medium text-[#26304a] shadow-inner outline-none transition placeholder:text-[#aeb6c9] focus:border-[#8ba2ff] focus:bg-white read-only:cursor-default read-only:bg-[#f8fafc]"
        />

        <div className="relative">
          <div
            className={`flex w-full items-center gap-2 rounded-[18px] border bg-[#fbfcff] px-4 py-3 shadow-inner transition ${
              data.rootDropdownOpen
                ? "border-[#8ba2ff] bg-white"
                : "border-[#dbe1ed]"
            }`}
          >
            <Search size={16} className="shrink-0 text-[#8d98b2]" />

            <input
              value={
                data.selectedRoot && !data.rootDropdownOpen
                  ? rootDisplay(data.selectedRoot)
                  : data.rootQuery
              }
              onChange={(event) => data.onRootQueryChange(event.target.value)}
              onFocus={data.onRootFocus}
              readOnly={data.readonlyMode}
              placeholder={data.copy.leafPlaceholder}
              className="nodrag nopan nowheel min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#26304a] outline-none placeholder:text-[#aeb6c9] read-only:cursor-default"
            />

            {!data.readonlyMode ? (
              <button
                type="button"
                onClick={data.onRootToggle}
                className="nodrag nopan flex h-6 w-6 items-center justify-center rounded-full text-[#7d88a2] hover:bg-[#eef2fb]"
                aria-label={data.copy.leafPlaceholder}
              >
                <ChevronDown
                  size={15}
                  className={`transition-transform ${
                    data.rootDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            ) : null}
          </div>

          {!data.readonlyMode && data.rootDropdownOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[300px] overflow-y-auto rounded-[18px] border border-[#dde3ef] bg-white p-1.5 shadow-[0_18px_46px_rgba(51,65,105,0.18)]">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  data.onAddObservationObject();
                }}
                className="nodrag nopan mb-1 flex w-full items-center gap-2 rounded-[13px] border border-[#dce4ff] bg-[#f4f7ff] px-3 py-2.5 text-left transition hover:bg-[#eaf0ff]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a73ff] text-white">
                  <Plus size={13} />
                </span>
                <span className="text-[12px] font-extrabold text-[#3f5fca]">
                  {data.copy.addObservationObject}
                </span>
              </button>

              <div className="my-1 h-px bg-[#edf0f6]" />

              {data.filteredRoots.length > 0 ? (
                data.filteredRoots.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      data.onRootSelect(option);
                    }}
                    className="nodrag nopan flex w-full items-start gap-2 rounded-[13px] px-3 py-2.5 text-left transition hover:bg-[#f2f5ff]"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6f8fff]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-bold text-[#30384e]">
                        {option.title || option.id}
                      </span>
                      {option.parentTitle ? (
                        <span className="mt-0.5 block truncate text-[10px] text-[#8a92a6]">
                          {option.parentTitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[11px] text-[#8a92a6]">
                  {data.copy.leafNoMatches}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {data.saveError ? (
          <div className="rounded-[14px] border border-[#f0c5cf] bg-[#fff7f8] px-3 py-2 text-[10px] leading-4 text-[#b43e56]">
            {data.saveError}
          </div>
        ) : null}
      </div>

      {data.readonlyMode ? (
        <div className="nodrag nopan absolute -right-4 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <button type="button" onClick={data.onAddTask} title={data.copy.addTask} aria-label={data.copy.addTask} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-base font-bold text-[#315ee7] shadow-md hover:bg-[#eef2ff]">+</button>
          <button type="button" onClick={data.onAddDateWindow} title={data.copy.addDateWindow} aria-label={data.copy.addDateWindow} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]">↔</button>
          <button type="button" onClick={data.onAddTimeWindow} title={data.copy.addTimeWindow} aria-label={data.copy.addTimeWindow} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]">↕</button>
        </div>
      ) : null}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-[#8fa2d7]"
      />
    </div>
  );
}

const NODE_TYPES = {
  "project-center": ProjectCenterCard,
  "project-activity": ProjectActivityCard,
};

export default function ProjectMapStartClient({
  initialLocale,
}: {
  initialLocale: string;
}) {
  const locale = normalizeLocale(initialLocale);
  const copy = COPY[locale];
  const taskCaptureCopy = PROJECT_TASK_CAPTURE_COPY[locale];
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("project");
  const resumeProjectDraft =
    searchParams.get("resumeProjectDraft") === "1";
  const blurTimerRef = useRef<number | null>(null);

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [eligibleRoots, setEligibleRoots] = useState<RootOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedActivityDetail, setSelectedActivityDetail] =
    useState<Cux6ShelfItem | null>(null);
  const [selectedActivityInitialEditing, setSelectedActivityInitialEditing] =
    useState(false);
  const [taskCaptureOpen, setTaskCaptureOpen] = useState(false);
  const [taskCaptureText, setTaskCaptureText] = useState("");
  const [taskCaptureSubmitting, setTaskCaptureSubmitting] = useState(false);
  const [taskCaptureError, setTaskCaptureError] = useState<string | null>(null);
  const [taskCaptureParentActivityId, setTaskCaptureParentActivityId] =
    useState<string | null>(null);
  const [windowCaptureKind, setWindowCaptureKind] =
    useState<"date_range" | "time_of_day" | null>(null);
  const [windowCaptureTitle, setWindowCaptureTitle] = useState("");
  const [windowDateStart, setWindowDateStart] = useState("");
  const [windowDateEnd, setWindowDateEnd] = useState("");
  const [windowTimeStart, setWindowTimeStart] = useState("");
  const [windowTimeEnd, setWindowTimeEnd] = useState("");
  const [windowCaptureSaving, setWindowCaptureSaving] = useState(false);
  const [windowCaptureError, setWindowCaptureError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [rootQuery, setRootQuery] = useState("");
  const [selectedRootId, setSelectedRootId] = useState("");
  const [rootDropdownOpen, setRootDropdownOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const selectedRoot = useMemo(
    () =>
      eligibleRoots.find((option) => option.id === selectedRootId) ?? null,
    [eligibleRoots, selectedRootId],
  );

  const filteredRoots = useMemo(() => {
    const query = normalizedText(rootQuery);

    if (!query) return eligibleRoots.slice(0, 40);

    return eligibleRoots
      .filter((option) => {
        const haystack = [
          option.title,
          option.parentTitle,
          option.description,
        ]
          .map(normalizedText)
          .join(" ");

        return haystack.includes(query);
      })
      .slice(0, 40);
  }, [eligibleRoots, rootQuery]);

  async function loadProjects(
    preferredProjectId?: string,
    draftTitle?: string,
    options?: { background?: boolean },
  ) {
    const background = options?.background === true;

    if (!background) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const [projectsResponse, valueObjectsResponse] = await Promise.all([
        fetch(`/api/projects?locale=${encodeURIComponent(locale)}`, {
          cache: "no-store",
        }),
        fetch(`/api/value-objects?locale=${encodeURIComponent(locale)}`, {
          cache: "no-store",
        }),
      ]);

      const payload = (await projectsResponse.json().catch(() => null)) as
        | ProjectsPayload
        | null;
      const valueObjectsPayload = (await valueObjectsResponse
        .json()
        .catch(() => null)) as ValueObjectCatalogPayload | null;

      if (!projectsResponse.ok || payload?.ok !== true) {
        throw new Error(payload?.error || copy.loadError);
      }

      if (!valueObjectsResponse.ok || valueObjectsPayload?.ok !== true) {
        throw new Error(valueObjectsPayload?.error || copy.loadError);
      }

      const nextProjects = payload.projects ?? [];
      const catalog = valueObjectsPayload.valueObjects ?? [];
      const byId = new Map(
        catalog
          .map((row) => [textValue(row.id), row] as const)
          .filter(
            (entry): entry is readonly [string, ValueObjectCatalogRow] =>
              Boolean(entry[0]),
          ),
      );

      const nextRoots = catalog
        .filter(isPersonalLeaf)
        .map((row): RootOption => {
          const id = textValue(row.id) as string;
          const parentValueObjectId = textValue(row.parent_value_object_id);
          const parent = parentValueObjectId
            ? byId.get(parentValueObjectId)
            : undefined;

          return {
            id,
            title: textValue(row.title),
            description: textValue(row.description),
            parentValueObjectId,
            parentTitle: textValue(parent?.title),
          };
        })
        .sort((left, right) =>
          rootDisplay(left).localeCompare(rootDisplay(right), locale),
        );

      setProjects(nextProjects);
      setEligibleRoots(nextRoots);

      if (draftTitle !== undefined) {
        setSelectedProjectId(null);
        setCreating(true);
        setSaved(false);
        setTitle(draftTitle);
        setSelectedRootId("");
        setRootQuery("");
        setRootDropdownOpen(false);
      } else {
        const nextSelectedId =
          preferredProjectId &&
          nextProjects.some((item) => item.id === preferredProjectId)
            ? preferredProjectId
            : nextProjects[0]?.id ?? null;

        setSelectedProjectId(nextSelectedId);

        if (nextSelectedId) {
          const project =
            nextProjects.find((item) => item.id === nextSelectedId) ?? null;

          if (project) {
            setCreating(false);
            setSaved(true);
            setTitle(project.title);
            setSelectedRootId(project.rootValueObject.id);
            const localizedRoot = nextRoots.find(
              (option) => option.id === project.rootValueObject.id,
            );
            setRootQuery(
              localizedRoot?.title ?? project.rootValueObject.title ?? "",
            );
          }
        } else {
          setCreating(true);
          setSaved(false);
        }
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : copy.loadError);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const browserTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (browserTimezone) {
          setTimezone(browserTimezone);
        }
      } catch {
        // UTC is the safe fallback.
      }

      const draftTitle = resumeProjectDraft
        ? readProjectDraftTitle()
        : null;

      void loadProjects(
        requestedProjectId ?? undefined,
        draftTitle ?? undefined,
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);

      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };

    // Initial load is intentionally tied to the route locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, requestedProjectId, resumeProjectDraft]);

  useEffect(() => {
    function handleProjectActivityCreated(event: Event) {
      const detail = (
        event as CustomEvent<{
          projectContextId?: string;
          activityEventId?: string | null;
        }>
      ).detail;

      if (
        !selectedProjectId ||
        detail?.projectContextId !== selectedProjectId
      ) {
        return;
      }

      void loadProjects(
        selectedProjectId,
        undefined,
        { background: true },
      );
    }

    window.addEventListener(
      "arctor:project-activity-created",
      handleProjectActivityCreated,
    );

    return () => {
      window.removeEventListener(
        "arctor:project-activity-created",
        handleProjectActivityCreated,
      );
    };

    // This listener must always reload the currently selected project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  function beginNewProject() {
    clearProjectDraft();
    setCreating(true);
    setSaved(false);
    setSaveError(null);
    setTitle("");
    setRootQuery("");
    setSelectedRootId("");
    setRootDropdownOpen(false);
    setSelectedProjectId(null);
  }

  function showProject(projectId: string) {
    clearProjectDraft();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    setCreating(false);
    setSaved(true);
    setSaveError(null);
    setSelectedProjectId(project.id);
    setTitle(project.title);
    setSelectedRootId(project.rootValueObject.id);
    setRootQuery(project.rootValueObject.title ?? "");
    setRootDropdownOpen(false);
  }

  function handleRootQueryChange(value: string) {
    setSaved(false);
    setRootQuery(value);
    setSelectedRootId("");
    setRootDropdownOpen(true);
  }

  function handleRootFocus() {
    if (!creating) return;

    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }

    setRootDropdownOpen(true);
  }

  function handleRootToggle() {
    if (!creating) return;
    setRootDropdownOpen((value) => !value);
  }

  function handleRootSelect(option: RootOption) {
    setSelectedRootId(option.id);
    setRootQuery(option.title ?? option.id);
    setRootDropdownOpen(false);
    setSaved(false);
  }

  function addObservationObject() {
    writeProjectDraft(title);
    setRootDropdownOpen(false);
    router.push(
      localeHref(
        "/value-objects/new/personal-leaf?resumeProjectDraft=1",
        locale,
      ),
    );
  }

  const openProjectActivity = useCallback(async (
    activityEventId: string,
    isRecurrenceDefinition: boolean,
  ) => {
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(activityEventId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; activity?: Cux6ShelfItem | null }
        | null;
      if (!response.ok || payload?.ok !== true || !payload.activity) {
        throw new Error(payload?.error || copy.loadError);
      }
      setSelectedActivityInitialEditing(false);
      setSelectedActivityDetail({
        ...payload.activity,
        isRecurrenceDefinition,
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : copy.loadError);
    }
  }, [copy.loadError]);

  const openTaskCapture = useCallback((parentActivityEventId: string | null = null) => {
    if (!selectedProject) return;
    setTaskCaptureParentActivityId(parentActivityEventId);
    setTaskCaptureText("");
    setTaskCaptureError(null);
    setTaskCaptureOpen(true);
  }, [selectedProject]);

  function addProjectActivity() {
    openTaskCapture(null);
  }

  function openWindowCapture(kind: "date_range" | "time_of_day") {
    if (!selectedProject) return;
    setWindowCaptureKind(kind);
    setWindowCaptureTitle(kind === "date_range" ? copy.dateWindowDefaultTitle : copy.timeWindowDefaultTitle);
    setWindowDateStart("");
    setWindowDateEnd("");
    setWindowTimeStart("");
    setWindowTimeEnd("");
    setWindowCaptureError(null);
  }

  async function submitWindowCapture() {
    const project = selectedProject;
    const kind = windowCaptureKind;
    if (!project || !kind || windowCaptureSaving) return;
    setWindowCaptureSaving(true);
    setWindowCaptureError(null);
    try {
      const response = await fetch("/api/projects/time-containers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          projectContextId: project.id,
          title: windowCaptureTitle.trim(),
          windowKind: kind,
          dateStart: windowDateStart || null,
          dateEnd: windowDateEnd || null,
          timeStart: windowTimeStart || null,
          timeEnd: windowTimeEnd || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || copy.createError);
      setWindowCaptureKind(null);
      await loadProjects(project.id, undefined, { background: true });
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      setWindowCaptureError(error instanceof Error ? error.message : copy.createError);
    } finally {
      setWindowCaptureSaving(false);
    }
  }

  async function submitProjectTaskCapture() {
    const project = selectedProject;
    const inputText = taskCaptureText.trim();

    if (!project || !inputText || taskCaptureSubmitting) {
      return;
    }

    setTaskCaptureSubmitting(true);
    setTaskCaptureError(null);

    try {
      const response = await fetch("/api/activity/quick-capture", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          inputText,
          locale,
          timeZone: timezone,
          temporalDirection: "future",
          clientRequestId: createProjectTaskCaptureRequestId(),
          projectContextId: project.id,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ProjectTaskQuickCaptureResponse
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || taskCaptureCopy.error);
      }

      const activityEventId =
        payload.result?.activityEventIds?.find(
          (value) => typeof value === "string" && value.trim(),
        ) ?? null;

      if (!activityEventId) {
        throw new Error("Created activity id was not returned.");
      }

      if (taskCaptureParentActivityId) {
        const containmentResponse = await fetch("/api/projects/activity-containment", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            projectContextId: project.id,
            containerActivityEventId: taskCaptureParentActivityId,
            childActivityEventId: activityEventId,
          }),
        });
        const containmentPayload = (await containmentResponse.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!containmentResponse.ok || containmentPayload?.ok !== true) {
          throw new Error(containmentPayload?.error ?? "Could not place the task inside the time container.");
        }
      }

      const detailResponse = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(activityEventId)}`,
        { cache: "no-store" },
      );
      const detailPayload = (await detailResponse.json().catch(() => null)) as
        | { ok?: boolean; error?: string; activity?: Cux6ShelfItem | null }
        | null;

      if (
        !detailResponse.ok ||
        detailPayload?.ok !== true ||
        !detailPayload.activity
      ) {
        throw new Error(detailPayload?.error || copy.loadError);
      }

      setSelectedActivityInitialEditing(true);
      setSelectedActivityDetail({
        ...detailPayload.activity,
        isRecurrenceDefinition: Boolean(payload.recurrenceRule),
      });
      setTaskCaptureOpen(false);
      setTaskCaptureText("");
      setTaskCaptureParentActivityId(null);

      void loadProjects(project.id, undefined, { background: true });
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      setTaskCaptureError(
        error instanceof Error ? error.message : taskCaptureCopy.error,
      );
    } finally {
      setTaskCaptureSubmitting(false);
    }
  }

  async function saveProject() {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || !selectedRootId || !creating) {
      if (!selectedRootId) setSaveError(copy.leafRequired);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: normalizedTitle,
          description: null,
          rootValueObjectId: selectedRootId,
          projectModeCode: "finite",
          timezone,
          currencyCode: null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ProjectCreatePayload
        | null;

      if (!response.ok || payload?.ok !== true || !payload.project) {
        throw new Error(payload?.error || copy.createError);
      }

      clearProjectDraft();
      setSaved(true);
      setCreating(false);
      await loadProjects(payload.project.id);

      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
      router.replace(
        localeHref(
          `/projects?project=${encodeURIComponent(payload.project.id)}`,
          locale,
        ),
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.createError);
    } finally {
      setSaving(false);
    }
  }

  const readonlyMode = !creating;

  const nodeData: ProjectCenterData = {
    copy,
    title,
    rootQuery,
    selectedRoot:
      selectedRoot ??
      (selectedProject
        ? {
            id: selectedProject.rootValueObject.id,
            title: selectedProject.rootValueObject.title,
            description: null,
            parentValueObjectId: selectedProject.rootValueObject.parentValueObjectId,
            parentTitle: null,
          }
        : null),
    filteredRoots,
    rootDropdownOpen,
    readonlyMode,
    saveDisabled:
      saving || !creating || !title.trim() || !selectedRootId,
    saving,
    saveError,
    onTitleChange: (value) => {
      setTitle(value);
      setSaved(false);
    },
    onRootQueryChange: handleRootQueryChange,
    onRootFocus: handleRootFocus,
    onRootToggle: handleRootToggle,
    onRootSelect: handleRootSelect,
    onAddObservationObject: addObservationObject,
    onAddTask: addProjectActivity,
    onAddDateWindow: () => openWindowCapture("date_range"),
    onAddTimeWindow: () => openWindowCapture("time_of_day"),
  };

  const nodes = useMemo<Node[]>(() => {
    const activities = selectedProject?.activities ?? [];
    const byId = new Map(activities.map((activity) => [activity.id, activity]));
    const containedIds = new Set(activities.flatMap((activity) => activity.containsActivityIds ?? []));
    const containers = activities.filter((activity) => activity.projectPlanning?.nodeKind === "time_container");
    const standalone = activities.filter((activity) => activity.projectPlanning?.nodeKind !== "time_container" && !containedIds.has(activity.id));

    const containerNodes = containers.map((activity, index) => ({
      id: `project-activity:${activity.id}`,
      type: "project-activity",
      position: { x: 40 + (index % 2) * 650, y: 525 + Math.floor(index / 2) * 285 },
      draggable: false,
      selectable: false,
      data: {
        copy, locale, activity,
        containedActivities: (activity.containsActivityIds ?? []).map((id) => byId.get(id)).filter((value): value is ProjectActivityItem => Boolean(value)),
        onOpenActivity: (activityEventId: string, isRecurrenceDefinition: boolean) => { void openProjectActivity(activityEventId, isRecurrenceDefinition); },
        onAddContainedTask: (containerActivityEventId: string) => openTaskCapture(containerActivityEventId),
      },
    }) as ProjectActivityNode);

    const standaloneBaseY = 525 + Math.ceil(containers.length / 2) * 285;
    const activityNodes = standalone.map((activity, index) => ({
      id: `project-activity:${activity.id}`,
      type: "project-activity",
      position: { x: 145 + (index % 3) * 335, y: standaloneBaseY + Math.floor(index / 3) * 145 },
      draggable: false,
      selectable: false,
      data: {
        copy, locale, activity, containedActivities: [],
        onOpenActivity: (activityEventId: string, isRecurrenceDefinition: boolean) => { void openProjectActivity(activityEventId, isRecurrenceDefinition); },
        onAddContainedTask: (containerActivityEventId: string) => openTaskCapture(containerActivityEventId),
      },
    }) as ProjectActivityNode);

    return [
      { id: "__project_center__", type: "project-center", position: { x: 390, y: 220 }, draggable: false, selectable: false, data: nodeData } as ProjectCenterNode,
      ...containerNodes,
      ...activityNodes,
    ];
  }, [copy, locale, nodeData, openProjectActivity, openTaskCapture, selectedProject]);

  const edges = useMemo<Edge[]>(
    () => {
      const activities = selectedProject?.activities ?? [];
      const containedIds = new Set(activities.flatMap((activity) => activity.containsActivityIds ?? []));
      return activities
        .filter((activity) => !containedIds.has(activity.id))
        .map((activity) => ({
          id: `project-to-activity:${activity.id}`,
          source: "__project_center__",
          target: `project-activity:${activity.id}`,
          type: "smoothstep",
          style: { stroke: "#c8d3f2", strokeWidth: 1.5 },
        }));
    },
    [selectedProject],
  );

  const flowKey = useMemo(
    () =>
      [
        selectedProjectId ?? "draft",
        ...(selectedProject?.activities ?? []).map(
          (activity) => [
            activity.id,
            ...(activity.containsActivityIds ?? []),
            ...(activity.containedByActivityIds ?? []),
          ].join(","),
        ),
      ].join(":"),
    [selectedProject, selectedProjectId],
  );

  if (loading) {
    return (
      <div className="min-h-full px-3 py-4 sm:px-5">
        <div className="mx-auto flex min-h-[420px] w-full max-w-[1220px] items-center justify-center rounded-[24px] border border-[#e0e5f0] bg-white text-[13px] text-[#8b91a7] shadow-sm">
          {copy.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-[1240px]">
        <header className="mb-4 rounded-[24px] border border-[#e0e5f0] bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Network size={20} className="text-[#5174ef]" />
                <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-[#161a2c]">
                  {copy.pageTitle}
                </h1>
              </div>
              <p className="mt-1 max-w-[780px] text-[12px] leading-5 text-[#767d96]">
                {copy.pageSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {projects.length > 0 && !creating ? (
                <select
                  value={selectedProjectId ?? ""}
                  onChange={(event) => showProject(event.target.value)}
                  className="min-w-[210px] rounded-[14px] border border-[#dce2ef] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#3d435b] outline-none focus:border-[#7895ff]"
                  aria-label={copy.chooseProject}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {!creating ? (
                <button
                  type="button"
                  onClick={addProjectActivity}
                  className="inline-flex items-center gap-1.5 rounded-[14px] border border-[#b9c8ff] bg-[#eef2ff] px-3.5 py-2.5 text-[11px] font-bold text-[#315ee7] transition hover:bg-[#e4eaff]"
                >
                  <ListChecks size={14} />
                  {copy.addTask}
                </button>
              ) : null}

              {!creating ? (
                <button
                  type="button"
                  onClick={beginNewProject}
                  className="inline-flex items-center gap-1.5 rounded-[14px] border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Plus size={14} />
                  {copy.newProject}
                </button>
              ) : null}

              <button
                type="button"
                disabled={
                  saving || !creating || !title.trim() || !selectedRootId
                }
                onClick={() => void saveProject()}
                className="inline-flex items-center gap-1.5 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-[#e5eadf] disabled:bg-[#f4f8f2] disabled:text-[#a9b7a2]"
              >
                {saved ? <Check size={14} /> : <Save size={14} />}
                {saving ? copy.saving : saved ? copy.saved : copy.save}
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="mt-3 rounded-[14px] border border-[#f0c6cf] bg-[#fff7f8] px-3 py-2 text-[11px] text-[#b43f58]">
              {loadError}
            </div>
          ) : null}
        </header>

        <section className="h-[720px] min-h-[600px] overflow-hidden rounded-[26px] border border-[#dfe4ef] bg-[#f8fafc] shadow-inner">
          <ReactFlowProvider>
            <ReactFlow
              key={flowKey}
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{
                padding: 0.34,
                minZoom: 0.55,
                maxZoom: 1.05,
              }}
              minZoom={0.35}
              maxZoom={1.8}
              nodesConnectable={false}
              nodesDraggable={false}
              elementsSelectable={false}
              onNodeClick={() => undefined}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1}
                color="#cfd7e8"
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </ReactFlowProvider>
        </section>

        {windowCaptureKind && selectedProject ? (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/35 px-3 py-4" onClick={() => { if (!windowCaptureSaving) setWindowCaptureKind(null); }}>
            <div className="w-full max-w-[520px] rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">{copy.timeWindowLabel}</div>
                  <h3 className="mt-2 text-xl font-bold text-[#1a1d2e]">{windowCaptureKind === "date_range" ? copy.addDateWindow : copy.addTimeWindow}</h3>
                </div>
                <button type="button" disabled={windowCaptureSaving} onClick={() => setWindowCaptureKind(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e3e6ef] text-[#7c8099] hover:bg-[#f5f6fb]"><X size={16} /></button>
              </div>
              <label className="mt-4 block text-[11px] font-bold text-[#667091]">
                {copy.titlePlaceholder}
                <input autoFocus value={windowCaptureTitle} onChange={(event) => setWindowCaptureTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff]" />
              </label>
              {windowCaptureKind === "date_range" ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input type="date" value={windowDateStart} onChange={(event) => setWindowDateStart(event.target.value)} className="rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff]" />
                  <input type="date" value={windowDateEnd} onChange={(event) => setWindowDateEnd(event.target.value)} className="rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff]" />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input type="time" value={windowTimeStart} onChange={(event) => setWindowTimeStart(event.target.value)} className="rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff]" />
                  <input type="time" value={windowTimeEnd} onChange={(event) => setWindowTimeEnd(event.target.value)} className="rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff]" />
                </div>
              )}
              {windowCaptureError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{windowCaptureError}</div> : null}
              <button type="button" onClick={() => void submitWindowCapture()} disabled={windowCaptureSaving || !windowCaptureTitle.trim() || (windowCaptureKind === "date_range" ? !windowDateStart || !windowDateEnd : !windowTimeStart || !windowTimeEnd)} className="mt-4 w-full rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2c5df0] disabled:cursor-not-allowed disabled:opacity-40">{windowCaptureSaving ? copy.saving : copy.createWindow}</button>
            </div>
          </div>
        ) : null}

        {taskCaptureOpen && selectedProject ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[96] flex items-center justify-center bg-black/35 px-3 py-4"
            onClick={() => {
              if (!taskCaptureSubmitting) {
                setTaskCaptureOpen(false);
              }
            }}
          >
            <div
              className="w-full max-w-[560px] rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">
                    {copy.taskLabel}
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-[#1a1d2e]">
                    {taskCaptureCopy.title}
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={taskCaptureSubmitting}
                  onClick={() => setTaskCaptureOpen(false)}
                  aria-label={taskCaptureCopy.close}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.06)] text-[#7c8099] hover:bg-[#f5f6fb] disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#b9c8ff] bg-[#eef2ff] px-2.5 py-2 text-[11px] font-semibold text-[#315ee7]">
                <Target size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {copy.projectLabel}: {selectedProject.title}
                </span>
              </div>

              <div className="mt-3 flex items-end gap-1.5 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] p-1.5 transition-all focus-within:border-[#3b6ef8]/40 focus-within:bg-white">
                <textarea
                  autoFocus
                  rows={2}
                  value={taskCaptureText}
                  disabled={taskCaptureSubmitting}
                  onChange={(event) => setTaskCaptureText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitProjectTaskCapture();
                    }
                  }}
                  placeholder={taskCaptureCopy.placeholder}
                  className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-[13px] leading-5 text-[#1a1d2e] placeholder-[#aeb3c3] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void submitProjectTaskCapture()}
                  disabled={taskCaptureSubmitting || !taskCaptureText.trim()}
                  aria-label={taskCaptureCopy.send}
                  title={taskCaptureCopy.send}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3b6ef8] text-white shadow-[0_4px_12px_rgba(59,110,248,0.22)] transition-colors hover:bg-[#2c5df0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>

              {taskCaptureSubmitting ? (
                <div className="mt-2 text-[11px] font-semibold text-[#667091]">
                  {taskCaptureCopy.sending}
                </div>
              ) : null}

              {taskCaptureError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {taskCaptureError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {selectedActivityDetail ? (
          <Cux6TaskDetailModal
            key={selectedActivityDetail.id}
            item={selectedActivityDetail}
            locale={locale}
            returnToTarget="calendar"
            initialEditing={selectedActivityInitialEditing}
            onClose={() => {
              setSelectedActivityInitialEditing(false);
              setSelectedActivityDetail(null);
            }}
            onChanged={(item, action) => {
              setSelectedActivityDetail(item);
              if (action !== "updated" || !item) {
                setSelectedActivityDetail(null);
              }
              void loadProjects(selectedProjectId ?? undefined, undefined, { background: true });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
