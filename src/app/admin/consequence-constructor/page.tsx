"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ObservationObjectCombobox } from "@/components/observation-objects/observation-object-combobox";
import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type TaskState = "awaiting_template" | "awaiting_relations";

type ConsequenceTargetCandidate = {
  id: string;
  title: string;
  description: string | null;
  titleEn: string | null;
  descriptionEn: string | null;
  canonicalKey: string | null;
  relationIds: string[];
  relationTypeCodes: string[];
};

type ConsequenceTargetParameterCandidate = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
};

type ConsequenceFormulaDraft = {
  seriesId: string;
  ruleCode: string;
  targetParameterDefinitionId: string;
  targetParameterTitle: string;
  seriesStatusCode: string;
  versionId: string | null;
  versionNo: number | null;
  versionStatusCode: string | null;
  draftState: string;
};

type ConsequenceSelectedTarget = {
  targetValueObjectId: string;
  targetValueObjectTitle: string;
  relationIds: string[];
  relationTypeCodes: string[];
  selectedAt: string;
  activeImpactProfileId: string | null;
  activeImpactProfileVersionNo: number | null;
  sourceParameterInProfile: boolean;
  formulaDraftReadiness:
    | "awaiting_template"
    | "missing_active_v2_profile"
    | "source_parameter_not_in_profile"
    | "no_target_parameters"
    | "ready";
  targetParameterCandidates: ConsequenceTargetParameterCandidate[];
  draftRules: ConsequenceFormulaDraft[];
};

type ConsequenceTask = {
  id: string;
  rawSignalId: string;
  activityEventId: string;
  activityKind: "typical" | "raw";
  activityTitle: string;
  activityTemplateId: string | null;
  activityTemplateTitle: string | null;
  rawActivityTitle: string;
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  sourceValueObjectId: string;
  sourceValueObjectTitle: string;
  targetValueObjectId: string | null;
  targetSelectionState:
    | "awaiting_template"
    | "no_related_leaf_objects"
    | "ready"
    | "selected";
  targetCandidates: ConsequenceTargetCandidate[];
  selectedTargets: ConsequenceSelectedTarget[];
  state: TaskState;
  createdAt: string;
};

type TemplateOption = {
  id: string;
  title: string;
  shortTitle: string | null;
};

type QueueResponse = {
  ok?: boolean;
  pendingCount?: number;
  tasks?: ConsequenceTask[];
  templates?: TemplateOption[];
  error?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  count: string;
  activity: string;
  parameter: string;
  source: string;
  target: string;
  state: string;
  typical: string;
  raw: string;
  chooseTemplate: string;
  bindTemplate: string;
  rawOrigin: string;
  waitingTemplate: string;
  waitingRelations: string;
  empty: string;
  loading: string;
  refresh: string;
  ruleNote: string;
};

type TargetCopy = {
  placeholder: string;
  searchPlaceholder: string;
  empty: string;
  add: string;
  addAnother: string;
  adding: string;
  needTemplate: string;
  noRelations: string;
  ready: string;
  selected: string;
};

type FormulaCopy = {
  column: string;
  targetParameter: string;
  chooseParameter: string;
  createDraft: string;
  creating: string;
  draftReady: string;
  needTemplate: string;
  missingProfile: string;
  sourceMissingFromProfile: string;
  noTargetParameters: string;
  awaitingFormula: string;
  profileVersion: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: { title: "Consequence constructor", subtitle: "Tasks appear here immediately after a leaf observation object is assigned to a parameter. Consequence pairs are contextual: they have meaning only inside a concrete typical activity.", count: "tasks", activity: "Activity context", parameter: "Parameter", source: "Source leaf object", target: "Target leaf object", state: "State", typical: "Typical activity", raw: "Raw activity", chooseTemplate: "Choose typical activity…", bindTemplate: "Save activity", rawOrigin: "Raw origin", waitingTemplate: "Needs typical activity", waitingRelations: "Target setup", empty: "There are no consequence tasks yet.", loading: "Loading…", refresh: "Refresh", ruleNote: "Target search is enabled even before a typical activity is assigned. Only leaf observation objects that already have an active general relationship with the source object are offered. The selected target stays attached to the task and later follows it into the typical activity context. Draft calculation rules can now be created after a typical activity and target parameter are validated. The mathematical expression is configured in the next step." },
  ru: { title: "Конструктор последствий", subtitle: "Запись появляется здесь сразу после назначения листового объекта наблюдения параметру. Пары ОН контекстные: они имеют смысл только внутри конкретной типовой активности.", count: "заданий", activity: "Контекст активности", parameter: "Параметр", source: "Исходный листовой ОН", target: "Целевой листовой ОН", state: "Состояние", typical: "Типовая активность", raw: "Сырая активность", chooseTemplate: "Выберите типовую активность…", bindTemplate: "Сохранить активность", rawOrigin: "Исходная сырая активность", waitingTemplate: "Нужна типовая активность", waitingRelations: "Настройка цели", empty: "Заданий для конструктора последствий пока нет.", loading: "Загрузка…", refresh: "Обновить", ruleNote: "Поиск целевого ОН разблокирован и доступен ещё до выбора типовой активности. Предлагаются только листовые ОН, уже имеющие активную общую связь с исходным ОН. Выбранная цель сохраняется за заданием и позже переходит вместе с ним в контекст типовой активности. После проверки типовой активности и выбора целевого параметра теперь можно создать черновик расчётного правила. Само математическое выражение настраивается следующим этапом." },
  pl: { title: "Konstruktor konsekwencji", subtitle: "Zadanie pojawia się od razu po przypisaniu liściowego obiektu obserwacji do parametru. Pary obiektów mają znaczenie tylko w ramach konkretnej aktywności typowej.", count: "zadań", activity: "Kontekst aktywności", parameter: "Parametr", source: "Źródłowy obiekt liściowy", target: "Docelowy obiekt liściowy", state: "Stan", typical: "Aktywność typowa", raw: "Aktywność surowa", chooseTemplate: "Wybierz aktywność typową…", bindTemplate: "Zapisz aktywność", rawOrigin: "Źródłowa aktywność surowa", waitingTemplate: "Wymaga aktywności typowej", waitingRelations: "Konfiguracja celu", empty: "Brak zadań konstruktora konsekwencji.", loading: "Ładowanie…", refresh: "Odśwież", ruleNote: "Wyszukiwanie celu jest dostępne jeszcze przed wyborem aktywności typowej. Pokazywane są tylko liściowe obiekty z aktywną relacją ogólną ze źródłem. Wybrany cel pozostaje przypisany do zadania i później przechodzi do kontekstu aktywności typowej. Po sprawdzeniu aktywności typowej i wyborze parametru docelowego można już utworzyć szkic reguły obliczeniowej. Sam wzór będzie konfigurowany w następnym etapie." },
  uk: { title: "Конструктор наслідків", subtitle: "Завдання з’являється одразу після призначення листового об’єкта спостереження параметру. Пари об’єктів мають значення лише в межах конкретної типової активності.", count: "завдань", activity: "Контекст активності", parameter: "Параметр", source: "Вихідний листовий об’єкт", target: "Цільовий листовий об’єкт", state: "Стан", typical: "Типова активність", raw: "Сира активність", chooseTemplate: "Оберіть типову активність…", bindTemplate: "Зберегти активність", rawOrigin: "Вихідна сира активність", waitingTemplate: "Потрібна типова активність", waitingRelations: "Налаштування цілі", empty: "Завдань конструктора наслідків поки немає.", loading: "Завантаження…", refresh: "Оновити", ruleNote: "Пошук цільового ОН доступний ще до вибору типової активності. Показуються лише листові ОН з активним загальним зв’язком із вихідним ОН. Обрана ціль зберігається за завданням і пізніше переходить у контекст типової активності. Після перевірки типової активності та вибору цільового параметра вже можна створити чернетку розрахункового правила. Сам математичний вираз налаштовується наступним етапом." },
  de: { title: "Folgen-Konstruktor", subtitle: "Eine Aufgabe erscheint sofort, nachdem einem Parameter ein Blatt-Beobachtungsobjekt zugeordnet wurde. Objektpaare gelten nur innerhalb einer konkreten typischen Aktivität.", count: "Aufgaben", activity: "Aktivitätskontext", parameter: "Parameter", source: "Quell-Blattobjekt", target: "Ziel-Blattobjekt", state: "Status", typical: "Typische Aktivität", raw: "Rohaktivität", chooseTemplate: "Typische Aktivität wählen…", bindTemplate: "Aktivität speichern", rawOrigin: "Ursprüngliche Rohaktivität", waitingTemplate: "Typische Aktivität erforderlich", waitingRelations: "Zielkonfiguration", empty: "Noch keine Folgen-Aufgaben.", loading: "Laden…", refresh: "Aktualisieren", ruleNote: "Die Zielsuche ist bereits vor der Auswahl einer typischen Aktivität verfügbar. Angeboten werden nur Blattobjekte mit einer aktiven allgemeinen Beziehung zum Quellobjekt. Das gewählte Ziel bleibt an die Aufgabe gebunden und wechselt später in den Kontext der typischen Aktivität. Nach Prüfung der typischen Aktivität und Auswahl des Zielparameters kann jetzt ein Entwurf der Berechnungsregel erstellt werden. Der mathematische Ausdruck wird im nächsten Schritt konfiguriert." },
  es: { title: "Constructor de consecuencias", subtitle: "La tarea aparece inmediatamente después de asignar un objeto hoja a un parámetro. Los pares de objetos solo tienen significado dentro de una actividad típica concreta.", count: "tareas", activity: "Contexto de actividad", parameter: "Parámetro", source: "Objeto hoja de origen", target: "Objeto hoja de destino", state: "Estado", typical: "Actividad típica", raw: "Actividad bruta", chooseTemplate: "Seleccione una actividad típica…", bindTemplate: "Guardar actividad", rawOrigin: "Actividad bruta de origen", waitingTemplate: "Necesita actividad típica", waitingRelations: "Configuración del objetivo", empty: "Todavía no hay tareas de consecuencias.", loading: "Cargando…", refresh: "Actualizar", ruleNote: "La búsqueda del objetivo está disponible incluso antes de elegir una actividad típica. Solo se ofrecen objetos hoja con una relación general activa con el objeto de origen. El objetivo seleccionado permanece ligado a la tarea y luego pasa al contexto de la actividad típica. Tras validar la actividad típica y elegir el parámetro objetivo, ya se puede crear un borrador de la regla de cálculo. La expresión matemática se configura en el siguiente paso." },
  cs: { title: "Konstruktor důsledků", subtitle: "Úloha se objeví ihned po přiřazení listového objektu pozorování k parametru. Dvojice objektů mají význam jen v rámci konkrétní typické aktivity.", count: "úloh", activity: "Kontext aktivity", parameter: "Parametr", source: "Zdrojový listový objekt", target: "Cílový listový objekt", state: "Stav", typical: "Typická aktivita", raw: "Surová aktivita", chooseTemplate: "Vyberte typickou aktivitu…", bindTemplate: "Uložit aktivitu", rawOrigin: "Původní surová aktivita", waitingTemplate: "Vyžaduje typickou aktivitu", waitingRelations: "Nastavení cíle", empty: "Zatím nejsou žádné úlohy důsledků.", loading: "Načítání…", refresh: "Obnovit", ruleNote: "Vyhledávání cílového objektu je dostupné ještě před výběrem typické aktivity. Nabízejí se pouze listové objekty s aktivním obecným vztahem ke zdrojovému objektu. Vybraný cíl zůstává svázán s úlohou a později přejde do kontextu typické aktivity. Po ověření typické aktivity a výběru cílového parametru lze nyní vytvořit koncept výpočtového pravidla. Matematický výraz se nastaví v dalším kroku." },
};

const TARGET_COPY: Record<LocaleCode, TargetCopy> = {
  en: { placeholder: "Choose related leaf object…", searchPlaceholder: "Search related leaf objects…", empty: "No related leaf objects found.", add: "Add target", addAnother: "Add another target", adding: "Adding…", needTemplate: "Choose a typical activity first", noRelations: "No related leaf objects. Add a relationship first.", ready: "Choose target", selected: "Target selected" },
  ru: { placeholder: "Выберите связанный листовой ОН…", searchPlaceholder: "Поиск среди связанных листовых ОН…", empty: "Связанные листовые ОН не найдены.", add: "Добавить цель", addAnother: "Добавить ещё целевой ОН", adding: "Добавляем…", needTemplate: "Сначала выберите типовую активность", noRelations: "Нет связанных листовых ОН. Сначала добавьте связь.", ready: "Выберите цель", selected: "Цель выбрана" },
  pl: { placeholder: "Wybierz powiązany obiekt liściowy…", searchPlaceholder: "Szukaj wśród powiązanych obiektów liściowych…", empty: "Nie znaleziono powiązanych obiektów liściowych.", add: "Dodaj cel", addAnother: "Dodaj kolejny cel", adding: "Dodawanie…", needTemplate: "Najpierw wybierz aktywność typową", noRelations: "Brak powiązanych obiektów liściowych. Najpierw dodaj relację.", ready: "Wybierz cel", selected: "Cel wybrany" },
  uk: { placeholder: "Оберіть пов’язаний листовий ОН…", searchPlaceholder: "Пошук серед пов’язаних листових ОН…", empty: "Пов’язані листові ОН не знайдені.", add: "Додати ціль", addAnother: "Додати ще цільовий ОН", adding: "Додавання…", needTemplate: "Спочатку оберіть типову активність", noRelations: "Немає пов’язаних листових ОН. Спочатку додайте зв’язок.", ready: "Оберіть ціль", selected: "Ціль обрана" },
  de: { placeholder: "Verbundenes Blattobjekt wählen…", searchPlaceholder: "Verbundene Blattobjekte suchen…", empty: "Keine verbundenen Blattobjekte gefunden.", add: "Ziel hinzufügen", addAnother: "Weiteres Ziel hinzufügen", adding: "Hinzufügen…", needTemplate: "Zuerst eine typische Aktivität wählen", noRelations: "Keine verbundenen Blattobjekte. Zuerst eine Beziehung hinzufügen.", ready: "Ziel wählen", selected: "Ziel gewählt" },
  es: { placeholder: "Seleccione un objeto hoja relacionado…", searchPlaceholder: "Buscar objetos hoja relacionados…", empty: "No se encontraron objetos hoja relacionados.", add: "Añadir objetivo", addAnother: "Añadir otro objetivo", adding: "Añadiendo…", needTemplate: "Primero seleccione una actividad típica", noRelations: "No hay objetos hoja relacionados. Añada primero una relación.", ready: "Seleccione objetivo", selected: "Objetivo seleccionado" },
  cs: { placeholder: "Vyberte související listový objekt…", searchPlaceholder: "Hledat mezi souvisejícími listovými objekty…", empty: "Nebyly nalezeny související listové objekty.", add: "Přidat cíl", addAnother: "Přidat další cíl", adding: "Přidávání…", needTemplate: "Nejprve vyberte typickou aktivitu", noRelations: "Žádné související listové objekty. Nejprve přidejte vztah.", ready: "Vyberte cíl", selected: "Cíl vybrán" },
};

const FORMULA_COPY: Record<LocaleCode, FormulaCopy> = {
  en: {
    column: "Formula draft",
    targetParameter: "Target parameter",
    chooseParameter: "Choose target parameter…",
    createDraft: "Create draft",
    creating: "Creating…",
    draftReady: "Draft exists",
    needTemplate: "Choose a typical activity first.",
    missingProfile: "No active parameter_registry_v2 profile for this typical activity.",
    sourceMissingFromProfile: "The source parameter is not in the active typical-activity profile.",
    noTargetParameters: "The target object has no active system parameters.",
    awaitingFormula: "The semantic address is saved. The formula itself is not configured yet.",
    profileVersion: "Profile",
  },
  ru: {
    column: "Черновик формулы",
    targetParameter: "Целевой параметр",
    chooseParameter: "Выберите целевой параметр…",
    createDraft: "Создать черновик",
    creating: "Создаём…",
    draftReady: "Черновик существует",
    needTemplate: "Сначала выберите типовую активность.",
    missingProfile: "У типовой активности нет активного профиля parameter_registry_v2.",
    sourceMissingFromProfile: "Исходный параметр отсутствует в активном профиле типовой активности.",
    noTargetParameters: "У целевого ОН нет активных системных параметров.",
    awaitingFormula: "Смысловой адрес сохранён. Саму формулу ещё нужно настроить.",
    profileVersion: "Профиль",
  },
  pl: {
    column: "Szkic formuły",
    targetParameter: "Parametr docelowy",
    chooseParameter: "Wybierz parametr docelowy…",
    createDraft: "Utwórz szkic",
    creating: "Tworzenie…",
    draftReady: "Szkic istnieje",
    needTemplate: "Najpierw wybierz aktywność typową.",
    missingProfile: "Brak aktywnego profilu parameter_registry_v2 dla tej aktywności typowej.",
    sourceMissingFromProfile: "Parametru źródłowego nie ma w aktywnym profilu aktywności typowej.",
    noTargetParameters: "Obiekt docelowy nie ma aktywnych parametrów systemowych.",
    awaitingFormula: "Adres semantyczny zapisano. Sama formuła nie jest jeszcze skonfigurowana.",
    profileVersion: "Profil",
  },
  uk: {
    column: "Чернетка формули",
    targetParameter: "Цільовий параметр",
    chooseParameter: "Оберіть цільовий параметр…",
    createDraft: "Створити чернетку",
    creating: "Створення…",
    draftReady: "Чернетка існує",
    needTemplate: "Спочатку оберіть типову активність.",
    missingProfile: "Для типової активності немає активного профілю parameter_registry_v2.",
    sourceMissingFromProfile: "Вихідного параметра немає в активному профілі типової активності.",
    noTargetParameters: "Цільовий ОН не має активних системних параметрів.",
    awaitingFormula: "Смислову адресу збережено. Саму формулу ще не налаштовано.",
    profileVersion: "Профіль",
  },
  de: {
    column: "Formelentwurf",
    targetParameter: "Zielparameter",
    chooseParameter: "Zielparameter wählen…",
    createDraft: "Entwurf erstellen",
    creating: "Erstellen…",
    draftReady: "Entwurf vorhanden",
    needTemplate: "Zuerst eine typische Aktivität wählen.",
    missingProfile: "Für diese typische Aktivität gibt es kein aktives parameter_registry_v2-Profil.",
    sourceMissingFromProfile: "Der Quellparameter fehlt im aktiven Profil der typischen Aktivität.",
    noTargetParameters: "Das Zielobjekt hat keine aktiven Systemparameter.",
    awaitingFormula: "Die semantische Adresse ist gespeichert. Die Formel selbst ist noch nicht konfiguriert.",
    profileVersion: "Profil",
  },
  es: {
    column: "Borrador de fórmula",
    targetParameter: "Parámetro objetivo",
    chooseParameter: "Seleccione el parámetro objetivo…",
    createDraft: "Crear borrador",
    creating: "Creando…",
    draftReady: "El borrador existe",
    needTemplate: "Seleccione primero una actividad típica.",
    missingProfile: "No hay un perfil parameter_registry_v2 activo para esta actividad típica.",
    sourceMissingFromProfile: "El parámetro de origen no está en el perfil activo de la actividad típica.",
    noTargetParameters: "El objeto objetivo no tiene parámetros de sistema activos.",
    awaitingFormula: "La dirección semántica está guardada. La fórmula aún no está configurada.",
    profileVersion: "Perfil",
  },
  cs: {
    column: "Koncept vzorce",
    targetParameter: "Cílový parametr",
    chooseParameter: "Vyberte cílový parametr…",
    createDraft: "Vytvořit koncept",
    creating: "Vytváření…",
    draftReady: "Koncept existuje",
    needTemplate: "Nejprve vyberte typickou aktivitu.",
    missingProfile: "Pro tuto typickou aktivitu není aktivní profil parameter_registry_v2.",
    sourceMissingFromProfile: "Zdrojový parametr není v aktivním profilu typické aktivity.",
    noTargetParameters: "Cílový objekt nemá aktivní systémové parametry.",
    awaitingFormula: "Sémantická adresa je uložena. Samotný vzorec ještě není nakonfigurován.",
    profileVersion: "Profil",
  },
};

export default function AdminConsequenceConstructorPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [tasks, setTasks] = useState<ConsequenceTask[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateByTask, setSelectedTemplateByTask] = useState<
    Record<string, string>
  >({});
  const [selectedTargetByTask, setSelectedTargetByTask] = useState<
    Record<string, string>
  >({});
  const [selectedTargetParameterByKey, setSelectedTargetParameterByKey] =
    useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const targetCopy = useMemo(
    () => TARGET_COPY[locale] ?? TARGET_COPY.en,
    [locale],
  );
  const formulaCopy = useMemo(
    () => FORMULA_COPY[locale] ?? FORMULA_COPY.en,
    [locale],
  );

  const fetchTasks = useCallback(async (): Promise<QueueResponse> => {
    const response = await fetch(
      `/api/admin/consequence-constructor?locale=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as QueueResponse;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, [locale]);

  const applyPayload = useCallback((payload: QueueResponse) => {
    const nextTasks = payload.tasks ?? [];
    setTasks(nextTasks);
    setTemplates(payload.templates ?? []);
    setSelectedTemplateByTask(
      Object.fromEntries(
        nextTasks.map((task) => [task.id, task.activityTemplateId ?? ""]),
      ),
    );
    setSelectedTargetByTask(
      Object.fromEntries(nextTasks.map((task) => [task.id, ""])),
    );
    setSelectedTargetParameterByKey(
      Object.fromEntries(
        nextTasks.flatMap((task) =>
          task.selectedTargets.map((target) => [
            `${task.id}:${target.targetValueObjectId}`,
            "",
          ]),
        ),
      ),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyPayload(await fetchTasks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [applyPayload, fetchTasks]);

  useEffect(() => {
    let cancelled = false;
    void fetchTasks()
      .then((payload) => {
        if (cancelled) return;
        applyPayload(payload);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyPayload, fetchTasks]);

  async function bindTemplate(task: ConsequenceTask) {
    const templateId = selectedTemplateByTask[task.id] ?? "";
    if (!templateId || templateId === task.activityTemplateId) return;

    setBusyId(`template:${task.id}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/consequence-constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bind_template",
          taskId: task.id,
          templateId,
        }),
      });
      const payload = (await response.json()) as QueueResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      await load();
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : String(bindError));
    } finally {
      setBusyId(null);
    }
  }

  async function addTarget(task: ConsequenceTask) {
    const targetValueObjectId = selectedTargetByTask[task.id] ?? "";
    if (!targetValueObjectId) return;

    setBusyId(`target:${task.id}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/consequence-constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_target",
          taskId: task.id,
          targetValueObjectId,
        }),
      });
      const payload = (await response.json()) as QueueResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      await load();
    } catch (targetError) {
      setError(
        targetError instanceof Error ? targetError.message : String(targetError),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createFormulaDraft(
    task: ConsequenceTask,
    target: ConsequenceSelectedTarget,
  ) {
    const key = `${task.id}:${target.targetValueObjectId}`;
    const targetParameterDefinitionId =
      selectedTargetParameterByKey[key] ?? "";

    if (!targetParameterDefinitionId) return;

    setBusyId(`formula:${key}`);
    setError(null);

    try {
      const response = await fetch("/api/admin/consequence-constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_formula_draft",
          taskId: task.id,
          targetValueObjectId: target.targetValueObjectId,
          targetParameterDefinitionId,
        }),
      });

      const payload = (await response.json()) as QueueResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      await load();
    } catch (formulaError) {
      setError(
        formulaError instanceof Error
          ? formulaError.message
          : String(formulaError),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
              <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#3b6ef8]">
                {tasks.length} {copy.count}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b7280]">
              {copy.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#d8dced] px-3 py-2 text-sm font-medium text-[#4a4f6a] hover:bg-[#f8f9fc]"
          >
            {copy.refresh}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {copy.ruleNote}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p>
        ) : null}

        {!loading && tasks.length === 0 ? (
          <p className="mt-6 text-sm text-[#6b7280]">{copy.empty}</p>
        ) : null}

        {!loading && tasks.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[#8a8fa8]">
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {copy.activity}
                  </th>
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {copy.parameter}
                  </th>
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {copy.source}
                  </th>
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {copy.target}
                  </th>
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {formulaCopy.column}
                  </th>
                  <th className="border-b border-[#eceef5] px-3 py-2">
                    {copy.state}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const selectedTemplateId =
                    selectedTemplateByTask[task.id] ?? "";
                  const templateChanged =
                    selectedTemplateId !== "" &&
                    selectedTemplateId !== (task.activityTemplateId ?? "");
                  const selectedTargetIds = new Set(
                    task.selectedTargets.map(
                      (item) => item.targetValueObjectId,
                    ),
                  );
                  const availableCandidates = task.targetCandidates.filter(
                    (candidate) => !selectedTargetIds.has(candidate.id),
                  );
                  const targetValue = selectedTargetByTask[task.id] ?? "";
                  const targetBusy = busyId === `target:${task.id}`;
                  const templateBusy = busyId === `template:${task.id}`;
                  const targetDisabled =
                    availableCandidates.length === 0 ||
                    busyId !== null;

                  const targetOptions = availableCandidates.map((candidate) => ({
                    id: candidate.id,
                    title: candidate.title,
                    description: candidate.description,
                    titleEn: candidate.titleEn,
                    descriptionEn: candidate.descriptionEn,
                    canonicalKey: candidate.canonicalKey,
                    meta: candidate.relationTypeCodes.join(", "),
                  }));

                  const stateLabel =
                    task.targetCandidates.length === 0
                      ? targetCopy.noRelations
                      : task.selectedTargets.length > 0
                        ? targetCopy.selected
                        : targetCopy.ready;

                  return (
                    <tr key={task.id} className="align-top">
                      <td className="min-w-[330px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              task.activityKind === "typical"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {task.activityKind === "typical"
                              ? copy.typical
                              : copy.raw}
                          </span>
                          <span className="font-medium text-[#23263a]">
                            {task.activityTitle}
                          </span>
                        </div>

                        {task.activityKind === "typical" ? (
                          <div className="mt-1 text-xs text-[#8a8fa8]">
                            {copy.rawOrigin}: {task.rawActivityTitle}
                          </div>
                        ) : null}

                        <div className="mt-3 flex gap-2">
                          <select
                            value={selectedTemplateId}
                            onChange={(event) =>
                              setSelectedTemplateByTask((current) => ({
                                ...current,
                                [task.id]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-[#d8dced] bg-white px-2.5 py-2 text-xs text-[#4a4f6a]"
                          >
                            <option value="">{copy.chooseTemplate}</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              !templateChanged ||
                              busyId !== null
                            }
                            onClick={() => void bindTemplate(task)}
                            className="whitespace-nowrap rounded-lg border border-[#cfd5ea] px-3 py-2 text-xs font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {templateBusy ? copy.loading : copy.bindTemplate}
                          </button>
                        </div>
                      </td>

                      <td className="min-w-[220px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="font-medium text-[#23263a]">
                          {task.parameterTitle}
                        </div>
                        <div className="mt-1 text-xs text-[#8a8fa8]">
                          {task.parameterCode || task.parameterDefinitionId}
                        </div>
                      </td>

                      <td className="min-w-[240px] border-b border-[#f0f1f6] px-3 py-3">
                        <div className="font-medium text-[#23263a]">
                          {task.sourceValueObjectTitle}
                        </div>
                        <div className="mt-1 text-xs text-[#8a8fa8]">
                          {task.sourceValueObjectId}
                        </div>
                      </td>

                      <td className="min-w-[390px] border-b border-[#f0f1f6] px-3 py-3">
                        {task.selectedTargets.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {task.selectedTargets.map((target) => (
                              <span
                                key={target.targetValueObjectId}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                              >
                                {target.targetValueObjectTitle}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex items-start gap-2">
                          <div className="min-w-[250px] flex-1">
                            <ObservationObjectCombobox
                              value={targetValue}
                              onChange={(value) =>
                                setSelectedTargetByTask((current) => ({
                                  ...current,
                                  [task.id]: value,
                                }))
                              }
                              options={targetOptions}
                              placeholder={
                                task.targetCandidates.length === 0
                                  ? targetCopy.noRelations
                                  : targetCopy.placeholder
                              }
                              searchPlaceholder={targetCopy.searchPlaceholder}
                              emptyLabel={targetCopy.empty}
                              ariaLabel={copy.target}
                              disabled={targetDisabled}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={
                              targetDisabled ||
                              !targetValue ||
                              targetBusy
                            }
                            onClick={() => void addTarget(task)}
                            className="mt-1 whitespace-nowrap rounded-lg border border-[#cfd5ea] px-3 py-2.5 text-xs font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {targetBusy
                              ? targetCopy.adding
                              : task.selectedTargets.length > 0
                                ? targetCopy.addAnother
                                : targetCopy.add}
                          </button>
                        </div>
                      </td>

                      <td className="min-w-[430px] border-b border-[#f0f1f6] px-3 py-3">
                        {task.selectedTargets.length === 0 ? (
                          <div className="text-xs text-[#8a8fa8]">
                            {formulaCopy.needTemplate}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {task.selectedTargets.map((target) => {
                              const key = `${task.id}:${target.targetValueObjectId}`;
                              const selectedParameterId =
                                selectedTargetParameterByKey[key] ?? "";
                              const existingParameterIds = new Set(
                                target.draftRules.map(
                                  (draft) =>
                                    draft.targetParameterDefinitionId,
                                ),
                              );
                              const selectedAlreadyExists =
                                selectedParameterId !== "" &&
                                existingParameterIds.has(selectedParameterId);
                              const formulaBusy =
                                busyId === `formula:${key}`;
                              const formulaDisabled =
                                busyId !== null ||
                                target.formulaDraftReadiness !== "ready";

                              const readinessText =
                                target.formulaDraftReadiness ===
                                "awaiting_template"
                                  ? formulaCopy.needTemplate
                                  : target.formulaDraftReadiness ===
                                      "missing_active_v2_profile"
                                    ? formulaCopy.missingProfile
                                    : target.formulaDraftReadiness ===
                                        "source_parameter_not_in_profile"
                                      ? formulaCopy.sourceMissingFromProfile
                                      : target.formulaDraftReadiness ===
                                          "no_target_parameters"
                                        ? formulaCopy.noTargetParameters
                                        : "";

                              return (
                                <div
                                  key={key}
                                  className="rounded-xl border border-[#e5e7f1] bg-[#fbfbfe] p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs font-semibold text-[#4a4f6a]">
                                      {target.targetValueObjectTitle}
                                    </div>
                                    {target.activeImpactProfileVersionNo ? (
                                      <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[10px] font-semibold text-[#5367c7]">
                                        {formulaCopy.profileVersion} v
                                        {target.activeImpactProfileVersionNo}
                                      </span>
                                    ) : null}
                                  </div>

                                  {target.draftRules.length > 0 ? (
                                    <div className="mt-2 space-y-1.5">
                                      {target.draftRules.map((draft) => (
                                        <div
                                          key={draft.seriesId}
                                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-800"
                                        >
                                          <div className="font-semibold">
                                            {formulaCopy.draftReady}:{" "}
                                            {draft.targetParameterTitle}
                                          </div>
                                          <div className="mt-0.5 text-emerald-700">
                                            {formulaCopy.awaitingFormula}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="mt-2 text-[11px] font-medium text-[#6b7280]">
                                    {formulaCopy.targetParameter}
                                  </div>

                                  <div className="mt-1 flex items-center gap-2">
                                    <select
                                      value={selectedParameterId}
                                      onChange={(event) =>
                                        setSelectedTargetParameterByKey(
                                          (current) => ({
                                            ...current,
                                            [key]: event.target.value,
                                          }),
                                        )
                                      }
                                      disabled={formulaDisabled}
                                      className="min-w-0 flex-1 rounded-lg border border-[#d8dced] bg-white px-2.5 py-2 text-xs text-[#4a4f6a] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <option value="">
                                        {formulaCopy.chooseParameter}
                                      </option>
                                      {target.targetParameterCandidates.map(
                                        (parameter) => (
                                          <option
                                            key={parameter.id}
                                            value={parameter.id}
                                          >
                                            {parameter.title}
                                            {parameter.canonicalUnitCode
                                              ? ` · ${parameter.canonicalUnitCode}`
                                              : ""}
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    <button
                                      type="button"
                                      disabled={
                                        formulaDisabled ||
                                        !selectedParameterId ||
                                        selectedAlreadyExists ||
                                        formulaBusy
                                      }
                                      onClick={() =>
                                        void createFormulaDraft(task, target)
                                      }
                                      className="whitespace-nowrap rounded-lg border border-[#cfd5ea] px-3 py-2 text-xs font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {formulaBusy
                                        ? formulaCopy.creating
                                        : selectedAlreadyExists
                                          ? formulaCopy.draftReady
                                          : formulaCopy.createDraft}
                                    </button>
                                  </div>

                                  {readinessText ? (
                                    <div className="mt-2 text-[11px] leading-5 text-amber-700">
                                      {readinessText}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="min-w-[190px] border-b border-[#f0f1f6] px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            task.targetCandidates.length === 0
                              ? "bg-slate-100 text-slate-600"
                              : task.selectedTargets.length > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {stateLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
