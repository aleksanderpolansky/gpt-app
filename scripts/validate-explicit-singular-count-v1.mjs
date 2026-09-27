import fs from "node:fs";

const analyzer = fs.readFileSync(
  "src/lib/activity/activity-basic-intake-analysis.server.ts",
  "utf8",
);

const compact = (value) => value.replace(/\s+/g, " ").trim();

const checks = [
  [
    "explicit singular count helper exists",
    analyzer.includes("function extractExplicitSingularCountFragment"),
  ],
  [
    "singular detector uses unicode-safe boundaries",
    analyzer.includes('(?:^|[^\\p{L}\\p{N}_])') &&
      analyzer.includes('(?=$|[^\\p{L}\\p{N}_])'),
  ],
  [
    "Russian coffee cup marker is supported",
    analyzer.includes("чашка|чашку") &&
      analyzer.includes("кружка|кружку") &&
      analyzer.includes("стакан"),
  ],
  [
    "common Russian singular items are supported",
    ["таблетка|таблетку", "сигарета|сигарету", "яблоко"].every((needle) =>
      analyzer.includes(needle),
    ),
  ],
  [
    "platform-language singular markers are present",
    [
      "filiżanka|filiżankę",
      "(?:a|an|one)",
      "(?:eine|einen|ein)",
      "(?:una|un)",
      "šálek|salek",
    ].every((needle) => analyzer.includes(needle)),
  ],
  [
    "detector is conservative when multiple singular markers are present",
    compact(analyzer).includes(
      "return matches.length === 1 ? matches[0] : null;",
    ),
  ],
  [
    "deterministic singular count writes one count",
    analyzer.includes("const singularCountFragment") &&
      compact(analyzer).includes('parameterCode: "count"') &&
      compact(analyzer).includes('measureType: "count"') &&
      compact(analyzer).includes('unit: "count"') &&
      compact(analyzer).includes("valueNumeric: 1"),
  ],
  [
    "deterministic singular count is unqualified for default route",
    compact(analyzer).includes(
      "qualifier: null, rawFragment: singularCountFragment, confidence: 1",
    ),
  ],
  [
    "model prompt treats grammatical singular as explicit count one",
    analyzer.includes(
      "A grammatically explicit singular countable item may itself encode count=1",
    ) &&
      analyzer.includes('"выпил чашку кофе"') &&
      analyzer.includes('"drank a cup of coffee"'),
  ],
  [
    "model prompt forbids bare coffee count inference",
    analyzer.includes(
      'Do NOT infer count=1 from a bare substance or activity with no singular countable item',
    ) &&
      analyzer.includes('"выпил кофе"') &&
      analyzer.includes('"drank coffee"'),
  ],
  [
    "model prompt avoids ambiguous multiple singular-item synthesis",
    analyzer.includes(
      "If several distinct singular countable items are present, do not synthesize an unqualified count=1",
    ),
  ],
  [
    "existing explicit evidence fragment gate remains",
    analyzer.includes(
      "normalizedSource.includes(rawFragment.toLocaleLowerCase())",
    ),
  ],
];

let passed = 0;

for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS ${label}`);
  }
}

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${checks.length}`);
}
