// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { TroubleshootingRule } from "@/types/project-knowledge";

export const projectKnowledgeTroubleshootingRules = [
  {
    "id": "troubleshooting-001-right-ai-navigator-input-or-preview-broken",
    "issue": "Right AI Navigator input or preview broken",
    "whereToStart": "src/components/app-shell/global-ai-navigator.tsx",
    "thenCheck": [
      "src/app/api/activity/semantic-orchestration-preview/route.ts",
      "src/app/api/activity/facts/save-gate/route.ts"
    ],
    "gate": "Preview must remain no-write; real write only through save-gate.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-002-activity-facts-table-does-not-show-saved-value",
    "issue": "Activity facts table does not show saved value",
    "whereToStart": "src/app/activity-facts/page.tsx",
    "thenCheck": [
      "src/app/api/activity/facts/route.ts",
      "Supabase activity_events/activity_object_facts/measures"
    ],
    "gate": "TYPE / VALUE / UNIT are separate.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-003-dashboard-localized-label-missing",
    "issue": "Dashboard localized label missing",
    "whereToStart": "src/components/figma-dashboard/figma-dashboard.tsx",
    "thenCheck": [
      "src/i18n/messages/dashboard.ts",
      "src/i18n/messages/index.ts"
    ],
    "gate": "Use locale from URL/search param; no hardcoded Russian in component.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-004-organizations-list-new-localized-label-missing",
    "issue": "Organizations list/new localized label missing",
    "whereToStart": "src/app/organizations/page.tsx ; src/app/organizations/new/page.tsx",
    "thenCheck": [
      "src/i18n/messages/organizations.ts",
      "src/i18n/messages/index.ts"
    ],
    "gate": "User-entered business content remains unchanged.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-005-directory-filters-location-geo-behavior-broken",
    "issue": "Directory filters/location/geo behavior broken",
    "whereToStart": "src/app/directory/page.tsx ; src/app/directory/components/*",
    "thenCheck": [
      "src/app/api/directory/*",
      "geo dictionaries/reference data"
    ],
    "gate": "Do not mix locale with geo; location requests only after explicit user action.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-006-points-or-ai-package-card-wrong",
    "issue": "Points or AI package card wrong",
    "whereToStart": "src/components/figma-dashboard/figma-dashboard.tsx ; src/app/points/page.tsx",
    "thenCheck": [
      "src/app/api/points/wallet/route.ts",
      "src/app/api/ai-billing/balance/route.ts",
      "src/i18n/messages/points.ts"
    ],
    "gate": "End user sees token projections, not internal EUR wallet.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-007-vercel-ready-but-ui-still-wrong",
    "issue": "Vercel Ready but UI still wrong",
    "whereToStart": "production browser screenshots",
    "thenCheck": [
      "deployment commit hash",
      "clear cache",
      "compare route/locale manually"
    ],
    "gate": "Vercel Ready != browser acceptance.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "troubleshooting-008-patch-build-script-fails",
    "issue": "Patch/build/script fails",
    "whereToStart": "ask for fresh current source ZIP and report",
    "thenCheck": [
      "do not keep diagnosing by touch from partial errors"
    ],
    "gate": "Workflow rule: after script/patch/build error request current source package.",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_troubleshooting_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  }
] satisfies readonly TroubleshootingRule[];
