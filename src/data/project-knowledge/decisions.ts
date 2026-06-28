// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { DecisionRecord } from "@/types/project-knowledge";

export const projectKnowledgeDecisions = [
  {
    "id": "PKG-DEC-20260628-001",
    "date": "2026-06-28",
    "decision": "Close Phase 20C as primary user-facing multilingual UI scope, not as absolute code-wide Cyrillic cleanup.",
    "rationale": "Residual scan found many candidates that include false positives, debug/internal pages, dictionaries and content data. Remaining issues are handled by manual point-fix backlog.",
    "supersedes": [
      "Residual localization as universal blocker for Project Knowledge start"
    ],
    "affectedRoutes": [
      "/",
      "/directory",
      "/rewards",
      "/organizations",
      "/organizations/new"
    ],
    "affectedFiles": [
      "src/i18n/messages/*",
      "src/components/figma-dashboard/figma-dashboard.tsx",
      "src/app/organizations/page.tsx",
      "src/app/organizations/new/page.tsx"
    ],
    "status": "active",
    "sourceRefs": [
      {
        "sourceId": "pkg0-scope-lock-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG0_SCOPE_LOCK_RU_20260628.docx",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "factual-lock"
      }
    ]
  },
  {
    "id": "PKG-DEC-20260628-002",
    "date": "2026-06-28",
    "decision": "Project Knowledge MVP uses read-only fixtures before any database persistence.",
    "rationale": "Stage 4/5 governance requires no DB writes, no SQL, no hidden mutations, and no OpenAI calls for the knowledge layer MVP.",
    "supersedes": [],
    "affectedRoutes": [
      "/project-knowledge"
    ],
    "affectedFiles": [
      "src/types/project-knowledge.ts",
      "src/data/project-knowledge/*"
    ],
    "status": "active",
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Project_Knowledge_Implementation_Microplan_RU_20260606.docx",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-DEC-20260628-003",
    "date": "2026-06-28",
    "decision": "Current factual baseline for Project Knowledge intake is main @ 3d48ead.",
    "rationale": "PKG-0 source intake confirmed git status clean and HEAD...origin/main = 0 0.",
    "supersedes": [],
    "affectedRoutes": [],
    "affectedFiles": [
      "all current source package files"
    ],
    "status": "active",
    "sourceRefs": [
      {
        "sourceId": "pkg0-current-source-intake-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG0_CURRENT_SOURCE_INTAKE_AFTER_3D48EAD_REPORT_20260628_141237.txt",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "factual-lock"
      }
    ]
  },
  {
    "id": "PKG-DEC-20260628-004",
    "date": "2026-06-28",
    "decision": "Separate public SEO sitemap from internal Project Knowledge map.",
    "rationale": "SEO sitemap must expose only public indexable routes; internal map may include authenticated, admin, debug and governance links.",
    "supersedes": [],
    "affectedRoutes": [
      "/project-knowledge/page-map",
      "/sitemap.xml"
    ],
    "affectedFiles": [],
    "status": "active",
    "sourceRefs": [
      {
        "sourceId": "pkg0-scope-lock-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG0_SCOPE_LOCK_RU_20260628.docx",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "factual-lock"
      }
    ]
  }
] satisfies readonly DecisionRecord[];
