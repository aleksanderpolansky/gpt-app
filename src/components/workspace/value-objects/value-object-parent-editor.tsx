"use client";

import { useEffect, useMemo, useState } from "react";

type ValueObjectListItem = {
  id: string;
  parent_value_object_id?: string | null;
  title?: string | null;
  status?: string | null;
  value_type?: string | null;
  usage_scope?: string | null;
};

type ValueObjectReadResponse = {
  ok?: boolean;
  valueObject?: ValueObjectListItem;
  error?: string;
};

type ValueObjectListResponse = {
  ok?: boolean;
  valueObjects?: ValueObjectListItem[];
  error?: string;
};

type ValueObjectParentEditorProps = {
  readonly valueObjectId: string;
};

const collectDescendantIds = (
  valueObjects: readonly ValueObjectListItem[],
  rootValueObjectId: string,
): ReadonlySet<string> => {
  const descendants = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;

    for (const valueObject of valueObjects) {
      const parentValueObjectId = valueObject.parent_value_object_id ?? null;

      if (
        parentValueObjectId &&
        (parentValueObjectId === rootValueObjectId ||
          descendants.has(parentValueObjectId)) &&
        !descendants.has(valueObject.id)
      ) {
        descendants.add(valueObject.id);
        changed = true;
      }
    }
  }

  return descendants;
};

const getValueObjectTitle = (valueObject: ValueObjectListItem): string =>
  valueObject.title?.trim() || "Без названия";

export function ValueObjectParentEditor({
  valueObjectId,
}: ValueObjectParentEditorProps) {
  const [valueObjects, setValueObjects] = useState<ValueObjectListItem[]>([]);
  const [selectedParentValueObjectId, setSelectedParentValueObjectId] =
    useState("");
  const [savedParentValueObjectId, setSavedParentValueObjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadParentEditorData() {
      setIsLoading(true);
      setErrorMessage(null);
      setMessage(null);

      try {
        const [currentResponse, listResponse] = await Promise.all([
          fetch(`/api/value-objects/${encodeURIComponent(valueObjectId)}`, {
            cache: "no-store",
          }),
          fetch("/api/value-objects", {
            cache: "no-store",
          }),
        ]);

        const currentJson =
          (await currentResponse.json()) as ValueObjectReadResponse;
        const listJson = (await listResponse.json()) as ValueObjectListResponse;

        if (!currentResponse.ok || !currentJson.valueObject) {
          throw new Error(
            currentJson.error ?? "Не удалось загрузить текущий ценный объект.",
          );
        }

        if (!listResponse.ok || !Array.isArray(listJson.valueObjects)) {
          throw new Error(
            listJson.error ?? "Не удалось загрузить список ценных объектов.",
          );
        }

        const currentParentValueObjectId =
          currentJson.valueObject.parent_value_object_id ?? "";

        if (!isMounted) {
          return;
        }

        setValueObjects(listJson.valueObjects);
        setSelectedParentValueObjectId(currentParentValueObjectId);
        setSavedParentValueObjectId(currentParentValueObjectId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить редактор родителя.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadParentEditorData();

    return () => {
      isMounted = false;
    };
  }, [valueObjectId]);

  const parentCandidates = useMemo(() => {
    const descendantIds = collectDescendantIds(valueObjects, valueObjectId);

    return valueObjects
      .filter((valueObject) => valueObject.id !== valueObjectId)
      .filter((valueObject) => !descendantIds.has(valueObject.id))
      .sort((firstValueObject, secondValueObject) =>
        getValueObjectTitle(firstValueObject).localeCompare(
          getValueObjectTitle(secondValueObject),
        ),
      );
  }, [valueObjectId, valueObjects]);

  const selectedParentTitle =
    parentCandidates.find(
      (valueObject) => valueObject.id === savedParentValueObjectId,
    )?.title ?? null;

  const hasUnsavedChange =
    selectedParentValueObjectId !== savedParentValueObjectId;

  async function handleSaveParentValueObject() {
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parentValueObjectId: selectedParentValueObjectId || null,
          }),
        },
      );

      const responseJson = (await response.json()) as ValueObjectReadResponse;

      if (!response.ok || !responseJson.valueObject) {
        throw new Error(
          responseJson.error ?? "Не удалось сохранить родительский объект.",
        );
      }

      const nextParentValueObjectId =
        responseJson.valueObject.parent_value_object_id ?? "";

      setSelectedParentValueObjectId(nextParentValueObjectId);
      setSavedParentValueObjectId(nextParentValueObjectId);
      setMessage("Родительский ценный объект сохранён.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить родительский объект.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Иерархия
        </p>
        <h2 className="text-lg font-semibold text-slate-950">
          Родительский ценный объект
        </h2>
        <p className="text-sm text-slate-600">
          Текущий объект может быть верхним уровнем или дочерним объектом другого
          Value Object. Дочерние объекты не хранятся отдельным списком — они
          вычисляются по parent_value_object_id.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Родитель
          <select
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={isLoading || isSaving}
            value={selectedParentValueObjectId}
            onChange={(event) => {
              setSelectedParentValueObjectId(event.target.value);
              setMessage(null);
              setErrorMessage(null);
            }}
          >
            <option value="">Без родителя / верхний уровень</option>
            {parentCandidates.map((valueObject) => (
              <option key={valueObject.id} value={valueObject.id}>
                {getValueObjectTitle(valueObject)}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Сейчас:{" "}
          <span className="font-medium text-slate-900">
            {savedParentValueObjectId
              ? selectedParentTitle || savedParentValueObjectId
              : "верхний уровень"}
          </span>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isLoading || isSaving || !hasUnsavedChange}
          onClick={() => {
            void handleSaveParentValueObject();
          }}
        >
          {isSaving ? "Сохраняю..." : "Сохранить родителя"}
        </button>
      </div>
    </section>
  );
}