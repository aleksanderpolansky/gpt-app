"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LocaleCode } from "@/i18n";

import { CuratorObjectBootstrap } from "./curator-object-bootstrap";

type ParameterItem = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  canonicalUnitLabel: string;
  aggregationMethodCode: string;
  defaultWindowCode: string;
  status: string;
};

type SelectedParameterItem = ParameterItem & {
  selectionSource: string;
  selectedAt: string;
  mappingCompleted: boolean;
  mappingResult: string | null;
  mappingSummaryRu: string | null;
  mappingSummaryEn: string | null;
};

type ParameterState = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  confirmed?: boolean;
  confirmationComment?: string | null;
  selected?: SelectedParameterItem[];
  available?: ParameterItem[];
};

type CreatedParameterResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  definition?: ParameterItem;
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  onChanged: () => void;
};

type AddMode = "existing" | "new";

type Copy = {
  title: string;
  hint: string;
  rule: string;
  selectedTitle: string;
  noneSelected: string;
  addAdditional: string;
  chooseExisting: string;
  createNew: string;
  searchPlaceholder: string;
  noAvailable: string;
  addParameter: string;
  selectedBadge: string;
  mappingReady: string;
  mappingPending: string;
  confirmTitle: string;
  confirmHint: string;
  confirmComment: string;
  confirmCommentHint: string;
  confirmButton: string;
  confirmed: string;
  confirmedHint: string;
  currentParameter: string;
  allMapped: string;
  allMappedHint: string;
  openCatalog: string;
  loading: string;
  saving: string;
  loadError: string;
  newTitle: string;
  newDescription: string;
  technicalCode: string;
  dimension: string;
  valueType: string;
  unit: string;
  aggregation: string;
  window: string;
  allowNegative: string;
  choose: string;
  createAndAdd: string;
};

const EN: Copy = {"title":"Typical activity parameters","hint":"Build the required parameter set for the new system typical activity. Add an existing system parameter or create a missing one. After every addition, the selected set remains visible and you can add another parameter.","rule":"A system typical activity must define at least one measurable parameter. A parameter specifies which value can be recorded for a particular execution of the activity; a fact exists after a value is recorded.","selectedTitle":"Selected parameters","noneSelected":"No parameters have been selected yet.","addAdditional":"+ Add another parameter","chooseExisting":"Choose existing","createNew":"Create new","searchPlaceholder":"Search by name, code or dimension…","noAvailable":"No matching active system parameters.","addParameter":"Add parameter","selectedBadge":"Selected","mappingReady":"Observation object for the measurement has been determined","mappingPending":"Observation object for the measurement has not been determined yet","confirmTitle":"Finish the parameter set","confirmHint":"When the set is complete, confirm it. Then process parameters one by one and determine the leaf observation object whose value each parameter measures.","confirmComment":"Decision comment","confirmCommentHint":"Briefly explain why this parameter set is sufficient for the typical activity.","confirmButton":"Confirm parameter set and continue","confirmed":"Typical activity parameter set confirmed","confirmedHint":"The set is fixed for this review step. Now determine, for every selected parameter, the leaf observation object whose value it measures.","currentParameter":"Parameter being configured","allMapped":"Observation objects for measurement determined for all parameters","allMappedHint":"This constructor section is complete. Continue to the next stage of building the system typical activity.","openCatalog":"Open parameter catalog","loading":"Loading parameter constructor…","saving":"Saving…","loadError":"Could not load or save the parameter constructor.","newTitle":"Name","newDescription":"Description","technicalCode":"Technical code","dimension":"Dimension","valueType":"Value type","unit":"Canonical unit","aggregation":"Aggregation","window":"Default window","allowNegative":"Allow negative values","choose":"Choose…","createAndAdd":"Create system parameter and add it"};

const RU: Copy = {"title":"Параметры типовой активности","hint":"Сформируйте необходимый набор параметров новой системной типовой активности. Добавьте существующий системный параметр или создайте недостающий. После каждого добавления выбранный набор остаётся видимым.","rule":"Для системной типовой активности должен быть определён хотя бы один измеримый параметр. Параметр задаёт, какое значение может быть зафиксировано при конкретном выполнении активности; факт возникает после записи значения.","selectedTitle":"Выбранные параметры","noneSelected":"Параметры ещё не выбраны.","addAdditional":"+ Добавить ещё один параметр","chooseExisting":"Выбрать существующий","createNew":"Создать новый","searchPlaceholder":"Поиск по названию, коду или измерению…","noAvailable":"Подходящих активных системных параметров не найдено.","addParameter":"Добавить параметр","selectedBadge":"Выбран","mappingReady":"Объект наблюдения для измерения определён","mappingPending":"Объект наблюдения для измерения ещё не определён","confirmTitle":"Завершить набор параметров","confirmHint":"Когда набор сформирован, подтвердите его. Затем обработайте параметры по одному и для каждого определите листовой объект наблюдения, значение которого он измеряет.","confirmComment":"Комментарий к решению","confirmCommentHint":"Кратко объясните, почему этого набора параметров достаточно для типовой активности.","confirmButton":"Подтвердить набор параметров и продолжить","confirmed":"Набор параметров типовой активности подтверждён","confirmedHint":"Набор зафиксирован для этого шага проверки. Теперь для каждого параметра определите листовой объект наблюдения, значение которого он измеряет.","currentParameter":"Настраиваемый параметр","allMapped":"Объекты наблюдения для измерения определены для всех параметров","allMappedHint":"Этот участок конструктора завершён. Можно переходить к следующему этапу построения системной типовой активности.","openCatalog":"Открыть каталог параметров","loading":"Загружаем конструктор параметров…","saving":"Сохраняем…","loadError":"Не удалось загрузить или сохранить конструктор параметров.","newTitle":"Название","newDescription":"Описание","technicalCode":"Технический код","dimension":"Измерение","valueType":"Тип значения","unit":"Каноническая единица","aggregation":"Агрегация","window":"Окно по умолчанию","allowNegative":"Разрешить отрицательные значения","choose":"Выберите…","createAndAdd":"Создать системный параметр и добавить"};

const PL: Copy = {"title":"Parametry aktywności typowej","hint":"Zbuduj wymagany zestaw parametrów nowej systemowej aktywności typowej. Dodaj istniejący parametr systemowy albo utwórz brakujący. Po każdym dodaniu wybrany zestaw pozostaje widoczny.","rule":"Dla systemowej aktywności typowej trzeba określić co najmniej jeden mierzalny parametr. Parametr określa, jaka wartość może zostać zapisana dla konkretnego wykonania aktywności; fakt powstaje po zapisaniu wartości.","selectedTitle":"Wybrane parametry","noneSelected":"Nie wybrano jeszcze parametrów.","addAdditional":"+ Dodaj kolejny parametr","chooseExisting":"Wybierz istniejący","createNew":"Utwórz nowy","searchPlaceholder":"Szukaj po nazwie, kodzie lub wymiarze…","noAvailable":"Nie znaleziono pasujących aktywnych parametrów systemowych.","addParameter":"Dodaj parametr","selectedBadge":"Wybrano","mappingReady":"Określono obiekt obserwacji dla pomiaru","mappingPending":"Nie określono jeszcze obiektu obserwacji dla pomiaru","confirmTitle":"Zakończ zestaw parametrów","confirmHint":"Gdy zestaw jest gotowy, potwierdź go. Następnie obsłuż parametry po kolei i dla każdego określ liściowy obiekt obserwacji, którego wartość mierzy.","confirmComment":"Komentarz do decyzji","confirmCommentHint":"Krótko wyjaśnij, dlaczego ten zestaw parametrów jest wystarczający.","confirmButton":"Potwierdź zestaw i kontynuuj","confirmed":"Zestaw parametrów aktywności typowej potwierdzony","confirmedHint":"Zestaw został ustalony dla tego kroku. Teraz dla każdego parametru określ liściowy obiekt obserwacji, którego wartość mierzy.","currentParameter":"Konfigurowany parametr","allMapped":"Określono obiekty obserwacji dla wszystkich pomiarów","allMappedHint":"Ta część konstruktora jest zakończona. Można przejść do kolejnego etapu.","openCatalog":"Otwórz katalog parametrów","loading":"Wczytywanie konstruktora parametrów…","saving":"Zapisywanie…","loadError":"Nie udało się wczytać lub zapisać konstruktora parametrów.","newTitle":"Nazwa","newDescription":"Opis","technicalCode":"Kod techniczny","dimension":"Wymiar","valueType":"Typ wartości","unit":"Jednostka kanoniczna","aggregation":"Agregacja","window":"Domyślne okno","allowNegative":"Dopuść wartości ujemne","choose":"Wybierz…","createAndAdd":"Utwórz parametr systemowy i dodaj"};

const UK: Copy = {"title":"Параметри типової активності","hint":"Сформуйте необхідний набір параметрів нової системної типової активності. Додайте наявний системний параметр або створіть відсутній. Після кожного додавання вибраний набір залишається видимим.","rule":"Для системної типової активності має бути визначено щонайменше один вимірюваний параметр. Параметр визначає, яке значення можна зафіксувати під час конкретного виконання активності; факт виникає після запису значення.","selectedTitle":"Вибрані параметри","noneSelected":"Параметри ще не вибрано.","addAdditional":"+ Додати ще один параметр","chooseExisting":"Вибрати наявний","createNew":"Створити новий","searchPlaceholder":"Пошук за назвою, кодом або виміром…","noAvailable":"Відповідних активних системних параметрів не знайдено.","addParameter":"Додати параметр","selectedBadge":"Вибрано","mappingReady":"Об’єкт спостереження для вимірювання визначено","mappingPending":"Об’єкт спостереження для вимірювання ще не визначено","confirmTitle":"Завершити набір параметрів","confirmHint":"Коли набір сформовано, підтвердьте його. Потім опрацьовуйте параметри по одному й для кожного визначте листовий об’єкт спостереження, значення якого він вимірює.","confirmComment":"Коментар до рішення","confirmCommentHint":"Коротко поясніть, чому цього набору параметрів достатньо для типової активності.","confirmButton":"Підтвердити набір параметрів і продовжити","confirmed":"Набір параметрів типової активності підтверджено","confirmedHint":"Набір зафіксовано для цього етапу перевірки. Тепер для кожного параметра визначте листовий об’єкт спостереження, значення якого він вимірює.","currentParameter":"Параметр, що налаштовується","allMapped":"Об’єкти спостереження для вимірювання визначено для всіх параметрів","allMappedHint":"Цю частину конструктора завершено. Можна переходити до наступного етапу створення системної типової активності.","openCatalog":"Відкрити каталог параметрів","loading":"Завантажуємо конструктор параметрів…","saving":"Зберігаємо…","loadError":"Не вдалося завантажити або зберегти конструктор параметрів.","newTitle":"Назва","newDescription":"Опис","technicalCode":"Технічний код","dimension":"Вимір","valueType":"Тип значення","unit":"Канонічна одиниця","aggregation":"Агрегація","window":"Вікно за замовчуванням","allowNegative":"Дозволити від’ємні значення","choose":"Виберіть…","createAndAdd":"Створити системний параметр і додати"};

const DE: Copy = {"title":"Parameter der typischen Aktivität","hint":"Stellen Sie den erforderlichen Parametersatz für die neue systemweite typische Aktivität zusammen. Fügen Sie einen vorhandenen Systemparameter hinzu oder erstellen Sie einen fehlenden. Der gewählte Satz bleibt sichtbar.","rule":"Für eine systemweite typische Aktivität muss mindestens ein messbarer Parameter festgelegt sein. Ein Parameter bestimmt, welcher Wert bei einer konkreten Ausführung erfasst werden kann; ein Fakt entsteht nach dem Speichern eines Werts.","selectedTitle":"Ausgewählte Parameter","noneSelected":"Noch keine Parameter ausgewählt.","addAdditional":"+ Weiteren Parameter hinzufügen","chooseExisting":"Vorhandenen auswählen","createNew":"Neu erstellen","searchPlaceholder":"Nach Name, Code oder Dimension suchen…","noAvailable":"Keine passenden aktiven Systemparameter gefunden.","addParameter":"Parameter hinzufügen","selectedBadge":"Ausgewählt","mappingReady":"Beobachtungsobjekt für die Messung bestimmt","mappingPending":"Beobachtungsobjekt für die Messung noch nicht bestimmt","confirmTitle":"Parametersatz abschließen","confirmHint":"Bestätigen Sie den vollständigen Satz. Bearbeiten Sie danach die Parameter einzeln und bestimmen Sie jeweils das Blatt-Beobachtungsobjekt, dessen Wert gemessen wird.","confirmComment":"Entscheidungskommentar","confirmCommentHint":"Begründen Sie kurz, warum dieser Parametersatz ausreicht.","confirmButton":"Parametersatz bestätigen und fortfahren","confirmed":"Parametersatz der typischen Aktivität bestätigt","confirmedHint":"Der Satz ist für diesen Prüfschritt festgelegt. Bestimmen Sie nun für jeden Parameter das Blatt-Beobachtungsobjekt, dessen Wert er misst.","currentParameter":"Konfigurierter Parameter","allMapped":"Beobachtungsobjekte für alle Messungen bestimmt","allMappedHint":"Dieser Abschnitt ist abgeschlossen. Sie können mit der nächsten Phase fortfahren.","openCatalog":"Parameterkatalog öffnen","loading":"Parameterkonstruktor wird geladen…","saving":"Speichern…","loadError":"Parameterkonstruktor konnte nicht geladen oder gespeichert werden.","newTitle":"Name","newDescription":"Beschreibung","technicalCode":"Technischer Code","dimension":"Dimension","valueType":"Werttyp","unit":"Kanonische Einheit","aggregation":"Aggregation","window":"Standardfenster","allowNegative":"Negative Werte erlauben","choose":"Auswählen…","createAndAdd":"Systemparameter erstellen und hinzufügen"};

const ES: Copy = {"title":"Parámetros de la actividad típica","hint":"Defina el conjunto de parámetros necesario para la nueva actividad típica del sistema. Añada un parámetro existente o cree uno que falte. El conjunto seleccionado permanece visible.","rule":"Una actividad típica del sistema debe tener al menos un parámetro medible definido. El parámetro determina qué valor puede registrarse para una ejecución concreta; el hecho existe después de registrar un valor.","selectedTitle":"Parámetros seleccionados","noneSelected":"Todavía no se ha seleccionado ningún parámetro.","addAdditional":"+ Añadir otro parámetro","chooseExisting":"Elegir existente","createNew":"Crear nuevo","searchPlaceholder":"Buscar por nombre, código o dimensión…","noAvailable":"No se encontraron parámetros activos que coincidan.","addParameter":"Añadir parámetro","selectedBadge":"Seleccionado","mappingReady":"Objeto de observación para la medición determinado","mappingPending":"El objeto de observación para la medición aún no está determinado","confirmTitle":"Finalizar el conjunto de parámetros","confirmHint":"Confirme el conjunto cuando esté completo. Después procese los parámetros uno a uno y determine para cada uno el objeto de observación hoja cuyo valor mide.","confirmComment":"Comentario de la decisión","confirmCommentHint":"Explique brevemente por qué este conjunto es suficiente.","confirmButton":"Confirmar el conjunto y continuar","confirmed":"Conjunto de parámetros confirmado","confirmedHint":"El conjunto queda fijado para este paso. Ahora determine para cada parámetro el objeto de observación hoja cuyo valor mide.","currentParameter":"Parámetro en configuración","allMapped":"Objetos de observación determinados para todas las mediciones","allMappedHint":"Esta parte del constructor está completa. Puede continuar con la siguiente etapa.","openCatalog":"Abrir catálogo de parámetros","loading":"Cargando constructor de parámetros…","saving":"Guardando…","loadError":"No se pudo cargar o guardar el constructor de parámetros.","newTitle":"Nombre","newDescription":"Descripción","technicalCode":"Código técnico","dimension":"Dimensión","valueType":"Tipo de valor","unit":"Unidad canónica","aggregation":"Agregación","window":"Ventana predeterminada","allowNegative":"Permitir valores negativos","choose":"Elegir…","createAndAdd":"Crear parámetro del sistema y añadirlo"};

const CS: Copy = {"title":"Parametry typické aktivity","hint":"Sestavte požadovanou sadu parametrů pro novou systémovou typickou aktivitu. Přidejte existující systémový parametr nebo vytvořte chybějící. Vybraná sada zůstává viditelná.","rule":"Pro systémovou typickou aktivitu musí být určen alespoň jeden měřitelný parametr. Parametr určuje, jakou hodnotu lze zaznamenat pro konkrétní provedení; fakt vzniká po uložení hodnoty.","selectedTitle":"Vybrané parametry","noneSelected":"Zatím nebyl vybrán žádný parametr.","addAdditional":"+ Přidat další parametr","chooseExisting":"Vybrat existující","createNew":"Vytvořit nový","searchPlaceholder":"Hledat podle názvu, kódu nebo rozměru…","noAvailable":"Nebyly nalezeny odpovídající aktivní systémové parametry.","addParameter":"Přidat parametr","selectedBadge":"Vybráno","mappingReady":"Objekt pozorování pro měření byl určen","mappingPending":"Objekt pozorování pro měření zatím nebyl určen","confirmTitle":"Dokončit sadu parametrů","confirmHint":"Jakmile je sada kompletní, potvrďte ji. Poté zpracujte parametry postupně a pro každý určete listový objekt pozorování, jehož hodnotu měří.","confirmComment":"Komentář k rozhodnutí","confirmCommentHint":"Stručně vysvětlete, proč je tato sada dostačující.","confirmButton":"Potvrdit sadu a pokračovat","confirmed":"Sada parametrů typické aktivity potvrzena","confirmedHint":"Sada je pro tento krok pevně nastavena. Nyní pro každý parametr určete listový objekt pozorování, jehož hodnotu měří.","currentParameter":"Nastavovaný parametr","allMapped":"Objekty pozorování určeny pro všechna měření","allMappedHint":"Tato část konstruktoru je dokončena. Můžete pokračovat další fází.","openCatalog":"Otevřít katalog parametrů","loading":"Načítání konstruktoru parametrů…","saving":"Ukládání…","loadError":"Konstruktor parametrů se nepodařilo načíst nebo uložit.","newTitle":"Název","newDescription":"Popis","technicalCode":"Technický kód","dimension":"Rozměr","valueType":"Typ hodnoty","unit":"Kanonická jednotka","aggregation":"Agregace","window":"Výchozí okno","allowNegative":"Povolit záporné hodnoty","choose":"Vyberte…","createAndAdd":"Vytvořit systémový parametr a přidat"};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: RU,
  pl: PL,
  uk: UK,
  de: DE,
  es: ES,
  cs: CS,
};

const DIMENSIONS = [
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
  "pressure",
  "ratio",
  "sound_level",
  "illuminance",
] as const;

const VALUE_TYPES = ["numeric", "text", "boolean", "timestamp"] as const;
const AGGREGATIONS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;
const WINDOWS = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;

function localized(
  ru: string | null | undefined,
  en: string | null | undefined,
  locale: LocaleCode,
) {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function parameterMeta(item: ParameterItem) {
  return [
    item.parameterCode,
    item.dimensionCode,
    item.valueTypeCode,
    item.canonicalUnitLabel || item.canonicalUnitCode,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CuratorTemplateParameters({ signalId, locale, onChanged }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [state, setState] = useState<ParameterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("existing");
  const [search, setSearch] = useState("");
  const [confirmComment, setConfirmComment] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDimension, setNewDimension] = useState("");
  const [newValueType, setNewValueType] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newAggregation, setNewAggregation] = useState("");
  const [newWindow, setNewWindow] = useState("");
  const [newAllowNegative, setNewAllowNegative] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const requestUrl =
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`;

    void fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ParameterState | null;
        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || payload?.errorCode || `HTTP_${response.status}`,
          );
        }
        setState(payload);
        setAdding((payload.selected?.length ?? 0) === 0);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "UNKNOWN");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [locale, signalId]);

  async function reload() {
    const response = await fetch(
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`,
      { method: "GET", cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as ParameterState | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
    }
    setState(payload);
    return payload;
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalId, locale, ...body }),
        },
      );
      const payload = (await response.json().catch(() => null)) as ParameterState | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
      }
      setState(payload);
      setAdding(false);
      setSearch("");
      onChanged();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createAndAddParameter() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/activity-parameter-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          parameterCode: newCode,
          dimensionCode: newDimension,
          valueTypeCode: newValueType,
          canonicalUnitCode: newUnit,
          allowedUnitCodes: newUnit ? [newUnit] : [],
          aggregationMethodCode: newAggregation,
          defaultWindowCode: newWindow,
          allowNegative: newAllowNegative,
        }),
      });
      const created = (await response.json().catch(() => null)) as CreatedParameterResponse | null;
      if (!response.ok || !created?.ok || !created.definition?.id) {
        throw new Error(
          created?.error || created?.errorCode || `HTTP_${response.status}`,
        );
      }

      const selectResponse = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId,
            locale,
            action: "select_parameter",
            parameterDefinitionId: created.definition.id,
            selectionSource: "created",
          }),
        },
      );
      const selected = (await selectResponse.json().catch(() => null)) as ParameterState | null;
      if (!selectResponse.ok || !selected?.ok) {
        throw new Error(
          selected?.error || selected?.errorCode || `HTTP_${selectResponse.status}`,
        );
      }

      setState(selected);
      setAdding(false);
      setNewTitle("");
      setNewDescription("");
      setNewCode("");
      setNewDimension("");
      setNewValueType("");
      setNewUnit("");
      setNewAggregation("");
      setNewWindow("");
      setNewAllowNegative(false);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">
        {copy.loading}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {copy.loadError} {error}
      </div>
    );
  }

  const selected = state.selected ?? [];
  const available = state.available ?? [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? available.filter((item) =>
        [
          item.title,
          item.parameterCode,
          item.dimensionCode,
          item.valueTypeCode,
          item.canonicalUnitCode,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : available;

  const newParameterValid = Boolean(
    newTitle.trim() &&
      /^[a-z][a-z0-9_]{1,79}$/.test(newCode.trim()) &&
      newDimension &&
      newValueType &&
      /^[a-z][a-z0-9_]{0,79}$/.test(newUnit.trim()) &&
      newAggregation &&
      newWindow,
  );

  if (state.confirmed) {
    const nextParameter = selected.find((item) => !item.mappingCompleted) ?? null;

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-sm font-extrabold text-emerald-900">{copy.confirmed}</div>
          <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.confirmedHint}</div>
        </div>

        <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
          <div className="text-sm font-extrabold text-[#263044]">{copy.selectedTitle}</div>
          <div className="mt-3 space-y-2">
            {selected.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                    <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.mappingCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {item.mappingCompleted ? copy.mappingReady : copy.mappingPending}
                  </span>
                </div>
                {item.mappingCompleted ? (
                  <div className="mt-2 text-xs leading-5 text-[#65708d]">
                    {localized(item.mappingSummaryRu, item.mappingSummaryEn, locale)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {nextParameter ? (
          <>
            <CuratorObjectBootstrap
              signalId={signalId}
              locale={locale}
              parameterDefinitionId={nextParameter.id}
              parameterTitle={nextParameter.title}
              parameterCode={nextParameter.parameterCode}
              onChanged={() => {
                void reload().catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "UNKNOWN");
                });
                onChanged();
              }}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="text-sm font-extrabold text-emerald-900">{copy.allMapped}</div>
            <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.allMappedHint}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-[#263044]">{copy.title}</div>
          <div className="mt-1 max-w-4xl text-xs leading-5 text-[#727991]">{copy.hint}</div>
        </div>
        <Link
          href={`/activity-templates?locale=${locale}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-xs font-bold text-[#34405a]"
        >
          {copy.openCatalog}
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        {copy.rule}
      </div>

      <div className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#65708d]">
        {copy.selectedTitle}
      </div>
      {selected.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-[#d8def0] bg-white px-3 py-4 text-xs text-[#7c8099]">
          {copy.noneSelected}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {selected.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                  <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                </div>
                <span className="rounded-full bg-[#eef3ff] px-2 py-1 text-[10px] font-bold text-[#3157b8]">
                  {copy.selectedBadge}
                </span>
              </div>
              {item.description ? (
                <div className="mt-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!adding && selected.length > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 py-2 text-sm font-bold text-[#34405a] disabled:opacity-40"
        >
          {copy.addAdditional}
        </button>
      ) : null}

      {adding ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("existing")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "existing" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.chooseExisting}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("new")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "new" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.createNew}
            </button>
          </div>

          {addMode === "existing" ? (
            <div className="mt-3 space-y-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
              />
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d8def0] px-3 py-4 text-xs text-[#7c8099]">
                  {copy.noAvailable}
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filtered.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e8f3] p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                        <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                        {item.description ? (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void post({
                            action: "select_parameter",
                            parameterDefinitionId: item.id,
                            selectionSource: "existing",
                          })
                        }
                        className="inline-flex min-h-9 items-center rounded-xl bg-[#3b6ef8] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {busy ? copy.saving : copy.addParameter}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newTitle}
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value.slice(0, 200))}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newDescription}
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value.slice(0, 4000))}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.technicalCode}
                <input
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value.toLowerCase().slice(0, 80))}
                  placeholder="duration"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.dimension}
                  <select value={newDimension} onChange={(event) => setNewDimension(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {DIMENSIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.valueType}
                  <select value={newValueType} onChange={(event) => setNewValueType(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {VALUE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.unit}
                  <input value={newUnit} onChange={(event) => setNewUnit(event.target.value.toLowerCase().slice(0, 80))} placeholder="minute" className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none" />
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.aggregation}
                  <select value={newAggregation} onChange={(event) => setNewAggregation(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {AGGREGATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.window}
                  <select value={newWindow} onChange={(event) => setNewWindow(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {WINDOWS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-[#4b5563]">
                  <input type="checkbox" checked={newAllowNegative} onChange={(event) => setNewAllowNegative(event.target.checked)} />
                  {copy.allowNegative}
                </label>
              </div>

              <button
                type="button"
                disabled={busy || !newParameterValid}
                onClick={() => void createAndAddParameter()}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? copy.saving : copy.createAndAdd}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="text-sm font-extrabold text-[#263044]">{copy.confirmTitle}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.confirmHint}</div>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.confirmComment}</div>
            <textarea
              value={confirmComment}
              onChange={(event) => setConfirmComment(event.target.value.slice(0, 1500))}
              placeholder={copy.confirmCommentHint}
              rows={3}
              className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{confirmComment.length}/1500</div>
          </label>
          <button
            type="button"
            disabled={busy || !confirmComment.trim()}
            onClick={() =>
              void post({
                action: "confirm_parameter_set",
                comment: confirmComment,
              })
            }
            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? copy.saving : copy.confirmButton}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 text-xs text-red-700">{copy.loadError} {error}</div>
      ) : null}
    </div>
  );
}
