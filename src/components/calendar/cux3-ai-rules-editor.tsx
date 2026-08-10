"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  formatActivityTimingDraftPp1,
  type ActivityTimingDraftPp1,
  type ActivityTimingLocalePp1,
} from "@/lib/activity/pp1/activityTiming";

type RuleSource = "personal_exact" | "personal_fallback_en" | "system_default" | "test_override";

type RulePreference = {
  locale: ActivityTimingLocalePp1;
  effectiveText: string;
  customText: string | null;
  systemDefaultText: string;
  source: RuleSource;
  fallbackLocale: ActivityTimingLocalePp1 | null;
  ruleVersion: number | null;
  updatedAt: string | null;
};

type RuleApiPayload = {
  ok?: boolean;
  error?: string;
  preference?: RulePreference;
  maxLength?: number;
};

type TestPreviewPayload = {
  ok?: boolean;
  error?: string;
  activityTitle?: string;
  summary?: string;
  timingDraft?: ActivityTimingDraftPp1;
  rules?: {
    source?: RuleSource;
    matched?: boolean;
    matchedPhrase?: string | null;
    targetTitles?: string[];
  };
};

type Status = "idle" | "loading" | "saving" | "testing" | "error";

type Copy = {
  title: string;
  intro: string;
  loading: string;
  ruleText: string;
  save: string;
  saving: string;
  restore: string;
  restoreConfirm: string;
  testTitle: string;
  testPlaceholder: string;
  test: string;
  testing: string;
  saved: string;
  restored: string;
  sourceSystem: string;
  sourcePersonal: string;
  sourceFallback: string;
  version: string;
  helpTitle: string;
  syntax: string;
  syntaxExample: string;
  natural: string;
  priorityTitle: string;
  priority: string[];
  explicitWins: string;
  testNoMatch: string;
  matched: string;
  targets: string;
  error: string;
};

const EN: Copy = {
  title: "Personal AI interpretation rules",
  intro: "Edit your private copy. ARCTor system defaults remain unchanged.",
  loading: "Loading rules…",
  ruleText: "Rule text",
  save: "Save personal rules",
  saving: "Saving…",
  restore: "Restore system default",
  restoreConfirm: "Replace the personal text for this language with the ARCTor system default?",
  testTitle: "Test without saving an activity",
  testPlaceholder: "Enter a phrase to test",
  test: "Test rule",
  testing: "Testing…",
  saved: "Personal rules saved.",
  restored: "System default restored.",
  sourceSystem: "System default",
  sourcePersonal: "Personal rules",
  sourceFallback: "Personal English fallback",
  version: "Version",
  helpTitle: "How to write rules",
  syntax: "For a deterministic shortcut use one line in this form:",
  syntaxExample: 'WHEN "fishing" => TITLE "Fishing"; NEXT Sunday 09:00-12:00; TARGET "Sunday fishing"',
  natural: "You may also add natural-language guidance. Comments beginning with #, // or ; are ignored by deterministic parsing.",
  priorityTitle: "Interpretation priority",
  priority: [
    "Explicit data in the current message",
    "Personal user rules",
    "Standard ARCTor rules",
    "Clarification from the user",
  ],
  explicitWins: "A personal rule fills only missing information; it never overwrites an explicit date or time in the message.",
  testNoMatch: "No deterministic shortcut matched. Natural-language guidance may still be used by the AI model.",
  matched: "Matched shortcut",
  targets: "Suggested targets",
  error: "The rules operation failed.",
};

const COPY: Partial<Record<ActivityTimingLocalePp1, Partial<Copy>>> = {
  pl: {
    title: "Osobiste reguły interpretacji AI",
    intro: "Edytujesz prywatną kopię. Systemowe reguły ARCTor pozostają niezmienione.",
    loading: "Ładowanie reguł…",
    ruleText: "Tekst reguł",
    save: "Zapisz osobiste reguły",
    saving: "Zapisywanie…",
    restore: "Przywróć tekst systemowy",
    restoreConfirm: "Zastąpić osobisty tekst dla tego języka domyślnym tekstem ARCTor?",
    testTitle: "Test bez zapisywania aktywności",
    testPlaceholder: "Wpisz frazę testową",
    test: "Testuj regułę",
    testing: "Testowanie…",
    saved: "Osobiste reguły zapisano.",
    restored: "Przywrócono tekst systemowy.",
    sourceSystem: "Tekst systemowy",
    sourcePersonal: "Osobiste reguły",
    sourceFallback: "Osobisty fallback angielski",
    version: "Wersja",
    helpTitle: "Jak pisać reguły",
    syntax: "Dla deterministycznego skrótu użyj jednego wiersza:",
    natural: "Można też dodać wskazówki zwykłym językiem. Wiersze zaczynające się od #, // lub ; są komentarzami.",
    priorityTitle: "Priorytet interpretacji",
    priority: ["Jawne dane wiadomości", "Osobiste reguły", "Standard ARCTor", "Doprecyzowanie przez użytkownika"],
    explicitWins: "Reguła osobista tylko uzupełnia braki i nie nadpisuje jawnej daty ani godziny.",
    testNoMatch: "Brak dopasowania skrótu deterministycznego. Model AI nadal może użyć wskazówek językowych.",
    matched: "Dopasowany skrót",
    targets: "Sugerowane cele",
    error: "Operacja na regułach nie powiodła się.",
  },
  ru: {
    title: "Персональные правила интерпретации AI",
    intro: "Вы редактируете личную копию. Системный текст ARCTor остаётся неизменным.",
    loading: "Загружаю правила…",
    ruleText: "Текст правил",
    save: "Сохранить персональные правила",
    saving: "Сохраняю…",
    restore: "Восстановить системный текст",
    restoreConfirm: "Заменить персональный текст для этого языка системным текстом ARCTor?",
    testTitle: "Проверка без сохранения активности",
    testPlaceholder: "Введите проверочную фразу",
    test: "Проверить правило",
    testing: "Проверяю…",
    saved: "Персональные правила сохранены.",
    restored: "Системный текст восстановлен.",
    sourceSystem: "Системный текст",
    sourcePersonal: "Персональные правила",
    sourceFallback: "Персональный английский fallback",
    version: "Версия",
    helpTitle: "Как писать правила",
    syntax: "Для детерминированного ярлыка используйте одну строку:",
    syntaxExample: 'КОГДА "рыбалка" => НАЗВАНИЕ "Рыбалка"; БЛИЖАЙШЕЕ воскресенье 09:00-12:00; ЦЕЛЬ "Рыбалка по воскресеньям"',
    natural: "Можно добавлять инструкции обычным языком. Строки, начинающиеся с #, // или ;, считаются комментариями.",
    priorityTitle: "Приоритет интерпретации",
    priority: ["Явные данные сообщения", "Персональные правила", "Стандарт ARCTor", "Уточнение пользователя"],
    explicitWins: "Персональное правило только заполняет пробелы и не заменяет явно указанную дату или время.",
    testNoMatch: "Детерминированный ярлык не найден. AI всё равно может использовать инструкции обычным языком.",
    matched: "Сработавший ярлык",
    targets: "Предложенные цели",
    error: "Операция с правилами не выполнена.",
  },
  uk: {
    title: "Персональні правила інтерпретації AI",
    intro: "Ви редагуєте особисту копію. Системний текст ARCTor не змінюється.",
    ruleText: "Текст правил",
    save: "Зберегти персональні правила",
    restore: "Відновити системний текст",
    testTitle: "Перевірка без збереження активності",
    testPlaceholder: "Введіть тестову фразу",
    test: "Перевірити правило",
    priorityTitle: "Пріоритет інтерпретації",
    priority: ["Явні дані повідомлення", "Персональні правила", "Стандарт ARCTor", "Уточнення користувача"],
  },
  de: {
    title: "Persönliche KI-Interpretationsregeln",
    intro: "Du bearbeitest deine private Kopie. Die ARCTor-Systemregeln bleiben unverändert.",
    ruleText: "Regeltext",
    save: "Persönliche Regeln speichern",
    restore: "Systemtext wiederherstellen",
    testTitle: "Test ohne Aktivität zu speichern",
    testPlaceholder: "Testphrase eingeben",
    test: "Regel testen",
    priorityTitle: "Interpretationspriorität",
    priority: ["Explizite Nachrichtendaten", "Persönliche Regeln", "ARCTor-Standard", "Rückfrage beim Benutzer"],
  },
  es: {
    title: "Reglas personales de interpretación de IA",
    intro: "Editas tu copia privada. Las reglas del sistema ARCTor no cambian.",
    ruleText: "Texto de reglas",
    save: "Guardar reglas personales",
    restore: "Restaurar texto del sistema",
    testTitle: "Probar sin guardar una actividad",
    testPlaceholder: "Introduce una frase de prueba",
    test: "Probar regla",
    priorityTitle: "Prioridad de interpretación",
    priority: ["Datos explícitos del mensaje", "Reglas personales", "Estándar ARCTor", "Aclaración del usuario"],
  },
  cs: {
    title: "Osobní pravidla interpretace AI",
    intro: "Upravujete svou soukromou kopii. Systémová pravidla ARCTor zůstávají beze změny.",
    ruleText: "Text pravidel",
    save: "Uložit osobní pravidla",
    restore: "Obnovit systémový text",
    testTitle: "Test bez uložení aktivity",
    testPlaceholder: "Zadejte testovací frázi",
    test: "Otestovat pravidlo",
    priorityTitle: "Priorita interpretace",
    priority: ["Výslovné údaje zprávy", "Osobní pravidla", "Standard ARCTor", "Upřesnění uživatele"],
  },
};

function copyFor(locale: ActivityTimingLocalePp1): Copy {
  return { ...EN, ...(COPY[locale] ?? {}) };
}

function sourceLabel(copy: Copy, source: RuleSource) {
  if (source === "personal_exact") {
    return copy.sourcePersonal;
  }
  if (source === "personal_fallback_en") {
    return copy.sourceFallback;
  }
  return copy.sourceSystem;
}

export function Cux3AiRulesEditor({
  locale,
  uiLocale = locale,
  sourceText,
  onRulesChanged,
}: {
  locale: ActivityTimingLocalePp1;
  uiLocale?: ActivityTimingLocalePp1;
  sourceText: string;
  onRulesChanged: () => void;
}) {
  const copy = copyFor(uiLocale);
  const [preference, setPreference] = useState<RulePreference | null>(null);
  const [draftText, setDraftText] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [maxLength, setMaxLength] = useState(12_000);
  const [testText, setTestText] = useState(sourceText);
  const [testResult, setTestResult] = useState<TestPreviewPayload | null>(null);
  const testTouchedRef = useRef(false);

  const dirty = useMemo(
    () => Boolean(preference) && draftText !== (preference?.customText ?? preference?.effectiveText ?? ""),
    [draftText, preference],
  );

  useEffect(() => {
    if (!testTouchedRef.current) {
      setTestText(sourceText);
    }
  }, [sourceText]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setMessage(null);

      try {
        const response = await fetch(`/api/calendar/ai-rules?locale=${encodeURIComponent(locale)}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as RuleApiPayload | null;

        if (!response.ok || !payload?.preference) {
          throw new Error(payload?.error || `Rules request failed: ${response.status}`);
        }

        if (!cancelled) {
          setPreference(payload.preference);
          setDraftText(payload.preference.customText ?? payload.preference.effectiveText);
          setMaxLength(payload.maxLength ?? 12_000);
          setStatus("idle");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : copy.error);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.error, locale]);

  async function save() {
    if (!draftText.trim() || status === "saving") {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/calendar/ai-rules", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ locale, ruleText: draftText }),
      });
      const payload = (await response.json().catch(() => null)) as RuleApiPayload | null;

      if (!response.ok || !payload?.preference) {
        throw new Error(payload?.error || `Rules save failed: ${response.status}`);
      }

      setPreference(payload.preference);
      setDraftText(payload.preference.customText ?? payload.preference.effectiveText);
      setStatus("idle");
      setMessage(copy.saved);
      onRulesChanged();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  async function restore() {
    if (!window.confirm(copy.restoreConfirm)) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/calendar/ai-rules", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ locale }),
      });
      const payload = (await response.json().catch(() => null)) as RuleApiPayload | null;

      if (!response.ok || !payload?.preference) {
        throw new Error(payload?.error || `Rules restore failed: ${response.status}`);
      }

      setPreference(payload.preference);
      setDraftText(payload.preference.systemDefaultText);
      setStatus("idle");
      setMessage(copy.restored);
      onRulesChanged();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  async function testRule() {
    if (!draftText.trim() || !testText.trim()) {
      return;
    }

    setStatus("testing");
    setMessage(null);
    setTestResult(null);

    try {
      const response = await fetch("/api/calendar/activity-review/semantic-preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          text: testText.trim(),
          locale,
          temporalDirection: "future",
          mode: "preview_only",
          write: false,
          testRule: true,
          personalRulesOverride: draftText,
        }),
      });
      const payload = (await response.json().catch(() => null)) as TestPreviewPayload | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `Rule test failed: ${response.status}`);
      }

      setTestResult(payload);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  const testTiming = testResult?.timingDraft
    ? formatActivityTimingDraftPp1(testResult.timingDraft, "future", uiLocale)
    : null;

  return (
    <div className="mt-3 rounded-2xl border border-[#cbd7ff] bg-[#eef2ff] p-4 text-sm text-[#52607a]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[#1a1d2e]">{copy.title}</p>
          <p className="mt-1 leading-6">{copy.intro}</p>
        </div>
        {preference ? (
          <span className="rounded-full border border-[#cbd7ff] bg-white px-2.5 py-1 text-xs font-bold text-[#315ee7]">
            {sourceLabel(copy, preference.source)}
            {preference.ruleVersion ? ` · ${copy.version} ${preference.ruleVersion}` : ""}
          </span>
        ) : null}
      </div>

      {status === "loading" ? <p className="mt-3 font-semibold">{copy.loading}</p> : null}

      {preference ? (
        <>
          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#667091]">{copy.ruleText}</span>
            <textarea
              value={draftText}
              onChange={(event) => {
                setDraftText(event.target.value.slice(0, maxLength));
                setMessage(null);
              }}
              rows={10}
              maxLength={maxLength}
              className="mt-2 w-full resize-y rounded-xl border border-[#cbd7ff] bg-white px-3 py-3 font-mono text-xs leading-5 text-[#1a1d2e] outline-none focus:border-[#3b6ef8]"
            />
            <span className="mt-1 block text-right text-[11px] text-[#7c8099]">{draftText.length}/{maxLength}</span>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={!dirty || !draftText.trim() || status === "saving" || status === "testing"} className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#aebdf0]">
              {status === "saving" ? copy.saving : copy.save}
            </button>
            <button type="button" onClick={() => void restore()} disabled={status === "saving" || status === "testing"} className="rounded-xl border border-[#cbd7ff] bg-white px-4 py-2 text-sm font-bold text-[#315ee7] disabled:cursor-not-allowed disabled:text-[#9ca3b8]">
              {copy.restore}
            </button>
          </div>

          <details className="mt-4 rounded-xl border border-[#d8deef] bg-white p-3">
            <summary className="cursor-pointer font-bold text-[#1a1d2e]">ⓘ {copy.helpTitle}</summary>
            <p className="mt-3">{copy.syntax}</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-[#f5f7fb] p-3 text-xs text-[#1a1d2e]">{copy.syntaxExample}</code>
            <p className="mt-2 leading-6">{copy.natural}</p>
            <p className="mt-3 font-bold text-[#1a1d2e]">{copy.priorityTitle}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{copy.priority.map((item) => <li key={item}>{item}</li>)}</ol>
            <p className="mt-2 font-semibold text-[#315ee7]">{copy.explicitWins}</p>
          </details>

          <div className="mt-4 rounded-xl border border-[#d8deef] bg-white p-3">
            <p className="font-bold text-[#1a1d2e]">{copy.testTitle}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={testText}
                onChange={(event) => {
                  testTouchedRef.current = true;
                  setTestText(event.target.value);
                }}
                placeholder={copy.testPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-[#d8deef] px-3 py-2 text-sm text-[#1a1d2e] outline-none focus:border-[#3b6ef8]"
              />
              <button type="button" onClick={() => void testRule()} disabled={!testText.trim() || !draftText.trim() || status === "testing" || status === "saving"} className="rounded-xl border border-[#3b6ef8] bg-[#eef2ff] px-4 py-2 font-bold text-[#315ee7] disabled:cursor-not-allowed disabled:border-[#d8deef] disabled:text-[#9ca3b8]">
                {status === "testing" ? copy.testing : copy.test}
              </button>
            </div>

            {testResult ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                <p className="font-bold">{testResult.activityTitle}</p>
                {testTiming ? <p className="mt-1">{testTiming}</p> : null}
                <p className="mt-1 text-xs">{testResult.rules?.matched ? `${copy.matched}: ${testResult.rules.matchedPhrase ?? ""}` : copy.testNoMatch}</p>
                {testResult.rules?.targetTitles?.length ? <p className="mt-1 text-xs">{copy.targets}: {testResult.rules.targetTitles.join(", ")}</p> : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {message ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 font-semibold ${status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
