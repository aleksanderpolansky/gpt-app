import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`FILE_MISSING:${rel}`);
  return fs.readFileSync(full, "utf8");
}

function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  checks.push(label);
  process.stdout.write(`PASS ${label}\n`);
}

const units = read("src/lib/dashboard/measurement-unit-normalization.ts");
const data = read("src/app/api/dashboard/analytics-data/route.ts");
const builder = read("src/components/figma-dashboard/dashboard-analytics-builder.tsx");

check("unit helper exposes family resolver", units.includes("dashboardMeasurementUnitFamily"));
check("unit helper exposes preferred unit resolver", units.includes("dashboardPreferredMeasurementUnit"));
check("unit helper exposes converter", units.includes("convertDashboardMeasurementValue"));
check("hour converts through minute family", units.includes('hour: { family: "duration", preferredUnit: "minute", factorToPreferred: 60 }'));
check("minute remains preferred duration unit", units.includes('minute: { family: "duration", preferredUnit: "minute", factorToPreferred: 1 }'));
check("mass has kilogram preferred unit", units.includes('preferredUnit: "kilogram"'));
check("distance has meter preferred unit", units.includes('preferredUnit: "meter"'));
check("volume has liter preferred unit", units.includes('preferredUnit: "liter"'));
check("count family remains count", units.includes('family: "count"'));

check("data route imports unit converter", data.includes("convertDashboardMeasurementValue"));
check("data route imports unit family", data.includes("dashboardMeasurementUnitFamily"));
check("data route imports preferred unit", data.includes("dashboardPreferredMeasurementUnit"));
check("direct facts convert compatible units", data.includes("normalizedValue = convertDashboardMeasurementValue"));
check("direct compatible conversion feeds bucket", data.includes("addResolvedValue(date, normalizedValue)"));
check("rollup facts normalize compatible units", data.includes("normalizedRollupValue"));
check("rollup keeps incompatible unit fail closed", data.includes("normalizedRollupValue ?? valueNumber"));
check("unit conversions are counted", data.includes("unitConversionCount"));
check("localization passes metadata json", data.includes("metadata_json: valueObject.metadata_json"));
check("multi-series emits unit family", data.includes("unitFamily,"));
check("multi-series normalizes to preferred band unit", data.includes("preferredUnit"));
check("multi-series emits unit-band layout", data.includes('layoutMode: "unit_bands"'));

check("builder understands unit family", builder.includes("unitFamily?: string"));
check("builder builds unit bands", builder.includes("const multiSeriesBands = useMemo"));
check("builder uses one band per unit family", builder.includes("dashboardMeasurementUnitFamily(series.unit)"));
check("builder has common recharts sync id", builder.includes('syncId={"dashboard-unit-bands-" + block.id}'));
check("builder uses index synchronization", builder.includes('syncMethod="index"'));
check("builder renders x axis only on bottom band", builder.includes("hide={!isBottomBand}"));
check("builder gives upper x axes zero height", builder.includes("height={isBottomBand ? 28 : 0}"));
check("builder renders visible Y axis per band", builder.includes("ticks={band.ticks}"));
check("builder leaves divider between bands", builder.includes("border-t border-[#eef0f6]"));
check("builder keeps shared date rows", builder.includes('dataKey="label"'));
check("builder uses one custom legend across all bands", builder.includes("multiSeriesDisplayName(series, locale)"));
check("builder no longer renders one hidden y axis per series", !builder.includes('yAxisId={`series-${index}`}'));
check("builder grouped copy explains common X", builder.includes("общая ось X"));
check("builder duration band uses minute ticks", builder.includes('family === "duration" && unit === "minute"'));
check("builder count band uses integer ticks", builder.includes('family === "count"'));

process.stdout.write(`VALIDATOR=PASS_${checks.length}_${checks.length}\n`);
