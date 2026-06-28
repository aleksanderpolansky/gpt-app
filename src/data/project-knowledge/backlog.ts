// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { ProjectKnowledgeBacklogItem } from "@/types/project-knowledge";

export const projectKnowledgeBacklog = [
  {
    "id": "PKG-0",
    "priority": "P0",
    "area": "Spec lock",
    "title": "Confirm Stage4 spec as source for Project Knowledge Layer",
    "target": "No code; document-only decision",
    "acceptance": "Stage4 approved and linked to Stage5 microplan",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-1",
    "priority": "P0",
    "area": "Fixture data",
    "title": "Create project-knowledge fixtures from Stage1/2/3 CSVs",
    "target": "src/data/project-knowledge/*.ts or JSON",
    "acceptance": "Fixtures load with counts: terms/gaps/conflicts/routes/rules",
    "status": "Next",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-2",
    "priority": "P0",
    "area": "Shell",
    "title": "Create /project-knowledge read-only shell",
    "target": "src/app/project-knowledge/page.tsx + components",
    "acceptance": "Route opens; no DB; no hidden route calls",
    "status": "Next",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-3",
    "priority": "P0",
    "area": "Glossary",
    "title": "Render glossary list and term cards",
    "target": "/project-knowledge/glossary",
    "acceptance": "Search/filter; term detail shows role/UI/files/related/forbid",
    "status": "Next",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-4",
    "priority": "P0",
    "area": "Page map",
    "title": "Render canonical route map and conflicts",
    "target": "/project-knowledge/page-map",
    "acceptance": "Shows active/legacy/alias/debug decisions",
    "status": "Next",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-5",
    "priority": "P0",
    "area": "Forbidden map",
    "title": "Render forbidden confusions as cards/checks",
    "target": "/project-knowledge/forbidden-confusions",
    "acceptance": "Rules visible and linked to QA",
    "status": "Next",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-6",
    "priority": "P1",
    "area": "File map",
    "title": "Render file responsibility table from inventory-derived data",
    "target": "/project-knowledge/file-map",
    "acceptance": "File map searchable by term/route/layer; confidence visible",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-7",
    "priority": "P1",
    "area": "Process map",
    "title": "Render process flow cards",
    "target": "/project-knowledge/process-map",
    "acceptance": "Chains show input/output/gates/related pages",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-8",
    "priority": "P1",
    "area": "QA acceptance",
    "title": "Render acceptance matrix for UI-17/UI-18",
    "target": "/project-knowledge/qa-acceptance",
    "acceptance": "No-write/privacy/mobile/no-overclaim checks visible",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-9",
    "priority": "P1",
    "area": "Gap register",
    "title": "Render Stage2 gaps with filters",
    "target": "/project-knowledge/gaps",
    "acceptance": "P0/P1/P2 filters, status column, acceptance visible",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-10",
    "priority": "P1",
    "area": "Conflict register",
    "title": "Render Stage3 conflicts with decision/action",
    "target": "/project-knowledge/version-conflicts",
    "acceptance": "Open conflicts highlighted; canonical decisions visible",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-11",
    "priority": "P1",
    "area": "Decision/source registry",
    "title": "Render decisions and source document status",
    "target": "/project-knowledge/decisions; /sources",
    "acceptance": "Active/historical/superseded visible; no old doc ambiguity",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-12",
    "priority": "P1",
    "area": "Search/filter",
    "title": "Add shared search across terms/routes/files/gaps/conflicts",
    "target": "KnowledgeSearchBar",
    "acceptance": "Search returns grouped results without DB",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-13",
    "priority": "P1",
    "area": "Mobile smoke",
    "title": "Make Project Knowledge usable at 390px",
    "target": "Responsive shell",
    "acceptance": "No horizontal clipping; key pages usable",
    "status": "Planned",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-14",
    "priority": "P2",
    "area": "Import admin",
    "title": "Future gated import/sync from CSV",
    "target": "/project-knowledge/imports",
    "acceptance": "Write-gated, validated, audit logged",
    "status": "Future",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "PKG-15",
    "priority": "P2",
    "area": "DB persistence",
    "title": "Future DB tables for knowledge layer",
    "target": "Supabase migration after gate",
    "acceptance": "RLS/GRANT explicit; no broad anon/authenticated writes",
    "status": "Future",
    "sourceRefs": [
      {
        "sourceId": "stage4-project-knowledge-backlog-20260606",
        "sourceFile": "GPT_APP_Stage4_Project_Knowledge_Backlog_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  }
] satisfies readonly ProjectKnowledgeBacklogItem[];
