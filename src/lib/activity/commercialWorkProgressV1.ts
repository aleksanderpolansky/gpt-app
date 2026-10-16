/** Pure presentation logic for the CURRENT commercial fact pipeline. No data access, no writes. */
export const COMMERCIAL_WORK_PROGRESS_CONTRACT = "ARCTOR_COMMERCIAL_WORK_PROGRESS_V1";
export type WorkStepStatus = "done" | "remaining" | "blocked" | "unverified";
export type WorkStep = { code: string; title: string; status: WorkStepStatus; explanation: string };
export type CommercialWorkProgress = {
  contract: typeof COMMERCIAL_WORK_PROGRESS_CONTRACT;
  summary: string;
  done: number;
  notConfirmedComplete: number;
  counts: {
    extractedMeasurements: number | null;
    profileBindings: number | null;
    preparedValues: number | null;
    valuesFromText: number | null;
    valuesFromTemplateDefaults: number | null;
    preliminaryLeafCandidates: number | null;
    technicalRepresentativesProposed: number | null;
    storedFacts: number | null;
  };
  automaticWriting: "enabled" | "disabled" | "unknown";
  steps: WorkStep[];
};
export type CommercialWorkEvidence = {
  analysisCompleted: boolean;
  extractedMeasurements: number | null;
  templateAssigned: boolean;
  profile: null | {
    bindings: number;
    preparedValues: number;
    valuesFromText: number;
    valuesFromTemplateDefaults: number;
    preliminaryLeafCandidates: number;
    technicalRepresentativesProposed: number;
  };
  profileFailureCode: string | null;
  storedFacts: number | null;
  automaticWriting: "enabled" | "disabled" | "unknown";
};

function profileProblem(code: string | null) {
  switch (code) {
    case "P25_TEMPLATE_NOT_SELECTED": return "Типовая активность ещё не выбрана.";
    case "P25_ACTIVE_COMMERCIAL_TEMPLATE_REQUIRED": return "Назначенная типовая активность не прошла проверку доступности для коммерческих данных.";
    case "P25_MATCHING_COMPLETED_ANALYSIS_REQUIRED": return "Нужно повторно проверить соответствие завершённого анализа выбранной типовой активности.";
    case "P25_ACTIVE_PARAMETER_REGISTRY_PROFILE_REQUIRED": return "Не найден действующий профиль параметров выбранной типовой активности.";
    case "P25_PARAMETERIZED_BINDINGS_NOT_FOUND": return "В профиле пока нет связей параметров с ветвями объектов наблюдения.";
    case "P25_FEED_SIGNAL_NOT_FOUND": return "Не найдена исходная запись анализа для этой активности.";
    case "P25_PROFILE_BINDING_INVALID": return "В действующем профиле обнаружена неправильная привязка параметра к ветви ОН.";
    default: return "Проверка параметров и объектов наблюдения не завершилась; требуется разбор в рабочем кабинете.";
  }
}

export function buildCommercialWorkProgressV1(e: CommercialWorkEvidence): CommercialWorkProgress {
  const steps: WorkStep[] = [];
  const add = (code: string, title: string, status: WorkStepStatus, explanation: string) =>
    steps.push({code,title,status,explanation});
  add("source", "Получить и проверить исходное объявление", "done",
    "Действующая публичная публикация проверена; исходный текст доступен для разбора.");
  add("basic_analysis", "Выполнить базовый анализ текста", e.analysisCompleted ? "done" : "unverified",
    e.analysisCompleted
      ? `Анализ завершён. Из текста извлечено ${e.extractedMeasurements ?? "неустановленное число"} отдельных значений; полнота по профилю проверяется ниже.`
      : "Нет подтверждённого результата завершённого базового анализа.");
  add("template", "Определить подходящую типовую активность", e.templateAssigned ? "done" : "remaining",
    e.templateAssigned
      ? "Типовая активность назначена. Проверка её действующего профиля — отдельный шаг."
      : "Подходящая типовая активность ещё не назначена или требует уточнения.");
  add("profile", "Проверить профиль параметров и маршруты", e.profile ? "done" : "blocked",
    e.profile
      ? `Действующий профиль проверен: ${e.profile.bindings} привязок параметров к ветвям ОН.`
      : profileProblem(e.profileFailureCode));
  if (e.profile) {
    const p = e.profile;
    add("values", "Подготовить значения параметров", p.bindings > 0 && p.preparedValues === p.bindings ? "done" : "remaining",
      `Подготовлено ${p.preparedValues} из ${p.bindings}. Из исходного текста — ${p.valuesFromText}, из утверждённых значений профиля — ${p.valuesFromTemplateDefaults}. Неподготовленные значения требуют уточнения; значение по умолчанию не считается извлечённым из объявления.`);
    add("leaf_objects", "Найти подходящие листовые объекты наблюдения", p.bindings > 0 && p.preliminaryLeafCandidates === p.bindings ? "done" : "remaining",
      `Предварительно найдены объекты для ${p.preliminaryLeafCandidates} из ${p.bindings} ветвей. Технических представителей магазина предложено: ${p.technicalRepresentativesProposed}. Найденный кандидат ещё не означает подтверждённый выбор.`);
  } else {
    add("values", "Подготовить значения параметров", "blocked",
      "Сначала необходимо проверить действующий профиль параметров; полнота извлечения пока неизвестна.");
    add("leaf_objects", "Найти подходящие листовые объекты наблюдения", "blocked",
      "Подбор и проверка листовых ОН невозможны до проверки профиля и маршрутов.");
  }
  add("confirm", "Проверить и подтвердить выбранные ОН и значения",
    e.storedFacts && e.storedFacts > 0 ? "unverified" : "remaining",
    e.storedFacts && e.storedFacts > 0
      ? "Факты уже существуют; по одному их количеству нельзя доказать, каким способом был подтверждён выбор. Требуется проверить происхождение записей."
      : "Администратор должен проверить значения, листовые ОН и возможных технических представителей перед подтверждением. Запись пока не подтверждена.");
  add("write", "Записать факты", e.storedFacts === null ? "unverified" : e.storedFacts > 0 ? "done" : "remaining",
    e.storedFacts === null
      ? "Не удалось подтвердить текущее количество записанных фактов."
      : e.storedFacts > 0
        ? `В базе найдено ${e.storedFacts} действующих фактов. Полноту и связь с ожидаемыми параметрами надо проверить отдельно.`
        : "Действующих записанных фактов пока нет. Запись производится только через предусмотренный серверный исполнитель после необходимых проверок.");
  add("verification", "Проверить результат записи и полноту фактов", e.storedFacts === 0 ? "remaining" : "unverified",
    e.storedFacts === 0
      ? "После записи нужно повторно прочитать факты и убедиться, что каждый подтверждённый параметр сохранён корректно."
      : "Сопоставление сохранённых фактов с полным набором параметров пока не подтверждено этой проверкой.");
  const done = steps.filter(s => s.status === "done").length;
  let summary = e.analysisCompleted
    ? "Базовый анализ завершён."
    : "Завершение базового анализа пока не подтверждено.";
  if (e.profile) {
    summary += ` Для действующего профиля подготовлено ${e.profile.preparedValues} из ${e.profile.bindings} значений; предварительно найдены ОН для ${e.profile.preliminaryLeafCandidates} из ${e.profile.bindings} ветвей.`;
    if (e.profile.bindings > 0 && e.profile.preparedValues === e.profile.bindings &&
        e.profile.valuesFromText === e.profile.bindings) {
      summary += " Значения всех параметров действующего профиля получены из исходного текста.";
    }
  } else {
    summary += " Полнота значений и подбор ОН пока не подтверждены.";
  }
  if (e.storedFacts === 0) summary += " Факты ещё не записаны; это не обязательно ошибка.";
  else if (e.storedFacts !== null) summary += ` Сейчас в базе ${e.storedFacts} действующих фактов; требуется проверка полноты.`;
  if (e.automaticWriting === "disabled") {
    summary += " Автоматическая запись отключена администратором; путь ручной проверки и подтверждения остаётся отдельным.";
  }
  return {
    contract: COMMERCIAL_WORK_PROGRESS_CONTRACT,
    summary,
    done, notConfirmedComplete: steps.length - done,
    counts: {
      extractedMeasurements: e.extractedMeasurements,
      profileBindings: e.profile?.bindings ?? null,
      preparedValues: e.profile?.preparedValues ?? null,
      valuesFromText: e.profile?.valuesFromText ?? null,
      valuesFromTemplateDefaults: e.profile?.valuesFromTemplateDefaults ?? null,
      preliminaryLeafCandidates: e.profile?.preliminaryLeafCandidates ?? null,
      technicalRepresentativesProposed: e.profile?.technicalRepresentativesProposed ?? null,
      storedFacts: e.storedFacts,
    },
    automaticWriting: e.automaticWriting,
    steps,
  };
}
