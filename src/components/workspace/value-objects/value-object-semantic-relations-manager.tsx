"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  resolveSemanticRelationDescription,
  resolveSemanticRelationTitle,
} from "@/data/value-object-semantic-relation-localization";
import type {
  ValueObjectRelationTypeDto,
  ValueObjectSemanticRelationDto,
  ValueObjectSemanticRelationListResponse,
  ValueObjectSemanticRelationLocale,
  ValueObjectSemanticRelationMutationResponse,
} from "@/types/value-object-semantic-relation";

type Props = {
  valueObjectId: string;
  locale: ValueObjectSemanticRelationLocale;
};

type Copy = {
  description: string;
  relationType: string;
  targetObject: string;
  add: string;
  adding: string;
  loading: string;
  reload: string;
  noCandidates: string;
  noRelations: string;
  activeRelations: string;
  inactiveRelations: string;
  deactivate: string;
  restoring: string;
  restore: string;
  changing: string;
  errorPrefix: string;
  candidateHint: string;
};

const COPY: Record<ValueObjectSemanticRelationLocale, Copy> = {
  en: {
    description:
      "Add a meaning link without changing the structural tree. Relations do not copy facts, measurements, parameters or targets.",
    relationType: "Relation type",
    targetObject: "Related object",
    add: "Add relation",
    adding: "Adding…",
    loading: "Loading relations…",
    reload: "Reload",
    noCandidates: "Create another observation object before adding a relation.",
    noRelations: "No semantic relations have been added yet.",
    activeRelations: "Active relations",
    inactiveRelations: "Inactive relations",
    deactivate: "Deactivate",
    restoring: "Restoring…",
    restore: "Restore",
    changing: "Saving…",
    errorPrefix: "Could not update semantic relations:",
    candidateHint: "Objects from another branch are allowed when they belong to the same active profile.",
  },
  pl: {
    description:
      "Dodaj relację znaczeniową bez zmiany drzewa strukturalnego. Relacje nie kopiują faktów, pomiarów, parametrów ani celów.",
    relationType: "Typ relacji",
    targetObject: "Powiązany obiekt",
    add: "Dodaj relację",
    adding: "Dodawanie…",
    loading: "Ładowanie relacji…",
    reload: "Odśwież",
    noCandidates: "Utwórz drugi obiekt obserwacji, aby dodać relację.",
    noRelations: "Nie dodano jeszcze relacji semantycznych.",
    activeRelations: "Aktywne relacje",
    inactiveRelations: "Nieaktywne relacje",
    deactivate: "Dezaktywuj",
    restoring: "Przywracanie…",
    restore: "Przywróć",
    changing: "Zapisywanie…",
    errorPrefix: "Nie udało się zaktualizować relacji semantycznych:",
    candidateHint: "Można łączyć obiekty z różnych gałęzi tego samego aktywnego profilu.",
  },
  ru: {
    description:
      "Добавьте смысловую связь, не меняя структурное дерево. Связи не копируют факты, измерения, параметры или цели.",
    relationType: "Тип связи",
    targetObject: "Связанный объект",
    add: "Добавить связь",
    adding: "Добавление…",
    loading: "Загружаю связи…",
    reload: "Обновить",
    noCandidates: "Создайте ещё один объект наблюдения, чтобы добавить связь.",
    noRelations: "Смысловые связи пока не добавлены.",
    activeRelations: "Активные связи",
    inactiveRelations: "Неактивные связи",
    deactivate: "Деактивировать",
    restoring: "Восстановление…",
    restore: "Восстановить",
    changing: "Сохранение…",
    errorPrefix: "Не удалось изменить смысловые связи:",
    candidateHint: "Можно связывать объекты из разных ветвей одного активного профиля.",
  },
  uk: {
    description:
      "Додайте смисловий зв’язок, не змінюючи структурне дерево. Зв’язки не копіюють факти, вимірювання, параметри чи цілі.",
    relationType: "Тип зв’язку",
    targetObject: "Пов’язаний об’єкт",
    add: "Додати зв’язок",
    adding: "Додавання…",
    loading: "Завантаження зв’язків…",
    reload: "Оновити",
    noCandidates: "Створіть ще один об’єкт спостереження, щоб додати зв’язок.",
    noRelations: "Смислові зв’язки ще не додані.",
    activeRelations: "Активні зв’язки",
    inactiveRelations: "Неактивні зв’язки",
    deactivate: "Деактивувати",
    restoring: "Відновлення…",
    restore: "Відновити",
    changing: "Збереження…",
    errorPrefix: "Не вдалося змінити смислові зв’язки:",
    candidateHint: "Можна пов’язувати об’єкти з різних гілок одного активного профілю.",
  },
  de: {
    description:
      "Fügen Sie eine inhaltliche Beziehung hinzu, ohne den Strukturbaum zu ändern. Beziehungen kopieren keine Fakten, Messungen, Parameter oder Ziele.",
    relationType: "Beziehungstyp",
    targetObject: "Verbundenes Objekt",
    add: "Beziehung hinzufügen",
    adding: "Wird hinzugefügt…",
    loading: "Beziehungen werden geladen…",
    reload: "Neu laden",
    noCandidates: "Erstellen Sie ein weiteres Beobachtungsobjekt, um eine Beziehung hinzuzufügen.",
    noRelations: "Es wurden noch keine semantischen Beziehungen hinzugefügt.",
    activeRelations: "Aktive Beziehungen",
    inactiveRelations: "Inaktive Beziehungen",
    deactivate: "Deaktivieren",
    restoring: "Wiederherstellung…",
    restore: "Wiederherstellen",
    changing: "Speichern…",
    errorPrefix: "Semantische Beziehungen konnten nicht aktualisiert werden:",
    candidateHint: "Objekte aus verschiedenen Zweigen desselben aktiven Profils können verbunden werden.",
  },
  es: {
    description:
      "Añade una relación de significado sin cambiar el árbol estructural. Las relaciones no copian hechos, mediciones, parámetros ni objetivos.",
    relationType: "Tipo de relación",
    targetObject: "Objeto relacionado",
    add: "Añadir relación",
    adding: "Añadiendo…",
    loading: "Cargando relaciones…",
    reload: "Recargar",
    noCandidates: "Crea otro objeto de observación para añadir una relación.",
    noRelations: "Todavía no se han añadido relaciones semánticas.",
    activeRelations: "Relaciones activas",
    inactiveRelations: "Relaciones inactivas",
    deactivate: "Desactivar",
    restoring: "Restaurando…",
    restore: "Restaurar",
    changing: "Guardando…",
    errorPrefix: "No se pudieron actualizar las relaciones semánticas:",
    candidateHint: "Se pueden relacionar objetos de distintas ramas del mismo perfil activo.",
  },
  cs: {
    description:
      "Přidejte významový vztah bez změny strukturálního stromu. Vztahy nekopírují fakta, měření, parametry ani cíle.",
    relationType: "Typ vztahu",
    targetObject: "Související objekt",
    add: "Přidat vztah",
    adding: "Přidávání…",
    loading: "Načítání vztahů…",
    reload: "Obnovit",
    noCandidates: "Nejprve vytvořte další objekt pozorování.",
    noRelations: "Dosud nebyly přidány žádné sémantické vztahy.",
    activeRelations: "Aktivní vztahy",
    inactiveRelations: "Neaktivní vztahy",
    deactivate: "Deaktivovat",
    restoring: "Obnovování…",
    restore: "Obnovit",
    changing: "Ukládání…",
    errorPrefix: "Sémantické vztahy se nepodařilo aktualizovat:",
    candidateHint: "Lze propojit objekty z různých větví stejného aktivního profilu.",
  },
};

function buildLocaleHref(
  pathname: string,
  locale: ValueObjectSemanticRelationLocale,
) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function createIdempotencyKey(action: string) {
  return `p10:${action}:${crypto.randomUUID()}`;
}

export function ValueObjectSemanticRelationsManager({
  valueObjectId,
  locale,
}: Props) {
  const copy = COPY[locale];
  const [data, setData] = useState<ValueObjectSemanticRelationListResponse>();
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [relationTypeCode, setRelationTypeCode] = useState("");
  const [targetValueObjectId, setTargetValueObjectId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/relations`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );
      const nextData =
        (await response.json()) as ValueObjectSemanticRelationListResponse;

      if (!response.ok || !nextData.ok) {
        throw new Error(nextData.error || `HTTP ${response.status}`);
      }

      setData(nextData);
      setRelationTypeCode((current) =>
        current || nextData.relationTypes?.[0]?.relationTypeCode || "",
      );
      setTargetValueObjectId((current) =>
        current || nextData.candidates?.[0]?.id || "",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown relation read error",
      );
    } finally {
      setLoading(false);
    }
  }, [valueObjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const relationTypesByCode = useMemo(
    () =>
      new Map(
        (data?.relationTypes ?? []).map((relationType) => [
          relationType.relationTypeCode,
          relationType,
        ]),
      ),
    [data?.relationTypes],
  );
  const activeRelations = (data?.relations ?? []).filter(
    (relation) => relation.status === "active",
  );
  const inactiveRelations = (data?.relations ?? []).filter(
    (relation) => relation.status === "inactive",
  );

  async function addRelation() {
    if (!relationTypeCode || !targetValueObjectId) {
      return;
    }

    setPendingAction("create");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/relations`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetValueObjectId,
            relationTypeCode,
            provenanceCode: "manual",
            idempotencyKey: createIdempotencyKey("create"),
          }),
        },
      );
      const result =
        (await response.json()) as ValueObjectSemanticRelationMutationResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown relation write error",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function changeStatus(
    relation: ValueObjectSemanticRelationDto,
    status: "active" | "inactive",
  ) {
    setPendingAction(`${relation.id}:${status}`);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/relations/${encodeURIComponent(relation.id)}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            idempotencyKey: createIdempotencyKey(status),
          }),
        },
      );
      const result =
        (await response.json()) as ValueObjectSemanticRelationMutationResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown relation status error",
      );
    } finally {
      setPendingAction(null);
    }
  }

  function renderRelation(relation: ValueObjectSemanticRelationDto) {
    const relationType = relationTypesByCode.get(relation.relationTypeCode) ?? {
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
    } satisfies ValueObjectRelationTypeDto;
    const title = resolveSemanticRelationTitle(
      relationType,
      locale,
      relation.perspective,
    );
    const description = resolveSemanticRelationDescription(
      relationType,
      locale,
      relation.perspective,
    );
    const arrow = relation.perspective === "incoming"
      ? "←"
      : relation.perspective === "symmetric"
        ? "↔"
        : "→";
    const pending = pendingAction?.startsWith(`${relation.id}:`) ?? false;

    return (
      <div
        key={relation.id}
        className="rounded-2xl border border-[#e7eaf3] bg-[#fafbff] p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
              {relation.relationTypeCode} · {relation.status} · {relation.provenanceCode}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[15px] font-bold text-[#111827]">
              <span>{title}</span>
              <span className="text-[#8b5cf6]">{arrow}</span>
              <Link
                href={buildLocaleHref(
                  `/value-objects/${relation.relatedValueObject.id}`,
                  locale,
                )}
                className="truncate text-[#3b6ef8] hover:underline"
              >
                {relation.relatedValueObject.title}
              </Link>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[#626881]">
              {description}
            </p>
            <div className="mt-2 font-mono text-[10px] text-[#8a90a8]">
              {relation.relatedValueObject.branchTypeCode || "—"} · {relation.relatedValueObject.nodeRoleCode || "—"}
            </div>
          </div>

          {relation.canDeactivate ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void changeStatus(relation, "inactive")}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-[#eadcff] bg-white px-3 py-2 text-[12px] font-bold text-[#8b5cf6] transition hover:bg-[#f7f1ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? copy.changing : copy.deactivate}
            </button>
          ) : relation.canReactivate ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void changeStatus(relation, "active")}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe4ff] bg-white px-3 py-2 text-[12px] font-bold text-[#3b6ef8] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? copy.restoring : copy.restore}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="mt-3 text-[14px] text-[#5a5f7a]">{copy.loading}</p>;
  }

  if (!data?.ok) {
    return (
      <div className="mt-3 rounded-2xl border border-[#ffd7d7] bg-[#fff7f7] p-4">
        <p className="text-[13px] text-[#a33a3a]">
          {copy.errorPrefix} {errorMessage || "Unknown error"}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-xl border border-[#f1bcbc] bg-white px-3 py-2 text-[12px] font-bold text-[#a33a3a]"
        >
          {copy.reload}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-4">
      <p className="text-[13px] leading-5 text-[#5a5f7a]">{copy.description}</p>

      {(data.candidates?.length ?? 0) > 0 &&
      (data.relationTypes?.length ?? 0) > 0 ? (
        <div className="grid gap-3 rounded-2xl border border-[#e8e4ff] bg-[#fbfaff] p-4">
          <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">
            {copy.relationType}
            <select
              value={relationTypeCode}
              onChange={(event) => setRelationTypeCode(event.target.value)}
              className="min-h-11 rounded-xl border border-[#dfe4f2] bg-white px-3 text-[13px] font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#8b5cf6]"
            >
              {(data.relationTypes ?? []).map((relationType) => (
                <option
                  key={relationType.relationTypeCode}
                  value={relationType.relationTypeCode}
                >
                  {resolveSemanticRelationTitle(relationType, locale)} · {relationType.relationTypeCode}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c8099]">
            {copy.targetObject}
            <select
              value={targetValueObjectId}
              onChange={(event) => setTargetValueObjectId(event.target.value)}
              className="min-h-11 rounded-xl border border-[#dfe4f2] bg-white px-3 text-[13px] font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#8b5cf6]"
            >
              {(data.candidates ?? []).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title} · {candidate.branchTypeCode || "—"}
                </option>
              ))}
            </select>
          </label>

          <p className="text-[11px] leading-5 text-[#7c8099]">{copy.candidateHint}</p>

          <button
            type="button"
            disabled={pendingAction !== null || !relationTypeCode || !targetValueObjectId}
            onClick={() => void addRelation()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(59,110,248,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "create" ? copy.adding : copy.add}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-4 text-[13px] leading-5 text-[#5a5f7a]">
          {copy.noCandidates}
        </div>
      )}

      {errorMessage ? (
        <div className="rounded-2xl border border-[#ffd7d7] bg-[#fff7f7] p-3 text-[12px] text-[#a33a3a]">
          {copy.errorPrefix} {errorMessage}
        </div>
      ) : null}

      {activeRelations.length === 0 && inactiveRelations.length === 0 ? (
        <p className="text-[13px] leading-5 text-[#5a5f7a]">{copy.noRelations}</p>
      ) : null}

      {activeRelations.length > 0 ? (
        <div className="grid gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3b6ef8]">
            {copy.activeRelations} · {activeRelations.length}
          </div>
          {activeRelations.map(renderRelation)}
        </div>
      ) : null}

      {inactiveRelations.length > 0 ? (
        <details className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
            {copy.inactiveRelations} · {inactiveRelations.length}
          </summary>
          <div className="mt-3 grid gap-3">
            {inactiveRelations.map(renderRelation)}
          </div>
        </details>
      ) : null}
    </div>
  );
}
