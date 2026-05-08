"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StatusChangingAction = "reject" | "archive" | "approve_existing_match";
type ModerationAction = StatusChangingAction | "analyze";
type ModerationSubmitStatus = "idle" | "submitting" | "success" | "error";

type SuggestionModerationButtonsProps = {
  suggestionId: string;
  currentStatus: string;
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
    action: StatusChangingAction;
    previousStatus: string;
    nextStatus: string;
    reviewedByUserId: string;
    reviewedAt: string;
    matchedExistingCategoryId?: string;
    matchedExistingCategoryName?: string;
    matchedExistingCategorySlug?: string;
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

function canApproveExistingMatchStatus(status: string) {
  return APPROVE_EXISTING_MATCH_ALLOWED_STATUSES.has(status);
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
    )}. New status: ${nextStatus ?? "merged"}.${categoryText} No new public category was created.`;
  }

  return `Suggestion request ${getActionPastLabel(
    action
  )}. New status: ${nextStatus ?? "—"}.`;
}

export default function SuggestionModerationButtons({
  suggestionId,
  currentStatus,
}: SuggestionModerationButtonsProps) {
  const router = useRouter();

  const [submitStatus, setSubmitStatus] =
    useState<ModerationSubmitStatus>("idle");
  const [activeAction, setActiveAction] = useState<ModerationAction | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  const isSubmitting = submitStatus === "submitting";

  const canReject = canRejectStatus(currentStatus);
  const canArchive = canArchiveStatus(currentStatus);
  const canAnalyze = canAnalyzeStatus(currentStatus);
  const canApproveExistingMatch = canApproveExistingMatchStatus(currentStatus);

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
        `Cannot approve existing match for suggestion with status "${currentStatus}".`
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
          Approve match is available only for draft, suggested or needs_review
          suggestion requests. Backend also requires ai_status=matched_existing
          and a valid matched existing category.
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