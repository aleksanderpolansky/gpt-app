import type {
  ValueObjectDomainGroup,
  ValueObjectUiNode,
} from "./value-object-types";

type ValueObjectFixtureSeed = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly domain: ValueObjectUiNode["domain"];
  readonly privacyLevel?: ValueObjectUiNode["privacyLevel"];
  readonly lifecycleStatus?: ValueObjectUiNode["lifecycleStatus"];
  readonly attentionStatus?: ValueObjectUiNode["attentionStatus"];
  readonly progressPercent: number;
  readonly confidencePercent: number;
  readonly activityCount: number;
  readonly tone: ValueObjectUiNode["metrics"][number]["tone"];
  readonly categoryLabels: readonly string[];
  readonly tags: readonly string[];
  readonly relatedObjectIds?: readonly string[];
};

const createValueObjectFixture = (
  seed: ValueObjectFixtureSeed,
): ValueObjectUiNode => ({
  id: seed.id,
  title: seed.title,
  description: seed.description,
  domain: seed.domain,
  privacyLevel: seed.privacyLevel ?? "private",
  lifecycleStatus: seed.lifecycleStatus ?? "active",
  attentionStatus: seed.attentionStatus ?? "balanced",
  progressPercent: seed.progressPercent,
  confidencePercent: seed.confidencePercent,
  activityCount: seed.activityCount,
  lastActivityAt: "2026-06-02T16:05:00.000Z",
  childIds: [],
  relatedObjectIds: seed.relatedObjectIds ?? [],
  categoryLabels: seed.categoryLabels,
  sourceLabels: ["UI-7 fixture", "read-only preview"],
  protocolFeatures: [
    {
      id: `pf-${seed.id}`,
      label: "Fixture mode",
      value: "read-only preview",
      helper: "Used only for UI-7 tree, cloud, and list rendering.",
    },
  ],
  relatedActivityCounters: [
    {
      id: `rac-${seed.id}`,
      label: "Related activity signals",
      count: seed.activityCount,
      helper: "Fixture signal only, not a final productivity score.",
      tone: seed.tone,
    },
  ],
  metrics: [
    {
      id: `metric-${seed.id}`,
      label: "Progress",
      value: `${seed.progressPercent}%`,
      helper: "Display-only progress signal.",
      tone: seed.tone,
    },
  ],
  reviewSignals: [
    {
      id: `review-${seed.id}`,
      label:
        seed.attentionStatus === "needs_review"
          ? "Needs review"
          : "Stable preview",
      description:
        "UI-7 may display this object but must not create, edit, merge, archive, or delete it.",
      tone: seed.attentionStatus === "needs_review" ? "amber" : seed.tone,
    },
  ],
  tags: seed.tags,
  notes: [
    "Read-only fixture.",
    "Hierarchy and grouping are UI views, not ontology truth.",
  ],
});

export const VALUE_OBJECT_DOMAIN_GROUPS: readonly ValueObjectDomainGroup[] = [
  {
    domain: "time",
    label: "Time",
    description: "Capacity, calendar windows, planning rhythm, and attention balance.",
    tone: "indigo",
    objectIds: ["vo-time-weekly-capacity"],
  },
  {
    domain: "money",
    label: "Money",
    description: "Commercial value, points, certificates, and external purchase confirmations.",
    tone: "emerald",
    objectIds: ["vo-money-commercial-core"],
  },
  {
    domain: "health",
    label: "Health",
    description: "Micro-training, recovery, sleep, and body-energy planning.",
    tone: "rose",
    objectIds: ["vo-health-micro-training"],
  },
  {
    domain: "learning",
    label: "Learning",
    description: "Languages, certificates, portfolio skills, and career readiness.",
    tone: "violet",
    objectIds: ["vo-learning-four-language-negotiator"],
  },
  {
    domain: "semantic",
    label: "Semantic",
    description: "Review decisions, candidate meanings, source order, and object architecture.",
    tone: "amber",
    objectIds: ["vo-semantics-value-object-layer"],
  },
  {
    domain: "family",
    label: "Family",
    description: "Family logistics, child learning, and household attention.",
    tone: "cyan",
    objectIds: ["vo-family-sofia-learning"],
  },
];

export const VALUE_OBJECT_FIXTURES: readonly ValueObjectUiNode[] = [
  createValueObjectFixture({
    id: "vo-time-weekly-capacity",
    title: "Weekly capacity map",
    description:
      "A planning object for balancing work, opera, learning, family, recovery, and focused project windows.",
    domain: "time",
    progressPercent: 66,
    confidencePercent: 82,
    activityCount: 42,
    tone: "indigo",
    categoryLabels: ["capacity", "calendar windows", "attention balance"],
    tags: ["time", "planning", "capacity"],
    relatedObjectIds: [
      "vo-health-micro-training",
      "vo-learning-four-language-negotiator",
    ],
  }),
  createValueObjectFixture({
    id: "vo-money-commercial-core",
    title: "Commercial core",
    description:
      "A commercial object for purchase confirmations, points, certificates, and organization-linked value.",
    domain: "money",
    privacyLevel: "organization",
    attentionStatus: "needs_review",
    progressPercent: 61,
    confidencePercent: 70,
    activityCount: 27,
    tone: "emerald",
    categoryLabels: ["purchase confirmation", "points", "certificate"],
    tags: ["money", "points", "certificates"],
    relatedObjectIds: ["vo-semantics-value-object-layer"],
  }),
  createValueObjectFixture({
    id: "vo-health-micro-training",
    title: "Micro-training routine",
    description:
      "A health object for short exercise sets, recovery-aware movement, and sustainable development.",
    domain: "health",
    progressPercent: 73,
    confidencePercent: 79,
    activityCount: 54,
    tone: "rose",
    categoryLabels: ["pull-ups", "dips", "mobility", "recovery"],
    tags: ["health", "training", "recovery"],
    relatedObjectIds: ["vo-time-weekly-capacity"],
  }),
  createValueObjectFixture({
    id: "vo-learning-four-language-negotiator",
    title: "Four-language negotiator",
    description:
      "A learning and career object for English, German, Spanish, and Polish negotiation readiness.",
    domain: "learning",
    progressPercent: 69,
    confidencePercent: 83,
    activityCount: 88,
    tone: "violet",
    categoryLabels: [
      "English",
      "German",
      "Spanish",
      "Polish",
      "B2B negotiation",
    ],
    tags: ["learning", "languages", "career"],
    relatedObjectIds: ["vo-time-weekly-capacity"],
  }),
  createValueObjectFixture({
    id: "vo-semantics-value-object-layer",
    title: "Value Object layer",
    description:
      "A semantic architecture object for unified Value Objects, category clouds, protocol features, and analytics display.",
    domain: "semantic",
    attentionStatus: "needs_review",
    progressPercent: 53,
    confidencePercent: 78,
    activityCount: 29,
    tone: "amber",
    categoryLabels: ["unified object", "category cloud", "protocol feature"],
    tags: ["value objects", "semantic", "architecture"],
    relatedObjectIds: [
      "vo-money-commercial-core",
      "vo-learning-four-language-negotiator",
    ],
  }),
  createValueObjectFixture({
    id: "vo-family-sofia-learning",
    title: "Sofia learning support",
    description:
      "A family object for child-friendly language learning, rewards, and simple sentence practice.",
    domain: "family",
    attentionStatus: "not_started",
    progressPercent: 24,
    confidencePercent: 72,
    activityCount: 9,
    tone: "cyan",
    categoryLabels: ["Spanish for child", "simple sentences", "reward drawing"],
    tags: ["family", "learning", "Sofia"],
    relatedObjectIds: ["vo-learning-four-language-negotiator"],
  }),
];

export const DEFAULT_SELECTED_VALUE_OBJECT_ID =
  "vo-semantics-value-object-layer";
