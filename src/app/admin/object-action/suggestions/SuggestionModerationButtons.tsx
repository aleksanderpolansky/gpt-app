"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StatusChangingAction =
  | "reject"
  | "archive"
  | "approve_existing_match";

type NewCategoryAction = "approve_new_category";

type ModerationAction =
  | StatusChangingAction
  | NewCategoryAction
  | "analyze";

type ModerationSubmitStatus = "idle" | "submitting" | "success" | "error";

type SuggestionModerationButtonsProps = {
  suggestionId: string;
  currentStatus: string;
  aiStatus: string | null;
  aiConfidence: number | null;
  aiSuggestedCategoryText: string | null;
  matchedExistingCategoryId: string | null;
};

type NewCategoryFormState = {
  name: string;
  slug: string;
  description: string;
  adminComment: string;
};

type ModerationApiResponse = {
  ok: boolean;
  suggestionRequest?: {
    id: string;
    user_text: string;
    locale: string;
    context_code: string;
    entity_type: string;
    entity_id: string | null;
    request_source: string;
    ai_status: string;
    ai_confidence?: number | null;
    ai_model?: string | null;
    ai_prompt_version?: string | null;
    ai_suggested_object_text?: string | null;
    ai_suggested_action_text?: string | null;
    ai_suggested_category_text?: string | null;
    matched_existing_category_id?: string | null;
    ai_error_message?: string | null;
    status: string;
    admin_decision: string | null;
    admin_comment: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  moderation?: {
    action: StatusChangingAction | NewCategoryAction;
    previousStatus: string;
    nextStatus: string;
    reviewedByUserId: string;
    reviewedAt: string;
    matchedExistingCategoryId?: string;
    matchedExistingCategoryName?: string;
    matchedExistingCategorySlug?: string;
    createdContextualCategoryId?: string;
    createdContextualCategoryName?: string;
    createdContextualCategorySlug?: string;
    newCategorySource?: "admin_explicit" | "ai_suggested";
    publicDataMutation?: boolean;
    note?: string;
  };
  aiAnalysis?: {
    aiStatus: string;
    confidence: number | null;
    objectText: string | null;
    actionText: string | null;
    categoryText: string | null;
    categorySlug: string | null;
    matchedExistingCategoryId: string | null;
    rationale: string;
    riskNotes: string;
    errorMessage: string | null;
    model: string | null;
    promptVersion: string;
    existingCategoriesConsidered: number;
    analyzedAt: string;
  };
  error?: string;
};

const FINAL_PUBLIC_STATUSES = new Set(["approved", "merged"]);

const AI_ANALYSIS_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_EXISTING_MATCH_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_NEW_CATEGORY_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_NEW_CATEGORY_ALLOWED_AI_STATUSES = new Set([
  "new_category_suggested",
  "low_confidence",
]);

const DEFAULT_NEW_CATEGORY_FORM: NewCategoryFormState = {
  name: "",
  slug: "",
  description: "",
  adminComment: "",
};

function createSlugFromText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

function getActionLabel(action: ModerationAction) {
  if (action === "archive") {
    return "Archive";
  }

  if (action === "analyze") {
    return "AI Analyze";
  }

  if (action === "approve_existing_match") {
    return "Approve match";
  }

  if (action === "approve_new_category") {
    return "Approve new category";
  }

  return "Reject";
}

function getActionPastLabel(action: StatusChangingAction) {
  if (action === "archive") {
    return "archived";
  }

  if (action === "approve_existing_match") {
    return "merged with existing category";
  }

  return "rejected";
}

function canRejectStatus(status: string) {
  if (FINAL_PUBLIC_STATUSES.has(status)) {
    return false;
  }

  if (status === "rejected") {
    return false;
  }

  return true;
}

function canArchiveStatus(status: string) {
  if (FINAL_PUBLIC_STATUSES.has(status)) {
    return false;
  }

  if (status === "archived") {
    return false;
  }

  return true;
}

function canAnalyzeStatus(status: string) {
  return AI_ANALYSIS_ALLOWED_STATUSES.has(status);
}

function canApproveExistingMatchStatus(
  status: string,
  aiStatus: string | null,
  matchedExistingCategoryId: string | null
) {
  return (
    APPROVE_EXISTING_MATCH_ALLOWED_STATUSES.has(status) &&
    aiStatus === "matched_existing" &&
    Boolean(matchedExistingCategoryId)
  );
}

function canApproveNewCategoryStatus(status: string, aiStatus: string | null) {
  if (!APPROVE_NEW_CATEGORY_ALLOWED_STATUSES.has(status)) {
    return false;
  }

  if (!aiStatus) {
    return false;
  }

  return APPROVE_NEW_CATEGORY_ALLOWED_AI_STATUSES.has(aiStatus);
}

function getDefaultComment(action: StatusChangingAction) {
  if (action === "archive") {
    return "Archived by platform admin.";
  }

  if (action === "approve_existing_match") {
    return "Approved existing category match by platform admin.";
  }

  return "Rejected by platform admin.";
}

function getConfirmMessage(action: StatusChangingAction) {
  if (action === "approve_existing_match") {
    return [
      "Approve this AI matched existing category?",
      "",
      "This will mark the suggestion as merged with an existing category.",
      "It will NOT create a new public category.",
      "It will NOT publish anything automatically.",
    ].join("\n");
  }

  return `Are you sure you want to ${action} this suggestion request?`;
}

function getAiAnalysisMessage(json: ModerationApiResponse) {
  const aiAnalysis = json.aiAnalysis;
  const suggestionRequest = json.suggestionRequest;

  if (!aiAnalysis && suggestionRequest) {
    return `AI analysis finished. AI status: ${suggestionRequest.ai_status}.`;
  }

  if (!aiAnalysis) {
    return "AI analysis finished.";
  }

  const confidence =
    typeof aiAnalysis.confidence === "number"
      ? `, confidence: ${aiAnalysis.confidence}`
      : "";

  const objectText = aiAnalysis.objectText
    ? `, object: ${aiAnalysis.objectText}`
    : "";

  const actionText = aiAnalysis.actionText
    ? `, action: ${aiAnalysis.actionText}`
    : "";

  const categoryText = aiAnalysis.categoryText
    ? `, category: ${aiAnalysis.categoryText}`
    : "";

  const errorText = aiAnalysis.errorMessage
    ? ` Error: ${aiAnalysis.errorMessage}`
    : "";

  return `AI analysis finished. AI status: ${aiAnalysis.aiStatus}${confidence}${objectText}${actionText}${categoryText}.${errorText}`;
}

function getModerationSuccessMessage(
  action: StatusChangingAction,
  json: ModerationApiResponse
) {
  const nextStatus = json.suggestionRequest?.status ?? json.moderation?.nextStatus;

  if (action === "approve_existing_match") {
    const categoryName = json.moderation?.matchedExistingCategoryName;
    const categorySlug = json.moderation?.matchedExistingCategorySlug;
    const categoryText =
      categoryName && categorySlug
        ? ` Category: ${categoryName} (${categorySlug}).`
        : "";

    return `Suggestion request ${getActionPastLabel(
      action
    )}. New status: ${
      nextStatus ?? "merged"
    }.${categoryText} No new public category was created.`;
  }

  return `Suggestion request ${getActionPastLabel(
    action
  )}. New status: ${nextStatus ?? "â€”"}.`;
}

function getApproveNewCategorySuccessMessage(json: ModerationApiResponse) {
  const categoryName = json.moderation?.createdContextualCategoryName;
  const categorySlug = json.moderation?.createdContextualCategorySlug;
  const categoryText =
    categoryName && categorySlug
      ? ` Category: ${categoryName} (${categorySlug}).`
      : "";

  const sourceText = json.moderation?.newCategorySource
    ? ` Source: ${json.moderation.newCategorySource}.`
    : "";

  return `New category approved. New status: ${
    json.suggestionRequest?.status ?? json.moderation?.nextStatus ?? "approved"
  }.${categoryText}${sourceText}`;
}

export default function SuggestionModerationButtons({
  suggestionId,
  currentStatus,
  aiStatus,
  aiConfidence,
  aiSuggestedCategoryText,
  matchedExistingCategoryId,
}: SuggestionModerationButtonsProps) {
  const router = useRouter();

  const [submitStatus, setSubmitStatus] =
    useState<ModerationSubmitStatus>("idle");
  const [activeAction, setActiveAction] = useState<ModerationAction | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [newCategoryForm, setNewCategoryForm] =
    useState<NewCategoryFormState>(DEFAULT_NEW_CATEGORY_FORM);

  const isSubmitting = submitStatus === "submitting";

  const canReject = canRejectStatus(currentStatus);
  const canArchive = canArchiveStatus(currentStatus);
  const canAnalyze = canAnalyzeStatus(currentStatus);
  const canApproveExistingMatch = canApproveExistingMatchStatus(
    currentStatus,
    aiStatus,
    matchedExistingCategoryId
  );
  const canApproveNewCategory = canApproveNewCategoryStatus(
    currentStatus,
    aiStatus
  );

  function updateNewCategoryField(
    field: keyof NewCategoryFormState,
    value: string
  ) {
    setNewCategoryForm((currentForm) => {
      if (field === "name") {
        const shouldAutoFillSlug =
          !currentForm.slug ||
          currentForm.slug === createSlugFromText(currentForm.name);

        return {
          ...currentForm,
          name: value,
          slug: shouldAutoFillSlug
            ? createSlugFromText(value)
            : currentForm.slug,
        };
      }

      if (field === "slug") {
        return {
          ...currentForm,
          slug: createSlugFromText(value),
        };
      }

      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  async function submitAiAnalyzeAction() {
    if (isSubmitting) {
      return;
    }

    if (!canAnalyze) {
      setSubmitStatus("error");
      setMessage(
        `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: "${currentStatus}".`
      );
      return;
    }

    const confirmed = window.confirm(
      "Run AI analysis for this suggestion request? This will only write advisory AI fields and will not publish or merge any category."
    );

    if (!confirmed) {
      return;
    }

    setSubmitStatus("submitting");
    setActiveAction("analyze");
    setMessage(null);

    try {
      const response = await fetch("/api/object-action/suggestions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          id: suggestionId,
          action: "analyze",
        }),
      });

      const json = (await response.json()) as ModerationApiResponse;

      if (!response.ok || !json.ok || !json.suggestionRequest) {
        setSubmitStatus("error");
        setMessage(
          json.error ??
            "Failed to run AI analysis for suggestion request. Please try again."
        );
        return;
      }

      if (json.suggestionRequest.ai_status === "failed") {
        setSubmitStatus("error");
        setMessage(getAiAnalysisMessage(json));
        router.refresh();
        return;
      }

      setSubmitStatus("success");
      setMessage(getAiAnalysisMessage(json));

      router.refresh();
    } catch (error) {
      setSubmitStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to run AI analysis for suggestion request. Please try again."
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function submitApproveNewCategoryAction() {
    if (isSubmitting) {
      return;
    }

    if (!canApproveNewCategory) {
      setSubmitStatus("error");
      setMessage(
        `Cannot approve new category for suggestion with status "${currentStatus}" and AI status "${aiStatus ?? "null"}".`
      );
      return;
    }

    const trimmedName = newCategoryForm.name.trim();
    const trimmedSlug = createSlugFromText(newCategoryForm.slug);
    const trimmedDescription = newCategoryForm.description.trim();
    const trimmedAdminComment = newCategoryForm.adminComment.trim();

    if (!trimmedName) {
      setSubmitStatus("error");
      setMessage("New category name is required.");
      return;
    }

    if (!trimmedSlug) {
      setSubmitStatus("error");
      setMessage("New category slug is required.");
      return;
    }

    if (!trimmedAdminComment) {
      setSubmitStatus("error");
      setMessage("Admin comment is required for approving a new category.");
      return;
    }

    if (trimmedAdminComment.length > 2000) {
      setSubmitStatus("error");
      setMessage("Admin comment must be 2000 characters or shorter.");
      return;
    }

    const confirmed = window.confirm(
      [
        "Approve and create a NEW contextual category?",
        "",
        `Name: ${trimmedName}`,
        `Slug: ${trimmedSlug}`,
        "",
        "This WILL create a new category in the Object-Action Rubricator.",
        "This is a public data mutation and will be recorded in the audit log.",
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    setSubmitStatus("submitting");
    setActiveAction("approve_new_category");
    setMessage(null);

    try {
      const response = await fetch("/api/object-action/suggestions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          id: suggestionId,
          action: "approve_new_category",
          newCategoryName: trimmedName,
          newCategorySlug: trimmedSlug,
          newCategoryDescription: trimmedDescription || null,
          adminComment: trimmedAdminComment,
        }),
      });

      const json = (await response.json()) as ModerationApiResponse;

      if (!response.ok || !json.ok || !json.suggestionRequest) {
        setSubmitStatus("error");
        setMessage(
          json.error ??
            "Failed to approve new category. Please review the category data and try again."
        );
        return;
      }

      setSubmitStatus("success");
      setMessage(getApproveNewCategorySuccessMessage(json));
      setNewCategoryForm(DEFAULT_NEW_CATEGORY_FORM);

      router.refresh();
    } catch (error) {
      setSubmitStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to approve new category. Please try again."
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function submitModerationAction(action: StatusChangingAction) {
    if (isSubmitting) {
      return;
    }

    if (action === "reject" && !canReject) {
      setSubmitStatus("error");
      setMessage(`Cannot reject suggestion with status "${currentStatus}".`);
      return;
    }

    if (action === "archive" && !canArchive) {
      setSubmitStatus("error");
      setMessage(`Cannot archive suggestion with status "${currentStatus}".`);
      return;
    }

    if (action === "approve_existing_match" && !canApproveExistingMatch) {
      setSubmitStatus("error");
      setMessage(
        `Cannot approve existing match for suggestion with status "${currentStatus}", AI status "${aiStatus ?? "null"}" and matched category "${matchedExistingCategoryId ?? "null"}".`
      );
      return;
    }

    const defaultComment = getDefaultComment(action);

    const adminComment = window.prompt(
      `Admin comment for ${getActionLabel(action)} action:`,
      defaultComment
    );

    if (adminComment === null) {
      return;
    }

    const trimmedComment = adminComment.trim();

    if (trimmedComment.length > 2000) {
      setSubmitStatus("error");
      setMessage("Admin comment must be 2000 characters or shorter.");
      return;
    }

    const confirmed = window.confirm(getConfirmMessage(action));

    if (!confirmed) {
      return;
    }

    setSubmitStatus("submitting");
    setActiveAction(action);
    setMessage(null);

    try {
      const response = await fetch("/api/object-action/suggestions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          id: suggestionId,
          action,
          adminComment: trimmedComment || defaultComment,
        }),
      });

      const json = (await response.json()) as ModerationApiResponse;

      if (!response.ok || !json.ok || !json.suggestionRequest) {
        setSubmitStatus("error");
        setMessage(
          json.error ??
            `Failed to ${getActionLabel(
              action
            ).toLowerCase()} suggestion request. Please try again.`
        );
        return;
      }

      setSubmitStatus("success");
      setMessage(getModerationSuccessMessage(action, json));

      router.refresh();
    } catch (error) {
      setSubmitStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${getActionLabel(
              action
            ).toLowerCase()} suggestion request. Please try again.`
      );
    } finally {
      setActiveAction(null);
    }
  }

  if (FINAL_PUBLIC_STATUSES.has(currentStatus)) {
    return (
      <section
        style={{
          border: "1px solid #fde68a",
          borderRadius: "10px",
          padding: "12px",
          background: "#fffbeb",
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          Moderation closed
        </div>

        <div
          style={{
            color: "#92400e",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          This suggestion request already has a final public status. Approve,
          reject and archive controls are hidden to avoid accidental repeated
          moderation actions.
        </div>

        <div
          style={{
            color: "#92400e",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          Current status: <strong>{currentStatus}</strong>
        </div>
      </section>
    );
  }
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "12px",
        background: "#ffffff",
        display: "grid",
        gap: "10px",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: "#111111",
          fontSize: "14px",
        }}
      >
        Moderation actions
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          disabled={isSubmitting || !canAnalyze}
          onClick={submitAiAnalyzeAction}
          style={{
            border:
              isSubmitting || !canAnalyze
                ? "1px solid #dddddd"
                : "1px solid #2563eb",
            borderRadius: "8px",
            padding: "9px 12px",
            background: isSubmitting || !canAnalyze ? "#f5f5f5" : "#2563eb",
            color: isSubmitting || !canAnalyze ? "#777777" : "#ffffff",
            fontWeight: 800,
            cursor: isSubmitting || !canAnalyze ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting && activeAction === "analyze"
            ? "Analyzing..."
            : "AI Analyze"}
        </button>

        <button
          type="button"
          disabled={isSubmitting || !canApproveExistingMatch}
          onClick={() => submitModerationAction("approve_existing_match")}
          style={{
            border:
              isSubmitting || !canApproveExistingMatch
                ? "1px solid #dddddd"
                : "1px solid #16a34a",
            borderRadius: "8px",
            padding: "9px 12px",
            background:
              isSubmitting || !canApproveExistingMatch ? "#f5f5f5" : "#16a34a",
            color:
              isSubmitting || !canApproveExistingMatch ? "#777777" : "#ffffff",
            fontWeight: 800,
            cursor:
              isSubmitting || !canApproveExistingMatch
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isSubmitting && activeAction === "approve_existing_match"
            ? "Approving..."
            : "Approve match"}
        </button>

        <button
          type="button"
          disabled={isSubmitting || !canReject}
          onClick={() => submitModerationAction("reject")}
          style={{
            border:
              isSubmitting || !canReject
                ? "1px solid #dddddd"
                : "1px solid #dc2626",
            borderRadius: "8px",
            padding: "9px 12px",
            background: isSubmitting || !canReject ? "#f5f5f5" : "#dc2626",
            color: isSubmitting || !canReject ? "#777777" : "#ffffff",
            fontWeight: 800,
            cursor: isSubmitting || !canReject ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting && activeAction === "reject" ? "Rejecting..." : "Reject"}
        </button>

        <button
          type="button"
          disabled={isSubmitting || !canArchive}
          onClick={() => submitModerationAction("archive")}
          style={{
            border:
              isSubmitting || !canArchive
                ? "1px solid #dddddd"
                : "1px solid #6b7280",
            borderRadius: "8px",
            padding: "9px 12px",
            background: isSubmitting || !canArchive ? "#f5f5f5" : "#6b7280",
            color: isSubmitting || !canArchive ? "#777777" : "#ffffff",
            fontWeight: 800,
            cursor: isSubmitting || !canArchive ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting && activeAction === "archive"
            ? "Archiving..."
            : "Archive"}
        </button>

        <span
          style={{
            color: "#666666",
            fontSize: "13px",
          }}
        >
          Current status: <strong>{currentStatus}</strong>
        </span>
      </div>

      <section
        style={{
          border: canApproveNewCategory
            ? "1px solid #bbf7d0"
            : "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          background: canApproveNewCategory ? "#f0fdf4" : "#f9fafb",
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: canApproveNewCategory ? "#166534" : "#555555",
            fontSize: "14px",
          }}
        >
          Approve new category
        </div>

        <div
          style={{
            color: "#555555",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          Creates a new contextual category only after explicit platform admin
          review. Available only when AI status is{" "}
          <strong>new_category_suggested</strong> or{" "}
          <strong>low_confidence</strong>. Current AI status:{" "}
          <strong>{aiStatus ?? "â€”"}</strong>. Current AI category:{" "}
          <strong>{aiSuggestedCategoryText ?? "â€”"}</strong>. Confidence:{" "}
          <strong>
            {aiConfidence === null || aiConfidence === undefined
              ? "â€”"
              : aiConfidence}
          </strong>
          .
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#111111",
            }}
          >
            New category name
            <input
              type="text"
              value={newCategoryForm.name}
              disabled={isSubmitting || !canApproveNewCategory}
              onChange={(event) =>
                updateNewCategoryField("name", event.target.value)
              }
              placeholder="Example: Laser engraving"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "14px",
                background:
                  isSubmitting || !canApproveNewCategory ? "#f5f5f5" : "#fff",
                color: "#111111",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#111111",
            }}
          >
            New category slug
            <input
              type="text"
              value={newCategoryForm.slug}
              disabled={isSubmitting || !canApproveNewCategory}
              onChange={(event) =>
                updateNewCategoryField("slug", event.target.value)
              }
              placeholder="example: laser-engraving"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "14px",
                background:
                  isSubmitting || !canApproveNewCategory ? "#f5f5f5" : "#fff",
                color: "#111111",
                fontFamily: "monospace",
              }}
            />
          </label>
        </div>

        <label
          style={{
            display: "grid",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#111111",
          }}
        >
          New category description
          <textarea
            value={newCategoryForm.description}
            disabled={isSubmitting || !canApproveNewCategory}
            onChange={(event) =>
              updateNewCategoryField("description", event.target.value)
            }
            placeholder="Optional short description for the new category."
            rows={3}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "9px 10px",
              fontSize: "14px",
              background:
                isSubmitting || !canApproveNewCategory ? "#f5f5f5" : "#fff",
              color: "#111111",
              resize: "vertical",
            }}
          />
        </label>

        <label
          style={{
            display: "grid",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#111111",
          }}
        >
          Admin comment
          <textarea
            value={newCategoryForm.adminComment}
            disabled={isSubmitting || !canApproveNewCategory}
            onChange={(event) =>
              updateNewCategoryField("adminComment", event.target.value)
            }
            placeholder="Required. Explain why this new category is approved."
            rows={3}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "9px 10px",
              fontSize: "14px",
              background:
                isSubmitting || !canApproveNewCategory ? "#f5f5f5" : "#fff",
              color: "#111111",
              resize: "vertical",
            }}
          />
        </label>

        <button
          type="button"
          disabled={isSubmitting || !canApproveNewCategory}
          onClick={submitApproveNewCategoryAction}
          style={{
            border:
              isSubmitting || !canApproveNewCategory
                ? "1px solid #dddddd"
                : "1px solid #15803d",
            borderRadius: "8px",
            padding: "10px 12px",
            background:
              isSubmitting || !canApproveNewCategory ? "#f5f5f5" : "#15803d",
            color:
              isSubmitting || !canApproveNewCategory ? "#777777" : "#ffffff",
            fontWeight: 900,
            cursor:
              isSubmitting || !canApproveNewCategory
                ? "not-allowed"
                : "pointer",
            justifySelf: "start",
          }}
        >
          {isSubmitting && activeAction === "approve_new_category"
            ? "Approving new category..."
            : "Approve new category"}
        </button>
      </section>

      {message ? (
        <div
          style={{
            border:
              submitStatus === "error"
                ? "1px solid #f2b8b5"
                : "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "10px",
            background: submitStatus === "error" ? "#fff5f5" : "#f0fdf4",
            color: submitStatus === "error" ? "#a40000" : "#166534",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          {message}
        </div>
      ) : null}

      {!canAnalyze ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
            background: "#f9fafb",
            color: "#555555",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          AI analysis is available only for draft, suggested or needs_review
          suggestion requests.
        </div>
      ) : null}

      {!canApproveExistingMatch ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
            background: "#f9fafb",
            color: "#555555",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          Approve match is available only when status is draft, suggested or
          needs_review, AI status is matched_existing, and a matched existing
          category id exists. Current AI status:{" "}
          <strong>{aiStatus ?? "â€”"}</strong>. Current matched category:{" "}
          <strong>{matchedExistingCategoryId ?? "â€”"}</strong>.
        </div>
      ) : null}

      {!canApproveNewCategory ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
            background: "#f9fafb",
            color: "#555555",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          Approve new category is available only when status is draft, suggested
          or needs_review and AI status is new_category_suggested or
          low_confidence. Current AI status:{" "}
          <strong>{aiStatus ?? "â€”"}</strong>.
        </div>
      ) : null}

      {FINAL_PUBLIC_STATUSES.has(currentStatus) ? (
        <div
          style={{
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "10px",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          Approved or merged suggestion requests cannot be rejected or archived
          from this endpoint.
        </div>
      ) : null}
    </section>
  );
}