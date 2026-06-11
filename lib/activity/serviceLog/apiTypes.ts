export type ServiceLogStageStatus =
  | "started"
  | "success"
  | "failed"
  | "skipped"
  | "blocked"
  | "warning";

export type ServiceLogPrivacyBadge =
  | "private"
  | "sensitive"
  | "public-blocked"
  | "raw-masked"
  | "ai-output-private";

export type ServiceLogWriteBadge =
  | "preview-only"
  | "write-attempted"
  | "activity-created"
  | "no-activity-created";

export type ServiceLogDiagnosticBadge = {
  readonly isDiagnostic: boolean;
  readonly reasons: readonly string[];
};

export type ServiceLogCandidateCounts = {
  readonly categories: number;
  readonly metrics: number;
  readonly valueObjects: number;
  readonly exposures: number;
  readonly stateDeltas: number;
  readonly reviewActions: number;
};

export type ServiceLogRunPermissions = {
  readonly canViewRawText: boolean;
  readonly canViewDebugPayload: boolean;
  readonly canViewEvidence: boolean;
};

export type ServiceLogRunFilters = {
  readonly limit: number;
  readonly cursor: string | null;
  readonly stageKey: string | null;
  readonly stageStatus: string | null;
  readonly sourceSurface: string | null;
  readonly sourceRoute: string | null;
  readonly sourceComponent: string | null;
  readonly isPreview: boolean | null;
  readonly isWriteAttempted: boolean | null;
  readonly activityEventCreated: boolean | null;
  readonly visibleInServiceLog: boolean;
  readonly privacyScope: string | null;
  readonly diagnostic: boolean | null;
};

export type ServiceLogApiErrorCode =
  | "UNAUTHORIZED"
  | "APP_USER_MAPPING_MISSING"
  | "INVALID_QUERY"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export type ServiceLogApiError = {
  readonly error: string;
  readonly code: ServiceLogApiErrorCode;
  readonly requestId?: string;
};

export type ServiceLogRunListItem = {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly stageKey: string;
  readonly stageStatus: ServiceLogStageStatus | string;
  readonly sourceSurface: string;
  readonly sourceRoute: string | null;
  readonly sourceComponent: string | null;
  readonly httpMethod: string | null;
  readonly processorName: string;
  readonly processorVersion: string;
  readonly requestId: string | null;
  readonly correlationId: string | null;
  readonly clientEventId: string | null;
  readonly isPreview: boolean;
  readonly isWriteAttempted: boolean;
  readonly activityEventCreated: boolean;
  readonly activityEventId: string | null;
  readonly visibleInServiceLog: boolean;
  readonly privacyScope: string;
  readonly containsSensitiveData: boolean;
  readonly publicSafe: boolean;
  readonly rawTextPubliclyVisible: boolean;
  readonly aiOutputPubliclyVisible: boolean;
  readonly candidateCounts: ServiceLogCandidateCounts;
  readonly privacyBadges: readonly ServiceLogPrivacyBadge[];
  readonly writeBadge: ServiceLogWriteBadge;
  readonly diagnosticBadge: ServiceLogDiagnosticBadge;
  readonly hasWarnings: boolean;
  readonly hasDebugPayload: boolean;
  readonly hasEvidence: boolean;
  readonly displaySummary: string;
  readonly rawMessagePreviewMasked: string | null;
};

export type ServiceLogRunListResponse = {
  readonly items: readonly ServiceLogRunListItem[];
  readonly nextCursor: string | null;
  readonly appliedFilters: ServiceLogRunFilters;
  readonly warnings: readonly string[];
};

export type ServiceLogRunDetail = ServiceLogRunListItem & {
  readonly rawMessageText: string | null;
  readonly categoryCandidatesJson: readonly unknown[];
  readonly metricCandidatesJson: readonly unknown[];
  readonly valueObjectCandidatesJson: readonly unknown[];
  readonly exposureCandidatesJson: readonly unknown[];
  readonly stateDeltaCandidatesJson: readonly unknown[];
  readonly reviewActionCandidatesJson: readonly unknown[];
  readonly entityClassificationIdsJson: readonly unknown[];
  readonly valueObjectIdsJson: readonly unknown[];
  readonly eventLinkIdsJson: readonly unknown[];
  readonly aggregateIdsJson: readonly unknown[];
  readonly metricSummaryJson: Record<string, unknown>;
  readonly quantitySummaryJson: Record<string, unknown>;
  readonly qualityScoreJson: Record<string, unknown>;
  readonly safetyWarningsJson: readonly unknown[];
  readonly warningMessagesJson: readonly unknown[];
  readonly debugPayloadJson: Record<string, unknown> | null;
  readonly evidenceJson: Record<string, unknown> | null;
};

export type ServiceLogRunDetailResponse = {
  readonly item: ServiceLogRunDetail;
  readonly permissions: ServiceLogRunPermissions;
  readonly warnings: readonly string[];
};

export type ServiceLogReadError = {
  readonly status: 400 | 401 | 404 | 500;
  readonly code: ServiceLogApiErrorCode;
  readonly safeMessage: string;
  readonly internalMessage?: string;
  readonly requestId?: string;
};

export type ServiceLogReadSuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type ServiceLogReadFailure = {
  readonly ok: false;
  readonly status: 400 | 401 | 404 | 500;
  readonly error: ServiceLogApiError;
  readonly internalMessage?: string;
};

export type ServiceLogReadResult<T> =
  | ServiceLogReadSuccess<T>
  | ServiceLogReadFailure;

export type ServiceLogAuthenticatedUserResult =
  | {
      readonly ok: true;
      readonly appUserId: string;
      readonly authSubject: string;
    }
  | {
      readonly ok: false;
      readonly status: 401;
      readonly code: "UNAUTHORIZED" | "APP_USER_MAPPING_MISSING";
      readonly safeMessage: string;
      readonly internalMessage?: string;
    };
