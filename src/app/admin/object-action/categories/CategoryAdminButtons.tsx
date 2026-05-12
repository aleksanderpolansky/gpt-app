"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryAdminButtonsProps = {
  categoryId: string;
  categoryName: string;
  categoryStatus: string;
  isActive: boolean;
};

type CategoryAdminAction = "archive" | "deactivate" | "activate";

type ActionState = {
  isLoading: boolean;
  message: string | null;
  error: string | null;
};

const INITIAL_ACTION_STATE: ActionState = {
  isLoading: false,
  message: null,
  error: null,
};

function getActionLabel(action: CategoryAdminAction) {
  if (action === "archive") {
    return "Archive";
  }

  if (action === "deactivate") {
    return "Deactivate";
  }

  return "Activate";
}

function getActionButtonStyle(action: CategoryAdminAction, disabled: boolean) {
  const baseStyle = {
    border: "1px solid #dddddd",
    borderRadius: "8px",
    padding: "8px 12px",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };

  if (action === "archive") {
    return {
      ...baseStyle,
      background: "#6b7280",
      color: "#ffffff",
      borderColor: "#6b7280",
    };
  }

  if (action === "deactivate") {
    return {
      ...baseStyle,
      background: "#dc2626",
      color: "#ffffff",
      borderColor: "#dc2626",
    };
  }

  return {
    ...baseStyle,
    background: "#16a34a",
    color: "#ffffff",
    borderColor: "#16a34a",
  };
}

function getActionHint(params: {
  action: CategoryAdminAction;
  categoryStatus: string;
  isActive: boolean;
}) {
  if (params.action === "archive") {
    if (params.categoryStatus === "archived") {
      return "Category is already archived.";
    }

    return "Archive will set status=archived and is_active=false.";
  }

  if (params.action === "deactivate") {
    if (!params.isActive) {
      return "Category is already inactive.";
    }

    return "Deactivate will hide this category from active public pickers without changing its status.";
  }

  if (params.categoryStatus === "archived") {
    return "Archived category cannot be activated through this simple endpoint.";
  }

  if (params.isActive) {
    return "Category is already active.";
  }

  return "Activate will set is_active=true.";
}

function isActionDisabled(params: {
  action: CategoryAdminAction;
  categoryStatus: string;
  isActive: boolean;
  isLoading: boolean;
}) {
  if (params.isLoading) {
    return true;
  }

  if (params.action === "archive") {
    return params.categoryStatus === "archived";
  }

  if (params.action === "deactivate") {
    return !params.isActive;
  }

  if (params.action === "activate") {
    return params.isActive || params.categoryStatus === "archived";
  }

  return true;
}

export default function CategoryAdminButtons({
  categoryId,
  categoryName,
  categoryStatus,
  isActive,
}: CategoryAdminButtonsProps) {
  const router = useRouter();
  const [adminComment, setAdminComment] = useState("");
  const [actionState, setActionState] =
    useState<ActionState>(INITIAL_ACTION_STATE);

  const availableActions = useMemo<CategoryAdminAction[]>(() => {
    return ["activate", "deactivate", "archive"];
  }, []);

  async function runCategoryAction(action: CategoryAdminAction) {
    const normalizedComment = adminComment.trim();

    if ((action === "archive" || action === "deactivate") && !normalizedComment) {
      setActionState({
        isLoading: false,
        message: null,
        error: `${getActionLabel(action)} requires an admin comment.`,
      });
      return;
    }

    const confirmed = window.confirm(
      `${getActionLabel(action)} category "${categoryName}"?`
    );

    if (!confirmed) {
      return;
    }

    setActionState({
      isLoading: true,
      message: null,
      error: null,
    });

    try {
      const response = await fetch("/api/object-action/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: categoryId,
          action,
          adminComment: normalizedComment || null,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        moderation?: {
          action?: string;
          note?: string;
        };
      };

      if (!response.ok || !payload.ok) {
        setActionState({
          isLoading: false,
          message: null,
          error: payload.error ?? `Category ${action} failed.`,
        });
        return;
      }

      setActionState({
        isLoading: false,
        message:
          payload.moderation?.note ??
          `Category action completed: ${getActionLabel(action)}.`,
        error: null,
      });

      setAdminComment("");
      router.refresh();
    } catch (error) {
      setActionState({
        isLoading: false,
        message: null,
        error:
          error instanceof Error
            ? error.message
            : `Category ${action} failed.`,
      });
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
        Category admin actions
      </div>

      <p
        style={{
          margin: 0,
          color: "#555555",
          fontSize: "13px",
          lineHeight: "1.45",
        }}
      >
        Archive, deactivate and activate are explicit admin actions. Archive and
        deactivate require a comment. No category record is deleted.
      </p>

      <label
        style={{
          display: "grid",
          gap: "6px",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        Admin comment
        <textarea
          value={adminComment}
          onChange={(event) => setAdminComment(event.target.value)}
          placeholder="Required for archive/deactivate. Explain why this category is changed."
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "10px",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "14px",
          }}
        />
      </label>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {availableActions.map((action) => {
          const disabled = isActionDisabled({
            action,
            categoryStatus,
            isActive,
            isLoading: actionState.isLoading,
          });

          return (
            <button
              key={action}
              type="button"
              disabled={disabled}
              onClick={() => runCategoryAction(action)}
              title={getActionHint({
                action,
                categoryStatus,
                isActive,
              })}
              style={getActionButtonStyle(action, disabled)}
            >
              {actionState.isLoading ? "Working..." : getActionLabel(action)}
            </button>
          );
        })}
      </div>

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
        <div>
          <strong>Archive:</strong>{" "}
          {getActionHint({
            action: "archive",
            categoryStatus,
            isActive,
          })}
        </div>
        <div>
          <strong>Deactivate:</strong>{" "}
          {getActionHint({
            action: "deactivate",
            categoryStatus,
            isActive,
          })}
        </div>
        <div>
          <strong>Activate:</strong>{" "}
          {getActionHint({
            action: "activate",
            categoryStatus,
            isActive,
          })}
        </div>
      </div>

      {actionState.message ? (
        <div
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "10px",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          {actionState.message}
        </div>
      ) : null}

      {actionState.error ? (
        <div
          style={{
            border: "1px solid #f2b8b5",
            borderRadius: "8px",
            padding: "10px",
            background: "#fff5f5",
            color: "#a40000",
            fontSize: "13px",
            lineHeight: "1.45",
          }}
        >
          {actionState.error}
        </div>
      ) : null}
    </section>
  );
}