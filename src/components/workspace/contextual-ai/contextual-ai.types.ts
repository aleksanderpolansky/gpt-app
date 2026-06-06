export type ContextualAIPageKey =
  | "workspace"
  | "activity"
  | "semantic_review"
  | "object_collection"
  | "value_object"
  | "timeline"
  | "calendar"
  | "analytics"
  | "next_best_action"
  | "privacy_audit"
  | "commercial_organization"
  | "commercial_offer"
  | "commercial_certificate"
  | "commercial_points"
  | "buyer_confirmation"
  | "seller_confirmation"
  | "public_history"
  | "unknown";

export type ContextualEntityType =
  | "none"
  | "activity"
  | "semantic_candidate"
  | "value_object"
  | "timeline_day"
  | "calendar_window"
  | "analytics_signal"
  | "next_action_candidate"
  | "privacy_audit_item"
  | "organization"
  | "offer"
  | "certificate"
  | "points_wallet"
  | "purchase_confirmation"
  | "public_purchase_history";

export type AIContextSourceKind =
  | "fixture"
  | "route_context"
  | "selected_activity"
  | "selected_object"
  | "timeline_preview"
  | "calendar_preview"
  | "analytics_preview"
  | "next_best_action_preview"
  | "privacy_audit"
  | "commercial_entity";

export type AIContextConfidence = "high" | "medium" | "low" | "unknown";

export type AIWarningLevel = "info" | "caution" | "boundary" | "risk";

export type AIActionPreviewStatus = "preview_only" | "disabled" | "future_gated";

export type AIActionRiskLabel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "requires_confirmation";

export type AIMessageRole = "assistant" | "context" | "warning" | "system";

export interface ContextualAIEntity {
  readonly type: ContextualEntityType;
  readonly id?: string;
  readonly title: string;
  readonly subtitle?: string;
}

export interface AIContextSource {
  readonly kind: AIContextSourceKind;
  readonly label: string;
  readonly description?: string;
}

export interface AIWarning {
  readonly id: string;
  readonly level: AIWarningLevel;
  readonly title: string;
  readonly message: string;
}

export interface AIMessage {
  readonly id: string;
  readonly role: AIMessageRole;
  readonly title?: string;
  readonly body: string;
  readonly sourceKind?: AIContextSourceKind;
}

export interface AIActionPreview {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly rationale?: string;
  readonly constraints?: readonly string[];
  readonly status: AIActionPreviewStatus;
  readonly riskLabel: AIActionRiskLabel;
}

export interface AIQuickPrompt {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly status: AIActionPreviewStatus;
}

export interface ContextualAIContext {
  readonly pageKey: ContextualAIPageKey;
  readonly route: string;
  readonly title: string;
  readonly description?: string;
  readonly entity: ContextualAIEntity;
  readonly confidence: AIContextConfidence;
  readonly sources: readonly AIContextSource[];
  readonly messages: readonly AIMessage[];
  readonly warnings: readonly AIWarning[];
  readonly actions: readonly AIActionPreview[];
  readonly quickPrompts: readonly AIQuickPrompt[];
  readonly writesAllowed: false;
}

export interface ContextualAIColumnProps {
  readonly context: ContextualAIContext;
  readonly className?: string;
}
