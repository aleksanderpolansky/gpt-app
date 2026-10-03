import fs from "node:fs";

const files = {
  project: "src/app/projects/ProjectMapStartClient.tsx",
  leafForm:
    "src/app/value-objects/new/personal-leaf/personal-leaf-create-form.tsx",
  navigation: "src/components/app-shell/global-navigation.tsx",
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
  "PROJECT_DRAFT_SESSION_STORAGE",
  source.project.includes("PROJECT_DRAFT_STORAGE_KEY") &&
    source.project.includes("writeProjectDraft(title)") &&
    source.project.includes("readProjectDraftTitle()"),
);

check(
  "PROJECT_DRAFT_RESUME_QUERY",
  source.project.includes('searchParams.get("resumeProjectDraft") === "1"') &&
    source.leafForm.includes("/projects?resumeProjectDraft=1"),
);

check(
  "PROJECT_DRAFT_PRESERVED_BEFORE_NEW_LEAF",
  source.project.includes("writeProjectDraft(title);") &&
    source.project.includes(
      "/value-objects/new/personal-leaf?resumeProjectDraft=1",
    ),
);

check(
  "PROJECT_DRAFT_RESTORED_AS_NEW_PROJECT",
  source.project.includes("if (draftTitle !== undefined)") &&
    source.project.includes("setTitle(draftTitle)") &&
    source.project.includes("setCreating(true)"),
);

check(
  "PROJECT_DRAFT_CLEARED_AFTER_SAVE",
  source.project.includes("clearProjectDraft();") &&
    source.project.includes("window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT))"),
);

check(
  "PROJECT_ROUTE_CAN_TARGET_SAVED_PROJECT",
  source.project.includes('searchParams.get("project")') &&
    source.project.includes("/projects?project="),
);

check(
  "SIDEBAR_PROJECT_FETCH",
  source.navigation.includes("/api/projects?locale=") &&
    source.navigation.includes("setProjectLinks(nextProjects)"),
);

check(
  "SIDEBAR_PROJECTS_EXPANDABLE",
  source.navigation.includes("<ExpandableSidebarLinkItem") &&
    source.navigation.includes('label={t("navigation.projects")}') &&
    source.navigation.includes("projectLinks.map((project)"),
);

check(
  "SIDEBAR_PROJECT_LINK_TARGET",
  source.navigation.includes("/projects?project=") &&
    source.navigation.includes("currentProjectId === project.id"),
);

check(
  "SIDEBAR_REFRESH_EVENT",
  source.navigation.includes(
    'window.addEventListener("arctor:projects-changed", handleProjectsChanged)',
  ),
);

check(
  "NO_DATABASE_CHANGE",
  !source.project.includes("supabase.") &&
    !source.navigation.includes("supabase."),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
