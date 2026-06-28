// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { KnowledgeTerm } from "@/types/project-knowledge";

export const projectKnowledgeTerms = [
  {
    "id": "term-001-ai-navigator",
    "term": "AI-NAVIGATOR",
    "layer": "Product concept",
    "definition": "Операционная кабина для фиксации опыта, смысловой проверки, аналитики и выбора следующего действия.",
    "role": "Объединяет личные, семантические и коммерческие сценарии платформы.",
    "ui": [
      "Workspace",
      "Right AI Column",
      "Analytics",
      "Next"
    ],
    "relatedFiles": [
      "src/app/workspace/page.tsx",
      "src/components/workspace/workspace-shell.tsx"
    ],
    "relatedTerms": [
      "Workspace",
      "Next Best Action",
      "Semantic Layer",
      "Commercial Core"
    ],
    "forbiddenConfusion": "Не описывать как простой трекер задач или обычную CRM.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-002-workspace",
    "term": "Workspace",
    "layer": "UI shell",
    "definition": "Главная рабочая кабина: top bar, left nav, center workspace, right AI, bottom actions.",
    "role": "Основной способ работы пользователя с платформой.",
    "ui": [
      "/workspace"
    ],
    "relatedFiles": [
      "src/app/workspace/page.tsx",
      "src/components/workspace/workspace-shell.tsx",
      "src/components/workspace/workspace-left-nav.tsx",
      "src/components/workspace/workspace-center.tsx",
      "src/components/workspace/workspace-right-ai-column.tsx"
    ],
    "relatedTerms": [
      "Activity Capture",
      "Value Objects",
      "Contextual AI",
      "Mobile Shell"
    ],
    "forbiddenConfusion": "Не превращать в набор случайных ссылок.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-003-left-semantic-navigation",
    "term": "Left Semantic Navigation",
    "layer": "UI shell",
    "definition": "Левая карта объектов, доменов, организаций и смысловых фильтров.",
    "role": "Дает навигацию не только по страницам, но и по смысловым объектам.",
    "ui": [
      "Workspace left column"
    ],
    "relatedFiles": [
      "src/components/workspace/workspace-left-nav.tsx"
    ],
    "relatedTerms": [
      "Value Objects",
      "Organizations",
      "Needs Review"
    ],
    "forbiddenConfusion": "Не считать обычным меню.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-004-right-ai-column-contextual-ai",
    "term": "Right AI Column / Contextual AI",
    "layer": "AI UI",
    "definition": "Постоянная правая колонка AI, привязанная к открытому контексту.",
    "role": "Объясняет выбранную активность/объект/страницу и предлагает preview-действия.",
    "ui": [
      "All workspace pages"
    ],
    "relatedFiles": [
      "src/components/workspace/contextual-ai/contextual-ai-column.tsx",
      "src/components/workspace/contextual-ai/ai-context-header.tsx"
    ],
    "relatedTerms": [
      "AI Action Card",
      "Source Context Badge",
      "No hidden writes"
    ],
    "forbiddenConfusion": "AI-колонка не должна быть абстрактным чатиком без контекста.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-005-mobile-shell",
    "term": "Mobile Shell",
    "layer": "Mobile UI",
    "definition": "Мобильная оболочка с вкладками AI, Workspace, Objects, Calendar, Actions.",
    "role": "Дает компактный мобильный опыт без копирования desktop 20/45/35.",
    "ui": [
      "/m"
    ],
    "relatedFiles": [
      "src/app/m/page.tsx",
      "src/components/workspace/mobile-shell/mobile-shell.tsx",
      "mobile-tabs.tsx"
    ],
    "relatedTerms": [
      "Workspace",
      "Activity Capture",
      "Calendar",
      "Actions"
    ],
    "forbiddenConfusion": "Не делать уменьшенную копию desktop.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-006-raw-activity-signal",
    "term": "Raw Activity Signal",
    "layer": "Activity Layer",
    "definition": "Сырой входящий сигнал до нормализации: текст, API, wearable, календарь, действие приложения.",
    "role": "Начальная точка controlled intake.",
    "ui": [
      "Activity Capture",
      "intake admin/debug"
    ],
    "relatedFiles": [
      "lib/activity/rawActivitySignals.ts",
      "supabase/migrations/020_activity_raw_signals.sql"
    ],
    "relatedTerms": [
      "Activity Event",
      "controlled intake",
      "duplicate handling"
    ],
    "forbiddenConfusion": "Не равен подтвержденной активности.",
    "status": "Foundation",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-007-activity-capture-draft",
    "term": "Activity Capture Draft",
    "layer": "Activity Layer",
    "definition": "Черновик активности: rawText, локальное время, возможная длительность, контекст, настроение.",
    "role": "Позволяет показывать preview до записи в базу.",
    "ui": [
      "/activity-capture",
      "/workspace panel"
    ],
    "relatedFiles": [
      "src/components/workspace/activity-capture/activity-capture-panel.tsx",
      "activity-capture-types.ts"
    ],
    "relatedTerms": [
      "Preview Package",
      "no-write route",
      "Review Card"
    ],
    "forbiddenConfusion": "Draft ≠ persisted Activity Event.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-008-activity-event",
    "term": "Activity Event",
    "layer": "Activity Layer",
    "definition": "Факт активности во времени: кто, когда, сколько, что было сделано.",
    "role": "Source of truth для времени; от него строятся проекции, аналитика и связи.",
    "ui": [
      "Activity Review",
      "Today",
      "Timeline",
      "Analytics"
    ],
    "relatedFiles": [
      "supabase/migrations/012_activity_recording_backbone.sql",
      "src/app/api/activity/events/route.ts",
      "src/app/api/activity/record/route.ts"
    ],
    "relatedTerms": [
      "Activity Capture",
      "Timeline",
      "Exposure Link",
      "Correction"
    ],
    "forbiddenConfusion": "Не дублировать время в Value Objects.",
    "status": "Foundation",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-009-activity-review-card",
    "term": "Activity Review Card",
    "layer": "Review UI",
    "definition": "Карточка «Я понял это так»: raw input, normalized activity, semantic chips, metrics, questions, VO candidates.",
    "role": "Показывает пользователю смысловую интерпретацию перед подтверждением.",
    "ui": [
      "Activity Review",
      "Workspace center panel"
    ],
    "relatedFiles": [
      "src/components/workspace/activity-review/activity-review-card.tsx",
      "semantic-chips-section.tsx",
      "review-actions-section.tsx"
    ],
    "relatedTerms": [
      "Preview Package",
      "Candidate",
      "Correction",
      "Confirmation"
    ],
    "forbiddenConfusion": "Review UI ≠ automatic write permission.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-010-preview-package",
    "term": "Preview Package",
    "layer": "Preview contract",
    "definition": "Пакет данных для UI preview: normalized activity, candidates, metrics, confidence, questions, actions.",
    "role": "Отделяет безопасный просмотр от записи в БД.",
    "ui": [
      "Activity Review",
      "Semantic Review",
      "NBA preview"
    ],
    "relatedFiles": [
      "lib/activity/capture/activityCaptureDetachedPreviewAdapterV0.ts",
      "lib/activity/categoryDerivation/semanticPreviewPipelineV0.ts"
    ],
    "relatedTerms": [
      "No-write route",
      "Activity Review Model",
      "candidate package"
    ],
    "forbiddenConfusion": "preview package ≠ saved fact.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-011-no-write-route",
    "term": "no-write route",
    "layer": "Safety/API",
    "definition": "API route, который возвращает preview, но не создает/не изменяет записи в базе.",
    "role": "Безопасная интеграция UI с backend до открытия write gate.",
    "ui": [
      "UI-17",
      "Activity Review",
      "Semantic Preview"
    ],
    "relatedFiles": [
      "src/app/api/activity/capture/detached-semantic-preview/route.ts",
      "src/app/api/activity/semantic-orchestration-preview/route.ts"
    ],
    "relatedTerms": [
      "Preview Package",
      "Write Gate",
      "No hidden writes"
    ],
    "forbiddenConfusion": "No-write route не должен иметь hidden mutations.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-012-write-gate",
    "term": "Write Gate",
    "layer": "Safety/API",
    "definition": "Явное разрешение на запись после readiness, проверки прав и подтверждения пользователя.",
    "role": "Контролирует переход от preview к persistence.",
    "ui": [
      "Review actions",
      "Save/Confirm",
      "Commercial writes"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/semanticPersistenceGateV0.ts",
      "stableSemanticBundleWriteGateDryRunV0.ts",
      "docs/activity/c33-p4-save-confirm-boundary-document.md"
    ],
    "relatedTerms": [
      "No hidden writes",
      "RLS",
      "service_role",
      "user confirmation"
    ],
    "forbiddenConfusion": "UI button ≠ automatic DB write.",
    "status": "Gate",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-013-correction",
    "term": "Correction",
    "layer": "Audit/Review",
    "definition": "Исправление пользователем или системой: что было неверно и как исправлено.",
    "role": "Создает learning signal и audit trail без стирания истории.",
    "ui": [
      "Activity Review",
      "Today",
      "Privacy/Audit"
    ],
    "relatedFiles": [
      "supabase/migrations/017_activity_corrections.sql",
      "src/components/workspace/today-timeline/correction-entry.tsx",
      "src/components/workspace/privacy-audit/correction-history-panel.tsx"
    ],
    "relatedTerms": [
      "Audit Row",
      "Feedback",
      "Correction Learning"
    ],
    "forbiddenConfusion": "Не делать destructive update без audit row.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-014-audit-row",
    "term": "Audit Row",
    "layer": "Audit/Trust",
    "definition": "Запись в истории: кто/что/когда/почему inferred, confirmed, rejected, corrected.",
    "role": "Обеспечивает прозрачность и обучение системы.",
    "ui": [
      "/privacy-audit",
      "audit log",
      "correction history"
    ],
    "relatedFiles": [
      "src/components/workspace/privacy-audit/audit-event-card.tsx",
      "audit-log-list.tsx",
      "docs/activity/c34-c4-audit-correction-feedback-trail-contract.md"
    ],
    "relatedTerms": [
      "Correction",
      "Feedback",
      "Privacy",
      "Governance"
    ],
    "forbiddenConfusion": "Не скрывать изменение от пользователя.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-015-candidate",
    "term": "Candidate",
    "layer": "Semantic/AI",
    "definition": "Предложение системы, ещё не истина и не сохраненный факт.",
    "role": "Все AI/semantic outputs сначала candidates.",
    "ui": [
      "Activity Review",
      "Semantic Review",
      "Value Object candidates",
      "NBA candidates"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/ruleExtractor.ts",
      "semanticContractV3Adapter.ts",
      "valueObjectCandidateDisplayAdapterV0.ts"
    ],
    "relatedTerms": [
      "categoryCandidate",
      "Value Object Candidate",
      "Action Candidate"
    ],
    "forbiddenConfusion": "Candidate ≠ saved fact.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-016-category-derivation-run",
    "term": "Category Derivation Run",
    "layer": "Semantic Layer",
    "definition": "Запуск процесса извлечения смысловых категорий из активности.",
    "role": "Переводит текст в category candidates, unknown terms, semantic bundle, state hooks.",
    "ui": [
      "Activity Review",
      "Semantic Review"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/routeRunner.ts",
      "runLookup.ts",
      "persistDerivations.ts",
      "src/app/api/activity/complete/route.ts"
    ],
    "relatedTerms": [
      "Category Candidate",
      "Semantic Bundle",
      "Resolver"
    ],
    "forbiddenConfusion": "Не равен созданию активных категорий.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-017-categorycandidate",
    "term": "categoryCandidate",
    "layer": "Semantic Layer",
    "definition": "Предложенная категория: действие, объект, контекст, роль, цель, метрика и т.п.",
    "role": "Сырье для resolver и semantic bundle.",
    "ui": [
      "Activity Review semantic chips"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/semanticContractV3Adapter.ts",
      "ruleExtractor.ts",
      "types.ts"
    ],
    "relatedTerms": [
      "unknownTermCandidate",
      "semantic bundle",
      "internal category"
    ],
    "forbiddenConfusion": "categoryCandidate ≠ internal active category.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-018-unknowntermcandidate",
    "term": "unknownTermCandidate",
    "layer": "External ontology bridge",
    "definition": "Новое слово/понятие, которого нет или система не уверена в локальной базе.",
    "role": "Запускает local lookup/external concept lookup и review.",
    "ui": [
      "Semantic Review / New Concept Card"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/unknownTermDetectorV0.ts",
      "externalConceptStubV0.ts",
      "sourceOrderResolverBlockerPreviewV0.ts"
    ],
    "relatedTerms": [
      "externalConceptCandidate",
      "resolver",
      "category source"
    ],
    "forbiddenConfusion": "Не создавать active category напрямую из unknown term.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-019-externalconceptcandidate",
    "term": "externalConceptCandidate",
    "layer": "External ontology bridge",
    "definition": "Подсказка из внешнего понятия/концепта для нового слова.",
    "role": "Помогает multilingual/canonical matching, но не становится внутренней категорией автоматически.",
    "ui": [
      "Semantic Review / External Concept Hint Card"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/externalConceptStubV0.ts",
      "stableBundleResolverGateIntegrationV0.ts"
    ],
    "relatedTerms": [
      "External Concept",
      "internal category",
      "canonicalization"
    ],
    "forbiddenConfusion": "external concept ≠ internal category.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-020-resolver-canonicalization",
    "term": "Resolver / Canonicalization",
    "layer": "Governance",
    "definition": "Слой решения: подтвердить, объединить, отклонить или оставить needs_review.",
    "role": "Защищает от дублей bicycle/bike/rower/Fahrrad/велосипед.",
    "ui": [
      "/semantic/review",
      "merge dialog"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/resolver.ts",
      "resolverDecisionContractV0.ts",
      "semantic-review-action-policy.ts"
    ],
    "relatedTerms": [
      "Merge",
      "Reject",
      "Confirm",
      "Category Source"
    ],
    "forbiddenConfusion": "AI не должен быть единственным resolver.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-021-semantic-bundle",
    "term": "Semantic Bundle",
    "layer": "Semantic Layer",
    "definition": "Стабильная связка смыслов активности: action/object/context/role/duty/care/purpose/metric/domain.",
    "role": "Основа для VO links, state hooks, analytics and recommendations.",
    "ui": [
      "Activity Review",
      "Semantic Review details"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/semanticBundleResolverV0.ts",
      "stableSemanticBundlePreviewV0.ts",
      "stableSemanticBundleTransactionContractV0.ts"
    ],
    "relatedTerms": [
      "Category Derivation",
      "Value Object",
      "State Hook"
    ],
    "forbiddenConfusion": "Unresolved bundle не должен проходить в stable state.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-022-stable-semantic-bundle",
    "term": "Stable Semantic Bundle",
    "layer": "Semantic Layer",
    "definition": "Semantic Bundle после schema/resolver/gate checks.",
    "role": "Может безопасно использоваться следующими слоями без превращения preview в write.",
    "ui": [
      "Activity Review",
      "debug/review pages"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/stableSemanticBundlePreviewV0.ts",
      "stableSemanticBundleSchemaPreflightV0.ts",
      "supabase/migrations/20260531_c33j4_stable_semantic_bundle_schema.sql"
    ],
    "relatedTerms": [
      "Stable bundle schema",
      "persistence gate",
      "unresolved blocker"
    ],
    "forbiddenConfusion": "Stable ≠ already persisted.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-023-value-object",
    "term": "Value Object",
    "layer": "Value Object Layer",
    "definition": "Ценный объект пользователя или предприятия: навык, цель, процесс, товар/услуга, направление.",
    "role": "Единая единица ценности для личной и коммерческой части.",
    "ui": [
      "/value-objects",
      "Object Cloud",
      "Value Object Card"
    ],
    "relatedFiles": [
      "src/components/workspace/value-objects/value-objects-panel.tsx",
      "value-object-types.ts",
      "lib/activity/valueObjectBridge.ts"
    ],
    "relatedTerms": [
      "Personal VO",
      "Enterprise VO",
      "Exposure Link",
      "Aggregate"
    ],
    "forbiddenConfusion": "Не вводить жесткие подтипы вместо unified VO.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-024-personal-value-object",
    "term": "Personal Value Object",
    "layer": "VO / Personal",
    "definition": "VO, принадлежащий пользователю: немецкий, здоровье, семья, B2B продажи.",
    "role": "Хранит личную историю и прогресс по смысловому объекту.",
    "ui": [
      "Value Objects",
      "Object Card",
      "Analytics"
    ],
    "relatedFiles": [
      "src/components/workspace/value-objects/value-object-card.tsx",
      "value-object-tree.tsx"
    ],
    "relatedTerms": [
      "owner_actor_id",
      "privacy",
      "activity links"
    ],
    "forbiddenConfusion": "Не публиковать личный VO как enterprise/public напрямую.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-025-enterprise-value-object",
    "term": "Enterprise Value Object",
    "layer": "VO / Commercial",
    "definition": "VO предприятия: товар, услуга, процесс или commercial object.",
    "role": "База для offers/certificates/directory, но не корзина товаров.",
    "ui": [
      "Commercial Core",
      "Organizations",
      "Offers",
      "Certificates"
    ],
    "relatedFiles": [
      "src/components/workspace/commercial-core/commercial-offer-card.tsx",
      "commercial-organization-card.tsx",
      "lib/commercial/currency.ts"
    ],
    "relatedTerms": [
      "Organization",
      "Offer",
      "Certificate",
      "public visibility"
    ],
    "forbiddenConfusion": "Не смешивать с личным VO без organization context.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-026-value-object-candidate",
    "term": "Value Object Candidate",
    "layer": "VO bridge",
    "definition": "Предложенный объект, который activity может развивать или обслуживать.",
    "role": "Показывается до создания/линковки VO.",
    "ui": [
      "Activity Review",
      "Value Object Candidate Panel"
    ],
    "relatedFiles": [
      "src/components/workspace/activity-capture/value-object-candidate-panel.tsx",
      "lib/activity/categoryDerivation/semanticValueObjectCandidatePolicyV0.ts"
    ],
    "relatedTerms": [
      "Semantic Bundle",
      "Exposure Link",
      "user confirmation"
    ],
    "forbiddenConfusion": "VO candidate ≠ created VO.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-027-exposure-link",
    "term": "Exposure Link",
    "layer": "VO bridge",
    "definition": "Связь activity event с одним или несколькими Value Objects без дублирования времени.",
    "role": "Позволяет одной активности влиять на несколько направлений.",
    "ui": [
      "Value Object Card",
      "Timeline",
      "Analytics"
    ],
    "relatedFiles": [
      "lib/activity/categoryDerivation/semanticActivityValueObjectExposureV0.ts",
      "supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_NO_EXECUTION.sql"
    ],
    "relatedTerms": [
      "Activity Event",
      "Value Object",
      "projections"
    ],
    "forbiddenConfusion": "Exposure link ≠ duplicate time.",
    "status": "Core",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-028-object-cloud-object-tree",
    "term": "Object Cloud / Object Tree",
    "layer": "VO UI",
    "definition": "Список/дерево/облако объектов, которые пользователь развивает или обслуживает.",
    "role": "Визуальная карта личных и коммерческих направлений.",
    "ui": [
      "/value-objects"
    ],
    "relatedFiles": [
      "src/components/workspace/value-objects/value-object-cloud.tsx",
      "value-object-tree.tsx",
      "value-object-list.tsx"
    ],
    "relatedTerms": [
      "Value Object",
      "filters",
      "needs_review",
      "progress"
    ],
    "forbiddenConfusion": "Не подменять categories tree всей моделью VO.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-029-state-hook",
    "term": "State Hook",
    "layer": "State Layer",
    "definition": "Кандидат-сигнал состояния, возникающий из активности или semantic bundle.",
    "role": "Готовит материал для state facts/deltas, но не утверждает факт.",
    "ui": [
      "Activity Review",
      "Object Card",
      "Analytics"
    ],
    "relatedFiles": [
      "src/app/api/activity/state-hooks/preview/route.ts",
      "lib/activity/categoryDerivation/semanticStateDeltaCandidatePolicyV0.ts"
    ],
    "relatedTerms": [
      "State Signal",
      "State Fact",
      "No overclaim"
    ],
    "forbiddenConfusion": "State Hook ≠ State Fact.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-030-state-fact",
    "term": "State Fact",
    "layer": "State Layer",
    "definition": "Подтвержденный факт состояния с source/confidence/evidence/window contract.",
    "role": "Используется в аналитике только после gate и evidence.",
    "ui": [
      "Analytics",
      "Object Card",
      "Privacy/Audit"
    ],
    "relatedFiles": [
      "src/app/api/activity/state-facts/controlled-persist/route.ts",
      "lib/activity/stateFacts/controlledPersistence/validator.ts"
    ],
    "relatedTerms": [
      "State Hook",
      "State Delta",
      "Snapshot"
    ],
    "forbiddenConfusion": "Не создавать state fact из категории напрямую.",
    "status": "Later/gated",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-031-aggregate-snapshot",
    "term": "Aggregate / Snapshot",
    "layer": "Analytics",
    "definition": "Предрасчитанная сводка/снимок состояния для быстрого чтения аналитики.",
    "role": "Позволяет не сканировать каждый раз все events.",
    "ui": [
      "Analytics",
      "Object Card",
      "Day Summary"
    ],
    "relatedFiles": [
      "supabase/migrations/016_activity_atomic_aggregate_updates.sql",
      "src/components/workspace/analytics-dashboard/analytics-dashboard.tsx"
    ],
    "relatedTerms": [
      "Activity Event",
      "State Fact",
      "Analytics Dashboard"
    ],
    "forbiddenConfusion": "Аналитика не должна быть overclaim truth.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-032-analytics-dashboard",
    "term": "Analytics Dashboard",
    "layer": "Analytics UI",
    "definition": "Кольца баланса, heatmap, weak directions, load/recovery warnings as signals.",
    "role": "Показывает перекосы, прогресс и долги без медицинских/финансовых утверждений.",
    "ui": [
      "/analytics"
    ],
    "relatedFiles": [
      "src/app/analytics/page.tsx",
      "balance-rings.tsx",
      "focus-heatmap.tsx",
      "weak-directions-widget.tsx"
    ],
    "relatedTerms": [
      "Weak Direction",
      "Aggregate",
      "No overclaim"
    ],
    "forbiddenConfusion": "No medical/financial/productivity truth.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-033-similarity",
    "term": "Similarity",
    "layer": "Recommendation",
    "definition": "Похожесть объектов по category overlap и структуре смыслов.",
    "role": "Помогает найти близкие VO/категории/действия.",
    "ui": [
      "Object Card",
      "NBA explainability"
    ],
    "relatedFiles": [
      "docs/activity/c34-a1-similarity-relevance-contract.md",
      "lib/activity/categoryDerivation/semanticNextActionPreviewContractV0.ts"
    ],
    "relatedTerms": [
      "Relevance",
      "Weakest Direction"
    ],
    "forbiddenConfusion": "Similarity ≠ Relevance.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-034-relevance",
    "term": "Relevance",
    "layer": "Recommendation",
    "definition": "Применимость сейчас: правила, состояние, ограничения, доступное окно, энергия.",
    "role": "Ранжирует кандидатов действий по текущему контексту.",
    "ui": [
      "/next",
      "Calendar free windows",
      "Right AI"
    ],
    "relatedFiles": [
      "docs/activity/c34-a3-relevance-resolver-context-model.md",
      "src/components/workspace/next-best-action/constraint-panel.tsx"
    ],
    "relatedTerms": [
      "Similarity",
      "Constraints",
      "Action Candidate"
    ],
    "forbiddenConfusion": "Не подменять похожестью.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-035-weakest-direction",
    "term": "Weakest Direction",
    "layer": "NBA",
    "definition": "Направление, которому сейчас не хватает внимания/ресурса.",
    "role": "Вход для выбора следующего действия, но не автоматическая команда.",
    "ui": [
      "/next",
      "Analytics weak directions"
    ],
    "relatedFiles": [
      "src/components/workspace/next-best-action/weak-direction-list.tsx",
      "weak-directions-widget.tsx"
    ],
    "relatedTerms": [
      "NBA",
      "Relevance",
      "user choice"
    ],
    "forbiddenConfusion": "Weakest Direction ≠ final NBA.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-036-next-best-action",
    "term": "Next Best Action",
    "layer": "NBA",
    "definition": "Следующее лучшее действие как кандидат, объясненный и ограниченный временем/энергией/местом.",
    "role": "Помогает пользователю выбрать действие, не выполняя его автоматически.",
    "ui": [
      "/next",
      "Right AI",
      "Calendar"
    ],
    "relatedFiles": [
      "src/app/next/page.tsx",
      "next-best-action-dashboard.tsx",
      "action-candidate-card.tsx",
      "semanticNextActionPreviewContractV0.ts"
    ],
    "relatedTerms": [
      "Action Candidate",
      "Feedback",
      "Constraints",
      "Weakest Direction"
    ],
    "forbiddenConfusion": "No auto-execute without gate.",
    "status": "MVP+",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-037-organization",
    "term": "Organization",
    "layer": "Commercial Core",
    "definition": "Предприятие/организация в платформе с владельцами, публичным/частным профилем и валютой по стране.",
    "role": "Контекст для enterprise VO, offers, certificates, purchase confirmations.",
    "ui": [
      "/organizations",
      "/directory/[slug]"
    ],
    "relatedFiles": [
      "src/app/organizations/page.tsx",
      "commercial-organization-card.tsx",
      "src/app/api/organizations/route.ts"
    ],
    "relatedTerms": [
      "Enterprise VO",
      "Offer",
      "Currency",
      "Directory"
    ],
    "forbiddenConfusion": "Не смешивать organization и user actor.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-038-offer",
    "term": "Offer",
    "layer": "Commercial Core",
    "definition": "Коммерческие условия/основа для сертификата, а не универсальная корзина.",
    "role": "Связывает enterprise VO с certificate flow.",
    "ui": [
      "/offers",
      "organization profile"
    ],
    "relatedFiles": [
      "src/app/offers/page.tsx",
      "commercial-offer-card.tsx",
      "src/app/api/offers/route.ts"
    ],
    "relatedTerms": [
      "Certificate",
      "Enterprise VO",
      "Organization"
    ],
    "forbiddenConfusion": "Offer ≠ обычная покупка товара внутри платформы.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-039-certificate",
    "term": "Certificate",
    "layer": "Commercial Core",
    "definition": "Сертификат, покупаемый через платформу с возможным использованием points.",
    "role": "Коммерческий продукт платформы; points уменьшают сумму оплаты и сжигаются.",
    "ui": [
      "/certificates",
      "/my-certificates",
      "/seller-certificates"
    ],
    "relatedFiles": [
      "src/app/certificates/page.tsx",
      "commercial-certificate-card.tsx",
      "src/app/api/certificates/request/route.ts"
    ],
    "relatedTerms": [
      "Offer",
      "Points",
      "Redeem",
      "Seller"
    ],
    "forbiddenConfusion": "Points не передаются продавцу; они сжигаются.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-040-points",
    "term": "Points",
    "layer": "Commercial Core",
    "definition": "Баллы пользователя: начисление за подтвержденные внешние покупки, использование при сертификатах.",
    "role": "Механизм лояльности и мотивации.",
    "ui": [
      "/points",
      "Points Wallet",
      "purchase confirmations"
    ],
    "relatedFiles": [
      "src/app/points/page.tsx",
      "commercial-points-wallet.tsx",
      "src/app/api/points/wallet/route.ts"
    ],
    "relatedTerms": [
      "Purchase Confirmation",
      "Certificate",
      "Points Wallet"
    ],
    "forbiddenConfusion": "Не путать points balance с деньгами продавца.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-041-purchase-confirmation",
    "term": "Purchase Confirmation",
    "layer": "Commercial Core",
    "definition": "Заявка покупателя на подтверждение внешней покупки у организации.",
    "role": "После подтверждения продавцом влияет на points.",
    "ui": [
      "/purchase-confirmations",
      "/seller/purchase-confirmations"
    ],
    "relatedFiles": [
      "src/app/purchase-confirmations/page.tsx",
      "commercial-buyer-confirmation-form-preview.tsx",
      "commercial-seller-queue.tsx",
      "src/app/api/purchase-confirmations/route.ts"
    ],
    "relatedTerms": [
      "Seller Queue",
      "Points",
      "Public Purchase History"
    ],
    "forbiddenConfusion": "Не начислять points до seller approval.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-042-public-purchase-history",
    "term": "Public Purchase History",
    "layer": "Commercial Trust",
    "definition": "Публичная история покупок с открытыми организациями и замаскированными покупателями.",
    "role": "Создает доверие и социальное доказательство без раскрытия персональных данных.",
    "ui": [
      "/public/purchases"
    ],
    "relatedFiles": [
      "src/app/public/purchases/page.tsx",
      "commercial-masked-history-list.tsx",
      "commercial-public-history-item.tsx"
    ],
    "relatedTerms": [
      "Masked Buyer Name",
      "privacy",
      "Organization"
    ],
    "forbiddenConfusion": "Не показывать полное имя покупателя публично.",
    "status": "V1",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-043-visibility-privacy-level",
    "term": "Visibility / Privacy Level",
    "layer": "Privacy",
    "definition": "Уровень видимости: private/public/organization/directory/etc. с дефолтной приватностью sensitive domains.",
    "role": "Контролирует, что видно пользователю, организации, публичной истории.",
    "ui": [
      "/privacy-audit",
      "Value Objects",
      "Directory",
      "Commercial Core"
    ],
    "relatedFiles": [
      "src/components/workspace/privacy-audit/privacy-level-legend.tsx",
      "privacy-settings-panel.tsx",
      "sensitive-category-controls.tsx"
    ],
    "relatedTerms": [
      "RLS",
      "public projection",
      "sensitive domains"
    ],
    "forbiddenConfusion": "Не делать sensitive data публичными по умолчанию.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-044-rls",
    "term": "RLS",
    "layer": "Security/Supabase",
    "definition": "Row Level Security: ограничение строк, доступных конкретной роли/пользователю.",
    "role": "Защищает пользовательские и коммерческие данные на уровне БД.",
    "ui": [
      "Invisible to user",
      "surfaced in audit/security docs"
    ],
    "relatedFiles": [
      "supabase/migrations/004_enable_object_action_rls.sql",
      "supabase/migrations/019_activity_security_foundation.sql",
      "semanticServerAuthReadinessGateV0.ts"
    ],
    "relatedTerms": [
      "GRANT",
      "service_role",
      "ownership context"
    ],
    "forbiddenConfusion": "GRANT не заменяет RLS.",
    "status": "Foundation",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-045-grant",
    "term": "GRANT",
    "layer": "Security/Supabase",
    "definition": "Разрешение роли обращаться к таблице/функции через API.",
    "role": "Нужно явно рядом с RLS в миграциях.",
    "ui": [
      "Not UI",
      "security docs"
    ],
    "relatedFiles": [
      "supabase/migrations/20260531_c33j4_stable_semantic_bundle_schema.sql",
      "supabase/patches/20260529_c8_i_x_sandbox_only_cleanup_rebuild_no_execution.sql"
    ],
    "relatedTerms": [
      "RLS",
      "anon",
      "authenticated",
      "service_role"
    ],
    "forbiddenConfusion": "GRANT ≠ право видеть все строки.",
    "status": "Foundation",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-046-service-role",
    "term": "service_role",
    "layer": "Security/API",
    "definition": "Серверная роль Supabase для backend/server routes, не для клиента.",
    "role": "Используется для безопасных backend операций под контролем route/gate.",
    "ui": [
      "Invisible",
      "admin/security"
    ],
    "relatedFiles": [
      "supabase/patches/20260529_c8_i_x_sandbox_only_cleanup_rebuild_no_execution.sql",
      "semanticServerAuthReadinessGateV0.ts"
    ],
    "relatedTerms": [
      "RLS",
      "GRANT",
      "backend-only routes"
    ],
    "forbiddenConfusion": "Не открывать service_role на client/browser.",
    "status": "Foundation",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-047-no-hidden-writes",
    "term": "No hidden writes",
    "layer": "Safety/QA",
    "definition": "Никаких записей в БД без явного gate, visible action и понятного статуса.",
    "role": "Главный acceptance criterion для UI-17/UI-18.",
    "ui": [
      "All pages",
      "Review",
      "Commercial",
      "Privacy/Audit"
    ],
    "relatedFiles": [
      "src/components/workspace/*read-only-boundary.tsx",
      "docs/ui/ui-0-ui-implementation-track-protocol.md"
    ],
    "relatedTerms": [
      "no-write route",
      "write gate",
      "user confirmation"
    ],
    "forbiddenConfusion": "Preview/correction/feedback preview ≠ persistence.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-048-no-overclaim-language",
    "term": "No overclaim language",
    "layer": "Safety/Content",
    "definition": "Запрет на диагнозы, гормональные утверждения, финансовую/продуктивностную истину без evidence.",
    "role": "Защищает платформу от ложных обещаний и юридических рисков.",
    "ui": [
      "Analytics",
      "State Signals",
      "AI warnings",
      "Privacy/Audit"
    ],
    "relatedFiles": [
      "src/components/workspace/analytics-dashboard/load-recovery-warnings.tsx",
      "src/components/workspace/contextual-ai/ai-warning.tsx"
    ],
    "relatedTerms": [
      "State Hook",
      "State Fact",
      "Proxy-state",
      "warnings"
    ],
    "forbiddenConfusion": "Category/AI signal ≠ medical truth.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-049-fixture",
    "term": "Fixture",
    "layer": "QA/UI",
    "definition": "Статические тестовые данные для UI без DB/route calls.",
    "role": "Позволяют строить безопасный UI до backend writes.",
    "ui": [
      "All UI blocks in MVP stages"
    ],
    "relatedFiles": [
      "src/components/workspace/*/*.fixtures.ts",
      "workspace-fixtures.ts"
    ],
    "relatedTerms": [
      "Read-only boundary",
      "no-write route",
      "visual smoke"
    ],
    "forbiddenConfusion": "Fixture не должна маскировать отсутствие real route later.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "term-050-read-only-boundary",
    "term": "Read-only Boundary",
    "layer": "QA/Safety",
    "definition": "Компонент/правило, показывающее, что UI читает/рендерит, но не сохраняет.",
    "role": "Отделяет UI implementation от persistence.",
    "ui": [
      "Analytics",
      "Calendar",
      "Commercial",
      "Privacy",
      "Timeline",
      "NBA"
    ],
    "relatedFiles": [
      "analytics-read-only-boundary.tsx",
      "calendar-read-only-boundary.tsx",
      "commercial-read-only-boundary.tsx",
      "privacy-audit-read-only-boundary.tsx",
      "today-timeline-read-only-boundary.tsx",
      "nba-read-only-boundary.tsx"
    ],
    "relatedTerms": [
      "No hidden writes",
      "UI-17",
      "UI-18"
    ],
    "forbiddenConfusion": "Read-only UI не должен делать side effects.",
    "status": "MVP",
    "sourceRefs": [
      {
        "sourceId": "stage1-operational-glossary-20260606",
        "sourceFile": "GPT_APP_Stage1_Master_Terms_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  }
] satisfies readonly KnowledgeTerm[];
