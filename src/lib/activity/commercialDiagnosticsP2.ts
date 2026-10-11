/** P2 admin-only diagnostic labels. No UI guesses and no ontology writes. */
export const ARCTOR_COMMERCIAL_DIAGNOSTICS_P2_V1 = "ARCTOR_COMMERCIAL_DIAGNOSTICS_P2_V1" as const;

type Explanation = { stage: string; problem: string; suggestion: string };
const reasons: Record<string, Explanation> = {
  COMMERCIAL_FEED_AUTHOR_ACTOR_UNRESOLVED: {
    stage: "Определение автора сообщения", problem: "Не удалось проверить действующего автора публикации.",
    suggestion: "Проверьте профиль или актор публикации и повторите разбор.",
  },
  COMMERCIAL_FEED_TEMPLATE_NOT_AUTO_COMMERCIAL: {
    stage: "Проверка типовой активности", problem: "Найденная типовая активность не разрешает автоматическую коммерческую обработку.",
    suggestion: "Проверьте вид, активность и режим подтверждения системной коммерческой типовой активности.",
  },
  COMMERCIAL_FEED_TEMPLATE_NOT_UNAMBIGUOUS: {
    stage: "Определение типовой активности", problem: "Подходящая типовая активность не найдена однозначно.",
    suggestion: "Добавьте или уточните коммерческую типовую активность и повторите разбор.",
  },
  COMMERCIAL_AUTO_FACTS_FEATURE_DISABLED: {
    stage: "Управление автоматической записью", problem: "Автоматическая запись выключена администратором.",
    suggestion: "Это не ошибка разбора. После проверки можно включить запись и повторить обработку.",
  },
  COMMERCIAL_TEMPLATE_UNSUPPORTED_IN_PILOT: {
    stage: "Проверка поддержки исполнителя", problem: "Этот тип объявления пока не поддерживается пилотным исполнителем.",
    suggestion: "Не меняйте онтологию ради этой ошибки — требуется расширение исполнителя.",
  },
  COMMERCIAL_SELLER_NOT_EXACT_LIDL: {
    stage: "Определение торговой сети", problem: "Пилотный исполнитель не распознал Lidl как торговую сеть.",
    suggestion: "Проверьте текст и поддержку этой сети исполнителем.",
  },
  COMMERCIAL_CITY_NOT_UNIQUE: {
    stage: "Определение города", problem: "Город не распознан или распознано несколько городов.",
    suggestion: "Уточните город или правила распознавания, затем повторите обработку.",
  },
  COMMERCIAL_PRICE_BASIS_1KG_UNVERIFIED: {
    stage: "Проверка единицы товара", problem: "Не подтверждено, что цена указана за 1 кг.",
    suggestion: "Уточните единицу товара и правила извлечения.",
  },
  COMMERCIAL_PRODUCT_NOT_EXACT_FILLET: {
    stage: "Определение товара", problem: "Товар не соответствует поддерживаемому пилотом куриному филе.",
    suggestion: "Существование другого ОН не устраняет ограничение пилота: расширьте правила анализа.",
  },
  COMMERCIAL_PRICE_NOT_UNIQUE: {
    stage: "Извлечение цены", problem: "Цена или валюта не найдены однозначно.",
    suggestion: "Проверьте формат цены в публикации.",
  },
  COMMERCIAL_PRICE_INVALID: {
    stage: "Проверка цены", problem: "Извлечённая цена не является допустимым положительным числом.",
    suggestion: "Проверьте исходный текст, валюту и единицу товара.",
  },
  COMMERCIAL_GEO_STORE_OR_PRICE_LEAF_MISSING: {
    stage: "Поиск листовых ОН", problem: "Не найдена однозначная связка города, ветки магазинов или листового ОН цены.",
    suggestion: "Проверьте существующие листовые ОН и их место в системной онтологии.",
  },
  COMMERCIAL_NO_STORE_REPRESENTATIVE: {
    stage: "Выбор магазина", problem: "В городской ветке не найден представитель сети.",
    suggestion: "Проверьте наличие активных листовых магазинов в нужной городской ветке.",
  },
  COMMERCIAL_LEAF_OUTSIDE_PROFILE_BINDINGS: {
    stage: "Проверка маршрутов параметров", problem: "Выбранный листовой ОН не прошёл проверку маршрута типовой активности.",
    suggestion: "Сверьте промежуточные ветки профиля, параметр и выбранный листовой ОН.",
  },
};

export function explainCommercialFailureP2(status: string | null, rawReason: string | null): Explanation & { code: string | null; severity: "waiting" | "review" | "failure" } {
  if (status === "analysis_ready" && !rawReason) return {
    stage: "Ожидание автоматической записи", problem: "Базовый анализ завершён. Факты пока не записаны; это не ошибка.",
    suggestion: "Проверьте положение административного переключателя. После разрешения записи нажмите «Повторно обработать».",
    code: null, severity: "waiting",
  };
  if (!rawReason) return {
    stage: "Разбор коммерческой активности", problem: status === "pending" ? "Обработка выполняется." : "Причина ещё не была записана старым обработчиком.",
    suggestion: "Запустите повторный разбор для получения новой диагностики.",
    code: null, severity: status === "failed" ? "failure" : "review",
  };
  const code = rawReason.split(":", 1)[0].trim();
  const match = reasons[code] ?? (code.startsWith("COMMERCIAL_WRITE_") ? {
    stage: "Запись фактов", problem: "Сервер записи фактов вернул ошибку.",
    suggestion: "Проверьте серверную функцию, права и ограничения базы перед повторной обработкой.",
  } : code.startsWith("COMMERCIAL_RETRY_") ? {
    stage: "Повторная обработка", problem: "Ошибка подготовки повторного разбора.",
    suggestion: "Проверьте наличие исходного события и сигнала.",
  } : {
    stage: "Обработка активности", problem: "Обработчик вернул ошибку, для которой нет описания.",
    suggestion: "Используйте исходный код ошибки и серверные журналы для диагностики.",
  });
  return { ...match, code, severity: status === "failed" ? "failure" : "review" };
}
