export {
  AIActionCard,
  AIActionCardList,
} from "./ai-action-card";
export type { AIActionCardProps } from "./ai-action-card";

export { AIContextHeader } from "./ai-context-header";
export type { AIContextHeaderProps } from "./ai-context-header";

export {
  AIMessageItem,
  AIMessageList,
} from "./ai-message-list";
export type { AIMessageListProps } from "./ai-message-list";

export {
  AIQuickPromptChip,
  AIQuickPrompts,
} from "./ai-quick-prompts";
export type { AIQuickPromptsProps } from "./ai-quick-prompts";

export {
  AIWarning,
  AIWarningsList,
} from "./ai-warning";
export type { AIWarningProps } from "./ai-warning";

export {
  contextRouteRegistry,
  contextRouteRegistryByRoute,
  getContextForRoute,
  getContextRouteRegistryEntry,
  getRegisteredContextRoutes,
  normalizeRouteForContextRegistry,
} from "./context-route-registry";
export type { ContextRouteRegistryEntry } from "./context-route-registry";

export { ContextualAIColumn } from "./contextual-ai-column";

export {
  ContextualAINoRightsState,
  NoRightsPreview,
} from "./contextual-ai-no-rights-state";
export type { ContextualAINoRightsStateProps } from "./contextual-ai-no-rights-state";

export {
  contextualAIContextByRoute,
  contextualAIContexts,
  fallbackContextualAIContext,
} from "./contextual-ai.fixtures";

export type {
  AIActionPreview,
  AIActionPreviewStatus,
  AIActionRiskLabel,
  AIContextConfidence,
  AIContextSource,
  AIContextSourceKind,
  AIMessage,
  AIQuickPrompt,
  AIWarningLevel,
  ContextualAIColumnProps,
  ContextualAIContext,
  ContextualAIPageKey,
  ContextualEntityType,
} from "./contextual-ai.types";

export {
  buildContextSubtitle,
  buildContextTitle,
  buildNoRightsExplanation,
  getActionRiskLabel,
  getActionStatusLabel,
  getConfidenceLabel,
  getContextBadgeLabel,
  getContextSummaryLines,
  getEntityTypeLabel,
  getPrimarySourceLabel,
  getWarningLevelLabel,
  hasWriteAuthority,
  mapRouteToAIContext,
  normalizeAIContextRoute,
} from "./contextual-ai.utils";

export { SourceContextBadge } from "./source-context-badge";
export type { SourceContextBadgeProps } from "./source-context-badge";
