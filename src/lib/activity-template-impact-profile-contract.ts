export const ACTIVITY_PROFILE_PARAMETER_CODES = [
  "process_count",
  "repetition_count",
  "distance_m",
  "duration_seconds",
] as const;

export type ActivityProfileParameterCode =
  (typeof ACTIVITY_PROFILE_PARAMETER_CODES)[number];

export const ACTIVITY_PROFILE_RELATION_CODES = [
  "affects",
  "uses",
  "supports",
  "inhibits",
  "observes",
] as const;

export type ActivityProfileRelationCode =
  (typeof ACTIVITY_PROFILE_RELATION_CODES)[number];

export const ACTIVITY_PROFILE_AGGREGATION_CODES = [
  "copy",
  "count",
  "sum",
  "max",
  "min",
  "avg",
] as const;

export type ActivityProfileAggregationCode =
  (typeof ACTIVITY_PROFILE_AGGREGATION_CODES)[number];

export type ActivityProfileParameterInput = {
  parameterCode: ActivityProfileParameterCode;
  title: string;
  unitCode: string | null;
  isRequired: boolean;
  displayOrder: number;
};

export type ActivityProfileRouteInput = {
  sourceParameterCode: ActivityProfileParameterCode;
  targetParameterCode: string;
  aggregationCode: ActivityProfileAggregationCode;
};

export type ActivityProfileObjectLinkInput = {
  targetValueObjectId: string;
  relationCode: ActivityProfileRelationCode;
  confidence: number;
  notes: string;
  routes: ActivityProfileRouteInput[];
};

export type ActivityTemplateImpactProfileInput = {
  title: string;
  description: string;
  templateGroup: string;
  defaultDurationMinutes: number | null;
  notes: string;
  parameters: ActivityProfileParameterInput[];
  links: ActivityProfileObjectLinkInput[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARAMETER_RE = /^[a-z][a-z0-9_]{0,79}$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isParameterCode(value: string): value is ActivityProfileParameterCode {
  return (ACTIVITY_PROFILE_PARAMETER_CODES as readonly string[]).includes(value);
}

function isRelationCode(value: string): value is ActivityProfileRelationCode {
  return (ACTIVITY_PROFILE_RELATION_CODES as readonly string[]).includes(value);
}

function isAggregationCode(
  value: string,
): value is ActivityProfileAggregationCode {
  return (ACTIVITY_PROFILE_AGGREGATION_CODES as readonly string[]).includes(
    value,
  );
}

export function normalizeActivityTemplateImpactProfileInput(
  value: unknown,
): ActivityTemplateImpactProfileInput {
  const source = asRecord(value);
  const title = text(source.title, 180);
  if (!title) {
    throw new Error("Название типовой активности обязательно.");
  }

  const rawDuration =
    source.defaultDurationMinutes === null ||
    source.defaultDurationMinutes === undefined ||
    source.defaultDurationMinutes === ""
      ? null
      : finiteNumber(source.defaultDurationMinutes);

  if (
    rawDuration !== null &&
    (!Number.isInteger(rawDuration) || rawDuration < 0 || rawDuration > 525600)
  ) {
    throw new Error("Длительность должна быть целым числом минут от 0 до 525600.");
  }

  const rawParameters = Array.isArray(source.parameters) ? source.parameters : [];
  const parameterMap = new Map<
    ActivityProfileParameterCode,
    ActivityProfileParameterInput
  >();

  parameterMap.set("process_count", {
    parameterCode: "process_count",
    title: "Количество процессов",
    unitCode: "process",
    isRequired: true,
    displayOrder: 10,
  });

  for (const [index, item] of rawParameters.entries()) {
    const row = asRecord(item);
    const parameterCode = text(row.parameterCode, 80).toLowerCase();
    if (!isParameterCode(parameterCode)) {
      throw new Error(`Неизвестный параметр события в строке ${index + 1}.`);
    }
    if (parameterCode === "process_count") {
      continue;
    }

    parameterMap.set(parameterCode, {
      parameterCode,
      title: text(row.title, 180) || parameterCode,
      unitCode: text(row.unitCode, 40) || null,
      isRequired: row.isRequired === true,
      displayOrder:
        Math.trunc(finiteNumber(row.displayOrder) ?? 100) || 100,
    });
  }

  const enabledParameters = new Set(parameterMap.keys());
  const rawLinks = Array.isArray(source.links) ? source.links : [];
  if (rawLinks.length > 500) {
    throw new Error("В одном профиле допускается не более 500 связанных ЦО/ОН.");
  }

  const seenTargets = new Set<string>();
  const links: ActivityProfileObjectLinkInput[] = rawLinks.map((item, index) => {
    const row = asRecord(item);
    const targetValueObjectId = text(row.targetValueObjectId, 64);
    if (!UUID_RE.test(targetValueObjectId)) {
      throw new Error(`Некорректный ID ЦО/ОН в строке ${index + 1}.`);
    }
    if (seenTargets.has(targetValueObjectId)) {
      throw new Error(`Один ЦО/ОН добавлен в профиль дважды: ${targetValueObjectId}.`);
    }
    seenTargets.add(targetValueObjectId);

    const relationCodeText = text(row.relationCode, 40).toLowerCase() || "affects";
    if (!isRelationCode(relationCodeText)) {
      throw new Error(`Некорректная связь для ЦО/ОН в строке ${index + 1}.`);
    }

    const confidence = finiteNumber(row.confidence) ?? 1;
    if (confidence < 0 || confidence > 1) {
      throw new Error(`Уверенность должна быть от 0 до 1 в строке ${index + 1}.`);
    }

    const rawRoutes = Array.isArray(row.routes) ? row.routes : [];
    if (rawRoutes.length > 40) {
      throw new Error(`Слишком много правил параметров у ЦО/ОН в строке ${index + 1}.`);
    }

    const routeKeys = new Set<string>();
    const routes: ActivityProfileRouteInput[] = rawRoutes.map((routeItem, routeIndex) => {
      const route = asRecord(routeItem);
      const sourceParameterCode = text(route.sourceParameterCode, 80).toLowerCase();
      if (!isParameterCode(sourceParameterCode)) {
        throw new Error(
          `Неизвестный исходный параметр в правиле ${routeIndex + 1}, строка ${index + 1}.`,
        );
      }
      if (!enabledParameters.has(sourceParameterCode)) {
        throw new Error(
          `Параметр ${sourceParameterCode} не включён в типовой активности.`,
        );
      }

      const targetParameterCode = text(route.targetParameterCode, 80).toLowerCase();
      if (!PARAMETER_RE.test(targetParameterCode)) {
        throw new Error(
          `Некорректный код параметра ЦО/ОН в правиле ${routeIndex + 1}, строка ${index + 1}.`,
        );
      }

      const aggregationCode = text(route.aggregationCode, 20).toLowerCase();
      if (!isAggregationCode(aggregationCode)) {
        throw new Error(
          `Некорректный способ подсчёта в правиле ${routeIndex + 1}, строка ${index + 1}.`,
        );
      }

      const key = `${sourceParameterCode}|${targetParameterCode}`;
      if (routeKeys.has(key)) {
        throw new Error(`Дублирующее правило параметров у ЦО/ОН в строке ${index + 1}.`);
      }
      routeKeys.add(key);

      return {
        sourceParameterCode,
        targetParameterCode,
        aggregationCode,
      };
    });

    if (
      !routes.some(
        (route) =>
          route.sourceParameterCode === "process_count" &&
          route.targetParameterCode === "process_count",
      )
    ) {
      routes.unshift({
        sourceParameterCode: "process_count",
        targetParameterCode: "process_count",
        aggregationCode: "count",
      });
    }

    return {
      targetValueObjectId,
      relationCode: relationCodeText,
      confidence,
      notes: text(row.notes, 1000),
      routes,
    };
  });

  return {
    title,
    description: text(source.description, 4000),
    templateGroup: text(source.templateGroup, 80) || "general",
    defaultDurationMinutes: rawDuration,
    notes: text(source.notes, 4000),
    parameters: [...parameterMap.values()].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    ),
    links,
  };
}
