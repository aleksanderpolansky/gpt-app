"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatMutualMetricValue,
  type MutualLinkActivity,
  type MutualLinksApiResponse,
} from "@/lib/activity/mutualLinks";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

const COPY: Record<Locale, { title: string; activities: string; facts: string; empty: string; loading: string; error: string }> = {
  en: { title: "Linked reality", activities: "Activities", facts: "Facts", empty: "No linked facts or activities yet.", loading: "Loading links…", error: "Could not load linked facts and activities." },
  pl: { title: "Powiązana rzeczywistość", activities: "Aktywności", facts: "Fakty", empty: "Brak powiązanych faktów lub aktywności.", loading: "Ładuję powiązania…", error: "Nie udało się załadować powiązań." },
  ru: { title: "Связанная реальность", activities: "Активности", facts: "Факты", empty: "Связанных фактов и активностей пока нет.", loading: "Загружаю связи…", error: "Не удалось загрузить связанные факты и активности." },
  uk: { title: "Пов’язана реальність", activities: "Активності", facts: "Факти", empty: "Пов’язаних фактів та активностей поки немає.", loading: "Завантажую зв’язки…", error: "Не вдалося завантажити пов’язані дані." },
  de: { title: "Verknüpfte Realität", activities: "Aktivitäten", facts: "Fakten", empty: "Noch keine verknüpften Fakten oder Aktivitäten.", loading: "Verknüpfungen werden geladen…", error: "Verknüpfungen konnten nicht geladen werden." },
  es: { title: "Realidad vinculada", activities: "Actividades", facts: "Hechos", empty: "Aún no hay hechos o actividades vinculados.", loading: "Cargando vínculos…", error: "No se pudieron cargar los vínculos." },
  cs: { title: "Propojená realita", activities: "Aktivity", facts: "Fakta", empty: "Zatím nejsou propojená fakta ani aktivity.", loading: "Načítám vazby…", error: "Propojení se nepodařilo načíst." },
};

function normalizeLocale(locale: string): Locale {
  return locale === "pl" || locale === "ru" || locale === "uk" || locale === "de" || locale === "es" || locale === "cs" ? locale : "en";
}

export function ActivityMutualLinksPanel({
  locale: rawLocale,
  valueObjectId,
  activityEventId,
  factId,
}: {
  readonly locale: string;
  readonly valueObjectId?: string | null;
  readonly activityEventId?: string | null;
  readonly factId?: string | null;
}) {
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];
  const [activities, setActivities] = useState<MutualLinkActivity[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (valueObjectId) params.set("valueObjectId", valueObjectId);
    else if (activityEventId) params.set("activityEventIds", activityEventId);
    else if (factId) params.set("factId", factId);
    return `/api/activity/mutual-links?${params.toString()}`;
  }, [activityEventId, factId, valueObjectId]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(url, { credentials: "include", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as MutualLinksApiResponse | null;
        if (!response.ok || !payload?.ok) throw new Error(payload?.errorMessage ?? `Request failed: ${response.status}`);
        if (!cancelled) {
          setActivities(Array.isArray(payload.activities) ? payload.activities : []);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivities([]);
          setState("error");
        }
      });
    return () => { cancelled = true; };
  }, [url]);

  const facts = activities.flatMap((activity) => activity.facts.map((fact) => ({ activity, fact })));

  return (
    <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3b6ef8]">P5B</div>
      <h2 className="mt-2 text-xl font-black text-[#111827]">{copy.title}</h2>
      {state === "loading" ? <p className="mt-3 text-sm font-semibold text-[#7c8099]">{copy.loading}</p> : null}
      {state === "error" ? <p className="mt-3 text-sm font-semibold text-rose-700">{copy.error}</p> : null}
      {state === "ready" && activities.length === 0 ? <p className="mt-3 text-sm font-semibold text-[#7c8099]">{copy.empty}</p> : null}

      {activities.length > 0 ? (
        <div className="mt-4 grid gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[#747da0]">{copy.activities}</div>
            <div className="mt-2 grid gap-2">
              {activities.map((activity) => (
                <div key={activity.activityEventId} className="rounded-2xl border border-[#e5e7eb] bg-[#fafbff] p-3">
                  <Link href={`/activity-today?locale=${locale}&activityEventId=${encodeURIComponent(activity.activityEventId)}`} className="font-bold text-[#3b6ef8] no-underline hover:underline">
                    {activity.title ?? activity.activityEventId}
                  </Link>
                  {activity.valueObjects.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activity.valueObjects.map((vo) => (
                        <Link key={vo.id} href={`/value-objects/${encodeURIComponent(vo.id)}?locale=${locale}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 no-underline">
                          {vo.title}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {facts.length > 0 ? (
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-[#747da0]">{copy.facts}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {facts.map(({ activity, fact }) => (
                  <Link key={`${activity.activityEventId}:${fact.measureKey}`} href={`/activity-facts?locale=${locale}&activityEventId=${encodeURIComponent(activity.activityEventId)}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 no-underline">
                    {formatMutualMetricValue(fact.metricValue)} {fact.unit ?? ""}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
