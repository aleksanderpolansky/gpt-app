export const RECOGNITION_CANDIDATE_LIMIT = 5;
export const RECOGNITION_CANDIDATE_CONTRACT_VERSION =
  "AI_A2_GSR1L_BOUNDED_CANDIDATES_V1";

export type RecognitionEvidenceClass = "exact" | "strong" | "supporting";

export type RecognitionStatus =
  | "NO_MATCH"
  | "UNRESOLVED_TOO_BROAD"
  | "UNRESOLVED"
  | "SINGLE_CANDIDATE"
  | "CANDIDATES_READY";

const RECOGNITION_STATUSES = new Set<RecognitionStatus>([
  "NO_MATCH",
  "UNRESOLVED_TOO_BROAD",
  "UNRESOLVED",
  "SINGLE_CANDIDATE",
  "CANDIDATES_READY",
]);

const RECOGNITION_EVIDENCE_CLASSES = new Set<RecognitionEvidenceClass>([
  "exact",
  "strong",
  "supporting",
]);

export function isRecognitionStatus(value: string): value is RecognitionStatus {
  return RECOGNITION_STATUSES.has(value as RecognitionStatus);
}

export function isRecognitionEvidenceClass(
  value: string,
): value is RecognitionEvidenceClass {
  return RECOGNITION_EVIDENCE_CLASSES.has(value as RecognitionEvidenceClass);
}

export function isRecognitionStatusShapeValid(input: {
  status: RecognitionStatus;
  candidateCount: number;
  returnedCandidateCount: number;
  limit?: number;
}) {
  const limit = input.limit ?? RECOGNITION_CANDIDATE_LIMIT;

  if (
    !Number.isInteger(input.candidateCount) ||
    input.candidateCount < 0 ||
    !Number.isInteger(input.returnedCandidateCount) ||
    input.returnedCandidateCount < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > RECOGNITION_CANDIDATE_LIMIT
  ) {
    return false;
  }

  switch (input.status) {
    case "NO_MATCH":
      return input.candidateCount === 0 && input.returnedCandidateCount === 0;
    case "UNRESOLVED_TOO_BROAD":
      return input.candidateCount > limit && input.returnedCandidateCount === 0;
    case "UNRESOLVED":
      return (
        input.candidateCount >= 2 &&
        input.candidateCount <= limit &&
        input.returnedCandidateCount === input.candidateCount
      );
    case "SINGLE_CANDIDATE":
      return input.candidateCount === 1 && input.returnedCandidateCount === 1;
    case "CANDIDATES_READY":
      return (
        input.candidateCount >= 2 &&
        input.candidateCount <= limit &&
        input.returnedCandidateCount === input.candidateCount
      );
  }
}

export function isRecognitionCandidateSelectable(
  status: RecognitionStatus,
  evidenceClass: RecognitionEvidenceClass,
) {
  if (status !== "SINGLE_CANDIDATE" && status !== "CANDIDATES_READY") {
    return false;
  }

  return evidenceClass === "exact" || evidenceClass === "strong";
}
