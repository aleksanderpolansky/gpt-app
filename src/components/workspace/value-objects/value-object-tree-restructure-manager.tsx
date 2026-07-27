"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  VALUE_OBJECT_KINDS_V2,
  type ValueObjectKindV2,
} from "@/types/reality-core/reality-core-contracts-v2";
import type {
  InsertIntermediateTreePayload,
  ReparentTreePayload,
  ValueObjectTreeRestructureApplyResult,
  ValueObjectTreeRestructureContext,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRestructureMode,
  ValueObjectTreeRestructurePayload,
  ValueObjectTreeRestructurePreview,
  ValueObjectTreeRollbackResult,
} from "@/types/value-object-tree-restructure";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Props = {
  valueObjectId: string;
  locale: LocaleCode;
};

type Copy = {
  loading: string;
  loadError: string;
  reparent: string;
  insertIntermediate: string;
  currentObject: string;
  currentPathHint: string;
  newParent: string;
  becomeRoot: string;
  rootLeafBlocked: string;
  selectedChildren: string;
  noChildren: string;
  title: string;
  description: string;
  objectKind: string;
  preview: string;
  previewing: string;
  apply: string;
  applying: string;
  resetPreview: string;
  oldPath: string;
  newPath: string;
  affected: string;
  warnings: string;
  noWarnings: string;
  recentOperations: string;
  noOperations: string;
  rollback: string;
  rollingBack: string;
  applied: string;
  rolledBack: string;
  operation: string;
  back: string;
  staleHint: string;
};

const EN_COPY: Copy = {
  loading: "Loading controlled tree context…",
  loadError: "Could not load the tree context.",
  reparent: "Move existing object",
  insertIntermediate: "Insert intermediate object",
  currentObject: "Current object",
  currentPathHint:
    "The preview is read-only. Apply is allowed only after the same preview hash is confirmed.",
  newParent: "New structural parent",
  becomeRoot: "No parent / make this structural object a root",
  rootLeafBlocked: "A leaf cannot become a root.",
  selectedChildren: "Direct children to place under the new intermediate",
  noChildren: "This structural object has no direct children.",
  title: "Intermediate object name",
  description: "Description",
  objectKind: "Object kind",
  preview: "Build preview",
  previewing: "Building preview…",
  apply: "Confirm and apply atomically",
  applying: "Applying…",
  resetPreview: "Change inputs",
  oldPath: "Old path",
  newPath: "New path",
  affected: "Objects whose path is affected",
  warnings: "Warnings",
  noWarnings: "No additional warnings.",
  recentOperations: "Recent controlled operations",
  noOperations: "No controlled operations for this object yet.",
  rollback: "Rollback",
  rollingBack: "Rolling back…",
  applied: "Operation applied.",
  rolledBack: "Operation rolled back.",
  operation: "Operation",
  back: "Back to object",
  staleHint:
    "If the tree changed after preview, apply is rejected and a fresh preview is required.",
};

const RU_COPY: Copy = {
  loading: "Загружаю контекст безопасной перестройки…",
  loadError: "Не удалось загрузить контекст дерева.",
  reparent: "Переместить существующий объект",
  insertIntermediate: "Вставить промежуточный объект",
  currentObject: "Текущий объект",
  currentPathHint:
    "Предпросмотр ничего не записывает. Применение разрешено только для подтверждённого хэша этого же предпросмотра.",
  newParent: "Новый структурный родитель",
  becomeRoot: "Без родителя / сделать структурный объект корнем",
  rootLeafBlocked: "Листовой объект нельзя превратить в корень.",
  selectedChildren: "Прямые дети, которые перейдут под новый промежуточный объект",
  noChildren: "У этого структурного объекта нет прямых детей.",
  title: "Название промежуточного объекта",
  description: "Описание",
  objectKind: "Вид объекта",
  preview: "Показать предварительный результат",
  previewing: "Строю предпросмотр…",
  apply: "Подтвердить и применить атомарно",
  applying: "Применяю…",
  resetPreview: "Изменить параметры",
  oldPath: "Старый путь",
  newPath: "Новый путь",
  affected: "Объекты, путь которых изменится",
  warnings: "Предупреждения",
  noWarnings: "Дополнительных предупреждений нет.",
  recentOperations: "Последние контролируемые операции",
  noOperations: "Для этого объекта контролируемых операций ещё не было.",
  rollback: "Откатить",
  rollingBack: "Откатываю…",
  applied: "Операция применена.",
  rolledBack: "Операция отменена безопасным откатом.",
  operation: "Операция",
  back: "Назад к объекту",
  staleHint:
    "Если дерево изменится после предпросмотра, запись будет отклонена и потребуется новый предпросмотр.",
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN_COPY,
  pl: EN_COPY,
  ru: RU_COPY,
  uk: RU_COPY,
  de: EN_COPY,
  es: EN_COPY,
  cs: EN_COPY,
};

const STRUCTURAL_OBJECT_KINDS = VALUE_OBJECT_KINDS_V2.filter(
  (value): value is ValueObjectKindV2 => value !== "activity_pattern",
);

function buildLocaleHref(path: string, locale: LocaleCode) {
  return locale === "en" ? path : `${path}?locale=${encodeURIComponent(locale)}`;
}

function createIdempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readableError(value: unknown, fallback: string) {
  if (value instanceof Error) {
    return value.message;
  }

  return fallback;
}

function operationLabel(operationType: string) {
  if (operationType === "insert_intermediate") {
    return "insert intermediate";
  }

  return operationType;
}

export function ValueObjectTreeRestructureManager({
  valueObjectId,
  locale,
}: Props) {
  const copy = COPY[locale];
  const [context, setContext] = useState<ValueObjectTreeRestructureContext | null>(null);
  const [mode, setMode] = useState<ValueObjectTreeRestructureMode>("reparent");
  const [newParentId, setNewParentId] = useState("");
  const [childIds, setChildIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectKind, setObjectKind] = useState<ValueObjectKindV2>("other");
  const [preview, setPreview] = useState<ValueObjectTreeRestructurePreview | null>(null);
  const [result, setResult] = useState<ValueObjectTreeRestructureApplyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"preview" | "apply" | "rollback" | null>(null);
  const [rollbackOperationId, setRollbackOperationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/tree-restructure/preview`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as
        | ValueObjectTreeRestructureContext
        | ValueObjectTreeRestructureError;

      if (!response.ok || !("current" in data)) {
        throw new Error("error" in data ? data.error : copy.loadError);
      }

      setContext(data);
      setNewParentId(data.current.parentValueObjectId ?? "");
      setObjectKind(
        STRUCTURAL_OBJECT_KINDS.includes(
          data.current.objectKind as ValueObjectKindV2,
        )
          ? (data.current.objectKind as ValueObjectKindV2)
          : "other",
      );
    } catch (error) {
      setErrorMessage(readableError(error, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, valueObjectId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const payload = useMemo<ValueObjectTreeRestructurePayload>(() => {
    if (mode === "reparent") {
      return {
        newParentValueObjectId: newParentId || null,
      } satisfies ReparentTreePayload;
    }

    return {
      childValueObjectIds: childIds,
      title: title.trim(),
      description: description.trim() || null,
      objectKind,
    } satisfies InsertIntermediateTreePayload;
  }, [childIds, description, mode, newParentId, objectKind, title]);

  function invalidatePreview() {
    setPreview(null);
    setResult(null);
    setMessage(null);
    setErrorMessage(null);
  }

  async function buildPreview() {
    setPendingAction("preview");
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/tree-restructure/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, payload }),
        },
      );
      const data = (await response.json()) as
        | ValueObjectTreeRestructurePreview
        | ValueObjectTreeRestructureError;

      if (!response.ok || !("previewHash" in data)) {
        throw new Error("error" in data ? data.error : "Preview failed");
      }

      setPreview(data);
    } catch (error) {
      setErrorMessage(readableError(error, "Preview failed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function applyPreview() {
    if (!preview) {
      return;
    }

    setPendingAction("apply");
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/tree-restructure/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            payload,
            previewHash: preview.previewHash,
            idempotencyKey: createIdempotencyKey("p8-tree-apply"),
          }),
        },
      );
      const data = (await response.json()) as
        | ValueObjectTreeRestructureApplyResult
        | ValueObjectTreeRestructureError;

      if (!response.ok || !("operationId" in data)) {
        throw new Error("error" in data ? data.error : "Apply failed");
      }

      setResult(data);
      setMessage(copy.applied);
      await loadContext();
    } catch (error) {
      setErrorMessage(readableError(error, "Apply failed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function rollback(operationId: string) {
    setPendingAction("rollback");
    setRollbackOperationId(operationId);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/tree-restructure/${encodeURIComponent(operationId)}/rollback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: createIdempotencyKey("p8-tree-rollback"),
          }),
        },
      );
      const data = (await response.json()) as
        | ValueObjectTreeRollbackResult
        | ValueObjectTreeRestructureError;

      if (!response.ok || !("rollbackOperationId" in data)) {
        throw new Error("error" in data ? data.error : "Rollback failed");
      }

      setPreview(null);
      setResult(null);
      setMessage(copy.rolledBack);
      await loadContext();
    } catch (error) {
      setErrorMessage(readableError(error, "Rollback failed"));
    } finally {
      setPendingAction(null);
      setRollbackOperationId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
        {copy.loading}
      </div>
    );
  }

  if (!context) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {errorMessage || copy.loadError}
      </div>
    );
  }

  const canBecomeRoot = context.current.nodeRoleCode === "structural";
  const insertDisabled = context.current.nodeRoleCode !== "structural";

  return (
    <div className="grid gap-5">
      <section className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3b6ef8]">
              {copy.currentObject}
            </div>
            <h2 className="mt-2 text-[24px] font-bold text-[#111827]">
              {context.current.title}
            </h2>
            <p className="mt-2 text-[13px] text-[#5a5f7a]">
              {context.current.nodeRoleCode} · {context.current.objectKind} · {context.current.branchTypeCode}
            </p>
            <p className="mt-3 max-w-[760px] text-[13px] leading-5 text-[#5a5f7a]">
              {copy.currentPathHint}
            </p>
          </div>

          <Link
            href={buildLocaleHref(`/value-objects/${context.current.id}`, locale)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
          >
            {copy.back}
          </Link>
        </div>
      </section>

      <section className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode("reparent");
              invalidatePreview();
            }}
            className={`rounded-2xl border px-4 py-4 text-left text-[14px] font-bold transition ${
              mode === "reparent"
                ? "border-[#9fb4ff] bg-[#eef2ff] text-[#315bd8]"
                : "border-[#e5e7eb] bg-white text-[#4a4f6a] hover:bg-[#f8fafc]"
            }`}
          >
            {copy.reparent}
          </button>
          <button
            type="button"
            disabled={insertDisabled}
            title={insertDisabled ? copy.rootLeafBlocked : undefined}
            onClick={() => {
              setMode("insert_intermediate");
              invalidatePreview();
            }}
            className={`rounded-2xl border px-4 py-4 text-left text-[14px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === "insert_intermediate"
                ? "border-[#cdb7ff] bg-[#f7f1ff] text-[#7c3aed]"
                : "border-[#e5e7eb] bg-white text-[#4a4f6a] hover:bg-[#f8fafc]"
            }`}
          >
            {copy.insertIntermediate}
          </button>
        </div>

        {mode === "reparent" ? (
          <div className="mt-5">
            <label className="block text-[13px] font-bold text-[#343854]">
              {copy.newParent}
              <select
                value={newParentId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  setNewParentId(event.target.value);
                  invalidatePreview();
                }}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 py-3 text-[14px] text-[#111827] outline-none focus:border-[#9fb4ff]"
              >
                {canBecomeRoot ? (
                  <option value="">{copy.becomeRoot}</option>
                ) : null}
                {!canBecomeRoot && !newParentId ? (
                  <option value="" disabled>
                    {copy.rootLeafBlocked}
                  </option>
                ) : null}
                {context.candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title} · {candidate.nodeRoleCode}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div>
              <div className="text-[13px] font-bold text-[#343854]">
                {copy.selectedChildren}
              </div>
              {context.directChildren.length === 0 ? (
                <div className="mt-2 rounded-xl border border-dashed border-[#dfe3f1] bg-[#f8fafc] p-4 text-[13px] text-[#5a5f7a]">
                  {copy.noChildren}
                </div>
              ) : (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {context.directChildren.map((child) => (
                    <label
                      key={child.id}
                      className="flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-[#fafbff] p-3 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={childIds.includes(child.id)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          setChildIds((current) =>
                            event.target.checked
                              ? [...current, child.id]
                              : current.filter((id) => id !== child.id),
                          );
                          invalidatePreview();
                        }}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="font-bold text-[#111827]">{child.title}</span>
                        <span className="mt-1 block text-[#7c8099]">
                          {child.nodeRoleCode} · {child.objectKind}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="block text-[13px] font-bold text-[#343854]">
              {copy.title}
              <input
                value={title}
                maxLength={180}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setTitle(event.target.value);
                  invalidatePreview();
                }}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] px-3 py-3 text-[14px] outline-none focus:border-[#cdb7ff]"
              />
            </label>

            <label className="block text-[13px] font-bold text-[#343854]">
              {copy.description}
              <textarea
                value={description}
                maxLength={4000}
                rows={4}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                  setDescription(event.target.value);
                  invalidatePreview();
                }}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] px-3 py-3 text-[14px] outline-none focus:border-[#cdb7ff]"
              />
            </label>

            <label className="block text-[13px] font-bold text-[#343854]">
              {copy.objectKind}
              <select
                value={objectKind}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  setObjectKind(event.target.value as ValueObjectKindV2);
                  invalidatePreview();
                }}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#cdb7ff]"
              >
                {STRUCTURAL_OBJECT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              pendingAction !== null ||
              (mode === "insert_intermediate" &&
                (childIds.length === 0 || !title.trim()))
            }
            onClick={() => void buildPreview()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b6ef8] px-5 py-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendingAction === "preview" ? copy.previewing : copy.preview}
          </button>
          {preview ? (
            <button
              type="button"
              onClick={invalidatePreview}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a]"
            >
              {copy.resetPreview}
            </button>
          ) : null}
        </div>
      </section>

      {preview ? (
        <section className="rounded-[24px] border border-[#c9d5ff] bg-[#f7f9ff] p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-[14px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.oldPath}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#343854]">
                {preview.oldPath.map((node, index) => (
                  <span key={`${node.id}-${index}`}>
                    {index > 0 ? " → " : ""}
                    {node.title}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.newPath}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#343854]">
                {preview.newPath.map((node, index) => (
                  <span key={`${node.id ?? "proposed"}-${index}`}>
                    {index > 0 ? " → " : ""}
                    {node.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[14px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
              {copy.affected}: {preview.affectedNodes.length}
            </h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {preview.affectedNodes.map((node) => (
                <div key={node.id} className="rounded-xl border border-[#e3e8ff] bg-white p-3">
                  <div className="font-bold text-[#111827]">{node.title}</div>
                  <div className="mt-1 text-[12px] text-[#7c8099]">
                    depth {node.depth ?? 0} · {node.nodeRoleCode}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#e3e8ff] bg-white p-4">
            <div className="text-[13px] font-bold text-[#343854]">{copy.warnings}</div>
            {preview.warnings.length > 0 ? (
              <ul className="mt-2 grid gap-1 text-[13px] leading-5 text-[#5a5f7a]">
                {preview.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-[#5a5f7a]">{copy.noWarnings}</p>
            )}
            <p className="mt-3 text-[12px] text-[#7c8099]">{copy.staleHint}</p>
            <div className="mt-2 break-all font-mono text-[11px] text-[#7c8099]">
              previewHash={preview.previewHash}
            </div>
          </div>

          <button
            type="button"
            disabled={pendingAction !== null || preview.stateAlreadySatisfied}
            onClick={() => void applyPreview()}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#111827] px-5 py-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendingAction === "apply" ? copy.applying : copy.apply}
          </button>
        </section>
      ) : null}

      {result ? (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
          <div className="text-[13px] font-bold">{copy.applied}</div>
          <div className="mt-2 break-all font-mono text-[12px]">
            operationId={result.operationId}
          </div>
          <Link
            href={buildLocaleHref(`/value-objects/${result.redirectValueObjectId}`, locale)}
            className="mt-4 inline-flex rounded-xl border border-emerald-300 bg-white px-4 py-3 text-[13px] font-bold text-emerald-800"
          >
            {copy.back}
          </Link>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
        <h2 className="text-[20px] font-bold text-[#111827]">{copy.recentOperations}</h2>
        {context.recentOperations.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#5a5f7a]">{copy.noOperations}</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {context.recentOperations.map((operation) => (
              <div
                key={operation.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-[#fafbff] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-[13px] font-bold text-[#111827]">
                    {copy.operation}: {operationLabel(operation.operationType)} · {operation.status}
                  </div>
                  <div className="mt-1 break-all font-mono text-[11px] text-[#7c8099]">
                    {operation.id}
                  </div>
                </div>
                {operation.status === "applied" && operation.operationType !== "rollback" ? (
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => void rollback(operation.id)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-[13px] font-bold text-rose-700 disabled:opacity-40"
                  >
                    {pendingAction === "rollback" && rollbackOperationId === operation.id
                      ? copy.rollingBack
                      : copy.rollback}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
