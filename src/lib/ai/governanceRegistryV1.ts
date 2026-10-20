/** AI-GOV-MVP-1. Registry is descriptive, not an executor or source of authorization. */
export type GovernanceDomainCode =
  | "publications" | "personal_activities" | "projects"
  | "organizations" | "goods_services" | "certificates";
export type GovernanceConnection = "runtime_wired" | "existing_partial" | "catalog_only" | "planned";
export type GovernanceScope = "platform" | "organization" | "personal";

export type GovernanceDomain = {
  code: GovernanceDomainCode;
  title: string;
  inputExamples: readonly string[];
  processingExamples: readonly string[];
  connection: GovernanceConnection;
  currentEvidence: string;
  systemLink: string;
  personalLink: string;
};

export const GOVERNANCE_DOMAINS_V1: readonly GovernanceDomain[] = [
  {
    code: "publications", title: "Публичные публикации и лента",
    inputExamples: ["Посты пользователей", "Публикации предприятий", "ИИ-каналы"],
    processingExamples: ["Цены за единицу", "Переводы", "Факты и источники"],
    connection: "existing_partial", currentEvidence: "Пересчёт цен и единиц работает детерминированно. Универсальный AI-маршрутизатор публикаций ещё не подключён.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
  {
    code: "personal_activities", title: "Персональные активности",
    inputExamples: ["Текст", "Голос", "Типовая активность"],
    processingExamples: ["Разбор событий", "ОН и параметры", "Команды и сокращения"],
    connection: "existing_partial", currentEvidence: "Детерминированные правила activity_quick_capture подключены. Персональные сокращения по событиям пока не подключены.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
  {
    code: "projects", title: "Проекты и задачи",
    inputExamples: ["Создание проекта", "Поручения", "Статусы"],
    processingExamples: ["Декомпозиция", "Зависимости", "Сигналы риска"],
    connection: "planned", currentEvidence: "Единый AI-runtime с редактируемыми правилами этого направления не подтверждён.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
  {
    code: "organizations", title: "Организации и предприятия",
    inputExamples: ["Карточка предприятия", "Роли", "Категории"],
    processingExamples: ["Классификация", "Проверка полей", "Связи с ОН"],
    connection: "planned", currentEvidence: "Отдельный конфигурируемый AI-исполнитель пока не подключён.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
  {
    code: "goods_services", title: "Товары и услуги",
    inputExamples: ["Название товара", "Цена", "Характеристики услуги"],
    processingExamples: ["Структурирование цен", "Единицы", "Категории"],
    connection: "planned", currentEvidence: "Демонстрационный парсер цен в ленте не является общим обработчиком карточки товара.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
  {
    code: "certificates", title: "Сертификаты и предложения",
    inputExamples: ["Номинал", "Условия", "Срок действия"],
    processingExamples: ["Проверка ограничений", "Условия использования", "Номинал и валюта"],
    connection: "planned", currentEvidence: "AI-обработка сертификата не подключена и не выдаёт разрешений на операции.",
    systemLink: "/admin/ai-instructions", personalLink: "/settings/ai-processing",
  },
] as const;

export const GOVERNANCE_LAYERS_V1 = [
  {level: 1, code: "hard_guards", title: "Системные ограничения", editor: "Разработчик / администратор", mutability: "Только проверяемый релиз кода"},
  {level: 2, code: "platform_rules", title: "Общие и направленные правила", editor: "Администратор", mutability: "Разрешённые параметры / версии"},
  {level: 3, code: "organization_rules", title: "Правила организации", editor: "Уполномоченный представитель", mutability: "Будущий этап"},
  {level: 4, code: "personal_rules", title: "Персональные правила", editor: "Пользователь", mutability: "Частично: существующие общие инструкции"},
  {level: 5, code: "event_context", title: "Контекст текущего действия", editor: "Пользователь / форма", mutability: "Только в рамках разрешённых операций"},
] as const;

export const GOVERNANCE_WORKFLOW_STAGES_V1 = [
  {code: "intake", title: "Приём и контекст", state: "design_ready"},
  {code: "policy_resolution", title: "Выбор применимых правил", state: "design_ready"},
  {code: "deterministic", title: "Алгоритмическая обработка", state: "existing_partial"},
  {code: "ai_fallback", title: "ИИ для сложных случаев", state: "not_connected"},
  {code: "validate", title: "Валидатор и проверка человеком", state: "design_ready"},
  {code: "ledger", title: "Учёт AI EUR плательщика", state: "not_connected_in_this_registry"},
  {code: "write", title: "Подтверждённое сохранение результата", state: "not_connected"},
] as const;
