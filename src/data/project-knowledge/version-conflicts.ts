// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { ConflictItem } from "@/types/project-knowledge";

export const projectKnowledgeVersionConflicts = [
  {
    "id": "VC-01",
    "priority": "P0",
    "type": "Route / IA",
    "title": "Документы используют /objects, фактическая карта показывает /value-objects",
    "old": "UI-планы и часть документов: /objects, /objects/[id].",
    "current": "Инвентаризация: /value-objects, /value-objects/[id], /value-objects/new; термин Value Objects уже реализуется в component tree.",
    "risk": "Маркетинг и QA будут проверять несуществующий route; возможны дубли links/nav.",
    "decision": "Зафиксировать canonical: /value-objects как текущий active route; /objects только alias/redirect, если нужен короткий публичный URL.",
    "action": "Создать canonical route map; обновить UI docs/nav/tests; при необходимости добавить redirect /objects -> /value-objects.",
    "status": "Open / решить до следующих UI-шагов",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-02",
    "priority": "P0",
    "type": "Route / IA",
    "title": "Activity Capture vs /activity/review",
    "old": "UI-план: /activity/review или workspace panel для Activity Review Card.",
    "current": "Инвентаризация: /activity-capture page; API detached semantic preview; /activity/review как page не найден.",
    "risk": "Review Card может разрабатываться в разных местах; user flow станет непоследовательным.",
    "decision": "Развести роли: /activity-capture = ввод и первый preview; /activity/review = optional detail/alias только после отдельного решения.",
    "action": "В Page Map указать active/canonical route; для UI-17 использовать existing /activity-capture + workspace panel.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-03",
    "priority": "P0",
    "type": "Route / IA",
    "title": "/today и /activity-today дублируют Timeline-сценарий",
    "old": "UI-план: /today как Today / Timeline.",
    "current": "Инвентаризация: есть /today и /activity-today.",
    "risk": "Две ленты могут расходиться по данным, privacy markers, correction/conflict states.",
    "decision": "Выбрать один canonical user route: рекомендовано /today. /activity-today пометить legacy/internal или redirect.",
    "action": "Проверить links, navigation, components; убрать дублирование при следующем UI hardening.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-04",
    "priority": "P0",
    "type": "Safety / Routes",
    "title": "Debug/readiness routes перекрываются с production routes",
    "old": "Документы readiness/debug использовались как proof-поверхности.",
    "current": "Инвентаризация показывает около 187 app-route entries и значимое число debug/readiness paths; debug_count marker approx: 59.",
    "risk": "Debug endpoint может попасть в production navigation или восприниматься как стабильный API.",
    "decision": "Debug route != production route. Нужна Debug Route Exposure Policy.",
    "action": "Каждому debug route присвоить keep-dev-only/remove/convert; закрыть auth/server-only; запретить public links.",
    "status": "Open / P0",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-05",
    "priority": "P0",
    "type": "AI Architecture",
    "title": "OpenAI integration описан как src/ai, но пакет не найден",
    "old": "ТЗ OpenAI: src/ai/governance, router, prompts, schemas, tools, validators, learning, observability.",
    "current": "В project_code_files не найден явный src/ai package; AI/semantic logic живёт в routes/docs/components.",
    "risk": "Budget, privacy, structured outputs and no-write gates будут контролироваться непоследовательно.",
    "decision": "Документированное ТЗ остаётся целевым; current implementation = not yet split.",
    "action": "Создать отдельный implementation microplan для src/ai read-only first package.",
    "status": "Open / Stage 4-5",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-06",
    "priority": "P0",
    "type": "Semantic Safety",
    "title": "AI suggestion может быть ошибочно понята как system decision",
    "old": "Ранние формулировки могли звучать как AI классифицирует/решает.",
    "current": "Актуальное правило: AI output = candidate, backend validates, user/gate confirms.",
    "risk": "Скрытые writes, неконтролируемые категории, неправильные обещания маркетинга.",
    "decision": "Везде использовать wording: candidate / suggestion / preview; не truth.",
    "action": "Обновить UI copy, marketing copy, QA assertions, glossary.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-07",
    "priority": "P0",
    "type": "Semantic Governance",
    "title": "External concept vs internal category",
    "old": "Можно было думать, что внешнее понятие сразу становится категорией.",
    "current": "Актуальное правило: external concept is hint; internal category только через resolver/governance/status.",
    "risk": "Дубли bicycle/bike/rower/Fahrrad/велосипед; хаос онтологии.",
    "decision": "External concept != internal category.",
    "action": "В Semantic Review Card показывать external candidate как подсказку, статус suggested/needs_review.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-08",
    "priority": "P0",
    "type": "State Safety",
    "title": "Category vs State Fact",
    "old": "Ранние слои state могли восприниматься как прямое создание фактов из категорий.",
    "current": "Категория может дать state hook/signal, но state fact/delta/snapshot только после evidence/window/source contract.",
    "risk": "Диагнозы, гормоны, productivity truth и юридически опасные утверждения.",
    "decision": "Category != State Fact. Для UI: signals only unless evidence-backed.",
    "action": "Analytics/State copy: load/recovery/risk signals, not diagnosis/truth.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-09",
    "priority": "P0",
    "type": "Persistence / Gates",
    "title": "Preview, confirmation и write-gate смешиваются в старых описаниях",
    "old": "Пользовательское подтверждение могло звучать как момент сохранения.",
    "current": "No hidden writes: preview/correction candidate/feedback preview != persistence; write только через explicit gate.",
    "risk": "Незаметные DB writes, нарушение trust/privacy, ложные тесты.",
    "decision": "UI confirmation не равно automatic DB write.",
    "action": "В QA map проверять no DB write before gate; labels: preview-only/draft/write-gated.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-10",
    "priority": "P0",
    "type": "Value Objects",
    "title": "Unified Value Object vs hard subtypes",
    "old": "Старые коммерческие и личные объекты могли трактоваться как разные сущности.",
    "current": "Актуальная модель: единый Value Object; роль определяется context/visibility/category signature.",
    "risk": "Дубли БД, сложные миграции, нестыковка personal/enterprise analytics.",
    "decision": "Не вводить hard subtypes; использовать context/visibility/commercial usage.",
    "action": "Проверить naming в docs/components: personal VO, enterprise VO = modes/contexts, not separate core classes.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-11",
    "priority": "P0",
    "type": "Time / Analytics",
    "title": "Exposure link может быть ошибочно понят как duplicate time",
    "old": "Проекции активности на несколько объектов могут выглядеть как несколько записей времени.",
    "current": "Activity Event хранит время один раз; Value Objects получают exposure/projection links.",
    "risk": "Суммы времени и analytics будут неверно восприниматься; KPI станет недостоверным.",
    "decision": "Exposure link != duplicate time.",
    "action": "В Timeline/Analytics показывать source activity id и projection labels.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-12",
    "priority": "P1",
    "type": "Recommendation",
    "title": "Weakest Direction vs final Next Best Action",
    "old": "Слабое направление могло восприниматься как автоматическое предписание.",
    "current": "Weakest Direction -> user choice -> candidate package; no auto-execute.",
    "risk": "Платформа будет выглядеть как диктующая действия, а не как помощник.",
    "decision": "Weakest Direction != final NBA.",
    "action": "В /next UI добавить explicit user choice и explainability.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-13",
    "priority": "P1",
    "type": "Similarity / Relevance",
    "title": "Similarity и Relevance смешиваются",
    "old": "Похожие объекты могли считаться релевантными сейчас.",
    "current": "Similarity = похожесть по категориям; Relevance = применимость с учётом constraints/state/window.",
    "risk": "Плохие рекомендации и непонятные объяснения.",
    "decision": "Держать два отдельных UI/data блока.",
    "action": "В glossary/files/types разделить similarity score и relevance reason.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-14",
    "priority": "P1",
    "type": "Terminology",
    "title": "Tags / Object-Action Rubricator / Categories перекрывают друг друга",
    "old": "Старые документы используют object-action rubricator, tags/classifications.",
    "current": "Новая модель: controlled category pipeline + semantic bundle + external ontology bridge.",
    "risk": "Команда будет создавать tags вместо categories или categories вместо resolver-governed concepts.",
    "decision": "Tags считать legacy/label-level; category = controlled semantic element; rubricator = historical/backbone source layer.",
    "action": "Добавить glossary aliases and deprecated terms section.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-15",
    "priority": "P1",
    "type": "Activity Model",
    "title": "Activity Primitive vs Activity Event vs Raw Activity Signal",
    "old": "Ранние планы использовали primitives and raw signals как элементы смыслового контура.",
    "current": "Activity Event = source of truth; Raw Activity Signal = intake before normalization; Primitive = extracted action shape.",
    "risk": "Разработчик может сохранять смысл не в том слое.",
    "decision": "Считать Activity Event обязательным source-of-truth object; primitive/signal only supporting layers.",
    "action": "В File Map указать, где живут raw signals, events, intake, preview.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-16",
    "priority": "P1",
    "type": "Onboarding / MVP",
    "title": "/onboarding обозначен MVP, но в route inventory не найден",
    "old": "UI plan: /onboarding first launch, language, domains, privacy defaults, start VOs.",
    "current": "Route inventory: /onboarding not detected.",
    "risk": "MVP без onboarding будет сложным и небезопасным по privacy defaults.",
    "decision": "Считать gap, а не конфликт концепции: route must be created or route plan corrected.",
    "action": "Добавить onboarding microplan или удалить из MVP scope только явным решением.",
    "status": "Open / linked GAP-06",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-17",
    "priority": "P1",
    "type": "Public / Marketing",
    "title": "Public Landing существует в плане, но не закреплён как проверенный route",
    "old": "UI plan requires Public Landing / as MVP.",
    "current": "Route candidates focus on app pages; root route status требует проверки/current home decision.",
    "risk": "Нет единого официального языка для маркетинга и доверия.",
    "decision": "Landing copy должен быть source-controlled; no overclaim language.",
    "action": "Проверить root page.tsx; создать Landing IA/doc before marketing launch.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-18",
    "priority": "P1",
    "type": "Commercial Core",
    "title": "Commercial Core может смешаться с Semantic MVP",
    "old": "Коммерческие функции активно развивались до/параллельно семантическому UI.",
    "current": "UI plan: Commercial Core = V1 after semantic activity/review foundations.",
    "risk": "Сертификаты/points/purchases заберут фокус до стабильного capture/review foundation.",
    "decision": "Commercial Core remains V1 block; semantic MVP first.",
    "action": "Не смешивать commercial writes with semantic UI MVP; отдельные gates.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-19",
    "priority": "P1",
    "type": "Commercial Core",
    "title": "Purchase Confirmation vs обычная cart/order/e-commerce model",
    "old": "Можно ошибочно трактовать platform purchase как корзину/заказ товаров.",
    "current": "Целевая логика: подтверждение внешней покупки у организации; платформа важна для points/certificates/trust, не для cart order flow.",
    "risk": "Неправильный UX, юридические обязательства продавца/платформы, путаница points.",
    "decision": "Purchase Confirmation = external purchase proof + seller approval.",
    "action": "Marketing/docs: не обещать обычный marketplace checkout для товаров/услуг.",
    "status": "Ongoing rule",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-20",
    "priority": "P1",
    "type": "Commercial Core",
    "title": "Points spending: seller receives points vs points are burned",
    "old": "Может возникнуть представление, что points переходят продавцу.",
    "current": "Целевое правило: buyer spends points on certificate; points are burned; seller получает money part.",
    "risk": "Ошибки расчётов, бухгалтерии и текста offer/certificate.",
    "decision": "Points do not transfer to seller.",
    "action": "В points/certificate docs and UI labels добавить burn/remove-from-circulation language.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-21",
    "priority": "P1",
    "type": "Privacy / Public",
    "title": "Public purchase history: open buyer vs masked buyer",
    "old": "История покупок могла быть общей/публичной без точного masking rule.",
    "current": "Целевое правило: имена покупателей маскируются; названия фирм открыты.",
    "risk": "GDPR/trust risk; пользователи могут бояться подтверждать покупки.",
    "decision": "Buyer identity masked by default in public history.",
    "action": "QA: public/purchases must show masked buyer, open company names.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-22",
    "priority": "P1",
    "type": "Privacy / Sensitive",
    "title": "Sensitive categories privacy defaults недостаточно централизованы",
    "old": "Здоровье/семья/деньги/туалет описаны в разных документах.",
    "current": "Privacy/Audit page planned; default private rules must be enforced in UI and backend.",
    "risk": "Sensitive information accidentally appears in analytics/public pages.",
    "decision": "Sensitive domains private by default.",
    "action": "Centralize privacy category policy in future src/ai/governance or src/privacy module.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-23",
    "priority": "P1",
    "type": "AI UI",
    "title": "Right AI Column vs обычный чат",
    "old": "AI мог восприниматься как отдельная chat-кнопка.",
    "current": "Workspace concept: AI always scoped to selected activity/object/page; context header required.",
    "risk": "AI будет давать абстрактные ответы без знания context, что снижает ценность продукта.",
    "decision": "Contextual AI only for workspace pages.",
    "action": "ContextualAIColumn must display SourceContextBadge / current context.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-24",
    "priority": "P1",
    "type": "Mobile UX",
    "title": "Mobile shell not desktop shrink",
    "old": "Можно было просто адаптировать 20/45/35 в mobile.",
    "current": "Plan: /m or mobile tabs AI/Workspace/Objects/Calendar/Actions.",
    "risk": "На 390px интерфейс станет непригодным.",
    "decision": "Mobile = separate operational shell, not compressed desktop.",
    "action": "Before UI-18: mobile smoke for capture/review/object/calendar/action.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-25",
    "priority": "P1",
    "type": "QA / Tests",
    "title": "Acceptance criteria in docs vs executable tests",
    "old": "Документы определяют QA manually.",
    "current": "Gap analysis: no mature test/e2e layer detected in inventory.",
    "risk": "Ошибки no-write/privacy/mobile могут пройти незамеченными.",
    "decision": "Docs are not enough for UI-17/UI-18.",
    "action": "Create scenario matrix as executable smoke/e2e later; for now keep CSV as source of truth.",
    "status": "Open / linked GAP-05",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-26",
    "priority": "P2",
    "type": "Documents / Actuality",
    "title": "v4.1/v4.4/v4.6 and later docs overlap",
    "old": "Several general plans and tactical plans exist with different dates and terminology.",
    "current": "Rule: newest factual lock wins; older docs are historical source unless explicitly carried forward.",
    "risk": "Новый человек читает старую формулу как текущую.",
    "decision": "Create document status registry: Active / Historical / Superseded / Partial source.",
    "action": "Stage 4 Project Knowledge should include Source Document Register.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-27",
    "priority": "P2",
    "type": "Actor Model",
    "title": "Actor vs Source of Agency",
    "old": "Older methodology separates actor and causal source; this can be confused in implementation.",
    "current": "Actor remains identity/owner/participant; Source of Agency is explanatory/causal layer.",
    "risk": "Rights/ownership could be mixed with causality and blame/impact analysis.",
    "decision": "Do not use Source of Agency for auth/ownership/payments.",
    "action": "Add to glossary and state/causal layer docs.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-28",
    "priority": "P2",
    "type": "Data / SQL",
    "title": "State persistence documents vs current read-only UI path",
    "old": "Many docs/migrations discuss state facts/deltas/snapshots and state write gates.",
    "current": "UI track requires read-only/preview first; state facts should not be created by categories or UI preview.",
    "risk": "Developer might wire UI directly to state write paths too early.",
    "decision": "UI-17/18 remain no-write/read-only until explicit gate.",
    "action": "Mark state persistence files as backend/future, not UI-MVP dependency.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-29",
    "priority": "P2",
    "type": "Admin / Product",
    "title": "Object-action admin pages vs user-facing semantic review",
    "old": "Admin object-action pages exist historically.",
    "current": "User-facing Semantic Review should be simple review-card, not ontology admin.",
    "risk": "Users/marketers may see complex admin taxonomy and misunderstand product.",
    "decision": "Admin taxonomy != user review flow.",
    "action": "Keep admin routes hidden/internal; user review via NewConceptCard/CategoryResolutionCard.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  },
  {
    "id": "VC-30",
    "priority": "P2",
    "type": "Naming",
    "title": "Enterprise vs Organization vs Company wording",
    "old": "Docs use enterprise, organization, company, firm in different contexts.",
    "current": "Commercial core data uses organizations; public names are company/organization names; enterprise VO is context, not separate company type.",
    "risk": "Confusing UI labels and legal/commercial texts.",
    "decision": "Canonical backend term: Organization; user-facing label may be Firma/Company depending language.",
    "action": "Glossary add aliases; avoid enterprise as UI label unless explaining context.",
    "status": "Open",
    "sourceRefs": [
      {
        "sourceId": "stage3-conflict-register-20260606",
        "sourceFile": "GPT_APP_Stage3_Conflict_Register_RU_20260606.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "active-doc"
      }
    ]
  }
] satisfies readonly ConflictItem[];
