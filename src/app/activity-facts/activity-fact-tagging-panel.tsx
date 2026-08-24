"use client";

import { useEffect, useMemo, useState } from "react";

type FactForTagging = {
  factId: string | null;
  activityTitle?: string | null;
  semanticObjectKey: string | null;
  measureType: string | null;
  valueObjects?: Array<{
    id: string;
    title: string;
    canonicalKey: string | null;
  }>;
};

type TagLink = {
  linkId?: string | null;
  valueObjectId: string;
  title: string;
  canonicalKey: string | null;
  sourceCode: string;
  sourceTemplateProfileId: string | null;
  confidence: number | null;
  isMaterialized: boolean;
};

type SelectorItem = {
  id: string;
  title: string;
  canonicalKey: string | null;
  pathText: string;
  status: string;
  level: string;
};

type RecognitionCandidate = {
  valueObjectId: string;
  title: string;
  canonicalKey: string | null;
  matchScore: number | null;
};

type Copy = {
  title: string;
  subtitle: string;
  current: string;
  none: string;
  semanticTitle: string;
  semanticHint: string;
  analyze: string;
  analyzing: string;
  suggestions: string;
  noSuggestions: string;
  accept: string;
  reject: string;
  manualTitle: string;
  manualHint: string;
  search: string;
  searching: string;
  add: string;
  save: string;
  saving: string;
  reset: string;
  saved: string;
  remove: string;
  error: string;
  sourceLabels: Record<string, string>;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Final value-object tags",
    subtitle: "Review semantic links for this fact. Suggestions never save automatically.",
    current: "Current draft",
    none: "No value objects are linked.",
    semanticTitle: "Additional semantic review",
    semanticHint: "Uses the existing deterministic value-object recognizer. Accept or reject every suggestion explicitly.",
    analyze: "Find suggestions",
    analyzing: "Analyzing…",
    suggestions: "Suggestions",
    noSuggestions: "No new suggestions found.",
    accept: "Accept",
    reject: "Reject",
    manualTitle: "Manual value-object search",
    manualHint: "Search active leaf objects from the current profile and GLOBAL ontology.",
    search: "Search",
    searching: "Searching…",
    add: "Add",
    save: "Save final tags",
    saving: "Saving…",
    reset: "Reset draft",
    saved: "Final tags saved.",
    remove: "Remove",
    error: "Could not update fact tags.",
    sourceLabels: {
      template: "template",
      semantic_review: "semantic review",
      manual: "manual",
      legacy_fact: "legacy bridge",
      correction: "correction",
    },
  },
  ru: {
    title: "Итоговые связи факта с ЦО/ОН",
    subtitle: "Проверь смысловые связи этого факта. Предложения никогда не сохраняются автоматически.",
    current: "Текущий черновик",
    none: "Ценные объекты пока не связаны.",
    semanticTitle: "Дополнительный смысловой разбор",
    semanticHint: "Используется существующий детерминированный распознаватель ЦО. Каждое предложение принимается или отклоняется явно.",
    analyze: "Найти предложения",
    analyzing: "Разбираю…",
    suggestions: "Предложения",
    noSuggestions: "Новых предложений нет.",
    accept: "Принять",
    reject: "Отклонить",
    manualTitle: "Ручной поиск ЦО",
    manualHint: "Поиск активных листовых объектов текущего профиля и GLOBAL-онтологии.",
    search: "Найти",
    searching: "Ищу…",
    add: "Добавить",
    save: "Сохранить итоговые связи",
    saving: "Сохраняю…",
    reset: "Сбросить черновик",
    saved: "Итоговые связи сохранены.",
    remove: "Убрать",
    error: "Не удалось обновить связи факта.",
    sourceLabels: {
      template: "шаблон",
      semantic_review: "смысловой разбор",
      manual: "вручную",
      legacy_fact: "legacy-мост",
      correction: "коррекция",
    },
  },
  pl: {
    title: "Końcowe powiązania faktu z obiektami wartości",
    subtitle: "Sprawdź znaczeniowe powiązania faktu. Sugestie nigdy nie zapisują się automatycznie.",
    current: "Bieżąca wersja robocza",
    none: "Brak powiązanych obiektów wartości.",
    semanticTitle: "Dodatkowa analiza semantyczna",
    semanticHint: "Używa istniejącego deterministycznego rozpoznawania obiektów wartości. Każdą sugestię trzeba jawnie przyjąć lub odrzucić.",
    analyze: "Znajdź sugestie",
    analyzing: "Analizuję…",
    suggestions: "Sugestie",
    noSuggestions: "Brak nowych sugestii.",
    accept: "Przyjmij",
    reject: "Odrzuć",
    manualTitle: "Ręczne wyszukiwanie",
    manualHint: "Wyszukuje aktywne obiekty liściowe bieżącego profilu i ontologii GLOBAL.",
    search: "Szukaj",
    searching: "Szukam…",
    add: "Dodaj",
    save: "Zapisz końcowe powiązania",
    saving: "Zapisuję…",
    reset: "Przywróć",
    saved: "Końcowe powiązania zapisane.",
    remove: "Usuń",
    error: "Nie udało się zaktualizować powiązań faktu.",
    sourceLabels: {
      template: "szablon",
      semantic_review: "analiza semantyczna",
      manual: "ręcznie",
      legacy_fact: "most legacy",
      correction: "korekta",
    },
  },
  uk: {
    title: "Підсумкові зв’язки факту з ЦО/ОН",
    subtitle: "Перевір смислові зв’язки цього факту. Пропозиції ніколи не зберігаються автоматично.",
    current: "Поточна чернетка",
    none: "Цінні об’єкти ще не пов’язані.",
    semanticTitle: "Додатковий смисловий розбір",
    semanticHint: "Використовується наявний детермінований розпізнавач ЦО. Кожну пропозицію потрібно явно прийняти або відхилити.",
    analyze: "Знайти пропозиції",
    analyzing: "Аналізую…",
    suggestions: "Пропозиції",
    noSuggestions: "Нових пропозицій немає.",
    accept: "Прийняти",
    reject: "Відхилити",
    manualTitle: "Ручний пошук ЦО",
    manualHint: "Пошук активних листових об’єктів поточного профілю та GLOBAL-онтології.",
    search: "Знайти",
    searching: "Шукаю…",
    add: "Додати",
    save: "Зберегти підсумкові зв’язки",
    saving: "Зберігаю…",
    reset: "Скинути чернетку",
    saved: "Підсумкові зв’язки збережено.",
    remove: "Прибрати",
    error: "Не вдалося оновити зв’язки факту.",
    sourceLabels: {
      template: "шаблон",
      semantic_review: "смисловий розбір",
      manual: "вручну",
      legacy_fact: "legacy-міст",
      correction: "корекція",
    },
  },
  de: {
    title: "Endgültige Wertobjekt-Zuordnungen",
    subtitle: "Prüfe die semantischen Verknüpfungen dieses Fakts. Vorschläge werden nie automatisch gespeichert.",
    current: "Aktueller Entwurf",
    none: "Keine Wertobjekte verknüpft.",
    semanticTitle: "Zusätzliche semantische Prüfung",
    semanticHint: "Verwendet die vorhandene deterministische Wertobjekt-Erkennung. Jeder Vorschlag wird ausdrücklich angenommen oder verworfen.",
    analyze: "Vorschläge suchen",
    analyzing: "Analysiere…",
    suggestions: "Vorschläge",
    noSuggestions: "Keine neuen Vorschläge.",
    accept: "Annehmen",
    reject: "Verwerfen",
    manualTitle: "Manuelle Wertobjekt-Suche",
    manualHint: "Sucht aktive Blattobjekte des aktuellen Profils und der GLOBAL-Ontologie.",
    search: "Suchen",
    searching: "Suche…",
    add: "Hinzufügen",
    save: "Endgültige Zuordnungen speichern",
    saving: "Speichere…",
    reset: "Entwurf zurücksetzen",
    saved: "Endgültige Zuordnungen gespeichert.",
    remove: "Entfernen",
    error: "Fakt-Zuordnungen konnten nicht aktualisiert werden.",
    sourceLabels: {
      template: "Vorlage",
      semantic_review: "semantische Prüfung",
      manual: "manuell",
      legacy_fact: "Legacy-Brücke",
      correction: "Korrektur",
    },
  },
  es: {
    title: "Vínculos finales del hecho con objetos de valor",
    subtitle: "Revisa los vínculos semánticos de este hecho. Las sugerencias nunca se guardan automáticamente.",
    current: "Borrador actual",
    none: "No hay objetos de valor vinculados.",
    semanticTitle: "Revisión semántica adicional",
    semanticHint: "Usa el reconocedor determinista existente. Cada sugerencia debe aceptarse o rechazarse explícitamente.",
    analyze: "Buscar sugerencias",
    analyzing: "Analizando…",
    suggestions: "Sugerencias",
    noSuggestions: "No hay sugerencias nuevas.",
    accept: "Aceptar",
    reject: "Rechazar",
    manualTitle: "Búsqueda manual",
    manualHint: "Busca objetos hoja activos del perfil actual y de la ontología GLOBAL.",
    search: "Buscar",
    searching: "Buscando…",
    add: "Añadir",
    save: "Guardar vínculos finales",
    saving: "Guardando…",
    reset: "Restablecer borrador",
    saved: "Vínculos finales guardados.",
    remove: "Quitar",
    error: "No se pudieron actualizar los vínculos del hecho.",
    sourceLabels: {
      template: "plantilla",
      semantic_review: "revisión semántica",
      manual: "manual",
      legacy_fact: "puente legacy",
      correction: "corrección",
    },
  },
  cs: {
    title: "Konečné vazby faktu na hodnotové objekty",
    subtitle: "Zkontroluj sémantické vazby tohoto faktu. Návrhy se nikdy neukládají automaticky.",
    current: "Aktuální koncept",
    none: "Nejsou propojeny žádné hodnotové objekty.",
    semanticTitle: "Dodatečná sémantická kontrola",
    semanticHint: "Používá stávající deterministický rozpoznávač. Každý návrh je nutné výslovně přijmout nebo odmítnout.",
    analyze: "Najít návrhy",
    analyzing: "Analyzuji…",
    suggestions: "Návrhy",
    noSuggestions: "Žádné nové návrhy.",
    accept: "Přijmout",
    reject: "Odmítnout",
    manualTitle: "Ruční vyhledávání",
    manualHint: "Hledá aktivní listové objekty aktuálního profilu a GLOBAL ontologie.",
    search: "Hledat",
    searching: "Hledám…",
    add: "Přidat",
    save: "Uložit konečné vazby",
    saving: "Ukládám…",
    reset: "Obnovit koncept",
    saved: "Konečné vazby byly uloženy.",
    remove: "Odebrat",
    error: "Vazby faktu se nepodařilo aktualizovat.",
    sourceLabels: {
      template: "šablona",
      semantic_review: "sémantická kontrola",
      manual: "ručně",
      legacy_fact: "legacy most",
      correction: "oprava",
    },
  },
};

function getCopy(locale: string) {
  return COPY[locale] ?? COPY.en;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recognitionRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of ["candidates", "matches", "results", "items", "data"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function normalizeRecognition(payload: unknown): RecognitionCandidate[] {
  const result: RecognitionCandidate[] = [];
  const seen = new Set<string>();

  for (const raw of recognitionRows(payload)) {
    const row = asRecord(raw);
    const valueObjectId =
      asString(row.valueObjectId) ??
      asString(row.value_object_id) ??
      asString(row.id);
    if (!valueObjectId || seen.has(valueObjectId)) continue;

    seen.add(valueObjectId);
    result.push({
      valueObjectId,
      title:
        asString(row.title) ??
        asString(row.valueObjectTitle) ??
        asString(row.value_object_title) ??
        asString(row.canonicalKey) ??
        asString(row.canonical_key) ??
        valueObjectId,
      canonicalKey:
        asString(row.canonicalKey) ?? asString(row.canonical_key),
      matchScore:
        asNumber(row.matchScore) ??
        asNumber(row.match_score) ??
        asNumber(row.score),
    });
  }

  return result.slice(0, 12);
}

function canonicalLinks(links: TagLink[]) {
  return links
    .map((link) => ({
      valueObjectId: link.valueObjectId,
      sourceCode: link.sourceCode,
      sourceTemplateProfileId: link.sourceTemplateProfileId,
      confidence: link.confidence,
    }))
    .sort((left, right) =>
      left.valueObjectId.localeCompare(right.valueObjectId),
    );
}

function sameDraft(left: TagLink[], right: TagLink[]) {
  return JSON.stringify(canonicalLinks(left)) === JSON.stringify(canonicalLinks(right));
}

function sourceLabel(sourceCode: string, copy: Copy) {
  return copy.sourceLabels[sourceCode] ?? sourceCode;
}

export function ActivityFactTaggingPanel({
  fact,
  locale,
  onSaved,
}: {
  readonly fact: FactForTagging;
  readonly locale: string;
  readonly onSaved: () => void | Promise<void>;
}) {
  const copy = getCopy(locale);
  const [savedLinks, setSavedLinks] = useState<TagLink[]>([]);
  const [draftLinks, setDraftLinks] = useState<TagLink[]>([]);
  const [suggestions, setSuggestions] = useState<RecognitionCandidate[]>([]);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<SelectorItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "analyzing" | "searching" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const semanticQuery = useMemo(() => {
    return [
      fact.activityTitle,
      fact.semanticObjectKey,
      fact.measureType,
      ...(fact.valueObjects ?? []).map((item) => item.title),
    ]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" · ")
      .slice(0, 180);
  }, [fact.activityTitle, fact.measureType, fact.semanticObjectKey, fact.valueObjects]);

  const isDirty = !sameDraft(savedLinks, draftLinks);
  const draftIds = useMemo(
    () => new Set(draftLinks.map((link) => link.valueObjectId)),
    [draftLinks],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fact.factId) {
        setSavedLinks([]);
        setDraftLinks([]);
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(
          `/api/activity/facts/${encodeURIComponent(fact.factId)}/tagging`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          },
        );
        const json = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          links?: TagLink[];
          error?: string;
        };

        if (!response.ok || json.ok !== true) {
          throw new Error(json.error ?? `${copy.error} HTTP ${response.status}`);
        }

        if (!cancelled) {
          const links = json.links ?? [];
          setSavedLinks(links);
          setDraftLinks(links);
          setSuggestions([]);
          setRejectedIds(new Set());
          setManualResults([]);
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
  }, [copy.error, fact.factId]);

  async function analyze() {
    if (!semanticQuery || status === "analyzing") return;

    setStatus("analyzing");
    setMessage("");

    try {
      const params = new URLSearchParams({
        text: semanticQuery,
        locale,
      });
      const response = await fetch(`/api/value-objects/recognize?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        const record = asRecord(payload);
        throw new Error(asString(record.error) ?? `${copy.error} HTTP ${response.status}`);
      }

      setSuggestions(normalizeRecognition(payload));
      setRejectedIds(new Set());
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  async function searchManual() {
    const query = manualQuery.trim();
    if (!query || status === "searching") return;

    setStatus("searching");
    setMessage("");

    try {
      const params = new URLSearchParams({
        q: query,
        level: "leaf",
        includeGlobal: "1",
        limit: "20",
        locale,
      });
      const response = await fetch(`/api/value-objects/selector?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as {
        valueObjects?: SelectorItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? `${copy.error} HTTP ${response.status}`);
      }

      setManualResults(
        (json.valueObjects ?? []).filter(
          (item) => item.level === "leaf" && item.status === "active",
        ),
      );
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  function addLink(link: TagLink) {
    setDraftLinks((current) => {
      if (current.some((item) => item.valueObjectId === link.valueObjectId)) {
        return current;
      }
      return [...current, link];
    });
  }

  function acceptSuggestion(candidate: RecognitionCandidate) {
    addLink({
      valueObjectId: candidate.valueObjectId,
      title: candidate.title,
      canonicalKey: candidate.canonicalKey,
      sourceCode: "semantic_review",
      sourceTemplateProfileId: null,
      confidence: null,
      isMaterialized: false,
    });
    setRejectedIds((current) => {
      const next = new Set(current);
      next.delete(candidate.valueObjectId);
      return next;
    });
  }

  function rejectSuggestion(valueObjectId: string) {
    setRejectedIds((current) => new Set(current).add(valueObjectId));
  }

  function addManual(item: SelectorItem) {
    addLink({
      valueObjectId: item.id,
      title: item.title,
      canonicalKey: item.canonicalKey,
      sourceCode: "manual",
      sourceTemplateProfileId: null,
      confidence: null,
      isMaterialized: false,
    });
  }

  async function save() {
    if (!fact.factId || status === "saving") return;

    setStatus("saving");
    setMessage("");

    const links = draftLinks.map((link) => ({
      valueObjectId: link.valueObjectId,
      sourceCode:
        link.sourceCode === "legacy_fact" || link.sourceCode === "system" || link.sourceCode === "import"
          ? "manual"
          : link.sourceCode,
      sourceTemplateProfileId:
        link.sourceCode === "template"
          ? link.sourceTemplateProfileId
          : null,
    }));

    try {
      const response = await fetch(
        `/api/activity/facts/${encodeURIComponent(fact.factId)}/tagging`,
        {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ links }),
        },
      );
      const json = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        links?: TagLink[];
        error?: string;
      };

      if (!response.ok || json.ok !== true) {
        throw new Error(json.error ?? `${copy.error} HTTP ${response.status}`);
      }

      const finalLinks = json.links ?? [];
      setSavedLinks(finalLinks);
      setDraftLinks(finalLinks);
      setSuggestions([]);
      setRejectedIds(new Set());
      setManualResults([]);
      setStatus("idle");
      setMessage(copy.saved);
      await onSaved();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.error);
    }
  }

  return (
    <div className="rounded-[22px] border border-blue-100 bg-blue-50/40 p-5 md:col-span-2 xl:col-span-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
            {copy.title}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {copy.subtitle}
          </p>
        </div>
        {message ? (
          <span
            className={[
              "rounded-full border px-3 py-2 text-xs font-black",
              status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {message}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {copy.current}
        </div>
        {draftLinks.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-500">
            {copy.none}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {draftLinks.map((link) => (
              <div
                key={link.valueObjectId}
                className="flex items-center gap-2 rounded-full border border-blue-200 bg-white py-1 pl-3 pr-1 text-xs font-black text-blue-800"
              >
                <span>{link.title}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {sourceLabel(link.sourceCode, copy)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraftLinks((current) =>
                      current.filter(
                        (item) => item.valueObjectId !== link.valueObjectId,
                      ),
                    )
                  }
                  className="rounded-full px-2 py-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  title={copy.remove}
                  aria-label={`${copy.remove}: ${link.title}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-900">{copy.semanticTitle}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {copy.semanticHint}
          </p>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
            {semanticQuery || "—"}
          </div>
          <button
            type="button"
            onClick={analyze}
            disabled={!semanticQuery || status === "analyzing" || status === "saving"}
            className="mt-3 min-h-10 rounded-2xl bg-[#101632] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "analyzing" ? copy.analyzing : copy.analyze}
          </button>

          <div className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {copy.suggestions}
          </div>
          <div className="mt-2 grid gap-2">
            {suggestions.filter(
              (item) =>
                !draftIds.has(item.valueObjectId) &&
                !rejectedIds.has(item.valueObjectId),
            ).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-3 text-xs font-bold text-slate-500">
                {copy.noSuggestions}
              </div>
            ) : (
              suggestions
                .filter(
                  (item) =>
                    !draftIds.has(item.valueObjectId) &&
                    !rejectedIds.has(item.valueObjectId),
                )
                .map((candidate) => (
                  <div
                    key={candidate.valueObjectId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-slate-900">{candidate.title}</div>
                      <div className="mt-1 break-words font-mono text-[10px] text-slate-500">
                        {candidate.canonicalKey ?? candidate.valueObjectId}
                        {candidate.matchScore !== null
                          ? ` · score ${candidate.matchScore}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => acceptSuggestion(candidate)}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                      >
                        ✓ {copy.accept}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectSuggestion(candidate.valueObjectId)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                      >
                        × {copy.reject}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-900">{copy.manualTitle}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {copy.manualHint}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={manualQuery}
              onChange={(event) => setManualQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchManual();
                }
              }}
              className="min-h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-300"
            />
            <button
              type="button"
              onClick={searchManual}
              disabled={!manualQuery.trim() || status === "searching" || status === "saving"}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "searching" ? copy.searching : copy.search}
            </button>
          </div>

          <div className="mt-3 grid max-h-72 gap-2 overflow-auto">
            {manualResults.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <div className="font-black text-slate-900">{item.title}</div>
                  <div className="mt-1 break-words text-[10px] font-semibold text-slate-500">
                    {item.pathText || item.canonicalKey || item.id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addManual(item)}
                  disabled={draftIds.has(item.id)}
                  className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-40"
                >
                  + {copy.add}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!isDirty || draftLinks.length === 0 || status === "saving" || status === "loading"}
          className="min-h-11 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "saving" ? copy.saving : copy.save}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraftLinks(savedLinks);
            setMessage("");
          }}
          disabled={!isDirty || status === "saving"}
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 disabled:opacity-40"
        >
          {copy.reset}
        </button>
      </div>
    </div>
  );
}
