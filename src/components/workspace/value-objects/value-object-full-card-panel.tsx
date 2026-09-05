"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ValueObjectAliasEditor } from "@/components/workspace/value-objects/value-object-alias-editor";
import { ValueObjectSemanticDefinitionEditor } from "@/components/workspace/value-objects/value-object-semantic-definition-editor";
import { ValueObjectSemanticRelationsManager } from "@/components/workspace/value-objects/value-object-semantic-relations-manager";
import { ValueObjectTargetReadPanel } from "@/components/workspace/value-objects/value-object-target-read-panel";
import {
  resolveSemanticRelationDescription,
  resolveSemanticRelationTitle,
} from "@/data/value-object-semantic-relation-localization";
import type {
  ValueObjectAliasProfileV1,
  ValueObjectAliasV1,
} from "@/types/reality-core/value-object-alias-recognition-v1";
import type { ValueObjectOntologyCardV1 } from "@/types/reality-core/value-object-ontology-runtime-v1";
import type {
  ValueObjectRelationTypeDto,
  ValueObjectSemanticRelationListResponse,
  ValueObjectSemanticRelationLocale,
} from "@/types/value-object-semantic-relation";
import type {
  P72B1ParameterAssignmentRead,
  P72B1TargetVersionRead,
  P72B1ValueObjectTargetReadResponse,
  P72B1ValueObjectTargetReadSuccess,
} from "@/types/value-object-target-read-v2";

type LocaleCode = ValueObjectSemanticRelationLocale;

type Props = {
  readonly valueObjectId: string;
  readonly locale: LocaleCode;
  readonly editMode: boolean;
  readonly canEdit: boolean;
  readonly initialTitle: string;
  readonly initialDescription: string | null;
  readonly initialHierarchyRelationCode: string | null;
  readonly initialNodeRoleCode: string;
  readonly initialVisibilityCode: string;
  readonly initialPrivacyClassCode: string;
  readonly definitionVersion: number;
  readonly viewHref: string;
};

type OntologyResponse = {
  readonly ok?: boolean;
  readonly card?: ValueObjectOntologyCardV1;
  readonly error?: string;
};

type Copy = {
  semantic: string;
  semanticHelp: string;
  recognition: string;
  recognitionHelp: string;
  aliases: string;
  noAliases: string;
  examplesPending: string;
  parameters: string;
  parametersHelp: string;
  leafOnly: string;
  relations: string;
  relationsHelp: string;
  noRelations: string;
  calculatedState: string;
  calculatedStateHelp: string;
  noCalculatedState: string;
  automation: string;
  automationHelp: string;
  noAutomation: string;
  evidence: string;
  evidenceHelp: string;
  loading: string;
  readFailed: string;
  canonicalKey: string;
  kind: string;
  nodeRole: string;
  hierarchy: string;
  scope: string;
  status: string;
  visibility: string;
  privacy: string;
  parent: string;
  root: string;
  origin: string;
  definitionVersion: string;
  definitionSource: string;
  created: string;
  updated: string;
  validFrom: string;
  validTo: string;
  parameter: string;
  unit: string;
  aggregation: string;
  window: string;
  currentTarget: string;
  targetSource: string;
  formula: string;
  directValue: string;
  calculated: string;
  ai: string;
  system: string;
  user: string;
  imported: string;
  expert: string;
  unknown: string;
  active: string;
  inactive: string;
  details: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    semantic: "Meaning of the object",
    semanticHelp:
      "Stable identity, ontology position and processing rules. Editing happens in this same block.",
    recognition: "How AI recognizes this object",
    recognitionHelp:
      "Names and recognition evidence that route user phrases to this same semantic object.",
    aliases: "Alternative names",
    noAliases: "No active alternative names yet.",
    examplesPending:
      "Positive/negative examples and semantic signature are not connected to the runtime card yet. No synthetic values are shown.",
    parameters: "Parameters, standards and targets",
    parametersHelp:
      "Direct measurements are allowed only for leaf objects. Root/intermediate values are calculated projections.",
    leafOnly:
      "This is not a leaf. Direct parameter facts are not written here; only calculated roll-ups may be shown.",
    relations: "Semantic relations",
    relationsHelp:
      "Meaning links do not change the structural parent and do not duplicate facts.",
    noRelations: "No active semantic relations yet.",
    calculatedState: "Current calculated state",
    calculatedStateHelp:
      "Derived values must come from deterministic rules, windowed aggregation or a versioned model.",
    noCalculatedState:
      "No derived-feature runtime is connected to this card yet. The UI intentionally shows no invented numbers.",
    automation: "Automatic calculations",
    automationHelp:
      "Shows real aggregation and normalization rules already available from parameter/target contracts.",
    noAutomation:
      "No parameter-based calculation rules are active for this object yet.",
    evidence: "Evidence, provenance and versions",
    evidenceHelp:
      "Shows where the object definition came from and which immutable definition version is current.",
    loading: "Loading the full object card…",
    readFailed: "Part of the full card could not be loaded.",
    canonicalKey: "Canonical key",
    kind: "Object kind",
    nodeRole: "Node role",
    hierarchy: "Relation to parent",
    scope: "Scope",
    status: "Status",
    visibility: "Visibility",
    privacy: "Privacy class",
    parent: "Structural parent",
    root: "Root",
    origin: "Origin",
    definitionVersion: "Definition version",
    definitionSource: "Definition source",
    created: "Created",
    updated: "Updated",
    validFrom: "Valid from",
    validTo: "Valid to",
    parameter: "Parameter",
    unit: "Unit",
    aggregation: "Aggregation",
    window: "Window",
    currentTarget: "Current target",
    targetSource: "Target source",
    formula: "Formula / normalization",
    directValue: "Direct",
    calculated: "Calculated",
    ai: "AI",
    system: "System",
    user: "User",
    imported: "Imported",
    expert: "Expert",
    unknown: "Unknown",
    active: "Active",
    inactive: "Inactive",
    details: "Details",
  },
  pl: {
    semantic: "Znaczenie obiektu",
    semanticHelp:
      "Stała tożsamość, pozycja ontologiczna i reguły przetwarzania. Edycja odbywa się w tym samym bloku.",
    recognition: "Jak AI rozpoznaje ten obiekt",
    recognitionHelp:
      "Nazwy i dane rozpoznawcze kierujące wypowiedzi użytkownika do tego samego obiektu semantycznego.",
    aliases: "Nazwy alternatywne",
    noAliases: "Brak aktywnych nazw alternatywnych.",
    examplesPending:
      "Przykłady pozytywne/negatywne i sygnatura semantyczna nie są jeszcze podłączone do karty runtime. Nie pokazujemy danych sztucznych.",
    parameters: "Parametry, normy i cele",
    parametersHelp:
      "Bezpośrednie pomiary są dozwolone tylko dla liści. Wartości korzeni i obiektów pośrednich są projekcjami obliczeniowymi.",
    leafOnly:
      "To nie jest liść. Bezpośrednie fakty parametrów nie są tu zapisywane; mogą pojawić się tylko obliczone agregacje.",
    relations: "Relacje semantyczne",
    relationsHelp:
      "Relacje znaczeniowe nie zmieniają rodzica strukturalnego i nie duplikują faktów.",
    noRelations: "Brak aktywnych relacji semantycznych.",
    calculatedState: "Bieżący stan obliczeniowy",
    calculatedStateHelp:
      "Wartości pochodne muszą pochodzić z reguł deterministycznych, agregacji okien lub wersjonowanego modelu.",
    noCalculatedState:
      "Warstwa derived features nie jest jeszcze podłączona do tej karty. Interfejs celowo nie pokazuje wymyślonych liczb.",
    automation: "Automatyczne obliczenia",
    automationHelp:
      "Pokazuje rzeczywiste reguły agregacji i normalizacji dostępne już w kontraktach parametrów i celów.",
    noAutomation: "Brak aktywnych reguł obliczeń parametrycznych dla tego obiektu.",
    evidence: "Dowody, pochodzenie i wersje",
    evidenceHelp:
      "Pokazuje pochodzenie definicji obiektu i aktualną niezmienną wersję definicji.",
    loading: "Ładowanie pełnej karty obiektu…",
    readFailed: "Nie udało się wczytać części pełnej karty.",
    canonicalKey: "Klucz kanoniczny",
    kind: "Rodzaj obiektu",
    nodeRole: "Rola węzła",
    hierarchy: "Relacja do rodzica",
    scope: "Zakres",
    status: "Status",
    visibility: "Widoczność",
    privacy: "Klasa prywatności",
    parent: "Rodzic strukturalny",
    root: "Korzeń",
    origin: "Pochodzenie",
    definitionVersion: "Wersja definicji",
    definitionSource: "Źródło definicji",
    created: "Utworzono",
    updated: "Zaktualizowano",
    validFrom: "Obowiązuje od",
    validTo: "Obowiązuje do",
    parameter: "Parametr",
    unit: "Jednostka",
    aggregation: "Agregacja",
    window: "Okno",
    currentTarget: "Aktualny cel",
    targetSource: "Źródło celu",
    formula: "Formuła / normalizacja",
    directValue: "Bezpośrednie",
    calculated: "Obliczone",
    ai: "AI",
    system: "System",
    user: "Użytkownik",
    imported: "Import",
    expert: "Ekspert",
    unknown: "Nieznane",
    active: "Aktywne",
    inactive: "Nieaktywne",
    details: "Szczegóły",
  },
  ru: {
    semantic: "Смысл объекта",
    semanticHelp:
      "Стабильная идентичность, положение в онтологии и правила обработки. В режиме редактирования этот же блок превращается в редактор.",
    recognition: "Как ИИ распознаёт этот объект",
    recognitionHelp:
      "Названия и распознавательные данные, по которым фраза пользователя направляется в этот же смысловой объект.",
    aliases: "Альтернативные названия",
    noAliases: "Активных альтернативных названий пока нет.",
    examplesPending:
      "Положительные/отрицательные примеры и semantic signature пока не подключены к runtime-карточке. Искусственные значения не показываются.",
    parameters: "Параметры, нормы и цели",
    parametersHelp:
      "Прямые измерения допустимы только для листа. Значения root/intermediate являются вычисляемыми проекциями.",
    leafOnly:
      "Это не лист. Прямые факты параметров сюда не записываются; здесь могут появляться только рассчитанные агрегаты.",
    relations: "Семантические связи",
    relationsHelp:
      "Смысловые связи не меняют структурного родителя и не копируют факты.",
    noRelations: "Активных смысловых связей пока нет.",
    calculatedState: "Текущее рассчитанное состояние",
    calculatedStateHelp:
      "Производные значения должны происходить из детерминированного правила, оконной агрегации или версионируемой модели.",
    noCalculatedState:
      "Runtime вычисляемых признаков пока не подключён к этой карточке. Интерфейс специально не показывает выдуманных чисел.",
    automation: "Автоматические расчёты",
    automationHelp:
      "Показывает реальные правила агрегации и нормализации, уже доступные в контрактах параметров и целей.",
    noAutomation:
      "Для этого объекта пока нет активных параметрических правил расчёта.",
    evidence: "Доказательства, происхождение и версии",
    evidenceHelp:
      "Показывает происхождение определения объекта и текущую неизменяемую версию определения.",
    loading: "Загружаю полную карточку объекта…",
    readFailed: "Часть полной карточки не удалось загрузить.",
    canonicalKey: "Канонический ключ",
    kind: "Вид объекта",
    nodeRole: "Роль узла",
    hierarchy: "Связь с родителем",
    scope: "Область",
    status: "Статус",
    visibility: "Видимость",
    privacy: "Класс приватности",
    parent: "Структурный родитель",
    root: "Корень",
    origin: "Происхождение",
    definitionVersion: "Версия определения",
    definitionSource: "Источник определения",
    created: "Создан",
    updated: "Обновлён",
    validFrom: "Действует с",
    validTo: "Действует до",
    parameter: "Параметр",
    unit: "Единица",
    aggregation: "Агрегация",
    window: "Окно",
    currentTarget: "Текущая цель",
    targetSource: "Источник цели",
    formula: "Формула / нормализация",
    directValue: "Прямое",
    calculated: "Расчёт",
    ai: "ИИ",
    system: "Система",
    user: "Пользователь",
    imported: "Импорт",
    expert: "Эксперт",
    unknown: "Неизвестно",
    active: "Активно",
    inactive: "Неактивно",
    details: "Подробнее",
  },
  uk: {
    semantic: "Зміст об’єкта",
    semanticHelp:
      "Стабільна ідентичність, місце в онтології та правила обробки. У режимі редагування цей самий блок стає редактором.",
    recognition: "Як ШІ розпізнає цей об’єкт",
    recognitionHelp:
      "Назви та розпізнавальні дані, за якими вислів користувача спрямовується до цього самого смислового об’єкта.",
    aliases: "Альтернативні назви",
    noAliases: "Активних альтернативних назв поки немає.",
    examplesPending:
      "Позитивні/негативні приклади та semantic signature ще не підключено до runtime-картки. Штучні значення не показуються.",
    parameters: "Параметри, норми та цілі",
    parametersHelp:
      "Прямі вимірювання дозволені лише для листа. Значення root/intermediate є обчислюваними проєкціями.",
    leafOnly:
      "Це не лист. Прямі факти параметрів сюди не записуються; тут можуть з’являтися лише розраховані агрегати.",
    relations: "Семантичні зв’язки",
    relationsHelp:
      "Смислові зв’язки не змінюють структурного батька й не копіюють факти.",
    noRelations: "Активних семантичних зв’язків поки немає.",
    calculatedState: "Поточний розрахований стан",
    calculatedStateHelp:
      "Похідні значення мають походити з детермінованого правила, віконної агрегації або версіонованої моделі.",
    noCalculatedState:
      "Runtime обчислюваних ознак ще не підключено до цієї картки. Інтерфейс навмисно не показує вигаданих чисел.",
    automation: "Автоматичні розрахунки",
    automationHelp:
      "Показує реальні правила агрегації та нормалізації, доступні у контрактах параметрів і цілей.",
    noAutomation: "Для цього об’єкта ще немає активних параметричних правил розрахунку.",
    evidence: "Докази, походження та версії",
    evidenceHelp:
      "Показує походження визначення об’єкта та поточну незмінну версію визначення.",
    loading: "Завантаження повної картки об’єкта…",
    readFailed: "Частину повної картки не вдалося завантажити.",
    canonicalKey: "Канонічний ключ",
    kind: "Вид об’єкта",
    nodeRole: "Роль вузла",
    hierarchy: "Зв’язок із батьком",
    scope: "Область",
    status: "Статус",
    visibility: "Видимість",
    privacy: "Клас приватності",
    parent: "Структурний батько",
    root: "Корінь",
    origin: "Походження",
    definitionVersion: "Версія визначення",
    definitionSource: "Джерело визначення",
    created: "Створено",
    updated: "Оновлено",
    validFrom: "Діє з",
    validTo: "Діє до",
    parameter: "Параметр",
    unit: "Одиниця",
    aggregation: "Агрегація",
    window: "Вікно",
    currentTarget: "Поточна ціль",
    targetSource: "Джерело цілі",
    formula: "Формула / нормалізація",
    directValue: "Пряме",
    calculated: "Розрахунок",
    ai: "ШІ",
    system: "Система",
    user: "Користувач",
    imported: "Імпорт",
    expert: "Експерт",
    unknown: "Невідомо",
    active: "Активно",
    inactive: "Неактивно",
    details: "Докладніше",
  },
  de: {
    semantic: "Bedeutung des Objekts",
    semanticHelp:
      "Stabile Identität, Ontologieposition und Verarbeitungsregeln. Im Bearbeitungsmodus bleibt der Block an derselben Stelle.",
    recognition: "Wie die KI dieses Objekt erkennt",
    recognitionHelp:
      "Namen und Erkennungsdaten, die Nutzeraussagen demselben semantischen Objekt zuordnen.",
    aliases: "Alternative Namen",
    noAliases: "Noch keine aktiven alternativen Namen.",
    examplesPending:
      "Positive/negative Beispiele und semantic signature sind noch nicht an die Runtime-Karte angeschlossen. Keine erfundenen Werte.",
    parameters: "Parameter, Normen und Ziele",
    parametersHelp:
      "Direkte Messwerte sind nur für Blätter zulässig. Werte von Root/Intermediate sind berechnete Projektionen.",
    leafOnly:
      "Dies ist kein Blatt. Direkte Parameterfakten werden hier nicht gespeichert; nur berechnete Roll-ups dürfen erscheinen.",
    relations: "Semantische Beziehungen",
    relationsHelp:
      "Bedeutungsbeziehungen ändern den strukturellen Elternknoten nicht und duplizieren keine Fakten.",
    noRelations: "Noch keine aktiven semantischen Beziehungen.",
    calculatedState: "Aktueller berechneter Zustand",
    calculatedStateHelp:
      "Abgeleitete Werte müssen aus deterministischen Regeln, Zeitfenstern oder einem versionierten Modell stammen.",
    noCalculatedState:
      "Die Derived-Feature-Runtime ist noch nicht an diese Karte angeschlossen. Es werden bewusst keine erfundenen Zahlen angezeigt.",
    automation: "Automatische Berechnungen",
    automationHelp:
      "Zeigt reale Aggregations- und Normalisierungsregeln aus den vorhandenen Parameter- und Zielverträgen.",
    noAutomation: "Für dieses Objekt sind noch keine parametrischen Berechnungsregeln aktiv.",
    evidence: "Evidenz, Herkunft und Versionen",
    evidenceHelp:
      "Zeigt die Herkunft der Objektdefinition und die aktuelle unveränderliche Definitionsversion.",
    loading: "Vollständige Objektkarte wird geladen…",
    readFailed: "Ein Teil der vollständigen Karte konnte nicht geladen werden.",
    canonicalKey: "Kanonischer Schlüssel",
    kind: "Objektart",
    nodeRole: "Knotenrolle",
    hierarchy: "Beziehung zum Elternobjekt",
    scope: "Geltungsbereich",
    status: "Status",
    visibility: "Sichtbarkeit",
    privacy: "Datenschutzklasse",
    parent: "Strukturelles Elternobjekt",
    root: "Wurzel",
    origin: "Herkunft",
    definitionVersion: "Definitionsversion",
    definitionSource: "Definitionsquelle",
    created: "Erstellt",
    updated: "Aktualisiert",
    validFrom: "Gültig ab",
    validTo: "Gültig bis",
    parameter: "Parameter",
    unit: "Einheit",
    aggregation: "Aggregation",
    window: "Fenster",
    currentTarget: "Aktuelles Ziel",
    targetSource: "Zielquelle",
    formula: "Formel / Normalisierung",
    directValue: "Direkt",
    calculated: "Berechnet",
    ai: "KI",
    system: "System",
    user: "Benutzer",
    imported: "Import",
    expert: "Experte",
    unknown: "Unbekannt",
    active: "Aktiv",
    inactive: "Inaktiv",
    details: "Details",
  },
  es: {
    semantic: "Significado del objeto",
    semanticHelp:
      "Identidad estable, posición ontológica y reglas de tratamiento. La edición permanece en este mismo bloque.",
    recognition: "Cómo la IA reconoce este objeto",
    recognitionHelp:
      "Nombres y datos de reconocimiento que dirigen las frases del usuario al mismo objeto semántico.",
    aliases: "Nombres alternativos",
    noAliases: "Todavía no hay nombres alternativos activos.",
    examplesPending:
      "Los ejemplos positivos/negativos y la semantic signature aún no están conectados a la tarjeta runtime. No se muestran valores inventados.",
    parameters: "Parámetros, normas y objetivos",
    parametersHelp:
      "Las mediciones directas solo están permitidas en hojas. Los valores root/intermediate son proyecciones calculadas.",
    leafOnly:
      "Este objeto no es una hoja. Aquí no se escriben hechos directos de parámetros; solo pueden aparecer agregados calculados.",
    relations: "Relaciones semánticas",
    relationsHelp:
      "Las relaciones de significado no cambian el padre estructural ni duplican hechos.",
    noRelations: "Todavía no hay relaciones semánticas activas.",
    calculatedState: "Estado calculado actual",
    calculatedStateHelp:
      "Los valores derivados deben proceder de reglas deterministas, ventanas o un modelo versionado.",
    noCalculatedState:
      "La runtime de derived features aún no está conectada a esta tarjeta. La interfaz no muestra números inventados.",
    automation: "Cálculos automáticos",
    automationHelp:
      "Muestra reglas reales de agregación y normalización disponibles en los contratos actuales.",
    noAutomation: "No hay reglas paramétricas de cálculo activas para este objeto.",
    evidence: "Evidencia, procedencia y versiones",
    evidenceHelp:
      "Muestra de dónde procede la definición y cuál es su versión inmutable actual.",
    loading: "Cargando la tarjeta completa…",
    readFailed: "No se pudo cargar una parte de la tarjeta completa.",
    canonicalKey: "Clave canónica",
    kind: "Tipo de objeto",
    nodeRole: "Rol del nodo",
    hierarchy: "Relación con el padre",
    scope: "Ámbito",
    status: "Estado",
    visibility: "Visibilidad",
    privacy: "Clase de privacidad",
    parent: "Padre estructural",
    root: "Raíz",
    origin: "Origen",
    definitionVersion: "Versión de definición",
    definitionSource: "Fuente de definición",
    created: "Creado",
    updated: "Actualizado",
    validFrom: "Válido desde",
    validTo: "Válido hasta",
    parameter: "Parámetro",
    unit: "Unidad",
    aggregation: "Agregación",
    window: "Ventana",
    currentTarget: "Objetivo actual",
    targetSource: "Fuente del objetivo",
    formula: "Fórmula / normalización",
    directValue: "Directo",
    calculated: "Calculado",
    ai: "IA",
    system: "Sistema",
    user: "Usuario",
    imported: "Importado",
    expert: "Experto",
    unknown: "Desconocido",
    active: "Activo",
    inactive: "Inactivo",
    details: "Detalles",
  },
  cs: {
    semantic: "Význam objektu",
    semanticHelp:
      "Stabilní identita, pozice v ontologii a pravidla zpracování. Při úpravách zůstává blok na stejném místě.",
    recognition: "Jak AI rozpoznává tento objekt",
    recognitionHelp:
      "Názvy a rozpoznávací data, která směrují uživatelské věty ke stejnému sémantickému objektu.",
    aliases: "Alternativní názvy",
    noAliases: "Zatím nejsou aktivní alternativní názvy.",
    examplesPending:
      "Pozitivní/negativní příklady a semantic signature ještě nejsou připojeny k runtime kartě. Nezobrazují se umělé hodnoty.",
    parameters: "Parametry, normy a cíle",
    parametersHelp:
      "Přímá měření jsou povolena jen pro listy. Hodnoty root/intermediate jsou vypočtené projekce.",
    leafOnly:
      "Toto není list. Přímé parametrické fakty se sem nezapisují; mohou se zde objevit jen vypočtené agregace.",
    relations: "Sémantické vztahy",
    relationsHelp:
      "Významové vztahy nemění strukturálního rodiče a neduplikují fakta.",
    noRelations: "Zatím nejsou aktivní sémantické vztahy.",
    calculatedState: "Aktuální vypočtený stav",
    calculatedStateHelp:
      "Odvozené hodnoty musí pocházet z deterministických pravidel, časových oken nebo verzovaného modelu.",
    noCalculatedState:
      "Runtime derived features ještě není připojen k této kartě. Rozhraní záměrně nezobrazuje vymyšlená čísla.",
    automation: "Automatické výpočty",
    automationHelp:
      "Zobrazuje skutečná pravidla agregace a normalizace z aktuálních kontraktů parametrů a cílů.",
    noAutomation: "Pro tento objekt zatím nejsou aktivní parametrická pravidla výpočtu.",
    evidence: "Důkazy, původ a verze",
    evidenceHelp:
      "Zobrazuje původ definice objektu a aktuální neměnnou verzi definice.",
    loading: "Načítání úplné karty objektu…",
    readFailed: "Část úplné karty se nepodařilo načíst.",
    canonicalKey: "Kanonický klíč",
    kind: "Druh objektu",
    nodeRole: "Role uzlu",
    hierarchy: "Vztah k rodiči",
    scope: "Rozsah",
    status: "Stav",
    visibility: "Viditelnost",
    privacy: "Třída soukromí",
    parent: "Strukturální rodič",
    root: "Kořen",
    origin: "Původ",
    definitionVersion: "Verze definice",
    definitionSource: "Zdroj definice",
    created: "Vytvořeno",
    updated: "Aktualizováno",
    validFrom: "Platí od",
    validTo: "Platí do",
    parameter: "Parametr",
    unit: "Jednotka",
    aggregation: "Agregace",
    window: "Okno",
    currentTarget: "Aktuální cíl",
    targetSource: "Zdroj cíle",
    formula: "Vzorec / normalizace",
    directValue: "Přímé",
    calculated: "Vypočtené",
    ai: "AI",
    system: "Systém",
    user: "Uživatel",
    imported: "Import",
    expert: "Expert",
    unknown: "Neznámé",
    active: "Aktivní",
    inactive: "Neaktivní",
    details: "Podrobnosti",
  },
};

function humanize(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null | undefined, locale: LocaleCode): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const localeMap: Record<LocaleCode, string> = {
    en: "en-US",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };
  return new Intl.DateTimeFormat(localeMap[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function cardClassName() {
  return "rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm";
}

function Field({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
        {label}
      </div>
      <div
        className={[
          "mt-2 break-words text-[13px] font-semibold text-[#111827]",
          mono ? "font-mono text-[12px]" : "",
        ].join(" ")}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function SourceBadge({
  source,
  copy,
}: {
  readonly source: string | null | undefined;
  readonly copy: Copy;
}) {
  const normalized = (source ?? "").toLowerCase();
  let label = source ? humanize(source) : copy.unknown;
  let className = "border-slate-200 bg-slate-50 text-slate-700";

  if (normalized.includes("ai")) {
    label = copy.ai;
    className = "border-violet-200 bg-violet-50 text-violet-800";
  } else if (normalized.includes("system")) {
    label = copy.system;
    className = "border-blue-200 bg-blue-50 text-blue-800";
  } else if (normalized.includes("expert")) {
    label = copy.expert;
    className = "border-indigo-200 bg-indigo-50 text-indigo-800";
  } else if (normalized.includes("import")) {
    label = copy.imported;
    className = "border-cyan-200 bg-cyan-50 text-cyan-800";
  } else if (normalized.includes("user") || normalized.includes("manual")) {
    label = copy.user;
    className = "border-slate-200 bg-slate-50 text-slate-800";
  }

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
        className,
      ].join(" ")}
      title={source ?? undefined}
    >
      {label}
    </span>
  );
}

function FxBadge({ copy }: { readonly copy: Copy }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
      ƒx {copy.calculated}
    </span>
  );
}

function SectionHeader({
  title,
  help,
  badge,
}: {
  readonly title: string;
  readonly help: string;
  readonly badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[20px] font-bold text-[#111827]">{title}</h2>
        <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[#7c8099]">
          {help}
        </p>
      </div>
      {badge}
    </div>
  );
}

function targetValue(target: P72B1TargetVersionRead | null): string {
  if (!target) {
    return "—";
  }
  if (target.originalMinNumeric !== null && target.originalMaxNumeric !== null) {
    return `${target.originalMinNumeric}–${target.originalMaxNumeric} ${
      target.originalUnitCode ?? ""
    }`.trim();
  }
  if (target.originalValueNumeric !== null) {
    return `${target.originalValueNumeric} ${target.originalUnitCode ?? ""}`.trim();
  }
  if (target.originalValueBoolean !== null) {
    return target.originalValueBoolean ? "true" : "false";
  }
  return target.originalValueText ?? "—";
}

function ReadOnlyParameterCard({
  assignment,
  copy,
}: {
  readonly assignment: P72B1ParameterAssignmentRead;
  readonly copy: Copy;
}) {
  const target = assignment.currentTarget;
  const formulaLabel = target
    ? target.normalizationStateCode === "derived"
      ? `${humanize(target.normalizationPolicyCode)}${
          target.normalizationFormulaVersion
            ? ` · ${target.normalizationFormulaVersion}`
            : ""
        }`
      : target.normalizationStateCode === "formula_required"
        ? "formula required"
        : humanize(target.normalizationPolicyCode)
    : "—";

  return (
    <article className="rounded-2xl border border-[#e7eaf3] bg-[#fafbff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#3b6ef8]">
            {copy.parameter}
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#111827]">
            {assignment.parameter.title}
          </div>
          <div className="mt-1 font-mono text-[11px] text-[#7c8099]">
            {assignment.parameter.parameterCode}
          </div>
        </div>
        <span className="rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-2.5 py-1 text-[11px] font-bold text-[#3b6ef8]">
          {humanize(assignment.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={copy.unit} value={humanize(assignment.parameter.canonicalUnitCode)} />
        <Field
          label={copy.aggregation}
          value={humanize(assignment.parameter.aggregationMethodCode)}
        />
        <Field
          label={copy.window}
          value={humanize(assignment.parameter.defaultWindowCode)}
        />
        <Field label={copy.currentTarget} value={targetValue(target)} />
      </div>

      {target ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SourceBadge source={target.sourceTypeCode} copy={copy} />
          {target.normalizationStateCode === "derived" ||
          target.normalizationStateCode === "formula_required" ? (
            <FxBadge copy={copy} />
          ) : null}
          <span className="text-[12px] text-[#5a5f7a]">
            {copy.formula}: {formulaLabel}
          </span>
        </div>
      ) : null}
    </article>
  );
}

export function ValueObjectFullCardPanel({
  valueObjectId,
  locale,
  editMode,
  canEdit,
  initialTitle,
  initialDescription,
  initialHierarchyRelationCode,
  initialNodeRoleCode,
  initialVisibilityCode,
  initialPrivacyClassCode,
  definitionVersion,
  viewHref,
}: Props) {
  const copy = COPY[locale];
  const [ontology, setOntology] = useState<ValueObjectOntologyCardV1 | null>(null);
  const [aliases, setAliases] = useState<ValueObjectAliasProfileV1 | null>(null);
  const [standards, setStandards] =
    useState<P72B1ValueObjectTargetReadResponse | null>(null);
  const [relations, setRelations] =
    useState<ValueObjectSemanticRelationListResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function readJson(url: string) {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }

    void (async () => {
      setLoading(true);
      setErrors([]);

      const nextErrors: string[] = [];

      try {
        const [ontologyResult, aliasResult, standardsResult, relationResult] =
          await Promise.all([
            readJson(
              `/api/value-objects/ontology/${encodeURIComponent(
                valueObjectId,
              )}?locale=${encodeURIComponent(locale)}`,
            ),
            readJson(
              `/api/value-objects/${encodeURIComponent(
                valueObjectId,
              )}/aliases?locale=${encodeURIComponent(locale)}`,
            ),
            initialNodeRoleCode === "leaf"
              ? readJson(
                  `/api/value-objects/${encodeURIComponent(
                    valueObjectId,
                  )}/standards`,
                )
              : Promise.resolve(null),
            readJson(
              `/api/value-objects/${encodeURIComponent(
                valueObjectId,
              )}/relations?locale=${encodeURIComponent(locale)}`,
            ),
          ]);

        const ontologyPayload = ontologyResult.payload as OntologyResponse;
        if (
          ontologyResult.response.ok &&
          ontologyPayload.ok &&
          ontologyPayload.card
        ) {
          setOntology(ontologyPayload.card);
        } else {
          nextErrors.push(
            `ontology: ${ontologyPayload.error ?? ontologyResult.response.status}`,
          );
        }

        const aliasPayload = aliasResult.payload as
          | ValueObjectAliasProfileV1
          | { error?: string; ok?: boolean };
        if (
          aliasResult.response.ok &&
          "ok" in aliasPayload &&
          aliasPayload.ok === true &&
          "aliases" in aliasPayload
        ) {
          setAliases(aliasPayload as ValueObjectAliasProfileV1);
        } else {
          nextErrors.push(
            `aliases: ${
              "error" in aliasPayload && aliasPayload.error
                ? aliasPayload.error
                : aliasResult.response.status
            }`,
          );
        }

        if (standardsResult) {
          const standardsPayload =
            standardsResult.payload as P72B1ValueObjectTargetReadResponse;
          if (
            standardsResult.response.ok ||
            (standardsPayload &&
              typeof standardsPayload === "object" &&
              "ok" in standardsPayload)
          ) {
            setStandards(standardsPayload);
          } else {
            nextErrors.push(`standards: ${standardsResult.response.status}`);
          }
        } else {
          setStandards(null);
        }

        const relationPayload =
          relationResult.payload as ValueObjectSemanticRelationListResponse;
        if (relationResult.response.ok && relationPayload.ok) {
          setRelations(relationPayload);
        } else {
          nextErrors.push(
            `relations: ${relationPayload.error ?? relationResult.response.status}`,
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          nextErrors.push(
            error instanceof Error ? error.message : "unknown read error",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setErrors(nextErrors);
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [valueObjectId, locale, initialNodeRoleCode]);

  const activeAliases = useMemo(
    () => (aliases?.aliases ?? []).filter((alias) => alias.recognitionActive),
    [aliases?.aliases],
  );

  const activeRelations = useMemo(
    () => (relations?.relations ?? []).filter((relation) => relation.status === "active"),
    [relations?.relations],
  );

  const relationTypesByCode = useMemo(
    () =>
      new Map(
        (relations?.relationTypes ?? []).map((type) => [
          type.relationTypeCode,
          type,
        ]),
      ),
    [relations?.relationTypes],
  );

  const standardsSuccess: P72B1ValueObjectTargetReadSuccess | null =
    standards?.ok ? standards : null;

  if (loading && !ontology) {
    return (
      <section className={cardClassName()}>
        <p className="text-[14px] text-[#5a5f7a]">{copy.loading}</p>
      </section>
    );
  }

  const node = ontology?.valueObject ?? null;
  const isLeaf = node?.nodeRoleCode === "leaf" || initialNodeRoleCode === "leaf";

  return (
    <div className="grid gap-5" data-arctor-value-object-full-card-v1>
      {errors.length > 0 ? (
        <details className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900">
          <summary className="cursor-pointer font-bold">{copy.readFailed}</summary>
          <ul className="mt-2 grid gap-1 font-mono">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className={cardClassName()}>
        <SectionHeader title={copy.semantic} help={copy.semanticHelp} />

        {editMode && canEdit ? (
          <div className="mt-5">
            <ValueObjectSemanticDefinitionEditor
              valueObjectId={valueObjectId}
              locale={locale}
              initialTitle={initialTitle}
              initialDescription={initialDescription}
              initialHierarchyRelationCode={initialHierarchyRelationCode}
              nodeRoleCode={initialNodeRoleCode}
              initialVisibilityCode={initialVisibilityCode}
              initialPrivacyClassCode={initialPrivacyClassCode}
              definitionVersion={definitionVersion}
              viewHref={viewHref}
            />
          </div>
        ) : node ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label={copy.canonicalKey} value={node.canonicalKey} mono />
            <Field label={copy.kind} value={humanize(node.objectKindCode)} />
            <Field label={copy.nodeRole} value={humanize(node.nodeRoleCode)} />
            <Field label={copy.hierarchy} value={humanize(node.hierarchyRelationCode)} />
            <Field label={copy.scope} value={humanize(node.scopeCode)} />
            <Field label={copy.status} value={humanize(node.statusCode)} />
            <Field label={copy.visibility} value={humanize(node.visibilityCode)} />
            <Field label={copy.privacy} value={humanize(node.privacyClassCode)} />
            <Field
              label={copy.parent}
              value={ontology?.parent?.title ?? "—"}
            />
            <Field label={copy.root} value={ontology?.root?.title ?? "—"} />
            <Field
              label={copy.definitionVersion}
              value={String(node.definitionVersion)}
            />
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-[#7c8099]">{copy.readFailed}</p>
        )}
      </section>

      <section className={cardClassName()}>
        <SectionHeader
          title={copy.recognition}
          help={copy.recognitionHelp}
          badge={<SourceBadge source="ai_recognition" copy={copy} />}
        />

        {editMode && canEdit ? (
          <div className="mt-5">
            <ValueObjectAliasEditor valueObjectId={valueObjectId} locale={locale} />
          </div>
        ) : (
          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
              {copy.aliases}
            </div>
            {activeAliases.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeAliases.map((alias: ValueObjectAliasV1) => (
                  <span
                    key={alias.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dfe4ff] bg-[#f5f7ff] px-3 py-1.5 text-[12px] font-semibold text-[#334155]"
                    title={`${alias.sourceType} · ${alias.status}`}
                  >
                    {alias.aliasText}
                    {alias.locale ? (
                      <span className="text-[10px] uppercase text-[#7c8099]">
                        {alias.locale}
                      </span>
                    ) : null}
                    {alias.sourceType.toLowerCase().includes("ai") ? (
                      <span className="text-[10px] font-bold text-violet-700">
                        {copy.ai}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-[#7c8099]">{copy.noAliases}</p>
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-dashed border-[#dfe3f1] bg-[#fafbff] p-4 text-[12px] leading-5 text-[#7c8099]">
          {copy.examplesPending}
        </div>
      </section>

      <section className={cardClassName()}>
        <SectionHeader title={copy.parameters} help={copy.parametersHelp} />

        {editMode && canEdit && isLeaf ? (
          <div className="mt-5">
            <ValueObjectTargetReadPanel valueObjectId={valueObjectId} />
          </div>
        ) : isLeaf && standardsSuccess ? (
          <div className="mt-5 grid gap-3">
            {standardsSuccess.assignments.length > 0 ? (
              standardsSuccess.assignments.map((assignment) => (
                <ReadOnlyParameterCard
                  key={assignment.id}
                  assignment={assignment}
                  copy={copy}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dfe3f1] bg-[#fafbff] p-5 text-[13px] text-[#7c8099]">
                {copy.noAutomation}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#dfe3f1] bg-[#fafbff] p-5 text-[13px] leading-5 text-[#5a5f7a]">
            {isLeaf ? copy.noAutomation : copy.leafOnly}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className={cardClassName()}>
          <SectionHeader title={copy.relations} help={copy.relationsHelp} />

          {editMode && canEdit ? (
            <div className="mt-5">
              <ValueObjectSemanticRelationsManager
                valueObjectId={valueObjectId}
                locale={locale}
              />
            </div>
          ) : activeRelations.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {activeRelations.map((relation) => {
                const fallback: ValueObjectRelationTypeDto = {
                  relationTypeCode: relation.relationTypeCode,
                  directionalityCode: relation.directionalityCode,
                  fromScopeCode: "ordinary",
                  toScopeCode: "ordinary",
                  titleKey: relation.titleKey,
                  descriptionKey: relation.descriptionKey,
                  reverseTitleKey: relation.reverseTitleKey,
                  reverseDescriptionKey: relation.reverseDescriptionKey,
                  allowSelfLink: false,
                  contractVersion: 1,
                  displayOrder: 9999,
                  status: "active",
                };
                const type =
                  relationTypesByCode.get(relation.relationTypeCode) ?? fallback;
                const title = resolveSemanticRelationTitle(
                  type,
                  locale,
                  relation.perspective,
                );
                const description = resolveSemanticRelationDescription(
                  type,
                  locale,
                  relation.perspective,
                );
                const arrow =
                  relation.perspective === "incoming"
                    ? "←"
                    : relation.perspective === "symmetric"
                      ? "↔"
                      : "→";

                return (
                  <div
                    key={relation.id}
                    className="rounded-2xl border border-[#e7eaf3] bg-[#fafbff] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                          {title} {arrow}
                        </div>
                        <div className="mt-1 text-[15px] font-bold text-[#111827]">
                          {relation.relatedValueObject.title}
                        </div>
                        <p className="mt-2 text-[12px] leading-5 text-[#7c8099]">
                          {description}
                        </p>
                      </div>
                      <SourceBadge source={relation.provenanceCode} copy={copy} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-[#7c8099]">{copy.noRelations}</p>
          )}
        </section>

        <section className={cardClassName()}>
          <SectionHeader
            title={copy.calculatedState}
            help={copy.calculatedStateHelp}
            badge={<FxBadge copy={copy} />}
          />
          <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-[13px] leading-5 text-[#4b5563]">
            {copy.noCalculatedState}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className={cardClassName()}>
          <SectionHeader
            title={copy.automation}
            help={copy.automationHelp}
            badge={<FxBadge copy={copy} />}
          />

          {standardsSuccess && standardsSuccess.assignments.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {standardsSuccess.assignments.map((assignment) => {
                const target = assignment.currentTarget;
                return (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-[#e7eaf3] bg-[#fafbff] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-bold text-[#111827]">
                          {assignment.parameter.title}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[#7c8099]">
                          {assignment.parameter.parameterCode}
                        </div>
                      </div>
                      <FxBadge copy={copy} />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Field
                        label={copy.aggregation}
                        value={humanize(assignment.parameter.aggregationMethodCode)}
                      />
                      <Field
                        label={copy.window}
                        value={humanize(assignment.parameter.defaultWindowCode)}
                      />
                      <Field
                        label={copy.formula}
                        value={
                          target
                            ? `${humanize(target.normalizationStateCode)} · ${humanize(
                                target.normalizationPolicyCode,
                              )}${
                                target.normalizationFormulaVersion
                                  ? ` · ${target.normalizationFormulaVersion}`
                                  : ""
                              }`
                            : "—"
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-[#7c8099]">{copy.noAutomation}</p>
          )}
        </section>

        <section className={cardClassName()}>
          <SectionHeader title={copy.evidence} help={copy.evidenceHelp} />

          {node ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                  {copy.origin}
                </div>
                <div className="mt-2">
                  <SourceBadge source={node.originTypeCode} copy={copy} />
                </div>
                <div className="mt-2 font-mono text-[11px] text-[#7c8099]">
                  {node.originTypeCode}
                </div>
              </div>
              <Field
                label={copy.definitionVersion}
                value={String(node.definitionVersion)}
              />
              <Field
                label={copy.definitionSource}
                value={ontology?.latestDefinition?.sourceContext ?? "—"}
              />
              <Field
                label={copy.created}
                value={formatDate(node.createdAt, locale)}
              />
              <Field
                label={copy.updated}
                value={formatDate(node.updatedAt, locale)}
              />
              <Field
                label={copy.validFrom}
                value={formatDate(node.validFrom, locale)}
              />
              <Field
                label={copy.validTo}
                value={formatDate(node.validTo, locale)}
              />
              <Field
                label="created_by_actor_id"
                value={node.createdByActorId ?? "—"}
                mono
              />
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-[#7c8099]">{copy.readFailed}</p>
          )}

          {ontology?.kind ? (
            <details className="mt-4 rounded-2xl border border-[#edf0f7] bg-[#fafbff] p-4">
              <summary className="cursor-pointer text-[13px] font-bold text-[#334155]">
                {copy.details}
              </summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#111827] p-4 text-[11px] leading-5 text-[#e5e7eb]">
                {JSON.stringify(
                  {
                    kindPolicy: ontology.kind,
                    allowedLifecycleActions: ontology.allowedLifecycleActions,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}
        </section>
      </div>
    </div>
  );
}
