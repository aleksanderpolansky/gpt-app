"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Cux6ShelfItem } from "@/components/calendar/cux6-task-shelf";
import { normalizeTaskOutcomeOptions } from "@/lib/activity/taskOutcomeV1";

type UiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type EditableScheduleMode =
  | "unscheduled"
  | "date_only"
  | "date_range"
  | "deadline"
  | "exact";

type UpdateResponse = {
  ok?: boolean;
  error?: string;
  warning?: string | null;
  activity?: Cux6ShelfItem | null;
};

type Cux6TaskDetailModalProps = {
  item: Cux6ShelfItem;
  locale: UiLocale;
  returnToTarget: "calendar" | "calendar-rebuild";
  initialEditing?: boolean;
  onClose: () => void;
  onChanged: (
    item: Cux6ShelfItem | null,
    action: "updated" | "cancelled" | "completed",
  ) => void;
};

type Copy = {
  eyebrow: string;
  close: string;
  schedule: string;
  description: string;
  noDescription: string;
  status: string;
  source: string;
  privacy: string;
  analysis: string;
  edit: string;
  cancel: string;
  save: string;
  back: string;
  title: string;
  scheduleMode: string;
  scheduledDate: string;
  rangeStart: string;
  rangeEnd: string;
  deadline: string;
  exactStart: string;
  exactEnd: string;
  duration: string;
  confirmCancel: string;
  validation: string;
  saveError: string;
  cancelError: string;
  modes: Record<EditableScheduleMode, string>;
};

type OutcomeCopy = {
  outcomes: string;
  outcomeHint: string;
  complete: string;
  completeError: string;
};

const OUTCOME_COPY: Record<UiLocale, OutcomeCopy> = {
  en: { outcomes: "Result options", outcomeHint: "One option per line, up to 8.", complete: "Complete with result", completeError: "Could not complete the activity." },
  pl: { outcomes: "Warianty wyniku", outcomeHint: "Jeden wariant w wierszu, maks. 8.", complete: "Zakończ z wynikiem", completeError: "Nie udało się zakończyć aktywności." },
  ru: { outcomes: "Варианты результата", outcomeHint: "По одному варианту в строке, до 8.", complete: "Завершить с результатом", completeError: "Не удалось завершить активность." },
  uk: { outcomes: "Варіанти результату", outcomeHint: "Один варіант у рядку, до 8.", complete: "Завершити з результатом", completeError: "Не вдалося завершити активність." },
  de: { outcomes: "Ergebnisoptionen", outcomeHint: "Eine Option pro Zeile, maximal 8.", complete: "Mit Ergebnis abschließen", completeError: "Aktivität konnte nicht abgeschlossen werden." },
  es: { outcomes: "Opciones de resultado", outcomeHint: "Una opción por línea, hasta 8.", complete: "Completar con resultado", completeError: "No se pudo completar la actividad." },
  cs: { outcomes: "Možnosti výsledku", outcomeHint: "Jedna možnost na řádek, nejvýše 8.", complete: "Dokončit s výsledkem", completeError: "Aktivitu se nepodařilo dokončit." },
};

const COPY: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Planned activity",
    close: "Close",
    schedule: "Schedule",
    description: "Description",
    noDescription: "No description",
    status: "Status",
    source: "Source",
    privacy: "Privacy",
    analysis: "Analysis",
    edit: "Edit",
    cancel: "Cancel activity",
    save: "Save",
    back: "Back",
    title: "Title",
    scheduleMode: "Schedule mode",
    scheduledDate: "Date",
    rangeStart: "Range start",
    rangeEnd: "Range end",
    deadline: "Deadline",
    exactStart: "Start",
    exactEnd: "End",
    duration: "Duration, minutes",
    confirmCancel: "Cancel this planned activity?",
    validation: "Complete the required schedule fields.",
    saveError: "The activity could not be updated.",
    cancelError: "The activity could not be cancelled.",
    modes: {
      unscheduled: "Without date",
      date_only: "Date only",
      date_range: "Date range",
      deadline: "Deadline",
      exact: "Exact time",
    },
  },
  pl: {
    eyebrow: "Planowana aktywność",
    close: "Zamknij",
    schedule: "Harmonogram",
    description: "Opis",
    noDescription: "Brak opisu",
    status: "Status",
    source: "Źródło",
    privacy: "Prywatność",
    analysis: "Analiza",
    edit: "Edytuj",
    cancel: "Anuluj aktywność",
    save: "Zapisz",
    back: "Wstecz",
    title: "Nazwa",
    scheduleMode: "Tryb planowania",
    scheduledDate: "Data",
    rangeStart: "Początek zakresu",
    rangeEnd: "Koniec zakresu",
    deadline: "Termin",
    exactStart: "Początek",
    exactEnd: "Koniec",
    duration: "Czas trwania, minuty",
    confirmCancel: "Anulować tę planowaną aktywność?",
    validation: "Uzupełnij wymagane pola harmonogramu.",
    saveError: "Nie udało się zaktualizować aktywności.",
    cancelError: "Nie udało się anulować aktywności.",
    modes: {
      unscheduled: "Bez daty",
      date_only: "Tylko data",
      date_range: "Zakres dat",
      deadline: "Termin",
      exact: "Dokładny czas",
    },
  },
  ru: {
    eyebrow: "Плановая активность",
    close: "Закрыть",
    schedule: "Расписание",
    description: "Описание",
    noDescription: "Описание отсутствует",
    status: "Статус",
    source: "Источник",
    privacy: "Приватность",
    analysis: "Анализ",
    edit: "Редактировать",
    cancel: "Отменить активность",
    save: "Сохранить",
    back: "Назад",
    title: "Название",
    scheduleMode: "Режим планирования",
    scheduledDate: "Дата",
    rangeStart: "Начало диапазона",
    rangeEnd: "Конец диапазона",
    deadline: "Крайний срок",
    exactStart: "Начало",
    exactEnd: "Завершение",
    duration: "Длительность, минуты",
    confirmCancel: "Отменить эту плановую активность?",
    validation: "Заполните обязательные поля расписания.",
    saveError: "Не удалось обновить активность.",
    cancelError: "Не удалось отменить активность.",
    modes: {
      unscheduled: "Без даты",
      date_only: "Только дата",
      date_range: "Диапазон дат",
      deadline: "Крайний срок",
      exact: "Точное время",
    },
  },
  uk: {
    eyebrow: "Запланована активність",
    close: "Закрити",
    schedule: "Розклад",
    description: "Опис",
    noDescription: "Опис відсутній",
    status: "Статус",
    source: "Джерело",
    privacy: "Приватність",
    analysis: "Аналіз",
    edit: "Редагувати",
    cancel: "Скасувати активність",
    save: "Зберегти",
    back: "Назад",
    title: "Назва",
    scheduleMode: "Режим планування",
    scheduledDate: "Дата",
    rangeStart: "Початок діапазону",
    rangeEnd: "Кінець діапазону",
    deadline: "Крайній термін",
    exactStart: "Початок",
    exactEnd: "Завершення",
    duration: "Тривалість, хвилини",
    confirmCancel: "Скасувати цю заплановану активність?",
    validation: "Заповніть обов’язкові поля розкладу.",
    saveError: "Не вдалося оновити активність.",
    cancelError: "Не вдалося скасувати активність.",
    modes: {
      unscheduled: "Без дати",
      date_only: "Тільки дата",
      date_range: "Діапазон дат",
      deadline: "Крайній термін",
      exact: "Точний час",
    },
  },
  de: {
    eyebrow: "Geplante Aktivität",
    close: "Schließen",
    schedule: "Zeitplan",
    description: "Beschreibung",
    noDescription: "Keine Beschreibung",
    status: "Status",
    source: "Quelle",
    privacy: "Privatsphäre",
    analysis: "Analyse",
    edit: "Bearbeiten",
    cancel: "Aktivität stornieren",
    save: "Speichern",
    back: "Zurück",
    title: "Titel",
    scheduleMode: "Planungsmodus",
    scheduledDate: "Datum",
    rangeStart: "Bereichsbeginn",
    rangeEnd: "Bereichsende",
    deadline: "Frist",
    exactStart: "Beginn",
    exactEnd: "Ende",
    duration: "Dauer, Minuten",
    confirmCancel: "Diese geplante Aktivität stornieren?",
    validation: "Füllen Sie die erforderlichen Zeitplanfelder aus.",
    saveError: "Die Aktivität konnte nicht aktualisiert werden.",
    cancelError: "Die Aktivität konnte nicht storniert werden.",
    modes: {
      unscheduled: "Ohne Datum",
      date_only: "Nur Datum",
      date_range: "Datumsbereich",
      deadline: "Frist",
      exact: "Genaue Zeit",
    },
  },
  es: {
    eyebrow: "Actividad planificada",
    close: "Cerrar",
    schedule: "Horario",
    description: "Descripción",
    noDescription: "Sin descripción",
    status: "Estado",
    source: "Fuente",
    privacy: "Privacidad",
    analysis: "Análisis",
    edit: "Editar",
    cancel: "Cancelar actividad",
    save: "Guardar",
    back: "Volver",
    title: "Título",
    scheduleMode: "Modo de planificación",
    scheduledDate: "Fecha",
    rangeStart: "Inicio del intervalo",
    rangeEnd: "Fin del intervalo",
    deadline: "Fecha límite",
    exactStart: "Inicio",
    exactEnd: "Fin",
    duration: "Duración, minutos",
    confirmCancel: "¿Cancelar esta actividad planificada?",
    validation: "Complete los campos obligatorios del horario.",
    saveError: "No se pudo actualizar la actividad.",
    cancelError: "No se pudo cancelar la actividad.",
    modes: {
      unscheduled: "Sin fecha",
      date_only: "Solo fecha",
      date_range: "Intervalo de fechas",
      deadline: "Fecha límite",
      exact: "Hora exacta",
    },
  },
  cs: {
    eyebrow: "Plánovaná aktivita",
    close: "Zavřít",
    schedule: "Plán",
    description: "Popis",
    noDescription: "Bez popisu",
    status: "Stav",
    source: "Zdroj",
    privacy: "Soukromí",
    analysis: "Analýza",
    edit: "Upravit",
    cancel: "Zrušit aktivitu",
    save: "Uložit",
    back: "Zpět",
    title: "Název",
    scheduleMode: "Režim plánování",
    scheduledDate: "Datum",
    rangeStart: "Začátek rozsahu",
    rangeEnd: "Konec rozsahu",
    deadline: "Termín",
    exactStart: "Začátek",
    exactEnd: "Konec",
    duration: "Doba trvání, minuty",
    confirmCancel: "Zrušit tuto plánovanou aktivitu?",
    validation: "Vyplňte povinná pole plánu.",
    saveError: "Aktivitu se nepodařilo aktualizovat.",
    cancelError: "Aktivitu se nepodařilo zrušit.",
    modes: {
      unscheduled: "Bez data",
      date_only: "Pouze datum",
      date_range: "Rozsah dat",
      deadline: "Termín",
      exact: "Přesný čas",
    },
  },
};

function normalizeMode(value: string | null): EditableScheduleMode {
  if (
    value === "date_only" ||
    value === "date_range" ||
    value === "deadline" ||
    value === "exact"
  ) {
    return value;
  }

  return "unscheduled";
}

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value: string | null, locale: UiLocale) {
  if (!value) {
    return null;
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

function scheduleSummary(
  item: Cux6ShelfItem,
  locale: UiLocale,
  copy: Copy,
) {
  const mode = normalizeMode(item.scheduleModeCode);

  if (mode === "unscheduled") {
    return copy.modes.unscheduled;
  }

  if (mode === "date_only") {
    return item.scheduledDate ?? copy.modes.date_only;
  }

  if (mode === "date_range") {
    return [item.scheduleStartDate, item.scheduleEndDate]
      .filter(Boolean)
      .join(" – ");
  }

  if (mode === "deadline") {
    return formatDateTime(item.deadlineAt, locale) ?? copy.modes.deadline;
  }

  const start = formatDateTime(item.startedAt, locale);
  const end = formatDateTime(item.endedAt, locale);

  return [start, end].filter(Boolean).join(" – ");
}

function buildAnalysisHref(
  item: Cux6ShelfItem,
  locale: UiLocale,
) {
  const params = new URLSearchParams({
    locale,
    activityEventId: item.id,
  });

  return `/activity-ai-lab?${params.toString()}`;
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function Cux6TaskDetailModal({
  item,
  locale,
  initialEditing = false,
  onClose,
  onChanged,
}: Cux6TaskDetailModalProps) {
  const copy = COPY[locale];
  const [editing, setEditing] = useState(initialEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outcomeCopy = OUTCOME_COPY[locale];

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(
    item.description ?? "",
  );
  const [scheduleMode, setScheduleMode] =
    useState<EditableScheduleMode>(
      normalizeMode(item.scheduleModeCode),
    );
  const [scheduledDate, setScheduledDate] = useState(
    item.scheduledDate ?? "",
  );
  const [scheduleStartDate, setScheduleStartDate] = useState(
    item.scheduleStartDate ?? "",
  );
  const [scheduleEndDate, setScheduleEndDate] = useState(
    item.scheduleEndDate ?? "",
  );
  const [deadlineAt, setDeadlineAt] = useState(
    toDatetimeLocal(item.deadlineAt),
  );
  const [startedAt, setStartedAt] = useState(
    toDatetimeLocal(item.startedAt),
  );
  const [endedAt, setEndedAt] = useState(
    toDatetimeLocal(item.endedAt),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    item.durationMinutes ? String(item.durationMinutes) : "",
  );
  const [outcomeOptionsText, setOutcomeOptionsText] = useState(
    item.outcomeOptions.join("\n"),
  );

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? "");
    setScheduleMode(normalizeMode(item.scheduleModeCode));
    setScheduledDate(item.scheduledDate ?? "");
    setScheduleStartDate(item.scheduleStartDate ?? "");
    setScheduleEndDate(item.scheduleEndDate ?? "");
    setDeadlineAt(toDatetimeLocal(item.deadlineAt));
    setStartedAt(toDatetimeLocal(item.startedAt));
    setEndedAt(toDatetimeLocal(item.endedAt));
    setDurationMinutes(
      item.durationMinutes ? String(item.durationMinutes) : "",
    );
    setOutcomeOptionsText(item.outcomeOptions.join("\n"));
    setError(null);
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const summary = useMemo(
    () => scheduleSummary(item, locale, copy),
    [copy, item, locale],
  );

  function validate() {
    if (!title.trim()) {
      return false;
    }

    if (scheduleMode === "date_only") {
      return Boolean(scheduledDate);
    }

    if (scheduleMode === "date_range") {
      return Boolean(
        scheduleStartDate &&
          scheduleEndDate &&
          scheduleEndDate >= scheduleStartDate,
      );
    }

    if (scheduleMode === "deadline") {
      return Boolean(fromDatetimeLocal(deadlineAt));
    }

    if (scheduleMode === "exact") {
      const start = fromDatetimeLocal(startedAt);
      const end = fromDatetimeLocal(endedAt);
      const duration = parsePositiveInteger(durationMinutes);

      return Boolean(
        start &&
          ((end && new Date(end).getTime() > new Date(start).getTime()) ||
            duration),
      );
    }

    return true;
  }

  async function save() {
    if (!validate()) {
      setError(copy.validation);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            scheduleModeCode: scheduleMode,
            scheduledDate:
              scheduleMode === "date_only" ? scheduledDate : null,
            scheduleStartDate:
              scheduleMode === "date_range"
                ? scheduleStartDate
                : null,
            scheduleEndDate:
              scheduleMode === "date_range" ? scheduleEndDate : null,
            deadlineAt:
              scheduleMode === "deadline"
                ? fromDatetimeLocal(deadlineAt)
                : null,
            startedAt:
              scheduleMode === "exact"
                ? fromDatetimeLocal(startedAt)
                : null,
            endedAt:
              scheduleMode === "exact"
                ? fromDatetimeLocal(endedAt)
                : null,
            durationMinutes:
              scheduleMode === "exact"
                ? parsePositiveInteger(durationMinutes)
                : null,
            outcomeOptions: normalizeTaskOutcomeOptions(outcomeOptionsText),
          }),
        },
      );

      const payload = (await response.json()) as UpdateResponse;

      if (!response.ok || !payload.ok || !payload.activity) {
        throw new Error(payload.error ?? copy.saveError);
      }

      onChanged({ ...item, ...payload.activity }, "updated");
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : copy.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  async function completeActivity(outcomeLabel?: string | null) {
    setSaving(true);
    setError(null);

    try {
      const operationId = globalThis.crypto.randomUUID();
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(item.id)}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationId, outcomeLabel: outcomeLabel ?? null }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error ?? outcomeCopy.completeError);
      }
      onChanged(null, "completed");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : outcomeCopy.completeError);
    } finally {
      setSaving(false);
    }
  }

  async function cancelActivity() {
    if (!window.confirm(copy.confirmCancel)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/calendar/task-shelf/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json()) as UpdateResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? copy.cancelError);
      }

      onChanged(null, "cancelled");
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : copy.cancelError,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 px-3 py-4"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3b6ef8]">
              {copy.eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-bold">{item.title}</h3>
            <div className="mt-1 text-sm font-medium text-[#7c8099]">
              {summary}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={copy.close}
            className="rounded-xl border border-[rgba(0,0,0,0.06)] px-3 py-1.5 text-lg font-bold leading-none text-[#7c8099] hover:bg-[#f5f6fb] disabled:opacity-50"
          >
            x
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {editing ? (
            <div className="grid gap-3 rounded-xl border border-[#d8deef] bg-[#fbfcff] p-3">
              <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                {copy.title}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                {copy.description}
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={3}
                  className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                {copy.scheduleMode}
                <select
                  value={scheduleMode}
                  onChange={(event) =>
                    setScheduleMode(
                      event.target.value as EditableScheduleMode,
                    )
                  }
                  className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                >
                  {(
                    Object.keys(copy.modes) as EditableScheduleMode[]
                  ).map((mode) => (
                    <option key={mode} value={mode}>
                      {copy.modes[mode]}
                    </option>
                  ))}
                </select>
              </label>

              {scheduleMode === "date_only" ? (
                <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                  {copy.scheduledDate}
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(event) =>
                      setScheduledDate(event.target.value)
                    }
                    className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                  />
                </label>
              ) : null}

              {scheduleMode === "date_range" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                    {copy.rangeStart}
                    <input
                      type="date"
                      value={scheduleStartDate}
                      onChange={(event) =>
                        setScheduleStartDate(event.target.value)
                      }
                      className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                    {copy.rangeEnd}
                    <input
                      type="date"
                      value={scheduleEndDate}
                      onChange={(event) =>
                        setScheduleEndDate(event.target.value)
                      }
                      className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                    />
                  </label>
                </div>
              ) : null}

              {scheduleMode === "deadline" ? (
                <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                  {copy.deadline}
                  <input
                    type="datetime-local"
                    value={deadlineAt}
                    onChange={(event) =>
                      setDeadlineAt(event.target.value)
                    }
                    className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                  />
                </label>
              ) : null}

              <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                {outcomeCopy.outcomes}
                <textarea
                  value={outcomeOptionsText}
                  onChange={(event) => setOutcomeOptionsText(event.target.value)}
                  rows={4}
                  placeholder={"Информация найдена\nИнформация не найдена\nНа этой неделе не нужно"}
                  className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                />
                <span className="text-xs font-normal text-[#7c8099]">{outcomeCopy.outcomeHint}</span>
              </label>

              {scheduleMode === "exact" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {copy.exactStart}
                      <input
                        type="datetime-local"
                        value={startedAt}
                        onChange={(event) =>
                          setStartedAt(event.target.value)
                        }
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                      {copy.exactEnd}
                      <input
                        type="datetime-local"
                        value={endedAt}
                        onChange={(event) =>
                          setEndedAt(event.target.value)
                        }
                        className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm font-semibold text-[#1a1d2e]">
                    {copy.duration}
                    <input
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(event) =>
                        setDurationMinutes(event.target.value)
                      }
                      className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#3b6ef8]"
                    />
                  </label>
                </>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {copy.save}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] disabled:opacity-50"
                >
                  {copy.back}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f5f6fb] p-3 text-sm text-[#7c8099]">
                <div className="font-bold text-[#1a1d2e]">
                  {copy.schedule}
                </div>
                <div className="mt-1">{summary}</div>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-sm text-[#7c8099]">
                <div className="font-bold text-[#1a1d2e]">
                  {copy.description}
                </div>
                <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                  {item.description ??
                    item.inputText ??
                    copy.noDescription}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 text-sm text-[#7c8099]">
                <div className="font-bold text-[#1a1d2e]">{outcomeCopy.outcomes}</div>
                {item.outcomeOptions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.outcomeOptions.map((option) => (
                      <span key={option} className="rounded-full border border-[#dce5ff] bg-[#f7f9ff] px-2.5 py-1 text-xs font-bold text-[#315ed8]">{option}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs">{outcomeCopy.outcomeHint}</div>
                )}
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#fbfcff] p-3 text-xs leading-relaxed text-[#7c8099]">
                {copy.status}: {item.status ?? "—"}
                <br />
                {copy.source}: {item.source ?? "—"}
                <br />
                {copy.privacy}: {item.privacyScope ?? "—"}
              </div>

              {!item.isRecurrenceDefinition ? (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-800">{outcomeCopy.complete}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.outcomeOptions.length > 0 ? (
                                    item.outcomeOptions.map((option) => (
                                      <button key={option} type="button" disabled={saving} onClick={() => void completeActivity(option)} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">{option}</button>
                                    ))
                                  ) : (
                                    <button type="button" disabled={saving} onClick={() => void completeActivity(null)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50">{outcomeCopy.complete}</button>
                                  )}
                                </div>
                              </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildAnalysisHref(item, locale)}
                  className="rounded-xl border border-[#d8deef] bg-white px-4 py-2 text-sm font-bold text-[#667091] shadow-sm hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {copy.analysis}
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={saving}
                  className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {copy.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void cancelActivity()}
                  disabled={saving}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50"
                >
                  {copy.cancel}
                </button>
              </div>
            </>
          )}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
