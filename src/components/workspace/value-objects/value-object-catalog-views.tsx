"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Layers3,
  LayoutGrid,
  Leaf,
  ListTree,
  Map as MapIcon,
  Network,
  Plus,
  Redo2,
  Table2,
  Trash2,
  Undo2,
} from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";

import {
  ArctorTabulator,
  type ArctorTableCellEditedEvent,
  type ArctorTableColumn,
  type ArctorTableOptions,
  type ArctorTableRangePasteEvent,
} from "@/components/tables/arctor-tabulator";

import { StandaloneWorkspaceCloseButton } from "@/components/workspace/standalone-workspace-close-button";

import {
  canCreateObservationObjectChildUnder,
  canUseObservationObjectTableParent,
  createObservationObjectFromTable,
  createValueObjectTableDraft,
  getDefaultObservationObjectTableChildRole,
  type ValueObjectTableCreateDraft,
  type ValueObjectTableCreateRole,
} from "./value-object-table-row-create";
import {
  deleteObservationObjectFromTable,
  ValueObjectTableDeleteError,
} from "./value-object-table-row-delete";
import {
  applyObservationObjectTableReparent,
  canReparentObservationObjectFromTable,
  canUseObservationObjectTableReparentParent,
  createValueObjectTableReparentDraft,
  previewObservationObjectTableReparent,
  ValueObjectTableReparentError,
  type ValueObjectTableReparentDraft,
  type ValueObjectTableReparentPreview,
} from "./value-object-table-row-reparent";

import { ValueObjectMindMap } from "./value-object-mind-map";
import {
  canEditValueObjectTableCells,
  getValueObjectTableEditStrategy,
  getValueObjectTableEditorCopy,
  saveValueObjectTableField,
  validateValueObjectTableFieldValue,
  type ValueObjectTableEditableField,
  type ValueObjectTableEditPatch,
} from "./value-object-table-editor";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type RoleFilter = "all" | "root" | "intermediate" | "leaf" | "draft";
type SortMode = "newest" | "title" | "structure";
type SemanticRole = "root" | "intermediate" | "leaf";
type ViewMode = "tree" | "cards" | "map" | "table";

type OrganizationPayload = {
  organization_name?: string | null;
};

type ValueObjectPayload = {
  id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  organizations?: OrganizationPayload | null;
  node_role_code?: string | null;
  root_value_object_id?: string | null;
  parent_value_object_id?: string | null;
  branch_type_code?: string | null;
  canonical_key?: string | null;
  ontology_node_role_code?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  definition_version?: number | null;
};

type CatalogCopy = {
  tree: string;
  cards: string;
  map: string;
  table: string;
  description: string;
  parent: string;
  emptyTable: string;
  rootFilter: string;
  insideFilter: string;
  allRoots: string;
  allChildren: string;
  resetHierarchy: string;
  selectedBranch: string;
  expandAll: string;
  collapseAll: string;
  object: string;
  role: string;
  directChildren: string;
  descendants: string;
  leaves: string;
  status: string;
  action: string;
  open: string;
  root: string;
  intermediate: string;
  leaf: string;
  active: string;
  draft: string;
  inactive: string;
  personal: string;
  commercial: string;
  system: string;
  matches: string;
  objects: string;
  noDescription: string;
  addChild: string;
  addRow: string;
  newRow: string;
  rowCreateHint: string;
  createRow: string;
  creatingRow: string;
  parentRequired: string;
  selectParentFirst: string;
  rowParentInvalid: string;
  rowCreated: string;
  rowCreatedRefreshWarning: string;
  rowCreateFailed: string;
  deleteRow: string;
  deletingRow: string;
  deleteRowConfirm: string;
  rowDeleted: string;
  rowDeleteFailed: string;
  technicalDependency: string;
  changeParent: string;
  moveParentRequired: string;
  movePreview: string;
  movePreviewing: string;
  moveApply: string;
  moveApplying: string;
  moveCancel: string;
  moveCurrentPath: string;
  moveNewPath: string;
  moveWarnings: string;
  movePreviewReady: string;
  rowMoved: string;
  rowMoveFailed: string;
  rowMoveNotAllowed: string;
};

const COPY: Record<LocaleCode, CatalogCopy> = {
  en: {
    tree: "Tree",
    cards: "Cards",
    map: "Map",
    table: "Table",
    description: "Description",
    parent: "Parent",
    emptyTable: "No observation objects match the current filters.",
    rootFilter: "Root object",
    insideFilter: "Inside “{parent}”",
    allRoots: "All root objects",
    allChildren: "All child objects",
    resetHierarchy: "Reset",
    selectedBranch: "Selected branch",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    object: "Observation object",
    role: "Role",
    directChildren: "Direct",
    descendants: "Descendants",
    leaves: "Leaves",
    status: "Status",
    action: "Action",
    open: "Open",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    personal: "Personal",
    commercial: "Commercial",
    system: "System",
    matches: "matches",
    objects: "objects",
    noDescription: "No description yet.",
    addChild: "Add child object",
    addRow: "Add row",
    newRow: "New row",
    rowCreateHint: "Edit Name/Description in the provisional child row, confirm its role and parent, then create the object.",
    createRow: "Create object",
    creatingRow: "Creating…",
    parentRequired: "Select parent",
    selectParentFirst: "Select a root or intermediate parent first.",
    rowParentInvalid: "This row cannot be the parent for the selected role.",
    rowCreated: "Object created.",
    rowCreatedRefreshWarning: "Object was created, but the catalog refresh failed. Reload before using it as a parent.",
    rowCreateFailed: "Could not create object.",
    deleteRow: "Delete row",
    deletingRow: "Deleting…",
    deleteRowConfirm: "Delete “{title}”? The protected delete contract will allow this only for an unused private object without children or protected dependencies.",
    rowDeleted: "Object deleted.",
    rowDeleteFailed: "Could not delete object.",
    technicalDependency: "Blocking dependency",
    changeParent: "Change parent",
    moveParentRequired: "Select new parent",
    movePreview: "Preview move",
    movePreviewing: "Previewing…",
    moveApply: "Apply move",
    moveApplying: "Applying…",
    moveCancel: "Cancel",
    moveCurrentPath: "Current path",
    moveNewPath: "New path",
    moveWarnings: "Warnings",
    movePreviewReady: "Preview ready. Review the paths, then apply the move.",
    rowMoved: "Parent changed.",
    rowMoveFailed: "Could not change parent.",
    rowMoveNotAllowed: "The selected object cannot be moved from the table.",
  },
  pl: {
    tree: "Drzewo",
    cards: "Karty",
    map: "Mapa",
    table: "Tabela",
    description: "Opis",
    parent: "Rodzic",
    emptyTable: "Brak obiektów obserwacji dla bieżących filtrów.",
    rootFilter: "Obiekt główny",
    insideFilter: "Wewnątrz „{parent}”",
    allRoots: "Wszystkie obiekty główne",
    allChildren: "Wszystkie obiekty podrzędne",
    resetHierarchy: "Wyczyść",
    selectedBranch: "Wybrana gałąź",
    expandAll: "Rozwiń wszystko",
    collapseAll: "Zwiń wszystko",
    object: "Obiekt obserwacji",
    role: "Rola",
    directChildren: "Dzieci",
    descendants: "Potomkowie",
    leaves: "Liście",
    status: "Status",
    action: "Akcja",
    open: "Otwórz",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    active: "Aktywny",
    draft: "Szkic",
    inactive: "Nieaktywny",
    personal: "Osobisty",
    commercial: "Komercyjny",
    system: "Systemowy",
    matches: "pasuje",
    objects: "obiektów",
    noDescription: "Nie dodano jeszcze opisu.",
    addChild: "Dodaj obiekt podrzędny",
    addRow: "Dodaj wiersz",
    newRow: "Nowy wiersz",
    rowCreateHint: "Edytuj nazwę/opis w roboczym wierszu podrzędnym, sprawdź rolę i rodzica, a następnie utwórz obiekt.",
    createRow: "Utwórz obiekt",
    creatingRow: "Tworzenie…",
    parentRequired: "Wybierz rodzica",
    selectParentFirst: "Najpierw wybierz korzeń lub obiekt pośredni jako rodzica.",
    rowParentInvalid: "Ten wiersz nie może być rodzicem dla wybranej roli.",
    rowCreated: "Obiekt utworzony.",
    rowCreatedRefreshWarning: "Obiekt został utworzony, ale nie udało się odświeżyć katalogu. Odśwież tabelę przed użyciem go jako rodzica.",
    rowCreateFailed: "Nie udało się utworzyć obiektu.",
    deleteRow: "Usuń wiersz",
    deletingRow: "Usuwanie…",
    deleteRowConfirm: "Usunąć „{title}”? Chroniony kontrakt usuwania zezwoli na to tylko dla nieużywanego prywatnego obiektu bez dzieci i chronionych zależności.",
    rowDeleted: "Obiekt usunięty.",
    rowDeleteFailed: "Nie udało się usunąć obiektu.",
    technicalDependency: "Blokująca zależność",
    changeParent: "Zmień rodzica",
    moveParentRequired: "Wybierz nowego rodzica",
    movePreview: "Podgląd przeniesienia",
    movePreviewing: "Tworzenie podglądu…",
    moveApply: "Zastosuj przeniesienie",
    moveApplying: "Stosowanie…",
    moveCancel: "Anuluj",
    moveCurrentPath: "Bieżąca ścieżka",
    moveNewPath: "Nowa ścieżka",
    moveWarnings: "Ostrzeżenia",
    movePreviewReady: "Podgląd gotowy. Sprawdź ścieżki i zastosuj przeniesienie.",
    rowMoved: "Rodzic został zmieniony.",
    rowMoveFailed: "Nie udało się zmienić rodzica.",
    rowMoveNotAllowed: "Wybranego obiektu nie można przenieść z tabeli.",
  },
  ru: {
    tree: "Дерево",
    cards: "Карточки",
    map: "Карта",
    table: "Таблица",
    description: "Описание",
    parent: "Родитель",
    emptyTable: "Для текущих фильтров объектов наблюдения нет.",
    rootFilter: "Корневой объект",
    insideFilter: "Внутри «{parent}»",
    allRoots: "Все корневые объекты",
    allChildren: "Все дочерние объекты",
    resetHierarchy: "Сбросить",
    selectedBranch: "Выбранная ветвь",
    expandAll: "Развернуть все",
    collapseAll: "Свернуть все",
    object: "Объект наблюдения",
    role: "Роль",
    directChildren: "Дочерние",
    descendants: "Потомки",
    leaves: "Листы",
    status: "Статус",
    action: "Действие",
    open: "Открыть",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    active: "Активный",
    draft: "Черновик",
    inactive: "Неактивный",
    personal: "Личный",
    commercial: "Коммерческий",
    system: "Системный",
    matches: "совпадений",
    objects: "объектов",
    noDescription: "Описание пока не добавлено.",
    addChild: "Добавить дочерний объект",
    addRow: "Добавить строку",
    newRow: "Новая строка",
    rowCreateHint: "Измените название/описание в новой дочерней строке, проверьте роль и родителя, затем создайте объект.",
    createRow: "Создать объект",
    creatingRow: "Создание…",
    parentRequired: "Выберите родителя",
    selectParentFirst: "Сначала выберите родительский корневой или промежуточный ОН.",
    rowParentInvalid: "Эта строка не может быть родителем для выбранной роли.",
    rowCreated: "Объект создан.",
    rowCreatedRefreshWarning: "Объект создан, но каталог не удалось полностью обновить. Перезагрузите таблицу перед использованием его как родителя.",
    rowCreateFailed: "Не удалось создать объект.",
    deleteRow: "Удалить строку",
    deletingRow: "Удаление…",
    deleteRowConfirm: "Удалить «{title}»? Защищённый контракт разрешит это только для неиспользуемого личного объекта без дочерних узлов и защищённых зависимостей.",
    rowDeleted: "Объект удалён.",
    rowDeleteFailed: "Не удалось удалить объект.",
    technicalDependency: "Блокирующая зависимость",
    changeParent: "Изменить родителя",
    moveParentRequired: "Выберите нового родителя",
    movePreview: "Предпросмотр переноса",
    movePreviewing: "Подготовка предпросмотра…",
    moveApply: "Применить перенос",
    moveApplying: "Применение…",
    moveCancel: "Отмена",
    moveCurrentPath: "Текущий путь",
    moveNewPath: "Новый путь",
    moveWarnings: "Предупреждения",
    movePreviewReady: "Предпросмотр готов. Проверьте пути и примените перенос.",
    rowMoved: "Родитель изменён.",
    rowMoveFailed: "Не удалось изменить родителя.",
    rowMoveNotAllowed: "Выбранный объект нельзя переносить из таблицы.",
  },
  uk: {
    tree: "Дерево",
    cards: "Картки",
    map: "Мапа",
    table: "Таблиця",
    description: "Опис",
    parent: "Батьківський об’єкт",
    emptyTable: "Для поточних фільтрів об’єктів спостереження немає.",
    rootFilter: "Кореневий об’єкт",
    insideFilter: "Усередині «{parent}»",
    allRoots: "Усі кореневі об’єкти",
    allChildren: "Усі дочірні об’єкти",
    resetHierarchy: "Скинути",
    selectedBranch: "Вибрана гілка",
    expandAll: "Розгорнути все",
    collapseAll: "Згорнути все",
    object: "Об’єкт спостереження",
    role: "Роль",
    directChildren: "Дочірні",
    descendants: "Нащадки",
    leaves: "Листи",
    status: "Статус",
    action: "Дія",
    open: "Відкрити",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    active: "Активний",
    draft: "Чернетка",
    inactive: "Неактивний",
    personal: "Особистий",
    commercial: "Комерційний",
    system: "Системний",
    matches: "збігів",
    objects: "об’єктів",
    noDescription: "Опис ще не додано.",
    addChild: "Додати дочірній об’єкт",
    addRow: "Додати рядок",
    newRow: "Новий рядок",
    rowCreateHint: "Змініть назву/опис у новому дочірньому рядку, перевірте роль і батьківський об’єкт, потім створіть об’єкт.",
    createRow: "Створити об’єкт",
    creatingRow: "Створення…",
    parentRequired: "Виберіть батьківський об’єкт",
    selectParentFirst: "Спочатку виберіть кореневий або проміжний батьківський об’єкт.",
    rowParentInvalid: "Цей рядок не може бути батьківським для вибраної ролі.",
    rowCreated: "Об’єкт створено.",
    rowCreatedRefreshWarning: "Об’єкт створено, але каталог не вдалося повністю оновити. Перезавантажте таблицю перед використанням його як батьківського.",
    rowCreateFailed: "Не вдалося створити об’єкт.",
    deleteRow: "Видалити рядок",
    deletingRow: "Видалення…",
    deleteRowConfirm: "Видалити «{title}»? Захищений контракт дозволить це лише для невикористаного приватного об’єкта без дочірніх вузлів і захищених залежностей.",
    rowDeleted: "Об’єкт видалено.",
    rowDeleteFailed: "Не вдалося видалити об’єкт.",
    technicalDependency: "Блокуюча залежність",
    changeParent: "Змінити батьківський об’єкт",
    moveParentRequired: "Виберіть новий батьківський об’єкт",
    movePreview: "Попередній перегляд перенесення",
    movePreviewing: "Підготовка перегляду…",
    moveApply: "Застосувати перенесення",
    moveApplying: "Застосування…",
    moveCancel: "Скасувати",
    moveCurrentPath: "Поточний шлях",
    moveNewPath: "Новий шлях",
    moveWarnings: "Попередження",
    movePreviewReady: "Перегляд готовий. Перевірте шляхи та застосуйте перенесення.",
    rowMoved: "Батьківський об’єкт змінено.",
    rowMoveFailed: "Не вдалося змінити батьківський об’єкт.",
    rowMoveNotAllowed: "Вибраний об’єкт не можна переносити з таблиці.",
  },
  de: {
    tree: "Baum",
    cards: "Karten",
    map: "Karte",
    table: "Tabelle",
    description: "Beschreibung",
    parent: "Übergeordnet",
    emptyTable: "Keine Beobachtungsobjekte für die aktuellen Filter.",
    rootFilter: "Wurzelobjekt",
    insideFilter: "Innerhalb „{parent}“",
    allRoots: "Alle Wurzelobjekte",
    allChildren: "Alle untergeordneten Objekte",
    resetHierarchy: "Zurücksetzen",
    selectedBranch: "Ausgewählter Zweig",
    expandAll: "Alle aufklappen",
    collapseAll: "Alle zuklappen",
    object: "Beobachtungsobjekt",
    role: "Rolle",
    directChildren: "Direkt",
    descendants: "Nachkommen",
    leaves: "Blätter",
    status: "Status",
    action: "Aktion",
    open: "Öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    active: "Aktiv",
    draft: "Entwurf",
    inactive: "Inaktiv",
    personal: "Persönlich",
    commercial: "Kommerziell",
    system: "System",
    matches: "Treffer",
    objects: "Objekte",
    noDescription: "Noch keine Beschreibung.",
    addChild: "Untergeordnetes Objekt hinzufügen",
    addRow: "Zeile hinzufügen",
    newRow: "Neue Zeile",
    rowCreateHint: "Name/Beschreibung in der vorläufigen untergeordneten Zeile bearbeiten, Rolle und übergeordnetes Objekt prüfen und dann erstellen.",
    createRow: "Objekt erstellen",
    creatingRow: "Wird erstellt…",
    parentRequired: "Übergeordnetes Objekt wählen",
    selectParentFirst: "Zuerst eine Wurzel oder ein Zwischenobjekt als übergeordnetes Objekt auswählen.",
    rowParentInvalid: "Diese Zeile kann für die gewählte Rolle nicht übergeordnet sein.",
    rowCreated: "Objekt erstellt.",
    rowCreatedRefreshWarning: "Das Objekt wurde erstellt, aber der Katalog konnte nicht aktualisiert werden. Vor der Verwendung als übergeordnetes Objekt die Tabelle neu laden.",
    rowCreateFailed: "Objekt konnte nicht erstellt werden.",
    deleteRow: "Zeile löschen",
    deletingRow: "Wird gelöscht…",
    deleteRowConfirm: "„{title}“ löschen? Der geschützte Löschvertrag erlaubt dies nur für ein unbenutztes privates Objekt ohne Kinder oder geschützte Abhängigkeiten.",
    rowDeleted: "Objekt gelöscht.",
    rowDeleteFailed: "Objekt konnte nicht gelöscht werden.",
    technicalDependency: "Blockierende Abhängigkeit",
    changeParent: "Übergeordnetes Objekt ändern",
    moveParentRequired: "Neues übergeordnetes Objekt wählen",
    movePreview: "Verschiebung prüfen",
    movePreviewing: "Vorschau wird erstellt…",
    moveApply: "Verschiebung anwenden",
    moveApplying: "Wird angewendet…",
    moveCancel: "Abbrechen",
    moveCurrentPath: "Aktueller Pfad",
    moveNewPath: "Neuer Pfad",
    moveWarnings: "Warnungen",
    movePreviewReady: "Vorschau bereit. Pfade prüfen und Verschiebung anwenden.",
    rowMoved: "Übergeordnetes Objekt geändert.",
    rowMoveFailed: "Übergeordnetes Objekt konnte nicht geändert werden.",
    rowMoveNotAllowed: "Das ausgewählte Objekt kann nicht aus der Tabelle verschoben werden.",
  },
  es: {
    tree: "Árbol",
    cards: "Tarjetas",
    map: "Mapa",
    table: "Tabla",
    description: "Descripción",
    parent: "Padre",
    emptyTable: "No hay objetos de observación para los filtros actuales.",
    rootFilter: "Objeto raíz",
    insideFilter: "Dentro de «{parent}»",
    allRoots: "Todos los objetos raíz",
    allChildren: "Todos los objetos hijos",
    resetHierarchy: "Restablecer",
    selectedBranch: "Rama seleccionada",
    expandAll: "Expandir todo",
    collapseAll: "Contraer todo",
    object: "Objeto de observación",
    role: "Rol",
    directChildren: "Directos",
    descendants: "Descendientes",
    leaves: "Hojas",
    status: "Estado",
    action: "Acción",
    open: "Abrir",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    active: "Activo",
    draft: "Borrador",
    inactive: "Inactivo",
    personal: "Personal",
    commercial: "Comercial",
    system: "Sistema",
    matches: "coincidencias",
    objects: "objetos",
    noDescription: "Todavía no hay descripción.",
    addChild: "Añadir objeto hijo",
    addRow: "Añadir fila",
    newRow: "Nueva fila",
    rowCreateHint: "Edita nombre/descripción en la fila hija provisional, comprueba el rol y el padre y luego crea el objeto.",
    createRow: "Crear objeto",
    creatingRow: "Creando…",
    parentRequired: "Seleccionar padre",
    selectParentFirst: "Primero selecciona una raíz o un objeto intermedio como padre.",
    rowParentInvalid: "Esta fila no puede ser padre para el rol seleccionado.",
    rowCreated: "Objeto creado.",
    rowCreatedRefreshWarning: "El objeto se creó, pero no se pudo actualizar el catálogo. Recarga la tabla antes de usarlo como padre.",
    rowCreateFailed: "No se pudo crear el objeto.",
    deleteRow: "Eliminar fila",
    deletingRow: "Eliminando…",
    deleteRowConfirm: "¿Eliminar «{title}»? El contrato protegido solo lo permitirá para un objeto privado sin uso, sin hijos ni dependencias protegidas.",
    rowDeleted: "Objeto eliminado.",
    rowDeleteFailed: "No se pudo eliminar el objeto.",
    technicalDependency: "Dependencia bloqueante",
    changeParent: "Cambiar padre",
    moveParentRequired: "Selecciona el nuevo padre",
    movePreview: "Previsualizar traslado",
    movePreviewing: "Preparando vista previa…",
    moveApply: "Aplicar traslado",
    moveApplying: "Aplicando…",
    moveCancel: "Cancelar",
    moveCurrentPath: "Ruta actual",
    moveNewPath: "Nueva ruta",
    moveWarnings: "Advertencias",
    movePreviewReady: "Vista previa lista. Revisa las rutas y aplica el traslado.",
    rowMoved: "Padre cambiado.",
    rowMoveFailed: "No se pudo cambiar el padre.",
    rowMoveNotAllowed: "El objeto seleccionado no se puede trasladar desde la tabla.",
  },
  cs: {
    tree: "Strom",
    cards: "Karty",
    map: "Mapa",
    table: "Tabulka",
    description: "Popis",
    parent: "Nadřazený objekt",
    emptyTable: "Pro aktuální filtry nejsou žádné objekty pozorování.",
    rootFilter: "Kořenový objekt",
    insideFilter: "Uvnitř „{parent}“",
    allRoots: "Všechny kořenové objekty",
    allChildren: "Všechny podřízené objekty",
    resetHierarchy: "Obnovit",
    selectedBranch: "Vybraná větev",
    expandAll: "Rozbalit vše",
    collapseAll: "Sbalit vše",
    object: "Objekt pozorování",
    role: "Role",
    directChildren: "Přímé",
    descendants: "Potomci",
    leaves: "Listy",
    status: "Stav",
    action: "Akce",
    open: "Otevřít",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    active: "Aktivní",
    draft: "Koncept",
    inactive: "Neaktivní",
    personal: "Osobní",
    commercial: "Komerční",
    system: "Systémový",
    matches: "shod",
    objects: "objektů",
    noDescription: "Popis zatím nebyl přidán.",
    addChild: "Přidat podřízený objekt",
    addRow: "Přidat řádek",
    newRow: "Nový řádek",
    rowCreateHint: "Upravte název/popisek v pracovním podřízeném řádku, zkontrolujte roli a nadřazený objekt a poté objekt vytvořte.",
    createRow: "Vytvořit objekt",
    creatingRow: "Vytváření…",
    parentRequired: "Vyberte nadřazený objekt",
    selectParentFirst: "Nejprve vyberte kořen nebo mezilehlý objekt jako nadřazený.",
    rowParentInvalid: "Tento řádek nemůže být nadřazeným objektem pro zvolenou roli.",
    rowCreated: "Objekt vytvořen.",
    rowCreatedRefreshWarning: "Objekt byl vytvořen, ale katalog se nepodařilo obnovit. Před použitím jako nadřazeného objektu tabulku znovu načtěte.",
    rowCreateFailed: "Objekt se nepodařilo vytvořit.",
    deleteRow: "Odstranit řádek",
    deletingRow: "Odstraňování…",
    deleteRowConfirm: "Odstranit „{title}“? Chráněný kontrakt to dovolí pouze pro nepoužívaný soukromý objekt bez potomků a chráněných závislostí.",
    rowDeleted: "Objekt odstraněn.",
    rowDeleteFailed: "Objekt se nepodařilo odstranit.",
    technicalDependency: "Blokující závislost",
    changeParent: "Změnit rodiče",
    moveParentRequired: "Vyberte nového rodiče",
    movePreview: "Náhled přesunu",
    movePreviewing: "Příprava náhledu…",
    moveApply: "Použít přesun",
    moveApplying: "Používání…",
    moveCancel: "Zrušit",
    moveCurrentPath: "Aktuální cesta",
    moveNewPath: "Nová cesta",
    moveWarnings: "Varování",
    movePreviewReady: "Náhled je připraven. Zkontrolujte cesty a použijte přesun.",
    rowMoved: "Rodič změněn.",
    rowMoveFailed: "Rodiče se nepodařilo změnit.",
    rowMoveNotAllowed: "Vybraný objekt nelze přesunout z tabulky.",
  },
};

function getSemanticRole(valueObject: ValueObjectPayload): SemanticRole {
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

function roleBadgeClass(role: SemanticRole) {
  if (role === "root") {
    return "border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]";
  }

  if (role === "leaf") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "inactive") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getRoleLabel(role: SemanticRole, copy: CatalogCopy) {
  if (role === "root") return copy.root;
  if (role === "leaf") return copy.leaf;
  return copy.intermediate;
}

function getStatusLabel(status: string | null | undefined, copy: CatalogCopy) {
  if (status === "active") return copy.active;
  if (status === "inactive") return copy.inactive;
  return copy.draft;
}

function getContextLabel(valueObject: ValueObjectPayload, copy: CatalogCopy) {
  if (
    valueObject.scope_code === "global" ||
    valueObject.origin_type_code === "system"
  ) {
    return copy.system;
  }

  if (valueObject.usage_scope === "commercial") {
    return valueObject.organizations?.organization_name?.trim() || copy.commercial;
  }

  return copy.personal;
}

function roleIcon(role: SemanticRole) {
  if (role === "root") return Network;
  if (role === "leaf") return Leaf;
  return Layers3;
}

const OPEN_TABLE_WORKSPACE_LABELS: Record<LocaleCode, string> = {
  en: "Open table workspace ↗",
  pl: "Otwórz tabelę ↗",
  ru: "Открыть таблицу ↗",
  uk: "Відкрити таблицю ↗",
  de: "Tabelle öffnen ↗",
  es: "Abrir tabla ↗",
  cs: "Otevřít tabulku ↗",
};

const CLOSE_TABLE_LABELS: Record<LocaleCode, string> = {
  en: "Close table",
  pl: "Zamknij tabelę",
  ru: "Закрыть таблицу",
  uk: "Закрити таблицю",
  de: "Tabelle schließen",
  es: "Cerrar tabla",
  cs: "Zavřít tabulku",
};

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function buildTableWorkspaceHref(locale: LocaleCode) {
  const returnTo = buildLocaleAwareHref("/value-objects", locale);
  const params = new URLSearchParams();

  if (locale !== "en") {
    params.set("locale", locale);
  }

  params.set("returnTo", returnTo);
  return `/value-objects/table?${params.toString()}`;
}

function sortObjects(
  objects: ValueObjectPayload[],
  sortMode: SortMode,
  locale: LocaleCode,
) {
  return [...objects].sort((a, b) => {
    if (sortMode === "newest") {
      const timeA = Date.parse(a.created_at ?? "") || 0;
      const timeB = Date.parse(b.created_at ?? "") || 0;
      const timeDifference = timeB - timeA;
      if (timeDifference !== 0) return timeDifference;
    }

    return (a.title ?? "").localeCompare(b.title ?? "", locale);
  });
}

type TreeRow = {
  valueObject: ValueObjectPayload;
  depth: number;
  directChildren: number;
  descendants: number;
  descendantLeaves: number;
  hasChildren: boolean;
};

type TableObjectRow = {
  id: string;
  title: string;
  description: string;
  editable: boolean;
  parent: string;
  role: string;
  directChildren: number;
  descendants: number;
  descendantLeaves: number;
  status: string;
  createDraft?: boolean;
  _children?: TableObjectRow[];
};

type TableEditFeedback = {
  kind: "info" | "saving" | "success" | "error";
  text: string;
};

type TableEditHistoryEntry = {
  objectId: string;
  field: ValueObjectTableEditableField;
  before: string;
  after: string;
};

type TableEditHistoryAction = {
  kind: "cell" | "paste";
  entries: TableEditHistoryEntry[];
};

type TableBatchWriteResult = {
  ok: boolean;
  rollbackIncomplete: boolean;
  error?: unknown;
};

const MAX_TABLE_PASTE_WRITES = 100;

function normalizeTableHistoryValue(value: unknown) {
  return value == null ? "" : String(value).trim();
}

type ValueObjectCatalogViewsProps = {
  valueObjects: ValueObjectPayload[];
  locale: LocaleCode;
  query: string;
  roleFilter: RoleFilter;
  sortMode: SortMode;
  hierarchyPathIds: readonly string[];
  onHierarchyPathChange: (pathIds: string[]) => void;
  children: ReactNode;
  onValueObjectDeleted?: (deletedId: string) => void;
  onValueObjectReparented?: (movedId: string, newParentId: string) => void;
  onValueObjectUpdated?: (updatedValueObject: ValueObjectTableEditPatch) => void;
  onValueObjectCreated?: (createdValueObject: ValueObjectPayload) => void;
};

export function ValueObjectCatalogViews({
  valueObjects,
  locale,
  query,
  roleFilter,
  sortMode,
  hierarchyPathIds,
  onHierarchyPathChange,
  children,
  onValueObjectDeleted,
  onValueObjectReparented,
  onValueObjectUpdated,
  onValueObjectCreated,
}: ValueObjectCatalogViewsProps) {
  const pathname = usePathname();
  const standaloneTableWorkspace = pathname === "/value-objects/table";
  const copy = COPY[locale] ?? COPY.en;
  const tableEditCopy = getValueObjectTableEditorCopy(locale);
  const [viewMode, setViewMode] = useState<ViewMode>(
    standaloneTableWorkspace ? "table" : "tree",
  );
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);
  const [insertParentId, setInsertParentId] = useState<string | null>(null);
  const [tableEditMode, setTableEditMode] = useState(standaloneTableWorkspace);
  const [tableEditFeedback, setTableEditFeedback] =
    useState<TableEditFeedback | null>(null);
  const [tableUndoStack, setTableUndoStack] = useState<TableEditHistoryAction[]>([]);
  const [tableRedoStack, setTableRedoStack] = useState<TableEditHistoryAction[]>([]);
  const [tableHistoryBusy, setTableHistoryBusy] = useState(false);
  const [tableCreateDraft, setTableCreateDraft] =
    useState<ValueObjectTableCreateDraft | null>(null);
  const [tableCreateBusy, setTableCreateBusy] = useState(false);
  const [tableDeleteBusy, setTableDeleteBusy] = useState(false);
  const [tableReparentDraft, setTableReparentDraft] =
    useState<ValueObjectTableReparentDraft | null>(null);
  const [tableReparentPreview, setTableReparentPreview] =
    useState<ValueObjectTableReparentPreview | null>(null);
  const [tableReparentBusy, setTableReparentBusy] =
    useState<"preview" | "apply" | null>(null);
  const [tableRowSelectionId, setTableRowSelectionId] = useState<string | null>(null);

  const objectsById = useMemo(() => {
    const map = new Map<string, ValueObjectPayload>();
    for (const valueObject of valueObjects) {
      if (valueObject.id) map.set(valueObject.id, valueObject);
    }
    return map;
  }, [valueObjects]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ValueObjectPayload[]>();
    for (const valueObject of valueObjects) {
      const parentId = valueObject.parent_value_object_id;
      if (!parentId || !valueObject.id) continue;
      const siblings = map.get(parentId) ?? [];
      siblings.push(valueObject);
      map.set(parentId, siblings);
    }
    return map;
  }, [valueObjects]);

  const roots = useMemo(
    () =>
      valueObjects.filter((valueObject) => {
        const parentId = valueObject.parent_value_object_id;
        return !parentId || !objectsById.has(parentId);
      }),
    [objectsById, valueObjects],
  );

  const hierarchyRoots = useMemo(
    () =>
      sortObjects(
        roots.filter((valueObject) => getSemanticRole(valueObject) === "root"),
        "title",
        locale,
      ),
    [locale, roots],
  );

  const hierarchyPathObjects = useMemo(() => {
    const result: Array<ValueObjectPayload & { id: string }> = [];
    let expectedParentId: string | null = null;

    for (const pathId of hierarchyPathIds) {
      const valueObject = objectsById.get(pathId);
      if (!valueObject?.id) {
        break;
      }

      if (result.length === 0) {
        if (getSemanticRole(valueObject) !== "root") {
          break;
        }
      } else if (valueObject.parent_value_object_id !== expectedParentId) {
        break;
      }

      result.push(valueObject as ValueObjectPayload & { id: string });
      expectedParentId = valueObject.id;
    }

    return result;
  }, [hierarchyPathIds, objectsById]);

  const selectedHierarchyId =
    hierarchyPathObjects.length > 0
      ? hierarchyPathObjects[hierarchyPathObjects.length - 1].id
      : null;

  const hierarchySubtreeIds = useMemo(() => {
    if (!selectedHierarchyId) {
      return null;
    }

    const subtree = new Set<string>();
    const stack = [selectedHierarchyId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || subtree.has(currentId)) {
        continue;
      }

      subtree.add(currentId);
      for (const child of childrenByParent.get(currentId) ?? []) {
        if (child.id && !subtree.has(child.id)) {
          stack.push(child.id);
        }
      }
    }

    return subtree;
  }, [childrenByParent, selectedHierarchyId]);

  const branchIds = useMemo(
    () =>
      valueObjects
        .filter(
          (valueObject): valueObject is ValueObjectPayload & { id: string } =>
            Boolean(
              valueObject.id &&
                (childrenByParent.get(valueObject.id)?.length ?? 0) > 0,
            ),
        )
        .map((valueObject) => valueObject.id),
    [childrenByParent, valueObjects],
  );

  const defaultExpandedIds = useMemo(
    () =>
      new Set(
        valueObjects.length <= 80
          ? branchIds
          : roots
              .map((valueObject) => valueObject.id)
              .filter((id): id is string => Boolean(id)),
      ),
    [branchIds, roots, valueObjects.length],
  );
  const activeExpandedIds = expandedIds ?? defaultExpandedIds;

  const pathById = useMemo(() => {
    const map = new Map<string, string>();
    for (const valueObject of valueObjects) {
      if (!valueObject.id) continue;
      const path: string[] = [];
      const visited = new Set<string>();
      let cursor: ValueObjectPayload | undefined = valueObject;
      while (cursor?.id && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        path.unshift(cursor.title?.trim() || "—");
        const parentId = cursor.parent_value_object_id;
        if (!parentId) break;
        cursor = objectsById.get(parentId);
      }
      map.set(valueObject.id, path.join(" → "));
    }
    return map;
  }, [objectsById, valueObjects]);

  const descendantCountById = useMemo(() => {
    const cache = new Map<string, number>();
    function count(objectId: string, visited = new Set<string>()): number {
      if (cache.has(objectId)) return cache.get(objectId) ?? 0;
      if (visited.has(objectId)) return 0;
      const nextVisited = new Set(visited);
      nextVisited.add(objectId);
      const childObjects = childrenByParent.get(objectId) ?? [];
      let total = childObjects.length;
      for (const child of childObjects) {
        if (child.id) total += count(child.id, nextVisited);
      }
      cache.set(objectId, total);
      return total;
    }
    for (const valueObject of valueObjects) {
      if (valueObject.id) count(valueObject.id);
    }
    return cache;
  }, [childrenByParent, valueObjects]);

  const descendantLeafCountById = useMemo(() => {
    const cache = new Map<string, number>();
    function count(objectId: string, visited = new Set<string>()): number {
      if (cache.has(objectId)) return cache.get(objectId) ?? 0;
      if (visited.has(objectId)) return 0;
      const nextVisited = new Set(visited);
      nextVisited.add(objectId);
      let total = 0;
      for (const child of childrenByParent.get(objectId) ?? []) {
        if (!child.id) continue;
        if (getSemanticRole(child) === "leaf") total += 1;
        else total += count(child.id, nextVisited);
      }
      cache.set(objectId, total);
      return total;
    }
    for (const valueObject of valueObjects) {
      if (valueObject.id) count(valueObject.id);
    }
    return cache;
  }, [childrenByParent, valueObjects]);

  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const searchRoleFilterActive =
    Boolean(normalizedQuery) || roleFilter !== "all";
  const hierarchyFilterActive = Boolean(selectedHierarchyId);
  const filterActive = searchRoleFilterActive || hierarchyFilterActive;

  const matchingIds = useMemo(() => {
    const matches = new Set<string>();
    for (const valueObject of valueObjects) {
      if (!valueObject.id) continue;
      if (hierarchySubtreeIds && !hierarchySubtreeIds.has(valueObject.id)) {
        continue;
      }
      const role = getSemanticRole(valueObject);
      if (roleFilter === "root" && role !== "root") continue;
      if (roleFilter === "intermediate" && role !== "intermediate") continue;
      if (roleFilter === "leaf" && role !== "leaf") continue;
      if (roleFilter === "draft" && valueObject.status !== "draft") continue;

      if (normalizedQuery) {
        const haystack = [
          valueObject.title,
          valueObject.description,
          pathById.get(valueObject.id),
        ]
          .filter((item): item is string => typeof item === "string")
          .join(" ")
          .toLocaleLowerCase(locale);
        if (!haystack.includes(normalizedQuery)) continue;
      }
      matches.add(valueObject.id);
    }
    return matches;
  }, [
    hierarchySubtreeIds,
    locale,
    normalizedQuery,
    pathById,
    roleFilter,
    valueObjects,
  ]);

  const visibleIds = useMemo(() => {
    if (hierarchySubtreeIds && !searchRoleFilterActive) {
      return new Set(hierarchySubtreeIds);
    }

    if (!filterActive) {
      return new Set(
        valueObjects
          .map((valueObject) => valueObject.id)
          .filter((id): id is string => Boolean(id)),
      );
    }

    const visible = new Set<string>();
    for (const id of matchingIds) {
      let cursor = objectsById.get(id);
      const visited = new Set<string>();
      while (cursor?.id && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        visible.add(cursor.id);

        if (selectedHierarchyId && cursor.id === selectedHierarchyId) {
          break;
        }

        const parentId = cursor.parent_value_object_id;
        if (!parentId) break;
        cursor = objectsById.get(parentId);
      }
    }
    return visible;
  }, [
    filterActive,
    hierarchySubtreeIds,
    matchingIds,
    objectsById,
    searchRoleFilterActive,
    selectedHierarchyId,
    valueObjects,
  ]);

  const treeRoots = useMemo(() => {
    if (!selectedHierarchyId) {
      return roots;
    }

    const selected = objectsById.get(selectedHierarchyId);
    return selected ? [selected] : [];
  }, [objectsById, roots, selectedHierarchyId]);

  const rows = useMemo(() => {
    const result: TreeRow[] = [];
    const visited = new Set<string>();

    function walk(valueObject: ValueObjectPayload, depth: number) {
      if (!valueObject.id || visited.has(valueObject.id)) return;
      if (!visibleIds.has(valueObject.id)) return;
      visited.add(valueObject.id);

      const childObjects = sortObjects(
        childrenByParent.get(valueObject.id) ?? [],
        sortMode,
        locale,
      );
      const hasChildren = childObjects.length > 0;
      result.push({
        valueObject,
        depth,
        directChildren: childObjects.length,
        descendants: descendantCountById.get(valueObject.id) ?? 0,
        descendantLeaves: descendantLeafCountById.get(valueObject.id) ?? 0,
        hasChildren,
      });

      const isExpanded = filterActive || activeExpandedIds.has(valueObject.id);
      if (!hasChildren || !isExpanded) return;

      for (const child of childObjects) {
        walk(child, depth + 1);
      }
    }

    for (const root of sortObjects(treeRoots, sortMode, locale)) {
      walk(root, 0);
    }

    // Do not re-walk descendants hidden by a collapsed ancestor as standalone roots.
    // Unknown-parent objects are already included in `roots`; structural cycles fail closed.
    return result;
  }, [
    childrenByParent,
    descendantCountById,
    descendantLeafCountById,
    activeExpandedIds,
    filterActive,
    locale,
    treeRoots,
    sortMode,
    visibleIds,
  ]);

  const tableCreateParentOptions = useMemo(() => {
    const createDraft = tableCreateDraft;
    if (!createDraft) {
      return [];
    }
    const createRole = createDraft.role;

    return valueObjects
      .filter(
        (valueObject): valueObject is ValueObjectPayload & { id: string } =>
          Boolean(
            valueObject.id &&
              visibleIds.has(valueObject.id) &&
              canUseObservationObjectTableParent(valueObject, createRole),
          ),
      )
      .sort((a, b) =>
        (pathById.get(a.id) ?? a.title ?? "").localeCompare(
          pathById.get(b.id) ?? b.title ?? "",
          locale,
        ),
      );
  }, [locale, pathById, tableCreateDraft, valueObjects, visibleIds]);

  const tableCreateParent = tableCreateDraft?.parentId
    ? objectsById.get(tableCreateDraft.parentId) ?? null
    : null;
  const tableCreateLeafAllowed = canUseObservationObjectTableParent(
    tableCreateParent,
    "leaf",
  );

  const tableCreateCanSubmit = Boolean(
    tableCreateDraft?.title.trim() &&
      tableCreateDraft.parentId &&
      canUseObservationObjectTableParent(
        tableCreateParent,
        tableCreateDraft.role,
      ),
  );

  const tableReparentSource = tableReparentDraft?.sourceId
    ? objectsById.get(tableReparentDraft.sourceId) ?? null
    : null;
  const tableSelectedReparentable = canReparentObservationObjectFromTable(
    tableRowSelectionId ? objectsById.get(tableRowSelectionId) ?? null : null,
  );
  const tableReparentParentOptions = useMemo(() => {
    const reparentDraft = tableReparentDraft;
    const source = reparentDraft?.sourceId
      ? objectsById.get(reparentDraft.sourceId) ?? null
      : null;
    if (!reparentDraft || !canReparentObservationObjectFromTable(source)) {
      return [];
    }

    return valueObjects
      .filter(
        (candidate): candidate is ValueObjectPayload & { id: string } => {
          if (
            !candidate.id ||
            !visibleIds.has(candidate.id) ||
            !canUseObservationObjectTableReparentParent(source, candidate)
          ) {
            return false;
          }

          const visited = new Set<string>();
          let cursor: ValueObjectPayload | undefined = candidate;
          while (cursor?.id && !visited.has(cursor.id)) {
            visited.add(cursor.id);
            const parentId = cursor.parent_value_object_id;
            if (!parentId) break;
            if (parentId === source.id) return false;
            cursor = objectsById.get(parentId);
          }
          return true;
        },
      )
      .sort((a, b) =>
        (pathById.get(a.id) ?? a.title ?? "").localeCompare(
          pathById.get(b.id) ?? b.title ?? "",
          locale,
        ),
      );
  }, [
    locale,
    objectsById,
    pathById,
    tableReparentDraft,
    valueObjects,
    visibleIds,
  ]);
  const tableReparentParent = tableReparentDraft?.newParentId
    ? objectsById.get(tableReparentDraft.newParentId) ?? null
    : null;
  const tableReparentCanPreview = Boolean(
    tableReparentDraft?.newParentId &&
      canUseObservationObjectTableReparentParent(
        tableReparentSource,
        tableReparentParent,
      ),
  );

  const tableRows = useMemo<TableObjectRow[]>(() => {
    const visited = new Set<string>();

    function buildRow(valueObject: ValueObjectPayload): TableObjectRow | null {
      if (!valueObject.id || visited.has(valueObject.id) || !visibleIds.has(valueObject.id)) {
        return null;
      }

      visited.add(valueObject.id);
      const children = sortObjects(
        childrenByParent.get(valueObject.id) ?? [],
        sortMode,
        locale,
      )
        .map(buildRow)
        .filter((row): row is TableObjectRow => Boolean(row));
      const parentObject = valueObject.parent_value_object_id
        ? objectsById.get(valueObject.parent_value_object_id)
        : null;

      return {
        id: valueObject.id,
        title: valueObject.title?.trim() || "—",
        description:
          valueObject.description?.trim() ||
          (tableEditMode ? "" : copy.noDescription),
        editable: canEditValueObjectTableCells(valueObject),
        parent: parentObject?.title?.trim() || "—",
        role: getRoleLabel(getSemanticRole(valueObject), copy),
        directChildren: childrenByParent.get(valueObject.id)?.length ?? 0,
        descendants: descendantCountById.get(valueObject.id) ?? 0,
        descendantLeaves: descendantLeafCountById.get(valueObject.id) ?? 0,
        status: getStatusLabel(valueObject.status, copy),
        ...(children.length > 0 ? { _children: children } : {}),
      };
    }

    const builtRows = sortObjects(treeRoots, sortMode, locale)
      .map(buildRow)
      .filter((row): row is TableObjectRow => Boolean(row));

    const createDraft = tableCreateDraft;
    if (!createDraft) {
      return builtRows;
    }

    const createParentId = createDraft.parentId;
    const draftParent = objectsById.get(createParentId) ?? null;
    const draftRow: TableObjectRow = {
      id: createDraft.operationId,
      title: createDraft.title,
      description: createDraft.description,
      editable: true,
      parent: draftParent?.title?.trim() || "—",
      role: getRoleLabel(createDraft.role, copy),
      directChildren: 0,
      descendants: 0,
      descendantLeaves: 0,
      status: copy.newRow,
      createDraft: true,
    };

    let inserted = false;
    function insertDraft(rowsToVisit: TableObjectRow[]): TableObjectRow[] {
      return rowsToVisit.map((row) => {
        if (row.id === createParentId) {
          inserted = true;
          return {
            ...row,
            _children: [...(row._children ?? []), draftRow],
          };
        }

        if (row._children?.length) {
          return { ...row, _children: insertDraft(row._children) };
        }

        return row;
      });
    }

    const rowsWithDraft = insertDraft(builtRows);
    return inserted ? rowsWithDraft : builtRows;
  }, [
    childrenByParent,
    copy,
    descendantCountById,
    descendantLeafCountById,
    locale,
    objectsById,
    sortMode,
    tableCreateDraft,
    tableEditMode,
    treeRoots,
    visibleIds,
  ]);

  const tableColumns = useMemo<ArctorTableColumn<TableObjectRow>[]>(
    () => [
      {
        title: copy.object,
        field: "title",
        minWidth: 340,
        mobileMinWidth: 210,
        mobileFrozen: false,
        widthGrow: 5,
        widthShrink: 3,
        frozen: true,
        responsive: 0,
        tooltip: true,
        cssClass: "arctor-table-title",
        editor: tableEditMode ? "arctor-expanded-input" : false,
        editable:
          tableEditMode &&
          !tableHistoryBusy &&
          !tableCreateBusy &&
          !tableDeleteBusy &&
          !tableReparentDraft &&
          !tableReparentBusy
            ? (cell) => cell.getRow().getData().editable
            : false,
        editorParams: tableEditMode
          ? {
              elementAttributes: { maxlength: "180" },
              expandedMinWidth: 420,
              expandedMaxWidth: 620,
              expandedMinHeight: 40,
              expandedMaxHeight: 44,
              saveLabel: tableEditCopy.save,
              cancelLabel: tableEditCopy.cancel,
            }
          : undefined,
      },
      {
        title: copy.description,
        field: "description",
        minWidth: 220,
        mobileMinWidth: 260,
        widthGrow: 2,
        widthShrink: 3,
        responsive: 6,
        tooltip: true,
        cssClass: "arctor-table-muted",
        editor: tableEditMode ? "arctor-expanded-textarea" : false,
        editable:
          tableEditMode &&
          !tableHistoryBusy &&
          !tableCreateBusy &&
          !tableDeleteBusy &&
          !tableReparentDraft &&
          !tableReparentBusy
            ? (cell) => cell.getRow().getData().editable
            : false,
        editorParams: tableEditMode
          ? {
              elementAttributes: { maxlength: "4000" },
              expandedMinWidth: 620,
              expandedMaxWidth: 760,
              expandedMinHeight: 120,
              expandedMaxHeight: 240,
              saveLabel: tableEditCopy.save,
              cancelLabel: tableEditCopy.cancel,
            }
          : undefined,
      },
      {
        title: copy.parent,
        field: "parent",
        visible: false,
        responsive: 7,
        tooltip: true,
        cssClass: "arctor-table-muted",
      },
      {
        title: copy.role,
        field: "role",
        minWidth: 122,
        mobileMinWidth: 110,
        widthShrink: 1,
        responsive: 1,
        tooltip: true,
      },
      {
        title: copy.directChildren,
        field: "directChildren",
        width: 108,
        minWidth: 100,
        mobileWidth: 92,
        mobileMinWidth: 88,
        responsive: 1,
        tooltip: true,
        hozAlign: "center",
        headerHozAlign: "center",
        cssClass: "arctor-table-number",
      },
      {
        title: copy.descendants,
        field: "descendants",
        width: 122,
        minWidth: 112,
        mobileWidth: 108,
        mobileMinWidth: 100,
        responsive: 2,
        tooltip: true,
        hozAlign: "center",
        headerHozAlign: "center",
        cssClass: "arctor-table-number",
      },
      {
        title: copy.leaves,
        field: "descendantLeaves",
        width: 92,
        minWidth: 84,
        mobileWidth: 84,
        mobileMinWidth: 80,
        responsive: 2,
        tooltip: true,
        hozAlign: "center",
        headerHozAlign: "center",
        cssClass: "arctor-table-number",
      },
      {
        title: copy.status,
        field: "status",
        minWidth: 104,
        mobileMinWidth: 96,
        widthShrink: 1,
        responsive: 1,
        tooltip: true,
      },
    ],
    [
      copy,
      tableCreateBusy,
      tableDeleteBusy,
      tableEditCopy.cancel,
      tableEditCopy.save,
      tableEditMode,
      tableHistoryBusy,
      tableReparentBusy,
      tableReparentDraft,
    ],
  );

  const tableOptions = useMemo<ArctorTableOptions>(
    () => ({
      dataTree: true,
      dataTreeChildField: "_children",
      dataTreeChildIndent: 15,
      dataTreeStartExpanded: filterActive || valueObjects.length <= 80,
      columnHeaderVertAlign: "middle",
      editTriggerEvent: "dblclick",
    }),
    [filterActive, valueObjects.length],
  );

  async function handleTableCellEdited(
    event: ArctorTableCellEditedEvent<TableObjectRow>,
  ) {
    if (
      !tableEditMode ||
      tableHistoryBusy ||
      tableCreateBusy ||
      tableDeleteBusy ||
      tableReparentDraft ||
      tableReparentBusy
    ) {
      event.restoreOldValue();
      return;
    }

    if (event.field !== "title" && event.field !== "description") {
      event.restoreOldValue();
      return;
    }

    if (
      event.row.createDraft &&
      tableCreateDraft?.operationId === event.row.id
    ) {
      const nextValue =
        typeof event.value === "string"
          ? event.value
          : event.value == null
            ? ""
            : String(event.value);
      setTableCreateDraft((current) =>
        current && current.operationId === event.row.id
          ? {
              ...current,
              ...(event.field === "title"
                ? { title: nextValue }
                : { description: nextValue }),
            }
          : current,
      );
      setTableEditFeedback({ kind: "info", text: copy.rowCreateHint });
      return;
    }

    const valueObject = objectsById.get(event.row.id);
    if (!valueObject?.id) {
      event.restoreOldValue();
      setTableEditFeedback({ kind: "error", text: tableEditCopy.saveFailed });
      return;
    }

    const strategy = getValueObjectTableEditStrategy(valueObject);
    if (strategy === "readonly_system" || strategy === "readonly_contract") {
      event.restoreOldValue();
      setTableEditFeedback({
        kind: "error",
        text:
          strategy === "readonly_system"
            ? tableEditCopy.readOnlySystem
            : tableEditCopy.readOnlyContract,
      });
      return;
    }

    const nextValue =
      typeof event.value === "string"
        ? event.value
        : event.value == null
          ? ""
          : String(event.value);

    setTableEditFeedback({ kind: "saving", text: tableEditCopy.saving });

    try {
      const patch = await saveValueObjectTableField({
        valueObject,
        field: event.field as ValueObjectTableEditableField,
        value: nextValue,
        locale,
      });

      if (!patch) {
        event.restoreOldValue();
        setTableEditFeedback({ kind: "info", text: tableEditCopy.noChanges });
        return;
      }

      onValueObjectUpdated?.(patch);

      const persistedValue =
        event.field === "title"
          ? normalizeTableHistoryValue(patch.title)
          : normalizeTableHistoryValue(patch.description);
      const previousValue = normalizeTableHistoryValue(event.oldValue);
      if (persistedValue !== previousValue) {
        const historyEntry: TableEditHistoryEntry = {
          objectId: valueObject.id,
          field: event.field as ValueObjectTableEditableField,
          before: previousValue,
          after: persistedValue,
        };
        const historyAction: TableEditHistoryAction = {
          kind: "cell",
          entries: [historyEntry],
        };
        setTableUndoStack((current) => [...current.slice(-49), historyAction]);
        setTableRedoStack([]);
      }

      setTableEditFeedback({ kind: "success", text: tableEditCopy.saved });
    } catch (saveError) {
      event.restoreOldValue();
      setTableEditFeedback({
        kind: "error",
        text:
          saveError instanceof Error && saveError.message
            ? saveError.message
            : tableEditCopy.saveFailed,
      });
    }
  }

  function withExpectedTableValue(
    valueObject: ValueObjectPayload,
    entry: TableEditHistoryEntry,
    expectedValue: string,
  ): ValueObjectPayload {
    return {
      ...valueObject,
      ...(entry.field === "title"
        ? { title: expectedValue }
        : { description: expectedValue || null }),
    };
  }

  function mergeTablePatch(
    valueObject: ValueObjectPayload,
    patch: ValueObjectTableEditPatch,
  ): ValueObjectPayload {
    return {
      ...valueObject,
      ...(Object.prototype.hasOwnProperty.call(patch, "title")
        ? { title: patch.title ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "description")
        ? { description: patch.description ?? null }
        : {}),
    };
  }

  async function persistTableHistoryEntries(
    entries: TableEditHistoryEntry[],
    direction: "forward" | "reverse",
  ): Promise<TableBatchWriteResult> {
    const orderedEntries =
      direction === "reverse" ? [...entries].reverse() : [...entries];
    const workingObjects = new Map<string, ValueObjectPayload>();
    const applied: Array<{
      entry: TableEditHistoryEntry;
      from: string;
      to: string;
    }> = [];

    try {
      for (const entry of orderedEntries) {
        const sourceObject =
          workingObjects.get(entry.objectId) ?? objectsById.get(entry.objectId);
        if (!sourceObject?.id) {
          throw new Error(tableEditCopy.saveFailed);
        }

        const strategy = getValueObjectTableEditStrategy(sourceObject);
        if (strategy === "readonly_system" || strategy === "readonly_contract") {
          throw new Error(
            strategy === "readonly_system"
              ? tableEditCopy.readOnlySystem
              : tableEditCopy.readOnlyContract,
          );
        }

        const from = direction === "forward" ? entry.before : entry.after;
        const to = direction === "forward" ? entry.after : entry.before;
        const valueObjectForWrite = withExpectedTableValue(
          sourceObject,
          entry,
          from,
        );
        const patch = await saveValueObjectTableField({
          valueObject: valueObjectForWrite,
          field: entry.field,
          value: to,
          locale,
        });

        if (!patch) {
          throw new Error(tableEditCopy.saveFailed);
        }

        const persistedObject = mergeTablePatch(valueObjectForWrite, patch);
        workingObjects.set(entry.objectId, persistedObject);
        onValueObjectUpdated?.(patch);
        applied.push({ entry, from, to });
      }

      return { ok: true, rollbackIncomplete: false };
    } catch (error) {
      let rollbackIncomplete = false;

      for (const appliedWrite of [...applied].reverse()) {
        try {
          const sourceObject =
            workingObjects.get(appliedWrite.entry.objectId) ??
            objectsById.get(appliedWrite.entry.objectId);
          if (!sourceObject?.id) {
            rollbackIncomplete = true;
            continue;
          }

          const rollbackObject = withExpectedTableValue(
            sourceObject,
            appliedWrite.entry,
            appliedWrite.to,
          );
          const rollbackPatch = await saveValueObjectTableField({
            valueObject: rollbackObject,
            field: appliedWrite.entry.field,
            value: appliedWrite.from,
            locale,
          });

          if (!rollbackPatch) {
            rollbackIncomplete = true;
            continue;
          }

          const restoredObject = mergeTablePatch(rollbackObject, rollbackPatch);
          workingObjects.set(appliedWrite.entry.objectId, restoredObject);
          onValueObjectUpdated?.(rollbackPatch);
        } catch {
          rollbackIncomplete = true;
        }
      }

      return { ok: false, rollbackIncomplete, error };
    }
  }

  async function handleTableRangePaste(
    event: ArctorTableRangePasteEvent<TableObjectRow>,
  ) {
    if (
      !tableEditMode ||
      tableHistoryBusy ||
      tableCreateBusy ||
      tableDeleteBusy ||
      tableReparentDraft ||
      tableReparentBusy
    ) {
      return;
    }

    let skipped = event.truncatedCells;
    const plannedByCell = new Map<string, TableEditHistoryEntry>();

    try {
      for (const cell of event.cells) {
        if (cell.row.createDraft) {
          skipped += 1;
          continue;
        }

        if (cell.field !== "title" && cell.field !== "description") {
          skipped += 1;
          continue;
        }

        const valueObject = objectsById.get(cell.row.id);
        if (!valueObject?.id) {
          skipped += 1;
          continue;
        }

        const strategy = getValueObjectTableEditStrategy(valueObject);
        if (strategy === "readonly_system" || strategy === "readonly_contract") {
          skipped += 1;
          continue;
        }

        const field = cell.field as ValueObjectTableEditableField;
        const validation = validateValueObjectTableFieldValue({
          valueObject,
          field,
          value: cell.value,
          locale,
        });

        if (!validation.changed) {
          skipped += 1;
          continue;
        }

        const key = `${valueObject.id}:${field}`;
        const existing = plannedByCell.get(key);
        plannedByCell.set(key, {
          objectId: valueObject.id,
          field,
          before: existing?.before ?? validation.previousValue,
          after: validation.nextValue,
        });
      }
    } catch (validationError) {
      setTableEditFeedback({
        kind: "error",
        text:
          validationError instanceof Error && validationError.message
            ? validationError.message
            : tableEditCopy.saveFailed,
      });
      return;
    }

    const entries = [...plannedByCell.values()].filter(
      (entry) => entry.before !== entry.after,
    );

    if (entries.length === 0) {
      setTableEditFeedback({
        kind: "info",
        text: tableEditCopy.pasteNoEditable,
      });
      return;
    }

    if (entries.length > MAX_TABLE_PASTE_WRITES) {
      setTableEditFeedback({ kind: "error", text: tableEditCopy.pasteTooLarge });
      return;
    }

    setTableHistoryBusy(true);
    setTableEditFeedback({ kind: "saving", text: tableEditCopy.pasting });

    try {
      const result = await persistTableHistoryEntries(entries, "forward");
      if (!result.ok) {
        const originalMessage =
          result.error instanceof Error && result.error.message
            ? result.error.message
            : "";
        setTableEditFeedback({
          kind: "error",
          text: result.rollbackIncomplete
            ? tableEditCopy.pasteRollbackFailed
            : [tableEditCopy.pasteRolledBack, originalMessage]
                .filter(Boolean)
                .join(" "),
        });
        return;
      }

      const action: TableEditHistoryAction = { kind: "paste", entries };
      setTableUndoStack((current) => [...current.slice(-49), action]);
      setTableRedoStack([]);
      setTableEditFeedback({
        kind: "success",
        text: tableEditCopy.pasted
          .replace("{count}", String(entries.length))
          .replace("{skipped}", String(skipped)),
      });
    } finally {
      setTableHistoryBusy(false);
    }
  }

  async function applyTableHistory(direction: "undo" | "redo") {
    if (tableHistoryBusy || tableCreateBusy) {
      return;
    }

    const sourceStack = direction === "undo" ? tableUndoStack : tableRedoStack;
    const action = sourceStack[sourceStack.length - 1];
    if (!action) {
      return;
    }

    setTableHistoryBusy(true);
    setTableEditFeedback({ kind: "saving", text: tableEditCopy.saving });

    try {
      const result = await persistTableHistoryEntries(
        action.entries,
        direction === "undo" ? "reverse" : "forward",
      );
      if (!result.ok) {
        setTableEditFeedback({
          kind: "error",
          text: result.rollbackIncomplete
            ? tableEditCopy.pasteRollbackFailed
            : result.error instanceof Error && result.error.message
              ? result.error.message
              : tableEditCopy.saveFailed,
        });
        return;
      }

      if (direction === "undo") {
        setTableUndoStack((current) => current.slice(0, -1));
        setTableRedoStack((current) => [...current.slice(-49), action]);
        setTableEditFeedback({ kind: "success", text: tableEditCopy.undone });
      } else {
        setTableRedoStack((current) => current.slice(0, -1));
        setTableUndoStack((current) => [...current.slice(-49), action]);
        setTableEditFeedback({ kind: "success", text: tableEditCopy.redone });
      }
    } finally {
      setTableHistoryBusy(false);
    }
  }

  function resolvePreferredTableCreateParent() {
    for (const candidateId of [tableRowSelectionId, selectedHierarchyId]) {
      if (!candidateId) {
        continue;
      }
      const candidate = objectsById.get(candidateId);
      if (canCreateObservationObjectChildUnder(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  function beginTableRowCreate() {
    if (
      !tableEditMode ||
      tableHistoryBusy ||
      tableCreateBusy ||
      tableCreateDraft
    ) {
      return;
    }

    const preferredParent = resolvePreferredTableCreateParent();
    const createDraft = createValueObjectTableDraft({
      locale,
      preferredParent,
    });
    if (!createDraft) {
      setTableEditFeedback({ kind: "error", text: copy.selectParentFirst });
      return;
    }

    setTableCreateDraft(createDraft);
    setTableEditFeedback({ kind: "info", text: copy.rowCreateHint });
  }

  function changeTableCreateRole(nextRole: ValueObjectTableCreateRole) {
    setTableCreateDraft((current) => {
      if (!current) {
        return current;
      }

      const currentParent = objectsById.get(current.parentId) ?? null;
      if (!canUseObservationObjectTableParent(currentParent, nextRole)) {
        return current;
      }

      return { ...current, role: nextRole };
    });
    setTableEditFeedback({ kind: "info", text: copy.rowCreateHint });
  }

  function changeTableCreateParent(nextParentId: string) {
    setTableCreateDraft((current) => {
      if (!current) {
        return current;
      }
      const nextParent = objectsById.get(nextParentId) ?? null;
      const defaultRole = getDefaultObservationObjectTableChildRole(nextParent);
      if (!nextParent?.id || !defaultRole) {
        return current;
      }

      return {
        ...current,
        parentId: nextParent.id,
        role: canUseObservationObjectTableParent(nextParent, current.role)
          ? current.role
          : defaultRole,
      };
    });
    setTableRowSelectionId(nextParentId);
    setTableEditFeedback({ kind: "info", text: copy.rowCreateHint });
  }

  function cancelTableRowCreate() {
    if (tableCreateBusy) {
      return;
    }
    setTableCreateDraft(null);
    setTableEditFeedback({ kind: "info", text: tableEditCopy.selectRow });
  }

  async function commitTableRowCreate() {
    const createDraft = tableCreateDraft;
    if (
      !createDraft ||
      !tableCreateCanSubmit ||
      tableCreateBusy ||
      tableHistoryBusy
    ) {
      return;
    }
    const createParent = objectsById.get(createDraft.parentId) ?? null;
    if (!canUseObservationObjectTableParent(createParent, createDraft.role)) {
      setTableEditFeedback({ kind: "error", text: copy.rowParentInvalid });
      return;
    }

    setTableCreateBusy(true);
    setTableEditFeedback({ kind: "saving", text: copy.creatingRow });

    try {
      const result = await createObservationObjectFromTable({
        draft: createDraft,
        parent: createParent,
      });
      onValueObjectCreated?.(result.row);
      setTableRowSelectionId(result.row.id);
      setTableCreateDraft(null);
      setTableEditFeedback({
        kind: result.warningCode ? "info" : "success",
        text: result.warningCode
          ? copy.rowCreatedRefreshWarning
          : copy.rowCreated,
      });
    } catch (createError) {
      const detail =
        createError instanceof Error && createError.message
          ? createError.message
          : "";
      setTableEditFeedback({
        kind: "error",
        text: [copy.rowCreateFailed, detail].filter(Boolean).join(" "),
      });
    } finally {
      setTableCreateBusy(false);
    }
  }

  async function deleteSelectedTableRow() {
    if (
      !tableEditMode ||
      tableDeleteBusy ||
      tableCreateBusy ||
      tableHistoryBusy ||
      tableCreateDraft ||
      tableReparentDraft ||
      tableReparentBusy
    ) {
      return;
    }

    const selectedId = tableRowSelectionId;
    const selectedValueObject = selectedId ? objectsById.get(selectedId) ?? null : null;
    if (!selectedValueObject?.id) {
      setTableEditFeedback({ kind: "info", text: tableEditCopy.selectRow });
      return;
    }

    const strategy = getValueObjectTableEditStrategy(selectedValueObject);
    if (strategy === "readonly_system" || strategy === "readonly_contract") {
      setTableRowSelectionId(null);
      setTableEditFeedback({
        kind: "error",
        text:
          strategy === "readonly_system"
            ? tableEditCopy.readOnlySystem
            : tableEditCopy.readOnlyContract,
      });
      return;
    }

    const title = selectedValueObject.title?.trim() || selectedValueObject.id;
    const confirmed = window.confirm(
      copy.deleteRowConfirm.replace("{title}", title),
    );
    if (!confirmed) {
      return;
    }

    setTableDeleteBusy(true);
    setTableEditFeedback({ kind: "saving", text: copy.deletingRow });

    try {
      const result = await deleteObservationObjectFromTable({
        rowId: selectedValueObject.id,
      });
      onValueObjectDeleted?.(result.deletedId);
      setTableRowSelectionId(null);
      setTableUndoStack([]);
      setTableRedoStack([]);
      setTableEditFeedback({ kind: "success", text: copy.rowDeleted });
    } catch (deleteError) {
      const blockerText =
        deleteError instanceof ValueObjectTableDeleteError &&
        deleteError.blocker?.table
          ? " " +
            copy.technicalDependency +
            ": " +
            deleteError.blocker.table +
            (deleteError.blocker.column
              ? "." + deleteError.blocker.column
              : "") +
            "."
          : "";
      const detail =
        deleteError instanceof Error && deleteError.message
          ? deleteError.message
          : "";
      setTableEditFeedback({
        kind: "error",
        text: [copy.rowDeleteFailed, detail, blockerText]
          .filter(Boolean)
          .join(" ")
          .trim(),
      });
    } finally {
      setTableDeleteBusy(false);
    }
  }

  function beginTableReparent() {
    if (
      !tableEditMode ||
      tableHistoryBusy ||
      tableCreateBusy ||
      tableDeleteBusy ||
      tableReparentDraft ||
      tableReparentBusy
    ) {
      return;
    }

    const source = tableRowSelectionId
      ? objectsById.get(tableRowSelectionId) ?? null
      : null;
    const draft = createValueObjectTableReparentDraft(source);
    if (!draft) {
      setTableEditFeedback({ kind: "error", text: copy.rowMoveNotAllowed });
      return;
    }
    setTableReparentDraft(draft);
    setTableReparentPreview(null);
    setTableEditFeedback({ kind: "info", text: copy.moveParentRequired });
  }

  function changeTableReparentParent(nextParentId: string) {
    if (tableReparentBusy) return;
    setTableReparentDraft((current) =>
      current ? { ...current, newParentId: nextParentId } : current,
    );
    setTableReparentPreview(null);
    setTableEditFeedback({ kind: "info", text: copy.moveParentRequired });
  }

  function cancelTableReparent() {
    if (tableReparentBusy) return;
    setTableReparentDraft(null);
    setTableReparentPreview(null);
    setTableEditFeedback({ kind: "info", text: tableEditCopy.selectRow });
  }

  async function previewTableReparent() {
    const draft = tableReparentDraft;
    if (!draft || !tableReparentCanPreview || tableReparentBusy) return;
    const source = objectsById.get(draft.sourceId) ?? null;
    const parent = objectsById.get(draft.newParentId) ?? null;
    setTableReparentBusy("preview");
    setTableEditFeedback({ kind: "saving", text: copy.movePreviewing });
    try {
      const preview = await previewObservationObjectTableReparent({
        draft,
        source,
        parent,
      });
      setTableReparentPreview(preview);
      setTableEditFeedback({ kind: "info", text: copy.movePreviewReady });
    } catch (moveError) {
      const detail =
        moveError instanceof ValueObjectTableReparentError || moveError instanceof Error
          ? moveError.message
          : "";
      setTableReparentPreview(null);
      setTableEditFeedback({
        kind: "error",
        text: [copy.rowMoveFailed, detail].filter(Boolean).join(" "),
      });
    } finally {
      setTableReparentBusy(null);
    }
  }

  async function applyTableReparent() {
    const draft = tableReparentDraft;
    const preview = tableReparentPreview;
    if (!draft || !preview || tableReparentBusy) return;
    const source = objectsById.get(draft.sourceId) ?? null;
    const parent = objectsById.get(draft.newParentId) ?? null;
    setTableReparentBusy("apply");
    setTableEditFeedback({ kind: "saving", text: copy.moveApplying });
    try {
      const result = await applyObservationObjectTableReparent({
        draft,
        preview,
        source,
        parent,
      });
      onValueObjectReparented?.(result.targetValueObjectId, draft.newParentId);
      setTableRowSelectionId(result.targetValueObjectId);
      setTableReparentDraft(null);
      setTableReparentPreview(null);
      setTableUndoStack([]);
      setTableRedoStack([]);
      setTableEditFeedback({ kind: "success", text: copy.rowMoved });
    } catch (moveError) {
      const detail = moveError instanceof Error ? moveError.message : "";
      setTableEditFeedback({
        kind: "error",
        text: [copy.rowMoveFailed, detail].filter(Boolean).join(" "),
      });
    } finally {
      setTableReparentBusy(null);
    }
  }

  function updateHierarchyLevel(levelIndex: number, nextId: string) {
    const basePath = hierarchyPathObjects
      .slice(0, levelIndex)
      .map((valueObject) => valueObject.id);

    onHierarchyPathChange(nextId ? [...basePath, nextId] : basePath);
  }

  function renderHierarchyFilters() {
    const controls: ReactNode[] = [];

    controls.push(
      <select
        key="root"
        aria-label={copy.rootFilter}
        title={copy.rootFilter}
        value={hierarchyPathObjects[0]?.id ?? ""}
        onChange={(event) => updateHierarchyLevel(0, event.target.value)}
        className="h-11 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] lg:w-[220px] xl:w-[240px]"
      >
        <option value="">{copy.allRoots}</option>
        {hierarchyRoots.map((valueObject) => (
          <option key={valueObject.id} value={valueObject.id ?? ""}>
            {valueObject.title?.trim() || "—"}
          </option>
        ))}
      </select>,
    );

    hierarchyPathObjects.forEach((parent, parentIndex) => {
      const options = sortObjects(
        childrenByParent.get(parent.id) ?? [],
        "title",
        locale,
      ).filter((valueObject) => Boolean(valueObject.id));

      if (options.length === 0) {
        return;
      }

      const levelIndex = parentIndex + 1;
      const parentTitle = parent.title?.trim() || "—";
      const label = copy.insideFilter.replace("{parent}", parentTitle);

      controls.push(
        <select
          key={`child-${parent.id}`}
          aria-label={label}
          title={label}
          value={hierarchyPathObjects[levelIndex]?.id ?? ""}
          onChange={(event) =>
            updateHierarchyLevel(levelIndex, event.target.value)
          }
          className="h-11 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] lg:w-[220px] xl:w-[240px]"
        >
          <option value="">{copy.allChildren}</option>
          {options.map((valueObject) => (
            <option key={valueObject.id} value={valueObject.id ?? ""}>
              {valueObject.title?.trim() || "—"}
            </option>
          ))}
        </select>,
      );
    });

    return controls;
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current ?? defaultExpandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(branchIds));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function renderInsertControl(row: TreeRow, mobile: boolean) {
    const valueObject = row.valueObject;
    if (!valueObject.id) return null;

    const role = getSemanticRole(valueObject);
    if (role === "leaf") return null;

    const opened = insertParentId === valueObject.id;
    const padding = mobile
      ? Math.min((row.depth + 1) * 14 + 38, 92)
      : (row.depth + 1) * 26 + 38;
    const intermediateHref = buildLocaleAwareHref(
      `/value-objects/${valueObject.id}/new-intermediate`,
      locale,
    );
    const leafHref = buildLocaleAwareHref(
      `/value-objects/${valueObject.id}/new-leaf`,
      locale,
    );

    return (
      <div
        className={[
          "relative flex min-h-6 items-center",
          mobile ? "py-1" : "py-0.5",
        ].join(" ")}
        style={{ paddingLeft: padding }}
      >
        <div className="h-px w-4 bg-[#dfe3f1]" aria-hidden="true" />
        <button
          type="button"
          onClick={() =>
            setInsertParentId((current) =>
              current === valueObject.id ? null : valueObject.id ?? null,
            )
          }
          aria-label={copy.addChild}
          title={copy.addChild}
          className="mx-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c9d5ff] bg-white text-[#3b6ef8] shadow-sm transition hover:border-[#3b6ef8] hover:bg-[#eef2ff]"
        >
          <Plus size={11} strokeWidth={2.2} />
        </button>
        <div className="h-px flex-1 bg-[#edf0f7]" aria-hidden="true" />

        {opened ? (
          <div className="absolute left-0 top-6 z-30 flex flex-wrap gap-1.5 rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-lg" style={{ marginLeft: padding }}>
            <Link
              href={intermediateHref}
              className="rounded-lg bg-[#eef2ff] px-2.5 py-1.5 text-[10px] font-bold text-[#3b6ef8] hover:bg-[#dfe4ff]"
            >
              + {copy.intermediate}
            </Link>
            {role === "intermediate" ? (
              <Link
                href={leafHref}
                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                + {copy.leaf}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderTreeObject(row: TreeRow, mobile: boolean) {
    const { valueObject, depth, hasChildren } = row;
    const role = getSemanticRole(valueObject);
    const RoleIcon = roleIcon(role);
    const title = valueObject.title?.trim() || "—";
    const description = valueObject.description?.trim() || copy.noDescription;
    const expanded = filterActive || (valueObject.id ? activeExpandedIds.has(valueObject.id) : false);
    const padding = mobile ? Math.min(depth * 14, 56) : depth * 26;

    return (
      <div className="flex min-w-0 items-start gap-2" style={{ paddingLeft: padding }}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          {hasChildren && valueObject.id ? (
            <button
              type="button"
              onClick={() => toggleExpanded(valueObject.id as string)}
              disabled={filterActive}
              aria-label={expanded ? copy.collapseAll : copy.expandAll}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7c8099] transition hover:bg-[#eef2ff] hover:text-[#3b6ef8] disabled:cursor-default disabled:opacity-60"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]">
          <RoleIcon size={17} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "min-w-0 break-words text-[13px] text-[#111827]",
                role === "root" ? "font-bold" : "font-semibold",
              ].join(" ")}
            >
              {title}
            </span>
            <span className="rounded-full border border-[#e7eaf3] bg-[#f8fafc] px-2 py-0.5 text-[9px] font-semibold text-[#6b7280]">
              {getContextLabel(valueObject, copy)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[#7c8099]">
            {description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-[18px] border border-black/[0.07] bg-white p-2.5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {!standaloneTableWorkspace ? (
            <div className="inline-flex self-start rounded-xl bg-[#f5f6fb] p-1">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "tree"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <ListTree size={15} />
              {copy.tree}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "cards"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <LayoutGrid size={15} />
              {copy.cards}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "map"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <MapIcon size={15} />
              {copy.map}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                viewMode === "table"
                  ? "bg-white text-[#3b6ef8] shadow-sm"
                  : "text-[#7c8099] hover:text-[#1a1d2e]",
              ].join(" ")}
            >
              <Table2 size={15} />
              {copy.table}
            </button>
            </div>
          ) : null}

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-1 lg:flex lg:min-w-0 lg:flex-1 lg:flex-wrap lg:justify-start">
            {renderHierarchyFilters()}
          </div>

          {viewMode === "table" ? (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              {standaloneTableWorkspace ? (
                <StandaloneWorkspaceCloseButton
                  label={CLOSE_TABLE_LABELS[locale]}
                  fallbackHref={buildLocaleAwareHref("/value-objects", locale)}
                />
              ) : (
                <Link
                  href={buildTableWorkspaceHref(locale)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfd8ff] bg-white px-3 py-2 text-[11px] font-semibold text-[#3b6ef8] transition hover:bg-[#f7f9ff]"
                >
                  {OPEN_TABLE_WORKSPACE_LABELS[locale]}
                </Link>
              )}

              {tableEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={beginTableRowCreate}
                    disabled={
                      tableHistoryBusy ||
                      tableCreateBusy ||
                      tableDeleteBusy ||
                      Boolean(tableCreateDraft) ||
                      Boolean(tableReparentDraft) ||
                      Boolean(tableReparentBusy)
                    }
                    aria-label={copy.addRow}
                    title={copy.addRow}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#cfd8ff] bg-white px-2.5 text-[11px] font-semibold text-[#3b6ef8] transition hover:bg-[#f7f9ff] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a4a9b8]"
                  >
                    <Plus size={16} />
                    <span>{copy.addRow}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSelectedTableRow()}
                    disabled={
                      tableHistoryBusy ||
                      tableCreateBusy ||
                      tableDeleteBusy ||
                      Boolean(tableCreateDraft) ||
                      Boolean(tableReparentDraft) ||
                      Boolean(tableReparentBusy) ||
                      !tableRowSelectionId
                    }
                    aria-label={copy.deleteRow}
                    title={copy.deleteRow}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#ffd2d2] bg-white px-2.5 text-[11px] font-semibold text-[#c24141] transition hover:bg-[#fff8f8] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a4a9b8]"
                  >
                    <Trash2 size={16} />
                    <span>{tableDeleteBusy ? copy.deletingRow : copy.deleteRow}</span>
                  </button>
                  <button
                    type="button"
                    onClick={beginTableReparent}
                    disabled={
                      tableHistoryBusy ||
                      tableCreateBusy ||
                      tableDeleteBusy ||
                      Boolean(tableCreateDraft) ||
                      Boolean(tableReparentDraft) ||
                      Boolean(tableReparentBusy) ||
                      !tableSelectedReparentable
                    }
                    aria-label={copy.changeParent}
                    title={copy.changeParent}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#d7dcff] bg-white px-2.5 text-[11px] font-semibold text-[#4f5fc7] transition hover:bg-[#f7f8ff] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a4a9b8]"
                  >
                    <Network size={16} />
                    <span>{copy.changeParent}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyTableHistory("undo")}
                    disabled={
                      tableHistoryBusy ||
                      tableCreateBusy ||
                      tableDeleteBusy ||
                      Boolean(tableReparentDraft) ||
                      Boolean(tableReparentBusy) ||
                      tableUndoStack.length === 0
                    }
                    aria-label={tableEditCopy.undo}
                    title={tableEditCopy.undo}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#dfe3f1] bg-white px-2.5 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a4a9b8]"
                  >
                    <Undo2 size={16} />
                    <span className="hidden sm:inline">{tableEditCopy.undo}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyTableHistory("redo")}
                    disabled={
                      tableHistoryBusy ||
                      tableCreateBusy ||
                      tableDeleteBusy ||
                      Boolean(tableReparentDraft) ||
                      Boolean(tableReparentBusy) ||
                      tableRedoStack.length === 0
                    }
                    aria-label={tableEditCopy.redo}
                    title={tableEditCopy.redo}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#dfe3f1] bg-white px-2.5 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#a4a9b8]"
                  >
                    <Redo2 size={16} />
                    <span className="hidden sm:inline">{tableEditCopy.redo}</span>
                  </button>
                </>
              ) : null}

              <button
                type="button"
                disabled={
                  tableCreateBusy ||
                  tableDeleteBusy ||
                  tableHistoryBusy ||
                  Boolean(tableReparentDraft) ||
                  Boolean(tableReparentBusy)
                }
                onClick={() => {
                  const nextMode = !tableEditMode;
                  setTableEditMode(nextMode);
                  setTableUndoStack([]);
                  setTableRedoStack([]);
                  setTableHistoryBusy(false);
                  setTableCreateDraft(null);
                  setTableCreateBusy(false);
                  setTableDeleteBusy(false);
                  setTableReparentDraft(null);
                  setTableReparentPreview(null);
                  setTableReparentBusy(null);
                  setTableRowSelectionId(null);
                  setTableEditFeedback(
                    nextMode
                      ? { kind: "info", text: tableEditCopy.selectRow }
                      : null,
                  );
                }}
                className={[
                  "min-h-11 rounded-xl border px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                  tableEditMode
                    ? "border-[#3b6ef8] bg-[#eef2ff] text-[#3b6ef8]"
                    : "border-[#dfe3f1] bg-white text-[#4a4f6a] hover:bg-[#f8fafc]",
                ].join(" ")}
              >
                {tableEditMode ? tableEditCopy.disableMode : tableEditCopy.enableMode}
              </button>
            </div>
          ) : null}

          {viewMode === "tree" ? (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <span className="hidden text-[11px] font-semibold text-[#7c8099] xl:inline">
                {filterActive
                  ? `${matchingIds.size} ${copy.matches}`
                  : `${valueObjects.length} ${copy.objects}`}
              </span>
              <button
                type="button"
                onClick={expandAll}
                className="rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc]"
              >
                {copy.expandAll}
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc]"
              >
                {copy.collapseAll}
              </button>
            </div>
          ) : null}
        </div>

        {hierarchyPathObjects.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#edf0f7] px-1 pt-2 text-[10px] text-[#7c8099]">
            <span className="font-semibold uppercase tracking-[0.08em]">
              {copy.selectedBranch}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-[#4a4f6a]">
              {hierarchyPathObjects
                .map((valueObject) => valueObject.title?.trim() || "—")
                .join(" › ")}
            </span>
            <button
              type="button"
              onClick={() => onHierarchyPathChange([])}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold text-[#3b6ef8] transition hover:bg-[#eef2ff]"
            >
              {copy.resetHierarchy}
            </button>
          </div>
        ) : null}
      </div>

      {viewMode === "cards" ? children : null}

      {viewMode === "map" ? (
        <ValueObjectMindMap
          valueObjects={valueObjects.filter(
            (valueObject) => valueObject.id && visibleIds.has(valueObject.id),
          )}
          locale={locale}
          onValueObjectDeleted={onValueObjectDeleted}
          onValueObjectReparented={onValueObjectReparented}
          onValueObjectCreated={onValueObjectCreated}
        />
      ) : null}

      {viewMode === "table" ? (
        <div className="grid gap-2 rounded-[18px] border border-black/[0.04] bg-white p-2 shadow-sm">
          {tableEditMode && tableCreateDraft ? (
            <div className="grid gap-2 rounded-xl border border-[#c9d5ff] bg-[#f7f9ff] p-2.5 lg:grid-cols-[150px_minmax(220px,1fr)_minmax(260px,1.4fr)_auto_auto] lg:items-center">
              <select
                value={tableCreateDraft.role}
                disabled={tableCreateBusy}
                onChange={(event) =>
                  changeTableCreateRole(
                    event.target.value as ValueObjectTableCreateRole,
                  )
                }
                className="min-h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#343854] outline-none"
              >
                <option value="intermediate">{copy.intermediate}</option>
                {tableCreateLeafAllowed ? (
                  <option value="leaf">{copy.leaf}</option>
                ) : null}
              </select>

              <select
                value={tableCreateDraft.parentId}
                disabled={tableCreateBusy}
                onChange={(event) => changeTableCreateParent(event.target.value)}
                className="min-h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#343854] outline-none disabled:bg-[#f1f3f7] disabled:text-[#8b91a7]"
              >
                <option value="" disabled>{copy.parentRequired}</option>
                {tableCreateParentOptions.map((valueObject) => (
                  <option key={valueObject.id} value={valueObject.id}>
                    {pathById.get(valueObject.id) ?? valueObject.title ?? "—"}
                  </option>
                ))}
              </select>

              <div className="text-[10px] font-semibold leading-4 text-[#66708f]">
                {copy.rowCreateHint}
              </div>

              <button
                type="button"
                onClick={() => void commitTableRowCreate()}
                disabled={
                  tableCreateBusy || tableHistoryBusy || !tableCreateCanSubmit
                }
                className="min-h-10 rounded-lg bg-[#3b6ef8] px-3 text-[11px] font-bold text-white transition hover:bg-[#315fdc] disabled:cursor-not-allowed disabled:bg-[#b7c4ee]"
              >
                {tableCreateBusy ? copy.creatingRow : copy.createRow}
              </button>
              <button
                type="button"
                onClick={cancelTableRowCreate}
                disabled={tableCreateBusy}
                className="min-h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tableEditCopy.cancel}
              </button>
            </div>
          ) : null}

          {tableReparentDraft ? (
            <div className="grid gap-2 rounded-xl border border-[#cfd8ff] bg-[#f8faff] p-2.5 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_auto_auto] lg:items-center">
              <div className="min-w-0 text-[10px] font-semibold leading-4 text-[#5a6484]">
                <span className="block text-[#303a69]">{copy.changeParent}</span>
                <span className="block truncate">
                  {tableReparentSource?.title?.trim() || tableReparentDraft.sourceId}
                </span>
              </div>
              <select
                value={tableReparentDraft.newParentId}
                onChange={(event) => changeTableReparentParent(event.target.value)}
                disabled={Boolean(tableReparentBusy)}
                className="min-h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#343854] outline-none disabled:bg-[#f1f3f7] disabled:text-[#8b91a7]"
              >
                <option value="">{copy.moveParentRequired}</option>
                {tableReparentParentOptions.map((valueObject) => (
                  <option key={valueObject.id} value={valueObject.id}>
                    {pathById.get(valueObject.id) ?? valueObject.title ?? "—"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void previewTableReparent()}
                disabled={Boolean(tableReparentBusy) || !tableReparentCanPreview}
                className="min-h-10 rounded-lg border border-[#cfd8ff] bg-white px-3 text-[11px] font-bold text-[#3b6ef8] transition hover:bg-[#f1f5ff] disabled:cursor-not-allowed disabled:text-[#a4a9b8]"
              >
                {tableReparentBusy === "preview" ? copy.movePreviewing : copy.movePreview}
              </button>
              <button
                type="button"
                onClick={cancelTableReparent}
                disabled={Boolean(tableReparentBusy)}
                className="min-h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:opacity-60"
              >
                {copy.moveCancel}
              </button>

              {tableReparentPreview ? (
                <div className="grid gap-1 rounded-lg border border-[#dde4ff] bg-white p-2 text-[10px] leading-4 text-[#5a6484] lg:col-span-3">
                  <div><strong>{copy.moveCurrentPath}:</strong> {tableReparentPreview.oldPath.map((node) => node.title).join(" → ")}</div>
                  <div><strong>{copy.moveNewPath}:</strong> {tableReparentPreview.newPath.map((node) => node.title).join(" → ")}</div>
                  {tableReparentPreview.warnings.length > 0 ? (
                    <div><strong>{copy.moveWarnings}:</strong> {tableReparentPreview.warnings.join(" · ")}</div>
                  ) : null}
                </div>
              ) : null}
              {tableReparentPreview ? (
                <button
                  type="button"
                  onClick={() => void applyTableReparent()}
                  disabled={Boolean(tableReparentBusy)}
                  className="min-h-10 rounded-lg bg-[#3b6ef8] px-3 text-[11px] font-bold text-white transition hover:bg-[#315fdc] disabled:bg-[#b7c4ee]"
                >
                  {tableReparentBusy === "apply" ? copy.moveApplying : copy.moveApply}
                </button>
              ) : null}
            </div>
          ) : null}

          {tableEditMode ? (
            <div
              className={[
                "rounded-xl border px-3 py-2 text-[11px] font-semibold",
                tableEditFeedback?.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : tableEditFeedback?.kind === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : tableEditFeedback?.kind === "saving"
                      ? "border-[#c9d5ff] bg-[#eef2ff] text-[#3b6ef8]"
                      : "border-dashed border-[#c9d5ff] bg-[#f7f9ff] text-[#5a6484]",
              ].join(" ")}
              role={tableEditFeedback?.kind === "error" ? "alert" : "status"}
            >
              <span>{tableEditFeedback?.text ?? tableEditCopy.selectRow}</span>
              {tableEditFeedback?.kind === "info" ? (
                <span className="mt-1 block font-medium text-[#7c8099]">
                  {tableEditCopy.rangeHint}
                </span>
              ) : null}
            </div>
          ) : null}
          <ArctorTabulator<TableObjectRow>
            data={tableRows}
            columns={tableColumns}
            rowKey="id"
            emptyLabel={copy.emptyTable}
            height={
              standaloneTableWorkspace
                ? "calc(100vh - 138px)"
                : "min(68vh, 760px)"
            }
            options={tableOptions}
            editMode={tableEditMode}
            adaptiveTouchEditing={tableEditMode}
            mobileHorizontalScroll
            allowNativePinchZoom
            rangeClipboard={tableEditMode}
            onRangeCopied={() => {
              if (tableEditMode && !tableHistoryBusy) {
                setTableEditFeedback({
                  kind: "success",
                  text: tableEditCopy.copied,
                });
              }
            }}
            onRangePaste={handleTableRangePaste}
            onCellEdited={handleTableCellEdited}
            onRowClick={(row) => {
              if (tableEditMode) {
                if (row.createDraft) {
                  setTableEditFeedback({ kind: "info", text: copy.rowCreateHint });
                  return;
                }
                if (tableReparentDraft) {
                  setTableEditFeedback({ kind: "info", text: copy.moveParentRequired });
                  return;
                }

                const valueObject = objectsById.get(row.id);
                if (valueObject) {
                  const strategy = getValueObjectTableEditStrategy(valueObject);
                  if (strategy === "readonly_system" || strategy === "readonly_contract") {
                    setTableRowSelectionId(null);
                    setTableEditFeedback({
                      kind: "error",
                      text:
                        strategy === "readonly_system"
                          ? tableEditCopy.readOnlySystem
                          : tableEditCopy.readOnlyContract,
                    });
                    return;
                  }

                  setTableRowSelectionId(valueObject.id ?? null);

                  if (tableCreateDraft) {
                    if (!canCreateObservationObjectChildUnder(valueObject)) {
                      setTableEditFeedback({
                        kind: "error",
                        text: copy.rowParentInvalid,
                      });
                      return;
                    }

                    const defaultRole =
                      getDefaultObservationObjectTableChildRole(valueObject);
                    if (!defaultRole) {
                      setTableEditFeedback({
                        kind: "error",
                        text: copy.rowParentInvalid,
                      });
                      return;
                    }
                    setTableCreateDraft((current) =>
                      current
                        ? {
                            ...current,
                            parentId: valueObject.id as string,
                            role: canUseObservationObjectTableParent(
                              valueObject,
                              current.role,
                            )
                              ? current.role
                              : defaultRole,
                          }
                        : current,
                    );
                    setTableEditFeedback({
                      kind: "info",
                      text: copy.rowCreateHint,
                    });
                  } else {
                    setTableEditFeedback({
                      kind: "info",
                      text: tableEditCopy.selectRow,
                    });
                  }
                }
                return;
              }

              window.location.assign(
                buildLocaleAwareHref(`/value-objects/${row.id}`, locale),
              );
            }}
          />
        </div>
      ) : null}

      {viewMode === "tree" ? (
        <>
          <div className="hidden overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="bg-[#f8fafc]">
                  <tr className="border-b border-[#edf0f7] text-left">
                    <th className="min-w-[430px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.object}
                    </th>
                    <th className="w-[130px] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.role}
                    </th>
                    <th className="w-[82px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.directChildren}
                    </th>
                    <th className="w-[100px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.descendants}
                    </th>
                    <th className="w-[82px] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7c8099]">
                      {copy.leaves}
                    </th>
                    <th className="w-[110px] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.status}
                    </th>
                    <th className="w-[92px] px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
                      {copy.action}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const valueObject = row.valueObject;
                    const role = getSemanticRole(valueObject);
                    const title = valueObject.title?.trim() || "—";
                    return (
                      <Fragment key={valueObject.id ?? `${title}-${row.depth}`}>
                        <tr
                          className={[
                            "border-b border-[#f0f2f7] transition hover:bg-[#fafbff]",
                            role === "root" ? "bg-[#fcfdff]" : "bg-white",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3">{renderTreeObject(row, false)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                roleBadgeClass(role),
                              ].join(" ")}
                            >
                              {getRoleLabel(role, copy)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.directChildren}
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.descendants}
                          </td>
                          <td className="px-3 py-3 text-center text-[13px] font-bold text-[#334155]">
                            {row.descendantLeaves}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                statusBadgeClass(valueObject.status),
                              ].join(" ")}
                            >
                              {getStatusLabel(valueObject.status, copy)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {valueObject.id ? (
                              <Link
                                href={buildLocaleAwareHref(`/value-objects/${valueObject.id}`, locale)}
                                className="text-[12px] font-bold text-[#3b6ef8] hover:underline"
                              >
                                {copy.open}
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                        {role !== "leaf" ? (
                          <tr className="bg-white">
                            <td colSpan={7} className="px-4 py-0">
                              {renderInsertControl(row, false)}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-2 md:hidden">
            {rows.map((row) => {
              const valueObject = row.valueObject;
              const role = getSemanticRole(valueObject);
              const title = valueObject.title?.trim() || "—";
              return (
                <Fragment key={valueObject.id ?? `${title}-${row.depth}`}>
                  <article
                    className="rounded-[18px] border border-[#dfe3f1] bg-white p-3 shadow-sm"
                  >
                    {renderTreeObject(row, true)}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf0f7] pt-3">
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[9px] font-bold",
                          roleBadgeClass(role),
                        ].join(" ")}
                      >
                        {getRoleLabel(role, copy)}
                      </span>
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[9px] font-bold",
                          statusBadgeClass(valueObject.status),
                        ].join(" ")}
                      >
                        {getStatusLabel(valueObject.status, copy)}
                      </span>
                      <span className="text-[10px] font-semibold text-[#7c8099]">
                        {copy.directChildren}: {row.directChildren} · {copy.descendants}: {row.descendants} · {copy.leaves}: {row.descendantLeaves}
                      </span>
                      {valueObject.id ? (
                        <Link
                          href={buildLocaleAwareHref(`/value-objects/${valueObject.id}`, locale)}
                          className="ml-auto text-[11px] font-bold text-[#3b6ef8] hover:underline"
                        >
                          {copy.open}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                  {role !== "leaf" ? renderInsertControl(row, true) : null}
                </Fragment>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
