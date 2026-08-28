"use client";

import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArctorTabulator,
  type ArctorTableColumn,
} from "@/components/tables/arctor-tabulator";

import {
  formatMutualMetricValue,
  type MutualLinkActivity,
  type MutualLinksApiResponse,
} from "@/lib/activity/mutualLinks";
import {
  ActivityLifecycleBadge,
  useActivityBasicIntakeAnalyses,
} from "@/components/activity/activity-basic-intake-analysis-card";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ActivityEventSummary = {
  id: string | null;
  title: string | null;
  status: string | null;
  source: string | null;
  temporalDirection?: string | null;
  activityRoleCode?: string | null;
  fulfillsPlannedActivityEventId?: string | null;
  scheduleModeCode?: string | null;
  scheduledDate?: string | null;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
  deadlineAt?: string | null;
  observedDate?: string | null;
  processingStatus?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CalendarLogSummary = {
  id?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  action?: "created" | "updated" | "cancelled" | "restored" | string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  occurredAt?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  eventStatus?: string | null;
  canEdit?: boolean | null;
  canCancel?: boolean | null;
  canRestore?: boolean | null;
};

type JournalItem = {
  id: string;
  kind: "activity" | "calendar-log";
  sourceId: string | null;
  occurredAt: string | null;
  title: string;
  action: string;
  actorName: string;
  eventTime: string | null;
  source: string;
  status: string;
  description: string;
  canEdit: boolean;
  canCancel: boolean;
  canRestore: boolean;
  containerHref: string;
  raw: ActivityEventSummary | CalendarLogSummary;
};

type JournalViewMode = "cards" | "table";

type JournalTableRow = {
  id: string;
  when: string;
  activity: string;
  actor: string;
  eventTime: string;
  duration: string;
  analysis: string;
  status: string;
  source: string;
  item: JournalItem;
};

type EditDraft = {
  description: string;
  startedAtLocal: string;
  endedAtLocal: string;
  durationMinutes: string;
};

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const UI: Record<Locale, {
  pageTitle: string;
  pageSubtitle: string;
  add: string;
  logTab: string;
  cardsView: string;
  tableView: string;
  when: string;
  activity: string;
  analysis: string;
  title: string;
  subtitle: string;
  empty: string;
  open: string;
  edit: string;
  save: string;
  back: string;
  cancel: string;
  restore: string;
  container: string;
  eventTime: string;
  status: string;
  source: string;
  loadError: string;
  createdActivity: string;
  updatedActivity: string;
  cancelledActivity: string;
  restoredActivity: string;
  createdCalendar: string;
  updatedCalendar: string;
  cancelledCalendar: string;
  restoredCalendar: string;
  actor: string;
  selectedEntry: string;
  description: string;
  start: string;
  end: string;
  duration: string;
  confirmCancel: string;
}> = {
  en: {
    pageTitle: "My Activity Journal",
    pageSubtitle: "Chronological log of activity containers.",
    add: "Add",
    logTab: "Activity log",
    cardsView: "Cards",
    tableView: "Table",
    when: "When",
    activity: "Activity",
    analysis: "Analysis",
    title: "Activity log",
    subtitle: "Chronological actions with activity containers.",
    empty: "No activity actions yet.",
    open: "Open",
    edit: "Edit",
    save: "Save",
    back: "Back",
    cancel: "Delete",
    restore: "Restore",
    container: "Container",
    eventTime: "Activity time",
    status: "Status",
    source: "Source",
    loadError: "Could not load the activity journal.",
    createdActivity: "added activity",
    updatedActivity: "changed activity",
    cancelledActivity: "deleted activity",
    restoredActivity: "restored activity",
    createdCalendar: "added event",
    updatedCalendar: "changed event",
    cancelledCalendar: "cancelled event",
    restoredCalendar: "restored event",
    actor: "User",
    selectedEntry: "Entry",
    description: "Description",
    start: "Start",
    end: "End",
    duration: "Duration",
    confirmCancel: "Delete this activity entry?",
  },
  pl: {
    pageTitle: "Mój dziennik aktywności",
    pageSubtitle: "Chronologiczny log kontenerów aktywności.",
    add: "Dodaj",
    logTab: "Dziennik aktywności",
    cardsView: "Karty",
    tableView: "Tabela",
    when: "Kiedy",
    activity: "Aktywność",
    analysis: "Analiza",
    title: "Dziennik aktywności",
    subtitle: "Chronologia działań na kontenerach aktywności.",
    empty: "Brak działań aktywności.",
    open: "Otwórz",
    edit: "Zmień",
    save: "Zapisz",
    back: "Wstecz",
    cancel: "Usuń",
    restore: "Przywróć",
    container: "Kontener",
    eventTime: "Czas aktywności",
    status: "Status",
    source: "Źródło",
    loadError: "Nie udało się załadować dziennika aktywności.",
    createdActivity: "dodał aktywność",
    updatedActivity: "zmienił aktywność",
    cancelledActivity: "usunął aktywność",
    restoredActivity: "przywrócił aktywność",
    createdCalendar: "dodał wydarzenie",
    updatedCalendar: "zmienił wydarzenie",
    cancelledCalendar: "anulował wydarzenie",
    restoredCalendar: "przywrócił wydarzenie",
    actor: "Użytkownik",
    selectedEntry: "Wpis",
    description: "Opis",
    start: "Początek",
    end: "Koniec",
    duration: "Czas trwania",
    confirmCancel: "Usunąć ten wpis aktywności?",
  },
  ru: {
    pageTitle: "Мой журнал активностей",
    pageSubtitle: "Хронологический лог контейнеров активности.",
    add: "Добавить",
    logTab: "Журнал активностей",
    cardsView: "Карточки",
    tableView: "Таблица",
    when: "Когда",
    activity: "Активность",
    analysis: "Анализ",
    title: "Журнал активностей",
    subtitle: "Хронология действий с контейнерами активности.",
    empty: "Пока нет действий активности.",
    open: "Открыть",
    edit: "Изменить",
    save: "Сохранить",
    back: "Назад",
    cancel: "Удалить",
    restore: "Восстановить",
    container: "Контейнер",
    eventTime: "Время активности",
    status: "Статус",
    source: "Источник",
    loadError: "Не удалось загрузить журнал активностей.",
    createdActivity: "добавил активность",
    updatedActivity: "изменил активность",
    cancelledActivity: "удалил активность",
    restoredActivity: "восстановил активность",
    createdCalendar: "добавил событие",
    updatedCalendar: "изменил событие",
    cancelledCalendar: "отменил событие",
    restoredCalendar: "восстановил событие",
    actor: "Пользователь",
    selectedEntry: "Запись",
    description: "Описание",
    start: "Начало",
    end: "Завершение",
    duration: "Длительность",
    confirmCancel: "Удалить эту запись активности?",
  },
  uk: {
    pageTitle: "Мій журнал активностей",
    pageSubtitle: "Хронологічний лог контейнерів активності.",
    add: "Додати",
    logTab: "Журнал активностей",
    cardsView: "Картки",
    tableView: "Таблиця",
    when: "Коли",
    activity: "Активність",
    analysis: "Аналіз",
    title: "Журнал активностей",
    subtitle: "Хронологія дій з контейнерами активності.",
    empty: "Поки немає дій активності.",
    open: "Відкрити",
    edit: "Змінити",
    save: "Зберегти",
    back: "Назад",
    cancel: "Видалити",
    restore: "Відновити",
    container: "Контейнер",
    eventTime: "Час активності",
    status: "Статус",
    source: "Джерело",
    loadError: "Не вдалося завантажити журнал активностей.",
    createdActivity: "додав активність",
    updatedActivity: "змінив активність",
    cancelledActivity: "видалив активність",
    restoredActivity: "відновив активність",
    createdCalendar: "додав подію",
    updatedCalendar: "змінив подію",
    cancelledCalendar: "скасував подію",
    restoredCalendar: "відновив подію",
    actor: "Користувач",
    selectedEntry: "Запис",
    description: "Опис",
    start: "Початок",
    end: "Завершення",
    duration: "Тривалість",
    confirmCancel: "Видалити цей запис активності?",
  },
  de: {
    pageTitle: "Mein Aktivitätsjournal",
    pageSubtitle: "Chronologisches Log der Aktivitätscontainer.",
    add: "Hinzufügen",
    logTab: "Aktivitätslog",
    cardsView: "Karten",
    tableView: "Tabelle",
    when: "Wann",
    activity: "Aktivität",
    analysis: "Analyse",
    title: "Aktivitätslog",
    subtitle: "Chronologie der Aktionen mit Aktivitätscontainern.",
    empty: "Noch keine Aktivitätsaktionen.",
    open: "Öffnen",
    edit: "Ändern",
    save: "Speichern",
    back: "Zurück",
    cancel: "Löschen",
    restore: "Wiederherstellen",
    container: "Container",
    eventTime: "Aktivitätszeit",
    status: "Status",
    source: "Quelle",
    loadError: "Aktivitätsjournal konnte nicht geladen werden.",
    createdActivity: "hat Aktivität hinzugefügt",
    updatedActivity: "hat Aktivität geändert",
    cancelledActivity: "hat Aktivität gelöscht",
    restoredActivity: "hat Aktivität wiederhergestellt",
    createdCalendar: "hat Ereignis hinzugefügt",
    updatedCalendar: "hat Ereignis geändert",
    cancelledCalendar: "hat Ereignis storniert",
    restoredCalendar: "hat Ereignis wiederhergestellt",
    actor: "Benutzer",
    selectedEntry: "Eintrag",
    description: "Beschreibung",
    start: "Start",
    end: "Ende",
    duration: "Dauer",
    confirmCancel: "Diesen Aktivitätseintrag löschen?",
  },
  es: {
    pageTitle: "Mi diario de actividades",
    pageSubtitle: "Log cronológico de contenedores de actividad.",
    add: "Añadir",
    logTab: "Log de actividad",
    cardsView: "Tarjetas",
    tableView: "Tabla",
    when: "Cuándo",
    activity: "Actividad",
    analysis: "Análisis",
    title: "Log de actividad",
    subtitle: "Cronología de acciones con contenedores de actividad.",
    empty: "Todavía no hay acciones de actividad.",
    open: "Abrir",
    edit: "Cambiar",
    save: "Guardar",
    back: "Atrás",
    cancel: "Eliminar",
    restore: "Restaurar",
    container: "Contenedor",
    eventTime: "Tiempo de actividad",
    status: "Estado",
    source: "Fuente",
    loadError: "No se pudo cargar el diario de actividad.",
    createdActivity: "añadió actividad",
    updatedActivity: "cambió actividad",
    cancelledActivity: "eliminó actividad",
    restoredActivity: "restauró actividad",
    createdCalendar: "añadió evento",
    updatedCalendar: "cambió evento",
    cancelledCalendar: "canceló evento",
    restoredCalendar: "restauró evento",
    actor: "Usuario",
    selectedEntry: "Entrada",
    description: "Descripción",
    start: "Inicio",
    end: "Fin",
    duration: "Duración",
    confirmCancel: "¿Eliminar esta entrada de actividad?",
  },
  cs: {
    pageTitle: "Můj deník aktivit",
    pageSubtitle: "Chronologický log kontejnerů aktivit.",
    add: "Přidat",
    logTab: "Log aktivit",
    cardsView: "Karty",
    tableView: "Tabulka",
    when: "Kdy",
    activity: "Aktivita",
    analysis: "Analýza",
    title: "Log aktivit",
    subtitle: "Chronologie akcí s kontejnery aktivit.",
    empty: "Zatím žádné akce aktivit.",
    open: "Otevřít",
    edit: "Změnit",
    save: "Uložit",
    back: "Zpět",
    cancel: "Smazat",
    restore: "Obnovit",
    container: "Kontejner",
    eventTime: "Čas aktivity",
    status: "Stav",
    source: "Zdroj",
    loadError: "Deník aktivit se nepodařilo načíst.",
    createdActivity: "přidal aktivitu",
    updatedActivity: "změnil aktivitu",
    cancelledActivity: "smazal aktivitu",
    restoredActivity: "obnovil aktivitu",
    createdCalendar: "přidal událost",
    updatedCalendar: "změnil událost",
    cancelledCalendar: "zrušil událost",
    restoredCalendar: "obnovil událost",
    actor: "Uživatel",
    selectedEntry: "Záznam",
    description: "Popis",
    start: "Začátek",
    end: "Konec",
    duration: "Trvání",
    confirmCancel: "Smazat tento záznam aktivity?",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value && LOCALES.includes(value as Locale) ? value as Locale : "en";
}

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getBasicAnalysisStatusText(locale: Locale, status: string | undefined) {
  const copy: Record<Locale, { ready: string; pending: string; failed: string }> = {
    ru: { ready: "Базовый анализ готов", pending: "Базовый анализ выполняется…", failed: "Базовый анализ требует повторной попытки" },
    en: { ready: "Basic analysis ready", pending: "Basic analysis is running…", failed: "Basic analysis needs another attempt" },
    pl: { ready: "Analiza podstawowa gotowa", pending: "Trwa analiza podstawowa…", failed: "Analiza podstawowa wymaga ponowienia" },
    uk: { ready: "Базовий аналіз готовий", pending: "Виконується базовий аналіз…", failed: "Базовий аналіз потребує повторної спроби" },
    de: { ready: "Basisanalyse fertig", pending: "Basisanalyse läuft…", failed: "Basisanalyse muss erneut versucht werden" },
    es: { ready: "Análisis básico listo", pending: "El análisis básico está en curso…", failed: "El análisis básico debe volver a intentarse" },
    cs: { ready: "Základní analýza je hotová", pending: "Probíhá základní analýza…", failed: "Základní analýzu je třeba zopakovat" },
  };
  if (status === "completed") return copy[locale].ready;
  if (status === "failed") return copy[locale].failed;
  return copy[locale].pending;
}

function getBasicAnalysisStatusShortText(locale: Locale, status: string | undefined) {
  const copy: Record<Locale, { ready: string; pending: string; failed: string }> = {
    ru: { ready: "Готов", pending: "Выполняется", failed: "Повторить" },
    en: { ready: "Ready", pending: "Running", failed: "Retry" },
    pl: { ready: "Gotowa", pending: "Trwa", failed: "Powtórz" },
    uk: { ready: "Готовий", pending: "Виконується", failed: "Повторити" },
    de: { ready: "Fertig", pending: "Läuft", failed: "Erneut" },
    es: { ready: "Listo", pending: "En curso", failed: "Repetir" },
    cs: { ready: "Hotovo", pending: "Probíhá", failed: "Opakovat" },
  };

  if (status === "completed") return copy[locale].ready;
  if (status === "failed") return copy[locale].failed;
  return copy[locale].pending;
}

function getJournalTableStatusText(item: JournalItem, locale: Locale) {
  const copy: Record<Locale, {
    completed: string;
    planned: string;
    cancelled: string;
    archived: string;
    active: string;
    updated: string;
    restored: string;
    unknown: string;
  }> = {
    en: { completed: "Completed", planned: "Planned", cancelled: "Deleted", archived: "Archived", active: "Active", updated: "Updated", restored: "Restored", unknown: "—" },
    pl: { completed: "Wykonano", planned: "Planowana", cancelled: "Usunięta", archived: "Archiwalna", active: "Aktywna", updated: "Zmieniona", restored: "Przywrócona", unknown: "—" },
    ru: { completed: "Выполнено", planned: "Запланировано", cancelled: "Удалено", archived: "В архиве", active: "Активно", updated: "Изменено", restored: "Восстановлено", unknown: "—" },
    uk: { completed: "Виконано", planned: "Заплановано", cancelled: "Видалено", archived: "В архіві", active: "Активно", updated: "Змінено", restored: "Відновлено", unknown: "—" },
    de: { completed: "Erledigt", planned: "Geplant", cancelled: "Gelöscht", archived: "Archiviert", active: "Aktiv", updated: "Geändert", restored: "Wiederhergestellt", unknown: "—" },
    es: { completed: "Completada", planned: "Planificada", cancelled: "Eliminada", archived: "Archivada", active: "Activa", updated: "Actualizada", restored: "Restaurada", unknown: "—" },
    cs: { completed: "Dokončeno", planned: "Plánováno", cancelled: "Smazáno", archived: "Archivováno", active: "Aktivní", updated: "Změněno", restored: "Obnoveno", unknown: "—" },
  };

  const labels = copy[locale];

  if (item.kind === "activity") {
    const activity = item.raw as ActivityEventSummary;
    const status = activity.status ?? "";
    const role = activity.activityRoleCode ?? (activity.temporalDirection === "future" ? "planned" : "actual");

    if (status === "cancelled") return labels.cancelled;
    if (status === "archived") return labels.archived;
    if (status === "completed") return labels.completed;
    if (status === "planned" || role === "planned") return labels.planned;
    if (status === "active" || role === "actual") return labels.active;
    return status.replaceAll("_", " ") || labels.unknown;
  }

  const log = item.raw as CalendarLogSummary;
  if (log.action === "cancelled") return labels.cancelled;
  if (log.action === "restored") return labels.restored;
  if (log.action === "updated") return labels.updated;
  if (log.eventStatus === "completed") return labels.completed;
  if (log.eventStatus === "planned") return labels.planned;
  return (log.eventStatus ?? log.action ?? "").replaceAll("_", " ") || labels.unknown;
}

function formatDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function parseDatetimeLocal(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function isNewActivityContainer(event: ActivityEventSummary) {
  if (event.activityRoleCode === "planned" || event.activityRoleCode === "actual") {
    return true;
  }

  if (event.temporalDirection === "past") {
    return true;
  }

  const source = event.source ?? "";
  const comment = event.comment ?? "";

  return (
    source === "manual_form" &&
    (
      comment.includes("Source: activity_journal_review") ||
      comment.includes("activity_journal_review") ||
      comment.includes("activity_container_review_v1")
    )
  );
}

function formatDateOnly(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
}

function formatActivityEventTime(event: ActivityEventSummary, locale: Locale) {
  const timingCopy: Record<Locale, { deadline: string; unscheduled: string }> = {
    en: { deadline: "Deadline", unscheduled: "Unscheduled" },
    pl: { deadline: "Termin", unscheduled: "Bez terminu" },
    ru: { deadline: "Срок", unscheduled: "Без даты" },
    uk: { deadline: "Строк", unscheduled: "Без дати" },
    de: { deadline: "Frist", unscheduled: "Ohne Termin" },
    es: { deadline: "Fecha límite", unscheduled: "Sin fecha" },
    cs: { deadline: "Termín", unscheduled: "Bez termínu" },
  };

  if (event.startedAt) {
    return `${formatDateTime(event.startedAt, locale)}${event.endedAt ? ` - ${formatDateTime(event.endedAt, locale)}` : ""}`;
  }

  if (event.scheduleModeCode === "date_only") {
    return formatDateOnly(event.scheduledDate, locale);
  }

  if (event.scheduleModeCode === "date_range") {
    const start = formatDateOnly(event.scheduleStartDate, locale);
    const end = formatDateOnly(event.scheduleEndDate, locale);
    return start || end ? `${start ?? "—"} - ${end ?? "—"}` : null;
  }

  if (event.scheduleModeCode === "deadline" && event.deadlineAt) {
    return `${timingCopy[locale].deadline}: ${formatDateTime(event.deadlineAt, locale)}`;
  }

  if (event.scheduleModeCode === "unscheduled") {
    return timingCopy[locale].unscheduled;
  }

  if (event.observedDate) {
    return formatDateOnly(event.observedDate, locale);
  }

  return null;
}

function calendarAction(action: CalendarLogSummary["action"], ui: typeof UI[Locale]) {
  if (action === "updated") {
    return ui.updatedCalendar;
  }

  if (action === "cancelled") {
    return ui.cancelledCalendar;
  }

  if (action === "restored") {
    return ui.restoredCalendar;
  }

  return ui.createdCalendar;
}

function activityAction(status: string | null, ui: typeof UI[Locale]) {
  if (status === "cancelled" || status === "archived") {
    return ui.cancelledActivity;
  }

  return ui.createdActivity;
}

function mapActivityEvent(event: ActivityEventSummary, index: number, locale: Locale): JournalItem {
  const ui = UI[locale];
  const title = event.title ?? "Activity";
  const sourceId = event.id;
  const role = event.activityRoleCode ?? (event.temporalDirection === "future" ? "planned" : "actual");
  const eventTime = formatActivityEventTime(event, locale);
  const inactive = event.status === "cancelled" || event.status === "archived";
  const editableActual = role === "actual";

  return {
    id: `activity:${sourceId ?? index}`,
    kind: "activity",
    sourceId,
    occurredAt: event.updatedAt ?? event.createdAt ?? event.startedAt ?? event.deadlineAt ?? null,
    title,
    action: activityAction(event.status, ui),
    actorName: ui.actor,
    eventTime,
    source: event.source ?? "activity_events",
    status: `${event.status ?? "unknown"} / ${role}`,
    description: event.comment ?? "",
    canEdit: Boolean(sourceId) && editableActual && !inactive,
    canCancel: Boolean(sourceId) && editableActual && !inactive,
    canRestore: Boolean(sourceId) && editableActual && inactive,
    containerHref: `/calendar/activity-review?${new URLSearchParams({
      locale,
      text: title,
      returnTo: role === "planned" ? "calendar" : "activity-journal",
      temporalDirection: role === "planned" ? "future" : "past",
    }).toString()}`,
    raw: event,
  };
}

function mapCalendarLog(log: CalendarLogSummary, index: number, locale: Locale): JournalItem {
  const ui = UI[locale];
  const title = log.eventTitle ?? "Calendar event";

  return {
    id: `calendar-log:${log.id ?? index}`,
    kind: "calendar-log",
    sourceId: log.eventId ?? null,
    occurredAt: log.occurredAt ?? null,
    title,
    action: calendarAction(log.action, ui),
    actorName: log.actorName ?? log.actorEmail ?? ui.actor,
    eventTime: log.eventStartAt
      ? `${formatDateTime(log.eventStartAt, locale)}${log.eventEndAt ? ` - ${formatDateTime(log.eventEndAt, locale)}` : ""}`
      : null,
    source: "calendar_event_logs",
    status: log.eventStatus ?? log.action ?? "unknown",
    description: "",
    canEdit: Boolean(log.eventId && log.canEdit),
    canCancel: Boolean(log.eventId && log.canCancel),
    canRestore: Boolean(log.eventId && log.canRestore),
    containerHref: `/calendar/activity-review?${new URLSearchParams({
      locale,
      text: title,
      returnTo: "calendar",
      temporalDirection: "future",
    }).toString()}`,
    raw: log,
  };
}

function sortJournalItems(left: JournalItem, right: JournalItem) {
  const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
  const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;

  return rightTime - leftTime;
}

const MUTUAL_UI: Record<Locale, { objects: string; facts: string }> = {
  en: { objects: "Linked value objects", facts: "Facts" },
  pl: { objects: "Powiązane obiekty wartości", facts: "Fakty" },
  ru: { objects: "Связанные ЦО", facts: "Факты" },
  uk: { objects: "Пов’язані ЦО", facts: "Факти" },
  de: { objects: "Verknüpfte Wertobjekte", facts: "Fakten" },
  es: { objects: "Objetos vinculados", facts: "Hechos" },
  cs: { objects: "Propojené hodnotové objekty", facts: "Fakta" },
};

function ActivityMutualPreview({
  relation,
  locale,
  compact = false,
}: {
  readonly relation: MutualLinkActivity | null;
  readonly locale: Locale;
  readonly compact?: boolean;
}) {
  if (!relation || (relation.valueObjects.length === 0 && relation.facts.length === 0)) {
    return null;
  }

  const labels = MUTUAL_UI[locale];

  return (
    <div className={compact ? "mt-2 grid gap-2" : "mt-3 grid gap-3 rounded-xl border border-[#e5e7eb] bg-[#fafbff] p-3"}>
      {relation.valueObjects.length > 0 ? (
        <div>
          {!compact ? (
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#747da0]">
              {labels.objects}
            </div>
          ) : null}
          <div className={compact ? "flex flex-wrap gap-1.5" : "mt-2 flex flex-wrap gap-2"}>
            {relation.valueObjects.map((valueObject) => (
              <Link
                key={valueObject.id}
                href={`/value-objects/${encodeURIComponent(valueObject.id)}?locale=${locale}`}
                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 no-underline"
              >
                {valueObject.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {relation.facts.length > 0 ? (
        <div>
          {!compact ? (
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#747da0]">
              {labels.facts}
            </div>
          ) : null}
          <div className={compact ? "flex flex-wrap gap-1.5" : "mt-2 flex flex-wrap gap-2"}>
            {relation.facts.map((fact) => (
              <Link
                key={fact.measureKey}
                href={`/activity-facts?locale=${locale}&activityEventId=${encodeURIComponent(relation.activityEventId)}`}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 no-underline"
              >
                {formatMutualMetricValue(fact.metricValue)} {fact.unit ?? ""}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ActivityTodayPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [viewMode, setViewMode] = useState<JournalViewMode>("cards");
  const [activityEvents, setActivityEvents] = useState<ActivityEventSummary[]>([]);
  const [calendarLogs, setCalendarLogs] = useState<CalendarLogSummary[]>([]);
  const [mutualLinksByActivityId, setMutualLinksByActivityId] = useState<Record<string, MutualLinkActivity>>({});
  const [selectedItem, setSelectedItem] = useState<JournalItem | null>(null);
  // ARCTOR_ACTIVITY_TODAY_LINT_SAFE_AUTO_OPEN_REF_V1
  const autoOpenHandledRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    description: "",
    startedAtLocal: "",
    endedAtLocal: "",
    durationMinutes: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const basicIntakeActivityEventIds = useMemo(
    () => activityEvents
      .map((event) => event.id)
      .filter((id): id is string => Boolean(id)),
    [activityEvents],
  );
  const basicIntakeAnalysesByActivityId = useActivityBasicIntakeAnalyses(
    basicIntakeActivityEventIds,
  );

  // ARCTOR_ACTIVITY_TODAY_LINT_SAFE_LOCALE_SYNC_V1
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateLocale = () => {
      setLocale(
        normalizeLocale(
          new URLSearchParams(window.location.search).get("locale"),
        ),
      );
    };

    const timer = window.setTimeout(updateLocale, 0);
    window.addEventListener("popstate", updateLocale);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", updateLocale);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadJournal() {
      setLoading(true);
      setError(null);

      try {
        const [activityResponse, calendarResponse] = await Promise.all([
          fetch("/api/activity/events?limit=50", {
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
          fetch("/api/calendar-rebuild/events?includeLog=1", {
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        ]);

        const activityPayload = await activityResponse.json().catch(() => null) as {
          events?: ActivityEventSummary[];
          error?: string;
        } | null;

        const calendarPayload = await calendarResponse.json().catch(() => null) as {
          logs?: CalendarLogSummary[];
          error?: string;
        } | null;

        if (!activityResponse.ok) {
          throw new Error(activityPayload?.error || `Activity events request failed: ${activityResponse.status}`);
        }

        if (!calendarResponse.ok) {
          throw new Error(calendarPayload?.error || `Calendar log request failed: ${calendarResponse.status}`);
        }

        if (!cancelled) {
          const containerEvents = Array.isArray(activityPayload?.events)
            ? activityPayload.events.filter(isNewActivityContainer)
            : [];

          setActivityEvents(containerEvents);
          setCalendarLogs(Array.isArray(calendarPayload?.logs) ? calendarPayload.logs : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setActivityEvents([]);
          setCalendarLogs([]);
          setError(loadError instanceof Error ? loadError.message : "Unknown journal load error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadJournal();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const activityIds = activityEvents
      .map((event) => event.id)
      .filter((id): id is string => Boolean(id));

    // ARCTOR_ACTIVITY_TODAY_LINT_SAFE_MUTUAL_LINK_EMPTY_V1
    if (activityIds.length === 0) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      activityEventIds: activityIds.join(","),
    });

    fetch(`/api/activity/mutual-links?${params.toString()}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as MutualLinksApiResponse | null;
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.errorMessage ?? `Mutual links request failed: ${response.status}`);
        }
        if (cancelled) return;
        setMutualLinksByActivityId(
          Object.fromEntries(
            (payload.activities ?? []).map((activity) => [activity.activityEventId, activity]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setMutualLinksByActivityId({});
      });

    return () => {
      cancelled = true;
    };
  }, [activityEvents]);

  const ui = UI[locale];

  const addHref = `/calendar/add?${new URLSearchParams({
    locale,
    returnTo: "activity-journal",
    temporalDirection: "past",
  }).toString()}`;

  const journalItems = useMemo(
    () => [
      ...activityEvents.map((event, index) => mapActivityEvent(event, index, locale)),
      ...calendarLogs.map((log, index) => mapCalendarLog(log, index, locale)),
    ].sort(sortJournalItems),
    [activityEvents, calendarLogs, locale]
  );

  const journalTableRows = useMemo<JournalTableRow[]>(
    () =>
      journalItems.map((item) => {
        const activity = item.kind === "activity"
          ? (item.raw as ActivityEventSummary)
          : null;
        const duration = typeof activity?.durationMinutes === "number"
          ? `${activity.durationMinutes} min`
          : "—";
        const analysis = item.kind === "activity" && item.sourceId
          ? getBasicAnalysisStatusShortText(
              locale,
              basicIntakeAnalysesByActivityId[item.sourceId]?.status,
            )
          : "—";

        return {
          id: item.id,
          when: formatDateTime(item.occurredAt, locale),
          activity: item.title,
          actor: item.actorName,
          eventTime: item.eventTime ?? "—",
          duration,
          analysis,
          status: getJournalTableStatusText(item, locale),
          source: item.source || "—",
          item,
        };
      }),
    [basicIntakeAnalysesByActivityId, journalItems, locale],
  );

  const journalTableColumns = useMemo<ArctorTableColumn<JournalTableRow>[]>(
    () => [
      {
        title: ui.when,
        field: "when",
        width: 154,
        minWidth: 142,
        widthShrink: 1,
        responsive: 2,
        frozen: true,
        tooltip: true,
        cssClass: "arctor-table-muted",
      },
      {
        title: ui.activity,
        field: "activity",
        minWidth: 250,
        widthGrow: 5,
        widthShrink: 3,
        responsive: 0,
        tooltip: true,
        cssClass: "arctor-table-title",
      },
      {
        title: ui.eventTime,
        field: "eventTime",
        minWidth: 180,
        widthGrow: 2,
        widthShrink: 3,
        responsive: 3,
        tooltip: true,
      },
      {
        title: ui.duration,
        field: "duration",
        width: 100,
        minWidth: 92,
        responsive: 0,
        tooltip: true,
        hozAlign: "center",
        headerHozAlign: "center",
        cssClass: "arctor-table-number",
      },
      {
        title: ui.analysis,
        field: "analysis",
        minWidth: 104,
        widthGrow: 1,
        widthShrink: 1,
        responsive: 2,
        tooltip: true,
      },
      {
        title: ui.status,
        field: "status",
        minWidth: 112,
        widthShrink: 1,
        responsive: 1,
        tooltip: true,
      },
      {
        title: ui.source,
        field: "source",
        visible: false,
        responsive: 6,
        tooltip: true,
      },
    ],
    [ui],
  );

  // ARCTOR_ACTIVITY_TODAY_LINT_SAFE_AUTO_OPEN_EFFECT_V1
  useEffect(() => {
    if (autoOpenHandledRef.current || typeof window === "undefined") return;
    const requestedId = new URLSearchParams(window.location.search).get("activityEventId");
    if (!requestedId) {
      autoOpenHandledRef.current = true;
      return;
    }
    const item = journalItems.find(
      (candidate) => candidate.kind === "activity" && candidate.sourceId === requestedId,
    );
    if (!item) return;
    autoOpenHandledRef.current = true;
    openItem(item);
  }, [journalItems]);

  function openItem(item: JournalItem, edit = false) {
    setSelectedItem(item);
    setIsEditing(edit);

    const activity = item.kind === "activity" ? item.raw as ActivityEventSummary : null;

    setEditDraft({
      description: item.description,
      startedAtLocal: formatDatetimeLocal(activity?.startedAt ?? null),
      endedAtLocal: formatDatetimeLocal(activity?.endedAt ?? null),
      durationMinutes: activity?.durationMinutes ? String(activity.durationMinutes) : "",
    });
  }

  async function saveSelectedActivity() {
    if (!selectedItem || selectedItem.kind !== "activity" || !selectedItem.sourceId) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/activity/events/${encodeURIComponent(selectedItem.sourceId)}`, {
        credentials: "include",
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          comment: editDraft.description,
          startedAt: parseDatetimeLocal(editDraft.startedAtLocal),
          endedAt: parseDatetimeLocal(editDraft.endedAtLocal),
          durationMinutes: editDraft.durationMinutes,
          reason: "Activity Journal edit",
        }),
      });

      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Activity update failed: ${response.status}`);
      }

      setSelectedItem(null);
      setIsEditing(false);
      setRefreshKey((current) => current + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unknown save error");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelItem(item: JournalItem) {
    if (!item.sourceId || !window.confirm(ui.confirmCancel)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (item.kind === "activity") {
        const response = await fetch(`/api/activity/events/${encodeURIComponent(item.sourceId)}`, {
          credentials: "include",
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: "cancelled",
            reason: "Activity Journal delete",
          }),
        });

        const payload = await response.json().catch(() => null) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || `Activity delete failed: ${response.status}`);
        }
      } else {
        const response = await fetch("/api/calendar-rebuild/events", {
          credentials: "include",
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ id: item.sourceId }),
        });

        const payload = await response.json().catch(() => null) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || `Calendar cancel failed: ${response.status}`);
        }
      }

      setSelectedItem(null);
      setRefreshKey((current) => current + 1);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unknown cancel error");
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreItem(item: JournalItem) {
    if (!item.sourceId) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (item.kind === "activity") {
        const response = await fetch(`/api/activity/events/${encodeURIComponent(item.sourceId)}`, {
          credentials: "include",
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: "completed",
            reason: "Activity Journal restore",
          }),
        });

        const payload = await response.json().catch(() => null) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || `Activity restore failed: ${response.status}`);
        }
      } else {
        const response = await fetch("/api/calendar-rebuild/events", {
          credentials: "include",
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ id: item.sourceId, status: "planned" }),
        });

        const payload = await response.json().catch(() => null) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || `Calendar restore failed: ${response.status}`);
        }
      }

      setSelectedItem(null);
      setRefreshKey((current) => current + 1);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Unknown restore error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f2f7] px-3 py-5 text-[#1a1d2e]">
      <div className="mx-auto max-w-[1520px] space-y-4">
        <section className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#7c8099]">
                {ui.pageSubtitle}
              </p>
            </div>

            <Link
              href={addHref}
              className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow"
            >
              + {ui.add}
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
                {ui.logTab}
              </div>
              <h2 className="mt-1 text-xl font-bold text-[#1a1d2e]">{ui.title}</h2>
              <p className="mt-1 text-sm font-medium text-[#7c8099]">{ui.subtitle}</p>
            </div>

            <div className="inline-flex rounded-xl bg-[#f5f6fb] p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={[
                  "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
                  viewMode === "cards"
                    ? "bg-white text-[#3b6ef8] shadow-sm"
                    : "text-[#7c8099] hover:text-[#1a1d2e]",
                ].join(" ")}
              >
                <LayoutGrid size={15} />
                {ui.cardsView}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={[
                  "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
                  viewMode === "table"
                    ? "bg-white text-[#3b6ef8] shadow-sm"
                    : "text-[#7c8099] hover:text-[#1a1d2e]",
                ].join(" ")}
              >
                <Table2 size={15} />
                {ui.tableView}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {ui.loadError} {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-dashed border-[#d8deef] bg-[#fbfcff] p-5 text-sm font-semibold text-[#7c8099]">
              ...
            </div>
          ) : journalItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8deef] bg-[#fbfcff] p-5 text-sm font-semibold text-[#7c8099]">
              {ui.empty}
            </div>
          ) : viewMode === "table" ? (
            <ArctorTabulator<JournalTableRow>
              data={journalTableRows}
              columns={journalTableColumns}
              rowKey="id"
              emptyLabel={ui.empty}
              height="min(66vh, 720px)"
              onRowClick={(row) => openItem(row.item)}
            />
          ) : (
            <div className="space-y-3">
              {journalItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#e2e6f2] bg-[#fbfcff] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                        {formatDateTime(item.occurredAt, locale)}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-relaxed text-[#1a1d2e]">
                        {item.actorName} {item.action}{" "}
                        {item.kind === "activity" && item.sourceId ? (
                          <Link
                            href={`/activity-ai-lab?${new URLSearchParams({
                              locale,
                              activityEventId: item.sourceId,
                            }).toString()}`}
                            className="font-bold text-[#3b6ef8] underline-offset-4 hover:underline"
                          >
                            “{item.title}”
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openItem(item)}
                            className="font-bold text-[#3b6ef8] underline-offset-4 hover:underline"
                          >
                            “{item.title}”
                          </button>
                        )}
                      </div>
                      {item.eventTime ? (
                        <div className="mt-1 text-xs font-medium text-[#7c8099]">
                          {ui.eventTime}: {item.eventTime}
                        </div>
                      ) : null}
                      {item.kind === "activity" ? (
                        <div className="mt-2">
                          <ActivityLifecycleBadge
                            locale={locale}
                            planned={
                              (item.raw as ActivityEventSummary).activityRoleCode === "planned" ||
                              (item.raw as ActivityEventSummary).temporalDirection === "future"
                            }
                          />
                        </div>
                      ) : null}
                      {item.kind === "activity" && item.sourceId ? (
                        <div className="mt-2 text-xs font-bold text-[#667091]">
                          {getBasicAnalysisStatusText(
                            locale,
                            basicIntakeAnalysesByActivityId[item.sourceId]?.status,
                          )}
                        </div>
                      ) : null}
                      {item.kind === "activity" && item.sourceId ? (
                        <ActivityMutualPreview
                          relation={mutualLinksByActivityId[item.sourceId] ?? null}
                          locale={locale}
                          compact
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.canCancel ? (
                        <button
                          type="button"
                          onClick={() => void cancelItem(item)}
                          disabled={isSaving}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                        >
                          {ui.cancel}
                        </button>
                      ) : null}

                      {item.canRestore ? (
                        <button
                          type="button"
                          onClick={() => void restoreItem(item)}
                          disabled={isSaving}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50"
                        >
                          {ui.restore}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedItem ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-3 py-4"
            onClick={() => {
              setSelectedItem(null);
              setIsEditing(false);
            }}
          >
            <div
              className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">
                    {ui.selectedEntry}
                  </div>
                  <h3 className="mt-2 text-xl font-bold">{selectedItem.title}</h3>
                  <div className="mt-1 text-sm font-medium text-[#7c8099]">
                    {selectedItem.eventTime ?? formatDateTime(selectedItem.occurredAt, locale)}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-[rgba(0,0,0,0.06)] px-3 py-1.5 text-lg font-bold leading-none text-[#7c8099] hover:bg-[#f5f6fb]"
                  onClick={() => {
                    setSelectedItem(null);
                    setIsEditing(false);
                  }}
                  aria-label="Close"
                >
                  x
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {isEditing && selectedItem.kind === "activity" ? (
                  <div className="grid gap-3 rounded-xl border border-[#d8deef] bg-[#fbfcff] p-3">
                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {ui.description}
                      <textarea
                        value={editDraft.description}
                        onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
                        rows={4}
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                        {ui.start}
                        <input
                          type="datetime-local"
                          value={editDraft.startedAtLocal}
                          onChange={(event) => setEditDraft((current) => ({ ...current, startedAtLocal: event.target.value }))}
                          className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                        {ui.end}
                        <input
                          type="datetime-local"
                          value={editDraft.endedAtLocal}
                          onChange={(event) => setEditDraft((current) => ({ ...current, endedAtLocal: event.target.value }))}
                          className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                        />
                      </label>
                    </div>

                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {ui.duration}
                      <input
                        value={editDraft.durationMinutes}
                        onChange={(event) => setEditDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveSelectedActivity()}
                        disabled={isSaving}
                        className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        {ui.save}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] disabled:opacity-50"
                      >
                        {ui.back}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] p-3 text-sm text-[#7c8099]">
                      <div className="font-bold text-[#1a1d2e]">{ui.eventTime}</div>
                      <div className="mt-1">{selectedItem.eventTime ?? "—"}</div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-sm text-[#7c8099]">
                      <div className="font-bold text-[#1a1d2e]">{ui.description}</div>
                      <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                        {selectedItem.description || "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3 text-xs leading-relaxed text-[#7c8099]">
                      {ui.status}: {selectedItem.status}<br />
                      {ui.source}: {selectedItem.source}
                    </div>

                    {selectedItem.kind === "activity" && selectedItem.sourceId ? (
                      <ActivityMutualPreview
                        relation={mutualLinksByActivityId[selectedItem.sourceId] ?? null}
                        locale={locale}
                      />
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={selectedItem.containerHref}
                        className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] shadow-sm hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                      >
                        {ui.container}
                      </Link>

                      {selectedItem.canEdit ? (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          disabled={isSaving || selectedItem.kind !== "activity"}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                        >
                          {ui.edit}
                        </button>
                      ) : null}

                      {selectedItem.canCancel ? (
                        <button
                          type="button"
                          onClick={() => void cancelItem(selectedItem)}
                          disabled={isSaving}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                        >
                          {ui.cancel}
                        </button>
                      ) : null}

                      {selectedItem.canRestore ? (
                        <button
                          type="button"
                          onClick={() => void restoreItem(selectedItem)}
                          disabled={isSaving}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50"
                        >
                          {ui.restore}
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
