import {
  contextualAIContextByRoute,
  fallbackContextualAIContext,
} from "./contextual-ai.fixtures";
import type {
  AIContextSourceKind,
  ContextualAIContext,
  ContextualAIPageKey,
  ContextualEntityType,
} from "./contextual-ai.types";

export interface ContextRouteRegistryEntry {
  readonly routePattern: string;
  readonly pageKey: ContextualAIPageKey;
  readonly entityType: ContextualEntityType;
  readonly sourceKind: AIContextSourceKind;
  readonly context: ContextualAIContext;
  readonly description: string;
}

export const contextRouteRegistry = [
  {
    routePattern: "/workspace",
    pageKey: "workspace",
    entityType: "none",
    sourceKind: "route_context",
    context: contextualAIContextByRoute["/workspace"],
    description: "General operational workspace context.",
  },
  {
    routePattern: "/activity/review",
    pageKey: "activity",
    entityType: "activity",
    sourceKind: "selected_activity",
    context: contextualAIContextByRoute["/activity/review"],
    description: "Raw and normalized activity review context.",
  },
  {
    routePattern: "/semantic/review",
    pageKey: "semantic_review",
    entityType: "semantic_candidate",
    sourceKind: "route_context",
    context: contextualAIContextByRoute["/semantic/review"],
    description: "Semantic review and external concept hint context.",
  },
  {
    routePattern: "/objects",
    pageKey: "object_collection",
    entityType: "value_object",
    sourceKind: "selected_object",
    context: contextualAIContextByRoute["/objects"],
    description: "Object collection, filters, and needs-review context.",
  },
  {
    routePattern: "/objects/[id]",
    pageKey: "value_object",
    entityType: "value_object",
    sourceKind: "selected_object",
    context: contextualAIContextByRoute["/objects/[id]"],
    description: "Selected value object detail context.",
  },
  {
    routePattern: "/today",
    pageKey: "timeline",
    entityType: "timeline_day",
    sourceKind: "timeline_preview",
    context: contextualAIContextByRoute["/today"],
    description: "Today timeline and correction preview context.",
  },
  {
    routePattern: "/calendar",
    pageKey: "calendar",
    entityType: "calendar_window",
    sourceKind: "calendar_preview",
    context: contextualAIContextByRoute["/calendar"],
    description: "Calendar free-window and constraints context.",
  },
  {
    routePattern: "/analytics",
    pageKey: "analytics",
    entityType: "analytics_signal",
    sourceKind: "analytics_preview",
    context: contextualAIContextByRoute["/analytics"],
    description: "Analytics signals as provisional indicators.",
  },
  {
    routePattern: "/next",
    pageKey: "next_best_action",
    entityType: "next_action_candidate",
    sourceKind: "next_best_action_preview",
    context: contextualAIContextByRoute["/next"],
    description: "Candidate next action context.",
  },
  {
    routePattern: "/privacy-audit",
    pageKey: "privacy_audit",
    entityType: "privacy_audit_item",
    sourceKind: "privacy_audit",
    context: contextualAIContextByRoute["/privacy-audit"],
    description: "Privacy audit and correction boundary context.",
  },
  {
    routePattern: "/organizations",
    pageKey: "commercial_organization",
    entityType: "organization",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/organizations"],
    description: "Commercial organization context.",
  },
  {
    routePattern: "/offers",
    pageKey: "commercial_offer",
    entityType: "offer",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/offers"],
    description: "Commercial offer and certificate base context.",
  },
  {
    routePattern: "/certificates",
    pageKey: "commercial_certificate",
    entityType: "certificate",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/certificates"],
    description: "Commercial certificate split and payout preview context.",
  },
  {
    routePattern: "/points",
    pageKey: "commercial_points",
    entityType: "points_wallet",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/points"],
    description: "Commercial points balance, history, and burn rule context.",
  },
  {
    routePattern: "/purchase-confirmations",
    pageKey: "buyer_confirmation",
    entityType: "purchase_confirmation",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/purchase-confirmations"],
    description: "Buyer external purchase confirmation context.",
  },
  {
    routePattern: "/seller/purchase-confirmations",
    pageKey: "seller_confirmation",
    entityType: "purchase_confirmation",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/seller/purchase-confirmations"],
    description: "Seller confirmation queue context.",
  },
  {
    routePattern: "/public/purchases",
    pageKey: "public_history",
    entityType: "public_purchase_history",
    sourceKind: "commercial_entity",
    context: contextualAIContextByRoute["/public/purchases"],
    description: "Public purchase history masking context.",
  },
] satisfies readonly ContextRouteRegistryEntry[];

export const contextRouteRegistryByRoute = {
  "/workspace": contextRouteRegistry[0],
  "/activity/review": contextRouteRegistry[1],
  "/semantic/review": contextRouteRegistry[2],
  "/objects": contextRouteRegistry[3],
  "/objects/[id]": contextRouteRegistry[4],
  "/objects/detail": contextRouteRegistry[4],
  "/today": contextRouteRegistry[5],
  "/calendar": contextRouteRegistry[6],
  "/analytics": contextRouteRegistry[7],
  "/next": contextRouteRegistry[8],
  "/privacy-audit": contextRouteRegistry[9],
  "/organizations": contextRouteRegistry[10],
  "/offers": contextRouteRegistry[11],
  "/certificates": contextRouteRegistry[12],
  "/points": contextRouteRegistry[13],
  "/purchase-confirmations": contextRouteRegistry[14],
  "/seller-confirmations": contextRouteRegistry[14],
  "/seller/purchase-confirmations": contextRouteRegistry[15],
  "/public/purchases": contextRouteRegistry[16],
  "/buyer-confirmations": contextRouteRegistry[14],
  "/public-purchases": contextRouteRegistry[16],
} as const;

export function normalizeRouteForContextRegistry(route: string): string {
  const trimmedRoute = route.trim();

  if (trimmedRoute.length === 0) {
    return "*";
  }

  const routeWithoutQuery = trimmedRoute.split("?")[0]?.split("#")[0] ?? trimmedRoute;

  if (routeWithoutQuery.length > 1 && routeWithoutQuery.endsWith("/")) {
    return routeWithoutQuery.slice(0, -1);
  }

  return routeWithoutQuery;
}

export function getContextRouteRegistryEntry(route: string): ContextRouteRegistryEntry {
  const normalizedRoute = normalizeRouteForContextRegistry(route);

  if (normalizedRoute.startsWith("/objects/") && normalizedRoute !== "/objects") {
    return contextRouteRegistryByRoute["/objects/[id]"];
  }

  return (
    contextRouteRegistryByRoute[
      normalizedRoute as keyof typeof contextRouteRegistryByRoute
    ] ?? {
      routePattern: "*",
      pageKey: fallbackContextualAIContext.pageKey,
      entityType: fallbackContextualAIContext.entity.type,
      sourceKind: "fixture",
      context: fallbackContextualAIContext,
      description: "Fallback context for unmapped routes.",
    }
  );
}

export function getContextForRoute(route: string): ContextualAIContext {
  return getContextRouteRegistryEntry(route).context;
}

export function getRegisteredContextRoutes(): readonly string[] {
  return contextRouteRegistry.map((entry) => entry.routePattern);
}




