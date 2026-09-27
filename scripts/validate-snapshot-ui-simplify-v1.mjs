import fs from "node:fs";

const page = fs.readFileSync(
  "src/app/activity-facts/snapshot/page.tsx",
  "utf8",
);
const route = fs.readFileSync(
  "src/app/api/activity/facts/snapshots/route.ts",
  "utf8",
);

const checks = [
  [
    "single visible state-leaf picker exists",
    page.includes('id="snapshot-state-leaf-search"') &&
      page.includes('aria-controls="snapshot-state-leaf-options"'),
  ],
  [
    "legacy assignment picker is removed from visible UI",
    !page.includes('id="snapshot-target-search"') &&
      !page.includes("selectionCopy.allStateLeaves") &&
      !page.includes("selectionCopy.hideAllStateLeaves"),
  ],
  [
    "duplicated direct-mode heading and hint are not rendered",
    !page.includes("selectionCopy.directTitle") &&
      !page.includes("selectionCopy.directHint"),
  ],
  [
    "parameter selector follows selected leaf",
    page.includes("directParameterDefinitionId") &&
      page.includes("selectionCopy.parameterLabel") &&
      page.includes("disabled={!directValueObjectId}"),
  ],
  [
    "leaf picker searches all state leaves returned by catalog",
    page.includes("filteredStateLeaves") &&
      page.includes("stateLeaves.filter") &&
      page.includes("source.slice(0, 150)"),
  ],
  [
    "keyboard-accessible leaf combobox remains",
    page.includes('event.key === "ArrowDown"') &&
      page.includes('event.key === "ArrowUp"') &&
      page.includes('event.key === "Enter"') &&
      page.includes('event.key === "Escape"'),
  ],
  [
    "personal snapshot remains leaf plus parameter plus optional assignment",
    page.includes("const effectiveSelection = directSelectionReady") &&
      page.includes('assignmentId: directAssignment?.assignmentId ?? ""'),
  ],
  [
    "existing system assignment is reused automatically when present",
    page.includes("const directAssignment = useMemo") &&
      route.includes("SNAPSHOT_CAPTURE_ASSIGNMENT_RESOLUTION_FAILED"),
  ],
  [
    "system assignment action is not exposed in snapshot UI",
    !page.includes("materializeDirectAssignment") &&
      !page.includes('action: "materialize_system_assignment"'),
  ],
  [
    "backend admin materializer remains available outside snapshot UI",
    route.includes('if (action === "materialize_system_assignment")') &&
      route.includes("requirePlatformAdmin") &&
      route.includes("materializeSystemParameterAssignmentsV1"),
  ],
  [
    "direct snapshot still sends leaf and parameter ids",
    page.includes("valueObjectId: effectiveSelection.valueObjectId") &&
      page.includes(
        "parameterDefinitionId:\n            effectiveSelection.parameterDefinitionId",
      ),
  ],
  [
    "backend still accepts snapshot without assignment id",
    route.includes("(assignmentId && !UUID_RE.test(assignmentId))") &&
      route.includes("assignment?.id ?? null"),
  ],
  [
    "visible copy no longer says assignment is required",
    !page.includes(
      "A snapshot stores a user-reported state value at a specific moment using the existing system parameter assignment.",
    ) &&
      !page.includes(
        "Срез сохраняет сообщённое пользователем значение состояния на конкретный момент через существующее системное назначение параметра.",
      ),
  ],
  [
    "all seven locale blocks remain",
    ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) =>
      page.includes(`${locale}: {`),
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
