import fs from "node:fs";

const path = "src/app/projects/ProjectMapStartClient.tsx";
if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);

const source = fs.readFileSync(path, "utf8");
const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

check(
  "REACTFLOW_POINTER_INTERACTION_ENABLED",
  source.includes("onNodeClick={() => undefined}"),
);

check(
  "TITLE_INPUT_NODRAG_NOPAN_NOWHEEL",
  /className="nodrag nopan nowheel w-full rounded-\[18px\]/.test(source),
);

check(
  "LEAF_INPUT_NODRAG_NOPAN_NOWHEEL",
  /className="nodrag nopan nowheel min-w-0 flex-1 bg-transparent/.test(source),
);

check(
  "LEAF_TOGGLE_NODRAG_NOPAN",
  /className="nodrag nopan flex h-6 w-6/.test(source),
);

check(
  "LEAF_OPTION_NODRAG_NOPAN",
  /className="nodrag nopan flex w-full items-start gap-2/.test(source),
);

check(
  "NODE_STILL_NOT_DRAGGABLE",
  source.includes("nodesDraggable={false}") &&
    source.includes("draggable: false"),
);

check(
  "NODE_STILL_NOT_SELECTABLE",
  source.includes("elementsSelectable={false}") &&
    source.includes("selectable: false"),
);

check(
  "PERSISTENCE_UNCHANGED",
  source.includes('fetch("/api/projects"') &&
    source.includes("title: normalizedTitle") &&
    source.includes("rootValueObjectId: selectedRootId"),
);

check(
  "ONE_CENTER_NODE_ONLY",
  source.includes('id: "__project_center__"') &&
    !source.includes("project-block:"),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
