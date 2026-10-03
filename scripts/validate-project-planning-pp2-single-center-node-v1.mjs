import fs from "node:fs";

const files = {
  client: "src/app/projects/ProjectMapStartClient.tsx",
  api: "src/app/api/projects/route.ts",
  nav: "src/i18n/messages/navigation.ts",
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

check(
  "ONE_REACTFLOW_CENTER_NODE",
  source.client.includes("ReactFlowProvider") &&
    source.client.includes("BackgroundVariant.Dots") &&
    source.client.includes('id: "__project_center__"') &&
    !source.client.includes("project-block:"),
);

check(
  "CENTER_TITLE_FIELD",
  source.client.includes("titlePlaceholder") &&
    source.client.includes("Название проекта"),
);

check(
  "CENTER_LEAF_SEARCH_FIELD",
  source.client.includes("leafPlaceholder") &&
    source.client.includes("Выберите связанный листовой ОН") &&
    source.client.includes("filteredRoots"),
);

check(
  "USES_EXISTING_ELIGIBLE_ROOTS",
  source.client.includes("eligibleRoots") &&
    source.api.includes("eligibleRoots"),
);

check(
  "SAVE_POSTS_PROJECT",
  source.client.includes('fetch("/api/projects"') &&
    source.client.includes('method: "POST"'),
);

check(
  "TITLE_WRITTEN_AS_TITLE",
  source.client.includes("title: normalizedTitle") &&
    source.api.includes("title,"),
);

check(
  "ROOT_WRITTEN_AS_PROJECT_ROOT",
  source.client.includes("rootValueObjectId: selectedRootId") &&
    source.api.includes("root_value_object_id: root.id"),
);

check(
  "DEFAULT_SCOPE_ONLY",
  source.client.includes('projectModeCode: "finite"') &&
    source.client.includes("currencyCode: null"),
);

check(
  "NO_EXTRA_PROJECT_ZONES",
  !source.client.includes("goalTitle") &&
    !source.client.includes("resourcesTitle") &&
    !source.client.includes("actionsTitle") &&
    !source.client.includes("risksTitle") &&
    !source.client.includes("sourcesTitle"),
);

const navBlock =
  source.nav.match(/"navigation\.projects"\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] ??
  "";

check("NAV_PROJECTS_BLOCK_PRESENT", Boolean(navBlock));
check("NAV_PROJECTS_NO_MOJIBAKE", !/(?:Ð|Ñ|Ã|â)/.test(navBlock));

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
