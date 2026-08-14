import type { AiLabUiLocale } from "@/lib/activity/aiLabUiCopy";

export type QuickCaptureTemporalModeCopy = {
  modeLabel: string;
  actual: string;
  actualHint: string;
  planned: string;
  plannedHint: string;
  titlePlanned: string;
  subtitlePlanned: string;
  analyzeActual: string;
  analyzePlanned: string;
  selectedActualTrace: string;
  selectedPlannedTrace: string;
  conflictFutureForActual: string;
  conflictPastForPlanned: string;
};

export const QUICK_CAPTURE_TEMPORAL_MODE_COPY: Record<AiLabUiLocale, QuickCaptureTemporalModeCopy> = {
  ru: {
    modeLabel: "Что это за запись?",
    actual: "Произошло",
    actualHint: "Сохранить как фактическое событие в журнале.",
    planned: "Запланировать",
    plannedHint: "Создать плановую активность и, если есть точное время, добавить её в календарь.",
    titlePlanned: "Запланировать активность",
    subtitlePlanned: "Опиши, что собираешься сделать. Укажи дату, время и длительность, если они известны.",
    analyzeActual: "Разобрать произошедшее",
    analyzePlanned: "Добавить в календарь",
    selectedActualTrace: "Пользователь явно выбрал режим «Произошло». Модель не может заменить его на плановую активность.",
    selectedPlannedTrace: "Пользователь явно выбрал режим «Запланировать». Модель не может заменить его на уже произошедшее событие.",
    conflictFutureForActual: "Выбран режим «Произошло», но указанное время или дата находятся в будущем. Исправь время либо переключи запись на «Запланировать».",
    conflictPastForPlanned: "Выбран режим «Запланировать», но указанная дата или время находятся в прошлом. Исправь время либо переключи запись на «Произошло».",
  },
  en: {
    modeLabel: "What kind of entry is this?",
    actual: "Happened",
    actualHint: "Save it as an actual event in the activity journal.",
    planned: "Plan",
    plannedHint: "Create a planned activity and add it to the calendar when an exact time is available.",
    titlePlanned: "Plan an activity",
    subtitlePlanned: "Describe what you intend to do. Add the date, time and duration when known.",
    analyzeActual: "Analyze what happened",
    analyzePlanned: "Add to calendar",
    selectedActualTrace: "The user explicitly selected “Happened”. The model may not convert it into a planned activity.",
    selectedPlannedTrace: "The user explicitly selected “Plan”. The model may not convert it into an already completed event.",
    conflictFutureForActual: "“Happened” is selected, but the stated date or time is in the future. Correct the time or switch to “Plan”.",
    conflictPastForPlanned: "“Plan” is selected, but the stated date or time is in the past. Correct the time or switch to “Happened”.",
  },
  pl: {
    modeLabel: "Jaki to rodzaj wpisu?",
    actual: "Wydarzyło się",
    actualHint: "Zapisz jako faktyczne zdarzenie w dzienniku aktywności.",
    planned: "Zaplanuj",
    plannedHint: "Utwórz planowaną aktywność i dodaj ją do kalendarza, gdy podano dokładny czas.",
    titlePlanned: "Zaplanuj aktywność",
    subtitlePlanned: "Opisz, co zamierzasz zrobić. Podaj datę, godzinę i czas trwania, jeśli są znane.",
    analyzeActual: "Przeanalizuj to, co się wydarzyło",
    analyzePlanned: "Dodaj do kalendarza",
    selectedActualTrace: "Użytkownik wyraźnie wybrał tryb „Wydarzyło się”. Model nie może zamienić go na aktywność planowaną.",
    selectedPlannedTrace: "Użytkownik wyraźnie wybrał tryb „Zaplanuj”. Model nie może zamienić go na już wykonane zdarzenie.",
    conflictFutureForActual: "Wybrano „Wydarzyło się”, ale podana data lub godzina jest w przyszłości. Popraw czas albo przełącz na „Zaplanuj”.",
    conflictPastForPlanned: "Wybrano „Zaplanuj”, ale podana data lub godzina jest w przeszłości. Popraw czas albo przełącz na „Wydarzyło się”.",
  },
  uk: {
    modeLabel: "Що це за запис?",
    actual: "Сталося",
    actualHint: "Зберегти як фактичну подію в журналі активності.",
    planned: "Запланувати",
    plannedHint: "Створити планову активність і, якщо є точний час, додати її до календаря.",
    titlePlanned: "Запланувати активність",
    subtitlePlanned: "Опиши, що збираєшся зробити. Вкажи дату, час і тривалість, якщо вони відомі.",
    analyzeActual: "Розібрати те, що сталося",
    analyzePlanned: "Додати до календаря",
    selectedActualTrace: "Користувач явно вибрав режим «Сталося». Модель не може замінити його на планову активність.",
    selectedPlannedTrace: "Користувач явно вибрав режим «Запланувати». Модель не може замінити його на вже виконану подію.",
    conflictFutureForActual: "Вибрано «Сталося», але вказані дата або час знаходяться в майбутньому. Виправ час або перемкни на «Запланувати».",
    conflictPastForPlanned: "Вибрано «Запланувати», але вказані дата або час знаходяться в минулому. Виправ час або перемкни на «Сталося».",
  },
  de: {
    modeLabel: "Was für ein Eintrag ist das?",
    actual: "Passiert",
    actualHint: "Als tatsächlich stattgefundenes Ereignis im Aktivitätsjournal speichern.",
    planned: "Planen",
    plannedHint: "Eine geplante Aktivität erstellen und bei genauer Zeit in den Kalender eintragen.",
    titlePlanned: "Aktivität planen",
    subtitlePlanned: "Beschreibe, was du vorhast. Gib Datum, Uhrzeit und Dauer an, wenn sie bekannt sind.",
    analyzeActual: "Geschehenes analysieren",
    analyzePlanned: "Zum Kalender hinzufügen",
    selectedActualTrace: "Der Nutzer hat ausdrücklich „Passiert“ gewählt. Das Modell darf daraus keine geplante Aktivität machen.",
    selectedPlannedTrace: "Der Nutzer hat ausdrücklich „Planen“ gewählt. Das Modell darf daraus kein bereits abgeschlossenes Ereignis machen.",
    conflictFutureForActual: "„Passiert“ ist gewählt, aber Datum oder Uhrzeit liegen in der Zukunft. Korrigiere die Zeit oder wechsle zu „Planen“.",
    conflictPastForPlanned: "„Planen“ ist gewählt, aber Datum oder Uhrzeit liegen in der Vergangenheit. Korrigiere die Zeit oder wechsle zu „Passiert“.",
  },
  es: {
    modeLabel: "¿Qué tipo de registro es?",
    actual: "Ocurrió",
    actualHint: "Guardarlo como un hecho real en el diario de actividades.",
    planned: "Planificar",
    plannedHint: "Crear una actividad planificada y añadirla al calendario cuando exista una hora exacta.",
    titlePlanned: "Planificar una actividad",
    subtitlePlanned: "Describe lo que piensas hacer. Indica la fecha, la hora y la duración si las conoces.",
    analyzeActual: "Analizar lo ocurrido",
    analyzePlanned: "Añadir al calendario",
    selectedActualTrace: "El usuario eligió explícitamente «Ocurrió». El modelo no puede convertirlo en una actividad planificada.",
    selectedPlannedTrace: "El usuario eligió explícitamente «Planificar». El modelo no puede convertirlo en un evento ya realizado.",
    conflictFutureForActual: "Está seleccionado «Ocurrió», pero la fecha o la hora indicadas están en el futuro. Corrige la hora o cambia a «Planificar».",
    conflictPastForPlanned: "Está seleccionado «Planificar», pero la fecha o la hora indicadas están en el pasado. Corrige la hora o cambia a «Ocurrió».",
  },
  cs: {
    modeLabel: "O jaký typ záznamu jde?",
    actual: "Stalo se",
    actualHint: "Uložit jako skutečnou událost do deníku aktivit.",
    planned: "Naplánovat",
    plannedHint: "Vytvořit plánovanou aktivitu a při přesném čase ji přidat do kalendáře.",
    titlePlanned: "Naplánovat aktivitu",
    subtitlePlanned: "Popiš, co chceš udělat. Pokud je znáš, uveď datum, čas a délku trvání.",
    analyzeActual: "Analyzovat, co se stalo",
    analyzePlanned: "Přidat do kalendáře",
    selectedActualTrace: "Uživatel výslovně zvolil „Stalo se“. Model z toho nesmí udělat plánovanou aktivitu.",
    selectedPlannedTrace: "Uživatel výslovně zvolil „Naplánovat“. Model z toho nesmí udělat již proběhlou událost.",
    conflictFutureForActual: "Je zvoleno „Stalo se“, ale uvedené datum nebo čas jsou v budoucnosti. Oprav čas nebo přepni na „Naplánovat“.",
    conflictPastForPlanned: "Je zvoleno „Naplánovat“, ale uvedené datum nebo čas jsou v minulosti. Oprav čas nebo přepni na „Stalo se“.",
  },
};

export function localizeQuickCaptureTemporalModeError(
  message: string,
  locale: AiLabUiLocale,
) {
  if (
    message.includes("P5C_TEMPORAL_MODE_CONFLICT_FUTURE_TIME_FOR_ACTUAL") ||
    message.includes("P5C_TEMPORAL_MODE_CONFLICT_FUTURE_DATE_FOR_ACTUAL")
  ) {
    return QUICK_CAPTURE_TEMPORAL_MODE_COPY[locale].conflictFutureForActual;
  }
  if (
    message.includes("P5C_TEMPORAL_MODE_CONFLICT_PAST_TIME_FOR_PLANNED") ||
    message.includes("P5C_TEMPORAL_MODE_CONFLICT_PAST_DATE_FOR_PLANNED")
  ) {
    return QUICK_CAPTURE_TEMPORAL_MODE_COPY[locale].conflictPastForPlanned;
  }
  return message;
}
