"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Measurement = {
  parameterCode?: string;
  label?: string;
  measureType?: string;
  unit?: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  rawFragment?: string;
  confidence?: number;
  approximate?: boolean;
};

type TemplateCandidate = {
  templateId?: string;
  title?: string;
  shortTitle?: string | null;
  templateGroup?: string;
  confidence?: number;
};

type IntakeAnalysis = {
  contract?: string;
  status?: "pending" | "completed" | "failed" | string;
  activityEventId?: string;
  analyzedAt?: string;
  temporalDirection?: string;
  serverTiming?: {
    role?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
  };
  measurements?: Measurement[];
  templateCandidates?: TemplateCandidate[];
  noSuitableTypicalActivity?: boolean;
  typicalActivitiesHref?: string;
  analysisMode?: string;
  providerAvailable?: boolean | null;
  providerAttempted?: boolean;
  providerCompleted?: boolean;
  providerState?: string;
  modelUnavailable?: boolean;
  providerFailureCode?: string;
  failureStage?: string | null;
  typicalActivitySearchStatus?: string;
  fullAiAnalysisCompleted?: boolean;
  retryable?: boolean;
  factsWritten?: number;
  sourceFactMaterializationV1?: {
    contract?: string;
    status?: string;
    factsWritten?: number;
    factIds?: string[];
    measureIds?: string[];
  };
};

type IntakeAnalysisResponse = {
  ok?: boolean;
  analyses?: IntakeAnalysis[];
};

type SourceFactPreflight = {
  contract?: string;
  status?: "eligible" | "blocked" | string;
  eligible?: boolean;
  activityEventId?: string;
  factsPlanned?: number;
  reasonCode?: string;
  error?: string;
};

type SourceFactPreflightResponse = {
  ok?: boolean;
  preflight?: SourceFactPreflight;
  error?: string;
};

type SourceFactPreflightState = {
  key: string;
  preflight: SourceFactPreflight | null;
  failed: boolean;
};

const COPY: Record<Locale, {
  completed: string;
  planned: string;
  pending: string;
  failed: string;
  parameters: string;
  noParameters: string;
  candidates: string;
  noCandidate: string;
  allTemplates: string;
  start: string;
  end: string;
  duration: string;
  fallback: string;
  searchIncomplete: string;
  retry: string;
  retrying: string;
  retryFailed: string;
  foundAutomatically: string;
  rejectMatch: string;
  rejectingMatch: string;
  rejectedMatch: string;
  rejectFailed: string;
  materializeFacts: string;
  materializingFacts: string;
  factsMaterialized: string;
  materializeFactsFailed: string;
  openFacts: string;
}> = {
  ru: {
    completed: "Завершенная активность",
    planned: "Планируемая активность",
    pending: "Базовый анализ выполняется…",
    failed: "Не удалось выполнить базовый анализ. Активность уже сохранена в журнале.",
    parameters: "Выявленные параметры",
    noParameters: "Дополнительные измеримые параметры не выявлены.",
    candidates: "Активность может соответствовать следующим типовым активностям:",
    noCandidate: "Подходящая типовая активность не найдена.",
    allTemplates: "Все типовые активности",
    start: "Начало",
    end: "Завершение",
    duration: "Длительность",
    fallback: "Полный AI-анализ не завершён. Показаны только безопасно извлечённые сервером данные; результат поиска типовой активности пока не считается завершённым.",
    searchIncomplete: "Поиск типовой активности не завершён. Активность ожидает повторного AI-анализа.",
    retry: "Повторить AI-анализ",
    retrying: "Повторный AI-анализ…",
    retryFailed: "Не удалось повторить AI-анализ.",
    foundAutomatically: "Типовая активность найдена автоматически:",
    rejectMatch: "Неверное соответствие",
    rejectingMatch: "Отклоняем соответствие…",
    rejectedMatch: "Соответствие отклонено. Активность передана Куратору модели.",
    rejectFailed: "Не удалось отклонить соответствие.",
    materializeFacts: "Подтвердить и записать исходные факты",
    materializingFacts: "Записываем исходные факты…",
    factsMaterialized: "Исходные факты записаны",
    materializeFactsFailed: "Не удалось записать исходные факты.",
    openFacts: "Открыть факты",
  },
  en: {
    completed: "Completed activity",
    planned: "Planned activity",
    pending: "Basic analysis is running…",
    failed: "Basic analysis could not be completed. The activity is already saved in the journal.",
    parameters: "Detected parameters",
    noParameters: "No additional measurable parameters were detected.",
    candidates: "The activity may correspond to these typical activities:",
    noCandidate: "No suitable typical activity was found.",
    allTemplates: "All typical activities",
    start: "Start",
    end: "End",
    duration: "Duration",
    fallback: "The full AI analysis is not complete. Only server-safe data is shown; the typical-activity search is not considered complete yet.",
    searchIncomplete: "The typical-activity search is incomplete. This activity is waiting for another AI analysis.",
    retry: "Retry AI analysis",
    retrying: "Retrying AI analysis…",
    retryFailed: "Could not retry the AI analysis.",
    foundAutomatically: "Typical activity found automatically:",
    rejectMatch: "Wrong match",
    rejectingMatch: "Rejecting match…",
    rejectedMatch: "The match was rejected. The activity was sent to the Reality Curator.",
    rejectFailed: "Could not reject the match.",
    materializeFacts: "Confirm and write source facts",
    materializingFacts: "Writing source facts…",
    factsMaterialized: "Source facts were written",
    materializeFactsFailed: "Could not write source facts.",
    openFacts: "Open facts",
  },
  pl: {
    completed: "Zakończona aktywność",
    planned: "Planowana aktywność",
    pending: "Trwa podstawowa analiza…",
    failed: "Nie udało się wykonać podstawowej analizy. Aktywność jest już zapisana w dzienniku.",
    parameters: "Wykryte parametry",
    noParameters: "Nie wykryto dodatkowych mierzalnych parametrów.",
    candidates: "Aktywność może odpowiadać następującym typowym aktywnościom:",
    noCandidate: "Nie znaleziono odpowiedniej typowej aktywności.",
    allTemplates: "Wszystkie typowe aktywności",
    start: "Początek",
    end: "Koniec",
    duration: "Czas trwania",
    fallback: "Pełna analiza AI nie została ukończona. Pokazano tylko dane bezpiecznie wyodrębnione przez serwer; wyszukiwanie typowej aktywności nie jest jeszcze uznane za zakończone.",
    searchIncomplete: "Wyszukiwanie typowej aktywności nie zostało ukończone. Aktywność oczekuje na ponowną analizę AI.",
    retry: "Ponów analizę AI",
    retrying: "Ponawianie analizy AI…",
    retryFailed: "Nie udało się ponowić analizy AI.",
    foundAutomatically: "Typowa aktywność została znaleziona automatycznie:",
    rejectMatch: "Błędne dopasowanie",
    rejectingMatch: "Odrzucanie dopasowania…",
    rejectedMatch: "Dopasowanie odrzucono. Aktywność przekazano do Kuratora modelu.",
    rejectFailed: "Nie udało się odrzucić dopasowania.",
    materializeFacts: "Potwierdź i zapisz fakty źródłowe",
    materializingFacts: "Zapisywanie faktów źródłowych…",
    factsMaterialized: "Fakty źródłowe zostały zapisane",
    materializeFactsFailed: "Nie udało się zapisać faktów źródłowych.",
    openFacts: "Otwórz fakty",
  },
  uk: {
    completed: "Завершена активність",
    planned: "Запланована активність",
    pending: "Виконується базовий аналіз…",
    failed: "Не вдалося виконати базовий аналіз. Активність уже збережена в журналі.",
    parameters: "Виявлені параметри",
    noParameters: "Додаткових вимірюваних параметрів не виявлено.",
    candidates: "Активність може відповідати таким типовим активностям:",
    noCandidate: "Відповідної типової активності не знайдено.",
    allTemplates: "Усі типові активності",
    start: "Початок",
    end: "Завершення",
    duration: "Тривалість",
    fallback: "Повний AI-аналіз не завершено. Показано лише безпечно виділені сервером дані; пошук типової активності ще не вважається завершеним.",
    searchIncomplete: "Пошук типової активності не завершено. Активність очікує повторного AI-аналізу.",
    retry: "Повторити AI-аналіз",
    retrying: "Повторний AI-аналіз…",
    retryFailed: "Не вдалося повторити AI-аналіз.",
    foundAutomatically: "Типову активність знайдено автоматично:",
    rejectMatch: "Неправильна відповідність",
    rejectingMatch: "Відхиляємо відповідність…",
    rejectedMatch: "Відповідність відхилено. Активність передано Куратору моделі.",
    rejectFailed: "Не вдалося відхилити відповідність.",
    materializeFacts: "Підтвердити й записати вихідні факти",
    materializingFacts: "Записуємо вихідні факти…",
    factsMaterialized: "Вихідні факти записано",
    materializeFactsFailed: "Не вдалося записати вихідні факти.",
    openFacts: "Відкрити факти",
  },
  de: {
    completed: "Abgeschlossene Aktivität",
    planned: "Geplante Aktivität",
    pending: "Basisanalyse läuft…",
    failed: "Die Basisanalyse konnte nicht abgeschlossen werden. Die Aktivität ist bereits im Journal gespeichert.",
    parameters: "Erkannte Parameter",
    noParameters: "Keine zusätzlichen messbaren Parameter erkannt.",
    candidates: "Die Aktivität kann zu folgenden typischen Aktivitäten passen:",
    noCandidate: "Keine passende typische Aktivität gefunden.",
    allTemplates: "Alle typischen Aktivitäten",
    start: "Start",
    end: "Ende",
    duration: "Dauer",
    fallback: "Die vollständige KI-Analyse ist nicht abgeschlossen. Es werden nur serverseitig sicher erkannte Daten angezeigt; die Suche nach einer typischen Aktivität gilt noch nicht als abgeschlossen.",
    searchIncomplete: "Die Suche nach einer typischen Aktivität ist nicht abgeschlossen. Die Aktivität wartet auf eine erneute KI-Analyse.",
    retry: "KI-Analyse erneut ausführen",
    retrying: "KI-Analyse wird erneut ausgeführt…",
    retryFailed: "Die KI-Analyse konnte nicht erneut ausgeführt werden.",
    foundAutomatically: "Typische Aktivität wurde automatisch gefunden:",
    rejectMatch: "Falsche Zuordnung",
    rejectingMatch: "Zuordnung wird abgelehnt…",
    rejectedMatch: "Die Zuordnung wurde abgelehnt. Die Aktivität wurde an den Reality Curator gesendet.",
    rejectFailed: "Die Zuordnung konnte nicht abgelehnt werden.",
    materializeFacts: "Bestätigen und Quelldaten schreiben",
    materializingFacts: "Quelldaten werden geschrieben…",
    factsMaterialized: "Quelldaten wurden geschrieben",
    materializeFactsFailed: "Quelldaten konnten nicht geschrieben werden.",
    openFacts: "Fakten öffnen",
  },
  es: {
    completed: "Actividad completada",
    planned: "Actividad planificada",
    pending: "El análisis básico está en curso…",
    failed: "No se pudo completar el análisis básico. La actividad ya está guardada en el diario.",
    parameters: "Parámetros detectados",
    noParameters: "No se detectaron parámetros medibles adicionales.",
    candidates: "La actividad puede corresponder a las siguientes actividades típicas:",
    noCandidate: "No se encontró una actividad típica adecuada.",
    allTemplates: "Todas las actividades típicas",
    start: "Inicio",
    end: "Fin",
    duration: "Duración",
    fallback: "El análisis completo de IA no ha finalizado. Solo se muestran datos extraídos de forma segura por el servidor; la búsqueda de actividad típica aún no se considera terminada.",
    searchIncomplete: "La búsqueda de actividad típica no ha finalizado. La actividad espera un nuevo análisis de IA.",
    retry: "Repetir análisis de IA",
    retrying: "Repitiendo análisis de IA…",
    retryFailed: "No se pudo repetir el análisis de IA.",
    foundAutomatically: "Actividad típica encontrada automáticamente:",
    rejectMatch: "Coincidencia incorrecta",
    rejectingMatch: "Rechazando coincidencia…",
    rejectedMatch: "Se rechazó la coincidencia. La actividad se envió al Curador del modelo.",
    rejectFailed: "No se pudo rechazar la coincidencia.",
    materializeFacts: "Confirmar y guardar hechos de origen",
    materializingFacts: "Guardando hechos de origen…",
    factsMaterialized: "Los hechos de origen se guardaron",
    materializeFactsFailed: "No se pudieron guardar los hechos de origen.",
    openFacts: "Abrir hechos",
  },
  cs: {
    completed: "Dokončená aktivita",
    planned: "Plánovaná aktivita",
    pending: "Probíhá základní analýza…",
    failed: "Základní analýzu se nepodařilo dokončit. Aktivita je již uložena v deníku.",
    parameters: "Zjištěné parametry",
    noParameters: "Nebyly zjištěny žádné další měřitelné parametry.",
    candidates: "Aktivita může odpovídat následujícím typickým aktivitám:",
    noCandidate: "Nebyla nalezena vhodná typická aktivita.",
    allTemplates: "Všechny typické aktivity",
    start: "Začátek",
    end: "Konec",
    duration: "Doba trvání",
    fallback: "Úplná AI analýza není dokončena. Zobrazena jsou pouze bezpečně serverem zjištěná data; hledání typické aktivity se zatím nepovažuje za dokončené.",
    searchIncomplete: "Hledání typické aktivity není dokončeno. Aktivita čeká na opakovanou AI analýzu.",
    retry: "Opakovat AI analýzu",
    retrying: "Opakuje se AI analýza…",
    retryFailed: "AI analýzu se nepodařilo zopakovat.",
    foundAutomatically: "Typická aktivita byla nalezena automaticky:",
    rejectMatch: "Nesprávná shoda",
    rejectingMatch: "Odmítání shody…",
    rejectedMatch: "Shoda byla odmítnuta. Aktivita byla odeslána Kurátorovi modelu.",
    rejectFailed: "Shodu se nepodařilo odmítnout.",
    materializeFacts: "Potvrdit a zapsat zdrojová fakta",
    materializingFacts: "Zapisují se zdrojová fakta…",
    factsMaterialized: "Zdrojová fakta byla zapsána",
    materializeFactsFailed: "Zdrojová fakta se nepodařilo zapsat.",
    openFacts: "Otevřít fakta",
  },
};

const PREFLIGHT_COPY: Record<Locale, {
  checking: string;
  failed: string;
  defaultBlocked: string;
  byReason: Record<string, string>;
}> = {
  ru: {
    checking: "Проверяем готовность исходных фактов…",
    failed: "Не удалось проверить готовность записи исходных фактов.",
    defaultBlocked: "Запись исходных фактов сейчас недоступна.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "Базовый анализ ещё не готов к записи исходных фактов.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Соответствие типовой активности отклонено.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Не определена одна подтверждаемая типовая активность.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "У типовой активности нет активного профиля.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "Профиль типовой активности не готов к записи фактов.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "В профиле не настроены параметры и объекты наблюдения.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "Не найдено значение для записи исходного факта.",
      E03_PROFILE_ROUTE_MISSING: "Для параметра не настроен объект наблюдения.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Для параметра найдено несколько маршрутов записи.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "Параметр профиля определён неоднозначно.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Найдено несколько значений одного параметра.",
      SOURCE_SNAPSHOT_NOT_FOUND: "Не найден подходящий подтверждённый срез.",
      SOURCE_SNAPSHOT_EXPIRED: "Подходящий срез недействителен на момент активности.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "Источник среза не готов к использованию.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "Для рассчитываемого значения не выбран источник-срез.",
      SOURCE_BINDING_PROFILE_MISMATCH: "Настройка источника не соответствует профилю типовой активности.",
      SOURCE_BINDING_PROFILE_INVALID: "Настройка источников профиля некорректна.",
    },
  },
  en: {
    checking: "Checking source-fact readiness…",
    failed: "Could not check whether source facts are ready to write.",
    defaultBlocked: "Source facts cannot be written yet.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "The basic analysis is not ready for source-fact writing yet.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "The typical-activity match was rejected.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Exactly one confirmable typical activity was not determined.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "The typical activity has no active profile.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "The typical-activity profile is not ready to write facts.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "The profile has no configured parameters and observation objects.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "No value is available for a source fact.",
      E03_PROFILE_ROUTE_MISSING: "No observation object is configured for the parameter.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "The parameter has multiple write routes.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "The profile parameter is ambiguous.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Multiple values were found for the same parameter.",
      SOURCE_SNAPSHOT_NOT_FOUND: "No suitable confirmed snapshot was found.",
      SOURCE_SNAPSHOT_EXPIRED: "The snapshot is not valid at the activity time.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "The snapshot source is not ready for use.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "No snapshot source is selected for the calculated value.",
      SOURCE_BINDING_PROFILE_MISMATCH: "The source binding does not match the typical-activity profile.",
      SOURCE_BINDING_PROFILE_INVALID: "The profile source bindings are invalid.",
    },
  },
  pl: {
    checking: "Sprawdzanie gotowości faktów źródłowych…",
    failed: "Nie udało się sprawdzić gotowości zapisu faktów źródłowych.",
    defaultBlocked: "Zapisu faktów źródłowych nie można jeszcze wykonać.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "Analiza podstawowa nie jest jeszcze gotowa do zapisu faktów źródłowych.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Odrzucono dopasowanie typowej aktywności.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Nie określono jednej typowej aktywności gotowej do potwierdzenia.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "Typowa aktywność nie ma aktywnego profilu.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "Profil typowej aktywności nie jest gotowy do zapisu faktów.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "W profilu nie skonfigurowano parametrów i obiektów obserwacji.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "Brak wartości, którą można zapisać jako fakt źródłowy.",
      E03_PROFILE_ROUTE_MISSING: "Dla parametru nie skonfigurowano obiektu obserwacji.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Dla parametru znaleziono kilka tras zapisu.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "Parametr profilu jest niejednoznaczny.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Znaleziono kilka wartości tego samego parametru.",
      SOURCE_SNAPSHOT_NOT_FOUND: "Nie znaleziono odpowiedniego potwierdzonego przekroju.",
      SOURCE_SNAPSHOT_EXPIRED: "Przekrój nie jest ważny w chwili aktywności.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "Źródło przekroju nie jest gotowe do użycia.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "Nie wybrano źródła-przekroju dla wartości obliczanej.",
      SOURCE_BINDING_PROFILE_MISMATCH: "Powiązanie źródła nie pasuje do profilu typowej aktywności.",
      SOURCE_BINDING_PROFILE_INVALID: "Konfiguracja źródeł profilu jest nieprawidłowa.",
    },
  },
  uk: {
    checking: "Перевіряємо готовність вихідних фактів…",
    failed: "Не вдалося перевірити готовність запису вихідних фактів.",
    defaultBlocked: "Запис вихідних фактів зараз недоступний.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "Базовий аналіз ще не готовий до запису вихідних фактів.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Відповідність типової активності відхилено.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Не визначено одну типову активність для підтвердження.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "Типова активність не має активного профілю.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "Профіль типової активності не готовий до запису фактів.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "У профілі не налаштовано параметри та об'єкти спостереження.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "Немає значення для запису вихідного факту.",
      E03_PROFILE_ROUTE_MISSING: "Для параметра не налаштовано об'єкт спостереження.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Для параметра знайдено кілька маршрутів запису.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "Параметр профілю визначено неоднозначно.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Знайдено кілька значень одного параметра.",
      SOURCE_SNAPSHOT_NOT_FOUND: "Не знайдено відповідного підтвердженого зрізу.",
      SOURCE_SNAPSHOT_EXPIRED: "Зріз недійсний на момент активності.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "Джерело зрізу не готове до використання.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "Для розрахункового значення не вибрано джерело-зріз.",
      SOURCE_BINDING_PROFILE_MISMATCH: "Налаштування джерела не відповідає профілю типової активності.",
      SOURCE_BINDING_PROFILE_INVALID: "Налаштування джерел профілю некоректне.",
    },
  },
  de: {
    checking: "Bereitschaft der Quelldaten wird geprüft…",
    failed: "Die Bereitschaft zum Schreiben der Quelldaten konnte nicht geprüft werden.",
    defaultBlocked: "Quelldaten können derzeit nicht geschrieben werden.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "Die Basisanalyse ist noch nicht zum Schreiben der Quelldaten bereit.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Die Zuordnung zur typischen Aktivität wurde abgelehnt.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Es wurde nicht genau eine bestätigbare typische Aktivität bestimmt.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "Die typische Aktivität hat kein aktives Profil.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "Das Profil ist noch nicht zum Schreiben von Fakten bereit.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "Im Profil sind keine Parameter und Beobachtungsobjekte eingerichtet.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "Es ist kein Wert für einen Quellfakt verfügbar.",
      E03_PROFILE_ROUTE_MISSING: "Für den Parameter ist kein Beobachtungsobjekt eingerichtet.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Für den Parameter wurden mehrere Schreibwege gefunden.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "Der Profilparameter ist mehrdeutig.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Für denselben Parameter wurden mehrere Werte gefunden.",
      SOURCE_SNAPSHOT_NOT_FOUND: "Kein passender bestätigter Snapshot gefunden.",
      SOURCE_SNAPSHOT_EXPIRED: "Der Snapshot ist zum Zeitpunkt der Aktivität nicht gültig.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "Die Snapshot-Quelle ist nicht einsatzbereit.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "Für den berechneten Wert wurde keine Snapshot-Quelle ausgewählt.",
      SOURCE_BINDING_PROFILE_MISMATCH: "Die Quellenbindung passt nicht zum Profil der typischen Aktivität.",
      SOURCE_BINDING_PROFILE_INVALID: "Die Quellenbindungen des Profils sind ungültig.",
    },
  },
  es: {
    checking: "Comprobando la disponibilidad de los hechos de origen…",
    failed: "No se pudo comprobar si los hechos de origen están listos para guardarse.",
    defaultBlocked: "Los hechos de origen aún no se pueden guardar.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "El análisis básico aún no está listo para guardar hechos de origen.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Se rechazó la coincidencia con la actividad típica.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "No se determinó una única actividad típica confirmable.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "La actividad típica no tiene un perfil activo.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "El perfil de la actividad típica no está listo para guardar hechos.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "El perfil no tiene parámetros y objetos de observación configurados.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "No hay un valor disponible para el hecho de origen.",
      E03_PROFILE_ROUTE_MISSING: "No hay un objeto de observación configurado para el parámetro.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Hay varias rutas de escritura para el parámetro.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "El parámetro del perfil es ambiguo.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Se encontraron varios valores para el mismo parámetro.",
      SOURCE_SNAPSHOT_NOT_FOUND: "No se encontró un corte confirmado adecuado.",
      SOURCE_SNAPSHOT_EXPIRED: "El corte no es válido en el momento de la actividad.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "La fuente del corte no está lista para usarse.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "No se seleccionó una fuente de corte para el valor calculado.",
      SOURCE_BINDING_PROFILE_MISMATCH: "La configuración de la fuente no coincide con el perfil de la actividad típica.",
      SOURCE_BINDING_PROFILE_INVALID: "La configuración de fuentes del perfil no es válida.",
    },
  },
  cs: {
    checking: "Kontroluje se připravenost zdrojových faktů…",
    failed: "Nepodařilo se ověřit připravenost zápisu zdrojových faktů.",
    defaultBlocked: "Zdrojová fakta nyní nelze zapsat.",
    byReason: {
      E03_COMPLETED_BASIC_ANALYSIS_REQUIRED: "Základní analýza ještě není připravena k zápisu zdrojových faktů.",
      E03_REJECTED_TEMPLATE_MATCH_NOT_ELIGIBLE: "Shoda s typickou aktivitou byla odmítnuta.",
      E03_EXACTLY_ONE_HIGH_CONFIDENCE_TEMPLATE_REQUIRED: "Nebyla určena právě jedna potvrditelná typická aktivita.",
      E03_ACTIVE_PROFILE_NOT_FOUND: "Typická aktivita nemá aktivní profil.",
      E03_PROFILE_ROUTING_CONTRACT_NOT_V2: "Profil typické aktivity není připraven k zápisu faktů.",
      E03_PROFILE_MAPPING_FOUNDATION_EMPTY: "V profilu nejsou nastaveny parametry a objekty pozorování.",
      E03_NO_PROFILE_MAPPED_MEASUREMENTS: "Není k dispozici hodnota pro zdrojový fakt.",
      E03_PROFILE_ROUTE_MISSING: "Pro parametr není nastaven objekt pozorování.",
      E03_PROFILE_ROUTE_AMBIGUOUS_FOR_CURRENT_WRITER: "Pro parametr bylo nalezeno více cest zápisu.",
      E03_PROFILE_PARAMETER_CODE_AMBIGUOUS: "Parametr profilu je nejednoznačný.",
      SOURCE_EXPLICIT_VALUE_AMBIGUOUS: "Pro stejný parametr bylo nalezeno více hodnot.",
      SOURCE_SNAPSHOT_NOT_FOUND: "Nebyl nalezen vhodný potvrzený snímek.",
      SOURCE_SNAPSHOT_EXPIRED: "Snímek není platný v čase aktivity.",
      SOURCE_SNAPSHOT_ACTIVE_STATE_ASSIGNMENT_REQUIRED: "Zdroj snímku není připraven k použití.",
      SOURCE_SNAPSHOT_SELECTION_REQUIRED: "Pro vypočítanou hodnotu nebyl vybrán zdroj snímku.",
      SOURCE_BINDING_PROFILE_MISMATCH: "Nastavení zdroje neodpovídá profilu typické aktivity.",
      SOURCE_BINDING_PROFILE_INVALID: "Nastavení zdrojů profilu je neplatné.",
    },
  },
};

function preflightBlockedReason(locale: Locale, reasonCode: string | undefined) {
  if (!reasonCode) return PREFLIGHT_COPY[locale].defaultBlocked;
  return PREFLIGHT_COPY[locale].byReason[reasonCode] ?? PREFLIGHT_COPY[locale].defaultBlocked;
}

function buildLocaleHref(pathname: string, locale: Locale) {
  const separator = pathname.includes("?") ? "&" : "?";
  return locale === "en"
    ? pathname
    : `${pathname}${separator}locale=${encodeURIComponent(locale)}`;
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const PARAMETER_LABELS: Record<Locale, Record<string, string>> = {
  ru: { duration: "Длительность", count: "Количество", repetition_count: "Повторения", distance: "Расстояние", mass: "Масса" },
  en: { duration: "Duration", count: "Count", repetition_count: "Repetitions", distance: "Distance", mass: "Mass" },
  pl: { duration: "Czas trwania", count: "Liczba", repetition_count: "Powtórzenia", distance: "Dystans", mass: "Masa" },
  uk: { duration: "Тривалість", count: "Кількість", repetition_count: "Повторення", distance: "Відстань", mass: "Маса" },
  de: { duration: "Dauer", count: "Anzahl", repetition_count: "Wiederholungen", distance: "Distanz", mass: "Masse" },
  es: { duration: "Duración", count: "Cantidad", repetition_count: "Repeticiones", distance: "Distancia", mass: "Masa" },
  cs: { duration: "Doba trvání", count: "Počet", repetition_count: "Opakování", distance: "Vzdálenost", mass: "Hmotnost" },
};

function canonicalDisplayParameterCode(measurement: Measurement) {
  const code = measurement.parameterCode?.trim().toLowerCase() || "";
  const rawFragment = measurement.rawFragment?.trim() || "";
  const measureType = measurement.measureType?.trim().toLowerCase() || "";

  if (
    measureType === "duration" ||
    ["duration", "duration_minutes", "time_spent"].includes(code)
  ) {
    return "duration";
  }

  if (
    measureType === "count" ||
    ["floors", "floors_climbed", "floor_count", "storeys", "stories"].includes(code) ||
    /(?:этаж(?:а|ей)?|поверх(?:и|ів)?|floors?|storeys?|stories|piętro|piętra|pięter|stockwerke?|etagen?|pisos?|plantas?|patro|patra|pater)/iu.test(rawFragment)
  ) {
    return "count";
  }

  return code;
}

function displayMeasurementLabel(measurement: Measurement, locale: Locale) {
  const code = canonicalDisplayParameterCode(measurement);
  return (
    PARAMETER_LABELS[locale][code] ??
    measurement.label?.trim() ??
    measurement.parameterCode?.trim() ??
    "—"
  );
}

const UNIT_LABELS: Record<Locale, Record<string, string>> = {
  ru: { second: "сек", minute: "мин", hour: "ч", meter: "м", kilometer: "км", kilogram: "кг", gram: "г", repetition: "повт.", count: "шт.", set: "подх.", liter: "л", milliliter: "мл", bpm: "уд/мин", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "км/ч", meter_per_second: "м/с", date: "", time: "", text: "" },
  en: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "reps", count: "count", set: "sets", liter: "L", milliliter: "mL", bpm: "bpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  pl: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "powt.", count: "szt.", set: "serie", liter: "l", milliliter: "ml", bpm: "ud./min", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  uk: { second: "с", minute: "хв", hour: "год", meter: "м", kilometer: "км", kilogram: "кг", gram: "г", repetition: "повт.", count: "шт.", set: "підх.", liter: "л", milliliter: "мл", bpm: "уд/хв", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "км/год", meter_per_second: "м/с", date: "", time: "", text: "" },
  de: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "Wdh.", count: "Anz.", set: "Sätze", liter: "l", milliliter: "ml", bpm: "bpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  es: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "rep.", count: "ud.", set: "series", liter: "l", milliliter: "ml", bpm: "lpm", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
  cs: { second: "s", minute: "min", hour: "h", meter: "m", kilometer: "km", kilogram: "kg", gram: "g", repetition: "opak.", count: "ks", set: "série", liter: "l", milliliter: "ml", bpm: "tep/min", celsius: "°C", pln: "PLN", eur: "EUR", usd: "USD", km_per_hour: "km/h", meter_per_second: "m/s", date: "", time: "", text: "" },
};

function formatMeasurement(measurement: Measurement, locale: Locale) {
  const value =
    typeof measurement.valueNumeric === "number" &&
    Number.isFinite(measurement.valueNumeric)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
          measurement.valueNumeric,
        )
      : measurement.valueText?.trim() || "—";
  const unitCode = measurement.unit?.trim().toLowerCase() || "";
  const parameterCode = canonicalDisplayParameterCode(measurement);
  const canonicalUnitCode = ["repetition", "repetitions", "rep", "reps"].includes(unitCode)
    ? "repetition"
    : ["minute", "minutes", "min", "mins"].includes(unitCode)
      ? "minute"
      : ["hour", "hours", "hr", "hrs", "h"].includes(unitCode)
        ? "hour"
        : ["floor", "floors", "storey", "storeys", "story", "stories", "count", "counts"].includes(unitCode)
          ? "count"
          : unitCode;
  const unit = UNIT_LABELS[locale][canonicalUnitCode] ?? canonicalUnitCode;
  const approximate =
    measurement.approximate === true ||
    /(?:^|[^\p{L}\p{N}_])(?:~|≈|примерно|около|приблизительно|приблизно|близько|about|around|approximately|approx\.?|około|mniej\s+więcej|ungefähr|etwa|aproximadamente|aprox\.?|přibližně|asi)(?=$|[^\p{L}\p{N}_])/iu.test(
      measurement.rawFragment?.trim() || "",
    );
  const renderedValue = approximate ? `≈ ${value}` : value;
  if (parameterCode === "count" && canonicalUnitCode === "count") {
    return renderedValue;
  }
  return unit ? `${renderedValue} ${unit}` : renderedValue;
}

export function useActivityBasicIntakeAnalyses(
  activityEventIds: string[],
  locale: Locale = "en",
) {
  const [analyses, setAnalyses] = useState<Record<string, IntakeAnalysis>>({});

  const requestKey = useMemo(
    () =>
      Array.from(new Set(activityEventIds.filter(Boolean)))
        .slice(0, 50)
        .sort()
        .join(","),
    [activityEventIds],
  );

  useEffect(() => {
    if (!requestKey) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      activityEventIds: requestKey,
      locale,
    });

    void fetch(`/api/activity/intake-analysis?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | IntakeAnalysisResponse
          | null;
        if (!response.ok || payload?.ok !== true) return null;
        return payload;
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const next: Record<string, IntakeAnalysis> = {};
        for (const analysis of payload.analyses ?? []) {
          if (typeof analysis.activityEventId === "string") {
            next[analysis.activityEventId] = analysis;
          }
        }
        setAnalyses(next);
      })
      .catch(() => {
        if (!cancelled) setAnalyses({});
      });

    return () => {
      cancelled = true;
    };
  }, [locale, requestKey]);

  return analyses;
}

export function ActivityLifecycleBadge({
  locale,
  planned,
}: {
  readonly locale: Locale;
  readonly planned: boolean;
}) {
  const ui = COPY[locale];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
        planned
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {planned ? ui.planned : ui.completed}
    </span>
  );
}

export function ActivityBasicIntakeAnalysisCard({
  analysis,
  locale,
}: {
  readonly analysis: IntakeAnalysis | null | undefined;
  readonly locale: Locale;
}) {
  const [retryResult, setRetryResult] = useState<IntakeAnalysis | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [rejectingTemplateId, setRejectingTemplateId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState(false);
  const [rejectedMatch, setRejectedMatch] = useState(false);
  const [materializingFacts, setMaterializingFacts] = useState(false);
  const [materializeFactsError, setMaterializeFactsError] = useState<string | null>(null);
  const [materializedFactsCount, setMaterializedFactsCount] = useState<number | null>(null);
  const [sourceFactPreflightState, setSourceFactPreflightState] =
    useState<SourceFactPreflightState | null>(null);
  const displayedAnalysis =
    analysis &&
    retryResult?.activityEventId === analysis?.activityEventId
      ? retryResult
      : analysis;
  const preflightActivityEventId = displayedAnalysis?.activityEventId?.trim() ?? "";
  const preflightStatus = displayedAnalysis?.status ?? "";
  const preflightAnalyzedAt = displayedAnalysis?.analyzedAt ?? "";
  const preflightPersistedMaterialization = displayedAnalysis?.sourceFactMaterializationV1;
  const preflightPersistedFactsCount =
    typeof preflightPersistedMaterialization?.factsWritten === "number"
      ? preflightPersistedMaterialization.factsWritten
      : typeof displayedAnalysis?.factsWritten === "number"
        ? displayedAnalysis.factsWritten
        : 0;
  const preflightFactsCount = materializedFactsCount ?? preflightPersistedFactsCount;
  const preflightFactsCommitted =
    preflightFactsCount > 0 &&
    (materializedFactsCount !== null ||
      preflightPersistedMaterialization?.status === "materialized" ||
      preflightPersistedMaterialization?.status === "idempotent_replay");
  const preflightKey = `${preflightActivityEventId}|${preflightAnalyzedAt}`;

  useEffect(() => {
    if (
      preflightStatus !== "completed" ||
      !preflightActivityEventId ||
      preflightFactsCommitted
    ) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      activityEventId: preflightActivityEventId,
    });

    void fetch(
      `/api/activity/intake-analysis/materialize-source-facts?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | SourceFactPreflightResponse
          | null;
        if (!response.ok || payload?.ok !== true || !payload.preflight) {
          throw new Error(payload?.error || `Preflight failed: ${response.status}`);
        }
        return payload.preflight;
      })
      .then((preflight) => {
        if (cancelled) return;
        setSourceFactPreflightState({
          key: preflightKey,
          preflight,
          failed: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSourceFactPreflightState({
          key: preflightKey,
          preflight: null,
          failed: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    preflightActivityEventId,
    preflightFactsCommitted,
    preflightKey,
    preflightStatus,
  ]);

  if (!displayedAnalysis) return null;

  const ui = COPY[locale];
  const status = displayedAnalysis.status;

  if (status === "pending") {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-[#cfd8f3] bg-[#f8faff] px-3 py-2.5 text-xs font-semibold text-[#667091]">
        {ui.pending}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
        {ui.failed}
      </div>
    );
  }

  if (status !== "completed") return null;

  const measurements = Array.isArray(displayedAnalysis.measurements)
    ? displayedAnalysis.measurements
    : [];
  const hasDurationMeasurement = measurements.some(
    (measurement) => canonicalDisplayParameterCode(measurement) === "duration",
  );
  const candidates = Array.isArray(displayedAnalysis.templateCandidates)
    ? displayedAnalysis.templateCandidates.filter(
        (candidate) => typeof candidate.title === "string" && candidate.title.trim(),
      )
    : [];
  const timing = displayedAnalysis.serverTiming ?? {};
  const startLabel = formatDateTime(timing.startedAt, locale);
  const endLabel = formatDateTime(timing.endedAt, locale);
  const duration =
    typeof timing.durationMinutes === "number" &&
    Number.isFinite(timing.durationMinutes)
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
          timing.durationMinutes,
        )} min`
      : null;
  const typicalHref = buildLocaleHref(
    displayedAnalysis.typicalActivitiesHref || "/activity-templates",
    locale,
  );
  const searchCompleted =
    displayedAnalysis.analysisMode === "nano_model" &&
    displayedAnalysis.providerAvailable === true &&
    displayedAnalysis.fullAiAnalysisCompleted === true &&
    displayedAnalysis.typicalActivitySearchStatus === "completed";
  const canRetry =
    displayedAnalysis.retryable === true &&
    typeof displayedAnalysis.activityEventId === "string" &&
    Boolean(displayedAnalysis.activityEventId.trim());
  const factsCount = preflightFactsCount;
  const factsCommitted = preflightFactsCommitted;
  const effectivePreflightState =
    sourceFactPreflightState?.key === preflightKey
      ? sourceFactPreflightState
      : null;
  const canMaterializeFacts =
    !factsCommitted &&
    effectivePreflightState?.failed === false &&
    effectivePreflightState.preflight?.eligible === true;
  const preflightInactiveReason = factsCommitted
    ? null
    : !preflightActivityEventId
      ? PREFLIGHT_COPY[locale].defaultBlocked
      : !effectivePreflightState
        ? PREFLIGHT_COPY[locale].checking
        : effectivePreflightState.failed
          ? PREFLIGHT_COPY[locale].failed
          : effectivePreflightState.preflight?.eligible === true
            ? null
            : preflightBlockedReason(
                locale,
                effectivePreflightState.preflight?.reasonCode,
              );

  const handleRetry = async () => {
    const activityEventId = displayedAnalysis.activityEventId?.trim();
    if (!activityEventId || retrying) return;

    setRetrying(true);
    setRetryError(false);
    try {
      const response = await fetch("/api/activity/intake-analysis", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activityEventId, locale }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            analysis?: IntakeAnalysis;
            error?: string;
          }
        | null;

      if (!response.ok || payload?.ok !== true || !payload.analysis) {
        throw new Error(payload?.error || `Retry failed: ${response.status}`);
      }

      setRetryResult(payload.analysis);
    } catch {
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  };


  const handleMaterializeFacts = async () => {
    const activityEventId = displayedAnalysis.activityEventId?.trim();
    if (!activityEventId || materializingFacts || !canMaterializeFacts) return;

    setMaterializingFacts(true);
    setMaterializeFactsError(null);

    try {
      const response = await fetch(
        "/api/activity/intake-analysis/materialize-source-facts",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ activityEventId }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            result?: {
              factsWritten?: number;
            };
            error?: string;
          }
        | null;

      const written = payload?.result?.factsWritten;
      if (
        !response.ok ||
        payload?.ok !== true ||
        typeof written !== "number" ||
        written < 1
      ) {
        throw new Error(
          payload?.error || `Source fact materialization failed: ${response.status}`,
        );
      }

      setMaterializedFactsCount(written);
    } catch (error) {
      setMaterializeFactsError(
        error instanceof Error ? error.message : "E03_MATERIALIZATION_FAILED",
      );
    } finally {
      setMaterializingFacts(false);
    }
  };

  const handleRejectMatch = async (candidate: TemplateCandidate) => {
    const activityEventId = displayedAnalysis.activityEventId?.trim();
    const templateId = candidate.templateId?.trim();
    if (!activityEventId || !templateId || rejectingTemplateId) return;

    setRejectingTemplateId(templateId);
    setRejectError(false);
    setRejectedMatch(false);

    try {
      const response = await fetch("/api/activity/intake-analysis/reject-template-match", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activityEventId, templateId, locale }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            analysis?: IntakeAnalysis;
            error?: string;
          }
        | null;

      if (!response.ok || payload?.ok !== true || !payload.analysis) {
        throw new Error(payload?.error || `Reject failed: ${response.status}`);
      }

      setRetryResult(payload.analysis);
      setRejectedMatch(true);
    } catch {
      setRejectError(true);
    } finally {
      setRejectingTemplateId(null);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-[#dbe3f6] bg-white p-3 shadow-[0_1px_2px_rgba(32,45,80,0.04)]">
      {displayedAnalysis.analysisMode === "safe_server_fallback" ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800">
          {ui.fallback}
        </div>
      ) : null}
      {canRetry ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={retrying}
            onClick={() => void handleRetry()}
            className="rounded-lg border border-[#b9c9ff] bg-[#f5f8ff] px-3 py-2 text-xs font-black text-[#3158c8] disabled:cursor-wait disabled:opacity-60"
          >
            {retrying ? ui.retrying : ui.retry}
          </button>
          {retryError ? (
            <span className="text-xs font-semibold text-rose-700">
              {ui.retryFailed}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#3b6ef8]">
        {ui.parameters}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {startLabel ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.start}: {startLabel}
          </span>
        ) : null}
        {endLabel ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.end}: {endLabel}
          </span>
        ) : null}
        {duration && !hasDurationMeasurement ? (
          <span className="rounded-lg border border-[#e1e6f2] bg-[#f8faff] px-2.5 py-1.5 text-xs font-semibold text-[#4a5270]">
            {ui.duration}: {duration}
          </span>
        ) : null}
        {measurements.map((measurement, index) => (
          <span
            key={`${measurement.parameterCode ?? "measure"}:${index}`}
            className="rounded-lg border border-[#dce5ff] bg-[#f5f8ff] px-2.5 py-1.5 text-xs font-semibold text-[#3658a8]"
          >
            {displayMeasurementLabel(measurement, locale)}: {formatMeasurement(measurement, locale)}
          </span>
        ))}
      </div>

      {!startLabel && !endLabel && !duration && measurements.length === 0 ? (
        <div className="mt-2 text-xs font-medium text-[#7c8099]">
          {ui.noParameters}
        </div>
      ) : null}

      <div className="mt-3 border-t border-[#edf0f7] pt-3">
        <div className="text-xs font-bold leading-relaxed text-[#31384f]">
          {candidates.length > 0 && searchCompleted
            ? ui.foundAutomatically
            : ui.candidates}
        </div>

        {rejectedMatch ? (
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            {ui.rejectedMatch}
          </div>
        ) : null}

        {rejectError ? (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {ui.rejectFailed}
          </div>
        ) : null}

        {candidates.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.templateId || candidate.title}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[#dbe3f6] bg-[#fbfcff] px-3 py-2 text-xs font-bold text-[#2f477f]"
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#3b6ef8]" />
                <span className="min-w-0 flex-1 truncate">{candidate.title}</span>
                {searchCompleted && candidate.templateId && !factsCommitted ? (
                  <button
                    type="button"
                    disabled={Boolean(rejectingTemplateId)}
                    onClick={() => void handleRejectMatch(candidate)}
                    className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {rejectingTemplateId === candidate.templateId
                      ? ui.rejectingMatch
                      : ui.rejectMatch}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#667091]">
              {searchCompleted ? ui.noCandidate : ui.searchIncomplete}
            </span>
            <Link
              href={typicalHref}
              className="font-black text-[#3b6ef8] underline-offset-4 hover:underline"
            >
              {ui.allTemplates}
            </Link>
          </div>
        )}

        <div className="mt-3 border-t border-[#edf0f7] pt-3">
          {factsCommitted ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              <span>
                {ui.factsMaterialized}: {factsCount}
              </span>
              <Link
                href={buildLocaleHref(
                  `/activity-facts?activityEventId=${encodeURIComponent(
                    displayedAnalysis.activityEventId ?? "",
                  )}`,
                  locale,
                )}
                className="font-black underline-offset-4 hover:underline"
              >
                {ui.openFacts}
              </Link>
            </div>
          ) : (
            <div>
              <button
                type="button"
                disabled={materializingFacts || !canMaterializeFacts}
                onClick={() => void handleMaterializeFacts()}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100"
              >
                {materializingFacts
                  ? ui.materializingFacts
                  : ui.materializeFacts}
              </button>
              {!materializingFacts && preflightInactiveReason ? (
                <div className="mt-1.5 text-[11px] font-semibold leading-relaxed text-[#7c8099]">
                  {preflightInactiveReason}
                </div>
              ) : null}
              {materializeFactsError ? (
                <div className="mt-1.5 text-xs font-semibold text-rose-700">
                  {ui.materializeFactsFailed} {materializeFactsError}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
