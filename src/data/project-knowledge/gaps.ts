// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { GapItem } from "@/types/project-knowledge";

export const projectKnowledgeGaps = [
  {
    "id": "GAP-01",
    "priority": "P0",
    "area": "Documentation / Governance",
    "title": "Нет внутреннего Project Knowledge / Governance Layer",
    "current": "Сделан внешний Word/CSV этапа 1. В кодовой карте не обнаружены routes вроде /project-knowledge, /glossary, /page-map, /process-map, /version-conflicts.",
    "gap": "Знания проекта существуют в документах и чатах, но не как управляемый раздел платформы с терминами, процессами, запретами, статусами и решениями.",
    "risk": "Новые люди будут читать разные версии документов, путать термины и тестировать не те процессы.",
    "recommendation": "Сначала вести Word/CSV как source of truth; затем создать read-only internal module: /project-knowledge, /glossary, /page-map, /file-map, /process-map, /forbidden-confusions, /qa-acceptance, /gap-analysis, /version-conflicts, /decision-log.",
    "acceptance": "Есть read-only страницы, импорт из CSV/fixtures, поиск по терминам, связи термин -> route -> file -> process -> owner/status.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-02",
    "priority": "P0",
    "area": "Routes / IA",
    "title": "Не заморожена единая карта route-названий",
    "current": "План использует /objects и /activity/review, а фактическая инвентаризация показывает /value-objects, /activity-capture, /activity-today и /today.",
    "gap": "Нет одного canonical route map, который запрещает параллельные названия одной функции.",
    "risk": "Маркетинг, тестировщик и разработчик будут описывать разные страницы; могут появиться дубли и неправильные ссылки.",
    "recommendation": "До следующих UI-блоков утвердить canonical route map: оставить текущие фактические routes или создать redirects/aliases; внести решение в Version Conflicts Map.",
    "acceptance": "Для каждого блока есть canonical route, статус legacy/active/redirect, ответственная страница и тест smoke.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-03",
    "priority": "P0",
    "area": "Safety / Production hardening",
    "title": "Много debug/readiness routes требует exposure policy",
    "current": "Инвентаризация показывает 187 route-файлов, из них 59 содержат debug в пути.",
    "gap": "Не отделена явно production surface от sandbox/debug/readiness endpoints.",
    "risk": "Debug endpoint может случайно стать доступным или восприниматься командой как production API.",
    "recommendation": "Создать Debug Route Exposure Policy: список разрешённых dev-only routes, auth/server-only guards, remove/disable план, no index links, production deny.",
    "acceptance": "Каждый debug route имеет статус keep-dev-only / remove / convert-to-production; production build не показывает debug UI обычному пользователю.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-04",
    "priority": "P0",
    "area": "OpenAI Integration",
    "title": "OpenAI integration layer описан в ТЗ, но не выделен как src/ai пакет",
    "current": "В техническом ТЗ указан слой governance/router/prompts/schemas/tools/validators/learning/observability. В инвентаризации не найден src\\ai.",
    "gap": "AI-логика рискует расползтись по routes/components вместо единого управляемого слоя.",
    "risk": "Сложно контролировать budget, privacy, tool access, structured outputs, no-write gates и evals.",
    "recommendation": "Создать отдельный read-only first пакет src/ai с governance rules, schemas, validators, tool registry stub, usage logger stub, eval fixtures.",
    "acceptance": "Любой AI endpoint использует единые schemas/validators/governance; нет прямого SQL/tool access из модели.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-05",
    "priority": "P0",
    "area": "QA / Acceptance",
    "title": "Не обнаружен полноценный test/e2e слой для UI-17/UI-18",
    "current": "В инвентаризации видны docs/browser-tests, но не обнаружены стандартные test/e2e папки или *.test/*.spec в проектном снимке.",
    "gap": "Acceptance criteria существуют в документах, но не закреплены исполняемыми тестами и сценарной матрицей.",
    "risk": "Можно визуально закрыть блок, не доказав no hidden writes, mobile/desktop consistency, privacy markers и fallback states.",
    "recommendation": "Ввести tests или e2e слой: route smoke, UI fixture smoke, no-write route proof, privacy marker scenarios, mobile 390px visual smoke.",
    "acceptance": "UI-17 и UI-18 имеют сценарии food/toilet/German/workout/children/work/purchase/free-window с явными expected states.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-06",
    "priority": "P0",
    "area": "Onboarding / UX",
    "title": "Onboarding обозначен как MVP, но route не найден",
    "current": "UI-план включает /onboarding как MVP. В route inventory /onboarding не найден.",
    "gap": "Первый запуск пользователя не оформлен: язык, домены, privacy defaults, стартовые Value Objects, согласия.",
    "risk": "Новый пользователь попадает в сложный Workspace без первичной настройки, а privacy/consent остаются неявными.",
    "recommendation": "Создать /onboarding read-only/fixture flow перед full persistence: language, personal/commercial mode, privacy defaults, sample activity, first Value Objects.",
    "acceptance": "Пользователь за 2-4 шага понимает, что вводить, что приватно, что является preview, что будет сохранено только после gate.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-07",
    "priority": "P1",
    "area": "Public / Marketing",
    "title": "Не зафиксирована полноценная public landing / product explanation surface",
    "current": "UI-план требует Public Landing как MVP. В route inventory root / page.tsx не обнаружен в списке route candidates.",
    "gap": "Нет отдельной публичной страницы, объясняющей платформу, доверие, privacy, CTA и ограничения no diagnosis/no overclaim.",
    "risk": "Маркетинг будет описывать сложную систему без единого официального текста; пользователи не поймут ценность.",
    "recommendation": "Подготовить Landing Information Architecture: hero, use cases, privacy/trust, how preview works, commercial core, CTA, disclaimers.",
    "acceptance": "Есть публичная страница или route, согласованная с глоссарием, без обещаний медицинской/финансовой истины.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-08",
    "priority": "P1",
    "area": "Semantic Review",
    "title": "Semantic Review UI есть, но governance lifecycle требует закрытия",
    "current": "Найдены /semantic/review и API preview for new concept candidates; документы фиксируют unknownTermCandidate/externalConceptCandidate/resolver.",
    "gap": "Не до конца видно, где production lifecycle suggested -> needs_review -> confirmed/rejected/merged становится audit-backed workflow.",
    "risk": "AI-кандидаты могут восприниматься как утверждённые категории; появятся дубли и неконтролируемые смыслы.",
    "recommendation": "Определить Semantic Review lifecycle contract, статусы, разрешённые действия, audit row, merge policy, rollback/undo policy.",
    "acceptance": "New Concept Card показывает external concept only as hint; confirm/merge/reject создаёт audit event только через gate.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-09",
    "priority": "P1",
    "area": "External Ontology",
    "title": "External ontology bridge выглядит как stub/debug, а не production resolver",
    "current": "Есть debug route external-concept-stub и документы по Category Source / External Ontology Protocol.",
    "gap": "Не выбран production source policy: какие внешние источники, cache, language aliases, conflict handling, canonical identity.",
    "risk": "Категории bicycle/bike/rower/Fahrrad/велосипед могут стать дублями или неконсистентными labels.",
    "recommendation": "Создать source registry: local seed, user aliases, prior corrections, external concept lookup, confidence, language labels, resolver events.",
    "acceptance": "Одно понятие имеет canonical id, multilingual aliases, mapping status и audit trail.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-10",
    "priority": "P1",
    "area": "Activity Capture",
    "title": "Activity Capture и Activity Review route-логика требует нормализации",
    "current": "Фактический route /activity-capture есть, плановый /activity/review не найден как user page. Есть API detached semantic preview.",
    "gap": "Нужно решить, является ли /activity-capture главным экраном review или будет создан /activity/review.",
    "risk": "Команда будет добавлять review card в разные места; документация и UI могут расходиться.",
    "recommendation": "Утвердить одно имя: /activity-capture как active route, а /activity/review как future alias/redirect либо наоборот.",
    "acceptance": "В Page Map отражено: active route, component owner, preview route, no-write status, future write gate.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-11",
    "priority": "P1",
    "area": "Value Objects",
    "title": "/objects в документах не совпадает с /value-objects в коде",
    "current": "План использует /objects и /objects/[id]; инвентаризация показывает /value-objects, /value-objects/[id], /value-objects/new.",
    "gap": "Не решено, какое название будет публичным/продуктовым, а какое техническим.",
    "risk": "Маркетинговые тексты, тесты и маршруты будут ссылаться на несуществующий /objects.",
    "recommendation": "Оставить /value-objects как canonical или добавить redirect /objects -> /value-objects; зафиксировать в Version Conflicts Map.",
    "acceptance": "Все документы, nav links, tests и UI labels используют один canonical route или явный alias.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-12",
    "priority": "P1",
    "area": "Timeline",
    "title": "/today и /activity-today потенциально дублируют пользовательский сценарий",
    "current": "В route inventory присутствуют /today и /activity-today.",
    "gap": "Неясно, какая страница является canonical Today/Timeline, а какая временная или legacy.",
    "risk": "Две разные ленты могут показывать разные поля/состояния, затрудняя QA и пользователю.",
    "recommendation": "Свести к одному Timeline shell: /today как canonical user route, /activity-today как internal/legacy/redirect или наоборот.",
    "acceptance": "Одна лента фактических действий; correction/conflict markers и domain filters живут в одном компонентном дереве.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-13",
    "priority": "P1",
    "area": "Analytics",
    "title": "Analytics route есть, но нужны evidence boundaries и no-overclaim copy",
    "current": "Найден /analytics. Документы требуют rings, heatmap, weak directions, warnings as signals.",
    "gap": "Не закрыто, какие данные являются aggregate/snapshot/evidence, а какие только preview или сигнал.",
    "risk": "Платформа может выглядеть как источник медицинской, финансовой или productivity truth.",
    "recommendation": "Для каждого виджета Analytics указать data source, confidence, freshness, private level, no-overclaim wording.",
    "acceptance": "Каждый виджет показывает источник/тип: fact, aggregate, signal, preview, recommendation candidate.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-14",
    "priority": "P1",
    "area": "Next Best Action",
    "title": "NBA нуждается в explainability и user choice gate",
    "current": "Найден /next. Документы фиксируют weakest direction -> user choice -> candidates, no auto-execute.",
    "gap": "Нужно показать, почему действие предложено и что оно не является автоматическим решением системы.",
    "risk": "Пользователь или маркетинг могут воспринимать NBA как директиву, а не кандидат.",
    "recommendation": "Для ActionCandidateCard добавить explanation, constraints, source signals, why not now, accept/skip/ask later feedback.",
    "acceptance": "Ни одно действие не выполняется без явного user choice/write gate; есть feedback after action.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-15",
    "priority": "P1",
    "area": "Privacy / Audit",
    "title": "Privacy route есть, но нужна полная карта sensitive domains и consent",
    "current": "Найден /privacy-audit. Документы требуют privacy levels for health/toilet/money/family and correction history additive.",
    "gap": "Не видно полного consent/purpose/retention/profile policy на уровне UI + backend.",
    "risk": "Семейные, медицинские, финансовые и психологические данные могут быть обработаны без достаточной прозрачности.",
    "recommendation": "Создать Privacy/Audit specification: sensitive categories, default private, public projection rules, consent toggles, export/delete/read-only logs.",
    "acceptance": "Каждый sensitive scenario показывает privacy marker и объясняет, что сохраняется, что inferred, что confirmed, что corrected.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-16",
    "priority": "P1",
    "area": "Commercial Core",
    "title": "Commercial Core существует, но должен быть отделён от Semantic MVP",
    "current": "Есть routes organizations/offers/certificates/points/purchase confirmations/public purchases и соответствующие API.",
    "gap": "Нужно явно отделить коммерческие writes от semantic activity/review MVP, чтобы не смешивать points/certificates с preview flows.",
    "risk": "Покупка/points/certificate могут начать зависеть от нестабильной семантики или preview-only данных.",
    "recommendation": "Утвердить отдельные gates для Commercial Core: purchase confirmation, seller approval, points ledger, certificate creation/redeem, public masked history.",
    "acceptance": "Commercial write gates независимы от semantic preview; публичная история маскирует buyer, organization остаётся открытой.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-17",
    "priority": "P1",
    "area": "Mobile",
    "title": "Mobile shell есть, но нужна сценарная паритетность, а не только route",
    "current": "Найден /m. UI-план требует tabs: AI, Workspace, Objects, Calendar, Actions.",
    "gap": "Не доказано, что ключевые сценарии выполняются на 390px без clipping/overflow и с теми же privacy/gate states.",
    "risk": "Мобильная версия станет уменьшенной копией desktop и потеряет смысл операционной оболочки.",
    "recommendation": "Для mobile добавить scenario checklist: record activity, review card, open object, calendar/free window, next action, privacy audit.",
    "acceptance": "Каждый MVP/MVP+ сценарий проходит на 390px, no horizontal overflow, actions доступны с клавиатуры/тапом.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-18",
    "priority": "P1",
    "area": "Design system",
    "title": "Не хватает трассировки Figma/design tokens -> components -> routes",
    "current": "Есть UI kit components и Figma ZIP; Stage 1 связывает часть компонентов, но нет formal traceability matrix.",
    "gap": "Команда не видит, какой Figma-блок соответствует какому component/file/route/state.",
    "risk": "Дизайн и код начнут расходиться при каждом новом блоке.",
    "recommendation": "Создать Design Traceability Map: Figma element -> component -> route -> data model -> states -> acceptance screenshot.",
    "acceptance": "Для каждого основного блока есть дизайн-источник, компонент, props/type и visual QA screenshot.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-19",
    "priority": "P2",
    "area": "Error / Fallback states",
    "title": "Нужна единая система Empty/Error/Loading/NoRights states",
    "current": "В UI kit и планах есть EmptyState/ErrorState/NoRightsState, но требуется покрытие по всем routes.",
    "gap": "Страницы могут по-разному показывать загрузку, отсутствие данных, ошибку доступа, no rights, preview unavailable.",
    "risk": "Пользователь не поймёт, ошибка это, пустое состояние или ограничение прав.",
    "recommendation": "Создать state matrix: loading, empty, error, no-rights, unauthenticated, preview unavailable, write gate closed.",
    "acceptance": "Все страницы имеют одинаковую структуру fallback states и текст без технического шума.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-20",
    "priority": "P2",
    "area": "Accessibility",
    "title": "Accessibility заявлена в acceptance, но нужна конкретная матрица",
    "current": "UI-18 упоминает accessibility; components используют visual tokens.",
    "gap": "Нет отдельного чек-листа по клавиатуре, focus order, aria labels, contrast, badges not color-only.",
    "risk": "Система будет неудобной и потенциально недоступной для части пользователей.",
    "recommendation": "Добавить A11y acceptance: keyboard path, headings hierarchy, aria labels for cards/actions, non-color semantic indicators.",
    "acceptance": "Каждый MVP route имеет keyboard path, visible focus, readable contrast, screen-reader labels для ключевых actions.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-21",
    "priority": "P2",
    "area": "Correction Learning",
    "title": "Correction Learning описан концептуально, но нужна data lifecycle карта",
    "current": "OpenAI ТЗ говорит о correction learning, personalization, cohorts and eval cases.",
    "gap": "Не описаны полностью: как correction становится learning signal, как anonymize/aggregate, где consent, когда применяется персонализация.",
    "risk": "Личные исправления могут быть использованы непрозрачно или не использоваться вообще.",
    "recommendation": "Создать Correction Learning lifecycle: correction row -> normalized pattern -> eval candidate -> personalization memory -> cohort pattern only with consent.",
    "acceptance": "Каждое исправление видно пользователю; можно объяснить, как оно улучшило будущие candidates.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-22",
    "priority": "P2",
    "area": "Team onboarding",
    "title": "Не хватает role-based onboarding guides для команды",
    "current": "Глоссарий этапа 1 полезен, но это ещё не инструкции по ролям.",
    "gap": "Маркетологу, QA, UX, backend, AI engineer и support нужны разные карты: что читать, что тестировать, что нельзя обещать.",
    "risk": "Люди будут тратить время на все документы подряд и упускать свои зоны ответственности.",
    "recommendation": "Создать 5 коротких role guides на базе глоссария и Gap/Conflict docs.",
    "acceptance": "Каждая роль имеет 1-2 страницы: термины, страницы, проверки, запреты, типовые ошибки.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-23",
    "priority": "P2",
    "area": "Search / Navigation",
    "title": "Для документационного слоя нужен поиск по терминам и связям",
    "current": "Сейчас CSV/Word можно читать вручную.",
    "gap": "Внутри платформы без поиска glossary/page/file/process map быстро станет тяжёлым документом.",
    "risk": "Documentation Layer повторит проблему старых документов: много текста, мало навигации.",
    "recommendation": "В future Project Knowledge Layer добавить search, filters by layer/status/role, backlinks term -> files -> routes.",
    "acceptance": "Пользователь вводит Activity Event и видит definition, pages, files, processes, forbidden confusions, tests.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "GAP-24",
    "priority": "P2",
    "area": "Security / Supabase",
    "title": "Нужен регулярный Data API/RLS/GRANT audit календарь",
    "current": "Проект имеет Supabase migrations and RLS/GRANT concerns; пользователь ранее закрепил правило explicit GRANT near policies.",
    "gap": "Нужно оформить schedule/checklist, чтобы новые таблицы не открывались через Data API шире, чем нужно.",
    "risk": "Случайное расширение доступа к приватным таблицам или service_role misuse.",
    "recommendation": "Добавить Security Audit Checklist: create table -> indexes -> RLS -> policies -> explicit GRANT -> advisor review before production.",
    "acceptance": "Каждая новая migration содержит grant rationale; private activity/semantic/state tables not broadly exposed.",
    "status": "open",
    "sourceRefs": [
      {
        "sourceId": "stage2-gap-register-20260606",
        "sourceFile": "GPT_APP_Stage2_Gap_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  }
] satisfies readonly GapItem[];
