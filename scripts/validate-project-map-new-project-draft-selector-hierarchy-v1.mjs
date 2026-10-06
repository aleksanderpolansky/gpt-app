import fs from "node:fs";
import { execFileSync } from "node:child_process";

const mapPath = "src/app/projects/ProjectMapStartClient.tsx";
const map = fs.readFileSync(mapPath, "utf8");

let pass = 0;
let fail = 0;

function check(name, condition) {
  if (condition) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}`);
  }
}

check(
  "STRUCTURED_DRAFT_CENTER_VISIBLE",
  map.includes("if (!selectedProject) {") &&
    map.includes("if (!creating || !rootSource) return [];") &&
    map.includes('semanticLevel: "detail"'),
);

check(
  "STRUCTURED_DRAFT_HAS_NO_DANGLING_EDGES",
  map.includes("selectedProject && structuredMetrics") &&
    map.includes(": [];"),
);

check(
  "FREE_DRAFT_PATH_PRESERVED",
  map.includes('id: "__project_center__"') &&
    map.includes("if (!selectedProject) {") &&
    map.includes("return result;"),
);

check(
  "PROJECT_SELECTOR_HIERARCHY_HELPER",
  map.includes("function projectSelectHierarchy(projects: ProjectItem[])") &&
    map.includes("childrenByParent") &&
    map.includes("visited.add(project.id)") &&
    map.includes("visit(child, depth + 1)"),
);

check(
  "PROJECT_SELECTOR_HIERARCHY_RENDER",
  map.includes("projectSelectItems.map(({ project, depth }) =>") &&
    map.includes('"↳ "') &&
    map.includes('"\\u00A0\\u00A0\\u00A0".repeat(depth)'),
);

check(
  "SUBPROJECT_SELECTION_REMAINS_VALID",
  map.includes('<option key={project.id} value={project.id}>') &&
    !map.includes("projects.filter((project) => (project.parentProjectIds"),
);

const apiDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "src/app/api"],
  { encoding: "utf8" },
).trim();

check("API_CHANGE_NONE", apiDiff === "");

const dbDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "supabase", "migrations"],
  { encoding: "utf8" },
).trim();

check("DB_MIGRATION_NONE", dbDiff === "");

const packageDiff = execFileSync(
  "git",
  ["diff", "--name-only", "HEAD", "--", "package.json", "package-lock.json"],
  { encoding: "utf8" },
).trim();

check("DEPENDENCY_CHANGE_NONE", packageDiff === "");

const mapDiff = execFileSync(
  "git",
  ["diff", "--unified=0", "HEAD", "--", mapPath],
  { encoding: "utf8" },
);

const addedMapLines = mapDiff
  .split(/\r?\n/)
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .map((line) => line.slice(1));

const ontologyMutationTokens = [
  "parent_value_object_id",
  "rootValueObjectId:",
  '/api/projects/subprojects',
  '/api/value-objects',
  'value_objects',
];

check(
  "ONTOLOGY_MUTATION_NONE",
  !addedMapLines.some((line) =>
    ontologyMutationTokens.some((token) => line.includes(token)),
  ),
);

console.log(
  `PROJECT_MAP_NEW_PROJECT_DRAFT_SELECTOR_HIERARCHY_V1_VALIDATOR=PASS_${pass}/${pass + fail}`,
);

if (fail > 0) process.exit(1);
