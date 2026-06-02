import type { ActivityDomain } from "./activity-capture-types";

export const ACTIVITY_CAPTURE_FIXTURES_CREATED =
  "ACTIVITY_CAPTURE_FIXTURES_CREATED" as const;

export interface ActivityCaptureExamplePrompt {
  id: string;
  label: string;
  rawText: string;
  domain: ActivityDomain;
  expectedSignals: string[];
  reason: string;
}

export const activityCaptureExamplePrompts: ActivityCaptureExamplePrompt[] = [
  {
    id: "example-german-learning-40m",
    label: "Немецкий 40 минут",
    rawText:
      "Немецкий 40 минут: Babbel, письмо клиенту, выписал 5 новых B2B-фраз.",
    domain: "language",
    expectedSignals: ["language", "german", "duration", "b2b", "work"],
    reason:
      "Проверяет распознавание языка, длительности, обучения и рабочего B2B-контекста.",
  },
  {
    id: "example-fitness-pullups",
    label: "Тренировка",
    rawText:
      "Тренировка 15 минут: подтягивания, отжимания на брусьях, планка, чувствую усталость в плечах.",
    domain: "fitness",
    expectedSignals: ["fitness", "health", "duration", "fatigue", "body"],
    reason:
      "Проверяет спорт/здоровье как category candidates и privacy hints без медицинских утверждений.",
  },
  {
    id: "example-food-breakfast",
    label: "Еда",
    rawText:
      "Завтрак: гречка, мясо, помидор, два бутерброда с сыром, кофе с сахаром.",
    domain: "nutrition",
    expectedSignals: ["nutrition", "food", "coffee", "health"],
    reason:
      "Проверяет пищевой контекст, nutrition candidates и приватность health-related данных.",
  },
  {
    id: "example-dog-walk",
    label: "Прогулка",
    rawText:
      "Прогулка с собакой 20 минут, прошёл примерно 1.2 км, поднялся пешком на 7 этаж.",
    domain: "mobility",
    expectedSignals: ["walk", "mobility", "duration", "distance", "stairs"],
    reason:
      "Проверяет прогулку, движение, примерную дистанцию, этажи и локальные metric hints.",
  },
  {
    id: "example-work-invoices",
    label: "Работа",
    rawText:
      "Работа CSP 45 минут: проверял немецкие счета за газ и электричество, исправил ошибки.",
    domain: "work",
    expectedSignals: ["work", "german", "duration", "invoice", "energy"],
    reason:
      "Проверяет рабочий контекст, немецкий язык и Value Object candidates без записи в DB.",
  },
  {
    id: "example-childcare-math",
    label: "Ребёнок",
    rawText:
      "Занимался с ребёнком математикой 25 минут, объяснял сложение и помогал не отвлекаться.",
    domain: "family",
    expectedSignals: ["family", "childcare", "learning", "duration", "care"],
    reason:
      "Проверяет социально-ролевой смысл childcare/caregiving, а не только обучение.",
  },
  {
    id: "example-purchase-confirmation",
    label: "Покупка",
    rawText:
      "Покупка: одноразовая посуда для офиса на 62 злотых, нужно потом подтвердить у продавца.",
    domain: "purchase",
    expectedSignals: ["purchase", "money", "organization", "points", "privacy"],
    reason:
      "Проверяет purchase/money/organization hints без коммерческих write-gates.",
  },
];

export const defaultActivityCaptureExample =
  activityCaptureExamplePrompts[0] ?? null;

export function getActivityCaptureExampleById(
  id: string,
): ActivityCaptureExamplePrompt | null {
  return activityCaptureExamplePrompts.find((example) => example.id === id) ?? null;
}
