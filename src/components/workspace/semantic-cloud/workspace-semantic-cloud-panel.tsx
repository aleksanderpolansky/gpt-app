"use client";

import { SemanticCloudPanel } from "../../semantic-cloud/semantic-cloud-panel";

export type WorkspaceSemanticCloudPanelProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export function WorkspaceSemanticCloudPanel({
  open,
  onClose,
}: WorkspaceSemanticCloudPanelProps) {
  return <SemanticCloudPanel open={open} onClose={onClose} />;
}
