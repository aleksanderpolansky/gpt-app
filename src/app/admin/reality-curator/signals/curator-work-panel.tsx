"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  decisionHint: string;
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
    takeHint: "Возьмите сигнал в работу, если готовы начать разбор. Система зафиксирует куратора и время, после чего покажет только следующий обязательный шаг.",
    checkTitle: "Определение типовой активности",
    checkHint: "На этом шаге нужно выяснить, существует ли уже подходящий шаблон. Сначала покажите активности профиля; при необходимости откройте полный каталог в отдельной вкладке. Это отделяет реальный пробел модели от ошибки распознавания.",
    decisionHint: "Завершите шаг одним из двух решений: выберите найденную активность и подтвердите её либо зафиксируйте, что подходящего шаблона нет. В комментарии кратко укажите основание решения.",
    loadActivities: "Показать существующие активности",
    loadingActivities: "Загружаем…",
    filterPlaceholder: "Фильтр по названию…",
    noActivities: "Активных типовых активностей в текущем профиле не найдено.",
    selectHint: "Если подходящая активность есть, выберите её. Если нет — зафиксируйте отсутствие.",
    selected: "Выбрано",
    saveFound: "Определить выбранную активность",
    saveNotFound: "Зафиксировать отсутствие активности",
    saving: "Сохраняем результат…",
    completed: "Определение типовой активности завершено",
    openActivities: "Открыть раздел типовых активностей",
    error: "Не удалось сохранить действие куратора.",
    limited: "Показаны последние 500 активных типовых активностей профиля.",
  },
  en: {
    nextStep: "Next curator step",
    takeIntoWork: "Take into work",
    takingIntoWork: "Saving…",
    takeHint: "Take the signal into work when you are ready to review it. The system records the curator and time, then shows only the next required step.",
    checkTitle: "Check existing typical activities",
    checkHint: "Determine whether a suitable template already exists. First load the profile activities; if needed, open the full catalog in a new tab. This separates a real model gap from a recognition error.",
    decisionHint: "Finish this step with one decision: confirm the selected matching activity or record that no suitable template exists. Briefly explain the basis in the comment.",
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
    takeHint: "Podejmij sygnał, gdy jesteś gotowy rozpocząć analizę. System zapisze kuratora i czas, a następnie pokaże tylko kolejny wymagany krok.",
    checkTitle: "Sprawdzenie istniejących aktywności typowych",
    checkHint: "Ustal, czy odpowiedni szablon już istnieje. Najpierw wczytaj aktywności profilu; w razie potrzeby otwórz pełny katalog w nowej karcie. To oddziela rzeczywistą lukę modelu od błędu rozpoznania.",
    decisionHint: "Zakończ krok jedną decyzją: potwierdź wybraną pasującą aktywność albo zapisz, że odpowiedniego szablonu nie ma. Krótko uzasadnij decyzję w komentarzu.",
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
    takeHint: "Візьміть сигнал у роботу, коли готові почати розбір. Система зафіксує куратора й час, а потім покаже лише наступний обов’язковий крок.",
    checkTitle: "Перевірка наявних типових активностей",
    checkHint: "З’ясуйте, чи вже існує відповідний шаблон. Спочатку завантажте активності профілю; за потреби відкрийте повний каталог у новій вкладці. Це відокремлює реальний пробіл моделі від помилки розпізнавання.",
    decisionHint: "Завершіть крок одним рішенням: підтвердьте вибрану відповідну активність або зафіксуйте, що відповідного шаблону немає. Коротко поясніть підставу в коментарі.",
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
    takeHint: "Nehmen Sie das Signal in Bearbeitung, wenn Sie mit der Prüfung beginnen können. Das System speichert Kurator und Zeitpunkt und zeigt danach nur den nächsten Pflichtschritt.",
    checkTitle: "Vorhandene typische Aktivitäten prüfen",
    checkHint: "Klären Sie, ob bereits eine passende Vorlage existiert. Laden Sie zuerst die Aktivitäten des Profils; öffnen Sie bei Bedarf den vollständigen Katalog in einem neuen Tab. So wird eine echte Modelllücke von einem Erkennungsfehler getrennt.",
    decisionHint: "Beenden Sie den Schritt mit genau einer Entscheidung: die ausgewählte passende Aktivität bestätigen oder festhalten, dass keine passende Vorlage existiert. Begründen Sie dies kurz im Kommentar.",
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
    takeHint: "Tome la señal en trabajo cuando esté listo para revisarla. El sistema registrará al curador y la hora y después mostrará solo el siguiente paso obligatorio.",
    checkTitle: "Comprobar actividades típicas existentes",
    checkHint: "Determine si ya existe una plantilla adecuada. Primero cargue las actividades del perfil; si hace falta, abra el catálogo completo en una pestaña nueva. Esto separa una laguna real del modelo de un error de reconocimiento.",
    decisionHint: "Finalice el paso con una sola decisión: confirme la actividad seleccionada o registre que no existe una plantilla adecuada. Explique brevemente el motivo en el comentario.",
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
    takeHint: "Převezměte signál do práce, až budete připraveni zahájit kontrolu. Systém zaznamená kurátora a čas a potom zobrazí pouze další povinný krok.",
    checkTitle: "Kontrola existujících typických aktivit",
    checkHint: "Zjistěte, zda již existuje vhodná šablona. Nejprve načtěte aktivity profilu; podle potřeby otevřete celý katalog v nové kartě. Tím oddělíte skutečnou mezeru modelu od chyby rozpoznání.",
    decisionHint: "Dokončete krok jediným rozhodnutím: potvrďte vybranou odpovídající aktivitu, nebo zaznamenejte, že vhodná šablona neexistuje. Stručně uveďte důvod v komentáři.",
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

const COMMENT_LABEL: Record<LocaleCode, string> = {
  ru: "Комментарий к решению",
  en: "Decision comment",
  pl: "Komentarz do decyzji",
  uk: "Коментар до рішення",
  de: "Kommentar zur Entscheidung",
  es: "Comentario de la decisión",
  cs: "Komentář k rozhodnutí",
};

const COMMENT_PLACEHOLDER: Record<LocaleCode, string> = {
  ru: "Например: активность определена как тестовая и дальнейшая обработка не требуется…",
  en: "For example: this is a test activity and no further processing is required…",
  pl: "Np.: aktywność jest testowa i nie wymaga dalszego przetwarzania…",
  uk: "Наприклад: активність тестова й не потребує подальшої обробки…",
  de: "Zum Beispiel: Testaktivität, keine weitere Bearbeitung erforderlich…",
  es: "Por ejemplo: actividad de prueba; no requiere más tratamiento…",
  cs: "Například: testovací aktivita; další zpracování není potřeba…",
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
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reality-curator-next-step-anchor]"),
    );
    const preceding = anchors.filter((anchor) =>
      Boolean(anchor.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    setPortalTarget(preceding.at(-1) ?? null);
  }, [signalId, journey]);

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

  let content: ReactNode;

  if (checkCompleted) {
    content = (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.completed}</div>
        {resultSummary(checkEvent, locale) ? (
          <div className="mt-1 text-sm leading-5 text-emerald-800">{resultSummary(checkEvent, locale)}</div>
        ) : null}
      </div>
    );
  } else if (!workStarted) {
    content = (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
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
  } else {
    const selected = templates?.find((item) => item.id === selectedTemplateId) ?? null;

    content = (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
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
            target="_blank"
            rel="noopener noreferrer"
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
            {selected ? (
              <div className="rounded-xl bg-white px-3 py-2 text-xs text-[#4b5563]">
                <span className="font-bold">{copy.selected}: </span>{selected.title}
              </div>
            ) : null}
            <label className="block">
              <div className="mb-1 text-xs font-bold text-[#4b5563]">{COMMENT_LABEL[locale]}</div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 1500))}
                placeholder={COMMENT_PLACEHOLDER[locale]}
                rows={3}
                className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
              />
              <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{comment.length}/1500</div>
            </label>
            <div className="rounded-xl border border-[#e1e6f3] bg-white px-3 py-2.5 text-xs leading-5 text-[#5f6679]">
              {copy.decisionHint}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !selectedTemplateId}
                onClick={() => void postAction({
                  action: "complete_activity_check",
                  result: "found",
                  templateId: selectedTemplateId,
                  comment,
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
                  comment,
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

  return (
    <>
      <div ref={placeholderRef} className="hidden" aria-hidden="true" />
      {portalTarget ? createPortal(content, portalTarget) : null}
    </>
  );

}
