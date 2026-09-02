"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { LocaleCode } from "@/i18n";

type JourneyItem = {
  eventCode: string;
  resultSummaryRu?: string | null;
  resultSummaryEn?: string | null;
};

type TemplateItem = {
  id: string;
  title: string;
  shortTitle: string | null;
  templateGroup: string | null;
  updatedAt: string | null;
};

type TemplateResponse = {
  ok?: boolean;
  error?: string;
  templates?: TemplateItem[];
  count?: number;
  truncated?: boolean;
};

type WorkResponse = {
  ok?: boolean;
  error?: string;
};

type Props = {
  signalId: string;
  journey: JourneyItem[];
  locale: LocaleCode;
  onChanged: () => void;
};

type WorkCopy = {
  nextStep: string;
  takeIntoWork: string;
  takingIntoWork: string;
  takeHint: string;
  checkTitle: string;
  checkHint: string;
  loadActivities: string;
  loadingActivities: string;
  filterPlaceholder: string;
  noActivities: string;
  selectHint: string;
  selected: string;
  saveFound: string;
  saveNotFound: string;
  saving: string;
  completed: string;
  openActivities: string;
  error: string;
  limited: string;
};

const COPY: Record<LocaleCode, WorkCopy> = {
  ru: {
    nextStep: "Следующий шаг куратора",
    takeIntoWork: "Взять в работу",
    takingIntoWork: "Сохраняем…",
    takeHint: "После нажатия система запишет в историю, кто и когда начал работу с этим сигналом.",
    checkTitle: "Проверка существующих типовых активностей",
    checkHint: "Сначала проверьте, не существует ли уже подходящая типовая активность в текущем профиле. Это отделяет пробел модели от ошибки распознавания.",
    loadActivities: "Показать существующие активности",
    loadingActivities: "Загружаем…",
    filterPlaceholder: "Фильтр по названию…",
    noActivities: "Активных типовых активностей в текущем профиле не найдено.",
    selectHint: "Если подходящая активность есть, выберите её. Если нет — зафиксируйте отсутствие.",
    selected: "Выбрано",
    saveFound: "Подходящая активность найдена",
    saveNotFound: "Подходящей активности нет",
    saving: "Сохраняем результат…",
    completed: "Проверка существующих типовых активностей завершена",
    openActivities: "Открыть раздел типовых активностей",
    error: "Не удалось сохранить действие куратора.",
    limited: "Показаны последние 500 активных типовых активностей профиля.",
  },
  en: {
    nextStep: "Next curator step",
    takeIntoWork: "Take into work",
    takingIntoWork: "Saving…",
    takeHint: "The history will record who started work with this signal and when.",
    checkTitle: "Check existing typical activities",
    checkHint: "First verify whether a suitable typical activity already exists in the current profile.",
    loadActivities: "Show existing activities",
    loadingActivities: "Loading…",
    filterPlaceholder: "Filter by title…",
    noActivities: "No active typical activities were found in the current profile.",
    selectHint: "Select a suitable activity if it exists, otherwise record that none was found.",
    selected: "Selected",
    saveFound: "Suitable activity found",
    saveNotFound: "No suitable activity",
    saving: "Saving result…",
    completed: "Existing typical activities check completed",
    openActivities: "Open typical activities",
    error: "Could not save the curator action.",
    limited: "Showing the latest 500 active typical activities in the profile.",
  },
  pl: {
    nextStep: "Następny krok kuratora",
    takeIntoWork: "Podejmij sprawę",
    takingIntoWork: "Zapisywanie…",
    takeHint: "Historia zapisze, kto i kiedy rozpoczął pracę nad tym sygnałem.",
    checkTitle: "Sprawdzenie istniejących aktywności typowych",
    checkHint: "Najpierw sprawdź, czy odpowiednia aktywność typowa już istnieje w bieżącym profilu.",
    loadActivities: "Pokaż istniejące aktywności",
    loadingActivities: "Ładowanie…",
    filterPlaceholder: "Filtruj po nazwie…",
    noActivities: "W bieżącym profilu nie znaleziono aktywnych aktywności typowych.",
    selectHint: "Wybierz pasującą aktywność albo zapisz, że jej nie ma.",
    selected: "Wybrano",
    saveFound: "Znaleziono pasującą aktywność",
    saveNotFound: "Brak pasującej aktywności",
    saving: "Zapisywanie wyniku…",
    completed: "Sprawdzanie aktywności typowych zakończone",
    openActivities: "Otwórz aktywności typowe",
    error: "Nie udało się zapisać działania kuratora.",
    limited: "Pokazano ostatnie 500 aktywnych aktywności typowych profilu.",
  },
  uk: {
    nextStep: "Наступний крок куратора",
    takeIntoWork: "Взяти в роботу",
    takingIntoWork: "Зберігаємо…",
    takeHint: "Історія зафіксує, хто і коли почав роботу з цим сигналом.",
    checkTitle: "Перевірка наявних типових активностей",
    checkHint: "Спочатку перевірте, чи вже існує відповідна типова активність у поточному профілі.",
    loadActivities: "Показати наявні активності",
    loadingActivities: "Завантажуємо…",
    filterPlaceholder: "Фільтр за назвою…",
    noActivities: "У поточному профілі активних типових активностей не знайдено.",
    selectHint: "Оберіть відповідну активність або зафіксуйте її відсутність.",
    selected: "Обрано",
    saveFound: "Відповідну активність знайдено",
    saveNotFound: "Відповідної активності немає",
    saving: "Зберігаємо результат…",
    completed: "Перевірку наявних типових активностей завершено",
    openActivities: "Відкрити типові активності",
    error: "Не вдалося зберегти дію куратора.",
    limited: "Показано останні 500 активних типових активностей профілю.",
  },
  de: {
    nextStep: "Nächster Kuratorenschritt",
    takeIntoWork: "In Bearbeitung nehmen",
    takingIntoWork: "Speichern…",
    takeHint: "Der Verlauf speichert, wer die Bearbeitung begonnen hat und wann.",
    checkTitle: "Vorhandene typische Aktivitäten prüfen",
    checkHint: "Prüfen Sie zuerst, ob im aktuellen Profil bereits eine passende typische Aktivität existiert.",
    loadActivities: "Vorhandene Aktivitäten anzeigen",
    loadingActivities: "Laden…",
    filterPlaceholder: "Nach Titel filtern…",
    noActivities: "Im aktuellen Profil wurden keine aktiven typischen Aktivitäten gefunden.",
    selectHint: "Wählen Sie eine passende Aktivität oder halten Sie fest, dass keine vorhanden ist.",
    selected: "Ausgewählt",
    saveFound: "Passende Aktivität gefunden",
    saveNotFound: "Keine passende Aktivität",
    saving: "Ergebnis wird gespeichert…",
    completed: "Prüfung vorhandener typischer Aktivitäten abgeschlossen",
    openActivities: "Typische Aktivitäten öffnen",
    error: "Die Kuratorenaktion konnte nicht gespeichert werden.",
    limited: "Die letzten 500 aktiven typischen Aktivitäten des Profils werden angezeigt.",
  },
  es: {
    nextStep: "Siguiente paso del curador",
    takeIntoWork: "Tomar en trabajo",
    takingIntoWork: "Guardando…",
    takeHint: "El historial registrará quién inició el trabajo con esta señal y cuándo.",
    checkTitle: "Comprobar actividades típicas existentes",
    checkHint: "Primero compruebe si ya existe una actividad típica adecuada en el perfil actual.",
    loadActivities: "Mostrar actividades existentes",
    loadingActivities: "Cargando…",
    filterPlaceholder: "Filtrar por título…",
    noActivities: "No se encontraron actividades típicas activas en el perfil actual.",
    selectHint: "Seleccione una actividad adecuada o registre que no existe.",
    selected: "Seleccionada",
    saveFound: "Actividad adecuada encontrada",
    saveNotFound: "No hay actividad adecuada",
    saving: "Guardando resultado…",
    completed: "Comprobación de actividades típicas completada",
    openActivities: "Abrir actividades típicas",
    error: "No se pudo guardar la acción del curador.",
    limited: "Se muestran las últimas 500 actividades típicas activas del perfil.",
  },
  cs: {
    nextStep: "Další krok kurátora",
    takeIntoWork: "Převzít do práce",
    takingIntoWork: "Ukládání…",
    takeHint: "Historie zaznamená, kdo a kdy začal se signálem pracovat.",
    checkTitle: "Kontrola existujících typických aktivit",
    checkHint: "Nejprve ověřte, zda v aktuálním profilu již existuje vhodná typická aktivita.",
    loadActivities: "Zobrazit existující aktivity",
    loadingActivities: "Načítání…",
    filterPlaceholder: "Filtrovat podle názvu…",
    noActivities: "V aktuálním profilu nebyly nalezeny aktivní typické aktivity.",
    selectHint: "Vyberte vhodnou aktivitu nebo zaznamenejte, že žádná není.",
    selected: "Vybráno",
    saveFound: "Vhodná aktivita nalezena",
    saveNotFound: "Vhodná aktivita není",
    saving: "Ukládání výsledku…",
    completed: "Kontrola existujících typických aktivit dokončena",
    openActivities: "Otevřít typické aktivity",
    error: "Akci kurátora se nepodařilo uložit.",
    limited: "Zobrazuje se posledních 500 aktivních typických aktivit profilu.",
  },
};

function resultSummary(item: JourneyItem | undefined, locale: LocaleCode) {
  if (!item) return null;
  if (locale === "ru") return item.resultSummaryRu || item.resultSummaryEn || null;
  return item.resultSummaryEn || item.resultSummaryRu || null;
}

export function CuratorWorkPanel({ signalId, journey, locale, onChanged }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [busy, setBusy] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[] | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const workStarted = journey.some((item) => item.eventCode === "curator_work_started");
  const checkEvent = journey.find((item) => item.eventCode === "existing_typical_activity_checked");
  const checkCompleted = Boolean(checkEvent);

  const filtered = useMemo(() => {
    const items = templates ?? [];
    const query = filter.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.shortTitle ?? "", item.templateGroup ?? ""]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [filter, templates]);

  const postAction = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reality-curator/signals/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, ...body }),
      });
      const data = (await response.json().catch(() => null)) as WorkResponse | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP_${response.status}`);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/reality-curator/signals/templates?signalId=${encodeURIComponent(signalId)}`,
        { method: "GET", cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as TemplateResponse | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP_${response.status}`);
      setTemplates(data.templates ?? []);
      setTruncated(data.truncated === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setLoadingTemplates(false);
    }
  };

  if (checkCompleted) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.completed}</div>
        {resultSummary(checkEvent, locale) ? (
          <div className="mt-1 text-sm leading-5 text-emerald-800">{resultSummary(checkEvent, locale)}</div>
        ) : null}
      </div>
    );
  }

  if (!workStarted) {
    return (
      <div className="mt-4 rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
        <div className="text-sm font-extrabold text-[#263044]">{copy.nextStep}</div>
        <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.takeHint}</div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void postAction({ action: "start_work" })}
          className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#3b6ef8] px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? copy.takingIntoWork : copy.takeIntoWork}
        </button>
        {error ? <div className="mt-2 text-xs text-red-700">{copy.error} {error}</div> : null}
      </div>
    );
  }

  const selected = templates?.find((item) => item.id === selectedTemplateId) ?? null;

  return (
    <div className="mt-4 rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      <div className="text-sm font-extrabold text-[#263044]">{copy.checkTitle}</div>
      <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.checkHint}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loadingTemplates || busy}
          onClick={() => void loadTemplates()}
          className="inline-flex h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-sm font-bold text-[#34405a] disabled:opacity-50"
        >
          {loadingTemplates ? copy.loadingActivities : copy.loadActivities}
        </button>
        <Link
          href={`/activity-templates?locale=${locale}`}
          className="inline-flex h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-sm font-bold text-[#34405a]"
        >
          {copy.openActivities}
        </Link>
      </div>

      {templates ? (
        <div className="mt-3 space-y-3">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={copy.filterPlaceholder}
            className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
          />
          {truncated ? <div className="text-xs text-amber-700">{copy.limited}</div> : null}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8def0] bg-white px-3 py-4 text-xs text-[#7c8099]">
              {copy.noActivities}
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filtered.map((item) => {
                const selectedRow = selectedTemplateId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(item.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedRow ? "border-[#3b6ef8] bg-[#eef3ff]" : "border-[#e3e8f3] bg-white"}`}
                  >
                    <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                    <div className="mt-1 text-[11px] text-[#7c8099]">
                      {[item.shortTitle, item.templateGroup].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="text-xs leading-5 text-[#727991]">{copy.selectHint}</div>
          {selected ? (
            <div className="rounded-xl bg-white px-3 py-2 text-xs text-[#4b5563]">
              <span className="font-bold">{copy.selected}: </span>{selected.title}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !selectedTemplateId}
              onClick={() => void postAction({
                action: "complete_activity_check",
                result: "found",
                templateId: selectedTemplateId,
              })}
              className="inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? copy.saving : copy.saveFound}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void postAction({
                action: "complete_activity_check",
                result: "not_found",
              })}
              className="inline-flex min-h-10 items-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 disabled:opacity-40"
            >
              {busy ? copy.saving : copy.saveNotFound}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-xs text-red-700">{copy.error} {error}</div> : null}
    </div>
  );
}
