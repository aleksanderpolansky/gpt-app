"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  resolveSemanticRelationDescription,
  resolveSemanticRelationTitle,
} from "@/data/value-object-semantic-relation-localization";
import { getLocaleSearchParam, type LocaleCode } from "@/i18n";
import type { ValueObjectRelationTypeDto } from "@/types/value-object-semantic-relation";

type ObservationObjectOption = {
  id: string;
  title: string;
  description: string | null;
  facetCode: string | null;
  nodeRoleCode: string | null;
};

type CatalogResponse = {
  ok?: boolean;
  objects?: ObservationObjectOption[];
  relationTypes?: ValueObjectRelationTypeDto[];
  error?: string;
};

type CreateResponse = {
  ok?: boolean;
  relation?: {
    id: string;
    relationTypeCode: string;
    sourceValueObjectId: string;
    targetValueObjectId: string;
    status: string;
  };
  curatorCommentRecorded?: boolean;
  error?: string;
};

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    source: string;
    target: string;
    relation: string;
    comment: string;
    sourcePlaceholder: string;
    targetPlaceholder: string;
    relationPlaceholder: string;
    commentPlaceholder: string;
    save: string;
    saving: string;
    success: string;
    addAnother: string;
    backToObject: string;
    loading: string;
  }
> = {
  ru: {
    title: "Конструктор связей",
    subtitle:
      "Создайте смысловую связь между двумя объектами наблюдения. Эта связь будет видна на карте связей и позже позволит сузить список целевых ОН в Конструкторе последствий.",
    source: "Исходный объект наблюдения",
    target: "Объект наблюдения, с которым создаётся связь",
    relation: "Вид связи",
    comment: "Комментарий куратора",
    sourcePlaceholder: "Выберите исходный ОН…",
    targetPlaceholder: "Выберите связанный ОН…",
    relationPlaceholder: "Выберите вид связи…",
    commentPlaceholder:
      "Свободным текстом объясните, почему, по мнению куратора, эта связь существует.",
    save: "Создать связь",
    saving: "Сохраняем…",
    success: "Связь создана. Комментарий куратора сохранён.",
    addAnother: "Добавить ещё связь",
    backToObject: "Открыть исходный ОН",
    loading: "Загрузка каталога…",
  },
  en: {
    title: "Relationship constructor",
    subtitle:
      "Create a semantic relationship between two observation objects. It will appear on the relationship map and later narrow target candidates in the Consequence Constructor.",
    source: "Source observation object",
    target: "Observation object to relate",
    relation: "Relationship type",
    comment: "Curator comment",
    sourcePlaceholder: "Choose source object…",
    targetPlaceholder: "Choose related object…",
    relationPlaceholder: "Choose relationship type…",
    commentPlaceholder:
      "Explain in free text why the curator considers this relationship to exist.",
    save: "Create relationship",
    saving: "Saving…",
    success: "Relationship created. Curator comment saved.",
    addAnother: "Add another relationship",
    backToObject: "Open source object",
    loading: "Loading catalog…",
  },
  pl: {
    title: "Konstruktor relacji",
    subtitle:
      "Utwórz relację znaczeniową między dwoma obiektami obserwacji. Będzie widoczna na mapie relacji i później zawęzi listę celów w Konstruktorze konsekwencji.",
    source: "Źródłowy obiekt obserwacji",
    target: "Obiekt obserwacji, z którym tworzona jest relacja",
    relation: "Typ relacji",
    comment: "Komentarz kuratora",
    sourcePlaceholder: "Wybierz obiekt źródłowy…",
    targetPlaceholder: "Wybierz obiekt powiązany…",
    relationPlaceholder: "Wybierz typ relacji…",
    commentPlaceholder: "Opisz, dlaczego kurator uznaje, że ta relacja istnieje.",
    save: "Utwórz relację",
    saving: "Zapisywanie…",
    success: "Relacja została utworzona. Komentarz kuratora zapisano.",
    addAnother: "Dodaj kolejną relację",
    backToObject: "Otwórz obiekt źródłowy",
    loading: "Ładowanie katalogu…",
  },
  uk: {
    title: "Конструктор зв’язків",
    subtitle:
      "Створіть смисловий зв’язок між двома об’єктами спостереження. Він буде видимим на карті зв’язків і пізніше звузить список цільових ОН.",
    source: "Вихідний об’єкт спостереження",
    target: "Об’єкт спостереження, з яким створюється зв’язок",
    relation: "Вид зв’язку",
    comment: "Коментар куратора",
    sourcePlaceholder: "Виберіть вихідний ОН…",
    targetPlaceholder: "Виберіть пов’язаний ОН…",
    relationPlaceholder: "Виберіть вид зв’язку…",
    commentPlaceholder: "Поясніть, чому куратор вважає, що цей зв’язок існує.",
    save: "Створити зв’язок",
    saving: "Збереження…",
    success: "Зв’язок створено. Коментар куратора збережено.",
    addAnother: "Додати ще зв’язок",
    backToObject: "Відкрити вихідний ОН",
    loading: "Завантаження каталогу…",
  },
  de: {
    title: "Beziehungskonstruktor",
    subtitle:
      "Erstellen Sie eine semantische Beziehung zwischen zwei Beobachtungsobjekten. Sie erscheint in der Beziehungskarte und grenzt später Zielobjekte ein.",
    source: "Ausgangs-Beobachtungsobjekt",
    target: "Zu verknüpfendes Beobachtungsobjekt",
    relation: "Beziehungstyp",
    comment: "Kurator-Kommentar",
    sourcePlaceholder: "Ausgangsobjekt wählen…",
    targetPlaceholder: "Verknüpftes Objekt wählen…",
    relationPlaceholder: "Beziehungstyp wählen…",
    commentPlaceholder: "Begründen Sie, warum diese Beziehung nach Ansicht des Kurators besteht.",
    save: "Beziehung erstellen",
    saving: "Speichern…",
    success: "Beziehung erstellt. Kurator-Kommentar gespeichert.",
    addAnother: "Weitere Beziehung hinzufügen",
    backToObject: "Ausgangsobjekt öffnen",
    loading: "Katalog wird geladen…",
  },
  es: {
    title: "Constructor de relaciones",
    subtitle:
      "Cree una relación semántica entre dos objetos de observación. Aparecerá en el mapa y luego limitará los objetivos del Constructor de consecuencias.",
    source: "Objeto de observación de origen",
    target: "Objeto de observación relacionado",
    relation: "Tipo de relación",
    comment: "Comentario del curador",
    sourcePlaceholder: "Elija el objeto de origen…",
    targetPlaceholder: "Elija el objeto relacionado…",
    relationPlaceholder: "Elija el tipo de relación…",
    commentPlaceholder: "Explique por qué el curador considera que existe esta relación.",
    save: "Crear relación",
    saving: "Guardando…",
    success: "Relación creada. Comentario del curador guardado.",
    addAnother: "Añadir otra relación",
    backToObject: "Abrir objeto de origen",
    loading: "Cargando catálogo…",
  },
  cs: {
    title: "Konstruktor vztahů",
    subtitle:
      "Vytvořte významový vztah mezi dvěma objekty pozorování. Zobrazí se v mapě vztahů a později zúží cíle v Konstruktoru důsledků.",
    source: "Výchozí objekt pozorování",
    target: "Související objekt pozorování",
    relation: "Typ vztahu",
    comment: "Komentář kurátora",
    sourcePlaceholder: "Vyberte výchozí objekt…",
    targetPlaceholder: "Vyberte související objekt…",
    relationPlaceholder: "Vyberte typ vztahu…",
    commentPlaceholder: "Vysvětlete, proč kurátor považuje tento vztah za existující.",
    save: "Vytvořit vztah",
    saving: "Ukládání…",
    success: "Vztah vytvořen. Komentář kurátora uložen.",
    addAnother: "Přidat další vztah",
    backToObject: "Otevřít výchozí objekt",
    loading: "Načítání katalogu…",
  },
};

export default function RelationConstructorPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [sourceValueObjectId, setSourceValueObjectId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("sourceValueObjectId")?.trim() ?? "",
  );
  const [targetValueObjectId, setTargetValueObjectId] = useState("");
  const [relationTypeCode, setRelationTypeCode] = useState("");
  const [comment, setComment] = useState("");
  const [objects, setObjects] = useState<ObservationObjectOption[]>([]);
  const [relationTypes, setRelationTypes] = useState<ValueObjectRelationTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copy = COPY[locale] ?? COPY.en;

  const fetchCatalog = useCallback(async (): Promise<CatalogResponse> => {
    const response = await fetch(
      `/api/admin/relation-constructor?locale=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as CatalogResponse;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalog()
      .then((payload) => {
        if (cancelled) return;
        const nextObjects = payload.objects ?? [];
        setObjects(nextObjects);
        setRelationTypes(payload.relationTypes ?? []);
        if (
          sourceValueObjectId &&
          !nextObjects.some((item) => item.id === sourceValueObjectId)
        ) {
          setSourceValueObjectId("");
        }
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
  }, [fetchCatalog, sourceValueObjectId]);

  const targetObjects = useMemo(
    () => objects.filter((item) => item.id !== sourceValueObjectId),
    [objects, sourceValueObjectId],
  );

  const selectedRelationType = useMemo(
    () =>
      relationTypes.find(
        (item) => item.relationTypeCode === relationTypeCode,
      ) ?? null,
    [relationTypeCode, relationTypes],
  );

  const canSave =
    Boolean(sourceValueObjectId) &&
    Boolean(targetValueObjectId) &&
    Boolean(relationTypeCode) &&
    Boolean(comment.trim()) &&
    !saving;

  async function saveRelation() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/relation-constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceValueObjectId,
          targetValueObjectId,
          relationTypeCode,
          comment: comment.trim(),
        }),
      });
      const payload = (await response.json()) as CreateResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setTargetValueObjectId("");
      setRelationTypeCode("");
      setComment("");
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const sourceHref = sourceValueObjectId
    ? `/value-objects/${encodeURIComponent(sourceValueObjectId)}${locale === "en" ? "" : `?locale=${encodeURIComponent(locale)}`}`
    : null;

  return (
    <main className="mx-auto w-full max-w-[1250px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b7280]">
              {copy.subtitle}
            </p>
          </div>
          {sourceHref ? (
            <Link
              href={sourceHref}
              className="rounded-lg border border-[#d8dced] px-3 py-2 text-sm font-medium text-[#4a4f6a] hover:bg-[#f8f9fc]"
            >
              {copy.backToObject}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p>
        ) : null}

        {!loading ? (
          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#30344b]">
                1. {copy.source}
              </span>
              <select
                value={sourceValueObjectId}
                onChange={(event) => {
                  setSourceValueObjectId(event.target.value);
                  setTargetValueObjectId("");
                  setSuccess(false);
                }}
                className="h-11 rounded-xl border border-[#d8dced] bg-white px-3 text-sm text-[#30344b] outline-none focus:border-[#3b6ef8]"
              >
                <option value="">{copy.sourcePlaceholder}</option>
                {objects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#30344b]">
                2. {copy.target}
              </span>
              <select
                value={targetValueObjectId}
                disabled={!sourceValueObjectId}
                onChange={(event) => {
                  setTargetValueObjectId(event.target.value);
                  setSuccess(false);
                }}
                className="h-11 rounded-xl border border-[#d8dced] bg-white px-3 text-sm text-[#30344b] outline-none focus:border-[#3b6ef8] disabled:bg-[#f6f7fb] disabled:text-[#9ca3b8]"
              >
                <option value="">{copy.targetPlaceholder}</option>
                {targetObjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#30344b]">
                3. {copy.relation}
              </span>
              <select
                value={relationTypeCode}
                onChange={(event) => {
                  setRelationTypeCode(event.target.value);
                  setSuccess(false);
                }}
                className="h-11 rounded-xl border border-[#d8dced] bg-white px-3 text-sm text-[#30344b] outline-none focus:border-[#3b6ef8]"
              >
                <option value="">{copy.relationPlaceholder}</option>
                {relationTypes.map((item) => (
                  <option key={item.relationTypeCode} value={item.relationTypeCode}>
                    {resolveSemanticRelationTitle(item, locale, "outgoing")}
                  </option>
                ))}
              </select>
              {selectedRelationType ? (
                <span className="text-xs leading-5 text-[#7c8099]">
                  {resolveSemanticRelationDescription(
                    selectedRelationType,
                    locale,
                    "outgoing",
                  )}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#30344b]">
                4. {copy.comment}
              </span>
              <textarea
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                  setSuccess(false);
                }}
                maxLength={4000}
                rows={6}
                placeholder={copy.commentPlaceholder}
                className="resize-y rounded-xl border border-[#d8dced] bg-white px-3 py-3 text-sm leading-6 text-[#30344b] outline-none focus:border-[#3b6ef8]"
              />
              <span className="text-right text-xs text-[#9ca3b8]">
                {comment.length}/4000
              </span>
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                <span>{copy.success}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTargetValueObjectId("");
                    setRelationTypeCode("");
                    setComment("");
                    setSuccess(false);
                  }}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  {copy.addAnother}
                </button>
              </div>
            ) : null}

            <div>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void saveRelation()}
                className="rounded-xl bg-[#3b6ef8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#315fe0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
