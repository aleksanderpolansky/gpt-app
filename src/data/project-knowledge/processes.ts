// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { ProcessMapItem } from "@/types/project-knowledge";

export const projectKnowledgeProcesses = [
  {
    "id": "PKG-PROC-001",
    "process": "AI Navigator message -> semantic preview -> save-gate -> activity facts",
    "primaryRoutes": [
      "/",
      "/activity-facts"
    ],
    "primaryApi": [
      "/api/activity/semantic-orchestration-preview",
      "/api/activity/facts/save-gate",
      "/api/activity/facts"
    ],
    "primaryFiles": [
      "src/components/app-shell/global-ai-navigator.tsx",
      "src/app/api/activity/semantic-orchestration-preview/route.ts",
      "src/app/api/activity/facts/save-gate/route.ts",
      "src/app/activity-facts/page.tsx"
    ],
    "status": "production-validated in previous logs; write only through save-gate",
    "gateNotes": "single input in right AI column; preview != write; candidate != saved fact",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "PKG-PROC-002",
    "process": "Dashboard/Home multilingual shell",
    "primaryRoutes": [
      "/"
    ],
    "primaryApi": [
      "/api/points/wallet",
      "/api/ai-billing/balance"
    ],
    "primaryFiles": [
      "src/app/page.tsx",
      "src/components/figma-dashboard/figma-dashboard.tsx",
      "src/i18n/messages/dashboard.ts"
    ],
    "status": "Phase20C-17 production accepted at e085597",
    "gateNotes": "system UI localized; residual user/content texts not in scope",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "PKG-PROC-003",
    "process": "Directory and rewards/certificates public-commercial browsing",
    "primaryRoutes": [
      "/directory",
      "/directory/[slug]",
      "/rewards",
      "/my-certificates",
      "/seller-certificates"
    ],
    "primaryApi": [
      "/api/directory/*",
      "/api/rewards/*",
      "/api/certificates/*"
    ],
    "primaryFiles": [
      "src/app/directory/page.tsx",
      "src/app/rewards/page.tsx",
      "src/i18n/messages/directory-list.ts",
      "src/i18n/messages/certificates.ts"
    ],
    "status": "Phase20C target zones partly production accepted; remaining pages need map verification",
    "gateNotes": "business content remains original language unless explicit content-localization phase",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "PKG-PROC-004",
    "process": "Organizations -> service/value object -> offer -> directory",
    "primaryRoutes": [
      "/organizations",
      "/organizations/new",
      "/organizations/[id]",
      "/offers",
      "/offers/new"
    ],
    "primaryApi": [
      "/api/organizations",
      "/api/offers",
      "/api/value-objects"
    ],
    "primaryFiles": [
      "src/app/organizations/page.tsx",
      "src/app/organizations/new/page.tsx",
      "src/i18n/messages/organizations.ts",
      "src/i18n/messages/offers.ts"
    ],
    "status": "organizations list/new localized and production synced at 3d48ead; offers still candidate for future residual pass",
    "gateNotes": "commercial user-entered content is not translated by UI localization",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "PKG-PROC-005",
    "process": "Points wallet and AI billing projections",
    "primaryRoutes": [
      "/points",
      "/admin/ai-billing"
    ],
    "primaryApi": [
      "/api/points/*",
      "/api/ai-billing/*",
      "/api/admin/*"
    ],
    "primaryFiles": [
      "src/i18n/messages/points.ts",
      "src/app/points/page.tsx",
      "src/app/admin/ai-billing/page.tsx"
    ],
    "status": "implemented in Phase 20C/V06-V08 logs; verify before future billing changes",
    "gateNotes": "user-facing UI shows approximate model tokens, not internal EUR balance",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "PKG-PROC-006",
    "process": "Project Knowledge / Governance layer",
    "primaryRoutes": [
      "/project-knowledge and subroutes planned"
    ],
    "primaryApi": [
      "none for MVP"
    ],
    "primaryFiles": [
      "future: src/app/project-knowledge/*",
      "src/data/project-knowledge/*",
      "src/types/project-knowledge.ts"
    ],
    "status": "PKG-0 scope lock created; current source intake accepted",
    "gateNotes": "MVP read-only fixtures first; no DB writes; no SQL; no OpenAI calls",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_process_map_preliminary_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  }
] satisfies readonly ProcessMapItem[];
