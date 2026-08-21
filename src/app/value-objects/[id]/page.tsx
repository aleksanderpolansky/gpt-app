import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import {
  ValueObjectProfileTopGrid,
  type ValueObjectOwnerPresentation,
  type ValueObjectPublicLocation,
  type ValueObjectSummaryItem,
} from "@/components/workspace/value-objects/value-object-profile-top-grid";
import { ValueObjectSemanticRelationsManager } from "@/components/workspace/value-objects/value-object-semantic-relations-manager";
import { ValueObjectFullCardPanel } from "@/components/workspace/value-objects/value-object-full-card-panel";
import { ValueObjectAnalyticsProfileManager } from "@/components/workspace/value-objects/value-object-analytics-profile-manager";
import { ActivityScheduleDisplay } from "./activity-schedule-display";
import { ActivityMutualLinksPanel } from "@/components/activity/p5b/activity-mutual-links-panel";
import { isValueObjectLeafKindV2 } from "@/types/reality-core/reality-core-contracts-v2";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ValueObjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
    mode?: string | string[];
  }>;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: string | null;
  usage_scope: string | null;
  value_type: string | null;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  node_role_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  instance_of_value_object_id: string | null;
  status: string;
  visibility: string | null;
  privacy_level: string | null;
  sensitivity_level: string | null;
  source: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  organization_id: string | null;
  metadata_json: Record<string, unknown> | null;
  canonical_key: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  facet_code: string | null;
  object_kind_code: string | null;
  ontology_node_role_code: string | null;
  hierarchy_relation_code: string | null;
  visibility_code: string | null;
  privacy_class_code: string | null;
  definition_version: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TreeNodeRow = {
  id: string;
  title: string;
  canonical_key: string | null;
  node_role_code: string | null;
  object_kind: string | null;
  object_kind_code: string | null;
  ontology_node_role_code: string | null;
  branch_type_code: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  status: string;
  created_at: string | null;
};

type CriterionRow = {
  id: string;
  criterion_type_code: string;
  title: string;
  status: string;
};

type PlannedActivityRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  schedule_mode_code: string | null;
  scheduled_date: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  deadline_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string | null;
};

type ActorPublicProfileRow = {
  actor_id: string;
  profile_kind: string;
  public_slug: string | null;
  display_name: string;
  image_url: string | null;
  is_public: boolean | null;
};

type ActorRow = {
  id: string;
  actor_type: string | null;
  display_name: string | null;
};

type OwnerOrganizationRow = {
  id: string;
  organization_name: string;
  organization_type: string | null;
  public_slug: string | null;
  logo_url: string | null;
};

type OwnerOrganizationLocationRow = {
  label: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  street_address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  address_visibility: string | null;
};

type ValueObjectPublicProfileMetadata = {
  imageUrl: string | null;
  location: ValueObjectPublicLocation | null;
};

type Copy = {
  rootEyebrow: string;
  leafEyebrow: string;
  intermediateEyebrow: string;
  genericEyebrow: string;
  path: string;
  back: string;
  edit: string;
  editLater: string;
  restructure: string;
  parametersAndTargets: string;
  parametersAndTargetsReadOnly: string;
  addLeaf: string;
  addLeafLater: string;
  addIntermediate: string;
  addIntermediateLater: string;
  description: string;
  branch: string;
  kind: string;
  role: string;
  status: string;
  visibility: string;
  privacy: string;
  sensitivity: string;
  children: string;
  noChildren: string;
  plannedActivities: string;
  giftCertificates: string;
  noPlannedActivities: string;
  noGiftCertificates: string;
  scheduledActivities: string;
  openActivity: string;
  details: string;
  giftCertificateTitle: string;
  addPlannedActivity: string;
  addGiftCertificate: string;
  activityCreateLater: string;
  criteria: string;
  noCriteria: string;
  relations: string;
  relationsLater: string;
  directChildren: string;
  descendantLeaves: string;
  successCriteria: string;
  failureCriteria: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    rootEyebrow: "Root observation object",
    leafEyebrow: "Leaf observation object",
    intermediateEyebrow: "Intermediate observation object",
    path: "Path",
    genericEyebrow: "Observation object",
    back: "← Back to observation objects",
    edit: "Edit",
    editLater: "Editing is not available in this authoring step yet.",
    restructure: "Restructure tree",
    parametersAndTargets: "Parameters and targets",
    parametersAndTargetsReadOnly: "Read-only parameter and target view.",
    addLeaf: "Add leaf",
    addLeafLater: "Leaves can be created only under structural objects.",
    addIntermediate: "Add intermediate",
    addIntermediateLater: "Intermediate objects can be created only under structural objects.",
    description: "Description",
    branch: "Branch",
    kind: "Object kind",
    role: "Node role",
    status: "Status",
    visibility: "Visibility",
    privacy: "Privacy",
    sensitivity: "Sensitivity",
    children: "Children tree",
    noChildren: "This object has no child objects yet.",
    plannedActivities: "Planned activities",
    giftCertificates: "Gift certificates",
    noPlannedActivities: "No planned activities are linked to this object yet.",
    noGiftCertificates: "No gift certificates have been created for this product or service yet.",
    scheduledActivities: "With dates",
    openActivity: "Open activity",
    details: "Details",
    giftCertificateTitle: "Gift certificate",
    addPlannedActivity: "Add planned activity",
    addGiftCertificate: "Create offer",
    activityCreateLater: "Creation from this card will be enabled with the dedicated activity template.",
    criteria: "Outcome criteria",
    noCriteria: "No success or failure criteria have been added yet.",
    relations: "Semantic relations",
    relationsLater: "Semantic relations are not available yet.",
    directChildren: "Direct children",
    descendantLeaves: "Leaf descendants",
    successCriteria: "Success criteria",
    failureCriteria: "Failure criteria",
    source: "Source",
    createdAt: "Created",
    updatedAt: "Updated",
  },
  pl: {
    rootEyebrow: "Korzeniowy obiekt obserwacji",
    leafEyebrow: "Liściowy obiekt obserwacji",
    intermediateEyebrow: "Pośredni obiekt obserwacji",
    path: "Ścieżka",
    genericEyebrow: "Obiekt obserwacji",
    back: "← Wróć do obiektów obserwacji",
    edit: "Edytuj",
    editLater: "Edycja nie jest jeszcze dostępna na tym etapie.",
    restructure: "Przebuduj drzewo",
    parametersAndTargets: "Parametry i cele",
    parametersAndTargetsReadOnly: "Widok parametrów i celów tylko do odczytu.",
    addLeaf: "Dodaj liść",
    addLeafLater: "Liście można tworzyć tylko pod obiektami strukturalnymi.",
    addIntermediate: "Dodaj obiekt pośredni",
    addIntermediateLater: "Obiekty pośrednie można tworzyć tylko pod obiektami strukturalnymi.",
    description: "Opis",
    branch: "Gałąź",
    kind: "Rodzaj obiektu",
    role: "Rola węzła",
    status: "Status",
    visibility: "Widoczność",
    privacy: "Prywatność",
    sensitivity: "Wrażliwość",
    children: "Drzewo obiektów podrzędnych",
    noChildren: "Ten obiekt nie ma jeszcze obiektów podrzędnych.",
    plannedActivities: "Planowane aktywności",
    giftCertificates: "Bony podarunkowe",
    noPlannedActivities: "Z tym obiektem nie powiązano jeszcze żadnych planowanych aktywności.",
    noGiftCertificates: "Dla tego produktu lub usługi nie utworzono jeszcze bonów podarunkowych.",
    scheduledActivities: "Z terminem",
    openActivity: "Otwórz aktywność",
    details: "Szczegóły",
    giftCertificateTitle: "Bon podarunkowy",
    addPlannedActivity: "Dodaj planowaną aktywność",
    addGiftCertificate: "Utwórz ofertę",
    activityCreateLater: "Tworzenie z tej karty zostanie włączone wraz z dedykowanym szablonem aktywności.",
    criteria: "Kryteria wyniku",
    noCriteria: "Nie dodano jeszcze kryteriów sukcesu ani porażki.",
    relations: "Relacje semantyczne",
    relationsLater: "Relacje semantyczne nie są jeszcze dostępne.",
    directChildren: "Bezpośrednie dzieci",
    descendantLeaves: "Liście potomne",
    successCriteria: "Kryteria sukcesu",
    failureCriteria: "Kryteria porażki",
    source: "Źródło",
    createdAt: "Utworzono",
    updatedAt: "Zaktualizowano",
  },
  ru: {
    rootEyebrow: "Корневой объект наблюдения",
    leafEyebrow: "Листовой объект наблюдения",
    intermediateEyebrow: "Промежуточный объект наблюдения",
    path: "Путь",
    genericEyebrow: "Объект наблюдения",
    back: "← Назад к объектам наблюдения",
    edit: "Редактировать",
    editLater: "Редактирование пока недоступно на этом этапе.",
    restructure: "Перестроить дерево",
    parametersAndTargets: "Параметры и цели",
    parametersAndTargetsReadOnly: "Просмотр параметров и целей без записи.",
    addLeaf: "Добавить лист",
    addLeafLater: "Листы можно создавать только под структурными объектами.",
    addIntermediate: "Добавить промежуточный",
    addIntermediateLater: "Промежуточные объекты можно создавать только под структурными объектами.",
    description: "Описание",
    branch: "Ветвь",
    kind: "Вид объекта",
    role: "Роль узла",
    status: "Статус",
    visibility: "Видимость",
    privacy: "Приватность",
    sensitivity: "Чувствительность",
    children: "Дерево дочерних объектов",
    noChildren: "У этого объекта пока нет дочерних объектов.",
    plannedActivities: "Запланированные активности",
    giftCertificates: "Подарочные сертификаты",
    noPlannedActivities: "С этим объектом пока не связано ни одной запланированной активности.",
    noGiftCertificates: "Для этого товара или услуги пока не создано ни одного подарочного сертификата.",
    scheduledActivities: "С указанными сроками",
    openActivity: "Открыть активность",
    details: "Подробнее",
    giftCertificateTitle: "Подарочный сертификат",
    addPlannedActivity: "Добавить плановую активность",
    addGiftCertificate: "Создать предложение",
    activityCreateLater: "Создание с этой страницы будет включено вместе со специальным шаблоном активности.",
    criteria: "Критерии результата",
    noCriteria: "Критерии успеха и провала пока не добавлены.",
    relations: "Семантические связи",
    relationsLater: "Семантические связи пока недоступны.",
    directChildren: "Прямые потомки",
    descendantLeaves: "Листья в поддереве",
    successCriteria: "Критерии успеха",
    failureCriteria: "Критерии провала",
    source: "Источник",
    createdAt: "Создан",
    updatedAt: "Обновлён",
  },
  uk: {
    rootEyebrow: "Кореневий об’єкт спостереження",
    leafEyebrow: "Листовий об’єкт спостереження",
    intermediateEyebrow: "Проміжний об’єкт спостереження",
    path: "Шлях",
    genericEyebrow: "Об’єкт спостереження",
    back: "← Назад до об’єктів спостереження",
    edit: "Редагувати",
    editLater: "Редагування поки недоступне на цьому етапі.",
    restructure: "Перебудувати дерево",
    parametersAndTargets: "Параметри та цілі",
    parametersAndTargetsReadOnly: "Перегляд параметрів і цілей без запису.",
    addLeaf: "Додати листок",
    addLeafLater: "Листки можна створювати лише під структурними об’єктами.",
    addIntermediate: "Додати проміжний",
    addIntermediateLater: "Проміжні об’єкти можна створювати лише під структурними об’єктами.",
    description: "Опис",
    branch: "Гілка",
    kind: "Вид об’єкта",
    role: "Роль вузла",
    status: "Статус",
    visibility: "Видимість",
    privacy: "Приватність",
    sensitivity: "Чутливість",
    children: "Дерево дочірніх об’єктів",
    noChildren: "Цей об’єкт поки не має дочірніх об’єктів.",
    plannedActivities: "Заплановані активності",
    giftCertificates: "Подарункові сертифікати",
    noPlannedActivities: "Із цим об’єктом поки не пов’язано жодної запланованої активності.",
    noGiftCertificates: "Для цього товару або послуги ще не створено подарункових сертифікатів.",
    scheduledActivities: "Із зазначеними строками",
    openActivity: "Відкрити активність",
    details: "Докладніше",
    giftCertificateTitle: "Подарунковий сертифікат",
    addPlannedActivity: "Додати заплановану активність",
    addGiftCertificate: "Створити пропозицію",
    activityCreateLater: "Створення з цієї сторінки буде ввімкнено разом зі спеціальним шаблоном активності.",
    criteria: "Критерії результату",
    noCriteria: "Критерії успіху та провалу ще не додані.",
    relations: "Семантичні зв’язки",
    relationsLater: "Семантичні зв’язки поки недоступні.",
    directChildren: "Прямі нащадки",
    descendantLeaves: "Листки в піддереві",
    successCriteria: "Критерії успіху",
    failureCriteria: "Критерії провалу",
    source: "Джерело",
    createdAt: "Створено",
    updatedAt: "Оновлено",
  },
  de: {
    rootEyebrow: "Wurzel-Beobachtungsobjekt",
    leafEyebrow: "Blatt-Beobachtungsobjekt",
    intermediateEyebrow: "Zwischen-Beobachtungsobjekt",
    path: "Pfad",
    genericEyebrow: "Beobachtungsobjekt",
    back: "← Zurück zu Beobachtungsobjekten",
    edit: "Bearbeiten",
    editLater: "Die Bearbeitung ist in diesem Schritt noch nicht verfügbar.",
    restructure: "Baum umstrukturieren",
    parametersAndTargets: "Parameter und Ziele",
    parametersAndTargetsReadOnly: "Schreibgeschützte Ansicht der Parameter und Ziele.",
    addLeaf: "Blatt hinzufügen",
    addLeafLater: "Blätter können nur unter Strukturobjekten erstellt werden.",
    addIntermediate: "Zwischenobjekt hinzufügen",
    addIntermediateLater: "Zwischenobjekte können nur unter Strukturobjekten erstellt werden.",
    description: "Beschreibung",
    branch: "Zweig",
    kind: "Objektart",
    role: "Knotenrolle",
    status: "Status",
    visibility: "Sichtbarkeit",
    privacy: "Privatsphäre",
    sensitivity: "Sensibilität",
    children: "Baum der untergeordneten Objekte",
    noChildren: "Dieses Objekt hat noch keine untergeordneten Objekte.",
    plannedActivities: "Geplante Aktivitäten",
    giftCertificates: "Geschenkgutscheine",
    noPlannedActivities: "Mit diesem Objekt sind noch keine geplanten Aktivitäten verknüpft.",
    noGiftCertificates: "Für dieses Produkt oder diese Dienstleistung wurden noch keine Geschenkgutscheine erstellt.",
    scheduledActivities: "Mit Termin",
    openActivity: "Aktivität öffnen",
    details: "Details",
    giftCertificateTitle: "Geschenkgutschein",
    addPlannedActivity: "Geplante Aktivität hinzufügen",
    addGiftCertificate: "Angebot erstellen",
    activityCreateLater: "Die Erstellung von dieser Seite wird mit der speziellen Aktivitätsvorlage aktiviert.",
    criteria: "Ergebniskriterien",
    noCriteria: "Es wurden noch keine Erfolgs- oder Misserfolgskriterien hinzugefügt.",
    relations: "Semantische Beziehungen",
    relationsLater: "Semantische Beziehungen sind noch nicht verfügbar.",
    directChildren: "Direkte Kinder",
    descendantLeaves: "Blätter im Teilbaum",
    successCriteria: "Erfolgskriterien",
    failureCriteria: "Misserfolgskriterien",
    source: "Quelle",
    createdAt: "Erstellt",
    updatedAt: "Aktualisiert",
  },
  es: {
    rootEyebrow: "Objeto raíz de observación",
    leafEyebrow: "Objeto hoja de observación",
    intermediateEyebrow: "Objeto intermedio de observación",
    path: "Ruta",
    genericEyebrow: "Objeto de observación",
    back: "← Volver a objetos de observación",
    edit: "Editar",
    editLater: "La edición todavía no está disponible en este paso.",
    restructure: "Reestructurar árbol",
    parametersAndTargets: "Parámetros y objetivos",
    parametersAndTargetsReadOnly: "Vista de parámetros y objetivos de solo lectura.",
    addLeaf: "Añadir hoja",
    addLeafLater: "Las hojas solo pueden crearse bajo objetos estructurales.",
    addIntermediate: "Añadir intermedio",
    addIntermediateLater: "Los objetos intermedios solo pueden crearse bajo objetos estructurales.",
    description: "Descripción",
    branch: "Rama",
    kind: "Tipo de objeto",
    role: "Rol del nodo",
    status: "Estado",
    visibility: "Visibilidad",
    privacy: "Privacidad",
    sensitivity: "Sensibilidad",
    children: "Árbol de objetos hijos",
    noChildren: "Este objeto todavía no tiene objetos hijos.",
    plannedActivities: "Actividades planificadas",
    giftCertificates: "Certificados de regalo",
    noPlannedActivities: "Todavía no hay actividades planificadas vinculadas a este objeto.",
    noGiftCertificates: "Todavía no se han creado certificados de regalo para este producto o servicio.",
    scheduledActivities: "Con fechas",
    openActivity: "Abrir actividad",
    details: "Detalles",
    giftCertificateTitle: "Certificado de regalo",
    addPlannedActivity: "Añadir actividad planificada",
    addGiftCertificate: "Crear oferta",
    activityCreateLater: "La creación desde esta página se habilitará junto con la plantilla de actividad específica.",
    criteria: "Criterios de resultado",
    noCriteria: "Todavía no se han añadido criterios de éxito o fracaso.",
    relations: "Relaciones semánticas",
    relationsLater: "Las relaciones semánticas todavía no están disponibles.",
    directChildren: "Hijos directos",
    descendantLeaves: "Hojas del subárbol",
    successCriteria: "Criterios de éxito",
    failureCriteria: "Criterios de fracaso",
    source: "Fuente",
    createdAt: "Creado",
    updatedAt: "Actualizado",
  },
  cs: {
    rootEyebrow: "Kořenový objekt pozorování",
    leafEyebrow: "Listový objekt pozorování",
    intermediateEyebrow: "Mezilehlý objekt pozorování",
    path: "Cesta",
    genericEyebrow: "Objekt pozorování",
    back: "← Zpět k objektům pozorování",
    edit: "Upravit",
    editLater: "Úpravy zatím nejsou v tomto kroku dostupné.",
    restructure: "Přestavět strom",
    parametersAndTargets: "Parametry a cíle",
    parametersAndTargetsReadOnly: "Zobrazení parametrů a cílů pouze pro čtení.",
    addLeaf: "Přidat list",
    addLeafLater: "Listy lze vytvářet pouze pod strukturálními objekty.",
    addIntermediate: "Přidat mezilehlý",
    addIntermediateLater: "Mezilehlé objekty lze vytvářet pouze pod strukturálními objekty.",
    description: "Popis",
    branch: "Větev",
    kind: "Druh objektu",
    role: "Role uzlu",
    status: "Stav",
    visibility: "Viditelnost",
    privacy: "Soukromí",
    sensitivity: "Citlivost",
    children: "Strom podřízených objektů",
    noChildren: "Tento objekt zatím nemá podřízené objekty.",
    plannedActivities: "Plánované aktivity",
    giftCertificates: "Dárkové poukazy",
    noPlannedActivities: "K tomuto objektu zatím nejsou připojeny žádné plánované aktivity.",
    noGiftCertificates: "Pro tento produkt nebo službu zatím nebyly vytvořeny žádné dárkové poukazy.",
    scheduledActivities: "S termínem",
    openActivity: "Otevřít aktivitu",
    details: "Podrobnosti",
    giftCertificateTitle: "Dárkový poukaz",
    addPlannedActivity: "Přidat plánovanou aktivitu",
    addGiftCertificate: "Vytvořit nabídku",
    activityCreateLater: "Vytváření z této stránky bude zapnuto spolu se zvláštní šablonou aktivity.",
    criteria: "Kritéria výsledku",
    noCriteria: "Kritéria úspěchu ani neúspěchu zatím nebyla přidána.",
    relations: "Sémantické vztahy",
    relationsLater: "Sémantické vztahy zatím nejsou dostupné.",
    directChildren: "Přímé děti",
    descendantLeaves: "Listy v podstromu",
    successCriteria: "Kritéria úspěchu",
    failureCriteria: "Kritéria neúspěchu",
    source: "Zdroj",
    createdAt: "Vytvořeno",
    updatedAt: "Aktualizováno",
  },
};

const OWNER_KIND_LABELS: Record<
  LocaleCode,
  { personal: string; avatar: string; organization: string; actor: string }
> = {
  en: {
    personal: "Personal profile",
    avatar: "Avatar",
    organization: "Enterprise",
    actor: "Actor",
  },
  pl: {
    personal: "Profil osobisty",
    avatar: "Awatar",
    organization: "Przedsiębiorstwo",
    actor: "Aktor",
  },
  ru: {
    personal: "Личный профиль",
    avatar: "Аватар",
    organization: "Предприятие",
    actor: "Актор",
  },
  uk: {
    personal: "Особистий профіль",
    avatar: "Аватар",
    organization: "Підприємство",
    actor: "Актор",
  },
  de: {
    personal: "Persönliches Profil",
    avatar: "Avatar",
    organization: "Unternehmen",
    actor: "Akteur",
  },
  es: {
    personal: "Perfil personal",
    avatar: "Avatar",
    organization: "Empresa",
    actor: "Actor",
  },
  cs: {
    personal: "Osobní profil",
    avatar: "Avatar",
    organization: "Podnik",
    actor: "Aktér",
  },
};

const SUMMARY_LABELS: Record<
  LocaleCode,
  { ordinaryPrice: string; duration: string; linkedActivities: string; totalCriteria: string }
> = {
  en: {
    ordinaryPrice: "Ordinary price",
    duration: "Ordinary duration",
    linkedActivities: "Linked activities",
    totalCriteria: "Outcome criteria",
  },
  pl: {
    ordinaryPrice: "Cena zwykła",
    duration: "Zwykły czas trwania",
    linkedActivities: "Powiązane aktywności",
    totalCriteria: "Kryteria wyniku",
  },
  ru: {
    ordinaryPrice: "Обычная цена",
    duration: "Обычная продолжительность",
    linkedActivities: "Связанные активности",
    totalCriteria: "Критерии результата",
  },
  uk: {
    ordinaryPrice: "Звичайна ціна",
    duration: "Звичайна тривалість",
    linkedActivities: "Пов’язані активності",
    totalCriteria: "Критерії результату",
  },
  de: {
    ordinaryPrice: "Normalpreis",
    duration: "Übliche Dauer",
    linkedActivities: "Verknüpfte Aktivitäten",
    totalCriteria: "Ergebniskriterien",
  },
  es: {
    ordinaryPrice: "Precio habitual",
    duration: "Duración habitual",
    linkedActivities: "Actividades vinculadas",
    totalCriteria: "Criterios de resultado",
  },
  cs: {
    ordinaryPrice: "Běžná cena",
    duration: "Běžná délka",
    linkedActivities: "Propojené aktivity",
    totalCriteria: "Kritéria výsledku",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parsePublicProfileMetadata(
  metadata: Record<string, unknown> | null,
): ValueObjectPublicProfileMetadata {
  const publicProfile = isRecord(metadata?.public_profile)
    ? metadata.public_profile
    : {};
  const rawLocation = isRecord(publicProfile.location)
    ? publicProfile.location
    : null;

  return {
    imageUrl: readNullableString(publicProfile.image_url),
    location: rawLocation
      ? {
          label: readNullableString(rawLocation.label),
          countryCode: readNullableString(rawLocation.country_code),
          region: readNullableString(rawLocation.region),
          city: readNullableString(rawLocation.city),
          district: readNullableString(rawLocation.district),
          streetAddress: readNullableString(rawLocation.street_address),
          postalCode: readNullableString(rawLocation.postal_code),
          latitude: readNullableNumber(rawLocation.latitude),
          longitude: readNullableNumber(rawLocation.longitude),
          addressVisibility:
            readNullableString(rawLocation.address_visibility) ?? "public",
        }
      : null,
  };
}

function hasLocationData(location: ValueObjectPublicLocation | null) {
  return Boolean(
    location &&
      (location.label ||
        location.countryCode ||
        location.region ||
        location.city ||
        location.district ||
        location.streetAddress ||
        location.postalCode ||
        location.latitude !== null ||
        location.longitude !== null),
  );
}

function toPublicLocation(
  row: OwnerOrganizationLocationRow | null,
): ValueObjectPublicLocation | null {
  if (!row) {
    return null;
  }

  const location: ValueObjectPublicLocation = {
    label: row.label,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    district: row.district,
    streetAddress: row.street_address,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    addressVisibility: row.address_visibility ?? "public",
  };

  return hasLocationData(location) ? location : null;
}

function emptyPublicLocation(): ValueObjectPublicLocation {
  return {
    label: null,
    countryCode: null,
    region: null,
    city: null,
    district: null,
    streetAddress: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    addressVisibility: "public",
  };
}

async function resolveOwnerPresentation(
  valueObject: ValueObjectRow,
  locale: LocaleCode,
): Promise<ValueObjectOwnerPresentation> {
  const labels = OWNER_KIND_LABELS[locale];

  if (valueObject.organization_id) {
    const { data, error } = await supabase
      .from("organizations")
      .select(
        "id,organization_name,organization_type,public_slug,logo_url",
      )
      .eq("id", valueObject.organization_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const organization = data as OwnerOrganizationRow | null;

    if (organization) {
      return {
        displayName: organization.organization_name,
        kindLabel: labels.organization,
        imageUrl: organization.logo_url,
        href: organization.public_slug
          ? buildLocaleHref(
              `/directory/${organization.public_slug}`,
              locale,
            )
          : null,
      };
    }
  }

  if (!valueObject.owner_actor_id) {
    return {
      displayName: labels.actor,
      kindLabel: labels.actor,
      imageUrl: null,
      href: null,
    };
  }

  const [{ data: profileData, error: profileError }, { data: actorData, error: actorError }] =
    await Promise.all([
      supabase
        .from("actor_public_profiles")
        .select(
          "actor_id,profile_kind,public_slug,display_name,image_url,is_public",
        )
        .eq("actor_id", valueObject.owner_actor_id)
        .maybeSingle(),
      supabase
        .from("actors")
        .select("id,actor_type,display_name")
        .eq("id", valueObject.owner_actor_id)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (actorError) {
    throw new Error(actorError.message);
  }

  const profile = profileData as ActorPublicProfileRow | null;
  const actor = actorData as ActorRow | null;

  if (profile) {
    const kindLabel =
      profile.profile_kind === "avatar" ? labels.avatar : labels.personal;

    return {
      displayName: profile.display_name,
      kindLabel,
      imageUrl: profile.image_url,
      href: profile.public_slug
        ? buildLocaleHref(`/people/${profile.public_slug}`, locale)
        : null,
    };
  }

  return {
    displayName: actor?.display_name || labels.actor,
    kindLabel: actor?.actor_type || labels.actor,
    imageUrl: null,
    href: null,
  };
}

async function resolveOrganizationLocation(
  organizationId: string | null,
): Promise<ValueObjectPublicLocation | null> {
  if (!organizationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organization_locations")
    .select(
      "label,country_code,region,city,district,street_address,postal_code,latitude,longitude,address_visibility",
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? [])[0] as OwnerOrganizationLocationRow | undefined) ??
    null;

  return toPublicLocation(row);
}

function formatMoney(
  value: number | null,
  currency: string | null,
  locale: LocaleCode,
) {
  if (value === null) {
    return "—";
  }

  const localeByCode: Record<LocaleCode, string> = {
    en: "en-US",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  if (!currency) {
    return new Intl.NumberFormat(localeByCode[locale], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  try {
    return new Intl.NumberFormat(localeByCode[locale], {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function buildOfferWizardHref(valueObjectId: string, locale: LocaleCode) {
  const params = new URLSearchParams({ valueObjectId });

  if (locale !== "en") {
    params.set("locale", locale);
  }

  return `/offers/new?${params.toString()}`;
}

const VIEW_MODE_LABELS: Record<LocaleCode, string> = {
  en: "View mode",
  pl: "Tryb podglądu",
  ru: "Режим просмотра",
  uk: "Режим перегляду",
  de: "Ansichtsmodus",
  es: "Modo de vista",
  cs: "Režim zobrazení",
};

function buildValueObjectModeHref(
  valueObjectId: string,
  locale: LocaleCode,
  mode: "view" | "edit",
) {
  const query = new URLSearchParams();

  if (locale !== "en") {
    query.set("locale", locale);
  }

  if (mode === "edit") {
    query.set("mode", "edit");
  }

  const queryString = query.toString();
  const pathname = `/value-objects/${encodeURIComponent(valueObjectId)}`;

  return queryString ? `${pathname}?${queryString}` : pathname;
}

function buildActivityHref(
  activityEventId: string,
  locale: LocaleCode,
  isGiftCertificate: boolean,
) {
  if (isGiftCertificate) {
    return buildLocaleHref(
      `/gift-certificates/${activityEventId}`,
      locale,
    );
  }

  const searchParams = new URLSearchParams({ activityEventId });

  if (locale !== "en") {
    searchParams.set("locale", locale);
  }

  return `/activity-today?${searchParams.toString()}`;
}

function formatDate(value: string | null, locale: LocaleCode) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const dateLocales: Record<LocaleCode, string> = {
    en: "en-US",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  return new Intl.DateTimeFormat(dateLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatActivityTitle(
  title: string,
  isGiftCertificate: boolean,
  copy: Copy,
) {
  if (!isGiftCertificate) {
    return title;
  }

  const technicalPrefix = /^Gift certificate:\s*/i;

  if (!technicalPrefix.test(title)) {
    return title;
  }

  return `${copy.giftCertificateTitle}: ${title.replace(technicalPrefix, "")}`;
}

export default async function ValueObjectDetailPage({
  params,
  searchParams,
}: ValueObjectDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
  const rawMode = Array.isArray(resolvedSearchParams?.mode)
    ? resolvedSearchParams?.mode[0]
    : resolvedSearchParams?.mode;
  const editMode = rawMode === "edit";
  const copy = COPY[locale];

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    notFound();
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      notFound();
    }

    throw error;
  }

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      description,
      object_kind,
      usage_scope,
      value_type,
      default_price,
      default_currency,
      default_duration_minutes,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      instance_of_value_object_id,
      status,
      visibility,
      privacy_level,
      sensitivity_level,
      source,
      owner_user_id,
      owner_actor_id,
      organization_id,
      metadata_json,
      canonical_key,
      scope_code,
      origin_type_code,
      facet_code,
      object_kind_code,
      ontology_node_role_code,
      hierarchy_relation_code,
      visibility_code,
      privacy_class_code,
      definition_version,
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (valueObjectError) {
    throw new Error(valueObjectError.message);
  }

  const rawValueObject = valueObjectData as ValueObjectRow | null;

  if (!rawValueObject) {
    notFound();
  }

  let valueObject = rawValueObject;
  const isGlobalSystemObject =
    valueObject.scope_code === "global" &&
    valueObject.origin_type_code === "system_model";
  if (isGlobalSystemObject) {
    valueObject = localizeGlobalSystemValueObject(valueObject, locale);
  }
  const isOwnedByActiveActor =
    valueObject.owner_user_id === actorContext.appUserId &&
    valueObject.owner_actor_id === actorContext.actorId;

  if (!isGlobalSystemObject && !isOwnedByActiveActor) {
    notFound();
  }

  const publicProfileMetadata = parsePublicProfileMetadata(
    valueObject.metadata_json,
  );
  const [ownerPresentation, organizationLocation] = await Promise.all([
    isGlobalSystemObject
      ? Promise.resolve<ValueObjectOwnerPresentation>({
          displayName: "ARCTor Global System",
          kindLabel: "System",
          imageUrl: null,
          href: null,
        })
      : resolveOwnerPresentation(valueObject, locale),
    resolveOrganizationLocation(valueObject.organization_id),
  ]);
  const hasOwnLocation = hasLocationData(publicProfileMetadata.location);
  const effectiveLocation =
    publicProfileMetadata.location ?? organizationLocation ?? emptyPublicLocation();

  const rootValueObjectId =
    valueObject.root_value_object_id ?? valueObject.id;

  const treeQueryBase = supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      canonical_key,
      node_role_code,
      object_kind,
      object_kind_code,
      ontology_node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status,
      created_at
    `,
    )
    .eq("root_value_object_id", rootValueObjectId);

  const treeQuery = isGlobalSystemObject
    ? treeQueryBase.eq("scope_code", "global")
    : treeQueryBase
        .eq("owner_user_id", actorContext.appUserId)
        .eq("owner_actor_id", actorContext.actorId);

  const { data: treeData, error: treeError } = await treeQuery.order(
    "created_at",
    { ascending: true },
  );

  if (treeError) {
    throw new Error(treeError.message);
  }

  let criteriaData: CriterionRow[] = [];

  if (!isGlobalSystemObject) {
    const { data, error } = await supabase
      .from("value_object_outcome_criteria")
      .select("id, criterion_type_code, title, status")
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("value_object_id", valueObject.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    criteriaData = (data ?? []) as CriterionRow[];
  }

  const rawTreeNodes = (treeData ?? []) as TreeNodeRow[];
  const treeNodes = isGlobalSystemObject
    ? rawTreeNodes.map((node) => localizeGlobalSystemValueObject(node, locale))
    : rawTreeNodes;
  const nodesById = new Map(
    treeNodes.map((node) => [node.id, node] as const),
  );
  const childrenByParent = new Map<string, TreeNodeRow[]>();

  for (const node of treeNodes) {
    if (!node.parent_value_object_id) {
      continue;
    }

    const siblings = childrenByParent.get(node.parent_value_object_id) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent_value_object_id, siblings);
  }

  const pathNodes: TreeNodeRow[] = [];
  const pathVisited = new Set<string>();
  let pathCursor = nodesById.get(valueObject.id) ?? null;

  while (pathCursor && !pathVisited.has(pathCursor.id)) {
    pathVisited.add(pathCursor.id);
    pathNodes.unshift(pathCursor);

    if (!pathCursor.parent_value_object_id) {
      break;
    }

    pathCursor =
      nodesById.get(pathCursor.parent_value_object_id) ?? null;
  }

  const directChildren = childrenByParent.get(valueObject.id) ?? [];
  const criteria = (criteriaData ?? []) as CriterionRow[];
  const ontologyNodeRole = valueObject.ontology_node_role_code;
  const isRoot =
    valueObject.ontology_node_role_code === "root" ||
    (!ontologyNodeRole &&
      valueObject.parent_value_object_id === null &&
      valueObject.root_value_object_id === valueObject.id);
  const isLeaf =
    valueObject.ontology_node_role_code === "leaf" ||
    (!ontologyNodeRole &&
      valueObject.node_role_code === "activity_leaf" &&
      isValueObjectLeafKindV2(valueObject.object_kind) &&
      valueObject.parent_value_object_id !== null);
  const isIntermediate =
    valueObject.ontology_node_role_code === "intermediate" ||
    (!ontologyNodeRole &&
      valueObject.node_role_code === "structural" &&
      !isRoot &&
      valueObject.parent_value_object_id !== null);
  const isStructural =
    !isGlobalSystemObject &&
    (isRoot || isIntermediate) &&
    (valueObject.status === "draft" || valueObject.status === "active");
  const isProductOrService =
    valueObject.object_kind === "product_type" ||
    valueObject.object_kind === "service_type";
  const isService = valueObject.object_kind === "service_type";
  const isSemanticOntologyObject = Boolean(
    valueObject.canonical_key &&
      valueObject.facet_code &&
      valueObject.object_kind_code &&
      valueObject.ontology_node_role_code &&
      valueObject.definition_version !== null,
  );
  const canEdit =
    !isGlobalSystemObject &&
    (isSemanticOntologyObject
      ? valueObject.status === "draft" ||
        valueObject.status === "active" ||
        valueObject.status === "inactive"
      : valueObject.status === "draft");
  const viewHref = buildValueObjectModeHref(valueObject.id, locale, "view");
  const editHref = buildValueObjectModeHref(valueObject.id, locale, "edit");

  let linkedActivityCount = 0;
  let plannedActivities: PlannedActivityRow[] = [];

  if (isLeaf) {
    const [linkedFactsResult, linkedSemanticResult] = await Promise.all([
      supabase
        .from("activity_object_facts")
        .select("activity_event_id")
        .eq("user_id", actorContext.appUserId)
        .eq("acting_as_actor_id", actorContext.actorId)
        .eq("value_object_id", valueObject.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("activity_value_object_links")
        .select("activity_event_id")
        .eq("app_user_id", actorContext.appUserId)
        .eq("actor_id", actorContext.actorId)
        .eq("value_object_id", valueObject.id)
        .eq("status", "active")
        .in("link_type", ["semantic_exposure", "planned_target"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (linkedFactsResult.error || linkedSemanticResult.error) {
      throw new Error(
        linkedFactsResult.error?.message ??
          linkedSemanticResult.error?.message ??
          "P5B_LINKED_ACTIVITY_COUNT_FAILED",
      );
    }

    linkedActivityCount = new Set(
      [
        ...(linkedFactsResult.data ?? []),
        ...(linkedSemanticResult.data ?? []),
      ]
        .map((row) => row.activity_event_id)
        .filter(
          (activityEventId): activityEventId is string =>
            typeof activityEventId === "string" && activityEventId.length > 0,
        ),
    ).size;

    const { data: linkData, error: linkError } = await supabase
      .from("activity_value_object_links")
      .select("activity_event_id,created_at")
      .eq("app_user_id", actorContext.appUserId)
      .eq("actor_id", actorContext.actorId)
      .eq("value_object_id", valueObject.id)
      .eq("link_type", "planned_target")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (linkError) {
      throw new Error(linkError.message);
    }

    const linkedActivityIds = Array.from(
      new Set(
        (linkData ?? [])
          .map((link) => link.activity_event_id)
          .filter((activityEventId): activityEventId is string =>
            typeof activityEventId === "string" && activityEventId.length > 0,
          ),
      ),
    );

    if (linkedActivityIds.length > 0) {
      const { data: activityData, error: activityError } = await supabase
        .from("activity_events")
        .select(
          `
          id,
          title,
          description,
          status,
          schedule_mode_code,
          scheduled_date,
          schedule_start_date,
          schedule_end_date,
          deadline_at,
          started_at,
          ended_at,
          updated_at
        `,
        )
        .eq("user_id", actorContext.appUserId)
        .eq("acting_as_actor_id", actorContext.actorId)
        .eq("activity_role_code", "planned")
        .in("id", linkedActivityIds)
        .order("updated_at", { ascending: false });

      if (activityError) {
        throw new Error(activityError.message);
      }

      plannedActivities = (activityData ?? []) as PlannedActivityRow[];
    }
  }

  const activitySectionTitle = isProductOrService
    ? copy.giftCertificates
    : copy.plannedActivities;
  const activityEmptyText = isProductOrService
    ? copy.noGiftCertificates
    : copy.noPlannedActivities;
  const activityCreateLabel = isProductOrService
    ? copy.addGiftCertificate
    : copy.addPlannedActivity;
  function countLeafDescendants(parentId: string): number {
    const children = childrenByParent.get(parentId) ?? [];

    return children.reduce((count, child) => {
      if (
        child.ontology_node_role_code === "leaf" ||
        (!child.ontology_node_role_code &&
          child.node_role_code === "activity_leaf")
      ) {
        return count + 1;
      }

      return count + countLeafDescendants(child.id);
    }, 0);
  }

  const descendantLeafCount = countLeafDescendants(valueObject.id);
  const summaryLabels = SUMMARY_LABELS[locale];
  const summaryItems: ValueObjectSummaryItem[] = isProductOrService
    ? [
        { label: copy.status, value: valueObject.status || "—" },
        {
          label: summaryLabels.ordinaryPrice,
          value: formatMoney(
            valueObject.default_price,
            valueObject.default_currency,
            locale,
          ),
        },
        {
          label: isService ? summaryLabels.duration : copy.kind,
          value: isService
            ? valueObject.default_duration_minutes === null
              ? "—"
              : `${valueObject.default_duration_minutes} min`
            : valueObject.object_kind || "—",
        },
        {
          label: activitySectionTitle,
          value: String(plannedActivities.length),
        },
      ]
    : isLeaf
      ? [
          { label: copy.status, value: valueObject.status || "—" },
          {
            label: copy.role,
            value:
              (isSemanticOntologyObject
                ? valueObject.ontology_node_role_code
                : valueObject.node_role_code) || "—",
          },
          {
            label: summaryLabels.linkedActivities,
            value: String(linkedActivityCount),
          },
          { label: summaryLabels.totalCriteria, value: String(criteria.length) },
        ]
      : [
          { label: copy.status, value: valueObject.status || "—" },
          {
            label: copy.role,
            value:
              (isSemanticOntologyObject
                ? valueObject.ontology_node_role_code
                : valueObject.node_role_code) || "—",
          },
          { label: copy.directChildren, value: String(directChildren.length) },
          { label: copy.descendantLeaves, value: String(descendantLeafCount) },
        ];

  function renderSubtree(parentId: string, depth = 0): ReactNode {
    const children = childrenByParent.get(parentId) ?? [];

    return children.map((child) => (
      <div
        key={child.id}
        className="grid gap-3"
        style={{ marginLeft: `${Math.min(depth, 12) * 18}px` }}
      >
        <Link
          href={buildLocaleHref(
            `/value-objects/${child.id}`,
            locale,
          )}
          className="rounded-2xl border border-[#e5e7eb] bg-[#fafbff] p-4 transition hover:border-[#c9d5ff] hover:bg-[#f5f7ff]"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
            {child.ontology_node_role_code || child.node_role_code || "—"} ·{" "}
            {child.object_kind_code || child.object_kind || "—"} · {child.status}
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#111827]">
            {child.title}
          </div>
        </Link>

        {child.ontology_node_role_code === "root" ||
        child.ontology_node_role_code === "intermediate" ||
        child.node_role_code === "structural"
          ? renderSubtree(child.id, depth + 1)
          : null}
      </div>
    ));
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] text-[#1a1d2e]">
      <div className="grid gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <Link
              href={buildLocaleHref("/value-objects", locale)}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          ) : null}

          {editMode ? (
            <Link
              href={viewHref}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {VIEW_MODE_LABELS[locale]}
            </Link>
          ) : canEdit ? (
            <Link
              href={editHref}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {copy.edit}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title={copy.editLater}
              className="w-fit cursor-not-allowed rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#9ca3b8] opacity-70 shadow-sm"
            >
              {copy.edit}
            </button>
          )}

          {!isGlobalSystemObject ? (
            <Link
              href={buildLocaleHref(
                `/value-objects/${valueObject.id}/restructure`,
                locale,
              )}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {copy.restructure}
            </Link>
          ) : null}

          {isLeaf ? (
            <Link
              href={buildLocaleHref(
                `/value-objects/${valueObject.id}/standards`,
                locale,
              )}
              title={copy.parametersAndTargetsReadOnly}
              className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {copy.parametersAndTargets}
            </Link>
          ) : null}
        </div>

        {editMode && canEdit ? null : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
                {valueObject.title}
              </h1>
              <p className="mt-0.5 text-[13px] text-[#7c8099]">
                {isRoot
                  ? copy.rootEyebrow
                  : isIntermediate
                    ? copy.intermediateEyebrow
                    : isLeaf
                      ? copy.leafEyebrow
                      : copy.genericEyebrow}
              </p>
              <p className="mt-1 max-w-[760px] text-[12px] font-medium leading-5 text-[#9ca3b8]">
                {valueObject.description || "—"}
              </p>

              {pathNodes.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#5a5f7a]">
                  <span className="uppercase tracking-[0.14em] text-[#7c8099]">
                    {copy.path}
                  </span>
                  {pathNodes.map((node, index) => (
                    <span key={node.id} className="inline-flex items-center gap-2">
                      {index > 0 && <span aria-hidden="true">→</span>}
                      {node.id === valueObject.id ? (
                        <span>{node.title}</span>
                      ) : (
                        <Link
                          href={buildLocaleHref(
                            `/value-objects/${node.id}`,
                            locale,
                          )}
                          className="text-[#3b6ef8] hover:underline"
                        >
                          {node.title}
                        </Link>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <ValueObjectProfileTopGrid
          valueObjectId={valueObject.id}
          locale={locale}
          editMode={editMode}
          canEdit={canEdit}
          title={valueObject.title}
          objectKindLabel={`${
            valueObject.facet_code || valueObject.object_kind || "—"
          } · ${
            valueObject.ontology_node_role_code ||
            valueObject.node_role_code ||
            "—"
          }`}
          imageUrl={publicProfileMetadata.imageUrl}
          location={effectiveLocation}
          locationIsInherited={!hasOwnLocation && Boolean(organizationLocation)}
          showLocationCard={
            hasOwnLocation ||
            Boolean(organizationLocation) ||
            isProductOrService ||
            valueObject.facet_code === "ENTITY"
          }
          structureContext={{
            rootTitle: pathNodes[0]?.title ?? valueObject.title,
            parentTitle:
              pathNodes.length > 1
                ? pathNodes[pathNodes.length - 2]?.title ?? null
                : null,
            pathText: pathNodes.map((node) => node.title).join(" → "),
          }}
          owner={ownerPresentation}
          summaryItems={summaryItems}
        />

        <ValueObjectFullCardPanel
          valueObjectId={valueObject.id}
          locale={locale}
          editMode={editMode}
          canEdit={canEdit}
          initialTitle={valueObject.title}
          initialDescription={valueObject.description}
          initialHierarchyRelationCode={valueObject.hierarchy_relation_code}
          initialNodeRoleCode={valueObject.ontology_node_role_code ?? ""}
          initialVisibilityCode={valueObject.visibility_code ?? "private"}
          initialPrivacyClassCode={valueObject.privacy_class_code ?? "standard"}
          definitionVersion={valueObject.definition_version ?? 1}
          viewHref={viewHref}
        />

        {isLeaf && !isProductOrService ? (
          <ValueObjectAnalyticsProfileManager
            valueObjectId={valueObject.id}
            locale={locale}
          />
        ) : null}

        {isLeaf ? (
          <ActivityMutualLinksPanel
            locale={locale}
            valueObjectId={valueObject.id}
          />
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
            {isLeaf ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-bold text-[#111827]">
                      {activitySectionTitle}
                    </h2>
                  </div>

                  {isProductOrService ? (
                    <Link
                      href={buildOfferWizardHref(valueObject.id, locale)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] transition hover:border-[#aebfff] hover:bg-[#e8edff]"
                    >
                      {activityCreateLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={copy.activityCreateLater}
                      className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] opacity-45"
                    >
                      {activityCreateLabel}
                    </button>
                  )}
                </div>

                {plannedActivities.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[14px] leading-6 text-[#5a5f7a]">
                    {activityEmptyText}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {plannedActivities.map((activity) => (
                      <Link
                        key={activity.id}
                        href={buildActivityHref(
                          activity.id,
                          locale,
                          isProductOrService,
                        )}
                        className="rounded-2xl border border-[#e5e7eb] bg-[#fafbff] p-4 transition hover:border-[#c9d5ff] hover:bg-[#f5f7ff]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                              {activity.status} · {activity.schedule_mode_code || "unscheduled"}
                            </div>
                            <div className="mt-1 text-[16px] font-bold text-[#111827]">
                              {formatActivityTitle(
                                activity.title,
                                isProductOrService,
                                copy,
                              )}
                            </div>
                            {activity.description ? (
                              <div className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                                {activity.description}
                              </div>
                            ) : null}
                            <div className="mt-2 text-[12px] font-semibold text-[#5a5f7a]">
                              <ActivityScheduleDisplay
                                locale={locale}
                                scheduleModeCode={activity.schedule_mode_code}
                                scheduledDate={activity.scheduled_date}
                                scheduleStartDate={activity.schedule_start_date}
                                scheduleEndDate={activity.schedule_end_date}
                                deadlineAt={activity.deadline_at}
                                startedAt={activity.started_at}
                                endedAt={activity.ended_at}
                              />
                            </div>
                          </div>
                          <span className="text-[12px] font-bold text-[#3b6ef8]">
                            {isProductOrService ? copy.details : copy.openActivity}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
                      part_of
                    </div>
                    <h2 className="mt-2 text-[22px] font-bold text-[#111827]">
                      {copy.children}
                    </h2>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {isStructural ? (
                      <>
                        <Link
                          href={buildLocaleHref(
                            `/value-objects/${valueObject.id}/new-intermediate`,
                            locale,
                          )}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#eadcff] bg-[#f7f1ff] px-4 py-2 text-[13px] font-bold text-[#8b5cf6] transition hover:border-[#cdb7ff] hover:bg-[#f1e9ff]"
                        >
                          {copy.addIntermediate}
                        </Link>
                        <Link
                          href={buildLocaleHref(
                            `/value-objects/${valueObject.id}/new-leaf`,
                            locale,
                          )}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] transition hover:border-[#aebfff] hover:bg-[#e8edff]"
                        >
                          {copy.addLeaf}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>

                {directChildren.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[14px] leading-6 text-[#5a5f7a]">
                    {copy.noChildren}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {renderSubtree(valueObject.id)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid gap-5">
            <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b5cf6]">
                {copy.criteria}
              </div>

              {criteria.length === 0 ? (
                <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                  {copy.noCriteria}
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {criteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="rounded-2xl border border-[#ece7ff] bg-[#faf8ff] p-4"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]">
                        {criterion.criterion_type_code} · {criterion.status}
                      </div>
                      <div className="mt-1 text-[14px] font-bold text-[#111827]">
                        {criterion.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="hidden">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
                {copy.relations}
              </div>
              <ValueObjectSemanticRelationsManager
                valueObjectId={valueObject.id}
                locale={locale}
              />
            </section>
          </div>
        </section>

        <section className="hidden">
          <h2 className="text-[20px] font-bold text-[#111827]">
            {copy.description}
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              [copy.branch, valueObject.branch_type_code],
              [copy.kind, valueObject.object_kind],
              [copy.role, valueObject.node_role_code],
              [copy.visibility, valueObject.visibility],
              [copy.privacy, valueObject.privacy_level],
              [copy.sensitivity, valueObject.sensitivity_level],
              [copy.source, valueObject.source],
              [copy.createdAt, formatDate(valueObject.created_at, locale)],
              [copy.updatedAt, formatDate(valueObject.updated_at, locale)],
              ...(isProductOrService
                ? [
                    ["default_price", valueObject.default_price],
                    ["default_currency", valueObject.default_currency],
                    ...(isService
                      ? [["default_duration_minutes", valueObject.default_duration_minutes]]
                      : []),
                  ]
                : []),
              ["root_value_object_id", valueObject.root_value_object_id],
              ["parent_value_object_id", valueObject.parent_value_object_id],
              ["instance_of_value_object_id", valueObject.instance_of_value_object_id],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                  {label}
                </div>
                <div className="mt-2 break-all font-mono text-[12px] font-semibold text-[#111827]">
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
