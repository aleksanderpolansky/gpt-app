"use client";

import {
  Check,
  ChevronDown,
  ListChecks,
  LoaderCircle,
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
import ELK from "elkjs/lib/elk.bundled.js";
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
  subprojectIds: string[];
  parentProjectIds: string[];
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

type ProjectSubprojectCaptureCopy = {
  title: string;
  placeholder: string;
  creating: string;
  create: string;
  error: string;
  close: string;
  label: string;
  openObservationObject: string;
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
  addSubproject: string;
  addDateWindow: string;
  addTimeWindow: string;
  timeWindowLabel: string;
  dateWindowDefaultTitle: string;
  timeWindowDefaultTitle: string;
  createWindow: string;
  taskLabel: string;
  deleteTask: string;
  confirmDeleteTask: string;
  deleteTaskError: string;
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
  addSubproject: "Add subproject",
  addDateWindow: "Add date window",
  addTimeWindow: "Add time-of-day window",
  timeWindowLabel: "TIME WINDOW",
  dateWindowDefaultTitle: "Date window",
  timeWindowDefaultTitle: "Time window",
  createWindow: "Create window",
  taskLabel: "TASK",
  deleteTask: "Delete task",
  confirmDeleteTask:
    "Delete the entire task? If this is recurring, the whole series and its future planned occurrences will be removed.",
  deleteTaskError: "Could not delete the task.",
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

const PROJECT_SUBPROJECT_CAPTURE_COPY: Record<
  LocaleCode,
  ProjectSubprojectCaptureCopy
> = {
  en: {
    title: "Add subproject",
    placeholder: "Subproject name",
    creating: "Creating subproject…",
    create: "Create subproject",
    error: "Could not create the subproject.",
    close: "Close",
    label: "SUBPROJECT",
    openObservationObject: "Observation object",
  },
  ru: {
    title: "Добавить подпроект",
    placeholder: "Название подпроекта",
    creating: "Создаю подпроект…",
    create: "Создать подпроект",
    error: "Не удалось создать подпроект.",
    close: "Закрыть",
    label: "ПОДПРОЕКТ",
    openObservationObject: "Объект наблюдения",
  },
  uk: {
    title: "Додати підпроєкт",
    placeholder: "Назва підпроєкту",
    creating: "Створюю підпроєкт…",
    create: "Створити підпроєкт",
    error: "Не вдалося створити підпроєкт.",
    close: "Закрити",
    label: "ПІДПРОЄКТ",
    openObservationObject: "Об'єкт спостереження",
  },
  pl: {
    title: "Dodaj podprojekt",
    placeholder: "Nazwa podprojektu",
    creating: "Tworzenie podprojektu…",
    create: "Utwórz podprojekt",
    error: "Nie udało się utworzyć podprojektu.",
    close: "Zamknij",
    label: "PODPROJEKT",
    openObservationObject: "Obiekt obserwacji",
  },
  de: {
    title: "Unterprojekt hinzufügen",
    placeholder: "Name des Unterprojekts",
    creating: "Unterprojekt wird erstellt…",
    create: "Unterprojekt erstellen",
    error: "Unterprojekt konnte nicht erstellt werden.",
    close: "Schließen",
    label: "UNTERPROJEKT",
    openObservationObject: "Beobachtungsobjekt",
  },
  es: {
    title: "Añadir subproyecto",
    placeholder: "Nombre del subproyecto",
    creating: "Creando subproyecto…",
    create: "Crear subproyecto",
    error: "No se pudo crear el subproyecto.",
    close: "Cerrar",
    label: "SUBPROYECTO",
    openObservationObject: "Objeto de observación",
  },
  cs: {
    title: "Přidat podprojekt",
    placeholder: "Název podprojektu",
    creating: "Vytváření podprojektu…",
    create: "Vytvořit podprojekt",
    error: "Podprojekt se nepodařilo vytvořit.",
    close: "Zavřít",
    label: "PODPROJEKT",
    openObservationObject: "Objekt pozorování",
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
    addSubproject: "Добавить подпроект",
    addDateWindow: "Добавить временное окно по датам",
    addTimeWindow: "Добавить временное окно по часам",
    timeWindowLabel: "ВРЕМЕННОЕ ОКНО",
    dateWindowDefaultTitle: "Период по датам",
    timeWindowDefaultTitle: "Промежуток по часам",
    createWindow: "Создать окно",
    taskLabel: "ЗАДАЧА",
    deleteTask: "Удалить задачу",
    confirmDeleteTask:
      "Удалить всю задачу? Для повторяющейся задачи будут удалены вся серия и будущие плановые экземпляры.",
    deleteTaskError: "Не удалось удалить задачу.",
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
    deleteTask: "Видалити завдання",
    confirmDeleteTask:
      "Видалити все завдання? Для повторюваного завдання буде видалено всю серію та майбутні заплановані екземпляри.",
    deleteTaskError: "Не вдалося видалити завдання.",
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
    deleteTask: "Usuń zadanie",
    confirmDeleteTask:
      "Usunąć całe zadanie? Jeśli jest cykliczne, zostanie usunięta cała seria i przyszłe zaplanowane wystąpienia.",
    deleteTaskError: "Nie udało się usunąć zadania.",
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
    deleteTask: "Aufgabe löschen",
    confirmDeleteTask:
      "Die gesamte Aufgabe löschen? Bei einer wiederkehrenden Aufgabe werden die ganze Serie und zukünftige geplante Vorkommen entfernt.",
    deleteTaskError: "Die Aufgabe konnte nicht gelöscht werden.",
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
    deleteTask: "Eliminar tarea",
    confirmDeleteTask:
      "¿Eliminar toda la tarea? Si es recurrente, se eliminarán toda la serie y las próximas ocurrencias planificadas.",
    deleteTaskError: "No se pudo eliminar la tarea.",
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
    deleteTask: "Smazat úkol",
    confirmDeleteTask:
      "Smazat celý úkol? Pokud se opakuje, bude odstraněna celá série i budoucí plánované výskyty.",
    deleteTaskError: "Úkol se nepodařilo smazat.",
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

type ProjectSemanticZoomLevel = "detail" | "compact" | "overview";

type ProjectCenterData = Record<string, unknown> & {
  copy: Copy;
  semanticLevel?: ProjectSemanticZoomLevel;
  title: string;
  rootQuery: string;
  selectedRoot: RootOption | null;
  filteredRoots: RootOption[];
  rootDropdownOpen: boolean;
  readonlyMode: boolean;
  saveDisabled: boolean;
  saving: boolean;
  saveError: string | null;
  dragEnabled?: boolean;
  dragLabel?: string;
  deleteCopy: ProjectSafeDeleteCopy;
  onDeleteProject: () => void;
  onTitleChange: (value: string) => void;
  onRootQueryChange: (value: string) => void;
  onRootFocus: () => void;
  onRootToggle: () => void;
  onRootSelect: (option: RootOption) => void;
  onAddObservationObject: () => void;
  onAddSubproject: () => void;
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
  semanticLevel?: ProjectSemanticZoomLevel;
  dragEnabled?: boolean;
  dragLabel?: string;
  deleteCopy: ProjectSafeDeleteCopy;
  onOpenActivity: (
    activityEventId: string,
    isRecurrenceDefinition: boolean,
  ) => void;
  onAddContainedTask: (containerActivityEventId: string) => void;
  onDeleteActivity: (activityEventId: string) => void;
  onDeleteTimeContainer: (activityEventId: string) => void;
};

type ProjectActivityNode = Node<
  ProjectActivityNodeData,
  "project-activity"
>;

type ProjectSubprojectNodeData = Record<string, unknown> & {
  project: ProjectItem;
  copy: ProjectSubprojectCaptureCopy;
  actionCopy: Copy;
  semanticLevel?: ProjectSemanticZoomLevel;
  dragEnabled?: boolean;
  dragLabel?: string;
  deleteCopy: ProjectSafeDeleteCopy;
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenObservationObject: (valueObjectId: string) => void;
  onAddSubproject: (projectId: string) => void;
  onAddTask: (projectId: string) => void;
  onAddDateWindow: (projectId: string) => void;
  onAddTimeWindow: (projectId: string) => void;
};

type ProjectSubprojectNode = Node<
  ProjectSubprojectNodeData,
  "project-subproject"
>;

type ProjectTerritoryNodeData = Record<string, unknown> & {
  title: string;
  count: number;
  emptyLabel: string;
  collapsed: boolean;
  collapseLabel: string;
  expandLabel: string;
  onToggle: () => void;
};

type ProjectTerritoryNode = Node<
  ProjectTerritoryNodeData,
  "project-territory"
>;

function ProjectMapDragHandle({
  enabled,
  label,
}: {
  enabled?: boolean;
  label?: string;
}) {
  if (!enabled) return null;

  return (
    <div
      className="project-map-drag-handle nopan absolute -left-5 top-3 z-20 flex h-10 w-5 cursor-grab select-none items-center justify-center gap-[4px] rounded-xl border border-[#d7e0f6] bg-white shadow-[0_8px_18px_rgba(63,91,170,0.16)] active:cursor-grabbing"
      title={label}
      aria-label={label}
    >
      <span className="h-7 border-l border-dashed border-[#7f96dd]" />
      <span className="h-7 border-l border-dashed border-[#7f96dd]" />
    </div>
  );
}

function ProjectDeleteIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className="nodrag nopan flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
    >
      <X size={13} strokeWidth={2.2} />
    </button>
  );
}

function ProjectTerritoryCard({
  data,
}: NodeProps<ProjectTerritoryNode>) {
  return (
    <div className="relative h-full w-full rounded-[24px] border border-dashed border-[#c7d2ef] bg-white/55 px-4 pb-4 pt-3 shadow-[0_12px_32px_rgba(63,91,170,0.06)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-[#a4b3df]"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#6b7ba5]">
          {data.title}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="rounded-full border border-[#dbe2f4] bg-white px-2 py-0.5 text-[9px] font-bold text-[#6f7b9b]">
            {data.count}
          </div>
          <button
            type="button"
            onClick={data.onToggle}
            title={data.collapsed ? data.expandLabel : data.collapseLabel}
            aria-label={data.collapsed ? data.expandLabel : data.collapseLabel}
            className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border border-[#d4dcf2] bg-white text-[13px] font-black text-[#6072ad] shadow-sm transition hover:border-[#aebfff] hover:bg-[#f2f5ff] hover:text-[#315ee7]"
          >
            {data.collapsed ? "+" : "−"}
          </button>
        </div>
      </div>
      {data.collapsed ? (
        <div className="absolute inset-x-4 top-[58px] rounded-xl border border-dashed border-[#dfe5f4] bg-white/75 px-3 py-3 text-center text-[10px] font-semibold text-[#7d89a8]">
          {data.count} · {data.title}
        </div>
      ) : data.count === 0 ? (
        <div className="absolute inset-x-4 top-[58px] rounded-xl border border-dashed border-[#e0e5f2] bg-white/70 px-3 py-5 text-center text-[10px] font-semibold text-[#9aa4bf]">
          {data.emptyLabel}
        </div>
      ) : null}
    </div>
  );
}

function ProjectSubprojectCard({
  data,
}: NodeProps<ProjectSubprojectNode>) {
  return (
    <div className="relative w-[300px] rounded-[22px] border-2 border-[#a9b9f4] bg-[#f8faff] px-4 py-3.5 shadow-[0_14px_34px_rgba(63,91,170,0.10)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-[#8fa2d7]"
      />
      <ProjectMapDragHandle enabled={data.dragEnabled} label={data.dragLabel} />
      <div className="nodrag nopan absolute right-2 top-2 z-20">
        <ProjectDeleteIconButton
          label={data.deleteCopy.deleteSubproject}
          onClick={() => data.onDeleteProject(data.project.id)}
        />
      </div>
      <div className="pr-8 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#5174ef]">
        {data.copy.label}
      </div>
      <button
        type="button"
        onClick={() => data.onOpenProject(data.project.id)}
        className="mt-2 block w-full text-left text-[12px] font-extrabold leading-5 text-[#29324a] hover:text-[#315ee7]"
      >
        {data.project.title}
      </button>

      {data.semanticLevel !== "overview" ? (
        <button
          type="button"
          onClick={() =>
            data.onOpenObservationObject(data.project.rootValueObject.id)
          }
          className="mt-2 rounded-lg border border-[#d7def3] bg-white px-2.5 py-1.5 text-[9px] font-bold text-[#62719a] hover:border-[#aebfff] hover:text-[#315ee7]"
        >
          ОН · {data.copy.openObservationObject}
        </button>
      ) : null}

      {data.semanticLevel === "detail" ? (
      <div className="nodrag nopan absolute -right-4 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
        <button type="button" onClick={() => data.onAddSubproject(data.project.id)} title={data.actionCopy.addSubproject} aria-label={data.actionCopy.addSubproject} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]">⊞</button>
        <button type="button" onClick={() => data.onAddTask(data.project.id)} title={data.actionCopy.addTask} aria-label={data.actionCopy.addTask} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-base font-bold text-[#315ee7] shadow-md hover:bg-[#eef2ff]">+</button>
        <button type="button" onClick={() => data.onAddDateWindow(data.project.id)} title={data.actionCopy.addDateWindow} aria-label={data.actionCopy.addDateWindow} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]">↔</button>
        <button type="button" onClick={() => data.onAddTimeWindow(data.project.id)} title={data.actionCopy.addTimeWindow} aria-label={data.actionCopy.addTimeWindow} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]">↕</button>
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
      <div className="relative h-full w-full rounded-[26px] border-2 border-dashed border-[#8fa5f6] bg-[#f7f9ff] px-5 py-4 shadow-[0_18px_44px_rgba(63,91,170,0.12)]">
        <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-[#7895ff]" />
        <ProjectMapDragHandle enabled={data.dragEnabled} label={data.dragLabel} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#5174ef]">{data.copy.timeWindowLabel}</div>
            <button type="button" onClick={() => data.onOpenActivity(data.activity.id, Boolean(data.activity.recurrence))} className="mt-1 block max-w-[470px] truncate text-left text-[13px] font-extrabold text-[#27324d] hover:text-[#315ee7]">{data.activity.title}</button>
            {data.semanticLevel !== "overview" ? (
              <div className="mt-1 text-[10px] font-semibold text-[#7180a2]">
                {windowLabel || data.copy.unscheduledLabel}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectDeleteIconButton
              label={data.deleteCopy.deleteTimeWindow}
              onClick={() => data.onDeleteTimeContainer(data.activity.id)}
            />
            {data.semanticLevel === "detail" ? (
              <button type="button" onClick={() => data.onAddContainedTask(data.activity.id)} title={data.copy.addTask} aria-label={data.copy.addTask} className="nodrag nopan flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#b9c8ff] bg-white text-lg font-bold text-[#315ee7] shadow-sm hover:bg-[#eef2ff]">+</button>
            ) : null}
          </div>
        </div>
        {data.semanticLevel === "detail" && data.containedActivities.length === 0 ? (
          <div className="absolute inset-x-5 top-[88px] rounded-xl border border-dashed border-[#dce3f7] bg-white/70 px-3 py-5 text-center text-[10px] font-semibold text-[#9aa4bf]">
            {data.copy.addTask}
          </div>
        ) : null}
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
      <ProjectMapDragHandle enabled={data.dragEnabled} label={data.dragLabel} />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void data.onDeleteActivity(data.activity.id);
        }}
        title={data.copy.deleteTask}
        aria-label={data.copy.deleteTask}
        className="nodrag nopan absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <X size={13} strokeWidth={2.2} />
      </button>

      <div className="flex items-center gap-2 pr-8 text-[#5174ef]">
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

      {data.semanticLevel !== "overview" ? (
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
      ) : null}

      {data.semanticLevel === "detail" &&
      data.activity.recurrence?.upcomingOccurrences?.length ? (
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
      <ProjectMapDragHandle enabled={data.dragEnabled} label={data.dragLabel} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#5174ef]">
          <Network size={18} strokeWidth={2} />
          <span className="text-[13px] font-extrabold uppercase tracking-[0.16em]">
            {data.copy.projectLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {data.readonlyMode ? (
            <ProjectDeleteIconButton
              label={data.deleteCopy.deleteProject}
              onClick={data.onDeleteProject}
            />
          ) : null}
          <button
            type="button"
            disabled
            aria-label="expand"
            className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-[#e0e5ef] bg-white text-[#8791aa] shadow-sm"
          >
            <Maximize2 size={14} />
          </button>
        </div>
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
          <button
            type="button"
            onClick={data.onAddSubproject}
            title={data.copy.addSubproject}
            aria-label={data.copy.addSubproject}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-sm font-black text-[#315ee7] shadow-md hover:bg-[#eef2ff]"
          >
            ⊞
          </button>
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
  "project-subproject": ProjectSubprojectCard,
  "project-territory": ProjectTerritoryCard,
};

const PROJECT_MAP_ELK = new ELK();
const PROJECT_CENTER_WIDTH = 510;
const PROJECT_CENTER_HEIGHT = 205;
const PROJECT_SUBPROJECT_WIDTH = 300;
const PROJECT_SUBPROJECT_HEIGHT = 132;
const PROJECT_ACTIVITY_WIDTH = 300;
const PROJECT_ACTIVITY_HEIGHT = 190;
const PROJECT_TIME_CONTAINER_MIN_WIDTH = 654;
const PROJECT_TIME_CONTAINER_EMPTY_HEIGHT = 190;
const PROJECT_TIME_CONTAINER_HEADER_HEIGHT = 88;
const PROJECT_TIME_CONTAINER_PADDING = 18;
const PROJECT_TERRITORY_HEADER_HEIGHT = 58;
const PROJECT_TERRITORY_PADDING = 18;
const PROJECT_TERRITORY_GAP = 18;
const STRUCTURED_SUBPROJECTS_ID = "__structured_subprojects__";
const STRUCTURED_WINDOWS_ID = "__structured_windows__";
const STRUCTURED_TASKS_ID = "__structured_tasks__";
const PROJECT_MAP_FREE_STORAGE_PREFIX = "arctor:project-map:free-layout:v1:";
const PROJECT_MAP_STRUCTURED_STORAGE_PREFIX =
  "arctor:project-map:structured-view:v1:";
const PROJECT_TERRITORY_COLLAPSED_HEIGHT = 104;

type ProjectStructuredTerritoryKey = "subprojects" | "windows" | "tasks";
type ProjectStructuredCollapsedState = Record<
  ProjectStructuredTerritoryKey,
  boolean
>;

const DEFAULT_STRUCTURED_COLLAPSED: ProjectStructuredCollapsedState = {
  subprojects: false,
  windows: false,
  tasks: false,
};

function projectMapStructuredStorageKey(projectId: string | null) {
  return projectId
    ? `${PROJECT_MAP_STRUCTURED_STORAGE_PREFIX}${projectId}`
    : null;
}

function readProjectMapStructuredCollapsed(
  projectId: string | null,
): ProjectStructuredCollapsedState {
  if (!projectId || typeof window === "undefined") {
    return { ...DEFAULT_STRUCTURED_COLLAPSED };
  }

  const storageKey = projectMapStructuredStorageKey(projectId);
  if (!storageKey) return { ...DEFAULT_STRUCTURED_COLLAPSED };

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...DEFAULT_STRUCTURED_COLLAPSED };

    const parsed = JSON.parse(raw) as {
      version?: number;
      collapsed?: Partial<ProjectStructuredCollapsedState>;
    };

    if (parsed.version !== 1 || !parsed.collapsed) {
      return { ...DEFAULT_STRUCTURED_COLLAPSED };
    }

    return {
      subprojects: parsed.collapsed.subprojects === true,
      windows: parsed.collapsed.windows === true,
      tasks: parsed.collapsed.tasks === true,
    };
  } catch {
    return { ...DEFAULT_STRUCTURED_COLLAPSED };
  }
}

function projectSemanticZoomLevel(zoom: number): ProjectSemanticZoomLevel {
  if (zoom < 0.42) return "overview";
  if (zoom < 0.72) return "compact";
  return "detail";
}

function projectMapFreeStorageKey(projectId: string | null) {
  return projectId ? `${PROJECT_MAP_FREE_STORAGE_PREFIX}${projectId}` : null;
}

function readProjectMapFreePositions(
  projectId: string | null,
): Record<string, { x: number; y: number }> {
  if (!projectId || typeof window === "undefined") return {};

  const storageKey = projectMapFreeStorageKey(projectId);
  if (!storageKey) return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as {
      version?: number;
      positions?: Record<string, { x: number; y: number }>;
    };

    return parsed.version === 1 && parsed.positions ? parsed.positions : {};
  } catch {
    return {};
  }
}

type ProjectMapViewMode = "structured" | "free";

type ProjectMapViewport = {
  x: number;
  y: number;
  zoom: number;
};

type ProjectMapViewCopy = {
  structured: string;
  free: string;
  reset: string;
  drag: string;
  subprojects: string;
  windows: string;
  tasks: string;
  empty: string;
  collapse: string;
  expand: string;
};

const PROJECT_MAP_VIEW_COPY: Record<LocaleCode, ProjectMapViewCopy> = {
  ru: { structured: "Структура", free: "Свободная карта", reset: "Сбросить расположение", drag: "Перетащить блок", subprojects: "Подпроекты", windows: "Временные окна", tasks: "Задачи", empty: "Пока пусто", collapse: "Свернуть", expand: "Развернуть" },
  pl: { structured: "Struktura", free: "Mapa swobodna", reset: "Resetuj układ", drag: "Przeciągnij blok", subprojects: "Podprojekty", windows: "Okna czasowe", tasks: "Zadania", empty: "Na razie pusto", collapse: "Zwiń", expand: "Rozwiń" },
  en: { structured: "Structure", free: "Free map", reset: "Reset layout", drag: "Drag block", subprojects: "Subprojects", windows: "Time windows", tasks: "Tasks", empty: "Empty", collapse: "Collapse", expand: "Expand" },
  es: { structured: "Estructura", free: "Mapa libre", reset: "Restablecer diseño", drag: "Arrastrar bloque", subprojects: "Subproyectos", windows: "Ventanas de tiempo", tasks: "Tareas", empty: "Vacío", collapse: "Contraer", expand: "Expandir" },
  uk: { structured: "Структура", free: "Вільна карта", reset: "Скинути розташування", drag: "Перетягнути блок", subprojects: "Підпроєкти", windows: "Часові вікна", tasks: "Завдання", empty: "Поки порожньо", collapse: "Згорнути", expand: "Розгорнути" },
  de: { structured: "Struktur", free: "Freie Karte", reset: "Layout zurücksetzen", drag: "Block verschieben", subprojects: "Teilprojekte", windows: "Zeitfenster", tasks: "Aufgaben", empty: "Noch leer", collapse: "Einklappen", expand: "Ausklappen" },
  cs: { structured: "Struktura", free: "Volná mapa", reset: "Obnovit rozložení", drag: "Přesunout blok", subprojects: "Podprojekty", windows: "Časová okna", tasks: "Úkoly", empty: "Zatím prázdné", collapse: "Sbalit", expand: "Rozbalit" },
};

type ProjectSafeDeleteCopy = {
  deleteProject: string;
  deleteSubproject: string;
  deleteTimeWindow: string;
  confirmProject: string;
  confirmSubproject: string;
  confirmTimeWindow: string;
  deleting: string;
  blocked: string;
  failed: string;
  debtLabels: Record<string, string>;
};

const SAFE_DELETE_EN: ProjectSafeDeleteCopy = {
  deleteProject: "Delete project",
  deleteSubproject: "Delete subproject",
  deleteTimeWindow: "Delete time window",
  confirmProject:
    "Delete this project? It can be removed only if it has no active tasks, time windows, child projects or other active dependencies.",
  confirmSubproject:
    "Delete this subproject? It can be removed only if it has no active tasks, time windows, child projects or other active dependencies.",
  confirmTimeWindow:
    "Delete this time window? It can be removed only if it contains no tasks and has no other active dependencies.",
  deleting: "Deleting…",
  blocked: "Deletion is blocked because active dependencies remain:",
  failed: "Could not delete this item.",
  debtLabels: {
    tasks: "tasks",
    timeWindows: "time windows",
    childProjects: "child projects",
    parentProjects: "parent projects",
    activityRelations: "activity relations",
    otherProjectContexts: "other project contexts",
    containedTasks: "contained tasks",
    otherProjectMemberships: "other project memberships",
    recurrenceRules: "recurrence rules",
    fulfillments: "completed fulfillments",
  },
};

const PROJECT_SAFE_DELETE_COPY: Record<LocaleCode, ProjectSafeDeleteCopy> = {
  en: SAFE_DELETE_EN,
  ru: {
    ...SAFE_DELETE_EN,
    deleteProject: "Удалить проект",
    deleteSubproject: "Удалить подпроект",
    deleteTimeWindow: "Удалить временное окно",
    confirmProject:
      "Удалить этот проект? Удаление разрешено только если нет активных задач, временных окон, дочерних подпроектов и других активных связей.",
    confirmSubproject:
      "Удалить этот подпроект? Удаление разрешено только если нет активных задач, временных окон, дочерних подпроектов и других активных связей.",
    confirmTimeWindow:
      "Удалить это временное окно? Удаление разрешено только если внутри нет задач и отсутствуют другие активные связи.",
    deleting: "Удаляю…",
    blocked: "Удаление заблокировано. Сначала устраните активные связи:",
    failed: "Не удалось удалить объект.",
    debtLabels: {
      tasks: "задачи",
      timeWindows: "временные окна",
      childProjects: "дочерние подпроекты",
      parentProjects: "родительские проекты",
      activityRelations: "связи активностей",
      otherProjectContexts: "другие контексты проекта",
      containedTasks: "задачи внутри окна",
      otherProjectMemberships: "другие связи с проектами",
      recurrenceRules: "правила повторения",
      fulfillments: "завершённые исполнения",
    },
  },
  pl: {
    ...SAFE_DELETE_EN,
    deleteProject: "Usuń projekt",
    deleteSubproject: "Usuń podprojekt",
    deleteTimeWindow: "Usuń okno czasowe",
    confirmProject: "Usunąć projekt? Można go usunąć tylko bez aktywnych zadań, okien czasowych, podprojektów i innych zależności.",
    confirmSubproject: "Usunąć podprojekt? Można go usunąć tylko bez aktywnych zadań, okien czasowych, podprojektów i innych zależności.",
    confirmTimeWindow: "Usunąć okno czasowe? Musi być puste i bez aktywnych zależności.",
    deleting: "Usuwanie…",
    blocked: "Usunięcie jest zablokowane przez aktywne zależności:",
    failed: "Nie udało się usunąć elementu.",
  },
  uk: {
    ...SAFE_DELETE_EN,
    deleteProject: "Видалити проєкт",
    deleteSubproject: "Видалити підпроєкт",
    deleteTimeWindow: "Видалити часове вікно",
    deleting: "Видаляю…",
    blocked: "Видалення заблоковано активними зв’язками:",
    failed: "Не вдалося видалити об’єкт.",
  },
  de: {
    ...SAFE_DELETE_EN,
    deleteProject: "Projekt löschen",
    deleteSubproject: "Unterprojekt löschen",
    deleteTimeWindow: "Zeitfenster löschen",
    deleting: "Wird gelöscht…",
    blocked: "Löschen ist wegen aktiver Abhängigkeiten blockiert:",
    failed: "Element konnte nicht gelöscht werden.",
  },
  es: {
    ...SAFE_DELETE_EN,
    deleteProject: "Eliminar proyecto",
    deleteSubproject: "Eliminar subproyecto",
    deleteTimeWindow: "Eliminar ventana de tiempo",
    deleting: "Eliminando…",
    blocked: "La eliminación está bloqueada por dependencias activas:",
    failed: "No se pudo eliminar el elemento.",
  },
  cs: {
    ...SAFE_DELETE_EN,
    deleteProject: "Smazat projekt",
    deleteSubproject: "Smazat podprojekt",
    deleteTimeWindow: "Smazat časové okno",
    deleting: "Mazání…",
    blocked: "Smazání blokují aktivní vazby:",
    failed: "Položku se nepodařilo smazat.",
  },
};

type ProjectMapGrid = {
  width: number;
  height: number;
  positions: Array<{ x: number; y: number }>;
};

function projectMapGrid(
  itemCount: number,
  itemWidth: number,
  itemHeight: number,
  columns: number,
  minWidth = 360,
  minHeight = 150,
  headerHeight = PROJECT_TERRITORY_HEADER_HEIGHT,
): ProjectMapGrid {
  if (itemCount <= 0) return { width: minWidth, height: minHeight, positions: [] };

  const safeColumns = Math.max(1, Math.min(columns, itemCount));
  const rows = Math.ceil(itemCount / safeColumns);
  const width = Math.max(
    minWidth,
    PROJECT_TERRITORY_PADDING * 2 +
      safeColumns * itemWidth +
      Math.max(0, safeColumns - 1) * PROJECT_TERRITORY_GAP,
  );
  const height = Math.max(
    minHeight,
    headerHeight +
      rows * itemHeight +
      Math.max(0, rows - 1) * PROJECT_TERRITORY_GAP +
      PROJECT_TERRITORY_PADDING,
  );

  return {
    width,
    height,
    positions: Array.from({ length: itemCount }, (_, index) => ({
      x: PROJECT_TERRITORY_PADDING + (index % safeColumns) * (itemWidth + PROJECT_TERRITORY_GAP),
      y: headerHeight + Math.floor(index / safeColumns) * (itemHeight + PROJECT_TERRITORY_GAP),
    })),
  };
}

function projectMapTimeContainerGrid(itemCount: number) {
  const childGrid = projectMapGrid(
    itemCount,
    PROJECT_ACTIVITY_WIDTH,
    PROJECT_ACTIVITY_HEIGHT,
    2,
    PROJECT_TIME_CONTAINER_MIN_WIDTH,
    PROJECT_TIME_CONTAINER_EMPTY_HEIGHT,
    PROJECT_TIME_CONTAINER_HEADER_HEIGHT,
  );

  return {
    width: Math.max(PROJECT_TIME_CONTAINER_MIN_WIDTH, childGrid.width),
    height: Math.max(PROJECT_TIME_CONTAINER_EMPTY_HEIGHT, childGrid.height),
    positions: childGrid.positions,
  };
}

async function layoutStructuredProjectTopLevel(
  specs: Array<{ id: string; width: number; height: number }>,
) {
  const rootId = "__project_center__";
  const graph = await PROJECT_MAP_ELK.layout({
    id: "structured-project-map-layout",
    layoutOptions: {
      "elk.algorithm": "org.eclipse.elk.layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "72",
      "elk.layered.spacing.nodeNodeBetweenLayers": "112",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.padding": "[top=32,left=36,bottom=36,right=36]",
    },
    children: specs.map((spec) => ({ id: spec.id, width: spec.width, height: spec.height })),
    edges: specs
      .filter((spec) => spec.id !== rootId)
      .map((spec) => ({
        id: `structured-edge:${spec.id}`,
        sources: [rootId],
        targets: [spec.id],
      })),
  });

  const positions: Record<string, { x: number; y: number }> = {};
  for (const child of graph.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  }
  return positions;
}

type ProjectMapLayoutEntry = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function collectVisibleProjectBranch(
  rootProject: ProjectItem | null,
  projects: ProjectItem[],
) {
  if (!rootProject) return [] as ProjectItem[];

  const byId = new Map(projects.map((project) => [project.id, project]));
  const visible: ProjectItem[] = [];
  const visited = new Set<string>();
  const queue = [rootProject.id];

  while (queue.length > 0) {
    const projectId = queue.shift();
    if (!projectId || visited.has(projectId)) continue;

    const project = byId.get(projectId);
    if (!project) continue;

    visited.add(projectId);
    visible.push(project);

    for (const childProjectId of project.subprojectIds ?? []) {
      if (!visited.has(childProjectId)) {
        queue.push(childProjectId);
      }
    }
  }

  return visible;
}

function projectBreadcrumbPath(
  projects: ProjectItem[],
  selectedProjectId: string | null,
) {
  if (!selectedProjectId) return [] as ProjectItem[];

  const byId = new Map(projects.map((project) => [project.id, project]));
  const selected = byId.get(selectedProjectId);
  if (!selected) return [] as ProjectItem[];

  const queue: ProjectItem[][] = [[selected]];
  const bestDepth = new Map<string, number>([[selected.id, 0]]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;

    const current = path[0];
    const parents = (current.parentProjectIds ?? [])
      .map((projectId) => byId.get(projectId))
      .filter((project): project is ProjectItem => Boolean(project))
      .sort((left, right) =>
        left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
      );

    if (parents.length === 0) {
      return path;
    }

    for (const parent of parents) {
      const nextDepth = path.length;
      const knownDepth = bestDepth.get(parent.id);
      if (knownDepth !== undefined && knownDepth <= nextDepth) continue;

      bestDepth.set(parent.id, nextDepth);
      queue.push([parent, ...path]);
    }
  }

  return [selected];
}

function isTimeContainerNode(node: Node) {
  if (node.type !== "project-activity") return false;

  const data = node.data as ProjectActivityNodeData;
  return data.activity.projectPlanning?.nodeKind === "time_container";
}

function projectMapNodeSize(node: Node) {
  if (node.type === "project-center") {
    return {
      width: PROJECT_CENTER_WIDTH,
      height: PROJECT_CENTER_HEIGHT,
    };
  }

  if (node.type === "project-subproject") {
    return {
      width: PROJECT_SUBPROJECT_WIDTH,
      height: PROJECT_SUBPROJECT_HEIGHT,
    };
  }

  return {
    width: PROJECT_ACTIVITY_WIDTH,
    height: PROJECT_ACTIVITY_HEIGHT,
  };
}

async function layoutProjectMapWithElk(nodes: Node[], edges: Edge[]) {
  const layout: Record<string, ProjectMapLayoutEntry> = {};
  const topLevelNodes = nodes.filter((node) => !node.parentId);
  const topLevelIds = new Set(topLevelNodes.map((node) => node.id));
  const topLevelSizes = new Map<string, { width: number; height: number }>();

  for (const node of topLevelNodes) {
    if (!isTimeContainerNode(node)) {
      topLevelSizes.set(node.id, projectMapNodeSize(node));
      continue;
    }

    const childNodes = nodes.filter((candidate) => candidate.parentId === node.id);

    if (childNodes.length === 0) {
      topLevelSizes.set(node.id, {
        width: PROJECT_TIME_CONTAINER_MIN_WIDTH,
        height: PROJECT_TIME_CONTAINER_EMPTY_HEIGHT,
      });
      continue;
    }

    const packed = await PROJECT_MAP_ELK.layout({
      id: `container-layout:${node.id}`,
      layoutOptions: {
        "elk.algorithm": "org.eclipse.elk.rectpacking",
        "elk.aspectRatio": "2.4",
        "elk.spacing.nodeNode": "18",
        "elk.padding": `[top=${PROJECT_TIME_CONTAINER_HEADER_HEIGHT},left=${PROJECT_TIME_CONTAINER_PADDING},bottom=${PROJECT_TIME_CONTAINER_PADDING},right=${PROJECT_TIME_CONTAINER_PADDING}]`,
        "elk.rectpacking.widthApproximation.optimizationGoal":
          "ASPECT_RATIO_DRIVEN",
        "elk.rectpacking.trybox": "true",
      },
      children: childNodes.map((childNode) => ({
        id: childNode.id,
        width: PROJECT_ACTIVITY_WIDTH,
        height: PROJECT_ACTIVITY_HEIGHT,
      })),
    });

    const packedResult = packed as unknown as {
      width?: number;
      height?: number;
      children?: Array<{
        id: string;
        x?: number;
        y?: number;
      }>;
    };
    const packedWidth = Math.max(
      PROJECT_TIME_CONTAINER_MIN_WIDTH,
      packedResult.width ?? PROJECT_TIME_CONTAINER_MIN_WIDTH,
    );
    const packedHeight = Math.max(
      PROJECT_TIME_CONTAINER_EMPTY_HEIGHT,
      packedResult.height ?? PROJECT_TIME_CONTAINER_EMPTY_HEIGHT,
    );
    const horizontalOffset = Math.max(
      0,
      (packedWidth - (packedResult.width ?? packedWidth)) / 2,
    );

    topLevelSizes.set(node.id, {
      width: packedWidth,
      height: packedHeight,
    });

    for (const child of packedResult.children ?? []) {
      layout[child.id] = {
        x: (child.x ?? PROJECT_TIME_CONTAINER_PADDING) + horizontalOffset,
        y: child.y ?? PROJECT_TIME_CONTAINER_HEADER_HEIGHT,
      };
    }
  }

  const topLevelLayout = await PROJECT_MAP_ELK.layout({
    id: "project-map-layout",
    layoutOptions: {
      "elk.algorithm": "org.eclipse.elk.layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "76",
      "elk.layered.spacing.nodeNodeBetweenLayers": "118",
      "elk.layered.spacing.edgeNodeBetweenLayers": "34",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.separateConnectedComponents": "false",
      "elk.padding": "[top=36,left=44,bottom=44,right=44]",
    },
    children: topLevelNodes.map((node) => {
      const size = topLevelSizes.get(node.id) ?? projectMapNodeSize(node);
      return {
        id: node.id,
        width: size.width,
        height: size.height,
      };
    }),
    edges: edges
      .filter(
        (edge) => topLevelIds.has(edge.source) && topLevelIds.has(edge.target),
      )
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  });

  for (const child of topLevelLayout.children ?? []) {
    const size = topLevelSizes.get(child.id);

    layout[child.id] = {
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: size?.width,
      height: size?.height,
    };
  }

  return layout;
}

function fallbackProjectMapLayout(nodes: Node[], edges: Edge[]) {
  const layout: Record<string, ProjectMapLayoutEntry> = {};
  const topLevelNodes = nodes.filter((node) => !node.parentId);
  const incoming = new Map<string, number>();
  const childrenBySource = new Map<string, string[]>();

  for (const node of topLevelNodes) {
    incoming.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!incoming.has(edge.source) || !incoming.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const children = childrenBySource.get(edge.source) ?? [];
    children.push(edge.target);
    childrenBySource.set(edge.source, children);
  }

  const roots = topLevelNodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const levelById = new Map<string, number>();
  const queue = roots.map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const previous = levelById.get(current.id);
    if (previous !== undefined && previous >= current.level) continue;
    levelById.set(current.id, current.level);

    for (const childId of childrenBySource.get(current.id) ?? []) {
      queue.push({ id: childId, level: current.level + 1 });
    }
  }

  const levels = new Map<number, Node[]>();

  for (const node of topLevelNodes) {
    const level = levelById.get(node.id) ?? 0;
    const levelNodes = levels.get(level) ?? [];
    levelNodes.push(node);
    levels.set(level, levelNodes);
  }

  for (const [level, levelNodes] of levels) {
    let cursorX = 0;

    for (const node of levelNodes) {
      const children = nodes.filter((candidate) => candidate.parentId === node.id);
      const columns = Math.min(2, Math.max(1, children.length));
      const rows = Math.ceil(children.length / columns);
      const containerWidth = isTimeContainerNode(node)
        ? Math.max(
            PROJECT_TIME_CONTAINER_MIN_WIDTH,
            columns * PROJECT_ACTIVITY_WIDTH +
              Math.max(0, columns - 1) * 18 +
              PROJECT_TIME_CONTAINER_PADDING * 2,
          )
        : undefined;
      const containerHeight = isTimeContainerNode(node)
        ? Math.max(
            PROJECT_TIME_CONTAINER_EMPTY_HEIGHT,
            PROJECT_TIME_CONTAINER_HEADER_HEIGHT +
              rows * PROJECT_ACTIVITY_HEIGHT +
              Math.max(0, rows - 1) * 18 +
              PROJECT_TIME_CONTAINER_PADDING,
          )
        : undefined;
      const size =
        containerWidth && containerHeight
          ? { width: containerWidth, height: containerHeight }
          : projectMapNodeSize(node);

      layout[node.id] = {
        x: cursorX,
        y: level * 330,
        width: containerWidth,
        height: containerHeight,
      };

      children.forEach((child, index) => {
        layout[child.id] = {
          x:
            PROJECT_TIME_CONTAINER_PADDING +
            (index % columns) * (PROJECT_ACTIVITY_WIDTH + 18),
          y:
            PROJECT_TIME_CONTAINER_HEADER_HEIGHT +
            Math.floor(index / columns) * (PROJECT_ACTIVITY_HEIGHT + 18),
        };
      });

      cursorX += size.width + 86;
    }
  }

  return layout;
}

export default function ProjectMapStartClient({
  initialLocale,
}: {
  initialLocale: string;
}) {
  const locale = normalizeLocale(initialLocale);
  const copy = COPY[locale];
  const safeDeleteCopy = PROJECT_SAFE_DELETE_COPY[locale];
  const taskCaptureCopy = PROJECT_TASK_CAPTURE_COPY[locale];
  const subprojectCaptureCopy = PROJECT_SUBPROJECT_CAPTURE_COPY[locale];
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("project");
  const resumeProjectDraft =
    searchParams.get("resumeProjectDraft") === "1";

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [eligibleRoots, setEligibleRoots] = useState<RootOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [actionProjectId, setActionProjectId] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<ProjectMapViewMode>("free");
  const [freePositions, setFreePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [freeLayoutRevision, setFreeLayoutRevision] = useState(0);
  const [structuredCollapsed, setStructuredCollapsed] =
    useState<ProjectStructuredCollapsedState>({
      ...DEFAULT_STRUCTURED_COLLAPSED,
    });
  const [structuredSemanticLevel, setStructuredSemanticLevel] =
    useState<ProjectSemanticZoomLevel>("detail");
  const [structuredViewport, setStructuredViewport] =
    useState<ProjectMapViewport | null>(null);
  const [structuredRestoreViewport, setStructuredRestoreViewport] =
    useState<ProjectMapViewport | null>(null);
  const [freeViewport, setFreeViewport] =
    useState<ProjectMapViewport | null>(null);
  const [freeRestoreViewport, setFreeRestoreViewport] =
    useState<ProjectMapViewport | null>(null);
  const [deletingEntityKey, setDeletingEntityKey] =
    useState<string | null>(null);
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
  const [subprojectCaptureOpen, setSubprojectCaptureOpen] = useState(false);
  const [subprojectCaptureTitle, setSubprojectCaptureTitle] = useState("");
  const [subprojectCaptureSubmitting, setSubprojectCaptureSubmitting] =
    useState(false);
  const [subprojectCaptureError, setSubprojectCaptureError] =
    useState<string | null>(null);
  const [subprojectCaptureRequestId, setSubprojectCaptureRequestId] =
    useState("");

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

  const actionProject = useMemo(
    () => projects.find((project) => project.id === actionProjectId) ?? null,
    [actionProjectId, projects],
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
    options?: { background?: boolean; preserveViewport?: boolean },
  ) {
    const background = options?.background === true;
    const preserveViewport = options?.preserveViewport === true;

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
        setFreePositions({});
        setStructuredCollapsed({ ...DEFAULT_STRUCTURED_COLLAPSED });
        setStructuredSemanticLevel("detail");
        setStructuredViewport(null);
        setStructuredRestoreViewport(null);
        setFreeViewport(null);
        setFreeRestoreViewport(null);
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

        const preserveCurrentViewport =
          preserveViewport && nextSelectedId === selectedProjectId;

        setSelectedProjectId(nextSelectedId);
        setFreePositions(readProjectMapFreePositions(nextSelectedId));
        setStructuredCollapsed(
          readProjectMapStructuredCollapsed(nextSelectedId),
        );

        if (!preserveCurrentViewport) {
          setStructuredSemanticLevel("detail");
          setStructuredViewport(null);
          setStructuredRestoreViewport(null);
          setFreeViewport(null);
          setFreeRestoreViewport(null);
        }

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
    setFreePositions({});
    setStructuredCollapsed({ ...DEFAULT_STRUCTURED_COLLAPSED });
    setStructuredSemanticLevel("detail");
    setStructuredViewport(null);
    setStructuredRestoreViewport(null);
    setFreeViewport(null);
    setFreeRestoreViewport(null);
    setActionProjectId(null);
  }

  const showProject = useCallback((projectId: string) => {
    clearProjectDraft();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    setCreating(false);
    setSaved(true);
    setSaveError(null);
    setSelectedProjectId(project.id);
    setFreePositions(readProjectMapFreePositions(project.id));
    setStructuredCollapsed(readProjectMapStructuredCollapsed(project.id));
    setStructuredSemanticLevel("detail");
    setStructuredViewport(null);
    setStructuredRestoreViewport(null);
    setFreeViewport(null);
    setFreeRestoreViewport(null);
    setTitle(project.title);
    setSelectedRootId(project.rootValueObject.id);
    setRootQuery(project.rootValueObject.title ?? "");
    setRootDropdownOpen(false);
  }, [projects]);

  function handleRootQueryChange(value: string) {
    setSaved(false);
    setRootQuery(value);
    setSelectedRootId("");
    setRootDropdownOpen(true);
  }

  function handleRootFocus() {
    if (!creating) return;

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

  function captureMutationViewport() {
    if (mapViewMode === "structured" && structuredViewport) {
      setStructuredRestoreViewport({ ...structuredViewport });
    }

    if (mapViewMode === "free" && freeViewport) {
      setFreeRestoreViewport({ ...freeViewport });
    }
  }

  function deletionErrorMessage(payload: {
    error?: string;
    debts?: Record<string, unknown>;
  } | null) {
    const debts = payload?.debts;
    const parts = debts
      ? Object.entries(debts)
          .filter(([, value]) => typeof value === "number" && value > 0)
          .map(([key, value]) => {
            const label = safeDeleteCopy.debtLabels[key] ?? key;
            return `${label}: ${String(value)}`;
          })
      : [];

    if (parts.length > 0) {
      return `${safeDeleteCopy.blocked} ${parts.join(" · ")}`;
    }

    return payload?.error || safeDeleteCopy.failed;
  }

  async function deleteProjectActivity(activityEventId: string) {
    if (deletingEntityKey) return;

    if (!window.confirm(copy.confirmDeleteTask)) {
      return;
    }

    captureMutationViewport();
    setDeletingEntityKey(`task:${activityEventId}`);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(activityEventId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            disposition?: string;
          }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || copy.deleteTaskError);
      }

      setSelectedActivityInitialEditing(false);
      setSelectedActivityDetail((current) =>
        current?.id === activityEventId ? null : current,
      );

      await loadProjects(selectedProjectId ?? undefined, undefined, {
        background: true,
        preserveViewport: true,
      });

      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.deleteTaskError;
      setStructuredRestoreViewport(null);
      setFreeRestoreViewport(null);
      setLoadError(message);
      window.alert(message);
    } finally {
      setDeletingEntityKey(null);
    }
  }

  async function deleteTimeContainer(
    projectContextId: string,
    activityEventId: string,
  ) {
    if (deletingEntityKey) return;

    if (!window.confirm(safeDeleteCopy.confirmTimeWindow)) {
      return;
    }

    captureMutationViewport();
    setDeletingEntityKey(`window:${activityEventId}`);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/projects/time-containers?projectContextId=${encodeURIComponent(projectContextId)}&activityEventId=${encodeURIComponent(activityEventId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            errorCode?: string;
            debts?: Record<string, unknown>;
          }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(deletionErrorMessage(payload));
      }

      await loadProjects(selectedProjectId ?? undefined, undefined, {
        background: true,
        preserveViewport: true,
      });

      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : safeDeleteCopy.failed;
      setStructuredRestoreViewport(null);
      setFreeRestoreViewport(null);
      setLoadError(message);
      window.alert(message);
    } finally {
      setDeletingEntityKey(null);
    }
  }

  async function deleteProjectContext(
    projectContextId: string,
    kind: "project" | "subproject",
  ) {
    if (deletingEntityKey) return;

    const confirmation =
      kind === "subproject"
        ? safeDeleteCopy.confirmSubproject
        : safeDeleteCopy.confirmProject;

    if (!window.confirm(confirmation)) {
      return;
    }

    const deletingCurrentProject =
      projectContextId === selectedProjectId;

    if (!deletingCurrentProject) {
      captureMutationViewport();
    }

    setDeletingEntityKey(`project:${projectContextId}`);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/projects?projectContextId=${encodeURIComponent(projectContextId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            errorCode?: string;
            debts?: Record<string, unknown>;
          }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(deletionErrorMessage(payload));
      }

      if (deletingCurrentProject) {
        const removedProject =
          projects.find((project) => project.id === projectContextId) ?? null;
        const preferredParentId =
          removedProject?.parentProjectIds?.find((projectId) =>
            projects.some((project) => project.id === projectId),
          ) ?? null;
        const fallbackProjectId =
          preferredParentId ??
          projects.find((project) => project.id !== projectContextId)?.id ??
          null;

        await loadProjects(fallbackProjectId ?? undefined, undefined, {
          background: true,
        });

        router.replace(
          fallbackProjectId
            ? localeHref(
                `/projects?project=${encodeURIComponent(fallbackProjectId)}`,
                locale,
              )
            : localeHref("/projects", locale),
        );
      } else {
        await loadProjects(selectedProjectId ?? undefined, undefined, {
          background: true,
          preserveViewport: true,
        });
      }

      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : safeDeleteCopy.failed;
      setStructuredRestoreViewport(null);
      setFreeRestoreViewport(null);
      setLoadError(message);
      window.alert(message);
    } finally {
      setDeletingEntityKey(null);
    }
  }

  const openTaskCapture = useCallback((
    projectId: string,
    parentActivityEventId: string | null = null,
  ) => {
    if (!projectId) return;
    setActionProjectId(projectId);
    setTaskCaptureParentActivityId(parentActivityEventId);
    setTaskCaptureText("");
    setTaskCaptureError(null);
    setTaskCaptureOpen(true);
  }, []);

  function addProjectActivity() {
    if (!selectedProject) return;
    openTaskCapture(selectedProject.id, null);
  }

  const openSubprojectCapture = useCallback((projectId: string) => {
    if (!projectId) return;
    setActionProjectId(projectId);
    setSubprojectCaptureTitle("");
    setSubprojectCaptureError(null);
    setSubprojectCaptureRequestId(
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `pp5b-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    setSubprojectCaptureOpen(true);
  }, []);

  async function submitSubprojectCapture() {
    const parentProject = actionProject;
    const subprojectTitle = subprojectCaptureTitle.trim();

    if (
      !parentProject ||
      !subprojectTitle ||
      !subprojectCaptureRequestId ||
      subprojectCaptureSubmitting
    ) {
      return;
    }

    setSubprojectCaptureSubmitting(true);
    setSubprojectCaptureError(null);

    try {
      const response = await fetch("/api/projects/subprojects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          parentProjectContextId: parentProject.id,
          title: subprojectTitle,
          description: subprojectTitle,
          locale,
          clientRequestId: subprojectCaptureRequestId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            subproject?: { id?: string };
          }
        | null;

      if (!response.ok || payload?.ok !== true || !payload.subproject?.id) {
        throw new Error(payload?.error || subprojectCaptureCopy.error);
      }

      setSubprojectCaptureOpen(false);
      setSubprojectCaptureTitle("");
      setSubprojectCaptureRequestId("");
      await loadProjects(parentProject.id, undefined, { background: true });
      router.replace(
        localeHref(
          "/projects?project=" + encodeURIComponent(parentProject.id),
          locale,
        ),
      );
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      setSubprojectCaptureError(
        error instanceof Error
          ? error.message
          : subprojectCaptureCopy.error,
      );
    } finally {
      setSubprojectCaptureSubmitting(false);
    }
  }

  const openWindowCapture = useCallback((
    projectId: string,
    kind: "date_range" | "time_of_day",
  ) => {
    if (!projectId) return;
    setActionProjectId(projectId);
    setWindowCaptureKind(kind);
    setWindowCaptureTitle(kind === "date_range" ? copy.dateWindowDefaultTitle : copy.timeWindowDefaultTitle);
    setWindowDateStart("");
    setWindowDateEnd("");
    setWindowTimeStart("");
    setWindowTimeEnd("");
    setWindowCaptureError(null);
  }, [copy.dateWindowDefaultTitle, copy.timeWindowDefaultTitle]);

  async function submitWindowCapture() {
    const project = actionProject;
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
      router.replace(
        localeHref("/projects?project=" + encodeURIComponent(project.id), locale),
      );
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    } catch (error) {
      setWindowCaptureError(error instanceof Error ? error.message : copy.createError);
    } finally {
      setWindowCaptureSaving(false);
    }
  }

  async function submitProjectTaskCapture() {
    const project = actionProject;
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
      router.replace(
        localeHref("/projects?project=" + encodeURIComponent(project.id), locale),
      );
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
    deleteCopy: safeDeleteCopy,
    onDeleteProject: () => {
      if (selectedProject) {
        void deleteProjectContext(selectedProject.id, "project");
      }
    },
    onTitleChange: (value) => {
      setTitle(value);
      setSaved(false);
    },
    onRootQueryChange: handleRootQueryChange,
    onRootFocus: handleRootFocus,
    onRootToggle: handleRootToggle,
    onRootSelect: handleRootSelect,
    onAddObservationObject: addObservationObject,
    onAddSubproject: () => {
      if (selectedProject) openSubprojectCapture(selectedProject.id);
    },
    onAddTask: addProjectActivity,
    onAddDateWindow: () => {
      if (selectedProject) openWindowCapture(selectedProject.id, "date_range");
    },
    onAddTimeWindow: () => {
      if (selectedProject) openWindowCapture(selectedProject.id, "time_of_day");
    },
  };

  const visibleProjects = useMemo(
    () => collectVisibleProjectBranch(selectedProject, projects),
    [projects, selectedProject],
  );

  const graphNodes: Node[] = (() => {
    const result: Node[] = [
      {
        id: "__project_center__",
        type: "project-center",
        position: { x: 0, y: 0 },
        draggable: false,
        selectable: false,
        data: nodeData,
      } as ProjectCenterNode,
    ];

    if (!selectedProject) {
      return result;
    }

    for (const project of visibleProjects) {
      const isRootProject = project.id === selectedProject.id;
      const projectNodeId = isRootProject
        ? "__project_center__"
        : `project-subproject:${project.id}`;

      if (!isRootProject) {
        result.push({
          id: projectNodeId,
          type: "project-subproject",
          position: { x: 0, y: 0 },
          draggable: false,
          selectable: false,
          data: {
            project,
            copy: subprojectCaptureCopy,
            actionCopy: copy,
            deleteCopy: safeDeleteCopy,
            onDeleteProject: (projectId: string) => {
              void deleteProjectContext(projectId, "subproject");
            },
            onAddSubproject: openSubprojectCapture,
            onAddTask: (projectId: string) => openTaskCapture(projectId, null),
            onAddDateWindow: (projectId: string) =>
              openWindowCapture(projectId, "date_range"),
            onAddTimeWindow: (projectId: string) =>
              openWindowCapture(projectId, "time_of_day"),
            onOpenProject: showProject,
            onOpenObservationObject: (valueObjectId: string) => {
              router.push(
                localeHref(
                  `/value-objects/${encodeURIComponent(valueObjectId)}`,
                  locale,
                ),
              );
            },
          },
        } as ProjectSubprojectNode);
      }

      const activities = project.activities ?? [];
      const byId = new Map(
        activities.map((activity) => [activity.id, activity]),
      );
      const containedIds = new Set(
        activities.flatMap((activity) => activity.containsActivityIds ?? []),
      );
      const containers = activities.filter(
        (activity) => activity.projectPlanning?.nodeKind === "time_container",
      );
      const standalone = activities.filter(
        (activity) =>
          activity.projectPlanning?.nodeKind !== "time_container" &&
          !containedIds.has(activity.id),
      );

      for (const container of containers) {
        const containerNodeId =
          `project-activity:${project.id}:${container.id}`;
        const containedActivities = (container.containsActivityIds ?? [])
          .map((activityId) => byId.get(activityId))
          .filter(
            (activity): activity is ProjectActivityItem => Boolean(activity),
          );

        result.push({
          id: containerNodeId,
          type: "project-activity",
          position: { x: 0, y: 0 },
          draggable: false,
          selectable: false,
          zIndex: 0,
          data: {
            copy,
            locale,
            deleteCopy: safeDeleteCopy,
            activity: container,
            containedActivities,
            onOpenActivity: (
              activityEventId: string,
              isRecurrenceDefinition: boolean,
            ) => {
              void openProjectActivity(
                activityEventId,
                isRecurrenceDefinition,
              );
            },
            onAddContainedTask: (containerActivityEventId: string) =>
              openTaskCapture(project.id, containerActivityEventId),
            onDeleteActivity: deleteProjectActivity,
            onDeleteTimeContainer: (activityEventId: string) => {
              void deleteTimeContainer(project.id, activityEventId);
            },
          },
        } as ProjectActivityNode);

        for (const childActivity of containedActivities) {
          result.push({
            id:
              `project-contained-activity:${project.id}:${container.id}:${childActivity.id}`,
            type: "project-activity",
            parentId: containerNodeId,
            extent: "parent",
            position: { x: 0, y: 0 },
            draggable: false,
            selectable: false,
            zIndex: 2,
            style: {
              width: PROJECT_ACTIVITY_WIDTH,
              minHeight: PROJECT_ACTIVITY_HEIGHT,
            },
            data: {
              copy,
              locale,
              deleteCopy: safeDeleteCopy,
              activity: childActivity,
              containedActivities: [],
              onOpenActivity: (
                activityEventId: string,
                isRecurrenceDefinition: boolean,
              ) => {
                void openProjectActivity(
                  activityEventId,
                  isRecurrenceDefinition,
                );
              },
              onAddContainedTask: (containerActivityEventId: string) =>
                openTaskCapture(project.id, containerActivityEventId),
              onDeleteActivity: deleteProjectActivity,
              onDeleteTimeContainer: (activityEventId: string) => {
                void deleteTimeContainer(project.id, activityEventId);
              },
            },
          } as ProjectActivityNode);
        }
      }

      for (const activity of standalone) {
        result.push({
          id: `project-activity:${project.id}:${activity.id}`,
          type: "project-activity",
          position: { x: 0, y: 0 },
          draggable: false,
          selectable: false,
          data: {
            copy,
            locale,
            deleteCopy: safeDeleteCopy,
            activity,
            containedActivities: [],
            onOpenActivity: (
              activityEventId: string,
              isRecurrenceDefinition: boolean,
            ) => {
              void openProjectActivity(
                activityEventId,
                isRecurrenceDefinition,
              );
            },
            onAddContainedTask: (containerActivityEventId: string) =>
              openTaskCapture(project.id, containerActivityEventId),
            onDeleteActivity: deleteProjectActivity,
            onDeleteTimeContainer: (activityEventId: string) => {
              void deleteTimeContainer(project.id, activityEventId);
            },
          },
        } as ProjectActivityNode);
      }
    }

    return result;
  })();

  const graphEdges: Edge[] = (() => {
    if (!selectedProject) return [];

    const visibleProjectIds = new Set(
      visibleProjects.map((project) => project.id),
    );
    const result: Edge[] = [];

    for (const project of visibleProjects) {
      const sourceNodeId =
        project.id === selectedProject.id
          ? "__project_center__"
          : `project-subproject:${project.id}`;
      const activities = project.activities ?? [];
      const containedIds = new Set(
        activities.flatMap((activity) => activity.containsActivityIds ?? []),
      );

      for (const childProjectId of project.subprojectIds ?? []) {
        if (!visibleProjectIds.has(childProjectId)) continue;

        result.push({
          id: `project-decomposition:${project.id}:${childProjectId}`,
          source: sourceNodeId,
          target: `project-subproject:${childProjectId}`,
          type: "smoothstep",
          style: {
            stroke: "#8fa8f2",
            strokeWidth: 1.8,
          },
        });
      }

      for (const activity of activities) {
        if (containedIds.has(activity.id)) continue;

        result.push({
          id: `project-activity-edge:${project.id}:${activity.id}`,
          source: sourceNodeId,
          target: `project-activity:${project.id}:${activity.id}`,
          type: "smoothstep",
          style: {
            stroke: "#c8d3f2",
            strokeWidth: 1.5,
          },
        });
      }
    }

    return result;
  })();

  const flowKey = useMemo(
    () =>
      [
        selectedProjectId ?? "draft",
        ...visibleProjects.flatMap((project) => [
          `project:${project.id}`,
          ...(project.subprojectIds ?? []).map(
            (projectId) => `subproject:${project.id}:${projectId}`,
          ),
          ...(project.activities ?? []).map((activity) =>
            [
              project.id,
              activity.id,
              ...(activity.containsActivityIds ?? []),
              ...(activity.containedByActivityIds ?? []),
            ].join(","),
          ),
        ]),
      ].join(":"),
    [selectedProjectId, visibleProjects],
  );

  const graphNodesRef = useRef(graphNodes);
  const graphEdgesRef = useRef(graphEdges);

  useEffect(() => {
    graphNodesRef.current = graphNodes;
    graphEdgesRef.current = graphEdges;
  }, [graphEdges, graphNodes]);

  const [layoutState, setLayoutState] = useState<{
    key: string;
    byNodeId: Record<string, ProjectMapLayoutEntry>;
  }>({
    key: "",
    byNodeId: {},
  });

  useEffect(() => {
    let cancelled = false;
    const nodesForLayout = graphNodesRef.current;
    const edgesForLayout = graphEdgesRef.current;

    void layoutProjectMapWithElk(nodesForLayout, edgesForLayout)
      .catch(() => fallbackProjectMapLayout(nodesForLayout, edgesForLayout))
      .then((nextLayout) => {
        if (cancelled) return;

        setLayoutState({
          key: flowKey,
          byNodeId: nextLayout,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [flowKey]);

  const layoutReady = layoutState.key === flowKey;

  const layoutedNodes = graphNodes.map((node) => {
    const layout = layoutState.byNodeId[node.id];
    if (!layout) return node;

    return {
      ...node,
      position: {
        x: layout.x,
        y: layout.y,
      },
      style:
        layout.width !== undefined && layout.height !== undefined
          ? {
              ...node.style,
              width: layout.width,
              height: layout.height,
            }
          : node.style,
    };
  });

  const viewCopy = PROJECT_MAP_VIEW_COPY[locale];
const freeStorageKey = projectMapFreeStorageKey(selectedProjectId);
const structuredStorageKey =
  projectMapStructuredStorageKey(selectedProjectId);

const structuredBreadcrumb = useMemo(
  () => projectBreadcrumbPath(projects, selectedProjectId),
  [projects, selectedProjectId],
);

const toggleStructuredTerritory = useCallback(
  (territory: ProjectStructuredTerritoryKey) => {
    if (structuredViewport) {
      setStructuredRestoreViewport(structuredViewport);
    }

    setStructuredCollapsed((current) => {
      const next = {
        ...current,
        [territory]: !current[territory],
      };

      if (structuredStorageKey) {
        try {
          window.localStorage.setItem(
            structuredStorageKey,
            JSON.stringify({
              version: 1,
              updatedAt: new Date().toISOString(),
              collapsed: next,
            }),
          );
        } catch {
          // The structured view still works if browser storage is unavailable.
        }
      }

      return next;
    });
  },
  [structuredStorageKey, structuredViewport],
);

const freeNodes = layoutedNodes.map((node) => ({
  ...node,
  position: freePositions[node.id] ?? node.position,
  draggable: true,
  dragHandle: ".project-map-drag-handle",
  data: {
    ...node.data,
    dragEnabled: true,
    dragLabel: viewCopy.drag,
    semanticLevel: "detail",
  },
}));

const persistFreeNodePosition = useCallback((node: Node) => {
  if (!freeStorageKey) return;

  setFreePositions((current) => {
    const next = {
      ...current,
      [node.id]: { x: node.position.x, y: node.position.y },
    };

    try {
      window.localStorage.setItem(
        freeStorageKey,
        JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), positions: next }),
      );
    } catch {
      // In-memory dragging still works if browser storage is unavailable.
    }

    return next;
  });
}, [freeStorageKey]);

const resetFreeLayout = useCallback(() => {
  if (freeStorageKey) {
    try {
      window.localStorage.removeItem(freeStorageKey);
    } catch {
      // In-memory reset still works if browser storage is unavailable.
    }
  }
  setFreePositions({});
  setFreeLayoutRevision((value) => value + 1);
}, [freeStorageKey]);

const structuredMetrics = useMemo(() => {
  if (!selectedProject) return null;

  const directSubprojects = (selectedProject.subprojectIds ?? [])
    .map((projectId) => projects.find((project) => project.id === projectId))
    .filter((project): project is ProjectItem => Boolean(project));
  const activities = selectedProject.activities ?? [];
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const containedIds = new Set(
    activities.flatMap((activity) => activity.containsActivityIds ?? []),
  );
  const windows = activities.filter(
    (activity) => activity.projectPlanning?.nodeKind === "time_container",
  );
  const tasks = activities.filter(
    (activity) =>
      activity.projectPlanning?.nodeKind !== "time_container" &&
      !containedIds.has(activity.id),
  );

  const subprojectGrid = structuredCollapsed.subprojects
    ? {
        width: 360,
        height: PROJECT_TERRITORY_COLLAPSED_HEIGHT,
        positions: [],
      }
    : projectMapGrid(
        directSubprojects.length,
        PROJECT_SUBPROJECT_WIDTH,
        PROJECT_SUBPROJECT_HEIGHT,
        2,
      );
  const taskGrid = structuredCollapsed.tasks
    ? {
        width: 360,
        height: PROJECT_TERRITORY_COLLAPSED_HEIGHT,
        positions: [],
      }
    : projectMapGrid(
        tasks.length,
        PROJECT_ACTIVITY_WIDTH,
        PROJECT_ACTIVITY_HEIGHT,
        2,
      );

  const windowEntries = windows.map((windowActivity) => {
    const containedActivities = (windowActivity.containsActivityIds ?? [])
      .map((activityId) => byId.get(activityId))
      .filter((activity): activity is ProjectActivityItem => Boolean(activity));
    return {
      activity: windowActivity,
      containedActivities,
      inner: projectMapTimeContainerGrid(containedActivities.length),
    };
  });

  let nextWindowY = PROJECT_TERRITORY_HEADER_HEIGHT;
  const windowPlacements = windowEntries.map((entry) => {
    const placement = {
      x: PROJECT_TERRITORY_PADDING,
      y: nextWindowY,
      width: entry.inner.width,
      height: entry.inner.height,
    };
    nextWindowY += entry.inner.height + PROJECT_TERRITORY_GAP;
    return placement;
  });

  const windowsWidth = structuredCollapsed.windows
    ? 360
    : Math.max(
        360,
        ...windowEntries.map(
          (entry) => entry.inner.width + PROJECT_TERRITORY_PADDING * 2,
        ),
      );
  const windowsHeight = structuredCollapsed.windows
    ? PROJECT_TERRITORY_COLLAPSED_HEIGHT
    : windowEntries.length === 0
      ? 150
      : Math.max(
          150,
          nextWindowY - PROJECT_TERRITORY_GAP + PROJECT_TERRITORY_PADDING,
        );

  return {
    directSubprojects,
    windows,
    tasks,
    subprojectGrid,
    taskGrid,
    windowEntries,
    windowPlacements,
    topLevelSpecs: [
      { id: "__project_center__", width: PROJECT_CENTER_WIDTH, height: PROJECT_CENTER_HEIGHT },
      { id: STRUCTURED_SUBPROJECTS_ID, width: subprojectGrid.width, height: subprojectGrid.height },
      { id: STRUCTURED_WINDOWS_ID, width: windowsWidth, height: windowsHeight },
      { id: STRUCTURED_TASKS_ID, width: taskGrid.width, height: taskGrid.height },
    ],
  };
}, [projects, selectedProject, structuredCollapsed]);

const structuredFlowKey = useMemo(
  () =>
    structuredMetrics && selectedProject
      ? [
          selectedProject.id,
          `collapsed:${structuredCollapsed.subprojects ? 1 : 0}:${structuredCollapsed.windows ? 1 : 0}:${structuredCollapsed.tasks ? 1 : 0}`,
          ...structuredMetrics.directSubprojects.map((project) => `p:${project.id}`),
          ...structuredMetrics.windows.map((activity) => `w:${activity.id}`),
          ...structuredMetrics.tasks.map((activity) => `t:${activity.id}`),
          ...structuredMetrics.windowEntries.flatMap((entry) =>
            entry.containedActivities.map(
              (activity) => `c:${entry.activity.id}:${activity.id}`,
            ),
          ),
        ].join(":")
      : "structured:empty",
  [selectedProject, structuredCollapsed, structuredMetrics],
);

const [structuredLayoutState, setStructuredLayoutState] = useState<{
  key: string;
  positions: Record<string, { x: number; y: number }>;
}>({ key: "", positions: {} });

useEffect(() => {
  let cancelled = false;

  if (!structuredMetrics) {
    return () => {
      cancelled = true;
    };
  }

  void layoutStructuredProjectTopLevel(structuredMetrics.topLevelSpecs)
    .then((positions) => {
      if (!cancelled) setStructuredLayoutState({ key: structuredFlowKey, positions });
    })
    .catch(() => {
      if (cancelled) return;

      const fallbackPositions: Record<string, { x: number; y: number }> = {
        __project_center__: { x: 520, y: 32 },
      };
      let x = 24;
      for (const spec of structuredMetrics.topLevelSpecs.slice(1)) {
        fallbackPositions[spec.id] = { x, y: 380 };
        x += spec.width + 72;
      }
      setStructuredLayoutState({ key: structuredFlowKey, positions: fallbackPositions });
    });

  return () => {
    cancelled = true;
  };
}, [structuredFlowKey, structuredMetrics]);

const structuredLayoutReady =
  !structuredMetrics || structuredLayoutState.key === structuredFlowKey;

const structuredNodes: Node[] = (() => {
  if (!selectedProject || !structuredMetrics || !structuredLayoutReady) return [];

  const sourceById = new Map(graphNodes.map((node) => [node.id, node]));
  const result: Node[] = [];
  const rootSource = sourceById.get("__project_center__");

  if (rootSource) {
    result.push({
      ...rootSource,
      position: structuredLayoutState.positions.__project_center__ ?? rootSource.position,
      draggable: false,
      data: { ...rootSource.data, dragEnabled: false },
    });
  }

  const windowSpec = structuredMetrics.topLevelSpecs.find(
    (spec) => spec.id === STRUCTURED_WINDOWS_ID,
  );

  const territoryDefinitions = [
    {
      id: STRUCTURED_SUBPROJECTS_ID,
      key: "subprojects" as const,
      title: viewCopy.subprojects,
      count: structuredMetrics.directSubprojects.length,
      width: structuredMetrics.subprojectGrid.width,
      height: structuredMetrics.subprojectGrid.height,
    },
    {
      id: STRUCTURED_WINDOWS_ID,
      key: "windows" as const,
      title: viewCopy.windows,
      count: structuredMetrics.windows.length,
      width: windowSpec?.width ?? 360,
      height: windowSpec?.height ?? 150,
    },
    {
      id: STRUCTURED_TASKS_ID,
      key: "tasks" as const,
      title: viewCopy.tasks,
      count: structuredMetrics.tasks.length,
      width: structuredMetrics.taskGrid.width,
      height: structuredMetrics.taskGrid.height,
    },
  ];

  for (const territory of territoryDefinitions) {
    result.push({
      id: territory.id,
      type: "project-territory",
      position: structuredLayoutState.positions[territory.id] ?? { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      zIndex: 0,
      style: { width: territory.width, height: territory.height },
      data: {
        title: territory.title,
        count: territory.count,
        emptyLabel: viewCopy.empty,
        collapsed: structuredCollapsed[territory.key],
        collapseLabel: viewCopy.collapse,
        expandLabel: viewCopy.expand,
        onToggle: () => toggleStructuredTerritory(territory.key),
      },
    } as ProjectTerritoryNode);
  }

  if (!structuredCollapsed.subprojects) structuredMetrics.directSubprojects.forEach((project, index) => {
    const sourceNode = sourceById.get(`project-subproject:${project.id}`);
    const position = structuredMetrics.subprojectGrid.positions[index];
    if (!sourceNode || !position) return;

    result.push({
      ...sourceNode,
      parentId: STRUCTURED_SUBPROJECTS_ID,
      extent: "parent",
      position,
      draggable: false,
      zIndex: 2,
      data: {
        ...sourceNode.data,
        dragEnabled: false,
        semanticLevel: structuredSemanticLevel,
      },
    });
  });

  if (!structuredCollapsed.windows) structuredMetrics.windowEntries.forEach((entry, index) => {
    const windowNodeId = `project-activity:${selectedProject.id}:${entry.activity.id}`;
    const sourceNode = sourceById.get(windowNodeId);
    const placement = structuredMetrics.windowPlacements[index];
    if (!sourceNode || !placement) return;

    result.push({
      ...sourceNode,
      parentId: STRUCTURED_WINDOWS_ID,
      extent: "parent",
      position: { x: placement.x, y: placement.y },
      draggable: false,
      zIndex: 2,
      style: { ...sourceNode.style, width: placement.width, height: placement.height },
      data: {
        ...sourceNode.data,
        dragEnabled: false,
        semanticLevel: structuredSemanticLevel,
      },
    });

    entry.containedActivities.forEach((activity, childIndex) => {
      const childSource = sourceById.get(
        `project-contained-activity:${selectedProject.id}:${entry.activity.id}:${activity.id}`,
      );
      const childPosition = entry.inner.positions[childIndex];
      if (!childSource || !childPosition) return;

      result.push({
        ...childSource,
        parentId: windowNodeId,
        extent: "parent",
        position: childPosition,
        draggable: false,
        zIndex: 4,
        data: {
          ...childSource.data,
          dragEnabled: false,
          semanticLevel: structuredSemanticLevel,
        },
      });
    });
  });

  if (!structuredCollapsed.tasks) structuredMetrics.tasks.forEach((activity, index) => {
    const sourceNode = sourceById.get(`project-activity:${selectedProject.id}:${activity.id}`);
    const position = structuredMetrics.taskGrid.positions[index];
    if (!sourceNode || !position) return;

    result.push({
      ...sourceNode,
      parentId: STRUCTURED_TASKS_ID,
      extent: "parent",
      position,
      draggable: false,
      zIndex: 2,
      data: {
        ...sourceNode.data,
        dragEnabled: false,
        semanticLevel: structuredSemanticLevel,
      },
    });
  });

  return result;
})();

const structuredEdges: Edge[] = [
  { id: "structured-root-subprojects", source: "__project_center__", target: STRUCTURED_SUBPROJECTS_ID, type: "smoothstep", style: { stroke: "#9fb2f3", strokeWidth: 1.6 } },
  { id: "structured-root-windows", source: "__project_center__", target: STRUCTURED_WINDOWS_ID, type: "smoothstep", style: { stroke: "#b7c3e7", strokeWidth: 1.4 } },
  { id: "structured-root-tasks", source: "__project_center__", target: STRUCTURED_TASKS_ID, type: "smoothstep", style: { stroke: "#c8d3f2", strokeWidth: 1.4 } },
];

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

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {mapViewMode === "structured" && structuredBreadcrumb.length > 0 ? (
            <nav
              aria-label="Project focus path"
              className="flex min-w-0 flex-1 flex-wrap items-center gap-1 rounded-[14px] border border-[#dce2ef] bg-white px-2 py-1.5 shadow-sm"
            >
              {structuredBreadcrumb.map((project, index) => (
                <span key={project.id} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? (
                    <span className="text-[11px] font-bold text-[#a0a9bf]">›</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => showProject(project.id)}
                    aria-current={
                      project.id === selectedProjectId ? "page" : undefined
                    }
                    className={`max-w-[220px] truncate rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                      project.id === selectedProjectId
                        ? "bg-[#eef2ff] text-[#315ee7]"
                        : "text-[#68738f] hover:bg-[#f5f7fc] hover:text-[#315ee7]"
                    }`}
                  >
                    {project.title}
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="inline-flex rounded-[14px] border border-[#dce2ef] bg-white p-1 shadow-sm">
            <button
              type="button"
              aria-pressed={mapViewMode === "structured"}
              onClick={() => setMapViewMode("structured")}
              className={`rounded-[10px] px-3 py-1.5 text-[10px] font-bold transition ${
                mapViewMode === "structured"
                  ? "bg-[#315ee7] text-white"
                  : "text-[#66708e] hover:bg-[#f2f5ff]"
              }`}
            >
              {viewCopy.structured}
            </button>
            <button
              type="button"
              aria-pressed={mapViewMode === "free"}
              onClick={() => setMapViewMode("free")}
              className={`rounded-[10px] px-3 py-1.5 text-[10px] font-bold transition ${
                mapViewMode === "free"
                  ? "bg-[#315ee7] text-white"
                  : "text-[#66708e] hover:bg-[#f2f5ff]"
              }`}
            >
              {viewCopy.free}
            </button>
          </div>

          {mapViewMode === "free" ? (
            <button
              type="button"
              onClick={resetFreeLayout}
              className="rounded-[12px] border border-[#dce2ef] bg-white px-3 py-2 text-[10px] font-semibold text-[#6f7892] shadow-sm transition hover:bg-[#f7f9ff]"
            >
              {viewCopy.reset}
            </button>
          ) : null}
        </div>

        <section className="relative h-[720px] min-h-[600px] overflow-hidden rounded-[26px] border border-[#dfe4ef] bg-[#f8fafc] shadow-inner">
          {deletingEntityKey ? (
            <div className="absolute inset-0 z-[80] flex cursor-wait items-start justify-center bg-white/10 pt-5">
              <div className="flex items-center gap-2 rounded-full border border-[#d9e1f7] bg-white/95 px-4 py-2 text-[11px] font-bold text-[#4d609a] shadow-lg">
                <LoaderCircle size={16} className="animate-spin" />
                {safeDeleteCopy.deleting}
              </div>
            </div>
          ) : null}
          <ReactFlowProvider>
            {mapViewMode === "structured" ? (
              structuredLayoutReady ? (
                <ReactFlow
                  key={`${structuredFlowKey}:structured`}
                  nodes={structuredNodes}
                  edges={structuredEdges}
                  nodeTypes={NODE_TYPES}
                  minZoom={0.28}
                  maxZoom={1.8}
                  nodesConnectable={false}
                  nodesDraggable={false}
                  elementsSelectable={false}
                  onInit={(instance) => {
                    window.requestAnimationFrame(() => {
                      if (structuredRestoreViewport) {
                        void instance.setViewport(
                          structuredRestoreViewport,
                          { duration: 0 },
                        );
                        setStructuredViewport(structuredRestoreViewport);
                        setStructuredSemanticLevel(
                          projectSemanticZoomLevel(
                            structuredRestoreViewport.zoom,
                          ),
                        );
                        setStructuredRestoreViewport(null);
                        return;
                      }

                      void instance.fitView({
                        padding: 0.2,
                        minZoom: 0.42,
                        maxZoom: 1.05,
                        duration: 0,
                      });

                      window.requestAnimationFrame(() => {
                        const viewport = instance.getViewport();
                        setStructuredViewport(viewport);
                        setStructuredSemanticLevel(
                          projectSemanticZoomLevel(viewport.zoom),
                        );
                      });
                    });
                  }}
                  onMoveEnd={(_, viewport) => {
                    setStructuredViewport(viewport);
                    setStructuredSemanticLevel(
                      projectSemanticZoomLevel(viewport.zoom),
                    );
                  }}
                  onNodeClick={() => undefined}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cfd7e8" />
                  <Controls showInteractive={false} />
                </ReactFlow>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-[#8b91a7]">
                  {copy.loading}
                </div>
              )
            ) : layoutReady ? (
              <ReactFlow
                key={`${flowKey}:free:${freeLayoutRevision}`}
                defaultNodes={freeNodes}
                defaultEdges={graphEdges}
                nodeTypes={NODE_TYPES}
                onInit={(instance) => {
                  window.requestAnimationFrame(() => {
                    if (freeRestoreViewport) {
                      void instance.setViewport(freeRestoreViewport, {
                        duration: 0,
                      });
                      setFreeViewport(freeRestoreViewport);
                      setFreeRestoreViewport(null);
                      return;
                    }

                    instance.fitView({
                      padding: 0.24,
                      minZoom: 0.32,
                      maxZoom: 1.05,
                    });

                    window.requestAnimationFrame(() => {
                      setFreeViewport(instance.getViewport());
                    });
                  });
                }}
                onMoveEnd={(_, viewport) => {
                  setFreeViewport(viewport);
                }}
                minZoom={0.2}
                maxZoom={1.8}
                nodesConnectable={false}
                nodesDraggable
                autoPanOnNodeDrag={false}
                elementsSelectable={false}
                onNodeDragStop={(_, node) => persistFreeNodePosition(node)}
                onNodeClick={() => undefined}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cfd7e8" />
                <Controls showInteractive={false} />
              </ReactFlow>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-[#8b91a7]">
                {copy.loading}
              </div>
            )}
          </ReactFlowProvider>
        </section>

        {subprojectCaptureOpen && actionProject ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[97] flex items-center justify-center bg-black/35 px-3 py-4"
            onClick={() => {
              if (!subprojectCaptureSubmitting) {
                setSubprojectCaptureOpen(false);
              }
            }}
          >
            <div
              className="w-full max-w-[520px] rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">
                    {subprojectCaptureCopy.label}
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-[#1a1d2e]">
                    {subprojectCaptureCopy.title}
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={subprojectCaptureSubmitting}
                  onClick={() => setSubprojectCaptureOpen(false)}
                  aria-label={subprojectCaptureCopy.close}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e3e6ef] text-[#7c8099] hover:bg-[#f5f6fb] disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#dce4ff] bg-[#f4f7ff] px-3 py-2 text-[11px] font-semibold text-[#4563c8]">
                {copy.projectLabel}: {actionProject.title}
              </div>

              <label className="mt-3 block text-[11px] font-bold text-[#667091]">
                {subprojectCaptureCopy.placeholder}
                <input
                  autoFocus
                  maxLength={180}
                  value={subprojectCaptureTitle}
                  disabled={subprojectCaptureSubmitting}
                  onChange={(event) =>
                    setSubprojectCaptureTitle(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitSubprojectCapture();
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-[#dfe5f1] px-3 py-2.5 text-sm outline-none focus:border-[#7895ff] disabled:opacity-60"
                />
              </label>

              {subprojectCaptureError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {subprojectCaptureError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void submitSubprojectCapture()}
                disabled={
                  subprojectCaptureSubmitting ||
                  !subprojectCaptureTitle.trim()
                }
                className="mt-4 w-full rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2c5df0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {subprojectCaptureSubmitting
                  ? subprojectCaptureCopy.creating
                  : subprojectCaptureCopy.create}
              </button>
            </div>
          </div>
        ) : null}

        {windowCaptureKind && actionProject ? (
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

        {taskCaptureOpen && actionProject ? (
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
                  {copy.projectLabel}: {actionProject.title}
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
