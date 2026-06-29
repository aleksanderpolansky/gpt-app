"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type CategoryReviewAction =
  | "confirm_ai_candidate"
  | "remove_current_category"
  | "replace_current_category";

type OrganizationCurrentCategory = {
  contextualCategoryId: string;
  categoryName: string;
  categorySlug: string;
  classificationStatus: string;
  sourceType: string | null;
  reviewState: string | null;
};

type OrganizationCategoryOption = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number | null;
};

type OrganizationCategoryReviewActionLabels = {
  ownerActionsTitle: string;
  ownerActionsDescription: string;
  confirmAiCategory: string;
  removeCurrentCategory: string;
  replaceCurrentCategory: string;
  confirming: string;
  removing: string;
  replacing: string;
  confirmCurrentAiCategory: string;
  removeFromSemanticCloud: string;
  replaceWithApprovedCategory: string;
  noReplacementCategories: string;
  optionalOwnerNote: string;
  notePlaceholder: string;
  replaceCategory: string;
  chooseTargetCategory: string;
  unknownSource: string;
  unknownReviewState: string;
  hiddenFromSemanticCloud: string;
  visibleInSemanticCloud: string;
  completed: string;
  reviewState: string;
  unknownError: string;
};

type OrganizationCategoryReviewActionsProps = {
  organizationId: string;
  currentCategory: OrganizationCurrentCategory | null;
  categoryOptions: OrganizationCategoryOption[];
  labels: OrganizationCategoryReviewActionLabels;
};

type CategoryReviewApiResponse = {
  ok?: boolean;
  error?: string;
  categoryReview?: {
    reviewState?: string;
    semanticCloudVisible?: boolean;
    previousContextualCategoryId?: string | null;
    nextContextualCategoryId?: string | null;
  };
};

function getActionLabel(
  action: CategoryReviewAction,
  labels: OrganizationCategoryReviewActionLabels,
) {
  if (action === "confirm_ai_candidate") {
    return labels.confirmAiCategory;
  }

  if (action === "remove_current_category") {
    return labels.removeCurrentCategory;
  }

  return labels.replaceCurrentCategory;
}

export default function OrganizationCategoryReviewActions({
  organizationId,
  currentCategory,
  categoryOptions,
  labels,
}: OrganizationCategoryReviewActionsProps) {
  const router = useRouter();

  const replacementOptions = useMemo(
    () =>
      categoryOptions.filter(
        (category) => category.id !== currentCategory?.contextualCategoryId,
      ),
    [categoryOptions, currentCategory?.contextualCategoryId],
  );

  const initialReplacementCategoryId = replacementOptions[0]?.id ?? "";

  const [pendingAction, setPendingAction] =
    useState<CategoryReviewAction | null>(null);
  const [replacementCategoryId, setReplacementCategoryId] = useState(
    initialReplacementCategoryId,
  );
  const [note, setNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending = pendingAction !== null;
  const hasCurrentCategory = currentCategory !== null;

  async function submitCategoryReview(
    action: CategoryReviewAction,
    contextualCategoryId?: string,
  ) {
    setPendingAction(action);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/category-review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            contextualCategoryId: contextualCategoryId || undefined,
            note: note.trim() || undefined,
          }),
        },
      );

      const data = (await response.json()) as CategoryReviewApiResponse;

      if (!response.ok || !data.ok) {
        setErrorMessage(
          data.error ??
            `Category review action failed: ${getActionLabel(action, labels)}`,
        );
        return;
      }

      const reviewState = data.categoryReview?.reviewState ?? "updated";
      const cloudLabel =
        data.categoryReview?.semanticCloudVisible === false
          ? labels.hiddenFromSemanticCloud
          : labels.visibleInSemanticCloud;

      setStatusMessage(
        `${getActionLabel(action, labels)} ${labels.completed}. ${labels.reviewState}: ${reviewState}; ${cloudLabel}.`,
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : labels.unknownError,
      );
    } finally {
      setPendingAction(null);
    }
  }

  function handleReplaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!replacementCategoryId) {
      setErrorMessage(labels.chooseTargetCategory);
      return;
    }

    void submitCategoryReview(
      "replace_current_category",
      replacementCategoryId,
    );
  }

  return (
    <div className="mt-5 rounded-[20px] border border-[#dbeafe] bg-[#eff6ff] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[18px] font-bold text-[#1d4ed8]">
            {labels.ownerActionsTitle}
          </h3>
          <p className="mt-2 max-w-[780px] text-[13px] leading-6 text-[#1e40af]">
            {labels.ownerActionsDescription}
          </p>
        </div>

        {currentCategory ? (
          <div className="rounded-2xl border border-[#bfdbfe] bg-white px-4 py-3 text-[12px] text-[#1e3a8a]">
            <div className="font-bold">{currentCategory.categoryName}</div>
            <div className="mt-1">
              {currentCategory.sourceType ?? labels.unknownSource} /{" "}
              {currentCategory.reviewState ?? labels.unknownReviewState}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!hasCurrentCategory || isPending}
          onClick={() => {
            void submitCategoryReview("confirm_ai_candidate");
          }}
          className="rounded-xl bg-[#166534] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#14532d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "confirm_ai_candidate"
            ? labels.confirming
            : labels.confirmCurrentAiCategory}
        </button>

        <button
          type="button"
          disabled={!hasCurrentCategory || isPending}
          onClick={() => {
            void submitCategoryReview("remove_current_category");
          }}
          className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-bold text-[#b42318] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "remove_current_category"
            ? labels.removing
            : labels.removeFromSemanticCloud}
        </button>
      </div>

      <form
        onSubmit={handleReplaceSubmit}
        className="mt-5 rounded-2xl border border-[#bfdbfe] bg-white p-4"
      >
        <label className="grid gap-2 text-[13px] font-bold text-[#1e3a8a]">
          {labels.replaceWithApprovedCategory}
          <select
            value={replacementCategoryId}
            onChange={(event) => setReplacementCategoryId(event.target.value)}
            disabled={isPending || replacementOptions.length === 0}
            className="rounded-xl border border-[#dbeafe] bg-white px-3 py-3 text-[13px] font-semibold text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {replacementOptions.length === 0 ? (
              <option value="">{labels.noReplacementCategories}</option>
            ) : (
              replacementOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} / {category.slug}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mt-4 grid gap-2 text-[13px] font-bold text-[#1e3a8a]">
          {labels.optionalOwnerNote}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isPending}
            rows={3}
            maxLength={1000}
            placeholder={labels.notePlaceholder}
            className="rounded-xl border border-[#dbeafe] bg-white px-3 py-3 text-[13px] font-medium text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          disabled={isPending || replacementOptions.length === 0}
          className="mt-4 rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "replace_current_category"
            ? labels.replacing
            : labels.replaceCategory}
        </button>
      </form>

      {statusMessage ? (
        <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-[13px] font-semibold leading-6 text-[#166534]">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-[13px] font-semibold leading-6 text-[#b42318]">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
