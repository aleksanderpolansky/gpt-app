import fs from "node:fs";

const analytics = fs.readFileSync(
  "src/app/api/dashboard/analytics-data/route.ts",
  "utf8",
);
const builder = fs.readFileSync(
  "src/components/figma-dashboard/dashboard-analytics-builder.tsx",
  "utf8",
);
const presentation = fs.readFileSync(
  "src/lib/activity/activity-parameter-presentation.ts",
  "utf8",
);

let total = 0;
let passed = 0;

function check(label, condition) {
  total += 1;
  if (!condition) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`PASS ${label}`);
}

check(
  "analytics imports shared parameter presentation",
  analytics.includes(
    'import { getActivityParameterPresentation } from "@/lib/activity/activity-parameter-presentation";',
  ),
);

check(
  "analytics derives localized parameter title",
  analytics.includes(
    "const parameterTitle = getActivityParameterPresentation(",
  ),
);

check(
  "analytics localizes by parameter code",
  /getActivityParameterPresentation\(\s*parameterCode,\s*input\.locale,\s*parameterFallbackTitle,\s*null,\s*\)\.title/u.test(
    analytics,
  ),
);

check(
  "analytics keeps raw title only as fallback",
  analytics.includes("const parameterFallbackTitle =") &&
    analytics.includes("asString(definitionRow.title)") &&
    analytics.includes("input.config.parameterTitle"),
);

check(
  "shared presentation supports seven locales",
  presentation.includes(
    'export type ActivityParameterLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";',
  ),
);

check(
  "shared presentation localizes count",
  presentation.includes('"count": {') &&
    presentation.includes('pl: "Liczba"') &&
    presentation.includes('de: "Anzahl"'),
);

check(
  "shared presentation localizes duration",
  presentation.includes('"duration": {') &&
    presentation.includes('pl: "Czas trwania"') &&
    presentation.includes('de: "Dauer"'),
);

check(
  "small explicit Y tick sets are all rendered",
  builder.includes("band.ticks.length <= 8") &&
    builder.includes('? 0') &&
    builder.includes(': "preserveStartEnd"'),
);

check(
  "unit-band Y axis still uses explicit ticks",
  builder.includes("ticks={band.ticks}"),
);

check(
  "duration minute scale still builds regular candidates",
  builder.includes(
    "const candidates = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 720];",
  ),
);

check(
  "shared X axis remains bottom-only",
  builder.includes("hide={!isBottomBand}") &&
    builder.includes("height={isBottomBand ? 28 : 0}"),
);

check(
  "unit-band timeline sync remains",
  builder.includes('syncMethod="index"') &&
    builder.includes('syncId={"dashboard-unit-bands-" + block.id}'),
);

check(
  "legend still uses API parameter title",
  builder.includes(
    "series.parameterTitle ?? series.parameterCode ?? FACT_SERIES_COPY[locale].summary",
  ),
);

check(
  "band title still uses parameter title",
  builder.includes("firstSeries.parameterTitle ??") &&
    builder.includes("firstSeries.parameterCode ??"),
);

check(
  "no unicode replacement characters",
  !analytics.includes("�") && !builder.includes("�"),
);

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${total}`);
}
