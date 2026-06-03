import type {
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import { isValueObjectNeedsReview } from "./value-object-normalizer";

export const VALUE_OBJECT_ACTION_KEYS = [
  "preview",
  "semantic_review",
  "related_context",
  "source_signals",
] as const;

export type ValueObjectActionKey = (typeof VALUE_OBJECT_ACTION_KEYS)[number];

export interface ValueObjectActionPolicyItem {
  readonly key: ValueObjectActionKey;
  readonly label: string;
  readonly description: string;
  readonly tone: ValueObjectSignalTone;
  readonly isEnabled: boolean;
  readonly isPrimary: boolean;
  readonly href?: string;
  readonly disabledReason?: string;
}

export interface ValueObjectReadOnlyPolicy {
  readonly isReadOnly: true;
  readonly canPersistChanges: false;
  readonly lockedReason: string;
  readonly allowedActionKeys: readonly ValueObjectActionKey[];
}

export interface ValueObjectActionPolicyResult {
  readonly valueObjectId: string;
  readonly valueObjectTitle: string;
  readonly readOnlyPolicy: ValueObjectReadOnlyPolicy;
  readonly items: readonly ValueObjectActionPolicyItem[];
}

export const VALUE_OBJECT_READ_ONLY_POLICY: ValueObjectReadOnlyPolicy = {
  isReadOnly: true,
  canPersistChanges: false,
  lockedReason:
    "UI-7 is a display-only block. Record-changing operations are outside this scope.",
  allowedActionKeys: [
    "preview",
    "semantic_review",
    "related_context",
    "source_signals",
  ],
};

export const getValueObjectReviewHref = (
  valueObject: ValueObjectUiNode,
): string => `/semantic/review?valueObjectId=${encodeURIComponent(valueObject.id)}`;

export const getValueObjectLocalAnchor = (
  valueObject: ValueObjectUiNode,
): string => `#${valueObject.id}`;

export const getValueObjectActionPolicy = (
  valueObject: ValueObjectUiNode,
): ValueObjectActionPolicyResult => {
  const needsReview = isValueObjectNeedsReview(valueObject);
  const hasRelatedContext = valueObject.relatedObjectIds.length > 0;
  const hasSourceSignals = valueObject.sourceLabels.length > 0;

  return {
    valueObjectId: valueObject.id,
    valueObjectTitle: valueObject.title,
    readOnlyPolicy: VALUE_OBJECT_READ_ONLY_POLICY,
    items: [
      {
        key: "preview",
        label: "Preview",
        description:
          "Open the local read-only preview card for this Value Object.",
        tone: "indigo",
        isEnabled: true,
        isPrimary: !needsReview,
        href: getValueObjectLocalAnchor(valueObject),
      },
      {
        key: "semantic_review",
        label: "Semantic review",
        description:
          "Open the semantic review area when this object has review signals.",
        tone: "amber",
        isEnabled: needsReview,
        isPrimary: needsReview,
        href: needsReview ? getValueObjectReviewHref(valueObject) : undefined,
        disabledReason: needsReview
          ? undefined
          : "No review signal is active for this fixture.",
      },
      {
        key: "related_context",
        label: "Related context",
        description:
          "Show linked Value Objects inside the UI-7 read-only panel.",
        tone: "violet",
        isEnabled: hasRelatedContext,
        isPrimary: false,
        href: hasRelatedContext ? getValueObjectLocalAnchor(valueObject) : undefined,
        disabledReason: hasRelatedContext
          ? undefined
          : "No related Value Objects are attached to this fixture.",
      },
      {
        key: "source_signals",
        label: "Source signals",
        description:
          "Show the source labels that explain why this object is visible.",
        tone: "cyan",
        isEnabled: hasSourceSignals,
        isPrimary: false,
        href: hasSourceSignals ? getValueObjectLocalAnchor(valueObject) : undefined,
        disabledReason: hasSourceSignals
          ? undefined
          : "No source labels are attached to this fixture.",
      },
    ],
  };
};

export const getEnabledValueObjectActions = (
  valueObject: ValueObjectUiNode,
): readonly ValueObjectActionPolicyItem[] =>
  getValueObjectActionPolicy(valueObject).items.filter((item) => item.isEnabled);

export const getPrimaryValueObjectAction = (
  valueObject: ValueObjectUiNode,
): ValueObjectActionPolicyItem | undefined =>
  getValueObjectActionPolicy(valueObject).items.find((item) => item.isPrimary);
