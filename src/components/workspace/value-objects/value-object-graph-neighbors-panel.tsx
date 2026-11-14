"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  resolveSemanticRelationTitleKey,
  resolveSemanticRelationDescriptionKey,
} from "@/data/value-object-semantic-relation-localization";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type GraphItem = {
  relationId: string;
  neighborValueObjectId: string;
  neighborTitle: string;
  relationTypeCode: string;
  perspective: "incoming" | "outgoing" | "symmetric";
  semanticRelationTypeCode?: string | null;
  semanticTitleKey?: string | null;
  semanticDescriptionKey?: string | null;
};

type GraphResponse = {
  ok?: boolean;
  error?: string;
  scope?: "actor" | "system";
  items?: GraphItem[];
  truncated?: boolean;
};

type Props = {
  valueObjectId: string;
  locale: Locale;
  revision: number;
};

const COPY: Record<Locale, {
  title: string;
  description: string;
  refresh: string;
  loading: string;
  empty: string;
  unavailable: string;
  problem: string;
  truncated: string;
  open: string;
  direction: Record<GraphItem["perspective"], string>;
}> = {
  ru: {
    title: "Граф связей V1 · Непосредственные связи",
    description: "Связи, доступные текущему пользователю и активному профилю. Только чтение.",
    refresh: "Обновить",
    loading: "Загрузка графа…",
    empty: "Непосредственных смысловых связей пока нет.",
    unavailable: "Чтение графа недоступно для этого объекта или профиля.",
    problem: "Не удалось прочитать граф.",
    truncated: "Показана только часть связей (максимум 50).",
    open: "Открыть ОН",
    direction: { incoming: "входящая", outgoing: "исходящая", symmetric: "симметричная" },
  },
  en: {
    title: "Graph V1 · Direct relationships",
    description: "Relations visible to the current user and active actor. Read-only.",
    refresh: "Refresh", loading: "Loading graph…",
    empty: "No direct semantic relationships yet.",
    unavailable: "Graph reading is unavailable for this object or actor.",
    problem: "Could not read the graph.",
    truncated: "Only the first 50 relations are displayed.", open: "Open object",
    direction: { incoming: "incoming", outgoing: "outgoing", symmetric: "symmetric" },
  },
  pl: {
    title: "Graf V1 · Bezpośrednie relacje",
    description: "Relacje dostępne dla bieżącego użytkownika i aktywnego profilu. Tylko odczyt.",
    refresh: "Odśwież", loading: "Ładowanie grafu…",
    empty: "Nie ma jeszcze bezpośrednich relacji.",
    unavailable: "Odczyt grafu jest niedostępny dla tego obiektu lub profilu.",
    problem: "Nie udało się odczytać grafu.",
    truncated: "Wyświetlono maksymalnie 50 relacji.", open: "Otwórz obiekt",
    direction: { incoming: "przychodząca", outgoing: "wychodząca", symmetric: "symetryczna" },
  },
  uk: {
    title: "Граф V1 · Прямі зв’язки",
    description: "Зв’язки, доступні поточному користувачу та активному профілю. Лише читання.",
    refresh: "Оновити", loading: "Завантаження графа…",
    empty: "Прямих семантичних зв’язків поки немає.",
    unavailable: "Читання графа недоступне для цього об’єкта або профілю.",
    problem: "Не вдалося прочитати граф.",
    truncated: "Показано щонайбільше 50 зв’язків.", open: "Відкрити ОН",
    direction: { incoming: "вхідний", outgoing: "вихідний", symmetric: "симетричний" },
  },
  de: {
    title: "Graph V1 · Direkte Beziehungen",
    description: "Beziehungen für den aktuellen Nutzer und aktiven Akteur. Nur Lesen.",
    refresh: "Aktualisieren", loading: "Graph wird geladen…",
    empty: "Noch keine direkten Beziehungen vorhanden.",
    unavailable: "Graph-Lesen ist für dieses Objekt oder diesen Akteur nicht verfügbar.",
    problem: "Graph konnte nicht gelesen werden.",
    truncated: "Es werden höchstens 50 Beziehungen angezeigt.", open: "Objekt öffnen",
    direction: { incoming: "eingehend", outgoing: "ausgehend", symmetric: "symmetrisch" },
  },
  es: {
    title: "Grafo V1 · Relaciones directas",
    description: "Relaciones visibles para el usuario y perfil activo. Solo lectura.",
    refresh: "Actualizar", loading: "Cargando grafo…",
    empty: "Aún no hay relaciones directas.",
    unavailable: "La lectura del grafo no está disponible para este objeto o perfil.",
    problem: "No se pudo leer el grafo.",
    truncated: "Se muestran como máximo 50 relaciones.", open: "Abrir objeto",
    direction: { incoming: "entrante", outgoing: "saliente", symmetric: "simétrica" },
  },
  cs: {
    title: "Graf V1 · Přímé vztahy",
    description: "Vztahy dostupné aktuálnímu uživateli a aktivnímu profilu. Jen pro čtení.",
    refresh: "Obnovit", loading: "Načítání grafu…",
    empty: "Zatím nejsou žádné přímé vztahy.",
    unavailable: "Čtení grafu není pro tento objekt nebo profil dostupné.",
    problem: "Graf se nepodařilo načíst.",
    truncated: "Zobrazuje se nejvýše 50 vztahů.", open: "Otevřít objekt",
    direction: { incoming: "příchozí", outgoing: "odchozí", symmetric: "symetrický" },
  },
};

export function ValueObjectGraphNeighborsPanel({ valueObjectId, locale, revision }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [refreshIndex, setRefreshIndex] = useState(0);
  // A new object, revision or refresh cannot display a stale previous response.
  const requestKey = JSON.stringify([valueObjectId, revision, refreshIndex]);
  const [loadState, setLoadState] = useState<{
    key: string;
    phase: "ready" | "unavailable" | "error";
    result: GraphResponse | null;
  } | null>(null);
  const phase = loadState?.key === requestKey ? loadState.phase : "loading";
  const result = loadState?.key === requestKey ? loadState.result : null;

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/value-objects/${encodeURIComponent(valueObjectId)}/graph-neighbors?direction=all&limit=50`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const body = (await response.json()) as GraphResponse;
        if (controller.signal.aborted) return;
        if (response.status === 404 || response.status === 401 || response.status === 403) {
          setLoadState({ key: requestKey, phase: "unavailable", result: null });
          return;
        }
        if (!response.ok || body.ok !== true || !Array.isArray(body.items)) {
          setLoadState({ key: requestKey, phase: "error", result: null });
          return;
        }
        setLoadState({ key: requestKey, phase: "ready", result: body });
      } catch {
        if (!controller.signal.aborted) {
          setLoadState({ key: requestKey, phase: "error", result: null });
        }
      }
    })();

    return () => controller.abort();
  }, [valueObjectId, requestKey]);

  return (
    <div className="mt-4 rounded-2xl border border-[#dfe4f2] bg-[#f8faff] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-[#111827]">{copy.title}</h3>
        <button
          type="button"
          onClick={() => setRefreshIndex((n) => n + 1)}
          className="rounded-lg border border-[#dbe2f6] bg-white px-3 py-1.5 text-[12px] font-bold text-[#3b6ef8] hover:bg-[#edf2ff]"
        >
          {copy.refresh}
        </button>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{copy.description}</p>
      <div className="mt-3" aria-live="polite">
        {phase === "loading" ? (
          <p className="text-[12px] text-[#6b7280]">{copy.loading}</p>
        ) : phase === "unavailable" ? (
          <p className="text-[12px] text-[#6b7280]">{copy.unavailable}</p>
        ) : phase === "error" ? (
          <p className="text-[12px] text-[#a33a3a]">{copy.problem}</p>
        ) : (result?.items?.length ?? 0) === 0 ? (
          <p className="text-[12px] text-[#6b7280]">{copy.empty}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(result?.items ?? []).map((item) => (
              <Link
                key={item.relationId}
                prefetch={false}
                href={`/value-objects/${encodeURIComponent(item.neighborValueObjectId)}?locale=${encodeURIComponent(locale)}`}
                className="block rounded-xl border border-[#e0e5f3] bg-white p-3 transition hover:border-[#9db3ff] hover:bg-[#f6f8ff]"
                aria-label={`${copy.open}: ${item.neighborTitle}`}
              >
                <div className="text-[13px] font-bold text-[#111827]">{item.neighborTitle}</div>
                <div className="mt-1 text-[11px] text-[#6b7280]">
                  {resolveSemanticRelationTitleKey(item.semanticTitleKey ?? null, locale) ?? item.relationTypeCode}
                  {' · '}{copy.direction[item.perspective] ?? item.perspective}
                  {' · '}{item.semanticRelationTypeCode ?? item.relationTypeCode}
                </div>
                {resolveSemanticRelationDescriptionKey(item.semanticDescriptionKey ?? null, locale) ? (
                  <div className="mt-1 text-[11px] text-[#6b7280]">
                    {resolveSemanticRelationDescriptionKey(item.semanticDescriptionKey ?? null, locale)}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
      {result?.truncated ? (
        <p className="mt-2 text-[11px] font-medium text-[#8b5cf6]">{copy.truncated}</p>
      ) : null}
    </div>
  );
}
