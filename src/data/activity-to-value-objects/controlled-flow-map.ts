import type { ControlledFlowMapPackage } from "@/types/activity-value-object-flow-map";

export const controlledFlowMapPackage: ControlledFlowMapPackage = {
  packageId: "fixture-controlled-flow-map-v1",
  status: "read_only_fixture",
  flowName: "activity_to_value_objects_controlled_flow",
  stages: [
    {
      order: 1,
      titleRu: "Свободный текст в правой AI-колонке",
      status: "done_preview",
      route: "/workspace",
      descriptionRu:
        "Пользователь пишет обычным языком: 'Играл с ребёнком в футбол 30 минут'. Единая точка входа остаётся правой AI-колонкой.",
      noWriteBoundary: true,
    },
    {
      order: 2,
      titleRu: "Распознавание активности",
      status: "done_preview",
      route: "/activity-capture/facts-preview",
      descriptionRu:
        "Система определяет, что это активность, извлекает длительность и готовит preview без записи в БД.",
      noWriteBoundary: true,
    },
    {
      order: 3,
      titleRu: "Семантические категории",
      status: "done_preview",
      route: "/activity-capture/facts-preview",
      descriptionRu:
        "Активность раскладывается на футбол, игру, ребёнка, семейное время, физическую активность и возможное время на свежем воздухе.",
      noWriteBoundary: true,
    },
    {
      order: 4,
      titleRu: "Сопоставление с Value Objects",
      status: "current_preview",
      route: "/activity-capture/controlled-flow-map",
      descriptionRu:
        "Система показывает, какие категории уже нашли Value Object, а какие требуют создания или подтверждения.",
      noWriteBoundary: true,
    },
    {
      order: 5,
      titleRu: "Размещение в дереве Value Objects",
      status: "current_preview",
      route: "/value-objects/tree-preview",
      descriptionRu:
        "Найденные и кандидатные объекты показываются в структуре дерева: Организм, Семья, Интеллектуальная деятельность и другие ветки.",
      noWriteBoundary: true,
    },
    {
      order: 6,
      titleRu: "Создание недостающих Value Objects",
      status: "future_gate",
      route: null,
      descriptionRu:
        "Только после подтверждения пользователя система сможет создать недостающий VO, например 'Игра с ребёнком' или 'Футбол'.",
      noWriteBoundary: false,
    },
    {
      order: 7,
      titleRu: "Запись activity_object_facts",
      status: "future_gate",
      route: null,
      descriptionRu:
        "После save gate будут созданы реальные user-owned facts с activity_event_id, value_object_id или semantic_object_key и количественными показателями.",
      noWriteBoundary: false,
    },
    {
      order: 8,
      titleRu: "Аналитика по целевым характеристикам",
      status: "blocked_until_previous_gate",
      route: "/analytics",
      descriptionRu:
        "Только после реальных фактов и target/standard layer можно сравнивать: семейное время 30/60 минут, осталось 30 минут.",
      noWriteBoundary: true,
    },
  ],
  factToTreeRows: [
    {
      factLocalId: "fact-family-time-30m",
      semanticObjectKey: "family_time",
      factStatus: "ready_for_fact_write",
      valueObjectId: "VO_DEMO_FAMILY_TIME",
      valueObjectTitle: "Семейное время",
      treeNodeId: "VO_DEMO_FAMILY_TIME",
      treeNodeTitle: "Семейное время",
      treeParentTitle: "Семья",
      placementStatus: "matched_existing_tree_node",
      measureLabel: "30 minute",
      nextActionRu:
        "После будущего save gate записать activity_object_fact с value_object_id семейного времени.",
    },
    {
      factLocalId: "fact-physical-activity-30m",
      semanticObjectKey: "physical_activity",
      factStatus: "ready_for_fact_write",
      valueObjectId: "VO_DEMO_PHYSICAL_ACTIVITY",
      valueObjectTitle: "Физическая активность",
      treeNodeId: "VO_DEMO_PHYSICAL_ACTIVITY",
      treeNodeTitle: "Физическая активность",
      treeParentTitle: "Организм",
      placementStatus: "matched_existing_tree_node",
      measureLabel: "30 minute",
      nextActionRu:
        "После будущего save gate записать activity_object_fact с value_object_id физической активности.",
    },
    {
      factLocalId: "fact-football-30m",
      semanticObjectKey: "football",
      factStatus: "needs_value_object",
      valueObjectId: null,
      valueObjectTitle: null,
      treeNodeId: "VO_CANDIDATE_FOOTBALL",
      treeNodeTitle: "Футбол",
      treeParentTitle: "Физическая активность",
      placementStatus: "candidate_tree_node",
      measureLabel: "30 minute",
      nextActionRu:
        "Показать пользователю кандидата 'Футбол'. После подтверждения создать VO или сопоставить с существующим.",
    },
    {
      factLocalId: "fact-play-with-child-30m",
      semanticObjectKey: "play_with_child",
      factStatus: "needs_user_confirmation",
      valueObjectId: null,
      valueObjectTitle: null,
      treeNodeId: "VO_CANDIDATE_PLAY_WITH_CHILD",
      treeNodeTitle: "Игра с ребёнком",
      treeParentTitle: "Семейное время",
      placementStatus: "needs_user_confirmation",
      measureLabel: "30 minute",
      nextActionRu:
        "Спросить пользователя: создать 'Игра с ребёнком' внутри ветки 'Семейное время'?",
    },
    {
      factLocalId: "fact-outdoor-time-30m",
      semanticObjectKey: "outdoor_time",
      factStatus: "needs_user_confirmation",
      valueObjectId: null,
      valueObjectTitle: null,
      treeNodeId: "VO_DEMO_OUTDOOR_ENVIRONMENT",
      treeNodeTitle: "Среда / свежий воздух",
      treeParentTitle: "Организм",
      placementStatus: "needs_user_confirmation",
      measureLabel: "30 minute",
      nextActionRu:
        "Спросить пользователя, действительно ли футбол был на улице. Не записывать как факт без подтверждения.",
    },
  ],
  safety: {
    previewOnly: true,
    dbWriteAllowed: false,
    sqlAllowed: false,
    openAiCallAllowed: false,
    autoCreateValueObjectsAllowed: false,
    notes: [
      "This flow map connects the Step 03 facts preview with the Step 04 tree preview.",
      "Rows shown here are not persisted activity_object_facts.",
      "Candidate tree nodes are not persisted Value Objects.",
      "The page must not call Supabase, SQL, OpenAI or hidden write APIs.",
      "Future write gates must remain server-mediated because activity facts tables have no direct browser access.",
      "Analytics remains blocked until real facts and target/standard characteristics exist.",
    ],
  },
};
