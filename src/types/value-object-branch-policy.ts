export type ValueObjectBranchPolicyStatus = "active" | "inactive" | string;

export interface ValueObjectBranchPolicyDto {
  branchTypeCode: string;
  titleKey: string;
  descriptionKey: string;
  displayOrder: number;
  status: ValueObjectBranchPolicyStatus;
}

export interface ValueObjectBranchPolicyListResponse {
  ok?: boolean;
  policies?: ValueObjectBranchPolicyDto[];
  error?: string;
}
