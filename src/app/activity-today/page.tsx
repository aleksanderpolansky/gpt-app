"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ActivityEventSummary = {
  id: string | null;
  title: string | null;
  status: string | null;
  source: string | null;
  temporalDirection?: string | null;
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
  if (event.temporalDirection === "past") {
    return true;
  }

  if (event.temporalDirection === "future") {
    return false;
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
  const start = event.startedAt ?? event.createdAt ?? event.updatedAt ?? null;
  const end = event.endedAt ?? null;
  const eventTime = start
    ? `${formatDateTime(start, locale)}${end ? ` - ${formatDateTime(end, locale)}` : ""}`
    : null;

  return {
    id: `activity:${sourceId ?? index}`,
    kind: "activity",
    sourceId,
    occurredAt: event.updatedAt ?? event.createdAt ?? start,
    title,
    action: activityAction(event.status, ui),
    actorName: ui.actor,
    eventTime,
    source: event.source ?? "activity_events",
    status: event.temporalDirection ? `${event.status ?? "unknown"} / ${event.temporalDirection}` : event.status ?? "unknown",
    description: event.comment ?? "",
    canEdit: Boolean(sourceId) && event.status !== "cancelled" && event.status !== "archived",
    canCancel: Boolean(sourceId) && event.status !== "cancelled" && event.status !== "archived",
    canRestore: Boolean(sourceId) && (event.status === "cancelled" || event.status === "archived"),
    containerHref: `/calendar/activity-review?${new URLSearchParams({
      locale,
      text: title,
      returnTo: "activity-journal",
      temporalDirection: "past",
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

export default function ActivityTodayPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activityEvents, setActivityEvents] = useState<ActivityEventSummary[]>([]);
  const [calendarLogs, setCalendarLogs] = useState<CalendarLogSummary[]>([]);
  const [selectedItem, setSelectedItem] = useState<JournalItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    description: "",
    startedAtLocal: "",
    endedAtLocal: "",
    durationMinutes: "30",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setLocale(normalizeLocale(new URLSearchParams(window.location.search).get("locale")));
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

  function openItem(item: JournalItem, edit = false) {
    setSelectedItem(item);
    setIsEditing(edit);

    const activity = item.kind === "activity" ? item.raw as ActivityEventSummary : null;

    setEditDraft({
      description: item.description,
      startedAtLocal: formatDatetimeLocal(activity?.startedAt ?? null),
      endedAtLocal: formatDatetimeLocal(activity?.endedAt ?? null),
      durationMinutes: String(activity?.durationMinutes ?? 30),
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
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
              {ui.logTab}
            </div>
            <h2 className="mt-1 text-xl font-bold text-[#1a1d2e]">{ui.title}</h2>
            <p className="mt-1 text-sm font-medium text-[#7c8099]">{ui.subtitle}</p>
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
                        <button
                          type="button"
                          onClick={() => openItem(item)}
                          className="font-bold text-[#3b6ef8] underline-offset-4 hover:underline"
                        >
                          “{item.title}”
                        </button>
                      </div>
                      {item.eventTime ? (
                        <div className="mt-1 text-xs font-medium text-[#7c8099]">
                          {ui.eventTime}: {item.eventTime}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="rounded-lg border border-[#d8deef] bg-white px-3 py-1.5 text-xs font-bold text-[#667091]"
                      >
                        {ui.open}
                      </button>

                      <Link
                        href={item.containerHref}
                        className="rounded-lg border border-[#d8deef] bg-white px-3 py-1.5 text-xs font-bold text-[#667091]"
                      >
                        {ui.container}
                      </Link>

                      {item.canEdit ? (
                        <button
                          type="button"
                          onClick={() => openItem(item, true)}
                          disabled={isSaving}
                          className="rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {ui.edit}
                        </button>
                      ) : null}

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