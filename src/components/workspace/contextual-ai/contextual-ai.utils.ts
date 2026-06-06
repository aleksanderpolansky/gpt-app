import {
  contextualAIContextByRoute,
  fallbackContextualAIContext,
} from "./contextual-ai.fixtures";
import type {
  AIActionPreviewStatus,
  AIActionRiskLabel,
  AIContextConfidence,
  AIContextSourceKind,
  AIWarningLevel,
  ContextualAIContext,
  ContextualEntityType,
} from "./contextual-ai.types";

const routeContextMap = contextualAIContextByRoute as Readonly<
  Record<string, ContextualAIContext>
>;

export function normalizeAIContextRoute(route: string): string {
  const trimmedRoute = route.trim();

  if (trimmedRoute.length === 0) {
    return "*";
  }

  if (trimmedRoute === "/") {
    return "/";
  }

  const routeWithoutQuery = trimmedRoute.split("?")[0]?.split("#")[0] ?? trimmedRoute;

  if (routeWithoutQuery.length > 1 && routeWithoutQuery.endsWith("/")) {
    return routeWithoutQuery.slice(0, -1);
  }

  return routeWithoutQuery;
}

export function mapRouteToAIContext(route: string): ContextualAIContext {
  const normalizedRoute = normalizeAIContextRoute(route);

  if (normalizedRoute.startsWith("/objects/") && normalizedRoute !== "/objects") {
    return contextualAIContextByRoute["/objects/[id]"];
  }

  return routeContextMap[normalizedRoute] ?? fallbackContextualAIContext;
}

export function buildContextTitle(context: ContextualAIContext): string {
  if (context.entity.type === "none") {
    return context.title;
  }

  return `${context.title}: ${context.entity.title}`;
}

export function buildContextSubtitle(context: ContextualAIContext): string {
  const sourceLabels = context.sources.map((source) => source.label).join(", ");

  if (context.entity.subtitle && sourceLabels.length > 0) {
    return `${context.entity.subtitle} · ${sourceLabels}`;
  }

  if (context.entity.subtitle) {
    return context.entity.subtitle;
  }

  if (sourceLabels.length > 0) {
    return sourceLabels;
  }

  return "No source context";
}

export function getContextBadgeLabel(kind: AIContextSourceKind): string {
  switch (kind) {
    case "fixture":
      return "Fixture";
    case "route_context":
      return "Route context";
    case "selected_activity":
      return "Selected activity";
    case "selected_object":
      return "Selected object";
    case "timeline_preview":
      return "Timeline preview";
    case "calendar_preview":
      return "Calendar preview";
    case "analytics_preview":
      return "Analytics preview";
    case "next_best_action_preview":
      return "Next action preview";
    case "privacy_audit":
      return "Privacy audit";
    case "commercial_entity":
      return "Commercial entity";
    default:
      return "Context source";
  }
}

export function getEntityTypeLabel(type: ContextualEntityType): string {
  switch (type) {
    case "none":
      return "No selected entity";
    case "activity":
      return "Activity";
    case "semantic_candidate":
      return "Semantic candidate";
    case "value_object":
      return "Value object";
    case "timeline_day":
      return "Timeline day";
    case "calendar_window":
      return "Calendar window";
    case "analytics_signal":
      return "Analytics signal";
    case "next_action_candidate":
      return "Next action candidate";
    case "privacy_audit_item":
      return "Privacy audit item";
    case "organization":
      return "Organization";
    case "offer":
      return "Offer";
    case "certificate":
      return "Certificate";
    case "points_wallet":
      return "Points wallet";
    case "purchase_confirmation":
      return "Purchase confirmation";
    case "public_purchase_history":
      return "Public purchase history";
    default:
      return "Selected entity";
  }
}

export function getConfidenceLabel(confidence: AIContextConfidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    case "unknown":
      return "Unknown confidence";
    default:
      return "Unknown confidence";
  }
}

export function getWarningLevelLabel(level: AIWarningLevel): string {
  switch (level) {
    case "info":
      return "Info";
    case "caution":
      return "Caution";
    case "boundary":
      return "Boundary";
    case "risk":
      return "Risk";
    default:
      return "Warning";
  }
}

export function getActionStatusLabel(status: AIActionPreviewStatus): string {
  switch (status) {
    case "preview_only":
      return "Preview only";
    case "disabled":
      return "Disabled";
    case "future_gated":
      return "Future gated";
    default:
      return "Preview only";
  }
}

export function getActionRiskLabel(riskLabel: AIActionRiskLabel): string {
  switch (riskLabel) {
    case "none":
      return "No visible risk";
    case "low":
      return "Low risk";
    case "medium":
      return "Medium risk";
    case "high":
      return "High risk";
    case "requires_confirmation":
      return "Requires confirmation";
    default:
      return "Requires review";
  }
}

export function hasWriteAuthority(context: ContextualAIContext): false {
  return context.writesAllowed;
}

export function getPrimarySourceLabel(context: ContextualAIContext): string {
  const primarySource = context.sources[0];

  if (!primarySource) {
    return "No source";
  }

  return getContextBadgeLabel(primarySource.kind);
}

export function buildNoRightsExplanation(context: ContextualAIContext): string {
  const contextTitle = buildContextTitle(context);

  return `${contextTitle} is available for explanation only. This AI column has no write authority.`;
}

export function getContextSummaryLines(context: ContextualAIContext): readonly string[] {
  return [
    `Route: ${context.route}`,
    `Entity: ${getEntityTypeLabel(context.entity.type)}`,
    `Confidence: ${getConfidenceLabel(context.confidence)}`,
    `Writes allowed: ${context.writesAllowed ? "yes" : "no"}`,
  ];
}
