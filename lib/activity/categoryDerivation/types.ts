export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue>;

export type CategoryDerivationSource =
  | "rule"
  | "ai"
  | "user"
  | "system"
  | "migration";

export type CategoryDerivationSemanticLayer =
  | "action"
  | "object"
  | "domain"
  | "participant"
  | "relationship_context"
  | "role"
  | "duty"
  | "responsibility"
  | "care_function"
  | "purpose"
  | "activity_meaning"
  | "metric"
  | "context"
  | "other";

export type CategoryDerivationResolutionStatus =
  | "resolved_existing"
  | "created_suggested"
  | "created_active"
  | "unresolved";

export type CategoryDerivationRunStatus =
  | "started"
  | "completed"
  | "completed_with_warnings"
  | "failed";

export interface CategoryCandidate {
  slug: string;
  title?: string;
  semanticLayer?: CategoryDerivationSemanticLayer | string;
  categoryType?: string;
  confidence?: number;
  source: CategoryDerivationSource;
  isRequired?: boolean;
  isConfirmed?: boolean;
  needsUserReview?: boolean;
  metadata?: JsonRecord;
}

export interface ResolvedCategoryCandidate extends CategoryCandidate {
  categoryId: string | null;
  resolutionStatus: CategoryDerivationResolutionStatus;
}

export interface CategoryDerivationInput {
  activityEventId?: string;
  inputText: string;
  title?: string | null;
  description?: string | null;
  durationMinutes?: number | null;
  inputLanguage?: string | null;
  actorId?: string | null;
  organizationId?: string | null;
  metadata?: JsonRecord;
}

export interface CategoryDerivationResult {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string | null;
  processorVersion: string;
  ruleVersion?: string | null;
  confidence?: number | null;
  candidates: CategoryCandidate[];
  warnings: string[];
  errors: string[];
  metadata?: JsonRecord;
}

export interface CategoryResolutionResult {
  ok: boolean;
  candidates: ResolvedCategoryCandidate[];
  createdCount: number;
  reusedCount: number;
  unresolvedCount: number;
  warnings: string[];
  errors: string[];
  metadata?: JsonRecord;
}

export interface CategoryDerivationRunInsert {
  activity_event_id: string;
  actor_id?: string | null;
  organization_id?: string | null;
  input_text?: string | null;
  input_language?: string | null;
  processor_version: string;
  rule_version?: string | null;
  model_name?: string | null;
  prompt_version?: string | null;
  status: CategoryDerivationRunStatus;
  confidence?: number | null;
  needs_user_confirmation?: boolean;
  input_json?: JsonRecord;
  output_json?: JsonRecord;
  error_json?: JsonRecord | null;
}

export interface ActivityCategoryDerivationInsert {
  candidate_title?: string | null;
  semantic_layer?: string | null;
  category_type?: string | null;
  source: CategoryDerivationSource;
  confidence?: number | null;
  is_required?: boolean;
  is_confirmed?: boolean;
  needs_user_review?: boolean;
  is_rejected?: boolean;
  metadata_json?: JsonRecord;
}
