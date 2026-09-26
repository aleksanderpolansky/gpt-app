export type DashboardMeasurementUnitFamily =
  | "duration"
  | "mass"
  | "distance"
  | "volume"
  | "count"
  | "presence"
  | `unit:${string}`;

type UnitSpec = {
  readonly family: Exclude<
    DashboardMeasurementUnitFamily,
    `unit:${string}`
  >;
  readonly preferredUnit: string;
  readonly factorToPreferred: number;
};

const UNIT_SPECS: Readonly<Record<string, UnitSpec>> = {
  second: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 / 60 },
  seconds: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 / 60 },
  sec: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 / 60 },
  minute: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 },
  minutes: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 },
  min: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 },
  hour: { family: "duration", preferredUnit: "minute", factorToPreferred: 60 },
  hours: { family: "duration", preferredUnit: "minute", factorToPreferred: 60 },
  hr: { family: "duration", preferredUnit: "minute", factorToPreferred: 60 },
  day: { family: "duration", preferredUnit: "minute", factorToPreferred: 1440 },
  days: { family: "duration", preferredUnit: "minute", factorToPreferred: 1440 },

  milligram: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.000001 },
  milligrams: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.000001 },
  mg: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.000001 },
  gram: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.001 },
  grams: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.001 },
  g: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 0.001 },
  kilogram: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 1 },
  kilograms: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 1 },
  kg: { family: "mass", preferredUnit: "kilogram", factorToPreferred: 1 },

  millimeter: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.001 },
  millimeters: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.001 },
  mm: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.001 },
  centimeter: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.01 },
  centimeters: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.01 },
  cm: { family: "distance", preferredUnit: "meter", factorToPreferred: 0.01 },
  meter: { family: "distance", preferredUnit: "meter", factorToPreferred: 1 },
  meters: { family: "distance", preferredUnit: "meter", factorToPreferred: 1 },
  m: { family: "distance", preferredUnit: "meter", factorToPreferred: 1 },
  kilometer: { family: "distance", preferredUnit: "meter", factorToPreferred: 1000 },
  kilometers: { family: "distance", preferredUnit: "meter", factorToPreferred: 1000 },
  km: { family: "distance", preferredUnit: "meter", factorToPreferred: 1000 },

  milliliter: { family: "volume", preferredUnit: "liter", factorToPreferred: 0.001 },
  milliliters: { family: "volume", preferredUnit: "liter", factorToPreferred: 0.001 },
  ml: { family: "volume", preferredUnit: "liter", factorToPreferred: 0.001 },
  liter: { family: "volume", preferredUnit: "liter", factorToPreferred: 1 },
  liters: { family: "volume", preferredUnit: "liter", factorToPreferred: 1 },
  litre: { family: "volume", preferredUnit: "liter", factorToPreferred: 1 },
  l: { family: "volume", preferredUnit: "liter", factorToPreferred: 1 },

  count: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  counts: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  piece: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  pieces: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  occurrence: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  occurrences: { family: "count", preferredUnit: "count", factorToPreferred: 1 },
  times: { family: "count", preferredUnit: "count", factorToPreferred: 1 },

  presence: { family: "presence", preferredUnit: "presence", factorToPreferred: 1 },
};

export function normalizeDashboardMeasurementUnitCode(
  unit: string | null | undefined,
): string {
  return typeof unit === "string" ? unit.trim().toLowerCase() : "";
}

export function dashboardMeasurementUnitFamily(
  unit: string | null | undefined,
): DashboardMeasurementUnitFamily {
  const normalized = normalizeDashboardMeasurementUnitCode(unit);
  if (!normalized) return "unit:unknown";
  return UNIT_SPECS[normalized]?.family ?? `unit:${normalized}`;
}

export function dashboardPreferredMeasurementUnit(
  unit: string | null | undefined,
): string {
  const normalized = normalizeDashboardMeasurementUnitCode(unit);
  if (!normalized) return "";
  return UNIT_SPECS[normalized]?.preferredUnit ?? normalized;
}

export function convertDashboardMeasurementValue(
  value: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  if (!Number.isFinite(value)) return null;

  const from = normalizeDashboardMeasurementUnitCode(fromUnit);
  const to = normalizeDashboardMeasurementUnitCode(toUnit);

  if (!from || !to) return null;
  if (from === to) return value;

  const fromSpec = UNIT_SPECS[from];
  const toSpec = UNIT_SPECS[to];

  if (!fromSpec || !toSpec || fromSpec.family !== toSpec.family) {
    return null;
  }

  const preferredValue = value * fromSpec.factorToPreferred;
  const converted = preferredValue / toSpec.factorToPreferred;

  return Number.isFinite(converted) ? converted : null;
}
