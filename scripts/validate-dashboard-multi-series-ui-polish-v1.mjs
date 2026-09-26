import fs from "node:fs";

const builder = fs.readFileSync(
  "src/components/figma-dashboard/dashboard-analytics-builder.tsx",
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

check("title helper exists", builder.includes("function multiSeriesBlockTitle("));
check("title uses ON names", builder.includes("item.valueObjectTitle.trim()"));
check("title deduplicates ON names", builder.includes("valueObjectTitles = Array.from"));
check("title shows first three ON names", builder.includes("valueObjectTitles.slice(0, 3)"));
check("title has compact overflow count", builder.includes("valueObjectTitles.length - visibleTitles.length"));
check("generic title follows current locale", builder.includes("MULTI_SERIES_GENERIC_TITLES.has(blockTitle)"));
check("card uses derived multi-series title", builder.includes("multiSeriesBlockTitle(") && builder.includes("data?.factSeries ?? []"));
check(
  "explanatory paragraph is not rendered in multi-series card",
  !/<div className="mb-2 text-\[10px\] leading-4 text-\[#7c8099\]">\s*\{MULTI_SERIES_COPY\[locale\]\.independentScaleDescription\}\s*<\/div>\s*<div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">/u.test(
    builder,
  ),
);
check(
  "band heading has larger gap",
  builder.includes('className="mb-3 text-[10px] font-semibold text-[#6f7488]"'),
);
check("shared X stays bottom-only", builder.includes("hide={!isBottomBand}") && builder.includes("height={isBottomBand ? 28 : 0}"));
check("unit band divider retained", builder.includes('border-t border-[#eef0f6]'));
check("timeline sync retained", builder.includes('syncMethod="index"') && builder.includes('syncId={"dashboard-unit-bands-" + block.id}'));
check("custom legend retained", builder.includes("multiSeriesDisplayName(series, locale)"));
check("no unicode replacement chars", !builder.includes("�"));

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${total}`);
}
