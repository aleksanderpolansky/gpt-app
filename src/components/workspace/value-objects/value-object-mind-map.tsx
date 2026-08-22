"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Layers3,
  Leaf,
  Network,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import type {
  ValueObjectTreeRestructureApplyResult,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRestructurePreview,
} from "@/types/value-object-tree-restructure";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type SemanticRole = "root" | "intermediate" | "leaf";

export type MindMapValueObject = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  ontology_node_role_code?: string | null;
  usage_scope?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
};

type Copy = {
  authoring: string;
  help: string;
  open: string;
  root: string;
  intermediate: string;
  leaf: string;
  children: string;
  empty: string;
  expand: string;
  collapse: string;
  addChild: string;
  addIntermediate: string;
  addLeaf: string;
  deleteObject: string;
  deleteTitle: string;
  deleteWarning: string;
  cancel: string;
  confirmDelete: string;
  deleting: string;
  deleted: string;
  deletedMessage: string;
  close: string;
  blocked: string;
  technicalDependency: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    authoring: "Map authoring",
    help: "Create child objects, safely delete unused private objects and drag eligible intermediate/leaf nodes onto a root or intermediate node. Every structural move is previewed and confirmed before the existing controlled restructure contract applies it.",
    open: "Open object",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    children: "children",
    empty: "No observation objects match the current filter.",
    expand: "Expand branch",
    collapse: "Collapse branch",
    addChild: "Add child object",
    addIntermediate: "Add intermediate",
    addLeaf: "Add leaf",
    deleteObject: "Delete object",
    deleteTitle: "Delete observation object?",
    deleteWarning: "The existing guarded delete contract will allow this only for an unused private object without children or protected dependencies.",
    cancel: "Cancel",
    confirmDelete: "Delete object",
    deleting: "Deleting…",
    deleted: "Observation object deleted",
    deletedMessage: "The object was removed and the current catalog was updated.",
    close: "Close",
    blocked: "This object cannot be deleted safely.",
    technicalDependency: "Blocking dependency",
  },
  pl: {
    authoring: "Edycja na mapie",
    help: "Twórz obiekty podrzędne, bezpiecznie usuwaj nieużywane obiekty prywatne oraz przeciągaj dozwolone obiekty pośrednie i liście na korzeń lub obiekt pośredni. Każda zmiana rodzica najpierw otrzymuje podgląd i wymaga potwierdzenia.",
    open: "Otwórz obiekt",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    children: "dzieci",
    empty: "Brak obiektów obserwacji pasujących do bieżącego filtra.",
    expand: "Rozwiń gałąź",
    collapse: "Zwiń gałąź",
    addChild: "Dodaj obiekt podrzędny",
    addIntermediate: "Dodaj pośredni",
    addLeaf: "Dodaj liść",
    deleteObject: "Usuń obiekt",
    deleteTitle: "Usunąć obiekt obserwacji?",
    deleteWarning: "Istniejący bezpieczny kontrakt usuwania zezwoli na operację tylko dla nieużywanego obiektu prywatnego bez dzieci i chronionych zależności.",
    cancel: "Anuluj",
    confirmDelete: "Usuń obiekt",
    deleting: "Usuwanie…",
    deleted: "Obiekt obserwacji usunięty",
    deletedMessage: "Obiekt został usunięty, a bieżący katalog zaktualizowany.",
    close: "Zamknij",
    blocked: "Tego obiektu nie można bezpiecznie usunąć.",
    technicalDependency: "Blokująca zależność",
  },
  ru: {
    authoring: "Редактирование на карте",
    help: "Создавайте дочерние объекты, безопасно удаляйте неиспользуемые личные объекты и перетаскивайте разрешённые промежуточные/листовые узлы на корень или промежуточный объект. Любая смена родителя сначала проходит предпросмотр и требует подтверждения.",
    open: "Открыть объект",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    children: "дочерних",
    empty: "Нет объектов наблюдения, соответствующих текущему фильтру.",
    expand: "Развернуть ветвь",
    collapse: "Свернуть ветвь",
    addChild: "Добавить дочерний объект",
    addIntermediate: "Добавить промежуточный",
    addLeaf: "Добавить лист",
    deleteObject: "Удалить объект",
    deleteTitle: "Удалить объект наблюдения?",
    deleteWarning: "Существующий защищённый контракт удаления разрешит операцию только для неиспользуемого личного объекта без дочерних узлов и защищённых зависимостей.",
    cancel: "Отмена",
    confirmDelete: "Удалить объект",
    deleting: "Удаление…",
    deleted: "Объект наблюдения удалён",
    deletedMessage: "Объект удалён, текущий каталог обновлён.",
    close: "Закрыть",
    blocked: "Этот объект нельзя безопасно удалить.",
    technicalDependency: "Блокирующая зависимость",
  },
  uk: {
    authoring: "Редагування на мапі",
    help: "Створюйте дочірні об’єкти, безпечно видаляйте невикористані приватні об’єкти та перетягуйте дозволені проміжні/листові вузли на корінь або проміжний об’єкт. Кожна зміна батьківського об’єкта спочатку проходить попередній перегляд і потребує підтвердження.",
    open: "Відкрити об’єкт",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    children: "дочірніх",
    empty: "Немає об’єктів спостереження, що відповідають поточному фільтру.",
    expand: "Розгорнути гілку",
    collapse: "Згорнути гілку",
    addChild: "Додати дочірній об’єкт",
    addIntermediate: "Додати проміжний",
    addLeaf: "Додати лист",
    deleteObject: "Видалити об’єкт",
    deleteTitle: "Видалити об’єкт спостереження?",
    deleteWarning: "Наявний захищений контракт видалення дозволить операцію лише для невикористаного приватного об’єкта без дочірніх вузлів і захищених залежностей.",
    cancel: "Скасувати",
    confirmDelete: "Видалити об’єкт",
    deleting: "Видалення…",
    deleted: "Об’єкт спостереження видалено",
    deletedMessage: "Об’єкт видалено, поточний каталог оновлено.",
    close: "Закрити",
    blocked: "Цей об’єкт неможливо безпечно видалити.",
    technicalDependency: "Блокуюча залежність",
  },
  de: {
    authoring: "Bearbeitung auf der Karte",
    help: "Erstellen Sie untergeordnete Objekte, löschen Sie unbenutzte private Objekte sicher und ziehen Sie zulässige Zwischen-/Blattobjekte auf eine Wurzel oder ein Zwischenobjekt. Jede Elternänderung wird zuerst als Vorschau gezeigt und muss bestätigt werden.",
    open: "Objekt öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    children: "Kinder",
    empty: "Keine Beobachtungsobjekte entsprechen dem aktuellen Filter.",
    expand: "Zweig aufklappen",
    collapse: "Zweig zuklappen",
    addChild: "Untergeordnetes Objekt hinzufügen",
    addIntermediate: "Zwischenobjekt hinzufügen",
    addLeaf: "Blatt hinzufügen",
    deleteObject: "Objekt löschen",
    deleteTitle: "Beobachtungsobjekt löschen?",
    deleteWarning: "Der vorhandene geschützte Löschvertrag erlaubt dies nur für ein unbenutztes privates Objekt ohne Kinder oder geschützte Abhängigkeiten.",
    cancel: "Abbrechen",
    confirmDelete: "Objekt löschen",
    deleting: "Wird gelöscht…",
    deleted: "Beobachtungsobjekt gelöscht",
    deletedMessage: "Das Objekt wurde entfernt und der aktuelle Katalog aktualisiert.",
    close: "Schließen",
    blocked: "Dieses Objekt kann nicht sicher gelöscht werden.",
    technicalDependency: "Blockierende Abhängigkeit",
  },
  es: {
    authoring: "Edición en el mapa",
    help: "Cree objetos secundarios, elimine de forma segura objetos privados sin uso y arrastre objetos intermedios/hoja permitidos sobre una raíz o un objeto intermedio. Cada cambio de padre se previsualiza y debe confirmarse antes de aplicarse.",
    open: "Abrir objeto",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    children: "hijos",
    empty: "Ningún objeto de observación coincide con el filtro actual.",
    expand: "Expandir rama",
    collapse: "Contraer rama",
    addChild: "Añadir objeto secundario",
    addIntermediate: "Añadir intermedio",
    addLeaf: "Añadir hoja",
    deleteObject: "Eliminar objeto",
    deleteTitle: "¿Eliminar objeto de observación?",
    deleteWarning: "El contrato de eliminación protegido existente solo permitirá la operación para un objeto privado sin uso, sin hijos ni dependencias protegidas.",
    cancel: "Cancelar",
    confirmDelete: "Eliminar objeto",
    deleting: "Eliminando…",
    deleted: "Objeto de observación eliminado",
    deletedMessage: "El objeto se eliminó y el catálogo actual se actualizó.",
    close: "Cerrar",
    blocked: "Este objeto no se puede eliminar de forma segura.",
    technicalDependency: "Dependencia bloqueante",
  },
  cs: {
    authoring: "Úpravy na mapě",
    help: "Vytvářejte podřízené objekty, bezpečně odstraňujte nepoužívané soukromé objekty a přetahujte povolené mezilehlé/listové uzly na kořen nebo mezilehlý objekt. Každá změna rodiče se nejprve zobrazí v náhledu a musí být potvrzena.",
    open: "Otevřít objekt",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    children: "potomků",
    empty: "Aktuálnímu filtru neodpovídají žádné objekty pozorování.",
    expand: "Rozbalit větev",
    collapse: "Sbalit větev",
    addChild: "Přidat podřízený objekt",
    addIntermediate: "Přidat mezilehlý",
    addLeaf: "Přidat list",
    deleteObject: "Odstranit objekt",
    deleteTitle: "Odstranit objekt pozorování?",
    deleteWarning: "Stávající chráněný kontrakt odstranění povolí operaci pouze pro nepoužívaný soukromý objekt bez potomků a chráněných závislostí.",
    cancel: "Zrušit",
    confirmDelete: "Odstranit objekt",
    deleting: "Odstraňování…",
    deleted: "Objekt pozorování odstraněn",
    deletedMessage: "Objekt byl odstraněn a aktuální katalog aktualizován.",
    close: "Zavřít",
    blocked: "Tento objekt nelze bezpečně odstranit.",
    technicalDependency: "Blokující závislost",
  },
};

type ReparentCopy = {
  move: string;
  moveTitle: string;
  moveHint: string;
  oldParent: string;
  newParent: string;
  previewing: string;
  affected: string;
  warnings: string;
  noWarnings: string;
  confirm: string;
  applying: string;
  applied: string;
  close: string;
  previewFailed: string;
  applyFailed: string;
  descendantBlocked: string;
  dropHint: string;
};

const REPARENT_COPY: Record<LocaleCode, ReparentCopy> = {
  en: {
    move: "Move object",
    moveTitle: "Change structural parent?",
    moveHint: "The drop only selects a proposed parent. The existing controlled preview/apply contract remains authoritative.",
    oldParent: "Current parent",
    newParent: "Proposed parent",
    previewing: "Checking the structural move…",
    affected: "Affected objects",
    warnings: "Warnings",
    noWarnings: "No additional warnings.",
    confirm: "Confirm and move",
    applying: "Applying…",
    applied: "Structural parent changed",
    close: "Close",
    previewFailed: "Could not build a safe restructure preview.",
    applyFailed: "Could not apply the structural move.",
    descendantBlocked: "An object cannot be moved under its own descendant.",
    dropHint: "Drag an intermediate or leaf object onto a root or intermediate object.",
  },
  pl: {
    move: "Przenieś obiekt",
    moveTitle: "Zmienić rodzica strukturalnego?",
    moveHint: "Upuszczenie tylko wybiera proponowanego rodzica. Obowiązujący kontrakt podglądu i zastosowania pozostaje nadrzędny.",
    oldParent: "Obecny rodzic",
    newParent: "Proponowany rodzic",
    previewing: "Sprawdzanie zmiany struktury…",
    affected: "Obiekty objęte zmianą",
    warnings: "Ostrzeżenia",
    noWarnings: "Brak dodatkowych ostrzeżeń.",
    confirm: "Potwierdź i przenieś",
    applying: "Stosowanie…",
    applied: "Rodzic strukturalny został zmieniony",
    close: "Zamknij",
    previewFailed: "Nie udało się zbudować bezpiecznego podglądu przebudowy.",
    applyFailed: "Nie udało się zastosować zmiany struktury.",
    descendantBlocked: "Nie można przenieść obiektu pod jego własnego potomka.",
    dropHint: "Przeciągnij obiekt pośredni lub liść na korzeń albo obiekt pośredni.",
  },
  ru: {
    move: "Переместить объект",
    moveTitle: "Изменить структурного родителя?",
    moveHint: "Перетаскивание только выбирает предлагаемого родителя. Авторитетным остаётся существующий контролируемый контур preview/apply.",
    oldParent: "Текущий родитель",
    newParent: "Предлагаемый родитель",
    previewing: "Проверяю структурный перенос…",
    affected: "Затронутые объекты",
    warnings: "Предупреждения",
    noWarnings: "Дополнительных предупреждений нет.",
    confirm: "Подтвердить и переместить",
    applying: "Применяю…",
    applied: "Структурный родитель изменён",
    close: "Закрыть",
    previewFailed: "Не удалось построить безопасный предпросмотр перестройки.",
    applyFailed: "Не удалось применить структурный перенос.",
    descendantBlocked: "Объект нельзя переместить под собственного потомка.",
    dropHint: "Перетащите промежуточный или листовой объект на корень либо промежуточный объект.",
  },
  uk: {
    move: "Перемістити об’єкт",
    moveTitle: "Змінити структурний батьківський об’єкт?",
    moveHint: "Перетягування лише вибирає запропонований батьківський об’єкт. Чинний контрольований контур preview/apply залишається авторитетним.",
    oldParent: "Поточний батьківський об’єкт",
    newParent: "Запропонований батьківський об’єкт",
    previewing: "Перевіряю структурне переміщення…",
    affected: "Зачеплені об’єкти",
    warnings: "Попередження",
    noWarnings: "Додаткових попереджень немає.",
    confirm: "Підтвердити й перемістити",
    applying: "Застосовую…",
    applied: "Структурний батьківський об’єкт змінено",
    close: "Закрити",
    previewFailed: "Не вдалося побудувати безпечний попередній перегляд перебудови.",
    applyFailed: "Не вдалося застосувати структурне переміщення.",
    descendantBlocked: "Об’єкт не можна перемістити під його власного нащадка.",
    dropHint: "Перетягніть проміжний або листовий об’єкт на корінь чи проміжний об’єкт.",
  },
  de: {
    move: "Objekt verschieben",
    moveTitle: "Strukturelles Elternelement ändern?",
    moveHint: "Das Ablegen wählt nur ein vorgeschlagenes Elternelement. Der bestehende kontrollierte Vorschau-/Anwenden-Vertrag bleibt maßgeblich.",
    oldParent: "Aktuelles Elternelement",
    newParent: "Vorgeschlagenes Elternelement",
    previewing: "Strukturänderung wird geprüft…",
    affected: "Betroffene Objekte",
    warnings: "Warnungen",
    noWarnings: "Keine zusätzlichen Warnungen.",
    confirm: "Bestätigen und verschieben",
    applying: "Wird angewendet…",
    applied: "Strukturelles Elternelement geändert",
    close: "Schließen",
    previewFailed: "Eine sichere Vorschau der Umstrukturierung konnte nicht erstellt werden.",
    applyFailed: "Die Strukturänderung konnte nicht angewendet werden.",
    descendantBlocked: "Ein Objekt kann nicht unter seinen eigenen Nachfahren verschoben werden.",
    dropHint: "Ziehen Sie ein Zwischen- oder Blattobjekt auf eine Wurzel oder ein Zwischenobjekt.",
  },
  es: {
    move: "Mover objeto",
    moveTitle: "¿Cambiar el padre estructural?",
    moveHint: "Soltar solo selecciona un padre propuesto. El contrato controlado existente de vista previa/aplicación sigue siendo autoritativo.",
    oldParent: "Padre actual",
    newParent: "Padre propuesto",
    previewing: "Comprobando el cambio estructural…",
    affected: "Objetos afectados",
    warnings: "Advertencias",
    noWarnings: "No hay advertencias adicionales.",
    confirm: "Confirmar y mover",
    applying: "Aplicando…",
    applied: "Padre estructural cambiado",
    close: "Cerrar",
    previewFailed: "No se pudo crear una vista previa segura de la reestructuración.",
    applyFailed: "No se pudo aplicar el cambio estructural.",
    descendantBlocked: "Un objeto no puede moverse debajo de su propio descendiente.",
    dropHint: "Arrastre un objeto intermedio u hoja sobre una raíz o un objeto intermedio.",
  },
  cs: {
    move: "Přesunout objekt",
    moveTitle: "Změnit strukturálního rodiče?",
    moveHint: "Upuštění pouze vybere navrhovaného rodiče. Stávající řízený kontrakt náhledu a použití zůstává autoritativní.",
    oldParent: "Aktuální rodič",
    newParent: "Navrhovaný rodič",
    previewing: "Kontrola strukturálního přesunu…",
    affected: "Ovlivněné objekty",
    warnings: "Upozornění",
    noWarnings: "Žádná další upozornění.",
    confirm: "Potvrdit a přesunout",
    applying: "Používání…",
    applied: "Strukturální rodič změněn",
    close: "Zavřít",
    previewFailed: "Nepodařilo se vytvořit bezpečný náhled restrukturalizace.",
    applyFailed: "Nepodařilo se použít strukturální přesun.",
    descendantBlocked: "Objekt nelze přesunout pod jeho vlastního potomka.",
    dropHint: "Přetáhněte mezilehlý nebo listový objekt na kořen či mezilehlý objekt.",
  },
};

function getSemanticRole(valueObject: MindMapValueObject): SemanticRole {
  if (
    valueObject.ontology_node_role_code === "root" ||
    valueObject.ontology_node_role_code === "intermediate" ||
    valueObject.ontology_node_role_code === "leaf"
  ) {
    return valueObject.ontology_node_role_code;
  }

  if (
    valueObject.id &&
    valueObject.parent_value_object_id === null &&
    valueObject.root_value_object_id === valueObject.id
  ) {
    return "root";
  }

  if (valueObject.node_role_code === "activity_leaf") {
    return "leaf";
  }

  return "intermediate";
}

function roleLabel(role: SemanticRole, copy: Copy) {
  if (role === "root") return copy.root;
  if (role === "leaf") return copy.leaf;
  return copy.intermediate;
}

function roleClasses(role: SemanticRole) {
  if (role === "root") {
    return {
      shell: "border-[#b8c8ff] bg-[#f7f9ff]",
      icon: "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]",
      badge: "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]",
    };
  }

  if (role === "leaf") {
    return {
      shell: "border-emerald-200 bg-white",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    shell: "border-violet-200 bg-white",
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
  };
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

type MindMapNodeData = Record<string, unknown> & {
  title: string;
  description: string;
  role: SemanticRole;
  roleLabel: string;
  childCount: number;
  childLabel: string;
  hasChildren: boolean;
  collapsed: boolean;
  href: string;
  openLabel: string;
  expandLabel: string;
  collapseLabel: string;
  addChildLabel: string;
  addIntermediateLabel: string;
  addLeafLabel: string;
  deleteLabel: string;
  canAddIntermediate: boolean;
  canAddLeaf: boolean;
  canRequestDelete: boolean;
  canReparent: boolean;
  moveLabel: string;
  intermediateHref: string;
  leafHref: string;
  onToggle: (id: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
};

type DeleteResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  deletedId?: string;
  parentValueObjectId?: string | null;
  redirectUrl?: string;
  blocker?: {
    table?: string | null;
    column?: string | null;
    count?: number | null;
  } | null;
};

type DeleteTarget = {
  id: string;
  title: string;
};

type MindMapNode = Node<MindMapNodeData, "arctorObservationObject">;

function ObservationObjectMapNode({ id, data }: NodeProps<MindMapNode>) {
  const classes = roleClasses(data.role);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const RoleIcon =
    data.role === "root" ? Network : data.role === "leaf" ? Leaf : Layers3;

  return (
    <div
      className={[
        "relative w-[238px] rounded-[18px] border p-3.5 shadow-[0_6px_20px_rgba(31,41,55,0.08)]",
        data.canReparent ? "cursor-grab active:cursor-grabbing" : "",
        classes.shell,
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!h-2 !w-2 !border-2 !border-white !bg-[#9aacdf]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-2 !w-2 !border-2 !border-white !bg-[#9aacdf]"
      />

      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            classes.icon,
          ].join(" ")}
        >
          <RoleIcon size={18} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 text-[13px] font-bold leading-5 text-[#111827]">
                {data.title}
              </div>
              <span
                className={[
                  "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold",
                  classes.badge,
                ].join(" ")}
              >
                {data.roleLabel}
              </span>
            </div>

            {data.hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  data.onToggle(id);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dfe3f1] bg-white text-[#6b7280] transition hover:border-[#b8c8ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
                aria-label={data.collapsed ? data.expandLabel : data.collapseLabel}
              >
                {data.collapsed ? (
                  <ChevronRight size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
            ) : null}
          </div>

          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#7c8099]">
            {data.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf0f7] pt-2.5">
        <span className="text-[9px] font-semibold text-[#7c8099]">
          {data.childCount} {data.childLabel}
        </span>
        <div className="nodrag nopan flex items-center gap-1">
          {data.canReparent ? (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e7eaf3] bg-white text-[#7c8099]"
              aria-label={data.moveLabel}
              title={data.moveLabel}
            >
              <GripVertical size={13} strokeWidth={1.9} />
            </span>
          ) : null}

          {data.canAddIntermediate || data.canAddLeaf ? (
            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAddMenuOpen((current) => !current);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#c9d5ff] bg-white text-[#3b6ef8] transition hover:bg-[#eef2ff]"
                aria-label={data.addChildLabel}
                title={data.addChildLabel}
              >
                <Plus size={14} strokeWidth={2.1} />
              </button>
              {addMenuOpen ? (
                <div
                  className="absolute bottom-9 right-0 z-30 grid min-w-[154px] gap-1 rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {data.canAddIntermediate ? (
                    <Link
                      href={data.intermediateHref}
                      className="rounded-lg bg-[#eef2ff] px-2.5 py-2 text-[10px] font-bold text-[#3b6ef8] hover:bg-[#dfe4ff]"
                    >
                      + {data.addIntermediateLabel}
                    </Link>
                  ) : null}
                  {data.canAddLeaf ? (
                    <Link
                      href={data.leafHref}
                      className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      + {data.addLeafLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {data.canRequestDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onDeleteRequest(id, data.title);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50"
              aria-label={data.deleteLabel}
              title={data.deleteLabel}
            >
              <Trash2 size={13} strokeWidth={1.9} />
            </button>
          ) : null}

          <Link
            href={data.href}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 pl-1 text-[10px] font-bold text-[#3b6ef8] hover:underline"
          >
            {data.openLabel}
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function canRequestDelete(valueObject: MindMapValueObject) {
  return (
    valueObject.scope_code !== "global" &&
    valueObject.usage_scope !== "commercial" &&
    valueObject.origin_type_code === "user_declared" &&
    (valueObject.definition_version ?? 1) === 1
  );
}

function canReparent(valueObject: MindMapValueObject) {
  const role = getSemanticRole(valueObject);
  return (
    role !== "root" &&
    valueObject.scope_code !== "global" &&
    valueObject.usage_scope !== "commercial" &&
    valueObject.origin_type_code === "user_declared"
  );
}

const NODE_TYPES = {
  arctorObservationObject: ObservationObjectMapNode,
};

const NODE_WIDTH = 238;
const NODE_HEIGHT = 138;
const LEVEL_GAP = 96;
const COLUMN_GAP = 44;
const ROOT_GAP = 92;

type GraphBuildResult = {
  nodes: MindMapNode[];
  edges: Edge[];
};

function buildGraph(input: {
  valueObjects: MindMapValueObject[];
  collapsedIds: Set<string>;
  locale: LocaleCode;
  copy: Copy;
  reparentCopy: ReparentCopy;
  onToggle: (id: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
}): GraphBuildResult {
  const {
    valueObjects,
    collapsedIds,
    locale,
    copy,
    reparentCopy,
    onToggle,
    onDeleteRequest,
  } = input;
  const byId = new Map<string, MindMapValueObject>();
  const childrenByParent = new Map<string, MindMapValueObject[]>();

  for (const valueObject of valueObjects) {
    if (valueObject.id) byId.set(valueObject.id, valueObject);
  }

  for (const valueObject of valueObjects) {
    if (!valueObject.id || !valueObject.parent_value_object_id) continue;
    if (!byId.has(valueObject.parent_value_object_id)) continue;
    const siblings = childrenByParent.get(valueObject.parent_value_object_id) ?? [];
    siblings.push(valueObject);
    childrenByParent.set(valueObject.parent_value_object_id, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) =>
      (a.title ?? "").localeCompare(b.title ?? "", locale),
    );
  }

  const roots = valueObjects
    .filter(
      (valueObject) =>
        valueObject.id &&
        (!valueObject.parent_value_object_id ||
          !byId.has(valueObject.parent_value_object_id)),
    )
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", locale));

  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();
  let nextX = 0;

  function layout(valueObject: MindMapValueObject, depth: number): number {
    if (!valueObject.id || visited.has(valueObject.id)) return nextX;
    visited.add(valueObject.id);

    const id = valueObject.id;
    const allChildren = childrenByParent.get(id) ?? [];
    const childObjects = collapsedIds.has(id) ? [] : allChildren;
    const childXs: number[] = [];

    for (const child of childObjects) {
      childXs.push(layout(child, depth + 1));
    }

    let x: number;
    if (childXs.length === 0) {
      x = nextX;
      nextX += NODE_WIDTH + COLUMN_GAP;
    } else {
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }

    const role = getSemanticRole(valueObject);
    const title = valueObject.title?.trim() || "—";
    const description = valueObject.description?.trim() || "—";

    nodes.push({
      id,
      type: "arctorObservationObject",
      position: {
        x,
        y: depth * (NODE_HEIGHT + LEVEL_GAP),
      },
      draggable: canReparent(valueObject),
      selectable: true,
      data: {
        title,
        description,
        role,
        roleLabel: roleLabel(role, copy),
        childCount: allChildren.length,
        childLabel: copy.children,
        hasChildren: allChildren.length > 0,
        collapsed: collapsedIds.has(id),
        href: buildLocaleAwareHref(`/value-objects/${id}`, locale),
        openLabel: copy.open,
        expandLabel: copy.expand,
        collapseLabel: copy.collapse,
        addChildLabel: copy.addChild,
        addIntermediateLabel: copy.addIntermediate,
        addLeafLabel: copy.addLeaf,
        deleteLabel: copy.deleteObject,
        canAddIntermediate: role === "root" || role === "intermediate",
        canAddLeaf: role === "intermediate",
        canRequestDelete: canRequestDelete(valueObject),
        canReparent: canReparent(valueObject),
        moveLabel: reparentCopy.move,
        intermediateHref: buildLocaleAwareHref(
          `/value-objects/${id}/new-intermediate`,
          locale,
        ),
        leafHref: buildLocaleAwareHref(`/value-objects/${id}/new-leaf`, locale),
        onToggle,
        onDeleteRequest,
      },
    });

    for (const child of childObjects) {
      if (!child.id) continue;
      edges.push({
        id: `structural-${id}-${child.id}`,
        source: id,
        target: child.id,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#9aacdf",
          strokeWidth: 1.6,
        },
      });
    }

    return x;
  }

  for (const root of roots) {
    layout(root, 0);
    nextX += ROOT_GAP;
  }

  // Fail closed for cycles: objects that cannot be reached from a structural root
  // are intentionally not promoted to fake roots on the map.
  return { nodes, edges };
}

type ReparentTarget = {
  sourceId: string;
  sourceTitle: string;
  oldParentId: string | null;
  oldParentTitle: string;
  newParentId: string;
  newParentTitle: string;
  oldPath: string;
  newPath: string;
};

function createIdempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildLocalizedPath(
  byId: Map<string, MindMapValueObject>,
  objectId: string,
) {
  const path: string[] = [];
  const visited = new Set<string>();
  let cursor = byId.get(objectId);
  while (cursor?.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    path.unshift(cursor.title?.trim() || "—");
    const parentId = cursor.parent_value_object_id;
    if (!parentId) break;
    cursor = byId.get(parentId);
  }
  return path.join(" → ");
}

function isDescendantOf(
  byId: Map<string, MindMapValueObject>,
  candidateId: string,
  ancestorId: string,
) {
  const visited = new Set<string>();
  let cursor = byId.get(candidateId);
  while (cursor?.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    const parentId = cursor.parent_value_object_id;
    if (!parentId) return false;
    if (parentId === ancestorId) return true;
    cursor = byId.get(parentId);
  }
  return false;
}

function MindMapCanvas({
  valueObjects,
  locale,
  onValueObjectDeleted,
  onValueObjectReparented,
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
  onValueObjectDeleted?: (deletedId: string) => void;
  onValueObjectReparented?: (movedId: string, newParentId: string) => void;
}) {
  const copy = COPY[locale] ?? COPY.en;
  const reparentCopy = REPARENT_COPY[locale] ?? REPARENT_COPY.en;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteResult, setDeleteResult] = useState<DeleteResponse | null>(null);
  const [reparentTarget, setReparentTarget] = useState<ReparentTarget | null>(null);
  const [reparentPreview, setReparentPreview] =
    useState<ValueObjectTreeRestructurePreview | null>(null);
  const [reparentResult, setReparentResult] =
    useState<ValueObjectTreeRestructureApplyResult | null>(null);
  const [reparentPending, setReparentPending] =
    useState<"preview" | "apply" | null>(null);
  const [reparentError, setReparentError] = useState("");
  const { fitView, getIntersectingNodes } = useReactFlow<MindMapNode, Edge>();

  const valueObjectsById = useMemo(() => {
    const byId = new Map<string, MindMapValueObject>();
    for (const valueObject of valueObjects) {
      if (valueObject.id) byId.set(valueObject.id, valueObject);
    }
    return byId;
  }, [valueObjects]);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const requestDelete = useCallback((id: string, title: string) => {
    setDeleteTarget({ id, title });
    setDeleteError("");
    setDeleteResult(null);
  }, []);

  const deleteObject = useCallback(async () => {
    if (!deleteTarget || deletePending || deleteResult?.ok) return;

    setDeletePending(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeleteResponse | null;

      if (!response.ok || payload?.ok !== true) {
        const blockerText = payload?.blocker?.table
          ? ` ${copy.technicalDependency}: ${payload.blocker.table}${
              payload.blocker.column ? `.${payload.blocker.column}` : ""
            }.`
          : "";
        throw new Error(
          `${payload?.error || copy.blocked}${blockerText}`.trim(),
        );
      }

      setDeleteResult(payload);
      onValueObjectDeleted?.(deleteTarget.id);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : copy.blocked);
    } finally {
      setDeletePending(false);
    }
  }, [
    copy.blocked,
    copy.technicalDependency,
    deletePending,
    deleteResult?.ok,
    deleteTarget,
    onValueObjectDeleted,
  ]);

  const graph = useMemo(
    () =>
      buildGraph({
        valueObjects,
        collapsedIds,
        locale,
        copy,
        reparentCopy,
        onToggle: toggleCollapsed,
        onDeleteRequest: requestDelete,
      }),
    [
      collapsedIds,
      copy,
      locale,
      reparentCopy,
      requestDelete,
      toggleCollapsed,
      valueObjects,
    ],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<MindMapNode>(
    graph.nodes,
  );

  useEffect(() => {
    setFlowNodes(graph.nodes);
  }, [graph.nodes, setFlowNodes]);

  const buildReparentPreview = useCallback(
    async (target: ReparentTarget) => {
      setReparentTarget(target);
      setReparentPreview(null);
      setReparentResult(null);
      setReparentError("");
      setReparentPending("preview");
      try {
        const response = await fetch(
          `/api/value-objects/${encodeURIComponent(target.sourceId)}/tree-restructure/preview`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              mode: "reparent",
              payload: { newParentValueObjectId: target.newParentId },
            }),
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | ValueObjectTreeRestructurePreview
          | ValueObjectTreeRestructureError
          | null;
        if (!response.ok || !payload || !("previewHash" in payload)) {
          throw new Error(payload && "error" in payload ? payload.error : reparentCopy.previewFailed);
        }
        setReparentPreview(payload);
      } catch (caught) {
        setReparentError(caught instanceof Error ? caught.message : reparentCopy.previewFailed);
      } finally {
        setReparentPending(null);
      }
    },
    [reparentCopy.previewFailed],
  );

  const applyReparent = useCallback(async () => {
    if (!reparentTarget || !reparentPreview || reparentPending || reparentResult?.ok) return;
    setReparentPending("apply");
    setReparentError("");
    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(reparentTarget.sourceId)}/tree-restructure/apply`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            mode: "reparent",
            payload: { newParentValueObjectId: reparentTarget.newParentId },
            previewHash: reparentPreview.previewHash,
            idempotencyKey: createIdempotencyKey("mind-map-reparent"),
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ValueObjectTreeRestructureApplyResult
        | ValueObjectTreeRestructureError
        | null;
      if (!response.ok || !payload || !("operationId" in payload)) {
        throw new Error(payload && "error" in payload ? payload.error : reparentCopy.applyFailed);
      }
      setReparentResult(payload);
      onValueObjectReparented?.(reparentTarget.sourceId, reparentTarget.newParentId);
    } catch (caught) {
      setReparentError(caught instanceof Error ? caught.message : reparentCopy.applyFailed);
    } finally {
      setReparentPending(null);
    }
  }, [onValueObjectReparented, reparentCopy.applyFailed, reparentPending, reparentPreview, reparentResult?.ok, reparentTarget]);

  const handleNodeDragStop = useCallback(
    (node: MindMapNode) => {
      setFlowNodes(graph.nodes);
      const sourceObject = valueObjectsById.get(node.id);
      if (!sourceObject || !canReparent(sourceObject)) return;
      const sourceRole = getSemanticRole(sourceObject);
      const candidates = getIntersectingNodes(node, true).filter((candidate) => {
        if (candidate.id === node.id || candidate.data.role === "leaf") return false;
        if (sourceRole === "leaf") return candidate.data.role === "intermediate";
        return candidate.data.role === "root" || candidate.data.role === "intermediate";
      });
      if (candidates.length === 0) return;
      const sourceCenterX = node.position.x + NODE_WIDTH / 2;
      const sourceCenterY = node.position.y + NODE_HEIGHT / 2;
      const targetNode = [...candidates].sort((a, b) => {
        const distanceA = Math.hypot(a.position.x + NODE_WIDTH / 2 - sourceCenterX, a.position.y + NODE_HEIGHT / 2 - sourceCenterY);
        const distanceB = Math.hypot(b.position.x + NODE_WIDTH / 2 - sourceCenterX, b.position.y + NODE_HEIGHT / 2 - sourceCenterY);
        return distanceA - distanceB;
      })[0];
      const targetObject = valueObjectsById.get(targetNode.id);
      if (!targetObject || getSemanticRole(targetObject) === "leaf") return;
      const targetId = targetNode.id;
      if (sourceObject.parent_value_object_id === targetId) return;
      const oldParent = sourceObject.parent_value_object_id
        ? valueObjectsById.get(sourceObject.parent_value_object_id)
        : null;
      const sourceTitle = sourceObject.title?.trim() || "—";
      const targetTitle = targetObject.title?.trim() || "—";
      const targetPath = buildLocalizedPath(valueObjectsById, targetId);
      const target: ReparentTarget = {
        sourceId: node.id,
        sourceTitle,
        oldParentId: sourceObject.parent_value_object_id ?? null,
        oldParentTitle: oldParent?.title?.trim() || "—",
        newParentId: targetId,
        newParentTitle: targetTitle,
        oldPath: buildLocalizedPath(valueObjectsById, node.id),
        newPath: targetPath ? `${targetPath} → ${sourceTitle}` : sourceTitle,
      };
      if (isDescendantOf(valueObjectsById, target.newParentId, target.sourceId)) {
        setReparentTarget(target);
        setReparentPreview(null);
        setReparentResult(null);
        setReparentError(reparentCopy.descendantBlocked);
        return;
      }
      void buildReparentPreview(target);
    },
    [buildReparentPreview, getIntersectingNodes, graph.nodes, reparentCopy.descendantBlocked, setFlowNodes, valueObjectsById],
  );

  useEffect(() => {
    if (graph.nodes.length === 0) return;

    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 220, maxZoom: 1.05 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fitView, graph]);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-[13px] text-[#7c8099]">
        {copy.empty}
      </div>
    );
  }

  return (
    <>
      <ReactFlow<MindMapNode, Edge>
      nodes={flowNodes}
      edges={graph.edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onNodeDragStop={(_event, node) => handleNodeDragStop(node)}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1.05 }}
      minZoom={0.2}
      maxZoom={1.6}
      attributionPosition="bottom-right"
      className="bg-[#f8fafc]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="#d7def0"
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="!overflow-hidden !rounded-xl !border !border-[#dfe3f1] !bg-white !shadow-sm"
      />
      </ReactFlow>

      {reparentTarget ? (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mind-map-reparent-title"
        >
          <div className="w-full max-w-[620px] rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="mind-map-reparent-title" className="text-[20px] font-bold text-[#111827]">
                  {reparentResult?.ok ? reparentCopy.applied : reparentCopy.moveTitle}
                </h2>
                <p className="mt-2 text-[12px] leading-5 text-[#5a5f7a]">{reparentCopy.moveHint}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(reparentPending)}
                onClick={() => setReparentTarget(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#6b7280] hover:bg-[#f8fafc] disabled:opacity-50"
                aria-label={reparentCopy.close}
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#edf0f7] bg-[#f8fafc] p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">{reparentCopy.oldParent}</div>
                <div className="mt-1 text-[13px] font-bold text-[#111827]">{reparentTarget.oldParentTitle}</div>
              </div>
              <div className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6670a0]">{reparentCopy.newParent}</div>
                <div className="mt-1 text-[13px] font-bold text-[#253b80]">{reparentTarget.newParentTitle}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 rounded-xl border border-[#edf0f7] bg-white p-3 text-[11px] leading-5 text-[#5a5f7a]">
              <div><span className="font-bold text-[#111827]">{reparentTarget.sourceTitle}</span></div>
              <div className="break-words">{reparentTarget.oldPath}</div>
              <div className="text-[#3b6ef8]">↓</div>
              <div className="break-words font-semibold text-[#334155]">{reparentTarget.newPath}</div>
            </div>
            {reparentPending === "preview" ? (
              <div className="mt-4 rounded-xl border border-[#dfe4ff] bg-[#eef2ff] p-3 text-[12px] font-semibold text-[#3b6ef8]">{reparentCopy.previewing}</div>
            ) : null}
            {reparentPreview ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-[#edf0f7] bg-[#fafbff] p-3 text-[12px] text-[#4a4f6a]">
                  <span className="font-bold text-[#111827]">{reparentCopy.affected}:</span>{" "}{reparentPreview.affectedNodes.length}
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                  <div className="font-bold">{reparentCopy.warnings}</div>
                  {reparentPreview.warnings.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5">
                      {reparentPreview.warnings.map((warning) => (<li key={warning}>{warning}</li>))}
                    </ul>
                  ) : (<div className="mt-1">{reparentCopy.noWarnings}</div>)}
                </div>
              </div>
            ) : null}
            {reparentError ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-800">{reparentError}</div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(reparentPending)}
                onClick={() => setReparentTarget(null)}
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc] disabled:opacity-50"
              >
                {reparentCopy.close}
              </button>
              {reparentPreview && !reparentResult?.ok ? (
                <button
                  type="button"
                  disabled={Boolean(reparentPending)}
                  onClick={() => void applyReparent()}
                  className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#315fd8] disabled:cursor-wait disabled:opacity-60"
                >
                  {reparentPending === "apply" ? reparentCopy.applying : reparentCopy.confirm}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mind-map-delete-title"
        >
          <div className="w-full max-w-[540px] rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-2xl">
            {deleteResult?.ok ? (
              <div role="status" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="mind-map-delete-title"
                      className="text-[20px] font-bold text-[#111827]"
                    >
                      {copy.deleted}
                    </h2>
                    <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                      {copy.deletedMessage}
                    </p>
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-bold text-emerald-950">
                      {deleteTarget.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#6b7280] hover:bg-[#f8fafc]"
                    aria-label={copy.close}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#315fd8]"
                  >
                    {copy.close}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="mind-map-delete-title"
                      className="text-[20px] font-bold text-[#111827]"
                    >
                      {copy.deleteTitle}
                    </h2>
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="text-[14px] font-bold text-red-950">
                        {deleteTarget.title}
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-red-900">
                        {copy.deleteWarning}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => setDeleteTarget(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#6b7280] hover:bg-[#f8fafc] disabled:opacity-50"
                    aria-label={copy.cancel}
                  >
                    <X size={17} />
                  </button>
                </div>

                {deleteError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-800"
                  >
                    {deleteError}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#4a4f6a] hover:bg-[#f8fafc] disabled:opacity-50"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => void deleteObject()}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletePending ? copy.deleting : copy.confirmDelete}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ValueObjectMindMap({
  valueObjects,
  locale,
  onValueObjectDeleted,
  onValueObjectReparented,
}: {
  valueObjects: MindMapValueObject[];
  locale: LocaleCode;
  onValueObjectDeleted?: (deletedId: string) => void;
  onValueObjectReparented?: (movedId: string, newParentId: string) => void;
}) {
  const copy = COPY[locale] ?? COPY.en;
  const reparentCopy = REPARENT_COPY[locale] ?? REPARENT_COPY.en;

  return (
    <section className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f7] px-4 py-3">
        <div>
          <div className="inline-flex rounded-full border border-[#dfe4ff] bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold text-[#3b6ef8]">
            {copy.authoring}
          </div>
          <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#7c8099]">
            {copy.help}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#3b6ef8]">
            {reparentCopy.dropHint}
          </p>
        </div>
        <span className="rounded-full border border-[#e7eaf3] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold text-[#6b7280]">
          {valueObjects.length}
        </span>
      </div>

      <div className="h-[560px] min-h-[420px] w-full sm:h-[620px] lg:h-[680px]">
        <ReactFlowProvider>
          <MindMapCanvas
            valueObjects={valueObjects}
            locale={locale}
            onValueObjectDeleted={onValueObjectDeleted}
            onValueObjectReparented={onValueObjectReparented}
          />
        </ReactFlowProvider>
      </div>
    </section>
  );
}
