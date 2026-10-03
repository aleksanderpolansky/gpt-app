"use client";

import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LocaleCode = "ru" | "pl" | "en" | "es" | "uk" | "de" | "cs";

type RootOption = {
  id: string;
  title: string | null;
  description: string | null;
  parentValueObjectId: string | null;
  parentTitle: string | null;
};

type ProjectItem = {
  id: string;
  title: string;
  description: string | null;
  projectModeCode: string;
  statusCode: string;
  timezone: string;
  currencyCode: string | null;
  createdAt: string;
  updatedAt: string;
  rootValueObject: {
    id: string;
    title: string | null;
    parentValueObjectId: string | null;
  };
};

type ProjectsPayload = {
  ok?: boolean;
  projects?: ProjectItem[];
  eligibleRoots?: RootOption[];
  error?: string;
};

type Copy = {
  pageTitle: string;
  pageSubtitle: string;
  newProject: string;
  chooseProject: string;
  loading: string;
  loadError: string;
  createTitle: string;
  createSubtitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  rootLabel: string;
  rootHelp: string;
  rootPlaceholder: string;
  noRootsTitle: string;
  noRootsText: string;
  openElements: string;
  modeLabel: string;
  finite: string;
  finiteHelp: string;
  continuous: string;
  continuousHelp: string;
  currencyLabel: string;
  timezoneLabel: string;
  create: string;
  creating: string;
  projectMap: string;
  projectMapHelp: string;
  linkedElement: string;
  goalTitle: string;
  goalText: string;
  goalExample: string;
  resourcesTitle: string;
  resourcesText: string;
  resourcesExample: string;
  actionsTitle: string;
  actionsText: string;
  actionsExample: string;
  timeTitle: string;
  timeText: string;
  timeExample: string;
  risksTitle: string;
  risksText: string;
  risksExample: string;
  sourcesTitle: string;
  sourcesText: string;
  sourcesExample: string;
  notReviewed: string;
  nextStep: string;
  explain: string;
  hide: string;
  draft: string;
  finiteBadge: string;
  continuousBadge: string;
  mapNotice: string;
};

const EN: Copy = {
  pageTitle: "Projects",
  pageSubtitle:
    "A project map makes the result, required conditions, actions, time, risks and information sources visible without forcing professional PM terminology.",
  newProject: "New project",
  chooseProject: "Choose project",
  loading: "Loading projects…",
  loadError: "Could not load projects.",
  createTitle: "Create the project foundation",
  createSubtitle:
    "Start with a few fields. The remaining areas can be considered in any order — there is no long mandatory wizard.",
  titleLabel: "Project name",
  titlePlaceholder: "For example: German B2",
  descriptionLabel: "What do you want to accomplish?",
  descriptionPlaceholder: "Briefly describe the result or change you want to reach.",
  rootLabel: "Which personal element becomes the project?",
  rootHelp:
    "Inside ARCTor this is a private observation element. Here it is presented simply as the project’s linked element.",
  rootPlaceholder: "Choose a personal element…",
  noRootsTitle: "No suitable personal element yet",
  noRootsText:
    "The first project requires an active private leaf element. Create one in Elements and return here.",
  openElements: "Open elements",
  modeLabel: "Project type",
  finite: "Has a final result",
  finiteHelp: "The project should reach a defined state and finish.",
  continuous: "Ongoing area",
  continuousHelp: "A state is maintained regularly without a mandatory end date.",
  currencyLabel: "Currency (optional)",
  timezoneLabel: "Time zone",
  create: "Create project",
  creating: "Creating…",
  projectMap: "Project map",
  projectMapHelp:
    "This is not a completion percentage. The map shows which semantic areas are worth considering while planning.",
  linkedElement: "Linked element",
  goalTitle: "Where to arrive",
  goalText: "What should success look like? Goals, requirements and checkpoints live here.",
  goalExample: "Example: B2 achieved, exam passed.",
  resourcesTitle: "What will be needed",
  resourcesText: "People, time, money, materials, tools, places and other required conditions.",
  resourcesExample: "Example: teacher, 5 h/week, textbook.",
  actionsTitle: "What needs to be done",
  actionsText: "Stages, concrete actions, routines and dependencies between them.",
  actionsExample: "Example: grammar → exercises → test.",
  timeTitle: "Time and control",
  timeText: "Deadlines, calendar, recurrence and points for checking project state.",
  timeExample: "Example: mock test on March 1.",
  risksTitle: "What may block it",
  risksText: "Critical constraints and shortages that can make the next step impossible.",
  risksExample: "Example: no time or an unavailable key resource.",
  sourcesTitle: "Sources and knowledge",
  sourcesText: "Documents, internal data, websites, AI channels and recommendations.",
  sourcesExample: "Example: exam program, teacher guidance.",
  notReviewed: "Not reviewed yet",
  nextStep: "Add — next step",
  explain: "Why it matters",
  hide: "Hide explanation",
  draft: "Draft",
  finiteBadge: "Finite",
  continuousBadge: "Ongoing",
  mapNotice:
    "PP2A creates a real project and its starting map. Editing the semantic blocks will be wired next on top of the PP1 graph.",
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: {
    ...EN,
    pageTitle: "Проекты",
    pageSubtitle:
      "Карта проекта сразу показывает результат, необходимые условия, действия, время, риски и источники информации — без сложной терминологии проектного управления.",
    newProject: "Новый проект",
    chooseProject: "Выберите проект",
    loading: "Загружаю проекты…",
    loadError: "Не удалось загрузить проекты.",
    createTitle: "Создайте основу проекта",
    createSubtitle:
      "Начните с нескольких полей. Остальные области можно рассматривать в любом порядке — длинного обязательного мастера нет.",
    titleLabel: "Название проекта",
    titlePlaceholder: "Например: Немецкий B2",
    descriptionLabel: "Что вы хотите осуществить?",
    descriptionPlaceholder:
      "Коротко опишите результат или изменение, к которому хотите прийти.",
    rootLabel: "Какой ваш элемент становится проектом?",
    rootHelp:
      "Внутри ARCTor это личный элемент наблюдения. Здесь мы называем его просто связанным элементом проекта.",
    rootPlaceholder: "Выберите личный элемент…",
    noRootsTitle: "Пока нет подходящего личного элемента",
    noRootsText:
      "Для первого проекта нужен активный личный листовой элемент. Создайте его в разделе элементов, затем вернитесь сюда.",
    openElements: "Открыть элементы",
    modeLabel: "Тип проекта",
    finite: "Есть конечный результат",
    finiteHelp: "Проект должен прийти к определённому состоянию и завершиться.",
    continuous: "Постоянное направление",
    continuousHelp: "Состояние нужно поддерживать регулярно без обязательной конечной даты.",
    currencyLabel: "Валюта (необязательно)",
    timezoneLabel: "Часовой пояс",
    create: "Создать проект",
    creating: "Создаю…",
    projectMap: "Карта проекта",
    projectMapHelp:
      "Это не процент готовности проекта. Карта показывает смысловые области, которые стоит рассмотреть при планировании.",
    linkedElement: "Связанный элемент",
    goalTitle: "К чему прийти",
    goalText: "Как должно выглядеть успешное состояние? Здесь будут цели, требования и контрольные точки.",
    goalExample: "Например: B2 достигнут, экзамен сдан.",
    resourcesTitle: "Что понадобится",
    resourcesText: "Люди, время, деньги, материалы, инструменты, места и другие необходимые условия.",
    resourcesExample: "Например: преподаватель, 5 ч/нед., учебник.",
    actionsTitle: "Что нужно делать",
    actionsText: "Этапы, конкретные действия, повторяющиеся дела и зависимости между ними.",
    actionsExample: "Например: грамматика → упражнения → тест.",
    timeTitle: "Время и контроль",
    timeText: "Сроки, календарь, регулярность и точки проверки состояния проекта.",
    timeExample: "Например: пробный тест 1 марта.",
    risksTitle: "Что может помешать",
    risksText: "Критические ограничения и дефициты, из-за которых следующий шаг может стать невозможным.",
    risksExample: "Например: нет времени или недоступен ключевой ресурс.",
    sourcesTitle: "Источники и знания",
    sourcesText: "Документы, внутренние данные, сайты, AI-каналы и рекомендации, на которые стоит опираться.",
    sourcesExample: "Например: программа экзамена, рекомендации преподавателя.",
    notReviewed: "Ещё не рассмотрено",
    nextStep: "Добавить — следующий шаг",
    explain: "Зачем это",
    hide: "Скрыть пояснение",
    draft: "Черновик",
    finiteBadge: "Конечный",
    continuousBadge: "Постоянный",
    mapNotice:
      "PP2A создаёт реальный проект и его стартовую карту. Наполнение смысловых блоков будет подключено следующим пакетом поверх PP1-графа.",
  },
  uk: {
    ...EN,
    pageTitle: "Проєкти",
    pageSubtitle:
      "Карта проєкту одразу показує результат, потрібні умови, дії, час, ризики та джерела інформації — без складної термінології.",
    newProject: "Новий проєкт",
    chooseProject: "Оберіть проєкт",
    loading: "Завантажую проєкти…",
    loadError: "Не вдалося завантажити проєкти.",
    createTitle: "Створіть основу проєкту",
    createSubtitle:
      "Почніть із кількох полів. Інші області можна розглядати в будь-якому порядку — довгого обов’язкового майстра немає.",
    titleLabel: "Назва проєкту",
    titlePlaceholder: "Наприклад: Німецька B2",
    descriptionLabel: "Що ви хочете здійснити?",
    descriptionPlaceholder: "Коротко опишіть результат або зміну, до якої хочете прийти.",
    rootLabel: "Який ваш елемент стає проєктом?",
    rootHelp:
      "Усередині ARCTor це особистий елемент спостереження. Тут ми називаємо його пов’язаним елементом проєкту.",
    rootPlaceholder: "Оберіть особистий елемент…",
    noRootsTitle: "Поки немає відповідного особистого елемента",
    noRootsText:
      "Для першого проєкту потрібен активний особистий листовий елемент. Створіть його в розділі елементів і поверніться сюди.",
    openElements: "Відкрити елементи",
    modeLabel: "Тип проєкту",
    finite: "Є кінцевий результат",
    finiteHelp: "Проєкт має прийти до визначеного стану та завершитися.",
    continuous: "Постійний напрям",
    continuousHelp: "Стан потрібно підтримувати регулярно без обов’язкової кінцевої дати.",
    currencyLabel: "Валюта (необов’язково)",
    timezoneLabel: "Часовий пояс",
    create: "Створити проєкт",
    creating: "Створюю…",
    projectMap: "Карта проєкту",
    projectMapHelp: "Це не відсоток готовності. Карта показує смислові області для планування.",
    linkedElement: "Пов’язаний елемент",
    goalTitle: "До чого прийти",
    goalText: "Яким має бути успішний стан? Тут будуть цілі, вимоги та контрольні точки.",
    goalExample: "Наприклад: B2 досягнуто, іспит складено.",
    resourcesTitle: "Що знадобиться",
    resourcesText: "Люди, час, гроші, матеріали, інструменти, місця та інші умови.",
    resourcesExample: "Наприклад: викладач, 5 год/тиж., підручник.",
    actionsTitle: "Що потрібно робити",
    actionsText: "Етапи, конкретні дії, повторювані справи та залежності.",
    actionsExample: "Наприклад: граматика → вправи → тест.",
    timeTitle: "Час і контроль",
    timeText: "Строки, календар, регулярність і точки перевірки стану проєкту.",
    timeExample: "Наприклад: пробний тест 1 березня.",
    risksTitle: "Що може завадити",
    risksText: "Критичні обмеження та дефіцити, через які наступний крок може стати неможливим.",
    risksExample: "Наприклад: немає часу або недоступний ключовий ресурс.",
    sourcesTitle: "Джерела та знання",
    sourcesText: "Документи, внутрішні дані, сайти, AI-канали та рекомендації.",
    sourcesExample: "Наприклад: програма іспиту, поради викладача.",
    notReviewed: "Ще не розглянуто",
    nextStep: "Додати — наступний крок",
    explain: "Навіщо це",
    hide: "Сховати пояснення",
    draft: "Чернетка",
    finiteBadge: "Кінцевий",
    continuousBadge: "Постійний",
    mapNotice:
      "PP2A створює реальний проєкт і його стартову карту. Наповнення блоків буде підключене наступним пакетом.",
  },
  pl: {
    ...EN,
    pageTitle: "Projekty",
    pageSubtitle:
      "Mapa projektu od razu pokazuje rezultat, potrzebne warunki, działania, czas, ryzyka i źródła informacji — bez trudnej terminologii.",
    newProject: "Nowy projekt",
    chooseProject: "Wybierz projekt",
    loading: "Ładowanie projektów…",
    loadError: "Nie udało się załadować projektów.",
    createTitle: "Utwórz podstawę projektu",
    createSubtitle:
      "Zacznij od kilku pól. Pozostałe obszary można rozpatrywać w dowolnej kolejności — bez długiego kreatora.",
    titleLabel: "Nazwa projektu",
    titlePlaceholder: "Np. Niemiecki B2",
    descriptionLabel: "Co chcesz zrealizować?",
    descriptionPlaceholder: "Krótko opisz rezultat lub zmianę, do której dążysz.",
    rootLabel: "Który Twój element staje się projektem?",
    rootHelp: "Wewnątrz ARCTor jest to prywatny element obserwacji; tutaj pokazujemy go jako element projektu.",
    rootPlaceholder: "Wybierz prywatny element…",
    noRootsTitle: "Brak odpowiedniego prywatnego elementu",
    noRootsText: "Pierwszy projekt wymaga aktywnego prywatnego elementu liściowego.",
    openElements: "Otwórz elementy",
    modeLabel: "Typ projektu",
    finite: "Ma wynik końcowy",
    finiteHelp: "Projekt powinien osiągnąć określony stan i się zakończyć.",
    continuous: "Stały obszar",
    continuousHelp: "Stan jest utrzymywany regularnie bez obowiązkowej daty końcowej.",
    currencyLabel: "Waluta (opcjonalnie)",
    timezoneLabel: "Strefa czasowa",
    create: "Utwórz projekt",
    creating: "Tworzenie…",
    projectMap: "Mapa projektu",
    projectMapHelp: "To nie jest procent ukończenia. Mapa pokazuje obszary warte rozważenia.",
    linkedElement: "Powiązany element",
    goalTitle: "Do czego dojść",
    goalText: "Jak wygląda sukces? Tutaj znajdą się cele, wymagania i punkty kontrolne.",
    goalExample: "Np. osiągnięty B2, zdany egzamin.",
    resourcesTitle: "Co będzie potrzebne",
    resourcesText: "Ludzie, czas, pieniądze, materiały, narzędzia, miejsca i inne warunki.",
    resourcesExample: "Np. nauczyciel, 5 godz./tydz., podręcznik.",
    actionsTitle: "Co trzeba robić",
    actionsText: "Etapy, konkretne działania, rutyny i zależności.",
    actionsExample: "Np. gramatyka → ćwiczenia → test.",
    timeTitle: "Czas i kontrola",
    timeText: "Terminy, kalendarz, regularność i punkty kontroli.",
    timeExample: "Np. test próbny 1 marca.",
    risksTitle: "Co może przeszkodzić",
    risksText: "Krytyczne ograniczenia i braki, które mogą zablokować następny krok.",
    risksExample: "Np. brak czasu albo niedostępny kluczowy zasób.",
    sourcesTitle: "Źródła i wiedza",
    sourcesText: "Dokumenty, dane wewnętrzne, strony, kanały AI i rekomendacje.",
    sourcesExample: "Np. program egzaminu, zalecenia nauczyciela.",
    notReviewed: "Jeszcze nierozpatrzone",
    nextStep: "Dodaj — następny krok",
    explain: "Po co to",
    hide: "Ukryj wyjaśnienie",
    draft: "Szkic",
    finiteBadge: "Końcowy",
    continuousBadge: "Stały",
    mapNotice: "PP2A tworzy rzeczywisty projekt i jego mapę startową; edycja bloków zostanie podłączona później.",
  },
  de: { ...EN, pageTitle: "Projekte", newProject: "Neues Projekt", chooseProject: "Projekt wählen", create: "Projekt erstellen", projectMap: "Projektkarte" },
  es: { ...EN, pageTitle: "Proyectos", newProject: "Nuevo proyecto", chooseProject: "Elegir proyecto", create: "Crear proyecto", projectMap: "Mapa del proyecto" },
  cs: { ...EN, pageTitle: "Projekty", newProject: "Nový projekt", chooseProject: "Vybrat projekt", create: "Vytvořit projekt", projectMap: "Mapa projektu" },
};

function normalizeLocale(value: string): LocaleCode {
  const locale = value.trim().toLowerCase();
  return ["ru", "pl", "en", "es", "uk", "de", "cs"].includes(locale)
    ? (locale as LocaleCode)
    : "en";
}

function localeHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

function SectionCard({
  tone,
  title,
  text,
  example,
  icon: Icon,
  copy,
}: {
  tone: "blue" | "violet" | "amber" | "green" | "rose" | "sky";
  title: string;
  text: string;
  example: string;
  icon: LucideIcon;
  copy: Copy;
}) {
  const [expanded, setExpanded] = useState(false);
  const toneClass = {
    blue: "border-[#cfdcff] bg-[#f7f9ff]",
    violet: "border-[#ddd4ff] bg-[#faf8ff]",
    amber: "border-[#f5ddb0] bg-[#fffaf0]",
    green: "border-[#cdebd6] bg-[#f5fbf7]",
    rose: "border-[#f3cbd5] bg-[#fff7f9]",
    sky: "border-[#cde6f4] bg-[#f6fbfe]",
  }[tone];

  return (
    <section className={`min-h-[190px] rounded-[22px] border p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white text-[#4f6ed8] shadow-sm">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-extrabold tracking-[0.02em] text-[#252a3f]">{title}</h2>
          <div className="mt-1 inline-flex rounded-full border border-[#f3b6c4] bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#d94d6a]">
            {copy.notReviewed}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-5 text-[#6f748b]">{text}</p>
      {expanded ? (
        <div className="mt-3 rounded-xl border border-white/90 bg-white/70 px-3 py-2.5 text-[11px] leading-5 text-[#6f748b]">
          {example}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled title={copy.nextStep}
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-[#d8def0] bg-white/70 px-3 py-2 text-[11px] font-bold text-[#a1a6b8]">
          <Plus size={13} />
          {copy.nextStep}
        </button>
        <button type="button" onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold text-[#6271a3] transition hover:bg-white/60">
          <ChevronDown size={13} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
          {expanded ? copy.hide : copy.explain}
        </button>
      </div>
    </section>
  );
}

export default function ProjectMapStartClient({ initialLocale }: { initialLocale: string }) {
  const locale = normalizeLocale(initialLocale);
  const copy = COPY[locale];
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [eligibleRoots, setEligibleRoots] = useState<RootOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rootValueObjectId, setRootValueObjectId] = useState("");
  const [projectModeCode, setProjectModeCode] = useState<"finite" | "continuous">("finite");
  const [timezone, setTimezone] = useState("UTC");
  const [currencyCode, setCurrencyCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  async function loadProjects(preferredId?: string) {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/projects?locale=${encodeURIComponent(locale)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ProjectsPayload | null;
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || copy.loadError);

      const nextProjects = payload.projects ?? [];
      setProjects(nextProjects);
      setEligibleRoots(payload.eligibleRoots ?? []);
      setSelectedProjectId((current) => {
        if (preferredId && nextProjects.some((item) => item.id === preferredId)) return preferredId;
        if (current && nextProjects.some((item) => item.id === current)) return current;
        return nextProjects[0]?.id ?? null;
      });
      if (nextProjects.length === 0) setShowCreate(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initializationTimer = window.setTimeout(() => {
      try {
        const browserTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (browserTimezone) {
          setTimezone(browserTimezone);
        }
      } catch {
        // UTC remains the safe default.
      }

      void loadProjects();
    }, 0);

    return () => {
      window.clearTimeout(initializationTimer);
    };

    // Initial load is intentionally tied to the route locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function createProject() {
    setCreateError(null);
    if (!title.trim() || !rootValueObjectId) {
      setCreateError(!title.trim() ? copy.titleLabel : copy.rootLabel);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          rootValueObjectId,
          projectModeCode,
          timezone,
          currencyCode: currencyCode.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; project?: ProjectItem; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true || !payload.project) {
        throw new Error(payload?.error || "Project creation failed");
      }

      const createdId = payload.project.id;
      setTitle("");
      setDescription("");
      setRootValueObjectId("");
      setCurrencyCode("");
      setProjectModeCode("finite");
      setShowCreate(false);
      await loadProjects(createdId);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Project creation failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-full px-3 py-4 sm:px-5">
        <div className="mx-auto flex min-h-[420px] w-full max-w-[1180px] items-center justify-center rounded-[24px] border border-[#e0e5f0] bg-white text-[13px] text-[#8b91a7] shadow-sm">
          {copy.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="mb-4 rounded-[24px] border border-[#e0e5f0] bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-[#161a2c]">{copy.pageTitle}</h1>
              <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#767d96]">{copy.pageSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {projects.length > 0 ? (
                <select value={selectedProjectId ?? ""}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value || null);
                    setShowCreate(false);
                  }}
                  className="min-w-[220px] rounded-xl border border-[#dce2ef] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3d435b] outline-none transition focus:border-[#7b97ff]"
                  aria-label={copy.chooseProject}>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              ) : null}
              <button type="button" onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4a73ff] px-3.5 py-2.5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(74,115,255,0.22)] transition hover:bg-[#3f68ef]">
                <Plus size={15} />{copy.newProject}
              </button>
            </div>
          </div>
          {loadError ? (
            <div className="mt-3 rounded-xl border border-[#f0c6cf] bg-[#fff7f8] px-3 py-2 text-[12px] text-[#b43f58]">{loadError}</div>
          ) : null}
        </header>

        {showCreate ? (
          <section className="mb-4 rounded-[26px] border border-[#dfe5f2] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-[#4a73ff]">
                <Sparkles size={18} />
                <h2 className="text-[16px] font-extrabold text-[#1d2336]">{copy.createTitle}</h2>
              </div>
              <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#7a8198]">{copy.createSubtitle}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.titleLabel}</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240}
                    placeholder={copy.titlePlaceholder}
                    className="w-full rounded-xl border border-[#dce2ef] bg-[#fbfcff] px-3.5 py-3 text-[13px] text-[#292f45] outline-none transition placeholder:text-[#afb4c5] focus:border-[#7895ff] focus:bg-white" />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.descriptionLabel}</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={4}
                    placeholder={copy.descriptionPlaceholder}
                    className="w-full resize-y rounded-xl border border-[#dce2ef] bg-[#fbfcff] px-3.5 py-3 text-[13px] leading-5 text-[#292f45] outline-none transition placeholder:text-[#afb4c5] focus:border-[#7895ff] focus:bg-white" />
                </label>

                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.rootLabel}</div>
                  <p className="mb-2 text-[11px] leading-5 text-[#8b91a7]">{copy.rootHelp}</p>
                  {eligibleRoots.length > 0 ? (
                    <select value={rootValueObjectId} onChange={(event) => setRootValueObjectId(event.target.value)}
                      className="w-full rounded-xl border border-[#dce2ef] bg-[#fbfcff] px-3.5 py-3 text-[12px] font-semibold text-[#3d435b] outline-none transition focus:border-[#7895ff] focus:bg-white">
                      <option value="">{copy.rootPlaceholder}</option>
                      {eligibleRoots.map((root) => (
                        <option key={root.id} value={root.id}>
                          {root.parentTitle ? `${root.parentTitle} → ${root.title || root.id}` : root.title || root.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-2xl border border-[#f0d9ae] bg-[#fffaf0] p-3">
                      <div className="text-[12px] font-bold text-[#73551f]">{copy.noRootsTitle}</div>
                      <p className="mt-1 text-[11px] leading-5 text-[#8d754a]">{copy.noRootsText}</p>
                      <a href={localeHref("/value-objects", locale)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold text-[#4a73ff] shadow-sm">
                        <Eye size={13} />{copy.openElements}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.modeLabel}</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <button type="button" onClick={() => setProjectModeCode("finite")}
                      className={`rounded-2xl border p-3 text-left transition ${projectModeCode === "finite" ? "border-[#7895ff] bg-[#f4f7ff] shadow-[0_6px_18px_rgba(74,115,255,0.10)]" : "border-[#e1e5ee] bg-white hover:bg-[#fafbfe]"}`}>
                      <div className="flex items-center gap-2 text-[12px] font-extrabold text-[#30364d]"><Target size={15} className="text-[#4a73ff]" />{copy.finite}</div>
                      <p className="mt-1.5 text-[10.5px] leading-4 text-[#858ba0]">{copy.finiteHelp}</p>
                    </button>
                    <button type="button" onClick={() => setProjectModeCode("continuous")}
                      className={`rounded-2xl border p-3 text-left transition ${projectModeCode === "continuous" ? "border-[#7895ff] bg-[#f4f7ff] shadow-[0_6px_18px_rgba(74,115,255,0.10)]" : "border-[#e1e5ee] bg-white hover:bg-[#fafbfe]"}`}>
                      <div className="flex items-center gap-2 text-[12px] font-extrabold text-[#30364d]"><Activity size={15} className="text-[#4a73ff]" />{copy.continuous}</div>
                      <p className="mt-1.5 text-[10.5px] leading-4 text-[#858ba0]">{copy.continuousHelp}</p>
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.timezoneLabel}</span>
                  <input value={timezone} onChange={(event) => setTimezone(event.target.value)} maxLength={120}
                    className="w-full rounded-xl border border-[#dce2ef] bg-[#fbfcff] px-3.5 py-3 text-[12px] text-[#3d435b] outline-none transition focus:border-[#7895ff] focus:bg-white" />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#737b94]">{copy.currencyLabel}</span>
                  <input value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase())}
                    placeholder="EUR" maxLength={3}
                    className="w-full rounded-xl border border-[#dce2ef] bg-[#fbfcff] px-3.5 py-3 text-[12px] uppercase text-[#3d435b] outline-none transition placeholder:text-[#afb4c5] focus:border-[#7895ff] focus:bg-white" />
                </label>

                {createError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[#efc7cf] bg-[#fff7f8] px-3 py-2.5 text-[11px] leading-5 text-[#b33d56]">
                    <CircleAlert size={14} className="mt-0.5 shrink-0" /><span>{createError}</span>
                  </div>
                ) : null}

                <button type="button" disabled={saving || eligibleRoots.length === 0 || !title.trim() || !rootValueObjectId}
                  onClick={() => void createProject()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a73ff] px-4 py-3 text-[12px] font-extrabold text-white shadow-[0_9px_22px_rgba(74,115,255,0.22)] transition hover:bg-[#3f68ef] disabled:cursor-not-allowed disabled:bg-[#b8c4e8] disabled:shadow-none">
                  <Plus size={15} />{saving ? copy.creating : copy.create}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {selectedProject && !showCreate ? (
          <>
            <section className="mb-4 rounded-[24px] border border-[#dfe5f2] bg-white px-4 py-3.5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[15px] font-extrabold text-[#242a40]">{copy.projectMap}</div>
                  <p className="mt-0.5 text-[11px] leading-5 text-[#7e859b]">{copy.projectMapHelp}</p>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#dfe5f2] bg-[#fafbfe] px-3 py-1.5 text-[10px] font-bold text-[#6f7790]">
                  <span>{copy.draft}</span><span className="h-1 w-1 rounded-full bg-[#b3bacd]" />
                  <span>{selectedProject.projectModeCode === "continuous" ? copy.continuousBadge : copy.finiteBadge}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#dfe4ef] bg-[#f5f7fb] p-3 shadow-inner sm:p-4 lg:p-5">
              <div className="grid gap-3 lg:grid-cols-3">
                <SectionCard tone="rose" title={copy.risksTitle} text={copy.risksText} example={copy.risksExample} icon={ShieldAlert} copy={copy} />
                <SectionCard tone="green" title={copy.goalTitle} text={copy.goalText} example={copy.goalExample} icon={Target} copy={copy} />
                <SectionCard tone="sky" title={copy.sourcesTitle} text={copy.sourcesText} example={copy.sourcesExample} icon={BookOpen} copy={copy} />
                <SectionCard tone="violet" title={copy.resourcesTitle} text={copy.resourcesText} example={copy.resourcesExample} icon={Users} copy={copy} />

                <section className="relative flex min-h-[245px] flex-col justify-center rounded-[24px] border-2 border-[#5279ff] bg-white p-5 shadow-[0_14px_36px_rgba(55,84,180,0.15)]">
                  <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-[#bbc7ed]" />
                  <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 translate-y-full bg-[#bbc7ed]" />
                  <div className="absolute left-0 top-1/2 h-px w-5 -translate-x-full bg-[#bbc7ed]" />
                  <div className="absolute right-0 top-1/2 h-px w-5 translate-x-full bg-[#bbc7ed]" />
                  <div className="text-center">
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#6782dc]">{copy.pageTitle}</div>
                    <h2 className="mt-2 text-[20px] font-black leading-tight tracking-[-0.02em] text-[#181d31]">{selectedProject.title}</h2>
                    {selectedProject.description ? (
                      <p className="mx-auto mt-2 max-w-[360px] text-[11.5px] leading-5 text-[#727991]">{selectedProject.description}</p>
                    ) : null}
                    <div className="mx-auto mt-4 max-w-[360px] rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] px-3 py-2.5 text-left">
                      <div className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#9399ad]">{copy.linkedElement}</div>
                      <div className="mt-1 text-[12px] font-bold text-[#444b63]">{selectedProject.rootValueObject.title || selectedProject.rootValueObject.id}</div>
                    </div>
                  </div>
                </section>

                <SectionCard tone="amber" title={copy.actionsTitle} text={copy.actionsText} example={copy.actionsExample} icon={Activity} copy={copy} />
                <div className="hidden lg:block" />
                <SectionCard tone="blue" title={copy.timeTitle} text={copy.timeText} example={copy.timeExample} icon={CalendarDays} copy={copy} />
                <div className="hidden lg:block" />
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#dce3f3] bg-white/80 px-3.5 py-3 text-[11px] leading-5 text-[#727990]">
                <Clock3 size={14} className="mt-0.5 shrink-0 text-[#6b83d2]" /><span>{copy.mapNotice}</span>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
