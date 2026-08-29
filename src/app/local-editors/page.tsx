import type { Metadata } from "next";

import { LocalEditorPlatform } from "@/components/local-editors/local-editor-platform";

export const metadata: Metadata = {
  title: "Local editors | ARCTor",
  description: "Local-only document, spreadsheet and mind-map workspace.",
};

export default function LocalEditorsPage() {
  return <LocalEditorPlatform />;
}
