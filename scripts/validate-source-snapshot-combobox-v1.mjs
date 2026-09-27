import fs from "node:fs";

const ui = fs.readFileSync(
  "src/app/activity-templates/source-snapshot-settings.tsx",
  "utf8",
);

const checks = [
  [
    "separate state-search input is removed",
    !ui.includes('aria-label={ru ? "Поиск состояния" : "Find state"}') &&
      !ui.includes('placeholder={ru ? "Поиск состояния…" : "Find state…"}'),
  ],
  [
    "single source snapshot combobox exists",
    ui.includes('id="source-snapshot-state-combobox"') &&
      ui.includes('role="combobox"') &&
      ui.includes('aria-controls="source-snapshot-state-options"'),
  ],
  [
    "combobox filters state leaf titles",
    ui.includes("option.valueObjectTitle.toLocaleLowerCase().includes(normalizedQuery)") &&
      ui.includes("visible.length"),
  ],
  [
    "combobox supports keyboard navigation",
    ui.includes('event.key === "ArrowDown"') &&
      ui.includes('event.key === "ArrowUp"') &&
      ui.includes('event.key === "Enter"') &&
      ui.includes('event.key === "Escape"'),
  ],
  [
    "combobox selection writes snapshot value object id",
    ui.includes("snapshotValueObjectId: option.valueObjectId"),
  ],
  [
    "typing away from selected title clears stale source id",
    ui.includes("nextQuery !== selectedOption?.valueObjectTitle") &&
      ui.includes("snapshotValueObjectId: undefined"),
  ],
  [
    "selected source title is displayed in the same field",
    ui.includes('const inputValue = query || selectedOption?.valueObjectTitle || "";'),
  ],
  [
    "source catalog remains assignment-independent",
    ui.includes("body.stateLeaves") &&
      !ui.includes("body.options as Option[]"),
  ],
  [
    "old source select is removed",
    !ui.includes('<select required className="mt-1 w-full rounded border p-2 text-sm" value={value?.snapshotValueObjectId ?? ""}'),
  ],
  [
    "multiplier and runtime snapshot semantics remain",
    ui.includes("current.multiplier") &&
      ui.includes("Системное назначение ОН ↔ параметр не требуется"),
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
