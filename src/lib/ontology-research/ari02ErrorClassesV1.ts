/** ARI-02 M-0078: controlled defect-class taxonomy. Not a search/ranking engine. */
export const ARI02_ERROR_CLASSES_V1 = [
  'wrong_facet', 'wrong_sense', 'translation',
  'path_only', 'duplicate', 'truncation',
] as const;
export type Ari02ErrorClass = typeof ARI02_ERROR_CLASSES_V1[number];
export type Ari02ClassificationStatus =
  | 'CONFIRMED' | 'CANDIDATE_REVIEW_REQUIRED' | 'UNDETERMINED';
export type Ari02ErrorClassification = {
  defectId: string;
  code: Ari02ErrorClass | null;
  status: Ari02ClassificationStatus;
  evidenceSha256?: string;
  reason: string;
};
export function isAri02ErrorClass(value: unknown): value is Ari02ErrorClass {
  return typeof value === 'string' && (ARI02_ERROR_CLASSES_V1 as readonly string[]).includes(value);
}
/** Absent evidence must never be reported as confirmed. */
export function canConfirmAri02ErrorClass(
  entry: Ari02ErrorClassification,
  hasReproducibleRankedEvidence: boolean,
  hasCuratorAdjudication: boolean,
): boolean {
  return entry.status === 'CONFIRMED' && isAri02ErrorClass(entry.code) &&
    typeof entry.evidenceSha256 === 'string' && /^[0-9a-f]{64}$/i.test(entry.evidenceSha256) &&
    hasReproducibleRankedEvidence && hasCuratorAdjudication;
}
