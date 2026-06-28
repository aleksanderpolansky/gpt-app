// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { FileResponsibility } from "@/types/project-knowledge";

export const projectKnowledgeFileResponsibilities = [
  {
    "id": "file-responsibility-001-src-app-page-tsx",
    "file": "src/app/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Home route renders FigmaDashboard.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-002-src-components-figma-dashboard-figma-dashboard-tsx",
    "file": "src/components/figma-dashboard/figma-dashboard.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend component",
    "primaryResponsibility": "Main dashboard/home UI, KPI cards, charts, locale-driven labels.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-003-src-components-app-shell-global-ai-navigator-tsx",
    "file": "src/components/app-shell/global-ai-navigator.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend component",
    "primaryResponsibility": "Right AI Navigator panel, messages, model selector, bottom composer.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-004-src-components-app-shell-ai-navigator-provider-tsx",
    "file": "src/components/app-shell/ai-navigator-provider.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend component",
    "primaryResponsibility": "AI Navigator state/provider and runtime interaction glue.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-005-src-app-activity-facts-page-tsx",
    "file": "src/app/activity-facts/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Read-only activity facts table UI.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-006-src-app-api-activity-semantic-orchestration-preview-route-ts",
    "file": "src/app/api/activity/semantic-orchestration-preview/route.ts",
    "existsInSourcePackage": true,
    "layer": "api route",
    "primaryResponsibility": "Semantic preview endpoint; no-write preview boundary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-007-src-app-api-activity-facts-save-gate-route-ts",
    "file": "src/app/api/activity/facts/save-gate/route.ts",
    "existsInSourcePackage": true,
    "layer": "api route",
    "primaryResponsibility": "Server-mediated real write gate for activity facts.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-008-src-app-api-activity-facts-route-ts",
    "file": "src/app/api/activity/facts/route.ts",
    "existsInSourcePackage": true,
    "layer": "api route",
    "primaryResponsibility": "Read API for activity facts table.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-009-src-app-directory-page-tsx",
    "file": "src/app/directory/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Public business directory search/filter UI.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-010-src-app-rewards-page-tsx",
    "file": "src/app/rewards/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Rewards/certificates catalog UI.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-011-src-app-organizations-page-tsx",
    "file": "src/app/organizations/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "My organizations list page.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-012-src-app-organizations-new-page-tsx",
    "file": "src/app/organizations/new/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Create organization form.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-013-src-app-offers-page-tsx",
    "file": "src/app/offers/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Offers list page.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-014-src-app-offers-new-page-tsx",
    "file": "src/app/offers/new/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Create offer form.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-015-src-app-points-page-tsx",
    "file": "src/app/points/page.tsx",
    "existsInSourcePackage": true,
    "layer": "frontend page",
    "primaryResponsibility": "Points wallet/history UI.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-016-src-i18n-messages-dashboard-ts",
    "file": "src/i18n/messages/dashboard.ts",
    "existsInSourcePackage": true,
    "layer": "i18n dictionary",
    "primaryResponsibility": "Dashboard localization dictionary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-017-src-i18n-messages-organizations-ts",
    "file": "src/i18n/messages/organizations.ts",
    "existsInSourcePackage": true,
    "layer": "i18n dictionary",
    "primaryResponsibility": "Organizations localization dictionary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-018-src-i18n-messages-directory-list-ts",
    "file": "src/i18n/messages/directory-list.ts",
    "existsInSourcePackage": true,
    "layer": "i18n dictionary",
    "primaryResponsibility": "Directory list localization dictionary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-019-src-i18n-messages-offers-ts",
    "file": "src/i18n/messages/offers.ts",
    "existsInSourcePackage": true,
    "layer": "i18n dictionary",
    "primaryResponsibility": "Offers localization dictionary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-020-src-i18n-messages-points-ts",
    "file": "src/i18n/messages/points.ts",
    "existsInSourcePackage": true,
    "layer": "i18n dictionary",
    "primaryResponsibility": "Points localization dictionary.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-021-lib-activity-categoryderivation-activitysemanticorchestrationservicev0-ts",
    "file": "lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0.ts",
    "existsInSourcePackage": true,
    "layer": "domain lib",
    "primaryResponsibility": "Activity semantic orchestration service.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "file-responsibility-022-lib-activity-categoryderivation-stablesemanticbundlepersistenceservicev0-ts",
    "file": "lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceV0.ts",
    "existsInSourcePackage": true,
    "layer": "domain lib",
    "primaryResponsibility": "Stable semantic bundle persistence service.",
    "relatedRoutes": [],
    "confidence": "confirmed",
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_file_responsibility_starter_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  }
] satisfies readonly FileResponsibility[];
