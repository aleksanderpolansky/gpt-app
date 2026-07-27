import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { ValueObjectSemanticRelationsManager } from "@/components/workspace/value-objects/value-object-semantic-relations-manager";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ValueObjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: string | null;
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
  created_at: string | null;
  updated_at: string | null;
};

type TreeNodeRow = {
  id: string;
  title: string;
  node_role_code: string | null;
  object_kind: string | null;
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
    leafEyebrow: "Activity observation leaf",
    intermediateEyebrow: "Intermediate observation object",
    path: "Path",
    genericEyebrow: "Observation object",
    back: "Back to observation objects",
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
    leafEyebrow: "Liść obserwacji aktywności",
    intermediateEyebrow: "Pośredni obiekt obserwacji",
    path: "Ścieżka",
    genericEyebrow: "Obiekt obserwacji",
    back: "Wróć do obiektów obserwacji",
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
    leafEyebrow: "Лист наблюдения активности",
    intermediateEyebrow: "Промежуточный объект наблюдения",
    path: "Путь",
    genericEyebrow: "Объект наблюдения",
    back: "Назад к объектам наблюдения",
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
    leafEyebrow: "Листок спостереження активності",
    intermediateEyebrow: "Проміжний об’єкт спостереження",
    path: "Шлях",
    genericEyebrow: "Об’єкт спостереження",
    back: "Назад до об’єктів спостереження",
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
    leafEyebrow: "Aktivitäts-Beobachtungsblatt",
    intermediateEyebrow: "Zwischen-Beobachtungsobjekt",
    path: "Pfad",
    genericEyebrow: "Beobachtungsobjekt",
    back: "Zurück zu Beobachtungsobjekten",
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
    leafEyebrow: "Hoja de observación de actividad",
    intermediateEyebrow: "Objeto intermedio de observación",
    path: "Ruta",
    genericEyebrow: "Objeto de observación",
    back: "Volver a objetos de observación",
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
    leafEyebrow: "List pozorování aktivity",
    intermediateEyebrow: "Mezilehlý objekt pozorování",
    path: "Cesta",
    genericEyebrow: "Objekt pozorování",
    back: "Zpět k objektům pozorování",
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

export default async function ValueObjectDetailPage({
  params,
  searchParams,
}: ValueObjectDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
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
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .maybeSingle();

  if (valueObjectError) {
    throw new Error(valueObjectError.message);
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    notFound();
  }

  const rootValueObjectId =
    valueObject.root_value_object_id ?? valueObject.id;

  const [
    { data: treeData, error: treeError },
    { data: criteriaData, error: criteriaError },
  ] = await Promise.all([
    supabase
      .from("value_objects")
      .select(
        `
        id,
        title,
        node_role_code,
        object_kind,
        branch_type_code,
        root_value_object_id,
        parent_value_object_id,
        status,
        created_at
      `,
      )
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("root_value_object_id", rootValueObjectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("value_object_outcome_criteria")
      .select("id, criterion_type_code, title, status")
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("value_object_id", valueObject.id)
      .order("created_at", { ascending: true }),
  ]);

  if (treeError) {
    throw new Error(treeError.message);
  }

  if (criteriaError) {
    throw new Error(criteriaError.message);
  }

  const treeNodes = (treeData ?? []) as TreeNodeRow[];
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
  const successCriteria = criteria.filter(
    (criterion) => criterion.criterion_type_code === "success",
  );
  const failureCriteria = criteria.filter(
    (criterion) => criterion.criterion_type_code === "failure",
  );
  const isRoot =
    valueObject.parent_value_object_id === null &&
    valueObject.root_value_object_id === valueObject.id;
  const isLeaf =
    valueObject.node_role_code === "activity_leaf" &&
    valueObject.object_kind === "activity_pattern" &&
    valueObject.parent_value_object_id !== null;
  const isIntermediate =
    valueObject.node_role_code === "structural" &&
    !isRoot &&
    valueObject.parent_value_object_id !== null;
  const isStructural =
    valueObject.node_role_code === "structural" &&
    valueObject.object_kind !== "activity_pattern" &&
    (valueObject.status === "draft" || valueObject.status === "active");

  function countLeafDescendants(parentId: string): number {
    const children = childrenByParent.get(parentId) ?? [];

    return children.reduce((count, child) => {
      if (child.node_role_code === "activity_leaf") {
        return count + 1;
      }

      return count + countLeafDescendants(child.id);
    }, 0);
  }

  const descendantLeafCount = countLeafDescendants(valueObject.id);

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
            {child.node_role_code || "—"} · {child.object_kind || "—"} ·{" "}
            {child.status}
          </div>
          <div className="mt-1 text-[16px] font-bold text-[#111827]">
            {child.title}
          </div>
        </Link>

        {child.node_role_code === "structural"
          ? renderSubtree(child.id, depth + 1)
          : null}
      </div>
    ));
  }

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {isRoot
              ? copy.rootEyebrow
              : isIntermediate
                ? copy.intermediateEyebrow
                : isLeaf
                  ? copy.leafEyebrow
                  : copy.genericEyebrow}
          </div>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[760px]">
              <h1 className="text-[32px] font-bold tracking-[-0.035em] text-[#111827]">
                {valueObject.title}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {valueObject.description || "—"}
              </p>

              {pathNodes.length > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#5a5f7a]">
                  <span className="uppercase tracking-[0.14em] text-[#7c8099]">
                    {copy.path}
                  </span>
                  {pathNodes.map((node, index) => (
                    <span
                      key={node.id}
                      className="inline-flex items-center gap-2"
                    >
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

            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href={buildLocaleHref("/value-objects", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                {copy.back}
              </Link>
              {isLeaf ? (
                <Link
                  href={buildLocaleHref(
                    `/value-objects/${valueObject.id}/standards`,
                    locale,
                  )}
                  title={copy.parametersAndTargetsReadOnly}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:border-[#aebfff] hover:bg-[#e8edff]"
                >
                  {copy.parametersAndTargets}
                </Link>
              ) : null}
              <Link
                href={buildLocaleHref(
                  `/value-objects/${valueObject.id}/restructure`,
                  locale,
                )}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e6dcff] bg-[#f7f1ff] px-4 py-3 text-[13px] font-bold text-[#8b5cf6] transition hover:border-[#cdb7ff] hover:bg-[#f1e9ff]"
              >
                {copy.restructure}
              </Link>
              <button
                type="button"
                disabled
                title={copy.editLater}
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-[#3b6ef8] px-5 py-3 text-[13px] font-bold text-white opacity-60 shadow-[0_8px_20px_rgba(59,110,248,0.22)]"
              >
                {copy.edit}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.directChildren}
            </div>
            <div className="mt-2 text-[28px] font-bold text-[#111827]">
              {directChildren.length}
            </div>
          </div>
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.descendantLeaves}
            </div>
            <div className="mt-2 text-[28px] font-bold text-[#111827]">
              {descendantLeafCount}
            </div>
          </div>
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.successCriteria}
            </div>
            <div className="mt-2 text-[28px] font-bold text-[#3b6ef8]">
              {successCriteria.length}
            </div>
          </div>
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.failureCriteria}
            </div>
            <div className="mt-2 text-[28px] font-bold text-[#8b5cf6]">
              {failureCriteria.length}
            </div>
          </div>
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.status}
            </div>
            <div className="mt-2 font-mono text-[15px] font-bold text-[#111827]">
              {valueObject.status}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
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
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      title={copy.addIntermediateLater}
                      className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-[#eadcff] bg-[#f7f1ff] px-4 py-2 text-[13px] font-bold text-[#8b5cf6] opacity-45"
                    >
                      {copy.addIntermediate}
                    </button>
                    <button
                      type="button"
                      disabled
                      title={copy.addLeafLater}
                      className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] opacity-45"
                    >
                      {copy.addLeaf}
                    </button>
                  </>
                )}
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

            <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
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

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
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
