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
type ZoneKind = "structural" | "semantic";

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
  const { zone, copy, autoDensity, onExpand } = data;
  const palette = PALETTES[zone.paletteIndex % PALETTES.length];
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
    <div className={`w-[300px] rounded-[22px] border ${palette.border} ${palette.background} p-3.5 shadow-md`}>
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
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-400" />
    </div>
  );
}

const NODE_TYPES = {
  center: CenterNode,
  zone: ZoneNode,
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoDensity, setAutoDensity] = useState(true);
  const [expandedZoneOverride, setExpandedZoneOverride] = useState<string | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const requestedZoneKey = searchParams.get("relationsZone");
  const expandedZoneKey = expandedZoneOverride === undefined ? requestedZoneKey : expandedZoneOverride;

  const fetchRelations = useCallback(async () => {
    const response = await fetch(`/api/value-objects/${encodeURIComponent(valueObjectId)}/relations`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json()) as ValueObjectSemanticRelationListResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, [valueObjectId]);

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
    setExpandedZoneOverride(zoneKey);
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
    const grouped = new Map<string, { title: string; description: string; order: number; cards: RelationCard[] }>();

    for (const relation of relationData?.relations ?? []) {
      if (relation.status !== "active") continue;
      const relationType = relationTypesByCode.get(relation.relationTypeCode) ?? relationTypeFallback(relation);
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

    const semantic = [...grouped.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[1].title.localeCompare(b[1].title))
      .map(([key, group], index) => ({
        key,
        title: group.title,
        description: group.description,
        kind: "semantic" as const,
        cards: group.cards,
        paletteIndex: 3 + index,
      }));

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

    return [...structural, ...semantic];
  }, [childObjects, copy, locale, parentObject, relationData, siblingObjects]);

  const expandedZone = zones.find((zone) => zone.key === expandedZoneKey) ?? null;

  const nodes = useMemo<Node[]>(() => {
    const center: CenterFlowNode = {
      id: "__center__",
      type: "center",
      position: { x: 530, y: 410 },
      draggable: false,
      selectable: false,
      data: { title },
    };
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
  }, [autoDensity, copy, expandZone, locale, title, zones]);

  const edges = useMemo<Edge[]>(
    () => zones.map((zone) => ({
      id: `edge:${zone.key}`,
      source: "__center__",
      target: `zone:${zone.key}`,
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.4 },
    })),
    [zones],
  );

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
          <button
            type="button"
            onClick={() => setAutoDensity((current) => !current)}
            className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${autoDensity ? "border-[#cbd7ff] bg-[#eef2ff] text-[#3b6ef8]" : "border-[#dfe3ea] bg-white text-[#4b5563]"}`}
            title={copy.densityHint}
          >
            {autoDensity ? copy.autoScale : copy.fixedSize}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#dfe3ea] bg-[#f8fafc] px-4 py-5 text-[12px] font-medium text-slate-500">{copy.loading}</div>
      ) : errorMessage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-[12px] text-rose-800">
          <span>{copy.error} {errorMessage}</span>
          <button type="button" onClick={() => void retryRelations()} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-bold">{copy.retry}</button>
        </div>
      ) : (
        <div className="mt-4 h-[680px] min-h-[520px] overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.2, maxZoom: 1.25 }}
            minZoom={0.15}
            maxZoom={2}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}

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
                {expandedZone.kind === "semantic" && canManageRelations ? (
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
};
