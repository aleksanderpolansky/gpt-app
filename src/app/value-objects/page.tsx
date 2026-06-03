import type { Metadata } from "next";

import { ValueObjectsPanel } from "@/components/workspace/value-objects/value-objects-panel";

export const metadata: Metadata = {
  title: "Value Objects | AI Navigator",
  description:
    "Read-only Value Objects list, tree, cloud, and detail preview.",
};

export default function ValueObjectsPage() {
  return <ValueObjectsPanel />;
}
