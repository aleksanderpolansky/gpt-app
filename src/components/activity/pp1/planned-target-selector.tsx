"use client";

import { useEffect, useMemo, useState } from "react";

import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";

type ValueObjectOption = {
  id: string;
  title: string;
  nodeRoleCode: string | null;
  branchTypeCode: string | null;
  objectKind: string | null;
};

const COPY: Record<ActivityTimingLocalePp1, {
  title: string;
  help: string;
  loading: string;
  empty: string;
  error: string;
}> = {
  en: {
    title: "Planned targets",
    help: "A plan may support several root, intermediate or leaf observation objects.",
    loading: "Loading observation objects…",
    empty: "No observation objects are available for the active profile.",
    error: "Observation objects could not be loaded.",
  },
  pl: {
    title: "Cele planu",
    help: "Plan może wspierać kilka głównych, pośrednich lub liściowych obiektów obserwacji.",
    loading: "Ładowanie obiektów obserwacji…",
    empty: "Brak obiektów obserwacji dla aktywnego profilu.",
    error: "Nie udało się załadować obiektów obserwacji.",
  },
  ru: {
    title: "Цели плановой активности",
    help: "Один план может быть связан с несколькими корневыми, промежуточными или листовыми ценными объектами.",
    loading: "Загружаю ценные объекты…",
    empty: "Для активного профиля пока нет доступных ценных объектов.",
    error: "Не удалось загрузить ценные объекты.",
  },
  uk: {
    title: "Цілі планової активності",
    help: "Один план може бути пов’язаний із кількома кореневими, проміжними або листовими цінними об’єктами.",
    loading: "Завантажую цінні об’єкти…",
    empty: "Для активного профілю поки немає доступних цінних об’єктів.",
    error: "Не вдалося завантажити цінні об’єкти.",
  },
  de: {
    title: "Ziele der geplanten Aktivität",
    help: "Ein Plan kann mehrere Wurzel-, Zwischen- oder Blatt-Beobachtungsobjekte unterstützen.",
    loading: "Beobachtungsobjekte werden geladen…",
    empty: "Für das aktive Profil sind keine Beobachtungsobjekte vorhanden.",
    error: "Beobachtungsobjekte konnten nicht geladen werden.",
  },
  es: {
    title: "Objetivos de la actividad planificada",
    help: "Un plan puede vincularse con varios objetos de observación raíz, intermedios o hoja.",
    loading: "Cargando objetos de observación…",
    empty: "No hay objetos de observación disponibles para el perfil activo.",
    error: "No se pudieron cargar los objetos de observación.",
  },
  cs: {
    title: "Cíle plánované aktivity",
    help: "Plán může být propojen s několika kořenovými, mezilehlými nebo listovými objekty pozorování.",
    loading: "Načítám objekty pozorování…",
    empty: "Pro aktivní profil nejsou dostupné žádné objekty pozorování.",
    error: "Objekty pozorování se nepodařilo načíst.",
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptions(payload: unknown): ValueObjectOption[] {
  const row = asRecord(payload);
  const values = Array.isArray(row.valueObjects) ? row.valueObjects : [];

  return values.flatMap((value) => {
    const item = asRecord(value);
    const id = asString(item.id);
    const title = asString(item.title);

    if (!id || !title) {
      return [];
    }

    return [{
      id,
      title,
      nodeRoleCode: asString(item.node_role_code),
      branchTypeCode: asString(item.branch_type_code),
      objectKind: asString(item.object_kind),
    }];
  });
}

export function PlannedTargetSelectorPp1({
  locale,
  selectedIds,
  onChange,
}: {
  locale: ActivityTimingLocalePp1;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const copy = COPY[locale];
  const [options, setOptions] = useState<ValueObjectOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");

      try {
        const response = await fetch("/api/value-objects", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("value objects request failed");
        }

        if (!cancelled) {
          setOptions(normalizeOptions(payload));
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
          setStatus("error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  return (
    <div className="rounded-[18px] border border-[#dfe5f1] bg-[#f8fafc] p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c8099]">{copy.title}</p>
      <p className="mt-2 text-xs leading-5 text-[#52607a]">{copy.help}</p>

      {status === "loading" ? <p className="mt-3 text-sm text-[#52607a]">{copy.loading}</p> : null}
      {status === "error" ? <p className="mt-3 text-sm font-semibold text-[#be123c]">{copy.error}</p> : null}
      {status === "ready" && options.length === 0 ? <p className="mt-3 text-sm text-[#52607a]">{copy.empty}</p> : null}

      {options.length > 0 ? (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {options.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfe5f1] bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
                className="mt-1 h-4 w-4"
              />
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold text-[#1a1d2e]">{option.title}</span>
                <span className="block text-[11px] text-[#7c8099]">
                  {[option.nodeRoleCode, option.branchTypeCode, option.objectKind].filter(Boolean).join(" · ")}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
