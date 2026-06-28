// GPT-APP / AI-NAVIGATOR
// PKG-3 Project Knowledge data contracts
// Read-only governance layer contracts. No DB writes, no SQL, no OpenAI calls.

export type ProjectKnowledgeStatus =
  | "active"
  | "canonical"
  | "legacy"
  | "alias"
  | "debug"
  | "internal"
  | "future"
  | "backlog"
  | "superseded"
  | "candidate"
  | "open"
  | "closed"
  | "factual-lock"
  | "production-accepted"
  | (string & {});

export type KnowledgeConfidence = "confirmed" | "inferred" | "candidate";

export type KnowledgeSurface =
  | "public"
  | "authenticated"
  | "admin"
  | "internal"
  | "debug"
  | "api"
  | (string & {});

export type KnowledgeTrustLevel =
  | "factual-lock"
  | "active-doc"
  | "historical-doc"
  | "generated-inventory"
  | "manual-review";

export interface KnowledgeSourceRef {
  sourceId: string;
  sourceFile: string;
  sourceBatch?: string;
  sourceDate?: string;
  trustLevel: KnowledgeTrustLevel;
}

export interface SourceDocument {
  id: string;
  file: string;
  title: string;
  extension?: string;
  sizeBytes?: number;
  version?: string;
  date?: string;
  status: ProjectKnowledgeStatus;
  sourceGroup?: string;
  stageOrPhaseGuess?: string;
  notes?: string;
  sourceRefs?: KnowledgeSourceRef[];
}

export interface KnowledgeTerm {
  id: string;
  term: string;
  layer?: string;
  aliases?: string[];
  definition: string;
  role?: string;
  ui?: string[];
  status: ProjectKnowledgeStatus;
  relatedRoutes?: string[];
  relatedFiles?: string[];
  relatedTerms?: string[];
  relatedProcesses?: string[];
  forbiddenConfusion?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface PageRouteRef {
  id: string;
  route: string;
  kind?: string;
  file: string;
  area: string;
  surface: KnowledgeSurface;
  status: ProjectKnowledgeStatus;
  usesI18n: boolean;
  clientComponent: boolean;
  cyrillicCharCount?: number;
  cyrillicLineCount?: number;
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ApiEndpointRef {
  id: string;
  endpoint: string;
  methods: string[];
  file: string;
  area: string;
  surface: KnowledgeSurface;
  likelyWriteOrMutation: boolean;
  supabaseUsage: boolean;
  openaiUsage: boolean;
  authOrSessionUsage: boolean;
  cyrillicCharCount?: number;
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ComponentRef {
  id: string;
  file: string;
  componentOrExportGuess: string;
  area: string;
  folder?: string;
  usesI18n: boolean;
  usesSupabaseOrApiFetch: boolean;
  cyrillicCharCount?: number;
  cyrillicLineCount?: number;
  importsCount?: number;
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface DatabaseSqlRef {
  id: string;
  file: string;
  fileType: string;
  createTableCount: number;
  alterTableCount: number;
  createPolicyCount: number;
  grantCount: number;
  functionCount: number;
  tablesMentioned: string[];
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface I18nDictionaryRef {
  id: string;
  file: string;
  messageKeyMarkers: number;
  localeCoverage: Record<"ru" | "pl" | "en" | "es" | "uk" | "de" | "cs", boolean>;
  cyrillicCharCount?: number;
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ProcessMapItem {
  id: string;
  process: string;
  primaryRoutes: string[];
  primaryApi: string[];
  primaryFiles: string[];
  status: string;
  gateNotes: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface FileResponsibility {
  id: string;
  file: string;
  existsInSourcePackage: boolean;
  layer: string;
  primaryResponsibility: string;
  relatedRoutes?: string[];
  confidence: KnowledgeConfidence;
  notes?: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface TroubleshootingRule {
  id: string;
  issue: string;
  whereToStart: string;
  thenCheck: string[];
  gate: string;
  sourceRefs: KnowledgeSourceRef[];
}

export interface DecisionRecord {
  id: string;
  date: string;
  decision: string;
  rationale: string;
  supersedes?: string[];
  affectedRoutes?: string[];
  affectedFiles?: string[];
  status: ProjectKnowledgeStatus;
  sourceRefs: KnowledgeSourceRef[];
}

export interface GapItem {
  id: string;
  priority: string;
  area: string;
  title: string;
  current: string;
  gap: string;
  risk: string;
  recommendation: string;
  acceptance: string;
  status: ProjectKnowledgeStatus;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ConflictItem {
  id: string;
  priority: string;
  type: string;
  title: string;
  old: string;
  current: string;
  risk: string;
  decision: string;
  action: string;
  status: ProjectKnowledgeStatus;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ProjectKnowledgeBacklogItem {
  id: string;
  priority: string;
  area: string;
  title: string;
  target: string;
  acceptance: string;
  status: ProjectKnowledgeStatus;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ImplementationMicrostep {
  id: string;
  number: number;
  block: string;
  priority: string;
  microstep: string;
  filesOrRoutes: string;
  action: string;
  definitionOfDone: string;
  gate: string;
  status: ProjectKnowledgeStatus;
  totalSteps: number;
  remainingAfterStep: number;
  sourceRefs: KnowledgeSourceRef[];
}

export interface LocalizationResidualCandidate {
  id: string;
  file: string;
  line: number;
  severity: string;
  classification: string;
  sample: string;
  disposition: "manual-point-fix" | "false-positive" | "needs-review" | "fixed";
  sourceRefs: KnowledgeSourceRef[];
}

export interface KnowledgeRelation {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relationType: string;
  confidence: KnowledgeConfidence;
  sourceRefs: KnowledgeSourceRef[];
}

export interface ProjectKnowledgeInventoryStats {
  baselineCommit: string;
  generatedAt: string;
  routeCount: number;
  apiEndpointCount: number;
  componentCount: number;
  databaseSqlRefCount: number;
  sourceDocumentCount: number;
  termCount: number;
  gapCount: number;
  conflictCount: number;
}
