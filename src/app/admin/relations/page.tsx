"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveSemanticRelationTitle } from "@/data/value-object-semantic-relation-localization";
import { getLocaleSearchParam, type LocaleCode } from "@/i18n";
import type { ValueObjectRelationTypeDto } from "@/types/value-object-semantic-relation";

type RelationObject = {
  id: string;
  title: string;
  description: string | null;
  facetCode: string | null;
  nodeRoleCode: string | null;
  status: string;
};

type RelationListItem = {
  id: string;
  source: RelationObject;
  target: RelationObject;
  relationType: ValueObjectRelationTypeDto;
  status: string;
  provenanceCode: string;
  curatorComment: string | null;
  curatorCommentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  ok?: boolean;
  count?: number;
  relations?: RelationListItem[];
  error?: string;
};

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    add: string;
    search: string;
    loading: string;
    empty: string;
    source: string;
    relation: string;
    target: string;
    comment: string;
    updated: string;
    active: string;
    inactive: string;
  }
> = {
  ru: {
    title: "Связи объектов наблюдения",
    subtitle:
      "Список общих смысловых связей между системными объектами наблюдения. Эти связи отображаются на карте и используются как допустимые кандидаты в Конструкторе последствий.",
    add: "+ Добавить связь",
    search: "Поиск по объектам, виду связи или комментарию…",
    loading: "Загрузка связей…",
    empty: "Связи пока не созданы.",
    source: "Исходный ОН",
    relation: "Вид связи",
    target: "Связанный ОН",
    comment: "Комментарий куратора",
    updated: "Обновлено",
    active: "Активна",
    inactive: "Неактивна",
  },
  en: {
    title: "Observation object relationships",
    subtitle:
      "General semantic relationships between system observation objects. They appear on the relationship map and become allowed candidates in the Consequence Constructor.",
    add: "+ Add relationship",
    search: "Search objects, relationship type or comment…",
    loading: "Loading relationships…",
    empty: "No relationships have been created yet.",
    source: "Source object",
    relation: "Relationship type",
    target: "Related object",
    comment: "Curator comment",
    updated: "Updated",
    active: "Active",
    inactive: "Inactive",
  },
  pl: {
    title: "Relacje obiektów obserwacji",
    subtitle:
      "Ogólne relacje znaczeniowe między systemowymi obiektami obserwacji. Są widoczne na mapie i później staną się dopuszczalnymi celami w Konstruktorze konsekwencji.",
    add: "+ Dodaj relację",
    search: "Szukaj obiektów, typu relacji lub komentarza…",
    loading: "Ładowanie relacji…",
    empty: "Nie utworzono jeszcze relacji.",
    source: "Obiekt źródłowy",
    relation: "Typ relacji",
    target: "Obiekt powiązany",
    comment: "Komentarz kuratora",
    updated: "Zaktualizowano",
    active: "Aktywna",
    inactive: "Nieaktywna",
  },
  uk: {
    title: "Зв’язки об’єктів спостереження",
    subtitle:
      "Загальні смислові зв’язки між системними об’єктами спостереження. Вони відображаються на карті та стають допустимими кандидатами в Конструкторі наслідків.",
    add: "+ Додати зв’язок",
    search: "Пошук за об’єктами, видом зв’язку або коментарем…",
    loading: "Завантаження зв’язків…",
    empty: "Зв’язки ще не створені.",
    source: "Вихідний ОН",
    relation: "Вид зв’язку",
    target: "Пов’язаний ОН",
    comment: "Коментар куратора",
    updated: "Оновлено",
    active: "Активний",
    inactive: "Неактивний",
  },
  de: {
    title: "Beziehungen der Beobachtungsobjekte",
    subtitle:
      "Allgemeine semantische Beziehungen zwischen System-Beobachtungsobjekten. Sie erscheinen in der Karte und dienen später als zulässige Ziele im Folgen-Konstruktor.",
    add: "+ Beziehung hinzufügen",
    search: "Objekte, Beziehungstyp oder Kommentar suchen…",
    loading: "Beziehungen werden geladen…",
    empty: "Noch keine Beziehungen erstellt.",
    source: "Ausgangsobjekt",
    relation: "Beziehungstyp",
    target: "Verknüpftes Objekt",
    comment: "Kurator-Kommentar",
    updated: "Aktualisiert",
    active: "Aktiv",
    inactive: "Inaktiv",
  },
  es: {
    title: "Relaciones de objetos de observación",
    subtitle:
      "Relaciones semánticas generales entre objetos de observación del sistema. Se muestran en el mapa y luego sirven como objetivos permitidos en el Constructor de consecuencias.",
    add: "+ Añadir relación",
    search: "Buscar objetos, tipo de relación o comentario…",
    loading: "Cargando relaciones…",
    empty: "Todavía no se han creado relaciones.",
    source: "Objeto de origen",
    relation: "Tipo de relación",
    target: "Objeto relacionado",
    comment: "Comentario del curador",
    updated: "Actualizado",
    active: "Activa",
    inactive: "Inactiva",
  },
  cs: {
    title: "Vztahy objektů pozorování",
    subtitle:
      "Obecné významové vztahy mezi systémovými objekty pozorování. Zobrazují se v mapě a později slouží jako povolené cíle v Konstruktoru důsledků.",
    add: "+ Přidat vztah",
    search: "Hledat objekty, typ vztahu nebo komentář…",
    loading: "Načítání vztahů…",
    empty: "Zatím nebyly vytvořeny žádné vztahy.",
    source: "Výchozí objekt",
    relation: "Typ vztahu",
    target: "Související objekt",
    comment: "Komentář kurátora",
    updated: "Aktualizováno",
    active: "Aktivní",
    inactive: "Neaktivní",
  },
};

function formatDate(value: string, locale: LocaleCode) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminRelationsPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [relations, setRelations] = useState<RelationListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[locale] ?? COPY.en;

  const fetchRelations = useCallback(async (): Promise<RelationListItem[]> => {
    const response = await fetch(
      `/api/admin/relations?locale=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as ListResponse;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload.relations ?? [];
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    void fetchRelations()
      .then((nextRelations) => {
        if (cancelled) return;
        setRelations(nextRelations);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchRelations]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return relations;
    return relations.filter((item) => {
      const relationLabel = resolveSemanticRelationTitle(
        item.relationType,
        locale,
        "outgoing",
      );
      return [
        item.source.title,
        relationLabel,
        item.target.title,
        item.curatorComment ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized);
    });
  }, [locale, query, relations]);

  const constructorHref =
    locale === "en"
      ? "/admin/relation-constructor"
      : `/admin/relation-constructor?locale=${encodeURIComponent(locale)}`;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
              <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-xs font-semibold text-[#3b6ef8]">
                {relations.length}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b7280]">
              {copy.subtitle}
            </p>
          </div>
          <Link
            href={constructorHref}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {copy.add}
          </Link>
        </div>

        <div className="mt-5">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-11 w-full rounded-xl border border-[#d8dced] bg-white px-3 text-sm text-[#30344b] outline-none focus:border-[#3b6ef8]"
          />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#d8dced] px-4 py-8 text-center text-sm text-[#7c8099]">
            {copy.empty}
          </div>
        ) : null}

        {!loading && !error && filtered.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.04em] text-[#7c8099]">
                  <th className="border-b border-[#e8eaf2] px-3 py-3">{copy.source}</th>
                  <th className="border-b border-[#e8eaf2] px-3 py-3">{copy.relation}</th>
                  <th className="border-b border-[#e8eaf2] px-3 py-3">{copy.target}</th>
                  <th className="border-b border-[#e8eaf2] px-3 py-3">{copy.comment}</th>
                  <th className="border-b border-[#e8eaf2] px-3 py-3">{copy.updated}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const sourceHref = `/value-objects/${encodeURIComponent(item.source.id)}${locale === "en" ? "" : `?locale=${encodeURIComponent(locale)}`}`;
                  const targetHref = `/value-objects/${encodeURIComponent(item.target.id)}${locale === "en" ? "" : `?locale=${encodeURIComponent(locale)}`}`;
                  const relationLabel = resolveSemanticRelationTitle(
                    item.relationType,
                    locale,
                    "outgoing",
                  );

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="border-b border-[#f0f1f6] px-3 py-4">
                        <Link href={sourceHref} className="font-semibold text-[#315fe0] hover:underline">
                          {item.source.title}
                        </Link>
                      </td>
                      <td className="border-b border-[#f0f1f6] px-3 py-4">
                        <div className="font-semibold text-[#30344b]">{relationLabel}</div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status === "active" ? copy.active : copy.inactive}
                        </span>
                      </td>
                      <td className="border-b border-[#f0f1f6] px-3 py-4">
                        <Link href={targetHref} className="font-semibold text-[#315fe0] hover:underline">
                          {item.target.title}
                        </Link>
                      </td>
                      <td className="max-w-[420px] border-b border-[#f0f1f6] px-3 py-4 leading-6 text-[#5e647d]">
                        {item.curatorComment ?? "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-[#f0f1f6] px-3 py-4 text-xs text-[#7c8099]">
                        {formatDate(item.updatedAt, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
