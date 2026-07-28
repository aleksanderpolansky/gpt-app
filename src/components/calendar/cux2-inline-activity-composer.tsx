"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActivityTimingEditorPp1 } from "@/components/activity/pp1/activity-timing-editor";
import { PlannedTargetSelectorPp1 } from "@/components/activity/pp1/planned-target-selector";
import { Cux3AiRulesEditor } from "@/components/calendar/cux3-ai-rules-editor";
import {
  datetimeLocalToIsoPp1,
  formatActivityTimingDraftPp1,
  getTimingFocusDatePp1,
  inferActivityTimingDraftPp1,
  mergeActivityTimingDraftPp1,
  parsePositiveDurationMinutesPp1,
  validateActivityTimingDraftPp1,
  type ActivityTimingDraftPp1,
  type ActivityTimingLocalePp1,
} from "@/lib/activity/pp1/activityTiming";

type AnalysisStatus = "idle" | "analyzing" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type SemanticPreviewPayload = {
  activityTitle?: string | null;
  summary?: string | null;
  timingDraft?: Partial<ActivityTimingDraftPp1> | null;
  error?: string | null;
};

type ActivityCreateResponse = {
  ok?: boolean;
  error?: string;
  activityEvent?: { id?: string | null };
  semanticEnrichment?: {
    runId?: string | null;
    status?: string | null;
    disposition?: string | null;
    error?: string | null;
  } | null;
};

export type Cux4QuickCaptureResult = {
  activityEventId: string;
  enrichmentRunId: string | null;
  analysisStatus: string;
  focusDateKey: string | null;
};

type Copy = {
  eyebrow: string;
  title: string;
  helper: string;
  placeholder: string;
  voice: string;
  voiceSoon: string;
  analyze: string;
  analyzing: string;
  activityTitle: string;
  titlePlaceholder: string;
  rules: string;
  details: string;
  close: string;
  clear: string;
  add: string;
  saving: string;
  success: string;
  analysisReady: string;
  analysisError: string;
  needsClarification: string;
  timingPreview: string;
  rulesTitle: string;
  rulesBody: string;
  rulesPriority: string[];
  rulesNext: string;
  validation: string;
  saveError: string;
};

const EN: Copy = {
  eyebrow: "Quick activity entry",
  title: "Add an activity",
  helper: "Type or dictate in ordinary language and add immediately. Analysis continues in the required Activity Container.",
  placeholder: "For example: Guitar rehearsal on 30 July from 18:00 to 18:45",
  voice: "Voice",
  voiceSoon: "Voice transcription will be connected in a later stage.",
  analyze: "Analyze",
  analyzing: "Analyzing…",
  activityTitle: "Activity title",
  titlePlaceholder: "AI will suggest a title",
  rules: "AI rules",
  details: "Detailed analysis",
  close: "Collapse",
  clear: "Clear",
  add: "Add activity",
  saving: "Saving…",
  success: "Activity added. Analysis continues in the Activity Container.",
  analysisReady: "AI filled the available fields.",
  analysisError: "AI analysis failed. You can still fill the fields manually.",
  needsClarification: "Check the highlighted schedule fields before saving.",
  timingPreview: "Planned activity",
  rulesTitle: "How interpretation works",
  rulesBody: "The editable rule script will be added in CUX3. This entry point already shows the interpretation order.",
  rulesPriority: [
    "Explicit data in the current message",
    "Personal user rules",
    "Standard ARCTor rules",
    "Ask the user when the result is ambiguous",
  ],
  rulesNext: "Rules editor — next stage",
  validation: "Complete the required schedule fields.",
  saveError: "The activity could not be saved.",
};

const COPY: Partial<Record<ActivityTimingLocalePp1, Partial<Copy>>> = {
  ru: {
    eyebrow: "Быстрое добавление активности",
    title: "Добавить активность",
    helper: "Напишите или надиктуйте обычными словами и сразу добавьте активность. Анализ продолжится в обязательном контейнере активности.",
    placeholder: "Например: Репетиция на гитаре 30 июля с 18:00 до 18:45",
    voice: "Диктовка",
    voiceSoon: "Распознавание голоса будет подключено на следующем этапе.",
    analyze: "Разобрать",
    analyzing: "Анализирую…",
    activityTitle: "Название активности",
    titlePlaceholder: "AI предложит название",
    rules: "Правила AI",
    details: "Подробный разбор",
    close: "Свернуть",
    clear: "Очистить",
    add: "Добавить активность",
    saving: "Сохраняю…",
    success: "Активность добавлена. Анализ продолжается в контейнере активности.",
    analysisReady: "AI заполнил доступные поля.",
    analysisError: "AI-разбор не выполнен. Поля можно заполнить вручную.",
    needsClarification: "Перед сохранением проверьте выделенные поля расписания.",
    timingPreview: "Плановая активность",
    rulesTitle: "Как работает интерпретация",
    rulesBody: "Редактируемый скрипт правил будет добавлен в CUX3. Эта точка входа уже показывает порядок интерпретации.",
    rulesPriority: [
      "Явные данные текущего сообщения",
      "Персональные правила пользователя",
      "Стандартные правила ARCTor",
      "Уточнение у пользователя при неоднозначности",
    ],
    rulesNext: "Редактор правил — следующий этап",
    validation: "Заполните обязательные поля расписания.",
    saveError: "Не удалось сохранить активность.",
  },
  pl: {
    eyebrow: "Szybkie dodawanie aktywności",
    title: "Dodaj aktywność",
    helper: "Wpisz lub podyktuj zwykłym językiem i dodaj od razu. Analiza będzie kontynuowana w obowiązkowym kontenerze aktywności.",
    placeholder: "Na przykład: Próba gitary 30 lipca od 18:00 do 18:45",
    voice: "Głos",
    voiceSoon: "Rozpoznawanie głosu zostanie podłączone na późniejszym etapie.",
    analyze: "Analizuj",
    analyzing: "Analizowanie…",
    activityTitle: "Tytuł aktywności",
    titlePlaceholder: "AI zaproponuje tytuł",
    rules: "Reguły AI",
    details: "Szczegółowa analiza",
    close: "Zwiń",
    clear: "Wyczyść",
    add: "Dodaj aktywność",
    saving: "Zapisywanie…",
    success: "Aktywność została dodana. Analiza trwa w kontenerze aktywności.",
    analysisReady: "AI uzupełniła dostępne pola.",
    analysisError: "Analiza AI nie powiodła się. Pola można uzupełnić ręcznie.",
    needsClarification: "Przed zapisem sprawdź wyróżnione pola harmonogramu.",
    timingPreview: "Planowana aktywność",
    validation: "Uzupełnij wymagane pola harmonogramu.",
    saveError: "Nie udało się zapisać aktywności.",
  },
  uk: {
    eyebrow: "Швидке додавання активності",
    title: "Додати активність",
    helper: "Напишіть або продиктуйте звичайними словами. AI заповнить назву, розклад і тривалість; перед збереженням будь-яке поле можна виправити.",
    placeholder: "Наприклад: Репетиція на гітарі 30 липня з 18:00 до 18:45",
    voice: "Диктування",
    analyze: "Розібрати",
    analyzing: "Аналізую…",
    activityTitle: "Назва активності",
    rules: "Правила AI",
    details: "Докладний розбір",
    close: "Згорнути",
    clear: "Очистити",
    add: "Додати активність",
    saving: "Зберігаю…",
    success: "Активність додано. Календар і журнал активностей оновлюються.",
  },
  de: {
    eyebrow: "Aktivität schnell hinzufügen",
    title: "Aktivität hinzufügen",
    helper: "Schreibe oder diktiere in normaler Sprache. Die KI füllt Titel, Zeitplan und Dauer aus; jedes Feld kann korrigiert werden.",
    placeholder: "Zum Beispiel: Gitarrenprobe am 30. Juli von 18:00 bis 18:45",
    voice: "Sprache",
    analyze: "Analysieren",
    analyzing: "Analyse…",
    activityTitle: "Aktivitätstitel",
    rules: "KI-Regeln",
    details: "Detaillierte Analyse",
    close: "Einklappen",
    clear: "Leeren",
    add: "Aktivität hinzufügen",
    saving: "Speichern…",
    success: "Aktivität hinzugefügt. Kalender und Aktivitätsjournal werden aktualisiert.",
  },
  es: {
    eyebrow: "Añadir actividad rápidamente",
    title: "Añadir actividad",
    helper: "Escribe o dicta con palabras normales. La IA completará el título, la programación y la duración; puedes corregir cada campo.",
    placeholder: "Por ejemplo: Ensayo de guitarra el 30 de julio de 18:00 a 18:45",
    voice: "Voz",
    analyze: "Analizar",
    analyzing: "Analizando…",
    activityTitle: "Título de la actividad",
    rules: "Reglas de IA",
    details: "Análisis detallado",
    close: "Contraer",
    clear: "Limpiar",
    add: "Añadir actividad",
    saving: "Guardando…",
    success: "Actividad añadida. El calendario y el diario se están actualizando.",
  },
  cs: {
    eyebrow: "Rychlé přidání aktivity",
    title: "Přidat aktivitu",
    helper: "Napište nebo nadiktujte běžnými slovy. AI doplní název, plán a délku; každé pole lze opravit.",
    placeholder: "Například: Kytarová zkouška 30. července od 18:00 do 18:45",
    voice: "Hlas",
    analyze: "Analyzovat",
    analyzing: "Analyzuji…",
    activityTitle: "Název aktivity",
    rules: "Pravidla AI",
    details: "Podrobná analýza",
    close: "Sbalit",
    clear: "Vymazat",
    add: "Přidat aktivitu",
    saving: "Ukládám…",
    success: "Aktivita byla přidána. Kalendář a deník aktivit se aktualizují.",
  },
};

function copyFor(locale: ActivityTimingLocalePp1): Copy {
  return { ...EN, ...(COPY[locale] ?? {}) };
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cux2-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function Cux2InlineActivityComposer({
  open,
  locale,
  focusDateKey,
  onClose,
  onSaved,
}: {
  open: boolean;
  locale: ActivityTimingLocalePp1;
  focusDateKey: string;
  onClose: () => void;
  onSaved: (result: Cux4QuickCaptureResult) => void;
}) {
  const copy = copyFor(locale);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [timingDraft, setTimingDraft] = useState<ActivityTimingDraftPp1>(() =>
    inferActivityTimingDraftPp1("", "future"),
  );
  const [plannedTargetIds, setPlannedTargetIds] = useState<string[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const timingTouchedRef = useRef(false);
  const titleTouchedRef = useRef(false);
  const analysisSequenceRef = useRef(0);
  const requestIdRef = useRef(createRequestId());

  const timingValidation = useMemo(
    () => validateActivityTimingDraftPp1(timingDraft, "future"),
    [timingDraft],
  );
  const timingLabel = useMemo(
    () => formatActivityTimingDraftPp1(timingDraft, "future", locale),
    [locale, timingDraft],
  );
  const timingFocusDate = useMemo(
    () => getTimingFocusDatePp1(timingDraft, "future"),
    [timingDraft],
  );

  async function analyzeText(rawText: string) {
    const normalizedText = rawText.trim();

    if (!normalizedText) {
      setAnalysisStatus("idle");
      return;
    }

    const sequence = analysisSequenceRef.current + 1;
    analysisSequenceRef.current = sequence;
    setAnalysisStatus("analyzing");

    try {
      const response = await fetch("/api/calendar/activity-review/semantic-preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          text: normalizedText,
          locale,
          source: "calendar_inline_composer",
          mode: "preview_only",
          temporalDirection: "future",
          write: false,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SemanticPreviewPayload | null;

      if (sequence !== analysisSequenceRef.current) {
        return;
      }

      if (!response.ok || !payload) {
        throw new Error(payload?.error || `Semantic preview failed: ${response.status}`);
      }

      if (payload.activityTitle?.trim() && !titleTouchedRef.current) {
        setTitle(payload.activityTitle.trim());
      }

      if (!timingTouchedRef.current) {
        setTimingDraft((current) => mergeActivityTimingDraftPp1(current, payload.timingDraft));
      }

      setAnalysisStatus("ready");
    } catch {
      if (sequence === analysisSequenceRef.current) {
        setAnalysisStatus("error");
      }
    }
  }

  useEffect(() => {
    const normalizedText = text.trim();
    timingTouchedRef.current = false;
    titleTouchedRef.current = false;
    setTimingDraft(inferActivityTimingDraftPp1(normalizedText, "future"));
    setSaveStatus("idle");
    setSaveMessage(null);
    setAnalysisStatus("idle");

    if (!normalizedText) {
      setTitle("");
      return;
    }

    setTitle(normalizedText);
  }, [locale, text]);

  function clearDraft() {
    analysisSequenceRef.current += 1;
    setText("");
    setTitle("");
    setTimingDraft(inferActivityTimingDraftPp1("", "future"));
    setPlannedTargetIds([]);
    setAnalysisStatus("idle");
    setSaveStatus("idle");
    setSaveMessage(null);
    timingTouchedRef.current = false;
    titleTouchedRef.current = false;
    requestIdRef.current = createRequestId();
  }

  async function saveActivity() {
    const rawText = text.trim();
    const activityTitle = title.trim() || rawText;

    if (!rawText || saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");
    setSaveMessage(null);

    try {
      const writeTimingDraft = timingValidation.ok
        ? timingDraft
        : inferActivityTimingDraftPp1("", "future");
      const writeTimingLabel = formatActivityTimingDraftPp1(
        writeTimingDraft,
        "future",
        locale,
      );
      const writeFocusDate = getTimingFocusDatePp1(
        writeTimingDraft,
        "future",
      );
      const durationMinutes = parsePositiveDurationMinutesPp1(
        writeTimingDraft.durationMinutes,
      );
      const startedAt = datetimeLocalToIsoPp1(
        writeTimingDraft.startedAtLocal,
      );
      const endedAt = datetimeLocalToIsoPp1(
        writeTimingDraft.endedAtLocal,
      );
      const deadlineAt = datetimeLocalToIsoPp1(
        writeTimingDraft.deadlineLocal,
      );
      const protectedFieldCodes = [
        ...(titleTouchedRef.current ? ["title"] : []),
        ...(timingTouchedRef.current && timingValidation.ok
          ? [
              "schedule_mode_code",
              "scheduled_date",
              "schedule_start_date",
              "schedule_end_date",
              "deadline_at",
              "started_at",
              "ended_at",
              "duration_minutes",
            ]
          : []),
        ...(plannedTargetIds.length > 0 ? ["planned_target_links"] : []),
      ];

      const response = await fetch("/api/activity/events", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: requestIdRef.current,
          activityRoleCode: "planned",
          title: activityTitle,
          rawText,
          inputText: rawText,
          description: [
            "Source: calendar_inline_composer",
            `Raw text: ${rawText}`,
            `Timing: ${writeTimingLabel}`,
          ].join("\n"),
          durationMinutes,
          status: "planned",
          source: "manual_form",
          privacyScope: "private",
          scheduleModeCode: writeTimingDraft.scheduleModeCode,
          scheduledDate:
            writeTimingDraft.scheduleModeCode === "date_only"
              ? writeTimingDraft.scheduledDate
              : null,
          scheduleStartDate:
            writeTimingDraft.scheduleModeCode === "date_range"
              ? writeTimingDraft.scheduleStartDate
              : null,
          scheduleEndDate:
            writeTimingDraft.scheduleModeCode === "date_range"
              ? writeTimingDraft.scheduleEndDate
              : null,
          deadlineAt:
            writeTimingDraft.scheduleModeCode === "deadline"
              ? deadlineAt
              : null,
          startedAt:
            writeTimingDraft.scheduleModeCode === "exact"
              ? startedAt
              : null,
          endedAt:
            writeTimingDraft.scheduleModeCode === "exact"
              ? endedAt
              : null,
          createCalendarProjection:
            writeTimingDraft.scheduleModeCode === "exact",
          plannedTargetValueObjectIds: plannedTargetIds,
          metadata: {
            cux2Composer: "inline_calendar",
            locale,
            sourceFocusDate: focusDateKey,
            semanticAnalysisStatus: analysisStatus,
            cux4: {
              backgroundAnalysis: true,
              protectedFieldCodes,
              initialTimingValidationOk: timingValidation.ok,
              requiredActivityContainer: true,
            },
          },
        }),
      });
      const payload = (
        await response.json().catch(() => null)
      ) as ActivityCreateResponse | null;

      if (!response.ok || payload?.ok !== true || !payload.activityEvent?.id) {
        throw new Error(
          payload?.error || `Activity write failed: ${response.status}`,
        );
      }

      const result: Cux4QuickCaptureResult = {
        activityEventId: payload.activityEvent.id,
        enrichmentRunId:
          payload.semanticEnrichment?.runId ?? null,
        analysisStatus:
          payload.semanticEnrichment?.status ?? "pending",
        focusDateKey: writeFocusDate ?? focusDateKey,
      };

      setSaveStatus("saved");
      setSaveMessage(copy.success);
      onSaved(result);
      clearDraft();
      onClose();
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : copy.saveError,
      );
    }
  }

  if (!open) {
    return null;
  }

  return (
    <section id="calendar-inline-composer" className="rounded-2xl border border-[#d8deef] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#3b6ef8]">{copy.eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-[#1a1d2e]">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#68708a]">{copy.helper}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-bold text-[#667091] hover:bg-[#f4f6fb]">
          {copy.close}
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={copy.placeholder}
              rows={4}
              className="w-full resize-y rounded-xl border border-[#dfe5f1] bg-white px-4 py-3 text-sm leading-6 text-[#1a1d2e] outline-none transition placeholder:text-[#9ca3b8] focus:border-[#3b6ef8]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled title={copy.voiceSoon} className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-bold text-[#9ca3b8] disabled:cursor-not-allowed">🎙 {copy.voice}</button>
              <button type="button" onClick={() => void analyzeText(text)} disabled={!text.trim() || analysisStatus === "analyzing"} className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-2 text-sm font-bold text-[#315ee7] disabled:cursor-not-allowed disabled:border-[#d8deef] disabled:text-[#9ca3b8]">
                {analysisStatus === "analyzing" ? copy.analyzing : copy.analyze}
              </button>
              <button type="button" onClick={() => setRulesOpen((value) => !value)} className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-bold text-[#667091] hover:bg-[#f4f6fb]">{copy.rules}</button>
              <button type="button" onClick={clearDraft} disabled={!text && !title} className="rounded-xl border border-[#d8deef] bg-white px-3 py-2 text-sm font-bold text-[#667091] hover:bg-[#f4f6fb] disabled:cursor-not-allowed disabled:text-[#b7bdcc]">{copy.clear}</button>
            </div>

            {rulesOpen ? (
              <Cux3AiRulesEditor
                locale={locale}
                sourceText={text}
                onRulesChanged={() => {
                  if (text.trim()) {
                    void analyzeText(text);
                  }
                }}
              />
            ) : null}

          </div>

          <label className="block rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">{copy.activityTitle}</span>
            <input value={title} onChange={(event) => { titleTouchedRef.current = true; setTitle(event.target.value); }} placeholder={copy.titlePlaceholder} className="mt-2 w-full rounded-xl border border-[#dfe5f1] bg-white px-3 py-2 text-sm font-semibold text-[#1a1d2e] outline-none focus:border-[#3b6ef8]" />
          </label>

          <ActivityTimingEditorPp1
            locale={locale}
            temporalDirection="future"
            draft={timingDraft}
            onChange={(next) => {
              timingTouchedRef.current = true;
              setTimingDraft(next);
              setSaveStatus("idle");
              setSaveMessage(null);
            }}
            valid={timingValidation.ok}
          />
        </div>

        <div className="space-y-4">
          <PlannedTargetSelectorPp1 locale={locale} selectedIds={plannedTargetIds} onChange={setPlannedTargetIds} />
          <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7c8099]">{copy.timingPreview}</p>
            <p className="mt-2 text-base font-extrabold text-[#1a1d2e]">{timingLabel}</p>
            {!timingValidation.ok ? <p className="mt-2 text-sm font-semibold text-rose-700">{copy.needsClarification}</p> : null}
          </div>
          <button type="button" onClick={() => void saveActivity()} disabled={!text.trim() || saveStatus === "saving" || saveStatus === "saved"} className="w-full rounded-[16px] bg-[#3b6ef8] px-4 py-3 text-sm font-bold text-white shadow-sm shadow-[#3b6ef8]/20 disabled:cursor-not-allowed disabled:bg-[#c8d2f4]">
            {saveStatus === "saving" ? copy.saving : copy.add}
          </button>
          {saveMessage ? (
            <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${saveStatus === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {saveStatus === "error" ? `${copy.saveError} ${saveMessage}` : saveMessage}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
