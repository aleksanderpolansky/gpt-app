// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { ImplementationMicrostep } from "@/types/project-knowledge";

export const projectKnowledgeImplementationMicrosteps = [
  {
    "id": "pkg-microstep-001",
    "number": 1,
    "block": "PKG-0",
    "priority": "P0",
    "microstep": "Preflight статуса проекта",
    "filesOrRoutes": "terminal only",
    "action": "Выполнить read-only проверку ветки, git status, package scripts, наличие src/app и src/components/ui.",
    "definitionOfDone": "Понятно, что работа стартует из main; нет непредвиденных изменений кроме пользовательских инвентаризационных папок.",
    "gate": "No file changes",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 38,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-002",
    "number": 2,
    "block": "PKG-0",
    "priority": "P0",
    "microstep": "Создать documentation checkpoint",
    "filesOrRoutes": "docs/project-knowledge/stage5-implementation-microplan.md",
    "action": "Сохранить короткий markdown-lock: Stage5 approved, scope read-only, no DB writes, commit/push gates separate.",
    "definitionOfDone": "Документ фиксирует scope и ссылки на Stage1-4 artifacts.",
    "gate": "Docs-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 37,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-003",
    "number": 3,
    "block": "PKG-1",
    "priority": "P0",
    "microstep": "Создать папку данных",
    "filesOrRoutes": "src/data/project-knowledge/",
    "action": "Создать папку для fixtures. Не подключать DB, API или OpenAI.",
    "definitionOfDone": "Папка существует; данные импортируются только как local TS/JSON fixtures.",
    "gate": "Local files only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 36,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-004",
    "number": 4,
    "block": "PKG-1",
    "priority": "P0",
    "microstep": "Перенести Stage1 terms в fixtures",
    "filesOrRoutes": "src/data/project-knowledge/glossary.ts",
    "action": "Сделать массив terms из Stage1 CSV: id, title, layer, description, role, uiPages, files, related, forbiddenConfusions, status.",
    "definitionOfDone": "Страница может вывести count terms; отсутствует runtime fetch.",
    "gate": "No route calls",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 35,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-005",
    "number": 5,
    "block": "PKG-1",
    "priority": "P1",
    "microstep": "Перенести Stage2 gaps в fixtures",
    "filesOrRoutes": "src/data/project-knowledge/gaps.ts",
    "action": "Сделать массив gaps: id, priority, area, title, currentEvidence, risk, recommendation, acceptance, status.",
    "definitionOfDone": "P0/P1/P2 filters возможны на fixture data.",
    "gate": "No route calls",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 34,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-006",
    "number": 6,
    "block": "PKG-1",
    "priority": "P1",
    "microstep": "Перенести Stage3 conflicts в fixtures",
    "filesOrRoutes": "src/data/project-knowledge/conflicts.ts",
    "action": "Сделать массив conflicts: id, priority, type, old/current, risk, decision, action, status.",
    "definitionOfDone": "Конфликты /objects vs /value-objects и /today vs /activity-today видимы.",
    "gate": "No route calls",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 33,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-007",
    "number": 7,
    "block": "PKG-1",
    "priority": "P0",
    "microstep": "Создать fixture indexes",
    "filesOrRoutes": "src/data/project-knowledge/index.ts",
    "action": "Экспортировать все массивы из одной точки.",
    "definitionOfDone": "Импорты в UI идут через index.ts; нет циклических импортов.",
    "gate": "Local files only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 32,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-008",
    "number": 8,
    "block": "PKG-2",
    "priority": "P0",
    "microstep": "Создать базовые типы",
    "filesOrRoutes": "src/types/project-knowledge.ts",
    "action": "Ввести types: KnowledgeTerm, KnowledgePage, KnowledgeFileResponsibility, KnowledgeProcess, ForbiddenConfusion, GapItem, ConflictItem, DecisionItem.",
    "definitionOfDone": "npm run lint проходит; типы используются в fixtures/components.",
    "gate": "No runtime behavior",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 31,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-009",
    "number": 9,
    "block": "PKG-2",
    "priority": "P0",
    "microstep": "Добавить enum/status types",
    "filesOrRoutes": "src/types/project-knowledge.ts",
    "action": "Ввести status enums: active, alias, legacy, debug, planned, future, blocked; priority P0/P1/P2.",
    "definitionOfDone": "UI не использует произвольные строки без контроля.",
    "gate": "Type-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 30,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-010",
    "number": 10,
    "block": "PKG-3",
    "priority": "P0",
    "microstep": "Создать ProjectKnowledgeShell",
    "filesOrRoutes": "src/components/project-knowledge/ProjectKnowledgeShell.tsx",
    "action": "Shared layout: title, description, navigation, content slot, right info box.",
    "definitionOfDone": "Компонент рендерится без client state и без DB/API.",
    "gate": "Component-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 29,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-011",
    "number": 11,
    "block": "PKG-3",
    "priority": "P0",
    "microstep": "Создать cards/tables",
    "filesOrRoutes": "src/components/project-knowledge/KnowledgeCard.tsx; KnowledgeTable.tsx; KnowledgeStatusBadge.tsx",
    "action": "Общие визуальные блоки для terms/gaps/conflicts/processes.",
    "definitionOfDone": "Длинный текст переносится; mobile не ломается.",
    "gate": "Component-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 28,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-012",
    "number": 12,
    "block": "PKG-3",
    "priority": "P1",
    "microstep": "Создать KnowledgeSearch",
    "filesOrRoutes": "src/components/project-knowledge/KnowledgeSearch.tsx",
    "action": "Client search/filter только по переданным local props; без backend search.",
    "definitionOfDone": "Поиск работает по title/description/route/file/status.",
    "gate": "No backend",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 27,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-013",
    "number": 13,
    "block": "PKG-4",
    "priority": "P0",
    "microstep": "Создать главный route",
    "filesOrRoutes": "src/app/project-knowledge/page.tsx",
    "action": "Главная страница: overview, counters, links to glossary/page-map/file-map/process-map/rules/qa/gaps/conflicts.",
    "definitionOfDone": "/project-knowledge открывается; нет import из server-only routes; нет DB writes.",
    "gate": "UI route only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 26,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-014",
    "number": 14,
    "block": "PKG-4",
    "priority": "P0",
    "microstep": "Создать route navigation constants",
    "filesOrRoutes": "src/data/project-knowledge/pages.ts",
    "action": "Список внутренних knowledge routes и статусов.",
    "definitionOfDone": "Навигация строится из одного массива; нет hardcoded дубликатов.",
    "gate": "Fixture-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 25,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-015",
    "number": 15,
    "block": "PKG-4",
    "priority": "P1",
    "microstep": "Добавить empty/fallback states",
    "filesOrRoutes": "ProjectKnowledgeShell/KnowledgeTable",
    "action": "Показать понятные состояния: no data, no rights future, import disabled, write gate closed.",
    "definitionOfDone": "Ни один empty state не выглядит как ошибка runtime.",
    "gate": "UI-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 24,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-016",
    "number": 16,
    "block": "PKG-5",
    "priority": "P0",
    "microstep": "Создать glossary route",
    "filesOrRoutes": "src/app/project-knowledge/glossary/page.tsx",
    "action": "Страница терминов: список + карточки с ролью, UI, files, related, forbidden.",
    "definitionOfDone": "Маркетолог/QA/разработчик понимает термин без чтения всех документов.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 23,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-017",
    "number": 17,
    "block": "PKG-5",
    "priority": "P1",
    "microstep": "Добавить term detail view",
    "filesOrRoutes": "src/components/project-knowledge/TermDetailCard.tsx",
    "action": "Карточка термина: описание, роль, страницы, файлы, связанные процессы, запреты.",
    "definitionOfDone": "Длинные списки файлов не ломают таблицу; есть confidence marker.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 22,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-018",
    "number": 18,
    "block": "PKG-6",
    "priority": "P0",
    "microstep": "Создать page-map route",
    "filesOrRoutes": "src/app/project-knowledge/page-map/page.tsx",
    "action": "Показать canonical routes, aliases, legacy/debug, owner component, stage.",
    "definitionOfDone": "/value-objects canonical, /objects alias/decision; /today canonical, /activity-today review.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 21,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-019",
    "number": 19,
    "block": "PKG-6",
    "priority": "P0",
    "microstep": "Добавить canonical route decisions",
    "filesOrRoutes": "src/data/project-knowledge/page-map.ts",
    "action": "Фиксировать route decisions из Stage3 Conflict Map.",
    "definitionOfDone": "Команда видит, что проверять и что не развивать как новый route.",
    "gate": "No redirects yet",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 20,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-020",
    "number": 20,
    "block": "PKG-7",
    "priority": "P0",
    "microstep": "Создать forbidden-confusions route",
    "filesOrRoutes": "src/app/project-knowledge/forbidden-confusions/page.tsx",
    "action": "Карточки правил: preview != write, candidate != fact, external concept != category, category != state fact.",
    "definitionOfDone": "Правила видны и связаны с QA assertions.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 19,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-021",
    "number": 21,
    "block": "PKG-7",
    "priority": "P0",
    "microstep": "Добавить warning copy",
    "filesOrRoutes": "src/data/project-knowledge/forbidden-confusions.ts",
    "action": "Для каждого запрета: неверная трактовка, правильная трактовка, где проверять.",
    "definitionOfDone": "Нет медицинского/финансового/productivity overclaim language.",
    "gate": "Copy-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 18,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-022",
    "number": 22,
    "block": "PKG-8",
    "priority": "P1",
    "microstep": "Создать process-map route",
    "filesOrRoutes": "src/app/project-knowledge/process-map/page.tsx",
    "action": "Показать процессные цепочки: Activity Capture, Semantic Review, VO link, Timeline, NBA, Purchase Confirmation.",
    "definitionOfDone": "Каждый процесс показывает input, output, gates, linked pages.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 17,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-023",
    "number": 23,
    "block": "PKG-8",
    "priority": "P1",
    "microstep": "Добавить process data",
    "filesOrRoutes": "src/data/project-knowledge/process-map.ts",
    "action": "Описать цепочки user text -> preview -> review card -> confirmation -> later write gate.",
    "definitionOfDone": "Процесс не обещает hidden writes; write gate отдельно.",
    "gate": "Fixture-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 16,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-024",
    "number": 24,
    "block": "PKG-9",
    "priority": "P1",
    "microstep": "Создать file-map route",
    "filesOrRoutes": "src/app/project-knowledge/file-map/page.tsx",
    "action": "Показать file responsibility table: routes/components/types/fixtures/adapters/sql/scripts/tests.",
    "definitionOfDone": "Файл-карта показывает confidence: exact/found/planned/logical.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 15,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-025",
    "number": 25,
    "block": "PKG-9",
    "priority": "P1",
    "microstep": "Заполнить initial file map",
    "filesOrRoutes": "src/data/project-knowledge/file-map.ts",
    "action": "Использовать inventory findings: existing UI kit, routes /activity-capture, /analytics, /next, /privacy-audit, /value-objects, /today.",
    "definitionOfDone": "Команда видит фактические и планируемые файлы.",
    "gate": "Fixture-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 14,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-026",
    "number": 26,
    "block": "PKG-10",
    "priority": "P1",
    "microstep": "Создать qa-acceptance route",
    "filesOrRoutes": "src/app/project-knowledge/qa-acceptance/page.tsx",
    "action": "Показать QA checks: no DB writes, no hidden mutations, privacy, mobile, fallback, no overclaim.",
    "definitionOfDone": "UI-17/UI-18 criteria видны как чек-лист.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 13,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-027",
    "number": 27,
    "block": "PKG-10",
    "priority": "P1",
    "microstep": "Добавить scenario matrix",
    "filesOrRoutes": "src/data/project-knowledge/qa-acceptance.ts",
    "action": "Scenarios: food, toilet, German, workout, children, work, purchase, free window.",
    "definitionOfDone": "Каждый сценарий имеет expected UI states.",
    "gate": "Fixture-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 12,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-028",
    "number": 28,
    "block": "PKG-11",
    "priority": "P1",
    "microstep": "Создать gaps route",
    "filesOrRoutes": "src/app/project-knowledge/gaps/page.tsx",
    "action": "Показать Stage2 Gap Register с фильтрами P0/P1/P2, area/status.",
    "definitionOfDone": "P0 gaps видны первыми; есть action/acceptance.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 11,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-029",
    "number": 29,
    "block": "PKG-11",
    "priority": "P1",
    "microstep": "Создать version-conflicts route",
    "filesOrRoutes": "src/app/project-knowledge/version-conflicts/page.tsx",
    "action": "Показать Stage3 conflicts, decision/action/status.",
    "definitionOfDone": "P0 conflicts подсвечены; canonical decisions видны.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 10,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-030",
    "number": 30,
    "block": "PKG-12",
    "priority": "P1",
    "microstep": "Создать decisions route",
    "filesOrRoutes": "src/app/project-knowledge/decisions/page.tsx",
    "action": "Decision log: active decisions, source docs, status, superseded rules.",
    "definitionOfDone": "Команда видит, какой документ главный и что историческое.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 9,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-031",
    "number": 31,
    "block": "PKG-12",
    "priority": "P1",
    "microstep": "Создать sources route",
    "filesOrRoutes": "src/app/project-knowledge/sources/page.tsx",
    "action": "Source registry: Stage1-5 docs, UI Plan, OpenAI Spec, Semantic Roadmap, inventory ZIP.",
    "definitionOfDone": "Есть status: active/historical/reference/superseded.",
    "gate": "Read-only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 8,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-032",
    "number": 32,
    "block": "PKG-13",
    "priority": "P1",
    "microstep": "Подключить shared search/filter",
    "filesOrRoutes": "KnowledgeSearch across project-knowledge pages",
    "action": "Поиск по terms/routes/files/gaps/conflicts. Можно начать page-local, затем unified.",
    "definitionOfDone": "Поиск не вызывает backend; работает на local fixtures.",
    "gate": "Client/local only",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 7,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-033",
    "number": 33,
    "block": "PKG-13",
    "priority": "P1",
    "microstep": "Mobile 390px smoke",
    "filesOrRoutes": "All project-knowledge routes",
    "action": "Проверить layout на 390px: cards stack, no horizontal overflow, tables readable via wrapping/scroll.",
    "definitionOfDone": "Нет clipping; ключевые страницы usable.",
    "gate": "Visual QA",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 6,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-034",
    "number": 34,
    "block": "PKG-14",
    "priority": "P2",
    "microstep": "Оставить imports как future-gated",
    "filesOrRoutes": "src/app/project-knowledge/imports/page.tsx optional",
    "action": "Если создаётся route, он показывает disabled/future gate; не загружает файлы и не пишет в DB.",
    "definitionOfDone": "Пользователь видит: import disabled until explicit gate.",
    "gate": "No import implementation",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 5,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-035",
    "number": 35,
    "block": "PKG-15",
    "priority": "P2",
    "microstep": "Оставить DB persistence как future-gated",
    "filesOrRoutes": "supabase/migrations future only",
    "action": "Не создавать SQL в этом блоке. Только описать будущие tables/RLS/GRANT в docs.",
    "definitionOfDone": "Нет SQL-файла, нет migration, нет Supabase execution.",
    "gate": "No SQL",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 4,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-036",
    "number": 36,
    "block": "PKG-16",
    "priority": "P0",
    "microstep": "Run lint/build",
    "filesOrRoutes": "terminal only",
    "action": "Выполнить npm run lint; при достаточном времени npm run build. Ошибки фиксировать только в затронутых файлах.",
    "definitionOfDone": "Lint/build PASS или честный список ошибок, не связанных с блоком.",
    "gate": "Verification",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 3,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-037",
    "number": 37,
    "block": "PKG-16",
    "priority": "P0",
    "microstep": "Route smoke manual",
    "filesOrRoutes": "browser / terminal",
    "action": "Открыть /project-knowledge и ключевые subroutes. Проверить no crash, no hidden route calls, mobile.",
    "definitionOfDone": "Страницы открываются, fallback states понятны.",
    "gate": "Manual QA",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 2,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-038",
    "number": 38,
    "block": "PKG-16",
    "priority": "P0",
    "microstep": "Commit gate",
    "filesOrRoutes": "git",
    "action": "Показать git diff/status и запросить точную фразу PROJECT_KNOWLEDGE_COMMIT_APPROVED.",
    "definitionOfDone": "Без фразы commit не выполняется.",
    "gate": "Commit requires explicit approval",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 1,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "pkg-microstep-039",
    "number": 39,
    "block": "PKG-16",
    "priority": "P0",
    "microstep": "Push gate",
    "filesOrRoutes": "git",
    "action": "После commit запросить PROJECT_KNOWLEDGE_PUSH_APPROVED.",
    "definitionOfDone": "Без фразы push не выполняется.",
    "gate": "Push requires explicit approval",
    "status": "Planned",
    "totalSteps": 39,
    "remainingAfterStep": 0,
    "sourceRefs": [
      {
        "sourceId": "stage5-implementation-microsteps-20260606",
        "sourceFile": "GPT_APP_Stage5_Implementation_Microsteps_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  }
] satisfies readonly ImplementationMicrostep[];
