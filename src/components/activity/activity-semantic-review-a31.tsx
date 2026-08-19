"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Locale = "ru" | "en" | "pl" | "uk" | "de" | "es" | "cs";

type Measurement = {
  parameterCode: string;
  measureType: string;
  unit: string;
  valueType: "numeric" | "text" | "boolean";
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  rawFragment: string;
};

type Proposal = {
  proposalKind?: "semantic_proposal" | "manual_leaf";
  valueObjectId?: string | null;
  canonicalKey?: string | null;
  title: string;
  pathText?: string;
  searchTerms?: string[];
  facetHint?: string | null;
  isPrimary: boolean;
  lensCode: string;
  relationMode: "direct" | "higher_level" | "contextual" | "future_use";
  rationale: string;
  interpretationText: string;
  accepted?: boolean;
  originalValueObjectId?: string | null;
  linkedValueObjectId?: string | null;
  linkedTitle?: string | null;
  linkedCanonicalKey?: string | null;
  linkedPathText?: string | null;
  manual?: boolean;
};

type ReviewPayload = {
  ok?: boolean;
  error?: string;
  activity?: {
    id?: string;
    title?: string | null;
    inputText?: string | null;
    role?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
  };
  draft?: {
    id?: string;
    status?: string;
    measurements?: Measurement[];
    proposals?: Proposal[];
    analysisExecutionId?: string | null;
    modelTier?: string | null;
    modelName?: string | null;
  };
  cached?: boolean;
  providerCalls?: number;
};

type SelectorItem = {
  id: string;
  title: string;
  canonicalKey?: string | null;
  scopeCode?: string | null;
  level?: string;
  pathText?: string;
};

type SelectorResponse = {
  ok?: boolean;
  valueObjects?: SelectorItem[];
  error?: string;
};

const COPY: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    measurements: string;
    semantic: string;
    catalogServerSearch: string;
    unresolvedProposal: string;
    linkedLeaf: string;
    primary: string;
    additional: string;
    direct: string;
    higher: string;
    contextual: string;
    futureUse: string;
    accept: string;
    reject: string;
    replace: string;
    add: string;
    search: string;
    save: string;
    saving: string;
    loading: string;
    noFactsYet: string;
    selected: string;
    cancel: string;
    factsRule: string;
    futureWarning: string;
    saved: string;
  }
> = {
  ru: {
    title: "Разбор активности",
    subtitle:
      "ИИ предлагает смысловые претенденты без доступа к каталогу ЦО/ОН. Нажмите + возле нужного претендента и выберите существующий лист серверным поиском. Факты появятся только после сохранения.",
    measurements: "Что можно измерить из сообщения",
    semantic: "Смысловые претенденты ИИ — выберите для них существующие листовые объекты",
    catalogServerSearch: "Каталог ЦО/ОН не отправлялся модели. Подбор после «+» выполняется серверным поиском без ИИ.",
    unresolvedProposal: "Объект ещё не выбран. Нажмите + и выберите его серверным поиском.",
    linkedLeaf: "Связано с существующим листом",
    primary: "Основной",
    additional: "Дополнительный",
    direct: "прямое значение",
    higher: "более общий смысл",
    contextual: "контекст / последствие",
    futureUse: "возможность использования",
    accept: "Подтвердить",
    reject: "Отклонить",
    replace: "Заменить",
    add: "+ Добавить листовой объект",
    search: "Найти листовой объект…",
    save: "Сохранить разбор и создать факты",
    saving: "Сохраняю факты…",
    loading: "ИИ выполняет один широкий смысловой разбор…",
    noFactsYet: "До сохранения разбора фактов в журнале не создаётся.",
    selected: "Оставлено объектов",
    cancel: "Отмена",
    factsRule:
      "Для каждого оставленного листа будет создан отдельный факт для каждого показателя. process_count=1 создаётся всегда; продолжительность — всегда, если она известна.",
    futureWarning:
      "Такой вариант означает полезную смысловую возможность. Он не утверждает, что событие уже произошло. Если оставить галочку, показатели активности всё равно будут записаны с этим тегом.",
    saved: "Разбор сохранён. Факты созданы.",
  },
  en: {
    title: "Activity review",
    subtitle:
      "AI first finds measurements and diverse semantic perspectives. Facts are created only after Save review.",
    measurements: "Measurements supported by the message",
    semantic: "Leaf objects that may relate to the activity",
    catalogServerSearch: "The Value Object catalog was not sent to the model. After +, matching uses server search without AI.",
    unresolvedProposal: "No object selected yet. Press + and choose one using server search.",
    linkedLeaf: "Linked to existing leaf",
    primary: "Primary",
    additional: "Additional",
    direct: "direct meaning",
    higher: "higher-level meaning",
    contextual: "context / consequence",
    futureUse: "future-use possibility",
    accept: "Accept",
    reject: "Reject",
    replace: "Replace",
    add: "+ Add leaf object",
    search: "Find a leaf object…",
    save: "Save review and create facts",
    saving: "Creating facts…",
    loading: "AI is running one broad semantic review…",
    noFactsYet: "No journal facts are created before the review is saved.",
    selected: "Selected objects",
    cancel: "Cancel",
    factsRule:
      "For every selected leaf, a separate fact is created for every measurement. process_count=1 is always created; duration is always created when known.",
    futureWarning:
      "This is a useful possible use, not a claim that the event occurred. If kept, activity measurements will still be saved with this leaf tag.",
    saved: "Review saved. Facts created.",
  },
  pl: {
    title: "Analiza aktywności",
    subtitle:
      "AI najpierw znajduje pomiary i różne perspektywy znaczeniowe. Fakty powstają dopiero po zapisaniu analizy.",
    measurements: "Pomiary wynikające z wiadomości",
    semantic: "Liście, które mogą dotyczyć aktywności",
    catalogServerSearch: "Katalog obiektów wartości nie został wysłany do modelu. Po naciśnięciu + dopasowanie wykonuje wyszukiwanie serwerowe bez AI.",
    unresolvedProposal: "Nie wybrano jeszcze obiektu. Naciśnij + i wybierz go przez wyszukiwanie serwerowe.",
    linkedLeaf: "Powiązano z istniejącym liściem",
    primary: "Główny",
    additional: "Dodatkowy",
    direct: "znaczenie bezpośrednie",
    higher: "znaczenie ogólniejsze",
    contextual: "kontekst / skutek",
    futureUse: "możliwe przyszłe użycie",
    accept: "Zatwierdź",
    reject: "Odrzuć",
    replace: "Zamień",
    add: "+ Dodaj liść",
    search: "Znajdź liść…",
    save: "Zapisz analizę i utwórz fakty",
    saving: "Tworzę fakty…",
    loading: "AI wykonuje jedną szeroką analizę semantyczną…",
    noFactsYet: "Przed zapisaniem analizy fakty nie są tworzone.",
    selected: "Wybrane obiekty",
    cancel: "Anuluj",
    factsRule:
      "Dla każdego wybranego liścia powstaje osobny fakt dla każdego pomiaru. process_count=1 zawsze; czas trwania zawsze, gdy jest znany.",
    futureWarning:
      "To możliwe użycie, a nie twierdzenie, że wydarzenie zaszło. Pozostawienie go zapisze pomiary aktywności z tym tagiem.",
    saved: "Analiza zapisana. Fakty utworzone.",
  },
  uk: {
    title: "Розбір активності",
    subtitle:
      "ШІ спочатку знаходить вимірювання та різні смислові перспективи. Факти створюються лише після збереження розбору.",
    measurements: "Що можна виміряти з повідомлення",
    semantic: "Листові об’єкти, що можуть стосуватися активності",
    catalogServerSearch: "Каталог ЦО/ОН не надсилався моделі. Після «+» підбір виконується серверним пошуком без ШІ.",
    unresolvedProposal: "Об’єкт ще не вибрано. Натисніть + і виберіть його серверним пошуком.",
    linkedLeaf: "Пов’язано з наявним листом",
    primary: "Основний",
    additional: "Додатковий",
    direct: "пряме значення",
    higher: "загальніший сенс",
    contextual: "контекст / наслідок",
    futureUse: "можливість використання",
    accept: "Підтвердити",
    reject: "Відхилити",
    replace: "Замінити",
    add: "+ Додати листовий об’єкт",
    search: "Знайти листовий об’єкт…",
    save: "Зберегти розбір і створити факти",
    saving: "Створюю факти…",
    loading: "ШІ виконує один широкий смисловий розбір…",
    noFactsYet: "До збереження розбору факти не створюються.",
    selected: "Залишено об’єктів",
    cancel: "Скасувати",
    factsRule:
      "Для кожного вибраного листа створюється окремий факт для кожного показника. process_count=1 завжди; тривалість — якщо відома.",
    futureWarning:
      "Це корислива можливість, а не твердження, що подія вже сталася. Якщо залишити, показники буде записано з цим тегом.",
    saved: "Розбір збережено. Факти створено.",
  },
  de: {
    title: "Aktivitätsanalyse",
    subtitle:
      "Die KI findet zuerst Messwerte und verschiedene Bedeutungs-Perspektiven. Fakten entstehen erst nach dem Speichern.",
    measurements: "Messwerte aus der Nachricht",
    semantic: "Mögliche Blattobjekte",
    catalogServerSearch: "Der Wertobjekt-Katalog wurde nicht an das Modell gesendet. Nach + erfolgt die Zuordnung per Serversuche ohne KI.",
    unresolvedProposal: "Noch kein Objekt ausgewählt. Drücke + und wähle es über die Serversuche.",
    linkedLeaf: "Mit vorhandenem Blatt verknüpft",
    primary: "Primär",
    additional: "Zusätzlich",
    direct: "direkte Bedeutung",
    higher: "übergeordnete Bedeutung",
    contextual: "Kontext / Folge",
    futureUse: "zukünftige Nutzungsmöglichkeit",
    accept: "Bestätigen",
    reject: "Ablehnen",
    replace: "Ersetzen",
    add: "+ Blatt hinzufügen",
    search: "Blatt suchen…",
    save: "Analyse speichern und Fakten erzeugen",
    saving: "Fakten werden erzeugt…",
    loading: "Die KI führt eine breite semantische Analyse aus…",
    noFactsYet: "Vor dem Speichern werden keine Fakten erzeugt.",
    selected: "Ausgewählte Objekte",
    cancel: "Abbrechen",
    factsRule:
      "Für jedes ausgewählte Blatt entsteht pro Messwert ein eigener Fakt. process_count=1 immer; Dauer immer, wenn bekannt.",
    futureWarning:
      "Dies ist eine mögliche Nutzung, keine Behauptung, dass sie stattgefunden hat. Bei Bestätigung werden Messwerte dennoch mit diesem Tag gespeichert.",
    saved: "Analyse gespeichert. Fakten erzeugt.",
  },
  es: {
    title: "Análisis de actividad",
    subtitle:
      "La IA primero encuentra mediciones y perspectivas semánticas diversas. Los hechos se crean solo al guardar.",
    measurements: "Mediciones de la descripción",
    semantic: "Objetos hoja posiblemente relacionados",
    catalogServerSearch: "El catálogo de objetos de valor no se envió al modelo. Tras +, la selección usa búsqueda del servidor sin IA.",
    unresolvedProposal: "Aún no se ha elegido un objeto. Pulsa + y selecciónalo mediante la búsqueda del servidor.",
    linkedLeaf: "Vinculado a una hoja existente",
    primary: "Principal",
    additional: "Adicional",
    direct: "significado directo",
    higher: "significado más general",
    contextual: "contexto / consecuencia",
    futureUse: "posible uso futuro",
    accept: "Aceptar",
    reject: "Rechazar",
    replace: "Sustituir",
    add: "+ Añadir hoja",
    search: "Buscar hoja…",
    save: "Guardar análisis y crear hechos",
    saving: "Creando hechos…",
    loading: "La IA realiza un análisis semántico amplio…",
    noFactsYet: "No se crean hechos antes de guardar el análisis.",
    selected: "Objetos seleccionados",
    cancel: "Cancelar",
    factsRule:
      "Para cada hoja seleccionada se crea un hecho separado por cada medición. process_count=1 siempre; duración cuando se conoce.",
    futureWarning:
      "Es una posibilidad útil, no una afirmación de que ocurrió. Si se mantiene, las mediciones se guardarán con esta etiqueta.",
    saved: "Análisis guardado. Hechos creados.",
  },
  cs: {
    title: "Rozbor aktivity",
    subtitle:
      "AI nejprve hledá měření a různé významové perspektivy. Fakta vzniknou až po uložení rozboru.",
    measurements: "Měření z popisu",
    semantic: "Listové objekty související s aktivitou",
    catalogServerSearch: "Katalog hodnotových objektů nebyl odeslán modelu. Po + probíhá výběr serverovým hledáním bez AI.",
    unresolvedProposal: "Objekt zatím není vybrán. Stiskněte + a vyberte jej serverovým hledáním.",
    linkedLeaf: "Propojeno s existujícím listem",
    primary: "Hlavní",
    additional: "Doplňkový",
    direct: "přímý význam",
    higher: "obecnější význam",
    contextual: "kontext / důsledek",
    futureUse: "možné budoucí využití",
    accept: "Potvrdit",
    reject: "Odmítnout",
    replace: "Nahradit",
    add: "+ Přidat list",
    search: "Najít list…",
    save: "Uložit rozbor a vytvořit fakta",
    saving: "Vytvářím fakta…",
    loading: "AI provádí jeden široký sémantický rozbor…",
    noFactsYet: "Před uložením rozboru se fakta nevytvářejí.",
    selected: "Vybrané objekty",
    cancel: "Zrušit",
    factsRule:
      "Pro každý vybraný list vznikne samostatný fakt pro každý ukazatel. process_count=1 vždy; trvání vždy, pokud je známé.",
    futureWarning:
      "Jde o možnost využití, nikoli tvrzení, že se událost stala. Pokud zůstane vybraná, měření se uloží s tímto tagem.",
    saved: "Rozbor uložen. Fakta vytvořena.",
  },
};

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  throw new Error("Secure UUID generation is unavailable.");
}

function valueText(measurement: Measurement) {
  if (measurement.valueType === "numeric") {
    return `${measurement.valueNumeric ?? "—"} ${measurement.unit}`;
  }
  if (measurement.valueType === "boolean") {
    return `${String(measurement.valueBoolean)} ${measurement.unit}`;
  }
  return `${measurement.valueText ?? "—"} ${measurement.unit}`;
}


const LOADING_FLOW: Record<
  Locale,
  { title: string; safe: string; steps: [string, string, string, string] }
> = {
  ru: {
    title: "Готовим разбор активности",
    safe: "Запись уже сохранена. Можно покинуть страницу — факты не создаются до вашего подтверждения.",
    steps: ["Проверяем, готов ли фоновый разбор", "ИИ анализирует текст и вложения", "Проверяем структуру результата", "Готовим экран проверки"],
  },
  en: {
    title: "Preparing activity review",
    safe: "The activity is already saved. You can leave this page; facts are not created before your confirmation.",
    steps: ["Checking for a completed background review", "AI is analyzing text and attachments", "Validating the result structure", "Preparing the review screen"],
  },
  pl: {
    title: "Przygotowujemy analizę aktywności",
    safe: "Aktywność jest już zapisana. Możesz opuścić stronę; fakty nie powstaną przed Twoim potwierdzeniem.",
    steps: ["Sprawdzamy, czy analiza w tle jest już gotowa", "AI analizuje tekst i załączniki", "Sprawdzamy strukturę wyniku", "Przygotowujemy ekran weryfikacji"],
  },
  uk: {
    title: "Готуємо розбір активності",
    safe: "Активність уже збережена. Можна залишити сторінку — факти не створюються до вашого підтвердження.",
    steps: ["Перевіряємо, чи готовий фоновий розбір", "ШІ аналізує текст і вкладення", "Перевіряємо структуру результату", "Готуємо екран перевірки"],
  },
  de: {
    title: "Aktivitätsanalyse wird vorbereitet",
    safe: "Die Aktivität ist bereits gespeichert. Sie können die Seite verlassen; Fakten entstehen erst nach Ihrer Bestätigung.",
    steps: ["Prüfen, ob die Hintergrundanalyse fertig ist", "KI analysiert Text und Anhänge", "Ergebnisstruktur wird geprüft", "Prüfansicht wird vorbereitet"],
  },
  es: {
    title: "Preparando el análisis de actividad",
    safe: "La actividad ya está guardada. Puedes salir de la página; no se crean hechos antes de tu confirmación.",
    steps: ["Comprobamos si el análisis en segundo plano ya está listo", "La IA analiza texto y adjuntos", "Validamos la estructura del resultado", "Preparamos la pantalla de revisión"],
  },
  cs: {
    title: "Připravujeme analýzu aktivity",
    safe: "Aktivita je už uložena. Stránku můžete opustit; fakta nevzniknou před vaším potvrzením.",
    steps: ["Kontrolujeme, zda je analýza na pozadí hotová", "AI analyzuje text a přílohy", "Kontrolujeme strukturu výsledku", "Připravujeme obrazovku kontroly"],
  },
};

function relationLabel(
  relationMode: Proposal["relationMode"],
  copy: (typeof COPY)[Locale],
) {
  if (relationMode === "direct") return copy.direct;
  if (relationMode === "higher_level") return copy.higher;
  if (relationMode === "future_use") return copy.futureUse;
  return copy.contextual;
}

function LeafSearch({
  locale,
  initialQuery,
  excludeIds,
  onChoose,
  onCancel,
}: {
  readonly locale: Locale;
  readonly initialQuery: string;
  readonly excludeIds: Set<string>;
  readonly onChoose: (item: SelectorItem) => void;
  readonly onCancel: () => void;
}) {
  const copy = COPY[locale];
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SelectorItem[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          level: "leaf",
          limit: "40",
          includeGlobal: "1",
          locale,
        });

        const response = await fetch(
          `/api/value-objects/selector?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );

        const payload =
          (await response.json().catch(() => null)) as SelectorResponse | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(
            payload?.error || `Leaf search failed: ${response.status}`,
          );
        }

        setResults(
          (payload.valueObjects ?? []).filter(
            (item) =>
              item.level === "leaf" && !excludeIds.has(item.id),
          ),
        );
        setResultsQuery(normalizedQuery);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error ? caught.message : "Leaf search failed.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [excludeIds, locale, query]);

  const visibleResults =
    resultsQuery === query.trim() && query.trim().length >= 2
      ? results
      : [];

  return (
    <div className="mt-3 rounded-2xl border border-blue-900 bg-blue-950/20 p-3">
      <input
        autoFocus
        className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
        placeholder={copy.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading ? (
        <p className="mt-2 text-xs text-zinc-500">…</p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      ) : null}

      {visibleResults.length > 0 ? (
        <div className="mt-2 max-h-64 space-y-1 overflow-auto">
          {visibleResults.map((item) => (
            <button
              type="button"
              key={item.id}
              className="block w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-left hover:border-blue-700"
              onClick={() => onChoose(item)}
            >
              <span className="block text-sm font-semibold text-zinc-100">
                {item.title}
              </span>
              <span className="block text-xs text-zinc-500">
                {item.pathText || item.canonicalKey || item.id}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        onClick={onCancel}
      >
        {copy.cancel}
      </button>
    </div>
  );
}

export function ActivitySemanticReviewA31({
  activityEventId,
  locale,
}: {
  readonly activityEventId: string;
  readonly locale: Locale;
}) {
  const router = useRouter();
  const copy = COPY[locale];
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const idempotencyRef = useRef(uuid());

  useEffect(() => {
    let cancelled = false;
    const stageTimers = [
      window.setTimeout(() => !cancelled && setLoadingStage(0), 0),
      window.setTimeout(() => !cancelled && setLoadingStage(1), 650),
      window.setTimeout(() => !cancelled && setLoadingStage(2), 3200),
      window.setTimeout(() => !cancelled && setLoadingStage(3), 6500),
    ];

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/activity/review-analysis", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            activityEventId,
            locale,
            timeZone,
          }),
        });

        const next =
          (await response.json().catch(() => null)) as ReviewPayload | null;

        if (!response.ok || next?.ok !== true || !next.draft?.id) {
          throw new Error(
            next?.error || `Semantic review failed: ${response.status}`,
          );
        }

        if (cancelled) return;

        const nextProposals = (next.draft.proposals ?? []).map(
          (proposal) => {
            const existingLeafId =
              proposal.proposalKind === "semantic_proposal"
                ? null
                : proposal.valueObjectId || null;
            return {
              ...proposal,
              accepted: true,
              originalValueObjectId: existingLeafId,
              linkedValueObjectId: existingLeafId,
              linkedTitle: existingLeafId ? proposal.title : null,
              linkedCanonicalKey: existingLeafId
                ? proposal.canonicalKey ?? null
                : null,
              linkedPathText: existingLeafId
                ? proposal.pathText ?? proposal.title
                : null,
            };
          },
        );

        setPayload(next);
        setProposals(nextProposals);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Semantic review failed.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      stageTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [activityEventId, locale, timeZone]);

  const selectedLeafIds = useMemo(
    () =>
      Array.from(
        new Set(
          proposals
            .filter(
              (proposal) =>
                proposal.accepted !== false && proposal.linkedValueObjectId,
            )
            .map((proposal) => proposal.linkedValueObjectId as string),
        ),
      ),
    [proposals],
  );

  const acceptedPrimary = useMemo(
    () =>
      proposals.find(
        (proposal) =>
          proposal.isPrimary &&
          proposal.accepted !== false &&
          Boolean(proposal.linkedValueObjectId),
      ) ?? null,
    [proposals],
  );

  const excludedIds = useMemo(
    () =>
      new Set(
        proposals
          .map((proposal) => proposal.linkedValueObjectId)
          .filter((value): value is string => Boolean(value)),
      ),
    [proposals],
  );

  function replaceProposal(index: number, item: SelectorItem) {
    setProposals((current) =>
      current.map((proposal, proposalIndex) =>
        proposalIndex === index
          ? {
              ...proposal,
              linkedValueObjectId: item.id,
              linkedTitle: item.title,
              linkedCanonicalKey: item.canonicalKey ?? null,
              linkedPathText: item.pathText ?? item.title,
              accepted: true,
            }
          : proposal,
      ),
    );
    setReplaceIndex(null);
  }

  function addProposal(item: SelectorItem) {
    setProposals((current) => [
      ...current,
      {
        proposalKind: "manual_leaf",
        valueObjectId: item.id,
        title: item.title,
        canonicalKey: item.canonicalKey ?? null,
        pathText: item.pathText ?? item.title,
        linkedValueObjectId: item.id,
        linkedTitle: item.title,
        linkedCanonicalKey: item.canonicalKey ?? null,
        linkedPathText: item.pathText ?? item.title,
        isPrimary: false,
        lensCode: "manual_add",
        relationMode: "direct",
        rationale: "Added by the user during semantic review.",
        interpretationText: item.title,
        accepted: true,
        originalValueObjectId: null,
        manual: true,
      },
    ]);
    setAdding(false);
  }

  async function save() {
    const draftId = payload?.draft?.id;

    if (
      !draftId ||
      selectedLeafIds.length < 1 ||
      !acceptedPrimary ||
      saving
    ) {
      if (selectedLeafIds.length < 1) {
        setError("Select at least one leaf object.");
      } else if (!acceptedPrimary) {
        setError(
          "The primary leaf must remain selected or be replaced before saving.",
        );
      }
      return;
    }

    const primary = acceptedPrimary;
    const primaryLeafId = primary?.linkedValueObjectId ?? null;
    const primaryCorrection =
      primary &&
      primary.originalValueObjectId &&
      primaryLeafId &&
      primary.originalValueObjectId !== primaryLeafId
        ? {
            originalValueObjectId: primary.originalValueObjectId,
            correctedValueObjectId: primaryLeafId,
          }
        : {};

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/activity/review-commit", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          activityEventId,
          reviewDraftId: draftId,
          idempotencyKey: idempotencyRef.current,
          selectedLeafIds,
          primaryLeafId,
          primaryCorrection,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            factCount?: number;
            selectedLeafCount?: number;
          }
        | null;

      if (!response.ok || result?.ok !== true) {
        throw new Error(
          result?.error || `Review commit failed: ${response.status}`,
        );
      }

      setMessage(
        `${copy.saved} ${result.factCount ?? 0} facts / ${
          result.selectedLeafCount ?? selectedLeafIds.length
        } leafs.`,
      );

      window.setTimeout(() => {
        router.push(`/activity-review?locale=${locale}`);
      }, 900);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Review commit failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    const flow = LOADING_FLOW[locale];
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="overflow-hidden rounded-3xl border border-emerald-900/80 bg-zinc-900/80 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="h-1 bg-zinc-800">
              <div
                className="h-full bg-emerald-400 transition-[width] duration-700 ease-out"
                style={{ width: `${25 + loadingStage * 25}%` }}
              />
            </div>
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">ARCTor · AI-A3.1</p>
                  <h1 className="mt-2 text-xl font-bold md:text-2xl">{flow.title}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{flow.safe}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-900 bg-black/40 px-3 py-1.5 text-xs text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  {copy.loading}
                </div>
              </div>

              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {flow.steps.map((step, index) => {
                  const done = index < loadingStage;
                  const active = index === loadingStage;
                  return (
                    <div
                      key={step}
                      className={active
                        ? "flex items-center gap-3 rounded-2xl border border-emerald-800 bg-emerald-950/20 px-4 py-3"
                        : "flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3"}
                    >
                      <span className={done
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black"
                        : active
                          ? "flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500 text-xs font-bold text-emerald-300"
                          : "flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-600"}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <span className={active ? "text-sm font-medium text-zinc-100" : "text-sm text-zinc-500"}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-amber-300">{copy.noFactsYet}</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="mt-4 h-9 animate-pulse rounded-xl bg-zinc-900" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-zinc-800/70" />
              </div>
            ))}
          </section>
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-900 bg-zinc-900/70 p-6">
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="mt-3 text-sm text-red-400">{error}</p>
        </div>
      </main>
    );
  }

  const measurements = payload?.draft?.measurements ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            ARCTor · AI-A3.1
          </p>
          <h1 className="mt-2 text-3xl font-bold">{copy.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
            {copy.subtitle}
          </p>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/50 p-4 text-base">
            {payload?.activity?.inputText || payload?.activity?.title || "—"}
          </div>
          <p className="mt-3 text-xs text-amber-300">{copy.noFactsYet}</p>
        </header>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-bold">{copy.measurements}</h2>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-700 bg-black px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                started_at
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {payload?.activity?.startedAt ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-black px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                ended_at
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {payload?.activity?.endedAt ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-black px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                duration
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {payload?.activity?.durationMinutes ?? "—"} minute
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {measurements.map((measurement, index) => (
              <div
                key={`${measurement.parameterCode}-${index}`}
                className="rounded-xl border border-zinc-700 bg-black px-3 py-2"
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  {measurement.parameterCode}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {valueText(measurement)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  {measurement.rawFragment}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-900 bg-zinc-900/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{copy.semantic}</h2>
              <p className="mt-1 text-xs text-zinc-400">
                {copy.catalogServerSearch}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {copy.selected}: {selectedLeafIds.length} / {proposals.length}
              </p>
            </div>
            <div className="rounded-full border border-emerald-800 px-3 py-1 text-xs text-emerald-300">
              {payload?.draft?.modelTier ?? "AI"} ·{" "}
              {payload?.draft?.modelName ?? ""}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {proposals.map((proposal, index) => {
              const accepted = proposal.accepted !== false;

              return (
                <article
                  key={`${proposal.proposalKind ?? "legacy"}-${proposal.title}-${index}`}
                  className={`rounded-2xl border p-4 ${
                    accepted
                      ? "border-emerald-800 bg-emerald-950/10"
                      : "border-zinc-800 bg-black/30 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            proposal.isPrimary
                              ? "bg-blue-500 text-black"
                              : "border border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {proposal.isPrimary
                            ? copy.primary
                            : copy.additional}
                        </span>
                        <span className="rounded-full border border-violet-800 px-2 py-1 text-[10px] text-violet-300">
                          {relationLabel(proposal.relationMode, copy)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                          {proposal.lensCode}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-zinc-100">
                        {proposal.title}
                      </h3>
                      {proposal.linkedValueObjectId ? (
                        <div className="mt-2 rounded-xl border border-emerald-800 bg-emerald-950/20 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                            {copy.linkedLeaf}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-100">
                            {proposal.linkedTitle}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {proposal.linkedPathText}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-amber-300">
                          {copy.unresolvedProposal}
                        </p>
                      )}
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {proposal.interpretationText}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {proposal.rationale}
                      </p>

                      {proposal.relationMode === "future_use" ? (
                        <p className="mt-2 rounded-xl border border-amber-900 bg-amber-950/20 p-2 text-xs leading-5 text-amber-300">
                          {copy.futureWarning}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        title={copy.accept}
                        className={`h-9 w-9 rounded-full border text-sm ${
                          accepted
                            ? "border-emerald-500 text-emerald-300"
                            : "border-zinc-700 text-zinc-600"
                        }`}
                        onClick={() =>
                          setProposals((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, accepted: true }
                                : item,
                            ),
                          )
                        }
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        title={copy.reject}
                        className="h-9 w-9 rounded-full border border-red-900 text-red-400"
                        onClick={() =>
                          setProposals((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, accepted: false }
                                : item,
                            ),
                          )
                        }
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        title={
                          proposal.linkedValueObjectId ? copy.replace : copy.add
                        }
                        className="h-9 w-9 rounded-full border border-blue-900 text-blue-300"
                        onClick={() => {
                          setReplaceIndex(index);
                          setAdding(false);
                        }}
                      >
                        {proposal.linkedValueObjectId ? "✎" : "+"}
                      </button>
                    </div>
                  </div>

                  {replaceIndex === index ? (
                    <LeafSearch
                      locale={locale}
                      initialQuery={
                        proposal.searchTerms?.[0] || proposal.title
                      }
                      excludeIds={excludedIds}
                      onChoose={(item) => replaceProposal(index, item)}
                      onCancel={() => setReplaceIndex(null)}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              type="button"
              className="rounded-xl border border-blue-800 bg-blue-950/20 px-4 py-2 text-sm font-semibold text-blue-300"
              onClick={() => {
                setAdding((current) => !current);
                setReplaceIndex(null);
              }}
            >
              {copy.add}
            </button>

            {adding ? (
              <LeafSearch
                locale={locale}
                initialQuery=""
                excludeIds={excludedIds}
                onChoose={addProposal}
                onCancel={() => setAdding(false)}
              />
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-900 bg-blue-950/10 p-5">
          <p className="text-sm leading-6 text-blue-200">{copy.factsRule}</p>

          {error ? (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          ) : null}

          {message ? (
            <p className="mt-3 text-sm text-emerald-300">{message}</p>
          ) : null}

          <button
            type="button"
            disabled={
              saving ||
              selectedLeafIds.length < 1 ||
              !acceptedPrimary
            }
            className="mt-4 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50"
            onClick={() => void save()}
          >
            {saving ? copy.saving : copy.save}
          </button>
        </section>
      </div>
    </main>
  );
}
