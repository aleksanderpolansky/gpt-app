"use client";

import { useState } from "react";

import { SemanticCloudButton } from "../../semantic-cloud/semantic-cloud-button";

import { WorkspaceSemanticCloudPanel } from "./workspace-semantic-cloud-panel";

export function WorkspaceSemanticCloudButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <SemanticCloudButton
        isOpen={isOpen}
        onClick={() => {
          setIsOpen(true);
        }}
      />

      <WorkspaceSemanticCloudPanel
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
}
