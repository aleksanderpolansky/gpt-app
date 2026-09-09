"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock3, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ReviewCode = "reviewed" | "unreviewed" | "stale" | "not_applicable" | "model_gap";
type Direction = "symmetric" | "outgoing" | "incoming";

type LinkRow = {
  relationId: string;
  relationTypeCode?: string;
  id: string;
  title: string;
  facetCode: string | null;
  nodeRoleCode: string | null;
  plane: string;
};

type ReviewState = {
  code: ReviewCode;
  label: string;
  reviewedAt: string | null;
  nextReviewAt: string | null;
  outcome: string | null;
};

type RelationZone = {
  zoneKey: string;
  kind: "relation";
  relationTypeCode: string;
  direction: Direction;
  titleKey: string;
  displayOrder: number;
  links: LinkRow[];
  review: ReviewState;
};

type CrossPlaneZone = {
  zoneKey: string;
  kind: "cross_plane";
  plane: "systems_structures" | "states_needs" | "actions_processes";
  displayOrder: number;
  links: LinkRow[];
  review: ReviewState;
};

type CoverageResponse = {
  ok: boolean;
  canReview: boolean;
  relationZones: RelationZone[];
  crossPlaneZones: CrossPlaneZone[];
  counters: Record<ReviewCode | "total", number>;
  candidates: Array<{ id: string; title: string; facetCode: string | null; nodeRoleCode: string | null; plane: string }>;
  reviewPolicy: { staleAfterDays: number };
};

type Props = {
  valueObjectId: string;
  locale: LocaleCode;
};

const RU_RELATIONS: Record<string, string> = {
  related_to: "Связан с",
  same_subject_as: "Тот же предмет наблюдения",
  supports: "Поддерживает",
  "supports:incoming": "Поддерживается",
  depends_on: "Зависит от",
  "depends_on:incoming": "Необходим для",
  conflicts_with: "Конфликтует с",
  influences: "Влияет на",
  "influences:incoming": "Испытывает влияние",
};

const PLANE_LABELS: Record<string, Record<LocaleCode, string>> = {
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

const COPY: Record<LocaleCode, {
  title: string; description: string; loading: string; retry: string; reviewed: string; unreviewed: string;
  stale: string; notApplicable: string; modelGap: string; empty: string; markReviewed: string;
  markEmptyReviewed: string; markNotApplicable: string; markGap: string; lastReview: string; coverage: string;
  relationTypes: string; crossPlanes: string; noAccess: string; add: string; remove: string; chooseObject: string; chooseRelation: string;
}> = {
  ru: {
    title: "Проверка полноты связей",
    description: "Каждая допустимая связь и две другие ветки показаны отдельно. Пустая зона — это не ошибка: важно отличать «не проверено» от осознанного «связи не нужны».",
    loading: "Загружаю состояние проверки…", retry: "Повторить", reviewed: "Проверено", unreviewed: "Не проверено",
    stale: "Нужно перепроверить", notApplicable: "Не применяется", modelGap: "Пробел модели", empty: "Связей нет",
    markReviewed: "Завершить проверку", markEmptyReviewed: "Проверено — связи не нужны", markNotApplicable: "Не применяется",
    markGap: "Отметить пробел модели", lastReview: "Последняя проверка", coverage: "Полнота проверки", relationTypes: "Виды смысловых связей",
    crossPlanes: "Связи между тремя ветками", noAccess: "Блок доступен куратору модели.", add: "Добавить", remove: "Убрать", chooseObject: "Выберите ОН", chooseRelation: "Вид связи",
  },
  en: { title:"Relationship coverage review", description:"Each permitted relation and the two other primary branches are shown separately. Empty does not mean wrong: unreviewed must be different from reviewed with no links required.", loading:"Loading review state…", retry:"Retry", reviewed:"Reviewed", unreviewed:"Not reviewed", stale:"Review again", notApplicable:"Not applicable", modelGap:"Model gap", empty:"No links", markReviewed:"Finish review", markEmptyReviewed:"Reviewed — no links required", markNotApplicable:"Not applicable", markGap:"Mark model gap", lastReview:"Last review", coverage:"Review coverage", relationTypes:"Semantic relation types", crossPlanes:"Links across the three branches", noAccess:"This block is available to the model curator.", add:"Add", remove:"Remove", chooseObject:"Choose object", chooseRelation:"Relation type" },
  pl: { title:"Kontrola kompletności relacji", description:"Każdy dozwolony typ relacji i dwie pozostałe główne gałęzie są pokazane osobno.", loading:"Ładowanie stanu kontroli…", retry:"Ponów", reviewed:"Sprawdzono", unreviewed:"Nie sprawdzono", stale:"Sprawdź ponownie", notApplicable:"Nie dotyczy", modelGap:"Luka modelu", empty:"Brak relacji", markReviewed:"Zakończ kontrolę", markEmptyReviewed:"Sprawdzono — relacje nie są potrzebne", markNotApplicable:"Nie dotyczy", markGap:"Oznacz lukę modelu", lastReview:"Ostatnia kontrola", coverage:"Kompletność kontroli", relationTypes:"Typy relacji semantycznych", crossPlanes:"Relacje między trzema gałęziami", noAccess:"Blok jest dostępny dla kuratora modelu.", add:"Dodaj", remove:"Usuń", chooseObject:"Wybierz obiekt", chooseRelation:"Typ relacji" },
  uk: { title:"Перевірка повноти зв’язків", description:"Кожен дозволений тип зв’язку та дві інші головні гілки показані окремо.", loading:"Завантаження стану перевірки…", retry:"Повторити", reviewed:"Перевірено", unreviewed:"Не перевірено", stale:"Потрібно перевірити знову", notApplicable:"Не застосовується", modelGap:"Прогалина моделі", empty:"Зв’язків немає", markReviewed:"Завершити перевірку", markEmptyReviewed:"Перевірено — зв’язки не потрібні", markNotApplicable:"Не застосовується", markGap:"Позначити прогалину моделі", lastReview:"Остання перевірка", coverage:"Повнота перевірки", relationTypes:"Типи смислових зв’язків", crossPlanes:"Зв’язки між трьома гілками", noAccess:"Блок доступний куратору моделі.", add:"Додати", remove:"Прибрати", chooseObject:"Оберіть об’єкт", chooseRelation:"Тип зв’язку" },
  de: { title:"Prüfung der Beziehungsabdeckung", description:"Jeder zulässige Beziehungstyp und die zwei anderen Hauptzweige werden getrennt angezeigt.", loading:"Prüfstatus wird geladen…", retry:"Erneut", reviewed:"Geprüft", unreviewed:"Nicht geprüft", stale:"Erneut prüfen", notApplicable:"Nicht anwendbar", modelGap:"Modelllücke", empty:"Keine Beziehungen", markReviewed:"Prüfung abschließen", markEmptyReviewed:"Geprüft — keine Beziehungen nötig", markNotApplicable:"Nicht anwendbar", markGap:"Modelllücke markieren", lastReview:"Letzte Prüfung", coverage:"Prüfabdeckung", relationTypes:"Semantische Beziehungstypen", crossPlanes:"Beziehungen zwischen den drei Zweigen", noAccess:"Dieser Bereich ist für den Modellkurator verfügbar.", add:"Hinzufügen", remove:"Entfernen", chooseObject:"Objekt wählen", chooseRelation:"Beziehungstyp" },
  es: { title:"Revisión de cobertura de relaciones", description:"Cada tipo de relación permitido y las otras dos ramas principales se muestran por separado.", loading:"Cargando estado de revisión…", retry:"Reintentar", reviewed:"Revisado", unreviewed:"No revisado", stale:"Revisar de nuevo", notApplicable:"No aplica", modelGap:"Vacío del modelo", empty:"Sin relaciones", markReviewed:"Finalizar revisión", markEmptyReviewed:"Revisado — no se requieren relaciones", markNotApplicable:"No aplica", markGap:"Marcar vacío del modelo", lastReview:"Última revisión", coverage:"Cobertura de revisión", relationTypes:"Tipos de relaciones semánticas", crossPlanes:"Relaciones entre las tres ramas", noAccess:"Este bloque está disponible para el curador del modelo.", add:"Añadir", remove:"Quitar", chooseObject:"Elegir objeto", chooseRelation:"Tipo de relación" },
  cs: { title:"Kontrola úplnosti vztahů", description:"Každý povolený typ vztahu a dvě další hlavní větve jsou zobrazeny odděleně.", loading:"Načítám stav kontroly…", retry:"Opakovat", reviewed:"Zkontrolováno", unreviewed:"Nezkontrolováno", stale:"Zkontrolovat znovu", notApplicable:"Nepoužije se", modelGap:"Mezera modelu", empty:"Žádné vztahy", markReviewed:"Dokončit kontrolu", markEmptyReviewed:"Zkontrolováno — vztahy nejsou potřeba", markNotApplicable:"Nepoužije se", markGap:"Označit mezeru modelu", lastReview:"Poslední kontrola", coverage:"Pokrytí kontroly", relationTypes:"Typy sémantických vztahů", crossPlanes:"Vztahy mezi třemi větvemi", noAccess:"Tento blok je dostupný kurátorovi modelu.", add:"Přidat", remove:"Odebrat", chooseObject:"Vyberte objekt", chooseRelation:"Typ vztahu" },
};

function relationLabel(zone: RelationZone, locale: LocaleCode) {
  if (locale === "ru") return RU_RELATIONS[`${zone.relationTypeCode}:${zone.direction}`] ?? RU_RELATIONS[zone.relationTypeCode] ?? zone.relationTypeCode;
  const reverse = zone.direction === "incoming" ? " ←" : zone.direction === "outgoing" ? " →" : "";
  return `${zone.relationTypeCode.replaceAll("_", " ")}${reverse}`;
}

function statusStyle(code: ReviewCode) {
  if (code === "reviewed") return { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
  if (code === "stale") return { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock3 };
  if (code === "not_applicable") return { bar: "bg-slate-400", badge: "bg-slate-50 text-slate-600 border-slate-200", icon: ShieldCheck };
  return { bar: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200", icon: CircleAlert };
}

function statusLabel(code: ReviewCode, copy: (typeof COPY)[LocaleCode]) {
  return code === "reviewed" ? copy.reviewed : code === "stale" ? copy.stale : code === "not_applicable" ? copy.notApplicable : code === "model_gap" ? copy.modelGap : copy.unreviewed;
}

export function ValueObjectRelationshipCoverageReview({ valueObjectId, locale }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyZone, setBusyZone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/value-objects/${valueObjectId}/relationship-coverage`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403 || response.status === 409) { setHidden(true); return; }
      const payload = (await response.json()) as CoverageResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "RELATIONSHIP_COVERAGE_READ_FAILED");
      setData(payload); setHidden(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "RELATIONSHIP_COVERAGE_READ_FAILED");
    } finally { setLoading(false); }
  }, [valueObjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const submitReview = useCallback(async (zoneKey: string, outcomeCode: string) => {
    setBusyZone(zoneKey);
    try {
      const response = await fetch(`/api/value-objects/${valueObjectId}/relationship-coverage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", zoneKey, outcomeCode }),
      });
      const payload = (await response.json()) as CoverageResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "RELATIONSHIP_COVERAGE_WRITE_FAILED");
      setData(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "RELATIONSHIP_COVERAGE_WRITE_FAILED"); }
    finally { setBusyZone(null); }
  }, [valueObjectId]);

  const mutateRelation = useCallback(async (payload: Record<string, unknown>) => {
    const zoneKey = typeof payload.zoneKey === "string" ? payload.zoneKey : "relation-mutation";
    setBusyZone(zoneKey);
    try {
      const response = await fetch(`/api/value-objects/${valueObjectId}/relationship-coverage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const next = (await response.json()) as CoverageResponse & { error?: string };
      if (!response.ok || !next.ok) throw new Error(next.error ?? "RELATIONSHIP_COVERAGE_WRITE_FAILED");
      setData(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "RELATIONSHIP_COVERAGE_WRITE_FAILED"); }
    finally { setBusyZone(null); }
  }, [valueObjectId]);

  const percent = useMemo(() => {
    if (!data || data.counters.total === 0) return 0;
    const done = data.counters.reviewed + data.counters.not_applicable;
    return Math.round((done / data.counters.total) * 100);
  }, [data]);

  if (hidden) return null;

  return (
    <section className="mt-4 rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">{copy.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
        </div>
        {data ? <div className="rounded-2xl border border-slate-200 px-4 py-3 text-right"><div className="text-xs text-slate-500">{copy.coverage}</div><div className="text-2xl font-bold text-slate-900">{percent}%</div><div className="text-xs text-slate-500">{data.counters.reviewed} / {data.counters.total}</div></div> : null}
      </div>

      {loading ? <div className="mt-5 text-sm text-slate-500">{copy.loading}</div> : null}
      {error ? <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-3 py-1.5 font-medium"><RefreshCw size={14}/>{copy.retry}</button></div> : null}

      {data ? (
        <div className="mt-5 space-y-6">
          <ZoneGroup title={copy.crossPlanes} zones={data.crossPlaneZones} locale={locale} copy={copy} busyZone={busyZone} onReview={submitReview} onMutate={mutateRelation} candidates={data.candidates} relationZones={data.relationZones} />
          <ZoneGroup title={copy.relationTypes} zones={data.relationZones} locale={locale} copy={copy} busyZone={busyZone} onReview={submitReview} onMutate={mutateRelation} candidates={data.candidates} relationZones={data.relationZones} />
        </div>
      ) : null}
    </section>
  );
}

function ZoneGroup({ title, zones, locale, copy, busyZone, onReview, onMutate, candidates, relationZones }: {
  title: string; zones: Array<RelationZone | CrossPlaneZone>; locale: LocaleCode; copy: (typeof COPY)[LocaleCode]; busyZone: string | null;
  onReview: (zoneKey: string, outcome: string) => Promise<void>;
  onMutate: (payload: Record<string, unknown>) => Promise<void>;
  candidates: CoverageResponse["candidates"]; relationZones: RelationZone[];
}) {
  return <div><h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{zones.map((zone) => <CoverageZoneCard key={zone.zoneKey} zone={zone} locale={locale} copy={copy} busy={busyZone === zone.zoneKey} onReview={onReview} onMutate={onMutate} candidates={candidates} relationZones={relationZones}/>)}</div></div>;
}

function CoverageZoneCard({ zone, locale, copy, busy, onReview, onMutate, candidates, relationZones }: {
  zone: RelationZone | CrossPlaneZone; locale: LocaleCode; copy: (typeof COPY)[LocaleCode]; busy: boolean;
  onReview: (zoneKey: string, outcome: string) => Promise<void>;
  onMutate: (payload: Record<string, unknown>) => Promise<void>;
  candidates: CoverageResponse["candidates"]; relationZones: RelationZone[];
}) {
  const status = statusStyle(zone.review.code); const StatusIcon = status.icon;
  const title = zone.kind === "cross_plane" ? PLANE_LABELS[zone.plane]?.[locale] ?? zone.plane : relationLabel(zone, locale);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [selectedRelationType, setSelectedRelationType] = useState(zone.kind === "relation" ? zone.relationTypeCode : "related_to");
  const availableCandidates = candidates.filter((candidate) => zone.kind !== "cross_plane" || candidate.plane === zone.plane);
  const availableRelationTypes = Array.from(new Map(relationZones.map((item) => [item.relationTypeCode, item])).values());
  const selectedRelationZone = relationZones.find((item) => item.relationTypeCode === selectedRelationType && item.direction !== "incoming") ?? relationZones.find((item) => item.relationTypeCode === selectedRelationType);
  const addDirection: Direction = zone.kind === "relation" ? zone.direction : (selectedRelationZone?.direction ?? "symmetric");

  return <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className={`absolute inset-x-0 top-0 h-1.5 ${status.bar}`} />
    <div className="flex items-start justify-between gap-2 pt-1"><div><div className="text-sm font-bold text-slate-900">{title} · {zone.links.length}</div><div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${status.badge}`}><StatusIcon size={12}/>{statusLabel(zone.review.code, copy)}</div></div></div>
    <div className="mt-3 min-h-[56px] space-y-1.5">{zone.links.length === 0 ? <div className="text-xs text-slate-500">{copy.empty}</div> : zone.links.slice(0, 5).map((link) => <div key={`${zone.zoneKey}:${link.relationId}:${link.id}`} className="flex items-center gap-1"><Link href={`/value-objects/${link.id}?locale=${locale}`} className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300"><span className="truncate">{link.title}</span><ExternalLink size={12}/></Link><button type="button" disabled={busy} onClick={() => void onMutate({ action:"remove_relation", relationId:link.relationId, zoneKey:zone.zoneKey })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-500 disabled:opacity-50">{copy.remove}</button></div>)}</div>
    {zone.review.reviewedAt ? <div className="mt-3 text-[11px] text-slate-400">{copy.lastReview}: {new Date(zone.review.reviewedAt).toLocaleDateString(locale)}</div> : null}
    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/80 p-2">
      {zone.kind === "cross_plane" ? <select value={selectedRelationType} onChange={(e) => setSelectedRelationType(e.target.value)} className="mb-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">{copy.chooseRelation}</option>{availableRelationTypes.map((item) => <option key={item.relationTypeCode} value={item.relationTypeCode}>{relationLabel(item, locale)}</option>)}</select> : null}
      <div className="flex gap-1.5"><select value={selectedObjectId} onChange={(e) => setSelectedObjectId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">{copy.chooseObject}</option>{availableCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select><button type="button" disabled={busy || !selectedObjectId || !selectedRelationType} onClick={() => void onMutate({ action:"add_relation", relationTypeCode:selectedRelationType, targetValueObjectId:selectedObjectId, direction:addDirection, zoneKey:zone.zoneKey })} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 disabled:opacity-40">{copy.add}</button></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5"><button disabled={busy} type="button" onClick={() => void onReview(zone.zoneKey, zone.links.length ? "links_confirmed" : "no_links_required")} className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-emerald-700 disabled:opacity-50">{zone.links.length ? copy.markReviewed : copy.markEmptyReviewed}</button><button disabled={busy} type="button" onClick={() => void onReview(zone.zoneKey, "not_applicable")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50">{copy.markNotApplicable}</button>{zone.kind === "cross_plane" && zone.links.length === 0 ? <button disabled={busy} type="button" onClick={() => void onReview(zone.zoneKey, "expected_missing")} className="rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-rose-700 disabled:opacity-50">{copy.markGap}</button> : null}</div>
  </article>;
}
