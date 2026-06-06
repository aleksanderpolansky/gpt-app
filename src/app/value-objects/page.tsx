import type { Metadata } from "next";
import Link from "next/link";

import { ValueObjectsPanel } from "@/components/workspace/value-objects/value-objects-panel";

export const metadata: Metadata = {
  title: "Value Objects | AI Navigator",
  description:
    "Read-only Value Objects list, tree, cloud, and detail preview.",
};

export default function ValueObjectsPage() {
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <div className="min-h-screen bg-slate-50">
              <div className="mx-auto flex max-w-7xl justify-end px-6 pt-6">
                <Link
                  href="/value-objects/learning-business-german"
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Open fixture detail card
                </Link>
              </div>
        
              <ValueObjectsPanel />
            </div>
      </div>
</div>
  );
}


