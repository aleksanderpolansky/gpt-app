export type ValueObjectTreeNodeSource =
  | "system"
  | "user"
  | "organization"
  | "activity_candidate"
  | "fixture_demo";

export type ValueObjectTreeNodeStatus =
  | "existing_demo"
  | "proposed_candidate"
  | "future_system_branch"
  | "deferred_privacy_sensitive";

export type ValueObjectTreeObjectKind =
  | "root"
  | "system"
  | "domain"
  | "subdomain"
  | "activity"
  | "role"
  | "relationship"
  | "physiology"
  | "environment"
  | "skill"
  | "goal"
  | "metric_group";

export interface ValueObjectTreePreviewNode {
  id: string;
  titleRu: string;
  descriptionRu: string;
  parentId: string | null;
  source: ValueObjectTreeNodeSource;
  status: ValueObjectTreeNodeStatus;
  objectKind: ValueObjectTreeObjectKind;
  usageScope: "private" | "commercial";
  authorType: "user" | "organization" | "system";
  linkedSemanticKeys: string[];
  notes: string[];
}

export interface ValueObjectTreePreviewPackage {
  packageId: string;
  status: "read_only_fixture";
  generatedForFlow: "ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW";
  rootNodeIds: string[];
  nodes: ValueObjectTreePreviewNode[];
  safety: {
    previewOnly: true;
    dbWriteAllowed: false;
    sqlAllowed: false;
    openAiCallAllowed: false;
    autoCreateValueObjectsAllowed: false;
    notes: string[];
  };
}

export interface ValueObjectTreePreviewNodeWithChildren extends ValueObjectTreePreviewNode {
  children: ValueObjectTreePreviewNodeWithChildren[];
}

export function buildValueObjectPreviewTree(
  nodes: ValueObjectTreePreviewNode[],
): ValueObjectTreePreviewNodeWithChildren[] {
  const byId = new Map<string, ValueObjectTreePreviewNodeWithChildren>();

  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  const roots: ValueObjectTreePreviewNodeWithChildren[] = [];

  for (const node of byId.values()) {
    if (node.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(node.parentId);

    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  const sortTree = (items: ValueObjectTreePreviewNodeWithChildren[]) => {
    items.sort((a, b) => a.titleRu.localeCompare(b.titleRu, "ru"));

    for (const item of items) {
      sortTree(item.children);
    }
  };

  sortTree(roots);

  return roots;
}
