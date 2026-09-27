"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type SnapshotOption = {
  assignmentId: string;
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  dimensionCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
  valueObjectId: string;
  valueObjectCanonicalKey: string;
  valueObjectTitle: string;
};

type SnapshotLeafOption = {
  valueObjectId: string;
  valueObjectCanonicalKey: string;
  valueObjectTitle: string;
};

type SnapshotParameterOption = {
  parameterDefinitionId: string;
  parameterCode: string;
  parameterTitle: string;
  dimensionCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
};

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  explanationTitle: string;
  explanationBody: string;
  explanationExamples: string;
  explanationNotSnapshot: string;
  targetHint: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchEmpty: string;
  back: string;
  target: string;
  value: string;
  unit: string;
  effectiveAt: string;
  sourceText: string;
  sourceHint: string;
  submit: string;
  saving: string;
  loading: string;
  noOptions: string;
  success: string;
  openFacts: string;
  error: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    eyebrow: "STATE SNAPSHOT",
    title: "Add a state snapshot",
    subtitle:
      "A snapshot stores a user-reported state value at a specific moment using the existing system parameter assignment.",
    explanationTitle: "What is a state snapshot?",
    explanationBody:
      "A snapshot records the value of an observation object's property at a specific moment. It exists independently of a particular activity and can later be used in analytics and calculations.",
    explanationExamples:
      "Examples: body mass 96 kg, body temperature 36.6 °C, blood pressure 125 mmHg.",
    explanationNotSnapshot:
      "Not a snapshot: walk duration, exercise repetitions or floors climbed. Those values belong to a particular activity and are recorded as source facts.",
    targetHint:
      "Choose a property that describes the object's state at the selected moment, not the result of a particular action.",
    searchLabel: "Search in the list",
    searchPlaceholder: "Type part of the observation object or parameter name",
    searchEmpty: "No system assignments match the search.",
    back: "Back to facts",
    target: "Observation object and parameter",
    value: "Value",
    unit: "Unit",
    effectiveAt: "State at",
    sourceText: "Source note",
    sourceHint: "Optional: e.g. Weighed myself: 96 kg",
    submit: "Confirm and save snapshot",
    saving: "Saving...",
    loading: "Loading available system assignments...",
    noOptions: "No eligible system assignment was found.",
    success: "Snapshot saved.",
    openFacts: "Open snapshot facts",
    error: "Could not save the snapshot.",
  },
  pl: {
    eyebrow: "PRZEKRÓJ STANU",
    title: "Dodaj przekrój stanu",
    subtitle:
      "Przekrój zapisuje zgłoszoną przez użytkownika wartość stanu na określony moment przez istniejące systemowe przypisanie parametru.",
    explanationTitle: "Czym jest przekrój stanu?",
    explanationBody:
      "Przekrój zapisuje wartość właściwości obiektu obserwacji w określonym momencie. Istnieje niezależnie od konkretnej aktywności i może być później użyty w analizach oraz obliczeniach.",
    explanationExamples:
      "Przykłady: masa ciała 96 kg, temperatura ciała 36,6 °C, ciśnienie tętnicze 125 mmHg.",
    explanationNotSnapshot:
      "Nie jest przekrojem: czas spaceru, liczba powtórzeń ćwiczenia ani liczba pokonanych pięter. Takie wartości należą do konkretnej aktywności i są zapisywane jako fakty źródłowe.",
    targetHint:
      "Wybierz właściwość opisującą stan obiektu w wybranym momencie, a nie wynik konkretnego działania.",
    searchLabel: "Szukaj na liście",
    searchPlaceholder: "Wpisz fragment nazwy obiektu obserwacji albo parametru",
    searchEmpty: "Żadne przypisanie systemowe nie pasuje do wyszukiwania.",
    back: "Wróć do faktów",
    target: "Obiekt obserwacji i parametr",
    value: "Wartość",
    unit: "Jednostka",
    effectiveAt: "Stan na",
    sourceText: "Notatka źródłowa",
    sourceHint: "Opcjonalnie: np. Ważyłem się: 96 kg",
    submit: "Potwierdź i zapisz przekrój",
    saving: "Zapisywanie...",
    loading: "Ładowanie dostępnych przypisań systemowych...",
    noOptions: "Nie znaleziono odpowiedniego przypisania systemowego.",
    success: "Przekrój zapisany.",
    openFacts: "Otwórz fakty-przekroje",
    error: "Nie udało się zapisać przekroju.",
  },
  ru: {
    eyebrow: "ФАКТ-СРЕЗ СОСТОЯНИЯ",
    title: "Добавить факт-срез состояния",
    subtitle:
      "Срез сохраняет сообщённое пользователем значение состояния на конкретный момент через существующее системное назначение параметра.",
    explanationTitle: "Что такое факт-срез состояния?",
    explanationBody:
      "Факт-срез фиксирует значение свойства объекта наблюдения на конкретный момент времени. Он существует независимо от отдельной активности и позднее может использоваться в аналитике и расчётах.",
    explanationExamples:
      "Примеры: масса тела — 96 кг, температура тела — 36,6 °C, артериальное давление — 125 мм рт. ст.",
    explanationNotSnapshot:
      "Не является фактом-срезом: продолжительность прогулки, количество повторений упражнения или число пройденных этажей. Такие значения относятся к конкретной активности и записываются как исходные факты.",
    targetHint:
      "Выберите свойство, значение которого характеризует состояние объекта на указанный момент, а не результат отдельного действия.",
    searchLabel: "Поиск по списку",
    searchPlaceholder: "Введите часть названия ОН или параметра",
    searchEmpty: "Системные назначения по такому поиску не найдены.",
    back: "Вернуться к фактам",
    target: "Объект наблюдения и параметр",
    value: "Значение",
    unit: "Единица",
    effectiveAt: "Состояние на момент",
    sourceText: "Исходная запись",
    sourceHint: "Необязательно: например «Взвесился: 96 кг»",
    submit: "Подтвердить и сохранить срез",
    saving: "Сохраняем...",
    loading: "Загружаем доступные системные назначения...",
    noOptions: "Подходящее системное назначение не найдено.",
    success: "Факт-срез сохранён.",
    openFacts: "Открыть факты-срезы",
    error: "Не удалось сохранить факт-срез.",
  },
  uk: {
    eyebrow: "ФАКТ-ЗРІЗ СТАНУ",
    title: "Додати факт-зріз стану",
    subtitle:
      "Зріз зберігає повідомлене користувачем значення стану на конкретний момент через чинне системне призначення параметра.",
    explanationTitle: "Що таке факт-зріз стану?",
    explanationBody:
      "Факт-зріз фіксує значення властивості об’єкта спостереження на конкретний момент часу. Він існує незалежно від окремої активності й надалі може використовуватися в аналітиці та розрахунках.",
    explanationExamples:
      "Приклади: маса тіла — 96 кг, температура тіла — 36,6 °C, артеріальний тиск — 125 мм рт. ст.",
    explanationNotSnapshot:
      "Не є фактом-зрізом: тривалість прогулянки, кількість повторень вправи або кількість пройдених поверхів. Такі значення належать до конкретної активності та записуються як вихідні факти.",
    targetHint:
      "Оберіть властивість, значення якої характеризує стан об’єкта у вказаний момент, а не результат окремої дії.",
    searchLabel: "Пошук у списку",
    searchPlaceholder: "Введіть частину назви об’єкта спостереження або параметра",
    searchEmpty: "За цим пошуком системних призначень не знайдено.",
    back: "Повернутися до фактів",
    target: "Об’єкт спостереження і параметр",
    value: "Значення",
    unit: "Одиниця",
    effectiveAt: "Стан на момент",
    sourceText: "Вихідний запис",
    sourceHint: "Необов’язково: наприклад «Зважився: 96 кг»",
    submit: "Підтвердити й зберегти зріз",
    saving: "Зберігаємо...",
    loading: "Завантажуємо доступні системні призначення...",
    noOptions: "Відповідне системне призначення не знайдено.",
    success: "Факт-зріз збережено.",
    openFacts: "Відкрити факти-зрізи",
    error: "Не вдалося зберегти факт-зріз.",
  },
  de: {
    eyebrow: "ZUSTANDSSCHNITT",
    title: "Zustandsschnitt hinzufügen",
    subtitle:
      "Ein Schnitt speichert einen vom Benutzer gemeldeten Zustandswert zu einem bestimmten Zeitpunkt über eine vorhandene Systemzuordnung.",
    explanationTitle: "Was ist ein Zustandsschnitt?",
    explanationBody:
      "Ein Zustandsschnitt erfasst den Wert einer Eigenschaft eines Beobachtungsobjekts zu einem bestimmten Zeitpunkt. Er besteht unabhängig von einer einzelnen Aktivität und kann später für Analysen und Berechnungen verwendet werden.",
    explanationExamples:
      "Beispiele: Körpermasse 96 kg, Körpertemperatur 36,6 °C, Blutdruck 125 mmHg.",
    explanationNotSnapshot:
      "Kein Zustandsschnitt sind Gehzeit, Wiederholungen einer Übung oder gestiegene Stockwerke. Solche Werte gehören zu einer konkreten Aktivität und werden als Quellfakten gespeichert.",
    targetHint:
      "Wählen Sie eine Eigenschaft, die den Zustand des Objekts zum angegebenen Zeitpunkt beschreibt, nicht das Ergebnis einer einzelnen Handlung.",
    searchLabel: "In der Liste suchen",
    searchPlaceholder: "Geben Sie einen Teil des Beobachtungsobjekts oder Parameternamens ein",
    searchEmpty: "Keine Systemzuordnung passt zu dieser Suche.",
    back: "Zurück zu Fakten",
    target: "Beobachtungsobjekt und Parameter",
    value: "Wert",
    unit: "Einheit",
    effectiveAt: "Stand zum Zeitpunkt",
    sourceText: "Quellnotiz",
    sourceHint: "Optional: z. B. Gewogen: 96 kg",
    submit: "Bestätigen und speichern",
    saving: "Speichern...",
    loading: "Systemzuordnungen werden geladen...",
    noOptions: "Keine passende Systemzuordnung gefunden.",
    success: "Zustandsschnitt gespeichert.",
    openFacts: "Snapshot-Fakten öffnen",
    error: "Zustandsschnitt konnte nicht gespeichert werden.",
  },
  es: {
    eyebrow: "CORTE DE ESTADO",
    title: "Añadir corte de estado",
    subtitle:
      "Un corte guarda un valor de estado informado por el usuario en un momento concreto mediante una asignación de sistema existente.",
    explanationTitle: "¿Qué es un corte de estado?",
    explanationBody:
      "Un corte registra el valor de una propiedad de un objeto de observación en un momento concreto. Existe independientemente de una actividad específica y después puede utilizarse en análisis y cálculos.",
    explanationExamples:
      "Ejemplos: masa corporal 96 kg, temperatura corporal 36,6 °C, presión arterial 125 mmHg.",
    explanationNotSnapshot:
      "No es un corte: duración de una caminata, repeticiones de un ejercicio o pisos subidos. Esos valores pertenecen a una actividad concreta y se guardan como hechos fuente.",
    targetHint:
      "Elija una propiedad que describa el estado del objeto en el momento indicado, no el resultado de una acción concreta.",
    searchLabel: "Buscar en la lista",
    searchPlaceholder: "Escriba una parte del nombre del objeto de observación o del parámetro",
    searchEmpty: "Ninguna asignación del sistema coincide con la búsqueda.",
    back: "Volver a hechos",
    target: "Objeto de observación y parámetro",
    value: "Valor",
    unit: "Unidad",
    effectiveAt: "Estado en",
    sourceText: "Nota de origen",
    sourceHint: "Opcional: p. ej. Me pesé: 96 kg",
    submit: "Confirmar y guardar corte",
    saving: "Guardando...",
    loading: "Cargando asignaciones del sistema...",
    noOptions: "No se encontró una asignación de sistema adecuada.",
    success: "Corte de estado guardado.",
    openFacts: "Abrir hechos de estado",
    error: "No se pudo guardar el corte.",
  },
  cs: {
    eyebrow: "SNÍMEK STAVU",
    title: "Přidat snímek stavu",
    subtitle:
      "Snímek uloží uživatelem oznámenou hodnotu stavu k určitému okamžiku pomocí existujícího systémového přiřazení.",
    explanationTitle: "Co je snímek stavu?",
    explanationBody:
      "Snímek stavu zaznamenává hodnotu vlastnosti objektu pozorování v konkrétním okamžiku. Existuje nezávisle na jednotlivé aktivitě a později může být použit v analýzách a výpočtech.",
    explanationExamples:
      "Příklady: tělesná hmotnost 96 kg, tělesná teplota 36,6 °C, krevní tlak 125 mmHg.",
    explanationNotSnapshot:
      "Snímkem není délka chůze, počet opakování cviku ani počet vystoupaných pater. Tyto hodnoty patří ke konkrétní aktivitě a ukládají se jako zdrojová fakta.",
    targetHint:
      "Vyberte vlastnost, která popisuje stav objektu v uvedeném okamžiku, nikoli výsledek jednotlivé činnosti.",
    searchLabel: "Hledat v seznamu",
    searchPlaceholder: "Zadejte část názvu objektu pozorování nebo parametru",
    searchEmpty: "Žádné systémové přiřazení neodpovídá hledání.",
    back: "Zpět k faktům",
    target: "Objekt pozorování a parametr",
    value: "Hodnota",
    unit: "Jednotka",
    effectiveAt: "Stav k okamžiku",
    sourceText: "Zdrojová poznámka",
    sourceHint: "Volitelné: např. Zvážil jsem se: 96 kg",
    submit: "Potvrdit a uložit snímek",
    saving: "Ukládání...",
    loading: "Načítání systémových přiřazení...",
    noOptions: "Vhodné systémové přiřazení nebylo nalezeno.",
    success: "Snímek stavu uložen.",
    openFacts: "Otevřít snímky stavu",
    error: "Snímek stavu se nepodařilo uložit.",
  },
};

type SelectionCopy = {
  allStateLeaves: string;
  hideAllStateLeaves: string;
  directTitle: string;
  directHint: string;
  leafLabel: string;
  leafPlaceholder: string;
  leafEmpty: string;
  parameterLabel: string;
  parameterPlaceholder: string;
  existingAssignment: string;
  personalOnly: string;
  adminAssign: string;
  adminAssigning: string;
  adminAssigned: string;
};

const SELECTION_COPY: Record<Locale, SelectionCopy> = {
  en: {
    allStateLeaves: "Choose from all state leaves",
    hideAllStateLeaves: "Hide all state leaves",
    directTitle: "Any leaf in States & Needs",
    directHint:
      "A personal snapshot may use any active system leaf from the States & Needs branch with an existing system parameter, even when that pair has not yet been assigned globally.",
    leafLabel: "State leaf",
    leafPlaceholder: "Search all state leaves...",
    leafEmpty: "No state leaf matches this search.",
    parameterLabel: "Parameter",
    parameterPlaceholder: "Choose an existing system parameter...",
    existingAssignment: "System assignment exists",
    personalOnly: "Personal snapshot only; no global assignment yet",
    adminAssign: "Make this a system assignment",
    adminAssigning: "Assigning...",
    adminAssigned: "System assignment created.",
  },
  pl: {
    allStateLeaves: "Wybierz ze wszystkich liści stanu",
    hideAllStateLeaves: "Ukryj wszystkie liście stanu",
    directTitle: "Dowolny liść w gałęzi Stany i potrzeby",
    directHint:
      "Osobisty przekrój może użyć dowolnego aktywnego systemowego liścia z gałęzi Stany i potrzeby oraz istniejącego parametru systemowego, nawet jeśli ta para nie ma jeszcze globalnego przypisania.",
    leafLabel: "Liść stanu",
    leafPlaceholder: "Szukaj we wszystkich liściach stanu...",
    leafEmpty: "Brak pasującego liścia stanu.",
    parameterLabel: "Parametr",
    parameterPlaceholder: "Wybierz istniejący parametr systemowy...",
    existingAssignment: "Istnieje przypisanie systemowe",
    personalOnly: "Tylko przekrój osobisty; brak jeszcze przypisania globalnego",
    adminAssign: "Utwórz przypisanie systemowe",
    adminAssigning: "Przypisywanie...",
    adminAssigned: "Utworzono przypisanie systemowe.",
  },
  ru: {
    allStateLeaves: "Выбрать из всех листовых ОН состояний",
    hideAllStateLeaves: "Скрыть все листовые ОН состояний",
    directTitle: "Любой лист ветви «Состояния и потребности»",
    directHint:
      "Персональный факт-срез можно создать для любого активного системного листового ОН ветви «Состояния и потребности» с существующим системным параметром, даже если эта пара ещё не назначена глобально.",
    leafLabel: "Листовой ОН состояния",
    leafPlaceholder: "Поиск по всем листовым ОН состояний...",
    leafEmpty: "Листовой ОН состояния по такому поиску не найден.",
    parameterLabel: "Параметр",
    parameterPlaceholder: "Выберите существующий системный параметр...",
    existingAssignment: "Системное назначение уже существует",
    personalOnly: "Только персональный срез; глобального назначения пока нет",
    adminAssign: "Сделать системным назначением",
    adminAssigning: "Назначаем...",
    adminAssigned: "Системное назначение создано.",
  },
  uk: {
    allStateLeaves: "Вибрати з усіх листових ОН станів",
    hideAllStateLeaves: "Сховати всі листові ОН станів",
    directTitle: "Будь-який лист гілки «Стани та потреби»",
    directHint:
      "Персональний факт-зріз можна створити для будь-якого активного системного листового ОН гілки «Стани та потреби» з наявним системним параметром, навіть якщо ця пара ще не призначена глобально.",
    leafLabel: "Листовий ОН стану",
    leafPlaceholder: "Пошук серед усіх листових ОН станів...",
    leafEmpty: "Листовий ОН стану за таким пошуком не знайдено.",
    parameterLabel: "Параметр",
    parameterPlaceholder: "Виберіть наявний системний параметр...",
    existingAssignment: "Системне призначення вже існує",
    personalOnly: "Лише персональний зріз; глобального призначення поки немає",
    adminAssign: "Зробити системним призначенням",
    adminAssigning: "Призначення...",
    adminAssigned: "Системне призначення створено.",
  },
  de: {
    allStateLeaves: "Aus allen Zustandsblättern wählen",
    hideAllStateLeaves: "Alle Zustandsblätter ausblenden",
    directTitle: "Beliebiges Blatt im Zweig Zustände und Bedürfnisse",
    directHint:
      "Ein persönlicher Zustandsschnitt kann jedes aktive systemweite Blatt im Zweig Zustände und Bedürfnisse mit einem bestehenden Systemparameter verwenden, auch wenn diese Paarung noch nicht global zugeordnet ist.",
    leafLabel: "Zustandsblatt",
    leafPlaceholder: "Alle Zustandsblätter durchsuchen...",
    leafEmpty: "Kein passendes Zustandsblatt gefunden.",
    parameterLabel: "Parameter",
    parameterPlaceholder: "Vorhandenen Systemparameter auswählen...",
    existingAssignment: "Systemzuordnung vorhanden",
    personalOnly: "Nur persönlicher Schnitt; noch keine globale Zuordnung",
    adminAssign: "Als Systemzuordnung festlegen",
    adminAssigning: "Zuordnung läuft...",
    adminAssigned: "Systemzuordnung erstellt.",
  },
  es: {
    allStateLeaves: "Elegir entre todas las hojas de estado",
    hideAllStateLeaves: "Ocultar todas las hojas de estado",
    directTitle: "Cualquier hoja de Estados y necesidades",
    directHint:
      "Un corte personal puede usar cualquier objeto hoja activo del sistema en Estados y necesidades con un parámetro del sistema existente, aunque esa pareja aún no tenga una asignación global.",
    leafLabel: "Hoja de estado",
    leafPlaceholder: "Buscar en todas las hojas de estado...",
    leafEmpty: "No se encontró una hoja de estado coincidente.",
    parameterLabel: "Parámetro",
    parameterPlaceholder: "Seleccione un parámetro del sistema existente...",
    existingAssignment: "Existe asignación del sistema",
    personalOnly: "Solo corte personal; todavía no hay asignación global",
    adminAssign: "Convertir en asignación del sistema",
    adminAssigning: "Asignando...",
    adminAssigned: "Asignación del sistema creada.",
  },
  cs: {
    allStateLeaves: "Vybrat ze všech listů stavů",
    hideAllStateLeaves: "Skrýt všechny listy stavů",
    directTitle: "Libovolný list ve větvi Stavy a potřeby",
    directHint:
      "Osobní snímek může použít libovolný aktivní systémový list ve větvi Stavy a potřeby s existujícím systémovým parametrem, i když tato dvojice zatím nemá globální přiřazení.",
    leafLabel: "List stavu",
    leafPlaceholder: "Hledat ve všech listech stavů...",
    leafEmpty: "Odpovídající list stavu nebyl nalezen.",
    parameterLabel: "Parametr",
    parameterPlaceholder: "Vyberte existující systémový parametr...",
    existingAssignment: "Systémové přiřazení existuje",
    personalOnly: "Pouze osobní snímek; globální přiřazení zatím neexistuje",
    adminAssign: "Vytvořit systémové přiřazení",
    adminAssigning: "Přiřazování...",
    adminAssigned: "Systémové přiřazení bylo vytvořeno.",
  },
};

function normalizeLocale(value: string | null): Locale {
  return value && value in COPY ? (value as Locale) : "en";
}

function formatSnapshotOptionLabel(option: SnapshotOption) {
  return `${option.valueObjectTitle} · ${option.parameterTitle}`;
}

function localDateTimeValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function SnapshotCapturePageContent() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const copy = COPY[locale];
  const selectionCopy = SELECTION_COPY[locale];

  const [options, setOptions] = useState<SnapshotOption[]>([]);
  const [stateLeaves, setStateLeaves] = useState<SnapshotLeafOption[]>([]);
  const [parameterOptions, setParameterOptions] = useState<
    SnapshotParameterOption[]
  >([]);
  const [adminAccess, setAdminAccess] = useState(false);
  const [directPickerOpen, setDirectPickerOpen] = useState(false);
  const [directLeafQuery, setDirectLeafQuery] = useState("");
  const [directValueObjectId, setDirectValueObjectId] = useState("");
  const [
    directParameterDefinitionId,
    setDirectParameterDefinitionId,
  ] = useState("");
  const [adminAssigning, setAdminAssigning] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(localDateTimeValue());
  const [sourceText, setSourceText] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [targetSearchOpen, setTargetSearchOpen] = useState(false);
  const [targetActiveIndex, setTargetActiveIndex] = useState(-1);
  const targetBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successFactId, setSuccessFactId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/activity/facts/snapshots?locale=${encodeURIComponent(locale)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          options?: SnapshotOption[];
          stateLeaves?: SnapshotLeafOption[];
          parameterOptions?: SnapshotParameterOption[];
          adminAccess?: boolean;
          errorMessage?: string;
        };

        if (!response.ok || payload.ok !== true) {
          throw new Error(payload.errorMessage || copy.error);
        }

        if (cancelled) return;

        const nextOptions = Array.isArray(payload.options)
          ? payload.options
          : [];

        setOptions(nextOptions);
        setStateLeaves(
          Array.isArray(payload.stateLeaves)
            ? payload.stateLeaves
            : [],
        );
        setParameterOptions(
          Array.isArray(payload.parameterOptions)
            ? payload.parameterOptions
            : [],
        );
        setAdminAccess(payload.adminAccess === true);

        setAssignmentId("");
        setUnit("");
        setTargetQuery("");
        setDirectPickerOpen(false);
        setDirectLeafQuery("");
        setDirectValueObjectId("");
        setDirectParameterDefinitionId("");
        setAdminMessage("");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : copy.error,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [copy.error, locale]);

  const selectedOption = useMemo(
    () =>
      options.find((option) => option.assignmentId === assignmentId) ??
      null,
    [assignmentId, options],
  );

  const filteredOptions = useMemo(() => {
    const query = targetQuery.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [
        formatSnapshotOptionLabel(option),
        option.valueObjectTitle,
        option.parameterTitle,
        option.valueObjectCanonicalKey,
        option.parameterCode,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [options, targetQuery]);

  const searchableOptions = useMemo(() => {
    if (selectedOption && !filteredOptions.some((option) => option.assignmentId === selectedOption.assignmentId)) {
      return [selectedOption, ...filteredOptions];
    }

    return filteredOptions;
  }, [filteredOptions, selectedOption]);

  const selectedDirectLeaf = useMemo(
    () =>
      stateLeaves.find(
        (leaf) => leaf.valueObjectId === directValueObjectId,
      ) ?? null,
    [directValueObjectId, stateLeaves],
  );

  const selectedDirectParameter = useMemo(
    () =>
      parameterOptions.find(
        (parameter) =>
          parameter.parameterDefinitionId ===
          directParameterDefinitionId,
      ) ?? null,
    [directParameterDefinitionId, parameterOptions],
  );

  const directAssignment = useMemo(
    () =>
      options.find(
        (option) =>
          option.valueObjectId === directValueObjectId &&
          option.parameterDefinitionId ===
            directParameterDefinitionId,
      ) ?? null,
    [
      directParameterDefinitionId,
      directValueObjectId,
      options,
    ],
  );

  const directSelectionReady =
    selectedDirectLeaf !== null &&
    selectedDirectParameter !== null;

  const effectiveSelection = selectedOption
    ? {
        valueObjectId: selectedOption.valueObjectId,
        parameterDefinitionId:
          selectedOption.parameterDefinitionId,
        assignmentId: selectedOption.assignmentId,
        allowedUnitCodes: selectedOption.allowedUnitCodes,
        allowNegative: selectedOption.allowNegative,
      }
    : directSelectionReady
      ? {
          valueObjectId: selectedDirectLeaf.valueObjectId,
          parameterDefinitionId:
            selectedDirectParameter.parameterDefinitionId,
          assignmentId: directAssignment?.assignmentId ?? "",
          allowedUnitCodes:
            selectedDirectParameter.allowedUnitCodes,
          allowNegative: selectedDirectParameter.allowNegative,
        }
      : null;

  const filteredStateLeaves = useMemo(() => {
    const query = directLeafQuery.trim().toLowerCase();
    const source = query
      ? stateLeaves.filter((leaf) =>
          [
            leaf.valueObjectTitle,
            leaf.valueObjectCanonicalKey,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : stateLeaves;

    return source.slice(0, 150);
  }, [directLeafQuery, stateLeaves]);

  function selectTargetOption(option: SnapshotOption) {
    if (targetBlurTimerRef.current) {
      clearTimeout(targetBlurTimerRef.current);
      targetBlurTimerRef.current = null;
    }

    setAssignmentId(option.assignmentId);
    setDirectValueObjectId("");
    setDirectParameterDefinitionId("");
    setDirectLeafQuery("");
    setAdminMessage("");
    setUnit(option.canonicalUnitCode);
    setTargetQuery(formatSnapshotOptionLabel(option));
    setTargetSearchOpen(false);
    setTargetActiveIndex(-1);
  }

  async function materializeDirectAssignment() {
    if (
      !adminAccess ||
      !directValueObjectId ||
      !directParameterDefinitionId ||
      adminAssigning
    ) {
      return;
    }

    setAdminAssigning(true);
    setAdminMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/activity/facts/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "materialize_system_assignment",
          valueObjectId: directValueObjectId,
          parameterDefinitionId: directParameterDefinitionId,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        assignmentId?: string;
        errorMessage?: string;
      };

      if (!response.ok || payload.ok !== true || !payload.assignmentId) {
        throw new Error(payload.errorMessage || copy.error);
      }

      const leaf = stateLeaves.find(
        (item) => item.valueObjectId === directValueObjectId,
      );
      const parameter = parameterOptions.find(
        (item) =>
          item.parameterDefinitionId === directParameterDefinitionId,
      );

      if (!leaf || !parameter) {
        throw new Error(copy.error);
      }

      const nextOption: SnapshotOption = {
        assignmentId: payload.assignmentId,
        parameterDefinitionId: parameter.parameterDefinitionId,
        parameterCode: parameter.parameterCode,
        parameterTitle: parameter.parameterTitle,
        dimensionCode: parameter.dimensionCode,
        canonicalUnitCode: parameter.canonicalUnitCode,
        allowedUnitCodes: parameter.allowedUnitCodes,
        aggregationMethodCode: parameter.aggregationMethodCode,
        defaultWindowCode: parameter.defaultWindowCode,
        allowNegative: parameter.allowNegative,
        valueObjectId: leaf.valueObjectId,
        valueObjectCanonicalKey: leaf.valueObjectCanonicalKey,
        valueObjectTitle: leaf.valueObjectTitle,
      };

      setOptions((current) => {
        const withoutSamePair = current.filter(
          (item) =>
            !(
              item.valueObjectId === nextOption.valueObjectId &&
              item.parameterDefinitionId ===
                nextOption.parameterDefinitionId
            ),
        );
        return [...withoutSamePair, nextOption];
      });
      setAssignmentId(payload.assignmentId);
      setUnit(parameter.canonicalUnitCode);
      setAdminMessage(selectionCopy.adminAssigned);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.error,
      );
    } finally {
      setAdminAssigning(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !effectiveSelection ||
      !value ||
      !unit ||
      !effectiveAt
    ) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setErrorMessage(copy.error);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessFactId("");

    try {
      const response = await fetch("/api/activity/facts/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignmentId:
            effectiveSelection.assignmentId || null,
          valueObjectId: effectiveSelection.valueObjectId,
          parameterDefinitionId:
            effectiveSelection.parameterDefinitionId,
          value: numericValue,
          unit,
          effectiveAt: new Date(effectiveAt).toISOString(),
          sourceText,
          clientRequestId,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        factId?: string;
        errorMessage?: string;
      };

      if (!response.ok || payload.ok !== true || !payload.factId) {
        throw new Error(payload.errorMessage || copy.error);
      }

      setSuccessFactId(payload.factId);
      setClientRequestId(crypto.randomUUID());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.error,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-3 py-4 text-[#1a1d2e] sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
        <section className="py-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c8099]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.02em]">
            {copy.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#7c8099]">
            {copy.subtitle}
          </p>

          <div className="mt-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-sm font-black text-[#1a1d2e]">
              {copy.explanationTitle}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5a5f7a]">
              {copy.explanationBody}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#1a1d2e]">
              {copy.explanationExamples}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5a5f7a]">
              {copy.explanationNotSnapshot}
            </p>
          </div>

          <Link
            href={`/activity-facts?locale=${locale}`}
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-medium text-[#5a5f7a] hover:bg-[#f5f6fb]"
          >
            ← {copy.back}
          </Link>
        </section>

        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-sm">
          {loading ? (
            <p className="text-sm font-bold text-[#7c8099]">
              {copy.loading}
            </p>
          ) : options.length === 0 && stateLeaves.length === 0 ? (
            <p className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f5f6fb] p-4 text-sm font-medium text-[#5a5f7a]">
              {copy.noOptions}
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-2">
                <label htmlFor="snapshot-target-search" className="text-sm font-black">
                  {copy.target}
                </label>
                <span className="text-xs font-medium leading-5 text-[#7c8099]">
                  {copy.targetHint}
                </span>

                <div className="relative">
                  <input
                    id="snapshot-target-search"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={targetSearchOpen}
                    aria-controls="snapshot-target-options"
                    aria-activedescendant={
                      targetSearchOpen &&
                      targetActiveIndex >= 0 &&
                      searchableOptions[targetActiveIndex]
                        ? `snapshot-target-option-${searchableOptions[targetActiveIndex].assignmentId}`
                        : undefined
                    }
                    value={targetQuery}
                    onFocus={() => {
                      if (targetBlurTimerRef.current) {
                        clearTimeout(targetBlurTimerRef.current);
                        targetBlurTimerRef.current = null;
                      }
                      setTargetSearchOpen(true);
                    }}
                    onBlur={() => {
                      targetBlurTimerRef.current = setTimeout(() => {
                        setTargetSearchOpen(false);
                        setTargetActiveIndex(-1);
                      }, 120);
                    }}
                    onChange={(event) => {
                      const nextQuery = event.target.value;
                      setTargetQuery(nextQuery);
                      setTargetSearchOpen(true);
                      setTargetActiveIndex(-1);

                      if (
                        selectedOption &&
                        nextQuery !== formatSnapshotOptionLabel(selectedOption)
                      ) {
                        setAssignmentId("");
                        setUnit("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setTargetSearchOpen(true);
                        setTargetActiveIndex((current) => {
                          if (searchableOptions.length === 0) return -1;
                          return current < searchableOptions.length - 1
                            ? current + 1
                            : 0;
                        });
                        return;
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setTargetSearchOpen(true);
                        setTargetActiveIndex((current) => {
                          if (searchableOptions.length === 0) return -1;
                          return current > 0
                            ? current - 1
                            : searchableOptions.length - 1;
                        });
                        return;
                      }

                      if (
                        event.key === "Enter" &&
                        targetSearchOpen &&
                        targetActiveIndex >= 0 &&
                        searchableOptions[targetActiveIndex]
                      ) {
                        event.preventDefault();
                        selectTargetOption(searchableOptions[targetActiveIndex]);
                        return;
                      }

                      if (event.key === "Escape") {
                        setTargetSearchOpen(false);
                        setTargetActiveIndex(-1);
                      }
                    }}
                    placeholder={copy.searchPlaceholder}
                    className="min-h-11 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 pr-12 font-bold outline-none focus:border-[#3b6ef8]"
                    autoComplete="off"
                    required
                  />

                  <button
                    type="button"
                    aria-label={copy.searchLabel}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setTargetSearchOpen((open) => !open);
                      setTargetActiveIndex(-1);
                    }}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#7c8099]"
                  >
                    <span aria-hidden="true">⌄</span>
                  </button>

                  {targetSearchOpen ? (
                    <div
                      id="snapshot-target-options"
                      role="listbox"
                      className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-1 shadow-lg"
                    >
                      {searchableOptions.length > 0 ? (
                        searchableOptions.map((option, index) => {
                          const active = index === targetActiveIndex;
                          const selected =
                            option.assignmentId === selectedOption?.assignmentId;

                          return (
                            <button
                              id={`snapshot-target-option-${option.assignmentId}`}
                              key={option.assignmentId}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setTargetActiveIndex(index)}
                              onClick={() => selectTargetOption(option)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold ${
                                active || selected
                                  ? "bg-[#eef2ff] text-[#1a1d2e]"
                                  : "text-[#1a1d2e] hover:bg-[#f5f6fb]"
                              }`}
                            >
                              <span>{formatSnapshotOptionLabel(option)}</span>
                              {selected ? (
                                <span className="ml-3 text-[#3b6ef8]">✓</span>
                              ) : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-lg bg-[#f5f6fb] px-3 py-3 text-xs font-medium text-[#5a5f7a]">
                          {copy.searchEmpty}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[#7c8099]">
                    {searchableOptions.length} / {options.length}
                  </p>
                  {selectedOption ? (
                    <p className="text-xs font-bold text-[#3b6ef8]">
                      {formatSnapshotOptionLabel(selectedOption)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-[#cfd8ff] bg-[#f7f9ff] p-3">
                <button
                  type="button"
                  onClick={() => setDirectPickerOpen((open) => !open)}
                  className="min-h-9 rounded-lg border border-[#b9c7ff] bg-white px-3 text-sm font-bold text-[#315de8] hover:bg-[#eef2ff]"
                >
                  {directPickerOpen
                    ? selectionCopy.hideAllStateLeaves
                    : selectionCopy.allStateLeaves}
                </button>

                {directPickerOpen ? (
                  <div className="mt-3 grid gap-3">
                    <div>
                      <p className="text-sm font-black text-[#1a1d2e]">
                        {selectionCopy.directTitle}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-[#5a5f7a]">
                        {selectionCopy.directHint}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <label
                        htmlFor="snapshot-state-leaf-search"
                        className="text-xs font-black text-[#1a1d2e]"
                      >
                        {selectionCopy.leafLabel}
                      </label>
                      <input
                        id="snapshot-state-leaf-search"
                        type="text"
                        value={directLeafQuery}
                        onChange={(event) => {
                          setDirectLeafQuery(event.target.value);
                          setDirectValueObjectId("");
                          setDirectParameterDefinitionId("");
                          setAssignmentId("");
                          setUnit("");
                        }}
                        placeholder={selectionCopy.leafPlaceholder}
                        className="min-h-10 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none focus:border-[#3b6ef8]"
                      />

                      <div className="max-h-52 overflow-auto rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-1">
                        {filteredStateLeaves.length > 0 ? (
                          filteredStateLeaves.map((leaf) => {
                            const selected =
                              leaf.valueObjectId === directValueObjectId;
                            return (
                              <button
                                key={leaf.valueObjectId}
                                type="button"
                                onClick={() => {
                                  setDirectValueObjectId(leaf.valueObjectId);
                                  setDirectLeafQuery(leaf.valueObjectTitle);
                                  setAssignmentId("");
                                  setDirectParameterDefinitionId("");
                                  setUnit("");
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold ${
                                  selected
                                    ? "bg-[#eef2ff] text-[#1a1d2e]"
                                    : "text-[#1a1d2e] hover:bg-[#f5f6fb]"
                                }`}
                              >
                                <span>{leaf.valueObjectTitle}</span>
                                {selected ? (
                                  <span className="ml-3 text-[#3b6ef8]">✓</span>
                                ) : null}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-xs font-medium text-[#5a5f7a]">
                            {selectionCopy.leafEmpty}
                          </div>
                        )}
                      </div>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-xs font-black text-[#1a1d2e]">
                        {selectionCopy.parameterLabel}
                      </span>
                      <select
                        value={directParameterDefinitionId}
                        onChange={(event) => {
                          const nextParameterId = event.target.value;
                          setDirectParameterDefinitionId(nextParameterId);
                          setAssignmentId("");
                          const parameter = parameterOptions.find(
                            (item) =>
                              item.parameterDefinitionId === nextParameterId,
                          );
                          setUnit(parameter?.canonicalUnitCode ?? "");
                        }}
                        disabled={!directValueObjectId}
                        className="min-h-10 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm font-bold outline-none focus:border-[#3b6ef8] disabled:opacity-50"
                      >
                        <option value="">
                          {selectionCopy.parameterPlaceholder}
                        </option>
                        {parameterOptions.map((parameter) => (
                          <option
                            key={parameter.parameterDefinitionId}
                            value={parameter.parameterDefinitionId}
                          >
                            {parameter.parameterTitle} ·{" "}
                            {parameter.canonicalUnitCode}
                          </option>
                        ))}
                      </select>
                    </label>

                    {directSelectionReady ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            directAssignment
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {directAssignment
                            ? selectionCopy.existingAssignment
                            : selectionCopy.personalOnly}
                        </span>

                        {adminAccess && !directAssignment ? (
                          <button
                            type="button"
                            disabled={adminAssigning}
                            onClick={() => void materializeDirectAssignment()}
                            className="min-h-8 rounded-lg border border-[#b9c7ff] bg-white px-3 text-xs font-black text-[#315de8] hover:bg-[#eef2ff] disabled:opacity-50"
                          >
                            {adminAssigning
                              ? selectionCopy.adminAssigning
                              : selectionCopy.adminAssign}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {adminMessage ? (
                      <p className="text-xs font-bold text-emerald-700">
                        {adminMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black">{copy.value}</span>
                  <input
                    type="number"
                    step="any"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] px-4 font-bold outline-none focus:border-[#3b6ef8]"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black">{copy.unit}</span>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 font-bold outline-none focus:border-[#3b6ef8]"
                    required
                  >
                    {(effectiveSelection?.allowedUnitCodes ?? []).map(
                      (unitCode) => (
                        <option key={unitCode} value={unitCode}>
                          {unitCode}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black">{copy.effectiveAt}</span>
                <input
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(event) => setEffectiveAt(event.target.value)}
                  className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] px-4 font-bold outline-none focus:border-[#3b6ef8]"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black">{copy.sourceText}</span>
                <input
                  type="text"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder={copy.sourceHint}
                  className="min-h-11 rounded-xl border border-[rgba(0,0,0,0.08)] px-4 font-bold outline-none focus:border-[#3b6ef8]"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {successFactId ? (
                <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 text-sm font-bold text-[#5a5f7a]">
                  <p>{copy.success}</p>
                  <Link
                    href={`/activity-facts?collection=snapshot&locale=${locale}`}
                    className="mt-2 inline-flex underline"
                  >
                    {copy.openFacts}
                  </Link>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving || !effectiveSelection}
                className="min-h-10 rounded-lg bg-[#3b6ef8] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#2c5df0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? copy.saving : copy.submit}
              </button>
            </form>
          )}

          {!loading &&
          errorMessage &&
          options.length === 0 &&
          stateLeaves.length === 0 ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SnapshotCapturePage() {
  return (
    <Suspense fallback={null}>
      <SnapshotCapturePageContent />
    </Suspense>
  );
}
