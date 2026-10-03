import fs from "node:fs";

const files = {
  api: "src/app/api/projects/route.ts",
  page: "src/app/projects/page.tsx",
  client: "src/app/projects/ProjectMapStartClient.tsx",
  nav: "src/components/app-shell/global-navigation.tsx",
  messages: "src/i18n/messages/navigation.ts",
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

check("PROJECTS_PAGE_EXISTS", source.page.includes("ProjectMapStartClient"));
check("PROJECTS_API_AUTH0", source.api.includes("auth0.getSession()"));
check("PROJECTS_API_ACTIVE_ACTOR", source.api.includes("resolveActiveActorContext"));
check("PROJECTS_API_PP1_TABLE", source.api.includes('.from("project_contexts")'));
check(
  "PROJECT_ROOT_PRIVATE_LEAF_GUARD",
  source.api.includes('valueObject.ontology_node_role_code === "leaf"') &&
    source.api.includes('valueObject.scope_code === "actor"'),
);
check(
  "PROJECTS_UI_REAL_POST",
  source.client.includes('fetch("/api/projects"') &&
    source.client.includes('method: "POST"'),
);
check(
  "PROJECTS_UI_MATRIX_CORE",
  source.client.includes("goalTitle") &&
    source.client.includes("resourcesTitle") &&
    source.client.includes("actionsTitle") &&
    source.client.includes("timeTitle"),
);
check(
  "PROJECTS_UI_MATRIX_RISK_KNOWLEDGE",
  source.client.includes("risksTitle") &&
    source.client.includes("sourcesTitle"),
);
check(
  "PROJECTS_UI_NO_PROGRESS_PERCENT",
  !/progress_percent|completion_percent|percent_complete/i.test(source.client),
);
check("NAV_PROJECTS_KEY", source.messages.includes('"navigation.projects"'));
check("NAV_PROJECTS_LINK", source.nav.includes('href={localeHref("/projects")}'));
check(
  "NAV_PROJECTS_ACTIVE",
  source.nav.includes('currentPathname.startsWith("/projects")'),
);
check(
  "NO_CLIENT_SUPABASE",
  !/@supabase|from\("project_contexts"\)/i.test(source.client),
);
check(
  "PP2A_SCOPE_NO_COMPOSITION_WRITES",
  !source.api.includes('.from("project_composition_relations")') &&
    !source.api.includes('.from("project_activity_links")') &&
    !source.api.includes('.from("activity_event_relations")'),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
