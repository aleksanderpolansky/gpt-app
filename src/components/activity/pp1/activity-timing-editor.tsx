"use client";

import type { ActivityTimingDraftPp1, ActivityTimingLocalePp1, ActivityTemporalDirectionPp1 } from "@/lib/activity/pp1/activityTiming";

const COPY: Record<ActivityTimingLocalePp1, {
  titleFuture: string;
  titlePast: string;
  mode: string;
  unscheduled: string;
  dateOnly: string;
  dateRange: string;
  deadline: string;
  exact: string;
  date: string;
  startDate: string;
  endDate: string;
  deadlineAt: string;
  actualDate: string;
  start: string;
  end: string;
  duration: string;
  optional: string;
  noDefaults: string;
  invalid: string;
}> = {
  en: {
    titleFuture: "Planned schedule",
    titlePast: "Actual timing",
    mode: "Schedule mode",
    unscheduled: "Without date",
    dateOnly: "Date only",
    dateRange: "Date range",
    deadline: "Deadline",
    exact: "Exact time",
    date: "Date",
    startDate: "Start date",
    endDate: "End date",
    deadlineAt: "Deadline date and time",
    actualDate: "Observed date",
    start: "Start",
    end: "End",
    duration: "Duration, minutes",
    optional: "optional",
    noDefaults: "Missing date, time or duration stays unknown. The system does not insert 08:00 or 30 minutes.",
    invalid: "Complete the required schedule fields before saving.",
  },
  pl: {
    titleFuture: "Harmonogram planu",
    titlePast: "Czas wykonania",
    mode: "Tryb planowania",
    unscheduled: "Bez daty",
    dateOnly: "Tylko data",
    dateRange: "Zakres dat",
    deadline: "Termin końcowy",
    exact: "Dokładny czas",
    date: "Data",
    startDate: "Data początkowa",
    endDate: "Data końcowa",
    deadlineAt: "Data i czas terminu",
    actualDate: "Zaobserwowana data",
    start: "Początek",
    end: "Koniec",
    duration: "Czas trwania, minuty",
    optional: "opcjonalnie",
    noDefaults: "Brak daty, czasu lub długości pozostaje brakiem. System nie dodaje 08:00 ani 30 minut.",
    invalid: "Uzupełnij wymagane pola harmonogramu przed zapisem.",
  },
  ru: {
    titleFuture: "Расписание плана",
    titlePast: "Фактическое время",
    mode: "Режим планирования",
    unscheduled: "Без даты",
    dateOnly: "Только дата",
    dateRange: "Диапазон дат",
    deadline: "Крайний срок",
    exact: "Точное время",
    date: "Дата",
    startDate: "Начальная дата",
    endDate: "Конечная дата",
    deadlineAt: "Дата и время крайнего срока",
    actualDate: "Наблюдаемая дата",
    start: "Начало",
    end: "Завершение",
    duration: "Длительность, минуты",
    optional: "необязательно",
    noDefaults: "Если дата, время или длительность не указаны, они остаются неизвестными. Система не подставляет 08:00 или 30 минут.",
    invalid: "Перед сохранением заполните обязательные поля расписания.",
  },
  uk: {
    titleFuture: "Розклад плану",
    titlePast: "Фактичний час",
    mode: "Режим планування",
    unscheduled: "Без дати",
    dateOnly: "Тільки дата",
    dateRange: "Діапазон дат",
    deadline: "Крайній термін",
    exact: "Точний час",
    date: "Дата",
    startDate: "Початкова дата",
    endDate: "Кінцева дата",
    deadlineAt: "Дата й час крайнього терміну",
    actualDate: "Спостережувана дата",
    start: "Початок",
    end: "Завершення",
    duration: "Тривалість, хвилини",
    optional: "необов’язково",
    noDefaults: "Якщо дату, час або тривалість не вказано, вони залишаються невідомими. Система не підставляє 08:00 або 30 хвилин.",
    invalid: "Перед збереженням заповніть обов’язкові поля розкладу.",
  },
  de: {
    titleFuture: "Planungszeitraum",
    titlePast: "Tatsächliche Zeit",
    mode: "Planungsmodus",
    unscheduled: "Ohne Datum",
    dateOnly: "Nur Datum",
    dateRange: "Datumsbereich",
    deadline: "Frist",
    exact: "Genaue Zeit",
    date: "Datum",
    startDate: "Startdatum",
    endDate: "Enddatum",
    deadlineAt: "Datum und Uhrzeit der Frist",
    actualDate: "Beobachtetes Datum",
    start: "Start",
    end: "Ende",
    duration: "Dauer, Minuten",
    optional: "optional",
    noDefaults: "Fehlendes Datum, Zeit oder Dauer bleibt unbekannt. Das System setzt weder 08:00 noch 30 Minuten ein.",
    invalid: "Fülle vor dem Speichern die erforderlichen Planungsfelder aus.",
  },
  es: {
    titleFuture: "Programación del plan",
    titlePast: "Tiempo real",
    mode: "Modo de planificación",
    unscheduled: "Sin fecha",
    dateOnly: "Solo fecha",
    dateRange: "Rango de fechas",
    deadline: "Fecha límite",
    exact: "Hora exacta",
    date: "Fecha",
    startDate: "Fecha inicial",
    endDate: "Fecha final",
    deadlineAt: "Fecha y hora límite",
    actualDate: "Fecha observada",
    start: "Inicio",
    end: "Fin",
    duration: "Duración, minutos",
    optional: "opcional",
    noDefaults: "La fecha, hora o duración ausente permanece desconocida. El sistema no añade 08:00 ni 30 minutos.",
    invalid: "Completa los campos obligatorios antes de guardar.",
  },
  cs: {
    titleFuture: "Plánovaný termín",
    titlePast: "Skutečný čas",
    mode: "Režim plánování",
    unscheduled: "Bez data",
    dateOnly: "Pouze datum",
    dateRange: "Rozsah dat",
    deadline: "Termín",
    exact: "Přesný čas",
    date: "Datum",
    startDate: "Počáteční datum",
    endDate: "Koncové datum",
    deadlineAt: "Datum a čas termínu",
    actualDate: "Pozorované datum",
    start: "Začátek",
    end: "Konec",
    duration: "Doba trvání, minuty",
    optional: "volitelné",
    noDefaults: "Chybějící datum, čas nebo délka zůstává neznámá. Systém nedoplňuje 08:00 ani 30 minut.",
    invalid: "Před uložením vyplň povinná pole plánování.",
  },
};

const inputClass = "mt-1 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8]";
const labelClass = "text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]";

function addMinutesToLocal(value: string, minutes: number) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setMinutes(parsed.getMinutes() + minutes);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function durationBetweenLocal(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
  return duration > 0 ? duration : null;
}

function clearFieldsForMode(
  draft: ActivityTimingDraftPp1,
  scheduleModeCode: ActivityTimingDraftPp1["scheduleModeCode"],
): ActivityTimingDraftPp1 {
  return {
    ...draft,
    scheduleModeCode,
    scheduledDate: scheduleModeCode === "date_only" ? draft.scheduledDate : "",
    scheduleStartDate: scheduleModeCode === "date_range" ? draft.scheduleStartDate : "",
    scheduleEndDate: scheduleModeCode === "date_range" ? draft.scheduleEndDate : "",
    deadlineLocal: scheduleModeCode === "deadline" ? draft.deadlineLocal : "",
    startedAtLocal: scheduleModeCode === "exact" ? draft.startedAtLocal : "",
    endedAtLocal: scheduleModeCode === "exact" ? draft.endedAtLocal : "",
  };
}

export function ActivityTimingEditorPp1({
  locale,
  temporalDirection,
  draft,
  onChange,
  valid,
}: {
  locale: ActivityTimingLocalePp1;
  temporalDirection: ActivityTemporalDirectionPp1;
  draft: ActivityTimingDraftPp1;
  onChange: (next: ActivityTimingDraftPp1) => void;
  valid: boolean;
}) {
  const copy = COPY[locale];
  const patch = (values: Partial<ActivityTimingDraftPp1>) => onChange({ ...draft, ...values });

  const modeOptions = [
    { value: "unscheduled" as const, label: copy.unscheduled },
    { value: "date_only" as const, label: copy.dateOnly },
    { value: "date_range" as const, label: copy.dateRange },
    { value: "deadline" as const, label: copy.deadline },
    { value: "exact" as const, label: copy.exact },
  ];

  function updateStart(value: string) {
    const next: Partial<ActivityTimingDraftPp1> = { startedAtLocal: value };
    const duration = Number(draft.durationMinutes);

    if (value && Number.isFinite(duration) && duration > 0) {
      next.endedAtLocal = addMinutesToLocal(value, duration);
    } else if (value && draft.endedAtLocal) {
      const calculated = durationBetweenLocal(value, draft.endedAtLocal);
      next.durationMinutes = calculated ? String(calculated) : "";
    }

    patch(next);
  }

  function updateEnd(value: string) {
    const calculated = draft.startedAtLocal
      ? durationBetweenLocal(draft.startedAtLocal, value)
      : null;

    patch({
      endedAtLocal: value,
      ...(calculated ? { durationMinutes: String(calculated) } : {}),
    });
  }

  function updateDuration(value: string) {
    const parsed = Number(value);
    const next: Partial<ActivityTimingDraftPp1> = { durationMinutes: value };

    if (draft.startedAtLocal && Number.isFinite(parsed) && parsed > 0) {
      next.endedAtLocal = addMinutesToLocal(draft.startedAtLocal, Math.round(parsed));
    }

    patch(next);
  }

  return (
    <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c8099]">
        {temporalDirection === "future" ? copy.titleFuture : copy.titlePast}
      </p>

      {temporalDirection === "future" ? (
        <fieldset className="mt-3">
          <legend className={labelClass}>{copy.mode}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {modeOptions.map((option) => {
              const selected = draft.scheduleModeCode === option.value;

              return (
                <label
                  key={option.value}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#3b6ef8] bg-[#eef2ff] text-[#2853c7] shadow-sm"
                      : "border-[#dfe5f1] bg-white text-[#52607a] hover:border-[#b9c8ff]"
                  } ${option.value === "exact" ? "sm:col-span-2" : ""}`}
                >
                  <input
                    type="radio"
                    name="activity-schedule-mode"
                    value={option.value}
                    checked={selected}
                    onChange={() => onChange(clearFieldsForMode(draft, option.value))}
                    className="h-4 w-4 accent-[#3b6ef8]"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {temporalDirection === "past" ? (
          <label className={labelClass}>
            {copy.actualDate} · {copy.optional}
            <input
              type="date"
              value={draft.observedDate}
              onChange={(event) => patch({ observedDate: event.target.value })}
              className={inputClass}
            />
          </label>
        ) : null}

        {temporalDirection === "future" && draft.scheduleModeCode === "date_only" ? (
          <label className={labelClass}>
            {copy.date}
            <input
              type="date"
              value={draft.scheduledDate}
              onChange={(event) => patch({ scheduledDate: event.target.value })}
              className={inputClass}
            />
          </label>
        ) : null}

        {temporalDirection === "future" && draft.scheduleModeCode === "date_range" ? (
          <>
            <label className={labelClass}>
              {copy.startDate}
              <input
                type="date"
                value={draft.scheduleStartDate}
                onChange={(event) => patch({ scheduleStartDate: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {copy.endDate}
              <input
                type="date"
                value={draft.scheduleEndDate}
                onChange={(event) => patch({ scheduleEndDate: event.target.value })}
                className={inputClass}
              />
            </label>
          </>
        ) : null}

        {temporalDirection === "future" && draft.scheduleModeCode === "deadline" ? (
          <label className={`${labelClass} sm:col-span-2`}>
            {copy.deadlineAt}
            <input
              type="datetime-local"
              value={draft.deadlineLocal}
              onChange={(event) => patch({ deadlineLocal: event.target.value })}
              className={inputClass}
            />
          </label>
        ) : null}

        {(temporalDirection === "past" || draft.scheduleModeCode === "exact") ? (
          <>
            <label className={labelClass}>
              {copy.start} · {temporalDirection === "past" ? copy.optional : ""}
              <input
                type="datetime-local"
                value={draft.startedAtLocal}
                onChange={(event) => updateStart(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {copy.end} · {copy.optional}
              <input
                type="datetime-local"
                value={draft.endedAtLocal}
                onChange={(event) => updateEnd(event.target.value)}
                className={inputClass}
              />
            </label>
          </>
        ) : null}

        <label className={`${labelClass} ${temporalDirection === "future" && draft.scheduleModeCode === "deadline" ? "sm:col-span-2" : ""}`}>
          {copy.duration} · {copy.optional}
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={draft.durationMinutes}
            onChange={(event) => updateDuration(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#52607a]">{copy.noDefaults}</p>
      {!valid ? <p className="mt-2 text-xs font-semibold text-[#be123c]">{copy.invalid}</p> : null}
    </div>
  );
}
