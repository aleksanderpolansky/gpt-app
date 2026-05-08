"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ModerationAction = "reject" | "archive";
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
    status: string;
    admin_decision: string | null;
    admin_comment: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  moderation?: {
    action: ModerationAction;
    previousStatus: string;
    nextStatus: string;
    reviewedByUserId: string;
    reviewedAt: string;
  };
  error?: string;
};

const FINAL_PUBLIC_STATUSES = new Set(["approved", "merged"]);

function getActionLabel(action: ModerationAction) {
  if (action === "archive") {
    return "Archive";
  }

  return "Reject";
}

function getActionPastLabel(action: ModerationAction) {
  if (action === "archive") {
    return "archived";
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

function getDefaultComment(action: ModerationAction) {
  if (action === "archive") {
    return "Archived by platform admin.";
  }

  return "Rejected by platform admin.";
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

  async function submitModerationAction(action: ModerationAction) {
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

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this suggestion request?`
    );

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
            `Failed to ${action} suggestion request. Please try again.`
        );
        return;
      }

      setSubmitStatus("success");
      setMessage(
        `Suggestion request ${getActionPastLabel(
          action
        )}. New status: ${json.suggestionRequest.status}.`
      );

      router.refresh();
    } catch (error) {
      setSubmitStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${action} suggestion request. Please try again.`
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