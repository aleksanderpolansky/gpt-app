"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Maximize2,
  Network,
  Plus,
  Search,
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
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import {
  resolveSemanticRelationDescription,
  resolveSemanticRelationTitle,
} from "@/data/value-object-semantic-relation-localization";
import type {
  ValueObjectRelationCandidateDto,
  ValueObjectRelationTypeDto,
  ValueObjectSemanticRelationDto,
  ValueObjectSemanticRelationListResponse,
  ValueObjectSemanticRelationLocale,
} from "@/types/value-object-semantic-relation";
import { ValueObjectSemanticRelationsManager } from "./value-object-semantic-relations-manager";
import {
  ValueObjectRelationshipCoverageReview,
  type CoverageSnapshot,
} from "./value-object-relationship-coverage-review";

type LocaleCode = ValueObjectSemanticRelationLocale;

type RelatedObject = {
  id: string;
  title: string;
  nodeRoleCode?: string | null;
};

type Props = {
  valueObjectId: string;
  title: string;
  locale: LocaleCode;
  parentObject: RelatedObject | null;
  siblingObjects: RelatedObject[];
  childObjects: RelatedObject[];
  canCreateChildren: boolean;
  canCreateLeaf: boolean;
  canManageRelations: boolean;
};

type Density = "normal" | "compact" | "dense" | "fixed";
type ZoneKind = "structural" | "semantic" | "cross_plane";
type ReviewCode = "reviewed" | "unreviewed" | "stale" | "not_applicable" | "model_gap";
type DetailLevel = "overview" | "work" | "detailed";
type SemanticBlockKey =
  | "structure"
  | "correspondence"
  | "dependency_support"
  | "influence_conflict"
  | "cross_plane"
  | "other";

type ReviewSummary = {
  reviewed: number;
  unreviewed: number;
  stale: number;
  not_applicable: number;
  model_gap: number;
};

type SemanticBlock = {
  key: SemanticBlockKey;
  title: string;
  description: string;
  zones: RelationshipZone[];
  summary: ReviewSummary;
  dominantReviewCode: ReviewCode | null;
  paletteIndex: number;
};

type RelationCard = {
  id: string;
  title: string;
  href: string;
  detail?: string;
};

type RelationshipZone = {
  key: string;
  title: string;
  description: string;
  kind: ZoneKind;
  cards: RelationCard[];
  paletteIndex: number;
  coverageZoneKey?: string;
  reviewCode?: ReviewCode;
  reviewedAt?: string | null;
};

type Copy = {
  title: string;
  description: string;
  loading: string;
  error: string;
  retry: string;
  parent: string;
  parentDescription: string;
  children: string;
  childrenDescription: string;
  siblings: string;
  siblingsDescription: string;
  semanticRelations: string;
  semanticRelationsDescription: string;
  noItems: string;
  more: string;
  expand: string;
  openSeparate: string;
  close: string;
  search: string;
  autoScale: string;
  fixedSize: string;
  densityHint: string;
  addRelation: string;
  createObject: string;
  addIntermediate: string;
  addLeaf: string;
  openObject: string;
  relationManagement: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Observation object relationship map",
    description: "The current object stays in the center. Structural and semantic links are grouped into separate zones. Crowded zones become more compact without shrinking text below a readable minimum.",
    loading: "Loading semantic relations…",
    error: "Could not load semantic relations.",
    retry: "Retry",
    parent: "Parent",
    parentDescription: "The direct structural parent of the current observation object.",
    children: "Children",
    childrenDescription: "Direct structural children of the current observation object.",
    siblings: "Siblings",
    siblingsDescription: "Objects that have the same direct structural parent.",
    semanticRelations: "Semantic relations",
    semanticRelationsDescription: "Meaning links that do not change the structural tree.",
    noItems: "No linked objects yet.",
    more: "more",
    expand: "Expand zone",
    openSeparate: "Open separately",
    close: "Close",
    search: "Search inside this zone",
    autoScale: "Auto density",
    fixedSize: "Fixed card size",
    densityHint: "Auto density changes only the crowded zone. Fixed size keeps cards readable and adds scrolling.",
    addRelation: "Add relation",
    createObject: "Create observation object",
    addIntermediate: "Add intermediate",
    addLeaf: "Add leaf",
    openObject: "Open object",
    relationManagement: "Manage semantic relations",
  },
  pl: {
    title: "Mapa relacji obiektu obserwacji",
    description: "Bieżący obiekt pozostaje w centrum. Relacje strukturalne i semantyczne są pogrupowane w osobne strefy. Zatłoczone strefy zagęszczają się bez zmniejszania tekstu poniżej czytelnego minimum.",
    loading: "Ładowanie relacji semantycznych…",
    error: "Nie udało się załadować relacji semantycznych.",
    retry: "Ponów",
    parent: "Rodzic",
    parentDescription: "Bezpośredni rodzic strukturalny bieżącego obiektu obserwacji.",
    children: "Dzieci",
    childrenDescription: "Bezpośrednie obiekty podrzędne bieżącego obiektu obserwacji.",
    siblings: "Sąsiedzi",
    siblingsDescription: "Obiekty mające tego samego bezpośredniego rodzica strukturalnego.",
    semanticRelations: "Relacje semantyczne",
    semanticRelationsDescription: "Relacje znaczeniowe, które nie zmieniają drzewa strukturalnego.",
    noItems: "Brak powiązanych obiektów.",
    more: "więcej",
    expand: "Rozwiń strefę",
    openSeparate: "Otwórz osobno",
    close: "Zamknij",
    search: "Szukaj w tej strefie",
    autoScale: "Automatyczna gęstość",
    fixedSize: "Stały rozmiar kart",
    densityHint: "Automatyczna gęstość zmienia tylko zatłoczoną strefę. Stały rozmiar zachowuje czytelność i dodaje przewijanie.",
    addRelation: "Dodaj relację",
    createObject: "Utwórz obiekt obserwacji",
    addIntermediate: "Dodaj pośredni",
    addLeaf: "Dodaj liść",
    openObject: "Otwórz obiekt",
    relationManagement: "Zarządzaj relacjami semantycznymi",
  },
  ru: {
    title: "Карта связей ОН",
    description: "Текущий объект остаётся в центре. Структурные и смысловые связи собраны в отдельные зоны. Перегруженная зона уплотняется независимо, но текст не уменьшается ниже читаемого минимума.",
    loading: "Загружаю смысловые связи…",
    error: "Не удалось загрузить смысловые связи.",
    retry: "Повторить",
    parent: "Родитель",
    parentDescription: "Прямой структурный родитель текущего объекта наблюдения.",
    children: "Дети",
    childrenDescription: "Прямые структурные дочерние объекты текущего ОН.",
    siblings: "Соседи",
    siblingsDescription: "Объекты с тем же прямым структурным родителем.",
    semanticRelations: "Смысловые связи",
    semanticRelationsDescription: "Типизированные смысловые связи, которые не изменяют структурное дерево.",
    noItems: "Связанных объектов пока нет.",
    more: "ещё",
    expand: "Развернуть зону",
    openSeparate: "Открыть отдельно",
    close: "Закрыть",
    search: "Поиск внутри этой зоны",
    autoScale: "Автомасштаб",
    fixedSize: "Фиксированный размер",
    densityHint: "Автомасштаб уплотняет только перегруженную зону. Фиксированный размер сохраняет карточки одинаковыми и включает прокрутку.",
    addRelation: "Добавить связь",
    createObject: "Создать ОН",
    addIntermediate: "Добавить промежуточный",
    addLeaf: "Добавить лист",
    openObject: "Открыть ОН",
    relationManagement: "Управление смысловыми связями",
  },
  uk: {
    title: "Карта зв’язків об’єкта спостереження",
    description: "Поточний об’єкт залишається в центрі. Структурні та смислові зв’язки згруповані в окремі зони. Перевантажена зона ущільнюється окремо, але текст не зменшується нижче читабельного мінімуму.",
    loading: "Завантаження смислових зв’язків…",
    error: "Не вдалося завантажити смислові зв’язки.",
    retry: "Повторити",
    parent: "Батьківський об’єкт",
    parentDescription: "Прямий структурний батьківський об’єкт поточного об’єкта спостереження.",
    children: "Дочірні об’єкти",
    childrenDescription: "Прямі структурні дочірні об’єкти поточного об’єкта спостереження.",
    siblings: "Сусіди",
    siblingsDescription: "Об’єкти з тим самим прямим структурним батьківським об’єктом.",
    semanticRelations: "Смислові зв’язки",
    semanticRelationsDescription: "Типізовані смислові зв’язки, що не змінюють структурне дерево.",
    noItems: "Пов’язаних об’єктів ще немає.",
    more: "ще",
    expand: "Розгорнути зону",
    openSeparate: "Відкрити окремо",
    close: "Закрити",
    search: "Пошук у цій зоні",
    autoScale: "Автомасштаб",
    fixedSize: "Фіксований розмір",
    densityHint: "Автомасштаб ущільнює тільки перевантажену зону. Фіксований розмір зберігає однакові картки та додає прокручування.",
    addRelation: "Додати зв’язок",
    createObject: "Створити об’єкт спостереження",
    addIntermediate: "Додати проміжний",
    addLeaf: "Додати лист",
    openObject: "Відкрити об’єкт",
    relationManagement: "Керування смисловими зв’язками",
  },
  de: {
    title: "Beziehungslandkarte des Beobachtungsobjekts",
    description: "Das aktuelle Objekt bleibt im Zentrum. Struktur- und Bedeutungsbeziehungen werden in getrennten Bereichen gruppiert. Dichte Bereiche werden kompakter, ohne die Schrift unter ein lesbares Minimum zu verkleinern.",
    loading: "Semantische Beziehungen werden geladen…",
    error: "Semantische Beziehungen konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    parent: "Übergeordnet",
    parentDescription: "Direktes strukturell übergeordnetes Beobachtungsobjekt.",
    children: "Untergeordnet",
    childrenDescription: "Direkte strukturell untergeordnete Beobachtungsobjekte.",
    siblings: "Nachbarn",
    siblingsDescription: "Objekte mit demselben direkten strukturellen Elternobjekt.",
    semanticRelations: "Semantische Beziehungen",
    semanticRelationsDescription: "Typisierte Bedeutungsbeziehungen ohne Änderung des Strukturbaums.",
    noItems: "Noch keine verbundenen Objekte.",
    more: "weitere",
    expand: "Bereich vergrößern",
    openSeparate: "Separat öffnen",
    close: "Schließen",
    search: "In diesem Bereich suchen",
    autoScale: "Automatische Dichte",
    fixedSize: "Feste Kartengröße",
    densityHint: "Die automatische Dichte ändert nur den überfüllten Bereich. Feste Größe erhält die Lesbarkeit und aktiviert Scrollen.",
    addRelation: "Beziehung hinzufügen",
    createObject: "Beobachtungsobjekt erstellen",
    addIntermediate: "Zwischenobjekt hinzufügen",
    addLeaf: "Blatt hinzufügen",
    openObject: "Objekt öffnen",
    relationManagement: "Semantische Beziehungen verwalten",
  },
  es: {
    title: "Mapa de relaciones del objeto de observación",
    description: "El objeto actual permanece en el centro. Las relaciones estructurales y semánticas se agrupan en zonas separadas. Las zonas saturadas se compactan sin reducir el texto por debajo de un mínimo legible.",
    loading: "Cargando relaciones semánticas…",
    error: "No se pudieron cargar las relaciones semánticas.",
    retry: "Reintentar",
    parent: "Padre",
    parentDescription: "Padre estructural directo del objeto de observación actual.",
    children: "Hijos",
    childrenDescription: "Objetos estructurales hijos directos del objeto actual.",
    siblings: "Vecinos",
    siblingsDescription: "Objetos con el mismo padre estructural directo.",
    semanticRelations: "Relaciones semánticas",
    semanticRelationsDescription: "Relaciones de significado tipadas que no modifican el árbol estructural.",
    noItems: "Todavía no hay objetos relacionados.",
    more: "más",
    expand: "Ampliar zona",
    openSeparate: "Abrir por separado",
    close: "Cerrar",
    search: "Buscar dentro de esta zona",
    autoScale: "Densidad automática",
    fixedSize: "Tamaño fijo",
    densityHint: "La densidad automática compacta solo la zona saturada. El tamaño fijo mantiene tarjetas legibles y añade desplazamiento.",
    addRelation: "Añadir relación",
    createObject: "Crear objeto de observación",
    addIntermediate: "Añadir intermedio",
    addLeaf: "Añadir hoja",
    openObject: "Abrir objeto",
    relationManagement: "Gestionar relaciones semánticas",
  },
  cs: {
    title: "Mapa vztahů objektu pozorování",
    description: "Aktuální objekt zůstává uprostřed. Strukturální a významové vztahy jsou seskupeny do samostatných zón. Přeplněná zóna se zhutní, ale text neklesne pod čitelnou minimální velikost.",
    loading: "Načítání sémantických vztahů…",
    error: "Sémantické vztahy se nepodařilo načíst.",
    retry: "Opakovat",
    parent: "Rodič",
    parentDescription: "Přímý strukturální rodič aktuálního objektu pozorování.",
    children: "Děti",
    childrenDescription: "Přímé strukturální potomky aktuálního objektu pozorování.",
    siblings: "Sousedé",
    siblingsDescription: "Objekty se stejným přímým strukturálním rodičem.",
    semanticRelations: "Sémantické vztahy",
    semanticRelationsDescription: "Typované významové vztahy, které nemění strukturální strom.",
    noItems: "Zatím žádné propojené objekty.",
    more: "další",
    expand: "Rozbalit zónu",
    openSeparate: "Otevřít samostatně",
    close: "Zavřít",
    search: "Hledat v této zóně",
    autoScale: "Automatická hustota",
    fixedSize: "Pevná velikost karet",
    densityHint: "Automatická hustota mění jen přeplněnou zónu. Pevná velikost zachová čitelnost a přidá posouvání.",
    addRelation: "Přidat vztah",
    createObject: "Vytvořit objekt pozorování",
    addIntermediate: "Přidat mezilehlý",
    addLeaf: "Přidat list",
    openObject: "Otevřít objekt",
    relationManagement: "Správa sémantických vztahů",
  },
};

const PRIMARY_PLANE_LABELS: Record<string, Record<LocaleCode, string>> = {
  systems_structures: {
    ru: "Системы и структуры", en: "Systems and Structures", pl: "Systemy i struktury",
    uk: "Системи та структури", de: "Systeme und Strukturen", es: "Sistemas y estructuras", cs: "Systémy a struktury",
  },
  states_needs: {
    ru: "Состояния и потребности", en: "States and Needs", pl: "Stany i potrzeby",
    uk: "Стани та потреби", de: "Zustände und Bedürfnisse", es: "Estados y necesidades", cs: "Stavy a potřeby",
  },
  actions_processes: {
    ru: "Действия и процессы", en: "Actions and Processes", pl: "Działania i procesy",
    uk: "Дії та процеси", de: "Handlungen und Prozesse", es: "Acciones y procesos", cs: "Akce a procesy",
  },
};

const PRIMARY_PLANE_DESCRIPTION: Record<LocaleCode, string> = {
  ru: "Связи текущего ОН с параллельной основной веткой модели.",
  en: "Links between the current observation object and the parallel primary model branch.",
  pl: "Relacje bieżącego obiektu obserwacji z równoległą główną gałęzią modelu.",
  uk: "Зв’язки поточного об’єкта спостереження з паралельною основною гілкою моделі.",
  de: "Beziehungen des aktuellen Beobachtungsobjekts zum parallelen Hauptzweig des Modells.",
  es: "Relaciones del objeto de observación actual con la rama principal paralela del modelo.",
  cs: "Vztahy aktuálního objektu pozorování s paralelní hlavní větví modelu.",
};

const REVIEW_LABELS: Record<LocaleCode, Record<ReviewCode, string>> = {
  ru: { reviewed: "Проверено", unreviewed: "Не проверено", stale: "Нужно перепроверить", not_applicable: "Не применяется", model_gap: "Пробел модели" },
  en: { reviewed: "Reviewed", unreviewed: "Not reviewed", stale: "Review again", not_applicable: "Not applicable", model_gap: "Model gap" },
  pl: { reviewed: "Sprawdzono", unreviewed: "Nie sprawdzono", stale: "Sprawdź ponownie", not_applicable: "Nie dotyczy", model_gap: "Luka modelu" },
  uk: { reviewed: "Перевірено", unreviewed: "Не перевірено", stale: "Потрібно перевірити знову", not_applicable: "Не застосовується", model_gap: "Прогалина моделі" },
  de: { reviewed: "Geprüft", unreviewed: "Nicht geprüft", stale: "Erneut prüfen", not_applicable: "Nicht anwendbar", model_gap: "Modelllücke" },
  es: { reviewed: "Revisado", unreviewed: "No revisado", stale: "Revisar de nuevo", not_applicable: "No aplica", model_gap: "Vacío del modelo" },
  cs: { reviewed: "Zkontrolováno", unreviewed: "Nezkontrolováno", stale: "Zkontrolovat znovu", not_applicable: "Nepoužije se", model_gap: "Mezera modelu" },
};

type BlockCopy = {
  levels: Record<DetailLevel, string>;
  fullMap: string;
  openBlock: string;
  attention: string;
  overdue: string;
  reviewed: string;
  notApplicable: string;
  modelGap: string;
  groups: Record<
    SemanticBlockKey,
    {
      title: string;
      description: string;
    }
  >;
};

const BLOCK_COPY: Record<LocaleCode, BlockCopy> = {
  en: {
    levels: { overview: "Overview", work: "Work", detailed: "Detailed" },
    fullMap: "Full map",
    openBlock: "Open block",
    attention: "Needs attention",
    overdue: "Review again",
    reviewed: "Reviewed",
    notApplicable: "Not applicable",
    modelGap: "Model gap",
    groups: {
      structure: {
        title: "Structure",
        description: "Parent, children and structural neighbours.",
      },
      correspondence: {
        title: "Correspondence and subject",
        description: "Related objects and objects describing the same subject.",
      },
      dependency_support: {
        title: "Dependency and support",
        description: "Dependencies, prerequisites and support in both directions.",
      },
      influence_conflict: {
        title: "Influence and conflict",
        description: "Influence, experienced influence and conflicts.",
      },
      cross_plane: {
        title: "Other primary branches",
        description: "Coverage of the two parallel primary branches of the model.",
      },
      other: {
        title: "Other semantic links",
        description: "Other active semantic relation types.",
      },
    },
  },
  pl: {
    levels: { overview: "Przegląd", work: "Roboczy", detailed: "Szczegółowy" },
    fullMap: "Pełna mapa",
    openBlock: "Otwórz blok",
    attention: "Wymaga uwagi",
    overdue: "Sprawdź ponownie",
    reviewed: "Sprawdzono",
    notApplicable: "Nie dotyczy",
    modelGap: "Luka modelu",
    groups: {
      structure: {
        title: "Struktura",
        description: "Rodzic, dzieci i sąsiedzi strukturalni.",
      },
      correspondence: {
        title: "Powiązanie i ten sam przedmiot",
        description: "Obiekty powiązane i opisujące ten sam przedmiot obserwacji.",
      },
      dependency_support: {
        title: "Zależność i wsparcie",
        description: "Zależności, warunki konieczne i wsparcie w obu kierunkach.",
      },
      influence_conflict: {
        title: "Wpływ i konflikt",
        description: "Wpływ, doświadczany wpływ i konflikty.",
      },
      cross_plane: {
        title: "Inne główne gałęzie",
        description: "Pokrycie dwóch równoległych głównych gałęzi modelu.",
      },
      other: {
        title: "Inne relacje semantyczne",
        description: "Pozostałe aktywne typy relacji semantycznych.",
      },
    },
  },
  ru: {
    levels: { overview: "Обзор", work: "Рабочий", detailed: "Подробный" },
    fullMap: "Полная карта",
    openBlock: "Открыть блок",
    attention: "Требуют внимания",
    overdue: "Перепроверить",
    reviewed: "Проверено",
    notApplicable: "Не применяется",
    modelGap: "Пробел модели",
    groups: {
      structure: {
        title: "Структура",
        description: "Родитель, дети и структурные соседи.",
      },
      correspondence: {
        title: "Соответствие и общий предмет",
        description: "Связанные ОН и объекты, описывающие тот же предмет наблюдения.",
      },
      dependency_support: {
        title: "Зависимость и поддержка",
        description: "Зависимости, необходимые условия и поддержка в обоих направлениях.",
      },
      influence_conflict: {
        title: "Влияние и конфликт",
        description: "Влияние, испытываемое влияние и конфликты.",
      },
      cross_plane: {
        title: "Другие основные ветви",
        description: "Покрытие двух параллельных основных ветвей модели.",
      },
      other: {
        title: "Другие смысловые связи",
        description: "Остальные действующие виды смысловых связей.",
      },
    },
  },
  uk: {
    levels: { overview: "Огляд", work: "Робочий", detailed: "Докладний" },
    fullMap: "Повна карта",
    openBlock: "Відкрити блок",
    attention: "Потребують уваги",
    overdue: "Перевірити знову",
    reviewed: "Перевірено",
    notApplicable: "Не застосовується",
    modelGap: "Прогалина моделі",
    groups: {
      structure: {
        title: "Структура",
        description: "Батьківський об’єкт, дочірні об’єкти та структурні сусіди.",
      },
      correspondence: {
        title: "Відповідність і спільний предмет",
        description: "Пов’язані об’єкти та об’єкти, що описують той самий предмет спостереження.",
      },
      dependency_support: {
        title: "Залежність і підтримка",
        description: "Залежності, необхідні умови та підтримка в обох напрямках.",
      },
      influence_conflict: {
        title: "Вплив і конфлікт",
        description: "Вплив, отримуваний вплив і конфлікти.",
      },
      cross_plane: {
        title: "Інші основні гілки",
        description: "Покриття двох паралельних основних гілок моделі.",
      },
      other: {
        title: "Інші смислові зв’язки",
        description: "Інші активні типи смислових зв’язків.",
      },
    },
  },
  de: {
    levels: { overview: "Übersicht", work: "Arbeitsansicht", detailed: "Detailliert" },
    fullMap: "Gesamtkarte",
    openBlock: "Block öffnen",
    attention: "Aufmerksamkeit nötig",
    overdue: "Erneut prüfen",
    reviewed: "Geprüft",
    notApplicable: "Nicht anwendbar",
    modelGap: "Modelllücke",
    groups: {
      structure: {
        title: "Struktur",
        description: "Elternobjekt, Kinder und strukturelle Nachbarn.",
      },
      correspondence: {
        title: "Zuordnung und gleicher Gegenstand",
        description: "Verknüpfte Objekte und Objekte mit demselben Beobachtungsgegenstand.",
      },
      dependency_support: {
        title: "Abhängigkeit und Unterstützung",
        description: "Abhängigkeiten, Voraussetzungen und Unterstützung in beide Richtungen.",
      },
      influence_conflict: {
        title: "Einfluss und Konflikt",
        description: "Einfluss, empfangener Einfluss und Konflikte.",
      },
      cross_plane: {
        title: "Andere Hauptzweige",
        description: "Abdeckung der beiden parallelen Hauptzweige des Modells.",
      },
      other: {
        title: "Andere semantische Beziehungen",
        description: "Weitere aktive semantische Beziehungstypen.",
      },
    },
  },
  es: {
    levels: { overview: "Resumen", work: "Trabajo", detailed: "Detallado" },
    fullMap: "Mapa completo",
    openBlock: "Abrir bloque",
    attention: "Requiere atención",
    overdue: "Revisar de nuevo",
    reviewed: "Revisado",
    notApplicable: "No aplica",
    modelGap: "Vacío del modelo",
    groups: {
      structure: {
        title: "Estructura",
        description: "Padre, hijos y vecinos estructurales.",
      },
      correspondence: {
        title: "Correspondencia y mismo sujeto",
        description: "Objetos relacionados y objetos que describen el mismo sujeto.",
      },
      dependency_support: {
        title: "Dependencia y apoyo",
        description: "Dependencias, requisitos y apoyo en ambas direcciones.",
      },
      influence_conflict: {
        title: "Influencia y conflicto",
        description: "Influencia, influencia recibida y conflictos.",
      },
      cross_plane: {
        title: "Otras ramas principales",
        description: "Cobertura de las dos ramas principales paralelas del modelo.",
      },
      other: {
        title: "Otras relaciones semánticas",
        description: "Otros tipos activos de relaciones semánticas.",
      },
    },
  },
  cs: {
    levels: { overview: "Přehled", work: "Pracovní", detailed: "Podrobný" },
    fullMap: "Úplná mapa",
    openBlock: "Otevřít blok",
    attention: "Vyžaduje pozornost",
    overdue: "Zkontrolovat znovu",
    reviewed: "Zkontrolováno",
    notApplicable: "Nepoužije se",
    modelGap: "Mezera modelu",
    groups: {
      structure: {
        title: "Struktura",
        description: "Rodič, děti a strukturální sousedé.",
      },
      correspondence: {
        title: "Souvislost a stejný předmět",
        description: "Související objekty a objekty popisující stejný předmět pozorování.",
      },
      dependency_support: {
        title: "Závislost a podpora",
        description: "Závislosti, předpoklady a podpora v obou směrech.",
      },
      influence_conflict: {
        title: "Vliv a konflikt",
        description: "Vliv, přijímaný vliv a konflikty.",
      },
      cross_plane: {
        title: "Jiné hlavní větve",
        description: "Pokrytí dvou paralelních hlavních větví modelu.",
      },
      other: {
        title: "Další sémantické vztahy",
        description: "Ostatní aktivní typy sémantických vztahů.",
      },
    },
  },
};

const DETAILED_MAP_LABELS: Record<LocaleCode, string> = {
  ru: "Подробная карта связей",
  en: "Detailed relationship map",
  pl: "Szczegółowa mapa relacji",
  uk: "Докладна карта зв’язків",
  de: "Detaillierte Beziehungskarte",
  es: "Mapa detallado de relaciones",
  cs: "Podrobná mapa vztahů",
};

const BACK_TO_FULL_MAP_LABELS: Record<LocaleCode, string> = {
  ru: "Вернуться к полной карте",
  en: "Back to full map",
  pl: "Wróć do pełnej mapy",
  uk: "Повернутися до повної карти",
  de: "Zurück zur Gesamtkarte",
  es: "Volver al mapa completo",
  cs: "Zpět na úplnou mapu",
};

const MORE_ACTIONS_LABELS: Record<LocaleCode, string> = {
  ru: "Дополнительные действия",
  en: "More actions",
  pl: "Więcej działań",
  uk: "Додаткові дії",
  de: "Weitere Aktionen",
  es: "Más acciones",
  cs: "Další akce",
};

const BLOCK_ORDER: readonly SemanticBlockKey[] = [
  "structure",
  "correspondence",
  "dependency_support",
  "influence_conflict",
  "cross_plane",
  "other",
];

const BLOCK_PALETTE_INDEX: Record<SemanticBlockKey, number> = {
  structure: 0,
  correspondence: 4,
  dependency_support: 5,
  influence_conflict: 7,
  cross_plane: 2,
  other: 6,
};

const BLOCK_POSITIONS: Record<SemanticBlockKey, { x: number; y: number }> = {
  structure: { x: 520, y: 20 },
  correspondence: { x: 60, y: 210 },
  dependency_support: { x: 60, y: 520 },
  influence_conflict: { x: 1010, y: 520 },
  cross_plane: { x: 1010, y: 210 },
  other: { x: 520, y: 760 },
};

function summarizeReview(zones: RelationshipZone[]): ReviewSummary {
  const summary: ReviewSummary = {
    reviewed: 0,
    unreviewed: 0,
    stale: 0,
    not_applicable: 0,
    model_gap: 0,
  };

  for (const zone of zones) {
    if (zone.reviewCode) {
      summary[zone.reviewCode] += 1;
    }
  }

  return summary;
}

function dominantReviewCode(summary: ReviewSummary): ReviewCode | null {
  if (summary.model_gap > 0) return "model_gap";
  if (summary.unreviewed > 0) return "unreviewed";
  if (summary.stale > 0) return "stale";
  if (summary.reviewed > 0) return "reviewed";
  if (summary.not_applicable > 0) return "not_applicable";
  return null;
}

function relationCodeFromZone(zone: RelationshipZone) {
  const zoneKey = zone.coverageZoneKey ?? "";
  if (!zoneKey.startsWith("relation:")) return null;
  return zoneKey.split(":")[1] ?? null;
}

function blockKeyForZone(zone: RelationshipZone): SemanticBlockKey {
  if (zone.kind === "structural") return "structure";
  if (zone.kind === "cross_plane") return "cross_plane";

  const relationCode = relationCodeFromZone(zone);

  if (relationCode === "related_to" || relationCode === "same_subject_as") {
    return "correspondence";
  }

  if (relationCode === "supports" || relationCode === "depends_on") {
    return "dependency_support";
  }

  if (relationCode === "influences" || relationCode === "conflicts_with") {
    return "influence_conflict";
  }

  return "other";
}

function reviewVisual(code: ReviewCode) {
  if (code === "reviewed") return { strip: "bg-emerald-400", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", ring: "ring-1 ring-emerald-300/60" };
  if (code === "stale") return { strip: "bg-amber-400", dot: "bg-amber-400", badge: "border-amber-200 bg-amber-50 text-amber-800", ring: "ring-1 ring-amber-300/60" };
  if (code === "not_applicable") return { strip: "bg-slate-400", dot: "bg-slate-400", badge: "border-slate-200 bg-slate-50 text-slate-600", ring: "ring-1 ring-slate-300/50" };
  if (code === "model_gap") return { strip: "bg-rose-600", dot: "bg-rose-600", badge: "border-rose-300 bg-rose-50 text-rose-800", ring: "ring-2 ring-rose-400/70" };
  return { strip: "bg-rose-400", dot: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700", ring: "ring-1 ring-rose-300/60" };
}

const PALETTES = [
  { border: "border-amber-200", background: "bg-amber-50/95", accent: "text-amber-800", card: "border-amber-100 bg-white" },
  { border: "border-emerald-200", background: "bg-emerald-50/95", accent: "text-emerald-800", card: "border-emerald-100 bg-white" },
  { border: "border-sky-200", background: "bg-sky-50/95", accent: "text-sky-800", card: "border-sky-100 bg-white" },
  { border: "border-violet-200", background: "bg-violet-50/95", accent: "text-violet-800", card: "border-violet-100 bg-white" },
  { border: "border-rose-200", background: "bg-rose-50/95", accent: "text-rose-800", card: "border-rose-100 bg-white" },
  { border: "border-indigo-200", background: "bg-indigo-50/95", accent: "text-indigo-800", card: "border-indigo-100 bg-white" },
  { border: "border-cyan-200", background: "bg-cyan-50/95", accent: "text-cyan-800", card: "border-cyan-100 bg-white" },
  { border: "border-orange-200", background: "bg-orange-50/95", accent: "text-orange-800", card: "border-orange-100 bg-white" },
] as const;

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  return locale === "en" ? pathname : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function resolveDensity(count: number, autoDensity: boolean): Density {
  if (!autoDensity) return "fixed";
  if (count <= 4) return "normal";
  if (count <= 9) return "compact";
  return "dense";
}

function visibleLimit(density: Density) {
  if (density === "normal") return 4;
  if (density === "compact") return 7;
  if (density === "dense") return 9;
  return Number.POSITIVE_INFINITY;
}

function toRelatedObject(candidate: ValueObjectRelationCandidateDto): RelatedObject {
  return {
    id: candidate.id,
    title: candidate.title,
    nodeRoleCode: candidate.nodeRoleCode,
  };
}

function candidateToCard(candidate: RelatedObject, locale: LocaleCode): RelationCard {
  return {
    id: candidate.id,
    title: candidate.title,
    href: buildLocaleHref(`/value-objects/${candidate.id}`, locale),
    detail: candidate.nodeRoleCode ?? undefined,
  };
}

type CenterData = Record<string, unknown> & {
  title: string;
};
type CenterFlowNode = Node<CenterData, "center">;

function CenterNode({ data }: NodeProps<CenterFlowNode>) {
  return (
    <div className="min-w-[230px] max-w-[280px] rounded-[24px] border-2 border-[#3b6ef8] bg-white px-5 py-4 text-center shadow-lg">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-[#3b6ef8]" />
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">ОН</div>
      <div className="mt-1 text-[15px] font-bold leading-5 text-[#111827]">{data.title}</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-[#3b6ef8]" />
    </div>
  );
}

type ZoneData = Record<string, unknown> & {
  zone: RelationshipZone;
  locale: LocaleCode;
  copy: Copy;
  autoDensity: boolean;
  onExpand: (zoneKey: string) => void;
};
type ZoneFlowNode = Node<ZoneData, "zone">;

function ZoneNode({ data }: NodeProps<ZoneFlowNode>) {
  const { zone, locale, copy, autoDensity, onExpand } = data;
  const palette = PALETTES[zone.paletteIndex % PALETTES.length];
  const status = zone.reviewCode ? reviewVisual(zone.reviewCode) : null;
  const density = resolveDensity(zone.cards.length, autoDensity);
  const limit = visibleLimit(density);
  const shown = density === "fixed" ? zone.cards : zone.cards.slice(0, limit);
  const hiddenCount = Math.max(0, zone.cards.length - shown.length);
  const textSize = density === "normal" || density === "fixed"
    ? "text-[13px]"
    : density === "compact"
      ? "text-[12px]"
      : "text-[11px]";
  const padding = density === "normal" || density === "fixed"
    ? "px-3 py-2.5"
    : density === "compact"
      ? "px-2.5 py-2"
      : "px-2 py-1.5";

  return (
    <div className={`relative w-[300px] overflow-hidden rounded-[22px] border ${palette.border} ${palette.background} p-3.5 shadow-md ${status?.ring ?? ""}`}>
      {status ? <div className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${status.strip}`} aria-hidden="true" /> : null}
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-400" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-[12px] font-bold uppercase tracking-[0.08em] ${palette.accent}`}>
            {zone.title} · {zone.cards.length}
          </div>
          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{zone.description}</div>
        </div>
        <button
          type="button"
          className="nodrag nopan shrink-0 rounded-lg border border-black/10 bg-white p-1.5 text-slate-600 shadow-sm hover:bg-slate-50"
          title={copy.expand}
          aria-label={copy.expand}
          onClick={() => onExpand(zone.key)}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <div className={`nowheel nopan mt-3 grid gap-1.5 ${density === "fixed" ? "max-h-[245px] overflow-y-auto pr-1" : ""}`}>
        {shown.length === 0 ? (
          <button
            type="button"
            className="nodrag nopan rounded-xl border border-dashed border-black/10 bg-white/70 px-3 py-3 text-left text-[11px] font-medium text-slate-500"
            onClick={() => onExpand(zone.key)}
          >
            {copy.noItems}
          </button>
        ) : (
          shown.map((card) => (
            <Link
              prefetch={false}
              key={card.id}
              href={card.href}
              className={`nodrag nopan flex items-center justify-between gap-2 rounded-xl border ${palette.card} ${padding} ${textSize} font-semibold leading-4 text-slate-800 shadow-sm transition hover:-translate-y-px hover:shadow`}
            >
              <span className="min-w-0 break-words">{card.title}</span>
              <ExternalLink size={12} className="shrink-0 text-slate-400" />
            </Link>
          ))
        )}

        {hiddenCount > 0 ? (
          <button
            type="button"
            className="nodrag nopan rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
            onClick={() => onExpand(zone.key)}
          >
            + {hiddenCount} {copy.more}
          </button>
        ) : null}
      </div>
      {status && zone.reviewCode ? (
        <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] ${status.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {REVIEW_LABELS[locale][zone.reviewCode]}
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-400" />
    </div>
  );
}

type BlockData = Record<string, unknown> & {
  block: SemanticBlock;
  locale: LocaleCode;
  detailLevel: "overview" | "work";
  onOpenBlock: (blockKey: SemanticBlockKey) => void;
  onOpenZone: (zoneKey: string) => void;
};
type BlockFlowNode = Node<BlockData, "block">;

function BlockNode({ data }: NodeProps<BlockFlowNode>) {
  const { block, locale, detailLevel, onOpenBlock, onOpenZone } = data;
  const palette = PALETTES[block.paletteIndex % PALETTES.length];
  const dominant = block.dominantReviewCode
    ? reviewVisual(block.dominantReviewCode)
    : null;
  const counters: Array<{ code: ReviewCode; count: number }> = [
    { code: "model_gap", count: block.summary.model_gap },
    { code: "unreviewed", count: block.summary.unreviewed },
    { code: "stale", count: block.summary.stale },
    { code: "reviewed", count: block.summary.reviewed },
    { code: "not_applicable", count: block.summary.not_applicable },
  ];

  return (
    <div
      className={`nodrag nopan relative w-[340px] cursor-pointer overflow-hidden rounded-[24px] border ${palette.border} ${palette.background} p-4 shadow-md transition hover:-translate-y-px hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#9db3ff] ${dominant?.ring ?? ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${BLOCK_COPY[locale].openBlock}: ${block.title}`}
      onClick={() => onOpenBlock(block.key)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenBlock(block.key);
        }
      }}
    >
      {dominant ? (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[4px] ${dominant.strip}`}
          aria-hidden="true"
        />
      ) : null}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-slate-400"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[13px] font-bold uppercase tracking-[0.08em] ${palette.accent}`}>
            {block.title}
          </div>
          <div
            className={`mt-1 text-[10px] leading-4 text-slate-500 ${
              detailLevel === "overview" ? "line-clamp-1" : "line-clamp-2"
            }`}
          >
            {block.description}
          </div>
        </div>
        <span
          className="shrink-0 rounded-lg border border-black/10 bg-white p-1.5 text-slate-500 shadow-sm"
          aria-hidden="true"
        >
          <Maximize2 size={14} />
        </span>
      </div>

      {counters.some((item) => item.count > 0) ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {counters
            .filter((item) => item.count > 0)
            .map((item) => {
              const visual = reviewVisual(item.code);
              return (
                <span
                  key={item.code}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${visual.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} />
                  {item.count}
                </span>
              );
            })}
        </div>
      ) : null}

      <div className="mt-3 grid gap-1.5">
        {block.zones.map((zone) => {
          const status = zone.reviewCode ? reviewVisual(zone.reviewCode) : null;
          return (
            <button
              key={zone.key}
              type="button"
              className="nodrag nopan flex w-full items-center gap-2 rounded-xl border border-black/[0.07] bg-white/90 px-2.5 py-2 text-left shadow-sm transition hover:-translate-y-px hover:shadow"
              onClick={(event) => {
                event.stopPropagation();
                onOpenZone(zone.key);
              }}
            >
              {status ? (
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
              )}
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-700">
                {zone.title}
              </span>
              <span className="shrink-0 text-[10px] font-bold text-slate-500">
                {zone.cards.length}
              </span>
              {detailLevel === "work" && zone.reviewCode ? (
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${status?.badge ?? ""}`}>
                  {REVIEW_LABELS[locale][zone.reviewCode]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-slate-400"
      />
    </div>
  );
}

const NODE_TYPES = {
  center: CenterNode,
  zone: ZoneNode,
  block: BlockNode,
};

function zonePosition(index: number, total: number) {
  const perRing = 8;
  const ring = Math.floor(index / perRing);
  const firstIndex = ring * perRing;
  const countOnRing = Math.min(perRing, total - firstIndex);
  const indexOnRing = index - firstIndex;
  const angle = -Math.PI / 2 + (Math.PI * 2 * indexOnRing) / Math.max(countOnRing, 1);
  const radiusX = 520 + ring * 370;
  const radiusY = 350 + ring * 280;
  const centerX = 650;
  const centerY = 460;

  return {
    x: centerX + Math.cos(angle) * radiusX - 150,
    y: centerY + Math.sin(angle) * radiusY - 115,
  };
}

function relationTypeFallback(relation: ValueObjectSemanticRelationDto): ValueObjectRelationTypeDto {
  return {
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
}

function RelationshipMapInner({
  valueObjectId,
  title,
  locale,
  parentObject,
  siblingObjects,
  childObjects,
  canCreateChildren,
  canCreateLeaf,
  canManageRelations,
}: Props) {
  const copy = COPY[locale];
  const searchParams = useSearchParams();
  const [relationData, setRelationData] = useState<ValueObjectSemanticRelationListResponse>();
  const [coverageData, setCoverageData] = useState<CoverageSnapshot | null>(null);
  const [coverageAvailable, setCoverageAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoDensity, setAutoDensity] = useState(true);
  const [showDetailedMap, setShowDetailedMap] = useState(false);
  const [expandedZoneOverride, setExpandedZoneOverride] = useState<string | null | undefined>(undefined);
  const [expandedBlockOverride, setExpandedBlockOverride] = useState<string | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const requestedZoneKey = searchParams.get("relationsZone");
  const requestedBlockKey = searchParams.get("relationsBlock");
  const expandedZoneKey = expandedZoneOverride === undefined ? requestedZoneKey : expandedZoneOverride;
  const expandedBlockKey = expandedZoneKey
    ? null
    : expandedBlockOverride === undefined
      ? requestedBlockKey
      : expandedBlockOverride;

  const fetchRelations = useCallback(async () => {
    const response = await fetch(
      `/api/value-objects/${encodeURIComponent(valueObjectId)}/relations?locale=${encodeURIComponent(locale)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    const payload = (await response.json()) as ValueObjectSemanticRelationListResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, [locale, valueObjectId]);

  useEffect(() => {
    let cancelled = false;

    void fetchRelations()
      .then((payload) => {
        if (cancelled) return;
        setRelationData(payload);
        setErrorMessage("");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : copy.error);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.error, fetchRelations]);

  const fetchCoverage = useCallback(async () => {
    if (!canManageRelations) {
      setCoverageData(null);
      setCoverageAvailable(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/relationship-coverage?locale=${encodeURIComponent(locale)}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (response.status === 401 || response.status === 403 || response.status === 409) {
        setCoverageData(null);
        setCoverageAvailable(false);
        return;
      }

      const payload = (await response.json()) as CoverageSnapshot & { error?: string };
      if (!response.ok || !payload.ok) {
        setCoverageData(null);
        setCoverageAvailable(false);
        return;
      }

      setCoverageData(payload);
      setCoverageAvailable(true);
    } catch {
      setCoverageData(null);
      setCoverageAvailable(false);
    }
  }, [canManageRelations, locale, valueObjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCoverage();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCoverage]);

  const retryRelations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const payload = await fetchRelations();
      setRelationData(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.error);
    } finally {
      setLoading(false);
    }
  }, [copy.error, fetchRelations]);

  const expandZone = useCallback((zoneKey: string) => {
    setSearch("");
    setExpandedBlockOverride(null);
    setExpandedZoneOverride(zoneKey);
  }, []);

  const openBlock = useCallback((blockKey: SemanticBlockKey) => {
    setSearch("");
    setExpandedZoneOverride(null);
    setExpandedBlockOverride(blockKey);
  }, []);

  const zones = useMemo<RelationshipZone[]>(() => {
    const structural: RelationshipZone[] = [
      {
        key: "structure:parent",
        title: copy.parent,
        description: copy.parentDescription,
        kind: "structural",
        cards: parentObject ? [candidateToCard(parentObject, locale)] : [],
        paletteIndex: 0,
      },
      {
        key: "structure:children",
        title: copy.children,
        description: copy.childrenDescription,
        kind: "structural",
        cards: childObjects.map((item) => candidateToCard(item, locale)),
        paletteIndex: 1,
      },
      {
        key: "structure:siblings",
        title: copy.siblings,
        description: copy.siblingsDescription,
        kind: "structural",
        cards: siblingObjects.map((item) => candidateToCard(item, locale)),
        paletteIndex: 2,
      },
    ];

    const relationTypesByCode = new Map(
      (relationData?.relationTypes ?? []).map((item) => [item.relationTypeCode, item] as const),
    );
    const grouped = new Map<
      string,
      { title: string; description: string; order: number; cards: RelationCard[] }
    >();

    for (const relationType of relationData?.relationTypes ?? []) {
      if (relationType.status !== "active") continue;
      const perspectives =
        relationType.directionalityCode === "symmetric"
          ? (["symmetric"] as const)
          : (["outgoing", "incoming"] as const);

      for (const perspective of perspectives) {
        const key = `semantic:${relationType.relationTypeCode}:${perspective}`;
        grouped.set(key, {
          title: resolveSemanticRelationTitle(relationType, locale, perspective),
          description: resolveSemanticRelationDescription(relationType, locale, perspective),
          order: relationType.displayOrder,
          cards: [],
        });
      }
    }

    for (const relation of relationData?.relations ?? []) {
      if (relation.status !== "active") continue;
      const relationType =
        relationTypesByCode.get(relation.relationTypeCode) ?? relationTypeFallback(relation);
      const key = `semantic:${relation.relationTypeCode}:${relation.perspective}`;
      const current = grouped.get(key) ?? {
        title: resolveSemanticRelationTitle(relationType, locale, relation.perspective),
        description: resolveSemanticRelationDescription(relationType, locale, relation.perspective),
        order: relationType.displayOrder,
        cards: [],
      };
      if (!current.cards.some((card) => card.id === relation.relatedValueObject.id)) {
        current.cards.push(candidateToCard(toRelatedObject(relation.relatedValueObject), locale));
      }
      grouped.set(key, current);
    }

    const coverageRelationMap = new Map(
      (coverageData?.relationZones ?? []).map((zone) => [zone.zoneKey, zone] as const),
    );

    const semantic: RelationshipZone[] = [...grouped.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[1].title.localeCompare(b[1].title))
      .map(([key, group], index) => {
        const coverageZoneKey = key.replace(/^semantic:/, "relation:");
        const coverageZone = coverageRelationMap.get(coverageZoneKey);
        const cards = coverageZone
          ? coverageZone.links.map((link) => ({
              id: link.id,
              title: link.title,
              href: buildLocaleHref(`/value-objects/${link.id}`, locale),
              detail: link.nodeRoleCode ?? undefined,
            }))
          : group.cards;

        return {
          key,
          title: group.title,
          description: group.description,
          kind: "semantic" as const,
          cards,
          paletteIndex: 3 + index,
          coverageZoneKey,
          reviewCode: coverageAvailable ? coverageZone?.review.code ?? "unreviewed" : undefined,
          reviewedAt: coverageZone?.review.reviewedAt ?? null,
        };
      });

    if (semantic.length === 0) {
      semantic.push({
        key: "semantic:empty",
        title: copy.semanticRelations,
        description: copy.semanticRelationsDescription,
        kind: "semantic",
        cards: [],
        paletteIndex: 3,
      });
    }

    const crossPlane: RelationshipZone[] = coverageAvailable
      ? (coverageData?.crossPlaneZones ?? []).map((zone, index) => ({
          key: `cross-plane:${zone.plane}`,
          title: PRIMARY_PLANE_LABELS[zone.plane]?.[locale] ?? zone.plane,
          description: PRIMARY_PLANE_DESCRIPTION[locale],
          kind: "cross_plane",
          cards: zone.links.map((link) => ({
            id: link.id,
            title: link.title,
            href: buildLocaleHref(`/value-objects/${link.id}`, locale),
            detail: link.relationTypeCode ?? link.nodeRoleCode ?? undefined,
          })),
          paletteIndex: 3 + semantic.length + index,
          coverageZoneKey: zone.zoneKey,
          reviewCode: zone.review.code,
          reviewedAt: zone.review.reviewedAt,
        }))
      : [];

    return [...structural, ...crossPlane, ...semantic];
  }, [
    childObjects,
    copy,
    coverageAvailable,
    coverageData,
    locale,
    parentObject,
    relationData,
    siblingObjects,
  ]);

  const blockCopy = BLOCK_COPY[locale];

  const semanticBlocks = useMemo<SemanticBlock[]>(() => {
    const grouped = new Map<SemanticBlockKey, RelationshipZone[]>();

    for (const key of BLOCK_ORDER) {
      grouped.set(key, []);
    }

    for (const zone of zones) {
      grouped.get(blockKeyForZone(zone))?.push(zone);
    }

    return BLOCK_ORDER.flatMap((key) => {
      const blockZones = grouped.get(key) ?? [];
      if (blockZones.length === 0) return [];

      const summary = summarizeReview(blockZones);
      const groupCopy = blockCopy.groups[key];

      return [
        {
          key,
          title: groupCopy.title,
          description: groupCopy.description,
          zones: blockZones,
          summary,
          dominantReviewCode: dominantReviewCode(summary),
          paletteIndex: BLOCK_PALETTE_INDEX[key],
        },
      ];
    });
  }, [blockCopy, zones]);

  const reviewSummary = useMemo(
    () => summarizeReview(zones.filter((zone) => Boolean(zone.reviewCode))),
    [zones],
  );

  const expandedZone = zones.find((zone) => zone.key === expandedZoneKey) ?? null;
  const expandedBlock =
    semanticBlocks.find((block) => block.key === expandedBlockKey) ?? null;

  const handleCoverageChange = useCallback((snapshot: CoverageSnapshot) => {
    setCoverageData(snapshot);
    setCoverageAvailable(true);
  }, []);

  const nodes = useMemo<Node[]>(() => {
    const center: CenterFlowNode = {
      id: "__center__",
      type: "center",
      position: { x: 585, y: 420 },
      draggable: false,
      selectable: false,
      data: { title },
    };

    if (showDetailedMap) {
      const zoneNodes: ZoneFlowNode[] = zones.map((zone, index) => ({
        id: `zone:${zone.key}`,
        type: "zone",
        position: zonePosition(index, zones.length),
        draggable: true,
        selectable: false,
        data: {
          zone,
          locale,
          copy,
          autoDensity,
          onExpand: expandZone,
        },
      }));

      return [center, ...zoneNodes];
    }

    const blockNodes: BlockFlowNode[] = semanticBlocks.map((block) => ({
      id: `block:${block.key}`,
      type: "block",
      position: BLOCK_POSITIONS[block.key],
      draggable: false,
      selectable: false,
      data: {
        block,
        locale,
        detailLevel: "work",
        onOpenBlock: openBlock,
        onOpenZone: expandZone,
      },
    }));

    return [center, ...blockNodes];
  }, [
    autoDensity,
    copy,
    expandZone,
    locale,
    openBlock,
    semanticBlocks,
    showDetailedMap,
    title,
    zones,
  ]);

  const edges = useMemo<Edge[]>(() => {
    if (showDetailedMap) {
      return zones.map((zone) => ({
        id: `edge:${zone.key}`,
        source: "__center__",
        target: `zone:${zone.key}`,
        type: "smoothstep",
        style: { stroke: "#cbd5e1", strokeWidth: 1.1 },
      }));
    }

    return semanticBlocks.map((block) => ({
      id: `edge:block:${block.key}`,
      source: "__center__",
      target: `block:${block.key}`,
      type: "smoothstep",
      style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
    }));
  }, [semanticBlocks, showDetailedMap, zones]);

  const separateBlockHref = expandedBlock
    ? (() => {
        const query = new URLSearchParams();
        if (locale !== "en") query.set("locale", locale);
        query.set("relationsBlock", expandedBlock.key);
        return `/value-objects/${encodeURIComponent(valueObjectId)}?${query.toString()}`;
      })()
    : "#";

  const separateHref = expandedZone
    ? (() => {
        const query = new URLSearchParams();
        if (locale !== "en") query.set("locale", locale);
        query.set("relationsZone", expandedZone.key);
        return `/value-objects/${encodeURIComponent(valueObjectId)}?${query.toString()}`;
      })()
    : "#";

  const filteredExpandedCards = expandedZone
    ? expandedZone.cards.filter((card) => card.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    : [];

  return (
    <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">
            <Network size={15} />
            {copy.title}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[#6b7280]">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showDetailedMap ? (
            <>
              <button
                type="button"
                onClick={() => setShowDetailedMap(false)}
                className="rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-[11px] font-bold text-[#4b5563] transition hover:bg-slate-50"
              >
                ← {BACK_TO_FULL_MAP_LABELS[locale]}
              </button>
              <button
                type="button"
                onClick={() => setAutoDensity((current) => !current)}
                className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${autoDensity ? "border-[#cbd7ff] bg-[#eef2ff] text-[#3b6ef8]" : "border-[#dfe3ea] bg-white text-[#4b5563]"}`}
                title={copy.densityHint}
              >
                {autoDensity ? copy.autoScale : copy.fixedSize}
              </button>
            </>
          ) : (
            <details className="relative">
              <summary
                className="cursor-pointer list-none rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-[13px] font-bold leading-none text-[#4b5563] transition hover:bg-slate-50"
                title={MORE_ACTIONS_LABELS[locale]}
                aria-label={MORE_ACTIONS_LABELS[locale]}
              >
                ···
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-[230px] rounded-xl border border-[#e5e7eb] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={(event) => {
                    const details = event.currentTarget.closest("details");
                    if (details) details.open = false;
                    setExpandedBlockOverride(null);
                    setShowDetailedMap(true);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-bold text-[#4b5563] hover:bg-slate-50"
                >
                  {DETAILED_MAP_LABELS[locale]}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {coverageAvailable ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {blockCopy.fullMap}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {blockCopy.attention}: {reviewSummary.unreviewed + reviewSummary.model_gap}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {blockCopy.overdue}: {reviewSummary.stale}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {blockCopy.reviewed}: {reviewSummary.reviewed}
          </span>
          {reviewSummary.model_gap > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-900">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-700" />
              {blockCopy.modelGap}: {reviewSummary.model_gap}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {blockCopy.notApplicable}: {reviewSummary.not_applicable}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#dfe3ea] bg-[#f8fafc] px-4 py-5 text-[12px] font-medium text-slate-500">{copy.loading}</div>
      ) : errorMessage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-[12px] text-rose-800">
          <span>{copy.error} {errorMessage}</span>
          <button type="button" onClick={() => void retryRelations()} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-bold">{copy.retry}</button>
        </div>
      ) : (
        <div className="mt-4 h-[760px] min-h-[560px] overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.2, maxZoom: 1.25 }}
            minZoom={0.15}
            maxZoom={2}
            nodesConnectable={false}
            nodesDraggable={showDetailedMap}
            onNodeClick={() => undefined}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}

      {expandedBlock ? (
        <div
          className="fixed inset-0 z-[88] flex items-stretch justify-center bg-black/45 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={expandedBlock.title}
        >
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
                  {blockCopy.fullMap} → {expandedBlock.title}
                </div>
                <h3 className="mt-1 text-[22px] font-bold text-[#111827]">
                  {expandedBlock.title}
                </h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#6b7280]">
                  {expandedBlock.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={separateBlockHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-[12px] font-bold text-[#4b5563] hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> {copy.openSeparate}
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedBlockOverride(null)}
                  className="rounded-xl border border-[#dfe3ea] bg-white p-2 text-[#4b5563] hover:bg-slate-50"
                  title={copy.close}
                  aria-label={copy.close}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {expandedBlock.dominantReviewCode ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {([
                    ["model_gap", expandedBlock.summary.model_gap],
                    ["unreviewed", expandedBlock.summary.unreviewed],
                    ["stale", expandedBlock.summary.stale],
                    ["reviewed", expandedBlock.summary.reviewed],
                    ["not_applicable", expandedBlock.summary.not_applicable],
                  ] as Array<[ReviewCode, number]>)
                    .filter(([, count]) => count > 0)
                    .map(([code, count]) => {
                      const visual = reviewVisual(code);
                      return (
                        <span
                          key={code}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${visual.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} />
                          {REVIEW_LABELS[locale][code]} · {count}
                        </span>
                      );
                    })}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {expandedBlock.zones.map((zone) => {
                  const status = zone.reviewCode ? reviewVisual(zone.reviewCode) : null;
                  return (
                    <button
                      key={zone.key}
                      type="button"
                      onClick={() => expandZone(zone.key)}
                      className={`relative overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white p-4 text-left shadow-sm transition hover:-translate-y-px hover:border-[#bdcaff] hover:shadow ${status?.ring ?? ""}`}
                    >
                      {status ? (
                        <span className={`absolute inset-x-0 top-0 h-[3px] ${status.strip}`} />
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#111827]">
                            {zone.title} · {zone.cards.length}
                          </div>
                          <div className="mt-1 text-[11px] leading-4 text-[#6b7280]">
                            {zone.description}
                          </div>
                        </div>
                        <Maximize2 size={15} className="shrink-0 text-[#3b6ef8]" />
                      </div>
                      {zone.reviewCode && status ? (
                        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${status.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {REVIEW_LABELS[locale][zone.reviewCode]}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {expandedZone ? (
        <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={expandedZone.title}>
          <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">{copy.title}</div>
                <h3 className="mt-1 text-[22px] font-bold text-[#111827]">{expandedZone.title} · {expandedZone.cards.length}</h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#6b7280]">{expandedZone.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={separateHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-[12px] font-bold text-[#4b5563] hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> {copy.openSeparate}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setExpandedZoneOverride(null);
                    void retryRelations();
                    void fetchCoverage();
                  }}
                  className="rounded-xl border border-[#dfe3ea] bg-white p-2 text-[#4b5563] hover:bg-slate-50"
                  title={copy.close}
                  aria-label={copy.close}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-6">
              <div className="min-w-0">
                <label className="relative block">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={copy.search}
                    className="w-full rounded-xl border border-[#dfe3ea] bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#9db3ff]"
                  />
                </label>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredExpandedCards.length === 0 ? (
                    <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[#dfe3ea] bg-[#f8fafc] p-5 text-[13px] text-slate-500">{copy.noItems}</div>
                  ) : (
                    filteredExpandedCards.map((card) => (
                      <Link
                        prefetch={false}
                        key={card.id}
                        href={card.href}
                        className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm transition hover:border-[#bdcaff] hover:bg-[#f8faff]"
                      >
                        <div className="text-[14px] font-bold leading-5 text-[#111827]">{card.title}</div>
                        {card.detail ? <div className="mt-1 text-[11px] font-semibold text-[#7c8099]">{card.detail}</div> : null}
                        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#3b6ef8]">{copy.openObject} <ExternalLink size={11} /></div>
                      </Link>
                    ))
                  )}
                </div>

                {expandedZone.key === "structure:children" && canCreateChildren ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      prefetch={false}
                      href={buildLocaleHref(`/value-objects/${valueObjectId}/new-intermediate`, locale)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-bold text-violet-700 hover:bg-violet-100"
                    >
                      <Plus size={14} /> {copy.addIntermediate}
                    </Link>
                    {canCreateLeaf ? (
                      <Link
                        prefetch={false}
                        href={buildLocaleHref(`/value-objects/${valueObjectId}/new-leaf`, locale)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-3 py-2 text-[12px] font-bold text-[#3b6ef8] hover:bg-[#e8edff]"
                      >
                        <Plus size={14} /> {copy.addLeaf}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className="min-w-0 rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
                {expandedZone.coverageZoneKey && canManageRelations && coverageAvailable ? (
                  <>
                    <div className="mb-3 text-[12px] font-bold text-[#111827]">{copy.relationManagement}</div>
                    <ValueObjectRelationshipCoverageReview
                      valueObjectId={valueObjectId}
                      locale={locale}
                      focusZoneKey={expandedZone.coverageZoneKey}
                      embedded
                      onCoverageChange={handleCoverageChange}
                    />
                  </>
                ) : expandedZone.kind === "semantic" && canManageRelations ? (
                  <>
                    <div className="mb-3 text-[12px] font-bold text-[#111827]">{copy.relationManagement}</div>
                    <ValueObjectSemanticRelationsManager valueObjectId={valueObjectId} locale={locale} />
                    <Link
                      prefetch={false}
                      href={buildLocaleHref("/value-objects/new/root", locale)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-[12px] font-bold text-[#4b5563] hover:bg-slate-50"
                    >
                      <Plus size={14} /> {copy.createObject}
                    </Link>
                  </>
                ) : (
                  <div className="text-[12px] leading-5 text-[#6b7280]">{copy.densityHint}</div>
                )}
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ValueObjectRelationshipMap(props: Props) {
  return (
    <ReactFlowProvider>
      <RelationshipMapInner {...props} />
    </ReactFlowProvider>
  );
}

export const __relationshipMapTesting = {
  resolveDensity,
  visibleLimit,
  zonePosition,
  unifiedInteractiveMap: true,
};
