"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LocaleCode } from "@/i18n";

type ScopeCode = "private" | "system";
type NodeRoleCode = "root" | "intermediate" | "leaf";
type DecisionCode =
  | "existing_leaf_found"
  | "new_leaf_required"
  | "parameter_not_assigned"
  | "needs_clarification";

type Option = {
  id: string;
  title: string;
  canonicalKey: string | null;
  facetCode: string | null;
  nodeRole: NodeRoleCode | null;
  scopeCode: "actor" | "global";
  status: string;
};

type CreationItem = {
  id: string;
  scope: ScopeCode | null;
  nodeRole: NodeRoleCode | null;
  valueObjectId: string | null;
  canonicalKey: string | null;
  title: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
  completedTargetLeaf: boolean;
};

type BootstrapState = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  activeProfile?: {
    actorId: string;
    displayName: string;
  };
  decision?: {
    completed: boolean;
    result: DecisionCode | null;
    selectedValueObjectId: string | null;
    resultSummaryRu: string | null;
    resultSummaryEn: string | null;
  };
  creation?: {
    completed: boolean;
    targetLeaf: CreationItem | null;
    history: CreationItem[];
  };
  existingLeaves?: Option[];
  privateParents?: Option[];
  systemParents?: Option[];
  facetOptions?: string[];
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  onChanged: () => void;
};

type Copy = {
  title: string;
  hint: string;
  existing: string;
  create: string;
  noAssign: string;
  clarify: string;
  comment: string;
  commentHint: string;
  existingObject: string;
  chooseExisting: string;
  saveDecision: string;
  saving: string;
  decisionDone: string;
  scopeTitle: string;
  scopeHint: string;
  privateLabel: string;
  privateHint: string;
  system: string;
  systemHint: string;
  activeProfile: string;
  roleTitle: string;
  roleHint: string;
  root: string;
  intermediate: string;
  leaf: string;
  rootHint: string;
  intermediateHint: string;
  leafHint: string;
  parent: string;
  chooseParent: string;
  facet: string;
  facetHint: string;
  chooseFacet: string;
  privateTitle: string;
  privateDescription: string;
  canonicalKey: string;
  canonicalKeyHint: string;
  titleRu: string;
  descriptionRu: string;
  titleEn: string;
  descriptionEn: string;
  relation: string;
  chooseRelation: string;
  relationPartOf: string;
  relationIsA: string;
  relationAspectOf: string;
  relationSubprocessOf: string;
  createComment: string;
  createCommentHint: string;
  createObject: string;
  createdFinal: string;
  pathHistory: string;
  continuePath: string;
  openObject: string;
  openCatalog: string;
  loading: string;
  loadError: string;
};

const EN: Copy = {
  title: "Determine the measurable object",
  hint: "Determine which leaf observation object should receive the identified parameter. If the path is missing, build it as root → intermediate → … → leaf. System/Private is a property of every object and does not replace its structural role.",
  existing: "Suitable leaf found",
  create: "A new leaf is required",
  noAssign: "The parameter should not be assigned to an object",
  clarify: "Clarification required",
  comment: "Decision comment",
  commentHint: "Briefly record why this option is correct.",
  existingObject: "Existing leaf",
  chooseExisting: "Choose an existing leaf…",
  saveDecision: "Record decision",
  saving: "Saving…",
  decisionDone: "Measurable-object decision recorded",
  scopeTitle: "Object access property",
  scopeHint: "Choose explicitly for every object. Nothing is preselected. Private is visible only to your current profile; System is created by the curator for all users after publication.",
  privateLabel: "Private",
  privateHint: "Created as an ordinary object of the curator's current active profile. Only that user can see and use it.",
  system: "System",
  systemHint: "Created as an ownerless System draft. It remains hidden until a separate system publication step.",
  activeProfile: "Current profile",
  roleTitle: "Structural role",
  roleHint: "This is independent of Private/System. The tree remains root → intermediate → … → leaf.",
  root: "Root",
  intermediate: "Intermediate",
  leaf: "Leaf",
  rootHint: "No parent. Starts a tree.",
  intermediateHint: "May have a root or another intermediate as parent.",
  leafHint: "Terminal object. Its parent must be intermediate.",
  parent: "Parent",
  chooseParent: "Choose a parent…",
  facet: "Semantic facet",
  facetHint: "Required only for a direct child of a root. Deeper nodes inherit the parent's facet.",
  chooseFacet: "Choose a facet…",
  privateTitle: "Name",
  privateDescription: "Description",
  canonicalKey: "Canonical key",
  canonicalKeyHint: "For example: action.walking.step_count. Stable System identifier; immutable after creation.",
  titleRu: "RU name",
  descriptionRu: "RU definition",
  titleEn: "EN name",
  descriptionEn: "EN definition",
  relation: "Relation to parent",
  chooseRelation: "Choose the relation meaning…",
  relationPartOf: "Part of · part_of",
  relationIsA: "Is a · is_a",
  relationAspectOf: "Aspect of · aspect_of",
  relationSubprocessOf: "Subprocess of · subprocess_of",
  createComment: "Creation comment",
  createCommentHint: "Record why this access property, structural role, parent and meaning are correct.",
  createObject: "Create observation object",
  createdFinal: "Target leaf observation object created",
  pathHistory: "Objects created while building this path",
  continuePath: "The structural object was created. Continue the path until the required leaf is created.",
  openObject: "Open object",
  openCatalog: "Open observation objects",
  loading: "Loading the next step…",
  loadError: "Could not load or save the curator step.",
};

const RU: Copy = {
  ...EN,
  title: "Определение измеримого объекта",
  hint: "Определите, какой листовой объект наблюдения должен получать найденный параметр. Если нужного пути ещё нет, постройте его как корневой → промежуточный → … → листовой. Системный/Приватный — свойство каждого ОН и не заменяет его структурную роль.",
  existing: "Подходящий листовой ОН найден",
  create: "Нужен новый листовой ОН",
  noAssign: "Параметр не должен назначаться ОН",
  clarify: "Требуется уточнение",
  comment: "Комментарий к решению",
  commentHint: "Кратко зафиксируйте, почему выбран этот вариант.",
  existingObject: "Найденный листовой ОН",
  chooseExisting: "Выберите существующий лист…",
  saveDecision: "Зафиксировать решение",
  saving: "Сохраняем…",
  decisionDone: "Решение по измеримому объекту зафиксировано",
  scopeTitle: "Свойство доступа ОН",
  scopeHint: "Выбор обязателен для каждого создаваемого ОН. Ничего не выбрано заранее. Приватный видит и использует только текущий пользователь; Системный создаёт куратор для дальнейшего использования всеми пользователями после публикации.",
  privateLabel: "Приватный",
  privateHint: "Создаётся как обычный ОН текущего активного профиля куратора. Только этот пользователь видит и использует его.",
  system: "Системный",
  systemHint: "Создаётся как ownerless системный черновик. До отдельного выпуска он скрыт и не публикуется автоматически.",
  activeProfile: "Текущий профиль",
  roleTitle: "Структурная роль",
  roleHint: "Не зависит от свойства Приватный/Системный. Структура остаётся: корневой → промежуточный → … → листовой.",
  root: "Корневой",
  intermediate: "Промежуточный",
  leaf: "Листовой",
  rootHint: "Родителя нет. Начинает дерево.",
  intermediateHint: "Родителем может быть корень или другой промежуточный ОН.",
  leafHint: "Терминальный ОН. Родителем должен быть промежуточный ОН.",
  parent: "Родитель",
  chooseParent: "Выберите родительский ОН…",
  facet: "Семантическая грань",
  facetHint: "Нужна только для непосредственного потомка корня. Более глубокий ОН наследует грань родителя.",
  chooseFacet: "Выберите грань…",
  privateTitle: "Название",
  privateDescription: "Описание",
  canonicalKey: "Канонический ключ",
  canonicalKeyHint: "Например: action.walking.step_count. Стабильный системный идентификатор; после создания не меняется.",
  titleRu: "Название RU",
  descriptionRu: "Определение RU",
  titleEn: "Название EN",
  descriptionEn: "Определение EN",
  relation: "Связь с родителем",
  chooseRelation: "Выберите смысл связи…",
  relationPartOf: "Является частью · part_of",
  relationIsA: "Является видом · is_a",
  relationAspectOf: "Является аспектом · aspect_of",
  relationSubprocessOf: "Является подпроцессом · subprocess_of",
  createComment: "Комментарий к созданию",
  createCommentHint: "Зафиксируйте основание выбора свойства доступа, структурной роли, родителя и смысла ОН.",
  createObject: "Создать ОН",
  createdFinal: "Целевой листовой объект наблюдения создан",
  pathHistory: "ОН, созданные при построении этого пути",
  continuePath: "Структурный ОН создан. Продолжите путь до требуемого листового объекта.",
  openObject: "Открыть объект",
  openCatalog: "Открыть объекты наблюдения",
  loading: "Загружаем следующий шаг…",
  loadError: "Не удалось загрузить или сохранить шаг куратора.",
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: RU,
  pl: EN,
  uk: EN,
  de: EN,
  es: EN,
  cs: EN,
};

const FACET_LABELS: Record<string, string> = {
  ENTITY: "ENTITY",
  PROCESS: "PROCESS",
  STATE: "STATE",
  RELATIONSHIP: "RELATIONSHIP",
  ROLE: "ROLE",
  KNOWLEDGE: "KNOWLEDGE",
  BEHAVIOR: "BEHAVIOR",
  CONTEXT: "CONTEXT",
};

function localized(ru: string | null | undefined, en: string | null | undefined, locale: LocaleCode) {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function localeHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}locale=${encodeURIComponent(locale)}`;
}

function roleLabel(role: NodeRoleCode | null, copy: Copy) {
  if (role === "root") return copy.root;
  if (role === "intermediate") return copy.intermediate;
  if (role === "leaf") return copy.leaf;
  return "—";
}

export function CuratorObjectBootstrap({ signalId, locale, onChanged }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const [state, setState] = useState<BootstrapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionCode | "">("");
  const [decisionComment, setDecisionComment] = useState("");
  const [existingId, setExistingId] = useState("");
  const [scope, setScope] = useState<ScopeCode | null>(null);
  const [nodeRole, setNodeRole] = useState<NodeRoleCode | null>(null);
  const [parentId, setParentId] = useState("");
  const [facetCode, setFacetCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [canonicalKey, setCanonicalKey] = useState("");
  const [titleRu, setTitleRu] = useState("");
  const [descriptionRu, setDescriptionRu] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [relation, setRelation] = useState("");
  const [creationComment, setCreationComment] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const requestUrl =
      `/api/admin/reality-curator/signals/object-bootstrap?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`;

    void fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as BootstrapState | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || payload?.errorCode || `HTTP_${response.status}`,
          );
        }

        setState(payload);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(cause instanceof Error ? cause.message : "UNKNOWN");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [locale, signalId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reality-curator/signals/object-bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, locale, ...body }),
      });
      const payload = (await response.json().catch(() => null)) as BootstrapState | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
      }
      setState(payload);
      setParentId("");
      setFacetCode("");
      setRelation("");
      setCreationComment("");
      setTitle("");
      setDescription("");
      setCanonicalKey("");
      setTitleRu("");
      setDescriptionRu("");
      setTitleEn("");
      setDescriptionEn("");
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  }

  const existingLeaves = state?.existingLeaves ?? [];
  const allParents =
    scope === "private"
      ? state?.privateParents ?? []
      : scope === "system"
        ? state?.systemParents ?? []
        : [];
  const parents =
    nodeRole === "leaf"
      ? allParents.filter((item) => item.nodeRole === "intermediate")
      : nodeRole === "intermediate"
        ? allParents.filter(
            (item) =>
              item.nodeRole === "root" || item.nodeRole === "intermediate",
          )
        : [];
  const selectedParent = parents.find((item) => item.id === parentId) ?? null;
  const needsFacet =
    nodeRole === "intermediate" && selectedParent?.nodeRole === "root";
  const systemKeyValid = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(
    canonicalKey.trim(),
  );

  const canCreate = (() => {
    if (!scope || !nodeRole || !creationComment.trim()) return false;

    if (nodeRole !== "root") {
      if (!parentId || !relation) return false;
      if (nodeRole === "leaf" && selectedParent?.nodeRole !== "intermediate") {
        return false;
      }
      if (nodeRole === "intermediate" && !selectedParent) return false;
      if (needsFacet && !facetCode) return false;
    }

    if (scope === "private") return Boolean(title.trim());

    return Boolean(
      systemKeyValid &&
        titleRu.trim() &&
        descriptionRu.trim() &&
        titleEn.trim() &&
        descriptionEn.trim(),
    );
  })();

  if (loading) {
    return <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">{copy.loading}</div>;
  }

  if (!state) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{copy.loadError} {error}</div>;
  }

  if (!state.decision?.completed) {
    const decisionValid = Boolean(
      decision &&
      decisionComment.trim() &&
      (decision !== "existing_leaf_found" || existingId),
    );
    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
        <div className="text-sm font-extrabold text-[#263044]">{copy.title}</div>
        <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.hint}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ["existing_leaf_found", copy.existing],
            ["new_leaf_required", copy.create],
            ["parameter_not_assigned", copy.noAssign],
            ["needs_clarification", copy.clarify],
          ] as const).map(([code, label]) => (
            <button key={code} type="button" disabled={busy} onClick={() => setDecision(code)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold ${decision === code ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}>
              {label}
            </button>
          ))}
        </div>
        {decision === "existing_leaf_found" ? (
          <label className="mt-3 block text-xs font-bold text-[#4b5563]">
            {copy.existingObject}
            <select value={existingId} onChange={(event) => setExistingId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
              <option value="">{copy.chooseExisting}</option>
              {existingLeaves.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.scopeCode === "global" ? copy.system : copy.privateLabel}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mt-3 block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.comment}</div>
          <textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value.slice(0, 1500))} placeholder={copy.commentHint} rows={3} className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" />
          <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{decisionComment.length}/1500</div>
        </label>
        <button type="button" disabled={busy || !decisionValid} onClick={() => void post({ action: "record_object_decision", result: decision, selectedValueObjectId: existingId || null, comment: decisionComment })} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          {busy ? copy.saving : copy.saveDecision}
        </button>
        {error ? <div className="mt-2 text-xs text-red-700">{copy.loadError} {error}</div> : null}
      </div>
    );
  }

  if (state.decision.result !== "new_leaf_required") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.decisionDone}</div>
        <div className="mt-1 text-sm leading-5 text-emerald-800">{localized(state.decision.resultSummaryRu, state.decision.resultSummaryEn, locale)}</div>
      </div>
    );
  }

  const history = state.creation?.history ?? [];
  const targetLeaf = state.creation?.targetLeaf ?? null;

  if (state.creation?.completed && targetLeaf?.valueObjectId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.createdFinal}</div>
        <div className="mt-1 text-sm leading-5 text-emerald-800">
          {localized(targetLeaf.resultSummaryRu, targetLeaf.resultSummaryEn, locale)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={localeHref(`/value-objects/${targetLeaf.valueObjectId}`, locale)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900">
            {copy.openObject}
          </Link>
          <Link href={localeHref("/value-objects", locale)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-sm font-bold text-[#34405a]">
            {copy.openCatalog}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      {history.length ? (
        <div className="mb-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#65708d]">{copy.pathHistory}</div>
          <div className="mt-2 space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="font-bold text-[#263044]">{item.title || item.canonicalKey || item.valueObjectId} · {roleLabel(item.nodeRole, copy)} · {item.scope === "system" ? copy.system : copy.privateLabel}</div>
                {item.valueObjectId ? <Link href={localeHref(`/value-objects/${item.valueObjectId}`, locale)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#3b6ef8]">{copy.openObject}</Link> : null}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-[#727991]">{copy.continuePath}</div>
        </div>
      ) : null}

      <div className="text-sm font-extrabold text-[#263044]">{copy.scopeTitle}</div>
      <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.scopeHint}</div>
      {state.activeProfile ? <div className="mt-2 text-xs text-[#65708d]">{copy.activeProfile}: <span className="font-bold">{state.activeProfile.displayName}</span></div> : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy} onClick={() => { setScope("private"); setParentId(""); setFacetCode(""); }} className={`rounded-xl border p-3 text-left ${scope === "private" ? "border-[#3b6ef8] bg-[#eef3ff]" : "border-[#d8def0] bg-white"}`}>
          <div className="text-sm font-extrabold text-[#263044]">{copy.privateLabel}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.privateHint}</div>
        </button>
        <button type="button" disabled={busy} onClick={() => { setScope("system"); setParentId(""); setFacetCode(""); }} className={`rounded-xl border p-3 text-left ${scope === "system" ? "border-[#3b6ef8] bg-[#eef3ff]" : "border-[#d8def0] bg-white"}`}>
          <div className="text-sm font-extrabold text-[#263044]">{copy.system}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.systemHint}</div>
        </button>
      </div>

      {scope ? (
        <>
          <div className="mt-4 text-sm font-extrabold text-[#263044]">{copy.roleTitle}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.roleHint}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ["root", copy.root, copy.rootHint],
              ["intermediate", copy.intermediate, copy.intermediateHint],
              ["leaf", copy.leaf, copy.leafHint],
            ] as const).map(([code, label, hint]) => (
              <button key={code} type="button" disabled={busy} onClick={() => { setNodeRole(code); setParentId(""); setFacetCode(""); setRelation(""); }} className={`rounded-xl border p-3 text-left ${nodeRole === code ? "border-[#3b6ef8] bg-[#eef3ff]" : "border-[#d8def0] bg-white"}`}>
                <div className="text-sm font-extrabold text-[#263044]">{label}</div>
                <div className="mt-1 text-xs leading-5 text-[#727991]">{hint}</div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {scope && nodeRole ? (
        <div className="mt-4 space-y-3">
          {nodeRole !== "root" ? (
            <label className="block text-xs font-bold text-[#4b5563]">
              {copy.parent}
              <select value={parentId} onChange={(event) => { setParentId(event.target.value); setFacetCode(""); }} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                <option value="">{copy.chooseParent}</option>
                {parents.map((item) => <option key={item.id} value={item.id}>{item.title} · {roleLabel(item.nodeRole, copy)}{item.facetCode ? ` · ${item.facetCode}` : ""}{item.status === "draft" ? " · draft" : ""}</option>)}
              </select>
            </label>
          ) : null}

          {needsFacet ? (
            <label className="block text-xs font-bold text-[#4b5563]">
              {copy.facet}
              <select value={facetCode} onChange={(event) => setFacetCode(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                <option value="">{copy.chooseFacet}</option>
                {(state.facetOptions ?? []).map((facet) => <option key={facet} value={facet}>{FACET_LABELS[facet] ?? facet}</option>)}
              </select>
              <span className="mt-1 block font-normal text-[#7c8099]">{copy.facetHint}</span>
            </label>
          ) : null}

          {scope === "private" ? (
            <>
              <label className="block text-xs font-bold text-[#4b5563]">{copy.privateTitle}<input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 180))} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none" /></label>
              <label className="block text-xs font-bold text-[#4b5563]">{copy.privateDescription}<textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 4000))} rows={3} className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" /></label>
            </>
          ) : (
            <>
              <label className="block text-xs font-bold text-[#4b5563]">{copy.canonicalKey}<input value={canonicalKey} onChange={(event) => setCanonicalKey(event.target.value.toLowerCase().slice(0, 160))} placeholder="action.walking.step_count" className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none" /><span className="mt-1 block font-normal text-[#7c8099]">{copy.canonicalKeyHint}</span></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#4b5563]">{copy.titleRu}<input value={titleRu} onChange={(event) => setTitleRu(event.target.value.slice(0, 180))} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none" /></label>
                <label className="block text-xs font-bold text-[#4b5563]">{copy.titleEn}<input value={titleEn} onChange={(event) => setTitleEn(event.target.value.slice(0, 180))} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none" /></label>
                <label className="block text-xs font-bold text-[#4b5563]">{copy.descriptionRu}<textarea value={descriptionRu} onChange={(event) => setDescriptionRu(event.target.value.slice(0, 4000))} rows={3} className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold text-[#4b5563]">{copy.descriptionEn}<textarea value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value.slice(0, 4000))} rows={3} className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" /></label>
              </div>
            </>
          )}

          {nodeRole !== "root" ? (
            <label className="block text-xs font-bold text-[#4b5563]">{copy.relation}<select value={relation} onChange={(event) => setRelation(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"><option value="">{copy.chooseRelation}</option><option value="part_of">{copy.relationPartOf}</option><option value="is_a">{copy.relationIsA}</option><option value="aspect_of">{copy.relationAspectOf}</option><option value="subprocess_of">{copy.relationSubprocessOf}</option></select></label>
          ) : null}

          <label className="block">
            <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.createComment}</div>
            <textarea value={creationComment} onChange={(event) => setCreationComment(event.target.value.slice(0, 1500))} placeholder={copy.createCommentHint} rows={3} className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" />
            <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{creationComment.length}/1500</div>
          </label>
          <button
            type="button"
            disabled={busy || !canCreate}
            onClick={() => void post(scope === "private"
              ? {
                  action: "create_observation_object",
                  scope,
                  nodeRole,
                  parentValueObjectId: nodeRole === "root" ? null : parentId,
                  facetCode: needsFacet ? facetCode : null,
                  title,
                  description,
                  hierarchyRelationCode: nodeRole === "root" ? null : relation,
                  comment: creationComment,
                }
              : {
                  action: "create_observation_object",
                  scope,
                  nodeRole,
                  parentValueObjectId: nodeRole === "root" ? null : parentId,
                  facetCode: needsFacet ? facetCode : null,
                  canonicalKey,
                  titleRu,
                  descriptionRu,
                  titleEn,
                  descriptionEn,
                  hierarchyRelationCode: nodeRole === "root" ? null : relation,
                  comment: creationComment,
                })}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? copy.saving : `${copy.createObject}: ${roleLabel(nodeRole, copy)}`}
          </button>
        </div>
      ) : null}
      {error ? <div className="mt-2 text-xs text-red-700">{copy.loadError} {error}</div> : null}
    </div>
  );
}
